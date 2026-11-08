import { RELATIONS, UNITS, CASES, JUDGES, JUDGE_LABELS, PASSAGES, TOKEN_HINTS, REWRITE, SCENES, CHECKLIST, SCORED, SKILLS, splitTokens } from './data.js';
import { sound, confetti, stamp, mascot, setFx } from './fx.js';

const KEY = 'jiedai-detective-v1';
const PASSAGE_REL = { p1a: 'feature', p1b: 'part', p2a: 'part', p3a: 'author' };
const PUNCT = /^[，。！？：、；「」『』]+$/;
const JUDGE_ICON = { jiedai: '🔄', biyu: '🪞', putong: '📝', niren: '🌼' };
const main = document.getElementById('main');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function blank() {
  return { v: 1, contentRevision: 2, answers: {}, units: {}, last: 'u1', writing: { rewrite: '', rewriteQ: null, entries: [] }, prefs: { sound: true, calm: false, teacher: false, large: false } };
}
let storageOk = true;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const d = JSON.parse(raw);
    const b = blank();
    if (d.contentRevision !== 2) {
      d.answers = { ...(d.answers || {}) };
      for (const id of ['c3a', 'c3b', 'j7', 'p1b']) delete d.answers[id];
      d.units = { ...(d.units || {}) };
      for (const id of ['u2', 'u3', 'u4', 'u5', 'u6']) delete d.units[id];
      if (d.writing) d.writing.rewriteQ = null;
    }
    return { ...b, ...d, contentRevision: 2, writing: { ...b.writing, ...(d.writing || {}) }, prefs: { ...b.prefs, ...(d.prefs || {}) } };
  } catch { storageOk = false; return blank(); }
}
let S = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { storageOk = false; }
}

const ui = { u1: { step: 0, msg: '' }, u2: { step: 0, flipped: [] }, u3: null, u4: null, u5: null, u6: { scene: 0, msg: '', checks: [] } };

function ans(id) { return S.answers[id] || (S.answers[id] = { tries: 0, first: null, done: false, revealed: false }); }
function record(id, correct) {
  const a = ans(id);
  if (a.done) return;
  a.tries += 1;
  if (a.first === null) a.first = correct;
  else if (!correct) a.first = false;
  save();
}
function finish(id) {
  const a = ans(id);
  if (a.done) return;
  a.done = true;
  if (a.first === null) a.first = true;
  save();
}
function reveal(id) { const a = ans(id); a.revealed = true; a.first = false; a.done = true; save(); }

function unitDone(id) { return !!S.units[id]; }
function completeUnit(id) {
  if (S.units[id]) return;
  S.units[id] = true; save();
  const u = UNITS.find((x) => x.id === id);
  stamp('破案！獲得「' + u.badge + '」徽章');
  renderNav();
}

function stats() {
  const total = SCORED.length;
  let done = 0, first = 0;
  for (const q of SCORED) { const a = S.answers[q.id]; if (a?.done) { done++; if (a.first) first++; } }
  return { total, done, first };
}
function rank() {
  const n = Object.values(S.units).filter(Boolean).length;
  if (n >= 6) return { name: '金牌偵探', icon: '🏆' };
  if (n >= 4) return { name: '高級偵探', icon: '🥈' };
  if (n >= 2) return { name: '小偵探', icon: '🕵️' };
  return { name: '見習偵探', icon: '🔎' };
}

function coach(text, mood = 'happy') {
  return `<div class="coach"><div class="coach-art">${mascot(mood, 92)}</div><p class="bubble" aria-live="polite">${text}</p></div>`;
}
function say(text, mood = 'happy') {
  const c = main.querySelector('.coach');
  if (!c) return;
  c.querySelector('.coach-art').innerHTML = mascot(mood, 92);
  const b = c.querySelector('.bubble');
  b.innerHTML = text;
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
}

function feedback(kind, html) {
  if (!html) return '';
  const icon = kind === 'good' ? '✅ 答對了！' : kind === 'bad' ? '🤔 再想想' : kind === 'reveal' ? '📖 解說' : '💡 提示';
  return `<div class="fb fb-${kind}" role="status"><strong>${icon}</strong><span>${html}</span></div>`;
}

function renderNav() {
  const nav = document.getElementById('unit-nav');
  const r = location.hash.slice(1) || 'home';
  nav.innerHTML = UNITS.map((u) => `<a href="#${u.id}" ${r === u.id ? 'aria-current="page"' : ''} class="${unitDone(u.id) ? 'done' : ''}"><span class="n">${unitDone(u.id) ? '✓' : u.no}</span>${u.title}</a>`).join('') +
    `<a href="#report" ${r === 'report' ? 'aria-current="page"' : ''}><span class="n">★</span>偵探報告</a>`;
  const st = stats();
  document.getElementById('clue-count').textContent = st.first;
  document.getElementById('clue-count').title = `首次答對 ${st.first} 題`;
}

function shell(unitId, inner) {
  const u = UNITS.find((x) => x.id === unitId);
  const idx = UNITS.indexOf(u);
  const prev = UNITS[idx - 1], next = UNITS[idx + 1];
  return `<section class="unit unit-${unitId}">
    <header class="unit-head">
      <div class="case-tag"><span>${u.icon}</span>案件 ${u.no}</div>
      <h1>${u.title}<small>${u.sub}</small></h1>
      ${unitDone(unitId) ? '<div class="mini-stamp" aria-label="已破案">已破案</div>' : ''}
    </header>
    ${inner}
    <nav class="unit-foot" aria-label="案件切換">
      ${prev ? `<a class="btn ghost" href="#${prev.id}">← ${prev.title}</a>` : '<a class="btn ghost" href="#home">← 偵探社</a>'}
      ${next ? `<a class="btn ghost" href="#${next.id}">${next.title} →</a>` : '<a class="btn ghost" href="#report">偵探報告 →</a>'}
    </nav>
  </section>`;
}

function optButtons(list, act, opts = {}) {
  return `<div class="opts ${opts.cls || ''}" role="group" aria-label="${opts.label || '選項'}">${list.map((o, i) => {
    const st = opts.state?.[i] || '';
    return `<button class="opt ${st}" data-act="${act}" data-i="${i}" ${st ? 'disabled' : ''}><span class="key" aria-hidden="true">${i + 1}</span><span class="otext">${o}</span>${st === 'right' ? '<span class="mark">✓</span>' : st === 'wrong' ? '<span class="mark">✗</span>' : ''}</button>`;
  }).join('')}</div>`;
}

