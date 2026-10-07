/* ======================================================================
   EPHE 341 — Gait Analysis (lecture 16)

   This lecture is a textbook chapter about measurement, so nothing here
   is drawn to look right.  Every figure that quotes a number computes it
   from one recorded walk -- the gait events, the spatial variables, the
   three force components, the centre of pressure, the joint angles and
   moments, the support moment, the centre of mass and the muscle
   activity all come from the same stride of the same person, and the
   two subjects disagree where real people disagree.
   parts/selftest.js checks the arithmetic against values worked out
   independently in Python (scratchpad/mkgait16.py and the checks around
   it).
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

/* ===================== the measured walking trial ====================== */
var GD = window.GAIT16 || null;
var JI = {};
if (GD) GD.j.forEach(function (n, i) { JI[n] = i; });
var NJ = 20;

function nsub() { return GD ? GD.subs.length : 0; }

/* joint position at marker frame f (may be fractional), in centimetres,
   as [x forward, y up, z to the subject's right] */
function jp(s, f, name) {
  var j = JI[name];
  var a = Math.floor(f), t = f - a;
  a = Math.max(0, Math.min(s.nf - 1, a));
  var b = Math.min(a + 1, s.nf - 1);
  var ia = (a * NJ + j) * 3, ib = (b * NJ + j) * 3;
  return [s.p[ia] + (s.p[ib] - s.p[ia]) * t,
          s.p[ia + 1] + (s.p[ib + 1] - s.p[ia + 1]) * t,
          s.p[ia + 2] + (s.p[ib + 2] - s.p[ia + 2]) * t];
}
/* the marker frame at a given percentage of the gait cycle */
function fat(s, pcv) { return Math.max(0, Math.min(s.nf - 1, pcv / 100 * (s.nf - 1))); }
/* the force-plate sample at a given percentage of the gait cycle */
function gat(s, pcv) {
  return Math.max(0, Math.min(s.ng - 1, Math.round(pcv / 100 * s.cycle_s * s.ghz)));
}
function onPlate(s, pcv) {
  var i = gat(s, pcv);
  return pcv <= s.ev.rto_plate && s.fy[i] > 0.05 * s.mass_kg * 9.81;
}
function bodyWeight(s) { return s.mass_kg * 9.81; }

/* the segments the stick figure is drawn from */
var SEG_NEAR = [['hipR', 'kneeR'], ['kneeR', 'ankR'], ['ankR', 'heelR'],
                ['ankR', 'toeR'], ['heelR', 'toeR']];
var SEG_FAR  = [['hipL', 'kneeL'], ['kneeL', 'ankL'], ['ankL', 'heelL'],
                ['ankL', 'toeL'], ['heelL', 'toeL']];
var SEG_TRUNK = [['pelvis', 'trunk'], ['trunk', 'neck'], ['neck', 'head'],
                 ['neck', 'shR'], ['shR', 'elR'], ['elR', 'wrR'],
                 ['neck', 'shL'], ['shL', 'elL'], ['elL', 'wrL'],
                 ['pelvis', 'hipR'], ['pelvis', 'hipL']];

/* Draw the body at frame f.  `plane` picks which two of the three
   coordinates go on screen: 'sag' is x against y, seen from the subject's
   right; 'front' is z against y, seen from behind; 'top' is x against z,
   seen from above. */
function figure(c, s, sc, f, o) {
  o = o || {};
  var plane = o.plane || 'sag';
  function P(n) {
    var q = jp(s, f, n);
    return plane === 'sag' ? [q[0], q[1]]
         : plane === 'front' ? [q[2], q[1]]
         : [q[0], q[2]];
  }
  function run(list, col, w) {
    c.save(); c.strokeStyle = col; c.lineWidth = w;
    c.lineCap = 'round'; c.lineJoin = 'round';
    list.forEach(function (e) {
      var a = P(e[0]), b = P(e[1]);
      c.beginPath(); c.moveTo(sc.X(a[0]), sc.Y(a[1]));
      c.lineTo(sc.X(b[0]), sc.Y(b[1])); c.stroke();
    });
    c.restore();
  }
  if (o.far !== false) run(SEG_FAR, o.farCol || C().GRID, o.wfar || 3);
  if (o.trunk !== false) run(SEG_TRUNK, o.trunkCol || C().MUT, o.wtrunk || 3.4);
  run(SEG_NEAR, o.nearCol || C().INK, o.wnear || 4.4);
  if (o.head !== false && plane !== 'top') {
    var h = P('head');
    c.save(); c.strokeStyle = o.trunkCol || C().MUT; c.lineWidth = o.wtrunk || 3.4;
    c.beginPath(); c.arc(sc.X(h[0]), sc.Y(h[1] + (plane === 'sag' ? 6 : 6)), sc.L(9), 0, 7);
    c.stroke(); c.restore();
  }
  return P;
}

/* a foot outline from its three markers, seen from above or from the side */
function footPts(s, f, side, plane) {
  var hl = jp(s, f, 'heel' + side), to = jp(s, f, 'toe' + side), an = jp(s, f, 'ank' + side);
  function q(v) { return plane === 'top' ? [v[0], v[2]] : [v[0], v[1]]; }
  return { heel: q(hl), toe: q(to), ank: q(an) };
}

