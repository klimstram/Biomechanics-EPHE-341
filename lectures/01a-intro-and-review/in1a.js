/* ======================================================================
   EPHE 341 — Introduction and Review (lecture 1a)

   The first lecture of the course, and the last one to be converted — which
   turns out to be the right order, because its last act is a map of the
   nineteen decks that now exist, and that could not have been drawn before.

   Three things happen here. The lecture says what biomechanics is and how
   this course will do it; it reviews the mathematics the rest of the term
   assumes — real numbers, exponents, solving equations, trigonometry; and
   it sets up the anatomical planes and axes that every later lecture uses
   without re-explaining.

   His review content is almost entirely right: sixteen theorems, eight laws
   of exponents, the special-angle table, the sine and cosine laws, and three
   equation examples all reproduce. Two things do not, and both are in the
   lines a student copies. Slide 38's cosine-law example prints c = 0.3227 m
   where the law gives 0.1705 — and his own drawing agrees with 0.1705.
   Slide 30 concludes that the roots are ½ and 1 where his own graph, on the
   same slide, shows ½ and 2.

   The figures here mostly measure rather than assert. The triangle is
   draggable and reports its own sides and angles; the exponent laws are
   evaluated on both sides; the quadratic's roots are read off the curve.
   And the anatomical planes are drawn on a measured walking body rather
   than a diagram, because his slides 39 to 58 are twenty pictures of one
   figure being turned by hand.

   parts/selftest.js checks every number against his printed values and
   against the Tutor's published answer bands.
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
   The mathematics, and the body.

   Everything the figures compute lives here, so that the self-test runs the
   same arithmetic the slides draw rather than a second copy of it.

   `tri` is the only triangle solver in the deck. Give it any sufficient
   combination — two sides and the angle between them, two angles and a side,
   three sides — and it returns all six parts plus which law it used, which is
   the thing his slides 34 to 36 are actually teaching: the law you reach for
   is decided by what you were given, not by what you want.
   ====================================================================== */
var DA = window.IN1A || null;
var RAD = Math.PI / 180, DEG = 180 / Math.PI;

/* ---------------------------------------------------------------------
   A triangle, from whatever is known.  Sides a, b, c face angles A, B, C.
   --------------------------------------------------------------------- */
function triFromSAS(b, C, a) {               /* two sides, the angle between */
  var c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(C * RAD));
  return triFromSSS(a, b, c, 'the cosine law');
}
function triFromSSS(a, b, c, why) {
  var A = Math.acos(clamp((b * b + c * c - a * a) / (2 * b * c))) * DEG;
  var B = Math.acos(clamp((a * a + c * c - b * b) / (2 * a * c))) * DEG;
  var C = 180 - A - B;
  return { a: a, b: b, c: c, A: A, B: B, C: C, law: why || 'the cosine law' };
}
function triFromAAS(A, B, c) {               /* two angles and a side */
  var C = 180 - A - B;
  var k = c / Math.sin(C * RAD);
  return { a: k * Math.sin(A * RAD), b: k * Math.sin(B * RAD), c: c,
           A: A, B: B, C: C, law: 'the sine law' };
}
function clamp(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }

/* the right-angle shortcuts, which are the sine and cosine laws with one
   angle set to 90 degrees and nothing else different */
function triRight(hyp, ang) {
  return { hyp: hyp, ang: ang, opp: hyp * Math.sin(ang * RAD),
           adj: hyp * Math.cos(ang * RAD), third: 90 - ang };
}

/* the three vertices of a triangle with side c along the x axis */
function triPoints(t) {
  var A = [0, 0], B = [t.c, 0];
  var Cx = t.b * Math.cos(t.A * RAD), Cy = t.b * Math.sin(t.A * RAD);
  return { A: A, B: B, C: [Cx, Cy] };
}

/* ---------------------------------------------------------------------
   His eight laws of exponents, each evaluated on both sides.
   --------------------------------------------------------------------- */
function expoCheck(e) {
  var c = e.c, d = e.d, a = e.a, b = e.b, L, R;
  switch (e.kind) {
    case 'mul':  L = Math.pow(c, a) * Math.pow(c, b); R = Math.pow(c, a + b); break;
    case 'zero': L = Math.pow(c, 0); R = 1; break;
    case 'neg':  L = Math.pow(c, -a); R = 1 / Math.pow(c, a); break;
    case 'div':  L = Math.pow(c, a) / Math.pow(c, b); R = Math.pow(c, a - b); break;
    case 'pow':  L = Math.pow(Math.pow(c, a), b); R = Math.pow(c, a * b); break;
    case 'prod': L = Math.pow(c * d, a); R = Math.pow(c, a) * Math.pow(d, a); break;
    case 'quot': L = Math.pow(c / d, a); R = Math.pow(c, a) / Math.pow(d, a); break;
    case 'root': L = Math.pow(c, a / b); R = Math.pow(Math.pow(c, a), 1 / b); break;
  }
  return { L: L, R: R, ok: Math.abs(L - R) < 1e-9 * Math.max(1, Math.abs(L)) };
}

/* ---------------------------------------------------------------------
   His three equation examples.
   --------------------------------------------------------------------- */
function eqSolve(e) {
  if (e.kind === 'one') return { x: (2 * 11 - 7) / 3 };
  if (e.kind === 'two') return { x: 1, y: 2 };
  var d = e.b * e.b - 4 * e.a * e.c;
  var r1 = (-e.b + Math.sqrt(d)) / (2 * e.a), r2 = (-e.b - Math.sqrt(d)) / (2 * e.a);
  return { roots: [Math.min(r1, r2), Math.max(r1, r2)], disc: d };
}

/* ---------------------------------------------------------------------
   The Biomechanics Tutor, Basic Math and Trigonometry.
   --------------------------------------------------------------------- */
function tutorSolve(q) {
  var r;
  switch (q.kind) {
    case 'vi_sq':  return Math.sqrt(q.vf * q.vf - 2 * q.a * q.d);
    case 't_lin':  return (q.vf - q.vi) / q.a;
    case 'vf_imp': return q.F * q.t / q.m + q.vi;
    case 't_imp':  return q.m * (q.vf - q.vi) / q.F;
    case 'm_imp':  return q.F * q.t / (q.vf - q.vi);
    case 'vi_d':   return (q.d - 0.5 * q.a * q.t * q.t) / q.t;
    case 'y7':     return Math.sqrt((26 + Math.sqrt(2) - 4 * Math.sqrt(8)) / 12);
    case 'x8':     return 8 / (43 - 12);
    case 'z9':     return Math.sqrt(5 * Math.sqrt(5) / 33);
    case 'a10':    return Math.sqrt((44 - Math.sqrt(55)) * Math.sqrt(55) + 14);
    case 'x11':    return -12 / (2 * q.y * q.y + 1);
    case 'y12':    return Math.sqrt(-(12 + q.x) / (2 * q.x));
    /* right-angle cases: B = 90 deg, so b is the hypotenuse */
    case 'rt_angA':  return Math.atan2(q.a, q.c) * DEG;
    case 'rt_angC':  return Math.atan2(q.c, q.a) * DEG;
    case 'rt_hyp':   return Math.sqrt(q.a * q.a + q.c * q.c);
    case 'rt_third': return 90 - q.A;
    case 'rt_opp':   return q.b * Math.sin(q.A * RAD);
    case 'rt_adj':   return q.b * Math.cos(q.A * RAD);
    case 'sine_b':   return q.c * Math.sin(q.B * RAD) / Math.sin(q.C * RAD);
    case 'sine_A':   return 180 - q.B - q.C;
    case 'sine_a':   return q.c * Math.sin((180 - q.B - q.C) * RAD) / Math.sin(q.C * RAD);
    case 'cos_A':    return Math.acos(clamp((q.b * q.b + q.c * q.c - q.a * q.a) / (2 * q.b * q.c))) * DEG;
    case 'cos_B':    return Math.acos(clamp((q.a * q.a + q.c * q.c - q.b * q.b) / (2 * q.a * q.c))) * DEG;
    case 'cos_C':    return Math.acos(clamp((q.a * q.a + q.b * q.b - q.c * q.c) / (2 * q.a * q.b))) * DEG;
    case 'cosine_c': return Math.sqrt(q.a * q.a + q.b * q.b - 2 * q.a * q.b * Math.cos(q.C * RAD));
    case 'cos13_A':  r = triFromSAS(q.b, q.C, q.a); return r.A;
    case 'cos13_B':  r = triFromSAS(q.b, q.C, q.a); return r.B;
  }
  return NaN;
}
/* The Tutor grades with a bare  min <= answer <= max  and no tolerance at
   all, so a band whose ends are equal is an exact match and the only thing
   that makes it answerable is that it equals the correctly rounded answer. */
function tutorBand(q, v) {
  var lo = Math.min(q.band[0], q.band[1]), hi = Math.max(q.band[0], q.band[1]);
  var dp = (String(q.band[0]).split('.')[1] || '').length;
  var k = Math.pow(10, dp);
  var rounded = Math.round(v * k) / k;
  var trunc = (v < 0 ? Math.ceil(v * k) : Math.floor(v * k)) / k;
  var inb = function (x) { return x >= lo - 1e-12 && x <= hi + 1e-12; };
  return { in: inb(v), roundedIn: inb(rounded), truncIn: inb(trunc),
           /* a band is sound if the exact answer either rounds or truncates
              onto it; question 15 of the Trigonometry section is the only one
              that needs the second case */
           sound: inb(rounded) || inb(trunc),
           rounded: rounded, trunc: trunc, dp: dp };
}

/* ======================================================================
   The measured body, in three dimensions.

   x is the direction of travel, y is to the subject's left, z is up, which
   is the axis system his slides 41 to 46 define -- so the figure can label
   the axes with his own sentences rather than a translation of them.
   ====================================================================== */
function bodyAt(p) {
  var B = DA && DA.body; if (!B) return null;
  var f = Math.max(0, Math.min(B.n - 1, Math.round(p * (B.n - 1))));
  var nj = B.j.length, o = {}, i;
  for (i = 0; i < nj; i++) {
    var k = (f * nj + i) * 3;
    o[B.j[i]] = [B.P[k] / 1000, B.P[k + 1] / 1000, B.P[k + 2] / 1000];
  }
  return o;
}
/* the mid-point of the two hips, which is where the three planes meet */
function bodyOrigin(P) {
  return [(P.hipL[0] + P.hipR[0]) / 2, (P.hipL[1] + P.hipR[1]) / 2,
          (P.hipL[2] + P.hipR[2]) / 2];
}

/* An orthographic camera. `az` turns about the vertical, `el` lifts the eye.
   Returns screen x, screen y (up positive) and a depth for sorting. */
function proj(p, cam) {
  var ca = Math.cos(cam.az), sa = Math.sin(cam.az);
  var ce = Math.cos(cam.el), se = Math.sin(cam.el);
  var into = p[0] * ca + p[1] * sa;
  return [-p[0] * sa + p[1] * ca, p[2] * ce - into * se, into * ce + p[2] * se];
}

