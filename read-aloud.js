/* enit — read-aloud coach
 *
 * Turns a lesson article into a sequence of one-or-two-sentence chunks and
 * shows them one at a time, so a class reads the text aloud instead of
 * skimming it silently. The reader's turn comes from the seating table
 * (the same Team A / Team B groups the games use), and each chunk plays its
 * own recording before the student reads.
 *
 * The chunk list is embedded by build-second-half.py as JSON: the text and
 * the audio files are generated from the same source, so they cannot drift.
 * Pages without that block fall back to splitting .readalong-para at runtime.
 *
 * No names are stored here. Seating reads the roster from localStorage and
 * this file only ever sees it in the browser.
 */
(function () {
    'use strict';

    var CSS_ID = 'ra-style';
    var DATA_ID = 'read-aloud-data';

    /* ---------------------------------------------------------------- data --- */

    function parseData() {
        var el = document.getElementById(DATA_ID);
        if (!el) return null;
        try {
            var data = JSON.parse(el.textContent);
            if (data && data.chunks && data.chunks.length) return data;
        } catch (e) {}
        return null;
    }

    function splitSentences(text) {
        var m = text.match(/[^.!?]+[.!?]+(?=\s|$)/g);
        return m ? m.map(function (s) { return s.trim(); }) : [text];
    }

    function chunksFromDom() {
        var paras = [].slice.call(document.querySelectorAll('.readalong-para'));
        if (!paras.length) return [];
        var out = [];
        paras.forEach(function (p, pi) {
            var text = p.textContent.replace(/\s+/g, ' ').trim();
            var buf = [], words = 0;
            splitSentences(text).forEach(function (s) {
                var w = s.split(/\s+/).length;
                if (buf.length && (buf.length >= 2 || words + w > 34)) {
                    out.push({ text: buf.join(' '), para: pi + 1, audio: '' });
                    buf = []; words = 0;
                }
                buf.push(s); words += w;
            });
            if (buf.length) out.push({ text: buf.join(' '), para: pi + 1, audio: '' });
        });
        return out;
    }

    var DATA = parseData();
    var CHUNKS = DATA ? DATA.chunks : chunksFromDom();
    var WEEK = DATA ? DATA.week : '';
    if (!CHUNKS.length) return;

    /* --------------------------------------------------------------- style --- */

    var CSS = [
        '.ra-launch{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;',
        'margin:0 0 1.3rem;padding:.65rem .8rem;border:1px solid var(--border,#ded2c2);',
        'border-radius:12px;background:var(--info-bg,#f3eadf)}',
        '.ra-open{border:1px solid var(--accent,#a94e27);background:var(--accent,#a94e27);',
        'color:#fff;font:inherit;font-size:.82rem;font-weight:700;letter-spacing:.03em;',
        'padding:.45rem .95rem;border-radius:999px;cursor:pointer;display:inline-flex;',
        'align-items:center;gap:.45rem;min-height:38px}',
        '.ra-open:hover{background:#95431f}',
        '.ra-sub{font-size:.78rem;color:var(--text-light,#6a5f54);line-height:1.4}',

        '.ra-overlay{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;',
        'justify-content:center;padding:1.2rem;background:rgba(42,36,30,.55);',
        'backdrop-filter:blur(4px)}',
        '.ra-overlay[hidden]{display:none}',
        '.ra-frame{width:min(1120px,100%);height:min(86vh,740px);display:flex;flex-direction:column;',
        'background:var(--card-bg,#fffdf9);border:1px solid var(--border,#ded2c2);border-radius:18px;',
        'box-shadow:0 30px 70px -30px rgba(30,24,18,.65);overflow:hidden;',
        "font-family:'Helvetica Neue',Arial,sans-serif;color:var(--text,#2a241e)}",
        '.ra-top{display:flex;align-items:center;gap:1rem;padding:.85rem 1.3rem .8rem}',
        '.ra-kicker{font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--warm,#8b5a1e)}',
        '.ra-kicker b{color:var(--accent,#a94e27)}',
        '.ra-top .sp{flex:1}',
        '.ra-meta{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--text-light,#6a5f54);',
        'font-variant-numeric:tabular-nums}',
        '.ra-meta b{color:var(--text,#2a241e)}',
        '.ra-x{border:0;background:transparent;font-size:1.4rem;line-height:1;color:var(--text-light,#6a5f54);',
        'cursor:pointer;padding:.2rem .45rem;border-radius:8px}',
        '.ra-x:hover{background:var(--accent-light,#f4ddcb);color:var(--accent,#a94e27)}',
        '.ra-prog{height:3px;background:var(--accent-light,#f4ddcb)}',
        '.ra-prog i{display:block;height:100%;width:0;background:var(--accent,#a94e27);transition:width .25s}',
        '.ra-stage{flex:1;display:flex;flex-direction:column;justify-content:center;',
        'padding:1.6rem 2.6rem;position:relative;min-height:0}',
        '.ra-inner{width:min(54rem,100%);margin:0 auto}',
        '.ra-prev{font-family:Georgia,"Times New Roman",serif;font-size:1rem;line-height:1.5;',
        'color:var(--text-light,#6a5f54);opacity:.4;margin:0 0 1.4rem;max-height:3rem;overflow:hidden}',
        '.ra-prev[hidden]{display:none}',
        '.ra-chunk{font-family:Georgia,"Times New Roman",serif;',
        'font-size:clamp(1.5rem,2.4vw,2.2rem);line-height:1.45;margin:0;text-wrap:balance}',
        '.ra-turn{display:flex;align-items:center;gap:.6rem;margin-top:1.9rem;flex-wrap:wrap}',
        '.ra-badge{display:inline-flex;align-items:center;justify-content:center;min-width:1.75rem;',
        'height:1.75rem;padding:0 .45rem;border-radius:7px;font-size:.72rem;font-weight:800;',
        'letter-spacing:.06em;color:#fff;background:var(--accent,#a94e27)}',
        '.ra-badge.b{background:var(--team-b,#3f6b6b)}',
        '.ra-name{font-size:1.12rem;font-weight:700}',
        '.ra-skip{border:1px solid var(--border,#ded2c2);background:#fff;color:var(--text-light,#6a5f54);',
        'font:inherit;font-size:.7rem;letter-spacing:.05em;padding:.2rem .55rem;border-radius:999px;',
        'cursor:pointer;margin-left:.2rem}',
        '.ra-skip:hover{border-color:var(--accent,#a94e27);color:var(--accent,#a94e27)}',
        '.ra-skip[hidden]{display:none}',
        '.ra-note{font-size:.75rem;color:var(--text-light,#6a5f54);letter-spacing:.04em}',
        '.ra-nextup{margin-top:.9rem;font-size:.75rem;color:var(--text-light,#6a5f54);letter-spacing:.04em}',
        '.ra-nextup b{color:var(--text,#2a241e);font-weight:600}',
        '.ra-hear{margin-top:1rem;border:1px solid var(--border,#ded2c2);background:#fff;color:var(--text,#2a241e);',
        'font:inherit;font-size:.78rem;padding:.4rem .85rem;border-radius:999px;cursor:pointer;',
        'display:inline-flex;align-items:center;gap:.4rem}',
        '.ra-hear:hover{border-color:var(--accent,#a94e27);color:var(--accent,#a94e27)}',
        '.ra-hear[hidden]{display:none}',
        '.ra-controls{display:flex;align-items:center;gap:.55rem;padding:.85rem 1.3rem 1rem;',
        'border-top:1px solid var(--border,#ded2c2)}',
        '.ra-controls .sp{flex:1}',
        '.ra-btn{border:1px solid var(--border,#ded2c2);background:#fff;color:var(--text,#2a241e);',
        'font:inherit;font-size:.85rem;border-radius:999px;padding:.5rem 1rem;cursor:pointer;min-height:42px}',
        '.ra-btn:hover{border-color:var(--accent,#a94e27);color:var(--accent,#a94e27)}',
        '.ra-btn.primary{background:var(--accent,#a94e27);border-color:var(--accent,#a94e27);color:#fff;font-weight:700}',
        '.ra-btn.primary:hover{background:#95431f;color:#fff}',
        '.ra-btn[disabled]{opacity:.35;cursor:default;border-color:var(--border,#ded2c2);color:var(--text-light,#6a5f54)}',
        '.ra-hint{font-size:.7rem;color:var(--text-light,#6a5f54)}',
        '.ra-hint kbd{font:inherit;font-size:.65rem;border:1px solid var(--border,#ded2c2);',
        'border-bottom-width:2px;border-radius:4px;padding:.02rem .3rem;background:#fff}',
        '.ra-end{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;',
        'justify-content:center;gap:.6rem;text-align:center;background:var(--card-bg,#fffdf9);padding:1.5rem}',
        '.ra-end.on{display:flex}',
        '.ra-end h2{margin:0;font-size:1.4rem}',
        '.ra-end .big{font-size:2.4rem;font-weight:800;font-variant-numeric:tabular-nums;line-height:1}',
        '.ra-end p{margin:0;font-size:.85rem;color:var(--text-light,#6a5f54)}',
        '@media (max-width:720px){',
        '.ra-stage{padding:1.2rem}.ra-frame{height:min(90vh,720px)}',
        '.ra-top{padding:.7rem .9rem}.ra-controls{padding:.7rem .9rem .9rem}',
        '.ra-hint{display:none}.ra-prev{font-size:.9rem}',
        '}'
    ].join('');

    function injectStyle() {
        if (document.getElementById(CSS_ID)) return;
        var s = document.createElement('style');
        s.id = CSS_ID;
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    /* ------------------------------------------------------------- seating --- */

    var state = {
        i: 0,
        pass: 1,
        open: false,
        queue: null,
        queueTried: false,
        shift: 0,
        readers: 6,
        startedAt: 0,
        timer: null
    };

    function shuffle(a) {
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function buildQueue() {
        if (state.queueTried) return state.queue;
        state.queueTried = true;
        if (!window.Seating || typeof window.Seating.init !== 'function') return null;
        try {
            window.Seating.init();
            if (!window.Seating.hasGroups()) return null;
            var A = window.Seating.studentsInTeam('A').slice();
            var B = window.Seating.studentsInTeam('B').slice();
            if (!A.length && !B.length) return null;
            shuffle(A); shuffle(B);
            var q = [], n = Math.max(A.length, B.length);
            for (var i = 0; i < n; i++) {
                if (A[i]) q.push({ team: 'A', student: A[i] });
                if (B[i]) q.push({ team: 'B', student: B[i] });
            }
            state.queue = q;
            return q;
        } catch (e) {
            return null;
        }
    }

    function readerAt(turnNo) {
        var q = state.queue || [];
        if (q.length) {
            var r = q[turnNo % q.length];
            var name;
            try { name = window.Seating.displayName(r.student); }
            catch (e) { name = r.student.chineseName || '?'; }
            return { team: r.team, name: name, roster: true };
        }
        return { team: null, name: 'Reader ' + (turnNo % state.readers + 1), roster: false };
    }

    function turnNo() {
        return (state.pass - 1) * CHUNKS.length + state.i;
    }

    /* ---------------------------------------------------------------- audio --- */

    var audio = null;
    var missing = {};

    function ensureAudio() {
        if (audio) return audio;
        audio = new Audio();
        audio.preload = 'auto';
        audio.addEventListener('error', function () {
            if (audio && audio.dataset.chunk) missing[audio.dataset.chunk] = true;
            paintHear();
        });
        audio.addEventListener('play', paintHear);
        audio.addEventListener('pause', paintHear);
        audio.addEventListener('ended', paintHear);
        return audio;
    }

    function playChunk() {
        var c = CHUNKS[state.i];
        if (!c || !c.audio || missing[c.i]) return;
        var a = ensureAudio();
        if (a.src.indexOf(c.audio) === -1) {
            a.dataset.chunk = String(c.i);
            a.src = c.audio;
        }
        try { a.currentTime = 0; } catch (e) {}
        var p = a.play();
        if (p && p.catch) p.catch(function () {});
    }

    function stopAudio() {
        if (audio) {
            audio.pause();
            try { audio.currentTime = 0; } catch (e) {}
        }
    }

    function paintHear() {
        if (!hearBtn) return;
        var c = CHUNKS[state.i];
        var gone = !c || !c.audio || missing[c.i];
        hearBtn.hidden = gone;
        if (gone) return;
        var playing = audio && !audio.paused;
        hearBtn.innerHTML = playing ? '&#10074;&#10074; Pause the recording'
                                    : '&#9654; Hear it again';
    }

    /* ------------------------------------------------------------------ dom --- */

    var overlay, frame, prevEl, chunkEl, turnEl, nextEl, countEl, clockEl, barEl, endEl;
    var hearBtn, teamEl, nameEl, nextUpEl, noteEl;

    function buildOverlay() {
        overlay = document.createElement('div');
        overlay.className = 'ra-overlay';
        overlay.hidden = true;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Read aloud');

        overlay.innerHTML =
            '<div class="ra-frame">' +
                '<div class="ra-top">' +
                    '<span class="ra-kicker"><b>Read aloud</b>' +
                        (WEEK ? ' · Week ' + WEEK : '') + '</span>' +
                    '<span class="sp"></span>' +
                    '<span class="ra-meta"><b class="ra-count"></b> · <span class="ra-clock">00:00</span></span>' +
                    '<button type="button" class="ra-x" aria-label="Close">&times;</button>' +
                '</div>' +
                '<div class="ra-prog"><i></i></div>' +
                '<div class="ra-stage">' +
                    '<div class="ra-inner">' +
                        '<p class="ra-prev" hidden></p>' +
                        '<p class="ra-chunk"></p>' +
                        '<div class="ra-turn">' +
                            '<span class="ra-badge" hidden></span>' +
                            '<span class="ra-name"></span>' +
                            '<span class="ra-note"></span>' +
                            '<button type="button" class="ra-skip" hidden>Skip</button>' +
                        '</div>' +
                        '<div class="ra-nextup"></div>' +
                        '<button type="button" class="ra-hear"></button>' +
                    '</div>' +
                    '<div class="ra-end">' +
                        '<h2 class="ra-end-title">Pass complete</h2>' +
                        '<div class="big ra-end-time">00:00</div>' +
                        '<p class="ra-end-sub"></p>' +
                        '<p class="ra-end-next"></p>' +
                        '<div style="display:flex;gap:.5rem;margin-top:.3rem">' +
                            '<button type="button" class="ra-btn primary ra-again">Read it again</button>' +
                            '<button type="button" class="ra-btn ra-close2">Close</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="ra-controls">' +
                    '<button type="button" class="ra-btn ra-back">&larr; Back</button>' +
                    '<button type="button" class="ra-btn primary ra-next">Next &rarr;</button>' +
                    '<span class="sp"></span>' +
                    '<span class="ra-hint"><kbd>Space</kbd> next · <kbd>&larr;</kbd> back · ' +
                        '<kbd>R</kbd> replay · <kbd>Esc</kbd> close</span>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        frame = overlay.querySelector('.ra-frame');
        prevEl = overlay.querySelector('.ra-prev');
        chunkEl = overlay.querySelector('.ra-chunk');
        turnEl = overlay.querySelector('.ra-turn');
        nextEl = overlay.querySelector('.ra-nextup');
        countEl = overlay.querySelector('.ra-count');
        clockEl = overlay.querySelector('.ra-clock');
        barEl = overlay.querySelector('.ra-prog i');
        endEl = overlay.querySelector('.ra-end');
        hearBtn = overlay.querySelector('.ra-hear');
        teamEl = overlay.querySelector('.ra-badge');
        nameEl = overlay.querySelector('.ra-name');
        nextUpEl = overlay.querySelector('.ra-nextup');
        noteEl = overlay.querySelector('.ra-note');

        overlay.querySelector('.ra-x').addEventListener('click', close);
        overlay.querySelector('.ra-close2').addEventListener('click', close);
        overlay.querySelector('.ra-next').addEventListener('click', function () { next(); });
        overlay.querySelector('.ra-back').addEventListener('click', function () { back(); });
        overlay.querySelector('.ra-again').addEventListener('click', again);
        hearBtn.addEventListener('click', toggleHear);
        overlay.querySelector('.ra-skip').addEventListener('click', function () {
            state.shift += 1;
            paint();
        });

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });
    }

    /* ---------------------------------------------------------------- paint --- */

    function fmt(ms) {
        var s = Math.max(0, Math.round(ms / 1000));
        return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2);
    }

    function paint() {
        var c = CHUNKS[state.i];
        var prev = state.i > 0 ? CHUNKS[state.i - 1].text : '';
        prevEl.textContent = prev ? '… ' + prev : '';
        prevEl.hidden = !prev;

        chunkEl.textContent = c.text;
        countEl.textContent = 'Chunk ' + (state.i + 1) + ' / ' + CHUNKS.length;
        barEl.style.width = ((state.i + 1) / CHUNKS.length * 100) + '%';

        var r = readerAt(turnNo() + state.shift);
        if (r.team) {
            teamEl.hidden = false;
            teamEl.textContent = r.team;
            teamEl.className = 'ra-badge' + (r.team === 'B' ? ' b' : '');
            nameEl.textContent = r.name;
            noteEl.textContent = '';
        } else {
            teamEl.hidden = true;
            nameEl.textContent = r.name;
            noteEl.textContent = 'reads this chunk';
        }
        overlay.querySelector('.ra-skip').hidden = !r.roster;

        var n = readerAt(turnNo() + 1 + state.shift);
        nextUpEl.innerHTML = 'Next: <b>' + esc(n.team ? 'Team ' + n.team + ' · ' + n.name : n.name) + '</b>';

        overlay.querySelector('.ra-back').disabled = state.i === 0;
        overlay.querySelector('.ra-next').textContent =
            state.i === CHUNKS.length - 1 ? 'Finish' : 'Next →';

        paintHear();
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* --------------------------------------------------------------- actions --- */

    function next() {
        if (endEl.classList.contains('on')) return;
        if (state.i === CHUNKS.length - 1) { finish(); return; }
        state.i += 1;
        paint();
        playChunk();
    }

    function back() {
        if (state.i === 0) return;
        state.i -= 1;
        paint();
        playChunk();
    }

    function finish() {
        stopAudio();
        endEl.querySelector('.ra-end-time').textContent = fmt(Date.now() - state.startedAt);
        endEl.querySelector('.ra-end-sub').textContent =
            CHUNKS.length + ' chunks · pass ' + state.pass;
        var n = readerAt(state.pass * CHUNKS.length + state.shift);
        endEl.querySelector('.ra-end-next').textContent =
            'Pass ' + (state.pass + 1) + ' starts with ' +
            (n.team ? 'Team ' + n.team + ' · ' + n.name : n.name) + '.';
        endEl.querySelector('.ra-end-title').textContent = 'Pass ' + state.pass + ' complete';
        endEl.classList.add('on');
    }

    function again() {
        endEl.classList.remove('on');
        state.pass += 1;
        state.i = 0;
        state.startedAt = Date.now();
        paint();
        playChunk();
    }

    function toggleHear() {
        var a = ensureAudio();
        if (a.paused) {
            if (!a.src) { playChunk(); return; }
            try { a.currentTime = 0; } catch (e) {}
            a.play().catch(function () {});
        } else {
            a.pause();
        }
    }

    function open() {
        if (!overlay) buildOverlay();
        injectStyle();
        buildQueue();
        if (endEl.classList.contains('on')) {
            endEl.classList.remove('on');
            state.pass += 1;
            state.i = 0;
        }
        state.open = true;
        state.startedAt = Date.now();
        overlay.hidden = false;
        document.body.style.overflow = 'hidden';
        paint();
        playChunk();
        clearInterval(state.timer);
        state.timer = setInterval(function () {
            clockEl.textContent = fmt(Date.now() - state.startedAt);
        }, 1000);
        overlay.querySelector('.ra-next').focus();
    }

    function close() {
        if (!overlay) return;
        stopAudio();
        state.open = false;
        overlay.hidden = true;
        document.body.style.overflow = '';
        clearInterval(state.timer);
        var btn = document.querySelector('.ra-open');
        if (btn) btn.focus();
    }

    document.addEventListener('keydown', function (e) {
        if (!state.open) return;
        if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'PageDown') {
            e.preventDefault(); next();
        } else if (e.code === 'ArrowLeft' || e.code === 'PageUp') {
            e.preventDefault(); back();
        } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault(); playChunk();
        } else if (e.key === 'Escape') {
            e.preventDefault(); close();
        }
    });

    /* --------------------------------------------------------------- mount --- */

    function mount() {
        var article = document.querySelector('.article');
        if (!article) return;
        injectStyle();
        var bar = document.createElement('div');
        bar.className = 'ra-launch';
        bar.innerHTML =
            '<button type="button" class="ra-open">&#9654; Read aloud</button>' +
            '<span class="ra-sub">One chunk at a time, with the recording. Turns follow the seating table.</span>';
        article.parentNode.insertBefore(bar, article);
        bar.querySelector('.ra-open').addEventListener('click', open);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }

    window.ReadAloud = {
        open: open,
        close: close,
        chunks: CHUNKS,
        debug: function () {
            return {
                tried: state.queueTried,
                queue: state.queue ? state.queue.length : null,
                seating: typeof window.Seating,
                groups: window.Seating ? window.Seating.hasGroups() : null
            };
        }
    };
})();
