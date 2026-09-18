/* ============================================================
   EPHE 341 — write on the slides
   A pen, arrows, a highlighter, typed notes and an eraser, plus blank
   blackboard / whiteboard pages. Everything is stored per slide in the
   browser and redrawn in the PDF export, so whatever you wrote in the
   lecture is on the handout.

   Ink is stored in SLIDE coordinates (1280 x 720), never in screen pixels,
   so it stays put when the window resizes, when a slide is auto-fitted,
   and when the same deck is laid out for print.
   ============================================================ */
(function () {
'use strict';

var PRINT = /print-pdf/gi.test(window.location.search);
var CLEAN = /[?&]clean\b/i.test(window.location.search);   /* ?print-pdf&clean = no ink */
var KEY = 'ephe341-ink-v1';
var SW = 1280, SH = 720;

/* ---------------- storage ---------------- */
var store = {};
try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
var saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function () {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
  }, 250);
}
function slideKey(sec) {
  var all = document.querySelectorAll('.reveal .slides > section');
  return 's' + Array.prototype.indexOf.call(all, sec);
}
function page(key) {
  if (!store[key]) store[key] = { ink: [], boards: [] };
  if (!store[key].ink) store[key].ink = [];
  if (!store[key].boards) store[key].boards = [];
  return store[key];
}
function hasAnything(key) {
  var p = store[key];
  if (!p) return false;
  if (p.ink && p.ink.length) return true;
  return !!(p.boards && p.boards.some(function (b) { return b.ink && b.ink.length; }));
}

/* ---------------- palette ----------------
   index -> [on a dark ground, on a light ground] */
var PAL = [
  ['#f87171', '#c2410c'],
  ['#fbbf24', '#b45309'],
  ['#4ade80', '#2f6d4f'],
  ['#38bdf8', '#0b6fa4'],
  ['#f1f5f9', '#111111']
];
var PEN_W = [2.4, 4.6, 8.5];
var HI_W = [16, 26, 38];
var TEXT_S = [24, 34, 46];

function darkGround() {
  if (board.on) return board.bg === 'black';
  if (PRINT) return false;
  return document.documentElement.getAttribute('data-theme') !== 'light';
}
function colOf(ci, dark) { return PAL[ci % PAL.length][dark ? 0 : 1]; }

/* ---------------- drawing ---------------- */
function drawStrokes(c, list, sx, sy, dark) {
  if (!list || !list.length) return;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  list.forEach(function (st) {
    var col = colOf(st.c, dark);
    if (st.t === 'text') {
      c.globalAlpha = 1;
      c.fillStyle = col;
      c.font = '650 ' + (TEXT_S[st.w] * sy) + 'px ui-sans-serif,system-ui,-apple-system,sans-serif';
      c.textBaseline = 'top';
      String(st.v || '').split('\n').forEach(function (line, i) {
        c.fillText(line, st.p[0][0] * sx, (st.p[0][1] + i * TEXT_S[st.w] * 1.22) * sy);
      });
      return;
    }
    var w = (st.t === 'hi' ? HI_W[st.w] : PEN_W[st.w]);
    c.globalAlpha = st.t === 'hi' ? 0.32 : 1;
    c.strokeStyle = col;
    c.lineWidth = w * ((sx + sy) / 2);
    if (st.t === 'arrow') {
      var a = st.p[0], b = st.p[st.p.length - 1];
      c.beginPath();
      c.moveTo(a[0] * sx, a[1] * sy); c.lineTo(b[0] * sx, b[1] * sy); c.stroke();
      var ang = Math.atan2((b[1] - a[1]) * sy, (b[0] - a[0]) * sx);
      var hl = Math.max(15, w * 4.2) * ((sx + sy) / 2);
      c.beginPath();
      c.moveTo(b[0] * sx, b[1] * sy);
      c.lineTo(b[0] * sx - hl * Math.cos(ang - 0.42), b[1] * sy - hl * Math.sin(ang - 0.42));
      c.moveTo(b[0] * sx, b[1] * sy);
      c.lineTo(b[0] * sx - hl * Math.cos(ang + 0.42), b[1] * sy - hl * Math.sin(ang + 0.42));
      c.stroke();
      return;
    }
    c.beginPath();
    st.p.forEach(function (q, i) {
      if (i === 0) c.moveTo(q[0] * sx, q[1] * sy); else c.lineTo(q[0] * sx, q[1] * sy);
    });
    if (st.p.length === 1) { c.lineTo(st.p[0][0] * sx + 0.1, st.p[0][1] * sy); }
    c.stroke();
  });
  c.restore();
}

