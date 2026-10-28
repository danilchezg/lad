"use strict";
/* audio.js — весь звук синтезируется в Web Audio, без сэмплов (работает офлайн и весит мало).
   Гитара: алгоритм Карплуса — Стронга + усилитель (перегруз, кабинет). Барабаны: синтез ударных.
   Синтезатор: осцилляторы, фильтр, огибающие, LFO, FM. Часы: точное планирование с упреждением. */

const midiFreq = m => 440 * Math.pow(2, (m - 69) / 12);

const AU = {
  ready: false, ctx: null,
  init() {
    if (this.ready) { if (this.ctx.state !== "running") this.ctx.resume(); return this.ctx }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) { toast("Звук не поддерживается"); return null }
    try { if (navigator.audioSession) navigator.audioSession.type = "playback" } catch (e) {}
    const ctx = this.ctx = new C({ latencyHint: "interactive" });
    this.master = ctx.createGain(); this.master.gain.value = SET.vol;
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -10; this.comp.knee.value = 8; this.comp.ratio.value = 4; this.comp.attack.value = .003; this.comp.release.value = .2;
    this.bus = ctx.createGain(); this.bus.gain.value = .9;
    this.bus.connect(this.comp); this.comp.connect(this.master); this.master.connect(ctx.destination);
    this.rev = ctx.createConvolver(); this.rev.buffer = this.impulse(2.2, 2.8); this.revGain = ctx.createGain(); this.revGain.gain.value = .55;
    this.rev.connect(this.revGain); this.revGain.connect(this.comp);
    this.ready = true;
    if (!navigator.audioSession) { try { const a = new Audio("data:audio/mp4;base64,AAAAHGZ0eXBNNEEgAAAAAE00QSBpc29tbXA0MgAAAAhmcmVlAAAAAG1kYXQ="); a.playsInline = true; a.volume = 0; a.play().catch(() => {}) } catch (e) {} }
    ctx.resume();
    return ctx;
  },
  now() { return this.ctx ? this.ctx.currentTime : 0 },
  setVolume(v) { if (this.master) this.master.gain.setTargetAtTime(v, this.now(), .03) },
  impulse(sec, decay) {
    const sr = this.ctx.sampleRate, n = Math.floor(sr * sec), b = this.ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < sr * .01 ? i / (sr * .01) : 1) }
    return b;
  },
  /* route a node to the mix with an optional reverb send */
  out(node, rev) {
    node.connect(this.bus);
    if (rev) { const s = this.ctx.createGain(); s.gain.value = rev; node.connect(s); s.connect(this.rev) }
  },
  noise() {
    if (this._noise) return this._noise;
    const sr = this.ctx.sampleRate, b = this.ctx.createBuffer(1, sr * 2, sr), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return this._noise = b;
  },
  noiseSrc(t) { const s = this.ctx.createBufferSource(); s.buffer = this.noise(); s.loop = true; s.loopStart = Math.random(); return s },
  env(g, t, a, peak, dec, end) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(end || 0.0001, 0.0001), t + a + dec) },

  /* ================= drums ================= */
  KITS: {
    acoustic: { n: "Акустика", kick: [110, 48, .42, .9], snT: 190, snN: .75, snD: .19, hat: 1, tom: 1, rev: .12, crash: 1.6 },
    rock: { n: "Рок", kick: [130, 45, .5, 1], snT: 175, snN: .9, snD: .26, hat: .9, tom: .9, rev: .3, crash: 2.1 },
    e808: { n: "808", kick: [62, 38, 1.1, 1], snT: 240, snN: .55, snD: .16, hat: 1.15, tom: 1.25, rev: .08, crash: 1.1 },
    lofi: { n: "Лоу-фай", kick: [95, 50, .35, .8], snT: 210, snN: .6, snD: .14, hat: .8, tom: 1.1, rev: .2, crash: .9, lofi: 1 }
  },
  DRUMS: {
    kick: { n: "Бочка", s: "BD", c: "#FF7A66" }, snare: { n: "Малый", s: "SD", c: "#FFC24B" }, hhc: { n: "Хэт", s: "HH", c: "#3DD6A3" },
    hho: { n: "Откр. хэт", s: "OH", c: "#5AE0C0" }, tom1: { n: "Том 1", s: "T1", c: "#AA9CFF" }, tom2: { n: "Том 2", s: "T2", c: "#9686FF" },
    tom3: { n: "Напольный", s: "FT", c: "#7F6CF0" }, crash: { n: "Крэш", s: "CR", c: "#FF86BC" }, ride: { n: "Райд", s: "RD", c: "#5AB4FF" },
    rim: { n: "Римшот", s: "RS", c: "#FFA45B" }, clap: { n: "Хлопок", s: "CP", c: "#FFD37A" }, cow: { n: "Ковбелл", s: "CB", c: "#C7E86B" }
  },
  drum(name, t, vel, kitName) {
    if (!this.ready) return; t = t || this.now(); vel = vel == null ? 1 : vel;
    const K = this.KITS[kitName || SET.kit] || this.KITS.acoustic, ctx = this.ctx;
    const g = ctx.createGain(); let last = t + 1;
    const o = (type, f) => { const x = ctx.createOscillator(); x.type = type; x.frequency.value = f; return x };
    const filt = (type, f, q) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; return x };
    switch (name) {
      case "kick": {
        const [f0, f1, dec, cl] = K.kick, s = o("sine", f0), sg = ctx.createGain();
        s.frequency.setValueAtTime(f0 * 2.4, t); s.frequency.exponentialRampToValueAtTime(f0, t + .012); s.frequency.exponentialRampToValueAtTime(f1, t + dec * .45);
        this.env(sg, t, .002, 1.1 * vel, dec); s.connect(sg); sg.connect(g); s.start(t); s.stop(t + dec + .1);
        const n = this.noiseSrc(), ng = ctx.createGain(), hp = filt("highpass", 1800); this.env(ng, t, .001, .35 * cl * vel, .018); n.connect(hp); hp.connect(ng); ng.connect(g); n.start(t); n.stop(t + .05);
        last = t + dec + .1; break;
      }
      case "snare": case "rim": case "clap": {
        if (name === "rim") {
          const s = o("triangle", 820), sg = ctx.createGain(); this.env(sg, t, .001, .7 * vel, .04); s.connect(sg); sg.connect(g); s.start(t); s.stop(t + .08);
          const n = this.noiseSrc(), ng = ctx.createGain(), bp = filt("bandpass", 3200, 2); this.env(ng, t, .001, .5 * vel, .03); n.connect(bp); bp.connect(ng); ng.connect(g); n.start(t); n.stop(t + .06); last = t + .1; break;
        }
        if (name === "clap") {
          const n = this.noiseSrc(), ng = ctx.createGain(), bp = filt("bandpass", 1250, 1.2);
          ng.gain.setValueAtTime(0, t); [0, .011, .022].forEach(d => { ng.gain.setValueAtTime(.9 * vel, t + d); ng.gain.exponentialRampToValueAtTime(.05, t + d + .009) });
          ng.gain.setValueAtTime(.7 * vel, t + .031); ng.gain.exponentialRampToValueAtTime(.0001, t + .25);
          n.connect(bp); bp.connect(ng); ng.connect(g); n.start(t); n.stop(t + .3); last = t + .3; break;
        }
        const s = o("triangle", K.snT), sg = ctx.createGain(); s.frequency.setValueAtTime(K.snT * 1.4, t); s.frequency.exponentialRampToValueAtTime(K.snT, t + .03);
        this.env(sg, t, .001, .55 * vel, .1); s.connect(sg); sg.connect(g); s.start(t); s.stop(t + .2);
        const n = this.noiseSrc(), ng = ctx.createGain(), hp = filt("highpass", 900), pk = filt("peaking", 3500); pk.gain.value = 5;
        this.env(ng, t, .001, K.snN * vel, K.snD * (0.6 + vel * .4)); n.connect(hp); hp.connect(pk); pk.connect(ng); ng.connect(g); n.start(t); n.stop(t + K.snD + .2);
        last = t + K.snD + .25; break;
      }
      case "hhc": case "hho": case "ride": case "crash": case "cow": {
        if (name === "cow") {
          const bp = filt("bandpass", 700, 3), cg = ctx.createGain(); this.env(cg, t, .001, .6 * vel, .3);
          [545, 815].forEach(f => { const x = o("square", f); x.connect(bp); x.start(t); x.stop(t + .4) }); bp.connect(cg); cg.connect(g); last = t + .45; break;
        }
        const base = 40 * K.hat, ratios = [2, 3, 4.16, 5.43, 6.79, 8.21], mix = ctx.createGain(); mix.gain.value = .3;
        const dur = name === "hhc" ? .05 : name === "hho" ? .42 : name === "ride" ? 1.2 : K.crash;
        ratios.forEach(r => { const x = o("square", base * r * (name === "ride" ? .72 : 1)); x.connect(mix); x.start(t); x.stop(t + dur + .1) });
        const bp = filt("bandpass", name === "ride" ? 7000 : 10000, name === "ride" ? 1.5 : .8), hp = filt("highpass", name === "crash" ? 5000 : 7000), eg = ctx.createGain();
        const peak = (name === "hhc" ? .5 : name === "hho" ? .45 : name === "ride" ? .25 : .42) * vel;
        this.env(eg, t, name === "crash" ? .004 : .001, peak, dur);
        mix.connect(bp); bp.connect(hp); hp.connect(eg); eg.connect(g);
        if (name === "crash" || name === "ride") { const n = this.noiseSrc(), ng = ctx.createGain(), nh = filt("highpass", name === "ride" ? 9000 : 4500); this.env(ng, t, .003, (name === "ride" ? .08 : .4) * vel, dur * .9); n.connect(nh); nh.connect(ng); ng.connect(g); n.start(t); n.stop(t + dur + .1) }
        if (name === "ride") { const p = o("sine", 3100), pg = ctx.createGain(); this.env(pg, t, .001, .08 * vel, .5); p.connect(pg); pg.connect(g); p.start(t); p.stop(t + .6) }
        if (name === "hhc" && this._openHat) { try { this._openHat.gain.cancelScheduledValues(t); this._openHat.gain.setTargetAtTime(.0001, t, .01) } catch (e) {} this._openHat = null }
        if (name === "hho") this._openHat = eg;
        last = t + dur + .15; break;
      }
      default: { // toms
        const f = { tom1: 210, tom2: 160, tom3: 108 }[name] || 160, s = o("sine", f * K.tom), sg = ctx.createGain();
        s.frequency.setValueAtTime(f * K.tom * 1.6, t); s.frequency.exponentialRampToValueAtTime(f * K.tom, t + .04); s.frequency.exponentialRampToValueAtTime(f * K.tom * .75, t + .5);
        this.env(sg, t, .002, .9 * vel, .5); s.connect(sg); sg.connect(g); s.start(t); s.stop(t + .6);
        const n = this.noiseSrc(), ng = ctx.createGain(), lp = filt("lowpass", 3000); this.env(ng, t, .001, .2 * vel, .05); n.connect(lp); lp.connect(ng); ng.connect(g); n.start(t); n.stop(t + .08);
        last = t + .65;
      }
    }
    if (K.lofi) g.connect(this.lofiIn()); else this.out(g, K.rev);
    return last;
  },
  lofiIn() {
    if (this._lofi) return this._lofi;
    const ctx = this.ctx, inp = ctx.createGain(), ws = ctx.createWaveShaper(), n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.round(Math.tanh(x * 1.6) * 14) / 14 }
    ws.curve = c; const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4800;
    inp.connect(ws); ws.connect(lp); this.out(lp, .2); return this._lofi = inp;
  },

  /* ================= guitar (Karplus–Strong) ================= */
  TONES: {
    clean: { n: "Чистый", drive: 0, pre: 1, lp: 6500, mid: 0, rev: .22, out: .9 },
    crunch: { n: "Кранч", drive: 3, pre: 5, lp: 4800, mid: 3, rev: .15, out: .5 },
    lead: { n: "Лид", drive: 7, pre: 14, lp: 4200, mid: 5, rev: .32, out: .38 },
    metal: { n: "Метал", drive: 12, pre: 26, lp: 5200, mid: -7, rev: .1, out: .34 },
    jazz: { n: "Джаз", drive: 0, pre: 1, lp: 2400, mid: -2, rev: .25, out: 1 }
  },
  _ks: {},
  ksBuffer(midi, mute) {
    const key = midi + (mute ? "m" : ""); if (this._ks[key]) return this._ks[key];
    const sr = this.ctx.sampleRate, f = midiFreq(midi), sec = mute ? .35 : clamp(4.2 - (midi - 40) * .045, 1.4, 4.2);
    const n = Math.floor(sr * sec), buf = this.ctx.createBuffer(1, n, sr), y = buf.getChannelData(0);
    const P = sr / f - 0.5, N = Math.floor(P), d = P - N, C = (1 - d) / (1 + d);
    const decay = mute ? .975 : clamp(.9993 - (midi - 40) * .00004, .996, .9994);
    const bright = mute ? .25 : .62;
    // excitation: filtered noise burst with pick position comb
    let prev = 0; const ex = new Float32Array(N + 2);
    for (let i = 0; i < N + 2; i++) { const r = Math.random() * 2 - 1; prev = prev + bright * (r - prev); ex[i] = prev }
    const pp = Math.max(1, Math.floor(N * .13)); for (let i = N + 1; i >= pp; i--) ex[i] -= ex[i - pp] * .9;
    let apX = 0, apY = 0;
    for (let i = 0; i < n; i++) {
      let v;
      if (i < N + 2) v = ex[i];
      else { const a = y[i - N], b = y[i - N - 1]; v = decay * (mute ? (a * .3 + b * .7) : (a + b) * .5) }
      const ap = C * v + apX - C * apY; apX = v; apY = ap; y[i] = i < N + 2 ? v : ap;
    }
    let mx = 0; for (let i = 0; i < Math.min(n, sr * .1); i++) mx = Math.max(mx, Math.abs(y[i])); if (mx > 0) for (let i = 0; i < n; i++) y[i] /= mx;
    const fade = Math.floor(sr * .05); for (let i = 0; i < fade; i++) y[n - 1 - i] *= i / fade;
    return this._ks[key] = buf;
  },
  _chains: {},
  ampChain(tone) {
    const key = tone in this.TONES ? tone : "clean"; if (this._chains[key]) return this._chains[key];
    const T = this.TONES[key], ctx = this.ctx, inp = ctx.createGain(); inp.gain.value = T.pre;
    let node = inp;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 80; node.connect(hp); node = hp;
    if (T.drive) {
      const ws = ctx.createWaveShaper(), n = 4096, c = new Float32Array(n), k = T.drive;
      for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k) * (x < 0 ? .95 : 1) }
      ws.curve = c; ws.oversample = "4x"; node.connect(ws); node = ws;
    }
    const mid = ctx.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 750; mid.Q.value = .8; mid.gain.value = T.mid; node.connect(mid); node = mid;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = T.lp; lp.Q.value = .7; node.connect(lp); node = lp;
    const lp2 = ctx.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = T.lp * 1.3; node.connect(lp2); node = lp2;
    const outG = ctx.createGain(); outG.gain.value = T.out; node.connect(outG);
    this.out(outG, T.rev);
    return this._chains[key] = inp;
  },
  pluck(midi, t, vel, o) {
    if (!this.ready) return; o = o || {}; t = t || this.now(); vel = vel == null ? .9 : vel;
    const src = this.ctx.createBufferSource(); src.buffer = this.ksBuffer(midi, o.mute);
    const g = this.ctx.createGain(); g.gain.value = vel * (o.mute ? 1.1 : .55);
    if (o.bend) { src.detune.setValueAtTime(0, t + .05); src.detune.linearRampToValueAtTime(o.bend * 100, t + .05 + (o.bendTime || .18)) }
    if (o.vib) { const l = this.ctx.createOscillator(), lg = this.ctx.createGain(); l.frequency.value = 5.5; lg.gain.value = 0; lg.gain.linearRampToValueAtTime(o.vib * 25, t + .4); l.connect(lg); lg.connect(src.detune); l.start(t); l.stop(t + src.buffer.duration) }
    if (o.slideFrom != null) { src.detune.setValueAtTime((o.slideFrom - midi) * 100, t); src.detune.linearRampToValueAtTime(0, t + .12) }
    src.connect(g); g.connect(this.ampChain(o.tone || SET.gtone));
    const dur = o.dur ? Math.min(o.dur, src.buffer.duration) : src.buffer.duration;
    if (o.dur) { g.gain.setValueAtTime(g.gain.value, t + dur - .03); g.gain.linearRampToValueAtTime(0, t + dur) }
    src.start(t); src.stop(t + dur + .01);
    this._voices = (this._voices || []).filter(v => v.end > this.now()); this._voices.push({ src, g, end: t + dur });
    return src;
  },
  strum(midis, t, o) {
    o = o || {}; t = t || this.now(); const sp = o.speed ?? .018, list = o.up ? midis.slice().reverse() : midis;
    list.forEach((m, i) => { if (m != null) this.pluck(m, t + i * sp, (o.vel ?? .8) * (1 - i * .03), o) });
  },
  silenceGuitar(t) { t = t || this.now(); for (const v of this._voices || []) { try { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, .02) } catch (e) {} } this._voices = [] },

  /* ================= synth ================= */
  PRESETS: {
    epiano: { n: "Э-пиано", osc: [{ w: "sine", g: .8 }, { w: "sine", g: .25, r: 2 }], fm: { r: 1, i: 1.6, d: .9 }, a: .004, d: 1.4, s: .18, rel: .5, cut: 6000, q: .5, env: 0, rev: .25 },
    piano: { n: "Пиано", osc: [{ w: "triangle", g: .7 }, { w: "sine", g: .4, r: 2 }, { w: "sine", g: .12, r: 3 }], a: .003, d: 1.8, s: 0, rel: .35, cut: 3800, q: .3, env: 2500, envD: .6, rev: .22 },
    organ: { n: "Орган", osc: [{ w: "sine", g: .55 }, { w: "sine", g: .35, r: 2 }, { w: "sine", g: .25, r: 3 }, { w: "sine", g: .18, r: 4 }, { w: "sine", g: .1, r: 6 }], a: .01, d: .1, s: 1, rel: .08, cut: 7000, q: .3, env: 0, lfo: 6.5, lfoD: 6, rev: .2 },
    pad: { n: "Пэд", osc: [{ w: "sawtooth", g: .3, dt: -9 }, { w: "sawtooth", g: .3, dt: 9 }, { w: "sawtooth", g: .2, dt: 0, r: .5 }], a: .9, d: 1, s: .8, rel: 1.6, cut: 1400, q: 2, env: 900, envD: 1.5, lfo: .25, lfoC: 400, rev: .7 },
    strings: { n: "Струнные", osc: [{ w: "sawtooth", g: .3, dt: -6 }, { w: "sawtooth", g: .3, dt: 6 }, { w: "sawtooth", g: .2, dt: 14 }], a: .35, d: .5, s: .85, rel: .8, cut: 2600, q: .6, env: 0, lfo: 5, lfoD: 8, rev: .55 },
    bass: { n: "Бас", osc: [{ w: "sawtooth", g: .5 }, { w: "square", g: .35, r: .5 }], a: .005, d: .35, s: .55, rel: .12, cut: 500, q: 6, env: 1800, envD: .22, rev: .04 },
    lead: { n: "Лид", osc: [{ w: "sawtooth", g: .4, dt: -5 }, { w: "square", g: .3, dt: 5 }], a: .01, d: .3, s: .75, rel: .25, cut: 2200, q: 4, env: 2500, envD: .3, lfo: 5.5, lfoD: 12, lfoDelay: .35, rev: .3, glide: .05 },
    pluck: { n: "Плак", osc: [{ w: "sawtooth", g: .45 }, { w: "square", g: .2, r: 2, dt: 4 }], a: .002, d: .4, s: 0, rel: .3, cut: 400, q: 5, env: 5000, envD: .18, rev: .35 },
    chip: { n: "8-бит", osc: [{ w: "square", g: .35 }], a: .001, d: .1, s: .7, rel: .05, cut: 12000, q: 0, env: 0, lfo: 7, lfoD: 0, rev: .1 },
    bell: { n: "Колокол", osc: [{ w: "sine", g: .7 }], fm: { r: 3.5, i: 4, d: 2.5 }, a: .002, d: 3, s: 0, rel: 1.2, cut: 9000, q: 0, env: 0, rev: .5 },
    brass: { n: "Медь", osc: [{ w: "sawtooth", g: .4, dt: -4 }, { w: "sawtooth", g: .4, dt: 4 }], a: .06, d: .4, s: .7, rel: .2, cut: 900, q: 1.5, env: 2600, envD: .25, envA: .08, rev: .3 },
    sub808: { n: "808-бас", osc: [{ w: "sine", g: 1 }, { w: "triangle", g: .2 }], a: .003, d: 1.5, s: .3, rel: .4, cut: 2000, q: 0, env: 0, drive: 2.5, pitchEnv: 12, rev: 0 }
  },
  synthParams(name) {
    const base = this.PRESETS[name] || this.PRESETS.epiano, cu = (SET.synthEdit || {})[name] || {};
    return Object.assign({}, base, cu);
  },
  /* start a synth voice; returns handle with .stop(t) */
  noteOn(midi, t, vel, presetName) {
    if (!this.ready) return null; const ctx = this.ctx; t = t || this.now(); vel = vel == null ? .8 : vel;
    const P = this.synthParams(presetName || SET.synth), f = midiFreq(midi);
    const vca = ctx.createGain(), filt = ctx.createBiquadFilter(); filt.type = "lowpass"; filt.Q.value = P.q || 0;
    const oscs = [];
    let lfo = null;
    if (P.lfo && (P.lfoD || P.lfoC)) { lfo = ctx.createOscillator(); lfo.frequency.value = P.lfo; lfo.start(t) }
    for (const O of P.osc) {
      const o = ctx.createOscillator(); o.type = O.w; o.frequency.value = f * (O.r || 1); o.detune.value = (O.dt || 0) + (P.detune || 0);
      if (P.pitchEnv) { o.frequency.setValueAtTime(f * (O.r || 1) * Math.pow(2, P.pitchEnv / 12), t); o.frequency.exponentialRampToValueAtTime(f * (O.r || 1), t + .06) }
      if (P.fm) { const m = ctx.createOscillator(), mg = ctx.createGain(); m.frequency.value = f * P.fm.r; const I = f * P.fm.i; mg.gain.setValueAtTime(I, t); mg.gain.exponentialRampToValueAtTime(Math.max(1, I * .05), t + (P.fm.d || 1)); m.connect(mg); mg.connect(o.frequency); m.start(t); oscs.push(m) }
      if (lfo && P.lfoD) { const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(P.lfoD, t + (P.lfoDelay || 0) + .3); lfo.connect(lg); lg.connect(o.detune) }
      const og = ctx.createGain(); og.gain.value = O.g; o.connect(og); og.connect(filt); o.start(t); oscs.push(o);
    }
    const cut = Math.min(18000, P.cut * (0.6 + vel * .5));
    filt.frequency.setValueAtTime(cut, t);
    if (P.env) { filt.frequency.setValueAtTime(cut, t); filt.frequency.linearRampToValueAtTime(Math.min(18000, cut + P.env), t + (P.envA || .005)); filt.frequency.setTargetAtTime(cut, t + (P.envA || .005), (P.envD || .3) / 3) }
    if (lfo && P.lfoC) { const lg = ctx.createGain(); lg.gain.value = P.lfoC; lfo.connect(lg); lg.connect(filt.frequency) }
    let node = filt;
    if (P.drive) { const ws = ctx.createWaveShaper(), n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(P.drive * x) / Math.tanh(P.drive) } ws.curve = c; filt.connect(ws); node = ws }
    node.connect(vca);
    const peak = .32 * vel, sus = Math.max(.0001, peak * P.s);
    vca.gain.setValueAtTime(0, t); vca.gain.linearRampToValueAtTime(peak, t + P.a);
    if (P.s > 0) vca.gain.setTargetAtTime(sus, t + P.a, P.d / 3); else vca.gain.setTargetAtTime(.0001, t + P.a, P.d / 4);
    this.out(vca, P.rev);
    const h = { midi, stopped: false, stop: (t2) => {
      if (h.stopped) return; h.stopped = true; t2 = Math.max(t2 || this.now(), this.now());
      vca.gain.cancelScheduledValues(t2); vca.gain.setValueAtTime(Math.max(vca.gain.value, .0001), t2); vca.gain.setTargetAtTime(.0001, t2, P.rel / 4);
      const end = t2 + P.rel * 1.6 + .05; oscs.forEach(o => { try { o.stop(end) } catch (e) {} }); if (lfo) try { lfo.stop(end) } catch (e) {}
    } };
    if (!P.s) setTimeout(() => h.stop(), (t - this.now() + P.a + P.d * 1.4) * 1000);
    return h;
  },
  note(midi, t, dur, vel, preset) { const h = this.noteOn(midi, t, vel, preset); if (h) { const tt = (t || this.now()) + (dur || .5); setTimeout(() => h.stop(tt), Math.max(0, (tt - this.now()) * 1000 - 40)); } return h },

  /* generic instrument for lesson examples */
  play(midis, o) {
    if (!this.init()) return; o = o || {}; const t = this.now() + .03, inst = o.inst || "keys";
    midis = [].concat(midis);
    const step = o.arp ? (o.gap ?? .38) : 0;
    midis.forEach((m, i) => {
      const tt = t + i * step;
      if (inst === "guitar") this.pluck(m, tt + (o.arp ? 0 : i * .02), .85, { tone: o.tone || "clean" });
      else this.note(m, tt, o.dur || (o.arp ? .45 : 1.2), .75, o.preset || "piano");
    });
    return t + midis.length * step;
  },

  /* metronome click */
  click(t, lvl, sound) {
    if (!this.ready) return; const ctx = this.ctx, g = ctx.createGain(); sound = sound || SET.metroSound;
    const acc = lvl === 2, sub = lvl === 0;
    if (sound === "wood") {
      const n = this.noiseSrc(), bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = acc ? 1900 : sub ? 1100 : 1400; bp.Q.value = 8;
      this.env(g, t, .001, acc ? 2.2 : sub ? .7 : 1.4, .05); n.connect(bp); bp.connect(g); n.start(t); n.stop(t + .08);
    } else if (sound === "cow") { this.drum("cow", t, acc ? 1 : sub ? .35 : .65); return }
    else if (sound === "sticks") { this.drum("rim", t, acc ? 1 : sub ? .4 : .7); return }
    else {
      const o = ctx.createOscillator(); o.type = sound === "beep" ? "square" : "sine"; o.frequency.value = acc ? 1760 : sub ? 880 : 1175;
      this.env(g, t, .001, (sound === "beep" ? .18 : .6) * (sub ? .45 : 1), sound === "beep" ? .07 : .035); o.connect(g); o.start(t); o.stop(t + .1);
    }
    g.connect(this.bus);
  },
  ui(k) {
    if (!this.init()) return; const t = this.now() + .01;
    const seq = { ok: [[76, 0], [83, .07]], bad: [[52, 0], [51, .09]], level: [[72, 0], [76, .08], [79, .16], [84, .24]], tick: [[96, 0]], tap: [[88, 0]] }[k] || [];
    seq.forEach(([m, d]) => { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = k === "bad" ? "triangle" : "sine"; o.frequency.value = midiFreq(m); this.env(g, t + d, .004, k === "bad" ? .14 : .1, k === "level" ? .35 : .14); o.connect(g); g.connect(this.bus); o.start(t + d); o.stop(t + d + .5) });
  },
  /* run fn at audio time t (for UI sync) */
  at(t, fn) { const ms = (t - this.now()) * 1000; return setTimeout(fn, Math.max(0, ms)) },

  /* microphone */
  async mic(fft) {
    this.init();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const src = this.ctx.createMediaStreamSource(stream), an = this.ctx.createAnalyser(); an.fftSize = fft || 4096; an.smoothingTimeConstant = 0; src.connect(an);
    return { an, stop: () => { try { src.disconnect() } catch (e) {} stream.getTracks().forEach(t => t.stop()) } };
  }
};

