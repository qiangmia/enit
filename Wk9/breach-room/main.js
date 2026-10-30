import * as THREE from 'three';
import { createScene } from './scene.js';
import {
  TIMER_SECONDS,
  MAX_SCORE,
  LOG_TARGETS,
  LOG_LINES,
  CONTAIN_CARDS,
  REPORT_FRAGMENTS,
  QUIZ,
  POINTS,
} from './content.js';

const $ = (id) => document.getElementById(id);

const state = {
  started: false,
  score: 0,
  stageScores: { log: 0, contain: 0, order: 0, quiz: 0 },
  logFound: new Set(),
  logTime: TIMER_SECONDS,
  logTimerId: null,
  logTimedOut: false,
  containSelected: new Set(),
  containChecked: false,
  reportOrderDone: false,
  order: [],
  orderPool: [],
  quizAnswered: new Set(),
  quizCorrect: 0,
  reportFiled: false,
  station: null,
  soundOn: true,
  best: 0,
};

try {
  state.best = Number(localStorage.getItem('breach-room-best') || 0) || 0;
} catch (e) {
  state.best = 0;
}

const sceneApi = createScene($('scene'));
const hotspotsEl = $('hotspots');
const panels = {
  log: $('panel-log'),
  contain: $('panel-contain'),
  report: $('panel-report'),
};
const hotspotEls = {};
const stationMeta = {
  log: { label: 'Log Wall' },
  contain: { label: 'Contain' },
  report: { label: 'Report' },
};

for (const id of Object.keys(stationMeta)) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'hotspot';
  btn.dataset.station = id;
  btn.innerHTML = '<span class="hot-dot"></span><span>' + stationMeta[id].label + '</span>';
  btn.addEventListener('click', () => openStation(id));
  hotspotsEl.appendChild(btn);
  hotspotEls[id] = btn;
}

// ---------- helpers ----------
let toastTimer = null;
function toast(message, kind = '') {
  const el = $('toast');
  el.textContent = message;
  el.className = 'show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = '';
  }, 2800);
}

function logDone() {
  return state.logFound.size === LOG_TARGETS.length;
}

function updateScore() {
  $('score').textContent = Math.max(0, Math.round(state.score));
}

function updateTimerUI() {
  $('log-timer').textContent = Math.max(0, state.logTime);
  $('timer').textContent = Math.max(0, state.logTime);
  const danger = state.logTime <= 15 && state.logTime > 0;
  document.querySelector('.timer-big').classList.toggle('danger', danger);
  $('timer-stat').classList.toggle('danger', danger);
  $('timer-stat').hidden = state.station !== 'log';
}

function updateTargets() {
  const wrap = $('log-targets');
  if (!wrap.children.length) {
    for (const t of LOG_TARGETS) {
      const chip = document.createElement('span');
      chip.className = 'target';
      chip.dataset.target = t.id;
      chip.textContent = t.label;
      chip.title = t.hint;
      wrap.appendChild(chip);
    }
  }
  for (const chip of wrap.children) {
    chip.classList.toggle('found', state.logFound.has(chip.dataset.target));
  }
  $('log-note').textContent = state.logFound.size + ' of ' + LOG_TARGETS.length + ' found';
}

function updateObjective() {
  const obj = $('objective');
  if (!state.started) return;
  if (state.reportFiled) {
    obj.textContent = 'Shift complete. Review your report.';
  } else if (!logDone()) {
    obj.textContent = 'Investigate the log wall. Find the suspicious IP, the first burst, and the old admin account.';
  } else if (!state.containChecked) {
    obj.textContent = 'Contain the breach. Choose four response actions.';
  } else {
    obj.textContent = 'File the incident report. Put it in order, then answer three questions.';
  }
}

function updateHotspots() {
  const ld = logDone();
  const cd = state.containChecked;
  hotspotEls.log.classList.toggle('done', ld);
  hotspotEls.log.classList.toggle('urgent', !ld);
  hotspotEls.contain.classList.toggle('done', cd);
  hotspotEls.contain.classList.toggle('urgent', ld && !cd);
  hotspotEls.contain.classList.toggle('locked', !ld);
  hotspotEls.report.classList.toggle('done', state.reportFiled);
  hotspotEls.report.classList.toggle('urgent', cd && !state.reportFiled);
  hotspotEls.report.classList.toggle('locked', !cd);
}

