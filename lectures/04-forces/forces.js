/* ============================================================
   EPHE 341 — Forces
   Interactive figures. Needs deck-core.js. No other dependencies.

   Everything here is drawn on a canvas through DECK's Axes helper, which
   means one coordinate system for the physics and one for the picture. Where
   a figure is a diagram rather than a graph (the incline, the vector anatomy)
   the Axes box is used only as a pixel canvas and the drawing is done in
   canvas coordinates, with `fluid: false` so a portrait phone does not
   stretch it.
   ============================================================ */
(function () {
'use strict';

var D = window.DECK;
var Axes = D.Axes, el = D.el, slider = D.slider, playBtn = D.playBtn,
    readout = D.readout, build = D.build, axisTicks = D.axisTicks;
function C() { return D.colors(); }
var G = 9.81;

/* ---------------- small shared UI ---------------- */

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
  var row = el('div', 'icalc-chips');
  var btns = [];
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
  return { row: row, btns: btns,
           light: function (k) {
             btns.forEach(function (b, i) { b.classList.toggle('on', items[i][0] === k); });
           } };
}

function ctlRow(host) { var r = el('div', 'ictl-row'); host.appendChild(r); return r; }

/* ---------------- drawing helpers (canvas pixels) ---------------- */

/* An arrow from (x1,y1) to (x2,y2). Everything in this lecture is a vector,
   so this is the single most used function in the file. */
function arrow(c, x1, y1, x2, y2, o) {
  o = o || {};
  var col = o.color || '#888', w = o.width || 3, head = o.head || (7 + w * 1.6);
  var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  if (L < 0.5) return;
  var ux = dx / L, uy = dy / L;
  var bx = x2 - ux * head, by = y2 - uy * head;
  c.save();
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.lineCap = 'round';
  if (o.dash) c.setLineDash(o.dash);
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(bx, by); c.stroke();
  c.setLineDash([]);
  c.beginPath();
  c.moveTo(x2, y2);
  c.lineTo(bx - uy * head * 0.42, by + ux * head * 0.42);
  c.lineTo(bx + uy * head * 0.42, by - ux * head * 0.42);
  c.closePath(); c.fill();
  c.restore();
}

/* A dashed line right across the canvas through (x,y) at an angle — the line
   of action of a force, and the axes of a tilted coordinate system. */
function ray(c, x, y, ang, len, col, dash) {
  c.save();
  c.strokeStyle = col; c.lineWidth = 1.2; c.setLineDash(dash || [6, 5]);
  c.beginPath();
  c.moveTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len);
  c.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  c.stroke(); c.restore();
}

function label(c, s, x, y, o) {
  o = o || {};
  c.save();
  c.font = (o.weight || '700') + ' ' + (o.size || 14) + 'px ui-sans-serif,system-ui,sans-serif';
  c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'middle';
  if (o.plate) {
    var w = c.measureText(s).width, pad = 4;
    var ox = o.align === 'right' ? -w - pad : (o.align === 'center' ? -w / 2 - pad : -pad);
    c.fillStyle = C().PLATE; c.globalAlpha = 0.86;
    c.fillRect(x + ox, y - (o.size || 14) * 0.72, w + pad * 2, (o.size || 14) * 1.44);
    c.globalAlpha = 1;
  }
  c.fillStyle = o.color || C().INK;
  c.fillText(s, x, y);
  c.restore();
}

/* An angle arc between two directions, with the angle written on it. */
function arc(c, x, y, r, a1, a2, col, txt) {
  c.save();
  c.strokeStyle = col; c.lineWidth = 1.6; c.setLineDash([3, 3]);
  c.beginPath(); c.arc(x, y, r, Math.min(a1, a2), Math.max(a1, a2)); c.stroke();
  c.restore();
  if (txt) {
    var am = (a1 + a2) / 2;
    label(c, txt, x + Math.cos(am) * (r + 15), y + Math.sin(am) * (r + 15),
          { color: col, size: 13, align: 'center', plate: true });
  }
}

function fmt(v, n) { return (Math.round(v * Math.pow(10, n || 1)) / Math.pow(10, n || 1)).toFixed(n == null ? 1 : n); }
function minus(s) { return String(s).replace(/-/g, '−'); }


/* ============================================================
   1. ANATOMY OF A FORCE VECTOR
   Magnitude, direction, line of action, point of application — the four
   things the slide lists, each one attached to the thing on screen that
   actually shows it.
   ============================================================ */
D.register('vector', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 440 : 620, h: port ? 400 : 420,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var mag = 600, ang = 35, ap = 'centre';
  var MAXF = 1000;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();

    /* The object sits on the LEFT and the force pulls away from it to the
       upper right, so the angle arc, the magnitude bracket and the extended
       line of action all have empty canvas to live in. */
    var ox = W * 0.28, oy = H * 0.62, R = 52;
    c.save();
    c.fillStyle = K.FILL; c.strokeStyle = K.BLUE; c.lineWidth = 2;
    c.beginPath(); c.arc(ox, oy, R, 0, 7); c.fill(); c.stroke();
    c.restore();

    /* where on the object the force is applied */
    var pa = ap === 'centre' ? [ox + R, oy]
           : ap === 'top' ? [ox + R * 0.62, oy - R * 0.78]
           : [ox + R * 0.62, oy + R * 0.78];

    var th = -ang * Math.PI / 180;                      /* screen y is down */
    var len = 80 + (mag / MAXF) * 175;
    var tx = pa[0] + Math.cos(th) * len, ty = pa[1] + Math.sin(th) * len;

    /* the line of action runs right through, both ways */
    ray(c, pa[0], pa[1], th, 400, K.MUT, [7, 6]);

    /* the reference axis the direction is measured from */
    c.save();
    c.strokeStyle = K.SOFT; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(pa[0] - 40, pa[1]); c.lineTo(W - 28, pa[1]); c.stroke();
    c.restore();
    label(c, 'x', W - 20, pa[1] + 2, { color: K.MUT, size: 15 });

    arrow(c, pa[0], pa[1], tx, ty, { color: K.ACC, width: 4.5 });

    /* --- magnitude: a dimension bracket above the shaft --- */
    var nx = Math.sin(th), ny = -Math.cos(th), off = 26;
    c.save();
    c.strokeStyle = K.ACC; c.lineWidth = 1.3; c.setLineDash([2, 3]);
    c.beginPath();
    c.moveTo(pa[0] + nx * off, pa[1] + ny * off);
    c.lineTo(tx + nx * off, ty + ny * off);
    c.stroke();
    [[pa[0], pa[1]], [tx, ty]].forEach(function (q) {
      c.beginPath();
      c.moveTo(q[0] + nx * 7, q[1] + ny * 7);
      c.lineTo(q[0] + nx * (off + 7), q[1] + ny * (off + 7));
      c.stroke();
    });
    c.restore();
    var mx = (tx + pa[0]) / 2, my = (ty + pa[1]) / 2;
    label(c, fmt(mag, 0) + ' N', mx + nx * (off + 17), my + ny * (off + 17),
          { color: K.ACC, size: 17, align: 'center', plate: true });
    label(c, 'magnitude', mx + nx * (off + 39), my + ny * (off + 39),
          { color: K.MUT, size: 13, align: 'center', weight: '600', plate: true });

    /* --- direction: the wedge between the x axis and the force --- */
    arc(c, pa[0], pa[1], 62, th, 0, K.ORG, fmt(ang, 0) + '\u00b0');
    label(c, 'direction', pa[0] + 120, pa[1] + 50,
          { color: K.ORG, size: 13, weight: '600', align: 'center', plate: true });

    /* --- the two that are about where, not how much --- */
    label(c, 'line of action',
          pa[0] - Math.cos(th) * 150, pa[1] - Math.sin(th) * 150 + 16,
          { color: K.MUT, size: 13, weight: '600', align: 'center', plate: true });
    c.save();
    c.fillStyle = K.ACC; c.strokeStyle = K.PLATE; c.lineWidth = 2;
    c.beginPath(); c.arc(pa[0], pa[1], 6, 0, 7); c.fill(); c.stroke();
    c.restore();
    label(c, 'point of application', pa[0] - 14, pa[1] + 30,
          { color: K.ACC, size: 13, weight: '600', align: 'right', plate: true });

    var turns = ap !== 'centre';
    out.innerHTML =
      '<b class="r">' + fmt(mag, 0) + ' N</b> at <b>' + fmt(ang, 0) + '\u00b0</b> above the x axis' +
      ' &nbsp;\u00b7&nbsp; applied at the <b>' + (ap === 'centre' ? 'centre' : 'edge') + '</b>' +
      '<span class="hint">' +
      (turns ? 'The same force off-centre still pushes the object along the line of action \u2014 ' +
               'but it also turns it. That turning effect is a moment, and it is its own lecture.'
             : 'Magnitude changes the length, direction swings the whole line of action, and the ' +
               'point of application decides where on the object it acts. Move it off the centre.') +
      '</span>';
  }

  var r = ctlRow(u.ctl);
  seg(r, [['centre', 'through the centre'], ['top', 'at the top edge'], ['side', 'at the side']],
      ap, function (v) { ap = v; draw(); });
  slider(u.ctl, 'Magnitude', 50, MAXF, 10, mag, function (v) { return fmt(v, 0) + ' N'; },
         function (v) { mag = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'Direction', 0, 180, 1, ang, function (v) { return fmt(v, 0) + '\u00b0'; },
         function (v) { ang = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0) + '\u00b0'; } });
  node._draw = draw;
  draw();
});


/* ============================================================
   2. F = ma
   One newton is the force that accelerates one kilogram at one metre per
   second squared. The figure is that sentence with the numbers movable.
   ============================================================ */
D.register('fma', function (node, d) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 820, h: 320, padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var m = 1, a = 1;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var F = m * a;

    /* the floor */
    var fy = H * 0.62;
    c.save();
    c.strokeStyle = K.SOFT; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(40, fy); c.lineTo(W - 40, fy); c.stroke();
    c.restore();

    /* the block: its area goes with the mass, so 10 kg looks like 10 kg */
    var side = 26 + Math.sqrt(m) * 26;
    var bx = W * 0.30, by = fy - side / 2;
    c.save();
    c.fillStyle = K.FILL; c.strokeStyle = K.BLUE; c.lineWidth = 2;
    c.fillRect(bx - side / 2, by - side / 2, side, side);
    c.strokeRect(bx - side / 2, by - side / 2, side, side);
    c.restore();
    label(c, fmt(m, 1) + ' kg', bx, by, { color: K.BLUE, size: 15, align: 'center' });

    /* the push, and the motion it causes */
    var L = 30 + F * 16;
    arrow(c, bx - side / 2 - L, by, bx - side / 2 - 6, by, { color: K.ACC, width: 5 });
    label(c, 'F = ' + fmt(F, 2) + ' N', bx - side / 2 - L / 2 - 6, by - side / 2 - 22,
          { color: K.ACC, size: 16, align: 'center' });

    /* ghosts of where it will be, spaced by ½at² — the picture of acceleration */
    c.save();
    c.globalAlpha = 0.30;
    for (var k = 1; k <= 3; k++) {
      var dx = 0.5 * a * Math.pow(k * 0.30, 2) * 46;
      c.strokeStyle = K.BLUE; c.lineWidth = 1.4; c.setLineDash([4, 3]);
      c.strokeRect(bx + dx - side / 2, by - side / 2, side, side);
    }
    c.restore();
    arrow(c, bx + side / 2 + 10, fy + 30, bx + side / 2 + 10 + 40 + a * 26, fy + 30,
          { color: K.MUT, width: 2 });
    label(c, 'a = ' + fmt(a, 2) + ' m/s²', bx + side / 2 + 14, fy + 52,
          { color: K.MUT, size: 13 });

    /* the equation, on the right, with the numbers in it */
    var ex = W * 0.70, ey = H * 0.34;
    label(c, 'F = m × a', ex, ey, { color: K.INK, size: 30, align: 'center' });
    label(c, fmt(F, 2) + ' N  =  ' + fmt(m, 1) + ' kg  ×  ' + fmt(a, 2) + ' m/s²',
          ex, ey + 44, { color: K.ACC, size: 19, align: 'center' });
    var one = Math.abs(m - 1) < 0.051 && Math.abs(a - 1) < 0.051;
    if (one) {
      label(c, 'this is the definition of one newton', ex, ey + 84,
            { color: K.GRN, size: 14, align: 'center', weight: '700' });
    }

    out.innerHTML =
      '<b class="r">' + fmt(m * a, 2) + ' N</b> = ' + fmt(m, 1) + ' kg × ' + fmt(a, 2) + ' m/s²' +
      '<span class="hint">One newton is the force that accelerates one kilogram at one metre per ' +
      'second squared — set both sliders to 1 and the equation says so. Doubling either one ' +
      'doubles the force.</span>';
  }

  slider(u.ctl, 'Mass', 0.5, 10, 0.5, m, function (v) { return fmt(v, 1) + ' kg'; },
         function (v) { m = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'Acceleration', 0, 5, 0.1, a, function (v) { return fmt(v, 2) + ' m/s²'; },
         function (v) { a = v; draw(); }, { scale: 6, tick: function (v) { return fmt(v, 0); } });
  node._draw = draw;
  draw();
});


/* ============================================================
   3. WEIGHT IS A FORCE
   W = mg. The slide asks "what is your weight in newtons?" — so the figure
   asks for a mass and answers in newtons, and puts the answer beside the
   same body on other worlds, which is the quickest way to show that mass
   and weight are not the same thing.
   ============================================================ */
var WORLDS = [
  { k: 'earth',   name: 'Earth',   g: 9.81 },
  { k: 'moon',    name: 'Moon',    g: 1.62 },
  { k: 'mars',    name: 'Mars',    g: 3.72 },
  { k: 'jupiter', name: 'Jupiter', g: 24.79 }
];

D.register('weight', function (node, d) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 760, h: 330, padl: 74, padr: 22, padt: 24, padb: 52,
                            xmin: 0, xmax: 4, ymin: 0, ymax: 1 });
  var out = readout(u.ctl);
  var m = 70, world = 'earth';

  function draw() {
    var c = ax.c, K = C();
    var ws = WORLDS.map(function (w) { return m * w.g; });
    var top = Math.max.apply(null, ws) * 1.14;
    ax.clear();
    ax.setRange(-0.5, 3.5, 0, top);
    ax.frame({ grid: true, xticks: [], yticks: axisTicks(0, top, 4),
               ylabel: 'weight (N)', yfmt: function (v) { return fmt(v, 0); } });
    WORLDS.forEach(function (w, i) {
      var on = w.k === world;
      ax.rect(i - 0.3, 0, i + 0.3, m * w.g,
              { fill: on ? K.ACCFILL : K.FILL, stroke: on ? K.ACC : K.SOFT, width: on ? 2 : 1 });
      label(c, w.name, ax.X(i), ax.H - ax.pb + 16,
            { color: on ? K.ACC : K.MUT, size: 14, align: 'center', base: 'top' });
      label(c, fmt(m * w.g, 0) + ' N', ax.X(i), ax.Y(m * w.g) - 14,
            { color: on ? K.ACC : K.MUT, size: 14, align: 'center' });
      label(c, 'g = ' + w.g, ax.X(i), ax.H - ax.pb + 34,
            { color: K.MUT, size: 12, align: 'center', base: 'top', weight: '600' });
    });
    var w0 = WORLDS.filter(function (w) { return w.k === world; })[0];
    out.innerHTML =
      'W = mg = ' + fmt(m, 0) + ' × ' + w0.g + ' = <b class="r">' + fmt(m * w0.g, 0) + ' N</b>' +
      ' &nbsp;·&nbsp; on ' + w0.name +
      '<span class="hint">The mass never changes — ' + fmt(m, 0) + ' kg is ' + fmt(m, 0) +
      ' kg anywhere. The weight is a <b>force</b>, and it changes with whatever is pulling on you. ' +
      'On Earth, multiply kilograms by about ten to get newtons.</span>';
  }

  slider(u.ctl, 'Body mass', 20, 140, 1, m, function (v) { return fmt(v, 0) + ' kg'; },
         function (v) { m = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  seg(ctlRow(u.ctl), WORLDS.map(function (w) { return [w.k, w.name]; }), world,
      function (v) { world = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   4. PRESSURE  P = F/A
   The slide's point is that pressure is cheap to measure and force is not.
   So the example is the thing you actually buy: an insole that samples the
   pressure under the foot on a grid of sensels, and gets the force back by
   adding up pressure × cell area. Coarsen the grid and watch the total
   drift — which is exactly the "approximation of force" caveat on the next
   slide.
   ============================================================ */
var FOOT_L = 0.26, FOOT_W = 0.098;       /* metres: a men's 9              */

/* half-width of the foot, in units of FOOT_W/2, at u along its length */
function footW(u) {
  if (u < 0 || u > 1) return 0;
  var base = Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.5) / 0.545, 2)));
  return base * (0.78 + 0.34 * Math.exp(-Math.pow((u - 0.74) / 0.20, 2)));
}
/* inside the outline? v runs -1 (lateral) to +1 (medial); the arch is a
   notch taken out of the medial border. */
function inFoot(u, v) {
  var w = footW(u);
  if (w <= 0) return false;
  if (v > 0) w -= 0.34 * Math.exp(-Math.pow((u - 0.44) / 0.15, 2));
  return Math.abs(v) <= w;
}

