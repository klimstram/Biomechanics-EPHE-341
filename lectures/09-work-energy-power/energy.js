/* ============================================================
   EPHE 341 — Work, Energy & Power
   Interactive figures. Needs deck-core.js. No other dependencies.

   The jump figures are built on the SAME synthesised force record as
   Linear Kinetics II (m = 66.6 kg, phase impulses −86.6, +204.1, −15.0 N·s),
   so the take-off velocity a student reads here is the one they computed
   from impulse a lecture earlier. Displacement comes from integrating that
   record twice, which is what makes the force–displacement area exactly
   equal to the kinetic energy at take-off rather than approximately so.
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

/* a stick figure, drawn in raw canvas pixels.
   crouch 0 = standing tall, 1 = deep countermovement; arms swing with it. */
function figure(c, x, groundY, scale, crouch, o) {
  o = o || {};
  var col = o.color || C().INK, lw = o.width || 3.2;
  var k = Math.max(0, Math.min(1, crouch));
  var legs  = scale * (0.44 - 0.19 * k);          /* hip height above ground */
  var torso = scale * 0.34, head = scale * 0.068;
  var hipY  = groundY - legs, shY = hipY - torso * (1 - 0.10 * k);
  var lean  = scale * 0.09 * k;                   /* the trunk tips forward  */
  c.save();
  c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';

  /* legs: hip → knee → foot, the knee driven forward by the crouch */
  var footW = scale * 0.085;
  [-1, 1].forEach(function (sd) {
    var kneeX = x + sd * footW * 0.75 + scale * (0.04 + 0.13 * k);
    var kneeY = hipY + (groundY - hipY) * 0.52;
    c.beginPath();
    c.moveTo(x + sd * scale * 0.03, hipY);
    c.lineTo(kneeX, kneeY);
    c.lineTo(x + sd * footW, groundY);
    c.stroke();
  });

  /* trunk */
  c.beginPath(); c.moveTo(x, hipY); c.lineTo(x + lean, shY); c.stroke();

  /* arms: shoulder → elbow → hand, as two straight segments. Drawing both to
     ONE endpoint with a curve is what made them read as loops. Overhead on
     the drive and in flight, swung back on the dip. */
  [-1, 1].forEach(function (sd) {
    var sx = x + lean + sd * scale * 0.035, sy = shY + scale * 0.02;
    var ex, ey, hx, hy;
    if (o.armsUp) {
      ex = sx + sd * scale * 0.10; ey = sy - scale * 0.16;
      hx = sx + sd * scale * 0.09; hy = sy - scale * 0.33;
    } else {
      ex = sx - scale * (0.06 + 0.13 * k) + sd * scale * 0.02;
      ey = sy + scale * (0.15 - 0.05 * k);
      hx = ex - scale * (0.05 + 0.15 * k);
      hy = ey + scale * (0.12 - 0.11 * k);
    }
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
  });

  /* head */
  c.beginPath(); c.arc(x + lean + scale * 0.015, shY - head * 1.35, head, 0, 7);
  c.fillStyle = col; c.fill();
  c.restore();
  return { hipY: hipY, shY: shY };
}

/* ============================================================
   THE JUMP RECORD — shared with Linear Kinetics II

   Same three phases, same published impulses, so the take-off velocity
   here (1.54 m/s) is the one the impulse lecture arrives at. Integrating
   the record twice gives velocity and displacement, and therefore a real
   force–DISPLACEMENT curve whose area is exactly the kinetic energy.
   ============================================================ */