/* ---------- 首頁 ---------- */
function home() {
  const st = stats();
  const r = rank();
  const started = Object.keys(S.answers).length || Object.keys(S.units).length;
  const resume = UNITS.find((u) => !unitDone(u.id)) || UNITS[5];
  main.innerHTML = `<section class="hero">
    <div class="hero-text">
      <p class="eyebrow">小五中文 · 修辭偵探課</p>
      <h1>借代<span>小偵探</span></h1>
      <p class="lead">有人說「<b>白袍</b>在照顧病人」，衣服怎會照顧病人？<br>拿起放大鏡，找出句子背後真正的主角！</p>
      <div class="hero-actions">
        <a class="btn big primary" href="#u1">🔎 開始學習</a>
        ${started ? `<a class="btn big" href="#${resume.id}">📂 繼續上次進度</a>` : ''}
      </div>
      <div class="three-q" aria-label="偵探三問">
        <div><b>1</b>用了甚麼詞？</div><div><b>2</b>真正指誰？</div><div><b>3</b>為甚麼可以代替？</div>
      </div>
    </div>
    <div class="hero-art">${mascot('happy', 220)}<div class="hero-bubble">我是偵探<b>小探</b>，<br>一起破案吧！</div></div>
  </section>
  <section class="board" aria-label="案件板">
    <div class="board-head"><h2>📌 案件板</h2><p>${r.icon} 目前等級：<b>${r.name}</b> · 已完成 ${st.done}/${st.total} 題 · 首次答對 ${st.first} 題</p></div>
    <div class="folders">${UNITS.map((u) => `<a class="folder ${unitDone(u.id) ? 'solved' : ''}" href="#${u.id}">
      <span class="tab">案件 ${u.no}</span><span class="ficon" aria-hidden="true">${u.icon}</span>
      <b>${u.title}</b><small>${u.sub} · 約 ${u.minutes} 分鐘</small>
      ${unitDone(u.id) ? '<span class="fstamp">已破案</span>' : ''}
    </a>`).join('')}</div>
  </section>
  <section class="badges-row" aria-label="偵探徽章">
    <h2>🎖️ 偵探徽章</h2>
    <div class="badges">${UNITS.map((u) => `<div class="badge ${unitDone(u.id) ? 'got' : ''}"><span>${unitDone(u.id) ? u.icon : '❔'}</span><small>${unitDone(u.id) ? u.badge : '未解鎖'}</small></div>`).join('')}</div>
  </section>
  <section class="def-card">
    <h2>📖 偵探守則：甚麼是借代？</h2>
    <p class="def">不直接說出某人或事物的名稱，而用<mark>與它有密切關係</mark>的名稱來代替。</p>
    <p class="muted">記住：一定要<b>有關係</b>，而且真的<b>用來代替</b>。讀者也要能從上下文明白所指。</p>
  </section>`;
}

/* ---------- 單元一 ---------- */
function u1() {
  const s = ui.u1;
  const q = ['掛在衣架上', '詢問病人的情況', '放在洗衣籃裏'];
  let body = `<div class="radio">
    <div class="radio-icon" aria-hidden="true">📻</div>
    <div><p class="radio-label">偵探社收到一段奇怪的廣播……</p>
    <p class="sentence">病房裏，幾位<span class="hl">白袍</span>正細心詢問病人的情況。</p></div>
  </div>`;
  if (s.step === 0) {
    body += `<div class="task"><h2>問題：句中的「白袍」正在做甚麼？</h2>${optButtons(q, 'u1q', { state: s.state })}${s.msg}</div>`;
    return shell('u1', coach('咦？這句話有點奇怪……聽清楚廣播，白袍在做甚麼？', 'think') + body);
  }
  body += `<div class="task"><h2>衣服會詢問病人嗎？拿放大鏡看看白袍背後是誰！</h2>
    <div class="lens-stage ${s.step >= 2 ? 'shown' : ''}" id="lens-stage" tabindex="0" aria-label="放大鏡場景：在畫面上移動手指或滑鼠，查看白袍背後的人">
      <div class="layer top"><span>🥼</span><span>🥼</span><span>🥼</span><p>病房裏的白袍……</p></div>
      <div class="layer under" id="lens-under"><span>👩‍⚕️</span><span>🧑‍⚕️</span><span>👨‍⚕️</span><p>原來是醫護人員！</p></div>
      <div class="lens-ring" id="lens-ring" aria-hidden="true"></div>
    </div>
    <div class="row"><button class="btn" data-act="u1all">🔍 一次看清楚</button></div>
  </div>`;
  if (s.step >= 2) {
    body += `<div class="reveal-card">
      <div class="link-line"><span class="chip">白袍</span><span class="arrow" aria-hidden="true">➜</span><span class="chip t">穿白袍的醫護人員</span></div>
      <p>作者沒有直接寫「醫生」或「護士」，而是借他們身上的<b>衣着</b>來代替他們。這種寫法就叫<b>借代</b>。判斷時要找出它代替誰，不能只看它做了甚麼動作。</p>
      <p class="note">⚠️ 小心：要看情境！「衣架上掛着白袍」的白袍，就只是衣服，不是醫生。</p>
      <div class="def-mini">📖 <b>借代</b>：不直接說出名稱，而用和它<mark>有密切關係</mark>的名稱來代替。</div>
      <div class="row center">${unitDone('u1') ? '<a class="btn primary big" href="#u2">下一案：拆開借代 →</a>' : '<button class="btn primary big" data-act="u1done">🎉 破案！</button>'}</div>
    </div>`;
  }
  return shell('u1', coach(s.step >= 2 ? '原來白袍就是醫護人員！這就是借代。' : '在畫面上移動放大鏡，看看會發現誰！', s.step >= 2 ? 'proud' : 'wow') + body);
}

function bindLens() {
  const stage = document.getElementById('lens-stage');
  if (!stage) return;
  const under = document.getElementById('lens-under');
  const ring = document.getElementById('lens-ring');
  let moved = 0;
  const move = (x, y) => {
    under.style.clipPath = `circle(70px at ${x}px ${y}px)`;
    ring.style.transform = `translate(${x - 74}px, ${y - 74}px)`;
    ring.style.opacity = 1;
    moved++;
    if (moved > 18 && ui.u1.step === 1) { ui.u1.step = 2; sound('reveal'); setTimeout(render, 500); }
  };
  stage.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); move(e.clientX - r.left, e.clientY - r.top); });
  stage.addEventListener('pointerdown', (e) => { const r = stage.getBoundingClientRect(); move(e.clientX - r.left, e.clientY - r.top); });
  stage.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ui.u1.step = 2; sound('reveal'); render(); } });
}

