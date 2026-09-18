/* ============================================================
   EPHE 341 — Signals
   Interactive figures. Needs deck-core.js. No other dependencies.

   Everything here is computed, not drawn from stored data: the sine waves,
   the sampling, the DFT, the filters and the noise are all generated in the
   browser so the sliders change the actual numbers rather than swapping
   pre-rendered pictures.
   ============================================================ */
(function () {
'use strict';

var D = window.DECK;
var Axes = D.Axes, el = D.el, slider = D.slider, playBtn = D.playBtn,
    readout = D.readout, build = D.build, axisTicks = D.axisTicks;
function C() { return D.colors(); }

/* ---------------- shared UI ---------------- */

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
  host.appendChild(row);
  return { light: function (k) {
    btns.forEach(function (b, i) { b.classList.toggle('on', items[i][0] === k); }); } };
}

function ctlRow(host) { var r = el('div', 'ictl-row'); host.appendChild(r); return r; }
function fmt(v, n) { n = n == null ? 1 : n; return v.toFixed(n); }
function label(c, s, x, y, o) {
  o = o || {};
  c.save();
  c.font = (o.weight || '700') + ' ' + (o.size || 13) + 'px ui-sans-serif,system-ui,sans-serif';
  c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'middle';
  if (o.plate) {
    var w = c.measureText(s).width, p = 4;
    var ox = o.align === 'right' ? -w - p : (o.align === 'center' ? -w / 2 - p : -p);
    c.fillStyle = C().PLATE; c.globalAlpha = 0.85;
    c.fillRect(x + ox, y - (o.size || 13) * 0.75, w + p * 2, (o.size || 13) * 1.5);
    c.globalAlpha = 1;
  }
  c.fillStyle = o.color || C().INK;
  c.fillText(s, x, y); c.restore();
}

/* ---------------- signal maths ---------------- */

/* A deterministic pseudo-random sequence: the figure has to look the same
   every time it is drawn, or dragging a slider makes the noise crawl and it
   becomes impossible to see what the slider actually did. */
function rng(seed) {
  var s = seed || 12345;
  return function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s / 0x7fffffff) * 2 - 1;
  };
}
function noiseArray(n, seed) {
  var r = rng(seed), out = [], i;
  for (i = 0; i < n; i++) out.push(r());
  return out;
}

/* Discrete Fourier transform, O(n²) — n is at most a few hundred here and it
   runs in well under a millisecond, so there is no reason for anything
   cleverer. Returns the single-sided amplitude spectrum. */
function dft(x, fs) {
  var N = x.length, half = Math.floor(N / 2), out = [], k, n2, re, im, a;
  for (k = 0; k <= half; k++) {
    re = 0; im = 0;
    for (n2 = 0; n2 < N; n2++) {
      a = 2 * Math.PI * k * n2 / N;
      re += x[n2] * Math.cos(a);
      im -= x[n2] * Math.sin(a);
    }
    out.push({ f: k * fs / N, a: 2 * Math.hypot(re, im) / N });
  }
  if (out.length) out[0].a /= 2;
  return out;
}

/* A second-order Butterworth run forwards and then backwards, which is what
   biomechanics actually uses: filtering twice cancels the phase lag that
   slide 21 lists as the problem with filtering. */
function butter(x, fc, fs, type) {
  if (fc <= 0 || fc >= fs / 2) return x.slice();
  var wc = Math.tan(Math.PI * fc / fs), k1 = Math.SQRT2 * wc, k2 = wc * wc;
  var a0 = k2 / (1 + k1 + k2), a1 = 2 * a0, a2 = a0;
  var b1 = 2 * a0 * (1 / k2 - 1), b2 = 1 - (a0 + a1 + a2 + b1);
  if (type === 'high') {
    /* the high-pass of the same corner is just what the low-pass throws away */
    var lo = butter(x, fc, fs, 'low');
    return x.map(function (v, i) { return v - lo[i]; });
  }
  function pass(v) {
    var y = [], i;
    for (i = 0; i < v.length; i++) {
      var xm1 = i > 0 ? v[i - 1] : v[0], xm2 = i > 1 ? v[i - 2] : v[0];
      var ym1 = i > 0 ? y[i - 1] : v[0], ym2 = i > 1 ? y[i - 2] : v[0];
      y.push(a0 * v[i] + a1 * xm1 + a2 * xm2 + b1 * ym1 + b2 * ym2);
    }
    return y;
  }
  var f1 = pass(x), rev = f1.slice().reverse(), f2 = pass(rev);
  return f2.reverse();
}

function movingAverage(x, win) {
  var n = x.length, half = Math.floor(win / 2), out = [], i, j, s, c2;
  for (i = 0; i < n; i++) {
    s = 0; c2 = 0;
    for (j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) { s += x[j]; c2++; }
    out.push(s / c2);
  }
  return out;
}