var JUMP = (function () {
  var M0 = 66.6, BW0 = M0 * G;
  var TARGET = [-86.6, 204.1, -15.0];
  var Q  = 0.15;
  var P1 = [Q, 0.60];
  var P2 = [0.60, 1.00];
  var D3 = 3 * Math.abs(TARGET[2]) / BW0;
  var P3 = [P2[1], P2[1] + D3];
  var T0 = 0, T1 = P3[1];
  var A1 = 2 * TARGET[0] / (P1[1] - P1[0]);
  var A2 = 2 * TARGET[1] / (P2[1] - P2[0]);

  function excess(t) {                          /* F − body weight */
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

  /* integrate once for velocity and again for displacement, on a fine fixed
     grid so every widget reads the same table rather than re-integrating */
  var N = 2000, dt = (T1 - T0) / N;
  var tab = new Array(N + 1), v = 0, s = 0, i, t, a;
  for (i = 0; i <= N; i++) {
    t = T0 + i * dt;
    a = excess(t) / M0;
    if (i > 0) {
      var ap = excess(t - dt) / M0, vp = v;
      v += (a + ap) / 2 * dt;                     /* trapezoid on acceleration */
      s += (vp + v) / 2 * dt;                     /* and again on velocity     */
    }
    tab[i] = { t: t, f: excess(t), v: v, s: s };
  }
  function at(t) {
    var i = Math.max(0, Math.min(N, Math.round((t - T0) / dt)));
    return tab[i];
  }
  var smin = Infinity, smax = -Infinity;
  tab.forEach(function (r) { if (r.s < smin) smin = r.s; if (r.s > smax) smax = r.s; });

  return {
    m0: M0, bw0: BW0, t0: T0, t1: T1, dt: dt, n: N, tab: tab, at: at,
    excess: excess,
    force: function (t, m) { return Math.max(0, m * G + excess(t) * (m / M0)); },
    smin: smin, smax: smax,
    vto: tab[N].v,
    phases: [{ a: P1[0], b: P1[1], sign: -1, name: 'countermovement' },
             { a: P2[0], b: P2[1], sign:  1, name: 'propulsion' },
             { a: P3[0], b: P3[1], sign: -1, name: 'unloading' }]
  };
})();

/* ============================================================
   1. THE SIGN OF WORK
   His three panels — positive, zero, negative — are three positions of
   one dial. Turning it through 90° is the moment cos θ stops being a
   symbol and becomes the reason the sign flips.
   ============================================================ */
D.register('workangle', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  /* fluid:false — this figure is drawn in raw canvas pixels, not data
     coordinates, so it lays itself out from ax.W/ax.H instead of being
     rescaled. That caps it at its own width, so make that width most of a
     slide rather than leaving two hundred pixels of nothing either side. */
  var ax = new Axes(u.cv, { w: port ? 460 : 1020, h: port ? 380 : 360,
                            padl: 10, padr: 10, padt: 10, padb: 10, fluid: false });
  var out = readout(u.ctl);
  var th = 0, F = 140, dist = 3;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var W_J = F * dist * Math.cos(th * Math.PI / 180);
    var sign = W_J > 1 ? 1 : (W_J < -1 ? -1 : 0);
    var col = sign > 0 ? K.GRN : (sign < 0 ? K.ACC : K.MUT);

    /* ---- the block on its surface ---- */
    var gy = H * 0.56, x0 = W * 0.16, x1 = W * 0.84;
    var bw = W * 0.10, bh = H * 0.15;
    var bx = x0 + (x1 - x0) * 0.30;

    c.save();
    c.strokeStyle = K.MUT; c.lineWidth = 2; c.globalAlpha = .75;
    c.beginPath(); c.moveTo(x0 - 18, gy); c.lineTo(x1 + 18, gy); c.stroke();
    c.globalAlpha = 1; c.restore();

    c.save();
    c.fillStyle = K.FILL; c.strokeStyle = K.DEEP; c.lineWidth = 2;
    c.fillRect(bx - bw / 2, gy - bh, bw, bh);
    c.strokeRect(bx - bw / 2 + .5, gy - bh + .5, bw, bh);
    c.restore();

    /* ---- displacement, drawn under the surface so the arrows never meet ---- */
    var dy = gy + 38;
    arrow(c, bx, dy, bx + (x1 - x0) * 0.46, dy, { color: K.MUT, width: 2.4 });
    label(c, 'displacement  d = ' + fmt(dist, 1) + ' m',
          bx + (x1 - x0) * 0.23, dy + 20, { color: K.MUT, size: 14, align: 'center' });

    /* ---- the force, at θ to the displacement ---- */
    var cx = bx, cy = gy - bh / 2;
    var L = H * 0.38;
    var a = -th * Math.PI / 180;                   /* canvas y grows downward */
    var fx = cx + Math.cos(a) * L, fy = cy + Math.sin(a) * L;
    arrow(c, cx, cy, fx, fy, { color: col, width: 4 });
    /* a label at the end of its own ray lands on the arrowhead, so nudge it
       perpendicular; near vertical it goes to the side instead of above */
    var near90 = Math.abs(Math.cos(a)) < 0.30;
    label(c, 'F = ' + fmt(F, 0) + ' N',
          fx + (near90 ? 14 : Math.cos(a) * 16), fy + (near90 ? 4 : Math.sin(a) * 16 - 4),
          { color: col, size: 15, align: (!near90 && Math.cos(a) < -0.2) ? 'right' : 'left',
            plate: true });

    /* the angle arc, from the displacement direction round to the force */
    c.save();
    c.strokeStyle = K.MUT; c.lineWidth = 1.8; c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + L * 0.92, cy); c.stroke();
    c.setLineDash([]);
    c.beginPath();
    /* arc() sweeps from min to max, so going anticlockwise needs the negative
       angle as the SECOND argument, not the first */
    c.arc(cx, cy, L * 0.25, a, 0);
    c.stroke(); c.restore();
    var mid = a / 2;
    label(c, 'θ = ' + fmt(th, 0) + '°',
          cx + Math.cos(mid) * L * 0.50, cy + Math.sin(mid) * L * 0.50,
          { color: K.MUT, size: 14, align: 'center', plate: true });

    /* ---- the work bar: the whole range, with where we are on it ---- */
    var barY = H - 46, bx0 = W * 0.16, bx1 = W * 0.84, mx = (bx0 + bx1) / 2;
    var full = F * dist;
    c.save();
    c.fillStyle = K.PANEL; c.fillRect(bx0, barY - 11, bx1 - bx0, 22);
    var px = mx + (W_J / full) * (bx1 - bx0) / 2;
    c.fillStyle = col; c.globalAlpha = .55;
    c.fillRect(Math.min(mx, px), barY - 11, Math.abs(px - mx), 22);
    c.globalAlpha = 1;
    c.strokeStyle = K.INK; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(mx, barY - 15); c.lineTo(mx, barY + 15); c.stroke();
    c.restore();
    label(c, minus(fmt(-full, 0)) + ' J', bx0 - 8, barY, { color: K.MUT, size: 12, align: 'right' });
    label(c, '+' + fmt(full, 0) + ' J', bx1 + 8, barY, { color: K.MUT, size: 12, align: 'left' });

    /* the verdict sits BESIDE the bar, not above the figure: at θ = 90° the
       force arrow points straight up and a centred title is exactly where it
       lands */
    /* top LEFT, not centred: at θ = 90° the arrow points straight up through
       the middle of the canvas, and just above the bar is where the
       displacement caption already is */
    label(c, sign > 0 ? 'POSITIVE WORK' : (sign < 0 ? 'NEGATIVE WORK' : 'ZERO WORK'),
          W * 0.03, 20, { color: col, size: 16, align: 'left' });

    out.innerHTML = 'W = F·d·cosθ = ' + fmt(F, 0) + ' × ' + fmt(dist, 1) +
      ' × cos ' + fmt(th, 0) + '° = <b>' + num(W_J, 0) + ' J</b>' +
      '<span style="opacity:.7">  ·  cosθ = ' + num(Math.cos(th * Math.PI / 180), 2) + '</span>';
  }

  u.ctl.classList.add('g2');
  slider(u.ctl, 'Angle θ', 0, 180, 1, th, function (v) { return fmt(v, 0) + '°'; },
    function (v) { th = v; draw(); });
  slider(u.ctl, 'Force', 20, 400, 10, F, function (v) { return fmt(v, 0) + ' N'; },
    function (v) { F = v; draw(); });
  slider(u.ctl, 'Distance', 0.5, 6, 0.1, dist, function (v) { return fmt(v, 1) + ' m'; },
    function (v) { dist = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   2. KINETIC ENERGY GOES AS v²
   The curve with the athletes on it. Moving the mass slider shifts every
   marker at once, which is the fastest way to see that mass is the lesser
   of the two terms.
   ============================================================ */
var KEMARK = [
  { k: 'walk',   n: 'Walking',            m: 70,    v: 1.4  },
  { k: 'jog',    n: 'Jogging',            m: 70,    v: 2.8  },
  { k: 'sprint', n: 'Bolt at top speed',  m: 86,    v: 12.3 },
  { k: 'shot',   n: 'Shot put, released', m: 7.26,  v: 14   },
  { k: 'ball',   n: 'Fastball, released', m: 0.145, v: 45   }
];

D.register('kecurve', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 860, h: port ? 400 : 400,
                            padl: 82, padr: 24, padt: 26, padb: 52 });
  var out = readout(u.ctl);
  var m = 75, v = 6, pick = null;

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    var VMAX = 15;
    var KEmax = 0.5 * m * VMAX * VMAX;
    /* pad the top so the key has somewhere to sit that is not on the curve */
    var hi = KEmax * 1.30;
    ax.setRange(0, VMAX, 0, hi);
    ax.frame({ grid: true, xticks: axisTicks(0, VMAX), yticks: axisTicks(0, hi),
               xlabel: 'Velocity, v (m/s)', ylabel: 'Kinetic energy (J)',
               ysize: 14, ylabelx: 16,
               xfmt: function (q) { return q.toFixed(0); },
               yfmt: function (q) { return q >= 1000 ? (q / 1000).toFixed(1) + 'k' : q.toFixed(0); } });

    ax.fn(function (x) { return 0.5 * m * x * x; }, { color: K.BLUE, width: 2.6 });

    /* doubling v quadruples KE — drawn as two dropped lines, not asserted */
    var half = v / 2;
    [[half, K.MUT], [v, K.ACC]].forEach(function (p) {
      var e = 0.5 * m * p[0] * p[0];
      c.save(); c.strokeStyle = p[1]; c.globalAlpha = .5; c.lineWidth = 1.4;
      c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(ax.X(p[0]), ax.Y(0)); c.lineTo(ax.X(p[0]), ax.Y(e));
      c.lineTo(ax.X(0), ax.Y(e)); c.stroke(); c.restore();
    });
    ax.dots([[half, 0.5 * m * half * half]], { color: K.MUT, r: 5 });
    ax.dots([[v, 0.5 * m * v * v]], { color: K.ACC, r: 6.5 });

    /* the markers, recomputed for whatever mass is set (except the implements,
       which carry their own) */
    var off = [];
    KEMARK.forEach(function (q, qi) {
      var own = q.k === 'shot' || q.k === 'ball';
      var mm = own ? q.m : m;
      var e = 0.5 * mm * q.v * q.v;
      if (q.v > VMAX || e > hi) { off.push(q.n + ' (' + fmt(e, 0) + ' J)'); return; }
      ax.dots([[q.v, e]], { color: own ? K.ORG : K.GRN, r: 4.2 });
      /* keep the text inside the frame — measure it and clamp, rather than
         trusting the point not to be near an edge */
      c.save(); c.font = '700 12.5px ui-sans-serif,system-ui,sans-serif';
      var tw = c.measureText(q.n).width; c.restore();
      var lx = Math.min(Math.max(ax.X(q.v), ax.pl + tw / 2 + 4), ax.W - ax.pr - tw / 2 - 4);
      /* walking and jogging sit almost on top of each other at the origin, so
         the lower-energy one goes below its dot */
      /* walking and jogging are both a few joules off the origin, so they get
         stacked slots rather than being placed relative to their own dot */
      var dy = q.k === 'walk' ? -34 : -15;
      label(c, q.n, lx, ax.Y(e) + dy,
            { color: own ? K.ORG : K.GRN, size: 12.5, align: 'center', plate: true });
    });
    if (off.length) {
      label(c, 'off the scale: ' + off.join(', '), ax.W - ax.pr, ax.pt - 10,
            { color: K.MUT, size: 12, align: 'right' });
    }

    var kv = 0.5 * m * v * v, kh = 0.5 * m * half * half;
    key(c, ax.X(0) + 14, ax.pt + 6, [
      [K.BLUE, 'KE = ½·m·v²  at m = ' + fmt(m, 0) + ' kg'],
      [K.ORG,  'an implement, with its own mass']
    ], { size: 12.5 });

    out.innerHTML = 'at <b>' + fmt(half, 1) + ' m/s</b> → ' + fmt(kh, 0) + ' J' +
      ' · at <b>' + fmt(v, 1) + ' m/s</b> → <b>' + fmt(kv, 0) + ' J</b>' +
      '<span style="opacity:.7">  — twice the speed, ' +
      (kh > 0 ? fmt(kv / kh, 1) : '4.0') + '× the energy</span>';
  }

  /* no chip starts selected, and the sweep leaves them alone, so the printed
     still stays on the neutral 6 m/s frame rather than whichever chip fit.js
     pressed last */
  var lab = el('span', 'iseg-lab', 'set the speed:'); u.ctl.appendChild(lab);
  keepOut(chips(u.ctl, [['walk', 'walking'], ['jog', 'jogging'],
                ['sprint', 'sprinting']], '', function (k) {
    var q = KEMARK.filter(function (x) { return x.k === k; })[0];
    if (!q) return;
    v = q.v; if (k === 'sprint') { m = 86; sM.quiet(86); }
    sV.quiet(v); draw();
  }));
  u.ctl.classList.add('g2');
  var sM = slider(u.ctl, 'Mass', 5, 120, 1, m, function (q) { return fmt(q, 0) + ' kg'; },
    function (q) { m = q; draw(); });
  var sV = slider(u.ctl, 'Velocity', 0.5, 14, 0.1, v, function (q) { return fmt(q, 1) + ' m/s'; },
    function (q) { v = q; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   3. THE WORK–ENERGY THEOREM
   A runner accelerating. The area under force–displacement fills on the
   left and the kinetic-energy bar grows on the right, and the two numbers
   are the same number. Press play and watch them stay equal.
   ============================================================ */
D.register('wet', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 880, h: port ? 430 : 400,
                            padl: 78, padr: 150, padt: 26, padb: 52 });
  var out = readout(u.ctl);
  var m = 75, Fnet = 320, DMAX = 12;
  var pos = 4, playing = false, raf = null, last = 0;

  function vAt(x) { return Math.sqrt(2 * Fnet * x / m); }

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    var hi = Fnet * 1.5;
    ax.setRange(0, DMAX, 0, hi);
    ax.frame({ grid: true, xticks: axisTicks(0, DMAX), yticks: axisTicks(0, hi),
               xlabel: 'Displacement (m)', ylabel: 'Net force (N)',
               ysize: 14, ylabelx: 16,
               xfmt: function (q) { return q.toFixed(0); },
               yfmt: function (q) { return q.toFixed(0); } });

    /* the area so far IS the work so far */
    ax.rect(0, 0, pos, Fnet, { fill: K.FILL2 });
    ax.poly([[0, Fnet], [DMAX, Fnet]], { color: K.BLUE, width: 2.6 });
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2;
    c.beginPath(); c.moveTo(ax.X(pos), ax.Y(0)); c.lineTo(ax.X(pos), ax.Y(hi)); c.stroke();
    c.restore();

    var W = Fnet * pos, v = vAt(pos), KE = 0.5 * m * v * v;
    label(c, 'W = F·d = ' + fmt(W, 0) + ' J', ax.X(pos / 2), ax.Y(Fnet / 2),
          { color: K.INK, size: 15, align: 'center', plate: true });

    /* the KE column, in the right margin, on the same joule scale */
    var colX = ax.W - 96, colW = 46, base = ax.Y(0), topY = ax.pt + 16;
    var KEmax = Fnet * DMAX;
    var hpx = (base - topY) * Math.min(1, KE / KEmax);
    c.save();
    c.fillStyle = K.PANEL; c.fillRect(colX, topY, colW, base - topY);
    c.fillStyle = K.GRN; c.globalAlpha = .6;
    c.fillRect(colX, base - hpx, colW, hpx); c.globalAlpha = 1;
    c.strokeStyle = K.PANEL; c.lineWidth = 1;
    c.strokeRect(colX + .5, topY + .5, colW, base - topY);
    c.restore();
    label(c, 'KE', colX + colW / 2, topY - 12, { color: K.GRN, size: 13, align: 'center' });
    label(c, fmt(KE, 0) + ' J', colX + colW / 2, base - hpx - 12,
          { color: K.GRN, size: 13.5, align: 'center', plate: true });

    out.innerHTML = 'W<sub>net</sub> = <b>' + fmt(W, 0) + ' J</b> · ' +
      'ΔKE = ½(' + fmt(m, 0) + ')(' + fmt(v, 2) + ')² = <b>' + fmt(KE, 0) + ' J</b>' +
      '<span style="opacity:.7">  ·  v = ' + fmt(v, 2) + ' m/s after ' + fmt(pos, 1) + ' m</span>';
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    pos += dt * 3.2;
    /* clamp the value that is DRAWN, not only the one pushed to the slider —
       a widget that is right under its slider and wrong under its play button
       is this bug every time */
    if (pos >= DMAX) { pos = DMAX; sP.quiet(pos); draw(); stop(); return; }
    sP.quiet(pos); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (playing) return;
    if (pos >= DMAX - 1e-6) pos = 0;      /* rewind only once a run has finished */
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  }

  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () { playing ? stop() : start(); });
  var sP = slider(row, 'Distance run', 0, DMAX, 0.1, pos,
    function (q) { return fmt(q, 1) + ' m'; },
    function (q) { stop(); pos = q; draw(); });
  u.ctl.classList.add('g2');
  slider(u.ctl, 'Net force', 80, 700, 10, Fnet, function (q) { return fmt(q, 0) + ' N'; },
    function (q) { Fnet = q; draw(); });
  slider(u.ctl, 'Mass', 45, 110, 1, m, function (q) { return fmt(q, 0) + ' kg'; },
    function (q) { m = q; draw(); });

  node._draw = draw; node._stop = stop; node._start = null;
  draw();
});

/* ============================================================
   4. WHEN THE WORK IS DONE, AND HOW MUCH
   The slide's own caption says work is the area on a force–DISPLACEMENT
   curve and the force–time trace only tells us WHEN. So draw both, off
   the same record, under one cursor.

   The record is the one from Linear Kinetics II. Integrating it twice
   gives the displacement, so the area under the lower curve is exactly
   Δ(KE + PE) rather than approximately.
   ============================================================ */