/* ---------- 單元二 ---------- */
function u2() {
  const s = ui.u2;
  const steps = [
    { t: '找詞語', d: '句中奇怪的詞是「藍帽子」。再看前文，這裏指哪一群人？' },
    { t: '找對象', d: '前文說隊員都戴藍色帽子，所以「藍帽子」指<b>我們學校的參賽隊員</b>。' },
    { t: '說關係', d: '作者用隊員的<b>衣着</b>，代替戴這種帽子的隊員。' },
  ];
  let body = `<div class="story">
    <p class="context">前文：我們學校的參賽隊員都戴着藍色帽子。</p>
    <p class="sentence">比賽結束後，<span class="hl ${s.step >= 1 ? 'on' : ''}">藍帽子</span>高舉獎盃，歡呼起來。</p>
    <div class="link-line big ${s.step >= 2 ? 'on' : ''}" aria-hidden="${s.step < 2}">
      <span class="chip">藍帽子</span><span class="arrow">➜</span><span class="chip t">🧑‍🤝‍🧑 參賽隊員</span>
    </div>
  </div>
  <ol class="steps">${steps.map((st, i) => `<li class="${s.step > i ? 'open' : ''}">
    <button class="step-btn" data-act="u2step" data-i="${i}" ${s.step !== i ? 'disabled' : ''}><span class="sn">${i + 1}</span>${st.t}</button>
    <p ${s.step > i ? '' : 'hidden'}>${st.d}</p></li>`).join('')}</ol>`;
  if (s.step >= 3) {
    body += `<div class="compare">
      <div class="cmp-card"><small>普通寫法</small><p>戴着藍色帽子的參賽隊員高舉獎盃。</p></div>
      <div class="cmp-vs" aria-hidden="true">VS</div>
      <div class="cmp-card star"><small>借代寫法</small><p>藍帽子高舉獎盃。</p></div>
    </div>
    <p class="center-text">兩種寫法都可以。借代能<b>突出帽子的顏色特徵</b>，直接寫隊員也很清楚。要按表達需要選擇，不是用了借代就一定較好。</p>
    <h2 class="sec">✨ 翻開四張關係卡</h2><p class="muted">這是本課選用的幾種關係，不是借代的全部類型。不用背分類名稱，先說清楚為甚麼可以代替。</p>
    <div class="flip-grid">${Object.entries(RELATIONS).map(([k, r], i) => `<button class="flip ${s.flipped.includes(i) ? 'on' : ''}" data-act="u2flip" data-i="${i}" aria-pressed="${s.flipped.includes(i)}">
      <span class="front"><span class="ficon">${r.icon}</span><b>${r.label}</b><small>點擊翻開</small></span>
      <span class="back"><b>${r.label}</b><span>${r.desc}</span><em>${r.example}</em></span></button>`).join('')}</div>
    <div class="row center">${unitDone('u2') ? '<a class="btn primary big" href="#u3">下一案：線索配對站 →</a>' : `<button class="btn primary big" data-act="u2done" ${s.flipped.length < 4 ? 'disabled' : ''}>🎉 破案！${s.flipped.length < 4 ? `（再翻 ${4 - s.flipped.length} 張）` : ''}</button>`}</div>`;
  }
  const lines = ['跟我一步一步拆開這句話！按「找詞語」開始。', '找到了！再看看前文，它指誰？', '最後，說說兩者有甚麼關係。', '三步完成！再翻開四張關係卡吧。'];
  return shell('u2', coach(lines[Math.min(s.step, 3)], s.step >= 3 ? 'proud' : 'think') + body);
}

/* ---------- 單元三 ---------- */
function u3State() {
  if (!ui.u3) {
    const i = CASES.findIndex((c) => !(ans(c.id + 'a').done && ans(c.id + 'b').done));
    ui.u3 = { i: i < 0 ? 0 : i };
    resetCase();
  }
  return ui.u3;
}
function resetCase() {
  const s = ui.u3;
  const c = CASES[s.i];
  const doneA = S.answers[c.id + 'a']?.done, doneB = S.answers[c.id + 'b']?.done;
  Object.assign(s, { step: doneA ? (doneB ? 'done' : 'relation') : 'word', wrong: 0, msg: '', tokState: {}, optState: {}, mood: 'think' });
}
function u3() {
  const s = u3State();
  const c = CASES[s.i];
  const toks = splitTokens(c.tokens);
  const wordFound = s.step !== 'word';
  const dots = CASES.map((x, i) => {
    const d = S.answers[x.id + 'a']?.done && S.answers[x.id + 'b']?.done;
    return `<button class="dot ${i === s.i ? 'cur' : ''} ${d ? 'done' : ''}" data-act="u3go" data-i="${i}" aria-label="第 ${i + 1} 案${d ? '（已完成）' : ''}">${d ? '✓' : i + 1}</button>`;
  }).join('');
  let body = `<div class="dots" role="group" aria-label="選擇案件">${dots}</div>
  <article class="case-card">
    <div class="case-scene" aria-hidden="true">${c.scene}</div>
    <span class="place">📍 ${c.place}</span>
    ${c.context ? `<p class="context">${c.context}</p>` : ''}
    <p class="sentence tokens ${s.step === 'word' ? 'pick' : ''}">${toks.map((t, i) => {
      const st = s.tokState[i] || (wordFound && t === c.word ? 'right' : '');
      return s.step === 'word' && !PUNCT.test(t) ? `<button class="tok ${st}" data-act="u3tok" data-i="${i}" ${st ? 'disabled' : ''}>${t}</button>` : `<span class="tok ${st}">${t}</span>`;
    }).join('')}</p>`;
  let task = '';
  if (s.step === 'word') task = `<h2>① 點出句中的<b>借代詞</b></h2><p class="muted">提示：找一個「真正意思」不是字面意思的詞。</p>`;
  else if (s.step === 'target') task = `<h2>② 「${c.word}」在這裏真正指甚麼？</h2>${optButtons(c.targets, 'u3target', { state: s.optState })}`;
  else if (s.step === 'relation') task = `<div class="found">✔ 「${c.word}」→ ${c.targets[c.target]}</div><h2>③ 兩者有甚麼關係？</h2>${optButtons(Object.values(RELATIONS).map((r) => `${r.icon} ${r.label}`), 'u3rel', { state: s.optState, cls: 'two' })}`;
  else {
    const r = RELATIONS[c.relation];
    task = `<div class="solved-card">
      <p class="formula">作者用「<b>${c.word}</b>」代替「<b>${c.targets[c.target]}</b>」，兩者的關係是 <span class="rel-tag">${r.icon} ${r.label}</span>。</p>
      <p>${c.why}</p>
    </div>
    <div class="row center">${s.i < CASES.length - 1 ? '<button class="btn primary big" data-act="u3next">下一個案件 →</button>' : ''}
      ${CASES.every((x) => S.answers[x.id + 'a']?.done && S.answers[x.id + 'b']?.done) && !unitDone('u3') ? '<button class="btn primary big" data-act="u3done">🎉 全部破案！</button>' : ''}
      ${unitDone('u3') && s.i === CASES.length - 1 ? '<a class="btn primary big" href="#u4">下一案：真假借代 →</a>' : ''}</div>`;
  }
  body += `<div class="task">${task}${s.msg}${teacherTools(c.discuss, s.step !== 'done' ? 'u3reveal' : '')}</div></article>`;
  const lines = { word: '這句話裏，哪個詞語有「秘密身分」？', target: '找到了！它真正指的是誰或甚麼？', relation: '最後一步：說出它們的關係！', done: '案件解決！你說清楚了詞語、對象和關係。' };
  return shell('u3', coach(lines[s.step], s.step === 'done' ? 'proud' : s.mood) + body);
}
function teacherTools(discuss, revealAct) {
  if (!S.prefs.teacher) return '';
  return `<div class="teacher-box"><span class="tb-tag">👩‍🏫 老師</span>${discuss ? `<p>討論：${discuss}</p>` : ''}${revealAct ? `<button class="btn small" data-act="${revealAct}">揭曉這一步答案</button>` : ''}</div>`;
}
function maybeReveal(n) { return n >= 2 ? ' <button class="link-btn" data-act="showhow">看解說</button>' : ''; }

