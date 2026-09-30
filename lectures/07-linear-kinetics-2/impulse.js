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


/* fit.js's prewarm sweep selects `.iseg-b:not([data-unsafe])` — the BUTTONS,
   not the container — and restores only ONE "on" control per figure. Mark the
   buttons themselves, or a second segmented control is left wherever the sweep
   finished and that frame becomes the printed handout page. */
function keepOut(row) {
  Array.prototype.forEach.call(row.querySelectorAll('.iseg-b, .icalc-chip'),
    function (b) { b.setAttribute('data-unsafe', '1'); });
  return row;
}

/* a legend on a plate, sized from its own text so it never sits on a curve */
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
    c.fillStyle = rows[i][0]; c.fillRect(x + pad, cy - 4, 13, 8);
    c.fillStyle = C().INK; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(rows[i][1], x + pad + 20, cy);
  }
  c.restore();
  return { w: bw, h: bh };
}

/* ============================================================
   A MEASURED COUNTERMOVEMENT JUMP
   SUSU youth motion dataset (UVic), subject SUSU-46,
   trial "SUSU-46-Vertical Jump(Single)1". Two force plates at 450 Hz, one foot on each,
   resampled here to 200 Hz over the 1.76 s around the jump.

   Body weight is the mean of the first quiet second of the record
   (595.9 N, sd 2.2 N -> 60.74 kg). That matters: a window
   chosen closer to the movement is already contaminated by the subject
   settling, and a 12 N error in body weight is worth 0.16 m/s at take-off.

   FZ is the total vertical force in newtons. Velocity and displacement are
   NOT stored - the widgets integrate FZ, which is the point. The window
   starts in quiet standing (residual velocity 4 mm/s), so integrating from
   the first sample with v = 0 reproduces the full-record numbers.

   COM is the centre of mass measured independently from 83 markers at 90 Hz
   (12-segment Winter model), in millimetres relative to standing, aligned to
   the force clock. The two agree to r = 0.9999, RMS 14 mm - they are separate
   instruments measuring the same thing.
   ============================================================ */
var J46 = {
  subject: 'SUSU-46', rate: 200, mass: 60.74, bw: 595.9,
  tOnset: 0.4489, tBottom: 0.6422, tTo: 0.96, tLand: 1.4133,
  vto: 2.2717, hFromV: 0.263, hFromFlight: 0.252, flight: 0.4533,
  dip: -0.3475, peakF: 1225.1, peakP: 2658.3,
  FZ: [
  587,585,583,580,575,573,572,570,569,564,563,561,556,555,550,548,541,540,530,521,515,508,502,
  494,489,484,477,472,463,457,451,449,441,441,437,434,430,430,427,425,419,411,401,387,376,366,
  357,351,346,346,346,343,340,339,335,335,333,329,328,325,321,317,311,310,305,308,317,332,349,
  367,381,394,406,413,418,426,435,443,450,459,468,476,489,499,517,533,554,568,587,598,614,632,
  645,659,673,690,705,722,742,762,775,796,817,843,870,896,922,944,967,983,1003,1021,1036,1050,
  1062,1073,1084,1092,1100,1105,1113,1123,1133,1140,1146,1152,1155,1160,1167,1174,1178,1181,
  1183,1183,1180,1172,1167,1163,1159,1154,1146,1139,1133,1125,1118,1111,1105,1101,1098,1096,
  1096,1096,1100,1101,1105,1109,1118,1122,1124,1129,1133,1136,1140,1141,1144,1150,1155,1167,
  1173,1187,1197,1209,1217,1219,1222,1223,1217,1202,1172,1133,1078,1007,918,816,702,581,468,
  360,255,163,94,54,23,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,66,191,302,409,697,1222,680,679,839,771,852,874,946,1082,1355,1909,2249,
  2188,1768,1467,1241,1172,1185,1154,1085,1037,1010,992,978,962,955,948,949,946,928,903,879,
  860,837,819,798,776,757,746,743,735,736,740,749,758,770,776,780,787,791,791,793,791,788,782,
  777,775,777,782,790,797,802,809,810
  ],
  COM: [
  10,10,10,10,10,10,10,9,9,9,9,8,8,8,8,7,7,7,6,6,6,5,5,4,4,3,3,2,1,0,0,-1,-2,-3,-5,-6,-7,-9,
  -10,-12,-13,-15,-17,-19,-21,-23,-25,-27,-30,-32,-35,-37,-40,-43,-46,-49,-53,-56,-59,-63,-67,
  -71,-75,-79,-83,-88,-92,-97,-101,-106,-111,-116,-122,-127,-132,-137,-143,-148,-154,-160,
  -165,-171,-177,-183,-189,-195,-200,-206,-212,-218,-224,-230,-236,-242,-247,-253,-259,-264,
  -270,-275,-281,-286,-291,-296,-301,-306,-311,-315,-320,-324,-328,-332,-336,-339,-342,-346,
  -348,-351,-354,-356,-358,-360,-361,-363,-364,-365,-365,-366,-366,-366,-366,-365,-364,-363,
  -362,-361,-359,-357,-354,-352,-349,-346,-343,-339,-336,-332,-328,-323,-319,-314,-309,-303,
  -298,-292,-286,-280,-274,-267,-260,-253,-246,-238,-231,-223,-214,-206,-197,-188,-179,-169,
  -160,-150,-139,-129,-118,-107,-96,-84,-72,-60,-47,-35,-22,-9,3,17,30,42,55,68,81,93,105,117,
  129,140,150,161,170,180,189,198,206,215,223,231,239,246,253,261,268,274,281,287,293,299,304,
  309,314,319,323,327,331,335,339,342,345,348,351,353,355,357,358,360,361,362,362,363,363,363,
  362,362,361,360,358,357,355,353,350,347,345,341,338,335,331,327,322,318,313,308,302,297,291,
  285,279,272,265,258,251,243,236,227,219,211,202,193,183,174,164,154,144,133,122,111,100,89,
  77,66,54,42,30,18,6,-5,-17,-28,-39,-50,-60,-70,-80,-89,-97,-105,-113,-120,-127,-133,-140,
  -145,-151,-156,-162,-167,-172,-177,-182,-187,-191,-196,-200,-204,-208,-212,-216,-220,-224,
  -228,-232,-236,-239,-243,-247,-250,-254,-257,-260,-264,-267,-270,-273,-276,-279,-281,-284,
  -286,-289,-291,-294,-296,-298,-300
  ]
};

/* Velocity and displacement, by integrating the measured force twice. This is
   done here rather than stored so the figures can show the integration being
   done, and so there is exactly one copy of the arithmetic. */
var J46K = (function () {
  var n = J46.FZ.length, dt = 1 / J46.rate, m = J46.mass, bw = J46.bw;
  var v = new Array(n), s = new Array(n), i, a0, a1;
  v[0] = 0; s[0] = 0;
  for (i = 1; i < n; i++) {
    a0 = (J46.FZ[i - 1] - bw) / m;
    a1 = (J46.FZ[i] - bw) / m;
    v[i] = v[i - 1] + (a0 + a1) / 2 * dt;
    s[i] = s[i - 1] + (v[i - 1] + v[i]) / 2 * dt;
  }
  function at(t) {
    var x = Math.max(0, Math.min(n - 1, t * J46.rate));
    var i0 = Math.floor(x), i1 = Math.min(n - 1, i0 + 1), f = x - i0;
    return { t: t,
             f: J46.FZ[i0] + (J46.FZ[i1] - J46.FZ[i0]) * f,
             v: v[i0] + (v[i1] - v[i0]) * f,
             s: s[i0] + (s[i1] - s[i0]) * f,
             c: (J46.COM[i0] + (J46.COM[i1] - J46.COM[i0]) * f) / 1000 };
  }
  return { n: n, dt: dt, dur: (n - 1) / J46.rate, v: v, s: s, at: at,
           tAt: function (i) { return i / J46.rate; } };
})();


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