/* the pressure field: four loading centres that come and go through stance */
function footField(u, v, t) {
  function blob(cu, cv, su, sv, a) {
    return a * Math.exp(-Math.pow((u - cu) / su, 2) - Math.pow((v - cv) / sv, 2));
  }
  function ph(c, s) { return Math.exp(-Math.pow((t - c) / s, 2)); }
  return blob(0.13, -0.05, 0.11, 0.62, 1.00 * ph(0.16, 0.20)) +
         blob(0.42, -0.62, 0.13, 0.42, 0.34 * ph(0.42, 0.26)) +
         blob(0.72,  0.34, 0.10, 0.44, 1.05 * ph(0.70, 0.22)) +
         blob(0.72, -0.48, 0.10, 0.40, 0.74 * ph(0.66, 0.22)) +
         blob(0.93,  0.36, 0.07, 0.34, 0.62 * ph(0.88, 0.16));
}

function heat(x) {                        /* 0..1 -> a pressure colour      */
  x = Math.max(0, Math.min(1, x));
  var stops = [[0.00, 44, 56, 104], [0.28, 30, 105, 205], [0.50, 34, 185, 145],
               [0.70, 235, 205, 60], [0.86, 240, 130, 40], [1.00, 220, 40, 40]];
  for (var i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      var a = stops[i - 1], b = stops[i], f = (x - a[0]) / (b[0] - a[0]);
      return 'rgb(' + Math.round(a[1] + (b[1] - a[1]) * f) + ',' +
                      Math.round(a[2] + (b[2] - a[2]) * f) + ',' +
                      Math.round(a[3] + (b[3] - a[3]) * f) + ')';
    }
  }
  return 'rgb(220,40,40)';
}

D.register('pressure', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 880, h: port ? 520 : 420,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var m = 78, N = 8, t = 0.70;

  /* ---- the arithmetic, done once per redraw ------------------------- */
  function solve() {
    var F = m * G * 1.05;                 /* one foot, mid-stance          */
    var NU = 160, NV = 64, i, j, uu, vv, s = 0, area = 0;
    var dA = (FOOT_L / NU) * (FOOT_W / NV);
    for (i = 0; i < NU; i++) {
      uu = (i + 0.5) / NU;
      for (j = 0; j < NV; j++) {
        vv = -1 + 2 * (j + 0.5) / NV;
        if (!inFoot(uu, vv)) continue;
        area += dA;
        s += footField(uu, vv, t) * dA;
      }
    }
    var k = s > 0 ? F / s : 0;            /* Pa per field unit             */

    /* now the sensor array: NxM cells, each reporting the pressure at its
       own centre, force = Σ P·A */
    var M = Math.max(2, Math.round(N * FOOT_L / FOOT_W / 2.2));
    var cells = [], est = 0, cA = (FOOT_L / M) * (FOOT_W / N);
    for (i = 0; i < M; i++) {
      for (j = 0; j < N; j++) {
        uu = (i + 0.5) / M; vv = -1 + 2 * (j + 0.5) / N;
        if (!inFoot(uu, vv)) continue;
        var Pc = footField(uu, vv, t) * k;
        cells.push({ i: i, j: j, p: Pc });
        est += Pc * cA;
      }
    }
    var pk = 0;
    for (i = 0; i < NU; i++) {
      uu = (i + 0.5) / NU;
      for (j = 0; j < NV; j++) {
        vv = -1 + 2 * (j + 0.5) / NV;
        if (inFoot(uu, vv)) pk = Math.max(pk, footField(uu, vv, t) * k);
      }
    }
    return { F: F, k: k, area: area, cells: cells, M: M, cA: cA, est: est, peak: pk };
  }

  function drawFoot(c, K, x0, y0, w, h, S, mode) {
    var NU = mode === 'true' ? 120 : S.M, NV = mode === 'true' ? 48 : N;
    var i, j;
    for (i = 0; i < NU; i++) {
      for (j = 0; j < NV; j++) {
        var uu = (i + 0.5) / NU, vv = -1 + 2 * (j + 0.5) / NV;
        if (!inFoot(uu, vv)) continue;
        var P = footField(uu, vv, t) * S.k;
        c.fillStyle = heat(P / S.peak);
        var cx = x0 + (vv / 2 + 0.5) * w, cy = y0 + h - uu * h;
        c.fillRect(cx - w / NV / 2 - 0.6, cy - h / NU / 2 - 0.6,
                   w / NV + 1.2, h / NU + 1.2);
      }
    }
    /* the outline, so the shape reads as a foot whatever the resolution */
    c.save();
    c.strokeStyle = K.INK; c.globalAlpha = 0.75; c.lineWidth = 1.6;
    c.beginPath();
    var first = true, uu2;
    for (uu2 = 0; uu2 <= 1.0001; uu2 += 0.01) {
      var wv = footW(uu2);
      var px = x0 + (-wv / 2 + 0.5) * w, py = y0 + h - uu2 * h;
      if (first) { c.moveTo(px, py); first = false; } else c.lineTo(px, py);
    }
    for (uu2 = 1; uu2 >= -0.0001; uu2 -= 0.01) {
      var wv2 = footW(uu2) - 0.34 * Math.exp(-Math.pow((uu2 - 0.44) / 0.15, 2));
      c.lineTo(x0 + (wv2 / 2 + 0.5) * w, y0 + h - uu2 * h);
    }
    c.closePath(); c.stroke(); c.restore();

    if (mode !== 'true') {
      c.save();
      c.strokeStyle = K.PLATE; c.globalAlpha = 0.5; c.lineWidth = 0.8;
      for (i = 0; i <= S.M; i++) {
        c.beginPath(); c.moveTo(x0, y0 + h - i * h / S.M);
        c.lineTo(x0 + w, y0 + h - i * h / S.M); c.stroke();
      }
      for (j = 0; j <= N; j++) {
        c.beginPath(); c.moveTo(x0 + j * w / N, y0); c.lineTo(x0 + j * w / N, y0 + h); c.stroke();
      }
      c.restore();
    }
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var S = solve();

    var fw = W * 0.125, fh = H * 0.78, fy = H * 0.13;
    drawFoot(c, K, W * 0.035, fy, fw, fh, S, 'true');
    drawFoot(c, K, W * 0.205, fy, fw, fh, S, 'grid');
    label(c, 'the real pressure', W * 0.035 + fw / 2, fy - 14,
          { color: K.MUT, size: 12.5, align: 'center' });
    label(c, S.M + ' × ' + N + ' sensels', W * 0.205 + fw / 2, fy - 14,
          { color: K.MUT, size: 12.5, align: 'center' });

    /* colour scale */
    var bx = W * 0.355, bw = 16, bh = fh * 0.80, by = fy + fh * 0.10, i;
    for (i = 0; i < 60; i++) {
      c.fillStyle = heat(i / 59);
      c.fillRect(bx, by + bh - (i + 1) * bh / 60, bw, bh / 60 + 1);
    }
    label(c, fmt(S.peak / 1000, 0) + ' kPa', bx + bw + 6, by, { color: K.MUT, size: 12 });
    label(c, '0', bx + bw + 6, by + bh, { color: K.MUT, size: 12 });

    /* the arithmetic */
    var ex = W * 0.47, ey = H * 0.20;
    label(c, 'P  =  F / A', ex, ey, { color: K.INK, size: 25 });
    label(c, 'one sensel:  ' + fmt(S.cA * 10000, 2) + ' cm²  ·  peak  ' +
             fmt(S.peak / 1000, 0) + ' kPa', ex, ey + 34, { color: K.MUT, size: 14.5 });

    label(c, 'F  =  Σ  P · A', ex, ey + 86, { color: K.INK, size: 25 });
    label(c, 'add up every cell: pressure × its area', ex, ey + 120,
          { color: K.MUT, size: 14 });
    label(c, fmt(S.est, 0) + ' N', ex, ey + 158, { color: K.ACC, size: 26 });
    var err = (S.est - S.F) / S.F * 100;
    label(c, 'true load ' + fmt(S.F, 0) + ' N   ·   off by ' +
             (err >= 0 ? '+' : '−') + fmt(Math.abs(err), 1) + ' %',
          ex, ey + 192, { color: Math.abs(err) > 6 ? K.ACC : K.GRN, size: 15 });

    out.innerHTML =
      '<b>' + S.M + ' × ' + N + '</b> sensels of ' + fmt(S.cA * 10000, 2) +
      ' cm² &nbsp;·&nbsp; peak <b class="r">' + fmt(S.peak / 1000, 0) +
      ' kPa</b> &nbsp;·&nbsp; Σ P·A = <b class="r">' + fmt(S.est, 0) +
      ' N</b> against a true ' + fmt(S.F, 0) + ' N' +
      '<span class="hint">A pressure sensor never measures force. It measures pressure on a known ' +
      'area and you add it back up — which is why an insole is an <i>approximation</i> of force, ' +
      'and why the number of sensels matters: coarsen the grid and the peaks fall between cells.</span>';
  }

  slider(u.ctl, 'Through stance', 0, 100, 1, t * 100,
    function (v) { return fmt(v, 0) + ' %'; }, function (v) { t = v / 100; draw(); });
  slider(u.ctl, 'Sensels across the foot', 2, 16, 1, N,
    function (v) { return fmt(v, 0); }, function (v) { N = v; draw(); });
  slider(u.ctl, 'Body mass', 40, 130, 1, m,
    function (v) { return fmt(v, 0) + ' kg'; }, function (v) { m = v; draw(); });

  node._draw = draw;
  draw();
});


/* ============================================================
   4b. MEASURING A MUSCLE FORCE IN A TENDON
   A buckle transducer or an optical fibre sewn into the Achilles gives a
   voltage that tracks the tension along the tendon. It gives one number —
   a MAGNITUDE. Where that force actually pushes and pulls depends on the
   line of the tendon, which the joint angle changes; so the reading is only
   half the vector, and the other half is the resolution done on the next
   slides.
   ============================================================ */
var ACH_PK = 3400;                       /* peak Achilles tension, running */

/* stance-phase tension: rises late, peaks near 60 %, falls off at toe-off */
function achForce(p) {
  if (p <= 0 || p >= 1) return 0;
  return ACH_PK * Math.pow(Math.sin(Math.PI * Math.pow(p, 1.25)), 2.1);
}

D.register('tendon', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 840, h: port ? 620 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);

  var kind = 'buckle';
  var phi = 8;                           /* plantarflexion, degrees        */
  var p = 0.60, playing = false, raf = null, last = 0;
  var showComp = d.comp !== '0';

  /* ---- the leg, in canvas pixels ------------------------------------- */
  function geom(W, H) {
    var S = port ? H * 0.28 : H * 0.56;
    var A = { x: (port ? W * 0.46 : W * 0.24), y: H * 0.70 };
    var f = phi * Math.PI / 180;
    function R(lx, ly) {
      return { x: A.x + (lx * Math.cos(f) - ly * Math.sin(f)) * S,
               y: A.y + (lx * Math.sin(f) + ly * Math.cos(f)) * S };
    }
    return {
      S: S, A: A, R: R,
      K:  { x: A.x, y: A.y - S * 1.05 },
      belly: { x: A.x - S * 0.16, y: A.y - S * 0.74, rx: S * 0.16, ry: S * 0.27 },
      Cp: { x: A.x - S * 0.135, y: A.y - S * 0.47 },   /* tendon leaves the belly */
      Hi: R(-0.25, -0.02),                             /* insertion on calcaneus */
      heel: R(-0.30, 0.17), ball: R(0.40, 0.17),
      toe: R(0.56, 0.17), tip: R(0.58, 0.10), dors: R(0.16, -0.05)
    };
  }

  function drawLeg(c, K, W, H) {
    var g = geom(W, H), S = g.S;
    var F = achForce(p);

    /* the ground the foot is standing on */
    var gy = Math.max(g.heel.y, g.toe.y) + 1;
    c.save();
    c.strokeStyle = K.SOFT; c.lineWidth = 2;
    c.beginPath(); c.moveTo(10, gy); c.lineTo(W * 0.52, gy); c.stroke();
    c.restore();

    /* tibia */
    c.save();
    c.strokeStyle = K.PANEL; c.lineWidth = S * 0.19; c.lineCap = 'round';
    c.beginPath(); c.moveTo(g.K.x, g.K.y); c.lineTo(g.A.x, g.A.y); c.stroke();
    c.restore();

    /* the foot */
    var R = g.R;
    c.save();
    c.fillStyle = K.PANEL; c.strokeStyle = K.SOFT; c.lineWidth = 1.4;
    c.beginPath();
    var P = [R(-0.30, 0.00), R(-0.31, 0.12), R(-0.22, 0.17), R(0.12, 0.13),
             R(0.40, 0.17), R(0.57, 0.16), R(0.56, 0.09), R(0.30, 0.03),
             R(0.14, -0.06), R(0.04, -0.03)];
    c.moveTo(P[0].x, P[0].y);
    c.quadraticCurveTo(P[1].x, P[1].y, P[2].x, P[2].y);
    c.quadraticCurveTo(P[3].x, P[3].y, P[4].x, P[4].y);
    c.lineTo(P[5].x, P[5].y); c.lineTo(P[6].x, P[6].y);
    c.quadraticCurveTo(P[7].x, P[7].y, P[8].x, P[8].y);
    c.lineTo(P[9].x, P[9].y);
    c.lineTo(g.Hi.x, g.Hi.y);
    c.closePath(); c.fill(); c.stroke();
    c.restore();

    /* gastrocnemius and soleus, tapering into the tendon */
    c.save();
    c.fillStyle = K.PANEL;
    c.beginPath();
    c.moveTo(g.A.x - S * 0.02, g.A.y - S * 0.98);
    c.quadraticCurveTo(g.A.x - S * 0.34, g.A.y - S * 0.78,
                       g.Cp.x - S * 0.01, g.Cp.y);
    c.quadraticCurveTo(g.A.x - S * 0.02, g.A.y - S * 0.66,
                       g.A.x - S * 0.02, g.A.y - S * 0.98);
    c.fill();
    c.restore();
    label(c, 'triceps surae', g.A.x - S * 0.40, g.A.y - S * 0.95,
          { color: K.MUT, size: 12, align: 'right' });

    /* the tendon: a short pale band from the belly to the calcaneus */
    var dx = g.Cp.x - g.Hi.x, dy = g.Cp.y - g.Hi.y, L = Math.hypot(dx, dy);
    var ux = dx / L, uy = dy / L;
    c.save();
    c.strokeStyle = K.MUT; c.globalAlpha = 0.85; c.lineWidth = S * 0.075; c.lineCap = 'butt';
    c.beginPath(); c.moveTo(g.Hi.x, g.Hi.y); c.lineTo(g.Cp.x, g.Cp.y); c.stroke();
    c.restore();

    /* the transducer sitting on it */
    var mx = g.Hi.x + ux * L * 0.52, my = g.Hi.y + uy * L * 0.52;
    var col = kind === 'buckle' ? K.ORG : K.GRN;
    c.save();
    c.translate(mx, my); c.rotate(Math.atan2(uy, ux) + Math.PI / 2);
    if (kind === 'buckle') {
      c.strokeStyle = col; c.lineWidth = 2.6;
      c.strokeRect(-S * 0.11, -S * 0.06, S * 0.22, S * 0.12);
      c.beginPath(); c.moveTo(-S * 0.11, 0); c.lineTo(S * 0.11, 0); c.stroke();
    } else {
      c.strokeStyle = col; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(-S * 0.16, 0); c.lineTo(S * 0.16, 0); c.stroke();
      c.fillStyle = col;
      c.beginPath(); c.arc(-S * 0.16, 0, 3.4, 0, 7); c.fill();
      c.beginPath(); c.arc(S * 0.16, 0, 3.4, 0, 7); c.fill();
    }
    c.restore();
    /* lead out to the amplifier */
    c.save();
    c.strokeStyle = col; c.lineWidth = 1.6; c.globalAlpha = 0.85;
    c.beginPath();
    c.moveTo(mx - S * 0.13, my);
    c.quadraticCurveTo(mx - S * 0.6, my + S * 0.18, W * 0.03, H * 0.86);
    c.stroke(); c.restore();
    label(c, kind === 'buckle' ? 'buckle transducer' : 'optical fibre',
          W * 0.03, H * 0.92, { color: col, size: 12.5 });

    /* what the sensor reads: tension along the tendon, pulling the heel up */
    var sc = (S * 0.78) / ACH_PK;
    var th = Math.atan2(-uy, ux) * 180 / Math.PI;
    arrow(c, g.Hi.x, g.Hi.y, g.Hi.x + ux * F * sc, g.Hi.y + uy * F * sc,
          { color: K.ACC, width: 4.6 });
    label(c, fmt(F, 0) + ' N', g.Hi.x + ux * F * sc + 12, g.Hi.y + uy * F * sc - 2,
          { color: K.ACC, size: 14.5, plate: true });

    /* and the half of the vector the sensor cannot give you */
    if (showComp && F > 40) {
      var fx = F * Math.cos(th * Math.PI / 180), fy = F * Math.sin(th * Math.PI / 180);
      var tx = g.Hi.x + fx * sc, ty = g.Hi.y - fy * sc;
      c.save();
      c.strokeStyle = K.BLUE; c.globalAlpha = 0.45; c.lineWidth = 1.3; c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx, g.Hi.y); c.stroke();
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(g.Hi.x, ty); c.stroke();
      c.restore();
      arrow(c, g.Hi.x, g.Hi.y, tx, g.Hi.y, { color: K.BLUE, width: 2.4 });
      arrow(c, g.Hi.x, g.Hi.y, g.Hi.x, ty, { color: K.BLUE, width: 2.4 });
      label(c, 'Fx = ' + minus(fmt(fx, 0)) + ' N', g.Hi.x - 14, g.Hi.y + 22,
            { color: K.BLUE, size: 12.5, align: 'right', plate: true });
      label(c, 'Fy = ' + fmt(fy, 0) + ' N', g.Hi.x - 16, (g.Hi.y + ty) / 2,
            { color: K.BLUE, size: 12.5, align: 'right', plate: true });
      arc(c, g.Hi.x, g.Hi.y, S * 0.34, 0, Math.atan2(uy, ux), K.ACC, fmt(th, 0) + '°');
    }
  }

  /* ---- the sensor trace, on the right -------------------------------- */
  function drawTrace(c, K, W, H) {
    ax.pl = W * 0.60; ax.pr = 22; ax.pt = 26; ax.pb = 54;
    ax.setRange(0, 100, 0, ACH_PK * 1.1);
    ax.frame({ grid: true, xticks: [0, 25, 50, 75, 100],
               yticks: [0, 1000, 2000, 3000],
               xlabel: 'stance phase (%)', ylabel: 'tendon tension (N)',
               ylabelx: W * 0.60 - 62, ysize: 15,
               yfmt: function (v) { return fmt(v, 0); } });
    var pts = [], i;
    for (i = 0; i <= 100; i++) pts.push([i, achForce(i / 100)]);
    ax.poly(pts, { color: K.ACC, width: 2.8 });
    /* what the amplifier actually writes down: the same shape, in millivolts */
    var noise = kind === 'buckle' ? 0.012 : 0.003;
    var n2 = [];
    for (i = 0; i <= 100; i++) {
      var f = achForce(i / 100);
      n2.push([i, f * (1 + noise * Math.sin(i * 2.3) + noise * Math.cos(i * 5.1))]);
    }
    ax.poly(n2, { color: kind === 'buckle' ? K.ORG : K.GRN, width: 1.6, dash: [5, 3] });
    ax.dots([[p * 100, achForce(p)]], { color: K.ACC, r: 5 });
    label(c, 'sensor output', ax.X(97), ax.Y(ACH_PK * 1.02),
          { color: kind === 'buckle' ? K.ORG : K.GRN, size: 12, align: 'right' });
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    drawLeg(c, K, W, H);
    drawTrace(c, K, W, H);

    var g = geom(W, H);
    var th = Math.atan2(-(g.Cp.y - g.Hi.y), g.Cp.x - g.Hi.x) * 180 / Math.PI;
    var F = achForce(p);
    out.innerHTML =
      'Tendon tension <b class="r">' + fmt(F, 0) + ' N</b> &nbsp;·&nbsp; ankle at ' +
      fmt(phi, 0) + '° plantarflexion, so the tendon pulls at <b>' + fmt(th, 0) + '°</b>' +
      ' &nbsp;·&nbsp; Fx = ' + minus(fmt(F * Math.cos(th * Math.PI / 180), 0)) + ' N, Fy = ' +
      fmt(F * Math.sin(th * Math.PI / 180), 0) + ' N' +
      '<span class="hint">The transducer gives one number — the magnitude. Move the ankle and ' +
      'the number does not change, but the direction does, and with it every component. That ' +
      'second half of the vector has to come from the anatomy, which is what resolving a force ' +
      'into components is for.</span>';
  }

  /* ---- controls ------------------------------------------------------ */
  var r1 = ctlRow(u.ctl);
  seg(r1, [['buckle', 'buckle transducer'], ['fibre', 'optical fibre']], kind,
      function (v) { kind = v; draw(); });
  var pb = playBtn(r1, '▶ Run the stance phase');
  var sP = slider(u.ctl, 'Through stance', 0, 100, 1, p * 100,
    function (v) { return fmt(v, 0) + ' %'; },
    function (v) { p = v / 100; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  var sA = slider(u.ctl, 'Ankle angle', -15, 35, 1, phi,
    function (v) { return (v < 0 ? fmt(-v, 0) + '° dorsiflexed' : fmt(v, 0) + '° plantarflexed'); },
    function (v) { phi = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0) + '°'; } });

  function step(ts) {
    if (!playing) return;
    var dt = last ? (ts - last) / 1000 : 0; last = ts;
    p += dt / 0.9;
    if (p >= 1) { p = 1; stop(); }
    sP.quiet(p * 100); draw();
    if (playing) raf = requestAnimationFrame(step);
  }
  function start() {
    if (playing) return;
    if (p >= 0.995) p = 0;
    playing = true; last = 0; pb.textContent = '❚❚ Pause';
    raf = requestAnimationFrame(step);
  }
  function stop() {
    playing = false; if (raf) cancelAnimationFrame(raf); raf = null;
    pb.textContent = '▶ Run the stance phase';
  }
  pb.addEventListener('click', function () { playing ? stop() : start(); });
  pb.setAttribute('data-unsafe', '1');

  node._stop = stop;
  node._draw = draw;
  draw();
});
/* ============================================================
   5. RESOLVING SEVERAL FORCES INTO ONE
   The quadriceps problem from the slide, worked the way the slide works it.
   Three muscle forces pulling on the patella; find the resultant.

   The five steps are the slide's own five steps, and each chip adds what
   that step adds — nothing is on screen before the step that produces it.
   ============================================================ */
