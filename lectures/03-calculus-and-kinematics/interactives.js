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

/* ---------------- tiny canvas plotting helper ---------------- */
function Axes(cv, o) {
  this.cv = cv; this.o = o;
  this.W = o.w || 560; this.H = o.h || 320;
  var dpr = Math.max(2, window.devicePixelRatio || 1);
  cv.width = this.W * dpr; cv.height = this.H * dpr;
  cv.style.width = '100%'; cv.style.maxWidth = this.W + 'px'; cv.style.height = 'auto';
  this.c = cv.getContext('2d'); this.c.scale(dpr, dpr);
  this.pl = o.padl == null ? 62 : o.padl; this.pr = o.padr == null ? 18 : o.padr;
  this.pt = o.padt == null ? 16 : o.padt; this.pb = o.padb == null ? 46 : o.padb;
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

/* ---------------- shared data ---------------- */
var D = function (t) { return -t * t * t + 6 * t * t; };          // displacement
var V = function (t) { return -3 * t * t + 12 * t; };             // velocity
var A = function (t) { return -6 * t + 12; };                     // acceleration
var TS = [0, .2, .4, .6, .8, 1, 1.2, 1.4, 1.6, 1.8, 2];
var VS = [0, 3.96, 3.02, 3.11, 5.53, 8.38, 8.21, 6.25, 4.56, 1.83, 0];
function bimodal(x) { return 2.6 * Math.exp(-Math.pow((x - 2.2) / 0.9, 2)) + 2.0 * Math.exp(-Math.pow((x - 5.6) / 1.25, 2)); }

/* ============================================================
   WIDGETS
   ============================================================ */
var W = {};

/* --- 1. secant → slope of a d–t or v–t curve --- */
W.secant = function (node, d) {
  var isVel = d.var === 'v';
  var f = isVel ? V : D;
  var u = build(node);
  var ax = new Axes(u.cv, { w: 560, h: 300, xmin: 0, xmax: 6.4, ymin: isVel ? -42 : -4.5, ymax: isVel ? 16 : 36 });
  var out = readout(u.ctl);
  var t2 = parseFloat(d.start || 2), playing = false, raf, dir = 1;
  function draw() {
    ax.clear();
    ax.frame({
      grid: true, zero: true, xticks: [0, 1, 2, 3, 4, 5, 6],
      yticks: isVel ? [-36, -24, -12, 0, 12] : [0, 8, 16, 24, 32],
      xlabel: 'time (s)', ylabel: isVel ? 'velocity (m/s)' : 'displacement (m)'
    });
    ax.fn(f, { from: 0, to: 6, color: INK, width: 2 });
    var y1 = f(0), y2 = f(t2);
    ax.poly([[0, y1], [t2, y1]], { color: ACC, width: 2, dash: [4, 4] });
    ax.poly([[t2, y1], [t2, y2]], { color: ACC, width: 2, dash: [4, 4] });
    ax.poly([[0, y1], [t2, y2]], { color: ACC, width: 3.4 });
    ax.dots([[0, y1], [t2, y2]], { color: ACC, r: 4.5 });
    ax.text('run = ' + t2.toFixed(2) + ' s', t2 / 2, y1 - (isVel ? 4.6 : 3.2), { color: ACC, size: 15, align: 'center' });
    ax.text('rise = ' + (y2 - y1).toFixed(2) + (isVel ? ' m/s' : ' m'), t2 + 0.14, (y1 + y2) / 2, { color: ACC, size: 15 });
    var m = (y2 - y1) / t2;
    var sym = isVel ? 'a' : 'v', top = isVel ? 'Δv' : 'Δd', unit = isVel ? 'm/s²' : 'm/s';
    out.innerHTML =
      '<span class="live-eq">' + sym + ' = ' +
        '<span class="fr"><span>' + top + '</span><span class="dn">Δt</span></span> = ' +
        '<span class="fr"><span>rise</span><span class="dn">run</span></span> = ' +
        '<span class="fr"><span>' + y2.toFixed(2) + ' − ' + y1.toFixed(2) + '</span>' +
        '<span class="dn">' + t2.toFixed(2) + ' − 0.00</span></span> = ' +
        '<span class="fr"><span>' + (y2 - y1).toFixed(2) + '</span>' +
        '<span class="dn">' + t2.toFixed(2) + '</span></span> = ' +
        '<b class="r">' + m.toFixed(2) + '</b> ' + unit +
      '</span>' +
      '<span class="hint">the average ' + (isVel ? 'acceleration' : 'velocity') +
      ' between t = 0 and t = ' + t2.toFixed(2) + ' s</span>';
  }
  var s = slider(u.ctl, 'Second point <i>t</i>', 0.2, 6, 0.05, t2, function (v) { return v.toFixed(2) + ' s'; },
    function (v) { t2 = v; draw(); });
  var b = playBtn(u.ctl, '▶ Sweep');
  b.addEventListener('click', function () {
    playing = !playing; b.textContent = playing ? '❚❚ Pause' : '▶ Sweep';
    if (playing) loop(); else cancelAnimationFrame(raf);
  });
  function loop() {
    t2 += dir * 0.035; if (t2 >= 6) { t2 = 6; dir = -1; } if (t2 <= 0.2) { t2 = 0.2; dir = 1; }
    s.input.value = t2; s.sync();
    raf = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; b.textContent = '▶ Sweep'; cancelAnimationFrame(raf); };
  node._draw = draw;
  draw();
};

/* --- 2. average over N sections, with the arithmetic shown --- */
W.sections = function (node, d) {
  var u = build(node);
  u.cv.parentNode.parentNode.classList.add('isplit');

  var side = el('div', 'icalc');
  u.cv.parentNode.parentNode.insertBefore(side, u.ctl);

  var ax = new Axes(u.cv, { w: 900, h: 236, padl: 70, xmin: 0, xmax: 6.35, ymin: -2, ymax: 36 });
  var out = readout(u.ctl);
  var n = parseInt(d.start || 1, 10), playing = false, timer, focus = 0;

  function draw() {
    ax.clear();
    ax.frame({
      grid: true, xticks: [0, 1, 2, 3, 4, 5, 6], yticks: [0, 8, 16, 24, 32],
      xlabel: 'time (s)', ylabel: 'displacement (m)'
    });
    ax.fn(D, { from: 0, to: 6, color: INK, width: 2.2 });

    if (focus >= n) focus = n - 1;
    var vals = [], i;
    for (i = 0; i < n; i++) {
      var a = 6 * i / n, b = 6 * (i + 1) / n;
      var m = (D(b) - D(a)) / (b - a);
      vals.push(m);
      var on = (i === focus);
      ax.poly([[a, D(a)], [b, D(b)]], { color: on ? ACC : MUTED_ACC, width: on ? 3.6 : 2.2 });
      if (on) {
        ax.poly([[a, D(a)], [b, D(a)]], { color: ACC, width: 1.5, dash: [4, 3] });
        ax.poly([[b, D(a)], [b, D(b)]], { color: ACC, width: 1.5, dash: [4, 3] });
      }
      ax.dots([[a, D(a)], [b, D(b)]], { color: on ? ACC : MUTED_ACC, r: on ? 4.6 : 3.2 });
    }

    // arithmetic panel
    var a0 = 6 * focus / n, b0 = 6 * (focus + 1) / n;
    var html = '<div class="icalc-h">' + n + (n === 1 ? ' section' : ' sections') +
      ' &nbsp;→&nbsp; ' + n + (n === 1 ? ' calculation' : ' calculations') + '</div>';
    html += '<div class="icalc-work">' +
      '<div class="icalc-t">Section ' + (focus + 1) + '&nbsp; (' + a0.toFixed(2) + ' → ' + b0.toFixed(2) + ' s)</div>' +
      '<div class="icalc-eq">v = <span class="fr"><span>Δd</span><span class="dn">Δt</span></span>' +
      ' = <span class="fr"><span>' + D(b0).toFixed(2) + ' − ' + D(a0).toFixed(2) + '</span>' +
      '<span class="dn">' + b0.toFixed(2) + ' − ' + a0.toFixed(2) + '</span></span></div>' +
      '<div class="icalc-eq" style="margin-top:.3em">= <span class="fr"><span>' +
      (D(b0) - D(a0)).toFixed(2) + '</span><span class="dn">' + (b0 - a0).toFixed(2) + '</span></span>' +
      ' = <b>' + vals[focus].toFixed(2) + '</b> m/s</div></div>';
    html += '<div class="icalc-grid">';
    for (i = 0; i < n; i++) {
      html += '<button class="icalc-chip' + (i === focus ? ' on' : '') + '" data-i="' + i + '">' +
        '<span class="k">' + (i + 1) + '</span>' + vals[i].toFixed(1) + '</button>';
    }
    html += '</div>';
    side.innerHTML = html;
    Array.prototype.forEach.call(side.querySelectorAll('.icalc-chip'), function (btn) {
      btn.addEventListener('click', function () { focus = parseInt(btn.getAttribute('data-i'), 10); draw(); });
    });

    out.innerHTML = n === 1
      ? 'One average over the whole trip = <b class="r">' + vals[0].toFixed(2) + ' m/s</b>' +
        '<span class="hint">true, but it tells you nothing about the trip — the object went out and came back</span>'
      : 'Range across the ' + n + ' sections: <b>' + Math.min.apply(null, vals).toFixed(2) + '</b> to <b>' +
        Math.max.apply(null, vals).toFixed(2) + '</b> m/s' +
        '<span class="hint">more sections → shorter intervals → each average is closer to the instantaneous velocity</span>';
  }

  var presets = el('div', 'iseg');
  var s1;
  [1, 2, 3, 4, 5, 6].forEach(function (k) {
    var btn = el('button', 'iseg-b' + (k === n ? ' on' : ''),
      k + (k === 1 ? ' section' : ' sections'));
    btn.addEventListener('click', function () { s1.set(k); });
    presets.appendChild(btn);
  });
  u.ctl.appendChild(presets);

  s1 = slider(u.ctl, 'Number of sections', 1, 24, 1, n, function (v) { return v; },
    function (v) {
      n = v;
      Array.prototype.forEach.call(presets.children, function (x, idx) {
        x.classList.toggle('on', idx + 1 === n);
      });
      draw();
    });
  var b = playBtn(u.ctl, '▶ Split it up');
  b.addEventListener('click', function () {
    playing = !playing; b.textContent = playing ? '❚❚ Pause' : '▶ Split it up';
    if (playing) { if (n >= 24) { n = 1; s1.set(1); } tick(); } else clearTimeout(timer);
  });
  function tick() {
    if (n >= 24) { playing = false; b.textContent = '↻ Replay'; return; }
    n++; focus = Math.min(focus, n - 1); s1.set(n);
    timer = setTimeout(tick, n < 8 ? 900 : 420);
  }
  node._stop = function () { playing = false; clearTimeout(timer); b.textContent = '▶ Split it up'; };
  node._draw = draw;
  draw();
};

/* --- 3. secant → tangent (A and B closing in) --- */
W.tangent = function (node) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 560, h: 238, xmin: 0, xmax: 6.4, ymin: -2, ymax: 36 });
  var out = readout(u.ctl);
  var h = 2.4, t0 = 1.6, playing = false, raf;
  function draw() {
    ax.clear();
    ax.frame({ grid: true, xticks: [0, 1, 2, 3, 4, 5, 6], yticks: [0, 8, 16, 24, 32], xlabel: 'time (s)', ylabel: 'displacement (m)' });
    ax.fn(D, { from: 0, to: 6, color: INK, width: 2 });
    var a = t0, b = t0 + h, m = (D(b) - D(a)) / (b - a);
    ax.fn(function (t) { return D(a) + m * (t - a); }, { from: Math.max(0, a - 1.6), to: Math.min(6.4, b + 1.6), color: BLUE, width: 2.2 });
    ax.dots([[a, D(a)], [b, D(b)]], { color: ACC, r: 4.6 });
    ax.text('A', a - 0.18, D(a) - 2.2, { color: ACC, size: 16 });
    ax.text('B', b + 0.08, D(b) - 2.2, { color: ACC, size: 16 });
    out.innerHTML = 'secant slope = <b>' + m.toFixed(2) + '</b> m/s &nbsp;·&nbsp; true instantaneous <i>v</i>(' +
      a.toFixed(1) + ') = <b>' + V(a).toFixed(2) + '</b> m/s' +
      '<span class="hint">as Δt → 0 the secant becomes the tangent</span>';
  }
  var s = slider(u.ctl, 'Gap between A and B (Δ<i>t</i>)', 0.05, 3.4, 0.05, h, function (v) { return v.toFixed(2) + ' s'; }, function (v) { h = v; draw(); });
  slider(u.ctl, 'Position of A', 0.2, 4.4, 0.05, t0, function (v) { return v.toFixed(2) + ' s'; }, function (v) { t0 = v; draw(); });
  var b = playBtn(u.ctl, '▶ Close the gap');
  b.addEventListener('click', function () {
    playing = !playing; b.textContent = playing ? '❚❚ Pause' : '▶ Close the gap';
    if (playing) { if (h < 0.1) { h = 3.4; s.set(h); } loop(); } else cancelAnimationFrame(raf);
  });
  function loop() {
    h = Math.max(0.05, h - 0.03);
    s.input.value = h; s.sync();
    if (h <= 0.05) { playing = false; b.textContent = '▶ Close the gap'; return; }
    raf = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; b.textContent = '▶ Close the gap'; cancelAnimationFrame(raf); };
  node._draw = draw;
  draw();
};

/* --- 4. tangent travelling along the curve, tracing the derivative --- */
W.tangentTravel = function (node) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 560, h: 340, xmin: 0, xmax: 6.4, ymin: -40, ymax: 36 });
  var out = readout(u.ctl);
  var t = 0.3, playing = true, raf, trace = [], showD = true;
  function draw() {
    ax.clear();
    ax.frame({ grid: true, zero: true, xticks: [0, 1, 2, 3, 4, 5, 6], yticks: [-36, -24, -12, 0, 12, 24, 36], xlabel: 'time (s)', ylabel: 'value' });
    ax.fn(D, { from: 0, to: 6, color: INK, width: 2.2 });
    var m = V(t);
    ax.fn(function (x) { return D(t) + m * (x - t); }, { from: Math.max(0, t - 1.1), to: Math.min(6.4, t + 1.1), color: ACC, width: 2.6 });
    ax.dots([[t, D(t)]], { color: ACC, r: 5 });
    if (showD) {
      ax.poly(trace, { color: BLUE, width: 2.4 });
      ax.dots([[t, m]], { color: BLUE, r: 4.5 });
    }
    ax.text('d(t) = −t³ + 6t²', 0.25, 34, { color: INK, size: 16 });
    if (showD) ax.text('v(t) = slope of the tangent', 0.25, -33, { color: BLUE, size: 16 });
    out.innerHTML = '<i>t</i> = <b>' + t.toFixed(2) + ' s</b> &nbsp;·&nbsp; tangent slope = <b>' + m.toFixed(2) +
      '</b> m/s <span class="hint">the blue curve is built from the slope at every point — that is the derivative</span>';
  }
  var s = slider(u.ctl, 'Time', 0, 6, 0.02, t, function (v) { return v.toFixed(2) + ' s'; }, function (v) {
    t = v; trace = []; for (var x = 0; x <= t; x += 0.04) trace.push([x, V(x)]); draw();
  });
  var b = playBtn(u.ctl, '❚❚ Pause');
  b.addEventListener('click', function () {
    playing = !playing; b.textContent = playing ? '❚❚ Pause' : '▶ Play';
    if (playing) loop(); else cancelAnimationFrame(raf);
  });
  function loop() {
    t += 0.02; if (t > 6) { t = 0; trace = []; }
    trace.push([t, V(t)]);
    s.input.value = t; draw();
    raf = requestAnimationFrame(loop);
  }
  node._start = function () { if (!playing) return; cancelAnimationFrame(raf); loop(); };
  node._stop = function () { cancelAnimationFrame(raf); };
  node._draw = draw;
  draw();
};