D.register('jumpwork', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 560 : 470,
                            padl: 78, padr: 26, padt: 20, padb: 52 });
  var out = readout(u.ctl);
  var m = JUMP.m0, BW = m * G;
  var cur = JUMP.t1, playing = false, raf = null, last = 0;

  /* two bands in one canvas, carved out by moving pt/pb. They must not
     overlap or the two sets of axis numbers interleave. */
  var PA = { pt: 20, pb: 272 }, PB = { pt: 252, pb: 52 };

  function workTo(t) {                     /* ∫ F_grf · ds  = Δ(KE + PE) */
    var W = 0, i, a, b;
    for (i = 1; i <= JUMP.n; i++) {
      a = JUMP.tab[i - 1]; b = JUMP.tab[i];
      if (b.t > t) break;
      W += ((a.f + BW) + (b.f + BW)) / 2 * (b.s - a.s);
    }
    return W;
  }

  function draw() {
    var c = ax.c, K = C(), i, t, r;
    ax.clear();
    var now = JUMP.at(cur);

    /* ---------- upper panel: force against time ---------- */
    ax.pt = PA.pt; ax.pb = PA.pb;
    var FMAX = 1900;
    ax.setRange(JUMP.t0, JUMP.t1, 0, FMAX);
    ax.frame({ grid: true, xticks: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
               yticks: axisTicks(0, FMAX),
               ylabel: 'Ground reaction force (N)', ysize: 12, ylabelx: 13,
               xfmt: function (q) { return q.toFixed(1); },
               yfmt: function (q) { return q.toFixed(0); } });
    /* body weight is the line everything is read against */
    ax.poly([[JUMP.t0, BW], [JUMP.t1, BW]], { color: K.MUT, width: 1.4, dash: [5, 4] });
    label(c, 'body weight', ax.X(JUMP.t0) + 8, ax.Y(BW) - 12,
          { color: K.MUT, size: 11.5, align: 'left', plate: true });

    var seg = [];
    for (t = JUMP.t0; t <= cur + 1e-9; t += JUMP.dt * 4) seg.push([t, JUMP.force(t, m)]);
    if (seg.length > 1) fillTo(ax, seg, BW, K.FILL2);
    var all = [];
    for (t = JUMP.t0; t <= JUMP.t1; t += JUMP.dt * 4) all.push([t, JUMP.force(t, m)]);
    ax.poly(all, { color: K.BLUE, width: 2.4 });
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2;
    c.beginPath(); c.moveTo(ax.X(cur), ax.Y(0)); c.lineTo(ax.X(cur), ax.Y(FMAX)); c.stroke(); c.restore();
    /* the top panel cannot use frame()'s xlabel — it is drawn at a fixed
       H − 2 and would land under the lower panel */
    label(c, 'Time (s)', (ax.pl + ax.W - ax.pr) / 2, ax.H - PA.pb + 30,
          { color: K.INK, size: 13.5, align: 'center' });

    /* ---------- lower panel: the same force against displacement ---------- */
    ax.pt = PB.pt; ax.pb = PB.pb;
    var SLO = JUMP.smin * 1.06, SHI = 0.05;
    ax.setRange(SLO, SHI, 0, FMAX);
    ax.frame({ grid: true, xticks: axisTicks(SLO, SHI), yticks: axisTicks(0, FMAX),
               xlabel: 'Centre-of-mass displacement (m)',
               ylabel: 'GRF (N)', ysize: 12, ylabelx: 13,
               xfmt: function (q) { return q.toFixed(1); },
               yfmt: function (q) { return q.toFixed(0); } });

    /* The path doubles back on itself — the body goes down and then up — so
       drawing both branches shaded lays one on top of the other and neither
       area can be read. Ghost the whole loop, and shade only the branch the
       jumper is on right now, from where that branch began to the cursor.
       The bottom of the dip is where one hands over to the other. */
    var BOT = 0.785;                          /* v = 0: the turn */
    var goingUp = cur > BOT;
    var ghost = [], act = [], Wd = 0, Wu = 0;
    for (i = 4; i <= JUMP.n; i += 4) {
      var a2 = JUMP.tab[i - 4], b2 = JUMP.tab[i];
      var ds = b2.s - a2.s, dW = ((a2.f + BW) + (b2.f + BW)) / 2 * ds;
      if (b2.t <= cur) { if (b2.t <= BOT) Wd += dW; else Wu += dW; }
      ghost.push([b2.s, b2.f + BW]);
      var inBranch = goingUp ? (b2.t > BOT && b2.t <= cur) : (b2.t <= cur);
      if (inBranch) act.push([b2.s, b2.f + BW]);
    }
    ax.poly(ghost, { color: K.PANEL, width: 1.6 });
    if (act.length > 1) {
      fillTo(ax, act, 0, goingUp ? 'rgba(74,222,128,0.30)' : K.ACCFILL);
      ax.poly(act, { color: K.BLUE, width: 2.6 });
    }
    ax.dots([[now.s, now.f + BW]], { color: K.ACC, r: 5.5 });

    /* which branch, and which way along it — without this the shading looks
       arbitrary and the loop is ambiguous */
    label(c, goingUp ? 'driving up \u2192  the ground puts energy IN'
                     : '\u2190 going down  \u00b7  the ground takes energy OUT',
          ax.X(SLO) + 12, ax.Y(FMAX * 0.93),
          { color: goingUp ? K.GRN : K.ACC, size: 12.5, align: 'left' });

    var W = workTo(cur);
    var KE = 0.5 * m * now.v * now.v, PE = m * G * now.s;
    label(c, 'shaded ' + (goingUp ? '+' + fmt(Wu, 0) : num(Wd, 0)) + ' J' +
             (goingUp ? '   \u00b7   down was ' + num(Wd, 0) + ' J' : '') +
             '   \u00b7   net ' + num(W, 0) + ' J',
          ax.X((SLO + SHI) / 2), ax.Y(FMAX * 0.80),
          { color: K.INK, size: 13.5, align: 'center', plate: true });

    out.innerHTML =
      'GRF work so far <b>' + num(W, 0) + ' J</b>' +
      ' = ΔKE <b>' + num(KE, 0) + ' J</b> + ΔPE <b>' + num(PE, 0) + ' J</b>' +
      '<span style="opacity:.72">  ·  v = ' + num(now.v, 2) + ' m/s  ·  ' +
      't = ' + fmt(cur, 2) + ' s</span>';
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    cur += dt * 0.42;
    if (cur >= JUMP.t1) { cur = JUMP.t1; sT.quiet(cur); draw(); stop(); return; }
    sT.quiet(cur); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (playing) return;
    if (cur >= JUMP.t1 - 1e-6) cur = JUMP.t0;
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  }

  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () { playing ? stop() : start(); });
  var sT = slider(row, 'Through the jump', JUMP.t0, JUMP.t1, 0.005, cur,
    function (q) { return fmt(q, 2) + ' s'; },
    function (q) { stop(); cur = q; draw(); });

  node._draw = draw; node._stop = stop;
  draw();
});


/* ============================================================
   5. GRAVITATIONAL PE AND ITS REFERENCE
   U = mgh is only a number once you say where h is measured from. So the
   datum is a control, and moving it changes U while changing nothing at
   all about the movement — which is the point.
   ============================================================ */
