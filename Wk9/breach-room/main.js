import * as THREE from 'three';
import { createScene } from './scene.js';
import {
  TIMER_SECONDS,
  MAX_SCORE,
  LOG_TARGETS,
  LOG_LINES,
  CONTAIN_CARDS,
  REPORT_FRAGMENTS,
  LEVEL_QUESTIONS,
  POINTS,
} from './content.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js';

const SB_READY = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('YOUR_PROJECT') &&
    !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY')
);

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
  containQuizShown: false,
  reportOrderDone: false,
  order: [],
  orderPool: [],
  questions: { log: [], contain: [], report: [] },
  questionsSource: 'local',
  quizAnswered: { log: new Set(), contain: new Set(), report: new Set() },
  quizResults: { log: [], contain: [], report: [] },
  reportFiled: false,
  station: null,
  soundOn: true,
  best: 0,
  group: null,
  playerName: '',
  groupLocked: false,
  startedAt: 0,
  durationSeconds: 0,
  attemptId: '',
  submitted: false,
  submitting: false,
  boardTab: 'all',
  boardSummary: null,
  boardRows: [],
  boardOpen: false,
};

try {
  state.best = Number(localStorage.getItem('breach-room-best') || 0) || 0;
} catch (e) {
  state.best = 0;
}

try {
  const savedGroup = localStorage.getItem('breach-room-group');
  if (savedGroup === 'A' || savedGroup === 'B') state.group = savedGroup;
  state.playerName = localStorage.getItem('breach-room-name') || '';
} catch (e) {
  state.group = null;
  state.playerName = '';
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

// ---------- Supabase REST helpers ----------
async function sb(path, options = {}) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Supabase ' + res.status + ': ' + text.slice(0, 200));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function fmtTime(sec) {
  if (sec === null || sec === undefined || Number.isNaN(Number(sec))) return '—';
  const total = Math.max(0, Math.round(Number(sec)));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + String(s).padStart(2, '0');
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (e) {
    return '';
  }
}

function getPlayerName() {
  const input = $('player-name');
  const raw = (input ? input.value : state.playerName || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24);
  return raw || 'Anonymous';
}

function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------- question bank ----------
const LEVEL_SLOTS = { log: 3, contain: 3, report: 5 };

function normalizeQuestion(row, level) {
  const options = Array.isArray(row.options) ? row.options.filter((x) => typeof x === 'string') : null;
  if (!options || options.length < 2) return null;
  const answer = Number(row.answer_index);
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
  const prompt = String(row.prompt || row.question || '').trim();
  if (!prompt) return null;
  return {
    key: row.id || row.key || level + '-' + Math.random().toString(36).slice(2),
    level,
    prompt,
    options: options.slice(),
    answer,
    explanation: String(row.explanation || '').trim(),
  };
}

function shuffleOptions(q) {
  const items = q.options.map((text, index) => ({ text, index }));
  shuffle(items);
  return {
    ...q,
    options: items.map((x) => x.text),
    answer: items.findIndex((x) => x.index === q.answer),
  };
}

function buildQuestionSets(pool) {
  const sets = { log: [], contain: [], report: [] };
  const hasPool = Array.isArray(pool) && pool.length > 0;
  for (const level of ['log', 'contain', 'report']) {
    const slots = LEVEL_SLOTS[level];
    const valid = [];
    if (hasPool) {
      for (const row of pool) {
        if (row && row.level === level) {
          const q = normalizeQuestion(row, level);
          if (q) valid.push(q);
        }
      }
    }
    shuffle(valid);
    const picked = valid.slice(0, slots);
    if (picked.length < slots) {
      const locals = (LEVEL_QUESTIONS[level] || [])
        .map((q) => normalizeQuestion(q, level))
        .filter(Boolean);
      shuffle(locals);
      for (const q of locals) {
        if (picked.length >= slots) break;
        if (!picked.some((p) => p.prompt === q.prompt)) picked.push(q);
      }
    }
    sets[level] = picked.map(shuffleOptions);
  }
  state.questions = sets;
  state.questionsSource = hasPool ? 'supabase' : 'local';
  state.quizAnswered = { log: new Set(), contain: new Set(), report: new Set() };
  state.quizResults = { log: [], contain: [], report: [] };
}

