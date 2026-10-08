/* ======================================================================
   EPHE 341 — Static Analysis (lecture 19)

   One idea, applied twice.  When nothing is accelerating, ΣF = 0 and
   ΣM = 0, and those three scalar equations are enough to solve for forces
   you can never measure.

   His worked example is the gymnast's iron cross, and it reproduces to the
   digit: M = 6488 N, Rx = 5040 N, Ry = 3810 N.  The deck does not just
   restate it — the `forcetable` widget is his own force table, slides 18
   to 27, filling itself in row by row and solving live, with his five
   givens on sliders so you can watch the muscle force explode when the
   moment arm shortens.

   And it is applied a second time to a measured walking stance, which is
   the answer to his slide 28: internal forces cannot be measured, so here
   is a real foot, a real ground reaction force and a real ankle, solved
   the same way, giving an Achilles tendon force of 3.7 times body weight
   and an ankle joint reaction of 4.9.

   parts/selftest.js checks everything against values worked out
   independently in Python (scratchpad/mkst19.py).
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
   The statics, in one place.

   Everything in this deck reduces to the same three sums, so they live
   here and every figure calls them.  A force is {name, mag, deg, d} where
   `deg` is measured anticlockwise from the +x axis and `d` is the distance
   from the pivot along the +x axis -- which is enough for every problem in
   this lecture, because in all of them the segment is drawn along x and
   every force acts somewhere on it.

   `resolve` is the force table: one row per force, its two components, and
   the moment it makes about the pivot.  `iron` and `stance` are his
   gymnast and the measured walking stance, and both are just `resolve`
   with an unknown solved out of the moment column first.
   ====================================================================== */
var SD = window.ST19 || null;
var G = 9.81;

function comp(mag, deg) {
  var r = deg * Math.PI / 180;
  return [mag * Math.cos(r), mag * Math.sin(r)];
}

/* One row of the force table. `d` is the moment arm along x; a force that
   acts at the pivot has d = 0 and therefore no moment, which is why the
   joint reaction rows are always zero in the last column -- his slide 24
   says exactly that. */
function row(name, mag, deg, d) {
  var c = comp(mag, deg);
  return { name: name, mag: mag, deg: deg, d: d,
           fx: c[0], fy: c[1], M: d * c[1] };
}

/* The force table, summed. Pass the rows; get the three sums back. */
function resolve(rows) {
  var sx = 0, sy = 0, sm = 0;
  rows.forEach(function (r) { sx += r.fx; sy += r.fy; sm += r.M; });
  return { rows: rows, Fx: sx, Fy: sy, M: sm };
}

/* ---------------------------------------------------------------------
   His iron cross, slides 11 to 27.

   Shoulder at the origin, +x along the arm away from the body, +y up.
   The rings pull at `ring_deg` ABOVE the negative x axis, so their
   direction is 180 − ring_deg; the muscle pulls at `mus_deg` BELOW the
   negative x axis, so its direction is 180 + mus_deg.  Those two
   conventions are his, written out on his slide 11, and getting either
   one backwards changes the answer by thousands of newtons.
   --------------------------------------------------------------------- */
function iron(g) {
  var ringDir = 180 - g.ring_deg, musDir = 180 + g.mus_deg;
  var rings = row('rings', g.ring_F, ringDir, g.ring_d);
  var W = g.arm_m * G;
  var grav = row('gravity', W, -90, g.arm_d);
  var mu = comp(1, musDir);                    /* per newton of muscle force */
  var mArm = g.mus_d * mu[1];                  /* moment per newton */
  /* ΣM = 0 about the shoulder, where the two reactions have no moment */
  var M = mArm !== 0 ? -(rings.M + grav.M) / mArm : 0;
  var mus = row('muscle', M, musDir, g.mus_d);
  /* ΣFx = 0 and ΣFy = 0 give the two reactions */
  var Rx = -(rings.fx + grav.fx + mus.fx);
  var Ry = -(rings.fy + grav.fy + mus.fy);
  var rx = { name: 'Rx', mag: Math.abs(Rx), deg: Rx >= 0 ? 0 : 180, d: 0,
             fx: Rx, fy: 0, M: 0 };
  var ry = { name: 'Ry', mag: Math.abs(Ry), deg: Ry >= 0 ? 90 : -90, d: 0,
             fx: 0, fy: Ry, M: 0 };
  var all = [rings, grav, mus, rx, ry];
  var s = resolve(all);
  return { rows: all, rings: rings, grav: grav, mus: mus, W: W,
           M: M, Rx: Rx, Ry: Ry, R: Math.hypot(Rx, Ry),
           sumFx: s.Fx, sumFy: s.Fy, sumM: s.M,
           ratio: g.ring_d / g.mus_d };
}

/* ---------------------------------------------------------------------
   The measured walking stance, solved the same way.

   The foot is the free body.  The ground reaction force and its point of
   application are measured on a plate at 240 Hz; the ankle, knee, heel and
   toe are measured markers.  The Achilles pulls the calcaneus along the
   shank, from a point `ach` metres behind the ankle along the foot's long
   axis -- and that distance is the one number here that is not measured,
   so it is a slider and the figure says so.
   --------------------------------------------------------------------- */