D.register('pegrav', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 640, h: port ? 430 : 400,
                            padl: 78, padr: 140, padt: 24, padb: 50 });
  var out = readout(u.ctl);
  var m = 70, h = 3.0, datum = 0;

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    var HI = 5.2, LO = -2.2;
    ax.setRange(0, 1, LO, HI);
    ax.frame({ grid: true, yticks: axisTicks(LO, HI), xticks: [],
               ylabel: 'Height (m)', ysize: 13, ylabelx: 15,
               yfmt: function (q) { return q.toFixed(0); } });

    /* the datum — everything is measured from here */
    c.save();
    c.strokeStyle = K.ORG; c.lineWidth = 2; c.setLineDash([7, 5]);
    c.beginPath(); c.moveTo(ax.pl, ax.Y(datum)); c.lineTo(ax.W - ax.pr, ax.Y(datum));
    c.stroke(); c.restore();
    /* left-aligned: the height arrow and its label live on the right */
    label(c, 'reference height', ax.pl + 8, ax.Y(datum) - 12,
          { color: K.ORG, size: 12.5, align: 'left', plate: true });

    /* the climber, at h */
    var fx = ax.X(0.34);
    figure(c, fx, ax.Y(h), 68, 0.1, { color: K.INK });
    c.save();
    c.strokeStyle = K.MUT; c.globalAlpha = .6; c.lineWidth = 1.3; c.setLineDash([3, 4]);
    c.beginPath(); c.moveTo(ax.pl, ax.Y(h)); c.lineTo(ax.W - ax.pr, ax.Y(h)); c.stroke();
    c.restore();

    /* the height being counted, as an arrow between the two lines */
    var barX = ax.X(0.78);
    arrow(c, barX, ax.Y(datum), barX, ax.Y(h), { color: K.GRN, width: 2.4 });
    arrow(c, barX, ax.Y(h), barX, ax.Y(datum), { color: K.GRN, width: 2.4 });
    label(c, 'h = ' + num(h - datum, 2) + ' m', barX + 10, (ax.Y(h) + ax.Y(datum)) / 2,
          { color: K.GRN, size: 13.5, align: 'left', plate: true });

    /* the energy column in the right margin */
    var U = m * G * (h - datum);
    var colX = ax.W - 96, colW = 44, zero = ax.Y(0), top = ax.pt + 10, bot = ax.H - ax.pb - 10;
    var UMAX = m * G * 5;
    var px = zero - (U / UMAX) * (zero - top);
    c.save();
    c.fillStyle = K.PANEL; c.fillRect(colX, top, colW, bot - top);
    c.fillStyle = U >= 0 ? K.GRN : K.ACC; c.globalAlpha = .6;
    c.fillRect(colX, Math.min(zero, px), colW, Math.abs(px - zero)); c.globalAlpha = 1;
    c.strokeStyle = K.INK; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(colX, zero); c.lineTo(colX + colW, zero); c.stroke();
    c.restore();
    label(c, 'U₉', colX + colW / 2, top - 12, { color: K.MUT, size: 12, align: 'center' });
    label(c, num(U, 0) + ' J', colX + colW / 2, px + (U >= 0 ? -12 : 12),
          { color: U >= 0 ? K.GRN : K.ACC, size: 13, align: 'center', plate: true });

    out.innerHTML = 'U₉ = m·g·h = ' + fmt(m, 0) + ' × 9.81 × ' +
      num(h - datum, 2) + ' = <b>' + num(U, 0) + ' J</b>' +
      '<span style="opacity:.72">  ·  move the reference and U changes; the climb does not</span>';
  }

  u.ctl.classList.add('g2');
  slider(u.ctl, 'Mass', 40, 110, 1, m, function (q) { return fmt(q, 0) + ' kg'; },
    function (q) { m = q; draw(); });
  slider(u.ctl, 'Height', -1.5, 5, 0.1, h, function (q) { return num(q, 1) + ' m'; },
    function (q) { h = q; draw(); });
  slider(u.ctl, 'Reference', -2, 4, 0.1, datum, function (q) { return num(q, 1) + ' m'; },
    function (q) { datum = q; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   6. ELASTIC PE — WHY THE STRETCH MATTERS MORE THAN THE STIFFNESS
   ½kx² with both on sliders. The chips move between a bungee-ish spring
   and a tendon without changing the units, so the parabola is the same
   picture at both scales.
   ============================================================ */
D.register('spring', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 840, h: port ? 400 : 400,
                            padl: 80, padr: 26, padt: 30, padb: 52 });
  var out = readout(u.ctl);
  /* k in N/mm and x in mm keeps one unit system across a rubber band and
     an Achilles tendon: U = ½·k·x²/1000 joules */
  var k = 12, x = 40;

  function energy(kk, xx) { return 0.5 * kk * xx * xx / 1000; }

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    var XM = Math.max(x * 1.35, 12);
    var hi = energy(k, XM) * 1.22;
    ax.setRange(-XM, XM, 0, hi);
    ax.frame({ grid: true, xticks: axisTicks(-XM, XM), yticks: axisTicks(0, hi),
               xlabel: 'Deformation from resting length, x (mm)',
               ylabel: 'Stored elastic energy (J)', ysize: 13, ylabelx: 15,
               xfmt: function (q) { return q.toFixed(0); },
               yfmt: function (q) { return q.toFixed(hi < 10 ? 1 : 0); } });

    ax.area(function (q) { return energy(k, q); }, -XM, XM, { fill: K.FILL });
    ax.fn(function (q) { return energy(k, q); }, { color: K.BLUE, width: 2.6 });

    var U = energy(k, x), Uh = energy(k, x / 2);
    [[x / 2, Uh, K.MUT], [x, U, K.ACC]].forEach(function (p) {
      c.save(); c.strokeStyle = p[2]; c.globalAlpha = .55; c.lineWidth = 1.4;
      c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(ax.X(p[0]), ax.Y(0)); c.lineTo(ax.X(p[0]), ax.Y(p[1]));
      c.lineTo(ax.X(-XM), ax.Y(p[1])); c.stroke(); c.restore();
      ax.dots([[p[0], p[1]]], { color: p[2], r: p[2] === K.ACC ? 6 : 4.5 });
    });

    label(c, 'half the stretch, a quarter of the energy',
          ax.X(-XM) + 12, ax.pt + 14, { color: K.MUT, size: 12.5, align: 'left' });

    out.innerHTML = 'U = ½·k·x² = ½ × ' + fmt(k, 1) + ' N/mm × (' +
      fmt(x, 0) + ' mm)² = <b>' + fmt(U, U < 10 ? 2 : 1) + ' J</b>' +
      '<span style="opacity:.72">  ·  at ' + fmt(x / 2, 0) + ' mm it is only ' +
      fmt(Uh, Uh < 10 ? 2 : 1) + ' J</span>';
  }

  chips(u.ctl, [['band', 'elastic band'], ['ten', 'Achilles tendon'],
                ['pole', 'vaulting pole']], 'band', function (w) {
    if (w === 'band') { k = 12;  x = 40; }
    if (w === 'ten')  { k = 150; x = 18; }
    if (w === 'pole') { k = 3.2; x = 900 / 5; }
    sK.quiet(k); sX.quiet(x); draw();
  });
  u.ctl.classList.add('g2');
  var sK = slider(u.ctl, 'Stiffness k', 1, 220, 0.5, k, function (q) { return fmt(q, 1) + ' N/mm'; },
    function (q) { k = q; draw(); });
  var sX = slider(u.ctl, 'Stretch x', 2, 200, 1, x, function (q) { return fmt(q, 0) + ' mm'; },
    function (q) { x = q; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   7. CONSERVATION OF MECHANICAL ENERGY
   Once the feet leave the ground only gravity acts, so KE and PE trade
   and the total is a flat line. Two modes: the animation, and the same
   figure with take-off speed and mass on sliders — which is where "mass
   cancels" stops being a claim and becomes something you can fail to
   make happen.
   ============================================================ */
D.register('conserve', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var mode = d.mode || 'anim';
  var ax = new Axes(u.cv, { w: port ? 460 : 880, h: port ? 470 : 420,
                            padl: 78, padr: 118, padt: 26, padb: 52 });
  var out = readout(u.ctl);
  var m = 75, vto = 2.9;
  var tt = 0, playing = false, raf = null, last = 0;

  function flight() { return 2 * vto / G; }
  function state(t) {
    var v = vto - G * t, hh = vto * t - 0.5 * G * t * t;
    return { v: v, h: Math.max(0, hh), ke: 0.5 * m * v * v, pe: m * G * Math.max(0, hh) };
  }

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    var T = flight(), hmax = vto * vto / (2 * G), E = 0.5 * m * vto * vto;
    var hi = E * 1.34;
    ax.setRange(0, T, 0, hi);
    ax.frame({ grid: true, xticks: axisTicks(0, T), yticks: axisTicks(0, hi),
               xlabel: 'Time since take-off (s)', ylabel: 'Energy (J)',
               ysize: 13, ylabelx: 15,
               xfmt: function (q) { return q.toFixed(2); },
               yfmt: function (q) { return q.toFixed(0); } });

    /* KE and PE, stacked, so the flat top IS the conservation */
    var pts = [], i, t, s;
    for (i = 0; i <= 160; i++) {
      t = T * i / 160; s = state(t);
      pts.push([t, s.ke]);
    }
    fillTo(ax, pts, 0, K.FILL2);
    var tot = pts.map(function (p, j) { return [p[0], p[1] + state(T * j / 160).pe]; });
    c.save(); c.fillStyle = K.ACCFILL; c.beginPath();
    c.moveTo(ax.X(0), ax.Y(0));
    pts.forEach(function (p) { c.lineTo(ax.X(p[0]), ax.Y(p[1])); });
    for (i = pts.length - 1; i >= 0; i--) c.lineTo(ax.X(tot[i][0]), ax.Y(tot[i][1]));
    c.closePath(); c.fill(); c.restore();

    ax.poly(pts, { color: K.BLUE, width: 2.2 });
    ax.poly(tot, { color: K.GRN, width: 2.6 });
    label(c, 'total mechanical energy = ' + fmt(E, 0) + ' J, flat',
          ax.X(T / 2), ax.Y(E) - 14, { color: K.GRN, size: 13, align: 'center', plate: true });
    label(c, 'kinetic', ax.X(T * 0.06), ax.Y(E * 0.30), { color: K.BLUE, size: 13, align: 'left' });
    label(c, 'potential', ax.X(T * 0.5), ax.Y(E * 0.72),
          { color: K.ACC, size: 13, align: 'center' });

    var s0 = state(tt);
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.8; c.globalAlpha = .8;
    c.beginPath(); c.moveTo(ax.X(tt), ax.Y(0)); c.lineTo(ax.X(tt), ax.Y(hi)); c.stroke();
    c.restore();
    ax.dots([[tt, s0.ke]], { color: K.BLUE, r: 5 });
    ax.dots([[tt, s0.ke + s0.pe]], { color: K.GRN, r: 5 });

    /* the jumper, on a height strip in the right MARGIN — inside the frame it
       sat on the total-energy line and on the right-hand axis */
    var hx = ax.W - 62, gy = ax.Y(0), topY = ax.pt + 30;
    var hy = gy - (s0.h / Math.max(hmax, 1e-6)) * (gy - topY);
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1;
    c.beginPath(); c.moveTo(hx, gy); c.lineTo(hx, topY); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.ORG; c.beginPath(); c.arc(hx, hy, 7, 0, 7); c.fill(); c.restore();
    label(c, num(s0.h, 2) + ' m', hx + 12, hy, { color: K.ORG, size: 12.5, align: 'left', plate: true });
    label(c, 'height', hx, topY - 14, { color: K.MUT, size: 11.5, align: 'center' });

    out.innerHTML = 'KE <b>' + fmt(s0.ke, 0) + ' J</b> + PE <b>' + fmt(s0.pe, 0) +
      ' J</b> = <b>' + fmt(s0.ke + s0.pe, 0) + ' J</b>' +
      '<span style="opacity:.72">  ·  peak rise Δh = v²/2g = ' +
      fmt(hmax, 3) + ' m, whatever the mass</span>';
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null;
                    if (btn) btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    tt += dt * 0.35;
    if (tt >= flight()) { tt = flight(); sT.quiet(tt); draw(); stop(); return; }
    sT.quiet(tt); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (playing) return;
    if (tt >= flight() - 1e-6) tt = 0;
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  }

  var btn = null, sT;
  if (mode === 'anim') {
    var row = ctlRow(u.ctl);
    btn = playBtn(row, '▶ Play');
    btn.addEventListener('click', function () { playing ? stop() : start(); });
    sT = slider(row, 'Through the flight', 0, flight(), 0.005, tt,
      function (q) { return fmt(q, 2) + ' s'; },
      function (q) { stop(); tt = q; draw(); });
  } else {
    sT = { quiet: function () {} };
    u.ctl.classList.add('g2');
    slider(u.ctl, 'Take-off speed', 1.5, 4.5, 0.05, vto,
      function (q) { return fmt(q, 2) + ' m/s'; },
      function (q) { vto = q; tt = Math.min(tt, flight()); draw(); });
    slider(u.ctl, 'Mass', 45, 110, 1, m, function (q) { return fmt(q, 0) + ' kg'; },
      function (q) { m = q; draw(); });
  }

  node._draw = draw; node._stop = stop;
  draw();
});

/* ============================================================
   8. ONE MOVEMENT, THREE FORMULAS
   P = W/t, P = F·v and P = τ·ω are not three quantities. A press with a
   velocity profile makes that checkable: the instantaneous product and
   the time-average sit on the same axis, and the joint version comes out
   to the same watts.
   ============================================================ */
