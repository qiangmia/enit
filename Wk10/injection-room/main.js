import { CASES, MAX_SCORE, START_TRUST } from './content.js';

const $ = (id) => document.getElementById(id);

const state = {
  started: false,
  index: 0,
  score: 0,
  trust: START_TRUST,
  selected: undefined,
  answered: false,
  lineCorrect: 0,
  actionCorrect: 0,
  records: [],
};

const ACTION_LABELS = {
  allow: 'Allow',
  block: 'Block',
  confirm: 'Ask first',
};

function currentCase() {
  return CASES[state.index];
}

function updateHud() {
  $('case-progress').textContent = (state.index + 1) + ' / ' + CASES.length;
  $('score').textContent = Math.max(0, Math.round(state.score));
  const full = '♥'.repeat(state.trust);
  const empty = '♥'.repeat(Math.max(0, START_TRUST - state.trust));
  $('trust-hearts').innerHTML = full + (empty ? '<span class="empty">' + empty + '</span>' : '');
}

function setActionsEnabled(enabled) {
  document.querySelectorAll('.btn-action').forEach((btn) => {
    btn.disabled = !enabled;
  });
}

function clearSelection() {
  state.selected = undefined;
  $('no-line').classList.remove('selected');
  document.querySelectorAll('.line').forEach((line) => line.classList.remove('selected'));
}

function selectLine(index) {
  if (state.answered) return;
  state.selected = index;
  $('no-line').classList.remove('selected');
  document.querySelectorAll('.line').forEach((line, i) => {
    line.classList.toggle('selected', i === index);
  });
  setActionsEnabled(true);
}

function selectNone() {
  if (state.answered) return;
  state.selected = 'none';
  document.querySelectorAll('.line').forEach((line) => line.classList.remove('selected'));
  $('no-line').classList.add('selected');
  setActionsEnabled(true);
}

function renderCase() {
  const c = currentCase();
  state.answered = false;
  clearSelection();
  setActionsEnabled(false);
  $('next-case').hidden = true;
  $('feedback').hidden = true;
  $('feedback').className = 'feedback';
  $('feedback').textContent = '';
  $('doc-kicker').textContent = 'CASE ' + (state.index + 1) + ' · ' + c.type;
  $('doc-title').textContent = c.title;
  $('doc-source').textContent = c.source;
  $('doc-meta').textContent = c.meta;
  $('doc-stamp').textContent = 'UNTRUSTED';
  $('case-number').textContent = String(state.index + 1);
  $('case-type').textContent = c.type;
  $('agent-action').textContent = c.agentAction;
  $('task-help').textContent = 'Click the line that contains the hidden instruction, then choose an action.';
  $('no-line').classList.remove('selected');
  $('no-line').disabled = false;

  const wrap = $('doc-lines');
  wrap.classList.remove('locked');
  wrap.innerHTML = '';
  c.lines.forEach((text, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'line';
    const num = document.createElement('span');
    num.className = 'line-num';
    num.textContent = String(index + 1).padStart(2, '0');
    const content = document.createElement('span');
    content.textContent = text;
    btn.appendChild(num);
    btn.appendChild(content);
    btn.addEventListener('click', () => selectLine(index));
    wrap.appendChild(btn);
  });

  updateHud();
}

function addFeedbackLine(text) {
  const p = document.createElement('p');
  p.textContent = text;
  $('feedback').appendChild(p);
}

function submitAction(action) {
  if (state.answered || state.selected === undefined) return;
  state.answered = true;
  const c = currentCase();
  const lineOK = c.correctLine === null
    ? state.selected === 'none'
    : state.selected === c.correctLine;
  const actionOK = action === c.correctAction;
  $('no-line').disabled = true;

  if (lineOK) state.lineCorrect += 1;
  if (actionOK) state.actionCorrect += 1;

  let points = 0;
  if (lineOK) points += 100;
  if (actionOK) points += 100;
  else {
    points -= 50;
    state.trust = Math.max(0, state.trust - 1);
  }
  state.score = Math.max(0, state.score + points);

  state.records.push({
    title: c.title,
    lineOK,
    actionOK,
    action,
    correctAction: c.correctAction,
  });

  const lines = $('doc-lines');
  lines.classList.add('locked');
  if (c.correctLine !== null) {
    const correctLine = lines.querySelectorAll('.line')[c.correctLine];
    if (correctLine) correctLine.classList.add('correct');
  }
  if (typeof state.selected === 'number' && state.selected !== c.correctLine) {
    const chosen = lines.querySelectorAll('.line')[state.selected];
    if (chosen) chosen.classList.add('wrong');
  }
  $('no-line').classList.remove('selected');
  setActionsEnabled(false);

  const fb = $('feedback');
  fb.hidden = false;
  fb.className = 'feedback ' + (lineOK && actionOK ? 'good' : 'bad');
  fb.innerHTML = '';
  addFeedbackLine(lineOK
    ? '✓ Line: you found the instruction that should not be treated as a command.'
    : c.correctLine === null
      ? '✗ Line: this document is safe. There is no hidden instruction to flag.'
      : '✗ Line: that is ordinary content. The injected instruction is highlighted in green.');
  addFeedbackLine(actionOK
    ? '✓ Action: ' + ACTION_LABELS[action].toLowerCase() + ' is the right response.'
    : '✗ Action: ' + ACTION_LABELS[action].toLowerCase() + ' is not the right response. ' + c.actionFeedback[action]);
  addFeedbackLine(c.explanation);

  $('task-help').textContent = actionOK
    ? 'Good decision. Read the explanation, then continue.'
    : 'The agent lost one trust token. Read why, then continue.';

  const next = $('next-case');
  next.hidden = false;
  next.textContent = (state.trust <= 0 || state.index >= CASES.length - 1)
    ? 'See results'
    : 'Next case';
  updateHud();
}