/* --- 5. power rule: c·tⁿ and its derivative / integral --- */
W.powerRule = function (node, d) {
  var mode = d.mode || 'diff';
  var u = build(node);
  var ax = new Axes(u.cv, { w: 520, h: 138, xmin: 0, xmax: 5.2, ymin: -5, ymax: 60 });
  var out = readout(u.ctl);
  var c = 1, n = 2;
  function draw() {
    var f = function (t) { return c * Math.pow(t, n); };
    var g = mode === 'diff'
      ? function (t) { return n * c * Math.pow(t, n - 1); }
      : function (t) { return c * Math.pow(t, n + 1) / (n + 1); };
    var lo = 0, hi = 1;
    for (var t = 0; t <= 5; t += 0.1) {
      lo = Math.min(lo, f(t), g(t)); hi = Math.max(hi, f(t), g(t));
    }
    hi = Math.min(hi, 400); ax.setRange(0, 5.2, lo - Math.abs(hi) * .06, hi * 1.12);
    ax.clear();
    ax.frame({ grid: true, zero: true, xticks: [0, 1, 2, 3, 4, 5], yticks: ticks(ax.ymin, ax.ymax, 5), xlabel: 'time (s)', ylabel: 'value', yfmt: function (v) { return v.toFixed(0); } });
    ax.fn(f, { from: 0, to: 5, color: INK, width: 2.4 });
    ax.fn(g, { from: 0, to: 5, color: mode === 'diff' ? ACC : GRN, width: 2.4 });
    ax.text('c t ' + sup(n), 0.15, ax.ymax * 0.93, { color: INK, size: 13 });
    out.innerHTML = mode === 'diff'
      ? '<b class="k">' + fmtTerm(c, n) + '</b> &nbsp;⟶&nbsp; <b class="r">' + fmtTerm(c * n, n - 1) + '</b>' +
        '<span class="hint">multiply by n, then subtract 1 from the exponent</span>'
      : '<b class="k">' + fmtTerm(c, n) + '</b> &nbsp;⟶&nbsp; <b class="g">' + fmtTerm(c / (n + 1), n + 1) + ' + b<sub>o</sub></b>' +
        '<span class="hint">add 1 to the exponent, then divide by n + 1</span>';
  }
  slider(u.ctl, 'coefficient <i>c</i>', -6, 6, 0.5, c, function (v) { return v; }, function (v) { c = v; draw(); });
  slider(u.ctl, 'exponent <i>n</i>', 0, 4, 1, n, function (v) { return v; }, function (v) { n = v; draw(); });
  node._draw = draw;
  draw();
};
function sup(n) { var m = { '-1': '⁻¹', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵' }; return m[String(n)] || ('^' + n); }
function fmtTerm(c, n) {
  var cs = (Math.round(c * 100) / 100);
  if (n === 0) return String(cs).replace('-', '\u2212');
  var mag = Math.abs(cs), sign = cs < 0 ? '\u2212' : '';
  var lead = Math.abs(mag - 1) < 1e-9 ? '' : String(mag);   /* 1t\u00b2 reads badly */
  return sign + lead + 't' + (n === 1 ? '' : sup(n));
}
function ticks(lo, hi, k) {
  var out = [], step = (hi - lo) / k, i;
  var mag = Math.pow(10, Math.floor(Math.log(step) / Math.LN10));
  step = Math.ceil(step / mag) * mag;
  var start = Math.ceil(lo / step) * step;
  for (i = start; i <= hi; i += step) out.push(Math.round(i * 1000) / 1000);
  return out;
}

/* --- 6. finite difference on real data --- */
W.finiteDiff = function (node, d) {
  var withTable = d && d.table === '1';
  var u = build(node);
  var side = null, rows = [];
  if (withTable) {
    u.cv.parentNode.parentNode.classList.add('isplit', 'ifd');
    side = el('div', 'icalc');
    u.cv.parentNode.parentNode.insertBefore(side, u.ctl);
    var tbl = el('table'); tbl.className = 'grow-tab';
    var th = el('thead');
    th.innerHTML = '<tr><th>Time (s)</th><th>Velocity (m/s)</th><th>Δ Time</th><th>Δ Velocity</th><th>Acceleration</th></tr>';
    var tb = el('tbody');
    tbl.appendChild(th); tbl.appendChild(tb); side.appendChild(tbl);
    TS.forEach(function (t, k) {
      var tr = el('tr');
      if (k === 0) {
        tr.innerHTML = '<td>0.0</td><td>0.00</td><td>—</td><td>—</td><td>—</td>';
      } else {
        var dv = VS[k] - VS[k - 1];
        tr.innerHTML = '<td>' + t.toFixed(1) + '</td><td>' + VS[k].toFixed(2) + '</td>' +
          '<td>0.2</td><td>' + (dv < 0 ? '−' : '') + Math.abs(dv).toFixed(2) + '</td>' +
          '<td><b>' + (dv / 0.2 < 0 ? '−' : '') + Math.abs(dv / 0.2).toFixed(2) + '</b></td>';
      }
      tb.appendChild(tr); rows.push(tr);
    });
  }

  var ax = new Axes(u.cv, {
    w: withTable ? 560 : 620, h: withTable ? 282 : 298,
    xmin: -0.05, xmax: 2.15, ymin: -22, ymax: 22
  });
  var out = readout(u.ctl);
  var i = 1, playing = false, raf;
  var ACCEL = TS.map(function (t, k) { return k === 0 ? null : [t, (VS[k] - VS[k - 1]) / 0.2]; });

  function draw() {
    ax.clear();
    ax.frame({
      grid: true, zero: true, xticks: [0, .4, .8, 1.2, 1.6, 2], yticks: [-20, -10, 0, 10, 20],
      xlabel: 'Time (s)', ylabel: withTable ? 'v (m/s) · a (m/s²)' : 'velocity (m/s) · acceleration (m/s²)',
      ysize: withTable ? 13 : null, xfmt: function (v) { return v.toFixed(1); }
    });
    ax.poly(TS.map(function (t, k) { return [t, VS[k]]; }), { color: MUT, width: 2 });
    ax.dots(TS.map(function (t, k) { return [t, VS[k]]; }), { color: MUT, r: 3.4 });
    ax.poly(ACCEL.slice(0, i + 1).filter(Boolean), { color: BLUE, width: 2.4 });
    ax.dots(ACCEL.slice(0, i + 1).filter(Boolean), { color: BLUE, r: 3.8 });
    ax.poly([[TS[i - 1], VS[i - 1]], [TS[i], VS[i]]], { color: ACC, width: 3.4 });
    ax.dots([[TS[i - 1], VS[i - 1]], [TS[i], VS[i]]], { color: ACC, r: 4.6 });
    ax.dots([ACCEL[i]], { color: ACC, r: 5.2 });

    if (withTable) {
      rows.forEach(function (tr, k) {
        tr.classList.toggle('off', k > i);
        tr.classList.toggle('now', k === i);
      });
    }
    var dv = VS[i] - VS[i - 1];
    out.innerHTML = '<span class="live-eq">a = <span class="fr"><span>Δv</span><span class="dn">Δt</span></span>' +
      ' = <span class="fr"><span>' + VS[i].toFixed(2) + ' − ' + VS[i - 1].toFixed(2) + '</span>' +
      '<span class="dn">' + TS[i].toFixed(1) + ' − ' + TS[i - 1].toFixed(1) + '</span></span>' +
      ' = <b class="r">' + (dv / 0.2).toFixed(2) + '</b> m/s²</span>' +
      '<span class="hint">grey = the measured velocity · blue = the acceleration, built one interval at a time' +
      (withTable ? ' — the table fills in as it goes' : '') + '</span>';
  }

  var s = slider(u.ctl, 'Interval', 1, 10, 1, i,
    function (v) { return TS[v - 1].toFixed(1) + '→' + TS[v].toFixed(1) + ' s'; },
    function (v) { i = v; draw(); });
  var b = playBtn(u.ctl, '▶ Step through');
  b.addEventListener('click', function () {
    playing = !playing; b.textContent = playing ? '❚❚ Pause' : '▶ Step through';
    if (playing) { if (i >= 10) { i = 1; s.set(1); } tick(); } else clearTimeout(raf);
  });
  function tick() {
    if (i >= 10) { playing = false; b.textContent = '↻ Replay'; return; }
    i++; s.set(i); raf = setTimeout(tick, 700);
  }
  node._stop = function () { playing = false; clearTimeout(raf); b.textContent = '▶ Step through'; };
  node._draw = draw;
  draw();
};

/* --- 7. cumulative sum: constant acceleration → velocity --- */
W.cumulative = function (node) {
  var u = build(node);
  var ax1 = new Axes(u.cv, { w: 600, h: 344, xmin: 0, xmax: 10.4, ymin: 0, ymax: 25 });
  var out = readout(u.ctl);
  var k = 3, playing = false, raf, a = 2;
  function draw() {
    var c = ax1.c;
    ax1.clear();
    // top panel: acceleration (drawn in the upper third)
    ax1.setRange(0, 10.4, 0, 2.6); ax1.pt = 12; ax1.pb = 222;
    ax1.frame({ grid: true, xticks: [0, 2, 4, 6, 8, 10], yticks: [0, 1, 2], ylabel: 'accel' });
    for (var i = 0; i < 10; i++) {
      ax1.rect(i, 0, i + 1, a, { fill: i < k ? FILL2 : FILL0, stroke: i < k ? BLUE : SOFT, dash: [3, 3] });
      if (i < k) ax1.text(String(a), i + 0.5, a / 2, { align: 'center', color: INK, size: 16 });
    }
    ax1.fn(function () { return a; }, { from: 0, to: 10, color: ACC, width: 2.6 });
    // bottom panel: velocity
    ax1.setRange(0, 10.4, 0, 25); ax1.pt = 186; ax1.pb = 46;
    ax1.frame({ grid: true, xticks: [0, 2, 4, 6, 8, 10], yticks: [0, 5, 10, 15, 20, 25], xlabel: 'time (s)', ylabel: 'velocity' });
    var pts = [[0, 0]];
    for (var j = 1; j <= k; j++) pts.push([j, a * j]);
    ax1.poly(pts, { color: ACC, width: 2.6 });
    ax1.dots(pts, { color: ACC, r: 4 });
    ax1.pt = 12; ax1.pb = 222;
    var terms = [], run = 0, s2 = [];
    for (var q = 0; q < k; q++) { run += a; terms.push(a); s2.push(run); }
    out.innerHTML = k === 0 ? 'add rectangles one at a time…' :
      '<span class="a">' + terms.join(' + ') + '</span> &nbsp;→&nbsp; <b>' + s2.join(', ') + '</b>' +
      '<span class="hint">velocity at any time is the cumulative sum of the acceleration up to that time</span>';
  }
  var s = slider(u.ctl, 'Seconds accumulated', 0, 10, 1, k, function (v) { return v + ' s'; }, function (v) { k = v; draw(); });
  slider(u.ctl, 'acceleration (m/s²)', 0.5, 3, 0.5, a, function (v) { return v.toFixed(1); }, function (v) { a = v; draw(); });
  var b = playBtn(u.ctl, '▶ Accumulate');
  b.addEventListener('click', function () {
    playing = !playing; b.textContent = playing ? '❚❚ Pause' : '▶ Accumulate';
    if (playing) { if (k >= 10) { k = 0; s.set(0); } tick(); } else clearTimeout(raf);
  });
  function tick() {
    if (k >= 10) { playing = false; b.textContent = '↻ Replay'; return; }
    k++; s.set(k); raf = setTimeout(tick, 500);
  }
  node._stop = function () { playing = false; clearTimeout(raf); b.textContent = '▶ Accumulate'; };
  node._draw = draw;
  draw();
};

/* --- 8. Riemann sum convergence --- */
W.riemann = function (node, d) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 620, h: 258, xmin: 0, xmax: 8.6, ymin: 0, ymax: 3.2, padl: 56 });
  var out = readout(u.ctl);
  var n = parseInt(d.start || 8, 10), rule = 'mid', playing = false, raf;
  var TRUE = (function () { var s = 0, N = 20000, h = 8.6 / N; for (var i = 0; i < N; i++) s += bimodal((i + .5) * h) * h; return s; })();
  function draw() {
    ax.clear();
    ax.frame({ grid: true, xticks: [0, 2, 4, 6, 8], yticks: [0, 1, 2, 3], xlabel: 'Time (s)', ylabel: 'Acceleration (m/s²)' });
    var w = 8.6 / n, est = 0, i;
    for (i = 0; i < n; i++) {
      var x0 = i * w, x1 = x0 + w, h;
      if (rule === 'left') h = bimodal(x0);
      else if (rule === 'right') h = bimodal(x1);
      else if (rule === 'trap') h = (bimodal(x0) + bimodal(x1)) / 2;
      else h = bimodal(x0 + w / 2);
      est += h * w;
      if (rule === 'trap') {
        var c = ax.c; c.save(); c.fillStyle = FILL; c.strokeStyle = SOFT; c.lineWidth = 1;
        c.beginPath(); c.moveTo(ax.X(x0), ax.Y(0)); c.lineTo(ax.X(x0), ax.Y(bimodal(x0)));
        c.lineTo(ax.X(x1), ax.Y(bimodal(x1))); c.lineTo(ax.X(x1), ax.Y(0)); c.closePath();
        c.fill(); c.stroke(); c.restore();
      } else {
        ax.rect(x0, 0, x1, h, { fill: FILL, stroke: SOFT });
      }
    }
    ax.fn(bimodal, { from: 0, to: 8.6, color: INK, width: 2.2 });
    var err = (est - TRUE) / TRUE * 100;
    out.innerHTML = n + ' rectangles → estimate <b>' + est.toFixed(3) + '</b> &nbsp;·&nbsp; true area <b>' + TRUE.toFixed(3) + '</b>' +
      ' &nbsp;·&nbsp; error <b class="' + (Math.abs(err) < 0.5 ? 'g' : 'r') + '">' + (err >= 0 ? '+' : '') + err.toFixed(2) + '%</b>' +
      '<span class="hint">thinner rectangles → less error; in the limit this is the integral</span>';
  }
  var s = slider(u.ctl, 'Number of rectangles', 2, 160, 1, n, function (v) { return v; }, function (v) { n = v; draw(); });
  var seg = el('div', 'iseg');
  [['left', 'Lower'], ['right', 'Upper'], ['mid', 'Middle'], ['trap', 'Trapezoid']].forEach(function (p) {
    var b = el('button', 'iseg-b' + (p[0] === rule ? ' on' : ''), p[1]);
    b.addEventListener('click', function () {
      rule = p[0];
      Array.prototype.forEach.call(seg.children, function (x) { x.classList.remove('on'); });
      b.classList.add('on'); draw();
    });
    seg.appendChild(b);
  });
  u.ctl.appendChild(seg);
  var pb = playBtn(u.ctl, '▶ Shrink the base');
  pb.addEventListener('click', function () {
    playing = !playing; pb.textContent = playing ? '❚❚ Pause' : '▶ Shrink the base';
    if (playing) { if (n > 150) { n = 2; s.set(2); } loop(); } else cancelAnimationFrame(raf);
  });
  function loop() {
    n = Math.min(160, n + 1); s.set(n);
    if (n >= 160) { playing = false; pb.textContent = '↻ Replay'; return; }
    raf = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Shrink the base'; };
  node._draw = draw;
  draw();
};

/* --- 9. integral sum on real data --- */
W.integralSum = function (node) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 600, h: 252, xmin: -0.05, xmax: 2.15, ymin: 0, ymax: 10 });
  var out = readout(u.ctl);
  var i = 1, playing = false, raf, b0 = 0;
  var POS = (function () { var p = [0], s = 0, k; for (k = 1; k < VS.length; k++) { s += VS[k] * 0.2; p.push(s); } return p; })();
  function draw() {
    ax.clear();
    ax.setRange(-0.05, 2.15, 0, 10); ax.pt = 10; ax.pb = 158;
    ax.frame({ grid: true, xticks: [0, .4, .8, 1.2, 1.6, 2], yticks: [0, 5, 10], ylabel: 'velocity', xfmt: function (v) { return v.toFixed(1); } });
    for (var k = 1; k <= i; k++) ax.rect(TS[k] - 0.2, 0, TS[k], VS[k], { fill: FILL, stroke: SOFT, dash: [3, 3] });
    ax.poly(TS.map(function (t, k) { return [t, VS[k]]; }), { color: MUT, width: 2 });
    ax.dots(TS.map(function (t, k) { return [t, VS[k]]; }), { color: MUT, r: 3.2 });
    ax.rect(TS[i] - 0.2, 0, TS[i], VS[i], { fill: ACCFILL, stroke: ACC });
    ax.setRange(-0.05, 2.15, 0, Math.max(10, b0 + 10)); ax.pt = 126; ax.pb = 46;
    ax.frame({ grid: true, xticks: [0, .4, .8, 1.2, 1.6, 2], yticks: ticks(0, Math.max(10, b0 + 10), 4), xlabel: 'Time (s)', ylabel: 'position (m)', xfmt: function (v) { return v.toFixed(1); } });
    var pts = POS.slice(0, i + 1).map(function (p, k) { return [TS[k], p + b0]; });
    ax.poly(pts, { color: GRN, width: 2.4 }); ax.dots(pts, { color: GRN, r: 3.8 });
    ax.pt = 10; ax.pb = 158;
    out.innerHTML = 'area of this strip = ' + VS[i].toFixed(2) + ' × 0.2 = <b class="r">' + (VS[i] * 0.2).toFixed(3) + ' m</b>' +
      ' &nbsp;·&nbsp; running total = <b class="g">' + (POS[i] + b0).toFixed(3) + ' m</b>' +
      '<span class="hint">multiply each height by Δt, then cumulatively sum — b<sub>o</sub> sets where the curve starts</span>';
  }
  var s = slider(u.ctl, 'Data point', 1, 10, 1, i, function (v) { return TS[v].toFixed(1) + ' s'; }, function (v) { i = v; draw(); });
  slider(u.ctl, 'initial position b<sub>o</sub>', 0, 10, 0.5, 0, function (v) { return v.toFixed(1) + ' m'; }, function (v) { b0 = v; draw(); });
  var b = playBtn(u.ctl, '▶ Integrate');
  b.addEventListener('click', function () {
    playing = !playing; b.textContent = playing ? '❚❚ Pause' : '▶ Integrate';
    if (playing) { if (i >= 10) { i = 1; s.set(1); } tick(); } else clearTimeout(raf);
  });
  function tick() {
    if (i >= 10) { playing = false; b.textContent = '↻ Replay'; return; }
    i++; s.set(i); raf = setTimeout(tick, 600);
  }
  node._stop = function () { playing = false; clearTimeout(raf); b.textContent = '▶ Integrate'; };
  node._draw = draw;
  draw();
};

/* --- 10. initial value constant --- */
W.initialValue = function (node) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 560, h: 300, xmin: 0, xmax: 10.4, ymin: 0, ymax: 42 });
  var out = readout(u.ctl);
  var b0 = 0;
  function draw() {
    ax.clear();
    ax.frame({ grid: true, xticks: [0, 2, 4, 6, 8, 10], yticks: [0, 10, 20, 30, 40], xlabel: 'time (s)', ylabel: 'velocity (m/s)' });
    [[0, SOFT], [10, BLUE], [15, ORG]].forEach(function (p) {
      ax.fn(function (t) { return 2 * t + p[0]; }, { from: 0, to: 10, color: p[1], width: 1.8, dash: [5, 4] });
    });
    ax.fn(function (t) { return 2 * t + b0; }, { from: 0, to: 10, color: ACC, width: 3 });
    ax.dots([[0, b0]], { color: ACC, r: 5 });
    out.innerHTML = '<b>v(t) = 2t + ' + b0.toFixed(0) + '</b>' +
      '<span class="hint">the shape never changes — b<sub>o</sub> decides where the whole curve sits, and so changes every value on it</span>';
  }
  slider(u.ctl, 'initial velocity b<sub>o</sub>', 0, 20, 1, 0, function (v) { return v + ' m/s'; }, function (v) { b0 = v; draw(); });
  node._draw = draw;
  draw();
};

/* --- 11. area of a rectangle → velocity --- */
W.areaRect = function (node) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 560, h: 290, xmin: 0, xmax: 10.4, ymin: 0, ymax: 3.2 });
  var out = readout(u.ctl);
  var a = 2, T = 10;
  function draw() {
    ax.clear();
    ax.frame({ grid: true, xticks: [0, 2, 4, 6, 8, 10], yticks: [0, 1, 2, 3], xlabel: 'time (s)', ylabel: 'acceleration (m/s²)' });
    ax.rect(0, 0, T, a, { fill: FILL, stroke: BLUE, width: 1.6, dash: [4, 3] });
    ax.fn(function () { return a; }, { from: 0, to: T, color: ACC, width: 3 });
    ax.text('width = ' + T.toFixed(0) + ' s', T / 2, a / 2 + 0.32, { align: 'center', size: 16, color: INK });
    ax.text('height = ' + a.toFixed(1), T / 2, a / 2 - 0.02, { align: 'center', size: 16, color: INK });
    out.innerHTML = 'area = height × width = ' + a.toFixed(1) + ' × ' + T.toFixed(0) + ' = <b>' + (a * T).toFixed(1) + ' m/s</b>' +
      '<span class="hint">the area under an acceleration–time graph is a velocity</span>';
  }
  slider(u.ctl, 'acceleration (height)', 0.5, 3, 0.1, a, function (v) { return v.toFixed(1) + ' m/s²'; }, function (v) { a = v; draw(); });
  slider(u.ctl, 'time (width)', 1, 10, 0.5, T, function (v) { return v.toFixed(1) + ' s'; }, function (v) { T = v; draw(); });
  node._draw = draw;
  draw();
};