/* the three anatomical planes as quads through a point, each a list of four
   corners in world coordinates */
function planeQuad(which, o, r) {
  var h = r, v = r * 2.05;
  if (which === 'sagittal')                     /* x-z, divides left from right */
    return [[o[0] - h, o[1], o[2] - v], [o[0] + h, o[1], o[2] - v],
            [o[0] + h, o[1], o[2] + v], [o[0] - h, o[1], o[2] + v]];
  if (which === 'frontal')                      /* y-z, divides front from back */
    return [[o[0], o[1] - h, o[2] - v], [o[0], o[1] + h, o[2] - v],
            [o[0], o[1] + h, o[2] + v], [o[0], o[1] - h, o[2] + v]];
  return [[o[0] - h, o[1] - h, o[2]], [o[0] + h, o[1] - h, o[2]],   /* x-y */
          [o[0] + h, o[1] + h, o[2]], [o[0] - h, o[1] + h, o[2]]];
}

/* drag to turn, without the drag also changing slide */
function dragTurn(cv, cam, redraw) {
  var down = false, lx = 0, ly = 0;
  cv.setAttribute('data-prevent-swipe', '');
  cv.style.touchAction = 'none';
  cv.style.cursor = 'grab';
  function start(e) {
    down = true; lx = e.clientX; ly = e.clientY;
    cv.style.cursor = 'grabbing';
    if (cv.setPointerCapture) { try { cv.setPointerCapture(e.pointerId); } catch (x) {} }
    e.preventDefault();
  }
  function move(e) {
    if (!down) return;
    cam.az -= (e.clientX - lx) * 0.012;
    cam.el = Math.max(-0.5, Math.min(1.1, cam.el + (e.clientY - ly) * 0.008));
    lx = e.clientX; ly = e.clientY; redraw(); e.preventDefault();
  }
  function up() { down = false; cv.style.cursor = 'grab'; }
  cv.addEventListener('pointerdown', start);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', up);
}

/* ======================================================================
   1. TRIANGLE — every trigonometry rule on his slides, on one figure
                                                            (anchor figure)

   His slides 34 to 36 give three separate boxes: the right-angle functions,
   the sine law, and the cosine law.  Students learn them as three unrelated
   things and then cannot tell which to reach for.

   They are not three things.  They are one triangle, and which law you use
   is decided entirely by WHAT YOU WERE GIVEN.  So this figure is one
   triangle with its corners draggable, measuring its own six parts, and
   showing all three relations holding at once — the sine law's three ratios
   equal, the cosine law reproducing each side, and, whenever a corner
   happens to be square, the right-angle functions appearing as the special
   case they are.

   Drag a corner until one angle reads 90° and watch the cosine law lose its
   last term and turn into Pythagoras.
   ====================================================================== */
D.register('triangle', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  /* world coordinates in metres, a triangle roughly the size of his examples */
  var S = { P: [[0.02, 0.03], [0.46, 0.05], [0.30, 0.34]], show: 'laws' };
  var drag = -1;

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 700 : 392,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;
  var sc = null;

  function geom() {
    var P = S.P;
    var a = dist(P[1], P[2]);          /* side a faces corner A */
    var b = dist(P[0], P[2]);
    var cc = dist(P[0], P[1]);
    var t = triFromSSS(a, b, cc);
    t.pts = P;
    return t;
  }
  function dist(p, q) { return Math.hypot(q[0] - p[0], q[1] - p[1]); }

  function draw() {
    var K = C(), t = geom();
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.52;

    var box = { x: 10, y: 26, w: fw - 20, h: port ? ax.H * 0.36 : ax.H - 92 };
    sc = new Scene(c, box).fit(-0.04, -0.06, 0.52, 0.42, 14);

    /* the triangle */
    c.save();
    c.fillStyle = K.FILL; c.globalAlpha = 0.5;
    c.beginPath();
    c.moveTo(sc.X(t.pts[0][0]), sc.Y(t.pts[0][1]));
    c.lineTo(sc.X(t.pts[1][0]), sc.Y(t.pts[1][1]));
    c.lineTo(sc.X(t.pts[2][0]), sc.Y(t.pts[2][1]));
    c.closePath(); c.fill(); c.restore();
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 3; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(sc.X(t.pts[0][0]), sc.Y(t.pts[0][1]));
    c.lineTo(sc.X(t.pts[1][0]), sc.Y(t.pts[1][1]));
    c.lineTo(sc.X(t.pts[2][0]), sc.Y(t.pts[2][1]));
    c.closePath(); c.stroke(); c.restore();

    /* the three sides, each labelled at its own midpoint */
    var SIDE = [['a', t.a, 1, 2, K.ACC], ['b', t.b, 0, 2, K.GRN],
                ['c', t.c, 0, 1, K.BLUE]];
    SIDE.forEach(function (z) {
      var p = t.pts[z[2]], q = t.pts[z[3]];
      var mx = (sc.X(p[0]) + sc.X(q[0])) / 2, my = (sc.Y(p[1]) + sc.Y(q[1])) / 2;
      /* push the label outward, away from the opposite corner */
      var o = t.pts[3 - z[2] - z[3]];
      var dx = mx - sc.X(o[0]), dy = my - sc.Y(o[1]), m = Math.hypot(dx, dy) || 1;
      label(c, z[0] + ' = ' + fmt(z[1], 3), mx + dx / m * 24, my + dy / m * 24,
            { size: 12.5, color: z[4], weight: 700, plate: true });
    });

    /* the three angles, with a right-angle tick where one is square */
    var ANG = [['A', t.A, 0, K.ACC], ['B', t.B, 1, K.GRN], ['C', t.C, 2, K.BLUE]];
    ANG.forEach(function (z) {
      var P = t.pts[z[2]];
      var o1 = t.pts[(z[2] + 1) % 3], o2 = t.pts[(z[2] + 2) % 3];
      var a1 = Math.atan2(sc.Y(o1[1]) - sc.Y(P[1]), sc.X(o1[0]) - sc.X(P[0]));
      var a2 = Math.atan2(sc.Y(o2[1]) - sc.Y(P[1]), sc.X(o2[0]) - sc.X(P[0]));
      var square = Math.abs(z[1] - 90) < 0.6;
      c.save();
      c.strokeStyle = square ? K.VIO : z[3]; c.lineWidth = square ? 2.4 : 1.8;
      var d = Math.abs(((a2 - a1) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI));
      var ccw = d > Math.PI;
      c.beginPath(); c.arc(sc.X(P[0]), sc.Y(P[1]), 22, a1, a2, ccw); c.stroke();
      c.restore();
      var am = (a1 + a2) / 2 + (ccw ? Math.PI : 0);
      label(c, z[0] + ' = ' + fmt(z[1], 1) + '°',
            sc.X(P[0]) + Math.cos(am) * 44, sc.Y(P[1]) + Math.sin(am) * 44,
            { size: 12, color: square ? K.VIO : z[3], weight: 700, plate: true });
      /* the handle */
      c.save();
      c.fillStyle = K.PLATE; c.strokeStyle = z[3]; c.lineWidth = 2.4;
      c.beginPath(); c.arc(sc.X(P[0]), sc.Y(P[1]), 7, 0, 7); c.fill(); c.stroke();
      c.restore();
    });
    label(c, 'drag any corner', box.x + box.w / 2, box.y + box.h - 6,
          { size: 11, color: K.MUT, weight: 650 });

    /* ------------------------- the three laws ------------------------ */
    var px = port ? 16 : fw + 14, pw = port ? ax.W - 32 : ax.W - fw - 30;
    var py = port ? box.y + box.h + 34 : 44;
    var sq = [t.A, t.B, t.C].filter(function (v) { return Math.abs(v - 90) < 0.6; }).length;

    var rows;
    if (S.show === 'laws') {
      var r1 = t.a / Math.sin(t.A * RAD), r2 = t.b / Math.sin(t.B * RAD),
          r3 = t.c / Math.sin(t.C * RAD);
      var cc = Math.sqrt(t.a * t.a + t.b * t.b - 2 * t.a * t.b * Math.cos(t.C * RAD));
      rows = [
        ['the angles always sum to 180°',
         fmt(t.A, 1) + '° + ' + fmt(t.B, 1) + '° + ' + fmt(t.C, 1) + '° = ' +
         fmt(t.A + t.B + t.C, 1) + '°', K.INK],
        ['the sine law — a/sinA = b/sinB = c/sinC',
         fmt(r1, 3) + '   ' + fmt(r2, 3) + '   ' + fmt(r3, 3) + '   (all one number)',
         K.GRN],
        ['the cosine law — c² = a² + b² − 2ab·cosC',
         fmt(t.a, 3) + '² + ' + fmt(t.b, 3) + '² − 2(' + fmt(t.a, 3) + ')(' +
         fmt(t.b, 3) + ')cos' + fmt(t.C, 1) + '° → c = ' + fmt(cc, 3) +
         ', and c measures ' + fmt(t.c, 3), K.BLUE]
      ];
    } else {
      /* the right-angle case, which is what his slide 34 draws */
      var hyp = Math.max(t.a, t.b, t.c);
      var o, ad, th;
      if (Math.abs(t.C - 90) < 0.6) { o = t.a; ad = t.b; th = t.A; }
      else if (Math.abs(t.B - 90) < 0.6) { o = t.a; ad = t.c; th = t.A; }
      else { o = t.b; ad = t.c; th = t.B; }
      rows = sq ? [
        ['sin θ = opposite / hypotenuse',
         'sin ' + fmt(th, 1) + '° = ' + fmt(o, 3) + ' / ' + fmt(hyp, 3) + ' = ' +
         fmt(o / hyp, 4) + '   (and sin ' + fmt(th, 1) + '° = ' +
         fmt(Math.sin(th * RAD), 4) + ')', K.ACC],
        ['cos θ = adjacent / hypotenuse',
         'cos ' + fmt(th, 1) + '° = ' + fmt(ad, 3) + ' / ' + fmt(hyp, 3) + ' = ' +
         fmt(ad / hyp, 4), K.GRN],
        ['tan θ = opposite / adjacent',
         'tan ' + fmt(th, 1) + '° = ' + fmt(o, 3) + ' / ' + fmt(ad, 3) + ' = ' +
         fmt(o / ad, 4), K.BLUE],
        ['Pythagoras — hypotenuse² = adjacent² + opposite²',
         fmt(hyp * hyp, 5) + ' = ' + fmt(ad * ad + o * o, 5), K.VIO]
      ] : [['none of the three angles is 90° yet',
            'drag a corner until one angle reads 90.0° and the right-angle ' +
            'functions appear', K.MUT]];
    }
    rows.forEach(function (r, i) {
      var yy = py + i * (port ? 68 : 98);
      label(c, r[0], px, yy, { size: 12, align: 'left', weight: 700, color: r[2] });
      wrapLabel(c, r[1], px, yy + (port ? 42 : 50), pw - 6,
                { size: 12, align: 'left', color: K.MUT });
    });

    var msg = sq
      ? 'One angle is square, so the cosine law’s last term is 2ab·cos 90° = 0 ' +
        'and it has turned into Pythagoras. The right-angle functions are not a ' +
        'separate rule; they are this triangle with one corner at 90°.'
      : 'Which law you use is decided by what you were given, not by what you ' +
        'want: two angles and a side → the sine law; two sides and the angle ' +
        'between them → the cosine law; a right angle → either, or sin, cos and tan.';
    wrapLabel(c, msg, ax.W / 2, ax.H - 10, ax.W - 30,
              { size: 11.5, color: sq ? K.VIO : K.MUT });
  }

  /* ----------------------------- dragging --------------------------- */
  function local(e) {
    var r = u.cv.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * ax.W,
            (e.clientY - r.top) / r.height * ax.H];
  }
  u.cv.setAttribute('data-prevent-swipe', '');
  u.cv.style.touchAction = 'none';
  u.cv.addEventListener('pointerdown', function (e) {
    if (!sc) return;
    var p = local(e), best = -1, bd = 24;
    S.P.forEach(function (q, i) {
      var d = Math.hypot(p[0] - sc.X(q[0]), p[1] - sc.Y(q[1]));
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0) {
      drag = best;
      if (u.cv.setPointerCapture) { try { u.cv.setPointerCapture(e.pointerId); } catch (x) {} }
      e.preventDefault();
    }
  });
  u.cv.addEventListener('pointermove', function (e) {
    if (drag < 0 || !sc) return;
    var p = local(e);
    var nx = (p[0] - sc.ox) / sc.k, ny = (sc.oy - p[1]) / sc.k;
    /* keep it inside the drawn box and keep the triangle non-degenerate */
    nx = Math.max(-0.02, Math.min(0.50, nx));
    ny = Math.max(-0.04, Math.min(0.40, ny));
    var old = S.P[drag];
    S.P[drag] = [nx, ny];
    var t = geom();
    if (!(t.a > 0.02 && t.b > 0.02 && t.c > 0.02) || !isFinite(t.A)) S.P[drag] = old;
    draw(); e.preventDefault();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (k) {
    u.cv.addEventListener(k, function () { drag = -1; });
  });

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['laws', 'The sine and cosine laws'],
                    ['right', 'The right-angle functions']], 'laws',
              function (v) { S.show = v; draw(); }));
  var row2 = ctlRow(u.ctl);
  var b1 = el('button', 'ibtn', 'Make it right-angled');
  b1.setAttribute('data-unsafe', '1');
  b1.addEventListener('click', function () {
    S.P = [[0.04, 0.04], [0.44, 0.04], [0.04, 0.32]]; draw();
  });
  var b2 = el('button', 'ibtn', 'Make it equilateral');
  b2.setAttribute('data-unsafe', '1');
  b2.addEventListener('click', function () {
    S.P = [[0.06, 0.05], [0.42, 0.05], [0.24, 0.362]]; draw();
  });
  row2.appendChild(b1); row2.appendChild(b2);

  var rd = readout(u.ctl);
  rd.innerHTML = 'One triangle, three laws, all true at once. Drag a corner: the ' +
    'three sine-law ratios stay equal to each other while every one of them ' +
    'changes, and the cosine law reproduces the side you can measure. <b>Which ' +
    'law you reach for is decided by what you were given</b> — two angles and a ' +
    'side, the sine law; two sides and the angle between them, the cosine law.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   2. TRIGEX — his two worked examples, drawn to scale

   Example 1 reproduces exactly: 60°, 0.5 m, 0.87 m.

   Example 2 does not.  His slide gives angle C = 22°, a = 0.30 m and
   b = 0.15 m and prints c = 0.3227 m; the cosine law gives 0.1705.  Nothing
   obvious produces 0.3227 — not a sign slip (0.4427), not a calculator in
   radians (0.45), not dropping the cosine term (0.3354).

   The figure's argument is the drawing rather than the arithmetic.  Both
   triangles are drawn TO SCALE from his own givens, and his own sketch on
   slide 38 shows a thin triangle whose base is clearly shorter than the
   0.30 m side.  That is what 0.17 m looks like.  0.32 m would be the
   longest side in the triangle, and his sketch is not that.

   Then the Tutor's question 13 — the same method, different numbers, and
   its published answer is right. So the method is taught correctly in one
   place and worked wrongly in the other.
   ====================================================================== */
