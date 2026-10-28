"use strict";
/* tools.js — Студия: гитара, барабаны и драм-машина, синтезатор, метроном, тюнер, справочник. */

const TOOLS = [
  { id: "guitar", n: "Гитара", d: "Гриф, аккорды, гаммы, 5 звуков усилителя", ic: "guitar", c: "guitar" },
  { id: "drums", n: "Барабаны", d: "Пэды и драм-машина на 16 шагов", ic: "drums", c: "drums" },
  { id: "synth", n: "Синтезатор", d: "3 октавы, 12 пресетов, аккорды и арпеджиатор", ic: "keys", c: "keys" },
  { id: "metro", n: "Метроном", d: "Акценты, деления, тренер скорости", ic: "metro", c: "rhythm" },
  { id: "tuner", n: "Тюнер", d: "Настройка гитары через микрофон", ic: "tuner", c: "theory" },
  { id: "ref", n: "Справочник", d: "Гаммы, аккорды и квинтовый круг", ic: "theory", c: "styles" }
];
function openTool(id) {
  W.stopAll();
  const f = { guitar: toolGuitar, drums: toolDrums, synth: toolSynth, metro: toolMetro, tuner: toolTuner, ref: toolRef }[id];
  f && f();
}
const segHTML = (cls, items, cur) => `<div class="seg ${cls}">${items.map(([k, n]) => `<button data-v="${k}" class="${k == cur ? "on" : ""}">${esc(n)}</button>`).join("")}</div>`;
function bindSeg(root, cls, fn) { $$("." + cls + " button", root).forEach(b => b.onclick = () => { $$("." + cls + " button", root).forEach(x => x.classList.toggle("on", x === b)); fn(b.dataset.v, b) }) }
const selHTML = (cls, items, cur) => `<select class="field ${cls}" style="height:42px">${items.map(([k, n]) => `<option value="${k}" ${k == cur ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
const ROOTS = [...Array(12).keys()];

/* ===================== guitar ===================== */
function toolGuitar() {
  const st = { root: null, scale: "mpenta", lab: "note", chord: null };
  const body = () => `
  <div class="ctrl">${segHTML("gt", Object.entries(AU.TONES).map(([k, t]) => [k, t.n]), SET.gtone)}</div>
  <div class="widget" style="padding:10px"><div id="gfb"></div></div>
  <div class="ctrl"><select class="field gsc" style="height:42px;flex:1 1 160px"><option value="">Гамма на грифе: нет</option>${Object.entries(SCALES).map(([k, s]) => `<option value="${k}" ${st.root != null && st.scale === k ? "selected" : ""}>${esc(s.n)}</option>`).join("")}</select>
  ${selHTML("grt", ROOTS.map(r => [r, nn(r)]), st.root ?? 9)}${segHTML("glab", [["note", "Ноты"], ["int", "Ступени"], ["none", "Точки"]], st.lab)}</div>
  <div class="sec"><h2>Бой</h2><span id="gcur">Выберите аккорд</span></div>
  <div class="ctrl"><button class="btn soft gstr" data-d="down">↓ Вниз</button><button class="btn soft gstr" data-d="up">↑ Вверх</button><button class="btn soft gstr" data-d="mute">Приглушить</button><button class="btn ghost gstop">Заглушить</button></div>
  ${GCH_GROUPS.map(([g, list]) => `<div class="sec"><h2>${esc(g)}</h2></div><div class="chords">${list.map(n => `<button class="chordc" data-gsel="${esc(n)}"><b>${esc(n)}</b>${chordSVG(n)}</button>`).join("")}</div>`).join("")}
  <div class="sec"><h2>Строй и гриф</h2></div><div class="ctrl">${selHTML("gtun", Object.entries(TUNINGS).map(([k, t]) => [k, t.n]), SET.tuning)}<button class="btn soft sm glefty">${SET.lefty ? "Для левши ✓" : "Для левши"}</button></div>`;
  const el = openLayer("Гитара", body(), { wide: 1, cc: "guitar", onClose: () => AU.silenceGuitar() });
  const draw = () => {
    const box = el.querySelector("#gfb");
    box.innerHTML = fretboardHTML({ frets: 15, scale: st.root != null ? { root: st.root + 36, type: st.scale } : null, labels: st.lab, marks: st.chord ? chordMarks(st.chord) : [] });
    W.mount(box);
  };
  const chordMarks = name => { const sh = GCH[name]; if (!sh) return []; return sh.f.map((f, s) => f < 0 ? null : { s, f, l: nn(tuning()[s] + f), root: pcOf(tuning()[s] + f) === parseChord(name.replace("5", "")).root }).filter(Boolean) };
  draw();
  bindSeg(el, "gt", v => { SET.gtone = v; saveSet(); AU.init(); AU.strum(shapeMidis(GCH[st.chord || "E"], tuning()), 0, {}) });
  el.querySelector(".gsc").onchange = e => { const v = e.target.value; if (!v) st.root = null; else { st.scale = v; st.root = +el.querySelector(".grt").value } draw() };
  el.querySelector(".grt").onchange = e => { if (st.root != null) { st.root = +e.target.value; draw() } };
  bindSeg(el, "glab", v => { st.lab = v; draw() });
  $$("[data-gsel]", el).forEach(b => b.onclick = () => {
    st.chord = b.dataset.gsel; $$("[data-gsel]", el).forEach(x => x.classList.toggle("on", x === b)); el.querySelector("#gcur").textContent = st.chord;
    AU.init(); AU.strum(shapeMidis(GCH[st.chord], tuning()), 0, { speed: .02 }); practiceTick("guitar"); draw();
  });
  $$(".gstr", el).forEach(b => b.onpointerdown = e => { e.preventDefault(); AU.init(); const sh = GCH[st.chord || "Em"]; const ms = shapeMidis(sh, tuning()); const d = b.dataset.d; AU.strum(ms, 0, { up: d === "up", speed: d === "up" ? .012 : .016, mute: d === "mute", vel: d === "up" ? .65 : .85 }); practiceTick("guitar") });
  el.querySelector(".gstop").onclick = () => AU.silenceGuitar();
  el.querySelector(".gtun").onchange = e => { SET.tuning = e.target.value; saveSet(); draw() };
  el.querySelector(".glefty").onclick = e => { SET.lefty = SET.lefty ? 0 : 1; saveSet(); e.target.textContent = SET.lefty ? "Для левши ✓" : "Для левши"; draw() };
}

/* ===================== drums ===================== */
const DM_TRACKS = ["crash", "ride", "hho", "hhc", "tom1", "tom3", "clap", "snare", "kick"];
const DM_PRESETS = {
  rock: { n: "Рок", bpm: 100, t: { hhc: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-----x-x-------" } },
  funk: { n: "Фанк", bpm: 98, t: { hhc: "x-x-x-x-x-x-x-x-", snare: "----X--g-g--X--g", kick: "x-x-------x--x--" } },
  disco: { n: "Диско", bpm: 118, t: { hhc: "x---x---x---x---", hho: "--x---x---x---x-", snare: "----x-------x---", kick: "x---x---x---x---" } },
  house: { n: "Хаус", bpm: 124, kit: "e808", t: { hho: "--x---x---x---x-", hhc: "x-x-x-x-x-x-x-x-", clap: "----x-------x---", kick: "x---x---x---x---" } },
  hiphop: { n: "Бум-бэп", bpm: 90, swing: .18, kit: "lofi", t: { hhc: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------xx----x-" } },
  trap: { n: "Трэп", bpm: 140, kit: "e808", t: { hhc: "x-x-x-xxx-x-xxxx", clap: "--------x-------", kick: "x------x--x-----" } },
  reggae: { n: "Регги", bpm: 76, t: { hhc: "x-x-x-x-x-x-x-x-", snare: "--------x-------", kick: "--------x-------" } },
  punk: { n: "Панк", bpm: 180, kit: "rock", t: { crash: "x-x-x-x-x-x-x-x-", snare: "--x---x---x---x-", kick: "x---x---x---x---" } },
  metal: { n: "Метал", bpm: 130, kit: "rock", t: { ride: "x---x---x---x---", snare: "----x-------x---", kick: "xxxxxxxxxxxxxxxx" } },
  half: { n: "Халф-тайм", bpm: 85, t: { hhc: "x-x-x-x-x-x-x-x-", snare: "--------x-------", kick: "x-----x-------x-" } },
  bossa: { n: "Босса-нова", bpm: 130, t: { hhc: "xxxxxxxxxxxxxxxx", tom1: "x--x--x---x--x--", kick: "x--xx--xx--xx--x" } },
  clear: { n: "Пусто", bpm: 100, t: {} }
};
function patFrom(pr) { const s = {}; DM_TRACKS.forEach(k => { const str = (pr.t[k] || "").padEnd(16, "-"); s[k] = [...str.slice(0, 16)].map(c => c === "X" ? 2 : c === "x" ? 1 : c === "g" ? 3 : 0) }); return { bpm: pr.bpm, swing: pr.swing || 0, kit: pr.kit, s } }
function toolDrums() {
  let pat = LS.get("lad_dm", null) || patFrom(DM_PRESETS.rock);
  const saved = () => LS.get("lad_dmsaved", {});
  const PADS = ["crash", "ride", "hho", "hhc", "tom1", "tom2", "tom3", "snare", "rim", "clap", "cow", "kick"];
  const html = `
  <div class="ctrl">${segHTML("dkit", Object.entries(AU.KITS).map(([k, t]) => [k, t.n]), SET.kit)}</div>
  <div class="pads" id="pads">${PADS.map(k => `<button class="pad" data-p="${k}" style="--pc:${AU.DRUMS[k].c}"><i></i><span>${AU.DRUMS[k].n}</span></button>`).join("")}</div>
  <p class="note">Касание ближе к центру пэда — громче. Можно играть двумя руками одновременно.</p>
  <div class="sec"><h2>Драм-машина</h2><span id="dmName"></span></div>
  <div class="panel" style="padding:14px">
    <div class="chips scroll" style="margin-bottom:12px">${Object.entries(DM_PRESETS).map(([k, p]) => `<button class="chip" data-pre="${k}">${p.n}</button>`).join("")}</div>
    <div class="seqwrap"><div class="seq" id="seq"></div></div>
    <div class="ctrl"><button class="bigplay" id="dmPlay" style="width:60px;height:60px">${IC.play}</button>
      <div class="kn grow"><label>Темп<output id="dmBpmO"></output></label><input type="range" id="dmBpm" min="50" max="220"></div>
      <div class="kn grow"><label>Свинг<output id="dmSwO"></output></label><input type="range" id="dmSw" min="0" max="40"></div></div>
    <div class="ctrl"><button class="btn soft sm" id="dmSave">Сохранить</button><button class="btn soft sm" id="dmMine">Мои паттерны</button><button class="btn ghost sm" id="dmBass">Бас: выкл</button></div>
    <p class="note">Нажатие на шаг: удар → акцент → гост → пусто.</p>
  </div>`;
  let clk = null, bassOn = false;
  const el = openLayer("Барабаны", html, { wide: 1, cc: "drums", onClose: () => { clk && clk.stop(); LS.set("lad_dm", pat) } });
  const seq = el.querySelector("#seq");
  const drawSeq = () => {
    let h = `<span></span>`; for (let i = 0; i < 16; i++) h += `<i class="seqhead" data-h="${i}"></i>`;
    for (const k of DM_TRACKS) { h += `<span class="lbl" style="color:${AU.DRUMS[k].c}">${AU.DRUMS[k].n}</span>`; for (let i = 0; i < 16; i++) { const v = pat.s[k][i]; h += `<button class="stp ${Math.floor(i / 4) % 2 ? "b4" : ""} ${v ? "on" : ""} ${v === 2 ? "ac" : ""}" style="--pc:${v === 3 ? hexA(AU.DRUMS[k].c, .4) : AU.DRUMS[k].c}" data-k="${k}" data-i="${i}" aria-label="${AU.DRUMS[k].n} шаг ${i + 1}"></button>` } }
    seq.innerHTML = h;
    el.querySelector("#dmBpm").value = pat.bpm; el.querySelector("#dmBpmO").textContent = pat.bpm;
    el.querySelector("#dmSw").value = Math.round((pat.swing || 0) * 100); el.querySelector("#dmSwO").textContent = Math.round((pat.swing || 0) * 100) + "%";
  };
  drawSeq();
  seq.addEventListener("click", e => { const b = e.target.closest(".stp"); if (!b) return; const k = b.dataset.k, i = +b.dataset.i; const v = pat.s[k][i]; pat.s[k][i] = v === 0 ? 1 : v === 1 ? 2 : v === 2 ? 3 : 0; drawSeq(); if (pat.s[k][i]) { AU.init(); AU.drum(k, 0, pat.s[k][i] === 2 ? 1 : pat.s[k][i] === 3 ? .3 : .8) } });
  bindSeg(el, "dkit", v => { SET.kit = v; saveSet(); AU.init(); AU.drum("snare"); AU.drum("kick") });
  // pads with multitouch and velocity
  el.querySelector("#pads").addEventListener("pointerdown", e => {
    const p = e.target.closest(".pad"); if (!p) return; e.preventDefault(); AU.init();
    const r = p.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5, vel = clamp(1 - Math.hypot(dx, dy) * .9, .35, 1);
    AU.drum(p.dataset.p, 0, vel); p.classList.remove("hit"); void p.offsetWidth; p.classList.add("hit"); setTimeout(() => p.classList.remove("hit"), 90); practiceTick("drums");
  });
  const keymap = { " ": "kick", b: "kick", n: "snare", v: "snare", j: "hhc", k: "hho", h: "tom1", g: "tom2", f: "tom3", u: "crash", i: "ride" };
  const kd = e => { const k = keymap[e.key.toLowerCase()]; if (!k || e.repeat || e.target.tagName === "INPUT") return; e.preventDefault(); AU.init(); AU.drum(k); const p = el.querySelector(`[data-p="${k}"]`); p && (p.classList.add("hit"), setTimeout(() => p.classList.remove("hit"), 90)) };
  document.addEventListener("keydown", kd); W.onStop(() => document.removeEventListener("keydown", kd));
  const bassLine = [36, null, null, 36, null, null, 43, null, 36, null, 46, null, 43, null, 38, null];
  const play = () => {
    if (clk && clk.running) { clk.stop(); el.querySelector("#dmPlay").innerHTML = IC.play; $$(".seqhead", seq).forEach(h => h.classList.remove("cur")); return }
    clk = new Clock({ bpm: pat.bpm, div: 4, swing: pat.swing, onStep: (st, t) => {
      const i = st % 16; for (const k of DM_TRACKS) { const v = pat.s[k][i]; if (v) AU.drum(k, t, v === 2 ? 1 : v === 3 ? .28 : .78) }
      if (bassOn && bassLine[i] != null) AU.note(bassLine[i], t, clk.stepDur * 1.6, .9, "bass");
      AU.at(t, () => { $$(".seqhead", seq).forEach(h => h.classList.toggle("cur", +h.dataset.h === i)); $$(".stp.cur", seq).forEach(s => s.classList.remove("cur")); $$(`.stp[data-i="${i}"].on`, seq).forEach(s => s.classList.add("cur")) });
      if (i === 0) practiceTick("drums");
    } });
    clk.start(); el.querySelector("#dmPlay").innerHTML = IC.stop;
  };
  W.onStop(() => clk && clk.stop());
  el.querySelector("#dmPlay").onclick = play;
  el.querySelector("#dmBpm").oninput = e => { pat.bpm = +e.target.value; el.querySelector("#dmBpmO").textContent = pat.bpm; if (clk) clk.bpm = pat.bpm };
  el.querySelector("#dmSw").oninput = e => { pat.swing = +e.target.value / 100; el.querySelector("#dmSwO").textContent = e.target.value + "%"; if (clk) clk.swing = pat.swing };
  $$("[data-pre]", el).forEach(b => b.onclick = () => { const pr = DM_PRESETS[b.dataset.pre]; const was = clk && clk.running; pat = patFrom(pr); if (pr.kit) { SET.kit = pr.kit; saveSet(); $$(".dkit button", el).forEach(x => x.classList.toggle("on", x.dataset.v === pr.kit)) } el.querySelector("#dmName").textContent = pr.n; drawSeq(); if (clk) { clk.bpm = pat.bpm; clk.swing = pat.swing } if (!was && pr !== DM_PRESETS.clear) { play() } });
  el.querySelector("#dmBass").onclick = e => { bassOn = !bassOn; e.target.textContent = bassOn ? "Бас: вкл" : "Бас: выкл"; e.target.classList.toggle("primary", bassOn) };
  el.querySelector("#dmSave").onclick = () => {
    openSheet(`<h2>Сохранить паттерн</h2><input class="field" id="pName" placeholder="Название" maxlength="30" value="Мой бит ${Object.keys(saved()).length + 1}"><div class="acts" style="display:flex;gap:10px;margin-top:14px"><button class="btn primary block" id="pOk">Сохранить</button></div>`);
    $("#pOk").onclick = () => { const n = $("#pName").value.trim() || "Без названия"; const s = saved(); s[n] = JSON.parse(JSON.stringify(pat)); LS.set("lad_dmsaved", s); closeSheet(); toast("Сохранено: " + n) };
  };
  el.querySelector("#dmMine").onclick = () => {
    const s = saved(), ks = Object.keys(s);
    openSheet(`<h2>Мои паттерны</h2>${ks.length ? `<div class="panel" style="background:var(--surface-2)">${ks.map(k => `<div class="set"><button class="k" data-load="${esc(k)}" style="text-align:left;flex:1"><b>${esc(k)}</b><small>${s[k].bpm} BPM</small></button><button class="ib" data-del="${esc(k)}" aria-label="Удалить">${IC.trash}</button></div>`).join("")}</div>` : `<p class="empty">Пока ничего не сохранено.</p>`}`);
    $$("[data-load]", $("#sbody")).forEach(b => b.onclick = () => { pat = JSON.parse(JSON.stringify(s[b.dataset.load])); el.querySelector("#dmName").textContent = b.dataset.load; drawSeq(); if (clk) { clk.bpm = pat.bpm; clk.swing = pat.swing } closeSheet() });
    $$("[data-del]", $("#sbody")).forEach(b => b.onclick = () => { delete s[b.dataset.del]; LS.set("lad_dmsaved", s); b.closest(".set").remove() });
  };
}

/* ===================== synth ===================== */
const KEYMAP = "awsedftgyhujkolp;'".split("");
function toolSynth() {
  const st = { mode: "notes", ctype: "", arp: "up", rate: 4, hold: false, scale: null, root: 0, bpm: 110 };
  const presets = Object.entries(AU.PRESETS).filter(([k, p]) => !p.hide && !k.startsWith("__"));
  const from = () => 12 * (SET.octave + 1);
  const html = `
  <div class="chips scroll" id="spre">${presets.map(([k, p]) => `<button class="chip ${SET.synth === k ? "on" : ""}" data-sp="${k}">${esc(p.n)}</button>`).join("")}</div>
  <div class="widget" style="padding:10px;margin-top:12px"><canvas id="scope" style="width:100%;height:70px;display:block"></canvas></div>
  <div class="ctrl"><button class="rnd" id="octD" aria-label="Октава ниже">${IC.minus}</button><b id="octL" style="min-width:76px;text-align:center"></b><button class="rnd" id="octU" aria-label="Октава выше">${IC.plus}</button>
    <div class="grow"></div><button class="btn soft sm" id="sHold">Удержание</button></div>
  <div id="skbd"></div>
  <div class="ctrl">${segHTML("smode", [["notes", "Ноты"], ["chord", "Аккорды"], ["arp", "Арпеджио"]], st.mode)}</div>
  <div id="sopt"></div>
  <div class="sec"><h2>Звук</h2><button id="sReset">Сбросить</button></div><div class="knobs" id="sknobs"></div>
  <div class="sec"><h2>Подсветка гаммы</h2></div><div class="ctrl"><select class="field ssc" style="height:42px;flex:1 1 160px"><option value="">Нет</option>${Object.entries(SCALES).map(([k, s]) => `<option value="${k}">${esc(s.n)}</option>`).join("")}</select>${selHTML("srt", ROOTS.map(r => [r, nn(r)]), 0)}</div>
  <p class="note">С клавиатурой iPad: ряд A W S E D F T G Y H U J K — клавиши пианино, Z/X — октава.</p>`;
  const held = new Map(); let arpClk = null, arpNotes = [], kb = null;
  const el = openLayer("Синтезатор", html, { wide: 1, cc: "keys", onClose: () => { held.forEach(v => v.forEach(h => h && h.stop())); held.clear(); arpClk && arpClk.stop(); cancelAnimationFrame(scopeRaf); try { scopeAn && AU.master.disconnect(scopeAn) } catch (e) {} } });
  const voicesFor = m => st.mode === "chord" ? CHORDS[st.ctype].s.map(i => m + i) : [m];
  const down = m => {
    AU.init(); practiceTick("synth");
    if (st.mode === "arp") { arpNotes.push(m); arpNotes.sort((a, b) => a - b); startArp(); return () => { if (!st.hold) { arpNotes = arpNotes.filter(x => x !== m); if (!arpNotes.length) arpClk && arpClk.stop() } } }
    if (st.hold && held.has(m)) { held.get(m).forEach(h => h && h.stop()); held.delete(m); return () => {} }
    const hs = voicesFor(m).map(n => AU.noteOn(n, 0, .8)); held.set(m, hs);
    return () => { if (st.hold) return; hs.forEach(h => h && h.stop()); held.delete(m) };
  };
  const startArp = () => {
    if (arpClk && arpClk.running) return;
    let i = 0, dir = 1;
    arpClk = new Clock({ bpm: st.bpm, div: st.rate, onStep: (s, t, d) => {
      if (!arpNotes.length) { arpClk.stop(); return }
      const seq = arpNotes.concat(arpNotes.map(n => n + 12));
      let idx; if (st.arp === "up") idx = i % seq.length; else if (st.arp === "down") idx = seq.length - 1 - (i % seq.length); else if (st.arp === "rnd") idx = rnd(seq.length); else { const L = Math.max(1, seq.length * 2 - 2); const p = i % L; idx = p < seq.length ? p : L - p }
      i++; const n = seq[idx]; AU.note(n, t, d * .8, .75); AU.at(t, () => kb && kb._press(n, d * .8));
    } }); arpClk.start();
  };
  const drawKbd = () => {
    const box = el.querySelector("#skbd"); const sc = st.scale ? SCALES[st.scale].s.map(i => pcOf(st.root + i)) : null;
    box.innerHTML = keyboardHTML({ from: from(), to: from() + 36, labels: SET.keyLabels, hlPc: sc || [], root: sc ? st.root : null, down, ref: w => kb = w });
    W.mount(box); el.querySelector("#octL").textContent = "C" + SET.octave + " – C" + (SET.octave + 3);
  };
  const drawOpt = () => {
    const o = el.querySelector("#sopt");
    if (st.mode === "chord") o.innerHTML = `<div class="chips">${[["", "Мажор"], ["m", "Минор"], ["7", "7"], ["maj7", "maj7"], ["m7", "m7"], ["sus4", "sus4"], ["5", "Квинта"]].map(([k, n]) => `<button class="chip ${st.ctype === k ? "on" : ""}" data-ct="${k}">${n}</button>`).join("")}</div>`;
    else if (st.mode === "arp") o.innerHTML = `<div class="ctrl">${segHTML("sarp", [["up", "Вверх"], ["down", "Вниз"], ["updown", "Туда-обратно"], ["rnd", "Случайно"]], st.arp)}${segHTML("srate", [[2, "1/8"], [3, "1/8т"], [4, "1/16"]], st.rate)}</div><div class="kn"><label>Темп<output>${st.bpm}</output></label><input type="range" id="sbpm" min="60" max="180" value="${st.bpm}"></div>`;
    else o.innerHTML = "";
    $$("[data-ct]", o).forEach(b => b.onclick = () => { st.ctype = b.dataset.ct; drawOpt() });
    bindSeg(o, "sarp", v => st.arp = v); bindSeg(o, "srate", v => { st.rate = +v; if (arpClk) { arpClk.div = st.rate } });
    const sb = o.querySelector("#sbpm"); if (sb) sb.oninput = () => { st.bpm = +sb.value; sb.previousElementSibling.querySelector("output").textContent = st.bpm; if (arpClk) arpClk.bpm = st.bpm };
  };
  const KN = [["a", "Атака", 0, 2, .005, "с"], ["d", "Спад", .05, 3, .01, "с"], ["s", "Удержание", 0, 1, .05, ""], ["rel", "Затухание", .02, 3, .01, "с"], ["cut", "Фильтр", 100, 12000, 10, "Гц"], ["q", "Резонанс", 0, 20, .5, ""], ["rev", "Ревёрб", 0, 1, .05, ""], ["detune", "Расстройка", -50, 50, 1, "ц"], ["lfoD", "Вибрато", 0, 60, 1, "ц"]];
  const drawKnobs = () => {
    const P = AU.synthParams(SET.synth);
    el.querySelector("#sknobs").innerHTML = KN.map(([k, n, mn, mx, stp, u]) => `<div class="kn"><label>${n}<output>${fmtK(P[k] ?? 0, u)}</output></label><input type="range" data-k="${k}" data-u="${u}" min="${mn}" max="${mx}" step="${stp}" value="${P[k] ?? 0}"></div>`).join("");
    $$("#sknobs input", el).forEach(i => i.oninput = () => {
      const ed = SET.synthEdit || (SET.synthEdit = {}); ed[SET.synth] = ed[SET.synth] || {}; ed[SET.synth][i.dataset.k] = +i.value;
      if (i.dataset.k === "lfoD" && !AU.PRESETS[SET.synth].lfo) ed[SET.synth].lfo = 5.5;
      i.previousElementSibling.querySelector("output").textContent = fmtK(+i.value, i.dataset.u); clearTimeout(drawKnobs.t); drawKnobs.t = setTimeout(saveSet, 400);
    });
  };
  const fmtK = (v, u) => (u === "с" ? (+v).toFixed(2) : u === "Гц" ? Math.round(v) : +(+v).toFixed(2)) + (u ? " " + u : "");
  drawKbd(); drawOpt(); drawKnobs();
  $$("[data-sp]", el).forEach(b => b.onclick = () => { SET.synth = b.dataset.sp; saveSet(); $$("[data-sp]", el).forEach(x => x.classList.toggle("on", x === b)); drawKnobs(); AU.init(); AU.note(60, 0, .6, .8); AU.note(64, .0, .6, .6); AU.note(67, 0, .6, .6) });
  el.querySelector("#octD").onclick = () => { SET.octave = Math.max(1, SET.octave - 1); saveSet(); drawKbd() };
  el.querySelector("#octU").onclick = () => { SET.octave = Math.min(5, SET.octave + 1); saveSet(); drawKbd() };
  el.querySelector("#sHold").onclick = e => { st.hold = !st.hold; e.target.classList.toggle("primary", st.hold); if (!st.hold) { held.forEach(v => v.forEach(h => h && h.stop())); held.clear(); arpNotes = []; arpClk && arpClk.stop() } };
  bindSeg(el, "smode", v => { st.mode = v; arpNotes = []; arpClk && arpClk.stop(); drawOpt() });
  el.querySelector("#sReset").onclick = () => { if (SET.synthEdit) delete SET.synthEdit[SET.synth]; saveSet(); drawKnobs(); toast("Пресет сброшен") };
  el.querySelector(".ssc").onchange = e => { st.scale = e.target.value || null; drawKbd() };
  el.querySelector(".srt").onchange = e => { st.root = +e.target.value; drawKbd() };
  // computer keyboard
  const kmHeld = {};
  const kd = e => { if (e.repeat || e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return; const k = e.key.toLowerCase(); if (k === "z") { el.querySelector("#octD").click(); return } if (k === "x") { el.querySelector("#octU").click(); return } const i = KEYMAP.indexOf(k); if (i < 0) return; e.preventDefault(); const m = from() + 12 + i; if (kmHeld[k]) return; kmHeld[k] = down(m); kb && kb._press(m, .25) };
  const ku = e => { const k = e.key.toLowerCase(); if (kmHeld[k]) { kmHeld[k](); delete kmHeld[k] } };
  document.addEventListener("keydown", kd); document.addEventListener("keyup", ku); W.onStop(() => { document.removeEventListener("keydown", kd); document.removeEventListener("keyup", ku) });
  // oscilloscope
  let scopeAn = null, scopeRaf = 0;
  const cv = el.querySelector("#scope");
  const startScope = () => {
    if (!AU.ready || scopeAn) return; scopeAn = AU.ctx.createAnalyser(); scopeAn.fftSize = 1024; AU.master.connect(scopeAn);
    const buf = new Float32Array(scopeAn.fftSize), x = cv.getContext("2d");
    const loop = () => {
      const w = cv.width = cv.clientWidth * devicePixelRatio, h = cv.height = cv.clientHeight * devicePixelRatio;
      scopeAn.getFloatTimeDomainData(buf); let z = 0; for (let i = 1; i < buf.length / 2; i++) if (buf[i - 1] < 0 && buf[i] >= 0) { z = i; break }
      x.clearRect(0, 0, w, h); x.lineWidth = 2 * devicePixelRatio; x.strokeStyle = accentHex(); x.beginPath();
      const N = buf.length / 2; for (let i = 0; i < N; i++) { const v = buf[z + i] || 0, px = i / N * w, py = h / 2 - v * h * 1.4; i ? x.lineTo(px, py) : x.moveTo(px, py) } x.stroke();
      scopeRaf = requestAnimationFrame(loop);
    }; loop();
  };
  el.addEventListener("pointerdown", () => setTimeout(startScope, 50), { once: true });
  if (AU.ready) startScope();
}

/* ===================== metronome ===================== */
function toolMetro() {
  const M = Object.assign({ bpm: 90, beats: 4, sub: 1, acc: null, train: 0, trainStep: 5, trainBars: 4, trainMax: 160 }, LS.get("lad_metro", {}));
  if (!M.acc || M.acc.length !== M.beats) M.acc = Array.from({ length: M.beats }, (_, i) => i === 0 && SET.accentFirst ? 2 : 1);
  let clk = null, bar = 0, taps = [];
  const html = `<div class="pulsebg" id="pbg"></div><div class="metro" style="position:relative">
    <div class="bpm"><span id="bpmV">${M.bpm}</span><small id="tempoN"></small></div>
    <div class="beats" id="beats"></div>
    <div class="bpmrow"><button class="rnd" data-d="-5">−5</button><button class="rnd" data-d="-1">${IC.minus}</button><button class="bigplay" id="mPlay">${IC.play}</button><button class="rnd" data-d="1">${IC.plus}</button><button class="rnd" data-d="5">+5</button></div>
    <div class="range" style="max-width:420px;margin:20px auto 0"><input type="range" id="mBpm" min="30" max="260" value="${M.bpm}" aria-label="Темп"></div>
    <button class="btn soft" id="mTap" style="margin-top:14px;min-width:160px">${IC.tap}Тап темпа</button>
    <p class="note" id="mBar">&nbsp;</p></div>
    <div class="sec"><h2>Размер и деление</h2></div>
    <div class="panel"><div class="set col"><div class="k"><b>Долей в такте</b></div>${segHTML("mbeats", [[2, "2"], [3, "3"], [4, "4"], [5, "5"], [6, "6"], [7, "7"]], M.beats)}</div>
    <div class="set col"><div class="k"><b>Деление доли</b><small>Тихие клики между долями</small></div>${segHTML("msub", [[1, "♩"], [2, "♪♪"], [3, "Триоль"], [4, "16-е"]], M.sub)}</div>
    <div class="set col"><div class="k"><b>Звук</b></div>${segHTML("msnd", [["click", "Клик"], ["wood", "Дерево"], ["beep", "Бип"], ["sticks", "Палочки"], ["cow", "Ковбелл"]], SET.metroSound)}</div>
    <div class="set"><div class="k"><b>Нажмите на точку</b><small>Акцент → обычный → тишина</small></div></div></div>
    <div class="sec"><h2>Тренер скорости</h2></div>
    <div class="panel"><button class="set" id="mTr"><div class="k"><b>Повышать темп</b><small>+${M.trainStep} BPM каждые ${M.trainBars} такта до ${M.trainMax}</small></div><span class="switch ${M.train ? "on" : ""}"></span></button>
    <div class="set col"><div class="knobs"><div class="kn"><label>Шаг<output>${M.trainStep}</output></label><input type="range" id="mTs" min="1" max="10" value="${M.trainStep}"></div><div class="kn"><label>Тактов<output>${M.trainBars}</output></label><input type="range" id="mTb" min="1" max="16" value="${M.trainBars}"></div><div class="kn"><label>До BPM<output>${M.trainMax}</output></label><input type="range" id="mTm" min="60" max="260" value="${M.trainMax}"></div></div></div></div>`;
  const el = openLayer("Метроном", html, { cc: "rhythm", onClose: () => { clk && clk.stop(); LS.set("lad_metro", M) } });
  const save = () => LS.set("lad_metro", M);
  const tempoName = b => b < 60 ? "Largo" : b < 76 ? "Adagio" : b < 108 ? "Andante · Moderato" : b < 120 ? "Allegretto" : b < 156 ? "Allegro" : b < 176 ? "Vivace" : "Presto";
  const setBpm = b => { M.bpm = clamp(Math.round(b), 30, 260); el.querySelector("#bpmV").textContent = M.bpm; el.querySelector("#mBpm").value = M.bpm; el.querySelector("#tempoN").textContent = tempoName(M.bpm); if (clk) clk.bpm = M.bpm; save() };
  const drawBeats = () => { el.querySelector("#beats").innerHTML = M.acc.map((a, i) => `<i data-b="${i}" class="${a === 2 ? "acc" : a === 0 ? "mute" : ""}"></i>`).join("") };
  setBpm(M.bpm); drawBeats();
  el.querySelector("#beats").onclick = e => { const i = e.target.dataset.b; if (i == null) return; const a = M.acc[i]; M.acc[i] = a === 2 ? 1 : a === 1 ? 0 : 2; drawBeats(); save() };
  $$(".rnd[data-d]", el).forEach(b => b.onclick = () => setBpm(M.bpm + +b.dataset.d));
  el.querySelector("#mBpm").oninput = e => setBpm(+e.target.value);
  const start = () => {
    if (clk && clk.running) { clk.stop(); el.querySelector("#mPlay").innerHTML = IC.play; el.querySelector("#mBar").innerHTML = "&nbsp;"; return }
    bar = 0; clk = new Clock({ bpm: M.bpm, div: M.sub, onStep: (s, t) => {
      const per = M.beats * M.sub, inBar = s % per, beat = Math.floor(inBar / M.sub), isBeat = inBar % M.sub === 0;
      if (inBar === 0 && s > 0) { bar++; if (M.train && bar % M.trainBars === 0 && M.bpm < M.trainMax) AU.at(t, () => setBpm(Math.min(M.trainMax, M.bpm + M.trainStep))) }
      const a = M.acc[beat];
      if (isBeat) { if (a) AU.click(t, a === 2 ? 2 : 1); AU.at(t, () => { $$("#beats i", el).forEach((d, i) => d.classList.toggle("on", i === beat)); const pb = el.querySelector("#pbg"); if (a) { pb.classList.add("on"); setTimeout(() => pb.classList.remove("on"), 60) } el.querySelector("#mBar").textContent = "Такт " + (bar + 1) + (M.train ? " · тренер" : ""); practiceTick("metro") }) }
      else if (a) AU.click(t, 0);
    } });
    clk.start(); el.querySelector("#mPlay").innerHTML = IC.stop;
  };
  W.onStop(() => clk && clk.stop());
  el.querySelector("#mPlay").onclick = start;
  el.querySelector("#mTap").onclick = () => { AU.init(); const n = performance.now(); taps = taps.filter(t => n - t < 2500); taps.push(n); AU.ui("tap"); if (taps.length >= 2) { const d = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); setBpm(60000 / d) } };
  bindSeg(el, "mbeats", v => { M.beats = +v; M.acc = Array.from({ length: M.beats }, (_, i) => i === 0 ? 2 : 1); drawBeats(); save(); if (clk && clk.running) { start(); start() } });
  bindSeg(el, "msub", v => { M.sub = +v; save(); if (clk && clk.running) { start(); start() } });
  bindSeg(el, "msnd", v => { SET.metroSound = v; saveSet(); AU.init(); AU.click(AU.now() + .02, 2) });
  el.querySelector("#mTr").onclick = e => { M.train = M.train ? 0 : 1; e.currentTarget.querySelector(".switch").classList.toggle("on", !!M.train); save() };
  [["#mTs", "trainStep"], ["#mTb", "trainBars"], ["#mTm", "trainMax"]].forEach(([s, k]) => { const i = el.querySelector(s); i.oninput = () => { M[k] = +i.value; i.previousElementSibling.querySelector("output").textContent = i.value; el.querySelector("#mTr small").textContent = `+${M.trainStep} BPM каждые ${M.trainBars} такта до ${M.trainMax}`; save() } });
}

/* ===================== tuner ===================== */
function yin(buf, sr) {
  const W = 2048, maxT = Math.min(Math.floor(sr / 60), buf.length - W), minT = Math.floor(sr / 1100);
  let rms = 0; for (let i = 0; i < W; i++) rms += buf[i] * buf[i]; rms = Math.sqrt(rms / W); if (rms < .008) return { f: -1, rms };
  const d = new Float32Array(maxT + 1);
  for (let t = 1; t <= maxT; t++) { let s = 0; for (let j = 0; j < W; j++) { const v = buf[j] - buf[j + t]; s += v * v } d[t] = s }
  let run = 0; const c = new Float32Array(maxT + 1); c[0] = 1;
  for (let t = 1; t <= maxT; t++) { run += d[t]; c[t] = d[t] * t / (run || 1) }
  let tau = -1; for (let t = minT; t <= maxT; t++) if (c[t] < .12) { while (t + 1 <= maxT && c[t + 1] < c[t]) t++; tau = t; break }
  if (tau < 0) { let m = 1e9; for (let t = minT; t <= maxT; t++) if (c[t] < m) { m = c[t]; tau = t } if (m > .3) return { f: -1, rms } }
  const a = c[tau - 1] ?? c[tau], b = c[tau], cc = c[tau + 1] ?? c[tau], den = a + cc - 2 * b, sh = den ? (a - cc) / (2 * den) : 0;
  return { f: sr / (tau + sh), rms };
}
function toolTuner() {
  const ref = LS.get("lad_a4", 440);
  const html = `<div class="tuner"><div class="tnote" id="tn">–</div><div class="cents" id="tc">Нажмите «Включить» и сыграйте открытую струну</div>
  <div class="gauge"><div class="scale">${Array.from({ length: 21 }, (_, i) => `<i class="${i === 10 ? "mid" : ""}"></i>`).join("")}</div><div class="needle" id="tneedle"></div></div>
  <button class="btn primary" id="tOn" style="min-width:200px">${IC.mic}Включить</button>
  <div class="strs" id="tstr"></div><p class="note">Нажмите на струну, чтобы услышать эталонную ноту.</p></div>
  <div class="sec"><h2>Настройки</h2></div><div class="panel"><div class="set col"><div class="k"><b>Строй</b></div>${selHTML("ttun", Object.entries(TUNINGS).map(([k, t]) => [k, t.n]), SET.tuning)}</div>
  <div class="set col"><div class="k"><b>Частота A4</b><small>Обычно 440 Гц</small></div><div class="range"><input type="range" id="tA4" min="430" max="450" value="${ref}"><output>${ref} Гц</output></div></div></div>
  <p class="note">Тюнер слушает микрофон устройства. Поднесите гитару ближе или подключите её через интерфейс. Работает и с акустикой, и с голосом.</p>`;
  let mic = null, raf = 0, hist = [], A4 = ref, okSince = 0, okStrings = new Set();
  const el = openLayer("Тюнер", html, { cc: "theory", onClose: () => { cancelAnimationFrame(raf); mic && mic.stop() } });
  const drawStr = () => { el.querySelector("#tstr").innerHTML = tuning().map((m, i) => `<button data-m="${m}" data-i="${i}">${nn(m)}<sub style="font-size:10px;opacity:.6">${octOf(m)}</sub></button>`).join("") };
  drawStr();
  el.querySelector("#tstr").onclick = e => { const b = e.target.closest("button"); if (!b) return; AU.init(); AU.pluck(+b.dataset.m, 0, .9, { tone: "clean" }) };
  el.querySelector(".ttun").onchange = e => { SET.tuning = e.target.value; saveSet(); drawStr() };
  el.querySelector("#tA4").oninput = e => { A4 = +e.target.value; e.target.nextElementSibling.textContent = A4 + " Гц"; LS.set("lad_a4", A4) };
  const loop = () => {
    const an = mic.an, buf = new Float32Array(an.fftSize); an.getFloatTimeDomainData(buf);
    const { f } = yin(buf, AU.ctx.sampleRate);
    if (f > 0) { hist.push(f); if (hist.length > 5) hist.shift() }
    else if (hist.length) hist.shift();
    if (hist.length >= 3) {
      const fm = hist.slice().sort((a, b) => a - b)[Math.floor(hist.length / 2)], midi = 69 + 12 * Math.log2(fm / A4), m = Math.round(midi), cents = Math.round((midi - m) * 100);
      const ok = Math.abs(cents) <= 4, tn = el.querySelector("#tn");
      tn.innerHTML = `${nn(m)}<sub>${octOf(m)}</sub>`; tn.classList.toggle("ok", ok);
      el.querySelector("#tc").textContent = (cents > 0 ? "+" : "") + cents + " центов · " + fm.toFixed(1) + " Гц" + (ok ? " · в строю" : cents < 0 ? " · подтяните" : " · ослабьте");
      const nd = el.querySelector("#tneedle"); nd.style.transform = `rotate(${clamp(cents, -50, 50) * 1.1}deg)`; nd.classList.toggle("ok", ok);
      const si = tuning().indexOf(m); $$("#tstr button", el).forEach(b => b.classList.toggle("on", +b.dataset.m === m && ok));
      if (ok && si >= 0) { if (!okSince) okSince = performance.now(); else if (performance.now() - okSince > 800 && !okStrings.has(si)) { okStrings.add(si); ST.use.tunerOk = Math.max(ST.use.tunerOk || 0, okStrings.size); saveState(); AU.ui("ok"); if (okStrings.size === tuning().length) { toast("Гитара настроена!"); checkAch() } } } else okSince = 0;
      practiceTick("tuner");
    } else if (!hist.length) { el.querySelector("#tn").textContent = "–"; el.querySelector("#tn").classList.remove("ok") }
    raf = setTimeout(() => requestAnimationFrame(loop), 40);
  };
  el.querySelector("#tOn").onclick = async e => {
    if (mic) { mic.stop(); mic = null; clearTimeout(raf); e.target.innerHTML = IC.mic + "Включить"; return }
    try { mic = await AU.mic(4096); e.target.innerHTML = IC.stop + "Выключить"; loop() }
    catch (er) { toast("Нет доступа к микрофону. Разрешите его в настройках Safari."); }
  };
}

/* ===================== reference ===================== */
function toolRef() {
  const st = { root: 9, kind: "scale", type: "mpenta" };
  const html = `<div class="chips scroll" id="rroots">${ROOTS.map(r => `<button class="chip" data-r="${r}">${nn(r)}</button>`).join("")}</div>
  <div class="ctrl">${segHTML("rkind", [["scale", "Гаммы"], ["chord", "Аккорды"], ["circle", "Квинтовый круг"]], st.kind)}</div>
  <div id="rbody"></div>`;
  const el = openLayer("Справочник", html, { wide: 1, cc: "styles" });
  const draw = () => {
    $$("#rroots .chip", el).forEach(c => c.classList.toggle("on", +c.dataset.r === st.root));
    el.querySelector("#rroots").style.display = st.kind === "circle" ? "none" : "";
    const b = el.querySelector("#rbody");
    if (st.kind === "circle") { b.innerHTML = circleHTML(); bindCircle(b); return }
    const isS = st.kind === "scale", list = isS ? SCALES : CHORDS;
    if (!(st.type in list)) st.type = isS ? "major" : "";
    const ivs = list[st.type].s, root = 48 + st.root, notes = ivs.map(i => root + i);
    const label = isS ? list[st.type].n : nn(st.root) + st.type + " — " + list[st.type].n;
    b.innerHTML = `<div class="chips" style="margin:6px 0 14px">${Object.entries(list).map(([k, s]) => `<button class="chip ${k === st.type ? "on" : ""}" data-t="${k}">${isS ? esc(s.n) : nn(st.root) + (k || "")}</button>`).join("")}</div>
    <div class="widget"><div class="wcap"><b>${esc(nn(st.root) + (isS ? " · " + label : "") + (isS ? "" : label.slice(nn(st.root).length)))}</b><span>${notes.map(n => nn(n)).join(" · ")}</span></div>
    <div class="ctrl" style="margin-top:0"><button class="btn primary sm" id="rplay">${IC.play}Слушать</button><span class="note" style="margin:0">Ступени: ${ivs.map(i => ivLabel(i) + (i >= 12 ? "" : "")).join(" ")}</span></div>
    ${keyboardHTML({ from: 48, to: 72, hl: notes.filter(n => n <= 72).concat(isS ? [root + 12] : []), root, labels: 2, small: 1 })}</div>
    <div class="widget" style="padding:10px">${fretboardHTML({ frets: 15, scale: { root: root, type: "__ref" }, labels: "note" })}</div>
    ${!isS && GCH[nn(st.root, { ru: 0, flat: st.root === 10 }) + st.type] ? `<div class="chords">${chordCardHTML(nn(st.root, { ru: 0, flat: st.root === 10 }) + st.type)}</div>` : ""}`;
    SCALES.__ref = { n: "", s: ivs.map(pcOf) };
    W.mount(b); delete SCALES.__ref;
    $$("[data-t]", b).forEach(c => c.onclick = () => { st.type = c.dataset.t; draw() });
    b.querySelector("#rplay").onclick = () => isS ? AU.play(notes.concat([root + 12]), { arp: 1, gap: .26 }) : (AU.play(notes, {}), setTimeout(() => AU.play(notes, { arp: 1, gap: .22 }), 900));
  };
  $$("#rroots .chip", el).forEach(c => c.onclick = () => { st.root = +c.dataset.r; draw() });
  bindSeg(el, "rkind", v => { st.kind = v; st.type = v === "scale" ? "mpenta" : ""; draw() });
  draw();
}
const CIRCLE = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
function circleHTML() {
  const R = 130, r2 = 88, c = 160; let g = "";
  CIRCLE.forEach((p, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2, x = c + Math.cos(a) * R, y = c + Math.sin(a) * R, x2 = c + Math.cos(a) * r2, y2 = c + Math.sin(a) * r2;
    const maj = nn(p, { ru: 0, flat: [5, 10, 3, 8, 1].includes(p) }), min = nn(p + 9, { ru: 0, flat: [5, 10, 3, 8, 1].includes(p) }) + "m";
    g += `<g class="ck" data-p="${p}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="24" fill="var(--surface-2)"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="17" font-weight="800" fill="var(--fg)">${maj}</text>
    <circle cx="${x2}" cy="${y2}" r="18" fill="var(--surface)"/><text x="${x2}" y="${y2 + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--muted)">${min}</text></g>`;
  });
  return `<div class="widget" style="text-align:center"><svg viewBox="0 0 320 320" style="max-width:380px;width:100%">${g}<text x="160" y="156" text-anchor="middle" font-size="12" fill="var(--muted)" font-weight="700">нажмите</text><text x="160" y="172" text-anchor="middle" font-size="12" fill="var(--muted)" font-weight="700">на тональность</text></svg><div id="cinfo" class="note"></div></div>`;
}
function bindCircle(b) {
  $$(".ck", b).forEach(g => g.onclick = () => {
    const p = +g.dataset.p, d = diatonic(p, false), flat = [5, 10, 3, 8, 1].includes(p);
    $$(".ck circle:first-child", b).forEach(c => c.setAttribute("fill", "var(--surface-2)")); g.querySelector("circle").setAttribute("fill", "var(--accent-soft)");
    const names = d.map(x => nn(x.root, { ru: 0, flat }) + (x.type === "dim" ? "dim" : x.type));
    const ks = SCALES.major.s.map(i => pcOf(p + i)).filter(x => [1, 3, 6, 8, 10].includes(x)).length;
    b.querySelector("#cinfo").innerHTML = `<b style="color:var(--fg);font-size:16px">${nn(p, { ru: 0, flat })} мажор · ${nn(p + 9, { ru: 0, flat })} минор</b><br>${ks ? ks + " " + plural(ks, "знак", "знака", "знаков") + (flat ? " (бемоли)" : " (диезы)") : "без знаков"}<div class="chips" style="justify-content:center;margin-top:10px">${names.map((n, i) => `<button class="chip" data-cn="${i}">${n} <small style="opacity:.6">${d[i].roman}</small></button>`).join("")}</div>`;
    $$("[data-cn]", b).forEach(c => c.onclick = () => { const x = d[+c.dataset.cn]; AU.play(chordMidis(x.root, x.type, x.root > 6 ? 36 : 48), {}) });
    AU.play(chordMidis(p, "", p > 6 ? 36 : 48), {});
  });
}