function updateAll() {
  updateScore();
  updateObjective();
  updateTargets();
  updateHotspots();
  updateTimerUI();
}

// ---------- log station ----------
function renderLog() {
  const feed = $('log-feed');
  feed.innerHTML = '';
  LOG_LINES.forEach((line, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'log-line';
    btn.dataset.index = String(index);
    const t = document.createElement('span');
    t.className = 'lt';
    t.textContent = line.t;
    const lvl = document.createElement('span');
    lvl.className = 'll ' + line.lvl;
    lvl.textContent = line.lvl;
    const msg = document.createElement('span');
    msg.className = 'lm';
    msg.textContent = line.msg;
    btn.append(t, lvl, msg);
    btn.addEventListener('click', () => onLogClick(index, btn));
    feed.appendChild(btn);
  });
}

function onLogClick(index, btn) {
  if (!state.started || state.station !== 'log') return;
  if (logDone()) return;
  if (btn.classList.contains('found')) return;

  const lineText = LOG_LINES[index].t + ' ' + LOG_LINES[index].msg;
  const foundNow = [];
  for (const target of LOG_TARGETS) {
    if (!state.logFound.has(target.id) && target.test(lineText)) {
      state.logFound.add(target.id);
      foundNow.push(target);
    }
  }

  if (foundNow.length) {
    state.score += foundNow.length * POINTS.logTarget;
    state.stageScores.log += foundNow.length * POINTS.logTarget;
    btn.classList.add('found');
    updateAll();
    sfx('good');
    toast(
      'Found: ' + foundNow.map((t) => t.label).join(' + ') + '. +' + foundNow.length * POINTS.logTarget + ' points.',
      'good'
    );
    if (logDone()) completeLog();
  } else {
    state.score = Math.max(0, state.score + POINTS.logWrong);
    state.stageScores.log += POINTS.logWrong;
    state.logTime = Math.max(0, state.logTime - POINTS.logWrongTime);
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 350);
    updateAll();
    sfx('bad');
    toast('Not an indicator. −10 points, −5 seconds.', 'bad');
    if (state.logTime <= 0) logTimeout();
  }
}

function completeLog() {
  stopLogTimer();
  updateAll();
  sfx('good');
  toast('All three indicators found. The containment console is open.', 'good');
}

function logTimeout() {
  if (logDone()) return;
  stopLogTimer();
  state.logTimedOut = true;
  for (const target of LOG_TARGETS) state.logFound.add(target.id);
  const lines = document.querySelectorAll('.log-line');
  lines.forEach((btn) => {
    const line = LOG_LINES[Number(btn.dataset.index)];
    if (!line) return;
    const text = line.t + ' ' + line.msg;
    if (LOG_TARGETS.some((t) => t.test(text))) btn.classList.add('found');
  });
  updateAll();
  sfx('bad');
  toast('Time is up. The attacker got further — review the highlighted lines.', 'bad');
}

function startLogTimer() {
  if (state.logTimerId || logDone() || state.logTimedOut) return;
  state.logTimerId = setInterval(() => {
    state.logTime -= 1;
    updateTimerUI();
    if (state.logTime <= 0) {
      state.logTime = 0;
      stopLogTimer();
      logTimeout();
    }
  }, 1000);
}

function stopLogTimer() {
  if (state.logTimerId) {
    clearInterval(state.logTimerId);
    state.logTimerId = null;
  }
}

// ---------- contain station ----------
function renderContain() {
  const wrap = $('contain-cards');
  wrap.innerHTML = '';
  for (const card of CONTAIN_CARDS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-choice';
    btn.dataset.id = card.id;
    btn.textContent = card.text;
    if (state.containSelected.has(card.id)) btn.classList.add('selected');
    btn.addEventListener('click', () => toggleContain(card.id, btn));
    wrap.appendChild(btn);
  }
  updateContainUI();
}

function toggleContain(id, btn) {
  if (state.containChecked) return;
  if (state.containSelected.has(id)) {
    state.containSelected.delete(id);
    btn.classList.remove('selected');
  } else {
    if (state.containSelected.size >= 4) {
      toast('Choose exactly four actions. Deselect one first.', 'bad');
      return;
    }
    state.containSelected.add(id);
    btn.classList.add('selected');
  }
  sfx('click');
  updateContainUI();
}