/* ============================================================
   PRINT — draw everything into the exported pages
   ============================================================ */
if (PRINT) {
  if (CLEAN) return;
  /* board pages become real slides, inserted straight after their slide,
     so reveal lays them out as pages of their own */
  (function injectBoards() {
    var secs = document.querySelectorAll('.reveal .slides > section');
    Array.prototype.forEach.call(secs, function (sec, i) {
      /* stamp the index now — reveal rewraps every section for print and the
         original document order is no longer queryable afterwards */
      sec.setAttribute('data-ink-slide', i);
      var p = store['s' + i];
      if (!p || !p.boards) return;
      var after = sec;
      p.boards.forEach(function (b, bi) {
        if (!b.ink || !b.ink.length) return;
        var s = document.createElement('section');
        s.className = 'ink-boardpage';
        s.setAttribute('data-ink-board', i + ':' + bi);
        s.innerHTML = '<div class="ink-boardpage-in"><span class="ink-boardpage-tag">Board — slide ' +
          (i + 1) + (p.boards.length > 1 ? ', page ' + (bi + 1) : '') + '</span></div>';
        after.parentNode.insertBefore(s, after.nextSibling);
        after = s;
      });
    });
  })();

  function paintPrint() {
    var pages = document.querySelectorAll('.pdf-page');
    if (!pages.length) return;
    Array.prototype.forEach.call(pages, function (pg) {
      if (pg.querySelector('canvas.ink-print')) return;
      var sec = pg.querySelector(':scope > section') || pg.querySelector('section');
      if (!sec) return;
      var bp = sec.getAttribute('data-ink-board');
      var list;
      if (bp) {
        var ix = bp.split(':');
        var pr = store['s' + ix[0]];
        list = pr && pr.boards && pr.boards[+ix[1]] ? pr.boards[+ix[1]].ink : null;
      } else {
        var n = sec.getAttribute('data-ink-slide');
        var pd = n == null ? null : store['s' + n];
        list = pd ? pd.ink : null;
      }
      if (!list || !list.length) return;
      /* Anchor to the slide's own 1280x720 box, exactly as on screen. The
         section carries a fit zoom; clear it for the measurement or the box
         comes back scaled and the writing drifts off the content. */
      var z = sec.style.zoom;
      sec.style.zoom = '';
      var sr = sec.getBoundingClientRect(), pr = pg.getBoundingClientRect();
      sec.style.zoom = z;
      var w = sr.width, h = sr.height, s = w / SW;
      if (!w) return;
      var cv = document.createElement('canvas');
      cv.className = 'ink-print';
      var dpr = 2;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.cssText = 'position:absolute;left:' + (sr.left - pr.left) + 'px;top:' +
        (sr.top - pr.top) + 'px;width:' + w + 'px;height:' + h +
        'px;pointer-events:none;z-index:40;';
      var c = cv.getContext('2d');
      c.scale(dpr, dpr);
      /* the handout is on white paper, so always the light palette */
      drawStrokes(c, list, s, s, false);
      if (getComputedStyle(pg).position === 'static') pg.style.position = 'relative';
      pg.appendChild(cv);
    });
  }
  if (window.Reveal) Reveal.on('pdf-ready', function () { setTimeout(paintPrint, 60); });
  [1600, 2600, 3600, 4800].forEach(function (ms) { setTimeout(paintPrint, ms); });
  return;
}

