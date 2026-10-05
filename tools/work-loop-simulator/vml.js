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

/* chips() is an exclusive picker; these four are independent switches. They
   are drawn as clickable text with a tick box rather than as pill buttons,
   which is what the app's sidebar looks like. The `icalc-chip` class stays on
   them so fit.js's keepOut() still recognises them. */
function toggles(host, items, state, onPick) {
  var row = el('div', 'vml-switches');
  items.forEach(function (it) {
    var b = el('button', 'icalc-chip vml-switch' + (state[it[0]] ? ' on' : ''));
    b.type = 'button';
    var box = el('span', 'vml-box');
    var lab = el('span', 'vml-swlab'); lab.innerHTML = it[1];
    b.appendChild(box); b.appendChild(lab);
    b.setAttribute('aria-pressed', state[it[0]] ? 'true' : 'false');
    b.addEventListener('click', function () {
      state[it[0]] = !state[it[0]];
      b.classList.toggle('on', !!state[it[0]]);
      b.setAttribute('aria-pressed', state[it[0]] ? 'true' : 'false');
      onPick(it[0]);
    });
    row.appendChild(b);
  });
  host.appendChild(row); return row;
}

D.register('vml', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  /* The figure is rebuilt at whatever width the stage currently has, so that
     collapsing the sidebar makes the panels WIDER rather than taller. Letting
     a fixed-aspect canvas stretch would grow its height too, and the slide
     would stop fitting the moment the sidebar went away. */
  var AXH = port ? 500 : 400;
  var ax = null;
  function sizeAxes() {
    /* offsetWidth, not getBoundingClientRect: it is the layout width before
       reveal's transform AND before fit.js's zoom. Measuring the rendered
       width instead sets up a feedback loop — the canvas shrinks, the slide
       shrinks, the canvas shrinks again — that settles at about 0.68. */
    var w = port ? 460 : Math.max(620, Math.round(u.stage.offsetWidth) || 1180);
    if (ax && Math.abs(ax.W - w) < 2) return;
    ax = new Axes(u.cv, { w: w, h: AXH, padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
    u.cv.style.maxWidth = 'none';
    u.cv.style.width = '100%';
  }

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
    var forces = [sim.force, R.theo.force];
    if (R.opt) forces.push(R.opt.force);
    var bx = bounds([sim.pos]), by = bounds(forces, 0);
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

    /* and the optimised loop, when the switch is on — same colour as its row
       in the table, so the table doubles as the key */
    if (R.opt) {
      c.save(); c.strokeStyle = K.GRN; c.globalAlpha = .9; c.lineWidth = 2.1;
      c.beginPath();
      for (i = 0; i < R.opt.n; i++) {
        var ox = X(R.opt.pos[i]), oy = Y(R.opt.force[i]);
        i ? c.lineTo(ox, oy) : c.moveTo(ox, oy);
      }
      c.stroke(); c.restore();
    }

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
    var sim = R.sim, theo = R.theo, O = R.opt;
    var P = sim.pct, T = theo.pct;
    /* The optimised cycle only differs in force and power: position and
       velocity are set by excursion and frequency, so an opt trace on those
       two panels would sit exactly on top of the blue one. */
    function optS(k) { return O ? [{ x: O.pct, y: O[k], c: C().GRN, w: 2.1 }] : []; }
    /* A phone gets the two panels that carry the argument, stacked. Four
       panels at this width are unreadable, and the app is a lab tool. */
    if (port) {
      var hh = S.showLoop ? H / 3 : H / 2;
      panel(0, 0, W, hh, 'Force (N)',
            [{ x: T, y: theo.force, c: C().ORG, dash: [5, 4], w: 1.8 }]
              .concat(optS('force'), [{ x: P, y: sim.force, c: C().BLUE }]));
      panel(0, hh, W, hh, 'Power (W)',
            [{ x: T, y: theo.power, c: C().ORG, dash: [5, 4], w: 1.8 }]
              .concat(optS('power'), [{ x: P, y: sim.power, c: C().ACC }]));
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
          [{ x: T, y: theo.force, c: C().ORG, dash: [5, 4], w: 1.8 }]
            .concat(optS('force'), [{ x: P, y: sim.force, c: C().BLUE }]));
    panel(pw, ph, pw, ph, 'Power (W)',
          [{ x: T, y: theo.power, c: C().ORG, dash: [5, 4], w: 1.8 }]
            .concat(optS('power'), [{ x: P, y: sim.power, c: C().ACC }]));
    if (S.showLoop) loopPanel(gw, H * 0.12, W - gw, H * 0.76, null, true);
  }

  /* ---------------- tab 2 ---------------- */
  function drawLoopTab() {
    var W = ax.W, H = ax.H, K = C(), i;
    var sim = R.sim, O = R.opt;
    /* the optimised force runs full-length behind the scrubbed record */
    var optF = O ? [{ x: O.pct, y: O.force, c: K.GRN, w: 2.1, full: true }] : [];
    /* the loop's two axes are force and excursion, so those are the two
       traces worth showing beside it — power belongs on the first tab */
    var posMM = new Float64Array(sim.n);
    for (i = 0; i < sim.n; i++) posMM[i] = sim.pos[i] * 1000;
    if (port) {
      loopPanel(0, 0, W, H * 0.50, scrub, true);
      var pp = panel(0, H * 0.50, W, H * 0.26, 'Force (N) — drag to scrub',
                     [{ x: sim.pct, y: sim.force, c: K.MUT, w: 1.4, full: true }]
                       .concat(optF, [{ x: sim.pct, y: sim.force, c: K.BLUE, w: 2.8 }]), scrub);
      panel(0, H * 0.74, W, H * 0.26, 'Excursion (mm)',
            [{ x: sim.pct, y: posMM, c: K.MUT, w: 1.4, full: true },
             { x: sim.pct, y: posMM, c: K.VIO, w: 2.8 }], scrub);
      var cc = ax.c, cx2 = pp.X(scrub * 125);
      cc.save(); cc.strokeStyle = K.ACC; cc.lineWidth = 1.6;
      cc.beginPath(); cc.moveTo(cx2, H * 0.50); cc.lineTo(cx2, H * 0.99); cc.stroke(); cc.restore();
      return;
    }
    var lw = W * 0.46;
    loopPanel(0, 0, lw, H, scrub, true);
    var p = panel(lw, H * 0.04, W - lw, H * 0.44, 'Force (N) — click to scrub',
                  [{ x: sim.pct, y: sim.force, c: K.MUT, w: 1.4, full: true }]
                    .concat(optF, [{ x: sim.pct, y: sim.force, c: K.BLUE, w: 2.8 }]), scrub);
    panel(lw, H * 0.52, W - lw, H * 0.44, 'Excursion (mm)',
          [{ x: sim.pct, y: posMM, c: K.MUT, w: 1.4, full: true },
           { x: sim.pct, y: posMM, c: K.VIO, w: 2.8 }], scrub);
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

  /* ----------------------------------------------------------------
     Layout. The app is a sidebar beside a card, so build()'s stacked
     stage-then-controls shape is rearranged into that: controls down the
     left, and the tab strip, figure, table and readout stacked on the
     right. The sidebar collapses, which is what the app's does too.
     ---------------------------------------------------------------- */
  var wrap = u.ctl.parentNode;
  wrap.classList.add('vml-wrap');
  var main = el('div', 'vml-main');
  wrap.appendChild(main);
  var tabHost = el('div', 'vml-tabs');
  main.appendChild(tabHost);
  main.appendChild(u.stage);

  var side = el('div', 'vml-side-h');
  var sideTitle = el('span', 'vml-side-t', 'Controls');
  var collapse = el('button', 'vml-collapse');
  collapse.innerHTML = '&#x2039;&#x2039;';
  collapse.title = 'Hide the controls';
  collapse.setAttribute('aria-label', 'Hide the controls');
  collapse.addEventListener('click', function () {
    var off = wrap.classList.toggle('collapsed');
    collapse.innerHTML = off ? '&#x203A;&#x203A;' : '&#x2039;&#x2039;';
    collapse.title = off ? 'Show the controls' : 'Hide the controls';
    collapse.setAttribute('aria-label', collapse.title);
    /* the sidebar's flex-basis is animated, so remeasuring on the next frame
       catches it mid-transition and the canvas ends up stretched. Draw once
       straight away for responsiveness and again when the motion has ended. */
    requestAnimationFrame(function () { requestAnimationFrame(draw); });
    setTimeout(draw, 240);
  });
  side.appendChild(sideTitle); side.appendChild(collapse);
  u.ctl.appendChild(side);
  u.ctl.addEventListener('transitionend', function (e) {
    if (e.propertyName === 'flex-basis') draw();
  });

  /* ---------------- the metrics table ---------------- */
  var tableHost = el('div', 'vml-table');
  main.appendChild(tableHost);
  var ROWS = [['sim', 'FV, FL, and FT', 'BLUE'], ['fvft', 'FV and FT', 'VIO'],
              ['theo', 'FV and FL', 'ORG'], ['fvonly', 'F-V Only', 'MUT'],
              ['opt', 'Optimized', 'GRN']];
  function drawTable() {
    var K = C();
    var h = '<div class="ditable-wrap"><table class="ditable vml"><tr><th></th>' +
            '<th>Work net (J)</th><th>Work + (J)</th><th>Work − (J)</th>' +
            '<th>Power mean (W)</th><th>Power + (W)</th><th>Power − (W)</th></tr>';
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
  var out = readout(main);
  function draw() {
    sizeAxes();
    compute();
    ax.clear();
    if (tab === 'fvp') drawFVP();
    else if (tab === 'loop') drawLoopTab();
    else drawFV();
    drawTable();
    markOn(R.opt ? R.opt.bestOnset : null, optStale);
    markOff(R.opt ? R.opt.bestOffset : null, optStale);
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
  keepOut(seg(tabHost, [['fvp', 'Force, Velocity, Power'], ['loop', 'Interactive Workloop'],
                        ['fv', 'Force–Velocity']], 'fvp',
    function (k) { tab = k; draw(); }));
  var SW = { optimize: S.optimize, showLoop: S.showLoop, labels: S.labels, adv: false };
  keepOut(toggles(u.ctl, [['optimize', 'Optimize onset/offset'],
                          ['showLoop', 'Show workloop'],
                          ['labels', 'Ecc/con labels'],
                          ['adv', 'Muscle constants']], SW,
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

  /* A ghost thumb on the onset and offset tracks, showing where the optimiser
     wants them without moving the slider. The student's own thumb stays put —
     the gap between the two rings is the whole point, and once they close it
     the ring sits around the thumb like a halo. */
  function optMark(sl) {
    var slot = el('div', 'vml-slot');
    sl.input.parentNode.insertBefore(slot, sl.input);
    slot.appendChild(sl.input);
    var ring = el('div', 'vml-optmark');
    slot.insertBefore(ring, sl.input);
    var lab = sl.row.querySelector('.ictl-l');
    var base = lab.innerHTML;
    var hint = el('span', 'vml-opthint');
    return function (v, stale) {
      if (v == null) { ring.className = 'vml-optmark'; lab.innerHTML = base; return; }
      var lo = parseFloat(sl.input.min), hi = parseFloat(sl.input.max);
      var tw = parseFloat(getComputedStyle(slot).getPropertyValue('--vml-thumb')) || 14;
      var f = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
      /* a range thumb's centre runs from tw/2 to W − tw/2, not 0 to W */
      ring.style.left = 'calc(' + (f * 100) + '% + ' + ((0.5 - f) * tw).toFixed(2) + 'px)';
      ring.className = 'vml-optmark on' + (stale ? ' stale' : '');
      hint.textContent = 'best ' + fmt(v, 0) + '%';
      lab.innerHTML = base;
      lab.appendChild(hint);
    };
  }
  var markOn = optMark(sOn), markOff = optMark(sOff);

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

  /* The sidebar's flex basis is not settled on the first paint, so the first
     measurement of the stage is wrong. Re-measure as the layout lands, and
     again whenever the window changes shape. sizeAxes() is a no-op once the
     width has stopped moving. */
  [80, 260, 620, 1200].forEach(function (ms) { setTimeout(draw, ms); });
  var rzT;
  window.addEventListener('resize', function () {
    clearTimeout(rzT); rzT = setTimeout(draw, 140);
  });
  window.addEventListener('ephe341-layout', function () { setTimeout(draw, 160); });
});
/* ======================================================================
   A REAL PEDAL STROKE
   Optotrak Certus motion capture of a cyclist on a treadmill, from the
   Moore/Kooijman/Schwab/Hubbard bicycle-rider dataset. One rider, one
   trial, 82 pedal revolutions averaged into 72 crank-phase bins.

   The KINEMATICS here are measured. The FORCE is not — this dataset has
   no pedal forces and no EMG — so the force comes from the same Thelen
   model as the first page, driven by the measured muscle length instead
   of a sine wave. That is the whole point of the page: the first one
   asks what a muscle does to an imposed cycle, this one imposes a cycle
   a real person actually produced.
   ====================================================================== */
var CYC = {"trial":"2005","rider":"Victor","height_m":1.84,"mass_kg":74,"bike":"stratos","speed_kmh":20.0,"gear":3,"cadence_rpm":82.0,"crank_r_m":0.1655,"n_phase":72,"fs_hz":100,"cycles":82.0,"markers":{"rfoot":[[0.0083,0.1734],[0.023,0.1722],[0.0375,0.1695],[0.0517,0.1653],[0.0655,0.1595],[0.0787,0.1524],[0.0908,0.1442],[0.1023,0.1346],[0.1131,0.1237],[0.1225,0.1122],[0.1304,0.1006],[0.1375,0.0884],[0.1436,0.0759],[0.1487,0.0628],[0.1529,0.0494],[0.1561,0.0352],[0.1581,0.021],[0.1592,0.0074],[0.1589,-0.0065],[0.1579,-0.0208],[0.1556,-0.0346],[0.1525,-0.0479],[0.1481,-0.0614],[0.1427,-0.0747],[0.1362,-0.0872],[0.1288,-0.0993],[0.1203,-0.1108],[0.1108,-0.1216],[0.1006,-0.1314],[0.0896,-0.1404],[0.0775,-0.1484],[0.0645,-0.1556],[0.0508,-0.1614],[0.0371,-0.1658],[0.0229,-0.1689],[0.0079,-0.1708],[-0.0074,-0.1711],[-0.0225,-0.1698],[-0.0375,-0.1671],[-0.0518,-0.1628],[-0.0652,-0.1574],[-0.0783,-0.1507],[-0.0909,-0.1427],[-0.1025,-0.1337],[-0.1134,-0.1234],[-0.123,-0.1124],[-0.1314,-0.1007],[-0.1386,-0.0882],[-0.1447,-0.0751],[-0.1496,-0.0618],[-0.1533,-0.0482],[-0.1558,-0.0346],[-0.1573,-0.0208],[-0.1577,-0.0069],[-0.1571,0.0067],[-0.1555,0.0204],[-0.1528,0.0341],[-0.1493,0.0476],[-0.145,0.0605],[-0.14,0.0727],[-0.1339,0.0849],[-0.127,0.0967],[-0.119,0.1082],[-0.1101,0.1194],[-0.1003,0.1298],[-0.0895,0.1394],[-0.0777,0.148],[-0.0652,0.1557],[-0.0518,0.1621],[-0.0374,0.1673],[-0.022,0.171],[-0.0066,0.1731]],"rankle":[[-0.0486,0.278],[-0.0369,0.2753],[-0.0255,0.2708],[-0.0143,0.2647],[-0.0035,0.257],[0.0064,0.2476],[0.0158,0.2371],[0.0246,0.2252],[0.0329,0.212],[0.0402,0.1985],[0.0463,0.1849],[0.0516,0.1709],[0.0562,0.1567],[0.0599,0.1422],[0.0627,0.1272],[0.0648,0.1118],[0.0659,0.0965],[0.0662,0.0821],[0.0654,0.0674],[0.0638,0.0526],[0.0612,0.0384],[0.0579,0.025],[0.0533,0.0115],[0.0478,-0.0015],[0.0415,-0.0136],[0.0342,-0.0249],[0.0262,-0.0354],[0.0174,-0.0449],[0.008,-0.0533],[-0.002,-0.0606],[-0.0127,-0.0668],[-0.0245,-0.0721],[-0.0364,-0.0758],[-0.0485,-0.0782],[-0.0607,-0.0791],[-0.0737,-0.0788],[-0.0863,-0.0767],[-0.0988,-0.0734],[-0.1112,-0.0686],[-0.1226,-0.0623],[-0.1333,-0.0551],[-0.1435,-0.0468],[-0.1533,-0.0373],[-0.162,-0.0266],[-0.1696,-0.0149],[-0.1759,-0.0023],[-0.1809,0.0108],[-0.1846,0.0246],[-0.1873,0.0389],[-0.1888,0.0534],[-0.1894,0.068],[-0.1891,0.0825],[-0.188,0.0969],[-0.1862,0.1113],[-0.1837,0.1253],[-0.1806,0.1391],[-0.1771,0.153],[-0.173,0.1664],[-0.1687,0.1791],[-0.164,0.191],[-0.1587,0.2029],[-0.153,0.2142],[-0.1467,0.2252],[-0.1397,0.2356],[-0.1323,0.2453],[-0.124,0.2539],[-0.115,0.2615],[-0.1055,0.2679],[-0.0953,0.273],[-0.0842,0.2767],[-0.0723,0.2789],[-0.0602,0.2794]],"rknee":[[0.2506,0.5783],[0.2529,0.5854],[0.2545,0.5905],[0.2554,0.5941],[0.2556,0.5957],[0.2554,0.5949],[0.2545,0.5924],[0.2532,0.5879],[0.2513,0.5816],[0.2491,0.5739],[0.2466,0.5654],[0.2438,0.5559],[0.2407,0.5457],[0.2371,0.5349],[0.2332,0.5233],[0.2285,0.5112],[0.2234,0.4989],[0.2179,0.4871],[0.2118,0.4748],[0.2051,0.4623],[0.1979,0.4499],[0.1903,0.4382],[0.182,0.426],[0.1732,0.4142],[0.1642,0.4031],[0.1549,0.3924],[0.1455,0.3823],[0.1361,0.373],[0.127,0.3645],[0.1183,0.3568],[0.1098,0.35],[0.1018,0.3438],[0.0947,0.3386],[0.0886,0.3343],[0.0835,0.331],[0.0791,0.3281],[0.0762,0.3264],[0.074,0.3254],[0.073,0.325],[0.0733,0.3255],[0.0741,0.3265],[0.0757,0.328],[0.0778,0.33],[0.0808,0.3327],[0.0845,0.336],[0.089,0.3398],[0.0941,0.3443],[0.0999,0.3493],[0.1061,0.355],[0.1127,0.3611],[0.1194,0.3677],[0.1263,0.3747],[0.1333,0.382],[0.1403,0.3898],[0.1472,0.3977],[0.1543,0.4061],[0.1612,0.4149],[0.1682,0.424],[0.1746,0.4331],[0.1808,0.4423],[0.1872,0.452],[0.1935,0.4619],[0.1997,0.4722],[0.2059,0.4829],[0.212,0.4938],[0.2179,0.505],[0.2237,0.5163],[0.2292,0.5274],[0.2345,0.5384],[0.2395,0.5495],[0.2439,0.5603],[0.2477,0.5703]],"rhip":[[-0.1735,0.8036],[-0.1737,0.8041],[-0.174,0.8043],[-0.1745,0.8046],[-0.1751,0.8045],[-0.1756,0.8043],[-0.1761,0.8039],[-0.1766,0.803],[-0.177,0.802],[-0.1771,0.8007],[-0.1771,0.7994],[-0.1771,0.798],[-0.1769,0.7966],[-0.1767,0.7952],[-0.1765,0.7938],[-0.1762,0.7925],[-0.1758,0.7913],[-0.1756,0.7903],[-0.1752,0.7892],[-0.175,0.7883],[-0.1748,0.7874],[-0.1747,0.7866],[-0.1745,0.7859],[-0.1745,0.7852],[-0.1744,0.7845],[-0.1743,0.784],[-0.1742,0.7834],[-0.1739,0.7828],[-0.1737,0.7823],[-0.1733,0.7819],[-0.173,0.7817],[-0.1727,0.7814],[-0.1721,0.7814],[-0.1718,0.7812],[-0.1715,0.7813],[-0.1713,0.7814],[-0.1712,0.7814],[-0.1711,0.7818],[-0.1712,0.782],[-0.1713,0.7822],[-0.1717,0.7824],[-0.1719,0.7828],[-0.1723,0.7831],[-0.1725,0.7836],[-0.1726,0.784],[-0.1728,0.7844],[-0.1729,0.7849],[-0.173,0.7854],[-0.1733,0.7858],[-0.1735,0.7863],[-0.1736,0.7869],[-0.1737,0.7875],[-0.174,0.7882],[-0.1742,0.789],[-0.1743,0.7897],[-0.1746,0.7906],[-0.1747,0.7914],[-0.1748,0.7922],[-0.175,0.793],[-0.1751,0.7938],[-0.1753,0.7946],[-0.1755,0.7953],[-0.1754,0.7962],[-0.1752,0.7969],[-0.1751,0.7978],[-0.1749,0.7987],[-0.1747,0.7996],[-0.1744,0.8004],[-0.1741,0.8012],[-0.174,0.8021],[-0.1736,0.8027],[-0.1736,0.8033]],"lfoot":[[0.0032,-0.1738],[-0.0121,-0.1726],[-0.0266,-0.1701],[-0.0409,-0.1661],[-0.0549,-0.1608],[-0.0687,-0.1539],[-0.0809,-0.1462],[-0.0927,-0.1372],[-0.1037,-0.127],[-0.1129,-0.1166],[-0.1209,-0.1058],[-0.1281,-0.0943],[-0.134,-0.0827],[-0.1392,-0.0703],[-0.1435,-0.0574],[-0.1465,-0.0441],[-0.1485,-0.0306],[-0.1495,-0.0174],[-0.1492,-0.0042],[-0.148,0.0097],[-0.1458,0.0232],[-0.1426,0.0364],[-0.1381,0.0496],[-0.1327,0.0629],[-0.1263,0.0756],[-0.1189,0.088],[-0.1104,0.0999],[-0.1012,0.1112],[-0.091,0.1216],[-0.08,0.1313],[-0.068,0.14],[-0.0552,0.148],[-0.0416,0.1546],[-0.028,0.1598],[-0.014,0.1637],[0.0007,0.1665],[0.0163,0.1673],[0.0314,0.1668],[0.0462,0.1648],[0.061,0.161],[0.0744,0.1561],[0.0879,0.1497],[0.1002,0.142],[0.1119,0.1329],[0.1232,0.1226],[0.133,0.1115],[0.1415,0.0997],[0.1491,0.0871],[0.1555,0.0738],[0.1605,0.0602],[0.1646,0.0463],[0.1674,0.0323],[0.1693,0.0182],[0.1697,0.0039],[0.1693,-0.01],[0.168,-0.0239],[0.1655,-0.0377],[0.1624,-0.0511],[0.158,-0.0638],[0.1533,-0.0759],[0.1469,-0.0877],[0.1396,-0.0993],[0.1315,-0.1104],[0.1224,-0.1211],[0.1125,-0.1311],[0.1016,-0.1403],[0.0897,-0.1487],[0.0768,-0.1561],[0.0632,-0.1623],[0.0489,-0.1673],[0.0332,-0.171],[0.0178,-0.1731]],"lankle":[[-0.0721,-0.0878],[-0.0848,-0.0844],[-0.0967,-0.0799],[-0.1083,-0.074],[-0.1195,-0.0667],[-0.1305,-0.0582],[-0.14,-0.049],[-0.1491,-0.0384],[-0.1572,-0.0268],[-0.1638,-0.0151],[-0.1693,-0.0032],[-0.1741,0.0094],[-0.1775,0.022],[-0.1804,0.0353],[-0.1824,0.0492],[-0.1833,0.0633],[-0.1832,0.0775],[-0.1822,0.0913],[-0.1806,0.1049],[-0.178,0.1192],[-0.1748,0.133],[-0.1708,0.1464],[-0.1658,0.1597],[-0.1604,0.1729],[-0.1542,0.1856],[-0.1475,0.1977],[-0.14,0.2093],[-0.1321,0.2201],[-0.1236,0.23],[-0.1147,0.2388],[-0.105,0.2467],[-0.0947,0.2538],[-0.0841,0.2591],[-0.0734,0.2632],[-0.0624,0.2655],[-0.0509,0.2668],[-0.0386,0.2658],[-0.0266,0.2635],[-0.0151,0.2595],[-0.0036,0.2534],[0.007,0.2465],[0.0176,0.2378],[0.027,0.2278],[0.0359,0.2164],[0.0445,0.2035],[0.0519,0.1901],[0.0582,0.1758],[0.0637,0.1609],[0.0681,0.1453],[0.0715,0.1296],[0.0741,0.1137],[0.0757,0.0981],[0.0765,0.0825],[0.076,0.0669],[0.0749,0.0521],[0.073,0.0375],[0.0703,0.0232],[0.0669,0.0095],[0.0626,-0.0032],[0.058,-0.0151],[0.0519,-0.0263],[0.0452,-0.0371],[0.0377,-0.0471],[0.0294,-0.0563],[0.0208,-0.0645],[0.0111,-0.0718],[0.0007,-0.0779],[-0.0105,-0.0831],[-0.022,-0.0866],[-0.0341,-0.0891],[-0.0475,-0.0902],[-0.0602,-0.0896]],"lknee":[[0.0894,0.3179],[0.0873,0.3167],[0.0859,0.3162],[0.0858,0.3164],[0.0864,0.3173],[0.0876,0.3186],[0.0896,0.3205],[0.0924,0.323],[0.0959,0.3261],[0.0999,0.3296],[0.1042,0.3333],[0.109,0.3374],[0.1142,0.3421],[0.1198,0.347],[0.1257,0.3525],[0.1323,0.3586],[0.1389,0.3651],[0.1457,0.3719],[0.1522,0.379],[0.1594,0.3869],[0.1665,0.3952],[0.1737,0.4039],[0.181,0.4134],[0.1884,0.4233],[0.1957,0.4337],[0.2029,0.4444],[0.2101,0.4556],[0.2171,0.467],[0.224,0.4785],[0.2305,0.4901],[0.237,0.5019],[0.2431,0.514],[0.2489,0.5254],[0.254,0.5363],[0.2586,0.5464],[0.2628,0.5563],[0.2663,0.5653],[0.269,0.5728],[0.2708,0.5787],[0.2719,0.5826],[0.2723,0.5848],[0.2719,0.5853],[0.2712,0.5834],[0.2699,0.5797],[0.2681,0.574],[0.2658,0.5667],[0.2631,0.5579],[0.2599,0.548],[0.2561,0.5369],[0.2519,0.5252],[0.2471,0.513],[0.2421,0.5007],[0.2363,0.4882],[0.23,0.4753],[0.2234,0.4631],[0.2162,0.4507],[0.2085,0.4384],[0.2006,0.4266],[0.1925,0.4152],[0.1842,0.4045],[0.1758,0.3941],[0.1668,0.3838],[0.1578,0.3742],[0.1488,0.3649],[0.14,0.3566],[0.1314,0.3488],[0.1232,0.3419],[0.1154,0.3357],[0.1085,0.3306],[0.1022,0.3261],[0.0966,0.3224],[0.0924,0.3197]],"lhip":[[-0.1654,0.7784],[-0.1655,0.7785],[-0.1656,0.779],[-0.1659,0.7792],[-0.1661,0.7797],[-0.1664,0.7801],[-0.1668,0.7805],[-0.1671,0.7811],[-0.1675,0.7816],[-0.1677,0.7821],[-0.1678,0.7826],[-0.1679,0.783],[-0.1679,0.7836],[-0.1679,0.7841],[-0.1679,0.7847],[-0.1677,0.7853],[-0.1674,0.786],[-0.1671,0.7867],[-0.1668,0.7875],[-0.1665,0.7883],[-0.1661,0.7892],[-0.1659,0.79],[-0.1656,0.791],[-0.1655,0.7919],[-0.1654,0.7927],[-0.1653,0.7936],[-0.1653,0.7943],[-0.1653,0.795],[-0.1652,0.7957],[-0.1652,0.7963],[-0.1651,0.7969],[-0.1652,0.7975],[-0.1651,0.7979],[-0.1649,0.7984],[-0.1647,0.7986],[-0.1646,0.7989],[-0.1644,0.7992],[-0.1645,0.7995],[-0.1646,0.7999],[-0.1648,0.8005],[-0.1653,0.8007],[-0.1659,0.8009],[-0.1664,0.8007],[-0.167,0.8004],[-0.1673,0.7997],[-0.1677,0.7988],[-0.1678,0.7976],[-0.1679,0.7963],[-0.1677,0.795],[-0.1675,0.7936],[-0.1672,0.7923],[-0.1667,0.791],[-0.1665,0.7897],[-0.1663,0.7885],[-0.1663,0.7874],[-0.1662,0.7863],[-0.1664,0.7853],[-0.1665,0.7843],[-0.1666,0.7835],[-0.1668,0.7827],[-0.1669,0.7819],[-0.1671,0.7813],[-0.1671,0.7806],[-0.1671,0.7799],[-0.167,0.7794],[-0.167,0.7789],[-0.1668,0.7785],[-0.1666,0.7782],[-0.1662,0.7781],[-0.1661,0.7779],[-0.1658,0.778],[-0.1656,0.7781]],"butt":[[-0.2647,0.8033],[-0.2649,0.8034],[-0.265,0.8035],[-0.2654,0.8036],[-0.2659,0.8037],[-0.2663,0.8038],[-0.2668,0.8039],[-0.2673,0.8039],[-0.2677,0.8037],[-0.268,0.8036],[-0.2682,0.8034],[-0.2682,0.8033],[-0.2682,0.8032],[-0.2683,0.803],[-0.2683,0.8028],[-0.2681,0.8027],[-0.2679,0.8027],[-0.2679,0.8026],[-0.2677,0.8026],[-0.2676,0.8026],[-0.2674,0.8027],[-0.2674,0.8026],[-0.2672,0.8027],[-0.2671,0.8028],[-0.267,0.8028],[-0.2669,0.8028],[-0.2667,0.8029],[-0.2665,0.8029],[-0.2662,0.8029],[-0.2659,0.803],[-0.2656,0.8031],[-0.2653,0.8031],[-0.2649,0.8033],[-0.2645,0.8033],[-0.2642,0.8034],[-0.2639,0.8035],[-0.2638,0.8036],[-0.2637,0.8038],[-0.2638,0.804],[-0.264,0.8042],[-0.2644,0.8043],[-0.2649,0.8044],[-0.2655,0.8045],[-0.266,0.8045],[-0.2662,0.8046],[-0.2666,0.8044],[-0.2668,0.8043],[-0.267,0.8041],[-0.2672,0.8039],[-0.2673,0.8037],[-0.2674,0.8035],[-0.2673,0.8034],[-0.2674,0.8032],[-0.2674,0.8031],[-0.2675,0.8029],[-0.2676,0.8027],[-0.2676,0.8026],[-0.2676,0.8025],[-0.2676,0.8024],[-0.2677,0.8023],[-0.2677,0.8022],[-0.2677,0.8021],[-0.2676,0.8021],[-0.2674,0.8021],[-0.2671,0.8021],[-0.2669,0.8022],[-0.2666,0.8023],[-0.2662,0.8024],[-0.2657,0.8026],[-0.2654,0.8028],[-0.265,0.803],[-0.2649,0.8031]],"spine":[[-0.2005,0.9752],[-0.2009,0.9753],[-0.201,0.9755],[-0.2014,0.9757],[-0.2018,0.976],[-0.2022,0.9762],[-0.2027,0.9764],[-0.2032,0.9766],[-0.2037,0.9767],[-0.204,0.9767],[-0.2041,0.9767],[-0.2041,0.9766],[-0.2042,0.9765],[-0.2043,0.9764],[-0.2043,0.9762],[-0.2041,0.9761],[-0.2038,0.976],[-0.2039,0.9759],[-0.2036,0.9758],[-0.2036,0.9757],[-0.2034,0.9757],[-0.2035,0.9757],[-0.2032,0.9757],[-0.2031,0.9757],[-0.2029,0.9757],[-0.2028,0.9757],[-0.2026,0.9757],[-0.2025,0.9756],[-0.2023,0.9756],[-0.2022,0.9756],[-0.202,0.9756],[-0.202,0.9755],[-0.2017,0.9755],[-0.2016,0.9755],[-0.2014,0.9755],[-0.2012,0.9754],[-0.2012,0.9755],[-0.2012,0.9755],[-0.2011,0.9757],[-0.201,0.9758],[-0.2014,0.976],[-0.2017,0.9762],[-0.2023,0.9764],[-0.2026,0.9766],[-0.2027,0.9768],[-0.2029,0.9769],[-0.2029,0.9769],[-0.203,0.9768],[-0.203,0.9767],[-0.2031,0.9765],[-0.2029,0.9764],[-0.2026,0.9762],[-0.2027,0.976],[-0.2026,0.9758],[-0.2027,0.9757],[-0.2027,0.9755],[-0.2028,0.9754],[-0.2027,0.9752],[-0.2027,0.9751],[-0.2029,0.9751],[-0.2029,0.975],[-0.2031,0.975],[-0.203,0.9749],[-0.2028,0.9749],[-0.2026,0.9749],[-0.2025,0.9749],[-0.2022,0.9749],[-0.202,0.9749],[-0.2015,0.9749],[-0.2012,0.975],[-0.201,0.9751],[-0.2008,0.9751]],"blades":[[-0.0897,1.149],[-0.09,1.1491],[-0.0901,1.1492],[-0.0903,1.1494],[-0.0906,1.1495],[-0.0907,1.1497],[-0.091,1.1498],[-0.0914,1.15],[-0.0918,1.1501],[-0.092,1.1502],[-0.0921,1.1502],[-0.0921,1.1501],[-0.0921,1.15],[-0.0922,1.1499],[-0.0922,1.1497],[-0.0921,1.1496],[-0.0919,1.1494],[-0.092,1.1493],[-0.0917,1.1492],[-0.0917,1.1491],[-0.0915,1.1491],[-0.0917,1.1491],[-0.0913,1.1491],[-0.0913,1.1492],[-0.0911,1.1491],[-0.0911,1.1492],[-0.091,1.1493],[-0.0909,1.1493],[-0.0908,1.1494],[-0.0908,1.1494],[-0.0907,1.1494],[-0.0908,1.1494],[-0.0907,1.1495],[-0.0908,1.1495],[-0.0908,1.1495],[-0.0907,1.1495],[-0.0909,1.1495],[-0.0909,1.1496],[-0.0909,1.1496],[-0.0906,1.1496],[-0.0908,1.1496],[-0.0908,1.1497],[-0.0912,1.1497],[-0.0914,1.1499],[-0.0913,1.15],[-0.0914,1.15],[-0.0913,1.15],[-0.0913,1.1499],[-0.0914,1.1499],[-0.0913,1.1497],[-0.0911,1.1496],[-0.0909,1.1493],[-0.0911,1.1491],[-0.0912,1.149],[-0.0913,1.1488],[-0.0913,1.1486],[-0.0914,1.1485],[-0.0913,1.1483],[-0.0914,1.1483],[-0.0916,1.1484],[-0.0917,1.1484],[-0.0919,1.1485],[-0.0919,1.1486],[-0.0918,1.1487],[-0.0917,1.1487],[-0.0917,1.1489],[-0.0915,1.1489],[-0.0913,1.149],[-0.0908,1.149],[-0.0904,1.1489],[-0.0903,1.1491],[-0.0901,1.149]],"neck":[[0.0976,1.3511],[0.095,1.351],[0.0959,1.351],[0.0955,1.3507],[0.0944,1.3504],[0.0956,1.3507],[0.0962,1.3503],[0.0948,1.3502],[0.0956,1.3504],[0.096,1.3507],[0.0955,1.3499],[0.0953,1.3499],[0.0971,1.35],[0.0954,1.3496],[0.097,1.3499],[0.0961,1.3496],[0.0974,1.3494],[0.0951,1.3486],[0.0973,1.3492],[0.0967,1.349],[0.0967,1.3489],[0.0958,1.3492],[0.0968,1.3489],[0.0963,1.3493],[0.096,1.349],[0.0967,1.3493],[0.0966,1.3493],[0.0966,1.3493],[0.0971,1.3493],[0.0964,1.3493],[0.0977,1.3495],[0.0958,1.3494],[0.096,1.3495],[0.0966,1.3498],[0.097,1.3501],[0.096,1.3501],[0.0973,1.3505],[0.0961,1.3502],[0.0964,1.3498],[0.0969,1.3499],[0.0977,1.35],[0.0971,1.3497],[0.0956,1.3498],[0.0952,1.3497],[0.0968,1.3496],[0.0958,1.3497],[0.0963,1.3498],[0.0961,1.3496],[0.0963,1.3498],[0.096,1.3496],[0.0963,1.3496],[0.0952,1.3492],[0.0967,1.3495],[0.096,1.3495],[0.0953,1.3496],[0.0951,1.3497],[0.0962,1.3495],[0.0969,1.3498],[0.0946,1.3496],[0.0959,1.3494],[0.0955,1.3498],[0.0961,1.35],[0.0947,1.35],[0.0947,1.3503],[0.0942,1.3504],[0.0942,1.3507],[0.0937,1.3506],[0.0934,1.3507],[0.094,1.351],[0.0939,1.3504],[0.098,1.3512],[0.0954,1.351]],"rwrist":[[0.3997,0.7217],[0.3992,0.7216],[0.3989,0.7214],[0.3986,0.7214],[0.3984,0.7215],[0.3982,0.7215],[0.3977,0.7214],[0.3978,0.7214],[0.3977,0.7214],[0.3976,0.7214],[0.3975,0.7213],[0.3974,0.7213],[0.3973,0.7212],[0.3971,0.7212],[0.3972,0.7212],[0.3971,0.7211],[0.3969,0.721],[0.3971,0.721],[0.3974,0.7208],[0.3973,0.7207],[0.3978,0.7207],[0.398,0.7207],[0.3984,0.7207],[0.3988,0.7207],[0.3994,0.7208],[0.3999,0.7209],[0.4004,0.721],[0.401,0.721],[0.4015,0.7211],[0.402,0.7212],[0.4023,0.7213],[0.4027,0.7214],[0.4028,0.7214],[0.4032,0.7215],[0.4034,0.7215],[0.4036,0.7214],[0.404,0.7215],[0.4038,0.7214],[0.4038,0.7214],[0.4039,0.7214],[0.4036,0.7214],[0.4032,0.7214],[0.4031,0.7216],[0.4028,0.7216],[0.4027,0.7218],[0.4027,0.7219],[0.4027,0.7221],[0.4027,0.7222],[0.4026,0.7223],[0.4027,0.7225],[0.4025,0.7226],[0.4025,0.7226],[0.4021,0.7226],[0.4018,0.7225],[0.4017,0.7225],[0.4013,0.7224],[0.4012,0.7224],[0.4009,0.7223],[0.401,0.7223],[0.4008,0.7222],[0.4007,0.7222],[0.4006,0.7222],[0.4006,0.7221],[0.4006,0.7221],[0.4007,0.7221],[0.4006,0.7221],[0.4008,0.7221],[0.4008,0.722],[0.4007,0.722],[0.4004,0.7219],[0.4,0.7218],[0.4,0.7218]],"relbow":[[0.2193,0.91],[0.2184,0.9095],[0.2177,0.909],[0.217,0.9086],[0.2163,0.9082],[0.2156,0.9078],[0.2149,0.9074],[0.2146,0.907],[0.2143,0.9069],[0.2141,0.9067],[0.2139,0.9066],[0.2138,0.9066],[0.2138,0.9066],[0.2136,0.9065],[0.2137,0.9066],[0.2137,0.9066],[0.2138,0.9067],[0.2139,0.9066],[0.2143,0.9065],[0.2144,0.9065],[0.2149,0.9066],[0.2152,0.9066],[0.2159,0.9068],[0.2166,0.9072],[0.2175,0.9075],[0.2184,0.908],[0.2193,0.9084],[0.2203,0.909],[0.2213,0.9095],[0.2223,0.91],[0.2231,0.9105],[0.2239,0.9111],[0.2246,0.9116],[0.2253,0.9118],[0.2257,0.9121],[0.2261,0.9123],[0.2264,0.9123],[0.2264,0.9125],[0.2265,0.9125],[0.2264,0.9124],[0.226,0.9123],[0.2255,0.9123],[0.2253,0.9124],[0.225,0.9124],[0.225,0.9126],[0.2249,0.9128],[0.2249,0.9128],[0.2249,0.913],[0.2249,0.9131],[0.2248,0.9131],[0.2246,0.9132],[0.2245,0.9132],[0.224,0.9131],[0.2237,0.913],[0.2235,0.913],[0.2229,0.9127],[0.2226,0.9125],[0.2222,0.9123],[0.222,0.9121],[0.2218,0.912],[0.2216,0.9119],[0.2215,0.9117],[0.2213,0.9116],[0.2213,0.9115],[0.2214,0.9114],[0.2213,0.9114],[0.2214,0.9113],[0.2213,0.9111],[0.2212,0.9111],[0.2208,0.9108],[0.2204,0.9107],[0.2198,0.9103]],"rshoulder":[[0.0703,1.1749],[0.0696,1.1746],[0.0692,1.1743],[0.0687,1.1742],[0.0682,1.1739],[0.0678,1.1738],[0.0675,1.1737],[0.0671,1.1733],[0.0668,1.1733],[0.0665,1.1731],[0.0664,1.1731],[0.0663,1.1732],[0.0665,1.1733],[0.0663,1.1735],[0.0666,1.1736],[0.067,1.1738],[0.0674,1.1742],[0.0677,1.1742],[0.0683,1.1742],[0.0686,1.1743],[0.0693,1.1744],[0.0695,1.1744],[0.0704,1.1747],[0.071,1.175],[0.0719,1.1752],[0.0728,1.1756],[0.0738,1.176],[0.0749,1.1764],[0.076,1.1768],[0.0771,1.1773],[0.0782,1.1778],[0.0793,1.1782],[0.0804,1.1788],[0.0812,1.1789],[0.0819,1.1791],[0.0825,1.1791],[0.0828,1.1789],[0.083,1.1789],[0.0832,1.1788],[0.0833,1.1786],[0.083,1.1784],[0.0829,1.1784],[0.0826,1.1783],[0.0825,1.1783],[0.0826,1.1785],[0.0827,1.1786],[0.0828,1.1787],[0.0829,1.1788],[0.0828,1.1788],[0.0827,1.1787],[0.0825,1.1787],[0.0822,1.1785],[0.0816,1.1784],[0.0809,1.1781],[0.0802,1.1779],[0.0793,1.1774],[0.0786,1.1772],[0.0779,1.1769],[0.0771,1.1765],[0.0765,1.1764],[0.076,1.1763],[0.0751,1.1761],[0.0746,1.1759],[0.0741,1.1757],[0.0737,1.1756],[0.0731,1.1755],[0.0727,1.1753],[0.0721,1.1752],[0.0719,1.1753],[0.0714,1.1751],[0.0712,1.1753],[0.0705,1.1749]]},"knee_deg":[73.1,74.09,75.31,76.77,78.44,80.28,82.26,84.38,86.65,88.92,91.13,93.38,95.62,97.88,100.15,102.53,104.86,107.07,109.32,111.59,113.78,115.9,118.01,120.08,122.0,123.82,125.51,127.03,128.37,129.47,130.38,131.01,131.37,131.39,131.11,130.5,129.52,128.32,126.8,125.04,123.15,121.11,118.93,116.63,114.24,111.75,109.27,106.74,104.16,101.65,99.2,96.81,94.49,92.24,90.1,88.02,86.01,84.1,82.34,80.73,79.16,77.66,76.32,75.06,73.96,73.08,72.36,71.85,71.58,71.54,71.81,72.32],"hip_deg":[84.7,83.84,83.21,82.73,82.49,82.54,82.78,83.24,83.95,84.83,85.82,86.95,88.13,89.44,90.81,92.28,93.8,95.24,96.78,98.37,99.93,101.47,103.06,104.67,106.19,107.7,109.17,110.59,111.93,113.19,114.38,115.5,116.49,117.3,117.99,118.54,118.9,119.14,119.21,119.12,118.93,118.66,118.28,117.81,117.24,116.56,115.78,114.92,113.95,112.93,111.87,110.78,109.67,108.52,107.38,106.18,104.97,103.74,102.53,101.32,100.04,98.76,97.46,96.12,94.78,93.43,92.06,90.74,89.41,88.08,86.83,85.64],"ankle_deg":[106.59,106.78,106.91,107.12,107.28,107.15,107.22,107.18,107.17,107.23,107.26,107.26,107.36,107.49,107.51,107.72,107.93,108.26,108.53,108.94,109.35,109.87,110.33,110.87,111.45,112.08,112.79,113.52,114.26,114.99,115.72,116.29,116.89,117.31,117.65,117.86,118.14,118.22,118.12,118.09,117.83,117.58,117.2,116.9,116.76,116.58,116.55,116.59,116.65,116.77,116.89,116.96,116.98,116.93,116.78,116.59,116.18,115.79,115.22,114.63,113.93,113.06,112.2,111.29,110.34,109.54,108.77,108.01,107.41,107.01,106.64,106.62]};

/* Muscle-tendon length from joint angles, first order: dL = -rK*dThetaK
   - rH*dThetaH, with interior angles (larger = more extended) and moment
   arms held constant. A positive moment arm means the muscle SHORTENS as
   that joint extends. The arms are representative values, not this
   rider's, and they are on sliders because that is the honest way to
   show a number nobody measured here. */
var MUSC = {
  vasti: { nm: 'Vasti', rK:  0.045, rH:  0.000, L0: 0.090, F0: 5000, on: 85, off: 35 },
  ham:   { nm: 'Hamstrings', rK: -0.035, rH: 0.060, L0: 0.100, F0: 2500, on: 10, off: 60 }
};

/* Periodic resample through a truncated Fourier series. The cycle really is
   periodic, so this is the natural interpolant — and unlike a linear one it
   has a smooth derivative, which matters because the force depends on
   velocity. Linear interpolation gives piecewise-constant velocity and puts a
   visible staircase on the work loop. Eight harmonics of a 72-bin cycle keeps
   everything real and throws away only noise. */
function cycSmooth(src, n, H) {
  var m = src.length, re = [], im = [], h, i, w;
  for (h = 0; h <= H; h++) {
    var a = 0, b = 0;
    for (i = 0; i < m; i++) {
      w = 2 * Math.PI * h * i / m;
      a += src[i] * Math.cos(w); b -= src[i] * Math.sin(w);
    }
    re.push(a * 2 / m); im.push(b * 2 / m);
  }
  re[0] /= 2; im[0] /= 2;
  var out = new Float64Array(n);
  for (i = 0; i < n; i++) {
    var t = 2 * Math.PI * i / n, sum = 0;
    for (h = 0; h <= H; h++) sum += re[h] * Math.cos(h * t) - im[h] * Math.sin(h * t);
    out[i] = sum;
  }
  return out;
}

/* the first page's model, driven by a measured length instead of a sine */
function strokeSim(S) {
  var mu = MUSC[S.muscle], i;
  var T = 60 / S.cadence, n = 720, dt = T / n;
  var L0 = mu.L0, F0 = S.F0, Vx = 10, af = 0.30;
  var tauA = 0.010, tauD = 0.040, penn0 = 0.087, w = L0 * Math.sin(penn0);
  var V0 = Vx * L0;

  var kn = cycSmooth(CYC.knee_deg, n, 8), hp = cycSmooth(CYC.hip_deg, n, 8);
  var pos = new Float64Array(n), mk = 0, mh = 0;
  for (i = 0; i < n; i++) { mk += kn[i]; mh += hp[i]; }
  mk /= n; mh /= n;
  var DEG = Math.PI / 180;
  for (i = 0; i < n; i++) {
    pos[i] = -S.rK * (kn[i] - mk) * DEG - S.rH * (hp[i] - mh) * DEG;
  }

  /* velocity by central difference on the closed cycle; + is shortening */
  var vel = new Float64Array(n);
  for (i = 0; i < n; i++) {
    vel[i] = -(pos[(i + 1) % n] - pos[(i - 1 + n) % n]) / (2 * dt);
  }

  /* excitation window in crank per cent, allowed to wrap through top dead
     centre — which is exactly what the knee extensors do */
  var on = S.onset, off = S.offset;
  function live(p) { return on <= off ? (p >= on && p <= off) : (p >= on || p <= off); }
  var exc = new Float64Array(n);
  for (i = 0; i < n; i++) exc[i] = live(i / n * 100) ? S.effort : 0;

  /* three revolutions so activation reaches its steady cycle, keep the last */
  var act = new Float64Array(n), a = 0;
  for (var rep = 0; rep < 3; rep++) {
    for (i = 0; i < n; i++) {
      var ex = exc[(i - 1 + n) % n], tau = ex >= a ? tauA : tauD;
      a = ex + (a - ex) * Math.exp(-dt / tau);
      if (rep === 2) act[i] = a;
    }
  }

  var force = new Float64Array(n), power = new Float64Array(n), lenMM = new Float64Array(n);
  var wTot = 0, wPos = 0, wNeg = 0;
  for (i = 0; i < n; i++) {
    var penn = Math.asin(w / (pos[i] + L0));
    var Ln = (pos[i] / Math.cos(penn0) + L0) / L0;
    var v = vel[i] / Math.cos(penn);
    var V0a = (Vx / 2) + (Vx / 2) * act[i];
    var vn = v / (V0 * V0a / Vx);
    var fl = vmlFL(Ln);
    var fv;
    if (v > V0 * V0a) fv = 0;
    else if (vn > 0) fv = (1 - vn) / (1 + vn / af);
    else fv = 1.8 - (0.8 * (1 + v / V0)) / (1 - 7.56 * 0.21 * v / V0);
    force[i] = act[i] * F0 * fl * fv;
    power[i] = force[i] * v;
    lenMM[i] = pos[i] * 1000;
    var dw = force[i] * v * dt;
    wTot += dw; if (dw > 0) wPos += dw; else wNeg += dw;
  }
  var pct = new Float64Array(n);
  for (i = 0; i < n; i++) pct[i] = i / n * 100;
  return { n: n, dt: dt, T: T, pct: pct, pos: pos, lenMM: lenMM, vel: vel,
           act: act, force: force, power: power, kn: kn, hp: hp,
           workTot: wTot, workPos: wPos, workNeg: wNeg,
           powerTot: wTot / T, exc: live };
}

D.register('cyclist', function (node, d) {
  var port = D.portrait();
  var u = D.build(node, {});
  node.classList.add('cyc-wrap');

  /* effort is the excitation the window is driven to. A steady 20 km/h on a
     treadmill is a long way from a maximal contraction, and at full excitation
     one muscle group comes out making more power than the whole rider. */
  var S = { muscle: 'vasti', effort: 0.35, cadence: CYC.cadence_rpm, F0: MUSC.vasti.F0,
            rK: MUSC.vasti.rK, rH: MUSC.vasti.rH,
            onset: MUSC.vasti.on, offset: MUSC.vasti.off, trail: true };
  /* The stroke starts parked a fifth of the way in — mid down-stroke, where
     the interesting things are happening — and plays on request. A canvas
     that animates forever costs a laptop battery all lecture for a loop
     nobody is watching, so nothing runs until someone presses play. */
  var phase = 20, playing = false, last = 0, R = null;

  var AXH = port ? 520 : 400;
  var ax = null;
  function sizeAxes() {
    var before = ax;
    var wpx = port ? 460 : Math.min(1700, Math.max(620, Math.round(u.stage.offsetWidth) || 1180));
    if (ax && Math.abs(ax.W - wpx) < 2) return;
    ax = new Axes(u.cv, { w: wpx, h: AXH, padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
    u.cv.style.maxWidth = 'none'; u.cv.style.width = '100%';
    if (before) cache = null;                     /* the cached layer is now the wrong size */
  }

  /* ---------------- the rider ---------------- */
  var LIMB = [['butt', 'spine', 'blades', 'neck'],
              ['rshoulder', 'relbow', 'rwrist'],
              ['blades', 'rshoulder']];

  /* the frame is fixed over the whole cycle so the rider never jumps */
  var BOX = (function () {
    var lo = [1e9, 1e9], hi = [-1e9, -1e9];
    Object.keys(CYC.markers).forEach(function (k) {
      CYC.markers[k].forEach(function (p) {
        lo[0] = Math.min(lo[0], p[0]); hi[0] = Math.max(hi[0], p[0]);
        lo[1] = Math.min(lo[1], p[1]); hi[1] = Math.max(hi[1], p[1]);
      });
    });
    var r = CYC.crank_r_m * 1.15;
    return { lo: [Math.min(lo[0], -r), Math.min(lo[1], -r)],
             hi: [Math.max(hi[0], r), Math.max(hi[1], r)] };
  })();
  function mAt(name, p) {
    var a = CYC.markers[name], m = a.length, uu = p / 100 * m;
    var k = Math.floor(uu), f = uu - k;
    var A = a[k % m], B = a[(k + 1) % m];
    return [A[0] * (1 - f) + B[0] * f, A[1] * (1 - f) + B[1] * f];
  }
  function figPanel(x0, y0, w, h) {
    var c = ax.c, K = C(), j;
    var lo = BOX.lo, hi = BOX.hi;
    var PT = 38, PB = 20, PL = 8, PR = 8;   /* the head needs to clear the caption */
    var sx = (w - PL - PR) / (hi[0] - lo[0]), sy = (h - PT - PB) / (hi[1] - lo[1]);
    var s = Math.min(sx, sy);
    var ox = x0 + PL + ((w - PL - PR) - (hi[0] - lo[0]) * s) / 2 - lo[0] * s;
    var oy = y0 + PT + ((h - PT - PB) - (hi[1] - lo[1]) * s) + hi[1] * s;
    function X(v) { return ox + v * s; }
    function Y(v) { return oy - v * s; }

    /* the crank circle and the bottom bracket */
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .4; c.setLineDash([3, 4]); c.lineWidth = 1.2;
    c.beginPath(); c.arc(X(0), Y(0), CYC.crank_r_m * s, 0, 7); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.MUT; c.globalAlpha = .6;
    c.beginPath(); c.arc(X(0), Y(0), 2.6, 0, 7); c.fill(); c.restore();

    /* the far-side leg first, muted, so the near leg reads on top */
    function limb(names, col, wid, alpha) {
      c.save(); c.strokeStyle = col; c.lineWidth = wid; c.globalAlpha = alpha;
      c.lineJoin = 'round'; c.lineCap = 'round';
      for (j = 0; j < names.length - 1; j++) {
        var A = mAt(names[j], phase), B = mAt(names[j + 1], phase);
        c.beginPath(); c.moveTo(X(A[0]), Y(A[1])); c.lineTo(X(B[0]), Y(B[1])); c.stroke();
      }
      c.restore();
    }
    limb(['lhip', 'lknee', 'lankle', 'lfoot'], K.MUT, 3.4, .45);
    limb(['butt', 'lhip'], K.MUT, 3.4, .45);
    LIMB.forEach(function (L) { limb(L, K.INK, 4, .85); });
    limb(['butt', 'rhip'], K.INK, 4, .85);
    /* the driving leg carries the muscle's colour */
    var hot = R && R.exc(phase);
    limb(['rhip', 'rknee', 'rankle', 'rfoot'], hot ? K.ACC : K.BLUE, 5, 1);

    ['rhip', 'rknee', 'rankle', 'butt', 'rshoulder', 'relbow', 'rwrist'].forEach(function (k2) {
      var P = mAt(k2, phase);
      c.save(); c.fillStyle = K.PLATE; c.strokeStyle = K.INK; c.lineWidth = 1.6;
      c.beginPath(); c.arc(X(P[0]), Y(P[1]), 3, 0, 7); c.fill(); c.stroke(); c.restore();
    });
    /* marker 12 sits on the helmet, so it is the head */
    var hd = mAt('neck', phase);
    c.save(); c.fillStyle = K.PLATE; c.strokeStyle = K.INK; c.lineWidth = 2;
    c.beginPath(); c.arc(X(hd[0]), Y(hd[1]), Math.max(5, 0.085 * s), 0, 7);
    c.fill(); c.stroke(); c.restore();
    /* both pedals */
    [['rfoot', hot ? K.ACC : K.BLUE, 5], ['lfoot', K.MUT, 4]].forEach(function (q) {
      var P = mAt(q[0], phase);
      c.save(); c.fillStyle = q[1];
      c.beginPath(); c.arc(X(P[0]), Y(P[1]), q[2], 0, 7); c.fill(); c.restore();
    });

    label(c, CYC.rider + ' · ' + CYC.speed_kmh + ' km/h · ' + fmt(S.cadence, 0) + ' rpm',
          x0 + w / 2, y0 + 12, { color: K.INK, size: 12.5, align: 'center' });
    label(c, fmt(phase, 0) + ' % of the crank cycle', x0 + w / 2, y0 + h - 5,
          { color: K.MUT, size: 11, align: 'center' });
  }

  /* ---------------- length against crank angle ---------------- */
  function lenPanel(x0, y0, w, h, live) {
    var c = ax.c, K = C(), i;
    var sim = R, PL = 52, PB = 32, PT = 22, PR = 12;
    var lo = 1e9, hi = -1e9;
    for (i = 0; i < sim.n; i++) { lo = Math.min(lo, sim.lenMM[i]); hi = Math.max(hi, sim.lenMM[i]); }
    var pad = (hi - lo) * 0.16 || 1; lo -= pad; hi += pad;
    function X(p) { return x0 + PL + p / 100 * (w - PL - PR); }
    function Y(v) { return y0 + h - PB - (v - lo) / (hi - lo) * (h - PB - PT); }

    /* the window the muscle is switched on for — one band, or two when it
       wraps through top dead centre, never one rectangle per sample */
    var runs = S.onset <= S.offset ? [[S.onset, S.offset]]
                                   : [[S.onset, 100], [0, S.offset]];
    c.save(); c.fillStyle = K.FILL; c.globalAlpha = .6;
    runs.forEach(function (r) { c.fillRect(X(r[0]), y0 + PT, X(r[1]) - X(r[0]), h - PB - PT); });
    c.restore();
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + PL, y0 + PT); c.lineTo(x0 + PL, y0 + h - PB);
    c.lineTo(x0 + w - PR, y0 + h - PB); c.stroke(); c.restore();
    axisTicks(lo, hi).forEach(function (v) {
      if (v < lo || v > hi) return;
      label(c, num(v, 0), x0 + PL - 6, Y(v), { color: K.MUT, size: 10.5, align: 'right' });
    });
    [0, 25, 50, 75, 100].forEach(function (p) {
      label(c, fmt(p, 0), X(p), y0 + h - PB + 11, { color: K.MUT, size: 10, align: 'center' });
    });
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 2.4; c.beginPath();
    for (i = 0; i < sim.n; i++) { var px = X(sim.pct[i]), py = Y(sim.lenMM[i]); i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.lineTo(X(100), Y(sim.lenMM[0])); c.stroke(); c.restore();

    label(c, MUSC[S.muscle].nm + ' length (mm about the mean) · shaded = switched on',
          x0 + PL, y0 + 11, { color: K.INK, size: 12, align: 'left' });
    label(c, '% of the crank cycle   ·   0 = top dead centre, 50 = bottom',
          x0 + (PL + w) / 2, y0 + h - 4, { color: K.MUT, size: 10.5, align: 'center' });
    return { X: X, Y: Y, top: y0 + PT, bot: y0 + h - PB };
  }

  /* ---------------- the work loop ---------------- */
  function cycLoop(x0, y0, w, h, live) {
    var c = ax.c, K = C(), i, sim = R;
    var PL = 54, PB = 32, PT = 24, PR = 14;
    var lx = 1e9, hx = -1e9, hy = 0;
    for (i = 0; i < sim.n; i++) {
      lx = Math.min(lx, sim.lenMM[i]); hx = Math.max(hx, sim.lenMM[i]);
      hy = Math.max(hy, sim.force[i]);
    }
    var px = (hx - lx) * .12 || 1; lx -= px; hx += px; hy = hy * 1.12 || 1;
    function X(v) { return x0 + PL + (v - lx) / (hx - lx) * (w - PL - PR); }
    function Y(v) { return y0 + h - PB - v / hy * (h - PB - PT); }
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + PL, y0 + PT); c.lineTo(x0 + PL, y0 + h - PB);
    c.lineTo(x0 + w - PR, y0 + h - PB); c.stroke(); c.restore();
    axisTicks(0, hy).forEach(function (v) {
      if (v < 0 || v > hy) return;
      label(c, fmt(v, 0), x0 + PL - 6, Y(v), { color: K.MUT, size: 10.5, align: 'right' });
    });
    axisTicks(lx, hx).forEach(function (v) {
      if (v < lx || v > hx) return;
      label(c, num(v, 0), X(v), y0 + h - PB + 12, { color: K.MUT, size: 10, align: 'center' });
    });
    label(c, 'length (mm)   ← shorter    longer →', x0 + (PL + w) / 2, y0 + h - 6,
          { color: K.MUT, size: 11, align: 'center' });

    c.save();
    c.fillStyle = sim.workTot >= 0 ? 'rgba(74,222,128,0.16)' : 'rgba(248,113,113,0.16)';
    c.beginPath();
    for (i = 0; i < sim.n; i++) { var fx = X(sim.lenMM[i]), fy = Y(sim.force[i]); i ? c.lineTo(fx, fy) : c.moveTo(fx, fy); }
    c.closePath(); c.fill(); c.restore();
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 2.6; c.beginPath();
    for (i = 0; i < sim.n; i++) { var qx = X(sim.lenMM[i]), qy = Y(sim.force[i]); i ? c.lineTo(qx, qy) : c.moveTo(qx, qy); }
    c.closePath(); c.stroke(); c.restore();
    [0.10, 0.35, 0.60, 0.85].forEach(function (f) {
      var i0 = Math.round(f * (sim.n - 1)), i1 = Math.min(sim.n - 1, i0 + 10);
      if (i1 <= i0) return;
      arrow(c, X(sim.lenMM[i0]), Y(sim.force[i0]), X(sim.lenMM[i1]), Y(sim.force[i1]),
            { color: K.BLUE, width: 2.1, head: 9 });
    });
    label(c, 'Work loop — force (N) against ' + MUSC[S.muscle].nm.toLowerCase() + ' length',
          x0 + PL, y0 + 12, { color: K.INK, size: 12, align: 'left' });
    return { X: X, Y: Y };
  }

  /* ---------------- draw ---------------- */
  u.ctl.classList.add('g2');
  var out = readout(u.ctl);
  /* The two data panels are three 720-point polylines and never change
     between frames; the rider and the two markers do. So the panels are
     rendered once into an offscreen canvas and blitted, and a frame costs a
     drawImage plus a stick figure. Redrawing the lot at 60 Hz saturates the
     browser and the page stops responding to clicks at all. */
  var cacheCv = null, cacheAx = null, cache = null, MAP = {};
  var queued = 0;
  function recompute() {
    if (queued) return;
    queued = requestAnimationFrame(function () {
      queued = 0; R = strokeSim(S); readOut(); draw();
    });
  }
  function recomputeNow() { queued = 0; R = strokeSim(S); readOut(); draw(); }
  function draw() {
    sizeAxes();
    if (!R) R = strokeSim(S);
    buildCache();
    paint();
  }
  function buildCache() {
    var real = ax;
    if (!cacheCv) cacheCv = document.createElement('canvas');
    if (!cacheAx || cacheAx.W !== real.W || cacheAx.H !== real.H) {
      cacheAx = new Axes(cacheCv, { w: real.W, h: real.H, padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
    }
    ax = cacheAx;
    ax.clear();
    var W = real.W, H = real.H;
    if (port) {
      MAP.loop = cycLoop(0, H * 0.46, W, H * 0.54, false);
      MAP.len = null;
    } else {
      var fw = W * 0.21, lw = W * 0.38;
      MAP.len = lenPanel(fw, H * 0.02, lw, H * 0.96, false);
      MAP.loop = cycLoop(fw + lw, H * 0.02, W - fw - lw, H * 0.96, false);
    }
    ax = real;
    cache = cacheCv;
  }
  function paint() {
    if (!ax) { draw(); return; }
    if (!cache) buildCache();
    var W = ax.W, H = ax.H, c = ax.c, K = C();
    ax.clear();
    c.drawImage(cache, 0, 0, W, H);
    if (port) figPanel(0, 0, W, H * 0.46);
    else figPanel(0, 0, W * 0.21, H);
    var k = Math.round(phase / 100 * R.n) % R.n;
    if (MAP.len) {
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(MAP.len.X(phase), MAP.len.top);
      c.lineTo(MAP.len.X(phase), MAP.len.bot); c.stroke();
      c.fillStyle = K.ACC;
      c.beginPath(); c.arc(MAP.len.X(phase), MAP.len.Y(R.lenMM[k]), 4, 0, 7); c.fill(); c.restore();
    }
    c.save(); c.fillStyle = K.ACC; c.strokeStyle = K.PLATE; c.lineWidth = 2;
    c.beginPath(); c.arc(MAP.loop.X(R.lenMM[k]), MAP.loop.Y(R.force[k]), 5.5, 0, 7);
    c.fill(); c.stroke(); c.restore();
  }
  function readOut() {
    var mn = 1e9, mx = -1e9, i;
    for (i = 0; i < R.n; i++) { mn = Math.min(mn, R.lenMM[i]); mx = Math.max(mx, R.lenMM[i]); }
    var span = mx - mn;
    out.innerHTML = '<b>' + MUSC[S.muscle].nm + '</b> moves <b>' + num(span, 1) +
      ' mm</b> per stroke and does <b>' + num(R.workTot, 1) + ' J</b> of net work, ' +
      '<b>' + num(R.powerTot, 0) + ' W</b> for this leg at ' + fmt(S.cadence, 0) + ' rpm.' +
      '<span style="opacity:.72">  ·  the knee and hip angles are measured; the force is the ' +
      'page-one muscle model driven by them, not a measurement</span>';
  }

  /* ---------------- controls ---------------- */
  keepOut(chips(u.ctl, [['vasti', 'Vasti'], ['ham', 'Hamstrings']], 'vasti', function (k) {
    S.muscle = k;
    var m = MUSC[k];
    S.rK = m.rK; S.rH = m.rH; S.F0 = m.F0; S.onset = m.on; S.offset = m.off;
    sOn.quiet(m.on); sOff.quiet(m.off); sF0.quiet(m.F0); sRK.quiet(m.rK * 1000); sRH.quiet(m.rH * 1000);
    recompute();
  }));
  var sOn = slider(u.ctl, 'Switch on', 0, 99, 1, S.onset,
    function (v) { return fmt(v, 0) + '%'; }, function (v) { S.onset = v; recompute(); });
  var sOff = slider(u.ctl, 'Switch off', 0, 99, 1, S.offset,
    function (v) { return fmt(v, 0) + '%'; }, function (v) { S.offset = v; recompute(); });
  var asm = el('div', 'cyc-asm');
  asm.style.display = 'none';
  var sEff = slider(asm, 'Effort', 5, 100, 1, S.effort * 100,
    function (v) { return fmt(v, 0) + '%'; }, function (v) { S.effort = v / 100; recompute(); });
  var sCad = slider(u.ctl, 'Cadence', 40, 130, 1, S.cadence,
    function (v) { return fmt(v, 0) + ' rpm'; }, function (v) { S.cadence = v; recompute(); });
  var sF0 = slider(asm, 'Peak force F₀', 500, 8000, 10, S.F0,
    function (v) { return fmt(v, 0) + ' N'; }, function (v) { S.F0 = v; recompute(); });
  var sRK = slider(asm, 'Knee moment arm', -60, 60, 1, S.rK * 1000,
    function (v) { return num(v, 0) + ' mm'; }, function (v) { S.rK = v / 1000; recompute(); });
  var sRH = slider(asm, 'Hip moment arm', -80, 80, 1, S.rH * 1000,
    function (v) { return num(v, 0) + ' mm'; }, function (v) { S.rH = v / 1000; recompute(); });

  u.ctl.appendChild(asm);
  var row = ctlRow(u.ctl);
  var asmBtn = el('button', 'icalc-chip', 'Model assumptions');
  asmBtn.type = 'button';
  /* fit.js's prewarm clicks every .icalc-chip and every .ibtn it is not told
     to leave alone. This one opens a panel of four more sliders and the play
     button starts an animation — either one, pressed inside fit.js's own
     measuring loop, turns the sweep into a layout feedback loop that never
     ends. data-unsafe is how a widget says "not this one". */
  asmBtn.setAttribute('data-unsafe', '1');
  asmBtn.addEventListener('click', function () {
    var open = asm.style.display === 'none';
    asm.style.display = open ? '' : 'none';
    asmBtn.classList.toggle('on', open);
    setTimeout(draw, 0);
  });
  row.appendChild(asmBtn);
  var play = playBtn(row, '▶ Play');
  play.setAttribute('data-unsafe', '1');
  function setPlay(on) {
    playing = on; play.textContent = playing ? '❚❚ Pause' : '▶ Play';
    if (playing) { last = 0; requestAnimationFrame(tick); }
  }
  play.addEventListener('click', function () { setPlay(!playing); });
  /* and never keep spinning on a tab nobody is looking at */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && playing) setPlay(false);
  });

  /* scrubbing: drag anywhere on the figure */
  u.cv.setAttribute('data-prevent-swipe', '');
  u.cv.style.touchAction = 'none';
  var down = false;
  function scrub(e) {
    var r = u.cv.getBoundingClientRect();
    var fx = (e.clientX - r.left) / r.width * ax.W;
    var fw = port ? ax.W : ax.W * 0.21;
    if (!port && fx < fw) return;                       /* the figure is not a track */
    var PL = 52, PR = 12, x0 = port ? 0 : fw, w = ax.W - x0;
    phase = Math.max(0, Math.min(99.99, (fx - x0 - PL) / (w - PL - PR) * 100));
    setPlay(false);
    paint();
  }
  u.cv.addEventListener('pointerdown', function (e) { down = true; scrub(e); e.preventDefault(); });
  u.cv.addEventListener('pointermove', function (e) { if (down) { scrub(e); e.preventDefault(); } });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    u.cv.addEventListener(ev, function () { down = false; });
  });

  function tick(ts) {
    if (!playing) return;
    if (last) phase = (phase + (ts - last) / 1000 / (60 / S.cadence) * 100) % 100;
    last = ts;
    paint();
    requestAnimationFrame(tick);
  }

  recomputeNow();
  [80, 260, 620, 1200].forEach(function (ms) { setTimeout(draw, ms); });
  window.addEventListener('resize', function () { ax = null; setTimeout(draw, 60); });
  window.addEventListener('ephe341-theme', function () { cache = null; draw(); });
  window.addEventListener('ephe341-layout', function () { setTimeout(draw, 160); });
});
D.boot();
})();