function nextCase() {
  if (state.trust <= 0 || state.index >= CASES.length - 1) {
    finishGame();
    return;
  }
  state.index += 1;
  renderCase();
  window.scrollTo(0, 0);
}

function finishGame() {
  const totalChecks = CASES.length * 2;
  const accuracy = Math.round(((state.lineCorrect + state.actionCorrect) / totalChecks) * 100);
  const ratio = state.score / MAX_SCORE;
  let rank = 'Compromised';
  if (ratio >= 0.9 && state.trust > 0) rank = 'Sandbox Defender';
  else if (ratio >= 0.7) rank = 'Prompt Spotter';
  else if (ratio >= 0.5) rank = 'Agent Trainee';

  $('result-rank').textContent = rank;
  $('final-score').textContent = Math.max(0, Math.round(state.score));
  $('max-score').textContent = '/ ' + MAX_SCORE;
  $('final-accuracy').textContent = accuracy + '%';
  $('final-trust').textContent = state.trust + ' / ' + START_TRUST;
  $('case-breakdown').innerHTML = state.records.map((r) => {
    const line = r.lineOK ? '<span class="ok">line ✓</span>' : '<span class="bad">line ✗</span>';
    const action = r.actionOK ? '<span class="ok">action ✓</span>' : '<span class="bad">action ✗</span>';
    return '<div><span>' + escapeHtml(r.title) + '</span><b>' + line + ' · ' + action + '</b></div>';
  }).join('');
  $('game').hidden = true;
  $('hud').hidden = true;
  $('results').hidden = false;
  window.scrollTo(0, 0);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function startGame() {
  if (state.started) return;
  state.started = true;
  state.index = 0;
  state.score = 0;
  state.trust = START_TRUST;
  state.lineCorrect = 0;
  state.actionCorrect = 0;
  state.records = [];
  $('intro').hidden = true;
  $('results').hidden = true;
  $('game').hidden = false;
  $('hud').hidden = false;
  renderCase();
}

$('start').addEventListener('click', startGame);
$('no-line').addEventListener('click', selectNone);
$('next-case').addEventListener('click', nextCase);
$('replay').addEventListener('click', () => location.reload());
document.querySelectorAll('.btn-action').forEach((btn) => {
  btn.addEventListener('click', () => submitAction(btn.dataset.action));
});

// ---------- automated QA ----------
function runQA() {
  const out = [];
  try {
    startGame();
    for (let i = 0; i < CASES.length; i++) {
      const c = CASES[i];
      if (c.correctLine === null) {
        $('no-line').click();
      } else {
        const lines = document.querySelectorAll('#doc-lines .line');
        if (!lines[c.correctLine]) throw new Error('missing line ' + i);
        lines[c.correctLine].click();
      }
      const actionBtn = document.querySelector('.btn-action[data-action="' + c.correctAction + '"]');
      if (!actionBtn) throw new Error('missing action ' + c.correctAction);
      actionBtn.click();
      $('next-case').click();
    }
    if ($('results').hidden) throw new Error('results not shown');
    const score = Number($('final-score').textContent);
    const accuracy = $('final-accuracy').textContent;
    if (score !== MAX_SCORE) throw new Error('score=' + score);
    if (accuracy !== '100%') throw new Error('accuracy=' + accuracy);
    if ($('final-trust').textContent !== '3 / 3') throw new Error('trust=' + $('final-trust').textContent);
    out.push('PASS score=' + score + ' accuracy=' + accuracy);
  } catch (e) {
    out.push('EXCEPTION:' + (e && e.message ? e.message : e));
  }
  const qa = $('qa-report');
  qa.hidden = false;
  qa.textContent = 'QA:' + out.join(' | ');
}

const params = new URLSearchParams(location.search);
if (params.get('qa') === '1') {
  setTimeout(runQA, 300);
}
