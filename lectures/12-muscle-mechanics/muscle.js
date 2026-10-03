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

    /* Below about 7 degrees the fibres would be longer than the belly, so the
       arrangement is the parallel-fibred one from the architecture figure
       rather than a pennate one. That is where the clamp in fibreLen() comes
       from, and the drawing switches with it. */
    var parallel = fl >= LMAX - 1e-6;

    var bx = 60, cy = H * 0.40, bw = W * 0.42, Hp = 58;
    var x1 = bx + bw;

    /* the tendon, and the direction it pulls in */
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 2; c.setLineDash([6, 5]);
    c.beginPath(); c.moveTo(bx - 52, cy); c.lineTo(x1 + 74, cy); c.stroke(); c.restore();
    arrow(c, x1 + 30, cy, x1 + 74, cy, { color: K.MUT, width: 2.4 });
    label(c, 'line of action', x1 + 76, cy - 16, { color: K.MUT, size: 11.5, align: 'right' });

    c.save();
    c.beginPath(); c.rect(bx, cy - Hp - 2, bw, Hp * 2 + 4); c.clip();

    if (parallel) {
      /* fibres run the whole length, tendon to tendon */
      for (i = -6; i <= 6; i++) {
        var py = cy + i * (Hp / 6.5);
        c.strokeStyle = K.ACC; c.lineWidth = 2.6; c.lineCap = 'round'; c.globalAlpha = .9;
        c.beginPath(); c.moveTo(bx + 4, py); c.lineTo(x1 - 4, py); c.stroke();
      }
    } else {
      /* bipennate: fibres leave the central tendon at the pennation angle and
         run out to the aponeurosis on each side, making the feather the word
         comes from. Fibres are packed a fixed distance apart measured ACROSS
         them, so the spacing along the tendon is that distance over sin(theta)
         \u2014 which is why opening the angle fits more of them in. */
      var run = Hp / Math.tan(r);
      var step = Math.max(9, 13 / Math.sin(r));
      for (i = -14; i <= 26; i++) {
        var sx = bx + i * step;
        c.strokeStyle = K.ACC; c.lineWidth = 2.6; c.lineCap = 'round'; c.globalAlpha = .9;
        c.beginPath(); c.moveTo(sx, cy); c.lineTo(sx + run, cy - Hp); c.stroke();   /* upper half */
        c.beginPath(); c.moveTo(sx, cy); c.lineTo(sx + run, cy + Hp); c.stroke();   /* lower half */
      }
    }
    c.restore();

    /* the aponeuroses the fibres pull on, and the central tendon they leave */
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx, cy - Hp); c.lineTo(x1, cy - Hp);
    c.moveTo(bx, cy + Hp); c.lineTo(x1, cy + Hp); c.stroke();
    if (!parallel) {
      c.strokeStyle = K.INK; c.lineWidth = 4.5;
      c.beginPath(); c.moveTo(bx - 40, cy); c.lineTo(x1, cy); c.stroke();
    } else {
      c.strokeStyle = K.INK; c.lineWidth = 4.5;
      c.beginPath(); c.moveTo(bx - 40, cy); c.lineTo(bx + 4, cy);
      c.moveTo(x1 - 4, cy); c.lineTo(x1 + 30, cy); c.stroke();
    }
    c.restore();
    label(c, 'aponeurosis', bx + 6, cy - Hp - 15, { color: K.BLUE, size: 11, align: 'left' });
    label(c, parallel ? 'tendon' : 'central tendon', bx - 38, cy - 15,
          { color: K.INK, size: 11, align: 'left' });

    /* the angle itself, against the line of action */
    if (!parallel) {
      var axp = bx + bw * 0.34;
      c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.6;
      c.beginPath(); c.arc(axp, cy, 40, -r, 0); c.stroke(); c.restore();
      label(c, fmt(th, 0) + '\u00b0', axp + 48, cy - 13, { color: K.INK, size: 14, align: 'left' });
    }

    /* the two cuts from the previous slide, which is where PCSA comes from */
    var cutX = bx + bw * 0.74;
    c.save(); c.strokeStyle = K.VIO; c.lineWidth = 2.2; c.setLineDash([7, 5]);
    c.beginPath(); c.moveTo(cutX, cy - Hp - 14); c.lineTo(cutX, cy + Hp + 14); c.stroke();
    if (!parallel) {
      /* perpendicular to the fibres of the upper half */
      var px2 = Math.sin(r) * 58, py2 = Math.cos(r) * 58;
      c.strokeStyle = K.GRN;
      c.beginPath();
      c.moveTo(cutX + 30 - px2, cy - Hp / 2 - py2);
      c.lineTo(cutX + 30 + px2, cy - Hp / 2 + py2);
      c.stroke();
    }
    c.restore();
    label(c, 'anatomic', cutX, cy + Hp + 28, { color: K.VIO, size: 11, align: 'center' });
    if (!parallel) label(c, 'physiologic', cutX + 30, cy - Hp - 20,
                         { color: K.GRN, size: 11, align: 'center' });

    /* ---- what it buys and what it costs ---- */
    var px = x1 + 104, py = H * 0.14, rowH = 48;
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

    var f0 = (VOL / LMAX) * M.SIGMA, v0 = LMAX * M.VX;
    label(c, 'against parallel fibres:  force \u00d7' + fmt(fTendon / f0, 1) +
             ',  speed \u00d7' + fmt(vBelly / v0, 2),
          bx, H - 24, { color: K.INK, size: 13, align: 'left' });

    out.innerHTML = 'at <b>' + fmt(th, 0) + '\u00b0</b> \u00b7 fibres <b>' + fmt(fl, 1) +
      ' cm</b> \u00b7 area <b>' + fmt(pcsa, 1) + ' cm\u00b2</b> \u00b7 fibres pull <b>' +
      fmt(fFibre, 0) + ' N</b>, the tendon gets <b>' + fmt(fTendon, 0) + ' N</b> (\u00d7 cos\u03b8 = ' +
      fmt(Math.cos(r), 3) + ')' +
      '<span style="opacity:.72">  \u00b7  ' +
      (parallel ? 'fibres run the whole length of the belly, tendon to tendon'
                : 'cos\u03b8 costs a few percent; the shorter fibres buy several times the area ' +
                  '\u2014 paid for in shortening speed') + '</span>';
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
/* ==================================================================
   VIRTUAL MUSCLE LAB — a faithful port

   The model, the five conditions and the optimiser are transcribed from
   the app.py inside https://jimmartinutah.github.io/VML/app.json, and
   cross-checked against Marc's own earlier copy of the same code at
   EPHE 341/2026/2020/programs/app-8.py. Where the two differ the live
   version wins: the exact first-order activation step rather than Euler,
   mean power as net work × frequency, and the fl_effect switch.

   Reference values this has to reproduce, at the app's defaults
   (onset 22, offset 66, 2 Hz, 20 mm, and the stock muscle constants):

       FV, FL, and FT    27.147 J    54.295 W
       FV and FT         28.277 J    56.554 W
       FV and FL         31.705 J    63.410 W
       F-V Only          33.184 J    66.369 W
       Optimized         27.235 J    54.470 W   at onset 23, offset 66

   `scratchpad/vml_ref.py` is the python that produced those, and is the
   oracle the javascript was checked against.
   ================================================================== */

