"use strict";
/* app.js — экраны: Сегодня, Уроки, Студия, Тренировки, Профиль; уроки и тесты; настройки; копия; ИИ. */

const COURSE_ORDER = ["theory", "fret", "rhythm", "guitar", "drums", "keys", "styles"];
const allLessons = c => COURSES[c].units.flatMap(u => u.lessons);
const findLesson = id => { for (const c of COURSE_ORDER) for (const [ui, u] of COURSES[c].units.entries()) { const li = u.lessons.findIndex(l => l.id === id); if (li >= 0) return { c, ui, li, u, l: u.lessons[li] } } return null };
const nextLesson = c => allLessons(c).find(l => !ST.done[l.id]);
let tab = LS.get("lad_tab", "home");

/* ======================= tabs ======================= */
function render() {
  W.stopAll();
  $$(".tab").forEach(t => t.classList.toggle("on", t.dataset.tab === tab));
  const m = $("#main");
  m.innerHTML = `<div class="view">${({ home: homeView, learn: learnView, play: playView, train: trainView, me: meView }[tab] || homeView)()}</div>`;
  W.mount(m); bindView(m); window.scrollTo(0, 0);
}
$$(".tab").forEach(t => t.onclick = () => { if (LAYERS.length) { while (LAYERS.length) closeLayer() } tab = t.dataset.tab; LS.set("lad_tab", tab); render() });

/* delegated actions inside views and layers */
function bindView(root) {
  $$("[data-course]", root).forEach(b => b.onclick = () => openCourse(b.dataset.course));
  $$("[data-lesson]", root).forEach(b => b.onclick = () => openLesson(b.dataset.lesson));
  $$("[data-tool]", root).forEach(b => b.onclick = () => openTool(b.dataset.tool));
  $$("[data-lane]", root).forEach(b => b.onclick = () => laneGame(b.dataset.lane, +b.dataset.lv));
  $$("[data-ear]", root).forEach(b => b.onclick = () => earGame(EAR_SETS.find(e => e.id === b.dataset.ear)));
  $$("[data-act]", root).forEach(b => b.onclick = () => ACTIONS[b.dataset.act] && ACTIONS[b.dataset.act](b));
  $$("[data-prac]", root).forEach(b => b.onclick = () => runPractice(JSON.parse(b.dataset.prac)));
}
const ACTIONS = {
  daily: () => dailyToday().run(),
  fret65: () => fretNoteGame({ strings: [0, 1], max: 12 }), fret5: () => fretNoteGame({ strings: [0, 1, 2, 3, 4, 5], max: 5 }), fretAll: () => fretNoteGame({ strings: [0, 1, 2, 3, 4, 5], max: 12 }),
  keynote: () => keyNoteGame(), fmap: () => fretMap(), fsmart: () => fretNoteGame({ strings: [0, 1, 2, 3, 4, 5], max: 12, smart: 1 }), findall: () => findAllGame(), intfret: () => intervalFretGame(), harmony: () => openTool("harmony"), tempo: b => tempoGame(+b.dataset.bpm || 90), repeat: () => repeatGame(), calib: () => calibrate(),
  audioreset: () => { W.stopAll(); AU.restart(); setTimeout(() => { AU.drum("kick"); AU.note(64, AU.now() + .2, .4) }, 300); toast("Звук перезапущен") },
  install: () => { LS.set("lad_noinst", 1); render() }, ask: () => askTeacher(null), plan: () => askPlan()
};
function runPractice(p) {
  if (p.g === "ear") earGame({ n: p.l, mode: p.mode, set: p.set, id: "x" + p.mode + p.set.join("") });
  else if (p.g === "fretnote") fretNoteGame({ strings: p.strings, max: p.max });
  else if (p.g === "keynote") keyNoteGame();
  else if (p.g === "tempo") tempoGame(p.bpm);
  else if (p.g === "fretsmart") fretNoteGame({ strings: [0, 1, 2, 3, 4, 5], max: 12, smart: 1 });
  else if (p.g === "findall") findAllGame();
  else if (p.g === "intfret") intervalFretGame();
  else if (p.g === "lanes") laneGame(p.lanes === 3 ? "drums" : p.lanes === 2 ? "hands" : "rhythm", p.lv || (p.lanes === 3 ? 1 : 0));
}