D.register('power3', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 880, h: port ? 430 : 400,
                            padl: 80, padr: 120, padt: 28, padb: 52 });
  var out = readout(u.ctl);
  var m = 60, T = 1.4, RANGE = 0.62;          /* kg lifted, s, m of travel */
  var tt = 0.7, view = 'lin';

  /* a half-sine velocity profile over the lift: smooth, and its integral is
     exactly the range, so the numbers close */
  function vel(t) { return (Math.PI * RANGE / (2 * T)) * Math.sin(Math.PI * t / T); }
  function pos(t) { return RANGE / 2 * (1 - Math.cos(Math.PI * t / T)); }
  function F() { return m * G; }
  function pwr(t) { return F() * vel(t); }

  /* the same lift seen at a joint: a 0.42 m moment arm turning through the
     same range, so omega scales with v and tau with F */
  var ARM = 0.42;

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    var PMAX = F() * vel(T / 2) * 1.30;
    ax.setRange(0, T, 0, PMAX);
    ax.frame({ grid: true, xticks: axisTicks(0, T), yticks: axisTicks(0, PMAX),
               xlabel: 'Time through the lift (s)', ylabel: 'Power (W)',
               ysize: 13, ylabelx: 15,
               xfmt: function (q) { return q.toFixed(1); },
               yfmt: function (q) { return q.toFixed(0); } });

    ax.area(pwr, 0, tt, { fill: K.FILL2 });
    ax.fn(pwr, { color: K.BLUE, width: 2.6 });

    /* the time-average: work done so far divided by the time it took */
    var W = F() * pos(tt), avg = tt > 0.02 ? W / tt : 0;
    ax.poly([[0, avg], [T, avg]], { color: K.ORG, width: 2, dash: [6, 4] });
    label(c, 'average P = W/t = ' + fmt(avg, 0) + ' W', ax.X(T) - 8, ax.Y(avg) - 13,
          { color: K.ORG, size: 12.5, align: 'right', plate: true });

    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2;
    c.beginPath(); c.moveTo(ax.X(tt), ax.Y(0)); c.lineTo(ax.X(tt), ax.Y(PMAX)); c.stroke(); c.restore();
    ax.dots([[tt, pwr(tt)]], { color: K.ACC, r: 6 });

    label(c, 'area = work done = ' + fmt(W, 0) + ' J', ax.X(tt / 2), ax.Y(PMAX * 0.14),
          { color: K.INK, size: 13, align: 'center', plate: true });

    /* the bar, on a travel strip in the right margin */
    var bx = ax.W - 64, gy = ax.Y(0), topY = ax.pt + 26;
    var by = gy - (pos(tt) / RANGE) * (gy - topY);
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1;
    c.beginPath(); c.moveTo(bx, gy); c.lineTo(bx, topY); c.stroke();
    c.fillStyle = K.GRN; c.fillRect(bx - 17, by - 5, 34, 10); c.restore();
    label(c, 'the bar', bx, topY - 14, { color: K.MUT, size: 11.5, align: 'center' });
    label(c, fmt(pos(tt), 2) + ' m', bx - 22, by, { color: K.GRN, size: 12, align: 'right' });

    var v = vel(tt), P = pwr(tt);
    var om = v / ARM, tq = F() * ARM;
    out.innerHTML = view === 'lin'
      ? 'P = F·v = ' + fmt(F(), 0) + ' N × ' + fmt(v, 2) + ' m/s = <b>' + fmt(P, 0) + ' W</b>' +
        '<span style="opacity:.72">  ·  W/t = ' + fmt(W, 0) + ' J / ' + fmt(tt, 2) +
        ' s = ' + fmt(avg, 0) + ' W</span>'
      : 'P = τ·ω = ' + fmt(tq, 0) + ' N·m × ' + fmt(om, 2) +
        ' rad/s = <b>' + fmt(tq * om, 0) + ' W</b>' +
        '<span style="opacity:.72">  ·  the same watts as F·v, on a ' +
        fmt(ARM, 2) + ' m moment arm</span>';
  }

  var row = ctlRow(u.ctl);
  /* a segmented control that chooses WHAT IS SHOWN must opt out of the
     prewarm sweep, or fit.js leaves it wherever its last press landed */
  keepOut(seg(row, [['lin', 'P = F·v'], ['rot', 'P = τ·ω']], 'lin',
    function (w) { view = w; draw(); }));
  slider(row, 'Through the lift', 0.02, T, 0.01, tt,
    function (q) { return fmt(q, 2) + ' s'; }, function (q) { tt = q; draw(); });
  u.ctl.classList.add('g2');
  slider(u.ctl, 'Load', 20, 140, 1, m, function (q) { return fmt(q, 0) + ' kg'; },
    function (q) { m = q; draw(); });
  slider(u.ctl, 'Lift takes', 0.5, 3, 0.05, T, function (q) { return fmt(q, 2) + ' s'; },
    function (q) { T = q; tt = Math.min(tt, T); draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   9. THE PHASES OF A COUNTERMOVEMENT JUMP
   His four stick figures, actually jumping. The crouch is driven by the
   REAL record — the figure's hips follow the integrated displacement —
   so the phase boundaries fall where the force trace says they do.
   ============================================================ */
var CMJPH = [
  { k: 'stand', n: 'Standing',       s: 'initial',    a: 0.00, b: 0.15, note: 'F = body weight, nothing moving' },
  { k: 'ecc',   n: 'Countermovement', s: 'eccentric',  a: 0.15, b: 0.785, note: 'absorb energy, stretch the tendons' },
  { k: 'con',   n: 'Propulsion',     s: 'concentric', a: 0.785, b: 1.069, note: 'deliver positive work to the CoM' },
  { k: 'fly',   n: 'Flight',         s: 'ballistic',  a: 1.069, b: 1.38,  note: 'only gravity acts' },
  { k: 'land',  n: 'Landing',        s: 'eccentric',  a: 1.38,  b: 1.62,  note: 'dissipate the kinetic energy' }
];

D.register('cmjphases', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 540 : 450,
                            padl: 70, padr: 24, padt: 20, padb: 52, fluid: false });
  var out = readout(u.ctl);
  var TEND = 1.62;
  var tt = 0.9, playing = false, raf = null, last = 0;

  function phaseAt(t) {
    for (var i = CMJPH.length - 1; i >= 0; i--) if (t >= CMJPH[i].a) return CMJPH[i];
    return CMJPH[0];
  }
  /* centre-of-mass height above standing, in metres */
  function comAt(t) {
    if (t <= JUMP.t1) return JUMP.at(t).s;
    if (t <= 1.38) {                                   /* the flight */
      var tf = t - JUMP.t1, v0 = JUMP.vto;
      return JUMP.at(JUMP.t1).s + v0 * tf - 0.5 * G * tf * tf;
    }
    var u2 = (t - 1.38) / (TEND - 1.38);               /* the landing */
    return JUMP.at(JUMP.t1).s * (1 - u2) + (-0.34) * u2;
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var ph = phaseAt(tt), com = comAt(tt);

    /* ---- the stage: a figure on a floor, with the CoM trace behind it ---- */
    var stageH = H - 168;
    var floor = stageH - 20;
    var SCALE = (stageH - 96) / 0.95;                   /* px per metre */

    c.save();
    c.strokeStyle = K.PANEL; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(40, floor); c.lineTo(W - 40, floor); c.stroke(); c.restore();

    /* crouch drives the legs; once airborne the whole figure leaves the floor */
    var airborne = tt > JUMP.t1 && tt < 1.38;
    var deepest = JUMP.smin;
    var crouch = Math.max(0, Math.min(1, -Math.min(0, com) / -deepest));
    /* in flight the whole figure leaves the floor — exaggerated a little so a
       12 cm jump is visible at this scale */
    var rise = airborne ? Math.max(0, com - JUMP.at(JUMP.t1).s) : 0;
    var footY = floor - rise * SCALE * 1.8;
    var fx = W * 0.28;
    figure(c, fx, footY, 205, airborne ? 0.06 : crouch,
           { color: K.INK, armsUp: airborne || ph.k === 'con' });
    if (airborne) {
      c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2; c.setLineDash([3, 4]);
      c.beginPath(); c.moveTo(fx - 46, floor); c.lineTo(fx + 46, floor); c.stroke(); c.restore();
    }

    /* the height trace to the right of the figure */
    var tx0 = W * 0.52, tx1 = W - 52;
    var pts = [], i, t, y;
    for (i = 0; i <= 200; i++) {
      t = TEND * i / 200;
      pts.push([tx0 + (tx1 - tx0) * (t / TEND), floor - (comAt(t) - deepest) * SCALE * 0.55]);
    }
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.8; c.beginPath();
    pts.forEach(function (p, j) { j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
    c.stroke();
    /* the part already travelled, in the phase colour */
    c.strokeStyle = K.BLUE; c.lineWidth = 2.6; c.beginPath();
    pts.filter(function (p, j) { return TEND * j / 200 <= tt; })
       .forEach(function (p, j) { j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
    c.stroke(); c.restore();
    var cx2 = tx0 + (tx1 - tx0) * (tt / TEND), cy2 = floor - (com - deepest) * SCALE * 0.55;
    c.save(); c.fillStyle = K.ACC; c.beginPath(); c.arc(cx2, cy2, 5.5, 0, 7); c.fill(); c.restore();
    label(c, 'centre of mass', (tx0 + tx1) / 2, 22, { color: K.MUT, size: 12, align: 'center' });

    /* ---- the phase strip along the bottom ---- */
    var sy = H - 118, sh = 34, x0 = 52, x1 = W - 52;
    CMJPH.forEach(function (p) {
      var a = x0 + (x1 - x0) * (p.a / TEND), b = x0 + (x1 - x0) * (Math.min(p.b, TEND) / TEND);
      var on = p.k === ph.k;
      c.save();
      c.fillStyle = on ? (p.s === 'concentric' ? 'rgba(74,222,128,0.34)'
                        : p.s === 'eccentric' ? 'rgba(248,113,113,0.30)' : K.PANEL)
                       : K.PANEL;
      c.globalAlpha = on ? 1 : 0.5;
      c.fillRect(a, sy, b - a, sh);
      c.strokeStyle = on ? K.INK : K.PANEL; c.lineWidth = on ? 1.5 : 1;
      c.strokeRect(a + .5, sy + .5, b - a, sh); c.restore();
      label(c, p.n, (a + b) / 2, sy + sh / 2,
            { color: on ? K.INK : K.MUT, size: on ? 12.5 : 11, align: 'center' });
    });
    var px = x0 + (x1 - x0) * (tt / TEND);
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2;
    c.beginPath(); c.moveTo(px, sy - 8); c.lineTo(px, sy + sh + 8); c.stroke(); c.restore();

    label(c, ph.n + ' — ' + ph.s, W / 2, H - 62,
          { color: ph.s === 'concentric' ? K.GRN : (ph.s === 'eccentric' ? K.ACC : K.MUT),
            size: 17, align: 'center' });
    label(c, ph.note, W / 2, H - 36, { color: K.MUT, size: 13, align: 'center' });

    out.innerHTML = '<b>' + ph.n + '</b> (' + ph.s + ') · ' + ph.note +
      '<span style="opacity:.72">  ·  CoM ' + num(com, 2) + ' m from standing</span>';
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    tt += dt * 0.55;
    if (tt >= TEND) { tt = TEND; sT.quiet(tt); draw(); stop(); return; }
    sT.quiet(tt); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (playing) return;
    if (tt >= TEND - 1e-6) tt = 0;
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  }

  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () { playing ? stop() : start(); });
  var sT = slider(row, 'Through the jump', 0, TEND, 0.005, tt,
    function (q) { return fmt(q, 2) + ' s'; },
    function (q) { stop(); tt = q; draw(); });
  node._draw = draw; node._stop = stop;
  draw();
});


/* ============================================================
   10. THE MARGARIA-KALAMEN STAIR SPRINT
   They run this in lab, so the point of the figure is that they can put
   their own numbers in and see where they land.
   ============================================================ */
D.register('margaria', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 880, h: port ? 470 : 430,
                            padl: 40, padr: 40, padt: 24, padb: 40, fluid: false });
  var out = readout(u.ctl);
  var m = 75, step = 0.175, dt = 0.52, NSTEP = 6;

  var BANDS = [
    { lo: 0,  hi: 12, n: 'untrained',   col: 'rgba(148,163,184,0.30)' },
    { lo: 12, hi: 16, n: 'active',      col: 'rgba(56,189,248,0.26)' },
    { lo: 16, hi: 20, n: 'well trained', col: 'rgba(251,191,36,0.26)' },
    { lo: 20, hi: 26, n: 'power athlete', col: 'rgba(74,222,128,0.30)' }
  ];

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H, i;
    ax.clear();
    var dh = NSTEP * step, P = m * G * dh / dt, wkg = P / m;

    /* ---- the staircase, with the two timing gates ---- */
    var sx = 44, base = H - 118, sw = (W * 0.46 - sx) / 9, sh = 17;
    for (i = 0; i < 9; i++) {
      var x = sx + i * sw, y = base - (i + 1) * sh;
      c.save();
      c.fillStyle = (i >= 2 && i < 8) ? K.FILL2 : K.PANEL;
      c.fillRect(x, y, sw, (i + 1) * sh);
      c.strokeStyle = K.PANEL; c.lineWidth = 1;
      c.strokeRect(x + .5, y + .5, sw, (i + 1) * sh);
      c.restore();
    }
    /* the two gates, their flags staggered so the captions cannot meet */
    [[2, 'Gate 1 \u00b7 step 3', 46], [8, 'Gate 2 \u00b7 step 9', 84]].forEach(function (g) {
      var x = sx + g[0] * sw + sw / 2, y = base - (g[0] + 1) * sh;
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - g[2] + 14); c.stroke();
      c.fillStyle = K.ACC; c.beginPath(); c.arc(x, y - g[2] + 10, 5, 0, 7); c.fill(); c.restore();
      label(c, g[1], x, y - g[2] - 4, { color: K.ACC, size: 12, align: 'center', plate: true });
    });
    /* the height actually climbed, to the RIGHT of the staircase */
    var hx = sx + 9 * sw + 26;
    arrow(c, hx, base - 3 * sh, hx, base - 9 * sh, { color: K.GRN, width: 2.4 });
    arrow(c, hx, base - 9 * sh, hx, base - 3 * sh, { color: K.GRN, width: 2.4 });
    label(c, '\u0394h = ' + NSTEP + ' \u00d7 ' + fmt(step, 3) + ' m', hx + 12, base - 6 * sh - 11,
          { color: K.GRN, size: 12.5, align: 'left' });
    label(c, '= ' + fmt(dh, 2) + ' m', hx + 12, base - 6 * sh + 9,
          { color: K.GRN, size: 12.5, align: 'left' });

    /* ---- the arithmetic, under the staircase, the way the slide writes it ---- */
    label(c, 'P = m\u00b7g\u00b7\u0394h / \u0394t  =  (' + fmt(m, 0) + ')(9.81)(' + fmt(dh, 2) +
             ') / ' + fmt(dt, 2) + '  =  ' + fmt(P, 0) + ' W',
          sx, H - 74, { color: K.INK, size: 15, align: 'left' });

    /* ---- the W/kg scale, with the normative bands ---- */
    var bx0 = W * 0.545, bx1 = W - 52, by = 118, bh = 46, WMAX = 26;
    function BX(v) { return bx0 + (bx1 - bx0) * Math.min(v, WMAX) / WMAX; }
    BANDS.forEach(function (b2, bi) {
      c.save(); c.fillStyle = b2.col;
      c.fillRect(BX(b2.lo), by, BX(b2.hi) - BX(b2.lo), bh); c.restore();
      /* alternate the caption line, or 'active' and 'well trained' collide */
      label(c, b2.n, (BX(b2.lo) + BX(b2.hi)) / 2, by + bh + (bi % 2 ? 32 : 15),
            { color: K.MUT, size: 11, align: 'center' });
    });
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1;
    c.strokeRect(bx0 + .5, by + .5, bx1 - bx0, bh); c.restore();
    [0, 5, 10, 15, 20, 25].forEach(function (v) {
      label(c, String(v), BX(v), by - 12, { color: K.MUT, size: 10.5, align: 'center' });
    });
    label(c, 'peak anaerobic power (W/kg)', (bx0 + bx1) / 2, by - 58,
          { color: K.INK, size: 13, align: 'center' });
    var mx = BX(wkg);
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 3;
    c.beginPath(); c.moveTo(mx, by - 6); c.lineTo(mx, by + bh + 6); c.stroke(); c.restore();
    /* the marker's own number goes ABOVE the band, clear of the captions */
    label(c, fmt(wkg, 1) + ' W/kg', Math.min(Math.max(mx, bx0 + 34), bx1 - 34), by - 34,
          { color: K.INK, size: 16, align: 'center', plate: true });
    label(c, 'P = ' + fmt(P, 0) + ' W', (bx0 + bx1) / 2, by + bh + 74,
          { color: K.GRN, size: 20, align: 'center' });

    out.innerHTML = 'P = <b>' + fmt(P, 0) + ' W</b> · <b>' + fmt(wkg, 1) + ' W/kg</b>' +
      '<span style="opacity:.72">  ·  Δh = ' + fmt(dh, 2) + ' m in ' + fmt(dt, 2) + ' s</span>';
  }

  u.ctl.classList.add('g2');
  slider(u.ctl, 'Mass', 45, 120, 1, m, function (q) { return fmt(q, 0) + ' kg'; },
    function (q) { m = q; draw(); });
  slider(u.ctl, 'Step height', 0.12, 0.25, 0.005, step,
    function (q) { return fmt(q, 3) + ' m'; }, function (q) { step = q; draw(); });
  slider(u.ctl, 'Gate 1 → gate 2', 0.3, 1.2, 0.01, dt,
    function (q) { return fmt(q, 2) + ' s'; }, function (q) { dt = q; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   11. FORCE, VELOCITY AND POWER IN MUSCLE
   The keystone figure. Force falls as shortening velocity rises, power
   is their product, and the maximum of that product is neither of the
   two things a student would guess.
   ============================================================ */
D.register('fvp', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 880, h: port ? 430 : 410,
                            padl: 78, padr: 82, padt: 30, padb: 54 });
  var out = readout(u.ctl);
  var vr = 0.31;

  /* Hill's equation, normalised: F(0) = 1, F(1) = 0 */
  var A = 0.25;
  function Fof(v) { return Math.max(0, (1 - v) / (1 + v / A)); }
  function Pof(v) { return Fof(v) * v; }
  var PKV = (function () {                 /* where the product peaks */
    var best = 0, bv = 0;
    for (var i = 1; i < 1000; i++) { var v = i / 1000, p = Pof(v); if (p > best) { best = p; bv = v; } }
    return { v: bv, p: best };
  })();

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    ax.setRange(0, 1, 0, 1.18);
    ax.frame({ grid: true, xticks: [0, 0.2, 0.4, 0.6, 0.8, 1.0], yticks: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
               xlabel: 'Shortening velocity  (v / vₘₐₓ)',
               ylabel: 'Force  (F / Fₘₐₓ)', ysize: 13, ylabelx: 15,
               xfmt: function (q) { return q.toFixed(1); },
               yfmt: function (q) { return q.toFixed(1); } });

    /* power on its own scale, so both curves fill the frame */
    var PS = 1 / PKV.p;
    ax.fn(Fof, { color: K.BLUE, width: 2.8 });
    ax.fn(function (v) { return Pof(v) * PS; }, { color: K.ACC, width: 2.8 });

    /* the right-hand axis belongs to power */
    var rx = ax.W - ax.pr;
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.2; c.globalAlpha = .8;
    c.beginPath(); c.moveTo(rx + .5, ax.pt); c.lineTo(rx + .5, ax.Y(0)); c.stroke(); c.restore();
    [0, 0.25, 0.5, 0.75, 1].forEach(function (q) {
      label(c, fmt(q, 2), rx + 8, ax.Y(q), { color: K.ACC, size: 11, align: 'left' });
    });
    c.save(); c.translate(ax.W - 15, (ax.pt + ax.Y(0)) / 2); c.rotate(Math.PI / 2);
    c.fillStyle = K.ACC; c.font = '700 13px ui-sans-serif,system-ui,sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText('Power, as a fraction of peak', 0, 0); c.restore();

    /* peak power, marked once and for all */
    c.save(); c.strokeStyle = K.ORG; c.globalAlpha = .6; c.lineWidth = 1.5; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(ax.X(PKV.v), ax.Y(0)); c.lineTo(ax.X(PKV.v), ax.Y(1)); c.stroke();
    c.restore();
    label(c, 'peak power at ' + fmt(PKV.v, 2) + '·vₘₐₓ',
          ax.X(PKV.v) - 8, ax.Y(1.11), { color: K.ORG, size: 12.5, align: 'right', plate: true });

    var f = Fof(vr), p = Pof(vr);
    ax.dots([[vr, f]], { color: K.BLUE, r: 6.5 });
    ax.dots([[vr, p * PS]], { color: K.ACC, r: 6.5 });
    c.save(); c.strokeStyle = K.INK; c.globalAlpha = .55; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(ax.X(vr), ax.Y(0)); c.lineTo(ax.X(vr), ax.Y(1.06)); c.stroke(); c.restore();

    key(c, ax.X(0.62), ax.pt + 6, [[K.BLUE, 'force'], [K.ACC, 'power = F × v']], { size: 12.5 });

    out.innerHTML = 'at v = ' + fmt(vr, 2) + '·vₘₐₓ → F = <b>' + fmt(f, 2) +
      '</b>·Fₘₐₓ · P = <b>' + fmt(p / PKV.p, 2) + '</b> of peak' +
      '<span style="opacity:.72">  ·  ' +
      (vr < 0.03 ? 'isometric: maximum force, and no power at all'
        : vr > 0.96 ? 'vₘₐₓ: the muscle cannot hold any load, so again no power'
        : 'both terms matter — the product is what training targets') + '</span>';
  }

  chips(u.ctl, [['iso', 'isometric (v = 0)'], ['peak', 'peak power'],
                ['vmax', 'vₘₐₓ']], 'peak', function (w) {
    vr = w === 'iso' ? 0 : (w === 'vmax' ? 1 : PKV.v);
    sV.quiet(vr); draw();
  });
  var sV = slider(u.ctl, 'Shortening velocity', 0, 1, 0.01, vr,
    function (q) { return fmt(q, 2) + '·vₘₐₓ'; },
    function (q) { vr = q; draw(); });
  node._draw = draw;
  draw();
});

