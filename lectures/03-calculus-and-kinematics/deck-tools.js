/* ============================================================
   EPHE 341 — deck tools
   On-screen full-screen toggle + presenter view (second screen aware).
   No dependencies. Works offline.
   ============================================================ */
(function () {
'use strict';

if (/print-pdf/gi.test(window.location.search)) return;   // not in the PDF export

/* ---------------- icons ---------------- */
var ICON = {
  enter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  exit:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
  present: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="12.5" rx="1.5"/><path d="M12 16.5V20M8.5 20h7"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.4 9.2a2.7 2.7 0 1 1 3.4 2.6c-.5.2-.8.7-.8 1.2v.6"/><circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.4 19.6L6 18M18 6l1.6-1.6"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13.2A8.2 8.2 0 0 1 10.8 4a8.4 8.4 0 1 0 9.2 9.2z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16"/></svg>',
  pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/></svg>',
  board: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="1.6"/><path d="M12 17v3M9 20h6"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5L12 3.5l8.5 7"/><path d="M5.6 9v10.5h12.8V9"/><path d="M9.8 19.5v-6h4.4v6"/></svg>'
};

/* ---------------- styles ---------------- */
var css = document.createElement('style');
css.textContent = [
'#deck-tools{position:fixed;left:16px;bottom:14px;z-index:60;display:flex;gap:6px;',
'  align-items:center;font:500 13px/1 "Helvetica Neue",Helvetica,Arial,sans-serif;',
'  opacity:.28;transition:opacity .22s ease;}',
'#deck-tools:hover,#deck-tools.awake,#deck-tools:focus-within{opacity:1;}',
'#deck-tools button{display:inline-flex;align-items:center;gap:6px;cursor:pointer;',
'  font:inherit;color:var(--ink);background:var(--chip);border:1px solid var(--rule);',
'  border-radius:7px;padding:7px 11px;box-shadow:var(--shadow);}',
'#deck-tools button:hover{border-color:var(--brand);color:var(--brand);}',
'#deck-tools button.live{background:var(--brand);border-color:var(--brand);color:var(--bg);}',
'#deck-tools button.icon-only{padding:7px;}',
'#deck-tools svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.9;',
'  stroke-linecap:round;stroke-linejoin:round;flex:none;}',
'#deck-toast{position:fixed;left:50%;bottom:78px;transform:translateX(-50%) translateY(8px);',
'  z-index:61;max-width:34em;padding:11px 16px;border-radius:7px;background:#1d2026;color:#fff;',
'  font:400 14px/1.45 "Helvetica Neue",Helvetica,Arial,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.28);',
'  opacity:0;pointer-events:none;transition:opacity .22s ease,transform .22s ease;}',
'#deck-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}',
'#deck-toast b{color:#ffd9a0;font-weight:650;}',
'#deck-help{position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;',
'  background:rgba(20,24,30,.55);}',
'#deck-help.show{display:flex;}',
'#deck-help .card{background:var(--bg);border:1px solid var(--rule);border-radius:12px;padding:26px 30px;max-width:30em;',
'  box-shadow:0 14px 44px rgba(0,0,0,.42);font:400 15px/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--ink);}',
'#deck-help h3{margin:0 0 14px;font-size:17px;font-weight:650;color:var(--brand);}',
'#deck-help dl{display:grid;grid-template-columns:auto 1fr;gap:7px 16px;margin:0;}',
'#deck-help dt{font:650 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--surface);',
'  border:1px solid var(--rule);border-radius:5px;padding:1px 7px;justify-self:start;align-self:start;white-space:nowrap;}',
'#deck-help dd{margin:0;}',
'#deck-help .inknote{margin:16px 0 0;font-size:13px;color:var(--muted);line-height:1.45;}',
'#deck-help .inknote code{font:600 12px/1 ui-monospace,Menlo,monospace;background:var(--surface);',
'  border:1px solid var(--rule);border-radius:4px;padding:1px 5px;}',
'#deck-help .wipe{margin:14px 10px 0 0;font:inherit;font-size:13px;cursor:pointer;background:transparent;',
'  color:var(--muted);border:1px solid var(--rule);border-radius:6px;padding:8px 14px;}',
'#deck-help .wipe:hover{color:var(--accent);border-color:var(--accent);}',
'#deck-help .close{margin-top:18px;font:inherit;cursor:pointer;background:var(--brand);color:var(--bg);',
'  border:0;border-radius:6px;padding:8px 16px;}',
'#deck-menu{position:fixed;inset:0;z-index:72;display:none;}',
'#deck-menu.show{display:block;}',
'#deck-menu .veil{position:absolute;inset:0;background:rgba(8,12,20,.55);}',
'#deck-menu .panel{position:absolute;left:0;top:0;bottom:0;width:min(30em,84vw);',
'  background:var(--bg);border-right:1px solid var(--rule);box-shadow:8px 0 40px rgba(0,0,0,.4);',
'  display:flex;flex-direction:column;font:400 14px/1.4 ui-sans-serif,system-ui,sans-serif;color:var(--ink);}',
'#deck-menu .head{padding:16px 18px 10px;border-bottom:1px solid var(--rule);}',
'#deck-menu .head h3{margin:0 0 10px;font-size:15px;font-weight:650;color:var(--brand);}',
'#deck-menu input{width:100%;box-sizing:border-box;font:inherit;padding:9px 12px;border-radius:8px;',
'  border:1px solid var(--rule);background:var(--chip);color:var(--ink);outline:none;}',
'#deck-menu input:focus{border-color:var(--brand);}',
'#deck-menu .list{flex:1;overflow-y:auto;padding:8px 10px 18px;}',
'#deck-menu .row{display:flex;gap:12px;align-items:baseline;width:100%;text-align:left;cursor:pointer;',
'  font:inherit;background:none;border:0;border-radius:8px;padding:8px 10px;color:var(--ink);}',
'#deck-menu .row:hover,#deck-menu .row.sel{background:var(--surface);}',
'#deck-menu .row.here{box-shadow:inset 2px 0 0 var(--accent);}',
'#deck-menu .row .n{flex:none;width:2.2em;text-align:right;color:var(--muted);',
'  font-variant-numeric:tabular-nums;font-size:12.5px;}',
'#deck-menu .row .t{flex:1;min-width:0;}',
'#deck-menu .row .t i{display:block;font-style:normal;font-size:12px;color:var(--muted);',
'  margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
'#deck-menu .row.here .t b{color:var(--accent);}',
'#deck-menu .empty{padding:18px;color:var(--muted);font-size:13px;}',
'@media print{#deck-tools,#deck-toast,#deck-help,#deck-menu{display:none !important;}}'
].join('');
document.head.appendChild(css);

/* ---------------- toolbar ---------------- */
var bar = document.createElement('div');
bar.id = 'deck-tools';

function mkBtn(icon, label, title) {
  var b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = icon + (label ? '<span>' + label + '</span>' : '');
  if (!label) b.className = 'icon-only';
  b.title = title || label;
  b.setAttribute('aria-label', title || label);
  bar.appendChild(b);
  return b;
}
function setBtn(b, icon, label, title) {
  b.innerHTML = icon + (label ? '<span>' + label + '</span>' : '');
  b.title = title || label; b.setAttribute('aria-label', title || label);
}

/* opt-in: <body data-home="../../index.html">. A deck copied out on its own
   has no front page to go back to, so it simply has no button. */
var HOME = document.body.getAttribute('data-home');
if (HOME) {
  var homeBtn = mkBtn(ICON.home, '', 'Back to the course page');
  homeBtn.addEventListener('click', function () { window.location.href = HOME; });
}
var menuBtn = mkBtn(ICON.menu, 'Slides', 'Jump to a slide (M)');
var themeBtn = mkBtn(ICON.sun, '', 'Switch between the dark and light theme');
var fsBtn = mkBtn(ICON.enter, 'Full screen', 'Full screen (F)');
var presentBtn = mkBtn(ICON.present, 'Presenter view', 'Open presenter view with speaker notes (S)');
var inkBtn = mkBtn(ICON.pen, 'Write', 'Write on the slide — pen, arrows, notes (A)');
var boardBtn = mkBtn(ICON.board, '', 'Blank blackboard or whiteboard (D)');
var helpBtn = mkBtn(ICON.help, '', 'Keyboard shortcuts');
document.body.appendChild(bar);

/* On a phone held upright there is no keyboard, no second screen to put the
   presenter view on, and no sensible way to write on a slide with a fingertip
   — and the ink is anchored to the 16:9 slide box anyway. Take those buttons
   away rather than leaving them there to disappoint. */
function syncPortraitTools() {
  var p = !!window.DECK_PORTRAIT;
  [presentBtn, inkBtn, boardBtn, helpBtn].forEach(function (b) {
    b.style.display = p ? 'none' : '';
  });
}
syncPortraitTools();
window.addEventListener('ephe341-layout', syncPortraitTools);

/* ---- the ink layer lives in annotate.js; these just drive it ---- */
function ink() { return window.EPHE341_INK; }
inkBtn.addEventListener('click', function () { if (ink()) ink().toggle(); inkBtn.blur(); syncInk(); });
boardBtn.addEventListener('click', function () { if (ink()) ink().board(); boardBtn.blur(); syncInk(); });
function syncInk() {
  var k = ink(); if (!k) return;
  inkBtn.classList.toggle('live', k.isOpen());
  boardBtn.classList.toggle('live', k.isBoard());
}
setInterval(syncInk, 400);

/* wake the toolbar briefly whenever the mouse moves */
var sleepTimer;
document.addEventListener('mousemove', function () {
  bar.classList.add('awake');
  clearTimeout(sleepTimer);
  sleepTimer = setTimeout(function () { bar.classList.remove('awake'); }, 2600);
});


/* ============================================================
   SLIDE MENU — jump to any slide by number or heading
   ============================================================ */
var menu = document.createElement('div');
menu.id = 'deck-menu';
menu.innerHTML =
  '<div class="veil"></div>' +
  '<div class="panel" role="dialog" aria-label="Jump to a slide">' +
    '<div class="head"><h3>Jump to a slide</h3>' +
      '<input type="text" placeholder="Type a heading or a slide number…" aria-label="Filter slides">' +
    '</div>' +
    '<div class="list"></div>' +
  '</div>';
document.body.appendChild(menu);

var menuInput = menu.querySelector('input');
var menuList = menu.querySelector('.list');
var entries = [], sel = 0;

function buildEntries() {
  entries = [];
  var secs = document.querySelectorAll('.reveal .slides > section');
  Array.prototype.forEach.call(secs, function (sec, i) {
    var h = sec.querySelector('h2, h1');
    var sub = sec.querySelector('h3');
    var lead = sec.querySelector('.lead, p');
    var title = h ? h.textContent.trim() : '(untitled)';
    var note = sub ? sub.textContent.trim()
             : (lead ? lead.textContent.trim().replace(/\s+/g, ' ').slice(0, 78) : '');
    entries.push({ i: i, title: title, note: note,
                   hay: (title + ' ' + note + ' ' + (i + 1)).toLowerCase() });
  });
}

function renderList() {
  var q = menuInput.value.trim().toLowerCase();
  var num = /^\d+$/.test(q) ? parseInt(q, 10) : null;
  var hits = entries.filter(function (e) {
    if (num) return e.i + 1 === num || String(e.i + 1).indexOf(q) === 0;
    return !q || e.hay.indexOf(q) !== -1;
  });
  if (sel >= hits.length) sel = Math.max(0, hits.length - 1);
  var cur = window.Reveal ? Reveal.getIndices().h : -1;
  if (!hits.length) { menuList.innerHTML = '<div class="empty">No slide matches that.</div>'; return; }
  menuList.innerHTML = hits.map(function (e, k) {
    return '<button class="row' + (k === sel ? ' sel' : '') + (e.i === cur ? ' here' : '') +
      '" data-i="' + e.i + '"><span class="n">' + (e.i + 1) + '</span>' +
      '<span class="t"><b>' + e.title + '</b>' + (e.note ? '<i>' + e.note + '</i>' : '') +
      '</span></button>';
  }).join('');
  Array.prototype.forEach.call(menuList.querySelectorAll('.row'), function (r) {
    r.addEventListener('click', function () { jump(parseInt(r.getAttribute('data-i'), 10)); });
  });
  var selEl = menuList.querySelector('.row.sel');
  if (selEl && selEl.scrollIntoView) selEl.scrollIntoView({ block: 'nearest' });
}

function jump(i) { closeMenu(); if (window.Reveal) Reveal.slide(i, 0); }

function openMenu() {
  buildEntries(); sel = 0;
  menuInput.value = '';
  menu.classList.add('show');
  renderList();
  setTimeout(function () { menuInput.focus(); }, 30);
}
function closeMenu() { menu.classList.remove('show'); }
function menuOpen() { return menu.classList.contains('show'); }

menuBtn.addEventListener('click', function () { openMenu(); menuBtn.blur(); });
menu.querySelector('.veil').addEventListener('click', closeMenu);
menuInput.addEventListener('input', function () { sel = 0; renderList(); });
menuInput.addEventListener('keydown', function (e) {
  var rows = menuList.querySelectorAll('.row');
  if (e.key === 'ArrowDown') { sel = Math.min(rows.length - 1, sel + 1); renderList(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); renderList(); e.preventDefault(); }
  else if (e.key === 'Enter') {
    var r = menuList.querySelector('.row.sel');
    if (r) jump(parseInt(r.getAttribute('data-i'), 10));
    e.preventDefault();
  } else if (e.key === 'Escape') { closeMenu(); e.preventDefault(); }
  e.stopPropagation();          /* keep reveal from acting on these keys */
});
document.addEventListener('keydown', function (e) {
  if (menuOpen()) {
    if (e.key === 'Escape') { closeMenu(); e.stopPropagation(); }
    return;
  }
  if ((e.key === 'm' || e.key === 'M') && !e.metaKey && !e.ctrlKey && !e.altKey) {
    var el = document.activeElement;
    if (el && /input|textarea|select/i.test(el.tagName)) return;
    openMenu(); e.preventDefault();
  }
}, true);

/* ---------------- theme ---------------- */
function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }
function syncThemeBtn() {
  var dark = currentTheme() === 'dark';
  setBtn(themeBtn, dark ? ICON.sun : ICON.moon, '',
    dark ? 'Switch to the light theme' : 'Switch to the dark theme');
}
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('ephe341-theme', t); } catch (e) {}
  syncThemeBtn();
  window.dispatchEvent(new Event('ephe341-theme'));   // the figures repaint themselves
}
themeBtn.addEventListener('click', function () {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  themeBtn.blur();
});
document.addEventListener('keydown', function (e) {
  if ((e.key === 't' || e.key === 'T') && !e.metaKey && !e.ctrlKey && !e.altKey) {
    var el = document.activeElement;
    if (el && /input|textarea|select/i.test(el.tagName)) return;
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  }
});
syncThemeBtn();

