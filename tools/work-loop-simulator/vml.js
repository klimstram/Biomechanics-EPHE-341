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
D.boot();
})();
