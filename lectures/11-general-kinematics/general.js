/* ======================================================================
   EPHE 341 — General Kinematics (lecture 11)

   Every widget here is about one equation:

        V_A/G  =  V_A/B  +  V_B/G

   a tangential term that comes from rotation, plus a linear term that comes
   from the joint being on the move. The later ones just add more terms.

   Shared helpers mirror the other decks so the vocabulary is the same.
   ====================================================================== */
(function () {
'use strict';

var D = window.DECK;
var Axes = D.Axes, el = D.el, slider = D.slider, playBtn = D.playBtn,
    readout = D.readout, build = D.build, axisTicks = D.axisTicks;
function C() { return D.colors(); }

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
/* fit.js's prewarm presses every .iseg-b and .icalc-chip it is not told to
   leave alone, and restores only one "on" control per figure. A control that
   chooses WHAT IS SHOWN has to opt out or the handout page is whatever the
   sweep happened to press last. */
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
  c.font = (o.weight || 600) + ' ' + (o.size || 13) + 'px ui-sans-serif,system-ui,sans-serif';
  c.textAlign = o.align || 'center';
  c.textBaseline = o.baseline || 'middle';
  if (o.plate) {
    var w = c.measureText(s).width, h = (o.size || 13) * 1.25;
    var x0 = o.align === 'left' ? x - 3 : o.align === 'right' ? x - w - 3 : x - w / 2 - 3;
    c.fillStyle = C().PLATE; c.globalAlpha = o.plateAlpha == null ? .86 : o.plateAlpha;
    c.fillRect(x0, y - h / 2, w + 6, h);
    c.globalAlpha = 1;
  }
  c.fillStyle = o.color || C().INK;
  c.fillText(s, x, y);
  c.restore();
}
function arrow(c, x1, y1, x2, y2, o) {
  o = o || {};
  var dx = x2 - x1, dy = y2 - y1, m = Math.hypot(dx, dy);
  if (m < 0.6) return;
  var head = Math.min(o.head || 10, m * 0.55);
  var ux = dx / m, uy = dy / m;
  c.save();
  c.strokeStyle = o.color || C().INK; c.fillStyle = o.color || C().INK;
  c.lineWidth = o.width || 2.2; c.lineCap = 'round';
  if (o.dash) c.setLineDash(o.dash);
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - ux * head * 0.82, y2 - uy * head * 0.82); c.stroke();
  c.setLineDash([]);
  c.beginPath();
  c.moveTo(x2, y2);
  c.lineTo(x2 - ux * head - uy * head * 0.42, y2 - uy * head + ux * head * 0.42);
  c.lineTo(x2 - ux * head + uy * head * 0.42, y2 - uy * head - ux * head * 0.42);
  c.closePath(); c.fill();
  c.restore();
}
/* a small right-angle tick where two lines meet perpendicularly */
function sqAngle(c, x, y, ux, uy, vx, vy, s, col) {
  s = s || 9;
  c.save(); c.strokeStyle = col || C().MUT; c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(x + ux * s, y + uy * s);
  c.lineTo(x + ux * s + vx * s, y + uy * s + vy * s);
  c.lineTo(x + vx * s, y + vy * s);
  c.stroke(); c.restore();
}
/* an arc between two directions, for marking an angle */
function arcBetween(c, x, y, r, a1, a2, o) {
  o = o || {};
  c.save(); c.strokeStyle = o.color || C().MUT; c.lineWidth = o.width || 1.6;
  if (o.dash) c.setLineDash(o.dash);
  c.beginPath(); c.arc(x, y, r, Math.min(a1, a2), Math.max(a1, a2)); c.stroke();
  c.restore();
}
function key(c, x, y, rows, o) {
  o = o || {};
  var size = o.size || 11.5, lh = size * 1.55, pad = 7;
  c.save();
  c.font = '600 ' + size + 'px ui-sans-serif,system-ui,sans-serif';
  var w = 0;
  rows.forEach(function (r) { w = Math.max(w, c.measureText(r[1]).width); });
  w += 26 + pad * 2;
  var h = rows.length * lh + pad * 2;
  c.fillStyle = C().PLATE; c.globalAlpha = .92;
  c.fillRect(x, y, w, h);
  c.globalAlpha = 1; c.strokeStyle = C().GRID; c.lineWidth = 1;
  c.strokeRect(x + .5, y + .5, w - 1, h - 1);
  rows.forEach(function (r, i) {
    var yy = y + pad + lh * i + lh / 2;
    c.strokeStyle = r[0]; c.lineWidth = 3; c.beginPath();
    c.moveTo(x + pad, yy); c.lineTo(x + pad + 17, yy); c.stroke();
    c.fillStyle = C().INK; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(r[1], x + pad + 24, yy);
  });
  c.restore();
  return { w: w, h: h };
}

var DEG = Math.PI / 180;

/* ======================================================================
   1. FRAMES — the same segment seen from the joint and from the ground
   Two panels side by side. Left: a camera bolted to the shoulder, which
   only ever sees a circle. Right: a camera bolted to the ground, which
   sees the cycloid the hand actually traces.
   ====================================================================== */
D.register('frames', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { w: 4.2, vb: 1.8, r: 0.58 };
  var t = 0, playing = true, last = 0, raf = null;

  var H = port ? 470 : 330;
  var ax = new Axes(u.cv, { w: port ? 460 : 1120, h: H,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  function panel(x0, y0, w, h, title, ground) {
    var c = ax.c, K = C();
    var th = S.w * t;                        /* segment angle, from +x */
    var PX = 118;                            /* px per metre */
    var cx, cy = y0 + h * 0.56;
    var bx;                                  /* joint x in px */
    if (ground) {
      /* the joint travels; wrap it so it stays in the panel */
      var span = w - 150;
      var travel = (S.vb * t * PX) % span;
      bx = x0 + 80 + travel;
    } else {
      bx = x0 + w / 2;
    }
    cx = bx;
    var ax2 = cx + Math.cos(th) * S.r * PX;
    var ay2 = cy - Math.sin(th) * S.r * PX;

    /* the path the hand has traced */
    c.save(); c.strokeStyle = K.BLUE; c.globalAlpha = .45; c.lineWidth = 1.6;
    c.beginPath();
    var n = 150, drawn = false;
    for (var i = 0; i <= n; i++) {
      var tt = t - (n - i) / n * 1.9;
      if (tt < 0) continue;
      var a = S.w * tt;
      var jx = ground ? x0 + 80 + ((S.vb * tt * PX) % (w - 150)) : cx;
      /* break the line where the wrap jumps */
      if (ground && i > 0) {
        var prev = x0 + 80 + ((S.vb * (tt - 1.9 / n) * PX) % (w - 150));
        if (jx < prev - 5) { c.stroke(); c.beginPath(); drawn = false; }
      }
      var px = jx + Math.cos(a) * S.r * PX, py = cy - Math.sin(a) * S.r * PX;
      if (!drawn) { c.moveTo(px, py); drawn = true; } else c.lineTo(px, py);
    }
    c.stroke(); c.restore();

    /* ground line */
    if (ground) {
      c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .5; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(x0 + 14, cy + S.r * PX + 26);
      c.lineTo(x0 + w - 14, cy + S.r * PX + 26); c.stroke(); c.restore();
    }

    /* the segment */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 4.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(ax2, ay2); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.PLATE; c.strokeStyle = K.INK; c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, 5.5, 0, 7); c.fill(); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.ACC;
    c.beginPath(); c.arc(ax2, ay2, 6.5, 0, 7); c.fill(); c.restore();

    /* velocity arrows */
    var VS = 26;
    var tvx = -Math.sin(th) * S.w * S.r, tvy = -Math.cos(th) * S.w * S.r;   /* screen y down */
    var gvx = tvx + (ground ? S.vb : 0), gvy = tvy;
    arrow(c, ax2, ay2, ax2 + gvx * VS, ay2 + gvy * VS,
          { color: ground ? K.ACC : K.BLUE, width: 3, head: 11 });

    label(c, title, x0 + w / 2, y0 + 16, { color: K.INK, size: 13 });
    var sp = Math.hypot(gvx, gvy);
    label(c, (ground ? 'speed over the ground ' : 'speed about the joint ') + fmt(sp, 2) + ' m/s',
          x0 + w / 2, y0 + h - 10,
          { color: ground ? K.ACC : K.BLUE, size: 12, plate: true });
    return sp;
  }

  var spA = 0, spB = 0;
  function draw() {
    var K = C(), W = ax.W;
    ax.clear();
    if (port) {
      spA = panel(0, 0, W, ax.H / 2, 'Camera on the joint', false);
      spB = panel(0, ax.H / 2, W, ax.H / 2, 'Camera on the ground', true);
    } else {
      spA = panel(0, 0, W / 2, ax.H, 'Camera on the joint', false);
      spB = panel(W / 2, 0, W / 2, ax.H, 'Camera on the ground', true);
      ax.c.save(); ax.c.strokeStyle = K.GRID; ax.c.lineWidth = 1;
      ax.c.beginPath(); ax.c.moveTo(W / 2, 14); ax.c.lineTo(W / 2, ax.H - 14); ax.c.stroke();
      ax.c.restore();
    }
    out.innerHTML = 'About the joint the hand holds a steady <b>' + fmt(S.w * S.r, 2) +
      ' m/s</b> — that is ωr and it never changes. Over the ground it is <b>' + fmt(spB, 2) +
      ' m/s</b> right now, swinging between <b>' + fmt(Math.abs(S.w * S.r - S.vb), 2) +
      '</b> and <b>' + fmt(S.w * S.r + S.vb, 2) + ' m/s</b>.';
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  slider(g2, 'Angular velocity ω', 0.5, 8, 0.1, S.w,
    function (v) { return fmt(v, 1) + ' rad/s'; }, function (v) { S.w = v; draw(); });
  slider(g2, 'Joint velocity V<sub>B/G</sub>', 0, 5, 0.1, S.vb,
    function (v) { return fmt(v, 1) + ' m/s'; }, function (v) { S.vb = v; draw(); });

  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '❚❚ Pause');
  function stop() { playing = false; btn.textContent = '▶ Play'; if (raf) cancelAnimationFrame(raf); raf = null; }
  function go() { playing = true; btn.textContent = '❚❚ Pause'; last = 0; raf = requestAnimationFrame(tick); }
  btn.addEventListener('click', function () { playing ? stop() : go(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing) stop(); });

  function tick(ts) {
    if (!playing) return;
    if (last) t += Math.min(0.05, (ts - last) / 1000);
    last = ts;
    draw();
    raf = requestAnimationFrame(tick);
  }
  draw();
  go();
  window.addEventListener('ephe341-theme', draw);
});


