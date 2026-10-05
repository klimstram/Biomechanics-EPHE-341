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
  vasti: { nm: 'Vasti', col: 'BLUE', rK:  0.045, rH:  0.000, L0: 0.090, F0: 5000, on: 85, off: 35 },
  ham:   { nm: 'Hamstrings', col: 'VIO', rK: -0.035, rH: 0.060, L0: 0.100, F0: 2500, on: 10, off: 60 }
};
var KEYS = ['vasti', 'ham'];

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
/* Both muscles are always simulated — the antagonist is the point of the
   force–time panel — so the parameters live per muscle and only cadence and
   effort are shared. */
function strokeSim(S, key) {
  var mu = MUSC[key], P = S.m[key], i;
  var T = 60 / S.cadence, n = 720, dt = T / n;
  var L0 = mu.L0, F0 = P.F0, Vx = 10, af = 0.30;
  var tauA = 0.010, tauD = 0.040, penn0 = 0.087, w = L0 * Math.sin(penn0);
  var V0 = Vx * L0;

  var kn = cycSmooth(CYC.knee_deg, n, 8), hp = cycSmooth(CYC.hip_deg, n, 8);
  var pos = new Float64Array(n), mk = 0, mh = 0;
  for (i = 0; i < n; i++) { mk += kn[i]; mh += hp[i]; }
  mk /= n; mh /= n;
  var DEG = Math.PI / 180;
  for (i = 0; i < n; i++) {
    pos[i] = -P.rK * (kn[i] - mk) * DEG - P.rH * (hp[i] - mh) * DEG;
  }

  /* velocity by central difference on the closed cycle; + is shortening */
  var vel = new Float64Array(n);
  for (i = 0; i < n; i++) {
    vel[i] = -(pos[(i + 1) % n] - pos[(i - 1 + n) % n]) / (2 * dt);
  }

  /* excitation window in crank per cent, allowed to wrap through top dead
     centre — which is exactly what the knee extensors do */
  var on = P.onset, off = P.offset;
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
           powerTot: wTot / T, exc: live, key: key, onset: on, offset: off };
}

