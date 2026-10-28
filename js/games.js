"use strict";
/* games.js — тренировки: ритм-игра (1–3 дорожки), слух, ноты на грифе и клавиатуре,
   «держи темп», «повтори ритм», калибровка задержки, задание дня. */

/* ---------- level packs ---------- */
const RHY_LV = [
  { n: "Четверти", bpm: 70, bars: ["q q q q"] },
  { n: "Половинные", bpm: 75, bars: ["h q q", "q q h", "h h", "q h q"] },
  { n: "Восьмые", bpm: 75, bars: ["e e q e e q", "q e e q e e", "e e e e q q", "q q e e e e"] },
  { n: "Паузы", bpm: 80, bars: ["q qr q q", "er e q er e q", "q er e qr q", "e e qr e e qr"] },
  { n: "Точки", bpm: 80, bars: ["q. e q q", "q. e q. e", "h. q", "q q. e q"] },
  { n: "Синкопы", bpm: 85, bars: ["e q e q q", "q e q e q", "e q e e q e", "er e er e q q"] },
  { n: "Шестнадцатые", bpm: 70, bars: ["e s s e s s q q", "s s s s q s s s s q", "e s s q e s s q", "s s e s s e q q"] },
  { n: "Триоли", bpm: 70, bars: ["t t t q t t t q", "q t t t q q", "t t t t t t q q"] },
  { n: "Микс", bpm: 90, bars: ["e s s q. e q", "q e q e e s s", "t t t e e q q", "s s e er e q q"] },
  { n: "Быстро", bpm: 120, bars: ["e e q e e q", "q e q e q", "e s s e s s e e q", "q. e e e q"] }
];
const DRUM_LV = [
  { n: "Хэт и малый", bpm: 70, g: { hhc: "x-x-x-x-x-x-x-x-", snare: "----x-------x---" } },
  { n: "Базовый рок", bpm: 72, g: { hhc: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-------" } },
  { n: "Бочка на «и»", bpm: 78, g: { hhc: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-x-----" } },
  { n: "Диско", bpm: 96, g: { hhc: "--x---x---x---x-", snare: "----x-------x---", kick: "x---x---x---x---" } },
  { n: "Синкопы бочки", bpm: 82, g: { hhc: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-----x---x--x--" } },
  { n: "Халф-тайм", bpm: 80, g: { hhc: "x-x-x-x-x-x-x-x-", snare: "--------x-------", kick: "x-----x-------x-" } },
  { n: "Сбивка", bpm: 78, g: { hhc: "x-x-x-x-x-x-x-x-x-x-x-x---------", snare: "----x-------x-------x---xxxxxxxx", kick: "x-------x-------x-------x-------" } },
  { n: "Фанк", bpm: 86, g: { hhc: "x-x-x-x-x-x-x-x-", snare: "----x--x-x--x---", kick: "x-x-------x--x--" } },
  { n: "Панк", bpm: 150, g: { hhc: "x-x-x-x-x-x-x-x-", snare: "--x---x---x---x-", kick: "x---x---x---x---" } },
  { n: "Быстрый рок", bpm: 120, g: { hhc: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-x-----x-x-----" } }
];
const HAND_LV = [
  { n: "Одиночные", bpm: 70, div: 2, s: "RLRLRLRL" },
  { n: "Двойки", bpm: 70, div: 2, s: "RRLLRRLL" },
  { n: "Парадидл", bpm: 60, div: 2, s: "RLRRLRLL" },
  { n: "Одиночные 16-е", bpm: 72, div: 4, s: "RLRLRLRLRLRLRLRL" },
  { n: "Двойки 16-е", bpm: 70, div: 4, s: "RRLLRRLLRRLLRRLL" },
  { n: "Парадидл 16-е", bpm: 72, div: 4, s: "RLRRLRLLRLRRLRLL" },
  { n: "Триоли", bpm: 70, div: 3, s: "RLRLRLRLRLRL" },
  { n: "Двойной парадидл", bpm: 66, div: 3, s: "RLRLRRLRLRLL" },
  { n: "Быстрые одиночные", bpm: 100, div: 4, s: "RLRLRLRLRLRLRLRL" }
];
const LANES = {
  rhythm: { n: "Чтение ритма", lanes: [{ n: "Удар", d: "snare", c: "#FFC24B" }], lv: RHY_LV },
  drums: { n: "Барабанные биты", lanes: [{ n: "Бочка", d: "kick", c: "#FF7A66" }, { n: "Малый", d: "snare", c: "#FFC24B" }, { n: "Хэт", d: "hhc", c: "#3DD6A3" }], lv: DRUM_LV },
  hands: { n: "Руки: рудименты", lanes: [{ n: "Левая", d: "snare", c: "#5AB4FF" }, { n: "Правая", d: "snare", c: "#AA9CFF" }], lv: HAND_LV }
};
function barNotes(mode, L, barIdx) {
  if (mode === "rhythm" || mode === "custom") { const str = L.bars[barIdx % L.bars.length]; const tk = parseRhythm(str); const R = rhythmOnsets(tk); return { len: Math.max(4, Math.ceil(R.len / 4 - 1e-6) * 4), notes: R.hits.map(h => ({ t: h.t, lane: 0 })) } }
  if (mode === "drums") {
    const keys = { kick: 0, snare: 1, hhc: 2 }, n = Math.max(...Object.values(L.g).map(s => s.length)), bars = n / 16, b = barIdx % bars, out = [];
    for (const k in L.g) for (let i = b * 16; i < b * 16 + 16; i++) if ("xX".includes(L.g[k][i])) out.push({ t: (i - b * 16) / 4, lane: keys[k] });
    return { len: 4, notes: out };
  }
  const out = []; [...L.s].forEach((c, i) => out.push({ t: i / L.div, lane: c === "R" ? 1 : 0 })); return { len: L.s.length / L.div, notes: out };
}
const gkey = (mode, lv) => `lanes:${mode}:${lv}`;
function gameStars(acc) { return acc >= 95 ? 3 : acc >= 82 ? 2 : acc >= 60 ? 1 : 0 }

/* ---------- rhythm game ---------- */
function laneGame(mode, lvIdx, custom) {
  W.stopAll();
  const pack = mode === "custom" ? { n: "Простучать ритм", lanes: LANES.rhythm.lanes, lv: [custom] } : LANES[mode];
  const L = pack.lv[lvIdx], nl = pack.lanes.length, BARS = mode === "custom" ? 4 : (mode === "drums" && L.g.hhc.length > 16 ? 8 : 6);
  const opt = Object.assign({ click: 1, guide: 1, input: "touch", speed: 1 }, LS.get("lad_gopt", {}));
  const html = `<div class="ghud"><div><small>Очки</small><span class="sc" id="gSc">0</span></div><div style="text-align:center"><small>Точность</small><b id="gAcc">—</b></div><div style="text-align:right"><small>Комбо</small><b id="gCb">0</b></div></div>
  <div class="gwrap"><div class="lane-area" id="gArea"><canvas id="gCv"></canvas><div class="combo" id="gCombo"></div><div class="judg" id="gJ"></div><div class="count" id="gCount"></div></div>
  <div class="lane-btns" id="gBtns" style="grid-template-columns:repeat(${nl},1fr)">${pack.lanes.map((l, i) => `<button class="lane-btn" data-l="${i}" style="--pc:${l.c}"><i></i>${l.n}</button>`).join("")}</div></div>
  <div class="ctrl"><button class="btn primary grow" id="gGo">${IC.play}Начать · ${L.bpm} BPM</button></div>
  <div class="ctrl"><button class="chip ${opt.click ? "on" : ""}" data-o="click">Метроном</button><button class="chip ${opt.guide ? "on" : ""}" data-o="guide">Подсказка звуком</button>${nl === 1 ? `<button class="chip ${opt.input === "mic" ? "on" : ""}" data-o="mic">${IC.mic.replace("<svg", '<svg style="width:14px;height:14px;vertical-align:-2px"')} Микрофон</button>` : ""}<button class="chip" data-o="slow">Темп: ${opt.speed === 1 ? "100%" : Math.round(opt.speed * 100) + "%"}</button></div>
  <p class="note">${nl === 1 ? "Нажимайте на кнопку (или пробел), когда нота касается линии. В режиме «Микрофон» можно играть на настоящем инструменте." : "Клавиши: " + pack.lanes.map((l, i) => l.n + " — " + "asd"[i].toUpperCase()).join(", ") + "."} Задержку можно откалибровать в Тренировках.</p>`;
  let raf = 0, running = false, mic = null, micRaf = 0;
  const el = openLayer(pack.n + " · " + L.n, html, { onClose: () => { running = false; cancelAnimationFrame(raf); cancelAnimationFrame(micRaf); mic && mic.stop(); clk && clk.stop(); document.removeEventListener("keydown", kd) } });
  const cv = el.querySelector("#gCv"), cx = cv.getContext("2d"), area = el.querySelector("#gArea");
  let notes = [], t0 = 0, spb = 60 / L.bpm, clk = null, score = 0, combo = 0, maxCombo = 0, per = 0, good = 0, miss = 0, extra = 0, endT = 0, flashes = [];
  const saveOpt = () => LS.set("lad_gopt", opt);
  $$("[data-o]", el).forEach(b => b.onclick = () => {
    const k = b.dataset.o; if (running) return;
    if (k === "slow") { opt.speed = opt.speed === 1 ? .75 : opt.speed === .75 ? .5 : 1; b.textContent = "Темп: " + Math.round(opt.speed * 100) + "%" }
    else if (k === "mic") { opt.input = opt.input === "mic" ? "touch" : "mic"; b.classList.toggle("on", opt.input === "mic") }
    else { opt[k] = opt[k] ? 0 : 1; b.classList.toggle("on", !!opt[k]) }
    saveOpt(); el.querySelector("#gGo").innerHTML = IC.play + "Начать · " + Math.round(L.bpm * opt.speed) + " BPM";
  });
  el.querySelector("#gGo").innerHTML = IC.play + "Начать · " + Math.round(L.bpm * opt.speed) + " BPM";
  const LOOK = 1.7; // seconds visible
  const draw = () => {
    const w = cv.width = area.clientWidth * devicePixelRatio, h = cv.height = area.clientHeight * devicePixelRatio, dpr = devicePixelRatio;
    const hitY = h * .86, now = AU.now() - (AU.ctx.outputLatency || 0), lw = w / nl;
    cx.clearRect(0, 0, w, h);
    for (let i = 0; i < nl; i++) { cx.fillStyle = i % 2 ? "rgba(255,255,255,.02)" : "rgba(255,255,255,.04)"; cx.fillRect(i * lw, 0, lw, h) }
    // beat lines
    const bStart = Math.floor((now - t0) / spb), lineCol = getComputedStyle(document.documentElement).getPropertyValue("--line");
    for (let b = bStart - 1; b < bStart + 6; b++) { const tt = t0 + b * spb, y = hitY - (tt - now) / LOOK * hitY; if (y < 0 || y > h) continue; cx.fillStyle = lineCol; cx.fillRect(0, y, w, b % 4 === 0 ? 2 * dpr : 1 * dpr) }
    cx.fillStyle = accentHex(); cx.fillRect(0, hitY - 2 * dpr, w, 4 * dpr);
    for (const n of notes) {
      if (n.hit && n.hit !== "miss" && now - n.at > .25) continue;
      const y = hitY - (n.at - now) / LOOK * hitY; if (y < -40 || y > h + 40) continue;
      const col = pack.lanes[n.lane].c, x = n.lane * lw + lw * .14, ww = lw * .72, hh = 16 * dpr;
      cx.globalAlpha = n.hit === "miss" ? .25 : n.hit ? Math.max(0, 1 - (now - n.at) / .25) : 1;
      cx.fillStyle = col; roundRect(cx, x, y - hh / 2, ww, hh, 8 * dpr); cx.fill(); cx.globalAlpha = 1;
    }
    flashes = flashes.filter(f => now - f.t < .3);
    for (const f of flashes) { const a = 1 - (now - f.t) / .3; cx.globalAlpha = a * .5; cx.fillStyle = f.c; cx.fillRect(f.lane * lw, hitY - 30 * dpr, lw, 60 * dpr); cx.globalAlpha = 1 }
    // misses
    for (const n of notes) if (!n.hit && now - n.at > .11) { n.hit = "miss"; miss++; combo = 0; judge("Мимо", "var(--warn)"); hud() }
    if (running && now > endT) finish();
    if (running) raf = requestAnimationFrame(draw);
  };
  const roundRect = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath() };
  const judge = (t, col) => { const j = el.querySelector("#gJ"); j.textContent = t; j.style.color = col; j.classList.remove("show"); void j.offsetWidth; j.classList.add("show") };
  const hud = () => {
    const tot = per + good + miss; el.querySelector("#gSc").textContent = score; el.querySelector("#gCb").textContent = combo;
    el.querySelector("#gAcc").textContent = tot ? Math.round((per + good * .6) / tot * 100) + "%" : "—";
    el.querySelector("#gCombo").textContent = combo >= 10 ? combo + "×" : "";
  };
  const hit = (lane, tIn) => {
    if (!running) return;
    const t = tIn ?? (AU.now() - (AU.ctx.outputLatency || 0) - SET.latency / 1000);
    if (opt.input !== "mic") AU.drum(pack.lanes[lane].d, 0, .8);
    let best = null, bd = 1;
    for (const n of notes) { if (n.hit || n.lane !== lane) continue; const d = Math.abs(n.at - t); if (d < bd) { bd = d; best = n } }
    if (best && bd <= .11) {
      best.hit = bd <= .045 ? "p" : "g"; combo++; maxCombo = Math.max(maxCombo, combo);
      const mult = 1 + Math.min(3, Math.floor(combo / 10) * .5);
      if (best.hit === "p") { per++; score += Math.round(100 * mult); judge("Идеально", "var(--accent)") } else { good++; score += Math.round(50 * mult); judge(best.at > t ? "Рано" : "Поздно", "var(--gold)") }
      flashes.push({ lane, t: AU.now() - (AU.ctx.outputLatency || 0), c: pack.lanes[lane].c });
    } else { extra++; combo = 0; judge("Лишний", "var(--muted)") }
    hud();
  };
  const btns = el.querySelector("#gBtns");
  btns.addEventListener("pointerdown", e => { const b = e.target.closest(".lane-btn"); if (!b) return; e.preventDefault(); AU.init(); b.classList.add("dn"); setTimeout(() => b.classList.remove("dn"), 90); hit(+b.dataset.l) });
  const kd = e => { if (e.repeat) return; const k = e.key.toLowerCase(); let l = "asd".indexOf(k); if (l < 0) l = "jkl".indexOf(k); if (nl === 1 && (k === " " || k === "enter")) l = 0; if (l < 0 || l >= nl) return; e.preventDefault(); const b = btns.children[l]; b.classList.add("dn"); setTimeout(() => b.classList.remove("dn"), 90); hit(l) };
  document.addEventListener("keydown", kd);
  const startMic = async () => {
    mic = await AU.mic(1024); const buf = new Float32Array(1024); let avg = .01, last = 0;
    const loop = () => { mic.an.getFloatTimeDomainData(buf); let mx = 0, at = 0; for (let i = 0; i < buf.length; i++) { const a = Math.abs(buf[i]); if (a > mx) { mx = a; at = i } }
      const now = AU.now(); if (mx > Math.max(.08, avg * 4) && now - last > .09) { last = now; const t = now - (buf.length - at) / AU.ctx.sampleRate - SET.latency / 1000 - (AU.ctx.baseLatency || 0); hit(0, t) }
      avg = avg * .95 + mx * .05; micRaf = requestAnimationFrame(loop) };
    loop();
  };
  el.querySelector("#gGo").onclick = async () => {
    if (running) return; AU.init();
    if (opt.input === "mic" && nl === 1 && !mic) { try { await startMic() } catch (e) { toast("Нет доступа к микрофону"); opt.input = "touch"; saveOpt() } }
    spb = 60 / (L.bpm * opt.speed); score = combo = maxCombo = per = good = miss = extra = 0; hud();
    const lead = AU.now() + .3; t0 = lead + 4 * spb; notes = [];
    let beat = 0; for (let b = 0; b < BARS; b++) { const bn = barNotes(mode, L, b); bn.notes.forEach(n => notes.push({ at: t0 + (beat + n.t) * spb, lane: n.lane, beat: beat + n.t })); beat += bn.len }
    endT = t0 + beat * spb + .5; running = true;
    el.querySelector("#gGo").disabled = true;
    // count-in + clicks + guide
    const totalBeats = 4 + Math.ceil(beat);
    for (let i = 0; i < totalBeats; i++) { const tt = lead + i * spb; if (i < 4 || opt.click) AU.click(tt, i % 4 === 0 ? 2 : 1); if (i < 4) AU.at(tt, () => { el.querySelector("#gCount").innerHTML = `<span>${4 - i}</span>`; if (i === 3) setTimeout(() => el.querySelector("#gCount").innerHTML = "", spb * 900) }) }
    if (opt.guide && opt.input !== "mic") notes.forEach(n => AU.drum(pack.lanes[n.lane].d, n.at, mode === "drums" ? .35 : .3));
    practiceTick("game"); raf = requestAnimationFrame(draw);
    clk = { stop() {} };
  };
  const finish = () => {
    running = false; cancelAnimationFrame(raf); el.querySelector("#gGo").disabled = false;
    const tot = per + good + miss, acc = tot ? Math.round((per + good * .6) / tot * 100 - extra * 1.5) : 0, accC = Math.max(0, acc), stars = gameStars(accC);
    let xp = 3 + stars * 5;
    let rec = "";
    if (mode !== "custom") {
      const k = gkey(mode, lvIdx), g = ST.games[k] || {}; if (!g.stars && stars) xp += 10;
      if (score > (g.best || 0)) rec = "Новый рекорд!";
      ST.games[k] = { best: Math.max(g.best || 0, score), acc: Math.max(g.acc || 0, accC), stars: Math.max(g.stars || 0, stars), combo: Math.max(g.combo || 0, maxCombo), plays: (g.plays || 0) + 1 };
    } else { const g = ST.games["lanes:custom"] || {}; ST.games["lanes:custom"] = { combo: Math.max(g.combo || 0, maxCombo), plays: (g.plays || 0) + 1, acc: Math.max(g.acc || 0, accC) } }
    saveState(); dailyDone(mode === "custom" ? null : "lanes:" + mode, stars);
    const nextOk = mode !== "custom" && stars && pack.lv[lvIdx + 1];
    openSheet(`<div class="done" style="padding:10px 0"><div class="bigstars">${[0, 1, 2].map(i => `<span class="${i < stars ? "on" : ""}">${IC.star}</span>`).join("")}</div>
      <h2>${stars === 3 ? "Великолепно!" : stars === 2 ? "Хорошо!" : stars ? "Неплохо" : "Попробуйте медленнее"}</h2><p>${rec}</p>
      <div class="reward"><span>Точность ${accC}%</span><span>Комбо ${maxCombo}</span><span style="color:var(--gold)">+${xp} XP</span></div>
      <p class="note">Идеально ${per} · хорошо ${good} · мимо ${miss}${extra ? " · лишних " + extra : ""}</p>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="btn soft" style="flex:1" id="rAgain">Ещё раз</button>${nextOk ? `<button class="btn primary" style="flex:1" id="rNext">Следующий уровень</button>` : ""}</div></div>`);
    addXP(xp, el.querySelector("#gSc")); if (stars === 3) confetti(); sfx(stars ? "level" : "bad");
    $("#rAgain").onclick = () => { closeSheet(); el.querySelector("#gGo").click() };
    if (nextOk) $("#rNext").onclick = () => { closeSheet(); closeLayer(); setTimeout(() => laneGame(mode, lvIdx + 1), 60) };
  };
  draw();
}

/* ---------- ear training ---------- */
const EAR_SETS = [
  { id: "i1", n: "Интервалы: основа", d: "м3, б3, ч5, октава", mode: "int", set: [3, 4, 7, 12] },
  { id: "i2", n: "Интервалы: шире", d: "секунды, терции, кварта, квинта, секста", mode: "int", set: [2, 3, 4, 5, 7, 9] },
  { id: "i3", n: "Все интервалы", d: "от малой секунды до октавы", mode: "int", set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { id: "c1", n: "Мажор или минор", d: "самое важное различение", mode: "chord", set: ["", "m"] },
  { id: "c2", n: "Трезвучия", d: "мажор, минор, dim, aug, sus4", mode: "chord", set: ["", "m", "dim", "aug", "sus4"] },
  { id: "c3", n: "Септаккорды", d: "7, maj7, m7, m7♭5", mode: "chord", set: ["7", "maj7", "m7", "m7b5"] },
  { id: "m1", n: "Лады", d: "мажор, минор, дорийский, миксолидийский", mode: "scale", set: ["major", "minor", "dorian", "mixo"] },
  { id: "m2", n: "Все лады", d: "семь ладов и гармонический минор", mode: "scale", set: ["major", "dorian", "phryg", "lydian", "mixo", "minor", "locrian", "harm"] }
];
function earGame(cfg) {
  W.stopAll();
  const key = "ear:" + (cfg.id || cfg.mode + cfg.set.join("")), N = 10, opt = Object.assign({ dir: "up" }, LS.get("lad_earopt", {}));
  const label = v => cfg.mode === "int" ? INTERVALS[v][2] : cfg.mode === "chord" ? (v === "" ? "Мажор" : v === "m" ? "Минор" : CHORDS[v].n + " (" + v + ")") : SCALES[v].n;
  const short = v => cfg.mode === "int" ? INTERVALS[v][1] : cfg.mode === "chord" ? (v || "maj") : SCALES[v].n.split(" ")[0];
  const html = `<div class="qprog" id="eP">${Array.from({ length: N }, () => "<i></i>").join("")}</div>
  <button class="playq" id="ePlay" aria-label="Повторить">${IC.play}</button>
  <p class="note" style="text-align:center;margin:0 0 18px">Слушайте и выберите ответ</p>
  <div class="opts ${cfg.set.length > 4 ? "grid" : ""}" id="eOpts"></div><div id="eFb"></div>
  ${cfg.mode === "int" ? `<div class="ctrl" style="justify-content:center;margin-top:20px">${segHTML("edir", [["up", "Вверх"], ["down", "Вниз"], ["harm", "Вместе"], ["mix", "Микс"]], opt.dir)}</div>` : ""}`;
  const el = openLayer(cfg.n || "Слух", html, { cc: "theory" });
  let i = 0, ok = 0, cur = null, root = 60, streakN = 0, locked = false, dirNow = "up";
  bindSeg(el, "edir", v => { opt.dir = v; LS.set("lad_earopt", opt) });
  const play = () => {
    AU.init();
    if (cfg.mode === "int") { const a = root, b = root + cur; if (dirNow === "harm") AU.play([a, b], { dur: 1.4 }); else AU.play(dirNow === "down" ? [b, a] : [a, b], { arp: 1, gap: .6 }) }
    else if (cfg.mode === "chord") { const ns = CHORDS[cur].s.map(x => root + x); AU.play(ns, { dur: 1.6 }); setTimeout(() => AU.play(ns, { arp: 1, gap: .25 }), 1300) }
    else { const ns = SCALES[cur].s.map(x => root + x).concat([root + 12]); AU.play([root - 12, root - 5], { dur: 2.6 }); AU.play(ns, { arp: 1, gap: .3 }) }
  };
  const next = () => {
    if (i >= N) return end();
    locked = false; cur = pick(cfg.set); root = 52 + rnd(14); dirNow = opt.dir === "mix" ? pick(["up", "down", "harm"]) : opt.dir;
    $$("#eP i", el).forEach((d, j) => d.classList.toggle("cur", j === i));
    el.querySelector("#eFb").innerHTML = "";
    el.querySelector("#eOpts").innerHTML = cfg.set.map(v => `<button class="opt" data-v="${v}">${esc(cfg.mode === "chord" && cfg.set.length > 4 ? short(v) : label(v))}</button>`).join("");
    $$("#eOpts .opt", el).forEach(b => b.onclick = () => answer(b));
    setTimeout(play, 250);
  };
  const answer = b => {
    if (locked) return; locked = true; const v = cfg.mode === "int" ? +b.dataset.v : b.dataset.v, right = v === cur;
    const dot = $$("#eP i", el)[i]; dot.classList.remove("cur"); dot.classList.add(right ? "ok" : "bad");
    if (right) { ok++; streakN++; b.classList.add("ok"); sfx("ok"); addXP(2, b) } else { streakN = 0; b.classList.add("bad"); $$("#eOpts .opt", el).find(x => (cfg.mode === "int" ? +x.dataset.v : x.dataset.v) === cur).classList.add("ok"); sfx("bad") }
    const g = ST.games[key] || {}; g.streak = Math.max(g.streak || 0, streakN); ST.games[key] = g; ST.quiz.all++; if (right) ST.quiz.ok++; saveState();
    el.querySelector("#eFb").innerHTML = `<div class="fb ${right ? "ok" : "bad"}"><b>${right ? "Верно!" : "Это " + esc(label(cur))}</b>${cfg.mode === "int" ? esc(INTERVALS[cur][3]) : ""}<div style="display:flex;gap:8px;margin-top:10px"><button class="btn soft sm" id="eRe">Ещё раз</button><button class="btn primary sm" id="eNx" style="flex:1">Дальше</button></div></div>`;
    el.querySelector("#eRe").onclick = play; el.querySelector("#eNx").onclick = () => { i++; next() };
    practiceTick("game");
  };
  const end = () => {
    const stars = ok >= 10 ? 3 : ok >= 8 ? 2 : ok >= 6 ? 1 : 0, g = ST.games[key] || {}; let xp = stars * 5 + (!g.stars && stars ? 10 : 0);
    ST.games[key] = Object.assign(g, { best: Math.max(g.best || 0, ok), stars: Math.max(g.stars || 0, stars), plays: (g.plays || 0) + 1 }); saveState(); dailyDone("ear", stars);
    el.querySelector(".page").innerHTML = `<div class="done"><div class="bigstars">${[0, 1, 2].map(j => `<span class="${j < stars ? "on" : ""}">${IC.star}</span>`).join("")}</div><h2>${ok} из ${N}</h2><p>${stars === 3 ? "Отличный слух!" : stars ? "Хороший результат" : "Тренируйтесь по 5 минут в день — слух растёт быстро"}</p><div class="reward"><span style="color:var(--gold)">+${xp} XP</span><span>Рекорд ${ST.games[key].best}/${N}</span></div><button class="btn primary block" id="eAg">Ещё раунд</button></div>`;
    if (xp) addXP(xp, el.querySelector(".bigstars")); if (stars === 3) confetti();
    el.querySelector("#eAg").onclick = () => { closeLayer(); setTimeout(() => earGame(cfg), 60) };
  };
  el.querySelector("#ePlay").onclick = play;
  next();
}

/* ---------- note finding (fretboard / keyboard) ---------- */
function fretNoteGame(cfg) {
  W.stopAll(); cfg = Object.assign({ strings: [0, 1, 2, 3, 4, 5], max: 12 }, cfg);
  const key = "fret:" + cfg.strings.join("") + ":" + cfg.max, DUR = 60;
  const html = `<div class="ghud"><div><small>Верно</small><span class="sc" id="fS">0</span></div><div style="text-align:right"><small>Время</small><b id="fT">${DUR}</b></div></div>
  <div class="widget" style="padding:10px" id="fFb"></div>
  <p class="note" style="text-align:center">Какая нота отмечена?</p>
  <div class="opts grid4" id="fOpts">${[...Array(12).keys()].map(p => `<button class="opt" data-p="${p}" style="padding:14px 6px">${nn(p)}</button>`).join("")}</div>
  <div class="ctrl"><button class="btn primary grow" id="fGo">${IC.play}Начать на 60 секунд</button></div>`;
  let timer = 0;
  const el = openLayer("Ноты на грифе", html, { cc: "guitar", onClose: () => clearInterval(timer) });
  let fb = null, cur = null, sc = 0, wrong = 0, left = DUR, on = false;
  el.querySelector("#fFb").innerHTML = fretboardHTML({ frets: Math.min(15, cfg.max + 1), small: 1, silent: 0, ref: w => fb = w });
  W.mount(el.querySelector("#fFb"));
  const nextQ = () => { let s, f; do { s = pick(cfg.strings); f = rnd(cfg.max + 1) } while (cur && cur.s === s && cur.f === f); cur = { s, f, m: tuning()[s] + f }; fb._draw([{ s, f, l: "?", c: "var(--gold)" }]) };
  $$("#fOpts .opt", el).forEach(b => b.onclick = () => {
    if (!on) return; const p = +b.dataset.p;
    if (p === pcOf(cur.m)) { sc++; b.classList.add("ok"); AU.init(); AU.pluck(cur.m, 0, .8, { tone: "clean" }); setTimeout(() => b.classList.remove("ok"), 300); el.querySelector("#fS").textContent = sc; nextQ() }
    else { wrong++; b.classList.add("bad"); sfx("bad"); setTimeout(() => b.classList.remove("bad"), 400); fb._draw([{ s: cur.s, f: cur.f, l: nn(cur.m), c: "var(--warn)" }]); setTimeout(() => on && nextQ(), 700) }
  });
  el.querySelector("#fGo").onclick = () => {
    if (on) return; on = true; sc = wrong = 0; left = DUR; el.querySelector("#fS").textContent = 0; el.querySelector("#fGo").disabled = true; nextQ();
    timer = setInterval(() => { left--; el.querySelector("#fT").textContent = left; practiceTick("game"); if (left <= 0) { clearInterval(timer); on = false; noteGameEnd(el, key, sc, wrong, "#fGo") } }, 1000);
  };
}
function keyNoteGame() {
  W.stopAll(); const key = "keys:find", DUR = 60;
  const html = `<div class="ghud"><div><small>Верно</small><span class="sc" id="kS">0</span></div><div style="text-align:right"><small>Время</small><b id="kT">${DUR}</b></div></div>
  <div style="text-align:center;margin:10px 0 16px"><div class="tnote" id="kN" style="font-size:72px">?</div><p class="note" id="kH">Нажмите эту ноту на клавиатуре</p></div>
  <div id="kK"></div><div class="ctrl"><button class="btn primary grow" id="kGo">${IC.play}Начать на 60 секунд</button></div>`;
  let timer = 0; const el = openLayer("Ноты на клавиатуре", html, { cc: "keys", onClose: () => clearInterval(timer) });
  let cur = null, sc = 0, wrong = 0, left = DUR, on = false;
  el.querySelector("#kK").innerHTML = keyboardHTML({ from: 48, to: 71, labels: 0, down: m => { AU.init(); const v = AU.noteOn(m, 0, .7, "piano"); if (on) { if (pcOf(m) === cur) { sc++; el.querySelector("#kS").textContent = sc; nextQ() } else { wrong++; sfx("bad"); el.querySelector("#kN").animate([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "none" }], { duration: 250 }) } } return () => v && v.stop() } });
  W.mount(el.querySelector("#kK"));
  const nextQ = () => { let p; do p = rnd(12); while (p === cur); cur = p; el.querySelector("#kN").textContent = nn(p) };
  el.querySelector("#kGo").onclick = () => {
    if (on) return; on = true; sc = wrong = 0; left = DUR; el.querySelector("#kS").textContent = 0; el.querySelector("#kGo").disabled = true; nextQ();
    timer = setInterval(() => { left--; el.querySelector("#kT").textContent = left; practiceTick("game"); if (left <= 0) { clearInterval(timer); on = false; noteGameEnd(el, key, sc, wrong, "#kGo") } }, 1000);
  };
}
function noteGameEnd(el, key, sc, wrong, btn) {
  const stars = sc >= 24 ? 3 : sc >= 15 ? 2 : sc >= 8 ? 1 : 0, g = ST.games[key] || {}; const xp = 3 + stars * 4 + (!g.stars && stars ? 10 : 0);
  const rec = sc > (g.best || 0);
  ST.games[key] = { best: Math.max(g.best || 0, sc), stars: Math.max(g.stars || 0, stars), plays: (g.plays || 0) + 1, streak: g.streak }; saveState(); dailyDone("notes", stars);
  openSheet(`<div class="done" style="padding:10px 0"><div class="bigstars">${[0, 1, 2].map(j => `<span class="${j < stars ? "on" : ""}">${IC.star}</span>`).join("")}</div><h2>${sc} ${plural(sc, "нота", "ноты", "нот")} за минуту</h2><p>${rec ? "Новый рекорд!" : "Рекорд: " + ST.games[key].best}${wrong ? " · ошибок " + wrong : ""}</p><div class="reward"><span style="color:var(--gold)">+${xp} XP</span></div><button class="btn primary block" id="ngA">Ещё раз</button></div>`);
  addXP(xp); if (stars === 3) confetti();
  el.querySelector(btn).disabled = false;
  $("#ngA").onclick = () => { closeSheet(); el.querySelector(btn).click() };
}

/* ---------- hold the tempo ---------- */
function tempoGame(bpm) {
  W.stopAll(); bpm = bpm || 90; const key = "tempo";
  const html = `<div style="text-align:center"><div class="bpm" id="tbV" style="font-size:56px">${bpm}</div><p class="note" id="tPh">4 такта с метрономом, потом 4 такта тишины — продолжайте стучать ровно</p></div>
  <div class="tapzone" id="tZ">Стучите здесь</div><div class="tline" id="tL"></div><div id="tR"></div>
  <div class="ctrl"><button class="rnd" id="tm">${IC.minus}</button><button class="btn primary grow" id="tGo">${IC.play}Начать</button><button class="rnd" id="tp">${IC.plus}</button></div>`;
  const el = openLayer("Держи темп", html, { cc: "rhythm" });
  let taps = [], t0 = 0, on = false, spb = 0, endT = 0;
  const setB = v => { bpm = clamp(v, 40, 220); el.querySelector("#tbV").textContent = bpm };
  el.querySelector("#tm").onclick = () => !on && setB(bpm - 5); el.querySelector("#tp").onclick = () => !on && setB(bpm + 5);
  const z = el.querySelector("#tZ");
  z.addEventListener("pointerdown", e => { e.preventDefault(); AU.init(); z.classList.add("dn"); setTimeout(() => z.classList.remove("dn"), 80); AU.drum("rim", 0, .6); if (on) taps.push(AU.now() - (AU.ctx.outputLatency || 0) - SET.latency / 1000) });
  el.querySelector("#tGo").onclick = () => {
    if (on) return; AU.init(); on = true; taps = []; spb = 60 / bpm; t0 = AU.now() + .3; endT = t0 + 32 * spb;
    for (let i = 0; i < 16; i++) AU.click(t0 + i * spb, i % 4 === 0 ? 2 : 1);
    AU.at(t0 + 16 * spb - .05, () => { el.querySelector("#tPh").textContent = "Тишина — держите темп!"; z.style.background = "var(--accent-soft)" });
    AU.click(endT, 2);
    el.querySelector("#tPh").textContent = "Стучите вместе с метрономом"; el.querySelector("#tGo").disabled = true;
    AU.at(endT + .3, done);
  };
  const done = () => {
    on = false; z.style.background = ""; el.querySelector("#tGo").disabled = false; el.querySelector("#tPh").textContent = "Готово";
    const beats = []; for (let i = 16; i < 32; i++) beats.push(t0 + i * spb);
    const silent = taps.filter(t => t > t0 + 15.5 * spb && t < endT + spb / 2);
    const errs = beats.map(b => { let best = null; for (const t of silent) if (best == null || Math.abs(t - b) < Math.abs(best - b)) best = t; return best != null && Math.abs(best - b) < spb / 2 ? best - b : null });
    const got = errs.filter(e => e != null), mean = got.length ? got.reduce((a, b) => a + Math.abs(b), 0) / got.length * 1000 : 999;
    const drift = got.length > 3 ? (got.slice(-4).reduce((a, b) => a + b, 0) / 4 - got.slice(0, 4).reduce((a, b) => a + b, 0) / 4) * 1000 : 0;
    const cover = got.length / beats.length, stars = cover < .6 ? 0 : mean < 25 ? 3 : mean < 45 ? 2 : mean < 80 ? 1 : 0;
    const L = el.querySelector("#tL"), span = endT - (t0 + 16 * spb);
    L.innerHTML = beats.map(b => `<span class="beatl" style="left:${(b - t0 - 16 * spb) / span * 100}%"></span>`).join("") + silent.map(t => { const p = (t - t0 - 16 * spb) / span * 100; return p >= -2 && p <= 102 ? `<i class="u ${Math.abs(((t - t0) / spb) % 1 - .5) < .3 ? "bad" : ""}" style="left:${clamp(p, 0, 100)}%"></i>` : "" }).join("");
    const g = ST.games[key] || {}; const xp = 3 + stars * 5 + (!g.stars && stars ? 10 : 0);
    ST.games[key] = { best: g.best ? Math.min(g.best, Math.round(mean)) : Math.round(mean), stars: Math.max(g.stars || 0, stars), plays: (g.plays || 0) + 1 }; saveState(); dailyDone("tempo", stars);
    el.querySelector("#tR").innerHTML = `<div class="panel" style="padding:16px;margin-top:6px"><div class="bigstars" style="margin:0 0 8px">${[0, 1, 2].map(j => `<span class="${j < stars ? "on" : ""}">${IC.star}</span>`).join("")}</div>
    <p style="text-align:center;font-weight:800">${got.length ? `Среднее отклонение ${Math.round(mean)} мс` : "Не хватило ударов в тишине"}</p>
    <p class="note" style="text-align:center">${Math.abs(drift) > 25 ? (drift < 0 ? "Вы ускорялись в тишине — частая привычка. Расслабьтесь и думайте о долях «в глубине»." : "Вы замедлялись в тишине. Держите энергию до конца такта.") : got.length ? "Темп почти не уплывал. Отлично!" : ""} Попаданий ${got.length}/16. <span style="color:var(--gold)">+${xp} XP</span></p></div>`;
    addXP(xp); practiceTick("game");
  };
}

/* ---------- call & response ---------- */
function repeatGame() {
  W.stopAll(); const key = "repeat";
  const lvOpt = Object.assign({ d: 1 }, LS.get("lad_rep", {}));
  const pools = [RHY_LV.slice(0, 4), RHY_LV.slice(2, 7), RHY_LV.slice(5)];
  const html = `<div class="ctrl" style="justify-content:center">${segHTML("rlv", [[0, "Лёгкий"], [1, "Средний"], [2, "Сложный"]], lvOpt.d)}</div>
  <div style="text-align:center"><p class="note" id="rPh">Сначала слушайте такт, потом повторите его</p><div class="rnot" id="rNot" style="justify-content:center;min-height:70px"></div></div>
  <div class="tapzone" id="rZ">Стучите здесь</div><div class="tline" id="rL"></div>
  <div class="qprog" id="rP">${Array.from({ length: 6 }, () => "<i></i>").join("")}</div>
  <div class="ctrl"><button class="btn primary grow" id="rGo">${IC.play}Начать</button></div>`;
  const el = openLayer("Повтори ритм", html, { cc: "rhythm" });
  bindSeg(el, "rlv", v => { lvOpt.d = +v; LS.set("lad_rep", lvOpt) });
  let taps = [], on = false, round = 0, total = 0;
  const z = el.querySelector("#rZ");
  z.addEventListener("pointerdown", e => { e.preventDefault(); AU.init(); z.classList.add("dn"); setTimeout(() => z.classList.remove("dn"), 80); AU.drum("snare", 0, .7); if (on) taps.push(AU.now() - (AU.ctx.outputLatency || 0) - SET.latency / 1000) });
  const doRound = () => {
    if (round >= 6) return finish();
    const lv = pick(pools[lvOpt.d]), bar = pick(lv.bars), tk = parseRhythm(bar), R = rhythmOnsets(tk), bpm = lv.bpm, spb = 60 / bpm;
    el.querySelector("#rNot").innerHTML = rhythmSVG(tk, { bars: false });
    $$("#rP i", el).forEach((d, j) => d.classList.toggle("cur", j === round));
    const t0 = AU.now() + .25;
    for (let i = 0; i < 12; i++) AU.click(t0 + i * spb, i % 4 === 0 ? 2 : i < 4 ? 1 : 0);
    R.hits.forEach(h => AU.drum("rim", t0 + (4 + h.t) * spb, .9));
    el.querySelector("#rPh").textContent = "Слушайте…"; z.style.background = "";
    AU.at(t0 + 8 * spb - .1, () => { el.querySelector("#rPh").textContent = "Ваша очередь!"; z.style.background = "var(--accent-soft)" });
    taps = []; on = true;
    AU.at(t0 + 12 * spb + .15, () => {
      on = false; z.style.background = "";
      const start = t0 + 8 * spb, exp = R.hits.map(h => start + h.t * spb), used = new Set(); let hit = 0;
      exp.forEach(t => { let bi = -1, bd = .12; taps.forEach((u, j) => { if (!used.has(j) && Math.abs(u - t) < bd) { bd = Math.abs(u - t); bi = j } }); if (bi >= 0) { used.add(bi); hit++ } });
      const extra = taps.filter((u, j) => !used.has(j) && u > start - .1 && u < start + 4 * spb).length, ok = hit === exp.length && extra === 0;
      el.querySelector("#rL").innerHTML = exp.map(t => `<i class="t" style="left:${(t - start) / (4 * spb) * 100}%"></i>`).join("") + taps.map((u, j) => { const p = (u - start) / (4 * spb) * 100; return p > -3 && p < 103 ? `<i class="u ${used.has(j) ? "" : "bad"}" style="left:${clamp(p, 0, 100)}%"></i>` : "" }).join("");
      const d = $$("#rP i", el)[round]; d.classList.remove("cur"); d.classList.add(ok ? "ok" : "bad");
      if (ok) { total++; sfx("ok"); addXP(2, z) } else sfx("bad");
      el.querySelector("#rPh").textContent = ok ? "Точно!" : `Попаданий ${hit} из ${exp.length}${extra ? ", лишних " + extra : ""}`;
      round++; setTimeout(doRound, 1400); practiceTick("game");
    });
  };
  const finish = () => {
    const stars = total >= 6 ? 3 : total >= 4 ? 2 : total >= 2 ? 1 : 0, g = ST.games[key] || {}, xp = stars * 5 + (!g.stars && stars ? 10 : 0);
    ST.games[key] = { best: Math.max(g.best || 0, total), stars: Math.max(g.stars || 0, stars), plays: (g.plays || 0) + 1 }; saveState(); dailyDone("repeat", stars);
    el.querySelector("#rPh").textContent = `Итог: ${total} из 6`; el.querySelector("#rGo").disabled = false; el.querySelector("#rGo").innerHTML = IC.refresh + "Ещё раз";
    if (xp) addXP(xp); if (stars === 3) confetti();
  };
  el.querySelector("#rGo").onclick = () => { AU.init(); round = 0; total = 0; $$("#rP i", el).forEach(d => d.className = ""); el.querySelector("#rGo").disabled = true; doRound() };
}

/* ---------- latency calibration ---------- */
function calibrate() {
  W.stopAll();
  const html = `<p class="lead">Стучите по большой кнопке точно вместе с кликами. Приложение измерит задержку экрана и звука на вашем устройстве и учтёт её в играх.</p>
  <div class="tapzone" id="cZ" style="margin-top:18px">Стучите в такт</div><p class="note" id="cR" style="text-align:center">Сейчас: ${SET.latency} мс</p>
  <div class="ctrl"><button class="btn primary grow" id="cGo">${IC.play}Начать (16 кликов)</button><button class="btn soft" id="c0">Сбросить</button></div>`;
  const el = openLayer("Калибровка задержки", html);
  let taps = [], on = false;
  const z = el.querySelector("#cZ");
  z.addEventListener("pointerdown", e => { e.preventDefault(); AU.init(); z.classList.add("dn"); setTimeout(() => z.classList.remove("dn"), 80); if (on) taps.push(AU.now() - (AU.ctx.outputLatency || 0)) });
  el.querySelector("#c0").onclick = () => { SET.latency = 0; saveSet(); el.querySelector("#cR").textContent = "Сейчас: 0 мс" };
  el.querySelector("#cGo").onclick = () => {
    if (on) return; AU.init(); on = true; taps = []; const spb = .6, t0 = AU.now() + .4, beats = [];
    for (let i = 0; i < 20; i++) { AU.click(t0 + i * spb, i < 4 ? 1 : 2); if (i >= 4) beats.push(t0 + i * spb) }
    AU.at(t0 + 20 * spb + .2, () => {
      on = false; const offs = [];
      beats.forEach(b => { let best = null; taps.forEach(t => { if (Math.abs(t - b) < .25 && (best == null || Math.abs(t - b) < Math.abs(best - b))) best = t }); if (best != null) offs.push(best - b) });
      if (offs.length < 8) { el.querySelector("#cR").textContent = "Мало ударов — попробуйте ещё раз"; return }
      offs.sort((a, b) => a - b); const med = Math.round(offs[Math.floor(offs.length / 2)] * 1000);
      SET.latency = clamp(med, -150, 300); saveSet(); el.querySelector("#cR").textContent = `Задержка: ${SET.latency} мс — сохранено`; toast("Калибровка сохранена");
    });
  };
}

/* ---------- daily challenge ---------- */
const DAILY = [
  { n: "Ритм-игра: Восьмые", k: "lanes:rhythm", run: () => laneGame("rhythm", 2) },
  { n: "Слух: мажор или минор", k: "ear", run: () => earGame(EAR_SETS[3]) },
  { n: "Ноты на 6 и 5 струне", k: "notes", run: () => fretNoteGame({ strings: [0, 1], max: 12 }) },
  { n: "Держи темп 90 BPM", k: "tempo", run: () => tempoGame(90) },
  { n: "Барабаны: базовый рок", k: "lanes:drums", run: () => laneGame("drums", 1) },
  { n: "Слух: интервалы", k: "ear", run: () => earGame(EAR_SETS[0]) },
  { n: "Повтори ритм", k: "repeat", run: () => repeatGame() },
  { n: "Руки: парадидл", k: "lanes:hands", run: () => laneGame("hands", 2) },
  { n: "Ноты на клавиатуре", k: "notes", run: () => keyNoteGame() },
  { n: "Ритм-игра: Синкопы", k: "lanes:rhythm", run: () => laneGame("rhythm", 5) }
];
function dailyToday() { const d = new Date(), n = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate(); return DAILY[n % DAILY.length] }
function dailyDone(k, stars) {
  const D = dailyToday(); ST.daily = ST.daily || {};
  if (!k || ST.daily[today()] || D.k !== k || !stars) return;
  ST.daily[today()] = 1; saveState(); setTimeout(() => { toast("Задание дня выполнено! +30 XP"); addXP(30); confetti() }, 1600);
}

/* launcher from rhythm widgets */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-tapgame]"); if (!b) return;
  laneGame("custom", 0, { n: "Ритм из урока", bpm: +b.dataset.bpm || 80, bars: [b.dataset.tapgame] });
});