D.register('trigex', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!DA) return;
  var EX = DA.his.trig, S = { i: 1 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 660 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function solve(e) {
    if (e.kind === 'right') {
      var r = triRight(e.hyp, e.ang);
      return { right: r, got: r.opp, t: null };
    }
    var t = triFromSAS(e.b, e.C, e.a);
    return { right: null, t: t, got: t.c };
  }

  function draw() {
    var K = C(), e = EX[S.i], q = solve(e);
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.42;

    var box = { x: 10, y: 30, w: fw - 20, h: port ? ax.H * 0.28 : ax.H - 118 };

    if (e.kind === 'right') {
      var r = q.right;
      var sc = new Scene(c, box).fit(-0.08, -0.12, r.adj + 0.08, r.opp + 0.14, 10);
      var A = [0, 0], B = [r.adj, 0], Cp = [r.adj, r.opp];
      poly3(c, sc, [A, B, Cp], K);
      /* the square corner */
      c.save(); c.strokeStyle = K.VIO; c.lineWidth = 2;
      var g = 0.03;
      c.beginPath();
      c.moveTo(sc.X(r.adj - g), sc.Y(0)); c.lineTo(sc.X(r.adj - g), sc.Y(g));
      c.lineTo(sc.X(r.adj), sc.Y(g)); c.stroke(); c.restore();
      sideLab(c, sc, A, Cp, 'hypotenuse ' + fmt(r.hyp, 2) + ' m', K.INK, B);
      sideLab(c, sc, B, Cp, fmt(r.opp, 3) + ' m', K.ACC, A);
      sideLab(c, sc, A, B, fmt(r.adj, 3) + ' m', K.GRN, Cp);
      label(c, fmt(e.ang, 0) + '°', sc.X(0.07), sc.Y(0.022),
            { size: 12, color: K.BLUE, weight: 700 });
      label(c, fmt(r.third, 0) + '°', sc.X(r.adj - 0.05), sc.Y(r.opp - 0.06),
            { size: 12, color: K.BLUE, weight: 700 });
    } else {
      var t = q.t, P = triPoints(t);
      /* fit the box to the triangle this case actually makes, not to the
         widest of them -- a 22 degree triangle is a sliver and gets lost in
         a box sized for an equilateral one */
      var xs = [P.A[0], P.B[0], P.C[0], 0, e.his.c];
      var ys = [P.A[1], P.B[1], P.C[1]];
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var pad = Math.max(x1 - x0, y1 - y0) * 0.22;
      var sc2 = new Scene(c, box).fit(x0 - pad, y0 - pad * 1.9, x1 + pad,
                                      y1 + pad, 10);
      poly3(c, sc2, [P.A, P.B, P.C], K);
      sideLab(c, sc2, P.B, P.C, 'a = ' + fmt(t.a, 2) + ' m', K.ACC, P.A);
      sideLab(c, sc2, P.A, P.C, 'b = ' + fmt(t.b, 2) + ' m', K.GRN, P.B);
      sideLab(c, sc2, P.A, P.B, 'c = ' + fmt(t.c, 4) + ' m', K.BLUE, P.C);
      label(c, 'C = ' + fmt(t.C, 0) + '°', sc2.X(P.C[0]), sc2.Y(P.C[1]) - 20,
            { size: 12, color: K.VIO, weight: 700, plate: true });
      /* what his printed answer would look like, to the same scale */
      if (e.n === 2) {
        c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.6; c.setLineDash([6, 4]);
        var yd = y0 - pad * 1.1;
        c.beginPath(); c.moveTo(sc2.X(0), sc2.Y(yd));
        c.lineTo(sc2.X(e.his.c), sc2.Y(yd)); c.stroke(); c.restore();
        label(c, 'his 0.3227 m, to the same scale',
              sc2.X(e.his.c / 2), sc2.Y(yd) + 15,
              { size: 11, color: K.ACC, weight: 650, plate: true });
      }
    }
    label(c, e.name, box.x + box.w / 2, box.y - 12,
          { size: 12, weight: 700, color: K.INK });

    /* ---------------------------- the working ------------------------ */
    var px = port ? 16 : fw + 14, pw = port ? ax.W - 32 : ax.W - fw - 30;
    var py = port ? box.y + box.h + 36 : 40;
    py = wrapLabel(c, e.q, px, py + 26, pw,
                   { size: 12.5, align: 'left', weight: 650, color: K.INK }) + 18;

    var lines, ans, his, ok;
    if (e.kind === 'right') {
      var r2 = q.right;
      lines = [
        'the interior angles sum to 180°, so the third is 180 − 90 − ' +
        fmt(e.ang, 0) + ' = ' + fmt(r2.third, 0) + '°',
        'opposite = hypotenuse × sin θ = ' + fmt(e.hyp, 0) + ' × sin ' +
        fmt(e.ang, 0) + '° = ' + fmt(r2.opp, 3) + ' m',
        'adjacent = hypotenuse × cos θ = ' + fmt(e.hyp, 0) + ' × cos ' +
        fmt(e.ang, 0) + '° = ' + fmt(r2.adj, 4) + ' m'];
      ans = fmt(r2.third, 0) + '°,  ' + fmt(r2.opp, 2) + ' m,  ' + fmt(r2.adj, 2) + ' m';
      his = e.his.third + '°, ' + e.his.opp + ' m, ' + e.his.adj + ' m';
      ok = Math.abs(r2.opp - e.his.opp) < 0.006 && Math.abs(r2.adj - e.his.adj) < 0.006;
    } else {
      var t2 = q.t;
      lines = [
        'two sides and the angle between them, so this is the cosine law',
        'c² = a² + b² − 2ab·cos C',
        'c² = ' + fmt(e.a, 2) + '² + ' + fmt(e.b, 2) + '² − 2(' + fmt(e.a, 2) +
        ')(' + fmt(e.b, 2) + ')cos ' + fmt(e.C, 0) + '°',
        'c² = ' + fmt(e.a * e.a + e.b * e.b, 4) + ' − ' +
        fmt(2 * e.a * e.b * Math.cos(e.C * RAD), 4) + ' = ' +
        fmt(t2.c * t2.c, 6),
        'c = ' + fmt(t2.c, 4) + ' m'];
      ans = fmt(t2.c, 4) + ' m';
      his = e.his.c + ' m';
      ok = Math.abs(t2.c - e.his.c) < 0.002;
    }
    lines.forEach(function (ln, i) {
      wrapLabel(c, ln, px, py + 22 + i * (port ? 30 : 32), pw - 6,
                { size: i === lines.length - 1 ? 13.5 : 11.8, align: 'left',
                  weight: i === lines.length - 1 ? 700 : 600,
                  color: i === lines.length - 1 ? K.ACC : K.MUT });
    });
    var ay = py + 22 + lines.length * (port ? 30 : 32) + 12;
    label(c, ok ? 'his slide prints the same' : 'his slide prints ' + his,
          px, ay, { size: 13, align: 'left', weight: 700,
                    color: ok ? K.GRN : K.ACC });

    var foot = e.n === 2
      ? 'Look at the picture rather than the arithmetic. Drawn to his own givens, ' +
        'c comes out clearly shorter than the 0.30 m side — and the sketch on his ' +
        'slide 38 shows exactly that. The dashed line is what 0.3227 m would ' +
        'measure; it is longer than every side of the triangle it is supposed to ' +
        'close.'
      : e.n === 13
      ? 'The Tutor’s question 13 is the same method with different numbers, ' +
        'and its published answer, 0.158 m, is right. So the cosine law is taught ' +
        'correctly in one place and worked wrongly in the other.'
      : 'Both sides come straight off the definitions on his slide 34, and this ' +
        'is also one of the two special triangles on slide 35 — hypotenuse 1, ' +
        'opposite ½, adjacent √3/2.';
    wrapLabel(c, foot, ax.W / 2, ax.H - 10, ax.W - 30,
              { size: 11.5, color: e.n === 2 ? K.ACC : K.MUT });
  }

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [[0, 'His Example 1'], [1, 'His Example 2'],
                    [2, 'The Tutor’s Q13']], 1,
              function (v) { S.i = +v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'His Example 1 reproduces to the digit. <b>Example 2 does not:</b> ' +
    'the cosine law with his own three givens gives <b>0.1705 m</b> where the slide ' +
    'prints 0.3227 m. The useful part is not the correction, it is the check — ' +
    'his own eleventh step of problem solving is <i>"check to see if the answer ' +
    'makes sense"</i>, and a side of 0.32 m cannot close a triangle whose other ' +
    'two sides are 0.30 and 0.15 with only 22° between them. Drawing it to scale ' +
    'catches the error in one second.';

  node._draw = draw;
  draw();
});