/* ======================================================================
   2. VSUM — build V_A/G from the two vectors, tip to tail
   ====================================================================== */
D.register('vsum', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { th: 50, w: 4.2, r: 0.58, vb: 1.8 };

  var ax = new Axes(u.cv, { w: port ? 460 : 940, h: port ? 440 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var th = S.th * DEG;
    var tvx = Math.sin(th) * S.w * S.r, tvy = Math.cos(th) * S.w * S.r;   /* +x forward, +y up */
    var gx = tvx + S.vb, gy = tvy;

    /* Lay the whole construction out around B at the origin, measure it, then
       translate so it sits in the middle of the canvas. Pinning B to a fixed
       corner leaves the figure hard against one edge at some slider settings
       and with half the canvas empty at others. */
    var PX = port ? 140 : 180, VS = port ? 36 : 48;
    function layout(PX, VS) {
      /* A sits up and to the LEFT of B. V_A/B is the velocity of A ABOUT B,
         so it is tangential — at right angles to the segment — and ωr drawn
         at 90° − θ above the horizontal is perpendicular only to a segment
         lying at θ on the other side of the vertical. With A up and to the
         right the two were 10° apart at θ = 50° and the right-angle mark was
         a lie. */
      var a = [-Math.cos(th) * S.r * PX, -Math.sin(th) * S.r * PX];       /* hand */
      var p1 = [a[0] + tvx * VS, a[1] - tvy * VS];
      var p2 = [p1[0] + S.vb * VS, p1[1]];
      var xs = [0, a[0], p1[0], p2[0], -110], ys = [0, a[1], p1[1], p2[1], 0];
      return { a: a, p1: p1, p2: p2,
               x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs),
               y0: Math.min.apply(null, ys), y1: Math.max.apply(null, ys) };
    }
    var L = layout(PX, VS);
    /* fit to the space in both directions: at a shallow angle with a small ω
       the construction is a third of the canvas wide, so it has to be allowed
       to grow as well as shrink. One extra pass settles the unscaled 110 px
       reference line. */
    var availW = W * (port ? 0.90 : 0.62) - 40, availH = H - 110;
    for (var pass = 0; pass < 2; pass++) {
      var k = Math.min(availW / Math.max(1, L.x1 - L.x0), availH / Math.max(1, L.y1 - L.y0));
      k = Math.max(0.35, Math.min(k, port ? 2.0 : 2.6));
      PX = Math.min(PX * k, port ? 330 : 430); VS = Math.min(VS * k, port ? 86 : 115);
      L = layout(PX, VS);
    }
    var bx = W * (port ? 0.5 : 0.34) - (L.x0 + L.x1) / 2;
    var by = H * 0.52 - (L.y0 + L.y1) / 2;
    var axp = bx + L.a[0], ayp = by + L.a[1];

    /* segment */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 4.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx, by); c.lineTo(axp, ayp); c.stroke(); c.restore();
    arcBetween(c, bx, by, 34, Math.PI, Math.PI + th, { color: K.MUT });
    label(c, 'θ = ' + fmt(S.th, 0) + '°', bx - 56, by - 15, { color: K.MUT, size: 12 });
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .55; c.setLineDash([4, 4]); c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - 110, by); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.PLATE; c.strokeStyle = K.INK; c.lineWidth = 2;
    c.beginPath(); c.arc(bx, by, 6, 0, 7); c.fill(); c.stroke(); c.restore();
    label(c, 'B', bx + 12, by + 20, { color: K.INK, size: 12.5, align: 'left' });
    label(c, 'A', axp - 14, ayp - 2, { color: K.INK, size: 12.5, align: 'right' });

    /* tip-to-tail at the hand: tangential first, then the joint's own velocity */
    var p1x = bx + L.p1[0], p1y = by + L.p1[1];
    var p2x = bx + L.p2[0], p2y = by + L.p2[1];
    arrow(c, axp, ayp, p1x, p1y, { color: K.BLUE, width: 3, head: 12 });
    arrow(c, p1x, p1y, p2x, p2y, { color: K.GRN, width: 3, head: 12 });
    arrow(c, axp, ayp, p2x, p2y, { color: K.ACC, width: 3.4, head: 13 });
    /* the right angle between the segment (A → B, down-right) and V_A/B */
    sqAngle(c, axp, ayp, Math.cos(th), Math.sin(th), Math.sin(th), -Math.cos(th), 11, K.BLUE);

    label(c, 'V', (axp + p1x) / 2 - 10, (ayp + p1y) / 2 - 13, { color: K.BLUE, size: 12.5 });
    label(c, 'A/B = ' + fmt(S.w * S.r, 2), (axp + p1x) / 2 + 26, (ayp + p1y) / 2 - 11,
          { color: K.BLUE, size: 11 });
    label(c, 'V B/G = ' + fmt(S.vb, 1), (p1x + p2x) / 2, p1y - 14, { color: K.GRN, size: 11.5 });
    label(c, 'V A/G = ' + fmt(Math.hypot(gx, gy), 2) + ' m/s',
          (axp + p2x) / 2 + 20, (ayp + p2y) / 2 + 20, { color: K.ACC, size: 12.5, plate: true });

    key(c, W - (port ? 190 : 210), 14, [[K.BLUE, 'V A/B = ωr  (tangential)'],
                                        [K.GRN, 'V B/G  (the joint)'],
                                        [K.ACC, 'V A/G  (the answer)']], { size: 11 });

    var ang = Math.atan2(gy, gx) / DEG;
    out.innerHTML = 'V<sub>A/B</sub> = ωr = <b>' + fmt(S.w * S.r, 2) +
      ' m/s</b> perpendicular to the segment, plus V<sub>B/G</sub> = <b>' + fmt(S.vb, 1) +
      ' m/s</b> horizontal, gives V<sub>A/G</sub> = <b>' + fmt(Math.hypot(gx, gy), 2) +
      ' m/s</b> at <b>' + num(ang, 1) + '°</b>.';
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  slider(g2, 'Segment angle θ', 0, 90, 1, S.th,
    function (v) { return fmt(v, 0) + '°'; }, function (v) { S.th = v; draw(); });
  slider(g2, 'Angular velocity ω', 0, 8, 0.1, S.w,
    function (v) { return fmt(v, 1) + ' rad/s'; }, function (v) { S.w = v; draw(); });
  slider(g2, 'Radius r', 0.2, 0.9, 0.01, S.r,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { S.r = v; draw(); });
  slider(g2, 'Joint velocity V<sub>B/G</sub>', 0, 5, 0.1, S.vb,
    function (v) { return fmt(v, 1) + ' m/s'; }, function (v) { S.vb = v; draw(); });

  draw();
  window.addEventListener('ephe341-theme', draw);
});

/* ======================================================================
   3. COMPS — resolve, add component by component, recombine
   ====================================================================== */
D.register('comps', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { th: 50, w: 4.2, r: 0.58, vb: 1.8 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1060, h: port ? 500 : 390,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  function vals() {
    var th = S.th * DEG, t = S.w * S.r;
    var a = Math.PI / 2 - th;                /* angle of V_A/B to the horizontal */
    return { t: t, a: a, tx: t * Math.cos(a), ty: t * Math.sin(a),
             bx: S.vb, by: 0,
             gx: t * Math.cos(a) + S.vb, gy: t * Math.sin(a) };
  }

  /* left: the two vectors with their components dropped to the axes */
  function panelA(x0, y0, w, h) {
    var c = ax.c, K = C(), v = vals();
    var VS = Math.min((w - 110) / Math.max(v.gx, 1), (h - 90) / Math.max(v.gy, 0.8));
    var ox = x0 + 56, oy = y0 + h - 46;
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(ox, y0 + 28); c.lineTo(ox, oy); c.lineTo(x0 + w - 18, oy);
    c.stroke(); c.restore();
    label(c, 'y', ox - 14, y0 + 32, { color: K.MUT, size: 11 });
    label(c, 'x', x0 + w - 16, oy + 14, { color: K.MUT, size: 11 });

    function V(vx, vy, col, nm, dashcol) {
      var ex = ox + vx * VS, ey = oy - vy * VS;
      arrow(c, ox, oy, ex, ey, { color: col, width: 3, head: 11 });
      c.save(); c.strokeStyle = col; c.globalAlpha = .45; c.setLineDash([4, 4]); c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex, oy); c.stroke();
      c.beginPath(); c.moveTo(ex, ey); c.lineTo(ox, ey); c.stroke();
      c.restore();
      return [ex, ey];
    }
    V(v.tx, v.ty, K.BLUE);
    V(v.bx, v.by, K.GRN);
    var g = V(v.gx, v.gy, K.ACC);
    label(c, 'V A/B', ox + v.tx * VS * 0.55 - 20, oy - v.ty * VS * 0.55 - 12,
          { color: K.BLUE, size: 11.5, plate: true });
    label(c, 'V B/G', ox + v.bx * VS * 0.5, oy + 15, { color: K.GRN, size: 11.5, plate: true });
    label(c, 'V A/G', g[0] + 4, g[1] - 14, { color: K.ACC, size: 12, align: 'left', plate: true });
    label(c, 'Resolve each one', x0 + w / 2, y0 + 14, { color: K.INK, size: 12.5 });
  }

  /* right: the component arithmetic as two stacked bars */
  function panelB(x0, y0, w, h) {
    var c = ax.c, K = C(), v = vals();
    var ox = x0 + 70, oy0 = y0 + h * 0.40, oy1 = y0 + h * 0.78;
    var mx = Math.max(v.gx, v.gy, 0.8);
    var BS = (w - 210) / mx;
    function bar(y, a, b, nm, ca, cb) {
      var x1 = ox + a * BS, x2 = x1 + b * BS;
      c.save();
      c.fillStyle = ca; c.globalAlpha = .9; c.fillRect(ox, y - 11, a * BS, 22);
      c.fillStyle = cb; c.fillRect(x1, y - 11, b * BS, 22);
      c.restore();
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(ox, y + 19); c.lineTo(x2, y + 19); c.stroke();
      c.beginPath(); c.moveTo(x2, y + 14); c.lineTo(x2, y + 24); c.stroke();
      c.restore();
      label(c, nm, ox - 10, y, { color: K.INK, size: 12, align: 'right' });
      if (a * BS > 34) label(c, fmt(a, 2), ox + a * BS / 2, y, { color: '#fff', size: 11 });
      if (b * BS > 30) label(c, fmt(b, 2), x1 + b * BS / 2, y, { color: '#fff', size: 11 });
      label(c, '= ' + fmt(a + b, 2) + ' m/s', x2 + 8, y + 19, { color: K.ACC, size: 11.5, align: 'left' });
    }
    bar(oy0, v.tx, v.bx, 'x', K.BLUE, K.GRN);
    bar(oy1, v.ty, v.by, 'y', K.BLUE, K.GRN);
    label(c, 'Add component by component', x0 + w / 2, y0 + 14, { color: K.INK, size: 12.5 });
    label(c, 'V A/G = √(' + fmt(v.gx, 2) + '² + ' + fmt(v.gy, 2) + '²) = ' +
             fmt(Math.hypot(v.gx, v.gy), 2) + ' m/s',
          x0 + w / 2, y0 + h - 18, { color: K.ACC, size: 12.5 });
  }

  function draw() {
    var W = ax.W, H = ax.H, v = vals();
    ax.clear();
    if (port) { panelA(0, 0, W, H * 0.54); panelB(0, H * 0.54, W, H * 0.46); }
    else { panelA(0, 0, W * 0.44, H); panelB(W * 0.44, 0, W * 0.56, H); }
    out.innerHTML = 'V<sub>A/B</sub> sits at <b>' + fmt(90 - S.th, 0) +
      '°</b> to the horizontal — that is 90° − θ. Its components are <b>' + fmt(v.tx, 2) +
      '</b> and <b>' + fmt(v.ty, 2) + '</b>; adding V<sub>B/G</sub> gives <b>' + fmt(v.gx, 2) +
      '</b> and <b>' + fmt(v.gy, 2) + '</b>, so V<sub>A/G</sub> = <b>' +
      fmt(Math.hypot(v.gx, v.gy), 2) + ' m/s</b> at <b>' +
      fmt(Math.atan2(v.gy, v.gx) / DEG, 1) + '°</b>.';
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  slider(g2, 'Segment angle θ', 0, 90, 1, S.th,
    function (v) { return fmt(v, 0) + '°'; }, function (v) { S.th = v; draw(); });
  slider(g2, 'Angular velocity ω', 0, 8, 0.1, S.w,
    function (v) { return fmt(v, 1) + ' rad/s'; }, function (v) { S.w = v; draw(); });
  slider(g2, 'Joint velocity V<sub>B/G</sub>', 0, 5, 0.1, S.vb,
    function (v) { return fmt(v, 1) + ' m/s'; }, function (v) { S.vb = v; draw(); });

  draw();
  window.addEventListener('ephe341-theme', draw);
});