/* --- 12. straight line / quadratic explorer (slides 14, 16, 17) --- */
W.lineExplorer = function (node, d) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 540, h: 280, xmin: 0, xmax: 10.4, ymin: 0, ymax: 120 });
  var out = readout(u.ctl);
  var m = parseFloat(d.m || 2), b = 0, n = parseInt(d.n || 1, 10);
  function draw() {
    var f = function (t) { return m * Math.pow(t, n) + b; };
    var hi = Math.max(10, f(10) * 1.1, b * 1.3);
    ax.setRange(0, 10.4, 0, hi);
    ax.clear();
    ax.frame({ grid: true, xticks: [0, 2, 4, 6, 8, 10], yticks: ticks(0, hi, 5), xlabel: 'time (s)', ylabel: 'velocity (m/s)', yfmt: function (v) { return v.toFixed(0); } });
    ax.fn(f, { from: 0, to: 10, color: ACC, width: 3 });
    ax.dots([[0, b]], { color: ACC, r: 4.5 });
    out.innerHTML = '<b>v(t) = ' + m + 't' + (n > 1 ? sup(n) : '') + (b ? ' + ' + b : '') + '</b>' +
      ' &nbsp;·&nbsp; c = ' + m + ', n = ' + n +
      '<span class="hint">every kinematic term has the form c·t<sup>n</sup></span>';
  }
  slider(u.ctl, 'slope / coefficient <i>c</i>', 0.5, 5, 0.5, m, function (v) { return v; }, function (v) { m = v; draw(); });
  slider(u.ctl, 'exponent <i>n</i>', 1, 3, 1, n, function (v) { return v; }, function (v) { n = v; draw(); });
  slider(u.ctl, 'intercept <i>b</i>', 0, 20, 1, b, function (v) { return v; }, function (v) { b = v; draw(); });
  node._draw = draw;
  draw();
};

/* --- 13. data series revealed point by point: table and graph grow together --- */
W.seriesReveal = function (node, d) {
  var u = build(node);
  u.cv.parentNode.parentNode.classList.add('iseries');

  // table lives inside the widget so it stays in lockstep with the plot
  var side = el('div', 'iseries-tab');
  var tbl = el('table');
  var thead = el('thead');
  thead.innerHTML = '<tr><th>Time (s)</th><th>Velocity (m/s)</th></tr>';
  var tb = el('tbody');
  tbl.appendChild(thead); tbl.appendChild(tb); side.appendChild(tbl);
  var rows = TS.map(function (t, k) {
    var tr = el('tr');
    tr.innerHTML = '<td>' + t.toFixed(1) + '</td><td>' + VS[k].toFixed(2) + '</td>';
    tb.appendChild(tr); return tr;
  });
  u.cv.parentNode.parentNode.insertBefore(side, u.ctl);

  var ax = new Axes(u.cv, { w: 640, h: 262, padl: 68, xmin: -0.06, xmax: 2.12, ymin: 0, ymax: 10 });
  var out = readout(u.ctl);
  var n = parseInt(d.start || 1, 10), playing = false, timer;

  function draw() {
    ax.clear();
    ax.frame({
      grid: true, xticks: [0, .2, .4, .6, .8, 1, 1.2, 1.4, 1.6, 1.8, 2],
      yticks: [0, 2, 4, 6, 8, 10], xlabel: 'Time (s)', ylabel: 'Velocity (m/s)',
      xfmt: function (v) { return v.toFixed(1); }, yfmt: function (v) { return v.toFixed(2); }
    });
    var shown = [];
    for (var k = 0; k < n; k++) shown.push([TS[k], VS[k]]);
    ax.poly(shown, { color: MUT, width: 2.2 });
    ax.dots(shown, { color: MUT, r: 3.6 });
    // newest point called out
    var last = shown[shown.length - 1];
    ax.poly([[last[0], 0], [last[0], last[1]]], { color: ACC, width: 1.4, dash: [4, 3] });
    ax.dots([last], { color: ACC, r: 5.4 });
    var flip = last[0] > 1.6;
    ax.text(last[1].toFixed(2) + ' m/s', last[0] + (flip ? -0.09 : 0.05), last[1] + 0.75,
      { color: ACC, size: 16, align: flip ? 'right' : 'left' });
    // rows follow the plot
    rows.forEach(function (tr, k) {
      tr.classList.toggle('off', k >= n);
      tr.classList.toggle('now', k === n - 1);
    });
    out.innerHTML = n + ' of 11 samples &nbsp;·&nbsp; <i>t</i> = <b>' + TS[n - 1].toFixed(1) +
      ' s</b>, <i>v</i> = <b class="r">' + VS[n - 1].toFixed(2) + ' m/s</b>' +
      '<span class="hint">sampled at 5 Hz — 0.2 s between every point</span>';
  }
  var s = slider(u.ctl, 'Samples collected', 1, 11, 1, n, function (v) { return v + ' / 11'; },
    function (v) { n = v; draw(); });
  var b = playBtn(u.ctl, '▶ Collect data');
  b.addEventListener('click', function () {
    playing = !playing; b.textContent = playing ? '❚❚ Pause' : '▶ Collect data';
    if (playing) { if (n >= 11) { n = 1; s.set(1); } tick(); } else clearTimeout(timer);
  });
  function tick() {
    if (n >= 11) { playing = false; b.textContent = '↻ Replay'; return; }
    n++; s.set(n); timer = setTimeout(tick, 520);
  }
  node._stop = function () { playing = false; clearTimeout(timer); b.textContent = '▶ Collect data'; };
  node._draw = draw;
  draw();
};

/* --- 14. tangent explorer: local zoom shows "best straight line" --- */
W.tangentZoom = function (node) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 1060, h: 238, padl: 70, padr: 400, xmin: 0, xmax: 6.35, ymin: -2, ymax: 36 });
  var out = readout(u.ctl);
  var t = 1.8, zoom = 1.2, playing = false, raf, dir = 1;

  function draw() {
    var c = ax.c;
    ax.clear();
    /* ---- main curve ---- */
    ax.frame({ grid: true, xticks: [0, 1, 2, 3, 4, 5, 6], yticks: [0, 8, 16, 24, 32],
      xlabel: 'time (s)', ylabel: 'displacement (m)' });
    ax.fn(D, { from: 0, to: 6, color: INK, width: 2.4 });
    var m = V(t);
    ax.fn(function (x) { return D(t) + m * (x - t); },
      { from: Math.max(0, t - 1.5), to: Math.min(6.35, t + 1.5), color: ACC, width: 2.8 });
    ax.dots([[t, D(t)]], { color: ACC, r: 5.6 });
    /* window we are about to magnify */
    var w = zoom;
    ax.rect(t - w / 2, D(t) - w * 5, t + w / 2, D(t) + w * 5,
      { stroke: BLUE, width: 1.6, dash: [4, 3] });

    /* ---- zoom inset, drawn in raw pixels on the right ---- */
    var ix = ax.W - 386, iy = 16, iw = 360, ih = 196;
    c.save();
    c.fillStyle = PLATE; c.strokeStyle = BLUE; c.lineWidth = 1.6;
    c.fillRect(ix, iy, iw, ih); c.strokeRect(ix + .5, iy + .5, iw, ih);
    c.beginPath(); c.rect(ix, iy, iw, ih); c.clip();
    var x0 = t - w / 2, x1 = t + w / 2, y0 = D(t) - w * 5, y1 = D(t) + w * 5;
    function PX(x) { return ix + (x - x0) / (x1 - x0) * iw; }
    function PY(y) { return iy + ih - (y - y0) / (y1 - y0) * ih; }
    // the curve, magnified
    c.strokeStyle = INK; c.lineWidth = 2.6; c.beginPath();
    for (var i = 0; i <= 160; i++) {
      var xx = x0 + (x1 - x0) * i / 160;
      if (i === 0) c.moveTo(PX(xx), PY(D(xx))); else c.lineTo(PX(xx), PY(D(xx)));
    }
    c.stroke();
    // the tangent, magnified
    c.strokeStyle = ACC; c.lineWidth = 2.2; c.setLineDash([6, 4]); c.beginPath();
    c.moveTo(PX(x0), PY(D(t) + m * (x0 - t))); c.lineTo(PX(x1), PY(D(t) + m * (x1 - t)));
    c.stroke(); c.setLineDash([]);
    c.fillStyle = ACC; c.beginPath(); c.arc(PX(t), PY(D(t)), 5, 0, 7); c.fill();
    c.restore();
    c.save();
    c.fillStyle = MUT; c.font = '600 12.5px system-ui,sans-serif'; c.textAlign = 'left';
    c.fillText('zoomed in ×' + (6 / w).toFixed(1), ix + 2, iy - 8);
    c.restore();

    /* how different are curve and tangent across the window? */
    var worst = 0;
    for (var k = 0; k <= 40; k++) {
      var xk = x0 + (x1 - x0) * k / 40;
      worst = Math.max(worst, Math.abs(D(xk) - (D(t) + m * (xk - t))));
    }
    out.innerHTML = 'tangent at <i>t</i> = <b>' + t.toFixed(2) + ' s</b> &nbsp;·&nbsp; slope = <b class="r">' +
      m.toFixed(2) + '</b> m/s — the instantaneous velocity there' +
      '<span class="hint">across this window the tangent is never more than <b>' + worst.toFixed(3) +
      ' m</b> away from the curve — zoom in far enough and a curve <i>is</i> its tangent</span>';
  }

  var st = slider(u.ctl, 'Point on the curve', 0.1, 5.9, 0.02, t,
    function (v) { return v.toFixed(2) + ' s'; }, function (v) { t = v; draw(); });
  slider(u.ctl, 'Zoom window width', 0.15, 3, 0.05, zoom,
    function (v) { return v.toFixed(2) + ' s'; }, function (v) { zoom = v; draw(); });
  var b = playBtn(u.ctl, '▶ Slide along');
  b.addEventListener('click', function () {
    playing = !playing; b.textContent = playing ? '❚❚ Pause' : '▶ Slide along';
    if (playing) loop(); else cancelAnimationFrame(raf);
  });
  function loop() {
    t += dir * 0.022;
    if (t >= 5.9) { t = 5.9; dir = -1; } if (t <= 0.1) { t = 0.1; dir = 1; }
    st.input.value = t; st.sync();
    raf = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; cancelAnimationFrame(raf); b.textContent = '▶ Slide along'; };
  node._draw = draw;
  draw();
};

/* --- 15. graphical differentiation on a projectile: tangents above, slope graph below --- */
W.slopeTransfer = function (node) {
  /* a ball thrown straight up: h(t) = 20t − 4.9t²  →  v(t) = 20 − 9.8t  */
  var V0 = 20, G = 9.8, TMAX = 2 * V0 / G;                 // 4.08 s of flight
  var H = function (t) { return V0 * t - 0.5 * G * t * t; };
  var Vy = function (t) { return V0 - G * t; };

  var u = build(node);
  var ax = new Axes(u.cv, { w: 1080, h: 306, padl: 78, xmin: 0, xmax: 4.35, ymin: 0, ymax: 22 });
  var out = readout(u.ctl);
  var STOPS = [0.2, 0.6, 1.0, 1.4, 1.8, 2.04, 2.3, 2.7, 3.1, 3.5, 3.9];
  var k = 1, playing = false, timer;
  var TOP = { pt: 12, pb: 168 }, BOT = { pt: 166, pb: 46 };

  function draw() {
    var c = ax.c, i;
    ax.clear();

    /* ---------- top: the flight path ---------- */
    ax.setRange(0, 4.35, 0, 22); ax.pt = TOP.pt; ax.pb = TOP.pb;
    ax.frame({ grid: true, xticks: [0, 1, 2, 3, 4], yticks: [0, 10, 20], ylabel: 'height (m)' });
    ax.fn(H, { from: 0, to: TMAX, color: INK, width: 2.6 });
    ax.text('h(t) = 20t − 4.9t²   ·   a ball thrown straight up', 4.3, 21.2, { color: INK, size: 15, align: 'right' });

    var topY = [];
    for (i = 0; i < k; i++) {
      var t = STOPS[i], m = Vy(t), on = (i === k - 1);
      ax.fn(function (x) { return H(t) + m * (x - t); },
        { from: Math.max(0, t - 0.52), to: Math.min(4.35, t + 0.52),
          color: on ? ACC : MUTED_ACC, width: on ? 3.2 : 2.1 });
      ax.dots([[t, H(t)]], { color: on ? ACC : MUTED_ACC, r: on ? 5.4 : 3.6 });
      topY.push(ax.Y(H(t)));
    }

    /* ---------- bottom: the slopes, plotted ---------- */
    ax.setRange(0, 4.35, -22, 22); ax.pt = BOT.pt; ax.pb = BOT.pb;
    ax.frame({ grid: true, zero: true, xticks: [0, 1, 2, 3, 4], yticks: [-20, -10, 0, 10, 20],
      xlabel: 'time (s)', ylabel: 'velocity (m/s)' });
    var pts = [];
    for (i = 0; i < k; i++) pts.push([STOPS[i], Vy(STOPS[i])]);
    if (k > 1) ax.poly(pts, { color: BLUE, width: 2.6 });
    ax.dots(pts.slice(0, k - 1), { color: BLUE, r: 4.4 });
    ax.dots([pts[k - 1]], { color: ACC, r: 5.8 });
    if (k === STOPS.length) {
      ax.fn(Vy, { from: 0, to: TMAX, color: BLUE, width: 1.8, dash: [6, 4] });
      ax.text('v(t) = 20 − 9.8t', 2.45, 16.5, { color: BLUE, size: 15 });
    }

    /* ---------- carry the slope from the top graph down to the bottom ---------- */
    var t2 = STOPS[k - 1], m2 = Vy(t2);
    c.save();
    c.strokeStyle = ACC; c.lineWidth = 1.8; c.setLineDash([5, 4]);
    c.beginPath();
    c.moveTo(ax.X(t2), topY[k - 1] + 9);
    c.lineTo(ax.X(t2), ax.Y(m2) - 10);
    c.stroke(); c.setLineDash([]);
    c.fillStyle = ACC; c.beginPath();
    c.moveTo(ax.X(t2), ax.Y(m2) - 4);
    c.lineTo(ax.X(t2) - 5, ax.Y(m2) - 12);
    c.lineTo(ax.X(t2) + 5, ax.Y(m2) - 12);
    c.closePath(); c.fill();
    c.restore();
    var flip = t2 > 3.2;
    ax.text(m2.toFixed(1) + ' m/s', t2 + (flip ? -0.1 : 0.12), m2,
      { color: ACC, size: 15, align: flip ? 'right' : 'left' });
    ax.pt = TOP.pt; ax.pb = TOP.pb;

    var phase = m2 > 0.4 ? 'still rising' : (m2 < -0.4 ? 'falling' : 'at the very top — slope zero');
    out.innerHTML = 'tangent ' + k + ' of ' + STOPS.length + ' — at <i>t</i> = <b>' + t2.toFixed(2) +
      ' s</b> the slope is <b class="r">' + m2.toFixed(2) + ' m/s</b> (' + phase + ')' +
      '<span class="hint">' + (k === STOPS.length
        ? 'the slopes fall on a straight line — a parabola differentiates to a constant acceleration of −9.8 m/s²'
        : 'draw a tangent, measure its slope, drop it onto the lower graph — then move along and repeat') + '</span>';
  }

  var s1 = slider(u.ctl, 'Tangents drawn', 1, STOPS.length, 1, k,
    function (v) { return v + ' / ' + STOPS.length; }, function (v) { k = v; draw(); });
  var b = playBtn(u.ctl, '▶ Draw the tangents');
  b.addEventListener('click', function () {
    playing = !playing; b.textContent = playing ? '❚❚ Pause' : '▶ Draw the tangents';
    if (playing) { if (k >= STOPS.length) { k = 1; s1.set(1); } tick(); } else clearTimeout(timer);
  });
  function tick() {
    if (k >= STOPS.length) { playing = false; b.textContent = '↻ Replay'; return; }
    k++; s1.set(k); timer = setTimeout(tick, 760);
  }
  node._stop = function () { playing = false; clearTimeout(timer); b.textContent = '▶ Draw the tangents'; };
  node._draw = draw;
  draw();
};

/* --- 16. the 2009 Berlin 100 m final: the medallists --- */
/*  Official times and reaction times are the championship results.
    `splits` = measured cumulative 10 m split times. Where they are present the model is
    least-squares fitted to them and the runner is drawn SOLID with their data points shown.
    Where `splits` is null the runner is MODELLED: the reference tau is kept and vmax is
    solved so the model finishes 100 m at the official time — drawn DASHED.
    Paste a runner's real splits into the array below and the figure upgrades itself.      */
var TAU_REF = 1.2411;
var RUNNERS = [
  { key: 'bolt',   name: 'Bolt',   time: 9.58, rt: 0.146,
    splits: [1.89, 2.88, 3.78, 4.64, 5.47, 6.29, 7.10, 7.92, 8.75, 9.58] },
  { key: 'gay',    name: 'Gay',    time: 9.71, rt: 0.144, splits: null },
  { key: 'powell', name: 'Powell', time: 9.84, rt: 0.134, splits: null }
];
var SPLIT_D = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function modelD(vmax, tau, t0, t) {
  var x = Math.max(t - t0, 0);
  return vmax * (x + tau * (Math.exp(-x / tau) - 1));
}
/* two-parameter least squares by coarse-to-fine grid — small, dependency-free, plenty exact */
function fitRunner(r) {
  if (!r.splits) {                       // no data: keep tau, solve vmax from the finish
    var x = r.time - r.rt;
    r.tau = TAU_REF;
    r.vmax = 100 / (x + TAU_REF * (Math.exp(-x / TAU_REF) - 1));
    r.measured = false;
    return;
  }
  var lo = [9, 0.6], hi = [15, 2.4], best = [12, 1.2], step, i, j, k, v, tt, e, bestE = Infinity;
  for (k = 0; k < 4; k++) {
    var n = 26;
    for (i = 0; i <= n; i++) {
      v = lo[0] + (hi[0] - lo[0]) * i / n;
      for (j = 0; j <= n; j++) {
        tt = lo[1] + (hi[1] - lo[1]) * j / n;
        e = 0;
        for (var q = 0; q < r.splits.length; q++) {
          var dd = modelD(v, tt, r.rt, r.splits[q]) - SPLIT_D[q];
          e += dd * dd;
        }
        if (e < bestE) { bestE = e; best = [v, tt]; }
      }
    }
    step = [(hi[0] - lo[0]) / n, (hi[1] - lo[1]) / n];
    lo = [best[0] - step[0], best[1] - step[1]];
    hi = [best[0] + step[0], best[1] + step[1]];
  }
  r.vmax = best[0]; r.tau = best[1]; r.measured = true;
  r.rmse = Math.sqrt(bestE / r.splits.length);
}
RUNNERS.forEach(fitRunner);

