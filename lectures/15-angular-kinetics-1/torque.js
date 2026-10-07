/* ======================================================================
   EPHE 341 — Angular Kinetics 1 (lecture 15)

   Every moment on these figures is computed from the geometry on screen,
   never drawn to look right.  The measured figures use one walking trial
   per subject from Lencioni et al. (2019): the stick figure, the force
   vector, the joint moments and the muscle activity are the same person
   on the same step, and the moment arms are measured off that geometry
   live.  parts/selftest.js checks the arithmetic against values worked
   out independently in Python.
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
  c.fillText(s, x, y);
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

/* ------------------- the measured walking trial ---------------------- */
var KIN = window.KIN15 || null;
var JI = {};
if (KIN) KIN.j.forEach(function (n, i) { JI[n] = i; });

/* joint position at marker frame f, in centimetres */
function jpos(s, f, name) {
  var j = JI[name], k = (f * 20 + j) * 2;
  return [s.p[k], s.p[k + 1]];
}
/* joint position at force-plate sample i, interpolated onto the marker clock */
function jat(s, i, name) {
  var tf = i / s.ghz * s.kinfs, f = Math.floor(tf), a = tf - f;
  var f1 = Math.min(f + 1, s.nf - 1);
  var p0 = jpos(s, Math.min(f, s.nf - 1), name), p1 = jpos(s, f1, name);
  return [p0[0] + (p1[0] - p0[0]) * a, p0[1] + (p1[1] - p0[1]) * a];
}
/* force-plate sample index for a given percentage of the gait cycle */
function gidx(s, pc) {
  var i = Math.round(pc / 100 * s.cycle_s * s.ghz);
  return Math.max(0, Math.min(s.ng - 1, i));
}
/* is there enough load on the plate for the geometry to mean anything? */
function loaded(s, i) { return s.fy[i] > 0.05 * s.mass_kg * 9.81; }

/* The moment the ground reaction force alone makes about a joint, as an
   INTERNAL moment per kilogram -- positive extensor at hip and knee,
   positive plantarflexor at the ankle.  The ankle takes the opposite sign
   because plantarflexion and extension are opposite senses in the sagittal
   plane of a right leg viewed with the direction of travel to the right. */
function grfMoment(s, i, joint) {
  var j = jat(s, i, joint === 'ank' ? 'ankR' : joint === 'knee' ? 'kneeR' : 'hipR');
  var Mz = moment(j[0], j[1], s.cx[i], s.cy[i], s.fx[i], s.fy[i]) / 100;   /* cm -> m */
  return (joint === 'ank' ? 1 : -1) * Mz / s.mass_kg;
}
/* signed moment arm in centimetres; + means the line passes in FRONT of
   (ahead of, in the direction of travel) the joint */
function grfArm(s, i, joint) {
  var j = jat(s, i, joint === 'ank' ? 'ankR' : joint === 'knee' ? 'kneeR' : 'hipR');
  var F = Math.hypot(s.fx[i], s.fy[i]);
  if (F < 1) return 0;
  return moment(j[0], j[1], s.cx[i], s.cy[i], s.fx[i], s.fy[i]) / F;
}

var LIMB = [['hipR', 'kneeR'], ['kneeR', 'ankR'], ['ankR', 'heelR'], ['ankR', 'toeR'], ['heelR', 'toeR']];
var LIMBL = [['hipL', 'kneeL'], ['kneeL', 'ankL'], ['ankL', 'heelL'], ['ankL', 'toeL'], ['heelL', 'toeL']];
var TRUNK = [['pelvis', 'trunk'], ['trunk', 'neck'], ['neck', 'head'],
             ['neck', 'shR'], ['shR', 'elR'], ['elR', 'wrR'],
             ['neck', 'shL'], ['shL', 'elL'], ['elL', 'wrL'],
             ['pelvis', 'hipR'], ['pelvis', 'hipL']];