/* least-squares polynomial fit by normal equations + Gaussian elimination */
function polyFit(xs, ys, order) {
  var m = order + 1, A = [], b = [], i, j, k;
  for (i = 0; i < m; i++) {
    A.push(new Array(m).fill(0)); b.push(0);
    for (j = 0; j < m; j++) for (k = 0; k < xs.length; k++) A[i][j] += Math.pow(xs[k], i + j);
    for (k = 0; k < xs.length; k++) b[i] += ys[k] * Math.pow(xs[k], i);
  }
  for (i = 0; i < m; i++) {
    var p = i;
    for (j = i + 1; j < m; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j;
    var t = A[i]; A[i] = A[p]; A[p] = t; var tb = b[i]; b[i] = b[p]; b[p] = tb;
    if (Math.abs(A[i][i]) < 1e-12) continue;
    for (j = i + 1; j < m; j++) {
      var f = A[j][i] / A[i][i];
      for (k = i; k < m; k++) A[j][k] -= f * A[i][k];
      b[j] -= f * b[i];
    }
  }
  var c = new Array(m).fill(0);
  for (i = m - 1; i >= 0; i--) {
    var s = b[i];
    for (j = i + 1; j < m; j++) s -= A[i][j] * c[j];
    c[i] = Math.abs(A[i][i]) < 1e-12 ? 0 : s / A[i][i];
  }
  return function (x) {
    var v = 0;
    for (var q = c.length - 1; q >= 0; q--) v = v * x + c[q];
    return v;
  };
}

function rms(v) {
  var s = 0, i;
  for (i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s / v.length);
}


/* ============================================================
   1. NYQUIST — how fast is fast enough?
   The lecture builds this over seven slides: the same 10 Hz analog signal
   sampled at 4, 5, 7, 10, 15 and 20 Hz. Here it is one slider, plus the
   thing the static slides cannot show — the OTHER sine wave that fits the
   same samples just as well when you sample too slowly. That impostor is
   what aliasing is.
   ============================================================ */
D.register('nyquist', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 900, h: port ? 380 : 380,
                            padl: 56, padr: 20, padt: 24, padb: 50 });
  var out = readout(u.ctl);
  var F = parseFloat(d.freq || 10);       /* the analog signal, in Hz */
  var fs = parseFloat(d.rate || 4);
  var joinDots = d.join !== '0';
  var showAlias = d.alias !== '0';
  var TMAX = 1;

  function sig(t) { return Math.sin(2 * Math.PI * F * t); }

  /* The frequency a too-slow sampler reports instead of the real one. */
  function aliasFreq() {
    var f = Math.abs(F - fs * Math.round(F / fs));
    return f;
  }

  function draw() {
    var c = ax.c, K = C(), i, t;
    ax.clear();
    ax.setRange(0, TMAX, -1.35, 1.35);
    ax.frame({ grid: true, xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], yticks: [-1, 0, 1],
               xlabel: 'Time (s)', ylabel: 'amplitude',
               xfmt: function (v) { return v.toFixed(1); },
               yfmt: function (v) { return v.toFixed(0); } });

    /* the analog signal */
    var an = [];
    for (t = 0; t <= TMAX + 1e-9; t += 1 / 2000) an.push([t, sig(t)]);
    ax.poly(an, { color: K.SOFT, width: 1.8 });
    label(c, F + ' Hz analog', ax.X(0.012), ax.Y(1.22),
          { color: K.MUT, size: 13, weight: '700' });

    /* the samples themselves. They start a little way in rather than at t = 0:
       at some rates every sample would otherwise land exactly on a zero
       crossing, which is a true but useless picture. */
    var pts = [], n = Math.max(2, Math.round(fs * TMAX)), PH = 0.017;
    for (i = 0; i <= n; i++) { t = i / fs + PH; if (t > TMAX + 1e-9) break; pts.push([t, sig(t)]); }

    /* What the alias looks like: the slower sine that passes through those
       same samples. Its frequency is fixed by the sampling; its phase and
       height are fitted to the samples by least squares, so the line really
       does go through the dots rather than merely near them. */
    var fa = aliasFreq();
    if (showAlias && fs < 2 * F && fa > 0.01) {
      var A = 0, B = 0;
      pts.forEach(function (q) {
        A += q[1] * Math.sin(2 * Math.PI * fa * q[0]);
        B += q[1] * Math.cos(2 * Math.PI * fa * q[0]);
      });
      var mag = Math.min(1, 2 * Math.hypot(A, B) / Math.max(1, pts.length));
      var psi = Math.atan2(B, A);
      var al = [];
      for (t = 0; t <= TMAX + 1e-9; t += 1 / 2000) {
        al.push([t, mag * Math.sin(2 * Math.PI * fa * t + psi)]);
      }
      ax.poly(al, { color: K.ORG, width: 2.2, dash: [7, 5] });
      label(c, 'what the samples look like: ' + fmt(fa, 1) + ' Hz',
            ax.X(TMAX - 0.012), ax.Y(-1.2),
            { color: K.ORG, size: 13, align: 'right', weight: '700', plate: true });
    }
    if (joinDots) ax.poly(pts, { color: K.BLUE, width: 2.4 });
    ax.dots(pts, { color: K.ACC, r: 4.6 });

    var ratio = fs / F;
    var verdict = fs < 2 * F
      ? 'below the Nyquist frequency — <b class="r">aliased</b>'
      : (ratio < 5 ? 'above Nyquist — the shape is right but sharp turns are rounded off'
                   : '<b class="g">5–10×</b> the signal frequency — direction changes are caught');
    out.innerHTML =
      'sampling at <b>' + fmt(fs, 0) + ' Hz</b> &nbsp;·&nbsp; ' + pts.length +
      ' samples in a second &nbsp;·&nbsp; ' + fmt(ratio, 1) + '× the signal frequency' +
      '<span class="hint">' + verdict +
      (fs < 2 * F ? '. The dashed line is a <b>different</b> sine wave that fits every sample ' +
                    'exactly as well. Nothing in the data can tell them apart.'
                  : '. The Nyquist frequency here is ' + (2 * F) + ' Hz.') +
      '</span>';
  }

  var s = slider(u.ctl, 'Sampling frequency', 2, 100, 1, fs,
    function (v) { return fmt(v, 0) + ' Hz'; }, function (v) { fs = v; draw(); },
    { scale: 5, tick: function (v) { return fmt(v, 0); } });
  var ch = chips(u.ctl, [[4, '4 Hz'], [5, '5 Hz'], [7, '7 Hz'], [10, '10 Hz'],
                         [15, '15 Hz'], [20, '20 Hz'], [100, '100 Hz']], fs,
    function (v) { fs = +v; s.quiet(fs); draw(); });
  var r = ctlRow(u.ctl);
  var jb = el('button', 'ibtn' + (joinDots ? ' on' : ''), 'Join the samples');
  jb.addEventListener('click', function () {
    joinDots = !joinDots; jb.classList.toggle('on', joinDots); draw();
  });
  r.appendChild(jb);
  node._draw = draw;
  draw();
});


