"use strict";
/* widgets.js — интерактивные блоки: клавиатура, гриф, аккордовые схемы, грув, ритмическая запись,
   табулатура, гармонические последовательности. Каждый виджет: html-строка + mount() после вставки. */

const W = {
  _id: 0, _reg: {}, _stops: [],
  id() { return "w" + (++this._id) },
  reg(id, fn) { this._reg[id] = fn; return id },
  mount(root) { for (const el of $$("[data-wid]", root)) { const f = this._reg[el.dataset.wid]; if (f && !el._m) { el._m = 1; try { f(el) } catch (e) { console.error(e) } delete this._reg[el.dataset.wid] } } },
  onStop(fn) { this._stops.push(fn) },
  stopAll() { const s = this._stops; this._stops = []; s.forEach(f => { try { f() } catch (e) {} }) }
};

/* ======================== piano keyboard ======================== */
function keyboardHTML(o) {
  o = Object.assign({ from: 48, to: 72, hl: [], root: null, labels: SET.keyLabels, kw: null, kh: null }, o);
  const id = W.id(); const hl = new Set(o.hl.map(x => x)), hlPc = o.hlPc ? new Set(o.hlPc) : null;
  let wi = 0, keys = ""; let TW = 0; for (let m = o.from; m <= o.to; m++) if (!isBlack(m)) TW++;
  const kw = o.kw || SET.keyW;
  for (let m = o.from; m <= o.to; m++) {
    const on = hl.has(m) || (hlPc && hlPc.has(pcOf(m))), root = o.root != null && pcOf(m) === pcOf(o.root) && on;
    const lab = o.labels === 2 || (o.labels === 1 && pcOf(m) === 0) ? nn(m, { oct: pcOf(m) === 0 && o.labels === 1 }) : "";
    if (!isBlack(m)) { keys += `<div class="wk ${on ? "hl" : ""} ${root ? "root" : ""} ${pcOf(m) === 0 ? "cmark" : ""}" data-m="${m}">${lab}</div>`; wi++ }
    else keys += `<div class="bk ${on ? "hl" : ""} ${root ? "root" : ""}" data-m="${m}" style="left:calc(${(wi / TW * 100).toFixed(3)}% - ${(31 / TW).toFixed(3)}%);width:${(62 / TW).toFixed(3)}%">${o.labels === 2 ? nn(m) : ""}</div>`;
  }
  W.reg(id, el => mountKeyboard(el, o));
  return `<div class="kbdwrap" data-wid="${id}"><div class="kbd" style="--kw:${kw}px;--kh:${o.kh || (o.small ? 130 : SET.keyH)}px;min-width:${wi * (kw + 2)}px">${keys}</div></div>`;
}
function mountKeyboard(wrap, o) {
  const kbd = wrap.firstElementChild, act = new Map();
  const press = m => { const el = kbd.querySelector(`[data-m="${m}"]`); el && el.classList.add("dn"); if (o.onNote) o.onNote(m); practiceTick("synth");
    if (o.down) return o.down(m); AU.init(); const v = AU.noteOn(m, 0, .8, o.preset); return () => v && v.stop() };
  const release = (pid) => { const a = act.get(pid); if (!a) return; act.delete(pid); const still = [...act.values()].some(x => x.m === a.m); if (!still) { const el = kbd.querySelector(`[data-m="${a.m}"]`); el && el.classList.remove("dn") } a.off && a.off() };
  const keyAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest && el.closest(".kbd") === kbd && el.dataset.m ? +el.dataset.m : null };
  kbd.addEventListener("pointerdown", e => { const m = keyAt(e.clientX, e.clientY); if (m == null) return; e.preventDefault(); try { kbd.setPointerCapture(e.pointerId) } catch (er) {} act.set(e.pointerId, { m, off: press(m) }) });
  kbd.addEventListener("pointermove", e => { const a = act.get(e.pointerId); if (!a) return; const m = keyAt(e.clientX, e.clientY); if (m != null && m !== a.m) { release(e.pointerId); act.set(e.pointerId, { m, off: press(m) }) } });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => kbd.addEventListener(ev, e => release(e.pointerId)));
  wrap._press = (m, dur) => { const el = kbd.querySelector(`[data-m="${m}"]`); if (el) { el.classList.add("dn"); setTimeout(() => el.classList.remove("dn"), (dur || .3) * 1000) } };
  wrap._hl = (set, root) => { for (const k of kbd.children) { const m = +k.dataset.m; const on = set.has(m) || set.has("pc" + pcOf(m)); k.classList.toggle("hl", on); k.classList.toggle("root", on && root != null && pcOf(m) === pcOf(root)) } };
  // center on first highlighted / middle C
  requestAnimationFrame(() => { const f = kbd.querySelector(".hl") || kbd.querySelector(`[data-m="60"]`); if (f && wrap.scrollWidth > wrap.clientWidth) wrap.scrollLeft = Math.max(0, f.offsetLeft - wrap.clientWidth / 3) });
  if (o.ref) o.ref(wrap);
}

