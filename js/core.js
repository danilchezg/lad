"use strict";
/* Лад — уроки и практика: гитара, барабаны, клавиши, теория, ритм.
   core.js: помощники, иконки, настройки и темы, прогресс, опыт, достижения, слои и шторка. */

const $ = s => document.querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { toast("Память устройства заполнена") } }
};
const DAY = 864e5;
const dkey = t => { const d = new Date(t); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") };
const today = () => dkey(Date.now());
const plural = (n, a, b, c) => { n = Math.abs(n) % 100; const n1 = n % 10; if (n > 10 && n < 20) return c; if (n1 > 1 && n1 < 5) return b; if (n1 == 1) return a; return c };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]] } return a };

const S = (d, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC = {
  back: S('<path d="M15 5l-7 7 7 7"/>', 2.2),
  close: S('<path d="M6 6l12 12M18 6L6 18"/>', 2.2),
  chev: S('<path d="M9 5l7 7-7 7"/>'),
  check: S('<path d="M5 12.5l4.5 4.5L19 7"/>', 2.8),
  lock: S('<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4.5" height="14" rx="1.5"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.5"/></svg>',
  fire: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3.5 5 5.5 5 10.5A5 5 0 0 1 12 18a5 5 0 0 1-5-5.5c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-9z" opacity=".9"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/></svg>',
  sound: S('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  bulb: S('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
  info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  spark: S('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>'),
  share: S('<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
  down: S('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>'),
  gear: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', 1.8),
  minus: S('<path d="M5 12h14"/>', 2.4), plus: S('<path d="M12 5v14M5 12h14"/>', 2.4),
  refresh: S('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  trash: S('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  ear: S('<path d="M6 9a6 6 0 1 1 12 0c0 4-4 5-4 9a3 3 0 0 1-6 0"/><path d="M10 9a2 2 0 1 1 4 0c0 1.5-2 2-2 3.5"/>'),
  tap: S('<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M12 10.5V9a1.5 1.5 0 0 1 3 0v2M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.8-2.4L4 15a1.6 1.6 0 0 1 2.5-2L9 15"/>'),
  mic: S('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  trophy: S('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
  target: S('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  chat: S('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'),
  // instruments & courses
  guitar: S('<path d="M19.5 2.5l2 2-3.5 3.5-2-2z"/><path d="M16 6l-5.2 5.2"/><path d="M11.3 9.7a4 4 0 0 0-4.3-.5c-1.1.5-1.5 1.7-2.6 2.2-1.6.7-3 2.4-2.1 4.8.9 2.4 3.3 4.2 5.6 3.6 2.3-.6 2.6-2.2 3.2-3.2.6-1 1.8-1.5 2.2-2.6a4 4 0 0 0-.4-4.3"/><circle cx="8.6" cy="15.4" r="1.4"/>', 1.8),
  drums: S('<ellipse cx="12" cy="9" rx="8" ry="3"/><path d="M4 9v6c0 1.7 3.6 3 8 3s8-1.3 8-3V9"/><path d="M4 12l8 6 8-6"/><path d="M15 2l-2 5M9 2l2 5"/>', 1.8),
  keys: S('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M7 5v9M12 5v9M17 5v9M7 14v5M12 14v5M17 14v5"/><path d="M5.5 5v6h3V5M10.5 5v6h3V5M15.5 5v6h3V5" fill="currentColor" stroke="none"/>', 1.8),
  theory: S('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>', 1.8),
  rhythm: S('<path d="M3 12h3l2-6 4 12 3-9 2 3h4"/>', 1.9),
  styles: S('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3a9 9 0 0 1 9 9M5.6 18.4A9 9 0 0 1 3 12"/>', 1.8),
  metro: S('<path d="M9 3h6l4 18H5z"/><path d="M12 15l5-9"/><path d="M7 15h10"/>', 1.8),
  tuner: S('<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-6"/><circle cx="12" cy="17" r="1.5"/>', 1.8),
  seq: S('<rect x="3" y="4" width="4" height="4" rx="1"/><rect x="10" y="4" width="4" height="4" rx="1"/><rect x="17" y="4" width="4" height="4" rx="1"/><rect x="3" y="11" width="4" height="4" rx="1"/><rect x="10" y="16" width="4" height="4" rx="1"/><rect x="17" y="11" width="4" height="4" rx="1"/>', 1.8)
};

/* ============ settings & themes ============ */
const SKINS = {
  graphite: { n: "Графит", dark: 1, bg: "#111315", surface: "#191C1F", s2: "#22262A", line: "#2C3135", fg: "#ECEDEE", muted: "#9AA1A6", faint: "#646B71" },
  midnight: { n: "Полночь", dark: 1, bg: "#0C111C", surface: "#141A28", s2: "#1C2436", line: "#283147", fg: "#E7EBF4", muted: "#97A1B7", faint: "#5E6880" },
  moss: { n: "Мох", dark: 1, bg: "#0F1412", surface: "#161D1A", s2: "#1F2824", line: "#2A3530", fg: "#E6EEEA", muted: "#97A8A0", faint: "#5F6F68" },
  oled: { n: "Чёрная", dark: 1, bg: "#000000", surface: "#0F0F10", s2: "#1A1A1C", line: "#262629", fg: "#F2F2F2", muted: "#9A9A9E", faint: "#5E5E62" },
  sepia: { n: "Сепия", dark: 0, bg: "#F3EBDD", surface: "#FBF6EC", s2: "#EBE0CD", line: "#DDCFB8", fg: "#3A2F23", muted: "#7B6A55", faint: "#A8977F" },
  light: { n: "Светлая", dark: 0, bg: "#F4F5F6", surface: "#FFFFFF", s2: "#ECEEF0", line: "#E0E3E6", fg: "#15181B", muted: "#5E656C", faint: "#9AA1A8" }
};
const ACCENTS = {
  mint: { n: "Мята", d: "#3DD6A3", l: "#0C9B70" }, sky: { n: "Небо", d: "#5AB4FF", l: "#2275D8" },
  lilac: { n: "Сирень", d: "#AA9CFF", l: "#6553E6" }, amber: { n: "Янтарь", d: "#FFC24B", l: "#B97900" },
  coral: { n: "Коралл", d: "#FF7A66", l: "#D9472F" }, rose: { n: "Роза", d: "#FF86BC", l: "#CC3D7F" }
};
const COURSE_COL = { theory: ["#AA9CFF", "#6553E6"], rhythm: ["#FFC24B", "#B97900"], guitar: ["#FF7A66", "#D9472F"], drums: ["#5AB4FF", "#2275D8"], keys: ["#3DD6A3", "#0C9B70"], styles: ["#FF86BC", "#CC3D7F"] };
const DEF = {
  skin: "graphite", accent: "mint", fsz: 16, motion: "full", names: "latin", flats: 0,
  vol: 0.8, uiSfx: 1, latency: 0, countIn: 1,
  lefty: 0, tuning: "std", gtone: "clean", frets: 15, fretLabels: "dots",
  kit: "acoustic", metroSound: "click", accentFirst: 1,
  synth: "epiano", keyLabels: 1, keyW: 44, keyH: 190, octave: 3,
  goal: 60, apiKey: "", model: "claude-haiku-5-5"
};
let SET = Object.assign({}, DEF, LS.get("lad_set", {}));
function saveSet() { LS.set("lad_set", SET); applyTheme(); if (window.AU && AU.ready) AU.setVolume(SET.vol) }
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})` }
const isDark = () => (SKINS[SET.skin] || SKINS.graphite).dark;
const accentHex = () => { const A = ACCENTS[SET.accent] || ACCENTS.mint; return isDark() ? A.d : A.l };
const ccol = c => (COURSE_COL[c] || COURSE_COL.theory)[isDark() ? 0 : 1];
function applyTheme() {
  const s = SKINS[SET.skin] || SKINS.graphite, ac = accentHex();
  const r = document.documentElement.style;
  const v = { "--bg": s.bg, "--surface": s.surface, "--surface-2": s.s2, "--line": s.line, "--fg": s.fg, "--muted": s.muted, "--faint": s.faint,
    "--accent": ac, "--accent-ink": s.dark ? "#0A0D0C" : "#FFFFFF", "--accent-soft": hexA(ac, s.dark ? .15 : .12),
    "--gold": s.dark ? "#FFC24B" : "#A86E00", "--gold-soft": s.dark ? "rgba(255,194,75,.14)" : "rgba(214,150,0,.12)",
    "--warn": s.dark ? "#FF7A66" : "#D9472F", "--warn-soft": s.dark ? "rgba(255,122,102,.14)" : "rgba(217,71,47,.1)",
    "--fsz": SET.fsz + "px" };
  for (const c in COURSE_COL) v["--c-" + c] = ccol(c);
  for (const k in v) r.setProperty(k, v[k]);
  r.colorScheme = s.dark ? "dark" : "light";
  document.documentElement.classList.toggle("calm", SET.motion === "calm");
  document.documentElement.classList.toggle("anim", SET.motion === "full");
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = s.bg;
}
applyTheme();

/* ============ state ============ */
let ST = Object.assign({ xp: 0, days: {}, mins: {}, done: {}, games: {}, ach: {}, use: {}, quiz: { ok: 0, all: 0 }, u: 0 }, LS.get("lad_state", {}));
function saveState() { ST.u = Date.now(); LS.set("lad_state", ST) }
function streak() { let n = 0, t = Date.now(); if (!(ST.days[dkey(t)] > 0)) t -= DAY; while (ST.days[dkey(t)] > 0) { n++; t -= DAY } return n }
function bestStreak() {
  const ks = Object.keys(ST.days).filter(k => ST.days[k] > 0).sort(); let best = 0, cur = 0, prev = null;
  for (const k of ks) { const t = new Date(k + "T12:00").getTime(); cur = prev && Math.round((t - prev) / DAY) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = t }
  return best;
}
/* levels: threshold for level n = 40·n·(n−1) */
const lvThr = n => 40 * n * (n - 1);
function level(xp) { xp = xp ?? ST.xp; let n = 1; while (xp >= lvThr(n + 1)) n++; return { n, from: lvThr(n), to: lvThr(n + 1), p: (xp - lvThr(n)) / (lvThr(n + 1) - lvThr(n)) } }
const TITLES = [[1, "Новичок"], [3, "Ученик"], [6, "Любитель"], [10, "Музыкант"], [15, "Сессионщик"], [21, "Виртуоз"], [28, "Маэстро"], [36, "Легенда"]];
const lvTitle = n => { let t = TITLES[0][1]; for (const [k, v] of TITLES) if (n >= k) t = v; return t };

function addXP(n, el) {
  if (!n) return;
  const before = level().n;
  ST.xp += n; const k = today(); ST.days[k] = (ST.days[k] || 0) + n; saveState(); refreshCounters();
  if (el && el.getBoundingClientRect) { const r = el.getBoundingClientRect(); const f = document.createElement("div"); f.className = "xpfly"; f.textContent = "+" + n; f.style.left = (r.left + r.width / 2 - 12) + "px"; f.style.top = (r.top - 8) + "px"; document.body.appendChild(f); setTimeout(() => f.remove(), 950) }
  const after = level().n;
  if (after > before) setTimeout(() => { toast(`Новый уровень ${after} · ${lvTitle(after)}`); confetti(); sfx("level") }, 500);
  const g = SET.goal, d = ST.days[k];
  if (d >= g && d - n < g) setTimeout(() => { toast("Цель на день выполнена!"); confetti() }, 900);
  checkAch();
}
/* practice minutes: tools/games call tick() while running */
let _tickT = 0;
function practiceTick(kind) {
  const now = Date.now(); if (now - _tickT < 5000) return; const sec = _tickT && now - _tickT < 60000 ? (now - _tickT) / 1000 : 5; _tickT = now;
  const k = today(); ST.mins[k] = (ST.mins[k] || 0) + sec / 60; ST.use[kind] = (ST.use[kind] || 0) + sec; saveState();
}
const practiceMin = d => Math.round(ST.mins[d || today()] || 0);
const totalMin = () => Math.round(Object.values(ST.mins).reduce((a, b) => a + b, 0));

/* ============ achievements ============ */
const ACH = [
  { id: "first", e: "🎵", n: "Первая нота", d: "Пройти первый урок", t: () => doneCount() >= 1 },
  { id: "l10", e: "📚", n: "Прилежный", d: "10 уроков", t: () => doneCount() >= 10 },
  { id: "l30", e: "🎓", n: "Знаток", d: "30 уроков", t: () => doneCount() >= 30 },
  { id: "l60", e: "🏛", n: "Академия", d: "60 уроков", t: () => doneCount() >= 60 },
  { id: "stars", e: "⭐", n: "Отличник", d: "15 уроков на три звезды", t: () => Object.values(ST.done).filter(s => s >= 3).length >= 15 },
  { id: "s3", e: "🔥", n: "Разогрев", d: "Серия 3 дня", t: () => bestStreak() >= 3 },
  { id: "s7", e: "🔥", n: "Неделя в ритме", d: "Серия 7 дней", t: () => bestStreak() >= 7 },
  { id: "s30", e: "💎", n: "Железная дисциплина", d: "Серия 30 дней", t: () => bestStreak() >= 30 },
  { id: "x500", e: "⚡", n: "Заряд", d: "500 опыта", t: () => ST.xp >= 500 },
  { id: "x3000", e: "⚡", n: "Высокое напряжение", d: "3000 опыта", t: () => ST.xp >= 3000 },
  { id: "lv10", e: "🎸", n: "Музыкант", d: "Достичь 10 уровня", t: () => level().n >= 10 },
  { id: "theory", e: "🎼", n: "Теоретик", d: "Пройти курс теории", t: () => courseP("theory") >= 1 },
  { id: "guitar", e: "🎸", n: "Гитарист", d: "Пройти курс гитары", t: () => courseP("guitar") >= 1 },
  { id: "drums", e: "🥁", n: "Барабанщик", d: "Пройти курс барабанов", t: () => courseP("drums") >= 1 },
  { id: "keys", e: "🎹", n: "Клавишник", d: "Пройти курс клавиш", t: () => courseP("keys") >= 1 },
  { id: "rhythm", e: "⏱", n: "Чувство ритма", d: "Пройти курс ритма", t: () => courseP("rhythm") >= 1 },
  { id: "styles", e: "🌍", n: "Меломан", d: "Изучить 6 стилей", t: () => (window.COURSES ? COURSES.styles.units.flatMap(u => u.lessons).filter(l => ST.done[l.id]).length : 0) >= 6 },
  { id: "perfect", e: "🎯", n: "Точно в долю", d: "95% точности в ритм-игре", t: () => Object.entries(ST.games).some(([k, g]) => k.startsWith("lanes") && g.acc >= 95) },
  { id: "combo50", e: "🌀", n: "Комбо 50", d: "50 попаданий подряд", t: () => Object.values(ST.games).some(g => (g.combo || 0) >= 50) },
  { id: "ear", e: "👂", n: "Абсолютное ухо", d: "20 правильных на слух подряд", t: () => Object.values(ST.games).some(g => (g.streak || 0) >= 20) },
  { id: "m60", e: "⏳", n: "Час практики", d: "60 минут в студии и тренировках", t: () => totalMin() >= 60 },
  { id: "m600", e: "🕰", n: "Десять часов", d: "600 минут практики", t: () => totalMin() >= 600 },
  { id: "allin", e: "🧭", n: "Мультиинструменталист", d: "Поиграть на всех инструментах", t: () => ["guitar", "drums", "synth"].every(k => (ST.use[k] || 0) > 30) },
  { id: "tuned", e: "🎚", n: "В строю", d: "Настроить гитару тюнером", t: () => (ST.use.tunerOk || 0) >= 6 }
];
const doneCount = () => Object.keys(ST.done).length;
function courseP(c) { if (!window.COURSES || !COURSES[c]) return 0; const ls = COURSES[c].units.flatMap(u => u.lessons); return ls.length ? ls.filter(l => ST.done[l.id]).length / ls.length : 0 }
function checkAch() {
  let got = null;
  for (const a of ACH) if (!ST.ach[a.id]) { try { if (a.t()) { ST.ach[a.id] = Date.now(); got = a } } catch (e) {} }
  if (got) { saveState(); setTimeout(() => { toast(got.e + " Достижение: " + got.n); sfx("level") }, 1300) }
}

/* ============ UI basics ============ */
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600) }
function refreshCounters() { const s = $("#cStreak"), x = $("#cXp"); if (s) s.textContent = streak(); if (x) x.textContent = ST.xp }
function header(title, sub) { return `<div class="top"><div><small>${esc(sub)}</small><h1>${esc(title)}</h1></div><div class="stats-inline"><span style="color:var(--gold)">${IC.fire}<b id="cStreak">${streak()}</b></span><span style="color:var(--accent)">${IC.bolt}<b id="cXp">${ST.xp}</b></span></div></div>` }
function starsHtml(n, max) { let h = '<span class="stars">'; for (let i = 0; i < (max || 3); i++) h += `<span class="${i < n ? "on" : ""}">${IC.star}</span>`; return h + "</span>" }
function sfx(k) { if (!SET.uiSfx || !window.AU) return; try { AU.ui(k) } catch (e) {} }

function confetti() {
  if (SET.motion === "calm") return;
  const c = document.createElement("canvas"); c.className = "confetti"; document.body.appendChild(c);
  const W = c.width = innerWidth * devicePixelRatio, H = c.height = innerHeight * devicePixelRatio, x = c.getContext("2d");
  const cols = [accentHex(), "#FFC24B", "#FF86BC", "#5AB4FF", "#AA9CFF", "#FF7A66"];
  const P = Array.from({ length: 120 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 26, vy: -Math.random() * 26 - 8, r: Math.random() * 6 + 4, c: pick(cols), a: Math.random() * 6, va: (Math.random() - .5) * .4 }));
  let t0 = performance.now();
  (function f(t) {
    x.clearRect(0, 0, W, H); const dt = Math.min(2, (t - t0) / 16); t0 = t; let alive = 0;
    for (const p of P) { p.vy += .9 * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt; if (p.y < H + 20) alive++; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); x.restore() }
    if (alive) requestAnimationFrame(f); else c.remove();
  })(t0);
}

/* layers: up to two stacked full-screen screens */
const LAYERS = [];
function openLayer(title, body, opts) {
  opts = opts || {};
  const idx = LAYERS.length >= 2 ? 1 : LAYERS.length; if (LAYERS.length >= 2) { const o = LAYERS.pop(); o.onClose && o.onClose() }
  const el = $("#layer" + (idx + 1));
  el.innerHTML = `<div class="lbar"><button class="ib" data-close aria-label="Назад">${IC.back}</button><div class="t">${esc(title)}</div>${opts.right || '<span class="ib"></span>'}</div><div class="page ${opts.wide ? "wide" : ""}" ${opts.cc ? `style="--cc:var(--c-${opts.cc})"` : ""}>${body}</div>`;
  el.scrollTop = 0; requestAnimationFrame(() => el.classList.add("open"));
  const L = { el, onClose: opts.onClose }; LAYERS.push(L);
  el.querySelector("[data-close]").onclick = () => closeLayer();
  return el;
}
function closeLayer() {
  const L = LAYERS.pop(); if (!L) return; L.onClose && L.onClose(); L.el.classList.remove("open");
  setTimeout(() => { if (!LAYERS.some(x => x.el === L.el)) L.el.innerHTML = "" }, 450);
  if (!LAYERS.length && window.render) render();
}
function topLayer() { return LAYERS[LAYERS.length - 1] }

/* bottom sheet */
let sheetClose = null;
function openSheet(html, onClose) {
  if (sheetClose) { const f = sheetClose; sheetClose = null; f() }
  $("#sbody").innerHTML = html; $("#sheet").classList.add("open"); $("#scrim").classList.add("open"); sheetClose = onClose || null; $("#sbody").scrollTop = 0;
}
function closeSheet() { $("#sheet").classList.remove("open"); $("#scrim").classList.remove("open"); if (sheetClose) { const f = sheetClose; sheetClose = null; f() } }
$("#scrim").onclick = closeSheet;
(() => { const g = $("#grab"), sh = $("#sheet"); let y0 = null, dy = 0;
  g.addEventListener("pointerdown", e => { y0 = e.clientY; dy = 0; sh.style.transition = "none"; g.setPointerCapture(e.pointerId) });
  g.addEventListener("pointermove", e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = `translateY(${dy}px)` });
  const up = () => { if (y0 == null) return; y0 = null; sh.style.transition = ""; sh.style.transform = ""; if (dy > 80) closeSheet() };
  g.addEventListener("pointerup", up); g.addEventListener("pointercancel", up); })();

/* ============ AI (optional, own API key) ============ */
async function askClaude(prompt, maxTokens, system) {
  if (!SET.apiKey) throw { code: "nokey" };
  if (!navigator.onLine) throw { code: "offline" };
  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": SET.apiKey.trim(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: SET.model || DEF.model, max_tokens: maxTokens || 900, system: system || undefined, messages: [{ role: "user", content: prompt }] }) });
  } catch (e) { throw { code: "offline" } }
  if (!res.ok) { let m = ""; try { m = (await res.json()).error?.message || "" } catch (e) {} throw { code: res.status === 401 ? "badkey" : res.status === 429 ? "limit" : res.status === 400 && /credit|balance/i.test(m) ? "money" : res.status === 404 ? "model" : "api", msg: m } }
  const j = await res.json(); return (j.content || []).map(c => c.text || "").join("").trim();
}
function aiErr(e) {
  return { nokey: "Добавьте ключ Claude API в Профиле → Преподаватель ИИ.", offline: "Нет интернета. Преподаватель ИИ работает онлайн, всё остальное — всегда.", badkey: "Ключ API не подошёл. Проверьте его в настройках.", limit: "Слишком много запросов. Подождите минуту.", money: "На счёте API закончились средства. Пополните баланс в консоли Anthropic.", model: "Модель не найдена. Выберите другую в настройках." }[e && e.code] || "Не удалось получить ответ. Попробуйте ещё раз.";
}
const AI_SYS = "Ты — дружелюбный преподаватель музыки для взрослого самоучки. Ученик играет на электрогитаре и электронных барабанах, есть синтезатор. Отвечай по-русски, коротко и конкретно, простым текстом без Markdown-разметки (без звёздочек и решёток). Используй латинские названия нот (C, D, E) и аппликатуру/табулатуру, когда это помогает. Если нужно упражнение — дай темп в BPM и сколько минут играть.";

try { navigator.storage && navigator.storage.persist && navigator.storage.persist() } catch (e) {}