/* ============================================================
   SCREEN
   ============================================================ */
var css = document.createElement('style');
css.textContent = [
'#ink-bg{position:fixed;inset:0;z-index:38;display:none;}',
'#ink-bg.on{display:block;}',
'#ink-bg.black{background:#10211c;background-image:radial-gradient(rgba(255,255,255,.045) 1px,transparent 1px);background-size:5px 5px;}',
'#ink-bg.white{background:#fbfbf9;}',
'#ink-layer{position:fixed;inset:0;z-index:39;pointer-events:none;}',
'#ink-layer.armed{pointer-events:auto;cursor:crosshair;}',
'#ink-bar{position:fixed;left:50%;bottom:62px;transform:translateX(-50%);z-index:62;display:none;',
'  gap:5px;align-items:center;background:var(--chip);border:1px solid var(--rule);border-radius:10px;',
'  padding:6px 8px;box-shadow:var(--shadow);font:500 13px/1 ui-sans-serif,system-ui,sans-serif;}',
'#ink-bar.on{display:flex;}',
'#ink-bar button{display:inline-flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;',
'  font:inherit;color:var(--ink);background:transparent;border:1px solid transparent;border-radius:7px;',
'  padding:6px 8px;min-width:32px;}',
'#ink-bar button:hover{border-color:var(--rule);color:var(--brand);}',
'#ink-bar button.on{background:var(--brand);border-color:var(--brand);color:var(--bg);}',
'#ink-bar svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;',
'  stroke-linecap:round;stroke-linejoin:round;}',
'#ink-bar .sep{width:1px;align-self:stretch;background:var(--rule);margin:2px 4px;}',
'#ink-bar .sw{width:20px;height:20px;border-radius:50%;border:2px solid transparent;padding:0;min-width:0;}',
'#ink-bar .sw.on{border-color:var(--ink);}',
'#ink-bar .wd i{display:block;background:currentColor;border-radius:99px;width:15px;}',
'#ink-bar .pg{font-variant-numeric:tabular-nums;color:var(--muted);padding:0 2px;min-width:2.6em;text-align:center;}',
'#ink-text{position:fixed;z-index:64;display:none;background:transparent;border:0;outline:0;',
'  border-bottom:2px dashed currentColor;font:650 30px/1.2 ui-sans-serif,system-ui,sans-serif;',
'  padding:0 2px;min-width:2em;}',
'#ink-text.on{display:block;}',
'.ink-flag{position:fixed;right:16px;bottom:16px;z-index:37;font:600 11px/1 ui-sans-serif,system-ui,sans-serif;',
'  color:var(--muted);opacity:.5;letter-spacing:.06em;text-transform:uppercase;display:none;}',
'.ink-flag.on{display:block;}'
].join('\n');
document.head.appendChild(css);

var bg = document.createElement('div'); bg.id = 'ink-bg';
var layer = document.createElement('canvas'); layer.id = 'ink-layer';
var flag = document.createElement('div'); flag.className = 'ink-flag';
document.body.appendChild(bg); document.body.appendChild(layer); document.body.appendChild(flag);
var ctx = layer.getContext('2d');

var tool = null;               /* null | pen | arrow | hi | text | erase */
var ci = 0, wi = 1;
var board = { on: false, bg: 'black', i: 0 };
var undoStack = [];

