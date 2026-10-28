/* ======================================================================
   EPHE 341 — Linear Kinematics Review (lecture 1b)

   Distance and displacement, scalars and vectors, adding vectors by the
   tip-to-tail and vector resolution methods, speed and velocity, and
   acceleration.  Each figure follows a worked example on the slides before
   it and opens on that example's numbers:

     track      the 1.5-lap run: distance against displacement, and with the
                37.8 s time, speed against velocity
     field      two positions on a field: final minus initial, Pythagoras
                and the arctangent
     tiptotail  A, B and C drawn tail to tip at 1 cm per km, in any order
     resolve    one vector into its N-S and E-W components
     vecsum     the three-vector composition, step by step, with its table
     bolt       average acceleration over the whole race, the two halves and
                each 10 m section

   parts/selftest.js checks every number in the worked examples against
   the functions that draw them.
   ====================================================================== */
(function () {
'use strict';

var D = window.DECK;
var DA = window.IN1B;
var Axes = D.Axes, el = D.el, slider = D.slider, playBtn = D.playBtn,
    readout = D.readout, build = D.build, axisTicks = D.axisTicks;
function C() { return D.colors(); }

/* ---------------- shared UI, same vocabulary as the other decks --------- */
function seg(host, items, current, onPick) {
  var s = el('div', 'iseg');
  items.forEach(function (it) {
    var b = el('button', 'iseg-b' + (it[0] === current ? ' on' : ''));
    b.innerHTML = it[1];
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(s.children, function (x) { x.classList.remove('on'); });
      b.classList.add('on'); onPick(it[0]);
    });
    s.appendChild(b);
  });
  host.appendChild(s); return s;
}
function chips(host, items, current, onPick) {
  var row = el('div', 'icalc-chips'), btns = [];
  items.forEach(function (it) {
    var b = el('button', 'icalc-chip' + (it[0] === current ? ' on' : ''));
    b.innerHTML = it[1];
    b.addEventListener('click', function () {
      btns.forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on'); onPick(it[0]);
    });
    btns.push(b); row.appendChild(b);
  });
  host.appendChild(row); return row;
}
/* fit.js's prewarm presses every .iseg-b and .icalc-chip it is not told to
   leave alone. A control that chooses WHAT IS SHOWN has to opt out or the
   handout page is whatever the sweep happened to press last. */
function keepOut(row) {
  Array.prototype.forEach.call(row.querySelectorAll('.iseg-b, .icalc-chip'),
    function (b) { b.setAttribute('data-unsafe', '1'); });
  return row;
}
function ctlRow(host) { var r = el('div', 'ictl-row'); host.appendChild(r); return r; }
function fmt(v, n) { n = n == null ? 2 : n; return v.toFixed(n); }
function minus(s) { return String(s).replace(/-/g, '−'); }
function num(v, n) { return minus(fmt(v, n)); }

function label(c, s, x, y, o) {
  o = o || {};
  c.save();
  c.font = (o.weight || 600) + ' ' + (o.size || 13) + 'px ui-sans-serif,system-ui,sans-serif';
  c.textAlign = o.align || 'center';
  c.textBaseline = o.baseline || 'middle';
  if (o.plate) {
    var w = c.measureText(s).width, h = (o.size || 13) * 1.25;
    var x0 = o.align === 'left' ? x - 3 : o.align === 'right' ? x - w - 3 : x - w / 2 - 3;
    c.fillStyle = C().PLATE; c.globalAlpha = o.plateAlpha == null ? .86 : o.plateAlpha;
    c.fillRect(x0, y - h / 2, w + 6, h);
    c.globalAlpha = 1;
  }
  c.fillStyle = o.color || C().INK;
  /* A safety net, not a layout tool: condense rather than let a caption run
     off the canvas.  Canvas clips silently at the edge, which on a phone
     chopped the ends off several footer lines.  Anything that overruns badly
     should still be wrapped with wrapLabel. */
  if (o.fit === false) {
    c.fillText(s, x, y);
  } else {
    var al = o.align || 'center';
    /* the context is scaled by the device pixel ratio, so recover the width
       in drawing units from the current transform */
    var k = (c.getTransform ? c.getTransform().a : 1) || 1;
    var CW = c.canvas.width / k;
    var room = al === 'left' ? CW - x - 4
             : al === 'right' ? x - 4
             : 2 * Math.min(x, CW - x) - 6;
    if (room > 20) c.fillText(s, x, y, room); else c.fillText(s, x, y);
  }
  c.restore();
}
/* TeX over a canvas.  A widget's working is math, and math in this deck is
   KaTeX: the canvas keeps the figure and an HTML layer the exact size of the
   canvas carries the typeset lines.  Positions are in the canvas's own units
   and the type is in container units, so it scales with the canvas.  put()
   takes the same x, y, align and size that label() does. */
function texLayer(u, ax) {
  var cv = u.cv, wrap = el('div', 'itexw');
  cv.parentNode.insertBefore(wrap, cv); wrap.appendChild(cv);
  wrap.style.maxWidth = cv.style.maxWidth;
  var lay = el('div', 'itexl'); wrap.appendChild(lay);
  return {
    clear: function () { lay.innerHTML = ''; },
    put: function (tex, x, y, o) {
      o = o || {};
      var d = el('div');
      if (window.katex) {
        try { window.katex.render(tex, d, { throwOnError: true }); }
        catch (e) { d.textContent = o.plain || tex; }
      } else d.textContent = o.plain || tex;
      d.style.left = (x / ax.W * 100).toFixed(3) + '%';
      d.style.top = (y / ax.H * 100).toFixed(3) + '%';
      d.style.fontSize = ((o.size || 13) * 1.12 / ax.W * 100).toFixed(4) + 'cqw';
      d.style.color = o.color || C().INK;
      d.style.transform = 'translate(' + (o.align === 'left' ? '0' : o.align === 'right' ? '-100%' : '-50%') + ',-50%)';
      lay.appendChild(d);
      return d;
    }
  };
}
/* a number for TeX: a real minus, fixed decimals */
function tn(v, n) { return fmt(v, n == null ? 1 : n); }
function arrow(c, x1, y1, x2, y2, o) {
  o = o || {};
  var dx = x2 - x1, dy = y2 - y1, m = Math.hypot(dx, dy);
  if (m < 0.6) return;
  var head = Math.min(o.head || 10, m * 0.55);
  var ux = dx / m, uy = dy / m;
  c.save();
  c.strokeStyle = o.color || C().INK; c.fillStyle = o.color || C().INK;
  c.lineWidth = o.width || 2.2; c.lineCap = 'round';
  if (o.dash) c.setLineDash(o.dash);
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - ux * head * 0.82, y2 - uy * head * 0.82); c.stroke();
  c.setLineDash([]);
  c.beginPath();
  c.moveTo(x2, y2);
  c.lineTo(x2 - ux * head - uy * head * 0.42, y2 - uy * head + ux * head * 0.42);
  c.lineTo(x2 - ux * head + uy * head * 0.42, y2 - uy * head - ux * head * 0.42);
  c.closePath(); c.fill();
  c.restore();
}
function key(c, x, y, rows, o) {
  o = o || {};
  var size = o.size || 11.5, lh = size * 1.55, pad = 7;
  c.save();
  c.font = '600 ' + size + 'px ui-sans-serif,system-ui,sans-serif';
  var w = 0;
  rows.forEach(function (r) { w = Math.max(w, c.measureText(r[1]).width); });
  w += 26 + pad * 2;
  var h = rows.length * lh + pad * 2;
  c.fillStyle = C().PLATE; c.globalAlpha = .92; c.fillRect(x, y, w, h);
  c.globalAlpha = 1; c.strokeStyle = C().GRID; c.lineWidth = 1;
  c.strokeRect(x + .5, y + .5, w - 1, h - 1);
  rows.forEach(function (r, i) {
    var yy = y + pad + lh * i + lh / 2;
    c.strokeStyle = r[0]; c.lineWidth = 3; c.beginPath();
    c.moveTo(x + pad, yy); c.lineTo(x + pad + 17, yy); c.stroke();
    c.fillStyle = C().INK; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(r[1], x + pad + 24, yy);
  });
  c.restore();
  return { w: w, h: h };
}

/* ======================================================================
   Shared geometry.

   Scene: a plain world-to-pixel map with y pointing UP, so a free body
   diagram can be written in the units of the problem (metres, centimetres)
   and nothing in a widget has to think about canvas y running downwards.

   The moment helpers are the heart of the lecture and are used by every
   figure that quotes a number.  perp() returns the SIGNED perpendicular
   distance from a point to a line of action, positive when the line passes
   on the counter-clockwise side, so moment = F * perp with no further
   bookkeeping.
   ====================================================================== */

function Scene(ctx, box) {
  this.c = ctx;
  this.bx = box;                 /* {x, y, w, h} in pixels */
  this.k = 1; this.ox = 0; this.oy = 0;
}
/* fit a world rectangle into the pixel box, preserving aspect */
Scene.prototype.fit = function (x0, y0, x1, y1, pad) {
  pad = pad == null ? 8 : pad;
  var b = this.bx;
  var kx = (b.w - 2 * pad) / (x1 - x0), ky = (b.h - 2 * pad) / (y1 - y0);
  this.k = Math.min(kx, ky);
  this.ox = b.x + b.w / 2 - (x0 + x1) / 2 * this.k;
  this.oy = b.y + b.h / 2 + (y0 + y1) / 2 * this.k;
  return this;
};
Scene.prototype.X = function (v) { return this.ox + v * this.k; };
Scene.prototype.Y = function (v) { return this.oy - v * this.k; };
Scene.prototype.L = function (v) { return v * this.k; };          /* world length -> px */

/* signed perpendicular distance from point p to the line through a with
   direction u (need not be a unit vector).  Positive = p is clockwise of
   the line, i.e. the force about p turns counter-clockwise. */
function perp(px, py, ax, ay, ux, uy) {
  var m = Math.hypot(ux, uy);
  if (m < 1e-12) return 0;
  return ((ax - px) * uy - (ay - py) * ux) / m;
}
/* moment of force (fx, fy) applied at (ax, ay) about the point (px, py) */
function moment(px, py, ax, ay, fx, fy) {
  return (ax - px) * fy - (ay - py) * fx;
}

/* draw a line of action as a long dashed line through a point */
function loa(c, s, ax, ay, ux, uy, o) {
  o = o || {};
  var m = Math.hypot(ux, uy); if (m < 1e-9) return;
  var ex = ux / m, ey = uy / m, R = o.len || 400;
  c.save();
  c.strokeStyle = o.color || C().MUT;
  c.lineWidth = o.width || 1.3;
  c.setLineDash(o.dash || [6, 5]);
  c.globalAlpha = o.alpha == null ? .78 : o.alpha;
  c.beginPath();
  c.moveTo(s.X(ax) - ex * R, s.Y(ay) + ey * R);
  c.lineTo(s.X(ax) + ex * R, s.Y(ay) - ey * R);
  c.stroke();
  c.restore();
}

/* the perpendicular from a point onto a line, with a right-angle tick and a
   label.  Returns the signed distance it drew. */
function dropPerp(c, s, px, py, ax, ay, ux, uy, o) {
  o = o || {};
  var m = Math.hypot(ux, uy); if (m < 1e-9) return 0;
  var ex = ux / m, ey = uy / m;
  var t = (px - ax) * ex + (py - ay) * ey;        /* projection along the line */
  var fx = ax + ex * t, fy = ay + ey * t;         /* foot of the perpendicular */
  var d = Math.hypot(px - fx, py - fy);
  c.save();
  c.strokeStyle = o.color || C().ORG;
  c.lineWidth = o.width || 2.2;
  if (o.dash) c.setLineDash(o.dash);
  c.beginPath(); c.moveTo(s.X(px), s.Y(py)); c.lineTo(s.X(fx), s.Y(fy)); c.stroke();
  c.setLineDash([]);
  /* right-angle tick at the foot */
  if (d * s.k > 16) {
    var g = 9 / s.k;
    var nx = (px - fx) / (d || 1), ny = (py - fy) / (d || 1);
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(s.X(fx + nx * g), s.Y(fy + ny * g));
    c.lineTo(s.X(fx + nx * g - ex * g), s.Y(fy + ny * g - ey * g));
    c.lineTo(s.X(fx - ex * g), s.Y(fy - ey * g));
    c.stroke();
  }
  c.restore();
  if (o.label && d * s.k > 14) {
    label(c, o.label, (s.X(px) + s.X(fx)) / 2, (s.Y(py) + s.Y(fy)) / 2,
          { color: o.color || C().ORG, size: o.size || 13, plate: true });
  }
  return d;
}

