/* ======================================================================
   EPHE 341 — Dynamic Analysis (lecture 20)

   Last week every equation had zero on the right-hand side.  This week the
   zeros become ma and Iα, and the free body diagram, the force table and
   the sign conventions are all unchanged.  That is the whole lecture in a
   sentence, and the first figure is built to say exactly that: one segment,
   one switch, statics on the left of it and dynamics on the right.

   The worked example is the ankle and the knee during the swing phase of
   walking, and every line of it reproduces to the digit — 10.52 N, 3.70 N,
   0.39 N·m, 10.41 N, 24.53 N, 1.71 N·m.  Example 2 is the same two
   segments in stance, with a ground reaction force under the foot.

   The `moments4` figure is the one slides 23, 24 and 27 are building
   towards: four moments on every segment — one at each end and one about
   the centre of gravity from each end's force — adding to Iα, with the
   proximal one always the unknown.

   And then the method is run on a measured stride, from markers and a force
   plate, and checked against the joint moments the people who recorded it
   published for the same stride.  The shape comes back (r = 0.99 at the
   ankle), the timing comes back, the magnitude runs high — which is the
   honest size of the gap between two reasonable pipelines, and the subject
   of the limitations slide.

   The `dynstat` figure asks when the inertial terms actually matter.
   Turning every ma and Iα term off changes the ankle's push-off peak by
   0.06 %, because the ground force dwarfs an 800 g foot.  In swing it is
   the other way round: with no external force at all, the equilibrium
   answer gets the knee moment's sign wrong — and the worked example lives
   in swing.

   parts/selftest.js checks every number against the values computed
   independently in Python (scratchpad/dy20/mkdy20.py and core.py).
   ====================================================================== */
(function () {
'use strict';

var D = window.DECK;
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

/* ======================================================================
   The segment silhouettes, for canvas.

   GENERATED by slides/mksil.py from the outlines in slides/figs.py, which
   the slide SVGs draw from.  Do not edit by hand -- edit figs.py and run
   `python3 slides/mksil.py`.

   Coordinates are in SEGMENT space: x from 0 at the proximal joint to 1 at
   the distal end, y perpendicular and positive on the shin/knee side.
   ====================================================================== */
var SIL = {
  foot: [["M", 0.06, 0.38], ["L", -0.12, 0.36], ["Q", -0.3, 0.32, -0.34, 0.12], ["L", -0.38, -0.06], ["Q", -0.4, -0.18, -0.26, -0.19], ["L", 0.88, -0.21], ["Q", 1.1, -0.21, 1.15, -0.15], ["Q", 1.17, -0.09, 1.01, -0.06], ["L", 0.6, 0.02], ["Q", 0.36, 0.07, 0.22, 0.19], ["Q", 0.1, 0.29, 0.08, 0.38], ["Z"]],
  footDetail: [[["M", 0.86, -0.21], ["Q", 0.84, -0.12, 0.76, -0.04]], [["M", -0.26, -0.13], ["Q", 0.16, -0.08, 0.44, -0.01]]],
  leg: [["M", 0.0, 0.1], ["C", 0.3, 0.075, 0.64, 0.062, 0.92, 0.05], ["Q", 1.04, 0.045, 1.05, 0.012], ["Q", 1.06, -0.022, 0.95, -0.038], ["C", 0.8, -0.062, 0.62, -0.1, 0.42, -0.152], ["C", 0.33, -0.176, 0.22, -0.186, 0.14, -0.166], ["Q", 0.04, -0.14, 0.01, -0.07], ["Q", -0.01, -0.02, 0.0, 0.1], ["Z"]]
};

function silPath(outline, P, Dp) {
  var dx = Dp[0] - P[0], dy = Dp[1] - P[1];
  var L = Math.hypot(dx, dy) || 1;
  var ux = dx / L, uy = dy / L, vx = uy, vy = -ux;
  function X(x, y) { return P[0] + x * L * ux + y * L * vx; }
  function Y(x, y) { return P[1] + x * L * uy + y * L * vy; }
  var p = new Path2D();
  outline.forEach(function (s) {
    var k = s[0];
    if (k === 'Z') { p.closePath(); return; }
    if (k === 'M') { p.moveTo(X(s[1], s[2]), Y(s[1], s[2])); return; }
    if (k === 'L') { p.lineTo(X(s[1], s[2]), Y(s[1], s[2])); return; }
    if (k === 'Q') {
      p.quadraticCurveTo(X(s[1], s[2]), Y(s[1], s[2]),
                         X(s[3], s[4]), Y(s[3], s[4])); return;
    }
    if (k === 'C') {
      p.bezierCurveTo(X(s[1], s[2]), Y(s[1], s[2]),
                      X(s[3], s[4]), Y(s[3], s[4]),
                      X(s[5], s[6]), Y(s[5], s[6]));
    }
  });
  return p;
}

/* draw a ghosted foot or leg behind a segment drawn from P to Dp */
function drawSil(c, kind, P, Dp, K) {
  var o = kind === 'leg' ? SIL.leg : SIL.foot;
  var p = silPath(o, P, Dp);
  c.save();
  c.fillStyle = K.INK; c.globalAlpha = 0.10; c.fill(p);
  c.globalAlpha = 0.30; c.strokeStyle = K.INK; c.lineWidth = 1.5; c.stroke(p);
  if (kind !== 'leg') {
    c.globalAlpha = 0.24; c.lineWidth = 1.2;
    SIL.footDetail.forEach(function (d) { c.stroke(silPath(d, P, Dp)); });
  }
  c.restore();
}

/* ======================================================================
   The dynamics, in one place.

   Two solvers and nothing else.  `dyn` is the worked example — a foot and
   a shank, solved from the distal end up — and `walkAt` is one frame of the
   measured stride.  Every figure in the deck calls one of them, so no
   number is written twice and the self-test exercises the same arithmetic
   the figures draw.

   SIGNS.  The slides give the moment arms as positive lengths and then
   assign the signs by looking at the picture.  That works, but it is the
   step students get wrong, so here the arms are turned into signed position
   vectors once and the moment is the plain cross product r × F after that.
   The rule, read off the figures and true for both the examples:

     on the foot   the ankle is behind and above the centre of mass,
                   the ground contact ahead of it and below
     on the shank  the knee is ahead and above, the ankle behind and below

   With those, the `−F(x)·d(x) + F(y)·d(y)` falls out of r × F by itself,
   including the sign flip at the ankle that Newton's third law demands.
   ====================================================================== */
var DD = window.DY20 || null;
var G = 9.81;

function cross(r, F) { return r[0] * F[1] - r[1] * F[0]; }

/* ---------------------------------------------------------------------
   The worked example, slides 30 to 41, and Example 2, in stance.

   opt.arm scales the foot's two moment arms; it is left in because the
   self-test uses it to confirm the solver is linear in them.
   opt.dyn false zeroes ma and Iα, which turns the same solver back into
   last week's statics, and is what the `dynstat` figure switches.
   --------------------------------------------------------------------- */
function dyn(c, opt) {
  opt = opt || {};
  var k = opt.arm == null ? 1 : opt.arm;
  var useDyn = opt.dyn === false ? 0 : 1;
  var f = c.foot, l = c.leg, g = c.grf;

  var rP = [-f.dPh * k, f.dPv * k];
  var rD = [(f.dDh || 0) * k, -(f.dDv || 0) * k];

  /* the foot: ΣF = ma gives the two forces at the ankle */
  var Fa = [f.m * f.ax * useDyn - g[0],
            f.m * f.ay * useDyn - g[1] + f.m * G];
  var Mfa = cross(rP, Fa), Mgrf = cross(rD, g);
  var Ma = f.I * f.al * useDyn - Mfa - Mgrf;

  /* the shank: the same two things come back the other way round */
  var Fd = [-Fa[0], -Fa[1]], Md = -Ma;
  var rK = [l.dPh, l.dPv], rA = [-l.dDh, -l.dDv];
  var Fk = [l.m * l.ax * useDyn - Fd[0],
            l.m * l.ay * useDyn - Fd[1] + l.m * G];
  var MFk = cross(rK, Fk), MFa = cross(rA, Fd);
  var Mk = l.I * l.al * useDyn - MFk - MFa - Md;

  return { Fax: Fa[0], Fay: Fa[1], Ma: Ma, Mfa: Mfa, Mgrf: Mgrf,
           Iaf: f.I * f.al * useDyn, Ial: l.I * l.al * useDyn,
           Fkx: Fk[0], Fky: Fk[1], Mk: Mk, MFk: MFk, MFa: MFa,
           Fdx: Fd[0], Fdy: Fd[1], Md: Md,
           rP: rP, rD: rD, rK: rK, rA: rA,
           wf: f.m * G, wl: l.m * G, arm: Math.hypot(rP[0], rP[1]) };
}

/* ---------------------------------------------------------------------
   One frame of the measured stride.

   Everything here was computed once, in Python, from the markers and the
   force plate; the figures only read it.  Positions come out of the data
   in centimetres with x measured from the first heel strike, and are
   handed back in metres because that is what the equations want.
   --------------------------------------------------------------------- */
function walkAt(k) {
  var W = DD && DD.walk; if (!W) return null;
  k = Math.max(0, Math.min(W.nf - 1, Math.round(k)));
  var P = {};
  for (var j in W.fig) P[j] = [W.fig[j][0][k] / 100, W.fig[j][1][k] / 100];
  var on = !!W.grf.on[k];
  return { k: k, pc: W.pc[k], P: P, on: on,
           F: [W.grf.fx[k], W.grf.fy[k]],
           C: on ? [W.grf.cx[k] / 100, W.grf.cy[k] / 100] : null,
           Ma: W.full.Ma[k], Mk: W.full.Mk[k],
           MaS: W.stat.Ma[k], MkS: W.stat.Mk[k],
           MaP: W.pub.ank[k], MkP: W.pub.knee[k],
           Fa: [W.full.Fax[k], W.full.Fay[k]],
           Fk: [W.full.Fkx[k], W.full.Fky[k]],
           aF: [W.kin.foot_a[0][k], W.kin.foot_a[1][k]], alF: W.kin.foot_al[k],
           aL: [W.kin.leg_a[0][k], W.kin.leg_a[1][k]], alL: W.kin.leg_al[k] };
}
/* the foot's and the shank's centres of mass, from the same two fractions
   Winter's table gives, so the figure can draw the point the moments are
   taken about rather than assert it */
function comAt(w) {
  var S = DD.walk.seg;
  var mix = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t,
                                         a[1] + (b[1] - a[1]) * t]; };
  return { foot: mix(w.P.ankR, w.P.metR, S.foot.cf),
           leg: mix(w.P.kneeR, w.P.ankR, S.leg.cf) };
}

/* ---------------------------------------------------------------------
   The four forward-dynamics examples, slides 8 to 11.
   --------------------------------------------------------------------- */
function fwdSolve(q) {
  if (q.kind === 'lin') {
    var S = 0; q.F.forEach(function (v) { S += v; });
    return { sum: S, ans: S / q.m, sym: 'ΣF = m·a', u: q.u };
  }
  var M = 0;
  q.F.forEach(function (v, i) { M += v * q.d[i]; });
  return { sum: M, ans: M / q.I, sym: 'ΣM = I·α', u: q.u };
}

/* ---------------------------------------------------------------------
   The Biomechanics Tutor's Dynamic Equilibrium section.  Each kind is one
   line of algebra; the figure prints the line and the answer, and the
   self-test checks the answer against the Tutor's own.
   --------------------------------------------------------------------- */
function tutorSolve(q) {
  switch (q.kind) {
    case 'mag':   return q.m * (q.a + G);
    case 'cable': return 2 * q.T * Math.sin(q.deg * Math.PI / 180);
    case 'div':   return q.num / q.den;
    case 'dist':  return 0.5 * q.a * q.t * q.t;
    case 'blocks': return q.m2 * (q.F / (q.m1 + q.m2));
    case 'tang':  return q.I * Math.sqrt(q.at * q.at - q.ar * q.ar) / q.r;
    case 'atwood':
      var a = (q.m1 * G - q.mu * q.m2 * G) / (q.m1 + q.m2);
      return q.m1 * (G - a);
    case 'skier': return q.v / (q.mu * G);
  }
  return NaN;
}