/* ======================= home ======================= */
function ringSVG(p, col) { const r = 23, c = 2 * Math.PI * r; return `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="6"/><circle cx="28" cy="28" r="${r}" fill="none" stroke="${col || "var(--accent)"}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp(p, 0, 1))}"/></svg>` }
function weekBars() { let h = ""; for (let i = 6; i >= 0; i--) { const k = dkey(Date.now() - i * DAY), v = ST.days[k] || 0, p = Math.min(1, v / SET.goal); h += `<i class="${p >= 1 ? "on" : p > 0 ? "part" : ""} ${i === 0 ? "now" : ""}" style="--p:${Math.round(p * 100)}%" title="${k}"></i>` } return `<div class="week">${h}</div>` }
function lvCard() { const L = level(); return `<div class="panel lvcard"><div class="lvbadge">${L.n}</div><div class="info"><b>${lvTitle(L.n)}</b><small>${ST.xp - L.from} / ${L.to - L.from} XP до уровня ${L.n + 1}</small><div class="bar"><i style="width:${Math.round(L.p * 100)}%"></i></div></div></div>` }
function homeView() {
  const d = new Date(), dayXp = ST.days[today()] || 0, mins = practiceMin();
  const sub = d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  let h = header(greet(), sub[0].toUpperCase() + sub.slice(1));
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (!standalone && !LS.get("lad_noinst", 0) && /iPhone|iPad|Macintosh/.test(navigator.userAgent)) h += `<div class="panel install"><span class="ic" style="color:var(--accent)">${IC.share}</span><div style="flex:1"><b>Установите как приложение</b><p>В Safari: «Поделиться» → «На экран Домой». Так Лад работает без интернета и на весь экран.</p></div><button class="ib" data-act="install" aria-label="Скрыть">${IC.close}</button></div>`;
  h += `<div class="panel today"><div class="ring">${ringSVG(dayXp / SET.goal)}<b>${Math.min(100, Math.round(dayXp / SET.goal * 100))}%</b></div><div><h3>${dayXp >= SET.goal ? "Цель дня выполнена" : "Цель дня: " + SET.goal + " XP"}</h3><p>${dayXp} XP · ${mins} ${plural(mins, "минута", "минуты", "минут")} практики</p></div>${weekBars()}</div>`;
  h += lvCard();
  // continue
  const lastC = LS.get("lad_lastc", "theory"), order = [lastC, ...COURSE_ORDER.filter(c => c !== lastC)];
  let cont = null; for (const c of order) { const l = nextLesson(c); if (l) { cont = { c, l }; break } }
  if (cont) { const f = findLesson(cont.l.id); h += `<button class="panel cont press" data-lesson="${cont.l.id}" style="--cc:var(--c-${cont.c})"><span class="cic">${IC[COURSES[cont.c].ic]}</span><div class="info"><small style="color:var(--cc)">${esc(COURSES[cont.c].n)} · ${esc(f.u.n)}</small><h3>${esc(cont.l.t)}</h3><div class="sub">${esc(cont.l.d)}</div></div><span class="go">${IC.play}</span></button>` }
  h += `<button class="panel cont press" data-act="harmony" style="--cc:var(--c-styles)"><span class="cic">${IC.spark}</span><div class="info"><small style="color:var(--cc)">Гармония</small><h3>Настроение → аккорды</h3><div class="sub">Frutiger Aero, ностальгия, ночной город и ещё 30 оттенков — с аппликатурами и табами</div></div><span class="go" style="background:var(--cc)">${IC.chev}</span></button>`;
  // daily
  const D = dailyToday(), dd = ST.daily && ST.daily[today()];
  h += `<div class="sec"><h2>Задание дня</h2><span>+30 XP</span></div><button class="panel cont press" data-act="daily" style="--cc:var(--gold);margin-top:0"><span class="cic">${dd ? IC.check : IC.target}</span><div class="info"><h3>${esc(D.n)}</h3><div class="sub">${dd ? "Выполнено сегодня. Возвращайтесь завтра!" : "Получите хотя бы одну звезду"}</div></div><span class="go" style="background:var(--gold)">${IC.play}</span></button>`;
  // quick tools
  h += `<div class="sec"><h2>Быстрый старт</h2></div><div class="chips">${TOOLS.map(t => `<button class="chip" data-tool="${t.id}">${esc(t.n)}</button>`).join("")}</div>`;
  // courses progress
  h += `<div class="sec"><h2>Курсы</h2><span>${doneCount()} из ${COURSE_ORDER.reduce((a, c) => a + allLessons(c).length, 0)} уроков</span></div><div class="panel" style="padding:6px 0">${COURSE_ORDER.map(c => { const ls = allLessons(c), dn = ls.filter(l => ST.done[l.id]).length; return `<button class="skrow press" data-course="${c}" style="--cc:var(--c-${c});width:100%;text-align:left"><span class="lb">${esc(COURSES[c].n.split(" ")[0])}</span><span class="bar"><i style="width:${dn / ls.length * 100}%"></i></span><small>${dn}/${ls.length}</small></button>` }).join("")}</div>`;
  const got = ACH.filter(a => ST.ach[a.id]).sort((a, b) => ST.ach[b.id] - ST.ach[a.id]).slice(0, 4);
  if (got.length) h += `<div class="sec"><h2>Последние награды</h2><span>${Object.keys(ST.ach).length}/${ACH.length}</span></div><div class="achs">${got.map(achHTML).join("")}</div>`;
  return h;
}
function greet() { const hr = new Date().getHours(); return hr < 5 ? "Доброй ночи" : hr < 12 ? "Доброе утро" : hr < 18 ? "Добрый день" : "Добрый вечер" }
const achHTML = a => `<div class="ach ${ST.ach[a.id] ? "on" : ""}"><div class="ai">${ST.ach[a.id] ? a.e : IC.lock.replace("<svg", '<svg style="width:20px;height:20px"')}</div><b>${esc(a.n)}</b><small>${esc(a.d)}</small></div>`;

/* ======================= learn ======================= */
function learnView() {
  let h = header("Уроки", "Теория и практика");
  h += `<div class="cgrid">${COURSE_ORDER.map(c => { const C = COURSES[c], ls = allLessons(c), dn = ls.filter(l => ST.done[l.id]).length; return `<button class="panel ccard press" data-course="${c}" style="--cc:var(--c-${c})"><span class="cic">${IC[C.ic]}</span><div><h3>${esc(C.n)}</h3><p>${dn} из ${ls.length} · ${esc(C.d)}</p></div><div class="bar"><i style="width:${dn / ls.length * 100}%"></i></div></button>` }).join("")}</div>`;
  h += `<div class="sec"><h2>С чего начать</h2></div><div class="panel" style="padding:16px"><p style="font-size:15px">Начните с <b style="color:var(--c-theory)">Теории</b> и <b style="color:var(--c-rhythm)">Ритма</b> — по уроку в день. Параллельно выберите инструмент. Каждый урок заканчивается тестом: три звезды за ответы без ошибок. Уроки можно проходить в любом порядке.</p></div>`;
  return h;
}
function openCourse(c) {
  while (LAYERS.length) { const L = LAYERS.pop(); L.onClose && L.onClose(); L.el.classList.remove("open") }
  const C = COURSES[c], ls = allLessons(c), dn = ls.filter(l => ST.done[l.id]).length, nx = nextLesson(c);
  const stars = ls.reduce((a, l) => a + (ST.done[l.id] || 0), 0);
  let h = `<div class="hero"><span class="cic">${IC[C.ic]}</span><h1>${esc(C.n)}</h1><p>${esc(C.d)}</p><div class="meta"><span><b>${dn}</b>/${ls.length} уроков</span><span><b>${stars}</b>/${ls.length * 3} звёзд</span></div><div class="bar" style="margin-top:12px"><i style="width:${dn / ls.length * 100}%;background:var(--cc)"></i></div></div>`;
  C.units.forEach((u, ui) => {
    h += `<div class="unit"><div class="unit-h"><span class="n">${ui + 1}</span><div><h2>${esc(u.n)}</h2><p>${esc(u.d)}</p></div></div>`;
    if (C.branches) h += `<div class="cgrid">${u.lessons.map(l => `<button class="panel ccard press" data-lesson="${l.id}" style="min-height:120px"><div><h3>${esc(l.t)}</h3><p>${esc(l.d)}</p></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto">${(l.tags || []).length ? `<span class="tag" style="font-size:11px;font-weight:800;color:var(--muted)">${esc(l.tags.join(" · "))}</span>` : "<span></span>"}${starsHtml(ST.done[l.id] || 0)}</div></button>`).join("")}</div>`;
    else h += `<div class="panel lessons">${u.lessons.map(l => { const s = ST.done[l.id], idx = ls.indexOf(l) + 1; return `<button class="lesson" data-lesson="${l.id}"><span class="st ${s ? "done" : nx === l ? "next" : ""}">${s ? IC.check : idx}</span><span class="lt"><b>${esc(l.t)}</b><span>${esc(l.d)}</span></span>${s ? starsHtml(s) : `<span style="color:var(--faint)">${IC.chev.replace("<svg", '<svg style="width:18px;height:18px"')}</span>`}</button>` }).join("")}</div>`;
    h += `</div>`;
  });
  const el = openLayer(C.n, h, { cc: c }); bindView(el);
  LS.set("lad_lastc", c);
}

