"use strict";
/* harmony.js — «Гармония»: конструктор настроения → аккорды, аппликатуры, табы, звук.
   База настроений и гармонических приёмов, поиск аппликатур на грифе, голосоведение для клавиш. */

/* ---------- extended chord vocabulary ---------- */
Object.assign(CHORDS, {
  maj9: { n: "большой мажорный нонаккорд", s: [0, 4, 7, 11, 14] }, m9: { n: "минорный нонаккорд", s: [0, 3, 7, 10, 14] },
  madd9: { n: "минор с ноной", s: [0, 3, 7, 14] }, "7sus4": { n: "доминанта с квартой", s: [0, 5, 7, 10] },
  maj7s11: { n: "лидийский maj7♯11", s: [0, 4, 7, 11, 18] }, "13": { n: "доминанта с терцдецимой", s: [0, 4, 10, 14, 21] },
  m11: { n: "минорный ундецимаккорд", s: [0, 3, 7, 10, 14, 17] }, "69": { n: "мажор 6/9", s: [0, 4, 7, 9, 14] },
  "7b9": { n: "доминанта с ♭9", s: [0, 4, 7, 10, 13] }, mmaj7: { n: "минор с большой септимой", s: [0, 3, 7, 11] },
  maj7s5: { n: "увеличенный maj7", s: [0, 4, 8, 11] }, sus2add4: { n: "sus2 с квартой", s: [0, 2, 5, 7] }, "add11": { n: "мажор с ундецимой", s: [0, 4, 7, 17] },
  m6add9: { n: "минор 6/9", s: [0, 3, 7, 9, 14] }, "7s9": { n: "«хендриксовский» 7♯9", s: [0, 4, 7, 10, 15] }
});
const CH_SHOW = { maj7s11: "maj7♯11", "69": "6/9", "7b9": "7♭9", mmaj7: "m(maj7)", m7b5: "m7♭5", maj7s5: "maj7♯5", m6add9: "m6/9", "7s9": "7♯9", sus2add4: "sus2(4)", dim: "°", dim7: "°7" };
const chShow = t => CH_SHOW[t] ?? t;
const CH_ALIAS = { "": "", M: "", maj: "", m: "m", min: "m", "-": "m", "7": "7", maj7: "maj7", M7: "maj7", "Δ": "maj7", "Δ7": "maj7", m7: "m7", "-7": "m7", dim: "dim", "°": "dim", o: "dim", dim7: "dim7", "°7": "dim7", aug: "aug", "+": "aug", sus2: "sus2", sus4: "sus4", sus: "sus4", "6": "6", m6: "m6", add9: "add9", "9": "9", m7b5: "m7b5", "ø": "m7b5", "ø7": "m7b5", "m7♭5": "m7b5", maj9: "maj9", m9: "m9", madd9: "madd9", "m(add9)": "madd9", "7sus4": "7sus4", "7sus": "7sus4", "maj7#11": "maj7s11", "maj7♯11": "maj7s11", "13": "13", m11: "m11", "6/9": "69", "69": "69", "7b9": "7b9", "7♭9": "7b9", "mmaj7": "mmaj7", "m(maj7)": "mmaj7", "5": "5", add11: "add11", "7#9": "7s9", "7♯9": "7s9" };
function parseSym(sym) { // "F#m7/C#" -> {root, type, bass}
  const m = /^([A-G])([#♯b♭]?)([^/]*)(?:\/([A-G][#♯b♭]?))?$/.exec(String(sym).trim()); if (!m) return null;
  const pc = (L, a) => pcOf({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[L] + (/[#♯]/.test(a) ? 1 : /[b♭]/.test(a) ? -1 : 0));
  const type = CH_ALIAS[m[3]] ?? (m[3] in CHORDS ? m[3] : null); if (type == null) return null;
  const root = pc(m[1], m[2]); let bass = root; if (m[4]) bass = pc(m[4][0], m[4].slice(1));
  return { root, type, bass };
}

/* ---------- roman numerals relative to a tonic ---------- */
const DEG = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
function parseRoman(tok) {
  // [b#]? ROMAN [°ø+]? suffix? (/3 /5 /7 /P /b7 …)?
  const m = /^([b#♭♯]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)([°ø+]?)([^/]*)(?:\/(.+))?$/.exec(tok); if (!m) return null;
  let deg = DEG[m[2].toUpperCase()] + (/[b♭]/.test(m[1]) ? -1 : /[#♯]/.test(m[1]) ? 1 : 0);
  const low = m[2] === m[2].toLowerCase(); let suf = m[4], type;
  if (m[3] === "°") type = suf === "7" ? "dim7" : "dim";
  else if (m[3] === "ø") type = "m7b5";
  else if (m[3] === "+") type = suf === "maj7" ? "maj7s5" : "aug";
  else if (suf === "5") type = "5";
  else if (low && suf in CHORDS && /^(m|dim)/.test(suf)) type = suf;
  else if (low) type = { "": "m", "7": "m7", "9": "m9", "11": "m11", "6": "m6", add9: "madd9", maj7: "mmaj7", "69": "m6add9" }[suf] ?? ("m" + suf in CHORDS ? "m" + suf : "m");
  else type = suf in CHORDS ? suf : (CH_ALIAS[suf] ?? "");
  return { deg: pcOf(deg), type, slash: m[5] || null, tok };
}
function romanLabel(c) { return c.tok }
const romanShow = t => t.replace(/b(?=[IV])/g, "♭").replace(/#/g, "♯").replace("maj7s11", "maj7♯11").replace("maj7s5", "maj7♯5").replace(/69/, "6/9").replace("7b9", "7♭9").replace("7s9", "7♯9").replace("m7b5", "ø7").replace(/\/P$/, " (педаль)");

/* ---------- guitar voicing search ---------- */
const _vcache = {};
function findVoicings(root, type, bass, style, max) {
  style = style || "open"; max = max || 3; const tun = tuning();
  const key = [root, type, bass, style, tun.join(",")].join("|"); if (_vcache[key]) return _vcache[key];
  let ivs = (CHORDS[type] || CHORDS[""]).s.map(i => pcOf(i)); ivs = [...new Set(ivs)];
  const pcs = new Set(ivs.map(i => pcOf(root + i)));
  // required tones: root (unless slash), 3rd/sus, 7th/6th, colour tone; fifth optional unless altered
  const req = new Set([pcOf(root)]);
  for (const i of ivs) if ([1, 2, 3, 4, 5, 6, 8, 9, 10, 11].includes(i) && !(i === 7)) req.add(pcOf(root + i));
  if (type === "13" || type === "m11") req.delete(pcOf(root + 2)); // the 9th may be left out
  if (type === "5") req.add(pcOf(root + 7));
  const bassPc = bass == null ? pcOf(root) : pcOf(bass); pcs.add(bassPc);
  const out = [];
  for (let pos = 0; pos <= 12; pos++) {
    const lo = pos === 0 ? 1 : pos, hi = lo + 3;
    const opts = tun.map(o => { const a = [-1]; if (pcs.has(pcOf(o)) && (style === "open" || pos === 0)) a.push(0); for (let f = lo; f <= hi; f++) if (pcs.has(pcOf(o + f))) a.push(f); return a });
    const cur = [];
    const rec = (s, first, gaps, fretted) => {
      if (s === 6) { if (first >= 0) { const v = evalV(cur, tun, req, bassPc, pos, style, type); if (v) out.push(v) } return }
      for (const f of opts[s]) {
        if (f < 0) { if (first >= 0 && gaps >= 1 && s < 5) continue; cur[s] = f; rec(s + 1, first, first >= 0 ? gaps + 1 : gaps, fretted); continue }
        if (first < 0 && pcOf(tun[s] + f) !== bassPc) continue;
        const fr = fretted + (f > 0 ? 1 : 0); if (fr > 6) continue;
        cur[s] = f; rec(s + 1, first < 0 ? s : first, gaps, fr);
      }
    };
    rec(0, -1, 0, 0);
  }
  out.sort((a, b) => b.score - a.score);
  const res = [], seen = new Set();
  for (const v of out) { const k = v.f.join(","); if (seen.has(k)) continue; if (res.some(r => r.f.every((x, i) => x === v.f[i] || (x < 0 && v.f[i] < 0)))) continue; seen.add(k); res.push(v); if (res.length >= max) break }
  return _vcache[key] = res;
}
function evalV(f, tun, req, bassPc, pos, style, type) {
  const sounded = []; for (let s = 0; s < 6; s++) if (f[s] >= 0) sounded.push(s);
  const minStr = type === "5" ? 2 : style === "compact" ? 3 : 4; if (sounded.length < minStr) return null;
  const first = sounded[0], last = sounded[sounded.length - 1];
  let gaps = 0; for (let s = first; s <= last; s++) if (f[s] < 0) gaps++; if (gaps > 1) return null;
  if (pcOf(tun[first] + f[first]) !== bassPc) return null;
  const have = new Set(sounded.map(s => pcOf(tun[s] + f[s]))); for (const r of req) if (!have.has(r)) return null;
  const fr = sounded.filter(s => f[s] > 0).map(s => f[s]); const minF = fr.length ? Math.min(...fr) : 0, maxF = fr.length ? Math.max(...fr) : 0;
  if (maxF - minF > 3) return null;
  const atMin = sounded.filter(s => f[s] === minF && minF > 0);
  let fingers = fr.length, barre = false;
  if (fingers > 4) { if (atMin.length >= 2) { fingers = fr.length - atMin.length + 1; barre = true } }
  if (fingers > 4) return null;
  if (barre) { const bs = atMin[0]; for (let s = bs; s < 6; s++) if (f[s] === 0) return null; for (let s = bs; s < 6; s++) if (f[s] > 0 && f[s] < minF) return null }
  let sc = sounded.length * 1.2 - gaps * 4 - (maxF - minF) * 1.1;
  const opens = sounded.filter(s => f[s] === 0).length;
  if (style === "open") sc += opens * 1.6 - minF * .45; else if (style === "high") sc -= Math.abs(minF - 7) * .5 + opens * 2; else sc -= minF * .2 + (sounded.length > 4 ? 1 : 0);
  if (first <= 1) sc += 1.2; if (barre) sc -= style === "open" ? 2.5 : .5;
  const top = pcOf(tun[last] + f[last]); if (top !== pcOf(tun[first] + f[first])) sc += .6;
  let dbl = 0; const cnt = {}; sounded.forEach(s => { const p = pcOf(tun[s] + f[s]); cnt[p] = (cnt[p] || 0) + 1 }); for (const k in cnt) if (cnt[k] > 1) dbl += cnt[k] - 1; sc -= Math.max(0, dbl - 2) * .6;
  return { f: f.slice(), score: sc, barre: barre ? minF : 0 };
}
function shapeSVG(fr, label) {
  const sounded = fr.filter(f => f > 0), minF = sounded.length ? Math.min(...sounded) : 1, maxF = sounded.length ? Math.max(...sounded) : 1;
  const base = maxF > 4 ? minF : 1, rows = Math.max(4, maxF - base + 1), w = 84, l = 14, t = 20, dx = (w - l * 2) / 5, dy = 15, h = t + rows * dy + 8;
  let g = base === 1 ? `<rect x="${l - 1}" y="${t - 3}" width="${dx * 5 + 2}" height="4" rx="1" fill="var(--fg)"/>` : `<text x="${l - 4}" y="${t + dy * .7}" font-size="10" text-anchor="end" fill="var(--muted)" font-weight="800">${base}</text>`;
  for (let i = 0; i <= rows; i++) g += `<line x1="${l}" x2="${l + dx * 5}" y1="${t + i * dy}" y2="${t + i * dy}" stroke="var(--faint)" stroke-width="1.2"/>`;
  for (let s = 0; s < 6; s++) g += `<line x1="${l + s * dx}" x2="${l + s * dx}" y1="${t}" y2="${t + rows * dy}" stroke="var(--muted)" stroke-width="${1.6 - s * .12}"/>`;
  const atMin = fr.map((f, s) => f === minF && minF > 0 ? s : -1).filter(s => s >= 0);
  const useBarre = fr.filter(f => f > 0).length > 4 && atMin.length >= 2;
  if (useBarre) g += `<rect x="${l + atMin[0] * dx - 5}" y="${t + (minF - base + .5) * dy - 5}" width="${(5 - atMin[0]) * dx + 10}" height="10" rx="5" fill="var(--accent)"/>`;
  fr.forEach((f, s) => { const x = l + s * dx; if (f < 0) g += `<text x="${x}" y="${t - 7}" font-size="10" text-anchor="middle" fill="var(--faint)" font-weight="800">×</text>`; else if (f === 0) g += `<circle cx="${x}" cy="${t - 10}" r="3.5" fill="none" stroke="var(--muted)" stroke-width="1.4"/>`; else if (!(useBarre && f === minF)) g += `<circle cx="${x}" cy="${t + (f - base + .5) * dy}" r="5.6" fill="var(--accent)"/>` });
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}">${g}</svg>`;
}

/* ---------- keyboard voice leading ---------- */
function keyVoicings(chords) {
  let prev = null; return chords.map(c => {
    let ivs = (CHORDS[c.type] || CHORDS[""]).s.slice(); if (ivs.length > 4) ivs = ivs.filter(i => i !== 7);
    const pcs = [...new Set(ivs.map(i => pcOf(c.root + i)))];
    let best = null;
    for (let inv = 0; inv < pcs.length; inv++) for (let base = 52; base <= 64; base++) {
      if (pcOf(base) !== pcs[inv]) continue; const v = [base]; for (let k = 1; k < pcs.length; k++) { let n = v[v.length - 1] + 1; while (pcOf(n) !== pcs[(inv + k) % pcs.length]) n++; v.push(n) }
      if (v[v.length - 1] > 79) continue;
      const cost = prev ? v.reduce((a, n, i) => a + Math.abs(n - (prev[i] ?? prev[prev.length - 1])), 0) + Math.abs(v.length - prev.length) * 2 : Math.abs(v[0] + v[v.length - 1] - 128);
      if (!best || cost < best.cost) best = { v, cost };
    }
    prev = best.v; let b = 36 + pcOf(c.bass); if (b > 47) b -= 12; return { rh: best.v, lh: b };
  });
}

/* ---------- moods ---------- */
/* p: progression templates (roman, space-separated; "|" not used); w: weight. col: favourite colour types for upgrades. */
const MOODS = [
  // Ностальгия и ретро
  { id: "aero", g: "Ностальгия и ретро", n: "Frutiger Aero", d: "Глянец, небо, вода, оптимизм начала 2000-х. Светло, прозрачно, чуть «стеклянно».", kw: ["аэро", "frutiger", "фрутигер", "2000", "нулев", "vista", "виста", "глянец", "стекл", "небо", "пузыр", "вода", "чист", "свеж"], bright: .8, p: [["Imaj9 IVmaj7 vi9 V69", 3], ["Imaj7 II iii7 IVmaj7", 2], ["Iadd9 IVmaj7s11 Iadd9 Vsus4", 2], ["IVmaj9 V69 iii7 vi9", 2]], col: ["maj9", "add9", "69", "maj7s11"], scale: "lydian", tempo: [92, 112], feel: "straight", gtr: "chime", tone: "aero", syn: "aero", kit: "synthwave", groove: "pop", why: ["maj7, maj9 и 69 дают «воздух»: в аккорде нет напряжённых интервалов, но есть яркие верхние тона.", "Лидийская окраска (♯4, аккорд II мажор) звучит как удивление и открытое небо.", "Чистый звук с хорусом и дилэем — главный тембр эпохи: всё «блестит» и отражается."], tips: ["Играйте аккорды на верхних струнах с открытыми e и B — получится звенящий фон.", "Синтезатор: пресет «Аэро-пэд» или «Стекло» на октаву выше гитары.", "Добавьте флажолеты на 12 и 7 ладу в паузах."] },
  { id: "warm", g: "Ностальгия и ретро", n: "Тёплая ностальгия", d: "Приятное воспоминание, старые фото, летний вечер у бабушки.", kw: ["ностальг", "воспомин", "тепл", "фото", "детств", "уют", "лето", "дом", "бабушк"], bright: .4, p: [["I iii IV iv", 3], ["Imaj7 vi7 IV iv6", 2], ["I V/3 vi IV iv I", 2], ["IVmaj7 iv6 I vi7", 2]], col: ["maj7", "add9", "6"], scale: "major", tempo: [70, 92], feel: "straight", gtr: "arp", tone: "clean", syn: "rhodes", kit: "lofi", groove: "lofi", why: ["Минорная iv в мажоре (заимствование из одноимённого минора) — главный «ностальгический» приём: знакомый мажор вдруг на секунду грустнеет.", "Переход IV → iv двигает одну ноту на полтона вниз (A → A♭ в C) — это ощущение «было и прошло».", "maj7 смягчают и добавляют мечтательности."], tips: ["На гитаре iv удобно играть как минорное баррэ формы Am.", "Медленное арпеджио, чуть затянутое, как будто вспоминаете.", "Лоу-фай кит и Родес на фоне усиливают эффект старой плёнки."] },
  { id: "bitter", g: "Ностальгия и ретро", n: "Горько-сладкая ностальгия", d: "Тоска по тому, что не вернуть, но с благодарностью.", kw: ["тоск", "горьк", "сладк", "прошл", "скуча", "утрат", "не вернуть", "прощ"], bright: .1, p: [["vi IV I V", 2], ["I V/3 vi iii IV I/3 ii V", 3], ["vi7 IVmaj7 I Vsus4 V", 2], ["IV V iii vi", 2]], col: ["m7", "maj7", "add9", "sus4"], scale: "major", tempo: [72, 96], feel: "straight", gtr: "arp", tone: "clean", syn: "strings", kit: "acoustic", groove: "ballad", why: ["Начало с vi — минорная точка зрения на мажорную тональность: светлые аккорды звучат сквозь грусть.", "Нисходящий бас (I – V/3 – vi) — как будто опускаешь взгляд.", "Задержание sus4 → V откладывает разрешение: сожаление и ожидание."], tips: ["Играйте басовую линию отдельно — она здесь главная.", "Струнные пэды вступают со второго круга."] },
  { id: "vhs", g: "Ностальгия и ретро", n: "VHS и детство 90-х", d: "Мультики по утрам, кассеты, тёплый шум плёнки.", kw: ["vhs", "кассет", "90", "девяност", "мульт", "плёнк", "пленк", "детств", "утро", "денди", "sega", "игр"], bright: .7, p: [["I V vi IV", 2], ["I bVII IV I", 2], ["Iadd9 V/3 IV iv", 2], ["I iii IV V", 2]], col: ["add9", "6", "sus2"], scale: "major", tempo: [96, 120], feel: "straight", gtr: "strum", tone: "clean", syn: "chip", kit: "lofi", groove: "pop", why: ["Простая мажорная гармония и ♭VII (из миксолидийского) — звук телевизионных заставок и игр.", "add9 и 6 — мягкость без джазовой сложности.", "8-битный синтезатор и лоу-фай барабаны дают «зерно» старой техники."], tips: ["Мелодию сыграйте на пресете «8-бит», гитара — простой бой на чистом.", "Сдвиньте темп чуть выше 110 — будет энергия утренних мультиков."] },
  { id: "vapor", g: "Ностальгия и ретро", n: "Вейпорвейв / молл-музыка", d: "Пустой торговый центр, лифт, неон, замедленное время.", kw: ["вейпор", "vapor", "молл", "торгов", "лифт", "неон", "замедл", "эстетик", "aesthetic", "сюрр"], bright: .3, p: [["ii9 V13 Imaj9 VI7b9", 3], ["IVmaj9 iii7 vi9 bVImaj7", 2], ["Imaj7 bIIImaj7 bVImaj7 bIImaj7", 2], ["iii7 VI7 ii9 V13", 2]], col: ["maj9", "m9", "13", "maj7"], scale: "major", tempo: [64, 84], feel: "halftime", gtr: "pad", tone: "jazz", syn: "vapor", kit: "lofi", groove: "lofi", why: ["Джазовые ii–V–I с девятыми и тринадцатыми — звук фоновой музыки 80–90-х.", "Хроматические медианты (Imaj7 → ♭IIImaj7 → ♭VImaj7) создают «сюрреалистичный» сдвиг: аккорды красивые, но словно не отсюда.", "Медленный темп и плывущая высота (вибрато синтезатора) — ощущение замедленной плёнки."], tips: ["Пресет «Вейпор-клавиши» + много ревёрба.", "Гитара — тёмный джаз-звук, аккорды целыми нотами."] },
  { id: "synthnight", g: "Ностальгия и ретро", n: "Синтвейв-ночь", d: "Ночное шоссе, неон, 1986 год, которого не было.", kw: ["синтвейв", "synthwave", "ночь", "шоссе", "неон", "80", "восьмидес", "ретровейв", "drive", "драйв ноч", "outrun"], bright: -.1, p: [["vi IV I V", 3], ["i bVI bIII bVII", 3], ["vi V IV V", 2], ["i bVII bVI V", 1]], col: ["add9", "sus2", "m7"], scale: "minor", tempo: [96, 118], feel: "straight", gtr: "pm", tone: "aero", syn: "supersaw", kit: "synthwave", groove: "synthwave", why: ["Минорная «эпическая» последовательность i–♭VI–♭III–♭VII: драма без отчаяния.", "Пульсирующий бас восьмыми и гейтед-ревёрб на малом — фирменная фактура 80-х.", "Суперпила и хорус делают звук широким, как экран кинотеатра."], tips: ["Гитара: приглушённые восьмые на басу аккорда, на припеве — открытые аккорды с дилэем.", "Лид на синтезаторе — длинные ноты из натурального минора."] },
  { id: "lofi", g: "Ностальгия и ретро", n: "Лоу-фай вечер", d: "Дождь за окном, чай, конспекты, мягкий свинг.", kw: ["лоуфай", "lofi", "лоу-фай", "дожд", "чай", "учеб", "вечер", "спокойн", "chill", "чилл", "уют"], bright: .2, p: [["ii9 V13 Imaj9 vi9", 3], ["IVmaj7 iii7 ii9 Imaj7", 2], ["Imaj7 vi9 ii9 V7b9", 2], ["vi9 ii9 IVmaj7 V13", 1]], col: ["maj9", "m9", "13", "maj7"], scale: "dorian", tempo: [70, 88], feel: "swing", gtr: "arp", tone: "jazz", syn: "rhodes", kit: "lofi", groove: "lofi", why: ["Нонаккорды и септаккорды — мягкие и «тёплые», без резких разрешений.", "ii–V–I идёт по кругу и не заканчивается — фон, который не утомляет.", "Лёгкий свинг и «пыльные» барабаны добавляют живости."], tips: ["На гитаре играйте 4-струнные аккорды в средней позиции (стиль «компактные»).", "Свинг 15–20% на драм-машине."] },
  { id: "midwest", g: "Ностальгия и ретро", n: "Мидвест-эмо / осень", d: "Листья, первые холода, светлая грусть, открытые струны.", kw: ["эмо", "emo", "мидвест", "midwest", "осен", "лист", "пост-рок", "математ", "math", "kinsella", "american football"], bright: .3, p: [["Imaj7 IVmaj7 vi7 Vsus4", 2], ["IVmaj7 Iadd9 vi7 V69", 2], ["Imaj9 iii7 IVmaj7s11 IVmaj7", 2]], col: ["maj7", "add9", "maj9", "maj7s11"], scale: "major", tempo: [100, 132], feel: "straight", gtr: "chime", tone: "clean", syn: "glass", kit: "acoustic", groove: "pop", why: ["Открытые струны внутри аккордов создают «звон» и необычные интервалы (секунды рядом).", "maj7 и add9 на гитаре звучат светло-печально.", "Часто используют альтернативные строи (DADGAD, Open) — попробуйте их в настройках."], tips: ["Аппликатуры «Открытые» + капо на 2–5 ладу.", "Перебор с хаммерами на верхних струнах, ритм иногда в 5/4 или 7/8."] },
  // Светлые
  { id: "summer", g: "Светлые", n: "Беззаботное лето", d: "Солнце, море, ветер в окне машины.", kw: ["лето", "солн", "море", "пляж", "отпуск", "беззабот", "весел", "радост", "ветер"], bright: .9, p: [["I IV I V", 2], ["I bVII IV I", 2], ["I V vi IV", 2], ["I iii IV V", 1]], col: ["6", "add9", "sus2"], scale: "mixo", tempo: [104, 128], feel: "straight", gtr: "strum", tone: "clean", syn: "organ", kit: "acoustic", groove: "pop", why: ["Только мажорные главные аккорды — никакой тени.", "♭VII (миксолидийский) добавляет расслабленность рок-н-ролла и регги.", "Бой восьмыми с акцентами на «и» даёт лёгкость."], tips: ["Капо на 2 лад и аккорды из позиции G — звонко и солнечно."] },
  { id: "dawn", g: "Светлые", n: "Рассвет и надежда", d: "После трудного времени — первый свет.", kw: ["надежд", "рассвет", "утро", "начал", "свет", "вера", "после", "восход", "поддерж"], bright: .5, p: [["vi IV I V", 2], ["IV I V vi", 2], ["Isus2 V/3 vi IV", 2], ["IV V iii vi IV V I", 2]], col: ["sus2", "add9", "sus4"], scale: "major", tempo: [76, 100], feel: "straight", gtr: "arp", tone: "ambient", syn: "strings", kit: "acoustic", groove: "ballad", why: ["Движение от минорной vi к мажорной I — из тени к свету.", "sus2 — «пустота», которая наполняется.", "Постепенное нарастание фактуры (сначала перебор, потом бой) усиливает надежду."], tips: ["Начните тихо на чистом звуке, во втором круге включите «Эмбиент»."] },
  { id: "euphoria", g: "Светлые", n: "Эйфория / танцпол", d: "Руки вверх, супер-пилы, транс-кульминация.", kw: ["эйфор", "транс", "танц", "клуб", "руки вверх", "кульмин", "праздн", "восторг"], bright: .6, p: [["vi IV I V", 2], ["IV V vi vi", 2], ["i bVI bIII bVII", 2]], col: ["sus2", "add9"], scale: "minor", tempo: [124, 138], feel: "four", gtr: "pad", tone: "ambient", syn: "supersaw", kit: "e808", groove: "house", why: ["Повторяющаяся четвёрка аккордов и бочка «четыре в пол» — гипнотическая энергия.", "Суперпила (5 расстроенных пил) звучит огромно.", "Подъём: IV → V → vi, кульминация на минорном аккорде — эйфория со слезой."], tips: ["Арпеджиатор синтезатора 1/16 на аккордах.", "Хлопок на 2 и 4, открытый хэт на «и»."] },
  { id: "love", g: "Светлые", n: "Влюблённость", d: "Нежность, тепло, бабочки.", kw: ["любов", "влюб", "нежн", "роман", "свидан", "поцел", "сердц"], bright: .6, p: [["Imaj7 iii7 vi7 IVmaj7", 2], ["Imaj7 vi7 ii7 V7", 2], ["IVmaj7 V7/3 iii7 vi7", 1], ["I vi IV V", 1]], col: ["maj7", "m7", "add9", "6"], scale: "major", tempo: [68, 90], feel: "straight", gtr: "arp", tone: "clean", syn: "epiano", kit: "jazz", groove: "ballad", why: ["Септаккорды с большой септимой звучат мягко и интимно.", "Нисходящая линия терций (I – iii – vi) — плавное, «качающее» движение.", "Соул-гармония (I – vi – ii – V) — классика баллад."], tips: ["Электропиано или Родес, гитара — пальцами."] },
  { id: "wonder", g: "Светлые", n: "Сказка и чудо", d: "Волшебный лес, удивление, Disney-магия.", kw: ["сказк", "чудо", "волшеб", "магия", "магич", "удивлен", "фэнтез", "лес", "фея"], bright: .7, p: [["I II IV I", 3], ["Imaj7s11 II vi IV", 2], ["I bVI bVII I", 2], ["IV iv I bVI", 1]], col: ["maj7s11", "add9", "maj7"], scale: "lydian", tempo: [76, 100], feel: "straight", gtr: "arp", tone: "ambient", syn: "glass", kit: "none", groove: "none", why: ["Мажорный II (лидийская ♯4) — самый «волшебный» аккорд киномузыки.", "♭VI – ♭VII – I: неожиданный мажор с другой стороны — как открытие двери в сказку.", "Колокольчики (FM) и стекло — тембры чуда."], tips: ["Колокол или «Стекло» на синтезаторе, арпеджио вверх."] },
  { id: "heroic", g: "Светлые", n: "Героизм и победа", d: "Кульминация фильма, флаг на вершине.", kw: ["геро", "побед", "эпик", "эпич", "триумф", "сила", "мощ", "гимн", "вершин", "битв"], bright: .5, p: [["I bVII IV I", 2], ["I bVI bVII I", 3], ["vi IV I V", 1], ["I V vi iii IV I IV V", 2]], col: ["5", "sus4", "add9"], scale: "mixo", tempo: [88, 120], feel: "straight", gtr: "strum", tone: "lead", syn: "brass", kit: "rock", groove: "epic", why: ["♭VI – ♭VII – I — «победный» каданс (Марио, саундтреки): мажор, пришедший из минора.", "Пауэр-аккорды и sus4 — сила без сложности.", "Медь и большой кит — торжественность."], tips: ["Удары по аккордам на сильные доли + тамы на сбивках."] },
  { id: "playful", g: "Светлые", n: "Игривость и ирония", d: "Хитро, смешно, мультяшно, немного джаза.", kw: ["игрив", "ирон", "смешн", "весёл", "весел", "юмор", "хитр", "мульт", "рэгтайм", "свинг"], bright: .7, p: [["I #i° ii V7", 3], ["I VI7 ii V7", 2], ["I I7 IV iv", 2], ["I bIII IV bVI", 1]], col: ["7", "6", "dim7"], scale: "major", tempo: [110, 140], feel: "swing", gtr: "strum", tone: "clean", syn: "piano", kit: "jazz", groove: "swing", why: ["Проходящий уменьшённый (♯i°) — хроматический «шажок» вверх, звучит хитро.", "Вторичные доминанты (VI7 → ii) — подмигивание, классика рэгтайма.", "Свинг сразу делает музыку улыбчивой."], tips: ["Короткие аккорды стаккато на 2 и 4."] },
  { id: "calm", g: "Светлые", n: "Умиротворение", d: "Медитация, тихое утро, дыхание.", kw: ["спокой", "умиротв", "медит", "тиш", "дыхан", "релакс", "сон", "отдых", "покой"], bright: .5, p: [["Isus2 IVadd9/P Isus2 IVadd9/P", 3], ["Imaj7 IVmaj7 Imaj7 IVmaj7", 2], ["I/P ii/P IV/P I/P", 2]], col: ["sus2", "add9", "maj7"], scale: "penta", tempo: [56, 76], feel: "free", gtr: "pad", tone: "ambient", syn: "pad", kit: "none", groove: "none", why: ["Педаль (тоника в басу под всеми аккордами) — ощущение неподвижности и опоры.", "Двухаккордная качель без доминанты: нечему «разрешаться», нет напряжения.", "sus и add9 не мажорные и не минорные — нейтральное спокойствие."], tips: ["Пэд и длинный ревёрб. На гитаре — аккорды со звучащей открытой струной в басу."] },
  // Тёмные
  { id: "melancholy", g: "Тёмные и грустные", n: "Меланхолия", d: "Тихая грусть без драмы.", kw: ["меланх", "грус", "печал", "тихо", "серо", "одинок", "сплин", "хандр"], bright: -.5, p: [["i VI III VII", 2], ["i iv VI v", 2], ["i7 iv7 VImaj7 V", 2], ["i III VII iv", 1]], col: ["m7", "maj7", "madd9"], scale: "minor", tempo: [64, 84], feel: "straight", gtr: "arp", tone: "clean", syn: "epiano", kit: "acoustic", groove: "ballad", why: ["Натуральный минор без мажорной доминанты — грусть без напряжения и драмы.", "Минорная v вместо V не тянет к разрешению: «ничего не происходит».", "madd9 — грусть с теплом."], tips: ["Медленное арпеджио, басы на открытых струнах (тональность Em или Am)."] },
  { id: "lightsad", g: "Тёмные и грустные", n: "Светлая грусть", d: "Грустно, но красиво: улыбка сквозь слёзы.", kw: ["светл грус", "красив", "трогат", "слез", "щемящ", "лирич", "сентимент"], bright: 0, p: [["vi IV I V", 3], ["vi7 IVmaj7 I Vsus4", 2], ["IV I/3 ii7 vi7", 2], ["i VI III VII", 1]], col: ["add9", "maj7", "m7", "sus4"], scale: "major", tempo: [70, 92], feel: "straight", gtr: "arp", tone: "clean", syn: "strings", kit: "acoustic", groove: "ballad", why: ["Мажорная тональность, начатая с минорного аккорда, — главный рецепт «щемящей» музыки.", "add9 на минорных аккордах делает грусть мягкой.", "Задержание sus4 перед V — вздох."], tips: ["Добавьте струнные во втором круге."] },
  { id: "night", g: "Тёмные и грустные", n: "Ночной город", d: "Один в такси, огни, мокрый асфальт, джаз из окна.", kw: ["ночн", "город", "огни", "такси", "асфальт", "нуар", "noir", "джаз бар", "бар", "одиноч"], bright: -.2, p: [["i9 IV9 i9 IV9", 3], ["i7 bVImaj7 bIImaj7 V7b9", 2], ["iim7b5 V7b9 i9 i9", 2], ["i9 bIIImaj7 bVImaj7 V7s9", 1]], col: ["m9", "9", "maj7", "7b9"], scale: "dorian", tempo: [74, 96], feel: "swing", gtr: "pad", tone: "jazz", syn: "rhodes", kit: "jazz", groove: "swing", why: ["Дорийская вампа i9 – IV9: минор с «надеждой» в мажорной IV — классика ночного соула и эсид-джаза.", "Минорная ii–V (iiø – V7♭9) звучит как нуар-кино.", "Тёмный джаз-звук и щётки — атмосфера бара."], tips: ["Аппликатуры «Компактные» на 4 струнах в средней позиции."] },
  { id: "tension", g: "Тёмные и грустные", n: "Тревога и саспенс", d: "Что-то не так. Триллер, ожидание удара.", kw: ["тревог", "страх", "напряж", "саспенс", "триллер", "ужас", "хоррор", "паник", "опасн"], bright: -.8, p: [["i bII i bII", 2], ["i i/b6 i° bII", 1], ["i bVI V7b9 i", 2], ["i bV i bII", 1]], col: ["dim", "mmaj7", "7b9", "dim7"], scale: "phryg", tempo: [60, 90], feel: "halftime", gtr: "pm", tone: "ambient", syn: "pad", kit: "rock", groove: "halftime", why: ["♭II — полутон над тоникой (фригийский лад): самое тревожное соседство.", "Тритон (♭V) делит октаву пополам — неустойчивость и угроза.", "m(maj7) — «хичкоковский» аккорд: минор с режущей большой септимой."], tips: ["Тремоло медиатором на одной ноте поверх аккордов.", "Низкий строй (Drop D или Drop C) усиливает тяжесть."] },
  { id: "mystic", g: "Тёмные и грустные", n: "Мистика и тёмная сказка", d: "Старый замок, свечи, гармонический минор.", kw: ["мистик", "мистич", "замок", "тёмн сказ", "готик", "ведьм", "загадоч", "таинств", "вампир"], bright: -.5, p: [["i bVI V i", 3], ["i iv V i", 2], ["i bII V i", 1], ["i bVI+ V i", 1]], col: ["", "m", "7", "aug"], scale: "harm", tempo: [64, 96], feel: "sixeight", gtr: "arp", tone: "clean", syn: "choir", kit: "none", groove: "sixeight", why: ["Гармонический минор: мажорная V в миноре и увеличенная секунда в мелодии звучат «старинно» и загадочно.", "♭VI → V — тяжёлый шаг вниз на полтона.", "Хор и размер 6/8 — вальс призраков."], tips: ["Мелодия из гармонического минора, с упором на ♭6 и 7."] },
  { id: "rage", g: "Тёмные и грустные", n: "Ярость и агрессия", d: "Метал, тяжесть, удар в грудь.", kw: ["ярост", "агресс", "злост", "злой", "метал", "тяжел", "тяжёл", "гнев", "бешен", "удар"], bright: -.9, p: [["i5 bII5 i5 bV5", 2], ["i5 bVI5 bVII5 i5", 2], ["i5 bIII5 bII5 i5", 1]], col: ["5"], scale: "phryg", tempo: [100, 170], feel: "straight", gtr: "pm", tone: "metal", syn: "acid", kit: "rock", groove: "metal", why: ["Пауэр-аккорды: только тоника и квинта — максимум веса с перегрузом.", "Фригийская ♭II и тритон ♭V — самые «злые» соседи тоники.", "Палм-мьют галопом и двойная бочка — физическая агрессия."], tips: ["Drop D или Drop C, палм-мьют шестнадцатыми."] },
  { id: "epicdrama", g: "Тёмные и грустные", n: "Драма и эпика", d: "Трагический эпос, финальная битва, трейлер.", kw: ["драм", "трагед", "трейлер", "кино", "эпос", "финал", "грандиоз", "мрачн эпик"], bright: -.3, p: [["i bVI bIII bVII", 3], ["i bVII bVI V", 2], ["i iv bVI V", 2], ["bVI bVII i i", 1]], col: ["sus2", "add9", "m"], scale: "minor", tempo: [80, 110], feel: "straight", gtr: "strum", tone: "lead", syn: "strings", kit: "rock", groove: "epic", why: ["i – ♭VI – ♭III – ♭VII — «трейлерная» последовательность: все аккорды мажорные, кроме тоники, отсюда величие.", "Андалузский спуск i – ♭VII – ♭VI – V — неизбежность.", "Струнные + перегруз — кино."], tips: ["Тамы и крэши на сильные доли, гитара — ровные восьмые."] },
  { id: "despair", g: "Тёмные и грустные", n: "Отчаяние и плач", d: "Ламенто: бас опускается шаг за шагом.", kw: ["отчаян", "плач", "горе", "скорб", "безнадеж", "безнадёж", "потер", "реквием", "ламент"], bright: -.8, p: [["i i/b7 i/b6 V", 3], ["i v/3 iv/3 V", 2], ["i iv i V7b9", 1]], col: ["", "m", "7"], scale: "harm", tempo: [56, 76], feel: "straight", gtr: "arp", tone: "clean", syn: "strings", kit: "none", groove: "none", why: ["Ламенто-бас (lamento): хроматический или диатонический спуск от тоники к доминанте — со времён барокко символ плача.", "Мажорная V в конце — напряжение, которое не приносит облегчения."], tips: ["Играйте бас отдельной линией на 5–6 струне, аккорды сверху."] },
  { id: "dream", g: "Тёмные и грустные", n: "Сон и гипнагогия", d: "Между сном и явью, всё плывёт.", kw: ["сон", "сны", "сновид", "гипна", "плыв", "сюрр", "туман", "мираж", "грез", "грёз"], bright: .1, p: [["Imaj7 bVImaj7 Imaj7 bVImaj7", 2], ["Imaj7 IIImaj7 bVImaj7 bIImaj7", 2], ["Imaj7s5 vi9 IVmaj7 bVII9", 1], ["Imaj9 iii9 bIIImaj7 IVmaj7", 2]], col: ["maj7", "maj9", "maj7s5"], scale: "lydian", tempo: [60, 84], feel: "halftime", gtr: "pad", tone: "ambient", syn: "vapor", kit: "lofi", groove: "lofi", why: ["Хроматические медианты (Imaj7 → ♭VImaj7, → IIImaj7): аккорды на терцию в сторону, с общими нотами, но чужим ладом — пространство «сдвигается».", "Все аккорды одного типа (maj7) — гармония перестаёт тянуть куда-либо, просто плывёт.", "Вибрато синтезатора и длинный ревёрб — нечёткость сна."], tips: ["Гитара на «Эмбиент», аккорды целыми нотами с регулятором громкости (свеллы)."] },
  // Атмосфера и пространство
  { id: "space", g: "Пространство и атмосфера", n: "Космос", d: "Невесомость, звёзды, огромное расстояние.", kw: ["космос", "косм", "звезд", "звёзд", "невесом", "вселен", "галакт", "орбит"], bright: .3, p: [["Imaj7s11 II Imaj7s11 II", 3], ["Isus2 bVIImaj7 IVmaj7 Isus2", 2], ["Imaj9 bVImaj7s11 Imaj9 IImaj7", 1]], col: ["maj7s11", "sus2", "add9"], scale: "lydian", tempo: [60, 80], feel: "free", gtr: "pad", tone: "ambient", syn: "pad", kit: "none", groove: "none", why: ["Лидийский лад (♯4) — без «земной» опоры субдоминанты, будто нет гравитации.", "Широкие голоса и sus — пустоты между нотами как расстояния между звёздами."], tips: ["Свеллы громкостью, дилэй 500+ мс, ревёрб на максимум."] },
  { id: "winter", g: "Пространство и атмосфера", n: "Зимняя тишина", d: "Снег, стеклянный воздух, редкие ноты.", kw: ["зим", "снег", "мороз", "холод", "лёд", "лед", "тишин", "рождеств", "новый год"], bright: .2, p: [["Imaj9 vi9 IVmaj7 Vsus4", 2], ["vi9 IVmaj9 Imaj9 V69", 2], ["Iadd9/P IVadd9/P vi7/P IVmaj7/P", 2]], col: ["maj9", "m9", "add9"], scale: "major", tempo: [60, 80], feel: "free", gtr: "chime", tone: "ambient", syn: "glass", kit: "none", groove: "none", why: ["Девятые ступени в верхнем голосе — холодный блеск.", "Колокольчики и стекло — тембр снежинок.", "Редкие ноты с длинным хвостом — тишина вокруг."], tips: ["Флажолеты и открытые струны, капо на 5–7 ладу."] },
  { id: "fog", g: "Пространство и атмосфера", n: "Туман / шугейз", d: "Стена гитар, всё размыто, тепло и громко.", kw: ["шугейз", "shoegaze", "туман", "размыт", "стена", "дримпоп", "dream pop", "фузз"], bright: .1, p: [["I bVI IV I", 2], ["Iadd9 IVadd9 bVImaj7 IVadd9", 2], ["vi IV I bVII", 2]], col: ["add9", "maj7", "sus2"], scale: "mixo", tempo: [84, 110], feel: "halftime", gtr: "strum", tone: "fuzz", syn: "pad", kit: "rock", groove: "halftime", why: ["♭VI в мажоре — тёплое затемнение.", "Аккорды с открытыми струнами под фуззом сливаются в «облако».", "Вокал и мелодия теряются в гармонии — так и задумано."], tips: ["Фузз + ревёрб, бой целыми аккордами, тремоло-рычаг для «плавания»."] },
  { id: "east", g: "Пространство и атмосфера", n: "Восток и пустыня", d: "Караван, жара, фригийский доминантовый лад.", kw: ["восток", "пустын", "араб", "египет", "караван", "жара", "песок", "базар", "ближн"], bright: -.2, p: [["I bII I bII", 2], ["I bII bIII bII", 1], ["I bII iv I", 2]], col: ["", "7"], scale: "phrygdom", tempo: [80, 110], feel: "straight", gtr: "arp", tone: "clean", syn: "flute", kit: "none", groove: "none", tonicMajor: 1, why: ["Фригийский доминантовый лад (5-й лад гармонического минора): мажорная тоника + ♭2 + ♭6 — звук Ближнего Востока.", "Колебание I ↔ ♭II — главный «восточный» мотив."], tips: ["Мелодия по ладу E фригийский доминантовый: E F G♯ A B C D.", "Флейта на синтезаторе, вибрато."] },
  { id: "spain", g: "Пространство и атмосфера", n: "Испания и фламенко", d: "Страсть, гитарные расгеадо, андалузская каденция.", kw: ["испан", "фламенк", "страст", "андалуз", "танго", "латин", "гитара испан"], bright: -.3, p: [["i bVII bVI V", 3], ["iv bIII bII I", 2], ["i bVII bVI V7", 1]], col: ["", "7"], scale: "phrygdom", tempo: [92, 130], feel: "straight", gtr: "strum", tone: "clean", syn: "piano", kit: "none", groove: "none", why: ["Андалузская каденция: нисходящая линия i – ♭VII – ♭VI – V с мажорной V в конце — сердце фламенко.", "Фригийское разрешение ♭II → I."], tips: ["В Am: Am – G – F – E. Расгеадо всеми пальцами по очереди."] },
  { id: "jazzbar", g: "Пространство и атмосфера", n: "Джаз-бар, дождь", d: "Уютный бар, пианист, дождь по стеклу.", kw: ["джаз", "бар", "пианист", "уютн", "дожд", "кафе", "ресторан", "босса"], bright: .2, p: [["ii7 V7 Imaj7 VI7b9", 3], ["Imaj7 VI7 ii7 V7", 2], ["iii7 VI7 ii7 V7", 2], ["ii7 bII7 Imaj7 Imaj7", 2]], col: ["maj7", "m7", "7", "9", "13"], scale: "major", tempo: [90, 132], feel: "swing", gtr: "pad", tone: "jazz", syn: "rhodes", kit: "jazz", groove: "swing", why: ["Цепочка ii–V–I и вторичные доминанты — язык джазовых стандартов.", "Тритоновая замена (♭II7 вместо V7): бас скользит по полутону вниз к тонике.", "Щётки и тёмный тон гитары — интимность."], tips: ["Аппликатуры «Компактные»: 4 струны, без баррэ."] },
  // Энергия
  { id: "road", g: "Энергия и драйв", n: "Дорога и свобода", d: "Открытое шоссе, рок, ветер.", kw: ["дорог", "свобод", "шоссе", "путешеств", "рок", "трасс", "мотоцикл", "драйв"], bright: .6, p: [["I bVII IV I", 3], ["I V bVII IV", 2], ["I IV bVII IV", 2]], col: ["5", "sus4", "add9"], scale: "mixo", tempo: [110, 140], feel: "straight", gtr: "strum", tone: "crunch", syn: "organ", kit: "rock", groove: "rock", why: ["Миксолидийская ♭VII — звук классического рока и кантри-рока.", "Плагальное движение IV → I вместо V → I — без «школьного» разрешения, свободно."], tips: ["Кранч, открытые аккорды и бой восьмыми с акцентами."] },
  { id: "rebel", g: "Энергия и драйв", n: "Бунт / панк", d: "Быстро, громко, три аккорда и правда.", kw: ["бунт", "панк", "протест", "быстр", "громк", "дерзк", "молодост", "гараж"], bright: .3, p: [["I5 IV5 V5 IV5", 2], ["I5 bVII5 IV5 I5", 2], ["vi5 IV5 I5 V5", 1]], col: ["5"], scale: "mpenta", tempo: [160, 200], feel: "straight", gtr: "pm", tone: "crunch", syn: "acid", kit: "rock", groove: "punk", why: ["Пауэр-аккорды восьмыми вниз и темп 170+ — энергия на пределе.", "Простая гармония оставляет всё место ритму."], tips: ["Только удары вниз, палм-мьют в куплете, открыто в припеве."] },
  { id: "groove", g: "Энергия и драйв", n: "Грув и фанк", d: "Качать головой, бас и шестнадцатые.", kw: ["грув", "фанк", "funk", "качает", "диско", "соул", "кач", "groove"], bright: .3, p: [["i7 IV9 i7 IV9", 3], ["I9 IV9 I9 V9", 2], ["i9 iv9 bVII9 i9", 1]], col: ["9", "m7", "7s9", "13"], scale: "dorian", tempo: [92, 112], feel: "straight", gtr: "offbeat", tone: "clean", syn: "rhodes", kit: "acoustic", groove: "funk", why: ["Дорийская вампа — минор с мажорной IV: кайф без драмы.", "Нонаккорды и 7♯9 — фирменные аккорды фанка.", "Ритм важнее гармонии: два аккорда на весь куплет."], tips: ["Шестнадцатые с глушением левой рукой, аккорды на 4 верхних струнах."] }
];
MOODS.forEach(m => m.p.forEach(pp => { if (/^i(?![iv])/.test(pp[0])) pp[0] = pp[0].split(" ").map(t => /^(VI|III|VII)/.test(t) ? "b" + t : t).join(" ") }));
const MOOD_GROUPS = [...new Set(MOODS.map(m => m.g))];
const MOOD_GROOVES = {
  pop: { bpm: 0, t: { hhc: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x------xx-------" } },
  ballad: { t: { hhc: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------x-x-----" } },
  lofi: { swing: .18, t: { hhc: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-------xx----x-" } },
  synthwave: { t: { hhc: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x---x---x---x---" } },
  house: { t: { hho: "--x---x---x---x-", hhc: "x-x-x-x-x-x-x-x-", clap: "----x-------x---", kick: "x---x---x---x---" } },
  epic: { t: { crash: "x---------------", tom3: "x---x---x---x-x-", snare: "----x-------x---", kick: "x-------x-------" } },
  swing: { swing: .3, t: { ride: "x-x-x-x-x-x-x-x-", hhc: "----x-------x---", kick: "x-------x-------" } },
  halftime: { t: { hhc: "x-x-x-x-x-x-x-x-", snare: "--------x-------", kick: "x-----x-------x-" } },
  sixeight: { t: { hhc: "x-x-x-x-x-x-x-x-", snare: "------x-------x-", kick: "x-------x-------" } },
  metal: { t: { crash: "x-------x-------", snare: "----x-------x---", kick: "x-xxx-xxx-xxx-xx" } },
  rock: { t: { hhc: "x-x-x-x-x-x-x-x-", snare: "----x-------x---", kick: "x-x-----x-x-----" } },
  punk: { t: { crash: "x-x-x-x-x-x-x-x-", snare: "--x---x---x---x-", kick: "x---x---x---x---" } },
  funk: { t: { hhc: "x-x-x-x-x-x-x-x-", snare: "----X--g-g--X--g", kick: "x-x-------x--x--" } },
  none: { t: {} }
};
const GROOVE_NAMES = { pop: "Поп", ballad: "Баллада", lofi: "Лоу-фай", synthwave: "Синтвейв", house: "Хаус", epic: "Эпик", swing: "Свинг", halftime: "Халф-тайм", sixeight: "6/8", metal: "Метал", rock: "Рок", punk: "Панк", funk: "Фанк", none: "Без барабанов" };
const GTR_PATTERNS = { arp: "Арпеджио", chime: "Перезвон", strum: "Бой", pm: "Глушёные восьмые", pad: "Целыми", offbeat: "Офбит", travis: "Трэвис" };

/* ---------- harmonic devices (knowledge base) ---------- */
const DEVICES = [
  { n: "Заимствованная iv", e: "ностальгия, сожаление", how: "В мажоре сыграть минорную субдоминанту (в C: Fm). Чаще всего IV → iv → I.", ex: "I IV iv I" },
  { n: "Хроматические медианты", e: "сон, сюрреализм, кино", how: "Аккорд на большую/малую терцию от тоники с «чужим» ладом: C → A♭, C → E, C → E♭. Одна общая нота, остальные двигаются на полтона.", ex: "Imaj7 bVImaj7 IIImaj7 Imaj7" },
  { n: "Лидийская II", e: "чудо, удивление, небо", how: "Мажорный аккорд на второй ступени (в C: D) — появляется ♯4 (F♯).", ex: "I II IV I" },
  { n: "Миксолидийская ♭VII", e: "свобода, рок, лето", how: "Мажорный аккорд на тон ниже тоники (в C: B♭).", ex: "I bVII IV I" },
  { n: "Победный ♭VI – ♭VII – I", e: "героизм, триумф", how: "Два мажорных аккорда из минора ведут к мажорной тонике.", ex: "I bVI bVII I" },
  { n: "Андалузская каденция", e: "страсть, неизбежность", how: "Нисходящая линия в миноре с мажорной V: Am – G – F – E.", ex: "i bVII bVI V" },
  { n: "Фригийская ♭II", e: "тревога, восток, метал", how: "Аккорд на полтона выше тоники (в E: F).", ex: "i bII i bII" },
  { n: "Педаль", e: "спокойствие, гипноз, напряжение", how: "Одна басовая нота держится, аккорды сверху меняются.", ex: "I/P IV/P ii/P I/P" },
  { n: "Ламенто-бас", e: "плач, драма", how: "Бас спускается от тоники к доминанте по ступеням.", ex: "i i/b7 i/b6 V" },
  { n: "Вторичная доминанта", e: "движение, подмигивание", how: "Доминанта к любому аккорду тональности: в C перед Am сыграть E7.", ex: "I III7 vi IV" },
  { n: "Тритоновая замена", e: "джаз, гладкость", how: "Вместо V7 — доминанта на тритон выше (в C вместо G7 — D♭7). Бас скользит на полтона.", ex: "ii7 bII7 Imaj7 Imaj7" },
  { n: "Задержание sus4 → 3", e: "вздох, ожидание", how: "Сначала кварта вместо терции, потом разрешение.", ex: "Vsus4 V I I" },
  { n: "Пикардийская терция", e: "свет в конце, катарсис", how: "Минорная пьеса заканчивается мажорной тоникой.", ex: "i iv V I" },
  { n: "Дорийская IV", e: "надежда в миноре, фанк, соул", how: "В миноре мажорная IV (в Am: D).", ex: "i IV i IV" },
  { n: "Проходящий уменьшённый", e: "хитрость, ретро, бродвей", how: "Между I и ii вставить ♯i° (в C: C♯°).", ex: "I #i° ii V7" },
  { n: "Минор с большой септимой", e: "саспенс, шпионский фильм", how: "Am(maj7): к минорному трезвучию добавить ноту на полтона ниже тоники.", ex: "i imaj7 i7 i6" }
];

/* ---------- generator ---------- */
function moodMatch(text) {
  const t = text.toLowerCase().replace(/ё/g, "е"); if (!t.trim()) return [];
  const words = t.split(/[^a-zа-я0-9-]+/).filter(w => w.length > 2);
  return MOODS.map(m => { let s = 0; for (const k of m.kw) { const kk = k.replace(/ё/g, "е"); if (t.includes(kk)) s += 3; else if (words.some(w => kk.startsWith(w.slice(0, 5)) || w.startsWith(kk.slice(0, 5)))) s += 1 } if (t.includes(m.n.toLowerCase())) s += 5; return { m, s } }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.m);
}
const GUITAR_KEYS_MAJ = [4, 9, 2, 7, 0], GUITAR_KEYS_MIN = [4, 9, 2, 7, 11];
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000 } }
function wpick(r, arr) { const tot = arr.reduce((a, x) => a + x[1], 0); let v = r() * tot; for (const x of arr) { v -= x[1]; if (v <= 0) return x[0] } return arr[0][0] }
function upgrade(type, deg, col, c, r, minor) {
  if (col[0] === "" && c < .85) return deg === 7 && type === "" && minor ? "7" : type;
  if (deg === 7 && type === "") { if (minor) return c > .7 && r() < .4 ? "7b9" : "7"; return pick2(r, c > .75 ? ["13", "9", "7sus4"] : c > .5 ? ["7", "7sus4", "add9", "sus4"] : ["add9", "sus4", ""]) }
  if (c < .3 || ["5", "dim", "dim7", "aug", "m7b5", "7b9", "13", "maj9", "m9", "m11", "69", "maj7s11", "7s9", "mmaj7"].includes(type)) return type;
  const lvl = c < .55 ? 1 : c < .8 ? 2 : 3;
  if (type === "") { const opt = lvl === 1 ? ["add9", "maj7", "6", "sus2"] : lvl === 2 ? ["maj7", "add9", "69"] : ["maj9", "69", "maj7s11"]; const pref = col.filter(x => opt.includes(x)); const list = pref.length && r() < .75 ? pref : opt; return list[Math.floor(r() * list.length)] }
  if (type === "m") return lvl === 1 ? (r() < .5 ? "m7" : "madd9") : lvl === 2 ? "m7" : (r() < .6 ? "m9" : "m11");
  if (type === "7") return lvl >= 2 ? (r() < .5 ? "9" : "13") : "7";
  if (type === "maj7") return lvl >= 3 ? "maj9" : "maj7";
  if (type === "m7") return lvl >= 3 ? "m9" : "m7";
  if (type === "sus4" && lvl >= 2) return "7sus4";
  return type;
}
function generateHarmony(cfg) {
  const r = rng(cfg.seed || 1);
  const moods = cfg.moods.length ? cfg.moods : [MOODS[0]];
  const main = moods[0];
  // pick template among the selected moods (main mood weighs double)
  const pool = []; moods.forEach((m, i) => m.p.forEach(([p, w]) => pool.push([{ p, m }, w * (i === 0 ? 2 : 1)])));
  const pickT = wpick(r, pool), mood = pickT.m;
  let toks = pickT.p.split(/\s+/).map(parseRoman).filter(Boolean);
  const first = pickT.p.split(/\s+/)[0], minorCenter = !mood.tonicMajor && /^i(?![iv])/.test(first);
  const col = [...new Set(moods.flatMap(m => m.col))];
  // length 8: second half varies the ending
  if (cfg.len === 8 && toks.length === 4) { const second = toks.slice(); if (cfg.end === "closed") second[3] = parseRoman(minorCenter ? "i" : "I"); toks = toks.concat(second) }
  const used = new Set();
  // nostalgia: borrowed iv after a IV / replace last IV
  if (cfg.nost > .45 && !minorCenter) { for (let i = 0; i < toks.length; i++) if (toks[i].deg === 5 && toks[i].type === "" && r() < (cfg.nost - .35) * 1.4) { toks.splice(i + 1, 0, parseRoman("iv")); used.add("Заимствованная iv"); break } }
  // brightness: borrowed bVI darkening / brightening iv→IV
  if (cfg.bright < -.35 && !minorCenter && r() < -cfg.bright) { const i = toks.findIndex(t => t.deg === 9); if (i >= 0) { toks[i] = parseRoman("bVI"); used.add("Хроматические медианты") } }
  if (cfg.bright > .45 && minorCenter) { const i = toks.findIndex(t => t.deg === 5 && t.type.startsWith("m")); if (i >= 0 && r() < cfg.bright) { toks[i] = parseRoman("IV"); used.add("Дорийская IV") } }
  if (cfg.bright > .75 && minorCenter && cfg.end === "closed") { toks.push(parseRoman("I")); used.add("Пикардийская терция") }
  // tension: secondary dominants, sus delays, tritone sub
  if (cfg.tens > .35) for (let i = 1; i < toks.length; i++) { const t = toks[i]; if (r() < cfg.tens * .35 && t.deg !== 7 && t.deg !== 0 && !t.slash) { toks.splice(i, 0, Object.assign(parseRoman("V7"), { deg: pcOf(t.deg + 7), tok: "V7/" + t.tok })); used.add("Вторичная доминанта"); i++ } }
  if (cfg.tens > .6) { const i = toks.findIndex(t => t.deg === 7 && (t.type === "" || t.type === "7")); if (i >= 0) { if (r() < .5) { toks[i] = Object.assign(parseRoman("bII7"), { tok: "bII7" }); used.add("Тритоновая замена") } else { toks[i].type = "7b9"; } } }
  if (cfg.tens > .2 && cfg.tens < .6) { const i = toks.findIndex(t => t.deg === 7 && t.type === ""); if (i >= 0 && r() < .6) { toks.splice(i, 0, Object.assign(parseRoman("Vsus4"), {})); used.add("Задержание sus4 → 3") } }
  // cadence
  if (cfg.end === "closed") { const last = toks[toks.length - 1]; if (last.deg !== 0) toks.push(parseRoman(minorCenter ? "i" : "I")) }
  else if (cfg.end === "open") { const last = toks[toks.length - 1]; if (last.deg === 0 && toks.length > 2) toks[toks.length - 1] = parseRoman(minorCenter ? "bVII" : "V") }
  // colour upgrade
  toks = toks.map(t => Object.assign({}, t, { type: upgrade(t.type, t.deg, col, cfg.cplx, r, minorCenter) }));
  // key
  let key = cfg.key;
  if (key == null) { const pref = cfg.inst === "synth" || cfg.inst === "keys" ? [0, 2, 5, 7, 9, 10, 3] : minorCenter ? GUITAR_KEYS_MIN : GUITAR_KEYS_MAJ; key = minorCenter ? pcOf(pick2(r, pref)) : pick2(r, pref) }
  // bass handling
  const chords = toks.map((t, i) => {
    const root = pcOf(key + t.deg); let bass = root;
    if (t.slash) { const s = t.slash; if (s === "P") bass = key; else if (/^\d$/.test(s)) { const ivs = CHORDS[t.type].s; const idx = { 3: 1, 5: 2, 7: 3 }[s] ?? 0; bass = pcOf(root + (ivs[idx] ?? 0)) } else { const sb = /^([b#]?)(\d)$/.exec(s); if (sb) { const deg = [0, 0, 2, 4, 5, 7, 9, 11][+sb[2]] + (sb[1] === "b" ? -1 : sb[1] === "#" ? 1 : 0); bass = pcOf(key + deg) } } }
    const fl = /^b/.test(t.tok) || undefined; return { root, type: t.type, bass, fl, roman: romanShow(t.tok), name: chordName(root, t.type, bass, key, fl) };
  });
  if (cfg.bass === "pedal") chords.forEach(c => { c.bass = key; c.name = chordName(c.root, c.type, c.bass, key, c.fl); used.add("Педаль") });
  if (cfg.bass === "desc") { let prev = null; chords.forEach((c, i) => { const tones = CHORDS[c.type].s.slice(0, 3).map(x => pcOf(c.root + x)); if (prev == null) { prev = c.bass; return } let best = c.bass, bd = 99; for (const tn of tones) { const d = pcOf(prev - tn); if (d > 0 && d < bd) { bd = d; best = tn } } c.bass = best; c.name = chordName(c.root, c.type, c.bass, key, c.fl); prev = best }); used.add("Ламенто-бас") }
  // tempo / rhythm
  const [t0, t1] = mood.tempo; const bpm = cfg.bpm || Math.round(t0 + (t1 - t0) * (.3 + cfg.move * .7));
  const per = cfg.move > .7 ? 2 : cfg.move < .25 && chords.length <= 4 ? 8 : 4; // beats per chord
  // template devices
  DEVICES.forEach(d => { if (d.ex && pickT.p.replace(/maj7|add9|9|7|sus4|sus2|6\/9|s11/g, "") === d.ex.replace(/maj7|add9|9|7|sus4|sus2|6\/9|s11/g, "")) used.add(d.n) });
  return { chords, key, minor: minorCenter, mood, moods, bpm, per, template: pickT.p, used: [...used], feel: mood.feel, scale: mood.scale };
}
function pick2(r, arr) { return arr[Math.floor(r() * arr.length) % arr.length] }
function chordName(root, type, bass, key, fl) {
  const flatKey = fl || [5, 10, 3, 8, 1, 6].includes(pcOf(key)) || [3, 8, 10].includes(pcOf(root));
  const nm = r => nn(r, { ru: 0, flat: flatKey });
  return nm(root) + chShow(type) + (bass != null && pcOf(bass) !== pcOf(root) ? "/" + nm(bass) : "");
}

/* ---------- playback ---------- */
function harmonyPlayer(H, opt) {
  // opt: inst ('guitar'|'keys'|'synth'), pattern, voicings (guitar), kv (keys voicings), groove name, onChord(i)
  const steps = H.per * 4, n = H.chords.length, total = n * steps;
  const G = MOOD_GROOVES[opt.groove] || MOOD_GROOVES.none;
  let held = [];
  const clk = new Clock({ bpm: H.bpm, div: 4, swing: G.swing || (H.feel === "swing" ? .28 : 0), onStep: (st, t, d) => {
    const i = Math.floor((st % total) / steps), s = st % steps, beat = s / 4;
    const c = H.chords[i];
    if (s === 0) { AU.at(t, () => opt.onChord && opt.onChord(i)); held.forEach(h => h && h.stop(t)); held = [] }
    // drums
    const gs = s % 16; for (const k in G.t) { const ch = G.t[k][gs]; if (ch === "x" || ch === "X" || ch === "g") AU.drum(k, t, (ch === "X" ? 1 : ch === "g" ? .28 : .72) * .85) }
    if (opt.inst === "guitar") guitarStep(opt.pattern, opt.voicings[i], s, t, d, steps, opt.tone);
    else {
      const kv = opt.kv[i], preset = opt.inst === "synth" ? opt.preset : "epiano";
      if (s === 0) { held = kv.rh.map(m => AU.noteOn(m, t, .6, preset)); held.push(AU.noteOn(kv.lh, t, .7, opt.inst === "synth" ? "bass" : "epiano")) }
      if (opt.inst === "synth" && opt.pattern === "arp") { if (s % 2 === 0) { const seq = kv.rh.concat(kv.rh.map(x => x + 12)); AU.note(seq[(s / 2) % seq.length], t, d * 1.6, .5, "pluck") } }
      if (s === steps - 1) held.forEach(h => h && h.stop(t + d * .9));
    }
    if (st > 0 && st % total === 0) practiceTick("harmony");
  } });
  return { start: () => clk.start(), stop: () => { clk.stop(); held.forEach(h => h && h.stop()); held = [] }, get running() { return clk.running }, clk };
}
function guitarStep(pat, v, s, t, d, steps, tone) {
  if (!v) return; const tun = tuning(); const strs = [0, 1, 2, 3, 4, 5].filter(i => v.f[i] >= 0), m = i => tun[i] + v.f[i];
  const bassS = strs[0], top = strs.slice(1);
  const o = { tone };
  const strum = (up, vel, mute) => AU.strum(strs.map(m), t, { up, vel, speed: up ? .012 : .017, tone, mute });
  switch (pat) {
    case "strum": { const map = { 0: ["d", .85], 4: ["d", .7], 6: ["u", .55], 10: ["u", .55], 12: ["d", .7], 14: ["u", .5] }; const x = map[s % 16]; if (x) strum(x[0] === "u", x[1]); break }
    case "pm": { if (s % 2 === 0) { const acc = s % 8 === 0; AU.pluck(m(bassS), t, acc ? .95 : .75, { tone, mute: !acc, dur: acc ? d * 3 : .18 }); if (strs[1] != null && acc) AU.pluck(m(strs[1]), t + .005, .8, { tone, dur: d * 3 }) } break }
    case "pad": { if (s === 0) strum(false, .7); break }
    case "offbeat": { if (s % 4 === 2) AU.strum(top.slice(-4).map(m), t, { speed: .006, vel: .7, tone, dur: .14 }); if (s === 0) AU.pluck(m(bassS), t, .8, o); break }
    case "travis": { if (s % 4 === 0) { const b = (s / 4) % 2 === 0 ? bassS : (strs[1] ?? bassS); AU.pluck(m(b), t, .8, Object.assign({ mute: true }, o)) } if (s % 4 === 2) { const tt = top.slice(-3); AU.pluck(m(tt[(s / 2) % tt.length] ?? bassS), t, .65, o) } break }
    case "chime": { if (s === 0) AU.pluck(m(bassS), t, .85, o); if (s % 2 === 0 && s > 0) { const hi = top.slice(-3); const idx = [0, 1, 2, 1, 2, 1, 0, 2][(s / 2) % 8] % hi.length; AU.pluck(m(hi[idx]), t, .55 + ((s / 2) % 4 === 0 ? .15 : 0), o) } break }
    default: { // arp
      if (s % 2 === 0) { const order = [bassS].concat(top, top.slice(0, -1).reverse()); const k = (s / 2) % order.length; AU.pluck(m(order[k]), t, k === 0 ? .85 : .6, o) }
    }
  }
}
function harmonyTab(H, voicings, pat) {
  // one pass through the progression, condensed to 8 eighth-notes per chord max
  const notes = [];
  H.chords.forEach((c, i) => {
    const v = voicings[i]; if (!v) return; const strs = [0, 1, 2, 3, 4, 5].filter(s => v.f[s] >= 0), tabS = s => 6 - s;
    if (pat === "strum" || pat === "pad" || pat === "pm" || pat === "offbeat") {
      const hits = pat === "pad" ? [4] : pat === "pm" ? [.5, .5, .5, .5, .5, .5, 1] : pat === "offbeat" ? [1, 1, 1, 1] : [1, .5, 1, .5, 1];
      hits.forEach((d, j) => { if (pat === "pm" && j < 6) notes.push([tabS(strs[0]), v.f[strs[0]], d, { m: 1 }]); else notes.push([strs.map(tabS), strs.map(s => v.f[s]), d, { strum: 1 }]) });
    } else {
      const top = strs.slice(1), order = pat === "chime" ? [strs[0]].concat([0, 1, 2, 1, 2, 1, 0].map(k => top.slice(-3)[k % Math.max(1, top.slice(-3).length)])) : [strs[0]].concat(top, top.slice(0, -1).reverse()).slice(0, 8);
      order.forEach(s => notes.push([tabS(s), v.f[s], .5]));
    }
  });
  return notes;
}

/* ---------- UI ---------- */
function toolHarmony() {
  const S = Object.assign({ moods: ["aero"], bright: .6, tens: .2, cplx: .6, nost: .5, move: .45, inst: "guitar", key: null, len: 4, bass: "normal", end: "auto", style: "open", pattern: null, groove: null, tone: null, preset: null, seed: 7, bpm: 0, text: "" }, LS.get("lad_harm", {}));
  const saveS = () => LS.set("lad_harm", S);
  const html = `<div class="hero" style="padding:18px 20px"><small style="color:var(--cc);font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase">База знаний гармонии</small><h1 style="font-size:24px">Настроение → аккорды</h1><p>Опишите словами или выберите настроения, подкрутите оттенки — получите последовательность, аппликатуры, табы и звук.</p></div>
  <div class="search" style="margin-top:14px"><span>${IC.spark}</span><input id="hText" placeholder="Например: ностальгия по лету 2000-х, светло и немного грустно" value="${esc(S.text)}"></div>
  <div class="ctrl" style="margin-top:0"><button class="btn primary sm" id="hFind">Подобрать по описанию</button><button class="btn soft sm" id="hAI">${IC.chat}Уточнить с ИИ</button></div>
  <div id="hMoods"></div>
  <div class="sec"><h2>Оттенки</h2><button id="hRand">Случайно</button></div>
  <div class="knobs" id="hKnobs"></div>
  <div class="sec"><h2>Параметры</h2></div>
  <div class="panel"><div class="set col"><div class="k"><b>Инструмент</b></div>${segHTML("hInst", [["guitar", "Гитара"], ["keys", "Клавиши"], ["synth", "Синтезатор"]], S.inst)}</div>
  <div class="set col"><div class="k"><b>Тональность</b><small>«Авто» выбирает удобную для инструмента</small></div><div class="chips" id="hKey"></div></div>
  <div class="set col"><div class="k"><b>Аккордов</b></div>${segHTML("hLen", [[4, "4"], [8, "8"]], S.len)}</div>
  <div class="set col"><div class="k"><b>Бас</b></div>${segHTML("hBass", [["normal", "Обычный"], ["pedal", "Педаль"], ["desc", "Нисходящий"]], S.bass)}</div>
  <div class="set col"><div class="k"><b>Финал</b></div>${segHTML("hEnd", [["auto", "Как в шаблоне"], ["closed", "Закрытый"], ["open", "Открытый"]], S.end)}</div>
  <div class="set col"><div class="k"><b>Аппликатуры</b></div>${segHTML("hStyle", [["open", "Открытые струны"], ["compact", "Компактные"], ["high", "Высокие позиции"]], S.style)}</div></div>
  <div class="ctrl"><button class="btn primary grow" id="hGo">${IC.refresh}Собрать гармонию</button><button class="btn soft" id="hFav">Избранное</button></div>
  <div id="hOut"></div>
  <div class="sec"><h2>Приёмы и эмоции</h2><span>нажмите, чтобы услышать</span></div><div class="panel" id="hDev">${DEVICES.map((d, i) => `<button class="set" data-dev="${i}"><span class="k"><b>${esc(d.n)}</b><small>${esc(d.e)} · ${esc(d.how)}</small></span><span class="v">${IC.play.replace("<svg", '<svg style="width:16px;height:16px;color:var(--accent)"')}</span></button>`).join("")}</div>`;
  let player = null, H = null;
  const el = openLayer("Гармония", html, { cc: "styles", onClose: () => { player && player.stop(); saveS() } });
  const q = s => el.querySelector(s);
  const drawMoods = () => {
    q("#hMoods").innerHTML = MOOD_GROUPS.map(g => `<div class="sec"><h2>${esc(g)}</h2></div><div class="chips">${MOODS.filter(m => m.g === g).map(m => { const idx = S.moods.indexOf(m.id); return `<button class="chip ${idx >= 0 ? "on" : ""}" data-mood="${m.id}" title="${esc(m.d)}">${idx === 0 ? "★ " : ""}${esc(m.n)}</button>` }).join("")}</div>`).join("") + `<p class="note">До трёх настроений сразу. Первое (★) главное, остальные смешиваются с ним.</p>`;
    $$("[data-mood]", q("#hMoods")).forEach(b => b.onclick = () => { const id = b.dataset.mood, i = S.moods.indexOf(id); if (i >= 0) S.moods.splice(i, 1); else { S.moods.push(id); if (S.moods.length > 3) S.moods.shift() } applyMoodDefaults(); drawMoods(); build() });
  };
  const applyMoodDefaults = () => { const m = MOODS.find(x => x.id === S.moods[0]); if (!m) return; S.bright = m.bright; S.nost = m.g === "Ностальгия и ретро" ? (m.id === "warm" || m.id === "bitter" ? .85 : .6) : .25; S.tens = m.bright < -.6 ? .6 : m.id === "jazzbar" || m.id === "night" ? .45 : .2; S.cplx = (m.col[0] === "" || m.col[0] === "5") ? .2 : ["lofi", "vapor", "jazzbar", "night", "aero", "midwest", "dream"].includes(m.id) ? .75 : .5; S.pattern = null; S.groove = null; S.tone = null; S.preset = null; drawKnobs() };
  const KN = [["bright", "Свет ↔ тьма", -1, 1, v => v > .3 ? "светло" : v < -.3 ? "темно" : "между"], ["nost", "Ностальгия", 0, 1, v => Math.round(v * 100) + "%"], ["tens", "Напряжение", 0, 1, v => Math.round(v * 100) + "%"], ["cplx", "Цвет аккордов", 0, 1, v => v < .3 ? "трезвучия" : v < .55 ? "add9, 6, 7" : v < .8 ? "септаккорды" : "9, 11, 13"], ["move", "Движение", 0, 1, v => v > .7 ? "2 доли на аккорд" : v < .25 ? "2 такта" : "такт на аккорд"], ["bpm", "Темп", 0, 200, v => v ? v + " BPM" : "авто"]];
  const drawKnobs = () => {
    q("#hKnobs").innerHTML = KN.map(([k, n, a, b, f]) => `<div class="kn"><label>${n}<output>${f(S[k])}</output></label><input type="range" data-hk="${k}" min="${a}" max="${b}" step="${k === "bpm" ? 2 : .05}" value="${S[k]}"></div>`).join("");
    $$("[data-hk]", q("#hKnobs")).forEach(i => i.oninput = () => { const k = i.dataset.hk; S[k] = +i.value; if (k === "bpm" && S.bpm < 40) S.bpm = 0; i.previousElementSibling.querySelector("output").textContent = KN.find(x => x[0] === k)[4](S[k]); clearTimeout(i._t); i._t = setTimeout(build, 250) });
  };
  const drawKeys = () => { q("#hKey").innerHTML = `<button class="chip ${S.key == null ? "on" : ""}" data-k="">Авто</button>` + ROOTS.map(r => `<button class="chip ${S.key === r ? "on" : ""}" data-k="${r}">${nn(r, { ru: 0, flat: [10, 3, 8].includes(r) })}</button>`).join(""); $$("[data-k]", q("#hKey")).forEach(b => b.onclick = () => { S.key = b.dataset.k === "" ? null : +b.dataset.k; drawKeys(); build() }) };
  drawMoods(); drawKnobs(); drawKeys();
  bindSeg(el, "hInst", v => { S.inst = v; S.pattern = null; build() }); bindSeg(el, "hLen", v => { S.len = +v; build() }); bindSeg(el, "hBass", v => { S.bass = v; build() }); bindSeg(el, "hEnd", v => { S.end = v; build() }); bindSeg(el, "hStyle", v => { S.style = v; render2() });
  q("#hGo").onclick = () => { S.seed = (S.seed * 1103515245 + 12345) % 2147483647; build(true) };
  q("#hRand").onclick = () => { ["tens", "cplx", "nost", "move"].forEach(k => S[k] = Math.round(Math.random() * 20) / 20); S.bright = Math.round((Math.random() * 2 - 1) * 20) / 20; drawKnobs(); S.seed++; build() };
  q("#hFind").onclick = () => { S.text = q("#hText").value; const ms = moodMatch(S.text); if (!ms.length) { toast("Не нашёл подходящих настроений — выберите вручную или спросите ИИ"); return } S.moods = ms.map(m => m.id); applyMoodDefaults(); const t = S.text.toLowerCase(); if (/груст|печал|тоск/.test(t)) S.bright = Math.min(S.bright, 0); if (/светл|радост|весел/.test(t)) S.bright = Math.max(S.bright, .4); if (/ностальг|воспомин|детств/.test(t)) S.nost = Math.max(S.nost, .7); if (/напряж|трев|страш/.test(t)) S.tens = Math.max(S.tens, .6); if (/сложн|джаз/.test(t)) S.cplx = Math.max(S.cplx, .8); if (/прост/.test(t)) S.cplx = .2; drawKnobs(); drawMoods(); build(true); toast("Подобрал: " + ms.map(m => m.n).join(", ")) };
  q("#hText").onkeydown = e => { if (e.key === "Enter") q("#hFind").click() };
  q("#hAI").onclick = () => harmonyAI(q("#hText").value, S, h => { H = h; render2(); q("#hOut").scrollIntoView({ behavior: "smooth" }) });
  q("#hFav").onclick = () => harmonyFavs(h => { H = h; render2() });
  $$("[data-dev]", el).forEach(b => b.onclick = () => { const d = DEVICES[+b.dataset.dev]; const h = fromRoman(d.ex, S.key ?? 0, 84); playOnce(h) });
  const playOnce = h => { player && player.stop(); const kv = keyVoicings(h.chords); player = harmonyPlayer(Object.assign({}, h, { per: 4 }), { inst: "keys", kv, groove: "none" }); player.start(); const len = h.chords.length * 4 * 60 / h.bpm; setTimeout(() => player && player.stop(), len * 1000 + 300) };
  const build = (scroll) => {
    const moods = S.moods.map(id => MOODS.find(m => m.id === id)).filter(Boolean);
    H = generateHarmony({ moods, bright: S.bright, tens: S.tens, cplx: S.cplx, nost: S.nost, move: S.move, inst: S.inst, key: S.key, len: S.len, bass: S.bass, end: S.end, seed: S.seed, bpm: S.bpm });
    saveS(); render2(); if (scroll === true) q("#hOut").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const render2 = () => {
    if (!H) return; const was = player && player.running; player && player.stop(); player = null;
    const m = H.mood, pat = S.pattern || m.gtr, groove = S.groove || m.groove, tone = S.tone || m.tone, preset = S.preset || m.syn;
    const vs = H.chords.map(c => findVoicings(c.root, c.type, c.bass, S.style, 3));
    const sel = H.chords.map(() => 0);
    const kv = keyVoicings(H.chords);
    const keyName = nn(H.key, { ru: 0, flat: [5, 10, 3, 8, 1].includes(H.key) }) + (H.minor ? " минор" : " мажор");
    const dly = Math.round(60000 / H.bpm * .75);
    const devs = H.used.map(n => DEVICES.find(d => d.n === n)).filter(Boolean);
    let h = `<div class="sec"><h2>Результат</h2><span>${esc(keyName)} · ${H.bpm} BPM</span></div>
    <div class="panel" style="padding:16px"><div class="wcap" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:10px"><b style="font:700 18px var(--f-head)">${esc(H.moods.map(x => x.n).join(" + "))}</b><span class="note" style="margin:0">${esc(m.d)}</span></div>
    <div class="chips" id="hCh">${H.chords.map((c, i) => `<button class="chip" data-ci="${i}" style="display:flex;flex-direction:column;align-items:center;padding:8px 14px;line-height:1.2"><span style="font:700 16px var(--f-head)">${esc(c.name)}</span><small style="opacity:.65;font-size:11px">${esc(c.roman)}</small></button>`).join("")}</div>
    <div class="ctrl"><button class="bigplay" id="hPlay" style="width:60px;height:60px">${IC.play}</button>${S.inst === "guitar" ? selHTML("hPat", Object.entries(GTR_PATTERNS), pat) + selHTML("hTone", Object.entries(AU.TONES).map(([k, t]) => [k, t.n]), tone) : selHTML("hPat", [["chords", "Аккорды"], ["arp", "Аккорды + арпеджио"]], S.inst === "synth" && pat === "arp" ? "arp" : "chords") + (S.inst === "synth" ? selHTML("hPre", Object.entries(AU.PRESETS).filter(([k, p]) => !p.hide && !k.startsWith("__")).map(([k, p]) => [k, p.n]), preset) : "")}${selHTML("hGr", Object.entries(GROOVE_NAMES), groove)}</div>
    <div class="ctrl" style="margin-top:0"><button class="btn soft sm" id="hSave">В избранное</button><button class="btn ghost sm" id="hDrum">В драм-машину</button><button class="btn ghost sm" id="hAsk">${IC.chat}Объяснить подробнее</button></div></div>`;
    if (S.inst === "guitar") {
      h += `<div class="sec"><h2>Аппликатуры</h2><span>нажмите, чтобы сменить вариант</span></div><div class="chords" id="hVo">${H.chords.map((c, i) => vs[i].length ? `<button class="chordc" data-vi="${i}"><b>${esc(c.name)}</b><span class="vsvg">${shapeSVG(vs[i][0].f)}</span><small>${vs[i][0].f.map(f => f < 0 ? "x" : f).join(" ")} · ${vs[i].length > 1 ? "1/" + vs[i].length : "1"}</small></button>` : `<div class="chordc"><b>${esc(c.name)}</b><small>нет удобной формы</small></div>`).join("")}</div>`;
      h += `<div id="hTab"></div>`;
    } else {
      h += `<div class="sec"><h2>Голосоведение</h2><span>нажмите аккорд выше</span></div><div class="widget" style="padding:10px" id="hKb"></div><p class="note">Левая рука — бас (красная точка), правая — ближайшее обращение к предыдущему аккорду.</p>`;
    }
    h += `<div class="sec"><h2>Мелодия и импровизация</h2><span>${esc(SCALES[H.scale] ? SCALES[H.scale].n : "")} от ${esc(nn(H.key, { ru: 0 }))}</span></div><div class="widget" style="padding:10px" id="hFb"></div><p class="note">Опирайтесь на 3-ю и 7-ю ступень текущего аккорда, а лад используйте для проходящих нот.</p>`;
    h += `<div class="sec"><h2>Почему так звучит</h2></div><div class="panel" style="padding:16px"><ul style="margin:0;padding-left:18px;line-height:1.55">${m.why.map(w => `<li>${esc(w)}</li>`).join("")}${devs.map(d => `<li><b style="color:var(--accent)">${esc(d.n)}</b> — ${esc(d.how)} (${esc(d.e)})</li>`).join("")}</ul></div>`;
    h += `<div class="sec"><h2>Звук и подача</h2></div><div class="panel" style="padding:16px"><ul style="margin:0;padding-left:18px;line-height:1.55">${m.tips.map(w => `<li>${esc(w)}</li>`).join("")}<li>Гитара: звук «${esc((AU.TONES[tone] || AU.TONES.clean).n)}»; дилэй на пунктирную восьмую = ${dly} мс, на четверть = ${Math.round(60000 / H.bpm)} мс.</li><li>Синтезатор: пресет «${esc((AU.PRESETS[preset] || AU.PRESETS.pad).n)}». Барабаны: кит «${esc((AU.KITS[m.kit] || AU.KITS.acoustic).n)}», грув «${esc(GROOVE_NAMES[groove])}».</li></ul></div>`;
    const out = q("#hOut"); out.innerHTML = h;
    // fretboard
    q("#hFb").innerHTML = fretboardHTML({ frets: 15, small: 1, scale: { root: H.key + 40, type: H.scale in SCALES ? H.scale : (H.minor ? "minor" : "major") }, labels: "int" }); W.mount(q("#hFb"));
    let kb = null;
    if (S.inst !== "guitar") { q("#hKb").innerHTML = keyboardHTML({ from: 36, to: 79, labels: 1, small: 1, ref: w => kb = w }); W.mount(q("#hKb")) }
    const showChord = i => { $$("#hCh .chip", out).forEach((c, j) => c.classList.toggle("on", j === i)); $$("#hVo .chordc", out).forEach((c, j) => c.classList.toggle("on", j === i)); if (kb) { const set = new Set(kv[i].rh.concat([kv[i].lh])); kb._hl(set, H.chords[i].bass) } };
    const playChord = i => { AU.init(); if (S.inst === "guitar") { const v = vs[i][sel[i]]; if (v) AU.strum(v.f.map((f, s) => f < 0 ? null : tuning()[s] + f).filter(x => x != null), 0, { speed: .02, tone }) } else { kv[i].rh.forEach(n => AU.note(n, 0, 1.4, .6, S.inst === "synth" ? preset : "epiano")); AU.note(kv[i].lh, 0, 1.4, .7, S.inst === "synth" ? "bass" : "epiano") } showChord(i) };
    $$("#hCh .chip", out).forEach(b => b.onclick = () => playChord(+b.dataset.ci));
    const drawTab = () => { if (!q("#hTab")) return; q("#hTab").innerHTML = tabHTML(harmonyTab(H, H.chords.map((c, i) => vs[i][sel[i]]), pat), { bpm: H.bpm, tone, title: "Табулатура: " + GTR_PATTERNS[pat], caption: "Один проход по последовательности" }); W.mount(q("#hTab")) };
    drawTab();
    $$("#hVo [data-vi]", out).forEach(b => b.onclick = () => { const i = +b.dataset.vi; sel[i] = (sel[i] + 1) % vs[i].length; const v = vs[i][sel[i]]; b.querySelector(".vsvg").innerHTML = shapeSVG(v.f); b.querySelector("small").textContent = v.f.map(f => f < 0 ? "x" : f).join(" ") + " · " + (sel[i] + 1) + "/" + vs[i].length; playChord(i); drawTab() });
    const mk = () => harmonyPlayer(H, { inst: S.inst, pattern: q(".hPat").value, voicings: H.chords.map((c, i) => vs[i][sel[i]]), kv, groove: q(".hGr").value, tone: q(".hTone") ? q(".hTone").value : tone, preset: q(".hPre") ? q(".hPre").value : preset, onChord: showChord });
    q("#hPlay").onclick = () => { if (player && player.running) { player.stop(); q("#hPlay").innerHTML = IC.play; return } AU.init(); if (m.kit && !S.groove) { AU.setKit(m.kit) } player = mk(); player.start(); q("#hPlay").innerHTML = IC.stop };
    W.onStop(() => player && player.stop());
    const restart = () => { if (player && player.running) { player.stop(); player = mk(); player.start() } };
    q(".hPat").onchange = e => { S.pattern = S.inst === "guitar" ? e.target.value : e.target.value; saveS(); if (S.inst === "guitar") { const p2 = e.target.value; drawTabFor(p2) } restart() };
    const drawTabFor = p2 => { if (!q("#hTab")) return; q("#hTab").innerHTML = tabHTML(harmonyTab(H, H.chords.map((c, i) => vs[i][sel[i]]), p2), { bpm: H.bpm, tone, title: "Табулатура: " + GTR_PATTERNS[p2], caption: "Один проход по последовательности" }); W.mount(q("#hTab")) };
    if (q(".hTone")) q(".hTone").onchange = e => { S.tone = e.target.value; saveS(); restart() };
    if (q(".hPre")) q(".hPre").onchange = e => { S.preset = e.target.value; saveS(); restart() };
    q(".hGr").onchange = e => { S.groove = e.target.value; saveS(); restart() };
    q("#hSave").onclick = () => { const f = LS.get("lad_hfav", []); f.unshift({ at: Date.now(), name: H.moods.map(x => x.n).join(" + "), key: H.key, minor: H.minor, bpm: H.bpm, per: H.per, mood: m.id, moods: H.moods.map(x => x.id), chords: H.chords, used: H.used, scale: H.scale, feel: H.feel }); LS.set("lad_hfav", f.slice(0, 60)); toast("Сохранено в избранное"); addXP(2) };
    q("#hDrum").onclick = () => { const g = MOOD_GROOVES[q(".hGr").value]; if (!g || !Object.keys(g.t).length) { toast("У этого варианта нет барабанов"); return } LS.set("lad_dm", patFrom({ bpm: H.bpm, swing: g.swing || 0, t: g.t })); openTool("drums") };
    q("#hAsk").onclick = () => askTeacher({ t: "Гармония: " + H.moods.map(x => x.n).join(" + "), d: H.chords.map(c => c.name).join(" – "), b: [`Тональность ${keyName}, темп ${H.bpm}. Последовательность: ${H.chords.map(c => c.name + " (" + c.roman + ")").join(", ")}. Приёмы: ${H.used.join(", ") || "—"}. Настроение: ${m.d}`], q: [] });
    if (was) q("#hPlay").click();
    addXPOnce();
  };
  let xpGiven = false; const addXPOnce = () => { if (!xpGiven) { xpGiven = true; addXP(3); practiceTick("harmony") } };
  build();
}
function fromRoman(str, key, bpm) {
  const toks = str.split(/\s+/).map(parseRoman).filter(Boolean);
  const minor = toks[0] && toks[0].type.startsWith("m");
  const chords = toks.map(t => { const root = pcOf(key + t.deg); let bass = root; if (t.slash === "P") bass = key; else if (t.slash && /^[b#]?\d$/.test(t.slash)) { const sb = /^([b#]?)(\d)$/.exec(t.slash); bass = pcOf(key + [0, 0, 2, 4, 5, 7, 9, 11][+sb[2]] + (sb[1] === "b" ? -1 : sb[1] === "#" ? 1 : 0)) } return { root, type: t.type, bass, roman: t.tok, name: chordName(root, t.type, bass, key) } });
  return { chords, key, minor, bpm: bpm || 90, per: 4, mood: MOODS[0], moods: [], used: [], scale: minor ? "minor" : "major", feel: "straight" };
}
function harmonyFavs(onPick) {
  const f = LS.get("lad_hfav", []);
  openSheet(`<h2>Избранное</h2>${f.length ? `<div class="panel" style="background:var(--surface-2)">${f.map((x, i) => `<div class="set"><button class="k" data-hf="${i}" style="text-align:left;flex:1"><b>${esc(x.chords.map(c => c.name).join(" – "))}</b><small>${esc(x.name)} · ${x.bpm} BPM</small></button><button class="ib" data-hd="${i}" aria-label="Удалить">${IC.trash}</button></div>`).join("")}</div>` : `<p class="empty">Сохраняйте понравившиеся варианты кнопкой «В избранное».</p>`}`);
  $$("[data-hf]", $("#sbody")).forEach(b => b.onclick = () => { const x = f[+b.dataset.hf]; const mood = MOODS.find(m => m.id === x.mood) || MOODS[0]; onPick(Object.assign({}, x, { mood, moods: (x.moods || [x.mood]).map(id => MOODS.find(m => m.id === id)).filter(Boolean) })); closeSheet() });
  $$("[data-hd]", $("#sbody")).forEach(b => b.onclick = () => { f.splice(+b.dataset.hd, 1); LS.set("lad_hfav", f); b.closest(".set").remove() });
}
async function harmonyAI(text, S, onDone) {
  if (!text.trim()) { toast("Сначала опишите настроение словами"); return }
  openSheet(`<h2>Подбираю с ИИ</h2><p class="note" style="margin-top:0">«${esc(text)}»</p><div class="box ai" id="haBox"><div class="skel"></div><div class="skel" style="width:70%"></div><div class="skel" style="width:85%"></div></div>`);
  try {
    const inst = { guitar: "электрогитара", keys: "клавиши", synth: "синтезатор" }[S.inst];
    const r = await askClaude(`Музыкант (играет 5 лет, знает соло) описывает настроение: «${text}». Инструмент: ${inst}. Подбери гармонию, которая точно передаёт это настроение, с нестандартными приёмами, если они уместны.
Ответь ТОЛЬКО JSON без пояснений вокруг:
{"key":"E","minor":false,"bpm":96,"scale":"lydian","chords":["Emaj9","Bsus4","C#m7","Amaj7#11"],"why":["почему это звучит так (2–4 пункта, конкретно про приёмы)"],"tips":["как сыграть и какой звук (2–3 пункта)"],"mood":"короткое название настроения"}
Аккорды пиши стандартными символами: m, 7, maj7, m7, 9, m9, maj9, add9, 6, 69, sus2, sus4, 7sus4, dim, m7b5, aug, 13, maj7#11, 7b9, 5, слэш-аккорды через /. scale — одно из: major, minor, dorian, phryg, lydian, mixo, locrian, harm, mel, penta, mpenta, blues, phrygdom.`, 900, AI_SYS);
    const j = JSON.parse(r.slice(r.indexOf("{"), r.lastIndexOf("}") + 1));
    const key = parseSym(j.key + (j.minor ? "m" : "")) || { root: 0 };
    const chords = (j.chords || []).map(s => { const p = parseSym(s.replace("6/9", "69")); return p ? { root: p.root, type: p.type, bass: p.bass, roman: "", name: s } : null }).filter(Boolean);
    if (!chords.length) throw { code: "api" };
    const mood = { id: "ai", n: j.mood || "По описанию", d: text, why: j.why || [], tips: j.tips || [], gtr: "arp", tone: "clean", syn: "pad", kit: "acoustic", groove: "ballad", scale: j.scale || "major", tempo: [j.bpm || 90, j.bpm || 90] };
    closeSheet(); onDone({ chords, key: key.root, minor: !!j.minor, bpm: clamp(+j.bpm || 90, 50, 200), per: 4, mood, moods: [mood], used: [], scale: SCALES[j.scale] ? j.scale : (j.minor ? "minor" : "major"), feel: "straight" });
  } catch (e) { const b = $("#haBox"); if (b) b.textContent = e && e.code ? aiErr(e) : "Не получилось разобрать ответ. Попробуйте ещё раз или переформулируйте." }
}
