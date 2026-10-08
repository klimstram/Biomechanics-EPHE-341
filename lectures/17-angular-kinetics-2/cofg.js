/* ======================================================================
   EPHE 341 — Angular Kinetics 2: Centre of Gravity (lecture 17)

   The lecture's whole subject is one sum, Σ(m·r)/Σm, and where the
   numbers that go into it come from.  So nothing here is drawn to look
   right: every figure runs that sum on numbers that are either his own
   worked examples or Winter's anthropometry table applied to a measured
   standing pose, and the two subjects' whole-body centres of gravity come
   out at 55.1% and 55.4% of their own stature, which is the claim his
   slide 3 makes.  parts/selftest.js checks the arithmetic against values
   worked out independently in Python (scratchpad/mkcofg17.py).
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
/* ================= the anthropometry table, and bodies ================= */
var CD = window.COFG17 || null;

/* Winter's table rows by key, so nothing carries a second copy of a number
   that is printed on slide 15. */
var WT = {};
if (CD) CD.winter.forEach(function (r) { WT[r[0]] = {
  key: r[0], name: r[1], def: r[2], m: r[3],
  cmP: r[4], cmD: r[5], kCg: r[6], kP: r[7], kD: r[8], dens: r[9] }; });

function nsub() { return CD ? CD.subs.length : 0; }
/* NOT `seg` -- that name belongs to the segmented control in _head.js, and
   shadowing it here would break every widget's controls silently. */
function segRow(k) { return WT[k]; }

/* The sixteen segments that make a whole body. The limbs are counted on
   both sides, and the fractions sum to 1.000 -- the self-test checks it. */
var LIMB = [['thigh', 'hip', 'knee'], ['leg', 'knee', 'ank'], ['foot', 'ank', 'toe'],
            ['upperarm', 'sh', 'el'], ['forearm', 'el', 'wr']];

/* A pose is a flat dictionary of joint names to [x, y, z] in centimetres,
   x forward, y up from the floor, z to the subject's right. `bodyParts`
   puts the table on a pose and returns one entry per segment; `bodyCoM`
   reduces those to the whole-body centre of gravity. Both take the pose
   rather than a subject, so a posed figure and a measured one go through
   exactly the same arithmetic. */
function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function bodyParts(J) {
  var out = [];
  ['R', 'L'].forEach(function (sd) {
    LIMB.forEach(function (q) {
      var s = WT[q[0]];
      out.push({ n: s.name + ' ' + sd, k: q[0], m: s.m,
                 a: J[q[1] + sd], b: J[q[2] + sd],
                 p: lerp3(J[q[1] + sd], J[q[2] + sd], s.cmP) });
    });
    out.push({ n: 'Hand ' + sd, k: 'hand', m: WT.hand.m,
               a: J['wr' + sd], b: J['hand' + sd], p: J['hand' + sd] });
  });
  out.push({ n: 'Trunk', k: 'trunk', m: WT.trunk.m, a: J.pelvis, b: J.shoulder,
             p: lerp3(J.pelvis, J.shoulder, WT.trunk.cmP) });
  out.push({ n: 'Head + neck', k: 'headneck', m: WT.headneck.m, a: J.neck, b: J.ear,
             p: lerp3(J.neck, J.ear, WT.headneck.cmP) });
  return out;
}
function bodyCoM(parts, upto) {
  var n = (upto == null) ? parts.length : upto;
  var m = 0, x = 0, y = 0, z = 0;
  for (var i = 0; i < n; i++) {
    var q = parts[i];
    m += q.m; x += q.m * q.p[0]; y += q.m * q.p[1]; z += q.m * q.p[2];
  }
  return m > 0 ? { m: m, p: [x / m, y / m, z / m] } : { m: 0, p: [0, 0, 0] };
}

/* a deep copy of a measured pose, so a widget can bend it without
   disturbing the data everything else reads */
function clonePose(J) {
  var o = {};
  for (var k in J) if (J.hasOwnProperty(k)) o[k] = J[k].slice();
  return o;
}

/* rotate `names` about `pivot` in the plane `pl` ('sag' = x–y, 'front' =
   z–y, 'top' = x–z), by `a` radians */
function rotAbout(J, pivot, names, a, pl) {
  var o = J[pivot], ca = Math.cos(a), sa = Math.sin(a);
  var i = pl === 'front' ? 2 : 0, j = pl === 'top' ? 2 : 1;
  names.forEach(function (n) {
    var p = J[n], u = p[i] - o[i], v = p[j] - o[j];
    p[i] = o[i] + u * ca - v * sa;
    p[j] = o[j] + u * sa + v * ca;
  });
}

/* every joint distal to a given one, for the limb chains */
var DISTAL = {
  shR: ['elR', 'wrR', 'handR'], elR: ['wrR', 'handR'], wrR: ['handR'],
  shL: ['elL', 'wrL', 'handL'], elL: ['wrL', 'handL'], wrL: ['handL'],
  hipR: ['kneeR', 'ankR', 'toeR', 'heelR'], kneeR: ['ankR', 'toeR', 'heelR'],
  hipL: ['kneeL', 'ankL', 'toeL', 'heelL'], kneeL: ['ankL', 'toeL', 'heelL']
};

/* the stick body, in whichever plane */
var BONES = [['hipR', 'kneeR'], ['kneeR', 'ankR'], ['ankR', 'heelR'], ['heelR', 'toeR'],
             ['ankR', 'toeR'],
             ['hipL', 'kneeL'], ['kneeL', 'ankL'], ['ankL', 'heelL'], ['heelL', 'toeL'],
             ['ankL', 'toeL'],
             ['hipR', 'hipL'], ['pelvis', 'shoulder'], ['shR', 'shL'],
             ['shR', 'elR'], ['elR', 'wrR'], ['wrR', 'handR'],
             ['shL', 'elL'], ['elL', 'wrL'], ['wrL', 'handL'],
             ['shoulder', 'neck'], ['neck', 'ear']];

/* the inverse of Axes.X / Axes.Y, for turning a pointer position back into
   the units of the problem */
function invX(a, px) {
  return a.xmin + (px - a.pl) / (a.W - a.pl - a.pr) * (a.xmax - a.xmin);
}
function invY(a, py) {
  return a.ymin + (a.H - a.pb - py) / (a.H - a.pt - a.pb) * (a.ymax - a.ymin);
}

function pr2(q, plane) { return plane === 'front' ? [q[2], q[1]] : [q[0], q[1]]; }

function drawBody(c, J, sc, plane, o) {
  o = o || {};
  c.save();
  c.strokeStyle = o.color || C().INK; c.lineWidth = o.width || 4;
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (o.dash) c.setLineDash(o.dash);
  BONES.forEach(function (e) {
    if (!J[e[0]] || !J[e[1]]) return;
    var a = pr2(J[e[0]], plane), b = pr2(J[e[1]], plane);
    c.beginPath(); c.moveTo(sc.X(a[0]), sc.Y(a[1]));
    c.lineTo(sc.X(b[0]), sc.Y(b[1])); c.stroke();
  });
  /* the head, as a circle on the neck-to-ear line */
  var n = pr2(J.neck, plane), e2 = pr2(J.ear, plane);
  var hr = Math.hypot(e2[0] - n[0], e2[1] - n[1]) * 0.62;
  c.beginPath();
  c.arc(sc.X(e2[0]), sc.Y(e2[1] + hr * 0.35), Math.max(3, sc.L(hr)), 0, 7);
  c.stroke();
  c.restore();
}

/* ======================================================================
   1. COFG1D — the weighted average, and why it is the balance point

   His slides 4, 6, 7 and 8.  One figure does all four, because they are
   one idea told twice: Σ(m·r)/Σm locates the centre of gravity, and the
   reason that formula is the right one is that the net torque about the
   answer is zero.  The figure computes both, so the second is a result
   rather than an assertion.

   Drag the masses.  His two presets are the three equal masses from slide
   4 (which come out at 3 m whether they are spread out or stacked) and the
   thigh-leg-foot limb from slide 8 (0.39 m) -- whose masses, 10, 4.65 and
   1.45 kg, are Winter's fractions for a 100 kg person, which is the
   connection the deck makes explicit on the table slide.
   ====================================================================== */