/* ---------------- the model ---------------- */
/* VML's own force-length is a Gaussian, NOT the piecewise sarcomere-overlap
   curve `flActive` that the rest of this deck teaches. Keep them separate:
   the other figures are about the overlap story, this one is about the app. */
function vmlFL(Lnorm) { return Math.exp(-((Lnorm - 1) * (Lnorm - 1)) / 0.5); }

/* p = { onset, offset, freq, excursion, L0, F0, Vx, af, tauA, tauD, fl } */
function thelenMuscle(p) {
  var onset = p.onset / 100, offset = p.offset / 100;
  var excursion = p.excursion / 1000;            /* mm -> m  */
  var tauA = p.tauA / 1000, tauD = p.tauD / 1000;/* ms -> s  */
  var freq = p.freq, L0 = p.L0, F0 = p.F0, Vx = p.Vx, af = p.af;
  var flOn = p.fl !== false;

  var onsetT = onset / freq, offsetT = offset / freq;
  var dt = 0.001 / freq;
  var V0 = Vx * L0;
  var PENN0 = 0.087, kShape = 0.5;
  var w = L0 * Math.sin(PENN0), cosP0 = Math.cos(PENN0);

  /* np.arange(0, 1.25/freq + dt, dt) — always 1251 samples, whatever the
     frequency, because dt scales with it */
  var n = 1251;
  var t = new Float64Array(n), pct = new Float64Array(n);
  var pos = new Float64Array(n), vel = new Float64Array(n);
  var exc = new Float64Array(n), act = new Float64Array(n);
  var force = new Float64Array(n), power = new Float64Array(n);
  var i, tt;

  for (i = 0; i < n; i++) {
    tt = i * dt;
    t[i] = tt;
    pct[i] = tt * freq * 100;
    pos[i] = excursion * Math.sin(2 * Math.PI * freq * tt);
    exc[i] = (tt >= onsetT && tt <= offsetT) ? 1 : 0;
  }
  for (i = 1; i < n; i++) {
    var u = exc[i - 1], a = act[i - 1];
    var tau = u >= a ? tauA : tauD;
    act[i] = u + (a - u) * Math.exp(-dt / tau);
  }

  var workTot = 0, workPos = 0, workNeg = 0;
  for (i = 0; i < n; i++) {
    var penn = Math.asin(w / (pos[i] + L0));
    var mlNorm = (pos[i] / cosP0 + L0) / L0;
    var v = (-2 * Math.PI * freq * excursion * Math.cos(2 * Math.PI * freq * t[i])) /
            Math.cos(penn);
    vel[i] = v;
    var V0activ = (Vx / 2) + (Vx / 2) * act[i];
    var vNorm = v / (V0 * V0activ / Vx);
    var fl = flOn ? Math.exp(-((mlNorm - 1) * (mlNorm - 1)) / kShape) : 1;
    var fv;
    if (v > V0 * V0activ) fv = 0;
    else if (vNorm > 0) fv = (1 - vNorm) / (1 + vNorm / af);
    else fv = 1.8 - (0.8 * (1 + v / V0)) / (1 - 7.56 * 0.21 * v / V0);
    force[i] = act[i] * F0 * fl * fv;
    power[i] = force[i] * v;
    var dW = force[i] * v * dt;
    workTot += dW;
    if (dW > 0) workPos += dW; else if (dW < 0) workNeg += dW;
  }

  return { n: n, dt: dt, t: t, pct: pct, pos: pos, vel: vel, exc: exc, act: act,
           force: force, power: power,
           workTot: workTot, workPos: workPos, workNeg: workNeg,
           powerTot: workTot * freq, powerPos: workPos * freq,
           powerNeg: workNeg * freq };
}

