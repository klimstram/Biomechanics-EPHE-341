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


/* One measured walking step — AddBiomechanics subject from Uhlrich et al. (2023),
   78.2 kg, 1.96 m, stance 775 ms, resampled to 101 points across stance. */
var GAIT = {
  mass: 78.2, height: 1.96, stanceMs: 775,
  vert: [655.7,669.9,683.9,697.8,711.4,724.6,736.8,747.6,757.1,764.9,770.2,773.5,774.7,774.0,771.1,766.1,759.6,751.8,742.9,733.0,722.8,712.4,702.3,692.5,683.5,675.5,668.3,662.2,657.4,653.8,651.4,650.0,649.6,650.4,652.1,654.5,657.5,661.2,665.4,669.9,674.7,679.7,685.0,690.4,695.9,701.4,707.1,712.7,718.4,724.1,729.8,735.5,741.3,747.2,753.0,758.8,764.7,770.5,776.3,782.0,787.5,793.0,798.2,803.2,807.9,812.0,815.6,818.6,820.8,821.9,821.7,820.2,817.2,812.4,805.1,795.7,783.9,769.6,752.0,731.3,707.7,681.3,652.0,619.1,583.8,546.5,507.3,466.4,424.8,383.1,341.7,301.1,262.4,225.5,190.9,158.6,129.8,103.9,80.1,59.8,45.3],
  ap: [-132.3,-134.1,-135.7,-136.8,-137.6,-138.0,-137.9,-137.3,-136.3,-134.9,-133.0,-130.7,-128.0,-125.1,-121.9,-118.4,-114.7,-110.9,-107.0,-103.1,-99.1,-95.1,-91.1,-87.2,-83.4,-79.6,-75.9,-72.3,-68.8,-65.4,-62.0,-58.7,-55.4,-52.2,-49.0,-45.8,-42.6,-39.4,-36.3,-33.1,-29.9,-26.8,-23.7,-20.6,-17.5,-14.5,-11.5,-8.6,-5.7,-2.8,0.1,3.1,6.1,9.2,12.4,15.7,19.1,22.7,26.4,30.3,34.4,38.5,42.8,47.2,51.7,56.3,61.0,65.7,70.3,75.0,79.6,84.1,88.4,92.6,96.5,100.1,103.3,106.1,108.2,109.6,110.3,110.3,109.4,107.4,104.5,100.7,96.1,90.6,84.3,77.5,70.3,62.8,55.2,47.8,40.6,33.7,27.4,21.6,16.3,11.8,8.6],
  ml: [-6.4,-9.2,-11.8,-14.3,-16.6,-18.8,-20.7,-22.5,-24.1,-25.5,-26.8,-27.8,-28.8,-29.6,-30.1,-30.5,-30.7,-30.6,-30.4,-29.8,-29.1,-28.1,-27.1,-25.9,-24.7,-23.5,-22.3,-21.3,-20.3,-19.5,-18.8,-18.1,-17.5,-17.1,-16.6,-16.2,-15.8,-15.4,-15.0,-14.6,-14.3,-14.0,-13.7,-13.5,-13.4,-13.2,-13.2,-13.2,-13.2,-13.3,-13.4,-13.6,-13.9,-14.2,-14.7,-15.2,-15.8,-16.4,-17.0,-17.7,-18.4,-19.0,-19.6,-20.1,-20.5,-20.7,-20.8,-20.8,-20.6,-20.3,-19.7,-18.9,-18.0,-16.9,-15.6,-14.1,-12.5,-10.8,-9.0,-7.1,-5.2,-3.2,-1.3,0.5,2.1,3.7,5.0,6.1,6.8,7.4,7.7,7.7,7.5,7.2,6.7,6.0,5.4,4.6,3.9,3.2,2.7],
  mHip: [-21.9,-28.0,-36.8,-43.1,-43.6,-37.5,-32.4,-31.7,-31.1,-23.5,-5.7,2.2,2.7,-0.6,0.3,2.0,3.1,3.9,4.7,5.6,6.1,5.8,4.8,3.6,3.8,3.3,0.7,-4.5,-4.3,2.7,7.2,6.5,2.2,4.2,7.9,11.5,13.8,16.0,18.2,22.5,27.5,29.0,16.8,16.3,29.5,51.7,54.4,43.9,38.1,38.7,41.9,40.7,39.8,39.3,39.2,38.3,35.9,32.8,29.9,27.8,27.2,27.2,27.7,28.7,30.3,33.0,36.8,41.3,46.3,51.5,56.7,52.3,40.7,40.3,40.0,40.1,40.5,41.3,42.5,43.9,45.5,47.1,48.7,50.5,52.6,54.7,56.9,58.8,59.7,59.5,57.8,54.6,50.0,45.2,40.8,37.0,33.0,27.5,22.7,19.6,18.7],
  mKnee: [-40.5,-42.8,-44.6,-46.5,-48.9,-51.8,-54.3,-55.7,-56.6,-57.7,-59.1,-59.5,-59.0,-57.9,-56.6,-55.0,-53.3,-51.4,-49.4,-47.4,-45.2,-42.9,-40.3,-37.6,-35.5,-33.2,-29.9,-25.5,-23.4,-24.4,-24.5,-22.3,-18.3,-16.9,-16.2,-15.5,-14.5,-13.7,-13.3,-12.6,-12.0,-11.5,-12.1,-12.0,-10.6,-8.4,-8.1,-8.8,-8.9,-8.3,-7.7,-7.4,-6.8,-6.3,-5.7,-4.9,-3.7,-2.3,-0.9,0.2,1.0,1.7,2.3,2.8,2.9,2.6,2.0,1.1,0.0,-1.7,-3.7,-2.8,0.2,-0.6,-1.7,-2.9,-4.3,-5.8,-7.6,-9.6,-11.7,-13.9,-16.3,-18.7,-21.0,-23.3,-25.4,-27.1,-28.2,-28.7,-28.4,-27.5,-26.0,-24.3,-22.4,-20.3,-18.2,-16.2,-14.1,-12.3,-11.5],
  mAnk: [11.3,10.3,8.9,7.3,5.4,3.2,0.7,-1.8,-4.5,-7.3,-10.1,-12.7,-15.2,-17.5,-19.7,-21.8,-23.7,-25.4,-27.0,-28.4,-29.8,-31.0,-32.2,-33.3,-34.3,-35.3,-36.3,-37.3,-38.3,-39.3,-40.3,-41.4,-42.5,-43.5,-44.6,-45.7,-46.9,-48.1,-49.4,-50.7,-52.1,-53.4,-54.0,-55.2,-57.1,-59.5,-61.0,-61.8,-62.8,-64.2,-65.7,-67.2,-68.6,-70.1,-71.7,-73.3,-75.1,-76.9,-78.9,-81.0,-83.3,-85.7,-88.3,-90.9,-93.7,-96.7,-99.6,-102.4,-105.3,-107.9,-110.3,-111.9,-112.7,-113.9,-114.5,-114.7,-114.4,-113.7,-112.2,-110.2,-107.5,-104.2,-100.3,-95.6,-90.3,-84.5,-78.2,-71.4,-64.4,-57.2,-50.1,-43.1,-36.3,-30.0,-24.4,-19.4,-15.0,-10.9,-7.3,-4.4,-2.5],
  aHip: [14.0,13.6,13.3,13.0,12.7,12.2,11.7,11.2,10.6,9.9,9.2,8.5,7.8,7.0,6.3,5.7,4.9,4.2,3.5,2.7,2.0,1.3,0.7,0.0,-0.6,-1.2,-1.8,-2.3,-3.0,-3.7,-4.4,-5.0,-5.5,-6.0,-6.5,-7.0,-7.5,-8.0,-8.5,-9.0,-9.4,-9.9,-10.3,-10.8,-11.2,-11.8,-12.3,-12.8,-13.2,-13.7,-14.1,-14.5,-14.9,-15.2,-15.6,-15.9,-16.3,-16.7,-17.1,-17.5,-17.9,-18.4,-18.8,-19.2,-19.6,-20.1,-20.4,-20.8,-21.1,-21.4,-21.7,-22.0,-22.3,-22.6,-22.8,-23.1,-23.4,-23.7,-23.9,-24.2,-24.4,-24.7,-24.9,-25.1,-25.2,-25.3,-25.3,-25.1,-24.9,-24.5,-24.0,-23.4,-22.6,-21.7,-20.7,-19.6,-18.4,-17.1,-15.7,-14.4,-13.1],
  aKnee: [17.1,17.5,18.0,18.4,18.7,19.0,19.1,19.1,19.0,18.9,18.7,18.4,18.2,17.9,17.7,17.4,17.1,16.8,16.5,16.2,15.9,15.6,15.2,14.9,14.5,14.1,13.7,13.4,12.9,12.5,12.0,11.6,11.2,10.8,10.3,9.9,9.5,9.1,8.7,8.4,8.1,7.8,7.5,7.3,7.0,6.8,6.6,6.4,6.2,6.1,6.0,5.9,5.8,5.8,5.7,5.7,5.7,5.7,5.7,5.7,5.8,5.9,6.0,6.1,6.2,6.4,6.7,6.9,7.3,7.6,8.1,8.5,9.0,9.6,10.2,10.8,11.4,12.0,12.7,13.5,14.3,15.1,16.0,17.0,18.1,19.2,20.5,21.8,23.3,24.9,26.6,28.5,30.6,32.7,34.9,37.2,39.6,42.0,44.4,46.8,49.0],
  aAnk: [-5.2,-5.1,-5.0,-4.9,-4.6,-4.3,-4.0,-3.7,-3.3,-3.0,-2.7,-2.4,-2.2,-2.0,-1.8,-1.6,-1.4,-1.3,-1.1,-1.0,-0.8,-0.7,-0.5,-0.4,-0.2,-0.1,0.1,0.3,0.4,0.5,0.6,0.7,0.9,1.0,1.2,1.3,1.5,1.7,1.9,2.1,2.3,2.5,2.7,3.0,3.4,3.8,4.2,4.5,4.9,5.2,5.5,5.9,6.2,6.5,6.9,7.2,7.6,7.9,8.2,8.6,8.9,9.2,9.5,9.7,10.0,10.2,10.4,10.6,10.8,11.0,11.1,11.2,11.3,11.3,11.3,11.3,11.1,11.0,10.7,10.4,10.1,9.6,9.1,8.4,7.6,6.7,5.7,4.5,3.2,1.8,0.2,-1.4,-3.1,-4.9,-6.6,-8.3,-10.0,-11.7,-13.4,-14.9,-16.2]
};
function gs(a, p) {           /* sample an array of 101 across stance 0..1 */
  if (p <= 0) return a[0];
  if (p >= 1) return a[100];
  var f = p * 100, i = Math.floor(f), t = f - i;
  return a[i] + (a[i + 1] - a[i]) * t;
}

