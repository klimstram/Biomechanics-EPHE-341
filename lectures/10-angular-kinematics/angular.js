/* ============================================================
   EPHE 341 — Angular Kinematics
   Interactive figures. Needs deck-core.js. No other dependencies.

   The worked examples are Marc's own, kept to the same numbers so the deck,
   the handout and the Biomechanics Tutor all agree:

     bicycle wheel      r = 0.34 m, turns 30 deg in 0.2 s
     hammer throw       r = 1.2 m, 0 to 12 rad/s in 1.5 s
     racing wheelchair  wheel diameter 66 cm, so r = 0.33 m

   The tutor's Angular Kinematics section uses the same 0.34 m wheel, which
   is why that radius turns up here rather than a rounder number.
   ============================================================ */
(function () {
'use strict';

var D = window.DECK;
var Axes = D.Axes, el = D.el, slider = D.slider, playBtn = D.playBtn,
    readout = D.readout, build = D.build, axisTicks = D.axisTicks;
function C() { return D.colors(); }
var G = 9.81;

/* ---------------- shared UI (same vocabulary as the other decks) ---------- */
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
/* fit.js's prewarm sweep selects `.iseg-b:not([data-unsafe])` and
   `.icalc-chip:not([data-unsafe])` — the BUTTONS, not the container — and it
   restores only ONE "on" control per figure afterwards. So a widget with two
   segmented controls gets the second one left wherever the sweep finished, and
   that frame becomes the printed handout page. Mark the buttons themselves. */
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
  c.font = (o.weight || '700') + ' ' + (o.size || 13) + 'px ui-sans-serif,system-ui,sans-serif';
  c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'middle';
  if (o.plate) {
    var w = c.measureText(s).width, p = 4;
    var ox = o.align === 'right' ? -w - p : (o.align === 'center' ? -w / 2 - p : -p);
    c.fillStyle = C().PLATE; c.globalAlpha = 0.86;
    c.fillRect(x + ox, y - (o.size || 13) * 0.75, w + p * 2, (o.size || 13) * 1.5);
    c.globalAlpha = 1;
  }
  c.fillStyle = o.color || C().INK;
  c.fillText(s, x, y); c.restore();
}
function arrow(c, x1, y1, x2, y2, o) {
  o = o || {};
  var col = o.color || '#888', w = o.width || 3, head = o.head || (7 + w * 1.5);
  var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  if (L < 0.5) return;
  var ux = dx / L, uy = dy / L, bx = x2 - ux * head, by = y2 - uy * head;
  c.save();
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.lineCap = 'round';
  if (o.dash) c.setLineDash(o.dash);
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(bx, by); c.stroke();
  c.setLineDash([]);
  c.beginPath(); c.moveTo(x2, y2);
  c.lineTo(bx - uy * head * 0.42, by + ux * head * 0.42);
  c.lineTo(bx + uy * head * 0.42, by - ux * head * 0.42);
  c.closePath(); c.fill(); c.restore();
}
/* fill the region between a curve and a horizontal line */
function fillTo(ax, pts, base, col) {
  var c = ax.c;
  if (pts.length < 2) return;
  c.save(); c.fillStyle = col; c.beginPath();
  c.moveTo(ax.X(pts[0][0]), ax.Y(base));
  pts.forEach(function (p) { c.lineTo(ax.X(p[0]), ax.Y(p[1])); });
  c.lineTo(ax.X(pts[pts.length - 1][0]), ax.Y(base));
  c.closePath(); c.fill(); c.restore();
}
/* a key on a plate, sized from the text so it never sits on a curve */
function key(c, x, y, rows, o) {
  o = o || {}; var size = o.size || 13, pad = 7, lh = size * 1.5, i, w = 0;
  c.save();
  c.font = '700 ' + size + 'px ui-sans-serif,system-ui,sans-serif';
  for (i = 0; i < rows.length; i++) w = Math.max(w, c.measureText(rows[i][1]).width);
  var bw = w + pad * 2 + 22, bh = rows.length * lh + pad * 2;
  c.fillStyle = C().PLATE; c.globalAlpha = 0.9;
  c.fillRect(x, y, bw, bh); c.globalAlpha = 1;
  c.strokeStyle = C().PANEL; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, bw, bh);
  for (i = 0; i < rows.length; i++) {
    var cy = y + pad + lh * i + lh / 2;
    c.fillStyle = rows[i][0];
    c.fillRect(x + pad, cy - 4, 13, 8);
    c.fillStyle = C().INK; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(rows[i][1], x + pad + 20, cy);
  }
  c.restore();
  return { w: bw, h: bh };
}

/* drag anywhere on the figure to turn it; data-prevent-swipe stops reveal
   eating the gesture and turning the slide instead */