function curSection() {
  return (window.Reveal && Reveal.getCurrentSlide && Reveal.getCurrentSlide()) ||
         document.querySelector('.reveal .slides > section.present');
}
function curKey() { var s = curSection(); return s ? slideKey(s) : 's0'; }
var EMPTY = [];
/* read-only: never create a record just by looking at a slide */
function curList() {
  var p = store[curKey()];
  if (!p) return EMPTY;
  if (board.on) return (p.boards && p.boards[board.i]) ? p.boards[board.i].ink : EMPTY;
  return p.ink || EMPTY;
}
/* writable: call this only when something is actually being added */
function curListW() {
  var p = page(curKey());
  if (board.on) {
    while (p.boards.length <= board.i) p.boards.push({ bg: board.bg, ink: [] });
    return p.boards[board.i].ink;
  }
  return p.ink;
}

/* where the 1280x720 slide sits on screen */
function box() {
  var el = document.querySelector('.reveal .slides');
  if (board.on || !el) {
    /* a board fills the window, keeping the slide's aspect */
    var W = window.innerWidth, H = window.innerHeight, s = Math.min(W / SW, H / SH);
    return { left: (W - SW * s) / 2, top: (H - SH * s) / 2, s: s };
  }
  var r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, s: r.width / SW };
}
function toSlide(ev) {
  var b = box();
  return [(ev.clientX - b.left) / b.s, (ev.clientY - b.top) / b.s];
}

function resize() {
  var dpr = Math.max(2, window.devicePixelRatio || 1);
  layer.width = Math.round(window.innerWidth * dpr);
  layer.height = Math.round(window.innerHeight * dpr);
  layer.style.width = window.innerWidth + 'px';
  layer.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redraw();
}
function redraw() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  var b = box(), dark = darkGround();
  ctx.save();
  ctx.translate(b.left, b.top);
  drawStrokes(ctx, curList(), b.s, b.s, dark);
  if (live) drawStrokes(ctx, [live], b.s, b.s, dark);
  ctx.restore();
  flag.classList.toggle('on', !board.on && curList().length > 0 && !tool);
  flag.textContent = 'annotated';
  syncBar();
}

/* ---------------- drawing gestures ---------------- */
var live = null, drawing = false;

layer.addEventListener('pointerdown', function (e) {
  if (!tool) return;
  layer.setPointerCapture(e.pointerId);
  var p = toSlide(e);
  if (tool === 'text') { openText(p, e); return; }
  if (tool === 'erase') { drawing = true; eraseAt(p); return; }
  drawing = true;
  live = { t: tool, c: ci, w: wi, p: [p] };
  redraw();
  e.preventDefault();
});
layer.addEventListener('pointermove', function (e) {
  if (!drawing) return;
  var p = toSlide(e);
  if (tool === 'erase') { eraseAt(p); return; }
  if (!live) return;
  if (tool === 'arrow') live.p[1] = p;
  else {
    var last = live.p[live.p.length - 1];
    if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) > 1.2) live.p.push(p);
  }
  redraw();
});
function endStroke() {
  if (!drawing) return;
  drawing = false;
  if (live) {
    if (live.t === 'arrow' && live.p.length < 2) { live = null; redraw(); return; }
    pushUndo();
    live.p = live.p.map(function (q) { return [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]; });
    curListW().push(live);
    live = null; save();
  }
  redraw();
}
layer.addEventListener('pointerup', endStroke);
layer.addEventListener('pointercancel', endStroke);
layer.addEventListener('pointerleave', function () { if (drawing && tool !== 'erase') endStroke(); });

function eraseAt(p) {
  var list = curList(), hit = -1, i, j;
  for (i = list.length - 1; i >= 0 && hit < 0; i--) {
    var st = list[i];
    var r = st.t === 'hi' ? HI_W[st.w] : (st.t === 'text' ? TEXT_S[st.w] : PEN_W[st.w] + 8);
    for (j = 0; j < st.p.length; j++) {
      if (Math.hypot(st.p[j][0] - p[0], st.p[j][1] - p[1]) < r) { hit = i; break; }
      if (j) {
        var a = st.p[j - 1], b2 = st.p[j];
        var dx = b2[0] - a[0], dy = b2[1] - a[1], L2 = dx * dx + dy * dy;
        if (L2 > 0) {
          var t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
          if (Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]) < r) { hit = i; break; }
        }
      }
    }
    if (st.t === 'text' && Math.abs(p[0] - st.p[0][0]) < 300 &&
        p[1] > st.p[0][1] - 6 && p[1] < st.p[0][1] + TEXT_S[st.w] * 1.3) hit = i;
  }
  if (hit >= 0) { pushUndo(); list.splice(hit, 1); save(); redraw(); }
}