/* a curved arrow showing the sense of a moment, centred on (x, y) in pixels */
function spin(c, x, y, r, ccw, o) {
  o = o || {};
  var a0 = ccw ? -0.55 : 0.55, a1 = ccw ? -2.5 : 2.5;
  c.save();
  c.strokeStyle = o.color || C().ACC; c.fillStyle = o.color || C().ACC;
  c.lineWidth = o.width || 2.4; c.lineCap = 'round';
  c.beginPath(); c.arc(x, y, r, a0, a1, !ccw); c.stroke();
  var ax = x + r * Math.cos(a1), ay = y + r * Math.sin(a1);
  var tx = (ccw ? 1 : -1) * Math.sin(a1), ty = (ccw ? -1 : 1) * Math.cos(a1);
  var h = o.head || 8;
  c.beginPath();
  c.moveTo(ax + tx * h, ay + ty * h);
  c.lineTo(ax - tx * h * 0.35 - Math.cos(a1) * h * 0.9, ay - ty * h * 0.35 - Math.sin(a1) * h * 0.9);
  c.lineTo(ax - tx * h * 0.35 + Math.cos(a1) * h * 0.9, ay - ty * h * 0.35 + Math.sin(a1) * h * 0.9);
  c.closePath(); c.fill();
  c.restore();
}

/* a joint marker */
function pin(c, x, y, r, o) {
  o = o || {};
  c.save();
  c.fillStyle = o.fill || C().PLATE; c.strokeStyle = o.color || C().INK;
  c.lineWidth = o.width || 2;
  c.beginPath(); c.arc(x, y, r || 5, 0, 7); c.fill(); c.stroke();
  c.restore();
}

/* A second set of plot axes sharing one canvas.  Constructing another Axes
   on the same element resets cv.width, which blanks everything already
   drawn and re-scales the context -- so build a view that borrows the
   context instead of taking the canvas over. */
function sub(ax, pl, pt, pr, pb) {
  var v = Object.create(Axes.prototype);
  v.cv = ax.cv; v.c = ax.c; v.o = {};
  v.W = ax.W; v.H = ax.H; v.portrait = ax.portrait;
  v.pl = pl; v.pt = pt; v.pr = pr; v.pb = pb;
  v.setRange(0, 1, 0, 1);
  return v;
}

/* A centred caption that wraps to the canvas width instead of running off
   both edges, which is what every long footer line did in portrait.  Draws
   upwards from `y` so the last line sits where a single line would have,
   and returns the y of the topmost line it drew. */
function wrapLabel(c, txt, x, y, maxW, o) {
  o = o || {};
  var size = o.size || 11, lh = o.lh || size * 1.45;
  c.save();
  c.font = (o.weight || 600) + ' ' + size + 'px ui-sans-serif,system-ui,sans-serif';
  var words = String(txt).split(' '), lines = [], cur = '';
  for (var i = 0; i < words.length; i++) {
    var t = cur ? cur + ' ' + words[i] : words[i];
    if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  c.restore();
  var y0 = y - (lines.length - 1) * lh;
  lines.forEach(function (ln, k) {
    label(c, ln, x, y0 + k * lh, { size: size, color: o.color, weight: o.weight || 600,
                                   align: o.align || 'center', plate: o.plate });
  });
  return y0;
}

/* ---------------------------------------------------------------------
   The arithmetic every figure in this deck draws, in one place, so the
   self-test can run the same functions the figures do.
   --------------------------------------------------------------------- */
var RAD = Math.PI / 180, DEG = 180 / Math.PI;
/* canvas type: these figures are read from the back of a room, so their
   labels run a size up from the shared helpers' defaults on a wide screen */
function fs(n) { return D.portrait() ? n * 1.08 : n * 1.3; }

/* A 400 m track, 100 m across: two semicircles of radius 50 m joined by
   two straights.  Origin at the centre of the infield, +x east, +y north.
   The run starts in the middle of the top straight and goes anticlockwise
   (west first), the way races are run. */
var TRACK = { R: 50, L: (400 - 2 * Math.PI * 50) / 2, lap: 400 };
function trackPos(s) {
  var R = TRACK.R, L = TRACK.L, h = L / 2;
  s = ((s % 400) + 400) % 400;
  if (s < h) return [-s, R];
  s -= h;
  if (s < Math.PI * R) { var a = Math.PI / 2 + s / R; return [-h + R * Math.cos(a), R * Math.sin(a)]; }
  s -= Math.PI * R;
  if (s < L) return [-h + s, -R];
  s -= L;
  if (s < Math.PI * R) { var b = -Math.PI / 2 + s / R; return [h + R * Math.cos(b), R * Math.sin(b)]; }
  s -= Math.PI * R;
  return [h - s, R];
}
/* distance run, displacement from the start (as east, north), and with a
   time, speed and average velocity */
function runState(s, T, S) {
  var p = trackPos(s), q = trackPos(0);
  var dx = p[0] - q[0], dy = p[1] - q[1];
  var t = S ? s / S * T : 0;
  return { dist: s, dx: dx, dy: dy, disp: Math.hypot(dx, dy), t: t,
           speed: t > 0 ? s / t : 0, vel: t > 0 ? Math.hypot(dx, dy) / t : 0, p: p };
}
/* a compass direction for an (east, north) pair */
function compassWord(e, n) {
  if (Math.hypot(e, n) < 1e-6) return '';
  var a = Math.atan2(n, e) * DEG;                 /* anticlockwise from east */
  var dirs = [[0, 'east'], [90, 'north'], [180, 'west'], [-90, 'south'], [-180, 'west']];
  for (var i = 0; i < dirs.length; i++)
    if (Math.abs(a - dirs[i][0]) < 0.5) return dirs[i][1];
  var ns = n > 0 ? 'north' : 'south', ew = e > 0 ? 'east' : 'west';
  var off = Math.atan2(Math.abs(n), Math.abs(e)) * DEG;
  return fmt(off, 1) + '° ' + ns + ' of ' + ew;
}

/* resolve a vector given as magnitude and direction anticlockwise from
   east, into its N-S and E-W components */
function resolveV(mag, ang) {
  return { ns: mag * Math.sin(ang * RAD), ew: mag * Math.cos(ang * RAD) };
}
function composeV(list) {
  var ns = 0, ew = 0;
  list.forEach(function (v) { var r = resolveV(v[0], v[1]); ns += r.ns; ew += r.ew; });
  return { ns: ns, ew: ew, mag: Math.hypot(ns, ew), ang: Math.atan2(ns, ew) * DEG };
}
/* the same, the way the worked example does it on paper: each component
   rounded to 0.1 km before it goes in the table, and the sums carried from
   the table */
function r1(v) { return Math.round(v * 10) / 10; }
function composeRounded(list) {
  var ns = 0, ew = 0;
  list.forEach(function (v) { var r = resolveV(v[0], v[1]); ns += r1(r.ns); ew += r1(r.ew); });
  ns = r1(ns); ew = r1(ew);
  return { ns: ns, ew: ew, mag: Math.hypot(ns, ew), ang: Math.atan2(ns, ew) * DEG };
}
/* the three worked examples, in degrees anticlockwise from east */
var EX_TT = [['A', 4, 90], ['B', 3, 0], ['C', 4.5, -45]];
var EX_VS = [['A', 433, 30], ['B', 315, -20], ['C', 489, 120]];

/* the 100 m: average acceleration over a set of intervals.
   halves: the three-column table on the slides; splits: the 10 m splits */
function boltSections(kind) {
  var B = DA.bolt, out = [];
  if (kind === 'whole') {
    var h = B.half;
    out.push({ t0: 0, t1: h.t[2], a: (h.v[2] - h.v[0]) / (h.t[2] - h.t[0]),
               lab: '0–100 m' });
  } else if (kind === 'halves') {
    var g = B.half;
    for (var i = 1; i < 3; i++)
      out.push({ t0: g.t[i - 1], t1: g.t[i], a: (g.v[i] - g.v[i - 1]) / (g.t[i] - g.t[i - 1]),
                 lab: g.d[i - 1] + '–' + g.d[i] + ' m' });
  } else {
    var t = 0, vp = 0;
    for (var k = 1; k < B.dist.length; k++) {
      var sp = B.split[k], v = 10 / sp;
      out.push({ t0: t, t1: t + sp, a: (v - vp) / sp, v: v,
                 lab: B.dist[k - 1] + '–' + B.dist[k] + ' m' });
      t += sp; vp = v;
    }
  }
  return out;
}

/* ======================================================================
   1. TRACK — the 1.5-lap run, distance against displacement

   data-mode="d": source slides 26 to 28.  The runner can be stopped
   anywhere: the distance is the path behind her, the displacement the
   arrow from the start.
   data-mode="v": source slides 77 to 79.  The same run in 37.8 s, so the
   two become speed and velocity.
   ====================================================================== */
D.register('track', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var mode = node.getAttribute('data-mode') || 'd';
  var T = 37.8, SMAX = 600;
  var S = { s: SMAX }, raf = 0, last = 0, playing = false;

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 640 : 380,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;
  var TX = texLayer(u, ax);

  function draw() {
    var K = C(), st = runState(S.s, T, SMAX);
    ax.clear(); TX.clear();
    /* the track, on the left (or on top in portrait) */
    var tw = port ? ax.W - 30 : ax.W * 0.50, th = port ? 250 : ax.H - 60;
    var sc = new Scene(c, { x: 14, y: 14, w: tw, h: th })
      .fit(-TRACK.L / 2 - 62, -64, TRACK.L / 2 + 62, 64, 6);
    function lane(r, col, wd) {
      c.save(); c.strokeStyle = col; c.lineWidth = wd; c.beginPath();
      var h = TRACK.L / 2;
      c.moveTo(sc.X(-h), sc.Y(r));
      c.lineTo(sc.X(h), sc.Y(r));
      c.arc(sc.X(h), sc.Y(0), sc.L(r), -Math.PI / 2, Math.PI / 2);
      c.lineTo(sc.X(-h), sc.Y(-r));
      c.arc(sc.X(-h), sc.Y(0), sc.L(r), Math.PI / 2, Math.PI * 1.5);
      c.closePath(); c.stroke(); c.restore();
    }
    lane(TRACK.R + 6, K.INK, 2); lane(TRACK.R - 6, K.INK, 2);
    lane(TRACK.R, K.GRID, 1);
    /* the start line */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sc.X(0), sc.Y(TRACK.R + 6)); c.lineTo(sc.X(0), sc.Y(TRACK.R - 6));
    c.stroke(); c.restore();
    label(c, 'start', sc.X(0), sc.Y(TRACK.R - 14), { size: fs(11), color: K.MUT });
    /* the distance: the path she has run, drawn on the lane */
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 4; c.globalAlpha = .75;
    c.beginPath();
    var n = Math.max(2, Math.ceil(S.s / 2));
    for (var i = 0; i <= n; i++) {
      var p = trackPos(S.s * i / n);
      /* a second lap is drawn a little inside the first so both show */
      var lapk = Math.floor(S.s * i / n / 400.0001), r0 = 1 - 0.07 * lapk;
      var X = sc.X(p[0] * r0), Y = sc.Y(p[1] * r0);
      if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
    }
    c.stroke(); c.restore();
    /* the displacement */
    var q = trackPos(0);
    if (st.disp > 0.5)
      arrow(c, sc.X(q[0]), sc.Y(q[1]), sc.X(st.p[0]), sc.Y(st.p[1]),
            { color: K.ACC, width: 3.4, head: 14 });
    c.save(); c.fillStyle = K.BLUE; c.beginPath();
    c.arc(sc.X(st.p[0]), sc.Y(st.p[1]), 8, 0, 7); c.fill(); c.restore();
    /* north */
    var nx = sc.X(TRACK.L / 2 + 58), ny = sc.Y(40);
    arrow(c, nx, ny + 22, nx, ny - 18, { color: K.VIO, width: 2, head: 9 });
    label(c, 'N', nx, ny - 28, { size: fs(12), color: K.VIO, weight: 700 });

    /* the numbers */
    var px = port ? 20 : ax.W * 0.55, py = port ? th + 50 : 44, lh = port ? 38 : 46;
    var dir = compassWord(st.dx, st.dy);
    var L = [['distance run', fmt(st.dist, 0) + ' m', K.BLUE],
             ['displacement', fmt(st.disp, 1) + ' m' + (dir ? '  ' + dir : ''), K.ACC]];
    if (mode === 'v') {
      L.unshift(['time', fmt(st.t, 1) + ' s', K.INK]);
      L.push(['\\text{speed} = \\text{distance} / \\text{time}', st.t > 0 ? fmt(st.speed, 1) + ' m/s' : '—', K.BLUE]);
      L.push(['\\text{velocity} = \\text{displacement} / \\text{time}',
              st.t > 0 ? fmt(st.vel, 1) + ' m/s' + (dir ? '  ' + dir : '') : '—', K.ACC]);
    }
    label(c, fmt(S.s / 400, 2) + ' laps', px, py, { size: fs(15), align: 'left', weight: 750 });
    L.forEach(function (r, k) {
      var y = py + 40 + k * lh * 1.25;
      if (r[0].charAt(0) === '\\') TX.put(r[0], px, y, { size: fs(12.5), align: 'left', color: K.MUT });
      else label(c, r[0], px, y, { size: fs(12.5), align: 'left', color: K.MUT });
      label(c, r[1], px, y + 23, { size: fs(16), align: 'left', weight: 750, color: r[2] });
    });
  }

  function step(ts) {
    if (!playing) return;
    var dt = last ? (ts - last) / 1000 : 0; last = ts;
    S.s = Math.min(SMAX, S.s + dt * SMAX / 9.0);
    sl.quiet(S.s); draw();
    if (S.s >= SMAX) { stop(); return; }
    raf = requestAnimationFrame(step);
  }
  function stop() { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Run'; }

  u.ctl.className = 'ictls g2';
  var sl = slider(u.ctl, 'Distance run', 0, SMAX, 1, S.s,
                  function (v) { return fmt(v, 0) + ' m'; },
                  function (v) { stop(); S.s = v; draw(); });
  sl.quiet(S.s);
  var pb = playBtn(u.ctl, '▶ Run');
  pb.setAttribute('data-unsafe', '1');
  pb.addEventListener('click', function () {
    if (playing) { stop(); return; }
    if (S.s >= SMAX) S.s = 0;
    playing = true; last = 0; pb.textContent = '❚❚ Pause';
    raf = requestAnimationFrame(step);
  });
  var rd = readout(u.ctl);
  rd.innerHTML = mode === 'v'
    ? '1.5 laps in 37.8 s. <b>Speed</b> is the distance over the time; <b>velocity</b> ' +
      'is the displacement over the time. At the finish: 15.9 m/s and 2.6 m/s south.'
    : 'The <b>distance</b> is the whole path she has run; the <b>displacement</b> is ' +
      'the straight arrow from the start. At 1.5 laps: 600 m, and 100 m south.';
  node._draw = draw;
  node._stop = stop;
  draw();
});