/* The lecture's own numbers. fx and fy are the values the slide carries
   forward, rounded the way the slide rounds them, so every total on screen
   matches the total in the handout. */
var QUAD = [
  { k: 'VL', tag: 'A', name: 'vastus lateralis',   mag: 350, ang: 60, side: -1, fx: -175,  fy: 303 },
  { k: 'VI', tag: 'B', name: 'vastus intermedius', mag: 450, ang: 80, side: -1, fx:  -78.1, fy: 443 },
  { k: 'VM', tag: 'C', name: 'vastus medialis',    mag: 375, ang: 80, side:  1, fx:   65.1, fy: 369 }
];

D.register('vecsum', function (node, d) {
  var u = build(node);
  var wrap = u.cv.parentNode.parentNode;
  var showWork = d.work !== '0';
  var side = null;
  if (showWork) {
    wrap.classList.add('isplit');
    side = el('div', 'icalc');
    wrap.insertBefore(side, u.ctl);
  }

  var port = D.portrait();
  /* the whole figure is far taller than it is wide — three near-vertical pulls
     on one joint — so the box it is drawn in is near-square, which makes the
     arrows big on screen instead of stranding them in empty width. */
  var ax = new Axes(u.cv, { w: port ? 430 : 470, h: port ? 430 : 545,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);

  var M = QUAD;
  var pick = 'VL', step = parseInt(d.step || 5, 10);

  function one(k) { return M.filter(function (q) { return q.k === k; })[0]; }
  function sum() {
    var x = 0, y = 0;
    M.forEach(function (q) { x += q.fx; y += q.fy; });
    x = Math.round(x * 10) / 10; y = Math.round(y * 10) / 10;
    return { x: x, y: y, R: Math.hypot(x, y), th: Math.atan2(y, x) * 180 / Math.PI };
  }
  function colOf(k) { var K = C(); return k === 'VL' ? K.BLUE : (k === 'VI' ? K.ORG : K.VIO); }

  /* the patella, drawn the way the lecture's figure draws it */
  function patella(c, x, y, r, K) {
    c.save();
    c.strokeStyle = K.INK; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(x, y, r * 0.78, r, 0, 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  function axesAt(c, x, y, W, K, up) {
    c.save();
    c.strokeStyle = K.SOFT; c.lineWidth = 1.2; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(24, y); c.lineTo(W - 24, y); c.stroke();
    c.beginPath(); c.moveTo(x, y + 46); c.lineTo(x, up); c.stroke();
    c.restore();
  }

  /* ---- one muscle, isolated, with its two components ------------------ */
  function drawOne(q) {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    var ox = W * 0.54, oy = H * 0.88;
    var sc = (H * 0.74) / 470;
    var col = colOf(q.k);
    var tx = ox + q.fx * sc, ty = oy - q.fy * sc;

    axesAt(c, ox, oy, W, K, H * 0.06);
    label(c, 'x', W - 18, oy - 13, { color: K.MUT, size: 13, align: 'right' });
    label(c, 'y', ox + 11, H * 0.06 + 6, { color: K.MUT, size: 13 });

    /* the box that closes the force onto its components */
    c.save();
    c.strokeStyle = col; c.globalAlpha = 0.5; c.lineWidth = 1.3; c.setLineDash([4, 3]);
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx, oy); c.stroke();
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(ox, ty); c.stroke();
    c.restore();

    /* the two components, along the axes */
    arrow(c, ox, oy, tx, oy, { color: K.MUT, width: 2.6 });
    arrow(c, ox, oy, ox, ty, { color: K.MUT, width: 2.6 });
    label(c, q.k + 'x = ' + minus(fmt(q.fx, 1)) + ' N',
          ox + (q.fx < 0 ? -34 : 34), oy + 26,
          { color: K.MUT, size: 13, align: q.fx < 0 ? 'right' : 'left', plate: true });
    label(c, q.k + 'y = ' + fmt(q.fy, 0) + ' N', ox - 24, (oy + ty) / 2,
          { color: K.MUT, size: 13, align: 'right', plate: true });

    /* the muscle force itself */
    arrow(c, ox, oy, tx, ty, { color: col, width: 4.4 });
    label(c, q.tag + ' · ' + q.k + ' = ' + fmt(q.mag, 0) + ' N', tx, ty - 18,
          { color: col, size: 15, align: 'center', plate: true });

    arc(c, ox, oy, 62, q.fx < 0 ? -Math.PI : 0,
        Math.atan2(-q.fy, q.fx), col, fmt(q.ang, 0) + '°');

    patella(c, ox, oy, 26, K);
  }

  /* ---- all three together, then the resultant ------------------------- */
  function drawAll() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    var S = sum();
    var ox = W * 0.58, oy = H * 0.92;
    var sc = (H * 0.84) / 1250;

    axesAt(c, ox, oy, W, K, 18);
    label(c, 'x', W - 18, oy - 13, { color: K.MUT, size: 13, align: 'right' });
    label(c, 'y', ox + 11, 26, { color: K.MUT, size: 13 });

    M.forEach(function (q) {
      var col = colOf(q.k);
      var tx = ox + q.fx * sc, ty = oy - q.fy * sc;
      arrow(c, ox, oy, tx, ty, { color: col, width: 3.2 });
      label(c, q.k + '  ' + fmt(q.mag, 0) + ' N', tx + (q.fx < 0 ? -8 : 8), ty - 12,
            { color: col, size: 13, align: q.fx < 0 ? 'right' : 'left', plate: true });
    });

    var rx = ox + S.x * sc, ry = oy - S.y * sc;
    arrow(c, ox, oy, rx, oy, { color: K.MUT, width: 2.4 });
    arrow(c, ox, oy, ox, ry, { color: K.MUT, width: 2.4 });
    label(c, 'Rx = ' + minus(fmt(S.x, 1)) + ' N', ox + (S.x < 0 ? -10 : 10), oy + 20,
          { color: K.MUT, size: 13, align: S.x < 0 ? 'right' : 'left' });
    label(c, 'Ry = ' + fmt(S.y, 0) + ' N', ox - 26, oy - (oy - ry) * 0.72,
          { color: K.MUT, size: 13, align: 'right', plate: true });

    if (step >= 5) {
      c.save();
      c.strokeStyle = K.MUT; c.globalAlpha = 0.5; c.lineWidth = 1.2; c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx, oy); c.stroke();
      c.beginPath(); c.moveTo(rx, ry); c.lineTo(ox, ry); c.stroke();
      c.restore();
      arrow(c, ox, oy, rx, ry, { color: K.ACC, width: 5 });
      label(c, 'R = ' + fmt(S.R, 1) + ' N', rx + 10, ry - 6,
            { color: K.ACC, size: 15, plate: true });
      arc(c, ox, oy, 70, 0, Math.atan2(-S.y, S.x), K.ACC, fmt(S.th, 1) + '°');
    }
    patella(c, ox, oy, 24, K);
  }

  function draw() {
    ax.clear();
    var S = sum();
    if (step === 3) drawOne(one(pick)); else drawAll();

    if (!side) { tell(S); return; }
    var html = '<div class="icalc-h">Step ' + step + ' · ' +
      ['what is being asked', 'draw what is known', 'components of each force',
       'add the components', 'magnitude and direction'][step - 1] + '</div>';

    if (step === 2) {
      html += '<table class="icalc-tab"><thead><tr><th></th><th>force</th><th>angle</th>' +
        '</tr></thead><tbody>';
      M.forEach(function (q) {
        html += '<tr><td style="color:' + colOf(q.k) + '">' + q.k + '</td><td>' +
          fmt(q.mag, 0) + ' N</td><td>' + fmt(q.ang, 0) + '°</td></tr>';
      });
      html += '</tbody></table><div class="icalc-t" style="margin-top:.5em">The angle is measured ' +
        'from the horizontal; VL and VI pull to one side of the midline, VM to the other.</div>';
    } else if (step === 3) {
      var q0 = one(pick);
      html += '<div class="icalc-work">' +
        '<div class="icalc-t">' + q0.tag + ' · ' + q0.k + ' — ' + q0.name + '</div>' +
        '<div class="icalc-eq">' + q0.k + 'x = ' + (q0.side < 0 ? '−' : '') +
          fmt(q0.mag, 0) + ' cos ' + fmt(q0.ang, 0) + '° = <b>' + minus(fmt(q0.fx, 1)) + '</b> N</div>' +
        '<div class="icalc-eq">' + q0.k + 'y = ' + fmt(q0.mag, 0) + ' sin ' +
          fmt(q0.ang, 0) + '° = <b>' + fmt(q0.fy, 0) + '</b> N</div>' +
        '</div>' +
        '<div class="icalc-t" style="margin-top:.5em">One muscle at a time. ' +
        (q0.side < 0 ? 'This one pulls to the left of the midline, so its horizontal component is negative.'
                     : 'This one pulls to the right of the midline, so its horizontal component is positive.') +
        '</div>';
      html += '<table class="icalc-tab"><thead><tr><th></th><th>Fx</th><th>Fy</th>' +
        '</tr></thead><tbody>';
      M.forEach(function (q) {
        html += '<tr' + (q.k === pick ? ' class="now"' : '') + '><td style="color:' + colOf(q.k) + '">' +
          q.k + '</td><td>' + minus(fmt(q.fx, 1)) + '</td><td>' + fmt(q.fy, 0) + '</td></tr>';
      });
      html += '</tbody></table>';
    } else if (step === 4) {
      html += '<table class="icalc-tab"><thead><tr><th></th><th>Fx</th><th>Fy</th>' +
        '</tr></thead><tbody>';
      M.forEach(function (q) {
        html += '<tr><td style="color:' + colOf(q.k) + '">' + q.k + '</td><td>' +
          minus(fmt(q.fx, 1)) + '</td><td>' + fmt(q.fy, 0) + '</td></tr>';
      });
      html += '<tr class="now"><td>Σ</td><td>' + minus(fmt(S.x, 1)) + '</td><td>' +
        fmt(S.y, 0) + '</td></tr></tbody></table>' +
        '<div class="icalc-t" style="margin-top:.5em">Horizontal with horizontal, vertical with ' +
        'vertical — the same table you used for kinematics.</div>';
    } else if (step === 5) {
      html += '<div class="icalc-work">' +
        '<div class="icalc-t">magnitude</div>' +
        '<div class="icalc-eq">R² = Rx² + Ry²</div>' +
        '<div class="icalc-eq">R = <b class="r">' + fmt(S.R, 2) + ' N</b></div>' +
        '<div class="icalc-t" style="margin-top:.5em">direction</div>' +
        '<div class="icalc-eq">tanθ = Ry / Rx = ' + fmt(S.y, 0) + ' / ' +
          minus(fmt(S.x, 1)) + '</div>' +
        '<div class="icalc-eq">θ = <b class="r">' + minus(fmt(Math.atan(S.y / S.x) * 180 / Math.PI, 1)) +
          '°</b> from the calculator</div>' +
        '</div>' +
        '<div class="icalc-t" style="margin-top:.55em"><b>Watch the quadrant.</b> That answer ' +
        'points down and to the right. Rx is negative and Ry is positive, so the resultant is up ' +
        'and to the left: add 180° to get ' + fmt(S.th, 1) + '° from the positive x axis.</div>';
    } else {
      html += '<div class="icalc-work"><div class="icalc-t">the question</div>' +
        '<div class="icalc-eq">Find the <b>resultant</b> quadriceps force — the single ' +
        'force that would do what all three do together.</div></div>' +
        '<div class="icalc-t" style="margin-top:.6em">Three pulls on one bone, at three ' +
        'different angles. They cannot simply be added: 350 + 450 + 375 is not the answer.</div>';
    }
    if (side) side.innerHTML = html;

    tell(S);
  }

  function tell(S) {
    if (step === 3) {
      var qq = one(pick);
      out.innerHTML = qq.k + ' = ' + fmt(qq.mag, 0) + ' N at ' + fmt(qq.ang, 0) + '° &nbsp;·&nbsp; ' +
        'Fx = <b>' + minus(fmt(qq.fx, 1)) + ' N</b>, Fy = <b>' + fmt(qq.fy, 0) + ' N</b>' +
        '<span class="hint">Isolate one muscle, drop it onto the two axes, and the trig is the ' +
        'same every time — cos for the horizontal, sin for the vertical.</span>';
    } else {
      out.innerHTML =
        'R = <b class="r">' + fmt(S.R, 2) + ' N</b> at <b>' + fmt(S.th, 1) + '°</b>' +
        ' &nbsp;·&nbsp; Rx = ' + minus(fmt(S.x, 1)) + ' N, Ry = ' + fmt(S.y, 0) + ' N' +
        '<span class="hint">Three forces of 350, 450 and 375 N add to ' + fmt(S.R, 0) +
        ' N, not 1175 N — the sideways pulls partly cancel.</span>';
    }
  }

  if (d.steps !== '0') {
    chips(u.ctl, [[2, '2 · the diagram'], [3, '3 · components'],
                  [4, '4 · add them'], [5, '5 · the resultant']], step,
          function (v) { step = +v; draw(); });
  }
  if (step === 3 || d.steps !== '0') {
    var r2 = ctlRow(u.ctl);
    var segEl = seg(r2, M.map(function (q) { return [q.k, q.tag + ' · ' + q.k]; }), pick,
                    function (v) { pick = v; draw(); });
    /* fit.js sweeps every control at boot to reserve height; letting it press
       these would leave the slide opening on whichever muscle it pressed last. */
    Array.prototype.forEach.call(segEl.children, function (b) { b.setAttribute('data-unsafe', '1'); });
  }

  node._draw = draw;
  draw();
});