function dragRotate(cv, st, redraw) {
  cv.setAttribute('data-prevent-swipe', '');
  cv.style.cursor = 'grab'; cv.style.touchAction = 'none';
  var down = false, lx = 0, ly = 0;
  cv.addEventListener('pointerdown', function (e) {
    down = true; lx = e.clientX; ly = e.clientY; cv.style.cursor = 'grabbing';
    if (cv.setPointerCapture && e.pointerId != null) { try { cv.setPointerCapture(e.pointerId); } catch (x) {} }
  });
  cv.addEventListener('pointermove', function (e) {
    if (!down) return;
    st.az -= (e.clientX - lx) * 0.011;
    st.tilt = Math.max(-0.05, Math.min(1.15, st.tilt + (e.clientY - ly) * 0.006));
    lx = e.clientX; ly = e.clientY; e.preventDefault(); redraw();
  });
  function up() { down = false; cv.style.cursor = 'grab'; }
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', up);
}


/* ============================================================
   ANGULAR KINEMATICS — the handful of relations the whole lecture is
   ============================================================ */
var DEG = Math.PI / 180, RAD = 180 / Math.PI;
function toRad(d) { return d * DEG; }
function toDeg(r) { return r * RAD; }
function arcLen(r, th) { return r * th; }          /* l = r.theta   */
function vTan(r, w) { return r * w; }              /* v_t = r.omega */
function aTan(r, a) { return r * a; }              /* a_t = r.alpha */
function aRad(r, w) { return w * w * r; }          /* a_r = omega^2.r */
function aTot(at, ar) { return Math.hypot(at, ar); }

/* the running worked example, in one place */
var EX = {
  wheelR: 0.34, wheelDeg: 30, wheelT: 0.2,
  hammerR: 1.2, hammerW: 12, hammerT: 1.5,
  wcR: 0.33                                        /* 66 cm diameter */
};

/* draw a circle, its centre, and a radius line — used by most figures here */
function dial(c, K, cx, cy, R, o) {
  o = o || {};
  c.save();
  c.strokeStyle = o.ring || K.PANEL; c.lineWidth = o.width || 1.6;
  if (o.dash) c.setLineDash(o.dash);
  c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
  c.restore();
  c.save(); c.fillStyle = K.MUT;
  c.beginPath(); c.arc(cx, cy, 4, 0, 7); c.fill(); c.restore();
}
/* An arc from one canvas angle to another, always taking the SHORT way.
   Canvas angles run clockwise because y points down, so working out the
   sweep flag by hand gets this wrong about half the time. Returns the mid
   angle, which is where the label wants to go. */
function arcBetween(c, cx, cy, R, a0, a1, col, w) {
  var dd = a1 - a0;
  while (dd > Math.PI) dd -= 2 * Math.PI;
  while (dd < -Math.PI) dd += 2 * Math.PI;
  c.save(); c.strokeStyle = col; c.lineWidth = w || 2;
  c.beginPath(); c.arc(cx, cy, R, a0, a0 + dd, dd < 0); c.stroke(); c.restore();
  return a0 + dd / 2;
}

/* a point on the rim at angle th, measured anticlockwise from east */
function rim(cx, cy, R, th) { return [cx + R * Math.cos(th), cy - R * Math.sin(th)]; }

/* ============================================================
   ABSOLUTE AND RELATIVE ANGLES

   Drag either segment. The absolute angle is measured from a fixed line that
   never moves; the relative angle is measured between the two segments and
   does not care which way the whole limb is pointing.
   ============================================================ */