/* ======================================================================
   2. FIELD — displacement from two coordinate positions

   Source slides 29 to 32.  Two players on the field, either one draggable.
   The working is the slides' own: final minus initial for each axis,
   Pythagoras for the magnitude, the arctangent for the angle, measured
   from the y axis as on slide 31.
   ====================================================================== */
D.register('field', function (node) {
  function fs2(n) { return fs(n) * (D.portrait() ? 1 : 1.22); }
  var port = D.portrait();
  var u = build(node, {});
  var S = { a: [15, 5], b: [5, 35], drag: null };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 700 : 420,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c, sc;
  var TX = texLayer(u, ax);

  function draw() {
    var K = C();
    ax.clear();
    var fw = port ? ax.W - 20 : ax.W * 0.36, fh = port ? 380 : ax.H - 20;
    sc = new Scene(c, { x: 10, y: 10, w: fw, h: fh }).fit(-5, -3, 33, 55, 4);
    /* the field strip, as on the slides */
    c.save();
    for (var yd = 5; yd <= 50; yd += 5) {
      c.strokeStyle = yd % 10 ? K.GRID : K.INK; c.lineWidth = yd % 10 ? 1 : 1.4;
      c.beginPath(); c.moveTo(sc.X(0), sc.Y(yd)); c.lineTo(sc.X(30), sc.Y(yd)); c.stroke();
      if (yd % 10 === 0) label(c, String(yd), sc.X(-1.6), sc.Y(yd), { size: fs2(11), color: K.MUT });
    }
    c.strokeStyle = K.MUT; c.lineWidth = 1;
    for (var h = 1; h < 52; h++) {
      c.beginPath(); c.moveTo(sc.X(17.4), sc.Y(h)); c.lineTo(sc.X(19.4), sc.Y(h)); c.stroke();
    }
    c.restore();
    arrow(c, sc.X(0), sc.Y(0), sc.X(32), sc.Y(0), { color: K.BLUE, width: 1.8 });
    arrow(c, sc.X(0), sc.Y(0), sc.X(0), sc.Y(54), { color: K.BLUE, width: 1.8 });
    label(c, 'x', sc.X(32.6), sc.Y(0) + 12, { size: fs2(13), color: K.BLUE, weight: 700 });
    label(c, 'y', sc.X(0) - 10, sc.Y(54), { size: fs2(13), color: K.BLUE, weight: 700 });

    TX.clear();
    var A = S.a, B = S.b, dx = B[0] - A[0], dy = B[1] - A[1];
    var R = Math.hypot(dx, dy);
    /* components, then the resultant */
    arrow(c, sc.X(A[0]), sc.Y(A[1]), sc.X(A[0]), sc.Y(B[1]),
          { color: K.BLUE, width: 1.6, dash: [5, 4] });
    arrow(c, sc.X(A[0]), sc.Y(B[1]), sc.X(B[0]), sc.Y(B[1]),
          { color: K.BLUE, width: 1.6, dash: [5, 4] });
    label(c, 'Δy', sc.X(A[0]) + (dx < 0 ? 16 : -16), sc.Y((A[1] + B[1]) / 2),
          { size: fs2(12), color: K.BLUE, weight: 700, plate: true });
    label(c, 'Δx', sc.X((A[0] + B[0]) / 2), sc.Y(B[1]) + (dy >= 0 ? -12 : 12),
          { size: fs2(12), color: K.BLUE, weight: 700, plate: true });
    if (R > 0.3) arrow(c, sc.X(A[0]), sc.Y(A[1]), sc.X(B[0]), sc.Y(B[1]),
                       { color: K.ACC, width: 3, head: 13 });
    [[A, 'initial'], [B, 'final']].forEach(function (z) {
      c.save(); c.fillStyle = K.BLUE; c.beginPath();
      c.ellipse(sc.X(z[0][0]), sc.Y(z[0][1]), 11, 6, 0, 0, 7); c.fill();
      c.fillStyle = C().PLATE; c.strokeStyle = K.INK; c.lineWidth = 1.4;
      c.beginPath(); c.arc(sc.X(z[0][0]), sc.Y(z[0][1]), 4.5, 0, 7); c.fill(); c.stroke();
      c.restore();
      label(c, '(' + num(z[0][0], 0) + ', ' + num(z[0][1], 0) + ')  ' + z[1],
            sc.X(z[0][0]) + 16, sc.Y(z[0][1]) - 16,
            { size: fs2(12), align: 'left', color: K.ACC, weight: 700, plate: true });
    });

    /* the working */
    var th = Math.atan2(dx, dy) * DEG;
    var px = port ? 20 : ax.W * 0.40, py = port ? fh + 40 : 40, lh = port ? 30 : 46;
    var i0 = function (v) { return fmt(v, 0); };
    var lines = [
      ['\\text{Resultant } x = x_{\\text{final}} - x_{\\text{initial}} = ' + i0(B[0]) + ' - ' +
       i0(A[0]) + ' = ' + i0(dx), K.INK],
      ['\\text{Resultant } y = y_{\\text{final}} - y_{\\text{initial}} = ' + i0(B[1]) + ' - ' +
       i0(A[1]) + ' = ' + i0(dy), K.INK],
      ['A^2 = (' + i0(dx) + ')^2 + (' + i0(dy) + ')^2', K.INK],
      ['\\mathbf{A = ' + fmt(R, 1) + '\\ yards}', K.ACC],
      ['\\tan\\theta = \\dfrac{\\text{opposite}}{\\text{adjacent}} = \\dfrac{' + i0(dx) + '}{' + i0(dy) + '}', K.INK],
      ['\\boldsymbol{\\theta = \\arctan\\!\\left(\\dfrac{' + i0(dx) + '}{' + i0(dy) + '}\\right) = ' +
       fmt(th, 1) + '^\\circ}', K.ACC]];
    lines.forEach(function (l, k) {
      TX.put(l[0], px, py + k * lh + (k > 3 ? 30 : 0) + (k > 1 ? 10 : 0) + (k > 4 ? 26 : 0),
             { size: fs2(k === 3 || k === 5 ? 15.5 : 13.5), align: 'left', color: l[1] });
    });
    wrapLabel(c, 'θ is measured from the +y axis; a negative angle leans towards −x',
              px, py + 6 * lh + 102, (port ? ax.W - 40 : ax.W * 0.58), { size: fs2(11.5), align: 'left',
              color: K.MUT });
  }

  /* dragging */
  function toField(ev) {
    var r = u.cv.getBoundingClientRect(), kx = ax.W / r.width;
    var x = (ev.clientX - r.left) * kx, y = (ev.clientY - r.top) * kx;
    return [(x - sc.ox) / sc.k, (sc.oy - y) / sc.k, x, y];
  }
  function near(p, q) { return Math.hypot(sc.X(q[0]) - p[2], sc.Y(q[1]) - p[3]) < 22; }
  u.cv.addEventListener('pointerdown', function (ev) {
    var p = toField(ev);
    S.drag = near(p, S.b) ? 'b' : near(p, S.a) ? 'a' : null;
    if (S.drag) { u.cv.setPointerCapture(ev.pointerId); ev.preventDefault(); }
  });
  u.cv.addEventListener('pointermove', function (ev) {
    if (!S.drag) return;
    var p = toField(ev);
    S[S.drag] = [Math.max(0, Math.min(30, Math.round(p[0]))),
                 Math.max(0, Math.min(50, Math.round(p[1])))];
    draw();
  });
  u.cv.addEventListener('pointerup', function () { S.drag = null; });
  u.cv.style.touchAction = 'none';
  u.cv.setAttribute('data-prevent-swipe', '');

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  var rb = playBtn(row, 'Back to the example');
  rb.addEventListener('click', function () { S.a = [15, 5]; S.b = [5, 35]; draw(); });
  var rd = readout(u.ctl);
  rd.innerHTML = 'Drag either player. The displacement is <b>final minus initial</b> ' +
    'on each axis; its length comes from Pythagoras and its direction from the ' +
    'arctangent. The example: 31.6 yards at −18.4°.';
  node._draw = draw;
  draw();
});

/* ======================================================================
   3. TIPTOTAIL — A, B and C drawn tail to tip, at 1 cm per kilometre

   Source slides 36 to 40.  A is 4 km north, B 3 km east, C 4.5 km 45°
   south of east.  Choose the order and the path changes; the resultant
   does not.  A step slider draws the four steps of the method in turn.
   ====================================================================== */