function u3Handle(act, i) {
  const s = ui.u3, c = CASES[s.i];
  if (act === 'u3tok') {
    const t = splitTokens(c.tokens)[i];
    if (t === c.word) {
      sound('good'); s.tokState = { [i]: 'right' }; s.step = 'target'; s.wrong = 0; s.optState = {};
      s.msg = feedback('good', `「${t}」就是借代詞！`); s.mood = 'wow';
    } else {
      sound('bad'); record(c.id + 'a', false); s.tokState[i] = 'wrong'; s.wrong++;
      s.msg = feedback('bad', `「${esc(t)}」就是它本來的意思，沒有代替別的東西。` + (s.wrong >= 2 ? ` 提示：找一個「不能照字面理解」的詞。<button class="link-btn" data-act="showhow">看解說</button>` : '')); s.mood = 'think';
    }
  } else if (act === 'u3target') {
    if (i === c.target) {
      sound('good'); record(c.id + 'a', true); finish(c.id + 'a');
      s.step = 'relation'; s.wrong = 0; s.optState = {}; s.msg = feedback('good', `「${c.word}」指的是${c.targets[c.target]}。`); s.mood = 'happy';
    } else {
      sound('bad'); record(c.id + 'a', false); s.optState[i] = 'wrong'; s.wrong++;
      s.msg = feedback('bad', c.targetHints[i] + maybeReveal(s.wrong)); s.mood = 'think';
    }
  } else if (act === 'u3rel') {
    const key = Object.keys(RELATIONS)[i];
    if (key === c.relation) {
      sound('good'); record(c.id + 'b', true); finish(c.id + 'b');
      s.step = 'done'; s.msg = ''; confetti(24);
    } else {
      sound('bad'); record(c.id + 'b', false); s.optState[i] = 'wrong'; s.wrong++;
      const r = RELATIONS[key];
      s.msg = feedback('bad', `「${r.label}」是${r.desc.replace('。', '')}。「${c.word}」和「${c.targets[c.target]}」是這種關係嗎？` + maybeReveal(s.wrong)); s.mood = 'think';
    }
  }
}
function u3Reveal() {
  const s = ui.u3, c = CASES[s.i];
  sound('reveal');
  if (s.step === 'word') { const idx = splitTokens(c.tokens).indexOf(c.word); s.tokState = { [idx]: 'right' }; s.step = 'target'; s.optState = {}; s.wrong = 0; s.msg = feedback('reveal', `借代詞是「${c.word}」。`); ans(c.id + 'a').first = false; save(); }
  else if (s.step === 'target') { reveal(c.id + 'a'); s.step = 'relation'; s.optState = {}; s.wrong = 0; s.msg = feedback('reveal', `「${c.word}」指${c.targets[c.target]}。${c.why}`); }
  else if (s.step === 'relation') { reveal(c.id + 'b'); s.step = 'done'; s.msg = ''; }
}

/* ---------- 單元四 ---------- */
function u4State() {
  if (!ui.u4) { const i = JUDGES.findIndex((j) => !S.answers[j.id]?.done); ui.u4 = { i: i < 0 ? 0 : i }; resetJudge(); }
  return ui.u4;
}
function resetJudge() {
  const s = ui.u4, j = JUDGES[s.i];
  Object.assign(s, { step: S.answers[j.id]?.done ? 'done' : 'judge', wrong: 0, msg: '', optState: {}, mood: 'think' });
}
function u4() {
  const s = u4State(), j = JUDGES[s.i];
  const keys = Object.keys(JUDGE_LABELS);
  const dots = JUDGES.map((x, i) => `<button class="dot ${i === s.i ? 'cur' : ''} ${S.answers[x.id]?.done ? 'done' : ''}" data-act="u4go" data-i="${i}" aria-label="第 ${i + 1} 句">${S.answers[x.id]?.done ? '✓' : i + 1}</button>`).join('');
  let task;
  if (s.step === 'judge') task = `<h2>這一句是……</h2>${optButtons(keys.map((k) => `${JUDGE_ICON[k]} ${JUDGE_LABELS[k]}`), 'u4j', { state: s.optState, cls: 'two' })}`;
  else if (s.step === 'reason') task = `<div class="found">✔ 這句是「${JUDGE_LABELS[j.answer]}」</div><h2>為甚麼？選出最好的理由</h2>${optButtons(j.reasons, 'u4r', { state: s.optState })}`;
  else task = `<div class="solved-card"><p class="formula"><span class="rel-tag">${JUDGE_ICON[j.answer]} ${JUDGE_LABELS[j.answer]}</span></p><p>${j.explain}</p></div>
    <div class="row center">${s.i < JUDGES.length - 1 ? '<button class="btn primary big" data-act="u4next">下一句 →</button>' : ''}
    ${JUDGES.every((x) => S.answers[x.id]?.done) && !unitDone('u4') ? '<button class="btn primary big" data-act="u4done">🎉 全部破案！</button>' : ''}
    ${unitDone('u4') && s.i === JUDGES.length - 1 ? '<a class="btn primary big" href="#u5">下一案：小偵探辦案 →</a>' : ''}</div>`;
  const body = `<div class="legend">
      <span>🔄 <b>借代</b>：用有關係的名稱<b>代替</b></span><span>🪞 <b>比喻</b>：抓住<b>相似</b>之處作比較</span><span>🌼 <b>擬人</b>：把事物當作人來寫</span><span>📝 <b>普通描述</b>：照字面意思</span>
    </div>
    <p class="note">🔍 小心陷阱：「白袍照顧病人」用衣着代替人；「花兒向我微笑」仍在寫花，是擬人。先找清楚所指，不能只看動作。</p><div class="dots" role="group" aria-label="選擇句子">${dots}</div>
    <article class="case-card judge">
      <div class="case-scene" aria-hidden="true">${j.emoji}</div>
      <p class="sentence">${j.sentence}</p>
      <div class="task">${task}${s.msg}${teacherTools('', s.step !== 'done' ? 'u4reveal' : '')}</div>
    </article>`;
  const lines = { judge: '真定假？同一個詞在不同句子，身分可能不同！', reason: '答對了！說出理由才是真偵探。', done: '辨得好！留意這句和相似句子的分別。' };
  return shell('u4', coach(lines[s.step], s.step === 'done' ? 'proud' : s.mood) + body);
}
function u4Handle(act, i) {
  const s = ui.u4, j = JUDGES[s.i];
  if (act === 'u4j') {
    const k = Object.keys(JUDGE_LABELS)[i];
    if (k === j.answer) { sound('good'); record(j.id, true); s.step = 'reason'; s.optState = {}; s.wrong = 0; s.msg = ''; s.mood = 'happy'; }
    else { sound('bad'); record(j.id, false); s.optState[i] = 'wrong'; s.wrong++; s.msg = feedback('bad', j.hints[k] + maybeReveal(s.wrong)); s.mood = 'think'; }
  } else if (act === 'u4r') {
    if (i === j.reason) { sound('good'); finish(j.id); s.step = 'done'; s.msg = ''; confetti(20); }
    else { sound('bad'); record(j.id, false); s.optState[i] = 'wrong'; s.wrong++; s.msg = feedback('bad', '這個理由說不通。想想句子是「代替」、「比較相似」，「把事物當人寫」，還是照字面意思？' + maybeReveal(s.wrong)); s.mood = 'think'; }
  }
}
function u4Reveal() { const s = ui.u4; reveal(JUDGES[s.i].id); sound('reveal'); s.step = 'done'; s.msg = ''; }