/* ---------------- toast ---------------- */
var toast = document.createElement('div');
toast.id = 'deck-toast';
document.body.appendChild(toast);
var toastTimer;
function say(html, ms) {
  toast.innerHTML = html;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove('show'); }, ms || 5200);
}

/* ---------------- full screen ---------------- */
function isFull() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
function enterFull(el) {
  el = el || document.documentElement;
  var r = el.requestFullscreen || el.webkitRequestFullscreen;
  if (r) { try { return r.call(el); } catch (e) {} }
  return Promise.reject();
}
function exitFull() {
  var x = document.exitFullscreen || document.webkitExitFullscreen;
  if (x && isFull()) { try { return x.call(document); } catch (e) {} }
  return Promise.resolve();
}
function syncFsBtn() {
  if (isFull()) setBtn(fsBtn, ICON.exit, 'Exit full screen', 'Exit full screen (F or Esc)');
  else setBtn(fsBtn, ICON.enter, 'Full screen', 'Full screen (F)');
}
fsBtn.addEventListener('click', function () {
  if (isFull()) exitFull(); else enterFull();
  fsBtn.blur();
});
['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
  document.addEventListener(ev, syncFsBtn);
});
syncFsBtn();

/* ---------------- presenter view ---------------- */
var speakerWin = null;