D.register('angles', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var thigh = 255, shank = 300;      /* absolute angles, degrees from east */
  var showAbs = true, showRel = true;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var hx = W * 0.40, hy = H * 0.22, L1 = 128, L2 = 120;
    var ta = toRad(thigh), sa = toRad(shank);
    var kx = hx + L1 * Math.cos(ta), ky = hy - L1 * Math.sin(ta);
    var ex = kx + L2 * Math.cos(sa), ey = ky - L2 * Math.sin(sa);

    /* the fixed reference the absolute angles are measured from */
    if (showAbs) {
      c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .55; c.lineWidth = 1.6;
      c.setLineDash([6, 5]);
      c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx, hy + 250); c.stroke();
      c.beginPath(); c.moveTo(kx, ky); c.lineTo(kx, ky + 220); c.stroke();
      c.restore();
      label(c, 'vertical', hx - 8, hy + 240, { color: K.MUT, size: 11, align: 'right' });
    }

    /* the two segments */
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke();
    c.strokeStyle = K.GRN;
    c.beginPath(); c.moveTo(kx, ky); c.lineTo(ex, ey); c.stroke();
    c.restore();
    [[hx, hy, 'hip'], [kx, ky, 'knee'], [ex, ey, 'ankle']].forEach(function (p) {
      c.save(); c.fillStyle = K.PLATE; c.strokeStyle = K.INK; c.lineWidth = 2.2;
      c.beginPath(); c.arc(p[0], p[1], 7, 0, 7); c.fill(); c.stroke(); c.restore();
      label(c, p[2], p[0] + 13, p[1] - 12, { color: K.MUT, size: 11.5, align: 'left' });
    });

    /* absolute angle of the shank, from vertical */
    var absShank = (270 - shank + 360) % 360;
    if (absShank > 180) absShank -= 360;
    var absThigh = (270 - thigh + 360) % 360;
    if (absThigh > 180) absThigh -= 360;

    if (showAbs) {
      /* from the downward vertical round to the thigh */
      var mid = arcBetween(c, hx, hy, 46, Math.PI / 2, -ta, K.VIO, 2);
      label(c, num(absThigh, 0) + '\u00b0', hx + 64 * Math.cos(mid), hy + 64 * Math.sin(mid),
            { color: K.VIO, size: 14, align: 'center', plate: true });
    }

    /* relative angle at the knee, between the thigh's line and the shank */
    if (showRel) {
      var relRaw = toDeg(sa - ta);
      while (relRaw > 180) relRaw -= 360;
      while (relRaw < -180) relRaw += 360;
      var midK = arcBetween(c, kx, ky, 40, -ta, -sa, K.ACC, 2.4);
      label(c, num(180 - Math.abs(relRaw), 0) + '\u00b0',
            kx + 58 * Math.cos(midK), ky + 58 * Math.sin(midK),
            { color: K.ACC, size: 15, align: 'center', plate: true });
    }

    var relKnee = 180 - Math.abs(((toDeg(sa - ta) + 540) % 360) - 180);
    out.innerHTML = 'thigh <b>' + num(absThigh, 0) + '°</b> from vertical · shank <b>' +
      num(absShank, 0) + '°</b> from vertical · knee angle <b>' + num(relKnee, 0) +
      '°</b>' +
      '<span style="opacity:.72">  ·  turn the whole leg and the two absolute angles both ' +
      'change while the knee angle does not — that is the difference</span>';
  }

  keepOut(seg(u.ctl, [['both', 'both'], ['abs', 'absolute only'], ['rel', 'relative only']], 'both',
    function (w) { showAbs = (w !== 'rel'); showRel = (w !== 'abs'); draw(); }));
  slider(u.ctl, 'Thigh', 190, 330, 1, thigh,
    function (v) { return num((270 - v + 540) % 360 - 180, 0) + '°'; },
    function (v) { thigh = v; draw(); });
  slider(u.ctl, 'Shank', 190, 350, 1, shank,
    function (v) { return num((270 - v + 540) % 360 - 180, 0) + '°'; },
    function (v) { shank = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   WHAT A RADIAN IS

   Lay the radius along the rim. One radius-length of arc is one radian, and
   it takes a little over six of them to go all the way round. That is the
   whole definition — theta = l / r — and it is why radians have no units.
   ============================================================ */
D.register('radian', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 880, h: port ? 480 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var th = 1;                        /* radians */

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H, i;
    ax.clear();
    var R = Math.min(W * 0.26, H * 0.36);
    var cx = W * 0.36, cy = H * 0.50;
    dial(c, K, cx, cy, R, { ring: K.PANEL, width: 1.6 });

    /* each whole radian of arc, marked off so they can be counted */
    var whole = Math.floor(th + 1e-9);
    for (i = 0; i < Math.min(whole, 6); i++) {
      c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 2;
      c.beginPath(); c.arc(cx, cy, R, -(i + 1), -i); c.stroke(); c.restore();
      var p = rim(cx, cy, R, i + 0.5);
      label(c, String(i + 1), cx + (p[0] - cx) * 1.17, cy + (p[1] - cy) * 1.17,
            { color: K.MUT, size: 12, align: 'center' });
    }

    /* the arc itself */
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.arc(cx, cy, R, -th, 0); c.stroke(); c.restore();

    /* the two radii that enclose it */
    var p0 = rim(cx, cy, R, 0), p1 = rim(cx, cy, R, th);
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(p0[0], p0[1]);
    c.moveTo(cx, cy); c.lineTo(p1[0], p1[1]); c.stroke(); c.restore();
    label(c, 'r', (cx + p0[0]) / 2, cy + 18, { color: K.BLUE, size: 15, align: 'center' });

    /* the arc straightened out underneath, against one radius */
    var by = H - 64, bx = W * 0.62;
    var scale = R;                      /* one radius = R pixels */
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx, by + 26); c.lineTo(bx + scale, by + 26); c.stroke(); c.restore();
    label(c, 'one radius', bx, by + 48, { color: K.BLUE, size: 11.5, align: 'left' });
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx, by - 10); c.lineTo(bx + scale * th, by - 10); c.stroke(); c.restore();
    label(c, 'the arc, straightened', bx, by - 32, { color: K.ACC, size: 11.5, align: 'left' });

    label(c, 'θ = l / r', W * 0.62, H * 0.26, { color: K.INK, size: 20, align: 'left' });
    label(c, fmt(th, 2) + ' rad  =  ' + fmt(toDeg(th), 1) + '°',
          W * 0.62, H * 0.36, { color: K.ACC, size: 17, align: 'left' });
    label(c, 'a whole turn is 2πr / r  =  2π  ≈ 6.28 rad',
          W * 0.62, H * 0.45, { color: K.MUT, size: 12.5, align: 'left' });

    out.innerHTML = 'θ = <b>' + fmt(th, 2) + ' rad</b> = <b>' + fmt(toDeg(th), 1) +
      '°</b> · arc length <b>' + fmt(th, 2) + ' × r</b>' +
      '<span style="opacity:.72">  ·  a radian is a ratio of two lengths, so it has no ' +
      'units at all — which is why rθ comes out in metres</span>';
  }

  keepOut(chips(u.ctl, [['one', '1 rad'], ['half', 'π/2'], ['pi', 'π'],
                        ['full', '2π']], 'one',
    function (w) {
      th = w === 'one' ? 1 : (w === 'half' ? Math.PI / 2 : (w === 'pi' ? Math.PI : 2 * Math.PI));
      sT.quiet(th); draw();
    }));
  var sT = slider(u.ctl, 'Angle', 0.1, 2 * Math.PI, 0.01, th,
    function (v) { return fmt(v, 2) + ' rad'; },
    function (v) { th = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   THE SAME ANGLE, DIFFERENT DISTANCES

   Every point on a rotating body turns through the same angle. What differs
   is how far each one travels, and that is set entirely by its radius.
   ============================================================ */
D.register('arclen', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 490 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var thDeg = 60, rB = 0.55;          /* rB as a fraction of rA */

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var th = toRad(thDeg);
    var RA = Math.min(W * 0.27, H * 0.40), RB = RA * rB;
    var cx = W * 0.36, cy = H * 0.56;

    dial(c, K, cx, cy, RA, { ring: K.PANEL, dash: [4, 5] });
    dial(c, K, cx, cy, RB, { ring: K.PANEL, dash: [4, 5] });

    /* the body, drawn in its start and finish positions */
    var s0 = rim(cx, cy, RA, 0), s1 = rim(cx, cy, RA, th);
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .45; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(s0[0], s0[1]); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(s1[0], s1[1]); c.stroke(); c.restore();

    /* the two arcs actually travelled */
    [[RA, K.ACC, 'A'], [RB, K.GRN, 'B']].forEach(function (p) {
      c.save(); c.strokeStyle = p[1]; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.arc(cx, cy, p[0], -th, 0); c.stroke(); c.restore();
      var a0 = rim(cx, cy, p[0], 0), a1 = rim(cx, cy, p[0], th);
      ax.c.save(); ax.c.fillStyle = p[1];
      ax.c.beginPath(); ax.c.arc(a1[0], a1[1], 6, 0, 7); ax.c.fill();
      ax.c.globalAlpha = .4; ax.c.beginPath(); ax.c.arc(a0[0], a0[1], 5, 0, 7); ax.c.fill();
      ax.c.restore();
      label(c, p[2], a1[0] + 14, a1[1] - 12, { color: p[1], size: 14, align: 'left' });
    });

    /* the angle, marked once */
    c.save(); c.strokeStyle = K.VIO; c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, 34, -th, 0); c.stroke(); c.restore();
    label(c, fmt(thDeg, 0) + '°', cx + 48, cy - 22,
          { color: K.VIO, size: 14, align: 'left', plate: true });

    /* the two arc lengths, straightened and compared */
    var mA = 1.0, mB = rB;            /* radii in metres, A fixed at 1 m */
    var lA = arcLen(mA, th), lB = arcLen(mB, th);
    var bx = W * 0.62, by = H * 0.34, px = (W * 0.22) / Math.max(lA, 0.01);
    [[lA, K.ACC, 'point A, r = 1.00 m'], [lB, K.GRN, 'point B, r = ' + fmt(mB, 2) + ' m']]
      .forEach(function (p, i) {
        var y = by + i * 66;
        c.save(); c.strokeStyle = p[1]; c.lineWidth = 11; c.lineCap = 'round';
        c.beginPath(); c.moveTo(bx, y); c.lineTo(bx + p[0] * px, y); c.stroke(); c.restore();
        label(c, p[2], bx, y - 22, { color: K.MUT, size: 11.5, align: 'left' });
        label(c, 'l = ' + fmt(p[0], 2) + ' m', bx + p[0] * px + 14, y,
              { color: p[1], size: 14, align: 'left', plate: true });
      });
    label(c, 'l = rθ', bx, by - 56, { color: K.INK, size: 20, align: 'left' });

    out.innerHTML = 'both points turn through <b>' + fmt(thDeg, 0) + '°</b> = <b>' +
      fmt(th, 2) + ' rad</b> · A travels <b>' + fmt(lA, 2) + ' m</b>, B travels <b>' +
      fmt(lB, 2) + ' m</b>' +
      '<span style="opacity:.72">  ·  same θ, different l — the radius is the ' +
      'only thing that differs, and θ must be in radians for rθ to work</span>';
  }

  slider(u.ctl, 'Angle turned', 10, 180, 1, thDeg,
    function (v) { return fmt(v, 0) + '°'; }, function (v) { thDeg = v; draw(); });
  slider(u.ctl, 'Radius of B', 0.15, 0.95, 0.01, rB,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { rB = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   TANGENTIAL VELOCITY

   v_t = r.omega. Same angular velocity everywhere on the body; the linear
   speed you actually feel depends on how far out you are — which is the
   whole argument for a long bat, a long club and a long hammer wire.
   ============================================================ */
D.register('tangential', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var w = 20, rA = 1.1;              /* rad/s, and the far point's radius in m */
  var t = 0, playing = false, raf = null, last = 0;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var RA = Math.min(W * 0.25, H * 0.38), RB = RA * 0.52;
    var cx = W * 0.34, cy = H * 0.52;
    var th = t;

    dial(c, K, cx, cy, RA, { ring: K.PANEL, dash: [4, 5] });
    dial(c, K, cx, cy, RB, { ring: K.PANEL, dash: [4, 5] });

    var a = rim(cx, cy, RA, th), bq = rim(cx, cy, RB, th);
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(a[0], a[1]); c.stroke(); c.restore();

    /* the tangent at each point — perpendicular to the radius */
    var mB = rA * 0.52;
    [[a, RA, rA, K.ACC, 'A'], [bq, RB, mB, K.GRN, 'B']].forEach(function (p) {
      var v = vTan(p[2], w);
      var tx = -Math.sin(th), ty = -Math.cos(th);   /* screen-space tangent */
      var len = 16 + v * 7;
      arrow(c, p[0][0], p[0][1], p[0][0] + tx * len, p[0][1] + ty * len,
            { color: p[3], width: 3.4 });
      c.save(); c.fillStyle = p[3];
      c.beginPath(); c.arc(p[0][0], p[0][1], 6, 0, 7); c.fill(); c.restore();
      label(c, p[4] + '  ' + fmt(v, 1) + ' m/s',
            p[0][0] + tx * len + tx * 10, p[0][1] + ty * len + ty * 10,
            { color: p[3], size: 13, align: tx < 0 ? 'right' : 'left', plate: true });
    });

    /* the rotation itself */
    c.save(); c.strokeStyle = K.VIO; c.lineWidth = 2.4;
    c.beginPath(); c.arc(cx, cy, 30, -th - 1.0, -th); c.stroke(); c.restore();
    label(c, 'ω', cx - 44, cy - 34, { color: K.VIO, size: 17, align: 'center' });

    var px = W * 0.62, py = H * 0.26;
    label(c, 'vₜ = rω', px, py, { color: K.INK, size: 22, align: 'left' });
    [['ω, the same for both', fmt(w, 1) + ' rad/s', K.VIO],
     ['A at r = ' + fmt(rA, 2) + ' m', fmt(vTan(rA, w), 1) + ' m/s', K.ACC],
     ['B at r = ' + fmt(mB, 2) + ' m', fmt(vTan(mB, w), 1) + ' m/s', K.GRN]
    ].forEach(function (rw, i) {
      var y = py + 54 + i * 52;
      label(c, rw[0], px, y, { color: K.MUT, size: 12, align: 'left' });
      label(c, rw[1], px, y + 21, { color: rw[2], size: 17, align: 'left' });
    });

    out.innerHTML = 'ω = <b>' + fmt(w, 1) + ' rad/s</b> · at r = ' + fmt(rA, 2) +
      ' m the tip moves at <b>' + fmt(vTan(rA, w), 1) + ' m/s</b>, at r = ' + fmt(mB, 2) +
      ' m only <b>' + fmt(vTan(mB, w), 1) + ' m/s</b>' +
      '<span style="opacity:.72">  ·  the arrow is tangent to the path, so it points where ' +
      'the point would go if it let go right now</span>';
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += dt * w * 0.12; draw();
    raf = requestAnimationFrame(frame);
  }
  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () {
    if (playing) { stop(); return; }
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  });
  slider(row, 'Angular velocity ω', 2, 40, 0.5, w,
    function (v) { return fmt(v, 1) + ' rad/s'; }, function (v) { w = v; draw(); });
  slider(u.ctl, 'Radius of A', 0.3, 1.6, 0.01, rA,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { rA = v; draw(); });
  node._draw = draw; node._stop = stop;
  draw();
});