/* ============================================================
   6. THE INCLINE
   Gravity does not change when the ground tilts — the axes do. Everything
   on this figure follows from that one idea, which is why the axis system
   is drawn first and the components are drawn along it.
   ============================================================ */
/* a standing figure, drawn upright in its own frame so it can be rotated onto
   a slope. Everything is in units of the figure's height. */
function personPath(c, h, col, fill) {
  var u = h / 8;                       /* eight heads tall, roughly */
  c.save();
  c.strokeStyle = col; c.fillStyle = fill || col;
  c.lineWidth = Math.max(2, u * 0.34); c.lineCap = 'round'; c.lineJoin = 'round';
  /* head */
  c.beginPath(); c.arc(0, -h + u * 0.85, u * 0.78, 0, 7); c.fill();
  /* torso */
  c.beginPath(); c.moveTo(0, -h + u * 1.7); c.lineTo(0, -h + u * 4.3); c.stroke();
  /* arms, slightly away from the body */
  c.beginPath();
  c.moveTo(0, -h + u * 2.2); c.lineTo(-u * 1.15, -h + u * 3.9);
  c.moveTo(0, -h + u * 2.2); c.lineTo(u * 1.15, -h + u * 3.9);
  c.stroke();
  /* legs */
  c.beginPath();
  c.moveTo(0, -h + u * 4.3); c.lineTo(-u * 0.62, -h + u * 6.2); c.lineTo(-u * 0.62, 0);
  c.moveTo(0, -h + u * 4.3); c.lineTo(u * 0.62, -h + u * 6.2); c.lineTo(u * 0.62, 0);
  c.stroke();
  /* feet */
  c.lineWidth = Math.max(2, u * 0.3);
  c.beginPath();
  c.moveTo(-u * 0.62, 0); c.lineTo(-u * 0.62 + u * 0.95, 0);
  c.moveTo(u * 0.62, 0); c.lineTo(u * 0.62 + u * 0.95, 0);
  c.stroke();
  c.restore();
}

D.register('incline', function (node, d) {
  var u = build(node);
  /* The working panel beside the diagram is worth the room on the slide that
     works the example through, and in the way on the slides that only want the
     picture — data-calc="0" leaves it out. */
  var showCalc = d.calc !== '0';
  var wrap = u.cv.parentNode.parentNode, side = null;
  if (showCalc) {
    wrap.classList.add('isplit');
    side = el('div', 'icalc');
    wrap.insertBefore(side, u.ctl);
  }

  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : (showCalc ? 700 : 660), h: port ? 400 : 450,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var m = parseFloat(d.mass || 4), th = parseFloat(d.angle || 20);
  var showFric = d.friction === '1';
  var body = d.body || 'block';                 /* block | person            */
  var numbers = d.labels !== '0';               /* magnitudes on the diagram */

  /* Which layers are on. data-step drives the sequential slides:
     1 = weight only, 2 = + parallel, 3 = + perpendicular, 4 = + normal. */
  var step = d.step ? parseInt(d.step, 10) : 0;
  var showAxes = d.axes === '0' ? false : true;
  var showComp = d.comp === '0' ? false : true;
  if (step) { showAxes = true; showComp = step >= 2; }   /* the axes are step 1 */

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var t = th * Math.PI / 180;
    var Wt = m * G, perp = Wt * Math.cos(t), par = Wt * Math.sin(t);
    var wantPar  = showComp && (!step || step >= 2);
    var wantPerp = showComp && (!step || step >= 3);
    var wantN    = (!step || step >= 4);

    /* the ground, and the slope rising from it */
    var gx = W * 0.10, gy = H * 0.60, run = W * 0.78;
    if (t > 0.02) run = Math.min(run, (gy - 52) / Math.tan(t));
    c.save();
    c.strokeStyle = K.SOFT; c.lineWidth = 1.4;
    c.setLineDash([5, 5]);
    c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + W * 0.78, gy); c.stroke();
    c.setLineDash([]); c.restore();
    var sx = gx, sy = gy, ex = gx + run, ey = gy - run * Math.tan(t);
    c.save();
    c.strokeStyle = K.INK; c.lineWidth = 3;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
    c.restore();
    arc(c, sx, sy, 68, -t, 0, th < 1 ? K.MUT : K.ACC, fmt(th, 0) + '°');

    /* what is sitting on the slope */
    var f = 0.46;
    var bx = sx + (ex - sx) * f, by = sy + (ey - sy) * f;
    var px, py;
    if (body === 'person') {
      var ph = 150;
      c.save(); c.translate(bx, by); c.rotate(-t);
      personPath(c, ph, K.BLUE, K.BLUE);
      c.restore();
      /* the centre of mass, about 55 % of the way up */
      px = bx - Math.sin(t) * (ph * 0.55); py = by - Math.cos(t) * (ph * 0.55);
      c.save(); c.fillStyle = K.ACC; c.strokeStyle = K.PLATE; c.lineWidth = 2;
      c.beginPath(); c.arc(px, py, 6, 0, 7); c.fill(); c.stroke(); c.restore();
      label(c, 'centre of mass', px + 12, py - 12,
            { color: K.MUT, size: 11.5, weight: '600', plate: true });
    } else {
      var bw = 74, bh = 30;
      c.save(); c.translate(bx, by); c.rotate(-t);
      c.fillStyle = K.FILL; c.strokeStyle = K.BLUE; c.lineWidth = 2;
      c.fillRect(-bw / 2, -bh, bw, bh); c.strokeRect(-bw / 2, -bh, bw, bh);
      c.restore();
      px = bx - Math.sin(t) * (bh / 2); py = by - Math.cos(t) * (bh / 2);
    }

    /* the tilted axis system, drawn before any force */
    if (showAxes) {
      ray(c, px, py, -t, 250, K.MUT, [7, 6]);
      ray(c, px, py, -t + Math.PI / 2, 210, K.MUT, [7, 6]);
      label(c, 'parallel axis (shear)', px + Math.cos(-t) * 150, py + Math.sin(-t) * 150 - 14,
            { color: K.MUT, size: 12, weight: '600', align: 'center', plate: true });
      label(c, 'perpendicular axis (compression)',
            px + Math.cos(-t - Math.PI / 2) * 132, py + Math.sin(-t - Math.PI / 2) * 132 - 12,
            { color: K.MUT, size: 12, weight: '600', align: 'center', plate: true });
    }

    var S = 128 / Math.max(60, Wt);        /* newtons → pixels */

    /* weight: straight down, always, whatever the slope does */
    arrow(c, px, py, px, py + Wt * S, { color: K.INK, width: 4 });
    label(c, numbers ? 'W = ' + fmt(Wt, 1) + ' N' : 'W', px + 12, py + Wt * S + 16,
          { color: K.INK, size: 14, plate: true });

    /* its two components, along the axes */
    if (wantPar) {
      var pxa = px + Math.cos(-t) * -par * S, pya = py + Math.sin(-t) * -par * S;
      arrow(c, px, py, pxa, pya, { color: K.ORG, width: 3 });
      label(c, numbers ? 'W sinθ = ' + fmt(par, 1) + ' N' : 'W sinθ',
            pxa - 6, pya + 16, { color: K.ORG, size: 13, align: 'right', plate: true });
    }
    if (wantPerp) {
      var pxp = px + Math.cos(-t + Math.PI / 2) * perp * S,
          pyp = py + Math.sin(-t + Math.PI / 2) * perp * S;
      arrow(c, px, py, pxp, pyp, { color: K.ACC, width: 3 });
      label(c, numbers ? 'W cosθ = ' + fmt(perp, 1) + ' N' : 'W cosθ',
            pxp - 8, pyp + 4, { color: K.ACC, size: 13, align: 'right', plate: true });
    }

    /* the ground pushes back, perpendicular to itself */
    if (wantN) {
      var nx2 = px + Math.cos(-t - Math.PI / 2) * perp * S,
          ny2 = py + Math.sin(-t - Math.PI / 2) * perp * S;
      arrow(c, px, py, nx2, ny2, { color: K.BLUE, width: 4 });
      label(c, numbers ? 'N = ' + fmt(perp, 1) + ' N' : 'N', nx2, ny2 - 16,
            { color: K.BLUE, size: 14, align: 'center', plate: true });
    }

    if (showFric) {
      var fx = px + Math.cos(-t) * par * S, fy2 = py + Math.sin(-t) * par * S;
      arrow(c, px, py, fx, fy2, { color: K.GRN, width: 3.4 });
      label(c, numbers ? 'friction = ' + fmt(par, 1) + ' N' : 'friction',
            fx + 8, fy2 - 10, { color: K.GRN, size: 13, plate: true });
    }

    if (side) {
      var html = '<div class="icalc-h">' + fmt(m, 1) + ' kg on a <span class="v">' + fmt(th, 0) +
        '°</span> slope</div>' +
        '<div class="icalc-work">' +
        '<div class="icalc-t">the weight</div>' +
        '<div class="icalc-eq">W = mg = ' + fmt(m, 1) + ' × 9.81 = <b>' + fmt(Wt, 2) + '</b> N</div>' +
        '</div>';
      if (wantPar) html += '<div class="icalc-work">' +
        '<div class="icalc-t">parallel — sliding down the surface</div>' +
        '<div class="icalc-eq">W sinθ = ' + fmt(Wt, 2) + ' · sin ' + fmt(th, 0) +
          '° = <b>' + fmt(par, 2) + '</b> N</div></div>';
      if (wantPerp) html += '<div class="icalc-work">' +
        '<div class="icalc-t">perpendicular — pressed into the surface</div>' +
        '<div class="icalc-eq">W cosθ = ' + fmt(Wt, 2) + ' · cos ' + fmt(th, 0) +
          '° = <b class="r">' + fmt(perp, 2) + '</b> N</div></div>';
      if (wantN) html += '<div class="icalc-work">' +
        '<div class="icalc-t">the normal force is the ground’s answer to it</div>' +
        '<div class="icalc-eq">N = −W cosθ = <b class="b">' + fmt(perp, 2) + '</b> N</div></div>';
      html += '<div class="icalc-vals">' +
        '<div><span>N</span><b>' + fmt(perp, 1) + ' N</b></div>' +
        '<div><span>shear</span><b>' + fmt(par, 1) + ' N</b></div>' +
        '<div><span>N / W</span><b>' + fmt(perp / Wt * 100, 0) + '%</b></div>' +
        '</div>';
      if (side) side.innerHTML = html;
    }

    out.innerHTML =
      (th < 0.5
        ? 'Flat ground: the normal force is <b class="b">equal and opposite</b> to the weight, ' +
          fmt(perp, 1) + ' N.'
        : 'At ' + fmt(th, 0) + '° the normal force is <b class="b">' + fmt(perp, 1) +
          ' N</b>, not ' + fmt(Wt, 1) + ' N — the missing ' + fmt(Wt - perp, 1) +
          ' N has become <b class="r">' + fmt(par, 1) + ' N of shear</b> down the slope') +
      '<span class="hint">Gravity never changes — it is the same arrow straight down at every ' +
      'angle. What changes is the axis system we measure it against, which is why the normal ' +
      'force falls away as the slope steepens' +
      (showFric ? ', and why friction has to hold up whatever the shear is.' : '.') + '</span>';
  }

  /* ---- controls ---- */
  var row = null;
  function ctlrow() { if (!row) { row = el('div', 'ictl-row'); u.ctl.appendChild(row); } return row; }

  if (d.toggles === '1') {
    var ab = el('button', 'ibtn' + (showAxes ? ' on' : ''), showAxes ? 'Axes shown' : 'Add the axes');
    ab.addEventListener('click', function () {
      showAxes = !showAxes; ab.classList.toggle('on', showAxes);
      ab.textContent = showAxes ? 'Axes shown' : 'Add the axes'; draw();
    });
    ctlrow().appendChild(ab);
    var cbtn = el('button', 'ibtn' + (showComp ? ' on' : ''),
                  showComp ? 'Components shown' : 'Show the components');
    cbtn.addEventListener('click', function () {
      showComp = !showComp; cbtn.classList.toggle('on', showComp);
      cbtn.textContent = showComp ? 'Components shown' : 'Show the components'; draw();
    });
    ctlrow().appendChild(cbtn);
  }

  if (d.sweep === '1') {
    /* the angle is the whole point of this slide, so it gets a control that
       makes the change impossible to miss rather than a slider nobody drags */
    var sweeping = false, raf = null, t0 = 0;
    var pb = el('button', 'ibtn', '\u25b6 Sweep the surface angle');
    pb.addEventListener('click', function () {
      sweeping = !sweeping;
      pb.classList.toggle('on', sweeping);
      pb.textContent = sweeping ? '\u275a\u275a Stop' : '\u25b6 Sweep the surface angle';
      if (sweeping) { t0 = performance.now(); loop(); } else cancelAnimationFrame(raf);
    });
    ctlrow().appendChild(pb);
    function loop() {
      var e = (performance.now() - t0) / 1000;
      th = 22.5 - 22.5 * Math.cos(e * 0.9);        /* 0 \u2192 45 \u2192 0 */
      if (sA) sA.quiet(th);
      draw();
      raf = requestAnimationFrame(loop);
    }
    node._stop = function () {
      sweeping = false; cancelAnimationFrame(raf);
      pb.classList.remove('on'); pb.textContent = '\u25b6 Sweep the surface angle';
    };
  }

  var sA = null, sM = null;
  if (d.anglectl !== '0') {
    sA = slider(u.ctl, 'Angle of the surface', 0, 45, 1, th,
      function (v) { return fmt(v, 0) + '°'; },
      function (v) { th = v; draw(); }, { scale: 4, tick: function (v) { return fmt(v, 0) + '°'; } });
  }
  if (d.massctl !== '0') {
    sM = slider(u.ctl, 'Mass', 1, 100, 1, m, function (v) { return fmt(v, 0) + ' kg'; },
      function (v) { m = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  }
  if (d.chips !== '0') {
    chips(u.ctl, [['a', 'flat ground'], ['b', '4 kg at 20°'], ['c', 'a 102 kg cyclist at 20°']],
          null, function (v) {
      if (v === 'a') { th = 0; }
      else if (v === 'b') { th = 20; m = 4; }
      else { th = 20; m = 102; }
      if (sA) sA.quiet(th); if (sM) sM.quiet(m); draw();
    });
  }
  node._draw = draw;
  draw();
});


/* ============================================================
   7. PLANTAR PRESSURE AND THE CENTRE OF PRESSURE
   A pressure mat does not measure the ground reaction force; it measures
   where the load is and how it is spread. The centre of pressure is the
   one number it gives you that a force plate also gives you, which is why
   the two get compared.

   The field is synthesised from three sources under the foot — heel, met
   heads, hallux — whose weights change through stance. That is enough to
   put the COP where it belongs: back on the heel at contact, forward and
   slightly lateral through midstance, out under the big toe at toe-off.
   ============================================================ */
var FOOT = [                      /* outline in foot coordinates, 0..1 x 0..1 */
  [0.50, 0.00], [0.71, 0.03], [0.82, 0.12], [0.84, 0.26], [0.79, 0.42],
  [0.76, 0.58], [0.80, 0.70], [0.82, 0.82], [0.74, 0.93], [0.60, 0.99],
  [0.45, 0.99], [0.31, 0.93], [0.23, 0.82], [0.22, 0.68], [0.26, 0.54],
  [0.27, 0.38], [0.24, 0.22], [0.31, 0.07]
];
/* pressure sources: [x, y, spread, weight at 0 %, at 50 %, at 100 % of stance] */
var SRC = [
  [0.50, 0.10, 0.115, 1.00, 0.28, 0.00],      /* heel            */
  [0.42, 0.44, 0.120, 0.10, 0.55, 0.18],      /* midfoot, lateral */
  [0.62, 0.70, 0.100, 0.05, 1.00, 0.72],      /* met heads       */
  [0.40, 0.74, 0.090, 0.03, 0.62, 0.58],      /* lateral mets    */
  [0.66, 0.90, 0.078, 0.00, 0.22, 1.00]       /* hallux          */
];
var EVENTS = [[0, 'heel strike'], [0.14, 'foot flat'], [0.62, 'heel lift'], [1, 'toe off']];

function srcWeight(s, p) {
  return p < 0.5 ? s[3] + (s[4] - s[3]) * (p / 0.5)
                 : s[4] + (s[5] - s[4]) * ((p - 0.5) / 0.5);
}
/* the vertical force through stance — the familiar two-humped walking curve */
function vgrf(p) {
  if (p <= 0 || p >= 1) return 0;
  return 1.12 * Math.exp(-Math.pow((p - 0.24) / 0.17, 2)) +
         1.06 * Math.exp(-Math.pow((p - 0.76) / 0.17, 2)) +
         0.45 * Math.exp(-Math.pow((p - 0.50) / 0.22, 2));
}