/* ======================== fretboard ======================== */
function fretboardHTML(o) {
  o = Object.assign({ frets: SET.frets, marks: [], scale: null, labels: "note", lefty: SET.lefty, tun: null, start: 0, small: false }, o);
  const id = W.id(); const tun = o.tun || tuning();
  const nF = o.frets, sp = o.small ? 24 : 28, top = 18, H = top * 2 + sp * 5 + 4, nutW = 30;
  const fw = []; let x = nutW; const xs = [0];
  for (let f = 1; f <= nFFix(nF); f++) { const w = (o.small ? 52 : 62) * Math.pow(.972, f - 1); fw.push(w); xs.push(x + w); x += w }
  const Wd = x + 12, X = v => o.lefty ? Wd - v : v;
  const cx = f => f === 0 ? X(nutW / 2 - 2) : X((xs[f - 1] + xs[f]) / 2 + (f === 1 ? 0 : 0));
  const sy = s => top + (5 - s) * sp; // s: 0 = low E (bottom), 5 = high E (top)
  let g = `<rect class="wood" x="${o.lefty ? 0 : nutW}" y="${top - 6}" width="${Wd - nutW}" height="${sp * 5 + 12}" rx="4"/>`;
  [3, 5, 7, 9, 15, 17, 19, 21].forEach(f => { if (f <= nF) g += `<circle class="inlay" cx="${cx(f)}" cy="${top + sp * 2.5}" r="5"/>` });
  if (nF >= 12) g += `<circle class="inlay" cx="${cx(12)}" cy="${top + sp * 1.5}" r="5"/><circle class="inlay" cx="${cx(12)}" cy="${top + sp * 3.5}" r="5"/>`;
  g += `<rect class="nut" x="${X(nutW) - (o.lefty ? 0 : 5)}" y="${top - 6}" width="5" height="${sp * 5 + 12}"/>`;
  for (let f = 1; f <= nF; f++) g += `<line class="fret" x1="${X(xs[f])}" x2="${X(xs[f])}" y1="${top - 6}" y2="${top + sp * 5 + 6}" stroke-width="2"/>`;
  for (let s = 0; s < 6; s++) g += `<line class="str" x1="${X(nutW)}" x2="${X(Wd)}" y1="${sy(s)}" y2="${sy(s)}" stroke-width="${(2.6 - s * .32).toFixed(2)}"/>`;
  // string labels
  for (let s = 0; s < 6; s++) g += `<text x="${o.lefty ? Wd - 6 : 6}" y="${sy(s) + 4}" fill="var(--faint)" text-anchor="${o.lefty ? "end" : "start"}">${nn(tun[s])}</text>`;
  for (let f = 1; f <= nF; f++) if ([3, 5, 7, 9, 12, 15].includes(f)) g += `<text x="${cx(f)}" y="${H - 2}" fill="var(--faint)" text-anchor="middle">${f}</text>`;
  // cells
  let cells = "";
  for (let s = 0; s < 6; s++) for (let f = 0; f <= nF; f++) { const x0 = f === 0 ? (o.lefty ? Wd - nutW : 0) : Math.min(X(xs[f - 1]), X(xs[f])), w = f === 0 ? nutW : fw[f - 1]; cells += `<rect class="cell" data-s="${s}" data-f="${f}" x="${x0}" y="${sy(s) - sp / 2}" width="${w}" height="${sp}"/>` }
  W.reg(id, el => mountFret(el, o, { cx, sy, tun }));
  return `<div class="fbwrap" data-wid="${id}"><svg class="fb-svg" width="${Wd}" height="${H}" viewBox="0 0 ${Wd} ${H}">${g}<g class="marks"></g>${cells}<g class="fx"></g></svg></div>`;
}
const nFFix = n => n;
function mountFret(wrap, o, geo) {
  const svg = wrap.firstElementChild, mk = svg.querySelector(".marks"), fx = svg.querySelector(".fx");
  const draw = (marks) => {
    let h = "";
    for (const m of marks) {
      const x = geo.cx(m.f), y = geo.sy(m.s), col = m.c || (m.root ? "var(--warn)" : "var(--accent)");
      h += `<g class="dot"><circle cx="${x}" cy="${y}" r="${m.f === 0 ? 9 : 11}" fill="${m.ghost ? "none" : col}" stroke="${col}" stroke-width="${m.ghost ? 2 : 0}" opacity="${m.dim ? .35 : 1}"/>${m.l != null ? `<text x="${x}" y="${y + 4}" text-anchor="middle" fill="${m.ghost ? col : "#0B0D0E"}">${esc(m.l)}</text>` : ""}</g>`;
    }
    mk.innerHTML = h;
    if (marks.length === 1 && wrap.scrollWidth > wrap.clientWidth) { const x = geo.cx(marks[0].f); wrap.scrollTo({ left: Math.max(0, x - wrap.clientWidth / 2), behavior: "smooth" }) }
  };
  const scaleMarks = (root, type, lab) => {
    const sc = (SCALES[type] || SCALES.major).s, out = [];
    for (let s = 0; s < 6; s++) for (let f = o.start || 0; f <= o.frets; f++) { const m = geo.tun[s] + f, iv = pcOf(m - root); if (sc.includes(iv)) out.push({ s, f, root: iv === 0, l: lab === "int" ? ivLabel(iv) : lab === "none" ? null : nn(m) }) }
    return out;
  };
  let marks = o.marks.slice(); if (o.scale) marks = marks.concat(scaleMarks(o.scale.root, o.scale.type, o.labels));
  draw(marks);
  const flash = (s, f, col) => { const c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); c.setAttribute("cx", geo.cx(f)); c.setAttribute("cy", geo.sy(s)); c.setAttribute("r", 16); c.setAttribute("fill", "none"); c.setAttribute("stroke", col || "var(--fg)"); c.setAttribute("stroke-width", 2); c.classList.add("flash"); fx.appendChild(c); setTimeout(() => c.remove(), 500) };
  svg.addEventListener("pointerdown", e => {
    const c = e.target.closest(".cell"); if (!c) return; e.preventDefault();
    const s = +c.dataset.s, f = +c.dataset.f, m = geo.tun[s] + f;
    AU.init(); if (!o.silent) AU.pluck(m, 0, .9, { tone: o.tone }); flash(s, f); practiceTick("guitar");
    o.onNote && o.onNote(m, s, f);
  });
  wrap._draw = draw; wrap._flash = flash; wrap._scale = scaleMarks; wrap._geo = geo;
  if (o.ref) o.ref(wrap);
}
const ivLabel = iv => ["1", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"][pcOf(iv)];

/* ======================== chord diagram ======================== */
function chordSVG(name, small) {
  const sh = GCH[name]; if (!sh) return "";
  const fr = sh.f.filter(f => f > 0), minF = Math.min(...fr, 99), maxF = Math.max(...fr, 0);
  const base = maxF > 4 ? minF : 1, rows = 5, w = 84, h = 104, l = 14, t = 20, dx = (w - l * 2) / 5, dy = 15;
  let g = "";
  if (base === 1) g += `<rect x="${l - 1}" y="${t - 3}" width="${dx * 5 + 2}" height="4" rx="1" fill="var(--fg)"/>`;
  else g += `<text x="${l - 4}" y="${t + dy * .7}" font-size="10" text-anchor="end" fill="var(--muted)" font-weight="800">${base}</text>`;
  for (let i = 0; i <= rows; i++) g += `<line x1="${l}" x2="${l + dx * 5}" y1="${t + i * dy}" y2="${t + i * dy}" stroke="var(--faint)" stroke-width="1.2"/>`;
  for (let s = 0; s < 6; s++) g += `<line x1="${l + s * dx}" x2="${l + s * dx}" y1="${t}" y2="${t + rows * dy}" stroke="var(--muted)" stroke-width="${1.6 - s * .12}"/>`;
  if (sh.b) { const ss = sh.f.map((f, i) => f === sh.b ? i : -1).filter(i => i >= 0); const a = Math.min(...ss), b = Math.max(...ss); g += `<rect x="${l + a * dx - 5}" y="${t + (sh.b - base + .5) * dy - 5}" width="${(b - a) * dx + 10}" height="10" rx="5" fill="var(--accent)"/>` }
  sh.f.forEach((f, s) => {
    const x = l + s * dx;
    if (f < 0) g += `<text x="${x}" y="${t - 7}" font-size="10" text-anchor="middle" fill="var(--faint)" font-weight="800">×</text>`;
    else if (f === 0) g += `<circle cx="${x}" cy="${t - 10}" r="3.5" fill="none" stroke="var(--muted)" stroke-width="1.4"/>`;
    else if (!(sh.b && f === sh.b && sh.f.filter(v => v === sh.b).length > 1 && sh.g[s] === 1)) { const y = t + (f - base + .5) * dy; g += `<circle cx="${x}" cy="${y}" r="5.6" fill="var(--accent)"/>${sh.g[s] ? `<text x="${x}" y="${y + 3.4}" font-size="8.5" text-anchor="middle" fill="var(--accent-ink)" font-weight="800">${sh.g[s]}</text>` : ""}` }
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="${small ? 72 : w}">${g}</svg>`;
}
function chordCardHTML(name) { return `<button class="chordc" data-gch="${esc(name)}"><b>${esc(name)}</b>${chordSVG(name)}</button>` }
document.addEventListener("click", e => {
  const b = e.target.closest("[data-gch]"); if (!b) return; AU.init(); const sh = GCH[b.dataset.gch]; if (!sh) return;
  AU.strum(shapeMidis(sh), 0, { speed: .022, tone: b.dataset.tone || SET.gtone }); practiceTick("guitar");
  b.classList.add("on"); setTimeout(() => b.classList.remove("on"), 500);
});
/* simple "play these notes" chips: data-notes="60,64,67" data-arp */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-notes]"); if (!b) return; e.preventDefault();
  const ns = b.dataset.notes.split(",").map(Number); AU.play(ns, { arp: "arp" in b.dataset, inst: b.dataset.inst || "keys", gap: +b.dataset.gap || undefined, tone: b.dataset.tone, preset: b.dataset.preset, dur: b.dataset.preset ? 1.4 : undefined });
  b.animate([{ transform: "scale(.92)" }, { transform: "scale(1)" }], { duration: 250, easing: "ease-out" });
});
document.addEventListener("click", e => { const b = e.target.closest("[data-shape]"); if (!b) return; AU.init(); const f = b.dataset.shape.split(",").map(Number); AU.strum(f.map((x, s) => x < 0 ? null : tuning()[s] + x).filter(x => x != null), 0, { speed: .02 }); practiceTick("guitar"); b.classList.add("on"); setTimeout(() => b.classList.remove("on"), 500) });
document.addEventListener("click", e => { const b = e.target.closest("[data-dseq]"); if (!b) return; AU.init(); const t = AU.now() + .03; b.dataset.dseq.split(",").forEach(x => { const [n, d, v] = x.split("@"); AU.drum(n, t + +d, +v) }); b.animate([{ transform: "scale(.92)" }, { transform: "scale(1)" }], { duration: 220 }) });
document.addEventListener("click", e => { const b = e.target.closest("[data-drum]"); if (!b) return; AU.init(); AU.drum(b.dataset.drum); b.animate([{ transform: "scale(.9)" }, { transform: "scale(1)" }], { duration: 200 }) });

/* ======================== groove (drum pattern) ======================== */
/* pattern: { bpm, div, swing, bars, tracks: { kick: "x---x---", ... } }  x hit, X accent, g ghost, - rest */
const GROOVE_ORDER = ["crash", "ride", "hho", "hhc", "tom1", "tom2", "tom3", "snare", "rim", "clap", "cow", "kick"];
function grooveHTML(p, o) {
  o = o || {}; const id = W.id(); const tr = GROOVE_ORDER.filter(k => p.tracks[k]);
  const n = Math.max(...tr.map(k => p.tracks[k].replace(/\s/g, "").length));
  let rows = tr.map(k => { const s = p.tracks[k].replace(/\s/g, ""); let r = `<div class="r" style="--pc:${AU.DRUMS[k].c};--n:${n}"><span>${AU.DRUMS[k].n}</span>`; for (let i = 0; i < n; i++) { const c = s[i] || "-"; r += `<i class="${c === "x" || c === "X" ? "on" : c === "g" ? "g" : ""}" data-i="${i}"></i>` } return r + "</div>" }).join("");
  W.reg(id, el => mountGroove(el, p, tr, n, o));
  return `<div class="widget" data-wid="${id}"><div class="wcap"><b>${esc(o.title || p.name || "Грув")}</b><span class="gbpm">${p.bpm} BPM${p.swing ? " · свинг" : ""}</span></div><div class="mini-seq">${rows}</div>
  <div class="ctrl"><button class="btn primary sm gplay">${IC.play}Слушать</button><div class="range grow"><input type="range" min="50" max="200" value="${p.bpm}" class="gtempo" aria-label="Темп"><output>${p.bpm}</output></div></div></div>`;
}
function grooveSteps(p) { const tr = Object.keys(p.tracks); const n = Math.max(...tr.map(k => p.tracks[k].replace(/\s/g, "").length)); return { tr, n, get: (k, i) => (p.tracks[k].replace(/\s/g, "")[i] || "-") } }
function playGrooveStep(p, i, t, vol) {
  const G = grooveSteps(p);
  for (const k of G.tr) { const c = G.get(k, i % G.n); if (c === "x" || c === "X" || c === "g") AU.drum(k, t, (c === "X" ? 1 : c === "g" ? .28 : .78) * (vol ?? 1)) }
}
function mountGroove(el, p, tr, n, o) {
  const btn = el.querySelector(".gplay"), rng = el.querySelector(".gtempo"), out = el.querySelector("output");
  let bpm = p.bpm; const cells = $$(".r i", el);
  const clk = new Clock({ bpm, div: p.div || 4, swing: p.swing || 0, onStep: (st, t) => {
    const i = st % n; playGrooveStep(p, i, t);
    if (o.bass) { const b = o.bass[i % o.bass.length]; if (b != null) AU.note(b, t, clk.stepDur * .9, .9, "bass") }
    AU.at(t, () => { cells.forEach(c => c.classList.toggle("cur", +c.dataset.i === i)) }); practiceTick("drums");
  } });
  const stop = () => { clk.stop(); btn.innerHTML = IC.play + "Слушать"; cells.forEach(c => c.classList.remove("cur")) };
  btn.onclick = () => { if (clk.running) stop(); else { W.stopAll(); clk.bpm = bpm; clk.start(); btn.innerHTML = IC.stop + "Стоп"; W.onStop(stop) } };
  rng.oninput = () => { bpm = +rng.value; out.textContent = bpm; clk.bpm = bpm };
}

/* ======================== rhythm notation ======================== */
function rhythmSVG(tokens, o) {
  o = o || {}; const unit = o.unit || 34, y = 40, H = 62; let x = 10, beat = 0, svg = "", i = 0, ni = 0;
  const wOf = k => Math.max(26, unit * Math.sqrt(k.d) * 1.15) + (k.dot ? 8 : 0);
  // group beams: consecutive non-rest e/s/t notes in the same beat
  const items = tokens.map(k => { const it = { k, x: 0, b0: Math.floor(beat + 1e-6), start: beat }; beat += k.d; return it });
  let bar = 0;
  items.forEach((it, idx) => { it.x = x + 8; x += wOf(it.k); const nb = it.start + it.k.d; if (o.bars !== false && Math.abs(nb % 4) < 1e-6 && idx < items.length - 1) { it.bar = x - 2; x += 8 } });
  const groups = []; let cur = null;
  items.forEach(it => { const k = it.k, beamable = !k.rest && (k.k === "e" || k.k === "s" || k.k === "t"); if (beamable && cur && cur.b0 === it.b0 && cur.k === (k.k === "t" ? "t" : "es")) cur.items.push(it); else { cur = beamable ? { b0: it.b0, k: k.k === "t" ? "t" : "es", items: [it] } : null; if (cur) groups.push(cur) } });
  const stemTop = y - 30;
  items.forEach((it, idx) => {
    const k = it.k, X = it.x, cls = `n${idx}`;
    if (k.rest) {
      if (k.k === "w") svg += `<rect class="${cls}" x="${X - 7}" y="${y - 12}" width="14" height="5" fill="currentColor"/>`;
      else if (k.k === "h") svg += `<rect class="${cls}" x="${X - 7}" y="${y - 7}" width="14" height="5" fill="currentColor"/>`;
      else if (k.k === "q") svg += `<path class="${cls}" d="M${X - 3} ${y - 22}l6 7-5 5 6 7c-5-2-8 0-5 4-6-3-5-8 0-8l-6-6 5-5z" fill="currentColor"/>`;
      else svg += `<g class="${cls}" fill="currentColor"><circle cx="${X - 3}" cy="${y - 12}" r="2.6"/><path d="M${X - 3} ${y - 10}q5 1 7-3l-5 14h-2l4-11" /> ${k.k === "s" ? `<circle cx="${X - 5}" cy="${y - 5}" r="2.4"/>` : ""}</g>`;
    } else {
      const filled = k.k !== "w" && k.k !== "h";
      svg += `<ellipse class="${cls} hd" cx="${X}" cy="${y}" rx="6.4" ry="4.6" transform="rotate(-20 ${X} ${y})" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="${filled ? 0 : 1.8}"/>`;
      if (k.k !== "w") svg += `<line class="${cls}" x1="${X + 5.6}" x2="${X + 5.6}" y1="${y - 2}" y2="${stemTop}" stroke="currentColor" stroke-width="1.6"/>`;
      if (k.dot) svg += `<circle class="${cls}" cx="${X + 12}" cy="${y}" r="2" fill="currentColor"/>`;
      if (k.acc) svg += `<path d="M${X - 6} ${stemTop - 12}l11 4-11 4" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
      it.note = ni++;
    }
    if (it.bar) svg += `<line x1="${it.bar}" x2="${it.bar}" y1="${y - 16}" y2="${y + 16}" stroke="var(--faint)" stroke-width="1.4"/>`;
  });
  // beams / flags
  for (const gp of groups) {
    const its = gp.items, sx = it => it.x + 5.6;
    if (its.length === 1) { const it = its[0]; const fl = it.k.k === "s" ? 2 : 1; for (let f = 0; f < fl; f++) svg += `<path d="M${sx(it)} ${stemTop + f * 7}q9 6 6 16" fill="none" stroke="currentColor" stroke-width="2"/>`; continue }
    svg += `<rect x="${sx(its[0]) - .8}" y="${stemTop}" width="${sx(its[its.length - 1]) - sx(its[0]) + 1.6}" height="4.5" fill="currentColor"/>`;
    for (let j = 0; j < its.length; j++) if (its[j].k.k === "s") { const a = its[j], nb = its[j + 1] && its[j + 1].k.k === "s" ? its[j + 1] : null, pb = its[j - 1] && its[j - 1].k.k === "s" ? its[j - 1] : null; if (nb) svg += `<rect x="${sx(a) - .8}" y="${stemTop + 7}" width="${sx(nb) - sx(a) + 1.6}" height="4.5" fill="currentColor"/>`; else if (!pb) { const dir = j === its.length - 1 ? -8 : 8; svg += `<rect x="${Math.min(sx(a), sx(a) + dir)}" y="${stemTop + 7}" width="8" height="4.5" fill="currentColor"/>` } }
    if (gp.k === "t") svg += `<text x="${(sx(its[0]) + sx(its[its.length - 1])) / 2}" y="${stemTop - 6}" font-size="11" font-weight="800" text-anchor="middle" fill="currentColor">3</text>`;
  }
  svg = `<line x1="0" x2="${x + 6}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1.2"/>` + svg;
  return `<svg width="${x + 8}" height="${H}" viewBox="0 0 ${x + 8} ${H}" style="color:var(--fg)">${svg}</svg>`;
}
function rhythmHTML(str, o) {
  o = o || {}; const id = W.id(), tokens = parseRhythm(str);
  W.reg(id, el => {
    const btn = el.querySelector(".rplay"), svg = el.querySelector("svg"); let playing = false, to = [];
    const stop = () => { playing = false; to.forEach(clearTimeout); to = []; btn.innerHTML = IC.play + "Слушать"; $$(".hit", svg).forEach(n => n.classList.remove("hit")) };
    btn.onclick = () => {
      if (playing) return stop(); W.stopAll(); AU.init(); playing = true; btn.innerHTML = IC.stop + "Стоп"; W.onStop(stop);
      const bpm = o.bpm || 80, bd = 60 / bpm, t0 = AU.now() + .1, R = rhythmOnsets(tokens), loops = o.loops || 2, count = o.count !== false ? 4 : 0;
      for (let b = 0; b < count; b++) AU.click(t0 + b * bd, b === 0 ? 2 : 1);
      const start = t0 + count * bd;
      for (let L = 0; L < loops; L++) {
        const tl = start + L * R.len * bd;
        for (let b = 0; b < R.len; b++) AU.click(tl + b * bd, 0);
        let ni = 0;
        tokens.forEach((k, idx) => { });
        let acc = 0;
        tokens.forEach((k, idx) => { const t = tl + acc * bd; acc += k.d; if (k.rest) return; AU.drum(o.drum || "snare", t, k.acc ? 1 : .7); to.push(AU.at(t, () => { $$(".hit", svg).forEach(n => n.classList.remove("hit")); $$(".n" + idx, svg).forEach(n => n.classList.add("hit")) })) });
      }
      to.push(AU.at(start + loops * R.len * bd + .2, stop));
    };
  });
  return `<div class="widget" data-wid="${id}"><div class="wcap"><b>${esc(o.title || "Ритм")}</b><span>${o.bpm || 80} BPM${o.caption ? " · " + esc(o.caption) : ""}</span></div><div class="rnot">${rhythmSVG(tokens, o)}</div><div class="ctrl"><button class="btn primary sm rplay">${IC.play}Слушать</button>${o.tap !== false ? `<button class="btn soft sm" data-tapgame="${esc(str)}" data-bpm="${o.bpm || 80}">${IC.tap}Простучать</button>` : ""}</div></div>`;
}

