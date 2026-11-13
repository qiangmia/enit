/* main.js — The Status Room, Week 11.
   One incident: read the board, make three decisions, write three status
   lines, then choose the post-mortem sentence. Wrong actions cost minutes,
   never the game. */
(function () {
  'use strict';

  var D = window.STATUS_ROOM;
  var app = document.getElementById('app');
  var hudTime = document.getElementById('hud-time');
  var hudDown = document.getElementById('hud-downtime');
  var hudLines = document.getElementById('hud-lines');

  var state = {
    phase: 'setup',
    penalties: 0,
    selected: [],
    boardTried: false,
    boardDone: false,
    decision: 0,
    line: 0,
    filled: [],
    lineScore: 0,
    lineDone: false,
    judgeDone: false,
    flags: [],
    lastMessage: null,
    lastTone: null,
    lastSeverity: false,
    finished: false,
    judgeTried: false
  };

  var CLOCK = ['03:06', '03:11', '03:16'];

  function downtime() { return 15 + state.penalties; }

  function setHud() {
    var t = '03:00';
    if (state.phase === 'decision') t = D.decisions[state.decision].time;
    else if (state.phase === 'line') t = D.lines[state.line].time;
    else if (state.phase === 'judge') t = '03:19';
    else if (state.phase === 'end') t = '03:20';
    hudTime.textContent = t;
    hudDown.textContent = downtime() + ' min';
    hudLines.textContent = state.lineScore + ' / 4';
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function message(text, tone) {
    var box = el('div', 'msg ' + (tone || 'info'));
    box.textContent = text;
    return box;
  }

  function go(phase) {
    state.phase = phase;
    state.lastMessage = null;
    state.lastTone = null;
    render();
  }

  /* ---------- setup ---------- */
  function renderSetup() {
    app.innerHTML = '';
    var card = el('div', 'panel');
    card.appendChild(el('h2', 'panel-title', D.title));
    card.appendChild(el('p', 'panel-sub', D.subtitle));
    D.intro.forEach(function (p) { card.appendChild(el('p', 'lead', p)); });

    var rules = el('ul', 'rules');
    [
      'Read the board. Two tiles explain where the traffic went.',
      'Three decisions. A wrong action adds minutes to the incident.',
      'Three status lines, then one sentence for the post-mortem.'
    ].forEach(function (r) { rules.appendChild(el('li', '', r)); });
    card.appendChild(rules);

    var btn = el('button', 'btn primary', 'Start the shift');
    btn.type = 'button';
    btn.addEventListener('click', function () { go('board'); });
    card.appendChild(btn);
    app.appendChild(card);
    setHud();
  }

  /* ---------- board ---------- */
  function renderBoard() {
    app.innerHTML = '';
    var card = el('div', 'panel');
    card.appendChild(el('div', 'kicker', 'Step 1 of 3 · Read the board'));
    card.appendChild(el('h2', 'panel-title', 'What changed at 03:04?'));
    card.appendChild(el('p', 'lead', D.board.prompt));

    var grid = el('div', 'tiles');
    D.board.tiles.forEach(function (t) {
      var tile = el('button', 'tile' + (state.selected.indexOf(t.id) >= 0 ? ' selected' : ''));
      tile.type = 'button';
      tile.disabled = state.boardDone;
      tile.setAttribute('aria-pressed', state.selected.indexOf(t.id) >= 0 ? 'true' : 'false');
      var head = el('div', 'tile-head');
      head.appendChild(el('span', 'tile-label', t.label));
      head.appendChild(el('span', 'tile-id', t.id === 'deploy' ? 'deploy' : 'metric'));
      tile.appendChild(head);
      tile.appendChild(el('div', 'tile-values', t.before + '  →  ' + t.after));
      tile.appendChild(el('div', 'tile-note', t.note));
      tile.addEventListener('click', function () {
        if (state.boardDone) return;
        var i = state.selected.indexOf(t.id);
        if (i >= 0) state.selected.splice(i, 1);
        else if (state.selected.length < 2) state.selected.push(t.id);
        renderBoard();
      });
      grid.appendChild(tile);
    });
    card.appendChild(grid);

    if (state.lastMessage) card.appendChild(message(state.lastMessage, state.lastTone));

    var row = el('div', 'btn-row');
    if (state.boardDone) {
      var next = el('button', 'btn primary', 'Continue to 03:06');
      next.type = 'button';
      next.addEventListener('click', function () { go('decision'); });
      row.appendChild(next);
    } else {
      var check = el('button', 'btn primary', 'Check the board');
      check.type = 'button';
      check.disabled = state.selected.length !== 2;
      check.addEventListener('click', function () {
        var want = D.board.tiles.filter(function (t) { return t.correct; }).map(function (t) { return t.id; });
        var chosen = state.selected.slice().sort().join(',');
        if (chosen === want.slice().sort().join(',')) {
          state.boardDone = true;
          state.lastTone = 'good';
          state.lastMessage = 'Yes. Requests collapsed in Singapore and more than doubled in Frankfurt, and the older replica went to 97%. The traffic did not disappear — it moved, and it arrived somewhere too small.';
          renderBoard();
        } else {
          state.penalties += D.board.wrongCost;
          state.boardTried = true;
          state.lastTone = 'bad';
          state.lastMessage = 'Not those two. ' + D.board.hint + ' (+' + D.board.wrongCost + ' minutes)';
          state.selected = [];
          renderBoard();
        }
      });
      row.appendChild(check);
    }
    card.appendChild(row);
    app.appendChild(card);
    setHud();
  }

  /* ---------- decisions ---------- */
  function renderDecision() {
    var d = D.decisions[state.decision];
    app.innerHTML = '';
    var card = el('div', 'panel');
    card.appendChild(el('div', 'kicker', 'Step 2 of 3 · Decision ' + (state.decision + 1) + ' of ' + D.decisions.length));
    card.appendChild(el('h2', 'panel-title', d.time + ' — ' + d.question));
    card.appendChild(el('p', 'lead', d.situation));

    var list = el('div', 'actions');
    d.actions.forEach(function (a) {
      var b = el('button', 'action' + (a.correct && state.lastTone === 'good' ? ' correct' : ''));
      b.type = 'button';
      b.disabled = a._used === true;
      var label = el('span', 'action-label', a.label);
      b.appendChild(label);
      if (a._used) b.appendChild(el('span', 'action-cost', '+' + a.cost + ' min'));
      b.addEventListener('click', function () {
        if (a.correct) {
          state.lastTone = 'good';
          state.lastMessage = a.feedback;
          renderDecision();
        } else {
          a._used = true;
          state.penalties += a.cost;
          if (a.flag && state.flags.indexOf(a.flag) < 0) state.flags.push(a.flag);
          state.lastTone = 'bad';
          state.lastMessage = a.feedback + ' (+' + a.cost + ' min)';
          renderDecision();
        }
      });
      list.appendChild(b);
    });
    card.appendChild(list);

    if (state.lastMessage) card.appendChild(message(state.lastMessage, state.lastTone));

    if (state.lastTone === 'good') {
      var row = el('div', 'btn-row');
      var next = el('button', 'btn primary', state.decision === D.decisions.length - 1 ? 'Continue to the status page' : 'Continue');
      next.type = 'button';
      next.addEventListener('click', function () {
        if (state.decision === D.decisions.length - 1) go('line');
        else { state.decision += 1; go('decision'); }
      });
      row.appendChild(next);
      card.appendChild(row);
    }

    app.appendChild(card);
    setHud();
  }

  /* ---------- status lines ---------- */
  function renderLine() {
    var L = D.lines[state.line];
    app.innerHTML = '';
    var card = el('div', 'panel');
    card.appendChild(el('div', 'kicker', 'Step 3 of 3 · Status line ' + (state.line + 1) + ' of ' + D.lines.length + ' · ' + L.time));
    card.appendChild(el('h2', 'panel-title', 'Write the status page'));

    var frame = el('div', 'frame');
    var parts = L.frame.split('___');
    frame.appendChild(el('span', '', parts[0].trim() + ' '));
    for (var i = 0; i < L.blanks.length; i++) {
      var slot = el('span', 'slot' + (state.filled[i] ? ' filled' : ''), state.filled[i] || '\u00a0');
      frame.appendChild(slot);
      if (parts[i + 1] !== undefined) frame.appendChild(el('span', '', ' ' + parts[i + 1].trim() + ' '));
    }
    card.appendChild(frame);

    var chips = el('div', 'chips');
    L.chips.forEach(function (c) {
      var used = state.filled.indexOf(c) >= 0;
      var b = el('button', 'chip' + (used ? ' used' : ''), c);
      b.type = 'button';
      b.disabled = used || state.lineDone || state.filled.length >= L.blanks.length;
      b.addEventListener('click', function () {
        if (state.lineDone) return;
        state.filled.push(c);
        renderLine();
      });
      chips.appendChild(b);
    });
    card.appendChild(chips);

    if (state.lastMessage) card.appendChild(message(state.lastMessage, state.lastTone));

    var row = el('div', 'btn-row');
    if (state.lineDone) {
      var next = el('button', 'btn primary', state.line === D.lines.length - 1 ? 'Continue to the post-mortem' : 'Next line');
      next.type = 'button';
      next.addEventListener('click', function () {
        if (state.line === D.lines.length - 1) go('judge');
        else { state.line += 1; state.filled = []; state.lineDone = false; go('line'); }
      });
      row.appendChild(next);
    } else {
      var check = el('button', 'btn primary', 'Check the line');
      check.type = 'button';
      check.disabled = state.filled.length !== L.blanks.length;
      check.addEventListener('click', function () {
        var ok = L.blanks.every(function (b, idx) { return state.filled[idx] === b.answer; });
        if (ok) {
          state.lineScore += 1;
          state.lineDone = true;
          state.lastTone = 'good';
          state.lastMessage = 'Correct. ' + L.note;
          renderLine();
        } else {
          state.lastTone = 'bad';
          state.lastMessage = 'Not yet. ' + L.note;
          state.filled = [];
          renderLine();
        }
      });
      row.appendChild(check);
    }

    var undo = el('button', 'btn ghost', 'Clear');
    undo.type = 'button';
    undo.disabled = state.lineDone;
    undo.addEventListener('click', function () {
      state.filled = [];
      state.lastMessage = null;
      renderLine();
    });
    row.appendChild(undo);
    card.appendChild(row);

    app.appendChild(card);
    setHud();
  }

  /* ---------- judgement ---------- */
  function renderJudge() {
    app.innerHTML = '';
    var card = el('div', 'panel');
    card.appendChild(el('div', 'kicker', 'Post-mortem'));
    card.appendChild(el('h2', 'panel-title', 'Who acted?'));
    card.appendChild(el('p', 'lead', D.judgement.prompt));

    var list = el('div', 'actions');
    D.judgement.options.forEach(function (o) {
      var b = el('button', 'action');
      b.type = 'button';
      b.disabled = state.judgeDone;
      b.appendChild(el('span', 'action-label', o.label));
      b.addEventListener('click', function () {
        if (o.correct) {
          state.lineScore += 1;
          state.judgeDone = true;
          state.lastTone = 'good';
        } else {
          state.lastTone = 'bad';
        }
        state.lastMessage = o.feedback;
        renderJudge();
      });
      list.appendChild(b);
    });
    card.appendChild(list);

    if (state.lastMessage) card.appendChild(message(state.lastMessage, state.lastTone));

    if (state.judgeDone) {
      var row = el('div', 'btn-row');
      var next = el('button', 'btn primary', 'Close the incident');
      next.type = 'button';
      next.addEventListener('click', function () { go('end'); });
      row.appendChild(next);
      card.appendChild(row);
    }

    app.appendChild(card);
    setHud();
  }

  /* ---------- end ---------- */
  function renderEnd() {
    var d = downtime();
    app.innerHTML = '';
    var card = el('div', 'panel end');
    card.appendChild(el('div', 'kicker', 'Incident closed · 03:20'));
    card.appendChild(el('h2', 'panel-title', d + ' minutes of downtime'));

    var verdict;
    if (d <= 15 && state.lineScore === 4) verdict = 'That is the story in the lesson: six minutes to find the cause, a rollback, a failover, and a page that said what was done.';
    else if (d <= 15) verdict = 'Fast incident, but the page needs work. A status line is part of the fix, not an afterthought.';
    else if (d <= 25) verdict = 'Recovered, with minutes lost to actions that did not address the cause. Read the board before you act.';
    else verdict = 'The incident ran long. Most of those minutes went to waiting, or to capacity that could not help.';
    card.appendChild(el('p', 'lead', verdict));

    var stats = el('div', 'stats');
    var a = el('div', 'stat'); a.appendChild(el('span', 'stat-num', String(d))); a.appendChild(el('span', 'stat-label', 'minutes down'));
    var b = el('div', 'stat'); b.appendChild(el('span', 'stat-num', state.lineScore + '/4')); b.appendChild(el('span', 'stat-label', 'status lines right'));
    stats.appendChild(a); stats.appendChild(b);
    card.appendChild(stats);

    if (state.flags.length) {
      var flags = el('ul', 'flags');
      if (state.flags.indexOf('transparency') >= 0) flags.appendChild(el('li', '', 'You hid the error page. Users saw raw errors instead of a message.'));
      if (state.flags.indexOf('credibility') >= 0) flags.appendChild(el('li', '', 'You named a team before the cause was confirmed. Expect a difficult post-mortem.'));
      card.appendChild(flags);
    }

    var debrief = el('div', 'debrief');
    debrief.appendChild(el('h3', '', 'Debrief'));
    debrief.appendChild(el('p', 'lead', D.debrief.question));
    debrief.appendChild(el('p', 'small', D.debrief.note));
    card.appendChild(debrief);

    var row = el('div', 'btn-row');
    var again = el('button', 'btn ghost', 'Play again');
    again.type = 'button';
    again.addEventListener('click', function () { window.location.reload(); });
    row.appendChild(again);
    card.appendChild(row);

    app.appendChild(card);
    setHud();
  }

  function render() {
    if (state.phase === 'setup') renderSetup();
    else if (state.phase === 'board') renderBoard();
    else if (state.phase === 'decision') renderDecision();
    else if (state.phase === 'line') renderLine();
    else if (state.phase === 'judge') renderJudge();
    else renderEnd();
  }

  render();
})();