/* ============================================================
   2. THE FOUR COMPONENTS OF A SIGNAL
   Frequency, amplitude, offset and phase shift — one slider each, and the
   one being moved is named on the picture.
   ============================================================ */
D.register('components', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 860, h: port ? 360 : 360,
                            padl: 56, padr: 20, padt: 22, padb: 50 });
  var out = readout(u.ctl);
  var f = 2, a = 1, off = 0, ph = 0, last = 'f';

  function y(t) { return off + a * Math.sin(2 * Math.PI * f * t + ph * Math.PI / 180); }

  function draw() {
    var c = ax.c, K = C(), t;
    ax.clear();
    ax.setRange(0, 2, -3, 3);
    ax.frame({ grid: true, xticks: [0, 0.5, 1, 1.5, 2], yticks: [-3, -2, -1, 0, 1, 2, 3],
               xlabel: 'Time (s)', ylabel: 'amplitude',
               xfmt: function (v) { return v.toFixed(1); },
               yfmt: function (v) { return v.toFixed(0); } });

    /* the reference wave, so every change is visibly a change FROM something */
    var ref = [];
    for (t = 0; t <= 2 + 1e-9; t += 0.002) ref.push([t, Math.sin(2 * Math.PI * 2 * t)]);
    ax.poly(ref, { color: K.SOFT, width: 1.4, dash: [5, 4] });

    var cur = [];
    for (t = 0; t <= 2 + 1e-9; t += 0.002) cur.push([t, y(t)]);
    ax.poly(cur, { color: K.BLUE, width: 2.8 });

    /* the offset line */
    if (Math.abs(off) > 0.01) {
      ax.poly([[0, off], [2, off]], { color: K.GRN, width: 1.6, dash: [4, 3] });
      label(c, 'offset ' + fmt(off, 1), ax.X(1.96), ax.Y(off) - 12,
            { color: K.GRN, size: 13, align: 'right', plate: true });
    }

    /* one period, marked out */
    var T = 1 / f, x0 = 0.02;
    c.save();
    c.strokeStyle = K.ACC; c.lineWidth = 1.4; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(ax.X(x0), ax.Y(2.55)); c.lineTo(ax.X(x0 + T), ax.Y(2.55)); c.stroke();
    [x0, x0 + T].forEach(function (q) {
      c.beginPath(); c.moveTo(ax.X(q), ax.Y(2.4)); c.lineTo(ax.X(q), ax.Y(2.7)); c.stroke();
    });
    c.restore();
    label(c, 'one cycle = ' + fmt(T, 2) + ' s → ' + fmt(f, 1) + ' Hz',
          ax.X(x0 + T / 2), ax.Y(2.55) - 15,
          { color: K.ACC, size: 13, align: 'center', plate: true });

    /* the amplitude, as a height */
    c.save();
    c.strokeStyle = K.VIO; c.lineWidth = 1.4; c.setLineDash([3, 3]);
    var xa = 2 - 0.16;
    c.beginPath(); c.moveTo(ax.X(xa), ax.Y(off)); c.lineTo(ax.X(xa), ax.Y(off + a)); c.stroke();
    c.restore();
    label(c, 'a = ' + fmt(a, 1), ax.X(xa) - 8, ax.Y(off + a / 2),
          { color: K.VIO, size: 13, align: 'right', plate: true });

    out.innerHTML =
      'y(t) = <b>' + fmt(off, 1) + '</b> + <b class="v">' + fmt(a, 1) +
      '</b> · sin(2π · <b>' + fmt(f, 1) + '</b> · t + <b>' + fmt(ph, 0) +
      '°</b>)' +
      '<span class="hint">The dashed grey wave is the starting signal. ' +
      'Frequency stretches it along time, amplitude stretches it up and down, offset lifts the ' +
      'whole thing off zero, and the phase shift slides it sideways without changing its shape.' +
      '</span>';
  }

  u.ctl.classList.add('g2');
  slider(u.ctl, 'Frequency', 0.5, 8, 0.1, f, function (v) { return fmt(v, 1) + ' Hz'; },
    function (v) { f = v; last = 'f'; draw(); }, { scale: 4, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'Amplitude', 0, 2.5, 0.1, a, function (v) { return fmt(v, 1); },
    function (v) { a = v; last = 'a'; draw(); }, { scale: 4, tick: function (v) { return fmt(v, 1); } });
  slider(u.ctl, 'Offset', -2, 2, 0.1, off, function (v) { return fmt(v, 1); },
    function (v) { off = v; last = 'o'; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'Phase shift', -180, 180, 5, ph, function (v) { return fmt(v, 0) + '°'; },
    function (v) { ph = v; last = 'p'; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  node._draw = draw;
  draw();
});


/* ============================================================
   3. SMOOTHING — the moving average
   The lecture's own example: EMG at 1010 Hz with a 51-point moving average.
   Here the window is the slider, and the cost of a wide window is visible
   as well as the benefit.
   ============================================================ */
var EMG = (function () {
  /* a burst pattern with interference-EMG-like content on top */
  var n = 900, r = rng(4242), out = [], i, t, env;
  for (i = 0; i < n; i++) {
    t = i / n * 3;
    env = 0.12 +
      0.95 * Math.exp(-Math.pow((t - 0.55) / 0.18, 2)) +
      0.70 * Math.exp(-Math.pow((t - 1.55) / 0.22, 2)) +
      0.85 * Math.exp(-Math.pow((t - 2.45) / 0.16, 2));
    out.push(env * r());
  }
  return out;
})();

D.register('smooth', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 900, h: port ? 400 : 400,
                            padl: 60, padr: 20, padt: 20, padb: 46 });
  var out = readout(u.ctl);
  var win = 51, rect = true;
  var P = [{ pt: 16, pb: 226 }, { pt: 196, pb: 46 }];
  var N = EMG.length, DUR = 3;

  function draw() {
    var c = ax.c, K = C(), i;
    ax.clear();
    var raw = rect ? EMG.map(Math.abs) : EMG;
    var av = movingAverage(raw, win);

    /* top: the signal as recorded */
    ax.pt = P[0].pt; ax.pb = P[0].pb;
    ax.setRange(0, DUR, rect ? 0 : -1.2, 1.2);
    ax.frame({ grid: true, xticks: [0, 0.5, 1, 1.5, 2, 2.5, 3],
               yticks: rect ? [0, 0.5, 1] : [-1, 0, 1],
               ylabel: rect ? 'rectified EMG' : 'raw EMG', ysize: 12.5,
               xfmt: function (v) { return v.toFixed(1); },
               yfmt: function (v) { return v.toFixed(1); } });
    var pr = [];
    for (i = 0; i < N; i++) pr.push([i / N * DUR, raw[i]]);
    ax.poly(pr, { color: K.SOFT, width: 0.9 });

    /* bottom: the same thing with the window run over it */
    ax.pt = P[1].pt; ax.pb = P[1].pb;
    ax.setRange(0, DUR, 0, 0.62);
    ax.frame({ grid: true, xticks: [0, 0.5, 1, 1.5, 2, 2.5, 3], yticks: [0, 0.2, 0.4, 0.6],
               xlabel: 'Time (s)', ylabel: 'moving average', ysize: 12.5,
               xfmt: function (v) { return v.toFixed(1); },
               yfmt: function (v) { return v.toFixed(1); } });
    var pa = [];
    for (i = 0; i < N; i++) pa.push([i / N * DUR, av[i]]);
    ax.poly(pa, { color: K.ACC, width: 2.6 });

    /* the window itself, drawn to scale so its width means something */
    var wsec = win / N * DUR, cx = 1.05;
    ax.rect(cx - wsec / 2, 0, cx + wsec / 2, 0.62, { fill: K.FILL, stroke: K.BLUE, dash: [4, 3] });
    label(c, win + ' samples = ' + fmt(wsec * 1000, 0) + ' ms', ax.X(cx), ax.Y(0.56),
          { color: K.BLUE, size: 12, align: 'center', plate: true });

    ax.pt = P[0].pt; ax.pb = P[0].pb;
    out.innerHTML =
      'window of <b>' + win + '</b> samples &nbsp;·&nbsp; ' +
      fmt(win / N * DUR * 1000, 0) + ' ms at this sample rate' +
      '<span class="hint">A wider window is a smoother line — and a later, lower, blunter ' +
      'one. Watch the height of the bursts fall and their edges soften as the window grows past ' +
      'the length of the burst itself. Simple averaging gets rid of noisy spikes, but it cannot ' +
      'tell a spike from a fast real change.</span>';
  }

  slider(u.ctl, 'Window', 3, 301, 2, win, function (v) { return fmt(v, 0) + ' pts'; },
    function (v) { win = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  var r = ctlRow(u.ctl);
  var rb = el('button', 'ibtn' + (rect ? ' on' : ''), 'Full-wave rectified');
  rb.addEventListener('click', function () {
    rect = !rect; rb.classList.toggle('on', rect); draw();
  });
  r.appendChild(rb);
  node._draw = draw;
  draw();
});


/* ============================================================
   4. CURVE FITTING
   A function put through the data rather than a version of the data. The
   order of the polynomial is the whole argument: too low and it cannot
   follow the signal, too high and it starts following the noise.
   ============================================================ */
var FITDATA = (function () {
  var r = rng(777), xs = [], ys = [], i, x;
  for (i = 0; i < 40; i++) {
    x = i / 39 * 12;
    xs.push(x);
    ys.push(Math.sin(2 * Math.PI * 0.12 * x) + 0.35 * Math.sin(2 * Math.PI * 0.4 * x) + 0.45 * r());
  }
  return { xs: xs, ys: ys };
})();

D.register('fit', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 860, h: port ? 360 : 380,
                            padl: 58, padr: 20, padt: 20, padb: 48 });
  var out = readout(u.ctl);
  var order = 3, mode = 'poly';

  function draw() {
    var c = ax.c, K = C(), i, x;
    ax.clear();
    ax.setRange(-0.3, 12.3, -2.2, 2.2);
    ax.frame({ grid: true, xticks: [0, 2, 4, 6, 8, 10, 12], yticks: [-2, -1, 0, 1, 2],
               xlabel: 'Time (s)', ylabel: 'amplitude',
               yfmt: function (v) { return v.toFixed(0); } });

    var pts = FITDATA.xs.map(function (v, i2) { return [v, FITDATA.ys[i2]]; });
    ax.poly(pts, { color: K.SOFT, width: 1.2 });
    ax.dots(pts, { color: K.MUT, r: 3 });

    var f, name;
    if (mode === 'linear') {
      f = polyFit(FITDATA.xs, FITDATA.ys, 1); name = 'straight line';
    } else if (mode === 'spline') {
      /* a natural-looking spline through every point: piecewise cubic
         Catmull-Rom, which is the "follows every point" end of the choice */
      name = 'spline through every point';
      f = null;
      var sp = [];
      for (i = 0; i < FITDATA.xs.length - 1; i++) {
        var p0 = i > 0 ? FITDATA.ys[i - 1] : FITDATA.ys[i];
        var p1 = FITDATA.ys[i], p2 = FITDATA.ys[i + 1];
        var p3 = i + 2 < FITDATA.ys.length ? FITDATA.ys[i + 2] : p2;
        for (var q = 0; q < 12; q++) {
          var t2 = q / 12, t3 = t2 * t2, t4 = t3 * t2;
          var yv = 0.5 * ((2 * p1) + (-p0 + p2) * t2 +
                          (2 * p0 - 5 * p1 + 4 * p2 - p3) * t3 +
                          (-p0 + 3 * p1 - 3 * p2 + p3) * t4);
          sp.push([FITDATA.xs[i] + (FITDATA.xs[i + 1] - FITDATA.xs[i]) * t2, yv]);
        }
      }
      ax.poly(sp, { color: K.ACC, width: 2.6 });
    } else {
      f = polyFit(FITDATA.xs, FITDATA.ys, order);
      name = 'polynomial of degree ' + order;
    }
    if (f) {
      var line = [];
      for (x = 0; x <= 12; x += 0.05) line.push([x, f(x)]);
      ax.poly(line, { color: K.ACC, width: 2.8 });
    }

    var resid = FITDATA.xs.map(function (xv, i2) {
      return FITDATA.ys[i2] - (f ? f(xv) : FITDATA.ys[i2]);
    });
    out.innerHTML =
      name + (f ? ' &nbsp;·&nbsp; residual RMS <b>' + fmt(rms(resid), 3) + '</b>' : '') +
      '<span class="hint">' +
      (mode === 'spline'
        ? 'A spline is made to pass through every point — which means it passes through ' +
          'every piece of noise too. Useful when the points are trusted, dangerous when they are not.'
        : mode === 'linear'
          ? 'A straight line is the strongest possible assumption about the data: two numbers ' +
            'describe the whole record.'
          : 'Raise the order and the residual always falls — that is arithmetic, not insight. ' +
            'Somewhere past a handful of terms the curve stops describing the signal and starts ' +
            'describing this particular sample of noise.') +
      '</span>';
  }

  seg(ctlRow(u.ctl), [['linear', 'linear'], ['poly', 'polynomial'], ['spline', 'spline']], mode,
      function (v) { mode = v; draw(); });
  slider(u.ctl, 'Polynomial order', 1, 15, 1, order, function (v) { return fmt(v, 0); },
    function (v) { order = v; mode = 'poly'; draw(); },
    { scale: 5, tick: function (v) { return fmt(v, 0); } });
  node._draw = draw;
  draw();
});