/* ======================================================================
   4. WHEEL — his bicycle problem, answered everywhere on the rim
   ====================================================================== */
D.register('wheel', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { pos: 90, w: 2, v: 10, r: 0.34, roll: false };
  var t = 0, playing = false, last = 0, raf = null;

  var ax = new Axes(u.cv, { w: port ? 460 : 940, h: port ? 470 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  function omega() { return S.roll ? S.v / S.r : S.w; }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var R = Math.min(H * 0.38, W * 0.19);
    var cx = W * 0.27, cy = H * 0.48;
    var a = S.pos * DEG;                       /* position on the rim, 0 = right, 90 = top */
    var px = cx + Math.cos(a) * R, py = cy - Math.sin(a) * R;
    var w = omega();

    /* ground */
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .55; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(20, cy + R + 1); c.lineTo(W - 20, cy + R + 1); c.stroke(); c.restore();
    /* rim and spokes */
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .34; c.lineWidth = 1;
    for (var i = 0; i < 16; i++) {
      var sa = i / 16 * Math.PI * 2 + w * t * 0.25;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(sa) * R, cy - Math.sin(sa) * R); c.stroke();
    }
    c.restore();
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 3.4;
    c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.PLATE; c.strokeStyle = K.INK; c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, 6, 0, 7); c.fill(); c.stroke(); c.restore();
    label(c, 'B', cx - 14, cy + 14, { color: K.INK, size: 12.5 });

    /* radius */
    c.save(); c.strokeStyle = K.MUT; c.setLineDash([4, 4]); c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(px, py); c.stroke(); c.restore();

    var VS = Math.min(9.5, (W * 0.34) / Math.max(1, S.v + w * S.r));
    /* tangential velocity: perpendicular to the radius, in the direction of spin */
    var tvx = -Math.sin(a) * w * S.r, tvy = -Math.cos(a) * w * S.r;   /* screen-y down */
    var gvx = tvx + S.v, gvy = tvy;
    arrow(c, px, py, px + tvx * VS, py + tvy * VS, { color: K.BLUE, width: 3, head: 11 });
    arrow(c, px + tvx * VS, py + tvy * VS, px + tvx * VS + S.v * VS, py + tvy * VS,
          { color: K.GRN, width: 3, head: 11 });
    arrow(c, px, py, px + gvx * VS, py + gvy * VS, { color: K.ACC, width: 3.4, head: 13 });
    c.save(); c.fillStyle = K.ACC; c.beginPath(); c.arc(px, py, 6, 0, 7); c.fill(); c.restore();
    label(c, 'A', px + Math.cos(a) * 17, py - Math.sin(a) * 17, { color: K.INK, size: 12.5 });

    key(c, W - (port ? 196 : 206), 10, [[K.BLUE, 'V A/B = ωr'],
                                        [K.GRN, 'V B/G = bike'],
                                        [K.ACC, 'V A/G']], { size: 11 });

    /* the three landmark answers, always on screen */
    var top = S.v + w * S.r, bot = S.v - w * S.r;
    var side = Math.hypot(S.v, w * S.r);
    var bx = W * 0.58, bw = 232, by = H * 0.26;
    [['top of the wheel', top, K.INK], ['front or back', side, K.INK],
     ['bottom of the wheel', bot, K.INK]].forEach(function (q, i) {
      label(c, q[0], bx, by + i * 27, { color: K.MUT, size: 11.5, align: 'left' });
      label(c, fmt(q[1], 2) + ' m/s', bx + bw, by + i * 27, { color: q[2], size: 12.5, align: 'right' });
    });
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
    c.beginPath(); c.moveTo(bx, by + 72); c.lineTo(bx + bw, by + 72); c.stroke(); c.restore();
    label(c, 'this point', bx, by + 92, { color: K.ACC, size: 12, align: 'left' });
    label(c, fmt(Math.hypot(gvx, gvy), 2) + ' m/s', bx + bw, by + 92,
          { color: K.ACC, size: 13.5, align: 'right' });

    out.innerHTML = 'ω = <b>' + fmt(w, 2) + ' rad/s</b>, so V<sub>A/B</sub> = ωr = <b>' +
      fmt(w * S.r, 2) + ' m/s</b>. At the top the two vectors line up and add to <b>' +
      fmt(top, 2) + ' m/s</b>; at the bottom they oppose and give <b>' + fmt(bot, 2) +
      ' m/s</b>.' + (S.roll ? ' <b>Rolling without slipping</b>: ω is tied to the speed, so the ' +
      'bottom of the wheel is momentarily <b>stationary</b>.' : '');
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  var sPos = slider(g2, 'Point on the rim', 0, 360, 1, S.pos,
    function (v) { return fmt(v, 0) + '°'; }, function (v) { S.pos = v; draw(); });
  var sW = slider(g2, 'Angular velocity ω', 0, 32, 0.1, S.w,
    function (v) { return fmt(v, 1) + ' rad/s'; }, function (v) { S.w = v; S.roll = false; segc(); draw(); });
  slider(g2, 'Bicycle velocity V<sub>B/G</sub>', 0, 14, 0.1, S.v,
    function (v) { return fmt(v, 1) + ' m/s'; }, function (v) { S.v = v; if (S.roll) sW.quiet(S.v / S.r); draw(); });

  var row = ctlRow(u.ctl);
  var segRow = keepOut(seg(row, [['free', 'His numbers'], ['roll', 'Rolling without slipping']],
    'free', function (k) {
      S.roll = (k === 'roll');
      if (S.roll) sW.quiet(S.v / S.r); else sW.quiet(S.w);
      draw();
    }));
  /* dragging omega by hand means we are no longer rolling without slipping */
  function segc() {
    Array.prototype.forEach.call(segRow.children, function (b, i) {
      b.classList.toggle('on', S.roll ? i === 1 : i === 0);
    });
  }
  var btn = playBtn(row, '▶ Spin');
  btn.setAttribute('data-unsafe', '1');
  function stop() { playing = false; btn.textContent = '▶ Spin'; if (raf) cancelAnimationFrame(raf); raf = null; }
  btn.addEventListener('click', function () {
    if (playing) { stop(); return; }
    playing = true; btn.textContent = '❚❚ Stop'; last = 0; raf = requestAnimationFrame(tick);
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing) stop(); });
  function tick(ts) {
    if (!playing) return;
    if (last) { t += (ts - last) / 1000; S.pos = (S.pos + omega() * (ts - last) / 1000 / DEG * 0.35) % 360; sPos.quiet(S.pos); }
    last = ts; draw(); raf = requestAnimationFrame(tick);
  }

  draw();
  window.addEventListener('ephe341-theme', draw);
});

/* ======================================================================
   5. ZPAT — the 90° − θ trap, with both answers side by side
   ====================================================================== */
