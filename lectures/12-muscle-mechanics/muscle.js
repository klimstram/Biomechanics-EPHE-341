/* ============================================================
   EPHE 341 — Muscle Mechanics
   Interactive figures. Needs deck-core.js. No other dependencies.

   Every curve here is the one the Virtual Muscle Lab uses in lecture 13, so
   the numbers a student reads off these figures are the numbers the app will
   produce. In particular:

     force–velocity curvature          af   = 0.30
     eccentric plateau                       ≈ 1.8 · F0
     activation time constant          tau_a = 10 ms
     deactivation time constant        tau_d = 40 ms
     optimal fibre length              L0    = 0.084 m
     maximum isometric force           F0    = 1871 N
     maximum shortening velocity       vmax  = 10 L0/s
     pennation angle at rest                 = 0.087 rad

   The one deliberate difference is the active force–length curve. VML
   approximates it with a Gaussian; here the default is the piecewise curve
   that falls out of filament overlap, because that is the version that
   explains itself. The Gaussian is available as an overlay so the two can be
   compared directly.
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
   THE MUSCLE MODEL
   One place for every relationship the lecture builds up, so the figures
   cannot drift apart from each other or from the Virtual Muscle Lab.
   ============================================================ */
var M = {
  L0: 0.084,            /* optimal fibre length, m          */
  F0: 1871,             /* maximum isometric force, N       */
  VX: 10,               /* vmax, in optimal lengths/second  */
  AF: 0.30,             /* force-velocity curvature         */
  PENN0: 0.087,         /* pennation at optimal length, rad */
  TAU_A: 10,            /* activation time constant, ms     */
  TAU_D: 40,            /* deactivation time constant, ms   */
  SIGMA: 20             /* specific tension, N per cm^2     */
};

/* --- active force-length, from filament overlap --------------------------
   Lengths are normalised to optimal. The plateau is the region where every
   myosin head has actin to bind to; the descending limb is overlap being
   lost; the ascending limb is thin filaments colliding and the thick
   filament running into the Z disc. */
function flActive(x) {
  if (x <= 0.50 || x >= 1.70) return 0;
  if (x < 0.75) return (x - 0.50) / 0.25 * 0.42;        /* steep ascending  */
  if (x < 1.00) return 0.42 + (x - 0.75) / 0.25 * 0.58; /* shallow ascending*/
  if (x <= 1.20) return 1;                              /* the plateau      */
  return Math.max(0, 1 - (x - 1.20) / 0.50);            /* descending limb  */
}
/* the smooth approximation models actually use, VML's included */
function flGauss(x) { return Math.exp(-((x - 1) * (x - 1)) / 0.5); }

/* --- passive force-length ------------------------------------------------
   Connective tissue takes no load until it is taut, then stiffens fast. */
function flPassive(x) {
  if (x <= 1.0) return 0;
  var e = (x - 1.0) / 0.6;
  return Math.min(1.6, (Math.exp(3.2 * e) - 1) / (Math.exp(3.2) - 1));
}
function flTotal(x) { return flActive(x) + flPassive(x); }

/* --- force-velocity ------------------------------------------------------
   v is normalised to vmax; POSITIVE is shortening, which is the same sign
   convention the Virtual Muscle Lab uses. */
function fvCon(v) { return Math.max(0, (1 - v) / (1 + v / M.AF)); }
function fvEcc(v) { return 1.8 - (0.8 * (1 + v)) / (1 - 7.56 * 0.21 * v); }
function fvOf(v) { return v >= 0 ? fvCon(v) : fvEcc(v); }

/* where the concentric product peaks, computed once */
var FV_PEAK = (function () {
  var best = 0, bv = 0;
  for (var i = 1; i < 2000; i++) { var v = i / 2000, p = fvCon(v) * v; if (p > best) { best = p; bv = v; } }
  return { v: bv, p: best };
})();

/* --- activation dynamics -------------------------------------------------
   First-order, solved exactly so the step size cannot cause an overshoot.
   This is the same integration the Virtual Muscle Lab performs. */
function activate(exc, dtMs, tauA, tauD) {
  var a = new Float64Array(exc.length), i;
  for (i = 1; i < exc.length; i++) {
    var u = exc[i - 1], prev = a[i - 1];
    var tau = u >= prev ? tauA : tauD;
    a[i] = u + (prev - u) * Math.exp(-dtMs / tau);
  }
  return a;
}

/* --- pennation -----------------------------------------------------------
   Fibres pull along their own line; only the component along the tendon
   reaches the bone. The angle grows as the muscle shortens because the
   muscle keeps its thickness. */
function pennAt(x) {
  var w = Math.sin(M.PENN0);                /* thickness, in optimal lengths */
  return Math.asin(Math.min(0.98, w / Math.max(0.35, x)));
}

/* ============================================================
   THE SLIDING FILAMENT

   Drag the sarcomere longer and shorter. Neither filament changes length —
   only the overlap between them does, and the number of myosin heads that
   have actin to bind to is what sets the force. This is the mechanism the
   force–length curve is a plot of.
   ============================================================ */