/* the triangle itself, shared by the cases above */
function poly3(c, sc, P, K) {
  c.save(); c.fillStyle = K.FILL; c.globalAlpha = 0.55;
  c.beginPath(); c.moveTo(sc.X(P[0][0]), sc.Y(P[0][1]));
  c.lineTo(sc.X(P[1][0]), sc.Y(P[1][1]));
  c.lineTo(sc.X(P[2][0]), sc.Y(P[2][1]));
  c.closePath(); c.fill(); c.restore();
  c.save(); c.strokeStyle = K.INK; c.lineWidth = 3; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(sc.X(P[0][0]), sc.Y(P[0][1]));
  c.lineTo(sc.X(P[1][0]), sc.Y(P[1][1]));
  c.lineTo(sc.X(P[2][0]), sc.Y(P[2][1]));
  c.closePath(); c.stroke(); c.restore();
}
function sideLab(c, sc, p, q, txt, col, away) {
  var mx = (sc.X(p[0]) + sc.X(q[0])) / 2, my = (sc.Y(p[1]) + sc.Y(q[1])) / 2;
  var dx = mx - sc.X(away[0]), dy = my - sc.Y(away[1]), m = Math.hypot(dx, dy) || 1;
  label(c, txt, mx + dx / m * 22, my + dy / m * 22,
        { size: 11.5, color: col, weight: 700, plate: true });
}

/* ======================================================================
   3. UNITCIRCLE — where the three graphs on his slide 34 come from

   His slide 34 prints the graphs of sine, cosine and tangent and says they
   "can be memorized and used to estimate when a calculator is not
   available".  They can, but they are much easier to remember once you have
   seen that they are not three curves — they are one point going round one
   circle, with its height, its sideways distance, and the ratio between
   them plotted against the angle.

   The special-angle table on his slide 35 is then not a list to learn but
   five places on that circle, and the figure checks every entry of it
   against the circle it came from.
   ====================================================================== */