function stance(W, k, ach) {
  k = Math.max(0, Math.min(W.ng - 1, Math.round(k)));
  var fx = W.fx[k], fy = W.fy[k];
  var cx = W.cx[k] / 100, cy = W.cy[k] / 100;
  var a = W.ank[k], kn = W.knee[k], h = W.heel[k], t = W.toe[k];
  var ax = a[0] / 100, ay = a[1] / 100;
  /* the moment the ground makes about the ankle */
  var Mgrf = (cx - ax) * fy - (cy - ay) * fx;
  /* the tendon's direction: along the shank, ankle toward knee */
  var sx = kn[0] / 100 - ax, sy = kn[1] / 100 - ay;
  var n = Math.hypot(sx, sy) || 1;
  var ux = sx / n, uy = sy / n;
  /* where it pulls: behind the ankle, along the foot's long axis */
  var fvx = t[0] / 100 - h[0] / 100, fvy = t[1] / 100 - h[1] / 100;
  var nf = Math.hypot(fvx, fvy) || 1;
  var px = ax - fvx / nf * ach, py = ay - fvy / nf * ach;
  var arm = (px - ax) * uy - (py - ay) * ux;     /* moment per newton */
  var F = Math.abs(arm) > 1e-9 ? -Mgrf / arm : 0;
  var Rx = -(fx + F * ux), Ry = -(fy + F * uy);
  return { k: k, fx: fx, fy: fy, cx: cx, cy: cy, ax: ax, ay: ay,
           kx: kn[0] / 100, ky: kn[1] / 100,
           hx: h[0] / 100, hy: h[1] / 100, tx: t[0] / 100, ty: t[1] / 100,
           px: px, py: py, ux: ux, uy: uy,
           Mgrf: Mgrf, arm: Math.abs(arm), F: F,
           Rx: Rx, Ry: Ry, R: Math.hypot(Rx, Ry),
           grf: Math.hypot(fx, fy) };
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
   1. EQUILIB — ΣF = 0 and ΣM = 0, and what each one catches

   His slides 3 and 4.  Two conditions, and students reliably believe the
   first one is enough.  So the figure gives you a bar with three forces
   you can drag, shows both sums live, and lets you find the state that
   every beginner finds first: forces balanced, moments not, and the bar
   spinning on the spot.

   The point that is hard to make with a static picture and easy here:
   ΣF = 0 stops it from going anywhere, ΣM = 0 stops it from turning, and
   you need BOTH, because neither implies the other.
   ====================================================================== */
D.register('equilib', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var PRE = {
    both: { n: 'In equilibrium',
            f: [{ m: 100, a: 90, x: -0.6 }, { m: 200, a: -90, x: 0 },
                { m: 100, a: 90, x: 0.6 }] },
    force: { n: 'Forces balance, moments do not',
             f: [{ m: 150, a: 90, x: -0.8 }, { m: 150, a: -90, x: 0.8 },
                 { m: 0, a: 90, x: 0 }] },
    mom:  { n: 'Moments balance, forces do not',
            f: [{ m: 150, a: 90, x: -0.8 }, { m: 150, a: 90, x: 0.8 },
                { m: 0, a: 90, x: 0 }] }
  };
  var S = { pre: 'both', drag: -1, t: 0, run: 1 };
  var F = PRE.both.f.map(function (q) { return { m: q.m, a: q.a, x: q.x }; });
  var LO = -1.0, HI = 1.0;

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 520 : 380,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function sums() {
    var sx = 0, sy = 0, sm = 0;
    F.forEach(function (q) {
      var p = comp(q.m, q.a);
      sx += p[0]; sy += p[1]; sm += q.x * p[1];
    });
    return { Fx: sx, Fy: sy, M: sm };
  }

  var geo = null;
  function draw() {
    var K = C(), q = sums();
    var bal = Math.abs(q.Fx) < 1 && Math.abs(q.Fy) < 1;
    var spin = Math.abs(q.M) < 1;
    ax.clear();
    var x0 = 90, x1 = ax.W - 90, w = x1 - x0;
    var X = function (v) { return x0 + (v - LO) / (HI - LO) * w; };
    var by = port ? 150 : 132;
    geo = { X: X, by: by, x0: x0, x1: x1 };

    /* the bar, drifting and turning if the sums are not zero */
    var dx = bal ? 0 : Math.max(-26, Math.min(26, q.Fx * 0.06 * Math.sin(S.t * 1.6)));
    var dy = bal ? 0 : Math.max(-26, Math.min(26, -q.Fy * 0.06 * Math.sin(S.t * 1.6)));
    var th = spin ? 0 : Math.max(-0.34, Math.min(0.34, -q.M * 0.004 * Math.sin(S.t * 1.9)));

    c.save();
    c.translate(X(0) + dx, by + dy);
    c.rotate(th);
    c.translate(-(X(0)), -by);
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(X(LO), by); c.lineTo(X(HI), by); c.stroke(); c.restore();
    pin(c, X(0), by, 7, { color: K.ACC, fill: K.PLATE });
    label(c, 'pivot', X(0), by + 24, { size: 10.5, color: K.ACC, weight: 650 });

    F.forEach(function (z, i) {
      if (z.m < 1) return;
      var p = comp(z.m, z.a), L = 0.42;
      arrow(c, X(z.x), by, X(z.x) + p[0] * L, by - p[1] * L,
            { color: i === S.drag ? K.ACC : K.BLUE, width: 3.4, head: 11 });
      label(c, fmt(z.m, 0) + ' N', X(z.x) + p[0] * L + (p[0] > 0 ? 18 : p[0] < 0 ? -18 : 0),
            by - p[1] * L - (p[1] > 0 ? 14 : -14),
            { size: 11.5, weight: 700, color: i === S.drag ? K.ACC : K.BLUE,
              plate: true });
      c.save(); c.fillStyle = i === S.drag ? K.ACC : K.BLUE;
      c.beginPath(); c.arc(X(z.x), by, 6, 0, 7); c.fill(); c.restore();
      label(c, minus(fmt(z.x, 2)) + ' m', X(z.x), by + 40,
            { size: 10.5, color: K.MUT, plate: true });
    });
    c.restore();

    /* ------------------------- the two conditions -------------------- */
    var ty = port ? 300 : 236;
    var cols = [['ΣFx', q.Fx, 'N'], ['ΣFy', q.Fy, 'N'],
                ['ΣM', q.M, 'N·m']];
    cols.forEach(function (r, i) {
      var cx = ax.W / 2 + (i - 1) * (port ? 140 : 230);
      var ok = Math.abs(r[1]) < 1;
      label(c, r[0] + ' =', cx - 10, ty,
            { size: 15, align: 'right', weight: 700, color: K.INK });
      label(c, (ok ? '0' : minus(fmt(r[1], 0))) + ' ' + r[2], cx + 10, ty,
            { size: 15, align: 'left', weight: 700, color: ok ? K.GRN : K.ACC });
    });

    var msg, col;
    if (bal && spin) { msg = 'in static equilibrium — it will not move and it will not turn'; col = K.GRN; }
    else if (bal) { msg = 'the forces cancel, so it will not go anywhere — but the moments do not, so it turns on the spot'; col = K.ACC; }
    else if (spin) { msg = 'the moments cancel, so it will not turn — but the forces do not, so the whole thing accelerates away'; col = K.ACC; }
    else { msg = 'neither condition is met: it accelerates and it turns'; col = K.ACC; }
    var ft = wrapLabel(c, 'Drag a force along the bar, or press a case below · ' +
             'the bar is drawn moving whenever a sum is not zero · an object in static ' +
             'equilibrium satisfies BOTH conditions, and neither one implies the other',
             ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
    wrapLabel(c, msg, ax.W / 2, ft - 20, ax.W - 40,
              { size: 12.5, weight: 650, color: col });
  }

  u.cv.setAttribute('data-prevent-swipe', '1');
  u.cv.style.touchAction = 'none';
  function hit(ev) {
    if (!geo) return -1;
    var r = u.cv.getBoundingClientRect();
    var px = (ev.clientX - r.left) / r.width * ax.W;
    var py = (ev.clientY - r.top) / r.height * ax.H;
    var best = -1, bd = 30;
    F.forEach(function (z, i) {
      if (z.m < 1) return;
      var d = Math.hypot(px - geo.X(z.x), py - geo.by);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  u.cv.addEventListener('pointerdown', function (ev) {
    S.drag = hit(ev);
    if (S.drag >= 0 && u.cv.setPointerCapture) u.cv.setPointerCapture(ev.pointerId);
  });
  u.cv.addEventListener('pointermove', function (ev) {
    if (S.drag < 0 || !geo) return;
    var r = u.cv.getBoundingClientRect();
    var px = (ev.clientX - r.left) / r.width * ax.W;
    var v = LO + (px - geo.x0) / (geo.x1 - geo.x0) * (HI - LO);
    F[S.drag].x = Math.max(LO, Math.min(HI, Math.round(v * 20) / 20));
    ev.preventDefault();
  });
  u.cv.addEventListener('pointerup', function () { S.drag = -1; });

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  keepOut(chips(row, Object.keys(PRE).map(function (k) { return [k, PRE[k].n]; }), S.pre,
    function (k) {
      S.pre = k; S.t = 0;
      F = PRE[k].f.map(function (q) { return { m: q.m, a: q.a, x: q.x }; });
    }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'Static equilibrium needs <b>two</b> conditions, and the second is the one ' +
    'people forget. Press the middle case: the two forces are equal and opposite, so ' +
    'ΣF is zero and the bar goes nowhere — and it spins, because they are not in ' +
    'line. Press the third: now the moments cancel and the forces do not, so it flies off ' +
    'without turning. Only the first case is equilibrium.';

  var raf = null, last = 0;
  function loop(t) {
    var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t; S.t += dt; draw();
    raf = requestAnimationFrame(loop);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; last = 0; }
  node._stop = stop;
  node._draw = function () { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };
  node._draw();
});


/* ======================================================================
   2. JRF — why the joint carries more than anything you are holding

   His slides 6 to 9.  Any applied force is accompanied by a joint
   reaction, and the reaction is not the mirror of the applied force --
   it is the mirror of the applied force PLUS the muscle, and the muscle
   is the big one.

   The figure holds a load in the hand and asks the two questions in his
   order: what moment does the load make about the elbow, what muscle
   force cancels it, and only then what the joint has to carry.  Move the
   load out and watch all three grow; move the muscle insertion in and
   watch the last two grow while the first stays put.
   ====================================================================== */
D.register('jrf', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { load: 50, dL: 0.32, dM: 0.04, aM: 75 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 560 : 390,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function solve() {
    var load = row('load', S.load, -90, S.dL);
    var mu = comp(1, S.aM);
    var arm = S.dM * mu[1];
    var M = arm !== 0 ? -load.M / arm : 0;
    var mus = row('muscle', M, S.aM, S.dM);
    var Rx = -(load.fx + mus.fx), Ry = -(load.fy + mus.fy);
    return { load: load, mus: mus, M: M, Rx: Rx, Ry: Ry,
             R: Math.hypot(Rx, Ry) };
  }

  function draw() {
    var K = C(), q = solve();
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.52;

    var box = { x: 10, y: 22, w: fw - 20, h: (port ? ax.H * 0.34 : ax.H - 96) };
    var sc = new Scene(c, box).fit(-0.10, -0.26, 0.42, 0.26, 10);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    /* the forearm */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 10; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sc.X(0), sc.Y(0)); c.lineTo(sc.X(S.dL + 0.04), sc.Y(0));
    c.stroke(); c.restore();
    pin(c, sc.X(0), sc.Y(0), 8);
    label(c, 'elbow', sc.X(0), sc.Y(0) - 26, { size: 11.5, weight: 700, color: K.INK });

    var FS = 0.00085;   /* metres of drawing per newton */
    force(c, sc, S.dM, 0, q.mus.fx * FS, q.mus.fy * FS, 1, K.ACC,
          'M = ' + fmt(q.M, 0) + ' N');
    force(c, sc, S.dL, 0, 0, -S.load * FS * 2.2, 1, K.BLUE,
          fmt(S.load, 0) + ' N');
    force(c, sc, 0, 0, q.Rx * FS, q.Ry * FS, 1, K.VIO,
          'R = ' + fmt(q.R, 0) + ' N');
    /* the two moment arms */
    [[S.dM, K.ACC, -0.10], [S.dL, K.BLUE, -0.16]].forEach(function (z) {
      c.save(); c.strokeStyle = z[1]; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(sc.X(0), sc.Y(z[2])); c.lineTo(sc.X(z[0]), sc.Y(z[2]));
      c.moveTo(sc.X(0), sc.Y(z[2]) - 5); c.lineTo(sc.X(0), sc.Y(z[2]) + 5);
      c.moveTo(sc.X(z[0]), sc.Y(z[2]) - 5); c.lineTo(sc.X(z[0]), sc.Y(z[2]) + 5);
      c.stroke(); c.restore();
      label(c, fmt(z[0], 2) + ' m', (sc.X(0) + sc.X(z[0])) / 2, sc.Y(z[2]) - 11,
            { size: 10.5, color: z[1], weight: 650, plate: true });
    });
    c.restore();

    /* ------------------------- the three steps ----------------------- */
    var px = port ? 16 : fw + 12, pw = port ? ax.W - 32 : ax.W - fw - 28;
    var py = port ? box.y + box.h + 44 : 48;
    var STEP = [
      ['1. the load makes a moment about the elbow',
       fmt(S.load, 0) + ' × ' + fmt(S.dL, 2) + ' = ' + fmt(Math.abs(q.load.M), 1) +
       ' N·m', K.BLUE],
      ['2. the muscle must cancel it, from ' + fmt(S.dM, 2) + ' m',
       'M = ' + fmt(Math.abs(q.load.M), 1) + ' / (' + fmt(S.dM, 2) + ' sin' +
       fmt(S.aM, 0) + '°) = ' + fmt(q.M, 0) + ' N', K.ACC],
      ['3. the joint carries whatever is left over',
       'R = ' + fmt(q.R, 0) + ' N, which is ' + fmt(q.R / Math.max(S.load, 1), 1) +
       ' times the load', K.VIO]
    ];
    STEP.forEach(function (s, i) {
      var yy = py + i * (port ? 62 : 66);
      label(c, s[0], px, yy, { size: 12, align: 'left', weight: 700, color: s[2] });
      label(c, s[1], px, yy + 22, { size: 13, align: 'left', weight: 600, color: K.MUT });
    });

    var ft = wrapLabel(c, 'The joint reaction is not the mirror of the load · it is the ' +
             'mirror of the load AND the muscle, and the muscle is always the larger of the ' +
             'two because its moment arm is always the shorter one',
             ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
    label(c, 'holding ' + fmt(S.load, 0) + ' N costs the elbow ' + fmt(q.R, 0) + ' N',
          ax.W / 2, ft - 20,
          { size: 12.5, weight: 650, color: q.R > 6 * S.load ? K.ACC : K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sl = slider(u.ctl, 'The load', 0, 200, 5, S.load,
                  function (v) { return fmt(v, 0) + ' N'; },
                  function (v) { S.load = v; draw(); });
  var sd = slider(u.ctl, 'How far out it is', 0.10, 0.40, 0.01, S.dL,
                  function (v) { return fmt(v, 2) + ' m'; },
                  function (v) { S.dL = v; draw(); });
  var sm = slider(u.ctl, 'Where the muscle inserts', 0.02, 0.10, 0.005, S.dM,
                  function (v) { return fmt(v, 3) + ' m'; },
                  function (v) { S.dM = v; draw(); });
  sl.quiet(S.load); sd.quiet(S.dL); sm.quiet(S.dM);
  var rd = readout(u.ctl);
  rd.innerHTML = 'Hold fifty newtons in your hand and your elbow carries several hundred. ' +
    'The reason is the third slider: the muscle inserts a few centimetres from the joint ' +
    'and the load is a third of a metre away, so the muscle has to be <b>many times ' +
    'larger</b> than the load just to balance its moment — and the joint has to carry ' +
    'both. Slide the insertion in toward the joint and watch what it costs.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   3. FBD — the free body diagram, built the way he builds it

   His slides 12 to 17.  Four steps, one force each, in his order: the
   reaction at the shoulder first (because you know it is there before you
   know how big it is), then the muscle, then gravity, then the rings.

   In the source those four steps are four screenshots of a Flash
   application, complete with a Windows title bar.  This draws them.

   The step that matters is the first one, and it is the one students skip:
   the arm is cut free of the body, and the body is replaced by two unknown
   forces.  Nothing can be solved until that cut is made.
   ====================================================================== */
D.register('fbd', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var D0 = window.ST19;
  if (!D0) return;
  var g = D0.iron.given, Q = iron(g);
  var S = { step: 1 };

  var STEPS = [
    ['Cut the arm free',
     'Draw the segment on its own. Everything the rest of the body was doing to ' +
     'it becomes a force at the cut — here, two unknowns at the shoulder.'],
    ['Draw the reaction forces',
     'Vertical (Rᵧ) and horizontal (Rₓ) at the shoulder. You do not know ' +
     'their size yet, which is fine; you know they are there.'],
    ['Draw the muscle force',
     'Direction, magnitude and point of application — ' + fmt(g.mus_d, 2) +
     ' m from the shoulder, ' + fmt(g.mus_deg, 0) + '° below the negative x axis. ' +
     'Magnitude unknown, so call it M.'],
    ['Draw the gravitational force',
     'The weight of the arm: ' + fmt(g.arm_m, 1) + ' kg × 9.81 = ' +
     fmt(Q.W, 1) + ' N, straight down, at the arm’s centre of gravity ' +
     fmt(g.arm_d, 2) + ' m out.'],
    ['Draw the force of the rings',
     fmt(g.ring_F, 0) + ' N at ' + fmt(g.ring_d, 2) + ' m, ' + fmt(g.ring_deg, 0) +
     '° above the negative x axis. This one is measured, so it is the only ' +
     'force on the diagram you know completely.']
  ];

  var ax = new Axes(u.cv, { w: port ? 460 : 1020, h: port ? 540 : 390,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function draw() {
    var K = C();
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.58;
    var box = { x: 10, y: 24, w: fw - 20, h: (port ? ax.H * 0.46 : ax.H - 92) };
    var sc = new Scene(c, box).fit(-0.22, -0.46, 1.02, 0.46, 10);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    /* the body, faint, until it is cut away */
    if (S.step === 0) {
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 8; c.lineCap = 'round';
      c.globalAlpha = .6;
      c.beginPath();
      c.moveTo(sc.X(-0.06), sc.Y(0.22)); c.lineTo(sc.X(-0.06), sc.Y(-0.40));
      c.stroke();
      c.beginPath(); c.arc(sc.X(-0.06), sc.Y(0.30), sc.L(0.075), 0, 7); c.stroke();
      c.restore();
      label(c, 'the rest of the gymnast', sc.X(-0.06), sc.Y(-0.44),
            { size: 11, color: K.MUT });
    }

    /* the arm */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sc.X(0), sc.Y(0)); c.lineTo(sc.X(g.ring_d), sc.Y(0));
    c.stroke(); c.restore();
    /* the axes, as his FBD draws them */
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1.4; c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(sc.X(-0.18), sc.Y(0)); c.lineTo(sc.X(1.0), sc.Y(0));
    c.moveTo(sc.X(0), sc.Y(-0.40)); c.lineTo(sc.X(0), sc.Y(0.40));
    c.stroke(); c.restore();
    label(c, 'x', sc.X(1.0), sc.Y(0) + 15, { size: 11, color: K.MUT });
    label(c, 'y', sc.X(0) - 13, sc.Y(0.40), { size: 11, color: K.MUT });
    pin(c, sc.X(0), sc.Y(0), 8);
    label(c, 'shoulder', sc.X(0) - 14, sc.Y(0) - 24,
          { size: 11.5, align: 'right', weight: 700, color: K.INK });

    var FS = 0.00011;    /* drawing metres per newton */
    if (S.step >= 1) {
      arrow(c, sc.X(0), sc.Y(0), sc.X(0) - sc.L(0) + 0, sc.Y(0.20),
            { color: K.VIO, width: 3, head: 10 });
      arrow(c, sc.X(0), sc.Y(0), sc.X(0.17), sc.Y(0),
            { color: K.VIO, width: 3, head: 10 });
      label(c, 'Rᵧ', sc.X(0) + 12, sc.Y(0.22),
            { size: 12.5, align: 'left', color: K.VIO, weight: 700, plate: true });
      label(c, 'Rₓ', sc.X(0.19), sc.Y(0) - 14,
            { size: 12.5, align: 'left', color: K.VIO, weight: 700, plate: true });
    }
    if (S.step >= 2) {
      var md = comp(1, 180 + g.mus_deg);
      arrow(c, sc.X(g.mus_d), sc.Y(0),
            sc.X(g.mus_d + md[0] * 0.26), sc.Y(md[1] * 0.26),
            { color: K.ACC, width: 3.4, head: 11 });
      label(c, 'M', sc.X(g.mus_d + md[0] * 0.30), sc.Y(md[1] * 0.30),
            { size: 14, color: K.ACC, weight: 700, plate: true });
      label(c, fmt(g.mus_deg, 0) + '°', sc.X(g.mus_d) - 22, sc.Y(-0.055),
            { size: 10.5, color: K.ACC, plate: true });
    }
    if (S.step >= 3) {
      force(c, sc, g.arm_d, 0, 0, -Q.W * FS * 7, 1, K.BLUE,
            'mg = ' + fmt(Q.W, 1) + ' N');
    }
    if (S.step >= 4) {
      var rd2 = comp(1, 180 - g.ring_deg);
      arrow(c, sc.X(g.ring_d), sc.Y(0),
            sc.X(g.ring_d + rd2[0] * 0.30), sc.Y(rd2[1] * 0.30),
            { color: K.GRN, width: 3.4, head: 11 });
      label(c, fmt(g.ring_F, 0) + ' N', sc.X(g.ring_d + rd2[0] * 0.34),
            sc.Y(rd2[1] * 0.34) - 4,
            { size: 12.5, color: K.GRN, weight: 700, plate: true });
      label(c, g.ring_deg + '°', sc.X(g.ring_d) + 20, sc.Y(-0.05),
            { size: 10.5, color: K.GRN, plate: true });
    }
    /* the dimensions, as each force arrives */
    var DIMS = [[2, g.mus_d, K.ACC, -0.22], [3, g.arm_d, K.BLUE, -0.30],
                [4, g.ring_d, K.GRN, -0.38]];
    DIMS.forEach(function (z) {
      if (S.step < z[0]) return;
      c.save(); c.strokeStyle = z[2]; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(sc.X(0), sc.Y(z[3])); c.lineTo(sc.X(z[1]), sc.Y(z[3]));
      c.moveTo(sc.X(0), sc.Y(z[3]) - 5); c.lineTo(sc.X(0), sc.Y(z[3]) + 5);
      c.moveTo(sc.X(z[1]), sc.Y(z[3]) - 5); c.lineTo(sc.X(z[1]), sc.Y(z[3]) + 5);
      c.stroke(); c.restore();
      label(c, fmt(z[1], 2) + ' m', (sc.X(0) + sc.X(z[1])) / 2, sc.Y(z[3]) - 11,
            { size: 10.5, color: z[2], weight: 650, plate: true });
    });
    c.restore();

    /* --------------------------- the caption ------------------------- */
    var px = port ? 16 : fw + 12, pw = port ? ax.W - 32 : ax.W - fw - 28;
    var py = port ? box.y + box.h + 46 : 56;
    label(c, 'Step ' + (S.step + 1) + ' of 5', px, py,
          { size: 11.5, align: 'left', weight: 700, color: K.MUT });
    label(c, STEPS[S.step][0], px, py + 26,
          { size: 15, align: 'left', weight: 700, color: K.INK });
    var top = py + 54;
    wrapLabel(c, STEPS[S.step][1], px + pw / 2, top + 58, pw,
              { size: 12, color: K.MUT });

    wrapLabel(c, 'Every force on this diagram acts on the ARM, and nothing on it acts on ' +
              'anything else · that is what makes it a free body diagram, and it is why ' +
              'the three sums can be written down',
              ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls';
  var row2 = ctlRow(u.ctl);
  keepOut(chips(row2, STEPS.map(function (s, i) { return [i, s[0]]; }), 1,
    function (k) { S.step = +k; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'A free body diagram is not a drawing of the situation — it is a drawing ' +
    'of <b>one object with every force that acts on it and nothing else</b>. Step through his ' +
    'five. The one students skip is the first: cutting the arm away from the body, and ' +
    'replacing the body with two unknown forces. Until that cut is made there is nothing to ' +
    'sum.';

  node._draw = draw;
  S.step = 1;
  draw();
});

/* ======================================================================
   4. FORCETABLE — his force table, filling itself in

   This is the deck's anchor.  His slides 18 to 27 are ten screenshots of
   one table being filled in a cell at a time, in a fixed order, with the
   cell just added picked out in red.  It is a good way to teach it, and it
   is a better way to teach it when the table is live.

   So: the same table, the same order, the same red highlight, and the
   three equations solving at the bottom as the rows complete.  And then
   the part a screenshot cannot do -- his five givens on sliders, so that
   when the muscle's moment arm halves you watch M double.

   His answers, which this reproduces exactly:
       M  = 6488 N      Rx = 5040 N      Ry = 3810 N
   ====================================================================== */
D.register('forcetable', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var D0 = window.ST19;
  if (!D0) return;
  var base = D0.iron.given;
  var g = { ring_F: base.ring_F, ring_d: base.ring_d, ring_deg: base.ring_deg,
            arm_m: base.arm_m, arm_d: base.arm_d,
            mus_d: base.mus_d, mus_deg: base.mus_deg };
  /* the fill order is his: rings x, rings y, rings M, gravity, muscle,
     reactions, then the three equations */
  var S = { cell: 11, auto: 0 };
  var NCELL = 12;

  var ax = new Axes(u.cv, { w: port ? 460 : 1060, h: port ? 530 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* which cells are lit at a given step: [row, col] with col 0..2 */
  var ORDER = [[0, 0], [0, 1], [0, 2],          /* rings */
               [1, 0], [1, 1], [1, 2],          /* gravity */
               [2, 0], [2, 1], [2, 2],          /* muscle */
               [3, 0], [4, 1],                  /* Rx, Ry */
               [-1, -1]];                       /* everything, then solve */

  function solve() { return iron(g); }

  function cellText(q, r, col) {
    var f = fmt;
    if (r === 0) return [
      '−' + f(g.ring_F, 0) + 'cos' + f(g.ring_deg, 0) + '°',
      f(g.ring_F, 0) + 'sin' + f(g.ring_deg, 0) + '°',
      f(g.ring_F, 0) + '(' + f(g.ring_d, 2) + 'sin' + f(g.ring_deg, 0) + '°)'][col];
    if (r === 1) return [
      '0',
      '−' + f(g.arm_m, 1) + '(9.81)',
      '−' + f(g.arm_m, 1) + '(9.81)(' + f(g.arm_d, 2) + ')'][col];
    if (r === 2) return [
      '−Mcos' + f(g.mus_deg, 0) + '°',
      '−Msin' + f(g.mus_deg, 0) + '°',
      '−M(' + f(g.mus_d, 2) + 'sin' + f(g.mus_deg, 0) + '°)'][col];
    if (r === 3) return ['Rₓ', '0', '0'][col];
    return ['0', 'Rᵧ', '0'][col];
  }
  function cellVal(q, r, col) {
    var R = [q.rings, q.grav, q.mus][r];
    if (r < 3) return [R.fx, R.fy, R.M][col];
    if (r === 3) return [q.Rx, 0, 0][col];
    return [0, q.Ry, 0][col];
  }

  function lit(r, col) {
    if (S.cell >= NCELL - 1) return true;
    for (var i = 0; i <= S.cell; i++)
      if (ORDER[i][0] === r && ORDER[i][1] === col) return true;
    return false;
  }
  function isNow(r, col) {
    var o = ORDER[Math.min(S.cell, NCELL - 1)];
    return o[0] === r && o[1] === col;
  }

  function draw() {
    var K = C(), q = solve();
    ax.clear();

    /* ------------------------------ the table ------------------------ */
    var x0 = port ? 8 : 26;
    var tw = port ? ax.W - 16 : ax.W * 0.62;
    var colw = [tw * 0.19, tw * 0.25, tw * 0.25, tw * 0.31];
    var cx = [x0];
    for (var i = 0; i < 4; i++) cx.push(cx[i] + colw[i]);
    var ty = 46, rh = port ? 34 : 32;
    var HEAD = ['Force', 'X component', 'Y component', 'Moment'];
    var ROWS = ['rings', 'gravity', 'muscle', 'Rₓ', 'Rᵧ'];

    label(c, 'Force Table', x0 + tw / 2, ty - 26,
          { size: 13, weight: 700, color: K.INK });
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
    for (var r = 0; r <= ROWS.length + 1; r++) {
      c.beginPath(); c.moveTo(x0, ty + r * rh); c.lineTo(x0 + tw, ty + r * rh); c.stroke();
    }
    for (var j = 0; j <= 4; j++) {
      c.beginPath(); c.moveTo(cx[j], ty); c.lineTo(cx[j], ty + (ROWS.length + 1) * rh);
      c.stroke();
    }
    c.restore();
    HEAD.forEach(function (h, j) {
      label(c, h, cx[j] + colw[j] / 2, ty + rh / 2,
            { size: port ? 10.5 : 11.5, weight: 700, color: K.MUT });
    });
    ROWS.forEach(function (nm, r) {
      var yy = ty + (r + 1) * rh + rh / 2;
      var rowOn = lit(r, 0) || lit(r, 1) || lit(r, 2);
      label(c, nm, cx[0] + colw[0] / 2, yy,
            { size: port ? 11 : 12, weight: rowOn ? 700 : 600,
              color: rowOn ? K.INK : K.GRID });
      for (var col = 0; col < 3; col++) {
        if (!lit(r, col)) continue;
        var now = isNow(r, col);
        if (now) {
          c.save(); c.fillStyle = K.ACCFILL;
          c.fillRect(cx[col + 1] + 1, ty + (r + 1) * rh + 1, colw[col + 1] - 2, rh - 2);
          c.restore();
        }
        label(c, cellText(q, r, col), cx[col + 1] + colw[col + 1] / 2, yy,
              { size: port ? 9.5 : 11, weight: now ? 700 : 600,
                color: now ? K.ACC : K.INK });
      }
    });

    /* ------------------------- the three equations ------------------- */
    var ey = ty + (ROWS.length + 1) * rh + (port ? 30 : 34);
    var done = S.cell >= NCELL - 1;
    var EQ = [
      ['ΣM = 0', fmt(q.rings.M, 2) + ' − ' + fmt(Math.abs(q.grav.M), 2) +
       ' − M(' + fmt(g.mus_d * Math.abs(comp(1, 180 + g.mus_deg)[1]), 4) + ') = 0',
       'M = ' + fmt(q.M, 0) + ' N', K.ACC],
      ['ΣFₓ = 0', fmt(q.rings.fx, 1) + ' + 0 + ' + fmt(q.mus.fx, 0) +
       ' + Rₓ = 0', 'Rₓ = ' + fmt(q.Rx, 0) + ' N', K.VIO],
      ['ΣFᵧ = 0', fmt(q.rings.fy, 1) + ' − ' + fmt(q.W, 1) + ' + ' +
       fmt(q.mus.fy, 0) + ' + Rᵧ = 0', 'Rᵧ = ' + fmt(q.Ry, 0) + ' N', K.VIO]
    ];
    if (port) {
      EQ.forEach(function (e, i) {
        var yy = ey + i * 44;
        label(c, e[0], x0, yy, { size: 13, align: 'left', weight: 700,
                                 color: done ? e[3] : K.GRID });
        if (done) label(c, e[2], x0 + 90, yy,
                        { size: 14, align: 'left', weight: 700, color: e[3] });
        if (done) label(c, e[1], x0, yy + 18,
                        { size: 10, align: 'left', color: K.MUT });
      });
    } else {
      var ex = x0 + tw + 24, ew = ax.W - ex - 20;
      label(c, 'the three equations', ex, 46,
            { size: 12.5, align: 'left', weight: 700, color: K.INK });
      EQ.forEach(function (e, i) {
        var yy = 46 + 34 + i * 76;
        label(c, e[0], ex, yy, { size: 14, align: 'left', weight: 700,
                                 color: done ? e[3] : K.GRID });
        if (!done) return;
        wrapLabel(c, e[1], ex + ew / 2, yy + 34, ew,
                  { size: 10.5, color: K.MUT });
        label(c, e[2], ex, yy + 52,
              { size: 16, align: 'left', weight: 700, color: e[3] });
      });
    }

    /* the checks, and the comparison with his printed answers */
    var ft = wrapLabel(c, 'His slides 18 to 27 · ' + fmt(g.ring_F, 0) + ' N at ' +
             fmt(g.ring_d, 2) + ' m and ' + fmt(g.ring_deg, 0) + '°, a ' +
             fmt(g.arm_m, 1) + ' kg arm at ' + fmt(g.arm_d, 2) + ' m, the muscle at ' +
             fmt(g.mus_d, 2) + ' m and ' + fmt(g.mus_deg, 0) + '° · every row is ' +
             'his, and the sliders move his givens',
             ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
    if (done) {
      var same = Math.abs(q.M - D0.iron.his.M) < 1.5 &&
                 Math.abs(q.Rx - D0.iron.his.Rx) < 1.5 &&
                 Math.abs(q.Ry - D0.iron.his.Ry) < 1.5;
      label(c, same
            ? 'his printed answers: M = 6488 N, Rₓ = 5040 N, Rᵧ = 3810 N — ' +
              'the same, to the newton'
            : 'the muscle force is now ' + fmt(q.M / Math.max(q.W, 1e-6), 0) +
              ' times the weight of the arm, from a moment arm ratio of ' +
              fmt(q.ratio, 1) + ' : 1',
            ax.W / 2, ft - 20,
            { size: 12.5, weight: 650, color: same ? K.GRN : K.ACC });
    }
  }

  u.ctl.className = 'ictls g2';
  var sF = slider(u.ctl, 'Ring force', 100, 700, 10, g.ring_F,
                  function (v) { return fmt(v, 0) + ' N'; },
                  function (v) { g.ring_F = v; draw(); });
  var sD = slider(u.ctl, 'Muscle insertion', 0.02, 0.20, 0.005, g.mus_d,
                  function (v) { return fmt(v, 3) + ' m'; },
                  function (v) { g.mus_d = v; draw(); });
  var sA = slider(u.ctl, 'Muscle angle', 10, 80, 1, g.mus_deg,
                  function (v) { return fmt(v, 0) + '°'; },
                  function (v) { g.mus_deg = v; draw(); });
  sF.quiet(g.ring_F); sD.quiet(g.mus_d); sA.quiet(g.mus_deg);
  var row2 = ctlRow(u.ctl);
  var hb = el('button', 'icalc-chip', 'His numbers');
  hb.addEventListener('click', function () {
    g.ring_F = base.ring_F; g.mus_d = base.mus_d; g.mus_deg = base.mus_deg;
    sF.quiet(g.ring_F); sD.quiet(g.mus_d); sA.quiet(g.mus_deg);
    S.cell = NCELL - 1; draw();
  });
  row2.appendChild(hb);
  seg(row2, [[0, 'Build it up'], [NCELL - 1, 'Show it all']],
      NCELL - 1, function (v) { S.cell = +v; draw(); });
  /* fit.js's prewarm presses every chip and segment button it is not told to
     leave alone, and "Build it up" empties the table -- which is then what
     the handout and the first paint show. Mark the whole row, not just the
     segmented control: the chip beside it is in the same row. */
  keepOut(row2);
  /* fit.js's prewarm presses every .ibtn that is not marked, and this one
     does not merely animate a position -- it changes what the figure shows,
     so an unmarked play button is what the handout ends up frozen on. */
  var pb = playBtn(u.ctl, '▶ Fill the table');
  pb.setAttribute('data-unsafe', '1');
  var rd = readout(u.ctl);
  rd.innerHTML = 'Each force gets a row; each row gets its two components and the moment it ' +
    'makes about the shoulder. The two reaction rows have <b>no moment</b>, because they act ' +
    'at the point we are taking moments about — which is exactly why you take moments ' +
    'there, and why the moment equation has only one unknown in it. Then the sliders: halve ' +
    'the muscle’s insertion distance and watch M double.';

  var raf = null, t0 = 0;
  function tick(t) {
    if (!t0) t0 = t;
    var k = Math.floor((t - t0) / 620);
    if (k >= NCELL) { S.cell = NCELL - 1; draw(); stop(); return; }
    S.cell = k; draw();
    raf = requestAnimationFrame(tick);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; t0 = 0;
                    pb.textContent = '▶ Fill the table'; }
  pb.addEventListener('click', function () {
    if (raf) { stop(); return; }
    S.cell = 0; pb.textContent = '❚❚ Stop'; t0 = 0;
    raf = requestAnimationFrame(tick);
  });
  node._stop = stop;
  node._draw = draw;
  draw();
});

/* ======================================================================
   5. ADVANTAGE — why the number came out so big

   6488 N is a startling answer and his slide 28 says so: "the muscle force
   required to hold that position was extremely large".  The reason is one
   ratio, and this figure is that ratio.

   The muscle pulls from 0.08 m.  The rings pull from 0.88 m.  Eleven to
   one, and the muscle is on the wrong end of it, so it has to be about
   eleven times the ring force times a trigonometric correction -- 16.2
   times, as it turns out, because the two forces also point in different
   directions.

   The curve is M against the insertion distance, which is the only one of
   his five givens that anatomy actually fixes.  It is a hyperbola, so the
   last centimetre of insertion distance is worth more than the first ten.
   ====================================================================== */
D.register('advantage', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var D0 = window.ST19;
  if (!D0) return;
  var base = D0.iron.given;
  var S = { d: base.mus_d };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 580 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function at(d) {
    var g = {};
    for (var k in base) g[k] = base[k];
    g.mus_d = d;
    return iron(g);
  }

  function draw() {
    var K = C(), q = at(S.d);
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.40;

    /* --------------------- the two moment arms ----------------------- */
    var box = { x: 10, y: 24, w: fw - 20, h: (port ? ax.H * 0.24 : ax.H - 140) };
    var sc = new Scene(c, box).fit(-0.08, -0.34, 1.00, 0.20, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sc.X(0), sc.Y(0)); c.lineTo(sc.X(base.ring_d), sc.Y(0));
    c.stroke(); c.restore();
    pin(c, sc.X(0), sc.Y(0), 7);
    [[S.d, K.ACC, -0.13, 'the muscle'], [base.ring_d, K.GRN, -0.26, 'the rings']]
      .forEach(function (z) {
        c.save(); c.strokeStyle = z[1]; c.lineWidth = 2;
        c.beginPath(); c.moveTo(sc.X(0), sc.Y(z[2])); c.lineTo(sc.X(z[0]), sc.Y(z[2]));
        c.moveTo(sc.X(0), sc.Y(z[2]) - 6); c.lineTo(sc.X(0), sc.Y(z[2]) + 6);
        c.moveTo(sc.X(z[0]), sc.Y(z[2]) - 6); c.lineTo(sc.X(z[0]), sc.Y(z[2]) + 6);
        c.stroke(); c.restore();
        label(c, z[3] + ', ' + fmt(z[0], 2) + ' m',
              (sc.X(0) + sc.X(z[0])) / 2, sc.Y(z[2]) - 12,
              { size: 11, color: z[1], weight: 650, plate: true });
      });
    c.save(); c.fillStyle = K.ACC;
    c.beginPath(); c.arc(sc.X(S.d), sc.Y(0), 6, 0, 7); c.fill(); c.restore();
    c.save(); c.fillStyle = K.GRN;
    c.beginPath(); c.arc(sc.X(base.ring_d), sc.Y(0), 6, 0, 7); c.fill(); c.restore();
    c.restore();
    label(c, 'a ' + fmt(base.ring_d / S.d, 1) + ' : 1 disadvantage',
          box.x + box.w / 2, box.y + box.h + 14,
          { size: 12.5, weight: 700, color: K.ACC });

    /* ---------------------- M against insertion ---------------------- */
    var px = port ? 0 : fw, py = port ? box.y + box.h + 58 : 40;
    var ph = port ? ax.H - py - 168 : ax.H - 142;
    var a2 = sub(ax, px + 70, py, 26, ax.H - (py + ph));
    var LO = 0.02, HI = 0.20;
    var hi = at(LO).M * 1.08;
    a2.setRange(LO, HI, 0, hi);
    a2.frame({ grid: true, xticks: [0.05, 0.10, 0.15, 0.20],
               yticks: axisTicks(0, hi),
               yfmt: function (v) { return (v / 1000).toFixed(0) + 'k'; } });
    a2.fn(function (d) { return at(d).M; }, { color: K.ACC, width: 2.8 });
    /* his own point */
    c.save(); c.strokeStyle = K.GRN; c.lineWidth = 1.6; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(a2.X(base.mus_d), a2.Y(0));
    c.lineTo(a2.X(base.mus_d), a2.Y(hi)); c.stroke(); c.restore();
    a2.dots([[base.mus_d, at(base.mus_d).M]], { color: K.GRN, r: 5 });
    label(c, 'his 0.08 m', a2.X(base.mus_d) + 8, a2.Y(at(base.mus_d).M) - 16,
          { size: 11, align: 'left', color: K.GRN, weight: 650, plate: true });
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(a2.X(S.d), a2.Y(0)); c.lineTo(a2.X(S.d), a2.Y(hi));
    c.stroke(); c.restore();
    a2.dots([[S.d, q.M]], { color: K.ACC, r: 5.5 });
    label(c, 'muscle force needed (N)', (a2.pl + ax.W - a2.pr) / 2, py - 12,
          { size: 12.5, weight: 700, color: K.INK });
    label(c, 'how far from the joint the muscle inserts (m)',
          (a2.pl + ax.W - a2.pr) / 2, ax.H - a2.pb + 30,
          { size: 12, weight: 700, color: K.INK });

    var ft = wrapLabel(c, 'Every other given is a choice; this one is anatomy · the curve ' +
             'is a hyperbola, so a centimetre of insertion distance is worth far more near the ' +
             'joint than far from it · that is also why a torn-off tendon reattached a ' +
             'centimetre too close is a permanent loss of strength',
             ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
    label(c, 'at ' + fmt(S.d, 3) + ' m the muscle needs ' + fmt(q.M, 0) + ' N — ' +
             fmt(q.M / base.ring_F, 1) + ' times the ring force, and ' +
             fmt(q.M / q.W, 0) + ' times the weight of the arm',
          ax.W / 2, ft - 20, { size: 12.5, weight: 650,
                               color: q.M > 4000 ? K.ACC : K.GRN });
  }

  u.ctl.className = 'ictls g2';
  var sd = slider(u.ctl, 'Where the muscle inserts', 0.02, 0.20, 0.002, S.d,
                  function (v) { return fmt(v, 3) + ' m'; },
                  function (v) { S.d = v; draw(); });
  sd.quiet(S.d);
  var rd = readout(u.ctl);
  rd.innerHTML = 'The answer was 6488 N because of one ratio: the rings pull from 0.88 m and ' +
    'the muscle pulls from 0.08 m. <b>Muscles are always on the wrong end of the lever</b>, ' +
    'and they are so for a reason — a short moment arm means a small muscle shortening ' +
    'produces a large, fast movement at the hand. You pay for speed and range with force.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   6. ACHILLES — the same three equations, on a real foot

   His slide 28 says internal forces cannot be measured directly, and that
   static analysis is how you estimate them.  That is exactly right, and it
   is checkable, so this figure does it on measured data.

   One recorded walking stance (Subject16, 55 kg, Lencioni et al. 2019).
   The foot is the free body.  The ground reaction force and the point it
   acts through are measured on a plate at 240 Hz.  The ankle, knee, heel
   and toe are measured markers.  Take moments about the ankle, and the
   Achilles tendon force falls out; then the two force sums give the ankle
   joint reaction.

   At the peak the answer is a tendon force of 3.7 times body weight and a
   joint reaction of 4.9 -- while the floor is pushing with only 1.26.
   All of the difference is muscle, which is the same sentence as the
   gymnast, said about someone just walking down a corridor.

   The honest part.  A static analysis ignores the foot's own weight and
   its acceleration, so it is an approximation.  The authors published
   their own inverse-dynamics ankle moment for this very stride, and the
   figure draws it alongside: 1.51 N·m/kg against this calculation's 1.74.
   A 15% overestimate, named on the figure rather than hidden.
   ====================================================================== */
D.register('achilles', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var D0 = window.ST19;
  if (!D0) return;
  var W = D0.walk;
  var BW = W.mass_kg * 9.81;
  var S = { k: W.kpk, ach: W.ach_d, show: 'f' };

  var ax = new Axes(u.cv, { w: port ? 460 : 1060, h: port ? 620 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function draw() {
    var K = C(), q = stance(W, S.k, S.ach);
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.44;

    /* --------------------------- the foot ---------------------------- */
    var box = { x: 8, y: 22, w: fw - 18, h: (port ? ax.H * 0.32 : ax.H - 96) };
    var sc = new Scene(c, box).fit(-0.06, -0.04, 0.34, 0.26, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    /* the floor */
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(sc.X(-0.06), sc.Y(0)); c.lineTo(sc.X(0.34), sc.Y(0));
    c.stroke(); c.restore();

    /* the foot, drawn relative to the ankle so it sits still in the frame */
    var ox = q.ax, oy = 0;
    function P(x, y) { return [x - ox + 0.09, y]; }
    var hp = P(q.hx, q.hy), tp = P(q.tx, q.ty), apn = P(q.ax, q.ay);
    var kp = P(q.kx, q.ky), cp = P(q.cx, q.cy), pp = P(q.px, q.py);
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 9; c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(sc.X(hp[0]), sc.Y(hp[1]));
    c.lineTo(sc.X(apn[0]), sc.Y(apn[1]));
    c.lineTo(sc.X(tp[0]), sc.Y(tp[1]));
    c.lineTo(sc.X(hp[0]), sc.Y(hp[1]));
    c.stroke(); c.restore();
    /* the shank, faint -- it is not part of the free body */
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 7; c.lineCap = 'round';
    c.setLineDash([8, 6]); c.globalAlpha = .7;
    c.beginPath(); c.moveTo(sc.X(apn[0]), sc.Y(apn[1]));
    c.lineTo(sc.X(kp[0]), sc.Y(Math.min(kp[1], 0.24))); c.stroke(); c.restore();
    pin(c, sc.X(apn[0]), sc.Y(apn[1]), 7);
    label(c, 'ankle', sc.X(apn[0]) + 13, sc.Y(apn[1]) - 12,
          { size: 11.5, align: 'left', weight: 700, color: K.INK, plate: true });

    var FS = 0.000055;
    /* the measured ground reaction force, at the measured centre of pressure */
    force(c, sc, cp[0], cp[1], q.fx * FS, q.fy * FS, 1, K.GRN,
          fmt(q.grf, 0) + ' N');
    c.save(); c.fillStyle = K.GRN;
    c.beginPath(); c.arc(sc.X(cp[0]), sc.Y(cp[1]), 5, 0, 7); c.fill(); c.restore();
    label(c, 'CoP', sc.X(cp[0]), sc.Y(cp[1]) + 16,
          { size: 10.5, color: K.GRN, weight: 650, plate: true });
    /* the tendon */
    force(c, sc, pp[0], pp[1], q.ux * q.F * FS, q.uy * q.F * FS, 1, K.ACC,
          'F = ' + fmt(q.F, 0) + ' N');
    /* the joint reaction */
    force(c, sc, apn[0], apn[1], q.Rx * FS, q.Ry * FS, 1, K.VIO,
          'R = ' + fmt(q.R, 0) + ' N');
    /* the moment arm the whole thing turns on */
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.6; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(sc.X(apn[0]), sc.Y(apn[1]));
    c.lineTo(sc.X(pp[0]), sc.Y(pp[1])); c.stroke(); c.restore();
    label(c, fmt(S.ach * 100, 1) + ' cm',
          (sc.X(apn[0]) + sc.X(pp[0])) / 2 - 6, (sc.Y(apn[1]) + sc.Y(pp[1])) / 2 - 12,
          { size: 10.5, align: 'right', color: K.ACC, weight: 650, plate: true });
    c.restore();

    /* ----------------------- through the stance ---------------------- */
    var px = port ? 0 : fw, py = port ? box.y + box.h + 48 : 36;
    var ph = port ? ax.H - py - 170 : ax.H - 150;
    var a2 = sub(ax, px + 70, py, 26, ax.H - (py + ph));
    var series, nm, col, ref = null;
    if (S.show === 'f') {
      series = []; for (var i = 0; i < W.ng; i++)
        series.push(stance(W, i, S.ach).F / BW);
      nm = 'Achilles tendon force (× body weight)'; col = K.ACC;
    } else if (S.show === 'r') {
      series = []; for (var j = 0; j < W.ng; j++)
        series.push(stance(W, j, S.ach).R / BW);
      nm = 'ankle joint reaction (× body weight)'; col = K.VIO;
    } else {
      series = W.mom.map(function (v) { return v / W.mass_kg; });
      nm = 'moment about the ankle (N·m/kg)'; col = K.GRN;
      ref = W.id_ank;
    }
    var lo = 0, hi = Math.max.apply(null, series) * 1.15;
    if (ref) hi = Math.max(hi, Math.max.apply(null, ref) * 1.15);
    lo = Math.min(0, Math.min.apply(null, series) * 1.2);
    a2.setRange(0, 100, lo, hi);
    a2.frame({ grid: true, xticks: [0, 20, 40, 60, 80, 100],
               yticks: axisTicks(lo, hi),
               yfmt: function (v) { return minus(v.toFixed(1)); } });
    if (ref) {
      a2.poly(ref.map(function (v, i) { return [i, v]; }),
              { color: K.BLUE, width: 2.4, dash: [7, 5] });
    }
    a2.poly(series.map(function (v, i) { return [i / (W.ng - 1) * 100, v]; }),
            { color: col, width: 2.8 });
    var pc = S.k / (W.ng - 1) * 100;
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(a2.X(pc), a2.Y(lo)); c.lineTo(a2.X(pc), a2.Y(hi));
    c.stroke(); c.restore();
    a2.dots([[pc, series[S.k]]], { color: K.INK, r: 4.5 });
    label(c, nm, (a2.pl + ax.W - a2.pr) / 2, py - 12,
          { size: 12.5, weight: 700, color: K.INK });
    label(c, 'Per cent of stance', (a2.pl + ax.W - a2.pr) / 2, ax.H - a2.pb + 30,
          { size: 12, weight: 700, color: K.INK });
    if (ref) key(c, a2.pl + 14, py + 10,
                 [[K.GRN, 'this static analysis'],
                  [K.BLUE, 'the authors’ inverse dynamics']], { size: 10.5 });

    var ft = wrapLabel(c, 'Measured · ' + W.subject + ' · ' + fmt(W.mass_kg, 0) +
             ' kg · plate at ' + fmt(W.ghz, 0) + ' Hz and measured markers · the ' +
             'one number here that is NOT measured is the tendon’s moment arm, which the ' +
             'literature puts at 4.7 to 5.3 cm — it is the slider, so you can see what it ' +
             'is worth',
             ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
    var msg = S.show === 'm'
      ? 'this calculation peaks at ' + fmt(Math.max.apply(null, W.mom) / W.mass_kg, 2) +
        ' N·m/kg against their ' + fmt(W.id_peak, 2) +
        ' — ' + fmt(100 * (Math.max.apply(null, W.mom) / W.mass_kg / W.id_peak - 1), 0) +
        '% high, because a static analysis ignores the foot’s own weight and acceleration'
      : 'at ' + fmt(pc, 0) + '% of stance the floor pushes with ' +
        fmt(q.grf / BW, 2) + ' × body weight, the tendon pulls with ' +
        fmt(q.F / BW, 2) + ', and the joint carries ' + fmt(q.R / BW, 2);
    wrapLabel(c, msg, ax.W / 2, ft - 20, ax.W - 40,
              { size: 12, weight: 650, color: S.show === 'm' ? K.MUT : K.ACC });
  }

  u.ctl.className = 'ictls g2';
  var sk = slider(u.ctl, 'Through stance', 0, W.ng - 1, 1, S.k,
                  function (v) { return fmt(v / (W.ng - 1) * 100, 0) + '%'; },
                  function (v) { S.k = v; draw(); });
  var sa = slider(u.ctl, 'Tendon moment arm', 0.03, 0.07, 0.001, S.ach,
                  function (v) { return fmt(v * 100, 1) + ' cm'; },
                  function (v) { S.ach = v; draw(); });
  sk.quiet(S.k); sa.quiet(S.ach);
  var row2 = ctlRow(u.ctl);
  keepOut(seg(row2, [['f', 'Tendon force'], ['r', 'Joint reaction'],
                     ['m', 'Check against inverse dynamics']], S.show,
               function (v) { S.show = v; draw(); }));
  /* fit.js's prewarm presses every .ibtn that is not marked, and this one
     does not merely animate a position -- it changes what the figure shows,
     so an unmarked play button is what the handout ends up frozen on. */
  var pb = playBtn(u.ctl, '▶ Roll through stance');
  pb.setAttribute('data-unsafe', '1');
  var rd = readout(u.ctl);
  rd.innerHTML = 'The gymnast again, on someone walking. The foot is the free body; the ground ' +
    'force and where it acts are measured, the ankle is measured, and moments about the ankle ' +
    'give the tendon force. At the peak the Achilles is pulling with <b>3.7 times body ' +
    'weight</b> and the ankle joint is carrying <b>4.9</b> — while the floor is pushing ' +
    'with 1.26. The third tab is the honest one: how far this estimate sits from a full ' +
    'inverse-dynamics solution of the same stride.';

  var raf = null, t0 = 0, base = 0;
  function tick(t) {
    if (!t0) { t0 = t; base = S.k; }
    var k = Math.round(base + (t - t0) / 2600 * W.ng) % W.ng;
    S.k = k; sk.quiet(k); draw();
    raf = requestAnimationFrame(tick);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; t0 = 0;
                    pb.textContent = '▶ Roll through stance'; }
  pb.addEventListener('click', function () {
    if (raf) { stop(); return; }
    pb.textContent = '❚❚ Pause'; t0 = 0; raf = requestAnimationFrame(tick);
  });
  node._stop = stop;
  node._draw = draw;
  draw();
});

/* ======================================================================
   7. TUTORQ — the three problems you will actually be set

   The Biomechanics Tutor's Static Equilibrium section, done the way the
   Tutor does it, so that a student who works through this figure is
   rehearsing the exact method the homework wants.

   Three cases, in increasing difficulty:

     the forearm, everything horizontal, one unknown  (Q2, 86.7 N)
     the shoulder, the deltoid at an angle            (Q11, R = 373.6 N)
     the elbow with the forearm itself tilted         (Q9, 468.4 N)

   The third is the one worth dwelling on, because it is where students
   stop being able to read the moment arm off the picture: when the segment
   is not horizontal and the force is not vertical, the moment is F·d·sinθ
   with θ the angle BETWEEN them, and the figure draws that angle.
   ====================================================================== */
D.register('tutorq', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var D0 = window.ST19;
  if (!D0) return;
  var T = D0.tutor;
  var S = { q: 'q2' };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 580 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* each case returns its geometry and its answer, computed here */
  function solve() {
    if (S.q === 'q2') {
      var F = T.q2.W * T.q2.d_W / T.q2.d_mus;
      return { name: 'Forearm, everything horizontal',
               seg: 0, dM: T.q2.d_mus, aM: 90, dL: T.q2.d_mus + T.q2.d_W,
               load: T.q2.W, aL: -90, F: F,
               steps: [
                 ['moments about the joint', 'ΣM = 0'],
                 ['the load', fmt(T.q2.W, 0) + ' N × ' + fmt(T.q2.d_W, 2) +
                  ' m = ' + fmt(T.q2.W * T.q2.d_W, 2) + ' N·m'],
                 ['the muscle', 'F × ' + fmt(T.q2.d_mus, 2) + ' m'],
                 ['so', 'F = ' + fmt(T.q2.W * T.q2.d_W, 2) + ' / ' +
                  fmt(T.q2.d_mus, 2) + ' = ' + fmt(F, 1) + ' N']],
               ans: fmt(F, 1) + ' N', want: T.q2.ans,
               note: 'The muscle pulls ' + fmt(F / T.q2.W, 1) + ' times harder than the ' +
                     'weight it is holding, because its moment arm is ' +
                     fmt(T.q2.d_W / T.q2.d_mus, 1) + ' times shorter.' };
    }
    if (S.q === 'q11') {
      var MD = T.q11.FD * T.q11.d_D * Math.sin(T.q11.a_D * Math.PI / 180);
      var MW = T.q11.load * T.q11.d_load;
      var Rx = -T.q11.FD * Math.cos(T.q11.a_D * Math.PI / 180);
      var Ry = -(T.q11.FD * Math.sin(T.q11.a_D * Math.PI / 180) - T.q11.load);
      return { name: 'Shoulder, the deltoid at an angle',
               seg: 0, dM: T.q11.d_D, aM: T.q11.a_D, dL: T.q11.d_load,
               load: T.q11.load, aL: -90, F: T.q11.FD,
               steps: [
                 ['the deltoid’s moment', fmt(T.q11.FD, 0) + '(' +
                  fmt(T.q11.d_D, 2) + ')sin' + fmt(T.q11.a_D, 0) + '° = ' +
                  fmt(MD, 1) + ' N·m'],
                 ['the load’s moment', fmt(T.q11.load, 0) + '(' +
                  fmt(T.q11.d_load, 2) + ') = ' + fmt(MW, 1) + ' N·m'],
                 ['ΣFₓ = 0', 'Rₓ = −' + fmt(T.q11.FD, 0) + 'cos' +
                  fmt(T.q11.a_D, 0) + '° = ' + minus(fmt(Rx, 1)) + ' N'],
                 ['ΣFᵧ = 0', 'Rᵧ = ' + minus(fmt(Ry, 1)) + ' N, resultant ' +
                  fmt(Math.hypot(Rx, Ry), 1) + ' N']],
               ans: fmt(Math.hypot(Rx, Ry), 1) + ' N',
               want: Math.hypot(T.q11.Rx, T.q11.Ry),
               note: 'The two moments are ' + fmt(MD, 0) + ' and ' + fmt(MW, 0) +
                     ' N·m — equal, so this arm really is in equilibrium, and the ' +
                     'question is only asking what the joint pays for it.' };
    }
    var MM = T.q9.load * T.q9.d_load * Math.cos(T.q9.a_load * Math.PI / 180);
    var F9 = MM / (T.q9.d_mus * Math.sin((90 - T.q9.a_mus) * Math.PI / 180));
    return { name: 'Elbow, with the forearm tilted too',
             seg: T.q9.a_load, dM: T.q9.d_mus, aM: T.q9.a_mus, dL: T.q9.d_load,
             load: T.q9.load, aL: T.q9.a_load, F: F9,
             steps: [
               ['the load is ' + fmt(T.q9.a_load, 0) + '° above horizontal',
                'its moment is ' + fmt(T.q9.load, 0) + '(' + fmt(T.q9.d_load, 2) +
                ')cos' + fmt(T.q9.a_load, 0) + '° = ' + fmt(MM, 2) + ' N·m'],
               ['the muscle is ' + fmt(T.q9.a_mus, 0) + '° above horizontal',
                'which is ' + fmt(90 - T.q9.a_mus, 0) + '° from the vertical'],
               ['its moment', 'F(' + fmt(T.q9.d_mus, 2) + ')sin' +
                fmt(90 - T.q9.a_mus, 0) + '°'],
               ['so', 'F = ' + fmt(MM, 2) + ' / (' + fmt(T.q9.d_mus, 2) + ' sin' +
                fmt(90 - T.q9.a_mus, 0) + '°) = ' + fmt(F9, 1) + ' N']],
             ans: fmt(F9, 1) + ' N', want: T.q9.ans,
             note: 'Once nothing is horizontal you cannot read the moment arm off the ' +
                   'picture. Use F·d·sinθ with θ the angle BETWEEN the ' +
                   'force and the segment, every time.' };
  }

  function draw() {
    var K = C(), q = solve();
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.42;

    /* --------------------------- the picture ------------------------- */
    var box = { x: 10, y: 24, w: fw - 20, h: (port ? ax.H * 0.30 : ax.H - 98) };
    /* fit to THIS case, not to the widest of the three */
    var ext = q.dL + 0.10;
    var sc = new Scene(c, box).fit(-ext * 0.22, -ext * 0.52, ext, ext * 0.56, 10);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    var sr = q.seg * Math.PI / 180;
    var ex = Math.cos(sr), ey = Math.sin(sr);
    var L = q.dL + 0.05;
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 10; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sc.X(0), sc.Y(0)); c.lineTo(sc.X(ex * L), sc.Y(ey * L));
    c.stroke(); c.restore();
    pin(c, sc.X(0), sc.Y(0), 8);
    label(c, 'joint', sc.X(0) - 12, sc.Y(0) - 20,
          { size: 11.5, align: 'right', weight: 700, color: K.INK });

    var FS = 0.00042;
    var mp = [ex * q.dM, ey * q.dM], lp = [ex * q.dL, ey * q.dL];
    var mc = comp(q.F, q.aM), lc = comp(q.load, q.aL);
    force(c, sc, mp[0], mp[1], mc[0] * FS, mc[1] * FS, 1, K.ACC,
          'F = ' + fmt(q.F, 0) + ' N');
    force(c, sc, lp[0], lp[1], lc[0] * FS * 2.4, lc[1] * FS * 2.4, 1, K.BLUE,
          fmt(q.load, 0) + ' N');
    /* the angle between the force and the segment, which is the whole trick */
    if (Math.abs(q.aM - q.seg) > 2) {
      c.save(); c.strokeStyle = K.VIO; c.lineWidth = 1.8;
      c.beginPath();
      c.arc(sc.X(mp[0]), sc.Y(mp[1]), 24,
            -q.aM * Math.PI / 180, -q.seg * Math.PI / 180, true);
      c.stroke(); c.restore();
      label(c, fmt(Math.abs(q.aM - q.seg), 0) + '°',
            sc.X(mp[0]) + 34, sc.Y(mp[1]) - 20,
            { size: 11, color: K.VIO, weight: 650, plate: true });
    }
    c.restore();

    /* -------------------------- the working -------------------------- */
    var px = port ? 16 : fw + 12, pw = port ? ax.W - 32 : ax.W - fw - 28;
    var py = port ? box.y + box.h + 44 : 44;
    label(c, q.name, px, py, { size: 13, align: 'left', weight: 700, color: K.INK });
    q.steps.forEach(function (s, i) {
      var yy = py + 28 + i * (port ? 40 : 42);
      label(c, s[0], px, yy, { size: 11, align: 'left', weight: 650, color: K.MUT });
      label(c, s[1], px, yy + 17, { size: 12.5, align: 'left', weight: 600,
                                    color: K.INK });
    });
    var ay = py + 28 + q.steps.length * (port ? 40 : 42) + 8;
    label(c, q.ans, px, ay, { size: 18, align: 'left', weight: 700, color: K.ACC });
    var ok = Math.abs(parseFloat(q.ans) - q.want) < 0.6;
    label(c, ok ? 'the Tutor’s answer too' : 'the Tutor gives ' + fmt(q.want, 1),
          px + 110, ay, { size: 12, align: 'left', weight: 650,
                          color: ok ? K.GRN : K.ACC });

    var ft = wrapLabel(c, 'The Biomechanics Tutor, Static Equilibrium · moments about ' +
             'the joint first, so the two unknown reactions have no moment and drop out ' +
             '· only then the two force sums',
             ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
    wrapLabel(c, q.note, ax.W / 2, ft - 20, ax.W - 40,
              { size: 12, weight: 650, color: K.MUT });
  }

  u.ctl.className = 'ictls';
  var row2 = ctlRow(u.ctl);
  keepOut(seg(row2, [['q2', 'Forearm'], ['q11', 'Shoulder'],
                     ['q9', 'Tilted forearm']], S.q,
               function (v) { S.q = v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'Three problems from the Tutor, in the order of difficulty you will meet ' +
    'them. The method never changes: free body diagram, force table, <b>moments about the ' +
    'joint first</b> because the reactions have no moment there, then the two force sums for ' +
    'the reactions. What changes is only how hard the moment arm is to read, and the third ' +
    'case is where you have to stop reading it and start computing it.';

  node._draw = draw;
  draw();
});





window.ST = { iron: iron, stance: stance, comp: comp, resolve: resolve,
              perp: perp, moment: moment };
D.boot();
})();