D.register('sarcomere', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 470 : 420,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var x = 1.0;                       /* sarcomere length, relative to optimal */

  /* real lengths, in micrometres, so the drawing is to scale */
  var THIN = 1.05, THICK = 1.60, BARE = 0.20;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H, i;
    ax.clear();

    var Ls = 2.20 * x;                       /* sarcomere length, microns */
    var PX = (W - 150) / 3.6;                /* pixels per micron */
    var cx = W / 2, cy = H * 0.40;
    var half = Ls / 2 * PX;

    /* Z discs */
    [-1, 1].forEach(function (s) {
      var zx = cx + s * half;
      c.save(); c.strokeStyle = K.INK; c.lineWidth = 4; c.lineCap = 'butt';
      c.beginPath(); c.moveTo(zx, cy - 52); c.lineTo(zx, cy + 52); c.stroke(); c.restore();
      label(c, 'Z', zx, cy - 64, { color: K.MUT, size: 12, align: 'center' });
    });

    /* thin filaments, anchored to each Z disc and pointing inward */
    [-1, 1].forEach(function (s) {
      var zx = cx + s * half;
      [-1, 1].forEach(function (row) {
        var y = cy + row * 30;
        c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 4.5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(zx, y); c.lineTo(zx - s * THIN * PX, y); c.stroke();
        c.restore();
      });
    });

    /* the thick filament sits centred and never moves or changes length */
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - THICK / 2 * PX, cy); c.lineTo(cx + THICK / 2 * PX, cy);
    c.stroke(); c.restore();

    /* myosin heads, drawn only where there is thin filament to reach */
    var olap = Math.max(0, Math.min(THIN, (THIN + THICK / 2) - Ls / 2));
    var heads = 0, bound = 0;
    for (i = 0; i < 26; i++) {
      var t = (i / 25 - 0.5) * (THICK - BARE);
      if (Math.abs(t) < BARE / 2) continue;            /* the bare zone */
      var hx = cx + t * PX, s2 = t > 0 ? 1 : -1;
      var tipFromZ = Math.abs((cx + s2 * half) - hx) / PX;
      var has = tipFromZ <= THIN;
      heads++; if (has) bound++;
      c.save();
      c.strokeStyle = has ? K.GRN : K.MUT;
      c.globalAlpha = has ? 1 : 0.35;
      c.lineWidth = 2.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(hx, cy); c.lineTo(hx + s2 * 5, cy + (i % 2 ? 1 : -1) * 22);
      c.stroke(); c.restore();
    }

    var frac = heads ? bound / heads : 0;

    /* the force this overlap buys, read off the force-length curve */
    var F = flActive(x);
    var bx = W - 112, by0 = H - 110, bh = 170;
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.strokeRect(bx + .5, by0 - bh + .5, 40, bh); c.restore();
    c.save(); c.fillStyle = K.GRN; c.globalAlpha = .75;
    c.fillRect(bx + 1, by0 - bh * F, 39, bh * F); c.restore();
    label(c, fmt(F * 100, 0) + '%', bx + 20, by0 - bh - 16,
          { color: K.GRN, size: 14, align: 'center' });
    label(c, 'of maximum', bx + 20, by0 + 16, { color: K.MUT, size: 11, align: 'center' });

    /* a caption that names the regime rather than leaving it to be inferred */
    var why;
    if (x < 0.75) why = 'thick filament jammed against the Z discs, and thin filaments overlapping each other';
    else if (x < 1.0) why = 'thin filaments from the two ends interfere, so some heads bind nothing useful';
    else if (x <= 1.2) why = 'every myosin head has actin to pull on — this is the plateau';
    else why = 'the filaments are pulling apart, so fewer heads can reach';
    label(c, why, 20, H - 26, { color: K.MUT, size: 12.5, align: 'left' });

    label(c, 'thin (actin)', 20, cy - 30, { color: K.BLUE, size: 12, align: 'left' });
    label(c, 'thick (myosin)', 20, cy, { color: K.ACC, size: 12, align: 'left' });

    out.innerHTML = 'sarcomere <b>' + fmt(Ls, 2) + ' μm</b> (' + fmt(x * 100, 0) +
      '% of optimal) · heads with actin to bind <b>' + fmt(frac * 100, 0) +
      '%</b> · force <b>' + fmt(F * 100, 0) + '%</b> of maximum' +
      '<span style="opacity:.72">  ·  neither filament changes length — only the ' +
      'overlap between them does</span>';
  }

  keepOut(chips(u.ctl, [['short', 'too short'], ['opt', 'optimal'], ['long', 'too long']], 'opt',
    function (w) { x = w === 'short' ? 0.62 : (w === 'long' ? 1.45 : 1.0); sX.quiet(x); draw(); }));
  var sX = slider(u.ctl, 'Sarcomere length', 0.55, 1.65, 0.01, x,
    function (q) { return fmt(q * 100, 0) + '% of optimal'; },
    function (q) { x = q; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   PENNATION

   Angled fibres are shorter, so more of them fit in the same volume — more
   cross-sectional area, and therefore more force. The cost is that only the
   component along the tendon reaches the bone, and that the whole muscle
   shortens more slowly than its fibres do.
   ============================================================ */
D.register('pennation', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var th = 17;                       /* pennation angle, degrees */

  /* One belly, fixed volume and fixed thickness. Angled fibres span the
     THICKNESS rather than the length, so opening the angle makes every fibre
     shorter \u2014 and since area = volume / fibre length, more of them fit.
     The parallel case is the fibres running the whole length of the belly,
     which is where the clamp comes from.

     The constants are Marc's worked example: a 12 cm fibre, 8.15 cm\u00b2 of
     area and 20 N per cm\u00b2 give the 163 N of a parallel-fibred muscle. */
  var LMAX = 12.0;        /* longest a fibre gets, cm                  */
  var THICK = 1.46;       /* belly thickness, cm \u2014 set so a 17\u00b0 gastrocnemius
                             comes out with the ~5 cm fibres it really has */
  var VOL = 97.8;         /* belly volume, cm^3 (= 12 cm x 8.15 cm^2)  */

  function fibreLen(r) {
    if (r < 1e-4) return LMAX;
    return Math.min(LMAX, THICK / Math.sin(r));
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H, i;
    ax.clear();
    var r = th * Math.PI / 180;
    var fl = fibreLen(r);
    var pcsa = VOL / fl;                    /* cm^2  */
    var fFibre = pcsa * M.SIGMA;            /* N, along the fibres */
    var fTendon = fFibre * Math.cos(r);     /* N, reaching the tendon */
    /* a fibre shortens at vmax lengths per second, and only the component
       along the tendon shortens the whole muscle */
    var vBelly = fl * M.VX * Math.cos(r);   /* cm/s */

    /* ---- the belly, drawn with its fibres ---- */
    var bx = 64, by = H * 0.38, bw = W * 0.40, bh = 132;
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.4;
    c.strokeRect(bx, by - bh / 2, bw, bh); c.restore();

    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 2.4; c.setLineDash([6, 5]);
    c.beginPath(); c.moveTo(bx - 44, by); c.lineTo(bx + bw + 44, by); c.stroke(); c.restore();
    label(c, 'line of action', bx + bw / 2, by - bh / 2 - 15,
          { color: K.MUT, size: 11.5, align: 'center' });

    /* fibres, clipped to the belly so none of them escape it */
    c.save();
    c.beginPath(); c.rect(bx, by - bh / 2, bw, bh); c.clip();
    var nF = Math.max(5, Math.round(VOL / fl * 1.5));
    var dy = bh / 2;
    var dx = r < 1e-4 ? 0 : dy / Math.tan(r);
    for (i = -nF; i <= nF * 2; i++) {
      var fx = bx + (bw + Math.abs(dx) * 2) * i / (nF * 1.5) - Math.abs(dx);
      c.strokeStyle = K.ACC; c.lineWidth = 2.6; c.lineCap = 'round'; c.globalAlpha = .85;
      c.beginPath(); c.moveTo(fx - dx / 2, by - dy); c.lineTo(fx + dx / 2, by + dy); c.stroke();
    }
    c.restore();

    if (r > 0.02) {
      var ax0 = bx + bw * 0.52, ay0 = by;
      c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.5;
      c.beginPath(); c.arc(ax0, ay0, 36, -Math.PI / 2, -Math.PI / 2 + r); c.stroke(); c.restore();
      label(c, fmt(th, 0) + '\u00b0', ax0 + 14, ay0 - 46, { color: K.INK, size: 14, align: 'left' });
    }

    /* ---- what it buys and what it costs ---- */
    var px = bx + bw + 104, py = H * 0.16, rowH = 50;
    [['fibre length', fmt(fl, 1) + ' cm', K.MUT],
     ['cross-sectional area', fmt(pcsa, 1) + ' cm\u00b2', K.BLUE],
     ['force along the fibres', fmt(fFibre, 0) + ' N', K.ACC],
     ['force at the tendon', fmt(fTendon, 0) + ' N', K.GRN],
     ['belly shortening speed', fmt(vBelly, 0) + ' cm/s', K.VIO]
    ].forEach(function (rw, i2) {
      var y = py + i2 * rowH;
      label(c, rw[0], px, y, { color: K.MUT, size: 12, align: 'left' });
      label(c, rw[1], px, y + 20, { color: rw[2], size: 17, align: 'left' });
    });

    /* against the parallel-fibred case, which is the comparison that matters */
    var f0 = (VOL / LMAX) * M.SIGMA, v0 = LMAX * M.VX;
    label(c, 'against parallel fibres:  force \u00d7' + fmt(fTendon / f0, 1) +
             ',  speed \u00d7' + fmt(vBelly / v0, 2),
          bx, H - 26, { color: K.INK, size: 13, align: 'left' });

    out.innerHTML = 'at <b>' + fmt(th, 0) + '\u00b0</b> \u00b7 fibres <b>' + fmt(fl, 1) +
      ' cm</b> \u00b7 area <b>' + fmt(pcsa, 1) + ' cm\u00b2</b> \u00b7 fibres pull <b>' +
      fmt(fFibre, 0) + ' N</b>, the tendon gets <b>' + fmt(fTendon, 0) + ' N</b> (\u00d7 cos\u03b8 = ' +
      fmt(Math.cos(r), 3) + ')' +
      '<span style="opacity:.72">  \u00b7  cos\u03b8 costs a few percent; the shorter fibres buy ' +
      'several times the area \u2014 paid for in shortening speed</span>';
  }

  keepOut(chips(u.ctl, [['par', 'parallel  0\u00b0'], ['gm', 'gastrocnemius  17\u00b0'],
                        ['sol', 'soleus  25\u00b0'], ['deep', 'deep pennate  35\u00b0']], 'gm',
    function (w) {
      th = w === 'par' ? 0 : (w === 'sol' ? 25 : (w === 'deep' ? 35 : 17));
      sT.quiet(th); draw();
    }));
  var sT = slider(u.ctl, 'Pennation angle', 0, 40, 1, th,
    function (q) { return fmt(q, 0) + '\u00b0'; },
    function (q) { th = q; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   MOMENT ARM

   Force is not torque. The same muscle force produces a different joint
   moment at every joint angle, because the perpendicular distance from the
   line of action to the joint centre keeps changing.
   ============================================================ */
D.register('momentarm', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 430,
                            padl: 70, padr: 30, padt: 34, padb: 54 });
  var out = readout(u.ctl);
  var q = 90;                        /* elbow angle, degrees */

  /* a biceps-like moment arm: small when the joint is straight, peaking
     near mid-range, falling again as the joint closes */
  function rOf(deg) {
    var t = (deg - 20) / 140;
    return 0.012 + 0.036 * Math.exp(-Math.pow((t - 0.52) / 0.42, 2));
  }
  /* fibre length tracks joint angle, so force-length applies too */
  function xOf(deg) { return 0.72 + 0.52 * (1 - deg / 160); }

  function draw() {
    var c = ax.c, K = C(), W = ax.W;
    ax.clear();
    var QMIN = 20, QMAX = 160;
    ax.setRange(QMIN, QMAX, 0, 62);
    ax.frame({ grid: true, xticks: [20, 50, 80, 110, 140], yticks: [0, 20, 40, 60],
               xlabel: 'Elbow angle (°)', ylabel: 'Moment (N·m)',
               ysize: 13, ylabelx: 15,
               xfmt: function (v) { return v.toFixed(0); },
               yfmt: function (v) { return v.toFixed(0); } });

    var F0 = 600;                               /* a constant muscle force */
    function momConst(deg) { return F0 * rOf(deg); }
    function momReal(deg) { return F0 * flActive(xOf(deg)) * rOf(deg); }

    ax.fn(momConst, { color: K.MUT, width: 2.2, dash: [6, 5], from: QMIN, to: QMAX });
    ax.fn(momReal, { color: K.BLUE, width: 3, from: QMIN, to: QMAX });

    ax.dots([[q, momReal(q)]], { color: K.ACC, r: 7 });
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.8; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(ax.X(q), ax.Y(0)); c.lineTo(ax.X(q), ax.Y(momReal(q)));
    c.stroke(); c.restore();

    key(c, ax.X(QMIN) + 12, ax.pt + 8,
        [[K.MUT, 'moment arm alone, constant force'],
         [K.BLUE, 'moment arm × force–length']], { size: 12 });

    /* the joint itself, sketched in the corner */
    var jx = ax.W - 150, jy = ax.pt + 58, L = 62;
    var a = (180 - q) * Math.PI / 180;
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 3.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(jx - L, jy); c.lineTo(jx, jy);
    c.lineTo(jx + L * Math.cos(a), jy - L * Math.sin(a)); c.stroke();
    c.fillStyle = K.PLATE; c.strokeStyle = K.ACC; c.lineWidth = 2.4;
    c.beginPath(); c.arc(jx, jy, 7, 0, 7); c.fill(); c.stroke(); c.restore();
    label(c, fmt(rOf(q) * 100, 1) + ' cm moment arm', jx, jy + 40,
          { color: K.MUT, size: 11.5, align: 'center' });

    out.innerHTML = 'at <b>' + fmt(q, 0) + '°</b> · moment arm <b>' +
      fmt(rOf(q) * 100, 1) + ' cm</b> · force <b>' + fmt(F0 * flActive(xOf(q)), 0) +
      ' N</b> · moment <b>' + fmt(momReal(q), 1) + ' N·m</b>' +
      '<span style="opacity:.72">  ·  T = r(θ) × F — the strength curve you ' +
      'feel is both of these at once, not the muscle alone</span>';
  }

  var sQ = slider(u.ctl, 'Elbow angle', 20, 160, 1, q,
    function (v) { return fmt(v, 0) + '°'; },
    function (v) { q = v; draw(); });
  node._draw = draw;
  draw();
});

/* ============================================================
   FORCE–LENGTH

   The active curve is the overlap story from the sarcomere figure, plotted.
   The passive curve is connective tissue going taut. What a muscle actually
   produces is their sum, which is why a stretched muscle can be strong for
   a reason that has nothing to do with its cross-bridges.
   ============================================================ */
D.register('flcurve', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 470 : 430,
                            padl: 78, padr: 36, padt: 34, padb: 56 });
  var out = readout(u.ctl);
  var x = 1.0, show = 'all', gauss = false;

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    var LO = 0.5, HI = 1.75;
    ax.setRange(LO, HI, 0, 1.75);
    ax.frame({ grid: true, xticks: [0.6, 0.8, 1.0, 1.2, 1.4, 1.6],
               yticks: [0, 0.5, 1.0, 1.5],
               xlabel: 'Fibre length  (fraction of optimal)',
               ylabel: 'Force  (F / Fₘₐₓ)', ysize: 13, ylabelx: 15,
               xfmt: function (v) { return v.toFixed(1); },
               yfmt: function (v) { return v.toFixed(1); } });

    /* the plateau, named rather than left to be noticed */
    c.save(); c.fillStyle = 'rgba(74,222,128,0.10)';
    c.fillRect(ax.X(1.0), ax.pt, ax.X(1.2) - ax.X(1.0), ax.Y(0) - ax.pt);
    c.restore();
    label(c, 'plateau', (ax.X(1.0) + ax.X(1.2)) / 2, ax.pt + 16,
          { color: K.GRN, size: 11.5, align: 'center' });

    if (show !== 'pas') ax.fn(flActive, { color: K.GRN, width: 2.8, from: LO, to: HI });
    if (show !== 'act') ax.fn(flPassive, { color: K.VIO, width: 2.4, from: LO, to: HI });
    if (show === 'all') ax.fn(flTotal, { color: K.BLUE, width: 3.2, from: LO, to: HI });
    if (gauss) ax.fn(flGauss, { color: K.MUT, width: 2, dash: [6, 5], from: LO, to: HI });

    var fa = flActive(x), fp = flPassive(x), ft = fa + fp;
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.8; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(ax.X(x), ax.Y(0)); c.lineTo(ax.X(x), ax.Y(1.72)); c.stroke();
    c.restore();
    if (show !== 'pas') ax.dots([[x, fa]], { color: K.GRN, r: 6 });
    if (show !== 'act') ax.dots([[x, fp]], { color: K.VIO, r: 6 });
    if (show === 'all') ax.dots([[x, ft]], { color: K.BLUE, r: 7 });

    var rows = [[K.GRN, 'active — cross-bridges'], [K.VIO, 'passive — connective tissue']];
    if (show === 'all') rows.push([K.BLUE, 'total — what you measure']);
    if (gauss) rows.push([K.MUT, 'the Gaussian models use']);
    key(c, ax.X(LO) + 12, ax.pt + 40, rows, { size: 12 });

    out.innerHTML = 'at <b>' + fmt(x * 100, 0) + '%</b> of optimal · active <b>' +
      fmt(fa, 2) + '</b> + passive <b>' + fmt(fp, 2) + '</b> = <b>' + fmt(ft, 2) +
      '</b>·Fₘₐₓ' +
      '<span style="opacity:.72">  ·  ' +
      (x < 0.78 ? 'badly shortened: the cross-bridges have run out of room'
        : x <= 1.22 ? 'near optimal: the plateau, where every head can bind'
        : 'stretched: the active part is failing while the passive part takes over') +
      '</span>';
  }

  keepOut(seg(u.ctl, [['all', 'active + passive'], ['act', 'active only'],
                      ['pas', 'passive only']], 'all',
    function (w) { show = w; draw(); }));
  keepOut(chips(u.ctl, [['g', 'overlay the Gaussian approximation']], null,
    function () { gauss = !gauss; draw(); }));
  var sX = slider(u.ctl, 'Fibre length', 0.5, 1.75, 0.01, x,
    function (v) { return fmt(v * 100, 0) + '%'; },
    function (v) { x = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   FORCE–VELOCITY

   The same curve as lecture 9, with the muscle's own constants exposed. The
   lengthening half matters here more than it did there: it is why you can
   lower a load you cannot lift.
   ============================================================ */
D.register('fvcurve', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 470 : 430,
                            padl: 78, padr: 88, padt: 34, padb: 56 });
  var out = readout(u.ctl);
  var vr = FV_PEAK.v, af = M.AF;

  function Fc(v) { return Math.max(0, (1 - v) / (1 + v / af)); }
  function Fof(v) { return v >= 0 ? Fc(v) : fvEcc(v); }
  function peak() {
    var best = 0, bv = 0;
    for (var i = 1; i < 2000; i++) { var v = i / 2000, p = Fc(v) * v; if (p > best) { best = p; bv = v; } }
    return { v: bv, p: best };
  }

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    var VE = -0.5, PK = peak();
    ax.setRange(VE, 1, 0, 1.95);
    ax.frame({ grid: true, xticks: [-0.5, -0.25, 0, 0.25, 0.5, 0.75, 1.0],
               yticks: [0, 0.5, 1.0, 1.5],
               xlabel: 'Velocity  (v / vₘₐₓ)   ← lengthening   shortening →',
               ylabel: 'Force  (F / Fₘₐₓ)', ysize: 13, ylabelx: 15,
               xfmt: function (v) { return v.toFixed(2); },
               yfmt: function (v) { return v.toFixed(1); } });

    c.save(); c.fillStyle = 'rgba(248,113,113,0.10)';
    c.fillRect(ax.X(VE), ax.pt, ax.X(0) - ax.X(VE), ax.Y(0) - ax.pt); c.restore();
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .7; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(ax.X(0), ax.pt); c.lineTo(ax.X(0), ax.Y(0)); c.stroke(); c.restore();
    label(c, 'ECCENTRIC', ax.X(0) - 10, ax.pt + 14, { color: K.ACC, size: 11.5, align: 'right' });
    label(c, 'CONCENTRIC', ax.X(0) + 10, ax.pt + 14, { color: K.GRN, size: 11.5, align: 'left' });

    c.save(); c.strokeStyle = K.ACC; c.globalAlpha = .5; c.lineWidth = 1.4; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(ax.X(VE), ax.Y(1.8)); c.lineTo(ax.X(0), ax.Y(1.8)); c.stroke();
    c.restore();
    label(c, '≈1.8 × Fₘₐₓ', ax.X(VE) + 8, ax.Y(1.8) + 16,
          { color: K.ACC, size: 12, align: 'left', plate: true });

    var PS = 1 / PK.p;
    ax.fn(Fof, { color: K.BLUE, width: 2.8, from: VE, to: 1 });
    ax.fn(function (v) { return Fc(v) * v * PS; }, { color: K.ACC, width: 2.8, from: 0, to: 1 });

    var rx = ax.W - ax.pr;
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.2; c.globalAlpha = .8;
    c.beginPath(); c.moveTo(rx + .5, ax.Y(1.05)); c.lineTo(rx + .5, ax.Y(0)); c.stroke(); c.restore();
    [0, 0.5, 1].forEach(function (v) {
      label(c, fmt(v, 1), rx + 8, ax.Y(v), { color: K.ACC, size: 11, align: 'left' });
    });
    c.save(); c.translate(ax.W - 15, (ax.Y(1.05) + ax.Y(0)) / 2); c.rotate(Math.PI / 2);
    c.fillStyle = K.ACC; c.font = '700 12.5px ui-sans-serif,system-ui,sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText('Power, as a fraction of peak', 0, 0); c.restore();

    c.save(); c.strokeStyle = K.ORG; c.globalAlpha = .6; c.lineWidth = 1.5; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(ax.X(PK.v), ax.Y(0)); c.lineTo(ax.X(PK.v), ax.Y(1.12)); c.stroke();
    c.restore();
    label(c, 'peak power at ' + fmt(PK.v, 2) + '·vₘₐₓ', ax.X(PK.v) + 8, ax.Y(1.2),
          { color: K.ORG, size: 12.5, align: 'left', plate: true });

    var f = Fof(vr), p = f * vr;
    ax.dots([[vr, f]], { color: K.BLUE, r: 6.5 });
    if (vr >= 0) ax.dots([[vr, p * PS]], { color: K.ACC, r: 6.5 });
    c.save(); c.strokeStyle = K.INK; c.globalAlpha = .5; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(ax.X(vr), ax.Y(0)); c.lineTo(ax.X(vr), ax.Y(1.9)); c.stroke(); c.restore();

    var vAbs = vr * M.VX * M.L0;
    out.innerHTML = 'v = <b>' + fmt(vr, 2) + '·vₘₐₓ</b> (' + num(vAbs, 2) +
      ' m/s) → F = <b>' + fmt(f * M.F0, 0) + ' N</b> · P = <b>' +
      fmt(f * M.F0 * Math.abs(vAbs), 0) + ' W</b> ' +
      (vr < -0.005 ? '<b>absorbed</b>' : 'produced') +
      '<span style="opacity:.72">  ·  curvature aₑ = ' + fmt(af, 2) +
      '; lower values bend the curve harder and move peak power slower</span>';
  }

  keepOut(chips(u.ctl, [['ecc', 'lengthening'], ['iso', 'isometric'],
                        ['peak', 'peak power'], ['vmax', 'vₘₐₓ']], 'peak',
    function (w) {
      vr = w === 'ecc' ? -0.3 : (w === 'iso' ? 0 : (w === 'vmax' ? 1 : peak().v));
      sV.quiet(vr); draw();
    }));
  var sV = slider(u.ctl, 'Velocity', -0.5, 1, 0.01, vr,
    function (v) { return fmt(v, 2) + '·vₘₐₓ'; },
    function (v) { vr = v; draw(); });
  slider(u.ctl, 'Curvature aₑ', 0.10, 0.80, 0.01, af,
    function (v) { return fmt(v, 2); },
    function (v) { af = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   THE TWITCH

   Force does not appear the instant a muscle is told to contract, and it
   does not vanish when the signal stops. Both delays are in here, and both
   matter enormously once the movement becomes cyclic.
   ============================================================ */
D.register('twitch', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 450 : 420,
                            padl: 78, padr: 34, padt: 34, padb: 56 });
  var out = readout(u.ctl);
  var which = 'gm';

  /* latent period, time to peak, half-relaxation — all in ms */
  var MUS = {
    eye: { n: 'extraocular (lateral rectus)', lat: 2,  tp: 8,   hr: 10,  col: 'VIO' },
    gm:  { n: 'gastrocnemius',                lat: 3,  tp: 25,  hr: 35,  col: 'BLUE' },
    sol: { n: 'soleus',                       lat: 4,  tp: 75,  hr: 110, col: 'GRN' }
  };

  function twitchAt(m, t) {
    if (t < m.lat) return 0;
    var s = t - m.lat;
    return Math.pow(s / m.tp, 1.6) * Math.exp(1.6 * (1 - s / m.tp));
  }

  function draw() {
    var c = ax.c, K = C();
    ax.clear();
    var T = 260;
    ax.setRange(0, T, 0, 1.15);
    ax.frame({ grid: true, xticks: [0, 50, 100, 150, 200, 250],
               yticks: [0, 0.25, 0.5, 0.75, 1.0],
               xlabel: 'Time after the stimulus (ms)',
               ylabel: 'Force  (fraction of peak)', ysize: 13, ylabelx: 15,
               xfmt: function (v) { return v.toFixed(0); },
               yfmt: function (v) { return v.toFixed(2); } });

    /* the stimulus itself */
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(ax.X(0), ax.Y(0)); c.lineTo(ax.X(0), ax.Y(1.08)); c.stroke(); c.restore();
    label(c, 'stimulus', ax.X(0) + 8, ax.Y(1.11), { color: K.ACC, size: 12, align: 'left' });

    /* Each key gets its own closure — a plain `for (k in MUS)` would hand
       every curve the last muscle, because `var` is function-scoped. And
       ax.fn has no alpha of its own, so the fade is set around the call. */
    var rows = [];
    Object.keys(MUS).forEach(function (k2) {
      var m = MUS[k2], on = (k2 === which), col = K[m.col];
      c.save(); c.globalAlpha = on ? 1 : 0.3;
      ax.fn(function (t) { return twitchAt(m, t); },
            { color: col, width: on ? 3.2 : 1.8, from: 0, to: T });
      c.restore();
      rows.push([col, m.n]);
    });
    key(c, ax.X(T) - 250, ax.pt + 8, rows, { size: 12 });

    /* the three phases, marked on the selected muscle */
    var m2 = MUS[which];
    var pk = m2.lat + m2.tp;
    [[0, m2.lat, 'latent'], [m2.lat, pk, 'contraction'], [pk, Math.min(T, pk + m2.hr * 2.4), 'relaxation']]
      .forEach(function (sg, i) {
        var x0 = ax.X(sg[0]), x1 = ax.X(sg[1]);
        var y = ax.Y(0) + 24;
        c.save(); c.strokeStyle = K.MUT; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
        c.beginPath(); c.moveTo(x0, y - 4); c.lineTo(x0, y + 4);
        c.moveTo(x1, y - 4); c.lineTo(x1, y + 4); c.stroke(); c.restore();
        if (x1 - x0 > 34) label(c, sg[2], (x0 + x1) / 2, y + 14,
                                { color: K.MUT, size: 11, align: 'center' });
      });

    out.innerHTML = '<b>' + m2.n + '</b> · latent <b>' + m2.lat +
      ' ms</b> · time to peak <b>' + m2.tp + ' ms</b> · half-relaxation <b>' +
      m2.hr + ' ms</b>' +
      '<span style="opacity:.72">  ·  an eye muscle finishes before the soleus has ' +
      'properly started — same mechanism, very different speed</span>';
  }

  keepOut(chips(u.ctl, [['eye', 'extraocular'], ['gm', 'gastrocnemius'], ['sol', 'soleus']], 'gm',
    function (w) { which = w; draw(); }));
  node._draw = draw;
  draw();
});