/* ======================== chord progression ======================== */
function progHTML(chords, o) {
  o = o || {}; const id = W.id();
  W.reg(id, el => {
    const btn = el.querySelector(".pplay"), chips = $$(".chip", el); let clk = null, inst = o.inst || "keys";
    $$(".seg button", el).forEach(b => b.onclick = () => { inst = b.dataset.i; $$(".seg button", el).forEach(x => x.classList.toggle("on", x === b)) });
    const playChord = (c, t, dur) => { const ns = chordKeys(c, 48); if (inst === "guitar") { const sh = GCH[c] || GCH[c.replace(/7$/, "")]; AU.strum(sh ? shapeMidis(sh) : ns.map(n => n - 12 + (n < 52 ? 12 : 0)), t, { speed: .02 }); setTimeout(() => {}, 0) } else ns.forEach(n => AU.note(n, t, dur * .95, .65, "epiano")); AU.note(ns[0] - 12, t, dur * .9, .7, "bass") };
    const stop = () => { clk && clk.stop(); btn.innerHTML = IC.play + "Слушать"; chips.forEach(c => c.classList.remove("on")) };
    btn.onclick = () => {
      if (clk && clk.running) return stop(); W.stopAll(); const bpm = o.bpm || 90, beats = o.beats || 4;
      clk = new Clock({ bpm, div: 1, onStep: (st, t) => { const ci = Math.floor(st / beats) % chords.length; if (st % beats === 0) { playChord(chords[ci], t, beats * 60 / bpm); AU.at(t, () => chips.forEach((c, i) => c.classList.toggle("on", i === ci))) } if (o.drums !== false) { AU.drum(st % 2 ? "snare" : "kick", t, .5); AU.drum("hhc", t, .35) } if (st >= chords.length * beats * (o.loops || 2)) { AU.at(t, stop); clk.stop() } } });
      clk.start(); btn.innerHTML = IC.stop + "Стоп"; W.onStop(stop);
    };
    chips.forEach((c, i) => c.onclick = () => { AU.init(); playChord(chords[i], AU.now() + .02, 1.6) });
  });
  return `<div class="widget" data-wid="${id}"><div class="wcap"><b>${esc(o.title || "Последовательность")}</b><span>${o.key ? esc(o.key) : ""}</span></div><div class="chips">${chords.map((c, i) => `<button class="chip">${esc(c)}${o.roman ? `<small style="opacity:.6;margin-left:6px">${o.roman[i]}</small>` : ""}</button>`).join("")}</div>
  <div class="ctrl"><button class="btn primary sm pplay">${IC.play}Слушать</button><div class="seg" style="flex:0 1 220px"><button data-i="keys" class="${(o.inst || "keys") === "keys" ? "on" : ""}">Клавиши</button><button data-i="guitar" class="${o.inst === "guitar" ? "on" : ""}">Гитара</button></div></div></div>`;
}