function updateContainUI() {
  const n = state.containSelected.size;
  $('contain-note').textContent = n + ' of 4 selected';
  const deploy = $('contain-deploy');
  if (!state.containChecked) {
    deploy.disabled = n !== 4;
    deploy.textContent = 'Deploy response';
  }
}

function checkContain() {
  if (state.containChecked) return;
  state.containChecked = true;
  let correct = 0;
  let wrong = 0;
  for (const card of CONTAIN_CARDS) {
    const btn = document.querySelector('.card-choice[data-id="' + card.id + '"]');
    if (!btn) continue;
    btn.disabled = true;
    const selected = state.containSelected.has(card.id);
    const fb = document.createElement('span');
    fb.className = 'fb';
    if (card.correct) {
      btn.classList.add('correct');
      if (selected) {
        correct += 1;
        fb.textContent = card.feedback;
      } else {
        fb.textContent = 'Missed: this action was needed. ' + card.feedback;
      }
    } else if (selected) {
      wrong += 1;
      btn.classList.add('wrong');
      fb.textContent = card.feedback;
    }
    if (fb.textContent) btn.appendChild(fb);
  }
  state.score = Math.max(0, state.score + correct * POINTS.containCorrect + wrong * POINTS.containWrong);
  state.stageScores.contain = correct * POINTS.containCorrect + wrong * POINTS.containWrong;
  updateAll();
  sfx(correct === 4 ? 'good' : 'bad');
  const deploy = $('contain-deploy');
  deploy.textContent = 'Continue to report';
  deploy.disabled = false;
  if (correct === 4) {
    toast('Containment complete. ' + correct + ' of 4 correct.', 'good');
  } else {
    toast('Response deployed. ' + correct + ' of 4 correct — read the feedback.', 'bad');
  }
}

// ---------- report station ----------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderOrder() {
  const list = $('order-list');
  list.innerHTML = '';
  for (const frag of state.orderPool) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fragment';
    btn.dataset.frag = frag.id;
    btn.textContent = frag.text;
    btn.disabled = state.order.includes(frag.id);
    btn.addEventListener('click', () => pickFragment(frag.id));
    list.appendChild(btn);
  }
  renderChosen();
}

function pickFragment(id) {
  if (state.reportOrderDone || state.order.includes(id)) return;
  state.order.push(id);
  sfx('click');
  renderOrder();
}

function removeFragment(id) {
  if (state.reportOrderDone) return;
  state.order = state.order.filter((x) => x !== id);
  sfx('click');
  renderOrder();
}

function renderChosen() {
  const wrap = $('order-chosen');
  wrap.innerHTML = '';
  state.order.forEach((id, index) => {
    const frag = REPORT_FRAGMENTS.find((f) => f.id === id);
    if (!frag) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chosen-item';
    btn.textContent = index + 1 + '. ' + frag.text;
    btn.addEventListener('click', () => removeFragment(id));
    wrap.appendChild(btn);
  });
  $('order-note').textContent = state.order.length + ' of 4 placed';
  $('order-check').disabled = state.order.length !== 4;
}

function checkOrder() {
  if (state.reportOrderDone) return;
  const correct = [...REPORT_FRAGMENTS].sort((a, b) => a.order - b.order).map((f) => f.id);
  const isCorrect = state.order.length === 4 && state.order.every((id, i) => id === correct[i]);
  if (isCorrect) {
    state.reportOrderDone = true;
    state.score += POINTS.orderCorrect;
    state.stageScores.order += POINTS.orderCorrect;
    updateScore();
    sfx('good');
    toast('The report reads correctly. +200 points.', 'good');
    showQuizSection();
  } else {
    state.score = Math.max(0, state.score + POINTS.orderWrong);
    state.stageScores.order += POINTS.orderWrong;
    updateScore();
    sfx('bad');
    toast('Not in order yet. −50 points. Try again from the first sentence.', 'bad');
    state.order = [];
    renderOrder();
  }
}

function showQuizSection() {
  $('report-order').hidden = true;
  $('report-quiz').hidden = false;
  renderQuiz();
}