/* ---------------- typed notes ---------------- */
var tbox = document.createElement('input');
tbox.id = 'ink-text'; tbox.type = 'text'; tbox.setAttribute('spellcheck', 'false');
document.body.appendChild(tbox);
var textAt = null;
function openText(p, e) {
  var b = box();
  textAt = p;
  tbox.value = '';
  tbox.style.left = (b.left + p[0] * b.s) + 'px';
  tbox.style.top = (b.top + p[1] * b.s) + 'px';
  tbox.style.fontSize = (TEXT_S[wi] * b.s) + 'px';
  tbox.style.color = colOf(ci, darkGround());
  tbox.classList.add('on');
  setTimeout(function () { tbox.focus(); }, 0);
  if (e) e.preventDefault();
}
function closeText(commit) {
  if (!textAt) return;
  var v = tbox.value.trim();
  if (commit && v) {
    pushUndo();
    curListW().push({ t: 'text', c: ci, w: wi, p: [[Math.round(textAt[0]), Math.round(textAt[1])]], v: v });
    save();
  }
  textAt = null; tbox.classList.remove('on'); tbox.blur(); redraw();
}
tbox.addEventListener('keydown', function (e) {
  e.stopPropagation();
  if (e.key === 'Enter') { closeText(true); e.preventDefault(); }
  else if (e.key === 'Escape') { closeText(false); e.preventDefault(); }
});
tbox.addEventListener('blur', function () { closeText(true); });

/* ---------------- undo ---------------- */
function pushUndo() {
  undoStack.push({ k: curKey(), b: board.on ? board.i : -1, snap: curListW().slice() });
  if (undoStack.length > 80) undoStack.shift();
}
function undo() {
  var u = undoStack.pop();
  if (!u) return;
  var p = page(u.k);
  if (u.b >= 0) { while (p.boards.length <= u.b) p.boards.push({ bg: board.bg, ink: [] });
                  p.boards[u.b].ink = u.snap; }
  else p.ink = u.snap;
  save(); redraw();
}
function clearHere() {
  if (!curList().length) return;
  pushUndo();
  var p = page(curKey());
  if (board.on) p.boards[board.i].ink = []; else p.ink = [];
  save(); redraw();
}

/* ---------------- the ink toolbar ---------------- */
var I = {
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M4 20L20 4M20 4h-7M20 4v7"/></svg>',
  hi: '<svg viewBox="0 0 24 24"><path d="M5 19h14"/><path d="M7 15l8.5-8.5a2 2 0 0 1 3 3L10 18H7z"/></svg>',
  text: '<svg viewBox="0 0 24 24"><path d="M5 6.5V5h14v1.5M12 5v14M9.5 19h5"/></svg>',
  erase: '<svg viewBox="0 0 24 24"><path d="M8 20h11M4.5 15.5l6-6 6 6-3.5 3.5h-5z"/><path d="M10.5 9.5l5-5 6 6-5 5"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M4 9h11a5 5 0 1 1 0 10H8"/><path d="M4 9l4-4M4 9l4 4"/></svg>',
  clear: '<svg viewBox="0 0 24 24"><path d="M6 7h12M9.5 7V5h5v2M8 7l.8 12h6.4L16 7"/></svg>',
  board: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="1.6"/><path d="M12 17v3M9 20h6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  flip: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2"/><path d="M12 3.8v16.4" /><path d="M12 3.8a8.2 8.2 0 0 1 0 16.4" fill="currentColor" stroke="none"/></svg>'
};
var bar = document.createElement('div'); bar.id = 'ink-bar';
function mk(html, title, cls) {
  var b = document.createElement('button');
  b.type = 'button'; b.innerHTML = html; b.title = title;
  b.setAttribute('aria-label', title);
  if (cls) b.className = cls;
  bar.appendChild(b); return b;
}
function sep() { var d = document.createElement('div'); d.className = 'sep'; bar.appendChild(d); }