let questionsPromise = null;
function ensureQuestions() {
  if (questionsPromise) return questionsPromise;
  questionsPromise = (async () => {
    let pool = null;
    if (SB_READY) {
      try {
        pool = await sb(
          'breach_room_questions?select=id,level,prompt,options,answer_index,explanation&active=eq.true&order=sort_order.asc'
        );
      } catch (e) {
        pool = null;
      }
    }
    buildQuestionSets(pool);
    return state.questions;
  })();
  return questionsPromise;
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

function logQuizDone() {
  return state.questions.log.length > 0 && state.quizAnswered.log.size === state.questions.log.length;
}

function logLevelDone() {
  return logDone() && logQuizDone();
}

function containQuizDone() {
  return (
    state.questions.contain.length > 0 &&
    state.quizAnswered.contain.size === state.questions.contain.length
  );
}

function containLevelDone() {
  return state.containChecked && containQuizDone();
}

function reportQuizDone() {
  return (
    state.questions.report.length > 0 &&
    state.quizAnswered.report.size === state.questions.report.length
  );
}

function updateScore() {
  $('score').textContent = Math.max(0, Math.round(state.score));
}

function updateTimerUI() {
  $('log-timer').textContent = Math.max(0, state.logTime);
  $('timer').textContent = Math.max(0, state.logTime);
  const danger = state.logTime <= 15 && state.logTime > 0;
  const timerBig = document.querySelector('.timer-big');
  if (timerBig) {
    timerBig.classList.toggle('danger', danger);
    timerBig.hidden = logDone();
  }
  $('timer-stat').classList.toggle('danger', danger);
  $('timer-stat').hidden = state.station !== 'log' || logDone();
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
  if ($('log-quiz').hidden) {
    $('log-note').textContent = state.logFound.size + ' of ' + LOG_TARGETS.length + ' found';
  } else {
    $('log-note').textContent =
      state.quizAnswered.log.size + ' of ' + state.questions.log.length + ' answered';
  }
}

function updateObjective() {
  const obj = $('objective');
  if (!state.started) return;
  if (state.reportFiled) {
    obj.textContent = 'Shift complete. Review your report.';
  } else if (!logDone()) {
    obj.textContent = 'Investigate the log wall. Find the suspicious IP, the first burst, and the old admin account.';
  } else if (!logQuizDone()) {
    obj.textContent = 'Knowledge check: log wall. Answer three questions to unlock containment.';
  } else if (!state.containChecked) {
    obj.textContent = 'Contain the breach. Choose four response actions.';
  } else if (!containQuizDone()) {
    obj.textContent = 'Knowledge check: containment. Answer three questions to unlock the report.';
  } else {
    obj.textContent = 'File the incident report. Put it in order, then answer five questions.';
  }
}

function updateHotspots() {
  const ld = logLevelDone();
  const cd = containLevelDone();
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

// ---------- group and leaderboard ----------
function updateGroupUI() {
  document.querySelectorAll('.seg-btn').forEach((btn) => {
    const on = btn.dataset.group === state.group;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  const start = $('start');
  if (start) start.disabled = !state.group || state.started;
  const hint = $('group-hint');
  if (hint) {
    hint.textContent = state.group
      ? 'Group ' + state.group + ' selected · columns ' + (state.group === 'A' ? '1–5' : '6–10') + '.'
      : 'Choose your group to start.';
  }
}

function setGroup(group, persist = true) {
  if (state.groupLocked) return;
  if (group !== 'A' && group !== 'B') return;
  state.group = group;
  if (persist) {
    try {
      localStorage.setItem('breach-room-group', group);
    } catch (e) {
      // ignore storage failures
    }
  }
  updateGroupUI();
  if (state.boardOpen) {
    state.boardTab = group;
    updateBoardTabs();
    loadBoardRows();
  }
}

function openBoard() {
  if (!SB_READY) {
    toast('The leaderboard is not configured.', 'bad');
    return;
  }
  state.boardOpen = true;
  state.boardTab = state.group || 'all';
  updateBoardTabs();
  $('panel-board').hidden = false;
  loadBoard();
}

function closeBoard() {
  state.boardOpen = false;
  $('panel-board').hidden = true;
}

function updateBoardTabs() {
  document.querySelectorAll('.board-tab').forEach((tab) => {
    const on = tab.dataset.tab === state.boardTab;
    tab.classList.toggle('active', on);
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

async function loadBoard() {
  if (!SB_READY || !state.boardOpen) return;
  $('board-list').innerHTML = '<div class="board-empty">Loading…</div>';
  try {
    const summary = await sb(
      'breach_room_group_summary?select=group_label,runs,total_score,best_score,avg_score,best_time_seconds'
    );
    state.boardSummary = summary || [];
    renderBoardSummary();
    await loadBoardRows();
  } catch (e) {
    $('board-summary').innerHTML = '';
    $('board-list').innerHTML =
      '<div class="board-empty">Could not load the leaderboard. Check your connection and refresh.</div>';
    $('board-note').textContent = 'Offline';
  }
}

async function loadBoardRows() {
  if (!SB_READY || !state.boardOpen) return;
  $('board-list').innerHTML = '<div class="board-empty">Loading…</div>';
  let path =
    'breach_room_leaderboard?select=attempt_id,display_name,group_label,score,rank,log_score,contain_score,order_score,quiz_score,duration_seconds,created_at&order=score.desc,created_at.asc&limit=10';
  if (state.boardTab === 'A' || state.boardTab === 'B') {
    path += '&group_label=eq.' + state.boardTab;
  }
  try {
    const rows = await sb(path);
    state.boardRows = rows || [];
    renderBoardRows();
  } catch (e) {
    $('board-list').innerHTML =
      '<div class="board-empty">Could not load scores. Refresh to try again.</div>';
  }
}

function renderBoardSummary() {
  const wrap = $('board-summary');
  wrap.innerHTML = '';
  for (const group of ['A', 'B']) {
    const info = (state.boardSummary || []).find((row) => row.group_label === group);
    const card = document.createElement('div');
    card.className = 'group-card' + (info ? '' : ' empty');
    const badge = document.createElement('span');
    badge.className = 'group-badge' + (group === 'B' ? ' b' : '');
    badge.textContent = group;
    const text = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'g-name';
    name.textContent = 'GROUP ' + group + ' · ' + (group === 'A' ? 'COLUMNS 1–5' : 'COLUMNS 6–10');
    const total = document.createElement('div');
    total.className = 'g-total';
    const totalLabel = document.createElement('small');
    totalLabel.textContent = 'TOTAL';
    total.append(totalLabel, document.createTextNode(info ? Number(info.total_score || 0).toLocaleString() : '—'));
    const line = document.createElement('div');
    line.className = 'g-line';
    line.textContent = info
      ? 'best ' +
        info.best_score +
        ' · avg ' +
        info.avg_score +
        ' · ' +
        info.runs +
        ' runs · best ' +
        fmtTime(info.best_time_seconds)
      : 'No runs yet.';
    text.append(name, total, line);
    card.append(badge, text);
    wrap.appendChild(card);
  }
}

function renderBoardRows() {
  const list = $('board-list');
  list.innerHTML = '';
  if (!state.boardRows.length) {
    const empty = document.createElement('div');
    empty.className = 'board-empty';
    empty.textContent =
      state.boardTab === 'all'
        ? 'No scores yet. Be the first.'
        : 'No scores in Group ' + state.boardTab + ' yet.';
    list.appendChild(empty);
    $('board-note').textContent = 'Top 10';
    return;
  }
  state.boardRows.forEach((row, index) => {
    const entry = document.createElement('div');
    entry.className = 'board-entry' + (row.attempt_id === state.attemptId ? ' mine' : '');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'board-row';

    const rank = document.createElement('span');
    rank.className = 'r-rank';
    rank.textContent = String(index + 1);
    const group = document.createElement('span');
    group.className = 'board-group-badge' + (row.group_label === 'B' ? ' b' : '');
    group.textContent = row.group_label || '?';
    const name = document.createElement('span');
    name.className = 'r-name';
    name.textContent = row.display_name || 'Anonymous';
    const score = document.createElement('span');
    score.className = 'r-score';
    score.textContent = String(row.score);
    const time = document.createElement('span');
    time.className = 'r-time';
    time.textContent = fmtTime(row.duration_seconds);
    const chev = document.createElement('span');
    chev.className = 'chev';
    chev.textContent = '▸';

    btn.append(rank, group, name, score, time, chev);

    const detail = document.createElement('div');
    detail.className = 'board-detail';
    detail.hidden = true;
    const line = document.createElement('div');
    line.className = 'd-line';
    line.textContent =
      'Log ' +
      row.log_score +
      ' · Contain ' +
      row.contain_score +
      ' · Report ' +
      row.order_score +
      ' · Questions ' +
      row.quiz_score;
    const sub = document.createElement('div');
    sub.className = 'd-sub';
    sub.textContent =
      (row.rank || '') + ' · ' + fmtTime(row.duration_seconds) + ' · ' + formatDate(row.created_at);
    detail.append(line, sub);

    btn.addEventListener('click', () => {
      const open = !detail.hidden;
      detail.hidden = open;
      entry.classList.toggle('open', !open);
    });

    entry.append(btn, detail);
    list.appendChild(entry);
  });
  $('board-note').textContent =
    'Top 10 · ' + (state.boardTab === 'all' ? 'all groups' : 'Group ' + state.boardTab);
}

// ---------- level knowledge checks ----------
function renderLevelQuiz(level, listId) {
  const list = $(listId);
  if (!list) return;
  list.innerHTML = '';
  const questions = state.questions[level] || [];
  questions.forEach((q, qi) => {
    const wrap = document.createElement('div');
    wrap.className = 'quiz-q';
    const h = document.createElement('h3');
    h.textContent = qi + 1 + '. ' + q.prompt;
    const opts = document.createElement('div');
    opts.className = 'quiz-opts';
    q.options.forEach((opt, oi) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-opt';
      btn.textContent = opt;
      btn.addEventListener('click', () => answerLevelQuestion(level, qi, oi, opts, wrap));
      opts.appendChild(btn);
    });
    wrap.append(h, opts);
    list.appendChild(wrap);
    applyAnsweredState(level, qi, opts, wrap);
  });
}

function applyAnsweredState(level, qi, opts, wrap) {
  if (!state.quizAnswered[level].has(qi)) return;
  const chosen = state.quizResults[level][qi];
  const q = state.questions[level][qi];
  if (!q) return;
  const buttons = opts.querySelectorAll('.quiz-opt');
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    else if (i === chosen) btn.classList.add('wrong');
  });
  const exp = document.createElement('p');
  exp.className = 'quiz-exp ' + (chosen === q.answer ? 'correct' : 'wrong');
  exp.textContent = q.explanation;
  wrap.appendChild(exp);
}

function answerLevelQuestion(level, qi, oi, opts, wrap) {
  if (state.quizAnswered[level].has(qi)) return;
  const q = state.questions[level][qi];
  if (!q) return;
  state.quizAnswered[level].add(qi);
  state.quizResults[level][qi] = oi;
  const correct = oi === q.answer;
  if (correct) {
    const points =
      level === 'log'
        ? POINTS.logQuestion
        : level === 'contain'
        ? POINTS.containQuestion
        : POINTS.quizCorrect;
    state.score += points;
    if (level === 'report') state.stageScores.quiz += points;
    else state.stageScores[level] += points;
  }
  const buttons = opts.querySelectorAll('.quiz-opt');
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    else if (i === oi) btn.classList.add('wrong');
  });
  const exp = document.createElement('p');
  exp.className = 'quiz-exp ' + (correct ? 'correct' : 'wrong');
  exp.textContent = q.explanation;
  wrap.appendChild(exp);
  updateScore();
  updateLevelQuizNote(level);
  sfx(correct ? 'good' : 'bad');
  if (levelQuizDone(level)) onLevelQuizComplete(level);
}

function levelQuizDone(level) {
  if (level === 'log') return logQuizDone();
  if (level === 'contain') return containQuizDone();
  return reportQuizDone();
}

function updateLevelQuizNote(level) {
  const total = (state.questions[level] || []).length;
  const answered = state.quizAnswered[level].size;
  if (level === 'log') {
    $('log-note').textContent = answered + ' of ' + total + ' answered';
  } else if (level === 'contain') {
    $('contain-note').textContent = answered + ' of ' + total + ' answered';
    const deploy = $('contain-deploy');
    if (state.containQuizShown) {
      deploy.disabled = !containQuizDone();
      deploy.textContent = 'Continue to report';
    }
  } else {
    $('quiz-note').textContent = answered + ' of ' + total + ' answered';
    $('file-report').disabled = !reportQuizDone();
  }
}

function onLevelQuizComplete(level) {
  if (level === 'log') {
    toast('Log check complete. Containment is unlocked.', 'good');
  } else if (level === 'contain') {
    toast('Containment check complete. The report is unlocked.', 'good');
  } else {
    toast('Report check complete. File the report when ready.', 'good');
  }
  updateObjective();
  updateHotspots();
  updateLevelQuizNote(level);
}

function showLogQuiz() {
  const h = document.querySelector('#panel-log h2');
  const p = document.querySelector('#panel-log .panel-help');
  if (h) h.textContent = 'Log wall check';
  if (p) p.textContent = 'Answer the three questions. Feedback appears immediately.';
  $('log-feed').hidden = true;
  $('log-quiz').hidden = false;
  renderLevelQuiz('log', 'log-quiz-list');
  updateLevelQuizNote('log');
}

function showContainQuiz() {
  const h = document.querySelector('#panel-contain h2');
  const p = document.querySelector('#panel-contain .panel-help');
  if (h) h.textContent = 'Containment check';
  if (p) p.textContent = 'Answer the three questions about containment. Feedback appears immediately.';
  state.containQuizShown = true;
  $('contain-cards').hidden = true;
  $('contain-quiz').hidden = false;
  renderLevelQuiz('contain', 'contain-quiz-list');
  updateLevelQuizNote('contain');
}

function markAllQuestionsAnswered(level) {
  const qs = state.questions[level] || [];
  state.quizAnswered[level] = new Set(qs.map((_, index) => index));
  state.quizResults[level] = qs.map((q) => q.answer);
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
  showLogQuiz();
  sfx('good');
  toast('All three indicators found. One knowledge check, then containment.', 'good');
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
  const deploy = $('contain-deploy');
  if (!state.containChecked) {
    $('contain-note').textContent = n + ' of 4 selected';
    deploy.disabled = n !== 4;
    deploy.textContent = 'Deploy response';
  } else if (!state.containQuizShown) {
    $('contain-note').textContent = 'Response deployed';
    deploy.disabled = false;
    deploy.textContent = 'Start knowledge check';
  } else {
    $('contain-note').textContent =
      state.quizAnswered.contain.size + ' of ' + state.questions.contain.length + ' answered';
    deploy.disabled = !containQuizDone();
    deploy.textContent = 'Continue to report';
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
  updateContainUI();
  if (correct === 4) {
    toast('Containment complete. ' + correct + ' of 4 correct — start the knowledge check.', 'good');
  } else {
    toast('Response deployed. ' + correct + ' of 4 correct — read the feedback, then start the knowledge check.', 'bad');
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
  renderLevelQuiz('report', 'quiz-list');
  updateLevelQuizNote('report');
}

// ---------- station flow ----------
function openStation(id) {
  if (!state.started) return;
  if (id === 'contain' && !logLevelDone()) {
    toast('Finish the log wall and its knowledge check first.', 'bad');
    return;
  }
  if (id === 'report' && !containLevelDone()) {
    toast('Contain the breach and finish the containment check first.', 'bad');
    return;
  }
  state.station = id;
  sceneApi.setStation(id);
  hotspotsEl.classList.add('hidden');
  for (const key of Object.keys(panels)) panels[key].hidden = key !== id;
  if (id === 'log') {
    updateTargets();
    updateTimerUI();
    if (logDone()) {
      showLogQuiz();
    } else {
      $('log-feed').hidden = false;
      $('log-quiz').hidden = true;
      startLogTimer();
    }
  }
  if (id === 'contain') {
    if (state.containChecked && state.containQuizShown) {
      showContainQuiz();
    } else {
      $('contain-cards').hidden = false;
      $('contain-quiz').hidden = true;
      renderContain();
    }
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
  btn.addEventListener('click', () => {
    const target = btn.dataset.close;
    if (target === 'board') closeBoard();
    else if (state.station === target) closeStation();
  });
});

$('contain-deploy').addEventListener('click', () => {
  if (!state.containChecked) {
    if (state.containSelected.size !== 4) {
      toast('Select four actions first.', 'bad');
      return;
    }
    checkContain();
  } else if (!state.containQuizShown) {
    showContainQuiz();
  } else if (containQuizDone()) {
    closeStation();
    openStation('report');
  } else {
    toast('Answer the containment knowledge check first.', 'bad');
  }
});

$('order-check').addEventListener('click', checkOrder);
$('file-report').addEventListener('click', () => {
  if (!reportQuizDone()) return;
  fileReport();
});

// ---------- debrief ----------
function fileReport() {
  state.reportFiled = true;
  state.durationSeconds = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
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
  $('breakdown').innerHTML =
    rows
      .map(([label, got, max]) => {
        const sign = got >= 0 ? '+' : '';
        return '<div><span>' + label + '</span><b>' + sign + got + ' / ' + max + '</b></div>';
      })
      .join('') +
    '<div><span>Completion time</span><b>' +
    fmtTime(state.durationSeconds) +
    '</b></div>';
  $('debrief-note').textContent =
    pct >= 0.75
      ? 'You found the door that was left open and closed it. The report is ready to file.'
      : 'The attacker got further than we would like. Replay and scan the log more carefully — the indicators are always there.';

  if (SB_READY) {
    $('submit-row').hidden = false;
    $('submit-status').textContent =
      'Ready to submit as ' + getPlayerName() + ' · Group ' + state.group + '.';
    $('submit-score').disabled = false;
    $('submit-score').textContent = 'Submit to leaderboard';
  } else {
    $('submit-row').hidden = true;
  }

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

async function submitScore() {
  if (!SB_READY || state.submitting || state.submitted) return;
  if (!state.group) {
    toast('Choose your group first.', 'bad');
    return;
  }
  state.submitting = true;
  const submitBtn = $('submit-score');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';
  const name = getPlayerName();
  const row = {
    attempt_id: state.attemptId,
    display_name: name,
    group_label: state.group,
    score: Math.max(0, Math.round(state.score)),
    rank: $('rank').textContent,
    log_score: state.stageScores.log,
    contain_score: state.stageScores.contain,
    order_score: state.stageScores.order,
    quiz_score: state.stageScores.quiz,
    duration_seconds: state.durationSeconds,
    game_version: '1.1',
  };
  try {
    await sb('breach_room_scores', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    state.submitted = true;
    $('submit-status').textContent = 'Submitted as ' + name + ' · Group ' + state.group + '.';
    submitBtn.textContent = 'Submitted';
    submitBtn.disabled = true;
    toast('Score submitted to the class leaderboard.', 'good');
  } catch (e) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Try again';
    $('submit-status').textContent = 'Could not submit. Check your connection and try again.';
    toast('Submission failed. Your score is still saved locally.', 'bad');
  } finally {
    state.submitting = false;
  }
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
  if (!state.group) {
    if (silent) {
      state.group = 'A';
      updateGroupUI();
    } else {
      toast('Choose your group first.', 'bad');
      return;
    }
  }
  state.started = true;
  state.groupLocked = true;
  document.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.disabled = true;
  });
  state.playerName = getPlayerName();
  state.attemptId = uuid();
  state.startedAt = Date.now();
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

// ---------- identity and leaderboard wiring ----------
const nameInput = $('player-name');
if (nameInput) {
  nameInput.value = state.playerName;
  nameInput.addEventListener('input', () => {
    state.playerName = nameInput.value.slice(0, 24);
    try {
      localStorage.setItem('breach-room-name', state.playerName);
    } catch (e) {
      // ignore storage failures
    }
  });
}
document.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => setGroup(btn.dataset.group));
});
updateGroupUI();

if (!SB_READY) {
  $('intro-board').hidden = true;
  $('submit-row').hidden = true;
} else {
  $('intro-board').addEventListener('click', openBoard);
  $('view-board').addEventListener('click', openBoard);
  $('submit-score').addEventListener('click', submitScore);
  $('board-refresh').addEventListener('click', loadBoard);
  document.querySelectorAll('.board-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.boardTab = tab.dataset.tab;
      updateBoardTabs();
      loadBoardRows();
    });
  });
}