/* ---------- 單元五 ---------- */
function u5State() {
  if (!ui.u5) { const p = PASSAGES.findIndex((x) => x.targets.some((t) => !S.answers[t.id]?.done)); ui.u5 = { p: p < 0 ? 0 : p }; resetPassage(); }
  return ui.u5;
}
function resetPassage() {
  const s = ui.u5, P = PASSAGES[s.p];
  const left = P.targets.filter((t) => !S.answers[t.id]?.done);
  Object.assign(s, { step: left.length ? 'find' : 'done', cur: null, wrong: 0, msg: '', optState: {}, tokWrong: {}, clueWrong: {}, mood: 'think' });
}
function u5() {
  const s = u5State(), P = PASSAGES[s.p];
  const T = P.targets.find((t) => t.id === s.cur);
  const found = P.targets.filter((t) => S.answers[t.id]?.done || t.id === s.cur);
  const isFound = (si, tok) => found.some((t) => t.at[0] === si && t.at[1] === tok);
  const tabs = PASSAGES.map((x, i) => { const d = x.targets.every((t) => S.answers[t.id]?.done); return `<button class="ptab ${i === s.p ? 'cur' : ''} ${d ? 'done' : ''}" data-act="u5go" data-i="${i}">${x.emoji} ${x.title}${d ? ' ✓' : ''}</button>`; }).join('');
  const passage = P.sentences.map((sen, si) => {
    const toks = splitTokens(sen).map((tok, ti) => {
      const st = isFound(si, tok) ? 'right' : s.tokWrong[si + ':' + ti] ? 'wrong' : '';
      return s.step === 'find' && !PUNCT.test(tok) ? `<button class="tok ${st}" data-act="u5tok" data-s="${si}" data-i="${ti}" ${st ? 'disabled' : ''}>${tok}</button>` : `<span class="tok ${st}">${tok}</span>`;
    }).join('');
    if (s.step === 'clue') return `<button class="sen ${s.clueWrong[si] ? 'wrong' : ''}" data-act="u5clue" data-i="${si}" ${s.clueWrong[si] ? 'disabled' : ''}>${toks}</button>`;
    return `<span class="sen">${toks}</span>`;
  }).join('');
  const remain = P.targets.filter((t) => !S.answers[t.id]?.done && t.id !== s.cur).length;
  let task = '';
  if (s.step === 'find') task = `<h2>① 這篇短文還藏着 <b>${remain}</b> 個借代，點出來！</h2>`;
  else if (s.step === 'target') task = `<div class="found">✔ 找到「${T.at[1]}」</div><h2>② 「${T.at[1]}」真正指甚麼？</h2>${optButtons(T.options, 'u5target', { state: s.optState })}`;
  else if (s.step === 'clue') task = `<div class="found">✔ 「${T.at[1]}」→ ${T.options[T.answer]}</div><h2>③ 哪一句話是你的<b>證據</b>？點選短文中的句子。</h2>`;
  else if (s.step === 'solved') {
    const r = RELATIONS[PASSAGE_REL[T.id]];
    task = `<div class="solved-card"><p class="formula">作者用「<b>${T.at[1]}</b>」代替「<b>${T.options[T.answer]}</b>」，兩者的關係是 <span class="rel-tag">${r.icon} ${r.label}</span>。</p><p>${T.explain}</p></div>
    <div class="row center"><button class="btn primary big" data-act="u5cont">${P.targets.some((t) => !S.answers[t.id]?.done) ? '繼續找下一個 →' : '完成這篇短文 →'}</button></div>`;
  } else {
    const allDone = PASSAGES.every((x) => x.targets.every((t) => S.answers[t.id]?.done));
    task = `<div class="solved-card"><p>📁 這篇短文的借代全部找到了：${P.targets.map((t) => `<span class="chip">${t.at[1]}</span> → ${t.options[t.answer]}`).join('；')}</p></div>
    <div class="row center">${s.p < PASSAGES.length - 1 ? '<button class="btn primary big" data-act="u5nextp">下一篇短文 →</button>' : ''}
    ${allDone && !unitDone('u5') ? '<button class="btn primary big" data-act="u5done">🎉 全部破案！</button>' : ''}
    ${unitDone('u5') && s.p === PASSAGES.length - 1 ? '<a class="btn primary big" href="#u6">下一案：我的借代句 →</a>' : ''}</div>`;
  }
  const body = `<div class="ptabs" role="group" aria-label="選擇短文">${tabs}</div>
    <article class="case-card passage">
      <h2 class="ptitle">${P.emoji} ${P.title}</h2>
      <div class="ptext ${s.step === 'find' ? 'pick' : ''} ${s.step === 'clue' ? 'clue' : ''}">${passage}</div>
      <div class="task">${task}${s.msg}${teacherTools(s.step === 'clue' ? '你從哪一句知道它指誰？說說你的理由。' : '', ['find', 'target', 'clue'].includes(s.step) ? 'u5reveal' : '')}</div>
    </article>`;
  const lines = { find: '用放大鏡掃描短文，找出有「秘密身分」的詞！', target: '找到一個！它指的是誰？', clue: '好偵探要有證據。哪一句告訴你答案？', solved: '證據確鑿！案件解決。', done: '這篇短文已經查清楚了！' };
  return shell('u5', coach(lines[s.step], ['solved', 'done'].includes(s.step) ? 'proud' : s.mood) + body);
}
function u5Handle(act, i, si) {
  const s = ui.u5, P = PASSAGES[s.p];
  if (act === 'u5tok') {
    const tok = splitTokens(P.sentences[si])[i];
    const T = P.targets.find((t) => !S.answers[t.id]?.done && t.at[0] === si && t.at[1] === tok);
    if (T) { sound('good'); s.cur = T.id; s.step = 'target'; s.wrong = 0; s.optState = {}; s.msg = feedback('good', `「${tok}」是借代詞！`); s.mood = 'wow'; }
    else {
      sound('bad'); s.tokWrong[si + ':' + i] = true; s.wrong++;
      const pending = P.targets.filter((t) => !S.answers[t.id]?.done);
      if (pending.length === 1) record(pending[0].id, false);
      s.msg = feedback('bad', (TOKEN_HINTS[tok] || `「${esc(tok)}」照字面理解就可以，沒有代替別的東西。`) + (s.wrong >= 3 ? ' <button class="link-btn" data-act="u5reveal">看解說</button>' : '')); s.mood = 'think';
    }
  } else if (act === 'u5target') {
    const T = P.targets.find((t) => t.id === s.cur);
    if (i === T.answer) { sound('good'); record(T.id, true); s.step = 'clue'; s.wrong = 0; s.msg = ''; s.mood = 'happy'; }
    else { sound('bad'); record(T.id, false); s.optState[i] = 'wrong'; s.wrong++; s.msg = feedback('bad', T.hints[i] + (s.wrong >= 2 ? ' <button class="link-btn" data-act="u5reveal">看解說</button>' : '')); s.mood = 'think'; }
  } else if (act === 'u5clue') {
    const T = P.targets.find((t) => t.id === s.cur);
    if (T.clues.includes(i)) { sound('good'); finish(T.id); s.step = 'solved'; s.msg = ''; confetti(24); }
    else { sound('bad'); record(T.id, false); s.clueWrong[i] = true; s.wrong++; s.msg = feedback('bad', '這一句沒有告訴我們它指誰。找一句交代人物或情況的句子。' + (s.wrong >= 2 ? ' <button class="link-btn" data-act="u5reveal">看解說</button>' : '')); s.mood = 'think'; }
  }
}
function u5Reveal() {
  const s = ui.u5, P = PASSAGES[s.p];
  const T = P.targets.find((t) => t.id === s.cur) || P.targets.find((t) => !S.answers[t.id]?.done);
  if (!T) return;
  sound('reveal'); s.cur = T.id; reveal(T.id); s.step = 'solved'; s.msg = feedback('reveal', `證據在第 ${T.clues.map((c) => c + 1).join('、')} 句。`);
}