var tPen = mk(I.pen, 'Pen (P)'), tArrow = mk(I.arrow, 'Arrow (R)'),
    tHi = mk(I.hi, 'Highlighter (H)'), tText = mk(I.text, 'Type a note (N)'),
    tErase = mk(I.erase, 'Erase a mark (E)');
sep();
var swatches = PAL.map(function (pair, i) {
  var b = mk('', 'Colour ' + (i + 1), 'sw');
  b.addEventListener('click', function () { ci = i; syncBar(); });
  return b;
});
sep();
var widths = [0, 1, 2].map(function (i) {
  var b = mk('<i style="height:' + (2 + i * 3) + 'px"></i>', 'Line width ' + (i + 1), 'wd');
  b.addEventListener('click', function () { wi = i; syncBar(); });
  return b;
});
sep();
var bUndo = mk(I.undo, 'Undo (Z)'), bClear = mk(I.clear, 'Clear this page (X)');
sep();
var bBoard = mk(I.board, 'Blank board (D)');
var bFlip = mk(I.flip, 'Blackboard or whiteboard');
var bPrev = mk(I.prev, 'Previous board page');
var pgLab = document.createElement('span'); pgLab.className = 'pg'; bar.appendChild(pgLab);
var bNext = mk(I.next, 'Next board page');
var bAdd = mk(I.plus, 'Add a board page');
sep();
var bClose = mk(I.close, 'Put the pen away (A)');
document.body.appendChild(bar);

function setTool(t) {
  tool = (tool === t) ? null : t;
  if (tool !== 'text') closeText(true);
  layer.classList.toggle('armed', !!tool);
  if (tool) bar.classList.add('on');
  syncBar(); redraw();
}
tPen.addEventListener('click', function () { setTool('pen'); });
tArrow.addEventListener('click', function () { setTool('arrow'); });
tHi.addEventListener('click', function () { setTool('hi'); });
tText.addEventListener('click', function () { setTool('text'); });
tErase.addEventListener('click', function () { setTool('erase'); });
bUndo.addEventListener('click', undo);
bClear.addEventListener('click', clearHere);
bClose.addEventListener('click', function () { closeBar(); });
bBoard.addEventListener('click', function () { toggleBoard(); });
bFlip.addEventListener('click', function () {
  board.bg = board.bg === 'black' ? 'white' : 'black';
  var p = page(curKey());
  if (p.boards[board.i]) p.boards[board.i].bg = board.bg;
  applyBoard(); save(); redraw();
});
bPrev.addEventListener('click', function () { gotoBoard(board.i - 1); });
bNext.addEventListener('click', function () { gotoBoard(board.i + 1); });
bAdd.addEventListener('click', function () {
  var p = page(curKey());
  p.boards.splice(board.i + 1, 0, { bg: board.bg, ink: [] });
  gotoBoard(board.i + 1); save();
});