/* RevealNotes.open() doesn't hand back the popup, so borrow it from window.open */
function notesPlugin() {
  // the live instance lives on Reveal; window.RevealNotes is only the factory
  try { if (window.Reveal && Reveal.getPlugin) return Reveal.getPlugin('notes') || null; } catch (e) {}
  return null;
}
function openSpeakerWindow() {
  var plugin = notesPlugin();
  if (!plugin || typeof plugin.open !== 'function') return null;
  var orig = window.open, grabbed = null;
  window.open = function () { grabbed = orig.apply(window, arguments); return grabbed; };
  try { plugin.open(); } catch (e) { /* fall through */ }
  window.open = orig;
  return grabbed;
}

function speakerAlive() {
  try { return speakerWin && !speakerWin.closed; } catch (e) { return false; }
}

/* Chrome's Window Management API lets us park the notes window on the other display */
function screenDetails() {
  if (!window.getScreenDetails) return Promise.resolve(null);
  return window.getScreenDetails().catch(function () { return null; });
}

function startPresenting() {
  var win = openSpeakerWindow();
  if (!win) {
    say('Your browser blocked the presenter window. Allow pop-ups for this page, then try again.');
    return;
  }
  speakerWin = win;
  syncPresentBtn();

  screenDetails().then(function (d) {
    var other = null;
    if (d && d.screens && d.screens.length > 1) {
      for (var i = 0; i < d.screens.length; i++) {
        if (d.screens[i] !== d.currentScreen) { other = d.screens[i]; break; }
      }
    }
    if (other) {
      // notes on the second screen, slides full screen on this one
      try {
        speakerWin.moveTo(other.availLeft, other.availTop);
        speakerWin.resizeTo(other.availWidth, other.availHeight);
      } catch (e) {}
      enterFull();
      say('Presenting — slides here, <b>speaker notes on your second screen</b>.');
    } else if (d) {
      enterFull();
      say('Presenting. Only one screen detected — drag the speaker-notes window across if you connect another.');
    } else {
      say('Presenter view opened in a new window. <b>Drag it to your second screen</b>, then press Full screen here.');
    }
  });

  // if the presenter closes the notes window, reset the button
  var poll = setInterval(function () {
    if (!speakerAlive()) { clearInterval(poll); speakerWin = null; syncPresentBtn(); }
  }, 1000);
}