/* ============================================================
   5. TIME DOMAIN ↔ FREQUENCY DOMAIN
   Build a signal out of sine waves and watch the spectrum name the ones you
   used. The lecture's own three examples are the chips: 1 Hz, 5 Hz, and
   2 Hz + 30 Hz.
   ============================================================ */
D.register('fourier', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 960, h: port ? 420 : 400,
                            padl: 56, padr: 20, padt: 20, padb: 50 });
  var out = readout(u.ctl);
  var FS = 256, DUR = 1;
  /* [frequency, amplitude] — the components the user can dial in */
  var comps = [{ f: 2, a: 1 }, { f: 30, a: 0.4 }, { f: 0, a: 0 }];
  var noise = 0;

  function build2() {
    var x = [], t, i, v, nz = noiseArray(FS, 99);
    for (i = 0; i < FS; i++) {
      t = i / FS * DUR;
      v = 0;
      comps.forEach(function (c2) { if (c2.f > 0) v += c2.a * Math.sin(2 * Math.PI * c2.f * t); });
      v += noise * nz[i];
      x.push(v);
    }
    return x;
  }

  function draw() {
    var c = ax.c, K = C(), i;
    ax.clear();
    var x = build2(), sp = dft(x, FS);
    var amax = Math.max(1.2, Math.max.apply(null, x.map(Math.abs)) * 1.15);

    /* left: the time domain */
    var split = port ? null : 470;
    if (port) {
      ax.pl = 56; ax.pr = 20; ax.pt = 18; ax.pb = 230;
    } else {
      ax.pl = 56; ax.pr = ax.W - 440; ax.pt = 20; ax.pb = 50;
    }
    ax.setRange(0, DUR, -amax, amax);
    ax.frame({ grid: true, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: axisTicks(-amax, amax, 4),
               xlabel: 'Time (s)', ylabel: 'amplitude',
               xfmt: function (v) { return v.toFixed(2); },
               yfmt: function (v) { return v.toFixed(1); } });
    var pts = [];
    for (i = 0; i < FS; i++) pts.push([i / FS * DUR, x[i]]);
    ax.poly(pts, { color: K.BLUE, width: 2 });
    label(c, 'Time Domain', ax.X(DUR / 2), ax.pt + 10,
          { color: K.MUT, size: 13, align: 'center' });

    /* right: the frequency domain */
    if (port) {
      ax.pl = 56; ax.pr = 20; ax.pt = 232; ax.pb = 46;
    } else {
      ax.pl = ax.W - 380; ax.pr = 24; ax.pt = 20; ax.pb = 50;
    }
    var fmax = 48;
    var pmax = Math.max(0.3, Math.max.apply(null, sp.filter(function (s2) { return s2.f <= fmax; })
                                                  .map(function (s2) { return s2.a; })) * 1.2);
    ax.setRange(0, fmax, 0, pmax);
    ax.frame({ grid: true, xticks: [0, 10, 20, 30, 40], yticks: axisTicks(0, pmax, 4),
               xlabel: 'Frequency (Hz)', ylabel: 'amplitude',
               ylabelx: port ? 13 : ax.pl - 46,
               yfmt: function (v) { return v.toFixed(1); } });
    sp.forEach(function (s2) {
      if (s2.f > fmax || s2.a < 1e-4) return;
      ax.poly([[s2.f, 0], [s2.f, s2.a]], { color: K.ACC, width: 2.6 });
    });
    label(c, 'Frequency Domain', ax.X(fmax / 2), ax.pt + 10,
          { color: K.MUT, size: 13, align: 'center' });

    var named = comps.filter(function (c2) { return c2.f > 0 && c2.a > 0.01; })
                     .map(function (c2) { return fmt(c2.f, 0) + ' Hz'; });
    out.innerHTML =
      (named.length ? named.join(' + ') : 'nothing') +
      (noise > 0.01 ? ' + noise' : '') +
      '<span class="hint">The same signal, said twice. On the left, amplitude against time — ' +
      'what the sensor recorded. On the right, amplitude against frequency — which sine waves ' +
      'it is made of. A Fourier transform is the arithmetic that turns the first into the second.' +
      (noise > 0.01 ? ' Noise has no single frequency, so it spreads across the whole spectrum ' +
                      'rather than making a spike.' : '') +
      '</span>';
  }

  u.ctl.classList.add('g2');
  chips(u.ctl, [['a', '1 Hz'], ['b', '5 Hz'], ['c', '2 Hz + 30 Hz'], ['d', '25 + 50 Hz']], 'c',
    function (v) {
      if (v === 'a') comps = [{ f: 1, a: 1 }, { f: 0, a: 0 }, { f: 0, a: 0 }];
      else if (v === 'b') comps = [{ f: 5, a: 1 }, { f: 0, a: 0 }, { f: 0, a: 0 }];
      else if (v === 'c') comps = [{ f: 2, a: 1 }, { f: 30, a: 0.4 }, { f: 0, a: 0 }];
      else comps = [{ f: 25, a: 1 }, { f: 50, a: 1 }, { f: 0, a: 0 }];
      sync(); draw();
    });
  var sl = [];
  ['first', 'second'].forEach(function (nm, i) {
    sl.push(slider(u.ctl, nm + ' component', 0, 45, 1, comps[i].f,
      function (v) { return v > 0 ? fmt(v, 0) + ' Hz' : 'off'; },
      function (v) { comps[i].f = v; if (v > 0 && comps[i].a === 0) comps[i].a = 0.6; draw(); },
      { scale: 4, tick: function (v) { return fmt(v, 0); } }));
  });
  sl.push(slider(u.ctl, 'Random noise', 0, 1.2, 0.05, noise,
    function (v) { return fmt(v, 2); }, function (v) { noise = v; draw(); },
    { scale: 4, tick: function (v) { return fmt(v, 1); } }));
  function sync() { sl[0].quiet(comps[0].f); sl[1].quiet(comps[1].f); }
  node._draw = draw;
  draw();
});