D.register('cop', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 900, h: port ? 430 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var p = 0.35, playing = false, raf, last = 0, showPath = true;

  function field(px, py, pr) {
    var v = 0;
    for (var i = 0; i < SRC.length; i++) {
      var s = SRC[i], w = srcWeight(s, pr);
      if (w <= 0) continue;
      v += w * Math.exp(-((px - s[0]) * (px - s[0]) + (py - s[1]) * (py - s[1])) / (2 * s[2] * s[2]));
    }
    return v;
  }
  function cop(pr) {
    var sx = 0, sy = 0, sw = 0;
    SRC.forEach(function (s) { var w = srcWeight(s, pr); sx += s[0] * w; sy += s[1] * w; sw += w; });
    return sw > 0 ? [sx / sw, sy / sw] : [0.5, 0.5];
  }
  function heat(v) {
    /* a blue → green → yellow → red ramp, clamped */
    var t = Math.max(0, Math.min(1, v));
    var stops = [[0, 15, 30, 80], [0.25, 20, 90, 190], [0.5, 60, 190, 120],
                 [0.75, 250, 200, 60], [1, 240, 70, 60]];
    for (var i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        var a = stops[i - 1], b = stops[i];
        var f = (t - a[0]) / (b[0] - a[0]);
        return 'rgb(' + Math.round(a[1] + (b[1] - a[1]) * f) + ',' +
                        Math.round(a[2] + (b[2] - a[2]) * f) + ',' +
                        Math.round(a[3] + (b[3] - a[3]) * f) + ')';
      }
    }
    return 'rgb(240,70,60)';
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();

    /* ---- the foot, with the pressure under it ---- */
    var fw = port ? 200 : 218, fh = fw * 1.62;
    var fx = port ? (W - fw) / 2 : 44, fy = (H - fh) / 2;
    function FX(x) { return fx + x * fw; }
    function FY(y) { return fy + (1 - y) * fh; }

    c.save();
    c.beginPath();
    FOOT.forEach(function (q, i) { i ? c.lineTo(FX(q[0]), FY(q[1])) : c.moveTo(FX(q[0]), FY(q[1])); });
    c.closePath();
    c.clip();
    /* the sensor grid: a real mat is a matrix of cells, so draw cells */
    var NX = 13, NY = 34, grid = [], vmax = 0;
    for (var iy = 0; iy < NY; iy++) {
      for (var ix = 0; ix < NX; ix++) {
        var v = field((ix + 0.5) / NX, (iy + 0.5) / NY, p);
        grid.push(v);
        if (v > vmax) vmax = v;
      }
    }
    /* normalised to the peak at THIS instant, so the hot spot is always the
       hot spot — a real mat's colour scale is set per frame the same way */
    for (iy = 0; iy < NY; iy++) {
      for (ix = 0; ix < NX; ix++) {
        var rel = vmax > 0 ? grid[iy * NX + ix] / vmax : 0;
        if (rel < 0.06) continue;
        c.fillStyle = heat(rel);
        c.globalAlpha = 0.94;
        c.fillRect(FX(ix / NX), FY((iy + 1) / NY), fw / NX + 0.7, fh / NY + 0.7);
      }
    }
    c.globalAlpha = 1;
    c.restore();
    c.save();
    c.strokeStyle = K.INK; c.lineWidth = 1.8;
    c.beginPath();
    FOOT.forEach(function (q, i) { i ? c.lineTo(FX(q[0]), FY(q[1])) : c.moveTo(FX(q[0]), FY(q[1])); });
    c.closePath(); c.stroke(); c.restore();

    /* the COP path, and where it is now */
    if (showPath) {
      c.save();
      c.strokeStyle = K.INK; c.lineWidth = 2; c.setLineDash([4, 3]);
      c.beginPath();
      for (var k = 0; k <= 60; k++) {
        var q2 = cop(k / 60);
        k ? c.lineTo(FX(q2[0]), FY(q2[1])) : c.moveTo(FX(q2[0]), FY(q2[1]));
      }
      c.stroke(); c.restore();
    }
    var now = cop(p);
    c.save();
    c.fillStyle = K.ACC; c.strokeStyle = K.PLATE; c.lineWidth = 2;
    c.beginPath(); c.arc(FX(now[0]), FY(now[1]), 7, 0, 7); c.fill(); c.stroke();
    c.restore();
    label(c, 'centre of pressure', FX(now[0]) - 14, FY(now[1]) - 18,
          { color: K.ACC, size: 12, weight: '700', align: 'right', plate: true });

    if (!port) {
      /* ---- the vertical force beside it ---- */
      ax.pl = 372; ax.pr = 40; ax.pt = 50; ax.pb = 92;
      ax.setRange(0, 1, 0, 1.5);
      ax.frame({ grid: true, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.5, 1, 1.5],
                 xlabel: 'stance (%)', ylabel: 'vertical force (body weights)',
                 ylabelx: 318,
                 xfmt: function (v) { return fmt(v * 100, 0); },
                 yfmt: function (v) { return fmt(v, 1); } });
      var pts = [];
      for (var j = 0; j <= 100; j++) pts.push([j / 100, vgrf(j / 100)]);
      ax.poly(pts, { color: K.BLUE, width: 2.6 });
      ax.poly([[p, 0], [p, vgrf(p)]], { color: K.ACC, width: 1.6, dash: [4, 3] });
      ax.dots([[p, vgrf(p)]], { color: K.ACC, r: 5 });
      EVENTS.forEach(function (e) {
        ax.poly([[e[0], 0], [e[0], 1.5]], { color: K.SOFT, width: 1, dash: [3, 4] });
        label(c, e[1], ax.X(e[0]) + 4, ax.pt + 12, { color: K.MUT, size: 11, weight: '600' });
      });
    }

    var stage = p < 0.14 ? 'loading the heel'
              : p < 0.45 ? 'rolling forward through the midfoot'
              : p < 0.75 ? 'load under the met heads'
              : 'pushing off the big toe';
    out.innerHTML =
      fmt(p * 100, 0) + '% of stance &nbsp;·&nbsp; ' + stage +
      ' &nbsp;·&nbsp; vertical force <b class="b">' + fmt(vgrf(p), 2) + '</b> body weights' +
      '<span class="hint">The centre of pressure is the single point the ground reaction force ' +
      'acts through at that instant — not where the pressure is highest, but the average of ' +
      'the whole field. It sweeps heel to toe in about 0.6 s of walking.</span>';
  }

  var s = slider(u.ctl, 'Stance', 0.02, 0.99, 0.01, p,
    function (v) { return fmt(v * 100, 0) + '%'; }, function (v) { p = v; draw(); },
    { scale: 5, tick: function (v) { return fmt(v * 100, 0) + '%'; } });
  var r = ctlRow(u.ctl);
  var pb = playBtn(r, '▶ Take a step');
  pb.addEventListener('click', function () {
    playing = !playing;
    pb.textContent = playing ? '❚❚ Pause' : '▶ Take a step';
    if (playing) { if (p > 0.97) { p = 0.02; s.set(0.02); } last = 0; raf = requestAnimationFrame(loop); }
    else cancelAnimationFrame(raf);
  });
  var tb = el('button', 'ibtn' + (showPath ? ' on' : ''), 'Hide the path');
  tb.addEventListener('click', function () {
    showPath = !showPath;
    tb.classList.toggle('on', showPath);
    tb.textContent = showPath ? 'Hide the path' : 'Show the path';
    draw();
  });
  r.appendChild(tb);
  function loop(ts) {
    if (!last) last = ts;
    p = Math.min(0.99, p + (ts - last) / 1400);
    last = ts; s.input.value = p; s.sync();
    if (p >= 0.99) { playing = false; pb.textContent = '↻ Again'; return; }
    raf = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Take a step'; };
  node._draw = draw;
  draw();
});


/* ============================================================
   8. GROUND REACTION FORCE WHILE RUNNING
   The Lieberman figure the lecture shows as video: a shod heel strike puts
   a spike into the first 50 ms that a forefoot strike does not have. The
   traces here are modelled, not measured — shaped to the published curves
   (peak, timing and loading rate), which is what the slide is arguing about.
   ============================================================ */
var STRIKES = [
  { k: 'shodheel', name: 'shod, heel strike',    col: 'BLUE', tr: 1.60, trT: 0.048, tw: 0.020,
    act: 2.35, actT: 0.135, aw: 0.062, cT: 0.255 },
  { k: 'bareheel', name: 'barefoot, heel strike', col: 'ACC', tr: 2.65, trT: 0.012, tw: 0.006,
    act: 2.40, actT: 0.120, aw: 0.056, cT: 0.235 },
  { k: 'barefore', name: 'barefoot, forefoot',    col: 'GRN', tr: 0,    trT: 0.03,  tw: 0.01,
    act: 2.45, actT: 0.105, aw: 0.060, cT: 0.215 }
];

function grfCurve(s, t) {
  if (t < 0 || t > s.cT) return 0;
  var v = s.act * Math.exp(-Math.pow((t - s.actT) / s.aw, 2));
  if (s.tr > 0) v += s.tr * Math.exp(-Math.pow((t - s.trT) / s.tw, 2));
  /* taper to zero at the ends so the trace starts and stops on the ground */
  var edge = Math.min(1, t / 0.006) * Math.min(1, (s.cT - t) / 0.02);
  return v * Math.max(0, edge);
}

D.register('grf', function (node, d) {
  var u = build(node);
  var wrap = u.cv.parentNode.parentNode;
  wrap.classList.add('isplit');
  var side = el('div', 'icalc');
  wrap.insertBefore(side, u.ctl);

  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 660, h: port ? 400 : 420,
                            padl: 66, padr: 22, padt: 22, padb: 52 });
  var out = readout(u.ctl);
  var on = { shodheel: true, bareheel: false, barefore: true };
  var m = 70;

  function peak(s) {
    var best = 0, bt = 0;
    for (var t = 0; t <= s.cT; t += 0.001) { var v = grfCurve(s, t); if (v > best) { best = v; bt = t; } }
    return { v: best, t: bt };
  }
  /* loading rate: the steepest 20 ms of the rise, in body weights per second */
  function rate(s) {
    var best = 0;
    for (var t = 0.002; t <= s.actT; t += 0.001) {
      var r2 = (grfCurve(s, t + 0.010) - grfCurve(s, t)) / 0.010;
      if (r2 > best) best = r2;
    }
    return best;
  }

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    ax.setRange(0, 0.28, 0, 3.0);
    ax.frame({ grid: true, xticks: [0, 0.05, 0.1, 0.15, 0.2, 0.25],
               yticks: [0, 1, 2, 3], xlabel: 'time (s)',
               ylabel: 'vertical force (body weights)',
               xfmt: function (v) { return fmt(v, 2); },
               yfmt: function (v) { return fmt(v, 0); } });
    STRIKES.forEach(function (s) {
      if (!on[s.k]) return;
      var col = K[s.col], pts = [];
      for (var t = 0; t <= s.cT + 0.005; t += 0.002) pts.push([t, grfCurve(s, t)]);
      ax.poly(pts, { color: col, width: 2.8 });
      if (s.tr > 0) {
        ax.dots([[s.trT, grfCurve(s, s.trT)]], { color: col, r: 4.5 });
        label(c, 'impact transient', ax.X(s.trT) + 8, ax.Y(grfCurve(s, s.trT)) - 14,
              { color: col, size: 12, weight: '700', plate: true });
      }
    });
    /* a body-weight line, because everything here is in body weights */
    ax.poly([[0, 1], [0.28, 1]], { color: K.SOFT, width: 1, dash: [4, 4] });
    label(c, '1 body weight', ax.X(0.27), ax.Y(1) - 12,
          { color: K.MUT, size: 11, align: 'right', weight: '600' });

    var html = '<div class="icalc-h">peak force and how fast it arrives</div>' +
      '<table class="icalc-tab"><thead><tr><th></th><th>peak</th><th>in N</th>' +
      '<th>rate</th></tr></thead><tbody>';
    STRIKES.forEach(function (s) {
      var pk = peak(s), rt = rate(s);
      html += '<tr' + (on[s.k] ? '' : ' class="off"') + '><td style="color:' + C()[s.col] + '">' +
        s.name + '</td><td>' + fmt(pk.v, 2) + '</td><td>' + fmt(pk.v * m * G, 0) + '</td><td>' +
        fmt(rt, 0) + '</td></tr>';
    });
    html += '</tbody></table>' +
      '<div class="icalc-t" style="margin-top:.55em">Peak in body weights, the same force in ' +
      'newtons for a ' + fmt(m, 0) + ' kg runner, and the steepest rise in body weights per second.</div>' +
      '<div class="icalc-t" style="margin-top:.5em">Every style ends up near the same peak. What ' +
      'separates them is the <b>spike in the first 50 ms</b> and how quickly the load arrives — ' +
      'which is the part a heel strike in a cushioned shoe softens, and a bare heel does not.</div>';
    if (side) side.innerHTML = html;

    var lst = STRIKES.filter(function (s) { return on[s.k]; });
    out.innerHTML =
      (lst.length
        ? lst.map(function (s) {
            return '<b style="color:' + C()[s.col] + '">' + s.name + '</b> ' +
                   fmt(peak(s).v, 2) + ' BW';
          }).join(' &nbsp;·&nbsp; ')
        : 'nothing selected') +
      '<span class="hint">Modelled on Lieberman et al., <i>Nature</i> 2010, who measured this on ' +
      'an instrumented treadmill — peak, timing and loading rate follow the published curves.</span>';
  }

  var r = ctlRow(u.ctl);
  STRIKES.forEach(function (s) {
    var b = el('button', 'ibtn' + (on[s.k] ? ' on' : ''), s.name);
    b.addEventListener('click', function () {
      on[s.k] = !on[s.k]; b.classList.toggle('on', on[s.k]); draw();
    });
    r.appendChild(b);
  });
  slider(u.ctl, 'Runner mass', 40, 120, 1, m, function (v) { return fmt(v, 0) + ' kg'; },
    function (v) { m = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  node._draw = draw;
  draw();
});


/* One stride of walking, measured. SUSU youth motion dataset (UVic), subject
   SUSU-30, trial Walking1-2: 119 markers at 90 Hz over force plates at 450 Hz.
   Right heel strike to right heel strike, resampled to 61 frames. Coordinates
   are millimetres in a path frame: +x is the direction of travel, +y is to the
   subject's left, +z is up, origin on the floor under the pelvis at heel
   strike. MO_G holds the right-foot ground reaction force (N) and its centre
   of pressure (mm) in the same frame; the plate's own coordinate frame was
   registered to the marker frame at heel strike. */