/* ============================================================
   THE SAME JUMP, AS A MEASURED SKELETON

   Twenty-two joint centres built from SUSU-46's 83 markers, resampled to
   40 Hz and put on the FORCE clock (the two systems in this dataset are
   not synchronised — this trial's markers run 133 ms ahead of the plate,
   and that offset is baked out here).

   Millimetres, in a body frame taken from quiet standing: +x is the way
   he faces, +y is to his left, +z is up from the floor, origin under the
   ankles. Standing head top is 1706 mm; in flight it reaches 2047 mm.
   ============================================================ */
var S46_J = ['head', 'neck', 'trunk', 'pelvis', 'shL', 'elL', 'wrL', 'shR', 'elR', 'wrR', 'hipL', 'kneeL', 'ankL', 'heelL', 'mtL', 'toeL', 'hipR', 'kneeR', 'ankR', 'heelR', 'mtR', 'toeR'];
var S46_RATE = 40, S46_N = 70;
var S46_P = [
  140,-7,1708,96,20,1454,61,-1,1228,40,1,957,64,195,1423,-44,326,1213,33,216,1053,67,-212,1398,
  -37,-338,1218,39,-221,1056,108,91,859,34,142,426,-16,144,50,-114,66,-1,87,136,2,144,154,10,108,
  -95,866,81,-143,439,15,-146,37,-79,-86,-8,133,-141,10,199,-149,5,144,-8,1707,98,20,1453,61,-2,
  1227,38,1,956,66,195,1422,-42,326,1212,32,216,1051,70,-212,1398,-35,-337,1216,39,-219,1052,105,
  90,859,38,142,426,-15,144,50,-114,66,-1,87,136,2,144,154,10,105,-95,865,84,-143,439,16,-146,37,
  -80,-86,-8,133,-141,10,199,-149,5,148,-8,1706,101,19,1452,61,-2,1227,35,0,955,68,195,1422,-38,
  327,1211,31,216,1048,74,-213,1396,-32,-337,1214,39,-218,1049,102,90,857,45,143,426,-13,144,50,
  -114,66,-1,87,136,2,144,154,10,103,-96,864,88,-144,439,17,-146,37,-80,-86,-8,133,-141,10,199,
  -149,5,152,-8,1704,104,19,1450,61,-3,1226,31,-1,955,71,194,1420,-36,327,1210,29,215,1045,77,
  -214,1395,-29,-338,1213,38,-219,1046,98,89,857,55,145,426,-9,144,51,-114,66,0,87,136,2,144,154,
  10,99,-97,862,92,-144,439,18,-146,37,-80,-86,-8,133,-141,10,200,-149,5,158,-9,1701,108,19,1448,
  62,-3,1224,27,-1,953,75,194,1418,-33,327,1208,27,214,1042,81,-214,1392,-27,-340,1211,37,-220,
  1044,93,89,855,66,146,424,-5,145,51,-113,66,0,87,136,2,144,154,9,95,-97,860,97,-145,438,20,-146,
  37,-80,-86,-8,133,-141,10,200,-149,6,164,-10,1696,112,18,1444,64,-4,1221,22,-1,951,79,194,1416,
  -30,328,1206,24,213,1039,86,-215,1389,-24,-341,1210,36,-220,1041,87,88,852,78,148,423,-1,146,51,
  -113,66,1,88,136,2,145,154,9,91,-97,858,104,-146,437,22,-147,38,-80,-86,-8,133,-141,10,200,-148,
  6,171,-11,1690,117,18,1439,64,-4,1217,16,-2,947,83,193,1411,-27,329,1203,19,212,1034,92,-216,
  1385,-21,-342,1207,33,-219,1038,81,87,848,89,151,420,2,146,51,-113,66,1,88,136,2,145,153,8,85,
  -97,854,112,-148,436,25,-148,38,-80,-86,-8,133,-141,10,199,-148,6,179,-12,1682,122,17,1432,64,
  -4,1210,10,-3,942,88,193,1405,-24,329,1198,14,212,1027,97,-216,1378,-18,-343,1203,30,-219,1032,
  74,87,841,98,154,417,5,147,51,-113,66,1,88,136,2,145,154,9,79,-98,849,121,-150,434,28,-149,38,
  -80,-86,-8,133,-141,10,199,-149,6,187,-13,1671,128,17,1421,65,-4,1201,3,-3,934,94,193,1396,-21,
  329,1190,9,211,1018,104,-216,1368,-16,-344,1196,25,-219,1025,67,86,833,107,157,413,8,148,51,
  -113,66,1,87,136,2,145,154,9,72,-99,841,131,-155,431,31,-150,38,-80,-86,-8,133,-141,10,199,-149,
  6,196,-14,1657,135,17,1409,65,-3,1190,-4,-4,924,101,193,1384,-19,329,1180,3,210,1007,111,-216,
  1356,-13,-345,1187,19,-220,1015,59,86,822,116,160,409,11,149,52,-113,66,1,87,136,2,144,154,10,
  64,-99,831,143,-159,428,35,-152,38,-80,-87,-8,133,-142,10,199,-150,7,206,-15,1639,143,17,1392,
  67,-4,1176,-12,-4,912,107,192,1369,-17,329,1168,-2,209,994,118,-216,1340,-11,-346,1176,13,-219,
  1003,51,85,809,126,164,404,14,150,52,-113,66,1,87,136,2,144,154,10,56,-99,818,156,-163,424,39,
  -154,38,-80,-86,-8,133,-143,11,199,-151,7,215,-16,1617,150,17,1372,68,-4,1158,-20,-5,897,114,
  192,1350,-15,329,1152,-8,208,978,125,-217,1322,-9,-346,1162,8,-220,987,42,85,794,137,168,398,17,
  151,52,-113,66,1,87,136,2,144,154,10,48,-100,801,169,-168,418,43,-155,38,-80,-86,-8,132,-143,11,
  199,-151,8,225,-16,1592,157,17,1348,69,-5,1137,-28,-6,878,122,192,1327,-13,329,1134,-14,207,959,
  132,-217,1299,-7,-347,1144,2,-220,969,33,84,774,149,173,391,21,152,52,-113,66,1,87,137,2,144,
  154,10,40,-101,782,182,-170,412,48,-156,38,-80,-86,-8,132,-144,11,198,-152,8,235,-16,1563,165,
  17,1320,70,-5,1112,-36,-7,856,129,192,1301,-12,328,1111,-20,206,937,138,-217,1273,-6,-347,1122,
  -2,-220,947,25,84,751,160,176,384,25,152,52,-113,65,1,87,137,2,144,154,10,32,-102,759,196,-172,
  405,52,-156,38,-80,-86,-8,132,-144,11,198,-153,9,245,-16,1530,171,15,1287,71,-5,1083,-44,-7,831,
  135,191,1270,-11,328,1085,-25,206,912,145,-217,1242,-4,-348,1096,-8,-221,922,16,84,725,173,180,
  375,29,153,53,-113,65,0,87,137,2,144,154,10,24,-102,732,210,-173,397,57,-156,38,-80,-86,-8,132,
  -144,11,198,-152,8,254,-15,1494,179,16,1252,71,-7,1051,-51,-8,803,142,191,1236,-10,327,1056,-31,
  205,883,151,-218,1208,-2,-349,1067,-11,-221,893,8,84,696,185,183,365,33,154,53,-113,65,0,87,137,
  2,143,154,10,17,-103,702,223,-173,389,61,-156,38,-80,-86,-8,132,-143,11,198,-152,8,262,-15,1456,
  186,15,1215,71,-8,1018,-57,-8,773,148,190,1200,-10,326,1024,-36,205,852,158,-218,1172,1,-349,
  1035,-15,-221,862,1,84,665,197,185,355,37,154,53,-113,65,1,87,137,2,144,154,10,11,-103,671,236,
  -172,380,66,-156,39,-80,-86,-8,132,-143,10,199,-151,7,270,-14,1416,191,15,1176,73,-8,982,-61,-8,
  741,154,190,1162,-9,326,991,-40,205,820,163,-219,1133,3,-349,1001,-17,-221,828,-4,85,633,210,
  186,345,42,154,53,-113,65,1,88,137,2,144,155,9,6,-103,639,249,-170,372,70,-155,38,-79,-86,-8,
  133,-143,10,199,-151,6,278,-13,1376,197,15,1137,74,-8,946,-66,-8,710,159,189,1124,-8,325,958,
  -42,205,787,169,-219,1094,5,-349,966,-20,-221,794,-9,86,601,222,186,335,46,154,53,-113,65,1,88,
  136,2,144,154,9,2,-103,606,260,-168,363,74,-154,39,-79,-86,-8,133,-143,10,199,-151,6,284,-12,
  1337,203,15,1099,75,-8,910,-69,-8,677,164,189,1087,-6,325,925,-44,205,754,174,-220,1056,9,-349,
  930,-21,-221,759,-12,87,568,234,185,324,50,153,53,-112,64,2,88,136,1,145,154,8,-1,-103,574,271,
  -166,354,78,-153,39,-80,-86,-7,133,-143,9,199,-150,5,290,-11,1300,207,15,1063,76,-8,876,-70,-7,
  647,168,188,1052,-5,325,893,-45,205,722,178,-220,1021,12,-349,895,-21,-221,725,-13,87,538,246,
  183,314,55,152,53,-112,64,2,89,136,1,145,154,7,-2,-101,542,282,-163,346,82,-151,40,-80,-86,-7,
  133,-142,9,200,-151,3,295,-10,1266,211,15,1030,78,-8,845,-70,-7,618,171,188,1020,-5,324,864,-45,
  205,693,181,-220,988,14,-349,863,-21,-220,694,-13,88,510,256,182,304,59,152,53,-111,64,2,89,136,
  1,146,154,6,-3,-101,514,291,-160,337,85,-150,40,-79,-86,-7,134,-142,9,200,-151,3,299,-9,1238,
  215,16,1002,79,-9,818,-69,-7,594,174,188,992,-4,324,838,-44,205,667,184,-220,960,17,-349,835,
  -19,-221,665,-11,88,486,265,181,294,62,151,54,-111,64,2,90,136,0,146,155,6,-2,-101,489,298,-157,
  330,88,-148,40,-79,-85,-6,134,-142,9,201,-150,2,301,-8,1216,218,15,980,82,-9,796,-68,-7,574,176,
  188,969,-2,323,816,-43,204,646,188,-220,937,21,-349,811,-18,-221,642,-9,88,467,273,179,288,65,
  149,54,-111,64,4,90,136,0,146,155,5,0,-101,470,304,-155,324,90,-147,41,-79,-85,-5,134,-142,9,
  201,-150,2,303,-7,1200,221,15,964,85,-9,781,-66,-7,560,179,188,954,1,323,801,-41,205,630,192,
  -221,920,25,-349,794,-15,-221,626,-7,88,454,279,176,282,68,148,56,-110,63,5,91,135,0,147,155,5,
  2,-101,456,309,-152,320,92,-146,41,-79,-85,-6,134,-142,9,201,-150,1,304,-6,1192,224,15,956,88,
  -9,773,-65,-7,552,182,188,945,4,323,792,-39,206,621,196,-221,911,30,-350,784,-12,-220,617,-5,88,
  447,282,172,279,69,146,57,-110,62,5,90,135,1,147,154,4,4,-100,449,312,-148,317,93,-144,41,-79,
  -85,-6,134,-142,9,201,-150,1,306,-6,1191,226,15,955,91,-9,772,-62,-7,552,184,188,944,8,323,790,
  -35,206,619,199,-221,910,34,-351,782,-9,-220,615,-3,88,446,285,169,277,71,145,57,-109,62,5,91,
  135,1,147,154,4,6,-100,449,314,-145,315,94,-143,41,-79,-85,-6,134,-141,9,201,-150,1,307,-6,1198,
  229,16,962,94,-10,779,-59,-7,558,187,188,951,11,323,796,-32,205,625,202,-221,916,39,-351,786,-6,
  -221,620,0,88,453,286,167,277,72,144,57,-109,62,6,91,135,1,148,154,4,9,-100,455,315,-142,314,94,
  -142,41,-79,-85,-6,134,-141,9,201,-150,1,307,-6,1214,231,16,978,97,-9,794,-56,-8,572,189,188,
  966,14,323,809,-29,205,639,205,-221,931,44,-351,799,-2,-221,633,3,87,466,285,166,280,72,143,58,
  -109,61,6,91,135,1,148,154,4,12,-101,469,315,-141,316,94,-142,41,-79,-85,-6,134,-141,9,201,-151,
  1,307,-6,1237,232,16,1000,100,-9,815,-52,-8,592,190,189,988,16,323,830,-26,205,659,208,-221,953,
  48,-351,820,3,-222,653,7,87,486,282,164,285,71,142,58,-109,61,6,91,135,1,148,154,4,16,-101,489,
  314,-138,319,93,-142,41,-79,-86,-5,134,-142,9,201,-151,0,306,-6,1268,233,16,1030,103,-10,844,
  -48,-8,619,191,189,1017,18,323,857,-23,205,686,210,-221,983,53,-352,847,8,-222,680,10,87,513,
  277,161,291,69,141,56,-109,61,5,91,135,1,148,154,4,20,-101,515,311,-135,325,92,-142,41,-79,-87,
  -4,135,-142,9,202,-151,0,304,-5,1305,234,17,1067,105,-10,879,-43,-8,652,191,189,1053,19,323,891,
  -19,205,720,212,-220,1019,57,-352,881,14,-222,714,16,88,546,269,159,300,65,141,56,-109,62,5,90,
  135,1,148,155,4,26,-101,548,306,-133,332,91,-141,41,-79,-87,-3,135,-142,9,202,-151,0,301,-3,
  1350,233,18,1111,107,-9,922,-36,-8,690,190,190,1096,21,323,931,-15,205,760,214,-220,1063,61,
  -351,922,21,-222,753,22,88,585,260,156,311,62,141,55,-110,62,5,90,135,1,147,155,4,33,-101,587,
  299,-132,343,89,-141,42,-78,-87,-2,135,-143,8,202,-151,-1,298,-2,1402,228,9,1162,109,-10,970,
  -29,-8,735,187,190,1147,22,323,978,-10,205,806,214,-220,1114,65,-351,968,27,-222,799,31,89,631,
  248,153,327,58,141,55,-110,63,5,90,136,1,148,155,4,41,-100,632,288,-132,357,87,-142,43,-77,-87,
  0,136,-143,8,203,-152,-1,294,-1,1461,224,9,1221,111,-10,1025,-20,-6,786,184,190,1205,22,323,
  1032,-3,205,858,212,-220,1172,68,-350,1021,35,-222,850,41,90,683,231,150,346,53,140,56,-110,63,
  6,90,136,1,148,156,3,51,-99,684,273,-133,375,83,-144,46,-76,-89,5,137,-144,8,203,-152,-2,289,0,
  1528,219,9,1288,113,-10,1088,-8,-5,843,178,189,1270,23,323,1092,5,207,917,209,-221,1237,69,-349,
  1079,44,-221,908,53,91,743,205,149,372,46,142,57,-109,64,10,91,137,0,148,156,3,64,-97,742,253,
  -138,399,79,-147,54,-74,-88,16,139,-145,7,204,-153,-3,283,0,1602,213,10,1362,114,-10,1156,6,-4,
  906,172,189,1342,24,323,1158,14,208,981,203,-222,1309,69,-349,1144,53,-220,971,68,92,808,171,
  151,408,39,146,65,-104,65,27,94,138,0,149,156,2,78,-96,807,225,-144,432,74,-150,65,-67,-87,36,
  143,-146,7,203,-153,-4,277,0,1678,206,11,1439,116,-9,1229,20,-3,972,167,189,1417,26,324,1228,24,
  209,1049,196,-222,1385,69,-348,1213,61,-220,1038,82,92,875,132,152,455,38,153,83,-91,71,63,99,
  141,1,151,157,1,93,-95,875,189,-148,474,73,-154,83,-53,-92,67,149,-145,6,206,-153,-4,269,0,1750,
  198,10,1511,119,-8,1299,33,-3,1037,161,189,1489,28,325,1295,32,209,1117,189,-221,1458,68,-347,
  1283,70,-222,1105,94,93,941,92,150,512,45,161,115,-65,81,120,111,145,15,161,161,1,106,-94,940,
  150,-151,524,77,-162,113,-29,-99,116,160,-149,15,213,-156,-6,259,0,1813,192,10,1576,121,-8,1361,
  45,-2,1094,154,188,1553,28,327,1355,38,209,1178,182,-220,1523,67,-349,1346,76,-224,1168,106,94,
  1002,62,152,568,48,165,163,-39,80,181,124,146,59,174,166,27,118,-91,998,120,-157,572,77,-170,
  158,-10,-103,172,168,-153,53,220,-157,9,249,0,1861,185,9,1627,123,-8,1411,50,-1,1142,147,186,
  1604,27,328,1405,42,211,1229,178,-221,1576,65,-352,1399,81,-225,1224,111,94,1050,61,160,615,39,
  164,206,-41,68,226,120,143,108,171,166,79,123,-88,1045,117,-160,619,68,-171,204,-22,-105,217,
  159,-153,102,213,-157,60,240,0,1903,180,10,1669,121,-9,1452,49,-1,1184,141,186,1646,26,328,1445,
  44,213,1268,174,-221,1618,64,-354,1442,83,-226,1269,109,95,1089,71,162,658,33,159,253,-48,58,
  279,96,141,144,141,167,110,122,-90,1087,126,-156,662,57,-169,255,-42,-105,269,130,-158,143,179,
  -163,95,229,-1,1948,176,9,1707,116,-10,1488,46,0,1218,137,187,1682,25,327,1477,40,212,1299,173,
  -222,1656,64,-353,1477,82,-225,1303,106,95,1124,87,161,694,29,153,297,-63,50,322,73,136,182,117,
  162,146,119,-90,1123,139,-152,698,46,-167,301,-66,-107,318,98,-159,181,144,-164,131,222,0,1980,
  173,10,1738,112,-10,1520,42,0,1247,133,187,1712,22,327,1506,37,210,1328,172,-221,1687,64,-351,
  1506,79,-223,1331,103,95,1154,101,160,724,27,150,333,-79,50,362,58,127,216,102,149,178,116,-90,
  1152,148,-152,728,37,-167,341,-86,-111,363,71,-154,215,114,-159,162,218,0,2004,170,11,1762,109,
  -9,1544,39,-1,1271,131,188,1736,19,327,1530,33,210,1353,172,-221,1710,62,-350,1529,76,-222,1355,
  101,95,1179,107,158,749,27,148,359,-87,56,394,48,115,239,91,132,199,113,-90,1176,152,-152,753,
  31,-167,372,-97,-114,399,52,-150,241,94,-153,186,213,1,2024,168,11,1780,106,-9,1562,38,-1,1289,
  128,188,1755,15,328,1551,30,210,1374,170,-221,1728,60,-350,1547,73,-221,1373,101,95,1199,109,
  154,766,29,147,375,-91,64,415,45,106,255,89,118,214,112,-89,1195,151,-151,771,27,-167,391,-102,
  -114,422,42,-147,259,82,-149,203,209,2,2038,167,13,1794,104,-9,1576,38,-1,1302,125,188,1770,12,
  328,1565,28,209,1389,168,-221,1742,58,-350,1561,70,-222,1387,101,95,1212,107,149,778,30,145,384,
  -94,68,423,49,102,267,94,111,226,111,-91,1208,146,-151,783,23,-168,401,-105,-114,431,42,-145,
  271,83,-147,216,206,3,2045,164,13,1802,103,-9,1583,39,-1,1309,121,188,1778,9,327,1573,29,209,
  1397,164,-221,1750,55,-351,1569,69,-222,1395,102,94,1218,103,146,783,30,143,389,-94,67,423,55,
  104,272,102,113,233,111,-91,1215,138,-150,788,21,-167,403,-107,-114,429,49,-145,276,94,-145,226,
  202,3,2047,161,13,1803,102,-9,1584,39,-1,1310,117,187,1780,8,327,1574,30,209,1398,160,-221,1752,
  51,-351,1571,69,-222,1398,102,93,1219,97,144,782,29,143,387,-91,62,417,62,110,272,109,122,235,
  111,-92,1215,130,-151,789,20,-167,399,-105,-112,420,57,-146,276,104,-148,227,199,4,2042,158,13,
  1798,101,-9,1579,39,-1,1304,115,188,1774,8,328,1567,31,209,1392,156,-221,1748,47,-350,1567,69,
  -222,1394,102,93,1212,90,144,775,27,143,379,-86,56,405,68,116,266,117,132,231,110,-92,1210,121,
  -153,783,19,-167,388,-102,-108,406,67,-150,271,115,-152,223,196,4,2031,156,13,1787,100,-10,1568,
  38,-1,1293,114,188,1762,9,328,1554,32,209,1379,153,-221,1738,44,-350,1556,67,-222,1383,102,92,
  1199,83,145,763,27,144,365,-80,53,388,76,120,254,124,139,221,109,-93,1198,114,-156,772,18,-167,
  372,-96,-104,387,77,-153,260,125,-158,212,193,4,2013,154,13,1770,99,-9,1550,37,-2,1274,113,189,
  1744,9,328,1536,32,209,1361,149,-221,1721,40,-349,1539,65,-222,1366,100,91,1180,75,146,745,27,
  146,345,-76,54,365,83,123,236,132,144,205,108,-93,1180,106,-160,754,18,-169,350,-89,-101,363,85,
  -158,241,136,-164,196,191,4,1989,150,11,1746,97,-9,1526,35,-2,1250,113,189,1720,10,329,1511,31,
  209,1337,146,-221,1697,36,-349,1516,63,-222,1342,99,90,1155,67,146,721,27,148,319,-73,57,337,90,
  127,213,140,148,182,105,-94,1156,98,-162,731,19,-171,324,-81,-101,335,94,-162,217,146,-172,175,
  189,5,1959,148,10,1716,96,-9,1495,33,-3,1220,113,189,1689,10,330,1481,30,209,1307,143,-221,1667,
  31,-348,1487,59,-222,1313,97,89,1125,61,147,690,26,151,288,-69,61,302,95,133,183,145,154,154,
  103,-95,1126,92,-165,703,22,-174,292,-74,-103,301,104,-166,189,157,-177,148,188,5,1921,147,10,
  1679,95,-9,1459,30,-3,1184,113,189,1652,10,330,1444,28,209,1270,140,-221,1631,26,-348,1451,55,
  -222,1277,94,88,1087,57,148,653,26,155,252,-68,66,263,96,140,147,146,162,119,99,-97,1090,86,
  -169,668,24,-177,256,-68,-106,262,113,-169,155,168,-180,117,186,4,1878,146,11,1636,92,-9,1415,
  26,-4,1141,113,190,1609,11,331,1401,26,208,1227,136,-221,1587,20,-347,1409,50,-222,1235,89,87,
  1044,58,150,611,24,159,211,-70,71,222,90,148,103,140,171,74,95,-98,1048,84,-174,628,26,-180,213,
  -63,-107,219,118,-174,115,173,-186,78,186,5,1828,146,11,1586,90,-8,1366,20,-5,1093,114,190,1558,
  11,332,1351,23,208,1178,133,-220,1537,15,-347,1362,44,-223,1186,83,85,994,66,152,562,22,163,164,
  -75,75,180,78,153,52,125,176,20,88,-99,1000,87,-178,580,27,-182,167,-60,-105,174,116,-180,66,
  169,-195,28,186,5,1771,146,11,1529,88,-8,1310,11,-6,1037,115,191,1502,11,333,1295,19,208,1123,
  132,-220,1481,11,-348,1309,36,-225,1132,74,84,938,83,154,510,18,164,117,-93,78,135,59,151,5,102,
  169,-1,79,-101,944,98,-182,527,27,-186,117,-64,-109,127,106,-181,13,158,-196,-8,187,5,1708,146,
  11,1466,85,-8,1247,0,-7,978,116,191,1439,11,334,1235,13,207,1065,130,-219,1420,7,-349,1250,29,
  -225,1074,62,83,878,107,155,456,-9,158,80,-142,71,65,43,146,-1,91,163,3,69,-101,884,117,-186,
  471,6,-187,70,-108,-113,52,94,-177,6,153,-186,-1,188,4,1646,147,11,1401,80,-9,1184,-14,-7,918,
  116,190,1376,7,333,1174,6,207,1003,130,-220,1356,4,-349,1189,22,-225,1013,49,84,816,123,157,406,
  -20,157,59,-162,73,23,37,147,0,91,164,4,53,-102,822,139,-187,423,-1,-185,44,-131,-118,1,83,-174,
  9,147,-180,6,192,4,1590,149,11,1342,75,-9,1127,-28,-5,864,117,191,1316,2,330,1116,-2,207,943,
  128,-221,1296,1,-347,1129,15,-223,952,36,84,758,129,157,362,-26,149,49,-172,72,-2,28,143,2,84,
  161,9,38,-104,766,157,-189,387,1,-179,36,-135,-112,-11,75,-171,10,141,-180,9,197,4,1542,153,12,
  1294,71,-10,1081,-39,-5,820,117,191,1267,-3,328,1068,-11,208,893,128,-221,1246,-2,-343,1078,9,
  -221,900,22,85,712,157,153,339,-20,146,52,-179,70,1,22,143,2,78,161,7,26,-103,721,192,-183,372,
  12,-176,41,-136,-110,-6,74,-174,10,140,-183,5,203,3,1500,155,12,1253,67,-9,1043,-48,-6,784,119,
  192,1228,-6,328,1031,-22,208,857,130,-221,1206,-4,-342,1040,2,-220,861,12,86,677,182,154,330,-9,
  145,54,-175,68,5,24,142,1,81,162,5,19,-103,685,216,-175,364,22,-172,42,-135,-110,-4,76,-173,10,
  142,-182,3,210,3,1465,157,12,1219,64,-8,1011,-54,-8,754,120,192,1197,-10,329,1003,-29,207,830,
  133,-220,1173,-5,-345,1012,-4,-222,833,6,85,648,192,158,316,-5,145,54,-175,67,5,24,142,1,80,162,
  5,14,-104,656,231,-164,348,27,-167,43,-135,-109,-4,76,-171,10,142,-182,3,217,1,1435,158,12,1189,
  63,-9,983,-59,-9,728,120,192,1169,-14,329,979,-35,205,807,136,-220,1146,-4,-347,988,-7,-225,810,
  1,84,623,199,162,302,-3,147,55,-176,67,5,24,142,1,80,162,5,10,-105,630,243,-156,338,32,-164,43,
  -135,-109,-4,76,-171,10,143,-181,3,223,1,1407,159,13,1164,62,-9,958,-63,-10,705,119,192,1144,
  -18,328,955,-39,205,783,140,-220,1120,-2,-348,966,-9,-225,787,-4,83,600,208,165,295,1,147,56,
  -174,66,7,25,142,1,81,162,5,7,-105,606,254,-150,329,35,-161,44,-134,-108,-3,77,-170,10,143,-181,
  3,227,0,1382,160,13,1139,61,-10,934,-66,-10,683,119,192,1120,-22,327,932,-44,205,760,143,-219,
  1096,1,-348,942,-8,-225,765,-8,84,578,216,166,289,5,146,58,-173,64,9,25,142,2,82,162,4,5,-104,
  584,262,-145,323,39,-159,46,-133,-108,-1,78,-170,11,144,-181,2,232,-1,1359,162,14,1116,60,-11,
  913,-70,-11,664,118,192,1097,-24,326,910,-49,203,738,147,-219,1073,5,-348,920,-8,-225,743,-12,
  85,559,222,167,283,7,146,60,-172,63,10,26,141,1,82,162,4,2,-104,564,268,-141,317,41,-156,46,
  -132,-107,-1,78,-169,11,144,-180,2,237,-2,1338,165,15,1096,60,-11,895,-73,-12,646,118,192,1077,
  -26,325,891,-54,202,719,152,-218,1052,10,-349,899,-8,-225,722,-16,85,542,226,167,278,9,146,60,
  -172,62,11,26,141,1,82,162,4,-2,-104,545,271,-137,312,42,-155,47,-133,-106,-2,78,-169,11,144,
  -180,2,242,-3,1319,167,16,1078,59,-12,878,-76,-12,632,120,192,1060,-27,324,875,-56,202,704,157,
  -218,1033,15,-350,881,-9,-226,705,-20,84,528,229,166,275,11,146,60,-171,62,12,26,142,1,82,162,4,
  -5,-105,530,274,-135,308,43,-154,47,-133,-106,-2,78,-168,11,144,-180,2
];
var S46_IX = (function () { var o = {}; S46_J.forEach(function (n, i) { o[n] = i; }); return o; })();