/* a labelled phase bar: [start%, end%, colour, label] */
function phaseBar(c, ax, x0, y0, w, h, rows, o) {
  o = o || {};
  var K = C();
  rows.forEach(function (r) {
    var a = x0 + r[0] / 100 * w, b = x0 + r[1] / 100 * w;
    c.save();
    c.fillStyle = r[2]; c.globalAlpha = o.alpha == null ? .55 : o.alpha;
    c.fillRect(a, y0, b - a, h);
    c.globalAlpha = 1;
    c.strokeStyle = K.PLATE; c.lineWidth = 1; c.strokeRect(a + .5, y0 + .5, b - a - 1, h - 1);
    c.restore();
    if (r[3] && (b - a) > (o.minw || 34)) {
      label(c, r[3], (a + b) / 2, y0 + h / 2,
            { size: o.size || 11.5, color: K.INK, weight: 650 });
    }
  });
  c.save();
  c.strokeStyle = K.GRID; c.lineWidth = 1;
  c.strokeRect(x0 + .5, y0 + .5, w - 1, h - 1);
  c.restore();
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
   1. CYCLE — his gait cycle diagram, built from a recorded walk

   His slides 3, 4 and 5.  The four events are detected from the markers:
   a foot is down when its heel or its forefoot is low and not travelling
   forward.  That is the only method available for the left foot, because
   there is one force plate and the right foot stood on it -- so the right
   foot's toe-off is reported twice, once from the markers and once from
   the plate, and the gap between them is the method's error.
   ====================================================================== */
D.register('cycle', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!GD) return;
  var S = { pc: 15, sub: 0 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1090, h: port ? 660 : 466,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function draw() {
    var K = C(), s = GD.subs[S.sub], e = s.ev;
    ax.clear();
    var figH = port ? ax.H * 0.40 : ax.H * 0.53;

    /* ---------------------- the walker ----------------------------- */
    var box = { x: 4, y: 2, w: ax.W - 8, h: figH - 6 };
    var sc = new Scene(c, box).fit(-56, -4, 188, 178, 6);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sc.X(-62), sc.Y(0)); c.lineTo(sc.X(196), sc.Y(0)); c.stroke();
    c.restore();
    var f = fat(s, S.pc);
    figure(c, s, sc, f, {});
    /* which feet are down right now */
    function down(side, a, b, wrap) {
      return wrap ? (S.pc >= a || S.pc <= b) : (S.pc >= a && S.pc <= b);
    }
    var rDown = down('R', 0, e.rto, false);
    var lDown = (S.pc <= e.lto) || (S.pc >= e.lhs);
    [['R', rDown], ['L', lDown]].forEach(function (q) {
      var h = jp(s, f, 'heel' + q[0]), t = jp(s, f, 'toe' + q[0]);
      c.save();
      c.strokeStyle = q[1] ? K.ACC : K.GRID; c.lineWidth = q[1] ? 5 : 3;
      c.lineCap = 'round';
      c.beginPath(); c.moveTo(sc.X(h[0]), sc.Y(h[1])); c.lineTo(sc.X(t[0]), sc.Y(t[1]));
      c.stroke(); c.restore();
    });
    label(c, (rDown && lDown) ? 'both feet down — double support'
          : rDown ? 'right foot down — single support'
          : lDown ? 'left foot down — right limb swinging' : 'neither foot down?',
          box.x + box.w / 2, box.y + 14,
          { size: 13, color: (rDown && lDown) ? K.ACC : K.MUT, weight: 650 });
    c.restore();

    /* ---------------------- the timeline ---------------------------- */
    var x0 = port ? 46 : 96, x1 = ax.W - (port ? 14 : 24), w = x1 - x0;
    var y = figH + 6, rh = port ? 21 : 25, gap = 5;
    function row(name, rows, o) {
      label(c, name, x0 - 8, y + rh / 2, { size: 11.5, align: 'right', color: K.MUT });
      phaseBar(c, ax, x0, y, w, rh, rows, o);
      y += rh + gap;
    }
    row('gait cycle', [[0, 100, K.FILL0, 'ONE GAIT CYCLE — ' + fmt(s.cycle_s, 2) + ' s']]);
    row('right limb', [[0, e.rto, K.ACCFILL, 'RIGHT STANCE ' + fmt(e.rto, 0) + '%'],
                       [e.rto, 100, K.FILL2, 'RIGHT SWING ' + fmt(100 - e.rto, 0) + '%']]);
    row('left limb', [[0, e.lto, K.FILL2, ''],
                      [e.lto, e.lhs, K.SOFT, 'LEFT SWING'],
                      [e.lhs, 100, K.FILL2, 'LEFT STANCE']]);
    row('support', [[0, e.lto, K.ACCFILL, 'double'],
                    [e.lto, e.lhs, K.FILL0, 'right single support'],
                    [e.lhs, e.rto, K.ACCFILL, 'double'],
                    [e.rto, 100, K.FILL0, 'left single support']], { minw: 44 });

    /* the axis, the events, and the playhead */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
    [0, 20, 40, 60, 80, 100].forEach(function (t) {
      var xx = x0 + t / 100 * w;
      c.beginPath(); c.moveTo(xx, y); c.lineTo(xx, y + 4); c.stroke();
      label(c, t + '%', xx, y + 13, { size: 11, color: K.MUT });
    });
    c.restore();
    label(c, 'per cent of the gait cycle', (x0 + x1) / 2, y + 30,
          { size: 12, weight: 700, color: K.INK });

    var EV = [[0, 'RHS'], [e.lto, 'LTO'], [e.lhs, 'LHS'], [e.rto, 'RTO']];
    EV.forEach(function (q) {
      var xx = x0 + q[0] / 100 * w;
      c.save(); c.strokeStyle = K.VIO; c.lineWidth = 1.3; c.setLineDash([3, 3]);
      c.beginPath(); c.moveTo(xx, figH + 4); c.lineTo(xx, y); c.stroke(); c.restore();
      label(c, q[1], xx, figH - 4, { size: 10.5, color: K.VIO, weight: 700, plate: true });
    });
    /* the plate's own toe-off, as the check on the marker method */
    var xp = x0 + e.rto_plate / 100 * w;
    c.save(); c.strokeStyle = K.ORG; c.lineWidth = 2;
    c.beginPath(); c.moveTo(xp, y - 3); c.lineTo(xp, y + 7); c.stroke(); c.restore();

    var xh = x0 + S.pc / 100 * w;
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2;
    c.beginPath(); c.moveTo(xh, figH + 2); c.lineTo(xh, y + 2); c.stroke(); c.restore();

    label(c, 'Measured · ' + s.subject + ' · ' + fmt(s.speed, 2) + ' m/s · ' +
             fmt(s.cadence, 0) + ' steps/min · double support ' +
             fmt(e.lto + (e.rto - e.lhs), 0) + '% of the cycle',
          ax.W / 2, ax.H - 24, { size: 11.5, color: K.MUT });
    label(c, 'events from the markers; the orange tick is right toe-off from the force plate, ' +
             fmt(e.rto_plate - e.rto, 1) + '% later',
          ax.W / 2, ax.H - 8, { size: 11, color: K.ORG });
  }

  u.ctl.className = 'ictls g2';
  var sP = slider(u.ctl, 'Gait cycle', 0, 100, 0.5, S.pc,
                  function (v) { return fmt(v, 0) + '%'; },
                  function (v) { S.pc = v; draw(); });
  sP.quiet(S.pc);
  var row2 = ctlRow(u.ctl);
  if (nsub() > 1) {
    keepOut(chips(row2, GD.subs.map(function (x, q) { return [q, x.subject]; }), 0,
                  function (v) { S.sub = v; draw(); }));
  }
  var pb = playBtn(u.ctl, '▶ Walk');
  var rd = readout(u.ctl);
  rd.innerHTML = 'Stance is about <b>60%</b> and swing <b>40%</b>, and both feet are down twice ' +
    'per cycle — that is what makes this walking rather than running. Left heel strike lands at ' +
    '<b>52%</b> rather than 50: almost everybody is slightly asymmetric. Switch subjects and the ' +
    'faster walker spends less time in double support, which is the textbook relationship.';

  var raf = null, t0 = 0, base = 0;
  function tick(t) {
    if (!t0) t0 = t;
    var p = base + (t - t0) / (GD.subs[S.sub].cycle_s * 2400) * 100;
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
   2. SPEED — velocity = step length x cadence

   His slide 8 states the relationship and leaves it there.  The iso-speed
   curves are arithmetic; the two dots are the measured subjects, and they
   land on the curve they should because the relationship is a definition
   rather than an approximation.
   ====================================================================== */
D.register('speed', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  var ax = new Axes(u.cv, { w: port ? 440 : 470, h: port ? 360 : 330,
                            padl: 56, padr: 16, padt: 16, padb: 74, fluid: false });
  var c = ax.c;

  function draw() {
    var K = C();
    ax.clear();
    ax.setRange(80, 140, 35, 95);
    ax.frame({ grid: true, xticks: [80, 100, 120, 140], yticks: [40, 55, 70, 85],
               ylabel: 'Step length (cm)', ysize: 13 });
    label(c, 'Cadence (steps/min)', (ax.pl + ax.W - ax.pr) / 2, ax.H - ax.pb + 30,
          { size: 13, weight: 700, color: K.INK });

    /* lines of constant walking speed: v = cadence/60 x step length */
    [0.8, 1.0, 1.2, 1.4, 1.6].forEach(function (v) {
      var pts = [], cd;
      for (cd = 80; cd <= 140; cd += 2) pts.push([cd, v / (cd / 60) * 100]);
      ax.poly(pts, { color: K.GRID, width: 1.4 });
      var y = v / (138 / 60) * 100;
      if (y > 36 && y < 94) {
        label(c, fmt(v, 1) + ' m/s', ax.X(138), ax.Y(y) - 9,
              { size: 10.5, color: K.MUT, align: 'right' });
      }
    });

    if (GD) {
      GD.subs.forEach(function (s, i) {
        var step = s.sp.stride / 2;
        var col = i ? K.BLUE : K.ACC;
        ax.dots([[s.cadence, step]], { color: col, r: 6 });
        label(c, s.subject, ax.X(s.cadence) + 10, ax.Y(step) - 2,
              { size: 11.5, color: col, align: 'left', plate: true });
        label(c, fmt(s.cadence / 60 * step / 100, 2) + ' m/s',
              ax.X(s.cadence) + 10, ax.Y(step) + 12,
              { size: 10.5, color: col, align: 'left', plate: true });
      });
    }
    label(c, 'Two ways to walk faster: longer steps, or more of them.',
          ax.W / 2, ax.H - 32, { size: 11, color: K.MUT });
    label(c, 'The dots are measured; the curves are arithmetic.',
          ax.W / 2, ax.H - 16, { size: 11, color: K.MUT });
  }
  node._draw = draw;
  draw();
});

/* ======================================================================
   3. SPATIAL — his footprint diagram, measured

   His slides 6, 7, 10 and 11.  The feet are drawn from the heel and toe
   markers at the instant each one made contact, seen from above, and every
   quantity on the figure is computed from those positions.

   Two deliberate honesty points are built in.  Step width comes out about
   a centimetre narrower than the authors' own value on both subjects,
   because a heel marker is not the midpoint of a heel, and both numbers
   are shown.  And the foot's long axis runs to the midpoint of the
   metatarsal heads: taking it to the first metatarsal marker alone, which
   is the obvious thing to do, reports several degrees of toe-IN that is
   not there, and the toggle shows that too.
   ====================================================================== */
D.register('spatial', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!GD) return;
  var S = { sub: 0, bad: 0 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1090, h: port ? 540 : 372,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* the three contacts that bound one stride: right, then left, then right */
  function contacts(s) {
    var e = s.ev;
    return [{ side: 'R', f: fat(s, 0), lab: 'right contact' },
            { side: 'L', f: fat(s, e.lhs), lab: 'left contact' },
            { side: 'R', f: fat(s, 100), lab: 'right contact' }];
  }

  function draw() {
    var K = C(), s = GD.subs[S.sub], sp = s.sp;
    ax.clear();
    var stack = port;
    var split = stack ? ax.H * 0.46 : ax.W * 0.62;
    /* a true-scale footprint diagram is a wide thin band, so give it one
       rather than a tall box it cannot fill */
    var box = stack ? { x: 6, y: 4, w: ax.W - 12, h: split - 8 }
                    : { x: 4, y: 40, w: split - 10, h: ax.H - 110 };

    var cs = contacts(s);
    /* the world box: the two footprints plus room for the dimension lines */
    var xs = [], zs = [];
    cs.forEach(function (q) {
      ['heel', 'toe'].forEach(function (k) {
        var v = jp(s, q.f, k + q.side);
        xs.push(v[0]); zs.push(v[2]);
      });
    });
    var x0 = Math.min.apply(null, xs) - 12, x1 = Math.max.apply(null, xs) + 12;
    var z0 = Math.min.apply(null, zs) - 30, z1 = Math.max.apply(null, zs) + 17;
    /* seen from above with the direction of travel running left to right,
       which is the shape of the space and the way his own figure is drawn.
       Screen x is travel; screen y is the subject's LEFT, so the left foot
       plots above the right. */
    var sc = new Scene(c, box).fit(x0, -z1, x1, -z0, 10);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    function foot(q, col) {
      var h = jp(s, q.f, 'heel' + q.side), t = jp(s, q.f, 'toe' + q.side);
      /* an outline around the heel-to-toe axis, widened to look like a foot */
      var dx = t[0] - h[0], dz = t[2] - h[2], m = Math.hypot(dx, dz) || 1;
      var ux = dx / m, uz = dz / m, nx = -uz, nz = ux;
      var W1 = 3.0, W2 = 4.4, EX = 4.5;
      var pts = [[h[0] - ux * 2 + nx * W1, h[2] - uz * 2 + nz * W1],
                 [t[0] + ux * EX + nx * W2, t[2] + uz * EX + nz * W2],
                 [t[0] + ux * (EX + 2.5), t[2] + uz * (EX + 2.5)],
                 [t[0] + ux * EX - nx * W2, t[2] + uz * EX - nz * W2],
                 [h[0] - ux * 2 - nx * W1, h[2] - uz * 2 - nz * W1]];
      c.save();
      c.fillStyle = col; c.globalAlpha = .28; c.beginPath();
      pts.forEach(function (p, i) { i ? c.lineTo(sc.X(p[0]), sc.Y(-p[1])) : c.moveTo(sc.X(p[0]), sc.Y(-p[1])); });
      c.closePath(); c.fill();
      c.globalAlpha = 1; c.strokeStyle = col; c.lineWidth = 1.6; c.stroke();
      /* the foot's long axis, and the line of progression through the heel */
      c.setLineDash([4, 3]); c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(sc.X(h[0]), sc.Y(-h[2]));
      c.lineTo(sc.X(t[0] + ux * EX), sc.Y(-(t[2] + uz * EX))); c.stroke();
      /* the line of progression through this heel, for the foot angle */
      c.strokeStyle = K.GRID;
      c.beginPath(); c.moveTo(sc.X(h[0]), sc.Y(-h[2])); c.lineTo(sc.X(h[0] + 26), sc.Y(-h[2]));
      c.stroke();
      c.restore();
      return { h: h, t: t };
    }
    var fR0 = foot(cs[0], K.ACC), fL = foot(cs[1], K.BLUE), fR1 = foot(cs[2], K.ACC);

    /* --- the dimension lines ----------------------------------------- */
    function dimX(zc, a, b, col, txt, up) {       /* along the direction of travel */
      c.save(); c.strokeStyle = col; c.lineWidth = 1.5; c.setLineDash([5, 3]);
      c.beginPath(); c.moveTo(sc.X(a), sc.Y(-zc)); c.lineTo(sc.X(b), sc.Y(-zc)); c.stroke();
      c.setLineDash([]);
      [a, b].forEach(function (v) {
        c.beginPath(); c.moveTo(sc.X(v), sc.Y(-zc) - 5); c.lineTo(sc.X(v), sc.Y(-zc) + 5); c.stroke();
      });
      c.restore();
      label(c, txt, (sc.X(a) + sc.X(b)) / 2, sc.Y(-zc) + (up ? -10 : 12),
            { size: 11.5, color: col, plate: true });
    }
    /* the stride caption goes on the far side of its own line from the two
       step captions; on a phone the scale is small enough that putting them
       on facing sides ran them together */
    dimX(z0 + 7, fR0.h[0], fR1.h[0], K.VIO, 'stride ' + fmt(sp.stride, 1) + ' cm', true);
    dimX(z0 + 18, fR0.h[0], fL.h[0], K.BLUE, 'step L ' + fmt(sp.stepL, 1), true);
    dimX(z0 + 18, fL.h[0], fR1.h[0], K.ACC, 'step R ' + fmt(sp.stepR, 1), true);
    /* step width, across the direction of travel */
    var xw = (fR0.h[0] + fL.h[0]) / 2;
    c.save(); c.strokeStyle = K.GRN; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(sc.X(xw), sc.Y(-fR0.h[2])); c.lineTo(sc.X(xw), sc.Y(-fL.h[2]));
    c.stroke(); c.restore();
    label(c, 'width ' + fmt(sp.width, 1) + ' cm', sc.X(xw) + 9,
          (sc.Y(-fR0.h[2]) + sc.Y(-fL.h[2])) / 2,
          { size: 11.5, color: K.GRN, align: 'left', plate: true });

    /* the foot progression angles */
    [[cs[0], sp.toeR, K.ACC], [cs[1], sp.toeL, K.BLUE]].forEach(function (q) {
      var h = jp(s, q[0].f, 'heel' + q[0].side);
      label(c, (q[1] > 0 ? '+' : '') + fmt(q[1], 1) + '°', sc.X(h[0] + 16),
            sc.Y(-h[2]) + (q[0].side === 'R' ? 13 : -13),
            { size: 11.5, color: q[2], plate: true });
    });
    label(c, 'seen from above · travelling left to right · left foot above, right below',
          box.x + box.w / 2, box.y + 12, { size: 11.5, color: K.MUT });
    c.restore();

    /* ------------------------- the numbers ---------------------------- */
    var px = stack ? 8 : split, pw = stack ? ax.W - 16 : ax.W - split - 10;
    var py = stack ? split + 4 : 10, fs = 13.5, lh = 21;
    var ph = stack ? ax.H - py - 10 : ax.H - 20;
    c.save();
    c.fillStyle = K.PANEL; c.fillRect(px, py, pw, ph);
    c.strokeStyle = K.GRID; c.lineWidth = 1; c.strokeRect(px + .5, py + .5, pw - 1, ph - 1);
    c.restore();
    var y = py + 16;
    function line(txt, o) {
      o = o || {};
      label(c, txt, px + 13, y, { align: 'left', size: o.size || fs,
                                  color: o.color || K.INK, weight: o.weight || 600 });
      y += o.gap || lh;
    }
    line(s.subject + ' · ' + s.height_cm + ' cm · ' + fmt(s.speed, 2) + ' m/s',
         { color: K.MUT, weight: 700, gap: 24 });
    line('stride length      ' + fmt(sp.stride, 1) + ' cm', { color: K.VIO, weight: 700 });
    line('  the authors’ own value ' + fmt(sp.stride_ds, 1) + ' cm — agrees to ' +
         fmt(Math.abs(sp.stride - sp.stride_ds), 1) + ' cm',
         { color: K.MUT, size: fs - 2, gap: lh * 1.2 });
    line('step length   R ' + fmt(sp.stepR, 1) + '   L ' + fmt(sp.stepL, 1) + ' cm');
    line('  they sum to ' + fmt(sp.stepR + sp.stepL, 1) + ' cm, which is the stride',
         { color: K.MUT, size: fs - 2, gap: lh * 1.2 });
    line('step width         ' + fmt(sp.width, 1) + ' cm', { color: K.GRN, weight: 700 });
    line('  the authors say ' + fmt(sp.width_ds, 1) + ' cm — a heel marker is not',
         { color: K.ACC, size: fs - 2, gap: lh * 0.78 });
    line('  the midpoint of a heel, and the gap is the definition',
         { color: K.ACC, size: fs - 2, gap: lh * 1.2 });
    line('toe-out       R ' + fmt(sp.toeR, 1) + '°   L ' + fmt(sp.toeL, 1) +
         '°   (textbook ≈ 7°)', { weight: 700 });
    if (S.bad) {
      line('  off the first metatarsal marker alone you would get',
           { color: K.ACC, size: fs - 2, gap: lh * 0.78 });
      line('  toe-IN instead: that marker sits medial to the heel',
           { color: K.ACC, size: fs - 2 });
    } else {
      line('  measured to the midpoint of the metatarsal heads',
           { color: K.MUT, size: fs - 2 });
    }
  }

  var row = ctlRow(u.ctl);
  if (nsub() > 1) {
    keepOut(chips(row, GD.subs.map(function (x, q) { return [q, x.subject]; }), 0,
                  function (v) { S.sub = v; draw(); }));
  }
  var tb = el('button', 'icalc-chip'); tb.textContent = 'Why not the toe marker?';
  tb.setAttribute('data-unsafe', '1');
  tb.addEventListener('click', function () {
    S.bad = S.bad ? 0 : 1; tb.classList.toggle('on', !!S.bad); draw();
  });
  row.appendChild(tb);
  var rd = readout(u.ctl);
  rd.innerHTML = 'Stride length computed here from the heel markers lands within two millimetres ' +
    'of the authors’ own published value, which is the check that the method works. Step width ' +
    'does <b>not</b> agree, by the same centimetre on both subjects — that is a difference of ' +
    'definition, not an error, and the figure prints both rather than hiding it.';

  node._draw = draw;
  draw();
});