D.register('cyclist', function (node, d) {
  var port = D.portrait();
  var u = D.build(node, {});
  node.classList.add('cyc-wrap');

  /* effort is the excitation the window is driven to. A steady 20 km/h on a
     treadmill is a long way from a maximal contraction, and at full excitation
     one muscle group comes out making more power than the whole rider. */
  var S = { muscle: 'vasti', effort: 0.35, cadence: CYC.cadence_rpm, m: {} };
  KEYS.forEach(function (k) {
    var d = MUSC[k];
    S.m[k] = { rK: d.rK, rH: d.rH, F0: d.F0, onset: d.on, offset: d.off };
  });
  function P() { return S.m[S.muscle]; }
  /* The stroke starts parked a fifth of the way in — mid down-stroke, where
     the interesting things are happening — and plays on request. A canvas
     that animates forever costs a laptop battery all lecture for a loop
     nobody is watching, so nothing runs until someone presses play. */
  var phase = 20, playing = false, last = 0, R = null, SIM = null;

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

  /* the shaded "switched on" band, as one or two runs across the cycle */
  function bands(sim) {
    return sim.onset <= sim.offset ? [[sim.onset, sim.offset]]
                                   : [[sim.onset, 100], [0, sim.offset]];
  }

  /* ---------------- force against crank angle, BOTH muscles ----------------
     The point of this panel is the antagonist pair: the knee extensors and the
     hamstrings are on at different parts of the stroke, and where they overlap
     they are not fighting each other — the hamstrings are extending the hip
     while the vasti extend the knee. The selected muscle is drawn heavier, but
     both are always here. */
  function forcePanel(x0, y0, w, h) {
    var c = ax.c, K = C(), i;
    var PL = 52, PB = 30, PT = 38, PR = 12;   /* room for the key under the title */
    var hy = 0;
    KEYS.forEach(function (k) {
      for (i = 0; i < SIM[k].n; i++) hy = Math.max(hy, SIM[k].force[i]);
    });
    hy = hy * 1.14 || 1;
    function X(p) { return x0 + PL + p / 100 * (w - PL - PR); }
    function Y(v) { return y0 + h - PB - v / hy * (h - PB - PT); }

    /* each muscle's window, in its own colour, low alpha so they can overlap */
    KEYS.forEach(function (k) {
      c.save(); c.fillStyle = K[MUSC[k].col]; c.globalAlpha = .11;
      bands(SIM[k]).forEach(function (r) {
        c.fillRect(X(r[0]), y0 + PT, X(r[1]) - X(r[0]), h - PB - PT);
      });
      c.restore();
    });
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + PL, y0 + PT); c.lineTo(x0 + PL, y0 + h - PB);
    c.lineTo(x0 + w - PR, y0 + h - PB); c.stroke(); c.restore();
    axisTicks(0, hy).forEach(function (v) {
      if (v < 0 || v > hy) return;
      label(c, fmt(v, 0), x0 + PL - 6, Y(v), { color: K.MUT, size: 10.5, align: 'right' });
    });
    [0, 25, 50, 75, 100].forEach(function (p) {
      label(c, fmt(p, 0), X(p), y0 + h - PB + 11, { color: K.MUT, size: 10, align: 'center' });
    });
    KEYS.forEach(function (k) {
      var sim = SIM[k], sel = k === S.muscle;
      c.save(); c.strokeStyle = K[MUSC[k].col]; c.lineWidth = sel ? 2.6 : 1.7;
      c.globalAlpha = sel ? 1 : .72;
      c.beginPath();
      for (i = 0; i < sim.n; i++) { var px = X(sim.pct[i]), py = Y(sim.force[i]); i ? c.lineTo(px, py) : c.moveTo(px, py); }
      c.lineTo(X(100), Y(sim.force[0])); c.stroke(); c.restore();
    });
    label(c, 'Force (N) — both muscles, shaded where each is switched on',
          x0 + PL, y0 + 11, { color: K.INK, size: 12, align: 'left' });
    /* the key goes in its own strip under the title: the vasti trace runs high
       at both ends of the cycle, so the top corners are not free */
    var kx = x0 + PL;
    KEYS.forEach(function (k) {
      c.save(); c.fillStyle = K[MUSC[k].col];
      c.fillRect(kx, y0 + 20, 13, 3); c.restore();
      label(c, MUSC[k].nm, kx + 17, y0 + 22, { color: K[MUSC[k].col], size: 11, align: 'left' });
      c.save(); c.font = '600 11px ui-sans-serif,system-ui,sans-serif';
      kx += 17 + c.measureText(MUSC[k].nm).width + 18; c.restore();
    });
    return { X: X, Y: Y, top: y0 + PT, bot: y0 + h - PB };
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
    var runs = bands(sim);
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
    c.save(); c.strokeStyle = K[MUSC[sim.key].col]; c.lineWidth = 2.4; c.beginPath();
    for (i = 0; i < sim.n; i++) { var px = X(sim.pct[i]), py = Y(sim.lenMM[i]); i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.lineTo(X(100), Y(sim.lenMM[0])); c.stroke(); c.restore();

    label(c, MUSC[sim.key].nm + ' length (mm about the mean) · shaded = switched on',
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
    c.save(); c.strokeStyle = K[MUSC[sim.key].col]; c.lineWidth = 2.6; c.beginPath();
    for (i = 0; i < sim.n; i++) { var qx = X(sim.lenMM[i]), qy = Y(sim.force[i]); i ? c.lineTo(qx, qy) : c.moveTo(qx, qy); }
    c.closePath(); c.stroke(); c.restore();
    [0.10, 0.35, 0.60, 0.85].forEach(function (f) {
      var i0 = Math.round(f * (sim.n - 1)), i1 = Math.min(sim.n - 1, i0 + 10);
      if (i1 <= i0) return;
      arrow(c, X(sim.lenMM[i0]), Y(sim.force[i0]), X(sim.lenMM[i1]), Y(sim.force[i1]),
            { color: K[MUSC[sim.key].col], width: 2.1, head: 9 });
    });
    label(c, 'Work loop — force (N) against ' + MUSC[sim.key].nm.toLowerCase() + ' length',
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
  function runBoth() {
    SIM = {}; KEYS.forEach(function (k) { SIM[k] = strokeSim(S, k); });
    R = SIM[S.muscle];
  }
  function recompute() {
    if (queued) return;
    queued = requestAnimationFrame(function () {
      queued = 0; runBoth(); readOut(); draw();
    });
  }
  function recomputeNow() { queued = 0; runBoth(); readOut(); draw(); }
  function draw() {
    sizeAxes();
    if (!SIM) runBoth();
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
      MAP.force = forcePanel(0, H * 0.46, W, H * 0.27);
      MAP.loop = cycLoop(0, H * 0.73, W, H * 0.27, false);
      MAP.len = null;
    } else {
      /* rider | length over force–time | work loop */
      var fw = W * 0.19, lw = W * 0.40;
      MAP.len = lenPanel(fw, H * 0.01, lw, H * 0.49, false);
      MAP.force = forcePanel(fw, H * 0.50, lw, H * 0.50);
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
    else figPanel(0, 0, W * 0.19, H);
    var k = Math.round(phase / 100 * R.n) % R.n;
    if (MAP.len) {
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(MAP.len.X(phase), MAP.len.top);
      c.lineTo(MAP.len.X(phase), MAP.len.bot); c.stroke();
      c.fillStyle = K.ACC;
      c.beginPath(); c.arc(MAP.len.X(phase), MAP.len.Y(R.lenMM[k]), 4, 0, 7); c.fill(); c.restore();
    }
    if (MAP.force) {
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(MAP.force.X(phase), MAP.force.top);
      c.lineTo(MAP.force.X(phase), MAP.force.bot); c.stroke();
      KEYS.forEach(function (q) {
        c.fillStyle = K[MUSC[q].col];
        c.beginPath(); c.arc(MAP.force.X(phase), MAP.force.Y(SIM[q].force[k]), 3.6, 0, 7); c.fill();
      });
      c.restore();
    }
    c.save(); c.fillStyle = K.ACC; c.strokeStyle = K.PLATE; c.lineWidth = 2;
    c.beginPath(); c.arc(MAP.loop.X(R.lenMM[k]), MAP.loop.Y(R.force[k]), 5.5, 0, 7);
    c.fill(); c.stroke(); c.restore();
  }
  function readOut() {
    var mn = 1e9, mx = -1e9, i;
    for (i = 0; i < R.n; i++) { mn = Math.min(mn, R.lenMM[i]); mx = Math.max(mx, R.lenMM[i]); }
    var span = mx - mn;
    var other = SIM[S.muscle === 'vasti' ? 'ham' : 'vasti'];
    out.innerHTML = '<b>' + MUSC[S.muscle].nm + '</b> moves <b>' + num(span, 1) +
      ' mm</b> per stroke and does <b>' + num(R.workTot, 1) + ' J</b> of net work, ' +
      '<b>' + num(R.powerTot, 0) + ' W</b> for this leg at ' + fmt(S.cadence, 0) + ' rpm; ' +
      MUSC[other.key].nm.toLowerCase() + ' <b>' + num(other.workTot, 1) + ' J</b>.' +
      '<span style="opacity:.72">  ·  the knee and hip angles are measured; the force is the ' +
      'page-one muscle model driven by them, not a measurement</span>';
  }

  /* ---------------- controls ---------------- */
  keepOut(chips(u.ctl, [['vasti', 'Vasti'], ['ham', 'Hamstrings']], 'vasti', function (k) {
    S.muscle = k;
    var m = P();
    sOn.quiet(m.onset); sOff.quiet(m.offset); sF0.quiet(m.F0);
    sRK.quiet(m.rK * 1000); sRH.quiet(m.rH * 1000);
    recompute();
  }));
  var sOn = slider(u.ctl, 'Switch on', 0, 99, 1, P().onset,
    function (v) { return fmt(v, 0) + '%'; }, function (v) { P().onset = v; recompute(); });
  var sOff = slider(u.ctl, 'Switch off', 0, 99, 1, P().offset,
    function (v) { return fmt(v, 0) + '%'; }, function (v) { P().offset = v; recompute(); });
  var asm = el('div', 'cyc-asm');
  asm.style.display = 'none';
  var sEff = slider(asm, 'Effort', 5, 100, 1, S.effort * 100,
    function (v) { return fmt(v, 0) + '%'; }, function (v) { S.effort = v / 100; recompute(); });
  var sCad = slider(u.ctl, 'Cadence', 40, 130, 1, S.cadence,
    function (v) { return fmt(v, 0) + ' rpm'; }, function (v) { S.cadence = v; recompute(); });
  var sF0 = slider(asm, 'Peak force F₀', 500, 8000, 10, P().F0,
    function (v) { return fmt(v, 0) + ' N'; }, function (v) { P().F0 = v; recompute(); });
  var sRK = slider(asm, 'Knee moment arm', -60, 60, 1, P().rK * 1000,
    function (v) { return num(v, 0) + ' mm'; }, function (v) { P().rK = v / 1000; recompute(); });
  var sRH = slider(asm, 'Hip moment arm', -80, 80, 1, P().rH * 1000,
    function (v) { return num(v, 0) + ' mm'; }, function (v) { P().rH = v / 1000; recompute(); });

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
/* ======================================================================
   A MEASURED PEDAL STROKE
   Cartier (2022), figshare 10.6084/m9.figshare.19099754, CC BY 4.0.
   Participant 1, lower-limb cycling, 109 steady revolutions averaged.

   Three instruments, three measurements, no model in any of them:
     · pedal torque against crank angle, from the Lode ergometer
     · joint angles, from 100 Hz motion capture
     · muscle activation, from surface EMG at 2148 Hz

   The three were synchronised by matching the SEQUENCE OF REVOLUTION
   DURATIONS between the ergometer and the motion capture — they agree at
   r = 0.981 with 16 ms of scatter and no drift — so the torque sits on the
   kinematics revolution by revolution rather than being cycle-averaged and
   hoped for. The check that it worked: integrating the measured torque over
   the crank gives 162.1 W, and the ergometer's own reading is 161.3 W.

   The one thing still modelled is muscle LENGTH, which comes from the
   measured joint angles through assumed moment arms, exactly as on the
   previous page. Everything else here was measured.
   ====================================================================== */
var MEAS = {"sub":"P01","trial":"L_Free_P2","sync_r":0.981,"sync_offset_s":-0.4629,"n_phase":72,"revs":109,"cadence_rpm":82.5,"crank_r_m":0.1649,"power_lode_W":161.3,"power_torque_W":162.1,"work_marked_J":57.28,"work_other_J":60.65,"torque_marked":[7.838,10.425,13.148,15.857,18.736,21.537,24.821,27.912,31.56,34.774,38.045,40.881,43.129,44.601,45.336,45.355,44.573,43.077,41.049,38.191,35.146,32.157,28.815,25.858,23.008,20.372,17.871,15.533,13.181,11.017,8.841,6.677,4.577,2.589,0.739,-0.971,-2.345,-3.476,-4.345,-5.04,-5.713,-6.303,-6.867,-7.298,-7.648,-7.901,-8.054,-8.144,-8.143,-8.068,-8.081,-7.97,-8.006,-7.92,-7.845,-7.776,-7.641,-7.317,-7.012,-6.587,-6.083,-5.666,-5.257,-4.904,-4.596,-4.16,-3.447,-2.392,-0.937,0.896,2.988,5.347],"torque_other":[-0.895,-2.238,-3.507,-4.699,-5.79,-6.963,-7.901,-8.946,-9.694,-10.465,-10.838,-11.239,-11.501,-11.411,-11.36,-11.133,-10.845,-10.41,-10.016,-9.495,-8.907,-8.091,-7.231,-6.284,-5.339,-4.538,-3.999,-3.652,-3.525,-3.331,-3.041,-2.358,-1.271,0.255,2.251,4.635,7.34,10.347,13.591,17.113,20.564,23.983,27.117,30.504,33.442,36.529,39.002,41.669,43.443,44.901,45.723,45.655,45.079,43.984,42.213,40.013,37.702,34.985,31.952,28.981,26.367,23.515,20.87,18.489,15.942,13.615,11.139,8.874,6.505,4.286,2.314,0.594],"knee_deg":[78.79,80.48,82.31,84.36,86.54,88.79,91.22,93.66,96.12,98.53,100.97,103.49,106.11,108.65,111.47,114.26,117.04,120.06,122.94,125.95,128.78,131.55,134.2,136.63,138.9,140.96,142.79,144.35,145.56,146.62,147.2,147.65,147.65,147.21,146.37,145.09,143.39,141.24,138.88,136.35,133.68,130.88,128.01,125.04,122.07,119.12,116.19,113.25,110.42,107.67,104.97,102.31,99.66,97.2,94.87,92.71,90.56,88.67,86.89,85.09,83.36,81.68,80.18,78.83,77.61,76.55,75.79,75.32,75.23,75.54,76.21,77.33],"hip_deg":[108.04,107.95,107.94,108.05,108.37,108.66,109.3,110.05,110.95,111.89,112.93,114.04,115.47,116.79,118.31,119.92,121.34,123.19,124.78,126.38,127.86,129.33,130.71,131.95,133.11,134.19,135.18,136.08,136.94,137.77,138.63,139.37,140.0,140.57,140.93,141.19,141.24,141.02,140.87,140.37,139.89,139.33,138.74,138.06,137.32,136.64,135.86,135.07,134.2,133.27,132.2,131.15,129.93,128.78,127.34,126.15,124.86,123.8,122.44,121.18,119.65,118.15,116.76,115.34,113.97,112.71,111.46,110.38,109.55,108.85,108.39,108.3],"ankle_deg":[111.47,110.82,110.48,110.29,110.12,110.35,110.49,110.8,111.18,111.62,112.11,112.59,112.96,113.78,114.01,114.57,115.36,115.9,116.67,117.54,118.61,119.64,120.72,121.95,123.31,124.8,126.2,127.56,128.8,129.94,131.05,131.76,132.39,132.88,133.04,133.12,132.86,132.48,132.17,131.69,131.1,130.65,130.22,129.82,129.46,129.17,128.95,128.81,128.64,128.57,128.5,128.39,128.35,128.16,128.13,128.02,127.85,127.42,127.22,126.88,126.34,125.63,124.69,123.66,122.37,120.69,119.19,117.7,116.27,114.83,113.88,112.46],"markers":{"knee":[[0.1356,0.6445],[0.1358,0.6454],[0.1356,0.6453],[0.1348,0.6436],[0.1339,0.6403],[0.1327,0.6363],[0.1309,0.6303],[0.1288,0.6236],[0.1264,0.6159],[0.1239,0.6074],[0.1208,0.5985],[0.1175,0.5885],[0.1133,0.5775],[0.1096,0.5668],[0.104,0.5541],[0.0983,0.5417],[0.0924,0.5293],[0.0847,0.5159],[0.0771,0.5029],[0.0683,0.4899],[0.0598,0.4776],[0.0502,0.466],[0.0407,0.4545],[0.0314,0.4439],[0.0219,0.4339],[0.0128,0.4245],[0.0038,0.4159],[-0.0047,0.408],[-0.0122,0.4013],[-0.0198,0.3952],[-0.0259,0.3904],[-0.0321,0.3862],[-0.0367,0.3831],[-0.0402,0.3812],[-0.0425,0.38],[-0.0435,0.3798],[-0.0435,0.3804],[-0.0419,0.3818],[-0.0395,0.3843],[-0.0364,0.3871],[-0.0324,0.3903],[-0.0279,0.3943],[-0.0228,0.3987],[-0.017,0.4036],[-0.011,0.409],[-0.0048,0.415],[0.0017,0.4215],[0.0086,0.4285],[0.0154,0.4357],[0.0222,0.4435],[0.0294,0.4516],[0.0364,0.4604],[0.0438,0.4697],[0.0506,0.4792],[0.0577,0.4884],[0.0641,0.4982],[0.0708,0.5084],[0.0765,0.5177],[0.0825,0.5276],[0.0886,0.5381],[0.0945,0.5488],[0.1002,0.5599],[0.1055,0.5706],[0.1105,0.581],[0.1152,0.5912],[0.1195,0.6009],[0.1234,0.6105],[0.127,0.6189],[0.1301,0.6266],[0.1324,0.6331],[0.1344,0.6389],[0.1352,0.6424]],"ankle":[[-0.0815,0.2929],[-0.0711,0.287],[-0.0609,0.28],[-0.0507,0.2716],[-0.0408,0.2619],[-0.0307,0.2516],[-0.0212,0.2397],[-0.0124,0.2276],[-0.0043,0.215],[0.0031,0.2022],[0.0097,0.1893],[0.0155,0.1758],[0.0203,0.1614],[0.0253,0.148],[0.0279,0.1326],[0.0303,0.1179],[0.0321,0.1035],[0.0323,0.0884],[0.0319,0.0741],[0.0304,0.0599],[0.0284,0.0466],[0.0251,0.034],[0.0211,0.0216],[0.0164,0.0103],[0.011,-0.0002],[0.005,-0.01],[-0.0021,-0.019],[-0.0098,-0.0271],[-0.0181,-0.0338],[-0.0273,-0.0399],[-0.037,-0.0445],[-0.0477,-0.0486],[-0.0585,-0.0512],[-0.0697,-0.0524],[-0.0814,-0.0526],[-0.0932,-0.0513],[-0.1056,-0.0488],[-0.1177,-0.0447],[-0.1291,-0.0391],[-0.14,-0.0324],[-0.1503,-0.0249],[-0.1595,-0.016],[-0.1679,-0.006],[-0.1754,0.005],[-0.182,0.0167],[-0.1875,0.0292],[-0.192,0.0425],[-0.1953,0.0562],[-0.1978,0.0701],[-0.1992,0.0841],[-0.1997,0.0982],[-0.1996,0.1127],[-0.1984,0.1275],[-0.197,0.1419],[-0.1942,0.1556],[-0.1913,0.169],[-0.1876,0.1827],[-0.1845,0.1949],[-0.18,0.2071],[-0.1751,0.2194],[-0.1699,0.2317],[-0.1643,0.2438],[-0.1589,0.2549],[-0.1531,0.2651],[-0.1473,0.2746],[-0.1415,0.283],[-0.1346,0.29],[-0.1273,0.2953],[-0.119,0.2989],[-0.1104,0.3004],[-0.1005,0.3003],[-0.0914,0.2974]],"illiaque":[[-0.219,0.8941],[-0.2194,0.8945],[-0.2201,0.8949],[-0.2207,0.8952],[-0.2211,0.8952],[-0.2214,0.895],[-0.2221,0.8946],[-0.2228,0.8941],[-0.2235,0.8936],[-0.2238,0.8927],[-0.2243,0.8918],[-0.2243,0.891],[-0.2248,0.89],[-0.2247,0.8891],[-0.2246,0.8881],[-0.2243,0.8874],[-0.2234,0.8865],[-0.2232,0.8861],[-0.2221,0.8854],[-0.2212,0.8849],[-0.2197,0.8841],[-0.2191,0.8834],[-0.2179,0.8824],[-0.2167,0.8814],[-0.2156,0.8802],[-0.2145,0.8789],[-0.2134,0.8775],[-0.212,0.8762],[-0.2107,0.875],[-0.2095,0.8739],[-0.2085,0.873],[-0.2074,0.8722],[-0.2063,0.8716],[-0.2058,0.8715],[-0.2053,0.8715],[-0.2055,0.8717],[-0.2058,0.8721],[-0.2062,0.8725],[-0.2073,0.8733],[-0.2081,0.8738],[-0.2088,0.8741],[-0.2099,0.8746],[-0.2109,0.8749],[-0.2117,0.8752],[-0.2124,0.8754],[-0.2134,0.8758],[-0.2143,0.8763],[-0.2151,0.877],[-0.2158,0.8776],[-0.2167,0.8785],[-0.2171,0.8793],[-0.2179,0.8804],[-0.2185,0.8813],[-0.2192,0.8826],[-0.2188,0.8832],[-0.2197,0.8843],[-0.22,0.8852],[-0.2205,0.8861],[-0.2202,0.8868],[-0.2204,0.8876],[-0.22,0.8883],[-0.2198,0.8889],[-0.2195,0.8894],[-0.2192,0.8899],[-0.2188,0.8902],[-0.2184,0.8906],[-0.2182,0.891],[-0.2177,0.8913],[-0.2176,0.8918],[-0.2176,0.8923],[-0.2179,0.893],[-0.2188,0.8937]],"troch":[[-0.2239,0.7788],[-0.2245,0.78],[-0.2253,0.7809],[-0.2263,0.7813],[-0.2269,0.7812],[-0.2277,0.7805],[-0.2285,0.7792],[-0.2293,0.7776],[-0.23,0.7759],[-0.2305,0.7736],[-0.2311,0.7714],[-0.2313,0.7691],[-0.2318,0.7666],[-0.2318,0.7642],[-0.232,0.7617],[-0.2321,0.7594],[-0.2319,0.757],[-0.2321,0.755],[-0.2318,0.7529],[-0.232,0.7509],[-0.2317,0.749],[-0.2323,0.7473],[-0.2325,0.7454],[-0.2328,0.7436],[-0.2332,0.7417],[-0.2336,0.7397],[-0.2339,0.7378],[-0.2341,0.736],[-0.234,0.7343],[-0.234,0.7328],[-0.2335,0.7315],[-0.2332,0.7304],[-0.2327,0.7297],[-0.2323,0.7293],[-0.2319,0.7291],[-0.2318,0.7292],[-0.232,0.7294],[-0.2321,0.7296],[-0.2325,0.7303],[-0.2329,0.7308],[-0.233,0.7313],[-0.2334,0.7319],[-0.2335,0.7325],[-0.2334,0.7331],[-0.2331,0.7336],[-0.2328,0.7343],[-0.2326,0.7353],[-0.2321,0.7362],[-0.2317,0.7373],[-0.2315,0.7387],[-0.231,0.74],[-0.2309,0.7418],[-0.2306,0.7436],[-0.2305,0.7457],[-0.2299,0.7473],[-0.23,0.7496],[-0.2297,0.7515],[-0.2294,0.7535],[-0.2288,0.7555],[-0.2284,0.7576],[-0.2279,0.7596],[-0.2275,0.7616],[-0.2269,0.7635],[-0.2264,0.7653],[-0.2258,0.767],[-0.2253,0.7686],[-0.2249,0.7702],[-0.2242,0.7715],[-0.2236,0.773],[-0.2234,0.7744],[-0.2232,0.776],[-0.2235,0.7774]],"foot":[[0.0078,0.1736],[0.0228,0.1716],[0.037,0.1682],[0.0509,0.1633],[0.0643,0.157],[0.0772,0.1496],[0.0895,0.1408],[0.1007,0.1312],[0.1108,0.121],[0.12,0.1102],[0.128,0.0991],[0.1353,0.0872],[0.1415,0.0747],[0.1473,0.062],[0.1513,0.0485],[0.1547,0.0349],[0.1572,0.021],[0.1583,0.0068],[0.1584,-0.0072],[0.1575,-0.0214],[0.1556,-0.0354],[0.1526,-0.0487],[0.1485,-0.0621],[0.1434,-0.0751],[0.1372,-0.0878],[0.1299,-0.1003],[0.1215,-0.112],[0.112,-0.1231],[0.1018,-0.133],[0.0905,-0.142],[0.0782,-0.1501],[0.0653,-0.1569],[0.0518,-0.1625],[0.0376,-0.1667],[0.0232,-0.1695],[0.0082,-0.1708],[-0.0072,-0.1707],[-0.0225,-0.169],[-0.0375,-0.1658],[-0.0518,-0.1613],[-0.0653,-0.1556],[-0.0781,-0.1487],[-0.0901,-0.1405],[-0.1014,-0.1314],[-0.1117,-0.1213],[-0.121,-0.1104],[-0.1292,-0.0986],[-0.1364,-0.0862],[-0.1424,-0.0735],[-0.1472,-0.0606],[-0.1509,-0.0474],[-0.1536,-0.0337],[-0.1552,-0.0196],[-0.1558,-0.0057],[-0.1552,0.0076],[-0.1538,0.0207],[-0.1514,0.0341],[-0.1485,0.0464],[-0.1445,0.0586],[-0.1395,0.0712],[-0.1335,0.0839],[-0.1264,0.0965],[-0.1187,0.1084],[-0.11,0.1196],[-0.1005,0.1303],[-0.0899,0.1405],[-0.0781,0.1497],[-0.0655,0.1575],[-0.0519,0.164],[-0.0375,0.169],[-0.0226,0.1723],[-0.0074,0.1739]]},"emg_mv":{"GMax":0.0144,"RF":0.0553,"VL":0.119,"VM":0.0647,"BF":0.0411,"Sem":0.0403,"TF":0.0375},"emg":{"GMax":[0.7988,0.8772,0.9278,0.9744,1.0,0.9995,0.9728,0.9302,0.8509,0.7776,0.7006,0.6098,0.5111,0.4141,0.326,0.2504,0.188,0.129,0.0981,0.0701,0.0545,0.05,0.0528,0.0577,0.0677,0.0775,0.0855,0.0918,0.0964,0.0964,0.096,0.0937,0.0913,0.0886,0.0874,0.0881,0.0914,0.0977,0.105,0.1142,0.1247,0.1337,0.1413,0.1483,0.152,0.1534,0.1509,0.1459,0.1395,0.1306,0.1223,0.1151,0.1118,0.1092,0.1104,0.1201,0.133,0.1567,0.1743,0.2005,0.228,0.2611,0.2918,0.3277,0.3624,0.4057,0.4435,0.4903,0.5517,0.592,0.6664,0.7344],"RF":[0.8477,0.7799,0.6928,0.6118,0.518,0.4349,0.362,0.3025,0.242,0.1966,0.1701,0.1343,0.1113,0.0919,0.0785,0.0682,0.0608,0.058,0.0572,0.0568,0.0582,0.0585,0.0614,0.0635,0.0645,0.0656,0.0649,0.0661,0.0662,0.0659,0.0668,0.0698,0.0711,0.0754,0.0786,0.0835,0.0907,0.0972,0.1006,0.1054,0.1082,0.1105,0.1107,0.1106,0.1094,0.1091,0.1086,0.1104,0.1142,0.1195,0.1265,0.1365,0.1573,0.1755,0.2029,0.2381,0.2732,0.3136,0.375,0.4374,0.4984,0.5778,0.6449,0.7314,0.8095,0.8733,0.9369,0.9869,1.0,0.9787,0.9702,0.9097],"VL":[0.9758,0.9314,0.8808,0.8116,0.728,0.6411,0.5414,0.4498,0.3507,0.2764,0.2116,0.1495,0.1001,0.0649,0.0374,0.0226,0.0149,0.0114,0.0127,0.015,0.0196,0.0267,0.0331,0.0382,0.0417,0.0435,0.0434,0.0415,0.0387,0.0356,0.0322,0.0298,0.0269,0.0259,0.0247,0.0251,0.0267,0.0286,0.03,0.0308,0.0307,0.0289,0.026,0.021,0.0153,0.0095,0.005,0.0023,0.0018,0.0033,0.0079,0.0191,0.0378,0.071,0.1062,0.1521,0.2102,0.2722,0.3333,0.4031,0.4731,0.5478,0.6218,0.6897,0.7551,0.8146,0.8678,0.9283,0.9603,0.9761,1.0,0.9958],"VM":[0.9963,0.9765,0.9321,0.8774,0.8023,0.7086,0.621,0.5315,0.4297,0.3511,0.285,0.219,0.1604,0.1193,0.0842,0.059,0.0461,0.0407,0.0411,0.0442,0.0491,0.0566,0.0629,0.0682,0.0728,0.0744,0.0742,0.0725,0.0696,0.0664,0.0631,0.0604,0.0575,0.0568,0.0564,0.0582,0.061,0.0633,0.0644,0.0646,0.0631,0.0606,0.0569,0.0519,0.0464,0.0419,0.0392,0.0396,0.0445,0.0552,0.0707,0.0949,0.1288,0.1671,0.2094,0.2593,0.3137,0.3695,0.4323,0.4877,0.5469,0.6089,0.6588,0.7163,0.7668,0.8089,0.8553,0.9099,0.9373,0.9669,0.9901,1.0],"BF":[0.3213,0.3193,0.3162,0.324,0.3377,0.3705,0.4077,0.4661,0.5328,0.5989,0.6479,0.7638,0.8278,0.9024,0.9386,0.9548,1.0,0.9732,0.943,0.9046,0.8364,0.7851,0.7158,0.6324,0.5781,0.5127,0.4482,0.4031,0.363,0.3313,0.3128,0.2954,0.2708,0.2604,0.2481,0.2456,0.2361,0.237,0.2177,0.211,0.201,0.1865,0.1755,0.1565,0.144,0.1201,0.102,0.0858,0.0712,0.0591,0.0533,0.0477,0.0485,0.0519,0.06,0.0726,0.0879,0.1068,0.1248,0.1445,0.1689,0.1945,0.2173,0.2415,0.2632,0.2786,0.2963,0.3154,0.3215,0.324,0.3237,0.3229],"Sem":[0.1585,0.174,0.2008,0.2421,0.2871,0.3526,0.4246,0.5057,0.5975,0.6826,0.7455,0.8404,0.8704,0.9685,0.9739,0.9975,1.0,0.9746,0.9605,0.931,0.905,0.8267,0.77,0.6886,0.634,0.5631,0.479,0.422,0.3616,0.3096,0.2661,0.2283,0.199,0.1786,0.1553,0.1454,0.1356,0.127,0.1182,0.1123,0.1085,0.0994,0.092,0.0857,0.0764,0.0691,0.0627,0.0563,0.0516,0.048,0.0464,0.0457,0.0471,0.0508,0.0558,0.0609,0.071,0.0802,0.0886,0.0998,0.1116,0.1235,0.1342,0.1445,0.1525,0.1564,0.1615,0.1625,0.1632,0.1572,0.1533,0.1584],"TF":[0.7662,0.7593,0.7344,0.7025,0.6539,0.5979,0.5316,0.4721,0.3836,0.3246,0.2725,0.2181,0.1686,0.1346,0.1071,0.0929,0.0889,0.099,0.108,0.1393,0.177,0.1919,0.2473,0.2863,0.3438,0.4037,0.4563,0.5155,0.5836,0.618,0.6934,0.7554,0.8024,0.8671,0.89,0.922,0.9821,1.0,0.9903,0.9856,0.9784,0.9669,0.9463,0.9346,0.8924,0.8617,0.8172,0.7724,0.7282,0.6619,0.5962,0.5487,0.5008,0.4098,0.3834,0.371,0.3674,0.3772,0.3644,0.3788,0.4093,0.4441,0.4799,0.5326,0.5782,0.625,0.6622,0.7105,0.7295,0.7363,0.7691,0.7659]}};

/* moment arms per recorded channel, metres, same convention as the previous
   page: dL = -rK*dThetaKnee - rH*dThetaHip, and a positive arm means the
   muscle shortens as that joint extends */
var CHAN = [
  ['VL',   'Vastus lateralis',  'BLUE', 0.045, 0.000],
  ['VM',   'Vastus medialis',   'BLUE', 0.045, 0.000],
  ['RF',   'Rectus femoris',    'ORG',  0.045, -0.050],
  ['BF',   'Biceps femoris',    'VIO', -0.035, 0.060],
  ['Sem',  'Semitendinosus',    'VIO', -0.035, 0.060],
  ['GMax', 'Gluteus maximus',   'GRN',  0.000, 0.060],
  ['TF',   'Tensor fasciae latae', 'ACC', 0.000, -0.050]
];
var CH = {};
CHAN.forEach(function (c) { CH[c[0]] = { nm: c[1], col: c[2], rK: c[3], rH: c[4] }; });
/* optimal fibre length and peak isometric force per muscle group — the usual
   representative values, on sliders because nobody measured this rider's */
var CHP = { VL:[0.090,3000], VM:[0.090,2000], RF:[0.090,1200], BF:[0.100,1500],
            Sem:[0.100,1000], GMax:[0.120,2500], TF:[0.100,600] };
CHAN.forEach(function (c) { CH[c[0]].L0 = CHP[c[0]][0]; CH[c[0]].F0 = CHP[c[0]][1]; });

/* THE POINT OF THIS PAGE.
   Page one drives the muscle model with a sine wave and a slider. Page two
   swaps the sine for a measured length. Here the slider goes too: activation
   is the measured EMG envelope. Same model, same force–length and
   force–velocity curves, same work loop — everything feeding it is now data
   except the force generation itself, which cannot be measured in a person. */
function measSim(key, S) {
  var c = CH[key], i;
  var n = 360, T = 60 / MEAS.cadence_rpm, dt = T / n;
  var L0 = c.L0, F0 = S.F0, Vx = 10, af = 0.30, penn0 = 0.087;
  var w = L0 * Math.sin(penn0), V0 = Vx * L0, DEG = Math.PI / 180;

  var kn = cycSmooth(MEAS.knee_deg, n, 8), hp = cycSmooth(MEAS.hip_deg, n, 8);
  var env = cycSmooth(MEAS.emg[key], n, 8);
  var mk = 0, mh = 0;
  for (i = 0; i < n; i++) { mk += kn[i]; mh += hp[i]; }
  mk /= n; mh /= n;

  var pos = new Float64Array(n);
  for (i = 0; i < n; i++) pos[i] = (-S.rK * (kn[i] - mk) - S.rH * (hp[i] - mh)) * DEG;

  /* EMG is not activation. Two things sit between them, and leaving either
     out puts the force in the wrong half of the stroke — with neither, the
     vasti come out doing NEGATIVE work, which is plainly wrong for cycling.
       · electromechanical delay: force lags the signal by a few tens of ms
       · activation dynamics: the same first-order rise and fall as page one
     The envelope was filtered zero-phase, so none of this lag is in it yet. */
  var tauA = 0.010, tauD = 0.040;
  var shift = Math.round(S.emd / dt);
  var exc = new Float64Array(n);
  for (i = 0; i < n; i++) exc[i] = Math.max(0, Math.min(1, env[(i - shift + 2 * n) % n] * S.gain));
  var a = new Float64Array(n), av = 0;
  for (var rep2 = 0; rep2 < 3; rep2++) {
    for (i = 0; i < n; i++) {
      var ex = exc[(i - 1 + n) % n], tau = ex >= av ? tauA : tauD;
      av = ex + (av - ex) * Math.exp(-dt / tau);
      if (rep2 === 2) a[i] = av;
    }
  }
  var vel = new Float64Array(n);
  for (i = 0; i < n; i++) vel[i] = -(pos[(i + 1) % n] - pos[(i - 1 + n) % n]) / (2 * dt);

  var force = new Float64Array(n), lenMM = new Float64Array(n), pct = new Float64Array(n);
  var wTot = 0, wPos = 0, wNeg = 0;
  for (i = 0; i < n; i++) {
    var penn = Math.asin(w / (pos[i] + L0));
    var Ln = (pos[i] / Math.cos(penn0) + L0) / L0;
    var v = vel[i] / Math.cos(penn);
    var V0a = (Vx / 2) + (Vx / 2) * a[i];
    var vn = v / (V0 * V0a / Vx);
    var fv;
    if (v > V0 * V0a) fv = 0;
    else if (vn > 0) fv = (1 - vn) / (1 + vn / af);
    else fv = 1.8 - (0.8 * (1 + v / V0)) / (1 - 7.56 * 0.21 * v / V0);
    force[i] = a[i] * F0 * vmlFL(Ln) * fv;
    lenMM[i] = pos[i] * 1000;
    pct[i] = i / n * 100;
    var dw = force[i] * v * dt;
    wTot += dw; if (dw > 0) wPos += dw; else wNeg += dw;
  }
  return { n: n, pct: pct, lenMM: lenMM, force: force, act: a, vel: vel,
           workTot: wTot, workPos: wPos, workNeg: wNeg, powerTot: wTot / T, key: key };
}

D.register('measured', function (node, d) {
  var port = D.portrait();
  var u = D.build(node, {});
  node.classList.add('cyc-wrap', 'meas-wrap');
  u.ctl.classList.add('g2');

  var N = MEAS.n_phase;
  var S = { chan: 'VL', gain: 1.0, emd: 0.040, rK: CH.VL.rK, rH: CH.VL.rH, F0: CH.VL.F0 };
  var SIM = null, ALL = null;
  function runSim() {
    /* every muscle, so the loops can be added up against the measured crank
       work — that sum is the whole argument of the three pages */
    ALL = {};
    CHAN.forEach(function (c) {
      var k = c[0];
      ALL[k] = measSim(k, { chan: k, gain: S.gain, emd: S.emd,
                            rK: k === S.chan ? S.rK : CH[k].rK,
                            rH: k === S.chan ? S.rH : CH[k].rH,
                            F0: k === S.chan ? S.F0 : CH[k].F0 });
    });
    SIM = ALL[S.chan];
  }
  var phase = 20, playing = false, last = 0;

  var AXH = port ? 520 : 400;
  var ax = null, cacheCv = null, cacheAx = null, cache = null, MAP = {};
  function sizeAxes() {
    var before = ax;
    var wpx = port ? 460 : Math.min(1700, Math.max(620, Math.round(u.stage.offsetWidth) || 1180));
    if (ax && Math.abs(ax.W - wpx) < 2) return;
    ax = new Axes(u.cv, { w: wpx, h: AXH, padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
    u.cv.style.maxWidth = 'none'; u.cv.style.width = '100%';
    if (before) cache = null;
  }

  /* ---------------- muscle length from the measured joint angles ------- */
  var DEG = Math.PI / 180;
  function lengthOf(key) {
    var c = CH[key], out = new Float64Array(N), i;
    var mk = 0, mh = 0;
    for (i = 0; i < N; i++) { mk += MEAS.knee_deg[i]; mh += MEAS.hip_deg[i]; }
    mk /= N; mh /= N;
    for (i = 0; i < N; i++) {
      out[i] = (-c.rK * (MEAS.knee_deg[i] - mk) - c.rH * (MEAS.hip_deg[i] - mh)) * DEG * 1000;
    }
    return out;
  }
  var LEN = {};
  CHAN.forEach(function (c) { LEN[c[0]] = lengthOf(c[0]); });

  function at(arr, p) {
    var uu = p / 100 * N, k = Math.floor(uu), f = uu - k;
    return arr[k % N] * (1 - f) + arr[(k + 1) % N] * f;
  }
  function mAt(name, p) {
    var a = MEAS.markers[name], uu = p / 100 * N, k = Math.floor(uu), f = uu - k;
    var A = a[k % N], B = a[(k + 1) % N];
    return [A[0] * (1 - f) + B[0] * f, A[1] * (1 - f) + B[1] * f];
  }

  /* ---------------- the leg ---------------- */
  var BOX = (function () {
    var lo = [1e9, 1e9], hi = [-1e9, -1e9];
    Object.keys(MEAS.markers).forEach(function (k) {
      MEAS.markers[k].forEach(function (p) {
        lo[0] = Math.min(lo[0], p[0]); hi[0] = Math.max(hi[0], p[0]);
        lo[1] = Math.min(lo[1], p[1]); hi[1] = Math.max(hi[1], p[1]);
      });
    });
    var r = MEAS.crank_r_m * 1.2;
    return { lo: [Math.min(lo[0], -r), Math.min(lo[1], -r)],
             hi: [Math.max(hi[0], r), Math.max(hi[1], r)] };
  })();
  function legPanel(x0, y0, w, h) {
    var c = ax.c, K = C(), j;
    var lo = BOX.lo, hi = BOX.hi, PT = 36, PB = 20, PL = 8, PR = 8;
    var s = Math.min((w - PL - PR) / (hi[0] - lo[0]), (h - PT - PB) / (hi[1] - lo[1]));
    var ox = x0 + PL + ((w - PL - PR) - (hi[0] - lo[0]) * s) / 2 - lo[0] * s;
    var oy = y0 + PT + ((h - PT - PB) - (hi[1] - lo[1]) * s) + hi[1] * s;
    function X(v) { return ox + v * s; }
    function Y(v) { return oy - v * s; }
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .4; c.setLineDash([3, 4]); c.lineWidth = 1.2;
    c.beginPath(); c.arc(X(0), Y(0), MEAS.crank_r_m * s, 0, 7); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.MUT; c.globalAlpha = .6;
    c.beginPath(); c.arc(X(0), Y(0), 2.6, 0, 7); c.fill(); c.restore();

    /* torque at this instant drives the colour: red where the leg is being
       driven backwards by the other one */
    var tq = at(MEAS.torque_marked, phase);
    var col = tq >= 0 ? K.BLUE : K.ACC;
    [['illiaque', 'troch'], ['troch', 'knee'], ['knee', 'ankle'], ['ankle', 'foot']].forEach(function (seg2, i2) {
      var A = mAt(seg2[0], phase), B = mAt(seg2[1], phase);
      c.save(); c.strokeStyle = i2 === 0 ? K.INK : col; c.lineWidth = i2 === 0 ? 4 : 5;
      c.lineCap = 'round'; c.globalAlpha = i2 === 0 ? .85 : 1;
      c.beginPath(); c.moveTo(X(A[0]), Y(A[1])); c.lineTo(X(B[0]), Y(B[1])); c.stroke(); c.restore();
    });
    ['illiaque', 'troch', 'knee', 'ankle'].forEach(function (k) {
      var P2 = mAt(k, phase);
      c.save(); c.fillStyle = K.PLATE; c.strokeStyle = K.INK; c.lineWidth = 1.6;
      c.beginPath(); c.arc(X(P2[0]), Y(P2[1]), 3, 0, 7); c.fill(); c.stroke(); c.restore();
    });
    var F = mAt('foot', phase);
    c.save(); c.fillStyle = col; c.beginPath(); c.arc(X(F[0]), Y(F[1]), 5.5, 0, 7); c.fill(); c.restore();
    label(c, 'Participant ' + MEAS.sub.slice(1) + ' · ' + fmt(MEAS.cadence_rpm, 0) + ' rpm · ' +
             fmt(MEAS.power_lode_W, 0) + ' W', x0 + w / 2, y0 + 12,
          { color: K.INK, size: 12, align: 'center' });
    label(c, num(tq, 1) + ' N·m at ' + fmt(phase, 0) + ' %', x0 + w / 2, y0 + 26,
          { color: col, size: 11.5, align: 'center' });
    label(c, fmt(MEAS.revs, 0) + ' revolutions averaged', x0 + w / 2, y0 + h - 5,
          { color: K.MUT, size: 10.5, align: 'center' });
  }

  /* ---------------- measured pedal torque ---------------- */
  function torquePanel(x0, y0, w, h) {
    var c = ax.c, K = C(), i;
    var A = MEAS.torque_marked, B = MEAS.torque_other;
    var lo = Math.min(0, Math.min.apply(null, A), Math.min.apply(null, B));
    var hi = Math.max.apply(null, A.concat(B));
    var pad = (hi - lo) * .10; lo -= pad; hi += pad;
    var PL = 54, PB = 32, PT = 38, PR = 12;
    function X(p) { return x0 + PL + p / 100 * (w - PL - PR); }
    function Y(v) { return y0 + h - PB - (v - lo) / (hi - lo) * (h - PB - PT); }

    /* the shaded area IS the work: torque integrated over crank angle */
    c.save(); c.fillStyle = 'rgba(74,222,128,0.16)';
    c.beginPath(); c.moveTo(X(0), Y(0));
    for (i = 0; i < N; i++) c.lineTo(X(i / N * 100), Y(Math.max(A[i], 0)));
    c.lineTo(X(100), Y(0)); c.closePath(); c.fill(); c.restore();
    var neg = A.some(function (v) { return v < 0; });
    if (neg) {
      c.save(); c.fillStyle = 'rgba(248,113,113,0.20)';
      c.beginPath(); c.moveTo(X(0), Y(0));
      for (i = 0; i < N; i++) c.lineTo(X(i / N * 100), Y(Math.min(A[i], 0)));
      c.lineTo(X(100), Y(0)); c.closePath(); c.fill(); c.restore();
    }
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + PL, y0 + PT); c.lineTo(x0 + PL, y0 + h - PB);
    c.lineTo(x0 + w - PR, y0 + h - PB); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .5; c.setLineDash([3, 4]);
    c.beginPath(); c.moveTo(x0 + PL, Y(0)); c.lineTo(x0 + w - PR, Y(0)); c.stroke(); c.restore();
    axisTicks(lo, hi).forEach(function (v) {
      if (v < lo || v > hi) return;
      label(c, num(v, 0), x0 + PL - 6, Y(v), { color: K.MUT, size: 10.5, align: 'right' });
    });
    [0, 25, 50, 75, 100].forEach(function (p) {
      label(c, fmt(p, 0), X(p), y0 + h - PB + 11, { color: K.MUT, size: 10, align: 'center' });
    });
    [[B, K.MUT, 1.6, .75], [A, K.BLUE, 2.8, 1]].forEach(function (q) {
      c.save(); c.strokeStyle = q[1]; c.lineWidth = q[2]; c.globalAlpha = q[3]; c.beginPath();
      for (i = 0; i < N; i++) { var px = X(i / N * 100), py = Y(q[0][i]); i ? c.lineTo(px, py) : c.moveTo(px, py); }
      c.lineTo(X(100), Y(q[0][0])); c.stroke(); c.restore();
    });
    label(c, 'Measured pedal torque (N·m) — shaded area is the work', x0 + PL, y0 + 11,
          { color: K.INK, size: 12, align: 'left' });
    var kx = x0 + PL;
    [['this leg', K.BLUE], ['the other leg', K.MUT]].forEach(function (q) {
      c.save(); c.fillStyle = q[1]; c.fillRect(kx, y0 + 20, 13, 3); c.restore();
      label(c, q[0], kx + 17, y0 + 22, { color: q[1], size: 11, align: 'left' });
      c.save(); c.font = '600 11px ui-sans-serif,system-ui,sans-serif';
      kx += 17 + c.measureText(q[0]).width + 18; c.restore();
    });
    label(c, '% of the crank cycle   ·   0 = top dead centre',
          x0 + (PL + w) / 2, y0 + h - 4, { color: K.MUT, size: 10.5, align: 'center' });
    return { X: X, Y: Y, top: y0 + PT, bot: y0 + h - PB, arr: A };
  }

  /* ---------------- measured EMG against modelled length ---------------- */
  function emgPanel(x0, y0, w, h) {
    var c = ax.c, K = C(), i;
    var key = S.chan, col = K[CH[key].col];
    var E = MEAS.emg[key], L = LEN[key];
    var PL = 54, PB = 32, PT = 38, PR = 62;
    var llo = 1e9, lhi = -1e9;
    for (i = 0; i < N; i++) { llo = Math.min(llo, L[i]); lhi = Math.max(lhi, L[i]); }
    var lp = (lhi - llo) * .18 || 1; llo -= lp; lhi += lp;
    function X(p) { return x0 + PL + p / 100 * (w - PL - PR); }
    function YE(v) { return y0 + h - PB - v * (h - PB - PT); }
    function YL(v) { return y0 + h - PB - (v - llo) / (lhi - llo) * (h - PB - PT); }

    c.save(); c.fillStyle = col; c.globalAlpha = .17;
    c.beginPath(); c.moveTo(X(0), YE(0));
    for (i = 0; i < N; i++) c.lineTo(X(i / N * 100), YE(E[i]));
    c.lineTo(X(100), YE(E[0])); c.lineTo(X(100), YE(0)); c.closePath(); c.fill(); c.restore();
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + PL, y0 + PT); c.lineTo(x0 + PL, y0 + h - PB);
    c.lineTo(x0 + w - PR, y0 + h - PB); c.stroke(); c.restore();
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      label(c, fmt(v * 100, 0) + '%', x0 + PL - 6, YE(v), { color: col, size: 10.5, align: 'right' });
    });
    axisTicks(llo, lhi).forEach(function (v) {
      if (v < llo || v > lhi) return;
      label(c, num(v, 0), x0 + w - PR + 7, YL(v), { color: K.MUT, size: 10.5, align: 'left' });
    });
    [0, 25, 50, 75, 100].forEach(function (p) {
      label(c, fmt(p, 0), X(p), y0 + h - PB + 11, { color: K.MUT, size: 10, align: 'center' });
    });
    c.save(); c.strokeStyle = col; c.lineWidth = 2.6; c.beginPath();
    for (i = 0; i < N; i++) { var px = X(i / N * 100), py = YE(E[i]); i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.lineTo(X(100), YE(E[0])); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath();
    for (i = 0; i < N; i++) { var qx = X(i / N * 100), qy = YL(L[i]); i ? c.lineTo(qx, qy) : c.moveTo(qx, qy); }
    c.lineTo(X(100), YL(L[0])); c.stroke(); c.restore();

    label(c, CH[key].nm + ' — measured EMG against modelled length', x0 + PL, y0 + 11,
          { color: K.INK, size: 12, align: 'left' });
    label(c, 'EMG, % of its own peak (' + fmt(MEAS.emg_mv[key] * 1000, 0) + ' µV)',
          x0 + PL, y0 + 23, { color: col, size: 10.5, align: 'left' });
    label(c, 'length (mm)', x0 + w - 3, y0 + 23, { color: K.MUT, size: 10.5, align: 'right' });
    label(c, '% of the crank cycle', x0 + (PL + w - PR) / 2, y0 + h - 4,
          { color: K.MUT, size: 10.5, align: 'center' });
    return { X: X, YE: YE, YL: YL, top: y0 + PT, bot: y0 + h - PB, E: E, L: L };
  }

  /* ---------------- the work loop, same picture as page one ------------- */
  function loopPanel(x0, y0, w, h) {
    var c = ax.c, K = C(), i, sim = SIM;
    var col = K[CH[S.chan].col];
    var PL = 56, PB = 34, PT = 38, PR = 14;
    var lx = 1e9, hx = -1e9, hy = 0;
    for (i = 0; i < sim.n; i++) {
      lx = Math.min(lx, sim.lenMM[i]); hx = Math.max(hx, sim.lenMM[i]);
      hy = Math.max(hy, sim.force[i]);
    }
    var px = (hx - lx) * .12 || 1; lx -= px; hx += px; hy = hy * 1.14 || 1;
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
    c.save();
    c.fillStyle = sim.workTot >= 0 ? 'rgba(74,222,128,0.16)' : 'rgba(248,113,113,0.16)';
    c.beginPath();
    for (i = 0; i < sim.n; i++) { var fx = X(sim.lenMM[i]), fy = Y(sim.force[i]); i ? c.lineTo(fx, fy) : c.moveTo(fx, fy); }
    c.closePath(); c.fill(); c.restore();
    c.save(); c.strokeStyle = col; c.lineWidth = 2.6; c.beginPath();
    for (i = 0; i < sim.n; i++) { var qx = X(sim.lenMM[i]), qy = Y(sim.force[i]); i ? c.lineTo(qx, qy) : c.moveTo(qx, qy); }
    c.closePath(); c.stroke(); c.restore();
    [0.10, 0.35, 0.60, 0.85].forEach(function (f) {
      var i0 = Math.round(f * (sim.n - 1)), i1 = Math.min(sim.n - 1, i0 + 6);
      if (i1 <= i0) return;
      arrow(c, X(sim.lenMM[i0]), Y(sim.force[i0]), X(sim.lenMM[i1]), Y(sim.force[i1]),
            { color: col, width: 2.1, head: 9 });
    });
    label(c, 'Work loop — force (N) against length', x0 + PL, y0 + 12,
          { color: K.INK, size: 12.5, align: 'left' });
    label(c, 'measured length, measured activation, page-one muscle model',
          x0 + PL, y0 + 25, { color: K.MUT, size: 10.5, align: 'left' });
    label(c, 'length (mm)   ← shorter    longer →', x0 + (PL + w) / 2, y0 + h - 6,
          { color: K.MUT, size: 11, align: 'center' });
    return { X: X, Y: Y };
  }

  /* ---------------- draw ---------------- */
  var out = readout(u.ctl);
  function buildCache() {
    var real = ax;
    if (!cacheCv) cacheCv = document.createElement('canvas');
    if (!cacheAx || cacheAx.W !== real.W || cacheAx.H !== real.H) {
      cacheAx = new Axes(cacheCv, { w: real.W, h: real.H, padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
    }
    ax = cacheAx; ax.clear();
    var W = real.W, H = real.H;
    if (port) {
      MAP.tq = torquePanel(0, H * 0.34, W, H * 0.22);
      MAP.em = emgPanel(0, H * 0.56, W, H * 0.22);
      MAP.loop = loopPanel(0, H * 0.78, W, H * 0.22);
    } else {
      var fw = W * 0.17, mw = W * 0.41;
      MAP.tq = torquePanel(fw, H * 0.01, mw, H * 0.49);
      MAP.em = emgPanel(fw, H * 0.50, mw, H * 0.50);
      MAP.loop = loopPanel(fw + mw, H * 0.02, W - fw - mw, H * 0.96);
    }
    ax = real; cache = cacheCv;
  }
  function draw() { sizeAxes(); if (!SIM) runSim(); buildCache(); paint(); }
  function paint() {
    if (!ax) { draw(); return; }
    if (!cache) buildCache();
    var W = ax.W, H = ax.H, c = ax.c, K = C();
    ax.clear(); c.drawImage(cache, 0, 0, W, H);
    if (port) legPanel(0, 0, W, H * 0.34); else legPanel(0, 0, W * 0.17, H);
    [[MAP.tq, function (m) { return m.Y(at(m.arr, phase)); }],
     [MAP.em, function (m) { return m.YE(at(m.E, phase)); }]].forEach(function (q) {
      var m = q[0]; if (!m) return;
      c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(m.X(phase), m.top); c.lineTo(m.X(phase), m.bot); c.stroke();
      c.fillStyle = K.ACC; c.beginPath(); c.arc(m.X(phase), q[1](m), 4, 0, 7); c.fill(); c.restore();
    });
    if (MAP.em) {
      c.save(); c.fillStyle = K.MUT;
      c.beginPath(); c.arc(MAP.em.X(phase), MAP.em.YL(at(MAP.em.L, phase)), 3.4, 0, 7); c.fill(); c.restore();
    }
    if (MAP.loop) {
      var j = Math.round(phase / 100 * SIM.n) % SIM.n;
      c.save(); c.fillStyle = K.ACC; c.strokeStyle = K.PLATE; c.lineWidth = 2;
      c.beginPath(); c.arc(MAP.loop.X(SIM.lenMM[j]), MAP.loop.Y(SIM.force[j]), 5.5, 0, 7);
      c.fill(); c.stroke(); c.restore();
    }
  }
  function readOut() {
    var key = S.chan, E = MEAS.emg[key], L = LEN[key], i;
    var pk = 0; for (i = 0; i < N; i++) if (E[i] > E[pk]) pk = i;
    /* Is it shortening while it is active? One sample at the EMG peak is too
       noisy to say, so weight the length velocity by activation across the
       whole burst, and report how much of the burst is spent shortening. */
    var wsum = 0, shortSum = 0;
    for (i = 0; i < N; i++) {
      var v = L[(i + 1) % N] - L[(i - 1 + N) % N];
      wsum += E[i];
      if (v < 0) shortSum += E[i];
    }
    var pctShort = wsum > 0 ? shortSum / wsum * 100 : 0;
    var sum = 0;
    CHAN.forEach(function (c) { sum += ALL[c[0]].workTot; });
    out.innerHTML = 'This leg puts <b>' + num(MEAS.work_marked_J, 0) +
      ' J</b> into the cranks every revolution — measured. The seven muscle loops add up to <b>' +
      num(sum, 0) + ' J</b>, of which ' + CH[key].nm.toLowerCase() + "'s is <b>" +
      num(SIM.workTot, 1) + ' J</b>.' +
      '<span style="opacity:.72">  ·  it peaks at <b>' + fmt(pk / N * 100, 0) +
      ' %</b> of the stroke and spends <b>' + fmt(pctShort, 0) +
      ' %</b> of its activity shortening<i> — same model as page one, driven by ' +
      'measured length and measured activation instead of sliders</i></span>';
  }

  /* ---------------- controls ---------------- */
  keepOut(chips(u.ctl, CHAN.map(function (c) { return [c[0], c[0]]; }), 'VL', function (k) {
    S.chan = k;
    S.rK = CH[k].rK; S.rH = CH[k].rH; S.F0 = CH[k].F0;
    sF0.quiet(S.F0); sRK.quiet(S.rK * 1000); sRH.quiet(S.rH * 1000);
    runSim(); cache = null; readOut(); draw();
  }));

  var asm = el('div', 'cyc-asm');
  asm.style.display = 'none';
  var sGain = slider(asm, 'Activation gain', 20, 200, 1, S.gain * 100,
    function (v) { return fmt(v, 0) + '%'; },
    function (v) { S.gain = v / 100; runSim(); cache = null; readOut(); draw(); });
  var sEmd = slider(asm, 'Electromechanical delay', 0, 120, 1, S.emd * 1000,
    function (v) { return fmt(v, 0) + ' ms'; },
    function (v) { S.emd = v / 1000; runSim(); cache = null; readOut(); draw(); });
  var sF0 = slider(asm, 'Peak force F₀', 200, 6000, 10, S.F0,
    function (v) { return fmt(v, 0) + ' N'; },
    function (v) { S.F0 = v; runSim(); cache = null; readOut(); draw(); });
  var sRK = slider(asm, 'Knee moment arm', -60, 60, 1, S.rK * 1000,
    function (v) { return num(v, 0) + ' mm'; },
    function (v) { S.rK = v / 1000; runSim(); cache = null; readOut(); draw(); });
  var sRH = slider(asm, 'Hip moment arm', -80, 80, 1, S.rH * 1000,
    function (v) { return num(v, 0) + ' mm'; },
    function (v) { S.rH = v / 1000; runSim(); cache = null; readOut(); draw(); });
  u.ctl.appendChild(asm);

  var row = ctlRow(u.ctl);
  var asmBtn = el('button', 'icalc-chip', 'Model assumptions');
  asmBtn.type = 'button';
  asmBtn.setAttribute('data-unsafe', '1');     /* fit.js must not press this */
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
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing) setPlay(false); });

  u.cv.setAttribute('data-prevent-swipe', '');
  u.cv.style.touchAction = 'none';
  var down = false;
  function scrub(e) {
    var r = u.cv.getBoundingClientRect();
    var fx = (e.clientX - r.left) / r.width * ax.W;
    var fw = port ? 0 : ax.W * 0.17;
    if (!port && fx < fw) return;
    var m = MAP.tq; if (!m) return;
    var span = (m.X(100) - m.X(0));
    phase = Math.max(0, Math.min(99.99, (fx - m.X(0)) / span * 100));
    if (phase < 0 || phase > 100) return;
    setPlay(false); paint();
  }
  u.cv.addEventListener('pointerdown', function (e) { down = true; scrub(e); e.preventDefault(); });
  u.cv.addEventListener('pointermove', function (e) { if (down) { scrub(e); e.preventDefault(); } });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    u.cv.addEventListener(ev, function () { down = false; });
  });

  function tick(ts) {
    if (!playing) return;
    if (last) phase = (phase + (ts - last) / 1000 / (60 / MEAS.cadence_rpm) * 100) % 100;
    last = ts; paint(); requestAnimationFrame(tick);
  }

  runSim(); readOut(); draw();
  [80, 260, 620, 1200].forEach(function (ms) { setTimeout(draw, ms); });
  window.addEventListener('resize', function () { ax = null; cache = null; setTimeout(draw, 60); });
  window.addEventListener('ephe341-theme', function () { cache = null; draw(); });
  window.addEventListener('ephe341-layout', function () { setTimeout(draw, 160); });
});
D.boot();
})();
