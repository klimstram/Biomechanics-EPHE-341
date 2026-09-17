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
   Same force, different contact area. The point of the slide is that
   pressure is cheap to measure and force is not — but also that the two
   are not interchangeable unless you know the area.
   ============================================================ */
var PATCHES = [
  { k: 'stand', name: 'standing, both feet', a: 350 },
  { k: 'foot',  name: 'one foot flat',       a: 175 },
  { k: 'heel',  name: 'heel strike',         a: 25 },
  { k: 'stud',  name: 'one running spike',   a: 0.8 },
  { k: 'ski',   name: 'both skis',           a: 2600 }
];

D.register('pressure', function (node, d) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 840, h: 360, padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var m = 70, patch = 'foot';

  function P() {
    var a = PATCHES.filter(function (p) { return p.k === patch; })[0];
    return { a: a, F: m * G, kpa: (m * G) / (a.a / 10000) / 1000 };
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var st = P();

    /* the contact patch, drawn to scale against a fixed 600 cm² reference */
    var ref = 600, cx = W * 0.27, cy = H * 0.60;
    var boxW = 210, boxH = 150;
    c.save();
    c.strokeStyle = K.SOFT; c.lineWidth = 1.2; c.setLineDash([5, 4]);
    c.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
    c.restore();
    label(c, '600 cm² for scale', cx, cy - boxH / 2 - 14,
          { color: K.MUT, size: 12, align: 'center', weight: '600' });
    var frac = Math.min(1.6, st.a.a / ref);
    var pw = Math.max(3, boxW * Math.sqrt(frac)), ph = Math.max(3, boxH * Math.sqrt(frac));
    c.save();
    c.fillStyle = K.ACCFILL; c.strokeStyle = K.ACC; c.lineWidth = 2;
    c.fillRect(cx - pw / 2, cy + boxH / 2 - ph, pw, ph);
    c.strokeRect(cx - pw / 2, cy + boxH / 2 - ph, pw, ph);
    c.restore();
    label(c, fmt(st.a.a, 1) + ' cm²', cx, cy + boxH / 2 + 22,
          { color: K.ACC, size: 15, align: 'center' });

    /* the same force pressing on it, whatever the area */
    for (var k = -1; k <= 1; k++) {
      arrow(c, cx + k * 34, cy - boxH / 2 - 46, cx + k * 34, cy + boxH / 2 - ph - 4,
            { color: K.BLUE, width: 3 });
    }
    label(c, 'F = ' + fmt(st.F, 0) + ' N', cx, cy - boxH / 2 - 60,
          { color: K.BLUE, size: 16, align: 'center' });

    /* the arithmetic */
    var ex = W * 0.70, ey = H * 0.30;
    label(c, 'P  =  F / A', ex, ey, { color: K.INK, size: 26, align: 'center' });
    label(c, fmt(st.F, 0) + ' N  /  ' + fmt(st.a.a / 10000, 4) + ' m²',
          ex, ey + 40, { color: K.MUT, size: 16, align: 'center' });
    label(c, fmt(st.kpa, 1) + ' kPa', ex, ey + 82, { color: K.ACC, size: 26, align: 'center' });
    label(c, st.a.name, ex, ey + 118, { color: K.MUT, size: 14, align: 'center', weight: '600' });

    /* a bar so the comparisons are visible at a glance */
    var bx = W * 0.56, bw = W * 0.38, by = H * 0.80;
    var maxK = (m * G) / (PATCHES[3].a / 10000) / 1000;
    c.save();
    c.fillStyle = K.PANEL; c.fillRect(bx, by, bw, 14);
    c.fillStyle = K.ACC;
    c.fillRect(bx, by, bw * Math.min(1, Math.log10(1 + st.kpa) / Math.log10(1 + maxK)), 14);
    c.restore();
    label(c, 'log scale — the spike is off the end of a linear one', bx, by + 30,
          { color: K.MUT, size: 12, weight: '600' });

    out.innerHTML =
      '<b class="b">' + fmt(st.F, 0) + ' N</b> on <b>' + fmt(st.a.a, 1) + ' cm²</b>' +
      ' = <b class="r">' + fmt(st.kpa, 1) + ' kPa</b>' +
      '<span class="hint">The force never changed — only the area it is spread over. ' +
      'That is why a pressure sensor is not a force sensor: two readings can differ by a hundred ' +
      'times with the same load on the foot.</span>';
  }

  slider(u.ctl, 'Body mass', 20, 140, 1, m, function (v) { return fmt(v, 0) + ' kg'; },
         function (v) { m = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  seg(ctlRow(u.ctl), PATCHES.map(function (p) { return [p.k, p.name]; }), patch,
      function (v) { patch = v; draw(); });
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
var QUAD = [
  { k: 'VL', name: 'vastus lateralis',  mag: 350, ang: 60, side: -1 },
  { k: 'VI', name: 'vastus intermedius', mag: 450, ang: 80, side: -1 },
  { k: 'VM', name: 'vastus medialis',   mag: 375, ang: 80, side:  1 }
];

D.register('vecsum', function (node, d) {
  var u = build(node);
  var wrap = u.cv.parentNode.parentNode;
  wrap.classList.add('isplit');
  var side = el('div', 'icalc');
  wrap.insertBefore(side, u.ctl);

  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 740, h: port ? 420 : 470,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);

  /* a working copy so the sliders can move it and "start over" can put it back */
  var M = QUAD.map(function (q) { return { k: q.k, name: q.name, mag: q.mag, ang: q.ang, side: q.side }; });
  var pick = 'VL', step = parseInt(d.step || 5, 10);

  function theta(q) { return (q.side < 0 ? 180 - q.ang : q.ang) * Math.PI / 180; }
  function comp(q) { return { x: q.mag * Math.cos(theta(q)), y: q.mag * Math.sin(theta(q)) }; }
  function sum() {
    var x = 0, y = 0;
    M.forEach(function (q) { var c2 = comp(q); x += c2.x; y += c2.y; });
    return { x: x, y: y, R: Math.hypot(x, y), th: Math.atan2(y, x) * 180 / Math.PI };
  }

  function colOf(k) { var K = C(); return k === 'VL' ? K.BLUE : (k === 'VI' ? K.ORG : K.VIO); }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var S = sum();
    var ox = W * 0.58, oy = H * 0.86;
    var sc = Math.min(0.30, (H * 0.74) / Math.max(600, S.R));

    /* the axis system the whole problem is measured against */
    c.save();
    c.strokeStyle = K.SOFT; c.lineWidth = 1.2; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(30, oy); c.lineTo(W - 30, oy); c.stroke();
    c.beginPath(); c.moveTo(ox, oy + 20); c.lineTo(ox, 20); c.stroke();
    c.restore();
    label(c, 'x', W - 24, oy - 12, { color: K.MUT, size: 13 });
    label(c, 'y', ox + 10, 26, { color: K.MUT, size: 13 });

    if (step >= 2) {
      M.forEach(function (q) {
        var cm = comp(q), col = colOf(q.k);
        var tx = ox + cm.x * sc, ty = oy - cm.y * sc;
        arrow(c, ox, oy, tx, ty, { color: col, width: 3.2 });
        label(c, q.k + '  ' + fmt(q.mag, 0) + ' N', tx + (q.side < 0 ? -8 : 8), ty - 12,
              { color: col, size: 13, align: q.side < 0 ? 'right' : 'left', plate: true });
      });
    }

    /* step 3: each force opened out into its two components */
    if (step >= 3) {
      M.forEach(function (q) {
        var cm = comp(q), col = colOf(q.k);
        var tx = ox + cm.x * sc, ty = oy - cm.y * sc;
        c.save();
        c.strokeStyle = col; c.globalAlpha = 0.55; c.lineWidth = 1.4; c.setLineDash([4, 3]);
        c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx, oy); c.stroke();
        c.beginPath(); c.moveTo(tx, ty); c.lineTo(ox, ty); c.stroke();
        c.restore();
      });
    }

    /* steps 4 and 5: the totals, then the resultant they define */
    if (step >= 4) {
      var rx = ox + S.x * sc, ry = oy - S.y * sc;
      arrow(c, ox, oy, rx, oy, { color: K.MUT, width: 2.4 });
      arrow(c, ox, oy, ox, ry, { color: K.MUT, width: 2.4 });
      label(c, 'R' + 'ₓ = ' + minus(fmt(S.x, 1)) + ' N', ox + (S.x < 0 ? -10 : 10), oy + 20,
            { color: K.MUT, size: 13, align: S.x < 0 ? 'right' : 'left' });
      label(c, 'R' + 'ᵧ = ' + fmt(S.y, 0) + ' N', ox - 26, oy - (oy - ry) * 0.72,
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
        arc(c, ox, oy, 70, -S.th * Math.PI / 180, 0, K.ACC, fmt(S.th, 1) + '°');
      }
    }

    /* ---- the working, beside the picture ---- */
    var html = '<div class="icalc-h">Step ' + step + ' · ' +
      ['what is being asked', 'draw what is known', 'components of each force',
       'add the components', 'magnitude and direction'][step - 1] + '</div>';

    if (step === 1) {
      html += '<div class="icalc-work"><div class="icalc-t">the question</div>' +
        '<div class="icalc-eq">Find the <b>resultant</b> quadriceps force — the single ' +
        'force that would do what all three do together.</div></div>' +
        '<div class="icalc-t" style="margin-top:.6em">Three pulls on one bone, at three ' +
        'different angles. They cannot simply be added: 350 + 450 + 375 is not the answer.</div>';
    } else if (step === 2) {
      html += '<table class="icalc-tab"><thead><tr><th></th><th>force</th><th>angle</th>' +
        '</tr></thead><tbody>';
      M.forEach(function (q) {
        html += '<tr><td style="color:' + colOf(q.k) + '">' + q.k + '</td><td>' +
          fmt(q.mag, 0) + ' N</td><td>' + fmt(q.ang, 0) + '°</td></tr>';
      });
      html += '</tbody></table><div class="icalc-t" style="margin-top:.5em">The angle is measured ' +
        'from the horizontal; VL and VI pull to one side of the midline, VM to the other.</div>';
    } else if (step === 3) {
      var q0 = M.filter(function (q) { return q.k === pick; })[0], cm0 = comp(q0);
      html += '<div class="icalc-work">' +
        '<div class="icalc-t">' + q0.k + ' — ' + q0.name + '</div>' +
        '<div class="icalc-eq">Fₓ = F·cosθ = ' + fmt(q0.mag, 0) + ' · cos ' +
          fmt(q0.side < 0 ? 180 - q0.ang : q0.ang, 0) + '° = <b>' + minus(fmt(cm0.x, 1)) + '</b> N</div>' +
        '<div class="icalc-eq">Fᵧ = F·sinθ = ' + fmt(q0.mag, 0) + ' · sin ' +
          fmt(q0.side < 0 ? 180 - q0.ang : q0.ang, 0) + '° = <b>' + fmt(cm0.y, 1) + '</b> N</div>' +
        '</div>';
      html += '<table class="icalc-tab"><thead><tr><th></th><th>Fₓ</th><th>Fᵧ</th>' +
        '</tr></thead><tbody>';
      M.forEach(function (q) {
        var cm = comp(q);
        html += '<tr' + (q.k === pick ? ' class="now"' : '') + '><td style="color:' + colOf(q.k) + '">' +
          q.k + '</td><td>' + minus(fmt(cm.x, 1)) + '</td><td>' + fmt(cm.y, 1) + '</td></tr>';
      });
      html += '</tbody></table>';
    } else if (step === 4) {
      html += '<table class="icalc-tab"><thead><tr><th></th><th>Fₓ</th><th>Fᵧ</th>' +
        '</tr></thead><tbody>';
      M.forEach(function (q) {
        var cm = comp(q);
        html += '<tr><td style="color:' + colOf(q.k) + '">' + q.k + '</td><td>' +
          minus(fmt(cm.x, 1)) + '</td><td>' + fmt(cm.y, 1) + '</td></tr>';
      });
      html += '<tr class="now"><td>Σ</td><td>' + minus(fmt(S.x, 1)) + '</td><td>' +
        fmt(S.y, 1) + '</td></tr></tbody></table>' +
        '<div class="icalc-t" style="margin-top:.5em">Horizontal with horizontal, vertical with ' +
        'vertical — the same table you used for kinematics.</div>';
    } else {
      html += '<div class="icalc-work">' +
        '<div class="icalc-t">magnitude</div>' +
        '<div class="icalc-eq">R² = Rₓ² + Rᵧ²</div>' +
        '<div class="icalc-eq">R = <b class="r">' + fmt(S.R, 1) + ' N</b></div>' +
        '<div class="icalc-t" style="margin-top:.5em">direction</div>' +
        '<div class="icalc-eq">tanθ = Rᵧ / Rₓ = ' + fmt(S.y, 0) + ' / ' +
          minus(fmt(S.x, 1)) + '</div>' +
        '<div class="icalc-eq">θ = <b class="r">' + fmt(S.th, 1) + '°</b> from the x axis</div>' +
        '</div>';
      if (S.x < 0) {
        html += '<div class="icalc-t" style="margin-top:.55em"><b>Watch the quadrant.</b> ' +
          'A calculator given ' + fmt(S.y, 0) + ' / ' + minus(fmt(S.x, 1)) + ' returns ' +
          minus(fmt(Math.atan(S.y / S.x) * 180 / Math.PI, 1)) + '°, which points down and to ' +
          'the right. Rₓ is negative and Rᵧ is positive, so the resultant is up and to the ' +
          'left: add 180° to get ' + fmt(S.th, 1) + '°.</div>';
      }
    }
    side.innerHTML = html;

    out.innerHTML =
      'R = <b class="r">' + fmt(S.R, 1) + ' N</b> at <b>' + fmt(S.th, 1) + '°</b>' +
      ' &nbsp;·&nbsp; Rₓ = ' + minus(fmt(S.x, 1)) + ' N, Rᵧ = ' + fmt(S.y, 1) + ' N' +
      '<span class="hint">Three forces of ' + fmt(M[0].mag, 0) + ', ' + fmt(M[1].mag, 0) + ' and ' +
      fmt(M[2].mag, 0) + ' N add to ' + fmt(S.R, 0) + ' N, not ' +
      fmt(M[0].mag + M[1].mag + M[2].mag, 0) + ' N — the sideways pulls partly cancel.</span>';
  }

  var stepChips = chips(u.ctl, [[1, '1 · the question'], [2, '2 · the diagram'],
                                [3, '3 · components'], [4, '4 · add them'],
                                [5, '5 · the resultant']], step,
                        function (v) { step = +v; draw(); });
  var r2 = ctlRow(u.ctl);
  var segEl = seg(r2, M.map(function (q) { return [q.k, q.k]; }), pick,
                  function (v) { pick = v; draw(); });
  /* fit.js sweeps every control at boot to find out how tall the figure can get.
     These buttons choose which muscle the two sliders below edit, so letting the
     sweep press them writes one muscle's value into another. */
  Array.prototype.forEach.call(segEl.children, function (b) { b.setAttribute('data-unsafe', '1'); });
  var sM = slider(u.ctl, 'Force', 0, 700, 5, M[0].mag, function (v) { return fmt(v, 0) + ' N'; },
    function (v) { M.filter(function (q) { return q.k === pick; })[0].mag = v; draw(); },
    { scale: 5, tick: function (v) { return fmt(v, 0); } });
  var sA = slider(u.ctl, 'Angle', 20, 90, 1, M[0].ang, function (v) { return fmt(v, 0) + '°'; },
    function (v) { M.filter(function (q) { return q.k === pick; })[0].ang = v; draw(); },
    { scale: 5, tick: function (v) { return fmt(v, 0) + '°'; } });
  /* the sliders follow whichever muscle is selected */
  function syncSliders() {
    var q = M.filter(function (x) { return x.k === pick; })[0];
    sM.quiet(q.mag); sA.quiet(q.ang);
  }
  var origPick = seg;
  /* re-wire the selector so it also moves the sliders */
  Array.prototype.forEach.call(r2.querySelectorAll('.iseg-b'), function (b) {
    b.addEventListener('click', function () { syncSliders(); });
  });
  var rb = el('button', 'ibtn', 'Back to the lecture’s numbers');
  rb.setAttribute('data-reset', '1');
  rb.addEventListener('click', function () {
    QUAD.forEach(function (q, i) { M[i].mag = q.mag; M[i].ang = q.ang; });
    syncSliders(); draw();
  });
  r2.appendChild(rb);

  node._draw = draw;
  draw();
});