function renderQuiz() {
  const list = $('quiz-list');
  list.innerHTML = '';
  QUIZ.forEach((q, qi) => {
    const wrap = document.createElement('div');
    wrap.className = 'quiz-q';
    const h = document.createElement('h3');
    h.textContent = qi + 1 + '. ' + q.question;
    const opts = document.createElement('div');
    opts.className = 'quiz-opts';
    q.options.forEach((opt, oi) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-opt';
      btn.textContent = opt;
      btn.addEventListener('click', () => answerQuiz(qi, oi, opts, wrap));
      opts.appendChild(btn);
    });
    wrap.append(h, opts);
    list.appendChild(wrap);
  });
  updateQuizUI();
}

function answerQuiz(qi, oi, opts, wrap) {
  if (state.quizAnswered.has(qi)) return;
  state.quizAnswered.add(qi);
  const q = QUIZ[qi];
  const buttons = opts.querySelectorAll('.quiz-opt');
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer) b.classList.add('correct');
    else if (i === oi) b.classList.add('wrong');
  });
  const exp = document.createElement('p');
  exp.className = 'quiz-exp ' + (oi === q.answer ? 'correct' : 'wrong');
  exp.textContent = q.explanation;
  wrap.appendChild(exp);
  if (oi === q.answer) {
    state.quizCorrect += 1;
    state.score += POINTS.quizCorrect;
    state.stageScores.quiz += POINTS.quizCorrect;
    sfx('good');
  } else {
    sfx('bad');
  }
  updateScore();
  updateQuizUI();
}

function updateQuizUI() {
  const n = state.quizAnswered.size;
  $('quiz-note').textContent = n + ' of 3 answered';
  $('file-report').disabled = n !== QUIZ.length;
}

// ---------- station flow ----------
function openStation(id) {
  if (!state.started) return;
  if (id === 'contain' && !logDone()) {
    toast('Finish the log wall first — you need the indicators.', 'bad');
    return;
  }
  if (id === 'report' && !state.containChecked) {
    toast('Contain the breach first.', 'bad');
    return;
  }
  state.station = id;
  sceneApi.setStation(id);
  hotspotsEl.classList.add('hidden');
  for (const key of Object.keys(panels)) panels[key].hidden = key !== id;
  if (id === 'log') {
    updateTargets();
    updateTimerUI();
    startLogTimer();
  }
  if (id === 'contain') {
    renderContain();
  }
  if (id === 'report') {
    if (state.reportOrderDone) showQuizSection();
    else {
      $('report-order').hidden = false;
      $('report-quiz').hidden = true;
      renderOrder();
    }
  }
  sfx('click');
  updateObjective();
}

function closeStation() {
  if (!state.station) return;
  if (state.station === 'log') stopLogTimer();
  state.station = null;
  sceneApi.setStation('overview');
  for (const key of Object.keys(panels)) panels[key].hidden = true;
  hotspotsEl.classList.remove('hidden');
  updateAll();
}

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', closeStation);
});

$('contain-deploy').addEventListener('click', () => {
  if (!state.containChecked) {
    if (state.containSelected.size !== 4) {
      toast('Select four actions first.', 'bad');
      return;
    }
    checkContain();
  } else {
    closeStation();
    openStation('report');
  }
});

$('order-check').addEventListener('click', checkOrder);
$('file-report').addEventListener('click', () => {
  if (state.quizAnswered.size !== QUIZ.length) return;
  fileReport();
});