/* joint n at time t seconds into the window, in metres */
function s46(n, t) {
  var i = S46_IX[n], f = Math.max(0, Math.min(S46_N - 1, t * S46_RATE));
  var a = Math.floor(f), u = f - a, b = Math.min(S46_N - 1, a + 1);
  var ia = (a * S46_J.length + i) * 3, ib = (b * S46_J.length + i) * 3;
  return [(S46_P[ia]     + (S46_P[ib]     - S46_P[ia])     * u) / 1000,
          (S46_P[ia + 1] + (S46_P[ib + 1] - S46_P[ia + 1]) * u) / 1000,
          (S46_P[ia + 2] + (S46_P[ib + 2] - S46_P[ia + 2]) * u) / 1000];
}

/* ---- the shared 3D layer, same as the Forces deck ---- */
function view3(az, tilt, S, cx, cy) {
  var ca = Math.cos(az), sa = Math.sin(az), ct = Math.cos(tilt), st = Math.sin(tilt);
  return function (x, y, z) {
    var u = x * ca - y * sa, v = x * sa + y * ca;
    return { x: cx + u * S, y: cy + (v * st - z * ct) * S, d: v };
  };
}
var S46_LINKS = [
  ['head', 'neck', 'c'], ['neck', 'trunk', 'c'], ['trunk', 'pelvis', 'c'],
  ['neck', 'shL', 'l'], ['shL', 'elL', 'l'], ['elL', 'wrL', 'l'],
  ['neck', 'shR', 'r'], ['shR', 'elR', 'r'], ['elR', 'wrR', 'r'],
  ['pelvis', 'hipL', 'l'], ['hipL', 'kneeL', 'l'], ['kneeL', 'ankL', 'l'],
  ['ankL', 'heelL', 'l'], ['heelL', 'mtL', 'l'], ['mtL', 'toeL', 'l'], ['ankL', 'mtL', 'l'],
  ['pelvis', 'hipR', 'r'], ['hipR', 'kneeR', 'r'], ['kneeR', 'ankR', 'r'],
  ['ankR', 'heelR', 'r'], ['heelR', 'mtR', 'r'], ['mtR', 'toeR', 'r'], ['ankR', 'mtR', 'r']
];
function s46Draw(c, P, t, o) {
  o = o || {};
  var K = C();
  var col = { c: o.mid || K.INK, l: o.left || K.SOFT, r: o.right || K.MUT };
  var w = o.w || 5, i;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  c.globalAlpha = o.alpha == null ? 1 : o.alpha;
  /* far side, then the trunk, then the near side on top */
  ['l', 'c', 'r'].forEach(function (side) {
    c.strokeStyle = col[side];
    c.lineWidth = side === 'r' ? w : w * 0.82;
    for (i = 0; i < S46_LINKS.length; i++) {
      var s = S46_LINKS[i];
      if (s[2] !== side) continue;
      var a = s46(s[0], t), b = s46(s[1], t);
      var A = P(a[0], a[1], a[2]), B = P(b[0], b[1], b[2]);
      c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
    }
  });
  var h = s46('head', t), n2 = s46('neck', t);
  var H = P(h[0], h[1], h[2]), N2 = P(n2[0], n2[1], n2[2]);
  var r = Math.max(4, Math.hypot(H.x - N2.x, H.y - N2.y) * 0.46);
  c.fillStyle = col.c;
  c.beginPath(); c.arc(H.x, H.y, r, 0, 7); c.fill();
  c.restore();
}
function s46Floor(c, P, K, half, step) {
  var i;
  c.save(); c.strokeStyle = K.SOFT; c.globalAlpha = 0.4; c.lineWidth = 1;
  for (i = -3; i <= 3; i++) {
    var a = P(i * step, -half, 0), b = P(i * step, half, 0);
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    var e = P(-3 * step, i * step, 0), f2 = P(3 * step, i * step, 0);
    c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(f2.x, f2.y); c.stroke();
  }
  c.restore();
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
   THE MEASURED JUMP, AND ITS KINEMATICS

   The worked example above takes the area of each phase and stops at the
   take-off velocity. That is only the first integral. Do it again and you
   have the centre of mass through the whole movement — which is the thing
   a coach actually asks about, and the thing a force plate alone is
   usually assumed not to give you.

   Two claims are worth making on this figure and both are checkable:

     1. the dip is 35 cm, and an INDEPENDENT measurement — 83 markers at
        90 Hz, a twelve-segment centre of mass — puts it in the same place
        to about 16 mm
     2. the jump height from the take-off velocity (25.9 cm) matches the
        height from the flight time (25.2 cm), and those two numbers come
        from different parts of the record
   ============================================================ */
D.register('jumpkin', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 660 : 560,
                            padl: 82, padr: 30, padt: 22, padb: 52 });
  var out = readout(u.ctl);
  var show = d.show || 'all';                 /* all · f · fv */
  var overlay = d.overlay !== '0';
  var cur = J46.tTo, playing = false, raf = null, last = 0;
  var DUR = J46K.dur;

  /* Three bands carved out of one canvas by moving pt/pb. They must not
     overlap or the two sets of axis numbers interleave. */
  var P = [{ pt: 22, pb: 396 }, { pt: 200, pb: 218 }, { pt: 378, pb: 52 }];

  function phaseAt(t) {
    if (t < J46.tOnset) return { k: 'stand', n: 'quiet standing' };
    if (t < J46.tBottom) return { k: 'unw', n: 'unweighting — the body is falling' };
    if (t < J46.tTo) return { k: 'push', n: 'braking, then propulsion' };
    if (t < J46.tLand) return { k: 'fly', n: 'flight — the plate reads zero' };
    return { k: 'land', n: 'landing' };
  }

  function band(i, cb) { ax.pt = P[i].pt; ax.pb = P[i].pb; cb(); }

  function draw() {
    var c = ax.c, K = C(), i, t, r;
    ax.clear();
    var now = J46K.at(cur);
    var nTo = Math.round(J46.tTo * J46.rate);

    /* shade the phases identically on every panel */
    function shade() {
      [[0, J46.tOnset, K.PANEL, 0.22],
       [J46.tOnset, J46.tBottom, 'rgba(248,113,113,0.13)', 1],
       [J46.tBottom, J46.tTo, 'rgba(74,222,128,0.13)', 1],
       [J46.tTo, J46.tLand, 'rgba(56,189,248,0.12)', 1]].forEach(function (b) {
        c.save(); c.globalAlpha = b[3]; c.fillStyle = b[2];
        c.fillRect(ax.X(b[0]), ax.pt, ax.X(b[1]) - ax.X(b[0]), ax.Y(ax.ymin) - ax.pt);
        c.restore();
      });
    }
    function cursor() {
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2;
      c.beginPath(); c.moveTo(ax.X(cur), ax.pt); c.lineTo(ax.X(cur), ax.Y(ax.ymin));
      c.stroke(); c.restore();
    }

    /* ---------------- 1. the measured force ---------------- */
    band(0, function () {
      /* tall enough for the LANDING spike, not just the push-off: 3.8 body
         weights against 2.1, which is the whole argument for landing softly */
      var HI = 2450;
      ax.setRange(0, DUR, 0, HI);
      shade();
      ax.frame({ grid: true, xticks: [0, 0.4, 0.8, 1.2, 1.6],
                 yticks: [0, 600, 1200, 1800, 2400],
                 ylabel: 'Force (N)', ysize: 12, ylabelx: 13,
                 xfmt: function (q) { return q.toFixed(1); },
                 yfmt: function (q) { return q.toFixed(0); } });
      ax.poly([[0, J46.bw], [DUR, J46.bw]], { color: K.MUT, width: 1.3, dash: [5, 4] });
      label(c, 'body weight ' + fmt(J46.bw, 0) + ' N', ax.X(0) + 8, ax.Y(J46.bw) - 12,
            { color: K.MUT, size: 11, align: 'left', plate: true });
      var pts = [];
      for (i = 0; i < J46K.n; i++) pts.push([J46K.tAt(i), J46.FZ[i]]);
      ax.poly(pts, { color: K.BLUE, width: 2.2 });
      /* name both peaks — the comparison is the point of the panel */
      var iP = 0, iL = 0, k2;
      for (k2 = 0; k2 < nTo; k2++) if (J46.FZ[k2] > J46.FZ[iP]) iP = k2;
      for (k2 = Math.round(J46.tLand * J46.rate); k2 < J46K.n; k2++) if (J46.FZ[k2] > J46.FZ[iL]) iL = k2;
      label(c, 'push-off ' + fmt(J46.FZ[iP] / J46.bw, 2) + ' BW',
            ax.X(J46K.tAt(iP)), ax.Y(J46.FZ[iP]) - 13,
            { color: K.GRN, size: 11.5, align: 'center', plate: true });
      label(c, 'landing ' + fmt(J46.FZ[iL] / J46.bw, 2) + ' BW',
            ax.X(J46K.tAt(iL)), ax.Y(J46.FZ[iL]) - 13,
            { color: K.ACC, size: 11.5, align: 'center', plate: true });
      ax.dots([[cur, now.f]], { color: K.ACC, r: 5 });
      cursor();
      label(c, 'measured', ax.X(0) + 8, ax.pt + 12,
            { color: K.BLUE, size: 11.5, align: 'left' });
    });

    /* ---------------- 2. integrate once: velocity ---------------- */
    band(1, function () {
      var LO = -1.6, HI = 2.6;
      ax.setRange(0, DUR, LO, HI);
      shade();
      ax.frame({ grid: true, xticks: [0, 0.4, 0.8, 1.2, 1.6],
                 yticks: [-1, 0, 1, 2], zero: true,
                 ylabel: 'Velocity (m/s)', ysize: 12, ylabelx: 13,
                 xfmt: function (q) { return q.toFixed(1); },
                 yfmt: function (q) { return num(q, 0); } });
      var pts = [];
      for (i = 0; i < J46K.n; i++) pts.push([J46K.tAt(i), J46K.v[i]]);
      ax.poly(pts, { color: K.GRN, width: 2.2 });
      ax.dots([[J46.tTo, J46K.v[nTo]]], { color: K.ORG, r: 5 });
      label(c, 'take-off ' + fmt(J46K.v[nTo], 2) + ' m/s', ax.X(J46.tTo) - 8, ax.Y(J46K.v[nTo]) - 13,
            { color: K.ORG, size: 12, align: 'right', plate: true });
      ax.dots([[cur, now.v]], { color: K.ACC, r: 5 });
      cursor();
      label(c, '∫ (F − mg)/m dt', ax.X(DUR) - 6, ax.pt + 12,
            { color: K.GRN, size: 11.5, align: 'right' });
    });

    /* ---------------- 3. and again: displacement ---------------- */
    band(2, function () {
      var LO = -0.45, HI = 0.32;
      ax.setRange(0, DUR, LO, HI);
      shade();
      ax.frame({ grid: true, xticks: [0, 0.4, 0.8, 1.2, 1.6],
                 yticks: [-0.4, -0.2, 0, 0.2], zero: true,
                 xlabel: 'Time (s)',
                 ylabel: 'CoM (m)', ysize: 12, ylabelx: 13,
                 xfmt: function (q) { return q.toFixed(1); },
                 yfmt: function (q) { return num(q, 1); } });
      var pts = [], mk = [];
      for (i = 0; i < J46K.n; i++) {
        pts.push([J46K.tAt(i), J46K.s[i]]);
        mk.push([J46K.tAt(i), J46.COM[i] / 1000]);
      }
      if (overlay) ax.poly(mk, { color: K.ORG, width: 3.2, dash: [6, 5] });
      ax.poly(pts, { color: K.VIO, width: 2.2 });
      var iBot = Math.round(J46.tBottom * J46.rate);
      ax.dots([[J46.tBottom, J46K.s[iBot]]], { color: K.VIO, r: 5 });
      label(c, 'lowest ' + num(J46K.s[iBot], 2) + ' m', ax.X(J46.tBottom), ax.Y(J46K.s[iBot]) + 16,
            { color: K.VIO, size: 12, align: 'center', plate: true });
      ax.dots([[cur, now.s]], { color: K.ACC, r: 5 });
      cursor();
      if (overlay) {
        key(c, ax.X(DUR) - 232, ax.pt + 6,
            [[K.VIO, 'from the force plate, integrated twice'],
             [K.ORG, 'from 83 markers, measured directly']], { size: 11 });
      }
    });

    var ph = phaseAt(cur);
    out.innerHTML = '<b>' + ph.n + '</b>  ·  F ' + fmt(now.f, 0) + ' N  ·  v ' +
      num(now.v, 2) + ' m/s  ·  CoM ' + num(now.s, 2) + ' m' +
      '<span style="opacity:.72">  ·  ' + J46.subject + ', ' + fmt(J46.mass, 1) +
      ' kg, measured on two force plates</span>';
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    cur += dt * 0.45;
    if (cur >= DUR) { cur = DUR; sT.quiet(cur); draw(); stop(); return; }
    sT.quiet(cur); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (playing) return;
    if (cur >= DUR - 1e-6) cur = 0;
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  }

  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () { playing ? stop() : start(); });
  var sT = slider(row, 'Through the jump', 0, DUR, 0.005, cur,
    function (q) { return fmt(q, 2) + ' s'; },
    function (q) { stop(); cur = q; draw(); });

  node._draw = draw; node._stop = stop;
  draw();
});