function stopPresenting() {
  try { if (speakerAlive()) speakerWin.close(); } catch (e) {}
  speakerWin = null;
  exitFull();
  syncPresentBtn();
}

function syncPresentBtn() {
  if (speakerAlive()) {
    presentBtn.classList.add('live');
    setBtn(presentBtn, ICON.stop, 'Stop presenting', 'Close presenter view and leave full screen');
  } else {
    presentBtn.classList.remove('live');
    setBtn(presentBtn, ICON.present, 'Presenter view', 'Open presenter view with speaker notes (S)');
  }
}
presentBtn.addEventListener('click', function () {
  if (speakerAlive()) stopPresenting(); else startPresenting();
  presentBtn.blur();
});
window.addEventListener('beforeunload', function () {
  try { if (speakerAlive()) speakerWin.close(); } catch (e) {}
});

/* ---------------- shortcuts card ---------------- */
var help = document.createElement('div');
help.id = 'deck-help';
help.innerHTML =
  '<div class="card" role="dialog" aria-label="Keyboard shortcuts">' +
  '<h3>Keyboard shortcuts</h3><dl>' +
  '<dt>→ / Space</dt><dd>Next slide</dd>' +
  '<dt>←</dt><dd>Previous slide</dd>' +
  '<dt>F</dt><dd>Full screen</dd>' +
  '<dt>Esc</dt><dd>Leave full screen, or show the slide grid</dd>' +
  '<dt>S</dt><dd>Presenter view (speaker notes)</dd>' +
  '<dt>B</dt><dd>Black the screen</dd>' +
  '<dt>T</dt><dd>Switch between the dark and light theme</dd>' +
  '<dt>M</dt><dd>Jump to a slide — search by heading or number</dd>' +
  '<dt>A</dt><dd>Write on the slide — pen, arrow, highlighter, typed note, eraser</dd>' +
  '<dt>D</dt><dd>Blank board over the slide (blackboard or whiteboard)</dd>' +
  '<dt>P R H N E</dt><dd>Pen · aRrow · Highlighter · Note · Erase, while writing</dd>' +
  '<dt>1 … 5</dt><dd>Pick a pen colour</dd>' +
  '<dt>Z / X</dt><dd>Undo · clear this page</dd>' +
  '<dt>Alt + click</dt><dd>Zoom into part of a slide</dd>' +
  '<dt>Ctrl/⌘ + F</dt><dd>Search the deck</dd>' +
  '</dl>' +
  '<p class="inknote">Written notes and boards are kept in this browser and are drawn into the ' +
  'PDF export. Print with <code>?print-pdf&amp;clean</code> for a copy without them.</p>' +
  '<button class="wipe" type="button">Erase every annotation in this deck</button>' +
  '<button class="close" type="button">Close</button></div>';
document.body.appendChild(help);
helpBtn.addEventListener('click', function () { help.classList.add('show'); helpBtn.blur(); });
help.addEventListener('click', function (e) {
  if (e.target === help || e.target.classList.contains('close')) help.classList.remove('show');
  if (e.target.classList.contains('wipe')) {
    if (window.EPHE341_INK && window.confirm('Erase every written note and board in this deck? This cannot be undone.')) {
      window.EPHE341_INK.clearAll();
      say('All written notes and boards erased.');
      help.classList.remove('show');
    }
  }
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && help.classList.contains('show')) {
    help.classList.remove('show'); e.stopPropagation();
  }
}, true);

/* keep the button in sync when the deck's own S / F shortcuts are used */
setInterval(function () { syncPresentBtn(); }, 1500);
})();