/* ============================================================
   6. THE INCLINE
   Gravity does not change when the ground tilts — the axes do. Everything
   on this figure follows from that one idea, which is why the axis system
   is drawn first and the components are drawn along it.
   ============================================================ */
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
  var ax = new Axes(u.cv, { w: port ? 470 : (showCalc ? 700 : 620), h: port ? 400 : 450,
                            padl: 0, padr: 0, padt: 0, padb: 0,
                            xmin: 0, xmax: 1, ymin: 0, ymax: 1, fluid: false });
  var out = readout(u.ctl);
  var m = parseFloat(d.mass || 4), th = parseFloat(d.angle || 20);
  var showFric = d.friction === '1';

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var t = th * Math.PI / 180;
    var Wt = m * G, perp = Wt * Math.cos(t), par = Wt * Math.sin(t);

    /* the ground, and the slope rising from it */
    var gx = W * 0.10, gy = H * 0.58, run = W * 0.76;
    /* keep the top of the slope on the canvas at steep angles */
    if (t > 0.02) run = Math.min(run, (gy - 46) / Math.tan(t));
    c.save();
    c.strokeStyle = K.SOFT; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + run, gy); c.stroke();
    c.restore();
    /* the slope rises to the RIGHT, so "up the slope" is the canvas angle −t and
       every direction below follows from that one choice */
    var sx = gx, sy = gy, ex = gx + run, ey = gy - run * Math.tan(t);
    c.save();
    c.strokeStyle = K.INK; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
    c.restore();
    arc(c, sx, sy, 62, -t, 0, K.MUT, fmt(th, 0) + '°');

    /* the block, sitting on the slope two thirds of the way up */
    var f = 0.46;
    var bx = sx + (ex - sx) * f, by = sy + (ey - sy) * f;
    var bw = 74, bh = 30;
    c.save();
    c.translate(bx, by); c.rotate(-t);
    c.fillStyle = K.FILL; c.strokeStyle = K.BLUE; c.lineWidth = 2;
    c.fillRect(-bw / 2, -bh, bw, bh); c.strokeRect(-bw / 2, -bh, bw, bh);
    c.restore();
    /* the point everything acts through */
    var px = bx - Math.sin(t) * (bh / 2), py = by - Math.cos(t) * (bh / 2);

    /* the tilted axis system, drawn before any force — this is the whole trick */
    ray(c, px, py, -t, 250, K.MUT, [7, 6]);                    /* parallel / shear   */
    ray(c, px, py, -t + Math.PI / 2, 210, K.MUT, [7, 6]);      /* perpendicular      */
    label(c, 'parallel axis (shear)', px + Math.cos(-t) * 150, py + Math.sin(-t) * 150 - 14,
          { color: K.MUT, size: 12, weight: '600', align: 'center', plate: true });
    label(c, 'perpendicular axis (compression)',
          px + Math.cos(-t - Math.PI / 2) * 132, py + Math.sin(-t - Math.PI / 2) * 132 - 12,
          { color: K.MUT, size: 12, weight: '600', align: 'center', plate: true });

    var S = 128 / Math.max(60, Wt);        /* newtons → pixels */

    /* weight: straight down, always, whatever the slope does */
    arrow(c, px, py, px, py + Wt * S, { color: K.INK, width: 4 });
    label(c, 'W = ' + fmt(Wt, 1) + ' N', px + 12, py + Wt * S + 16,
          { color: K.INK, size: 14, plate: true });

    /* its two components, along the axes we just drew */
    var pxp = px + Math.cos(-t + Math.PI / 2) * perp * S,
        pyp = py + Math.sin(-t + Math.PI / 2) * perp * S;
    arrow(c, px, py, pxp, pyp, { color: K.ACC, width: 3 });
    label(c, 'W cosθ = ' + fmt(perp, 1) + ' N', pxp - 8, pyp + 4,
          { color: K.ACC, size: 13, align: 'right', plate: true });
    var pxa = px + Math.cos(-t) * -par * S, pya = py + Math.sin(-t) * -par * S;
    arrow(c, px, py, pxa, pya, { color: K.ORG, width: 3 });
    label(c, 'W sinθ = ' + fmt(par, 1) + ' N', pxa - 6, pya + 16,
          { color: K.ORG, size: 13, align: 'right', plate: true });

    /* the ground pushes back, perpendicular to itself */
    /* out of the surface: the parallel direction turned the quarter turn that
       points away from the slope */
    var nx2 = px + Math.cos(-t - Math.PI / 2) * perp * S,
        ny2 = py + Math.sin(-t - Math.PI / 2) * perp * S;
    arrow(c, px, py, nx2, ny2, { color: K.BLUE, width: 4 });
    label(c, 'N = ' + fmt(perp, 1) + ' N', nx2, ny2 - 16,
          { color: K.BLUE, size: 14, align: 'center', plate: true });

    if (showFric) {
      var fx = px + Math.cos(-t) * par * S, fy2 = py + Math.sin(-t) * par * S;
      arrow(c, px, py, fx, fy2, { color: K.GRN, width: 3.4 });
      label(c, 'friction = ' + fmt(par, 1) + ' N', fx + 8, fy2 - 10,
            { color: K.GRN, size: 13, plate: true });
    }

    if (side) side.innerHTML =
      '<div class="icalc-h">' + fmt(m, 1) + ' kg on a <span class="v">' + fmt(th, 0) +
        '°</span> slope</div>' +
      '<div class="icalc-work">' +
      '<div class="icalc-t">the weight</div>' +
      '<div class="icalc-eq">W = mg = ' + fmt(m, 1) + ' × 9.81 = <b>' + fmt(Wt, 2) + '</b> N</div>' +
      '<div class="icalc-t" style="margin-top:.5em">perpendicular — pressed into the surface</div>' +
      '<div class="icalc-eq">W cosθ = ' + fmt(Wt, 2) + ' · cos ' + fmt(th, 0) +
        '° = <b class="r">' + fmt(perp, 2) + '</b> N</div>' +
      '<div class="icalc-t" style="margin-top:.5em">parallel — sliding down the surface</div>' +
      '<div class="icalc-eq">W sinθ = ' + fmt(Wt, 2) + ' · sin ' + fmt(th, 0) +
        '° = <b>' + fmt(par, 2) + '</b> N</div>' +
      '</div>' +
      '<div class="icalc-vals">' +
      '<div><span>N</span><b>' + fmt(perp, 1) + ' N</b></div>' +
      '<div><span>shear</span><b>' + fmt(par, 1) + ' N</b></div>' +
      '<div><span>N / W</span><b>' + fmt(perp / Wt * 100, 0) + '%</b></div>' +
      '</div>';

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

  var sA = slider(u.ctl, 'Slope angle', 0, 45, 1, th, function (v) { return fmt(v, 0) + '°'; },
    function (v) { th = v; draw(); }, { scale: 4, tick: function (v) { return fmt(v, 0) + '°'; } });
  var sM = slider(u.ctl, 'Mass', 1, 100, 1, m, function (v) { return fmt(v, 0) + ' kg'; },
    function (v) { m = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  chips(u.ctl, [['a', 'flat ground'], ['b', '4 kg at 20°'], ['c', 'a 102 kg cyclist at 20°']],
        null, function (v) {
    if (v === 'a') { th = 0; }
    else if (v === 'b') { th = 20; m = 4; }
    else { th = 20; m = 102; }
    sA.quiet(th); sM.quiet(m); draw();
  });
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
    var fw = port ? 200 : 240, fh = fw * 1.62;
    var fx = port ? (W - fw) / 2 : 70, fy = (H - fh) / 2;
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
    label(c, 'centre of pressure', FX(now[0]) + 16, FY(now[1]) - 18,
          { color: K.ACC, size: 12, weight: '700', plate: true });

    if (!port) {
      /* ---- the vertical force beside it ---- */
      ax.pl = 300; ax.pr = 40; ax.pt = 50; ax.pb = 92;
      ax.setRange(0, 1, 0, 1.5);
      ax.frame({ grid: true, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.5, 1, 1.5],
                 xlabel: 'stance (%)', ylabel: 'vertical force (body weights)',
                 ylabelx: 252,
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
    side.innerHTML = html;

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


/* ============================================================
   9. ONE FORCE, THREE COMPONENTS
   The ground reaction force during walking, resolved the way it is
   actually reported: vertical, anterior–posterior and medio-lateral.
   The braking-then-propulsion sign change in the AP component is the
   thing worth pointing at.
   ============================================================ */
function apGRF(p) {
  if (p <= 0 || p >= 1) return 0;
  return -0.22 * Math.exp(-Math.pow((p - 0.22) / 0.14, 2)) +
          0.24 * Math.exp(-Math.pow((p - 0.78) / 0.14, 2));
}
function mlGRF(p) {
  if (p <= 0 || p >= 1) return 0;
  return 0.05 * Math.exp(-Math.pow((p - 0.15) / 0.09, 2)) -
         0.06 * Math.exp(-Math.pow((p - 0.55) / 0.26, 2));
}

D.register('grf3d', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 900, h: port ? 470 : 430,
                            padl: 72, padr: 26, padt: 16, padb: 46 });
  var out = readout(u.ctl);
  var p = 0.30, playing = false, raf, last = 0;
  var P = [{ pt: 16, pb: 300 }, { pt: 156, pb: 160 }, { pt: 296, pb: 46 }];
  var COMPS = [
    { f: vgrf,  lab: 'vertical (z)',        col: 'BLUE', lo: -0.3, hi: 1.5, tk: [0, 0.5, 1, 1.5] },
    { f: apGRF, lab: 'fore–aft (x)',   col: 'ACC',  lo: -0.3, hi: 0.3, tk: [-0.2, 0, 0.2] },
    { f: mlGRF, lab: 'side to side (y)',    col: 'GRN',  lo: -0.1, hi: 0.1, tk: [-0.05, 0, 0.05] }
  ];

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    COMPS.forEach(function (cp, i) {
      ax.pt = P[i].pt; ax.pb = P[i].pb;
      ax.setRange(0, 1, cp.lo, cp.hi);
      ax.frame({ grid: true, xticks: i === 2 ? [0, 0.25, 0.5, 0.75, 1] : [],
                 yticks: cp.tk, ylabel: cp.lab, ysize: 12.5,
                 xlabel: i === 2 ? 'stance (%)' : null,
                 xfmt: function (v) { return fmt(v * 100, 0); },
                 yfmt: function (v) { return fmt(v, 2); } });
      if (cp.lo < 0) ax.poly([[0, 0], [1, 0]], { color: K.SOFT, width: 1 });
      var pts = [];
      for (var j = 0; j <= 120; j++) pts.push([j / 120, cp.f(j / 120)]);
      ax.poly(pts, { color: K[cp.col], width: 2.6 });
      ax.poly([[p, cp.lo], [p, cp.hi]], { color: K.MUT, width: 1, dash: [3, 3] });
      ax.dots([[p, cp.f(p)]], { color: K[cp.col], r: 5 });
      label(c, fmt(cp.f(p), 2) + ' BW', ax.X(p) + 10, ax.Y(cp.f(p)) - 12,
            { color: K[cp.col], size: 13, plate: true });
    });
    ax.pt = P[0].pt; ax.pb = P[0].pb;

    var ap = apGRF(p);
    out.innerHTML =
      fmt(p * 100, 0) + '% of stance &nbsp;·&nbsp; vertical <b class="b">' + fmt(vgrf(p), 2) +
      '</b> · fore–aft <b class="r">' + fmt(ap, 2) + '</b> · side to side <b class="g">' +
      fmt(mlGRF(p), 2) + '</b> BW' +
      '<span class="hint">' +
      (ap < -0.02 ? 'The fore–aft component is <b>negative</b>: the ground is pushing backwards ' +
                    'on you. This is the braking half of the step.'
       : ap > 0.02 ? 'The fore–aft component is <b>positive</b>: the ground is pushing you ' +
                     'forwards. This is the propulsive half.'
       : 'The fore–aft component passes through zero — the moment braking turns into ' +
         'propulsion.') +
      ' The vertical component is twenty times the others, which is why it is the one everybody ' +
      'quotes — and why the small ones are where the interesting things hide.</span>';
  }

  var s = slider(u.ctl, 'Stance', 0.01, 0.99, 0.01, p,
    function (v) { return fmt(v * 100, 0) + '%'; }, function (v) { p = v; draw(); },
    { scale: 5, tick: function (v) { return fmt(v * 100, 0) + '%'; } });
  var pb = playBtn(u.ctl, '▶ Take a step');
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

D.boot();

})();