/* ============================================================
   9. THREE DIMENSIONS
   Body axes: x is anterior (the way you are facing), y is to your left,
   z is up. Every plane and every force component on the next few slides
   is named against those three.
   ============================================================ */

/* a tiny isometric projector: body coordinates in, canvas pixels out */
function view3(az, tilt, S, cx, cy) {
  var ca = Math.cos(az), sa = Math.sin(az), ct = Math.cos(tilt), st = Math.sin(tilt);
  return function (x, y, z) {
    var u = x * ca - y * sa, v = x * sa + y * ca;
    return { x: cx + u * S, y: cy + (v * st - z * ct) * S, d: v };
  };
}

/* the joints of a standing figure, in body coordinates, 1.0 tall */
var JT = {
  ankR: [0, -0.105, 0.045], kneeR: [0, -0.098, 0.275], hipR: [0, -0.085, 0.525],
  ankL: [0,  0.105, 0.045], kneeL: [0,  0.098, 0.275], hipL: [0,  0.085, 0.525],
  toeR: [0.115, -0.105, 0.012], heelR: [-0.060, -0.105, 0.012],
  toeL: [0.115,  0.105, 0.012], heelL: [-0.060,  0.105, 0.012],
  pelv: [0, 0, 0.525], neck: [0, 0, 0.815], head: [0, 0, 0.895],
  shR: [0, -0.145, 0.800], elR: [0, -0.200, 0.620], hdR: [0, -0.225, 0.440],
  shL: [0,  0.145, 0.800], elL: [0,  0.200, 0.620], hdL: [0,  0.225, 0.440]
};
var LIMBS = [['hipR', 'kneeR'], ['kneeR', 'ankR'], ['heelR', 'toeR'],
             ['hipL', 'kneeL'], ['kneeL', 'ankL'], ['heelL', 'toeL'],
             ['hipR', 'hipL'], ['pelv', 'neck'], ['shR', 'shL'],
             ['shR', 'elR'], ['elR', 'hdR'], ['shL', 'elL'], ['elL', 'hdL']];