/* ======================== guitar tab ======================== */
/* notes: [[string(1=high e..6=low E), fret, beats, opts]] */
function tabHTML(notes, o) {
  o = o || {}; const id = W.id(), cw = 30; let x = 26, cols = [];
  notes.forEach(n => { cols.push(x); x += Math.max(cw, cw * (n[2] || .5) * 1.6) });
  const H = 6 * 16 + 14, lab = ["e", "B", "G", "D", "A", "E"];
  let g = ""; for (let s = 0; s < 6; s++) { g += `<line x1="18" x2="${x}" y1="${10 + s * 16}" y2="${10 + s * 16}" stroke="var(--line)"/><text x="4" y="${14 + s * 16}" font-size="11" font-weight="800" fill="var(--faint)">${lab[s]}</text>` }
  notes.forEach((n, i) => { const [s, f, , op] = n; const ss = [].concat(s), ff = [].concat(f); ss.forEach((st, j) => { const y = 10 + (st - 1) * 16; g += `<rect class="t${i}" x="${cols[i] - 9}" y="${y - 8}" width="18" height="16" rx="4" fill="var(--surface)"/><text class="t${i}" x="${cols[i]}" y="${y + 4}" font-size="12" font-weight="800" text-anchor="middle" fill="currentColor">${ff[j] ?? ff[0]}${op && op.b ? "b" : ""}${op && op.h ? "h" : ""}${op && op.p ? "p" : ""}${op && op.v ? "~" : ""}${op && op.m ? "" : ""}</text>` }); if (op && op.m) g += `<text x="${cols[i]}" y="${H}" font-size="9" font-weight="800" text-anchor="middle" fill="var(--muted)">PM</text>` });
  W.reg(id, el => {
    const btn = el.querySelector(".tplay"), svg = el.querySelector("svg"); let to = [], playing = false;
    const stop = () => { playing = false; to.forEach(clearTimeout); to = []; btn.innerHTML = IC.play + "Слушать"; $$("rect", svg).forEach(r => r.setAttribute("fill", "var(--surface)")) };
    btn.onclick = () => {
      if (playing) return stop(); W.stopAll(); AU.init(); playing = true; btn.innerHTML = IC.stop + "Стоп"; W.onStop(stop);
      const bd = 60 / (o.bpm || 90), tun = TUNINGS.std.s; let t = AU.now() + .1;
      notes.forEach((n, i) => {
        const [s, f, d, op] = n; const ss = [].concat(s), ff = [].concat(f);
        ss.forEach((st, j) => { const fr = ff[j] ?? ff[0]; const m = tun[6 - st] + fr; AU.pluck(m, t + j * (op && op.strum ? .015 : 0), .9, { tone: o.tone || SET.gtone, mute: op && op.m, bend: op && op.b ? (op.b === true ? 1 : op.b) : 0, vib: op && op.v ? 1 : 0, slideFrom: op && op.sl != null ? tun[6 - st] + op.sl : null, dur: op && op.m ? .2 : (d || .5) * bd * (op && (op.b || op.v) ? 2.2 : 1.05) }) });
        const tt = t; to.push(AU.at(tt, () => { $$("rect", svg).forEach(r => r.setAttribute("fill", r.classList.contains("t" + i) ? "var(--accent-soft)" : "var(--surface)")) }));
        t += (d || .5) * bd;
      });
      to.push(AU.at(t + .4, stop)); practiceTick("guitar");
    };
  });
  return `<div class="widget" data-wid="${id}"><div class="wcap"><b>${esc(o.title || "Табулатура")}</b><span>${o.bpm || 90} BPM</span></div><div class="fbwrap"><svg width="${x + 10}" height="${H + 4}" style="color:var(--fg)">${g}</svg></div><div class="ctrl"><button class="btn primary sm tplay">${IC.play}Слушать</button><span class="note" style="margin:0">${o.caption ? esc(o.caption) : ""}</span></div></div>`;
}