D.register('zpat', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { th: 50, w: 4.2, r: 0.58, vb: 1.8 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1000, h: port ? 470 : 390,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var th = S.th * DEG, t = S.w * S.r;
    var right = Math.PI / 2 - th;                 /* the correct angle */
    var PX = port ? 190 : 250, VS = port ? 44 : 56;
    /* The hand is up and to the LEFT of the shoulder, as in his diagram.
       That is not decoration: V_H/S is the velocity of the hand ABOUT the
       shoulder, so it is tangential — perpendicular to the segment — and ωr
       at 90° − θ above the horizontal is only perpendicular to a segment
       lying at θ on the OTHER side of the vertical. Drawing the segment up
       and to the right puts the two within 10° of each other at θ = 50° and
       makes nonsense of the right-angle mark. */
    var sx = W * 0.30, sy = H * 0.76;             /* shoulder */
    var hx = sx - Math.cos(th) * S.r * PX, hy = sy - Math.sin(th) * S.r * PX;

    /* dotted horizontals through shoulder and hand — his z-pattern */
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .6; c.setLineDash([5, 4]); c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(sx - 170, sy); c.lineTo(sx + 60, sy); c.stroke();
    c.beginPath(); c.moveTo(hx - 60, hy); c.lineTo(hx + 150, hy); c.stroke();
    c.restore();

    /* segment */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 4.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(hx, hy); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.PLATE; c.strokeStyle = K.INK; c.lineWidth = 2;
    c.beginPath(); c.arc(sx, sy, 6, 0, 7); c.fill(); c.stroke(); c.restore();
    label(c, 'Shoulder', sx + 14, sy + 22, { color: K.INK, size: 12, align: 'left' });
    label(c, 'Hand', hx - 16, hy - 10, { color: K.INK, size: 12, align: 'right' });

    /* θ at the shoulder, between the leftward horizontal and the segment,
       and the same θ repeated under the hand — the z-pattern */
    arcBetween(c, sx, sy, 40, Math.PI, Math.PI + th, { color: K.VIO, width: 2 });
    label(c, 'θ = ' + fmt(S.th, 0) + '°', sx - 72, sy - 17, { color: K.VIO, size: 12 });
    arcBetween(c, hx, hy, 34, 0, th, { color: K.VIO, width: 2, dash: [3, 3] });
    label(c, 'θ = ' + fmt(S.th, 0) + '°', hx + 66, hy + 20, { color: K.VIO, size: 11.5 });

    /* the tangential velocity: perpendicular to the segment, by construction */
    var tvx = Math.sin(th) * t, tvy = Math.cos(th) * t;
    arrow(c, hx, hy, hx + tvx * VS, hy - tvy * VS, { color: K.BLUE, width: 3.2, head: 12 });
    /* the right angle sits between the segment (hand → shoulder, down-right)
       and V_H/S (up-right) */
    sqAngle(c, hx, hy, Math.cos(th), Math.sin(th), Math.sin(th), -Math.cos(th), 12, K.BLUE);
    arcBetween(c, hx, hy, 52, -right, 0, { color: K.BLUE, width: 2 });
    label(c, fmt(90 - S.th, 0) + '°', hx + 74, hy - 18, { color: K.BLUE, size: 13 });
    label(c, 'V H/S', hx + tvx * VS + 8, hy - tvy * VS - 10,
          { color: K.BLUE, size: 12, align: 'left', plate: true });

    /* the two answers, right and wrong */
    var bx = port ? 16 : W * 0.60, by = port ? H * 0.06 : H * 0.14;
    var okx = t * Math.cos(right) + S.vb, oky = t * Math.sin(right);
    var bad = th;                                /* using θ instead of 90 − θ */
    var bdx = t * Math.cos(bad) + S.vb, bdy = t * Math.sin(bad);
    function block(y, ttl, ang, cx2, cy2, col) {
      label(c, ttl, bx, y, { color: col, size: 12, align: 'left' });
      label(c, 'V x = rω cos ' + fmt(ang, 0) + '° + ' + fmt(S.vb, 1) + ' = ' + fmt(cx2, 2),
            bx, y + 22, { color: K.INK, size: 11.5, align: 'left' });
      label(c, 'V y = rω sin ' + fmt(ang, 0) + '° = ' + fmt(cy2, 2),
            bx, y + 42, { color: K.INK, size: 11.5, align: 'left' });
      label(c, 'V H/G = ' + fmt(Math.hypot(cx2, cy2), 2) + ' m/s at ' +
               fmt(Math.atan2(cy2, cx2) / DEG, 1) + '°',
            bx, y + 64, { color: col, size: 12.5, align: 'left' });
    }
    block(by, '✓ 90° − θ = ' + fmt(90 - S.th, 0) + '°', 90 - S.th, okx, oky, K.GRN);
    block(by + 104, '✗ using θ = ' + fmt(S.th, 0) + '°', S.th, bdx, bdy, K.ACC);

    out.innerHTML = 'The segment sits at <b>' + fmt(S.th, 0) +
      '°</b>; V<sub>H/S</sub> is perpendicular to it, so it sits at <b>' + fmt(90 - S.th, 0) +
      '°</b> to the horizontal. Using θ by mistake gives <b>' + fmt(Math.hypot(bdx, bdy), 2) +
      ' m/s</b> instead of <b>' + fmt(Math.hypot(okx, oky), 2) + ' m/s</b>.';
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  slider(g2, 'Segment angle θ', 5, 85, 1, S.th,
    function (v) { return fmt(v, 0) + '°'; }, function (v) { S.th = v; draw(); });
  slider(g2, 'Angular velocity ω', 0.5, 8, 0.1, S.w,
    function (v) { return fmt(v, 1) + ' rad/s'; }, function (v) { S.w = v; draw(); });

  draw();
  window.addEventListener('ephe341-theme', draw);
});


/* ======================================================================
   6. PITCHER — his worked example, live
   His numbers: r 0.58 m, θ 50°, ω 4.2 rad/s, shoulder 1.8 m/s horizontal.
   They reproduce 3.67, 1.566, 3.99 and 23.1° exactly.
   ====================================================================== */
D.register('pitcher', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { th: 50, w: 4.2, r: 0.58, vs: 1.8 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1080, h: port ? 500 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  function vals() {
    var th = S.th * DEG, t = S.w * S.r, a = Math.PI / 2 - th;
    var x = t * Math.cos(a) + S.vs, y = t * Math.sin(a);
    return { t: t, a: a, hx: t * Math.cos(a), hy: t * Math.sin(a),
             x: x, y: y, m: Math.hypot(x, y), d: Math.atan2(y, x) / DEG };
  }

  function figure(x0, y0, w, h) {
    var c = ax.c, K = C(), v = vals(), th = S.th * DEG;
    var PX = Math.min((w - 150) / 0.95, (h - 120) / 0.95);
    /* hand up and to the LEFT of the shoulder, as in his diagram — see the
       note in zpat: it is what makes V_H/S perpendicular to r. */
    var sx = x0 + w * 0.56, sy = y0 + h * 0.74;
    var hx = sx - Math.cos(th) * S.r * PX, hy = sy - Math.sin(th) * S.r * PX;
    var VS = Math.min((w - 120) / Math.max(v.m, 1) * 0.42, 60);

    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .55; c.setLineDash([5, 4]); c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(sx - 130, sy); c.lineTo(sx + 60, sy); c.stroke();
    c.beginPath(); c.moveTo(hx - 60, hy); c.lineTo(hx + 130, hy); c.stroke();
    c.restore();
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 4.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(hx, hy); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.PLATE; c.strokeStyle = K.INK; c.lineWidth = 2;
    c.beginPath(); c.arc(sx, sy, 6, 0, 7); c.fill(); c.stroke(); c.restore();
    label(c, 'Shoulder', sx + 14, sy + 22, { color: K.INK, size: 12, align: 'left' });
    label(c, 'Hand', hx - 14, hy - 10, { color: K.INK, size: 12, align: 'right' });
    arcBetween(c, sx, sy, 38, Math.PI, Math.PI + th, { color: K.MUT });
    label(c, 'θ=' + fmt(S.th, 0) + '°', sx - 62, sy - 16, { color: K.MUT, size: 11.5 });
    label(c, 'r = ' + fmt(S.r, 2) + ' m',
          (sx + hx) / 2 - 30, (sy + hy) / 2 - 10, { color: K.MUT, size: 11, plate: true });

    /* the shoulder's own velocity, drawn at the shoulder */
    arrow(c, sx, sy, sx + S.vs * VS, sy, { color: K.GRN, width: 3, head: 11 });
    label(c, 'V S/G = ' + fmt(S.vs, 1), sx + S.vs * VS / 2 + 18, sy - 15,
          { color: K.GRN, size: 11.5, plate: true });

    /* tip to tail at the hand */
    var p1x = hx + v.hx * VS, p1y = hy - v.hy * VS;
    var p2x = p1x + S.vs * VS, p2y = p1y;
    arrow(c, hx, hy, p1x, p1y, { color: K.BLUE, width: 3, head: 11 });
    arrow(c, p1x, p1y, p2x, p2y, { color: K.GRN, width: 3, head: 11 });
    arrow(c, hx, hy, p2x, p2y, { color: K.ACC, width: 3.4, head: 13 });
    sqAngle(c, hx, hy, Math.cos(th), Math.sin(th), Math.sin(th), -Math.cos(th), 11, K.BLUE);
    label(c, 'V H/S = ' + fmt(v.t, 2), (hx + p1x) / 2 - 6, (hy + p1y) / 2 - 14,
          { color: K.BLUE, size: 11.5, plate: true });
    label(c, 'V H/G', (hx + p2x) / 2 + 14, (hy + p2y) / 2 + 18,
          { color: K.ACC, size: 12.5, plate: true });
  }

  function board(x0, y0, w, h) {
    var c = ax.c, K = C(), v = vals();
    var x = x0 + 8, y = y0 + 26, L = 21;
    label(c, 'V H/G = V H/S + V S/G', x, y, { color: K.INK, size: 13, align: 'left' });
    y += L + 8;
    label(c, 'rω = ' + fmt(S.r, 2) + ' × ' + fmt(S.w, 1) + ' = ' + fmt(v.t, 3) + ' m/s',
          x, y, { color: K.MUT, size: 11.5, align: 'left' }); y += L;
    label(c, 'angle to the horizontal = 90° − ' + fmt(S.th, 0) + '° = ' + fmt(90 - S.th, 0) + '°',
          x, y, { color: K.MUT, size: 11.5, align: 'left' }); y += L + 8;
    label(c, 'x:  V H/Gx = rω cos ' + fmt(90 - S.th, 0) + '° + ' + fmt(S.vs, 1),
          x, y, { color: K.INK, size: 11.5, align: 'left' }); y += L;
    label(c, '     = ' + fmt(v.hx, 3) + ' + ' + fmt(S.vs, 1) + ' = ' + fmt(v.x, 2) + ' m/s',
          x, y, { color: K.BLUE, size: 12, align: 'left' }); y += L + 6;
    label(c, 'y:  V H/Gy = rω sin ' + fmt(90 - S.th, 0) + '° + 0',
          x, y, { color: K.INK, size: 11.5, align: 'left' }); y += L;
    label(c, '     = ' + fmt(v.y, 3) + ' m/s', x, y, { color: K.BLUE, size: 12, align: 'left' });
    y += L + 10;
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, y - 10); c.lineTo(x0 + w - 14, y - 10); c.stroke(); c.restore();
    label(c, 'V H/G = ' + fmt(v.m, 2) + ' m/s   at   ' + fmt(v.d, 1) + '°',
          x, y + 4, { color: K.ACC, size: 14, align: 'left' });
  }

  function draw() {
    var W = ax.W, H = ax.H, v = vals();
    ax.clear();
    if (port) { figure(0, 0, W, H * 0.52); board(0, H * 0.52, W, H * 0.48); }
    else { figure(0, 0, W * 0.56, H); board(W * 0.56, 0, W * 0.44, H); }
    out.innerHTML = 'V<sub>H/G</sub> = <b>' + fmt(v.m, 2) + ' m/s</b> at <b>' + fmt(v.d, 1) +
      '°</b> above the horizontal. Take V<sub>S/G</sub> to zero and you are back in angular ' +
      'kinematics: <b>' + fmt(v.t, 2) + ' m/s</b> at <b>' + fmt(90 - S.th, 0) + '°</b>.';
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  slider(g2, 'Radial distance r', 0.3, 0.9, 0.01, S.r,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { S.r = v; draw(); });
  slider(g2, 'Segment angle θ', 0, 90, 1, S.th,
    function (v) { return fmt(v, 0) + '°'; }, function (v) { S.th = v; draw(); });
  slider(g2, 'Angular velocity ω', 0, 12, 0.1, S.w,
    function (v) { return fmt(v, 1) + ' rad/s'; }, function (v) { S.w = v; draw(); });
  slider(g2, 'Shoulder V<sub>S/G</sub>', 0, 6, 0.1, S.vs,
    function (v) { return fmt(v, 1) + ' m/s'; }, function (v) { S.vs = v; draw(); });

  draw();
  window.addEventListener('ephe341-theme', draw);
});