/* ============================================================
   12. PEAK POWER ACROSS ACTIVITIES
   80 W to 5500 W is a range of seventy, which a linear axis flattens into
   "walking is nothing". The log toggle is the point of the figure, and so
   is the note that a cyclist's watts are measured at the pedal and a
   jumper's are the whole body.
   ============================================================ */
var PBARS = [
  { n: 'Walking',              w: 80,   kind: 'sustained', at: 'whole body' },
  { n: 'FTP cycling (1 h)',    w: 280,  kind: 'sustained', at: 'at the pedal' },
  { n: 'Jogging',              w: 350,  kind: 'sustained', at: 'whole body' },
  { n: 'Cycling at V̇O₂max', w: 450, kind: 'sustained', at: 'at the pedal' },
  { n: 'This lecture’s jump', w: 1745, kind: 'peak', at: 'whole body', ours: true },
  { n: 'Track cyclist, sprint', w: 2000, kind: 'peak', at: 'at the pedal' },
  { n: 'Sprint start (Bolt)',  w: 2600, kind: 'peak', at: 'whole body' },
  { n: 'Countermovement jump', w: 4500, kind: 'peak', at: 'whole body' },
  { n: 'Olympic clean',        w: 5500, kind: 'peak', at: 'whole body' }
];

D.register('powerbars', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 520 : 440,
                            padl: 210, padr: 90, padt: 34, padb: 52, fluid: false });
  var out = readout(u.ctl);
  var scale = 'lin', sort = 'val';

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var rows = PBARS.slice();
    if (sort === 'val') rows.sort(function (a, b) { return a.w - b.w; });
    else rows.sort(function (a, b) {
      return (a.kind === b.kind) ? a.w - b.w : (a.kind === 'sustained' ? -1 : 1);
    });

    var x0 = ax.pl, x1 = W - ax.pr, y0 = ax.pt + 10, y1 = H - ax.pb;
    var LOG = scale === 'log', MAXW = 6000, MINW = 40;
    function BX(v) {
      return LOG
        ? x0 + (x1 - x0) * (Math.log(Math.max(v, MINW) / MINW) / Math.log(MAXW / MINW))
        : x0 + (x1 - x0) * (v / MAXW);
    }
    /* ticks */
    var ticks = LOG ? [40, 100, 300, 1000, 3000, 6000] : [0, 1000, 2000, 3000, 4000, 5000, 6000];
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
    ticks.forEach(function (t) {
      c.beginPath(); c.moveTo(BX(t), y0 - 6); c.lineTo(BX(t), y1); c.stroke();
    });
    c.restore();
    ticks.forEach(function (t) {
      label(c, String(t), BX(t), y1 + 14, { color: K.MUT, size: 11, align: 'center' });
    });
    label(c, 'Mechanical power (W)' + (LOG ? '  — log scale' : ''),
          (x0 + x1) / 2, H - 16, { color: K.INK, size: 13.5, align: 'center' });

    var bh = (y1 - y0) / rows.length;
    rows.forEach(function (r, i) {
      var cy = y0 + bh * i + bh / 2, h = Math.min(bh * 0.62, 22);
      var col = r.ours ? K.ORG : (r.kind === 'peak' ? K.ACC : K.BLUE);
      c.save();
      c.fillStyle = col; c.globalAlpha = r.ours ? 0.85 : 0.6;
      c.fillRect(x0, cy - h / 2, BX(r.w) - x0, h);
      c.globalAlpha = 1;
      if (r.ours) { c.strokeStyle = col; c.lineWidth = 1.6;
                    c.strokeRect(x0 + .5, cy - h / 2 + .5, BX(r.w) - x0, h); }
      c.restore();
      label(c, r.n, x0 - 10, cy, { color: r.ours ? K.ORG : K.INK, size: 12, align: 'right' });
      label(c, fmt(r.w, 0) + ' W', BX(r.w) + 8, cy, { color: col, size: 12, align: 'left' });
    });

    /* top RIGHT: both sort orders put the short bars at the top, so this is
       the one corner no bar reaches */
    key(c, x1 - 214, y0 - 4, [[K.BLUE, 'sustained'], [K.ACC, 'peak, for milliseconds'],
                              [K.ORG, 'the jump in this lecture']], { size: 11.5 });

    out.innerHTML = 'Peak values last milliseconds — they set sprint starts, jump heights ' +
      'and throws.<span style="opacity:.72">  ·  a cyclist’s watts are measured ' +
      '<b>at the pedal</b>; a jumper’s are the <b>whole body</b>, so the two are not the ' +
      'same measurement</span>';
  }

  var row = ctlRow(u.ctl);
  /* both of these choose WHAT IS SHOWN, so neither may be left wherever the
     prewarm sweep pressed it */
  keepOut(seg(row, [['lin', 'linear'], ['log', 'log']], 'lin',
    function (w) { scale = w; draw(); }));
  keepOut(seg(row, [['val', 'by size'], ['kind', 'sustained first']], 'val',
    function (w) { sort = w; draw(); }));
  node._draw = draw;
  draw();
});