/* ======================================================================
   4. ASYM — how symmetric is a normal walk?

   His slide 9 draws three cases: a normal man and two patients with hip
   disease.  The top row here is measured instead, and the slider shortens
   stance on one side the way pain does, so that the knock-on effects are
   visible: the other limb's stance has to lengthen, both double-support
   periods move, and the step lengths go unequal.
   ====================================================================== */
D.register('asym', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!GD) return;
  var S = { sub: 0, shift: 0 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1040, h: port ? 336 : 352,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* Taking `d` per cent off the affected limb's stance has to be paid for.
     The cycle is still a cycle, so the other limb's stance grows by the
     same amount and both double-support periods move with it. */
  function model(s, d) {
    var e = s.ev;
    var rSt = e.rto - d;                       /* affected (right) stance */
    var lSt = (100 - e.lhs) + e.lto + d;       /* sound (left) stance */
    var ds1 = Math.max(0, e.lto - d * 0.5);    /* first double support */
    var ds2 = Math.max(0, (e.rto - e.lhs) - d * 0.5);
    return { rSt: rSt, lSt: lSt, ds1: ds1, ds2: ds2,
             lto: ds1, lhs: rSt - ds2, rto: rSt };
  }

  var CASES = [
    { n: 'patient, avascular necrosis of the left hip', a: 58, b: 69, src: 'his slide' },
    { n: 'patient, osteoarthritis of the left hip', a: 60, b: 80, src: 'his slide' }
  ];

  function draw() {
    var K = C(), s = GD.subs[S.sub];
    ax.clear();
    var m = model(s, S.shift);
    var x0 = port ? 14 : 160, x1 = ax.W - (port ? 62 : 74), w = x1 - x0;
    var y = port ? 46 : 34, rh = port ? 17 : 20, gp = 4, blk = port ? 70 : 62;

    function pair(title, aSt, bSt, aLab, bLab, hot) {
      /* on a phone there is no column to the left of the bars, so the row's
         name goes above them instead of being clipped against the edge */
      if (port) {
        label(c, title, x0, y - 9,
              { size: 10.5, align: 'left', color: hot ? K.ACC : K.MUT,
                weight: hot ? 700 : 600 });
      } else {
        label(c, title, x0 - 10, y + rh + gp / 2,
              { size: 11.5, align: 'right', color: hot ? K.ACC : K.MUT,
                weight: hot ? 700 : 600 });
      }
      [[aSt, aLab, K.ACCFILL, K.ACC], [bSt, bLab, K.FILL2, K.BLUE]].forEach(function (q, i) {
        phaseBar(c, ax, x0, y + i * (rh + gp), w, rh,
                 [[0, q[0], q[2], 'stance ' + fmt(q[0], 0) + '%'],
                  [q[0], 100, K.SOFT, 'swing ' + fmt(100 - q[0], 0) + '%']], { minw: 40 });
        label(c, q[1], x1 + 7, y + i * (rh + gp) + rh / 2,
              { size: 10.5, align: 'left', color: q[3] });
      });
      y += blk;
    }

    pair('measured · ' + s.subject, m.rSt, m.lSt,
         S.shift > 0.4 ? 'affected' : 'right', S.shift > 0.4 ? 'sound' : 'left', S.shift > 0.4);
    CASES.forEach(function (q) { pair(q.n, q.a, q.b, 'painful limb', 'sound limb', false); });

    /* the axis */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0, y - gp); c.lineTo(x1, y - gp); c.stroke();
    [0, 20, 40, 60, 80, 100].forEach(function (t) {
      var xx = x0 + t / 100 * w;
      c.beginPath(); c.moveTo(xx, y - gp); c.lineTo(xx, y - gp + 4); c.stroke();
      label(c, t + '%', xx, y - gp + 13, { size: 10.5, color: K.MUT });
    });
    c.restore();
    label(c, 'per cent of the gait cycle', (x0 + x1) / 2, y + 26,
          { size: 12, weight: 700, color: K.INK });

    var diff = Math.abs(m.rSt - m.lSt);
    label(c, S.shift < 0.4
          ? 'measured asymmetry ' + fmt(diff, 1) + ' per cent — that is the noise floor a limp has to beat'
          : fmt(S.shift, 1) + '% taken off the affected limb → ' + fmt(diff, 1) +
            '% stance asymmetry, double support ' + fmt(m.ds1 + m.ds2, 0) + '%',
          ax.W / 2, ax.H - 24,
          { size: 12.5, color: S.shift < 0.4 ? K.GRN : K.ACC, weight: 650 });
    label(c, 'the lower two rows are his figure, for comparison',
          ax.W / 2, ax.H - 8, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sS = slider(u.ctl, 'Unload the right limb', 0, 12, 0.5, S.shift,
                  function (v) { return v < 0.4 ? 'none' : fmt(v, 1) + '%'; },
                  function (v) { S.shift = v; draw(); });
  sS.quiet(S.shift);
  var row = ctlRow(u.ctl);
  if (nsub() > 1) {
    keepOut(chips(row, GD.subs.map(function (x, q) { return [q, x.subject]; }), 0,
                  function (v) { S.sub = v; draw(); }));
  }
  var rd = readout(u.ctl);
  rd.innerHTML = 'A healthy walk is close to symmetric and not quite — a per cent or two, ' +
    'repeatable, and nothing to do with pathology. Drag the slider and watch what <b>has</b> to ' +
    'move with it: the sound limb’s stance lengthens and both double-support periods shift, ' +
    'because the cycle still has to be a cycle. That is why gait variables are so correlated ' +
    'with one another.';

  node._draw = draw;
  draw();
});

/* ======================================================================
   5. JOINT — angle, moment and muscle, one joint at a time

   His slides 18, 19 and 38 to 40, rebuilt from measurement.  Three panels
   is the minimum needed to say anything useful about a joint: the moment
   alone is ambiguous, with the angle it says concentric or eccentric, and
   with the EMG it names the muscle.

   The muscles shown per joint are the ones his own figures pair with each
   joint, restricted to the channels a surface electrode can actually
   reach.  Iliopsoas is on his hip figure and is not here, and the widget
   says so rather than leaving a silent gap.
   ====================================================================== */
D.register('joint', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!GD) return;
  var S = { j: 'knee', sub: 0, pc: 6 };

  var JN = { hip: 'Hip', knee: 'Knee', ank: 'Ankle' };
  var POS = { hip: ['extensor', 'flexor'], knee: ['extensor', 'flexor'],
              ank: ['plantarflexor', 'dorsiflexor'] };
  var APOS = { hip: ['flexion', 'extension'], knee: ['flexion', 'extension'],
               ank: ['dorsiflexion', 'plantarflexion'] };
  /* which measured channels belong to which joint, following his figures */
  var MUS = { hip: ['gluteus maximus', 'biceps femoris'],
              knee: ['vastus medialis', 'rectus femoris', 'gastrocnemius med.'],
              ank: ['gastrocnemius med.', 'soleus', 'tibialis anterior'] };
  var MISSING = { hip: 'iliopsoas drives the flexor moment in pre-swing and no surface ' +
                       'electrode reaches it', knee: '', ank: '' };

  var ax = new Axes(u.cv, { w: port ? 460 : 1090, h: port ? 660 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function draw() {
    var K = C(), s = GD.subs[S.sub], e = s.ev;
    ax.clear();
    var stack = port;
    var cols = stack ? 1 : 3, top = 28, foot = 108;
    var cw = ax.W / cols;
    /* stacked, each panel needs room under it for its own tick row; without
       the gap the ticks landed inside the next panel's plot */
    var gap = stack ? 44 : 0;
    var ch = stack ? (ax.H - top - foot - 2 * gap) / 3 : ax.H - top - foot;
    var muscles = MUS[S.j];

    function panel(k, kind) {
      var px = stack ? 0 : k * cw, py = stack ? top + k * (ch + gap) : top;
      var a2 = sub(ax, px + 56, py, ax.W - (px + cw) + 18, ax.H - (py + ch));
      var ser, lo, hi, col, ttl, zero = true;
      if (kind === 'ang') {
        ser = s.ang[S.j]; col = K.BLUE; ttl = 'Joint angle (°)';
      } else if (kind === 'mom') {
        ser = s.mom[S.j]; col = K.INK; ttl = 'Internal moment (N·m/kg)';
      } else {
        ser = null; col = K.GRN; ttl = 'Muscle activity (% of peak)';
      }
      if (ser) {
        lo = Math.min.apply(null, ser); hi = Math.max.apply(null, ser);
        var pad = (hi - lo) * 0.16; lo -= pad; hi += pad;
      } else { lo = 0; hi = 105 * muscles.length; zero = false; }
      a2.setRange(0, 100, lo, hi);
      a2.rect(0, lo, e.rto_plate, hi, { fill: K.FILL0 });
      a2.frame({ grid: false, zero: zero, xticks: [0, 20, 40, 60, 80, 100],
                 yticks: ser ? axisTicks(lo, hi).filter(function (v) { return v > lo && v < hi; }) : [],
                 yfmt: function (v) { return minus(kind === 'ang' ? v.toFixed(0) : v.toFixed(1)); } });
      label(c, ttl, (a2.pl + ax.W - a2.pr) / 2, py - 13,
            { size: 12.5, weight: 700, color: K.INK });

      if (ser) {
        a2.poly(ser.map(function (v, q) { return [q, v]; }), { color: col, width: 2.6 });
        a2.dots([[S.pc, ser[Math.round(S.pc)]]], { color: K.VIO, r: 4.5 });
        /* which way is positive */
        label(c, '↑ ' + (kind === 'ang' ? APOS[S.j][0] : POS[S.j][0]),
              ax.W - a2.pr - 6, py + 12, { size: 10.5, align: 'right', color: K.MUT });
        label(c, '↓ ' + (kind === 'ang' ? APOS[S.j][1] : POS[S.j][1]),
              ax.W - a2.pr - 6, ax.H - a2.pb - 10, { size: 10.5, align: 'right', color: K.MUT });
      } else {
        muscles.forEach(function (nm, i) {
          var ch2 = null;
          s.emg.forEach(function (q) { if (q.n === nm) ch2 = q; });
          if (!ch2) return;
          var base = (muscles.length - 1 - i) * 105;
          var flat = Math.max.apply(null, ch2.e) /
                     (ch2.e.slice().sort(function (a, b) { return a - b; })[50] || 1);
          var dull = flat < 2.5;
          c.save(); c.fillStyle = dull ? K.GRID : K.GRN; c.globalAlpha = .42;
          c.beginPath(); c.moveTo(a2.X(0), a2.Y(base));
          ch2.e.forEach(function (v, q) { c.lineTo(a2.X(q), a2.Y(base + v)); });
          c.lineTo(a2.X(100), a2.Y(base)); c.closePath(); c.fill(); c.restore();
          a2.poly(ch2.e.map(function (v, q) { return [q, base + v]; }),
                  { color: dull ? K.MUT : K.GRN, width: 1.4 });
          label(c, nm + (dull ? '  ⚠ barely modulates' : ''), a2.pl + 8, a2.Y(base + 92),
                { size: 10.5, align: 'left', color: dull ? K.ACC : K.INK, weight: 650 });
        });
      }
      /* the playhead, down every panel */
      c.save(); c.strokeStyle = K.VIO; c.lineWidth = 1.8; c.globalAlpha = .9;
      c.beginPath(); c.moveTo(a2.X(S.pc), a2.Y(lo)); c.lineTo(a2.X(S.pc), a2.Y(hi));
      c.stroke(); c.restore();
      /* stacked, only the bottom panel carries the axis caption */
      if (!stack || k === 2) {
        label(c, 'Gait cycle (%)', (a2.pl + ax.W - a2.pr) / 2, ax.H - a2.pb + 30,
              { size: 12, weight: 700, color: K.INK });
      }
    }

    panel(0, 'ang'); panel(1, 'mom'); panel(2, 'emg');
    if (!stack) {
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
      c.beginPath(); c.moveTo(cw, 16); c.lineTo(cw, ax.H - foot + 6);
      c.moveTo(2 * cw, 16); c.lineTo(2 * cw, ax.H - foot + 6); c.stroke(); c.restore();
    }

    /* --- what is happening at the playhead ---------------------------- */
    var i = Math.round(S.pc);
    var mo = s.mom[S.j][i];
    var dA = s.ang[S.j][Math.min(100, i + 2)] - s.ang[S.j][Math.max(0, i - 2)];
    var momPos = mo > 0.02, angPos = dA > 0.25, angNeg = dA < -0.25;
    var kind = (!angPos && !angNeg) ? 'isometric'
             : ((momPos && angNeg) || (!momPos && angPos)) ? 'concentric' : 'eccentric';
    label(c, 'At ' + fmt(S.pc, 0) + '% — ' + JN[S.j].toLowerCase() + ' moment ' +
             (Math.abs(mo) < 0.02 ? 'near zero' : fmt(Math.abs(mo), 2) + ' N·m/kg ' +
             (momPos ? POS[S.j][0] : POS[S.j][1])) + ', joint ' +
             (angPos ? APOS[S.j][0] : angNeg ? APOS[S.j][1] : 'barely moving'),
          ax.W / 2, ax.H - 46, { size: 13, color: K.INK, weight: 650 });
    label(c, Math.abs(mo) < 0.02 ? 'nothing much to account for here'
          : 'so that muscle group is working ' + kind.toUpperCase() +
            (kind === 'eccentric' ? 'ALLY — lengthening under load, absorbing energy'
             : kind === 'concentric' ? 'ALLY — shortening, doing positive work' : ''),
          ax.W / 2, ax.H - 28,
          { size: 12.5, color: kind === 'eccentric' ? K.ACC : K.GRN, weight: 650 });
    label(c, 'Measured · ' + s.subject + ' · shaded = stance' +
             (MISSING[S.j] ? ' · ' + MISSING[S.j] : ''),
          ax.W / 2, ax.H - 10, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sP = slider(u.ctl, 'Gait cycle', 0, 100, 1, S.pc,
                  function (v) { return fmt(v, 0) + '%'; },
                  function (v) { S.pc = v; draw(); });
  sP.quiet(S.pc);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['hip', 'Hip'], ['knee', 'Knee'], ['ank', 'Ankle']], S.j,
               function (v) { S.j = v; draw(); }));
  if (nsub() > 1) {
    keepOut(chips(row, GD.subs.map(function (x, q) { return [q, x.subject]; }), 0,
                  function (v) { S.sub = v; draw(); }));
  }
  var rd = readout(u.ctl);
  rd.innerHTML = 'With <b>Knee</b> selected, put the playhead at <b>6%</b>: the knee is flexing, ' +
    'the moment is extensor and vastus medialis is on — the quadriceps are lengthening while they ' +
    'resist, lowering the body rather than lifting it. Move to <b>14%</b> and the same muscles are ' +
    'now shortening. Then try <b>Ankle</b> at <b>35%</b>, where the plantarflexors are lengthening ' +
    'at four times the moment — and at <b>50%</b>, where they have turned concentric.';
  node._draw = draw;
  draw();
});