D.register('tiptotail', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var ORD = { ABC: [0, 1, 2], BCA: [1, 2, 0], CAB: [2, 0, 1], ACB: [0, 2, 1] };
  var S = { ord: 'ABC', step: 4 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 620 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function draw() {
    var K = C();
    ax.clear();
    var fw = port ? ax.W - 20 : ax.W * 0.58, fh = port ? 400 : ax.H - 20;
    var sc = new Scene(c, { x: 10, y: 10, w: fw, h: fh }).fit(-1.2, -3.8, 7.8, 4.9, 6);
    /* a centimetre grid: one square is one kilometre */
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
    for (var gx = -1; gx <= 7; gx++) {
      c.beginPath(); c.moveTo(sc.X(gx), sc.Y(-3.8)); c.lineTo(sc.X(gx), sc.Y(4.9)); c.stroke();
    }
    for (var gy = -3; gy <= 4; gy++) {
      c.beginPath(); c.moveTo(sc.X(-1.2), sc.Y(gy)); c.lineTo(sc.X(7.8), sc.Y(gy)); c.stroke();
    }
    c.restore();
    arrow(c, sc.X(0), sc.Y(-3.6), sc.X(0), sc.Y(4.8), { color: K.MUT, width: 1.2, head: 8 });
    label(c, 'N', sc.X(0) + 12, sc.Y(4.6), { size: fs(11), color: K.MUT, weight: 700 });

    var o = ORD[S.ord], x = 0, y = 0;
    o.forEach(function (i, k) {
      if (S.step < 2 && k > 0) return;
      var v = EX_TT[i], r = resolveV(v[1], v[2]);
      var x1 = x + r.ew, y1 = y + r.ns;
      arrow(c, sc.X(x), sc.Y(y), sc.X(x1), sc.Y(y1), { color: K.INK, width: 3.2, head: 13 });
      var mx = (sc.X(x) + sc.X(x1)) / 2, my = (sc.Y(y) + sc.Y(y1)) / 2;
      var nx = -(sc.Y(y1) - sc.Y(y)), ny = sc.X(x1) - sc.X(x), m = Math.hypot(nx, ny) || 1;
      label(c, v[0] + '  ' + v[1] + ' cm', mx + nx / m * 20, my + ny / m * 20,
            { size: fs(13), weight: 750, plate: true });
      x = x1; y = y1;
    });
    var R = composeV(EX_TT.map(function (v) { return [v[1], v[2]]; }));
    if (S.step >= 3) {
      arrow(c, sc.X(0), sc.Y(0), sc.X(R.ew), sc.Y(R.ns), { color: K.ACC, width: 3.8, head: 15 });
    }
    if (S.step >= 4) {
      c.save(); c.strokeStyle = K.ACC; c.setLineDash([5, 4]); c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(sc.X(0), sc.Y(0)); c.lineTo(sc.X(7.6), sc.Y(0)); c.stroke();
      c.setLineDash([]); c.lineWidth = 2;
      c.beginPath(); c.arc(sc.X(0), sc.Y(0), sc.L(6.9), -R.ang * RAD, 0); c.stroke();
      c.restore();
      label(c, fmt(R.ang, 1) + '°', sc.X(7.25), sc.Y(0.55), { size: fs(13), color: K.ACC, weight: 750,
            plate: true });
    }

    /* the method, one step at a time */
    var px = port ? 20 : ax.W * 0.62, py = port ? fh + 36 : 44;
    var steps = ['Define your axis system and scaling factor: 1 km : 1 cm',
                 'Draw each vector to scale with its tail on the tip of the preceding vector',
                 'Draw the resultant from the tail of the first to the tip of the last',
                 'Measure the length and orientation of the resultant'];
    var y0 = py;
    steps.forEach(function (s, k) {
      var on = k < S.step;
      y0 = wrapLabel(c, (k + 1) + '.  ' + s, px, y0 + (k ? 50 : 0), port ? ax.W - 40 : ax.W * 0.36,
                     { size: fs(12.5), align: 'left', weight: on ? 700 : 600,
                       color: on ? K.INK : K.MUT }) ;
      y0 += (s.length > 46 ? 18 : 0);
    });
    if (S.step >= 4) {
      label(c, 'resultant  ' + fmt(R.mag, 1) + ' cm  =  ' + fmt(R.mag, 1) + ' km', px,
            y0 + 64, { size: fs(15), align: 'left', weight: 750, color: K.ACC });
      label(c, fmt(R.ang, 1) + '° north of east', px, y0 + 96,
            { size: fs(15), align: 'left', weight: 750, color: K.ACC });
    }
  }

  u.ctl.className = 'ictls g2';
  var ss = slider(u.ctl, 'Step', 1, 4, 1, S.step, function (v) { return fmt(v, 0) + ' of 4'; },
                  function (v) { S.step = Math.round(v); draw(); });
  ss.quiet(S.step);
  var row = ctlRow(u.ctl);
  seg(row, [['ABC', 'A, B, C'], ['BCA', 'B, C, A'], ['CAB', 'C, A, B'], ['ACB', 'A, C, B']],
      'ABC', function (v) { S.ord = v; draw(); });
  keepOut(row);
  var rd = readout(u.ctl);
  rd.innerHTML = 'Drawn to scale, the resultant measures <b>6.2 cm</b>, so 6.2 km, at ' +
    'about <b>8° north of east</b>. Change the order: the path changes, the resultant ' +
    'does not.';
  node._draw = draw;
  draw();
});

/* ======================================================================
   4. RESOLVE — one vector into its N-S and E-W components

   Source slides 41 to 51, the five steps on a vector that can be changed.
   Opens on the worked example: 84 km at 30° south of east.
   ====================================================================== */
D.register('resolve', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { mag: 84, ang: -30, step: 5 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 640 : 380,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;
  var TX = texLayer(u, ax);

  function draw() {
    var K = C();
    ax.clear(); TX.clear();
    var fw = port ? ax.W - 20 : ax.W * 0.48, fh = port ? 360 : ax.H - 20;
    var sc = new Scene(c, { x: 10, y: 10, w: fw, h: fh }).fit(-155, -155, 155, 155, 6);
    /* the compass */
    c.save(); c.strokeStyle = K.ACC; c.globalAlpha = .55; c.setLineDash([5, 4]); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(sc.X(-150), sc.Y(0)); c.lineTo(sc.X(150), sc.Y(0));
    c.moveTo(sc.X(0), sc.Y(-150)); c.lineTo(sc.X(0), sc.Y(150)); c.stroke(); c.restore();
    [['North', 0, 146], ['South', 0, -146], ['East', 140, 8], ['West', -140, 8]].forEach(function (z) {
      label(c, z[0], sc.X(z[1]), sc.Y(z[2]), { size: fs(11), color: K.MUT, weight: 650 });
    });
    var r = resolveV(S.mag, S.ang), x1 = sc.X(r.ew), y1 = sc.Y(r.ns);
    var o = [sc.X(0), sc.Y(0)];
    arrow(c, o[0], o[1], x1, y1, { color: K.BLUE, width: 3.4, head: 14 });
    if (S.step === 2 || S.step === 3)
      arrow(c, o[0], o[1], o[0], y1, { color: K.BLUE, width: 2, dash: [3, 4] });
    if (S.step >= 3)
      arrow(c, o[0], o[1], x1, o[1], { color: K.BLUE, width: 2, dash: [3, 4] });
    if (S.step >= 4)
      arrow(c, x1, o[1], x1, y1, { color: K.BLUE, width: 2, dash: [3, 4] });
    /* the angle from the E-W line */
    var east = r.ew >= 0, ref = east ? 0 : Math.PI;
    var a = -Math.atan2(r.ns, r.ew);
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 1.6; c.beginPath();
    var dd = a - ref;
    while (dd > Math.PI) dd -= 2 * Math.PI;
    while (dd <= -Math.PI) dd += 2 * Math.PI;
    c.arc(o[0], o[1], 36, ref, ref + dd, dd < 0); c.stroke(); c.restore();
    var th = Math.atan2(Math.abs(r.ns), Math.abs(r.ew)) * DEG;
    label(c, fmt(th, 0) + '°', o[0] + (east ? 50 : -50), o[1] + (r.ns > 0 ? -12 : 14),
          { size: fs(12), color: K.BLUE, weight: 700, plate: true });

    /* the working */
    var px = port ? 20 : ax.W * 0.52, py = port ? fh + 34 : 40;
    var dir = compassWord(r.ew, r.ns);
    label(c, fmt(S.mag, 0) + ' km  ' + dir, px, py, { size: fs(15), align: 'left', weight: 750 });
    var steps = ['1  Draw the vector being resolved', '2  Draw the N-S component',
                 '3  Draw the E-W component',
                 '4  Move one component to form a right-angle triangle',
                 '5  Use trigonometry to calculate the components'];
    steps.forEach(function (s, k) {
      label(c, s, px, py + 38 + k * 30, { size: fs(12.5), align: 'left',
            weight: k + 1 === S.step ? 750 : 600, color: k < S.step ? K.INK : K.MUT });
    });
    if (S.step >= 5) {
      var yy = py + 38 + 5 * 30 + 20;
      TX.put('\\text{N-S: opp} = (\\text{hyp})(\\sin\\theta) = (' + fmt(S.mag, 0) + '\\ \\text{km})(\\sin ' +
             fmt(th, 0) + '^\\circ) = \\mathbf{' + fmt(Math.abs(r.ns), 1) + '\\ km\\ ' +
             (r.ns >= 0 ? 'north' : 'south') + '}', px, yy, { size: fs(13), align: 'left', color: K.BLUE });
      TX.put('\\text{E-W: adj} = (\\text{hyp})(\\cos\\theta) = (' + fmt(S.mag, 0) + '\\ \\text{km})(\\cos ' +
             fmt(th, 0) + '^\\circ) = \\mathbf{' + fmt(Math.abs(r.ew), 1) + '\\ km\\ ' +
             (r.ew >= 0 ? 'east' : 'west') + '}', px, yy + 34, { size: fs(13), align: 'left', color: K.BLUE });
      label(c, 'with N and E positive:  N-S ' + num(r.ns, 1) + ' km,  E-W ' + num(r.ew, 1) + ' km',
            px, yy + 72, { size: fs(12), align: 'left', color: K.MUT });
    }
  }

  u.ctl.className = 'ictls g2';
  var sm = slider(u.ctl, 'Magnitude', 10, 150, 1, S.mag, function (v) { return fmt(v, 0) + ' km'; },
                  function (v) { S.mag = v; draw(); });
  var sa = slider(u.ctl, 'Direction', -180, 180, 1, S.ang,
                  function (v) { return fmt(v, 0) + '°'; },
                  function (v) { S.ang = v; draw(); });
  var ss = slider(u.ctl, 'Step', 1, 5, 1, S.step, function (v) { return fmt(v, 0) + ' of 5'; },
                  function (v) { S.step = Math.round(v); draw(); });
  sm.quiet(S.mag); sa.quiet(S.ang); ss.quiet(S.step);
  var rd = readout(u.ctl);
  rd.innerHTML = 'Direction is measured anticlockwise from east. The example, 84 km at ' +
    '30° south of east, resolves into <b>42.0 km south</b> and <b>72.7 km east</b>.';
  node._draw = draw;
  draw();
});

/* ======================================================================
   5. VECSUM — the vector resolution method of composition

   Source slides 53 to 74, step by step: each vector resolved, its row of
   the table filled in, the columns summed, and the resultant found from the
   summed components with Pythagoras and the arctangent.
   ====================================================================== */