D.register('unitcircle', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { th: 30 }, timer = null;

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 700 : 404,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;
  var SPECIAL = DA ? DA.his.special : [];

  function draw() {
    var K = C(), th = S.th, r = th * RAD;
    var sn = Math.sin(r), cs = Math.cos(r), tn = Math.tan(r);
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.34;

    /* ------------------------- the unit circle ----------------------- */
    var box = port ? { x: 6, y: 26, w: ax.W * 0.40, h: 178 }
                   : { x: 10, y: 26, w: fw - 20, h: ax.H - 150 };
    var sc = new Scene(c, box).fit(-1.25, -1.25, 1.25, 1.25, 8);
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(sc.X(-1.2), sc.Y(0)); c.lineTo(sc.X(1.2), sc.Y(0));
    c.moveTo(sc.X(0), sc.Y(-1.2)); c.lineTo(sc.X(0), sc.Y(1.2)); c.stroke();
    c.strokeStyle = K.MUT; c.lineWidth = 1.8;
    c.beginPath(); c.arc(sc.X(0), sc.Y(0), sc.L(1), 0, 7); c.stroke(); c.restore();

    /* the radius, and the two components it casts */
    c.save(); c.strokeStyle = K.GRN; c.lineWidth = 3;
    c.beginPath(); c.moveTo(sc.X(0), sc.Y(0)); c.lineTo(sc.X(cs), sc.Y(0));
    c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 3;
    c.beginPath(); c.moveTo(sc.X(cs), sc.Y(0)); c.lineTo(sc.X(cs), sc.Y(sn));
    c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(sc.X(0), sc.Y(0)); c.lineTo(sc.X(cs), sc.Y(sn));
    c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.VIO; c.lineWidth = 1.8;
    c.beginPath(); c.arc(sc.X(0), sc.Y(0), 26, 0, -r, true); c.stroke(); c.restore();
    label(c, fmt(th, 0) + '°', port ? box.x + 24 : sc.X(0) + 40,
          port ? box.y + 14 : sc.Y(0) - 18,
          { size: 12.5, color: K.VIO, weight: 700, plate: true });
    c.save(); c.fillStyle = K.INK;
    c.beginPath(); c.arc(sc.X(cs), sc.Y(sn), 5.5, 0, 7); c.fill(); c.restore();
    label(c, 'cos = ' + fmt(cs, 3), sc.X(cs / 2), sc.Y(0) + 16,
          { size: 11, color: K.GRN, weight: 700, plate: true });
    label(c, 'sin = ' + fmt(sn, 3), sc.X(cs) + (port ? -40 : 42), sc.Y(sn / 2),
          { size: 11, color: K.ACC, weight: 700, plate: true });
    if (!port)
      label(c, 'radius 1', sc.X(cs * 0.45) - 26, sc.Y(sn * 0.45) - 12,
            { size: 10.5, color: K.MUT, weight: 650, plate: true });

    /* ---------------------------- the graphs ------------------------- */
    var px = port ? 0 : fw;
    var top = port ? box.y + box.h + 30 : 32;
    var gh = port ? (ax.H - top - 176) / 3 : (ax.H - 160) / 3;
    [['sin θ', Math.sin, K.ACC, -1.2, 1.2],
     ['cos θ', Math.cos, K.GRN, -1.2, 1.2],
     ['tan θ', Math.tan, K.BLUE, -3.2, 3.2]].forEach(function (z, gi) {
      var gy = top + gi * (gh + 24);
      var a2 = sub(ax, px + 62, gy, 20, ax.H - (gy + gh));
      a2.setRange(0, 360, z[3], z[4]);
      a2.frame({ grid: true, xticks: [0, 90, 180, 270, 360],
                 yticks: gi === 2 ? [-3, 0, 3] : [-1, 0, 1] });
      a2.fn(function (d) {
        var v = z[1](d * RAD);
        return (gi === 2 && Math.abs(v) > 3.4) ? NaN : v;
      }, { color: z[2], width: 2.6, n: 900 });
      c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.2; c.globalAlpha = .6;
      c.beginPath(); c.moveTo(a2.X(th), a2.Y(z[3])); c.lineTo(a2.X(th), a2.Y(z[4]));
      c.stroke(); c.restore();
      var v = z[1](r);
      if (Math.abs(v) <= Math.abs(z[4])) a2.dots([[th, v]], { color: z[2], r: 5 });
      label(c, z[0] + '  =  ' + (Math.abs(v) > 60 ? 'off the scale' : fmt(v, 3)),
            a2.pl + 6, gy + 10,
            { size: 12, align: 'left', weight: 700, color: z[2], plate: true });
      if (gi === 2)
        label(c, 'the angle θ, in degrees', (a2.pl + ax.W - a2.pr) / 2,
              ax.H - a2.pb + 26, { size: 11.5, weight: 700 });
    });

    /* --------------------- his slide 35, checked --------------------- */
    var ty = port ? 44 : ax.H - 134;
    var tx = port ? ax.W * 0.44 : 20, tw = port ? ax.W * 0.54 : fw - 30;
    label(c, 'his slide 35, against the circle', tx + tw / 2, ty,
          { size: 11.5, weight: 700, color: K.INK });
    var cols = port ? [0, 32, 100, 172] : [0, 58, 152, 246];
    var tsz = port ? 9 : 10, dsz = port ? 9.5 : 10.5;
    SPECIAL.forEach(function (row, i) {
      var yy = ty + 20 + i * 16;
      var deg = row[0];
      var live = Math.abs(((th - deg) % 360 + 360) % 360) < 1.5;
      c.save(); c.globalAlpha = live ? 1 : 0.72;
      label(c, deg + '°', tx + cols[0] + 16, yy,
            { size: dsz, weight: live ? 700 : 650,
              color: live ? K.VIO : K.MUT, align: 'right' });
      [[1, Math.sin(deg * RAD), K.ACC], [2, Math.cos(deg * RAD), K.GRN],
       [3, Math.tan(deg * RAD), K.BLUE]].forEach(function (z) {
        var txt = row[z[0]] + (deg === 90 && z[0] === 3 ? '' :
                  ' = ' + fmt(z[1], 3));
        label(c, txt, tx + cols[z[0]], yy,
              { size: tsz, align: 'left', weight: live ? 700 : 600,
                color: live ? z[2] : K.MUT });
      });
      c.restore();
    });

    wrapLabel(c, 'One point, one circle · its height is the sine, its sideways ' +
      'distance the cosine, and the slope of the radius the tangent · which is ' +
      'why tan blows up at 90°, where the radius is vertical and has no sideways ' +
      'distance left to divide by',
      ax.W / 2, ax.H - 10, ax.W - 30, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sl = slider(u.ctl, 'The angle θ', 0, 360, 1, S.th,
                  function (v) { return fmt(v, 0) + '°'; },
                  function (v) { S.th = v; draw(); });
  sl.quiet(S.th);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [[0, '0°'], [30, '30°'], [45, '45°'], [60, '60°'], [90, '90°']],
              30, function (v) { S.th = +v; sl.quiet(S.th); draw(); }));
  var pb = playBtn(u.ctl, '▶ Go round');
  pb.setAttribute('data-unsafe', '1');
  pb.addEventListener('click', function () {
    if (timer) { clearInterval(timer); timer = null; pb.textContent = '▶ Go round'; return; }
    pb.textContent = '❚❚ Pause';
    timer = setInterval(function () {
      S.th = (S.th + 2) % 361; sl.quiet(S.th); draw();
    }, 55);
  });
  node._stop = function () { if (timer) { clearInterval(timer); timer = null; pb.textContent = '▶ Go round'; } };

  var rd = readout(u.ctl);
  rd.innerHTML = 'Sine, cosine and tangent are not three functions to memorise, ' +
    'they are <b>one point going round one circle</b>. The height of the point is ' +
    'the sine, its sideways distance is the cosine, and the tangent is one divided ' +
    'by the other. Press the special angles and watch his slide 35 light up a row ' +
    'at a time — those five rows are five places on this circle, which is a great ' +
    'deal easier than learning a table.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   4. SOLVER — his three equation examples, with the answer drawn

   One unknown, two unknowns, and a quadratic: slides 28, 29 and 30.  The
   first two reproduce exactly.  The third is where the deck has something
   to say.

   His slide 30 graphs y = −2x² + 5x − 2, states in its own text that the
   curve crosses the x-axis at x = ½ and x = 2, applies the quadratic
   formula correctly, and then concludes that the two values are "x = ½ and
   x = 1".  The roots are ½ and 2.  His graph is right; the last line is
   not, and the last line is the one a student copies.

   So each case is drawn: the single value on a number line, the two
   equations as two lines crossing at the answer, and the quadratic as the
   parabola with its roots marked where it actually cuts the axis.
   ====================================================================== */
D.register('solver', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!DA) return;
  var EQ = DA.his.eqs, S = { i: 2, step: 99 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 660 : 410,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function draw() {
    var K = C(), e = EQ[S.i], r = eqSolve(e);
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.46;
    var box = { x: 10, y: 34, w: fw - 20, h: port ? ax.H * 0.30 : ax.H - 118 };

    if (e.kind === 'one') {
      var a2 = sub(ax, box.x + 50, box.y + box.h / 2 - 30,
                   ax.W - (box.x + box.w), ax.H - (box.y + box.h / 2 + 30));
      a2.setRange(-1, 8, -1, 1);
      c.save(); c.strokeStyle = K.INK; c.lineWidth = 2;
      c.beginPath(); c.moveTo(a2.X(-1), a2.Y(0)); c.lineTo(a2.X(8), a2.Y(0));
      c.stroke();
      for (var v = -1; v <= 8; v++) {
        c.beginPath(); c.moveTo(a2.X(v), a2.Y(0) - 6); c.lineTo(a2.X(v), a2.Y(0) + 6);
        c.stroke();
        label(c, String(v), a2.X(v), a2.Y(0) + 20, { size: 10.5, color: K.MUT });
      }
      c.restore();
      a2.dots([[r.x, 0]], { color: K.ACC, r: 8 });
      label(c, 'x = ' + fmt(r.x, 0), a2.X(r.x), a2.Y(0) - 26,
            { size: 15, color: K.ACC, weight: 700 });
      label(c, 'one equation, one unknown, one answer',
            box.x + box.w / 2, box.y + 10, { size: 12, weight: 700, color: K.INK });

    } else if (e.kind === 'two') {
      var b2 = sub(ax, box.x + 54, box.y + 8,
                   ax.W - (box.x + box.w), ax.H - (box.y + box.h));
      b2.setRange(-1, 4, -1, 5);
      b2.frame({ grid: true, xticks: [-1, 0, 1, 2, 3, 4], yticks: [-1, 0, 2, 4] });
      /* Axes.fn does not clip: drop each line where it leaves the frame so it
         cannot run up over the heading */
      function clipY(f) { return function (x) { var y = f(x); return (y < -1 || y > 5) ? NaN : y; }; }
      b2.fn(clipY(function (x) { return 3 - x; }), { color: K.ACC, width: 2.6 });
      b2.fn(clipY(function (x) { return 4 - 2 * x; }), { color: K.GRN, width: 2.6 });
      b2.dots([[r.x, r.y]], { color: K.VIO, r: 7 });
      label(c, 'x + y = 3', b2.X(2.5), b2.Y(0.5) - 2,
            { size: 11.5, color: K.ACC, weight: 700, plate: true });
      label(c, '2x + y = 4', b2.X(0.4), b2.Y(3.2),
            { size: 11.5, color: K.GRN, weight: 700, plate: true });
      label(c, 'x = ' + fmt(r.x, 0) + ', y = ' + fmt(r.y, 0),
            b2.X(r.x) + 16, b2.Y(r.y) - 18,
            { size: 13.5, align: 'left', color: K.VIO, weight: 700, plate: true });
      label(c, 'two equations, two unknowns, one crossing',
            box.x + box.w / 2, box.y - 12, { size: 12, weight: 700, color: K.INK });

    } else {
      var c2 = sub(ax, box.x + 54, box.y + 8,
                   ax.W - (box.x + box.w), ax.H - (box.y + box.h));
      c2.setRange(-0.4, 2.8, -1.6, 1.6);
      c2.frame({ grid: true, xticks: [0, 0.5, 1, 1.5, 2, 2.5],
                 yticks: [-1.5, 0, 1.5] });
      /* Axes.fn does not clip, so drop the curve where it leaves the frame
         rather than letting it run across the caption underneath */
      c2.fn(function (x) {
        var y = e.a * x * x + e.b * x + e.c;
        return (y < -1.55 || y > 1.55) ? NaN : y;
      }, { color: K.INK, width: 2.8, n: 600 });
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(c2.X(-0.4), c2.Y(0)); c.lineTo(c2.X(2.8), c2.Y(0));
      c.stroke(); c.restore();
      r.roots.forEach(function (x) {
        c2.dots([[x, 0]], { color: K.GRN, r: 7 });
        label(c, 'x = ' + fmt(x, 1), c2.X(x), c2.Y(0) - 22,
              { size: 12.5, color: K.GRN, weight: 700, plate: true });
      });
      /* and where his concluding line puts the second one */
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2; c.setLineDash([5, 4]);
      c.beginPath(); c.moveTo(c2.X(1), c2.Y(-1.5)); c.lineTo(c2.X(1), c2.Y(1.5));
      c.stroke(); c.restore();
      label(c, 'his last line says x = 1', c2.X(1), c2.Y(1.2),
            { size: 11, color: K.ACC, weight: 700, plate: true });
      label(c, 'y = −2x² + 5x − 2, the curve he draws',
            box.x + box.w / 2, box.y - 12, { size: 12, weight: 700, color: K.INK });
    }

    /* ---------------------------- the working ------------------------ */
    var px = port ? 16 : fw + 14, pw = port ? ax.W - 32 : ax.W - fw - 30;
    var py = port ? box.y + box.h + 40 : 40;
    py = wrapLabel(c, e.q, px, py + 20, pw,
                   { size: 13.5, align: 'left', weight: 700, color: K.INK }) + 16;
    for (var i = 0; i < e.steps.length; i += 2) {
      var yy = py + 24 + (i / 2) * (port ? 40 : 44);
      label(c, e.steps[i], px, yy,
            { size: 11, align: 'left', weight: 650, color: K.MUT });
      label(c, e.steps[i + 1], px, yy + 18,
            { size: 12.5, align: 'left', weight: 650, color: K.INK });
    }
    var ay = py + 24 + (e.steps.length / 2) * (port ? 40 : 44) + 6;
    var got = e.kind === 'one' ? fmt(r.x, 0)
            : e.kind === 'two' ? 'x = ' + fmt(r.x, 0) + ', y = ' + fmt(r.y, 0)
            : 'x = ' + fmt(r.roots[0], 1) + ' and x = ' + fmt(r.roots[1], 1);
    label(c, got, px, ay, { size: 16, align: 'left', weight: 700, color: K.ACC });

    var bad = e.kind === 'quad';
    label(c, bad ? 'his slide concludes x = ½ and x = 1'
                 : 'his slide prints the same',
          px, ay + 26, { size: 12, align: 'left', weight: 700,
                         color: bad ? K.ACC : K.GRN });

    wrapLabel(c, bad
      ? 'The formula on his slide is right and he applies it right. Only the ' +
        'concluding line is wrong — and his own graph, printed beside it, cuts ' +
        'the axis at ½ and 2. Reading the answer off the picture would have ' +
        'caught it, which is his own step eleven: check to see if the answer makes ' +
        'sense.'
      : 'Every step is one of the properties from slides 20 to 24: whatever you do ' +
        'to one side you do to the other, and the distributive property is what ' +
        'lets you multiply a bracket out.',
      ax.W / 2, ax.H - 10, ax.W - 30,
      { size: 11.5, color: bad ? K.ACC : K.MUT });
  }

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [[0, 'One unknown'], [1, 'Two unknowns'], [2, 'A quadratic']],
              2, function (v) { S.i = +v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'Three equations, three shapes of answer: a point on a line, a ' +
    'crossing of two lines, and the two places a curve cuts the axis. Drawing the ' +
    'answer is not decoration — it is the check. His slide 30 applies the ' +
    'quadratic formula correctly and then writes down the wrong pair of roots, and ' +
    'the graph printed on the same slide disagrees with the sentence underneath it.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   5. EXPONENTS — his review content, evaluated rather than asserted

   Two tabs, because his slides 20 to 27 are two lists: sixteen theorems
   about real numbers and eight laws of exponents.  A list of identities is
   a hard thing to read and an easy thing to check, so the figure checks
   them — both sides of every one, with the numbers he chose, and with the
   base and the powers on sliders for the exponent laws so that they can be
   watched holding for values he did not choose.

   All twenty-four hold.  Saying so is worth a figure: after several
   lectures of finding things to correct, it matters to be able to say
   plainly when a source is clean.
   ====================================================================== */
D.register('exponents', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!DA) return;
  var EX = DA.his.expo, TH = DA.his.theorems;
  var S = { tab: 'expo', base: 2, m: 3, n: 5 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 700 : 372,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* the eight laws, re-evaluated at whatever the sliders say */
  function liveLaw(e) {
    var q = { kind: e.kind, c: S.base, d: e.d == null ? 3 : e.d,
              a: e.kind === 'zero' ? 0 : S.m, b: S.n };
    if (e.kind === 'neg' || e.kind === 'prod' || e.kind === 'quot') q.a = S.m;
    if (e.kind === 'root') { q.a = S.m; q.b = Math.max(1, S.n); }
    return expoCheck(q);
  }

  function draw() {
    var K = C();
    ax.clear();

    if (S.tab === 'expo') {
      var colw = port ? ax.W - 32 : (ax.W - 60) / 2;
      var nleft = port ? EX.length : 4;
      EX.forEach(function (e, i) {
        var col = i < nleft ? 0 : 1;
        var row = i - col * nleft;
        var x = 24 + col * (colw + 12);
        var y = 40 + row * (port ? 72 : 72);
        var fixed = expoCheck(e), live = liveLaw(e);
        label(c, String(e.n), x, y,
              { size: 12, align: 'left', weight: 700, color: K.MUT });
        label(c, e.law, x + 22, y,
              { size: 14, align: 'left', weight: 700, color: K.INK });
        label(c, e.eg, x + 22, y + 21,
              { size: 11.5, align: 'left', weight: 600, color: K.MUT });
        var lhs = live.L, rhs = live.R;
        var txt = fmtSmart(lhs) + '  =  ' + fmtSmart(rhs);
        label(c, txt, x + 22, y + 42,
              { size: 12, align: 'left', weight: 700,
                color: live.ok ? K.GRN : K.ACC });
        label(c, live.ok ? '✓' : '✗', x + 4, y + 42,
              { size: 14, align: 'left', weight: 700,
                color: live.ok ? K.GRN : K.ACC });
        if (!fixed.ok)
          label(c, 'his own example does not hold', x + 22, y + 60,
                { size: 10.5, align: 'left', color: K.ACC, weight: 650 });
      });
      var all = EX.every(function (e) { return expoCheck(e).ok && liveLaw(e).ok; });
      label(c, all ? 'all eight hold, with his numbers and with these'
                   : 'one of the eight does not hold',
            ax.W / 2, ax.H - 36,
            { size: 13, weight: 700, color: all ? K.GRN : K.ACC });
      wrapLabel(c, 'The sliders change the base and the two powers · law 2 has no ' +
        'power to change and law 8 needs a whole root, so those two ignore them',
        ax.W / 2, ax.H - 12, ax.W - 30, { size: 11, color: K.MUT });

    } else {
      var cw = port ? ax.W - 32 : (ax.W - 70) / 2;
      var per = Math.ceil(TH.length / (port ? 1 : 2));
      TH.forEach(function (t, i) {
        var col = i < per ? 0 : 1;
        var x = 26 + col * (cw + 18);
        var y = 40 + (i - col * per) * (port ? 30 : 26);
        var ok = Math.abs(t.lhs - t.rhs) < 1e-9;
        label(c, (i + 1) + '.', x, y,
              { size: 10.5, align: 'left', weight: 650, color: K.MUT });
        label(c, t.law, x + 24, y,
              { size: 11.5, align: 'left', weight: 650, color: K.INK });
        label(c, t.eg, x + (port ? 210 : cw * 0.46), y,
              { size: 11, align: 'left', weight: 600, color: K.MUT });
        label(c, ok ? '✓' : '✗', x + cw - 10, y,
              { size: 12, align: 'right', weight: 700,
                color: ok ? K.GRN : K.ACC });
      });
      var allT = TH.every(function (t) { return Math.abs(t.lhs - t.rhs) < 1e-9; });
      label(c, allT ? 'all sixteen hold' : 'one of the sixteen does not',
            ax.W / 2, ax.H - 34,
            { size: 13, weight: 700, color: allT ? K.GRN : K.ACC });
      wrapLabel(c, 'His slide 24 · both sides of every identity evaluated with the ' +
        'numbers he chose',
        ax.W / 2, ax.H - 12, ax.W - 30, { size: 11, color: K.MUT });
    }
  }

  function fmtSmart(v) {
    if (!isFinite(v)) return '∞';
    if (Math.abs(v) >= 1e7 || (Math.abs(v) < 1e-4 && v !== 0))
      return v.toExponential(3);
    return (Math.round(v * 1e6) / 1e6).toString();
  }

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['expo', 'The eight laws of exponents'],
                    ['thm', 'The sixteen theorems']], 'expo',
              function (v) { S.tab = v; draw(); }));
  var sb = slider(u.ctl, 'The base', 2, 9, 1, S.base,
                  function (v) { return fmt(v, 0); },
                  function (v) { S.base = v; draw(); });
  var sm = slider(u.ctl, 'The first power', 1, 6, 1, S.m,
                  function (v) { return fmt(v, 0); },
                  function (v) { S.m = v; draw(); });
  var sn = slider(u.ctl, 'The second power', 1, 6, 1, S.n,
                  function (v) { return fmt(v, 0); },
                  function (v) { S.n = v; draw(); });
  sb.quiet(S.base); sm.quiet(S.m); sn.quiet(S.n);

  var rd = readout(u.ctl);
  rd.innerHTML = 'Twenty-four identities, and every one of them holds — with his ' +
    'numbers and with any others you slide to. That is worth saying out loud: his ' +
    'review content is <b>right</b>, and the only two things this deck corrects in ' +
    'fifty-nine slides are a quadratic’s roots and a cosine-law answer.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   6. AXES3 — the planes and the axes, on somebody who is actually moving

   His slides 39 to 58 are twenty slides of one figure being turned by hand:
   here is the sagittal plane, here is the frontal plane, here is where they
   intersect, here is what that axis measures.  Every one of those twenty
   pictures is this figure at a different camera angle, so one figure you
   can turn replaces all of them.

   And the axis convention he defines on slides 41 to 46 — z where the
   sagittal and frontal planes meet, measuring up and down; y where the
   frontal and transverse meet, measuring left and right; x where the
   sagittal and transverse meet, measuring front and back — is EXACTLY the
   convention the measured capture uses, so the labels here are his
   sentences rather than a translation of them.

   The body is a real walking stride (the same one the Forces deck shows),
   so his slides 47 to 50 — "joint axes move when the limbs are in a
   different anatomical location" — can be demonstrated rather than stated:
   press Walk and watch the planes stay put while the limbs leave them.
   ====================================================================== */
D.register('axes3', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!DA) return;
  var B = DA.body;
  var S = { p: 0.0, show: 'all' };
  var cam = { az: -0.95, el: 0.18 };
  var timer = null;

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 680 : 386,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  var PLANES = [
    ['sagittal', 'the sagittal plane', 'divides left from right', 'BLUE'],
    ['frontal', 'the frontal plane', 'divides front from back', 'GRN'],
    ['transverse', 'the transverse plane', 'divides top from bottom', 'ORG']
  ];
  var AXES = [
    ['z', [0, 0, 1], 'the z axis', 'where the sagittal and frontal planes meet',
     'distance along it is a measure of up and down', 'VIO'],
    ['y', [0, 1, 0], 'the y axis', 'where the frontal and transverse planes meet',
     'distance along it is a measure of left and right', 'ACC'],
    ['x', [1, 0, 0], 'the x axis', 'where the sagittal and transverse planes meet',
     'distance along it is a measure of front and back', 'BLUE']
  ];

  function draw() {
    var K = C(), P = bodyAt(S.p);
    if (!P) return;
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.60;
    var box = { x: 8, y: 20, w: fw - 16, h: port ? ax.H * 0.46 : ax.H - 92 };
    var o = bodyOrigin(P);

    /* a fixed scale so the body does not breathe as it walks */
    var SCALE = Math.min((box.w - 20) / 1.95, (box.h - 20) / 2.25);
    var cx = box.x + box.w / 2, cy = box.y + box.h / 2 + SCALE * 0.18;
    function sx(p) { var q = proj([p[0] - o[0], p[1] - o[1], p[2] - o[2]], cam); return cx + q[0] * SCALE; }
    function sy(p) { var q = proj([p[0] - o[0], p[1] - o[1], p[2] - o[2]], cam); return cy - q[1] * SCALE; }
    function dep(p) { return proj([p[0] - o[0], p[1] - o[1], p[2] - o[2]], cam)[2]; }

    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    /* the floor, so "up" has a meaning */
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
    var fz = 0;
    for (var g = -1; g <= 1; g += 0.5) {
      c.beginPath();
      c.moveTo(sx([o[0] - 1, o[1] + g, fz]), sy([o[0] - 1, o[1] + g, fz]));
      c.lineTo(sx([o[0] + 1, o[1] + g, fz]), sy([o[0] + 1, o[1] + g, fz]));
      c.moveTo(sx([o[0] + g, o[1] - 1, fz]), sy([o[0] + g, o[1] - 1, fz]));
      c.lineTo(sx([o[0] + g, o[1] + 1, fz]), sy([o[0] + g, o[1] + 1, fz]));
      c.stroke();
    }
    c.restore();

    /* the planes, painted back to front */
    var quads = [];
    PLANES.forEach(function (pl) {
      if (S.show !== 'all' && S.show !== pl[0]) return;
      var Q = planeQuad(pl[0], o, 0.46);
      var d = Q.reduce(function (s, p) { return s + dep(p); }, 0) / 4;
      quads.push({ Q: Q, col: K[pl[3]], d: d, name: pl[1], sub: pl[2] });
    });
    quads.sort(function (a, b) { return b.d - a.d; });
    quads.forEach(function (z) {
      c.save();
      c.fillStyle = z.col; c.globalAlpha = 0.13;
      c.beginPath();
      z.Q.forEach(function (p, i) {
        if (i) c.lineTo(sx(p), sy(p)); else c.moveTo(sx(p), sy(p));
      });
      c.closePath(); c.fill();
      c.globalAlpha = 0.75; c.strokeStyle = z.col; c.lineWidth = 1.8;
      c.stroke(); c.restore();
    });

    /* the body */
    B.links.forEach(function (L) {
      var p = P[L[0]], q = P[L[1]];
      if (!p || !q) return;
      var right = /R$/.test(L[0]) || /R$/.test(L[1]);
      c.save();
      c.strokeStyle = L[2] === 'c' ? K.INK : right ? K.INK : K.MUT;
      c.globalAlpha = L[2] === 'c' || right ? 1 : 0.55;
      c.lineWidth = L[2] === 'c' ? 7 : 5.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(sx(p), sy(p)); c.lineTo(sx(q), sy(q)); c.stroke();
      c.restore();
    });
    ['hipR', 'kneeR', 'ankR', 'shR', 'elR'].forEach(function (j) {
      if (P[j]) pin(c, sx(P[j]), sy(P[j]), 4);
    });
    /* a head, so the figure reads as a person rather than a stick */
    if (P.head) {
      c.save();
      c.fillStyle = K.PLATE; c.strokeStyle = K.INK; c.lineWidth = 3;
      c.beginPath(); c.arc(sx(P.head), sy(P.head), SCALE * 0.085, 0, 7);
      c.fill(); c.stroke(); c.restore();
    }

    /* the three axes through the origin */
    AXES.forEach(function (A) {
      if (S.show !== 'all' && S.show !== A[0]) return;
      var L = 0.92;
      var p0 = [o[0] - A[1][0] * L, o[1] - A[1][1] * L, o[2] - A[1][2] * L];
      var p1 = [o[0] + A[1][0] * L, o[1] + A[1][1] * L, o[2] + A[1][2] * L];
      arrow(c, sx(p0), sy(p0), sx(p1), sy(p1),
            { color: K[A[5]], width: 3, head: 11 });
      label(c, A[0], sx(p1) + 12, sy(p1) - 10,
            { size: 15, color: K[A[5]], weight: 700, plate: true });
    });
    c.save(); c.fillStyle = K.INK;
    c.beginPath(); c.arc(sx(o), sy(o), 5, 0, 7); c.fill(); c.restore();
    c.restore();

    label(c, fmt(S.p * 100, 0) + ' % of the stride · drag to turn',
          box.x + box.w / 2, box.y + box.h + 14,
          { size: 11, color: K.MUT, weight: 650 });

    /* --------------------------- the legend -------------------------- */
    var px = port ? 16 : fw + 10, pw = port ? ax.W - 32 : ax.W - fw - 26;
    var py = port ? box.y + box.h + 30 : 44;
    label(c, 'his slides 39 to 46, in one figure', px, py,
          { size: 12.5, align: 'left', weight: 700, color: K.INK });
    var cw = port ? ax.W * 0.5 : 0;
    PLANES.forEach(function (pl, i) {
      var yy = py + 26 + i * 34;
      if (port) { px = 16; }
      c.save(); c.strokeStyle = K[pl[3]]; c.lineWidth = 4;
      c.beginPath(); c.moveTo(px, yy); c.lineTo(px + 18, yy); c.stroke(); c.restore();
      label(c, pl[1], px + 26, yy,
            { size: 12, align: 'left', weight: 700, color: K[pl[3]] });
      label(c, pl[2], px + 26, yy + 15,
            { size: 10.5, align: 'left', color: K.MUT, weight: 600 });
    });
    AXES.forEach(function (A, i) {
      var yy = port ? py + 26 + i * 52 : py + 140 + i * 46;
      if (port) px = 16 + cw;
      c.save(); c.strokeStyle = K[A[5]]; c.lineWidth = 4;
      c.beginPath(); c.moveTo(px, yy); c.lineTo(px + 18, yy); c.stroke(); c.restore();
      label(c, A[2], px + 26, yy,
            { size: 12, align: 'left', weight: 700, color: K[A[5]] });
      label(c, A[3], px + 26, yy + 15,
            { size: 10.5, align: 'left', color: K.MUT, weight: 600 });
      label(c, A[4], px + 26, yy + 29,
            { size: 10.5, align: 'left', color: K.MUT, weight: 600 });
    });

    wrapLabel(c, 'A measured walking stride · the planes are fixed in the room ' +
      'and the body moves through them, which is his slides 47 to 50: the joint ' +
      'axes go with the limbs, not with the diagram',
      ax.W / 2, ax.H - 10, ax.W - 30, { size: 11, color: K.MUT });
  }

  dragTurn(u.cv, cam, draw);

  u.ctl.className = 'ictls g2';
  var sp = slider(u.ctl, 'Where in the stride', 0, 1, 1 / (B.n - 1), S.p,
                  function (v) { return fmt(v * 100, 0) + ' %'; },
                  function (v) { S.p = v; draw(); });
  sp.quiet(S.p);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['all', 'Everything'], ['sagittal', 'Sagittal'],
                    ['frontal', 'Frontal'], ['transverse', 'Transverse'],
                    ['z', 'z'], ['y', 'y'], ['x', 'x']], 'all',
              function (v) { S.show = v; draw(); }));
  var pb = playBtn(u.ctl, '▶ Walk');
  pb.setAttribute('data-unsafe', '1');
  pb.addEventListener('click', function () {
    if (timer) { clearInterval(timer); timer = null; pb.textContent = '▶ Walk'; return; }
    pb.textContent = '❚❚ Pause';
    timer = setInterval(function () {
      S.p = (S.p + 1 / (B.n - 1)) % 1.0001; if (S.p > 1) S.p = 0;
      sp.quiet(S.p); draw();
    }, 70);
  });
  node._stop = function () { if (timer) { clearInterval(timer); timer = null; pb.textContent = '▶ Walk'; } };

  var rd = readout(u.ctl);
  rd.innerHTML = 'Three planes, three axes, and a real person walking through ' +
    'them. The convention is his, off slides 41 to 46: <b>z</b> where sagittal and ' +
    'frontal meet, up and down; <b>y</b> where frontal and transverse meet, left ' +
    'and right; <b>x</b> where sagittal and transverse meet, front and back. Drag ' +
    'to turn it; press Walk and the planes stay put while the limbs swing out of ' +
    'them.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   7. TOPICS — his slide 11, as a map of the course that now exists

   His slide 11 is two columns of topic names: the mechanics on the left,
   the special topics on the right.  Until this term that was a promise.
   Every one of those topics is now a deck, so the list can be the thing it
   was always trying to be — a way in.

   Clicking a topic opens its lecture.  That is the one thing this slide
   could not do in PowerPoint and the reason the introduction was worth
   converting last rather than first.
   ====================================================================== */