/* ======================================================================
   7. CHAIN — V_A/G = V_A/B + V_B/C + V_C/G
   Two rotating segments on a translating base, with the three terms
   stacked tip to tail so the sum is visible as a path.
   ====================================================================== */
D.register('chain', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { th1: 70, th2: 35, w1: 3.0, w2: 4.0, r1: 0.45, r2: 0.40, vc: 1.5 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1020, h: port ? 490 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  function vals() {
    var a1 = S.th1 * DEG, a2 = S.th2 * DEG;
    /* B is r1 from C at a1; A is r2 from B at a2 */
    var bcx = Math.cos(a1) * S.r1, bcy = Math.sin(a1) * S.r1;
    var abx = Math.cos(a2) * S.r2, aby = Math.sin(a2) * S.r2;
    /* tangential velocities: omega cross r, +y up */
    var vbc = [-S.w1 * bcy, S.w1 * bcx];
    var vab = [-S.w2 * aby, S.w2 * abx];
    var vcg = [S.vc, 0];
    return { bcx: bcx, bcy: bcy, abx: abx, aby: aby, vbc: vbc, vab: vab, vcg: vcg,
             gx: vcg[0] + vbc[0] + vab[0], gy: vcg[1] + vbc[1] + vab[1] };
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H, v = vals();
    ax.clear();
    var mag = Math.hypot(v.gx, v.gy);
    /* The vector scale is tied to the limb scale so the three terms always read
       as a chain of comparable size next to the linkage, whatever the fit does. */
    var PX = port ? 190 : 250;
    function layout(PX) {
      var VS = PX * 0.36;
      var B = [v.bcx * PX, -v.bcy * PX];
      var A = [B[0] + v.abx * PX, B[1] - v.aby * PX];
      var q1 = [A[0] + v.vcg[0] * VS, A[1] - v.vcg[1] * VS];
      var q2 = [q1[0] + v.vbc[0] * VS, q1[1] - v.vbc[1] * VS];
      var q3 = [q2[0] + v.vab[0] * VS, q2[1] - v.vab[1] * VS];
      var xs = [0, B[0], A[0], q1[0], q2[0], q3[0]], ys = [0, B[1], A[1], q1[1], q2[1], q3[1]];
      return { B: B, A: A, q1: q1, q2: q2, q3: q3, VS: VS,
               x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs),
               y0: Math.min.apply(null, ys), y1: Math.max.apply(null, ys) };
    }
    var L = layout(PX);
    /* the caption block at the foot, plus the 26 px the ground line sits below C */
    var botR = (port ? 62 : 58) + 26;
    var availW = W * (port ? 0.94 : 0.88) - 30, availH = H - botR - 26;
    var k = Math.min(availW / Math.max(1, L.x1 - L.x0), availH / Math.max(1, L.y1 - L.y0));
    PX = Math.max(90, Math.min(PX * Math.max(0.35, Math.min(k, 2.4)), port ? 300 : 420));
    L = layout(PX);
    var cx = W * 0.47 - (L.x0 + L.x1) / 2;
    var cy = (H - botR) / 2 - (L.y0 + L.y1) / 2;
    cy = Math.min(cy, H - botR - 2 - L.y1);        /* keep the ground off the caption */
    var bx = cx + L.B[0], by = cy + L.B[1];
    var axp = cx + L.A[0], ayp = cy + L.A[1];

    /* ground */
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .5; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(Math.max(16, cx - 150), cy + 26);
    c.lineTo(Math.min(W - 16, cx + 190), cy + 26); c.stroke(); c.restore();

    /* segments */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 4.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(bx, by); c.lineTo(axp, ayp); c.stroke(); c.restore();
    [[cx, cy, 'C'], [bx, by, 'B'], [axp, ayp, 'A']].forEach(function (p, i) {
      c.save();
      c.fillStyle = i === 2 ? K.ACC : K.PLATE; c.strokeStyle = K.INK; c.lineWidth = 2;
      c.beginPath(); c.arc(p[0], p[1], i === 2 ? 6.5 : 6, 0, 7); c.fill();
      if (i !== 2) c.stroke();
      c.restore();
      label(c, p[2], p[0] - 16, p[1] + (i === 0 ? 16 : -14), { color: K.INK, size: 12.5 });
    });

    /* the three terms, tip to tail from A */
    var p0 = [axp, ayp];
    var p1 = [cx + L.q1[0], cy + L.q1[1]];
    var p2 = [cx + L.q2[0], cy + L.q2[1]];
    var p3 = [cx + L.q3[0], cy + L.q3[1]];
    arrow(c, p0[0], p0[1], p1[0], p1[1], { color: K.GRN, width: 3, head: 11 });
    arrow(c, p1[0], p1[1], p2[0], p2[1], { color: K.VIO, width: 3, head: 11 });
    arrow(c, p2[0], p2[1], p3[0], p3[1], { color: K.BLUE, width: 3, head: 11 });
    arrow(c, p0[0], p0[1], p3[0], p3[1], { color: K.ACC, width: 3.6, head: 14 });

    key(c, W - (port ? 206 : 232), 12,
        [[K.GRN, 'V C/G = ' + fmt(Math.hypot(v.vcg[0], v.vcg[1]), 2)],
         [K.VIO, 'V B/C = ω₁r₁ = ' + fmt(Math.hypot(v.vbc[0], v.vbc[1]), 2)],
         [K.BLUE, 'V A/B = ω₂r₂ = ' + fmt(Math.hypot(v.vab[0], v.vab[1]), 2)],
         [K.ACC, 'V A/G = ' + fmt(mag, 2) + ' m/s']], { size: 11 });

    var lx = W * 0.5, yb = H - (port ? 20 : 22);
    label(c, 'V A/G = V A/B + V B/C + V C/G', lx, yb - 24, { color: K.INK, size: 13 });
    label(c, fmt(mag, 2) + ' m/s at ' + fmt(Math.atan2(v.gy, v.gx) / DEG, 1) + '°  —  ' +
             fmt(mag / Math.max(S.vc, 0.01), 1) + '× the speed of the base',
          lx, yb, { color: K.ACC, size: 12.5 });

    out.innerHTML = 'The base moves at <b>' + fmt(S.vc, 1) + ' m/s</b>; each segment adds its own ωr — <b>' +
      fmt(Math.hypot(v.vbc[0], v.vbc[1]), 2) + '</b> and <b>' + fmt(Math.hypot(v.vab[0], v.vab[1]), 2) +
      ' m/s</b> — and the tip ends up at <b>' + fmt(mag, 2) + ' m/s</b>, <b>' +
      fmt(mag / Math.max(S.vc, 0.01), 1) + '×</b> the base. Make ω₂ negative and watch it fall.';
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  slider(g2, 'Angle of C→B', 10, 150, 1, S.th1,
    function (v) { return fmt(v, 0) + '°'; }, function (v) { S.th1 = v; draw(); });
  slider(g2, 'Angle of B→A', -60, 140, 1, S.th2,
    function (v) { return num(v, 0) + '°'; }, function (v) { S.th2 = v; draw(); });
  slider(g2, 'ω₁ (segment C→B)', -8, 8, 0.1, S.w1,
    function (v) { return num(v, 1) + ' rad/s'; }, function (v) { S.w1 = v; draw(); });
  slider(g2, 'ω₂ (segment B→A)', -8, 8, 0.1, S.w2,
    function (v) { return num(v, 1) + ' rad/s'; }, function (v) { S.w2 = v; draw(); });

  draw();
  window.addEventListener('ephe341-theme', draw);
});


/* ======================================================================
   8. GAIT — the chain on a measured stride
   SUSU-30, Walking1-2, 90 Hz motion capture, one right-heel-strike to
   right-heel-strike stride at 1.35 m/s. The three terms of
   V_foot/G = V_foot/knee + V_knee/hip + V_hip/G are computed from the
   measured joint positions, and checked against the measured foot
   velocity — they agree to about 3 % of the peak.
   ====================================================================== */