D.register('vecsum', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { step: 6 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 700 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;
  var TX = texLayer(u, ax);
  var COL = function (K) { return [K.BLUE, K.GRN, K.VIO]; };

  function draw() {
    var K = C(), cols = COL(K);
    ax.clear(); TX.clear();
    var fw = port ? ax.W - 20 : ax.W * 0.46, fh = port ? 340 : ax.H - 20;
    var sc = new Scene(c, { x: 10, y: 10, w: fw, h: fh }).fit(-560, -240, 560, 720, 6);
    c.save(); c.strokeStyle = K.ACC; c.globalAlpha = .5; c.setLineDash([5, 4]); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(sc.X(-540), sc.Y(0)); c.lineTo(sc.X(540), sc.Y(0));
    c.moveTo(sc.X(0), sc.Y(-230)); c.lineTo(sc.X(0), sc.Y(700)); c.stroke(); c.restore();
    label(c, 'N', sc.X(0) + 10, sc.Y(690), { size: fs(11), color: K.MUT, weight: 700 });
    label(c, 'E', sc.X(530), sc.Y(0) - 10, { size: fs(11), color: K.MUT, weight: 700 });

    var rows = [];
    EX_VS.forEach(function (v, i) {
      var r = resolveV(v[1], v[2]), on = S.step >= 2 + i, col = cols[i];
      c.save(); c.globalAlpha = S.step >= 6 ? 0.35 : 1;
      arrow(c, sc.X(0), sc.Y(0), sc.X(r.ew), sc.Y(r.ns), { color: col, width: 3, head: 12 });
      if (on && S.step < 6) {
        arrow(c, sc.X(0), sc.Y(0), sc.X(r.ew), sc.Y(0), { color: col, width: 1.8, dash: [3, 4] });
        arrow(c, sc.X(r.ew), sc.Y(0), sc.X(r.ew), sc.Y(r.ns), { color: col, width: 1.8, dash: [3, 4] });
      }
      c.restore();
      label(c, v[0], sc.X(r.ew * 1.08), sc.Y(r.ns * 1.08) - 6, { size: fs(13), weight: 750, color: col,
            plate: true });
      rows.push([v[0], on ? num(r1(r.ns), 1) + ' km' : '', on ? num(r1(r.ew), 1) + ' km' : '', col]);
    });
    var R = composeRounded(EX_VS.map(function (v) { return [v[1], v[2]]; }));
    if (S.step >= 6) {
      arrow(c, sc.X(0), sc.Y(0), sc.X(R.ew), sc.Y(0), { color: K.ACC, width: 2, dash: [3, 4] });
      arrow(c, sc.X(R.ew), sc.Y(0), sc.X(R.ew), sc.Y(R.ns), { color: K.ACC, width: 2, dash: [3, 4] });
      arrow(c, sc.X(0), sc.Y(0), sc.X(R.ew), sc.Y(R.ns), { color: K.ACC, width: 4, head: 15 });
      label(c, 'R', sc.X(R.ew) + 14, sc.Y(R.ns), { size: fs(14), weight: 750, color: K.ACC });
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.6; c.beginPath();
      c.arc(sc.X(0), sc.Y(0), 34, -R.ang * RAD, 0); c.stroke(); c.restore();
      label(c, 'α', sc.X(0) + 44, sc.Y(0) - 14, { size: fs(13), color: K.ACC, weight: 700 });
    }

    /* the table */
    var tx = port ? 24 : ax.W * 0.52, ty = port ? fh + 30 : 34;
    var cw = port ? [70, 150, 150] : [86, 186, 186], rh = 34;
    var heads = ['Vector', 'N-S Component', 'E-W Component'];
    function cell(txt, col, x, y, w, o) {
      label(c, txt, x + w / 2, y + rh / 2, Object.assign({ size: fs(13), color: col }, o || {}));
    }
    var x = tx;
    heads.forEach(function (h, j) { cell(h, K.INK, x, ty, cw[j], { weight: 750 }); x += cw[j]; });
    rows.forEach(function (r, i) {
      var xx = tx, y = ty + rh * (i + 1);
      cell(r[0] + '.', r[3], xx, y, cw[0], { weight: 750 }); xx += cw[0];
      cell(r[1], r[3], xx, y, cw[1], { weight: 700 }); xx += cw[1];
      cell(r[2], r[3], xx, y, cw[2], { weight: 700 });
    });
    var ys = ty + rh * 4;
    cell('Sum', K.INK, tx, ys, cw[0], { weight: 750 });
    if (S.step >= 5) {
      cell(fmt(R.ns, 1) + ' km', K.ACC, tx + cw[0], ys, cw[1], { weight: 750 });
      cell(fmt(R.ew, 1) + ' km', K.ACC, tx + cw[0] + cw[1], ys, cw[2], { weight: 750 });
    }
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1;
    var W = cw[0] + cw[1] + cw[2];
    for (var k = 0; k <= 4; k++) {
      c.beginPath(); c.moveTo(tx, ty + rh * (k + 1)); c.lineTo(tx + W, ty + rh * (k + 1)); c.stroke();
    }
    c.restore();

    var msg = ['the three vectors, to one scale',
               'resolve A into its N-S and E-W components',
               'resolve B; its N-S component is negative (south)',
               'resolve C; its E-W component is negative (west)',
               'add the components, respectively',
               'combine the sums into the resultant'][S.step - 1];
    label(c, S.step + '.  ' + msg, tx, ys + rh + 30, { size: fs(13), align: 'left', weight: 700 });
    if (S.step >= 6) {
      TX.put('C^2 = (' + fmt(R.ns, 1) + '\\ \\text{km})^2 + (' + fmt(R.ew, 1) +
             '\\ \\text{km})^2 \\qquad \\mathbf{C = ' + fmt(R.mag, 1) + '\\ km}',
             tx, ys + rh + 66, { size: fs(13), align: 'left', color: K.ACC });
      TX.put('\\tan\\alpha = \\dfrac{' + fmt(R.ns, 1) + '}{' + fmt(R.ew, 1) + '} = ' +
             fmt(R.ns / R.ew, 2) + ' \\qquad \\boldsymbol{\\alpha = ' + fmt(R.ang, 1) + '^\\circ}',
             tx, ys + rh + 112, { size: fs(13), align: 'left', color: K.ACC });
    }
  }

  u.ctl.className = 'ictls g2';
  var ss = slider(u.ctl, 'Step', 1, 6, 1, S.step, function (v) { return fmt(v, 0) + ' of 6'; },
                  function (v) { S.step = Math.round(v); draw(); });
  ss.quiet(S.step);
  var rd = readout(u.ctl);
  rd.innerHTML = 'Resolve each vector, add the N-S column and the E-W column, then ' +
    'combine the two sums. The resultant is <b>682.1 km at 51.3° north of east</b>.';
  node._draw = draw;
  draw();
});

/* ======================================================================
   6. BOLT — average acceleration over shorter and shorter sections

   Source slides 85 to 92.  The same race three ways: one average over the
   whole 100 m (1.23 m/s²), one over each half (1.65 and 0.68), and one over
   each 10 m split.  Each bar spans the time its section took, so the shape
   of the run appears as the sections shorten — which is slide 87's point
   about t2 − t1 getting closer to 0.
   ====================================================================== */
D.register('bolt', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { kind: 'splits' };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 560 : 360,
                            padl: port ? 58 : 70, padr: port ? 16 : 300,
                            padt: 24, padb: 56, fluid: true,
                            xmin: 0, xmax: 10, ymin: -1.5, ymax: 4.6 });

  function draw() {
    var K = C(), c = ax.c, sec = boltSections(S.kind);
    ax.clear();
    ax.frame({ xticks: [0, 2, 4, 6, 8, 10], yticks: [-1, 0, 1, 2, 3, 4], grid: true,
               zero: true, ylabel: 'average acceleration (m/s²)' });
    label(c, 'time (s)', (ax.pl + ax.W - ax.pr) / 2, ax.H - 12, { size: fs(13), weight: 700 });
    sec.forEach(function (s) {
      var x0 = ax.X(s.t0), x1 = ax.X(s.t1), y0 = ax.Y(0), y1 = ax.Y(s.a);
      c.save(); c.fillStyle = s.a >= 0 ? K.FILL2 : K.ACCFILL;
      c.fillRect(x0 + 1, Math.min(y0, y1), x1 - x0 - 2, Math.abs(y1 - y0));
      c.strokeStyle = s.a >= 0 ? K.BLUE : K.ACC; c.lineWidth = 1.6;
      c.strokeRect(x0 + 1, Math.min(y0, y1), x1 - x0 - 2, Math.abs(y1 - y0));
      c.restore();
      label(c, num(s.a, 2), (x0 + x1) / 2, s.a >= 0 ? y1 - 11 : y1 + 12,
            { size: fs(sec.length > 4 ? 11 : 14), weight: 750, color: s.a >= 0 ? K.BLUE : K.ACC });
    });
    /* the list beside it */
    var px = port ? ax.pl : ax.W - ax.pr + 34, py = port ? ax.H + 10 : 40;
    if (!port) {
      label(c, { whole: 'the whole race', halves: 'the two halves',
                 splits: 'each 10 m section' }[S.kind], px, py,
            { size: fs(14), align: 'left', weight: 750 });
      sec.forEach(function (s, k) {
        label(c, s.lab, px, py + 34 + k * 26, { size: fs(12.5), align: 'left', color: K.MUT });
        label(c, num(s.a, 2) + ' m/s²', px + 236, py + 34 + k * 26,
              { size: fs(12.5), align: 'right', weight: 700, color: s.a >= 0 ? K.BLUE : K.ACC });
      });
    }
  }

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  seg(row, [['whole', 'The whole race'], ['halves', 'Two halves'],
            ['splits', 'Every 10 m']], 'splits', function (v) { S.kind = v; draw(); });
  keepOut(row);
  var rd = readout(u.ctl);
  rd.innerHTML = 'One average says 1.23 m/s². Two say he accelerated harder in the first ' +
    'half. Ten show <b>where</b>: hardest in the first 20 m, close to zero from 60 to ' +
    '80 m, and negative at the finish.';
  node._draw = draw;
  draw();
});

/* ======================================================================
   ANIMATED FIGURES — Marc's review, 28 Oct

   These are the slides' own SVG figures, set moving.  The figure as drawn
   in slides/figs*.py is what prints and what shows before the slide opens;
   an svg with data-anim="name" is handed to AN[name] when its slide comes
   up and put back exactly as it was when the slide goes.  Pieces that only
   exist while it plays are marked data-hide; the drawn frame that the live
   one replaces is marked data-static (theme.css hides one or the other on
   svg.anim-on).

     pointlight   slide 4    the measured stride as twelve dots, on the spot
     along        9, 26-28, 76-79   a dot travels a route; optional trace,
                             distance count and a reveal at the end
     grow         12, 18     the spreadsheet fills a row at a time and the
                             graphs grow with it; 18's 3D plot turns
     polar        15         each point built from r then θ, then draggable
     imagewalk    16         the walker crosses the frame, leaving a pale
                             figure every fifth of a stride, its centre of
                             mass read out in pixels
     box3d        17         drag the point, or its shadow on the floor
     mocap        19         two lines of sight follow the marker
     comp         43-63      components grow from the tail, or slide across
                             to the tip to close the triangle
   and the SOH-CAH-TOA buttons on 47 and 48, which light two sides each.

   Click a figure to play it again.
   ====================================================================== */
var SVGNS = 'http://www.w3.org/2000/svg';
var V_INK = 'var(--ink)', V_MUT = 'var(--muted)', V_ACC = 'var(--accent)',
    V_BLU = 'var(--brand)', V_GRN = 'var(--good)', V_VIO = 'var(--violet)',
    V_FILL = 'var(--chip)', V_SURF = 'var(--surface-solid)';