/* ============================================================
   HOW HIGH DID HE JUMP — TWICE, FROM DIFFERENT PARTS OF THE RECORD

   Impulse–momentum gives the take-off velocity and therefore the height.
   Flight time gives the height without ever mentioning force. They are
   independent, and on this trial they agree to seven millimetres, which is
   the best argument in the lecture that any of this is true.
   ============================================================ */
D.register('jumpcheck', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 880, h: port ? 470 : 420,
                            padl: 40, padr: 40, padt: 26, padb: 40, fluid: false });
  var out = readout(u.ctl);
  var G2 = 9.81;
  var nTo = Math.round(J46.tTo * J46.rate);
  var vto = J46K.v[nTo];
  var hV = vto * vto / (2 * G2);
  var hT = G2 * J46.flight * J46.flight / 8;
  var route = 'both';

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var colL = K.GRN, colR = K.BLUE;

    /* two columns of working, side by side */
    var xl = W * 0.26, xr = W * 0.74, y = 46;
    label(c, 'FROM THE FORCE PLATE', xl, y, { color: colL, size: 13, align: 'center' });
    label(c, 'FROM THE FLIGHT TIME', xr, y, { color: colR, size: 13, align: 'center' });
    label(c, 'impulse → velocity → height', xl, y + 22,
          { color: K.MUT, size: 11.5, align: 'center' });
    label(c, 'the plate reads zero for ' + fmt(J46.flight, 3) + ' s', xr, y + 22,
          { color: K.MUT, size: 11.5, align: 'center' });

    var L = [
      '∫(F − mg) dt = m·v',
      'v = ' + fmt(vto, 3) + ' m/s',
      'h = v² / 2g',
      'h = ' + fmt(vto, 3) + '² / (2 × 9.81)'
    ];
    var R = [
      'tₑᵢᵣ = ' + fmt(J46.flight, 3) + ' s',
      'up and down are equal,',
      'h = g·tₑᵢᵣ² / 8',
      'h = 9.81 × ' + fmt(J46.flight, 3) + '² / 8'
    ];
    L.forEach(function (s, i) {
      label(c, s, xl, y + 58 + i * 30, { color: K.INK, size: 15, align: 'center',
        weight: i % 2 ? '700' : '600' });
    });
    R.forEach(function (s, i) {
      label(c, s, xr, y + 58 + i * 30, { color: K.INK, size: 15, align: 'center',
        weight: i % 2 ? '700' : '600' });
    });

    label(c, fmt(100 * hV, 1) + ' cm', xl, y + 206, { color: colL, size: 34, align: 'center' });
    label(c, fmt(100 * hT, 1) + ' cm', xr, y + 206, { color: colR, size: 34, align: 'center' });

    /* the two heights drawn as columns, so the gap is a picture not a number */
    /* the two heights as columns, close together and centred, so the gap
       between them is something you look at rather than read */
    var gy = H - 34, top = y + 250, PPM = (gy - top) / 0.30;
    var cxL = W / 2 - 62, cxR = W / 2 + 62;
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 1.2; c.globalAlpha = .6;
    c.beginPath(); c.moveTo(cxL - 78, gy); c.lineTo(cxR + 78, gy); c.stroke(); c.restore();
    [[cxL, hV, colL], [cxR, hT, colR]].forEach(function (b) {
      c.save(); c.strokeStyle = b[2]; c.globalAlpha = .24; c.lineWidth = 44;
      c.beginPath(); c.moveTo(b[0], gy); c.lineTo(b[0], gy - b[1] * PPM); c.stroke();
      c.globalAlpha = 1; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(b[0] - 30, gy - b[1] * PPM); c.lineTo(b[0] + 30, gy - b[1] * PPM);
      c.stroke(); c.restore();
    });
    var gap = Math.abs(hV - hT);
    label(c, 'they differ by ' + fmt(1000 * gap, 0) + ' mm  (' +
             fmt(100 * gap / hT, 1) + '%)', W / 2, gy - hV * PPM - 34,
          { color: K.ORG, size: 15, align: 'center', plate: true });

    out.innerHTML = 'Two measurements, sharing nothing but the same jump: <b>' +
      fmt(100 * hV, 1) + ' cm</b> and <b>' + fmt(100 * hT, 1) + ' cm</b>' +
      '<span style="opacity:.72">  ·  the force route never uses the flight time, and the ' +
      'flight-time route never uses the force</span>';
  }
  node._draw = draw;
  draw();
});