/* draw the body at marker frame f (may be fractional) */
function body(c, s, sc, f, o) {
  o = o || {};
  var fa = Math.floor(f), t = f - fa, fb = Math.min(fa + 1, s.nf - 1);
  function P(n) {
    var a = jpos(s, Math.min(fa, s.nf - 1), n), b = jpos(s, fb, n);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  function seg(list, col, w) {
    c.save(); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
    list.forEach(function (e) {
      var a = P(e[0]), b = P(e[1]);
      c.beginPath(); c.moveTo(sc.X(a[0]), sc.Y(a[1])); c.lineTo(sc.X(b[0]), sc.Y(b[1])); c.stroke();
    });
    c.restore();
  }
  seg(LIMBL, o.far || C().GRID, o.wfar || 3);
  seg(TRUNK, o.trunk || C().MUT, o.wtrunk || 3.4);
  seg(LIMB, o.near || C().INK, o.wnear || 4.4);
  var h = P('head');
  c.save(); c.strokeStyle = o.trunk || C().MUT; c.lineWidth = o.wtrunk || 3.4;
  c.beginPath(); c.arc(sc.X(h[0]), sc.Y(h[1] + 6), sc.L(9), 0, 7); c.stroke(); c.restore();
  return P;
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

/* ======================================================================
   1. TORQUE — the two routes to the same number

   His slides 3, 4, 8, 9 and 10.  The geometry is his: a vertical post with
   the axis O at its foot, and a force striking it a distance r up, at an
   angle theta to the horizontal — that is, to the perpendicular to the
   post.  Writing the angle that way reproduces his algebra symbol for
   symbol, d = r cos(theta) and F_perp = F cos(theta), rather than making
   the student translate.

   Both constructions are drawn and both products printed every frame:

       route A    M = F * (r cos theta)      resolve the distance
       route B    M = (F cos theta) * r      resolve the force

   The component along the post, F sin(theta), is drawn as well: its line
   runs through O, so it has no moment arm and no moment, and all it does
   is compress the post.
   ====================================================================== */

/* a torque printed the way a student should write it: enough figures to be
   honest, not so many that 195 looks like 194.9 for no reason */
function mfmt(v) {
  var a = Math.abs(v);
  return minus(a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2));
}

D.register('torque', function (node, d) {
  var port = D.portrait(), still = !!d.still;
  var u = build(node, {});
  var S = { th: 30, F: 75, r: 3.0 };
  var L = 3.4;                                  /* the post, metres */

  var W = still ? (port ? 420 : 430) : (port ? 460 : 1090);
  var Hh = still ? (port ? 430 : 450) : (port ? 580 : 432);
  var ax = new Axes(u.cv, { w: W, h: Hh, padl: 0, padr: 0, padt: 0, padb: 0, fluid: !still });
  var c = ax.c;

  function draw() {
    var K = C();
    ax.clear();
    var stack = port && !still;
    var split = still ? ax.W : (stack ? ax.H * 0.58 : ax.W * 0.44);
    var box = still ? { x: 4, y: 4, w: ax.W - 8, h: ax.H - 34 }
            : stack ? { x: 6, y: 4, w: ax.W - 12, h: split - 8 }
                    : { x: 4, y: 6, w: split - 10, h: ax.H - 12 };
    /* the world box is the drawn content and nothing more: a generous one
       shrinks the figure to a postage stamp in the middle of empty canvas */
    var s = new Scene(c, box).fit(-1.52, -0.28, 1.62, L + 0.42, 12);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    var th = S.th * Math.PI / 180;
    var r = S.r, F = S.F;
    var apx = 0, apy = r;                       /* point of application */
    var ux = Math.cos(th), uy = -Math.sin(th);  /* rightward, th below horizontal */
    var fx = F * ux, fy = F * uy;
    var dperp = r * Math.cos(th);
    var Fperp = F * Math.cos(th);               /* across the post */
    var Falong = F * Math.sin(th);              /* along it, towards O */
    var M = moment(0, 0, apx, apy, fx, fy);

    var scl = 0.0165;                           /* metres of picture per newton */

    /* --- the post ---------------------------------------------------- */
    c.save();
    c.strokeStyle = K.MUT; c.lineWidth = 10; c.lineCap = 'round';
    c.beginPath(); c.moveTo(s.X(0), s.Y(-0.12)); c.lineTo(s.X(0), s.Y(L)); c.stroke();
    c.restore();

    /* --- line of action, and the perpendicular from O ----------------- */
    loa(c, s, apx, apy, ux, uy, { len: Math.max(box.w, box.h), color: K.MUT });
    dropPerp(c, s, 0, 0, apx, apy, ux, uy,
             { color: K.ORG, label: 'd⊥ = ' + fmt(dperp, 2) + ' m', size: 13 });

    /* --- resolved components ------------------------------------------ */
    if (Math.abs(Fperp) > 1.5) {
      arrow(c, s.X(apx), s.Y(apy), s.X(apx + Fperp * scl), s.Y(apy),
            { color: K.BLUE, width: 2.3, head: 9, dash: [5, 4] });
      label(c, 'F⊥ ' + fmt(Fperp, 0) + ' N', s.X(apx + Fperp * scl / 2), s.Y(apy) - 13,
            { color: K.BLUE, size: 12, plate: true });
    }
    if (Math.abs(Falong) > 1.5) {
      arrow(c, s.X(apx), s.Y(apy), s.X(apx), s.Y(apy - Falong * scl),
            { color: K.GRN, width: 2.3, head: 9, dash: [5, 4] });
      label(c, 'F∥ ' + fmt(Math.abs(Falong), 1) + ' N', s.X(apx) + 20,
            s.Y(apy - Falong * scl) + 11, { color: K.GRN, size: 12, align: 'left', plate: true });
    }

    /* --- the force ---------------------------------------------------- */
    arrow(c, s.X(apx - ux * F * scl), s.Y(apy - uy * F * scl), s.X(apx), s.Y(apy),
          { color: K.ACC, width: 3.3, head: 13 });
    label(c, fmt(F, 0) + ' N', s.X(apx - ux * F * scl) - 7, s.Y(apy - uy * F * scl) - 11,
          { color: K.ACC, size: 13.5, align: 'right', plate: true });

    /* the horizontal that theta is measured from, and the arc */
    c.save();
    c.strokeStyle = K.GRID; c.lineWidth = 1.2; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(s.X(apx), s.Y(apy)); c.lineTo(s.X(apx) - 86, s.Y(apy)); c.stroke();
    c.strokeStyle = K.INK; c.setLineDash([]); c.lineWidth = 1.4; c.globalAlpha = .85;
    c.beginPath(); c.arc(s.X(apx), s.Y(apy), 30, Math.PI, Math.PI + th, th < 0); c.stroke();
    c.restore();
    label(c, fmt(Math.abs(S.th), 0) + '°', s.X(apx) - 44, s.Y(apy) + (th >= 0 ? 15 : -15),
          { size: 12.5, plate: true });

    /* --- the axis, and r ---------------------------------------------- */
    pin(c, s.X(0), s.Y(0), 7);
    label(c, 'O', s.X(0) + 15, s.Y(0) + 14, { size: 15 });
    if (Math.abs(M) > 1) spin(c, s.X(0), s.Y(0), 25, M > 0, { color: K.VIO });
    c.save();
    c.strokeStyle = K.MUT; c.lineWidth = 1.2; c.setLineDash([3, 3]); c.globalAlpha = .9;
    c.beginPath(); c.moveTo(s.X(0) + 30, s.Y(0)); c.lineTo(s.X(0) + 30, s.Y(r)); c.stroke();
    c.restore();
    label(c, 'r = ' + fmt(r, 2) + ' m', s.X(0) + 36, s.Y(r / 2),
          { size: 12.5, color: K.MUT, align: 'left', plate: true });

    c.restore();                       /* end diagram clip */

    if (still) {
      label(c, 'the moment arm is the perpendicular from the axis to the LINE,',
            ax.W / 2, ax.H - 22, { size: 12, color: K.MUT });
      label(c, 'not the distance to where the force happens to be applied',
            ax.W / 2, ax.H - 6, { size: 12, color: K.MUT });
      return;
    }

    /* --- the two routes ------------------------------------------------ */
    var px = stack ? 8 : split, pw = stack ? ax.W - 16 : ax.W - split - 8;
    var fs = still ? 12.5 : 14.5, lh = fs * 1.58;
    var nl = 9.6 + (Math.abs(Falong) > 1.5 ? 2 : 0);
    var ph = stack ? ax.H - split - 8 : Math.min(ax.H - 16, nl * lh + 26);
    var py = stack ? split + 2 : (ax.H - ph) / 2;
    c.save();
    c.fillStyle = K.PANEL; c.fillRect(px, py, pw, ph);
    c.strokeStyle = K.GRID; c.lineWidth = 1; c.strokeRect(px + .5, py + .5, pw - 1, ph - 1);
    c.restore();

    var y = py + 15;
    function line(txt, o) {
      o = o || {};
      label(c, txt, px + 12, y, { align: 'left', size: o.size || fs,
                                  color: o.color || K.INK, weight: o.weight || 600 });
      y += (o.gap || lh);
    }
    line('A — resolve the distance', { color: K.ORG, weight: 700 });
    line('d⊥ = r cos θ = ' + fmt(r, 2) + ' × ' + fmt(Math.cos(th), 3) + ' = ' + fmt(dperp, 3) + ' m');
    line('M = F · d⊥ = ' + fmt(F, 0) + ' × ' + fmt(dperp, 3) + ' = ' + mfmt(Math.abs(M)) + ' N·m',
         { gap: lh * 1.3 });
    line('B — resolve the force', { color: K.BLUE, weight: 700 });
    line('F⊥ = F cos θ = ' + fmt(F, 0) + ' × ' + fmt(Math.cos(th), 3) + ' = ' + fmt(Fperp, 1) + ' N');
    line('M = F⊥ · r = ' + fmt(Fperp, 1) + ' × ' + fmt(r, 2) + ' = ' + mfmt(Math.abs(M)) + ' N·m',
         { gap: lh * 1.25 });
    c.save();
    c.strokeStyle = K.GRID; c.lineWidth = 1;
    c.beginPath(); c.moveTo(px + 10, y - lh * 0.45); c.lineTo(px + pw - 10, y - lh * 0.45); c.stroke();
    c.restore();
    line('M₀ = ' + mfmt(M) + ' N·m', { color: K.VIO, weight: 700, size: fs + 1.5, gap: lh * 0.92 });
    line(Math.abs(M) < 1 ? 'the line runs through O — nothing turns'
         : M > 0 ? 'counter-clockwise, out of the page' : 'clockwise, into the page',
         { color: K.VIO, size: fs - 1.5, weight: 600 });
    if (Math.abs(Falong) > 1.5) {
      line('F∥ = ' + fmt(Math.abs(Falong), 1) + ' N runs through O.', { color: K.MUT, size: fs - 1.5 });
      line('No moment arm, no moment — it only compresses.', { color: K.MUT, size: fs - 1.5 });
    }
  }

  if (!still) {
    u.ctl.className = 'ictls g2';
    var sA = slider(u.ctl, 'Angle θ from the&nbsp;perpendicular', -80, 80, 1, S.th,
                    function (v) { return fmt(v, 0) + '°'; },
                    function (v) { S.th = v; draw(); });
    var sF = slider(u.ctl, 'Force F', 10, 150, 1, S.F,
                    function (v) { return fmt(v, 0) + ' N'; },
                    function (v) { S.F = v; draw(); });
    var sR = slider(u.ctl, 'Distance r', 0.4, 3.4, 0.05, S.r,
                    function (v) { return fmt(v, 2) + ' m'; },
                    function (v) { S.r = v; draw(); });
    sA.quiet(S.th); sF.quiet(S.F); sR.quiet(S.r);
    var rd = readout(u.ctl);
    rd.innerHTML = 'As set up, this is his worked example: <b>75 N</b> striking a post <b>3 m</b> ' +
      'above the axis at <b>30°</b> to the perpendicular, giving <b>195 N·m clockwise</b> by either ' +
      'route. Push θ to <b>±80°</b> and the force nearly runs along the post, through O: the moment ' +
      'arm all but disappears and a large force achieves almost nothing.';
  }

  node._draw = draw;
  draw();
});


/* ======================================================================
   1b. EX — the worked examples as still free body diagrams

   Five steps, one function.  Nothing is interactive: the point is that the
   diagram and the arithmetic in the column beside it come from the same
   numbers, so they cannot drift apart.
   ====================================================================== */
D.register('ex', function (node, d) {
  var port = D.portrait(), step = d.step || '1a';
  var u = build(node, {});
  var bar = step.charAt(0) === '1';
  var ax = new Axes(u.cv, bar ? { w: port ? 330 : 350, h: port ? 400 : 352,
                                  padl: 0, padr: 0, padt: 0, padb: 0, fluid: false }
                              : { w: port ? 440 : 580, h: port ? 300 : 300,
                                  padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var c = ax.c;

  function drawBar() {
    var K = C();
    /* 75 N striking a 3 m post 30 degrees below the horizontal */
    var F = 75, r = 3, th = 30 * Math.PI / 180;
    var ux = Math.cos(th), uy = -Math.sin(th);
    var dperp = r * Math.cos(th), Fperp = F * Math.cos(th), Falong = F * Math.sin(th);
    var M = moment(0, 0, 0, r, F * ux, F * uy);
    var s = new Scene(c, { x: 6, y: 20, w: ax.W - 12, h: ax.H - 56 })
              .fit(-1.28, -0.18, 1.52, 3.78, 12);
    var scl = 0.0165;

    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 10; c.lineCap = 'round';
    c.beginPath(); c.moveTo(s.X(0), s.Y(-0.12)); c.lineTo(s.X(0), s.Y(3.4)); c.stroke(); c.restore();
    loa(c, s, 0, r, ux, uy, { len: 460, color: K.MUT });

    if (step === '1a' || step === '1c') {
      dropPerp(c, s, 0, 0, 0, r, ux, uy,
               { color: K.ORG, label: step === '1a' ? 'd⊥ = 2.6 m' : '2.6 m', size: 13 });
    }
    if (step === '1b') {
      arrow(c, s.X(0), s.Y(r), s.X(Fperp * scl), s.Y(r),
            { color: K.BLUE, width: 2.5, head: 10, dash: [5, 4] });
      label(c, 'F⊥ = 65 N', s.X(Fperp * scl / 2), s.Y(r) - 14,
            { color: K.BLUE, size: 13, plate: true });
      arrow(c, s.X(0), s.Y(r), s.X(0), s.Y(r - Falong * scl),
            { color: K.GRN, width: 2.5, head: 10, dash: [5, 4] });
      label(c, 'F∥ = 37.5 N', s.X(0) - 10, s.Y(r - Falong * scl / 2),
            { color: K.GRN, size: 12.5, align: 'right', plate: true });
      c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 1.3; c.setLineDash([3, 3]);
      c.beginPath(); c.moveTo(s.X(0) + 26, s.Y(0)); c.lineTo(s.X(0) + 26, s.Y(r)); c.stroke();
      c.restore();
      label(c, 'r = 3 m', s.X(0) + 32, s.Y(r / 2),
            { color: K.BLUE, size: 12.5, align: 'left', plate: true });
    }
    if (step === '1c') {
      spin(c, s.X(0), s.Y(0), 29, false, { color: K.VIO, width: 3 });
      label(c, 'M₀ = −195 N·m', ax.W / 2, ax.H - 30,
            { color: K.VIO, size: 16, weight: 700 });
      label(c, 'clockwise → into the page', ax.W / 2, ax.H - 12,
            { color: K.VIO, size: 12 });
    } else {
      label(c, 'M₀ = ' + fmt(Math.abs(M), 0) + ' N·m', ax.W / 2, ax.H - 20,
            { color: step === '1a' ? K.ORG : K.BLUE, size: 16, weight: 700 });
    }

    arrow(c, s.X(-ux * F * scl), s.Y(r - uy * F * scl), s.X(0), s.Y(r),
          { color: K.ACC, width: 3.4, head: 13 });
    label(c, '75 N', s.X(-ux * F * scl) - 7, s.Y(r - uy * F * scl) - 12,
          { color: K.ACC, size: 14, align: 'right', plate: true });
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1.2; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(s.X(0), s.Y(r)); c.lineTo(s.X(0) - 92, s.Y(r)); c.stroke();
    c.strokeStyle = K.INK; c.setLineDash([]); c.lineWidth = 1.4;
    c.beginPath(); c.arc(s.X(0), s.Y(r), 32, Math.PI, Math.PI + th); c.stroke(); c.restore();
    label(c, '30°', s.X(0) - 54, s.Y(r) + 16, { size: 12.5, plate: true });

    pin(c, s.X(0), s.Y(0), 7);
    label(c, 'point O', s.X(0) + 14, s.Y(0) + 15, { size: 13, align: 'left', color: K.MUT });
  }

  function drawElbow() {
    var K = C();
    /* 780 N, inserting 0.03 m from the axis, 55 degrees to the forearm */
    var F = 780, r = 0.03, th = 55 * Math.PI / 180;
    var dperp = r * Math.sin(th), M = F * dperp;
    var ux = Math.cos(th), uy = Math.sin(th);
    var s = new Scene(c, { x: 6, y: 6, w: ax.W - 12, h: ax.H - 30 })
              .fit(-0.048, -0.040, 0.168, 0.066, 12);
    var scl = 0.000072;

    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 10; c.lineCap = 'round';
    c.beginPath(); c.moveTo(s.X(0), s.Y(0)); c.lineTo(s.X(0.158), s.Y(0)); c.stroke();
    c.strokeStyle = K.GRID; c.lineWidth = 9;
    c.beginPath(); c.moveTo(s.X(0), s.Y(0)); c.lineTo(s.X(-0.038), s.Y(0.060)); c.stroke();
    c.restore();

    loa(c, s, r, 0, ux, uy, { len: 440, color: K.MUT });
    var dp = dropPerp(c, s, 0, 0, r, 0, ux, uy, { color: K.ORG });
    label(c, step === '2a' ? 'd⊥ = 0.0246 m' : 'd⊥', s.X(r * 0.52) - 4, s.Y(dperp * 0.62) - 12,
          { color: K.ORG, size: 12.5, align: 'right', plate: true });

    if (step === '2b') {
      spin(c, s.X(0), s.Y(0) - 2, 20, true, { color: K.VIO, width: 3 });
      label(c, 'M = +19.17 N·m', ax.W / 2, ax.H - 30, { color: K.VIO, size: 16, weight: 700 });
      label(c, 'check: 780 sin 55° = 639 N, × 0.03 m = 19.17 N·m', ax.W / 2, ax.H - 11,
            { color: K.MUT, size: 11.5 });
    } else {
      label(c, 'd⊥ = r sin 55° = 0.03 × 0.819 = 0.0246 m', ax.W / 2, ax.H - 18,
            { color: K.ORG, size: 14, weight: 700 });
    }

    arrow(c, s.X(r), s.Y(0), s.X(r + ux * F * scl), s.Y(uy * F * scl),
          { color: K.ACC, width: 3.4, head: 13 });
    label(c, '780 N', s.X(r + ux * F * scl) + 8, s.Y(uy * F * scl) - 11,
          { color: K.ACC, size: 14, align: 'left', plate: true });
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.4; c.globalAlpha = .85;
    c.beginPath(); c.arc(s.X(r), s.Y(0), 25, 0, -th, true); c.stroke(); c.restore();
    label(c, '55°', s.X(r) + 37 * Math.cos(th / 2), s.Y(0) - 37 * Math.sin(th / 2),
          { size: 12.5, plate: true });

    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 1.2; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(s.X(0), s.Y(0) + 33); c.lineTo(s.X(r), s.Y(0) + 33); c.stroke();
    c.beginPath(); c.moveTo(s.X(0), s.Y(0) + 28); c.lineTo(s.X(0), s.Y(0) + 38); c.stroke();
    c.beginPath(); c.moveTo(s.X(r), s.Y(0) + 28); c.lineTo(s.X(r), s.Y(0) + 38); c.stroke();
    c.restore();
    label(c, 'r = 0.03 m', s.X(r / 2) + 30, s.Y(0) + 33, { size: 11.5, color: K.MUT, align: 'left' });

    pin(c, s.X(0), s.Y(0), 7);
    label(c, 'elbow axis', s.X(0) - 14, s.Y(0) + 22, { size: 12.5, align: 'right', color: K.MUT });
    arrow(c, s.X(0.150), s.Y(0), s.X(0.150), s.Y(-0.030),
          { color: K.BLUE, width: 2.2, head: 9 });
    label(c, 'load', s.X(0.150) + 8, s.Y(-0.020), { size: 12, color: K.BLUE, align: 'left' });
  }

  function draw() { ax.clear(); if (bar) drawBar(); else drawElbow(); }
  node._draw = draw;
  draw();
});

/* ======================================================================
   2. RHR — the right-hand rule, both senses side by side

   His slide 6.  Two copies of the same bar with the force reversed, so the
   only difference on screen is the one that changes the sign.
   ====================================================================== */
D.register('rhr', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var ax = new Axes(u.cv, { w: port ? 440 : 560, h: port ? 330 : 300,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var c = ax.c;

  function panel(x0, w, ccw) {
    var K = C();
    var s = new Scene(c, { x: x0, y: 26, w: w, h: ax.H - 78 })
              .fit(-1.35, -1.15, 1.35, 1.35, 10);
    /* the bar, pivoted at the centre */
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(s.X(-1.1), s.Y(0)); c.lineTo(s.X(1.1), s.Y(0)); c.stroke();
    c.restore();
    var fx = 1.0, fy = ccw ? 0.78 : -0.78;
    arrow(c, s.X(fx), s.Y(0), s.X(fx), s.Y(fy), { color: K.ACC, width: 3.2, head: 12 });
    label(c, 'F', s.X(fx) + 11, s.Y(fy * 0.6), { color: K.ACC, size: 15, align: 'left' });
    spin(c, s.X(0), s.Y(0), 30, ccw, { color: K.VIO, width: 2.8 });
    pin(c, s.X(0), s.Y(0), 7);

    /* the torque vector, seen end-on */
    var vx = s.X(-0.74), vy = s.Y(0.86), R = 13;
    c.save();
    c.strokeStyle = K.VIO; c.lineWidth = 2.2; c.fillStyle = K.VIO;
    c.beginPath(); c.arc(vx, vy, R, 0, 7); c.stroke();
    if (ccw) { c.beginPath(); c.arc(vx, vy, 4, 0, 7); c.fill(); }
    else {
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(vx - 8, vy - 8); c.lineTo(vx + 8, vy + 8);
      c.moveTo(vx + 8, vy - 8); c.lineTo(vx - 8, vy + 8); c.stroke();
    }
    c.restore();
    label(c, ccw ? 'out of the page' : 'into the page', vx + R + 7, vy,
          { size: 12, align: 'left', color: K.VIO });

    label(c, ccw ? 'Counter-clockwise' : 'Clockwise', x0 + w / 2, 15,
          { size: 14.5, weight: 700, color: K.INK });
    label(c, ccw ? 'M is POSITIVE' : 'M is NEGATIVE', x0 + w / 2, ax.H - 32,
          { size: 15, weight: 700, color: ccw ? K.GRN : K.ACC });
    label(c, 'thumb ' + (ccw ? 'towards you' : 'away from you'), x0 + w / 2, ax.H - 13,
          { size: 11.5, color: K.MUT });
  }

  function draw() {
    var K = C();
    ax.clear();
    var half = ax.W / 2;
    panel(4, half - 10, true);
    panel(half + 6, half - 10, false);
    c.save();
    c.strokeStyle = K.GRID; c.lineWidth = 1;
    c.beginPath(); c.moveTo(half, 18); c.lineTo(half, ax.H - 42); c.stroke();
    c.restore();
  }
  node._draw = draw;
  draw();
});


/* ======================================================================
   3. EXTINT — the external moment and the internal moment that answers it

   His slide 17, and the idea the rest of the lecture leans on.  Drawn at a
   real instant of the measured stride (loading response), so the geometry
   is not an artist's impression: the vector, the joint centres and the
   moment arm are the recorded ones, and the moment printed is computed
   from them.
   ====================================================================== */
D.register('extint', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var ax = new Axes(u.cv, { w: port ? 440 : 490, h: port ? 440 : 406,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var c = ax.c;
  var s0 = KIN ? KIN.subs[0] : null;

  function draw() {
    var K = C();
    ax.clear();
    if (!s0) { label(c, 'measured stride unavailable', ax.W / 2, ax.H / 2, { color: K.MUT }); return; }
    var i = gidx(s0, 10);                        /* loading response */
    var f = i / s0.ghz * s0.kinfs;
    var hip = jat(s0, i, 'hipR'), knee = jat(s0, i, 'kneeR'), ank = jat(s0, i, 'ankR');
    var xs = [hip[0], knee[0], ank[0], s0.cx[i]], ys = [0, hip[1] + 18];
    var x0 = Math.min.apply(null, xs) - 26, x1 = Math.max.apply(null, xs) + 26;
    var sc = new Scene(c, { x: 4, y: 20, w: ax.W - 8, h: ax.H - 76 })
               .fit(x0, -4, x1, hip[1] + 14, 8);

    /* leg only: thigh, shank, foot */
    c.save();
    c.strokeStyle = K.INK; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
    var heel = jat(s0, i, 'heelR'), toe = jat(s0, i, 'toeR');
    [[hip, knee], [knee, ank], [ank, heel], [ank, toe], [heel, toe]].forEach(function (e) {
      c.beginPath(); c.moveTo(sc.X(e[0][0]), sc.Y(e[0][1])); c.lineTo(sc.X(e[1][0]), sc.Y(e[1][1])); c.stroke();
    });
    /* the ground */
    c.strokeStyle = K.MUT; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sc.X(x0), sc.Y(0)); c.lineTo(sc.X(x1), sc.Y(0)); c.stroke();
    c.restore();

    /* the measured force, and its line */
    var F = Math.hypot(s0.fx[i], s0.fy[i]), fsc = 26 / (s0.mass_kg * 9.81);
    loa(c, sc, s0.cx[i], s0.cy[i], s0.fx[i], s0.fy[i], { len: ax.H, color: K.MUT });
    arrow(c, sc.X(s0.cx[i]), sc.Y(s0.cy[i]),
          sc.X(s0.cx[i] + s0.fx[i] * fsc), sc.Y(s0.cy[i] + s0.fy[i] * fsc),
          { color: K.ACC, width: 3.4, head: 12 });
    label(c, 'GRF ' + fmt(F, 0) + ' N', sc.X(s0.cx[i]) - 14, sc.Y(s0.cy[i] + 12),
          { color: K.ACC, size: 12.5, align: 'right', plate: true });

    /* the knee: moment arm, and the two senses */
    var arm = grfArm(s0, i, 'knee');
    dropPerp(c, sc, knee[0], knee[1], s0.cx[i], s0.cy[i], s0.fx[i], s0.fy[i], { color: K.ORG });
    label(c, 'd⊥ ' + fmt(Math.abs(arm), 1) + ' cm', sc.X(knee[0]) - 18, sc.Y(knee[1]) - 30,
          { color: K.ORG, size: 12, align: 'right', plate: true });
    pin(c, sc.X(knee[0]), sc.Y(knee[1]), 6);
    pin(c, sc.X(hip[0]), sc.Y(hip[1]), 6);
    pin(c, sc.X(ank[0]), sc.Y(ank[1]), 6);

    var Mint = grfMoment(s0, i, 'knee');          /* internal, extensor positive */
    var kx = sc.X(knee[0]), ky = sc.Y(knee[1]);
    spin(c, kx - 52, ky - 6, 18, Mint > 0, { color: K.BLUE, width: 2.8 });
    spin(c, kx + 52, ky - 6, 18, Mint < 0, { color: K.ACC, width: 2.8 });
    label(c, 'internal', kx - 52, ky + 20, { color: K.BLUE, size: 11.5, plate: true });
    label(c, 'external', kx + 52, ky + 20, { color: K.ACC, size: 11.5, plate: true });

    label(c, 'Loading response, ' + s0.subject + ' — measured', ax.W / 2, 12,
          { size: 12.5, color: K.MUT });

    /* the sentence, spelled out */
    var y = ax.H - 62;
    label(c, 'the line passes ' + fmt(Math.abs(arm), 1) + ' cm ' +
             (arm > 0 ? 'in front of' : 'behind') + ' the knee, so the ground makes an',
          ax.W / 2, y, { size: 12, color: K.MUT });
    label(c, 'EXTERNAL ' + (Mint > 0 ? 'FLEXOR' : 'EXTENSOR') + ' moment',
          ax.W / 2, y + 17, { size: 13.5, color: K.ACC, weight: 700 });
    label(c, 'and the ' + (Mint > 0 ? 'quadriceps' : 'hamstrings') + ' answer with an',
          ax.W / 2, y + 36, { size: 12, color: K.MUT });
    label(c, 'INTERNAL ' + (Mint > 0 ? 'EXTENSOR' : 'FLEXOR') + ' moment of ' +
             fmt(Math.abs(Mint), 2) + ' N·m/kg',
          ax.W / 2, y + 53, { size: 13, color: K.BLUE, weight: 700 });
  }
  node._draw = draw;
  draw();
});


/* ======================================================================
   4. SIGNS — what a moment graph's sign is telling you

   His slide 20.  His own figure is a drawn S-curve with no data behind it;
   this is the measured knee moment from the same stride used everywhere
   else in the lecture, with the two sides of zero named.
   ====================================================================== */
D.register('signs', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var ax = new Axes(u.cv, { w: port ? 440 : 540, h: port ? 360 : 312,
                            padl: 58, padr: 14, padt: 20, padb: 66, fluid: false });
  var c = ax.c;
  var s0 = KIN ? KIN.subs[0] : null;

  function draw() {
    var K = C();
    ax.clear();
    if (!s0) { label(c, 'measured stride unavailable', ax.W / 2, ax.H / 2, { color: K.MUT }); return; }
    var m = s0.mom.knee;
    ax.setRange(0, 100, -0.45, 0.65);
    /* stance shading, so "which part of the step" is readable off the axis */
    ax.rect(0, -0.45, s0.stance_pc, 0.65, { fill: K.FILL0 });
    ax.frame({ grid: true, zero: true,
               xticks: [0, 20, 40, 60, 80, 100],
               yticks: [-0.4, -0.2, 0, 0.2, 0.4, 0.6],
               yfmt: function (v) { return minus(v.toFixed(1)); },
               xlabel: 'Gait cycle (%)', ylabel: 'Internal knee moment (N·m/kg)', ysize: 13.5 });

    var pts = m.map(function (v, k) { return [k, v]; });
    /* fill each side of zero in its own colour */
    function band(sign, col) {
      c.save(); c.fillStyle = col; c.globalAlpha = .3; c.beginPath();
      c.moveTo(ax.X(0), ax.Y(0));
      m.forEach(function (v, k) { c.lineTo(ax.X(k), ax.Y(sign > 0 ? Math.max(0, v) : Math.min(0, v))); });
      c.lineTo(ax.X(100), ax.Y(0)); c.closePath(); c.fill(); c.restore();
    }
    band(1, K.BLUE); band(-1, K.ACC);
    ax.poly(pts, { color: K.INK, width: 2.6 });

    label(c, 'positive — EXTENSOR', ax.X(30), ax.Y(0.50), { color: K.BLUE, size: 12.5, align: 'left' });
    label(c, 'the quadriceps are working', ax.X(30), ax.Y(0.50) + 15,
          { color: K.BLUE, size: 11, align: 'left', weight: 600 });
    label(c, 'negative — FLEXOR', ax.X(30), ax.Y(-0.29), { color: K.ACC, size: 12.5, align: 'left' });
    label(c, 'the flexors are working', ax.X(30), ax.Y(-0.29) + 15,
          { color: K.ACC, size: 11, align: 'left', weight: 600 });
    label(c, 'stance', ax.X(s0.stance_pc / 2), ax.Y(0.62), { color: K.MUT, size: 11.5 });
    label(c, 'swing', ax.X((100 + s0.stance_pc) / 2), ax.Y(0.62), { color: K.MUT, size: 11.5 });

    label(c, 'Measured · ' + s0.subject + ' · divided by body mass, so a 55 kg and a 90 kg',
          ax.W / 2, ax.H - 30, { size: 11, color: K.MUT });
    label(c, 'subject can be plotted on one axis. Peak here is ' +
             fmt(Math.max.apply(null, m), 2) + ' N·m/kg = ' +
             fmt(Math.max.apply(null, m) * s0.mass_kg, 0) + ' N·m.',
          ax.W / 2, ax.H - 15, { size: 11, color: K.MUT });
  }
  node._draw = draw;
  draw();
});

/* ======================================================================
   5. LEVER — adding torques about one axis

   His slides 2 and 7.  A plank on a fulcrum with a weight either side.
   The plank tilts in proportion to the net moment, so balance is something
   you can see as well as read, and the pin force is printed underneath to
   make the point that balancing the moments does nothing whatever to
   relieve the joint.
   ====================================================================== */
D.register('lever', function (node, d) {
  var port = D.portrait(), still = !!d.still;
  var u = build(node, {});
  var S = { d1: 1.8, d2: 1.2, W2: 600 };
  var W1 = 400;                                  /* N, the left-hand weight */
  var L = 2.3;                                   /* half-plank, metres */

  var ax = new Axes(u.cv, { w: still ? (port ? 440 : 560) : (port ? 460 : 820),
                            h: still ? (port ? 330 : 340) : (port ? 470 : 400),
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: !still });
  var c = ax.c;

  function draw() {
    var K = C();
    ax.clear();
    var M1 = W1 * S.d1, M2 = -S.W2 * S.d2, net = M1 + M2;
    var tilt = Math.max(-0.16, Math.min(0.16, net / 2600));   /* radians, for show */
    var ct = Math.cos(tilt), st = Math.sin(tilt);

    var s = new Scene(c, { x: 4, y: 16, w: ax.W - 8, h: ax.H - (still ? 78 : 92) })
              .fit(-L - 0.35, -0.72, L + 0.35, 1.05, 8);

    function on(x) { return [x * ct, x * st]; }   /* a point on the tilted plank */

    /* fulcrum */
    c.save();
    c.fillStyle = K.MUT;
    c.beginPath();
    c.moveTo(s.X(0), s.Y(0)); c.lineTo(s.X(-0.32), s.Y(-0.62)); c.lineTo(s.X(0.32), s.Y(-0.62));
    c.closePath(); c.fill();
    c.strokeStyle = K.MUT; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(s.X(-0.55), s.Y(-0.64)); c.lineTo(s.X(0.55), s.Y(-0.64)); c.stroke();
    /* plank */
    var a = on(-L), b = on(L);
    c.strokeStyle = K.INK; c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath(); c.moveTo(s.X(a[0]), s.Y(a[1])); c.lineTo(s.X(b[0]), s.Y(b[1])); c.stroke();
    c.restore();

    function weight(x, W, col, nm) {
      /* the load arrives from above and lands on the plank, so the arrow's
         length is the weight and the space above the plank is used */
      var p = on(x), sc = 0.00105, top = p[1] + 0.07 + W * sc;
      arrow(c, s.X(p[0]), s.Y(top), s.X(p[0]), s.Y(p[1] + 0.07),
            { color: col, width: 3.2, head: 11 });
      label(c, nm + ' = ' + fmt(W, 0) + ' N', s.X(p[0]), s.Y(top) - 12,
            { color: col, size: 13, plate: true });
      /* the moment arm, measured horizontally from the axis */
      c.save();
      c.strokeStyle = col; c.lineWidth = 1.4; c.setLineDash([4, 3]); c.globalAlpha = .9;
      var yr = x < 0 ? -0.26 : -0.44;
      c.beginPath(); c.moveTo(s.X(0), s.Y(yr)); c.lineTo(s.X(p[0]), s.Y(yr)); c.stroke();
      c.beginPath(); c.moveTo(s.X(p[0]), s.Y(yr + 0.05)); c.lineTo(s.X(p[0]), s.Y(yr - 0.05)); c.stroke();
      c.restore();
      label(c, fmt(Math.abs(x), 2) + ' m', s.X(p[0] / 2), s.Y(yr) + 14,
            { color: col, size: 12, plate: true });
    }
    weight(-S.d1, W1, K.BLUE, 'W₁');
    weight(S.d2, S.W2, K.ORG, 'W₂');
    pin(c, s.X(0), s.Y(0), 7);

    /* the numbers */
    var bal = Math.abs(net) < 12;
    var y = ax.H - (still ? 58 : 70), fs = still ? 13 : 15;
    label(c, 'M₁ = +' + fmt(M1, 0) + ' N·m', ax.W * 0.21, y, { color: K.BLUE, size: fs, weight: 700 });
    label(c, 'M₂ = ' + mfmt(M2) + ' N·m', ax.W * 0.5, y, { color: K.ORG, size: fs, weight: 700 });
    label(c, 'ΣM = ' + mfmt(net) + ' N·m', ax.W * 0.79, y,
          { color: bal ? K.GRN : K.VIO, size: fs, weight: 700 });
    label(c, bal ? 'balanced — no tendency to rotate'
                 : (net > 0 ? 'turns counter-clockwise' : 'turns clockwise'),
          ax.W / 2, y + 21, { color: bal ? K.GRN : K.VIO, size: fs - 2 });
    label(c, 'The pin carries W₁ + W₂ = ' + fmt(W1 + S.W2, 0) +
             ' N whether it balances or not.',
          ax.W / 2, y + 41, { color: K.MUT, size: fs - 2.5 });
  }

  if (!still) {
    u.ctl.className = 'ictls g2';
    var s1 = slider(u.ctl, 'W₁ at', 0.2, 2.3, 0.05, S.d1,
                    function (v) { return fmt(v, 2) + ' m'; },
                    function (v) { S.d1 = v; draw(); });
    var s2 = slider(u.ctl, 'W₂ at', 0.2, 2.3, 0.05, S.d2,
                    function (v) { return fmt(v, 2) + ' m'; },
                    function (v) { S.d2 = v; draw(); });
    var s3 = slider(u.ctl, 'W₂ weight', 100, 1200, 10, S.W2,
                    function (v) { return fmt(v, 0) + ' N'; },
                    function (v) { S.W2 = v; draw(); });
    s1.quiet(S.d1); s2.quiet(S.d2); s3.quiet(S.W2);
    var rd = readout(u.ctl);
    rd.innerHTML = 'W₁ is fixed at <b>400 N</b>. Balance is <b>W₁d₁ = W₂d₂</b> — a product, ' +
      'so halving a distance exactly doubles the weight it takes. Find a balance with very ' +
      'unequal weights and read the distance ratio: that is the lever’s mechanical advantage, ' +
      'and the same number turns up as a muscle’s effective mechanical advantage later on.';
  }

  node._draw = draw;
  draw();
});

/* ======================================================================
   6. ELBOW — the biceps through the range

   His slides 5, 11, 12, 13 and 14, made continuous.

   The model is deliberately the simplest one that shows the effect: the
   tendon is a straight line from a point on the humerus to its insertion
   r = 3 cm from the elbow axis, so the moment arm is r sin(theta) where
   theta is the angle between tendon and forearm.  That is exactly the
   geometry his figure draws.

   Its one real failure is stated on the figure rather than hidden: a
   straight line sends the moment arm to zero at full extension, whereas a
   real biceps tendon is held off the joint by the radial tuberosity and
   keeps about 1.5 to 2 cm there.  The shape of the curve is right from
   about 20 degrees of flexion upwards; treat the ends as the model, not
   the man.
   ====================================================================== */
D.register('elbow', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { phi: 90, F: 780, load: 0 };
  var R_INS = 0.03;              /* insertion, metres from the axis */
  var A_ORG = 0.30;              /* effective origin, metres up the humerus */
  var R_HAND = 0.32;             /* hand, metres from the axis */

  var ax = new Axes(u.cv, { w: port ? 460 : 1070, h: port ? 580 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* ---- the geometry, in one place so figure and curve cannot disagree -- */
  function geom(phiDeg) {
    var p = phiDeg * Math.PI / 180;
    var ux = Math.sin(p), uy = -Math.cos(p);          /* along the forearm */
    var ins = [R_INS * ux, R_INS * uy];
    var org = [0, A_ORG];
    var tx = org[0] - ins[0], ty = org[1] - ins[1];
    var tm = Math.hypot(tx, ty);
    var cth = (tx * ux + ty * uy) / tm;
    var th = Math.acos(Math.max(-1, Math.min(1, cth)));
    var dperp = R_INS * Math.sin(th);
    return { p: p, ux: ux, uy: uy, ins: ins, org: org, tx: tx / tm, ty: ty / tm,
             th: th, d: dperp };
  }
  function torque(phiDeg) { return S.F * geom(phiDeg).d; }
  function loadArm(phiDeg) { return R_HAND * Math.abs(Math.sin(phiDeg * Math.PI / 180)); }
  function needed(phiDeg) {
    var g = geom(phiDeg);
    return g.d > 1e-4 ? S.load * loadArm(phiDeg) / g.d : Infinity;
  }

  function draw() {
    var K = C();
    ax.clear();
    var stack = port;
    var split = stack ? ax.H * 0.52 : ax.W * 0.47;
    var g = geom(S.phi);

    /* ------------------------- the arm ------------------------------- */
    var box = stack ? { x: 6, y: 2, w: ax.W - 12, h: split - 6 }
                    : { x: 2, y: 6, w: split - 8, h: ax.H - 26 };
    var s = new Scene(c, box).fit(-0.085, -0.355, 0.365, 0.355, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    /* humerus and forearm */
    c.save();
    c.strokeStyle = K.GRID; c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath(); c.moveTo(s.X(0), s.Y(0)); c.lineTo(s.X(0), s.Y(A_ORG + 0.02)); c.stroke();
    c.strokeStyle = K.MUT; c.lineWidth = 11;
    c.beginPath(); c.moveTo(s.X(0), s.Y(0));
    c.lineTo(s.X(R_HAND * g.ux), s.Y(R_HAND * g.uy)); c.stroke();
    c.restore();

    /* the tendon's line of action, and the muscle */
    loa(c, s, g.ins[0], g.ins[1], g.tx, g.ty, { len: Math.max(box.w, box.h), color: K.MUT });
    c.save();
    c.strokeStyle = K.ACC; c.lineWidth = 4.5; c.lineCap = 'round'; c.globalAlpha = .45;
    c.beginPath(); c.moveTo(s.X(g.org[0]), s.Y(g.org[1]));
    c.lineTo(s.X(g.ins[0]), s.Y(g.ins[1])); c.stroke(); c.restore();
    arrow(c, s.X(g.ins[0]), s.Y(g.ins[1]),
          s.X(g.ins[0] + g.tx * 0.11), s.Y(g.ins[1] + g.ty * 0.11),
          { color: K.ACC, width: 3.2, head: 12 });
    label(c, fmt(S.F, 0) + ' N', s.X(g.ins[0] + g.tx * 0.11) + 8,
          s.Y(g.ins[1] + g.ty * 0.11) - 10, { color: K.ACC, size: 13, align: 'left', plate: true });

    /* the moment arm */
    dropPerp(c, s, 0, 0, g.ins[0], g.ins[1], g.tx, g.ty, { color: K.ORG });
    label(c, 'd⊥ = ' + fmt(g.d * 100, 2) + ' cm',
          s.X(g.ins[0] * 0.5) - 6, s.Y(g.ins[1] * 0.5) - 16,
          { color: K.ORG, size: 12.5, align: 'right', plate: true });

    /* the load, if any */
    if (S.load > 0) {
      var hx = R_HAND * g.ux, hy = R_HAND * g.uy, lsc = 0.0013;
      arrow(c, s.X(hx), s.Y(hy), s.X(hx), s.Y(hy - S.load * lsc),
            { color: K.BLUE, width: 2.8, head: 10 });
      label(c, fmt(S.load, 0) + ' N', s.X(hx) + 8, s.Y(hy - S.load * lsc / 2),
            { color: K.BLUE, size: 12.5, align: 'left', plate: true });
      c.save();
      c.strokeStyle = K.BLUE; c.lineWidth = 1.3; c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(s.X(0), s.Y(hy)); c.lineTo(s.X(hx), s.Y(hy)); c.stroke();
      c.restore();
      label(c, fmt(loadArm(S.phi) * 100, 1) + ' cm', s.X(hx / 2), s.Y(hy) - 12,
            { color: K.BLUE, size: 11.5, plate: true });
    }

    /* the angle at the insertion, and the joint */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.3; c.globalAlpha = .8;
    var a0 = Math.atan2(-g.uy, g.ux), a1 = Math.atan2(-g.ty, g.tx);
    c.beginPath(); c.arc(s.X(g.ins[0]), s.Y(g.ins[1]), 24, a0, a1, true); c.stroke();
    c.restore();
    label(c, 'θ ' + fmt(g.th * 180 / Math.PI, 0) + '°',
          s.X(g.ins[0]) + 36 * Math.cos((a0 + a1) / 2),
          s.Y(g.ins[1]) + 36 * Math.sin((a0 + a1) / 2), { size: 12, plate: true });
    pin(c, s.X(0), s.Y(0), 7);
    label(c, 'elbow', s.X(0) - 13, s.Y(0) + 15, { size: 12, align: 'right', color: K.MUT });
    label(c, fmt(S.phi, 0) + '° of flexion', box.x + box.w / 2, box.y + 14,
          { size: 13, color: K.MUT });
    c.restore();

    /* ------------------------ the curve ------------------------------ */
    var px = stack ? 0 : split, py = stack ? split : 0;
    var pw = stack ? ax.W : ax.W - split, ph = stack ? ax.H - split : ax.H;
    var a2 = sub(ax, px + 66, py + 22, ax.W - (px + pw) + 16, ax.H - (py + ph) + 92);
    var showF = S.load > 0;
    var ymax = showF ? 1600 : Math.max(26, S.F * R_INS * 1.12);
    a2.setRange(0, 150, 0, ymax);
    var yt = showF ? [0, 400, 800, 1200, 1600]
                   : axisTicks(0, ymax);
    a2.frame({ grid: true, xticks: [0, 30, 60, 90, 120, 150],
               yticks: yt,
               xlabel: 'Elbow flexion (°)',
               ylabel: showF ? 'Muscle force needed (N)' : 'Joint torque (N·m)',
               ysize: 14, ylabelx: px + 15 });

    var pts = [], i;
    for (i = 0; i <= 150; i += 1.5) pts.push([i, showF ? Math.min(needed(i), ymax * 1.4) : torque(i)]);
    a2.poly(pts, { color: showF ? K.BLUE : K.VIO, width: 2.8 });
    var here = showF ? needed(S.phi) : torque(S.phi);
    c.save();
    c.strokeStyle = K.MUT; c.lineWidth = 1.2; c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(a2.X(S.phi), a2.Y(0)); c.lineTo(a2.X(S.phi), a2.Y(Math.min(here, ymax)));
    c.stroke(); c.restore();
    a2.dots([[S.phi, Math.min(here, ymax)]], { color: showF ? K.BLUE : K.VIO, r: 5 });
    label(c, (showF ? fmt(Math.min(here, 99999), 0) + ' N' : fmt(here, 1) + ' N·m'),
          a2.X(S.phi) + (S.phi > 100 ? -10 : 10), a2.Y(Math.min(here, ymax)) - 14,
          { color: showF ? K.BLUE : K.VIO, size: 13.5, weight: 700,
            align: S.phi > 100 ? 'right' : 'left', plate: true });

    /* Axes.frame puts the x label at the very foot of the canvas, so the
       model note has to sit above it rather than share the line */
    label(c, 'Straight-line tendon model: d⊥ = r sin θ. A real biceps tendon is held off the joint by the',
          ax.W / 2, ax.H - 46, { size: 11.5, color: K.MUT });
    label(c, 'radial tuberosity and keeps 1.5–2 cm of moment arm even at full extension.',
          ax.W / 2, ax.H - 30, { size: 11.5, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sP = slider(u.ctl, 'Elbow flexion', 0, 150, 1, S.phi,
                  function (v) { return fmt(v, 0) + '°'; },
                  function (v) { S.phi = v; draw(); });
  var sF = slider(u.ctl, 'Muscle force', 100, 1200, 10, S.F,
                  function (v) { return fmt(v, 0) + ' N'; },
                  function (v) { S.F = v; draw(); });
  var sL = slider(u.ctl, 'Load in the hand', 0, 120, 5, S.load,
                  function (v) { return v > 0 ? fmt(v, 0) + ' N' : 'none'; },
                  function (v) { S.load = v; draw(); });
  sP.quiet(S.phi); sF.quiet(S.F); sL.quiet(S.load);
  var rd = readout(u.ctl);
  rd.innerHTML = 'With no load the right-hand panel is the <b>torque this muscle force can make</b> ' +
    'at each joint angle — the same 780 N doing very different work. Add a load and the panel ' +
    'switches to the <b>muscle force the load demands</b>: two moment arms are now changing at ' +
    'once, and their ratio is the effective mechanical advantage.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   7. GRFV — the measured force vector, and the moment it makes

   His slides 18, 21 and 22, with his diagrams replaced by the recording.

   Everything on the left panel is measured: the joint centres are markers
   at 60 Hz, the arrow is the force plate at 960 Hz drawn from the measured
   centre of pressure, and the moment arm is the perpendicular from the
   chosen joint centre onto that line, measured off the figure.  The number
   printed is F * d_perp, computed each frame, and the curve on the right
   is that same calculation swept through stance.

   The second trace is the authors' own inverse-dynamics result for the
   same trial.  Where the two agree, the ground is the whole story; where
   they part company, the limb's own weight and acceleration are the rest
   of it, and that difference is the argument for inverse dynamics.
   ====================================================================== */
D.register('grfv', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!KIN) { label(C(), '', 0, 0); return; }
  var S = { pc: 15, j: 'knee', sub: 0, ref: 1, play: 0 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1090, h: port ? 620 : 414,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;
  var JN = { ank: 'ankle', knee: 'knee', hip: 'hip' };
  var JM = { ank: 'ankR', knee: 'kneeR', hip: 'hipR' };
  var POS = { ank: ['plantarflexor', 'dorsiflexor'], knee: ['extensor', 'flexor'],
              hip: ['extensor', 'flexor'] };

  function S0() { return KIN.subs[S.sub]; }

  function draw() {
    var K = C(), s0 = S0();
    ax.clear();
    var stack = port;
    var split = stack ? ax.H * 0.50 : ax.W * 0.47;
    var i = gidx(s0, S.pc);
    var on = loaded(s0, i) && S.pc <= s0.stance_pc + 0.5;
    var f = Math.max(0, Math.min(s0.nf - 1, S.pc / 100 * (s0.nf - 1)));

    /* ----------------------- the figure ----------------------------- */
    var box = stack ? { x: 4, y: 2, w: ax.W - 8, h: split - 6 }
                    : { x: 2, y: 4, w: split - 10, h: ax.H - 10 };
    /* a fixed camera on the stance foot: the foot does not move during
       stance, so the body is seen to pass over it, which is the point */
    var sc = new Scene(c, box).fit(-55, -6, 150, 172, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    /* ground */
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sc.X(-25), sc.Y(0)); c.lineTo(sc.X(125), sc.Y(0)); c.stroke(); c.restore();
    var P = body(c, s0, sc, f, {});

    if (on) {
      var F = Math.hypot(s0.fx[i], s0.fy[i]);
      var fsc = 62 / (s0.mass_kg * 9.81);           /* cm of picture per newton */
      loa(c, sc, s0.cx[i], s0.cy[i], s0.fx[i], s0.fy[i],
          { len: Math.max(box.w, box.h), color: K.MUT });
      arrow(c, sc.X(s0.cx[i]), sc.Y(s0.cy[i]),
            sc.X(s0.cx[i] + s0.fx[i] * fsc), sc.Y(s0.cy[i] + s0.fy[i] * fsc),
            { color: K.ACC, width: 3.6, head: 13 });
      label(c, fmt(F, 0) + ' N  (' + fmt(F / (s0.mass_kg * 9.81), 2) + ' BW)',
            sc.X(s0.cx[i] + s0.fx[i] * fsc) - 10, sc.Y(s0.cy[i] + s0.fy[i] * fsc) - 12,
            { color: K.ACC, size: 13, align: 'right', plate: true });
      /* the centre of pressure */
      c.save(); c.fillStyle = K.ACC;
      c.beginPath(); c.arc(sc.X(s0.cx[i]), sc.Y(s0.cy[i]), 4, 0, 7); c.fill(); c.restore();
      label(c, 'CoP', sc.X(s0.cx[i]), sc.Y(s0.cy[i]) + 14, { color: K.ACC, size: 11 });

      /* the perpendicular to the chosen joint */
      var jp = jat(s0, i, JM[S.j]);
      var arm = grfArm(s0, i, S.j);
      dropPerp(c, sc, jp[0], jp[1], s0.cx[i], s0.cy[i], s0.fx[i], s0.fy[i], { color: K.ORG });
      label(c, 'd⊥ = ' + fmt(Math.abs(arm), 1) + ' cm',
            (sc.X(jp[0]) + sc.X(s0.cx[i])) / 2 + 10, (sc.Y(jp[1]) + sc.Y(s0.cy[i])) / 2,
            { color: K.ORG, size: 12.5, align: 'left', plate: true });
    } else {
      label(c, 'swing — the foot is off the ground,', box.x + box.w / 2, box.y + 22,
            { color: K.MUT, size: 13 });
      label(c, 'so the ground makes no moment at all', box.x + box.w / 2, box.y + 40,
            { color: K.MUT, size: 13 });
    }
    /* the three joint centres, the chosen one picked out */
    ['hip', 'knee', 'ank'].forEach(function (k) {
      var p = jpos(s0, Math.round(f), JM[k]);
      pin(c, sc.X(p[0]), sc.Y(p[1]), k === S.j ? 7 : 4.5,
          { color: k === S.j ? K.ORG : K.MUT });
    });
    c.restore();

    /* ----------------------- the curve ------------------------------ */
    var px = stack ? 0 : split, py = stack ? split : 0;
    var pw = stack ? ax.W : ax.W - split, ph = stack ? ax.H - split : ax.H;
    /* Axes.frame drops the x label at the very foot of the canvas, so the
       plot has to stop well short of it and the sentences go in between */
    var a2 = sub(ax, px + 66, py + 24, ax.W - (px + pw) + 16, ax.H - (py + ph) + 124);
    var ref = s0.mom[S.j];
    var est = [], k;
    for (k = 0; k <= 100; k++) {
      var ii = gidx(s0, k);
      est.push([k, (loaded(s0, ii) && k <= s0.stance_pc) ? grfMoment(s0, ii, S.j) : 0]);
    }
    var lo = -0.5, hi = 0.8;
    [ref.map(function (v, q) { return [q, v]; }), est].forEach(function (a) {
      a.forEach(function (p) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
    });
    lo = Math.floor(lo * 2) / 2 - 0.1; hi = Math.ceil(hi * 2) / 2 + 0.1;
    a2.setRange(0, 100, lo, hi);
    a2.rect(0, lo, s0.stance_pc, hi, { fill: K.FILL0 });
    a2.frame({ grid: true, zero: true, xticks: [0, 20, 40, 60, 80, 100],
               yticks: axisTicks(lo, hi),
               yfmt: function (v) { return minus(v.toFixed(1)); },
               /* no xlabel: Axes.frame puts it at the very foot of the
                  canvas, where the sentences below need the room */
               ylabel: 'Internal ' + JN[S.j] + ' moment (N·m/kg)', ysize: 13.5,
               ylabelx: px + 15 });
    label(c, 'Gait cycle (%)', (a2.pl + ax.W - a2.pr) / 2, ax.H - a2.pb + 30,
          { size: 15, weight: 700, color: K.INK });
    if (S.ref) a2.poly(ref.map(function (v, q) { return [q, v]; }), { color: K.INK, width: 2.6 });
    a2.poly(est, { color: K.ORG, width: 2.4, dash: [6, 4] });

    var here = on ? grfMoment(s0, i, S.j) : 0;
    c.save(); c.strokeStyle = K.VIO; c.lineWidth = 1.8; c.globalAlpha = .85;
    c.beginPath(); c.moveTo(a2.X(S.pc), a2.Y(lo)); c.lineTo(a2.X(S.pc), a2.Y(hi)); c.stroke();
    c.restore();
    a2.dots([[S.pc, here]], { color: K.ORG, r: 5 });
    if (S.ref) a2.dots([[S.pc, ref[Math.round(S.pc)]]], { color: K.INK, r: 4.5 });

    key(c, ax.W - (ax.W - (px + pw)) - 190, py + 30,
        S.ref ? [[K.ORG, 'from the ground alone'], [K.INK, 'full inverse dynamics']]
              : [[K.ORG, 'from the ground alone']], { size: 11.5 });

    /* --------------------- the sentence ----------------------------- */
    var yb = ax.H - 70;
    if (on) {
      var armv = grfArm(s0, i, S.j), Fv = Math.hypot(s0.fx[i], s0.fy[i]);
      label(c, fmt(Fv, 0) + ' N × ' + fmt(Math.abs(armv) / 100, 3) + ' m ÷ ' + s0.mass_kg +
               ' kg = ' + fmt(Math.abs(here), 2) + ' N·m/kg',
            px + pw / 2, yb, { size: 13.5, color: K.ORG, weight: 700 });
      label(c, 'the line passes ' + fmt(Math.abs(armv), 1) + ' cm ' +
               (armv > 0 ? 'in front of' : 'behind') + ' the ' + JN[S.j] + ' — so the muscles answer',
            px + pw / 2, yb + 19, { size: 12, color: K.MUT });
      label(c, Math.abs(here) < 0.03 ? 'with almost nothing'
               : 'with an ' + (here > 0 ? POS[S.j][0] : POS[S.j][1]) + ' moment',
            px + pw / 2, yb + 35, { size: 12, color: K.MUT });
    } else {
      label(c, 'no contact — no ground reaction force, no moment from it',
            px + pw / 2, yb + 18, { size: 13, color: K.MUT });
    }
    label(c, 'Measured · ' + s0.subject + ' · ' + fmt(s0.speed, 2) + ' m/s · stance is ' +
             fmt(s0.stance_pc, 0) + '% of the cycle',
          px + pw / 2, ax.H - 12, { size: 11, color: K.MUT });
  }

  /* ----------------------------- controls ---------------------------- */
  u.ctl.className = 'ictls g2';
  var sP = slider(u.ctl, 'Gait cycle', 0, 100, 0.5, S.pc,
                  function (v) { return fmt(v, 0) + '%'; },
                  function (v) { S.pc = v; draw(); });
  sP.quiet(S.pc);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['ank', 'Ankle'], ['knee', 'Knee'], ['hip', 'Hip']], S.j,
               function (v) { S.j = v; draw(); }));
  if (KIN.subs.length > 1) {
    keepOut(chips(row, KIN.subs.map(function (x, q) { return [q, x.subject]; }), 0,
                  function (v) { S.sub = v; draw(); }));
  }
  var rb = el('button', 'icalc-chip on'); rb.textContent = 'Inverse dynamics';
  rb.setAttribute('data-unsafe', '1');
  rb.addEventListener('click', function () {
    S.ref = S.ref ? 0 : 1; rb.classList.toggle('on', !!S.ref); draw();
  });
  row.appendChild(rb);
  var pb = playBtn(u.ctl, '▶ Walk');
  var rd = readout(u.ctl);
  rd.innerHTML = 'Scrub through stance with <b>Ankle</b> selected: the centre of pressure walks ' +
    'forward under the foot and takes the moment arm from nothing to about 14 cm, which is the ' +
    'whole of the plantarflexor peak. Then switch to <b>Knee</b> and step from 0% to 10%: the ' +
    'line crosses the joint, the external moment reverses, and the quadriceps take over.';

  /* ------------------------------ playback --------------------------- */
  var raf = null, t0 = 0, base = 0;
  function tick(t) {
    if (!t0) t0 = t;
    var p = base + (t - t0) / (S0().cycle_s * 2200) * 100;
    if (p >= 100) { p = 0; base = 0; t0 = t; }
    S.pc = p; sP.quiet(p); draw();
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null; S.play = 0; pb.textContent = '▶ Walk';
  }
  pb.addEventListener('click', function () {
    if (raf) { stop(); return; }
    S.play = 1; pb.textContent = '❚❚ Pause'; base = S.pc; t0 = 0;
    raf = requestAnimationFrame(tick);
  });
  node._stop = stop;
  node._draw = draw;
  draw();
});

/* ======================================================================
   8. CHAIN — how much of a joint moment the ground accounts for

   Not on his slides; it is the evidence for the claim his inverse-dynamics
   slide makes.  For each joint, the moment computed from the ground
   reaction force and the measured joint centres is laid over the authors'
   full inverse-dynamics result for the same trial, and the agreement is
   measured rather than described: correlation through stance, and the
   ratio of the peaks.

   Ankle r ~ 0.99 and peaks within a tenth; knee the right shape and half
   again too large; hip anti-correlated.  Each step up the chain adds a
   segment's weight and acceleration that the ground alone cannot know
   about.
   ====================================================================== */
D.register('chain', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { sub: 0 };
  var ax = new Axes(u.cv, { w: port ? 440 : 540, h: port ? 500 : 452,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var c = ax.c;
  var ROWS = [['ank', 'Ankle'], ['knee', 'Knee'], ['hip', 'Hip']];

  /* correlation and peak ratio over the loaded part of stance */
  function stats(s0, j) {
    var a = [], b = [], k;
    for (k = 0; k <= 100; k++) {
      var i = gidx(s0, k);
      if (k > s0.stance_pc || !loaded(s0, i)) continue;
      a.push(grfMoment(s0, i, j)); b.push(s0.mom[j][k]);
    }
    var n = a.length, ma = 0, mb = 0;
    a.forEach(function (v) { ma += v / n; }); b.forEach(function (v) { mb += v / n; });
    var sa = 0, sb = 0, sab = 0;
    for (k = 0; k < n; k++) {
      sa += (a[k] - ma) * (a[k] - ma); sb += (b[k] - mb) * (b[k] - mb);
      sab += (a[k] - ma) * (b[k] - mb);
    }
    function pk(z) { var m = 0; z.forEach(function (v) { if (Math.abs(v) > Math.abs(m)) m = v; }); return m; }
    return { r: sab / Math.sqrt(sa * sb), pa: pk(a), pb: pk(b) };
  }

  function draw() {
    var K = C();
    ax.clear();
    if (!KIN) { label(c, 'measured stride unavailable', ax.W / 2, ax.H / 2, { color: K.MUT }); return; }
    var s0 = KIN.subs[S.sub];
    var top = 22, foot = 104, gap = 10;
    var hh = (ax.H - top - foot - gap * 2) / 3;

    ROWS.forEach(function (R, n) {
      var y0 = top + n * (hh + gap);
      var a2 = sub(ax, 56, y0, 20, ax.H - (y0 + hh));
      var est = [], k, lo = 0, hi = 0;
      for (k = 0; k <= 100; k++) {
        var i = gidx(s0, k);
        var v = (k <= s0.stance_pc && loaded(s0, i)) ? grfMoment(s0, i, R[0]) : 0;
        est.push([k, v]);
        lo = Math.min(lo, v, s0.mom[R[0]][k]); hi = Math.max(hi, v, s0.mom[R[0]][k]);
      }
      lo = Math.floor(lo * 2) / 2; hi = Math.ceil(hi * 2) / 2;
      a2.setRange(0, 100, lo - 0.05, hi + 0.05);
      a2.rect(0, lo - 0.05, s0.stance_pc, hi + 0.05, { fill: K.FILL0 });
      a2.frame({ zero: true, xticks: n === 2 ? [0, 20, 40, 60, 80, 100] : [],
                 yticks: [lo, 0, hi].filter(function (v, q, z) { return z.indexOf(v) === q; }),
                 yfmt: function (v) { return minus(v.toFixed(1)); } });
      a2.poly(s0.mom[R[0]].map(function (v, q) { return [q, v]; }), { color: K.INK, width: 2.3 });
      a2.poly(est, { color: K.ORG, width: 2.1, dash: [5, 4] });

      var st = stats(s0, R[0]);
      label(c, R[1], a2.pl + 8, y0 + 12, { size: 13, weight: 700, align: 'left' });
      var good = st.r > 0.9 && Math.abs(st.pa / st.pb) < 1.25;
      label(c, 'r = ' + num(st.r, 2) + ' · peaks ' + fmt(st.pa, 2) + ' vs ' + fmt(st.pb, 2),
            ax.W - 28, y0 + 12,
            { size: 11.5, align: 'right', color: good ? K.GRN : st.r > 0.9 ? K.ORG : K.ACC });
      label(c, good ? 'the ground is nearly all of it'
            : st.r > 0.9 ? 'right shape, ' + fmt(Math.abs(st.pa / st.pb), 1) + '× too large'
            : 'the ground alone is not even the right sign',
            ax.W - 28, y0 + 27,
            { size: 11, align: 'right', color: good ? K.GRN : st.r > 0.9 ? K.ORG : K.ACC });
    });

    /* the rotated axis title, done by hand because three panels share it */
    c.save();
    c.translate(15, ax.H / 2); c.rotate(-Math.PI / 2);
    c.fillStyle = K.INK; c.font = '700 13px ui-sans-serif,system-ui,sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Internal joint moment (N·m/kg)', 0, 0); c.restore();

    label(c, 'Gait cycle (%)', (56 + ax.W - 20) / 2, ax.H - 64, { size: 13, weight: 700 });
    /* a one-line legend: the stacked key box needs height this figure has
       already given to its three panels */
    (function () {
      var y = ax.H - 40, x = 56;
      c.save();
      c.font = '600 11.5px ui-sans-serif,system-ui,sans-serif';
      [[K.INK, [], 'full inverse dynamics'], [K.ORG, [5, 4], 'ground reaction force alone']]
        .forEach(function (e) {
          var w = c.measureText(e[2]).width;      /* measure in THIS font */
          c.save(); c.strokeStyle = e[0]; c.lineWidth = 2.4; c.setLineDash(e[1]);
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + 22, y); c.stroke(); c.restore();
          label(c, e[2], x + 28, y, { size: 11.5, align: 'left', color: K.INK });
          x += 28 + w + 20;
        });
      c.restore();
    })();
    label(c, 'Measured · ' + s0.subject + ' · correlation over the loaded part of stance',
          56, ax.H - 16, { size: 11, color: K.MUT, align: 'left' });
  }

  if (KIN && KIN.subs.length > 1) {
    keepOut(chips(u.ctl, KIN.subs.map(function (x, q) { return [q, x.subject]; }), 0,
                  function (v) { S.sub = v; draw(); }));
  }
  node._draw = draw;
  draw();
});

/* ======================================================================
   9. MOMENTS — angles, moments and muscles, one stride

   His slide 23, which is a textbook plate, rebuilt from measurement: the
   three columns are the same three columns, but every trace comes from one
   walking trial of one person, and a single playhead runs down all of them
   so an instant can be read across.

   Sign conventions are the textbook's and are printed on the figure, since
   they are not obvious and are the usual source of confusion: positive is
   extensor at hip and knee, plantarflexor at the ankle; the angle panels
   are flexion-positive, dorsiflexion-positive.
   ====================================================================== */
D.register('moments', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  /* three columns side by side is 230 px each on a phone, where the tick
     labels run into one another. In portrait show one column at a time at
     full width and let the reader choose. */
  var S = { sub: 0, pc: 15, col: 'mom' };
  if (!KIN) return;

  var ax = new Axes(u.cv, { w: port ? 460 : 1090, h: port ? 620 : 396,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;
  var JR = [['hip', 'Hip'], ['knee', 'Knee'], ['ank', 'Ankle']];
  /* the phases a clinician names, as fractions of the cycle */
  var EV = [[0, 'IC'], [12, 'OT'], [31, 'HR'], [50, 'TO'], [75, 'FA'], [87, 'TV']];

  function panels(x0, w, kind, s0) {
    var K = C();
    var top = 34, foot = 78;
    var rows = kind === 'emg' ? s0.emg.length : 3;
    var gap = kind === 'emg' ? 3 : 16;
    var hh = (ax.H - top - foot - gap * (rows - 1)) / rows;
    var head = kind === 'ang' ? 'Joint angle (°)'
             : kind === 'mom' ? 'Internal joint moment (N·m/kg)'
             : 'Muscle activity (% of peak)';
    label(c, head, x0 + w / 2, 14, { size: 13, weight: 700 });

    for (var n = 0; n < rows; n++) {
      var y0 = top + n * (hh + gap);
      var a2 = sub(ax, x0 + 48, y0, ax.W - (x0 + w) + 20, ax.H - (y0 + hh));
      var ser, lo, hi, col, nm;
      if (kind === 'emg') {
        ser = s0.emg[n].e; nm = s0.emg[n].n; lo = 0; hi = 105; col = K.BLUE;
      } else {
        var j = JR[n][0]; nm = JR[n][1];
        ser = kind === 'ang' ? s0.ang[j] : s0.mom[j];
        lo = Math.min.apply(null, ser); hi = Math.max.apply(null, ser);
        var pad = (hi - lo) * 0.12;
        lo -= pad; hi += pad; col = K.INK;
      }
      a2.setRange(0, 100, lo, hi);
      a2.rect(0, lo, s0.stance_pc, hi, { fill: K.FILL0 });
      a2.frame({ zero: kind !== 'emg',
                 xticks: n === rows - 1 ? [0, 20, 40, 60, 80, 100] : [],
                 yticks: kind === 'emg' ? [] : (function () {
                   /* 0 and one tick a little inside each end: stacked panels
                      put their extremes on the same pixel row otherwise */
                   var step = kind === 'ang' ? 10 : (hi - lo > 1 ? 0.5 : 0.2);
                   var a = [0], v;
                   for (v = step; v < hi - (hi - lo) * 0.10; v += step) a.push(v);
                   for (v = -step; v > lo + (hi - lo) * 0.10; v -= step) a.push(v);
                   return a;
                 })(),
                 yfmt: function (v) { return minus(kind === 'ang' ? v.toFixed(0) : v.toFixed(1)); } });

      if (kind === 'emg') {
        /* a filled band, the way the textbook draws muscle activity */
        c.save(); c.fillStyle = col; c.globalAlpha = .42; c.beginPath();
        c.moveTo(a2.X(0), a2.Y(0));
        ser.forEach(function (v, q) { c.lineTo(a2.X(q), a2.Y(v)); });
        c.lineTo(a2.X(100), a2.Y(0)); c.closePath(); c.fill(); c.restore();
      }
      a2.poly(ser.map(function (v, q) { return [q, v]; }),
              { color: col, width: kind === 'emg' ? 1.4 : 2.3 });

      label(c, nm, ax.W - a2.pr - 8, y0 + 12,
            { size: kind === 'emg' ? 11 : 12.5, weight: 650, align: 'right',
              color: K.INK, plate: true });

      /* the playhead, down every panel */
      c.save(); c.strokeStyle = K.VIO; c.lineWidth = 1.8; c.globalAlpha = .9;
      c.beginPath(); c.moveTo(a2.X(S.pc), a2.Y(lo)); c.lineTo(a2.X(S.pc), a2.Y(hi)); c.stroke();
      c.restore();
      a2.dots([[S.pc, ser[Math.round(S.pc)]]], { color: K.VIO, r: 3.4 });

      if (n === rows - 1) {
        label(c, 'Gait cycle (%)', (a2.pl + ax.W - a2.pr) / 2, ax.H - foot + 30,
              { size: 12.5, weight: 700 });
      }
    }
  }

  function draw() {
    var K = C(), s0 = KIN.subs[S.sub];
    ax.clear();
    var NOTE = { ang: 'positive: flexion, dorsiflexion · relative to standing',
                 mom: 'positive: extensor, plantarflexor',
                 emg: 'envelope, as % of each channel’s own peak' };
    if (port) {
      panels(0, ax.W, S.col, s0);
      label(c, NOTE[S.col], ax.W / 2, ax.H - 28, { size: 11, color: K.MUT });
    } else {
      var w = ax.W / 3;
      panels(0, w, 'ang', s0);
      panels(w, w, 'mom', s0);
      panels(2 * w, w, 'emg', s0);
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
      c.beginPath(); c.moveTo(w, 22); c.lineTo(w, ax.H - 46);
      c.moveTo(2 * w, 22); c.lineTo(2 * w, ax.H - 46); c.stroke(); c.restore();
      label(c, NOTE.ang, w / 2, ax.H - 28, { size: 10.5, color: K.MUT });
      label(c, NOTE.mom, w * 1.5, ax.H - 28, { size: 10.5, color: K.MUT });
      label(c, NOTE.emg, w * 2.5, ax.H - 28, { size: 10.5, color: K.MUT });
    }
    label(c, port
          ? 'Measured · ' + s0.subject + ' · one stride · shaded = stance'
          : 'Measured · ' + s0.subject + ' · ' + fmt(s0.speed, 2) + ' m/s · one stride, ' +
            'heel strike to heel strike · shaded = stance · at ' + fmt(S.pc, 0) + '% of the cycle',
          ax.W / 2, ax.H - 10, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sP = slider(u.ctl, 'Gait cycle', 0, 100, 0.5, S.pc,
                  function (v) { return fmt(v, 0) + '%'; },
                  function (v) { S.pc = v; draw(); });
  sP.quiet(S.pc);
  var row = ctlRow(u.ctl);
  if (port) {
    keepOut(seg(row, [['ang', 'Angles'], ['mom', 'Moments'], ['emg', 'Muscles']], S.col,
                 function (v) { S.col = v; draw(); }));
  }
  if (KIN.subs.length > 1) {
    keepOut(chips(row, KIN.subs.map(function (x, q) { return [q, x.subject]; }), 0,
                  function (v) { S.sub = v; draw(); }));
  }
  var pb = playBtn(u.ctl, '▶ Walk');
  var rd = readout(u.ctl);
  rd.innerHTML = 'Read one instant across all three columns. At <b>10–15%</b> the knee is flexing, ' +
    'the knee moment is extensor and the quadriceps are on — the ground is folding the knee and ' +
    'the quadriceps are controlling the fold, lengthening while they resist. Two honest gaps: ' +
    'the <b>gluteus maximus</b> channel barely modulates in either subject, which is a poor ' +
    'recording and not a quiet muscle, and <b>iliopsoas</b> — which the textbook panel shows ' +
    'driving the hip flexor moment in pre-swing — is too deep for any surface electrode to reach.';

  var raf = null, t0 = 0, base = 0;
  function tick(t) {
    if (!t0) t0 = t;
    var p = base + (t - t0) / (KIN.subs[S.sub].cycle_s * 2400) * 100;
    if (p >= 100) { p = 0; base = 0; t0 = t; }
    S.pc = p; sP.quiet(p); draw();
    raf = requestAnimationFrame(tick);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; pb.textContent = '▶ Walk'; }
  pb.addEventListener('click', function () {
    if (raf) { stop(); return; }
    pb.textContent = '❚❚ Pause'; base = S.pc; t0 = 0; raf = requestAnimationFrame(tick);
  });
  node._stop = stop;
  node._draw = draw;
  draw();
});

/* ======================================================================
   10. TREND — what a lateral lean is worth at the hip

   His slides 24, 25 and 26, with his arithmetic made continuous.

   A static frontal-plane balance about the stance hip, which is the
   standard textbook treatment:

       F_ab * d  +  C * Dc  =  W * D            (moments about the hip)
       JRF       =  F_ab + W - C                (what the head carries)

   W is body weight less the stance limb, D its moment arm, d the
   abductors', C a cane's load and Dc its moment arm.  Leaning the trunk
   towards the stance side carries the centre of gravity with it and
   shortens D:

       D(phi) = D0 - h sin(phi)

   with h the height of the centre of gravity above the hip.  Set the lean
   to zero and d to 5 cm and the readout is his figure exactly: 1500 N of
   abductor force and a 2000 N joint reaction force.
   ====================================================================== */
var TR = { W: 500,    /* N, body less the stance limb */
           D0: 15,    /* cm, its moment arm standing square */
           HCG: 35,   /* cm, centre of gravity above the hip */
           BW: 600,   /* N, whole body */
           DC: 40 };  /* cm, a cane's moment arm about the stance hip */

function trendModel(phi, d, cane) {
  var D = TR.D0 - TR.HCG * Math.sin(phi * Math.PI / 180);
  var Cf = cane === 'none' ? 0 : 0.15 * TR.BW;
  var dc = cane === 'opp' ? TR.DC : cane === 'same' ? -TR.DC : 0;
  var Fab = (TR.W * D - Cf * dc) / d;
  return { D: D, C: Cf, dc: dc, Fab: Fab, JRF: Fab + TR.W - Cf };
}

D.register('trend', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { phi: 0, d: 5, cane: 'none' };
  var W = TR.W, D0 = TR.D0, HCG = TR.HCG, BW = TR.BW, DC = TR.DC;

  var ax = new Axes(u.cv, { w: port ? 460 : 1050, h: port ? 560 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  var model = trendModel;

  function draw() {
    var K = C();
    ax.clear();
    var stack = port;
    var split = stack ? ax.H * 0.52 : ax.W * 0.46;
    var m = model(S.phi, S.d, S.cane);
    var base = model(0, 5, 'none');

    /* -------------------------- the figure --------------------------- */
    var box = stack ? { x: 4, y: 2, w: ax.W - 8, h: split - 6 }
                    : { x: 2, y: 4, w: split - 10, h: ax.H - 10 };
    /* Drawn as what it is: a lever. The pelvis is the beam, the hip is the
       fulcrum, the abductors pull down one side and body weight the other,
       and the femoral head carries the sum. Arrow lengths are strictly
       proportional to force, so the three-to-one disadvantage is visible
       before any number is read. */
    var sc = new Scene(c, box).fit(-22, -40, 36, 30, 10);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    var ph = S.phi * Math.PI / 180;
    var cgx = D0 - HCG * Math.sin(ph);
    var FS2 = 0.0125;                        /* cm of picture per newton */

    /* the trunk above the beam, leaning towards the stance side */
    c.save();
    c.strokeStyle = K.GRID; c.lineWidth = 11; c.lineCap = 'round';
    var txx = 9 - HCG * Math.sin(ph) * 0.52, tyy = 2 + HCG * Math.cos(ph) * 0.52;
    c.beginPath(); c.moveTo(sc.X(9), sc.Y(2)); c.lineTo(sc.X(txx), sc.Y(tyy)); c.stroke();
    c.beginPath(); c.arc(sc.X(txx + (txx - 9) * 0.26), sc.Y(tyy + 6), sc.L(5.5), 0, 7); c.stroke();
    /* the pelvis: the beam */
    c.strokeStyle = K.MUT; c.lineWidth = 9;
    c.beginPath(); c.moveTo(sc.X(-11), sc.Y(0)); c.lineTo(sc.X(27), sc.Y(0)); c.stroke();
    /* the stance femur, hanging from the fulcrum */
    c.strokeStyle = K.INK; c.lineWidth = 6;
    c.beginPath(); c.moveTo(sc.X(0), sc.Y(-1)); c.lineTo(sc.X(2.5), sc.Y(-36)); c.stroke();
    c.restore();

    /* the abductors and body weight, both pulling the beam down */
    arrow(c, sc.X(-S.d), sc.Y(-1), sc.X(-S.d), sc.Y(-1 - m.Fab * FS2),
          { color: K.ACC, width: 3.2, head: 12 });
    label(c, fmt(m.Fab, 0) + ' N', sc.X(-S.d) - 8, sc.Y(-1 - m.Fab * FS2 / 2),
          { color: K.ACC, size: 12.5, align: 'right', plate: true });
    label(c, 'abductors', sc.X(-S.d) - 8, sc.Y(-1 - m.Fab * FS2 / 2) + 15,
          { color: K.ACC, size: 11, align: 'right', plate: true });

    arrow(c, sc.X(cgx), sc.Y(-1), sc.X(cgx), sc.Y(-1 - W * FS2),
          { color: K.BLUE, width: 3.2, head: 12 });
    label(c, fmt(W, 0) + ' N', sc.X(cgx) + 9, sc.Y(-1 - W * FS2 / 2),
          { color: K.BLUE, size: 12.5, align: 'left', plate: true });
    label(c, 'body weight', sc.X(cgx) + 9, sc.Y(-1 - W * FS2 / 2) + 15,
          { color: K.BLUE, size: 11, align: 'left', plate: true });
    c.save(); c.fillStyle = K.BLUE;
    c.beginPath(); c.arc(sc.X(cgx), sc.Y(2), 5, 0, 7); c.fill(); c.restore();
    label(c, 'CoG', sc.X(cgx), sc.Y(2) - 14, { color: K.BLUE, size: 11, plate: true });

    /* what the femoral head carries, pushing back up the femur */
    arrow(c, sc.X(2.5 + m.JRF * FS2 * 0.07), sc.Y(-6 - m.JRF * FS2),
          sc.X(0.6), sc.Y(-5), { color: K.VIO, width: 3.2, head: 12 });
    label(c, 'JRF ' + fmt(m.JRF, 0) + ' N', sc.X(3) + 10, sc.Y(-6 - m.JRF * FS2 / 2),
          { color: K.VIO, size: 12.5, align: 'left', plate: true });

    /* the two moment arms, on their own rows */
    function armBar(x, y, col, txt, side) {
      c.save();
      c.strokeStyle = col; c.lineWidth = 1.6; c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(sc.X(0), sc.Y(y)); c.lineTo(sc.X(x), sc.Y(y)); c.stroke();
      [0, x].forEach(function (q) {
        c.beginPath(); c.moveTo(sc.X(q), sc.Y(y + 1.7)); c.lineTo(sc.X(q), sc.Y(y - 1.7)); c.stroke();
      });
      c.restore();
      label(c, txt, sc.X(x / 2), sc.Y(y) + side * 11, { color: col, size: 11.5, plate: true });
    }
    /* below the force arrows, where only the femur crosses them */
    armBar(-S.d, -26, K.ACC, fmt(S.d, 1) + ' cm', 1);
    armBar(cgx, -33, K.BLUE, fmt(m.D, 1) + ' cm', 1);

    if (S.cane !== 'none') {
      var cx2 = m.dc;
      arrow(c, sc.X(cx2), sc.Y(-1 + m.C * FS2), sc.X(cx2), sc.Y(-1),
            { color: K.GRN, width: 2.8, head: 11 });
      label(c, 'cane ' + fmt(m.C, 0) + ' N', sc.X(cx2), sc.Y(-1 + m.C * FS2) - 12,
            { color: K.GRN, size: 11.5, plate: true });
      label(c, S.cane === 'opp' ? 'opposite hand' : 'same hand', sc.X(cx2), sc.Y(-1 + m.C * FS2) - 26,
            { color: K.GRN, size: 10.5, plate: true });
    }

    pin(c, sc.X(0), sc.Y(0), 7, { color: K.ORG });
    label(c, 'stance hip', sc.X(0) - 10, sc.Y(0) - 16,
          { size: 11.5, color: K.MUT, align: 'right', plate: true });
    label(c, S.phi > 0.2 ? fmt(S.phi, 1) + '° of lean' : 'standing square',
          box.x + box.w / 2, box.y + 14, { size: 13, color: K.MUT });
    c.restore();

    /* --------------------------- the numbers -------------------------- */
    var px = stack ? 8 : split, pw = stack ? ax.W - 16 : ax.W - split - 10;
    var py = stack ? split + 4 : (ax.H - 232) / 2, fs = 15, lh = 25;
    var y = py + 16;
    function line(txt, o) {
      o = o || {};
      label(c, txt, px + 14, y, { align: 'left', size: o.size || fs,
                                  color: o.color || K.INK, weight: o.weight || 600 });
      y += o.gap || lh;
    }
    c.save();
    var pheight = stack ? ax.H - py - 10 : 232;
    c.fillStyle = K.PANEL; c.fillRect(px, py, pw, pheight);
    c.strokeStyle = K.GRID; c.lineWidth = 1; c.strokeRect(px + .5, py + .5, pw - 1, pheight - 1);
    c.restore();

    line('Moments about the stance hip', { color: K.MUT, weight: 700, size: 13.5, gap: 24 });
    line('F_ab × ' + fmt(S.d, 1) + ' cm' + (m.C ? '  +  cane × ' + fmt(m.dc, 0) + ' cm' : '') +
         '  =  ' + fmt(W, 0) + ' N × ' + fmt(m.D, 1) + ' cm', { size: 13.5 });
    line('F_ab  =  ' + fmt(m.Fab, 0) + ' N   (' + fmt(m.Fab / BW, 2) + ' body weights)',
         { color: K.ACC, weight: 700, size: fs + 1, gap: 28 });
    line('JRF  =  F_ab + W' + (m.C ? ' − cane' : '') + '  =  ' + fmt(m.JRF, 0) + ' N', { size: 13.5 });
    line('the femoral head carries ' + fmt(m.JRF / BW, 2) + ' body weights',
         { color: K.VIO, weight: 700, size: fs, gap: 30 });

    var saved = base.JRF - m.JRF;
    c.save();
    c.strokeStyle = K.GRID; c.lineWidth = 1;
    c.beginPath(); c.moveTo(px + 12, y - 16); c.lineTo(px + pw - 12, y - 16); c.stroke();
    c.restore();
    if (Math.abs(saved) < 1) {
      line('Standing square with a 5 cm abductor lever: his figure, 1500 N and 2000 N.',
           { color: K.MUT, size: 12.5, gap: 20 });
      line('Lean the trunk, or shorten the lever, and watch both numbers move.',
           { color: K.MUT, size: 12.5 });
    } else {
      line((saved > 0 ? 'That is ' + fmt(saved, 0) + ' N less' : 'That is ' + fmt(-saved, 0) + ' N more') +
           ' on the joint than standing square — ' +
           fmt(Math.abs(saved) / base.JRF * 100, 0) + '%' + (saved > 0 ? ' off' : ' on'),
           { color: saved > 0 ? K.GRN : K.ACC, weight: 700, size: 13.5, gap: 20 });
      line('(standing square, with a 5 cm abductor lever, it is ' + fmt(base.JRF, 0) + ' N)',
           { color: K.MUT, size: 12 });
    }
  }

  u.ctl.className = 'ictls g2';
  var sA = slider(u.ctl, 'Trunk lean', 0, 16, 0.5, S.phi,
                  function (v) { return fmt(v, 1) + '°'; },
                  function (v) { S.phi = v; draw(); });
  var sB = slider(u.ctl, 'Abductor moment arm', 3, 8, 0.1, S.d,
                  function (v) { return fmt(v, 1) + ' cm'; },
                  function (v) { S.d = v; draw(); });
  sA.quiet(S.phi); sB.quiet(S.d);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['none', 'No cane'], ['opp', 'Cane, opposite hand'],
                    ['same', 'Cane, same hand']], S.cane,
               function (v) { S.cane = v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'A lean of eight or nine degrees — barely visible across a room — takes about ' +
    'a third off the hip load. Shortening the <b>abductor moment arm</b> sends the required force ' +
    'up steeply, which is why restoring the offset matters in a hip replacement. And a cane in the ' +
    '<b>opposite</b> hand, carrying only 15% of body weight on a very long lever, beats the lurch; ' +
    'in the <b>same</b> hand it makes everything worse.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   11. LEAN — anterior and posterior trunk bending, in one figure

   His slides 27 and 28.  Both compensations are the same manoeuvre about
   two different joints, so they belong on one pair of axes.

   In quiet single-limb stance the resultant ground reaction force must
   pass through the body's centre of gravity, so leaning the trunk swings
   the line of action with it.  The centre of gravity is combined from two
   parts, head-arms-trunk at 68% of body mass and the legs at 32%, with the
   trunk's own centre 55% of the way from hip to shoulder.  The figure then
   measures the perpendicular from the hip and from the knee onto that line
   and reports the external moment at each.

   It is a STATIC model: the line through the centre of gravity is exactly
   right only when nothing is accelerating.  In early stance it is close,
   and the figure says so on its face.
   ====================================================================== */
var LN = { BW: 700,                  /* N */
           LT: 50,                   /* cm, hip to shoulder */
           P: { cop: [0, 0], ank: [-2, 8], knee: [4, 48], hip: [-3, 90] } };

function leanModel(phiDeg) {
  var P = LN.P, LT = LN.LT, BW = LN.BW;
  var p = phiDeg * Math.PI / 180;
  var sh = [P.hip[0] + LT * Math.sin(p), P.hip[1] + LT * Math.cos(p)];
  var hat = [P.hip[0] + 0.55 * LT * Math.sin(p), P.hip[1] + 0.55 * LT * Math.cos(p)];
  var legs = [0, 45];
  var cg = [0.68 * hat[0] + 0.32 * legs[0], 0.68 * hat[1] + 0.32 * legs[1]];
  var ux = cg[0] - P.cop[0], uy = cg[1] - P.cop[1], um = Math.hypot(ux, uy);
  function armOf(j) { return moment(P[j][0], P[j][1], P.cop[0], P.cop[1], ux / um, uy / um); }
  function mOf(j) { return armOf(j) / 100 * BW; }
  return { sh: sh, cg: cg, ux: ux, uy: uy, arm: armOf, M: mOf };
}

D.register('lean', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { phi: 0, show: 'both' };
  var BW = LN.BW, LT = LN.LT, P = LN.P;

  var ax = new Axes(u.cv, { w: port ? 460 : 1050, h: port ? 580 : 452,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  var model = leanModel;

  function draw() {
    var K = C();
    ax.clear();
    var stack = port;
    var split = stack ? ax.H * 0.56 : ax.W * 0.48;
    var m = model(S.phi);

    var box = stack ? { x: 4, y: 2, w: ax.W - 8, h: split - 6 }
                    : { x: 2, y: 4, w: split - 10, h: ax.H - 10 };
    var sc = new Scene(c, box).fit(-38, -6, 44, 152, 10);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    /* ground */
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sc.X(-46), sc.Y(0)); c.lineTo(sc.X(52), sc.Y(0)); c.stroke();
    /* the limb and the trunk */
    c.strokeStyle = K.INK; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(sc.X(P.hip[0]), sc.Y(P.hip[1]));
    c.lineTo(sc.X(P.knee[0]), sc.Y(P.knee[1]));
    c.lineTo(sc.X(P.ank[0]), sc.Y(P.ank[1]));
    c.lineTo(sc.X(-9), sc.Y(1)); c.lineTo(sc.X(13), sc.Y(1));
    c.stroke();
    c.strokeStyle = K.MUT; c.lineWidth = 10;
    c.beginPath(); c.moveTo(sc.X(P.hip[0]), sc.Y(P.hip[1]));
    c.lineTo(sc.X(m.sh[0]), sc.Y(m.sh[1])); c.stroke();
    var hd = [m.sh[0] + (m.sh[0] - P.hip[0]) * 0.26, m.sh[1] + (m.sh[1] - P.hip[1]) * 0.26];
    c.beginPath(); c.arc(sc.X(hd[0]), sc.Y(hd[1]), sc.L(9), 0, 7); c.stroke();
    c.restore();

    /* the line of action, from the centre of pressure through the CoG */
    loa(c, sc, P.cop[0], P.cop[1], m.ux, m.uy, { len: Math.max(box.w, box.h) * 1.4, color: K.MUT });
    var fsc = 46 / BW;
    arrow(c, sc.X(P.cop[0]), sc.Y(P.cop[1]),
          sc.X(P.cop[0] + m.ux / Math.hypot(m.ux, m.uy) * BW * fsc),
          sc.Y(P.cop[1] + m.uy / Math.hypot(m.ux, m.uy) * BW * fsc),
          { color: K.ACC, width: 3.4, head: 13 });
    label(c, 'GRF ' + fmt(BW, 0) + ' N', sc.X(P.cop[0]) - 10, sc.Y(26),
          { color: K.ACC, size: 12.5, align: 'right', plate: true });
    c.save(); c.fillStyle = K.BLUE;
    c.beginPath(); c.arc(sc.X(m.cg[0]), sc.Y(m.cg[1]), 5, 0, 7); c.fill(); c.restore();
    label(c, 'CoG', sc.X(m.cg[0]) + 11, sc.Y(m.cg[1]) - 13,
          { color: K.BLUE, size: 12, align: 'left', plate: true });

    [['hip', K.VIO], ['knee', K.ORG]].forEach(function (e) {
      if (S.show !== 'both' && S.show !== e[0]) return;
      dropPerp(c, sc, P[e[0]][0], P[e[0]][1], P.cop[0], P.cop[1], m.ux, m.uy, { color: e[1] });
      label(c, fmt(Math.abs(m.arm(e[0])), 1) + ' cm',
            sc.X(P[e[0]][0]) + (e[0] === 'hip' ? -12 : 14), sc.Y(P[e[0]][1]) - 12,
            { color: e[1], size: 12, align: e[0] === 'hip' ? 'right' : 'left', plate: true });
    });
    pin(c, sc.X(P.hip[0]), sc.Y(P.hip[1]), 6, { color: K.VIO });
    label(c, 'hip', sc.X(P.hip[0]) - 12, sc.Y(P.hip[1]) + 13,
          { size: 11, color: K.VIO, align: 'right', plate: true });
    label(c, 'knee', sc.X(P.knee[0]) + 13, sc.Y(P.knee[1]) + 13,
          { size: 11, color: K.ORG, align: 'left', plate: true });
    pin(c, sc.X(P.knee[0]), sc.Y(P.knee[1]), 6, { color: K.ORG });
    pin(c, sc.X(P.ank[0]), sc.Y(P.ank[1]), 5);
    label(c, S.phi > 1 ? fmt(S.phi, 0) + '° forward' : S.phi < -1 ? fmt(-S.phi, 0) + '° back' : 'upright',
          box.x + 12, box.y + 14, { size: 13, color: K.MUT, align: 'left' });
    c.restore();

    /* ------------------------- the two joints ------------------------- */
    var px = stack ? 8 : split, pw = stack ? ax.W - 16 : ax.W - split - 10;
    var py = stack ? split + 4 : (ax.H - 52 - 234) / 2;
    var ph = 112;

    [['knee', K.ORG, 'quadriceps', 'flexor', 'extensor'],
     ['hip', K.VIO, 'hip extensors', 'flexor', 'extensor']].forEach(function (e, n) {
      var y0 = py + n * (ph + 10);
      c.save();
      c.fillStyle = K.PANEL; c.fillRect(px, y0, pw, ph);
      c.strokeStyle = K.GRID; c.lineWidth = 1; c.strokeRect(px + .5, y0 + .5, pw - 1, ph - 1);
      c.restore();
      var arm = e[0] === 'knee' ? m.arm('knee') : m.arm('hip');
      var Mv = e[0] === 'knee' ? m.M('knee') : m.M('hip');
      /* at the knee a line behind the joint flexes it; at the hip a line in
         front of the joint flexes it.  Opposite senses, same rule. */
      var flexing = e[0] === 'knee' ? arm < 0 : arm > 0;
      var dead = Math.abs(arm) < 0.8;
      label(c, e[0] === 'knee' ? 'Knee' : 'Hip', px + 14, y0 + 18,
            { size: 14.5, weight: 700, align: 'left', color: e[1] });
      label(c, 'the line passes ' + fmt(Math.abs(arm), 1) + ' cm ' +
               (arm > 0 ? 'in front of' : 'behind') + ' it',
            px + 14, y0 + 40, { size: 12.5, align: 'left', color: K.MUT });
      label(c, dead ? 'external moment ≈ 0' :
               'external ' + (flexing ? e[3] : e[4]) + ' moment of ' + fmt(Math.abs(Mv), 0) + ' N·m',
            px + 14, y0 + 62, { size: 14, weight: 700, align: 'left',
                                color: dead ? K.GRN : flexing ? K.ACC : K.BLUE });
      label(c, dead ? 'nothing for the ' + e[2] + ' to do'
             : flexing ? 'the ' + e[2] + ' must work to resist it'
                       : 'the ' + e[2] + ' are unloaded — the joint is held by its own structures',
            px + 14, y0 + 84, { size: 12, align: 'left',
                                color: dead ? K.GRN : flexing ? K.ACC : K.BLUE });
    });
    label(c, 'Static model: in quiet stance the resultant must pass through the centre of gravity.',
          px + pw / 2, ax.H - 32, { size: 11, color: K.MUT });
    label(c, 'True only while nothing is accelerating — close enough in early stance to make the point.',
          px + pw / 2, ax.H - 16, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sA = slider(u.ctl, 'Trunk lean', -25, 40, 1, S.phi,
                  function (v) { return v > 0 ? fmt(v, 0) + '° fwd' : v < 0 ? fmt(-v, 0) + '° back' : 'upright'; },
                  function (v) { S.phi = v; draw(); });
  sA.quiet(S.phi);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['both', 'Both joints'], ['knee', 'Knee only'], ['hip', 'Hip only']], S.show,
               function (v) { S.show = v; draw(); }));
  var rd = readout(u.ctl);
  rd.innerHTML = 'Lean <b>forward</b> and the line swings ahead of the knee: the external moment ' +
    'reverses and the quadriceps are unloaded, which is what a patient with a weak quadriceps ' +
    'finds without being taught. Lean <b>back</b> and the same happens at the hip. The two cannot ' +
    'be satisfied at once — whichever way you lean, one of the two muscle groups has more to do.';

  node._draw = draw;
  draw();
});

/* the pure model functions, so parts/selftest.js can check the arithmetic
   against values worked out independently rather than against the drawing */
window.AK15 = {
  perp: perp, moment: moment, grfMoment: grfMoment, grfArm: grfArm,
  gidx: gidx, loaded: loaded, jat: jat, jpos: jpos,
  trendModel: trendModel, leanModel: leanModel
};

/* build every .iplot on the page; deck-core walks the DOM for data-widget */
D.boot();
})();