/* ---------- 單元六 ---------- */
function u6() {
  const s = ui.u6, W = S.writing;
  const hasRewrite = W.rewrite.trim().length > 0;
  const sc = SCENES[s.scene];
  let body = `<article class="case-card write">
    <h2>✏️ 任務一：試寫，再比較</h2><p class="note">原句本來就清楚自然。試寫借代句後，跟同學說說：哪種寫法更適合這個情境？為甚麼？</p>
    <p class="context">${REWRITE.context}</p>
    <p class="sentence small">原句：${REWRITE.original}</p>
    <label class="lbl" for="rw">試用義工的衣着特徵改寫：</label>
    <textarea id="rw" rows="2" maxlength="60" placeholder="例如：幾頂＿＿＿正在派發物資。">${esc(s.rwDraft ?? W.rewrite)}</textarea>
    <div class="row"><button class="btn primary" data-act="u6check">交給小探看看</button></div>
    ${s.msg}`;
  if (hasRewrite && s.checked) {
    body += `<h3>小探追問：${REWRITE.question}</h3>${optButtons(REWRITE.options, 'u6q', { state: W.rewriteQ === null ? s.qState : { [REWRITE.answer]: 'right' } })}`;
    if (W.rewriteQ !== null) body += feedback('good', REWRITE.explain);
  }
  body += `</article>`;
  body += `<article class="case-card write">
    <h2>🌟 任務二：創作我的借代句</h2>
    <div class="scene-pick" role="group" aria-label="選擇場景">${SCENES.map((x, i) => `<button class="scene-btn ${i === s.scene ? 'cur' : ''}" data-act="u6scene" data-i="${i}" aria-pressed="${i === s.scene}"><span>${x.icon}</span>${x.title}</button>`).join('')}</div>
    <p class="tip">💡 ${sc.tip}</p>
    <label class="lbl" for="mine">我的句子（可先寫前文）：</label>
    <textarea id="mine" rows="3" maxlength="120" placeholder="寫下你的借代句……">${esc(s.draft || '')}</textarea>
    <fieldset class="checklist"><legend>寫完後自我檢查</legend>${CHECKLIST.map((c, i) => `<label><input type="checkbox" data-check="${i}" ${s.checks.includes(i) ? 'checked' : ''}> ${c}</label>`).join('')}</fieldset>
    <div class="row"><button class="btn primary" data-act="u6save">📒 放進偵探筆記本</button><details class="sample"><summary>看參考例子</summary><p>${esc(sc.sample).replace(/\n/g, '<br>')}</p><p class="muted">不同寫法也可以，最重要是關係清楚、讀者明白。</p></details></div>
    ${s.saveMsg || ''}
    <p class="muted small">小探不會自動評分你的句子，請和老師或同學一起檢查。</p>
  </article>
  <article class="case-card notebook"><h2>📒 偵探筆記本</h2>${W.entries.length ? `<ul class="notes">${W.entries.map((e, i) => `<li><span class="ntag">${SCENES.find((x) => x.id === e.scene)?.icon || '📝'} ${SCENES.find((x) => x.id === e.scene)?.title || ''}</span><p>${esc(e.text).replace(/\n/g, '<br>')}</p><small>自我檢查 ${e.checks.length}/4</small><button class="link-btn" data-act="u6del" data-i="${i}" aria-label="刪除這句">刪除</button></li>`).join('')}</ul>` : '<p class="muted">還未有句子。寫好一句放進來吧！</p>'}
  </article>`;
  const ready = W.rewriteQ !== null && W.entries.length > 0;
  body += `<div class="row center">${unitDone('u6') ? '<a class="btn primary big" href="#report">看我的偵探報告 →</a>' : `<button class="btn primary big" data-act="u6done" ${ready ? '' : 'disabled'}>🎉 全部破案！${ready ? '' : '（先完成兩個任務）'}</button>`}</div>`;
  return shell('u6', coach('輪到你做作家了！寫得清楚，讀者才明白你借甚麼代甚麼。', 'happy') + body);
}
function u6Handle(act, i) {
  const s = ui.u6, W = S.writing;
  if (act === 'u6check') {
    const v = (document.getElementById('rw')?.value || '').trim();
    W.rewrite = v; save(); s.checked = !!v; s.qState = {};
    if (!v) s.msg = feedback('hint', '先寫一句再交給小探吧！');
    else { sound('good'); s.msg = feedback('saved', '已收下你的嘗試！這裏不自動判分。參考：' + REWRITE.sample + ' 請檢查你的詞是否真的代替義工，再比較原句和改寫句的效果；可請老師給意見。'); }
  } else if (act === 'u6q') {
    if (i === REWRITE.answer) { sound('good'); W.rewriteQ = i; save(); }
    else { sound('bad'); s.qState = { ...(s.qState || {}), [i]: 'wrong' }; }
  } else if (act === 'u6scene') { s.scene = i; s.saveMsg = ''; }
  else if (act === 'u6save') {
    const v = (document.getElementById('mine')?.value || '').trim();
    if (!v) { s.saveMsg = feedback('hint', '先寫下你的句子。'); return; }
    W.entries.push({ scene: SCENES[s.scene].id, text: v.slice(0, 120), checks: [...s.checks], at: Date.now() }); save();
    sound('good'); confetti(18);
    s.saveMsg = feedback('good', s.checks.length === 4 ? '已放進筆記本！四項自我檢查都完成了。' : `已放進筆記本！還有 ${4 - s.checks.length} 項自我檢查未剔，可以再改寫一次。`);
    s.checks = []; s.draft = '';
  } else if (act === 'u6del') { W.entries.splice(i, 1); save(); }
}

/* ---------- 報告 ---------- */
function report() {
  const st = stats(), r = rank();
  const per = Object.entries(SKILLS).map(([k, sk]) => {
    const qs = SCORED.filter((q) => q.skill === k);
    const done = qs.filter((q) => S.answers[q.id]?.done).length;
    const first = qs.filter((q) => S.answers[q.id]?.first && S.answers[q.id]?.done).length;
    return { k, ...sk, n: qs.length, done, first };
  });
  const weak = per.filter((p) => p.done > 0 && p.first / p.n < 0.75);
  const todo = per.filter((p) => p.done < p.n);
  main.innerHTML = `<section class="report">
    <div class="report-head">${mascot(st.first >= 18 ? 'proud' : 'happy', 120)}<div><p class="eyebrow">偵探報告</p><h1>${r.icon} ${r.name}</h1><p>完成 <b>${st.done}</b>/${st.total} 題 · 首次答對 <b>${st.first}</b> 題 · 訂正後完成 <b>${st.done - st.first}</b> 題</p></div></div>
    <div class="skill-bars">${per.map((p) => `<div class="sbar"><div class="slabel"><b>${p.label}</b><span>首次答對 ${p.first}／${p.n}　已完成 ${p.done}／${p.n}</span></div>
      <div class="track" role="img" aria-label="${p.label}：首次答對 ${p.first} 題，已完成 ${p.done} 題，共 ${p.n} 題"><i class="first" style="width:${(p.first / p.n) * 100}%"></i><i class="fixed" style="width:${((p.done - p.first) / p.n) * 100}%"></i></div></div>`).join('')}
      <p class="legend-s"><span class="sw first"></span>首次答對　<span class="sw fixed"></span>訂正後完成　<span class="sw"></span>未做</p></div>
    <div class="report-grid">
      <div class="card"><h2>✅ 已掌握</h2>${per.filter((p) => p.done === p.n && p.first / p.n >= 0.75).map((p) => `<p>✔ ${p.label}</p>`).join('') || '<p class="muted">完成更多案件後會顯示。</p>'}</div>
      <div class="card"><h2>🔁 建議再練</h2>${[...weak, ...todo.filter((t) => !weak.includes(t))].map((p) => `<p>• ${p.label}　<a href="#${p.unit}">前往 →</a></p>`).join('') || '<p class="muted">太好了，暫時沒有！</p>'}</div>
    </div>
    <h2>🎖️ 徽章</h2><div class="badges">${UNITS.map((u) => `<div class="badge ${unitDone(u.id) ? 'got' : ''}"><span>${unitDone(u.id) ? u.icon : '❔'}</span><small>${unitDone(u.id) ? u.badge : u.title}</small></div>`).join('')}</div>
    ${S.writing.entries.length ? `<h2>📒 我的借代句</h2><ul class="notes">${S.writing.entries.map((e) => `<li><p>${esc(e.text).replace(/\n/g, '<br>')}</p></li>`).join('')}</ul>` : ''}
    <div class="row center"><button class="btn" onclick="window.print()">🖨️ 列印報告</button><a class="btn" href="#worksheet">📄 工作紙</a><button class="btn danger-ghost" data-act="clear">清除本機進度</button></div>
  </section>`;
}