function syncBar() {
  [[tPen, 'pen'], [tArrow, 'arrow'], [tHi, 'hi'], [tText, 'text'], [tErase, 'erase']]
    .forEach(function (pair) { pair[0].classList.toggle('on', tool === pair[1]); });
  var dark = darkGround();
  swatches.forEach(function (b, i) {
    b.style.background = colOf(i, dark);
    b.classList.toggle('on', i === ci);
  });
  widths.forEach(function (b, i) { b.classList.toggle('on', i === wi); });
  bBoard.classList.toggle('on', board.on);
  [bFlip, bPrev, bNext, bAdd].forEach(function (b) { b.style.display = board.on ? '' : 'none'; });
  pgLab.style.display = board.on ? '' : 'none';
  if (board.on) {
    var p = page(curKey());
    pgLab.textContent = (board.i + 1) + ' / ' + Math.max(1, p.boards.length);
  }
  bUndo.disabled = !undoStack.length;
  bUndo.style.opacity = undoStack.length ? 1 : .4;
}
function openBar() { bar.classList.add('on'); if (!tool) setTool('pen'); }
function closeBar() {
  closeText(true);
  tool = null; layer.classList.remove('armed');
  if (board.on) toggleBoard();
  bar.classList.remove('on'); syncBar(); redraw();
}

/* ---------------- boards ---------------- */
function applyBoard() {
  bg.className = board.on ? ('on ' + board.bg) : '';
  document.querySelector('.reveal').style.visibility = board.on ? 'hidden' : '';
  var badge = document.getElementById('uvic-badge');
  if (badge) badge.style.visibility = board.on ? 'hidden' : '';
}
function toggleBoard() {
  board.on = !board.on;
  if (board.on) {
    var p = page(curKey());
    if (!p.boards.length) p.boards.push({ bg: board.bg, ink: [] });
    board.i = 0; board.bg = p.boards[0].bg || 'black';
    bar.classList.add('on');
    if (!tool) setTool('pen');
  }
  applyBoard(); syncBar(); redraw();
}
function gotoBoard(i) {
  var p = page(curKey());
  if (i < 0 || i >= p.boards.length) return;
  board.i = i; board.bg = p.boards[i].bg || board.bg;
  applyBoard(); syncBar(); redraw();
}

/* ---------------- wiring ---------------- */
window.addEventListener('resize', resize);
window.addEventListener('ephe341-theme', function () { setTimeout(redraw, 30); });
if (window.Reveal) {
  Reveal.on('slidechanged', function () {
    if (board.on) { board.on = false; applyBoard(); }
    undoStack = []; closeText(false); syncBar(); redraw();
  });
  Reveal.on('resize', function () { setTimeout(resize, 30); });
}
document.addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  var t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  var k = e.key.toLowerCase();
  if (k === 'a') { if (bar.classList.contains('on')) closeBar(); else openBar(); e.stopPropagation(); e.preventDefault(); }
  else if (k === 'd') { toggleBoard(); e.stopPropagation(); e.preventDefault(); }
  else if (!bar.classList.contains('on')) return;
  else if (k === 'p') { setTool('pen'); e.stopPropagation(); }
  else if (k === 'r') { setTool('arrow'); e.stopPropagation(); }
  else if (k === 'h') { setTool('hi'); e.stopPropagation(); }
  else if (k === 'n') { setTool('text'); e.stopPropagation(); }
  else if (k === 'e') { setTool('erase'); e.stopPropagation(); }
  else if (k === 'z') { undo(); e.stopPropagation(); }
  else if (k === 'x') { clearHere(); e.stopPropagation(); }
  else if (k === 'escape') { closeBar(); e.stopPropagation(); }
  else if (k >= '1' && k <= '5') { ci = +k - 1; syncBar(); e.stopPropagation(); }
}, true);

/* expose two buttons for the main toolbar */
window.EPHE341_INK = {
  toggle: function () { if (bar.classList.contains('on')) closeBar(); else openBar(); },
  board: toggleBoard,
  isOpen: function () { return bar.classList.contains('on'); },
  isBoard: function () { return board.on; },
  anything: function () {
    return Object.keys(store).some(hasAnything);
  },
  clearAll: function () {
    store = {}; undoStack = [];
    try { localStorage.removeItem(KEY); } catch (e) {}
    redraw();
  }
};

resize();
setTimeout(resize, 400);
})();