var MO_J = ['head','neck','trunk','pelvis','shL','elL','wrL','shR','elR','wrR','hipL','kneeL','ankL','heelL','mtL','toeL','hipR','kneeR','ankR','heelR','mtR','toeR'];
var MO_N = 61, MO_STRIDE = 1.11, MO_MASS = 70.3, MO_HT = 1.87;
var MO_RTO = 0.594, MO_LHS = 0.506;   /* right toe-off, left heel strike, 0..1 */
var MO_P = [60,-4,1841,46,-11,1504,47,-11,1279,14,-1,1016,55,194,1463,119,246,1169,323,247,1021,40,-219,1471,-72,-231,1174,-133,-289,918,7,75,934,-78,148,471,-379,78,151,-478,66,139,-299,67,18,-243,50,18,21,-77,927,225,-90,475,243,-74,68,180,-59,7,410,-88,36,464,-93,39,85,-10,1841,73,-16,1504,76,-15,1280,42,-3,1017,82,189,1465,138,242,1170,337,248,1013,67,-224,1468,-40,-233,1170,-93,-288,912,37,73,934,-29,155,463,-349,79,164,-449,68,170,-297,61,26,-236,55,13,48,-79,930,250,-89,475,245,-73,69,181,-58,8,411,-87,32,465,-90,36,111,-15,1841,100,-21,1505,103,-17,1280,69,-5,1019,108,185,1467,155,239,1170,347,249,1005,94,-228,1466,-7,-236,1166,-51,-288,906,64,72,934,23,162,457,-316,80,181,-413,70,204,-283,64,35,-226,57,7,74,-82,934,269,-90,477,246,-73,69,182,-58,8,412,-88,31,466,-90,33,136,-21,1842,126,-25,1506,130,-18,1281,94,-6,1020,134,182,1470,171,235,1171,354,252,996,122,-231,1465,27,-238,1162,-8,-287,900,91,71,933,77,166,453,-277,82,200,-368,71,238,-260,69,46,-217,59,0,97,-83,937,287,-96,477,247,-73,69,182,-59,9,413,-88,30,466,-91,31,161,-25,1844,153,-27,1508,155,-19,1282,118,-6,1021,159,180,1473,187,231,1173,359,254,987,150,-234,1463,62,-239,1158,38,-285,894,117,71,932,131,168,452,-235,84,218,-313,75,268,-232,74,62,-204,62,-4,119,-83,940,301,-102,477,247,-74,69,182,-59,10,413,-89,29,467,-91,30,185,-30,1846,179,-30,1510,179,-20,1284,141,-7,1023,183,178,1476,200,227,1175,361,256,979,177,-235,1463,97,-240,1155,86,-284,891,141,70,933,186,171,456,-190,85,236,-262,73,289,-194,81,78,-171,70,9,141,-83,942,314,-107,476,248,-74,70,183,-59,10,413,-89,28,468,-91,29,210,-33,1849,205,-32,1513,203,-21,1287,164,-8,1025,206,176,1480,213,224,1178,361,257,972,204,-237,1464,133,-240,1154,135,-282,889,166,68,936,240,172,462,-143,85,253,-218,71,300,-137,90,93,-113,81,26,163,-85,944,323,-107,476,248,-74,70,182,-59,11,414,-89,28,468,-92,28,234,-35,1853,229,-33,1517,226,-22,1290,187,-11,1028,228,175,1484,225,220,1181,358,259,966,230,-238,1467,169,-239,1154,185,-279,889,189,66,940,292,173,471,-91,85,265,-172,72,306,-77,95,105,-49,87,40,185,-87,947,330,-106,475,249,-75,71,182,-59,12,414,-89,27,468,-92,28,259,-37,1857,253,-35,1521,249,-23,1294,210,-12,1033,249,174,1488,236,218,1186,355,261,962,255,-239,1470,205,-239,1155,235,-276,891,213,64,945,342,172,481,-37,85,271,-121,76,308,-15,98,113,16,89,49,208,-89,950,338,-105,475,250,-74,72,183,-59,13,414,-89,27,468,-92,27,284,-38,1861,276,-35,1526,272,-24,1299,233,-13,1038,270,174,1492,248,215,1190,350,262,959,280,-239,1475,241,-239,1157,285,-273,895,236,63,951,392,171,494,19,86,273,-69,80,304,49,100,116,85,90,55,230,-90,955,343,-106,476,251,-74,72,183,-58,14,414,-89,27,468,-92,27,309,-38,1865,299,-36,1530,295,-25,1303,256,-14,1043,291,173,1496,259,214,1194,345,264,958,304,-240,1479,278,-238,1160,335,-270,900,260,62,956,440,170,507,76,87,270,-16,84,295,117,101,117,157,91,58,251,-90,959,349,-106,477,251,-75,73,184,-58,15,415,-89,27,468,-93,27,333,-38,1869,322,-36,1533,318,-25,1307,278,-14,1047,312,173,1500,269,212,1199,339,265,958,327,-240,1483,314,-238,1162,385,-266,907,283,62,961,485,167,519,134,88,264,39,88,280,187,102,115,231,92,59,273,-90,963,353,-106,478,251,-74,74,184,-57,16,415,-90,27,469,-92,27,356,-36,1871,344,-36,1536,341,-25,1310,301,-15,1050,333,173,1502,279,210,1203,334,265,958,350,-240,1487,349,-238,1165,436,-263,914,306,61,964,529,163,530,194,89,253,96,91,261,260,103,110,309,92,59,295,-91,966,359,-105,479,252,-74,75,184,-56,18,414,-91,26,469,-93,27,379,-34,1873,367,-36,1538,364,-25,1312,323,-16,1052,354,174,1504,289,209,1207,329,266,960,373,-239,1490,380,-238,1169,485,-260,923,329,60,967,570,159,541,255,89,239,156,94,237,335,105,104,389,94,59,317,-92,968,364,-104,480,253,-74,76,185,-55,20,414,-91,26,469,-93,26,402,-32,1874,390,-35,1539,387,-26,1313,346,-16,1053,375,175,1505,300,208,1211,325,266,962,397,-238,1493,414,-238,1171,533,-257,932,352,60,968,608,155,550,318,90,223,219,96,209,412,107,97,470,95,58,339,-92,968,370,-104,481,254,-73,77,186,-54,22,415,-90,26,469,-94,26,425,-30,1874,413,-34,1540,410,-25,1314,368,-17,1053,396,176,1505,311,207,1214,322,266,964,421,-237,1494,449,-238,1174,580,-254,941,375,60,968,643,151,558,383,91,205,286,98,179,490,108,90,552,97,57,360,-93,968,377,-102,481,256,-73,79,187,-51,25,416,-90,26,468,-95,26,447,-27,1873,437,-32,1539,433,-24,1313,390,-17,1052,418,177,1504,322,206,1217,320,266,966,446,-236,1495,482,-239,1175,626,-251,951,399,60,967,674,147,562,450,91,185,356,100,148,569,110,83,634,99,57,381,-93,967,385,-101,481,258,-71,81,188,-50,28,418,-89,25,470,-95,25,470,-24,1871,461,-30,1537,455,-23,1311,413,-17,1050,439,179,1502,334,205,1219,320,266,969,471,-234,1494,516,-238,1176,670,-248,959,422,60,965,701,144,563,519,92,165,429,102,117,649,113,78,717,102,59,403,-94,965,394,-100,481,259,-70,84,189,-48,31,418,-89,25,471,-92,23,493,-20,1868,487,-28,1536,479,-21,1308,435,-17,1048,462,181,1500,347,205,1220,322,267,971,496,-232,1492,548,-238,1175,713,-245,968,445,59,963,724,140,561,589,93,145,506,104,86,729,115,75,798,105,65,424,-93,964,404,-98,480,261,-69,86,191,-47,34,419,-89,24,471,-93,23,516,-17,1865,511,-26,1533,502,-20,1305,459,-17,1045,483,183,1497,361,204,1221,324,267,973,522,-229,1490,578,-237,1175,753,-243,976,470,59,959,743,137,556,661,94,128,585,107,60,808,117,74,878,107,73,447,-93,962,414,-97,480,263,-68,88,192,-46,37,419,-88,24,471,-93,23,541,-14,1861,536,-23,1529,525,-18,1301,483,-17,1042,506,186,1494,377,204,1221,330,268,975,548,-227,1487,610,-237,1173,791,-241,982,495,59,955,758,134,547,732,96,115,665,110,38,885,118,77,955,107,84,471,-93,959,424,-96,479,265,-68,91,193,-45,41,420,-88,24,471,-93,23,565,-10,1857,561,-20,1526,550,-16,1297,508,-17,1038,528,188,1490,393,204,1220,338,270,976,574,-224,1484,639,-236,1171,828,-239,987,520,59,950,772,130,536,799,97,108,742,111,23,956,119,87,1026,108,102,495,-92,956,435,-97,478,267,-68,93,194,-45,45,420,-89,23,471,-94,22,590,-6,1853,586,-17,1521,575,-14,1293,533,-15,1033,551,191,1486,412,204,1219,348,272,977,600,-221,1481,669,-234,1168,862,-238,990,547,60,945,784,125,524,860,98,107,812,111,16,1018,119,102,1086,108,125,520,-91,952,448,-98,476,269,-69,96,195,-46,49,420,-89,23,471,-94,22,615,-1,1849,611,-14,1517,600,-11,1288,560,-14,1029,574,193,1482,431,205,1216,360,272,978,626,-217,1477,698,-233,1166,895,-236,992,574,62,939,797,122,513,910,98,108,872,109,14,1070,119,118,1135,108,146,546,-90,948,463,-100,475,272,-70,99,196,-48,54,421,-89,23,471,-94,22,640,4,1845,636,-10,1513,627,-9,1284,587,-12,1024,598,197,1477,453,206,1214,375,274,977,652,-214,1474,726,-231,1163,925,-236,993,601,63,934,813,121,506,947,95,107,917,100,12,1107,118,128,1171,110,162,572,-88,945,480,-102,474,275,-70,102,198,-49,60,421,-90,22,471,-94,21,666,10,1841,662,-6,1509,653,-6,1280,613,-10,1020,622,200,1473,477,208,1210,393,276,975,679,-210,1471,754,-229,1161,954,-235,992,629,66,929,838,119,503,966,91,100,938,88,5,1127,117,124,1189,112,158,598,-86,941,498,-105,473,280,-71,107,201,-51,68,423,-91,21,471,-94,21,692,17,1838,689,-1,1506,680,-2,1276,640,-8,1017,647,204,1470,502,209,1206,415,279,973,706,-205,1469,780,-227,1159,980,-235,990,655,69,926,868,117,501,973,87,90,940,78,-2,1135,112,103,1200,108,133,625,-84,938,519,-108,471,286,-73,112,205,-54,77,423,-93,21,471,-94,21,718,24,1836,716,4,1504,707,2,1274,668,-5,1015,672,209,1466,530,212,1201,440,281,969,735,-201,1468,805,-225,1158,1004,-234,988,682,71,926,896,115,501,972,81,79,931,71,-7,1136,102,78,1204,98,101,655,-80,935,542,-110,469,293,-75,119,210,-58,87,424,-94,19,472,-94,21,744,30,1834,743,9,1503,736,5,1273,697,-4,1014,698,213,1464,559,215,1196,468,284,965,764,-196,1467,829,-223,1157,1025,-234,984,712,72,926,921,115,499,974,76,72,927,67,-8,1138,89,61,1208,82,79,683,-80,933,570,-112,466,303,-77,126,218,-61,102,425,-94,18,471,-95,21,771,37,1833,771,15,1502,766,9,1272,728,-2,1014,725,219,1461,590,218,1192,499,286,960,792,-189,1468,851,-221,1156,1044,-234,980,742,74,926,941,114,494,988,76,70,932,68,-3,1147,79,49,1218,71,61,715,-78,931,602,-115,461,317,-79,135,230,-63,119,428,-93,17,473,-95,21,798,45,1834,799,21,1502,796,12,1273,760,0,1014,754,224,1459,622,222,1187,535,289,954,819,-183,1469,873,-218,1157,1060,-234,975,772,77,927,964,113,493,998,77,68,934,68,1,1156,80,34,1228,71,37,747,-77,930,641,-119,455,336,-79,147,249,-63,141,432,-94,17,476,-96,19,826,52,1836,827,26,1503,825,15,1274,789,2,1014,784,229,1457,656,226,1183,574,291,947,846,-178,1473,893,-215,1159,1074,-234,970,801,79,929,991,113,494,1001,77,68,935,68,2,1157,81,30,1228,72,32,777,-75,930,686,-124,448,361,-79,160,276,-63,169,438,-94,19,481,-97,16,852,59,1837,855,32,1505,853,18,1276,816,4,1017,814,234,1455,692,230,1179,617,294,941,874,-174,1477,912,-212,1163,1085,-234,965,826,80,933,1015,115,496,1002,78,68,935,68,2,1158,81,29,1229,71,30,805,-73,930,734,-129,442,391,-78,177,310,-61,200,448,-95,25,490,-99,12,879,65,1838,883,37,1507,880,21,1279,842,6,1019,845,239,1453,728,234,1174,662,296,933,900,-170,1481,929,-210,1166,1093,-234,961,852,82,936,1033,120,497,1003,79,68,935,69,2,1159,82,28,1229,72,28,832,-71,931,786,-132,437,426,-78,198,353,-60,233,467,-95,36,501,-98,9,907,72,1840,910,40,1509,906,22,1282,868,7,1021,876,242,1452,765,238,1170,712,299,925,926,-166,1486,945,-208,1170,1099,-234,958,876,83,941,1046,127,497,1003,80,68,936,69,3,1159,82,27,1230,72,28,861,-68,931,838,-133,434,470,-78,219,405,-59,262,492,-98,51,515,-102,6,934,78,1842,937,44,1511,930,23,1285,893,8,1023,906,245,1451,803,242,1166,764,301,918,951,-163,1491,959,-207,1174,1103,-234,954,899,84,944,1057,132,496,1004,81,68,936,69,4,1159,82,27,1230,72,26,886,-68,933,892,-133,434,517,-77,236,456,-56,284,528,-100,67,544,-105,17,961,82,1844,962,46,1513,955,23,1288,917,9,1026,934,247,1451,841,246,1163,817,303,913,975,-161,1495,973,-207,1179,1106,-234,952,923,86,948,1066,135,495,1005,81,68,936,69,4,1160,83,26,1230,72,26,911,-68,935,946,-133,437,562,-75,253,499,-52,298,576,-101,84,595,-109,34,989,85,1847,987,48,1517,980,23,1291,940,10,1029,962,249,1452,879,249,1160,872,304,908,997,-160,1499,985,-207,1184,1106,-235,951,946,87,951,1074,135,494,1005,82,68,936,69,5,1160,83,26,1230,72,25,935,-66,937,1000,-132,442,611,-73,266,545,-52,307,632,-101,97,653,-108,49,1017,87,1851,1011,49,1520,1003,24,1295,963,12,1032,989,250,1454,917,252,1158,928,305,906,1019,-159,1504,997,-206,1188,1106,-236,950,969,89,954,1082,135,494,1006,82,69,936,69,5,1160,83,26,1231,72,25,958,-64,941,1053,-131,450,664,-72,273,596,-52,312,691,-99,105,714,-105,58,1044,89,1855,1035,50,1524,1027,25,1299,987,13,1037,1015,250,1457,957,254,1156,985,306,906,1040,-159,1508,1008,-206,1194,1105,-237,950,991,90,958,1088,136,494,1008,82,70,936,69,6,1160,82,25,1231,73,24,982,-63,946,1105,-130,459,720,-72,276,648,-55,312,753,-95,109,779,-100,63,1070,90,1858,1058,50,1528,1051,25,1303,1010,14,1041,1040,250,1460,997,255,1156,1042,305,908,1062,-159,1512,1017,-206,1199,1104,-239,951,1013,91,962,1094,136,495,1009,82,72,937,69,8,1160,83,25,1231,72,24,1006,-62,951,1155,-129,469,775,-72,274,699,-57,306,820,-92,110,848,-95,66,1096,89,1861,1081,50,1531,1074,25,1306,1033,14,1045,1064,250,1463,1038,256,1157,1099,305,912,1085,-159,1515,1028,-206,1205,1101,-240,952,1034,89,965,1100,136,496,1010,81,74,937,68,9,1161,82,25,1231,72,23,1031,-61,955,1205,-127,480,834,-71,268,753,-59,295,889,-88,109,921,-91,67,1120,88,1864,1105,49,1534,1097,25,1309,1056,14,1048,1087,249,1467,1078,256,1159,1156,303,919,1108,-160,1518,1039,-206,1211,1099,-242,954,1056,90,967,1107,134,497,1011,80,76,938,67,11,1161,82,24,1232,72,23,1055,-61,959,1252,-124,491,892,-70,258,808,-61,278,960,-87,105,996,-88,66,1145,86,1866,1128,49,1535,1120,25,1311,1078,15,1050,1111,249,1470,1118,255,1161,1212,302,927,1131,-160,1520,1050,-206,1216,1096,-245,957,1078,90,969,1115,131,497,1013,79,79,939,66,14,1161,82,24,1232,71,21,1079,-61,961,1296,-120,502,952,-69,243,865,-61,257,1033,-86,99,1073,-85,65,1170,83,1867,1151,48,1537,1143,25,1313,1101,15,1051,1136,248,1472,1158,254,1163,1268,299,936,1154,-161,1521,1063,-206,1220,1095,-247,958,1100,91,969,1123,128,498,1015,78,81,940,64,17,1163,81,23,1233,71,20,1102,-60,963,1338,-117,511,1012,-70,231,926,-61,232,1110,-86,92,1151,-86,61,1195,81,1867,1174,47,1537,1166,25,1313,1124,16,1051,1160,247,1473,1197,254,1164,1322,296,946,1178,-163,1521,1077,-206,1223,1094,-250,960,1122,91,969,1131,126,498,1017,77,84,941,63,21,1163,80,23,1233,71,19,1125,-60,963,1377,-113,520,1075,-71,211,989,-61,203,1187,-89,85,1232,-88,57,1220,78,1867,1198,45,1536,1189,24,1312,1146,16,1051,1185,246,1473,1235,253,1167,1375,291,956,1201,-164,1520,1092,-206,1225,1094,-253,962,1144,91,969,1139,125,498,1019,76,86,942,63,25,1164,80,23,1234,71,19,1148,-60,963,1412,-110,526,1141,-71,190,1055,-62,173,1266,-91,77,1313,-91,54,1244,75,1866,1222,43,1535,1213,23,1311,1169,16,1050,1211,244,1473,1272,252,1168,1427,287,967,1225,-166,1519,1108,-206,1226,1096,-257,964,1166,91,968,1148,125,499,1021,76,89,943,62,29,1164,80,22,1234,71,18,1172,-60,962,1444,-107,530,1209,-72,168,1126,-63,140,1346,-94,70,1396,-95,53,1269,72,1865,1246,41,1534,1236,22,1309,1192,15,1048,1237,242,1472,1309,251,1170,1476,281,979,1248,-168,1516,1126,-206,1226,1099,-260,965,1189,91,966,1156,125,500,1023,76,92,944,62,33,1165,80,23,1234,71,18,1196,-60,959,1472,-105,531,1279,-73,146,1200,-65,108,1426,-96,64,1478,-99,54,1294,69,1863,1270,39,1532,1260,20,1307,1216,15,1046,1264,240,1472,1344,250,1172,1524,276,991,1272,-170,1514,1145,-206,1225,1104,-263,966,1212,90,965,1164,125,500,1025,76,95,946,62,37,1166,80,22,1234,71,18,1220,-61,957,1496,-104,529,1351,-75,125,1277,-67,77,1507,-101,61,1559,-102,58,1319,65,1860,1295,37,1529,1284,18,1305,1241,15,1043,1291,237,1471,1378,249,1173,1568,270,1004,1296,-173,1511,1165,-206,1223,1112,-267,967,1237,92,963,1173,125,501,1027,76,98,947,62,41,1166,80,22,1234,71,18,1246,-61,954,1516,-103,523,1424,-77,105,1357,-72,49,1588,-104,62,1639,-104,65,1345,61,1857,1321,34,1526,1309,17,1302,1266,15,1041,1318,234,1470,1411,248,1174,1610,264,1015,1320,-176,1507,1187,-206,1220,1122,-271,967,1261,91,961,1184,126,501,1030,76,100,949,62,46,1167,81,21,1235,71,18,1272,-61,951,1534,-102,515,1498,-81,92,1437,-77,28,1665,-107,68,1716,-108,76,1370,55,1854,1346,30,1522,1334,15,1298,1292,14,1037,1346,231,1468,1444,247,1175,1648,259,1024,1345,-179,1503,1209,-207,1217,1135,-275,966,1286,90,958,1196,127,501,1033,77,104,950,62,50,1167,80,21,1235,71,18,1299,-62,946,1550,-98,505,1565,-84,84,1511,-81,13,1734,-109,79,1784,-110,93,1395,50,1850,1372,26,1518,1360,13,1294,1320,12,1033,1374,227,1466,1475,246,1175,1685,254,1032,1370,-182,1498,1232,-208,1212,1150,-278,965,1312,89,954,1211,127,500,1036,77,107,953,63,56,1168,80,20,1235,71,17,1327,-64,942,1566,-95,496,1625,-86,81,1579,-85,5,1794,-111,93,1843,-111,112,1420,43,1846,1398,22,1514,1386,10,1290,1347,11,1028,1403,223,1464,1505,245,1174,1719,249,1037,1395,-187,1493,1256,-210,1207,1168,-280,962,1338,87,951,1228,127,499,1040,77,111,955,63,62,1169,81,19,1235,72,17,1356,-66,936,1581,-93,488,1676,-88,82,1634,-85,3,1843,-112,106,1891,-113,127,1446,37,1842,1425,17,1510,1413,7,1285,1375,9,1024,1430,218,1462,1535,244,1173,1750,245,1040,1420,-191,1487,1282,-213,1202,1189,-283,958,1366,85,946,1247,129,497,1046,78,116,959,64,70,1170,81,18,1235,72,18,1384,-68,932,1602,-92,484,1708,-86,79,1672,-80,-2,1875,-112,111,1921,-114,135,1472,30,1839,1452,12,1506,1441,4,1281,1403,6,1020,1458,213,1460,1563,243,1173,1779,242,1041,1446,-196,1481,1307,-216,1196,1214,-285,953,1395,83,942,1269,131,496,1053,78,121,964,66,79,1171,81,17,1235,72,18,1411,-71,927,1631,-92,481,1724,-84,72,1683,-75,-4,1890,-110,100,1937,-113,123,1498,22,1836,1480,6,1503,1470,1,1277,1432,4,1016,1486,208,1458,1590,242,1171,1805,240,1039,1472,-201,1475,1334,-220,1190,1242,-287,946,1424,81,938,1295,133,493,1062,80,127,970,68,89,1172,80,16,1236,72,17,1440,-72,923,1660,-92,477,1732,-81,67,1682,-72,-4,1899,-105,76,1950,-106,92,1525,14,1834,1508,0,1500,1498,-4,1275,1462,3,1012,1515,203,1458,1614,241,1170,1829,239,1036,1498,-207,1471,1362,-223,1184,1272,-288,939,1455,80,933,1326,135,488,1073,82,133,978,71,101,1173,80,16,1237,73,16,1470,-74,921,1685,-92,476,1741,-81,65,1684,-71,-3,1908,-99,57,1960,-100,68,1552,5,1832,1535,-6,1498,1528,-8,1273,1493,1,1010,1543,198,1457,1637,239,1169,1849,239,1030,1524,-213,1466,1392,-226,1179,1307,-289,931,1487,78,930,1363,138,482,1087,84,141,990,73,117,1175,80,16,1239,73,15,1499,-75,920,1708,-93,471,1750,-80,63,1689,-70,1,1917,-95,42,1970,-97,49,1579,-3,1832,1563,-12,1498,1558,-12,1272,1524,-1,1009,1571,192,1457,1659,238,1168,1866,239,1022,1551,-218,1463,1423,-230,1173,1344,-290,923,1518,75,928,1406,142,473,1108,85,150,1009,75,138,1180,80,17,1242,73,13,1529,-78,920,1732,-94,468,1754,-79,63,1691,-69,2,1922,-96,32,1974,-97,37];
var MO_G = [3,-5,45,183,-84,0,-4,-12,173,209,-48,0,-33,-11,351,226,-54,0,-87,5,598,244,-60,0,-102,-7,722,252,-58,0,-116,7,808,262,-59,0,-120,22,846,273,-63,0,-117,46,860,284,-68,0,-106,49,863,295,-72,0,-92,42,838,304,-76,0,-78,36,807,313,-76,0,-66,27,750,322,-78,0,-53,22,686,332,-80,0,-40,22,627,341,-83,0,-30,20,583,351,-85,0,-22,18,546,357,-85,0,-14,17,525,364,-85,0,-8,14,520,369,-84,0,-2,11,520,372,-83,0,4,11,530,376,-80,0,9,13,541,380,-78,0,13,11,567,383,-76,0,21,9,604,386,-73,0,33,9,640,388,-72,0,49,11,688,389,-72,0,66,17,747,391,-72,0,83,22,798,391,-73,0,101,26,826,393,-73,0,118,27,834,394,-73,0,134,29,817,394,-73,0,156,32,757,395,-74,0,180,32,653,397,-74,0,149,26,496,402,-75,0,105,11,314,413,-76,0,45,2,172,433,-73,0,22,5,75,449,-73,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var MO_IX = (function () { var o = {}; MO_J.forEach(function (n, i) { o[n] = i; }); return o; })();
/* joint n at phase p (0..1) of the stride, in metres */
function mo(n, p) {
  var i = MO_IX[n], f = p * (MO_N - 1), a = Math.floor(f), t = f - a, b = Math.min(MO_N - 1, a + 1);
  var ia = (a * MO_J.length + i) * 3, ib = (b * MO_J.length + i) * 3;
  return [(MO_P[ia] + (MO_P[ib] - MO_P[ia]) * t) / 1000,
          (MO_P[ia + 1] + (MO_P[ib + 1] - MO_P[ia + 1]) * t) / 1000,
          (MO_P[ia + 2] + (MO_P[ib + 2] - MO_P[ia + 2]) * t) / 1000];
}
/* the right-foot ground reaction force at phase p: {F:[x,y,z] N, C:[x,y,z] m, on} */
function moG(p) {
  var f = p * (MO_N - 1), a = Math.floor(f), t = f - a, b = Math.min(MO_N - 1, a + 1);
  var ia = a * 6, ib = b * 6, i, F = [], Cc = [];
  if (MO_G[ia + 2] === 0 || MO_G[ib + 2] === 0) t = MO_G[ia + 2] === 0 ? 1 : 0;
  for (i = 0; i < 3; i++) F.push(MO_G[ia + i] + (MO_G[ib + i] - MO_G[ia + i]) * t);
  for (i = 3; i < 6; i++) Cc.push((MO_G[ia + i] + (MO_G[ib + i] - MO_G[ia + i]) * t) / 1000);
  return { F: F, C: Cc, on: F[2] > 25 };
}
/* the sagittal ankle moment the plantarflexors must be producing, straight from
   the measured force and the measured ankle position: M = (COP - ankle) x F */
function moAnkleM(p) {
  var g = moG(p); if (!g.on) return 0;
  var a = mo('ankR', p);
  var rx = g.C[0] - a[0], rz = g.C[2] - a[2];
  return -(rz * g.F[0] - rx * g.F[2]);
}

/* ============================================================
   9. THREE DIMENSIONS, ON A MEASURED BODY
   Everything from here on is driven by MO_* above: one stride of walking
   recorded in the lab, so the figure on the slide is a person who actually
   walked, and the force vector is the one the plate actually measured.

   Body axes: x is the direction of travel, y is to the subject's left,
   z is up. Every plane and every force component is named against those.
   ============================================================ */

/* a tiny isometric projector: body coordinates in, canvas pixels out */
function view3(az, tilt, S, cx, cy) {
  var ca = Math.cos(az), sa = Math.sin(az), ct = Math.cos(tilt), st = Math.sin(tilt);
  return function (x, y, z) {
    var u = x * ca - y * sa, v = x * sa + y * ca;
    return { x: cx + u * S, y: cy + (v * st - z * ct) * S, d: v };
  };
}

/* the segments between the measured joint centres. The third entry says which
   side the segment belongs to, so the near leg can be drawn in a colour that
   separates it from the far one. */
var MO_LINKS = [
  ['head', 'neck', 'c'], ['neck', 'trunk', 'c'], ['trunk', 'pelvis', 'c'],
  ['neck', 'shL', 'l'], ['shL', 'elL', 'l'], ['elL', 'wrL', 'l'],
  ['neck', 'shR', 'r'], ['shR', 'elR', 'r'], ['elR', 'wrR', 'r'],
  ['pelvis', 'hipL', 'l'], ['hipL', 'kneeL', 'l'], ['kneeL', 'ankL', 'l'],
  ['ankL', 'heelL', 'l'], ['heelL', 'mtL', 'l'], ['mtL', 'toeL', 'l'], ['ankL', 'mtL', 'l'],
  ['pelvis', 'hipR', 'r'], ['hipR', 'kneeR', 'r'], ['kneeR', 'ankR', 'r'],
  ['ankR', 'heelR', 'r'], ['heelR', 'mtR', 'r'], ['mtR', 'toeR', 'r'], ['ankR', 'mtR', 'r']
];

/* draw the measured skeleton at phase p through a projector */
function moDraw(c, P, p, o) {
  o = o || {};
  var K = C();
  var col = { c: o.mid || K.MUT, l: o.left || K.SOFT, r: o.right || K.MUT };
  var w = o.w || 5, i;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.globalAlpha = o.alpha == null ? 1 : o.alpha;
  /* far side first, then the trunk, then the near side on top */
  ['l', 'c', 'r'].forEach(function (side) {
    c.strokeStyle = col[side];
    c.lineWidth = side === 'r' ? w : w * 0.82;
    for (i = 0; i < MO_LINKS.length; i++) {
      var s = MO_LINKS[i];
      if (s[2] !== side) continue;
      var a = mo(s[0], p), b = mo(s[1], p);
      var A = P(a[0], a[1], a[2]), B = P(b[0], b[1], b[2]);
      c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
    }
  });
  var h = mo('head', p), n = mo('neck', p);
  var H = P(h[0], h[1], h[2]), N = P(n[0], n[1], n[2]);
  var r = Math.max(4, Math.hypot(H.x - N.x, H.y - N.y) * 0.40);
  c.fillStyle = col.c;
  c.beginPath();
  c.arc(N.x + (H.x - N.x) * 0.62, N.y + (H.y - N.y) * 0.62, r, 0, 7);
  c.fill();
  c.restore();
}

/* drag anywhere on the figure to turn it. data-prevent-swipe keeps reveal's
   own swipe handler from eating the gesture. */
function dragRotate(cv, st, redraw) {
  cv.setAttribute('data-prevent-swipe', '');
  cv.style.cursor = 'grab';
  cv.style.touchAction = 'none';
  var down = false, lx = 0, ly = 0;
  cv.addEventListener('pointerdown', function (e) {
    down = true; lx = e.clientX; ly = e.clientY; cv.style.cursor = 'grabbing';
    if (cv.setPointerCapture && e.pointerId != null) { try { cv.setPointerCapture(e.pointerId); } catch (x) {} }
  });
  cv.addEventListener('pointermove', function (e) {
    if (!down) return;
    st.az -= (e.clientX - lx) * 0.011;
    st.tilt = Math.max(-0.05, Math.min(1.15, st.tilt + (e.clientY - ly) * 0.006));
    lx = e.clientX; ly = e.clientY;
    e.preventDefault();
    redraw();
  });
  function up() { down = false; cv.style.cursor = 'grab'; }
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', up);
}

/* the floor, drawn as a grid that slides past as the body moves forward */
function moFloor(c, P, K, x0, half, step) {
  var i;
  c.save();
  c.strokeStyle = K.SOFT; c.globalAlpha = 0.45; c.lineWidth = 1;
  for (i = -3; i <= 3; i++) {
    var gx = Math.round((x0 + i * step) / step) * step;
    var a = P(gx, -half, 0), b = P(gx, half, 0);
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  }
  [-half, 0, half].forEach(function (gy) {
    var a = P(x0 - 3 * step, gy, 0), b = P(x0 + 3 * step, gy, 0);
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  });
  c.restore();
}

var PLANES = [
  { k: 'sagittal', n: 'sagittal', col: 'ACC',
    t: 'Divides left from right. Flexion and extension happen in it — walking, ' +
       'running, a squat. It is normal to the <b>y</b> axis.' },
  { k: 'frontal', n: 'frontal', col: 'GRN',
    t: 'Divides front from back. Abduction and adduction happen in it — a side ' +
       'lunge, a lateral step. It is normal to the <b>x</b> axis.' },
  { k: 'transverse', n: 'transverse', col: 'BLUE',
    t: 'Divides top from bottom. Rotation happens in it — a golf swing, a pivot. ' +
       'It is normal to the <b>z</b> axis.' }
];

D.register('planes3d', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 660, h: port ? 470 : 480,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var pick = 'all', p = 0.14;
  var st = { az: -0.62, tilt: 0.42 };

  /* the quads are given in world coordinates, because the projector is the
     thing that moves them onto the body. */
  function quad(c, P, kind, col, alpha, ox, oy, oz) {
    var R = 0.62, TOP = 2.02, q;
    if (kind === 'sagittal')      q = [[ox - R, oy, 0], [ox + R, oy, 0], [ox + R, oy, TOP], [ox - R, oy, TOP]];
    else if (kind === 'frontal')  q = [[ox, oy - R, 0], [ox, oy + R, 0], [ox, oy + R, TOP], [ox, oy - R, TOP]];
    else                          q = [[ox - R, oy - R, oz], [ox + R, oy - R, oz],
                                       [ox + R, oy + R, oz], [ox - R, oy + R, oz]];
    c.save();
    c.beginPath();
    q.forEach(function (v, i) {
      var s = P(v[0], v[1], v[2]);
      if (i === 0) c.moveTo(s.x, s.y); else c.lineTo(s.x, s.y);
    });
    c.closePath();
    c.globalAlpha = alpha; c.fillStyle = col; c.fill();
    c.globalAlpha = Math.min(1, alpha * 3.2); c.strokeStyle = col; c.lineWidth = 1.5; c.stroke();
    c.restore();
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var S = H * 0.44;
    var pel = mo('pelvis', p);
    var ox = pel[0], oy = pel[1], oz = pel[2];
    var P0 = view3(st.az, st.tilt, S, W * 0.5, H * 0.46);
    var P = function (x, y, z) { return P0(x - ox, y - oy, z - oz); };

    moFloor(c, P, K, ox, 0.62, 0.45);

    PLANES.forEach(function (pl) {
      if (pick !== 'all' && pick !== pl.k) return;
      quad(c, P, pl.k, C()[pl.col], pick === pl.k ? 0.20 : 0.10, ox, oy, oz);
    });

    moDraw(c, P, p, { w: 5.5, mid: K.MUT, left: K.DEEP, right: K.INK });

    /* the three axes, through the body */
    [[[-0.62, 0, 0], [0.68, 0, 0], 'ACC', 'x  direction of travel'],
     [[0, 0.62, 0], [0, -0.68, 0], 'GRN', 'y  lateral'],
     [[0, 0, -oz], [0, 0, 2.08 - oz], 'BLUE', 'z  vertical']].forEach(function (a) {
      var s = P(a[0][0] + ox, a[0][1] + oy, a[0][2] + oz);
      var e = P(a[1][0] + ox, a[1][1] + oy, a[1][2] + oz);
      arrow(c, s.x, s.y, e.x, e.y, { color: C()[a[2]], width: 2.2 });
      label(c, a[3], e.x + (a[2] === 'GRN' ? -8 : 8), e.y - 2,
            { color: C()[a[2]], size: 13, align: a[2] === 'GRN' ? 'right' : 'left', plate: true });
    });

    var cur = PLANES.filter(function (x) { return x.k === pick; })[0];
    out.innerHTML = (cur
      ? '<b style="color:' + C()[cur.col] + '">' + cur.n + ' plane</b> — ' + cur.t
      : 'Three planes, three axes, on a real body.') +
      '<span class="hint">One stride of walking recorded in the UVic lab — 119 markers ' +
      'at 90 Hz. <b>Drag the figure to turn it</b>, and scrub through the stride to see ' +
      'the planes travel with the body rather than with the room.</span>';
  }

  var r = ctlRow(u.ctl);
  seg(r, [['all', 'all three'], ['sagittal', 'sagittal'],
          ['frontal', 'frontal'], ['transverse', 'transverse']], pick,
      function (v) { pick = v; draw(); });
  slider(u.ctl, 'Through the stride', 0, 100, 1, p * 100,
    function (v) { return fmt(v, 0) + ' %'; }, function (v) { p = v / 100; draw(); });
  slider(u.ctl, 'Turn the body', -180, 180, 1, st.az * 180 / Math.PI,
    function (v) { return fmt(v, 0) + '°'; },
    function (v) { st.az = v * Math.PI / 180; draw(); });

  dragRotate(u.cv, st, draw);
  node._draw = draw;
  draw();
});