function runD(r, t) { return modelD(r.vmax, r.tau, r.rt, Math.min(t, r.time)); }
function runV(r, t) {
  if (t <= r.rt) return 0;
  return r.vmax * (1 - Math.exp(-(Math.min(t, r.time) - r.rt) / r.tau));
}
function runA(r, t) {
  if (t <= r.rt) return 0;
  return (r.vmax / r.tau) * Math.exp(-(Math.min(t, r.time) - r.rt) / r.tau);
}
/* measured segment speeds (mid-segment) and the finite differences between them */
function segSpeeds(r) {
  if (!r.splits) return [];
  var out = [], i, a, b;
  for (i = 0; i < r.splits.length; i++) {
    a = i ? r.splits[i - 1] : 0; b = r.splits[i];
    out.push([(a + b) / 2, 10 / (b - a)]);
  }
  return out;
}
function segAccels(r) {
  var v = segSpeeds(r), out = [], i;
  for (i = 1; i < v.length; i++) {
    out.push([(v[i][0] + v[i - 1][0]) / 2, (v[i][1] - v[i - 1][1]) / (v[i][0] - v[i - 1][0])]);
  }
  return out;
}

W.sprint = function (node) {
  var u = build(node);
  u.cv.parentNode.parentNode.classList.add('isplit', 'isprint');
  var side = el('div', 'icalc');
  u.cv.parentNode.parentNode.insertBefore(side, u.ctl);

  var TMAX = 9.84;
  var ax = new Axes(u.cv, { w: 940, h: 380, padl: 64, padr: 70, xmin: -0.1, xmax: 10.1, ymin: 0, ymax: 100 });
  var out = readout(u.ctl);
  var t = TMAX, playing = false, raf, last = 0, show = 'all';
  var LANES = 58;
  var P = [ { pt: LANES + 4, pb: 238 }, { pt: 160, pb: 140 }, { pt: 258, pb: 42 } ];

  function colour(r) { return r.key === 'bolt' ? ACC : (r.key === 'gay' ? BLUE : ORG); }
  function visible(r) { return show === 'all' || show === r.key; }
  function focusRunner() {
    return show === 'all' ? RUNNERS[0] : RUNNERS.filter(function (r) { return r.key === show; })[0];
  }

  function panel(i, f, lo, hi, ticks, label, xlab) {
    ax.setRange(-0.1, 10.1, lo, hi); ax.pt = P[i].pt; ax.pb = P[i].pb;
    ax.frame({ grid: true, xticks: [0, 2, 4, 6, 8, 10], yticks: ticks,
      xlabel: xlab || null, ylabel: label, ysize: 12.5 });
    RUNNERS.forEach(function (r) {
      if (!visible(r)) return;
      ax.fn(function (x) { return f(r, x); },
        { from: 0, to: Math.min(t, r.time), color: colour(r), width: 2.5,
          dash: r.measured ? null : [7, 4] });
      if (t < r.time) ax.fn(function (x) { return f(r, x); },
        { from: t, to: r.time, color: SOFT, width: 1.4, dash: [5, 4] });
      ax.dots([[Math.min(t, r.time), f(r, t)]], { color: colour(r), r: 4.8 });
    });
  }

  function draw() {
    var c = ax.c, i;
    ax.clear();
    ax.setRange(-0.1, 10.1, 0, 100); ax.pt = P[0].pt; ax.pb = P[0].pb;
    var lx0 = ax.pl, lx1 = ax.W - ax.pr - 58;

    /* ---------- the lanes, seen from above ---------- */
    c.save();
    c.font = '600 12px ui-sans-serif,system-ui,sans-serif';
    RUNNERS.forEach(function (r, k) {
      var ly = 10 + k * 17, lh = 12, on = visible(r);
      c.globalAlpha = on ? 1 : 0.2;
      c.fillStyle = PANEL; c.fillRect(lx0, ly, lx1 - lx0, lh);
      c.strokeStyle = SOFT; c.lineWidth = 1;
      for (i = 1; i < 10; i++) {
        var gx = lx0 + (lx1 - lx0) * i / 10;
        c.beginPath(); c.moveTo(gx, ly); c.lineTo(gx, ly + lh); c.stroke();
      }
      var d = runD(r, t);
      c.fillStyle = colour(r);
      c.beginPath(); c.arc(lx0 + (lx1 - lx0) * d / 100, ly + lh / 2, 5.5, 0, 7); c.fill();
      c.textAlign = 'right'; c.textBaseline = 'middle';
      c.fillStyle = on ? colour(r) : MUT;
      c.fillText(r.name, lx0 - 8, ly + lh / 2);
      c.textAlign = 'left'; c.fillStyle = MUT;
      c.fillText(d >= 100 ? r.time.toFixed(2) + ' s' : d.toFixed(1) + ' m', lx1 + 7, ly + lh / 2);
      c.globalAlpha = 1;
    });
    c.restore();

    /* ---------- the three graphs ---------- */
    panel(0, runD, 0, 100, [0, 50, 100], 'distance (m)');
    if (visible(RUNNERS[0]) && RUNNERS[0].measured) {
      ax.dots(RUNNERS[0].splits.map(function (tt, k) { return [tt, SPLIT_D[k]]; }), { color: INK, r: 3.2 });
    }
    panel(1, runV, 0, 14, [0, 4, 8, 12], 'speed (m/s)');
    RUNNERS.forEach(function (r) {
      if (visible(r) && r.measured) ax.dots(segSpeeds(r), { color: INK, r: 3.2 });
    });
    panel(2, runA, -1, 11, [0, 4, 8], 'accel (m/s²)', 'time (s)');
    RUNNERS.forEach(function (r) {
      if (visible(r) && r.measured) ax.dots(segAccels(r), { color: INK, r: 3.2 });
    });
    ax.pt = P[0].pt; ax.pb = P[0].pb;

    /* ---------- the calculations, at this instant ---------- */
    var f = focusRunner();
    var d = runD(f, t), v = runV(f, t), a = runA(f, t);
    var html = '<div class="icalc-h">at <span class="v">t = ' + t.toFixed(2) + ' s</span>' +
      ' &nbsp;<span style="color:' + colour(f) + '">' + f.name + '</span></div>';
    html += '<div class="icalc-work">' +
      '<div class="icalc-t">slope of the distance graph</div>' +
      '<div class="icalc-eq">v = <span class="fr"><span>Δd</span><span class="dn">Δt</span></span>' +
      ' = <b>' + v.toFixed(2) + '</b> m/s</div>' +
      '<div class="icalc-t" style="margin-top:.5em">slope of the speed graph</div>' +
      '<div class="icalc-eq">a = <span class="fr"><span>Δv</span><span class="dn">Δt</span></span>' +
      ' = <b>' + a.toFixed(2) + '</b> m/s²</div></div>';
    if (show !== 'all') {
      html += '<div class="icalc-vals">' +
        '<div><span>d</span><b>' + d.toFixed(1) + ' m</b></div>' +
        '<div><span>v</span><b>' + v.toFixed(2) + '</b></div>' +
        '<div><span>a</span><b>' + a.toFixed(2) + '</b></div></div>';
    } else {
      html += '<table class="icalc-tab"><thead><tr><th></th>' +
        '<th>d (m)</th><th>v (m/s)</th><th>a (m/s²)</th></tr></thead><tbody>';
      RUNNERS.forEach(function (r) {
        html += '<tr><td style="color:' + colour(r) + '">' + r.name + '</td>' +
          '<td>' + runD(r, t).toFixed(1) + '</td><td>' + runV(r, t).toFixed(2) +
          '</td><td>' + runA(r, t).toFixed(2) + '</td></tr>';
      });
      html += '</tbody></table>';
    }
    side.innerHTML = html;

    var lead = Math.max.apply(null, RUNNERS.map(function (r) { return runD(r, t); }));
    var gap = lead - d;
    var phase = a > 2 ? 'still accelerating hard' : (a > 0.4 ? 'still accelerating' : 'at top speed');
    out.innerHTML = '<b style="color:' + colour(f) + '">' + f.name + '</b> is ' + phase +
      ' &nbsp;·&nbsp; ' + (v * 3.6).toFixed(1) + ' km/h' +
      (show === 'all' && gap > 0.05 ? ' &nbsp;·&nbsp; <span class="gap">' + gap.toFixed(2) + ' m behind</span>' : '') +
      '<span class="hint">Berlin 2009 final. <b>Solid + dots</b> = fitted to measured 10 m splits. ' +
      '<b>Dashed</b> = modelled from the official finish and reaction time. ' +
      'Each graph is the <b>slope</b> of the one above it.</span>';
  }

  var seg = el('div', 'iseg');
  [['all', 'All three']].concat(RUNNERS.map(function (r) {
    return [r.key, r.name + ' ' + r.time.toFixed(2)];
  })).forEach(function (pair) {
    var btn = el('button', 'iseg-b' + (pair[0] === show ? ' on' : ''), pair[1]);
    btn.addEventListener('click', function () {
      show = pair[0];
      Array.prototype.forEach.call(seg.children, function (x) { x.classList.remove('on'); });
      btn.classList.add('on'); draw();
    });
    seg.appendChild(btn);
  });
  var row = el('div', 'ictl-row');
  u.ctl.appendChild(row);
  row.appendChild(seg);

  var s1 = slider(u.ctl, 'Time into the race', 0, TMAX, 0.01, t,
    function (v) { return v.toFixed(2) + ' s'; }, function (v) { t = v; draw(); });
  var b = playBtn(row, '▶ Run the race');
  b.addEventListener('click', function () {
    playing = !playing; b.textContent = playing ? '❚❚ Pause' : '▶ Run the race';
    if (playing) { if (t >= TMAX) { t = 0; s1.set(0); } last = 0; raf = requestAnimationFrame(loop); }
    else cancelAnimationFrame(raf);
  });
  function loop(ts) {
    if (!last) last = ts;
    t = Math.min(TMAX, t + (ts - last) / 1000 * 0.8);
    last = ts; s1.input.value = t; s1.sync();
    if (t >= TMAX) { playing = false; b.textContent = '↻ Run again'; return; }
    raf = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; cancelAnimationFrame(raf); b.textContent = '▶ Run the race'; };
  node._draw = draw;
  draw();
};

/* --- 17. displacement → velocity → acceleration, all by slope --- */
W.tripleSlope = function (node) {
  var u = build(node);
  u.cv.parentNode.parentNode.classList.add('isplit');
  var side = el('div', 'icalc');
  u.cv.parentNode.parentNode.insertBefore(side, u.ctl);

  var ax = new Axes(u.cv, { w: 740, h: 318, padl: 68, xmin: 0, xmax: 6.3, ymin: 0, ymax: 36 });
  var out = readout(u.ctl);
  var t = 1.4, playing = false, raf, dir = 1;
  var P = [ { pt: 8, pb: 222 }, { pt: 114, pb: 116 }, { pt: 216, pb: 42 } ];

  function panel(i, f, slope, lo, hi, ticks, label, col, showTan) {
    ax.setRange(0, 6.3, lo, hi); ax.pt = P[i].pt; ax.pb = P[i].pb;
    ax.frame({ grid: true, zero: true, xticks: [0, 1, 2, 3, 4, 5, 6], yticks: ticks,
      xlabel: i === 2 ? 'time (s)' : null, ylabel: label, ysize: 13 });
    ax.fn(f, { from: 0, to: 6, color: col, width: 2.6 });
    if (showTan) {
      var m = slope(t), y = f(t);
      ax.fn(function (x) { return y + m * (x - t); },
        { from: Math.max(0, t - 1.0), to: Math.min(6.3, t + 1.0), color: ACC, width: 2.6 });
    }
    ax.dots([[t, f(t)]], { color: ACC, r: 5.2 });
    return ax.Y(f(t));
  }

  function draw() {
    var c = ax.c;
    ax.clear();
    var y0 = panel(0, D, V, -2, 36, [0, 16, 32], 'd (m)', INK, true);
    var y1 = panel(1, V, A, -40, 16, [-36, -12, 12], 'v (m/s)', BLUE, true);
    var y2 = panel(2, A, function () { return -6; }, -26, 16, [-24, 0, 12], 'a (m/s²)', GRN, false);

    /* arrows carrying each slope down to the next panel */
    c.save(); c.strokeStyle = ACC; c.lineWidth = 1.6; c.setLineDash([5, 4]);
    [[y0, y1], [y1, y2]].forEach(function (pair) {
      c.beginPath(); c.moveTo(ax.X(t), pair[0] + 8); c.lineTo(ax.X(t), pair[1] - 10); c.stroke();
      c.setLineDash([]);
      c.fillStyle = ACC; c.beginPath();
      c.moveTo(ax.X(t), pair[1] - 4);
      c.lineTo(ax.X(t) - 4.6, pair[1] - 12);
      c.lineTo(ax.X(t) + 4.6, pair[1] - 12);
      c.closePath(); c.fill();
      c.setLineDash([5, 4]);
    });
    c.restore();
    ax.pt = P[0].pt; ax.pb = P[0].pb;

    side.innerHTML =
      '<div class="icalc-h">at <span class="v">t = ' + t.toFixed(2) + ' s</span></div>' +
      '<div class="icalc-work">' +
        '<div class="icalc-t">slope of the displacement graph</div>' +
        '<div class="icalc-eq">v = <span class="fr"><span>Δd</span><span class="dn">Δt</span></span>' +
        ' = <b>' + V(t).toFixed(2) + '</b> m/s</div>' +
        '<div class="icalc-t" style="margin-top:.5em">slope of the velocity graph</div>' +
        '<div class="icalc-eq">a = <span class="fr"><span>Δv</span><span class="dn">Δt</span></span>' +
        ' = <b>' + A(t).toFixed(2) + '</b> m/s²</div>' +
      '</div>' +
      '<div class="icalc-vals">' +
        '<div><span>d</span><b>' + D(t).toFixed(2) + ' m</b></div>' +
        '<div><span>v</span><b>' + V(t).toFixed(2) + ' m/s</b></div>' +
        '<div><span>a</span><b>' + A(t).toFixed(2) + ' m/s²</b></div>' +
      '</div>';

    var note = V(t) > 0.2 ? 'moving away' : (V(t) < -0.2 ? 'coming back' : 'momentarily stopped');
    out.innerHTML = 'Each graph is the <b>slope</b> of the one above it — ' + note +
      ', and slowing at a steady rate' +
      '<span class="hint">acceleration is a straight line here because displacement is a cubic: ' +
      'differentiating drops the power by one each time</span>';
  }

  var s1 = slider(u.ctl, 'Time', 0, 6, 0.02, t, function (v) { return v.toFixed(2) + ' s'; },
    function (v) { t = v; draw(); });
  var b = playBtn(u.ctl, '▶ Sweep');
  b.addEventListener('click', function () {
    playing = !playing; b.textContent = playing ? '❚❚ Pause' : '▶ Sweep';
    if (playing) loop(); else cancelAnimationFrame(raf);
  });
  function loop() {
    t += dir * 0.022; if (t >= 6) { t = 6; dir = -1; } if (t <= 0) { t = 0; dir = 1; }
    s1.input.value = t; s1.sync();
    raf = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; cancelAnimationFrame(raf); b.textContent = '▶ Sweep'; };
  node._draw = draw;
  draw();
};

/* --- 18. a video panel: click to play a YouTube clip inside the slide --- */
/*  The clip is not bundled — pick it once and the deck remembers it (localStorage).
    Set a default in index.html with  window.EPHE341_RACE_VIDEO = '<url or id>';       */
function ytId(v) {
  if (!v) return '';
  v = String(v).trim();
  if (/^[\w-]{11}$/.test(v)) return v;
  var m = v.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : '';
}
W.video = function (node, d) {
  var key = 'ephe341-video-' + (d.slot || 'main');
  var search = d.search || '';
  var wrap = el('div', 'ivideo');
  node.appendChild(wrap);

  function stored() {
    try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
  }
  function save(v) { try { localStorage.setItem(key, v); } catch (e) {} }
  function current() { return ytId(stored() || window.EPHE341_RACE_VIDEO || d.video || ''); }

  function renderForm() {
    wrap.innerHTML =
      '<div class="ivideo-box ivideo-setup">' +
        '<div class="ivideo-title">Race video</div>' +
        '<p>Paste the YouTube link for the race and it will play here. Saved in this browser.</p>' +
        '<div class="ivideo-row">' +
          '<input type="text" class="ivideo-in" placeholder="https://www.youtube.com/watch?v=…  or the 11-character id">' +
          '<button class="ibtn ivideo-load">Load</button>' +
        '</div>' +
        (search ? '<a class="ivideo-link" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=' +
          encodeURIComponent(search) + '">Search YouTube for it ↗</a>' : '') +
      '</div>';
    var inp = wrap.querySelector('.ivideo-in');
    function go() {
      var id = ytId(inp.value);
      if (!id) { inp.classList.add('bad'); return; }
      save(id); render();
    }
    wrap.querySelector('.ivideo-load').addEventListener('click', go);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    inp.addEventListener('input', function () { inp.classList.remove('bad'); });
  }

  function renderFacade(id) {
    wrap.innerHTML =
      '<div class="ivideo-box ivideo-facade" style="background-image:url(https://img.youtube.com/vi/' +
        id + '/hqdefault.jpg)">' +
        '<button class="ivideo-play" aria-label="Play the race video">' +
          '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="ivideo-meta">' +
        '<a target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=' + id + '">Open on YouTube ↗</a>' +
        '<button class="ivideo-change">Change video</button>' +
      '</div>';
    wrap.querySelector('.ivideo-play').addEventListener('click', function () { renderPlayer(id); });
    wrap.querySelector('.ivideo-change').addEventListener('click', function () { save(''); renderForm(); });
  }

  function renderPlayer(id) {
    wrap.innerHTML =
      '<div class="ivideo-box"><iframe src="https://www.youtube-nocookie.com/embed/' + id +
        '?autoplay=1&rel=0&modestbranding=1" title="Race video" frameborder="0" allow="autoplay; ' +
        'encrypted-media; picture-in-picture" allowfullscreen></iframe></div>' +
      '<div class="ivideo-meta">' +
        '<a target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=' + id + '">Open on YouTube ↗</a>' +
        '<button class="ivideo-change">Change video</button>' +
      '</div>';
    wrap.querySelector('.ivideo-change').addEventListener('click', function () { save(''); renderForm(); });
  }

  function render() {
    var id = current();
    if (id) renderFacade(id); else renderForm();
  }
  /* leaving the slide stops playback */
  node._stop = function () { var id = current(); if (id && wrap.querySelector('iframe')) renderFacade(id); };
  node._draw = function () {};
  render();
};

/* --- 19. the phone-accelerometer trial: integrate it, and watch the error integrate too --- */
/*  Raw data: 729 samples of accelerometerAccelerationY (G) at ~100 Hz, in data/imu.js.
    a = -9.81 (g - offset);  v and d are cumulative sums of a dt and v dt with the real dt.
    With the offset set to the resting reading the phone ends up where it started.
    Move the offset a few thousandths of a G and the double integration walks away.   */