var GAIT = {"sub":"SUSU-30","trial":"Walking1-2","fs":90.0,"n":72,"stride_s":1.0778,"speed":1.348,"thigh":0.4942,"shank":0.4222,"hip":[[0.8395,0.9519],[0.8627,0.9506],[0.8862,0.9506],[0.9096,0.9516],[0.9323,0.9534],[0.9536,0.9554],[0.9735,0.9574],[0.992,0.9596],[1.0099,0.9617],[1.0277,0.9639],[1.0458,0.9661],[1.0641,0.9683],[1.0823,0.9706],[1.1002,0.973],[1.1177,0.9756],[1.1349,0.9785],[1.1521,0.9814],[1.1696,0.9842],[1.1873,0.9864],[1.205,0.9878],[1.2227,0.9884],[1.2401,0.9881],[1.2573,0.9873],[1.2744,0.9861],[1.2918,0.9847],[1.3094,0.9831],[1.3274,0.9812],[1.346,0.9789],[1.365,0.9763],[1.3845,0.9734],[1.4045,0.9704],[1.4248,0.9673],[1.4454,0.9644],[1.466,0.9615],[1.4869,0.9588],[1.5085,0.9563],[1.5309,0.9539],[1.5545,0.9517],[1.5791,0.9498],[1.6043,0.9483],[1.6295,0.9472],[1.6541,0.9466],[1.678,0.9466],[1.7011,0.9471],[1.7238,0.948],[1.746,0.9492],[1.7678,0.9506],[1.7888,0.9523],[1.809,0.9544],[1.8285,0.9572],[1.8475,0.9606],[1.8665,0.9645],[1.8858,0.9687],[1.9055,0.9727],[1.9253,0.9763],[1.9449,0.9794],[1.964,0.982],[1.9827,0.9839],[2.0013,0.9854],[2.02,0.9862],[2.039,0.9863],[2.0583,0.9856],[2.0776,0.9843],[2.097,0.9824],[2.1166,0.9802],[2.1367,0.9777],[2.1576,0.9748],[2.1793,0.9714],[2.2015,0.9674],[2.2241,0.963],[2.2467,0.9586],[2.2693,0.9547]],"knee":[[0.9864,0.4952],[1.0037,0.4922],[1.0217,0.49],[1.0399,0.4885],[1.0581,0.488],[1.0756,0.4883],[1.0919,0.4891],[1.1067,0.4899],[1.1195,0.4903],[1.1304,0.4901],[1.1393,0.4893],[1.1468,0.4883],[1.1531,0.4876],[1.1587,0.4875],[1.1638,0.488],[1.1684,0.4889],[1.1727,0.4899],[1.1767,0.4908],[1.1807,0.4916],[1.1848,0.4923],[1.1893,0.4929],[1.1944,0.4934],[1.2002,0.4938],[1.2067,0.4938],[1.2138,0.4936],[1.2214,0.4933],[1.2292,0.4928],[1.2372,0.4923],[1.2454,0.4918],[1.2542,0.4911],[1.2637,0.4902],[1.2744,0.4891],[1.2865,0.488],[1.2998,0.4868],[1.3144,0.4858],[1.3302,0.4847],[1.3473,0.4835],[1.3664,0.4818],[1.3882,0.4793],[1.4135,0.4758],[1.4427,0.4713],[1.476,0.4662],[1.5126,0.4607],[1.552,0.4555],[1.5932,0.4511],[1.6354,0.4479],[1.6783,0.4465],[1.7217,0.4469],[1.7652,0.4493],[1.8088,0.4533],[1.8521,0.4589],[1.8948,0.4656],[1.9367,0.4733],[1.9776,0.4817],[2.0174,0.4906],[2.0559,0.4996],[2.093,0.5084],[2.1284,0.5167],[2.162,0.5242],[2.1935,0.5308],[2.2229,0.5364],[2.25,0.5407],[2.2748,0.5433],[2.2971,0.544],[2.3168,0.5422],[2.3338,0.5381],[2.3487,0.5319],[2.362,0.5245],[2.3746,0.5169],[2.3874,0.5099],[2.4011,0.5039],[2.4161,0.4991]],"ankle":[[1.0424,0.0858],[1.0544,0.0824],[1.0608,0.0802],[1.0642,0.0796],[1.0663,0.0804],[1.0681,0.0817],[1.0696,0.0827],[1.0705,0.0829],[1.0709,0.0825],[1.071,0.082],[1.0712,0.082],[1.0717,0.0826],[1.0725,0.0836],[1.0733,0.0846],[1.074,0.0853],[1.0743,0.0856],[1.0745,0.0859],[1.0748,0.0863],[1.0753,0.0871],[1.0761,0.0882],[1.0772,0.0894],[1.0783,0.0907],[1.0795,0.092],[1.0806,0.0936],[1.082,0.0954],[1.0834,0.0974],[1.085,0.0995],[1.0866,0.1014],[1.088,0.1031],[1.0894,0.1047],[1.0909,0.1065],[1.0928,0.1087],[1.0951,0.1114],[1.098,0.1145],[1.1015,0.1181],[1.1056,0.1221],[1.1107,0.1266],[1.117,0.1318],[1.1251,0.1378],[1.1355,0.1448],[1.1488,0.1531],[1.1656,0.1629],[1.1862,0.1745],[1.2109,0.1881],[1.2396,0.2036],[1.2717,0.2202],[1.3067,0.2368],[1.3438,0.2523],[1.3823,0.2654],[1.4221,0.2756],[1.4634,0.2827],[1.5062,0.2869],[1.5508,0.2884],[1.5969,0.2871],[1.6438,0.2829],[1.6911,0.2759],[1.7386,0.2662],[1.7866,0.2545],[1.8357,0.2413],[1.8864,0.227],[1.939,0.2115],[1.9934,0.1947],[2.0492,0.1765],[2.106,0.1577],[2.1639,0.1394],[2.2226,0.1234],[2.2819,0.1111],[2.3404,0.1029],[2.3958,0.0981],[2.4451,0.0952],[2.4858,0.0926],[2.5163,0.0895]],"toe":[[1.264,0.1125],[1.276,0.0905],[1.2822,0.069],[1.2852,0.0536],[1.287,0.0463],[1.2885,0.0454],[1.2898,0.0469],[1.2907,0.0474],[1.291,0.0456],[1.2909,0.0423],[1.2907,0.0396],[1.2909,0.0389],[1.2915,0.0401],[1.2921,0.0417],[1.2924,0.0422],[1.2922,0.0412],[1.2919,0.0394],[1.2916,0.0382],[1.2917,0.0383],[1.2921,0.0394],[1.2926,0.0406],[1.2927,0.0405],[1.2927,0.0392],[1.2927,0.0373],[1.2931,0.036],[1.2939,0.0358],[1.2948,0.0365],[1.2954,0.0371],[1.2953,0.0368],[1.2947,0.0356],[1.294,0.0342],[1.2938,0.0335],[1.2944,0.0339],[1.2954,0.0349],[1.2961,0.0354],[1.296,0.035],[1.2951,0.0337],[1.2941,0.0327],[1.294,0.0327],[1.2955,0.0337],[1.2986,0.0345],[1.3025,0.0334],[1.3065,0.0296],[1.3111,0.0241],[1.3178,0.0193],[1.3292,0.0183],[1.3481,0.023],[1.3762,0.0327],[1.4134,0.0453],[1.4581,0.0574],[1.5078,0.0669],[1.5603,0.073],[1.6144,0.0766],[1.6699,0.0787],[1.7272,0.0801],[1.7868,0.0804],[1.8485,0.0791],[1.9117,0.0763],[1.9759,0.0726],[2.0406,0.0695],[2.1058,0.0678],[2.1716,0.0674],[2.2381,0.0675],[2.305,0.0675],[2.3715,0.0683],[2.4368,0.072],[2.4999,0.0807],[2.5595,0.0948],[2.6141,0.1119],[2.6619,0.1267],[2.701,0.1334],[2.7306,0.1284]],"heel":[[0.9895,0.0133],[1.0001,0.0147],[1.0036,0.0167],[1.0038,0.0188],[1.0034,0.0204],[1.0038,0.0213],[1.0049,0.0217],[1.0061,0.0218],[1.0066,0.0219],[1.0065,0.0224],[1.006,0.0231],[1.0056,0.0239],[1.0056,0.0248],[1.0061,0.0255],[1.0067,0.0262],[1.0071,0.027],[1.0072,0.0278],[1.0072,0.0289],[1.0074,0.0301],[1.0079,0.0316],[1.0088,0.0332],[1.0099,0.0351],[1.0109,0.0374],[1.0118,0.0398],[1.0126,0.0424],[1.0132,0.045],[1.014,0.0476],[1.0149,0.0503],[1.016,0.053],[1.017,0.0558],[1.0179,0.0589],[1.0188,0.0625],[1.0198,0.0666],[1.0212,0.0714],[1.0233,0.0772],[1.026,0.084],[1.0297,0.0919],[1.0343,0.101],[1.0405,0.1118],[1.049,0.1248],[1.0611,0.1409],[1.0782,0.1605],[1.1011,0.1836],[1.1301,0.2093],[1.1645,0.2356],[1.2025,0.2605],[1.2421,0.2819],[1.2817,0.2987],[1.3204,0.3107],[1.3583,0.3185],[1.3964,0.3229],[1.4358,0.3246],[1.4771,0.3236],[1.5202,0.3193],[1.5644,0.3113],[1.6092,0.2993],[1.6544,0.2837],[1.7005,0.2652],[1.7484,0.2444],[1.799,0.2219],[1.8528,0.1977],[1.9092,0.1722],[1.9678,0.1456],[2.0279,0.1189],[2.0893,0.0934],[2.1523,0.0705],[2.2166,0.0513],[2.281,0.0364],[2.3427,0.0257],[2.3983,0.0187],[2.4439,0.0147],[2.4774,0.0131]],"pelv":[[0.7529,1.0334],[0.7763,1.0301],[0.8002,1.0283],[0.8241,1.028],[0.8477,1.0287],[0.8703,1.0301],[0.8918,1.0314],[0.9121,1.0326],[0.9315,1.0335],[0.9505,1.0345],[0.9692,1.036],[0.988,1.0381],[1.0066,1.0408],[1.0252,1.0442],[1.0435,1.048],[1.0618,1.0519],[1.08,1.0557],[1.0983,1.0592],[1.1167,1.0621],[1.1349,1.0642],[1.1531,1.0654],[1.1711,1.0659],[1.189,1.0657],[1.2069,1.065],[1.2251,1.0639],[1.2434,1.0625],[1.2619,1.0606],[1.2808,1.0584],[1.3001,1.0557],[1.32,1.0526],[1.3406,1.0491],[1.3617,1.0454],[1.3831,1.0417],[1.4045,1.0381],[1.426,1.0347],[1.4475,1.0319],[1.4695,1.0296],[1.4924,1.028],[1.5163,1.027],[1.541,1.0265],[1.5659,1.0265],[1.5904,1.0268],[1.6139,1.0276],[1.6364,1.0289],[1.6578,1.0307],[1.6786,1.0327],[1.6989,1.0348],[1.7188,1.0369],[1.7384,1.039],[1.7576,1.0412],[1.7764,1.0437],[1.795,1.0467],[1.8135,1.0502],[1.832,1.0538],[1.8507,1.0572],[1.8694,1.0599],[1.8879,1.0619],[1.9063,1.0631],[1.9245,1.0637],[1.9427,1.064],[1.9609,1.0638],[1.9793,1.0632],[1.9979,1.0621],[2.0168,1.0606],[2.0361,1.0588],[2.0558,1.0569],[2.0761,1.055],[2.097,1.0528],[2.1183,1.0501],[2.14,1.0466],[2.1621,1.0423],[2.1845,1.0377]],"vhip":[[1.5362,-0.1392],[1.5631,-0.0432],[1.5736,0.0402],[1.5462,0.0974],[1.4751,0.1271],[1.3756,0.1377],[1.278,0.1403],[1.2111,0.1423],[1.1871,0.1454],[1.1968,0.1475],[1.2167,0.1476],[1.2239,0.148],[1.2095,0.1534],[1.1811,0.1665],[1.1555,0.1843],[1.1465,0.1976],[1.1559,0.1954],[1.1739,0.1704],[1.1864,0.1238],[1.185,0.0651],[1.1712,0.0075],[1.1545,-0.0382],[1.1455,-0.0683],[1.1498,-0.0867],[1.1666,-0.101],[1.1915,-0.1177],[1.2209,-0.1392],[1.2534,-0.163],[1.2879,-0.1842],[1.3214,-0.1986],[1.3486,-0.2045],[1.3657,-0.2029],[1.3749,-0.1959],[1.3862,-0.1862],[1.4135,-0.1753],[1.4654,-0.1639],[1.538,-0.1513],[1.6139,-0.1363],[1.6696,-0.1165],[1.688,-0.09],[1.667,-0.0565],[1.6206,-0.0187],[1.5695,0.0181],[1.5287,0.0486],[1.4995,0.0703],[1.4715,0.0856],[1.4323,0.1017],[1.379,0.1262],[1.3221,0.1623],[1.2796,0.2061],[1.2652,0.2471],[1.2786,0.2733],[1.3046,0.2771],[1.3224,0.2587],[1.3181,0.2258],[1.2932,0.1878],[1.2624,0.151],[1.243,0.1154],[1.2436,0.0766],[1.2597,0.0312],[1.2783,-0.0197],[1.2892,-0.0693],[1.2927,-0.1098],[1.2997,-0.1378],[1.3231,-0.1573],[1.367,-0.178],[1.4223,-0.208],[1.4717,-0.2471],[1.5011,-0.2843],[1.5092,-0.3017],[1.5083,-0.2838],[1.5148,-0.2263]],"vkh":[[-0.2795,-0.0899],[-0.2952,-0.0908],[-0.3324,-0.0978],[-0.3474,-0.0978],[-0.3211,-0.0868],[-0.2723,-0.0711],[-0.2456,-0.0621],[-0.2813,-0.0687],[-0.3892,-0.0905],[-0.5419,-0.1174],[-0.6908,-0.1355],[-0.7935,-0.1367],[-0.8358,-0.1225],[-0.8362,-0.1007],[-0.8292,-0.0783],[-0.8416,-0.0576],[-0.8764,-0.0367],[-0.9143,-0.0133],[-0.9292,0.0123],[-0.9062,0.0369],[-0.8505,0.0572],[-0.7824,0.0722],[-0.7242,0.0837],[-0.6888,0.0948],[-0.6767,0.1074],[-0.6807,0.1223],[-0.6921,0.1393],[-0.7034,0.1573],[-0.7073,0.1745],[-0.6947,0.1877],[-0.6578,0.1928],[-0.5952,0.1872],[-0.5168,0.1723],[-0.4411,0.1544],[-0.3842,0.1401],[-0.3461,0.1308],[-0.3045,0.1189],[-0.2227,0.0891],[-0.0683,0.0277],[0.1666,-0.0673],[0.4568,-0.1792],[0.7525,-0.279],[1.0026,-0.3411],[1.1784,-0.3575],[1.2857,-0.338],[1.3568,-0.2994],[1.4257,-0.253],[1.5056,-0.2001],[1.5813,-0.1371],[1.6238,-0.0634],[1.6127,0.0148],[1.552,0.0881],[1.467,0.1506],[1.3867,0.2035],[1.3238,0.2508],[1.2682,0.2934],[1.1966,0.3259],[1.0909,0.3402],[0.9515,0.3315],[0.7945,0.3026],[0.6379,0.2606],[0.486,0.2094],[0.3253,0.1455],[0.1364,0.0622],[-0.087,-0.0398],[-0.3237,-0.1452],[-0.5275,-0.2276],[-0.6466,-0.2643],[-0.6528,-0.2507],[-0.5625,-0.2027],[-0.431,-0.1464],[-0.3235,-0.1042]],"vak":[[-0.128,-0.0175],[-0.6522,-0.0808],[-0.9542,-0.0912],[-1.0632,-0.063],[-1.0523,-0.0212],[-0.9952,0.0184],[-0.9327,0.0514],[-0.8673,0.0771],[-0.7821,0.0932],[-0.6665,0.0969],[-0.5323,0.0891],[-0.4085,0.0756],[-0.3226,0.0644],[-0.2828,0.0599],[-0.2747,0.0612],[-0.2725,0.0636],[-0.257,0.0625],[-0.2273,0.0573],[-0.2004,0.0522],[-0.1973,0.0531],[-0.228,0.0634],[-0.284,0.0819],[-0.344,0.1034],[-0.3873,0.122],[-0.406,0.1344],[-0.408,0.1422],[-0.4102,0.1504],[-0.4267,0.1644],[-0.4613,0.1868],[-0.5079,0.2166],[-0.556,0.2504],[-0.5984,0.2857],[-0.634,0.3222],[-0.6666,0.3614],[-0.7007,0.4058],[-0.7395,0.4578],[-0.7849,0.5204],[-0.8387,0.5976],[-0.9017,0.6949],[-0.9703,0.8151],[-1.0326,0.9538],[-1.0695,1.0945],[-1.0615,1.2106],[-0.9978,1.273],[-0.8832,1.2619],[-0.7357,1.1749],[-0.5774,1.0236],[-0.4242,0.8235],[-0.2812,0.5856],[-0.1448,0.315],[-0.0088,0.0195],[0.1303,-0.2834],[0.2712,-0.5659],[0.4097,-0.8016],[0.544,-0.9786],[0.6784,-1.1062],[0.8246,-1.2063],[0.9959,-1.2981],[1.1996,-1.3834],[1.4305,-1.4458],[1.674,-1.4626],[1.9172,-1.4219],[2.1585,-1.3276],[2.4064,-1.1901],[2.6617,-1.0102],[2.8927,-0.7757],[3.0258,-0.4801],[2.9686,-0.152],[2.6581,0.1345],[2.098,0.2921],[1.364,0.2809],[0.5781,0.1414]],"vank":[[1.0577,-0.2474],[0.5849,-0.1955],[0.2985,-0.0931],[0.1678,0.0142],[0.1268,0.0796],[0.1109,0.0832],[0.0842,0.0407],[0.0453,-0.0102],[0.013,-0.0343],[0.0041,-0.0195],[0.0195,0.02],[0.044,0.057],[0.0584,0.0702],[0.0532,0.0574],[0.0338,0.0332],[0.0154,0.0173],[0.0112,0.0206],[0.024,0.0398],[0.0458,0.0625],[0.065,0.078],[0.0746,0.0841],[0.0762,0.0875],[0.077,0.0962],[0.0828,0.1121],[0.0935,0.1292],[0.1032,0.1381],[0.106,0.1341],[0.1011,0.1212],[0.0944,0.1104],[0.0952,0.1121],[0.1096,0.1303],[0.1375,0.1603],[0.1735,0.1936],[0.2123,0.2242],[0.2537,0.2524],[0.3041,0.2834],[0.3744,0.3227],[0.4747,0.3729],[0.6116,0.4344],[0.7872,0.5084],[1.0,0.5994],[1.2452,0.7117],[1.5124,0.8427],[1.7846,0.9758],[2.0388,1.0811],[2.2527,1.1249],[2.4145,1.0854],[2.5291,0.9635],[2.6172,0.7829],[2.7046,0.5781],[2.8073,0.3769],[2.9229,0.1886],[3.032,0.0061],[3.1117,-0.1819],[3.1526,-0.3767],[3.1673,-0.5639],[3.1849,-0.722],[3.2345,-0.8383],[3.3275,-0.9201],[3.4512,-0.9913],[3.578,-1.0748],[3.6839,-1.171],[3.7638,-1.2493],[3.8302,-1.2599],[3.8961,-1.1627],[3.9518,-0.9551],[3.9533,-0.6823],[3.833,-0.42],[3.5315,-0.2387],[3.0329,-0.1687],[2.3846,-0.1874],[1.6872,-0.2345]],"w1":[-0.612,-0.644,-0.7217,-0.7502,-0.6899,-0.583,-0.5244,-0.599,-0.8256,-1.1436,-1.4488,-1.6531,-1.7308,-1.7227,-1.7007,-1.7191,-1.783,-1.8532,-1.878,-1.8288,-1.7167,-1.5817,-1.4674,-1.3992,-1.378,-1.3896,-1.4171,-1.4455,-1.4596,-1.4403,-1.3699,-1.2446,-1.0848,-0.9293,-0.8122,-0.7339,-0.6474,-0.4739,-0.1452,0.3526,0.9599,1.5664,2.0635,2.3969,2.5872,2.7067,2.8283,2.9793,3.1303,3.2228,3.2144,3.1108,2.9615,2.8241,2.7251,2.643,2.5268,2.3348,2.0632,1.7447,1.4179,1.0923,0.7378,0.3111,-0.1986,-0.7364,-1.191,-1.4468,-1.4491,-1.2414,-0.9479,-0.71],"w2":[-0.3126,-1.5913,-2.3285,-2.6,-2.5818,-2.4477,-2.2947,-2.1305,-1.9175,-1.6334,-1.307,-1.0068,-0.7984,-0.7018,-0.682,-0.6758,-0.6361,-0.562,-0.4953,-0.4881,-0.5649,-0.7051,-0.8563,-0.9676,-1.0194,-1.0308,-1.0429,-1.0915,-1.187,-1.3146,-1.4492,-1.5729,-1.6835,-1.7903,-1.9056,-2.0389,-2.1989,-2.3961,-2.6407,-2.932,-3.2449,-3.5266,-3.7087,-3.7319,-3.5688,-3.2306,-2.7544,-2.1793,-1.5292,-0.8147,-0.0501,0.7293,1.4667,2.1054,2.6197,3.0325,3.4043,3.7977,4.2396,4.7078,5.1532,5.5418,5.8848,6.2292,6.6073,6.9761,7.1905,7.0411,6.3471,5.0597,3.3166,1.4113],"closure_mean":0.1108,"closure_max":0.2516,"foot_peak":4.066};