/* a block arrow with a label, used by every free-body figure here */
function force(c, sc, x, y, fx, fy, scale, col, lab, o) {
  o = o || {};
  var tx = x + fx * scale, ty = y + fy * scale;
  arrow(c, sc.X(x), sc.Y(y), sc.X(tx), sc.Y(ty),
        { color: col, width: o.width || 3.2, head: o.head || 11 });
  if (lab) {
    var m = Math.hypot(sc.X(tx) - sc.X(x), sc.Y(ty) - sc.Y(y)) || 1;
    var ox = (sc.X(tx) - sc.X(x)) / m, oy = (sc.Y(ty) - sc.Y(y)) / m;
    label(c, lab, sc.X(tx) + ox * 14, sc.Y(ty) + oy * 14,
          { size: o.size || 12, color: col, weight: 700, plate: true });
  }
  return [tx, ty];
}

/* ======================================================================
   1. NEWTON — the right-hand side

   The slide 2 calls the dynamic case "dynamic equilibrium", which sounds
   like a contradiction until you see the picture it comes from: put the
   quantity ma on the diagram as if it were a force, pointing backwards,
   and the sums are zero again.  That is d'Alembert's trick and it is what
   the phrase means.

   Two panels, the linear one and the angular one, because the lecture uses
   both and they are the same sentence twice.  Slide the applied force down
   until the block stops accelerating and the figure turns back into last
   week's problem, with ΣF = 0 written across it.
   ====================================================================== */
