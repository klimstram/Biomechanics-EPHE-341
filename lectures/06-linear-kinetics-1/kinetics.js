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
  var ax = new Axes(u.cv, { w: port ? 460 : 720, h: port ? 380 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var m = 70, push = 0, v0 = parseFloat(d.v || 0);
  var playing = false, raf, last = 0, xpos = 0;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var Wt = m * G;
    var net = push;                       /* the horizontal net force */
    var a = net / m;

    /* the ground */
    var gy = H * 0.74;
    c.save(); c.strokeStyle = K.SOFT; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(30, gy); c.lineTo(W - 30, gy); c.stroke(); c.restore();

    /* the body, drifting if it has any velocity */
    var bx = W * 0.30 + xpos, bw = 52, bh = 108;
    bx = Math.max(90, Math.min(W - 120, bx));
    c.save();
    c.fillStyle = K.FILL; c.strokeStyle = K.BLUE; c.lineWidth = 2;
    c.fillRect(bx - bw / 2, gy - bh, bw, bh);
    c.strokeRect(bx - bw / 2, gy - bh, bw, bh);
    c.restore();
    label(c, fmt(m, 0) + ' kg', bx, gy - bh / 2, { color: K.BLUE, size: 14, align: 'center' });

    var S = 120 / Math.max(200, Wt);
    /* weight down, ground reaction up — always equal on flat ground */
    arrow(c, bx, gy - bh / 2, bx, gy - bh / 2 + Wt * S, { color: K.INK, width: 3.4 });
    label(c, 'W = ' + fmt(Wt, 0) + ' N', bx + 10, gy - bh / 2 + Wt * S + 12,
          { color: K.INK, size: 13, plate: true });
    arrow(c, bx, gy - bh / 2, bx, gy - bh / 2 - Wt * S, { color: K.GRN, width: 3.4 });
    label(c, 'N = ' + fmt(Wt, 0) + ' N', bx + 10, gy - bh / 2 - Wt * S - 12,
          { color: K.GRN, size: 13, plate: true });

    /* whatever horizontal push has been added */
    if (Math.abs(push) > 0.5) {
      var L = push * S * 2.2;
      arrow(c, bx, gy - bh - 22, bx + L, gy - bh - 22, { color: K.ACC, width: 4 });
      label(c, minus(fmt(push, 0)) + ' N', bx + L / 2, gy - bh - 40,
            { color: K.ACC, size: 14, align: 'center', plate: true });
    }

    /* the sums, written out */
    var sx = W * 0.72, sy = H * 0.22;
    label(c, 'ΣFᵧ = N − W = 0', sx, sy, { color: K.GRN, size: 17 });
    label(c, 'ΣFₓ = ' + minus(fmt(net, 0)) + ' N', sx, sy + 34,
          { color: Math.abs(net) < 0.5 ? K.GRN : K.ACC, size: 17 });
    label(c, 'a = ΣF / m = ' + num(a, 2) + ' m/s²', sx, sy + 68,
          { color: Math.abs(a) < 0.005 ? K.GRN : K.ACC, size: 17 });

    var state = Math.abs(net) > 0.5
      ? '<b class="r">accelerating</b> — not in equilibrium'
      : (Math.abs(v0) > 0.01 ? '<b class="g">dynamic equilibrium</b> — moving, and staying that way'
                             : '<b class="g">static equilibrium</b> — at rest, and staying that way');
    out.innerHTML =
      state +
      '<span class="hint">' +
      (Math.abs(net) > 0.5
        ? 'A net force is the only thing that changes a state of motion. Take it away and whatever ' +
          'the object was doing, it carries on doing.'
        : 'The force diagram for a body standing still and a body gliding at constant velocity is ' +
          'the <b>same diagram</b>. Nothing in the forces distinguishes them, which is exactly what ' +
          'the first law says.') +
      '</span>';
  }

  slider(u.ctl, 'Body mass', 20, 140, 1, m, function (v) { return fmt(v, 0) + ' kg'; },
    function (v) { m = v; draw(); }, { scale: 4, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'Net horizontal force', -200, 200, 5, push,
    function (v) { return minus(fmt(v, 0)) + ' N'; }, function (v) { push = v; draw(); },
    { scale: 5, tick: function (v) { return minus(fmt(v, 0)); } });
  if (d.drift === '1') {
    var r = ctlRow(u.ctl);
    var pb = playBtn(r, '▶ Let it go');
    pb.addEventListener('click', function () {
      playing = !playing;
      pb.textContent = playing ? '❚❚ Pause' : '▶ Let it go';
      if (playing) { last = 0; raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf);
    });
    function loop(ts) {
      if (!last) last = ts;
      var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
      xpos += (v0 + push / m) * dt * 40;
      if (xpos > 260) xpos = -60;
      draw();
      raf = requestAnimationFrame(loop);
    }
    node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Let it go'; };
  }
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
    c.save();
    c.fillStyle = K.ACC; c.globalAlpha = 0.35;
    c.beginPath(); c.arc(bx, by - r, r, 0, 7); c.fill();
    c.globalAlpha = 1; c.strokeStyle = K.ACC; c.lineWidth = 2.4;
    c.beginPath(); c.arc(bx, by - r, r, 0, 7); c.stroke();
    c.restore();

    label(c, 'e = √( bounce / drop )', W * 0.5, H * 0.045,
          { color: K.MUT, size: 15, align: 'center' });

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
  var wrap = u.cv.parentNode.parentNode;
  wrap.classList.add('isplit');
  var side = el('div', 'icalc');
  wrap.insertBefore(side, u.ctl);

  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 620, h: port ? 360 : 350,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var m = 0.1, vAi = 5, vAf = 2, ang = 30;
  var step = parseInt(d.step || 3, 10);

  function state() {
    var th = ang * Math.PI / 180;
    var afx = vAf * Math.cos(th), afy = vAf * Math.sin(th);
    var bfx = (m * vAi - m * afx) / m, bfy = (0 - m * afy) / m;
    return { afx: afx, afy: afy, bfx: bfx, bfy: bfy,
             vBf: Math.hypot(bfx, bfy),
             thB: Math.atan2(bfy, bfx) * 180 / Math.PI };
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var S = state();
    var ox = W * 0.36, oy = H * 0.52, SC = 34;

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

    var html = '<div class="icalc-h">' +
      ['the set-up', 'A leaves at ' + fmt(ang, 0) + '°', 'momentum in x and y',
       'magnitude and direction'][step - 1] + '</div>';
    if (step === 1) {
      html += '<div class="icalc-t">Each ball has a mass of ' + fmt(m, 1) + ' kg and ball B was ' +
        'at rest. What is the speed and direction of ball B after the collision?</div>' +
        '<div class="icalc-work"><div class="icalc-eq">Pₒ = Pᶠ</div>' +
        '<div class="icalc-eq">Pₒₓ = Pᶠₓ , Pₒᵧ = Pᶠᵧ</div></div>';
    } else if (step === 2) {
      html += '<div class="icalc-t">Break the momentum into components. Nothing is conserved ' +
        '“diagonally” — x is conserved, and y is conserved, separately.</div>';
    } else if (step === 3) {
      html += '<div class="icalc-work">' +
        '<div class="icalc-t">Pₒₓ = Pᶠₓ</div>' +
        '<div class="icalc-eq">(' + fmt(m, 1) + ')(' + fmt(vAi, 0) + ') + 0 = (' + fmt(m, 1) +
          ')(' + fmt(vAf, 0) + '·cos' + fmt(ang, 0) + ') + (' + fmt(m, 1) + ')Vʙᶠₓ</div>' +
        '<div class="icalc-eq">Vʙᶠₓ = <b>' + num(S.bfx, 2) + '</b> m/s</div>' +
        '<div class="icalc-t" style="margin-top:.5em">Pₒᵧ = Pᶠᵧ</div>' +
        '<div class="icalc-eq">0 = (' + fmt(m, 1) + ')(' + fmt(vAf, 0) + '·sin' + fmt(ang, 0) +
          ') + (' + fmt(m, 1) + ')Vʙᶠᵧ</div>' +
        '<div class="icalc-eq">Vʙᶠᵧ = <b>' + num(S.bfy, 2) + '</b> m/s</div></div>';
    } else {
      html += '<div class="icalc-work">' +
        '<div class="icalc-eq">Vʙᶠ² = Vₓ² + Vᵧ²</div>' +
        '<div class="icalc-eq">Vʙᶠ = <b class="r">' + fmt(S.vBf, 2) + '</b> m/s</div>' +
        '<div class="icalc-t" style="margin-top:.5em">tanθ = Vᵧ / Vₓ</div>' +
        '<div class="icalc-eq">θ = <b class="r">' + fmt(Math.abs(S.thB), 2) +
          '°</b> below the x axis</div></div>';
    }
    side.innerHTML = html;

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
   6. NORMAL AND TANGENT
   When the two balls do not meet head on, the useful axes are not x and y
   but the line joining their centres and the line at right angles to it.
   Along the tangent nothing happens at all; along the normal it is the
   one-dimensional problem again.
   ============================================================ */
D.register('normtan', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 760, h: port ? 400 : 420,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var contact = 30;          /* angle of the line of centres, degrees */
  var vA = 4, angA = 10, e = 1, after = false;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var n = contact * Math.PI / 180;                 /* normal direction */
    var nx = Math.cos(n), ny = -Math.sin(n);
    var tx = -ny, ty = nx;                           /* tangent, at right angles */
    var a = angA * Math.PI / 180;
    var ax0 = vA * Math.cos(a), ay0 = vA * Math.sin(a);

    /* A's velocity split along the two axes */
    var an = ax0 * nx + ay0 * (-ny), at = ax0 * tx + ay0 * (-ty);
    /* B starts at rest. Along the normal it is a one-dimensional collision of
       equal masses; along the tangent neither ball changes at all. */
    var anF = after ? (an * (1 - e) / 2) : an;
    var bnF = after ? (an * (1 + e) / 2) : 0;

    var ox = W * 0.44, oy = H * 0.52, SC = 30, R = 34;
    var cxB = ox + nx * R * 2, cyB = oy + ny * R * 2;

    /* the two axes through the contact point */
    var cpx = (ox + cxB) / 2, cpy = (oy + cyB) / 2;
    function ray(dx, dy, col, txt) {
      c.save(); c.strokeStyle = col; c.lineWidth = 1.4; c.setLineDash([6, 5]);
      c.beginPath();
      c.moveTo(cpx - dx * 200, cpy - dy * 200); c.lineTo(cpx + dx * 200, cpy + dy * 200);
      c.stroke(); c.restore();
      label(c, txt, cpx + dx * 150, cpy + dy * 150 - 12,
            { color: col, size: 12, weight: '700', align: 'center', plate: true });
    }
    ray(nx, ny, K.ACC, 'normal');
    ray(tx, ty, K.GRN, 'tangent');

    ball(c, ox, oy, R, K.BLUE, 'A');
    ball(c, cxB, cyB, R, K.ORG, 'B');

    if (!after) {
      arrow(c, ox - ax0 * SC, oy + ay0 * SC, ox, oy, { color: K.BLUE, width: 3.4 });
      label(c, fmt(vA, 1) + ' m/s', ox - ax0 * SC - 6, oy + ay0 * SC - 14,
            { color: K.BLUE, size: 13, align: 'right', plate: true });
      /* the split */
      arrow(c, ox, oy, ox + nx * an * SC, oy + ny * an * SC, { color: K.ACC, width: 2.6 });
      arrow(c, ox, oy, ox + tx * at * SC, oy + ty * at * SC, { color: K.GRN, width: 2.6 });
      label(c, 'normal ' + fmt(an, 2), ox + nx * an * SC + 8, oy + ny * an * SC,
            { color: K.ACC, size: 12, plate: true });
      label(c, 'tangent ' + fmt(at, 2), ox + tx * at * SC + 8, oy + ty * at * SC,
            { color: K.GRN, size: 12, plate: true });
    } else {
      /* A keeps its tangential part and whatever the normal collision left it */
      var afx = nx * anF + tx * at, afy = ny * anF + ty * at;
      arrow(c, ox, oy, ox + afx * SC, oy + afy * SC, { color: K.BLUE, width: 3.4 });
      label(c, 'A ' + fmt(Math.hypot(anF, at), 2) + ' m/s', ox + afx * SC + 8, oy + afy * SC,
            { color: K.BLUE, size: 13, plate: true });
      var bfx = nx * bnF, bfy = ny * bnF;
      arrow(c, cxB, cyB, cxB + bfx * SC, cyB + bfy * SC, { color: K.ORG, width: 3.4 });
      label(c, 'B ' + fmt(Math.abs(bnF), 2) + ' m/s', cxB + bfx * SC + 8, cyB + bfy * SC,
            { color: K.ORG, size: 13, plate: true });
    }

    out.innerHTML =
      (after ? 'after the collision' : 'before the collision') +
      ' &nbsp;·&nbsp; normal <b class="r">' + fmt(an, 2) +
      '</b> m/s &nbsp;·&nbsp; tangent <b class="g">' + fmt(at, 2) + '</b> m/s' +
      '<span class="hint">The balls can only push each other along the line joining their centres, ' +
      'so the <b class="g">tangential</b> component of each ball is untouched by the collision — ' +
      'Newton’s first law, one component at a time. Everything that happens, happens along the ' +
      '<b class="r">normal</b>, and along that one line it is the same one-dimensional problem as ' +
      'before. Swing the contact angle and watch how much of the approach actually collides.</span>';
  }

  var r = ctlRow(u.ctl);
  seg(r, [['b', 'before'], ['a', 'after']], 'b', function (v) { after = v === 'a'; draw(); });
  u.ctl.classList.add('g2');
  slider(u.ctl, 'Line of centres', -60, 60, 1, contact, function (v) { return fmt(v, 0) + '°'; },
    function (v) { contact = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'A approaches at', -40, 40, 1, angA, function (v) { return fmt(v, 0) + '°'; },
    function (v) { angA = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
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

D.boot();

})();