/* ======================= lesson ======================= */
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
function blockHTML(b) {
  if (typeof b === "string") {
    if (b.startsWith("## ")) return `<h3>${md(b.slice(3))}</h3>`;
    if (b.startsWith("> ")) return `<div class="tip">${IC.bulb}<div>${md(b.slice(2))}</div></div>`;
    if (b.startsWith("! ")) return `<div class="tip acc">${IC.info}<div>${md(b.slice(2))}</div></div>`;
    return `<p>${md(b)}</p>`;
  }
  if (b.table) return `<div class="tw"><table>${b.table.map((r, i) => `<tr>${r.map(c => i === 0 && b.table.length > 2 ? `<th>${md(c)}</th>` : `<td>${md(c)}</td>`).join("")}</tr>`).join("")}</table></div>`;
  if (b.play) return `<div class="chips" style="margin:12px 0">${b.play.map(p => `<button class="chip" style="background:var(--surface-2);color:var(--fg)" data-notes="${p.n.join(",")}" ${p.arp ? "data-arp" : ""} ${p.inst ? `data-inst="${p.inst}"` : ""} ${p.tone ? `data-tone="${p.tone}"` : ""} ${p.gap ? `data-gap="${p.gap}"` : ""} ${p.preset ? `data-preset="${p.preset}"` : ""}>▶ ${esc(p.l)}</button>`).join("")}</div>`;
  if (b.dseq) return `<div class="chips" style="margin:12px 0">${b.dseq.map(p => `<button class="chip" style="background:var(--surface-2);color:var(--fg)" data-dseq="${p.s}">▶ ${esc(p.l)}</button>`).join("")}</div>`;
  if (b.drums) return `<div class="pads" style="margin:12px 0">${b.drums.map(k => `<button class="pad" data-drum="${k}" style="--pc:${AU.DRUMS[k].c}"><i></i><span>${AU.DRUMS[k].n}</span></button>`).join("")}</div>`;
  if (b.kbd) return `<div class="widget" style="padding:10px">${keyboardHTML(Object.assign({ small: 1 }, b.kbd, { kh: b.kbd.small ? 120 : 150 }))}</div>`;
  if (b.fret) return `<div class="widget" style="padding:10px">${fretboardHTML(Object.assign({ small: 1 }, b.fret))}</div>`;
  if (b.shapes) return `<div class="chords" style="margin:14px 0">${b.shapes.map(x => `<button class="chordc" data-shape="${x.f.join(",")}"><b>${esc(x.n)}</b>${shapeSVG(x.f)}<small>${x.f.map(v => v < 0 ? "x" : v).join(" ")}</small></button>`).join("")}</div>`;
  if (b.chords) return `<div class="chords" style="margin:14px 0">${b.chords.map(chordCardHTML).join("")}</div>`;
  if (b.groove) return grooveHTML(Object.assign({ div: 4 }, b.groove), { title: b.title || b.groove.name, bass: b.bass });
  if (b.rhythm) return rhythmHTML(b.rhythm, b);
  if (b.prog) return progHTML(b.prog, b);
  if (b.tab) return tabHTML(b.tab, b);
  if (b.synth) return synthDemoHTML(b.synth);
  if (b.practice) return `<button class="panel cont press" data-prac='${esc(JSON.stringify(b.practice))}' style="--cc:var(--gold)"><span class="cic">${IC.bolt}</span><div class="info"><small style="color:var(--gold)">Тренировка</small><h3 style="font-size:15px">${esc(b.practice.l)}</h3></div><span class="go" style="background:var(--gold)">${IC.play}</span></button>`;
  return "";
}
function openLesson(id) {
  const f = findLesson(id); if (!f) return; const { c, l, u } = f;
  const all = allLessons(c), idx = all.indexOf(l);
  let h = `<div class="hero" style="padding:18px 20px"><small style="color:var(--cc);font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${esc(COURSES[c].n)} · ${esc(u.n)}</small><h1 style="font-size:24px">${esc(l.t)}</h1><p>${esc(l.d)}</p>${ST.done[id] ? `<div style="margin-top:10px">${starsHtml(ST.done[id])}</div>` : ""}</div>`;
  h += `<div class="ls">${l.b.map(blockHTML).join("")}</div>`;
  h += `<div class="lfoot"><button class="btn primary" id="lQuiz">${IC.quiz || IC.check}Пройти тест · ${l.q.length} ${plural(l.q.length, "вопрос", "вопроса", "вопросов")}</button><button class="btn soft" id="lAsk">${IC.chat}Спросить преподавателя</button></div>`;
  h += `<div class="lfoot" style="margin-top:10px">${idx > 0 ? `<button class="btn ghost sm" data-lesson="${all[idx - 1].id}">${IC.back}${esc(all[idx - 1].t)}</button>` : ""}${all[idx + 1] ? `<button class="btn ghost sm" data-lesson="${all[idx + 1].id}">${esc(all[idx + 1].t)}${IC.chev}</button>` : ""}</div>`;
  const el = openLayer(l.t, h, { cc: c, onClose: () => W.stopAll() });
  W.mount(el); bindView(el);
  el.querySelector("#lQuiz").onclick = () => runQuiz(f, el);
  el.querySelector("#lAsk").onclick = () => askTeacher(l);
  LS.set("lad_lastc", c);
}
function runQuiz(f, el) {
  W.stopAll();
  const { c, l } = f, qs = l.q.map(q => { const order = shuffle(q.o.map((t, i) => i)); return Object.assign({}, q, { order }) });
  let i = 0, ok = 0; const page = el.querySelector(".page");
  const show = () => {
    const q = qs[i];
    page.innerHTML = `<div class="qprog">${qs.map((x, j) => `<i class="${j < i ? (x.res ? "ok" : "bad") : j === i ? "cur" : ""}"></i>`).join("")}</div>
      ${q.play ? `<button class="playq" id="qPlay">${IC.play}</button>` : ""}
      <div class="qq">${md(q.q)}</div><div class="opts ${q.o.length > 4 ? "grid" : ""}">${q.order.map(oi => `<button class="opt" data-i="${oi}">${md(q.o[oi])}</button>`).join("")}</div><div id="qFb"></div>`;
    el.scrollTop = 0;
    if (q.play) { const pl = () => AU.play(q.play.n, { arp: q.play.arp, inst: q.play.inst, gap: q.play.gap }); page.querySelector("#qPlay").onclick = pl; setTimeout(pl, 300) }
    let done = false;
    $$(".opt", page).forEach(b => b.onclick = () => {
      if (done) return; done = true; const right = +b.dataset.i === q.a; q.res = right; ST.quiz.all++; if (right) { ok++; ST.quiz.ok++ } saveState();
      b.classList.add(right ? "ok" : "bad"); if (!right) page.querySelector(`.opt[data-i="${q.a}"]`).classList.add("ok"); sfx(right ? "ok" : "bad");
      page.querySelector("#qFb").innerHTML = `<div class="fb ${right ? "ok" : "bad"}"><b>${right ? pick(["Верно!", "Точно!", "Отлично!", "Да!"]) : "Не совсем"}</b>${md(q.e || "")}</div><button class="btn primary block" style="margin-top:14px" id="qNext">${i < qs.length - 1 ? "Дальше" : "Результат"}</button>`;
      page.querySelector("#qNext").onclick = () => { i++; i < qs.length ? show() : finish() };
      page.querySelector("#qNext").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };
  const finish = () => {
    const pct = ok / qs.length, stars = pct === 1 ? 3 : pct >= .7 ? 2 : 1, prev = ST.done[l.id] || 0;
    const xp = prev ? (stars > prev ? (stars - prev) * 5 + 3 : 3) : 15 + stars * 5;
    ST.done[l.id] = Math.max(prev, stars); saveState();
    const all = allLessons(c), nx = all[all.indexOf(l) + 1];
    page.innerHTML = `<div class="done"><div class="bigstars">${[0, 1, 2].map(j => `<span class="${j < stars ? "on" : ""}">${IC.star}</span>`).join("")}</div><h2>${stars === 3 ? "Безупречно!" : stars === 2 ? "Хорошая работа!" : "Урок пройден"}</h2><p>${ok} из ${qs.length} правильно${stars < 3 ? ". Повторите тест, чтобы получить три звезды." : ""}</p>
      <div class="reward"><span style="color:var(--gold)">+${xp} XP</span><span>${IC.fire.replace("<svg", '<svg style="width:14px;height:14px;vertical-align:-2px;color:var(--gold)"')} ${streak() || 1} ${plural(streak() || 1, "день", "дня", "дней")}</span></div>
      <div class="lfoot">${nx ? `<button class="btn primary" data-lesson="${nx.id}">Следующий: ${esc(nx.t)}</button>` : `<button class="btn primary" data-course="${c}">Курс завершён!</button>`}<button class="btn soft" id="qRe">Пройти ещё раз</button><button class="btn ghost" data-course="${c}">К курсу</button></div></div>`;
    addXP(xp, page.querySelector(".bigstars")); if (stars === 3 || !prev) confetti(); sfx("level");
    bindView(page); page.querySelector("#qRe").onclick = () => runQuiz(f, el);
  };
  show();
}

/* ======================= studio ======================= */
function playView() {
  let h = header("Студия", "Инструменты всегда под рукой");
  h += `<div class="tgrid">${TOOLS.map(t => `<button class="panel tcard press" data-tool="${t.id}" style="--cc:var(--c-${t.c})"><span class="cic">${IC[t.ic]}</span><div><h3>${esc(t.n)}</h3><p>${esc(t.d)}</p></div></button>`).join("")}</div>`;
  h += `<div class="sec"><h2>Совет</h2></div><div class="panel" style="padding:16px"><p style="font-size:15px">Включите драм-машину с битом из урока, а поверх играйте на гитаре или синтезаторе. Метроном с тренером скорости поможет разгонять сложные места: начните медленно, и он сам добавит темп.</p><p class="note">Звук синтезируется прямо на устройстве, поэтому работает без интернета. Если на iPhone тихо — проверьте громкость и переключатель «Без звука».</p></div>`;
  return h;
}

/* ======================= train ======================= */
function lvGrid(mode) {
  const P = LANES[mode]; return `<div class="lvls">${P.lv.map((L, i) => { const g = ST.games[gkey(mode, i)] || {}, prevOk = i === 0 || (ST.games[gkey(mode, i - 1)] || {}).stars; return `<button data-lane="${mode}" data-lv="${i}" ${prevOk ? "" : "disabled"} title="${esc(L.n)}" class="${g.stars === 3 ? "on" : ""}">${i + 1}<small>${"★".repeat(g.stars || 0) || "·"}</small></button>` }).join("")}</div>`;
}
function trainView() {
  let h = header("Тренировки", "Ритм, слух и ноты");
  const D = dailyToday(), dd = ST.daily && ST.daily[today()];
  h += `<button class="panel cont press" data-act="daily" style="--cc:var(--gold);margin-top:0"><span class="cic">${dd ? IC.check : IC.target}</span><div class="info"><small style="color:var(--gold)">Задание дня · +30 XP</small><h3>${esc(D.n)}</h3><div class="sub">${dd ? "Выполнено" : "Нужна хотя бы одна звезда"}</div></div><span class="go" style="background:var(--gold)">${IC.play}</span></button>`;
  h += `<div class="sec"><h2>Ритм-игра</h2><span>Ноты падают — попадайте в линию</span></div>`;
  for (const m of ["rhythm", "drums", "hands"]) { const P = LANES[m], st = P.lv.reduce((a, _, i) => a + ((ST.games[gkey(m, i)] || {}).stars || 0), 0); h += `<div class="panel" style="padding:14px;margin-bottom:10px"><div class="wcap" style="display:flex;justify-content:space-between;margin-bottom:10px"><b>${esc(P.n)}</b><span style="color:var(--gold);font-weight:800;font-size:13px">★ ${st}/${P.lv.length * 3}</span></div>${lvGrid(m)}</div>` }
  h += `<div class="sec"><h2>Слух</h2></div><div class="gsel">${EAR_SETS.map(e => { const g = ST.games["ear:" + e.id] || {}; return `<button class="panel gitem press" data-ear="${e.id}"><span class="cic" style="--cc:var(--c-theory)">${IC.ear}</span><div class="info"><h3>${esc(e.n)}</h3><p>${esc(e.d)}</p></div>${g.best != null ? `<span class="best">${"★".repeat(g.stars || 0)} ${g.best}/10</span>` : ""}</button>` }).join("")}</div>`;
  const nb = k => { const g = ST.games[k]; return g && g.best != null ? `<span class="best">${"★".repeat(g.stars || 0)} ${g.best}</span>` : "" };
  h += `<div class="sec"><h2>Ноты</h2></div><div class="gsel">
    <button class="panel gitem press" data-act="fmap"><span class="cic" style="--cc:var(--c-fret)">${IC.target}</span><div class="info"><h3>Карта знания грифа</h3><p>Видно, какие позиции вы знаете, а какие путаете</p></div></button>
    <button class="panel gitem press" data-act="fsmart"><span class="cic" style="--cc:var(--c-fret)">${IC.guitar}</span><div class="info"><h3>Умная тренировка грифа</h3><p>Чаще спрашивает то, что вы не знаете</p></div>${nb("fret:012345:12")}</button>
    <button class="panel gitem press" data-act="findall"><span class="cic" style="--cc:var(--c-fret)">${IC.guitar}</span><div class="info"><h3>Найди все позиции</h3><p>Все места одной ноты до 12 лада</p></div>${ST.games.findall ? `<span class="best">${"★".repeat(ST.games.findall.stars || 0)} ${ST.games.findall.best} с</span>` : ""}</button>
    <button class="panel gitem press" data-act="intfret"><span class="cic" style="--cc:var(--c-fret)">${IC.guitar}</span><div class="info"><h3>Интервалы на грифе</h3><p>Постройте интервал от заданной ноты</p></div>${nb("intfret")}</button>
    <button class="panel gitem press" data-act="fret65"><span class="cic" style="--cc:var(--c-guitar)">${IC.guitar}</span><div class="info"><h3>Гриф: 6 и 5 струна</h3><p>Основа пауэр-аккордов и баррэ · 60 секунд</p></div>${nb("fret:01:12")}</button>
    <button class="panel gitem press" data-act="fret5"><span class="cic" style="--cc:var(--c-guitar)">${IC.guitar}</span><div class="info"><h3>Гриф: первая позиция</h3><p>Все струны до 5 лада</p></div>${nb("fret:012345:5")}</button>
    <button class="panel gitem press" data-act="fretAll"><span class="cic" style="--cc:var(--c-guitar)">${IC.guitar}</span><div class="info"><h3>Весь гриф</h3><p>Все струны до 12 лада</p></div>${nb("fret:012345:12")}</button>
    <button class="panel gitem press" data-act="keynote"><span class="cic" style="--cc:var(--c-keys)">${IC.keys}</span><div class="info"><h3>Клавиатура</h3><p>Найдите ноту за 60 секунд</p></div>${nb("keys:find")}</button></div>`;
  const tg = ST.games.tempo, rg = ST.games.repeat;
  h += `<div class="sec"><h2>Чувство времени</h2></div><div class="gsel">
    <div class="panel gitem"><span class="cic" style="--cc:var(--c-rhythm)">${IC.metro}</span><div class="info"><h3>Держи темп</h3><p>4 такта с кликом и 4 в тишине${tg ? " · лучшее " + tg.best + " мс" : ""}</p><div class="chips" style="margin-top:8px">${[70, 90, 120, 150].map(b => `<button class="chip" data-act="tempo" data-bpm="${b}">${b} BPM</button>`).join("")}</div></div></div>
    <button class="panel gitem press" data-act="repeat"><span class="cic" style="--cc:var(--c-rhythm)">${IC.tap}</span><div class="info"><h3>Повтори ритм</h3><p>Слушайте такт и простучите его в ответ</p></div>${rg ? `<span class="best">${"★".repeat(rg.stars || 0)} ${rg.best}/6</span>` : ""}</button>
    <button class="panel gitem press" data-act="calib"><span class="cic" style="--cc:var(--c-styles)">${IC.target}</span><div class="info"><h3>Калибровка задержки</h3><p>Сейчас: ${SET.latency} мс. Сделайте один раз на каждом устройстве</p></div></button></div>`;
  return h;
}

/* ======================= profile ======================= */
function xpChart() {
  const N = 14, vals = [], labs = []; for (let i = N - 1; i >= 0; i--) { const t = Date.now() - i * DAY; vals.push(ST.days[dkey(t)] || 0); labs.push(new Date(t).getDate()) }
  const mx = Math.max(SET.goal, ...vals), W0 = 320, H0 = 120, bw = W0 / N;
  let g = `<line x1="0" x2="${W0}" y1="${H0 - 18 - (SET.goal / mx) * (H0 - 30)}" y2="${H0 - 18 - (SET.goal / mx) * (H0 - 30)}" stroke="var(--gold)" stroke-dasharray="3 4" stroke-width="1"/>`;
  vals.forEach((v, i) => { const h = (v / mx) * (H0 - 30); g += `<rect x="${i * bw + bw * .2}" y="${H0 - 18 - h}" width="${bw * .6}" height="${Math.max(2, h)}" rx="3" fill="${v >= SET.goal ? "var(--accent)" : v ? "var(--accent-soft)" : "var(--surface-2)"}"/><text x="${i * bw + bw / 2}" y="${H0 - 4}" font-size="9" text-anchor="middle" fill="var(--faint)" font-weight="700">${labs[i]}</text>` });
  return `<svg viewBox="0 0 ${W0} ${H0}">${g}</svg>`;
}
function meView() {
  let h = header("Профиль", lvTitle(level().n) + " · уровень " + level().n);
  const acc = ST.quiz.all ? Math.round(ST.quiz.ok / ST.quiz.all * 100) : 0;
  h += lvCard();
  h += `<div class="sgrid" style="margin-top:10px">${[[streak(), plural(streak(), "день", "дня", "дней") + " подряд"], [bestStreak(), "лучшая серия"], [doneCount(), "уроков пройдено"], [totalMin(), "минут практики"], [ST.xp, "всего опыта"], [acc + "%", "точность ответов"], [Object.keys(ST.ach).length + "/" + ACH.length, "достижений"], [Object.values(ST.games).reduce((a, g) => a + (g.plays || 0), 0), "тренировок"]].map(([v, k]) => `<div class="panel sbox"><div class="v">${v}</div><div class="k">${k}</div></div>`).join("")}</div>`;
  h += `<div class="sec"><h2>Опыт за 2 недели</h2><span>цель ${SET.goal} XP</span></div><div class="panel chart">${xpChart()}</div>`;
  h += `<div class="sec"><h2>Навыки</h2></div><div class="panel" style="padding:6px 0">${COURSE_ORDER.map(c => { const p = courseP(c); return `<div class="skrow" style="--cc:var(--c-${c})"><span class="lb">${esc(COURSES[c].n.split(" ")[0])}</span><span class="bar"><i style="width:${p * 100}%"></i></span><small>${Math.round(p * 100)}%</small></div>` }).join("")}</div>`;
  h += `<div class="sec"><h2>Достижения</h2><span>${Object.keys(ST.ach).length}/${ACH.length}</span></div><div class="achs">${ACH.map(achHTML).join("")}</div>`;
  const row = (id, t, s, v) => `<button class="set" data-page="${id}"><span class="k"><b>${t}</b>${s ? `<small>${s}</small>` : ""}</span><span class="v">${v || ""}${IC.chev}</span></button>`;
  h += `<div class="sec"><h2>Преподаватель ИИ</h2><span>по желанию</span></div><div class="panel">${row("ai", "Подключение", SET.apiKey ? "Ключ добавлен · " + modelName(SET.model) : "Свой ключ Claude API", SET.apiKey ? "вкл" : "выкл")}<button class="set" data-act="ask"><span class="k"><b>Задать вопрос</b><small>О музыке, технике, упражнениях</small></span><span class="v">${IC.chev}</span></button><button class="set" data-act="plan"><span class="k"><b>План на неделю</b><small>По вашему прогрессу</small></span><span class="v">${IC.chev}</span></button></div>`;
  h += `<div class="sec"><h2>Настройки</h2></div><div class="panel">${row("look", "Оформление", "Тема, акцент, размер текста, анимации", SKINS[SET.skin].n)}${row("sound", "Звук", "Громкость, метроном, кит, усилитель", Math.round(SET.vol * 100) + "%")}${row("inst", "Инструменты", "Названия нот, строй, гриф, клавиши", SET.names === "ru" ? "До-Ре-Ми" : "C D E")}${row("goal", "Цель на день", "Сколько опыта в день", SET.goal + " XP")}</div>`;
  h += `<div class="sec"><h2>Данные</h2><span>iPad ↔ iPhone</span></div><div class="panel">${row("backup", "Копия в iCloud", "Сохранить или загрузить прогресс и настройки", "")}${row("about", "О приложении", "Версия, источники, как установить", "")}</div>`;
  return h;
}
const MODELS = [["claude-haiku-5-5", "Haiku 5.5 · быстро и дёшево"], ["claude-sonnet-5-5", "Sonnet 5.5 · подробнее"], ["claude-opus-5-5", "Opus 5.5 · максимум"]];
const modelName = m => (MODELS.find(x => x[0] === m) || [0, m])[1].split(" · ")[0];
document.addEventListener("click", e => { const b = e.target.closest("[data-page]"); if (b) openSettings(b.dataset.page) });

function openSettings(page) {
  const titles = { look: "Оформление", sound: "Звук", inst: "Инструменты", goal: "Цель на день", ai: "Преподаватель ИИ", backup: "Копия в iCloud", about: "О приложении" };
  const sw = (k, t, s) => `<button class="set" data-sw="${k}"><span class="k"><b>${t}</b>${s ? `<small>${s}</small>` : ""}</span><span class="switch ${SET[k] ? "on" : ""}"></span></button>`;
  const rng = (k, t, mn, mx, st, f) => `<div class="set col"><div class="k"><b>${t}</b></div><div class="range"><input type="range" data-rg="${k}" min="${mn}" max="${mx}" step="${st}" value="${SET[k]}"><output>${f(SET[k])}</output></div></div>`;
  const seg = (k, t, items, s) => `<div class="set col"><div class="k"><b>${t}</b>${s ? `<small>${s}</small>` : ""}</div><div class="seg" data-sg="${k}">${items.map(([v, n]) => `<button data-v="${v}" class="${String(SET[k]) === String(v) ? "on" : ""}">${n}</button>`).join("")}</div></div>`;
  let b = "";
  if (page === "look") {
    b += `<div class="sec"><h2>Тема</h2></div><div class="themes">${Object.entries(SKINS).map(([k, s]) => `<button class="th ${SET.skin === k ? "on" : ""}" data-skin="${k}" style="background:${s.surface};color:${s.fg}"><i style="background:${s.bg};border:1px solid ${s.line}"></i>${s.n}</button>`).join("")}</div>`;
    b += `<div class="sec"><h2>Акцент</h2><span>${ACCENTS[SET.accent].n}</span></div><div class="panel" style="padding:16px"><div class="swatches">${Object.entries(ACCENTS).map(([k, a]) => `<button class="sw ${SET.accent === k ? "on" : ""}" data-acc="${k}" style="background:${isDark() ? a.d : a.l}" aria-label="${a.n}"></button>`).join("")}</div></div>`;
    b += `<div class="sec"><h2>Интерфейс</h2></div><div class="panel">${rng("fsz", "Размер текста", 14, 20, 1, v => v + "px")}${seg("motion", "Анимации", [["full", "Плавные"], ["system", "Как в системе"], ["calm", "Минимум"]])}</div>`;
  } else if (page === "sound") {
    b += `<div class="panel">${rng("vol", "Громкость", 0, 1, .05, v => Math.round(v * 100) + "%")}${sw("uiSfx", "Звуки интерфейса", "Сигналы правильного и неверного ответа")}</div>`;
    b += `<div class="sec"><h2>Метроном и игры</h2></div><div class="panel">${seg("metroSound", "Звук метронома", [["click", "Клик"], ["wood", "Дерево"], ["beep", "Бип"], ["sticks", "Палочки"], ["cow", "Ковбелл"]])}${sw("accentFirst", "Акцент на первую долю")}<div class="set col"><div class="k"><b>Задержка ввода</b><small>Сейчас ${SET.latency} мс. Учитывается в ритм-играх</small></div><button class="btn soft sm" data-act="calib">Откалибровать</button></div></div>`;
    b += `<div class="sec"><h2>Инструменты</h2></div><div class="panel">${seg("kit", "Барабанный кит", Object.entries(AU.KITS).map(([k, v]) => [k, v.n]))}${seg("gtone", "Звук гитары", Object.entries(AU.TONES).map(([k, v]) => [k, v.n]))}${seg("synth", "Пресет синтезатора", Object.entries(AU.PRESETS).filter(([k, p]) => !p.hide && !k.startsWith("__")).slice(0, 6).map(([k, v]) => [k, v.n]))}</div>`;
    b += `<div class="ctrl"><button class="btn soft" id="sTest">${IC.sound}Проверить звук</button><button class="btn ghost" data-act="audioreset">${IC.refresh}Перезапустить звук</button></div><p class="note">Если звук пропал, нажмите «Перезапустить звук» — приложение пересоздаст аудиосистему без перезагрузки.</p>`;
  } else if (page === "inst") {
    b += `<div class="panel">${seg("names", "Названия нот", [["latin", "C D E"], ["ru", "До Ре Ми"]])}${seg("flats", "Чёрные клавиши", [[0, "Диезы ♯"], [1, "Бемоли ♭"]])}</div>`;
    b += `<div class="sec"><h2>Гитара</h2></div><div class="panel">${sw("lefty", "Гриф для левши")}<div class="set col"><div class="k"><b>Строй</b></div><div class="seg" data-sg="tuning">${Object.entries(TUNINGS).map(([k, t]) => `<button data-v="${k}" class="${SET.tuning === k ? "on" : ""}">${t.n.split(" (")[0]}</button>`).join("")}</div></div>${rng("frets", "Ладов на грифе в уроках", 12, 22, 1, v => v)}</div>`;
    b += `<div class="sec"><h2>Клавиши</h2></div><div class="panel">${seg("keyLabels", "Подписи клавиш", [[0, "Нет"], [1, "Только C"], [2, "Все белые"]])}${rng("keyW", "Ширина клавиш", 30, 70, 2, v => v + "px")}${rng("keyH", "Высота клавиш", 140, 280, 10, v => v + "px")}</div>`;
  } else if (page === "goal") {
    b += `<div class="panel" style="padding:16px"><p>Опыт начисляется за уроки, тесты и тренировки. Урок с тестом — около 30 XP, раунд тренировки — 10–20 XP.</p></div><div class="panel" style="margin-top:10px">${[[30, "Лёгкая", "5–10 минут"], [60, "Обычная", "15–20 минут"], [100, "Серьёзная", "30 минут"], [150, "Интенсив", "45+ минут"]].map(([v, n, s]) => `<button class="set" data-goal="${v}"><span class="k"><b>${n} · ${v} XP</b><small>${s}</small></span><span class="v" style="color:var(--accent)">${SET.goal === v ? IC.check : ""}</span></button>`).join("")}</div>`;
  } else if (page === "ai") {
    b += `<div class="panel" style="padding:16px"><p style="font-size:15px">Всё приложение работает без ИИ. Преподаватель отвечает на вопросы по урокам, подбирает упражнения и составляет план занятий.</p><p class="note">Нужен свой ключ Claude API — его можно создать на console.anthropic.com в разделе API Keys. Оплата там отдельная, один ответ стоит доли цента. Лимит чата Claude при этом не тратится. Ключ хранится только на этом устройстве и не попадает в копию.</p></div>
    <div class="sec"><h2>Ключ API</h2></div><input class="field" id="aiKey" type="password" placeholder="sk-ant-..." value="${esc(SET.apiKey)}" autocomplete="off" autocapitalize="off" spellcheck="false">
    <div class="sec"><h2>Модель</h2></div><div class="panel">${MODELS.map(([k, n]) => `<button class="set" data-model="${k}"><span class="k"><b>${n.split(" · ")[0]}</b><small>${n.split(" · ")[1]}</small></span><span class="v" style="color:var(--accent)">${SET.model === k ? IC.check : ""}</span></button>`).join("")}</div>
    <div class="ctrl"><button class="btn primary grow" id="aiSave">Сохранить</button><button class="btn soft" id="aiTest">Проверить</button>${SET.apiKey ? `<button class="btn warn" id="aiDel">Удалить ключ</button>` : ""}</div><div id="aiMsg" class="note"></div>`;
  } else if (page === "backup") {
    b += `<div class="panel" style="padding:16px"><p style="font-size:15px">Так переносятся прогресс, достижения, настройки и сохранённые биты между iPad и iPhone.</p><p class="note">1. На первом устройстве нажмите «Сохранить копию» и выберите «Сохранить в Файлы» → iCloud Drive.<br>2. На втором устройстве нажмите «Загрузить копию» и выберите этот файл. Данные объединятся: опыт и звёзды возьмутся лучшие, дни практики сложатся.</p></div>
    <div class="ctrl"><button class="btn primary grow" id="bkSave">${IC.share}Сохранить копию</button><button class="btn soft grow" id="bkLoad">${IC.down}Загрузить копию</button></div><p class="note" id="bkMsg"></p>
    <div class="sec"><h2>Сброс</h2></div><button class="btn warn block" id="bkReset">${IC.trash}Сбросить весь прогресс</button>`;
  } else if (page === "about") {
    const ls = COURSE_ORDER.reduce((a, c) => a + allLessons(c).length, 0);
    b += `<div class="panel" style="padding:18px"><h3 style="font:700 20px var(--f-head)">Лад</h3><p class="note" style="margin-top:4px">Уроки и практика для гитары, барабанов и клавиш</p><p style="margin-top:12px;font-size:15px">${ls} уроков в 6 курсах, ${EAR_SETS.length} тренировок слуха, ${RHY_LV.length + DRUM_LV.length + HAND_LV.length} уровней ритм-игры, 6 инструментов в Студии. Все звуки синтезируются на устройстве — без записей и без интернета.</p></div>
    <div class="sec"><h2>Установка</h2></div><div class="panel" style="padding:16px"><p class="note" style="margin:0">Safari → «Поделиться» → «На экран Домой». После первого открытия приложение работает офлайн. Обновления приходят сами, когда есть интернет: появится кнопка «Обновить».</p></div>
    <div class="sec"><h2>Шрифты</h2></div><div class="src">Manrope и Onest — SIL Open Font License 1.1.</div>`;
  }
  const el = openLayer(titles[page], b, { onClose: () => render() });
  $$("[data-skin]", el).forEach(x => x.onclick = () => { SET.skin = x.dataset.skin; saveSet(); closeLayer(); openSettings(page) });
  $$("[data-acc]", el).forEach(x => x.onclick = () => { SET.accent = x.dataset.acc; saveSet(); closeLayer(); openSettings(page) });
  $$("[data-sw]", el).forEach(x => x.onclick = () => { const k = x.dataset.sw; SET[k] = SET[k] ? 0 : 1; saveSet(); x.querySelector(".switch").classList.toggle("on", !!SET[k]) });
  $$("[data-rg]", el).forEach(x => x.oninput = () => { const k = x.dataset.rg; SET[k] = +x.value; x.nextElementSibling.textContent = k === "vol" ? Math.round(SET[k] * 100) + "%" : k.startsWith("key") || k === "fsz" ? x.value + "px" : x.value; clearTimeout(x._t); x._t = setTimeout(saveSet, 150) });
  $$("[data-sg]", el).forEach(g => $$("button", g).forEach(x => x.onclick = () => { const k = g.dataset.sg, v = x.dataset.v; SET[k] = /^-?\d+(\.\d+)?$/.test(v) ? +v : v; saveSet(); $$("button", g).forEach(y => y.classList.toggle("on", y === x)); if (k === "kit") { AU.init(); AU.setKit(v); AU.loadKit(v).then(() => { AU.drum("kick"); AU.drum("snare", AU.now() + .25) }) } if (k === "gtone") { AU.init(); AU.strum(shapeMidis(GCH.E), 0, {}) } }));
  $$("[data-goal]", el).forEach(x => x.onclick = () => { SET.goal = +x.dataset.goal; saveSet(); closeLayer(); openSettings("goal") });
  $$("[data-model]", el).forEach(x => x.onclick = () => { SET.model = x.dataset.model; saveSet(); $$("[data-model] .v", el).forEach(v => v.innerHTML = ""); x.querySelector(".v").innerHTML = IC.check });
  bindView(el);
  const q = s => el.querySelector(s);
  if (q("#sTest")) q("#sTest").onclick = () => { AU.init(); AU.drum("kick"); AU.drum("snare", AU.now() + .3); AU.note(60, AU.now() + .6, .4); AU.pluck(52, AU.now() + 1) };
  if (page === "ai") {
    q("#aiSave").onclick = () => { SET.apiKey = q("#aiKey").value.trim(); saveSet(); toast(SET.apiKey ? "Ключ сохранён" : "Ключ удалён") };
    q("#aiTest").onclick = async () => { SET.apiKey = q("#aiKey").value.trim(); saveSet(); q("#aiMsg").textContent = "Проверяю…"; try { const r = await askClaude("Ответь одним словом по-русски: готов?", 20); q("#aiMsg").textContent = "Работает: " + r } catch (e) { q("#aiMsg").textContent = aiErr(e) } };
    if (q("#aiDel")) q("#aiDel").onclick = () => { SET.apiKey = ""; saveSet(); closeLayer(); openSettings("ai") };
  }
  if (page === "backup") {
    q("#bkSave").onclick = backupSave; q("#bkLoad").onclick = () => $("#restore").click();
    q("#bkReset").onclick = () => openSheet(`<h2>Сбросить прогресс?</h2><p class="note">Опыт, звёзды, серия и достижения будут удалены. Настройки останутся.</p><div style="display:flex;gap:10px;margin-top:16px"><button class="btn soft" style="flex:1" onclick="closeSheet()">Отмена</button><button class="btn warn" style="flex:1" id="rsOk">Сбросить</button></div>`) || ($("#rsOk").onclick = () => { localStorage.removeItem("lad_state"); location.reload() });
  }
}

/* ======================= backup ======================= */
async function backupSave() {
  const data = { app: "lad", v: 1, at: new Date().toISOString(), set: Object.assign({}, SET, { apiKey: "" }), st: ST, dm: LS.get("lad_dmsaved", {}), metro: LS.get("lad_metro", {}) };
  const name = "lad-backup-" + today() + ".json", blob = new Blob([JSON.stringify(data)], { type: "application/json" }), file = new File([blob], name, { type: "application/json" });
  const msg = $("#bkMsg");
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Копия Лада" }); msg && (msg.textContent = "Копия готова. Если выбрали «Сохранить в Файлы», она лежит в iCloud Drive."); return } } catch (e) { if (e && e.name === "AbortError") return }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 2000);
  msg && (msg.textContent = "Файл скачан: " + name);
}
$("#restore").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    const d = JSON.parse(await f.text()); if (d.app !== "lad") throw 0;
    const s = d.st || {};
    ST.xp = Math.max(ST.xp, s.xp || 0);
    for (const k in s.days || {}) ST.days[k] = Math.max(ST.days[k] || 0, s.days[k]);
    for (const k in s.mins || {}) ST.mins[k] = Math.max(ST.mins[k] || 0, s.mins[k]);
    for (const k in s.done || {}) ST.done[k] = Math.max(ST.done[k] || 0, s.done[k]);
    for (const k in s.ach || {}) ST.ach[k] = ST.ach[k] || s.ach[k];
    for (const k in s.games || {}) { const a = ST.games[k] || {}, b = s.games[k]; ST.games[k] = { best: k === "tempo" ? Math.min(a.best ?? 1e9, b.best ?? 1e9) : Math.max(a.best || 0, b.best || 0), stars: Math.max(a.stars || 0, b.stars || 0), acc: Math.max(a.acc || 0, b.acc || 0), combo: Math.max(a.combo || 0, b.combo || 0), streak: Math.max(a.streak || 0, b.streak || 0), plays: (a.plays || 0) + (b.plays || 0) } }
    for (const k in s.use || {}) ST.use[k] = Math.max(ST.use[k] || 0, s.use[k]);
    ST.daily = Object.assign({}, s.daily || {}, ST.daily || {});
    if (s.quiz) ST.quiz = { ok: Math.max(ST.quiz.ok, s.quiz.ok), all: Math.max(ST.quiz.all, s.quiz.all) };
    saveState();
    if (d.set) { const key = SET.apiKey; SET = Object.assign({}, DEF, d.set, { apiKey: key }); saveSet() }
    if (d.dm) LS.set("lad_dmsaved", Object.assign({}, LS.get("lad_dmsaved", {}), d.dm));
    if (d.metro) LS.set("lad_metro", d.metro);
    toast("Копия загружена"); checkAch(); while (LAYERS.length) closeLayer(); render();
  } catch (er) { toast("Это не файл копии Лада") }
};

