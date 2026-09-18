/* ============================================================
   EPHE 341 — Linear Kinetics II: impulse and friction
   Interactive figures. Needs deck-core.js. No other dependencies.

   The jump figure is built to reproduce the lecture's own impulse numbers
   (−86.6, +204.1, −15.0 N·s) exactly: each phase of the trace is a shape
   whose integral is known in closed form, so the amplitude that carries the
   published area is solved for rather than fitted. Every number the slide
   quotes therefore comes out of the figure rather than being written on it.
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


/* ============================================================
   1. IMPULSE = FORCE × TIME
   The same change in momentum can be had from a big force briefly or a
   small force for a long time, and the figure is that sentence with an area
   attached to it. The bobsled problem from the slide is a chip.
   ============================================================ */
D.register('impulse', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 880, h: port ? 380 : 380,
                            padl: 66, padr: 22, padt: 24, padb: 50 });
  var out = readout(u.ctl);
  var F = 100, T = 7, m = 90;

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    var J = F * T, dv = J / m;
    /* the axes follow the pulse, so a 100 N push and a 700 N one both fill
       the figure and the AREA is what the eye compares */
    var TMAX = Math.max(T * 1.45, 2), FMAX = Math.max(F * 1.35, 20);
    ax.setRange(0, TMAX, 0, FMAX);
    ax.frame({ grid: true, xticks: axisTicks(0, TMAX, 5), yticks: axisTicks(0, FMAX, 4),
               xlabel: 'Time (s)', ylabel: 'Force (N)', ylabelx: 16,
               xfmt: function (v) { return v.toFixed(v < 10 ? 1 : 0); },
               yfmt: function (v) { return v.toFixed(0); } });
    /* the pulse, and the area that is the impulse */
    ax.rect(0, 0, T, F, { fill: K.ACCFILL, stroke: K.ACC, width: 2.4 });
    var pts = [[0, 0], [0, F], [T, F], [T, 0]];
    ax.poly(pts, { color: K.ACC, width: 2.6 });
    label(c, 'impulse = F × t = ' + fmt(J, 0) + ' N·s',
          ax.X(T / 2), ax.Y(F / 2), { color: K.ACC, size: 16, align: 'center', plate: true });
    /* the two dimensions of that area, named — both inside the frame, so
       nothing is clipped whatever the range */
    arrow(c, ax.X(T) + 26, ax.Y(0), ax.X(T) + 26, ax.Y(F), { color: K.BLUE, width: 2 });
    label(c, fmt(F, 0) + ' N', ax.X(T) + 34, ax.Y(F / 2),
          { color: K.BLUE, size: 13, plate: true });
    arrow(c, ax.X(0), ax.Y(F) - 26, ax.X(T), ax.Y(F) - 26, { color: K.BLUE, width: 2 });
    label(c, fmt(T, 1) + ' s', ax.X(T / 2), ax.Y(F) - 40,
          { color: K.BLUE, size: 13, align: 'center', plate: true });

    out.innerHTML =
      'F·t = <b class="r">' + fmt(J, 0) + ' N·s</b>' +
      ' &nbsp;·&nbsp; Δv = J / m = ' + fmt(J, 0) + ' / ' + fmt(m, 0) +
      ' = <b>' + fmt(dv, 2) + ' m/s</b>' +
      '<span class="hint">Impulse is the <b>area under a force–time graph</b>, and it is equal ' +
      'to the change in momentum. Halve the force and double the time and the area — and the ' +
      'change in velocity — is exactly the same. That is why a long push and a hard shove can ' +
      'do the same job, and why landing softly hurts less than landing stiffly.</span>';
  }

  chips(u.ctl, [['bob', 'bobsled: 100 N for 7 s'], ['half', '50 N for 14 s'],
                ['hard', '700 N for 1 s']], 'bob', function (k) {
    if (k === 'bob') { F = 100; T = 7; }
    else if (k === 'half') { F = 50; T = 14; }
    else { F = 700; T = 1; }
    sF.quiet(F); sT.quiet(T); draw();
  });
  u.ctl.classList.add('g2');
  var sF = slider(u.ctl, 'Force', 10, 800, 10, F, function (v) { return fmt(v, 0) + ' N'; },
    function (v) { F = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  var sT = slider(u.ctl, 'Time', 0.5, 12, 0.5, T, function (v) { return fmt(v, 1) + ' s'; },
    function (v) { T = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  var sM = slider(u.ctl, 'Mass', 10, 200, 1, m, function (v) { return fmt(v, 0) + ' kg'; },
    function (v) { m = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  node._draw = draw;
  draw();
});


/* ============================================================
   2. THE VERTICAL JUMP
   The lecture works a real force trace by hand: subtract body weight, take
   the area of each of the three phases, add them up, and the net impulse
   gives the take-off velocity and the height.

   The trace here is SYNTHESISED to those published areas. Each of the three
   phases is a shape with a closed-form integral, so the amplitude that
   carries −86.6, +204.1 and −15.0 N·s is solved for exactly, and the
   arithmetic on screen is the arithmetic on the slide.
   ============================================================ */
var JUMP = (function () {
  var M0 = 66.6, BW0 = M0 * G;
  var TARGET = [-86.6, 204.1, -15.0];

  /* Each phase is a fixed window, so the three areas are exact rather than
     fitted.  Phases 1 and 2 are half-sine-squared bumps that leave and
     return to body weight; the integral of sin²(pi u) over one window is
     half its width, so the amplitude that carries a given area is
     2 * area / width.  Phase 3 is the final drop to take-off: the force
     falls all the way to zero, and a quadratic fall of height BW over a
     window of width d carries the area BW * d / 3, which fixes d.        */
  var Q  = 0.15;                                /* quiet standing first   */
  var P1 = [Q, 0.60];
  var P2 = [0.60, 1.00];
  var D3 = 3 * Math.abs(TARGET[2]) / BW0;
  var P3 = [P2[1], P2[1] + D3];
  var T0 = 0, T1 = P3[1], N = 1200, dt = (T1 - T0) / N;

  var A1 = 2 * TARGET[0] / (P1[1] - P1[0]);
  var A2 = 2 * TARGET[1] / (P2[1] - P2[0]);

  function excess(t) {                          /* F − body weight        */
    var u;
    if (t >= P1[0] && t < P1[1]) {
      u = (t - P1[0]) / (P1[1] - P1[0]);
      return A1 * Math.pow(Math.sin(Math.PI * u), 2);
    }
    if (t >= P2[0] && t < P2[1]) {
      u = (t - P2[0]) / (P2[1] - P2[0]);
      return A2 * Math.pow(Math.sin(Math.PI * u), 2);
    }
    if (t >= P3[0] && t <= P3[1]) {
      u = (t - P3[0]) / D3;
      return -BW0 * u * u;
    }
    return 0;
  }
  var ps = [{ a: P1[0], b: P1[1], sign: -1 },
            { a: P2[0], b: P2[1], sign:  1 },
            { a: P3[0], b: P3[1], sign: -1 }];
  function areaOf(p) {
    var s = 0, n = 400, h = (p.b - p.a) / n, i;
    for (i = 0; i < n; i++) s += excess(p.a + (i + 0.5) * h) * h;
    return s;
  }
  return {
    m0: M0, bw0: BW0, t0: T0, t1: T1, dt: dt,
    excess: excess,
    force: function (t, m) { return Math.max(0, m * G + excess(t) * (m / M0)); },
    phases: ps,
    area: function (p) { return areaOf(p); }
  };
})();

D.register('jump', function (node, d) {
  var u = build(node);
  var wrap = u.cv.parentNode.parentNode;
  wrap.classList.add('isplit');
  var side = el('div', 'icalc');
  wrap.insertBefore(side, u.ctl);

  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 760, h: port ? 470 : 500,
                            padl: 80, padr: 26, padt: 18, padb: 50 });
  var out = readout(u.ctl);
  var m = 66.6;
  var step = parseInt(d.step || 4, 10);          /* 1 raw · 2 minus BW · 3 areas · 4 answer */
  /* Steps 1 and 2 are one full-height panel; from step 3 the running total
     of the impulse joins it underneath. The two bands never touch, so the
     upper panel's tick labels have somewhere to go. */
  var P1_FULL = { pt: 18, pb: 54 };
  var P = [{ pt: 18, pb: 292 }, { pt: 266, pb: 54 }];

  function areas() {
    var f = m / JUMP.m0;
    return JUMP.phases.map(function (p) { return JUMP.area(p) * f; });
  }

  function draw() {
    var c = ax.c, K = C(), i, t;
    ax.clear();
    var BW = m * G;
    var A = areas(), net = A.reduce(function (a, b) { return a + b; }, 0);
    var v = net / m, h = v * v / (2 * G);
    var COL = [K.ACC, K.GRN, K.ORG];

    var twoUp = step >= 3;
    /* ---- top: the force trace ---- */
    ax.pt = twoUp ? P[0].pt : P1_FULL.pt;
    ax.pb = twoUp ? P[0].pb : P1_FULL.pb;
    var fmax = 0, fmin = 0, q;
    for (t = JUMP.t0; t <= JUMP.t1; t += JUMP.dt * 4) {
      q = step >= 2 ? JUMP.excess(t) * (m / JUMP.m0) : JUMP.force(t, m);
      if (q > fmax) fmax = q;
      if (q < fmin) fmin = q;
    }
    fmax *= 1.14; fmin *= 1.14;
    ax.setRange(JUMP.t0, JUMP.t1, fmin, fmax);
    ax.frame({ grid: true, xticks: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
               yticks: axisTicks(fmin, fmax, 4),
               xlabel: twoUp ? null : 'Time (s)',
               ylabel: step >= 2 ? 'force − body weight (N)' : 'Force (N)',
               ysize: 12, ylabelx: 14,
               xfmt: function (q) { return q.toFixed(1); },
               yfmt: function (q) { return q.toFixed(0); } });

    var base = step >= 2 ? 0 : BW;
    /* shade each phase once step 3 has been reached */
    if (step >= 3) {
      JUMP.phases.forEach(function (p, k) {
        var seg2 = [];
        for (t = p.a; t <= p.b; t += JUMP.dt * 2) {
          seg2.push([t, step >= 2 ? JUMP.excess(t) * (m / JUMP.m0) : JUMP.force(t, m)]);
        }
        fillTo(ax, seg2, base, k === 1 ? 'rgba(74,222,128,0.30)'
                                       : 'rgba(248,113,113,0.26)');
        /* the third phase is only 70 ms wide, so its number is pinned inside
           the frame rather than centred on a sliver at the right edge */
        var span = JUMP.t1 - JUMP.t0;
        var lx = Math.min(Math.max((p.a + p.b) / 2, JUMP.t0 + span * 0.05),
                          JUMP.t1 - span * 0.035);
        label(c, String(k + 1), ax.X(lx), ax.Y(base) + (p.sign > 0 ? -34 : 26),
              { color: COL[k], size: 15, align: 'center', plate: true });
      });
    }
    var pts = [];
    for (t = JUMP.t0; t <= JUMP.t1; t += JUMP.dt * 2) {
      pts.push([t, step >= 2 ? JUMP.excess(t) * (m / JUMP.m0) : JUMP.force(t, m)]);
    }
    ax.poly(pts, { color: K.INK, width: 2.4 });
    ax.poly([[JUMP.t0, base], [JUMP.t1, base]], { color: K.BLUE, width: 1.8, dash: [6, 4] });
    label(c, step >= 2 ? 'zero' : 'body weight ' + fmt(BW, 0) + ' N',
          ax.X(JUMP.t0) + 6, ax.Y(base) - 12,
          { color: K.BLUE, size: 12, plate: true });

    /* ---- bottom: the running total, once the areas are on the table ---- */
    if (!twoUp) { restore(); return finish(A, net, v, h, BW, COL); }
    ax.pt = P[1].pt; ax.pb = P[1].pb;
    var cum = [], s = 0;
    for (t = JUMP.t0; t <= JUMP.t1; t += JUMP.dt) {
      s += JUMP.excess(t) * (m / JUMP.m0) * JUMP.dt;
      cum.push([t, s]);
    }
    var lo = Math.min.apply(null, cum.map(function (q) { return q[1]; }));
    var hi = Math.max.apply(null, cum.map(function (q) { return q[1]; }));
    ax.setRange(JUMP.t0, JUMP.t1, lo * 1.2 - 5, hi * 1.15 + 5);
    ax.frame({ grid: true, xticks: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
               yticks: axisTicks(lo * 1.2 - 5, hi * 1.15 + 5, 4),
               xlabel: 'Time (s)', ylabel: 'cumulative impulse (N·s)',
               ysize: 12, ylabelx: 14,
               xfmt: function (q) { return q.toFixed(1); },
               yfmt: function (q) { return q.toFixed(0); } });
    ax.poly([[JUMP.t0, 0], [JUMP.t1, 0]], { color: K.SOFT, width: 1 });
    ax.poly(cum, { color: K.GRN, width: 2.6 });
    ax.dots([[JUMP.t1, net]], { color: K.GRN, r: 5 });
    label(c, 'net ' + num(net, 1) + ' N·s', ax.X(JUMP.t1) - 8, ax.Y(net) - 14,
          { color: K.GRN, size: 13, align: 'right', plate: true });
    restore();
    finish(A, net, v, h, BW, COL);
  }

  function restore() { ax.pt = P[0].pt; ax.pb = P[0].pb; }

  function finish(A, net, v, h, BW, COL) {
    /* ---- the working ---- */
    var html = '<div class="icalc-h">' +
      ['the force trace', 'subtract body weight', 'the three impulses',
       'velocity and height'][step - 1] + '</div>';
    if (step === 1) {
      html += '<div class="icalc-t">A countermovement jump measured on a force plate. Before it ' +
        'means anything we have to know where <b>body weight</b> sits on it — that is the ' +
        'dashed line, ' + fmt(BW, 0) + ' N.</div>';
    } else if (step === 2) {
      html += '<div class="icalc-t">First, subtract the jumper’s body weight from the force ' +
        'vs time data. What is left is the <b>net</b> force, and its area is the change in ' +
        'momentum.</div>';
    } else {
      html += '<table class="icalc-tab"><thead><tr><th></th><th>impulse</th></tr></thead><tbody>' +
        '<tr><td style="color:' + COL[0] + '">1st negative</td><td>' + num(A[0], 1) + ' N·s</td></tr>' +
        '<tr><td style="color:' + COL[1] + '">positive</td><td>' + num(A[1], 1) + ' N·s</td></tr>' +
        '<tr><td style="color:' + COL[2] + '">2nd negative</td><td>' + num(A[2], 1) + ' N·s</td></tr>' +
        '<tr class="now"><td>net impulse</td><td>' + num(net, 1) + ' N·s</td></tr>' +
        '</tbody></table>';
      if (step >= 4) {
        html += '<div class="icalc-work" style="margin-top:.5em">' +
          '<div class="icalc-t">Ft = m(v₂ − v₁), and v₁ = 0</div>' +
          '<div class="icalc-eq">' + num(net, 1) + ' = (' + fmt(m, 1) + ') v₂</div>' +
          '<div class="icalc-eq">v₂ = <b class="r">' + fmt(v, 2) + '</b> m/s</div>' +
          '<div class="icalc-t" style="margin-top:.5em">rise to the peak</div>' +
          '<div class="icalc-eq">h = v² / 2g = <b class="r">' + fmt(h, 2) + '</b> m</div>' +
          '</div>';
      }
    }
    side.innerHTML = html;

    out.innerHTML =
      'net impulse <b class="g">' + num(net, 1) + ' N·s</b>' +
      ' &nbsp;·&nbsp; take-off <b>' + fmt(v, 2) + ' m/s</b>' +
      ' &nbsp;·&nbsp; height <b class="r">' + fmt(h * 100, 0) + ' cm</b>' +
      '<span class="hint">The height is decided by the <b>net</b> impulse — the positive area ' +
      'minus both negative ones. That is why the answer is not just the big push: everything the ' +
      'jumper did before it is still on the books.</span>';
  }

  chips(u.ctl, [[1, '1 · the trace'], [2, '2 · minus body weight'],
                [3, '3 · the three areas'], [4, '4 · the answer']], step,
    function (v) { step = +v; draw(); });
  slider(u.ctl, 'Jumper mass', 40, 110, 0.1, m, function (v) { return fmt(v, 1) + ' kg'; },
    function (v) { m = v; draw(); }, { scale: 4, tick: function (v) { return fmt(v, 0); } });
  node._draw = draw;
  draw();
});


/* ============================================================
   3. STATIC AND KINETIC FRICTION
   Push gently and friction pushes back exactly as hard. Push past μs·N and
   it lets go, and from then on friction is a smaller constant. The curling
   rock from the slide is the preset.
   ============================================================ */
D.register('friction', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 880, h: port ? 400 : 400,
                            padl: 70, padr: 22, padt: 22, padb: 50 });
  var out = readout(u.ctl);
  var N = 90, us = 0.3, uk = 0.05, Fa = 12;

  function draw() {
    var c = ax.c, K = C(), x;
    ax.clear();
    var Fmax = us * N, Fk = uk * N;
    var XMAX = Math.max(Fmax * 1.9, Fa * 1.25, 10);
    var YMAX = Math.max(Fmax * 1.35, 1);
    ax.setRange(0, XMAX, 0, YMAX);
    ax.frame({ grid: true, xticks: axisTicks(0, XMAX, 5), yticks: axisTicks(0, YMAX, 4),
               xlabel: 'applied force (N)', ylabel: 'friction force (N)',
               xfmt: function (v) { return v.toFixed(0); },
               yfmt: function (v) { return v.toFixed(0); } });

    /* friction matches the push, right up to the critical point */
    ax.poly([[0, 0], [Fmax, Fmax]], { color: K.BLUE, width: 3 });
    ax.dots([[Fmax, Fmax]], { color: K.ACC, r: 5.5 });
    label(c, 'Fmsfr = μs N = ' + fmt(Fmax, 1) + ' N',
          ax.X(Fmax) + 8, ax.Y(Fmax) - 4, { color: K.ACC, size: 13, plate: true });
    /* and then lets go */
    ax.poly([[Fmax, Fk], [XMAX, Fk]], { color: K.GRN, width: 3 });
    ax.poly([[Fmax, Fmax], [Fmax, Fk]], { color: K.SOFT, width: 1.6, dash: [4, 3] });
    label(c, 'Fkfr = μk N = ' + fmt(Fk, 1) + ' N',
          ax.X(XMAX) - 8, ax.Y(Fk) - 14,
          { color: K.GRN, size: 13, align: 'right', plate: true });
    label(c, 'static — nothing moves', ax.X(Fmax * 0.45), ax.Y(Fmax * 0.45) - 16,
          { color: K.BLUE, size: 12, align: 'center', plate: true });
    label(c, 'kinetic — sliding', ax.X((Fmax + XMAX) / 2), ax.Y(Fk) + 18,
          { color: K.GRN, size: 12, align: 'center', plate: true });

    /* where the current push sits */
    var moving = Fa > Fmax;
    var Ff = moving ? Fk : Fa;
    ax.poly([[Fa, 0], [Fa, YMAX]], { color: K.MUT, width: 1.4, dash: [4, 3] });
    ax.dots([[Fa, Ff]], { color: moving ? K.GRN : K.BLUE, r: 6 });

    out.innerHTML =
      'pushing with <b>' + fmt(Fa, 1) + ' N</b> &nbsp;·&nbsp; friction pushes back with <b class="' +
      (moving ? 'g' : 'b') + '">' + fmt(Ff, 1) + ' N</b> &nbsp;·&nbsp; ' +
      (moving ? '<b class="g">sliding</b>' : '<b class="b">still stuck</b>') +
      '<span class="hint">' +
      (moving
        ? 'Once it is moving, friction stops growing. It is now μₖN, and every newton ' +
          'above that goes into accelerating the object — which is why something that has just ' +
          'started to slide tends to take off.'
        : 'Static friction is not a fixed number — it is whatever it needs to be, up to ' +
          'μₛN. Push with 5 N and it pushes back with 5 N.') +
      ' The coefficient indicates the ease of sliding: the greater μ, the less easily one ' +
      'surface slides on another.</span>';
  }

  chips(u.ctl, [['curl', 'curling rock: 90 N, 0.3 / 0.05'],
                ['rub', 'rubber on concrete: 1.0'],
                ['ice', 'steel on ice: 0.005']], 'curl', function (k) {
    if (k === 'curl') { N = 90; us = 0.3; uk = 0.05; }
    else if (k === 'rub') { N = 700; us = 1.0; uk = 0.8; }
    else { N = 700; us = 0.005; uk = 0.003; }
    sN.quiet(N); sS.quiet(us); sK.quiet(uk); draw();
  });
  u.ctl.classList.add('g2');
  var sN = slider(u.ctl, 'Normal force', 10, 900, 10, N, function (v) { return fmt(v, 0) + ' N'; },
    function (v) { N = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  var sA = slider(u.ctl, 'Applied force', 0, 120, 0.5, Fa, function (v) { return fmt(v, 1) + ' N'; },
    function (v) { Fa = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  var sS = slider(u.ctl, 'μ static', 0.005, 1.2, 0.005, us, function (v) { return fmt(v, 3); },
    function (v) { us = v; if (uk > us) { uk = us * 0.5; sK.quiet(uk); } draw(); },
    { scale: 3, tick: function (v) { return fmt(v, 1); } });
  var sK = slider(u.ctl, 'μ kinetic', 0.002, 1.2, 0.002, uk, function (v) { return fmt(v, 3); },
    function (v) { uk = Math.min(v, us); draw(); },
    { scale: 3, tick: function (v) { return fmt(v, 1); } });
  node._draw = draw;
  draw();
});


/* ============================================================
   4. DOES THE HIKER SLIP?
   The whole of the friction half of this lecture in one figure: the weight
   resolved onto the slope, the friction the slope demands, the friction the
   boot can supply, and the angle at which the second runs out.
   ============================================================ */
D.register('slopefric', function (node, d) {
  var u = build(node);
  var wrap = u.cv.parentNode.parentNode;
  wrap.classList.add('isplit');
  var side = el('div', 'icalc');
  wrap.insertBefore(side, u.ctl);

  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 640, h: port ? 420 : 460,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var m = 80, th = 35, us = 0.83;
  var step = parseInt(d.step || 3, 10);   /* 1 free body · 2 resolve · 3 compare */

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var t = th * Math.PI / 180;
    var Fw = m * G, Fpd = Fw * Math.cos(t), Fpl = Fw * Math.sin(t);
    var N = Fpd, Ffr = Fpl, Fmsfr = us * N;
    var slips = Ffr > Fmsfr;
    var critical = Math.atan(us) * 180 / Math.PI;
    /* name only while the diagram is being drawn; magnitudes once the
       weight has been resolved */
    function tag(name, v) { return step >= 2 ? name + ' ' + v : name; }

    /* ---- ground, slope and the angle between them ---- */
    var gx = W * 0.07, gy = H * 0.84, run = W * 0.84;
    if (t > 0.02) run = Math.min(run, (gy - H * 0.16) / Math.tan(t));
    var ex = gx + run, ey = gy - run * Math.tan(t);
    c.save(); c.strokeStyle = K.SOFT; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + W * 0.88, gy); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(gx, gy); c.lineTo(ex, ey); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 1.5; c.setLineDash([3, 3]);
    c.beginPath(); c.arc(gx, gy, 58, -t, 0); c.stroke(); c.restore();
    label(c, fmt(th, 0) + '\u00b0', gx + 70, gy - 16, { color: K.MUT, size: 13, plate: true });

    /* ---- the hiker's boot, part way up ---- */
    var f = 0.52, bx = gx + (ex - gx) * f, by = gy + (ey - gy) * f;
    c.save(); c.translate(bx, by); c.rotate(-t);
    c.fillStyle = K.FILL; c.strokeStyle = K.BLUE; c.lineWidth = 2;
    c.fillRect(-27, -50, 54, 50); c.strokeRect(-27, -50, 54, 50);
    c.restore();
    var px = bx - Math.sin(t) * 25, py = by - Math.cos(t) * 25;

    /* one scale for every arrow, sized so the weight never leaves the frame */
    var S = Math.min(H * 0.30, W * 0.26) / Math.max(Fw, 1);

    /* ---- gravity, and its two components on the axes of the slope ---- */
    arrow(c, px, py, px, py + Fw * S, { color: K.INK, width: 3.6 });
    label(c, tag('Fw', num(-Fw, 1) + ' N'), px + 11, py + Fw * S + 13,
          { color: K.INK, size: 12, plate: true });
    var pdx = px + Math.cos(-t + Math.PI / 2) * Fpd * S,
        pdy = py + Math.sin(-t + Math.PI / 2) * Fpd * S;
    arrow(c, px, py, pdx, pdy, { color: K.ACC, width: 2.6, dash: [5, 4] });
    label(c, tag('Fpd', num(-Fpd, 1)), pdx - 10, pdy + 12,
          { color: K.ACC, size: 12, align: 'right', plate: true });
    var plx = px + Math.cos(-t) * -Fpl * S, ply = py + Math.sin(-t) * -Fpl * S;
    arrow(c, px, py, plx, ply, { color: K.ORG, width: 2.6, dash: [5, 4] });
    label(c, tag('Fpl', fmt(Fpl, 1)), plx - 8, ply + 15,
          { color: K.ORG, size: 12, align: 'right', plate: true });

    /* ---- and what the slope gives back ---- */
    var nx = px + Math.cos(-t - Math.PI / 2) * N * S, ny = py + Math.sin(-t - Math.PI / 2) * N * S;
    arrow(c, px, py, nx, ny, { color: K.GRN, width: 3.2 });
    label(c, tag('N', fmt(N, 1)), nx - 6, ny - 14,
          { color: K.GRN, size: 12, align: 'right', plate: true });
    var frx = px + Math.cos(-t) * Ffr * S, fry = py + Math.sin(-t) * Ffr * S;
    arrow(c, px, py, frx, fry, { color: slips && step >= 3 ? K.ACC : K.BLUE, width: 3.2 });
    label(c, tag('Ffr', fmt(Ffr, 1)), frx + 10, fry - 12,
          { color: slips && step >= 3 ? K.ACC : K.BLUE, size: 12, plate: true });

    /* ---- the working alongside ---- */
    var html = '<div class="icalc-h">' + fmt(m, 0) + ' kg on a <span class="v">' + fmt(th, 0) +
      '\u00b0</span> slope, \u03bc\u209b = ' + fmt(us, 2) + '</div>';
    if (step === 1) {
      html += '<div class="icalc-t">Every force on the boot, drawn from one point:</div>' +
        '<ul class="icalc-list">' +
        '<li><b>Fw</b> — weight, straight down</li>' +
        '<li><b>Fpd</b> — the part of it pressing into the slope</li>' +
        '<li><b>Fpl</b> — the part of it pulling down the slope</li>' +
        '<li><b>N</b> — the normal force, equal and opposite to Fpd</li>' +
        '<li><b>Ffr</b> — friction, equal and opposite to Fpl</li>' +
        '</ul>' +
        '<div class="icalc-t">The two axes are the <b>compression axis</b> (perpendicular) and ' +
        'the <b>shear axis</b> (parallel).</div>';
    } else {
      html += '<div class="icalc-work">' +
        '<div class="icalc-eq">F<sub>w</sub> = mg = ' + num(-Fw, 1) + ' N</div>' +
        '<div class="icalc-eq">F<sub>pd</sub> = W cos' + fmt(th, 0) + '\u00b0 = ' + num(-Fpd, 1) + ' N</div>' +
        '<div class="icalc-eq">F<sub>pl</sub> = W sin' + fmt(th, 0) + '\u00b0 = ' + fmt(Fpl, 1) + ' N</div>' +
        '<div class="icalc-t" style="margin-top:.45em">what the ground gives back</div>' +
        '<div class="icalc-eq">N = \u2212F<sub>pd</sub> = ' + fmt(N, 1) + ' N</div>' +
        '<div class="icalc-eq">F<sub>fr</sub> needed = ' + fmt(Ffr, 1) + ' N</div>';
      if (step >= 3) {
        html += '<div class="icalc-t" style="margin-top:.45em">what the boot can supply</div>' +
          '<div class="icalc-eq">F<sub>msfr</sub> = \u03bc<sub>s</sub>N = ' + fmt(Fmsfr, 1) + ' N</div>';
      }
      html += '</div>';
      if (step >= 3) {
        html += '<div class="icalc-vals">' +
          '<div><span>needed</span><b>' + fmt(Ffr, 0) + '</b></div>' +
          '<div><span>available</span><b>' + fmt(Fmsfr, 0) + '</b></div>' +
          '<div><span>slips at</span><b>' + fmt(critical, 1) + '\u00b0</b></div>' +
          '</div>';
      }
    }
    side.innerHTML = html;

    out.innerHTML = step < 3
      ? 'slope <b>' + fmt(th, 0) + '\u00b0</b> &nbsp;\u00b7&nbsp; F<sub>pd</sub> = <b>' +
        num(-Fpd, 1) + ' N</b> &nbsp;\u00b7&nbsp; F<sub>pl</sub> = <b>' + fmt(Fpl, 1) + ' N</b>' +
        '<span class="hint">Gravity has not changed — only the axes have. Drag the slope and ' +
        'watch the weight arrow stay exactly where it is while the two dashed components trade ' +
        'length: all of it is compression at 0\u00b0 and all of it is shear at 90\u00b0.</span>'
      : 'F<sub>fr</sub> = <b>' + fmt(Ffr, 1) + ' N</b> ' + (slips ? '&gt;' : '&lt;') +
        ' F<sub>msfr</sub> = <b>' + fmt(Fmsfr, 1) + ' N</b> &nbsp;\u00b7&nbsp; ' +
        (slips ? '<b class="r">the hiker slips</b>' : '<b class="g">the hiker does not slip</b>') +
        '<span class="hint">Both sides of the comparison move together as the slope steepens \u2014 ' +
        'the shear grows while the normal force, and therefore the friction available, shrinks. They ' +
        'cross at <b>' + fmt(critical, 1) + '\u00b0</b>, where tan\u03b8 = \u03bc\u209b. Mass cancels ' +
        'out of that entirely: a heavier hiker is not any safer.</span>';
  }

  chips(u.ctl, [['hike', 'the hiker: 80 kg, 35°, μ 0.83'],
                ['wet', 'wet rock, μ 0.35'],
                ['crit', 'right at the critical angle']], 'hike', function (k) {
    if (k === 'hike') { m = 80; th = 35; us = 0.83; }
    else if (k === 'wet') { us = 0.35; }
    else { th = Math.round(Math.atan(us) * 180 / Math.PI); }
    sM.quiet(m); sT.quiet(th); sU.quiet(us); draw();
  });
  u.ctl.classList.add('g2');
  var sM = slider(u.ctl, 'Mass', 40, 140, 1, m, function (v) { return fmt(v, 0) + ' kg'; },
    function (v) { m = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  var sT = slider(u.ctl, 'Slope', 0, 60, 1, th, function (v) { return fmt(v, 0) + '°'; },
    function (v) { th = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 0); } });
  var sU = slider(u.ctl, 'μ static', 0.05, 1.2, 0.01, us, function (v) { return fmt(v, 2); },
    function (v) { us = v; draw(); }, { scale: 3, tick: function (v) { return fmt(v, 1); } });
  node._draw = draw;
  draw();
});


/* ============================================================
   5. READING AN ACTIVITY OFF A FORCE PLATE
   Understanding impulse and momentum means a force trace can be read like
   a sentence. This is the Headon and Curwen sequence: the same person,
   eight things done in a row, one trace.
   ============================================================ */
function gs(u, mu, sg) { return Math.exp(-Math.pow((u - mu) / sg, 2)); }
function lg(u, mu, sg) { return 1 / (1 + Math.exp(-(u - mu) / sg)); }

/* Segment starts and widths are read off the published record (Headon and
   Curwen's ten activities across 11.5 s), and the shapes are drawn to it.
   The trace in the paper is plotted upside down; this one is the right way
   up, so body weight sits at 1. */
var ACTS = [
  { t: 0.0000, d: 0.0652, name: 'Static (feet only)', f: function () { return 0.28; } },
  { t: 0.0652, d: 0.1305, name: 'Rise to stand',
    f: function (u) { return 0.24 + 0.76 * lg(u, 0.28, 0.045)
                           + 0.22 * gs(u, 0.37, 0.08) - 0.42 * gs(u, 0.80, 0.07); } },
  { t: 0.1957, d: 0.2217, name: 'Static (stand)', f: function () { return 1.0; } },
  { t: 0.4174, d: 0.0304, name: 'Crouch',
    f: function (u) { return 1 - 0.60 * gs(u, 0.45, 0.22); } },
  { t: 0.4478, d: 0.0826, name: 'Jump',
    f: function (u) { return u > 0.96 ? 0.03 : 1 + 0.85 * Math.pow(u, 1.8); } },
  { t: 0.5304, d: 0.0392, name: 'Static (no load)', f: function () { return 0.03; } },
  { t: 0.5696, d: 0.0652, name: 'Dropland',
    f: function (u) {
      if (u < 0.12) return 0.03;
      return 1.0 * (1 - Math.exp(-(u - 0.12) / 0.10))
           + 1.90 * gs(u, 0.22, 0.075) - 0.15 * gs(u, 0.45, 0.10);
    } },
  { t: 0.6348, d: 0.1826, name: 'Static (stand)', f: function () { return 1.0; } },
  { t: 0.8174, d: 0.1043, name: 'Sit',
    f: function (u) { return 1 - 0.30 * gs(u, 0.22, 0.10) + 0.25 * gs(u, 0.60, 0.11)
                           - 0.85 * lg(u, 0.85, 0.055); } },
  { t: 0.9217, d: 0.0783, name: 'Static (feet only)', f: function () { return 0.18; } }
];

D.register('activity', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 940, h: port ? 380 : 380,
                            padl: 66, padr: 22, padt: 46, padb: 52 });
  var out = readout(u.ctl);
  var reveal = false, cursor = 0.45, m = 75;
  var DUR = 11.5;                                /* seconds across the record */

  function trace(x) {                            /* x is 0..1 across the record */
    for (var i = 0; i < ACTS.length; i++) {
      var a = ACTS[i];
      if (x >= a.t && x < a.t + a.d) return { v: a.f((x - a.t) / a.d), i: i };
    }
    return { v: 0.55, i: ACTS.length - 1 };
  }

  function draw() {
    var c = ax.c, K = C(), x;
    ax.clear();
    var BW = m * G;
    ax.setRange(0, DUR, 0, 3.3);
    ax.frame({ grid: true, xticks: [0, 2, 4, 6, 8, 10], yticks: [0, 1, 2, 3],
               xlabel: 'Time (s)', ylabel: 'force (body weights)',
               yfmt: function (v) { return v.toFixed(0); } });
    ax.poly([[0, 1], [DUR, 1]], { color: K.BLUE, width: 1.4, dash: [5, 4] });
    label(c, 'body weight', ax.X(DUR) - 6, ax.Y(1) - 12,
          { color: K.BLUE, size: 11, align: 'right', plate: true });

    if (reveal) {
      ACTS.forEach(function (a, i) {
        if (i % 2 === 0) {
          ax.rect(a.t * DUR, 0, (a.t + a.d) * DUR, 3.3, { fill: 'rgba(148,163,184,0.10)' });
        }
        c.save();
        c.translate(ax.X((a.t + a.d / 2) * DUR), ax.pt - 6);
        c.rotate(-Math.PI / 4);
        label(c, (i + 1) + ' ' + a.name, 0, 0, { color: K.MUT, size: 10, weight: '600' });
        c.restore();
      });
    }

    var pts = [];
    for (x = 0; x <= 1; x += 0.0007) pts.push([x * DUR, Math.max(0, trace(x).v)]);
    ax.poly(pts, { color: K.INK, width: 1.8 });

    var cur = trace(cursor);
    ax.poly([[cursor * DUR, 0], [cursor * DUR, 3.3]], { color: K.ACC, width: 1.5, dash: [4, 3] });
    ax.dots([[cursor * DUR, Math.max(0, cur.v)]], { color: K.ACC, r: 5 });

    out.innerHTML =
      't = ' + fmt(cursor * DUR, 1) + ' s &nbsp;·&nbsp; <b class="r">' +
      fmt(cur.v, 2) + ' BW</b> = ' + fmt(cur.v * BW, 0) + ' N' +
      (reveal ? ' &nbsp;·&nbsp; <b>' + ACTS[cur.i].name + '</b>' : '') +
      '<span class="hint">' +
      (reveal
        ? 'Every one of these is recognisable from the trace alone: a jump is unweighting, a big ' +
          'push, nothing at all, then a landing spike; sitting down is a slow fall to a partial ' +
          'load that never comes back.'
        : 'Ten things done in a row on one force plate. Before revealing the labels, work out from ' +
          'the trace alone which is the jump, which is the drop landing, and where the person is ' +
          'sitting down — the shapes are the argument.') +
      '</span>';
  }

  slider(u.ctl, 'Cursor', 0, 0.999, 0.002, cursor,
    function (v) { return fmt(v * DUR, 1) + ' s'; }, function (v) { cursor = v; draw(); },
    { scale: 5, tick: function (v) { return fmt(v * DUR, 0); } });
  var r = ctlRow(u.ctl);
  var rb = el('button', 'ibtn', 'Reveal the activities');
  rb.addEventListener('click', function () {
    reveal = !reveal; rb.classList.toggle('on', reveal);
    rb.textContent = reveal ? 'Hide the activities' : 'Reveal the activities';
    draw();
  });
  r.appendChild(rb);
  node._draw = draw;
  draw();
});

D.boot();

})();