function imuSeries(offset, raw) {
  var S = window.EPHE341_IMU, n = S.t.length, i;
  var a = new Array(n), v = new Array(n), d = new Array(n);
  for (i = 0; i < n; i++) a[i] = -9.81 * (S.g[i] - (raw ? 0 : offset));
  v[0] = 0; d[0] = 0;
  for (i = 1; i < n; i++) {
    var dt = S.t[i] - S.t[i - 1];
    v[i] = v[i - 1] + a[i - 1] * dt;
    d[i] = d[i - 1] + v[i - 1] * dt;
  }
  return { t: S.t, a: a, v: v, d: d, n: n };
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

W.imu = function (node, d) {
  if (!window.EPHE341_IMU) { node.innerHTML = '<p class="small muted">Trial data not loaded.</p>'; return; }
  var S = window.EPHE341_IMU;
  var panels = (d.panels || 'avd').split('');
  var controls = d.controls === '1';
  var u = build(node);
  var side = null;
  if (controls) {
    u.cv.parentNode.parentNode.classList.add('isplit', 'iimu');
    side = el('div', 'icalc');
    u.cv.parentNode.parentNode.insertBefore(side, u.ctl);
  }

  var multi = panels.length > 1;
  var H = controls ? 392 : (panels.length === 1 ? 236 : 330);
  var Wd = controls ? 860 : (panels.length === 1 ? 580 : 900);
  var ax = new Axes(u.cv, { w: Wd, h: H, padl: multi ? 74 : 86, xmin: -0.1, xmax: 7.4, ymin: 0, ymax: 1 });
  var out = readout(u.ctl);

  var N = S.t.length, TEND = S.t[N - 1];
  var offset = S.rest, raw = (d.mode === 'raw'), t = TEND, series;
  var playing = false, rafId = null, last = 0;

  var META = {
    a: { label: multi ? 'a (m/s²)' : 'acceleration (m/s²)', col: function () { return ORG; } },
    v: { label: multi ? 'v (m/s)'  : 'velocity (m/s)',      col: function () { return BLUE; } },
    d: { label: multi ? 'd (m)'    : 'position (m)',        col: function () { return GRN; } }
  };

  function layout() {
    var top = 12, bottom = 46, gap = 16;
    var avail = H - top - bottom - gap * (panels.length - 1);
    var ph = avail / panels.length, out = [];
    for (var i = 0; i < panels.length; i++) {
      var pt = top + i * (ph + gap);
      out.push({ pt: pt, pb: H - (pt + ph) });
    }
    return out;
  }

  function idxAt(tv) {
    var i = Math.round(tv / (TEND / (N - 1)));
    return Math.max(0, Math.min(N - 1, i));
  }

  function draw() {
    series = imuSeries(offset, raw);
    var P = layout(), i;
    ax.clear();
    panels.forEach(function (k, pi) {
      var m = META[k], arr = series[k], r = niceRange(arr);
      ax.setRange(-0.1, 7.4, r[0], r[1]);
      ax.pt = P[pi].pt; ax.pb = P[pi].pb;
      ax.frame({
        grid: true, zero: true, xticks: [0, 1, 2, 3, 4, 5, 6, 7],
        yticks: axisTicks(r[0], r[1]),
        xlabel: pi === panels.length - 1 ? 'time (s)' : null,
        ylabel: m.label, ysize: multi ? 13 : null,
        yfmt: function (v) { return Math.abs(v) >= 100 ? v.toFixed(0) : (Math.abs(v) >= 1 ? v.toFixed(1) : v.toFixed(2)); }
      });
      var pts = [], step = Math.max(1, Math.floor(N / 900));
      for (i = 0; i < N; i += step) pts.push([series.t[i], arr[i]]);
      if (pts[pts.length - 1][0] < TEND) pts.push([TEND, arr[N - 1]]);
      var cut = idxAt(t);
      var shown = pts.filter(function (p) { return p[0] <= t; });
      ax.poly(pts, { color: SOFT, width: 1.1 });
      ax.poly(shown, { color: m.col(), width: 2.2 });
      ax.poly([[t, r[0]], [t, arr[cut]]], { color: ACC, width: 1.4, dash: [4, 3] });
      ax.dots([[t, arr[cut]]], { color: ACC, r: 5 });
    });
    ax.pt = P[0].pt; ax.pb = P[0].pb;

    var c = idxAt(t), endD = series.d[N - 1];
    if (side) {
      side.innerHTML =
        '<div class="icalc-h">at <span class="v">t = ' + t.toFixed(2) + ' s</span></div>' +
        '<div class="icalc-work">' +
          '<div class="icalc-t">measured</div>' +
          '<div class="icalc-eq">g = <b>' + S.g[c].toFixed(4) + '</b> G</div>' +
          '<div class="icalc-t" style="margin-top:.45em">offset removed, converted</div>' +
          '<div class="icalc-eq">a = −9.81 (g ' + (offset < 0 ? '+ ' : '− ') +
          Math.abs(offset).toFixed(4) + ') = <b>' + series.a[c].toFixed(2) + '</b> m/s²</div>' +
        '</div>' +
        '<div class="icalc-vals">' +
          '<div><span>a</span><b>' + series.a[c].toFixed(2) + '</b></div>' +
          '<div><span>v</span><b>' + series.v[c].toFixed(2) + '</b></div>' +
          '<div><span>d</span><b>' + series.d[c].toFixed(2) + '</b></div>' +
        '</div>' +
        '<div class="idrift' + (Math.abs(endD) > 0.5 ? ' bad' : ' ok') + '">' +
          '<span>where the phone ends up</span><b>' +
          (Math.abs(endD) > 999 ? endD.toFixed(0) : endD.toFixed(2)) + ' m</b>' +
          '<i>' + (raw
            ? 'gravity was never removed — the whole trace is integrated twice'
            : (Math.abs(endD) > 0.5
               ? 'the offset is wrong by ' + ((offset - S.rest) * 1000).toFixed(1) + ' mG'
               : 'back where it started, as it should be')) + '</i>' +
        '</div>';
    }

    out.innerHTML =
      (raw ? '<b class="r">Raw signal</b> — gravity still in it' : '<b class="g">Offset removed</b>') +
      ' &nbsp;·&nbsp; a = <b>' + series.a[c].toFixed(2) + '</b> m/s²' +
      ' &nbsp;·&nbsp; v = <b>' + series.v[c].toFixed(2) + '</b> m/s' +
      ' &nbsp;·&nbsp; d = <b class="r">' + (Math.abs(series.d[c]) > 999 ? series.d[c].toFixed(0) : series.d[c].toFixed(2)) + '</b> m' +
      '<span class="hint">a phone moved up and down by hand, 729 samples at 100 Hz · ' +
      'faint line = the whole trial, solid = up to the cursor</span>';
  }

  var ctlRow = null;
  if (controls) {
    var seg = el('div', 'iseg');
    [['off', 'Offset removed'], ['raw', 'Raw signal']].forEach(function (pair) {
      var btn = el('button', 'iseg-b' + ((pair[0] === 'raw') === raw ? ' on' : ''), pair[1]);
      btn.addEventListener('click', function () {
        raw = pair[0] === 'raw';
        Array.prototype.forEach.call(seg.children, function (x) { x.classList.remove('on'); });
        btn.classList.add('on'); draw();
      });
      seg.appendChild(btn);
    });
    ctlRow = el('div', 'ictl-row');
    u.ctl.appendChild(ctlRow);
    ctlRow.appendChild(seg);
    slider(u.ctl, 'Assumed resting value', S.rest - 0.02, S.rest + 0.02, 0.0005, S.rest,
      function (v) { return v.toFixed(4) + ' G'; }, function (v) { offset = v; draw(); });
  }

  var s1 = slider(u.ctl, 'Time', 0, TEND, 0.01, t,
    function (v) { return v.toFixed(2) + ' s'; }, function (v) { t = v; draw(); });
  var b = playBtn(ctlRow || u.ctl, '▶ Replay the trial');
  b.addEventListener('click', function () {
    playing = !playing; b.textContent = playing ? '❚❚ Pause' : '▶ Replay the trial';
    if (playing) { if (t >= TEND) { t = 0; s1.set(0); } last = 0; rafId = requestAnimationFrame(loop); }
    else cancelAnimationFrame(rafId);
  });
  function loop(ts) {
    if (!last) last = ts;
    t = Math.min(TEND, t + (ts - last) / 1000);
    last = ts; s1.input.value = t; s1.sync();
    if (t >= TEND) { playing = false; b.textContent = '↻ Replay'; return; }
    rafId = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; cancelAnimationFrame(rafId); b.textContent = '▶ Replay the trial'; };
  node._draw = draw;
  draw();
};


/* --- video (Tracker) kinematics of the drop trial -------------------
   Digitised from the three Tracker plots in the original deck.
   data-panels : any of y v a          data-controls : "1" -> side working
   data-imu    : "1" -> offer the accelerometer trial as an overlay
   ------------------------------------------------------------------ */
function imuAligned(kind, lag) {
  var S = window.EPHE341_IMU; if (!S) return null;
  var s = imuSeries(S.rest, false), key = kind === 'y' ? 'd' : kind;
  return function (tv) {
    var x = tv + lag, n = s.n, dt = s.t[n - 1] / (n - 1);
    var i = Math.max(0, Math.min(n - 2, Math.floor(x / dt)));
    var f = (x - s.t[i]) / dt;
    return s[key][i] + (s[key][i + 1] - s[key][i]) * f;
  };
}

W.vkin = function (node, d) {
  var S = window.EPHE341_VIDEO;
  if (!S) { node.innerHTML = '<p class="small muted">Video data not loaded.</p>'; return; }
  var panels = (d.panels || 'yva').split('');
  var controls = d.controls === '1';
  var canImu = d.imu === '1' && !!window.EPHE341_IMU;

  var DT = 1 / S.fps, N = S.n, TEND = S.t[N - 1];
  var u = build(node);
  var side = null;
  if (controls) {
    u.cv.parentNode.parentNode.classList.add('isplit', 'iimu');
    side = el('div', 'icalc');
    u.cv.parentNode.parentNode.insertBefore(side, u.ctl);
  }

  var multi = panels.length > 1;
  var H = controls ? 520 : (panels.length === 1 ? 250 : (panels.length === 2 ? 320 : 380));
  var Wd = controls ? 980 : (panels.length === 1 ? 600 : 900);
  var ax = new Axes(u.cv, { w: Wd, h: H, padl: multi ? 74 : 86, xmin: -0.05, xmax: TEND + 0.05, ymin: 0, ymax: 1 });
  var out = readout(u.ctl);

  var k0 = N - 1, kbest = null;
  for (var q0 = 0; q0 < N; q0++) {
    if (S.v[q0] != null && (kbest === null || S.v[q0] < S.v[kbest])) kbest = q0;
  }
  if (kbest !== null) k0 = kbest;
  var k = k0, h = 2, showImu = false, derived = false;
  var playing = false, rafId = null, last = 0;

  var META = {
    y: { lab: multi ? 'y (m)' : 'position y (m)',       col: function () { return GRN; } },
    v: { lab: multi ? 'v (m/s)' : 'velocity (m/s)',     col: function () { return BLUE; } },
    a: { lab: multi ? 'a (m/s²)' : 'acceleration (m/s²)', col: function () { return ORG; } }
  };

  /* Tracker's own numbers, and the ones we recompute live from y */
  function fd(src, i, step) {
    var lo = i - step, hi = i + step;
    if (lo < 0 || hi >= N || src[lo] == null || src[hi] == null) return null;
    return (src[hi] - src[lo]) / (2 * step * DT);
  }
  function build_() {
    var v = new Array(N), a = new Array(N), i;
    for (i = 0; i < N; i++) v[i] = fd(S.y, i, h);
    for (i = 0; i < N; i++) a[i] = fd(v, i, h);
    return { y: S.y, v: v, a: a };
  }
  var DER = build_();
  function cur() { return derived ? { y: S.y, v: DER.v, a: DER.a } : S; }

  function layout() {
    var top = 12, bottom = 46, gap = 16;
    var avail = H - top - bottom - gap * (panels.length - 1);
    var ph = avail / panels.length, o = [];
    for (var i = 0; i < panels.length; i++) {
      var pt = top + i * (ph + gap);
      o.push({ pt: pt, pb: H - (pt + ph) });
    }
    return o;
  }

  function draw() {
    var P = layout(), src = cur();
    ax.clear();
    panels.forEach(function (key, pi) {
      var m = META[key], arr = src[key];
      var vals = arr.filter(function (q) { return q != null && isFinite(q); });
      var imuF = (showImu && canImu) ? imuAligned(key, S.imuLag) : null;
      if (imuF) for (var q = 0; q < N; q++) vals.push(imuF(S.t[q]));
      var r = niceRange(vals);
      ax.setRange(-0.05, TEND + 0.05, r[0], r[1]);
      ax.pt = P[pi].pt; ax.pb = P[pi].pb;
      ax.frame({
        grid: true, zero: true, xticks: [0, 0.5, 1, 1.5, 2, 2.5, 3],
        yticks: axisTicks(r[0], r[1]),
        xlabel: pi === panels.length - 1 ? 'time (s)' : null,
        ylabel: m.lab, ysize: multi ? 13 : null,
        yfmt: function (v) { return Math.abs(v) >= 10 ? v.toFixed(0) : (Math.abs(v) >= 1 ? v.toFixed(1) : v.toFixed(2)); }
      });
      if (imuF) {
        var ip = [];
        for (var j = 0; j <= 300; j++) { var tv = TEND * j / 300; ip.push([tv, imuF(tv)]); }
        ax.poly(ip, { color: VIO, width: 1.9, dash: [6, 4] });
      }
      var all = [], shown = [];
      for (var i = 0; i < N; i++) {
        if (arr[i] == null || !isFinite(arr[i])) continue;
        all.push([S.t[i], arr[i]]);
        if (i <= k) shown.push([S.t[i], arr[i]]);
      }
      ax.poly(all, { color: SOFT, width: 1.1 });
      ax.poly(shown, { color: m.col(), width: 2.2 });
      ax.dots(shown.filter(function (p, i2) { return i2 % 1 === 0; }), { color: m.col(), r: 2.2 });
      if (arr[k] != null && isFinite(arr[k])) {
        ax.poly([[S.t[k], r[0]], [S.t[k], arr[k]]], { color: ACC, width: 1.4, dash: [4, 3] });
        ax.dots([[S.t[k], arr[k]]], { color: ACC, r: 5 });
      }
      if (imuF && pi === 0) {
        ax.text('■ video (Tracker)', ax.W - ax.pr - 4, P[pi].pt + 12,
                { px: true, align: 'right', size: 13, color: m.col() });
        ax.text('▬ ▬ accelerometer', ax.W - ax.pr - 4, P[pi].pt + 28,
                { px: true, align: 'right', size: 13, color: VIO });
      }
    });
    ax.pt = P[0].pt; ax.pb = P[0].pb;

    var src2 = cur();
    function f(q, n) { return (q == null || !isFinite(q)) ? '—' : q.toFixed(n == null ? 3 : n); }
    function has(z) { return panels.indexOf(z) >= 0; }

    if (side) {
      var lo = k - h, hi = k + h, ok = lo >= 0 && hi < N;
      var vhat = fd(S.y, k, h), ahat = fd(DER.v, k, h);
      var imuA = canImu ? imuAligned('a', S.imuLag)(S.t[k]) : null;
      side.innerHTML =
        '<div class="icalc-h">frame <span class="v">' + k + '</span> · t = <span class="v">' +
          S.t[k].toFixed(3) + ' s</span></div>' +
        '<div class="icalc-work">' +
          '<div class="icalc-t">velocity from the video positions</div>' +
          '<div class="icalc-eq">v = (y<sub>' + (k + h) + '</sub> − y<sub>' + (k - h) + '</sub>) / ' +
            (2 * h * DT).toFixed(4) + ' s</div>' +
          '<div class="icalc-eq">= (' + (ok ? f(S.y[hi]) : '—') + ' − ' + (ok ? f(S.y[lo]) : '—') +
            ') / ' + (2 * h * DT).toFixed(4) + ' = <b>' + f(vhat) + '</b> m/s</div>' +
          '<div class="icalc-t" style="margin-top:.45em">acceleration from those velocities</div>' +
          '<div class="icalc-eq">a = (v<sub>' + (k + h) + '</sub> − v<sub>' + (k - h) + '</sub>) / ' +
            (2 * h * DT).toFixed(4) + ' = <b>' + f(ahat, 2) + '</b> m/s²</div>' +
        '</div>' +
        '<div class="icalc-vals">' +
          '<div><span>y</span><b>' + f(S.y[k]) + '</b></div>' +
          '<div><span>v</span><b>' + f(src2.v[k]) + '</b></div>' +
          '<div><span>a</span><b>' + f(src2.a[k], 2) + '</b></div>' +
        '</div>' +
        (canImu
          ? '<div class="idrift ' + (imuA != null && ahat != null && Math.abs(imuA - ahat) < 0.8 ? 'ok' : 'bad') + '">' +
            '<span>accelerometer at the same instant</span><b>' + f(imuA, 2) + ' m/s²</b>' +
            '<i>' + (ahat == null ? 'no video estimate at this frame'
              : 'video says ' + f(ahat, 2) + ' — two independent instruments, ' +
                Math.abs(imuA - ahat).toFixed(2) + ' m/s² apart') + '</i></div>'
          : '');
    }

    out.innerHTML =
      'frame <b>' + k + '</b> &nbsp;·&nbsp; t = <b>' + S.t[k].toFixed(2) + '</b> s' +
      (has('y') || controls ? ' &nbsp;·&nbsp; y = <b>' + f(S.y[k]) + '</b> m' : '') +
      (has('v') || controls ? ' &nbsp;·&nbsp; v = <b>' + f(src2.v[k]) + '</b> m/s' : '') +
      (has('a') || controls ? ' &nbsp;·&nbsp; a = <b>' + f(src2.a[k], 2) + '</b> m/s²' : '') +
      (controls ? '' :
        '<span class="hint">' + N + ' frames at ' + S.fps + ' fps, digitised from the Tracker plots · ' +
        (derived ? 'v and a recomputed here from y by finite difference (±' + h + ' frames)'
                 : 'v and a as Tracker reported them') + '</span>');
  }

  var row = el('div', 'ictl-row');
  u.ctl.appendChild(row);

  if (panels.indexOf('v') >= 0 || panels.indexOf('a') >= 0) {
    var seg = el('div', 'iseg');
    [['tr', 'Tracker’s v and a'], ['de', 'Recompute from y']].forEach(function (pair) {
      var b2 = el('button', 'iseg-b' + ((pair[0] === 'de') === derived ? ' on' : ''), pair[1]);
      b2.addEventListener('click', function () {
        derived = pair[0] === 'de';
        Array.prototype.forEach.call(seg.children, function (x) { x.classList.remove('on'); });
        b2.classList.add('on'); draw();
      });
      seg.appendChild(b2);
    });
    row.appendChild(seg);
  }
  if (canImu) {
    var ib = el('button', 'ibtn', 'Overlay accelerometer');
    ib.addEventListener('click', function () {
      showImu = !showImu;
      ib.classList.toggle('on', showImu);
      ib.textContent = showImu ? 'Hide accelerometer' : 'Overlay accelerometer';
      draw();
    });
    row.appendChild(ib);
  }
  if (controls) {
    var hs = el('div', 'iseg');
    [1, 2, 3, 5].forEach(function (n) {
      var b3 = el('button', 'iseg-b' + (n === h ? ' on' : ''), '±' + n + ' frame' + (n > 1 ? 's' : ''));
      b3.addEventListener('click', function () {
        h = n; DER = build_();
        Array.prototype.forEach.call(hs.children, function (x) { x.classList.remove('on'); });
        b3.classList.add('on'); draw();
      });
      hs.appendChild(b3);
    });
    var hw = el('div', 'iseg-lab');
    hw.innerHTML = '<span>finite-difference window</span>';
    hw.appendChild(hs);
    row.appendChild(hw);
  }

  var s1 = slider(u.ctl, 'Frame', 0, N - 1, 1, k,
    function (v) { return (v / S.fps).toFixed(2) + ' s'; },
    function (v) { k = Math.round(v); draw(); });
  var pb = playBtn(row, '▶ Play the drop');
  pb.addEventListener('click', function () {
    playing = !playing; pb.textContent = playing ? '❚❚ Pause' : '▶ Play the drop';
    if (playing) { if (k >= N - 1) { k = 0; s1.set(0); } last = 0; rafId = requestAnimationFrame(loop); }
    else cancelAnimationFrame(rafId);
  });
  function loop(ts) {
    if (!last) last = ts;
    if (ts - last >= 1000 / S.fps) {
      last = ts; k = Math.min(N - 1, k + 1); s1.input.value = k; s1.sync();
      if (k >= N - 1) { playing = false; pb.textContent = '↻ Replay'; return; }
    }
    rafId = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; cancelAnimationFrame(rafId); pb.textContent = '▶ Play the drop'; };
  node._draw = draw;
  draw();
};


/* --- golf: a real motion-capture swing, and the club head's kinematics ---
   CMU Graphics Lab Motion Capture Database, subject 64 trial 01: 45 optical
   markers at 120 Hz, three of them on the club shaft. data/golf.js holds the
   frontal-plane projection of the joints plus the full 3D club-head position.
   Nothing here is modelled — s, v, a, θ, ω and α are all finite differences
   of the measured club-head positions, which is the point of the slide.
   data-mode : head | club
   ------------------------------------------------------------------ */
var GOLF = null;
function golfData() {
  if (GOLF) return GOLF;
  var S = window.EPHE341_GOLF;
  if (!S) return null;
  var N = S.n, DT = 1 / S.fps, i;
  var G = { n: N, dt: DT, fps: S.fps, kI: S.kImpact, kTop: S.kTop,
            clubLen: S.clubLen, J: {}, t: [] };
  for (i = 0; i < N; i++) G.t.push(i * DT);
  ['head', 'neck', 'lsho', 'rsho', 'lelb', 'relb', 'lwr', 'rwr', 'hand',
   'lhip', 'rhip', 'pel', 'lkne', 'rkne', 'lank', 'rank', 'ltoe', 'rtoe',
   'lhee', 'rhee', 'tip'].forEach(function (k) { G.J[k] = S[k]; });
  /* shaft angle in the frontal plane, unwrapped: 0 = club straight down */
  var th = [], prev = 0;
  for (i = 0; i < N; i++) {
    var dx = S.tip[0][i] - S.hand[0][i], dy = S.tip[1][i] - S.hand[1][i];
    var a = Math.atan2(dx, -dy);
    if (i) { while (a - prev > Math.PI) a -= 2 * Math.PI;
             while (prev - a > Math.PI) a += 2 * Math.PI; }
    th.push(a); prev = a;
  }
  G.thRaw = th;
  G.p3 = S.tip3; G.h3 = S.hand3;
  return (GOLF = G);
}

/* every curve is a finite difference of the measured positions, with a
   selectable window — the same trade-off as the video slides */
function golfDerive(G, h) {
  var N = G.n, DT = G.dt, i, j;
  function fd(a) {
    var o = new Array(N);
    for (i = 0; i < N; i++) {
      var lo = Math.max(0, i - h), hi = Math.min(N - 1, i + h);
      o[i] = (a[hi] - a[lo]) / ((hi - lo) * DT);
    }
    return o;
  }
  var vx = fd(G.p3[0]), vy = fd(G.p3[1]), vz = fd(G.p3[2]);
  var v = [], s = [0], acc = 0;
  for (i = 0; i < N; i++) v.push(Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]));
  for (i = 1; i < N; i++) {
    acc += Math.sqrt(Math.pow(G.p3[0][i] - G.p3[0][i - 1], 2) +
                     Math.pow(G.p3[1][i] - G.p3[1][i - 1], 2) +
                     Math.pow(G.p3[2][i] - G.p3[2][i - 1], 2));
    s.push(acc);
  }
  var hvx = fd(G.h3[0]), hvy = fd(G.h3[1]), hvz = fd(G.h3[2]), hv = [];
  for (i = 0; i < N; i++) hv.push(Math.sqrt(hvx[i] * hvx[i] + hvy[i] * hvy[i] + hvz[i] * hvz[i]));
  var th = [], t0 = G.thRaw[0];
  for (i = 0; i < N; i++) th.push(G.thRaw[i] - t0);
  var om = fd(G.thRaw), al = fd(om);
  return { s: s, v: v, at: fd(v), th: th, om: om, al: al, hv: hv };
}