/* ============================================================
   CENTRIPETAL (RADIAL) ACCELERATION

   Something moving in a circle is accelerating even at constant speed,
   because its direction keeps changing. a_r = omega^2 . r, and the omega is
   squared, which is why spin dominates everything here.
   ============================================================ */
D.register('centripetal', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var w = 6, r = 1.2, t = 0, playing = false, raf = null, last = 0, cut = false;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var R = Math.min(W * 0.24, H * 0.36);
    var cx = W * 0.35, cy = H * 0.52;
    var th = t;
    var p = rim(cx, cy, R, th);

    dial(c, K, cx, cy, R, { ring: K.PANEL, dash: [4, 5] });

    if (!cut) {
      /* the wire, and the force it carries toward the centre */
      c.save(); c.strokeStyle = K.MUT; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(p[0], p[1]); c.stroke(); c.restore();
      var ux = (cx - p[0]) / R, uy = (cy - p[1]) / R;
      var aR = aRad(r, w), L = 20 + Math.min(120, aR * 1.1);
      arrow(c, p[0], p[1], p[0] + ux * L, p[1] + uy * L, { color: K.ACC, width: 4 });
      label(c, 'aᵣ = ' + fmt(aR, 1) + ' m/s²', p[0] + ux * L + ux * 12,
            p[1] + uy * L + uy * 12, { color: K.ACC, size: 14, align: 'center', plate: true });
    }

    /* the tangential velocity, which is where it goes if the wire lets go */
    var tx = -Math.sin(th), ty = -Math.cos(th);
    var v = vTan(r, w), VL = 20 + v * 7;
    arrow(c, p[0], p[1], p[0] + tx * VL, p[1] + ty * VL, { color: K.BLUE, width: 3.2 });
    label(c, 'v = ' + fmt(v, 1) + ' m/s', p[0] + tx * VL + tx * 10, p[1] + ty * VL + ty * 10,
          { color: K.BLUE, size: 13, align: tx < 0 ? 'right' : 'left', plate: true });

    if (cut) {
      c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .5; c.lineWidth = 2; c.setLineDash([5, 5]);
      c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0] + tx * 320, p[1] + ty * 320);
      c.stroke(); c.restore();
      label(c, 'wire cut — it leaves along the tangent, not outward',
            W * 0.04, H - 26, { color: K.ACC, size: 13, align: 'left' });
    }

    c.save(); c.fillStyle = K.INK;
    c.beginPath(); c.arc(p[0], p[1], 10, 0, 7); c.fill(); c.restore();

    var px = W * 0.64, py = H * 0.24;
    label(c, 'aᵣ = ω²r', px, py, { color: K.INK, size: 22, align: 'left' });
    [['angular velocity ω', fmt(w, 1) + ' rad/s', K.VIO],
     ['radius r', fmt(r, 2) + ' m', K.MUT],
     ['radial acceleration', fmt(aRad(r, w), 1) + ' m/s²', K.ACC],
     ['… in g', fmt(aRad(r, w) / 9.81, 1) + ' g', K.GRN]
    ].forEach(function (rw, i) {
      var y = py + 50 + i * 48;
      label(c, rw[0], px, y, { color: K.MUT, size: 12, align: 'left' });
      label(c, rw[1], px, y + 20, { color: rw[2], size: 16, align: 'left' });
    });

    out.innerHTML = 'ω = <b>' + fmt(w, 1) + ' rad/s</b>, r = <b>' + fmt(r, 2) +
      ' m</b> → aᵣ = <b>' + fmt(aRad(r, w), 1) + ' m/s²</b> (' +
      fmt(aRad(r, w) / 9.81, 1) + ' g)' +
      '<span style="opacity:.72">  ·  double ω and the radial acceleration ' +
      '<b>quadruples</b>; double r and it only doubles</span>';
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += dt * w * 0.3; draw();
    raf = requestAnimationFrame(frame);
  }
  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () {
    if (playing) { stop(); return; }
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  });
  keepOut(chips(row, [['cut', 'cut the wire']], null, function () { cut = !cut; draw(); }));
  slider(u.ctl, 'Angular velocity ω', 1, 20, 0.5, w,
    function (v) { return fmt(v, 1) + ' rad/s'; }, function (v) { w = v; draw(); });
  slider(u.ctl, 'Radius r', 0.3, 2.0, 0.05, r,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { r = v; draw(); });
  node._draw = draw; node._stop = stop;
  draw();
});