$('start').addEventListener('click', async () => {
  const btn = $('start');
  if (btn.dataset.loading === '1') return;
  btn.dataset.loading = '1';
  btn.disabled = true;
  btn.textContent = 'Loading…';
  await ensureQuestions();
  btn.textContent = 'Start shift';
  btn.dataset.loading = '0';
  updateGroupUI();
  if (state.group) startGame(false);
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
    'Best score ' + state.best + '/' + MAX_SCORE + ' · scores stay in this browser unless you submit them.';
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

async function runQA() {
  const out = [];
  try {
    await ensureQuestions();
    if (LOG_TARGETS.length !== 3) return finishQA(['FAIL log targets']);
    if (!LOG_TARGETS.every((t) => LOG_LINES.some((l) => t.test(l.t + ' ' + l.msg)))) {
      return finishQA(['FAIL target match']);
    }
    if (CONTAIN_CARDS.filter((c) => c.correct).length !== 4) return finishQA(['FAIL contain count']);
    if (REPORT_FRAGMENTS.length !== 4) return finishQA(['FAIL fragments']);
    if (state.questions.log.length !== 3) return finishQA(['FAIL log questions']);
    if (state.questions.contain.length !== 3) return finishQA(['FAIL contain questions']);
    if (state.questions.report.length !== 5) return finishQA(['FAIL report questions']);
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

    state.questions.log.forEach((q, qi) => {
      const qEl = document.querySelectorAll('#log-quiz .quiz-q')[qi];
      if (!qEl) return;
      const opts = qEl.querySelectorAll('.quiz-opt');
      if (opts[q.answer]) opts[q.answer].click();
    });
    if (!logQuizDone()) return finishQA(['FAIL log quiz']);

    closeStation();
    openStation('contain');
    for (const card of CONTAIN_CARDS.filter((c) => c.correct)) {
      const btn = document.querySelector('.card-choice[data-id="' + card.id + '"]');
      if (btn) btn.click();
    }
    $('contain-deploy').click();
    if (!state.containChecked) return finishQA(['FAIL contain check']);
    $('contain-deploy').click();
    if (!state.containQuizShown) return finishQA(['FAIL contain quiz shown']);

    state.questions.contain.forEach((q, qi) => {
      const qEl = document.querySelectorAll('#contain-quiz .quiz-q')[qi];
      if (!qEl) return;
      const opts = qEl.querySelectorAll('.quiz-opt');
      if (opts[q.answer]) opts[q.answer].click();
    });
    if (!containQuizDone()) return finishQA(['FAIL contain quiz']);

    $('contain-deploy').click();
    if (state.station !== 'report') return finishQA(['FAIL report open']);

    const ordered = [...REPORT_FRAGMENTS].sort((a, b) => a.order - b.order);
    for (const frag of ordered) {
      const btn = document.querySelector('.fragment[data-frag="' + frag.id + '"]');
      if (btn) btn.click();
    }
    $('order-check').click();
    if (!state.reportOrderDone) return finishQA(['FAIL order check']);

    state.questions.report.forEach((q, qi) => {
      const qEl = document.querySelectorAll('#quiz-list .quiz-q')[qi];
      if (!qEl) return;
      const opts = qEl.querySelectorAll('.quiz-opt');
      if (opts[q.answer]) opts[q.answer].click();
    });
    if (!reportQuizDone()) return finishQA(['FAIL report quiz']);
    $('file-report').click();
    if ($('debrief').hidden) return finishQA(['FAIL debrief']);
    if (Math.round(state.score) !== MAX_SCORE) return finishQA(['FAIL score ' + state.score]);
    out.push('PASS score=' + state.score + ' source=' + state.questionsSource);
  } catch (e) {
    out.push('EXCEPTION:' + (e && e.message ? e.message : e));
  }
  finishQA(out);
}

const params = new URLSearchParams(location.search);
const qaMode = params.get('qa') === '1';
const boardDemo = params.get('boarddemo') === '1';
const stateParam = params.get('state');
const skipIntro = params.get('skipintro') === '1';


(async () => {
  if (qaMode) {
    setTimeout(runQA, 500);
    return;
  }

  await ensureQuestions();

  if (boardDemo) {
    state.group = 'A';
    updateGroupUI();
    startGame(true);
    state.boardOpen = true;
    state.boardTab = 'all';
    updateBoardTabs();
    $('panel-board').hidden = false;
    state.attemptId = 'demo-row-1';
    state.boardSummary = [
      { group_label: 'A', runs: 14, total_score: 8420, best_score: 1025, avg_score: 812, best_time_seconds: 412 },
      { group_label: 'B', runs: 11, total_score: 6980, best_score: 980, avg_score: 760, best_time_seconds: 430 },
    ];
    state.boardRows = [
      {
        attempt_id: 'demo-row-1', display_name: 'Alice', group_label: 'A', score: 1025, rank: 'SOC Lead',
        log_score: 300, contain_score: 300, order_score: 200, quiz_score: 225,
        duration_seconds: 412, created_at: new Date().toISOString(),
      },
      {
        attempt_id: 'demo-row-2', display_name: 'Anonymous', group_label: 'B', score: 980, rank: 'SOC Lead',
        log_score: 300, contain_score: 255, order_score: 200, quiz_score: 225,
        duration_seconds: 430, created_at: new Date().toISOString(),
      },
      {
        attempt_id: 'demo-row-3', display_name: 'G07-A', group_label: 'A', score: 845, rank: 'Incident Responder',
        log_score: 300, contain_score: 225, order_score: 200, quiz_score: 120,
        duration_seconds: 455, created_at: new Date().toISOString(),
      },
    ];
    renderBoardSummary();
    renderBoardRows();
    return;
  }

  if (stateParam) {
    startGame(true);

    if (stateParam === 'contain') {
      state.logFound = new Set(LOG_TARGETS.map((t) => t.id));
      markAllQuestionsAnswered('log');
      updateAll();
      openStation('contain');
    } else if (stateParam === 'report') {
      state.logFound = new Set(LOG_TARGETS.map((t) => t.id));
      markAllQuestionsAnswered('log');
      state.containChecked = true;
      state.containQuizShown = true;
      markAllQuestionsAnswered('contain');
      updateAll();
      openStation('report');
    } else if (stateParam === 'quiz') {
      state.logFound = new Set(LOG_TARGETS.map((t) => t.id));
      markAllQuestionsAnswered('log');
      state.containChecked = true;
      state.containQuizShown = true;
      markAllQuestionsAnswered('contain');
      state.reportOrderDone = true;
      updateAll();
      openStation('report');
      showQuizSection();
    } else if (stateParam === 'debrief') {
      state.logFound = new Set(LOG_TARGETS.map((t) => t.id));
      markAllQuestionsAnswered('log');
      state.containChecked = true;
      state.containQuizShown = true;
      markAllQuestionsAnswered('contain');
      state.reportOrderDone = true;
      markAllQuestionsAnswered('report');
      state.score = MAX_SCORE;
      state.stageScores = { log: 300, contain: 300, order: 200, quiz: 225 };
      updateAll();
      fileReport();
    } else {
      openStation('log');
    }
    return;
  }

  if (skipIntro) {
    startGame(true);
  }
})();
