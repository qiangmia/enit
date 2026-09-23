//
// theme.js — SITE-WIDE SKIN SYSTEM (no page logic)
//
// Allows the teacher to pick a UI theme in the Class Config page (Appearance tab).
// The choice is stored in localStorage['enit_theme'] and applied on EVERY page of
// the site. Each theme re-defines the shared :root CSS variables that every page
// already uses, plus a couple of targeted fixes for hard-coded spots.
//
// A page just needs to load this file as the LAST element inside <head>:
//   index.html        -> <script src="theme.js"></script>
//   Wk3/tic-tac-toe   -> <script src="../theme.js"></script>
//   etc.
//
// palettes come from the uupm.cc color catalog:
//   educational  = "Educational App"        (playful indigo + energetic orange)
//   gaming       = "Gaming"                 (neon purple + rose action, dark)
//   creative     = "Creative Agency"        (bold pink + cyan accent)
//   developer    = "Developer Tool / IDE"   (code dark + run green)

(function () {
    'use strict';

    var STORE_KEY = 'enit_theme';

    // --overlay-a/--overlay-b tint the photo header gradients (index.html,
    // lesson pages and supplementary units).
    // --primary-solid is used where white text sits on a solid primary
    // background (e.g. the selected week chips in the config page).
    var THEMES = {
        default: {
            label: 'ENIT Default',
            desc: 'Navy & white classroom look (current)',
            vars: {
                'bg': '#f7fafc',
                'card-bg': '#ffffff',
                'text': '#2d3748',
                'text-light': '#718096',
                'border': '#e2e8f0',
                'primary': '#1a365d',
                'primary-light': '#2c5282',
                'primary-solid': '#1a365d',
                'accent': '#2b6cb0',
                'accent-light': '#bee3f8',
                'warm': '#c05621',
                'warm-light': '#fefcbf',
                'success': '#276749',
                'success-bg': '#f0fff4',
                'error': '#c53030',
                'error-bg': '#fff5f5',
                'grammar-bg': '#faf5ff',
                'vocab-bg': '#fffaf0',
                'task-bg': '#f0fff4',
                'homework-bg': '#fff5f5',
                'info-bg': '#ebf8ff',
                'team-a': '#2b6cb0',
                'team-a-bg': '#ebf8ff',
                'team-b': '#805ad5',
                'team-b-bg': '#faf5ff',
                'overlay-a': 'rgba(30,58,95,0.85)',
                'overlay-b': 'rgba(30,58,95,0.90)'
            }
        },
        educational: {
            label: 'Educational Platform',
            desc: 'Playful indigo + energetic orange (Educational App palette)',
            vars: {
                'bg': '#eef2ff',
                'card-bg': '#ffffff',
                'text': '#1e1b4b',
                'text-light': '#6b7280',
                'border': '#c7d2fe',
                'primary': '#4f46e5',
                'primary-light': '#818cf8',
                'primary-solid': '#4338ca',
                'accent': '#4f46e5',
                'accent-light': '#c7d2fe',
                'warm': '#ea580c',
                'warm-light': '#fed7aa',
                'success': '#059669',
                'success-bg': '#ecfdf5',
                'error': '#dc2626',
                'error-bg': '#fee2e2',
                'grammar-bg': '#f5f3ff',
                'vocab-bg': '#fff7ed',
                'task-bg': '#ecfdf5',
                'homework-bg': '#fff1f2',
                'info-bg': '#eef2ff',
                'team-a': '#4f46e5',
                'team-a-bg': '#eef2ff',
                'team-b': '#db2777',
                'team-b-bg': '#fdf2f8',
                'overlay-a': 'rgba(67,56,202,0.85)',
                'overlay-b': 'rgba(79,70,229,0.92)'
            }
        },
        gaming: {
            label: 'Gaming Platform',
            desc: 'Neon purple + rose action on dark (Gaming palette)',
            vars: {
                'bg': '#0f0f23',
                'card-bg': '#1e1c35',
                'text': '#e2e8f0',
                'text-light': '#94a3b8',
                'border': '#2e2c4a',
                'primary': '#a78bfa',
                'primary-light': '#c4b5fd',
                'primary-solid': '#7c3aed',
                'accent': '#7c3aed',
                'accent-light': '#33294f',
                'warm': '#f43f5e',
                'warm-light': '#3a1030',
                'success': '#22c55e',
                'success-bg': '#122b1f',
                'error': '#f87171',
                'error-bg': '#3a0f14',
                'grammar-bg': '#241a38',
                'vocab-bg': '#2d1f14',
                'task-bg': '#12291e',
                'homework-bg': '#2f1420',
                'info-bg': '#221844',
                'team-a': '#a78bfa',
                'team-a-bg': '#241a38',
                'team-b': '#f472b6',
                'team-b-bg': '#2e1b2e',
                'overlay-a': 'rgba(76,29,149,0.88)',
                'overlay-b': 'rgba(46,16,101,0.94)'
            }
        },
        creative: {
            label: 'Creative Agency Portfolio',
            desc: 'Bold pink + cyan accent on soft pink (Creative Agency palette)',
            vars: {
                'bg': '#fdf2f8',
                'card-bg': '#ffffff',
                'text': '#831843',
                'text-light': '#9a6f85',
                'border': '#fbcfe8',
                'primary': '#db2777',
                'primary-light': '#f472b6',
                'primary-solid': '#be185d',
                'accent': '#db2777',
                'accent-light': '#fbcfe8',
                'warm': '#0891b2',
                'warm-light': '#a5f3fc',
                'success': '#059669',
                'success-bg': '#ecfdf5',
                'error': '#dc2626',
                'error-bg': '#fee2e2',
                'grammar-bg': '#f5f3ff',
                'vocab-bg': '#fff0f5',
                'task-bg': '#f0fdf5',
                'homework-bg': '#fff1f2',
                'info-bg': '#fce7f3',
                'team-a': '#db2777',
                'team-a-bg': '#fdf2f8',
                'team-b': '#0891b2',
                'team-b-bg': '#ecfeff',
                'overlay-a': 'rgba(219,39,119,0.82)',
                'overlay-b': 'rgba(244,114,182,0.92)'
            }
        },
        developer: {
            label: 'Developer Tools',
            desc: 'Code-dark slate + run green (Developer Tool / IDE palette)',
            vars: {
                'bg': '#0f172a',
                'card-bg': '#1b2336',
                'text': '#e2e8f0',
                'text-light': '#94a3b8',
                'border': '#334155',
                'primary': '#94a3b8',
                'primary-light': '#cbd5e1',
                'primary-solid': '#1e293b',
                'accent': '#22c55e',
                'accent-light': '#13301e',
                'warm': '#f97316',
                'warm-light': '#2b1f10',
                'success': '#22c55e',
                'success-bg': '#12291e',
                'error': '#f87171',
                'error-bg': '#3a1212',
                'grammar-bg': '#1e293b',
                'vocab-bg': '#1f2937',
                'task-bg': '#12291e',
                'homework-bg': '#2b1a1a',
                'info-bg': '#16213a',
                'team-a': '#22c55e',
                'team-a-bg': '#12291e',
                'team-b': '#38bdf8',
                'team-b-bg': '#0e2536',
                'overlay-a': 'rgba(15,23,42,0.88)',
                'overlay-b': 'rgba(15,23,42,0.95)'
            }
        }
    };

    function safeGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function safeSet(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
    }
    function safeRemove(key) {
        try { localStorage.removeItem(key); } catch (e) { /* private mode */ }
    }

    function current() {
        var key = safeGet(STORE_KEY);
        return THEMES[key] ? key : 'default';
    }

    function apply(key, persist) {
        if (!THEMES[key]) key = 'default';
        var t = THEMES[key];
        var css = ':root{';
        for (var name in t.vars) {
            if (t.vars.hasOwnProperty(name)) css += '--' + name + ':' + t.vars[name] + ';';
        }
        css += '}';
        // Target fixes for hard-coded spots that every page shares.
        css += '.week-chip.on{background-color:var(--primary-solid) !important;}';
        css += '.grammartag{background-color:var(--accent);}';
        css += '.tag{background-color:var(--accent-light);color:var(--primary);}';
        var el = document.getElementById('enit-theme-style');
        if (!el) {
            el = document.createElement('style');
            el.id = 'enit-theme-style';
            document.head.appendChild(el);
        }
        el.textContent = css;
        document.documentElement.setAttribute('data-theme', key);
        if (persist) safeSet(STORE_KEY, key);
    }

    function reset() {
        safeRemove(STORE_KEY);
        apply('default', false);
    }

    function list() {
        return Object.keys(THEMES).map(function (k) {
            return { id: k, label: THEMES[k].label, desc: THEMES[k].desc };
        });
    }

    window.ENIT_Theme = {
        apply: apply,
        reset: reset,
        current: current,
        list: list,
        THEMES: THEMES
    };

    apply(current(), false);
})();