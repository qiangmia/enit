import {
  DOCUMENTS,
  SKIM_SECONDS,
  SCAN_SECONDS,
  SKIM_POINTS,
  SCAN_POINTS,
  TIME_BONUS_MAX,
  SCAN_WRONG_PENALTY,
  SCAN_WRONG_SECONDS,
  TOTAL_TASKS,
  MAX_SCORE,
} from './content.js';

const $ = (id) => document.getElementById(id);

const state = {
  started: false,
  docIndex: 0,
  phase: 'skim',
  skimIndex: 0,
  scanIndex: 0,
  score: 0,
  correct: 0,
  timeLeft: 0,
  timerId: null,
  answered: false,
  startTime: 0,
  docStartScore: 0,
  docStartCorrect: 0,
  docScores: [],
};

function currentDoc() {
  return DOCUMENTS[state.docIndex];
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtTime(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + String(s).padStart(2, '0');
}

function updateScore() {
  $('score').textContent = Math.max(0, Math.round(state.score));
}

function updateDocProgress() {
  $('doc-progress').textContent = state.docIndex + 1 + ' / ' + DOCUMENTS.length;
}

function updateTimerUI() {
  const el = $('timer');
  el.textContent = Math.max(0, Math.ceil(state.timeLeft));
  el.classList.toggle('danger', state.timeLeft <= 10 && state.timeLeft > 0);
}

function startTimer(seconds) {
  stopTimer();
  state.timeLeft = seconds;
  state.answered = false;
  updateTimerUI();
  state.timerId = setInterval(() => {
    state.timeLeft = Math.max(0, state.timeLeft - 1);
    updateTimerUI();
    if (state.timeLeft <= 0) stopTimer();
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function timeBonus(seconds) {
  const ratio = Math.max(0, Math.min(1, state.timeLeft / seconds));
  return Math.round(TIME_BONUS_MAX * ratio);
}

function renderPaper(interactive) {
  document.body.classList.toggle('scan-mode', interactive);
  const doc = currentDoc();
  $('paper-kicker').textContent = doc.kicker;
  $('paper-title').textContent = doc.title;
  $('paper-source').textContent = doc.source;
  $('stamp').textContent = interactive ? 'SCAN' : 'SKIM';
  const wrap = $('document-text');
  wrap.innerHTML = '';
  doc.paragraphs.forEach((text, index) => {
    let el;
    if (interactive) {
      el = document.createElement('button');
      el.type = 'button';
      el.className = 'doc-para scan';
      el.dataset.index = String(index);
      el.addEventListener('click', () => onScanClick(index, el));
    } else {
      el = document.createElement('p');
      el.className = 'doc-para';
    }
    el.textContent = text;
    wrap.appendChild(el);
  });
}

function setTaskChrome(tool, count, title, help) {
  $('task-tool').textContent = tool;
  $('task-count').textContent = count;
  $('task-title').textContent = title;
  $('task-help').textContent = help;
}

function clearFeedback() {
  const fb = $('feedback');
  fb.hidden = true;
  fb.className = 'feedback';
  fb.textContent = '';
  $('task-next').hidden = true;
}

function showFeedback(kind, text) {
  const fb = $('feedback');
  fb.hidden = false;
  fb.className = 'feedback ' + kind;
  fb.textContent = text;
}

function showSkim() {
  const doc = currentDoc();
  const q = doc.skim[state.skimIndex];
  state.phase = 'skim';
  setTaskChrome(
    '🔭 SKIM',
    'Question ' + (state.skimIndex + 1) + ' of ' + doc.skim.length,
    q.prompt,
    'Choose the best answer.'
  );
  const body = $('task-body');
  body.innerHTML = '';
  q.options.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option';
    btn.textContent = option;
    btn.addEventListener('click', () => answerSkim(index));
    body.appendChild(btn);
  });
  clearFeedback();
  startTimer(SKIM_SECONDS);
}

function answerSkim(chosen) {
  if (state.answered) return;
  state.answered = true;
  stopTimer();
  const doc = currentDoc();
  const q = doc.skim[state.skimIndex];
  const correct = chosen === q.answer_index;
  const buttons = document.querySelectorAll('#task-body .option');
  buttons.forEach((btn, index) => {
    btn.disabled = true;
    if (index === q.answer_index) btn.classList.add('correct');
    else if (index === chosen) btn.classList.add('wrong');
  });
  if (correct) {
    const points = SKIM_POINTS + timeBonus(SKIM_SECONDS);
    state.score += points;
    state.correct += 1;
    updateScore();
    showFeedback('good', '✓ ' + points + ' points. ' + q.explanation);
  } else {
    showFeedback('bad', '✗ ' + q.explanation);
  }
  const next = $('task-next');
  next.hidden = false;
  next.textContent =
    state.skimIndex < doc.skim.length - 1 ? 'Next question' : 'Start scanning';
}

function startScan() {
  state.phase = 'scan';
  state.scanIndex = 0;
  renderPaper(true);
  showScanTarget();
}

function showScanTarget() {
  const doc = currentDoc();
  const target = doc.scan[state.scanIndex];
  setTaskChrome(
    '🔍 SCAN',
    'Target ' + (state.scanIndex + 1) + ' of ' + doc.scan.length,
    target.prompt,
    'Click the paragraph that contains the answer.'
  );
  $('task-body').innerHTML = '';
  clearFeedback();
  startTimer(SCAN_SECONDS);
}

function onScanClick(index, el) {
  if (state.phase !== 'scan' || state.answered) return;
  const doc = currentDoc();
  const target = doc.scan[state.scanIndex];
  if (index === target.paragraph) {
    state.answered = true;
    stopTimer();
    const points = SCAN_POINTS + timeBonus(SCAN_SECONDS);
    state.score += points;
    state.correct += 1;
    updateScore();
    el.classList.add('correct');
    const text = doc.paragraphs[index];
    const phraseIndex = text.indexOf(target.phrase);
    if (phraseIndex !== -1) {
      el.innerHTML =
        escapeHtml(text.slice(0, phraseIndex)) +
        '<mark>' +
        escapeHtml(target.phrase) +
        '</mark>' +
        escapeHtml(text.slice(phraseIndex + target.phrase.length));
    }
    showFeedback('good', '✓ ' + points + ' points. ' + target.explanation);
    const next = $('task-next');
    next.hidden = false;
    next.textContent =
      state.scanIndex < doc.scan.length - 1 ? 'Next target' : 'Next document';
  } else {
    state.score = Math.max(0, state.score - SCAN_WRONG_PENALTY);
    state.timeLeft = Math.max(0, state.timeLeft - SCAN_WRONG_SECONDS);
    updateScore();
    updateTimerUI();
    el.classList.add('wrong');
    setTimeout(() => el.classList.remove('wrong'), 350);
    showFeedback(
      'bad',
      'Not this paragraph. −' +
        SCAN_WRONG_PENALTY +
        ' points, −' +
        SCAN_WRONG_SECONDS +
        ' seconds. Look for the number, name or date.'
    );
  }
}

function nextTask() {
  const doc = currentDoc();
  if (state.phase === 'skim') {
    if (state.skimIndex < doc.skim.length - 1) {
      state.skimIndex += 1;
      showSkim();
    } else {
      startScan();
    }
    return;
  }
  if (state.scanIndex < doc.scan.length - 1) {
    state.scanIndex += 1;
    showScanTarget();
  } else {
    finishDocument();
  }
}

function loadDocument() {
  state.phase = 'skim';
  state.skimIndex = 0;
  state.scanIndex = 0;
  state.answered = false;
  state.docStartScore = state.score;
  state.docStartCorrect = state.correct;
  renderPaper(false);
  updateDocProgress();
  showSkim();
}

function finishDocument() {
  const doc = currentDoc();
  state.docScores.push({
    title: doc.title,
    score: state.score - state.docStartScore,
    correct: state.correct - state.docStartCorrect,
    tasks: doc.skim.length + doc.scan.length,
  });
  if (state.docIndex < DOCUMENTS.length - 1) {
    state.docIndex += 1;
    loadDocument();
  } else {
    finishGame();
  }
}

function startGame() {
  if (state.started) return;
  state.started = true;
  state.startTime = Date.now();
  state.docIndex = 0;
  state.score = 0;
  state.correct = 0;
  state.docScores = [];
  state.docStartScore = 0;
  state.docStartCorrect = 0;
  $('intro').hidden = true;
  $('results').hidden = true;
  $('game').hidden = false;
  $('hud').hidden = false;
  loadDocument();
  updateScore();
}

function finishGame() {
  stopTimer();
  const elapsed = (Date.now() - state.startTime) / 1000;
  const accuracy = Math.round((state.correct / TOTAL_TASKS) * 100);
  const percentage = state.score / MAX_SCORE;
  let rank = 'Trainee';
  if (percentage >= 0.85) rank = 'Skim & Scan Specialist';
  else if (percentage >= 0.65) rank = 'Records Analyst';
  else if (percentage >= 0.45) rank = 'Records Clerk';

  $('result-rank').textContent = rank;
  $('final-score').textContent = Math.max(0, Math.round(state.score));
  $('max-score').textContent = '/ ' + MAX_SCORE;
  $('final-accuracy').textContent = accuracy + '%';
  $('final-time').textContent = fmtTime(elapsed);
  $('doc-breakdown').innerHTML = state.docScores
    .map((doc) => {
      return (
        '<div><span>' +
        escapeHtml(doc.title) +
        '</span><b>+' +
        Math.max(0, Math.round(doc.score)) +
        ' · ' +
        doc.correct +
        ' / ' +
        doc.tasks +
        '</b></div>'
      );
    })
    .join('');
  $('game').hidden = true;
  $('hud').hidden = true;
  $('results').hidden = false;
  window.scrollTo(0, 0);
}

$('start').addEventListener('click', startGame);
$('task-next').addEventListener('click', nextTask);
$('replay').addEventListener('click', () => location.reload());

// ---------- automated QA ----------
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runQA() {
  const out = [];
  try {
    startGame();
    for (let d = 0; d < DOCUMENTS.length; d++) {
      for (let q = 0; q < DOCUMENTS[d].skim.length; q++) {
        const options = document.querySelectorAll('#task-body .option');
        const answer = DOCUMENTS[d].skim[q].answer_index;
        if (!options[answer]) throw new Error('missing skim option');
        options[answer].click();
        await delay(60);
        $('task-next').click();
        await delay(60);
      }
      for (let s = 0; s < DOCUMENTS[d].scan.length; s++) {
        const target = DOCUMENTS[d].scan[s];
        const paras = document.querySelectorAll('#document-text .doc-para');
        if (!paras[target.paragraph]) throw new Error('missing scan paragraph');
        paras[target.paragraph].click();
        await delay(60);
        $('task-next').click();
        await delay(60);
      }
    }
    if ($('results').hidden) throw new Error('results not shown');
    const score = Number($('final-score').textContent);
    const accuracy = $('final-accuracy').textContent;
    if (score < 1500) throw new Error('score too low: ' + score);
    if (accuracy !== '100%') throw new Error('accuracy: ' + accuracy);
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
  setTimeout(runQA, 350);
} else if (params.get('state') === 'scan') {
  startGame();
  startScan();
} else if (params.get('state') === 'skim') {
  startGame();
}
