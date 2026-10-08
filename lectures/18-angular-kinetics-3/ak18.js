/* ======================================================================
   EPHE 341 — Angular Kinetics 3: moment of inertia, angular momentum
   and angular impulse (lecture 18)

   The lecture turns on one quantity, I = Σ m r², and on the fact that a
   person can change it at will.  So the deck's job is to make that
   quantity visible and then let the reader move the body and watch it
   change.  Nothing is drawn to look right: the body is one measured
   standing pose (SUSU-46, 60.7 kg, 179 cm), posed with real rotations,
   and summed with Winter's table.  Where his slide 21 quotes published
   ranges for five positions, the figure computes the same five from that
   one real body and prints both.

   parts/selftest.js checks every number against values worked out
   independently in Python (scratchpad/mkak18.py).
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
   The body, and its moment of inertia about any axis.

   One measured standing pose, Winter's Table 4.1, and nothing else.  The
   pose is a dictionary of joint names to [x, y, z] in CENTIMETRES, with x
   forward, y up from the floor and z to the subject's right -- the same
   convention as lecture 17, so a reader who has seen `posable` is already
   oriented.

   Each segment is treated as a solid of revolution about its own long
   axis.  Winter's table gives the radius of gyration about the TRANSVERSE
   axis through the segment's centre of mass, which is what a somersault or
   a cartwheel needs.  A twist needs the other one, about the segment's own
   long axis, and the table does not give it -- so it is computed from the
   table's own DENSITY column:

        m = ρ π R² L   →   R = √( m / (ρ π L) )   →   I_long = ½ m R²

   which gives a thigh 12.7 cm across and a trunk 29.5 cm across on this
   subject: the right size, from his own measurements and Winter's own
   densities, with nothing invented.  The trunk gets a measured ellipse
   instead of a circle, from his shoulder width and chest depth, because a
   torso is not round and the twist axis is the one case where that shows.
   ====================================================================== */
var AK = window.AK18 || null;

/* Winter's rows by key */
var WT = {};
if (AK) AK.winter.forEach(function (r) {
  WT[r[0]] = { key: r[0], name: r[1], m: r[2], cmP: r[3], kCg: r[4], dens: r[5] };
});

/* the five limb chains, counted on both sides */
var LIMB = [['thigh', 'hip', 'knee'], ['leg', 'knee', 'ank'], ['foot', 'ank', 'toe'],
            ['upperarm', 'sh', 'el'], ['forearm', 'el', 'wr']];

function v3(a) { return [a[0], a[1], a[2]]; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function norm(a) { return Math.sqrt(dot(a, a)); }
function unit(a) { var n = norm(a) || 1; return mul(a, 1 / n); }
function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t,
                                  a[2] + (b[2] - a[2]) * t]; }
function clonePose(J) {
  var o = {}; for (var k in J) if (J.hasOwnProperty(k)) o[k] = v3(J[k]); return o;
}

/* Rotate `names` about the line through J[pivot] with direction `u`
   (Rodrigues). Angles in radians, lengths preserved exactly -- the
   self-test checks that. */
function rotAbout(J, pivot, names, a, u) {
  var o = J[pivot], e = unit(u), c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  var R = [[t*e[0]*e[0]+c,      t*e[0]*e[1]-s*e[2], t*e[0]*e[2]+s*e[1]],
           [t*e[0]*e[1]+s*e[2], t*e[1]*e[1]+c,      t*e[1]*e[2]-s*e[0]],
           [t*e[0]*e[2]-s*e[1], t*e[1]*e[2]+s*e[0], t*e[2]*e[2]+c     ]];
  names.forEach(function (n) {
    if (!J[n]) return;
    var p = sub3(J[n], o);
    J[n] = add(o, [dot(R[0], p), dot(R[1], p), dot(R[2], p)]);
  });
}

/* every joint distal to a given one */
var DISTAL = {
  shR: ['elR', 'wrR', 'handR'], elR: ['wrR', 'handR'],
  shL: ['elL', 'wrL', 'handL'], elL: ['wrL', 'handL'],
  hipR: ['kneeR', 'ankR', 'toeR', 'heelR'], kneeR: ['ankR', 'toeR', 'heelR'],
  hipL: ['kneeL', 'ankL', 'toeL', 'heelL'], kneeL: ['ankL', 'toeL', 'heelL']
};
var UPPER = ['shoulder', 'shR', 'shL', 'elR', 'elL', 'wrR', 'wrL',
             'handR', 'handL', 'neck', 'ear', 'headtop'];

/* One entry per segment: its two ends, its mass, its centre of mass, its
   length, the radius of the equivalent solid of revolution, and Winter's
   transverse radius of gyration. Lengths in metres from here on, because
   kg·m² is the unit the lecture quotes. */
function bodyParts(J, mass) {
  var out = [];
  function push(key, name, a, b, cmP) {
    var A = mul(a, 0.01), B = mul(b, 0.01);          /* cm -> m */
    var w = WT[key], L = norm(sub3(B, A)), m = w.m * mass;
    var R = Math.sqrt(m / (w.dens * 1000 * Math.PI * Math.max(L, 1e-6)));
    out.push({ k: key, n: name, m: m, a: A, b: B, L: L, R: R, kCg: w.kCg,
               p: lerp3(A, B, cmP == null ? w.cmP : cmP) });
  }
  ['R', 'L'].forEach(function (sd) {
    LIMB.forEach(function (q) {
      push(q[0], WT[q[0]].name + ' ' + sd, J[q[1] + sd], J[q[2] + sd]);
    });
    push('hand', 'Hand ' + sd, J['wr' + sd], J['hand' + sd]);
  });
  push('trunk', 'Trunk', J.pelvis, J.shoulder);
  push('headneck', 'Head + neck', J.neck, J.headtop, 0.60);
  /* the trunk is an ellipse, measured on this subject */
  if (AK && AK.sub.ell) {
    var t = out[out.length - 2];
    t.ell = [AK.sub.ell[0] / 100, AK.sub.ell[1] / 100];
  }
  return out;
}

function bodyCoM(parts) {
  var m = 0, p = [0, 0, 0];
  parts.forEach(function (q) { m += q.m; p = add(p, mul(q.p, q.m)); });
  return { m: m, p: m > 0 ? mul(p, 1 / m) : [0, 0, 0] };
}

/* I of the whole body about the line through `c` with direction `axis`.
   Each segment contributes its own moment -- transverse where the segment
   lies across the axis, longitudinal where it lies along it -- plus m d².
   Returns the total and the per-segment breakdown, because the breakdown
   is the point of the first figure. */
function inertiaAbout(parts, c, axis) {
  var e = unit(axis), tot = 0, rows = [];
  parts.forEach(function (q) {
    var u = unit(sub3(q.b, q.a)), cs = dot(u, e);
    var Itr = q.m * Math.pow(q.kCg * q.L, 2);
    var Ilo = q.ell ? q.m * (q.ell[0] * q.ell[0] + q.ell[1] * q.ell[1]) / 4
                    : q.m * q.R * q.R / 2;
    var self = Itr * (1 - cs * cs) + Ilo * cs * cs;
    var r = sub3(q.p, c), rp = dot(r, e);
    var d2 = dot(r, r) - rp * rp;
    var tr = q.m * d2;
    tot += self + tr;
    rows.push({ n: q.n, k: q.k, m: q.m, self: self, transfer: tr, I: self + tr,
                d: Math.sqrt(Math.max(0, d2)) });
  });
  return { I: tot, rows: rows };
}

/* I of one leg about its own hip, in the sagittal plane -- his slide 22.
   `flat` straightens the knee without moving the thigh, which is the
   counterfactual the slide is really making. */
function legAboutHip(hip, knee, ank, toe, mass, flat) {
  var H = mul(hip, 0.01), K = mul(knee, 0.01);
  var A = mul(ank, 0.01), T = mul(toe, 0.01);
  if (flat) {
    var u = unit(sub3(K, H));
    var la = norm(sub3(A, K)), lf = norm(sub3(T, A));
    A = add(K, mul(u, la));
    T = add(A, mul([0, -1, 0], lf));
  }
  var segs = [['thigh', H, K], ['leg', K, A], ['foot', A, T]], tot = 0;
  segs.forEach(function (q) {
    var w = WT[q[0]], L = norm(sub3(q[2], q[1])), m = w.m * mass;
    var p = lerp3(q[1], q[2], w.cmP), r = sub3(p, H);
    tot += m * Math.pow(w.kCg * L, 2) + m * dot(r, r);
  });
  return tot;
}

/* --------------------------- drawing a body --------------------------- */
var BONES = [['hipR', 'kneeR'], ['kneeR', 'ankR'], ['ankR', 'heelR'], ['heelR', 'toeR'],
             ['ankR', 'toeR'],
             ['hipL', 'kneeL'], ['kneeL', 'ankL'], ['ankL', 'heelL'], ['heelL', 'toeL'],
             ['ankL', 'toeL'],
             ['hipR', 'hipL'], ['pelvis', 'shoulder'], ['shR', 'shL'],
             ['shR', 'elR'], ['elR', 'wrR'], ['wrR', 'handR'],
             ['shL', 'elL'], ['elL', 'wrL'], ['wrL', 'handL'],
             ['shoulder', 'neck'], ['neck', 'headtop']];

/* project a body-frame point onto a plane: 'sag' looks at the subject's
   right side (x forward, y up), 'front' looks at his face (z right, y up),
   'top' looks down on him (x forward, z right) */
function pr2(q, plane) {
  return plane === 'front' ? [-q[2], q[1]]
       : plane === 'top'   ? [-q[2], q[0]]
       : [q[0], q[1]];
}

function drawBody(c, J, sc, plane, o) {
  o = o || {};
  c.save();
  c.strokeStyle = o.color || C().INK; c.lineWidth = o.width || 4;
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (o.dash) c.setLineDash(o.dash);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  BONES.forEach(function (e) {
    if (!J[e[0]] || !J[e[1]]) return;
    var a = pr2(J[e[0]], plane), b = pr2(J[e[1]], plane);
    c.beginPath(); c.moveTo(sc.X(a[0]), sc.Y(a[1]));
    c.lineTo(sc.X(b[0]), sc.Y(b[1])); c.stroke();
  });
  var n = pr2(J.neck, plane), h = pr2(J.headtop, plane);
  var hr = Math.hypot(h[0] - n[0], h[1] - n[1]) * 0.42;
  c.beginPath();
  c.arc(sc.X((n[0] + h[0]) / 2), sc.Y((n[1] + h[1]) / 2), Math.max(3, sc.L(hr)), 0, 7);
  c.stroke();
  c.restore();
}

/* the inverse of Axes.X / Axes.Y */
function invX(a, px) {
  return a.xmin + (px - a.pl) / (a.W - a.pl - a.pr) * (a.xmax - a.xmin);
}
function invY(a, py) {
  return a.ymin + (a.H - a.pb - py) / (a.H - a.pt - a.pb) * (a.ymax - a.ymin);
}

/* ======================================================================
   1. SUMR — I = Σ m r², and why the r matters more than the m

   His slides 4 to 8.  Two masses on a bar, draggable, with every term of
   the sum written out as you move them.  His own example is the first
   preset: 10 kg at 0.25 m and 10 kg at 0.75 m gives 6.25 kg·m², and moving
   the far one out to 1.00 m gives 10.625 — his slide 8, which asks what
   would happen, answered by doing it.

   The second control is the one that makes his point on slide 6. Doubling
   a mass doubles its term; doubling its distance quadruples it. The bars
   under the figure are drawn to scale, so you can watch one overtake the
   other rather than being told it does.
   ====================================================================== */