/* ============================================================
   6. DIGITAL FILTERING
   The lecture's example: 2 Hz + 30 Hz. A low-pass keeps the 2, a high-pass
   keeps the 30, and the spectrum underneath shows exactly what was removed
   rather than asking anyone to take it on trust.
   ============================================================ */
D.register('filter', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 960, h: port ? 440 : 430,
                            padl: 58, padr: 22, padt: 20, padb: 50 });
  var out = readout(u.ctl);
  var FS = 256, DUR = 1;
  var kind = d.kind || 'low', fc = parseFloat(d.cut || 10);
  var preset = d.preset || 'mix';

  function raw() {
    var x = [], t, i, nz = noiseArray(FS, 2024);
    for (i = 0; i < FS; i++) {
      t = i / FS * DUR;
      if (preset === 'buried') {
        x.push(Math.sin(2 * Math.PI * 25 * t) + Math.sin(2 * Math.PI * 50 * t) + 10 * nz[i]);
      } else {
        x.push(Math.sin(2 * Math.PI * 2 * t) + 0.4 * Math.sin(2 * Math.PI * 30 * t));
      }
    }
    return x;
  }
  function apply(x) {
    if (kind === 'none') return x.slice();
    if (kind === 'low') return butter(x, fc, FS, 'low');
    if (kind === 'high') return butter(x, fc, FS, 'high');
    if (kind === 'band') return butter(butter(x, fc * 1.6, FS, 'low'), fc * 0.55, FS, 'high');
    return x.map(function (v, i) {           /* band-stop / notch */
      var b = butter(butter(x, fc * 1.25, FS, 'low'), fc * 0.8, FS, 'high');
      return v - b[i];
    });
  }

  function draw() {
    var c = ax.c, K = C(), i;
    ax.clear();
    var x = raw(), y = apply(x);
    var sx = dft(x, FS), sy = dft(y, FS);
    var amax = Math.max.apply(null, x.map(Math.abs)) * 1.15;

    /* --- top: the two traces, before and after --- */
    ax.pl = 58; ax.pr = 22; ax.pt = 18; ax.pb = port ? 248 : 226;
    ax.setRange(0, DUR, -amax, amax);
    ax.frame({ grid: true, xticks: [0, 0.25, 0.5, 0.75, 1],
               yticks: axisTicks(-amax, amax, 4), ylabel: 'amplitude', ysize: 12.5,
               xfmt: function (v) { return v.toFixed(2); },
               yfmt: function (v) { return v.toFixed(0); } });
    var px = [], py = [];
    for (i = 0; i < FS; i++) { px.push([i / FS, x[i]]); py.push([i / FS, y[i]]); }
    ax.poly(px, { color: K.SOFT, width: 1.3 });
    if (kind !== 'none') ax.poly(py, { color: K.ACC, width: 2.4 });
    label(c, 'recorded', ax.X(0.012), ax.Y(amax * 0.86), { color: K.MUT, size: 12, weight: '700' });
    if (kind !== 'none') {
      label(c, 'filtered', ax.X(0.012), ax.Y(amax * 0.64),
            { color: K.ACC, size: 12, weight: '700' });
    }

    /* --- bottom: what the filter did to the spectrum --- */
    ax.pt = port ? 216 : 236; ax.pb = 48;
    var fmax = 70;
    var pmax = Math.max.apply(null, sx.filter(function (s2) { return s2.f <= fmax; })
                                     .map(function (s2) { return s2.a; })) * 1.2;
    ax.setRange(0, fmax, 0, Math.max(0.2, pmax));
    ax.frame({ grid: true, xticks: [0, 10, 20, 30, 40, 50, 60, 70],
               yticks: axisTicks(0, Math.max(0.2, pmax), 3),
               xlabel: 'Frequency (Hz)', ylabel: 'amplitude', ysize: 12.5,
               yfmt: function (v) { return v.toFixed(1); } });
    sx.forEach(function (s2, k) {
      if (s2.f > fmax || s2.a < 1e-4) return;
      ax.poly([[s2.f, 0], [s2.f, s2.a]], { color: K.SOFT, width: 2 });
      if (kind !== 'none' && sy[k].a > 1e-4) {
        ax.poly([[s2.f, 0], [s2.f, sy[k].a]], { color: K.ACC, width: 2 });
      }
    });
    if (kind !== 'none') {
      ax.poly([[fc, 0], [fc, Math.max(0.2, pmax)]], { color: K.BLUE, width: 1.8, dash: [5, 4] });
      label(c, 'cut-off ' + fmt(fc, 0) + ' Hz', ax.X(fc) + 8, ax.pt + 14,
            { color: K.BLUE, size: 12, plate: true });
    }
    ax.pt = 18; ax.pb = port ? 248 : 226;

    var kept = rms(y) / rms(x);
    out.innerHTML =
      ({ none: 'no filter', low: 'low-pass', high: 'high-pass',
         band: 'band-pass', stop: 'band-stop' }[kind]) +
      (kind === 'none' ? '' : ' at <b>' + fmt(fc, 0) + ' Hz</b>') +
      ' &nbsp;·&nbsp; <b>' + fmt(kept * 100, 0) + '%</b> of the original amplitude survives' +
      '<span class="hint">The grey spikes are what was recorded, the red ones what is left. ' +
      'A filter does not make a signal cleaner — it decides which frequencies to keep, and ' +
      'everything at those frequencies, signal or noise, is kept with them. ' +
      'This one is run forwards and then backwards, which removes the phase lag that a single ' +
      'pass would leave behind.</span>';
  }

  seg(ctlRow(u.ctl), [['none', 'unfiltered'], ['low', 'low-pass'], ['high', 'high-pass'],
                      ['band', 'band-pass'], ['stop', 'band-stop']], kind,
      function (v) { kind = v; draw(); });
  slider(u.ctl, 'Cut-off', 1, 60, 1, fc, function (v) { return fmt(v, 0) + ' Hz'; },
    function (v) { fc = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  node._draw = draw;
  draw();
});