/* Clock: steps scheduled ahead with a look-ahead timer. div = steps per beat. */
class Clock {
  constructor(o) { Object.assign(this, { bpm: 90, div: 4, swing: 0, onStep: null, ahead: .12 }, o); this.running = false; this.step = 0 }
  get stepDur() { return 60 / this.bpm / this.div }
  start(at) {
    if (!AU.init()) return; this.stop(); this.running = true; this.step = 0; this.next = at || AU.now() + .08; this.t0 = this.next;
    const tick = () => {
      if (!this.running) return;
      while (this.next < AU.now() + this.ahead) {
        let t = this.next;
        if (this.swing && this.step % 2 === 1) t += this.swing * this.stepDur;
        try { this.onStep && this.onStep(this.step, t, this.stepDur) } catch (e) { console.error(e) }
        this.step++; this.next += this.stepDur;
      }
    };
    tick(); this.timer = setInterval(tick, 20);
  }
  stop() { this.running = false; clearInterval(this.timer) }
}

/* unlock audio on the first touch anywhere */
["pointerdown", "touchend", "keydown"].forEach(ev => document.addEventListener(ev, () => { try { AU.init() } catch (e) {} }, { once: true, capture: true }));
document.addEventListener("visibilitychange", () => { if (!document.hidden && AU.ready && AU.ctx.state !== "running") AU.ctx.resume() });