D.register('topics', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!DA) return;
  var T = DA.topics;

  /* a grid of links rather than a canvas: these are navigation, and
     navigation should be real anchors that a keyboard can reach */
  var wrap = el('div', 'topicgrid');
  var seen = {};
  T.forEach(function (t) {
    var a = document.createElement('a');
    a.className = 'topiclink';
    a.href = '../' + t[1] + '/index.html';
    a.innerHTML = '<span class="tname">' + t[0] + '</span>' +
                  '<span class="tdeck">' + t[1].replace(/^\d+-/, '').replace(/-/g, ' ') +
                  '</span>';
    if (seen[t[1]]) a.classList.add('dup');
    seen[t[1]] = 1;
    wrap.appendChild(a);
  });
  u.stage.innerHTML = '';
  u.stage.appendChild(wrap);
  u.stage.classList.add('topicstage');

  var n = Object.keys(seen).length;
  var rd = readout(u.ctl);
  rd.innerHTML = 'His slide 11, with the lectures attached. Every topic on that ' +
    'list is now an interactive deck — <b>' + n + ' of them</b> — and ' +
    'this is the only slide in the course that can say so. That is the argument ' +
    'for converting the introduction last: a map is not much use until there is ' +
    'something to map.';

  node._draw = function () {};
});