D.register('newton', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { F: 180, m: 10, M: 12, I: 0.15 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 800 : 410,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;
  var FR = 50;                       /* the friction the block always feels */

  function draw() {
    var K = C();
    ax.clear();
    var pw = port ? ax.W : ax.W / 2;
    var ph = port ? (ax.H - 262) / 2 : ax.H - 128;

    /* ------------------------- the linear panel ---------------------- */
    (function () {
      var box = { x: 8, y: 26, w: pw - 16, h: ph };
      var sc = new Scene(c, box).fit(-1.10, -0.36, 0.80, 0.62, 10);
      var a = (S.F - FR) / S.m;
      var FS = 0.70 / 260;                      /* newtons -> world units */

      /* the floor and the block */
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
      c.beginPath(); c.moveTo(box.x + 4, sc.Y(-0.22));
      c.lineTo(box.x + box.w - 4, sc.Y(-0.22)); c.stroke(); c.restore();
      c.save();
      c.fillStyle = K.FILL; c.strokeStyle = K.INK; c.lineWidth = 2;
      c.fillRect(sc.X(-0.25), sc.Y(0.16), sc.L(0.50), sc.L(0.38));
      c.strokeRect(sc.X(-0.25) + .5, sc.Y(0.16) + .5, sc.L(0.50), sc.L(0.38));
      c.restore();
      label(c, fmt(S.m, 0) + ' kg', sc.X(0), sc.Y(-0.10), { size: 15, weight: 700 });

      /* the push, arriving at the left face */
      var L1 = S.F * FS;
      arrow(c, sc.X(-0.25 - L1), sc.Y(0.06), sc.X(-0.25), sc.Y(0.06),
            { color: K.ACC, width: 3.4, head: 12 });
      label(c, fmt(S.F, 0) + ' N', sc.X(-0.25 - L1 / 2), sc.Y(0.06) - 15,
            { size: 12.5, color: K.ACC, weight: 700 });
      /* friction, arriving at the right face from the other side */
      var L2 = FR * FS;
      arrow(c, sc.X(0.25 + L2), sc.Y(0.06), sc.X(0.25), sc.Y(0.06),
            { color: K.MUT, width: 2.6, head: 10 });
      label(c, 'friction ' + fmt(FR, 0), sc.X(0.25 + L2 / 2), sc.Y(0.06) - 15,
            { size: 11, color: K.MUT, weight: 650, align: 'left' });
      /* the inertial force: ma, drawn backwards, dashed */
      if (Math.abs(a) > 0.02) {
        var t = S.m * a * FS;
        c.save(); c.setLineDash([7, 5]);
        arrow(c, sc.X(0), sc.Y(0.44), sc.X(-t), sc.Y(0.44),
              { color: K.VIO, width: 2.6, head: 10 });
        c.restore();
        label(c, 'm·a = ' + fmt(S.m * a, 0) + ' N', sc.X(-t / 2), sc.Y(0.44) - 15,
              { size: 11, color: K.VIO, weight: 650 });
      }

      label(c, 'ΣFx = m·ax', box.x + box.w / 2, box.y - 10,
            { size: 14, weight: 700, color: K.INK });
      var y = box.y + box.h + 14;
      label(c, fmt(S.F, 0) + ' − ' + fmt(FR, 0) + ' = ' + fmt(S.m, 0) + ' · a',
            box.x + box.w / 2, y, { size: 13.5, weight: 650 });
      label(c, Math.abs(a) < 0.02 ? 'a = 0 — this is last week'
                                  : 'a = ' + fmt(a, 2) + ' m/s²',
            box.x + box.w / 2, y + 22,
            { size: 16, weight: 700, color: Math.abs(a) < 0.02 ? K.GRN : K.ACC });
    })();

    /* ------------------------ the angular panel ---------------------- */
    (function () {
      var box = port ? { x: 8, y: 26 + ph + 102, w: pw - 16, h: ph }
                     : { x: pw + 8, y: 26, w: pw - 16, h: ph };
      var sc = new Scene(c, box).fit(-0.34, -0.46, 1.02, 0.52, 10);
      var al = S.M / S.I;

      c.save(); c.strokeStyle = K.INK; c.lineWidth = 11; c.lineCap = 'round';
      c.beginPath(); c.moveTo(sc.X(0), sc.Y(0)); c.lineTo(sc.X(0.92), sc.Y(0));
      c.stroke(); c.restore();
      pin(c, sc.X(0), sc.Y(0), 8);
      label(c, 'axis', sc.X(0), sc.Y(0) + 58,
            { size: 11.5, align: 'center', weight: 700 });
      label(c, 'I = ' + fmt(S.I, 2) + ' kg·m²', sc.X(0.58), sc.Y(0) + 26,
            { size: 12, color: K.MUT, weight: 650 });
      if (Math.abs(S.M) > 0.5) {
        spin(c, sc.X(0), sc.Y(0), 40, S.M > 0, { color: K.ACC, width: 3 });
        label(c, 'M = ' + num(S.M, 0) + ' N·m', sc.X(0), sc.Y(0) - 62,
              { size: 12.5, color: K.ACC, weight: 700, plate: true });
      } else {
        label(c, 'no moment', sc.X(0), sc.Y(0) - 46,
              { size: 12.5, color: K.MUT, weight: 700 });
      }
      if (Math.abs(al) > 0.5) {
        var tip = 0.92, r = sc.L(0.16);
        c.save(); c.strokeStyle = K.VIO; c.lineWidth = 2.4; c.setLineDash([6, 4]);
        c.beginPath();
        c.arc(sc.X(tip), sc.Y(0), r, al > 0 ? -1.25 : 0.1, al > 0 ? -0.1 : 1.25);
        c.stroke(); c.restore();
        label(c, 'α', sc.X(tip) + r + 12, sc.Y(0),
              { size: 13, color: K.VIO, weight: 700 });
      }

      label(c, 'ΣM = I·α', box.x + box.w / 2, box.y - 10,
            { size: 14, weight: 700, color: K.INK });
      var y = box.y + box.h + 14;
      label(c, fmt(S.M, 0) + ' = ' + fmt(S.I, 2) + ' · α',
            box.x + box.w / 2, y, { size: 13.5, weight: 650 });
      label(c, Math.abs(al) < 0.5 ? 'α = 0 — this is last week too'
                                  : 'α = ' + fmt(al, 1) + ' rad/s²',
            box.x + box.w / 2, y + 22,
            { size: 16, weight: 700, color: Math.abs(al) < 0.5 ? K.GRN : K.ACC });
    })();

    wrapLabel(c, 'The free body diagram does not change · the force table does ' +
              'not change · the sign conventions do not change · the only thing ' +
              'that changes is that the right-hand side is no longer zero',
              ax.W / 2, ax.H - 10, ax.W - 24, { size: 11.5, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sF = slider(u.ctl, 'The push', 0, 260, 5, S.F,
                  function (v) { return fmt(v, 0) + ' N'; },
                  function (v) { S.F = v; draw(); });
  var sM = slider(u.ctl, 'The twist', -30, 30, 1, S.M,
                  function (v) { return num(v, 0) + ' N·m'; },
                  function (v) { S.M = v; draw(); });
  sF.quiet(S.F); sM.quiet(S.M);
  var rd = readout(u.ctl);
  rd.innerHTML = 'Last week the right-hand side was zero and you solved for the ' +
    'forces that made it so. This week it is <b>m·a</b> and <b>I·α</b>, and you ' +
    'solve for the forces that produce the motion you measured. Slide the push ' +
    'down to 50 N, where it exactly cancels friction, and the dynamic problem ' +
    'turns back into the static one without a single line of the method changing. ' +
    'The dashed arrow is the quantity m·a drawn as though it were a force: add it ' +
    'and the sums are zero again, which is why we call this ' +
    '<b>dynamic equilibrium</b>.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   2. FWD — the four forward-dynamics examples, slides 8 to 11

   Known forces in, motion out.  All four reproduce: 10, 25, 66.67 and
   146.67.  The figure draws the sense of each answer as well as its size,
   because the caption on the last two slides asks for it — "this clockwise
   torque will cause a negative moment and angular acceleration" — and a
   lecture whose worked example turns on signs should practise them here.
   ====================================================================== */
D.register('fwd', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!DD) return;
  var Q = DD.fwd, S = { i: 0 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 600 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function draw() {
    var K = C(), q = Q[S.i], r = fwdSolve(q);
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.52;

    var box = { x: 10, y: 50, w: fw - 20, h: port ? ax.H * 0.30 : ax.H - 128 };
    var lin = q.kind === 'lin';
    var sc = new Scene(c, box).fit(lin ? -1.05 : -0.16, lin ? -0.44 : -0.62,
                                   lin ? 0.95 : 1.06, lin ? 0.56 : 0.62, 10);
    var FS = lin ? 0.60 / 250 : 0.0021;

    if (lin) {
      c.save(); c.fillStyle = K.FILL; c.strokeStyle = K.INK; c.lineWidth = 2;
      c.fillRect(sc.X(-0.25), sc.Y(0.19), sc.L(0.50), sc.L(0.38));
      c.strokeRect(sc.X(-0.25) + .5, sc.Y(0.19) + .5, sc.L(0.50), sc.L(0.38));
      c.restore();
      label(c, fmt(q.m, 0) + ' kg', sc.X(0), sc.Y(0), { size: 15, weight: 700 });
      q.F.forEach(function (F, i) {
        var y = q.F.length === 1 ? 0 : (i === 0 ? 0.11 : -0.11);
        arrow(c, sc.X(-0.25 - F * FS), sc.Y(y), sc.X(-0.25), sc.Y(y),
              { color: i ? K.BLUE : K.ACC, width: 3.2, head: 11 });
        label(c, fmt(F, 0) + ' N', sc.X(-0.25 - F * FS) - 8, sc.Y(y),
              { size: 12.5, align: 'right', color: i ? K.BLUE : K.ACC,
                weight: 700 });
      });
      c.save(); c.setLineDash([7, 5]);
      arrow(c, sc.X(0.30), sc.Y(0.40), sc.X(0.30 + r.ans * 0.016), sc.Y(0.40),
            { color: K.VIO, width: 2.6, head: 10 });
      c.restore();
      label(c, 'a = ' + fmt(r.ans, 1) + ' m/s²',
            sc.X(0.30 + r.ans * 0.008), sc.Y(0.40) - 15,
            { size: 11.5, color: K.VIO, weight: 700 });
    } else {
      c.save(); c.strokeStyle = K.INK; c.lineWidth = 10; c.lineCap = 'round';
      c.beginPath(); c.moveTo(sc.X(0), sc.Y(0)); c.lineTo(sc.X(0.95), sc.Y(0));
      c.stroke(); c.restore();
      pin(c, sc.X(0), sc.Y(0), 8);
      label(c, 'axis', sc.X(0), sc.Y(0) - 56,
            { size: 11.5, align: 'center', weight: 700 });
      q.F.forEach(function (F, i) {
        var x = q.d[i] * 7.2;                    /* 0.1 m -> 0.72 of the bar */
        var h = F * FS * 1.6;
        arrow(c, sc.X(x), sc.Y(h), sc.X(x), sc.Y(0.03),
              { color: i ? K.BLUE : K.ACC, width: 3.2, head: 11 });
        label(c, fmt(F, 0) + ' N', sc.X(x), sc.Y(h) - 14,
              { size: 12.5, color: i ? K.BLUE : K.ACC, weight: 700 });
        var dy = -0.16 - i * 0.14;
        c.save(); c.strokeStyle = K.MUT; c.lineWidth = 1.2;
        c.setLineDash([4, 4]);
        c.beginPath(); c.moveTo(sc.X(0), sc.Y(dy)); c.lineTo(sc.X(x), sc.Y(dy));
        c.moveTo(sc.X(x), sc.Y(dy) - 5); c.lineTo(sc.X(x), sc.Y(dy) + 5);
        c.moveTo(sc.X(0), sc.Y(dy) - 5); c.lineTo(sc.X(0), sc.Y(dy) + 5);
        c.stroke(); c.restore();
        label(c, fmt(q.d[i], 2) + ' m', sc.X(x / 2), sc.Y(dy) + 13,
              { size: 11, color: K.MUT, weight: 650, plate: true });
      });
      label(c, 'I = ' + fmt(q.I, 2) + ' kg·m²', sc.X(0.48), sc.Y(-0.46),
            { size: 12, color: K.MUT, weight: 650 });
      spin(c, sc.X(0), sc.Y(0), 34, false, { color: K.VIO, width: 2.4 });
    }

    /* ----------------------------- the working ----------------------- */
    var px = port ? 16 : fw + 14, pw = port ? ax.W - 32 : ax.W - fw - 30;
    var py = port ? box.y + box.h + 44 : 56;
    py = wrapLabel(c, q.q, px + pw / 2, py, pw,
                   { size: 12.5, weight: 650, color: K.INK }) + 10;
    var lines = q.kind === 'lin'
      ? [[r.sym, 'the forces all act through the centre of gravity, so ' +
          'nothing turns'],
         ['ΣF = ' + q.F.map(function (v) { return fmt(v, 0); }).join(' + ') +
          ' = ' + fmt(r.sum, 0) + ' N', ''],
         ['a = ' + fmt(r.sum, 0) + ' / ' + fmt(q.m, 0) + ' = ' +
          fmt(r.ans, 2) + ' ' + r.u, '']]
      : [[r.sym, 'each force is perpendicular to the segment, so the moment ' +
          'arm is the distance itself'],
         ['ΣM = ' + q.F.map(function (v, i) {
             return fmt(v, 0) + '(' + fmt(q.d[i], 2) + ')'; }).join(' + ') +
          ' = ' + fmt(r.sum, 1) + ' N·m', ''],
         ['α = ' + fmt(r.sum, 1) + ' / ' + fmt(q.I, 2) + ' = ' +
          fmt(r.ans, 2) + ' ' + r.u, '']];
    lines.forEach(function (ln, i) {
      var yy = py + 44 + i * (port ? 52 : 62);
      label(c, ln[0], px, yy, { size: 13.5, align: 'left', weight: 700,
                                color: i === 2 ? K.ACC : K.INK });
      if (ln[1]) wrapLabel(c, ln[1], px, yy + 42, pw,
                           { size: 11, align: 'left', color: K.MUT });
    });

    var ok = Math.abs(r.ans - q.ans) < 0.02;
    label(c, ok ? 'the slide too' : 'the slide says ' + fmt(q.ans, 2),
          px, py + 44 + 3 * (port ? 52 : 62) - 10,
          { size: 12, align: 'left', weight: 650, color: ok ? K.GRN : K.ACC });

    var note = q.kind === 'ang'
      ? 'The caption under this slide reads "this clockwise torque will cause ' +
        'a negative moment and angular acceleration" — and it will, so the ' +
        'answer is −' + fmt(r.ans, 2) + ' rad/s². The printed answer has lost ' +
        'its sign. In a lecture whose worked example turns on sign conventions ' +
        'that is worth saying out loud.'
      : 'Forward dynamics: the forces are given and the motion comes out. ' +
        'This is the direction a simulation runs, and the direction you can ' +
        'almost never use on a person, because the forces inside are the part ' +
        'you cannot measure.';
    wrapLabel(c, note, ax.W / 2, ax.H - 12, ax.W - 36,
              { size: 11.5, color: q.kind === 'ang' ? K.ACC : K.MUT });
  }

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  keepOut(seg(row, Q.map(function (q, i) { return [i, '#' + q.n]; }), 0,
              function (v) { S.i = +v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'Four problems, one equation each, and between them they are ' +
    'the whole of forward dynamics: <b>known forces in, motion out</b>. Two ' +
    'linear, two angular. Nothing here needs a free body diagram with unknowns ' +
    'in it, which is exactly what makes the inverse problem — the rest of this ' +
    'lecture — harder.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   3. CHAIN — the three steps, and every variable in each one

   Slides 17 and 18 say to start at the most distal segment and carry the
   solution forward.  It is not a convention, it is arithmetic: a free body
   in two dimensions gives three equations, and an unknown joint costs three
   unknowns, so a segment can be solved only when one of its two ends is
   already known.

   Step 1 the foot, step 2 the leg, step 3 the thigh.  Each step shows the
   segment cut free, what arrives at its distal end, what is still unknown
   at its proximal end, what comes out of the anthropometric table, and the
   three equations that close it.
   ====================================================================== */
D.register('chain', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { step: 0, sil: true };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 700 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* the limb, in late swing, in a 0..1 box */
  var J = { hip: [0.12, 0.95], knee: [0.34, 0.54], ank: [0.22, 0.11],
            met: [0.42, 0.03] };

  var STEPS = [
    { seg: 'foot', a: 'ank', b: 'met', kind: 'foot',
      name: 'the foot', prox: 'ankle', dist: 'the ground',
      known: ['GRF<sub>x</sub>, GRF<sub>y</sub> — measured by the plate',
              'where it acts — the centre of pressure',
              'no moment: the ground pushes, it does not twist'],
      table: 'm, I and the centre of mass of the foot',
      unk: ['F<sub>ankle-x</sub>', 'F<sub>ankle-y</sub>', 'M<sub>ankle</sub>'],
      hand: 'the ankle force and the ankle moment go up to step 2' },
    { seg: 'leg', a: 'knee', b: 'ank', kind: 'leg',
      name: 'the leg', prox: 'knee', dist: 'the ankle',
      known: ['F<sub>ankle-x</sub>, F<sub>ankle-y</sub> — from step 1, reversed',
              'M<sub>ankle</sub> — from step 1, reversed',
              'they act at the ankle, which the markers located'],
      table: 'm, I and the centre of mass of the leg',
      unk: ['F<sub>knee-x</sub>', 'F<sub>knee-y</sub>', 'M<sub>knee</sub>'],
      hand: 'the knee force and the knee moment go up to step 3' },
    { seg: 'thigh', a: 'hip', b: 'knee', kind: null,
      name: 'the thigh', prox: 'hip', dist: 'the knee',
      known: ['F<sub>knee-x</sub>, F<sub>knee-y</sub> — from step 2, reversed',
              'M<sub>knee</sub> — from step 2, reversed',
              'they act at the knee'],
      table: 'm, I and the centre of mass of the thigh',
      unk: ['F<sub>hip-x</sub>', 'F<sub>hip-y</sub>', 'M<sub>hip</sub>'],
      hand: 'and that is the hip, which is where we wanted to get to' }
  ];

  function plain(s) {
    return String(s).replace(/<sub>/g, '').replace(/<\/sub>/g, '')
                    .replace(/<[^>]+>/g, '');
  }

  /* ------------------------------------------------------------ drawing */
  function limb(K, box, st) {
    var sc = new Scene(c, box).fit(-0.14, -0.08, 0.60, 1.02, 8);
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sc.X(-0.12), sc.Y(-0.02));
    c.lineTo(sc.X(0.58), sc.Y(-0.02)); c.stroke(); c.restore();
    STEPS.forEach(function (s, i) {
      var a = J[s.a], b = J[s.b];
      var live = i === S.step, done = i < S.step;
      c.save();
      c.strokeStyle = done ? K.GRN : live ? K.ACC : K.GRID;
      c.lineWidth = live ? 12 : 9; c.lineCap = 'round';
      c.globalAlpha = live || done ? 1 : 0.5;
      c.beginPath(); c.moveTo(sc.X(a[0]), sc.Y(a[1]));
      c.lineTo(sc.X(b[0]), sc.Y(b[1])); c.stroke(); c.restore();
    });
    ['hip', 'knee', 'ank'].forEach(function (j) {
      pin(c, sc.X(J[j][0]), sc.Y(J[j][1]), 6);
    });
    arrow(c, sc.X(J.met[0]), sc.Y(-0.02), sc.X(J.met[0] + 0.01), sc.Y(0.26),
          { color: K.BLUE, width: 3, head: 10 });
    label(c, 'the plate', sc.X(J.met[0] + 0.04), sc.Y(0.26),
          { size: 11.5, align: 'left', color: K.BLUE, weight: 700, plate: true });
    STEPS.forEach(function (s, i) {
      var a = J[s.a], b = J[s.b];
      var mx = (sc.X(a[0]) + sc.X(b[0])) / 2, my = (sc.Y(a[1]) + sc.Y(b[1])) / 2;
      c.save();
      c.fillStyle = i < S.step ? K.GRN : i === S.step ? K.ACC : K.GRID;
      c.beginPath(); c.arc(mx - 34, my, 12, 0, 7); c.fill(); c.restore();
      label(c, String(i + 1), mx - 34, my + 5,
            { size: 13, color: K.PANEL, weight: 700 });
    });
  }

  function freebody(K, box, st) {
    /* the live segment, cut free and blown up */
    var P = [box.x + box.w * 0.30, box.y + box.h * 0.22];
    var Dp = [box.x + box.w * 0.74, box.y + box.h * 0.82];
    if (S.sil && st.kind) drawSil(c, st.kind, P, Dp, K);
    var Cg = [P[0] + (Dp[0] - P[0]) * 0.46, P[1] + (Dp[1] - P[1]) * 0.46];

    c.save(); c.strokeStyle = K.INK; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(P[0], P[1]); c.lineTo(Dp[0], Dp[1]); c.stroke();
    c.fillStyle = K.INK;
    c.fillRect(P[0] - 7, P[1] - 7, 14, 14);
    c.fillRect(Dp[0] - 7, Dp[1] - 7, 14, 14);
    c.restore();
    c.save(); c.fillStyle = K.BLUE;
    c.beginPath(); c.arc(Cg[0], Cg[1], 6.5, 0, 7); c.fill(); c.restore();

    /* what is known, at the distal end */
    arrow(c, Dp[0], Dp[1], Dp[0], Dp[1] - 48, { color: K.GRN, width: 3, head: 9 });
    arrow(c, Dp[0], Dp[1], Dp[0] + 44, Dp[1], { color: K.GRN, width: 3, head: 9 });
    label(c, 'known', Dp[0] + 52, Dp[1] + 20,
          { size: 12.5, align: 'left', color: K.GRN, weight: 700 });
    if (S.step > 0) spin(c, Dp[0], Dp[1], 24, false, { color: K.GRN, width: 2.6 });

    /* what is unknown, at the proximal end */
    arrow(c, P[0], P[1], P[0], P[1] - 48, { color: K.ACC, width: 3, head: 9 });
    arrow(c, P[0], P[1], P[0] + 44, P[1], { color: K.ACC, width: 3, head: 9 });
    spin(c, P[0], P[1], 24, true, { color: K.ACC, width: 2.8 });
    label(c, 'unknown', P[0] - 24, P[1] - 44,
          { size: 12.5, align: 'right', color: K.ACC, weight: 700 });

    /* weight and the inertial terms */
    arrow(c, Cg[0], Cg[1], Cg[0] - 40, Cg[1] + 28, { color: K.GRN, width: 2.2, head: 7 });
    label(c, 'mg', Cg[0] - 48, Cg[1] + 42,
          { size: 11.5, color: K.GRN, weight: 650 });
    arrow(c, Cg[0], Cg[1], Cg[0] + 46, Cg[1], { color: K.MUT, width: 2, head: 7, dash: [5, 4] });
    arrow(c, Cg[0], Cg[1], Cg[0], Cg[1] - 40, { color: K.MUT, width: 2, head: 7, dash: [5, 4] });
    label(c, 'ma, Iα', Cg[0] + 54, Cg[1] - 20,
          { size: 11.5, align: 'left', color: K.MUT, weight: 650 });

    label(c, st.prox, P[0] - 26, P[1] + 34,
          { size: 12, align: 'right', color: K.MUT, weight: 650 });
    label(c, st.dist, Dp[0] + 20, Dp[1] + 44,
          { size: 12, align: 'left', color: K.MUT, weight: 650 });
    label(c, 'Step ' + (S.step + 1) + ' · ' + st.name,
          box.x + box.w / 2, box.y - 4,
          { size: 14, weight: 700, color: K.ACC });
  }

  function draw() {
    var K = C(), st = STEPS[S.step];
    ax.clear();

    if (port) {
      limb(K, { x: 6, y: 18, w: ax.W * 0.36, h: ax.H * 0.28 }, st);
      freebody(K, { x: ax.W * 0.38, y: 26, w: ax.W * 0.60, h: ax.H * 0.27 }, st);
    } else {
      limb(K, { x: 2, y: 16, w: ax.W * 0.155, h: ax.H - 54 }, st);
      freebody(K, { x: ax.W * 0.185, y: 34, w: ax.W * 0.25, h: ax.H - 86 }, st);
    }

    /* ------------------------------------------------- the variables */
    var px = port ? 14 : ax.W * 0.47;
    var pw = port ? ax.W - 28 : ax.W - px - 14;
    var y = port ? ax.H * 0.33 : 30;
    var SZ = port ? 12.5 : 13.5;

    label(c, 'What arrives at the distal end', px, y,
          { size: SZ, align: 'left', weight: 700, color: K.GRN });
    st.known.forEach(function (t, i) {
      y += port ? 20 : 23;
      label(c, '•  ' + plain(t), px + 6, y,
            { size: SZ - 1.2, align: 'left', weight: 600, color: K.INK });
    });

    y += port ? 26 : 32;
    label(c, 'What the anthropometric table gives', px, y,
          { size: SZ, align: 'left', weight: 700, color: K.BLUE });
    y += port ? 20 : 23;
    label(c, '•  ' + st.table + ', and a and α from the markers',
          px + 6, y, { size: SZ - 1.2, align: 'left', weight: 600, color: K.INK });

    y += port ? 26 : 32;
    label(c, 'What is unknown — three things', px, y,
          { size: SZ, align: 'left', weight: 700, color: K.ACC });
    y += port ? 20 : 23;
    label(c, '•  ' + st.unk.map(plain).join('     '), px + 6, y,
          { size: SZ, align: 'left', weight: 700, color: K.ACC });

    y += port ? 26 : 32;
    label(c, 'Three equations close it', px, y,
          { size: SZ, align: 'left', weight: 700, color: K.INK });
    y += port ? 20 : 24;
    label(c, 'ΣFx = max        ΣFy = may        ΣM = Iα',
          px + 6, y, { size: SZ, align: 'left', weight: 650, color: K.INK });

    y += port ? 24 : 30;
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(px, y - 12); c.lineTo(px + pw - 10, y - 12);
    c.stroke(); c.restore();
    y += port ? 10 : 14;
    label(c, '3 unknowns, 3 equations — solvable. Then ' + st.hand + '.',
          px, y, { size: SZ, align: 'left', weight: 700, color: K.GRN });

    wrapLabel(c, 'A free body in two dimensions gives three equations. An unknown ' +
      'joint costs three unknowns. So a segment can be solved only when one of ' +
      'its ends is already known — and at the start exactly one end of one ' +
      'segment is.', ax.W / 2, ax.H - 8, ax.W - 40,
      { size: 11.5, color: K.MUT });
  }

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  seg(row, [[0, 'Step 1 · the foot'], [1, 'Step 2 · the leg'],
            [2, 'Step 3 · the thigh']], 0,
      function (v) { S.step = +v; draw(); });
  var sb = el('button', 'ibtn ghost');
  sb.textContent = 'hide the limb';
  sb.addEventListener('click', function () {
    S.sil = !S.sil;
    sb.textContent = (S.sil ? 'hide' : 'show') + ' the limb';
    draw();
  });
  row.appendChild(sb);
  keepOut(row);

  var rd = readout(u.ctl);
  rd.innerHTML = 'Three segments, three solutions, each one handing the next the ' +
    'force and the moment it needs. The <b>foot</b> can go first because a force ' +
    'plate has already measured what happens at its far end, and because the ' +
    'ground applies no moment. Everything above it is the same three equations ' +
    'with the previous answer arriving, reversed, at the bottom.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   4. FBD20 — the foot, free, on a real stride            (anchor figure)

   The slides 20 to 24 build the foot's free body diagram and write the
   three equations on it, in symbols.  This is the same diagram with a real
   foot in it: a measured heel, ankle and metatarsal heads, a measured
   ground reaction force at a measured centre of pressure, Winter's table
   for the mass and the inertia, and the three equations evaluated at
   whichever instant of the stride you put the slider on.

   The order of the three steps is the order on the slides and it matters: the two force
   sums first, because the ankle's force appears in the moment equation and
   you need its value before you can use it.

   Lencioni et al. (2019) Scientific Data 6:309, CC BY 4.0 — Subject 16,
   55 kg, 1.61 m, walking at 1.14 m/s.  The plate is under this foot for
   the first 59.8 % of the cycle.
   ====================================================================== */
D.register('fbd20', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!DD) return;
  var W = DD.walk, S = { k: 30, step: 2 }, timer = null;

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 660 : 378,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;
  var FS = 0.115 / 700;                 /* newtons -> metres on the diagram */

  function draw() {
    var K = C(), w = walkAt(S.k), cm = comAt(w);
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.44;

    var A = w.P.ankR, H = w.P.heelR, M = w.P.metR, G0 = cm.foot;
    var cx = (H[0] + M[0]) / 2;
    var box = { x: 8, y: 22, w: fw - 16, h: port ? ax.H * 0.36 : ax.H - 118 };
    var sc = new Scene(c, box).fit(cx - 0.24, -0.17, cx + 0.24, 0.27, 8);

    /* the floor */
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
    c.beginPath(); c.moveTo(box.x, sc.Y(0)); c.lineTo(box.x + box.w, sc.Y(0));
    c.stroke(); c.restore();

    /* the foot: heel to metatarsals, with the ankle on its stalk */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 12; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sc.X(H[0]), sc.Y(H[1]));
    c.lineTo(sc.X(M[0]), sc.Y(M[1])); c.stroke();
    c.lineWidth = 7;
    c.beginPath(); c.moveTo(sc.X(A[0]), sc.Y(A[1]));
    c.lineTo(sc.X(H[0]), sc.Y(H[1])); c.stroke();
    c.restore();
    pin(c, sc.X(A[0]), sc.Y(A[1]), 7);
    label(c, 'ankle', sc.X(A[0]) - 40, sc.Y(A[1]) + 6,
          { size: 11.5, align: 'right', weight: 700, plate: true });

    /* the centre of mass, which is what the moments are taken about */
    c.save(); c.fillStyle = K.VIO;
    c.beginPath(); c.arc(sc.X(G0[0]), sc.Y(G0[1]), 5.5, 0, 7); c.fill();
    c.restore();
    label(c, 'CoM', sc.X(G0[0]) + 22, sc.Y(G0[1]) + 4,
          { size: 11, color: K.VIO, weight: 650, plate: true });

    /* the ground reaction force, where the plate says it acts */
    if (w.on && Math.hypot(w.F[0], w.F[1]) > 5) {
      force(c, sc, w.C[0], w.C[1], w.F[0] * FS, w.F[1] * FS, 1, K.BLUE,
            fmt(Math.hypot(w.F[0], w.F[1]), 0) + ' N', { size: 12 });
      c.save(); c.fillStyle = K.BLUE;
      c.beginPath(); c.arc(sc.X(w.C[0]), sc.Y(w.C[1]), 4, 0, 7); c.fill();
      c.restore();
    } else {
      label(c, 'the foot is in the air — no ground force',
            sc.X(cx), sc.Y(0.33), { size: 12, color: K.MUT, weight: 650 });
    }

    /* its own weight */
    var Wt = W.seg.foot.m * 9.81;
    force(c, sc, G0[0], G0[1], 0, -Wt * FS * 28, 1, K.MUT, '',
          { width: 2.4 });

    /* what we are solving for */
    if (S.step >= 1) {
      force(c, sc, A[0], A[1], w.Fa[0] * FS * 1.0, w.Fa[1] * FS * 1.0, 1, K.ACC,
            '', { width: 3.4 });
      label(c, 'F ankle', sc.X(A[0] + w.Fa[0] * FS) + 8,
            sc.Y(A[1] + w.Fa[1] * FS) - 10,
            { size: 11.5, align: 'left', color: K.ACC, weight: 700, plate: true });
    }
    if (S.step >= 2 && Math.abs(w.Ma) > 0.02) {
      spin(c, sc.X(A[0]), sc.Y(A[1]), 24, w.Ma < 0, { color: K.ORG, width: 2.6 });
      label(c, 'M ankle', sc.X(A[0]) - 34, sc.Y(A[1]) - 44,
            { size: 11.5, align: 'left', color: K.ORG, weight: 700, plate: true });
    }

    /* --------------------------- the equations ----------------------- */
    var px = port ? 16 : fw + 14, pw = port ? ax.W - 32 : ax.W - fw - 30;
    var py = port ? box.y + box.h + 36 : 44;
    var m = W.seg.foot.m, I = W.seg.foot.I;
    label(c, fmt(w.pc, 0) + ' % of the gait cycle', px, py,
          { size: 13, align: 'left', weight: 700, color: K.INK });

    var rows = [
      ['ΣFx = m·ax',
       'F(ankle)x + ' + num(w.F[0], 0) + ' = ' + fmt(m, 2) + '(' +
       num(w.aF[0], 2) + ')',
       'F(ankle)x = ' + num(w.Fa[0], 1) + ' N', K.ACC, 1],
      ['ΣFy = m·ay',
       'F(ankle)y + ' + num(w.F[1], 0) + ' − ' + fmt(m * 9.81, 1) + ' = ' +
       fmt(m, 2) + '(' + num(w.aF[1], 2) + ')',
       'F(ankle)y = ' + num(w.Fa[1], 1) + ' N', K.ACC, 1],
      ['ΣM = I·α',
       'M(ankle) + M(F ankle) + M(GRF) = ' + fmt(I, 5) + '(' +
       num(w.alF, 1) + ')',
       'M(ankle) = ' + num(-w.Ma * W.mass_kg, 2) + ' N·m', K.ORG, 2]
    ];
    rows.forEach(function (r, i) {
      var yy = py + 30 + i * (port ? 76 : 84);
      var live = S.step >= r[4];
      c.save(); c.globalAlpha = live ? 1 : 0.34;
      label(c, r[0], px, yy, { size: 13.5, align: 'left', weight: 700 });
      wrapLabel(c, r[1], px, yy + (port ? 26 : 28), pw - 6,
                { size: 11, align: 'left', color: K.MUT });
      label(c, live ? r[2] : '…', px, yy + (port ? 50 : 56),
            { size: 14, align: 'left', weight: 700, color: r[3] });
      c.restore();
    });

    label(c, 'that is ' + num(w.Ma, 3) + ' N·m per kilogram, counting a ' +
             'plantarflexor moment as positive',
          px, py + 30 + 3 * (port ? 76 : 84) + 2,
          { size: 11.5, align: 'left', color: K.MUT, weight: 650 });

    wrapLabel(c, 'Winter’s table gives the foot ' + fmt(m, 2) + ' kg and ' +
              fmt(I, 5) + ' kg·m² · the markers give its acceleration · the ' +
              'plate gives the force and where it acts · everything else is ' +
              'the three equations',
              ax.W / 2, ax.H - 12, ax.W - 36, { size: 11.5, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sk = slider(u.ctl, 'Where in the stride', 0, W.nf - 1, 1, S.k,
                  function (v) { return fmt(W.pc[Math.round(v)], 0) + ' %'; },
                  function (v) { S.k = Math.round(v); draw(); });
  sk.quiet(S.k);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [[0, 'The diagram'], [1, 'The forces'], [2, 'The moment']],
              2, function (v) { S.step = +v; draw(); }));
  var pb = playBtn(u.ctl, '▶ Walk');
  pb.setAttribute('data-unsafe', '1');
  pb.addEventListener('click', function () {
    if (timer) { clearInterval(timer); timer = null; pb.textContent = '▶ Walk'; return; }
    pb.textContent = '❚❚ Pause';
    timer = setInterval(function () {
      S.k = (S.k + 1) % W.nf; sk.quiet(S.k); draw();
    }, 70);
  });
  node._stop = function () { if (timer) { clearInterval(timer); timer = null; pb.textContent = '▶ Walk'; } };

  var rd = readout(u.ctl);
  rd.innerHTML = 'The free body from the last few slides, with a real foot in it. The two force ' +
    'sums come first because the ankle’s force has to be known before it can ' +
    'appear in the moment equation — the only ordering rule in the method. Walk ' +
    'past 60 % and the plate loses the foot: with no ground force the ankle ' +
    'moment collapses to almost nothing, which is why the swing example comes ' +
    'out at fractions of a newton metre while stance runs to a hundred.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   5. UPHILL — the handover at the ankle

   The step everyone drops.  What the foot's free body produced was the
   force AND the moment the shank applies to the foot; what the shank feels
   at its lower end is both of those reversed.  The slides 26 and 27 write
   the force reversal explicitly — "ΣFx = F(knee)x − F(ankle)x" — and the
   moment reversal as the "− M(ankle)" term, and students lose the second
   one far more often than the first.

   The left panel is the pair of free bodies, pulled apart so the equal and
   opposite arrows and the two opposite spins are visible at once.  Turn the
   moment handover off and watch the knee moment change by the whole of the
   ankle moment, which is the size of the mistake.
   ====================================================================== */
D.register('uphill', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!DD) return;
  var W = DD.walk, S = { k: 30, pass: 1 }, timer = null;

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 660 : 378,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;
  var FS = 0.115 / 700;

  /* the knee moment, recomputed here so the toggle is a real calculation
     and not a stored second copy */
  function kneeM(w, cm, pass) {
    /* the stored ankle moment is per kilogram and plantarflexor-positive;
       everything in this figure is in newton metres, counter-clockwise
       positive, so it comes back as −Ma·m, and what the foot applies to the
       shank is that reversed again */
    var Fd = [-w.Fa[0], -w.Fa[1]];
    var Md = pass ? w.Ma * W.mass_kg : 0;
    var g = cm.leg, m = W.seg.leg.m, I = W.seg.leg.I;
    var rK = [w.P.kneeR[0] - g[0], w.P.kneeR[1] - g[1]];
    var rA = [w.P.ankR[0] - g[0], w.P.ankR[1] - g[1]];
    var Fk = [m * w.aL[0] - Fd[0], m * w.aL[1] - Fd[1] + m * 9.81];
    var M = I * w.alL - cross(rK, Fk) - cross(rA, Fd) - Md;
    return { Fk: Fk, Fd: Fd, Md: Md, M: M, rK: rK, rA: rA };
  }

  function draw() {
    var K = C(), w = walkAt(S.k), cm = comAt(w), q = kneeM(w, cm, S.pass);
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.44;

    var A = w.P.ankR, Kn = w.P.kneeR, H = w.P.heelR, M = w.P.metR;
    var cx = (Kn[0] + M[0]) / 2, cy = Kn[1] / 2;
    var box = { x: 8, y: 22, w: fw - 16, h: port ? ax.H * 0.38 : ax.H - 118 };
    var sc = new Scene(c, box).fit(cx - 0.27, cy - 0.30, cx + 0.27, cy + 0.30, 8);

    var GAP = 0.045;                 /* how far the two bodies are pulled apart */

    /* ---- the foot, pushed down and away ---- */
    c.save(); c.globalAlpha = 0.95;
    c.strokeStyle = K.INK; c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sc.X(H[0]), sc.Y(H[1] - GAP));
    c.lineTo(sc.X(M[0]), sc.Y(M[1] - GAP)); c.stroke();
    c.lineWidth = 6;
    c.beginPath(); c.moveTo(sc.X(A[0]), sc.Y(A[1] - GAP));
    c.lineTo(sc.X(H[0]), sc.Y(H[1] - GAP)); c.stroke();
    c.restore();
    /* what the shank does to the foot */
    force(c, sc, A[0], A[1] - GAP, w.Fa[0] * FS, w.Fa[1] * FS, 1, K.ACC, '',
          { width: 3.2 });
    if (Math.abs(w.Ma) > 0.02)
      spin(c, sc.X(A[0]), sc.Y(A[1] - GAP), 18, w.Ma < 0,
           { color: K.ORG, width: 2.4 });
    label(c, 'on the foot', sc.X(M[0]) + 10, sc.Y(M[1] - GAP) + 16,
          { size: 10.5, align: 'left', color: K.MUT, weight: 650, plate: true });
    /* the ground force, so the foot's free body is not missing a side */
    if (w.on && w.F[1] > 5)
      force(c, sc, w.C[0], w.C[1] - GAP, w.F[0] * FS, w.F[1] * FS, 1, K.BLUE,
            '', { width: 2.6 });

    /* ---- the shank, lifted ---- */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 12; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sc.X(Kn[0]), sc.Y(Kn[1] + GAP));
    c.lineTo(sc.X(A[0]), sc.Y(A[1] + GAP)); c.stroke(); c.restore();
    pin(c, sc.X(Kn[0]), sc.Y(Kn[1] + GAP), 7);
    pin(c, sc.X(A[0]), sc.Y(A[1] + GAP), 6);
    label(c, 'knee', sc.X(Kn[0]) - 13, sc.Y(Kn[1] + GAP),
          { size: 11.5, align: 'right', weight: 700 });
    c.save(); c.fillStyle = K.VIO;
    c.beginPath(); c.arc(sc.X(cm.leg[0]), sc.Y(cm.leg[1] + GAP), 5.5, 0, 7);
    c.fill(); c.restore();
    force(c, sc, cm.leg[0], cm.leg[1] + GAP, 0,
          -W.seg.leg.m * 9.81 * FS * 9, 1, K.MUT, '', { width: 2.4 });

    /* what the foot does back to the shank */
    force(c, sc, A[0], A[1] + GAP, q.Fd[0] * FS, q.Fd[1] * FS, 1, K.ACC, '',
          { width: 3.2 });
    if (S.pass && Math.abs(w.Ma) > 0.02)
      spin(c, sc.X(A[0]), sc.Y(A[1] + GAP), 18, w.Ma > 0,
           { color: K.ORG, width: 2.4 });
    label(c, 'on the shank', sc.X(A[0]) + 30, sc.Y(A[1] + GAP) + 16,
          { size: 10.5, align: 'left', color: K.MUT, weight: 650, plate: true });

    /* and the answer at the knee */
    force(c, sc, Kn[0], Kn[1] + GAP, q.Fk[0] * FS, q.Fk[1] * FS, 1, K.GRN, '',
          { width: 3.2 });
    if (Math.abs(q.M) > 0.3)
      spin(c, sc.X(Kn[0]), sc.Y(Kn[1] + GAP), 24, q.M > 0,
           { color: K.GRN, width: 2.6 });
    label(c, 'M knee', sc.X(Kn[0]) + 34, sc.Y(Kn[1] + GAP) - 12,
          { size: 11.5, align: 'left', color: K.GRN, weight: 700, plate: true });

    /* --------------------------- the working ------------------------- */
    var px = port ? 16 : fw + 14, pw = port ? ax.W - 32 : ax.W - fw - 30;
    var py = port ? box.y + box.h + 34 : 46;
    label(c, fmt(w.pc, 0) + ' % of the gait cycle', px, py,
          { size: 13, align: 'left', weight: 700 });
    var rows = [
      ['what the foot produced',
       'F = (' + num(w.Fa[0], 1) + ', ' + num(w.Fa[1], 1) + ') N,  M = ' +
       num(-w.Ma * W.mass_kg, 2) + ' N·m', K.ACC],
      ['reversed onto the shank',
       'F = (' + num(q.Fd[0], 1) + ', ' + num(q.Fd[1], 1) + ') N,  M = ' +
       (S.pass ? num(q.Md, 2) + ' N·m' : 'dropped'), S.pass ? K.ORG : K.ACC],
      ['ΣFx, ΣFy at the knee',
       'F(knee) = (' + num(q.Fk[0], 1) + ', ' + num(q.Fk[1], 1) + ') N', K.INK],
      ['ΣM = I·α at the knee',
       'M(knee) = ' + num(q.M, 2) + ' N·m = ' + num(q.M / W.mass_kg, 3) +
       ' N·m/kg', K.GRN]
    ];
    rows.forEach(function (r, i) {
      var yy = py + 30 + i * (port ? 48 : 62);
      label(c, r[0], px, yy, { size: 11, align: 'left', weight: 650, color: K.MUT });
      wrapLabel(c, r[1], px, yy + 19, pw - 6,
                { size: 12.5, align: 'left', weight: 700, color: r[2] });
    });

    var truth = kneeM(w, cm, 1).M;
    var err = Math.abs(truth - kneeM(w, cm, 0).M);
    wrapLabel(c, S.pass
      ? 'Both halves of the handover are in: the force reversed and the moment ' +
        'reversed. At this instant dropping the moment alone would move the ' +
        'knee answer by ' + fmt(err, 2) + ' N·m.'
      : 'The moment is being dropped — only the force is handed up. The knee ' +
        'answer is wrong by exactly the ankle moment, ' + fmt(err, 2) + ' N·m, ' +
        'and nothing in the arithmetic complains.',
      ax.W / 2, ax.H - 12, ax.W - 36,
      { size: 11.5, color: S.pass ? K.MUT : K.ACC });
  }

  u.ctl.className = 'ictls g2';
  var sk = slider(u.ctl, 'Where in the stride', 0, W.nf - 1, 1, S.k,
                  function (v) { return fmt(W.pc[Math.round(v)], 0) + ' %'; },
                  function (v) { S.k = Math.round(v); draw(); });
  sk.quiet(S.k);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [[1, 'Hand the moment up'], [0, 'Forget the moment']], 1,
              function (v) { S.pass = +v; draw(); }));
  var pb = playBtn(u.ctl, '▶ Walk');
  pb.setAttribute('data-unsafe', '1');
  pb.addEventListener('click', function () {
    if (timer) { clearInterval(timer); timer = null; pb.textContent = '▶ Walk'; return; }
    pb.textContent = '❚❚ Pause';
    timer = setInterval(function () { S.k = (S.k + 1) % W.nf; sk.quiet(S.k); draw(); }, 70);
  });
  node._stop = function () { if (timer) { clearInterval(timer); timer = null; pb.textContent = '▶ Walk'; } };

  var rd = readout(u.ctl);
  rd.innerHTML = 'Newton’s third law applies to moments as well as to forces. ' +
    'The foot’s free body produced <b>two</b> things at the ankle, and ' +
    '<b>both</b> come back reversed on the shank. The moment equation carries them as ' +
    'the two terms <b>− M(ankle)</b> and <b>− F(ankle)</b>, and the minus signs ' +
    'are not decoration.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   6. SWING — the worked example, every line of it

   Slides 30 to 41 are the ankle and the knee during swing; Example 2 is
   the same two segments during stance, with a ground reaction force under
   the foot.  Both are here, solved by the same four steps, and every line
   is checked against what the slide prints.

   The contrast is the teaching point: identical method, identical four
   steps, and an ankle moment two hundred times larger in stance.
   ====================================================================== */
D.register('swing', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!DD) return;
  var S = { c: 'swing', step: 3 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 680 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function steps(cse, r) {
    var f = cse.foot, l = cse.leg, h = cse.ans, g = cse.grf;
    var on = Math.hypot(g[0], g[1]) > 1;
    return [
      { t: 'the foot, ΣF = m·a',
        lines: [
          'ΣFx:  F(a)x ' + (on ? '+ ' + fmt(g[0], 0) + ' ' : '') + '= (' +
          fmt(f.m, 2) + ')(' + num(f.ax, 2) + ')',
          'F(a)x = ' + num(r.Fax, 2) + ' N',
          'ΣFy:  F(a)y ' + (on ? '+ ' + fmt(g[1], 0) + ' ' : '') + '− ' +
          fmt(f.m * 9.81, 2) + ' = (' + fmt(f.m, 2) + ')(' + num(f.ay, 2) + ')',
          'F(a)y = ' + num(r.Fay, 2) + ' N'],
        got: [r.Fax, r.Fay], ans: [h.Fax, h.Fay], nm: ['F(ankle)x', 'F(ankle)y'] },
      { t: 'the foot, ΣM = I·α',
        lines: [
          'the ankle force about the CoM:  ' + num(r.Mfa, 3) + ' N·m',
          on ? 'the ground force about the CoM:  ' + num(r.Mgrf, 2) + ' N·m'
             : 'in swing there is no ground force, so no second moment',
          'I·α = (' + fmt(f.I, 5) + ')(' + num(f.al, 2) + ') = ' +
          num(r.Iaf, 4) + ' N·m',
          'M(ankle) = I·α − ' + num(r.Mfa, 3) + (on ? ' − ' + num(r.Mgrf, 2) : '') +
          ' = ' + num(r.Ma, 2) + ' N·m'],
        got: [r.Ma], ans: [h.Ma], nm: ['M(ankle)'] },
      { t: 'the shank, ΣF = m·a',
        lines: [
          'the ankle force comes back reversed: (' + num(r.Fdx, 2) + ', ' +
          num(r.Fdy, 2) + ') N',
          'ΣFx:  F(k)x ' + (r.Fdx >= 0 ? '+ ' + fmt(r.Fdx, 2) : '− ' +
          fmt(-r.Fdx, 2)) + ' = (' + fmt(l.m, 2) + ')(' + num(l.ax, 2) + ')',
          'F(k)x = ' + num(r.Fkx, 2) + ' N',
          'F(k)y = (' + fmt(l.m, 2) + ')(' + num(l.ay, 2) + ') − ' +
          num(r.Fdy, 2) + ' + ' + fmt(l.m * 9.81, 2) + ' = ' + num(r.Fky, 2) + ' N'],
        got: [r.Fkx, r.Fky], ans: [h.Fkx, h.Fky], nm: ['F(knee)x', 'F(knee)y'] },
      { t: 'the shank, ΣM = I·α',
        lines: [
          'the knee force about the CoM:  ' + num(r.MFk, 3) + ' N·m',
          'the ankle force about the CoM:  ' + num(r.MFa, 3) + ' N·m',
          'and the ankle moment, reversed:  ' + num(r.Md, 2) + ' N·m',
          'M(knee) = I·α − (' + num(r.MFk, 2) + ') − (' + num(r.MFa, 2) +
          ') − (' + num(r.Md, 2) + ') = ' + num(r.Mk, 2) + ' N·m'],
        got: [r.MFk, r.MFa, r.Mk],
        ans: [h.Mknee, h.Mankle_on_leg, h.Mk],
        nm: ['M(F knee/CG)', 'M(F ankle/CG)', 'M(knee)'] }
    ];
  }

  function draw() {
    var K = C(), cse = DD.ex[S.c], r = dyn(cse), ST = steps(cse, r)[S.step];
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.37;

    /* ----------------------- the two segments ------------------------ */
    var l = cse.leg, f = cse.foot;
    var kn = [l.dPh, l.dPv], an = [-l.dDh, -l.dDv];
    var box = { x: 8, y: 30, w: fw - 16, h: port ? ax.H * 0.30 : ax.H - 150 };
    var ext = Math.max(Math.abs(kn[0]), Math.abs(an[0])) + 0.12;
    var sc = new Scene(c, box).fit(-ext, -ext * 1.15, ext, ext * 0.95, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    /* shank */
    c.save(); c.strokeStyle = S.step >= 2 ? K.INK : K.GRID; c.lineWidth = 12;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(sc.X(kn[0]), sc.Y(kn[1]));
    c.lineTo(sc.X(an[0]), sc.Y(an[1])); c.stroke(); c.restore();
    /* foot, hung off the ankle */
    var fa = [an[0] - f.dPh * 2.2, an[1] + f.dPv * 2.2];
    c.save(); c.strokeStyle = S.step <= 1 ? K.INK : K.GRID; c.lineWidth = 9;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(sc.X(an[0]), sc.Y(an[1]));
    c.lineTo(sc.X(an[0] + 0.16), sc.Y(an[1] - 0.07)); c.stroke(); c.restore();
    pin(c, sc.X(kn[0]), sc.Y(kn[1]), 7);
    pin(c, sc.X(an[0]), sc.Y(an[1]), 7);
    c.save(); c.fillStyle = K.VIO;
    c.beginPath(); c.arc(sc.X(0), sc.Y(0), 5.5, 0, 7); c.fill(); c.restore();
    label(c, 'knee', sc.X(kn[0]) + 12, sc.Y(kn[1]) - 4,
          { size: 11, align: 'left', weight: 700, plate: true });
    label(c, 'ankle', sc.X(an[0]) - 12, sc.Y(an[1]),
          { size: 11, align: 'right', weight: 700, plate: true });
    label(c, 'CoM', sc.X(0) + 12, sc.Y(0) + 15,
          { size: 10.5, align: 'left', color: K.VIO, weight: 650, plate: true });
    /* the two moment arms, as the slides draw them */
    [[kn, K.GRN, l.dPv, l.dPh], [an, K.BLUE, l.dDv, l.dDh]].forEach(function (z) {
      c.save(); c.strokeStyle = z[1]; c.lineWidth = 1.5; c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo(sc.X(0), sc.Y(0)); c.lineTo(sc.X(z[0][0]), sc.Y(0));
      c.lineTo(sc.X(z[0][0]), sc.Y(z[0][1])); c.stroke(); c.restore();
      label(c, fmt(z[3], 3), (sc.X(0) + sc.X(z[0][0])) / 2, sc.Y(0) + 12,
            { size: 10, color: z[1], weight: 650, plate: true });
      label(c, fmt(z[2], 3), sc.X(z[0][0]) + 16, (sc.Y(0) + sc.Y(z[0][1])) / 2,
            { size: 10, color: z[1], weight: 650, plate: true });
    });
    c.restore();
    label(c, cse.name + ' · ' + cse.src, box.x + box.w / 2, box.y - 12,
          { size: 12, weight: 700, color: K.INK });

    /* --------------------------- the working ------------------------- */
    var px = port ? 16 : fw + 14, pw = port ? ax.W - 32 : ax.W - fw - 30;
    var py = port ? box.y + box.h + 40 : 42;
    label(c, (S.step + 1) + '. ' + ST.t, px, py,
          { size: 13.5, align: 'left', weight: 700, color: K.ACC });
    var y = py + 24;
    ST.lines.forEach(function (ln, i) {
      var last = i === ST.lines.length - 1;
      y = wrapLabel(c, ln, px, y + (last ? 10 : 0) + 18, pw - 6,
                    { size: last ? 13 : 11.8, align: 'left',
                      weight: last ? 700 : 600,
                      color: last ? K.INK : K.MUT });
      y += (ST.lines.length > 3 ? 28 : 32);
    });

    /* and what the slide prints */
    var yy = py + (port ? 232 : 250);
    ST.nm.forEach(function (nm, i) {
      var ok = Math.abs(ST.got[i] - ST.ans[i]) <= Math.max(0.055,
               Math.abs(ST.ans[i]) * 0.0012);
      label(c, nm, px, yy + i * 26,
            { size: 11, align: 'left', color: K.MUT, weight: 650 });
      label(c, ok ? 'the slide too' : 'the slide: ' + num(ST.ans[i], 2),
            px + (port ? 150 : 180), yy + i * 26,
            { size: 11.5, align: 'left', weight: 700,
              color: ok ? K.GRN : K.ACC });
    });

    wrapLabel(c, S.c === 'stance'
      ? 'The same four steps with a ground reaction force under the foot. Nothing '
        + 'in the method changed; the ankle moment is two hundred times larger.'
      : 'Four steps, two segments, and the whole of the worked example. Solve the '
        + 'foot, reverse what you found, and hand it to the leg.',
      ax.W / 2, ax.H - 12, ax.W - 36,
      { size: 11.5, color: K.MUT });
  }

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['swing', 'The swing example'],
                    ['stance', 'Example 2, in stance']], 'swing',
              function (v) { S.c = v; draw(); }));
  var row2 = ctlRow(u.ctl);
  keepOut(seg(row2, [[0, 'Foot: forces'], [1, 'Foot: moment'],
                     [2, 'Shank: forces'], [3, 'Shank: moment']], 3,
              function (v) { S.step = +v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'The same four steps, twice. In <b>swing</b> there is no ground ' +
    'force at all, so the ankle moment is nothing but the segment’s own ' +
    'inertia and the force at its top end: 0.39 N·m. In <b>stance</b> the ground ' +
    'pushes with 450 N a hand’s breadth from the centre of mass and the same ' +
    'ankle moment is −76 N·m, two hundred times larger. Nothing about the method ' +
    'changed between them.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   7. MOMENTS4 — the four moments that act on one segment

   This is the figure for slides 23, 24 and 27.  Every segment in the chain
   has exactly four moments acting on it, and they add to Iα:

     1  the moment at the DISTAL end
     2  the moment at the PROXIMAL end          <- the one we solve for
     3  the moment about the CofG caused by the DISTAL force
     4  the moment about the CofG caused by the PROXIMAL force

   On the foot term 1 is always zero, because the ground pushes but does not
   twist, and in swing term 3 is zero as well.  That missing term is the
   whole reason the chain can start at the foot and nowhere else.

   The arithmetic is not repeated here: `dyn()` in _body.js already returns
   each of these as a named quantity, and `swing` draws the same numbers,
   so the two figures cannot drift apart.
   ====================================================================== */
D.register('moments4', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!DD) return;

  /* which case, which segment, which term is lit */
  var S = { ph: 'swing', sg: 'leg', t: 0, sil: true };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 690 : 382,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* --------------------------------------------------------------- model */
  function terms() {
    var cs = DD.ex[S.ph], r = dyn(cs);
    if (S.sg === 'foot') {
      return {
        seg: 'foot', prox: 'ankle', dist: 'the ground',
        Ia: r.Iaf, Fp: [r.Fax, r.Fay], Fd: cs.grf,
        rows: [
          { n: 1, lab: 'the moment applied at the far end',
            sym: 'M at the ground', v: 0, zero: true,
            why: 'the ground pushes, it does not twist' },
          { n: 2, lab: 'the moment at the joint we are solving',
            sym: 'M ankle', v: r.Ma, unknown: true,
            why: 'the unknown — this is what we are solving for' },
          { n: 3, lab: 'the far-end force, about the CofG',
            sym: 'M GRF/CG', v: r.Mgrf, zero: Math.abs(r.Mgrf) < 1e-9,
            why: S.ph === 'swing' ? 'no ground reaction force in swing'
                                  : 'the ground reaction force, about the CofG' },
          { n: 4, lab: 'the joint force, about the CofG',
            sym: 'M Fankle/CG', v: r.Mfa,
            why: 'the ankle force, about the CofG' }
        ]
      };
    }
    return {
      seg: 'leg', prox: 'knee', dist: 'ankle',
      Ia: r.Ial, Fp: [r.Fkx, r.Fky], Fd: [r.Fdx, r.Fdy],
      rows: [
        { n: 1, lab: 'the moment applied at the far end',
          sym: '−M ankle', v: r.Md,
          why: 'solved at the foot, arriving reversed' },
        { n: 2, lab: 'the moment at the joint we are solving',
          sym: 'M knee', v: r.Mk, unknown: true,
          why: 'the unknown — this is what we are solving for' },
        { n: 3, lab: 'the far-end force, about the CofG',
          sym: 'M Fankle/CG', v: r.MFa,
          why: 'the ankle force, reversed, about the CofG' },
        { n: 4, lab: 'the joint force, about the CofG',
          sym: 'M Fknee/CG', v: r.MFk,
          why: 'the knee force, about the CofG' }
      ]
    };
  }

  /* how many decimals: enough that the four rows visibly add to the fifth */
  function dp(T) {
    var m = Math.max(Math.abs(T.Ia), 1e-9);
    T.rows.forEach(function (r) { m = Math.max(m, Math.abs(r.v)); });
    return m >= 10 ? 2 : 3;
  }

  /* ------------------------------------------------------------- drawing */
  function bar(K, box, T) {
    var P = [box.x + box.w * 0.14, box.y + box.h * 0.13];
    var Dp = [box.x + box.w * 0.86, box.y + box.h * 0.86];
    var Cg = [P[0] + (Dp[0] - P[0]) * 0.46, P[1] + (Dp[1] - P[1]) * 0.46];
    var lit = function (n) { return S.t === 0 || S.t === n; };
    var dim = function (n) { return lit(n) ? 1 : 0.15; };
    var AL = 44;                       /* arrow length, pixels */

    /* the two arms from the centre of gravity, under everything else */
    [[3, Dp], [4, P]].forEach(function (z) {
      c.save(); c.globalAlpha = dim(z[0]) * 0.9;
      c.strokeStyle = K.MUT; c.lineWidth = 1.8; c.setLineDash([5, 4]);
      c.beginPath(); c.moveTo(Cg[0], Cg[1]); c.lineTo(z[1][0], z[1][1]);
      c.stroke(); c.restore();
    });

    if (S.sil) drawSil(c, S.sg === 'leg' ? 'leg' : 'foot', P, Dp, K);

    c.save();
    c.strokeStyle = K.INK; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(P[0], P[1]); c.lineTo(Dp[0], Dp[1]); c.stroke();
    c.fillStyle = K.INK;
    c.fillRect(P[0] - 7, P[1] - 7, 14, 14);
    c.fillRect(Dp[0] - 7, Dp[1] - 7, 14, 14);
    c.restore();

    c.save(); c.fillStyle = K.BLUE;
    c.beginPath(); c.arc(Cg[0], Cg[1], 6.5, 0, 7); c.fill(); c.restore();
    label(c, 'CofG', Cg[0] - 34, Cg[1] + 34,
          { size: 11.5, align: 'right', color: K.BLUE, weight: 650, plate: true });

    label(c, T.prox, P[0] - 40, P[1] + 30,
          { size: 12, align: 'right', color: K.MUT, weight: 650 });
    label(c, T.dist, Dp[0] + 16, Dp[1] + 22,
          { size: 12, align: 'left', color: K.MUT, weight: 650 });

    /* 3 and 4 — the forces at each end, drawn the way they actually point,
       and the curl each of them makes about the centre of gravity */
    [[3, Dp, T.rows[2], K.ACC, T.Fd], [4, P, T.rows[3], K.BLUE, T.Fp]]
      .forEach(function (z) {
        var n = z[0], at = z[1], row = z[2], col = z[3], F = z[4] || [0, 0];
        c.save(); c.globalAlpha = dim(n);
        if (Math.hypot(F[0], F[1]) > 1e-9) {
          var sx = F[0] >= 0 ? 1 : -1, sy = F[1] >= 0 ? -1 : 1;   /* y up = -screen */
          arrow(c, at[0], at[1], at[0], at[1] + sy * AL,
                { color: col, width: 2.8, head: 9 });
          arrow(c, at[0], at[1], at[0] + sx * AL, at[1],
                { color: col, width: 2.8, head: 9 });
          label(c, String(n), at[0] + sx * (AL + 14),
                Math.max(16, at[1] + sy * (AL + 10)),
                { size: 13, color: col, weight: 700, plate: true });
          if (!row.zero)
            spin(c, Cg[0], Cg[1], n === 3 ? 15 : 23, row.v > 0,
                 { color: col, width: 2.2, head: 6 });
        } else {
          label(c, 'no force here', at[0] + 24, at[1] + (n === 3 ? 56 : -56),
                { size: 11.5, align: 'left', color: K.MUT, weight: 650, plate: true });
          label(c, String(n), at[0] + 12, at[1] + (n === 3 ? 56 : -56),
                { size: 13, color: K.MUT, weight: 700 });
        }
        c.restore();
      });

    /* 1 — the moment at the distal end */
    var r1 = T.rows[0];
    c.save(); c.globalAlpha = dim(1);
    if (r1.zero) {
      label(c, 'no moment here', Dp[0] - 26, Dp[1] + 26,
            { size: 11.5, align: 'right', color: K.MUT, weight: 650, plate: true });
      label(c, '1', Dp[0] - 14, Dp[1] + 26,
            { size: 13, color: K.MUT, weight: 700 });
    } else {
      spin(c, Dp[0], Dp[1], 26, r1.v > 0, { color: K.VIO, width: 3.2 });
      label(c, '1', Dp[0] - 34, Dp[1] + 30,
            { size: 13, color: K.VIO, weight: 700, plate: true });
    }
    c.restore();

    /* 2 — the moment at the proximal end: the one being solved for */
    c.save(); c.globalAlpha = dim(2);
    spin(c, P[0], P[1], 26, T.rows[1].v > 0, { color: K.GRN, width: 3.6 });
    label(c, '2', P[0] - 34, P[1] - 26,
          { size: 13, color: K.GRN, weight: 700, plate: true });
    c.restore();
  }

  function draw() {
    var K = C(), T = terms(), ND = dp(T);
    ax.clear();
    var box = port ? { x: 6, y: 20, w: ax.W - 12, h: ax.H * 0.40 }
                   : { x: 4, y: 10, w: ax.W * 0.47, h: ax.H - 44 };
    bar(K, box, T);

    /* ------------------------------------------------------ the ledger */
    var px = port ? 14 : box.x + box.w + 18;
    var pw = port ? ax.W - 28 : ax.W - px - 16;
    var py = port ? box.y + box.h + 34 : 36;
    var pitch = port ? 56 : 54;

    label(c, 'Four moments, and they add to Iα', px, py - 16,
          { size: 13, align: 'left', weight: 700, color: K.INK });

    var sum = 0;
    T.rows.forEach(function (r, i) {
      var yy = py + 12 + i * pitch;
      var on = S.t === 0 || S.t === r.n;
      c.save(); c.globalAlpha = on ? 1 : 0.28;
      var col = r.n === 1 ? K.VIO : r.n === 2 ? K.GRN
              : r.n === 3 ? K.ACC : K.BLUE;
      if (r.zero) col = K.MUT;

      /* the number, in a chip */
      c.fillStyle = col; c.globalAlpha = on ? (r.zero ? .35 : .9) : .2;
      c.beginPath(); c.arc(px + 10, yy - 4, 11, 0, 7); c.fill();
      c.globalAlpha = on ? 1 : 0.28;
      label(c, String(r.n), px + 10, yy,
            { size: 12.5, color: K.PANEL, weight: 700 });

      label(c, r.sym, px + 30, yy - 2,
            { size: 13.5, align: 'left', weight: 700, color: col });
      label(c, r.lab, px + 30, yy + 16,
            { size: 11, align: 'left', weight: 600, color: K.MUT });
      label(c, r.zero ? '0' : num(r.v, ND) + ' N·m', px + pw - 4, yy - 2,
            { size: 13.5, align: 'right', weight: 700, color: col });
      if (r.unknown)
        label(c, 'the unknown', px + pw - 4, yy + 16,
              { size: 10.5, align: 'right', weight: 650, color: K.GRN });
      c.restore();
      sum += r.v;
    });

    var sy = py + 12 + T.rows.length * pitch + 4;
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(px, sy - 16); c.lineTo(px + pw, sy - 16);
    c.stroke(); c.restore();
    label(c, 'sum of the four', px, sy + 4,
          { size: 12, align: 'left', weight: 650, color: K.MUT });
    label(c, num(sum, ND) + '  =  Iα = ' + num(T.Ia, ND) + ' N·m',
          px + pw - 4, sy + 4,
          { size: 14, align: 'right', weight: 700, color: K.INK });

    /* the line under the figure */
    var note = S.t === 0
      ? (S.sg === 'foot'
         ? 'The foot is the only segment with nothing applying a moment at its far end, which is why the chain starts here.'
         : 'Four terms, four moments. Term 1 came up from the foot; term 2 is what goes up to the thigh.')
      : T.rows[S.t - 1].why;
    wrapLabel(c, note, ax.W / 2, ax.H - 8, ax.W - 40,
              { size: 11.5, color: S.t === 2 ? K.GRN : K.MUT });
  }


  /* -------------------------------------------------------- the controls */
  u.ctl.className = 'ictls';
  var row1 = ctlRow(u.ctl);
  seg(row1, [['foot-swing', 'The foot, in swing'],
             ['foot-stance', 'The foot, in stance'],
             ['leg-swing', 'The leg']], 'leg-swing',
      function (v) {
        S.sg = v.indexOf('foot') === 0 ? 'foot' : 'leg';
        S.ph = v.indexOf('stance') > 0 ? 'stance' : 'swing';
        draw();
      });
  var sb = el('button', 'ibtn ghost');
  sb.textContent = 'hide the limb';
  sb.addEventListener('click', function () {
    S.sil = !S.sil;
    sb.textContent = (S.sil ? 'hide' : 'show') + ' the limb';
    draw();
  });
  row1.appendChild(sb);
  keepOut(row1);

  var row2 = ctlRow(u.ctl);
  keepOut(seg(row2, [[0, 'All four'],
                     [1, '1 \u00b7 moment at the far end'],
                     [2, '2 \u00b7 moment at the joint'],
                     [3, '3 \u00b7 far-end force about the CofG'],
                     [4, '4 \u00b7 joint force about the CofG']], 0,
              function (v) { S.t = +v; draw(); }));

  var rd = readout(u.ctl);
  rd.innerHTML = 'Every segment in the chain has <b>four</b> moments acting on it, ' +
    'and they add to <b>I&alpha;</b>: one at each end, and one about the centre of ' +
    'gravity from each end&rsquo;s force. <b>Term 2 is always the unknown</b> &mdash; ' +
    'the moment at the proximal end is what we are solving for, and it becomes ' +
    'term 1 of the segment above. The foot is the exception that makes the method ' +
    'work: the ground applies a force but no moment, so one term is missing and ' +
    'three equations are enough.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   8. WALK20 — the method, run on a real stride, against a published answer

   Everything the lecture describes, done once end to end on measured data,
   and then checked against the joint moments the people who recorded the
   stride published for that same stride.

   The shape comes back: r = 0.99 at the ankle, 0.98 at the knee, and both
   peaks land on the same instant of the cycle as theirs.  The magnitudes
   run high, 15 % at the ankle and 37 % at the knee, and that gap is real
   and worth showing rather than tuning away.  It is not a timing error and
   it is not the centre of pressure: shifting either makes early stance
   worse.  It is the model — Dempster's table and skin markers taken as
   joint centres, against their own three-dimensional one — which is the
   first three items on the limitations slide.
   ====================================================================== */
D.register('walk20', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!DD) return;
  var W = DD.walk, H = W.hl, S = { k: 30, show: 'both' }, timer = null;

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 700 : 392,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;
  var FS = 0.42 / 700;

  var LINKS = [['hipR', 'kneeR'], ['kneeR', 'ankR'], ['ankR', 'heelR'],
               ['heelR', 'metR'], ['hipL', 'kneeL'], ['kneeL', 'ankL'],
               ['ankL', 'heelL'], ['heelL', 'metL'],
               ['hipR', 'hipL'], ['hipR', 'head']];

  function draw() {
    var K = C(), w = walkAt(S.k);
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.38;

    /* --------------------------- the walker -------------------------- */
    var box = { x: 8, y: 26, w: fw - 16, h: port ? ax.H * 0.30 : ax.H - 96 };
    var cx = w.P.hipR[0];
    var sc = new Scene(c, box).fit(cx - 0.62, -0.06, cx + 0.62, 1.18, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
    c.beginPath(); c.moveTo(box.x, sc.Y(0)); c.lineTo(box.x + box.w, sc.Y(0));
    c.stroke(); c.restore();
    LINKS.forEach(function (L) {
      var a = w.P[L[0]], b = w.P[L[1]];
      var right = /R$|head/.test(L[0]) && !/L$/.test(L[1]);
      c.save();
      c.strokeStyle = right ? K.INK : K.GRID;
      c.lineWidth = right ? 7 : 5; c.lineCap = 'round';
      c.globalAlpha = right ? 1 : 0.6;
      c.beginPath(); c.moveTo(sc.X(a[0]), sc.Y(a[1]));
      c.lineTo(sc.X(b[0]), sc.Y(b[1])); c.stroke(); c.restore();
    });
    ['hipR', 'kneeR', 'ankR'].forEach(function (j) {
      pin(c, sc.X(w.P[j][0]), sc.Y(w.P[j][1]), 5);
    });
    if (w.on && w.F[1] > 5) {
      force(c, sc, w.C[0], w.C[1], w.F[0] * FS, w.F[1] * FS, 1, K.BLUE,
            fmt(Math.hypot(w.F[0], w.F[1]) / (W.mass_kg * 9.81), 2) + ' BW',
            { size: 11.5 });
    }
    if (Math.abs(w.Ma) > 0.04)
      spin(c, sc.X(w.P.ankR[0]), sc.Y(w.P.ankR[1]), 15, w.Ma < 0,
           { color: K.ACC, width: 2.2 });
    if (Math.abs(w.Mk) > 0.04)
      spin(c, sc.X(w.P.kneeR[0]), sc.Y(w.P.kneeR[1]), 15, w.Mk > 0,
           { color: K.GRN, width: 2.2 });
    c.restore();
    label(c, W.subject + ' · ' + fmt(W.mass_kg, 0) + ' kg · ' +
             fmt(W.height_m, 2) + ' m · ' + fmt(W.speed, 2) + ' m/s',
          box.x + box.w / 2, box.y - 10,
          { size: 11.5, color: K.MUT, weight: 650 });

    /* ------------------------- the two curves ------------------------ */
    var px = port ? 0 : fw;
    var top = port ? box.y + box.h + 44 : 34;
    var gh = port ? (ax.H - top - 130) / 2 : (ax.H - 196) / 2;
    [['ank', 'the ankle', K.ACC, W.full.Ma, W.pub.ank, H.ank_pk, H.ank_pub],
     ['knee', 'the knee', K.GRN, W.full.Mk, W.pub.knee, H.kne_pk, H.kne_pub]
    ].forEach(function (z, gi) {
      var gy = top + gi * (gh + 54);
      var lo = Math.min.apply(null, z[3].concat(z[4])) - 0.08;
      var hi = Math.max.apply(null, z[3].concat(z[4])) + 0.12;
      var a2 = sub(ax, px + 78, gy, 22, ax.H - (gy + gh));
      a2.setRange(0, 100, lo, hi);
      a2.frame({ grid: true, xticks: [0, 25, 50, 75, 100],
                 yticks: axisTicks(lo, hi) });
      /* stance shading */
      a2.rect(0, lo, W.plate_pc, hi, { fill: K.FILL0 });
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
      c.beginPath(); c.moveTo(a2.X(0), a2.Y(0)); c.lineTo(a2.X(100), a2.Y(0));
      c.stroke(); c.restore();
      var mine = W.pc.map(function (p, i) { return [p, z[3][i]]; });
      var pub = W.pc.map(function (p, i) { return [p, z[4][i]]; });
      if (S.show !== 'mine')
        a2.poly(pub, { color: K.MUT, width: 2.4, dash: [6, 4] });
      if (S.show !== 'pub')
        a2.poly(mine, { color: z[2], width: 2.8 });
      a2.dots([[w.pc, gi ? w.Mk : w.Ma]], { color: z[2], r: 5 });
      c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.2; c.globalAlpha = .55;
      c.beginPath(); c.moveTo(a2.X(w.pc), a2.Y(lo)); c.lineTo(a2.X(w.pc), a2.Y(hi));
      c.stroke(); c.restore();
      label(c, z[1] + ' — N·m per kg', (a2.pl + ax.W - a2.pr) / 2, gy - 12,
            { size: 12.5, weight: 700, color: z[2] });
      label(c, 'mine ' + fmt(z[5], 2) + ' · theirs ' + fmt(z[6], 2) + ' · r = ' +
               fmt(gi ? H.kne_r : H.ank_r, 3),
            ax.W - 26, gy + 10,
            { size: 11, align: 'right', color: K.MUT, weight: 650, plate: true });
      if (gi) label(c, 'per cent of the gait cycle',
                    (a2.pl + ax.W - a2.pr) / 2, ax.H - a2.pb + 44,
                    { size: 11.5, weight: 700 });
    });

    wrapLabel(c, 'Shaded: the plate is under this foot · dashed: what the ' +
      'authors published for this same stride · solid: the same stride put ' +
      'through the method from the worked example · the plate record opens 0.4 BW into ' +
      'loading, so the first two frames are an artefact, not mechanics',
      ax.W / 2, ax.H - 10, ax.W - 26, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sk = slider(u.ctl, 'Where in the stride', 0, W.nf - 1, 1, S.k,
                  function (v) { return fmt(W.pc[Math.round(v)], 0) + ' %'; },
                  function (v) { S.k = Math.round(v); draw(); });
  sk.quiet(S.k);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['both', 'Both'], ['mine', 'Mine only'],
                    ['pub', 'Theirs only']], 'both',
              function (v) { S.show = v; draw(); }));
  var pb = playBtn(u.ctl, '▶ Walk');
  pb.setAttribute('data-unsafe', '1');
  pb.addEventListener('click', function () {
    if (timer) { clearInterval(timer); timer = null; pb.textContent = '▶ Walk'; return; }
    pb.textContent = '❚❚ Pause';
    timer = setInterval(function () { S.k = (S.k + 1) % W.nf; sk.quiet(S.k); draw(); }, 70);
  });
  node._stop = function () { if (timer) { clearInterval(timer); timer = null; pb.textContent = '▶ Walk'; } };

  var rd = readout(u.ctl);
  rd.innerHTML = 'One stride, two answers. The shapes match — r = 0.99 at the ' +
    'ankle — and both peaks land on the same instant, while mine run 15 % high ' +
    'at the ankle and 37 % at the knee. No time shift, no centre-of-pressure ' +
    'correction and no single joint-centre nudge closes that gap without making ' +
    'early stance worse: it is the difference between two defensible models of ' +
    'the same body, which is the first three lines of the limitations slide.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   9. DYNSTAT — how much of a joint moment is actually dynamics?

   Lecture 19 solved a walking ankle with ΣF = 0 and ΣM = 0 and got
   1.74 N·m/kg against the 1.51 the authors of the data published, and left
   the question of whether the missing fifteen per cent was the missing
   dynamics.  Here is the answer, measured on the same stride: take the
   full Newton-Euler solution and set every ma and Iα term to zero.

     ankle, over stance   1.738 -> 1.737.  Six hundredths of one per cent.
     knee, over stance    0.730 -> 0.755, and up to 0.13 N·m/kg apart.
     knee, through swing  the static answer has the WRONG SIGN for most of
                          it, and swing is where the worked example lives.

   So the lecture-19 gap was never the dynamics, and the lesson is not that
   dynamics does not matter — it is that it matters where the external
   forces are small and the segment is moving, which is precisely the case
   the worked example chooses.
   ====================================================================== */
D.register('dynstat', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!DD) return;
  var W = DD.walk, H = W.hl;
  var S = { j: 'ank' };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 600 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function draw() {
    var K = C(), ank = S.j === 'ank';
    var full = ank ? W.full.Ma : W.full.Mk;
    var stat = ank ? W.stat.Ma : W.stat.Mk;
    var pub = ank ? W.pub.ank : W.pub.knee;
    ax.clear();

    var lo = Math.min.apply(null, full.concat(stat, pub)) - 0.08;
    var hi = Math.max.apply(null, full.concat(stat, pub)) + 0.18;
    var gy = 34, gh = ax.H - (port ? 196 : 152);
    var a2 = sub(ax, 78, gy, 24, ax.H - (gy + gh));
    a2.setRange(0, 100, lo, hi);
    a2.frame({ grid: true, xticks: [0, 25, 50, 75, 100],
               yticks: axisTicks(lo, hi) });
    a2.rect(0, lo, W.plate_pc, hi, { fill: K.FILL0 });
    label(c, 'the plate is under this foot', a2.X(W.plate_pc / 2), gy + 12,
          { size: 10.5, color: K.MUT, weight: 650, plate: true });
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
    c.beginPath(); c.moveTo(a2.X(0), a2.Y(0)); c.lineTo(a2.X(100), a2.Y(0));
    c.stroke(); c.restore();

    /* the gap between the two solutions, filled */
    c.save(); c.fillStyle = K.ACCFILL; c.globalAlpha = .55;
    c.beginPath();
    W.pc.forEach(function (p, i) {
      if (i === 0) c.moveTo(a2.X(p), a2.Y(full[i])); else c.lineTo(a2.X(p), a2.Y(full[i]));
    });
    for (var i = W.pc.length - 1; i >= 0; i--) c.lineTo(a2.X(W.pc[i]), a2.Y(stat[i]));
    c.closePath(); c.fill(); c.restore();

    var P = function (a) { return W.pc.map(function (p, i) { return [p, a[i]]; }); };
    a2.poly(P(pub), { color: K.MUT, width: 2.2, dash: [6, 4] });
    a2.poly(P(full), { color: ank ? K.ACC : K.GRN, width: 3.4 });
    /* statics LAST, dashed, so that where the two coincide the dashes sit
       visibly on top of the solid line instead of vanishing under it */
    a2.poly(P(stat), { color: K.BLUE, width: 2.2, dash: [3, 5] });

    key(c, a2.pl + 16, gy + 26,
        [[ank ? K.ACC : K.GRN, 'the full Newton-Euler solution'],
         [K.BLUE, 'the same thing with ma and Iα set to zero'],
         [K.MUT, 'what the authors published']], { size: 11 });

    label(c, (ank ? 'the ankle' : 'the knee') + ' — N·m per kilogram',
          (a2.pl + ax.W - a2.pr) / 2, gy - 12, { size: 13, weight: 700 });
    label(c, 'per cent of the gait cycle', (a2.pl + ax.W - a2.pr) / 2,
          ax.H - a2.pb + 26, { size: 11.5, weight: 700 });

    /* the headline, in words */
    var ft, msg, col;
    if (ank) {
      msg = 'Over stance the two solutions differ by at most ' +
            fmt(H.ank_dyn, 3) + ' N·m/kg. At the push-off peak the full ' +
            'solution gives ' + fmt(H.ank_pk, 3) + ' and statics gives ' +
            fmt(H.ank_stat, 3) + ' — a difference of ' +
            fmt(Math.abs(H.ank_pk - H.ank_stat) / H.ank_pk * 100, 2) +
            ' %. The foot weighs ' + fmt(W.seg.foot.m, 1) + ' kg and is barely ' +
            'accelerating; the ground is pushing with ' + fmt(H.grf_pk, 0) +
            ' N a hand’s breadth from the ankle. Nothing else could matter.';
      col = K.ACC;
    } else {
      msg = 'Over stance the gap reaches ' + fmt(H.kne_dyn, 2) + ' N·m/kg, a ' +
            'fifth of the peak. Through swing the static answer is not merely ' +
            'small, it points the wrong way for most of it: the shank is the ' +
            'heaviest thing in the problem and in swing its own acceleration ' +
            'is the only thing acting on it. The worked example is a swing ' +
            'example, and this is why it has to be.';
      col = K.GRN;
    }
    ft = wrapLabel(c, msg, ax.W / 2, ax.H - 10, ax.W - 30,
                   { size: 11.5, color: K.MUT });
    label(c, ank ? 'the dynamics are worth 0.06 % here'
                 : 'in swing, statics gets the sign wrong',
          ax.W / 2, ft - 20, { size: 13.5, weight: 700, color: col });
  }

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['ank', 'The ankle'], ['knee', 'The knee']], 'ank',
              function (v) { S.j = v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'This is the figure lecture 19 asked for. Last week the walking ' +
    'ankle was solved as a <b>statics</b> problem and came out 15 % above the ' +
    'published answer, and the obvious suspect was the missing ma and Iα. It ' +
    'was not them. Setting every dynamic term to zero moves the ankle’s ' +
    'push-off peak by six hundredths of one per cent. The 15 % is the model — ' +
    'whose anthropometric table, and where you decide the joint is. At the knee ' +
    'in swing it is the other way round entirely, and that is the case worth ' +
    'remembering: <b>no external force, a heavy segment, and dynamics is the ' +
    'whole of the answer</b>.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   Hover a term in an equation, light it up on the diagram.

   The contract is one attribute on each side.  In the slide source a term
   is wrapped as <span class="hv" data-hi="Fax">…</span>, and in the figure
   the arrow, the label and the moment arc that belong to it are wrapped as
   <g data-hi="Fax">…</g>.  Several groups may share a key.

   Pointing at either one dims everything in that figure that is not part
   of the same key, which is the whole mechanism: no colour changes, no
   layout changes, nothing that can disagree with the printed slide.

   It works on the whole document rather than per-figure because reveal
   clones sections for the scroll view and the print layout, and a listener
   bound at build time would miss the copies.
   ====================================================================== */
(function () {
  'use strict';

  function fig(el) {
    var sec = el.closest ? el.closest('section') : null;
    return sec ? sec.querySelector('svg.hifig') : null;
  }

  function paint(svg, key) {
    if (!svg) return;
    svg.classList.toggle('lit', !!key);
    Array.prototype.forEach.call(svg.querySelectorAll('[data-hi]'), function (g) {
      g.classList.toggle('on', !!key && g.getAttribute('data-hi') === key);
    });
    var sec = svg.closest('section');
    if (!sec) return;
    Array.prototype.forEach.call(sec.querySelectorAll('.hv'), function (s) {
      s.classList.toggle('on', !!key && s.getAttribute('data-hi') === key);
    });
  }

  function over(e) {
    var t = e.target.closest ? e.target.closest('.hv, svg.hifig [data-hi]') : null;
    if (!t) return;
    var key = t.getAttribute('data-hi');
    var svg = t.tagName === 'SPAN' ? fig(t)
                                   : (t.closest ? t.closest('svg.hifig') : null);
    paint(svg, key);
  }

  function out(e) {
    var t = e.target.closest ? e.target.closest('.hv, svg.hifig [data-hi]') : null;
    if (!t) return;
    var svg = t.tagName === 'SPAN' ? fig(t)
                                   : (t.closest ? t.closest('svg.hifig') : null);
    paint(svg, null);
  }

  /* the "hide the foot" button under a figure */
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.siltog') : null;
    if (!b) return;
    var svg = fig(b);
    if (!svg) return;
    var off = svg.classList.toggle('nosil');
    var what = (b.textContent.match(/the (\w+)/) || [0, 'foot'])[1];
    b.textContent = (off ? 'show the ' : 'hide the ') + what;
  }, true);

  document.addEventListener('pointerover', over, true);
  document.addEventListener('pointerout', out, true);
  /* a tap on a phone should latch rather than flicker */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('.hv') : null;
    if (!t) return;
    var svg = fig(t);
    if (!svg) return;
    var key = t.getAttribute('data-hi');
    var already = t.classList.contains('on');
    paint(svg, already ? null : key);
  }, true);
})();

window.DY = { dyn: dyn, walkAt: walkAt, comAt: comAt, cross: cross,
              fwdSolve: fwdSolve, tutorSolve: tutorSolve, G: G };
D.boot();
})();