D.register('cofg1d', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var PRE = {
    three: { n: 'Three equal masses',
             m: [{ m: 1, r: 1 }, { m: 1, r: 3 }, { m: 1, r: 5 }],
             lo: 0, hi: 6, unit: 'm', lab: ['A', 'B', 'C'] },
    stack: { n: 'All three together',
             m: [{ m: 1, r: 3 }, { m: 1, r: 3 }, { m: 1, r: 3 }],
             lo: 0, hi: 6, unit: 'm', lab: ['A', 'B', 'C'] },
    limb:  { n: 'Thigh, leg, foot',
             m: [{ m: 10, r: 0.50 }, { m: 4.65, r: 0.25 }, { m: 1.45, r: 0.10 }],
             lo: 0, hi: 0.6, unit: 'm', lab: ['thigh', 'leg', 'foot'] }
  };
  var S = { pre: 'three', torque: 0, drag: -1 };
  var M = PRE.three.m.map(function (q) { return { m: q.m, r: q.r }; });

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 440 : 330,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function cfg() { return PRE[S.pre]; }
  function cofg() {
    var sm = 0, sr = 0;
    M.forEach(function (q) { sm += q.m; sr += q.m * q.r; });
    return { m: sm, r: sm > 0 ? sr / sm : 0 };
  }
  /* the net torque of the weights about a point: Σ m g (r − p), signed so
     that a mass to the right of the point turns the bar one way and a mass
     to the left the other */
  function netT(p) {
    var t = 0;
    M.forEach(function (q) { t += q.m * 9.81 * (q.r - p); });
    return t;
  }

  var geo = null;
  function draw() {
    var K = C(), P = cfg(), g = cofg();
    ax.clear();
    var barY = port ? 150 : 132;
    var x0 = 70, x1 = ax.W - 70, w = x1 - x0;
    var X = function (r) { return x0 + (r - P.lo) / (P.hi - P.lo) * w; };
    geo = { X: X, barY: barY, x0: x0, x1: x1 };

    /* the bar */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 5; c.lineCap = 'butt';
    c.beginPath(); c.moveTo(x0 - 18, barY); c.lineTo(x1 + 18, barY); c.stroke();
    c.restore();
    /* a scale along it */
    var step = (P.hi - P.lo) > 2 ? 1 : 0.1;
    for (var t = P.lo; t <= P.hi + 1e-9; t += step) {
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(X(t), barY + 3); c.lineTo(X(t), barY + 10); c.stroke();
      c.restore();
      label(c, fmt(t, step < 1 ? 1 : 0), X(t), barY + 22, { size: 10.5, color: K.MUT });
    }
    label(c, 'distance from the left-hand end (' + P.unit + ')',
          (x0 + x1) / 2, barY + 42, { size: 11.5, color: K.MUT });

    /* the masses, as blocks standing on the bar */
    var mx = Math.max.apply(null, M.map(function (q) { return q.m; }));
    M.forEach(function (q, i) {
      var bw = port ? 26 : 34, bh = 12 + 30 * (q.m / mx);
      var cx = X(q.r);
      c.save();
      c.fillStyle = (S.drag === i) ? K.ACC : K.ACCFILL;
      c.strokeStyle = K.ACC; c.lineWidth = 1.6;
      c.fillRect(cx - bw / 2, barY - 3 - bh, bw, bh);
      c.strokeRect(cx - bw / 2, barY - 3 - bh, bw, bh);
      c.restore();
      label(c, fmt(q.m, q.m < 2 ? 2 : (q.m % 1 ? 2 : 0)) + ' kg', cx, barY - 10 - bh,
            { size: 11, color: K.ACC, weight: 700 });
      label(c, P.lab[i], cx, barY - 26 - bh, { size: 10.5, color: K.MUT });
      /* its weight, and its moment arm about the answer */
      if (S.torque) {
        c.save(); c.strokeStyle = K.VIO; c.lineWidth = 1.4; c.setLineDash([4, 3]);
        c.beginPath(); c.moveTo(cx, barY); c.lineTo(X(g.r), barY); c.stroke();
        c.restore();
      }
    });

    /* the answer */
    var gx = X(g.r);
    c.save(); c.strokeStyle = K.GRN; c.lineWidth = 2; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(gx, barY - 86); c.lineTo(gx, barY + 34); c.stroke();
    c.restore();
    c.save(); c.fillStyle = K.GRN;
    c.beginPath();
    c.moveTo(gx, barY + 6); c.lineTo(gx - 13, barY + 30); c.lineTo(gx + 13, barY + 30);
    c.closePath(); c.fill(); c.restore();
    label(c, 'centre of gravity  ' + fmt(g.r, P.hi > 2 ? 2 : 3) + ' ' + P.unit,
          gx, barY - 96, { size: 13, color: K.GRN, weight: 700, plate: true });

    /* the arithmetic, written out the way his slide writes it */
    var ty = barY + 76;
    var num = M.map(function (q) {
      return '(' + fmt(q.m, q.m % 1 ? 2 : 0) + ')(' + fmt(q.r, P.hi > 2 ? 0 : 2) + ')';
    }).join(' + ');
    var den = M.map(function (q) { return fmt(q.m, q.m % 1 ? 2 : 0); }).join(' + ');
    if (!S.torque) {
      label(c, 'CofG  =  Σ(m · r) ÷ Σm', ax.W / 2, ty,
            { size: 13.5, weight: 700, color: K.INK });
      label(c, '=  ( ' + num + ' )  ÷  ( ' + den + ' )', ax.W / 2, ty + 22,
            { size: 12.5, color: K.MUT });
      label(c, '=  ' + fmt(g.r, P.hi > 2 ? 2 : 3) + ' ' + P.unit,
            ax.W / 2, ty + 44, { size: 13.5, weight: 700, color: K.GRN });
    } else {
      var tt = netT(g.r);
      var terms = M.map(function (q) {
        return '(' + fmt(q.m, q.m % 1 ? 2 : 0) + ')(−9.81)(' +
               minus(fmt(q.r - g.r, 2)) + ')';
      }).join(' + ');
      label(c, 'Σ torque about the centre of gravity  =  Σ m g (r − r_cofg)',
            ax.W / 2, ty, { size: 13, weight: 700, color: K.INK });
      label(c, '=  ' + terms, ax.W / 2, ty + 21, { size: 11.5, color: K.MUT });
      label(c, '=  ' + fmt(Math.abs(tt) < 5e-3 ? 0 : tt, 2) + ' N·m',
            ax.W / 2, ty + 43, { size: 13.5, weight: 700,
                                 color: Math.abs(tt) < 5e-3 ? K.GRN : K.ACC });
    }

    label(c, S.torque
          ? 'the torques balance here and nowhere else — that is what makes it the balance point'
          : 'drag a block along the bar · the answer is the mean position weighted by mass',
          ax.W / 2, ax.H - 12, { size: 11.5, color: K.MUT });
  }

  /* --- dragging ------------------------------------------------------- */
  function hit(ev) {
    var r = u.cv.getBoundingClientRect();
    var px = (ev.clientX - r.left) / r.width * ax.W;
    var py = (ev.clientY - r.top) / r.height * ax.H;
    if (!geo || Math.abs(py - geo.barY) > 80) return -1;
    var best = -1, bd = 36;
    M.forEach(function (q, i) {
      var d = Math.abs(geo.X(q.r) - px);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function move(ev) {
    if (S.drag < 0) return;
    var P = cfg(), r = u.cv.getBoundingClientRect();
    var px = (ev.clientX - r.left) / r.width * ax.W;
    var v = P.lo + (px - geo.x0) / (geo.x1 - geo.x0) * (P.hi - P.lo);
    M[S.drag].r = Math.max(P.lo, Math.min(P.hi, Math.round(v * 100) / 100));
    draw();
  }
  u.cv.setAttribute('data-prevent-swipe', '1');
  u.cv.style.touchAction = 'none';
  u.cv.addEventListener('pointerdown', function (ev) {
    var i = hit(ev);
    if (i < 0) return;
    S.drag = i; u.cv.setPointerCapture(ev.pointerId); ev.preventDefault(); draw();
  });
  u.cv.addEventListener('pointermove', move);
  ['pointerup', 'pointercancel'].forEach(function (e) {
    u.cv.addEventListener(e, function () { S.drag = -1; draw(); });
  });

  u.ctl.className = 'ictls g2';
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['three', 'Three equal masses'], ['stack', 'Stacked'],
                     ['limb', 'Thigh, leg, foot']], S.pre, function (v) {
    S.pre = v;
    M = PRE[v].m.map(function (q) { return { m: q.m, r: q.r }; });
    draw();
  }));
  keepOut(seg(ctlRow(u.ctl), [[0, 'The formula'], [1, 'The torques about it']],
               S.torque, function (v) { S.torque = +v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'The centre of gravity is the <b>mean position of the mass</b>. Spread the ' +
    'three equal masses out or stack them in one place and the answer is the same 3 m, which ' +
    'is the clue that only the <em>weighted mean</em> matters. Then press <b>The torques ' +
    'about it</b>: the turning effects of the three weights cancel at that point and nowhere ' +
    'else. That is why it is the balance point.';
  node._draw = draw;
  draw();
});


/* ======================================================================
   2. COFG2D — the same sum, twice

   His slide 9.  Two dimensions is not a new idea, it is the one-dimensional
   calculation run once for x and once for y, and the figure says so by
   drawing both sums beside the axes they belong to.

   The numbers are his: thigh 10 kg at (15, 46), leg 4.65 kg at (19, 25),
   foot 1.45 kg at (27, 5), in centimetres.  His slide stops at the formula;
   the answer is (17.2, 36.2).
   ====================================================================== */
D.register('cofg2d', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var P0 = [{ n: 'thigh', m: 10,   x: 15, y: 46 },
            { n: 'leg',   m: 4.65, x: 19, y: 25 },
            { n: 'foot',  m: 1.45, x: 27, y: 5 }];
  var M = P0.map(function (q) { return { n: q.n, m: q.m, x: q.x, y: q.y }; });
  var S = { drag: -1, show: 'both' };

  var ax = new Axes(u.cv, { w: port ? 460 : 1000, h: port ? 520 : 380,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function cofg() {
    var sm = 0, sx = 0, sy = 0;
    M.forEach(function (q) { sm += q.m; sx += q.m * q.x; sy += q.m * q.y; });
    return { m: sm, x: sx / sm, y: sy / sm };
  }

  var geo = null;
  function draw() {
    var K = C(), g = cofg();
    ax.clear();
    var pw = port ? ax.W - 20 : ax.W * 0.52;
    var a2 = sub(ax, 54, 26, ax.W - pw + 14, port ? ax.H * 0.46 : 76);
    a2.setRange(0, 44, 0, 56);
    a2.frame({ grid: true, xticks: [0, 10, 20, 30, 40], yticks: [0, 10, 20, 30, 40, 50],
               yfmt: function (v) { return v.toFixed(0); } });
    geo = a2;

    /* the limb, joint to joint, through the three segment centres */
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2; c.setLineDash([4, 3]);
    c.beginPath();
    M.forEach(function (q, i) {
      var fn = i ? 'lineTo' : 'moveTo';
      c[fn](a2.X(q.x), a2.Y(q.y));
    });
    c.stroke(); c.restore();

    M.forEach(function (q, i) {
      var r = 5 + 7 * (q.m / 10);
      c.save();
      c.fillStyle = S.drag === i ? K.ACC : K.ACCFILL;
      c.strokeStyle = K.ACC; c.lineWidth = 1.8;
      c.beginPath(); c.arc(a2.X(q.x), a2.Y(q.y), r, 0, 7); c.fill(); c.stroke();
      c.restore();
      label(c, q.n + '  ' + fmt(q.m, q.m % 1 ? 2 : 0) + ' kg',
            a2.X(q.x) + r + 6, a2.Y(q.y) - 2,
            { size: 11, align: 'left', color: K.INK, plate: true });
      if (S.show !== 'y') {
        c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 1; c.setLineDash([3, 3]);
        c.beginPath(); c.moveTo(a2.X(q.x), a2.Y(q.y)); c.lineTo(a2.X(q.x), a2.Y(0));
        c.stroke(); c.restore();
      }
      if (S.show !== 'x') {
        c.save(); c.strokeStyle = K.VIO; c.lineWidth = 1; c.setLineDash([3, 3]);
        c.beginPath(); c.moveTo(a2.X(q.x), a2.Y(q.y)); c.lineTo(a2.X(0), a2.Y(q.y));
        c.stroke(); c.restore();
      }
    });

    /* the answer, and its two components on the axes */
    c.save(); c.strokeStyle = K.GRN; c.lineWidth = 1.6; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(a2.X(g.x), a2.Y(0)); c.lineTo(a2.X(g.x), a2.Y(g.y));
    c.lineTo(a2.X(0), a2.Y(g.y)); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.GRN; c.strokeStyle = K.PLATE; c.lineWidth = 2;
    c.beginPath(); c.arc(a2.X(g.x), a2.Y(g.y), 8, 0, 7); c.fill(); c.stroke();
    c.restore();
    label(c, 'CofG', a2.X(g.x) + 12, a2.Y(g.y) - 12,
          { size: 12.5, align: 'left', color: K.GRN, weight: 700, plate: true });
    label(c, fmt(g.x, 1), a2.X(g.x), a2.Y(0) + 15,
          { size: 11.5, color: K.BLUE, weight: 700, plate: true });
    label(c, fmt(g.y, 1), a2.X(0) - 18, a2.Y(g.y),
          { size: 11.5, color: K.VIO, weight: 700, align: 'right', plate: true });
    label(c, 'x (cm)', (a2.pl + ax.W - a2.pr) / 2, ax.H - a2.pb + 28,
          { size: 12, weight: 700, color: K.INK });

    /* the two sums, side by side */
    var bx = port ? 14 : ax.W - pw + 26, by = port ? ax.H * 0.52 : 44;
    var bw = port ? ax.W - 28 : pw - 40;
    function sum(title, key, col, y) {
      label(c, title, bx, y, { size: 13, align: 'left', weight: 700, color: col });
      var num = M.map(function (q) {
        return '(' + fmt(q.m, q.m % 1 ? 2 : 0) + ')(' + fmt(q[key], 0) + ')';
      }).join(' + ');
      var den = M.map(function (q) { return fmt(q.m, q.m % 1 ? 2 : 0); }).join(' + ');
      label(c, num, bx, y + 21, { size: 11, align: 'left', color: K.MUT });
      c.save(); c.strokeStyle = K.MUT; c.lineWidth = 1;
      c.beginPath(); c.moveTo(bx, y + 30); c.lineTo(bx + Math.min(bw, 250), y + 30);
      c.stroke(); c.restore();
      label(c, den, bx, y + 41, { size: 11, align: 'left', color: K.MUT });
      label(c, '=  ' + fmt(key === 'x' ? g.x : g.y, 1) + ' cm',
            bx, y + 62, { size: 13.5, align: 'left', weight: 700, color: col });
    }
    sum('CofGₓ  =  Σ(m·x) ÷ Σm', 'x', K.BLUE, by);
    sum('CofGᵧ  =  Σ(m·y) ÷ Σm', 'y', K.VIO, by + 92);
    label(c, 'one calculation, run once per axis — there is no two-dimensional formula',
          bx, by + 186, { size: 11.5, align: 'left', color: K.MUT });

    label(c, 'Measured · the masses are Winter’s fractions for a 100 kg person: ' +
             'thigh 0.100, leg 0.0465, foot 0.0145',
          ax.W / 2, ax.H - 10, { size: 11, color: K.MUT });
  }

  function hit(ev) {
    if (!geo) return -1;
    var r = u.cv.getBoundingClientRect();
    var px = (ev.clientX - r.left) / r.width * ax.W;
    var py = (ev.clientY - r.top) / r.height * ax.H;
    var best = -1, bd = 26;
    M.forEach(function (q, i) {
      var d = Math.hypot(geo.X(q.x) - px, geo.Y(q.y) - py);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  u.cv.setAttribute('data-prevent-swipe', '1');
  u.cv.style.touchAction = 'none';
  u.cv.addEventListener('pointerdown', function (ev) {
    var i = hit(ev);
    if (i < 0) return;
    S.drag = i; u.cv.setPointerCapture(ev.pointerId); ev.preventDefault(); draw();
  });
  u.cv.addEventListener('pointermove', function (ev) {
    if (S.drag < 0 || !geo) return;
    var r = u.cv.getBoundingClientRect();
    var px = (ev.clientX - r.left) / r.width * ax.W;
    var py = (ev.clientY - r.top) / r.height * ax.H;
    M[S.drag].x = Math.max(0, Math.min(44, Math.round(invX(geo, px))));
    M[S.drag].y = Math.max(0, Math.min(56, Math.round(invY(geo, py))));
    draw();
  });
  ['pointerup', 'pointercancel'].forEach(function (e) {
    u.cv.addEventListener(e, function () { S.drag = -1; draw(); });
  });

  u.ctl.className = 'ictls g2';
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['both', 'Both axes'], ['x', 'x only'], ['y', 'y only']], S.show,
               function (v) { S.show = v; draw(); }));
  var rs = el('button', 'icalc-chip'); rs.textContent = 'Reset to his numbers';
  rs.setAttribute('data-unsafe', '1');
  rs.addEventListener('click', function () {
    M = P0.map(function (q) { return { n: q.n, m: q.m, x: q.x, y: q.y }; }); draw();
  });
  row.appendChild(rs);
  var rd = readout(u.ctl);
  rd.innerHTML = 'Drag a segment. The x sum and the y sum are the <b>same calculation</b> run ' +
    'on different coordinates, and neither one knows about the other — which is why the ' +
    'centre of gravity of a limb can sit outside the limb entirely. Bend it far enough and ' +
    'watch the green dot leave the leg.';
  node._draw = draw;
  draw();
});

/* ======================================================================
   3. SEGTABLE — the anthropometry table, used rather than displayed

   His slide 15 is a wall of numbers.  Every one of them is a fraction
   waiting for a body, so this figure supplies the body: give it a mass and
   a stature and it turns the row into the four numbers a problem actually
   asks for -- the segment's mass, where along it the centre of gravity
   sits measured from either end, and the moment of inertia about three
   different axes.

   It also closes the loop on his own limb example.  Set the body mass to
   100 kg and the thigh, leg and foot masses come out at 10, 4.65 and
   1.45 kg: the numbers on slide 8 are this table, and the figure says so.
   ====================================================================== */
D.register('segtable', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!CD) return;
  var S = { k: 'thigh', M: 100, H: 170 };

  /* segment lengths as a fraction of stature (Winter, Table 4.1's
     segment-length proportions) -- the table gives the centre of mass as a
     fraction of segment LENGTH, so a length is needed before any of it
     becomes a distance */
  var LEN = { hand: 0.108, forearm: 0.146, upperarm: 0.186, forearmhand: 0.254,
              totalarm: 0.440, foot: 0.152, leg: 0.246, thigh: 0.245,
              footleg: 0.285, totalleg: 0.530, headneck: 0.182, trunk: 0.288,
              trunkheadneck: 0.470, hat: 0.470, hatmidrib: 0.470,
              thorax: 0.129, abdomen: 0.097, pelvis: 0.095,
              thorabd: 0.226, abdpelvis: 0.192, shouldermass: 0.129 };
  var PICK = ['thigh', 'leg', 'foot', 'totalleg', 'upperarm', 'forearm', 'hand',
              'totalarm', 'trunk', 'headneck', 'hat'];

  var ax = new Axes(u.cv, { w: port ? 460 : 1020, h: port ? 560 : 360,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function draw() {
    var K = C(), r = WT[S.k], L = LEN[S.k] * S.H / 100;   /* metres */
    ax.clear();
    var m = r.m * S.M;

    /* ---- the segment, drawn to scale, with the centre of gravity on it -- */
    var bx = port ? 20 : 24, bw = port ? ax.W - 40 : ax.W * 0.46;
    var by = port ? 52 : 70;
    var x0 = bx + 56, x1 = bx + bw - 56;
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, by + 26); c.lineTo(x1, by + 26); c.stroke();
    c.restore();
    [[x0, 'proximal'], [x1, 'distal']].forEach(function (q) {
      pin(c, q[0], by + 26, 7);
      label(c, q[1], q[0], by + 50, { size: 11, color: K.MUT });
    });
    var gx = x0 + (x1 - x0) * r.cmP;
    c.save(); c.fillStyle = K.GRN; c.strokeStyle = K.PLATE; c.lineWidth = 2;
    c.beginPath(); c.arc(gx, by + 26, 9, 0, 7); c.fill(); c.stroke(); c.restore();
    label(c, 'centre of gravity', gx, by + 2, { size: 11.5, color: K.GRN, weight: 700 });
    /* the two distances, from each end */
    [[x0, gx, r.cmP, K.BLUE, by - 20, 'from the proximal end'],
     [gx, x1, r.cmD, K.VIO, by + 68, 'from the distal end']].forEach(function (q) {
      if (q[2] == null) return;
      c.save(); c.strokeStyle = q[3]; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(q[0], q[4]); c.lineTo(q[1], q[4]); c.stroke();
      [q[0], q[1]].forEach(function (xx) {
        c.beginPath(); c.moveTo(xx, q[4] - 5); c.lineTo(xx, q[4] + 5); c.stroke();
      });
      c.restore();
      label(c, fmt(q[2], 3) + ' L  =  ' + fmt(q[2] * L * 100, 1) + ' cm',
            (q[0] + q[1]) / 2, q[4] + (q[4] < by ? -12 : 14),
            { size: 11.5, color: q[3], weight: 650, plate: true });
    });
    label(c, r.name + '  ·  ' + r.def, bx + bw / 2, by - 44,
          { size: 12, color: K.MUT });
    label(c, 'segment length ' + fmt(L * 100, 1) + ' cm',
          bx + bw / 2, by + 96, { size: 11.5, color: K.MUT });

    /* ------------------------- the four numbers --------------------- */
    var px = port ? 20 : bx + bw + 24, pw = port ? ax.W - 40 : ax.W - bx - bw - 48;
    var py = port ? by + 140 : 44;
    function row(y, lab, val, col, note) {
      label(c, lab, px, y, { size: 12, align: 'left', color: K.MUT });
      label(c, val, px + pw, y, { size: 14, align: 'right', weight: 700, color: col });
      if (note) label(c, note, px, y + 16, { size: 10.5, align: 'left', color: K.MUT });
    }
    row(py, 'segment mass  =  ' + fmt(r.m, 4) + ' × body mass',
        fmt(m, m < 10 ? 2 : 1) + ' kg', K.ACC);
    var kcg = r.kCg, kp = r.kP, kd = r.kD;
    if (kcg != null) {
      row(py + 44, 'I about its own centre of gravity  =  m (k L)²',
          fmt(m * Math.pow(kcg * L, 2), 3) + ' kg·m²', K.GRN,
          'k = ' + fmt(kcg, 3) + ' of segment length');
      row(py + 92, 'I about the proximal end',
          fmt(m * Math.pow(kp * L, 2), 3) + ' kg·m²', K.BLUE,
          'k = ' + fmt(kp, 3) + '  — the parallel axis theorem, already done');
      if (kd != null) {
        row(py + 140, 'I about the distal end',
            fmt(m * Math.pow(kd * L, 2), 3) + ' kg·m²', K.VIO,
            'k = ' + fmt(kd, 3));
      }
    } else {
      label(c, 'his table prints a dash for the radii of gyration of this row —',
            px, py + 50, { size: 11.5, align: 'left', color: K.MUT });
      label(c, 'the moment of inertia of a trunk segment is not a segment-length',
            px, py + 68, { size: 11.5, align: 'left', color: K.MUT });
      label(c, 'fraction, because the trunk is not a rod.',
            px, py + 86, { size: 11.5, align: 'left', color: K.MUT });
    }
    if (r.dens != null) {
      label(c, 'density ' + fmt(r.dens, 2) + ' × 10³ kg/m³' +
               (r.dens < 1 ? '  — the thorax floats' : ''),
            px, py + (kcg != null ? 190 : 116),
            { size: 11, align: 'left', color: K.MUT });
    }

    /* the connection to his own worked example */
    if (Math.abs(S.M - 100) < 0.5 && (S.k === 'thigh' || S.k === 'leg' || S.k === 'foot')) {
      label(c, 'at 100 kg this is the ' + r.name.toLowerCase() + ' mass on his slide 8',
            ax.W / 2, ax.H - 28, { size: 12, color: K.GRN, weight: 650 });
    }
    label(c, 'Winter, Table 4.1, after Dempster — the table on his slide 15, ' +
             'with a body put into it',
          ax.W / 2, ax.H - 10, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var s1 = slider(u.ctl, 'Body mass', 30, 120, 1, S.M,
                  function (v) { return fmt(v, 0) + ' kg'; },
                  function (v) { S.M = v; draw(); });
  var s2 = slider(u.ctl, 'Stature', 140, 200, 1, S.H,
                  function (v) { return fmt(v, 0) + ' cm'; },
                  function (v) { S.H = v; draw(); });
  s1.quiet(S.M); s2.quiet(S.H);
  var row1 = ctlRow(u.ctl);
  keepOut(seg(row1, PICK.slice(0, 6).map(function (k) { return [k, WT[k].name]; }),
              S.k, function (v) { S.k = v; draw(); }));
  var row2 = ctlRow(u.ctl);
  keepOut(seg(row2, PICK.slice(6).map(function (k) { return [k, WT[k].name]; }),
              S.k, function (v) { S.k = v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'Every number in his table is a <b>fraction waiting for a body</b>. Put one ' +
    'in and the row becomes the four numbers a problem asks for. Leave the mass at 100 kg and ' +
    'press thigh, leg and foot in turn: 10, 4.65 and 1.45 kg — the masses in his own ' +
    'worked example are this table.';
  node._draw = draw;
  draw();
});


/* ======================================================================
   4. BOARD — the reaction board

   His slide 11.  One scale reading and one equation give the centre of
   gravity of a whole person, which is the oldest measurement in the
   lecture and still the one a student can do in an afternoon.

   A warning the deck repeats out loud: his slide writes the moment
   equation as Wp*L1 + Wb*0.5L2 + S*L2 = 0, with all three terms added.
   Three positive terms cannot sum to zero.  The scale pushes UP while the
   two weights pull DOWN, so one sign has to change, and the figure draws
   the arrows so the signs are visible rather than remembered.
   ====================================================================== */
D.register('board', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!CD) return;
  var S = { sub: 0, L2: 2.0, Mb: 8, arms: 0 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 500 : 350,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* The person on the board is the measured standing pose laid down, so
     the scale reading the figure reports is the one this subject would
     actually produce -- L1 is their own measured centre of gravity height
     counted from the head end. */
  function state() {
    var s = CD.subs[S.sub];
    var H = s.height_cm / 100;
    /* arms overhead moves the centre of gravity toward the head, which is
       the pivot, so L1 shrinks; the shift is computed from the table
       rather than guessed */
    var shift = 0;
    if (S.arms) {
      var armM = 2 * (WT.upperarm.m + WT.forearm.m + WT.hand.m);
      /* each arm's centre of gravity travels about 0.60 of stature when it
         goes from hanging beside the hip to straight overhead */
      shift = armM * 0.60 * H;
    }
    var cgFromFeet = s.com_pc / 100 * H + shift;
    var L1 = H - cgFromFeet;            /* from the head end, which is the pivot */
    var Wp = s.mass_kg * 9.81;
    var Wb = S.Mb * 9.81;
    var Sr = (Wp * L1 + Wb * 0.5 * S.L2) / S.L2;   /* ΣM about O */
    return { s: s, H: H, L1: L1, Wp: Wp, Wb: Wb, Sr: Sr,
             cgFromFeet: cgFromFeet, pc: cgFromFeet / H * 100 };
  }

  function draw() {
    var K = C(), q = state();
    ax.clear();
    var bx = 70, bw = ax.W - 140, by = port ? 150 : 128;
    var X = function (m) { return bx + m / S.L2 * bw; };

    /* the board */
    c.save(); c.fillStyle = K.FILL2; c.strokeStyle = K.MUT; c.lineWidth = 1.4;
    c.fillRect(bx, by, bw, 10); c.strokeRect(bx, by, bw, 10); c.restore();

    /* The person, as a profile lying on the board with the head at the
       pivot. A measured standing pose drawn flat is unreadable -- the arms
       hang over the trunk and the whole thing crosses itself -- so the
       body is drawn as an outline whose STATIONS are this subject's own
       measured joint heights. Everything that enters the arithmetic is
       measured; only the thickness of the outline is drawn. */
    var hmax = q.s.height_cm;
    var alongX = function (yc) {
      return X(Math.max(0, Math.min(S.L2, (hmax - yc) / 100)));
    };
    var J = q.s.j;
    var STN = [
      [J.ear[1] + 4, 2],   [J.ear[1] - 2, 10],  [J.neck[1], 7],
      [J.shoulder[1], 12], [(J.shoulder[1] + J.pelvis[1]) / 2, 12],
      [J.pelvis[1], 11],   [(J.pelvis[1] + J.kneeR[1]) / 2, 9],
      [J.kneeR[1], 7],     [(J.kneeR[1] + J.ankR[1]) / 2, 6],
      [J.ankR[1], 5],      [J.ankR[1] - 3, 11]
    ];
    c.save();
    c.fillStyle = K.FILL0; c.strokeStyle = K.MUT; c.lineWidth = 1.8;
    c.lineJoin = 'round';
    c.beginPath();
    STN.forEach(function (st, i) {
      var xx = alongX(st[0]), yy = by - 6 - st[1] * 3.2;
      i ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
    });
    c.lineTo(alongX(STN[STN.length - 1][0]), by - 6);
    c.lineTo(alongX(STN[0][0]), by - 6);
    c.closePath(); c.fill(); c.stroke();
    c.restore();
    /* the head */
    c.save(); c.fillStyle = K.FILL2; c.strokeStyle = K.MUT; c.lineWidth = 1.8;
    c.beginPath();
    c.arc(alongX(J.ear[1] - 3), by - 6 - 11 * 3.2, 17, 0, 7);
    c.fill(); c.stroke(); c.restore();
    /* the arm, drawn above the trunk so it does not hide inside it */
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(alongX(J.shoulder[1]), by - 6 - 13 * 3.2);
    c.lineTo(alongX(J.elR[1]), by - 6 - 15 * 3.2);
    c.lineTo(alongX(J.wrR[1]), by - 6 - 13 * 3.2);
    c.stroke(); c.restore();
    /* the subject's own centre of gravity, on the body */
    c.save(); c.fillStyle = K.PLATE; c.strokeStyle = K.ACC; c.lineWidth = 2;
    c.beginPath(); c.arc(X(q.L1), by - 6 - 7 * 3.2, 5, 0, 7);
    c.fill(); c.stroke(); c.restore();
    label(c, 'c.g.', X(q.L1) + 10, by - 6 - 7 * 3.2 - 2,
          { size: 10.5, align: 'left', color: K.ACC, plate: true });

    /* the pivot */
    c.save(); c.fillStyle = K.BLUE;
    c.beginPath(); c.moveTo(bx, by + 10); c.lineTo(bx - 14, by + 36);
    c.lineTo(bx + 14, by + 36); c.closePath(); c.fill(); c.restore();
    label(c, 'O', bx - 24, by + 28, { size: 13, weight: 700, color: K.BLUE });

    /* the three forces, drawn so the signs are visible */
    function down(xx, lab, col) {
      arrow(c, xx, by - 2, xx, by + 46, { color: col, width: 3, head: 11 });
      label(c, lab, xx, by + 60, { size: 12.5, weight: 700, color: col, plate: true });
    }
    down(X(q.L1), 'Wₚ', K.ACC);
    down(X(S.L2 / 2), 'Wᵦ', K.VIO);
    arrow(c, X(S.L2), by + 44, X(S.L2), by - 36, { color: K.GRN, width: 3.4, head: 12 });
    label(c, 'S', X(S.L2) + 16, by - 30, { size: 14, weight: 700, color: K.GRN });
    /* the scale */
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 1.6;
    c.strokeRect(X(S.L2) - 26, by + 46, 52, 30);
    c.restore();
    label(c, fmt(q.Sr / 9.81, 1) + ' kg', X(S.L2), by + 61,
          { size: 12, weight: 700, color: K.GRN });

    /* the two lever arms */
    [[0, q.L1, K.ACC, by + 92, 'L₁ = ' + fmt(q.L1, 3) + ' m'],
     [0, S.L2, K.INK, by + 120, 'L₂ = ' + fmt(S.L2, 2) + ' m']].forEach(function (d) {
      c.save(); c.strokeStyle = d[2]; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(X(d[0]), d[3]); c.lineTo(X(d[1]), d[3]); c.stroke();
      [X(d[0]), X(d[1])].forEach(function (xx) {
        c.beginPath(); c.moveTo(xx, d[3] - 5); c.lineTo(xx, d[3] + 5); c.stroke();
      });
      c.restore();
      label(c, d[4], (X(d[0]) + X(d[1])) / 2, d[3] - 11,
            { size: 11.5, weight: 650, color: d[2], plate: true });
    });

    /* the arithmetic */
    var ty = by + 150;
    label(c, 'Σ M about O  =  0  →  S·L₂  −  Wₚ·L₁  ' +
             '−  Wᵦ·½L₂  =  0',
          ax.W / 2, ty, { size: 13.5, weight: 700, color: K.INK });
    label(c, 'S = ( ' + fmt(q.Wp, 0) + ' × ' + fmt(q.L1, 3) + '  +  ' +
             fmt(q.Wb, 0) + ' × ' + fmt(S.L2 / 2, 2) + ' ) ÷ ' + fmt(S.L2, 2) +
             '  =  ' + fmt(q.Sr, 0) + ' N  =  ' + fmt(q.Sr / 9.81, 1) + ' kg on the scale',
          ax.W / 2, ty + 21, { size: 11.5, color: K.MUT });
    label(c, 'and read backwards:  L₁ = ( S·L₂ − Wᵦ·½L₂ ) ' +
             '÷ Wₚ = ' + fmt(q.L1, 3) + ' m from the head  →  centre of gravity at ' +
             fmt(q.pc, 1) + '% of stature',
          ax.W / 2, ty + 43, { size: 12.5, weight: 650, color: K.GRN });
    label(c, 'Measured · ' + q.s.subject + ' · ' + fmt(q.s.height_cm, 0) + ' cm, ' +
             fmt(q.s.mass_kg, 0) + ' kg · his slide writes the three terms all added, ' +
             'which cannot be zero — the scale pushes up while the weights pull down',
          ax.W / 2, ax.H - 10, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var s1 = slider(u.ctl, 'Board length', 1.6, 2.6, 0.05, S.L2,
                  function (v) { return fmt(v, 2) + ' m'; },
                  function (v) { S.L2 = v; draw(); });
  var s2 = slider(u.ctl, 'Board mass', 2, 20, 0.5, S.Mb,
                  function (v) { return fmt(v, 1) + ' kg'; },
                  function (v) { S.Mb = v; draw(); });
  s1.quiet(S.L2); s2.quiet(S.Mb);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [[0, 'Arms at the side'], [1, 'Arms overhead']], S.arms,
               function (v) { S.arms = +v; draw(); }));
  if (nsub() > 1) {
    keepOut(chips(row, CD.subs.map(function (x, i) { return [i, x.subject]; }), 0,
                  function (v) { S.sub = v; draw(); }));
  }
  var rd = readout(u.ctl);
  rd.innerHTML = 'One scale reading locates the centre of gravity of a whole person. Raise the ' +
    'arms overhead and the centre of gravity moves <b>toward the head</b>, which is the pivot, ' +
    'so the lever arm shortens and the scale reads <b>less</b> — the same weight, measured ' +
    'the same way, and a different answer because the body changed shape.';
  node._draw = draw;
  draw();
});

/* ======================================================================
   5. HEIGHT — is the centre of gravity really at 55 to 57% of stature?

   His slide 3 states it.  This figure measures it, on two real people,
   using his own table: take their standing marker set, put Winter's mass
   fractions and centre-of-mass fractions on each of sixteen segments, and
   add up.  Subject16 comes out at 55.1% of stature and Subject15 at
   55.4%, both inside his range.

   Adding the segments one at a time is the point of the animation.  The
   running answer starts at the feet, climbs as the legs go in, and is
   dragged up hard by the trunk -- which is half the body on its own.
   ====================================================================== */
D.register('height', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!CD) return;
  var S = { sub: 0, n: 16, plane: 'sag' };

  var ax = new Axes(u.cv, { w: port ? 460 : 1020, h: port ? 600 : 362,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* feet first, then up the body, so the running total climbs */
  var ORDER = ['Foot R', 'Foot L', 'Leg R', 'Leg L', 'Thigh R', 'Thigh L',
               'Hand R', 'Hand L', 'Forearm R', 'Forearm L',
               'Upper arm R', 'Upper arm L', 'Trunk', 'Head + neck'];

  function parts(s) {
    var p = bodyParts(s.j);
    var byName = {};
    p.forEach(function (q) { byName[q.n] = q; });
    var out = [];
    ORDER.forEach(function (n) { if (byName[n]) out.push(byName[n]); });
    p.forEach(function (q) { if (out.indexOf(q) < 0) out.push(q); });
    return out;
  }

  function draw() {
    var K = C(), s = CD.subs[S.sub], P = parts(s);
    var n = Math.max(1, Math.min(P.length, Math.round(S.n)));
    var g = bodyCoM(P, n), full = bodyCoM(P);
    ax.clear();

    var fw = port ? ax.W : ax.W * 0.40;
    var box = { x: 10, y: 24, w: fw - 20, h: (port ? ax.H * 0.52 : ax.H - 86) };
    var sc = new Scene(c, box).fit(-46, -6, 46, s.height_cm + 8, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    /* the floor */
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sc.X(-46), sc.Y(0)); c.lineTo(sc.X(46), sc.Y(0));
    c.stroke(); c.restore();
    /* the stature line and his 55–57% band */
    [[0.55, 0.57]].forEach(function (b) {
      c.save(); c.fillStyle = K.GRN; c.globalAlpha = 0.14;
      c.fillRect(sc.X(-46), sc.Y(b[1] * s.height_cm),
                 sc.X(46) - sc.X(-46), sc.Y(b[0] * s.height_cm) - sc.Y(b[1] * s.height_cm));
      c.restore();
    });
    label(c, '55–57%', sc.X(-44), sc.Y(0.655 * s.height_cm),
          { size: 10, align: 'left', color: K.GRN, plate: true });

    drawBody(c, s.j, sc, S.plane, { color: K.GRID, width: 3.4 });

    /* every segment centre of mass that is in so far, sized by its mass */
    P.forEach(function (q, i) {
      if (i >= n) return;
      var p = pr2(q.p, S.plane);
      c.save();
      c.fillStyle = K.ACC; c.globalAlpha = 0.75;
      c.beginPath(); c.arc(sc.X(p[0]), sc.Y(p[1]), 3 + 16 * Math.sqrt(q.m), 0, 7);
      c.fill(); c.restore();
    });
    /* the running answer */
    var gp = pr2(g.p, S.plane);
    c.save(); c.strokeStyle = K.GRN; c.lineWidth = 2; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(sc.X(-46), sc.Y(gp[1])); c.lineTo(sc.X(46), sc.Y(gp[1]));
    c.stroke(); c.restore();
    c.save(); c.fillStyle = K.GRN; c.strokeStyle = K.PLATE; c.lineWidth = 2.4;
    c.beginPath(); c.arc(sc.X(gp[0]), sc.Y(gp[1]), 9, 0, 7); c.fill(); c.stroke();
    c.restore();
    c.restore();
    label(c, S.plane === 'sag' ? 'from the side' : 'from behind',
          box.x + box.w / 2, box.y + box.h + 13, { size: 11.5, color: K.MUT });

    /* ------------------------ the running sum ----------------------- */
    var px = port ? 14 : fw + 10, pw = port ? ax.W - 28 : ax.W - fw - 26;
    var py = port ? box.y + box.h + 42 : 40;
    label(c, 'adding the segments, feet upwards', px, py,
          { size: 12, align: 'left', weight: 700, color: K.INK });
    var rh = port ? 14 : 12.6;
    P.forEach(function (q, i) {
      var y = py + 22 + i * rh, on = i < n;
      label(c, q.n, px + 4, y, { size: 9.8, align: 'left',
                                 color: on ? K.INK : K.GRID, weight: on ? 650 : 600 });
      label(c, fmt(q.m, 4), px + 126, y,
            { size: 9.8, align: 'right', color: on ? K.MUT : K.GRID });
      label(c, fmt(q.m * s.mass_kg, 2) + ' kg', px + 186, y,
            { size: 9.8, align: 'right', color: on ? K.ACC : K.GRID });
      if (on) {
        var r = bodyCoM(P, i + 1);
        label(c, fmt(r.p[1], 1) + ' cm', px + 258, y,
              { size: 9.8, align: 'right', color: K.GRN });
      }
    });
    var yb = py + 20 + P.length * rh + 6;
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
    c.beginPath(); c.moveTo(px + 4, yb - 6); c.lineTo(px + 264, yb - 6); c.stroke();
    c.restore();
    label(c, 'so far', px + 4, yb + 6, { size: 11, align: 'left', weight: 700, color: K.MUT });
    label(c, fmt(g.m, 4), px + 126, yb + 6,
          { size: 11, align: 'right', weight: 700, color: K.MUT });
    label(c, fmt(g.m * s.mass_kg, 2) + ' kg', px + 186, yb + 6,
          { size: 11, align: 'right', weight: 700, color: K.ACC });
    label(c, fmt(g.p[1], 1) + ' cm', px + 258, yb + 6,
          { size: 11, align: 'right', weight: 700, color: K.GRN });

    var done = n >= P.length;
    label(c, done
          ? 'whole body: ' + fmt(full.p[1], 1) + ' cm of ' + fmt(s.height_cm, 0) +
            ' cm  =  ' + fmt(s.com_pc, 1) + '% of stature'
          : fmt(n, 0) + ' of ' + P.length + ' segments — ' +
            fmt(g.m * 100, 1) + '% of the body mass so far',
          px, yb + 34, { size: 13, align: 'left', weight: 700,
                         color: done ? K.GRN : K.MUT });
    if (done) {
      label(c, 'his slide says 55 to 57% — and the fractions sum to ' +
               fmt(full.m, 3) + ', so nothing has been left out',
            px, yb + 54, { size: 11.5, align: 'left', color: K.MUT });
    }

    label(c, 'Measured · ' + s.subject + ' · ' + fmt(s.height_cm, 0) + ' cm, ' +
             fmt(s.mass_kg, 0) + ' kg · Winter’s table on this person’s own ' +
             'standing marker set · the head‑and‑neck end point is estimated, ' +
             'which moves the answer by half a point',
          ax.W / 2, ax.H - 10, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sN = slider(u.ctl, 'Segments added', 1, 16, 1, S.n,
                  function (v) { return fmt(v, 0) + ' of 16'; },
                  function (v) { S.n = v; draw(); });
  sN.quiet(S.n);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['sag', 'From the side'], ['front', 'From behind']], S.plane,
               function (v) { S.plane = v; draw(); }));
  if (nsub() > 1) {
    keepOut(chips(row, CD.subs.map(function (x, i) { return [i, x.subject]; }), 0,
                  function (v) { S.sub = v; draw(); }));
  }
  var pb = playBtn(u.ctl, '▶ Add them up');
  var rd = readout(u.ctl);
  rd.innerHTML = 'Drag the slider and watch the answer climb from the feet. The <b>trunk</b> ' +
    'is the moment that matters — half the body mass arriving at once. Both subjects ' +
    'finish inside his 55 to 57% band, and the mass fractions add to 1.000, so this is the ' +
    'whole body and not a part of it.';

  var raf = null, t0 = 0;
  function tick(t) {
    if (!t0) t0 = t;
    var v = 1 + (t - t0) / 2400 * 16;
    if (v >= 16) { v = 16; stop(); }
    S.n = v; sN.quiet(Math.round(v)); draw();
    if (raf) raf = requestAnimationFrame(tick);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; t0 = 0;
                    pb.textContent = '▶ Add them up'; }
  pb.addEventListener('click', function () {
    if (raf) { stop(); return; }
    S.n = 1; t0 = 0; pb.textContent = '❚❚ Pause';
    raf = requestAnimationFrame(tick);
  });
  node._stop = stop;
  node._draw = draw;
  draw();
});


/* ======================================================================
   6. POSABLE — move a limb, move the whole body's centre of gravity

   His slides 22, 23 and 24.  He asserts the rule: the centre of gravity
   shifts in the direction the limb moved, by an amount that depends on how
   heavy the limb is and how far it went.  Both halves of that are just
   Σ(m·r)/Σm with one term changed, so the figure lets the reader move the
   limb and does the sum again.

   The starting pose is measured, not drawn, so the numbers underneath are
   this person's.
   ====================================================================== */
D.register('posable', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!CD) return;
  var S = { sub: 0, plane: 'front', armR: 0, armL: 0, legR: 0, trunk: 0, show: 1 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1000, h: port ? 560 : 340,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function posed(s) {
    var J = clonePose(s.j);
    var pl = S.plane;
    if (S.armR) rotAbout(J, 'shR', DISTAL.shR, (pl === 'front' ? 1 : 1) * rad(S.armR), pl);
    if (S.armL) rotAbout(J, 'shL', DISTAL.shL, -(pl === 'front' ? 1 : 1) * rad(S.armL), pl);
    if (S.legR) rotAbout(J, 'hipR', DISTAL.hipR, rad(S.legR), pl);
    if (S.trunk) {
      var names = ['shoulder', 'shR', 'shL', 'neck', 'ear',
                   'elR', 'wrR', 'handR', 'elL', 'wrL', 'handL'];
      rotAbout(J, 'pelvis', names, rad(S.trunk), pl);
    }
    return J;
  }
  function rad(d) { return d * Math.PI / 180; }

  function draw() {
    var K = C(), s = CD.subs[S.sub];
    ax.clear();
    var J0 = s.j, J1 = posed(s);
    var g0 = bodyCoM(bodyParts(J0)), g1 = bodyCoM(bodyParts(J1));

    var fw = port ? ax.W : ax.W * 0.52;
    var box = { x: 8, y: 20, w: fw - 16, h: (port ? ax.H * 0.56 : ax.H - 84) };
    var sc = new Scene(c, box).fit(-78, -6, 78, s.height_cm + 10, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sc.X(-78), sc.Y(0)); c.lineTo(sc.X(78), sc.Y(0));
    c.stroke(); c.restore();

    /* the original pose, as a ghost, and the posed one over it */
    var moved = S.armR || S.armL || S.legR || S.trunk;
    if (moved) drawBody(c, J0, sc, S.plane, { color: K.GRID, width: 3, dash: [5, 4] });
    drawBody(c, J1, sc, S.plane, { color: K.INK, width: 4.4 });

    /* both centres of gravity, and the shift between them */
    var p0 = pr2(g0.p, S.plane), p1 = pr2(g1.p, S.plane);
    if (moved) {
      c.save(); c.fillStyle = K.GRID;
      c.beginPath(); c.arc(sc.X(p0[0]), sc.Y(p0[1]), 6, 0, 7); c.fill(); c.restore();
      arrow(c, sc.X(p0[0]), sc.Y(p0[1]), sc.X(p1[0]), sc.Y(p1[1]),
            { color: K.ACC, width: 2.4, head: 9 });
    }
    c.save(); c.fillStyle = K.GRN; c.strokeStyle = K.PLATE; c.lineWidth = 2.4;
    c.beginPath(); c.arc(sc.X(p1[0]), sc.Y(p1[1]), 9, 0, 7); c.fill(); c.stroke();
    c.restore();
    label(c, 'CofG', sc.X(p1[0]) + 14, sc.Y(p1[1]) - 10,
          { size: 12, align: 'left', color: K.GRN, weight: 700, plate: true });

    /* the segment the slider is moving, picked out */
    if (S.show && moved) {
      bodyParts(J1).forEach(function (q) {
        var p = pr2(q.p, S.plane);
        c.save(); c.fillStyle = K.ACC; c.globalAlpha = .55;
        c.beginPath(); c.arc(sc.X(p[0]), sc.Y(p[1]), 2 + 13 * Math.sqrt(q.m), 0, 7);
        c.fill(); c.restore();
      });
    }
    c.restore();
    label(c, S.plane === 'front' ? 'from behind' : 'from the side',
          box.x + box.w / 2, box.y + box.h + 13, { size: 11.5, color: K.MUT });

    /* --------------------------- the numbers ------------------------ */
    var px = port ? 16 : fw + 6, pw = port ? ax.W - 32 : ax.W - fw - 22;
    var py = port ? box.y + box.h + 44 : 46;
    var hor = S.plane === 'front' ? 2 : 0;
    var dH = (g1.p[hor] - g0.p[hor]), dV = (g1.p[1] - g0.p[1]);
    label(c, 'the whole body’s centre of gravity', px, py,
          { size: 13, align: 'left', weight: 700, color: K.INK });
    function num(y, lab, v, unit, col) {
      label(c, lab, px, y, { size: 12, align: 'left', color: K.MUT });
      label(c, minus(fmt(v, 1)) + ' ' + unit, px + pw - 10, y,
            { size: 13.5, align: 'right', weight: 700, color: col });
    }
    num(py + 26, S.plane === 'front' ? 'sideways' : 'forward', dH, 'cm',
        Math.abs(dH) < 0.05 ? K.MUT : K.ACC);
    num(py + 50, 'upward', dV, 'cm', Math.abs(dV) < 0.05 ? K.MUT : K.ACC);
    num(py + 74, 'height above the floor', g1.p[1], 'cm', K.GRN);
    num(py + 98, 'as a per cent of stature', g1.p[1] / s.height_cm * 100, '%', K.GRN);

    var armM = (WT.upperarm.m + WT.forearm.m + WT.hand.m) * s.mass_kg;
    label(c, 'one arm is ' + fmt(armM, 2) + ' kg, which is ' +
             fmt((WT.upperarm.m + WT.forearm.m + WT.hand.m) * 100, 1) +
             '% of this person — a small mass moved a long way',
          px, py + 132, { size: 11.5, align: 'left', color: K.MUT });
    label(c, 'the shift is Δ(m·r) ÷ Σm: the moved segment’s mass times ' +
             'how far it went, divided by the whole body',
          px, py + 152, { size: 11.5, align: 'left', color: K.MUT });

    label(c, 'Measured · ' + s.subject + ' · the starting pose is this person’s ' +
             'recorded standing trial; every bend is Winter’s table run again',
          ax.W / 2, ax.H - 10, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sa = slider(u.ctl, 'Right arm', 0, 180, 1, 0,
                  function (v) { return v ? fmt(v, 0) + '°' : 'down'; },
                  function (v) { S.armR = v; draw(); });
  var sb = slider(u.ctl, 'Left arm', 0, 180, 1, 0,
                  function (v) { return v ? fmt(v, 0) + '°' : 'down'; },
                  function (v) { S.armL = v; draw(); });
  var sc2 = slider(u.ctl, 'Right leg', -30, 60, 1, 0,
                   function (v) { return v ? minus(fmt(v, 0)) + '°' : 'neutral'; },
                   function (v) { S.legR = v; draw(); });
  var sd = slider(u.ctl, 'Lean the trunk', -40, 40, 1, 0,
                  function (v) { return v ? minus(fmt(v, 0)) + '°' : 'upright'; },
                  function (v) { S.trunk = v; draw(); });
  sa.quiet(0); sb.quiet(0); sc2.quiet(0); sd.quiet(0);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['front', 'From behind'], ['sag', 'From the side']], S.plane,
               function (v) { S.plane = v; draw(); }));
  keepOut(seg(row, [[1, 'Show the segments'], [0, 'Hide them']], S.show,
               function (v) { S.show = +v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'Lift one arm and the centre of gravity moves <b>toward it</b> — that is ' +
    'his rule, and here it is a consequence rather than a claim. Lift both and the sideways ' +
    'shift cancels while the upward one doubles. Lean the trunk and the shift is far larger, ' +
    'because the trunk is half the body.';
  node._draw = draw;
  draw();
});

/* ======================================================================
   7. COPCOM — the ground reaction force makes a torque about the CofG

   His slide 26 says it in one sentence and draws two stick figures.  It is
   measurable, so here it is measured: the centre of pressure and the
   ground reaction force come from the plate, the centre of mass is the
   authors' own, and the moment is (CoP − CoM) × F computed live.

   What comes out is the whole of walking in one trace.  Early in stance
   the foot is ahead of the body and the moment is positive, slowing the
   forward topple.  It crosses zero at midstance, where the force points
   straight through the centre of mass.  After that the foot is behind and
   the moment is negative -- the body is falling forward over the foot, and
   that fall is what the next step catches.
   ====================================================================== */
D.register('copcom', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!CD) return;
  var W = CD.walk;
  var S = { pc: 10, trail: 1 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1060, h: port ? 620 : 356,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* the centre of mass is carried resampled onto the plate's own clock, so
     no rounding is needed here -- doing the lookup by rounding to the
     nearest per cent of the cycle turns the moment trace into a staircase */
  function at(pcStance) {
    var k = Math.max(0, Math.min(W.ng - 1, Math.round(pcStance / 100 * (W.ng - 1))));
    return { k: k,
             cop: [W.cx[k], W.cy[k]],
             com: [W.comx_g[k], W.comy_g[k]],
             F: [W.fx[k], W.fy[k]], M: W.mom[k] };
  }

  function draw() {
    var K = C(), q = at(S.pc), BW = W.mass_kg * 9.81;
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.47;

    /* ------------------- the body, the force, the arm --------------- */
    var box = { x: 8, y: 22, w: fw - 18, h: (port ? ax.H * 0.46 : ax.H - 92) };
    var sc = new Scene(c, box).fit(-18, -8, 112, 124, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sc.X(-18), sc.Y(0)); c.lineTo(sc.X(112), sc.Y(0));
    c.stroke(); c.restore();

    /* the centre of mass path over the whole cycle */
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 1.6; c.globalAlpha = .45;
    c.beginPath();
    for (var i = 0; i <= 100; i++) {
      var X = sc.X(W.com.x[i]), Y = sc.Y(W.com.y[i]);
      i ? c.lineTo(X, Y) : c.moveTo(X, Y);
    }
    c.stroke(); c.restore();

    /* a schematic body, so the figure reads as a person rather than two
       dots -- the rod is the inverted pendulum of the balance figure, and
       drawing it makes the moment arm obvious */
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(sc.X(q.cop[0]), sc.Y(0));
    c.lineTo(sc.X(q.com[0]), sc.Y(q.com[1])); c.stroke();
    c.beginPath();
    c.arc(sc.X(q.com[0]), sc.Y(q.com[1] + 26), sc.L(11), 0, 7); c.stroke();
    c.beginPath();
    c.moveTo(sc.X(q.com[0]), sc.Y(q.com[1]));
    c.lineTo(sc.X(q.com[0]), sc.Y(q.com[1] + 15)); c.stroke();
    c.restore();
    /* the centre of pressure path under the foot */
    if (S.trail) {
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.4;
      c.beginPath();
      for (var k = 0; k < W.ng; k++) {
        var X2 = sc.X(W.cx[k]), Y2 = sc.Y(W.cy[k]);
        k ? c.lineTo(X2, Y2) : c.moveTo(X2, Y2);
      }
      c.stroke(); c.restore();
    }

    /* the force vector, drawn from the centre of pressure */
    var fsc = 40 / BW;
    var tipx = q.cop[0] + q.F[0] * fsc, tipy = q.cop[1] + q.F[1] * fsc;
    /* its line of action, extended both ways, so the moment arm is visible */
    var ux = q.F[0], uy = q.F[1], un = Math.hypot(ux, uy) || 1;
    ux /= un; uy /= un;
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1; c.setLineDash([4, 4]);
    c.globalAlpha = .6;
    c.beginPath();
    c.moveTo(sc.X(q.cop[0] - ux * 40), sc.Y(q.cop[1] - uy * 40));
    c.lineTo(sc.X(q.cop[0] + ux * 150), sc.Y(q.cop[1] + uy * 150));
    c.stroke(); c.restore();
    arrow(c, sc.X(q.cop[0]), sc.Y(q.cop[1]), sc.X(tipx), sc.Y(tipy),
          { color: K.ACC, width: 3.4, head: 12 });

    /* the perpendicular from the centre of mass to that line */
    var d = perp(q.com[0], q.com[1], q.cop[0], q.cop[1], ux, uy);
    var fx2 = q.com[0] - uy * d, fy2 = q.com[1] + ux * d;   /* foot of the perpendicular */
    c.save(); c.strokeStyle = K.VIO; c.lineWidth = 2; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(sc.X(q.com[0]), sc.Y(q.com[1]));
    c.lineTo(sc.X(fx2), sc.Y(fy2)); c.stroke(); c.restore();
    label(c, 'd⊥ ' + fmt(Math.abs(d), 1) + ' cm',
          (sc.X(q.com[0]) + sc.X(fx2)) / 2, (sc.Y(q.com[1]) + sc.Y(fy2)) / 2 - 10,
          { size: 11.5, color: K.VIO, weight: 650, plate: true });

    /* the two points */
    c.save(); c.fillStyle = K.ACC;
    c.beginPath(); c.arc(sc.X(q.cop[0]), sc.Y(q.cop[1]), 5, 0, 7); c.fill(); c.restore();
    label(c, 'CoP', sc.X(q.cop[0]), sc.Y(q.cop[1]) + 16,
          { size: 11, color: K.ACC, weight: 650, plate: true });
    c.save(); c.fillStyle = K.BLUE; c.strokeStyle = K.PLATE; c.lineWidth = 2;
    c.beginPath(); c.arc(sc.X(q.com[0]), sc.Y(q.com[1]), 8, 0, 7);
    c.fill(); c.stroke(); c.restore();
    label(c, 'CofG', sc.X(q.com[0]) + 13, sc.Y(q.com[1]) - 10,
          { size: 12, align: 'left', color: K.BLUE, weight: 700, plate: true });

    /* which way it turns the body */
    spin(c, sc.X(q.com[0]), sc.Y(q.com[1]), 17, q.M > 0, { color: K.VIO, width: 1.8 });
    c.restore();

    /* ------------------------- the moment trace --------------------- */
    var px = port ? 0 : fw, pw = port ? ax.W : ax.W - fw;
    var py = port ? box.y + box.h + 50 : 46;
    var ph = port ? ax.H - py - 92 : ax.H - 150;
    var a2 = sub(ax, px + 62, py, 24, ax.H - (py + ph));
    var lo = Math.min.apply(null, W.mom), hi = Math.max.apply(null, W.mom);
    var pad = (hi - lo) * 0.14; lo -= pad; hi += pad;
    a2.setRange(0, 100, lo, hi);
    a2.frame({ grid: true, zero: true, xticks: [0, 20, 40, 60, 80, 100],
               yticks: axisTicks(lo, hi),
               yfmt: function (v) { return minus(v.toFixed(0)); } });
    a2.poly(W.mom.map(function (v, k) { return [k / (W.ng - 1) * 100, v]; }),
            { color: K.VIO, width: 2.6 });
    /* where it crosses zero */
    var zx = -1;
    for (var k2 = 1; k2 < W.ng; k2++) {
      if ((W.mom[k2 - 1] > 0) !== (W.mom[k2] > 0) && k2 > W.ng * 0.1) { zx = k2; break; }
    }
    if (zx > 0) {
      var zp = zx / (W.ng - 1) * 100;
      c.save(); c.strokeStyle = K.GRN; c.lineWidth = 1.6; c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(a2.X(zp), a2.Y(lo)); c.lineTo(a2.X(zp), a2.Y(hi));
      c.stroke(); c.restore();
      label(c, 'straight through the CofG at ' + fmt(zp, 0) + '% of stance',
            a2.X(zp), a2.Y(hi) + 14, { size: 11, color: K.GRN, plate: true });
    }
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(a2.X(S.pc), a2.Y(lo)); c.lineTo(a2.X(S.pc), a2.Y(hi));
    c.stroke(); c.restore();
    a2.dots([[S.pc, q.M]], { color: K.ACC, r: 4.5 });
    label(c, 'moment of the ground reaction force about the CofG (N·m)',
          (a2.pl + ax.W - a2.pr) / 2, py - 10, { size: 12.5, weight: 700, color: K.INK });
    label(c, 'Per cent of stance', (a2.pl + ax.W - a2.pr) / 2, ax.H - a2.pb + 30,
          { size: 12, weight: 700, color: K.INK });

    var fr = wrapLabel(c, 'Measured · ' + W.subject + ' · ' + fmt(W.mass_kg, 0) +
             ' kg · plate at 240 Hz, the authors’ own centre of mass · the ' +
             'record opens a few milliseconds into contact',
          ax.W / 2, ax.H - 9, ax.W - 20, { size: 11, color: K.MUT });
    label(c, 'at ' + fmt(S.pc, 0) + '% of stance — ' +
             fmt(Math.abs(q.M), 1) + ' N·m, turning the body ' +
             (q.M > 0 ? 'backwards: the step is catching the fall'
                      : 'forwards: the body is toppling over the foot'),
          ax.W / 2, fr - 18, { size: 12.5, weight: 650,
                               color: q.M > 0 ? K.GRN : K.ACC });
  }

  u.ctl.className = 'ictls g2';
  var sP = slider(u.ctl, 'Through stance', 0, 100, 0.5, S.pc,
                  function (v) { return fmt(v, 0) + '%'; },
                  function (v) { S.pc = v; draw(); });
  sP.quiet(S.pc);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [[1, 'Show the CoP path'], [0, 'Hide it']], S.trail,
               function (v) { S.trail = +v; draw(); }));
  var pb = playBtn(u.ctl, '▶ Roll through stance');
  var rd = readout(u.ctl);
  rd.innerHTML = 'The force acts at the <b>centre of pressure</b> and the body turns about its ' +
    '<b>centre of gravity</b>, and those are two different points — so there is a moment. ' +
    'Watch it change sign at midstance, where the line of action passes straight through the ' +
    'centre of gravity. Before that the step is catching a fall; after it, the body is falling ' +
    'into the next one.';

  var raf = null, t0 = 0, base = 0;
  function tick(t) {
    if (!t0) t0 = t;
    var p = base + (t - t0) / 2600 * 100;
    if (p >= 100) { p = 0; base = 0; t0 = t; }
    S.pc = p; sP.quiet(p); draw();
    raf = requestAnimationFrame(tick);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null;
                    pb.textContent = '▶ Roll through stance'; }
  pb.addEventListener('click', function () {
    if (raf) { stop(); return; }
    pb.textContent = '❚❚ Pause'; base = S.pc; t0 = 0;
    raf = requestAnimationFrame(tick);
  });
  node._stop = stop;
  node._draw = draw;
  draw();
});

/* ======================================================================
   8. BALANCE — why the centre of pressure has to overshoot

   His slides 27 and 28 show Winter's record of quiet standing: the centre
   of pressure oscillates either side of the centre of gravity, with a
   larger amplitude.  His slide states that as a fact.  The reason is two
   lines of mechanics, and once they are on the screen it stops being a
   fact to memorise.

   Standing is an inverted pendulum about the ankles.  Taking moments about
   the centre of mass, with the mass at height h, and linearising,

        acceleration = (g/h) (x_CofG − x_CoP)

   so the centre of pressure does not follow the centre of gravity.  It is
   the only thing that can accelerate it, and to turn the body round it has
   to get past it.

   NOTE: this is a MODEL, and it is labelled as one on its face.  There is
   no posturography recording in any dataset available to this course, so
   unlike every other figure in these decks the trace here is simulated.
   Winter's own measured record is on the slide beside it.
   ====================================================================== */
/* The model itself lives at module scope, so parts/selftest.js runs the
   same arithmetic the figure runs rather than a copy of it. */
var BAL = { H: 0.90, G: 9.81, FOOT: [-6.0, 14.0] };   /* m, m/s², cm */
function balOmega() { return Math.sqrt(BAL.G / BAL.H); }
function balTarget(x, v, k, lead) { return x * (1 + k) + lead * v / balOmega(); }
function balAcc(x, cop) { return BAL.G / BAL.H * (x - cop); }

D.register('balance', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { mode: 'auto', k: 0.50, lead: 0.55, gain: 16, run: 1, t: 0,
            com: 0.6, vel: 0, cop: 0.6, trailC: [], trailP: [], tripped: 0 };

  var H = BAL.H, FOOT = BAL.FOOT;

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 560 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function omega() { return balOmega(); }

  /* One step of the pendulum; x in centimetres, v in cm/s.

     The control law is the part worth reading.  To hold the body up, the
     centre of pressure has to be placed at

         x_CoP = (1 + k) x_CofG + b v / ω

     which makes the acceleration −k ω² x − b ω v: a damped oscillator.
     Both terms have to be there.  The velocity term alone only damps, and
     the body drifts away with nothing pulling it back -- that was the
     first version of this widget, and it fell over every time.

     And look at what the first term says.  The centre of pressure is a
     MAGNIFIED copy of the centre of gravity, by the factor (1 + k).  Its
     amplitude is larger not as a quirk of one record but as a condition of
     standing up at all. */
  function step(dt) {
    if (S.mode === 'auto') {
      var target = balTarget(S.com, S.vel, S.k, S.lead);
      S.cop += (target - S.cop) * Math.min(1, S.gain * dt);
      /* quiet standing is not still: it is a small disturbance being
         continuously caught, and with no disturbance there is nothing
         to see */
      S.vel += (Math.sin(S.t * 1.31) + 0.7 * Math.sin(S.t * 3.07 + 1.1)
                + 0.5 * Math.sin(S.t * 0.61)) * 2.4 * dt;
    }
    S.cop = Math.max(FOOT[0], Math.min(FOOT[1], S.cop));
    S.vel += balAcc(S.com, S.cop) * dt;
    S.com += S.vel * dt;
    S.t += dt;
    if (S.com < FOOT[0] - 4 || S.com > FOOT[1] + 4) { S.tripped = 1; S.run = 0; }
    S.trailC.push(S.com); S.trailP.push(S.cop);
    if (S.trailC.length > 420) { S.trailC.shift(); S.trailP.shift(); }
  }

  function draw() {
    var K = C();
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.34;

    /* ------------------- the body as an inverted pendulum ----------- */
    var box = { x: 10, y: 20, w: fw - 20, h: (port ? ax.H * 0.38 : ax.H - 86) };
    var sc = new Scene(c, box).fit(-26, -10, 26, 122, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sc.X(-26), sc.Y(0)); c.lineTo(sc.X(26), sc.Y(0));
    c.stroke();
    c.fillStyle = K.FILL2; c.strokeStyle = K.MUT; c.lineWidth = 1.4;
    c.fillRect(sc.X(FOOT[0]), sc.Y(0) - 7, sc.X(FOOT[1]) - sc.X(FOOT[0]), 7);
    c.strokeRect(sc.X(FOOT[0]), sc.Y(0) - 7, sc.X(FOOT[1]) - sc.X(FOOT[0]), 7);
    c.restore();
    label(c, 'base of support', sc.X((FOOT[0] + FOOT[1]) / 2), sc.Y(0) + 20,
          { size: 10.5, color: K.MUT });

    /* the body: a stiff rod from the ankle to the centre of gravity */
    var hcm = H * 100;
    c.save();
    c.strokeStyle = S.tripped ? K.ACC : K.INK; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sc.X(0), sc.Y(0)); c.lineTo(sc.X(S.com), sc.Y(hcm));
    c.stroke(); c.restore();
    pin(c, sc.X(0), sc.Y(0), 6);

    /* the lever between the two points, which is the whole mechanism */
    c.save(); c.strokeStyle = K.VIO; c.lineWidth = 2; c.setLineDash([4, 3]);
    c.beginPath(); c.moveTo(sc.X(S.cop), sc.Y(7)); c.lineTo(sc.X(S.com), sc.Y(7));
    c.stroke(); c.restore();

    /* the ground reaction force, drawn from the centre of pressure */
    arrow(c, sc.X(S.cop), sc.Y(0), sc.X(S.cop), sc.Y(36),
          { color: K.ACC, width: 3.2, head: 11 });
    c.save(); c.fillStyle = K.ACC;
    c.beginPath(); c.arc(sc.X(S.cop), sc.Y(0), 5, 0, 7); c.fill(); c.restore();
    label(c, 'CoP', sc.X(S.cop), sc.Y(0) + 38,
          { size: 11.5, color: K.ACC, weight: 700, plate: true });

    c.save(); c.fillStyle = K.BLUE; c.strokeStyle = K.PLATE; c.lineWidth = 2.4;
    c.beginPath(); c.arc(sc.X(S.com), sc.Y(hcm), 11, 0, 7); c.fill(); c.stroke();
    c.restore();
    label(c, 'CofG', sc.X(S.com) + 17, sc.Y(hcm) - 13,
          { size: 12, align: 'left', color: K.BLUE, weight: 700, plate: true });
    c.restore();

    /* ---- the captions first: they decide how much room the trace has --
       Laying the plot out first and hoping the footer fits underneath is
       what put three lines of text through the x-axis in portrait. */
    var rng = function (a) { return Math.max.apply(null, a) - Math.min.apply(null, a); };
    var rc = rng(S.trailC), rp = rng(S.trailP);
    var ft = wrapLabel(c, 'A MODEL, not a recording · acceleration = (g/h)(x_CofG ' +
             '− x_CoP), h = ' + fmt(H, 2) + ' m · no quiet-standing trial exists in ' +
             'this course’s data · the model gives the larger amplitude and the ' +
             'phase lead; the extra high-frequency wobble in a real record is the muscles, ' +
             'not the mechanics',
          ax.W / 2, ax.H - 9, ax.W - 20, { size: 11, color: K.MUT });
    var top = wrapLabel(c, S.tripped
          ? 'the centre of gravity left the base of support — that is a step, or a fall'
          : 'the centre of pressure is the only thing that can accelerate the centre of ' +
            'gravity, so it has to get past it to turn the body round',
          ax.W / 2, ft - 18, ax.W - 24,
          { size: 12, weight: 600, color: S.tripped ? K.ACC : K.MUT });
    if (S.trailC.length > 120 && !S.tripped) {
      top = wrapLabel(c, 'amplitude  CoP ' + fmt(rp, 1) + ' cm  against  CofG ' + fmt(rc, 1) +
               ' cm — a ratio of ' + fmt(rc > 0.05 ? rp / rc : 0, 2) +
               ', which is the (1 + k) in the control law',
            ax.W / 2, top - 18, ax.W - 24,
            { size: 12, weight: 650, color: rp > rc ? K.GRN : K.MUT });
    }

    /* ------------------------- the two traces ----------------------- */
    var px = port ? 0 : fw;
    var py = port ? box.y + box.h + 46 : 38;
    var a2 = sub(ax, px + 60, py, 22, ax.H - (top - 16));
    var lo = -1.6, hi = 1.6;
    S.trailC.concat(S.trailP).forEach(function (v) {
      if (v < lo) lo = v; if (v > hi) hi = v;
    });
    var pad = (hi - lo) * 0.16; lo -= pad; hi += pad;
    a2.setRange(0, 420, lo, hi);
    a2.rect(0, Math.max(lo, FOOT[0]), 420, Math.min(hi, FOOT[1]), { fill: K.FILL0 });
    a2.frame({ grid: false, zero: true, xticks: [],
               yticks: axisTicks(lo, hi),
               yfmt: function (v) { return minus(v.toFixed(1)); } });
    function trace(arr, col, w) {
      if (arr.length < 2) return;
      a2.poly(arr.map(function (v, i) { return [i + (420 - arr.length), v]; }),
              { color: col, width: w });
    }
    trace(S.trailP, K.ACC, 1.9);
    trace(S.trailC, K.BLUE, 2.8);
    label(c, 'position along the foot (cm from the ankle)',
          (a2.pl + ax.W - a2.pr) / 2, py - 12,
          { size: 12.5, weight: 700, color: K.INK });
    label(c, 'centre of gravity', ax.W - a2.pr - 6, py + 14,
          { size: 11, align: 'right', color: K.BLUE, weight: 650, plate: true });
    label(c, 'centre of pressure', ax.W - a2.pr - 6, py + 30,
          { size: 11, align: 'right', color: K.ACC, weight: 650, plate: true });
  }

  /* ---- hand the plantarflexors to the reader ------------------------ */
  u.cv.setAttribute('data-prevent-swipe', '1');
  u.cv.style.touchAction = 'none';
  function grab(ev) {
    if (S.mode !== 'you') return;
    var r = u.cv.getBoundingClientRect();
    var fx = (ev.clientX - r.left) / r.width;
    var w = D.portrait() ? 1 : 0.34;
    S.cop = FOOT[0] + Math.max(0, Math.min(1, fx / w)) * (FOOT[1] - FOOT[0]);
    ev.preventDefault();
  }
  u.cv.addEventListener('pointerdown', function (ev) {
    if (S.mode === 'you' && u.cv.setPointerCapture) u.cv.setPointerCapture(ev.pointerId);
    grab(ev);
  });
  u.cv.addEventListener('pointermove', grab);

  function reset() {
    S.com = 0.6; S.vel = 0; S.cop = 0.6; S.t = 0;
    S.trailC = []; S.trailP = []; S.tripped = 0; S.run = 1;
  }

  u.ctl.className = 'ictls g2';
  var sk = slider(u.ctl, 'How far past the CofG you put the force', 0, 0.9, 0.02, S.k,
                  function (v) {
                    return v < 0.02 ? 'not past it at all — you fall'
                                    : '× ' + fmt(1 + v, 2);
                  },
                  function (v) { S.k = v; });
  var sl = slider(u.ctl, 'How far you lead the sway', 0, 1.2, 0.02, S.lead,
                  function (v) { return fmt(v, 2); },
                  function (v) { S.lead = v; });
  sk.quiet(S.k); sl.quiet(S.lead);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['auto', 'Let it balance itself'], ['you', 'You hold it up']], S.mode,
               function (v) { S.mode = v; reset(); }));
  var rb = el('button', 'icalc-chip', 'Reset');
  rb.setAttribute('data-unsafe', '1');
  rb.addEventListener('click', function () { reset(); });
  row.appendChild(rb);
  var rd = readout(u.ctl);
  rd.innerHTML = 'Standing is an inverted pendulum, and the centre of pressure is the only ' +
    'handle on it. Watch the two traces: the <b>centre of pressure swings further, and gets ' +
    'there first</b>, crossing from one side of the centre of gravity to the other — which ' +
    'is what Winter’s record shows. Then press <b>You hold it up</b> and move the pointer ' +
    'across the figure to put the force where you want it. Most people fall over in about two ' +
    'seconds.';

  var raf = null, last = 0;
  function loop(t) {
    var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;
    if (S.run) step(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; last = 0; }
  node._stop = stop;
  node._draw = function () { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };
  reset();
  node._draw();
});


