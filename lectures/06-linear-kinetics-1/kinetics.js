/* ============================================================
   EPHE 341 — Linear Kinetics
   Interactive figures. Needs deck-core.js. No other dependencies.

   The collision figures all solve the same pair of equations — conservation
   of momentum and the coefficient of restitution — so every worked example
   in the lecture is the same widget with different numbers in it.
   ============================================================ */
(function () {
'use strict';

var D = window.DECK;
var Axes = D.Axes, el = D.el, slider = D.slider, playBtn = D.playBtn,
    readout = D.readout, build = D.build, axisTicks = D.axisTicks;
function C() { return D.colors(); }
var G = 9.81;

/* ---------------- shared UI ---------------- */

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
  host.appendChild(s);
  return s;
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
  host.appendChild(row);
  return { light: function (k) {
    btns.forEach(function (b, i) { b.classList.toggle('on', items[i][0] === k); }); } };
}
function ctlRow(host) { var r = el('div', 'ictl-row'); host.appendChild(r); return r; }
function fmt(v, n) { n = n == null ? 2 : n; return v.toFixed(n); }
function minus(s) { return String(s).replace(/-/g, '−'); }
function num(v, n) { return minus(fmt(v, n)); }

/* ---------------- drawing helpers ---------------- */

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
function label(c, s, x, y, o) {
  o = o || {};
  c.save();
  c.font = (o.weight || '700') + ' ' + (o.size || 14) + 'px ui-sans-serif,system-ui,sans-serif';
  c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'middle';
  if (o.plate) {
    var w = c.measureText(s).width, p = 4;
    var ox = o.align === 'right' ? -w - p : (o.align === 'center' ? -w / 2 - p : -p);
    c.fillStyle = C().PLATE; c.globalAlpha = 0.86;
    c.fillRect(x + ox, y - (o.size || 14) * 0.75, w + p * 2, (o.size || 14) * 1.5);
    c.globalAlpha = 1;
  }
  c.fillStyle = o.color || C().INK;
  c.fillText(s, x, y); c.restore();
}
function subLabel(c, base, sub, x, y, o) {
  o = o || {};
  var size = o.size || 16, col = o.color || C().INK;
  c.save();
  c.font = '700 ' + size + 'px ui-sans-serif,system-ui,sans-serif';
  var w = c.measureText(base).width;
  c.restore();
  label(c, base, x, y, { color: col, size: size, weight: '700' });
  label(c, sub, x + w + 1, y + size * 0.30, { color: col, size: size * 0.66, weight: '700' });
  c.save();
  c.font = '700 ' + (size * 0.66) + 'px ui-sans-serif,system-ui,sans-serif';
  var w2 = c.measureText(sub).width;
  c.restore();
  return w + 1 + w2;
}

function ball(c, x, y, r, col, txt) {
  c.save();
  var g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.15, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, col);
  c.fillStyle = g; c.globalAlpha = 0.34; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.globalAlpha = 1; c.strokeStyle = col; c.lineWidth = 2.4;
  c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
  c.restore();
  if (txt) label(c, txt, x, y, { color: col, size: 14, align: 'center' });
}

/* ---------------- the physics ----------------
   Two equations, two unknowns, every time:
     conservation of momentum   mA·vAi + mB·vBi = mA·vAf + mB·vBf
     coefficient of restitution e = (vBf − vAf) / (vAi − vBi)
   Solved once here, used by every collision figure in the lecture. */
function solve(mA, mB, vAi, vBi, e) {
  var M = mA + mB;
  var p = mA * vAi + mB * vBi;
  return {
    vAf: (p + mB * e * (vBi - vAi)) / M,
    vBf: (p + mA * e * (vAi - vBi)) / M,
    pBefore: p
  };
}


/* ============================================================
   1. EQUILIBRIUM — Newton's first law
   At rest and in uniform motion look completely different and are the same
   thing: the forces sum to zero. The only way to tell them apart from the
   forces alone is that you cannot.
   ============================================================ */
D.register('equilibrium', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 720, h: port ? 440 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var m = 70, push = 0, side = 0;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var Wt = m * G;                       /* weight, straight down          */
    var Fz = 0;                           /* vertical: N and W always cancel */
    var Fx = push, Fy = side;             /* the two horizontal axes         */
    var res = Math.hypot(Fx, Fy);
    var a = res / m;
    var still = res < 0.5;

    var gy = H * 0.80, hh = H * 0.56, bx = W * 0.30;
    c.save(); c.strokeStyle = K.SOFT; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(24, gy); c.lineTo(W * 0.62, gy); c.stroke(); c.restore();

    person(c, bx, gy, hh, K.BLUE, K.FILL);
    var comY = gy - hh * 0.56;
    label(c, fmt(m, 0) + ' kg', bx, gy - hh - 16, { color: K.BLUE, size: 13, align: 'center' });

    var FS = 74 / Math.max(300, Wt);
    /* both act at the centre of mass; they are drawn on a line beside the
       body, with a leader back to it, so they do not print over the figure */
    var fx0 = bx + hh * 0.30;
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = 0.55; c.lineWidth = 1;
    c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(bx, comY); c.lineTo(fx0, comY); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.MUT;
    c.beginPath(); c.arc(bx, comY, 3.5, 0, 7); c.fill(); c.restore();
    label(c, 'centre of mass', bx - hh * 0.06, comY + 16,
          { color: K.MUT, size: 11, align: 'right' });

    /* weight down and ground contact up: the only two forces when standing */
    arrow(c, fx0, comY, fx0, comY + Wt * FS, { color: K.INK, width: 3.6 });
    label(c, 'W = ' + fmt(Wt, 0) + ' N', fx0 + 10, comY + Wt * FS + 10,
          { color: K.INK, size: 13, plate: true });
    arrow(c, fx0, comY, fx0, comY - Wt * FS, { color: K.GRN, width: 3.6 });
    label(c, 'N = ' + fmt(Wt, 0) + ' N', fx0 + 10, comY - Wt * FS - 10,
          { color: K.GRN, size: 13, plate: true });
    if (Math.abs(Fx) > 0.5) {
      arrow(c, bx, comY - hh * 0.10, bx + Fx * FS * 2.0, comY - hh * 0.10,
            { color: K.ACC, width: 3.6 });
      label(c, minus(fmt(Fx, 0)) + ' N', bx + Fx * FS * 1.0, comY - hh * 0.10 - 16,
            { color: K.ACC, size: 13, align: 'center', plate: true });
    }
    if (Math.abs(Fy) > 0.5) {
      /* the third axis, drawn as depth so it is visibly not the vertical one */
      var dx = Fy * FS * 1.35, dy = -Fy * FS * 0.62;
      arrow(c, bx, comY + hh * 0.06, bx + dx, comY + hh * 0.06 + dy,
            { color: K.VIO, width: 3.6 });
      label(c, minus(fmt(Fy, 0)) + ' N', bx + dx, comY + hh * 0.06 + dy - 14,
            { color: K.VIO, size: 13, align: 'center', plate: true });
    }

    /* the three sums, which is what static equilibrium actually asserts */
    var sx = W * 0.64, sy = H * 0.26, lh = 40;
    label(c, 'static equilibrium', sx, sy - 44, { color: K.MUT, size: 13 });
    function line(i, sub, val) {
      var ok = Math.abs(val) < 0.5, y = sy + i * lh;
      var w = subLabel(c, '\u03a3F', sub, sx, y,
                       { size: 17, color: ok ? K.GRN : K.ACC });
      label(c, ' = ' + minus(fmt(val, 0)) + ' N', sx + w + 4, y,
            { color: ok ? K.GRN : K.ACC, size: 17 });
      label(c, ok ? '\u2713' : '\u2717', sx - 22, y,
            { color: ok ? K.GRN : K.ACC, size: 18 });
    }
    line(0, 'x', Fx);
    line(1, 'y', Fy);
    line(2, 'z', Fz);
    label(c, 'a = \u03a3F / m = ' + fmt(a, 2) + ' m/s\u00b2', sx, sy + 3 * lh + 14,
          { color: still ? K.GRN : K.ACC, size: 17 });

    out.innerHTML =
      (still ? '<b class="g">static equilibrium</b> — at rest, and staying that way'
             : '<b class="r">not in equilibrium</b> — one of the three sums is not zero') +
      '<span class="hint">Equilibrium is not one equation, it is <b>three</b>: the forces have to ' +
      'sum to zero along every axis independently. Standing still there are only two forces in ' +
      'play — the weight the Earth pulls down with, and the contact force the ground pushes up ' +
      'with — and because they are equal and opposite, all three sums come out zero at once. ' +
      'Add a push along any one axis and that sum breaks on its own, and the body accelerates ' +
      'in that direction and no other.</span>';
  }

  slider(u.ctl, 'Push along x', -200, 200, 5, push,
    function (v) { return minus(fmt(v, 0)) + ' N'; }, function (v) { push = v; draw(); });
  slider(u.ctl, 'Push along y', -200, 200, 5, side,
    function (v) { return minus(fmt(v, 0)) + ' N'; }, function (v) { side = v; draw(); });
  u.ctl.classList.add('g2');
  node._draw = draw;
  draw();
});


/* ============================================================
   2. MOMENTUM  P = mv
   The football player and the cyclist from the slide, side by side, with
   two sliders each. A heavy slow body and a light fast one can carry the
   same momentum, and that is the whole point of the quantity.
   ============================================================ */