/* ---------- 工作紙 ---------- */
function worksheet() {
  main.innerHTML = `<section class="sheet">
    <div class="no-print row"><button class="btn primary" onclick="window.print()">🖨️ 列印工作紙及答案</button><a class="btn" href="#home">返回</a></div>
    <header class="sheet-head"><h1>借代小偵探 工作紙</h1><p>姓名：＿＿＿＿＿＿　班別：＿＿＿　學號：＿＿　日期：＿＿＿＿</p></header>
    <h2>一、找出借代詞、所指對象及關係</h2>
    <p class="muted">關係：甲 衣着／特徵代人物　乙 部分代整體　丙 材料代製成品　丁 作者代作品</p>
    <ol>${CASES.map((c) => `<li>${c.context ? `<small>${c.context}</small><br>` : ''}${splitTokens(c.tokens).join('')}<div class="blanks">借代詞：＿＿＿＿　代替：＿＿＿＿＿＿＿＿　關係：＿＿</div></li>`).join('')}</ol>
    <h2>二、這是借代、比喻、擬人還是普通描述？請圈出答案並寫理由。</h2>
    <ol>${JUDGES.map((j) => `<li>${j.sentence}<div class="blanks">（借代／比喻／擬人／普通描述）理由：＿＿＿＿＿＿＿＿＿＿＿＿＿＿</div></li>`).join('')}</ol>
    <h2>三、閱讀短文，找出借代並寫出證據</h2>
    ${PASSAGES.map((p) => `<div class="sheet-passage"><b>${p.title}</b><p>${p.sentences.map((s, i) => `<sup>${i + 1}</sup>${splitTokens(s).join('')}`).join('')}</p><div class="blanks">${p.targets.map(() => '借代詞：＿＿＿＿　代替：＿＿＿＿＿＿＿＿　證據：第＿＿句').join('<br>')}</div></div>`).join('')}
    <h2>四、寫作</h2>
    <p>1. ${REWRITE.context} 把「${REWRITE.original}」試改寫成借代句，並說說原句和改寫句各有甚麼效果：</p><div class="lines"></div>
    <p>2. 選一個場景（運動會／社區活動／校園生活），寫一句借代句，並先寫前文交代：</p><div class="lines"></div><div class="lines"></div>
    <section class="answers"><h1>答案頁</h1>
      <h2>一</h2><ol>${CASES.map((c) => `<li>${c.word} → ${c.targets[c.target]}；${RELATIONS[c.relation].label}</li>`).join('')}</ol>
      <h2>二</h2><ol>${JUDGES.map((j) => `<li>${JUDGE_LABELS[j.answer]}：${j.reasons[j.reason]}</li>`).join('')}</ol>
      <h2>三</h2><ul>${PASSAGES.flatMap((p) => p.targets.map((t) => `<li>${p.title}：${t.at[1]} → ${t.options[t.answer]}；證據第 ${t.clues.map((x) => x + 1).join('、')} 句；${RELATIONS[PASSAGE_REL[t.id]].label}</li>`)).join('')}</ul>
      <h2>四</h2><p>1. 參考：${REWRITE.sample}（須有前文交代）　2. 答案不一，由老師按四項準則判斷：${CHECKLIST.join('　')}</p>
    </section>
  </section>`;
}

/* ---------- 教師指引 ---------- */
function guide() {
  main.innerHTML = `<section class="guide card">
    <h1>👩‍🏫 老師使用說明</h1>
    <h2>建議課堂流程（35–40 分鐘）</h2>
    <ol>${UNITS.map((u) => `<li><a href="#${u.id}">${u.icon} ${u.title}</a>（約 ${u.minutes} 分鐘）：${u.sub}</li>`).join('')}</ol>
    <h2>投影時</h2>
    <ul><li>右上角「⚙️ 設定」開啟<b>老師模式</b>：顯示討論提示及「揭曉這一步答案」按鈕。</li><li>開啟<b>大字投影</b>放大全部文字。</li><li>上方案件列可直接跳到任何單元；每單元的圓點可直接選題。</li><li>鍵盤可按 1–4 選擇答案。</li></ul>
    <h2>學生自學時</h2>
    <ul><li>第一次答錯有針對性提示；答錯兩次可按「看解說」。</li><li>偵探報告分開顯示「首次答對」及「訂正後完成」。</li><li>自由造句不自動評分，由老師按四項準則判斷。</li></ul>
    <h2>私隱</h2><p>不用登入，不收集資料。進度及造句只存於這部裝置的瀏覽器，不會上傳；可在偵探報告頁清除。</p>
    <h2>教材定位與課程參考</h2><p>本網站是供小五選用的校本補充教材，並非教育局指定或審定教材；借代並非教育局列明的小五統一必教項目。教師可按學生程度安排，重點是理解、推論及清楚表達，毋須背熟分類。</p><p>參考：<a href="https://www.edb.gov.hk/attachment/tc/curriculum-development/kla/chi-edu/curriculum-documents/Pri_Chin_Lang_LO_2023.pdf" target="_blank" rel="noopener">《小學中國語文建議學習重點》（2023年修訂）</a>，印刷頁8（找出關鍵語句、推論）、10（合適修辭、推敲字詞）；<a href="https://www.edb.gov.hk/attachment/tc/curriculum-development/kla/chi-edu/curriculum-documents/Primary_Chi_Lang_Curr_Guide_2023.pdf" target="_blank" rel="noopener">《中國語文課程指引（小一至小六）》（2023）</a>。</p><h2>教學重點</h2><p>借代與擬人要比較所指，不可只看是否出現人的動作。「全校」「全班」可直接表示成員，本課不把這些用法設為單一答案的借代題。分類卡只作幫助解釋，不是完整分類表；原句和借代句各有用途。</p><p>內容修訂版保留舊筆記及未改題目的紀錄；替換的題目須重新作答，相關單元徽章須重新完成。</p><p>借代：不直接說出名稱，而用與它有密切關係的名稱代替。請引導學生按「用了甚麼詞 → 真正指誰 → 為甚麼可以代替」三步思考，並提醒同一個詞要按情境判斷；不宜用「有沒有『像』字」判斷比喻。</p>
  </section>`;
}