function drawFigure(c, P, col, w) {
  c.save();
  c.strokeStyle = col; c.lineWidth = w || 5; c.lineCap = 'round'; c.lineJoin = 'round';
  LIMBS.forEach(function (s) {
    var a = P.apply(null, JT[s[0]]), b = P.apply(null, JT[s[1]]);
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  });
  var h = P.apply(null, JT.head), n = P.apply(null, JT.neck);
  c.fillStyle = col;
  c.beginPath(); c.arc(h.x, h.y, Math.max(5, Math.hypot(h.x - n.x, h.y - n.y) * 0.72), 0, 7); c.fill();
  c.restore();
}

/* one of the three cardinal planes, as a translucent quad */
function drawPlane(c, P, kind, col, alpha, R) {
  R = R || 0.44;
  var Z0 = -0.02, Z1 = 1.06, q;
  if (kind === 'sagittal')   q = [[-R, 0, Z0], [R, 0, Z0], [R, 0, Z1], [-R, 0, Z1]];
  else if (kind === 'frontal') q = [[0, -R, Z0], [0, R, Z0], [0, R, Z1], [0, -R, Z1]];
  else                       q = [[-R, -R, 0.525], [R, -R, 0.525], [R, R, 0.525], [-R, R, 0.525]];
  c.save();
  c.beginPath();
  q.forEach(function (p, i) {
    var s = P.apply(null, p);
    if (i === 0) c.moveTo(s.x, s.y); else c.lineTo(s.x, s.y);
  });
  c.closePath();
  c.globalAlpha = alpha; c.fillStyle = col; c.fill();
  c.globalAlpha = Math.min(1, alpha * 3.4); c.strokeStyle = col; c.lineWidth = 1.6; c.stroke();
  c.restore();
}