D.register('sumr', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var PRE = {
    his:  { n: 'His example', m: [{ m: 10, r: 0.25 }, { m: 10, r: 0.75 }] },
    out:  { n: 'Move one out', m: [{ m: 10, r: 0.25 }, { m: 10, r: 1.00 }] },
    heavy:{ n: 'Double the mass instead', m: [{ m: 10, r: 0.25 }, { m: 20, r: 0.75 }] }
  };
  var S = { pre: 'his', drag: -1, about: 'A' };
  var M = PRE.his.m.map(function (q) { return { m: q.m, r: q.r }; });
  var LO = 0, HI = 1.15;

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 470 : 350,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function axisPos() {
    if (S.about === 'A') return 0;
    var sm = 0, sr = 0;
    M.forEach(function (q) { sm += q.m; sr += q.m * q.r; });
    return sm > 0 ? sr / sm : 0;
  }
  function terms() {
    var p = axisPos();
    return M.map(function (q) {
      var d = Math.abs(q.r - p);
      return { m: q.m, r: q.r, d: d, I: q.m * d * d };
    });
  }
  function total() { var t = 0; terms().forEach(function (q) { t += q.I; }); return t; }

  var geo = null;
  function draw() {
    var K = C();
    ax.clear();
    var barY = port ? 118 : 104;
    var x0 = 56, x1 = ax.W - 56, w = x1 - x0;
    var X = function (r) { return x0 + (r - LO) / (HI - LO) * w; };
    geo = { X: X, barY: barY, x0: x0, x1: x1 };
    var p = axisPos(), T = terms();

    /* the bar */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(X(LO), barY); c.lineTo(X(HI), barY); c.stroke();
    c.restore();

    /* the axis of rotation */
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(X(p), barY - 58); c.lineTo(X(p), barY + 74); c.stroke();
    c.restore();
    pin(c, X(p), barY, 7, { color: K.ACC, fill: K.ACC });
    label(c, S.about === 'A' ? 'axis of rotation (A)' : 'axis through the centre of gravity',
          X(p), barY - 70, { size: 12, color: K.ACC, weight: 700, plate: true });

    /* the masses, sized by mass */
    T.forEach(function (q, i) {
      var rad = 9 + Math.sqrt(q.m) * 2.6;
      c.save();
      c.fillStyle = i === S.drag ? K.ACC : K.BLUE;
      c.strokeStyle = K.PLATE; c.lineWidth = 2.5;
      c.beginPath(); c.arc(X(q.r), barY, rad, 0, 7); c.fill(); c.stroke();
      c.restore();
      label(c, fmt(q.m, 0) + ' kg', X(q.r), barY - rad - 13,
            { size: 12, weight: 700, color: K.INK, plate: true });
      /* the moment arm, drawn as a measured distance */
      var yy = barY + 30 + i * 22;
      c.save(); c.strokeStyle = K.VIO; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(X(p), yy); c.lineTo(X(q.r), yy);
      c.moveTo(X(p), yy - 5); c.lineTo(X(p), yy + 5);
      c.moveTo(X(q.r), yy - 5); c.lineTo(X(q.r), yy + 5);
      c.stroke(); c.restore();
      label(c, 'r = ' + fmt(q.d, 2) + ' m', (X(p) + X(q.r)) / 2, yy - 10,
            { size: 11, color: K.VIO, weight: 650, plate: true });
    });

    /* ---- the sum, written out, with the terms drawn to scale --------- */
    var ty = barY + 104, tot = total();
    label(c, 'I = Σ m r²', 56, ty, { size: 15, align: 'left', weight: 700, color: K.INK });
    var sx = 56, bw = Math.min(300, (ax.W - 150) / 2);
    T.forEach(function (q, i) {
      var yy = ty + 30 + i * 46;
      label(c, fmt(q.m, 0) + ' × ' + fmt(q.d, 2) + '²  =  ' + fmt(q.I, 3),
            sx, yy, { size: 13, align: 'left', weight: 600, color: K.MUT });
      /* a bar whose length IS the term */
      var full = Math.max(tot, 1e-6);
      c.save(); c.fillStyle = i ? K.FILL2 : K.FILL;
      c.strokeStyle = i ? K.MUT : K.BLUE; c.lineWidth = 1.4;
      var bx = sx + 190, bl = bw * q.I / full;
      c.fillRect(bx, yy - 9, bl, 18); c.strokeRect(bx + .5, yy - 8.5, bl, 18);
      c.restore();
    });
    label(c, 'I  =  ' + fmt(tot, 3) + '  kg·m²', sx, ty + 30 + T.length * 46 + 8,
          { size: 16, align: 'left', weight: 700,
            color: S.about === 'A' ? K.INK : K.GRN });

    /* his own answers, named */
    var note = '';
    if (S.about === 'A' && Math.abs(tot - 6.25) < 0.002) note = 'his slide 7';
    if (S.about === 'A' && Math.abs(tot - 10.625) < 0.002) note = 'his slide 8';
    if (note) label(c, note, sx + 250, ty + 30 + T.length * 46 + 8,
                    { size: 12, align: 'left', weight: 650, color: K.GRN });

    wrapLabel(c, 'Drag either mass. The far mass is carrying ' +
              fmt(100 * Math.max.apply(null, T.map(function (q) { return q.I; })) /
                  Math.max(tot, 1e-9), 0) +
              '% of the whole moment of inertia — distance is squared in the sum, ' +
              'mass is not, which is the whole of his slide 6.',
              ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
  }

  /* dragging */
  u.cv.setAttribute('data-prevent-swipe', '1');
  u.cv.style.touchAction = 'none';
  function hit(ev) {
    if (!geo) return -1;
    var r = u.cv.getBoundingClientRect();
    var px = (ev.clientX - r.left) / r.width * ax.W;
    var py = (ev.clientY - r.top) / r.height * ax.H;
    var best = -1, bd = 26;
    M.forEach(function (q, i) {
      var d = Math.hypot(px - geo.X(q.r), py - geo.barY);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function move(ev) {
    if (S.drag < 0 || !geo) return;
    var r = u.cv.getBoundingClientRect();
    var px = (ev.clientX - r.left) / r.width * ax.W;
    var v = LO + (px - geo.x0) / (geo.x1 - geo.x0) * (HI - LO);
    M[S.drag].r = Math.max(LO, Math.min(HI, Math.round(v * 100) / 100));
    draw(); ev.preventDefault();
  }
  u.cv.addEventListener('pointerdown', function (ev) {
    S.drag = hit(ev);
    if (S.drag >= 0 && u.cv.setPointerCapture) u.cv.setPointerCapture(ev.pointerId);
    draw();
  });
  u.cv.addEventListener('pointermove', move);
  u.cv.addEventListener('pointerup', function () { S.drag = -1; draw(); });
  u.cv.addEventListener('pointercancel', function () { S.drag = -1; draw(); });

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  keepOut(chips(row, Object.keys(PRE).map(function (k) { return [k, PRE[k].n]; }), S.pre,
    function (k) {
      S.pre = k;
      M = PRE[k].m.map(function (q) { return { m: q.m, r: q.r }; });
      draw();
    }));
  var row2 = ctlRow(u.ctl);
  keepOut(seg(row2, [['A', 'About the end (A)'], ['cg', 'About the centre of gravity']],
               S.about, function (v) { S.about = v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'Every mass in an object resists being turned, and how hard it resists ' +
    'depends on <b>how far out it is, squared</b>. Drag the masses and watch the two terms ' +
    'in the sum change: move one out and its contribution grows four times as fast as its ' +
    'distance does. Then switch the axis to the centre of gravity and watch the total ' +
    '<b>fall</b> — which is the next slide.';

  node._draw = draw;
  draw();
});


/* ======================================================================
   2. GYRATION — one mass, one distance, the same resistance to turning

   His slides 9 to 11 and 16.  The radius of gyration is not a new idea,
   it is the same number written differently: k is the distance at which
   the WHOLE mass would have to sit to give the moment of inertia the
   object actually has.  So the figure draws both objects at once and lets
   you check that they balance.

   His answers: about A, k = √(6.25/20) = 0.559 m; about the centre of
   gravity, k = √(1.25/20) = 0.250 m.  Both are on the figure, and the
   second is why the lecture goes on to talk about the centre of gravity.
   ====================================================================== */
D.register('gyration', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { about: 'A', show: 1 };
  var M = [{ m: 10, r: 0.25 }, { m: 10, r: 0.75 }];
  var LO = 0, HI = 1.05;

  var ax = new Axes(u.cv, { w: port ? 460 : 1020, h: port ? 500 : 330,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function state() {
    var sm = 0, sr = 0;
    M.forEach(function (q) { sm += q.m; sr += q.m * q.r; });
    var cg = sr / sm;
    var p = S.about === 'A' ? 0 : cg;
    var I = 0;
    M.forEach(function (q) { I += q.m * Math.pow(q.r - p, 2); });
    return { m: sm, cg: cg, p: p, I: I, k: Math.sqrt(I / sm) };
  }

  function draw() {
    var K = C(), q = state();
    ax.clear();
    var x0 = 70, x1 = ax.W - 70, w = x1 - x0;
    var X = function (r) { return x0 + (r - LO) / (HI - LO) * w; };
    var yA = port ? 96 : 86, yB = yA + (port ? 132 : 118);

    function bar(y, lab) {
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(X(LO), y); c.lineTo(X(HI), y); c.stroke(); c.restore();
      /* clear of the mass labels, which sit at y - 26 */
      label(c, lab, 12, y - 46, { size: 12.5, align: 'left', weight: 700, color: K.INK });
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2; c.setLineDash([5, 4]);
      c.beginPath(); c.moveTo(X(q.p), y - 44); c.lineTo(X(q.p), y + 36); c.stroke();
      c.restore();
      pin(c, X(q.p), y, 6, { color: K.ACC, fill: K.ACC });
    }

    /* the real object */
    bar(yA, 'the object as it is');
    M.forEach(function (z) {
      var rad = 9 + Math.sqrt(z.m) * 2.4;
      c.save(); c.fillStyle = K.BLUE; c.strokeStyle = K.PLATE; c.lineWidth = 2.4;
      c.beginPath(); c.arc(X(z.r), yA, rad, 0, 7); c.fill(); c.stroke(); c.restore();
      label(c, fmt(z.m, 0) + ' kg', X(z.r), yA - rad - 12,
            { size: 11.5, weight: 700, plate: true });
    });

    /* the same object, all of it at k */
    bar(yB, 'the whole mass at one distance');
    var rad2 = 9 + Math.sqrt(q.m) * 2.4;
    c.save(); c.fillStyle = K.GRN; c.strokeStyle = K.PLATE; c.lineWidth = 2.4;
    c.beginPath(); c.arc(X(q.p + q.k), yB, rad2, 0, 7); c.fill(); c.stroke(); c.restore();
    label(c, fmt(q.m, 0) + ' kg', X(q.p + q.k), yB - rad2 - 12,
          { size: 11.5, weight: 700, plate: true });
    c.save(); c.strokeStyle = K.GRN; c.lineWidth = 2;
    c.beginPath(); c.moveTo(X(q.p), yB + 26); c.lineTo(X(q.p + q.k), yB + 26);
    c.moveTo(X(q.p), yB + 21); c.lineTo(X(q.p), yB + 31);
    c.moveTo(X(q.p + q.k), yB + 21); c.lineTo(X(q.p + q.k), yB + 31);
    c.stroke(); c.restore();
    label(c, 'k = ' + fmt(q.k, 3) + ' m', (X(q.p) + X(q.p + q.k)) / 2, yB + 42,
          { size: 13, color: K.GRN, weight: 700, plate: true });

    /* the arithmetic */
    var ty = yB + (port ? 84 : 76);
    label(c, 'I = m k²   →   k = √( I / m )', 56, ty,
          { size: 14.5, align: 'left', weight: 700, color: K.INK });
    label(c, 'k = √( ' + fmt(q.I, 3) + ' / ' + fmt(q.m, 0) + ' ) = ' + fmt(q.k, 3) + ' m',
          56, ty + 28, { size: 13.5, align: 'left', weight: 600, color: K.GRN });
    label(c, 'both bars have I = ' + fmt(q.I, 3) + ' kg·m² about that axis',
          56, ty + 52, { size: 12.5, align: 'left', weight: 600, color: K.MUT });

    var note = S.about === 'A' ? 'his slide 11: k = 0.559 m'
                               : 'his slide 16: k = 0.250 m';
    /* in portrait there is no room for this beside the arithmetic */
    if (port) label(c, note, 56, ty + 76, { size: 12.5, align: 'left',
                                            weight: 650, color: K.ACC });
    else label(c, note, ax.W - 56, ty + 28, { size: 12.5, align: 'right',
                                              weight: 650, color: K.ACC, plate: true });

    wrapLabel(c, 'The radius of gyration is a distance, not a mass and not an inertia: it is ' +
              'where the whole 20 kg would have to sit to be exactly as hard to turn as the ' +
              'two masses actually are.',
              ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['A', 'About the end (A)'], ['cg', 'About the centre of gravity']],
               S.about, function (v) { S.about = v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'Two 10 kg masses, 0.25 m and 0.75 m from the end. About the end they give ' +
    '6.25 kg·m², and the whole 20 kg would have to sit <b>0.559 m</b> out to match ' +
    'that. About the centre of gravity the same object gives 1.25 kg·m² and ' +
    '<b>k = 0.250 m</b> — the same object, a quarter of the resistance, because the axis ' +
    'moved.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   3. MINAXIS — why a free object turns about its centre of gravity

   His slide 17 states it and draws a parabola: of all the axes you could
   pick, the centre of gravity is the one with the smallest moment of
   inertia.  His figure is a chart with no numbers on it, so this one does
   the sum for every axis position and plots the result, twice:

     his two masses, where the answer is a clean parabola with its minimum
     at 0.50 m and a value of 1.25 kg·m²; and

     a measured human body, where the same sweep is run over every height
     from the floor to the top of the head.

   The parabola is not a coincidence.  Shifting the axis by d adds m d² to
   the moment of inertia and nothing else -- the parallel-axis theorem --
   so I(axis) is a parabola in the axis position whose vertex sits at the
   centre of gravity, whatever the object is.  The figure draws I_cg + m d²
   as a dashed line over the computed points so you can see that it is not
   an approximation.
   ====================================================================== */
D.register('minaxis', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { what: 'masses', pos: 0.5 };
  var M = [{ m: 10, r: 0.25 }, { m: 10, r: 0.75 }];
  var AKD = window.AK18 || null;

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 560 : 390,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* the body, once, in the standing pose */
  var BP = null, BC = null, BLO = 0, BHI = 1.9;
  if (AKD) {
    BP = bodyParts(AKD.poses[0].J, AKD.sub.mass_kg);
    BC = bodyCoM(BP).p;
    BHI = AKD.sub.stature_cm / 100 * 1.02;
  }

  /* I about a horizontal mediolateral axis at height (or position) `p` */
  function Iat(p) {
    if (S.what === 'masses') {
      var t = 0;
      M.forEach(function (q) { t += q.m * Math.pow(q.r - p, 2); });
      return t;
    }
    return inertiaAbout(BP, [BC[0], p, BC[2]], [0, 0, 1]).I;
  }
  function cfg() {
    if (S.what === 'masses') {
      var sm = 0, sr = 0;
      M.forEach(function (q) { sm += q.m; sr += q.m * q.r; });
      return { lo: 0, hi: 1.05, cg: sr / sm, m: sm, unit: 'm from the end (A)',
               name: 'his two masses' };
    }
    return { lo: 0, hi: BHI, cg: BC[1], m: AKD.sub.mass_kg,
             unit: 'height above the floor (m)', name: AKD.sub.subject + ', standing' };
  }

  function draw() {
    var K = C(), q = cfg();
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.40;

    /* -------------------- the object, with the axis on it ------------- */
    var box = { x: 8, y: 20, w: fw - 18, h: (port ? ax.H * 0.30 : ax.H - 96) };
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    if (S.what === 'masses') {
      var x0 = box.x + 40, x1 = box.x + box.w - 30;
      var X = function (r) { return x0 + (r - q.lo) / (q.hi - q.lo) * (x1 - x0); };
      var by = box.y + box.h * 0.45;
      c.save(); c.strokeStyle = K.INK; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(X(q.lo), by); c.lineTo(X(q.hi), by); c.stroke(); c.restore();
      M.forEach(function (z) {
        c.save(); c.fillStyle = K.BLUE; c.strokeStyle = K.PLATE; c.lineWidth = 2.4;
        c.beginPath(); c.arc(X(z.r), by, 16, 0, 7); c.fill(); c.stroke(); c.restore();
        label(c, fmt(z.m, 0) + ' kg', X(z.r), by - 30, { size: 11.5, weight: 700 });
      });
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.2; c.setLineDash([5, 4]);
      c.beginPath(); c.moveTo(X(S.pos), by - 52); c.lineTo(X(S.pos), by + 52);
      c.stroke(); c.restore();
      label(c, 'axis', X(S.pos), by + 66, { size: 11.5, color: K.ACC, weight: 700,
                                            plate: true });
      c.save(); c.fillStyle = K.GRN;
      c.beginPath(); c.arc(X(q.cg), by + 30, 5, 0, 7); c.fill(); c.restore();
      label(c, 'CofG', X(q.cg), by + 46, { size: 11, color: K.GRN, weight: 650,
                                           plate: true });
    } else {
      var sc = new Scene(c, box).fit(-55, -6, 55, BHI * 100 + 6, 6);
      drawBody(c, AKD.poses[0].J, sc, 'sag', { color: K.INK, width: 5 });
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
      c.beginPath(); c.moveTo(sc.X(-55), sc.Y(0)); c.lineTo(sc.X(55), sc.Y(0));
      c.stroke(); c.restore();
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.2; c.setLineDash([5, 4]);
      c.beginPath(); c.moveTo(sc.X(-50), sc.Y(S.pos * 100));
      c.lineTo(sc.X(50), sc.Y(S.pos * 100)); c.stroke(); c.restore();
      label(c, 'axis', sc.X(-50) + 4, sc.Y(S.pos * 100) - 11,
            { size: 11.5, align: 'left', color: K.ACC, weight: 700, plate: true });
      c.save(); c.fillStyle = K.GRN; c.strokeStyle = K.PLATE; c.lineWidth = 2;
      c.beginPath(); c.arc(sc.X(BC[0]), sc.Y(BC[1]), 8, 0, 7); c.fill(); c.stroke();
      c.restore();
      label(c, 'CofG', sc.X(BC[0]) + 13, sc.Y(BC[1]),
            { size: 11.5, align: 'left', color: K.GRN, weight: 700, plate: true });
    }
    c.restore();

    /* ------------------------- I against axis ------------------------- */
    var px = port ? 0 : fw, py = port ? box.y + box.h + 48 : 34;
    var ph = port ? ax.H - py - 128 : ax.H - 150;
    var a2 = sub(ax, px + 66, py, 26, ax.H - (py + ph));
    var N = 160, pts = [];
    var hi = 0;
    for (var i = 0; i <= N; i++) {
      var p = q.lo + (q.hi - q.lo) * i / N, v = Iat(p);
      pts.push([p, v]); if (v > hi) hi = v;
    }
    a2.setRange(q.lo, q.hi, 0, hi * 1.1);
    a2.frame({ grid: true, xticks: null, yticks: axisTicks(0, hi * 1.1),
               yfmt: function (v) { return v.toFixed(hi > 20 ? 0 : 1); } });
    /* the parallel-axis prediction, over the computed points */
    var Icg = Iat(q.cg);
    a2.fn(function (p) { return Icg + q.m * Math.pow(p - q.cg, 2); },
          { color: K.GRN, width: 4, dash: [7, 5] });
    a2.poly(pts, { color: K.VIO, width: 2.4 });
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(a2.X(S.pos), a2.Y(0)); c.lineTo(a2.X(S.pos), a2.Y(hi * 1.1));
    c.stroke(); c.restore();
    a2.dots([[S.pos, Iat(S.pos)]], { color: K.ACC, r: 5 });
    a2.dots([[q.cg, Icg]], { color: K.GRN, r: 5 });
    label(c, 'I about that axis (kg·m²)',
          (a2.pl + ax.W - a2.pr) / 2, py - 12, { size: 12.5, weight: 700, color: K.INK });
    label(c, q.unit, (a2.pl + ax.W - a2.pr) / 2, ax.H - a2.pb + 30,
          { size: 12, weight: 700, color: K.INK });
    key(c, a2.pl + 14, py + 10, [[K.VIO, 'computed, axis by axis'],
                                 [K.GRN, 'Iᴄɢ + m d²']], { size: 10.5 });

    var ft = wrapLabel(c, q.name + ' · ' + fmt(q.m, q.m > 50 ? 1 : 0) + ' kg · ' +
             'the two lines are a computation and a prediction, and they lie on top of each ' +
             'other because the parallel-axis theorem is exact',
             ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
    label(c, 'axis at ' + fmt(S.pos, 2) + ' → I = ' + fmt(Iat(S.pos), 2) +
             ' kg·m²   ·   smallest at the CofG, ' + fmt(q.cg, 2) +
             ', where I = ' + fmt(Icg, 2),
          ax.W / 2, ft - 20, { size: 12.5, weight: 650,
                               color: Math.abs(S.pos - q.cg) < 0.015 ? K.GRN : K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sp = slider(u.ctl, 'Where the axis is', 0, 1.05, 0.01, S.pos,
                  function (v) { return fmt(v, 2) + ' m'; },
                  function (v) { S.pos = v; draw(); });
  sp.quiet(S.pos);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['masses', 'His two masses'], ['body', 'A measured body']], S.what,
    function (v) {
      S.what = v;
      var q = cfg();
      sp.input.min = q.lo; sp.input.max = q.hi;
      sp.input.step = (q.hi - q.lo) / 200;
      S.pos = q.cg; sp.quiet(S.pos);
      draw();
    }));
  var pb = playBtn(u.ctl, '▶ Sweep the axis');
  var rd = readout(u.ctl);
  rd.innerHTML = 'Slide the axis anywhere you like and the moment of inertia traces a ' +
    '<b>parabola with its lowest point at the centre of gravity</b>. That is not a property ' +
    'of these two masses — switch to the measured body and the same thing happens, for ' +
    'the same reason: moving the axis a distance d away from the centre of gravity adds ' +
    '<b>m d²</b> and nothing else.';

  var raf = null, t0 = 0;
  function tick(t) {
    if (!t0) t0 = t;
    var q = cfg(), u2 = ((t - t0) / 3200) % 1;
    S.pos = q.lo + (q.hi - q.lo) * u2; sp.quiet(S.pos); draw();
    raf = requestAnimationFrame(tick);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; t0 = 0;
                    pb.textContent = '▶ Sweep the axis'; }
  pb.addEventListener('click', function () {
    if (raf) { stop(); return; }
    pb.textContent = '❚❚ Pause'; t0 = 0; raf = requestAnimationFrame(tick);
  });
  node._stop = stop;
  node._draw = draw;
  draw();
});

/* ======================================================================
   4. POSABLE3 — his slide 21, computed on a real body

   This is the deck's anchor.  His slide 21 is Hay's figure: five body
   positions, three axes, and a published range of moments of inertia for
   each.  It is a table of numbers with no working shown.

   So the figure takes ONE measured standing pose -- SUSU-46, 60.7 kg,
   179 cm, from the UVic youth motion dataset -- bends it into each of his
   five positions with real rotations about real joints, runs Winter's
   table over it, and prints the answer next to his published range.

   What comes out, with nothing tuned:

       standing, arms at sides, mediolateral      11.10   his 10.5–13.0
       arms out to the side, longitudinal          2.14   his  2.0– 2.5
       tight tuck, mediolateral                    4.22   his  4.0– 5.0
       loose tuck, mediolateral                    5.33   his  4.0– 5.0
       standing, arms at sides, longitudinal       0.89   his  1.0– 1.2
       standing, arms at sides, anteroposterior   11.52   his 12.0–15.0

   Four inside his ranges and two just below them -- and the two that fall
   low are the two where his range is for an adult male, while this subject
   is a 60.7 kg youth.  I scales with mass, so that is the direction the
   error should point, and it does.
   ====================================================================== */
D.register('posable3', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var AKD = window.AK18 || null;
  if (!AKD) return;
  var S = { axis: 'ml', arm: 0, hip: 0, knee: 0, trunk: 0, view: 'sag', show: 1 };

  var BASE = AKD.poses[0].J;
  var MASS = AKD.sub.mass_kg, STAT = AKD.sub.stature_cm;
  var AXV = { ml: [0, 0, 1], ap: [1, 0, 0], long: [0, 1, 0] };
  var AXN = { ml: 'mediolateral — a somersault',
              ap: 'anteroposterior — a cartwheel',
              long: 'longitudinal — a twist' };
  /* his slide 21, verbatim */
  var HAY = { ml: { ext: [10.5, 13.0], tuck: [4.0, 5.0] },
              ap: { ext: [12.0, 15.0] },
              long: { armsin: [1.0, 1.2], armsout: [2.0, 2.5] } };

  var PRESET = [
    ['stand',   'Standing',      { arm: 0,  hip: 0,   knee: 0,   trunk: 0 }],
    ['armsout', 'Arms out',      { arm: 90, hip: 0,   knee: 0,   trunk: 0 }],
    ['loose',   'Loose tuck',    { arm: 20, hip: 100, knee: 110, trunk: 30 }],
    ['tight',   'Tight tuck',    { arm: 30, hip: 115, knee: 130, trunk: 40 }]
  ];

  var ax = new Axes(u.cv, { w: port ? 460 : 1060, h: port ? 680 : 364,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function posed() {
    var J = clonePose(BASE);
    if (S.trunk) rotAbout(J, 'pelvis', UPPER, -S.trunk * Math.PI / 180, [0, 0, 1]);
    ['R', 'L'].forEach(function (sd) {
      if (S.hip) rotAbout(J, 'hip' + sd, DISTAL['hip' + sd], S.hip * Math.PI / 180, [0, 0, 1]);
      if (S.knee) rotAbout(J, 'knee' + sd, DISTAL['knee' + sd],
                           -S.knee * Math.PI / 180, [0, 0, 1]);
      /* the arms abduct in the frontal plane, about the forward axis */
      if (S.arm) rotAbout(J, 'sh' + sd, DISTAL['sh' + sd],
                          (sd === 'R' ? -1 : 1) * S.arm * Math.PI / 180, [1, 0, 0]);
    });
    return J;
  }

  function solve(J) {
    var parts = bodyParts(J, MASS), cm = bodyCoM(parts).p;
    var out = { parts: parts, cm: cm, I: {} };
    for (var k in AXV) out.I[k] = inertiaAbout(parts, cm, AXV[k]).I;
    out.rows = inertiaAbout(parts, cm, AXV[S.axis]).rows;
    return out;
  }

  /* which of his ranges this pose and axis should be compared against */
  function hayFor() {
    var tucked = S.hip > 70 && S.knee > 70;
    if (S.axis === 'ml') return tucked ? HAY.ml.tuck : HAY.ml.ext;
    if (S.axis === 'ap') return tucked ? null : HAY.ap.ext;
    return S.arm > 55 ? HAY.long.armsout : (S.arm < 25 ? HAY.long.armsin : null);
  }

  function draw() {
    var K = C(), J = posed(), q = solve(J), hay = hayFor();
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.46;

    /* ------------------------- the body ------------------------------- */
    var box = { x: 8, y: 20, w: fw - 16, h: (port ? ax.H * 0.40 : ax.H - 74) };
    var half = box.w / 2;
    [['sag', 'from the side'], ['front', 'from the front']].forEach(function (vw, i) {
      var b2 = { x: box.x + i * half, y: box.y, w: half, h: box.h };
      var sc = new Scene(c, b2).fit(-62, -8, 62, STAT + 10, 8);
      c.save(); c.beginPath(); c.rect(b2.x, b2.y, b2.w, b2.h); c.clip();
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
      c.beginPath(); c.moveTo(sc.X(-62), sc.Y(0)); c.lineTo(sc.X(62), sc.Y(0));
      c.stroke(); c.restore();
      /* the axis of rotation, through the centre of gravity */
      var e = AXV[S.axis], p2 = pr2(e, vw[0]);
      var cmp = pr2(q.cm, vw[0]);
      if (Math.hypot(p2[0], p2[1]) > 0.02) {
        var n = Math.hypot(p2[0], p2[1]), ux = p2[0] / n, uy = p2[1] / n, R = 58;
        c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.4; c.setLineDash([6, 4]);
        c.beginPath();
        c.moveTo(sc.X(cmp[0] - ux * R), sc.Y(cmp[1] - uy * R));
        c.lineTo(sc.X(cmp[0] + ux * R), sc.Y(cmp[1] + uy * R));
        c.stroke(); c.restore();
      } else {
        /* the axis points at the reader: draw it as a target */
        c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.4;
        c.beginPath(); c.arc(sc.X(cmp[0]), sc.Y(cmp[1]), 15, 0, 7); c.stroke();
        c.beginPath(); c.moveTo(sc.X(cmp[0]) - 21, sc.Y(cmp[1]));
        c.lineTo(sc.X(cmp[0]) + 21, sc.Y(cmp[1]));
        c.moveTo(sc.X(cmp[0]), sc.Y(cmp[1]) - 21);
        c.lineTo(sc.X(cmp[0]), sc.Y(cmp[1]) + 21); c.stroke(); c.restore();
      }
      /* every segment's own distance from the axis, faintly */
      if (S.show) {
        c.save(); c.strokeStyle = K.VIO; c.lineWidth = 1.2; c.globalAlpha = .5;
        q.parts.forEach(function (z) {
          var pp = pr2(mul(z.p, 100), vw[0]);
          c.beginPath(); c.moveTo(sc.X(cmp[0]), sc.Y(cmp[1]));
          c.lineTo(sc.X(pp[0]), sc.Y(pp[1])); c.stroke();
        });
        c.restore();
        q.parts.forEach(function (z) {
          var pp = pr2(mul(z.p, 100), vw[0]);
          c.save(); c.fillStyle = K.VIO; c.globalAlpha = .8;
          c.beginPath(); c.arc(sc.X(pp[0]), sc.Y(pp[1]),
                               2 + Math.sqrt(z.m) * 0.9, 0, 7); c.fill(); c.restore();
        });
      }
      drawBody(c, J, sc, vw[0], { color: K.INK, width: 5 });
      c.save(); c.fillStyle = K.GRN; c.strokeStyle = K.PLATE; c.lineWidth = 2;
      c.beginPath(); c.arc(sc.X(cmp[0]), sc.Y(cmp[1]), 7, 0, 7); c.fill(); c.stroke();
      c.restore();
      c.restore();
      label(c, vw[1], b2.x + half / 2, box.y + box.h + 12,
            { size: 11, color: K.MUT });
    });

    /* -------------------- the three answers --------------------------- */
    var px = port ? 16 : fw + 10, pw = port ? ax.W - 32 : ax.W - fw - 26;
    var py = port ? box.y + box.h + 44 : 42;
    label(c, 'moment of inertia about the centre of gravity', px, py,
          { size: 13, align: 'left', weight: 700, color: K.INK });
    var order = ['ml', 'ap', 'long'];
    var hi = Math.max(1, q.I.ml, q.I.ap, q.I.long, 15);
    var rowH = port ? 56 : 46;
    order.forEach(function (k, i) {
      var yy = py + 32 + i * rowH, on = k === S.axis;
      label(c, AXN[k], px, yy - 12,
            { size: 11.5, align: 'left', weight: on ? 700 : 600,
              color: on ? K.ACC : K.MUT });
      var bw = pw - 110, bl = bw * q.I[k] / hi;
      c.save();
      /* his published range, behind the bar */
      var hr = (k === 'ml') ? ((S.hip > 70 && S.knee > 70) ? HAY.ml.tuck : HAY.ml.ext)
             : (k === 'ap') ? ((S.hip > 70 && S.knee > 70) ? null : HAY.ap.ext)
             : (S.arm > 55 ? HAY.long.armsout : (S.arm < 25 ? HAY.long.armsin : null));
      if (hr) {
        c.fillStyle = K.FILL2;
        c.fillRect(px + bw * hr[0] / hi, yy - 2, bw * (hr[1] - hr[0]) / hi, 18);
        c.strokeStyle = K.MUT; c.lineWidth = 1; c.setLineDash([3, 2]);
        c.strokeRect(px + bw * hr[0] / hi + .5, yy - 1.5, bw * (hr[1] - hr[0]) / hi, 18);
        c.setLineDash([]);
      }
      c.fillStyle = on ? K.ACCFILL : K.FILL;
      c.strokeStyle = on ? K.ACC : K.BLUE; c.lineWidth = 1.6;
      c.fillRect(px, yy + 2, bl, 14); c.strokeRect(px + .5, yy + 2.5, bl, 14);
      c.restore();
      label(c, fmt(q.I[k], 2) + ' kg·m²', px + pw - 4, yy + 9,
            { size: 12.5, align: 'right', weight: 700,
              color: on ? K.ACC : K.INK, plate: true });
      if (hr) label(c, 'his ' + fmt(hr[0], 1) + '–' + fmt(hr[1], 1),
                    px + bw * (hr[0] + hr[1]) / 2 / hi, yy + (port ? 28 : -12),
                    { size: 10, color: K.MUT, plate: true });
    });

    /* the verdict on the selected axis */
    var vy = py + 32 + 3 * rowH + 10;
    var got = q.I[S.axis];
    if (hay) {
      var inside = got >= hay[0] && got <= hay[1];
      var off = inside ? 0 : 100 * (got < hay[0] ? (hay[0] - got) / hay[0]
                                                 : (got - hay[1]) / hay[1]);
      wrapLabel(c, inside
        ? fmt(got, 2) + ' kg·m², inside his published ' + fmt(hay[0], 1) +
          '–' + fmt(hay[1], 1) + ' — and nothing here was tuned to make it fit'
        : fmt(got, 2) + ' kg·m², ' + fmt(off, 0) + '% below his ' + fmt(hay[0], 1) +
          '–' + fmt(hay[1], 1) + '. His range is for an adult; this is a ' +
          fmt(MASS, 0) + ' kg youth, and I scales with mass.',
        px + pw / 2, vy + 24, pw, { size: 12, weight: 650,
                                    color: inside ? K.GRN : K.MUT });
    } else {
      wrapLabel(c, 'his slide 21 does not publish a value for this position and axis',
                px + pw / 2, vy + 24, pw, { size: 12, color: K.MUT });
    }

    wrapLabel(c, 'Measured · ' + AKD.sub.subject + ' · ' + fmt(MASS, 1) +
              ' kg, ' + fmt(STAT, 0) + ' cm · Winter’s Table 4.1 over one real ' +
              'standing pose, bent at real joints · the violet spokes are each ' +
              'segment’s own distance from the axis, and the dot area is its mass',
              ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sa = slider(u.ctl, 'Arms out', 0, 100, 2, S.arm,
                  function (v) { return fmt(v, 0) + '°'; },
                  function (v) { S.arm = v; draw(); });
  var sh = slider(u.ctl, 'Hips bent', 0, 130, 2, S.hip,
                  function (v) { return fmt(v, 0) + '°'; },
                  function (v) { S.hip = v; draw(); });
  var sk = slider(u.ctl, 'Knees bent', 0, 145, 2, S.knee,
                  function (v) { return fmt(v, 0) + '°'; },
                  function (v) { S.knee = v; draw(); });
  var st = slider(u.ctl, 'Trunk bent', 0, 60, 2, S.trunk,
                  function (v) { return fmt(v, 0) + '°'; },
                  function (v) { S.trunk = v; draw(); });
  sa.quiet(S.arm); sh.quiet(S.hip); sk.quiet(S.knee); st.quiet(S.trunk);
  var row = ctlRow(u.ctl);
  keepOut(chips(row, PRESET.map(function (p) { return [p[0], p[1]]; }), 'stand',
    function (k) {
      PRESET.forEach(function (p) {
        if (p[0] !== k) return;
        S.arm = p[2].arm; S.hip = p[2].hip; S.knee = p[2].knee; S.trunk = p[2].trunk;
      });
      sa.quiet(S.arm); sh.quiet(S.hip); sk.quiet(S.knee); st.quiet(S.trunk);
      draw();
    }));
  var row2 = ctlRow(u.ctl);
  keepOut(seg(row2, [['ml', 'Somersault'], ['ap', 'Cartwheel'], ['long', 'Twist']],
               S.axis, function (v) { S.axis = v; draw(); }));
  var rd = readout(u.ctl);
  /* kept short on purpose: this slide carries four sliders and two chip rows,
     and in the print layout it was the prose that pushed the page over */
  rd.innerHTML = 'His slide 21 gives five positions and a published moment of inertia for ' +
    'each. This is <b>one real measured body</b> bent into them and summed with Winter’s ' +
    'table; the grey bands are his numbers. Put the arms out and the twist value doubles ' +
    'while the somersault value barely moves — the arms go out <em>along</em> one axis and ' +
    '<em>away from</em> the other.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   5. SWINGLEG — his slide 22, on a real runner

   His claim: "a sprinter reduces the moment of inertia about the hip by
   flexing the knee".  It is the right claim and the slide gives no number,
   so this figure measures it.

   One recorded running trial (SUSU-46, 90 Hz).  At every frame the figure
   computes I of the whole swinging leg about that leg's own hip, twice:

     as the leg actually is, from the measured knee and ankle positions;
     and with the knee straightened -- the shank and foot swung out to
     lie along the thigh, hip and thigh left exactly where they are.

   The second is the counterfactual his slide is really making, and the gap
   between the two curves is the saving.  At the tightest point of swing
   the knee is at 101° and the measured leg is 26% easier to swing than the
   straight-leg version of itself.
   ====================================================================== */
D.register('swingleg', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var AKD = window.AK18 || null;
  if (!AKD) return;
  var R = AKD.run, MASS = AKD.sub.mass_kg;
  var S = { k: R.imin, ghost: 1 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1060, h: port ? 600 : 380,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function jt(n, k) { return R.J[n][k]; }
  /* the straightened leg, for drawing: the shank laid along the thigh */
  function straightJ(k) {
    var H = jt('hipR', k), K2 = jt('kneeR', k), A = jt('ankR', k), T = jt('toeR', k);
    var uu = unit(sub3(K2, H));
    var la = norm(sub3(A, K2)), lf = norm(sub3(T, A));
    var A2 = add(K2, mul(uu, la));
    return { hip: H, knee: K2, ank: A2, toe: add(A2, mul([0, -1, 0], lf)) };
  }

  function draw() {
    var K = C(), k = Math.max(0, Math.min(R.n - 1, Math.round(S.k)));
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.42;

    /* --------------------------- the runner --------------------------- */
    var box = { x: 8, y: 20, w: fw - 16, h: (port ? ax.H * 0.36 : ax.H - 84) };
    var xs = [], ys = [];
    for (var n in R.J) for (var i = 0; i < R.n; i++) {
      xs.push(R.J[n][i][0]); ys.push(R.J[n][i][1]);
    }
    var xlo = Math.min.apply(null, xs), xhi = Math.max.apply(null, xs);
    var sc = new Scene(c, box).fit(xlo - 8, -6, xhi + 8,
                                   Math.max.apply(null, ys) + 10, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sc.X(xlo - 8), sc.Y(0)); c.lineTo(sc.X(xhi + 8), sc.Y(0));
    c.stroke(); c.restore();

    var JJ = {}; for (var nm in R.J) JJ[nm] = R.J[nm][k];
    /* the straight-leg ghost, behind */
    if (S.ghost) {
      var g = straightJ(k);
      c.save(); c.strokeStyle = K.MUT; c.lineWidth = 5; c.lineCap = 'round';
      c.globalAlpha = .45; c.setLineDash([7, 5]);
      c.beginPath();
      c.moveTo(sc.X(g.hip[0]), sc.Y(g.hip[1]));
      c.lineTo(sc.X(g.knee[0]), sc.Y(g.knee[1]));
      c.lineTo(sc.X(g.ank[0]), sc.Y(g.ank[1]));
      c.lineTo(sc.X(g.toe[0]), sc.Y(g.toe[1]));
      c.stroke(); c.restore();
      label(c, 'if the knee stayed straight', sc.X(g.ank[0]) + 8, sc.Y(g.ank[1]),
            { size: 10.5, align: 'left', color: K.MUT, plate: true });
    }
    drawBody(c, JJ, sc, 'sag', { color: K.GRID, width: 4 });
    /* the swinging leg, picked out */
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(sc.X(JJ.hipR[0]), sc.Y(JJ.hipR[1]));
    c.lineTo(sc.X(JJ.kneeR[0]), sc.Y(JJ.kneeR[1]));
    c.lineTo(sc.X(JJ.ankR[0]), sc.Y(JJ.ankR[1]));
    c.lineTo(sc.X(JJ.toeR[0]), sc.Y(JJ.toeR[1]));
    c.stroke(); c.restore();
    pin(c, sc.X(JJ.hipR[0]), sc.Y(JJ.hipR[1]), 6, { color: K.ACC });
    label(c, 'hip', sc.X(JJ.hipR[0]) - 10, sc.Y(JJ.hipR[1]) - 14,
          { size: 11, align: 'right', color: K.ACC, weight: 700, plate: true });
    label(c, 'knee ' + fmt(R.knee[k], 0) + '°',
          sc.X(JJ.kneeR[0]) + 11, sc.Y(JJ.kneeR[1]),
          { size: 11.5, align: 'left', color: K.INK, weight: 650, plate: true });
    c.restore();

    /* ----------------------------- the traces ------------------------- */
    var px = port ? 0 : fw, py = port ? box.y + box.h + 46 : 36;
    var ph = port ? ax.H - py - 116 : ax.H - 142;
    var a2 = sub(ax, px + 66, py, 26, ax.H - (py + ph));
    var hi = Math.max.apply(null, R.straight) * 1.1;
    a2.setRange(0, (R.n - 1) / R.rate, 0, hi);
    a2.frame({ grid: true, xticks: null, yticks: axisTicks(0, hi),
               yfmt: function (v) { return v.toFixed(1); } });
    var tt = function (i) { return i / R.rate; };
    a2.poly(R.straight.map(function (v, i) { return [tt(i), v]; }),
            { color: K.MUT, width: 2.2, dash: [7, 5] });
    a2.poly(R.bent.map(function (v, i) { return [tt(i), v]; }),
            { color: K.ACC, width: 2.8 });
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(a2.X(tt(k)), a2.Y(0)); c.lineTo(a2.X(tt(k)), a2.Y(hi));
    c.stroke(); c.restore();
    a2.dots([[tt(k), R.bent[k]], [tt(k), R.straight[k]]], { color: K.INK, r: 4 });
    label(c, 'I of the swinging leg about its own hip (kg·m²)',
          (a2.pl + ax.W - a2.pr) / 2, py - 12, { size: 12.5, weight: 700, color: K.INK });
    label(c, 'seconds', (a2.pl + ax.W - a2.pr) / 2, ax.H - a2.pb + 30,
          { size: 12, weight: 700, color: K.INK });
    key(c, a2.pl + 14, py + 8, [[K.ACC, 'as he actually ran'],
                                [K.MUT, 'with the knee straight']], { size: 10.5 });

    var save = 100 * (1 - R.bent[k] / R.straight[k]);
    var ft = wrapLabel(c, 'Measured · ' + R.subject + ' running · ' +
             fmt(R.rate, 0) + ' Hz · Winter’s table on his own segment lengths · ' +
             'the knee works through ' + fmt(R.kmin, 0) + '–' + fmt(R.kmax, 0) +
             '° over this stride',
             ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
    label(c, 'at this instant the bent leg is ' + fmt(save, 0) +
             '% easier to swing — ' + fmt(R.bent[k], 2) + ' against ' +
             fmt(R.straight[k], 2) + ' kg·m²',
          ax.W / 2, ft - 20, { size: 12.5, weight: 650,
                               color: save > 15 ? K.GRN : K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sk = slider(u.ctl, 'Through the stride', 0, R.n - 1, 1, S.k,
                  function (v) { return fmt(v / R.rate, 2) + ' s'; },
                  function (v) { S.k = v; draw(); });
  sk.quiet(S.k);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [[1, 'Show the straight-leg ghost'], [0, 'Hide it']], S.ghost,
               function (v) { S.ghost = +v; draw(); }));
  var pb = playBtn(u.ctl, '▶ Run');
  var rd = readout(u.ctl);
  rd.innerHTML = 'His slide says a sprinter flexes the knee to reduce the moment of inertia ' +
    'about the hip. Here is a real runner doing it. The dashed ghost is the same leg with ' +
    'the knee straightened and the thigh left alone — the comparison the slide is ' +
    'making — and at the tightest point of swing the real leg is <b>' + fmt(R.saving, 0) +
    '% easier to swing</b>. That is why the knee folds, and it costs nothing: the foot has ' +
    'nowhere to be until it lands.';

  var raf = null, t0 = 0;
  function tick(t) {
    if (!t0) t0 = t;
    S.k = Math.round(((t - t0) / 1800 * R.n) % R.n);
    sk.quiet(S.k); draw();
    raf = requestAnimationFrame(tick);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; t0 = 0;
                    pb.textContent = '▶ Run'; }
  pb.addEventListener('click', function () {
    if (raf) { stop(); return; }
    pb.textContent = '❚❚ Pause'; t0 = 0; raf = requestAnimationFrame(tick);
  });
  node._stop = stop;
  node._draw = draw;
  draw();
});

/* ======================================================================
   6. SKATER — L = I ω, and what it costs to spin faster

   His slides 24 to 27.  Angular momentum is conserved while nothing is
   touching you, so pulling the arms in cannot change L: whatever I loses,
   ω has to make up.

   His worked example is the first preset and his arithmetic is right:
   0.36 × 12 = 0.04 × ω gives ω = 108 rad/s.  But 108 rad/s is 17.2
   revolutions a second, and the fastest scratch spins ever recorded are
   about 5.  The reason is his I values, not his algebra: a 9 : 1 change in
   moment of inertia is more than a human can make.  Real skaters are
   nearer 3.5 : 1, which is the second preset, and it gives the ~5 rev/s
   that a camera actually sees.

   The figure keeps his numbers, computes the consequence in revolutions
   per second, and says which part does not survive the comparison.  The
   third preset runs the same sum on THIS lecture's measured body, where
   the arms-out and arms-in moments of inertia come from the figure two
   slides back.
   ====================================================================== */
D.register('skater', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var AKD = window.AK18 || null;
  var MEAS = null;
  if (AKD) {
    var fo = null, fi = null;
    AKD.poses.forEach(function (p) {
      if (p.id === 'armsout') fo = p.I.long;
      if (p.id === 'stand') fi = p.I.long;
    });
    MEAS = { I1: fo, I2: fi };
  }

  var PRE = {
    his:  { n: 'His slide 27', I1: 0.36, I2: 0.04, w1: 12 },
    real: { n: 'A real skater', I1: 3.5, I2: 1.0, w1: 9 },
    meas: { n: 'This lecture’s measured body',
            I1: MEAS ? MEAS.I1 : 2.14, I2: MEAS ? MEAS.I2 : 0.89, w1: 9 }
  };
  var S = { pre: 'his', I2: PRE.his.I2, t: 0, run: 1 };
  var P = PRE.his;

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 560 : 390,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function L() { return P.I1 * P.w1; }
  function w2() { return L() / Math.max(S.I2, 1e-6); }
  var TWOPI = Math.PI * 2;

  /* a skater drawn from the top: a body, two arms, and a spin */
  function skater(sc, cx, cy, reach, ang, col, K) {
    c.save();
    c.translate(sc.X(cx), sc.Y(cy));
    c.rotate(ang);
    c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-sc.L(reach), 0); c.lineTo(sc.L(reach), 0); c.stroke();
    c.fillStyle = col;
    c.beginPath(); c.arc(0, 0, sc.L(9), 0, 7); c.fill();
    c.fillStyle = K.PLATE;
    c.beginPath(); c.arc(-sc.L(reach), 0, sc.L(4.5), 0, 7); c.fill();
    c.beginPath(); c.arc(sc.L(reach), 0, sc.L(4.5), 0, 7); c.fill();
    c.strokeStyle = col; c.lineWidth = 2;
    c.beginPath(); c.arc(-sc.L(reach), 0, sc.L(4.5), 0, 7); c.stroke();
    c.beginPath(); c.arc(sc.L(reach), 0, sc.L(4.5), 0, 7); c.stroke();
    c.restore();
  }

  function draw() {
    var K = C();
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.46;
    /* reach: scaled so the two pictures differ by the ratio of radii of
       gyration, which is what actually changes */
    var k1 = Math.sqrt(P.I1), k2 = Math.sqrt(S.I2);
    var box = { x: 8, y: 20, w: fw - 16, h: (port ? ax.H * 0.34 : ax.H - 96) };
    var half = box.w / 2;
    [[P.I1, k1, 'arms out', 0], [S.I2, k2, 'arms in', 1]].forEach(function (q, i) {
      var b2 = { x: box.x + i * half, y: box.y, w: half, h: box.h };
      var sc = new Scene(c, b2).fit(-60, -60, 60, 60, 10);
      var reach = 54 * Math.sqrt(q[0] / Math.max(P.I1, S.I2));
      var w = i ? w2() : P.w1;
      /* a blurred trail at the actual angular speed */
      c.save(); c.globalAlpha = 0.14;
      for (var g = 1; g <= 5; g++)
        skater(sc, 0, 0, reach, S.t * w - g * 0.13 * Math.min(1, w / 12),
               i ? K.ACC : K.BLUE, K);
      c.restore();
      skater(sc, 0, 0, reach, S.t * w, i ? K.ACC : K.BLUE, K);
      label(c, q[2], b2.x + half / 2, box.y + box.h - 6,
            { size: 12, weight: 700, color: i ? K.ACC : K.BLUE });
      label(c, 'I = ' + fmt(q[0], 2) + ' kg·m²',
            b2.x + half / 2, box.y + 12, { size: 12, weight: 650, color: K.INK });
      label(c, fmt(w, w > 40 ? 0 : 1) + ' rad/s  =  ' + fmt(w / TWOPI, 1) + ' rev/s',
            b2.x + half / 2, box.y + 30,
            { size: 12, weight: 700, color: i ? K.ACC : K.BLUE });
    });

    /* ---------------------------- the sum ----------------------------- */
    var px = port ? 16 : fw + 12, pw = port ? ax.W - 32 : ax.W - fw - 28;
    var py = port ? box.y + box.h + 44 : 50;
    label(c, 'Lᵢₙᵢₜᵢₐₗ = Lꟳᵢₙₐₗ',
          px, py, { size: 15, align: 'left', weight: 700, color: K.INK });
    label(c, 'I₁ ω₁  =  I₂ ω₂', px, py + 30,
          { size: 15, align: 'left', weight: 700, color: K.INK });
    label(c, '(' + fmt(P.I1, 2) + ')(' + fmt(P.w1, 0) + ')  =  (' + fmt(S.I2, 2) +
             ') ω₂', px, py + 60,
          { size: 13.5, align: 'left', weight: 600, color: K.MUT });
    label(c, 'ω₂  =  ' + fmt(w2(), w2() > 40 ? 0 : 2) + '  rad/s',
          px, py + 86, { size: 15, align: 'left', weight: 700, color: K.ACC });
    label(c, 'L is ' + fmt(L(), 2) + ' kg·m²/s, and stays there',
          px, py + 112, { size: 12, align: 'left', weight: 600, color: K.GRN });

    var ftop = wrapLabel(c, 'Nothing is touching her, so nothing can change L · whatever ' +
              'I loses, ω makes up exactly · the two figures are drawn with their arms at ' +
              'the radius of gyration each moment of inertia implies',
              ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });

    /* The honest check, drawn UPWARD from the foot of the canvas rather than
       down from a fixed offset: in portrait it runs to five lines, and a
       fixed offset put it straight through the line above. */
    var rev = w2() / TWOPI, ratio = P.I1 / S.I2;
    var bad = rev > 7;
    wrapLabel(c, bad
      ? fmt(rev, 1) + ' revolutions a second. The arithmetic is right; the inputs are not. ' +
        'A ' + fmt(ratio, 1) + ' : 1 change in moment of inertia is more than a person can ' +
        'make — real skaters manage about 3.5 : 1, and the fastest spins ever filmed ' +
        'are near 5 rev/s.'
      : fmt(rev, 1) + ' revolutions a second, from a ' + fmt(ratio, 1) +
        ' : 1 change in moment of inertia — which is about what a skater can actually do.',
      px + pw / 2, ftop - 26, pw, { size: 12, weight: 650,
                                    color: bad ? K.ACC : K.GRN });
  }

  u.ctl.className = 'ictls g2';
  var si = slider(u.ctl, 'How far the arms come in', 0.02, 1, 0.01, 1,
                  function (v) { return fmt(P.I1 * v, 2) + ' kg·m²'; },
                  function (v) { S.I2 = P.I1 * v; });
  si.quiet(S.I2 / PRE.his.I1);
  var row = ctlRow(u.ctl);
  keepOut(chips(row, Object.keys(PRE).map(function (k) { return [k, PRE[k].n]; }), S.pre,
    function (k) {
      S.pre = k; P = PRE[k]; S.I2 = P.I2; si.quiet(S.I2 / P.I1);
    }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'Pull the arms in and the moment of inertia falls; angular momentum cannot, ' +
    'because nothing is touching her. So the angular velocity has to rise by exactly the ' +
    'factor the moment of inertia fell by. His own numbers are the first preset — the ' +
    'algebra is right and the answer is absurd, which is worth more than a tidy example. ' +
    'Compare the second.';

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
   7. DIVESPIN — how many somersaults fit in 1.2 seconds

   His slides 28 and 29 and the Tutor's Impulse Momentum 10 and 11.  The
   diver leaves the board with whatever angular momentum she leaves with,
   and then nothing can change it.  The flight time is set by how high she
   went, which is also fixed at take-off.  So the only thing left to decide
   how many somersaults she completes is how tightly she tucks.

   The Tutor's numbers are the two chips: L = 39 kg·m²/s over 1.2 s gives
   exactly 1.00 revolution in a layout (I = 7.45) and 3.01 in a tuck
   (I = 2.475).  The slider moves continuously between them, and the dial
   draws the actual rotation, so a half-twist short is visible rather than
   arithmetical.

   The third chip runs the same sum on his slide 28's diver, whose radius
   of gyration goes 0.5 m → 0.25 m at 60 kg: I = 15 → 3.75 kg·m², and
   4 rad/s becomes 16 — which is his answer on slide 29.
   ====================================================================== */
D.register('divespin', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var AKD = window.AK18 || null;
  var TUT = AKD ? AKD.diver : { L: 39, t: 1.2, layout: 7.45, tuck: 2.475 };

  var PRE = {
    layout: { n: 'Layout', I: TUT.layout },
    tuck:   { n: 'Tuck',   I: TUT.tuck }
  };
  var S = { I: TUT.layout, t: TUT.t, L: TUT.L, play: 0, phase: 0 };
  var TWOPI = Math.PI * 2;

  var ax = new Axes(u.cv, { w: port ? 460 : 1020, h: port ? 650 : 380,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function omega() { return S.L / Math.max(S.I, 1e-6); }
  function revs() { return omega() * S.t / TWOPI; }

  function draw() {
    var K = C();
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.44;
    var w = omega(), N = revs();

    /* ------------------------ the diver, turning ---------------------- */
    var box = { x: 8, y: 20, w: fw - 16, h: (port ? ax.H * 0.38 : ax.H - 92) };
    var sc = new Scene(c, box).fit(-70, -70, 70, 70, 8);
    /* how tight the tuck is, from the moment of inertia itself */
    var tight = Math.max(0.18, Math.min(1, Math.sqrt(S.I / TUT.layout)));
    var ang = S.phase;
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    /* the path through the air */
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1.6; c.setLineDash([5, 4]);
    c.beginPath(); c.arc(sc.X(0), sc.Y(0), sc.L(62), 0, 7); c.stroke(); c.restore();
    /* the body: a rod of length set by the tuck, with a head */
    c.save(); c.translate(sc.X(0), sc.Y(0)); c.rotate(-ang);
    c.strokeStyle = K.ACC; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -sc.L(52 * tight)); c.lineTo(0, sc.L(52 * tight));
    c.stroke();
    c.fillStyle = K.ACC;
    c.beginPath(); c.arc(0, -sc.L(52 * tight), sc.L(11 * Math.sqrt(tight)), 0, 7); c.fill();
    c.restore();
    /* the count so far */
    c.restore();
    label(c, 'turned ' + fmt(ang / TWOPI, 2) + ' of ' + fmt(N, 2) + ' revolutions',
          box.x + box.w / 2, box.y + box.h + 12,
          { size: 11.5, color: K.MUT, weight: 650 });

    /* ------------------------- the arithmetic ------------------------- */
    var px = port ? 16 : fw + 12, pw = port ? ax.W - 32 : ax.W - fw - 28;
    var py = port ? box.y + box.h + 42 : 44;
    label(c, 'L = I ω   →   ω = L / I', px, py,
          { size: 15, align: 'left', weight: 700, color: K.INK });
    label(c, 'ω = ' + fmt(S.L, 0) + ' / ' + fmt(S.I, 3) + ' = ' + fmt(w, 2) + ' rad/s',
          px, py + 30, { size: 13.5, align: 'left', weight: 600, color: K.MUT });
    label(c, 'θ = ω t = ' + fmt(w, 2) + ' × ' + fmt(S.t, 2) + ' = ' +
             fmt(w * S.t, 2) + ' rad', px, py + 54,
          { size: 13.5, align: 'left', weight: 600, color: K.MUT });
    label(c, fmt(N, 2) + ' revolutions', px, py + 86,
          { size: 18, align: 'left', weight: 700, color: K.ACC });

    /* a ladder of what that is worth */
    var LAD = [[0.5, 'a half'], [1, 'a single'], [1.5, 'a one and a half'],
               [2, 'a double'], [2.5, 'a two and a half'], [3, 'a triple'],
               [3.5, 'a three and a half']];
    var got = null;
    LAD.forEach(function (r) { if (N >= r[0] - 0.06) got = r; });
    /* two columns in portrait: four would not fit across 460 px */
    var yy = py + 120, ncol = port ? 2 : 4;
    LAD.forEach(function (r, i) {
      var on = got && r[0] === got[0];
      var xx = px + (i % ncol) * (pw / ncol), zz = yy + Math.floor(i / ncol) * 22;
      label(c, r[1], xx, zz, { size: 11.5, align: 'left',
                               weight: on ? 700 : 600,
                               color: on ? K.GRN : K.GRID });
    });
    var ly = yy + Math.ceil(LAD.length / ncol) * 22 + 14;
    if (got) label(c, 'enough for ' + got[1], px, ly,
                   { size: 13, align: 'left', weight: 700, color: K.GRN });
    else label(c, 'not enough for a half somersault', px, ly,
               { size: 13, align: 'left', weight: 700, color: K.MUT });

    wrapLabel(c, 'The Tutor’s diver · L = ' + fmt(S.L, 0) +
              ' kg·m²/s and ' + fmt(S.t, 1) + ' s of flight, both fixed at ' +
              'take-off · layout I = ' + fmt(TUT.layout, 2) + ' gives 1.00 rev, ' +
              'tuck I = ' + fmt(TUT.tuck, 3) + ' gives 3.01 · the only thing she still ' +
              'controls once her feet leave the board is how tightly she holds',
              ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var si = slider(u.ctl, 'How tightly she tucks', TUT.tuck, TUT.layout, 0.005, S.I,
                  function (v) { return 'I = ' + fmt(v, 2); },
                  function (v) { S.I = v; S.phase = 0; draw(); });
  var st = slider(u.ctl, 'Time in the air', 0.6, 1.8, 0.02, S.t,
                  function (v) { return fmt(v, 2) + ' s'; },
                  function (v) { S.t = v; S.phase = 0; draw(); });
  si.quiet(S.I); st.quiet(S.t);
  var row = ctlRow(u.ctl);
  keepOut(chips(row, [['layout', 'Layout'], ['tuck', 'Tuck']], 'layout',
    function (k) { S.I = PRE[k].I; si.quiet(S.I); S.phase = 0; draw(); }));
  var pb = playBtn(u.ctl, '▶ Dive');
  var rd = readout(u.ctl);
  rd.innerHTML = 'She leaves the board with a fixed angular momentum and a fixed time in the ' +
    'air — both decided before her feet leave. Everything after that is one choice: ' +
    '<b>how tightly to hold</b>. In the layout she completes a single somersault; in a tuck, ' +
    'with exactly the same push, she completes three.';

  var raf = null, t0 = 0;
  function tick(t) {
    if (!t0) t0 = t;
    var el = (t - t0) / 1000;
    if (el >= S.t) { S.phase = omega() * S.t; draw(); stop(); return; }
    S.phase = omega() * el; draw();
    raf = requestAnimationFrame(tick);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; t0 = 0;
                    pb.textContent = '▶ Dive'; }
  pb.addEventListener('click', function () {
    if (raf) { stop(); S.phase = 0; draw(); return; }
    S.phase = 0; pb.textContent = '❚❚ Stop'; t0 = 0;
    raf = requestAnimationFrame(tick);
  });
  node._stop = stop;
  node._draw = draw;
  draw();
});


/* ======================================================================
   8. ANGIMP — angular impulse is what put the angular momentum there

   His slides 30 to 35.  M = Iα is the angular Newton's second law, and
   multiplying both sides by time gives the version that is actually
   useful on a diving board or a vault: M t = ΔL = I ω.

   His worked example is on the figure: a diver pushing with 20 N·m for
   1.4 s with I = 9 kg·m² leaves with 20 × 1.4 / 9 = 3.11 rad/s, which is
   his slide 35.  The sliders move all three, and the bar under the figure
   shows the angular impulse accumulating as the torque acts, so that the
   phrase "a torque applied for a certain amount of time" has a picture.

   The quiet point of the slide, which the figure makes loud: 20 N·m is
   not much and 1.4 s is a long time, and the product is still only enough
   for half a somersault per second. Angular momentum has to be bought on
   the board, and nothing in the air can top it up.
   ====================================================================== */
D.register('angimp', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { M: 20, t: 1.4, I: 9, run: 0, el: 0 };
  var TWOPI = Math.PI * 2;

  var ax = new Axes(u.cv, { w: port ? 460 : 1020, h: port ? 520 : 370,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function J() { return S.M * S.t; }
  function w() { return J() / Math.max(S.I, 1e-6); }

  function draw() {
    var K = C();
    ax.clear();
    var fw = port ? ax.W : ax.W * 0.42;
    var el = S.run ? Math.min(S.el, S.t) : S.t;

    /* ------------------- the board, and the torque -------------------- */
    var box = { x: 8, y: 20, w: fw - 16, h: (port ? ax.H * 0.32 : ax.H - 92) };
    var sc = new Scene(c, box).fit(-60, -20, 60, 100, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    /* the board */
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sc.X(-56), sc.Y(0)); c.lineTo(sc.X(20), sc.Y(0));
    c.stroke(); c.restore();
    /* the body, leaning into the push */
    var lean = 0.22 * (el / Math.max(S.t, 1e-6));
    c.save(); c.translate(sc.X(-6), sc.Y(6)); c.rotate(-lean);
    c.strokeStyle = K.INK; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -sc.L(62)); c.stroke();
    c.fillStyle = K.INK;
    c.beginPath(); c.arc(0, -sc.L(72), sc.L(10), 0, 7); c.fill();
    c.restore();
    /* the torque that does it */
    spin(c, sc.X(-6), sc.Y(44), sc.L(26), false, { color: K.ACC, width: 3.2, head: 10 });
    label(c, 'M = ' + fmt(S.M, 0) + ' N·m', sc.X(-6), sc.Y(44) - sc.L(34),
          { size: 12.5, color: K.ACC, weight: 700, plate: true });
    c.restore();

    /* ------------------- the impulse accumulating --------------------- */
    var px = port ? 16 : fw + 10, pw = port ? ax.W - 32 : ax.W - fw - 26;
    var py = port ? box.y + box.h + 42 : 40;
    label(c, 'angular impulse = M × t', px, py,
          { size: 14.5, align: 'left', weight: 700, color: K.INK });
    /* the bar: area = M t, drawn as a rectangle of height M and width t */
    var bh = 54, bw = pw - 20;
    var fullT = 2.0, fullM = 40;
    var rw = bw * S.t / fullT, rh = bh * S.M / fullM;
    var by = py + 26 + bh;
    c.save();
    c.strokeStyle = K.GRID; c.lineWidth = 1;
    c.strokeRect(px + .5, by - bh + .5, bw, bh);
    c.fillStyle = K.ACCFILL;
    c.fillRect(px, by - rh, rw * (el / Math.max(S.t, 1e-6)), rh);
    c.strokeStyle = K.ACC; c.lineWidth = 1.8;
    c.strokeRect(px + .5, by - rh + .5, rw, rh);
    c.restore();
    label(c, 'M', px - 8, by - rh / 2, { size: 11.5, align: 'right', color: K.ACC,
                                         weight: 700 });
    label(c, 't = ' + fmt(S.t, 2) + ' s', px + rw / 2, by + 14,
          { size: 11.5, color: K.MUT, weight: 650 });
    label(c, 'J = ' + fmt(J() * (el / Math.max(S.t, 1e-6)), 1) + ' N·m·s',
          px + rw + 10, by - rh / 2,
          { size: 12.5, align: 'left', color: K.ACC, weight: 700, plate: true });

    /* --------------------------- the result --------------------------- */
    var ry = by + 44;
    label(c, 'M t  =  ΔL  =  I ω', px, ry,
          { size: 15, align: 'left', weight: 700, color: K.INK });
    label(c, '(' + fmt(S.M, 0) + ')(' + fmt(S.t, 2) + ')  =  (' + fmt(S.I, 1) + ') ω',
          px, ry + 28, { size: 13.5, align: 'left', weight: 600, color: K.MUT });
    label(c, 'ω  =  ' + fmt(w(), 2) + ' rad/s  =  ' + fmt(w() / TWOPI, 2) + ' rev/s',
          px, ry + 56, { size: 15.5, align: 'left', weight: 700, color: K.ACC });
    if (Math.abs(S.M - 20) < 0.5 && Math.abs(S.t - 1.4) < 0.02 && Math.abs(S.I - 9) < 0.1)
      label(c, 'his slide 35', port ? px : px + 250, ry + (port ? 80 : 56),
            { size: 12.5, align: 'left', weight: 650, color: K.GRN });

    wrapLabel(c, 'Everything the diver will ever have in the air is bought here, against the ' +
              'board · ' + fmt(S.M, 0) + ' N·m held for ' + fmt(S.t, 2) +
              ' s is ' + fmt(J(), 1) + ' N·m·s of angular impulse, and that IS the ' +
              'angular momentum she leaves with · once her feet are off, no torque acts ' +
              'and the number is frozen',
              ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sm = slider(u.ctl, 'Torque on the board', 0, 40, 1, S.M,
                  function (v) { return fmt(v, 0) + ' N·m'; },
                  function (v) { S.M = v; draw(); });
  var stt = slider(u.ctl, 'How long it acts', 0.2, 2.0, 0.05, S.t,
                   function (v) { return fmt(v, 2) + ' s'; },
                   function (v) { S.t = v; draw(); });
  var sii = slider(u.ctl, 'Moment of inertia', 1, 16, 0.5, S.I,
                   function (v) { return fmt(v, 1) + ' kg·m²'; },
                   function (v) { S.I = v; draw(); });
  sm.quiet(S.M); stt.quiet(S.t); sii.quiet(S.I);
  var row = ctlRow(u.ctl);
  var rb = el('button', 'icalc-chip', 'His numbers');
  rb.addEventListener('click', function () {
    S.M = 20; S.t = 1.4; S.I = 9; sm.quiet(20); stt.quiet(1.4); sii.quiet(9); draw();
  });
  row.appendChild(rb);
  var pb = playBtn(u.ctl, '▶ Push off');
  var rd = readout(u.ctl);
  rd.innerHTML = 'A torque held for a time is an <b>angular impulse</b>, and an angular ' +
    'impulse is a change in angular momentum — the same sentence as force, time and ' +
    'momentum, one lecture earlier. Note how little the diver gets: 20 N·m for a long ' +
    '1.4 s buys 3.11 rad/s, half a turn a second. Everything else she does in the air is ' +
    'spending that, not adding to it.';

  var raf = null, t0 = 0;
  function tick(t) {
    if (!t0) t0 = t;
    S.el = (t - t0) / 1000;
    if (S.el >= S.t) { S.el = S.t; S.run = 0; draw(); stop(); return; }
    draw(); raf = requestAnimationFrame(tick);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; t0 = 0;
                    pb.textContent = '▶ Push off'; }
  pb.addEventListener('click', function () {
    if (raf) { stop(); S.run = 0; draw(); return; }
    S.run = 1; S.el = 0; pb.textContent = '❚❚ Stop'; t0 = 0;
    raf = requestAnimationFrame(tick);
  });
  node._stop = stop;
  node._draw = draw;
  draw();
});

/* ======================================================================
   9. FLIGHTL — a measured flight phase, and why a vertical jumper cannot
      somersault however hard he tucks

   His slides 23 to 26 assert that angular momentum is conserved in the
   air.  There is no diving or gymnastics trial in any dataset this course
   has, so instead of a figure that asserts it again, this one checks the
   PREMISE on a real jump, which is the part that can actually be measured.

   The premise is: in the air the only force on the body is gravity, and
   gravity acts at the centre of mass, so it exerts no torque about the
   centre of mass, so L cannot change.

   The test: take the vertical jump of SUSU-46 (the same trial lectures 7
   and 9 run on), build the whole body from markers alone, and differentiate
   the centre of mass twice.  Through the 0.451 s the force plate reads
   zero, the measured acceleration is −9.71 ± 0.43 m/s² against gravity's
   −9.81 — one per cent, from markers, with the plate not consulted.  No
   force but gravity.  So no torque about the centre of mass.  So L is
   fixed.

   And then the honest half.  His angular momentum through that flight is
   0.6 kg·m²/s, against 4.4 during the push.  He jumped straight up, so he
   bought almost no angular momentum, and no amount of tucking will turn
   0.6 into a somersault: at the moment of inertia of a tight tuck it is
   about a seventh of a revolution a second.  Conservation cuts both ways,
   and that is the part the diagrams of spinning skaters never show.
   ====================================================================== */
D.register('airborne', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var AKD = window.AK18 || null;
  if (!AKD) return;
  var Jd = AKD.jump;
  var S = { show: 'az', k: 0 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 560 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  var N = Jd.t.length;
  var VIEWS = {
    az: { v: Jd.az, name: 'vertical acceleration of the centre of mass (m/s²)',
          col: 'ACC', ref: -9.81, reflab: 'gravity, −9.81' },
    L:  { v: Jd.L, name: 'angular momentum about the centre of mass (kg·m²/s)',
          col: 'VIO', ref: 0, reflab: '' },
    h:  { v: Jd.comz, name: 'height of the centre of mass (m)', col: 'BLUE',
          ref: null, reflab: '' }
  };

  function draw() {
    var K = C(), V = VIEWS[S.show];
    ax.clear();
    var py = 42;
    var ph = (port ? ax.H * 0.52 : ax.H - 150);
    var a2 = sub(ax, 70, py, 26, ax.H - (py + ph));
    var lo = Math.min.apply(null, V.v), hi = Math.max.apply(null, V.v);
    if (V.ref != null) { lo = Math.min(lo, V.ref); hi = Math.max(hi, V.ref); }
    var pad = (hi - lo) * 0.14 || 1; lo -= pad; hi += pad;
    a2.setRange(Jd.t[0], Jd.t[N - 1], lo, hi);

    /* the flight phase, as a band */
    a2.rect(Jd.t0, lo, Jd.t1, hi, { fill: K.FILL0 });
    a2.frame({ grid: true, xticks: null, yticks: axisTicks(lo, hi),
               yfmt: function (v) { return minus(v.toFixed(Math.abs(hi - lo) > 8 ? 0 : 1)); } });
    if (V.ref != null) {
      c.save(); c.strokeStyle = K.GRN; c.lineWidth = 2; c.setLineDash([7, 5]);
      c.beginPath(); c.moveTo(a2.X(Jd.t[0]), a2.Y(V.ref));
      c.lineTo(a2.X(Jd.t[N - 1]), a2.Y(V.ref)); c.stroke(); c.restore();
      if (V.reflab)
        label(c, V.reflab, a2.X(Jd.t[N - 1]) - 6, a2.Y(V.ref) - 12,
              { size: 11, align: 'right', color: K.GRN, weight: 650, plate: true });
    }
    a2.poly(V.v.map(function (y, i) { return [Jd.t[i], y]; }),
            { color: K[V.col], width: 2.6 });
    label(c, V.name, (a2.pl + ax.W - a2.pr) / 2, py - 14,
          { size: 12.5, weight: 700, color: K.INK });
    label(c, 'seconds', (a2.pl + ax.W - a2.pr) / 2, ax.H - a2.pb + 30,
          { size: 12, weight: 700, color: K.INK });
    label(c, 'in the air — ' + fmt(Jd.flight_s, 3) + ' s',
          (a2.X(Jd.t0) + a2.X(Jd.t1)) / 2, py + 14,
          { size: 11.5, color: K.MUT, weight: 700, plate: true });

    /* the verdict, which depends on which trace you are looking at */
    var msg, col;
    if (S.show === 'az') {
      msg = 'measured in flight: ' + fmt(Jd.az_flight_mean, 2) + ' ± ' +
            fmt(Jd.az_flight_sd, 2) + ' m/s², against gravity’s −9.81 — ' +
            'one per cent, from markers alone. Nothing but gravity is acting.';
      col = K.GRN;
    } else if (S.show === 'L') {
      msg = 'L is ' + fmt(Jd.L_flight_mean, 2) + ' ± ' + fmt(Jd.L_flight_sd, 2) +
            ' kg·m²/s in flight against ' + fmt(Jd.Lpeak, 1) +
            ' during the push — he jumped straight up, so he bought almost none, and ' +
            'in the air there is nothing left to buy it with.';
      col = K.ACC;
    } else {
      msg = 'he rises ' + fmt(Math.max.apply(null, Jd.comz) -
            Jd.comz[0], 2) + ' m above where he started, and comes back down the same way; ' +
            'the flight time follows from that and nothing else.';
      col = K.MUT;
    }
    var ft = wrapLabel(c, 'Measured · ' + Jd.subject + ' · ' + fmt(Jd.mass_kg, 1) +
             ' kg · a 14-segment Winter model over the markers, at ' + fmt(Jd.rate, 0) +
             ' Hz · the shaded band is where the force plate reads zero, and the plate ' +
             'was not used to compute any of these three curves',
             ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
    wrapLabel(c, msg, ax.W / 2, ft - 20, ax.W - 40, { size: 12, weight: 650, color: col });
  }

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['az', 'What is acting on him'],
                    ['L', 'His angular momentum'],
                    ['h', 'How high he got']], S.show,
               function (v) { S.show = v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'His slides say angular momentum is conserved in the air. The reason is ' +
    'that gravity pulls at the centre of mass, so it has no moment arm about the centre of ' +
    'mass, so there is no torque. That premise is measurable, and here it is measured: ' +
    'through the whole flight the centre of mass accelerates at <b>' +
    fmt(Jd.az_flight_mean, 2) + ' m/s²</b>. Then look at his angular momentum — ' +
    'he has almost none, and nothing in the air can give him any.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   10. GYMTABLE — the Tutor's whole-body sum, segment by segment

   The Biomechanics Tutor's Moment of Inertia Q11 and Q12 give a 50 kg
   gymnast as eight segments, each with its own mass, its own moment of
   inertia about its own centre of gravity, and its own distance from the
   body's centre of gravity in two positions.  The answers are 8.68 kg·m²
   in layout and 3.70 in tuck.

   Those two questions are a parallel-axis sum done eight times, and the
   figure does it in front of you: each row's bar is I_cg + m r², split so
   you can see which part is which.  What it shows is that the transfer
   term is nearly everything -- the segments' own moments of inertia add up
   to 1.2 of the 8.7 -- and that tucking works by shortening r for the four
   segments that are far out, not by making anything smaller.

   It is also the bridge to the previous figure: the Tutor's 50 kg gymnast
   lands at 8.68 and 3.70, the deck's measured 60.7 kg subject at 11.10 and
   4.22, and the ratio of the two pairs is the same to within a few per
   cent, which is what you would expect if both are right.
   ====================================================================== */
D.register('gymtable', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var AKD = window.AK18 || null;
  if (!AKD) return;
  var G = AKD.gym;
  var S = { pos: 'layout', hi: -1 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 620 : 420,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function rows() {
    var ri = S.pos === 'layout' ? 3 : 4;
    return G.rows.map(function (r) {
      var self = r[2], tr = r[1] * r[ri] * r[ri];
      return { n: r[0], m: r[1], r: r[ri], self: self, tr: tr, I: self + tr };
    });
  }
  function total(p) {
    var ri = p === 'layout' ? 3 : 4, t = 0;
    G.rows.forEach(function (r) { t += r[2] + r[1] * r[ri] * r[ri]; });
    return t;
  }

  function draw() {
    var K = C(), R = rows(), tot = total(S.pos);
    ax.clear();
    var top = 54, lh = port ? 30 : 30;
    var x0 = port ? 10 : 20, nameW = port ? 86 : 110;
    var bx = x0 + nameW + (port ? 88 : 150);
    var bw = ax.W - bx - (port ? 76 : 120);
    var full = Math.max(total('layout') / 8 * 3, 2.6);

    label(c, 'segment', x0, top - 24, { size: 11, align: 'left', weight: 700, color: K.MUT });
    label(c, 'm (kg)', x0 + nameW + 18, top - 24,
          { size: 11, align: 'right', weight: 700, color: K.MUT });
    label(c, 'r (m)', x0 + nameW + (port ? 76 : 110), top - 24,
          { size: 11, align: 'right', weight: 700, color: K.MUT });
    label(c, 'Iᴄɢ + m r²   (kg·m²)', bx, top - 24,
          { size: 11, align: 'left', weight: 700, color: K.MUT });

    R.forEach(function (q, i) {
      var y = top + i * lh, on = i === S.hi;
      if (on) {
        c.save(); c.fillStyle = K.FILL0;
        c.fillRect(x0 - 4, y - lh / 2 + 2, ax.W - 2 * x0 + 8, lh - 3); c.restore();
      }
      label(c, q.n, x0, y, { size: 12, align: 'left',
                             weight: on ? 700 : 600, color: K.INK });
      label(c, fmt(q.m, 1), x0 + nameW + 18, y,
            { size: 11.5, align: 'right', color: K.MUT });
      label(c, fmt(q.r, 2), x0 + nameW + (port ? 76 : 110), y,
            { size: 11.5, align: 'right', color: K.VIO, weight: 650 });
      var ws = bw * q.self / full, wt = bw * q.tr / full;
      c.save();
      c.fillStyle = K.BLUE; c.fillRect(bx, y - 8, ws, 16);
      c.fillStyle = K.ACCFILL; c.fillRect(bx + ws, y - 8, wt, 16);
      c.strokeStyle = K.ACC; c.lineWidth = 1.2;
      c.strokeRect(bx + .5, y - 7.5, ws + wt, 16);
      c.restore();
      label(c, fmt(q.I, 3), bx + ws + wt + 8, y,
            { size: 11.5, align: 'left', weight: on ? 700 : 600, color: K.INK });
    });

    var ty = top + R.length * lh + 6;
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0, ty - lh / 2 + 4); c.lineTo(ax.W - x0, ty - lh / 2 + 4);
    c.stroke(); c.restore();
    label(c, 'whole body', x0, ty + 4, { size: 12.5, align: 'left', weight: 700,
                                         color: K.INK });
    label(c, fmt(tot, 4) + '  kg·m²', bx, ty + 4,
          { size: 15, align: 'left', weight: 700, color: K.ACC });
    var want = S.pos === 'layout' ? 8.68 : 3.70;
    label(c, 'the Tutor’s answer: ' + fmt(want, 2), bx + 190, ty + 4,
          { size: 12, align: 'left', weight: 650, color: K.GRN });

    /* how much of it is the transfer term */
    var selfsum = 0; R.forEach(function (q) { selfsum += q.self; });
    var ly = ty + 32;
    key(c, x0, ly - 12, [[K.BLUE, 'the segment’s own Iᴄɢ — ' +
                                   fmt(selfsum, 2) + ' kg·m² in all'],
                         [K.ACC,  'm r², the transfer to the body’s CofG — ' +
                                   fmt(tot - selfsum, 2)]], { size: 10.5 });

    var ft = wrapLabel(c, 'The Biomechanics Tutor, Moment of Inertia Q11 and Q12 · a ' +
             fmt(G.mass, 0) + ' kg gymnast · the eight masses sum to exactly ' +
             fmt(G.mass, 0) + ' kg · tucking changes r, not m and not Iᴄɢ',
             ax.W / 2, ax.H - 9, ax.W - 24, { size: 11, color: K.MUT });
    wrapLabel(c, 'Layout ' + fmt(total('layout'), 2) + ' against tuck ' +
              fmt(total('tuck'), 2) + ' — a factor of ' +
              fmt(total('layout') / total('tuck'), 2) +
              ', and all of it comes from four segments moving closer in',
              ax.W / 2, ft - 20, ax.W - 40,
              { size: 12, weight: 650, color: K.GRN });
  }

  /* pointing at a row picks it out */
  u.cv.addEventListener('pointermove', function (ev) {
    var r = u.cv.getBoundingClientRect();
    var py = (ev.clientY - r.top) / r.height * ax.H;
    var i = Math.floor((py - 54 + 15) / 30);
    var n = (i >= 0 && i < G.rows.length) ? i : -1;
    if (n !== S.hi) { S.hi = n; draw(); }
  });
  u.cv.addEventListener('pointerleave', function () { S.hi = -1; draw(); });

  u.ctl.className = 'ictls';
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['layout', 'Layout'], ['tuck', 'Tuck']], S.pos,
               function (v) { S.pos = v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'Eight segments, each contributing its own moment of inertia <em>plus</em> ' +
    'its mass times its distance from the body’s centre of gravity, squared. Switch to ' +
    'the tuck and watch which rows move: the head, the hands, the legs and the feet. The ' +
    'trunk does not move at all, because it is already at the centre — and it is half ' +
    'the body’s mass.';

  node._draw = draw;
  draw();
});



window.AK = { WT: WT, LIMB: LIMB, bodyParts: bodyParts, bodyCoM: bodyCoM,
              inertiaAbout: inertiaAbout, legAboutHip: legAboutHip,
              clonePose: clonePose, rotAbout: rotAbout, lerp3: lerp3,
              DISTAL: DISTAL, UPPER: UPPER, drawBody: drawBody, pr2: pr2,
              perp: perp, moment: moment, invX: invX, invY: invY,
              dot: dot, unit: unit, sub3: sub3, add: add, mul: mul, norm: norm };
D.boot();
})();