var PRINT = /print-pdf/i.test(location.search);
var CALM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function sv(tag, at, parent) {
  var e = document.createElementNS(SVGNS, tag);
  for (var k in at) if (at[k] != null) e.setAttribute(k, at[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
function pathD(pts) {
  return pts.map(function (p, i) { return (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1]); }).join(' ');
}
function svLine(g, pts, w, col, dash, op) {
  return sv('path', { d: pathD(pts), fill: 'none', stroke: col || V_INK, 'stroke-width': w,
                      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
                      'stroke-dasharray': dash || null, opacity: op == null ? null : op }, g);
}
function svDot(g, p, r, col) { return sv('circle', { cx: f1(p[0]), cy: f1(p[1]), r: r, fill: col || V_INK }, g); }
function svRing(g, p, r, col, w, fill) {
  return sv('circle', { cx: f1(p[0]), cy: f1(p[1]), r: r, fill: fill || 'none',
                        stroke: col || V_INK, 'stroke-width': w || 2 }, g);
}
/* the figure's label scale (svg.py, tscale.json) applies to text drawn live too */
function tsOf(g) { var s = g.ownerSVGElement || g; return +(s.getAttribute('data-ts') || 1); }
function svText(g, x, y, s, o) {
  o = o || {};
  var t = sv('text', { x: f1(x), y: f1(y), 'text-anchor': o.anchor || 'middle',
                       'font-size': f1((o.size || 10.5) * tsOf(g)), 'font-weight': o.weight || 650,
                       fill: o.col || V_MUT, 'font-style': o.italic ? 'italic' : null }, g);
  if (o.halo) { t.setAttribute('stroke', V_SURF); t.setAttribute('stroke-width', 4);
                t.setAttribute('stroke-linejoin', 'round'); t.setAttribute('paint-order', 'stroke'); }
  t.textContent = s;
  return t;
}
/* the same arrow geometry as svg.py's vec() */
function vecGeom(x0, y0, x1, y1, head) {
  var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  var ux = dx / L, uy = dy / L, h = Math.min(head, L * 0.6);
  var bx = x1 - ux * h, by = y1 - uy * h, px = -uy, py = ux;
  return { line: 'M' + f1(x0) + ' ' + f1(y0) + ' L' + f1(bx) + ' ' + f1(by),
           head: 'M' + f1(x1) + ' ' + f1(y1) + ' L' + f1(bx + px * h * .5) + ' ' + f1(by + py * h * .5) +
                 ' L' + f1(bx - px * h * .5) + ' ' + f1(by - py * h * .5) + ' Z', len: L };
}
function svVec(g, x0, y0, x1, y1, col, w, head, dash) {
  var q = vecGeom(x0, y0, x1, y1, head || 8);
  sv('path', { d: q.line, fill: 'none', stroke: col || V_INK, 'stroke-width': w || 3,
               'stroke-linecap': 'round', 'stroke-dasharray': dash || null }, g);
  sv('path', { d: q.head, fill: col || V_INK }, g);
}
/* an arc, screen angles in degrees, clockwise positive, as svg.py's arc() */
function svArc(g, cx, cy, r, a0, a1, col, head, w) {
  var t0 = a0 * Math.PI / 180, t1 = a1 * Math.PI / 180;
  var x0 = cx + r * Math.cos(t0), y0 = cy + r * Math.sin(t0);
  var x1 = cx + r * Math.cos(t1), y1 = cy + r * Math.sin(t1);
  var large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 > a0 ? 1 : 0;
  if (Math.abs(a1 - a0) < 0.5) return;
  sv('path', { d: 'M' + f1(x0) + ' ' + f1(y0) + ' A' + f1(r) + ' ' + f1(r) + ' 0 ' + large + ' ' +
               sweep + ' ' + f1(x1) + ' ' + f1(y1), fill: 'none', stroke: col,
               'stroke-width': w || 2, 'stroke-linecap': 'round' }, g);
  if (head) {
    var tt = t1 + (sweep ? Math.PI / 2 : -Math.PI / 2), hx = Math.cos(tt), hy = Math.sin(tt);
    var px = -hy, py = hx, s = 5.5;
    sv('path', { d: 'M' + f1(x1 + hx * s) + ' ' + f1(y1 + hy * s) +
                 ' L' + f1(x1 - hx * s * .2 + px * s * .62) + ' ' + f1(y1 - hy * s * .2 + py * s * .62) +
                 ' L' + f1(x1 - hx * s * .2 - px * s * .62) + ' ' + f1(y1 - hy * s * .2 - py * s * .62) + ' Z',
                 fill: col }, g);
  }
}
function clear(g) { while (g && g.firstChild) g.removeChild(g.firstChild); }
function q1(svg, sel) { return svg.querySelector(sel); }
function qa(svg, sel) { return Array.prototype.slice.call(svg.querySelectorAll(sel)); }
function toView(svg, ev) {
  var p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
  var m = svg.getScreenCTM();
  return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 };
}
function ease(p) { return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

/* a clock: onFrame(p in 0..1, elapsed s) for dur seconds, then onDone */
function clock(dur, onFrame, onDone) {
  var t0 = null, id = 0, dead = false;
  if (CALM) dur = 0.01;
  function tick(ts) {
    if (dead) return;
    if (t0 === null) t0 = ts;
    var e = (ts - t0) / 1000, p = Math.min(1, e / dur);
    onFrame(p, e);
    if (p < 1) id = requestAnimationFrame(tick);
    else if (onDone) onDone();
  }
  id = requestAnimationFrame(tick);
  return function () { dead = true; cancelAnimationFrame(id); };
}
/* a sequence of timed steps; returns a cancel */
function later(ms, fn) { var id = setTimeout(fn, CALM ? 0 : ms); return function () { clearTimeout(id); }; }

/* ---------------- the measured stride ---------------- */
var WK = DA.walk, WJ = WK.j, WNJ = WJ.length, WN = WK.n, WP = WK.P;
var W_FPS = (WN - 1) / WK.stride;               /* frames per second, real time */
function wraw(f, name) {
  var i = (f * WNJ + WJ.indexOf(name)) * 3;
  return [WP[i], WP[i + 1], WP[i + 2]];
}
var W_STRIDE = wraw(WN - 1, 'pelvis')[0] - wraw(0, 'pelvis')[0];
/* any frame, fractional, and past the end of the stride: the next stride is
   the same one moved forward by a stride length */
function wat(f, name) {
  var m = Math.floor(f / (WN - 1)), fr = f - m * (WN - 1);
  var i0 = Math.min(WN - 2, Math.floor(fr)), t = fr - i0;
  var a = wraw(i0, name), b = wraw(i0 + 1, name);
  return [a[0] + (b[0] - a[0]) * t + m * W_STRIDE, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
var W_NAMES = ['head', 'neck', 'pelvis', 'shR', 'elR', 'wrR', 'shL', 'elL', 'wrL', 'kneeL', 'ankL',
               'toeL', 'kneeR', 'ankR', 'toeR', 'hipL', 'hipR'];
function wside(f, ox, oy, k, dx) {
  var out = {};
  W_NAMES.forEach(function (n) { var p = wat(f, n); out[n] = [ox + (p[0] - dx) * k, oy - p[2] * k]; });
  return out;
}
function wwalker(g0, pts, col, w, alpha, near) {
  near = near || 'R';
  var far = near === 'R' ? 'L' : 'R';
  var g = sv('g', { opacity: alpha == null ? 1 : alpha }, g0);
  [[far, 0.35], [near, 1]].forEach(function (sa) {
    var s = sa[0], gg = sv('g', { opacity: sa[1] }, g);
    [['sh', 'el'], ['el', 'wr'], ['knee', 'ank'], ['ank', 'toe']].forEach(function (ab) {
      svLine(gg, [pts[ab[0] + s], pts[ab[1] + s]], w, col);
    });
    svLine(gg, [pts.pelvis, pts['knee' + s]], w, col);
    svLine(gg, [pts.neck, pts['sh' + s]], w, col);
  });
  svLine(g, [pts.neck, pts.pelvis], w * 1.25, col);
  var hx = pts.head[0] + (pts.neck[0] - pts.head[0]) * 0.36;
  var hy = pts.head[1] + (pts.neck[1] - pts.head[1]) * 0.36;
  svRing(g, [hx, hy], 0.30 * Math.abs(pts.neck[1] - pts.head[1]), col, w * 0.8, V_FILL);
  return g;
}
/* whole-body centre of mass from segment proportions (Dempster, as tabled
   by Winter): mass fraction, and where along the segment its centre sits */
var COM_SEG = [['head', 'neck', 0.50, 0.081], ['neck', 'pelvis', 0.50, 0.497],
  ['shR', 'elR', 0.436, 0.028], ['shL', 'elL', 0.436, 0.028],
  ['elR', 'wrR', 0.682, 0.022], ['elL', 'wrL', 0.682, 0.022],
  ['hipR', 'kneeR', 0.433, 0.100], ['hipL', 'kneeL', 0.433, 0.100],
  ['kneeR', 'ankR', 0.433, 0.0465], ['kneeL', 'ankL', 0.433, 0.0465],
  ['ankR', 'toeR', 0.50, 0.0145], ['ankL', 'toeL', 0.50, 0.0145]];
function wcom(pts) {
  var x = 0, y = 0, m = 0;
  COM_SEG.forEach(function (s) {
    var a = pts[s[0]], b = pts[s[1]];
    x += s[3] * (a[0] + (b[0] - a[0]) * s[2]); y += s[3] * (a[1] + (b[1] - a[1]) * s[2]); m += s[3];
  });
  return [x / m, y / m];
}

var AN = {};

/* ---------------- slide 4: the point-light walker, on the spot ---------- */
var PL_DOTS = ['head', 'shR', 'shL', 'elR', 'elL', 'wrR', 'wrL', 'pelvis',
               'kneeR', 'kneeL', 'ankR', 'ankL'];
AN.pointlight = function (svg) {
  var live = q1(svg, '[data-live]'), d = svg.dataset;
  var k = +d.k, ox = +d.ox, oy = +d.oy, id = 0, t0 = 0;
  /* walk on the spot: take away the average forward speed, not the pelvis
     itself, so the body still surges and lags a little within the stride */
  var c = 0;
  for (var f = 0; f < WN - 1; f++) c += wraw(f, 'pelvis')[0] - W_STRIDE * f / (WN - 1);
  c /= (WN - 1);
  function frame(ts) {
    if (!t0) t0 = ts;
    var f = ((ts - t0) / 1000 * W_FPS) % (WN - 1);
    var pts = wside(f, ox, oy, k, c + W_STRIDE * f / (WN - 1));
    clear(live);
    wwalker(live, pts, V_MUT, 1.4, 0.16);
    PL_DOTS.forEach(function (n) { svDot(live, pts[n], 4.6, V_INK); });
    id = requestAnimationFrame(frame);
  }
  return {
    start: function () { this.stop(); svg.classList.add('anim-on'); t0 = 0; id = requestAnimationFrame(frame); },
    stop: function () { cancelAnimationFrame(id); clear(live); svg.classList.remove('anim-on'); }
  };
};

/* ---------------- along a route: the track, the GPS trace -------------- */
AN.along = function (svg) {
  var d = svg.dataset, route = q1(svg, '[data-route]'), mover = q1(svg, '[data-mover]');
  var trace = q1(svg, '[data-trace]'), after = qa(svg, '[data-after]'), count = q1(svg, '[data-count]');
  var gps = qa(svg, '[data-gps]'), L = 0, cancel = null, wait = null;
  var home = [mover.getAttribute('cx'), mover.getAttribute('cy')];
  var text0 = gps.map(function (t) { return t.textContent; });
  function set(p) {
    var pt = route.getPointAtLength(L * p);
    mover.setAttribute('cx', f1(pt.x)); mover.setAttribute('cy', f1(pt.y));
    if (trace) { trace.style.strokeDasharray = L + ' ' + L; trace.style.strokeDashoffset = L * (1 - p); }
    if (count) count.textContent = Math.round(p * +count.dataset.count) + (count.dataset.unit || '');
    gps.forEach(function (t) {
      var k = t.dataset.gps;
      if (k === 'speed') t.textContent = (p > 0 && p < 1 ? '0' + (7.4 + 0.6 * Math.sin(p * 19)).toFixed(1) : '00.0') + ' mi/hr';
      if (k === 'lat') t.textContent = '+' + (48.4073 + 0.0021 * (p - 1)).toFixed(4);
      if (k === 'lon') t.textContent = '−' + (123.1300 + 0.0034 * (1 - p)).toFixed(4);
    });
  }
  function run() {
    if (cancel) cancel();
    L = route.getTotalLength();
    after.forEach(function (a) { a.style.transition = 'none'; a.style.opacity = 0; });
    set(0);
    cancel = clock(+d.dur || 4, set, function () {
      after.forEach(function (a) { a.style.transition = 'opacity .5s'; a.style.opacity = 1; });
      if (d.loop) wait = later(2200, run);
    });
  }
  function reset() {
    if (cancel) cancel(); if (wait) wait(); cancel = wait = null;
    mover.setAttribute('cx', home[0]); mover.setAttribute('cy', home[1]);
    if (trace) { trace.style.strokeDasharray = ''; trace.style.strokeDashoffset = ''; }
    if (count) count.textContent = '0' + (count.dataset.unit || '');
    after.forEach(function (a) { a.style.transition = ''; a.style.opacity = ''; });
    gps.forEach(function (t, i) { t.textContent = text0[i]; });
    svg.classList.remove('anim-on');
  }
  return {
    start: function () { reset(); svg.classList.add('anim-on'); wait = later(350, run); },
    stop: reset
  };
};

/* ---------------- a growing spreadsheet and its graphs ----------------- */
AN.grow = function (svg) {
  var d = svg.dataset, n = +d.n, cancel = null, wait = null, rock = 0;
  var rows = qa(svg, '[data-k]'), grows = qa(svg, '[data-grow]');
  var full = grows.map(function (g) { return g.getAttribute('d'); });
  var pts = grows.map(function (g) {
    return g.getAttribute('data-grow').split(' ').map(function (s) { return s.split(',').map(Number); });
  });
  /* the 3D plot on slide 18, re-projected so it can be turned */
  var xyz = d.xyz ? d.xyz.split(' ').map(function (s) { return s.split(',').map(Number); }) : null;
  var live = q1(svg, '[data-live]'), yaw = 0, kk = n, dragging = null, touched = false;
  function P(x, y, z) {
    var c = Math.cos(yaw), s = Math.sin(yaw), x2 = x * c - y * s, y2 = x * s + y * c;
    return [380 + x2 * 44 - y2 * 26, 132 - z * 40 + y2 * 18];
  }
  function draw3() {
    if (!xyz) return;
    clear(live);
    [[[-1.2, 0, 0], [1.3, 0, 0]], [[0, -1.2, 0], [0, 1.3, 0]], [[0, 0, -1.6], [0, 0, 1.7]]].forEach(function (ab) {
      var a = P.apply(null, ab[0]), b = P.apply(null, ab[1]);
      svVec(live, a[0], a[1], b[0], b[1], V_MUT, 1.2, 6);
    });
    var lx = P(1.45, 0, 0), ly = P(0, 1.45, 0), lz = P(0, 0, 1.85);
    svText(live, lx[0], lx[1], 'x', { col: V_INK, size: 9.5, anchor: 'start', weight: 700, italic: true });
    svText(live, ly[0] - 4, ly[1] + 8, 'y', { col: V_INK, size: 9.5, anchor: 'end', weight: 700, italic: true });
    svText(live, lz[0], lz[1], 'z', { col: V_INK, size: 9.5, weight: 700, italic: true });
    for (var i = 0; i < kk && i < xyz.length; i++) {
      var p = P(xyz[i][0], xyz[i][1], xyz[i][2]);
      if (i === kk - 1 && kk < n) svRing(live, p, 6, V_ACC, 1.4);
      svDot(live, p, 3, V_ACC);
    }
  }
  function set(kf) {
    kk = Math.max(0, Math.min(n, Math.floor(kf)));
    rows.forEach(function (e) {
      var i = +e.getAttribute('data-k');
      e.style.opacity = i < kk ? 1 : 0;
      e.classList.toggle('knew', i === kk - 1 && kk < n);
    });
    grows.forEach(function (g, j) {
      var q = pts[j].slice(0, kk);
      g.setAttribute('d', q.length > 1 ? pathD(q) : 'M0 0');
      g.style.opacity = q.length > 1 ? 1 : 0;
    });
    draw3();
  }
  function rockFrame(ts) {
    if (!touched) { yaw = 0.42 * Math.sin(ts / 1000 * 2 * Math.PI / 9); draw3(); }
    rock = requestAnimationFrame(rockFrame);
  }
  function run() {
    if (cancel) cancel();
    set(0);
    cancel = clock(+d.dur || 6, function (p) { set(p * n + 0.999); }, function () {
      set(n);
      if (xyz && !CALM) rock = requestAnimationFrame(rockFrame);
    });
  }
  function reset() {
    if (cancel) cancel(); if (wait) wait(); cancel = wait = null;
    cancelAnimationFrame(rock); yaw = 0; touched = false; kk = n;
    rows.forEach(function (e) { e.style.opacity = ''; e.classList.remove('knew'); });
    grows.forEach(function (g, j) { g.setAttribute('d', full[j]); g.style.opacity = ''; });
    if (live) clear(live);
    svg.classList.remove('anim-on');
  }
  if (xyz) {
    svg.addEventListener('pointerdown', function (ev) {
      var v = toView(svg, ev);
      if (v.x < 318 || !svg.classList.contains('anim-on')) return;
      dragging = { x: ev.clientX, yaw: yaw }; touched = true;
      svg.setPointerCapture(ev.pointerId); ev.preventDefault(); ev.stopPropagation();
    });
    svg.addEventListener('pointermove', function (ev) {
      if (!dragging) return;
      yaw = dragging.yaw + (ev.clientX - dragging.x) * 0.012; draw3();
    });
    svg.addEventListener('pointerup', function () { dragging = null; });
    svg.setAttribute('data-prevent-swipe', '');
  }
  return {
    start: function () { reset(); if (xyz) svg.classList.add('anim-on'); set(0); wait = later(300, run); },
    stop: reset,
    replayOk: function (ev) { return !xyz || toView(svg, ev).x < 318; }
  };
};

/* ---------------- slide 15: what a polar coordinate is ------------------ */
AN.polar = function (svg) {
  var d = svg.dataset, live = q1(svg, '[data-live]');
  var ox = +d.ox, oy = +d.oy, k = +d.k, cancel = null, wait = null, drag = null, ready = false;
  var P0 = [{ r: 3, th: 60, col: V_GRN }, { r: 4, th: 210, col: V_ACC }];
  var S = [];
  function xy(r, th) { var t = th * Math.PI / 180; return [ox + r * k * Math.cos(t), oy - r * k * Math.sin(t)]; }
  function draw() {
    clear(live);
    var grid = sv('g', { opacity: .55 }, live);
    for (var r = 1; r <= 4; r++) svRing(grid, [ox, oy], r * k, 'var(--rule)', 1);
    for (var a = 0; a < 360; a += 30) {
      if (a === 0 || a === 180) continue;
      var e = xy(4.25, a);
      svLine(grid, [[ox, oy], e], 0.8, 'var(--rule)');
      var lp = xy(4.75, a);
      svText(grid, lp[0], lp[1] + 3, a + '°', { size: 7.5, col: V_MUT, weight: 600 });
    }
    svVec(live, 20, oy, 290, oy, V_INK, 1.6, 8);
    svText(live, 294, oy + 4, 'L', { col: V_INK, size: 11, anchor: 'start', weight: 700, italic: true });
    svDot(live, [ox, oy], 3.5, V_INK);
    svText(live, ox - 2, oy + 16, '0', { size: 10 });
    svText(live, ox + k, oy + 16, '1', { size: 10 });
    svLine(live, [[ox + k, oy - 3], [ox + k, oy + 3]], 1.4, V_INK);
    S.forEach(function (s, i) {
      if (s.rp <= 0) return;
      var r = s.r * Math.min(1, s.rp), th = s.th * Math.max(0, Math.min(1, s.ap));
      var p = xy(r, th);
      if (s.ap > 0 && s.ap < 1) {
        /* the point sweeps round its own circle */
        svArc(live, ox, oy, s.r * k, 0, -th, s.col, false, 1.2);
      }
      svLine(live, [[ox, oy], p], 3, s.col);
      if (s.ap > 0 && th > 0.5) svArc(live, ox, oy, 22 + i * 12, 0, -th, V_BLU, true, 1.7);
      var dot = svDot(live, p, 5, s.col);
      var mid = xy(r / 2, th);
      var nrm = (th + 90) * Math.PI / 180;
      svText(live, mid[0] + 9 * Math.cos(nrm), mid[1] - 9 * Math.sin(nrm) + 4, 'r',
             { col: s.col, size: 11, weight: 700, italic: true, halo: true });
      if (s.ap >= 1 || ready) {
        var right = Math.cos(th * Math.PI / 180) >= -0.2;
        svText(live, p[0] + (right ? 10 : -8), p[1] + (p[1] < oy ? -8 : 16),
               '(' + (Math.round(s.r * 10) / 10) + ', ' + Math.round(s.th) + '°)',
               { col: s.col, size: 11.5, anchor: right ? 'start' : 'end', weight: 700, halo: true });
      }
      if (ready) {
        var hit = svDot(live, p, 13, 'transparent');
        hit.setAttribute('data-drag', i);
        hit.style.pointerEvents = 'all';
      }
    });
  }
  function run() {
    S = P0.map(function (p) { return { r: p.r, th: p.th, col: p.col, rp: 0, ap: 0 }; });
    ready = false;
    var T = [[0, 0.9], [0.9, 2.1], [2.4, 3.3], [3.3, 4.7]];
    cancel = clock(4.7, function (p, e) {
      if (CALM) e = 99;
      S[0].rp = ease(Math.max(0, Math.min(1, (e - T[0][0]) / (T[0][1] - T[0][0]))));
      S[0].ap = ease(Math.max(0, Math.min(1, (e - T[1][0]) / (T[1][1] - T[1][0]))));
      S[1].rp = ease(Math.max(0, Math.min(1, (e - T[2][0]) / (T[2][1] - T[2][0]))));
      S[1].ap = ease(Math.max(0, Math.min(1, (e - T[3][0]) / (T[3][1] - T[3][0]))));
      draw();
    }, function () { ready = true; draw(); });
  }
  svg.addEventListener('pointerdown', function (ev) {
    var t = ev.target;
    if (!ready || !t.hasAttribute('data-drag')) return;
    drag = +t.getAttribute('data-drag');
    svg.setPointerCapture(ev.pointerId); ev.preventDefault(); ev.stopPropagation();
  });
  svg.addEventListener('pointermove', function (ev) {
    if (drag === null) return;
    var v = toView(svg, ev), dx = v.x - ox, dy = oy - v.y;
    var r = Math.max(0.3, Math.min(4.4, Math.hypot(dx, dy) / k));
    var th = Math.atan2(dy, dx) * 180 / Math.PI; if (th < 0) th += 360;
    S[drag].r = Math.round(r * 10) / 10; S[drag].th = Math.round(th);
    draw();
  });
  svg.addEventListener('pointerup', function () { drag = null; });
  svg.setAttribute('data-prevent-swipe', '');
  function reset() {
    if (cancel) cancel(); if (wait) wait(); cancel = wait = null; drag = null; ready = false;
    clear(live); svg.classList.remove('anim-on');
  }
  return {
    start: function () { reset(); svg.classList.add('anim-on'); S = []; draw(); wait = later(300, run); },
    stop: reset,
    replayOk: function (ev) { return !ev.target.hasAttribute('data-drag'); }
  };
};

/* ---------------- slide 16: across the frame, in pixels ----------------- */
AN.imagewalk = function (svg) {
  var d = svg.dataset, live = q1(svg, '[data-live]');
  var k = +d.k, ox = +d.ox, oy = +d.oy, px = +d.px, cancel = null, wait = null;
  var X0 = 14, Y0 = 22;                    /* the image origin, top left */
  function draw(f) {
    clear(live);
    for (var g = 0; g <= f - 12 + 1e-6; g += 12) wwalker(live, wside(g, ox, oy, k, 0), V_INK, 1.8, 0.28);
    var pts = wside(f, ox, oy, k, 0);
    wwalker(live, pts, V_INK, 1.8, 1);
    var c = wcom(pts);
    svLine(live, [[c[0], Y0], c], 1, V_ACC, '3 3');
    svLine(live, [[X0, c[1]], c], 1, V_ACC, '3 3');
    svRing(live, c, 6, V_ACC, 1.6, V_SURF);
    svDot(live, c, 2.6, V_ACC);
    var xp = Math.round((c[0] - X0) * px), yp = Math.round((c[1] - Y0) * px);
    svText(live, c[0] + 10, c[1] - 9, '(' + xp + ', ' + yp + ') px',
           { col: V_ACC, size: 10, anchor: 'start', weight: 750, halo: true });
    svText(live, c[0] + 10, c[1] + 4, 'centre of mass', { col: V_ACC, size: 7.5, anchor: 'start', weight: 650, halo: true });
  }
  function run() {
    cancel = clock((WN - 1) / W_FPS * 2.6, function (p) { draw(p * (WN - 1)); },
                   function () { wait = later(2000, run); });
  }
  function reset() {
    if (cancel) cancel(); if (wait) wait(); cancel = wait = null;
    clear(live); svg.classList.remove('anim-on');
  }
  return {
    start: function () { reset(); svg.classList.add('anim-on'); draw(0); wait = later(300, run); },
    stop: reset
  };
};

/* ---------------- slide 17: drag the point and its box follows ---------- */
AN.box3d = function (svg) {
  var live = q1(svg, '[data-live]'), S = { x: 3, y: 2, z: 4 }, drag = null, cancel = null, wait = null;
  function P(x, y, z) { return [110 + x * 40 - z * 21, 190 - y * 40 + z * 15.5]; }
  function nm(v) { return (Math.round(v * 2) / 2).toString(); }
  function draw() {
    clear(live);
    var x = S.x, y = S.y, z = S.z;
    var E = [[[0, 0, z], [x, 0, z]], [[x, 0, 0], [x, 0, z]], [[x, 0, z], [x, y, z]],
             [[0, y, 0], [x, y, 0]], [[x, 0, 0], [x, y, 0]], [[0, y, 0], [0, y, z]],
             [[0, y, z], [x, y, z]], [[x, y, 0], [x, y, z]], [[0, 0, z], [0, y, z]]];
    E.forEach(function (e) { svLine(live, [P.apply(null, e[0]), P.apply(null, e[1])], 1.4, V_BLU, '5 3'); });
    var sh = P(x, 0, z), p = P(x, y, z);
    svRing(live, sh, 4.5, V_BLU, 1.6, V_SURF);
    svDot(live, p, 5, V_ACC);
    svText(live, p[0] + 8, p[1] - 6, '(' + nm(x) + ', ' + nm(y) + ', ' + nm(z) + ')',
           { col: V_ACC, size: 11, anchor: 'start', weight: 700, halo: true });
    var a = P(x / 2, 0, 0), b = P(0, y / 2, 0), c = P(x, 0, z / 2);
    if (x > 0.2) svText(live, a[0], a[1] + 14, nm(x) + ' m', { col: V_BLU, size: 10, weight: 700, halo: true });
    if (y > 0.2) svText(live, b[0] - 6, b[1] + 4, nm(y) + ' m', { col: V_BLU, size: 10, anchor: 'end', weight: 700, halo: true });
    if (z > 0.2) svText(live, c[0] + 8, c[1] + 10, nm(z) + ' m', { col: V_BLU, size: 10, anchor: 'start', weight: 700, halo: true });
    var h1 = svDot(live, p, 14, 'transparent'); h1.setAttribute('data-drag', 'xy'); h1.style.pointerEvents = 'all';
    var h2 = svDot(live, sh, 12, 'transparent'); h2.setAttribute('data-drag', 'xz'); h2.style.pointerEvents = 'all';
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(v * 2) / 2)); }
  svg.addEventListener('pointerdown', function (ev) {
    var t = ev.target;
    if (!t.hasAttribute('data-drag')) return;
    if (cancel) { cancel(); cancel = null; }
    drag = t.getAttribute('data-drag');
    svg.setPointerCapture(ev.pointerId); ev.preventDefault(); ev.stopPropagation();
  });
  svg.addEventListener('pointermove', function (ev) {
    if (!drag) return;
    var v = toView(svg, ev);
    if (drag === 'xy') {
      S.x = clamp((v.x - 110 + S.z * 21) / 40, 0, 5);
      S.y = clamp((190 + S.z * 15.5 - v.y) / 40, 0, 4);
    } else {
      S.z = clamp((v.y - 190) / 15.5, 0, 6);
      S.x = clamp((v.x - 110 + S.z * 21) / 40, 0, 5);
    }
    draw();
  });
  svg.addEventListener('pointerup', function () { drag = null; });
  svg.setAttribute('data-prevent-swipe', '');
  function reset() {
    if (cancel) cancel(); if (wait) wait(); cancel = wait = null; drag = null;
    S = { x: 3, y: 2, z: 4 }; clear(live); svg.classList.remove('anim-on');
  }
  return {
    start: function () {
      reset(); svg.classList.add('anim-on'); draw();
      /* a nudge, so it is plain that the box is live: out to (4, 3, 4) and back */
      wait = later(700, function () {
        cancel = clock(2.2, function (p) {
          var s = Math.sin(p * Math.PI);
          S.x = 3 + s; S.y = 2 + s; draw();
        }, function () { S = { x: 3, y: 2, z: 4 }; draw(); cancel = null; });
      });
    },
    stop: reset,
    replayOk: function () { return false; }
  };
};

/* ---------------- slide 19: the cameras follow the marker --------------- */
AN.mocap = function (svg) {
  var d = svg.dataset, live = q1(svg, '[data-live]'), id = 0, t0 = 0;
  var k = +d.k, ox = +d.ox, oy = +d.oy;
  var cams = d.cams.split(' ').map(function (s) { return s.split(',').map(Number); });
  /* one stride across the capture volume, pelvis from 130 to 130 + a stride */
  var dx0 = wraw(0, 'pelvis')[0] - (130 - ox) / k;
  var SLOW = 1.7, GAP = 0.35, PERIOD = (WN - 1) / W_FPS * SLOW + GAP;
  function frame(ts) {
    if (!t0) t0 = ts;
    var e = ((ts - t0) / 1000) % PERIOD, f = Math.min(WN - 1, e / SLOW * W_FPS);
    var pts = wside(f, ox, oy, k, dx0);
    clear(live);
    var fade = e > PERIOD - GAP ? Math.max(0, 1 - (e - (PERIOD - GAP)) / GAP) : Math.min(1, e / 0.2);
    var g = sv('g', { opacity: fade.toFixed(2) }, live);
    wwalker(g, pts, V_INK, 2.4);
    var m = pts.kneeR;
    cams.forEach(function (c) { svLine(g, [c, m], 1.6, V_ACC, '6 4'); });
    svDot(g, m, 6, V_ACC); svRing(g, m, 10, V_ACC, 1.6);
    svText(g, m[0] + 14, m[1] + 22, 'marker', { col: V_ACC, size: 11, anchor: 'start', weight: 700, halo: true });
    id = requestAnimationFrame(frame);
  }
  return {
    start: function () { this.stop(); svg.classList.add('anim-on'); t0 = 0; id = requestAnimationFrame(frame); },
    stop: function () { cancelAnimationFrame(id); clear(live); svg.classList.remove('anim-on'); }
  };
};

/* ---------------- slides 43-63: the components, drawn and moved --------- */
AN.comp = function (svg) {
  var step = svg.dataset.step, cancel = null, wait = null;
  var parts = {};
  qa(svg, '[data-c]').forEach(function (g) {
    var v = g.getAttribute('data-v').split(' ').map(Number), ps = g.querySelectorAll('path');
    parts[g.getAttribute('data-c')] = { g: g, v: v, h: +g.getAttribute('data-h'),
      dx: +(g.getAttribute('data-dx') || 0), line: ps[0], head: ps[1],
      d0: [ps[0].getAttribute('d'), ps[1].getAttribute('d')] };
  });
  function grow(c, p) {
    if (!c) return;
    if (p <= 0.02) { c.g.style.opacity = 0; return; }
    c.g.style.opacity = 1;
    var v = c.v, q = vecGeom(v[0], v[1], v[0] + (v[2] - v[0]) * p, v[1] + (v[3] - v[1]) * p, c.h);
    c.line.setAttribute('d', q.line); c.head.setAttribute('d', q.head);
  }
  function slide(c, p) { if (c) c.g.setAttribute('transform', 'translate(' + f1(c.dx * (1 - p)) + ' 0)'); }
  function plan() {
    /* [part, kind, start s, end s] */
    if (step === '2') return [['ns', 'grow', 0, 1.1]];
    if (step === '3') return [['ew', 'grow', 0, 1.1]];
    if (step === 'both') return [['ns', 'grow', 0, 1.0], ['ew', 'grow', 1.2, 2.2]];
    return [['ns2', 'slide', 0.2, 1.6]];
  }
  function run() {
    var P = plan(), end = P[P.length - 1][3];
    cancel = clock(end, function (p, e) {
      if (CALM) e = end;
      P.forEach(function (s) {
        var u = ease(Math.max(0, Math.min(1, (e - s[2]) / (s[3] - s[2]))));
        (s[1] === 'grow' ? grow : slide)(parts[s[0]], u);
      });
    });
  }
  function reset() {
    if (cancel) cancel(); if (wait) wait(); cancel = wait = null;
    Object.keys(parts).forEach(function (n) {
      var c = parts[n];
      c.line.setAttribute('d', c.d0[0]); c.head.setAttribute('d', c.d0[1]);
      c.g.style.opacity = ''; c.g.removeAttribute('transform');
    });
  }
  return {
    start: function () {
      reset();
      plan().forEach(function (s) { (s[1] === 'grow' ? grow : slide)(parts[s[0]], 0); });
      wait = later(450, run);
    },
    stop: reset
  };
};

/* ---------------- the manager ---------------- */
function animsOf(sec) {
  return sec ? Array.prototype.slice.call(sec.querySelectorAll('svg[data-anim]')) : [];
}
function animStart(sec) {
  animsOf(sec).forEach(function (svg) {
    var n = svg.getAttribute('data-anim');
    if (!AN[n]) return;
    try {
      if (!svg._an) {
        svg._an = AN[n](svg);
        svg.addEventListener('click', function (ev) {
          if (svg._an.replayOk && !svg._an.replayOk(ev)) return;
          svg._an.start();
        });
      }
      svg._an.start();
    } catch (e) { console.error('animation', n, e); }
  });
}
function animStop(sec) {
  animsOf(sec).forEach(function (svg) { if (svg._an) try { svg._an.stop(); } catch (e) {} });
}

/* SOH-CAH-TOA: each button lights the two sides it uses */
function trigInit() {
  Array.prototype.forEach.call(document.querySelectorAll('.trigbtns'), function (row) {
    row.setAttribute('data-prevent-swipe', '');
    var sec = row.closest('section');
    var svg = sec && sec.querySelector('svg[data-fig="' + row.getAttribute('data-for') + '"]');
    if (!svg) return;
    var btns = Array.prototype.slice.call(row.querySelectorAll('.trigb'));
    btns.forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var on = !b.classList.contains('on');
        btns.forEach(function (x) { x.classList.remove('on'); });
        svg.classList.toggle('hl', on);
        var want = on ? b.getAttribute('data-sides').split(' ') : [];
        Array.prototype.forEach.call(svg.querySelectorAll('[data-side]'), function (s) {
          s.classList.toggle('on', want.indexOf(s.getAttribute('data-side')) >= 0);
        });
        if (on) b.classList.add('on');
      });
    });
  });
}

if (!PRINT && window.Reveal) {
  var go = function () {
    trigInit();
    Reveal.on('slidechanged', function (ev) { animStop(ev.previousSlide); animStart(ev.currentSlide); });
    animStart(Reveal.getCurrentSlide());
  };
  if (Reveal.isReady && Reveal.isReady()) go(); else Reveal.on('ready', go);
}
window.IB_ANIM = { AN: AN, start: animStart, stop: animStop, wcom: wcom, wat: wat, W_STRIDE: W_STRIDE };

/* the figures' own arithmetic, for parts/selftest.js */
window.IB = { trackPos: trackPos, runState: runState, TRACK: TRACK,
              compassWord: compassWord, resolveV: resolveV, composeV: composeV,
              composeRounded: composeRounded, boltSections: boltSections,
              EX_TT: EX_TT, EX_VS: EX_VS, RAD: RAD, DEG: DEG };
D.boot();
})();