/* ============================================================
   ACTIVATION DYNAMICS

   The same first-order filter the Virtual Muscle Lab uses, with its default
   time constants. Excitation is what the nervous system asks for; activation
   is what the muscle delivers, and it is always late — later still on the
   way down.
   ============================================================ */
D.register('actdyn', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 450 : 420,
                            padl: 78, padr: 34, padt: 34, padb: 56 });
  var out = readout(u.ctl);
  var tA = M.TAU_A, tD = M.TAU_D, dur = 120;

  function run() {
    var T = 400, dt = 0.5, n = Math.round(T / dt) + 1, i;
    var exc = new Float64Array(n);
    for (i = 0; i < n; i++) exc[i] = (i * dt >= 50 && i * dt < 50 + dur) ? 1 : 0;
    return { t: T, dt: dt, exc: exc, act: activate(exc, dt, tA, tD) };
  }

  function draw() {
    var c = ax.c, K = C(), i;
    var r = run(), n = r.act.length;
    ax.clear();
    ax.setRange(0, r.t, 0, 1.12);
    ax.frame({ grid: true, xticks: [0, 100, 200, 300, 400],
               yticks: [0, 0.25, 0.5, 0.75, 1.0],
               xlabel: 'Time (ms)', ylabel: 'Fraction of maximum',
               ysize: 13, ylabelx: 15,
               xfmt: function (v) { return v.toFixed(0); },
               yfmt: function (v) { return v.toFixed(2); } });

    function plot(arr, col, w, dash) {
      c.save(); c.strokeStyle = col; c.lineWidth = w;
      if (dash) c.setLineDash(dash);
      c.beginPath();
      for (i = 0; i < n; i++) {
        var px = ax.X(i * r.dt), py = ax.Y(arr[i]);
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke(); c.restore();
    }
    plot(r.exc, K.MUT, 2, [6, 5]);
    plot(r.act, K.BLUE, 3.2);

    /* how far behind the activation runs, at both ends */
    function cross(arr, lvl, from, up) {
      for (i = from; i < n; i++) {
        if (up ? arr[i] >= lvl : arr[i] <= lvl) return i * r.dt;
      }
      return null;
    }
    var onAt = cross(r.act, 0.632, Math.round(50 / r.dt), true);
    var offAt = cross(r.act, 0.368, Math.round((50 + dur) / r.dt), false);
    [[onAt, 50, K.GRN, 'rise'], [offAt, 50 + dur, K.ACC, 'fall']].forEach(function (p) {
      if (p[0] == null) return;
      c.save(); c.strokeStyle = p[2]; c.lineWidth = 1.6; c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(ax.X(p[1]), ax.Y(0)); c.lineTo(ax.X(p[1]), ax.Y(1.08));
      c.moveTo(ax.X(p[0]), ax.Y(0)); c.lineTo(ax.X(p[0]), ax.Y(1.08)); c.stroke(); c.restore();
      var mid = (ax.X(p[1]) + ax.X(p[0])) / 2;
      label(c, fmt(p[0] - p[1], 0) + ' ms', mid, ax.Y(1.03),
            { color: p[2], size: 12, align: 'center', plate: true });
    });

    key(c, ax.X(r.t) - 230, ax.pt + 8,
        [[K.MUT, 'excitation — what is asked for'],
         [K.BLUE, 'activation — what is delivered']], { size: 12 });

    out.innerHTML = 'τ rise <b>' + fmt(tA, 0) + ' ms</b> · τ fall <b>' +
      fmt(tD, 0) + ' ms</b> · activation reaches 63% after <b>' +
      (onAt == null ? '—' : fmt(onAt - 50, 0) + ' ms</b>') +
      ' and falls to 37% <b>' + (offAt == null ? '—' : fmt(offAt - 50 - dur, 0) + ' ms</b>') +
      ' after the signal stops' +
      '<span style="opacity:.72">  ·  turning off takes about four times as long as ' +
      'turning on, and that asymmetry is what makes timing hard</span>';
  }

  slider(u.ctl, 'Activation τ', 2, 40, 1, tA,
    function (v) { return fmt(v, 0) + ' ms'; }, function (v) { tA = v; draw(); });
  slider(u.ctl, 'Deactivation τ', 5, 120, 1, tD,
    function (v) { return fmt(v, 0) + ' ms'; }, function (v) { tD = v; draw(); });
  slider(u.ctl, 'Signal duration', 30, 250, 5, dur,
    function (v) { return fmt(v, 0) + ' ms'; }, function (v) { dur = v; draw(); });
  node._draw = draw;
  draw();
});