/* ======================================================================
   9. FREEAXIS — a force through the centre, and a force that misses it

   His slides 29 to 32, the flicked pencil.  The claim is that a force
   through the centre of gravity translates the object, a force anywhere
   else translates AND rotates it, and the rotation is about the centre of
   gravity rather than about the point you pushed.

   The part students do not expect is the middle one: an off-centre flick
   does not trade translation away for rotation.  The centre of gravity's
   path is identical -- same direction, same speed.  So the figure draws
   that path and leaves it on the screen, and the slider moves only the
   point of application.

   Nothing here is fudged: a uniform rod, I = mL²/12, one impulse applied
   square to it, then free flight.  His own figure for this carries a
   burned-in copyright notice and so is not in the deck; this is drawn from
   the equations instead.
   ====================================================================== */
/* the rod, and what one impulse does to it -- at module scope so the
   self-test runs the figure's own arithmetic */
var ROD = { L: 22, m: 0.012 };                       /* cm, kg */
ROD.I = ROD.m * Math.pow(ROD.L / 100, 2) / 12;       /* kg·m² */
/* an impulse J N·s applied square to the rod, `offCm` from its centre */
function flickResult(J, offCm) {
  return { v: J / ROD.m, w: -J * (offCm / 100) / ROD.I };   /* m/s, rad/s */
}