/* ============================================================
   13. THE POWER–DURATION CURVE
   The four numbers on his slide, joined smoothly on a log axis, with the
   critical-power asymptote underneath. Drag the duration and the energy
   system that is paying for it changes.
   ============================================================ */
var PDA = [[1, 7000], [5, 4600], [15, 1800], [60, 700], [300, 450], [1200, 320], [3600, 285]];
var CP = 280;

D.register('pdcurve', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 880, h: port ? 420 : 410,
                            padl: 84, padr: 30, padt: 34, padb: 56 });
  var out = readout(u.ctl);
  var dur = 60;

  /* interpolate between his anchors in log–log, so the curve passes through
     every number the slide quotes instead of near them */
  function Pof(t) {
    t = Math.max(PDA[0][0], Math.min(PDA[PDA.length - 1][0], t));
    for (var i = 1; i < PDA.length; i++) {
      if (t <= PDA[i][0]) {
        var a = PDA[i - 1], b = PDA[i];
        var f = (Math.log(t) - Math.log(a[0])) / (Math.log(b[0]) - Math.log(a[0]));
        return Math.exp(Math.log(a[1]) + f * (Math.log(b[1]) - Math.log(a[1])));
      }
    }
    return CP;
  }

  var SYS = [
    { lo: 1,   hi: 12,   n: 'ATP–PCr',         col: 'rgba(248,113,113,0.16)' },
    { lo: 12,  hi: 120,  n: 'anaerobic glycolysis', col: 'rgba(251,191,36,0.15)' },
    { lo: 120, hi: 600,  n: 'near V̇O₂max', col: 'rgba(56,189,248,0.15)' },
    { lo: 600, hi: 3600, n: 'aerobic / threshold',  col: 'rgba(74,222,128,0.14)' }
  ];

  function draw() {
    var c = ax.c, K = C(), i;
    ax.clear();
    var T0 = 1, T1 = 3600, HI = 7600;
    /* a log x axis, done by hand: X() is linear, so feed it the logarithm */
    ax.setRange(Math.log(T0), Math.log(T1), 0, HI);
    var LX = function (t) { return ax.X(Math.log(t)); };

    SYS.forEach(function (sy) {
      c.save(); c.fillStyle = sy.col;
      c.fillRect(LX(sy.lo), ax.pt, LX(sy.hi) - LX(sy.lo), ax.Y(0) - ax.pt); c.restore();
      label(c, sy.n, (LX(sy.lo) + LX(sy.hi)) / 2, ax.pt + 14,
            { color: K.MUT, size: 10.5, align: 'center' });
    });

    ax.frame({ grid: true, xticks: [], yticks: axisTicks(0, HI),
               ylabel: 'Sustainable power (W)', ysize: 13, ylabelx: 15,
               yfmt: function (q) { return q.toFixed(0); } });
    [1, 5, 15, 60, 300, 1200, 3600].forEach(function (t) {
      label(c, t >= 60 ? (t / 60) + ' min' : t + ' s', LX(t), ax.Y(0) + 10,
            { color: K.MUT, size: 11, align: 'center' });
    });
    label(c, 'Duration (log scale)', (ax.pl + ax.W - ax.pr) / 2, ax.H - 4,
          { color: K.INK, size: 13.5, align: 'center', base: 'bottom' });

    var pts = [];
    for (i = 0; i <= 260; i++) {
      var t = Math.exp(Math.log(T0) + (Math.log(T1) - Math.log(T0)) * i / 260);
      pts.push([Math.log(t), Pof(t)]);
    }
    ax.poly(pts, { color: K.BLUE, width: 2.8 });
    ax.poly([[Math.log(T0), CP], [Math.log(T1), CP]], { color: K.GRN, width: 1.8, dash: [6, 4] });
    label(c, 'critical power ≈ ' + CP + ' W', LX(3), ax.Y(CP) - 13,
          { color: K.GRN, size: 12, align: 'left', plate: true });

    var P = Pof(dur);
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2;
    c.beginPath(); c.moveTo(LX(dur), ax.Y(0)); c.lineTo(LX(dur), ax.Y(P)); c.stroke(); c.restore();
    ax.dots([[Math.log(dur), P]], { color: K.ACC, r: 6.5 });

    var sysNow = SYS.filter(function (sy) { return dur >= sy.lo && dur < sy.hi; })[0] || SYS[3];
    out.innerHTML = 'for <b>' + (dur >= 60 ? fmt(dur / 60, 1) + ' min' : fmt(dur, 0) + ' s') +
      '</b> → about <b>' + fmt(P, 0) + ' W</b>' +
      '<span style="opacity:.72">  ·  ' + sysNow.n +
      '  ·  ' + fmt(P / CP, 1) + '× critical power</span>';
  }

  chips(u.ctl, [['5', '5 s sprint'], ['60', '1 min'], ['300', '5 min'], ['3600', '60 min']], '60',
    function (w) { dur = parseFloat(w); sD.quiet(Math.log(dur)); draw(); });
  var sD = slider(u.ctl, 'Duration', Math.log(1), Math.log(3600), 0.01, Math.log(dur),
    function (q) { var t = Math.exp(q); return t >= 60 ? fmt(t / 60, 1) + ' min' : fmt(t, 0) + ' s'; },
    function (q) { dur = Math.exp(q); draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   14. THE STRETCH–SHORTENING CYCLE
   One running stance, animated. The tendon lengthens while the muscle is
   producing force, and gives most of it back on the recoil — most, not
   all, which is the part the textbook figure leaves out.
   ============================================================ */
D.register('ssc', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 430,
                            padl: 82, padr: 132, padt: 30, padb: 54 });
  var out = readout(u.ctl);
  var TST = 250;                                  /* ms of stance          */
  var K_TEN = 267;                                /* N/mm                  */
  var XPK = 15;                                   /* mm of stretch at peak */
  var STEP = 70;                                  /* J needed per step     */
  var hyst = 7;                                   /* % lost in the tendon  */
  var tt = TST / 2, playing = false, raf = null, last = 0;

  function stretch(t) { return XPK * Math.sin(Math.PI * Math.min(t, TST) / TST); }
  function force(t)   { return K_TEN * stretch(t); }          /* N */
  function stored(t)  { return 0.5 * K_TEN * Math.pow(stretch(t), 2) / 1000; }  /* J */

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    var FMAX = K_TEN * XPK * 1.22;
    ax.setRange(0, TST, 0, FMAX);
    ax.frame({ grid: true, xticks: [0, 50, 100, 150, 200, 250], yticks: axisTicks(0, FMAX),
               xlabel: 'Time from foot strike (ms)', ylabel: 'Tendon force (N)',
               ysize: 13, ylabelx: 15,
               xfmt: function (q) { return q.toFixed(0); },
               yfmt: function (q) { return q.toFixed(0); } });

    /* absorb and return, shaded as two halves of the stance */
    c.save();
    c.fillStyle = 'rgba(248,113,113,0.13)';
    c.fillRect(ax.X(0), ax.pt, ax.X(TST / 2) - ax.X(0), ax.Y(0) - ax.pt);
    c.fillStyle = 'rgba(74,222,128,0.13)';
    c.fillRect(ax.X(TST / 2), ax.pt, ax.X(TST) - ax.X(TST / 2), ax.Y(0) - ax.pt);
    c.restore();
    label(c, 'ABSORB — lengthening', ax.X(TST * 0.25), ax.pt + 14,
          { color: K.ACC, size: 12, align: 'center' });
    label(c, 'RETURN — recoil', ax.X(TST * 0.75), ax.pt + 14,
          { color: K.GRN, size: 12, align: 'center' });

    var pts = [], i, t;
    for (i = 0; i <= 200; i++) { t = TST * i / 200; pts.push([t, force(t)]); }
    ax.poly(pts, { color: K.BLUE, width: 2.8 });
    var live = pts.filter(function (p) { return p[0] <= tt; });
    if (live.length > 1) fillTo(ax, live, 0, K.FILL2);
    ax.dots([[tt, force(tt)]], { color: K.ACC, r: 6 });

    /* the tendon itself, in the right margin, lengthening as it goes */
    var tx = ax.W - 74, ty0 = ax.pt + 34, len = 150;
    var e = stretch(tt) / XPK;
    c.save();
    c.strokeStyle = K.MUT; c.lineWidth = 2;
    c.beginPath(); c.moveTo(tx - 20, ty0); c.lineTo(tx + 20, ty0); c.stroke();
    c.strokeStyle = K.ORG; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(tx, ty0); c.lineTo(tx, ty0 + len * (1 + 0.28 * e)); c.stroke();
    c.fillStyle = K.INK;
    c.beginPath(); c.arc(tx, ty0 + len * (1 + 0.28 * e) + 10, 9, 0, 7); c.fill();
    c.restore();
    label(c, 'tendon', tx, ty0 - 16, { color: K.MUT, size: 11.5, align: 'center' });
    label(c, fmt(stretch(tt), 1) + ' mm', tx, ty0 + len * (1 + 0.28 * e) + 32,
          { color: K.ORG, size: 12.5, align: 'center' });

    var Umax = stored(TST / 2), Uret = Umax * (1 - hyst / 100);
    var Unow = stored(tt);
    label(c, 'stored ' + fmt(Unow, 1) + ' J', ax.X(TST / 2), ax.Y(FMAX * 0.46),
          { color: K.INK, size: 14, align: 'center', plate: true });

    out.innerHTML = 'peak stretch <b>' + fmt(XPK, 0) + ' mm</b> stores <b>' + fmt(Umax, 1) +
      ' J</b>; the tendon gives back <b>' + fmt(Uret, 1) + ' J</b> (' + fmt(100 - hyst, 0) + '%)' +
      '<span style="opacity:.72">  ·  about ' + fmt(100 * Uret / STEP, 0) +
      '% of the ≈' + STEP + ' J a running step needs — energy the muscles never had to make</span>';
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    tt += dt * 150;
    if (tt >= TST) { tt = TST; sT.quiet(tt); draw(); stop(); return; }
    sT.quiet(tt); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (playing) return;
    if (tt >= TST - 1e-6) tt = 0;
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  }

  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () { playing ? stop() : start(); });
  var sT = slider(row, 'Through the stance', 0, TST, 1, tt,
    function (q) { return fmt(q, 0) + ' ms'; },
    function (q) { stop(); tt = q; draw(); });
  slider(u.ctl, 'Energy lost in the tendon', 0, 25, 1, hyst,
    function (q) { return fmt(q, 0) + '%'; }, function (q) { hyst = q; draw(); });
  node._draw = draw; node._stop = stop;
  draw();
});