/* ======================================================================
   6. GRF — the three force components, measured

   His slides 21 and 25 to 28.  Everything is in body weights, because
   that is the only way two people of different mass can share an axis,
   and every landmark his slides quote is printed from the recording
   rather than asserted.
   ====================================================================== */
D.register('grf', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!GD) return;
  var S = { pc: 15, sub: 0 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1090, h: port ? 680 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;
  var ROWS = [['fy', 'Vertical', 'body weights'],
              ['fx', 'Anteroposterior', '+ forward'],
              ['fz', 'Mediolateral', '+ to the right']];

  function pcStance(s, p) { return p / s.ev.rto_plate * 100; }

  function draw() {
    var K = C(), s = GD.subs[S.sub], BW = bodyWeight(s);
    ax.clear();
    var figW = port ? 0 : ax.W * 0.26;
    var top = 20, foot = 114, gp = 19;
    var rh = (ax.H - top - foot - gp * 2) / 3;
    var live = onPlate(s, S.pc);
    var ips = Math.max(0, Math.min(s.ng - 1, gat(s, S.pc)));

    /* --------------------- the walker, in stance -------------------- */
    if (figW > 0) {
      var box = { x: 4, y: 16, w: figW - 10, h: ax.H - 60 };
      var f = fat(s, S.pc);
      var hip = jp(s, f, 'hipR');
      var sc = new Scene(c, box).fit(hip[0] - 62, -6, hip[0] + 62, 178, 8);
      c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
      c.beginPath(); c.moveTo(box.x, sc.Y(0)); c.lineTo(box.x + box.w, sc.Y(0));
      c.stroke(); c.restore();
      figure(c, s, sc, f, {});
      if (live) {
        var fsc = 56 / BW;
        arrow(c, sc.X(s.cx[ips]), sc.Y(s.cy[ips]),
              sc.X(s.cx[ips] + s.fx[ips] * fsc), sc.Y(s.cy[ips] + s.fy[ips] * fsc),
              { color: K.ACC, width: 3.4, head: 12 });
      }
      label(c, live ? 'on the plate' : 'swing — off the plate',
            box.x + box.w / 2, box.y + 10, { size: 11.5, color: live ? K.ACC : K.MUT });
      c.restore();
    }

    /* ------------------------- the three traces ---------------------- */
    ROWS.forEach(function (R, n) {
      var y0 = top + n * (rh + gp);
      var a2 = sub(ax, figW + 66, y0, 24, ax.H - (y0 + rh));
      var ser = s[R[0]].map(function (v) { return v / BW; });
      var lo = Math.min.apply(null, ser), hi = Math.max.apply(null, ser);
      if (R[0] === 'fy') { lo = 0; hi = Math.max(1.4, hi * 1.08); }
      else { var m = Math.max(Math.abs(lo), Math.abs(hi)) * 1.25; lo = -m; hi = m; }
      a2.setRange(0, 100, lo, hi);
      a2.frame({ grid: true, zero: R[0] !== 'fy',
                 xticks: n === 2 ? [0, 20, 40, 60, 80, 100] : [],
                 yticks: R[0] === 'fy' ? [0, 0.5, 1.0] : [Math.round(lo * 10) / 10, 0, Math.round(hi * 10) / 10],
                 yfmt: function (v) { return minus(v.toFixed(R[0] === 'fy' ? 1 : 2)); } });
      a2.poly(ser.map(function (v, q) { return [q / (s.ng - 1) * 100, v]; }),
              { color: K.INK, width: 2.4 });
      if (R[0] === 'fy') {
        c.save(); c.strokeStyle = K.ORG; c.lineWidth = 1.3; c.setLineDash([5, 4]);
        c.beginPath(); c.moveTo(a2.X(0), a2.Y(1)); c.lineTo(a2.X(100), a2.Y(1)); c.stroke();
        c.restore();
        /* below the line, at the right, where the trace has already fallen
           away -- above it runs into the panel's own caption row */
        label(c, '1 body weight', a2.X(99), a2.Y(1) + 13,
              { size: 10.5, color: K.ORG, align: 'right', plate: true });
      }
      label(c, R[1], a2.pl + 8, y0 + 11, { size: 12.5, weight: 700, align: 'left', plate: true });
      label(c, R[2], ax.W - a2.pr - 6, y0 + 11,
            { size: 10.5, color: K.MUT, align: 'right' });
      /* the landmark numbers his slides quote */
      var pk = function (a, lo2, hi2, mx) {
        var b = mx ? -9 : 9, j = 0;
        for (var q = lo2; q < hi2; q++) { if (mx ? a[q] > b : a[q] < b) { b = a[q]; j = q; } }
        return [b, j / (s.ng - 1) * 100];
      };
      if (R[0] === 'fy') {
        var p1 = pk(ser, 0, Math.round(s.ng * .45), 1),
            vv = pk(ser, Math.round(s.ng * .3), Math.round(s.ng * .7), 0),
            p2 = pk(ser, Math.round(s.ng * .55), s.ng, 1);
        [[p1, 'peak 1'], [vv, 'valley'], [p2, 'peak 2']].forEach(function (q) {
          a2.dots([[q[0][1], q[0][0]]], { color: K.ACC, r: 3.6 });
          label(c, fmt(q[0][0], 2), a2.X(q[0][1]), a2.Y(q[0][0]) - 11,
                { size: 10.5, color: K.ACC, plate: true });
        });
      } else {
        var mn = pk(ser, 0, s.ng, 0), mxv = pk(ser, 0, s.ng, 1);
        label(c, fmt(mn[0] * 100, 0) + '% to +' + fmt(mxv[0] * 100, 0) + '% of body weight',
              a2.X(50), a2.Y(hi) + 12, { size: 10.5, color: K.MUT });
      }
      /* the playhead */
      var ph = Math.max(0, Math.min(100, pcStance(s, S.pc)));
      c.save(); c.strokeStyle = K.VIO; c.lineWidth = 1.8; c.globalAlpha = live ? .9 : .3;
      c.beginPath(); c.moveTo(a2.X(ph), a2.Y(lo)); c.lineTo(a2.X(ph), a2.Y(hi));
      c.stroke(); c.restore();
      if (live) a2.dots([[ph, ser[ips]]], { color: K.VIO, r: 4 });
      if (n === 2) {
        label(c, 'Per cent of stance', (a2.pl + ax.W - a2.pr) / 2, ax.H - a2.pb + 28,
              { size: 12, weight: 700, color: K.INK });
      }
    });

    label(c, live
          ? 'at ' + fmt(S.pc, 0) + '% of the cycle — vertical ' + fmt(s.fy[ips] / BW, 2) +
            ' BW, fore–aft ' + (s.fx[ips] < 0 ? 'braking ' : 'propelling ') +
            fmt(Math.abs(s.fx[ips] / BW) * 100, 0) + '% BW'
          : 'at ' + fmt(S.pc, 0) + '% of the cycle the foot is off the ground',
          ax.W / 2, ax.H - 56, { size: 12.5, color: live ? K.INK : K.MUT, weight: 650 });

    /* At a steady speed the two fore-aft impulses must cancel.  On a short
       overground walkway they often do not, because the subject is still
       gathering speed -- so the figure reports the balance rather than
       asserting the principle and hoping. */
    var bk = 0, pr = 0, q;
    for (q = 0; q < s.ng; q++) { if (s.fx[q] < 0) bk += s.fx[q]; else pr += s.fx[q]; }
    var bal = (pr + bk) / Math.abs(bk) * 100;
    label(c, 'braking impulse ' + fmt(Math.abs(bk) / s.ghz, 1) + ' N·s against ' +
             fmt(pr / s.ghz, 1) + ' N·s propelling — ' +
             (Math.abs(bal) < 10
               ? 'they cancel to ' + fmt(Math.abs(bal), 0) + '%, so this stride was near a steady speed'
               : fmt(Math.abs(bal), 0) + '% out of balance, so this subject was still ' +
                 (bal > 0 ? 'gathering speed' : 'slowing down') + ' over the plate'),
          ax.W / 2, ax.H - 36, { size: 11.5, color: Math.abs(bal) < 10 ? K.GRN : K.ORG,
                                 weight: 600 });
    label(c, 'Measured · ' + s.subject + ' · ' + fmt(s.speed, 2) + ' m/s · stance is ' +
             fmt(s.ev.rto_plate, 0) + '% of the cycle · plate at ' + s.ghz +
             ' Hz · the record opens at ' + fmt(s.fy[0] / BW * 100, 0) +
             '% of body weight, a few milliseconds into the heel-strike transient',
          ax.W / 2, ax.H - 16, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sP = slider(u.ctl, 'Gait cycle', 0, 100, 0.5, S.pc,
                  function (v) { return fmt(v, 0) + '%'; },
                  function (v) { S.pc = v; draw(); });
  sP.quiet(S.pc);
  var row = ctlRow(u.ctl);
  if (nsub() > 1) {
    keepOut(chips(row, GD.subs.map(function (x, q) { return [q, x.subject]; }), 0,
                  function (v) { S.sub = v; draw(); }));
  }
  var pb = playBtn(u.ctl, '▶ Walk');
  var rd = readout(u.ctl);
  rd.innerHTML = 'Two humps and a valley, and the second hump is the larger. The fore–aft trace ' +
    'crosses zero at about <b>half of stance</b> — braking before, propelling after. Read the ' +
    'impulse line too: one of these strides was at a steady speed and one was not.';

  var raf = null, t0 = 0, base = 0;
  function tick(t) {
    if (!t0) t0 = t;
    var p = base + (t - t0) / (GD.subs[S.sub].cycle_s * 2400) * 100;
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
   7. FAN — the butterfly diagram, measured

   His slides 24 to 26.  Every line is one force plate sample, drawn from
   its own measured centre of pressure with its own measured magnitude and
   direction.  His figure uses a 50 ms interval; the slider goes down to 5,
   which fills the fan in and shows that the 50 ms version is a sampling of
   something continuous.
   ====================================================================== */
D.register('fan', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!GD) return;
  /* A true-scale butterfly is a narrow figure in a wide box, so put both
     subjects in it side by side -- which is also the honest way to show
     what his slides claim about between-person variability. */
  var S = { ms: 50, pc: -1, only: -1 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1070, h: port ? 560 : 420,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function one(s, box, live) {
    var K = C(), BW = bodyWeight(s);
    var step = Math.max(1, Math.round(S.ms / 1000 * s.ghz));
    var fsc = 26 / BW;                       /* body weight drawn at 26 cm */
    var x0 = Math.min.apply(null, s.cx) - 13, x1 = Math.max.apply(null, s.cx) + 15;
    var top = 0, q;
    for (q = 0; q < s.ng; q++) top = Math.max(top, s.cy[q] + s.fy[q] * fsc);
    var sc = new Scene(c, box).fit(x0, -9, x1, top + 7, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    /* the same foot at midstance, behind the fan */
    var fm = fat(s, s.ev.rto_plate * 0.5);
    var hl = jp(s, fm, 'heelR'), to = jp(s, fm, 'toeR');
    c.save();
    c.strokeStyle = K.GRN; c.lineWidth = 8; c.lineCap = 'round'; c.globalAlpha = .3;
    c.beginPath(); c.moveTo(sc.X(hl[0]), sc.Y(hl[1])); c.lineTo(sc.X(to[0]), sc.Y(to[1]));
    c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sc.X(x0), sc.Y(0)); c.lineTo(sc.X(x1), sc.Y(0)); c.stroke();
    c.restore();
    label(c, 'heel', sc.X(hl[0]), sc.Y(0) + 13, { size: 10.5, color: K.BLUE });
    label(c, 'toe', sc.X(to[0]), sc.Y(0) + 13, { size: 10.5, color: K.BLUE });

    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 1.3; c.setLineDash([6, 5]);
    c.beginPath(); c.moveTo(sc.X(x0 + 2), sc.Y(BW * fsc)); c.lineTo(sc.X(x1 - 2), sc.Y(BW * fsc));
    c.stroke(); c.restore();
    label(c, 'body weight', sc.X(x1 - 2), sc.Y(BW * fsc) - 9,
          { size: 10, color: K.MUT, align: 'right' });

    var n = 0;
    for (q = 0; q < s.ng; q += step) {
      if (s.fy[q] < 0.04 * BW) continue;
      c.save();
      c.strokeStyle = K.ACC; c.lineWidth = S.ms <= 10 ? 1.1 : 1.8;
      c.globalAlpha = S.ms <= 10 ? .5 : .9;
      c.beginPath(); c.moveTo(sc.X(s.cx[q]), sc.Y(s.cy[q]));
      c.lineTo(sc.X(s.cx[q] + s.fx[q] * fsc), sc.Y(s.cy[q] + s.fy[q] * fsc));
      c.stroke(); c.restore();
      n++;
    }
    if (live >= 0 && onPlate(s, live)) {
      var i = gat(s, live);
      arrow(c, sc.X(s.cx[i]), sc.Y(s.cy[i]),
            sc.X(s.cx[i] + s.fx[i] * fsc), sc.Y(s.cy[i] + s.fy[i] * fsc),
            { color: K.VIO, width: 3.2, head: 11 });
      label(c, fmt(s.fy[i] / BW, 2) + ' BW', sc.X(s.cx[i] + s.fx[i] * fsc),
            sc.Y(s.cy[i] + s.fy[i] * fsc) - 11, { size: 11.5, color: K.VIO, plate: true });
    }
    c.restore();
    label(c, s.subject + ' · ' + fmt(s.speed, 2) + ' m/s · peak ' +
             fmt(Math.max.apply(null, s.fy) / BW, 2) + ' BW',
          box.x + box.w / 2, box.y + 12, { size: 12, color: K.INK, weight: 650 });
    return n;
  }

  function draw() {
    var K = C();
    ax.clear();
    var subs = GD.subs, k = subs.length;
    var bh = ax.H - 76;
    var n = 0;
    if (port) {
      n = one(subs[0], { x: 4, y: 6, w: ax.W - 8, h: bh }, S.pc);
    } else {
      subs.forEach(function (s, i) {
        n = one(s, { x: 6 + i * (ax.W / k), y: 6, w: ax.W / k - 12, h: bh }, S.pc);
      });
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
      c.beginPath(); c.moveTo(ax.W / 2, 20); c.lineTo(ax.W / 2, bh); c.stroke(); c.restore();
    }
    label(c, n + ' force vectors each, one every ' + fmt(S.ms, 0) + ' ms of stance',
          ax.W / 2, ax.H - 50, { size: 12.5, color: K.INK, weight: 650 });
    label(c, 'leaning back at the heel = braking · upright at midstance · leaning forward at the toe = propulsion',
          ax.W / 2, ax.H - 32, { size: 11.5, color: K.MUT });
    label(c, 'Measured · both subjects · force drawn with body weight at one foot length, ' +
             'which is how his figure is scaled',
          ax.W / 2, ax.H - 12, { size: 11, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sM = slider(u.ctl, 'One vector every', 5, 80, 5, S.ms,
                  function (v) { return fmt(v, 0) + ' ms'; },
                  function (v) { S.ms = v; draw(); });
  sM.quiet(S.ms);
  var pb = playBtn(u.ctl, '▶ One vector');
  var rd = readout(u.ctl);
  rd.innerHTML = 'At <b>50 ms</b> these are his figure. Drop to <b>5 ms</b> and the fans fill in — ' +
    'the shape is continuous and his picture is a sampling of it. The dashed line is body weight. ' +
    'Compare the two: same shape, different width, because the subject on the right walks faster ' +
    'and brakes harder.';

  var raf = null, t0 = 0;
  function tick(t) {
    if (!t0) t0 = t;
    var s = GD.subs[0];
    var p = (t - t0) / (s.cycle_s * 2600) * 100;
    if (p >= s.ev.rto_plate) { t0 = t; p = 0; }
    S.pc = p; draw();
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null; S.pc = -1; pb.textContent = '▶ One vector'; draw();
  }
  pb.addEventListener('click', function () {
    if (raf) { stop(); return; }
    pb.textContent = '❚❚ Pause'; t0 = 0; raf = requestAnimationFrame(tick);
  });
  node._stop = stop;
  node._draw = draw;
  draw();
});

/* ======================================================================
   8. COP — the path under the foot

   His slide 29.  Drawn on the measured foot rather than a generic
   outline, because the heel and toe markers come from the same stride as
   the force plate record.  The dots are evenly spaced in TIME, so where
   they bunch the centre of pressure is moving slowly.
   ====================================================================== */
D.register('cop', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!GD) return;
  var S = { sub: 0, arm: 1, pc: 20 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1070, h: port ? 520 : 300,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  /* the foot, frozen at the instant it is flat on the floor */
  function flatFrame(s) { return fat(s, s.ev.rto_plate * 0.35); }

  function draw() {
    var K = C(), s = GD.subs[S.sub], BW = bodyWeight(s);
    ax.clear();
    var stack = port;
    var split = stack ? ax.H * 0.54 : ax.W * 0.56;
    var ff = flatFrame(s);
    var hl = jp(s, ff, 'heelR'), to = jp(s, ff, 'toeR'), an = jp(s, ff, 'ankR');

    /* -------------------- the foot, seen from above ------------------ */
    var box = stack ? { x: 6, y: 4, w: ax.W - 12, h: split - 10 }
                    : { x: 4, y: 26, w: split - 12, h: ax.H - 92 };
    var xs = s.cx.concat([hl[0], to[0], an[0]]);
    var zs = s.cz.concat([hl[2], to[2], an[2]]);
    var x0 = Math.min.apply(null, xs) - 8, x1 = Math.max.apply(null, xs) + 10;
    var z0 = Math.min.apply(null, zs) - 7, z1 = Math.max.apply(null, zs) + 7;
    /* travel left to right; screen y is the subject's left */
    var sc = new Scene(c, box).fit(x0, -z1, x1, -z0, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    /* a foot outline around the heel-to-toe axis */
    (function () {
      var dx = to[0] - hl[0], dz = to[2] - hl[2], m = Math.hypot(dx, dz) || 1;
      var ux = dx / m, uz = dz / m, nx = -uz, nz = ux;
      var W1 = 3.1, W2 = 4.6, EX = 5.0;
      var pts = [[hl[0] - ux * 2.5 + nx * W1, hl[2] - uz * 2.5 + nz * W1],
                 [to[0] + ux * EX + nx * W2, to[2] + uz * EX + nz * W2],
                 [to[0] + ux * (EX + 3), to[2] + uz * (EX + 3)],
                 [to[0] + ux * EX - nx * W2, to[2] + uz * EX - nz * W2],
                 [hl[0] - ux * 2.5 - nx * W1, hl[2] - uz * 2.5 - nz * W1]];
      c.save();
      c.fillStyle = K.GRN; c.globalAlpha = .18; c.beginPath();
      pts.forEach(function (p, i) {
        i ? c.lineTo(sc.X(p[0]), sc.Y(-p[1])) : c.moveTo(sc.X(p[0]), sc.Y(-p[1]));
      });
      c.closePath(); c.fill();
      c.globalAlpha = 1; c.strokeStyle = K.GRN; c.lineWidth = 1.6; c.stroke();
      c.restore();
    })();
    [[hl, 'heel'], [to, '1st metatarsal'], [an, 'ankle']].forEach(function (q) {
      c.save(); c.fillStyle = K.MUT;
      c.beginPath(); c.arc(sc.X(q[0][0]), sc.Y(-q[0][2]), 3.4, 0, 7); c.fill(); c.restore();
      label(c, q[1], sc.X(q[0][0]), sc.Y(-q[0][2]) - 12,
            { size: 10.5, color: K.MUT, plate: true });
    });

    /* the path, and a dot every 40 ms so the speed is visible */
    var pts = [], q;
    for (q = 0; q < s.ng; q++) pts.push([s.cx[q], -s.cz[q]]);
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.4; c.beginPath();
    pts.forEach(function (p, i) { i ? c.lineTo(sc.X(p[0]), sc.Y(p[1])) : c.moveTo(sc.X(p[0]), sc.Y(p[1])); });
    c.stroke(); c.restore();
    var every = Math.round(0.04 * s.ghz);
    for (q = 0; q < s.ng; q += every) {
      if (s.fy[q] < 0.05 * BW) continue;
      c.save(); c.fillStyle = K.ACC;
      c.beginPath(); c.arc(sc.X(s.cx[q]), sc.Y(-s.cz[q]), 3, 0, 7); c.fill(); c.restore();
    }

    /* the live point, and the ankle moment arm it sets */
    var live = onPlate(s, S.pc), ip = gat(s, S.pc);
    if (live) {
      if (S.arm) {
        c.save(); c.strokeStyle = K.ORG; c.lineWidth = 2; c.setLineDash([5, 3]);
        c.beginPath(); c.moveTo(sc.X(an[0]), sc.Y(-an[2]));
        c.lineTo(sc.X(s.cx[ip]), sc.Y(-s.cz[ip])); c.stroke(); c.restore();
        label(c, fmt(Math.abs(s.cx[ip] - an[0]), 1) + ' cm',
              (sc.X(an[0]) + sc.X(s.cx[ip])) / 2, sc.Y(-an[2]) + 14,
              { size: 11.5, color: K.ORG, plate: true });
      }
      c.save(); c.fillStyle = K.VIO; c.strokeStyle = K.PLATE; c.lineWidth = 2;
      c.beginPath(); c.arc(sc.X(s.cx[ip]), sc.Y(-s.cz[ip]), 6, 0, 7); c.fill(); c.stroke();
      c.restore();
    }
    label(c, 'seen from above · travelling left to right · a dot every 40 ms',
          box.x + box.w / 2, box.y + 10, { size: 11.5, color: K.MUT });
    c.restore();

    /* ------------------------ the numbers ---------------------------- */
    var px = stack ? 8 : split, pw = stack ? ax.W - 16 : ax.W - split - 10;
    var py = stack ? split + 4 : 24, fs = 13.5, lh = 22;
    /* Collect the lines first and size the box to them.  A fixed height
       left a half-empty grey panel, and a line long enough to reach the
       edge ran straight off it. */
    var rows = [];
    function line(txt, o) { rows.push([txt, o || {}]); }
    var travel = Math.max.apply(null, s.cx) - Math.min.apply(null, s.cx);
    var across = Math.max.apply(null, s.cz) - Math.min.apply(null, s.cz);
    line(s.subject + ' · one stance phase', { color: K.MUT, weight: 700, gap: 26 });
    line('travels ' + fmt(travel, 1) + ' cm along the foot', { color: K.ACC, weight: 700 });
    line('  the heel-to-metatarsal distance is ' +
         fmt(Math.hypot(to[0] - hl[0], to[2] - hl[2]), 1) + ' cm,',
         { color: K.MUT, size: fs - 2.5, gap: lh * 0.8 });
    line('  so it ends ahead of that, under the toes',
         { color: K.MUT, size: fs - 2.5, gap: lh * 1.25 });
    line('and ' + fmt(across, 1) + ' cm across', { color: K.ACC, weight: 700 });
    line('  the lateral excursion is where most of the difference',
         { color: K.MUT, size: fs - 2.5, gap: lh * 0.8 });
    line('  between people lives', { color: K.MUT, size: fs - 2.5, gap: lh * 1.25 });
    if (live) {
      line('at ' + fmt(S.pc, 0) + '% of the cycle', { weight: 700, gap: lh * 0.9 });
      line('  ankle moment arm ' + fmt(Math.abs(s.cx[ip] - an[0]), 1) + ' cm',
           { color: K.ORG, size: fs, weight: 700, gap: lh * 0.9 });
      line('  × ' + fmt(s.fy[ip], 0) + ' N of vertical force',
           { color: K.ORG, size: fs - 2 });
    } else {
      line('swing — the foot is off the plate', { color: K.MUT, gap: lh * 0.9 });
    }
    var ph = 30;
    rows.forEach(function (r, q) { if (q < rows.length - 1) ph += (r[1].gap || lh); });
    ph += 14;
    c.save();
    c.fillStyle = K.PANEL; c.fillRect(px, py, pw, ph);
    c.strokeStyle = K.GRID; c.lineWidth = 1; c.strokeRect(px + .5, py + .5, pw - 1, ph - 1);
    c.restore();
    var y = py + 18;
    rows.forEach(function (r) {
      label(c, r[0], px + 14, y, { align: 'left', size: r[1].size || fs,
                                   color: r[1].color || K.INK, weight: r[1].weight || 600 });
      y += r[1].gap || lh;
    });
  }

  u.ctl.className = 'ictls g2';
  var sP = slider(u.ctl, 'Gait cycle', 0, 100, 0.5, S.pc,
                  function (v) { return fmt(v, 0) + '%'; },
                  function (v) { S.pc = v; draw(); });
  sP.quiet(S.pc);
  var row = ctlRow(u.ctl);
  if (nsub() > 1) {
    keepOut(chips(row, GD.subs.map(function (x, q) { return [q, x.subject]; }), 0,
                  function (v) { S.sub = v; draw(); }));
  }
  var ab = el('button', 'icalc-chip on'); ab.textContent = 'Ankle moment arm';
  ab.setAttribute('data-unsafe', '1');
  ab.addEventListener('click', function () {
    S.arm = S.arm ? 0 : 1; ab.classList.toggle('on', !!S.arm); draw();
  });
  row.appendChild(ab);
  var rd = readout(u.ctl);
  rd.innerHTML = 'The dots are evenly spaced in <b>time</b>, so where they bunch together the ' +
    'centre of pressure is moving slowly — that is midstance, the foot flat, the body rolling ' +
    'over. With the moment arm on, the distance from the centre of pressure to the ankle is the ' +
    'plantarflexors’ lever, and you can watch it grow.';
  node._draw = draw;
  draw();
});


/* ======================================================================
   9. SUPPORT — Winter's support moment, and who supplies it

   His slides 41 and 42.  The thick line is the sum of the three joint
   moments; the thin ones are what make it up.  The claim worth testing is
   his: as long as the moments add up to extensors, the body can vary how
   it accomplishes its support -- and the two subjects do it differently.
   ====================================================================== */
D.register('support', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!GD) return;
  var S = { sub: 0, pc: 20, both: 0 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1070, h: port ? 560 : 420,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;
  var PARTS = [['hip', 'hip'], ['knee', 'knee'], ['ank', 'ankle']];

  function colOf(K, k) { return k === 'hip' ? K.VIO : k === 'knee' ? K.BLUE : K.GRN; }

  function panel(s, px, pw, showLab) {
    var K = C();
    var a2 = sub(ax, px + 68, 30, ax.W - (px + pw) + 18, port ? 145 : 128);
    var lo = -0.6, hi = 0.8;
    ['support', 'hip', 'knee', 'ank'].forEach(function (k) {
      s.mom[k].forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    });
    lo = Math.floor(lo * 4) / 4 - 0.1; hi = Math.ceil(hi * 4) / 4 + 0.1;
    a2.setRange(0, 100, lo, hi);
    a2.rect(0, lo, s.ev.rto_plate, hi, { fill: K.FILL0 });
    a2.frame({ grid: true, zero: true, xticks: [0, 20, 40, 60, 80, 100],
               yticks: axisTicks(lo, hi),
               yfmt: function (v) { return minus(v.toFixed(1)); } });
    PARTS.forEach(function (q) {
      a2.poly(s.mom[q[0]].map(function (v, i) { return [i, v]; }),
              { color: colOf(K, q[0]), width: 1.7, dash: [5, 4] });
    });
    a2.poly(s.mom.support.map(function (v, i) { return [i, v]; }), { color: K.INK, width: 3 });
    c.save(); c.strokeStyle = K.VIO; c.lineWidth = 1.8; c.globalAlpha = .9;
    c.beginPath(); c.moveTo(a2.X(S.pc), a2.Y(lo)); c.lineTo(a2.X(S.pc), a2.Y(hi));
    c.stroke(); c.restore();
    a2.dots([[S.pc, s.mom.support[Math.round(S.pc)]]], { color: K.INK, r: 4.5 });
    label(c, s.subject + ' · peak ' + fmt(Math.max.apply(null, s.mom.support), 2) +
             ' at ' + s.mom.support.indexOf(Math.max.apply(null, s.mom.support)) + '%',
          (a2.pl + ax.W - a2.pr) / 2, 16, { size: 12, weight: 650, color: K.INK });
    if (showLab) {
      /* the axis caption is drawn rotated, below -- `size: 0` does NOT make a
         label invisible, it falls through to the default size, which is how a
         second horizontal copy of this caption ended up across the plot */
      c.save(); c.translate(14, (30 + (ax.H - a2.pb)) / 2); c.rotate(-Math.PI / 2);
      c.fillStyle = K.INK; c.font = '700 12.5px ui-sans-serif,system-ui,sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('Internal moment (N·m/kg)', 0, 0); c.restore();
    }
    label(c, 'Gait cycle (%)', (a2.pl + ax.W - a2.pr) / 2, ax.H - a2.pb + 30,
          { size: 12, weight: 700, color: K.INK });
    return a2;
  }

  function draw() {
    var K = C();
    ax.clear();
    var subs = GD.subs, a2;
    if (S.both && !port) {
      a2 = panel(subs[0], 0, ax.W / 2, true);
      panel(subs[1], ax.W / 2, ax.W / 2, false);
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
      c.beginPath(); c.moveTo(ax.W / 2, 24); c.lineTo(ax.W / 2, ax.H - 96); c.stroke(); c.restore();
    } else {
      a2 = panel(subs[S.sub], 0, ax.W, true);
    }
    /* the legend, centred under the plot and measured first so it cannot run
       off the edge of a phone */
    var lsz = port ? 10.5 : 11.5, lgap = port ? 12 : 18, rule = port ? 16 : 20;
    var items = [[K.INK, [], port ? 'the sum' : 'support moment = the sum'],
                 [colOf(K, 'hip'), [5, 4], 'hip'],
                 [colOf(K, 'knee'), [5, 4], 'knee'],
                 [colOf(K, 'ank'), [5, 4], 'ankle']];
    c.save(); c.font = '600 ' + lsz + 'px ui-sans-serif,system-ui,sans-serif';
    var tot2 = 0;
    items.forEach(function (e) { tot2 += rule + 5 + c.measureText(e[2]).width + lgap; });
    tot2 -= lgap;
    var lx = (ax.W - tot2) / 2, ly = ax.H - a2.pb + 52;
    items.forEach(function (e) {
      var w = c.measureText(e[2]).width;
      c.save(); c.strokeStyle = e[0]; c.lineWidth = e[1].length ? 1.8 : 3;
      c.setLineDash(e[1]);
      c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx + rule, ly); c.stroke(); c.restore();
      label(c, e[2], lx + rule + 5, ly, { size: lsz, align: 'left', color: K.INK });
      lx += rule + 5 + w + lgap;
    });
    c.restore();

    var s = GD.subs[S.both ? 0 : S.sub], i = Math.round(S.pc);
    var tot = s.mom.support[i];
    var frac = Math.abs(tot) > 0.05 ? s.mom.ank[i] / tot * 100 : 0;
    var y3 = wrapLabel(c, 'Measured · shaded = stance · positive is extensor at hip and ' +
             'knee, plantarflexor at the ankle',
          ax.W / 2, ax.H - 10, ax.W - 20, { size: 11, color: K.MUT });
    label(c, (S.pc > s.ev.rto_plate) ? 'swing — the limb is unloaded'
          : tot < 0 ? 'net FLEXOR — this is what initiates swing'
          : 'the ankle is supplying ' + fmt(frac, 0) + '% of it',
          ax.W / 2, y3 - 19,
          { size: 12.5, weight: 650,
            color: (S.pc > s.ev.rto_plate) ? K.MUT : tot < 0 ? K.ACC : K.GRN });
    wrapLabel(c, 'at ' + fmt(S.pc, 0) + '% — hip ' + num(s.mom.hip[i], 2) + '  +  knee ' +
             num(s.mom.knee[i], 2) + '  +  ankle ' + num(s.mom.ank[i], 2) +
             '  =  ' + num(tot, 2) + ' N·m/kg',
          ax.W / 2, y3 - 40, ax.W - 20, { size: port ? 12 : 13, weight: 650, color: K.INK });
  }

  u.ctl.className = 'ictls g2';
  var sP = slider(u.ctl, 'Gait cycle', 0, 100, 1, S.pc,
                  function (v) { return fmt(v, 0) + '%'; },
                  function (v) { S.pc = v; draw(); });
  sP.quiet(S.pc);
  var row = ctlRow(u.ctl);
  if (nsub() > 1) {
    keepOut(chips(row, GD.subs.map(function (x, q) { return [q, x.subject]; }), 0,
                  function (v) { S.sub = v; S.both = 0; bb.classList.remove('on'); draw(); }));
  }
  var bb = el('button', 'icalc-chip'); bb.textContent = 'Both at once';
  bb.setAttribute('data-unsafe', '1');
  bb.addEventListener('click', function () {
    S.both = S.both ? 0 : 1; bb.classList.toggle('on', !!S.both); draw();
  });
  row.appendChild(bb);
  var rd = readout(u.ctl);
  rd.innerHTML = 'The sum stays <b>extensor</b> through stance in both subjects — that is what ' +
    'keeps the leg from folding. Watch the handover: early on the hip and knee carry it, and by ' +
    'forty per cent the ankle is supplying more than the total, because the hip has gone flexor ' +
    'underneath it. Press <b>Both at once</b>: these two make the same support in visibly ' +
    'different ways, which is his point exactly.';
  node._draw = draw;
  draw();
});

/* ======================================================================
   10. PENDULUM — is a person actually a pendulum?

   His slides 43 and 44.  The centre of mass trajectory is the authors'
   own, and the energy books are computed from it: potential energy from
   the height, kinetic energy from the velocity of the same point, and
   Cavagna's recovery from the two.

   The recovery figure is the test of the model.  An ideal pendulum
   recovers 100%; walking near its optimal speed recovers 60 to 70; these
   two subjects come out at 54 and 65, with the faster one -- nearer that
   optimum -- doing better.
   ====================================================================== */
D.register('pendulum', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!GD) return;
  var S = { sub: 0, pc: 28, show: 'both' };

  var ax = new Axes(u.cv, { w: port ? 460 : 1080, h: port ? 620 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  function draw() {
    var K = C(), s = GD.subs[S.sub], e = s.ev;
    ax.clear();
    var stack = port;
    var split = stack ? ax.H * 0.42 : ax.W * 0.44;

    /* ------------------- the walker and the arc ---------------------- */
    /* in portrait the walker sits above the plot, so it has to stop short of
       the plot's own title instead of running into it */
    var box = stack ? { x: 6, y: 4, w: ax.W - 12, h: split - 32 }
                    : { x: 4, y: 20, w: split - 12, h: ax.H - 100 };
    var sc = new Scene(c, box).fit(-28, -6, 164, 180, 8);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sc.X(-28), sc.Y(0)); c.lineTo(sc.X(164), sc.Y(0)); c.stroke();
    c.restore();

    /* the centre of mass path, exaggerated vertically so 3.6 cm is visible
       against a 90 cm height -- the figure says so on its face */
    var EX = 5;
    var ym = 0; s.com.y.forEach(function (v) { ym += v / 101; });
    function cy(i) { return ym + (s.com.y[i] - ym) * EX; }
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 2.2; c.beginPath();
    for (var i = 0; i <= 100; i++) {
      var X = sc.X(s.com.x[i]), Y = sc.Y(cy(i));
      i ? c.lineTo(X, Y) : c.moveTo(X, Y);
    }
    c.stroke(); c.restore();
    /* where the arcs peak and trough */
    [[28, 'midstance'], [78, 'midstance']].forEach(function (q) {
      c.save(); c.fillStyle = K.GRN;
      c.beginPath(); c.arc(sc.X(s.com.x[q[0]]), sc.Y(cy(q[0])), 4, 0, 7); c.fill(); c.restore();
    });
    [[1, ''], [51, 'double support']].forEach(function (q) {
      c.save(); c.fillStyle = K.ACC;
      c.beginPath(); c.arc(sc.X(s.com.x[q[0]]), sc.Y(cy(q[0])), 4, 0, 7); c.fill(); c.restore();
    });

    var f = fat(s, S.pc), ip = Math.round(S.pc);
    figure(c, s, sc, f, { wnear: 4, wtrunk: 3, farCol: K.GRID });
    /* the pendulum spoke: stance foot to centre of mass */
    var stanceDown = (S.pc <= e.rto);
    var ft = jp(s, f, stanceDown ? 'heelR' : 'heelL');
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.8; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(sc.X(ft[0]), sc.Y(0));
    c.lineTo(sc.X(s.com.x[ip]), sc.Y(cy(ip))); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.BLUE; c.strokeStyle = K.PLATE; c.lineWidth = 2;
    c.beginPath(); c.arc(sc.X(s.com.x[ip]), sc.Y(cy(ip)), 6.5, 0, 7);
    c.fill(); c.stroke(); c.restore();
    label(c, 'CoM', sc.X(s.com.x[ip]) + 11, sc.Y(cy(ip)) - 8,
          { size: 11.5, color: K.BLUE, align: 'left', plate: true });
    label(c, 'centre of mass path · vertical scale ×' + EX + ', or you could not see it',
          box.x + box.w / 2, box.y + 10, { size: 11, color: K.MUT });
    c.restore();

    /* ------------------------ the energy books ----------------------- */
    var px = stack ? 0 : split, pw = stack ? ax.W : ax.W - split;
    var py = stack ? split : 22;
    var ph = stack ? ax.H - split - 140 : ax.H - 148;
    var a2 = sub(ax, px + 62, py, 22, ax.H - (py + ph));
    var series = S.show === 'height'
      ? [['height', s.com.y.map(function (v) { return v - ym; }), K.BLUE, 'centre of mass height (cm)']]
      : [['pe', s.en.pe, K.BLUE, 'potential'], ['ke', s.en.ke, K.ORG, 'kinetic'],
         ['te', s.en.te, K.INK, 'total']];
    var lo = 0, hi = 0;
    series.forEach(function (q) {
      q[1].forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    });
    var pad = (hi - lo) * 0.18; lo -= pad; hi += pad;
    a2.setRange(0, 100, lo, hi);
    a2.rect(0, lo, e.rto_plate, hi, { fill: K.FILL0 });
    a2.frame({ grid: true, zero: true, xticks: [0, 20, 40, 60, 80, 100],
               yticks: axisTicks(lo, hi),
               yfmt: function (v) { return minus(v.toFixed(1)); } });
    series.forEach(function (q) {
      a2.poly(q[1].map(function (v, i) { return [i, v]; }),
              { color: q[2], width: q[0] === 'te' ? 2.8 : 2.2 });
      label(c, q[3], ax.W - a2.pr - 6,
            a2.Y(q[1][S.show === 'height' ? 28 : (q[0] === 'ke' ? 51 : 28)]) - 10,
            { size: 11, color: q[2], align: 'right', plate: true });
    });
    c.save(); c.strokeStyle = K.VIO; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(a2.X(S.pc), a2.Y(lo)); c.lineTo(a2.X(S.pc), a2.Y(hi));
    c.stroke(); c.restore();
    label(c, S.show === 'height' ? 'Height above the mean (cm)' : 'Energy about its mean (J)',
          (a2.pl + ax.W - a2.pr) / 2, py - 8, { size: 12.5, weight: 700, color: K.INK });
    label(c, 'Gait cycle (%)', (a2.pl + ax.W - a2.pr) / 2, ax.H - a2.pb + 28,
          { size: 12, weight: 700, color: K.INK });

    /* ---------------------------- the numbers ------------------------ */
    var r = s.rec, WW = ax.W - 20;
    var y4 = wrapLabel(c, 'Measured · ' + s.subject + ' · ' + fmt(s.speed, 2) +
             ' m/s · an ideal pendulum would recover 100%; walking near its best speed ' +
             'recovers 60–70%',
          ax.W / 2, ax.H - 9, WW, { size: 11, color: K.MUT });
    /* the energy book is spelled out under the plot on a wide screen; on a
       phone there is no room for it and the readout says the same thing */
    var y3 = stack ? y4 - 6
      : wrapLabel(c, 'the energy that is exchanged rather than supplied: ' + fmt(r.wp, 0) +
             ' J of potential and ' + fmt(r.wk, 0) + ' J of kinetic go up and down, ' +
             'but only ' + fmt(r.wt, 0) + ' J of total energy has to be put in',
          ax.W / 2, y4 - 17, WW, { size: 11.5, color: K.MUT });
    label(c, 'pendulum recovery  ' + fmt(r.pct, 0) + '%',
          ax.W / 2, y3 - 20, { size: 16, weight: 700, color: K.GRN });
    wrapLabel(c, 'centre of mass rises ' +
             fmt(Math.max.apply(null, s.com.y) - Math.min.apply(null, s.com.y), 1) +
             ' cm, twice per stride — highest at 28% and 78%, lowest at the two double supports',
          ax.W / 2, y3 - 42, WW, { size: 12, color: K.MUT });
  }

  u.ctl.className = 'ictls g2';
  var sP = slider(u.ctl, 'Gait cycle', 0, 100, 1, S.pc,
                  function (v) { return fmt(v, 0) + '%'; },
                  function (v) { S.pc = v; draw(); });
  sP.quiet(S.pc);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['height', 'Height only'], ['both', 'Energy']], S.show,
               function (v) { S.show = v; draw(); }));
  if (nsub() > 1) {
    keepOut(chips(row, GD.subs.map(function (x, q) { return [q, x.subject]; }), 0,
                  function (v) { S.sub = v; draw(); }));
  }
  var pb = playBtn(u.ctl, '▶ Walk');
  var rd = readout(u.ctl);
  rd.innerHTML = 'Start with <b>Height only</b>: two arcs per stride, peaking at each midstance — ' +
    'the body is <b>highest</b> when it is balanced over one foot, which is the opposite of what ' +
    'most people guess. Then switch to <b>Energy</b>: potential and kinetic mirror each other.';

  var raf = null, t0 = 0, base = 0;
  function tick(t) {
    if (!t0) t0 = t;
    var p = base + (t - t0) / (GD.subs[S.sub].cycle_s * 2600) * 100;
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
   11. CLEAR — buying clearance at midswing

   His slides 45 to 49.  The starting pose is the measured limb at the
   instant of least clearance in swing, and everything is forward
   kinematics from there: segment lengths and starting orientations come
   from the markers, and each deficit or compensation is a rotation or a
   translation applied to that chain.

   The floor is the lowest any foot marker reaches over the stride, not
   y = 0, because a marker sits on top of a shoe.  Midswing clearance
   comes out at 1.6 and 2.4 cm for the two subjects -- the textbook's "one
   or two centimetres", and the whole margin these compensations exist to
   defend.

   TWO views, not one.  A stiff knee, a foot drop and steppage are
   sagittal; circumduction and hip hiking are frontal and are literally
   invisible from the side.  Drawing only the sagittal view would show
   nothing happening for two of the four compensations.
   ====================================================================== */
D.register('clear', function (node) {
  var port = D.portrait();
  var u = build(node, {});
  if (!GD) return;
  var S = { sub: 0, stiff: 0, drop: 0, comp: 'none', amt: 0.5 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1080, h: port ? 556 : 304,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: true });
  var c = ax.c;

  var COMPS = [['none', 'None'], ['circ', 'Circumduction'], ['hike', 'Hip hiking'],
               ['step', 'Steppage'], ['vault', 'Vaulting']];
  var LIMIT = { none: 0, circ: 22, hike: 6, step: 26, vault: 5 };
  var PLANE = { none: '', circ: 'front', hike: 'front', step: 'sag', vault: 'sag' };
  var NOTE = {
    none: '',
    circ: 'the limb swings out in a lateral arc — it is the cosine of the abduction angle that ' +
          'lifts the foot, so it buys little per degree and needs a lot of them',
    hike: 'the pelvis is lifted on the swing side by the trunk muscles, once per step, all day',
    step: 'extra hip and knee flexion — it buys the most of the four, and it is also the most ' +
          'metabolically expensive',
    vault: 'up on the toes of the STANCE leg, which lifts the whole body, and the centre of mass ' +
           'with it, on every step'
  };

  /* ---------- forward kinematics from the measured pose --------------- */
  function pose(s, pc) {
    var f = fat(s, pc);
    var H = jp(s, f, 'hipR'), K1 = jp(s, f, 'kneeR'), A = jp(s, f, 'ankR');
    var T = jp(s, f, 'toeR'), E = jp(s, f, 'heelR');
    function d(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    return { f: f, H: H, T: d(K1, H), S: d(A, K1), F: d(T, A), E: d(E, A) };
  }
  function rotXY(v, a) {                /* + swings the distal end forward */
    var ca = Math.cos(a), sa = Math.sin(a);
    return [v[0] * ca - v[1] * sa, v[0] * sa + v[1] * ca, v[2]];
  }
  function rotZY(v, a) {                /* + abducts the right limb */
    var ca = Math.cos(a), sa = Math.sin(a);
    return [v[0], v[2] * sa + v[1] * ca, v[2] * ca - v[1] * sa];
  }
  function rad(d) { return d * Math.PI / 180; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }

  function build2(s, st, pc) {
    var p = pose(s, pc), H = p.H.slice();
    var T = p.T, Sv = p.S, F = p.F, E = p.E, lift = 0;
    if (st.comp === 'step') T = rotXY(T, rad(st.amt * LIMIT.step));
    var ks = rad(st.stiff);                        /* a stiff knee extends it */
    Sv = rotXY(Sv, ks); F = rotXY(F, ks); E = rotXY(E, ks);
    if (st.comp === 'step') {                      /* steppage flexes it back, and more */
      var kf = -rad(st.amt * LIMIT.step * 0.8);
      Sv = rotXY(Sv, kf); F = rotXY(F, kf); E = rotXY(E, kf);
    }
    var as = -rad(st.drop);                        /* foot drop plantarflexes */
    F = rotXY(F, as); E = rotXY(E, as);
    if (st.comp === 'circ') {                      /* abduct the whole limb */
      var ab = rad(st.amt * LIMIT.circ);
      T = rotZY(T, ab); Sv = rotZY(Sv, ab); F = rotZY(F, ab); E = rotZY(E, ab);
    }
    if (st.comp === 'hike' || st.comp === 'vault') {
      lift = st.amt * LIMIT[st.comp]; H[1] += lift;
    }
    var K1 = add(H, T), A = add(K1, Sv);
    var TO = add(A, F), HE = add(A, E);
    return { H: H, K: K1, A: A, T: TO, E: HE, lift: lift, pc: pc, f: p.f,
             clear: Math.min(TO[1], HE[1]) - s.floor };
  }

  /* A deficit does not announce itself at one instant.  A stiff knee bites
     in EARLY swing, where the knee normally flexes most; a foot drop bites
     later.  So sweep midswing -- 72 to 92% of the cycle, the same window the
     exported clearance was taken over -- and report the
     worst moment, which is why the figure's instant moves as you drag the
     sliders.

     The window starts at 72 rather than at toe-off because clearance rises
     monotonically from toe-off to about 72% in these strides: before that
     the foot has not finished leaving the floor, and any earlier boundary
     would simply report the boundary.  It ends at 95 because after that the
     foot is reaching for initial contact and is meant to be coming down --
     and in these strides clearance falls again towards contact, so a later
     boundary would report that descent instead of midswing. */
  function worst(s, st) {
    var lo = null;
    for (var pc = 72; pc <= 92.001; pc += 0.5) {
      var L = build2(s, st, pc);
      if (!lo || L.clear < lo.clear) lo = L;
    }
    return lo;
  }

  /* ---------------------------- drawing -------------------------------- */
  function pr(q, plane) { return plane === 'front' ? [q[2], q[1]] : [q[0], q[1]]; }

  function limb(sc, L, plane, col, w, dash) {
    c.save(); c.strokeStyle = col; c.lineWidth = w;
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (dash) c.setLineDash(dash);
    [[L.H, L.K], [L.K, L.A], [L.A, L.E], [L.E, L.T], [L.A, L.T]].forEach(function (e) {
      var a = pr(e[0], plane), b = pr(e[1], plane);
      c.beginPath(); c.moveTo(sc.X(a[0]), sc.Y(a[1]));
      c.lineTo(sc.X(b[0]), sc.Y(b[1])); c.stroke();
    });
    c.restore();
  }

  function panel(s, box, plane, cur, bare, title) {
    var K = C(), f = cur.f;
    /* the stance limb and trunk come straight from the markers; vaulting
       raises them, because it is the stance ankle that does the lifting */
    var vlift = (S.comp === 'vault') ? cur.lift : 0;
    var MK = {};
    ['hipL', 'kneeL', 'ankL', 'heelL', 'toeL', 'hipR'].forEach(function (n) {
      var q = jp(s, f, n).slice();
      if (vlift && n !== 'toeL') q[1] += vlift;
      MK[n] = q;
    });
    if (vlift) MK.hipR = cur.H;                     /* both hips rise together */
    MK.hipR = (S.comp === 'hike' || S.comp === 'vault') ? cur.H : MK.hipR;
    MK.neck = [(MK.hipL[0] + MK.hipR[0]) / 2, (MK.hipL[1] + MK.hipR[1]) / 2 + 20,
               (MK.hipL[2] + MK.hipR[2]) / 2];

    var pts = [cur.H, cur.K, cur.A, cur.T, cur.E, bare.T, bare.E, bare.K, bare.A,
               MK.hipL, MK.kneeL, MK.ankL, MK.heelL, MK.toeL, MK.neck];
    var xs = pts.map(function (q) { return pr(q, plane)[0]; });
    var x0 = Math.min.apply(null, xs) - 10, x1 = Math.max.apply(null, xs) + 10;
    var top = Math.max(MK.hipL[1], cur.H[1]) + 24;
    var sc = new Scene(c, box).fit(x0, s.floor - 9, x1, top, 6);
    c.save(); c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();

    var hit = cur.clear < 0;
    c.save();
    c.strokeStyle = hit ? K.ACC : K.GRID; c.lineWidth = hit ? 4 : 2.5;
    c.beginPath(); c.moveTo(sc.X(x0), sc.Y(s.floor)); c.lineTo(sc.X(x1), sc.Y(s.floor));
    c.stroke(); c.restore();

    /* stance limb, pelvis and trunk */
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 3.4;
    c.lineCap = 'round'; c.lineJoin = 'round';
    [[MK.hipL, MK.kneeL], [MK.kneeL, MK.ankL], [MK.ankL, MK.heelL], [MK.heelL, MK.toeL],
     [MK.ankL, MK.toeL], [MK.hipL, MK.hipR], [MK.hipL, MK.neck], [MK.hipR, MK.neck]]
      .forEach(function (e) {
        var a = pr(e[0], plane), b = pr(e[1], plane);
        c.beginPath(); c.moveTo(sc.X(a[0]), sc.Y(a[1]));
        c.lineTo(sc.X(b[0]), sc.Y(b[1])); c.stroke();
      });
    c.restore();

    if (S.comp !== 'none') limb(sc, bare, plane, K.GRID, 3, [5, 4]);
    limb(sc, cur, plane, K.INK, 5.2);
    [cur.H, cur.K, cur.A].forEach(function (q) {
      var a = pr(q, plane); pin(c, sc.X(a[0]), sc.Y(a[1]), 4.5);
    });

    var low = cur.T[1] < cur.E[1] ? cur.T : cur.E;
    var lp = pr(low, plane);
    c.save();
    c.strokeStyle = hit ? K.ACC : K.GRN; c.lineWidth = 2; c.setLineDash([4, 3]);
    c.beginPath(); c.moveTo(sc.X(lp[0]), sc.Y(lp[1])); c.lineTo(sc.X(lp[0]), sc.Y(s.floor));
    c.stroke(); c.restore();
    c.restore();
    if (plane === 'sag') {
      label(c, 'clearance', box.x + 6, box.y + 10,
            { size: 11, color: K.MUT, align: 'left' });
      label(c, fmt(cur.clear, 1) + ' cm', box.x + 6, box.y + 28,
            { size: 17, color: hit ? K.ACC : K.GRN, align: 'left', weight: 700 });
    }
    label(c, title, box.x + box.w / 2, box.y + box.h + 13,
          { size: 11.5, color: PLANE[S.comp] === plane ? K.GRN : K.MUT,
            weight: PLANE[S.comp] === plane ? 700 : 600 });
  }

  function draw() {
    var K = C(), s = GD.subs[S.sub];
    ax.clear();
    var nodef = { stiff: 0, drop: 0, comp: 'none', amt: 0 };
    var def = { stiff: S.stiff, drop: S.drop, comp: 'none', amt: 0 };
    var rec = worst(s, nodef);                   /* the recorded stride */
    var cur = worst(s, S);                       /* what is drawn */
    var bareW = worst(s, def);                   /* the deficit, uncorrected */
    var bare = build2(s, def, cur.pc);           /* ...drawn at cur's instant */

    var ftr = 42;
    var ph = (port ? ax.H * 0.40 : ax.H - ftr - 40) - 8;
    var pyT = port ? 16 : 20;
    var pw1 = port ? (ax.W - 34) * 0.56 : 296, pw2 = port ? (ax.W - 34) * 0.44 : 248;
    panel(s, { x: 8, y: pyT, w: pw1, h: ph }, 'sag', cur, bare,
          'from the side · worst at ' + fmt(cur.pc, 0) + '%');
    panel(s, { x: 8 + pw1 + 14, y: pyT, w: pw2, h: ph }, 'front', cur, bare, 'from behind');

    /* -------------------- the comparison bars ------------------------ */
    var px = port ? 10 : 8 + pw1 + pw2 + 30;
    var pw = port ? ax.W - 20 : ax.W - px - 14;
    var py = port ? pyT + ph + 58 : 48;
    var bx = px + (port ? 112 : 132), bw = pw - (port ? 150 : 146);
    var rows = [{ k: 'ok', n: 'as recorded', v: rec.clear, col: K.BLUE }];
    rows.push({ k: 'bad', n: port ? 'with the deficit' : 'deficit, uncorrected',
                v: bareW.clear, col: bareW.clear < 0 ? K.ACC : K.MUT });
    COMPS.slice(1).forEach(function (q) {
      var r = worst(s, { stiff: S.stiff, drop: S.drop, comp: q[0], amt: S.amt });
      rows.push({ k: q[0], n: (port && q[0] === 'circ') ? 'Circumd.' : q[1],
                  v: r.clear, col: q[0] === S.comp ? K.GRN : K.MUT });
    });
    var lim = 0;
    rows.forEach(function (r) { lim = Math.max(lim, Math.abs(r.v)); });
    lim = Math.max(4, lim * 1.1);
    var rh = port ? 19 : 22, gap = 7, zx = bx + bw / 2;
    rows.forEach(function (r, i) {
      var y = py + i * (rh + gap), on = (r.k === S.comp || r.k === 'ok' || r.k === 'bad');
      label(c, r.n, bx - 10, y + rh / 2,
            { size: port ? 10 : 11.5, align: 'right', color: r.col,
              weight: on ? 700 : 600 });
      var w = Math.abs(r.v) / (2 * lim) * bw;
      c.save();
      c.fillStyle = r.v < 0 ? K.ACC : r.col;
      c.globalAlpha = on ? .8 : .32;
      c.fillRect(r.v < 0 ? zx - w : zx, y, w, rh);
      c.restore();
      /* a long negative bar reaches back towards its own row label, so the
         number goes INSIDE the bar rather than on top of the name */
      var inside = r.v < 0 && w > 46;
      label(c, fmt(r.v, 1) + ' cm',
            inside ? zx - 7 : (r.v < 0 ? zx - w - 6 : zx + w + 6), y + rh / 2,
            { size: port ? 10 : 11.5, color: inside ? K.PLATE : (r.v < 0 ? K.ACC : K.INK),
              align: r.v < 0 ? 'right' : 'left', weight: 650 });
    });
    var yb = py + rows.length * (rh + gap) - gap + 2;
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(zx, py - 7); c.lineTo(zx, yb); c.stroke(); c.restore();
    label(c, 'floor', zx, yb + 11, { size: 10.5, color: K.MUT });
    label(c, 'toe clearance at midswing', px + pw / 2, py - 22,
          { size: 12.5, weight: 700, color: K.INK });

    var msg, col;
    if (NOTE[S.comp]) { msg = NOTE[S.comp]; col = K.GRN; }
    else if (bareW.clear < 0) {
      msg = 'the toe goes through the floor — in a real person, that is a trip';
      col = K.ACC;
    } else {
      msg = 'take the knee flexion or the ankle away and watch the margin disappear';
      col = K.MUT;
    }
    var fy2 = wrapLabel(c, 'Measured · ' + s.subject +
             ' · midswing (72–92%) swept for the worst instant · ' +
             'the floor is the lowest any foot marker reaches, not y = 0',
          ax.W / 2, ax.H - 8, ax.W - 20, { size: 11, color: K.MUT });
    wrapLabel(c, msg, ax.W / 2, fy2 - 17, ax.W - 20, { size: 12, color: col, weight: 600 });
  }

  u.ctl.className = 'ictls g2';
  var s1 = slider(u.ctl, 'Stiff knee', 0, 45, 1, S.stiff,
                  function (v) { return v ? minus('-' + fmt(v, 0)) + '° flexion' : 'none'; },
                  function (v) { S.stiff = v; draw(); });
  var s2 = slider(u.ctl, 'Foot drop', 0, 30, 1, S.drop,
                  function (v) { return v ? fmt(v, 0) + '° toe down' : 'none'; },
                  function (v) { S.drop = v; draw(); });
  var s3 = slider(u.ctl, 'How much compensation', 0, 1, 0.05, S.amt,
                  function (v) { return fmt(v * 100, 0) + '%'; },
                  function (v) { S.amt = v; draw(); });
  s1.quiet(S.stiff); s2.quiet(S.drop); s3.quiet(S.amt);
  var row = ctlRow(u.ctl);
  keepOut(seg(row, COMPS, S.comp, function (v) { S.comp = v; draw(); }));
  if (nsub() > 1) {
    keepOut(chips(row, GD.subs.map(function (x, q) { return [q, x.subject]; }), 0,
                  function (v) { S.sub = v; draw(); }));
  }
  var rd = readout(u.ctl);
  rd.innerHTML = 'The toe clears the floor by <b>a centimetre or two</b> — that is the whole ' +
    'margin. Take the knee flexion or the ankle away and it goes through. Two compensations are ' +
    'invisible from the side, which is why there are two views.';
  node._draw = draw;
  draw();
});

/* the pure helpers, so parts/selftest.js can check the arithmetic against
   values worked out independently rather than against the drawing */
window.GA16 = {
  jp: jp, fat: fat, gat: gat, onPlate: onPlate, bodyWeight: bodyWeight,
  perp: perp, moment: moment, nsub: nsub
};

/* build every .iplot on the page; deck-core walks the DOM for data-widget */
D.boot();
})();