function axis3(c, P, a, b, col, name, K) {
  var s = P.apply(null, a), e = P.apply(null, b);
  arrow(c, s.x, s.y, e.x, e.y, { color: col, width: 2.4 });
  label(c, name, e.x + 8, e.y - 2, { color: col, size: 14, plate: true });
}

var PLANES = [
  { k: 'sagittal',   n: 'sagittal',   col: 'ACC',
    t: 'Divides left from right. Flexion and extension happen in it — walking, running, a squat. ' +
       'It is normal to the <b>y</b> axis.' },
  { k: 'frontal',    n: 'frontal',    col: 'GRN',
    t: 'Divides front from back. Abduction and adduction happen in it — a side lunge, a lateral ' +
       'step. It is normal to the <b>x</b> axis.' },
  { k: 'transverse', n: 'transverse', col: 'BLUE',
    t: 'Divides top from bottom. Rotation happens in it — a golf swing, a pivot. It is normal to ' +
       'the <b>z</b> axis.' }
];

D.register('planes3d', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 660, h: port ? 470 : 460,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var pick = 'all', az = -0.55, showAx = true;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var S = H * 0.74, P = view3(az, 0.42, S, W * 0.5, H * 0.90);

    /* the floor, so the figure has somewhere to stand */
    c.save();
    c.strokeStyle = K.SOFT; c.globalAlpha = 0.6; c.lineWidth = 1;
    [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].forEach(function (p, i) {
      var s = P(p[0], p[1], 0);
      if (i === 0) { c.beginPath(); c.moveTo(s.x, s.y); } else c.lineTo(s.x, s.y);
    });
    c.closePath(); c.stroke(); c.restore();

    PLANES.forEach(function (pl) {
      if (pick !== 'all' && pick !== pl.k) return;
      drawPlane(c, P, pl.k, K[pl.col], pick === pl.k ? 0.20 : 0.11);
    });

    drawFigure(c, P, K.MUT, 5.5);

    if (showAx) {
      axis3(c, P, [-0.46, 0, 0.525], [0.52, 0, 0.525], K.ACC, 'x  anterior', K);
      axis3(c, P, [0, 0.46, 0.525], [0, -0.52, 0.525], K.GRN, 'y  lateral', K);
      axis3(c, P, [0, 0, 0], [0, 0, 1.12], K.BLUE, 'z  vertical', K);
    }

    var cur = PLANES.filter(function (x) { return x.k === pick; })[0];
    out.innerHTML = cur
      ? '<b style="color:' + C()[cur.col] + '">' + cur.n + ' plane</b> — ' + cur.t
      : 'Three planes, three axes. <span class="hint">Every force we measure gets split along ' +
        'these axes, and every joint movement gets named by the plane it happens in. Spin the ' +
        'view and pick a plane to see which axis it is built on.</span>';
  }

  var r = ctlRow(u.ctl);
  seg(r, [['all', 'all three'], ['sagittal', 'sagittal'],
          ['frontal', 'frontal'], ['transverse', 'transverse']], pick,
      function (v) { pick = v; draw(); });
  slider(u.ctl, 'Spin the view', -90, 90, 1, az * 180 / Math.PI,
    function (v) { return fmt(v, 0) + '°'; },
    function (v) { az = v * Math.PI / 180; draw(); });

  node._draw = draw;
  draw();
});


/* ============================================================
   10. ONE FORCE, THREE COMPONENTS
   A measured walking step. The same ground reaction force is drawn on the
   body in three dimensions and plotted as the three numbers it is actually
   reported as: vertical, anterior–posterior and medio-lateral. The
   braking-then-propulsion sign change in the fore–aft trace is the thing
   worth pointing at.
   ============================================================ */