/* ============================================================
   15. COUNTERMOVEMENT AGAINST SQUAT JUMP
   The two jumps run together. The dip costs nothing in height and buys
   8 cm, and the figure is the two traces that produce that difference.
   ============================================================ */
D.register('cmjsj', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 940, h: port ? 480 : 430,
                            padl: 78, padr: 210, padt: 30, padb: 54 });
  var out = readout(u.ctl);
  var H_SJ = 0.32, H_CMJ = 0.40, M = 75;
  var tt = 0, playing = false, raf = null, last = 0;
  var TSHOW = 1.7;

  /* the two force records, idealised to the two jump heights they produce */
  function sj(t) {                               /* starts already crouched */
    if (t < 0.25 || t > 0.62) return M * G;
    var uu = (t - 0.25) / 0.37;
    return M * G + 980 * Math.pow(Math.sin(Math.PI * uu), 2);
  }
  function cmj(t) {
    if (t < 0.08) return M * G;
    if (t < 0.40) return M * G - 430 * Math.pow(Math.sin(Math.PI * (t - 0.08) / 0.32), 2);
    if (t > 0.78) return M * G;
    return M * G + 1210 * Math.pow(Math.sin(Math.PI * (t - 0.40) / 0.38), 2);
  }
  function hgt(t, T0, H) {                       /* the flight, once airborne */
    if (t < T0) return 0;
    var v = Math.sqrt(2 * G * H), tf = t - T0;
    return Math.max(0, v * tf - 0.5 * G * tf * tf);
  }

  function draw() {
    var c = ax.c, K = C(), i, t;
    ax.clear();
    var FMAX = 2100;
    ax.setRange(0, 1.0, 0, FMAX);
    ax.frame({ grid: true, xticks: [0, 0.2, 0.4, 0.6, 0.8, 1.0], yticks: axisTicks(0, FMAX),
               xlabel: 'Time (s)', ylabel: 'Ground reaction force (N)', ysize: 13, ylabelx: 15,
               xfmt: function (q) { return q.toFixed(1); },
               yfmt: function (q) { return q.toFixed(0); } });
    ax.poly([[0, M * G], [1, M * G]], { color: K.MUT, width: 1.3, dash: [5, 4] });

    var a = [], b = [];
    for (i = 0; i <= 240; i++) { t = i / 240; a.push([t, sj(t)]); b.push([t, cmj(t)]); }
    ax.poly(a, { color: K.MUT, width: 2.4 });
    ax.poly(b, { color: K.BLUE, width: 2.8 });
    if (tt <= 1) {
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2;
      c.beginPath(); c.moveTo(ax.X(tt), ax.Y(0)); c.lineTo(ax.X(tt), ax.Y(FMAX)); c.stroke(); c.restore();
    }
    key(c, ax.X(0.02), ax.pt + 4, [[K.MUT, 'squat jump — no dip'],
                                   [K.BLUE, 'countermovement jump']], { size: 12 });

    /* the two jumpers, in the right margin, on a shared height scale */
    var hs = hgt(tt, 0.62, H_SJ), hc = hgt(tt, 0.78, H_CMJ);
    var gx0 = ax.W - 168, gx1 = ax.W - 58, gy = ax.Y(0), topY = ax.pt + 34;
    var PPM = (gy - topY) / 0.46;
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1;
    c.beginPath(); c.moveTo(gx0 - 16, gy); c.lineTo(gx1 + 16, gy); c.stroke(); c.restore();
    [[gx0, hs, K.MUT, 'SJ', H_SJ], [gx1, hc, K.BLUE, 'CMJ', H_CMJ]].forEach(function (j) {
      /* a faint column from the floor to this jumper's best height, so the
         ball has something to travel along and the peak is readable even
         while the ball is somewhere else */
      c.save(); c.strokeStyle = j[2]; c.globalAlpha = .18; c.lineWidth = 20;
      c.beginPath(); c.moveTo(j[0], gy); c.lineTo(j[0], gy - j[4] * PPM); c.stroke(); c.restore();
      c.save(); c.strokeStyle = j[2]; c.globalAlpha = .8; c.lineWidth = 2;
      c.beginPath(); c.moveTo(j[0] - 22, gy - j[4] * PPM); c.lineTo(j[0] + 22, gy - j[4] * PPM);
      c.stroke(); c.restore();
      label(c, fmt(100 * j[4], 0) + ' cm', j[0], gy - j[4] * PPM - 16,
            { color: j[2], size: 12, align: 'center', plate: true });
      c.save(); c.fillStyle = j[2]; c.beginPath();
      c.arc(j[0], gy - j[1] * PPM - 10, 10, 0, 7); c.fill(); c.restore();
      label(c, j[3], j[0], gy + 18, { color: j[2], size: 12.5, align: 'center' });
    });
    /* the arrow sits between the two columns and its label beside it, or the
       two jumpers and the number all land on each other */
    var mxx = (gx0 + gx1) / 2;
    arrow(c, mxx, gy - H_SJ * PPM, mxx, gy - H_CMJ * PPM, { color: K.GRN, width: 2 });
    label(c, '+' + fmt(100 * (H_CMJ - H_SJ), 0) + ' cm', mxx + 9,
          gy - (H_CMJ + H_SJ) / 2 * PPM,
          { color: K.GRN, size: 13, align: 'left', plate: true });

    out.innerHTML = 'squat jump <b>' + fmt(100 * H_SJ, 0) + ' cm</b> · countermovement jump <b>' +
      fmt(100 * H_CMJ, 0) + ' cm</b> — <b>+' + fmt(100 * (H_CMJ - H_SJ), 0) + ' cm</b>' +
      '<span style="opacity:.72">  ·  elastic return, force already built before shortening, ' +
      'and a stretch reflex — all three, not one</span>';
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    tt += dt * 0.55;
    if (tt >= TSHOW) { tt = TSHOW; sT.quiet(tt); draw(); stop(); return; }
    sT.quiet(tt); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (playing) return;
    if (tt >= TSHOW - 1e-6) tt = 0;
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  }

  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () { playing ? stop() : start(); });
  var sT = slider(row, 'Run both jumps', 0, TSHOW, 0.005, tt,
    function (q) { return fmt(q, 2) + ' s'; },
    function (q) { stop(); tt = q; draw(); });
  node._draw = draw; node._stop = stop;
  draw();
});


/* ============================================================
   16. THE WHOLE LECTURE ON ONE MOVEMENT
   Work, kinetic energy, potential energy and power are four readings off
   the same record. Scrub it and watch all four move together.
   ============================================================ */
D.register('energymap', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 420,
                            padl: 78, padr: 26, padt: 74, padb: 52 });
  var out = readout(u.ctl);
  var m = JUMP.m0, BW = m * G;
  var cur = 0.90;

  function workTo(t) {
    var W = 0, i, a, b;
    for (i = 1; i <= JUMP.n; i++) {
      a = JUMP.tab[i - 1]; b = JUMP.tab[i];
      if (b.t > t) break;
      W += ((a.f + BW) + (b.f + BW)) / 2 * (b.s - a.s);
    }
    return W;
  }

  function draw() {
    var c = ax.c, K = C(), t;
    ax.clear();
    var now = JUMP.at(cur);
    var W = workTo(cur), KE = 0.5 * m * now.v * now.v, PE = m * G * now.s;
    var P = (now.f + BW) * now.v;

    /* four tiles across the top — the four quantities of the lecture */
    var tiles = [
      ['WORK  W = F·d', num(W, 0) + ' J', K.BLUE],
      ['KINETIC  ½mv²', num(KE, 0) + ' J', K.GRN],
      ['POTENTIAL  mgh', num(PE, 0) + ' J', K.ORG],
      ['POWER  F·v', num(P, 0) + ' W', K.ACC]
    ];
    var tw = (ax.W - 40) / 4;
    tiles.forEach(function (tl, i) {
      var x = 20 + tw * i;
      c.save(); c.fillStyle = K.PANEL; c.globalAlpha = .45;
      c.fillRect(x + 4, 8, tw - 8, 54); c.globalAlpha = 1; c.restore();
      label(c, tl[0], x + tw / 2, 24, { color: K.MUT, size: 11, align: 'center' });
      label(c, tl[1], x + tw / 2, 47, { color: tl[2], size: 19, align: 'center' });
    });

    var FMAX = 1900;
    ax.setRange(JUMP.t0, JUMP.t1, 0, FMAX);
    ax.frame({ grid: true, xticks: [0, 0.2, 0.4, 0.6, 0.8, 1.0], yticks: axisTicks(0, FMAX),
               xlabel: 'Time (s)', ylabel: 'Ground reaction force (N)', ysize: 13, ylabelx: 15,
               xfmt: function (q) { return q.toFixed(1); },
               yfmt: function (q) { return q.toFixed(0); } });
    ax.poly([[JUMP.t0, BW], [JUMP.t1, BW]], { color: K.MUT, width: 1.3, dash: [5, 4] });
    var all = [], live = [];
    for (t = JUMP.t0; t <= JUMP.t1; t += JUMP.dt * 4) {
      all.push([t, JUMP.force(t, m)]);
      if (t <= cur) live.push([t, JUMP.force(t, m)]);
    }
    if (live.length > 1) fillTo(ax, live, BW, K.FILL2);
    ax.poly(all, { color: K.BLUE, width: 2.4 });
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2;
    c.beginPath(); c.moveTo(ax.X(cur), ax.Y(0)); c.lineTo(ax.X(cur), ax.Y(FMAX)); c.stroke(); c.restore();

    out.innerHTML = 'one jump, four quantities · v = <b>' + num(now.v, 2) + ' m/s</b>' +
      '<span style="opacity:.72">  ·  W = ΔKE + ΔPE at every instant, which is the ' +
      'whole lecture in one line</span>';
  }

  slider(u.ctl, 'Through the jump', JUMP.t0, JUMP.t1, 0.005, cur,
    function (q) { return fmt(q, 2) + ' s'; }, function (q) { cur = q; draw(); });
  node._draw = draw;
  draw();
});

/* Build every figure on the page. Each lecture's own script does this at the
   end of itself, once deck-core and the widget registry are both in place. */
D.boot();

})();