D.register('freeaxis', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var L = ROD.L, MASS = ROD.m, I = ROD.I;
  var SLOW = 0.03;                                /* seconds of flight per second watched */
  var S = { off: 0, imp: 0.09, run: 0, trail: [] };
  var B = null;

  var ax = new Axes(u.cv, { w: port ? 460 : 980, h: port ? 540 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* wrapLabel draws UPWARDS from a baseline, which is right for a footer
     and wrong for a column.  This one runs down the page and returns the y
     the next block should start at, so the right-hand column cannot walk
     off the bottom of the canvas in portrait. */
  function colText(txt, x, y, w, o) {
    o = o || {};
    var size = o.size || 11.5, lh = o.lh || size * 1.45;
    c.save();
    c.font = (o.weight || 600) + ' ' + size + 'px ui-sans-serif,system-ui,sans-serif';
    var words = String(txt).split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (c.measureText(t).width > w && cur) { lines.push(cur); cur = words[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    c.restore();
    lines.forEach(function (ln, k) {
      label(c, ln, x, y + k * lh,
            { size: size, color: o.color, weight: o.weight || 600, align: 'left' });
    });
    return y + lines.length * lh;
  }

  function reset() {
    B = { x: 20, y: 50, th: Math.PI / 2, vx: 0, vy: 0, w: 0 };
    S.run = 0; S.trail = [[B.x, B.y]];
  }
  /* one flick, square to the rod, `off` centimetres from the centre */
  function flick() {
    var r = flickResult(S.imp, S.off);
    var nx = Math.sin(B.th), ny = -Math.cos(B.th);   /* unit normal to the rod */
    B.vx = r.v * nx;                              /* m/s */
    B.vy = r.v * ny;
    B.w = r.w;                                    /* rad/s, from r × F */
    S.run = 1;
  }
  function stepB(dt) {
    var ds = Math.min(0.04, dt) * SLOW;
    B.x += B.vx * 100 * ds; B.y += B.vy * 100 * ds; B.th += B.w * ds;
    S.trail.push([B.x, B.y]);
    if (S.trail.length > 400) S.trail.shift();
    if (B.x > 118 || B.x < -10 || B.y > 100 || B.y < -12) S.run = 0;
  }

  function draw() {
    var K = C();
    ax.clear();
    var spin1 = Math.abs(S.off) > 0.4;
    var fw = port ? ax.W : ax.W * 0.54;

    /* ------------------------- the figure --------------------------- */
    var box = { x: 8, y: 22, w: fw - 16, h: (port ? ax.H * 0.38 : ax.H - 80) };
    var sc = new Scene(c, box).fit(-14, -16, 122, 104, 6);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    /* the path the centre of gravity has taken: straight, always */
    if (S.trail.length > 1) {
      c.save(); c.strokeStyle = K.GRN; c.lineWidth = 1.8; c.setLineDash([5, 4]);
      c.beginPath();
      S.trail.forEach(function (p, i) {
        i ? c.lineTo(sc.X(p[0]), sc.Y(p[1])) : c.moveTo(sc.X(p[0]), sc.Y(p[1]));
      });
      c.stroke(); c.restore();
    }

    var hx = Math.cos(B.th) * L / 2, hy = Math.sin(B.th) * L / 2;
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(sc.X(B.x - hx), sc.Y(B.y - hy));
    c.lineTo(sc.X(B.x + hx), sc.Y(B.y + hy));
    c.stroke(); c.restore();

    c.save(); c.fillStyle = K.GRN; c.strokeStyle = K.PLATE; c.lineWidth = 2;
    c.beginPath(); c.arc(sc.X(B.x), sc.Y(B.y), 7, 0, 7); c.fill(); c.stroke();
    c.restore();

    /* where the flick lands */
    var ox = B.x + Math.cos(B.th) * S.off, oy = B.y + Math.sin(B.th) * S.off;
    var nx = Math.sin(B.th), ny = -Math.cos(B.th);
    if (!S.run) {
      arrow(c, sc.X(ox - nx * 24), sc.Y(oy - ny * 24), sc.X(ox), sc.Y(oy),
            { color: K.ACC, width: 3.4, head: 12 });
      c.save(); c.fillStyle = K.ACC;
      c.beginPath(); c.arc(sc.X(ox), sc.Y(oy), 4.5, 0, 7); c.fill(); c.restore();
      if (spin1) {
        c.save(); c.strokeStyle = K.VIO; c.lineWidth = 2; c.setLineDash([4, 3]);
        c.beginPath(); c.moveTo(sc.X(B.x), sc.Y(B.y)); c.lineTo(sc.X(ox), sc.Y(oy));
        c.stroke(); c.restore();
        label(c, 'd⊥ = ' + fmt(Math.abs(S.off), 1) + ' cm',
              sc.X(B.x) + 16, (sc.Y(B.y) + sc.Y(oy)) / 2,
              { size: 11.5, align: 'left', color: K.VIO, weight: 650, plate: true });
      }
    } else if (spin1) {
      spin(c, sc.X(B.x), sc.Y(B.y), 20, B.w > 0, { color: K.VIO, width: 1.8 });
    }
    c.restore();
    label(c, S.run ? 'the green line is the path of the centre of gravity'
                   : 'set where and how hard, then press Flick it',
          box.x + box.w / 2, box.y + box.h + 13, { size: 11.5, color: K.MUT });

    /* ------------- the two consequences, beside the figure ----------- */
    var px = port ? 16 : fw + 8;
    var pw = (port ? ax.W - 32 : ax.W - fw - 24);
    var yy = port ? box.y + box.h + 42 : 52;

    label(c, 'what the flick does', px, yy,
          { size: 13, align: 'left', weight: 700, color: K.INK });
    yy += 30;

    label(c, 'F = m a', px, yy, { size: 15.5, align: 'left', weight: 700, color: K.GRN });
    yy += 24;
    yy = colText(spin1
              ? 'the centre of gravity accelerates to ' + fmt(S.imp / MASS, 1) +
                ' m/s — exactly as it would have done had you flicked it through the middle'
              : 'the centre of gravity accelerates to ' + fmt(S.imp / MASS, 1) +
                ' m/s, and nothing else happens at all',
              px, yy, pw, { color: K.MUT }) + 14;

    label(c, 'M = F d⊥', px, yy,
          { size: 15.5, align: 'left', weight: 700, color: spin1 ? K.ACC : K.MUT });
    yy += 24;
    yy = colText(spin1
              ? fmt(S.imp, 2) + ' N·s × ' + fmt(Math.abs(S.off) / 100, 3) +
                ' m of angular impulse, against I = mL²/12 = ' +
                fmt(I * 1e6, 1) + '×10⁻⁶' +
                ' kg·m² — so it spins at ' + fmt(Math.abs(S.imp *
                (S.off / 100) / I), 0) + ' rad/s as well, about the centre of gravity and ' +
                'not about the point you pushed'
              : 'the force passes through the centre of gravity, so d⊥ = 0, there is no ' +
                'moment, and it will not turn however hard you push',
              px, yy, pw, { color: spin1 ? K.ACC : K.MUT }) + 16;

    colText('The green line is straight, and at the same speed, wherever you flick it. ' +
            'An off-centre push ADDS a spin; it does not take anything away from the ' +
            'translation.',
            px, yy, pw, { color: K.INK, weight: 650 });

    label(c, 'A uniform rod, L = ' + fmt(L, 0) + ' cm, m = ' + fmt(MASS * 1000, 0) +
             ' g · one impulse applied square to it, then free flight at ' +
             fmt(SLOW * 100, 0) + '% speed',
          ax.W / 2, ax.H - 9, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var so = slider(u.ctl, 'Where you flick it', -10, 10, 0.5, S.off,
                  function (v) {
                    return Math.abs(v) < 0.4 ? 'centre'
                         : fmt(Math.abs(v), 1) + ' cm';
                  },
                  function (v) { S.off = v; if (!S.run) draw(); });
  var si = slider(u.ctl, 'How hard', 0.03, 0.18, 0.01, S.imp,
                  function (v) { return fmt(v, 2) + ' N·s'; },
                  function (v) { S.imp = v; if (!S.run) draw(); });
  so.quiet(S.off); si.quiet(S.imp);
  var pb = playBtn(u.ctl, '▶ Flick it');
  pb.addEventListener('click', function () {
    if (S.run) { reset(); pb.textContent = '▶ Flick it'; draw(); return; }
    reset(); flick(); pb.textContent = '↺ Again';
  });
  var rd = readout(u.ctl);
  rd.innerHTML = 'Flick it <b>through the centre</b> and it slides without turning. Move the ' +
    'flick off-centre, leaving everything else alone, and it slides <em>exactly as before</em> ' +
    'and spins as well — and the spin is about the centre of gravity, not about the point ' +
    'you pushed. The green path is the proof: it never bends, and it never slows down.';

  var raf = null, last = 0;
  function loop(t) {
    var dt = last ? (t - last) / 1000 : 0.016;
    last = t;
    if (S.run) stepB(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; last = 0; }
  node._stop = stop;
  node._draw = function () { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };
  reset();
  node._draw();
});






/* Exported for parts/selftest.js, which checks the arithmetic the figures
   do rather than the pixels they draw. */
window.CG17 = { WT: WT, segRow: segRow, bodyParts: bodyParts, bodyCoM: bodyCoM,
                clonePose: clonePose, rotAbout: rotAbout, lerp3: lerp3,
                perp: perp, moment: moment, nsub: nsub, LIMB: LIMB,
                invX: invX, invY: invY,
                BAL: BAL, balOmega: balOmega, balTarget: balTarget, balAcc: balAcc,
                ROD: ROD, flickResult: flickResult };

D.boot();
})();