/* coordinate descent on onset/offset, maximising NET WORK — the app scores on
   work_actual, not power, though with power = work x freq they agree */
function thelenOpt(base) {
  function run(on, off) {
    return thelenMuscle({ onset: on, offset: off, freq: base.freq,
                          excursion: base.excursion, L0: base.L0, F0: base.F0,
                          Vx: base.Vx, af: base.af, tauA: base.tauA, tauD: base.tauD });
  }
  function bestOffset(on) {
    var b = null, best = -Infinity, o, r;
    for (o = on + 5; o < 100; o += 5) {
      r = run(on, o); if (r.workTot > best) { b = o; best = r.workTot; }
    }
    if (b === null) return null;
    best = -Infinity; var fine = b;
    for (o = Math.max(on + 1, b - 5); o < Math.min(100, b + 6); o++) {
      r = run(on, o); if (r.workTot > best) { fine = o; best = r.workTot; }
    }
    return fine;
  }
  function bestOnset(off) {
    var b = null, best = -Infinity, o, r;
    for (o = 0; o < Math.min(75, off); o += 5) {
      r = run(o, off); if (r.workTot > best) { b = o; best = r.workTot; }
    }
    if (b === null) return null;
    best = -Infinity; var fine = b;
    for (o = Math.max(0, b - 5); o < Math.min(off, b + 6); o++) {
      r = run(o, off); if (r.workTot > best) { fine = o; best = r.workTot; }
    }
    return fine;
  }
  var curOn = 25, curOff = bestOffset(curOn);
  if (curOff === null) return null;
  for (var k = 0; k < 5; k++) {
    var nOn = bestOnset(curOff); if (nOn === null) nOn = curOn;
    var nOff = bestOffset(nOn); if (nOff === null) nOff = curOff;
    if (nOn === curOn && nOff === curOff) break;
    curOn = nOn; curOff = nOff;
  }
  var r2 = run(curOn, curOff);
  r2.bestOnset = curOn; r2.bestOffset = curOff;
  return r2;
}

/* chips() is an exclusive picker; these four are independent switches, so
   they need their own little helper that toggles rather than selects */
function toggles(host, items, state, onPick) {
  var row = el('div', 'icalc-chips');
  items.forEach(function (it) {
    var b = el('button', 'icalc-chip' + (state[it[0]] ? ' on' : ''));
    b.innerHTML = it[1];
    b.addEventListener('click', function () {
      state[it[0]] = !state[it[0]];
      b.classList.toggle('on', !!state[it[0]]);
      onPick(it[0]);
    });
    row.appendChild(b);
  });
  host.appendChild(row); return row;
}