/* ============================================================
   THE THREE-ELEMENT MODEL

   A contractile component with a spring beside it and a spring after it.
   Pull the whole thing and watch where the length goes: the series element
   stretches first, which is why force at the tendon lags the cross-bridges.
   ============================================================ */
D.register('ccpec', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 440 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var act = 0.8, stretch = 0.0;

  function spring(c, x0, y, x1, n, amp, col, w) {
    c.save(); c.strokeStyle = col; c.lineWidth = w || 2.4; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x0, y);
    var seg = (x1 - x0) / (n * 2);
    for (var i = 0; i < n * 2; i++) {
      c.lineTo(x0 + seg * (i + 0.5), y + (i % 2 ? amp : -amp));
    }
    c.lineTo(x1, y); c.stroke(); c.restore();
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var F = act * flActive(1 + stretch * 0.5) + flPassive(1 + stretch * 0.5);
    var secStretch = 26 * F;                     /* the tendon gives under load */

    var x0 = 80, y = H * 0.42, boxW = 190, gap = 26;
    var xCC = x0 + 40 + stretch * 60;
    var xSEC0 = xCC + boxW, xSEC1 = xSEC0 + 90 + secStretch;

    /* anchor */
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x0, y - 70); c.lineTo(x0, y + 70); c.stroke(); c.restore();

    /* contractile component, shaded by how activated it is */
    c.save();
    c.fillStyle = K.GRN; c.globalAlpha = 0.18 + 0.55 * act;
    c.fillRect(xCC, y - 22, boxW, 44); c.globalAlpha = 1;
    c.strokeStyle = K.GRN; c.lineWidth = 2.4;
    c.strokeRect(xCC, y - 22, boxW, 44); c.restore();
    label(c, 'CC', xCC + boxW / 2, y, { color: K.INK, size: 15, align: 'center' });
    label(c, 'contractile', xCC + boxW / 2, y + 36, { color: K.MUT, size: 11.5, align: 'center' });

    /* parallel elastic component, spanning the same span as the CC */
    spring(c, x0, y - 62, xSEC0, 9, 9, K.VIO, 2.2);
    label(c, 'PEC', (x0 + xSEC0) / 2, y - 84, { color: K.VIO, size: 13, align: 'center' });
    label(c, 'parallel elastic · passive tissue', (x0 + xSEC0) / 2, y - 102,
          { color: K.MUT, size: 11, align: 'center' });
    c.save(); c.strokeStyle = K.VIO; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(x0, y - 62); c.lineTo(x0, y);
    c.moveTo(xSEC0, y - 62); c.lineTo(xSEC0, y); c.stroke(); c.restore();

    /* series elastic component, in line after the CC */
    spring(c, xSEC0, y, xSEC1, 8, 11, K.ACC, 2.6);
    label(c, 'SEC', (xSEC0 + xSEC1) / 2, y - 30, { color: K.ACC, size: 13, align: 'center' });
    label(c, 'series elastic · tendon', (xSEC0 + xSEC1) / 2, y + 32,
          { color: K.MUT, size: 11, align: 'center' });

    /* the load at the far end */
    c.save(); c.fillStyle = K.PANEL; c.strokeStyle = K.INK; c.lineWidth = 2;
    c.fillRect(xSEC1, y - 26, 34, 52); c.strokeRect(xSEC1, y - 26, 34, 52); c.restore();
    arrow(c, xSEC1 + 44, y, xSEC1 + 44 + 30 + 70 * F, y, { color: K.BLUE, width: 4 });
    label(c, fmt(F * M.F0, 0) + ' N', xSEC1 + 52, y - 24, { color: K.BLUE, size: 15, align: 'left' });

    label(c, 'The cross-bridges shorten the CC; the SEC stretches before the bone feels any of it.',
          20, H - 24, { color: K.MUT, size: 12.5, align: 'left' });

    out.innerHTML = 'activation <b>' + fmt(act * 100, 0) + '%</b> · muscle–tendon unit at <b>' +
      fmt((1 + stretch * 0.5) * 100, 0) + '%</b> of optimal → tendon force <b>' +
      fmt(F * M.F0, 0) + ' N</b>' +
      '<span style="opacity:.72">  ·  the CC carries the active part, the PEC the passive ' +
      'part, and everything reaches the bone through the SEC</span>';
  }

  slider(u.ctl, 'Activation', 0, 1, 0.01, act,
    function (v) { return fmt(v * 100, 0) + '%'; }, function (v) { act = v; draw(); });
  slider(u.ctl, 'Stretch of the unit', -0.6, 1, 0.02, stretch,
    function (v) { return fmt((1 + v * 0.5) * 100, 0) + '%'; },
    function (v) { stretch = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   FORCE AS A SURFACE

   Force–length and force–velocity are not two separate facts; they are two
   cuts through one surface. Drag it to turn it, and watch the two familiar
   curves appear as its edges.
   ============================================================ */
D.register('flvsurface', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 450,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var st = { az: -0.75, tilt: 0.38 };
  var xm = 1.0, vm = FV_PEAK.v;

  function Fsurf(x, v) { return flActive(x) * fvOf(v); }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H, i, j;
    ax.clear();
    var S = Math.min(W, H) * 0.62;
    var cx = W * 0.46, cy = H * 0.64;
    var ca = Math.cos(st.az), sa = Math.sin(st.az);
    var ct = Math.cos(st.tilt), stl = Math.sin(st.tilt);

    /* length 0.55..1.6 on one axis, velocity -0.4..1 on the other */
    var X0 = 0.55, X1 = 1.60, V0 = -0.4, V1 = 1.0;
    function P(x, v, f) {
      var a = (x - X0) / (X1 - X0) - 0.5;
      var b = (v - V0) / (V1 - V0) - 0.5;
      var sx = (a * ca - b * sa) * S;
      var sy = (a * sa + b * ca) * S * stl - f * S * 0.52 * ct;
      return [cx + sx, cy + sy];
    }

    /* the floor grid */
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1; c.globalAlpha = .7;
    for (i = 0; i <= 8; i++) {
      var xq = X0 + (X1 - X0) * i / 8;
      c.beginPath();
      for (j = 0; j <= 8; j++) {
        var p = P(xq, V0 + (V1 - V0) * j / 8, 0);
        j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]);
      }
      c.stroke();
      var vq = V0 + (V1 - V0) * i / 8;
      c.beginPath();
      for (j = 0; j <= 8; j++) {
        var p2 = P(X0 + (X1 - X0) * j / 8, vq, 0);
        j ? c.lineTo(p2[0], p2[1]) : c.moveTo(p2[0], p2[1]);
      }
      c.stroke();
    }
    c.restore();

    /* the surface itself, as a wire mesh drawn back to front */
    var N = 26;
    c.save(); c.lineWidth = 1.3;
    for (i = 0; i <= N; i++) {
      var xq2 = X0 + (X1 - X0) * i / N;
      c.strokeStyle = K.BLUE; c.globalAlpha = 0.55;
      c.beginPath();
      for (j = 0; j <= N; j++) {
        var vq2 = V0 + (V1 - V0) * j / N;
        var p3 = P(xq2, vq2, Fsurf(xq2, vq2));
        j ? c.lineTo(p3[0], p3[1]) : c.moveTo(p3[0], p3[1]);
      }
      c.stroke();
    }
    for (j = 0; j <= N; j++) {
      var vq3 = V0 + (V1 - V0) * j / N;
      c.strokeStyle = K.VIO; c.globalAlpha = 0.4;
      c.beginPath();
      for (i = 0; i <= N; i++) {
        var xq3 = X0 + (X1 - X0) * i / N;
        var p4 = P(xq3, vq3, Fsurf(xq3, vq3));
        i ? c.lineTo(p4[0], p4[1]) : c.moveTo(p4[0], p4[1]);
      }
      c.stroke();
    }
    c.restore();

    /* the two cuts the lecture has already drawn, picked out on the surface */
    c.save(); c.strokeStyle = K.GRN; c.lineWidth = 3.4;
    c.beginPath();
    for (i = 0; i <= 80; i++) {
      var xq4 = X0 + (X1 - X0) * i / 80;
      var p5 = P(xq4, vm, Fsurf(xq4, vm));
      i ? c.lineTo(p5[0], p5[1]) : c.moveTo(p5[0], p5[1]);
    }
    c.stroke();
    c.strokeStyle = K.ACC; c.beginPath();
    for (j = 0; j <= 80; j++) {
      var vq4 = V0 + (V1 - V0) * j / 80;
      var p6 = P(xm, vq4, Fsurf(xm, vq4));
      j ? c.lineTo(p6[0], p6[1]) : c.moveTo(p6[0], p6[1]);
    }
    c.stroke(); c.restore();

    var here = P(xm, vm, Fsurf(xm, vm));
    c.save(); c.fillStyle = K.ORG; c.beginPath(); c.arc(here[0], here[1], 7, 0, 7); c.fill(); c.restore();

    key(c, 16, 16, [[K.GRN, 'force–length, at this velocity'],
                    [K.ACC, 'force–velocity, at this length']], { size: 12 });
    label(c, 'drag to turn', 16, H - 16, { color: K.MUT, size: 11.5, align: 'left' });

    out.innerHTML = 'length <b>' + fmt(xm * 100, 0) + '%</b> · velocity <b>' + fmt(vm, 2) +
      '·vₘₐₓ</b> → force <b>' + fmt(Fsurf(xm, vm) * 100, 0) +
      '%</b> of maximum (<b>' + fmt(Fsurf(xm, vm) * M.F0, 0) + ' N</b>)' +
      '<span style="opacity:.72">  ·  Fₗ × Fᵥ — the two curves multiply, ' +
      'so being off-optimal in both costs more than either alone</span>';
  }

  slider(u.ctl, 'Fibre length', 0.55, 1.6, 0.01, xm,
    function (v) { return fmt(v * 100, 0) + '%'; }, function (v) { xm = v; draw(); });
  slider(u.ctl, 'Velocity', -0.4, 1, 0.01, vm,
    function (v) { return fmt(v, 2) + '·vₘₐₓ'; },
    function (v) { vm = v; draw(); });
  dragRotate(u.cv, st, draw);
  node._draw = draw;
  draw();
});