/* ======================= AI teacher ======================= */
function lessonText(l) { return l.b.filter(x => typeof x === "string").join("\n").replace(/\*\*/g, "").slice(0, 2500) }
function progressSummary() {
  const parts = COURSE_ORDER.map(c => `${COURSES[c].n}: ${allLessons(c).filter(l => ST.done[l.id]).length}/${allLessons(c).length}`);
  const games = Object.entries(ST.games).slice(0, 12).map(([k, g]) => `${k}: звёзд ${g.stars || 0}${g.best != null ? ", лучший " + g.best : ""}`);
  const recent = Object.keys(ST.done).slice(-6).map(id => findLesson(id)?.l.t).filter(Boolean);
  return `Уровень ${level().n}, опыт ${ST.xp}, серия ${streak()} дн., минут практики ${totalMin()}.\nКурсы: ${parts.join("; ")}.\nНедавние уроки: ${recent.join(", ") || "нет"}.\nТренировки: ${games.join("; ") || "нет"}.`;
}
function askTeacher(l) {
  const quick = l ? ["Объясни проще, на примере", "Дай упражнение на 10 минут", "Как применить это на гитаре?", "Как применить это на барабанах?", "Какие песни послушать по теме?"] : ["С чего начать импровизацию?", "Как развить чувство ритма?", "Как играть ровнее на барабанах?", "Как подобрать песню на слух?"];
  openSheet(`<h2>${l ? "Вопрос по уроку" : "Вопрос преподавателю"}</h2>${l ? `<p class="note" style="margin-top:0">«${esc(l.t)}»</p>` : ""}
    <div class="chips" style="margin:10px 0">${quick.map(qq => `<button class="chip" data-q="${esc(qq)}">${esc(qq)}</button>`).join("")}</div>
    <textarea class="field" id="aiQ" placeholder="Ваш вопрос…" rows="3"></textarea>
    <button class="btn primary block" style="margin-top:10px" id="aiGo">${IC.spark}Спросить</button><div id="aiA"></div>
    ${SET.apiKey ? "" : `<p class="note">Нужен ключ Claude API: Профиль → Преподаватель ИИ.</p>`}`);
  $$("#sbody [data-q]").forEach(c => c.onclick = () => { $("#aiQ").value = c.dataset.q; go() });
  const go = async () => {
    const qv = $("#aiQ").value.trim(); if (!qv) return; const box = $("#aiA");
    box.innerHTML = `<div class="box ai"><div class="skel" style="width:90%"></div><div class="skel" style="width:70%"></div><div class="skel" style="width:80%"></div></div>`;
    try {
      const prompt = (l ? `Урок «${l.t}» (${l.d}). Текст урока:\n${lessonText(l)}\n\n` : "") + `Прогресс ученика:\n${progressSummary()}\n\nВопрос: ${qv}`;
      const r = await askClaude(prompt, 900, AI_SYS); box.innerHTML = `<div class="box ai">${esc(r)}</div>`; addXP(2);
    } catch (e) { box.innerHTML = `<div class="box">${esc(aiErr(e))}</div>` }
  };
  $("#aiGo").onclick = go;
}
async function askPlan() {
  openSheet(`<h2>План на неделю</h2><p class="note" style="margin-top:0">Преподаватель посмотрит на ваш прогресс и предложит занятия на 7 дней.</p><div class="ctrl">${segHTML("pmin", [[15, "15 мин/день"], [30, "30 мин"], [60, "60 мин"]], 30)}</div><div class="ctrl">${segHTML("pfoc", [["all", "Всё понемногу"], ["guitar", "Гитара"], ["drums", "Барабаны"], ["keys", "Клавиши"]], "all")}</div><button class="btn primary block" id="plGo">${IC.spark}Составить план</button><div id="plA"></div>`);
  let mins = 30, foc = "all"; bindSeg($("#sbody"), "pmin", v => mins = +v); bindSeg($("#sbody"), "pfoc", v => foc = v);
  $("#plGo").onclick = async () => {
    const box = $("#plA"); box.innerHTML = `<div class="box ai"><div class="skel"></div><div class="skel" style="width:70%"></div></div>`;
    const titles = COURSE_ORDER.map(c => COURSES[c].n + ": " + allLessons(c).map(l => l.t).join(", ")).join("\n");
    try { const r = await askClaude(`Прогресс:\n${progressSummary()}\n\nВ приложении есть уроки:\n${titles}\nИ тренировки: ритм-игра (чтение ритма, барабанные биты, рудименты руками), слух (интервалы, аккорды, лады), ноты на грифе и клавиатуре, держи темп, повтори ритм. Инструменты: метроном с тренером, драм-машина, синтезатор, тюнер.\n\nСоставь план на 7 дней по ${mins} минут в день, фокус: ${foc === "all" ? "всё понемногу" : foc}. Для каждого дня: какие уроки приложения пройти, какие тренировки сделать и упражнение на инструменте с темпом в BPM. Коротко, по дням.`, 1400, AI_SYS); box.innerHTML = `<div class="box ai">${esc(r)}</div>` }
    catch (e) { box.innerHTML = `<div class="box">${esc(aiErr(e))}</div>` }
  };
}

/* ======================= boot ======================= */
render();
checkAch();
if ("serviceWorker" in navigator && location.protocol !== "file:" && !/claudeusercontent|claude\.ai/.test(location.host)) {
  navigator.serviceWorker.register("sw.js").then(reg => {
    const show = w => { $("#update").hidden = false; $("#updBtn").onclick = () => w.postMessage("skip") };
    if (reg.waiting && navigator.serviceWorker.controller) show(reg.waiting);
    reg.addEventListener("updatefound", () => { const w = reg.installing; w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) show(w) }) });
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }).catch(() => {});
  let reloaded = false; navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload() } });
}
document.addEventListener("keydown", e => { if (e.key === "Escape") { if ($("#sheet").classList.contains("open")) closeSheet(); else if (LAYERS.length) closeLayer() } });