/* ======================================================================
   8. TUTORQ1A — the Tutor's Basic Math and Trigonometry sections

   Twenty-nine questions, every one worked.  Twenty-eight reconcile exactly
   with the answer the Tutor accepts.

   Basic Math question 6 does not, and it is not a rounding quibble.  Its
   own printed method is Vi = (d − ½at²)/t, which with its own givens —
   d = 100 m, t = 4 s, a = 3 m/s² — gives 19 m/s.  The band it accepts is
   5.5 m/s, which is what that same formula gives for d = 46 m.  A student
   who does it right is told they are wrong.

   And one thing worth knowing about every band in the Tutor: it grades with
   a bare  min ≤ answer ≤ max  and no tolerance whatever, so a band whose
   two ends are equal is an exact match on the digits.  That works here
   because every band is the correctly rounded answer — but it is why the
   figure shows the rounded value as well as the exact one.
   ====================================================================== */
D.register('tutorq1a', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!DA) return;
  var Q = DA.tutor, S = { sec: 'math', i: 0 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 560 : 380,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function list() { return Q.filter(function (q) { return q.s === S.sec; }); }

  function method(q) {
    switch (q.kind) {
      case 'vi_sq': return ['Vƒ² = Vᵢ² + 2ad, so Vᵢ = √(Vƒ² − 2ad)',
        '√(' + q.vf + '² − 2(' + q.a + ')(' + q.d + '))'];
      case 't_lin': return ['Vƒ = Vᵢ + at, so t = (Vƒ − Vᵢ)/a',
        '(' + q.vf + ' − ' + q.vi + ') / ' + q.a];
      case 'vf_imp': return ['Ft = m(Vƒ − Vᵢ), so Vƒ = Ft/m + Vᵢ',
        '(' + q.F + ')(' + q.t + ')/' + q.m + ' + ' + q.vi];
      case 't_imp': return ['Ft = m(Vƒ − Vᵢ), so t = m(Vƒ − Vᵢ)/F',
        q.m + '(' + q.vf + ' − ' + q.vi + ') / ' + q.F];
      case 'm_imp': return ['Ft = m(Vƒ − Vᵢ), so m = Ft/(Vƒ − Vᵢ)',
        '(' + q.F + ')(' + q.t + ') / (' + q.vf + ' − ' + q.vi + ')'];
      case 'vi_d': return ['d = Vᵢt + ½at², so Vᵢ = (d − ½at²)/t',
        '(' + q.d + ' − ½(' + q.a + ')(' + q.t + ')²) / ' + q.t];
      case 'y7': return ['isolate the square, then take the root',
        '√((26 + √2 − 4√8) / 12)'];
      case 'x8': return ['the √8 on both sides cancels',
        '8 / (43 − 12)'];
      case 'z9': return ['multiply through by √5, divide by 33, take the root',
        '√(5√5 / 33)'];
      case 'a10': return ['multiply by √55, add 14, take the root',
        '√((44 − √55)√55 + 14)'];
      case 'x11': return ['collect the x terms: x(2y² + 1) = −12',
        '−12 / (2(' + q.y + ')² + 1)'];
      case 'y12': return ['isolate y² = −(12 + x)/2x, then take the root',
        '√(−(12 + (' + q.x + ')) / (2 × ' + q.x + '))'];
      case 'rt_angA': return ['B is the right angle, so b is the hypotenuse and a, c are the legs',
        'A = tan⁻¹(a / c) = tan⁻¹(' + q.a + ' / ' + q.c + ')'];
      case 'rt_angC': return ['the other acute angle', 'C = tan⁻¹(c / a)'];
      case 'rt_hyp': return ['Pythagoras', '√(' + q.a + '² + ' + q.c + '²)'];
      case 'rt_third': return ['the three angles sum to 180°', '180 − 90 − ' + q.A];
      case 'rt_opp': return ['opposite = hypotenuse × sin', q.b + ' sin ' + q.A + '°'];
      case 'rt_adj': return ['adjacent = hypotenuse × cos', q.b + ' cos ' + q.A + '°'];
      case 'sine_b': return ['two angles and a side — the sine law',
        q.c + ' sin ' + q.B + '° / sin ' + q.C + '°'];
      case 'sine_A': return ['the three angles sum to 180°', '180 − ' + q.B + ' − ' + q.C];
      case 'sine_a': return ['the sine law again, with the angle just found',
        q.c + ' sin A / sin ' + q.C + '°'];
      case 'cos_A': case 'cos_B': case 'cos_C':
        return ['three sides — the cosine law, rearranged for the angle',
          'cos⁻¹((sum of the two squares − the third) / 2 × their product)'];
      case 'cosine_c': return ['two sides and the angle between them — the cosine law',
        '√(' + q.a + '² + ' + q.b + '² − 2(' + q.a + ')(' + q.b +
        ')cos ' + q.C + '°)'];
      case 'cos13_A': case 'cos13_B':
        return ['solve for c first, then the cosine law for the angle',
          'cos⁻¹(…) with all three sides known'];
    }
    return ['', ''];
  }

  function draw() {
    var K = C(), L = list(), q = L[Math.min(S.i, L.length - 1)];
    var v = tutorSolve(q), B = tutorBand(q, v), m = method(q);
    ax.clear();
    var pw = ax.W - 56;
    var y = 38;

    label(c, (q.s === 'math' ? 'Basic Math' : 'Trigonometry') +
             ', question ' + q.n, 28, y,
          { size: 12, align: 'left', color: K.MUT, weight: 650 });
    y = wrapLabel(c, q.q, 28, y + 48, pw,
                  { size: 14.5, align: 'left', weight: 650, color: K.INK });

    var yy = y + (port ? 48 : 52);
    wrapLabel(c, m[0], 28, yy, pw, { size: 11.5, align: 'left', color: K.MUT });
    yy = wrapLabel(c, m[1], 28, yy + (port ? 30 : 34), pw,
                   { size: 13, align: 'left', weight: 650, color: K.INK });
    label(c, '= ' + fmt(v, B.dp + 2) + ' ' + q.u, 28, yy + (port ? 34 : 38),
          { size: 16.5, align: 'left', weight: 700, color: K.ACC });

    var by = yy + (port ? 68 : 76);
    var band = q.band[0] === q.band[1] ? 'only ' + q.band[0]
             : q.band[0] + ' to ' + q.band[1];
    label(c, 'the Tutor accepts ' + band + ' ' + q.u, 28, by,
          { size: 12.5, align: 'left', weight: 700,
            color: B.sound ? K.GRN : K.ACC });
    label(c, B.roundedIn
            ? '— which is this answer to ' + B.dp + ' decimal' +
              (B.dp === 1 ? '' : 's') + ', so it is right'
            : B.truncIn
            ? '— which is this answer cut off at ' + B.dp +
              ' decimals rather than rounded, so enter ' + B.trunc +
              ' and not ' + B.rounded
            : '— which is not this answer, rounded or otherwise',
          28, by + 20, { size: 12, align: 'left', weight: 650,
                         color: B.roundedIn ? K.GRN : B.truncIn ? K.ORG : K.ACC });

    if (q.note)
      wrapLabel(c, q.note, ax.W / 2, ax.H - 12, ax.W - 44,
                { size: 11.5, color: K.ACC });
    else
      wrapLabel(c, 'The Tutor grades with a bare min ≤ answer ≤ max and no ' +
        'tolerance at all, so a band with both ends the same is an exact match on ' +
        'the digits — enter the rounded value it shows, not the full one.',
        ax.W / 2, ax.H - 12, ax.W - 44, { size: 11.5, color: K.MUT });
  }

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  var chipRow = null;
  function rebuild() {
    if (chipRow) chipRow.parentNode.removeChild(chipRow);
    chipRow = ctlRow(u.ctl);
    keepOut(chips(chipRow, list().map(function (q, i) { return [i, String(q.n)]; }),
                  S.i, function (v) { S.i = +v; draw(); }));
  }
  keepOut(seg(row, [['math', 'Basic Math'], ['trig', 'Trigonometry']], 'math',
              function (v) { S.sec = v; S.i = 0; rebuild(); draw(); }));
  rebuild();

  var rd = readout(u.ctl);
  rd.innerHTML = 'Twenty-nine questions and twenty-eight of them are exactly right. ' +
    '<b>Basic Math question 6 is not</b>: its own printed method, ' +
    'Vᵢ = (d − ½at²)/t, gives <b>19 m/s</b> from its own givens, ' +
    'and the answer it accepts is 5.5 — what that formula gives for d = 46 m ' +
    'rather than 100. Do it correctly and you are marked wrong. ' +
    '<b>Trigonometry question 15</b> has a milder version of the same thing: it ' +
    'wants 11.27° where the full calculation gives 11.28°. Both are worth ' +
    'reporting, and worth knowing before you lose ten minutes to either.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   9. METHOD — his eleven steps, on one problem, all the way down

   His slide 16 lists eleven steps for solving a biomechanics problem.  As a
   list it reads like advice.  Run it once, slowly, on a real problem and it
   turns into a procedure, and two of the steps earn their place loudly:

     step 4, write down the formulas that contain what you want, which is
       where the choice of equation actually happens;
     step 10, check to see if the answer makes sense — the step that would
       have caught the one error in this lecture, because a triangle cannot
       have a 0.32 m side closing two sides of 0.30 m and 0.15 m with 22°
       between them.

   The problem is the Tutor's Basic Math question 1, because it is one the
   students will meet that evening.
   ====================================================================== */
D.register('method', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { step: 10 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 640 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  var VF = 14, A = 2, D0 = 8;
  var VI = Math.sqrt(VF * VF - 2 * A * D0);

  var STEPS = [
    ['Read the problem carefully to understand what is asked.',
     'A sprinter is travelling at 14 m/s after accelerating at 2 m/s² over ' +
     '8 m. How fast was she going when she started?'],
    ['Write down what is to be determined.',
     'the initial velocity, Vᵢ'],
    ['When helpful, draw a diagram.',
     'a straight line, 8 m long, with Vᵢ at one end and 14 m/s at the other'],
    ['Identify and write down helpful formulas related to the variable.',
     'Vƒ = Vᵢ + at   ·   d = Vᵢt + ½at²   ·   ' +
     'Vƒ² = Vᵢ² + 2ad'],
    ['Write down all the given information relevant to those formulas.',
     'Vƒ = 14 m/s, a = 2 m/s², d = 8 m — and no time at all'],
    ['Select the formula that contains the givens and the unknown.',
     'the first two both need t, which we do not have. Only the third does not: ' +
     'Vƒ² = Vᵢ² + 2ad'],
    ['If no workable formula can be found, return to step 1.',
     'not needed here — but this is the step that saves you when the first ' +
     'formula you reach for has two unknowns in it'],
    ['Write it out and substitute the known quantities.',
     '14² = Vᵢ² + 2(2)(8)'],
    ['Use basic algebra to solve for the unknown.',
     'Vᵢ² = 196 − 32 = 164,  Vᵢ = √164 = ' + VI.toFixed(4)],
    ['Check to see if the answer makes sense.',
     'she sped up over the 8 m, so Vᵢ must be less than 14 — and ' +
     fmt(VI, 2) + ' is. A negative answer, or one above 14, would mean an ' +
     'arithmetic slip, not a fast sprinter.'],
    ['Box the answer and check the units.',
     'Vᵢ = ' + fmt(VI, 2) + ' m/s. √(m²/s²) is m/s, so the ' +
     'units come out right too.']
  ];

  function draw() {
    var K = C();
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.40;

    /* the little picture, which is step 3 */
    var box = { x: 12, y: 40, w: fw - 24, h: port ? 150 : 190 };
    var sc = new Scene(c, box).fit(-1.6, -2.2, 9.6, 2.6, 10);
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sc.X(0), sc.Y(0)); c.lineTo(sc.X(8), sc.Y(0));
    c.stroke();
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(sc.X(0), sc.Y(-0.5)); c.lineTo(sc.X(0), sc.Y(0.5));
    c.moveTo(sc.X(8), sc.Y(-0.5)); c.lineTo(sc.X(8), sc.Y(0.5)); c.stroke();
    c.restore();
    label(c, 'd = 8 m', sc.X(4), sc.Y(0) - 16, { size: 12, weight: 700, plate: true });
    arrow(c, sc.X(0.4), sc.Y(1.3), sc.X(2.4), sc.Y(1.3),
          { color: K.ACC, width: 2.6, head: 10 });
    label(c, S.step >= 8 ? 'Vᵢ = ' + fmt(VI, 2) + ' m/s' : 'Vᵢ = ?',
          sc.X(1.4), sc.Y(1.3) - 16,
          { size: 12.5, color: K.ACC, weight: 700 });
    arrow(c, sc.X(5.0), sc.Y(1.3), sc.X(7.8), sc.Y(1.3),
          { color: K.GRN, width: 3.2, head: 11 });
    label(c, 'Vƒ = 14 m/s', sc.X(6.4), sc.Y(1.3) - 16,
          { size: 12.5, color: K.GRN, weight: 700 });
    label(c, 'a = 2 m/s²', sc.X(4), sc.Y(-1.4),
          { size: 12, color: K.MUT, weight: 650 });

    /* the eleven steps */
    var px = port ? 16 : fw + 6, pw = port ? ax.W - 32 : ax.W - fw - 24;
    var py = port ? box.y + box.h + 30 : 34;
    var lh = port ? 24 : 28;
    STEPS.forEach(function (s, i) {
      var live = i <= S.step, now = i === S.step;
      var yy = py + i * lh;
      c.save(); c.globalAlpha = live ? 1 : 0.3;
      label(c, String(i + 1), px, yy,
            { size: 10.5, align: 'left', weight: 700,
              color: now ? K.ACC : K.MUT });
      label(c, s[0], px + 18, yy,
            { size: now ? 12 : 11.5, align: 'left',
              weight: now ? 700 : 600, color: now ? K.ACC : K.INK });
      c.restore();
    });

    /* what the current step actually says, under the diagram where there is
       room for it -- the step list fills the right column by itself */
    var sx2 = 16, sw = port ? ax.W - 32 : fw - 28;
    var sy = port ? py + STEPS.length * lh + 18 : box.y + box.h + 30;
    label(c, 'step ' + (S.step + 1), sx2, sy,
          { size: 11, align: 'left', weight: 700, color: K.ACC });
    wrapLabel(c, STEPS[S.step][1], sx2, sy + 24 + 34, sw,
              { size: 12.5, align: 'left', weight: 650, color: K.INK });

    var foot = S.step === 9
      ? 'This is the step the one error in this lecture would not have survived. ' +
        'Slide 38 prints a triangle side of 0.3227 m closing two sides of 0.30 m ' +
        'and 0.15 m with 22° between them. Sketch it and the answer is obviously ' +
        'too long; step ten catches it in a second.'
      : S.step === 5
      ? 'This is where the real decision is made. Two of the three equations need ' +
        'a time that was never given; only the third does not. Choosing the ' +
        'formula IS the problem — the algebra afterwards is bookkeeping.'
      : 'His slide 16, one step at a time, on the Tutor’s first Basic Math ' +
        'question.';
    wrapLabel(c, foot, ax.W / 2, ax.H - 10, ax.W - 30,
              { size: 11.5, color: S.step === 9 || S.step === 5 ? K.ACC : K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var ss = slider(u.ctl, 'Step', 0, STEPS.length - 1, 1, S.step,
                  function (v) { return fmt(v + 1, 0) + ' of 11'; },
                  function (v) { S.step = Math.round(v); draw(); });
  ss.quiet(S.step);
  var rd = readout(u.ctl);
  rd.innerHTML = 'Eleven steps, and the two that matter most are the ones that look ' +
    'like filler. <b>Step 6</b> is where the problem is actually solved: two of the ' +
    'three kinematics equations need a time nobody gave you, so there is only one ' +
    'left and no choice to agonise over. <b>Step 10</b> is the one that catches ' +
    'mistakes — including the one on his own slide 38.';

  node._draw = draw;
  draw();
});

window.IA = { triFromSSS: triFromSSS, triFromSAS: triFromSAS,
              triFromAAS: triFromAAS, triRight: triRight, triPoints: triPoints,
              expoCheck: expoCheck, eqSolve: eqSolve,
              tutorSolve: tutorSolve, tutorBand: tutorBand,
              bodyAt: bodyAt, bodyOrigin: bodyOrigin, proj: proj,
              planeQuad: planeQuad, RAD: RAD, DEG: DEG };
D.boot();
})();