/* ============================================================
   THE MODEL EQUATION

   F = F0 · a · F_L(L) · F_V(v). Four dials, one product. This is exactly
   the force the Virtual Muscle Lab computes at every instant of its cycle,
   so getting comfortable here is the preparation for lecture 13.
   ============================================================ */
D.register('musclemodel', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 520 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var act = 1.0, xm = 1.0, vm = 0.0, F0 = M.F0;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var fl = flActive(xm), fv = fvOf(vm);
    var F = F0 * act * fl * fv;

    /* four terms across the top, each with its own little bar */
    var terms = [
      ['F₀', fmt(F0, 0) + ' N', 1, K.MUT, 'maximum isometric force'],
      ['a', fmt(act, 2), act, K.BLUE, 'activation'],
      ['Fₗ(L)', fmt(fl, 2), fl, K.GRN, 'force–length'],
      ['Fᵥ(v)', fmt(fv, 2), Math.min(1, fv / 1.8), K.ACC, 'force–velocity']
    ];
    var tw = W / 4.9, x0 = (W - tw * 4 - 3 * 26) / 2, bh = 92;
    terms.forEach(function (t, i) {
      var tx = x0 + i * (tw + 26), ty = H * 0.16;
      c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.3;
      c.strokeRect(tx + .5, ty + .5, tw, bh); c.restore();
      c.save(); c.fillStyle = t[3]; c.globalAlpha = .22;
      c.fillRect(tx + 1, ty + bh - (bh - 2) * t[2], tw - 2, (bh - 2) * t[2]);
      c.restore();
      label(c, t[0], tx + tw / 2, ty + 28, { color: t[3], size: 20, align: 'center' });
      label(c, t[1], tx + tw / 2, ty + 62, { color: K.INK, size: 17, align: 'center' });
      label(c, t[4], tx + tw / 2, ty + bh + 18, { color: K.MUT, size: 11.5, align: 'center' });
      if (i < 3) label(c, '×', tx + tw + 13, ty + bh / 2, { color: K.MUT, size: 20, align: 'center' });
    });

    /* the product, as a bar the whole width of the figure */
    var py = H * 0.58, pw = W - 160, px = 80, ph = 56;
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.4;
    c.strokeRect(px + .5, py + .5, pw, ph); c.restore();
    c.save(); c.fillStyle = K.BLUE; c.globalAlpha = .7;
    c.fillRect(px + 1, py + 1, (pw - 2) * Math.min(1, F / (F0 * 1.8)), ph - 2);
    c.restore();
    /* where plain F0 would sit, for scale */
    var oneX = px + (pw - 2) * (1 / 1.8);
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 1.6; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(oneX, py - 6); c.lineTo(oneX, py + ph + 6); c.stroke(); c.restore();
    label(c, 'F₀', oneX, py - 16, { color: K.MUT, size: 12, align: 'center' });

    label(c, fmt(F, 0) + ' N', px + pw / 2, py + ph / 2,
          { color: K.INK, size: 24, align: 'center', plate: true });
    label(c, 'F  =  F₀ · a · Fₗ(L) · Fᵥ(v)', W / 2, py + ph + 36,
          { color: K.MUT, size: 15, align: 'center' });
    label(c, 'the same product the Virtual Muscle Lab evaluates at every instant of its cycle',
          W / 2, py + ph + 62, { color: K.MUT, size: 12, align: 'center' });

    out.innerHTML = fmt(F0, 0) + ' × ' + fmt(act, 2) + ' × ' + fmt(fl, 2) + ' × ' +
      fmt(fv, 2) + ' = <b>' + fmt(F, 0) + ' N</b>, which is <b>' + fmt(F / F0 * 100, 0) +
      '%</b> of maximum isometric' +
      '<span style="opacity:.72">  ·  three of the four terms are fractions, so they can ' +
      'only take force away — except Fᵥ when the muscle is being lengthened</span>';
  }

  slider(u.ctl, 'Activation  a', 0, 1, 0.01, act,
    function (v) { return fmt(v, 2); }, function (v) { act = v; draw(); });
  slider(u.ctl, 'Fibre length  L', 0.55, 1.6, 0.01, xm,
    function (v) { return fmt(v * 100, 0) + '%'; }, function (v) { xm = v; draw(); });
  slider(u.ctl, 'Velocity  v', -0.5, 1, 0.01, vm,
    function (v) { return fmt(v, 2) + '·vₘₐₓ'; }, function (v) { vm = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   THE WORK LOOP — a first look

   Put the muscle through a sinusoidal length cycle, switch it on for part of
   that cycle, and plot force against length. The loop encloses the net work
   per cycle. This is the Virtual Muscle Lab in miniature, and lecture 13 is
   where it gets taken seriously.
   ============================================================ */
D.register('workloop', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 440,
                            padl: 78, padr: 36, padt: 34, padb: 56 });
  var out = readout(u.ctl);
  var onset = 22, offset = 66, freq = 2.0, exc = 20;   /* exc = excursion, mm */

  function run() {
    var n = 400, dtMs = 1000 / freq / n, i;
    var E = new Float64Array(n + 1);
    for (i = 0; i <= n; i++) {
      var pc = i / n * 100;
      E[i] = (pc >= onset && pc <= offset) ? 1 : 0;
    }
    var A = activate(E, dtMs, M.TAU_A, M.TAU_D);
    var L = new Float64Array(n + 1), V = new Float64Array(n + 1), F = new Float64Array(n + 1);
    var amp = exc / 1000 / M.L0;                 /* excursion in optimal lengths */
    var W = 0;
    for (i = 0; i <= n; i++) {
      var ph = 2 * Math.PI * i / n;
      L[i] = 1 + amp * Math.sin(ph);
      var vAbs = -2 * Math.PI * freq * amp * Math.cos(ph);   /* lengths per second */
      V[i] = vAbs / M.VX;                                     /* normalised, + = shortening */
      F[i] = A[i] * M.F0 * flActive(L[i]) * fvOf(V[i]);
      if (i) W += F[i] * (V[i] * M.VX * M.L0) * (dtMs / 1000);
    }
    return { n: n, L: L, F: F, A: A, W: W, P: W * freq, amp: amp };
  }

  function draw() {
    var c = ax.c, K = C(), i;
    var r = run();
    ax.clear();
    var span = r.amp * 1.15;
    ax.setRange(1 - span, 1 + span, 0, M.F0 * 1.05);
    ax.frame({ grid: true, yticks: axisTicks(0, M.F0 * 1.05),
               xlabel: 'Fibre length  (fraction of optimal)   ← shorter   longer →',
               ylabel: 'Force (N)', ysize: 13, ylabelx: 15,
               xfmt: function (v) { return v.toFixed(2); },
               yfmt: function (v) { return v.toFixed(0); } });

    /* the loop, with its interior tinted by which way it is being travelled */
    c.save();
    c.fillStyle = r.W >= 0 ? 'rgba(74,222,128,0.16)' : 'rgba(248,113,113,0.16)';
    c.beginPath();
    for (i = 0; i <= r.n; i++) {
      var px = ax.X(r.L[i]), py = ax.Y(r.F[i]);
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath(); c.fill(); c.restore();

    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 2.8; c.beginPath();
    for (i = 0; i <= r.n; i++) {
      var qx = ax.X(r.L[i]), qy = ax.Y(r.F[i]);
      i ? c.lineTo(qx, qy) : c.moveTo(qx, qy);
    }
    c.closePath(); c.stroke(); c.restore();

    /* which way round it goes */
    [0.12, 0.38, 0.62, 0.88].forEach(function (f) {
      var i0 = Math.round(f * r.n), i1 = Math.min(r.n, i0 + 6);
      arrow(c, ax.X(r.L[i0]), ax.Y(r.F[i0]), ax.X(r.L[i1]), ax.Y(r.F[i1]),
            { color: K.BLUE, width: 2.4, head: 11 });
    });

    label(c, 'the enclosed area is the net work per cycle',
          ax.X(1 - span) + 12, ax.pt + 16, { color: K.MUT, size: 12.5, align: 'left' });

    out.innerHTML = 'on at <b>' + fmt(onset, 0) + '%</b>, off at <b>' + fmt(offset, 0) +
      '%</b> · net work <b>' + num(r.W, 2) + ' J</b> per cycle · mean power <b>' +
      num(r.P, 1) + ' W</b>' +
      '<span style="opacity:.72">  ·  work × cycle frequency is the power, which is ' +
      'why timing is worth as much as strength</span>';
  }

  slider(u.ctl, 'Onset', 0, 30, 1, onset,
    function (v) { return fmt(v, 0) + '%'; }, function (v) { onset = v; draw(); });
  slider(u.ctl, 'Offset', 25, 75, 1, offset,
    function (v) { return fmt(v, 0) + '%'; }, function (v) { offset = v; draw(); });
  slider(u.ctl, 'Cycle frequency', 0.5, 5, 0.5, freq,
    function (v) { return fmt(v, 1) + ' Hz'; }, function (v) { freq = v; draw(); });
  slider(u.ctl, 'Excursion', 4, 40, 1, exc,
    function (v) { return fmt(v, 0) + ' mm'; }, function (v) { exc = v; draw(); });
  node._draw = draw;
  draw();
});
D.boot();
})();
