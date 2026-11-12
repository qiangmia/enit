import { CARDS, MAX_SCORE } from './content.js';

const $ = (id) => document.getElementById(id);

const state = {
  started: false,
  index: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  answered: false,
  correctCount: 0,
  records: [],
};

function currentCard() {
  return CARDS[state.index];
}

function updateHud() {
  $('card-progress').textContent = (state.index + 1) + ' / ' + CARDS.length;
  $('score').textContent = Math.max(0, Math.round(state.score));
  $('streak').textContent = state.streak;
  $('deck-count').textContent = (state.index + 1) + ' / ' + CARDS.length;
  const completed = state.index + (state.answered ? 1 : 0);
  $('progress-fill').style.width = (completed / CARDS.length) * 100 + '%';
}

function renderLines(card, reveal) {
  const wrap = $('card-lines');
  wrap.innerHTML = '';
  card.lines.forEach((text) => {
    const p = document.createElement('p');
    if (reveal && card.answer === 'trap' && card.trapText && text.includes(card.trapText)) {
      const idx = text.indexOf(card.trapText);
      p.appendChild(document.createTextNode(text.slice(0, idx)));
      const mark = document.createElement('mark');
      mark.textContent = card.trapText;
      p.appendChild(mark);
      p.appendChild(document.createTextNode(text.slice(idx + card.trapText.length)));
    } else {
      p.textContent = text;
    }
    wrap.appendChild(p);
  });
}

function setAnswerButtons(enabled) {
  document.querySelectorAll('[data-answer]').forEach((btn) => {
    btn.disabled = !enabled;
  });
}

function renderCard() {
  const c = currentCard();
  state.answered = false;
  $('feedback').hidden = true;
  $('feedback').className = 'feedback';
  $('feedback').innerHTML = '';
  $('card').className = 'card';
  $('card-stamp').textContent = 'UNVERIFIED';
  $('card-kicker').textContent = c.type;
  $('card-title').textContent = c.title;
  $('card-source').textContent = c.source;
  $('deck-label').textContent = 'CARD ' + (state.index + 1) + ' · ' + c.type;
  renderLines(c, false);
  setAnswerButtons(true);
  updateHud();
}

function answer(choice) {
  if (state.answered) return;
  state.answered = true;
  const c = currentCard();
  const correct = choice === c.answer;
  if (correct) {
    state.score += 100;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.correctCount += 1;
  } else {
    state.score = Math.max(0, state.score - 25);
    state.streak = 0;
  }
  state.records.push({ title: c.title, correct, answer: c.answer });

  $('card').classList.add(correct ? 'correct' : 'wrong');
  $('card-stamp').textContent = c.answer === 'trap' ? 'TRAP' : 'SAFE';
  renderLines(c, true);
  setAnswerButtons(false);
  updateHud();

  const fb = $('feedback');
  fb.hidden = false;
  fb.className = 'feedback ' + (correct ? 'good' : 'bad');
  fb.innerHTML = '';

  const verdict = document.createElement('p');
  verdict.innerHTML = correct
    ? '<strong>✓ Correct.</strong> ' + (c.answer === 'trap' ? 'This is a trap.' : 'This one is safe.')
    : '<strong>✗ Not quite.</strong> This one is ' + (c.answer === 'trap' ? 'a trap.' : 'safe.');
  const why = document.createElement('p');
  why.textContent = c.why;
  fb.appendChild(verdict);
  fb.appendChild(why);

  const nextRow = document.createElement('div');
  nextRow.className = 'next-row';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'btn btn-primary';
  next.textContent = state.index >= CARDS.length - 1 ? 'See results' : 'Next card';
  next.addEventListener('click', nextCard);
  nextRow.appendChild(next);
  fb.appendChild(nextRow);
}

function nextCard() {
  if (state.index >= CARDS.length - 1) {
    finishGame();
    return;
  }
  state.index += 1;
  renderCard();
  window.scrollTo(0, 0);
}

function finishGame() {
  const accuracy = Math.round((state.correctCount / CARDS.length) * 100);
  let rank = 'Easy Target';
  if (accuracy >= 90) rank = 'Trap Spotter';
  else if (accuracy >= 70) rank = 'Trusted Reviewer';
  else if (accuracy >= 50) rank = 'Still Learning';

  $('result-rank').textContent = rank;
  $('final-score').textContent = Math.max(0, Math.round(state.score));
  $('max-score').textContent = '/ ' + MAX_SCORE;
  $('final-accuracy').textContent = accuracy + '%';
  $('final-streak').textContent = state.bestStreak;
  $('result-note').textContent = state.correctCount + ' of ' + CARDS.length + ' cards classified correctly. Best streak: ' + state.bestStreak + '.';
  $('game').hidden = true;
  $('hud').hidden = true;
  $('results').hidden = false;
  window.scrollTo(0, 0);
}

function startGame() {
  if (state.started) return;
  state.started = true;
  state.index = 0;
  state.score = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.answered = false;
  state.correctCount = 0;
  state.records = [];
  $('intro').hidden = true;
  $('results').hidden = true;
  $('game').hidden = false;
  $('hud').hidden = false;
  renderCard();
}

$('start').addEventListener('click', startGame);
$('replay').addEventListener('click', () => location.reload());
document.querySelectorAll('[data-answer]').forEach((btn) => {
  btn.addEventListener('click', () => answer(btn.dataset.answer));
});

document.addEventListener('keydown', (e) => {
  if ($('game').hidden) return;
  if (!state.answered && (e.key === 't' || e.key === 'T')) {
    e.preventDefault();
    answer('trust');
  } else if (!state.answered && (e.key === 'r' || e.key === 'R')) {
    e.preventDefault();
    answer('trap');
  } else if (state.answered && e.key === 'Enter') {
    const next = $('feedback').querySelector('.next-row .btn');
    if (next) {
      e.preventDefault();
      next.click();
    }
  }
});

// ---------- automated QA ----------
function runQA() {
  const out = [];
  try {
    startGame();
    for (let i = 0; i < CARDS.length; i++) {
      answer(CARDS[i].answer);
      const next = document.querySelector('#feedback .next-row .btn');
      if (!next) throw new Error('missing next button at card ' + i);
      next.click();
    }
    if ($('results').hidden) throw new Error('results not shown');
    const score = Number($('final-score').textContent);
    const accuracy = $('final-accuracy').textContent;
    if (score !== MAX_SCORE) throw new Error('score=' + score);
    if (accuracy !== '100%') throw new Error('accuracy=' + accuracy);
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