/* ============================================================
   10. ONE FORCE, THREE COMPONENTS
   The same measured stride, with the force the plate recorded under the
   right foot drawn where it acted, and split along the three body axes.
   ============================================================ */
D.register('grf3d', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 940, h: port ? 620 : 450,
                            padl: 72, padr: 26, padt: 16, padb: 46 });
  var out = readout(u.ctl);
  var p = 0.15, playing = false, raf, last = 0;
  var st = { az: -0.58, tilt: 0.34 };
  var BW = MO_MASS * G;

  var COMPS = [
    { i: 2, lab: 'vertical  z (N)', col: 'BLUE' },
    { i: 0, lab: 'fore–aft  x (N)', col: 'ACC' },
    { i: 1, lab: 'side–side  y (N)', col: 'GRN' }
  ];
  /* landscape puts the figure beside the traces; a phone stacks them. */
  function bands(H) {
    return port
      ? [{ pt: H * 0.39, pb: H * 0.44 }, { pt: H * 0.58, pb: H * 0.25 }, { pt: H * 0.77, pb: 46 }]
      : [{ pt: 14, pb: H - 128 }, { pt: H * 0.37, pb: H * 0.39 }, { pt: H * 0.70, pb: 46 }];
  }
  var SER = (function () {
    var s = [[], [], []], i, j;
    for (i = 0; i < MO_N; i++) for (j = 0; j < 3; j++) s[j].push(MO_G[i * 6 + j]);
    return s;
  })();

  function scene(c, K, W, H) {
    var S = port ? H * 0.135 : H * 0.36;
    var pel = mo('pelvis', p);
    var P0 = view3(st.az, st.tilt, S, port ? W * 0.5 : W * 0.21, port ? H * 0.21 : H * 0.54);
    var P = function (x, y, z) { return P0(x - pel[0], y, z - 0.95); };

    moFloor(c, P, K, pel[0], 0.6, 0.4);
    moDraw(c, P, p, { w: 4.6, mid: K.MUT, left: K.DEEP, right: K.INK });

    var g = moG(p);
    if (!g.on) {
      label(c, 'right foot in the air', W * 0.20, H * 0.94,
            { color: K.MUT, size: 13, align: 'center' });
      return;
    }
    var k = 0.95 / 900;                        /* metres of arrow per newton */
    var O = P(g.C[0], g.C[1], 0);
    var R = P(g.C[0] + g.F[0] * k, g.C[1] + g.F[1] * k, g.F[2] * k);
    var Zp = P(g.C[0], g.C[1], g.F[2] * k);
    var Xp = P(g.C[0] + g.F[0] * k, g.C[1], 0);
    var Yp = P(g.C[0], g.C[1] + g.F[1] * k, 0);

    c.save();
    c.setLineDash([4, 3]); c.globalAlpha = 0.5; c.lineWidth = 1.2; c.strokeStyle = K.SOFT;
    c.beginPath(); c.moveTo(Zp.x, Zp.y); c.lineTo(R.x, R.y); c.stroke();
    c.restore();
    arrow(c, O.x, O.y, Zp.x, Zp.y, { color: K.BLUE, width: 2.4 });
    if (Math.abs(g.F[0]) > 8) arrow(c, O.x, O.y, Xp.x, Xp.y, { color: K.ACC, width: 2.2 });
    if (Math.abs(g.F[1]) > 6) arrow(c, O.x, O.y, Yp.x, Yp.y, { color: K.GRN, width: 2.2 });
    arrow(c, O.x, O.y, R.x, R.y, { color: K.ACC, width: 5 });
    label(c, fmt(Math.hypot(g.F[0], g.F[1], g.F[2]), 0) + ' N', R.x + 10, R.y - 4,
          { color: K.ACC, size: 14, plate: true });
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    scene(c, K, W, H);

    ax.pl = port ? 66 : W * 0.44; ax.pr = port ? 18 : 26;
    var P3 = bands(H);
    COMPS.forEach(function (cp, i) {
      var a = SER[cp.i];
      var lo = Math.min.apply(null, a), hi = Math.max.apply(null, a);
      var pad = (hi - lo) * 0.18; lo -= pad; hi += pad;
      ax.pt = P3[i].pt; ax.pb = P3[i].pb;
      ax.setRange(0, 1, lo, hi);
      ax.frame({ grid: true, xticks: i === 2 ? [0, 0.25, 0.5, 0.75, 1] : [],
                 yticks: axisTicks(lo, hi), ylabel: cp.lab, ysize: 12.5,
                 ylabelx: port ? 12 : W * 0.44 - 58,
                 xlabel: i === 2 ? 'stride (%)' : null,
                 xfmt: function (v) { return fmt(v * 100, 0); },
                 yfmt: function (v) { return fmt(v, 0); } });
      if (lo < 0) ax.poly([[0, 0], [1, 0]], { color: K.SOFT, width: 1 });
      var pts = [], j;
      for (j = 0; j < MO_N; j++) pts.push([j / (MO_N - 1), a[j]]);
      ax.poly(pts, { color: K[cp.col], width: 2.6 });
      ax.poly([[MO_RTO, lo], [MO_RTO, hi]], { color: K.SOFT, width: 1, dash: [3, 4] });
      if (i === 0) label(c, 'toe off', ax.X(MO_RTO) + 5, ax.pt + 12,
                         { color: K.MUT, size: 11, weight: '600' });
      ax.poly([[p, lo], [p, hi]], { color: K.MUT, width: 1, dash: [3, 3] });
      var v = moG(p).F[cp.i];
      ax.dots([[p, v]], { color: K[cp.col], r: 5 });
      label(c, fmt(v, 0) + ' N', ax.X(p) + 10, ax.Y(v) - 12,
            { color: K[cp.col], size: 12.5, plate: true });
    });
    var g = moG(p);
    out.innerHTML =
      fmt(p * 100, 0) + '% of the stride &nbsp;·&nbsp; ' +
      (g.on
        ? 'vertical <b class="b">' + fmt(g.F[2], 0) + ' N</b> (' + fmt(g.F[2] / BW, 2) +
          ' BW) · fore–aft <b class="r">' + fmt(g.F[0], 0) + ' N</b> · side to side ' +
          '<b class="g">' + fmt(g.F[1], 0) + ' N</b>'
        : 'the right foot is in the air — no force on the plate') +
      '<span class="hint">' +
      (g.on && g.F[0] < -8 ? 'The fore–aft component is <b>negative</b>: the ground is pushing ' +
                             'backwards on the walker. This is the braking half of the step. '
       : g.on && g.F[0] > 8 ? 'The fore–aft component is <b>positive</b>: the ground is pushing ' +
                              'the walker forwards. This is the propulsive half. '
       : '') +
      'One stride from the UVic youth motion dataset — 119 markers at 90 Hz over a force ' +
      'plate at 450 Hz. The vertical component is about seven times the others, which is why ' +
      'it is the one everybody quotes, and why the small ones are where the interesting ' +
      'things hide.</span>';
  }

  var s = slider(u.ctl, 'Through the stride', 0, 100, 1, p * 100,
    function (v) { return fmt(v, 0) + ' %'; }, function (v) { p = v / 100; draw(); });
  slider(u.ctl, 'Turn the body', -180, 180, 1, st.az * 180 / Math.PI,
    function (v) { return fmt(v, 0) + '°'; },
    function (v) { st.az = v * Math.PI / 180; draw(); });
  var pb = playBtn(ctlRow(u.ctl), '▶ Take a step');
  pb.setAttribute('data-unsafe', '1');
  pb.addEventListener('click', function () {
    playing = !playing;
    pb.textContent = playing ? '❚❚ Pause' : '▶ Take a step';
    if (playing) { last = 0; raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf);
  });
  function loop(ts) {
    if (!last) last = ts;
    p += (ts - last) / (MO_STRIDE * 2200);
    if (p > 1) p -= 1;
    last = ts; s.input.value = p * 100; s.sync();
    if (playing) raf = requestAnimationFrame(loop);
  }
  dragRotate(u.cv, st, draw);
  node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Take a step'; };
  node._draw = draw;
  draw();
});