// ---------- debrief ----------
function fileReport() {
  state.reportFiled = true;
  const pct = state.score / MAX_SCORE;
  let rank = 'Trainee';
  if (pct >= 0.9) rank = 'SOC Lead';
  else if (pct >= 0.75) rank = 'Incident Responder';
  else if (pct >= 0.55) rank = 'Junior Analyst';

  $('rank').textContent = rank;
  $('final-score').textContent = Math.max(0, Math.round(state.score));
  const rows = [
    ['Log wall', state.stageScores.log, 300],
    ['Containment', state.stageScores.contain, 300],
    ['Report order', state.stageScores.order, 200],
    ['Questions', state.stageScores.quiz, 225],
  ];
  $('breakdown').innerHTML = rows
    .map(([label, got, max]) => {
      const sign = got >= 0 ? '+' : '';
      return '<div><span>' + label + '</span><b>' + sign + got + ' / ' + max + '</b></div>';
    })
    .join('');
  $('debrief-note').textContent =
    pct >= 0.75
      ? 'You found the door that was left open and closed it. The report is ready to file.'
      : 'The attacker got further than we would like. Replay and scan the log more carefully — the indicators are always there.';

  try {
    if (state.score > state.best) {
      state.best = Math.round(state.score);
      localStorage.setItem('breach-room-best', String(state.best));
    }
  } catch (e) {
    // localStorage may be unavailable; the game still works.
  }

  state.station = null;
  sceneApi.setStation('overview');
  sceneApi.setAlarm(false);
  $('hud').classList.add('hidden');
  hotspotsEl.classList.add('hidden');
  for (const key of Object.keys(panels)) panels[key].hidden = true;
  $('debrief').hidden = false;
  sfx('good');
}

// ---------- audio ----------
let audio = null;
function initAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = state.soundOn ? 0.16 : 0;
  master.connect(ctx.destination);

  const ambGain = ctx.createGain();
  ambGain.gain.value = 0.22;
  ambGain.connect(master);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 420;
  filter.connect(ambGain);

  const o1 = ctx.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = 55;
  const g1 = ctx.createGain();
  g1.gain.value = 0.5;
  o1.connect(g1).connect(filter);
  o1.start();

  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = 82.5;
  o2.detune.value = 6;
  const g2 = ctx.createGain();
  g2.gain.value = 0.28;
  o2.connect(g2).connect(filter);
  o2.start();

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.1;
  lfo.connect(lfoGain).connect(ambGain.gain);
  lfo.start();

  audio = { ctx, master };
}

function sfx(kind) {
  if (!audio || !state.soundOn) return;
  const ctx = audio.ctx;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(audio.master);
  if (kind === 'good') {
    o.type = 'sine';
    o.frequency.setValueAtTime(660, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.12);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.start(t);
    o.stop(t + 0.36);
  } else if (kind === 'bad') {
    o.type = 'triangle';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.18);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.start(t);
    o.stop(t + 0.31);
  } else {
    o.type = 'triangle';
    o.frequency.setValueAtTime(520, t);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.start(t);
    o.stop(t + 0.09);
  }
}

// ---------- intro / lifecycle ----------
function startGame(silent) {
  if (state.started) return;
  state.started = true;
  $('intro').hidden = true;
  $('hud').classList.remove('hidden');
  hotspotsEl.classList.remove('hidden');
  state.orderPool = shuffle(REPORT_FRAGMENTS);
  renderLog();
  renderTargetsIfNeeded();
  updateAll();
  if (!silent) initAudio();
  sfx('click');
}

function renderTargetsIfNeeded() {
  if ($('log-targets').children.length) return;
  updateTargets();
}

$('start').addEventListener('click', () => {
  startGame(false);
});
$('intro-help').addEventListener('click', () => {
  $('help').hidden = !$('help').hidden;
});
$('mute').addEventListener('click', () => {
  state.soundOn = !state.soundOn;
  if (audio) {
    audio.master.gain.setTargetAtTime(state.soundOn ? 0.16 : 0, audio.ctx.currentTime, 0.05);
  }
  $('mute').textContent = state.soundOn ? '🔊' : '🔇';
  $('mute').setAttribute('aria-label', state.soundOn ? 'Mute sound' : 'Unmute sound');
  $('mute').title = state.soundOn ? 'Mute sound' : 'Unmute sound';
});

if (state.best > 0) {
  document.querySelector('.intro-foot').textContent =
    'Self-study game · best score ' + state.best + '/' + MAX_SCORE + ' · nothing is sent anywhere.';
}

