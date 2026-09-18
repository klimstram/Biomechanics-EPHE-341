/* ============================================================
   EPHE 341 — Projectile motion
   Interactive figures. Needs deck-core.js. No other dependencies.

   Every worked example in this deck is the lecture's own, and the figures
   are driven by the same arithmetic rather than having the answers written
   on them: the hammer at 22.09 m/s for 3.95 s, the high jumper at 6.16 m/s,
   the soccer ball at 21 m/s and 25°, Abreu's baseball at 120 km/h and 37°
   from 1.2 m, and the platform jump at 6 m/s and 45° landing 1.8 m up.
   ============================================================ */
(function () {
'use strict';

var D = window.DECK;
var Axes = D.Axes, el = D.el, slider = D.slider, playBtn = D.playBtn,
    readout = D.readout, build = D.build, axisTicks = D.axisTicks;
function C() { return D.colors(); }
var G = 9.81;
var RAD = Math.PI / 180;

/* ---------------- shared UI ---------------- */
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
function ctlRow(host) { var r = el('div', 'ictl-row'); host.appendChild(r); return r; }
function fmt(v, n) { n = n == null ? 2 : n; return v.toFixed(n); }
/* round the way the lecture does: to a fixed number of decimals, then carry
   the rounded value into the next line of the working */
function r(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
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
  if (L < 1.5) return;
  if (head > L * 0.6) head = L * 0.6;
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


/* ============================================================
   THE FLIGHT ITSELF
   One object holds everything the lecture asks of a projectile, and every
   figure below reads from it. The vertical equations are the ones derived
   on the slides — a = −9.81, v = −9.81t + v0y, y = (−9.81/2)t² + v0y t + y0
   — and the horizontal ones are a = 0, v = v0x, x = v0x t.
   ============================================================ */
function flight(v0, deg, y0, yland) {
  var th = deg * RAD;
  return flightC(v0 * Math.cos(th), v0 * Math.sin(th), y0, yland, v0, deg);
}
/* The lecture rounds the velocity components to one decimal and then carries
   those rounded numbers through the rest of the arithmetic. A problem that
   does so passes its components in here directly, so the figure and the board
   agree to the last digit. */
function flightC(vx, vy, y0, yland, v0, deg) {
  y0 = y0 || 0;
  yland = yland == null ? 0 : yland;
  var tap = vy / G;                       /* vertical velocity reaches zero */
  var yap = y0 + vy * vy / (2 * G);
  /* landing: (−g/2)t² + vy·t + (y0 − yland) = 0, take the later root */
  var a = -G / 2, b = vy, c = y0 - yland;
  var disc = b * b - 4 * a * c, t1 = NaN, t2 = NaN;
  if (disc >= 0) {
    var s = Math.sqrt(disc);
    var r1 = (-b + s) / (2 * a), r2 = (-b - s) / (2 * a);
    t1 = Math.min(r1, r2); t2 = Math.max(r1, r2);
  }
  return {
    v0: v0 == null ? Math.hypot(vx, vy) : v0,
    deg: deg == null ? Math.atan2(vy, vx) / RAD : deg,
    y0: y0, yland: yland, vx: vx, vy: vy,
    tap: tap, yap: yap, tland: t2, troot1: t1, troot2: t2,
    range: vx * t2,
    x: function (t) { return vx * t; },
    y: function (t) { return -G / 2 * t * t + vy * t + y0; },
    vyAt: function (t) { return -G * t + vy; },
    speedAt: function (t) { return Math.hypot(vx, -G * t + vy); }
  };
}

/* ground, path, apex and landing — the picture every figure here starts from */
function drawPath(ax, P, o) {
  o = o || {};
  var c = ax.c, K = C(), i, t;
  var N = 260, pts = [];
  for (i = 0; i <= N; i++) { t = P.tland * i / N; pts.push([P.x(t), P.y(t)]); }

  /* the ground, and the platform when the landing is higher than the launch */
  c.save();
  c.strokeStyle = K.SOFT; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(ax.pl, ax.Y(0)); c.lineTo(ax.W - ax.pr, ax.Y(0)); c.stroke();
  c.restore();
  if (P.yland > 0.01) {
    ax.rect(P.range * 0.72, 0, ax.xmax, P.yland,
            { fill: K.FILL0 || 'rgba(148,163,184,0.12)', stroke: K.SOFT, width: 1.4 });
  }

  /* the half of the flight before the apex, and the half after it */
  if (o.halves !== false && P.tap > 0 && P.tap < P.tland) {
    var up = [], dn = [];
    for (i = 0; i <= N; i++) {
      t = P.tland * i / N;
      (t <= P.tap ? up : dn).push([P.x(t), P.y(t)]);
    }
    ax.poly(up, { color: K.GRN, width: 3 });
    ax.poly(dn, { color: K.ACC, width: 3 });
  } else {
    ax.poly(pts, { color: K.ACC, width: 3 });
  }

  /* apex */
  if (o.apex !== false && P.tap > 0 && P.tap < P.tland) {
    ax.poly([[P.x(P.tap), 0], [P.x(P.tap), P.yap]],
            { color: K.MUT, width: 1.2, dash: [4, 4] });
    ax.dots([[P.x(P.tap), P.yap]], { color: K.BLUE, r: 5.5 });
    label(c, 'apex ' + fmt(P.yap, 2) + ' m', ax.X(P.x(P.tap)), ax.Y(P.yap) - 16,
          { color: K.BLUE, size: 12, align: 'center', plate: true });
  }
  /* launch and landing */
  ax.dots([[0, P.y0]], { color: K.GRN, r: 5 });
  ax.dots([[P.range, P.yland]], { color: K.ACC, r: 5 });
  if (o.range !== false) {
    var gy = ax.Y(0) + 24;
    arrow(c, ax.X(0), gy, ax.X(P.range), gy, { color: K.ORG, width: 2 });
    arrow(c, ax.X(P.range), gy, ax.X(0), gy, { color: K.ORG, width: 2 });
    label(c, (o.rangeText != null ? o.rangeText : fmt(P.range, 2) + ' m'),
          ax.X(P.range / 2), gy + 15,
          { color: K.ORG, size: 12, align: 'center', plate: true });
  }
  return pts;
}

/* the velocity at one instant, drawn as its two components and the resultant */
function drawVel(ax, P, t, S, o) {
  o = o || {};
  var c = ax.c, K = C();
  var px = ax.X(P.x(t)), py = ax.Y(P.y(t));
  var vy = P.vyAt(t);
  var ex = px + P.vx * S, ey = py - vy * S;
  arrow(c, px, py, ex, py, { color: K.BLUE, width: 2.4 });
  arrow(c, px, py, px, ey, { color: K.ORG, width: 2.4 });
  arrow(c, px, py, ex, ey, { color: K.VIO, width: 3 });
  if (o.labels !== false) {
    label(c, 'vx ' + fmt(P.vx, 1), ex + 7, py, { color: K.BLUE, size: 11, plate: true });
    label(c, 'vy ' + num(vy, 1), px - 7, ey, { color: K.ORG, size: 11, align: 'right', plate: true });
  }
  return { x: px, y: py };
}


/* ============================================================
   1. THE PARABOLA
   Speed, angle and launch height, and the path they produce. The two halves
   are coloured separately so the symmetry — apex at half the flight time
   when take-off and landing are level — is visible rather than asserted.
   ============================================================ */
D.register('parabola', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 940, h: port ? 450 : 450,
                            padl: 66, padr: 30, padt: 30, padb: 92 });
  var out = readout(u.ctl);
  var v0 = 21, deg = 25, y0 = 0, frac = 0.34;

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    var P = flight(v0, deg, y0, 0);
    var XMAX = Math.max(P.range * 1.1, 4), YMAX = Math.max(P.yap * 1.38, 2);
    ax.setRange(0, XMAX, 0, YMAX);
    ax.frame({ grid: true, xticks: axisTicks(0, XMAX), yticks: axisTicks(0, YMAX),
               xlabel: 'horizontal displacement (m)', ylabel: 'height (m)', ysize: 13,
               xfmt: function (q) { return q.toFixed(0); },
               yfmt: function (q) { return q.toFixed(0); } });
    drawPath(ax, P, {});

    /* the velocity at the cursor, in components */
    var t = frac * P.tland;
    var S = (ax.W - ax.pl - ax.pr) / XMAX * 0.30;
    drawVel(ax, P, t, S);
    label(c, 't = ' + fmt(t, 2) + ' s', ax.X(P.x(t)), ax.Y(P.y(t)) + 20,
          { color: K.VIO, size: 12, align: 'center', plate: true });

    out.innerHTML =
      'v<sub>x</sub> = <b class="b">' + fmt(P.vx, 2) + ' m/s</b> (constant)' +
      ' &nbsp;·&nbsp; v<sub>y</sub> = <b>' + num(P.vyAt(t), 2) + ' m/s</b>' +
      ' &nbsp;·&nbsp; flight <b>' + fmt(P.tland, 2) + ' s</b>' +
      ' &nbsp;·&nbsp; apex <b class="g">' + fmt(P.yap, 2) + ' m</b>' +
      ' &nbsp;·&nbsp; range <b class="r">' + fmt(P.range, 2) + ' m</b>' +
      '<span class="hint">The horizontal arrow never changes length — there is no horizontal ' +
      'force once the object leaves the ground. The vertical arrow shrinks, reverses at the apex ' +
      'and grows again. Adding them at every instant is what bends the path into a parabola. ' +
      'With the launch and the landing level, the apex sits at exactly half the flight time.</span>';
  }

  chips(u.ctl, [['soc', 'soccer ball: 21 m/s at 25°'],
                ['bb', 'baseball: 33.3 m/s at 37°'],
                ['jump', 'a jump: 6 m/s at 45°'],
                ['up', 'straight up: 29.4 m/s at 89°']], 'soc', function (k) {
    if (k === 'soc') { v0 = 21; deg = 25; y0 = 0; }
    else if (k === 'bb') { v0 = 33.3; deg = 37; y0 = 1.2; }
    else if (k === 'jump') { v0 = 6; deg = 45; y0 = 1.2; }
    else { v0 = 29.4; deg = 89; y0 = 0; }
    sV.quiet(v0); sA.quiet(deg); sH.quiet(y0); draw();
  });
  u.ctl.classList.add('g2');
  var sV = slider(u.ctl, 'Speed', 3, 40, 0.1, v0, function (q) { return fmt(q, 1) + ' m/s'; },
    function (q) { v0 = q; draw(); });
  var sA = slider(u.ctl, 'Angle', 2, 89, 1, deg, function (q) { return fmt(q, 0) + '°'; },
    function (q) { deg = q; draw(); });
  var sH = slider(u.ctl, 'Launch height', 0, 4, 0.1, y0, function (q) { return fmt(q, 1) + ' m'; },
    function (q) { y0 = q; draw(); });
  slider(u.ctl, 'Along the path', 0, 1, 0.005, frac,
    function (q) { return fmt(q * 100, 0) + '%'; }, function (q) { frac = q; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   2. STRAIGHT UP
   The lecture's opening question: a ball is in the air for 6 s, what was
   its initial velocity? The three panels are the three equations, derived
   one from the next by integration, and the answer falls out of the middle
   one at half the flight time.
   ============================================================ */
D.register('vertical', function (node, d) {
  var u = build(node);
  var wrap = u.cv.parentNode.parentNode;
  wrap.classList.add('isplit');
  var side = el('div', 'icalc');
  wrap.insertBefore(side, u.ctl);

  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 620, h: port ? 560 : 540,
                            padl: 74, padr: 24, padt: 14, padb: 46 });
  var out = readout(u.ctl);
  var T = 6;
  var step = parseInt(d.step || 3, 10);        /* 1 a(t) · 2 + v(t) · 3 + y(t) */
  var BAND = [[14, 392], [190, 216], [366, 40]];

  function draw() {
    var c = ax.c, K = C(), i, t;
    ax.clear();
    var tap = T / 2, voy = G * tap, h = -G / 2 * tap * tap + voy * tap;
    var TICKS = axisTicks(0, T);

    function band(k) { ax.pt = BAND[k][0]; ax.pb = BAND[k][1]; }

    /* ---- a(t) = −9.81 ---- */
    band(0);
    ax.setRange(0, T, -14, 2);
    ax.frame({ grid: true, xticks: TICKS, yticks: [-10, 0],
               ylabel: 'a (m/s²)', ysize: 11.5, ylabelx: 14,
               xfmt: function (q) { return q.toFixed(0); },
               yfmt: function (q) { return minus(q.toFixed(0)); } });
    ax.poly([[0, -G], [T, -G]], { color: K.VIO, width: 2.8 });
    label(c, 'a(t) = −9.81', ax.X(T * 0.5), ax.Y(-G) - 14,
          { color: K.VIO, size: 12, align: 'center', plate: true });

    /* ---- v(t) = −9.81t + voy ---- */
    if (step >= 2) {
      band(1);
      var VM = voy * 1.35;
      ax.setRange(0, T, -VM, VM);
      ax.frame({ grid: true, xticks: TICKS, yticks: axisTicks(-VM, VM),
                 ylabel: 'v (m/s)', ysize: 11.5, ylabelx: 14, zero: true,
                 xfmt: function (q) { return q.toFixed(0); },
                 yfmt: function (q) { return minus(q.toFixed(0)); } });
      ax.poly([[0, voy], [T, voy - G * T]], { color: K.ORG, width: 2.8 });
      ax.dots([[0, voy]], { color: K.GRN, r: 5 });
      label(c, 'v₀ᵧ ' + fmt(voy, 2), ax.X(0) + 8, ax.Y(voy),
            { color: K.GRN, size: 12, plate: true });
      ax.poly([[tap, -VM], [tap, VM]], { color: K.BLUE, width: 1.4, dash: [4, 4] });
      ax.dots([[tap, 0]], { color: K.BLUE, r: 5 });
      label(c, 'v = 0 at ' + fmt(tap, 1) + ' s', ax.X(tap) + 9, ax.Y(0) + 15,
            { color: K.BLUE, size: 12, plate: true });
    }

    /* ---- y(t) = (−9.81/2)t² + voy·t ---- */
    if (step >= 3) {
      band(2);
      var YM = h * 1.3;
      ax.setRange(0, T, 0, YM);
      ax.frame({ grid: true, xticks: TICKS, yticks: axisTicks(0, YM),
                 xlabel: 'Time (s)', ylabel: 'y (m)', ysize: 11.5, ylabelx: 14,
                 xfmt: function (q) { return q.toFixed(0); },
                 yfmt: function (q) { return q.toFixed(0); } });
      var pts = [];
      for (i = 0; i <= 200; i++) { t = T * i / 200; pts.push([t, -G / 2 * t * t + voy * t]); }
      ax.poly(pts, { color: K.ACC, width: 2.8 });
      ax.poly([[tap, 0], [tap, h]], { color: K.BLUE, width: 1.4, dash: [4, 4] });
      ax.dots([[tap, h]], { color: K.BLUE, r: 5.5 });
      label(c, fmt(h, 2) + ' m', ax.X(tap), ax.Y(h) - 15,
            { color: K.BLUE, size: 12, align: 'center', plate: true });
    }
    band(0);

    var html = '<div class="icalc-h">flight time ' + fmt(T, 1) + ' s</div>';
    html += '<div class="icalc-work">' +
      '<div class="icalc-t">integrate, twice</div>' +
      '<div class="icalc-eq">a<sub>y</sub>(t) = −9.81</div>' +
      (step >= 2 ? '<div class="icalc-eq">v<sub>y</sub>(t) = −9.81t + v<sub>oy</sub></div>' : '') +
      (step >= 3 ? '<div class="icalc-eq">d<sub>y</sub>(t) = (−9.81/2)t² + v<sub>oy</sub>t + d<sub>oy</sub></div>' : '') +
      '</div>';
    if (step >= 2) {
      html += '<div class="icalc-work">' +
        '<div class="icalc-t">at the apex v = 0, and the apex is at half the flight</div>' +
        '<div class="icalc-eq">t = ½(' + fmt(T, 1) + ') = ' + fmt(tap, 1) + ' s</div>' +
        '<div class="icalc-eq">0 = −9.81(' + fmt(tap, 1) + ') + v<sub>oy</sub></div>' +
        '<div class="icalc-eq">v<sub>oy</sub> = <b>' + fmt(voy, 2) + '</b> m/s</div>' +
        '</div>';
    }
    if (step >= 3) {
      html += '<div class="icalc-work">' +
        '<div class="icalc-t">and the height at that instant</div>' +
        '<div class="icalc-eq">d<sub>y</sub>(' + fmt(tap, 1) + ') = (−9.81/2)(' + fmt(tap, 1) +
          ')² + ' + fmt(voy, 2) + '(' + fmt(tap, 1) + ')</div>' +
        '<div class="icalc-eq">= <b>' + fmt(h, 3) + '</b> m</div>' +
        '</div>';
    }
    side.innerHTML = html;

    out.innerHTML =
      'flight <b>' + fmt(T, 1) + ' s</b> &nbsp;·&nbsp; apex at <b class="b">' + fmt(tap, 1) +
      ' s</b> &nbsp;·&nbsp; v<sub>oy</sub> = <b class="g">' + fmt(voy, 2) + ' m/s</b>' +
      ' &nbsp;·&nbsp; height <b class="r">' + fmt(h, 2) + ' m</b>' +
      '<span class="hint">Nothing here was measured except the time. Because the object takes off ' +
      'and lands at the same height, the apex has to be at half of it, and at the apex the ' +
      'vertical velocity is zero — which turns the velocity equation into one equation with one ' +
      'unknown. Double the flight time and the initial velocity doubles, but the height goes up ' +
      'by four.</span>';
  }

  chips(u.ctl, [[4, '4 s'], [6, '6 s'], [8, '8 s']], T, function (k) {
    T = +k; sT.quiet(T); draw();
  });
  var sT = slider(u.ctl, 'Flight time', 1, 10, 0.1, T, function (q) { return fmt(q, 1) + ' s'; },
    function (q) { T = q; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   3. THE ANGLE OF RELEASE
   The claim on the slide is that 45° is best for distance and 90° for
   height. Both are visible at once here: a fan of trajectories on top and
   range against angle underneath, with the maximum marked. Raise the launch
   height and the best angle for distance drops below 45°, which is the part
   the slide does not say.
   ============================================================ */
D.register('angle', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 540 : 520,
                            padl: 68, padr: 28, padt: 16, padb: 50 });
  var out = readout(u.ctl);
  var v0 = 20, deg = 45, y0 = 0;
  var FAN = [15, 30, 45, 60, 75];
  var BAND = [[16, 282], [268, 50]];

  function rangeAt(a) { return flight(v0, a, y0, 0).range; }
  function apexAt(a) { return flight(v0, a, y0, 0).yap; }

  function draw() {
    var c = ax.c, K = C(), i, a;
    ax.clear();

    /* the best angle for distance, found on the curve itself */
    var best = 45, bestR = -1;
    for (a = 1; a <= 89; a += 0.25) {
      var r = rangeAt(a); if (r > bestR) { bestR = r; best = a; }
    }
    var P = flight(v0, deg, y0, 0);
    var RMAX = Math.max(bestR * 1.08, 2);
    var HMAX = Math.max(apexAt(89) * 1.15, 2);

    /* ---- top: a fan of paths at the classic angles ---- */
    ax.pt = BAND[0][0]; ax.pb = BAND[0][1];
    ax.setRange(0, RMAX, 0, HMAX);
    ax.frame({ grid: true, xticks: axisTicks(0, RMAX), yticks: axisTicks(0, HMAX),
               ylabel: 'height (m)', ysize: 12, ylabelx: 14,
               xfmt: function (q) { return q.toFixed(0); },
               yfmt: function (q) { return q.toFixed(0); } });
    c.save();
    c.strokeStyle = K.SOFT; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(ax.pl, ax.Y(0)); c.lineTo(ax.W - ax.pr, ax.Y(0)); c.stroke();
    c.restore();
    FAN.forEach(function (fa) {
      var Q = flight(v0, fa, y0, 0), pts = [], k, t;
      for (k = 0; k <= 120; k++) { t = Q.tland * k / 120; pts.push([Q.x(t), Q.y(t)]); }
      ax.poly(pts, { color: K.MUT, width: 1.4 });
      label(c, fa + '°', ax.X(Q.x(Q.tap)), ax.Y(Q.yap) - 9,
            { color: K.MUT, size: 10.5, align: 'center' });
    });
    var pts2 = [], k2, t2;
    for (k2 = 0; k2 <= 200; k2++) { t2 = P.tland * k2 / 200; pts2.push([P.x(t2), P.y(t2)]); }
    ax.poly(pts2, { color: K.ACC, width: 3.2 });
    ax.dots([[P.range, 0]], { color: K.ACC, r: 5 });
    ax.dots([[P.x(P.tap), P.yap]], { color: K.BLUE, r: 4.5 });

    /* ---- bottom: range and apex height against the release angle ---- */
    ax.pt = BAND[1][0]; ax.pb = BAND[1][1];
    ax.setRange(0, 90, 0, Math.max(RMAX, HMAX));
    ax.frame({ grid: true, xticks: [0, 15, 30, 45, 60, 75, 90],
               yticks: axisTicks(0, Math.max(RMAX, HMAX)),
               xlabel: 'angle of release (degrees)', ylabel: 'metres', ysize: 12, ylabelx: 14,
               xfmt: function (q) { return q.toFixed(0); },
               yfmt: function (q) { return q.toFixed(0); } });
    var rr = [], hh = [];
    for (a = 1; a <= 89; a += 0.5) { rr.push([a, rangeAt(a)]); hh.push([a, apexAt(a)]); }
    ax.poly(rr, { color: K.ORG, width: 2.8 });
    ax.poly(hh, { color: K.GRN, width: 2.4, dash: [6, 4] });
    label(c, 'range', ax.X(best) + 12, ax.Y(bestR) - 6, { color: K.ORG, size: 12, plate: true });
    label(c, 'apex height', ax.X(84), ax.Y(apexAt(84)) - 12,
          { color: K.GRN, size: 12, align: 'right', plate: true });
    ax.poly([[best, 0], [best, bestR]], { color: K.ORG, width: 1.3, dash: [4, 4] });
    ax.dots([[best, bestR]], { color: K.ORG, r: 5.5 });
    label(c, 'best for distance ' + fmt(best, 1) + '°', ax.X(best), ax.Y(bestR) + 20,
          { color: K.ORG, size: 12, align: 'center', plate: true });
    ax.poly([[deg, 0], [deg, Math.max(RMAX, HMAX)]], { color: K.ACC, width: 1.4, dash: [3, 3] });
    ax.dots([[deg, rangeAt(deg)], [deg, apexAt(deg)]], { color: K.ACC, r: 4.5 });
    ax.pt = BAND[0][0]; ax.pb = BAND[0][1];

    out.innerHTML =
      'at <b class="r">' + fmt(deg, 0) + '°</b>: range <b>' + fmt(P.range, 2) +
      ' m</b>, apex <b>' + fmt(P.yap, 2) + ' m</b>' +
      ' &nbsp;·&nbsp; best angle for distance <b class="o">' + fmt(best, 1) + '°</b>' +
      '<span class="hint">' +
      (y0 < 0.05
        ? 'From the ground the range curve peaks at <b>45°</b>, and it is symmetric about it — ' +
          '30° and 60° carry exactly the same distance. Height keeps climbing all the way to ' +
          '90°, because every degree you add goes into the vertical component.'
        : 'Launch from <b>' + fmt(y0, 1) + ' m</b> up and the best angle for distance falls to ' +
          '<b>' + fmt(best, 1) + '°</b>. The extra height buys flight time for free, so it pays ' +
          'to spend more of the speed going forwards — which is why a shot putter releases ' +
          'well below 45°.') +
      '</span>';
  }

  chips(u.ctl, [['g', 'from the ground'], ['shot', 'from 2.1 m, like a shot put']], 'g',
    function (k) { y0 = k === 'g' ? 0 : 2.1; sH.quiet(y0); draw(); });
  u.ctl.classList.add('g2');
  var sV = slider(u.ctl, 'Speed', 5, 40, 0.5, v0, function (q) { return fmt(q, 1) + ' m/s'; },
    function (q) { v0 = q; draw(); });
  var sA = slider(u.ctl, 'Angle', 1, 89, 1, deg, function (q) { return fmt(q, 0) + '°'; },
    function (q) { deg = q; draw(); });
  var sH = slider(u.ctl, 'Launch height', 0, 3, 0.1, y0, function (q) { return fmt(q, 1) + ' m'; },
    function (q) { y0 = q; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   4. THE WORKED EXAMPLES
   Each of the lecture's problems, with the figure and the arithmetic side
   by side and revealed a step at a time. The numbers are computed from the
   givens, so what is on the screen is what the board says only because the
   two agree.
   ============================================================ */
var PROB = {
  hammer: {
    name: 'the hammer throw', mode: 'x',
    v0x: 22.09, t: 3.95, mark: 86.74,
    title: 'Olympic hammer, 22.09 m/s for 3.95 s',
    steps: function (S) {
      var d = S.v0x * S.t;
      return [
        ['what we are given',
         ['v<sub>0</sub> (horizontal) = ' + fmt(S.v0x, 2) + ' m/s', 't = ' + fmt(S.t, 2) + ' s',
          'a = 0 m/s² — gravity only acts on the vertical component']],
        ['the horizontal displacement equation',
         ['d<sub>x</sub>(t) = v<sub>0</sub>t + d<sub>0x</sub>',
          'd = (' + fmt(S.v0x, 2) + ' m/s)(' + fmt(S.t, 2) + ' s)',
          'd = <b>' + fmt(d, 2) + ' m</b>']],
        ['against the record',
         ['world record ' + fmt(S.mark, 2) + ' m',
          'Yes, he breaks the world record by <b>' + fmt(d - S.mark, 2) +
            ' m</b> with a throw of ' + fmt(d, 2) + ' m']]
      ];
    }
  },
  highjump: {
    name: 'the high jump', mode: 'y',
    v0y: 6.16, mark: 2.09,
    title: 'High jump, 6.16 m/s upward',
    steps: function (S) {
      var t = S.v0y / G, h = -G / 2 * t * t + S.v0y * t;
      return [
        ['what we are given',
         ['v<sub>0</sub> (vertical) = ' + fmt(S.v0y, 2) + ' m/s', 'a = −9.81 m/s²',
          'at the apex v<sub>f</sub> (vertical) = 0 m/s']],
        ['time to the apex',
         ['v<sub>y</sub>(t) = −9.81t + v<sub>oy</sub>',
          '0 = −9.81t + ' + fmt(S.v0y, 2),
          't = <b>' + fmt(t, 3) + ' s</b>']],
        ['the height at that instant',
         ['d<sub>y</sub>(t) = −(½)9.81t² + v<sub>oy</sub>t + d<sub>oy</sub>',
          'd<sub>y</sub>(' + fmt(t, 3) + ') = −4.905(' + fmt(t, 3) + ')² + ' +
            fmt(S.v0y, 2) + '(' + fmt(t, 3) + ')',
          'd<sub>y</sub> = <b>' + fmt(h, 2) + ' m</b>',
          'No, she does not break the record of ' + fmt(S.mark, 2) + ' m.']],
        ['or, in one step',
         ['v<sub>f</sub>² = v<sub>0</sub>² + 2ad',
          '(0)² = (' + fmt(S.v0y, 2) + ')² + 2(−9.81)d',
          'd = <b>' + fmt(S.v0y * S.v0y / (2 * G), 2) + ' m</b>']]
      ];
    }
  },
  soccer: {
    name: 'the soccer ball', mode: 'xy',
    v0: 21, deg: 25, y0: 0,
    title: 'Soccer ball, 21 m/s at 25\u00b0',
    /* the lecture rounds to 8.9 and 19.0 and then works with those */
    comp: function (S) {
      var vy = r(S.v0 * Math.sin(S.deg * RAD), 1), vx = r(S.v0 * Math.cos(S.deg * RAD), 1);
      var tu = r(vy / G, 2), tt = r(2 * tu, 2);
      return { vx: vx, vy: vy, tup: tu, ttot: tt, y0: 0, yland: 0,
               h: r(-G / 2 * tu * tu + vy * tu, 2), range: r(vx * tt, 1) };
    },
    steps: function (S) {
      var q = S.comp(S);
      return [
        ['resolve the resultant velocity vector',
         ['sin\u03b8 = Opposite / Hypotenuse \u2192 Opposite = (' + fmt(S.v0, 0) + ' m/s)(sin' +
            fmt(S.deg, 0) + '\u00b0) = <b>' + fmt(q.vy, 1) + ' m/s</b>',
          'cos\u03b8 = Adjacent / Hypotenuse \u2192 Adjacent = (' + fmt(S.v0, 0) + ' m/s)(cos' +
            fmt(S.deg, 0) + '\u00b0) = <b>' + fmt(q.vx, 1) + ' m/s</b>']],
        ['the path upward \u2014 time',
         ['v<sub>f</sub> = at + v<sub>0</sub>',
          '(0 m/s) = (' + fmt(q.vy, 1) + ' m/s) + (\u22129.81 m/s\u00b2)(t)',
          't = <b>' + fmt(q.tup, 2) + ' s</b> to the apex, so ' + fmt(q.tup, 2) +
            ' \u00d7 2 = <b>' + fmt(q.ttot, 2) + ' s</b> in the air']],
        ['the path upward \u2014 vertical displacement',
         ['d(t)<sub>y</sub> = \u00bdat\u00b2 + v<sub>0y</sub>t + d<sub>0y</sub>',
          'd(t)<sub>y</sub> = \u00bd(\u22129.81)(' + fmt(q.tup, 2) + ')\u00b2 + (' +
            fmt(q.vy, 1) + ')(' + fmt(q.tup, 2) + ') + 0',
          'd(t)<sub>y</sub> = <b>' + fmt(q.h, 2) + ' m</b> \u2014 the ball travels ' +
            fmt(q.h, 2) + ' m upwards',
          'or v<sub>f</sub>\u00b2 = v<sub>0</sub>\u00b2 + 2ad \u2192 d = <b>' +
            fmt(r(q.vy * q.vy / (2 * G), 2), 2) + ' m</b>']],
        ['the horizontal distance',
         ['d = v<sub>0</sub>t + d<sub>0</sub>',
          'd = (' + fmt(q.vx, 1) + ' m/s)(' + fmt(q.ttot, 2) + ' s)',
          'd = <b>' + fmt(q.range, 1) + ' m</b> \u2014 the ball travels ' + fmt(q.range, 1) +
            ' m horizontally']]
      ];
    }
  },
  baseball: {
    name: 'the home run', mode: 'xy',
    v0: 33.3, deg: 37, y0: 1.2,
    title: 'Abreu\u2019s baseball, 120 km/hr at 37\u00b0 from 1.2 m',
    comp: function (S) {
      var vy = r(S.v0 * Math.sin(S.deg * RAD), 1), vx = r(S.v0 * Math.cos(S.deg * RAD), 1);
      var tu = r(vy / G, 2);
      var rise = r(-G / 2 * tu * tu + vy * tu, 1);
      var top = r(rise + S.y0, 1);
      var td = r(Math.sqrt(top / (G / 2)), 2);
      var tt = r(tu + td, 2);
      return { vx: vx, vy: vy, tup: tu, rise: rise, top: top, tdown: td, ttot: tt,
               y0: S.y0, yland: 0, range: r(vx * tt, 1) };
    },
    steps: function (S) {
      var q = S.comp(S);
      return [
        ['convert, then resolve',
         ['120 km/hr \u00d7 1000 m \u00f7 3600 s = <b>' + fmt(S.v0, 1) + ' m/s</b>',
          'Opposite = (' + fmt(S.v0, 1) + ' m/s)(sin' + fmt(S.deg, 0) + '\u00b0) = <b>' +
            fmt(q.vy, 1) + ' m/s</b>',
          'Adjacent = (' + fmt(S.v0, 1) + ' m/s)(cos' + fmt(S.deg, 0) + '\u00b0) = <b>' +
            fmt(q.vx, 1) + ' m/s</b>']],
        ['the path upward',
         ['v<sub>f</sub> = at + v<sub>0</sub> \u2192 (0 m/s) = (\u22129.81 m/s\u00b2)(t) + (' +
            fmt(q.vy, 1) + ' m/s)',
          't<sub>up</sub> = <b>' + fmt(q.tup, 2) + ' s</b>',
          'd = (\u00bd)at\u00b2 + v<sub>0</sub>t + d<sub>o</sub> = <b>' + fmt(q.rise, 1) +
            ' m</b> above the bat, or <b>' + fmt(q.top, 1) + ' m</b> above the ground']],
        ['the path downward',
         ['the fall is the rise plus the ' + fmt(S.y0, 1) +
            ' m the ball started above the ground; the initial velocity is 0 m/s',
          '0 m = (\u00bd)(\u22129.81 m/s\u00b2)(t)\u00b2 + (0 m/s)(t) + (' + fmt(q.rise, 1) +
            ' m + ' + fmt(S.y0, 1) + ' m)',
          't<sub>down</sub> = <b>' + fmt(q.tdown, 2) + ' s</b>']],
        ['total time, then the distance',
         ['t<sub>total</sub> = ' + fmt(q.tup, 2) + ' s + ' + fmt(q.tdown, 2) + ' s = <b>' +
            fmt(q.ttot, 2) + ' s</b>',
          'd = (\u00bd)(0 m/s\u00b2)(t)\u00b2 + (' + fmt(q.vx, 1) + ' m/s)(' + fmt(q.ttot, 2) + ' s)',
          'd = <b>' + fmt(q.range, 1) + ' m</b>',
          'The ball reaches a height of ' + fmt(q.top, 1) + ' m and travels ' + fmt(q.range, 1) +
            ' m horizontally.']]
      ];
    }
  },
  platform: {
    name: 'the platform jump', mode: 'xy',
    v0: 6, deg: 45, y0: 1.2, yland: 1.8,
    title: 'Jumping onto a platform, 6 m/s at 45°',
    steps: function (S) {
      var P = flight(S.v0, S.deg, S.y0, S.yland);
      var a = -G / 2, b = S.v0 * Math.sin(S.deg * RAD), c = S.y0 - S.yland;
      return [
        ['derive the equations of motion',
         ['a<sub>y</sub>(t) = −9.81 &nbsp;→&nbsp; v<sub>y</sub>(t) = −9.81t + v<sub>oy</sub> ' +
            '&nbsp;→&nbsp; y(t) = (−9.81/2)t² + v<sub>oy</sub>t + y<sub>o</sub>',
          'a<sub>x</sub>(t) = 0 &nbsp;→&nbsp; v<sub>x</sub>(t) = v<sub>ox</sub> ' +
            '&nbsp;→&nbsp; x(t) = v<sub>ox</sub>t + x<sub>o</sub>']],
        ['substitute the known values',
         ['v<sub>y</sub>(t) = −9.81t + 6sin45°',
          'y(t) = (−9.81/2)t² + 6sin45°t + 1.2',
          'v<sub>x</sub>(t) = 6cos45° &nbsp;·&nbsp; x(t) = 6cos45°t + 0']],
        ['use the appropriate equation',
         ['at the instant of landing the vertical displacement is ' + fmt(S.yland, 1) + ' m',
          '1.8 = (−9.81/2)t² + 6sin45°t + 1.2',
          '0 = (−9.81/2)t² + 6sin45°t − 0.6 &nbsp;<b class="r">a quadratic</b>']],
        ['solve for the two roots',
         ['a = ' + fmt(a, 3) + ', b = 6sin45° = ' + fmt(b, 4) + ', c = ' + fmt(c, 1),
          'x = (−b ± √(b² − 4ac)) / 2a',
          't = <b>' + fmt(P.troot1, 3) + '</b> and t = <b>' + fmt(P.troot2, 3) + '</b>']],
        ['which root, and how far',
         ['the jumper passes ' + fmt(S.yland, 1) + ' m twice — on the way up at ' +
            fmt(P.troot1, 3) + ' s and on the way down at ' + fmt(P.troot2, 3) + ' s',
          'landing is the later one, so the time in the air is <b>' + fmt(P.troot2, 3) + ' s</b>',
          'x(t) = 6cos45°(' + fmt(P.troot2, 3) + ') + 0 = <b>' + fmt(P.range, 2) + ' m</b>']]
      ];
    }
  }
};

function PATH(S) {
  if (S.comp) {
    var q = S.comp(S);
    return flightC(q.vx, q.vy, q.y0, q.yland, S.v0, S.deg);
  }
  return flight(S.v0, S.deg, S.y0, S.yland || 0);
}

D.register('solve', function (node, d) {
  var u = build(node);
  var wrap = u.cv.parentNode.parentNode;
  wrap.classList.add('isplit');
  var side = el('div', 'icalc');
  wrap.insertBefore(side, u.ctl);

  var key = d.preset || 'soccer';
  var S = PROB[key];
  /* data-side="0": the slide already carries the working in its own markup,
     so the figure runs on its own and gets the whole width */
  var withSide = d.side !== '0';
  if (!withSide) { wrap.classList.remove('isplit'); side.style.display = 'none'; }
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : (withSide ? 640 : 900),
                            h: port ? 440 : (withSide ? 450 : 430),
                            padl: 66, padr: 30, padt: 26, padb: 88 });
  var out = readout(u.ctl);
  var rows = S.steps(S);
  var step = Math.min(parseInt(d.step || rows.length, 10), rows.length);

  function draw() {
    var c = ax.c, K = C(), i, t;
    ax.clear();

    if (S.mode === 'x') {
      /* a horizontal flight: distance against time, and the record to beat */
      var DMAX = Math.max(S.v0x * S.t, S.mark) * 1.18;
      ax.setRange(0, S.t * 1.1, 0, DMAX);
      ax.frame({ grid: true, xticks: axisTicks(0, S.t * 1.1), yticks: axisTicks(0, DMAX),
                 xlabel: 'Time (s)', ylabel: 'horizontal displacement (m)', ysize: 12,
                 xfmt: function (q) { return q.toFixed(1); },
                 yfmt: function (q) { return q.toFixed(0); } });
      ax.poly([[0, S.mark], [S.t * 1.1, S.mark]], { color: K.BLUE, width: 1.8, dash: [6, 4] });
      label(c, 'world record ' + fmt(S.mark, 2) + ' m', ax.X(0) + 8, ax.Y(S.mark) - 13,
            { color: K.BLUE, size: 12, plate: true });
      ax.poly([[0, 0], [S.t, S.v0x * S.t]], { color: K.ACC, width: 3 });
      ax.dots([[S.t, S.v0x * S.t]], { color: K.ACC, r: 5.5 });
      label(c, fmt(S.v0x * S.t, 2) + ' m', ax.X(S.t) - 8, ax.Y(S.v0x * S.t) - 14,
            { color: K.ACC, size: 13, align: 'right', plate: true });
      label(c, 'slope = v₀ = ' + fmt(S.v0x, 2) + ' m/s', ax.X(S.t * 0.45), ax.Y(S.v0x * S.t * 0.45) + 20,
            { color: K.MUT, size: 12, plate: true });

    } else if (S.mode === 'y') {
      /* the rise to the apex, and the bar */
      var tu = S.v0y / G, hh = S.v0y * S.v0y / (2 * G);
      var YM = Math.max(hh, S.mark) * 1.22;
      ax.setRange(0, tu * 1.45, 0, YM);
      ax.frame({ grid: true, xticks: axisTicks(0, tu * 1.45), yticks: axisTicks(0, YM),
                 xlabel: 'Time (s)', ylabel: 'height (m)', ysize: 12,
                 xfmt: function (q) { return q.toFixed(2); },
                 yfmt: function (q) { return q.toFixed(1); } });
      ax.poly([[0, S.mark], [tu * 1.45, S.mark]], { color: K.BLUE, width: 1.8, dash: [6, 4] });
      label(c, 'record ' + fmt(S.mark, 2) + ' m', ax.X(tu * 1.45) - 8, ax.Y(S.mark) - 13,
            { color: K.BLUE, size: 12, align: 'right', plate: true });
      var ps = [];
      for (i = 0; i <= 200; i++) { t = tu * 1.45 * i / 200; ps.push([t, -G / 2 * t * t + S.v0y * t]); }
      ax.poly(ps, { color: K.ACC, width: 3 });
      ax.poly([[tu, 0], [tu, hh]], { color: K.MUT, width: 1.3, dash: [4, 4] });
      ax.dots([[tu, hh]], { color: K.GRN, r: 5.5 });
      label(c, fmt(hh, 2) + ' m at ' + fmt(tu, 3) + ' s', ax.X(tu) + 9, ax.Y(hh) - 12,
            { color: K.GRN, size: 12, plate: true });

    } else {
      /* the full parabola, built from the lecture's own components when the
         problem carries them */
      var P = PATH(S);
      var XMAX = Math.max(P.range * 1.14, 3);
      var YMAX = Math.max(P.yap * 1.34, 2);
      ax.setRange(0, XMAX, 0, YMAX);
      ax.frame({ grid: true, xticks: axisTicks(0, XMAX), yticks: axisTicks(0, YMAX),
                 xlabel: 'horizontal displacement (m)', ylabel: 'height (m)', ysize: 12,
                 xfmt: function (q) { return q.toFixed(XMAX < 8 ? 1 : 0); },
                 yfmt: function (q) { return q.toFixed(YMAX < 8 ? 1 : 0); } });
      var qd = S.comp ? S.comp(S) : null;
      drawPath(ax, P, { rangeText: qd ? fmt(qd.range, 1) + ' m' : null });
      /* the launch height, when the object did not start on the ground */
      if (S.y0 > 0.01) {
        ax.poly([[0, 0], [0, S.y0]], { color: K.GRN, width: 2, dash: [4, 3] });
        label(c, fmt(S.y0, 1) + ' m', ax.X(0) + 8, ax.Y(S.y0 / 2),
              { color: K.GRN, size: 11, plate: true });
      }
      /* the earlier root: the height the question asks about is passed twice */
      if (S.yland && isFinite(P.troot1) && P.troot1 > 0) {
        ax.dots([[P.x(P.troot1), P.y(P.troot1)]], { color: K.VIO, r: 5 });
        label(c, 't₁ ' + fmt(P.troot1, 3) + ' s', ax.X(P.x(P.troot1)), ax.Y(P.y(P.troot1)) - 15,
              { color: K.VIO, size: 11, align: 'center', plate: true });
        label(c, 't₂ ' + fmt(P.troot2, 3) + ' s', ax.X(P.range) - 8, ax.Y(P.yland) - 15,
              { color: K.ACC, size: 11, align: 'right', plate: true });
        ax.poly([[0, S.yland], [XMAX, S.yland]], { color: K.MUT, width: 1.2, dash: [3, 3] });
      }
      var Sc = (ax.W - ax.pl - ax.pr) / XMAX * 0.26;
      drawVel(ax, P, P.tland * 0.5, Sc, { labels: false });
    }

    /* ---- the working ---- */
    /* Only the step being worked is spelled out. The ones before it are a
       one-line trail, because the slides around this figure already carry the
       full arithmetic and a panel with all of it does not fit a printed page. */
    var html = '<div class="icalc-h">' + S.title + '</div>';
    for (var k = 0; k < step - 1; k++) {
      html += '<div class="icalc-done">' + (k + 1) + ' · ' + rows[k][0] + '</div>';
    }
    var cur = rows[step - 1];
    html += '<div class="icalc-work">' +
      '<div class="icalc-t"><b>' + step + '</b> · ' + cur[0] + '</div>';
    cur[1].forEach(function (line) { html += '<div class="icalc-eq">' + line + '</div>'; });
    html += '</div>';
    if (withSide) side.innerHTML = html;

    if (S.mode === 'x') {
      var dd = S.v0x * S.t;
      out.innerHTML = 'd = v<sub>0</sub>t = <b class="r">' + fmt(dd, 2) + ' m</b>' +
        ' &nbsp;·&nbsp; record ' + fmt(S.mark, 2) + ' m &nbsp;·&nbsp; <b class="g">breaks it by ' +
        fmt(dd - S.mark, 2) + ' m</b>' +
        '<span class="hint">Nothing vertical enters this at all. Horizontal acceleration is zero, ' +
        'so horizontal displacement is just velocity multiplied by the time the hammer happened ' +
        'to spend in the air.</span>';
    } else if (S.mode === 'y') {
      var hh2 = S.v0y * S.v0y / (2 * G);
      out.innerHTML = 'apex <b class="r">' + fmt(hh2, 2) + ' m</b> at t = <b>' +
        fmt(S.v0y / G, 3) + ' s</b> &nbsp;·&nbsp; record ' + fmt(S.mark, 2) + ' m &nbsp;·&nbsp; ' +
        '<b class="o">' + fmt(S.mark - hh2, 2) + ' m short</b>' +
        '<span class="hint">Two routes to the same answer: find the time to the apex and ' +
        'substitute it into the displacement equation, or go straight there with ' +
        'v<sub>f</sub>² = v<sub>0</sub>² + 2ad, which has no t in it at all.</span>';
    } else {
      var P2 = PATH(S);
      /* quote the lecture's own rounded chain when the problem carries one,
         so the strip under the figure and the working beside it agree */
      var q2 = S.comp ? S.comp(S) : null;
      var tAir = q2 ? (q2.ttot != null ? q2.ttot : P2.tland) : P2.tland;
      var dist = q2 ? q2.range : P2.range;
      var top = q2 && q2.top != null ? q2.top : (q2 && q2.h != null ? q2.h : P2.yap);
      out.innerHTML =
        'v<sub>x</sub> <b class="b">' + fmt(P2.vx, 1) + '</b> &nbsp;·&nbsp; v<sub>y</sub> <b class="o">' +
        fmt(P2.vy, 1) + '</b> m/s &nbsp;·&nbsp; time in the air <b>' + fmt(tAir, q2 ? 2 : 3) +
        ' s</b> &nbsp;·&nbsp; apex <b class="g">' + fmt(top, top < 10 ? 2 : 1) +
        ' m</b> &nbsp;·&nbsp; distance <b class="r">' + fmt(dist, q2 ? 1 : 2) + ' m</b>' +
        '<span class="hint">' +
        (S.yland
          ? 'The landing height is reached <b>twice</b>, so the quadratic has two roots and only ' +
            'the later one is the landing. Substituting the earlier one into the velocity ' +
            'equation gives a positive value — the jumper is still on the way up.'
          : 'Vertical and horizontal are solved separately and joined only by <b>time</b>. The ' +
            'vertical half gives how long the object is in the air; the horizontal half turns ' +
            'that time into a distance.') +
        '</span>';
    }
  }

  if (rows.length > 1 && d.steps !== '0' && withSide) {
    var items = rows.map(function (r, i) { return [i + 1, (i + 1) + ' · ' + r[0]]; });
    chips(u.ctl, items, step, function (k) { step = +k; draw(); });
  }
  node._draw = draw;
  draw();
});

D.boot();
})();