D.register('grf3d', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 920, h: port ? 620 : 440,
                            padl: 72, padr: 26, padt: 16, padb: 46 });
  var out = readout(u.ctl);
  var p = 0.30, playing = false, raf, last = 0, az = -0.62;

  var BW = GAIT.mass * G;
  var COMPS = [
    { a: GAIT.vert, lab: 'vertical  z (N)',   col: 'BLUE', tk: [0, 400, 800] },
    { a: GAIT.ap,   lab: 'fore–aft  x (N)',   col: 'ACC',  tk: [-100, 0, 100] },
    { a: GAIT.ml,   lab: 'side–side  y (N)',  col: 'GRN',  tk: [-30, 0] }
  ];
  var P3 = [{ pt: 14, pb: 314 }, { pt: 160, pb: 168 }, { pt: 306, pb: 46 }];

  function drawBody(c, K, W, H) {
    var S = H * 0.74, cx = W * 0.21, cy = H * 0.94;
    var P = view3(az, 0.40, S, cx, cy);

    c.save();
    c.strokeStyle = K.SOFT; c.globalAlpha = 0.55; c.lineWidth = 1;
    [[-0.45, -0.45], [0.45, -0.45], [0.45, 0.45], [-0.45, 0.45]].forEach(function (q, i) {
      var s = P(q[0], q[1], 0);
      if (i === 0) { c.beginPath(); c.moveTo(s.x, s.y); } else c.lineTo(s.x, s.y);
    });
    c.closePath(); c.stroke(); c.restore();

    drawFigure(c, P, K.MUT, 5);

    /* the force, applied under the right foot where the pressure actually is */
    var k = 0.62 / 900;                        /* body heights per newton      */
    var fx = gs(GAIT.ap, p), fy = gs(GAIT.ml, p), fz = gs(GAIT.vert, p);
    var ox = -0.05 + 0.16 * p, oy = -0.085, oz = 0.012;
    var O = P(ox, oy, oz);
    var Rp = P(ox + fx * k, oy + fy * k, oz + fz * k);
    var Zp = P(ox, oy, oz + fz * k);
    var Xp = P(ox + fx * k, oy, oz);
    var Yp = P(ox, oy + fy * k, oz);

    c.save();
    c.setLineDash([4, 3]); c.globalAlpha = 0.55; c.lineWidth = 1.2;
    c.strokeStyle = K.SOFT;
    c.beginPath(); c.moveTo(Zp.x, Zp.y); c.lineTo(Rp.x, Rp.y); c.stroke();
    c.restore();

    arrow(c, O.x, O.y, Zp.x, Zp.y, { color: K.BLUE, width: 2.4 });
    if (Math.abs(fx) > 8) arrow(c, O.x, O.y, Xp.x, Xp.y, { color: K.ACC, width: 2.2 });
    if (Math.abs(fy) > 6) arrow(c, O.x, O.y, Yp.x, Yp.y, { color: K.GRN, width: 2.2 });
    arrow(c, O.x, O.y, Rp.x, Rp.y, { color: K.ACC, width: 5 });
    label(c, fmt(Math.sqrt(fx * fx + fy * fy + fz * fz), 0) + ' N', Rp.x + 10, Rp.y - 4,
          { color: K.ACC, size: 14, plate: true });

    label(c, 'x', P(0.44, 0, 0).x + 4, P(0.44, 0, 0).y, { color: K.ACC, size: 12.5 });
    label(c, 'y', P(0, -0.44, 0).x + 4, P(0, -0.44, 0).y, { color: K.GRN, size: 12.5 });
    label(c, 'z', P(0, 0, 1.06).x + 6, P(0, 0, 1.06).y, { color: K.BLUE, size: 12.5 });
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    drawBody(c, K, W, H);

    ax.pl = W * 0.46; ax.pr = 26;
    COMPS.forEach(function (cp, i) {
      var lo = Math.min.apply(null, cp.a), hi = Math.max.apply(null, cp.a);
      var pad = (hi - lo) * 0.16; lo -= pad; hi += pad;
      ax.pt = P3[i].pt; ax.pb = P3[i].pb;
      ax.setRange(0, 1, lo, hi);
      ax.frame({ grid: true, xticks: i === 2 ? [0, 0.25, 0.5, 0.75, 1] : [],
                 yticks: cp.tk, ylabel: cp.lab, ysize: 12.5,
                 ylabelx: W * 0.46 - 58,
                 xlabel: i === 2 ? 'stance (%)' : null,
                 xfmt: function (v) { return fmt(v * 100, 0); },
                 yfmt: function (v) { return fmt(v, 0); } });
      if (lo < 0) ax.poly([[0, 0], [1, 0]], { color: K.SOFT, width: 1 });
      var pts = [], j;
      for (j = 0; j <= 100; j++) pts.push([j / 100, cp.a[j]]);
      ax.poly(pts, { color: K[cp.col], width: 2.6 });
      ax.poly([[p, lo], [p, hi]], { color: K.MUT, width: 1, dash: [3, 3] });
      ax.dots([[p, gs(cp.a, p)]], { color: K[cp.col], r: 5 });
      label(c, fmt(gs(cp.a, p), 0) + ' N', ax.X(p) + 10, ax.Y(gs(cp.a, p)) - 12,
            { color: K[cp.col], size: 12.5, plate: true });
    });
    ax.pt = P3[0].pt; ax.pb = P3[0].pb;

    var apn = gs(GAIT.ap, p);
    out.innerHTML =
      fmt(p * 100, 0) + '% of stance &nbsp;·&nbsp; vertical <b class="b">' +
      fmt(gs(GAIT.vert, p), 0) + ' N</b> (' + fmt(gs(GAIT.vert, p) / BW, 2) +
      ' BW) · fore–aft <b class="r">' + fmt(apn, 0) + ' N</b> · side to side <b class="g">' +
      fmt(gs(GAIT.ml, p), 0) + ' N</b>' +
      '<span class="hint">' +
      (apn < -8 ? 'The fore–aft component is <b>negative</b>: the ground is pushing backwards on ' +
                  'you. This is the braking half of the step.'
       : apn > 8 ? 'The fore–aft component is <b>positive</b>: the ground is pushing you ' +
                   'forwards. This is the propulsive half.'
       : 'The fore–aft component passes through zero — the moment braking turns into propulsion.') +
      ' One walking step from a ' + fmt(GAIT.mass, 0) + ' kg adult, measured on a force plate ' +
      '(Uhlrich et al., 2023). The vertical component is roughly eight times the others, which is ' +
      'why it is the one everybody quotes — and why the small ones are where the interesting ' +
      'things hide.</span>';
  }

  var s = slider(u.ctl, 'Stance', 0.01, 0.99, 0.01, p,
    function (v) { return fmt(v * 100, 0) + '%'; }, function (v) { p = v; draw(); });
  slider(u.ctl, 'Spin the view', -90, 90, 1, az * 180 / Math.PI,
    function (v) { return fmt(v, 0) + '°'; },
    function (v) { az = v * Math.PI / 180; draw(); });
  var pb = playBtn(u.ctl, '▶ Take a step');
  pb.setAttribute('data-unsafe', '1');
  pb.addEventListener('click', function () {
    playing = !playing;
    pb.textContent = playing ? '❚❚ Pause' : '▶ Take a step';
    if (playing) { if (p > 0.97) { p = 0.01; s.set(0.01); } last = 0; raf = requestAnimationFrame(loop); }
    else cancelAnimationFrame(raf);
  });
  function loop(ts) {
    if (!last) last = ts;
    p = Math.min(0.99, p + (ts - last) / 1600);
    last = ts; s.input.value = p; s.sync();
    if (p >= 0.99) { playing = false; pb.textContent = '↻ Again'; return; }
    raf = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Take a step'; };
  node._draw = draw;
  draw();
});

