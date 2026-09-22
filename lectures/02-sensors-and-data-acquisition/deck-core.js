/* ============================================================
   EPHE 341 — Calculus and Kinematics
   Interactive figures. No dependencies, works offline.
   Each widget is a <div class="iplot" data-widget="name" data-…>
   ============================================================ */
(function () {
'use strict';

/* palette follows the page theme; re-read on every toggle */
var INK, MUT, ACC, BLUE, GRN, ORG, GRID, FILL, PLATE, VIO,
    MUTED_ACC, SOFT, PANEL, FILL2, FILL0, ACCFILL, DEEP;
function readTheme() {
  var dark = document.documentElement.getAttribute('data-theme') !== 'light';
  if (dark) {
    INK  = '#e8edf5'; MUT = '#94a3b8'; ACC = '#f87171'; BLUE = '#38bdf8';
    GRN  = '#4ade80'; ORG = '#fbbf24'; GRID = 'rgba(148,163,184,0.16)';
    FILL = 'rgba(56,189,248,0.20)'; PLATE = '#16233c';
  } else {
    INK  = '#1c1c1a'; MUT = '#6b6b66'; ACC = '#c2410c'; BLUE = '#003366';
    GRN  = '#2f6d4f'; ORG = '#b45309'; GRID = 'rgba(28,28,26,0.09)';
    FILL = 'rgba(0,51,102,0.14)'; PLATE = '#f6f5f2';
  }
  VIO = dark ? '#c084fc' : '#6d28d9';
  MUTED_ACC = dark ? 'rgba(248,113,113,0.48)' : 'rgba(194,65,12,0.38)';
  SOFT      = dark ? 'rgba(148,163,184,0.55)' : 'rgba(28,28,26,0.28)';
  PANEL     = dark ? 'rgba(148,163,184,0.20)' : 'rgba(28,28,26,0.10)';
  FILL2     = dark ? 'rgba(56,189,248,0.34)'  : 'rgba(0,51,102,0.26)';
  FILL0     = dark ? 'rgba(56,189,248,0.08)'  : 'rgba(0,51,102,0.05)';
  ACCFILL   = dark ? 'rgba(248,113,113,0.30)' : 'rgba(194,65,12,0.24)';
  DEEP      = dark ? 'rgba(56,189,248,0.55)'  : '#3d5a73';
}
readTheme();

/* ---------------- tiny canvas plotting helper ----------------

   PORTRAIT NOTE. Font sizes, paddings, line widths and dot radii in here are
   absolute canvas pixels, so shrinking the COORDINATE BOX while leaving them
   alone is what makes a figure legible on a phone: the same 15 px label in a
   470-wide box instead of a 900-wide one reads nearly twice as large once the
   canvas is stretched to the width of the slide.

   A widget that draws in raw pixels rather than through X()/Y() cannot be
   rescaled this way and should pass `fluid: false` and lay itself out from
   ax.W / ax.H instead.                                                     */
var MOBILE_W = 470;

function Axes(cv, o) {
  this.cv = cv; this.o = o;
  var w = o.w || 560, h = o.h || 320;
  var pl = o.padl == null ? 62 : o.padl, pr = o.padr == null ? 18 : o.padr,
      pt = o.padt == null ? 16 : o.padt, pb = o.padb == null ? 46 : o.padb;
  var portrait = !!window.DECK_PORTRAIT;

  if (portrait && o.fluid !== false && w > MOBILE_W) {
    /* Narrow it, but keep the height: a portrait slide is 1080 tall and has
       room to spare, whereas squeezing the height too would crush the stacked
       panels some figures are built from. The figure ends up squarer, which is
       the right shape for a column anyway. */
    w = MOBILE_W;
  }

  this.W = w; this.H = h; this.portrait = portrait;
  var dpr = Math.max(2, window.devicePixelRatio || 1);
  cv.width = this.W * dpr; cv.height = this.H * dpr;
  cv.style.width = '100%';
  /* A figure we just rescaled WANTS to be stretched past its coordinate box —
     that is the whole trick, and the backing store is 2× or better so it stays
     sharp. A figure that laid itself out for a portrait box (fluid:false) does
     not: stretching it would scale its height up by the same factor and turn a
     tall diagram into an enormous one. */
  var stretch = portrait && o.fluid !== false && (o.w || 560) > MOBILE_W;
  cv.style.maxWidth = stretch ? 'none' : this.W + 'px';
  cv.style.height = 'auto';
  this.c = cv.getContext('2d'); this.c.scale(dpr, dpr);
  this.pl = pl; this.pr = pr; this.pt = pt; this.pb = pb;
  this.setRange(o.xmin, o.xmax, o.ymin, o.ymax);
}
Axes.prototype.setRange = function (a, b, c, d) {
  this.xmin = a; this.xmax = b; this.ymin = c; this.ymax = d;
};
Axes.prototype.X = function (v) {
  return this.pl + (v - this.xmin) / (this.xmax - this.xmin) * (this.W - this.pl - this.pr);
};
Axes.prototype.Y = function (v) {
  return this.H - this.pb - (v - this.ymin) / (this.ymax - this.ymin) * (this.H - this.pt - this.pb);
};
Axes.prototype.clear = function () { this.c.clearRect(0, 0, this.W, this.H); };
Axes.prototype.frame = function (opt) {
  opt = opt || {};
  var c = this.c, i;
  c.save();
  if (opt.grid) {
    c.strokeStyle = GRID; c.lineWidth = 1;
    (opt.yticks || []).forEach(function (t) {
      c.beginPath(); c.moveTo(this.pl, this.Y(t) + 0.5); c.lineTo(this.W - this.pr, this.Y(t) + 0.5); c.stroke();
    }, this);
  }
  c.strokeStyle = INK; c.lineWidth = 1.3; c.beginPath();
  c.moveTo(this.pl + .5, this.pt); c.lineTo(this.pl + .5, this.H - this.pb + .5);
  c.lineTo(this.W - this.pr, this.H - this.pb + .5); c.stroke();
  c.fillStyle = MUT; c.font = '600 15px ui-sans-serif,system-ui,sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'top';
  (opt.xticks || []).forEach(function (t) {
    var x = this.X(t);
    c.strokeStyle = INK; c.lineWidth = 1; c.beginPath();
    c.moveTo(x, this.H - this.pb); c.lineTo(x, this.H - this.pb + 4); c.stroke();
    c.fillText(opt.xfmt ? opt.xfmt(t) : t, x, this.H - this.pb + 8);
  }, this);
  c.textAlign = 'right'; c.textBaseline = 'middle';
  (opt.yticks || []).forEach(function (t) {
    var y = this.Y(t);
    c.strokeStyle = INK; c.lineWidth = 1; c.beginPath();
    c.moveTo(this.pl - 4, y); c.lineTo(this.pl, y); c.stroke();
    c.fillText(opt.yfmt ? opt.yfmt(t) : t, this.pl - 9, y);
  }, this);
  if (opt.xlabel) {
    c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillStyle = INK;
    c.font = '700 16.5px ui-sans-serif,system-ui,sans-serif';
    c.fillText(opt.xlabel, (this.pl + this.W - this.pr) / 2, this.H - 2);
  }
  if (opt.ylabel) {
    var ys = opt.ysize || 16.5;
    c.save(); c.translate(opt.ysize ? 11 : 13, (this.pt + this.H - this.pb) / 2); c.rotate(-Math.PI / 2);
    c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = INK;
    c.font = '700 ' + ys + 'px ui-sans-serif,system-ui,sans-serif';
    c.fillText(opt.ylabel, 0, 0); c.restore();
  }
  if (opt.zero && this.ymin < 0 && this.ymax > 0) {
    c.strokeStyle = MUT; c.globalAlpha = .55; c.lineWidth = 1; c.beginPath();
    c.moveTo(this.pl, this.Y(0)); c.lineTo(this.W - this.pr, this.Y(0)); c.stroke(); c.globalAlpha = 1;
  }
  c.restore();
};
Axes.prototype.fn = function (f, o) {
  o = o || {}; var c = this.c, n = o.n || 320, i, t, first = true;
  c.save(); c.strokeStyle = o.color || INK; c.lineWidth = o.width || 2;
  if (o.dash) c.setLineDash(o.dash);
  c.beginPath();
  var a = o.from == null ? this.xmin : o.from, b = o.to == null ? this.xmax : o.to;
  for (i = 0; i <= n; i++) {
    t = a + (b - a) * i / n; var y = f(t);
    if (!isFinite(y)) { first = true; continue; }
    if (first) { c.moveTo(this.X(t), this.Y(y)); first = false; } else c.lineTo(this.X(t), this.Y(y));
  }
  c.stroke(); c.restore();
};
Axes.prototype.poly = function (pts, o) {
  o = o || {}; var c = this.c, i;
  c.save(); c.strokeStyle = o.color || INK; c.lineWidth = o.width || 2;
  if (o.dash) c.setLineDash(o.dash);
  c.beginPath();
  for (i = 0; i < pts.length; i++) {
    if (pts[i] == null || !isFinite(pts[i][1])) { continue; }
    if (i === 0 || pts[i - 1] == null || !isFinite(pts[i - 1][1])) c.moveTo(this.X(pts[i][0]), this.Y(pts[i][1]));
    else c.lineTo(this.X(pts[i][0]), this.Y(pts[i][1]));
  }
  c.stroke(); c.restore();
};
Axes.prototype.dots = function (pts, o) {
  o = o || {}; var c = this.c, r = o.r || 3.4;
  c.save(); c.fillStyle = o.color || INK;
  pts.forEach(function (p) {
    if (p == null || !isFinite(p[1])) return;
    c.beginPath(); c.arc(this.X(p[0]), this.Y(p[1]), r, 0, 7); c.fill();
  }, this);
  c.restore();
};
Axes.prototype.rect = function (x0, y0, x1, y1, o) {
  o = o || {}; var c = this.c;
  c.save();
  var X = this.X(x0), Y = this.Y(Math.max(y0, y1)), W = this.X(x1) - this.X(x0), H = Math.abs(this.Y(y1) - this.Y(y0));
  if (o.fill) { c.fillStyle = o.fill; c.fillRect(X, Y, W, H); }
  if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.width || 1; if (o.dash) c.setLineDash(o.dash); c.strokeRect(X + .5, Y + .5, W, H); }
  c.restore();
};
Axes.prototype.area = function (f, a, b, o) {
  o = o || {}; var c = this.c, n = o.n || 240, i;
  c.save(); c.fillStyle = o.fill || FILL; c.beginPath();
  c.moveTo(this.X(a), this.Y(0));
  for (i = 0; i <= n; i++) { var t = a + (b - a) * i / n; c.lineTo(this.X(t), this.Y(f(t))); }
  c.lineTo(this.X(b), this.Y(0)); c.closePath(); c.fill(); c.restore();
};
Axes.prototype.text = function (s, x, y, o) {
  o = o || {}; var c = this.c;
  c.save(); c.fillStyle = o.color || INK;
  c.font = (o.weight || '700') + ' ' + (o.size || 16) + 'px ui-sans-serif,system-ui,sans-serif';
  c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'middle';
  c.fillText(s, o.px ? x : this.X(x), o.px ? y : this.Y(y)); c.restore();
};

/* ---------------- UI helpers ---------------- */
function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

function slider(host, label, min, max, step, val, fmt, onChange) {
  var row = el('div', 'ictl');
  var lab = el('label', 'ictl-l'); lab.innerHTML = label;
  var inp = el('input'); inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
  var out = el('span', 'ictl-v');
  function up() { out.textContent = fmt(parseFloat(inp.value)); onChange(parseFloat(inp.value)); }
  function quiet(v) { if (v != null) inp.value = v; out.textContent = fmt(parseFloat(inp.value)); }
  inp.addEventListener('input', function () { up(); });
  row.appendChild(lab); row.appendChild(inp); row.appendChild(out);
  host.appendChild(row);
  return { input: inp, row: row, sync: up, quiet: quiet,
           set: function (v) { inp.value = v; up(); } };
}

function playBtn(host, label) {
  var b = el('button', 'ibtn', label || '▶ Play');
  host.appendChild(b); return b;
}

function readout(host) { var d = el('div', 'iread'); host.appendChild(d); return d; }

function build(node, opt) {
  opt = opt || {};
  var wrap = el('div', 'iwrap');
  var cv = el('canvas');
  var stage = el('div', 'istage'); stage.appendChild(cv);
  var ctl = el('div', 'ictls');
  wrap.appendChild(stage); wrap.appendChild(ctl);
  node.appendChild(wrap);
  return { cv: cv, ctl: ctl, stage: stage };
}


function niceRange(arr) {
  var lo = Infinity, hi = -Infinity, i;
  for (i = 0; i < arr.length; i++) { if (arr[i] < lo) lo = arr[i]; if (arr[i] > hi) hi = arr[i]; }
  if (lo === hi) { lo -= 1; hi += 1; }
  var pad = (hi - lo) * 0.12;
  return [lo - pad, hi + pad];
}
function axisTicks(lo, hi) {
  var span = hi - lo, mag = Math.pow(10, Math.floor(Math.log(span / 4) / Math.LN10));
  var step = mag;
  [1, 2, 2.5, 5, 10].some(function (m) { if (span / (mag * m) <= 5) { step = mag * m; return true; } return false; });
  var out = [], v = Math.ceil(lo / step) * step;
  for (; v <= hi + 1e-9; v += step) out.push(Math.abs(v) < step / 1e6 ? 0 : Math.round(v * 1e6) / 1e6);
  return out;
}


/* ---------------- widget registry + boot ---------------- */
var MAP = {};
function register(name, fn) { MAP[name] = fn; }

/* Reveal listens for a drag anywhere on the deck so a swipe changes slide, and
   on a touch screen it calls preventDefault() on the first pointermove of every
   gesture — which also cancels the click the browser would otherwise synthesise,
   so a tap on a control can fail to take. data-prevent-swipe is reveal's own
   opt-out and leaves the controls alone; a swipe anywhere else still turns the
   page. */
function noSwipe(root) {
  Array.prototype.forEach.call(
    root.querySelectorAll('.ieqin, .ictls, .ictl, input, textarea, select'),
    function (e) { e.setAttribute('data-prevent-swipe', ''); });
}

/* A figure whose name this script does not know about is almost always a
   browser holding a cached copy of the lecture's widget file next to a fresh
   index.html. Silence looks like a broken slide, so say so, and list what the
   loaded script DID bring — that names the version on screen. */
function warnBox(n, msg) {
  var d = el('div');
  d.setAttribute('style', 'margin:1.1em auto;max-width:46em;padding:.75em 1em;' +
    'border:1px solid rgba(248,113,113,.55);border-radius:.55em;' +
    'background:rgba(248,113,113,.10);font-size:.58em;line-height:1.55;text-align:left');
  d.innerHTML = msg;
  n.appendChild(d);
}
function make(n) {
  var name = n.getAttribute('data-widget');
  if (MAP[name]) {
    try { MAP[name](n, n.dataset); }
    catch (e) {
      console.error(name, e);
      warnBox(n, '<b>This figure could not be drawn.</b> ' + name + ' &mdash; ' +
                 ((e && e.message) ? e.message : e));
    }
  } else {
    console.error('no widget registered for "' + name + '"; loaded:',
                  Object.keys(MAP).join(', '));
    warnBox(n, '<b>This figure is not in the script your browser loaded.</b> ' +
               'Reload the page to pick up the current version &mdash; ' +
               '<b>\u2318\u21e7R</b> on a Mac, <b>Ctrl+F5</b> on Windows.' +
               '<br><span style="opacity:.72">wanted <b>' + name + '</b>; this copy has ' +
               Object.keys(MAP).join(', ') + '</span>');
  }
  noSwipe(n);
}

/* Rebuild every figure from scratch — used when the phone is turned and the
   canvases need a different coordinate box. Stop any animation first, or its
   requestAnimationFrame keeps drawing into a canvas that is no longer here. */
function reboot() {
  Array.prototype.forEach.call(document.querySelectorAll('.iplot'), function (n) {
    if (n._stop) { try { n._stop(); } catch (e) {} }
    n._draw = n._stop = n._start = null;
    n.innerHTML = '';
    make(n);
  });
}

function init() {
  Array.prototype.forEach.call(document.querySelectorAll('.iplot'), make);
  window.addEventListener('ephe341-theme', function () {
    readTheme();
    Array.prototype.forEach.call(document.querySelectorAll('.iplot'), function (n) {
      if (n._draw) { try { n._draw(); } catch (e) {} }
    });
  });
  if (window.Reveal) {
    Reveal.on('slidechanged', function (ev) {
      if (ev.previousSlide) Array.prototype.forEach.call(ev.previousSlide.querySelectorAll('.iplot'),
        function (n) { if (n._stop) n._stop(); });
      if (ev.currentSlide) Array.prototype.forEach.call(ev.currentSlide.querySelectorAll('.iplot'),
        function (n) { if (n._start) n._start(); });
    });
  }
}

/* what a lecture's own widget file gets to use */
window.DECK = {
  Axes: Axes, el: el, slider: slider, playBtn: playBtn, readout: readout, build: build,
  niceRange: niceRange, axisTicks: axisTicks, readTheme: readTheme,
  register: register, boot: init, reboot: reboot,
  portrait: function () { return !!window.DECK_PORTRAIT; },
  colors: function () {
    return { INK: INK, MUT: MUT, ACC: ACC, BLUE: BLUE, GRN: GRN, ORG: ORG, VIO: VIO,
             GRID: GRID, FILL: FILL, PLATE: PLATE, SOFT: SOFT, PANEL: PANEL,
             FILL2: FILL2, FILL0: FILL0, ACCFILL: ACCFILL, DEEP: DEEP, MUTED_ACC: MUTED_ACC };
  }
};
})();