W.golf = function (node, d) {
  var G = golfData();
  if (!G) { node.innerHTML = '<p class="small muted">Motion capture data not loaded.</p>'; return; }
  var mode = d.mode || 'head';

  var wrap = el('div', 'iwrap');
  var stage = el('div', 'istage igolf');
  var cvA = el('canvas'), cvB = el('canvas');
  var boxA = el('div', 'igolf-fig'), boxB = el('div', 'igolf-gr');
  boxA.appendChild(cvA); boxB.appendChild(cvB);
  stage.appendChild(boxA); stage.appendChild(boxB);
  var ctl = el('div', 'ictls');
  wrap.appendChild(stage); wrap.appendChild(ctl);
  node.appendChild(wrap);

  var GH = 366;
  var fig = new Axes(cvA, { w: 424, h: GH, padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: -1.58, xmax: 1.48, ymin: -0.10, ymax: 2.54 });
  var gr  = new Axes(cvB, { w: 600, h: GH, padl: 82, padr: 14, xmin: 0, xmax: 1, ymin: 0, ymax: 1 });
  var out = readout(ctl);

  var h = 2, D = golfDerive(G, h), k = G.kI, ideal = false;
  var playing = false, rafId = null, last = 0, SLOMO = 8;
  var TEND = G.t[G.n - 1];

  var PANELS = {
    head: [
      { key: 's',  lab: 'path s (m)',     col: function () { return GRN; },  dec: 2 },
      { key: 'v',  lab: 'speed (m/s)',    col: function () { return BLUE; }, dec: 1 },
      { key: 'at', lab: 'd|v|/dt (m/s²)', col: function () { return ORG; },  dec: 0 }
    ],
    club: [
      { key: 'th', lab: 'θ (rad)',        col: function () { return GRN; },  dec: 2 },
      { key: 'om', lab: 'ω (rad/s)',      col: function () { return BLUE; }, dec: 1 },
      { key: 'al', lab: 'α (rad/s²)',     col: function () { return ORG; },  dec: 0 }
    ]
  };

  /* the original slide's assumption: α held constant over the downswing,
     sweeping the same angle in the same time. Drawn dashed for comparison. */
  function idealAt(key, i) {
    var kT = G.kTop, kIm = G.kI;
    if (i < kT) return null;
    var tt = (i - kT) * G.dt, TT = (kIm - kT) * G.dt;
    var sweep = D.th[kIm] - D.th[kT], A = 2 * sweep / (TT * TT);
    if (key === 'al') return A;
    if (key === 'om') return A * tt;
    return D.th[kT] + 0.5 * A * tt * tt;
  }

  /* ---------- the skeleton ---------- */
  function J(n, i) { return [G.J[n][0][i], G.J[n][1][i]]; }
  function seg(c, a, b, col, w) {
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round';
    c.beginPath(); c.moveTo(fig.X(a[0]), fig.Y(a[1]));
    c.lineTo(fig.X(b[0]), fig.Y(b[1])); c.stroke();
  }
  function marker(c, p, r, col) {
    c.fillStyle = col; c.beginPath(); c.arc(fig.X(p[0]), fig.Y(p[1]), r, 0, 7); c.fill();
  }
  function clubAt(i, c, col, w, headCol) {
    var a = J('hand', i), b = J('tip', i);
    seg(c, a, b, col, w);
    c.fillStyle = headCol || col;
    var ang = Math.atan2(fig.Y(b[1]) - fig.Y(a[1]), fig.X(b[0]) - fig.X(a[0]));
    c.save(); c.translate(fig.X(b[0]), fig.Y(b[1])); c.rotate(ang);
    c.fillRect(-2, -5, 10, 10); c.restore();
  }

  function drawFigure() {
    var c = fig.c, i;
    fig.clear();
    c.strokeStyle = PANEL; c.lineWidth = 2;
    c.beginPath(); c.moveTo(fig.X(-0.85), fig.Y(0) + 0.5);
    c.lineTo(fig.X(0.85), fig.Y(0) + 0.5); c.stroke();
    c.fillStyle = MUT; c.globalAlpha = .9;
    c.beginPath(); c.arc(fig.X(0), fig.Y(0.021), 4.2, 0, 7); c.fill(); c.globalAlpha = 1;

    var pts = [], j;
    for (j = 0; j < G.n; j++) pts.push(J('tip', j));
    fig.poly(pts, { color: SOFT, width: 1, dash: [3, 5] });

    var step = Math.max(1, Math.round(G.n / 30));
    for (i = 0; i < G.n; i += step) if (i > k) { c.globalAlpha = .12; clubAt(i, c, SOFT, 1.4, SOFT); }
    for (i = 0; i < G.n; i += step) if (i <= k) {
      c.globalAlpha = 0.26 + 0.46 * (i / Math.max(1, k));
      clubAt(i, c, DEEP, 1.7, MUTED_ACC);
    }
    c.globalAlpha = 1;
    fig.poly(pts.slice(0, k + 1), { color: ACC, width: 2.1 });

    var sk = INK, tr = SOFT, mk = ACC;
    c.save(); c.fillStyle = PANEL; c.globalAlpha = .7;
    c.beginPath(); c.ellipse(fig.X(0), fig.Y(0.012), Math.abs(fig.X(0.48) - fig.X(0)), 4, 0, 0, 7);
    c.fill(); c.restore();

    /* trunk mass, so the rotation reads */
    c.save(); c.fillStyle = FILL0; c.beginPath();
    [J('rhip', k), J('lhip', k), J('lsho', k), J('rsho', k)].forEach(function (p, n) {
      n ? c.lineTo(fig.X(p[0]), fig.Y(p[1])) : c.moveTo(fig.X(p[0]), fig.Y(p[1]));
    });
    c.closePath(); c.fill(); c.restore();

    seg(c, J('rhee', k), J('rtoe', k), tr, 3.6);
    seg(c, J('lhee', k), J('ltoe', k), sk, 3.8);
    seg(c, J('rank', k), J('rhee', k), tr, 3.4);
    seg(c, J('lank', k), J('lhee', k), sk, 3.6);
    seg(c, J('rank', k), J('rkne', k), tr, 4.4); seg(c, J('rkne', k), J('rhip', k), tr, 4.8);
    seg(c, J('lank', k), J('lkne', k), sk, 5);   seg(c, J('lkne', k), J('lhip', k), sk, 5.4);
    seg(c, J('rhip', k), J('lhip', k), sk, 5.4);
    seg(c, J('pel', k),  J('neck', k), sk, 5.6);
    seg(c, J('rsho', k), J('lsho', k), sk, 5.4);
    seg(c, J('neck', k), J('head', k), sk, 3.6);
    c.strokeStyle = sk; c.lineWidth = 3.6;
    c.beginPath(); c.arc(fig.X(J('head', k)[0]), fig.Y(J('head', k)[1] + 0.025),
                         Math.abs(fig.X(0.098) - fig.X(0)), 0, 7); c.stroke();
    seg(c, J('rsho', k), J('relb', k), tr, 4); seg(c, J('relb', k), J('rwr', k), tr, 4);
    seg(c, J('lsho', k), J('lelb', k), BLUE, 4.8); seg(c, J('lelb', k), J('lwr', k), BLUE, 4.8);
    clubAt(k, c, INK, 3.4, ACC);
    ['rank', 'lank', 'rkne', 'lkne', 'rhip', 'lhip', 'pel', 'neck', 'rsho', 'lsho',
     'relb', 'lelb', 'rwr', 'lwr', 'head'].forEach(function (n) { marker(c, J(n, k), 2.7, mk); });
    marker(c, J('tip', k), 3.6, ACC);

    fig.text('CMU mocap · subject 64, swing 1 · 120 Hz', 12, fig.H - 3,
             { px: true, size: 12.5, weight: '600', color: MUT, base: 'bottom' });
    fig.text('club head ' + D.v[k].toFixed(1) + ' m/s', fig.W - 10, 14,
             { px: true, size: 15, weight: '800', color: ACC, align: 'right', base: 'top' });
    if (Math.abs(k - G.kI) <= 1) fig.text('impact', fig.W - 10, 33,
             { px: true, size: 12.5, weight: '700', color: MUT, align: 'right', base: 'top' });
  }

  /* ---------- the graphs ---------- */
  function layout() {
    var top = 10, bottom = 44, gap = 14, ph = (GH - top - bottom - gap * 2) / 3, o = [], i;
    for (i = 0; i < 3; i++) { var pt = top + i * (ph + gap); o.push({ pt: pt, pb: GH - (pt + ph) }); }
    return o;
  }
  function drawGraphs() {
    var L = layout(), pan = PANELS[mode], i;
    gr.clear();
    pan.forEach(function (m, pi) {
      var arr = D[m.key], vals = arr.slice(), q;
      if (ideal && mode === 'club') {
        for (q = G.kTop; q <= G.kI; q++) { var z = idealAt(m.key, q); if (z != null) vals.push(z); }
      }
      var r = niceRange(vals);
      gr.setRange(-TEND * 0.02, TEND * 1.02, r[0], r[1]);
      gr.pt = L[pi].pt; gr.pb = L[pi].pb;
      var xt = [];
      for (q = 0; q <= TEND + 1e-9; q += 0.5) xt.push(Math.round(q * 10) / 10);
      var yt = axisTicks(r[0], r[1]);
      var gap2 = yt.length > 1 ? Math.abs(yt[1] - yt[0]) : 1;
      var dec = gap2 >= 1 ? 0 : (gap2 >= 0.1 ? 1 : 2);
      gr.frame({
        grid: true, zero: true, xticks: xt, yticks: yt,
        xlabel: pi === 2 ? 'time (s)' : null, ylabel: m.lab, ysize: 12.5,
        yfmt: function (v) { return v.toFixed(dec); }
      });
      [[G.kTop, 'top'], [G.kI, 'impact']].forEach(function (mk2) {
        gr.poly([[G.t[mk2[0]], r[0]], [G.t[mk2[0]], r[1]]], { color: MUT, width: 1, dash: [3, 4] });
        if (pi === 0) gr.text(mk2[1], G.t[mk2[0]], r[1],
          { size: 12, weight: '700', color: MUT, align: 'center', base: 'bottom' });
      });
      if (ideal && mode === 'club') {
        var ip = [];
        for (q = G.kTop; q <= G.kI; q++) ip.push([G.t[q], idealAt(m.key, q)]);
        gr.poly(ip, { color: VIO, width: 1.9, dash: [6, 4] });
        if (pi === 0) gr.text('▬ ▬ constant α (the original slide)', gr.pl + 8, L[pi].pt + 12,
          { px: true, size: 12.5, weight: '700', color: VIO, align: 'left', base: 'top' });
      }
      var all = [], shown = [];
      for (i = 0; i < G.n; i++) { all.push([G.t[i], arr[i]]); if (i <= k) shown.push([G.t[i], arr[i]]); }
      gr.poly(all, { color: SOFT, width: 1.1 });
      gr.poly(shown, { color: m.col(), width: 2.4 });
      gr.poly([[G.t[k], r[0]], [G.t[k], arr[k]]], { color: ACC, width: 1.3, dash: [4, 3] });
      gr.dots([[G.t[k], arr[k]]], { color: ACC, r: 5 });
      gr.text(arr[k].toFixed(m.dec), gr.W - gr.pr - 6, L[pi].pt + 13,
              { px: true, size: 17, weight: '800', color: m.col(), align: 'right', base: 'top' });
    });
  }

  function draw() {
    drawFigure(); drawGraphs();
    out.innerHTML =
      'frame <b>' + k + '</b> &nbsp;·&nbsp; t = <b>' + G.t[k].toFixed(3) + '</b> s' +
      ' &nbsp;·&nbsp; club head <b class="r">' + D.v[k].toFixed(1) + '</b> m/s (' +
        (D.v[k] * 2.2369).toFixed(0) + ' mph)' +
      ' &nbsp;·&nbsp; hands <b>' + D.hv[k].toFixed(1) + '</b> m/s' +
      ' &nbsp;·&nbsp; ω <b>' + D.om[k].toFixed(1) + '</b> rad/s' +
      '<span class="hint">CMU motion capture, 120 Hz · every curve is a finite difference of the ' +
      'measured club-head positions (±' + h + ' frame' + (h > 1 ? 's' : '') + ')</span>';
  }

  var row = el('div', 'ictl-row'); ctl.appendChild(row);
  var seg1 = el('div', 'iseg');
  [['head', 'Club head'], ['club', 'Club angle']].forEach(function (pair) {
    var b = el('button', 'iseg-b' + (pair[0] === mode ? ' on' : ''), pair[1]);
    b.addEventListener('click', function () {
      mode = pair[0];
      Array.prototype.forEach.call(seg1.children, function (x) { x.classList.remove('on'); });
      b.classList.add('on'); draw();
    });
    seg1.appendChild(b);
  });
  row.appendChild(seg1);

  var ib = el('button', 'ibtn', 'vs constant α');
  ib.addEventListener('click', function () {
    if (mode !== 'club') {
      mode = 'club';
      Array.prototype.forEach.call(seg1.children, function (x) {
        x.classList.toggle('on', x.textContent.indexOf('angle') >= 0);
      });
    }
    ideal = !ideal;
    ib.classList.toggle('on', ideal);
    ib.textContent = ideal ? 'hide constant α' : 'vs constant α';
    draw();
  });
  row.appendChild(ib);

  var hs = el('div', 'iseg');
  [1, 2, 4, 8].forEach(function (n) {
    var b3 = el('button', 'iseg-b' + (n === h ? ' on' : ''), '±' + n);
    b3.addEventListener('click', function () {
      h = n; D = golfDerive(G, h);
      Array.prototype.forEach.call(hs.children, function (x) { x.classList.remove('on'); });
      b3.classList.add('on'); draw();
    });
    hs.appendChild(b3);
  });
  var hw = el('div', 'iseg-lab');
  hw.innerHTML = '<span>Δ window</span>';
  hw.appendChild(hs);
  row.appendChild(hw);

  var s1 = slider(ctl, 'Frame', 0, G.n - 1, 1, k,
    function (v) { return (v * G.dt).toFixed(2) + ' s'; },
    function (v) { k = Math.round(v); draw(); });
  var pb = playBtn(row, '▶ Swing');
  pb.addEventListener('click', function () {
    playing = !playing; pb.textContent = playing ? '❚❚ Pause' : '▶ Swing';
    if (playing) { if (k >= G.n - 1) { k = 0; s1.set(0); } last = 0; rafId = requestAnimationFrame(loop); }
    else cancelAnimationFrame(rafId);
  });
  function loop(ts) {
    if (!last) last = ts;
    var adv = (ts - last) / 1000 / SLOMO / G.dt;
    if (adv >= 1) {
      last = ts; k = Math.min(G.n - 1, k + Math.round(adv));
      s1.input.value = k; s1.sync();
      if (k >= G.n - 1) { playing = false; pb.textContent = '↻ Again'; return; }
    }
    rafId = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; cancelAnimationFrame(rafId); pb.textContent = '▶ Swing'; };
  node._draw = draw;
  draw();
};