/* ============================================================
   12. INVERSE DYNAMICS AND EMG
   The last step of the lecture: you cannot measure the force in a tendon
   in a living person, so you infer it. The force plate and the segment
   kinematics give the NET joint moment; divide that by the muscle's moment
   arm and you have a muscle force — provided one muscle made all of it.
   EMG is what tells you whether that proviso holds.
   ============================================================ */
/* Illustrative activation envelopes. The measured trial carries no EMG, so
   these are drawn from the textbook pattern and labelled as such. */
function emgSol(p) {
  if (p < 0 || p > 1) return 0;
  return Math.exp(-Math.pow((p - 0.56) / 0.27, 2)) * (p < 0.88 ? 1 : Math.exp(-Math.pow((p - 0.88) / 0.05, 2)));
}
function emgTA(p) {
  if (p < 0 || p > 1) return 0;
  return 0.95 * Math.exp(-Math.pow((p - 0.04) / 0.10, 2)) +
         0.30 * Math.exp(-Math.pow((p - 0.95) / 0.07, 2));
}

D.register('invdyn', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 900, h: port ? 620 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var p = 0.60, arm = 0.050, co = false, playing = false, raf, last = 0;

  var TA_PEAK = 22;                       /* N·m the antagonist can add     */

  function netM(q) { return Math.abs(gs(GAIT.mAnk, q)); }
  function agoM(q) { return netM(q) + (co ? TA_PEAK * emgTA(q) : 0); }
  function fMus(q) { return agoM(q) / arm; }
  var FMAX = (function () {
    var m2 = 0; for (var i = 0; i <= 100; i++) m2 = Math.max(m2, Math.abs(GAIT.mAnk[i]) + TA_PEAK);
    return m2 / 0.030;
  })();

  function drawLeg(c, K, W, H) {
    var S = H * 0.62, A = { x: W * 0.21, y: H * 0.56 };
    var gy = A.y + S * 0.17;
    function R(lx, ly) { return { x: A.x + lx * S, y: A.y + ly * S }; }

    c.save();
    c.strokeStyle = K.SOFT; c.lineWidth = 2;
    c.beginPath(); c.moveTo(12, gy); c.lineTo(W * 0.44, gy); c.stroke();
    c.restore();

    /* shank */
    c.save();
    c.strokeStyle = K.PANEL; c.lineWidth = S * 0.18; c.lineCap = 'round';
    c.beginPath(); c.moveTo(A.x, A.y - S * 0.95); c.lineTo(A.x, A.y); c.stroke();
    c.restore();

    /* foot */
    var Hi = R(-0.25, -0.02);
    c.save();
    c.fillStyle = K.PANEL; c.strokeStyle = K.SOFT; c.lineWidth = 1.3;
    c.beginPath();
    var P = [R(-0.30, 0.00), R(-0.31, 0.12), R(-0.22, 0.17), R(0.12, 0.13),
             R(0.40, 0.17), R(0.57, 0.16), R(0.56, 0.09), R(0.30, 0.03),
             R(0.14, -0.06), R(0.04, -0.03)];
    c.moveTo(P[0].x, P[0].y);
    c.quadraticCurveTo(P[1].x, P[1].y, P[2].x, P[2].y);
    c.quadraticCurveTo(P[3].x, P[3].y, P[4].x, P[4].y);
    c.lineTo(P[5].x, P[5].y); c.lineTo(P[6].x, P[6].y);
    c.quadraticCurveTo(P[7].x, P[7].y, P[8].x, P[8].y);
    c.lineTo(P[9].x, P[9].y); c.lineTo(Hi.x, Hi.y);
    c.closePath(); c.fill(); c.stroke();
    c.restore();

    /* the Achilles and the force we are solving for */
    var Cp = { x: A.x - S * 0.115, y: A.y - S * 0.50 };
    c.save();
    c.strokeStyle = K.MUT; c.globalAlpha = 0.8; c.lineWidth = S * 0.065;
    c.beginPath(); c.moveTo(Hi.x, Hi.y); c.lineTo(Cp.x, Cp.y); c.stroke();
    c.restore();

    /* the measured ground reaction force at the centre of pressure */
    var fv = gs(GAIT.vert, p), fa = gs(GAIT.ap, p), Fg = Math.hypot(fv, fa);
    var sc = (S * 0.95) / 900;
    var cx = A.x + (-0.20 + 0.66 * p) * S, cy = gy;
    var tipx = cx + fa * sc, tipy = cy - fv * sc;
    arrow(c, cx, cy, tipx, tipy, { color: K.BLUE, width: 4.4 });
    label(c, fmt(Fg, 0) + ' N', tipx + 10, tipy + 2, { color: K.BLUE, size: 13.5, plate: true });

    /* the external moment arm: the perpendicular from the ankle to that line */
    var ux = tipx - cx, uy = tipy - cy, L = Math.hypot(ux, uy) || 1;
    ux /= L; uy /= L;
    var t = (A.x - cx) * ux + (A.y - cy) * uy;
    var px = cx + ux * t, py = cy + uy * t;
    c.save();
    c.strokeStyle = K.ACC; c.lineWidth = 1.6; c.setLineDash([4, 3]);
    c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(px, py); c.stroke();
    c.restore();
    label(c, 'GRF lever arm', (A.x + px) / 2, (A.y + py) / 2 - 26,
          { color: K.ACC, size: 11.5, align: 'center', plate: true });

    /* the muscle force the net moment implies */
    var F = fMus(p);
    var mx = Cp.x - Hi.x, my = Cp.y - Hi.y, ML = Math.hypot(mx, my);
    var msc = (S * 0.90) / FMAX;
    arrow(c, Hi.x, Hi.y, Hi.x + mx / ML * F * msc, Hi.y + my / ML * F * msc,
          { color: K.ORG, width: 4.4 });
    label(c, fmt(F, 0) + ' N', Hi.x + mx / ML * F * msc - 10,
          Hi.y + my / ML * F * msc - 8, { color: K.ORG, size: 13.5, align: 'right', plate: true });

    /* the ankle, and the small arm the muscle works through */
    c.save();
    c.strokeStyle = K.ORG; c.lineWidth = 1.5; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(A.x, A.y);
    c.lineTo(Hi.x + mx * 0.14, Hi.y + my * 0.14); c.stroke();
    c.restore();
    label(c, 'd = ' + fmt(arm * 100, 1) + ' cm', A.x - S * 0.20, A.y - S * 0.12,
          { color: K.ORG, size: 11.5, align: 'right', plate: true });
    c.save();
    c.fillStyle = K.INK; c.beginPath(); c.arc(A.x, A.y, 5, 0, 7); c.fill(); c.restore();
    label(c, 'ankle', A.x + 14, A.y + 18, { color: K.MUT, size: 11.5, plate: true });
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    drawLeg(c, K, W, H);

    ax.pl = W * 0.50; ax.pr = 26;

    /* panel 1 — what inverse dynamics gives you */
    ax.pt = 16; ax.pb = H * 0.56;
    ax.setRange(0, 1, 0, 150);
    ax.frame({ grid: true, xticks: [], yticks: [0, 50, 100, 150],
               ylabel: 'ankle moment (N·m)', ysize: 12.5, ylabelx: W * 0.50 - 56,
               yfmt: function (v) { return fmt(v, 0); } });
    var pts = [], j;
    for (j = 0; j <= 100; j++) pts.push([j / 100, Math.abs(GAIT.mAnk[j])]);
    ax.poly(pts, { color: K.ACC, width: 2.6 });
    if (co) {
      var pts2 = [];
      for (j = 0; j <= 100; j++) pts2.push([j / 100, agoM(j / 100)]);
      ax.poly(pts2, { color: K.ORG, width: 2, dash: [5, 3] });
      label(c, 'what the plantarflexors really made', ax.X(0.02), ax.Y(140),
            { color: K.ORG, size: 11 });
    }
    ax.poly([[p, 0], [p, 150]], { color: K.MUT, width: 1, dash: [3, 3] });
    ax.dots([[p, netM(p)]], { color: K.ACC, r: 5 });

    /* panel 2 — the muscle force it implies, against the activation */
    ax.pt = H * 0.52; ax.pb = 52;
    ax.setRange(0, 1, 0, Math.max(400, 150 / arm * 1.05));
    ax.frame({ grid: true, xticks: [0, 0.25, 0.5, 0.75, 1],
               yticks: [0, 1000, 2000, 3000],
               xlabel: 'stance (%)', ylabel: 'muscle force (N)', ysize: 12.5,
               ylabelx: W * 0.50 - 56,
               xfmt: function (v) { return fmt(v * 100, 0); },
               yfmt: function (v) { return fmt(v, 0); } });
    var pts3 = [];
    for (j = 0; j <= 100; j++) pts3.push([j / 100, agoM(j / 100) / arm]);
    ax.poly(pts3, { color: K.ORG, width: 2.8 });
    /* the activation envelopes, on their own 0–1 scale */
    var top = Math.max(400, 150 / arm * 1.05);
    var e1 = [], e2 = [];
    for (j = 0; j <= 100; j++) {
      e1.push([j / 100, emgSol(j / 100) * top * 0.92]);
      e2.push([j / 100, emgTA(j / 100) * top * 0.92]);
    }
    ax.poly(e1, { color: K.GRN, width: 1.8, dash: [5, 3] });
    if (co) ax.poly(e2, { color: K.BLUE, width: 1.8, dash: [5, 3] });
    label(c, 'soleus EMG (illustrative)', ax.X(0.02), ax.Y(top * 0.96),
          { color: K.GRN, size: 11 });
    if (co) label(c, 'tibialis anterior EMG', ax.X(0.62), ax.Y(top * 0.96),
                  { color: K.BLUE, size: 11 });
    ax.poly([[p, 0], [p, top]], { color: K.MUT, width: 1, dash: [3, 3] });
    ax.dots([[p, fMus(p)]], { color: K.ORG, r: 5 });

    out.innerHTML =
      fmt(p * 100, 0) + '% of stance &nbsp;·&nbsp; net ankle moment <b class="r">' +
      fmt(netM(p), 0) + ' N·m</b> ÷ moment arm <b>' + fmt(arm * 100, 1) +
      ' cm</b> = plantarflexor force <b style="color:var(--org, #fbbf24)">' +
      fmt(fMus(p), 0) + ' N</b> (' + fmt(fMus(p) / (GAIT.mass * G), 1) + ' body weights)' +
      '<span class="hint">' +
      (co ? 'With the antagonist co-contracting, the <b>net</b> moment is smaller than what the ' +
            'plantarflexors actually produced — inverse dynamics alone would under-read the ' +
            'muscle force by ' + fmt(TA_PEAK * emgTA(p) / arm, 0) + ' N here. EMG is what tells ' +
            'you the antagonist is on.'
          : 'Inverse dynamics works backwards from the measured ground reaction force and the ' +
            'segment motion to the <b>net</b> moment at the joint. Divide by the moment arm and ' +
            'you get a muscle force — but only if one muscle group made all of it, and only if ' +
            'you know the arm. Slide the arm from 3 to 7 cm and the answer halves.') +
      ' Moments from the measured trial (Uhlrich et al., 2023); the EMG envelopes are drawn from ' +
      'the textbook pattern, not from this subject.</span>';
  }

  var sP = slider(u.ctl, 'Stance', 0.01, 0.99, 0.01, p,
    function (v) { return fmt(v * 100, 0) + '%'; }, function (v) { p = v; draw(); });
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
    if (playing) { if (p > 0.97) { p = 0.01; sP.set(0.01); } last = 0; raf = requestAnimationFrame(loop); }
    else cancelAnimationFrame(raf);
  });
  function loop(ts) {
    if (!last) last = ts;
    p = Math.min(0.99, p + (ts - last) / 1800);
    last = ts; sP.input.value = p; sP.sync();
    if (p >= 0.99) { playing = false; pb.textContent = '↻ Again'; return; }
    raf = requestAnimationFrame(loop);
  }
  node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Take a step'; };
  node._draw = draw;
  draw();
});


D.boot();

})();