/* ============================================================
   THE MEASURED JUMP IN THREE DIMENSIONS

   The same trial again, this time as the skeleton the markers actually
   describe. Drag it to turn it. Nothing here is drawn by hand: every
   joint is a measured position, the floor is where the floor was, and the
   force trace beside it is the plate the feet are standing on.
   ============================================================ */
D.register('jump3d', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 920, h: port ? 620 : 480,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var DUR = (S46_N - 1) / S46_RATE;
  var tt = J46.tBottom, playing = false, raf = null, last = 0;
  var st = { az: d.az ? parseFloat(d.az) : -0.62, tilt: d.tilt ? parseFloat(d.tilt) : 0.26 };
  var trail = d.trail !== '0';

  function phaseAt(t) {
    if (t < J46.tOnset) return ['standing', C().MUT];
    if (t < J46.tBottom) return ['countermovement — eccentric', C().ACC];
    if (t < J46.tTo) return ['propulsion — concentric', C().GRN];
    if (t < J46.tLand) return ['flight — only gravity', C().BLUE];
    return ['landing — eccentric', C().ACC];
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H, i;
    ax.clear();
    var now = J46K.at(tt), ph = phaseAt(tt);

    /* ---------------- the figure ---------------- */
    var LW = port ? W : W * 0.60;
    var S = (port ? H * 0.42 : H - 96) / 2.35;          /* px per metre */
    var cx = LW * 0.46, cy = H - (port ? H * 0.46 : 78);
    var P = view3(st.az, st.tilt, S, cx, cy);
    s46Floor(c, P, K, 0.85, 0.30);
    s46Draw(c, P, tt, { w: 5.4, mid: K.INK, right: K.INK, left: K.SOFT });

    /* the height his centre of mass has reached, as a rail beside him */
    var railX = LW - (port ? 40 : 54);
    var gy = cy, topY = cy - 0.60 * S;
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(railX, gy); c.lineTo(railX, topY); c.stroke(); c.restore();
    var hy = gy - (now.s - J46.dip) / (0.60 - J46.dip) * (gy - topY);
    c.save(); c.fillStyle = K.VIO; c.beginPath(); c.arc(railX, hy, 6, 0, 7); c.fill(); c.restore();
    label(c, num(now.s, 2) + ' m', railX - 10, hy,
          { color: K.VIO, size: 12, align: 'right', plate: true });
    label(c, 'CoM', railX, topY - 14, { color: K.MUT, size: 11, align: 'center' });

    label(c, 'drag to turn', 12, H - 14, { color: K.MUT, size: 11.5, align: 'left' });
    label(c, ph[0], LW / 2, 22, { color: ph[1], size: 15, align: 'center' });

    if (port) { paintTrace(c, K, 12, H - 150, W - 24, 104, now); }
    else { paintTrace(c, K, LW + 14, 54, W - LW - 40, H - 150, now); }

    out.innerHTML = 'F <b>' + fmt(now.f, 0) + ' N</b> · v <b>' + num(now.v, 2) +
      ' m/s</b> · CoM <b>' + num(now.s, 2) + ' m</b>' +
      '<span style="opacity:.72">  ·  ' + J46.subject + ', 83 markers at 90 Hz and two ' +
      'force plates at 450 Hz, on one clock</span>';
  }

  /* the force record, drawn in raw pixels beside the figure */
  function paintTrace(c, K, x0, y0, w, h, now) {
    var FMAX = 2450, i;
    function TX(t) { return x0 + w * (t / DUR); }
    function TY(f) { return y0 + h * (1 - f / FMAX); }
    c.save();
    c.strokeStyle = K.PANEL; c.lineWidth = 1;
    c.strokeRect(x0 + .5, y0 + .5, w, h);
    c.setLineDash([4, 4]); c.strokeStyle = K.MUT; c.globalAlpha = .7;
    c.beginPath(); c.moveTo(x0, TY(J46.bw)); c.lineTo(x0 + w, TY(J46.bw)); c.stroke();
    c.restore();
    label(c, 'body weight', x0 + 6, TY(J46.bw) - 10, { color: K.MUT, size: 10.5, align: 'left' });
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 2; c.beginPath();
    for (i = 0; i < J46K.n; i++) {
      var t = J46K.tAt(i); if (t > DUR) break;
      var px = TX(t), py = TY(J46.FZ[i]);
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2;
    c.beginPath(); c.moveTo(TX(tt), y0); c.lineTo(TX(tt), y0 + h); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.ACC; c.beginPath();
    c.arc(TX(tt), TY(now.f), 4.5, 0, 7); c.fill(); c.restore();
    label(c, 'ground reaction force', x0 + w / 2, y0 - 12,
          { color: K.INK, size: 12, align: 'center' });
    label(c, '0', x0 - 6, TY(0), { color: K.MUT, size: 10.5, align: 'right' });
    label(c, '2400 N', x0 - 6, TY(2400), { color: K.MUT, size: 10.5, align: 'right' });
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    tt += dt * 0.40;
    if (tt >= DUR) { tt = DUR; sT.quiet(tt); draw(); stop(); return; }
    sT.quiet(tt); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (playing) return;
    if (tt >= DUR - 1e-6) tt = 0;
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  }

  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () { playing ? stop() : start(); });
  var sT = slider(row, 'Through the jump', 0, DUR, 0.005, tt,
    function (q) { return fmt(q, 2) + ' s'; },
    function (q) { stop(); tt = q; draw(); });
  /* these choose the camera, not the height of anything, so the prewarm
     sweep must not be allowed to leave one of them pressed */
  keepOut(seg(row, [['side', 'from the side'], ['front', 'from the front'],
                    ['iso', 'three-quarter']], 'iso', function (w) {
    /* view3 maps screen-x to x.cos(az) - y.sin(az), and +x is the way he
       faces. So az = 0 looks along his left-right axis - that is the SIDE
       view - and az = -pi/2 puts his left-right axis across the screen,
       which is the front. Getting these the wrong way round is easy. */
    st.az = w === 'side' ? 0 : (w === 'front' ? -1.57 : -0.62);
    st.tilt = w === 'iso' ? 0.26 : 0.12; draw();
  }));

  dragRotate(u.cv, st, draw);
  node._draw = draw; node._stop = stop;
  draw();
});

D.boot();

})();