D.register('vml', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 1480, h: port ? 520 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  /* ---- state: the app's eleven controls, same labels and defaults ---- */
  var S = { onset: 22, offset: 66, excursion: 20, freq: 2.0,
            L0: 0.084, F0: 1871, Vx: 10, af: 0.30, tauA: 10, tauD: 40,
            optimize: false, showLoop: false, labels: true };
  var tab = 'fvp';                 /* fvp | loop | fv */
  var scrub = 1.0;                 /* fraction of the record revealed, tab 2 */
  var R = null, optCache = null, optKey = '', optPending = null, optStale = false;

  function paramKey() {
    return [S.freq, S.excursion, S.L0, S.F0, S.Vx, S.af, S.tauA, S.tauD].join(',');
  }
  function compute() {
    var base = { onset: S.onset, offset: S.offset, freq: S.freq, excursion: S.excursion,
                 L0: S.L0, F0: S.F0, Vx: S.Vx, af: S.af, tauA: S.tauA, tauD: S.tauD };
    var sim = thelenMuscle(base);
    var fvft = thelenMuscle(Object.assign({}, base, { fl: false }));
    var theoP = Object.assign({}, base, { onset: 25, offset: 75, tauA: 0.001, tauD: 0.001 });
    var theo = thelenMuscle(theoP);
    var fvonly = thelenMuscle(Object.assign({}, theoP, { fl: false }));
    /* The optimiser runs a couple of hundred simulations, which is about a
       tenth of a second — fine on a click, far too slow to do on every input
       event while a slider is being dragged. So draw straight away with the
       stale row and recompute once the slider settles. */
    var opt = null;
    if (S.optimize) {
      var k = paramKey();
      if (optKey === k && optCache) { opt = optCache; optStale = false; }
      else {
        opt = optCache; optStale = true;
        if (optPending) clearTimeout(optPending);
        optPending = setTimeout(function () {
          optPending = null;
          optCache = thelenOpt(base); optKey = k; optStale = false;
          draw();
        }, 180);
      }
    } else { optStale = false; }
    R = { sim: sim, fvft: fvft, theo: theo, fvonly: fvonly, opt: opt };
  }

  /* ---------------- drawing helpers ---------------- */
  function bounds(arrs, lo, hi) {
    var mn = Infinity, mx = -Infinity;
    arrs.forEach(function (A) {
      for (var i = 0; i < A.length; i++) { if (A[i] < mn) mn = A[i]; if (A[i] > mx) mx = A[i]; }
    });
    if (lo != null) mn = Math.min(mn, lo);
    if (hi != null) mx = Math.max(mx, hi);
    if (mx - mn < 1e-9) { mx = mn + 1; }
    var pad = (mx - mn) * 0.10;
    return [mn - pad, mx + pad];
  }

  /* one small panel: y against % of cycle */
  function panel(x0, y0, w, h, title, series, upto) {
    var c = ax.c, K = C(), i;
    var arrs = series.map(function (s) { return s.y; });
    var b = bounds(arrs);
    var PL = 54, PB = 26, PT = 22, PR = 12;
    function X(p) { return x0 + PL + p / 125 * (w - PL - PR); }
    function Y(v) { return y0 + h - PB - (v - b[0]) / (b[1] - b[0]) * (h - PB - PT); }

    /* the eccentric / concentric halves, which are always 25 % and 75 % */
    if (S.labels) {
      c.save(); c.fillStyle = K.FILL; c.globalAlpha = 0.5;
      c.fillRect(X(0), y0 + PT, X(25) - X(0), h - PB - PT);
      c.fillRect(X(75), y0 + PT, X(125) - X(75), h - PB - PT);
      c.restore();
    }
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + PL, y0 + PT); c.lineTo(x0 + PL, y0 + h - PB);
    c.lineTo(x0 + w - PR, y0 + h - PB); c.stroke(); c.restore();
    if (b[0] < 0 && b[1] > 0) {
      c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .45; c.setLineDash([3, 4]);
      c.beginPath(); c.moveTo(x0 + PL, Y(0)); c.lineTo(x0 + w - PR, Y(0)); c.stroke(); c.restore();
    }
    axisTicks(b[0], b[1]).forEach(function (v) {
      if (v < b[0] || v > b[1]) return;
      var span = b[1] - b[0];
      var dp = span >= 200 ? 0 : (span >= 20 ? 0 : (span >= 2 ? 1 : (span >= 0.2 ? 2 : 3)));
      label(c, num(v, dp), x0 + PL - 6, Y(v), { color: K.MUT, size: 10.5, align: 'right' });
    });
    [0, 25, 50, 75, 100, 125].forEach(function (p) {
      label(c, fmt(p, 0), X(p), y0 + h - PB + 11, { color: K.MUT, size: 10, align: 'center' });
    });
    series.forEach(function (s) {
      var lim = (upto == null || s.full)
        ? s.y.length - 1
        : Math.min(s.y.length - 1, Math.round(upto * (s.y.length - 1)));
      c.save(); c.strokeStyle = s.c; c.lineWidth = s.w || 2.2;
      if (s.dash) c.setLineDash(s.dash);
      c.beginPath();
      for (i = 0; i <= lim; i++) {
        var px = X(s.x[i]), py = Y(s.y[i]);
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke(); c.restore();
    });
    label(c, title, x0 + PL, y0 + 11, { color: K.INK, size: 12.5, align: 'left' });
    return { X: X, Y: Y, b: b };
  }

  /* the work loop: force against excursion */
  function loopPanel(x0, y0, w, h, upto, arrows) {
    var c = ax.c, K = C(), i;
    var sim = R.sim;
    var bx = bounds([sim.pos]), by = bounds([sim.force, R.theo.force], 0);
    var PL = 58, PB = 34, PT = 24, PR = 14;
    function X(v) { return x0 + PL + (v - bx[0]) / (bx[1] - bx[0]) * (w - PL - PR); }
    function Y(v) { return y0 + h - PB - (v - by[0]) / (by[1] - by[0]) * (h - PB - PT); }
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + PL, y0 + PT); c.lineTo(x0 + PL, y0 + h - PB);
    c.lineTo(x0 + w - PR, y0 + h - PB); c.stroke(); c.restore();
    axisTicks(by[0], by[1]).forEach(function (v) {
      if (v < by[0] || v > by[1]) return;
      label(c, fmt(v, 0), x0 + PL - 6, Y(v), { color: K.MUT, size: 10.5, align: 'right' });
    });
    axisTicks(bx[0] * 1000, bx[1] * 1000).forEach(function (v) {
      if (v / 1000 < bx[0] || v / 1000 > bx[1]) return;
      label(c, fmt(v, 0), X(v / 1000), y0 + h - PB + 12, { color: K.MUT, size: 10, align: 'center' });
    });
    label(c, 'excursion (mm)   ← shorter    longer →', x0 + (PL + w) / 2, y0 + h - 8,
          { color: K.MUT, size: 11, align: 'center' });

    /* the theoretical loop sits behind, for comparison */
    c.save(); c.strokeStyle = K.ORG; c.globalAlpha = .55; c.lineWidth = 1.8;
    c.setLineDash([5, 4]); c.beginPath();
    for (i = 0; i < R.theo.n; i++) {
      var tx = X(R.theo.pos[i]), ty = Y(R.theo.force[i]);
      i ? c.lineTo(tx, ty) : c.moveTo(tx, ty);
    }
    c.stroke(); c.restore();

    var lim = upto == null ? sim.n - 1 : Math.min(sim.n - 1, Math.round(upto * (sim.n - 1)));
    if (upto == null || upto >= 0.999) {
      c.save();
      c.fillStyle = sim.workTot >= 0 ? 'rgba(74,222,128,0.14)' : 'rgba(248,113,113,0.14)';
      c.beginPath();
      for (i = 0; i <= lim; i++) {
        var fx = X(sim.pos[i]), fy = Y(sim.force[i]);
        i ? c.lineTo(fx, fy) : c.moveTo(fx, fy);
      }
      c.closePath(); c.fill(); c.restore();
    }
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 2.8; c.beginPath();
    for (i = 0; i <= lim; i++) {
      var qx = X(sim.pos[i]), qy = Y(sim.force[i]);
      i ? c.lineTo(qx, qy) : c.moveTo(qx, qy);
    }
    c.stroke(); c.restore();

    if (arrows) {
      [0.14, 0.40, 0.64, 0.90].forEach(function (f) {
        var i0 = Math.round(f * lim), i1 = Math.min(lim, i0 + 8);
        if (i1 <= i0) return;
        arrow(c, X(sim.pos[i0]), Y(sim.force[i0]), X(sim.pos[i1]), Y(sim.force[i1]),
              { color: K.BLUE, width: 2.2, head: 10 });
      });
    }
    if (upto != null && upto < 0.999) {
      c.save(); c.fillStyle = K.ACC; c.strokeStyle = K.PLATE; c.lineWidth = 2;
      c.beginPath(); c.arc(X(sim.pos[lim]), Y(sim.force[lim]), 6, 0, 7); c.fill(); c.stroke();
      c.restore();
    }
    label(c, 'Work loop — force (N) against excursion', x0 + PL, y0 + 12,
          { color: K.INK, size: 12.5, align: 'left' });
    return { X: X, Y: Y };
  }

  /* ---------------- tab 1 ---------------- */
  function drawFVP() {
    var W = ax.W, H = ax.H;
    var sim = R.sim, theo = R.theo;
    var P = sim.pct, T = theo.pct;
    /* A phone gets the two panels that carry the argument, stacked. Four
       panels at this width are unreadable, and the app is a lab tool. */
    if (port) {
      var hh = S.showLoop ? H / 3 : H / 2;
      panel(0, 0, W, hh, 'Force (N)',
            [{ x: T, y: theo.force, c: C().ORG, dash: [5, 4], w: 1.8 },
             { x: P, y: sim.force, c: C().BLUE }]);
      panel(0, hh, W, hh, 'Power (W)',
            [{ x: T, y: theo.power, c: C().ORG, dash: [5, 4], w: 1.8 },
             { x: P, y: sim.power, c: C().ACC }]);
      if (S.showLoop) loopPanel(0, hh * 2, W, H - hh * 2, null, true);
      return;
    }
    var gw = S.showLoop ? W * 0.62 : W;
    var pw = gw / 2, ph = H / 2;
    panel(0, 0, pw, ph, 'Position (m)',
          [{ x: T, y: theo.pos, c: C().ORG, dash: [5, 4], w: 1.8 },
           { x: P, y: sim.pos, c: C().BLUE }]);
    panel(pw, 0, pw, ph, 'Velocity (m/s)   ·   shaded = lengthening, 0–25 % and 75–125 %',
          [{ x: T, y: theo.vel, c: C().ORG, dash: [5, 4], w: 1.8 },
           { x: P, y: sim.vel, c: C().GRN }]);
    panel(0, ph, pw, ph, 'Force (N)',
          [{ x: T, y: theo.force, c: C().ORG, dash: [5, 4], w: 1.8 },
           { x: P, y: sim.force, c: C().BLUE }]);
    panel(pw, ph, pw, ph, 'Power (W)',
          [{ x: T, y: theo.power, c: C().ORG, dash: [5, 4], w: 1.8 },
           { x: P, y: sim.power, c: C().ACC }]);
    if (S.showLoop) loopPanel(gw, H * 0.12, W - gw, H * 0.76, null, true);
  }

  /* ---------------- tab 2 ---------------- */
  function drawLoopTab() {
    var W = ax.W, H = ax.H, K = C();
    var sim = R.sim;
    if (port) {
      loopPanel(0, 0, W, H * 0.56, scrub, true);
      var pp = panel(0, H * 0.56, W, H * 0.42, 'Force (N) — drag to scrub',
                     [{ x: sim.pct, y: sim.force, c: K.MUT, w: 1.4, full: true },
                      { x: sim.pct, y: sim.force, c: K.BLUE, w: 2.8 }], scrub);
      var cc = ax.c, cx2 = pp.X(scrub * 125);
      cc.save(); cc.strokeStyle = K.ACC; cc.lineWidth = 1.6;
      cc.beginPath(); cc.moveTo(cx2, H * 0.56); cc.lineTo(cx2, H * 0.98); cc.stroke(); cc.restore();
      return;
    }
    var lw = W * 0.46;
    loopPanel(0, 0, lw, H, scrub, true);
    var p = panel(lw, H * 0.04, W - lw, H * 0.44, 'Force (N) — click to scrub',
                  [{ x: sim.pct, y: sim.force, c: K.MUT, w: 1.4, full: true },
                   { x: sim.pct, y: sim.force, c: K.BLUE, w: 2.8 }], scrub);
    panel(lw, H * 0.52, W - lw, H * 0.44, 'Power (W)',
          [{ x: sim.pct, y: sim.power, c: K.MUT, w: 1.4, full: true },
           { x: sim.pct, y: sim.power, c: K.ACC, w: 2.8 }], scrub);
    var c = ax.c;
    var cx = p.X(scrub * 125);
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(cx, H * 0.04); c.lineTo(cx, H * 0.96); c.stroke(); c.restore();
    label(c, 'click or drag on the force graph to reveal the record up to that point',
          lw + 54, H - 6, { color: K.MUT, size: 11, align: 'left' });
  }

  /* ---------------- tab 3 ---------------- */
  function drawFV() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H, i;
    var V0 = S.Vx * S.L0;
    /* the curves at optimal length and full activation, which is what the app
       plots: activation = 1, so V0_activ = Vx and v_norm = v / V0 */
    var vmin = -0.6 * V0, vmax = 1.05 * V0;
    function F(v) {
      var vn = v / V0;
      if (v > V0 * S.Vx) return 0;
      if (vn > 0) return Math.max(0, (1 - vn) / (1 + vn / S.af)) * S.F0;
      return (1.8 - (0.8 * (1 + vn)) / (1 - 7.56 * 0.21 * vn)) * S.F0;
    }
    var PL = 86, PR = 92, PT = 40, PB = 56;
    var Fmax = 1.85 * S.F0;
    var Pmax = 0;
    for (i = 0; i <= 400; i++) {
      var vv = vmin + (vmax - vmin) * i / 400;
      if (vv > 0) Pmax = Math.max(Pmax, F(vv) * vv);
    }
    Pmax *= 1.25;
    function X(v) { return PL + (v - vmin) / (vmax - vmin) * (W - PL - PR); }
    function YF(f) { return H - PB - f / Fmax * (H - PB - PT); }
    function YP(p) { return H - PB - p / Pmax * (H - PB - PT); }

    /* the band of velocities this cycle actually visits */
    var lo = Infinity, hi = -Infinity;
    for (i = 0; i < R.sim.n; i++) {
      if (R.sim.vel[i] < lo) lo = R.sim.vel[i];
      if (R.sim.vel[i] > hi) hi = R.sim.vel[i];
    }
    c.save(); c.fillStyle = K.FILL; c.globalAlpha = .75;
    c.fillRect(X(Math.max(lo, vmin)), PT, X(Math.min(hi, vmax)) - X(Math.max(lo, vmin)),
               H - PB - PT);
    c.restore();
    label(c, 'velocities this cycle visits', (X(Math.max(lo, vmin)) + X(Math.min(hi, vmax))) / 2,
          PT - 12, { color: K.MUT, size: 12, align: 'center', plate: true });

    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(PL, PT); c.lineTo(PL, H - PB); c.lineTo(W - PR, H - PB);
    c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .5; c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(X(0), PT); c.lineTo(X(0), H - PB); c.stroke(); c.restore();
    label(c, 'isometric', X(0), H - PB - 14,
          { color: K.MUT, size: 11, align: 'center', plate: true });
    label(c, '← lengthening', X(0) - 16, H - PB + 30, { color: K.MUT, size: 12, align: 'right' });
    label(c, 'shortening →', X(0) + 16, H - PB + 30, { color: K.MUT, size: 12, align: 'left' });

    axisTicks(0, Fmax).forEach(function (f) {
      if (f < 0 || f > Fmax) return;
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
      c.beginPath(); c.moveTo(PL, YF(f)); c.lineTo(W - PR, YF(f)); c.stroke(); c.restore();
      label(c, fmt(f, 0), PL - 8, YF(f), { color: K.BLUE, size: 11, align: 'right' });
    });
    axisTicks(0, Pmax).forEach(function (p) {
      if (p < 0 || p > Pmax) return;
      label(c, fmt(p, 0), W - PR + 8, YP(p), { color: K.GRN, size: 11, align: 'left' });
    });
    [-0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      var v = f * V0;
      if (v < vmin || v > vmax) return;
      label(c, fmt(v, 2), X(v), H - PB + 12, { color: K.MUT, size: 10.5, align: 'center' });
    });
    label(c, 'Fibre velocity (m/s)', (PL + W - PR) / 2, H - 8,
          { color: K.INK, size: 12.5, align: 'center' });
    label(c, 'Force (N)', PL - 8, PT - 8, { color: K.BLUE, size: 12.5, align: 'right' });
    label(c, 'Power (W)', W - PR + 8, PT - 8, { color: K.GRN, size: 12.5, align: 'left' });

    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 3; c.beginPath();
    for (i = 0; i <= 400; i++) {
      var v1 = vmin + (vmax - vmin) * i / 400;
      var y1 = YF(Math.max(0, F(v1)));
      i ? c.lineTo(X(v1), y1) : c.moveTo(X(v1), y1);
    }
    c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.GRN; c.lineWidth = 3; c.beginPath();
    var first = true, pkv = 0, pkp = 0;
    for (i = 0; i <= 400; i++) {
      var v2 = vmin + (vmax - vmin) * i / 400;
      if (v2 < 0) continue;
      var pw2 = F(v2) * v2;
      if (pw2 > pkp) { pkp = pw2; pkv = v2; }
      if (first) { c.moveTo(X(v2), YP(pw2)); first = false; } else c.lineTo(X(v2), YP(pw2));
    }
    c.stroke(); c.restore();
    c.save(); c.fillStyle = K.GRN;
    c.beginPath(); c.arc(X(pkv), YP(pkp), 5, 0, 7); c.fill(); c.restore();
    label(c, 'peak power ' + fmt(pkp, 0) + ' W at ' + fmt(pkv, 2) + ' m/s',
          X(pkv) + 10, YP(pkp) - 6, { color: K.GRN, size: 12, align: 'left', plate: true });
    key(c, PL + 16, PT + 44, [[K.BLUE, 'force–velocity'], [K.GRN, 'power–velocity']],
        { size: 12 });
  }

  /* the deck's two-column control grid: eleven controls will not fit in a
     single stack and still leave room for the figure */
  u.ctl.classList.add('g2', 'vml-ctl');

  /* ---------------- the metrics table ---------------- */
  var tableHost = el('div', 'vml-table');
  u.ctl.appendChild(tableHost);
  var ROWS = [['sim', 'FV, FL, and FT', 'BLUE'], ['fvft', 'FV and FT', 'VIO'],
              ['theo', 'FV and FL', 'ORG'], ['fvonly', 'F-V Only', 'MUT'],
              ['opt', 'Optimized', 'GRN']];
  function drawTable() {
    var K = C();
    var h = '<div class="ditable-wrap"><table class="ditable vml"><tr><th></th>' +
            '<th>Work net<br>(J)</th><th>Work +<br>(J)</th><th>Work −<br>(J)</th>' +
            '<th>Power mean<br>(W)</th><th>Power +<br>(W)</th><th>Power −<br>(W)</th></tr>';
    ROWS.forEach(function (row) {
      var r = R[row[0]];
      if (!r) return;
      var nm = row[1];
      if (row[0] === 'opt') {
        nm += ' <span style="opacity:.7">(' + r.bestOnset + ' / ' + r.bestOffset + ')</span>';
        if (optStale) nm += ' <span style="opacity:.5">· recomputing</span>';
      }
      h += '<tr><th style="color:' + K[row[2]] + '">' + nm + '</th>' +
           '<td>' + num(r.workTot, 2) + '</td><td>' + num(r.workPos, 2) + '</td>' +
           '<td>' + num(r.workNeg, 2) + '</td><td>' + num(r.powerTot, 1) + '</td>' +
           '<td>' + num(r.powerPos, 1) + '</td><td>' + num(r.powerNeg, 1) + '</td></tr>';
    });
    h += '</table></div>';
    tableHost.innerHTML = h;
  }

  /* ---------------- draw ---------------- */
  var out = readout(u.ctl);
  function draw() {
    compute();
    ax.clear();
    if (tab === 'fvp') drawFVP();
    else if (tab === 'loop') drawLoopTab();
    else drawFV();
    drawTable();
    var sim = R.sim, ceil = R.fvonly;
    var costFL = ceil.workTot - R.theo.workTot;    /* FL on, timing perfect   */
    var costFT = ceil.workTot - R.fvft.workTot;    /* timing real, FL off     */
    out.innerHTML = 'Net work <b>' + num(sim.workTot, 2) + ' J</b> per cycle, mean power <b>' +
      num(sim.powerTot, 1) + ' W</b>, against a force–velocity ceiling of <b>' +
      num(ceil.workTot, 2) + ' J</b>.' +
      '<span style="opacity:.72">  ·  force–length costs <b>' + num(costFL, 2) +
      ' J</b>; the time it takes to switch on and off costs <b>' + num(costFT, 2) +
      ' J</b></span>';
  }

  /* ---------------- controls ---------------- */
  var row1 = ctlRow(u.ctl);
  keepOut(seg(row1, [['fvp', 'Force, Velocity, Power'], ['loop', 'Workloop'],
                     ['fv', 'Force–Velocity']], 'fvp',
    function (k) { tab = k; draw(); }));
  var SW = { optimize: S.optimize, showLoop: S.showLoop, labels: S.labels, adv: false };
  keepOut(toggles(row1, [['optimize', 'Optimise'], ['showLoop', 'Show loop'],
                         ['labels', 'Ecc/con'], ['adv', 'Constants']], SW,
    function (k) {
      S.optimize = SW.optimize; S.showLoop = SW.showLoop; S.labels = SW.labels;
      adv.style.display = SW.adv ? '' : 'none';
      draw();
    }));

  var sOn = slider(u.ctl, 'Onset', 0, 30, 1, S.onset,
    function (v) { return fmt(v, 0) + '%'; }, function (v) { S.onset = v; draw(); });
  var sOff = slider(u.ctl, 'Offset', 25, 75, 1, S.offset,
    function (v) { return fmt(v, 0) + '%'; }, function (v) { S.offset = v; draw(); });
  slider(u.ctl, 'Excursion', 1, 40, 1, S.excursion,
    function (v) { return fmt(v, 0) + ' mm'; }, function (v) { S.excursion = v; draw(); });
  slider(u.ctl, 'Cycle frequency', 0.5, 5.0, 0.5, S.freq,
    function (v) { return fmt(v, 1) + ' Hz'; }, function (v) { S.freq = v; draw(); });

  var adv = el('div', 'vml-adv');
  adv.style.display = 'none';
  u.ctl.appendChild(adv);
  slider(adv, 'Optimal length', 0.04, 0.16, 0.002, S.L0,
    function (v) { return fmt(v, 3) + ' m'; }, function (v) { S.L0 = v; draw(); });
  slider(adv, 'Max isometric force', 200, 4000, 1, S.F0,
    function (v) { return fmt(v, 0) + ' N'; }, function (v) { S.F0 = v; draw(); });
  slider(adv, 'Max velocity', 2, 20, 0.5, S.Vx,
    function (v) { return fmt(v, 1) + ' L₀/s'; }, function (v) { S.Vx = v; draw(); });
  slider(adv, 'F–V curvature', 0.1, 1.0, 0.01, S.af,
    function (v) { return fmt(v, 2); }, function (v) { S.af = v; draw(); });
  slider(adv, 'Activation time', 1, 60, 1, S.tauA,
    function (v) { return fmt(v, 0) + ' ms'; }, function (v) { S.tauA = v; draw(); });
  slider(adv, 'Deactivation time', 1, 120, 1, S.tauD,
    function (v) { return fmt(v, 0) + ' ms'; }, function (v) { S.tauD = v; draw(); });

  /* scrubbing on tab 2 */
  u.cv.setAttribute('data-prevent-swipe', '');
  u.cv.style.touchAction = 'none';
  function scrubAt(e) {
    if (tab !== 'loop') return;
    var r = u.cv.getBoundingClientRect();
    var fx = (e.clientX - r.left) / r.width * ax.W;
    var lw = port ? 0 : ax.W * 0.46, PL = 54, PR = 12;
    var p = (fx - (lw + PL)) / ((ax.W - lw) - PL - PR);
    scrub = Math.max(0.01, Math.min(1, p));
    draw();
  }
  var down = false;
  u.cv.addEventListener('pointerdown', function (e) {
    if (tab !== 'loop') return;
    down = true; scrubAt(e);
    if (u.cv.setPointerCapture && e.pointerId != null) { try { u.cv.setPointerCapture(e.pointerId); } catch (x) {} }
  });
  u.cv.addEventListener('pointermove', function (e) { if (down) { scrubAt(e); e.preventDefault(); } });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    u.cv.addEventListener(ev, function () { down = false; });
  });

  node._draw = draw;
  draw();
});
D.boot();
})();