/* ---------- 路由 ---------- */
const VIEWS = { home, u1, u2, u3, u4, u5, u6, report, worksheet, guide };
function render() {
  const r = location.hash.slice(1) || 'home';
  const view = VIEWS[r] || home;
  const y = window.scrollY;
  const out = view();
  if (typeof out === 'string') main.innerHTML = out;
  if (r.startsWith('u')) { S.last = r; save(); }
  if (r === 'u1') bindLens();
  renderNav();
  document.getElementById('storage-note').textContent = storageOk ? '' : '此瀏覽器未能保存進度，關閉頁面後進度會消失。';
  return y;
}
let lastRoute = '';
function route() {
  const r = location.hash.slice(1) || 'home';
  document.querySelectorAll('.stamp-pop,.confetti').forEach((el) => el.remove());
  render();
  const cur = document.querySelector('#unit-nav [aria-current]');
  if (cur) { const nav = cur.parentElement; nav.scrollLeft = cur.offsetLeft - nav.clientWidth / 2 + cur.offsetWidth / 2; }
  if (r !== lastRoute) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
  lastRoute = r;
}
function rerender() {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}

main.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const act = b.dataset.act, i = Number(b.dataset.i), si = Number(b.dataset.s);
  if (act !== 'clear') sound('tap');
  if (act === 'u1q') {
    if (i === 1) { sound('good'); ui.u1.step = 1; ui.u1.msg = ''; }
    else { sound('bad'); ui.u1.state = { ...(ui.u1.state || {}), [i]: 'wrong' }; ui.u1.msg = feedback('bad', i === 0 ? '掛在衣架上的衣服會「詢問」嗎？再讀一次句子。' : '洗衣籃裏的衣服不會說話，句子說白袍在做甚麼？'); }
  } else if (act === 'u1all') { ui.u1.step = 2; sound('reveal'); }
  else if (act === 'u1done') { completeUnit('u1'); }
  else if (act === 'u2step') { ui.u2.step = i + 1; sound('reveal'); }
  else if (act === 'u2flip') { if (!ui.u2.flipped.includes(i)) ui.u2.flipped.push(i); }
  else if (act === 'u2done') completeUnit('u2');
  else if (act.startsWith('u3')) {
    if (act === 'u3go') { ui.u3.i = i; resetCase(); }
    else if (act === 'u3next') { ui.u3.i = Math.min(ui.u3.i + 1, CASES.length - 1); resetCase(); }
    else if (act === 'u3done') completeUnit('u3');
    else if (act === 'u3reveal') u3Reveal();
    else u3Handle(act, i);
  } else if (act.startsWith('u4')) {
    if (act === 'u4go') { ui.u4.i = i; resetJudge(); }
    else if (act === 'u4next') { ui.u4.i = Math.min(ui.u4.i + 1, JUDGES.length - 1); resetJudge(); }
    else if (act === 'u4done') completeUnit('u4');
    else if (act === 'u4reveal') u4Reveal();
    else u4Handle(act, i);
  } else if (act.startsWith('u5')) {
    if (act === 'u5go') { ui.u5.p = i; resetPassage(); }
    else if (act === 'u5nextp') { ui.u5.p = Math.min(ui.u5.p + 1, PASSAGES.length - 1); resetPassage(); }
    else if (act === 'u5cont') { const left = PASSAGES[ui.u5.p].targets.some((t) => !S.answers[t.id]?.done); Object.assign(ui.u5, { step: left ? 'find' : 'done', cur: null, wrong: 0, msg: '', optState: {}, clueWrong: {} }); }
    else if (act === 'u5done') completeUnit('u5');
    else if (act === 'u5reveal') u5Reveal();
    else u5Handle(act, i, si);
  } else if (act.startsWith('u6')) {
    if (act === 'u6done') completeUnit('u6');
    else u6Handle(act, i);
  } else if (act === 'showhow') {
    const r = location.hash.slice(1);
    if (r === 'u3') u3Reveal(); else if (r === 'u4') u4Reveal(); else if (r === 'u5') u5Reveal();
  } else if (act === 'clear') { document.getElementById('clear-dialog').showModal(); return; }
  rerender();
  const fb = main.querySelector('.fb, .solved-card');
  if (fb && act !== 'u3go' && act !== 'u4go' && act !== 'u5go') {
    const rect = fb.getBoundingClientRect();
    if (rect.bottom > innerHeight || rect.top < 0) fb.scrollIntoView({ block: 'nearest', behavior: S.prefs.calm ? 'auto' : 'smooth' });
  }
});
main.addEventListener('input', (e) => {
  if (e.target.id === 'mine') ui.u6.draft = e.target.value;
  if (e.target.id === 'rw') ui.u6.rwDraft = e.target.value;
});
main.addEventListener('change', (e) => {
  const c = e.target.closest('[data-check]');
  if (!c) return;
  const i = Number(c.dataset.check), arr = ui.u6.checks;
  if (c.checked) { if (!arr.includes(i)) arr.push(i); } else ui.u6.checks = arr.filter((x) => x !== i);
});

document.addEventListener('keydown', (e) => {
  if (e.target.closest('textarea, input, select') || e.ctrlKey || e.metaKey || e.altKey) return;
  const n = Number(e.key);
  if (n >= 1 && n <= 4) {
    const btns = [...main.querySelectorAll('.opts .opt:not(:disabled)')];
    const all = [...main.querySelectorAll('.opts .opt')];
    const target = all[n - 1];
    if (target && btns.includes(target)) { e.preventDefault(); target.click(); }
  }
});

function applyPrefs() {
  const p = S.prefs;
  document.documentElement.classList.toggle('large', p.large);
  document.documentElement.classList.toggle('calm', p.calm);
  document.documentElement.classList.toggle('teacher', p.teacher);
  setFx({ sound: p.sound, calm: p.calm });
  document.querySelectorAll('[data-pref]').forEach((el) => { el.checked = !!p[el.dataset.pref]; });
  document.getElementById('sound-btn').textContent = p.sound ? '🔊' : '🔇';
  document.getElementById('sound-btn').setAttribute('aria-label', p.sound ? '關閉聲效' : '開啟聲效');
}
document.querySelectorAll('[data-pref]').forEach((el) => el.addEventListener('change', () => { S.prefs[el.dataset.pref] = el.checked; save(); applyPrefs(); rerender(); }));
document.getElementById('sound-btn').addEventListener('click', () => { S.prefs.sound = !S.prefs.sound; save(); applyPrefs(); sound('tap'); });
document.getElementById('clear-dialog').addEventListener('close', (e) => {
  if (e.target.returnValue === 'clear') {
    const prefs = S.prefs; S = blank(); S.prefs = prefs; save();
    ui.u1 = { step: 0, msg: '' }; ui.u2 = { step: 0, flipped: [] }; ui.u3 = ui.u4 = ui.u5 = null; ui.u6 = { scene: 0, msg: '', checks: [] };
    route();
  }
});
document.getElementById('open-clear')?.addEventListener('click', () => document.getElementById('clear-dialog').showModal());

window.addEventListener('hashchange', route);
applyPrefs();
route();