D.register('momentum', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 860, h: port ? 380 : 360,
                            padl: 78, padr: 24, padt: 26, padb: 52 });
  var out = readout(u.ctl);
  var A = { m: 110, v: 7, name: 'football player', col: 'BLUE' };
  var B = { m: 78, v: 12, name: 'cyclist', col: 'ORG' };

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    var pa = A.m * A.v, pb = B.m * B.v;
    var top = Math.max(200, Math.max(pa, pb) * 1.2);
    ax.setRange(-0.6, 1.6, 0, top);
    ax.frame({ grid: true, xticks: [], yticks: axisTicks(0, top, 4),
               ylabel: 'momentum (kg·m/s)',
               yfmt: function (v) { return v.toFixed(0); } });
    [[0, A, pa], [1, B, pb]].forEach(function (q) {
      var i = q[0], o = q[1], p = q[2];
      ax.rect(i - 0.32, 0, i + 0.32, p, { fill: K.FILL2, stroke: K[o.col], width: 2 });
      label(c, fmt(p, 0), ax.X(i), ax.Y(p) - 14,
            { color: K[o.col], size: 17, align: 'center' });
      label(c, o.name, ax.X(i), ax.H - ax.pb + 16,
            { color: K[o.col], size: 14, align: 'center', base: 'top' });
      label(c, fmt(o.m, 0) + ' kg × ' + fmt(o.v, 1) + ' m/s', ax.X(i), ax.H - ax.pb + 36,
            { color: K.MUT, size: 12, align: 'center', base: 'top', weight: '600' });
    });

    var diff = Math.abs(pa - pb) / Math.max(pa, pb);
    out.innerHTML =
      'P = mv &nbsp;·&nbsp; <b class="b">' + fmt(pa, 0) + '</b> against <b>' + fmt(pb, 0) +
      '</b> kg·m/s' +
      '<span class="hint">' +
      (diff < 0.04
        ? 'Almost exactly the same momentum from very different bodies — which is the point: ' +
          'momentum is what they have in common, not mass and not speed.'
        : 'Momentum is mass <b>and</b> velocity. Make the lighter one fast enough and it carries ' +
          'as much as the heavier one — try it.') +
      ' Velocity is a vector, so momentum has a direction too.</span>';
  }

  u.ctl.classList.add('g2');
  slider(u.ctl, 'Player mass', 50, 160, 1, A.m, function (v) { return fmt(v, 0) + ' kg'; },
    function (v) { A.m = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'Player speed', 0, 12, 0.1, A.v, function (v) { return fmt(v, 1) + ' m/s'; },
    function (v) { A.v = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'Cyclist mass', 50, 160, 1, B.m, function (v) { return fmt(v, 0) + ' kg'; },
    function (v) { B.m = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'Cyclist speed', 0, 20, 0.1, B.v, function (v) { return fmt(v, 1) + ' m/s'; },
    function (v) { B.v = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  node._draw = draw;
  draw();
});


/* ============================================================
   3. THE COLLISION LAB
   Every worked example in this lecture — the bowling ball, the three
   equal-mass cases, the inelastic pair, Hulk and Andre — is this figure
   with different numbers. The chips are his examples; the sliders make it
   anybody's problem.
   ============================================================ */
var PRESETS = {
  bowl:   { mA: 6,   vAi: 5,   mB: 1,   vBi: 0,    e: 0.4, lab: 'bowling ball and pin' },
  eq1:    { mA: 1,   vAi: 1,   mB: 1,   vBi: 0,    e: 1,   lab: 'equal masses, B at rest' },
  eq2:    { mA: 1,   vAi: 1,   mB: 1,   vBi: -0.5, e: 1,   lab: 'equal masses, head-on' },
  uneq:   { mA: 2,   vAi: 1,   mB: 1,   vBi: -1,   e: 1,   lab: '2 kg meets 1 kg' },
  inel:   { mA: 1,   vAi: 1,   mB: 1,   vBi: 0,    e: 0,   lab: 'perfectly inelastic' },
  hulk:   { mA: 235, vAi: 1.4, mB: 115, vBi: -3.8, e: 0,   lab: 'Andre and Hulk' }
};

D.register('collide', function (node, d) {
  var u = build(node);
  var wrap = u.cv.parentNode.parentNode;
  wrap.classList.add('isplit');
  var side = el('div', 'icalc');
  wrap.insertBefore(side, u.ctl);

  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 640, h: port ? 380 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var P = PRESETS[d.preset || 'eq1'];
  var mA = P.mA, mB = P.mB, vAi = P.vAi, vBi = P.vBi, e = P.e;
  var playing = false, raf, last = 0, tphase = 0;

  function rad(m) { return 16 + Math.pow(m, 0.33) * 12; }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var S = solve(mA, mB, vAi, vBi, e);
    var vmax = Math.max(1e-6, Math.max(Math.abs(vAi), Math.abs(vBi),
                                       Math.abs(S.vAf), Math.abs(S.vBf)));
    var VS = 56 / vmax;
    var rA = Math.min(38, rad(mA)), rB = Math.min(38, rad(mB));

    function row(yy, title, a, b, va, vb) {
      label(c, title, 26, yy - rA - 34, { color: K.MUT, size: 13, weight: '700' });
      c.save(); c.strokeStyle = K.SOFT; c.lineWidth = 1;
      c.beginPath(); c.moveTo(26, yy + 46); c.lineTo(W - 26, yy + 46); c.stroke(); c.restore();
      var xA = W * 0.32, xB = W * 0.68;
      ball(c, xA, yy, rA, K.BLUE, 'A');
      ball(c, xB, yy, rB, K.ORG, 'B');
      label(c, fmt(mA, mA < 10 ? 1 : 0) + ' kg', xA, yy + rA + 16,
            { color: K.BLUE, size: 12, align: 'center' });
      label(c, fmt(mB, mB < 10 ? 1 : 0) + ' kg', xB, yy + rB + 16,
            { color: K.ORG, size: 12, align: 'center' });
      if (Math.abs(va) > 1e-4) {
        arrow(c, xA, yy - rA - 14, xA + va * VS, yy - rA - 14, { color: K.BLUE, width: 3 });
      }
      label(c, num(va, 2) + ' m/s', xA + (va >= 0 ? 6 : -6), yy - rA - 32,
            { color: K.BLUE, size: 13, align: va >= 0 ? 'left' : 'right', plate: true });
      if (Math.abs(vb) > 1e-4) {
        arrow(c, xB, yy - rB - 14, xB + vb * VS, yy - rB - 14, { color: K.ORG, width: 3 });
      }
      label(c, num(vb, 2) + ' m/s', xB + (vb >= 0 ? 6 : -6), yy - rB - 32,
            { color: K.ORG, size: 13, align: vb >= 0 ? 'left' : 'right', plate: true });
    }

    row(H * 0.30, 'Before collision', mA, mB, vAi, vBi);
    row(H * 0.76, 'After collision', mA, mB, S.vAf, S.vBf);

    /* ---- the working ---- */
    var pAf = mA * S.vAf, pBf = mB * S.vBf;
    var kBefore = 0.5 * mA * vAi * vAi + 0.5 * mB * vBi * vBi;
    var kAfter = 0.5 * mA * S.vAf * S.vAf + 0.5 * mB * S.vBf * S.vBf;
    side.innerHTML =
      '<div class="icalc-h">e = <span class="v">' + fmt(e, 2) + '</span> · ' +
        (e > 0.98 ? 'perfectly elastic' : (e < 0.02 ? 'perfectly inelastic' : 'partly elastic')) +
      '</div>' +
      '<div class="icalc-work">' +
      '<div class="icalc-t">momentum is conserved</div>' +
      '<div class="icalc-eq">m<sub>A</sub>v<sub>Ai</sub> + m<sub>B</sub>v<sub>Bi</sub> = ' +
        '<b>' + num(S.pBefore, 2) + '</b> kg·m/s</div>' +
      '<div class="icalc-eq">m<sub>A</sub>v<sub>Af</sub> + m<sub>B</sub>v<sub>Bf</sub> = ' +
        '<b>' + num(pAf + pBf, 2) + '</b> kg·m/s</div>' +
      '<div class="icalc-t" style="margin-top:.5em">the restitution equation</div>' +
      '<div class="icalc-eq">e = (v<sub>Bf</sub> − v<sub>Af</sub>) / ' +
        '(v<sub>Ai</sub> − v<sub>Bi</sub>)</div>' +
      '<div class="icalc-eq">= ' + num(S.vBf - S.vAf, 2) + ' / ' + num(vAi - vBi, 2) +
        ' = <b>' + fmt(e, 2) + '</b></div>' +
      '</div>' +
      '<div class="icalc-vals">' +
      '<div><span>v<sub>Af</sub></span><b>' + num(S.vAf, 2) + '</b></div>' +
      '<div><span>v<sub>Bf</sub></span><b>' + num(S.vBf, 2) + '</b></div>' +
      '<div><span>KE kept</span><b>' + fmt(kBefore > 0 ? kAfter / kBefore * 100 : 100, 0) +
        '%</b></div>' +
      '</div>';

    out.innerHTML =
      'A: ' + num(vAi, 2) + ' → <b class="b">' + num(S.vAf, 2) + '</b> m/s' +
      ' &nbsp;·&nbsp; B: ' + num(vBi, 2) + ' → <b>' + num(S.vBf, 2) + '</b> m/s' +
      '<span class="hint">Momentum is the same before and after, always — that is the law. ' +
      'What the coefficient of restitution decides is how it is <b>shared out</b>. ' +
      (e < 0.02 ? 'At e = 0 they leave together at one velocity and the lost kinetic energy has ' +
                  'gone into deformation and heat.'
                : (e > 0.98 ? 'At e = 1 no kinetic energy is lost at all.'
                            : 'Between the two, some kinetic energy is lost but they still separate.')) +
      '</span>';
  }

  chips(u.ctl, [['bowl', 'bowling ball'], ['eq1', 'equal, B at rest'], ['eq2', 'equal, head-on'],
                ['uneq', '2 kg meets 1 kg'], ['inel', 'inelastic'], ['hulk', 'Andre &amp; Hulk']],
    d.preset || 'eq1', function (k) {
      var q = PRESETS[k];
      mA = q.mA; mB = q.mB; vAi = q.vAi; vBi = q.vBi; e = q.e;
      sync(); draw();
    });
  u.ctl.classList.add('g2');
  var sMA = slider(u.ctl, 'mass A', 0.5, 250, 0.5, mA, function (v) { return fmt(v, 1) + ' kg'; },
    function (v) { mA = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  var sMB = slider(u.ctl, 'mass B', 0.5, 250, 0.5, mB, function (v) { return fmt(v, 1) + ' kg'; },
    function (v) { mB = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  var sVA = slider(u.ctl, 'v<sub>Ai</sub>', -6, 6, 0.1, vAi, function (v) { return num(v, 1) + ' m/s'; },
    function (v) { vAi = v; draw(); }, { scale: 3, tick: function (v) { return minus(fmt(v, 0)); } });
  var sVB = slider(u.ctl, 'v<sub>Bi</sub>', -6, 6, 0.1, vBi, function (v) { return num(v, 1) + ' m/s'; },
    function (v) { vBi = v; draw(); }, { scale: 3, tick: function (v) { return minus(fmt(v, 0)); } });
  var sE = slider(u.ctl, 'coefficient of restitution', 0, 1, 0.05, e,
    function (v) { return fmt(v, 2); }, function (v) { e = v; draw(); },
    { scale: 3, tick: function (v) { return fmt(v, 1); } });
  function sync() { sMA.quiet(mA); sMB.quiet(mB); sVA.quiet(vAi); sVB.quiet(vBi); sE.quiet(e); }
  node._draw = draw;
  draw();
});


/* ============================================================
   4. THE DROP TEST
   e = √(bounce height / drop height). One equation, one experiment, and
   every ball in the equipment room has a number.
   ============================================================ */
var BALLS = [
  { k: 'basket', name: 'basketball', e: 0.81 },
  { k: 'tennis', name: 'tennis ball', e: 0.75 },
  { k: 'golf',   name: 'golf ball',   e: 0.86 },
  { k: 'squash', name: 'squash (cold)', e: 0.30 },
  { k: 'baseb',  name: 'baseball',    e: 0.55 }
];

D.register('drop', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 760, h: port ? 400 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var h0 = 1.8, e = 0.75, kind = 'tennis';
  var playing = false, raf, t0 = 0;

  function draw(anim) {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var h1 = e * e * h0;
    var gy = H * 0.90, top = H * 0.10;
    var PX = (gy - top) / Math.max(0.2, h0);    /* metres → pixels */

    c.save(); c.strokeStyle = K.SOFT; c.lineWidth = 2;
    c.beginPath(); c.moveTo(40, gy); c.lineTo(W - 40, gy); c.stroke(); c.restore();

    /* the two heights, as dimension lines */
    function dim(x, h, col, txt) {
      var y1 = gy, y2 = gy - h * PX;
      c.save();
      c.strokeStyle = col; c.lineWidth = 1.4; c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(x, y1); c.lineTo(x, y2); c.stroke();
      [y1, y2].forEach(function (y) {
        c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x + 9, y); c.stroke();
      });
      c.restore();
      label(c, txt, x - 14, (y1 + y2) / 2, { color: col, size: 14, align: 'right', plate: true });
      c.save();
      c.strokeStyle = col; c.globalAlpha = 0.45; c.lineWidth = 1; c.setLineDash([3, 4]);
      c.beginPath(); c.moveTo(x, y2); c.lineTo(x + 250, y2); c.stroke(); c.restore();
    }
    dim(W * 0.26, h0, K.BLUE, 'drop ' + fmt(h0, 2) + ' m');
    dim(W * 0.66, h1, K.ACC, 'bounce ' + fmt(h1, 2) + ' m');

    /* the ball, either parked at the top or falling and rising */
    var bx, by, r = 17;
    if (anim != null) {
      var tf = Math.sqrt(2 * h0 / G), tr = Math.sqrt(2 * h1 / G);
      var total = tf + 2 * tr;
      var t = anim % total;
      if (t < tf) { bx = W * 0.26 + (W * 0.40) * (t / total); by = gy - (h0 - 0.5 * G * t * t) * PX; }
      else {
        var t2 = t - tf;
        var hh = (Math.sqrt(2 * G * h1) * (t2 > tr ? 2 * tr - t2 : t2)) -
                 0.5 * G * Math.pow(t2 > tr ? 2 * tr - t2 : t2, 2);
        bx = W * 0.26 + (W * 0.40) * (t / total);
        by = gy - Math.max(0, hh) * PX;
      }
    } else { bx = W * 0.26; by = gy - h0 * PX; }
    /* it is a named ball, so it is drawn as that ball; the spin makes the
       fall and the rebound read as motion rather than a jumping dot */
    sportBall(c, bx, by - r, r, kind, (anim || 0) * 2.4);

    label(c, 'e = √( bounce height / drop height )', W - 26, H * 0.055,
          { color: K.MUT, size: 15, align: 'right', plate: true });
    label(c, BALLS.filter(function (q) { return q.k === kind; })[0].name,
          W - 26, H * 0.125, { color: K.INK, size: 16, align: 'right', plate: true });

    out.innerHTML =
      'e = √(' + fmt(h1, 2) + ' / ' + fmt(h0, 2) + ') = <b class="r">' + fmt(e, 2) + '</b>' +
      ' &nbsp;·&nbsp; it comes back to <b>' + fmt(e * e * 100, 0) + '%</b> of the height' +
      '<span class="hint">The coefficient is a ratio of <b>velocities</b>, and height goes with ' +
      'velocity squared — which is why a ball that keeps 75% of its speed only comes back to ' +
      '56% of its height. Change the drop height and the ratio does not move: e belongs to the ' +
      'ball and the surface, not to how far you dropped it.</span>';
  }

  slider(u.ctl, 'Drop height', 0.3, 3, 0.05, h0, function (v) { return fmt(v, 2) + ' m'; },
    function (v) { h0 = v; draw(); }, { scale: 4, tick: function (v) { return fmt(v, 1); } });
  var sE = slider(u.ctl, 'Coefficient of restitution', 0.1, 0.95, 0.01, e,
    function (v) { return fmt(v, 2); }, function (v) { e = v; draw(); },
    { scale: 4, tick: function (v) { return fmt(v, 1); } });
  chips(u.ctl, BALLS.map(function (b) { return [b.k, b.name]; }), kind, function (k) {
    var b = BALLS.filter(function (q) { return q.k === k; })[0];
    e = b.e; kind = k; sE.quiet(e); draw();
  });
  var r = ctlRow(u.ctl);
  var pb = playBtn(r, '▶ Drop it');
  pb.addEventListener('click', function () {
    playing = !playing;
    pb.textContent = playing ? '❚❚ Pause' : '▶ Drop it';
    if (playing) { t0 = 0; raf = requestAnimationFrame(loop); }
    else { cancelAnimationFrame(raf); draw(); }
  });
  function loop(ts) {
    if (!t0) t0 = ts;
    draw((ts - t0) / 1000);
    raf = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Drop it'; draw(); };
  node._draw = function () { draw(); };
  draw();
});


/* ============================================================
   5. A COLLISION IN TWO DIMENSIONS
   The lecture's own problem: ball A at 5 m/s hits ball B at rest, and
   leaves at 2 m/s, 30° off its original line. Momentum is conserved in x
   and in y separately, which is the only new idea on the slide.
   ============================================================ */
D.register('collide2d', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 760, h: port ? 360 : 300,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var m = 0.1, vAi = 5, vAf = 2, ang = 30;
  var step = parseInt(d.step || 3, 10);

  /* His board carries the momentum terms to two decimals — 0.17 kg·m/s for
     A's x momentum — and then divides. Solving exactly instead gives 3.27 and
     3.42 where the slide says 3.3 and 3.45, so the figure rounds where he
     rounds and the two agree. */
  function r2(v) { return Math.round(v * 100) / 100; }
  function state() {
    var th = ang * Math.PI / 180;
    var afx = vAf * Math.cos(th), afy = vAf * Math.sin(th);
    var bfx = (r2(m * vAi) - r2(m * afx)) / m, bfy = (0 - r2(m * afy)) / m;
    return { afx: afx, afy: afy, bfx: bfx, bfy: bfy,
             vBf: Math.hypot(bfx, bfy),
             thB: Math.atan2(bfy, bfx) * 180 / Math.PI };
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var S = state();
    var ox = W * 0.30, oy = H * 0.54, SC = 36;

    c.save(); c.strokeStyle = K.SOFT; c.lineWidth = 1.2; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(24, oy); c.lineTo(W - 24, oy); c.stroke();
    c.beginPath(); c.moveTo(ox, 20); c.lineTo(ox, H - 20); c.stroke();
    c.restore();
    label(c, 'x', W - 16, oy - 12, { color: K.MUT, size: 13 });
    label(c, 'y', ox + 10, 26, { color: K.MUT, size: 13 });

    /* A coming in */
    arrow(c, ox - vAi * SC, oy, ox - 12, oy, { color: K.BLUE, width: 3.4 });
    label(c, 'A  ' + fmt(vAi, 0) + ' m/s', ox - vAi * SC - 4, oy - 18,
          { color: K.BLUE, size: 13, plate: true });
    ball(c, ox, oy, 15, K.ORG, 'B');

    if (step >= 2) {
      /* A leaving at its angle */
      arrow(c, ox, oy, ox + S.afx * SC, oy - S.afy * SC, { color: K.BLUE, width: 3.2 });
      label(c, fmt(vAf, 0) + ' m/s', ox + S.afx * SC + 8, oy - S.afy * SC - 10,
            { color: K.BLUE, size: 13, plate: true });
      c.save();
      c.strokeStyle = K.BLUE; c.lineWidth = 1.4; c.setLineDash([3, 3]);
      c.beginPath(); c.arc(ox, oy, 46, -ang * Math.PI / 180, 0); c.stroke(); c.restore();
      label(c, fmt(ang, 0) + '°', ox + 58, oy - 20,
            { color: K.BLUE, size: 13, plate: true });
    }
    if (step >= 3) {
      arrow(c, ox, oy, ox + S.bfx * SC, oy - S.bfy * SC, { color: K.ACC, width: 3.6 });
      label(c, 'B  ' + fmt(S.vBf, 2) + ' m/s', ox + S.bfx * SC + 8, oy - S.bfy * SC + 14,
            { color: K.ACC, size: 13, plate: true });
      if (step >= 4) {
        c.save();
        c.strokeStyle = K.ACC; c.globalAlpha = 0.6; c.lineWidth = 1.3; c.setLineDash([4, 3]);
        c.beginPath(); c.moveTo(ox + S.bfx * SC, oy - S.bfy * SC); c.lineTo(ox + S.bfx * SC, oy); c.stroke();
        c.beginPath(); c.moveTo(ox + S.bfx * SC, oy - S.bfy * SC); c.lineTo(ox, oy - S.bfy * SC); c.stroke();
        c.restore();
        label(c, 'Vₓ ' + fmt(S.bfx, 2), ox + S.bfx * SC / 2, oy + 18,
              { color: K.ACC, size: 12, align: 'center', plate: true });
        label(c, 'Vᵧ ' + num(S.bfy, 2), ox + S.bfx * SC + 10, oy - S.bfy * SC / 2,
              { color: K.ACC, size: 12, plate: true });
      }
    }


    out.innerHTML =
      'B leaves at <b class="r">' + fmt(S.vBf, 2) + ' m/s</b>, ' +
      fmt(Math.abs(S.thB), 1) + '° below the x axis' +
      '<span class="hint">The y momentum started at zero, so whatever A takes upward, B must take ' +
      'downward by exactly as much. Two equations, one for each axis — that is the whole of ' +
      'two-dimensional conservation.</span>';
  }

  chips(u.ctl, [[1, '1 · the set-up'], [2, '2 · A leaves'], [3, '3 · components'],
                [4, '4 · the answer']], step, function (v) { step = +v; draw(); });
  u.ctl.classList.add('g2');
  slider(u.ctl, 'A before', 1, 8, 0.1, vAi, function (v) { return fmt(v, 1) + ' m/s'; },
    function (v) { vAi = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'A after', 0.2, 6, 0.1, vAf, function (v) { return fmt(v, 1) + ' m/s'; },
    function (v) { vAf = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'A deflected by', 0, 80, 1, ang, function (v) { return fmt(v, 0) + '°'; },
    function (v) { ang = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  node._draw = draw;
  draw();
});


/* ============================================================
   7. ACTION AND REACTION
   The pair is applied to two different bodies, which is the part that gets
   missed. Push harder on the ground and the ground pushes harder on you —
   and you are the one who accelerates.
   ============================================================ */
D.register('reaction', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 720, h: port ? 400 : 410,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var m = 70, grf = 1.0;      /* ground reaction, in body weights */

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var Wt = m * G, N = grf * Wt, net = N - Wt, a = net / m;

    var gy = H * 0.76;
    c.save();
    c.fillStyle = K.PANEL; c.fillRect(30, gy, W - 60, 26);
    c.strokeStyle = K.SOFT; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(30, gy); c.lineTo(W - 30, gy); c.stroke(); c.restore();
    label(c, 'the ground', W - 40, gy + 13, { color: K.MUT, size: 12, align: 'right' });

    var bx = W * 0.34, bw = 54, bh = 116;
    c.save();
    c.fillStyle = K.FILL; c.strokeStyle = K.BLUE; c.lineWidth = 2;
    c.fillRect(bx - bw / 2, gy - bh, bw, bh); c.strokeRect(bx - bw / 2, gy - bh, bw, bh);
    c.restore();
    label(c, fmt(m, 0) + ' kg', bx, gy - bh / 2, { color: K.BLUE, size: 13, align: 'center' });

    var S = 120 / (Wt * 2.6);
    /* on the jumper: the ground pushes up */
    arrow(c, bx, gy - 6, bx, gy - 6 - N * S, { color: K.GRN, width: 4.4 });
    label(c, 'on the jumper: ' + fmt(N, 0) + ' N up', bx + 14, gy - 6 - N * S - 12,
          { color: K.GRN, size: 13, plate: true });
    /* on the ground: the jumper pushes down, same size, other body */
    arrow(c, bx + 4, gy + 6, bx + 4, gy + 6 + Math.min(70, N * S), { color: K.ACC, width: 4.4 });
    label(c, 'on the ground: ' + fmt(N, 0) + ' N down', bx + 18, gy + 6 + Math.min(70, N * S) + 10,
          { color: K.ACC, size: 13, plate: true });
    /* weight */
    arrow(c, bx - 26, gy - bh / 2, bx - 26, gy - bh / 2 + Wt * S, { color: K.INK, width: 3 });
    label(c, 'W ' + fmt(Wt, 0) + ' N', bx - 34, gy - bh / 2 + Wt * S + 12,
          { color: K.INK, size: 12, align: 'right', plate: true });

    var ex = W * 0.74, ey = H * 0.26;
    label(c, 'ΣF = N − W', ex, ey, { color: K.MUT, size: 16 });
    label(c, '= ' + fmt(N, 0) + ' − ' + fmt(Wt, 0) + ' = ' + num(net, 0) + ' N',
          ex, ey + 30, { color: net > 0 ? K.GRN : K.ACC, size: 16 });
    label(c, 'a = ' + num(a, 2) + ' m/s²', ex, ey + 66,
          { color: net > 0 ? K.GRN : K.ACC, size: 18 });

    out.innerHTML =
      'ground reaction <b class="g">' + fmt(grf, 2) + ' × body weight</b>' +
      ' &nbsp;·&nbsp; net <b>' + num(net, 0) + ' N</b>' +
      ' &nbsp;·&nbsp; a = <b>' + num(a, 2) + ' m/s²</b>' +
      '<span class="hint">The two big arrows are the <b>action and reaction pair</b>, and they are ' +
      'always equal and opposite — but they act on <b>different bodies</b>, so they never ' +
      'cancel each other. Only the forces on the jumper decide what the jumper does, and there the ' +
      'ground reaction is up against weight. ' +
      (net > 0 ? 'Right now the ground is winning and the jumper accelerates upward.'
               : (net < 0 ? 'Right now weight is winning and the jumper is being slowed or pressed down.'
                          : 'Right now they balance exactly and nothing accelerates.')) +
      '</span>';
  }

  slider(u.ctl, 'Body mass', 40, 120, 1, m, function (v) { return fmt(v, 0) + ' kg'; },
    function (v) { m = v; draw(); }, { scale: 4, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'Ground reaction', 0, 3, 0.05, grf,
    function (v) { return fmt(v, 2) + ' × BW'; }, function (v) { grf = v; draw(); },
    { scale: 4, tick: function (v) { return fmt(v, 1); } });
  node._draw = draw;
  draw();
});

/* ---------------- a standing figure, drawn ----------------
   Slide 5 is about a person standing still, so the body on the canvas is a
   person and not a grey box. Height is in pixels from feet to the top of the
   head; everything else is a fraction of it. */
function person(c, x, footY, h, col, fill) {
  var headR = h * 0.085, hipY = footY - h * 0.47, shY = footY - h * 0.79;
  c.save();
  c.strokeStyle = col; c.lineWidth = Math.max(2.4, h * 0.026);
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (fill) { c.fillStyle = fill; }
  /* head */
  c.beginPath(); c.arc(x, footY - h + headR, headR, 0, 7);
  if (fill) c.fill();
  c.stroke();
  /* trunk */
  c.beginPath(); c.moveTo(x, footY - h + headR * 2); c.lineTo(x, hipY); c.stroke();
  /* arms, hanging */
  c.beginPath();
  c.moveTo(x, shY); c.lineTo(x - h * 0.13, shY + h * 0.17); c.lineTo(x - h * 0.10, hipY + h * 0.05);
  c.stroke();
  c.beginPath();
  c.moveTo(x, shY); c.lineTo(x + h * 0.13, shY + h * 0.17); c.lineTo(x + h * 0.10, hipY + h * 0.05);
  c.stroke();
  /* legs */
  c.beginPath();
  c.moveTo(x, hipY); c.lineTo(x - h * 0.07, footY - h * 0.22); c.lineTo(x - h * 0.08, footY);
  c.stroke();
  c.beginPath();
  c.moveTo(x, hipY); c.lineTo(x + h * 0.07, footY - h * 0.22); c.lineTo(x + h * 0.08, footY);
  c.stroke();
  c.restore();
  return { hipY: hipY, shY: shY, comY: footY - h * 0.56 };
}

/* ---------------- sport balls, drawn as themselves ----------------
   The drop-test figure names a specific ball, so it should look like that
   ball: a basketball has its seams, a tennis ball its curve, a golf ball its
   dimples. Rotation is carried through so a bouncing ball visibly spins. */
function sportBall(c, x, y, r, kind, spin) {
  spin = spin || 0;
  c.save();
  c.translate(x, y); c.rotate(spin);
  var body = { basket: '#d1752b', tennis: '#d8e63c', golf: '#f4f4f0',
               squash: '#2b2b30', baseb: '#f6f2e8' }[kind] || '#888';
  var line = { basket: '#4a2a12', tennis: '#ffffff', golf: '#b9b9ad',
               squash: '#6a6a72', baseb: '#c3362f' }[kind] || '#444';
  var g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.22, body); g.addColorStop(1, body);
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.save(); c.beginPath(); c.arc(0, 0, r, 0, 7); c.clip();
  c.strokeStyle = line; c.lineWidth = Math.max(1, r * 0.075); c.lineCap = 'round';
  if (kind === 'basket') {
    c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
    c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke();
    c.beginPath(); c.ellipse(-r * 0.98, 0, r * 0.62, r, 0, 0, 7); c.stroke();
    c.beginPath(); c.ellipse(r * 0.98, 0, r * 0.62, r, 0, 0, 7); c.stroke();
  } else if (kind === 'tennis') {
    c.beginPath(); c.ellipse(-r * 1.05, 0, r * 0.72, r * 1.02, 0, 0, 7); c.stroke();
    c.beginPath(); c.ellipse(r * 1.05, 0, r * 0.72, r * 1.02, 0, 0, 7); c.stroke();
  } else if (kind === 'golf') {
    c.fillStyle = line; c.globalAlpha = 0.55;
    for (var i = -3; i <= 3; i++) {
      for (var j = -3; j <= 3; j++) {
        var dx = i * r * 0.30 + (j % 2 ? r * 0.15 : 0), dy = j * r * 0.28;
        if (dx * dx + dy * dy > r * r * 0.82) continue;
        c.beginPath(); c.arc(dx, dy, r * 0.085, 0, 7); c.fill();
      }
    }
    c.globalAlpha = 1;
  } else if (kind === 'squash') {
    c.fillStyle = '#e8c93a';
    c.beginPath(); c.arc(r * 0.30, -r * 0.24, r * 0.16, 0, 7); c.fill();
  } else if (kind === 'baseb') {
    c.lineWidth = Math.max(1, r * 0.055);
    [-1, 1].forEach(function (s) {
      c.beginPath();
      c.ellipse(s * r * 1.02, 0, r * 0.62, r * 0.98, 0, 0, 7);
      c.stroke();
      for (var k = -3; k <= 3; k++) {
        var yy = k * r * 0.22, xx = s * (r * 0.40 + Math.abs(yy) * 0.18);
        c.beginPath(); c.moveTo(xx - s * r * 0.10, yy - r * 0.05);
        c.lineTo(xx + s * r * 0.10, yy + r * 0.05); c.stroke();
      }
    });
  }
  c.restore();
  c.strokeStyle = 'rgba(0,0,0,.30)'; c.lineWidth = Math.max(1, r * 0.06);
  c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke();
  c.restore();
}


/* ============================================================
   DYNAMIC EQUILIBRIUM
   The first law's other half, and the harder half to believe: a body moving
   at constant velocity has no net force on it. The figure keeps a drive
   force and a resistance on screen with a velocity trace underneath, so the
   claim is testable — flatten the sum and the trace goes flat, unbalance it
   by 5 N and it does not.
   ============================================================ */
D.register('dyneq', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 760, h: port ? 560 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var m = 80, drive = 60, drag = 60, v = 6;
  var playing = false, raf, last = 0, t = 0, trace = [], xpos = 0;

  function reset() { t = 0; trace = []; v = 6; xpos = 0; }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var net = drive - drag, a = net / m;
    var balanced = Math.abs(net) < 0.5;

    /* ---- the skater, on a line, with the two horizontal forces ---- */
    var topH = port ? H * 0.40 : H * 0.50;
    var gy = topH * 0.90;
    c.save(); c.strokeStyle = K.SOFT; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(24, gy); c.lineTo(W - 24, gy); c.stroke(); c.restore();

    /* the figure travels between two margins wide enough that neither force
       label can run off the side of the canvas */
    var lm = W * 0.30, rm = W * 0.74;
    var bx = lm + (xpos % Math.max(40, rm - lm));
    var hh = topH * 0.70;
    person(c, bx, gy, hh, K.BLUE, K.FILL);
    var comY = gy - hh * 0.58;

    /* the arrows start clear of the arms so they read as forces on the body
       rather than lines drawn through it */
    var FS = (W * 0.16) / 120, off = hh * 0.15;
    arrow(c, bx + off, comY, bx + off + drive * FS, comY, { color: K.GRN, width: 4 });
    label(c, 'drive ' + fmt(drive, 0) + ' N', bx + off + drive * FS + 8, comY - 15,
          { color: K.GRN, size: 13, plate: true });
    arrow(c, bx - off, comY + 26, bx - off - drag * FS, comY + 26, { color: K.ACC, width: 4 });
    label(c, 'resistance ' + fmt(drag, 0) + ' N', bx - off - drag * FS - 8, comY + 42,
          { color: K.ACC, size: 13, align: 'right', plate: true });

    label(c, 'ΣF = ' + fmt(drive, 0) + ' − ' + fmt(drag, 0) + ' = ' + num(net, 0) + ' N',
          W - 30, 26, { color: balanced ? K.GRN : K.ACC, size: 16, align: 'right' });
    label(c, 'a = ΣF / m = ' + num(a, 2) + ' m/s²',
          W - 30, 50, { color: balanced ? K.GRN : K.ACC, size: 16, align: 'right' });

    /* ---- the velocity trace, which is where the claim is settled ---- */
    var lo = 0, hi = 14;
    ax.pl = 60; ax.pr = 26; ax.pt = topH + 22; ax.pb = 40;
    ax.setRange(0, 12, lo, hi);
    ax.frame({ grid: true, xticks: [0, 3, 6, 9, 12], yticks: [0, 4, 8, 12],
               xlabel: 'time (s)', ylabel: 'velocity (m/s)', ysize: 12, ylabelx: 12,
               xfmt: function (q) { return fmt(q, 0); },
               yfmt: function (q) { return fmt(q, 0); } });
    ax.poly([[0, 6], [12, 6]], { color: K.SOFT, width: 1.2, dash: [4, 4] });
    if (trace.length > 1) ax.poly(trace, { color: balanced ? K.GRN : K.ACC, width: 2.8 });
    else {
      ax.dots([[0, v]], { color: balanced ? K.GRN : K.ACC, r: 4 });
      label(c, 'press play', ax.X(0.5), ax.Y(v) - 16, { color: K.MUT, size: 12 });
    }

    out.innerHTML =
      (balanced ? '<b class="g">dynamic equilibrium</b> — moving, and staying that way'
                : '<b class="r">not in equilibrium</b> — the velocity is changing') +
      ' &nbsp;·&nbsp; v = <b>' + fmt(v, 2) + ' m/s</b>' +
      '<span class="hint">Uniform motion means <b>constant velocity</b>, and constant velocity ' +
      'means zero acceleration, which by F = ma means zero net force. So the force diagram here ' +
      'is the same one as for a body standing still — equal and opposite, summing to nothing. ' +
      'Motion does not need a force to keep it going; only a <b>change</b> of motion does. ' +
      'Nudge the drive away from the resistance and watch the trace tilt.</span>';
  }

  slider(u.ctl, 'Drive force', 0, 120, 1, drive, function (q) { return fmt(q, 0) + ' N'; },
    function (q) { drive = q; draw(); });
  slider(u.ctl, 'Resistance', 0, 120, 1, drag, function (q) { return fmt(q, 0) + ' N'; },
    function (q) { drag = q; draw(); });
  u.ctl.classList.add('g2');
  var r = ctlRow(u.ctl);
  var pb = playBtn(r, '▶ Let it run');
  var rb = el('button', 'ibtn', 'Reset');
  rb.setAttribute('data-unsafe', '1');
  rb.addEventListener('click', function () { reset(); draw(); });
  r.appendChild(rb);
  pb.addEventListener('click', function () {
    playing = !playing;
    pb.textContent = playing ? '❚❚ Pause' : '▶ Let it run';
    if (playing) { last = 0; raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf);
  });
  function loop(ts) {
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    t += dt;
    v = Math.max(0, Math.min(14, v + (drive - drag) / m * dt));
    xpos += v * 9 * dt;
    trace.push([Math.min(12, t), v]);
    if (t > 12) { t = 0; trace = []; }
    draw();
    if (playing) raf = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Let it run'; };
  node._draw = draw;
  draw();
});


/* ============================================================
   VELOCITY OF APPROACH AND VELOCITY OF SEPARATION
   The two quantities the coefficient of restitution is built out of, drawn
   as what they are: the closing speed before, the opening speed after. e is
   the ratio of the second to the first and nothing more.
   ============================================================ */
D.register('approach', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 820, h: port ? 520 : 420,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var mA = 1, mB = 1, vAi = 3, vBi = -1, e = 0.6;
  var playing = false, raf, last = 0, ph = 0;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var S = solve(mA, mB, vAi, vBi, e);
    var app = vAi - vBi, sep = S.vBf - S.vAf;
    var vmax = Math.max(1e-6, Math.abs(vAi), Math.abs(vBi), Math.abs(S.vAf), Math.abs(S.vBf));
    var VS = Math.min(64, (W * 0.16) / vmax);
    var R = port ? 24 : 30;

    function row(yy, title, va, vb, gap, close, tag) {
      label(c, title, 26, yy - R - 46, { color: K.MUT, size: 13 });
      c.save(); c.strokeStyle = K.SOFT; c.lineWidth = 1;
      c.beginPath(); c.moveTo(26, yy + R + 30); c.lineTo(W - 26, yy + R + 30); c.stroke();
      c.restore();
      var xA = W * 0.5 - gap, xB = W * 0.5 + gap;
      ball(c, xA, yy, R, K.BLUE, 'A');
      ball(c, xB, yy, R, K.ORG, 'B');
      if (Math.abs(va) > 1e-3)
        arrow(c, xA + Math.sign(va) * R * 0.5, yy, xA + Math.sign(va) * R * 0.5 + va * VS, yy,
              { color: K.BLUE, width: 3.2 });
      if (Math.abs(vb) > 1e-3)
        arrow(c, xB + Math.sign(vb) * R * 0.5, yy, xB + Math.sign(vb) * R * 0.5 + vb * VS, yy,
              { color: K.ORG, width: 3.2 });
      label(c, num(va, 2) + ' m/s', xA, yy - R - 14, { color: K.BLUE, size: 13, align: 'center' });
      label(c, num(vb, 2) + ' m/s', xB, yy - R - 14, { color: K.ORG, size: 13, align: 'center' });

      /* the closing (or opening) speed, as a measured span between them */
      var by = yy + R + 16, col = tag === 'approach' ? K.ACC : K.GRN;
      var L = Math.min(W * 0.34, Math.abs(close) * VS);
      var mx = W * 0.5;
      c.save(); c.strokeStyle = col; c.lineWidth = 1.4; c.setLineDash([4, 3]);
      [xA, xB].forEach(function (x) {
        c.beginPath(); c.moveTo(x, yy + R + 2); c.lineTo(x, by); c.stroke();
      });
      c.restore();
      if (L > 4) {
        arrow(c, mx - L / 2, by, mx + L / 2, by, { color: col, width: 2.6 });
        arrow(c, mx + L / 2, by, mx - L / 2, by, { color: col, width: 2.6 });
      }
      label(c, (tag === 'approach' ? 'velocity of approach  ' : 'velocity of separation  ') +
               fmt(Math.abs(close), 2) + ' m/s',
            mx, by + 20, { color: col, size: 13.5, align: 'center' });
    }

    var gapBefore = W * 0.15 + (1 - ph) * W * 0.06;
    row(H * (port ? 0.17 : 0.24), 'Before the collision', vAi, vBi, gapBefore, app, 'approach');
    row(H * (port ? 0.76 : 0.82), 'After the collision', S.vAf, S.vBf, W * 0.21, sep, 'separate');

    /* the ratio, in the band between the two rows */
    label(c, 'e  =  velocity of separation / velocity of approach',
          W * 0.5, H * (port ? 0.44 : 0.50), { color: K.MUT, size: 14, align: 'center' });
    label(c, '=  ' + fmt(Math.abs(sep), 2) + ' / ' + fmt(Math.abs(app), 2) +
             '  =  ' + fmt(e, 2),
          W * 0.5, H * (port ? 0.50 : 0.585), { color: K.INK, size: 18, align: 'center' });

    out.innerHTML =
      'approach <b class="r">' + fmt(Math.abs(app), 2) + ' m/s</b>' +
      ' &nbsp;·&nbsp; separation <b class="g">' + fmt(Math.abs(sep), 2) + ' m/s</b>' +
      ' &nbsp;·&nbsp; e = <b>' + fmt(e, 2) + '</b>' +
      '<span class="hint">Neither quantity belongs to one ball: the velocity of approach is how ' +
      'fast the <b>gap is closing</b>, the difference of the two velocities. Because e is a ratio ' +
      'of two speeds it has <b>no units</b>, and it cannot exceed 1 without energy coming from ' +
      'somewhere.</span>';
  }

  u.ctl.classList.add('g2');
  slider(u.ctl, 'v<sub>Ai</sub>', -5, 5, 0.1, vAi, function (q) { return num(q, 1) + ' m/s'; },
    function (q) { vAi = q; draw(); });
  slider(u.ctl, 'v<sub>Bi</sub>', -5, 5, 0.1, vBi, function (q) { return num(q, 1) + ' m/s'; },
    function (q) { vBi = q; draw(); });
  slider(u.ctl, 'restitution', 0, 1, 0.05, e, function (q) { return fmt(q, 2); },
    function (q) { e = q; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   THE ONE-DIMENSIONAL COLLISION, WITH THE MOTION IN IT
   Slides 19–27 of the original are six animated gifs of two blocks sliding
   into each other, one worked case per pair of slides. This is that
   animation: the blocks approach, touch, and leave at the velocities the
   two equations give, on a loop, with the arrows labelled as they are on
   his slides.

   data-ma / data-mb / data-va / data-vb / data-e  set the case
   data-reveal="0"   hides the outgoing velocities, for the slide that is
                     still setting the problem up
   data-shape="ball" draws pool balls instead of blocks
   data-unit         a word for the mass label ("m", "2m", "kg")
   ============================================================ */
D.register('blocks', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 820, h: port ? 350 : 285,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var mA = parseFloat(d.ma || 1), mB = parseFloat(d.mb || 1);
  var vAi = parseFloat(d.va || 1), vBi = parseFloat(d.vb || 0);
  var e = d.e == null ? 1 : parseFloat(d.e);
  var reveal = d.reveal !== '0';
  var round = d.shape === 'ball';
  var playing = false, raf, last = 0;

  /* --- the run, in metres, laid out so the touch happens mid-canvas --- */
  var S = solve(mA, mB, vAi, vBi, e);
  function recompute() { S = solve(mA, mB, vAi, vBi, e); }

  var t = 0, TCON = 1.6, TEND = 3.4;          /* seconds: contact, and loop end */

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var stuck = Math.abs(S.vBf - S.vAf) < 1e-6;

    /* geometry: half-width of each body, and the x of the contact point */
    var hw = Math.min(46, W * 0.062) * (round ? 0.85 : 1);
    var hA = hw * (round ? 1 : 1), hB = hw;
    var cx = W * 0.52, gy = H * (port ? 0.46 : 0.50);

    /* pixels per metre, chosen so nothing leaves the canvas in either phase */
    var vin = Math.max(Math.abs(vAi), Math.abs(vBi), 1e-6);
    var vout = Math.max(Math.abs(S.vAf), Math.abs(S.vBf), 1e-6);
    var PX = Math.min((cx - hA - 40) / (vin * TCON),
                      (W - cx - hB - 40) / Math.max(vout * (TEND - TCON), vin * TCON));

    var xA, xB;
    if (t <= TCON) {
      xA = cx - hA - (TCON - t) * vAi * PX;
      xB = cx + hB - (TCON - t) * vBi * PX;
    } else {
      xA = cx - hA + (t - TCON) * S.vAf * PX;
      xB = cx + hB + (t - TCON) * S.vBf * PX;
    }
    /* perfectly inelastic: they travel as one body from the moment of contact */
    if (stuck && t > TCON) { xB = xA + hA + hB; }

    /* the track */
    c.save(); c.strokeStyle = K.SOFT; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(20, gy + hw * 0.72); c.lineTo(W - 20, gy + hw * 0.72); c.stroke();
    c.restore();

    function body(x, half, col, mass, tag) {
      if (round) {
        ball(c, x, gy, half, col, tag);
      } else {
        c.save();
        c.fillStyle = col; c.globalAlpha = 0.30;
        c.fillRect(x - half, gy - half * 0.62, half * 2, half * 1.24);
        c.globalAlpha = 1; c.strokeStyle = col; c.lineWidth = 2.4;
        c.strokeRect(x - half, gy - half * 0.62, half * 2, half * 1.24);
        c.restore();
      }
      label(c, mass, x, gy + (round ? half + 16 : 0), { color: col, size: 15, align: 'center' });
      if (round) label(c, tag, x, gy, { color: col, size: 14, align: 'center' });
    }

    function vec(x, half, v, col, shown) {
      var ay = gy - half * 0.62 - 26;
      if (!shown) {
        label(c, '?', x, ay - 4, { color: K.MUT, size: 20, align: 'center' });
        return;
      }
      var VS = Math.min(74, (W * 0.11) / Math.max(vin, vout));
      /* the arrow leaves the body at its leading edge, as it does on his gifs */
      var x0 = x + (v >= 0 ? half : -half);
      if (Math.abs(v) > 1e-4)
        arrow(c, x0, ay, x0 + v * VS, ay, { color: col, width: 3.2 });
      label(c, num(v, 2) + ' m/s', x0 + v * VS / 2, ay - 20,
            { color: col, size: 13, align: 'center' });
    }

    var mlabA = fmt(mA, mA % 1 ? 1 : 0) + ' kg', mlabB = fmt(mB, mB % 1 ? 1 : 0) + ' kg';
    body(xA, hA, K.BLUE, mlabA, 'A');
    body(xB, hB, K.ORG, mlabB, 'B');
    var showOut = reveal || t <= TCON;
    vec(xA, hA, t <= TCON ? vAi : S.vAf, K.BLUE, t <= TCON || reveal);
    vec(xB, hB, t <= TCON ? vBi : S.vBf, K.ORG, t <= TCON || reveal);

    label(c, t <= TCON ? 'before the collision' : 'after the collision', 24, 24,
          { color: K.MUT, size: 13 });
    label(c, 'e = ' + fmt(e, 2), W - 24, 24, { color: K.MUT, size: 13, align: 'right' });

    /* the momentum ledger, under the track */
    var pA0 = mA * vAi, pB0 = mB * vBi, pA1 = mA * S.vAf, pB1 = mB * S.vBf;
    var ly = gy + hw * 2.0;
    label(c, 'momentum before   ' + num(pA0, 2) + '  +  ' + num(pB0, 2) + '  =  ' +
             num(pA0 + pB0, 2) + ' kg·m/s', W * 0.5, ly, { color: K.MUT, size: 13.5,
             align: 'center' });
    if (reveal)
      label(c, 'momentum after      ' + num(pA1, 2) + '  +  ' + num(pB1, 2) + '  =  ' +
               num(pA1 + pB1, 2) + ' kg·m/s', W * 0.5, ly + 22,
            { color: K.GRN, size: 13.5, align: 'center' });

    out.innerHTML =
      'A ' + num(vAi, 2) + ' → <b class="b">' + (reveal ? num(S.vAf, 2) : '?') + '</b> m/s' +
      ' &nbsp;·&nbsp; B ' + num(vBi, 2) + ' → <b>' + (reveal ? num(S.vBf, 2) : '?') + '</b> m/s' +
      '<span class="hint">' +
      (reveal
        ? 'The total momentum is the same number before and after — that is the law, and it is one ' +
          'equation. It is not enough on its own: two unknowns need two equations, and the second ' +
          'is the coefficient of restitution.'
        : 'Momentum gives you one equation and there are two unknowns in it, so it cannot be ' +
          'solved yet. The second equation is the coefficient of restitution, on the next slide.') +
      '</span>';
  }

  var r = ctlRow(u.ctl);
  var pb = playBtn(r, '▶ Collide');
  pb.addEventListener('click', function () {
    playing = !playing;
    pb.textContent = playing ? '❚❚ Pause' : '▶ Collide';
    if (playing) { last = 0; raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf);
  });
  function loop(ts) {
    if (!last) last = ts;
    t += Math.min(0.05, (ts - last) / 1000); last = ts;
    if (t > TEND) t = 0;
    draw();
    if (playing) raf = requestAnimationFrame(loop);
  }
  if (d.locked !== '1') {
    u.ctl.classList.add('g2');
    slider(u.ctl, 'mass A', 0.5, 8, 0.5, mA, function (q) { return fmt(q, 1) + ' kg'; },
      function (q) { mA = q; recompute(); draw(); });
    slider(u.ctl, 'mass B', 0.5, 8, 0.5, mB, function (q) { return fmt(q, 1) + ' kg'; },
      function (q) { mB = q; recompute(); draw(); });
    slider(u.ctl, 'v<sub>Ai</sub>', -3, 3, 0.1, vAi, function (q) { return num(q, 1) + ' m/s'; },
      function (q) { vAi = q; recompute(); draw(); });
    slider(u.ctl, 'v<sub>Bi</sub>', -3, 3, 0.1, vBi, function (q) { return num(q, 1) + ' m/s'; },
      function (q) { vBi = q; recompute(); draw(); });
    slider(u.ctl, 'restitution', 0, 1, 0.05, e, function (q) { return fmt(q, 2); },
      function (q) { e = q; recompute(); draw(); });
  }
  node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Collide'; };
  node._draw = draw;
  recompute(); draw();
});


/* ============================================================
   THE STRIKE, AND THE TWO AXES IT CREATES
   The gif on his slide 30: two balls meet off centre, and at the instant
   they touch the only two directions that matter appear — the line joining
   their centres, and the line at right angles to it. Everything in a
   two-dimensional collision is decided on those two lines.
   ============================================================ */
D.register('strike2d', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 780, h: port ? 440 : 380,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var off = 0.62;                 /* how off-centre the strike is, 0..1 of 2R */
  var vA = 3.0, e = 1;
  var TCON = 1.5, TEND = 3.6;
  /* the still frame is the moment just after contact, so a printed handout
     shows the two axes and the two new directions rather than an empty field */
  var t = TCON + 0.55, playing = false, raf, last = 0;

  function geom() {
    /* A runs along the horizontal; B sits at rest, displaced upward by b.
       At contact their centres are 2R apart, so the line of centres makes
       an angle phi with A's line of travel. */
    var phi = Math.asin(Math.max(-0.999, Math.min(0.999, off)));
    var nx = Math.cos(phi), ny = -Math.sin(phi);       /* canvas y is down */
    var tx = -ny, ty = nx;
    /* A's velocity split on those axes (A travels +x) */
    var an = vA * nx, at = vA * tx;
    var anA = an * (1 - e) / 2, anB = an * (1 + e) / 2;
    return { phi: phi, nx: nx, ny: ny, tx: tx, ty: ty, an: an, at: at,
             aF: [nx * anA + tx * at, ny * anA + ty * at],
             bF: [nx * anB, ny * anB] };
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var g = geom();
    var R = port ? 26 : 32;
    var cx = W * 0.47, cy = H * 0.50;                 /* B's centre at contact */
    /* contact geometry: A's centre is 2R away along −n from B's centre */
    var axC = cx - 2 * R * g.nx, ayC = cy - 2 * R * g.ny;
    var PX = Math.min(120, (axC - R - 30) / (vA * TCON));

    var xA, yA, xB, yB;
    if (t <= TCON) {
      xA = axC - (TCON - t) * vA * PX; yA = ayC;
      xB = cx; yB = cy;
    } else {
      var dt = t - TCON;
      xA = axC + g.aF[0] * dt * PX; yA = ayC + g.aF[1] * dt * PX;
      xB = cx + g.bF[0] * dt * PX;  yB = cy + g.bF[1] * dt * PX;
    }

    /* the two axes, drawn from the contact point once the balls are close */
    var near = Math.max(0, Math.min(1, (t - TCON * 0.72) / (TCON * 0.28)));
    if (near > 0) {
      var px = (axC + cx) / 2, py = (ayC + cy) / 2;
      c.save(); c.globalAlpha = near;
      function ray(dx, dy, col, txt, side) {
        var L = 168;
        c.save(); c.strokeStyle = col; c.lineWidth = 1.6; c.setLineDash([7, 5]);
        c.beginPath(); c.moveTo(px - dx * L, py - dy * L); c.lineTo(px + dx * L, py + dy * L);
        c.stroke(); c.restore();
        /* the label goes on the end the balls are not leaving along, or it
           ends up printed across one of them */
        label(c, txt, px + side * dx * (L - 20), py + side * dy * (L - 20),
              { color: col, size: 13, align: 'center', plate: true });
      }
      ray(g.nx, g.ny, K.ACC, 'normal', -1);
      ray(g.tx, g.ty, K.GRN, 'tangent', 1);
      c.fillStyle = K.INK; c.globalAlpha = near * 0.8;
      c.beginPath(); c.arc(px, py, 3.5, 0, 7); c.fill();
      c.restore();
    }

    ball(c, xA, yA, R, K.BLUE, 'A');
    ball(c, xB, yB, R, K.ORG, 'B');

    var VS = 30;
    if (t <= TCON) {
      arrow(c, xA + R, yA, xA + R + vA * VS, yA, { color: K.BLUE, width: 3.4 });
      label(c, fmt(vA, 1) + ' m/s', xA + R + vA * VS / 2, yA - 16,
            { color: K.BLUE, size: 13, align: 'center', plate: true });
    } else {
      /* arrows leave each ball at its rim, so the ball label stays readable */
      function out2(x, y, vx, vy, col, txt) {
        var L = Math.hypot(vx, vy); if (L < 1e-6) return;
        var ux = vx / L, uy = vy / L;
        arrow(c, x + ux * R, y + uy * R, x + ux * R + vx * VS, y + uy * R + vy * VS,
              { color: col, width: 3.4 });
        label(c, fmt(L, 2) + ' m/s', x + ux * (R + L * VS + 22), y + uy * (R + L * VS + 22),
              { color: col, size: 12.5, align: 'center', plate: true });
      }
      out2(xA, yA, g.aF[0], g.aF[1], K.BLUE);
      out2(xB, yB, g.bF[0], g.bF[1], K.ORG);
    }

    label(c, t <= TCON ? 'B is at rest; A is about to strike it off centre'
                       : 'each ball leaves along its own new line', 24, 22,
          { color: K.MUT, size: 13 });

    out.innerHTML =
      'strike offset <b>' + fmt(off, 2) + '</b> of a diameter &nbsp;·&nbsp; ' +
      'line of centres at <b class="r">' + fmt(g.phi * 180 / Math.PI, 0) + '°</b> to A’s path' +
      '<span class="hint">Two smooth balls can only push each other one way: along the line ' +
      'joining their centres. That line is the <b class="r">normal</b>, and the line at right ' +
      'angles to it, along the surfaces where they touch, is the <b class="g">tangent</b>. A ' +
      'head-on strike puts the normal along the direction of travel and the problem is ' +
      'one-dimensional again; slide the offset and watch how far off that line the collision ' +
      'throws them.</span>';
  }

  var r = ctlRow(u.ctl);
  var pb = playBtn(r, '▶ Strike');
  pb.addEventListener('click', function () {
    playing = !playing;
    pb.textContent = playing ? '❚❚ Pause' : '▶ Strike';
    if (playing) { last = 0; raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf);
  });
  function loop(ts) {
    if (!last) last = ts;
    t += Math.min(0.05, (ts - last) / 1000); last = ts;
    if (t > TEND) t = 0;
    draw();
    if (playing) raf = requestAnimationFrame(loop);
  }
  u.ctl.classList.add('g2');
  slider(u.ctl, 'how off centre', 0, 0.92, 0.02, off,
    function (q) { return fmt(q, 2); }, function (q) { off = q; draw(); });
  slider(u.ctl, 'A’s speed', 1, 5, 0.1, vA, function (q) { return fmt(q, 1) + ' m/s'; },
    function (q) { vA = q; draw(); });
  node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Strike'; };
  node._draw = draw;
  draw();
});


/* ============================================================
   ROTATING THE FRAME OF REFERENCE
   Slides 35–39 of the original. Two balls meet off centre, so neither x nor
   y is a useful axis. Turn the whole frame — grid, axes, velocities and all
   — until the line joining the centres is horizontal, and the collision
   falls apart into two independent one-dimensional statements: along the
   tangent nothing happens at all, and along the normal it is the ordinary
   momentum-and-restitution problem.

   The rotation is of the *frame*, not of the physics. Nothing about the
   collision changes while the slider moves; only the axes you are choosing
   to describe it in.
   ============================================================ */
D.register('rotframe', function (node, d) {
  var u = build(node);
  var wrap = u.cv.parentNode.parentNode;
  wrap.classList.add('isplit');
  var side = el('div', 'icalc');
  wrap.insertBefore(side, u.ctl);

  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 720, h: port ? 500 : 345,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);

  var phi = -32;                 /* line of centres, degrees from the x axis  */
  var vA = 3.2, aA = -12;        /* A: speed and heading, degrees            */
  var vB = 2.4, aB = 196;        /* B: coming the other way                  */
  var e = 1, mA = 1, mB = 1;
  var rot = d.rot == null ? 0 : parseFloat(d.rot);   /* 0 = x/y, 1 = n/t */
  var after = d.after === '1';
  var playing = false, raf, last = 0;

  function S() {
    var p = phi * Math.PI / 180;
    var nx = Math.cos(p), ny = Math.sin(p);         /* maths coords, y up */
    var tx = -ny, ty = nx;
    var a = aA * Math.PI / 180, b = aB * Math.PI / 180;
    var A = [vA * Math.cos(a), vA * Math.sin(a)];
    var B = [vB * Math.cos(b), vB * Math.sin(b)];
    var An = A[0] * nx + A[1] * ny, At = A[0] * tx + A[1] * ty;
    var Bn = B[0] * nx + B[1] * ny, Bt = B[0] * tx + B[1] * ty;
    var q = solve(mA, mB, An, Bn, e);               /* the 1-D problem, on n */
    return { p: p, n: [nx, ny], t: [tx, ty], A: A, B: B,
             An: An, At: At, Bn: Bn, Bt: Bt, AnF: q.vAf, BnF: q.vBf,
             AF: [nx * q.vAf + tx * At, ny * q.vAf + ty * At],
             BF: [nx * q.vBf + tx * Bt, ny * q.vBf + ty * Bt] };
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var s = S();
    var th = -s.p * rot;                 /* the frame turn, in maths coords  */
    var ct = Math.cos(th), st = Math.sin(th);
    var cx = W * (port ? 0.50 : 0.33), cy = H * (port ? 0.30 : 0.50);
    var SC = port ? 40 : 41, R = port ? 24 : 25;

    /* world (metres, y up, origin at the contact point) → screen */
    function P(x, y) {
      var X = x * ct - y * st, Y = x * st + y * ct;
      return { x: cx + X * SC, y: cy - Y * SC };
    }
    function dir(x, y) {                 /* a direction, same rotation, no origin */
      return { x: (x * ct - y * st), y: -(x * st + y * ct) };
    }

    /* ---- the graph paper, turning with the frame ---- */
    c.save();
    c.strokeStyle = K.GRID; c.lineWidth = 1; c.globalAlpha = 0.75;
    for (var g = -4; g <= 4; g++) {
      var p1 = P(g, -4), p2 = P(g, 4), p3 = P(-4, g), p4 = P(4, g);
      c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke();
      c.beginPath(); c.moveTo(p3.x, p3.y); c.lineTo(p4.x, p4.y); c.stroke();
    }
    c.restore();

    /* ---- the x and y axes: they belong to the frame, so they turn too ---- */
    function axis(vx, vy, col, txt) {
      var o = P(0, 0), dd = dir(vx, vy), L = 3.05 * SC;
      var m = Math.hypot(dd.x, dd.y);
      arrow(c, o.x - dd.x / m * L * 0.28, o.y - dd.y / m * L * 0.28,
            o.x + dd.x / m * L, o.y + dd.y / m * L, { color: col, width: 2.4 });
      label(c, txt, o.x + dd.x / m * (L + 14), o.y + dd.y / m * (L + 14),
            { color: col, size: 14, align: 'center', plate: true });
    }
    axis(1, 0, K.BLUE, 'x');
    axis(0, 1, K.BLUE, 'y');

    /* ---- the normal and the tangent: fixed to the collision, so once the
            frame has turned they come out horizontal and vertical ---- */
    function nt(v, col, txt) {
      var o = P(0, 0), dd = dir(v[0], v[1]), L = 3.4 * SC;
      var m = Math.hypot(dd.x, dd.y);
      c.save(); c.strokeStyle = col; c.lineWidth = 1.6; c.setLineDash([7, 5]);
      c.beginPath();
      c.moveTo(o.x - dd.x / m * L, o.y - dd.y / m * L);
      c.lineTo(o.x + dd.x / m * L, o.y + dd.y / m * L);
      c.stroke(); c.restore();
      /* nudged off the line so it does not print on top of its own arrow */
      var ox = -dd.y / m * 13, oy = dd.x / m * 13;
      label(c, txt, o.x + dd.x / m * (L - 20) + ox, o.y + dd.y / m * (L - 20) + oy,
            { color: col, size: 13, align: 'center', plate: true });
    }
    nt(s.n, K.ACC, 'normal');
    nt(s.t, K.GRN, 'tangent');

    /* ---- the two balls, touching on the line of centres ---- */
    var rw = R / SC;
    var pA = P(-s.n[0] * rw, -s.n[1] * rw), pB = P(s.n[0] * rw, s.n[1] * rw);
    ball(c, pA.x, pA.y, R, K.BLUE, 'A');
    ball(c, pB.x, pB.y, R, K.ORG, 'B');

    /* ---- velocities, and their components on whichever axes are in use ---- */
    var VS = 30;
    function vshow(p, v, col) {
      var m = Math.hypot(v[0], v[1]); if (m < 1e-6) return;
      var dd = dir(v[0], v[1]);
      var ux = dd.x / m, uy = dd.y / m;           /* unit, in screen space */
      arrow(c, p.x + ux * R, p.y + uy * R, p.x + ux * R + dd.x * VS, p.y + uy * R + dd.y * VS,
            { color: col, width: 3.4 });
      label(c, fmt(m, 2), p.x + ux * (R + m * VS + 20), p.y + uy * (R + m * VS + 20),
            { color: col, size: 12.5, align: 'center', plate: true });
    }
    function comps(p, vn, vt) {
      var dn = dir(s.n[0] * vn, s.n[1] * vn), dt = dir(s.t[0] * vt, s.t[1] * vt);
      arrow(c, p.x, p.y, p.x + dn.x * VS, p.y + dn.y * VS,
            { color: K.ACC, width: 2.2, dash: [4, 3] });
      arrow(c, p.x, p.y, p.x + dt.x * VS, p.y + dt.y * VS,
            { color: K.GRN, width: 2.2, dash: [4, 3] });
    }
    if (!after) {
      comps(pA, s.An, s.At); comps(pB, s.Bn, s.Bt);
      vshow(pA, s.A, K.BLUE); vshow(pB, s.B, K.ORG);
    } else {
      comps(pA, s.AnF, s.At); comps(pB, s.BnF, s.Bt);
      vshow(pA, s.AF, K.BLUE); vshow(pB, s.BF, K.ORG);
    }

    /* ---- the two component panels from his slide, before over after ---- */
    var px = W * (port ? 0.50 : 0.80), py0 = H * (port ? 0.76 : 0.24),
        py1 = H * (port ? 0.91 : 0.68), rr = port ? 15 : 20, cs = 24;
    function panel(y, ttl, an, at2, bn, bt, live) {
      label(c, ttl, px, y - rr - 22, { color: live ? K.INK : K.MUT, size: 13,
            align: 'center', weight: '700' });
      [[px - rr * 2.0, K.BLUE, an, at2], [px + rr * 2.0, K.ORG, bn, bt]]
        .forEach(function (q) {
          c.save(); c.globalAlpha = live ? 1 : 0.42;
          c.strokeStyle = q[1]; c.lineWidth = 2;
          c.beginPath(); c.arc(q[0], y, rr, 0, 7); c.stroke(); c.restore();
          c.save(); c.globalAlpha = live ? 1 : 0.42;
          arrow(c, q[0], y, q[0] + q[2] * cs, y, { color: K.ACC, width: 2.6 });
          arrow(c, q[0], y, q[0], y - q[3] * cs, { color: K.GRN, width: 2.6 });
          c.restore();
        });
    }
    panel(py0, 'before', s.An, s.At, s.Bn, s.Bt, !after);
    panel(py1, 'after', s.AnF, s.At, s.BnF, s.Bt, after);
    label(c, '\u2192 normal', px - rr * 2.6, py1 + rr + 26,
          { color: K.ACC, size: 11.5 });
    label(c, '\u2191 tangent', px + rr * 0.5, py1 + rr + 26,
          { color: K.GRN, size: 11.5 });
    label(c, 'the tangent arrows are the same in both panels', px, py1 + rr + 48,
          { color: K.MUT, size: 11, align: 'center' });

    /* ---- the working: the two component pairs, before and after ---- */
    function row(lab, x, y, col) {
      return '<div class="icalc-eq"><span style="color:' + col + '">' + lab +
             '</span> &nbsp; A ' + num(x, 2) + ' &nbsp; B ' + num(y, 2) + '</div>';
    }
    side.innerHTML =
      '<div class="icalc-h">frame turned <span class="v">' +
        fmt(rot * Math.abs(phi), 0) + '\u00b0</span> of ' + fmt(Math.abs(phi), 0) + '\u00b0</div>' +
      '<div class="icalc-work">' +
      '<div class="icalc-t">components before</div>' +
      row('normal', s.An, s.Bn, C().ACC) +
      row('tangent', s.At, s.Bt, C().GRN) +
      '<div class="icalc-t" style="margin-top:.45em">components after</div>' +
      row('normal', s.AnF, s.BnF, C().ACC) +
      row('tangent', s.At, s.Bt, C().GRN) +
      '</div>' +
      '<div class="icalc-vals" style="grid-template-columns:repeat(2,1fr)">' +
      '<div><span>A after</span><b>' + fmt(Math.hypot(s.AF[0], s.AF[1]), 2) + '</b></div>' +
      '<div><span>B after</span><b>' + fmt(Math.hypot(s.BF[0], s.BF[1]), 2) + '</b></div>' +
      '</div>';

    out.innerHTML =
      (rot < 0.02 ? 'the original <b class="b">x, y</b> frame'
                  : (rot > 0.98 ? 'the <b class="r">normal</b>–<b class="g">tangent</b> frame'
                                : 'turning the frame…')) +
      ' &nbsp;·&nbsp; ' + (after ? 'after the collision' : 'before the collision') +
      '<span class="hint">Nothing about the collision changes while that slider moves — the balls ' +
      'and their velocities are doing exactly what they were doing. What changes is the pair of ' +
      'axes you describe them with. Choose x and y and both balls have two components that both ' +
      'change, and you are stuck. Choose the <b class="r">normal</b> and the <b class="g">tangent' +
      '</b> and the problem separates: the tangential components come through the collision ' +
      '<b>untouched</b> — first law, one component at a time — and everything that happens ' +
      'happens on the normal, where it is the same one-dimensional problem as the start of the ' +
      'lecture.</span>';
  }

  var r = ctlRow(u.ctl);
  var pb = playBtn(r, '▶ Turn the frame');
  seg(r, [['b', 'before'], ['a', 'after']], after ? 'a' : 'b',
      function (v) { after = v === 'a'; draw(); }).setAttribute('data-unsafe', '1');
  pb.addEventListener('click', function () {
    playing = !playing;
    pb.textContent = playing ? '❚❚ Pause' : '▶ Turn the frame';
    if (playing) { last = 0; raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf);
  });
  function loop(ts) {
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    rot += dt * 0.42;
    if (rot > 1.45) rot = 0;
    sRot.quiet(Math.min(1, rot));
    draw();
    if (playing) raf = requestAnimationFrame(loop);
  }
  u.ctl.classList.add('g2');
  var sRot = slider(u.ctl, 'turn the frame', 0, 1, 0.02, rot,
    function (q) { return fmt(q * 100, 0) + ' %'; },
    function (q) { rot = q; draw(); });
  slider(u.ctl, 'line of centres', -70, 70, 1, phi, function (q) { return fmt(q, 0) + '°'; },
    function (q) { phi = q; draw(); });
  slider(u.ctl, 'A heading', -60, 60, 1, aA, function (q) { return fmt(q, 0) + '°'; },
    function (q) { aA = q; draw(); });
  slider(u.ctl, 'restitution', 0, 1, 0.05, e, function (q) { return fmt(q, 2); },
    function (q) { e = q; draw(); });
  node._stop = function () {
    playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Turn the frame';
  };
  node._draw = draw;
  draw();
});


D.boot();

})();
