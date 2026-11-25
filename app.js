{
'use strict';
/* ========== helpers ========== */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const view = $('#view');
// Outside Claude (e.g. GitHub Pages) there is no account sync and no Claude check for Writing.
const IN_CLAUDE = !!(window.claude && typeof window.claude.use === 'function');
const WRITE_LABEL = IN_CLAUDE ? 'Написать и проверить' : 'Тренировка письма';
const DAY = 864e5;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmtTime = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), x = s % 60; return (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x; };
const norm = s => String(s || '').toLowerCase().replace(/[’`]/g, "'").replace(/[.!?,]+$/,'').replace(/\s+/g, ' ').trim();
const exHTML = (ex, blank) => esc(ex).replace(/\[\[(.+?)\]\]/g, (_, w) => blank ? '_____' : '<b>' + w + '</b>');
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
const svgI = (d, fill) => '<svg class="icon" viewBox="0 0 24 24" ' + (fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') + ' aria-hidden="true">' + d + '</svg>';
const ICON = {
  back: svgI('<path d="M15 18l-6-6 6-6"/>'),
  clock: svgI('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>'),
  flag: svgI('<path d="M5 21V4h11l-2 4 2 4H5"/>'),
  fire: svgI('<path d="M12 2c.6 3.4 3.9 5.4 5.5 8.5 1.9 3.8.1 9.5-5.5 9.5S4.4 16.1 5.6 12.4c.6-1.8 1.8-2.9 2.4-4.1.3 1.6 1 2.7 2 3.2C10 8.6 10.8 5 12 2z"/>', 1),
  bolt: svgI('<path d="M13.5 2 4 14h7l-1.5 8L19 10h-7l1.5-8z"/>', 1),
  check: svgI('<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="3"/>'),
  x: svgI('<path d="M6 6l12 12M18 6 6 18" stroke-width="2.5"/>'),
  trophy: svgI('<path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9.5 17h5"/>'),
  star: svgI('<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>', 1),
  target: svgI('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
  home: svgI('<path d="M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5"/>'),
  cards: svgI('<rect x="3" y="7" width="13" height="14" rx="2.5"/><path d="M8 3h10.5A2.5 2.5 0 0 1 21 5.5V17"/>'),
  book: svgI('<path d="M2 5.5c3-1.3 6.5-1.3 10 1 3.5-2.3 7-2.3 10-1v14c-3-1.3-6.5-1.3-10 1-3.5-2.3-7-2.3-10-1v-14zM12 6.5v14"/>'),
  pen: svgI('<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>'),
  list: svgI('<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2.4"/>'),
  up: svgI('<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>'),
  medal: svgI('<circle cx="12" cy="15" r="6"/><path d="M8.5 10.2 6 2.5h4l2 4.5 2-4.5h4l-2.5 7.7M12 12.5v5"/>'),
  sheet: svgI('<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>')
};

/* ========== storage: account (db) or this browser ========== */
const KEYS = ['words', 'reading', 'writing', 'meta'];
const Store = {
  data: { words: {}, reading: { results: {}, run: null }, writing: { drafts: {}, history: [] }, meta: {} },
  cloud: null, uid: null, timers: {}, busy: {}, again: {},
  loadLocal() {
    for (const k of KEYS) { try { const v = JSON.parse(localStorage.getItem('b2:' + k)); if (v && typeof v === 'object') Object.assign(this.data[k], v); } catch (e) {} }
  },
  save(k) {
    try { localStorage.setItem('b2:' + k, JSON.stringify(this.data[k])); } catch (e) {}
    if (!this.cloud) return;
    clearTimeout(this.timers[k]);
    this.timers[k] = setTimeout(() => this.push(k), 1200);
  },
  async push(k) {
    if (this.busy[k]) { this.again[k] = true; return; }
    this.busy[k] = true;
    try { await this.cloud.doc('data/users/' + this.uid + '/' + k).set(JSON.parse(JSON.stringify(this.data[k]))); }
    catch (e) { if (e && (e.code === 'invalid_argument' || e.code === 'revoked' || e.code === 'not_granted')) { this.cloud = null; syncStatus(); } }
    this.busy[k] = false;
    if (this.again[k]) { this.again[k] = false; this.push(k); }
  },
  async connect() {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    try {
      const [user, db] = await Promise.all([window.claude.use('user'), window.claude.use('db')]);
      if (!user || !db) return;
      const uid = await user.id();
      if (!uid) return;
      for (const k of KEYS) {
        const snap = await db.doc('data/users/' + uid + '/' + k).get();
        if (snap.exists) {
          const remote = snap.data() || {};
          if (k === 'words') { const loc = this.data.words; for (const id in remote) if (!loc[id] || (remote[id].s || 0) >= (loc[id].s || 0)) loc[id] = remote[id]; }
          else if (k === 'meta') {
            const m = this.data.meta, lx = m.xp || {}, lb = m.badges || {}, lt = m.xpTotal || 0;
            Object.assign(m, remote);
            const x = Object.assign({}, remote.xp || {}); for (const d in lx) x[d] = Math.max(lx[d], x[d] || 0);
            m.xp = x; m.badges = Object.assign({}, remote.badges || {}, lb); m.xpTotal = Math.max(lt, remote.xpTotal || 0);
          }
          else Object.assign(this.data[k], remote);
        }
      }
      this.cloud = db; this.uid = uid;
      for (const k of KEYS) this.save(k);
      syncStatus(); route();
    } catch (e) { /* stay local */ }
  }
};
function syncStatus() {
  $('#syncDot').classList.toggle('on', !!Store.cloud);
  $('#syncTxt').textContent = Store.cloud ? 'Прогресс сохраняется в твоём аккаунте' : 'Прогресс хранится в этом браузере';
}
const setLast = (hash, label) => { Store.data.meta.last = { hash, label, t: Date.now() }; Store.save('meta'); };

/* ========== XP, streak, badges, feedback fx ========== */
// XP follows Cambridge marking where it exists: Reading = exam marks, Writing = 0–20 by the 4 criteria.
// Words have no Cambridge marks: card «Знаю» = 1 XP, correct test answer = 2 XP.
const dkey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => dkey(new Date());
const xpLog = () => Store.data.meta.xp || (Store.data.meta.xp = {});
const xpToday = () => xpLog()[today()] || 0;
const goalXP = () => Store.data.meta.goal || 30;
const GOALS = [[10, 'Лёгкая', '~5 мин'], [20, 'Обычная', '~10 мин'], [30, 'Средняя', '~15 мин'], [50, 'Серьёзная', '~25 мин']];
const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function streak() {
  const log = xpLog(), d = new Date(); let n = 0;
  if (!log[dkey(d)]) d.setDate(d.getDate() - 1);
  while (log[dkey(d)] > 0) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function bestStreak() {
  const log = xpLog(), days = Object.keys(log).filter(k => log[k] > 0).sort();
  let best = 0, run = 0, prev = null;
  for (const k of days) { const t = new Date(k + 'T12:00'); run = prev && t - prev < 1.5 * DAY ? run + 1 : 1; best = Math.max(best, run); prev = t; }
  return best;
}
function weekStrip() {
  const names = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], log = xpLog(), out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const hit = log[dkey(d)] > 0;
    out.push('<div class="' + (hit ? 'hit' : '') + (i === 0 ? ' today' : '') + '" title="' + dkey(d) + (hit ? ' · ' + log[dkey(d)] + ' XP' : '') + '"><i>' + (hit ? ICON.fire : '') + '</i>' + names[d.getDay()] + '</div>');
  }
  return '<div class="week" aria-label="Активность за неделю">' + out.join('') + '</div>';
}
function ring(val, max, label) {
  const C = 2 * Math.PI * 42, pc = Math.min(1, max ? val / max : 0);
  return '<div class="ring' + (pc >= 1 ? ' done' : '') + '"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" r="42" fill="none" stroke-width="12"/>' +
    '<circle class="val" cx="50" cy="50" r="42" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pc)).toFixed(1) + '"/></svg>' +
    '<div class="in"><div><b>' + val + '</b><br><span>' + esc(label) + '</span></div></div></div>';
}
function renderHud(bump) {
  const s = streak(), x = xpToday(), g = goalXP(), lit = xpToday() > 0;
  const html = '<a class="chip fire' + (lit ? '' : ' off') + '" href="#badges" title="Дней подряд' + (lit ? '' : ' — позанимайся сегодня, чтобы не потерять серию') + '">' + ICON.fire + s + '</a>' +
    '<a class="chip xp' + (x >= g ? ' goal-done' : '') + (bump ? ' bump' : '') + '" href="#badges" title="XP за сегодня / цель дня">' + ICON.bolt + x + ' / ' + g + ' XP</a>';
  ['#hud', '#hudTop'].forEach(sel => { const el = $(sel); if (el) el.innerHTML = html; });
}
function addXP(n, from) {
  n = Math.round(n); if (!(n > 0)) return;
  const k = today(), before = xpLog()[k] || 0;
  xpLog()[k] = before + n;
  Store.data.meta.xpTotal = (Store.data.meta.xpTotal || 0) + n;
  Store.save('meta');
  popXP(n, from);
  renderHud(true);
  if (before < goalXP() && before + n >= goalXP()) setTimeout(() => { toast(ICON.target, 'Цель дня выполнена', goalXP() + ' XP за сегодня — так держать!'); confetti(70); sound('win'); }, 400);
  checkBadges();
}
function popXP(n, from) {
  const fx = $('#fx'); if (!fx) return;
  const r = from && from.isConnected ? from.getBoundingClientRect() : null;
  const el = document.createElement('div');
  el.className = 'xp-pop'; el.textContent = '+' + n + ' XP';
  el.style.left = (r ? r.left + r.width / 2 : innerWidth / 2) + 'px';
  el.style.top = (r ? r.top - 4 : innerHeight / 3) + 'px';
  fx.appendChild(el); setTimeout(() => el.remove(), 1000);
}
function confetti(n) {
  if (reduced()) return;
  const fx = $('#fx'); if (!fx) return;
  const cols = ['--accent', '--ok', '--flame', '--gold', '--c-reading', '--c-writing'];
  for (let i = 0; i < (n || 90); i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = 'var(' + cols[i % cols.length] + ')';
    c.style.setProperty('--x', (Math.random() * 240 - 120).toFixed(0) + 'px');
    c.style.setProperty('--r', (Math.random() * 1080 - 540).toFixed(0) + 'deg');
    c.style.setProperty('--d', (1.8 + Math.random() * 1.6).toFixed(2) + 's');
    c.style.animationDelay = (Math.random() * .4).toFixed(2) + 's';
    if (i % 3 === 0) { c.style.borderRadius = '50%'; c.style.height = '10px'; }
    fx.appendChild(c); setTimeout(() => c.remove(), 4400);
  }
}
const toastQ = [];
function toast(icon, label, text) {
  toastQ.push([icon, label, text]);
  if (toastQ.length === 1) showToast();
}
function showToast() {
  const [icon, label, text] = toastQ[0];
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = '<span class="medal">' + icon + '</span><span><small>' + esc(label) + '</small>' + esc(text) + '</span>';
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); toastQ.shift(); if (toastQ.length) showToast(); }, 3700);
}
let AC = null;
const soundOn = () => { try { return localStorage.getItem('b2:sound') === '1'; } catch (e) { return false; } };
function sound(kind) {
  if (!soundOn()) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const notes = { ok: [[660, 0], [880, .09]], bad: [[247, 0], [208, .13]], win: [[523, 0], [659, .1], [784, .2], [1047, .3]] }[kind];
    const t0 = AC.currentTime;
    notes.forEach(([f, dt]) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = kind === 'bad' ? 'triangle' : 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + dt); g.gain.exponentialRampToValueAtTime(.16, t0 + dt + .015); g.gain.exponentialRampToValueAtTime(.0001, t0 + dt + .28);
      o.connect(g); g.connect(AC.destination); o.start(t0 + dt); o.stop(t0 + dt + .3);
    });
  } catch (e) {}
}

const BADGES = [
  ['w10', 'Первые слова', 'Выучить 10 слов', 'star', '--gold', s => [s.words, 10]],
  ['w100', 'Сотня', 'Выучить 100 слов', 'star', '--gold', s => [s.words, 100]],
  ['w500', 'Словарный запас', 'Выучить 500 слов', 'star', '--gold', s => [s.words, 500]],
  ['abc', 'Буква покорена', 'Выучить все слова одной буквы в словаре A–Z', 'cards', '--accent', s => [s.letter, 1]],
  ['s3', 'Разогрев', 'Заниматься 3 дня подряд', 'fire', '--flame', s => [s.streak, 3]],
  ['s7', 'Неделя без пропусков', 'Заниматься 7 дней подряд', 'fire', '--flame', s => [s.streak, 7]],
  ['s30', 'Железная воля', 'Заниматься 30 дней подряд', 'fire', '--flame', s => [s.streak, 30]],
  ['goal', 'Цель взята', 'Выполнить дневную цель по XP', 'target', '--ok', s => [s.goal, 1]],
  ['r1', 'Первая часть', 'Проверить любую часть Reading & Use of English', 'book', '--c-reading', s => [s.parts, 1]],
  ['r7', 'Весь вариант', 'Пройти все 7 частей Reading & Use of English', 'book', '--c-reading', s => [s.parts, 7]],
  ['wr1', 'Первый текст', 'Проверить свой текст во Writing', 'pen', '--c-writing', s => [s.texts, 1]],
  ['wr15', 'Сильный текст', 'Получить 15 из 20 или больше во Writing', 'pen', '--c-writing', s => [s.bestText, 15]]
].filter(b => IN_CLAUDE || !b[0].startsWith('wr'));
function badgeStats() {
  const res = Store.data.reading.results || {}, hist = Store.data.writing.history || [];
  const isL = w => (st(w.id).l || 0) >= 2;
  return {
    words: W ? W.words.filter(isL).length : 0,
    letter: W && groupsOf('b2').some(g => { const ws = setWords('b2', g.g); return ws.length && ws.every(isL); }) ? 1 : 0,
    streak: Math.max(streak(), bestStreak()),
    goal: Object.values(xpLog()).some(v => v >= goalXP()) ? 1 : 0,
    parts: Object.keys(res).length,
    texts: hist.length,
    bestText: hist.reduce((a, h) => Math.max(a, h.total || 0), 0)
  };
}
function checkBadges(silent) {
  if (!W) return;
  const got = Store.data.meta.badges || (Store.data.meta.badges = {}), s = badgeStats(); let any = false;
  for (const b of BADGES) {
    if (got[b[0]]) continue;
    const [v, need] = b[5](s);
    if (v >= need) { got[b[0]] = Date.now(); any = true; if (!silent) toast(ICON[b[3]], 'Новое достижение', b[1]); }
  }
  if (any) { Store.save('meta'); if (!silent) sound('win'); renderNav((location.hash || '#home').slice(1)); }
}

/* ========== data ========== */
let W = null, R = null, WR = null;
async function loadData() {
  const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
  [W, R, WR] = await Promise.all([get('data/words.json'), get('data/reading.json'), get('data/writing.json')]);
  W.byId = {}; for (const w of W.words) W.byId[w.id] = w;
}

/* ========== theme + nav ========== */
const THEMES = [['', 'Тема: как в системе'], ['light', 'Тема: светлая'], ['dark', 'Тема: тёмная']];
function themeLabel() { const t = document.documentElement.dataset.theme || ''; $('#themeLbl').textContent = THEMES.find(x => x[0] === t)[1]; }
$('#themeBtn').addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme || '';
  const next = THEMES[(THEMES.findIndex(x => x[0] === cur) + 1) % 3][0];
  if (next) document.documentElement.dataset.theme = next; else delete document.documentElement.dataset.theme;
  try { next ? localStorage.setItem('b2:theme', next) : localStorage.removeItem('b2:theme'); } catch (e) {}
  themeLabel();
});
function soundLabel() { const on = soundOn(); $('#soundLbl').textContent = on ? 'Звук: вкл' : 'Звук: выкл'; $('#soundBtn').setAttribute('aria-pressed', String(on)); $('#soundWave').style.display = on ? '' : 'none'; }
$('#soundBtn').addEventListener('click', () => { try { localStorage.setItem('b2:sound', soundOn() ? '0' : '1'); } catch (e) {} soundLabel(); sound('ok'); });
$('#menuBtn').addEventListener('click', () => $('#side').classList.toggle('open'));
document.addEventListener('click', e => { if (window.innerWidth <= 900 && !e.target.closest('#side') && !e.target.closest('#menuBtn')) $('#side').classList.remove('open'); });

function learned(set) { return W.words.filter(w => w.set === set && (Store.data.words[w.id]?.l || 0) >= 2).length; }
function renderNav(h) {
  const n = W ? { up: W.words.filter(w => w.set === 'up').length, nb: W.words.filter(w => w.set === 'nb').length, b2: W.words.filter(w => w.set === 'b2').length } : { up: 0, nb: 0, b2: 0 };
  const res = Store.data.reading.results || {};
  const got = Object.keys(Store.data.meta.badges || {}).length;
  const items = [
    ['h', 'Главная', 'home', '', 'home', '--accent'],
    ['s', 'Слова'], ['a', 'Upgrade', 'words-up', W ? learned('up') + '/' + n.up : '', 'up', '--c-words'], ['a', 'Тетрадь', 'words-nb', W ? learned('nb') + '/' + n.nb : '', 'list', '--c-words'], ['a', 'Словарь B2 · A–Z', 'words-b2', W ? learned('b2') + '/' + n.b2 : '', 'cards', '--c-words'],
    ['s', 'Reading & Use of English'], ['a', 'Вариант 1 · все части', 'reading', Object.keys(res).length + '/7', 'book', '--c-reading'],
    ['s', 'Writing'], ['a', 'Шпаргалки', 'writing', '', 'sheet', '--c-writing'], ['a', WRITE_LABEL, 'write', '', 'pen', '--c-writing'],
    ['s', 'Прогресс'], ['a', 'Достижения', 'badges', got + '/' + BADGES.length, 'medal', '--gold-deep']
  ];
  $('#nav').innerHTML = items.map(it => it[0] === 's' ? '<div class="nav-h">' + esc(it[1]) + '</div>'
    : '<a href="#' + it[2] + '" class="' + ((h === it[2] || (it[2] === 'write' && h.startsWith('write-')) || (it[2] === 'writing' && h.startsWith('fmt-')) || (it[2] === 'reading' && (h.startsWith('part-') || h === 'full-test'))) ? 'on' : '') + '"><span class="ni" style="--c:var(' + it[5] + ')">' + ICON[it[4]] + '</span><span class="lb">' + esc(it[1]) + '</span>' + (it[3] ? '<span class="cnt">' + esc(it[3]) + '</span>' : '') + '</a>').join('');
  renderHud();
}

/* ========== router ========== */
let cleanup = null;
function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  const h = (location.hash || '#home').slice(1) || 'home';
  document.body.classList.remove('exam');
  $('#side').classList.remove('open');
  renderNav(h);
  if (!W) { view.innerHTML = '<div class="page"><div class="empty">Загрузка…</div></div>'; return; }
  if (h === 'home') return Home();
  if (h === 'words' || h === 'words-up') return Words('up');
  if (h === 'words-nb') return Words('nb');
  if (h === 'words-b2') return Words('b2');
  if (h === 'reading') return ReadingHub();
  if (/^part-[1-7]$/.test(h)) return Exam('part', [+h.slice(5)]);
  if (h === 'full-test') return Exam('full', [1, 2, 3, 4, 5, 6, 7]);
  if (h === 'writing') return WritingHub();
  if (h === 'badges') return Badges();
  if (h.startsWith('fmt-')) return Sheet(h.slice(4));
  if (h === 'write') return Write(null);
  if (h.startsWith('write-')) return Write(h.slice(6));
  Home();
}
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

/* ========== home ========== */
function Home() {
  const d = Store.data, res = d.reading.results || {};
  const tot = W.words.length, lw = learned('up') + learned('nb') + learned('b2');
  const parts = Object.keys(res).length;
  const hist = d.writing.history || [];
  const lastW = hist[hist.length - 1];
  let examLine = 'Укажи дату экзамена — покажем, сколько осталось';
  if (d.meta.exam) {
    const days = Math.ceil((new Date(d.meta.exam + 'T09:00') - Date.now()) / DAY);
    examLine = days > 0 ? 'Экзамен через ' + days + ' ' + plural(days, 'день', 'дня', 'дней') : days === 0 ? 'Экзамен сегодня — удачи!' : 'Экзамен позади';
  }
  const last = d.meta.last;
  const g = goalXP(), x = xpToday(), sk = streak();
  const tile = (href, c, icon, title, text, go) => '<a class="card tile sec" href="#' + href + '" style="--c:var(' + c + ')"><span class="ic">' + ICON[icon] + '</span><h3>' + title + '</h3><p class="muted">' + text + '</p><span class="go">' + go + ' →</span></a>';
  view.innerHTML = '<div class="page home">' +
    '<div class="head"><div><div class="muted small">' + esc(examLine) + '</div><h1>Подготовка к B2 First</h1></div>' +
    '<label class="small muted" style="display:flex;flex-direction:column;gap:4px">Дата экзамена<input type="date" id="exDate" value="' + esc(d.meta.exam || '') + '"></label></div>' +
    '<div class="grid4">' +
    '<div class="card stat"><div class="muted small">Слов выучено</div><b>' + lw + ' <small>/ ' + tot + '</small></b><div class="bar thin" style="margin-top:12px;--c:var(--c-words)"><i style="width:' + (lw / tot * 100).toFixed(1) + '%"></i></div></div>' +
    '<div class="card stat"><div class="muted small">Reading &amp; UoE</div><b>' + parts + ' <small>/ 7 частей</small></b><div class="bar thin" style="margin-top:12px;--c:var(--c-reading)"><i style="width:' + (parts / 7 * 100).toFixed(1) + '%"></i></div></div>' +
    (IN_CLAUDE ? '<div class="card stat"><div class="muted small">Текстов проверено</div><b>' + hist.length + '</b><div class="muted small" style="margin-top:8px">' + (lastW ? 'Последний: ' + esc(lastW.fmt) + ' · ' + lastW.total + '/20' : 'Пока ни одного') + '</div></div>' : '<div class="card stat"><div class="muted small">Текстов написано</div><b>' + Object.values(d.writing.drafts || {}).filter(x => x && x.text && x.text.trim()).length + '</b><div class="muted small" style="margin-top:8px">Черновики сохраняются сами</div></div>') +
    '<a class="card stat tile goal-card' + (x >= g ? ' done' : '') + '" href="#badges" style="--c:var(--gold)"><div class="muted small">Цель дня' + (sk ? ' · <span style="color:var(--flame);font-weight:800">' + sk + ' ' + plural(sk, 'день', 'дня', 'дней') + ' подряд</span>' : '') + '</div><b>' + x + ' <small>/ ' + g + ' XP</small></b>' +
    '<div class="bar thin" style="margin-top:12px;--c:' + (x >= g ? 'var(--ok)' : 'var(--gold)') + '"><i style="width:' + Math.min(100, x / g * 100).toFixed(1) + '%"></i></div><div style="margin-top:12px">' + weekStrip() + '</div></a>' +
    '</div>' +
    (last ? '<div class="cont"><div><div class="lbl">Продолжить</div><div class="big">' + esc(last.label) + '</div></div><a class="btn lg" href="#' + esc(last.hash) + '">Продолжить →</a></div>' :
      '<div class="cont"><div><div class="lbl">С чего начать</div><div class="big">Upgrade-слова: простое → сильное</div></div><a class="btn lg" href="#words-up">Начать →</a></div>') +
    '<div class="grid3">' +
    tile('words-up', '--c-words', 'cards', 'Слова', 'Словарь B2 по буквам A–Z, Upgrade (простое → сложное) и слова из тетради. Карточки, тесты, повтор ошибок.', 'Учить') +
    tile('reading', '--c-reading', 'book', 'Reading &amp; Use of English', 'Все 7 частей в формате экзамена, с таймером и объяснением каждого ответа.', 'Тренироваться') +
    tile('writing', '--c-writing', 'pen', 'Writing', (IN_CLAUDE ? 'Шпаргалки по 6 форматам и проверка твоего текста по критериям FCE.' : 'Шпаргалки по 6 форматам и тренировка письма с таймером и счётчиком слов.'), 'Писать') +
    '</div></div>';
  $('#exDate').addEventListener('change', e => { d.meta.exam = e.target.value; Store.save('meta'); Home(); });
}

/* ========== words ========== */
const INT = [0, 1, 3, 7, 14, 30];
const WS = { set: 'up', tab: 'learn', sess: null, test: null, q: '', g: 'all' };
const st = id => Store.data.words[id] || {};
function grade(id, g) {
  const s = Object.assign({ l: 0, d: 0, w: 0, s: 0 }, Store.data.words[id]);
  s.s++;
  if (g === 0) { s.l = 0; s.w++; s.d = Date.now(); }
  else if (g === 1) { s.l = Math.max(1, s.l); s.d = Date.now() + DAY; }
  else { s.l = Math.min(5, s.l + 1); s.d = Date.now() + INT[s.l] * DAY; }
  Store.data.words[id] = s; Store.save('words');
}
const setWords = (set, g) => W.words.filter(w => w.set === set && (g === 'all' || g == null || w.g === +g));
const groupsOf = set => W.groups.filter(g => g.set === set);
const mistakes = set => W.words.filter(w => w.set === set && (st(w.id).w || 0) > 0 && (st(w.id).l || 0) < 2);

function Words(set) {
  if (WS.set !== set) { WS.set = set; WS.sess = null; WS.test = null; WS.g = 'all'; }
  if (WS.sess) return Cards();
  if (WS.test) return Test();
  const up = set === 'up';
  const all = W.words.filter(w => w.set === set);
  const due = all.filter(w => st(w.id).s && st(w.id).d <= Date.now()).length;
  const mis = mistakes(set).length;
  const tabs = [['learn', set === 'b2' ? 'Буквы' : 'Наборы'], ['list', 'Список слов'], ['mist', 'Мои ошибки · ' + mis]];
  let body = '';
  if (WS.tab === 'learn' && set === 'b2') {
    const gs = groupsOf('b2');
    if (WS.letter == null) { const f = gs.find(g => setWords('b2', g.g).some(w => (st(w.id).l || 0) < 2)); WS.letter = f ? f.g : 0; }
    const G = gs.find(g => g.g === WS.letter) || gs[0];
    const ws = setWords('b2', G.g), ln = ws.filter(w => (st(w.id).l || 0) >= 2).length, seen = ws.filter(w => st(w.id).s).length;
    body = '<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap"><div><h3>' + (due ? 'Пора повторить: ' + due + ' ' + plural(due, 'слово', 'слова', 'слов') : 'Повторений на сегодня нет') + '</h3><p class="muted small">Учи по одной букве: сначала карточки, потом тест. Выученные слова сами вернутся на повтор.</p></div>' +
      '<button class="btn pri" data-act="cards" data-g="all"' + (due ? '' : ' disabled') + '>Повторить</button></div>' +
      '<div class="abc" role="list">' + gs.map(g => { const w2 = setWords('b2', g.g), l2 = w2.filter(w => (st(w.id).l || 0) >= 2).length, pc = l2 / w2.length; return '<button type="button" role="listitem" data-letter="' + g.g + '" class="' + (g.g === G.g ? 'on' : '') + (pc >= 1 ? ' done' : '') + '" aria-label="Буква ' + esc(g.L) + ', выучено ' + l2 + ' из ' + w2.length + '"><b>' + esc(g.L) + '</b><span>' + l2 + '/' + w2.length + '</span><i style="width:' + (pc * 100).toFixed(0) + '%"></i></button>'; }).join('') + '</div>' +
      '<div class="card grp"><div class="head" style="align-items:center"><div><h2>Буква ' + esc(G.L) + '</h2><div class="muted small">' + ws.length + ' ' + plural(ws.length, 'слово', 'слова', 'слов') + ' · видел ' + seen + ' · выучено ' + ln + '</div></div>' +
      '<div class="row" style="margin:0"><button class="btn pri sm" data-act="cards" data-g="' + G.g + '">Карточки</button><button class="btn sm" data-act="test" data-kind="ru" data-g="' + G.g + '">Тест: перевод</button><button class="btn sm" data-act="test" data-kind="en" data-g="' + G.g + '">Тест: обратный</button></div></div>' +
      '<div class="prog"><div class="bar"><i style="width:' + (ln / ws.length * 100).toFixed(1) + '%"></i></div>' + ln + '/' + ws.length + '</div><div id="wlist"></div></div>';
  } else if (WS.tab === 'learn') {
    body = '<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap"><div><h3>' + (due ? 'Пора повторить: ' + due + ' ' + plural(due, 'слово', 'слова', 'слов') : 'Повторений на сегодня нет') + '</h3><p class="muted small">Слова, которые ты уже видел, возвращаются через 1, 3, 7, 14 и 30 дней.</p></div>' +
      '<div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" data-act="cards" data-g="all"' + (due ? '' : ' disabled') + '>Повторить</button></div></div>' +
      '<div class="grid2">' + groupsOf(set).map(g => {
        const ws = setWords(set, g.g), ln = ws.filter(w => (st(w.id).l || 0) >= 2).length, seen = ws.filter(w => st(w.id).s).length;
        return '<div class="card grp"><div><h3>' + esc(g.name) + '</h3>' + (g.range ? '<div class="muted small">' + esc(g.range) + '</div>' : '') + '</div>' +
          '<div class="prog"><div class="bar"><i style="width:' + (ln / ws.length * 100).toFixed(1) + '%"></i></div>' + ln + '/' + ws.length + '</div>' +
          '<div class="muted small">Видел: ' + seen + ' · выучено: ' + ln + '</div>' +
          '<div class="row"><button class="btn pri sm" data-act="cards" data-g="' + g.g + '">Карточки</button>' +
          (up ? '<button class="btn sm" data-act="test" data-kind="upgrade" data-g="' + g.g + '">Тест: апгрейд</button>' : '<button class="btn sm" data-act="test" data-kind="ru" data-g="' + g.g + '">Тест: перевод</button>') +
          '<button class="btn sm" data-act="test" data-kind="' + (up ? 'meaning' : 'en') + '" data-g="' + g.g + '">' + (up ? 'Тест: значение' : 'Тест: обратный') + '</button></div></div>';
      }).join('') + '</div>';
  } else if (WS.tab === 'list') {
    body = '<div style="display:flex;gap:10px;flex-wrap:wrap"><input type="search" id="wq" placeholder="Поиск по слову или переводу" value="' + esc(WS.q) + '" style="flex:1 1 260px">' +
      '<select id="wg"><option value="all">Все наборы</option>' + groupsOf(set).map(g => '<option value="' + g.g + '"' + (String(WS.g) === String(g.g) ? ' selected' : '') + '>' + esc(g.name) + '</option>').join('') + '</select></div>' +
      '<div id="wlist"></div><p class="note"><span class="st"></span>новое · <span class="st l1"></span>в процессе · <span class="st l2"></span>выучено · <span class="st w"></span>ошибался</p>';
  } else {
    const ms = mistakes(set);
    body = ms.length ? '<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap"><div><h3>' + ms.length + ' ' + plural(ms.length, 'слово', 'слова', 'слов') + ' с ошибками</h3><p class="muted small">Слово уходит из списка, когда ты дважды отвечаешь «Знаю».</p></div><button class="btn pri" data-act="cards" data-g="mist">Тренировать ошибки</button></div><div id="wlist"></div>'
      : '<div class="empty">Ошибок пока нет. Пройди карточки или тест — сюда попадут слова, которые ты не вспомнил.</div>';
  }
  const TITLE = { up: 'Upgrade: простое → сильное', nb: 'Слова из тетради', b2: 'Словарь B2 по буквам' };
  const DESC = { up: 'Простые слова и их B2+ замены для writing и speaking. На карточке — простое слово в предложении, вспомни сильный вариант.', nb: 'Слова из тетради по B2 с переводом и примером. Карточки можно крутить в обе стороны.', b2: 'Все 1331 слово уровня B2 из списка CEFR (esl-lounge.com) с переводом и примером. Выбери букву и учи по порядку.' };
  view.innerHTML = '<div class="page"><div class="head"><div><div class="muted small">Слова</div><h1>' + TITLE[set] + '</h1></div>' +
    '<div class="seg">' + [['b2', 'Словарь A–Z'], ['up', 'Upgrade'], ['nb', 'Тетрадь']].map(([k, l]) => '<button data-set="' + k + '" class="' + (set === k ? 'on' : '') + '">' + l + ' · ' + W.words.filter(w => w.set === k).length + '</button>').join('') + '</div></div>' +
    '<p class="muted">' + DESC[set] + '</p>' +
    '<div class="tabs" role="tablist">' + tabs.map(t => '<button role="tab" data-tab="' + t[0] + '" class="' + (WS.tab === t[0] ? 'on' : '') + '" aria-selected="' + (WS.tab === t[0]) + '">' + esc(t[1]) + '</button>').join('') + '</div>' + body + '</div>';
  view.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { location.hash = 'words-' + b.dataset.set; });
  view.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { WS.tab = b.dataset.tab; Words(set); });
  view.querySelectorAll('[data-letter]').forEach(b => b.onclick = () => { WS.letter = +b.dataset.letter; Words(set); });
  if (WS.tab === 'learn' && set === 'b2') wordTable(setWords('b2', WS.letter));
  view.querySelectorAll('[data-act=cards]').forEach(b => b.onclick = () => startCards(set, b.dataset.g));
  view.querySelectorAll('[data-act=test]').forEach(b => b.onclick = () => startTest(set, b.dataset.g, b.dataset.kind));
  if (WS.tab === 'list') {
    const draw = () => wordTable(setWords(set, WS.g).filter(w => { const q = norm(WS.q); return !q || norm(w.en).includes(q) || norm(w.ru).includes(q) || norm(w.simple).includes(q) || norm(w.syn).includes(q); }));
    $('#wq').oninput = e => { WS.q = e.target.value; draw(); };
    $('#wg').onchange = e => { WS.g = e.target.value; draw(); };
    draw();
  }
  if (WS.tab === 'mist' && mistakes(set).length) wordTable(mistakes(set));
}
function wordTable(ws) {
  const up = WS.set === 'up';
  $('#wlist').innerHTML = ws.length ? '<table class="wl"><thead><tr><th>Слово</th><th>' + (up ? 'Вместо · значение' : 'Перевод') + '</th><th>Пример</th></tr></thead><tbody>' + ws.slice(0, 1500).map(w => {
    const s = st(w.id), cls = (s.w && (s.l || 0) < 2) ? 'w' : (s.l || 0) >= 2 ? 'l2' : s.s ? 'l1' : '';
    return '<tr><td class="en"><span class="st ' + cls + '"></span>' + esc(w.en) + (w.pos ? ' <span class="muted small">' + esc(w.pos) + '</span>' : '') + '</td><td>' + (up ? '<span class="muted">вместо</span> ' + esc(w.simple) + (w.ru ? '<br>' + esc(w.ru) : '') + '<br><span class="muted small">≈ ' + esc(w.syn) + '</span>' : esc(w.ru)) + '</td><td class="ex">' + exHTML(w.ex) + '</td></tr>';
  }).join('') + '</tbody></table>' : '<div class="empty">Ничего не найдено</div>';
}

/* cards */
function startCards(set, g) {
  let pool;
  const now = Date.now();
  if (g === 'mist') pool = shuffle(mistakes(set));
  else if (g === 'all') pool = shuffle(W.words.filter(w => w.set === set && st(w.id).s && st(w.id).d <= now));
  else {
    const ws = setWords(set, g);
    const due = ws.filter(w => st(w.id).s && st(w.id).d <= now);
    const fresh = ws.filter(w => !st(w.id).s);
    const rest = ws.filter(w => st(w.id).s && st(w.id).d > now);
    pool = [...shuffle(due), ...fresh.slice(0, 25), ...(due.length + fresh.length < 8 ? shuffle(rest).slice(0, 15) : [])];
  }
  if (!pool.length) return;
  const gname = g === 'mist' ? 'Мои ошибки' : g === 'all' ? 'Повторение' : groupsOf(set).find(x => String(x.g) === String(g)).name;
  WS.sess = { queue: pool.map(w => w.id), i: 0, flip: false, name: gname, dir: WS.dir || 'fwd', done: 0, total: pool.length, known: 0, xp: 0, t0: Date.now(), enter: true };
  setLast('words-' + set, 'Слова · ' + gname);
  Cards();
}
function Cards() {
  const S = WS.sess, up = WS.set === 'up';
  cardFling = null;
  if (S.i >= S.queue.length) {
    const acc = S.done ? Math.round(S.known / S.done * 100) : 0;
    return lessonDone({
      title: 'Набор пройден!', text: 'Карточек пройдено: ' + S.done + '. Слова, которые ты не вспомнил, попали в «Мои ошибки» и вернутся на повтор.',
      xp: S.xp, accLabel: 'Знаю сразу', acc, thirdLabel: 'Время', third: Math.max(1, Math.round((Date.now() - S.t0) / 60000)) + ' мин',
      good: acc >= 70, back: () => { WS.sess = null; Words(WS.set); }
    });
  }
  const w = W.byId[S.queue[S.i]];
  const fwd = S.dir === 'fwd';
  let front, back;
  if (up && fwd) {
    front = '<div class="lbl">' + ICON.up + 'Upgrade it</div><div class="simple">' + esc(w.simple) + '</div><div class="ctx">' + exHTML(w.ex, true) + '</div>';
    back = '<div class="adv">' + esc(w.en) + '</div>' + (w.ru ? '<div class="ru">' + esc(w.ru) + '</div>' : '') + '<div class="syn">≈ ' + esc(w.syn) + '</div><div class="ctx">' + exHTML(w.ex) + '</div>' + (w.note ? '<div class="tip"><b>Заметка:</b> ' + esc(w.note) + '</div>' : '');
  } else if (up) {
    front = '<div class="lbl">Что значит?</div><div class="adv">' + esc(w.en) + '</div>';
    back = (w.ru ? '<div class="ru">' + esc(w.ru) + '</div>' : '') + '<div class="syn">≈ ' + esc(w.syn) + '</div><div class="syn">вместо: <b>' + esc(w.simple) + '</b></div><div class="ctx">' + exHTML(w.ex) + '</div>' + (w.note ? '<div class="tip"><b>Заметка:</b> ' + esc(w.note) + '</div>' : '');
  } else if (fwd) {
    front = '<div class="lbl">Переведи' + (w.pos ? ' · ' + esc(w.pos) : '') + '</div><div class="adv">' + esc(w.en) + '</div>';
    back = '<div class="ru" style="font-size:22px;font-weight:700">' + esc(w.ru) + '</div><div class="ctx">' + exHTML(w.ex) + '</div>';
  } else {
    front = '<div class="lbl">Как по-английски?</div><div class="simple">' + esc(w.ru) + '</div><div class="ctx">' + exHTML(w.ex, true) + '</div>';
    back = '<div class="adv">' + esc(w.en) + '</div><div class="ctx">' + exHTML(w.ex) + '</div>';
  }
  const pct = S.i / S.queue.length * 100;
  view.innerHTML = '<div class="page narrow lesson">' +
    '<div class="lesson-top"><button class="x" id="back" type="button" aria-label="Выйти к наборам">' + ICON.x + '</button><div class="bar"><i style="width:' + pct.toFixed(1) + '%"></i></div><span class="combo" id="sessXp" title="XP за этот набор" style="color:var(--gold-deep)">' + ICON.bolt + S.xp + '</span></div>' +
    '<div class="lesson-meta"><span class="eyebrow">' + esc(S.name) + ' · ' + (S.i + 1) + ' / ' + S.queue.length + '</span>' +
    '<div class="seg"><button data-dir="fwd" class="' + (fwd ? 'on' : '') + '">' + (up ? 'простое → сильное' : 'EN → RU') + '</button><button data-dir="rev" class="' + (fwd ? '' : 'on') + '">' + (up ? 'слово → значение' : 'RU → EN') + '</button></div></div>' +
    '<div class="wcard' + (S.enter ? ' enter' : '') + (S.flip ? ' swipe' : '') + '" id="card"' + (S.flip ? ' aria-label="Оцени, насколько хорошо помнишь: свайп вправо — знаю, влево — не вспомнил, вверх — с трудом"' : ' role="button" tabindex="0" aria-label="Показать ответ"') + '>' +
    (S.flip ? '<span class="stamp l" aria-hidden="true">Не вспомнил</span><span class="stamp r" aria-hidden="true">Знаю</span><span class="stamp u" aria-hidden="true">С трудом</span>' : '') +
    front + (S.flip ? '<div class="reveal"><hr>' + back + '</div>' : '<div class="hint">Нажми на карточку, чтобы увидеть ответ <span class="kbd">Пробел</span></div>') + '</div>' +
    (S.flip ? '<div class="swipe-hint" aria-hidden="true"><span class="l">← не вспомнил</span><span class="u">↑ с трудом</span><span class="r">знаю →</span></div>' +
      '<div class="grades sticky"><button class="btn go-bad" data-g="0"><span class="kbd">1</span>Не вспомнил</button><button class="btn mid" data-g="1"><span class="kbd">2</span>С трудом</button><button class="btn go-ok" data-g="2"><span class="kbd">3</span>Знаю</button></div>' :
      '<div class="grades sticky"><button class="btn pri lg" id="show">Показать ответ</button></div>') + '</div>';
  S.enter = false;
  const flip = () => { if (!S.flip) { S.flip = true; Cards(); } };
  if (!S.flip) $('#card').onclick = flip;
  if ($('#show')) $('#show').onclick = flip;
  $('#back').onclick = () => { WS.sess = null; Words(WS.set); };
  view.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => { S.dir = WS.dir = b.dataset.dir; S.flip = false; S.enter = true; Cards(); });
  if (S.flip) {
    cardFling = bindSwipe($('#card'), answerCard);
    view.querySelectorAll('[data-g]').forEach(b => b.onclick = () => cardFling(['left', 'up', 'right'][+b.dataset.g]));
  }
}
let cardFling = null;
/* Swipe a flipped card: right = знаю (2), left = не вспомнил (0), up = с трудом (1).
   The page must not scroll while a card is being dragged:
   - .wcard.swipe has touch-action:none, so the browser never starts a pan / pull-to-refresh from the card;
   - touchmove is cancelled while a drag is active (older iOS Safari ignores touch-action);
   - pointer capture keeps the gesture even when the finger leaves the card.
   Swipes are only on after the answer is shown, so before that the card scrolls like normal content. */
function bindSwipe(card, onGrade) {
  const TH = 80, G = { left: 0, up: 1, right: 2 };
  let id = null, sx = 0, sy = 0, dx = 0, dy = 0, gone = false;
  const stamps = { left: card.querySelector('.stamp.l'), right: card.querySelector('.stamp.r'), up: card.querySelector('.stamp.u') };
  const dirOf = () => dy < -TH && -dy > Math.abs(dx) ? 'up' : dx > TH ? 'right' : dx < -TH ? 'left' : '';
  const clamp = v => Math.max(0, Math.min(1, v));
  const paint = () => {
    const ry = Math.min(dy, 0) + Math.max(dy, 0) * .25;
    card.style.transform = 'translate(' + dx + 'px,' + ry + 'px) rotate(' + (dx / 16).toFixed(2) + 'deg)';
    stamps.right.style.opacity = clamp(dx / TH);
    stamps.left.style.opacity = clamp(-dx / TH);
    stamps.up.style.opacity = clamp(-dy / TH) * (-dy > Math.abs(dx) ? 1 : .3);
    card.dataset.dir = dirOf();
  };
  const reset = () => { card.classList.add('back-home'); card.style.transform = ''; card.dataset.dir = ''; Object.values(stamps).forEach(x => x.style.opacity = 0); };
  const fling = dir => {
    if (gone) return; gone = true; id = null;
    document.documentElement.classList.remove('no-scroll');
    card.classList.remove('drag', 'back-home'); card.dataset.dir = dir; stamps[dir].style.opacity = 1;
    card.classList.add('fly');
    card.style.transform = dir === 'up' ? 'translate(' + dx + 'px,' + (-innerHeight) + 'px)' : 'translate(' + (dir === 'right' ? 1 : -1) * (innerWidth + 200) + 'px,' + dy + 'px) rotate(' + (dir === 'right' ? 24 : -24) + 'deg)';
    setTimeout(() => onGrade(G[dir]), reduced() ? 0 : 230);
  };
  card.addEventListener('touchmove', e => { if (id !== null) e.preventDefault(); }, { passive: false });
  card.addEventListener('pointerdown', e => {
    if (gone || id !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    id = e.pointerId; sx = e.clientX; sy = e.clientY; dx = dy = 0;
    try { card.setPointerCapture(id); } catch (_) {}
    card.classList.remove('back-home', 'enter'); card.classList.add('drag');
    document.documentElement.classList.add('no-scroll');
  });
  card.addEventListener('pointermove', e => { if (e.pointerId !== id || gone) return; dx = e.clientX - sx; dy = e.clientY - sy; paint(); });
  const end = e => {
    if (e.pointerId !== id || gone) return;
    id = null; card.classList.remove('drag'); document.documentElement.classList.remove('no-scroll');
    const dir = e.type === 'pointerup' ? dirOf() : '';
    if (dir) fling(dir); else reset();
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => card.addEventListener(t, end));
  return fling;
}
function answerCard(g) {
  const S = WS.sess, id = S.queue[S.i];
  grade(id, g); S.done++;
  if (g === 2) { S.known++; S.xp++; sound('ok'); }
  if (g === 0) S.queue.splice(Math.min(S.i + 4, S.queue.length), 0, id);
  S.i++; S.flip = false; S.enter = true; Cards();
  if (g === 2) addXP(1, $('#sessXp'));
}
function keyHandler(e) {
  if (e.target.closest('input,textarea,select')) return;
  if (!/^#words/.test(location.hash || '#')) return;
  const S = WS.sess, T = WS.test;
  if (S && S.i < S.queue.length) {
    if (!S.flip && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); S.flip = true; Cards(); return; }
    if (S.flip && cardFling) {
      const dir = { '1': 'left', '2': 'up', '3': 'right', ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right' }[e.key];
      if (dir) { e.preventDefault(); cardFling(dir); }
    }
  } else if (T && T.i < T.qs.length) {
    if (T.pick == null && /^[1-4]$/.test(e.key)) { const id = T.qs[T.i].opts[+e.key - 1]; if (id) pickOpt(id); }
    else if (T.pick != null && e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); nextQ(); }
  }
}
document.addEventListener('keydown', keyHandler);

/* shared "lesson complete" screen */
function lessonDone(o) {
  view.innerHTML = '<div class="page narrow"><div class="done">' +
    '<div class="trophy' + (o.good ? '' : ' meh') + '">' + (o.good ? ICON.trophy : ICON.star) + '</div>' +
    '<h1>' + esc(o.title) + '</h1><p class="muted">' + esc(o.text) + '</p>' +
    '<div class="kpis"><div class="kpi" style="--c:var(--gold-deep)"><div class="h">Опыт</div><div class="v">' + ICON.bolt + '+' + o.xp + '</div></div>' +
    '<div class="kpi" style="--c:var(--ok-deep)"><div class="h">' + esc(o.accLabel) + '</div><div class="v">' + o.acc + '%</div></div>' +
    '<div class="kpi" style="--c:var(--accent)"><div class="h">' + esc(o.thirdLabel) + '</div><div class="v">' + esc(o.third) + '</div></div></div>' +
    '<div class="actions">' + (o.again ? '<button class="btn lg" id="again">Ещё раз</button>' : '') + '<button class="btn pri lg" id="back">Продолжить</button></div></div></div>';
  $('#back').onclick = o.back;
  if (o.again) $('#again').onclick = o.again;
  $('#back').focus();
  if (o.good) { confetti(); sound('win'); }
}

/* tests */
function startTest(set, g, kind) {
  const pool = shuffle(setWords(set, g)).slice(0, 10);
  const all = W.words.filter(w => w.set === set);
  const qs = pool.map(w => {
    const same = shuffle(all.filter(x => x.id !== w.id && (set === 'nb' || x.g === w.g)));
    const others = same.slice(0, 3);
    return { id: w.id, opts: shuffle([w, ...others]).map(x => x.id) };
  });
  const gname = groupsOf(set).find(x => String(x.g) === String(g)).name;
  WS.test = { kind, qs, i: 0, ok: 0, pick: null, name: gname, combo: 0, best: 0, xp: 0, t0: Date.now() };
  setLast('words-' + set, 'Слова · тест · ' + gname);
  Test();
}
const PRAISE = ['Верно!', 'Отлично!', 'В точку!', 'Так держать!', 'Супер!'];
function Test() {
  const T = WS.test;
  if (T.i >= T.qs.length) {
    const n = T.qs.length, r = T.ok / n;
    return lessonDone({
      title: T.ok === n ? 'Идеально!' : r >= .8 ? 'Отлично!' : r >= .5 ? 'Неплохо!' : 'Есть над чем поработать',
      text: T.ok + ' из ' + n + ' верно.' + (T.ok < n ? ' Ошибки сохранены в «Мои ошибки» — повтори их карточками.' : ''),
      xp: T.xp, accLabel: 'Точность', acc: Math.round(r * 100), thirdLabel: 'Лучшая серия', third: String(T.best),
      good: r >= .8, back: () => { WS.test = null; Words(WS.set); },
      again: () => { const g = W.byId[T.qs[0].id].g; startTest(WS.set, g, T.kind); }
    });
  }
  const q = T.qs[T.i], w = W.byId[q.id];
  const lab = x => T.kind === 'upgrade' || T.kind === 'en' ? esc(x.en) : T.kind === 'meaning' ? esc(x.ru || x.syn) + (x.ru ? '<br><span class="muted small">≈ ' + esc(x.syn) + '</span>' : '') : esc(x.ru);
  let prompt;
  if (T.kind === 'upgrade') prompt = '<div class="lbl">' + ICON.up + 'Подбери сильную замену</div><div class="simple">' + esc(w.simple) + '</div><div class="ctx">' + exHTML(w.ex, true) + '</div>';
  else if (T.kind === 'en') prompt = '<div class="lbl">Как по-английски?</div><div class="simple">' + esc(w.ru) + '</div>';
  else prompt = '<div class="lbl">Что значит?</div><div class="adv">' + esc(w.en) + '</div>';
  const answered = T.pick != null, right = answered && T.pick === q.id;
  const done = T.i + (answered ? 1 : 0);
  view.innerHTML = '<div class="page narrow lesson' + (answered ? ' has-fbar' : '') + '">' +
    '<div class="lesson-top"><button class="x" id="back" type="button" aria-label="Выйти к наборам">' + ICON.x + '</button><div class="bar"><i style="width:' + (done / T.qs.length * 100).toFixed(1) + '%"></i></div>' +
    '<span class="combo' + (right && T.combo > 1 ? ' bump' : '') + '" id="combo" title="Серия верных ответов подряд"' + (T.combo ? '' : ' style="color:var(--muted)"') + '>' + ICON.fire + T.combo + '</span></div>' +
    '<div class="lesson-meta"><span class="eyebrow">' + esc(T.name) + ' · ' + (T.i + 1) + ' / ' + T.qs.length + '</span>' + (T.combo >= 3 ? '<span class="combo">' + T.combo + ' подряд!</span>' : '') + '</div>' +
    '<div class="wcard static' + (answered ? '' : ' enter') + '">' + prompt + '</div>' +
    '<div class="opts">' + q.opts.map((id, k) => {
      const x = W.byId[id];
      const c = answered ? (id === q.id ? ' ok' : id === T.pick ? ' bad' : ' dim') : '';
      return '<button class="opt' + c + '" data-id="' + id + '"' + (answered ? ' disabled' : '') + '><span class="kbd">' + (k + 1) + '</span><span>' + lab(x) + '</span></button>';
    }).join('') + '</div></div>' +
    (answered ? '<div class="fbar ' + (right ? 'ok' : 'bad') + '" role="status"><div class="in"><span class="badge">' + (right ? ICON.check : ICON.x) + '</span>' +
      '<div class="txt"><div class="t">' + (right ? (T.combo >= 3 ? T.combo + ' подряд!' : PRAISE[T.i % PRAISE.length]) : 'Правильно: ' + lab(w)) + '</div>' +
      '<div class="ex">' + exHTML(w.ex) + '</div>' + (w.note ? '<div class="small muted">' + esc(w.note) + '</div>' : '') + '</div>' +
      '<button class="btn lg ' + (right ? 'go-ok' : 'go-bad') + '" id="next">Дальше</button></div></div>' : '');
  $('#back').onclick = () => { WS.test = null; Words(WS.set); };
  view.querySelectorAll('.opt').forEach(b => b.onclick = () => pickOpt(b.dataset.id));
  if ($('#next')) { $('#next').onclick = nextQ; if (!matchMedia('(pointer: coarse)').matches) $('#next').focus({ preventScroll: true }); }
}
function pickOpt(id) {
  const T = WS.test, q = T.qs[T.i];
  if (T.pick != null) return;
  T.pick = id;
  if (id === q.id) { T.ok++; T.combo++; T.best = Math.max(T.best, T.combo); T.xp += 2; grade(q.id, 2); sound('ok'); Test(); addXP(2, $('#combo')); }
  else { T.combo = 0; grade(q.id, 0); sound('bad'); Test(); }
}
function nextQ() { const T = WS.test; T.i++; T.pick = null; Test(); }

/* ========== achievements ========== */
function Badges() {
  const got = Store.data.meta.badges || {}, s = badgeStats(), g = goalXP(), x = xpToday(), sk = streak();
  view.innerHTML = '<div class="page"><div class="head"><div><div class="muted small">Прогресс</div><h1>Достижения</h1></div></div>' +
    '<div class="bigstats">' +
    '<div class="card fire"><span class="muted small">Дней подряд</span><b>' + ICON.fire + sk + '</b><span class="muted small">Рекорд: ' + bestStreak() + '</span></div>' +
    '<div class="card xp"><span class="muted small">Всего опыта</span><b>' + ICON.bolt + (Store.data.meta.xpTotal || 0) + '</b><span class="muted small">XP</span></div>' +
    '<div class="card bd"><span class="muted small">Значков</span><b>' + ICON.medal + Object.keys(got).length + '</b><span class="muted small">из ' + BADGES.length + '</span></div></div>' +
    '<div class="profile"><div class="card goal">' + ring(x, g, 'из ' + g + ' XP') + '<div class="goal-txt"><h3>' + (x >= g ? 'Цель на сегодня выполнена' : 'Цель дня: ещё ' + (g - x) + ' XP') + '</h3>' +
    '<p class="muted small">XP считается как на экзамене: в Reading — баллы Cambridge за каждую часть, ' + (IN_CLAUDE ? 'во Writing — оценка по 4 критериям (до 20). ' : '') + 'Слова: «Знаю» на карточке — 1 XP, верный ответ в тесте — 2 XP.</p>' +
    '<div class="goal-sel" role="group" aria-label="Цель дня">' + GOALS.map(([v, n, t]) => '<button type="button" data-goal="' + v + '" class="' + (v === g ? 'on' : '') + '" title="' + t + '">' + n + ' · ' + v + '</button>').join('') + '</div></div></div>' +
    '<div class="card" style="display:flex;flex-direction:column;gap:12px;justify-content:center"><h3>Эта неделя</h3>' + weekStrip() + '<p class="muted small">Огонёк загорается в день, когда ты заработал хотя бы 1 XP. Пропустишь день — серия начнётся заново.</p></div></div>' +
    '<h2>Значки</h2><div class="badges">' + BADGES.map(b => {
      const [v, need] = b[5](s), has = !!got[b[0]];
      return '<div class="card bdg' + (has ? '' : ' locked') + '" style="--c:var(' + b[4] + ')"><span class="medal">' + ICON[b[3]] + '</span><h3>' + esc(b[1]) + '</h3><p>' + esc(b[2]) + '</p>' +
        (has ? '<span class="when">Получено ' + new Date(got[b[0]]).toLocaleDateString('ru-RU') + '</span>' : need > 1 ? '<div class="bar" style="--c:var(' + b[4] + ')"><i style="width:' + Math.min(100, v / need * 100).toFixed(0) + '%"></i></div><span class="muted small">' + Math.min(v, need) + ' / ' + need + '</span>' : '') + '</div>';
    }).join('') + '</div></div>';
  view.querySelectorAll('[data-goal]').forEach(b => b.onclick = () => { Store.data.meta.goal = +b.dataset.goal; Store.save('meta'); checkBadges(); renderHud(); Badges(); });
}

/* ========== reading ========== */
const PTS = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2, 7: 1 };
const partOf = n => R.parts[n - 1];
function ReadingHub() {
  const res = Store.data.reading.results || {};
  const run = Store.data.reading.run;
  view.innerHTML = '<div class="page"><div class="head"><div><div class="muted small">Reading &amp; Use of English</div><h1>' + esc(R.title) + '</h1></div></div>' +
    '<div class="cont"><div><div class="lbl">Как на экзамене</div><div style="font-size:19px;font-weight:600;margin-top:4px">Решить весь вариант: 7 частей, 52 вопроса, 75 минут</div><div class="small" style="opacity:.85;margin-top:2px">Между частями переключаешься вверху, проверка — в конце.</div></div><a class="btn" href="#full-test">Решить всё →</a></div>' +
    '<h2>Или выбери одну часть</h2>' +
    '<p class="muted">Тексты и задания оригинальные, написаны по формату Cambridge B2 First. К каждому ответу есть объяснение, почему верно именно это.</p>' +
    (run && !run.checked ? '<div class="cont"><div><div class="lbl">Незаконченная попытка</div><div style="font-size:18px;font-weight:600;margin-top:4px">' + (run.mode === 'full' ? 'Полный вариант' : 'Part ' + run.parts[0]) + ' · отвечено ' + Object.keys(run.ans || {}).length + '</div></div><a class="btn" href="#' + (run.mode === 'full' ? 'full-test' : 'part-' + run.parts[0]) + '">Продолжить →</a></div>' : '') +
    '<div class="grid2">' + R.parts.map(p => {
      const r = res[p.n];
      const max = p.q.length * PTS[p.n];
      return '<a class="card tile" href="#part-' + p.n + '"><div class="muted small">' + esc(p.skill) + ' · вопросы ' + p.q[0].n + '–' + p.q[p.q.length - 1].n + '</div><h3>Part ' + p.n + ' · ' + esc(p.name) + '</h3>' +
        (r ? '<div class="prog"><div class="bar"><i style="width:' + (r.best / max * 100).toFixed(1) + '%"></i></div>' + r.best + '/' + max + '</div><div class="muted small">Лучший результат · последний: ' + r.last + '/' + max + '</div>' : '<div class="muted small">' + p.q.length + ' ' + plural(p.q.length, 'вопрос', 'вопроса', 'вопросов') + ' · ' + max + ' ' + plural(max, 'балл', 'балла', 'баллов') + '</div>') +
        '<span class="go">' + (r ? 'Ещё раз →' : 'Начать →') + '</span></a>';
    }).join('') + '</div></div>';
}

let E = null;
function Exam(mode, parts) {
  const run = Store.data.reading.run;
  const same = run && run.mode === mode && run.parts.join() === parts.join();
  if (!E || E.mode !== mode || E.parts.join() !== parts.join()) {
    E = same ? Object.assign({ tab: 'q' }, run) : { mode, parts, cur: 0, ans: {}, flags: {}, checked: false, elapsed: 0, tab: 'q', qcur: partOf(parts[0]).q[0].n };
    if (!same) saveRun();
  }
  E.since = Date.now();
  document.body.classList.add('exam');
  setLast(mode === 'full' ? 'full-test' : 'part-' + parts[0], mode === 'full' ? 'Reading · полный вариант' : 'Reading · Part ' + parts[0] + ' — ' + partOf(parts[0]).name);
  const tick = setInterval(() => {
    const el = $('#timer'); if (!el) return;
    const t = E.elapsed + (E.checked ? 0 : (Date.now() - E.since) / 1000);
    if (E.mode === 'full') { const left = R.minutes * 60 - t; el.lastChild.textContent = left >= 0 ? fmtTime(left) : '−' + fmtTime(-left); el.classList.toggle('late', left < 0); }
    else el.lastChild.textContent = fmtTime(t);
  }, 1000);
  const persist = setInterval(() => { if (!E.checked) { stamp(); saveRun(); } }, 20000);
  cleanup = () => { clearInterval(tick); clearInterval(persist); if (!E.checked) { stamp(); saveRun(); } };
  drawExam();
}
function stamp() { E.elapsed += (Date.now() - E.since) / 1000; E.since = Date.now(); }
function saveRun() { const { tab, since, ...keep } = E; Store.data.reading.run = JSON.parse(JSON.stringify(keep)); Store.save('reading'); }
function isRight(p, q, v) {
  if (v == null || v === '') return false;
  if (p.kind === 'mc' || p.kind === 'mc-text') return +v === q.a;
  if (p.kind === 'gapped' || p.kind === 'matching') return v === q.a;
  return q.a.some(a => norm(a) === norm(v));
}
function answerText(p, q) {
  if (p.kind === 'mc' || p.kind === 'mc-text') return 'ABCD'[q.a] + ' — ' + q.opts[q.a];
  if (p.kind === 'gapped') return q.a + ' — ' + p.sents[q.a];
  if (p.kind === 'matching') return q.a + ' — ' + p.texts.find(t => t.k === q.a).name;
  return q.a.join(' / ').toUpperCase();
}

function textPane(p) {
  const chip = n => {
    const v = E.ans[n], q = p.q.find(x => x.n === n);
    let show = '……';
    if (v != null && v !== '') show = p.kind === 'mc' ? q.opts[v] : String(v);
    const cls = E.checked ? (isRight(p, q, v) ? ' ok' : ' bad') : '';
    return '<button class="gap' + (E.qcur === n ? ' cur' : '') + cls + '" data-q="' + n + '">' + n + ' <span>' + esc(show) + '</span></button>';
  };
  let h = '<div class="instr">' + esc(p.instr) + '</div>' + (p.example ? '<div class="exmp">Пример: ' + esc(p.example) + '</div>' : '');
  if (p.kind === 'kwt') {
    h += '<div class="rtext" style="font-family:var(--ui);font-size:15px">' + p.q.map(q => '<p><b>' + q.n + '.</b> ' + esc(q.first) + '</p>').join('') + '</div><p class="note" style="margin-top:16px">Ответы вводятся справа. Используй от 2 до 5 слов, включая ключевое слово; ключевое слово менять нельзя.</p>';
    return h;
  }
  h += '<div class="rtitle">' + esc(p.title) + '</div>' + (p.subtitle ? '<div class="rsub">' + esc(p.subtitle) + '</div>' : '');
  if (p.kind === 'matching') {
    const marks = E.checked ? p.q.filter(q => q.hl) : [];
    h += '<div class="rtext">' + p.texts.map(t => { let body = esc(t.body); marks.filter(q => q.a === t.k).forEach(q => { body = body.replace(esc(q.hl), '<mark>' + esc(q.hl) + '</mark>'); }); return '<h4>' + t.k + ' — ' + esc(t.name) + '</h4><p>' + body + '</p>'; }).join('') + '</div>';
    return h;
  }
  h += '<div class="rtext">' + p.paras.map((para, i) => {
    let s = esc(para);
    if (E.checked && p.kind === 'mc-text') p.q.filter(q => q.p === i && q.hl).forEach(q => { s = s.replace(esc(q.hl), '<mark>' + esc(q.hl) + '</mark>'); });
    s = s.replace(/\[\[(\d+)\]\]/g, (_, n) => chip(+n));
    return '<p>' + s + '</p>';
  }).join('') + '</div>';
  return h;
}

function qBlock(p, q) {
  const v = E.ans[q.n], C = E.checked, ok = C && isRight(p, q, v);
  let h = '<div class="q' + (E.qcur === q.n ? ' cur' : '') + '" id="q-' + q.n + '" data-q="' + q.n + '">';
  const dis = C ? ' disabled' : '';
  if (p.kind === 'mc' || p.kind === 'mc-text') {
    h += '<div class="qh"><span class="qn">' + q.n + '</span><span>' + (p.kind === 'mc' ? 'Выбери слово для пропуска ' + q.n : esc(q.stem)) + '</span></div><div class="ch' + (p.kind === 'mc' ? ' g2' : '') + '">' +
      q.opts.map((o, i) => { let c = ''; if (C) c = i === q.a ? ' ok' : (+v === i ? ' bad' : ''); else if (v != null && +v === i) c = ' sel'; return '<label class="' + c + '"><input type="radio" name="r' + q.n + '" value="' + i + '"' + (v != null && +v === i ? ' checked' : '') + dis + '><span><span class="lt">' + 'ABCD'[i] + '</span>' + esc(o) + '</span></label>'; }).join('') + '</div>';
  } else if (p.kind === 'open' || p.kind === 'wf') {
    h += '<div class="qh"><span class="qn">' + q.n + '</span><span>' + (p.kind === 'wf' ? 'Образуй слово от <span class="kw">' + esc(q.w) + '</span>' : 'Одно слово в пропуск ' + q.n) + '</span></div>' +
      '<input type="text" class="tin' + (C ? (ok ? ' ok' : ' bad') : '') + '" data-in="' + q.n + '" value="' + esc(v || '') + '" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Ответ ' + q.n + '"' + dis + '>';
  } else if (p.kind === 'kwt') {
    h += '<div class="qh"><span class="qn">' + q.n + '</span><span>' + esc(q.first) + '</span></div><div class="kw">' + esc(q.key) + '</div>' +
      '<div class="kwline"><span>' + esc(q.before) + '</span><input type="text" class="tin' + (C ? (ok ? ' ok' : ' bad') : '') + '" data-in="' + q.n + '" value="' + esc(v || '') + '" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Ответ ' + q.n + '"' + dis + '><span>' + esc(q.after) + '</span></div>' +
      (v && !C ? '<div class="note" style="margin-top:6px">Слов: ' + String(v).trim().split(/\s+/).length + ' (нужно 2–5)</div>' : '');
  } else if (p.kind === 'gapped' || p.kind === 'matching') {
    const letters = p.kind === 'gapped' ? Object.keys(p.sents) : p.texts.map(t => t.k);
    const used = p.kind === 'gapped' ? Object.values(E.ans).filter(Boolean) : [];
    h += '<div class="qh"><span class="qn">' + q.n + '</span><span>' + (p.kind === 'gapped' ? 'Какое предложение в пропуск ' + q.n + '?' : 'Which person mentions ' + esc(q.stem)) + '</span></div><div class="letters">' +
      letters.map(L => { let c = ''; if (C) c = L === q.a ? ' ok' : (v === L ? ' bad' : ''); else if (v === L) c = ' sel'; else if (used.includes(L)) c = ' used'; return '<button type="button" class="' + c + '" data-pick="' + L + '"' + dis + ' aria-pressed="' + (v === L) + '">' + L + '</button>'; }).join('') + '</div>';
  }
  if (C) h += '<div class="verdict ' + (ok ? 'ok' : 'bad') + '"><div class="t">' + (ok ? 'Верно' : (v == null || v === '' ? 'Нет ответа' : 'Неверно') + ' · правильно: ' + esc(answerText(p, q))) + '</div>' + q.expl + '</div>';
  else h += '<button type="button" class="flagb' + (E.flags[q.n] ? ' on' : '') + '" data-flag="' + q.n + '">' + ICON.flag + (E.flags[q.n] ? 'Отмечено: вернусь позже' : 'Вернусь позже') + '</button>';
  return h + '</div>';
}

function partScore(p) {
  let c = 0; for (const q of p.q) if (isRight(p, q, E.ans[q.n])) c++;
  return { c, pts: c * PTS[p.n], max: p.q.length * PTS[p.n] };
}
function drawExam(keepScroll) {
  const p = partOf(E.parts[E.cur]);
  const tPane = $('.pane.text'), qPane = $('.pane.qs-pane');
  const sc = keepScroll && tPane ? [tPane.scrollTop, qPane.scrollTop] : null;
  const t = E.elapsed + (E.checked ? 0 : (Date.now() - E.since) / 1000);
  const timeTxt = E.mode === 'full' ? fmtTime(R.minutes * 60 - t) : fmtTime(t);
  let result = '';
  if (E.checked) {
    const rows = E.parts.map(n => { const pp = partOf(n), s = partScore(pp); return [n, s]; });
    const tot = rows.reduce((a, [, s]) => a + s.pts, 0), max = rows.reduce((a, [, s]) => a + s.max, 0);
    const s = partScore(p);
    result = '<div class="result"><b>' + (E.mode === 'full' ? 'Итог: ' + tot + ' из ' + max + ' баллов' : s.c + ' из ' + p.q.length + ' верно · ' + s.pts + '/' + s.max + ' баллов') + '</b>' +
      (E.mode === 'full' ? '<div class="small">' + rows.map(([n, s]) => 'Part ' + n + ': ' + s.pts + '/' + s.max).join(' · ') + '</div>' : '') +
      (E.xpGain != null ? '<span class="xpgain">' + ICON.bolt + '+' + E.xpGain + ' XP — по баллам Cambridge</span>' : '') +
      '<div class="small">Разбери объяснения к каждому вопросу ниже' + (p.kind === 'mc-text' || p.kind === 'matching' ? ', а фразы-доказательства подсвечены в тексте' : '') + '.</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" id="retry">Пройти заново</button><a class="btn sm ghost" href="#reading">К списку частей</a></div></div>';
  }
  const sentList = p.kind === 'gapped' ? '<div class="sents">' + Object.entries(p.sents).map(([k, s]) => '<div class="' + (!E.checked && Object.values(E.ans).includes(k) ? 'used' : '') + '"><b>' + k + '</b> ' + esc(s) + '</div>').join('') + '</div>' : '';
  view.innerHTML =
    '<header class="ex-head"><a class="btn sm ghost" href="#reading">' + ICON.back + 'Выйти</a>' +
    '<span class="title">' + (E.mode === 'full' ? 'Полный вариант · ' : '') + 'Part ' + p.n + ' · ' + esc(p.name) + '</span>' +
    (E.mode === 'full' ? '<div class="ptabs" aria-label="Части">' + E.parts.map((n, i) => '<button type="button" data-part="' + i + '" class="' + (i === E.cur ? 'on' : '') + '"><span class="pw">Part </span>' + n + '</button>').join('') + '</div>'
      : '<div class="ptabs" aria-label="Другие части">' + R.parts.map(pp => '<a class="pt' + (pp.n === p.n ? ' on' : '') + '" href="#part-' + pp.n + '"><span class="pw">Part </span>' + pp.n + '</a>').join('') + '<a class="pt" href="#full-test">Все</a></div>') +
    '<span class="sp"></span><div class="timer" id="timer" title="' + (E.mode === 'full' ? 'Осталось времени' : 'Прошло времени') + '">' + ICON.clock + '<span>' + timeTxt + '</span></div>' +
    (E.checked ? '' : '<button class="btn sm pri" id="check">Проверить</button>') + '</header>' +
    '<div class="mtabs"><button type="button" data-tab="t" class="' + (E.tab === 't' ? 'on' : '') + '">Текст</button><button type="button" data-tab="q" class="' + (E.tab === 'q' ? 'on' : '') + '">Вопросы</button></div>' +
    '<div class="split"><section class="pane text' + (E.tab === 't' ? ' show' : '') + '" aria-label="Текст">' + textPane(p) + '</section>' +
    '<section class="pane qs-pane' + (E.tab === 'q' ? ' show' : '') + '" aria-label="Вопросы">' + result + sentList + '<div class="qs">' + p.q.map(q => qBlock(p, q)).join('') + '</div></section></div>' +
    '<footer class="ex-foot"><div class="nums">' + p.q.map(q => {
      const v = E.ans[q.n]; let c = '';
      if (E.checked) c = isRight(p, q, v) ? 'ok' : 'bad'; else if (E.flags[q.n]) c = 'flag'; else if (v != null && v !== '') c = 'ans';
      return '<button type="button" data-go="' + q.n + '" class="' + c + (E.qcur === q.n ? ' cur' : '') + '" aria-label="Вопрос ' + q.n + '">' + q.n + '</button>';
    }).join('') + '</div><button class="btn sm" id="prev">← Назад</button><button class="btn sm" id="next" style="border-color:var(--accent);color:var(--accent)">Далее →</button></footer>';
  if (sc) { $('.pane.text').scrollTop = sc[0]; $('.pane.qs-pane').scrollTop = sc[1]; }
  bindExam(p);
}
function goQ(n, scroll) {
  E.qcur = n;
  const p = partOf(E.parts[E.cur]);
  if (!p.q.some(q => q.n === n)) { E.cur = E.parts.findIndex(pn => partOf(pn).q.some(q => q.n === n)); }
  E.tab = 'q';
  drawExam(true);
  if (scroll) { const el = $('#q-' + n); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}
function setAns(n, v) { E.ans[n] = v; E.qcur = n; saveRunSoon(); }
let runT = null;
function saveRunSoon() { clearTimeout(runT); runT = setTimeout(() => { stamp(); saveRun(); }, 1500); }
function bindExam(p) {
  view.querySelectorAll('input[type=radio]').forEach(r => r.onchange = () => { setAns(+r.name.slice(1), +r.value); drawExam(true); });
  view.querySelectorAll('[data-in]').forEach(inp => {
    inp.oninput = () => { E.ans[+inp.dataset.in] = inp.value; saveRunSoon(); const n = +inp.dataset.in; const chip = view.querySelector('.gap[data-q="' + n + '"] span'); if (chip) chip.textContent = inp.value || '……'; const nb = view.querySelector('[data-go="' + n + '"]'); if (nb && !E.flags[n]) nb.className = (inp.value ? 'ans' : '') + (E.qcur === n ? ' cur' : ''); };
    inp.onfocus = () => { if (E.qcur !== +inp.dataset.in) { E.qcur = +inp.dataset.in; view.querySelectorAll('.q').forEach(b => b.classList.toggle('cur', +b.dataset.q === E.qcur)); view.querySelectorAll('.gap').forEach(b => b.classList.toggle('cur', +b.dataset.q === E.qcur)); } };
    inp.onchange = () => drawExam(true);
  });
  view.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { const n = +b.closest('.q').dataset.q; setAns(n, E.ans[n] === b.dataset.pick ? '' : b.dataset.pick); drawExam(true); });
  view.querySelectorAll('[data-flag]').forEach(b => b.onclick = () => { const n = +b.dataset.flag; E.flags[n] = !E.flags[n]; saveRunSoon(); drawExam(true); });
  view.querySelectorAll('.gap').forEach(b => b.onclick = () => goQ(+b.dataset.q, true));
  view.querySelectorAll('[data-go]').forEach(b => b.onclick = () => goQ(+b.dataset.go, true));
  view.querySelectorAll('[data-part]').forEach(b => b.onclick = () => { E.cur = +b.dataset.part; E.qcur = partOf(E.parts[E.cur]).q[0].n; drawExam(); });
  view.querySelectorAll('.mtabs [data-tab]').forEach(b => b.onclick = () => { E.tab = b.dataset.tab; drawExam(true); });
  view.querySelectorAll('.q').forEach(b => b.addEventListener('click', e => { if (e.target.closest('input,button,label')) return; if (E.qcur !== +b.dataset.q) { E.qcur = +b.dataset.q; drawExam(true); } }));
  const all = E.parts.flatMap(n => partOf(n).q.map(q => q.n));
  $('#prev').onclick = () => { const i = all.indexOf(E.qcur); if (i > 0) goQ(all[i - 1], true); };
  $('#next').onclick = () => { const i = all.indexOf(E.qcur); if (i < all.length - 1) goQ(all[i + 1], true); };
  if ($('#check')) $('#check').onclick = askCheck;
  if ($('#retry')) $('#retry').onclick = () => { E = { xpGain: null, mode: E.mode, parts: E.parts, cur: 0, ans: {}, flags: {}, checked: false, elapsed: 0, tab: 'q', qcur: partOf(E.parts[0]).q[0].n, since: Date.now() }; saveRun(); drawExam(); };
}
function askCheck() {
  const qs = E.parts.flatMap(n => partOf(n).q);
  const empty = qs.filter(q => E.ans[q.n] == null || E.ans[q.n] === '').length;
  if (!empty) return doCheck();
  modal('<h3>Проверить ответы?</h3><p class="muted">Без ответа: ' + empty + ' ' + plural(empty, 'вопрос', 'вопроса', 'вопросов') + '. На экзамене пустой ответ — это 0 баллов, лучше угадать.</p>',
    [['Вернуться', null], ['Проверить', doCheck, 'pri']]);
}
function doCheck() {
  stamp(); E.checked = true;
  const res = Store.data.reading.results || (Store.data.reading.results = {});
  let pts = 0, max = 0;
  for (const n of E.parts) { const s = partScore(partOf(n)); pts += s.pts; max += s.max; const prev = res[n]; res[n] = { best: Math.max(prev ? prev.best : 0, s.pts), last: s.pts, max: s.max, t: Date.now() }; }
  E.xpGain = pts;
  saveRun(); Store.save('reading');
  E.qcur = partOf(E.parts[E.cur]).q[0].n;
  drawExam();
  const qp = $('.pane.qs-pane'); if (qp) qp.scrollTop = 0;
  renderNav(location.hash.slice(1));
  addXP(pts, $('.result b'));
  if (max && pts / max >= .6) { confetti(); sound('win'); }
}
function modal(html, buttons) {
  const m = $('#modal');
  m.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><div class="box">' + html + '<div class="row">' + buttons.map((b, i) => '<button class="btn ' + (b[2] || '') + '" data-i="' + i + '">' + esc(b[0]) + '</button>').join('') + '</div></div></div>';
  m.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { m.innerHTML = ''; const f = buttons[+b.dataset.i][1]; if (f) f(); });
  m.querySelector('.modal').onclick = e => { if (e.target.classList.contains('modal')) m.innerHTML = ''; };
  const last = m.querySelector('[data-i="' + (buttons.length - 1) + '"]'); if (last) last.focus();
}

/* ========== writing ========== */
function WritingHub() {
  const hist = (Store.data.writing.history || []).slice().reverse();
  view.innerHTML = '<div class="page"><div class="head"><div><div class="muted small">Writing</div><h1>Шпаргалки и тренировка</h1></div><a class="btn pri" href="#write">' + WRITE_LABEL + '</a></div>' +
    '<div class="card"><h3 style="margin-bottom:10px">Главное про Writing в B2 First</h3><ul class="ls">' + WR.general.map(g => '<li>' + g + '</li>').join('') + '</ul></div>' +
    '<div class="grid3">' + WR.formats.map(f => '<a class="card fmt" href="#fmt-' + f.id + '"><div class="muted small">' + esc(f.part) + '</div><h3>' + esc(f.name) + '</h3><p class="muted small">' + esc(f.style) + '</p><span class="go" style="color:var(--accent);font-weight:600;font-size:14px;margin-top:6px">Шпаргалка →</span></a>').join('') + '</div>' +
    (hist.length ? '<div><h2 style="margin-bottom:12px">Мои проверенные тексты</h2><table class="wl"><thead><tr><th>Задание</th><th>Дата</th><th>Слов</th><th>Баллы</th></tr></thead><tbody>' +
      hist.slice(0, 20).map(h => '<tr><td class="en"><a href="#write-' + esc(h.task) + '">' + esc(h.title) + '</a> <span class="muted small">' + esc(h.fmt) + '</span></td><td>' + new Date(h.t).toLocaleDateString('ru-RU') + '</td><td>' + h.words + '</td><td><b>' + h.total + '</b>/20</td></tr>').join('') + '</tbody></table></div>' : '') + '</div>';
}
function Sheet(id) {
  const f = WR.formats.find(x => x.id === id); if (!f) return WritingHub();
  const tasks = WR.tasks.filter(t => t.fmt === id);
  view.innerHTML = '<div class="page"><a class="btn sm ghost" href="#writing" style="align-self:flex-start">' + ICON.back + 'Все форматы</a>' +
    '<div class="head"><div><div class="muted small">' + esc(f.part) + '</div><h1>' + esc(f.name) + '</h1></div>' + tasks.map(t => '<a class="btn pri" href="#write-' + t.id + '">Потренироваться: ' + esc(t.title) + '</a>').join('') + '</div>' +
    '<div class="grid2"><div class="card"><b>Стиль</b><p class="muted" style="margin-top:4px">' + esc(f.style) + '</p></div><div class="card"><b>Когда</b><p class="muted" style="margin-top:4px">' + esc(f.when) + '</p></div></div>' +
    '<div class="sheet"><div><h2 style="margin-bottom:10px">Структура</h2><div class="steps">' + f.structure.map(s => '<div><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>').join('') + '</div></div>' +
    '<div><h2 style="margin-bottom:10px">Полезные фразы</h2><div class="phr">' + f.phrases.map(s => '<div class="card"><b>' + esc(s[0]) + '</b><span class="serif">' + esc(s[1]) + '</span></div>').join('') + '</div></div>' +
    '<div class="card"><h2 style="margin-bottom:10px">Типичные ошибки</h2><ul class="ls">' + f.mistakes.map(m => '<li>' + esc(m) + '</li>').join('') + '</ul></div></div></div>';
}

let sampleNS;
function Write(taskId) {
  const t = WR.tasks.find(x => x.id === taskId) || WR.tasks[0];
  const f = WR.formats.find(x => x.id === t.fmt);
  const drafts = Store.data.writing.drafts || (Store.data.writing.drafts = {});
  const d = drafts[t.id] || { text: '' };
  setLast('write-' + t.id, 'Writing · ' + f.name + ': ' + t.title);
  view.innerHTML = '<div class="page" style="max-width:1240px">' +
    '<div class="head"><div><div class="muted small">Writing · ' + esc(f.part) + '</div><h1>' + esc(f.name) + ': ' + esc(t.title) + '</h1></div>' +
    '<select id="tsel" aria-label="Задание">' + WR.tasks.map(x => '<option value="' + x.id + '"' + (x.id === t.id ? ' selected' : '') + '>' + esc(WR.formats.find(y => y.id === x.fmt).name + ' — ' + x.title) + '</option>').join('') + '</select></div>' +
    '<div class="wsplit"><div style="display:flex;flex-direction:column;gap:14px"><div class="card"><div class="muted small" style="margin-bottom:8px">Задание</div><div class="task">' + esc(t.text) + '</div></div>' +
    '<div class="card"><b>Структура ' + esc(f.name) + '</b><ol style="margin:8px 0 0;padding-left:20px;font-size:14px;display:flex;flex-direction:column;gap:4px">' + f.structure.map(s => '<li><b>' + esc(s[0]) + ':</b> <span class="muted">' + esc(s[1]) + '</span></li>').join('') + '</ol><a href="#fmt-' + f.id + '" class="small" style="display:inline-block;margin-top:10px">Полная шпаргалка →</a></div></div>' +
    '<div style="display:flex;flex-direction:column;gap:12px"><div class="wbar"><span class="wc" id="wc"></span><div class="timer" id="wtimer">' + ICON.clock + '<span>40:00</span></div><button class="btn sm" id="tstart">Старт 40 минут</button><span class="sp" style="flex:1"></span><button class="btn sm ghost" id="clr">Очистить</button></div>' +
    '<textarea class="essay" id="txt" placeholder="Пиши здесь. Текст сохраняется автоматически." spellcheck="false" aria-label="Твой текст">' + esc(d.text) + '</textarea>' +
    (IN_CLAUDE ? '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn pri" id="chk">Проверить с Claude</button><span class="note" id="chkNote">Оценка по 4 критериям FCE и разбор ошибок — без готового исправленного текста.</span></div>' : '') +
    '<div id="fbk"></div></div></div></div>';
  const ta = $('#txt'), wc = $('#wc');
  const count = () => { const n = (ta.value.trim().match(/[A-Za-z0-9’'-]+/g) || []).length; wc.textContent = n + ' слов · нужно 140–190'; wc.className = 'wc ' + (n >= 140 && n <= 190 ? 'in' : n ? 'out' : ''); return n; };
  count();
  let saveT = null;
  ta.oninput = () => { count(); clearTimeout(saveT); saveT = setTimeout(() => { drafts[t.id] = { text: ta.value, t: Date.now() }; Store.save('writing'); }, 800); };
  $('#tsel').onchange = e => { location.hash = 'write-' + e.target.value; };
  $('#clr').onclick = () => modal('<h3>Очистить текст?</h3><p class="muted">Черновик этого задания будет удалён.</p>', [['Отмена', null], ['Очистить', () => { ta.value = ''; drafts[t.id] = { text: '' }; Store.save('writing'); count(); $('#fbk').innerHTML = ''; }, 'bad']]);
  let tm = null, end = 0;
  $('#tstart').onclick = () => {
    if (tm) { clearInterval(tm); tm = null; $('#tstart').textContent = 'Старт 40 минут'; $('#wtimer').lastChild.textContent = '40:00'; $('#wtimer').classList.remove('late'); return; }
    end = Date.now() + 40 * 60e3; $('#tstart').textContent = 'Сбросить';
    tm = setInterval(() => { const left = (end - Date.now()) / 1000; $('#wtimer').lastChild.textContent = left >= 0 ? fmtTime(left) : '−' + fmtTime(-left); $('#wtimer').classList.toggle('late', left < 0); }, 1000);
  };
  cleanup = () => { if (tm) clearInterval(tm); clearTimeout(saveT); drafts[t.id] = { text: ta.value, t: Date.now() }; Store.save('writing'); };
  if (d.fb) showFeedback(d.fb, d.fbText || ta.value);
  if (IN_CLAUDE) $('#chk').onclick = () => checkText(t, f, ta.value, count());
  if (IN_CLAUDE && sampleNS === null) { $('#chk').disabled = true; $('#chkNote').textContent = 'Проверка доступна, когда сайт открыт в Claude и ты вошёл в аккаунт.'; }
}
async function checkText(t, f, text, n) {
  const box = $('#fbk'), btn = $('#chk');
  if (n < 40) { box.innerHTML = '<div class="fb bad"><div class="t">Слишком коротко</div>Напиши хотя бы 40 слов, чтобы проверка имела смысл.</div>'; return; }
  if (sampleNS === undefined && window.claude && window.claude.use) sampleNS = await window.claude.use('sample');
  if (!sampleNS) { box.innerHTML = '<div class="fb bad"><div class="t">Проверка недоступна</div>Открой сайт в Claude, войдя в аккаунт, — тогда текст сможет проверить Claude.</div>'; return; }
  btn.disabled = true;
  box.innerHTML = '<div class="card" style="display:flex;gap:12px;align-items:center"><div class="spin"></div><span>Claude читает твой текст… Обычно это занимает 20–40 секунд.</span></div>';
  const prompt = 'You are an experienced Cambridge B2 First (FCE) Writing examiner and a supportive teacher for a Russian-speaking teenager.\n' +
    'Assess the candidate\'s answer below against the official B2 First assessment scales (Content, Communicative Achievement, Organisation, Language; each 0–5).\n' +
    'IMPORTANT TEACHING RULE: never rewrite the text and never give the corrected version of a sentence. For each problem, quote the exact fragment and give a hint in Russian that names the type of mistake and points the student in the right direction (e.g. which rule, which part of speech, a question to think about), so the student fixes it themselves. You may suggest a stronger B2 word or phrase only as an option to consider for weak vocabulary.\n' +
    'Also check: word count (140–190), whether every point of the task is covered, whether the format/register fits (' + f.name + '), and for a story whether the given first sentence is copied exactly.\n' +
    'Return ONLY JSON with this shape: {"scores":{"content":0-5,"communicative":0-5,"organisation":0-5,"language":0-5},"summary":"2–3 sentences in Russian","strengths":["in Russian", "..."],"issues":[{"quote":"exact fragment copied from the text, max 12 words","type":"grammar|vocabulary|spelling|punctuation|register|organisation|content","hint":"hint in Russian, no corrected version"}],"task":"what from the task is missing or weak, in Russian, or empty string"}\n' +
    'List the most important issues first, at most 12.\n\n' +
    'TASK (' + f.name + '):\n' + t.text + '\n\nCANDIDATE\'S ANSWER (' + n + ' words):\n"""\n' + text + '\n"""';
  try {
    const res = await sampleNS.json(prompt, { modelTier: 'default' });
    if (!res || !res.scores) throw { message: 'bad' };
    const drafts = Store.data.writing.drafts; drafts[t.id] = { text, t: Date.now(), fb: res, fbText: text };
    const sc = res.scores, total = ['content', 'communicative', 'organisation', 'language'].reduce((a, k) => a + (+sc[k] || 0), 0);
    const hist = Store.data.writing.history || (Store.data.writing.history = []);
    hist.push({ task: t.id, title: t.title, fmt: f.name, t: Date.now(), words: n, total });
    if (hist.length > 40) hist.splice(0, hist.length - 40);
    Store.save('writing');
    showFeedback(res, text);
    addXP(total, btn);
    if (total >= 15) { confetti(); sound('win'); }
  } catch (e) {
    const msg = e && e.code === 'rate_limited' ? 'Слишком много проверок подряд — подожди пару минут.' : e && e.code === 'not_granted' ? 'Проверка не разрешена в этом окне.' : 'Не получилось проверить. Попробуй ещё раз.';
    box.innerHTML = '<div class="fb bad"><div class="t">Ошибка</div>' + esc(msg) + '</div>';
  }
  btn.disabled = false;
}
function showFeedback(r, text) {
  const box = $('#fbk'); if (!box) return;
  const crit = [['content', 'Content'], ['communicative', 'Communicative'], ['organisation', 'Organisation'], ['language', 'Language']];
  const sc = r.scores || {};
  const total = crit.reduce((a, [k]) => a + (+sc[k] || 0), 0);
  let marked = esc(text);
  const issues = Array.isArray(r.issues) ? r.issues.slice(0, 12) : [];
  issues.forEach(i => { const q = esc(i.quote || ''); if (q && marked.includes(q)) marked = marked.replace(q, '<mark>' + q + '</mark>'); });
  box.innerHTML = '<div style="display:flex;flex-direction:column;gap:14px;margin-top:8px">' +
    '<div class="head"><h2>Оценка: ' + total + ' / 20</h2><span class="note">Ориентир экзаменатора, не официальный балл</span></div>' +
    '<div class="scores">' + crit.map(([k, n]) => '<div class="card"><div class="muted small">' + n + '</div><b>' + (+sc[k] || 0) + '</b><span class="muted">/5</span><div class="bar" style="margin-top:6px"><i style="width:' + ((+sc[k] || 0) / 5 * 100) + '%"></i></div></div>').join('') + '</div>' +
    (r.summary ? '<div class="card">' + esc(r.summary) + '</div>' : '') +
    (r.task ? '<div class="fb bad"><div class="t">По заданию</div>' + esc(r.task) + '</div>' : '') +
    (Array.isArray(r.strengths) && r.strengths.length ? '<div class="fb ok"><div class="t">Что получилось</div><ul class="ls">' + r.strengths.map(s => '<li>' + esc(s) + '</li>').join('') + '</ul></div>' : '') +
    (issues.length ? '<div><h3 style="margin-bottom:8px">Найди и исправь сам</h3><div class="issues">' + issues.map(i => '<div class="issue"><q>' + esc(i.quote) + '</q><span class="ty">' + esc(i.type) + '</span><div style="margin-top:6px;font-size:15px">' + esc(i.hint) + '</div></div>').join('') + '</div></div>' : '') +
    '<details class="card"><summary style="cursor:pointer;font-weight:600">Мой текст с отметками</summary><div class="mine" style="margin-top:10px">' + marked + '</div></details>' +
    '<p class="note">Исправь текст выше и нажми «Проверить с Claude» ещё раз, чтобы увидеть прогресс.</p></div>';
}

/* ========== start ========== */
themeLabel();
soundLabel();
Store.loadLocal();
route();
loadData().then(() => { checkBadges(true); route(); }).catch(() => { view.innerHTML = '<div class="page"><div class="empty">Не удалось загрузить данные. Обнови страницу.</div></div>'; });
Store.connect();
if (window.claude && window.claude.use) window.claude.use('sample').then(s => { sampleNS = s; if (s === null && $('#chk')) { $('#chk').disabled = true; $('#chkNote').textContent = 'Проверка доступна, когда сайт открыт в Claude и ты вошёл в аккаунт.'; } });
}