/* ======================== synth demo (one parameter) ======================== */
function synthDemoHTML(o) {
  const id = W.id();
  W.reg(id, el => {
    const btn = el.querySelector(".sdplay"); let v = null, timer = null;
    const P = Object.assign({}, AU.PRESETS[o.base || "lead"]);
    const sl = $$("input", el);
    const apply = () => sl.forEach(s => { P[s.dataset.k] = +s.value; s.nextElementSibling.textContent = s.dataset.fmt === "s" ? (+s.value).toFixed(2) + " с" : s.dataset.fmt === "hz" ? Math.round(s.value) + " Гц" : s.value });
    sl.forEach(s => s.oninput = apply); apply();
    const stop = () => { clearInterval(timer); timer = null; btn.innerHTML = IC.play + "Слушать"; v && v.stop(); v = null };
    btn.onclick = () => {
      if (timer) return stop(); W.stopAll(); AU.init(); btn.innerHTML = IC.stop + "Стоп"; W.onStop(stop);
      const seq = o.seq || [48, 55, 60, 63]; let i = 0;
      const nx = () => { v && v.stop(); const name = "__demo"; AU.PRESETS[name] = Object.assign({}, P); v = AU.noteOn(seq[i++ % seq.length], 0, .8, name) };
      nx(); timer = setInterval(nx, o.gap || 700);
    };
  });
  return `<div class="widget" data-wid="${id}"><div class="wcap"><b>${esc(o.title || "Попробуйте")}</b><span>Двигайте ползунки во время звучания</span></div>
  <div class="knobs">${o.params.map(p => `<div class="kn"><label>${esc(p.n)}</label><input type="range" data-k="${p.k}" data-fmt="${p.fmt || ""}" min="${p.min}" max="${p.max}" step="${p.step || 1}" value="${p.v}"><output style="font-size:12px;font-weight:800"></output></div>`).join("")}</div>
  <div class="ctrl"><button class="btn primary sm sdplay">${IC.play}Слушать</button></div></div>`;
}
