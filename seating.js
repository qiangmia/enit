/* ==========================================================================
 * enit — shared seating & group model
 * --------------------------------------------------------------------------
 * Single source of truth for "who is in Group A / Group B".
 *
 *   Wk3/config.html       full editor  (assign / unassign / balance / save)
 *   Wk3/tic-tac-toe.html  read-only    (team rosters for the game)
 *   Wk4/tic-tac-toe.html  read-only
 *
 * PRIVACY: this file contains no student data. The roster lives only in this
 * browser's localStorage (key enit_roster_v1) and is loaded by the instructor
 * from their own roster.txt. The saved seating stores student IDs alone.
 *
 * Deliberately DOM-free so the whole model can be unit-tested under Node.
 * ========================================================================== */
(function (global) {
    'use strict';

    /* ── Geometry ─────────────────────────────────────────────────────────
     * The 7x10 grid is retained only as a *display* convention. Since the
     * roll-call model records group membership and nothing else, column
     * position carries no information beyond "which half of the grid".
     */
    var ROWS = 7;
    var COLS = 10;
    var COLS_PER_TEAM = 5;
    var SEATS_PER_TEAM = ROWS * COLS_PER_TEAM;   /* 35 per side */
    var TEAMS = ['A', 'B'];

    var ROSTER_KEY = 'enit_roster_v1';
    var SEATING_KEY = 'enit_seating';
    var SEATING_VERSION = 2;

    /* ── Storage ──────────────────────────────────────────────────────────
     * Falls back to an in-memory store when localStorage is unavailable
     * (private browsing, or Node during tests). Probed rather than assumed:
     * some privacy modes throw on property access, not just on write.
     */
    var memory = {};
    var memoryStore = {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null; },
        setItem: function (k, v) { memory[k] = String(v); },
        removeItem: function (k) { delete memory[k]; }
    };

    function store() {
        try {
            if (typeof localStorage !== 'undefined' && localStorage) {
                localStorage.getItem(ROSTER_KEY);
                return localStorage;
            }
        } catch (e) { /* fall through */ }
        return memoryStore;
    }

    /* ── Roster ────────────────────────────────────────────────────────── */

    function looksLikeId(s) {
        return /^[A-Za-z0-9][A-Za-z0-9_-]{2,}$/.test(s);
    }

    function splitRosterLine(line) {
        var byTab = line.split('\t');
        if (byTab.length >= 2) {
            var id = (byTab[0] || '').trim();
            var cn = (byTab[1] || '').trim();
            if (id && cn) return [id, cn, (byTab[2] || '').trim(), (byTab[3] || '').trim()];
            return null;
        }
        /* Fallback for comma- or wide-space-separated copies of the roster. */
        var byComma = line.split(/\s*,\s*/);
        if (byComma.length >= 2 && looksLikeId((byComma[0] || '').trim())) {
            return [(byComma[0] || '').trim(), (byComma[1] || '').trim(),
                    (byComma[2] || '').trim(), (byComma[3] || '').trim()];
        }
        return null;
    }

    /* Expected shape: id <TAB> chineseName <TAB> englishName <TAB> pinyin
     * (optional). The 4th column only feeds the roll-call search box; leave it
     * out and search falls back to Chinese name + English name + id. */
    function parseRoster(text) {
        var out = [];
        if (!text) return out;
        var lines = String(text).replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);
        for (var i = 0; i < lines.length; i++) {
            if (!lines[i] || !lines[i].trim()) continue;
            var parts = splitRosterLine(lines[i]);
            if (parts) {
                out.push({
                    id: parts[0],
                    chineseName: parts[1],
                    englishName: parts[2] || '',
                    pinyin: parts[3] || ''
                });
            }
        }
        return out;
    }

    /* Haystack for the roll-call search box. */
    function searchText(s) {
        return [s.id, s.chineseName, s.englishName, s.pinyin]
            .filter(Boolean).join(' ').toLowerCase();
    }

    function readStoredRoster() {
        try { return store().getItem(ROSTER_KEY) || ''; } catch (e) { return ''; }
    }

    function saveRoster(text) {
        try { store().setItem(ROSTER_KEY, text); return true; } catch (e) { return false; }
    }

    function clearRoster() {
        try { store().removeItem(ROSTER_KEY); } catch (e) {}
    }

    /* ── State ───────────────────────────────────────────────────────────
     * Object identity is kept stable across re-init so callers may hold a
     * reference to `groups` without it going stale.
     */
    var students = [];
    var groups = { A: [], B: [] };

    function resetGroups() { groups.A.length = 0; groups.B.length = 0; }

    function getStudents() { return students; }

    function findStudent(id) {
        for (var i = 0; i < students.length; i++) {
            if (students[i].id === id) return students[i];
        }
        return null;
    }

    /* Resolves an id to a student, synthesising a placeholder when the roster
     * has not been loaded (or no longer contains this id). Keeps the game
     * usable with only a saved seating and no roster. */
    function studentById(id) {
        return findStudent(id) || { id: id, chineseName: id, englishName: '', placeholder: true };
    }

    function teamOf(id) {
        if (groups.A.indexOf(id) !== -1) return 'A';
        if (groups.B.indexOf(id) !== -1) return 'B';
        return null;
    }

    function studentsInTeam(team) {
        if (TEAMS.indexOf(team) === -1) return [];
        return groups[team].map(studentById);
    }

    function unassignedStudents() {
        var out = [];
        for (var i = 0; i < students.length; i++) {
            if (teamOf(students[i].id) === null) out.push(students[i]);
        }
        return out;
    }

    function counts() {
        return { A: groups.A.length, B: groups.B.length, unassigned: unassignedStudents().length };
    }

    function hasGroups() { return groups.A.length + groups.B.length > 0; }

    /* ── Mutation ─────────────────────────────────────────────────────── */

    function removeFromGroups(id) {
        var a = [], b = [], i;
        for (i = 0; i < groups.A.length; i++) { if (groups.A[i] !== id) a.push(groups.A[i]); }
        for (i = 0; i < groups.B.length; i++) { if (groups.B[i] !== id) b.push(groups.B[i]); }
        groups.A = a;
        groups.B = b;
    }

    /* Assign to 'A' | 'B', or unassign when team is null. Idempotent: assigning
     * a student to the group they are already in succeeds without moving them,
     * which is what makes repeat roll calls safe. */
    function assign(id, team) {
        if (id === null || id === undefined || id === '') {
            return { ok: false, error: 'No student selected.' };
        }
        var current = teamOf(id);
        if (team === null || team === undefined) {
            if (current === null) return { ok: true, changed: false };
            removeFromGroups(id);
            return { ok: true, changed: true, id: id, from: current, to: null };
        }
        if (TEAMS.indexOf(team) === -1) {
            return { ok: false, error: 'Unknown group "' + team + '".' };
        }
        if (current === team) return { ok: true, changed: false, id: id, from: team, to: team };
        if (groups[team].length >= SEATS_PER_TEAM) {
            return { ok: false, error: 'Group ' + team + ' is full (' + SEATS_PER_TEAM + ' max). Assign the student to the other group or unassign them.' };
        }
        removeFromGroups(id);
        groups[team].push(id);
        return { ok: true, changed: true, id: id, from: current, to: team };
    }

    function unassign(id) { return assign(id, null); }

    /* Evens out the two groups. Moves in roster order so the result is
     * predictable rather than random. */
    function autoBalance() {
        var a = groups.A.length;
        var b = groups.B.length;
        if (a === b) return { count: 0, moved: [], A: a, B: b };
        var from = a > b ? 'A' : 'B';
        var to = from === 'A' ? 'B' : 'A';
        var want = Math.floor(Math.abs(a - b) / 2);
        var moved = [];
        var candidates = groups[from].slice();
        for (var i = 0; i < candidates.length && moved.length < want; i++) {
            var res = assign(candidates[i], to);
            if (res.ok && res.changed) moved.push({ id: candidates[i], from: from, to: to });
        }
        return { count: moved.length, moved: moved };
    }

    /* ── Persistence ───────────────────────────────────────────────────── */

    function sanitizeIds(arr) {
        var seen = {};
        var out = [];
        if (!Array.isArray(arr)) return out;
        for (var i = 0; i < arr.length; i++) {
            var id = arr[i];
            if (id === null || id === undefined) continue;
            id = String(id);
            if (!id || seen[id]) continue;
            seen[id] = true;
            out.push(id);
        }
        return out;
    }

    /* v1 payloads stored a 7x10 grid; membership was the column half. */
    function migrateGrid(grid) {
        var out = { A: [], B: [] };
        if (!Array.isArray(grid)) return out;
        for (var r = 0; r < grid.length; r++) {
            var row = grid[r];
            if (!Array.isArray(row)) continue;
            for (var c = 0; c < row.length; c++) {
                var cell = row[c];
                if (!cell) continue;
                var id = (typeof cell === 'object') ? cell.id : cell;
                if (id === null || id === undefined) continue;
                id = String(id);
                if (!id) continue;
                out[c < COLS_PER_TEAM ? 'A' : 'B'].push(id);
            }
        }
        return out;
    }

    function applyData(data) {
        resetGroups();
        if (!data) return;
        if (data.version >= SEATING_VERSION && data.groups) {
            groups.A = sanitizeIds(data.groups.A);
            groups.B = sanitizeIds(data.groups.B);
            /* Guard against a corrupted payload listing the same id twice. */
            groups.B = groups.B.filter(function (id) { return groups.A.indexOf(id) === -1; });
        } else if (data.grid) {
            var m = migrateGrid(data.grid);
            groups.A = m.A;
            groups.B = m.B;
        }
    }

    function save() {
        var payload = {
            version: SEATING_VERSION,
            savedAt: new Date().toISOString(),
            groups: { A: groups.A.slice(), B: groups.B.slice() }
        };
        try {
            store().setItem(SEATING_KEY, JSON.stringify(payload));
            return { ok: true, savedAt: payload.savedAt, count: groups.A.length + groups.B.length };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    function readSaved() {
        try {
            var raw = store().getItem(SEATING_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    }

    function load() {
        var data = readSaved();
        if (!data) return { ok: false, error: 'No saved groups found in this browser.' };
        applyData(data);
        return { ok: true, savedAt: data.savedAt, migrated: isLegacy(data) };
    }

    function clear() {
        try { store().removeItem(SEATING_KEY); } catch (e) {}
        resetGroups();
    }

    /* A v1 payload has no `version` field at all, so `undefined < 2` is false
       and the migration would go unreported. Test for absence explicitly. */
    function isLegacy(data) {
        return !!data && !(data.version >= SEATING_VERSION);
    }

    /* Load roster + saved groups together. */
    function init() {
        students = parseRoster(readStoredRoster());
        var data = readSaved();
        applyData(data);
        return {
            rosterCount: students.length,
            saved: !!data,
            migrated: isLegacy(data)
        };
    }

    /* ── Display helper ───────────────────────────────────────────────────
     * Synthesises the schematic grid for the "show seating grid" toggle.
     * Fills top-to-bottom then left-to-right, so position encodes assignment
     * order only — it is not the student's real seat. */
    function buildGrid() {
        var grid = [];
        var r, c;
        for (r = 0; r < ROWS; r++) {
            var row = [];
            for (c = 0; c < COLS; c++) row.push(null);
            grid.push(row);
        }
        TEAMS.forEach(function (team) {
            var start = team === 'A' ? 0 : COLS_PER_TEAM;
            var ids = groups[team];
            for (var i = 0; i < ids.length; i++) {
                var col = start + Math.floor(i / ROWS);
                if (col >= COLS) break;
                grid[i % ROWS][col] = studentById(ids[i]);
            }
        });
        return grid;
    }

    function teamForCol(c) { return c < COLS_PER_TEAM ? 'A' : 'B'; }

    function displayName(s) {
        return s.chineseName + (s.englishName ? ' (' + s.englishName + ')' : '');
    }

    /* ── Exports ───────────────────────────────────────────────────────── */

    var Seating = {
        ROWS: ROWS,
        COLS: COLS,
        COLS_PER_TEAM: COLS_PER_TEAM,
        SEATS_PER_TEAM: SEATS_PER_TEAM,
        TEAMS: TEAMS,
        ROSTER_KEY: ROSTER_KEY,
        SEATING_KEY: SEATING_KEY,
        SEATING_VERSION: SEATING_VERSION,
        groups: groups,

        parseRoster: parseRoster,
        searchText: searchText,
        readStoredRoster: readStoredRoster,
        saveRoster: saveRoster,
        clearRoster: clearRoster,

        init: init,
        isLegacy: isLegacy,
        getStudents: getStudents,
        studentById: studentById,
        teamOf: teamOf,
        studentsInTeam: studentsInTeam,
        unassignedStudents: unassignedStudents,
        counts: counts,
        hasGroups: hasGroups,

        assign: assign,
        unassign: unassign,
        autoBalance: autoBalance,

        save: save,
        load: load,
        clear: clear,
        readSaved: readSaved,
        applyData: applyData,
        migrateGrid: migrateGrid,
        buildGrid: buildGrid,
        teamForCol: teamForCol,
        displayName: displayName
    };

    global.Seating = Seating;

    if (typeof module !== 'undefined' && module.exports) module.exports = Seating;

})(typeof globalThis !== 'undefined' ? globalThis : this);