/* ============================================================
   POLYNOMIALS — shared by the analytical-method widgets.
   A polynomial is an array of { c, n } terms, highest n first.
   ============================================================ */
function polyParse(str) {
  var s = String(str == null ? '' : str)
    .replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(/\*\*/g, '^').replace(/\*/g, '')
    .replace(/[xX]/g, 't').replace(/[yY]\(t\)=|[a-z]\(t\)=/g, '').replace(/^[a-z]=/, '');
  if (!s) return [];
  var re = /([+-]?)([0-9]*\.?[0-9]*)(t(?:\^([+-]?[0-9]+))?)?/g, m, bag = {}, i = 0;
  while (i < s.length) {
    re.lastIndex = i;
    m = re.exec(s);
    if (!m || m.index !== i || m[0] === '') return null;
    if (!m[3] && m[2] === '') return null;                 /* a sign with nothing after it */
    var c = (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : parseFloat(m[2]));
    if (!isFinite(c)) return null;
    var n = m[3] ? (m[4] === undefined ? 1 : parseInt(m[4], 10)) : 0;
    bag[n] = (bag[n] || 0) + c;
    i = re.lastIndex;
  }
  var out = [];
  Object.keys(bag).map(Number).sort(function (a, b) { return b - a; }).forEach(function (n) {
    if (Math.abs(bag[n]) > 1e-12) out.push({ c: bag[n], n: n });
  });
  return out;
}
function polyDiff(T) {
  var o = [];
  T.forEach(function (t) { if (t.n !== 0) o.push({ c: t.c * t.n, n: t.n - 1 }); });
  return o;
}
function polyInt(T) {
  return T.map(function (t) { return { c: t.c / (t.n + 1), n: t.n + 1 }; });
}
function polyEval(T, t) {
  var s = 0, i;
  for (i = 0; i < T.length; i++) s += T[i].c * Math.pow(t, T[i].n);
  return s;
}
/* tidy numbers: 6 not 6.000, −0.5 not -0.5000000001 */
function pnum(v) {
  if (!isFinite(v)) return '—';
  var r = Math.round(v * 1e6) / 1e6;
  var s = (Math.abs(r - Math.round(r)) < 1e-9) ? String(Math.round(r)) : String(Math.round(r * 1000) / 1000);
  return s.replace('-', '−');
}
function supHTML(n) { return n === 1 ? '' : '<sup>' + String(n).replace('-', '−') + '</sup>'; }
/* one term; `first` drops the leading + */
function termHTML(t, first, v) {
  v = v || 't';
  var a = Math.abs(t.c), body;
  if (t.n === 0) body = pnum(a);
  else body = (Math.abs(a - 1) < 1e-12 ? '' : pnum(a)) + v + supHTML(t.n);
  var sign = t.c < 0 ? (first ? '−' : ' − ') : (first ? '' : ' + ');
  return sign + body;
}
function polyHTML(T, v) {
  if (!T || !T.length) return '0';
  return T.map(function (t, i) { return termHTML(t, i === 0, v); }).join('');
}
/* the same, but every term wrapped so it can be coloured or highlighted */
function polyHTMLParts(T, v, cls) {
  if (!T || !T.length) return '<span class="' + cls + '" data-i="0">0</span>';
  return T.map(function (t, i) {
    var sign = i === 0 ? (t.c < 0 ? '−' : '') : (t.c < 0 ? ' − ' : ' + ');
    var a = Math.abs(t.c), body;
    if (t.n === 0) body = pnum(a);
    else body = (Math.abs(a - 1) < 1e-12 ? '' : pnum(a)) + (v || 't') + supHTML(t.n);
    return sign + '<span class="' + cls + '" data-i="' + i + '">' + body + '</span>';
  }).join('');
}

/* --- graphing calculator: type a polynomial, watch the curve ----------
   data-eq  : starting equation        data-deriv : "1" to offer the derivative
   ------------------------------------------------------------------ */
function eqInput(host, value, placeholder, onChange) {
  var row = el('div', 'ieqin');
  var lab = el('span', 'ieqin-l'); lab.innerHTML = 'f(t) =';
  var inp = el('input'); inp.type = 'text'; inp.value = value;
  inp.setAttribute('spellcheck', 'false');
  inp.setAttribute('placeholder', placeholder || '-t^3 + 6t^2');
  var msg = el('span', 'ieqin-m');
  function commit() {
    var T = polyParse(inp.value);
    if (T === null) { row.classList.add('bad'); msg.textContent = 'can’t read that'; return; }
    row.classList.remove('bad'); msg.textContent = '';
    onChange(T);
  }
  inp.addEventListener('input', commit);
  row.appendChild(lab); row.appendChild(inp); row.appendChild(msg);
  host.appendChild(row);
  return { input: inp, row: row, set: function (s) { inp.value = s; commit(); } };
}

W.grapher = function (node, d) {
  var wrap = el('div', 'iwrap');
  var stage = el('div', 'istage');
  var cv = el('canvas'); stage.appendChild(cv);
  var eqbox = el('div', 'ieqbox');
  var ctl = el('div', 'ictls');
  wrap.appendChild(stage); wrap.appendChild(eqbox); wrap.appendChild(ctl);
  node.appendChild(wrap);

  var ax = new Axes(cv, { w: 560, h: 222, padl: 50, padb: 38, padt: 12,
                          xmin: -0.4, xmax: 5.2, ymin: -10, ymax: 40 });
  var K = [0, 0, 0, 0];                       /* K[p] is the coefficient of t^p */
  var showD = d.deriv !== '0';
  var dOn = false;

  function terms() {
    var o = [], p;
    for (p = 3; p >= 0; p--) if (Math.abs(K[p]) > 1e-12) o.push({ c: K[p], n: p });
    return o;
  }
  function setFrom(T) {
    K = [0, 0, 0, 0];
    T.forEach(function (t) { if (t.n >= 0 && t.n <= 3) K[t.n] = t.c; });
    sl.forEach(function (s, i) { s.quiet(K[3 - i]); });
    draw();
  }

  function draw() {
    var T = terms(), Td = polyDiff(T);
    var f = function (t) { return polyEval(T, t); };
    var g = function (t) { return polyEval(Td, t); };
    var lo = Infinity, hi = -Infinity, t, y;
    for (t = -0.4; t <= 5.2; t += 0.05) {
      y = f(t); if (y < lo) lo = y; if (y > hi) hi = y;
      if (dOn) { y = g(t); if (y < lo) lo = y; if (y > hi) hi = y; }
    }
    if (!isFinite(lo) || hi - lo < 1e-6) { lo = -1; hi = 1; }
    var pad = (hi - lo) * 0.12;
    ax.setRange(-0.4, 5.2, lo - pad, hi + pad);
    ax.clear();
    ax.frame({
      grid: true, zero: true, xticks: [0, 1, 2, 3, 4, 5],
      yticks: axisTicks(lo - pad, hi + pad), xlabel: 't',
      yfmt: function (v) { return Math.abs(v) < 1e-9 ? '0' : (Math.abs(v) >= 1 ? v.toFixed(0) : v.toFixed(1)); }
    });
    if (dOn) ax.fn(g, { color: ORG, width: 2, dash: [6, 4], n: 420 });
    ax.fn(f, { color: BLUE, width: 2.8, n: 420 });
    eqbox.innerHTML =
      '<div class="ieqrow curve"><span class="ieqlab">the function</span>' +
        '<span class="eq big">y = ' + polyHTML(T) + '</span></div>' +
      '<div class="ieqrow slope' + (dOn ? ' on' : '') + '"><span class="ieqlab">its slope, term by term</span>' +
        '<span class="eq big"><span class="frac"><span>dy</span><span class="den">dt</span></span> = ' +
        polyHTML(Td) + '</span></div>';
    if (!eq.input.matches(':focus')) eq.input.value = polyHTML(T)
      .replace(/<sup>/g, '^').replace(/<\/sup>/g, '').replace(/−/g, '-');
  }

  var eq = eqInput(ctl, d.eq || '-t^3 + 6t^2', '-t^3 + 6t^2', function (T) { setFrom(T); });

  var grid = el('div', 'ictls g2'); ctl.appendChild(grid);
  var sl = ['a', 'b', 'c', 'd'].map(function (name, i) {
    var p = 3 - i;
    return slider(grid, name + ' <span class="ieqvar">t' + (p > 1 ? '<sup>' + p + '</sup>' : (p === 1 ? '' : '<sup>0</sup>')) + '</span>',
      -10, 10, 0.1, 0, function (v) { return pnum(v); },
      function (v) { K[p] = v; draw(); });
  });

  var row = el('div', 'ictl-row'); ctl.appendChild(row);
  var seg = el('div', 'iseg');
  [['−t³ + 6t²', '-t^3+6t^2'], ['2t', '2t'], ['t²', 't^2'], ['−6t + 12', '-6t+12']]
  .forEach(function (pr) {
    var b = el('button', 'iseg-b', pr[0]);
    b.addEventListener('click', function () { eq.set(pr[1]); });
    seg.appendChild(b);
  });
  row.appendChild(seg);
  if (showD) {
    var db = el('button', 'ibtn', 'Show the derivative');
    db.addEventListener('click', function () {
      dOn = !dOn; db.classList.toggle('on', dOn);
      db.textContent = dOn ? 'Hide the derivative' : 'Show the derivative';
      draw();
    });
    row.appendChild(db);
  }

  node._draw = draw;
  setFrom(polyParse(d.eq || '-t^3 + 6t^2') || []);
};


/* --- an equation that builds itself, and explains its own symbols ----
   data-spec : tokens separated by |, each either an operator ("=", "+")
               or  symbol~what it means
   data-of   : optional caption above the equation
   Hover (or tap) a symbol and its meaning lights up, and the other way round.
   ------------------------------------------------------------------ */
function symHTML(s) {
  return String(s)
    .replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>').replace(/\^(-?\w)/g, '<sup>$1</sup>')
    .replace(/_\{([^}]*)\}/g, '<sub>$1</sub>').replace(/_(\w)/g, '<sub>$1</sub>')
    .replace(/-/g, '−');
}
var PARTCOL = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

W.eqparts = function (node, d) {
  var raw = (d.spec || '').split('|');
  var wrap = el('div', 'ieqparts');
  var cap = null;
  if (d.of) { cap = el('div', 'ieqlab'); cap.textContent = d.of; wrap.appendChild(cap); }
  var line = el('div', 'ieqline eq');
  var legend = el('ul', 'ipartlist');
  wrap.appendChild(line); wrap.appendChild(legend);
  node.appendChild(wrap);

  var toks = [], k = 0;
  raw.forEach(function (r) {
    var bits = r.split('~');
    var t = el('span', 'itok');
    t.innerHTML = symHTML(bits[0]);
    var isExp = /^\^/.test(bits[0]);
    if (bits.length > 1) {
      var i = k++;
      t.className = 'itok live ' + (isExp ? 'exp ' : '') + PARTCOL[i % PARTCOL.length];
      t.setAttribute('data-i', i);
      var li = el('li', 'ipart ' + PARTCOL[i % PARTCOL.length]);
      li.setAttribute('data-i', i);
      li.innerHTML = '<b>' + symHTML(bits[0]) + '</b><span>' + bits[1] + '</span>';
      legend.appendChild(li);
      toks.push({ t: t, li: li });
    } else {
      t.className = 'itok op' + (isExp ? ' exp' : '');
    }
    line.appendChild(t);
  });

  function hot(i, on) {
    toks.forEach(function (o, j) {
      o.t.classList.toggle('hot', on && j === i);
      o.li.classList.toggle('hot', on && j === i);
    });
  }
  toks.forEach(function (o, i) {
    [o.t, o.li].forEach(function (elm) {
      elm.addEventListener('mouseenter', function () { hot(i, true); });
      elm.addEventListener('mouseleave', function () { hot(i, false); });
      elm.addEventListener('click', function () {
        var was = o.t.classList.contains('hot');
        hot(i, !was);
      });
    });
  });

  var timers = [];
  function play() {
    timers.forEach(clearTimeout); timers = [];
    var all = line.children, i;
    for (i = 0; i < all.length; i++) all[i].classList.remove('in');
    Array.prototype.forEach.call(legend.children, function (li) { li.classList.remove('in'); });
    for (i = 0; i < all.length; i++) {
      (function (n) { timers.push(setTimeout(function () { all[n].classList.add('in'); }, 90 + n * 130)); })(i);
    }
    Array.prototype.forEach.call(legend.children, function (li, n) {
      timers.push(setTimeout(function () { li.classList.add('in'); }, 260 + all.length * 130 + n * 110));
    });
  }
  node._start = play;
  node._stop = function () { timers.forEach(clearTimeout); timers = []; };
  play();
};

/* --- every equation is a sum of c·t^n terms --------------------------
   data-eq : starting equation     data-plot : "0" to hide the little graph
   ------------------------------------------------------------------ */
W.termsplit = function (node, d) {
  var wrap = el('div', 'itermsplit');
  var ctl = el('div', 'ictls');
  var eqline = el('div', 'ieqline2 eq big');
  var tab = el('div', 'itermtab');
  var stage = el('div', 'istage'); var cv = el('canvas'); stage.appendChild(cv);
  var showPlot = d.plot !== '0';
  wrap.appendChild(eqline); wrap.appendChild(tab);
  if (showPlot) wrap.appendChild(stage);
  wrap.appendChild(ctl);
  node.appendChild(wrap);

  var ax = showPlot ? new Axes(cv, { w: 470, h: 168, padl: 46, padb: 34, padt: 10,
                                     xmin: -0.2, xmax: 5.2, ymin: -10, ymax: 40 }) : null;
  var T = polyParse(d.eq || '-t^3 + 6t^2') || [];
  var hotI = -1;

  function colOf(i) { return [BLUE, GRN, ORG, VIO, ACC, DEEP][i % 6]; }

  function draw() {
    eqline.innerHTML = (d.name || 'x(t)') + ' = ' + polyHTMLParts(T, 't', 'iterm');
    Array.prototype.forEach.call(eqline.querySelectorAll('.iterm'), function (s, i) {
      s.classList.add(PARTCOL[i % 6]);
      if (i === hotI) s.classList.add('hot');
      s.addEventListener('mouseenter', function () { hotI = i; draw(); });
      s.addEventListener('mouseleave', function () { hotI = -1; draw(); });
    });
    tab.innerHTML = '<table><thead><tr><th>term</th><th>c</th><th>n</th></tr></thead><tbody>' +
      (T.length ? T.map(function (t, i) {
        return '<tr class="' + PARTCOL[i % 6] + (i === hotI ? ' hot' : '') + '" data-i="' + i + '">' +
          '<td class="eq">' + termHTML(t, true) + '</td><td>' + pnum(t.c) + '</td><td>' + t.n + '</td></tr>';
      }).join('') : '<tr><td colspan="3" class="muted">no terms</td></tr>') + '</tbody></table>';
    Array.prototype.forEach.call(tab.querySelectorAll('tr[data-i]'), function (tr, i) {
      tr.addEventListener('mouseenter', function () { hotI = i; draw(); });
      tr.addEventListener('mouseleave', function () { hotI = -1; draw(); });
    });
    if (!ax) return;
    /* the sum sets the window; individual terms may run off the top, which is
       itself the point — big terms cancel */
    var lo = Infinity, hi = -Infinity, t, y;
    for (t = -0.2; t <= 5.2; t += 0.05) {
      y = polyEval(T, t); if (y < lo) lo = y; if (y > hi) hi = y;
    }
    if (!isFinite(lo) || hi - lo < 1e-6) { lo = -1; hi = 1; }
    var pad = (hi - lo) * 0.22;
    ax.setRange(-0.2, 5.2, lo - pad, hi + pad);
    ax.clear();
    ax.frame({ grid: true, zero: true, xticks: [0, 1, 2, 3, 4, 5],
      yticks: axisTicks(lo - pad, hi + pad), xlabel: 'time t',
      yfmt: function (v) { return Math.abs(v) < 1e-9 ? '0' : v.toFixed(0); } });
    T.forEach(function (q, i) {
      ax.fn(function (t) { return q.c * Math.pow(t, q.n); },
        { color: colOf(i), width: i === hotI ? 2.6 : 1.6, dash: [5, 4], n: 320 });
    });
    ax.fn(function (t) { return polyEval(T, t); }, { color: INK, width: 2.8, n: 360 });
    ax.text('each term', ax.pl + 8, ax.pt + 2, { px: true, size: 12, weight: '700', color: MUT, base: 'top' });
    ax.text('their sum', ax.pl + 8, ax.pt + 18, { px: true, size: 12, weight: '800', color: INK, base: 'top' });
  }

  var eq = eqInput(ctl, d.eq || '-t^3 + 6t^2', '-t^3 + 6t^2', function (P) { T = P; draw(); });
  eq.row.querySelector('.ieqin-l').innerHTML = (d.name || 'x(t)') + ' =';
  var row = el('div', 'ictl-row'); ctl.appendChild(row);
  var seg = el('div', 'iseg');
  (d.presets || '-t^3+6t^2|2t|t^2|-3t^2+12t|-6t+12').split('|').forEach(function (p) {
    var P = polyParse(p) || [];
    var b = el('button', 'iseg-b'); b.innerHTML = polyHTML(P);
    b.addEventListener('click', function () { eq.set(p); });
    seg.appendChild(b);
  });
  row.appendChild(seg);

  node._draw = draw;
  draw();
};