/* ============================================================
   TOTAL LINEAR ACCELERATION

   Two linear accelerations act on a point going round a circle: one along
   the path because it is speeding up, one toward the centre because it is
   turning. They are perpendicular, so Pythagoras puts them together.
   ============================================================ */
D.register('atotal', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  /* the hammer throw's own omega of 12 rad/s makes the radial arrow 18 times
     the tangential one, which draws as a single line. Opening on 6 rad/s keeps
     both arrows legible, and pushing the slider to 12 is the demonstration. */
  var w = 6, al = 8, r = 1.2;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var R = Math.min(W * 0.21, H * 0.32);
    var cx = W * 0.33, cy = H * 0.54, th = 0.9;
    var p = rim(cx, cy, R, th);

    dial(c, K, cx, cy, R, { ring: K.PANEL, dash: [4, 5] });
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(p[0], p[1]); c.stroke(); c.restore();

    var at = aTan(r, al), ar = aRad(r, w), tot = aTot(at, ar);
    var S = 150 / Math.max(tot, 1);          /* pixels per m/s^2 */

    var ux = (cx - p[0]) / R, uy = (cy - p[1]) / R;        /* inward  */
    var tx = -Math.sin(th), ty = -Math.cos(th);            /* tangent */

    /* the two components, then the resultant */
    arrow(c, p[0], p[1], p[0] + ux * ar * S, p[1] + uy * ar * S, { color: K.ACC, width: 3.4 });
    arrow(c, p[0], p[1], p[0] + tx * at * S, p[1] + ty * at * S, { color: K.GRN, width: 3.4 });
    var rx = p[0] + (ux * ar + tx * at) * S, ry = p[1] + (uy * ar + ty * at) * S;
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .5; c.lineWidth = 1.4; c.setLineDash([4, 4]);
    c.beginPath();
    c.moveTo(p[0] + ux * ar * S, p[1] + uy * ar * S); c.lineTo(rx, ry);
    c.moveTo(p[0] + tx * at * S, p[1] + ty * at * S); c.lineTo(rx, ry);
    c.stroke(); c.restore();
    arrow(c, p[0], p[1], rx, ry, { color: K.BLUE, width: 4.4 });

    c.save(); c.fillStyle = K.INK; c.beginPath(); c.arc(p[0], p[1], 7, 0, 7); c.fill(); c.restore();
    label(c, 'aᵣ', p[0] + ux * ar * S * 0.6 - 16, p[1] + uy * ar * S * 0.6,
          { color: K.ACC, size: 15, align: 'center', plate: true });
    label(c, 'aₜ', p[0] + tx * at * S * 0.6, p[1] + ty * at * S * 0.6 - 14,
          { color: K.GRN, size: 15, align: 'center', plate: true });

    var px = W * 0.62, py = H * 0.20;
    label(c, 'aₜₒₜₐₗ² = aᵣ² + aₜ²',
          px, py, { color: K.INK, size: 20, align: 'left' });
    [['tangential  aₜ = αr', fmt(at, 1) + ' m/s²', K.GRN],
     ['radial  aᵣ = ω²r', fmt(ar, 1) + ' m/s²', K.ACC],
     ['total', fmt(tot, 1) + ' m/s²', K.BLUE]
    ].forEach(function (rw, i) {
      var y = py + 54 + i * 54;
      label(c, rw[0], px, y, { color: K.MUT, size: 12, align: 'left' });
      label(c, rw[1], px, y + 21, { color: rw[2], size: 17, align: 'left' });
    });
    label(c, 'the radial part is ' + fmt(ar / Math.max(tot, 0.01) * 100, 0) + '% of the total',
          px, py + 54 + 3 * 54 + 6, { color: K.MUT, size: 12.5, align: 'left' });

    out.innerHTML = 'α = <b>' + fmt(al, 1) + ' rad/s²</b>, ω = <b>' + fmt(w, 1) +
      ' rad/s</b>, r = <b>' + fmt(r, 2) + ' m</b> → aₜ <b>' + fmt(at, 1) +
      '</b>, aᵣ <b>' + fmt(ar, 1) + '</b>, total <b>' + fmt(tot, 1) + ' m/s²</b>' +
      '<span style="opacity:.72">  ·  once ω is anything much above a few rad/s the ' +
      'radial term swamps the tangential one, because it is squared</span>';
  }

  slider(u.ctl, 'Angular velocity ω', 0, 20, 0.5, w,
    function (v) { return fmt(v, 1) + ' rad/s'; }, function (v) { w = v; draw(); });
  slider(u.ctl, 'Angular acceleration α', 0, 20, 0.5, al,
    function (v) { return fmt(v, 1) + ' rad/s²'; }, function (v) { al = v; draw(); });
  slider(u.ctl, 'Radius r', 0.3, 2.0, 0.05, r,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { r = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   THE BICYCLE WHEEL, ALL THE WAY THROUGH

   Marc's running example, done as one chain rather than four separate
   slides: degrees to radians, to angular velocity, to tangential velocity,
   to angular acceleration, to tangential acceleration.
   ============================================================ */
D.register('bikewheel', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 920, h: port ? 520 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var deg = EX.wheelDeg, tt = EX.wheelT, r = EX.wheelR, step = 4;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var th = toRad(deg), w = th / tt, l = arcLen(r, th),
        v = vTan(r, w), al = w / tt, at = aTan(r, al);

    /* the wheel */
    var R = Math.min(W * 0.20, H * 0.34), cx = W * 0.22, cy = H * 0.46;
    dial(c, K, cx, cy, R, { ring: K.PANEL });
    var p0 = rim(cx, cy, R, Math.PI / 2), p1 = rim(cx, cy, R, Math.PI / 2 - th);
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .45; c.lineWidth = 4;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(p0[0], p0[1]); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 4;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(p1[0], p1[1]); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + th); c.stroke(); c.restore();
    label(c, fmt(deg, 0) + '°', cx + 6, cy - R - 20,
          { color: K.ACC, size: 15, align: 'left' });
    label(c, 'r = ' + fmt(r, 2) + ' m', cx, cy + R + 26,
          { color: K.MUT, size: 12.5, align: 'center' });

    /* the chain of steps, revealed one at a time */
    var steps = [
      ['θ in radians', fmt(deg, 0) + '° × π/180', fmt(th, 3) + ' rad', K.VIO],
      ['arc length  l = rθ', fmt(r, 2) + ' × ' + fmt(th, 3), fmt(l, 4) + ' m', K.VIO],
      ['angular velocity  ω = Δθ/Δt', fmt(th, 3) + ' / ' + fmt(tt, 2), fmt(w, 2) + ' rad/s', K.BLUE],
      ['tangential velocity  vₜ = rω', fmt(r, 2) + ' × ' + fmt(w, 2), fmt(v, 3) + ' m/s', K.BLUE],
      ['angular acceleration  α = Δω/Δt', fmt(w, 2) + ' / ' + fmt(tt, 2), fmt(al, 1) + ' rad/s²', K.GRN],
      ['tangential acceleration  aₜ = αr', fmt(al, 1) + ' × ' + fmt(r, 2), fmt(at, 2) + ' m/s²', K.GRN]
    ];
    var bx = W * 0.44, by = H * 0.13, rowH = (H * 0.72) / steps.length;
    steps.forEach(function (s, i) {
      var on = i < step, y = by + i * rowH;
      c.save(); c.globalAlpha = on ? 1 : 0.22;
      label(c, s[0], bx, y, { color: K.MUT, size: 12 });
      label(c, s[1] + '  =', bx, y + 21, { color: K.MUT, size: 13 });
      label(c, s[2], bx + 250, y + 21, { color: s[3], size: 17 });
      c.restore();
      if (on && i < step - 1) {
        c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1;
        c.beginPath(); c.moveTo(bx, y + 34); c.lineTo(bx + 380, y + 34); c.stroke(); c.restore();
      }
    });

    out.innerHTML = 'a wheel of r = <b>' + fmt(r, 2) + ' m</b> turning <b>' + fmt(deg, 0) +
      '°</b> in <b>' + fmt(tt, 2) + ' s</b> · ω = <b>' + fmt(w, 2) +
      ' rad/s</b> · vₜ = <b>' + fmt(v, 3) + ' m/s</b> · aₜ = <b>' +
      fmt(at, 2) + ' m/s²</b>' +
      '<span style="opacity:.72">  ·  every step is either ×r or ÷Δt — ' +
      'that is the entire lecture in one column</span>';
  }

  keepOut(chips(u.ctl, [['1', 'θ'], ['2', 'l'], ['3', 'ω'], ['4', 'vₜ'],
                        ['5', 'α'], ['6', 'aₜ']], '4',
    function (w2) { step = +w2; draw(); }));
  slider(u.ctl, 'Angle turned', 5, 360, 5, deg,
    function (v) { return fmt(v, 0) + '°'; }, function (v) { deg = v; draw(); });
  slider(u.ctl, 'Time taken', 0.05, 1.5, 0.05, tt,
    function (v) { return fmt(v, 2) + ' s'; }, function (v) { tt = v; draw(); });
  slider(u.ctl, 'Wheel radius', 0.1, 0.7, 0.01, r,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { r = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   FROM A GYROSCOPE TO A SPEED

   What the wheel-mounted sensor actually hands you is degrees per second.
   Getting from there to a wheelchair's speed in km/h is three conversions,
   and the middle one is this lecture's v = r.omega.
   ============================================================ */
D.register('gyroconv', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 920, h: port ? 470 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var dps = 600, r = EX.wcR;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var rad = toRad(dps), ms = vTan(r, rad), kmh = ms * 3.6;

    var boxes = [
      ['gyroscope', fmt(dps, 0), 'deg/s', K.MUT],
      ['× π/180', fmt(rad, 2), 'rad/s', K.VIO],
      ['× r = ' + fmt(r, 2) + ' m', fmt(ms, 2), 'm/s', K.BLUE],
      ['× 3.6', fmt(kmh, 1), 'km/h', K.GRN]
    ];
    var n = boxes.length, bw = W * 0.19, gap = (W - bw * n) / (n + 1), by = H * 0.30, bh = 108;
    boxes.forEach(function (b, i) {
      var bx = gap + i * (bw + gap);
      c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.4;
      c.strokeRect(bx + .5, by + .5, bw, bh); c.restore();
      label(c, b[0], bx + bw / 2, by - 16, { color: K.MUT, size: 12, align: 'center' });
      label(c, b[1], bx + bw / 2, by + 44, { color: b[3], size: 26, align: 'center' });
      label(c, b[2], bx + bw / 2, by + 80, { color: K.MUT, size: 13, align: 'center' });
      if (i < n - 1) arrow(c, bx + bw + 6, by + bh / 2, bx + bw + gap - 6, by + bh / 2,
                           { color: K.MUT, width: 2.4 });
    });

    label(c, 'vₜ = rω is the only step that needs the wheel',
          W / 2, by + bh + 50, { color: K.INK, size: 14, align: 'center' });
    label(c, 'a 66 cm wheel, so r = 0.33 m',
          W / 2, by + bh + 76, { color: K.MUT, size: 12.5, align: 'center' });

    out.innerHTML = '<b>' + fmt(dps, 0) + ' deg/s</b> → <b>' + fmt(rad, 2) +
      ' rad/s</b> → <b>' + fmt(ms, 2) + ' m/s</b> → <b>' + fmt(kmh, 1) + ' km/h</b>' +
      '<span style="opacity:.72">  ·  the sensor never measures speed — it measures ' +
      'turning, and the radius is what turns one into the other</span>';
  }

  keepOut(chips(u.ctl, [['push', 'first push  200'], ['cruise', 'cruising  600'],
                        ['sprint', 'sprint  1000']], 'cruise',
    function (w) { dps = w === 'push' ? 200 : (w === 'sprint' ? 1000 : 600); sD.quiet(dps); draw(); }));
  var sD = slider(u.ctl, 'Gyroscope reading', 50, 1400, 10, dps,
    function (v) { return fmt(v, 0) + ' deg/s'; }, function (v) { dps = v; draw(); });
  slider(u.ctl, 'Wheel radius', 0.15, 0.40, 0.01, r,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { r = v; draw(); });
  node._draw = draw;
  draw();
});
D.boot();
})();
