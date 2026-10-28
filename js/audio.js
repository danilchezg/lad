"use strict";
/* audio.js — весь звук синтезируется на устройстве, без записанных сэмплов (офлайн, малый вес).
   Барабаны: каждый удар один раз синтезируется в OfflineAudioContext и дальше играется как сэмпл —
   это дёшево для процессора и не перегружает iPhone при плотной игре поверх драм-машины.
   Гитара: Карплус — Стронг + усилитель, хорус и дилэй. Синтезатор: осцилляторы, фильтр, огибающие, LFO, FM.
   Защита: лимит голосов, проверка тракта на NaN, автоматическое восстановление контекста. */

const midiFreq = m => 440 * Math.pow(2, (m - 69) / 12);
const fin = (v, d) => Number.isFinite(v) ? v : d;

const AU = {
  ready: false, ctx: null, _banks: {}, _loading: {}, _active: [],
  init() {
    if (this.ready) { if (this.ctx.state !== "running") this.ctx.resume().catch(() => {}); return this.ctx }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) { toast("Звук не поддерживается"); return null }
    try { if (navigator.audioSession) navigator.audioSession.type = "playback" } catch (e) {}
    this.ctx = new C({ latencyHint: "interactive" });
    this.ready = true; this.buildGraph();
    if (!navigator.audioSession) { try { const a = new Audio("data:audio/mp4;base64,AAAAHGZ0eXBNNEEgAAAAAE00QSBpc29tbXA0MgAAAAhmcmVlAAAAAG1kYXQ="); a.playsInline = true; a.volume = 0; a.play().catch(() => {}) } catch (e) {} }
    this.ctx.resume().catch(() => {});
    this.loadKit(SET.kit);
    clearInterval(this._dog); this._dog = setInterval(() => this.watchdog(), 1500);
    return this.ctx;
  },
  /* master chain; can be rebuilt if it ever breaks */
  buildGraph() {
    const ctx = this.ctx;
    for (const n of [this.master, this.comp, this.bus, this.rev, this.revGain, this.drumBus, this.drumRev, this.limiter, this.probe]) { try { n && n.disconnect() } catch (e) {} }
    this.master = ctx.createGain(); this.master.gain.value = fin(SET.vol, .8);
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -12; this.comp.knee.value = 10; this.comp.ratio.value = 4; this.comp.attack.value = .003; this.comp.release.value = .18;
    this.limiter = ctx.createDynamicsCompressor(); this.limiter.threshold.value = -2; this.limiter.knee.value = 0; this.limiter.ratio.value = 20; this.limiter.attack.value = .001; this.limiter.release.value = .08;
    this.bus = ctx.createGain(); this.bus.gain.value = .85;
    this.bus.connect(this.comp); this.comp.connect(this.limiter); this.limiter.connect(this.master); this.master.connect(ctx.destination);
    this.rev = ctx.createConvolver(); this.rev.buffer = this.impulse(2.2, 2.8); this.revGain = ctx.createGain(); this.revGain.gain.value = .5;
    this.rev.connect(this.revGain); this.revGain.connect(this.comp);
    this.drumBus = ctx.createGain(); this.drumBus.gain.value = 1; this.drumBus.connect(this.bus);
    this.drumRev = ctx.createGain(); this.drumRev.gain.value = (this.KITS[SET.kit] || this.KITS.acoustic).rev; this.drumBus.connect(this.drumRev); this.drumRev.connect(this.rev);
    this.probe = ctx.createAnalyser(); this.probe.fftSize = 256; this.master.connect(this.probe);
    this._chains = {}; this._active = [];
  },
  watchdog() {
    if (!this.ready || document.hidden) return;
    const st = this.ctx.state;
    if (st === "closed") { this.restart(); return }
    if (st !== "running") { this.ctx.resume().catch(() => {}); return }
    const b = this._pb || (this._pb = new Float32Array(256)); this.probe.getFloatTimeDomainData(b);
    for (let i = 0; i < b.length; i += 8) if (!Number.isFinite(b[i])) { console.warn("audio: broken graph, rebuilding"); this.buildGraph(); return }
  },
  /* full reset (settings → «Перезапустить звук») */
  restart() {
    try { this.ctx && this.ctx.close() } catch (e) {}
    this.ready = false; this._banks = {}; this._loading = {}; this._ks = {}; this._noise = null; this._chains = {}; this._active = [];
    return this.init();
  },
  now() { return this.ctx ? this.ctx.currentTime : 0 },
  setVolume(v) { if (this.master) this.master.gain.setTargetAtTime(fin(v, .8), this.now(), .03) },
  impulse(sec, decay, c) {
    c = c || this.ctx; const sr = c.sampleRate, n = Math.floor(sr * sec), b = c.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < sr * .01 ? i / (sr * .01) : 1) }
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
  noiseSrc() { const s = this.ctx.createBufferSource(); s.buffer = this.noise(); s.loop = true; return s },
  env(g, t, a, peak, dec) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(fin(peak, 0), t + a); g.gain.setTargetAtTime(0, t + a, Math.max(.001, dec / 4)) },
  /* keep the number of simultaneously playing sources bounded */
  track(src, g, end) {
    const now = this.now(); this._active = this._active.filter(v => v.end > now);
    this._active.push({ src, g, end });
    if (this._active.length > 72) { const v = this._active.shift(); try { v.g.gain.cancelScheduledValues(now); v.g.gain.setTargetAtTime(0, now, .01); v.src.stop(now + .06) } catch (e) {} }
  },

  /* ================= drums ================= */
  KITS: {
    acoustic: { n: "Акустика", kick: { f: 56, p: 2.3, dec: .42, click: .55, drive: 1.6, sub: .25 }, snare: { t: [188, 330], tone: .55, noise: .95, dec: .2, bp: 3400, drive: 1.4, wire: .4 }, hat: { base: 40, bright: 1 }, tom: { k: 1, dec: .55 }, cym: { dec: 1.9 }, rev: .14 },
    rock: { n: "Рок", kick: { f: 53, p: 2.7, dec: .5, click: .85, drive: 2.6, sub: .4 }, snare: { t: [172, 305], tone: .62, noise: 1, dec: .3, bp: 2900, drive: 2.4, wire: .5 }, hat: { base: 38, bright: .92 }, tom: { k: .9, dec: .75 }, cym: { dec: 2.5 }, rev: .3 },
    jazz: { n: "Джаз", kick: { f: 68, p: 1.6, dec: .34, click: .2, drive: 1, sub: .1 }, snare: { t: [225, 365], tone: .25, noise: .7, dec: .34, bp: 2600, drive: 1, wire: .2, brush: 1 }, hat: { base: 44, bright: .82 }, tom: { k: 1.18, dec: .5 }, cym: { dec: 2.8, dark: 1 }, rev: .2 },
    e808: { n: "808", kick: { f: 44, p: 3.2, dec: 1.25, click: .25, drive: 1.3, sub: .9, long: 1 }, snare: { t: [238, 476], tone: .75, noise: .55, dec: .16, bp: 5200, drive: 1, wire: .1 }, hat: { base: 46, bright: 1.15 }, tom: { k: 1.25, dec: .6 }, cym: { dec: 1.2 }, rev: .08 },
    synthwave: { n: "Синтвейв", kick: { f: 50, p: 2.9, dec: .55, click: .95, drive: 2.8, sub: .4 }, snare: { t: [200, 350], tone: .5, noise: 1, dec: .22, bp: 4000, drive: 1.9, wire: .4, gated: 1 }, hat: { base: 42, bright: 1.1 }, tom: { k: 1.1, dec: .6, gated: 1 }, cym: { dec: 1.7 }, rev: .14 },
    lofi: { n: "Лоу-фай", kick: { f: 62, p: 2, dec: .38, click: .3, drive: 1.8, sub: .2 }, snare: { t: [210, 320], tone: .45, noise: .75, dec: .18, bp: 2400, drive: 1.5, wire: .3 }, hat: { base: 40, bright: .75 }, tom: { k: 1.1, dec: .45 }, cym: { dec: 1.1 }, rev: .22, lofi: 1 }
  },
  DRUMS: {
    kick: { n: "Бочка", s: "BD", c: "#FF7A66" }, snare: { n: "Малый", s: "SD", c: "#FFC24B" }, hhc: { n: "Хэт", s: "HH", c: "#3DD6A3" },
    hho: { n: "Откр. хэт", s: "OH", c: "#5AE0C0" }, tom1: { n: "Том 1", s: "T1", c: "#AA9CFF" }, tom2: { n: "Том 2", s: "T2", c: "#9686FF" },
    tom3: { n: "Напольный", s: "FT", c: "#7F6CF0" }, crash: { n: "Крэш", s: "CR", c: "#FF86BC" }, ride: { n: "Райд", s: "RD", c: "#5AB4FF" },
    rim: { n: "Римшот", s: "RS", c: "#FFA45B" }, clap: { n: "Хлопок", s: "CP", c: "#FFD37A" }, cow: { n: "Ковбелл", s: "CB", c: "#C7E86B" }
  },
  PEAK: { kick: .95, snare: .82, rim: .55, clap: .72, hhc: .42, hho: .42, ride: .36, crash: .5, tom1: .78, tom2: .78, tom3: .8, cow: .45 },
  voiceLen(K, n) { return { kick: K.kick.long ? 1.7 : .9, snare: K.snare.gated ? .7 : .7, rim: .25, clap: .6, hhc: .28, hho: 1.3, ride: 3, crash: 3.2, tom1: 1, tom2: 1.1, tom3: 1.3, cow: .7 }[n] || 1 },
  loadKit(name) {
    if (!this.ready) return Promise.resolve();
    const K = this.KITS[name] ? name : "acoustic";
    if (this._banks[K]) return Promise.resolve(this._banks[K]);
    if (this._loading[K]) return this._loading[K];
    const bank = {};
    return this._loading[K] = Promise.all(Object.keys(this.DRUMS).map(n => this.renderVoice(this.KITS[K], n).then(b => bank[n] = b).catch(e => console.warn("drum render", n, e))))
      .then(() => { this._banks[K] = bank; delete this._loading[K]; return bank });
  },
  renderVoice(K, name) {
    const sr = this.ctx.sampleRate, len = Math.ceil(sr * this.voiceLen(K, name));
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, oc = new OC(2, len, sr);
    const out = oc.createGain(); let last = out;
    if (K.lofi) {
      const ws = oc.createWaveShaper(), n = 2048, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = Math.round(Math.tanh(x * 1.5) * 13) / 13 } ws.curve = cv;
      const lp = oc.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4300; last.connect(ws); ws.connect(lp); last = lp;
    }
    last.connect(oc.destination);
    this.synthVoice(oc, out, name, K);
    const p = oc.startRendering();
    const done = buf => { let mx = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > mx && Number.isFinite(a)) mx = a } }
      const k = mx > 0 ? (this.PEAK[name] || .7) / mx : 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = Number.isFinite(d[i]) ? d[i] * k : 0 } return buf };
    if (p && p.then) return p.then(done);
    return new Promise(res => { oc.oncomplete = e => res(done(e.renderedBuffer)) });
  },
  /* the actual synthesis of one hit, into any context */
  synthVoice(c, out, name, K) {
    const t = .004, sr = c.sampleRate;
    const nb = c.createBuffer(1, sr * 2, sr), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const N = () => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; s.start(t, Math.random()); return s };
    const O = (type, f) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); return o };
    const G = v => { const g = c.createGain(); g.gain.value = v ?? 1; return g };
    const F = (type, f, q, gain) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q != null) x.Q.value = q; if (gain != null) x.gain.value = gain; return x };
    const E = (a, peak, dec, hold) => { const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); if (hold) g.gain.setValueAtTime(peak, t + a + hold); g.gain.setTargetAtTime(0, t + a + (hold || 0), Math.max(.002, dec / 4)); return g };
    const D = amt => { const ws = c.createWaveShaper(), n = 1024, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = Math.tanh(amt * x) / Math.tanh(amt) } ws.curve = cv; return ws };
    const chain = (...ns) => { for (let i = 0; i < ns.length - 1; i++) ns[i].connect(ns[i + 1]); return ns[ns.length - 1] };
    const gate = (src, len) => { const cv = c.createConvolver(); cv.buffer = this.impulse(1.4, 1.6, c); const gg = c.createGain(); gg.gain.setValueAtTime(.9, t); gg.gain.setValueAtTime(.9, t + len); gg.gain.linearRampToValueAtTime(0, t + len + .03); chain(src, cv, gg, out) };
    switch (name) {
      case "kick": {
        const k = K.kick, bus = G(1), d = D(k.drive); chain(bus, d, out);
        const b = O("sine", k.f * k.p * 2.2); b.frequency.setValueAtTime(k.f * k.p * 2.2, t); b.frequency.setTargetAtTime(k.f, t, k.long ? .05 : .028);
        chain(b, E(.002, 1, k.dec), bus);
        const s = O("sine", k.f * .5 + 1); chain(s, E(.01, k.sub, k.dec * 1.3), bus);
        const cl = N(); chain(cl, F("bandpass", 3800, .9), E(.0005, k.click, .012), bus);
        const tr = O("triangle", 900); tr.frequency.setTargetAtTime(200, t, .004); chain(tr, E(.0005, k.click * .5, .01), bus);
        break;
      }
      case "snare": {
        const s = K.snare, bus = G(1), d = D(s.drive); chain(bus, d, out);
        s.t.forEach((f, i) => { const o = O("triangle", f * 1.35); o.frequency.setTargetAtTime(f, t, .012); chain(o, E(.001, s.tone * (i ? .5 : 1), i ? .07 : .11), bus) });
        if (s.brush) { const n = N(); chain(n, F("bandpass", 3200, .6), E(.025, s.noise, s.dec), bus); }
        else { const n = N(); chain(n, F("highpass", 1100), F("peaking", s.bp, 1, 7), E(.0008, s.noise, s.dec), bus); }
        const w = N(); chain(w, F("highpass", 5500), E(.002, s.wire, s.dec * 1.25), bus);
        if (s.gated) gate(d, .32);
        break;
      }
      case "rim": {
        const bus = G(1); chain(bus, out);
        const o = O("triangle", 1750); chain(o, F("bandpass", 1750, 2), E(.0005, .9, .03), bus);
        const o2 = O("sine", 420); chain(o2, E(.0005, .6, .045), bus);
        const n = N(); chain(n, F("bandpass", 3500, 1.5), E(.0005, .5, .02), bus);
        break;
      }
      case "clap": {
        const n = N(), bp = F("bandpass", 1150, 1.4), g = c.createGain(); g.gain.setValueAtTime(0, t);
        [0, .011, .022, .034].forEach((dd, i) => { g.gain.setValueAtTime(i === 3 ? .8 : 1, t + dd); g.gain.setTargetAtTime(.05, t + dd + .001, .003) });
        g.gain.setValueAtTime(.7, t + .036); g.gain.setTargetAtTime(0, t + .036, .05);
        chain(n, bp, g, out);
        const n2 = N(); chain(n2, F("bandpass", 2400, .8), E(.03, .2, .14), out);
        break;
      }
      case "hhc": case "hho": case "ride": case "crash": {
        const H = K.hat, C = K.cym, base = H.base * (name === "ride" ? .72 : 1), mix = G(.22);
        [2, 3, 4.16, 5.43, 6.79, 8.21].forEach(r => O("square", base * r).connect(mix));
        const dur = name === "hhc" ? .045 : name === "hho" ? .45 : name === "ride" ? 1.5 * (C.dark ? 1.3 : 1) : C.dec;
        const bp = F("bandpass", name === "ride" ? (C.dark ? 5200 : 6500) : 10000 * H.bright, name === "ride" ? 1.1 : .7), hp = F("highpass", name === "crash" ? 4200 : name === "ride" ? 3500 : 7000 * H.bright);
        chain(mix, bp, hp, E(name === "crash" ? .003 : .0006, name === "ride" ? .5 : 1, dur), out);
        const noiseAmt = name === "crash" ? .9 : name === "ride" ? (C.dark ? .25 : .12) : .35;
        if (name === "crash") { const mg = c.createChannelMerger(2); [0, 1].forEach(ch => { const n = N(); chain(n, F("highpass", 3800 + ch * 600), E(.003, noiseAmt, dur * (ch ? .92 : 1))).connect(mg, 0, ch) }); mg.connect(out) }
        else { const n = N(); chain(n, F("highpass", name === "ride" ? 8000 : 8500 * H.bright), E(.0006, noiseAmt, dur * .9), out) }
        if (name === "ride") [2950, 4120, 5230].forEach((f, i) => chain(O("sine", f * (C.dark ? .9 : 1)), E(.0008, .14 / (i + 1), .9), out));
        break;
      }
      case "cow": {
        const bp = F("bandpass", 720, 3), g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .001); g.gain.setTargetAtTime(.25, t + .001, .012); g.gain.setTargetAtTime(0, t + .05, .08);
        [545, 815].forEach(f => O("square", f).connect(bp)); chain(bp, g, out);
        break;
      }
      default: { // toms
        const T = K.tom, f = { tom1: 205, tom2: 155, tom3: 102 }[name] * T.k, bus = G(1); chain(bus, D(1.3), out);
        const o = O("sine", f * 1.6); o.frequency.setTargetAtTime(f, t, .02); o.frequency.setTargetAtTime(f * .82, t + .08, .3);
        chain(o, E(.001, 1, T.dec), bus);
        const o2 = O("triangle", f * 1.5 * 1.6); o2.frequency.setTargetAtTime(f * 1.5, t, .02); chain(o2, E(.001, .18, T.dec * .5), bus);
        const n = N(); chain(n, F("lowpass", 2600), E(.0005, .3, .025), bus);
        if (T.gated) gate(bus, .4);
      }
    }
  },
  /* play a drum hit (sample from the rendered bank) */
  drum(name, t, vel, kitName) {
    if (!this.ready) return; t = Math.max(fin(t, 0), this.now()); vel = clamp(fin(vel == null ? 1 : vel, 1), 0, 1.2); if (vel < .01) return;
    const kn = this.KITS[kitName || SET.kit] ? (kitName || SET.kit) : "acoustic";
    const bank = this._banks[kn] || this._banks.acoustic;
    if (!this._banks[kn]) this.loadKit(kn);
    if (!bank || !bank[name]) return;
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = bank[name]; src.playbackRate.value = 1 + (Math.random() - .5) * .016;
    const g = ctx.createGain(); g.gain.value = Math.pow(vel, 1.5);
    let node = src;
    if (vel < .45) { const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2500 + vel * 6000; node.connect(lp); node = lp }
    node.connect(g); g.connect(this.drumBus);
    if (name === "hhc" || name === "hho") { if (this._oh) { try { this._oh.gain.cancelScheduledValues(t); this._oh.gain.setTargetAtTime(0, t, .012) } catch (e) {} } this._oh = name === "hho" ? g : null }
    src.start(t); const end = t + src.buffer.duration; this.track(src, g, end);
    return end;
  },
  setKit(name) { SET.kit = name; if (this.ready) { this.loadKit(name); this.drumRev.gain.setTargetAtTime((this.KITS[name] || this.KITS.acoustic).rev, this.now(), .05) } },

  /* ================= guitar (Karplus–Strong) ================= */
  TONES: {
    clean: { n: "Чистый", drive: 0, pre: 1, lp: 6500, mid: 0, rev: .22, out: .9 },
    aero: { n: "Аэро", drive: 0, pre: 1, lp: 7500, mid: -1, rev: .4, out: .8, chorus: .6, delay: [.36, .32, .28] },
    ambient: { n: "Эмбиент", drive: .8, pre: 1.2, lp: 5200, mid: -2, rev: .75, out: .7, chorus: .35, delay: [.48, .5, .38] },
    crunch: { n: "Кранч", drive: 3, pre: 5, lp: 4800, mid: 3, rev: .15, out: .5 },
    lead: { n: "Лид", drive: 7, pre: 14, lp: 4200, mid: 5, rev: .32, out: .38, delay: [.38, .25, .18] },
    fuzz: { n: "Фузз", drive: 18, pre: 30, lp: 3200, mid: -4, rev: .2, out: .3, asym: 1 },
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
      for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k) * (x < 0 ? (T.asym ? .7 : .95) : 1) }
      ws.curve = c; ws.oversample = "4x"; node.connect(ws); node = ws;
    }
    const mid = ctx.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 750; mid.Q.value = .8; mid.gain.value = T.mid; node.connect(mid); node = mid;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = T.lp; lp.Q.value = .7; node.connect(lp); node = lp;
    const lp2 = ctx.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = T.lp * 1.3; node.connect(lp2); node = lp2;
    const outG = ctx.createGain(); outG.gain.value = T.out; node.connect(outG);
    if (T.chorus) { // two modulated short delays mixed with the dry signal
      [[.012, .7, 1], [.017, .9, -1]].forEach(([dl, rate, ph]) => { const d = ctx.createDelay(.05); d.delayTime.value = dl; const l = ctx.createOscillator(); l.frequency.value = rate; const lg = ctx.createGain(); lg.gain.value = .0028 * ph; l.connect(lg); lg.connect(d.delayTime); l.start(); const wg = ctx.createGain(); wg.gain.value = T.chorus * .6; node.connect(d); d.connect(wg); wg.connect(outG) });
    }
    if (T.delay) { const [tm, fb, mix] = T.delay, d = ctx.createDelay(2), f = ctx.createGain(), w = ctx.createGain(), lpd = ctx.createBiquadFilter(); lpd.type = "lowpass"; lpd.frequency.value = 3000; d.delayTime.value = tm; f.gain.value = fb; w.gain.value = mix; outG.connect(d); d.connect(lpd); lpd.connect(f); f.connect(d); lpd.connect(w); this.out(w, T.rev) }
    this.out(outG, T.rev);
    return this._chains[key] = inp;
  },
  pluck(midi, t, vel, o) {
    if (!this.ready || !Number.isFinite(midi)) return; o = o || {}; t = Math.max(fin(t, 0), this.now()); vel = clamp(fin(vel == null ? .9 : vel, .9), 0, 1.2);
    const src = this.ctx.createBufferSource(); src.buffer = this.ksBuffer(clamp(Math.round(midi), 24, 100), o.mute);
    const g = this.ctx.createGain(); g.gain.value = vel * (o.mute ? 1.1 : .55);
    if (o.bend) { src.detune.setValueAtTime(0, t + .05); src.detune.linearRampToValueAtTime(o.bend * 100, t + .05 + (o.bendTime || .18)) }
    if (o.vib) { const l = this.ctx.createOscillator(), lg = this.ctx.createGain(); l.frequency.value = 5.5; lg.gain.value = 0; lg.gain.linearRampToValueAtTime(o.vib * 25, t + .4); l.connect(lg); lg.connect(src.detune); l.start(t); l.stop(t + src.buffer.duration) }
    if (o.slideFrom != null) { src.detune.setValueAtTime((o.slideFrom - midi) * 100, t); src.detune.linearRampToValueAtTime(0, t + .12) }
    src.connect(g); g.connect(this.ampChain(o.tone || SET.gtone));
    const dur = o.dur ? Math.min(o.dur, src.buffer.duration) : src.buffer.duration;
    if (o.dur) { g.gain.setValueAtTime(g.gain.value, t + dur - .03); g.gain.linearRampToValueAtTime(0, t + dur) }
    src.start(t); src.stop(t + dur + .01);
    this._voices = (this._voices || []).filter(v => v.end > this.now()); this._voices.push({ src, g, end: t + dur }); this.track(src, g, t + dur);
    if (this._voices.length > 18) { const v = this._voices.shift(); try { v.g.gain.setTargetAtTime(0, this.now(), .02) } catch (e) {} }
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
    aero: { n: "Аэро-пэд", osc: [{ w: "sawtooth", g: .18, dt: -12 }, { w: "sawtooth", g: .18, dt: 12 }, { w: "triangle", g: .35, r: 2 }, { w: "sine", g: .3, r: 4 }], a: .45, d: 1.2, s: .75, rel: 1.8, cut: 5200, q: 1, env: 0, lfo: .3, lfoC: 900, rev: .8 },
    glass: { n: "Стекло", osc: [{ w: "sine", g: .55 }, { w: "sine", g: .2, r: 2.01 }], fm: { r: 7, i: 1.4, d: 1.6 }, a: .003, d: 2.2, s: .12, rel: 1.4, cut: 12000, q: 0, env: 0, rev: .7 },
    supersaw: { n: "Суперпила", osc: [{ w: "sawtooth", g: .16, dt: -22 }, { w: "sawtooth", g: .16, dt: -9 }, { w: "sawtooth", g: .18, dt: 0 }, { w: "sawtooth", g: .16, dt: 9 }, { w: "sawtooth", g: .16, dt: 22 }], a: .01, d: .5, s: .8, rel: .5, cut: 4800, q: 1, env: 1500, envD: .4, rev: .5 },
    vapor: { n: "Вейпор-клавиши", osc: [{ w: "sine", g: .7 }, { w: "triangle", g: .25, r: 2 }], fm: { r: 1, i: .9, d: .6 }, a: .006, d: 1.6, s: .3, rel: .9, cut: 2600, q: .4, env: 0, lfo: .9, lfoD: 14, rev: .6 },
    rhodes: { n: "Родес", osc: [{ w: "sine", g: .8 }, { w: "sine", g: .12, r: 3 }], fm: { r: 14, i: .35, d: .25 }, a: .002, d: 2, s: .25, rel: .6, cut: 5000, q: .3, env: 0, lfo: 4.5, lfoD: 4, rev: .3 },
    flute: { n: "Флейта", osc: [{ w: "triangle", g: .5 }, { w: "sine", g: .4 }], a: .06, d: .3, s: .85, rel: .25, cut: 3200, q: 0, env: 0, lfo: 5.2, lfoD: 10, lfoDelay: .3, rev: .5 },
    choir: { n: "Хор", osc: [{ w: "sawtooth", g: .2, dt: -8 }, { w: "sawtooth", g: .2, dt: 8 }, { w: "triangle", g: .3 }], a: .4, d: .6, s: .85, rel: 1.2, cut: 1300, q: 3, env: 0, lfo: 4.6, lfoD: 7, rev: .75 },
    acid: { n: "Эсид", osc: [{ w: "sawtooth", g: .5 }], a: .002, d: .25, s: .3, rel: .08, cut: 300, q: 14, env: 3200, envD: .18, rev: .1, drive: 2 },
    sub808: { n: "808-бас", osc: [{ w: "sine", g: 1 }, { w: "triangle", g: .2 }], a: .003, d: 1.5, s: .3, rel: .4, cut: 2000, q: 0, env: 0, drive: 2.5, pitchEnv: 12, rev: 0 }
  },
  synthParams(name) {
    const base = this.PRESETS[name] || this.PRESETS.epiano, cu = (SET.synthEdit || {})[name] || {};
    return Object.assign({}, base, cu);
  },
  /* start a synth voice; returns handle with .stop(t) */
  noteOn(midi, t, vel, presetName) {
    if (!this.ready || !Number.isFinite(midi)) return null; const ctx = this.ctx; t = Math.max(fin(t, 0), this.now()); vel = clamp(fin(vel == null ? .8 : vel, .8), 0, 1.2);
    this._syn = (this._syn || []).filter(h => !h.stopped); if (this._syn.length >= 28) this._syn.shift().stop();
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
    this._syn.push(h);
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
["pointerdown", "touchend", "keydown"].forEach(ev => document.addEventListener(ev, () => { try { if (!AU.ready || AU.ctx.state !== "running") AU.init() } catch (e) {} }, { capture: true }));
document.addEventListener("visibilitychange", () => { if (!document.hidden && AU.ready && AU.ctx.state !== "running") AU.ctx.resume() });