/* --- curve fitting: scattered points, and a polynomial chasing them ---
   A random scatter around a gentle trend. Raise the order far enough and
   the fit stops describing the trend and starts describing the noise.
   ------------------------------------------------------------------ */
function rng32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* least squares fit of a degree-k polynomial, solved in u = t/tmax so the
   normal equations stay well conditioned, then scaled back to t */
function polyFit(xs, ys, k) {
  var n = xs.length, i, j, r, c;
  if (n < 2) return [];
  var xm = 0; for (i = 0; i < n; i++) xm = Math.max(xm, Math.abs(xs[i]));
  if (!(xm > 0)) xm = 1;
  k = Math.min(k, n - 1);
  var m = k + 1, A = [], b = [];
  for (r = 0; r < m; r++) {
    A.push(new Array(m).fill(0)); b.push(0);
    for (i = 0; i < n; i++) {
      var u = xs[i] / xm, ur = Math.pow(u, r);
      for (c = 0; c < m; c++) A[r][c] += ur * Math.pow(u, c);
      b[r] += ur * ys[i];
    }
  }
  for (c = 0; c < m; c++) {                       /* Gaussian elimination */
    var piv = c;
    for (r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < 1e-12) return null;
    var tmp = A[c]; A[c] = A[piv]; A[piv] = tmp;
    var tb = b[c]; b[c] = b[piv]; b[piv] = tb;
    for (r = 0; r < m; r++) {
      if (r === c) continue;
      var f = A[r][c] / A[c][c];
      for (j = c; j < m; j++) A[r][j] -= f * A[c][j];
      b[r] -= f * b[c];
    }
  }
  var out = [];
  for (r = m - 1; r >= 0; r--) {
    var v = b[r] / A[r][r] / Math.pow(xm, r);
    if (isFinite(v) && Math.abs(v) > 1e-14) out.push({ c: v, n: r });
  }
  return out;
}

W.curvefit = function (node, d) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 600, h: 268, padl: 52, padb: 40, padt: 12,
                            xmin: -0.3, xmax: 8.3, ymin: -2, ymax: 14 });
  var out = readout(u.ctl);
  var order = 2, seed = 7, noise = 1.3, showTrend = false;
  var XS = [], YS = [], TRUE = [{ c: -0.34, n: 2 }, { c: 3.1, n: 1 }, { c: 1.6, n: 0 }];

  function make() {
    var r = rng32(seed), i, n = 14;
    XS = []; YS = [];
    for (i = 0; i < n; i++) {
      var x = 0.25 + 7.5 * (i + 0.6 * (r() - 0.5)) / (n - 1);
      /* two uniforms make a passable bell */
      var e = (r() + r() + r() - 1.5) * 2 * noise;
      XS.push(Math.max(0, Math.min(8, x)));
      YS.push(polyEval(TRUE, x) + e);
    }
  }

  function draw() {
    var F = polyFit(XS, YS, order) || [];
    var i, ss = 0, st = 0, mean = 0;
    for (i = 0; i < YS.length; i++) mean += YS[i]; mean /= YS.length;
    for (i = 0; i < YS.length; i++) {
      var e = YS[i] - polyEval(F, XS[i]);
      ss += e * e; st += (YS[i] - mean) * (YS[i] - mean);
    }
    var R2 = st > 0 ? 1 - ss / st : 1;

    var lo = Infinity, hi = -Infinity, t, y;
    for (i = 0; i < YS.length; i++) { if (YS[i] < lo) lo = YS[i]; if (YS[i] > hi) hi = YS[i]; }
    for (t = 0; t <= 8; t += 0.05) { y = polyEval(F, t); if (isFinite(y)) { if (y < lo) lo = y; if (y > hi) hi = y; } }
    var span = hi - lo; lo -= span * 0.12; hi += span * 0.12;
    /* a wild fit must not squash the data out of sight */
    var dlo = Math.min.apply(null, YS), dhi = Math.max.apply(null, YS), dsp = dhi - dlo;
    lo = Math.max(lo, dlo - dsp * 1.3); hi = Math.min(hi, dhi + dsp * 1.3);

    ax.setRange(-0.3, 8.3, lo, hi);
    ax.clear();
    ax.frame({ grid: true, zero: true, xticks: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      yticks: axisTicks(lo, hi), xlabel: 'x', ylabel: 'y', ysize: 14,
      yfmt: function (v) { return Math.abs(v) < 1e-9 ? '0' : v.toFixed(0); } });
    if (showTrend) ax.fn(function (t) { return polyEval(TRUE, t); },
      { color: SOFT, width: 2, dash: [7, 5], n: 200 });
    ax.fn(function (t) { return polyEval(F, t); }, { color: BLUE, width: 2.8, n: 420 });
    for (i = 0; i < XS.length; i++) {
      ax.poly([[XS[i], YS[i]], [XS[i], polyEval(F, XS[i])]], { color: MUTED_ACC, width: 1.2 });
    }
    ax.dots(XS.map(function (x, j) { return [x, YS[j]]; }), { color: ACC, r: 4.6 });
    if (showTrend) ax.text('the trend the points came from', ax.pl + 8, ax.pt + 2,
      { px: true, size: 12.5, weight: '700', color: MUT, base: 'top' });

    var over = order >= 6;
    out.innerHTML =
      'order <b>' + order + '</b> &nbsp;·&nbsp; R<sup>2</sup> = <b class="' + (over ? 'r' : 'g') + '">' +
        R2.toFixed(4) + '</b>' +
      '<span class="ifiteq eq">y = ' + polyHTML(F, 'x') + '</span>' +
      '<span class="hint">' + (over
        ? 'R² keeps climbing, but the curve is now chasing the noise between the points, not the trend — that is overfitting'
        : (order === 1 ? 'a straight line cannot bend — look at the red residual lines'
                       : 'the red lines are the residuals: what the curve misses at each point')) +
      '</span>';
  }

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  var seg = el('div', 'iseg');
  [1, 2, 3, 4, 6, 9].forEach(function (k) {
    var b = el('button', 'iseg-b' + (k === order ? ' on' : ''), String(k));
    b.addEventListener('click', function () {
      order = k;
      Array.prototype.forEach.call(seg.children, function (x) { x.classList.remove('on'); });
      b.classList.add('on'); draw();
    });
    seg.appendChild(b);
  });
  var lab = el('div', 'iseg-lab'); lab.innerHTML = '<span>polynomial order</span>'; lab.appendChild(seg);
  row.appendChild(lab);

  var nb = el('button', 'ibtn', '↻ New data');
  nb.addEventListener('click', function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; make(); draw(); });
  row.appendChild(nb);
  var tb = el('button', 'ibtn', 'Show the trend');
  tb.addEventListener('click', function () {
    showTrend = !showTrend; tb.classList.toggle('on', showTrend);
    tb.textContent = showTrend ? 'Hide the trend' : 'Show the trend';
    draw();
  });
  row.appendChild(tb);
  slider(u.ctl, 'Scatter', 0, 3, 0.1, noise, function (v) { return v.toFixed(1); },
    function (v) { noise = v; make(); draw(); });

  node._draw = draw;
  make(); draw();
};


/* --- the transfer function, animated -------------------------------
   data-mode : diff | int      data-c, data-n : the worked instance
   The rule plays in four beats: the exponent is spotted, it moves to the
   front as a multiplier, the exponent steps down, and the term is done.
   ------------------------------------------------------------------ */
W.transfer = function (node, d) {
  var mode = d.mode === 'int' ? 'int' : 'diff';
  var wrap = el('div', 'itrans');
  var rule = el('div', 'itrans-rule eq');
  var inst = el('div', 'itrans-inst eq');
  var ctl = el('div', 'ictls');
  wrap.appendChild(rule); wrap.appendChild(inst); wrap.appendChild(ctl);
  node.appendChild(wrap);

  var c = parseFloat(d.c == null ? 6 : d.c), n = parseInt(d.n == null ? 2 : d.n, 10);
  var stage = 3, timers = [];

  function ruleHTML(st) {
    var lhs = '<span class="tt">c</span><span class="tt">t</span>' +
              '<sup><span class="tt n' + (st === 1 ? ' pop' : '') + '">n</span></sup>';
    var rhs;
    if (mode === 'diff') {
      rhs = '<span class="tt n' + (st >= 2 ? ' in' : ' out') + '">n</span>' +
            '<span class="tt">c</span><span class="tt">t</span>' +
            '<sup><span class="tt ' + (st >= 3 ? 'pop' : '') + '">' + (st >= 3 ? 'n−1' : 'n') + '</span></sup>';
    } else {
      rhs = '<span class="frac"><span><span class="tt">c</span><span class="tt">t</span>' +
            '<sup><span class="tt ' + (st >= 3 ? 'pop' : '') + '">' + (st >= 3 ? 'n+1' : 'n') + '</span></sup></span>' +
            '<span class="den"><span class="tt n' + (st >= 2 ? ' in' : ' out') + '">n + 1</span></span></span>' +
            '<span class="tt plus' + (st >= 3 ? ' in' : ' out') + '"> + b<sub>o</sub></span>';
    }
    return lhs + '<span class="arrow' + (st >= 1 ? ' on' : '') + '">⟶</span>' + rhs;
  }
  function instHTML(st) {
    var from = { c: c, n: n };
    var to = mode === 'diff' ? { c: c * n, n: n - 1 } : { c: c / (n + 1), n: n + 1 };
    var mid;
    if (mode === 'diff') {
      mid = '(' + (st >= 2 ? '<b>' + pnum(n) + '</b>' : 'n') + ')(' + pnum(c) + 't)' +
            '<sup>' + pnum(n) + (st >= 3 ? ' − 1' : '') + '</sup>';
    } else {
      mid = '(' + pnum(c) + 't<sup>' + pnum(n) + (st >= 3 ? ' + 1' : '') + '</sup>)' +
            (st >= 2 ? ' / <b>' + pnum(n + 1) + '</b>' : '');
    }
    return '<span class="il">' + termHTML(from, true) + '</span>' +
           '<span class="arrow' + (st >= 1 ? ' on' : '') + '">⟶</span>' +
           '<span class="im">' + mid + '</span>' +
           (st >= 3 ? '<span class="ir"> = ' + (n === 0 && mode === 'diff' ? '0' : termHTML(to, true)) + '</span>' : '');
  }
  function draw() {
    rule.innerHTML = ruleHTML(stage);
    inst.innerHTML = instHTML(stage);
  }
  function play() {
    timers.forEach(clearTimeout); timers = [];
    stage = 0; draw();
    [1, 2, 3].forEach(function (st, i) {
      timers.push(setTimeout(function () { stage = st; draw(); }, 620 + i * 780));
    });
  }

  if (d.compact === '1') wrap.classList.add('sm');
  if (d.controls !== '0') {
    var row = el('div', 'ictl-row'); ctl.appendChild(row);
    var pb = el('button', 'ibtn', '▶ Run the transfer');
    pb.addEventListener('click', play);
    row.appendChild(pb);
    var g = el('div', 'iseg-lab'); g.innerHTML = '<span>try it on</span>';
    var seg = el('div', 'iseg');
    [[6, 2], [-1, 3], [12, 1], [-6, 1], [4, 0]].forEach(function (p) {
      var b = el('button', 'iseg-b');
      b.innerHTML = termHTML({ c: p[0], n: p[1] }, true);
      b.addEventListener('click', function () { c = p[0]; n = p[1]; play(); });
      seg.appendChild(b);
    });
    g.appendChild(seg); row.appendChild(g);
  }
  if (d.inst === '0') inst.style.display = 'none';

  node._draw = draw;
  node._start = play;
  node._stop = function () { timers.forEach(clearTimeout); timers = []; stage = 3; draw(); };
  draw();
};

/* --- the transfer function applied to a whole equation, step by step --
   data-eq, data-mode (diff|int), data-from, data-to : the two labels
   ------------------------------------------------------------------ */
W.transferwork = function (node, d) {
  var mode = d.mode === 'int' ? 'int' : 'diff';
  var wrap = el('div', 'itwork');
  var head = el('div', 'itwork-head eq');
  var lines = el('div', 'itwork-lines');
  var res = el('div', 'itwork-res eq');
  var ctl = el('div', 'ictls');
  wrap.appendChild(head); wrap.appendChild(lines); wrap.appendChild(res); wrap.appendChild(ctl);
  node.appendChild(wrap);

  var T = polyParse(d.eq || '-t^3 + 6t^2') || [];
  var step = 0, timers = [];
  function maxStep() { return T.length + 2; }

  function work(t) {
    /* the original slide's own wording: (n)(c t)^(n−1)  and  (c t^(n+1)) / (n+1) */
    function ct(c) {
      var a = Math.abs(c);
      return (c < 0 ? '−' : '') + (Math.abs(a - 1) < 1e-12 ? '' : pnum(a)) + 't';
    }
    if (mode === 'diff') {
      if (t.n === 0) return { html: 'for <b>' + termHTML(t, true) +
        '</b> — a constant has no slope, so it transfers to <b>0</b>', out: null };
      var o = { c: t.c * t.n, n: t.n - 1 };
      return { html: 'for <b>' + termHTML(t, true) + '</b> we transfer to (' + pnum(t.n) + ')(' +
        ct(t.c) + ')<sup>' + pnum(t.n) + ' − 1</sup> = <b>' + termHTML(o, true) + '</b>', out: o };
    }
    var oi = { c: t.c / (t.n + 1), n: t.n + 1 };
    return { html: 'for <b>' + termHTML(t, true) + '</b> we transfer to (' + ct(t.c) +
      '<sup>' + pnum(t.n) + ' + 1</sup>) / ' + pnum(t.n + 1) +
      ' = <b>' + termHTML(oi, true) + '</b>', out: oi };
  }

  function draw() {
    head.innerHTML = '<span class="ieqlab">start from</span> ' + (d.from || 'x(t)') + ' = ' +
      polyHTMLParts(T, 't', 'iterm');
    Array.prototype.forEach.call(head.querySelectorAll('.iterm'), function (sp, i) {
      sp.classList.add(PARTCOL[i % 6]);
      if (step >= 1 && (step === 1 || step - 2 === i)) sp.classList.add('hot');
    });
    var html = '';
    if (step >= 1) {
      html += '<div class="itwork-l in"><span class="ieqlab">split into terms</span> ' +
        T.map(function (t, i) {
          return '<span class="iterm ' + PARTCOL[i % 6] + '">' + termHTML(t, true) + '</span>';
        }).join(' &nbsp;and&nbsp; ') + '</div>';
    }
    T.forEach(function (t, i) {
      if (step >= i + 2) {
        var w = work(t);
        html += '<div class="itwork-l in ' + PARTCOL[i % 6] + (step === i + 2 ? ' now' : '') + '">' + w.html + '</div>';
      }
    });
    lines.innerHTML = html;
    if (step >= maxStep()) {
      var O = mode === 'diff' ? polyDiff(T) : polyInt(T);
      res.innerHTML = '<span class="ieqlab">' + (mode === 'diff' ? 'this leaves' : 'this leaves') + '</span> ' +
        (d.to || 'v(t)') + ' = <b>' + polyHTML(O) + '</b>' +
        (mode === 'int' ? '<span class="itwork-b"> + b<sub>o</sub></span>' : '');
      res.classList.add('in');
    } else { res.innerHTML = ''; res.classList.remove('in'); }
    nextb.textContent = step >= maxStep() ? '↻ Start again' : (step === 0 ? '▶ Work it through' : 'Next step');
  }
  function advance() {
    if (step >= maxStep()) step = 0; else step++;
    draw();
  }
  function runAll() {
    timers.forEach(clearTimeout); timers = [];
    step = 0; draw();
    var k;
    for (k = 1; k <= maxStep(); k++) {
      (function (j) { timers.push(setTimeout(function () { step = j; draw(); }, j * 950)); })(k);
    }
  }

  var row = el('div', 'ictl-row'); ctl.appendChild(row);
  var nextb = el('button', 'ibtn', '▶ Work it through');
  nextb.addEventListener('click', advance);
  row.appendChild(nextb);
  var runb = el('button', 'iseg-b', 'run it all');
  runb.addEventListener('click', runAll);
  row.appendChild(runb);

  if (d.edit !== '0') {
    var eq = eqInput(ctl, d.eq || '-t^3 + 6t^2', '-t^3 + 6t^2', function (P) {
      T = P; step = 0; timers.forEach(clearTimeout); timers = []; draw();
    });
    eq.row.querySelector('.ieqin-l').innerHTML = (d.from || 'x(t)') + ' =';
  }

  node._draw = draw;
  node._stop = function () { timers.forEach(clearTimeout); timers = []; };
  draw();
};

/* ---------------- boot ---------------- */
var MAP = {
  imu: W.imu,
  grapher: W.grapher,
  eqparts: W.eqparts,
  curvefit: W.curvefit,
  transfer: W.transfer,
  transferwork: W.transferwork,
  termsplit: W.termsplit,
  golf: W.golf,
  vkin: W.vkin,
  video: W.video,
  sprint: W.sprint, 'triple-slope': W.tripleSlope,
  'tangent-zoom': W.tangentZoom, 'slope-transfer': W.slopeTransfer,
  'series-reveal': W.seriesReveal,
  secant: W.secant, sections: W.sections, tangent: W.tangent, 'tangent-travel': W.tangentTravel,
  'power-rule': W.powerRule, 'finite-diff': W.finiteDiff, cumulative: W.cumulative,
  riemann: W.riemann, 'integral-sum': W.integralSum, 'initial-value': W.initialValue,
  'area-rect': W.areaRect, 'line-explorer': W.lineExplorer
};

function init() {
  var nodes = document.querySelectorAll('.iplot');
  Array.prototype.forEach.call(nodes, function (n) {
    var name = n.getAttribute('data-widget');
    if (MAP[name]) { try { MAP[name](n, n.dataset); } catch (e) { console.error(name, e); } }
  });
  window.addEventListener('ephe341-theme', function () {
    readTheme();
    Array.prototype.forEach.call(document.querySelectorAll('.iplot'), function (n) {
      if (n._draw) { try { n._draw(); } catch (e) {} }
    });
  });
  if (window.Reveal) {
    Reveal.on('slidechanged', function (ev) {
      // stop animations on the slide we left
      if (ev.previousSlide) Array.prototype.forEach.call(ev.previousSlide.querySelectorAll('.iplot'), function (n) { if (n._stop) n._stop(); });
      if (ev.currentSlide) Array.prototype.forEach.call(ev.currentSlide.querySelectorAll('.iplot'), function (n) { if (n._start) n._start(); });
    });
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