D.register('gait', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var N = GAIT.n;
  var S = { show: 'all' };
  var ph = 0.22, playing = false, last = 0, raf = null;

  var ax = new Axes(u.cv, { w: port ? 460 : 1120, h: port ? 520 : 410,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  function at(arr, p) {
    var uu = p * N, k = Math.floor(uu), f = uu - k;
    var A = arr[k % N], B = arr[(k + 1) % N];
    if (A.length === undefined) return A * (1 - f) + B * f;
    return [A[0] * (1 - f) + B[0] * f, A[1] * (1 - f) + B[1] * f];
  }
  function spd(arr, p) { var v = at(arr, p); return Math.hypot(v[0], v[1]); }

  /* ---- the figure: hip, knee, ankle with the three arrows ---- */
  function stick(x0, y0, w, h) {
    var c = ax.c, K = C();
    var hip = at(GAIT.hip, ph), kne = at(GAIT.knee, ph), ank = at(GAIT.ankle, ph);
    var toe = at(GAIT.toe, ph), hee = at(GAIT.heel, ph);
    var zmax = 1.15;
    var PX = Math.min((h - 72) / zmax, (w - 90) / 1.1);
    /* follow the hip so the leg stays centred */
    var ox = x0 + w * 0.34 - hip[0] * PX, oy = y0 + h - 34;
    function X(p) { return ox + p[0] * PX; }
    function Y(p) { return oy - p[1] * PX; }
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .5; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x0 + 12, oy); c.lineTo(x0 + w - 12, oy); c.stroke(); c.restore();
    /* pelvis stub */
    var pel = at(GAIT.pelv, ph);
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 4; c.lineCap = 'round'; c.globalAlpha = .55;
    c.beginPath(); c.moveTo(X(pel), Y(pel) - 36); c.lineTo(X(hip), Y(hip)); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(X(hip), Y(hip)); c.lineTo(X(kne), Y(kne)); c.lineTo(X(ank), Y(ank));
    c.stroke();
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(X(hee), Y(hee)); c.lineTo(X(toe), Y(toe)); c.stroke();
    c.restore();
    [[hip, 'hip'], [kne, 'knee'], [ank, 'ankle']].forEach(function (p) {
      c.save(); c.fillStyle = K.PLATE; c.strokeStyle = K.INK; c.lineWidth = 2;
      c.beginPath(); c.arc(X(p[0]), Y(p[0]), 5, 0, 7); c.fill(); c.stroke(); c.restore();
    });

    var VS = Math.min(26, (w * 0.40) / 4.2);
    var vh = at(GAIT.vhip, ph), vk = at(GAIT.vkh, ph), va = at(GAIT.vak, ph),
        vt = at(GAIT.vank, ph);
    var p0 = [X(ank), Y(ank)];
    var p1 = [p0[0] + vh[0] * VS, p0[1] - vh[1] * VS];
    var p2 = [p1[0] + vk[0] * VS, p1[1] - vk[1] * VS];
    var p3 = [p2[0] + va[0] * VS, p2[1] - va[1] * VS];
    if (S.show === 'all' || S.show === 'hip') arrow(c, p0[0], p0[1], p1[0], p1[1], { color: K.GRN, width: 2.8, head: 10 });
    if (S.show === 'all') {
      arrow(c, p1[0], p1[1], p2[0], p2[1], { color: K.VIO, width: 2.8, head: 10 });
      arrow(c, p2[0], p2[1], p3[0], p3[1], { color: K.BLUE, width: 2.8, head: 10 });
    }
    arrow(c, p0[0], p0[1], p0[0] + vt[0] * VS, p0[1] - vt[1] * VS,
          { color: K.ACC, width: 3.4, head: 13 });
    label(c, GAIT.sub + ' · ' + fmt(GAIT.speed, 2) + ' m/s · ' +
             fmt(60 / GAIT.stride_s * 2, 0) + ' steps/min',
          x0 + w / 2, y0 + 14, { color: K.INK, size: 12 });
    label(c, fmt(ph * 100, 0) + ' % of the stride', x0 + w / 2, y0 + h - 10,
          { color: K.MUT, size: 11 });
  }

  /* ---- the speed traces ---- */
  function trace(x0, y0, w, h) {
    var c = ax.c, K = C(), i;
    var PL = 50, PB = 30, PT = 26, PR = 12;
    var hi = 0;
    for (i = 0; i < N; i++) hi = Math.max(hi, Math.hypot(GAIT.vank[i][0], GAIT.vank[i][1]));
    hi *= 1.12;
    function X(p) { return x0 + PL + p * (w - PL - PR); }
    function Y(v) { return y0 + h - PB - v / hi * (h - PB - PT); }
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + PL, y0 + PT); c.lineTo(x0 + PL, y0 + h - PB);
    c.lineTo(x0 + w - PR, y0 + h - PB); c.stroke(); c.restore();
    axisTicks(0, hi).forEach(function (v) {
      if (v < 0 || v > hi) return;
      label(c, fmt(v, 0), x0 + PL - 6, Y(v), { color: K.MUT, size: 10.5, align: 'right' });
    });
    [0, 25, 50, 75, 100].forEach(function (p) {
      label(c, fmt(p, 0), X(p / 100), y0 + h - PB + 11, { color: K.MUT, size: 10, align: 'center' });
    });
    function line(arr, col, wid) {
      c.save(); c.strokeStyle = col; c.lineWidth = wid; c.beginPath();
      for (i = 0; i <= N; i++) {
        var k = i % N, s = Math.hypot(arr[k][0], arr[k][1]);
        var px = X(i / N), py = Y(s);
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke(); c.restore();
    }
    line(GAIT.vhip, K.GRN, 1.9);
    line(GAIT.vank, K.ACC, 2.8);
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(X(ph), y0 + PT); c.lineTo(X(ph), y0 + h - PB); c.stroke();
    c.fillStyle = K.ACC;
    c.beginPath(); c.arc(X(ph), Y(spd(GAIT.vank, ph)), 4, 0, 7); c.fill();
    c.fillStyle = K.GRN;
    c.beginPath(); c.arc(X(ph), Y(spd(GAIT.vhip, ph)), 3.4, 0, 7); c.fill();
    c.restore();
    label(c, 'Speed over the ground (m/s)', x0 + PL, y0 + 12, { color: K.INK, size: 12, align: 'left' });
    var kx = x0 + PL + 190;
    [['foot', K.ACC], ['hip', K.GRN]].forEach(function (q) {
      c.save(); c.fillStyle = q[1]; c.fillRect(kx, y0 + 10, 13, 3); c.restore();
      label(c, q[0], kx + 17, y0 + 12, { color: q[1], size: 11, align: 'left' });
      c.save(); c.font = '600 11px ui-sans-serif,system-ui,sans-serif';
      kx += 17 + c.measureText(q[0]).width + 16; c.restore();
    });
  }

  function draw() {
    var W = ax.W, H = ax.H;
    ax.clear();
    if (port) { stick(0, 0, W, H * 0.56); trace(0, H * 0.56, W, H * 0.44); }
    else { stick(0, 0, W * 0.50, H); trace(W * 0.50, 0, W * 0.50, H); }
    var vt = spd(GAIT.vank, ph), vh = spd(GAIT.vhip, ph);
    out.innerHTML = 'At <b>' + fmt(ph * 100, 0) + ' %</b> of the stride the hip is doing <b>' +
      fmt(vh, 2) + ' m/s</b> and the foot <b>' + fmt(vt, 2) + ' m/s</b>. Over the stride the foot ' +
      'ranges from almost nothing on the ground to <b>' + fmt(GAIT.foot_peak, 2) +
      ' m/s</b> in swing — <b>' + fmt(GAIT.foot_peak / GAIT.speed, 1) +
      '×</b> walking speed.<span style="opacity:.72">  ·  The three terms reproduce the measured ' +
      'foot velocity to <b>' + fmt(GAIT.closure_mean, 2) + ' m/s</b> on average, about ' +
      fmt(100 * GAIT.closure_mean / GAIT.foot_peak, 0) + ' % of the peak — the residual is the ' +
      'rigid-segment assumption</span>';
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  var sPh = slider(g2, 'Point in the stride', 0, 99, 1, ph * 100,
    function (v) { return fmt(v, 0) + ' %'; }, function (v) { ph = v / 100; draw(); });

  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['all', 'All three terms'], ['hip', 'Hip only']], 'all',
    function (k) { S.show = k; draw(); }));
  var btn = playBtn(row, '▶ Walk');
  btn.setAttribute('data-unsafe', '1');
  function stop() { playing = false; btn.textContent = '▶ Walk'; if (raf) cancelAnimationFrame(raf); raf = null; }
  btn.addEventListener('click', function () {
    if (playing) { stop(); return; }
    playing = true; btn.textContent = '❚❚ Stop'; last = 0; raf = requestAnimationFrame(tick);
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing) stop(); });
  function tick(ts) {
    if (!playing) return;
    if (last) { ph = (ph + (ts - last) / 1000 / GAIT.stride_s * 0.55) % 1; sPh.quiet(ph * 100); }
    last = ts; draw(); raf = requestAnimationFrame(tick);
  }

  draw();
  window.addEventListener('ephe341-theme', draw);
});

D.boot();
})();