// ---------- render loop ----------
function positionHotspots() {
  if (!state.started) return;
  for (const id of Object.keys(hotspotEls)) {
    const p = sceneApi.project(id);
    const el = hotspotEls[id];
    if (!p || !p.visible) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      continue;
    }
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  sceneApi.update(dt, now / 1000);
  sceneApi.render();
  positionHotspots();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- QA and state deep links ----------
function finishQA(parts) {
  const qa = $('qa-report');
  qa.hidden = false;
  qa.textContent = 'QA:' + parts.join(' | ');
}

function runQA() {
  const out = [];
  try {
    if (LOG_TARGETS.length !== 3) return finishQA(['FAIL log targets']);
    if (!LOG_TARGETS.every((t) => LOG_LINES.some((l) => t.test(l.t + ' ' + l.msg)))) {
      return finishQA(['FAIL target match']);
    }
    if (CONTAIN_CARDS.filter((c) => c.correct).length !== 4) return finishQA(['FAIL contain count']);
    if (REPORT_FRAGMENTS.length !== 4) return finishQA(['FAIL fragments']);
    if (QUIZ.length !== 3) return finishQA(['FAIL quiz']);
    if (MAX_SCORE !== 1025) return finishQA(['FAIL max score']);

    startGame(true);
    openStation('log');
    const lines = [...document.querySelectorAll('.log-line')];
    for (const line of lines) {
      if (state.logFound.size === 3) break;
      const text = line.textContent;
      if (LOG_TARGETS.some((t) => !state.logFound.has(t.id) && t.test(text))) line.click();
    }
    if (state.logFound.size !== 3) return finishQA(['FAIL log completion']);
    closeStation();
    openStation('contain');
    for (const card of CONTAIN_CARDS.filter((c) => c.correct)) {
      const btn = document.querySelector('.card-choice[data-id="' + card.id + '"]');
      if (btn) btn.click();
    }
    $('contain-deploy').click();
    if (!state.containChecked) return finishQA(['FAIL contain check']);
    $('contain-deploy').click();
    if (state.station !== 'report') return finishQA(['FAIL report open']);

    const ordered = [...REPORT_FRAGMENTS].sort((a, b) => a.order - b.order);
    for (const frag of ordered) {
      const btn = document.querySelector('.fragment[data-frag="' + frag.id + '"]');
      if (btn) btn.click();
    }
    $('order-check').click();
    if (!state.reportOrderDone) return finishQA(['FAIL order check']);

    QUIZ.forEach((q, qi) => {
      const qEl = document.querySelectorAll('.quiz-q')[qi];
      if (!qEl) return;
      const opts = qEl.querySelectorAll('.quiz-opt');
      if (opts[q.answer]) opts[q.answer].click();
    });
    if (state.quizAnswered.size !== 3) return finishQA(['FAIL quiz answers']);
    $('file-report').click();
    if ($('debrief').hidden) return finishQA(['FAIL debrief']);
    if (Math.round(state.score) !== MAX_SCORE) return finishQA(['FAIL score ' + state.score]);
    out.push('PASS score=' + state.score);
  } catch (e) {
    out.push('EXCEPTION:' + (e && e.message ? e.message : e));
  }
  finishQA(out);
}

const params = new URLSearchParams(location.search);
const qaMode = params.get('qa') === '1';
const stateParam = params.get('state');
const skipIntro = params.get('skipintro') === '1';

if (qaMode) {
  setTimeout(runQA, 500);
} else if (stateParam) {
  startGame(true);
  if (stateParam === 'contain') {
    state.logFound = new Set(LOG_TARGETS.map((t) => t.id));
    updateAll();
    openStation('contain');
  } else if (stateParam === 'report') {
    state.logFound = new Set(LOG_TARGETS.map((t) => t.id));
    state.containChecked = true;
    updateAll();
    openStation('report');
  } else if (stateParam === 'quiz') {
    state.logFound = new Set(LOG_TARGETS.map((t) => t.id));
    state.containChecked = true;
    state.reportOrderDone = true;
    updateAll();
    openStation('report');
    showQuizSection();
  } else if (stateParam === 'debrief') {
    state.logFound = new Set(LOG_TARGETS.map((t) => t.id));
    state.containChecked = true;
    state.reportOrderDone = true;
    state.quizAnswered = new Set([0, 1, 2]);
    state.quizCorrect = 3;
    state.score = MAX_SCORE;
    state.stageScores = { log: 300, contain: 300, order: 200, quiz: 225 };
    updateAll();
    fileReport();
  } else {
    openStation('log');
  }
} else if (skipIntro) {
  startGame(true);
}