/* ============================================================
   12. INVERSE DYNAMICS AND EMG
   The last step of the lecture, on the measured stride. You cannot put a
   gauge on a living Achilles, so you work backwards: the plate gives the
   force and where it acts, the markers give where the ankle is, and the
   cross product of the two is the moment the plantarflexors had to make.
   Divide by their moment arm and you have a muscle force — provided one
   muscle group made all of it, which is the part EMG speaks to.
   ============================================================ */
function emgSol(p) {
  if (p < 0 || p > 1) return 0;
  return Math.exp(-Math.pow((p - 0.34) / 0.16, 2)) * (p < 0.55 ? 1 : Math.exp(-Math.pow((p - 0.55) / 0.04, 2)));
}
function emgTA(p) {
  if (p < 0 || p > 1) return 0;
  return 0.95 * Math.exp(-Math.pow((p - 0.03) / 0.07, 2)) +
         0.55 * Math.exp(-Math.pow((p - 0.72) / 0.13, 2));
}

D.register('invdyn', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 920, h: port ? 620 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var p = 0.45, arm = 0.050, co = false, playing = false, raf, last = 0;
  var st = { az: 0.02, tilt: 0.06 };
  var TA_PEAK = 22;

  function netM(q) { return Math.max(0, moAnkleM(q)); }
  function agoM(q) { return netM(q) + (co ? TA_PEAK * emgTA(q) : 0); }
  function fMus(q) { return agoM(q) / arm; }
  var MMAX = (function () { var m = 0, i;
    for (i = 0; i < 200; i++) m = Math.max(m, netM(i / 199) + TA_PEAK);
    return m; })();

  function scene(c, K, W, H) {
    var S = port ? H * 0.165 : H * 0.38;
    var pel = mo('pelvis', p);
    var P0 = view3(st.az, st.tilt, S, port ? W * 0.5 : W * 0.23, port ? H * 0.24 : H * 0.54);
    var P = function (x, y, z) { return P0(x - pel[0], y, z - 0.95); };

    moFloor(c, P, K, pel[0], 0.45, 0.4);
    moDraw(c, P, p, { w: 5, mid: K.MUT, left: K.DEEP, right: K.INK });

    var g = moG(p);
    var ank = mo('ankR', p), heel = mo('heelR', p);
    var A = P(ank[0], ank[1], ank[2]);
    if (!g.on) {
      label(c, 'swing — nothing to solve', W * 0.20, H * 0.95,
            { color: K.MUT, size: 13, align: 'center' });
      return;
    }
    var k = 0.85 / 900;
    var O = P(g.C[0], g.C[1], 0);
    var R = P(g.C[0] + g.F[0] * k, g.C[1] + g.F[1] * k, g.F[2] * k);
    arrow(c, O.x, O.y, R.x, R.y, { color: K.BLUE, width: 4.6 });
    label(c, fmt(Math.hypot(g.F[0], g.F[2]), 0) + ' N', R.x - 12, R.y - 10,
          { color: K.BLUE, size: 13.5, align: 'right', plate: true });

    /* the lever the measured force has about the measured ankle */
    var ux = R.x - O.x, uy = R.y - O.y, L = Math.hypot(ux, uy) || 1;
    ux /= L; uy /= L;
    var t = (A.x - O.x) * ux + (A.y - O.y) * uy;
    var fx = O.x + ux * t, fy = O.y + uy * t;
    c.save();
    c.strokeStyle = K.ACC; c.lineWidth = 1.6; c.setLineDash([4, 3]);
    c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(fx, fy); c.stroke();
    c.restore();
    label(c, 'GRF lever arm', (A.x + fx) / 2 + 26, (A.y + fy) / 2 - 22,
          { color: K.ACC, size: 11.5, plate: true });

    /* the Achilles, and the force the moment implies */
    var Hi = P(heel[0], heel[1], heel[2] + 0.02);
    var Cp = P(ank[0] - 0.045, ank[1], ank[2] + 0.30);
    c.save();
    c.strokeStyle = K.MUT; c.globalAlpha = 0.75; c.lineWidth = 7;
    c.beginPath(); c.moveTo(Hi.x, Hi.y); c.lineTo(Cp.x, Cp.y); c.stroke();
    c.restore();
    var mx = Cp.x - Hi.x, my = Cp.y - Hi.y, ML = Math.hypot(mx, my) || 1;
    var F = fMus(p), msc = (S * 0.85) / (MMAX / 0.030);
    arrow(c, Hi.x, Hi.y, Hi.x + mx / ML * F * msc, Hi.y + my / ML * F * msc,
          { color: K.ORG, width: 4.6 });
    label(c, fmt(F, 0) + ' N', Hi.x + mx / ML * F * msc - 10,
          Hi.y + my / ML * F * msc - 8, { color: K.ORG, size: 13.5, align: 'right', plate: true });
    label(c, 'd = ' + fmt(arm * 100, 1) + ' cm', A.x - 16, A.y - 30,
          { color: K.ORG, size: 11.5, align: 'right', plate: true });

    c.save(); c.fillStyle = K.INK;
    c.beginPath(); c.arc(A.x, A.y, 5, 0, 7); c.fill(); c.restore();
    label(c, 'ankle', A.x + 12, A.y + 16, { color: K.MUT, size: 11.5, plate: true });
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    scene(c, K, W, H);

    ax.pl = port ? 66 : W * 0.48; ax.pr = port ? 18 : 26;
    var i, pts;
    var LBX = port ? 12 : W * 0.48 - 56;

    ax.pt = port ? H * 0.47 : 16; ax.pb = port ? H * 0.31 : H * 0.56;
    ax.setRange(0, 1, 0, Math.ceil(MMAX / 25) * 25);
    ax.frame({ grid: true, xticks: [], yticks: axisTicks(0, MMAX),
               ylabel: 'ankle moment (N·m)', ysize: 12.5, ylabelx: LBX,
               yfmt: function (v) { return fmt(v, 0); } });
    pts = [];
    for (i = 0; i < 120; i++) pts.push([i / 119, netM(i / 119)]);
    ax.poly(pts, { color: K.ACC, width: 2.6 });
    if (co) {
      pts = [];
      for (i = 0; i < 120; i++) pts.push([i / 119, agoM(i / 119)]);
      ax.poly(pts, { color: K.ORG, width: 2, dash: [5, 3] });
      label(c, 'what the plantarflexors really made', ax.X(0.02), ax.Y(MMAX * 0.94),
            { color: K.ORG, size: 11 });
    }
    ax.poly([[p, 0], [p, MMAX]], { color: K.MUT, width: 1, dash: [3, 3] });
    ax.dots([[p, netM(p)]], { color: K.ACC, r: 5 });

    var top = Math.max(400, MMAX / arm * 1.05);
    ax.pt = port ? H * 0.72 : H * 0.52; ax.pb = 52;
    ax.setRange(0, 1, 0, top);
    ax.frame({ grid: true, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: axisTicks(0, top),
               xlabel: 'stride (%)', ylabel: 'muscle force (N)', ysize: 12.5,
               ylabelx: LBX,
               xfmt: function (v) { return fmt(v * 100, 0); },
               yfmt: function (v) { return fmt(v, 0); } });
    pts = [];
    for (i = 0; i < 120; i++) pts.push([i / 119, fMus(i / 119)]);
    ax.poly(pts, { color: K.ORG, width: 2.8 });
    var e1 = [], e2 = [];
    for (i = 0; i < 120; i++) {
      e1.push([i / 119, emgSol(i / 119) * top * 0.9]);
      e2.push([i / 119, emgTA(i / 119) * top * 0.9]);
    }
    ax.poly(e1, { color: K.GRN, width: 1.8, dash: [5, 3] });
    if (co) ax.poly(e2, { color: K.BLUE, width: 1.8, dash: [5, 3] });
    label(c, 'soleus EMG (illustrative)', ax.X(0.02), ax.Y(top * 0.96),
          { color: K.GRN, size: 11 });
    if (co) label(c, 'tibialis anterior EMG', ax.X(0.60), ax.Y(top * 0.96),
                  { color: K.BLUE, size: 11 });
    ax.poly([[p, 0], [p, top]], { color: K.MUT, width: 1, dash: [3, 3] });
    ax.dots([[p, fMus(p)]], { color: K.ORG, r: 5 });

    var g = moG(p);
    out.innerHTML =
      fmt(p * 100, 0) + '% of the stride &nbsp;·&nbsp; ' +
      (g.on
        ? 'measured force <b class="b">' + fmt(Math.hypot(g.F[0], g.F[2]), 0) +
          ' N</b> → ankle moment <b class="r">' + fmt(netM(p), 0) + ' N·m</b> ÷ moment arm <b>' +
          fmt(arm * 100, 1) + ' cm</b> = plantarflexor force <b>' + fmt(fMus(p), 0) + ' N</b> (' +
          fmt(fMus(p) / (MO_MASS * G), 1) + ' body weights)'
        : 'the right foot is in the air — no force, no moment, nothing to solve') +
      '<span class="hint">' +
      (co ? 'With the antagonist co-contracting, the <b>net</b> moment is smaller than what the ' +
            'plantarflexors actually produced, so inverse dynamics alone under-reads the muscle ' +
            'force. EMG is what tells you the antagonist is on. '
          : 'The moment is not assumed — it is <b>(COP − ankle) × F</b>, taken straight from the ' +
            'plate and the markers. Dividing by the moment arm assumes one muscle group made all ' +
            'of it, and that you know the arm: slide it from 3 to 7 cm and the answer halves. ') +
      'Moments computed from the measured stride; the EMG envelopes are drawn from the textbook ' +
      'pattern, not from this trial.</span>';
  }

  var sP = slider(u.ctl, 'Through the stride', 0, 100, 1, p * 100,
    function (v) { return fmt(v, 0) + ' %'; }, function (v) { p = v / 100; draw(); });
  slider(u.ctl, 'Achilles moment arm', 3, 7, 0.1, arm * 100,
    function (v) { return fmt(v, 1) + ' cm'; }, function (v) { arm = v / 100; draw(); });
  var r = ctlRow(u.ctl);
  var pb = playBtn(r, '▶ Take a step');
  pb.setAttribute('data-unsafe', '1');
  var cb = el('button', 'ibtn', 'Add antagonist co-contraction');
  cb.addEventListener('click', function () {
    co = !co; cb.classList.toggle('on', co);
    cb.textContent = co ? 'Agonist only' : 'Add antagonist co-contraction';
    draw();
  });
  r.appendChild(cb);
  pb.addEventListener('click', function () {
    playing = !playing;
    pb.textContent = playing ? '❚❚ Pause' : '▶ Take a step';
    if (playing) { last = 0; raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf);
  });
  function loop(ts) {
    if (!last) last = ts;
    p += (ts - last) / (MO_STRIDE * 2400);
    if (p > 1) p -= 1;
    last = ts; sP.input.value = p * 100; sP.sync();
    if (playing) raf = requestAnimationFrame(loop);
  }
  dragRotate(u.cv, st, draw);
  node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Take a step'; };
  node._draw = draw;
  draw();
});


D.boot();

})();