/* ============================================================
   7. NOISE AMPLIFIED BY DIFFERENTIATION
   The figure from slide 25, live: a 1 Hz sine with noise so small it cannot
   be seen, and the second derivative where it is the only thing you can see.
   ============================================================ */
D.register('deriv', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 900, h: port ? 440 : 430,
                            padl: 66, padr: 22, padt: 18, padb: 46 });
  var out = readout(u.ctl);
  var N = 3000, DUR = 2, dt = DUR / N;
  var amp = 0.0001, on = true, filt = false, fc = 6;
  var NZ = noiseArray(N, 31337);
  var STEP = 3;   /* draw every third point — 3000 line segments is wasted ink */

  function series() {
    var x = [], i, t;
    for (i = 0; i < N; i++) {
      t = i * dt;
      x.push(Math.sin(2 * Math.PI * 1 * t) + (on ? amp * NZ[i] : 0));
    }
    return filt ? butter(x, fc, N / DUR, 'low') : x;
  }
  function diff(v) {
    var o = [], i;
    for (i = 0; i < v.length; i++) {
      var a = v[Math.max(0, i - 1)], b = v[Math.min(v.length - 1, i + 1)];
      o.push((b - a) / (2 * dt));
    }
    return o;
  }

  function draw() {
    var c = ax.c, K = C(), i;
    ax.clear();
    var x = series(), v = diff(x), a = diff(v);
    var P = [{ pt: 16, pb: 296 }, { pt: 156, pb: 156 }, { pt: 296, pb: 44 }];
    var rows = [
      { y: x, lab: 'displacement', col: 'BLUE' },
      { y: v, lab: '1st derivative', col: 'ORG' },
      { y: a, lab: '2nd derivative', col: 'ACC' }
    ];
    rows.forEach(function (r, k) {
      var lim = Math.max.apply(null, r.y.map(Math.abs)) * 1.18 || 1;
      ax.pt = P[k].pt; ax.pb = P[k].pb;
      ax.setRange(0, DUR, -lim, lim);
      ax.frame({ grid: true, xticks: k === 2 ? [0, 0.5, 1, 1.5, 2] : [],
                 yticks: axisTicks(-lim, lim, 3), ylabel: r.lab, ysize: 12,
                 xlabel: k === 2 ? 'Time (s)' : null,
                 xfmt: function (q) { return q.toFixed(1); },
                 yfmt: function (q) { return Math.abs(q) >= 100 ? q.toFixed(0) : q.toFixed(1); } });
      var pts = [];
      for (i = 0; i < N; i += (k === 2 ? 1 : STEP)) pts.push([i * dt, r.y[i]]);
      ax.poly(pts, { color: K[r.col], width: k === 2 ? 1 : 2.2 });
    });
    ax.pt = P[0].pt; ax.pb = P[0].pb;

    var snr = amp > 0 && on ? (1 / amp) : Infinity;
    out.innerHTML =
      (on ? 'noise amplitude <b>' + amp.toExponential(0) + '</b> — a signal-to-noise ratio of <b>' +
            (isFinite(snr) ? fmt(snr, 0) : '∞') + ':1</b>'
          : 'no noise at all') +
      (filt ? ' &nbsp;·&nbsp; low-pass at <b>' + fmt(fc, 0) + ' Hz</b>' : '') +
      '<span class="hint">The noise is far too small to see in the top trace. Differentiating ' +
      'multiplies every frequency by its own frequency, so high-frequency noise grows and the ' +
      '1 Hz signal does not — by the second derivative it is all you can see. ' +
      'This is why kinematic data is filtered <b>before</b> it is differentiated, not after.' +
      '</span>';
  }

  var r = ctlRow(u.ctl);
  var nb = el('button', 'ibtn' + (on ? ' on' : ''), 'Noise on');
  nb.addEventListener('click', function () {
    on = !on; nb.classList.toggle('on', on); nb.textContent = on ? 'Noise on' : 'Noise off'; draw();
  });
  r.appendChild(nb);
  var fb = el('button', 'ibtn' + (filt ? ' on' : ''), 'Low-pass filter');
  fb.addEventListener('click', function () {
    filt = !filt; fb.classList.toggle('on', filt); draw();
  });
  r.appendChild(fb);
  slider(u.ctl, 'Noise amplitude', 0, 0.002, 0.00005, amp,
    function (q) { return q === 0 ? 'none' : q.toExponential(0); },
    function (q) { amp = q; on = q > 0; nb.classList.toggle('on', on); draw(); },
    { scale: 3, tick: function (q) { return q.toExponential(0); } });
  node._draw = draw;
  draw();
});

D.boot();

})();
