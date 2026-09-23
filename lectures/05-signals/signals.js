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
  if (type === 'high') {
    /* the high-pass of the same corner is just what the low-pass throws away */
    var lo = butter(x, fc, fs, 'low');
    return x.map(function (v, i) { return v - lo[i]; });
  }
  var wc = Math.tan(Math.PI * fc / fs), k1 = Math.SQRT2 * wc, k2 = wc * wc;
  var a0 = k2 / (1 + k1 + k2), a1 = 2 * a0, a2 = a0;
  var b1 = 2 * a0 * (1 / k2 - 1), b2 = 1 - (a0 + a1 + a2 + b1);
  function pass(v) {
    var y = [], i;
    for (i = 0; i < v.length; i++) {
      var xm1 = i > 0 ? v[i - 1] : v[0], xm2 = i > 1 ? v[i - 2] : v[0];
      var ym1 = i > 0 ? y[i - 1] : v[0], ym2 = i > 1 ? y[i - 2] : v[0];
      y.push(a0 * v[i] + a1 * xm1 + a2 * xm2 + b1 * ym1 + b2 * ym2);
    }
    return y;
  }
  /* Pad before filtering. Without this the recursion starts from a flat guess
     at each end and the first and last few cycles come back bent — the edge
     distortion you can see on any unpadded biomechanics trace, and the reason
     filtfilt pads by default. The padding is an ODD reflection: the signal is
     turned through the end point, so both the value and the slope carry across
     and the join adds no step of its own. */
  var n = x.length;
  var pad = Math.max(12, Math.min(n - 1, Math.round(3 * fs / fc)));
  var q = [], i;
  for (i = pad; i >= 1; i--) q.push(2 * x[0] - x[i]);
  for (i = 0; i < n; i++) q.push(x[i]);
  for (i = 1; i <= pad; i++) q.push(2 * x[n - 1] - x[n - 1 - i]);
  var f1 = pass(q), f2 = pass(f1.slice().reverse());
  return f2.reverse().slice(pad, pad + n);
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
   6. DIGITAL FILTERING — the wall of small multiples
   Slide 22 of the original is one signal seen four ways: the spectrum with
   the filter's own response drawn over it, and underneath, what comes out.
   Four columns is the right answer to "how many graphs" — the comparison is
   the point, and a filter you cannot see beside the others teaches nothing.
   ============================================================ */

/* lay a grid of small panels out inside one Axes canvas */
function grid(ax, cols, rows, o) {
  o = o || {};
  var W = ax.W, H = ax.H;
  var l = o.l == null ? 52 : o.l, r = o.r == null ? 12 : o.r;
  var t = o.t == null ? 30 : o.t, b = o.b == null ? 46 : o.b;
  var gx = o.gx == null ? 24 : o.gx, gy = o.gy == null ? 36 : o.gy;
  var cw = (W - l - r - (cols - 1) * gx) / cols;
  var rh = (H - t - b - (rows - 1) * gy) / rows;
  return function (ci, ri) {
    ax.pl = l + ci * (cw + gx);
    ax.pr = W - (ax.pl + cw);
    ax.pt = t + ri * (rh + gy);
    ax.pb = H - (ax.pt + rh);
    return { w: cw, h: rh, l: ax.pl, t: ax.pt };
  };
}

/* the zero-phase magnitude response of the filters this deck actually runs:
   a second-order Butterworth applied twice, so |H| is squared. */
function fresp(kind, f, fc) {
  function lp(fq, corner) { return 1 / (1 + Math.pow(fq / corner, 4)); }
  if (kind === 'none') return 1;
  if (kind === 'low') return lp(f, fc);
  if (kind === 'high') return 1 - lp(f, fc);
  if (kind === 'band') return lp(f, fc * 1.6) * (1 - lp(f, fc * 0.55));
  return 1 - lp(f, fc * 1.25) * (1 - lp(f, fc * 0.8));
}
function fapply(kind, x, fc, fs) {
  if (kind === 'none') return x.slice();
  if (kind === 'low') return butter(x, fc, fs, 'low');
  if (kind === 'high') return butter(x, fc, fs, 'high');
  if (kind === 'band') return butter(butter(x, fc * 1.6, fs, 'low'), fc * 0.55, fs, 'high');
  var b = butter(butter(x, fc * 1.25, fs, 'low'), fc * 0.8, fs, 'high');
  return x.map(function (v, i) { return v - b[i]; });
}
var FNAME = { none: 'recorded', low: 'low pass', high: 'high pass',
              band: 'band pass', stop: 'band stop' };
var FSUB = { none: '2 Hz + 30 Hz', low: 'keeps low frequencies',
             high: 'keeps high frequencies', band: 'keeps a band',
             stop: 'removes a band' };

D.register('filterwall', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 1000, h: port ? 600 : 412,
                            padl: 52, padr: 12, padt: 30, padb: 46 });
  var out = readout(u.ctl);
  var FS = 256, DUR = 1, FMAX = 44;
  var fc = parseFloat(d.cut || 10), last = 'band';

  var X = (function () {
    var x = [], i;
    for (i = 0; i < FS; i++) {
      var t = i / FS * DUR;
      x.push(Math.sin(2 * Math.PI * 2 * t) + 0.4 * Math.sin(2 * Math.PI * 30 * t));
    }
    return x;
  })();
  var SX = dft(X, FS);

  function draw() {
    var c = ax.c, K = C(), i, j;
    ax.clear();
    var cols = ['none', 'low', 'high', last];
    var ys = cols.map(function (k) { return fapply(k, X, fc, FS); });
    var ss = ys.map(function (y) { return dft(y, FS); });

    var amax = Math.max.apply(null, X.map(Math.abs)) * 1.18;
    var pmax = Math.max.apply(null, SX.filter(function (s) { return s.f <= FMAX; })
                                      .map(function (s) { return s.a; })) * 1.25;

    var nc = port ? 2 : 4, nr = port ? 4 : 2;
    var cell = grid(ax, nc, nr, port ? { l: 46, gy: 30, t: 26 } : {});

    cols.forEach(function (kind, k) {
      var ci = port ? k % 2 : k, rbase = port ? Math.floor(k / 2) * 2 : 0;

      /* ---- the spectrum, with the filter's own response drawn over it ---- */
      var g = cell(ci, rbase);
      ax.setRange(0, FMAX, 0, pmax);
      ax.frame({ grid: true, xticks: [0, 10, 20, 30, 40],
                 yticks: ci === 0 ? axisTicks(0, pmax, 3) : [],
                 ylabel: ci === 0 ? 'amplitude' : null, ysize: 11.5,
                 ylabelx: ax.pl - 34,
                 xfmt: function (v) { return v.toFixed(0); },
                 yfmt: function (v) { return v.toFixed(1); } });
      label(c, FNAME[kind], g.l, g.t - 16, { color: kind === 'none' ? K.MUT : K.ACC, size: 13 });
      label(c, kind === 'band' ? fmt(fc * 0.55, 1) + '–' + fmt(fc * 1.6, 1) + ' Hz'
            : kind === 'stop' ? 'removes ' + fmt(fc * 0.8, 1) + '–' + fmt(fc * 1.25, 1) + ' Hz'
            : FSUB[kind], g.l, g.t - 3, { color: K.MUT, size: 10.5, weight: '600' });
      SX.forEach(function (s, q) {
        if (s.f > FMAX || s.a < 1e-4) return;
        ax.poly([[s.f, 0], [s.f, s.a]], { color: K.SOFT, width: 1.6 });
        if (ss[k][q].a > 1e-4) ax.poly([[s.f, 0], [s.f, ss[k][q].a]], { color: K.BLUE, width: 1.8 });
      });
      if (kind !== 'none') {
        var rp = [];
        for (j = 0; j <= 160; j++) {
          var f = j / 160 * FMAX;
          rp.push([f, fresp(kind, f, fc) * pmax * 0.92]);
        }
        ax.poly(rp, { color: K.ACC, width: 2 });
      }

      /* ---- what comes out, on a scale shared with the other columns ---- */
      cell(ci, rbase + 1);
      ax.setRange(0, DUR, -amax, amax);
      ax.frame({ grid: true, xticks: [0, 0.5, 1],
                 yticks: ci === 0 ? axisTicks(-amax, amax, 3) : [],
                 ylabel: ci === 0 ? 'amplitude' : null, ysize: 11.5,
                 ylabelx: ax.pl - 34,
                 xlabel: rbase + 1 === nr - 1 ? 'Time (s)' : null,
                 xfmt: function (v) { return v.toFixed(1); },
                 yfmt: function (v) { return v.toFixed(1); } });
      var pts = [];
      for (i = 0; i < FS; i++) pts.push([i / FS, ys[k][i]]);
      ax.poly(pts, { color: kind === 'none' ? K.SOFT : K.BLUE, width: kind === 'none' ? 1.5 : 1.8 });
    });

    var lowKept = rms(ys[1]) / rms(X), hiKept = rms(ys[2]) / rms(X);
    out.innerHTML =
      'cut-off <b>' + fmt(fc, 0) + ' Hz</b> &nbsp;·&nbsp; low pass keeps <b>' +
      fmt(lowKept * 100, 0) + '%</b> of the amplitude, high pass keeps <b>' +
      fmt(hiKept * 100, 0) + '%</b>' +
      '<span class="hint">The <b style="color:var(--acc,#f87171)">red line</b> is the filter\'s ' +
      'own response — what fraction of each frequency it lets through. Grey spikes are what was ' +
      'recorded, blue what survived. Slide the cut-off past 2 Hz and the low-pass column throws ' +
      'away the signal it was meant to keep, which is the whole argument for choosing a cut-off ' +
      'from the signal rather than by habit.</span>';
  }

  var r = ctlRow(u.ctl);
  seg(r, [['band', 'fourth column: band pass'], ['stop', 'band stop']], last,
      function (v) { last = v; draw(); });
  slider(u.ctl, 'Cut-off', 1, 40, 1, fc, function (v) { return fmt(v, 0) + ' Hz'; },
    function (v) { fc = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  node._draw = draw;
  draw();
});


/* ============================================================
   6b. BURIED IN NOISE — and dug back out
   Slide 23 of the original: the same three columns, time domain on top and
   frequency domain underneath, with the noise ten times the size of the
   signal. The fourth column is the part the static slide could not show —
   that a filter aimed at the two spikes gets the sine waves back.
   ============================================================ */
D.register('buried', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 1000, h: port ? 600 : 404,
                            padl: 52, padr: 12, padt: 30, padb: 46 });
  var out = readout(u.ctl);
  var FS = 512, DUR = 2, N = FS * DUR, FMAX = 75;
  var mult = parseFloat(d.noise || 10), wid = 2;
  var NZ = noiseArray(N, 90210);

  /* The fourth column is the filter you could only design once the frequency
     domain had told you where to look. It is built in the frequency domain
     itself: measure the cosine and sine part of every frequency in the band,
     throw the rest away, and add the survivors back up. A Butterworth this
     narrow would attenuate the signal as hard as the noise; keeping bins does
     not, which is exactly why you go and look first. */
  function keepBands(x, bands) {
    var n = x.length, out = new Array(n), i, k, j;
    for (i = 0; i < n; i++) out[i] = 0;
    for (j = 0; j < bands.length; j++) {
      var k0 = Math.max(1, Math.ceil(bands[j][0] * n / FS));
      var k1 = Math.min(n / 2 - 1, Math.floor(bands[j][1] * n / FS));
      for (k = k0; k <= k1; k++) {
        var a = 0, b2 = 0, w = 2 * Math.PI * k / n;
        for (i = 0; i < n; i++) { a += x[i] * Math.cos(w * i); b2 += x[i] * Math.sin(w * i); }
        a *= 2 / n; b2 *= 2 / n;
        for (i = 0; i < n; i++) out[i] += a * Math.cos(w * i) + b2 * Math.sin(w * i);
      }
    }
    return out;
  }
  function build3() {
    var sig = [], nz = [], sum = [], i, t;
    for (i = 0; i < N; i++) {
      t = i / FS;
      var s = Math.sin(2 * Math.PI * 25 * t) + Math.sin(2 * Math.PI * 50 * t);
      sig.push(s); nz.push(mult * NZ[i]); sum.push(s + mult * NZ[i]);
    }
    var rec = keepBands(sum, [[25 - wid, 25 + wid], [50 - wid, 50 + wid]]);
    return [sig, nz, sum, rec];
  }

  function draw() {
    var c = ax.c, K = C(), i;
    ax.clear();
    var S = build3();
    var names = ['25 Hz + 50 Hz', 'random noise', 'signal + noise',
                 'keep 25 and 50 Hz ± ' + fmt(wid, 0) + ' Hz'];
    var subs = ['the signal we want', fmt(mult, 0) + '× the signal',
                'what the sensor records', 'the same record, filtered'];
    var spec = S.map(function (y) { return dft(y, FS); });
    var amax = S.map(function (y) { return Math.max.apply(null, y.map(Math.abs)) * 1.12; });
    var pmax = Math.max.apply(null, spec[2].filter(function (s) { return s.f <= FMAX; })
                                           .map(function (s) { return s.a; })) * 1.3;

    var nc = port ? 2 : 4, nr = port ? 4 : 2;
    var cell = grid(ax, nc, nr, port ? { l: 46, gy: 30, t: 26 } : { gx: 44 });

    S.forEach(function (y, k) {
      var ci = port ? k % 2 : k, rbase = port ? Math.floor(k / 2) * 2 : 0;
      var col = k === 0 ? K.GRN : (k === 3 ? K.ACC : K.BLUE);
      var step = k === 1 || k === 2 ? 1 : 1;

      var g = cell(ci, rbase);
      ax.setRange(0, DUR, -amax[k], amax[k]);
      ax.frame({ grid: true, xticks: [0, 1, 2],
                 yticks: axisTicks(-amax[k], amax[k]),
                 ylabel: ci === 0 ? 'amplitude' : null, ysize: 11.5, ylabelx: ax.pl - 38,
                 xfmt: function (v) { return v.toFixed(1); },
                 yfmt: function (v) { return v.toFixed(0); } });
      label(c, names[k], g.l, g.t - 16, { color: col, size: 12.5 });
      label(c, subs[k], g.l, g.t - 3, { color: K.MUT, size: 10.5, weight: '600' });
      var pts = [];
      for (i = 0; i < N; i += step) pts.push([i / FS, y[i]]);
      ax.poly(pts, { color: col, width: k === 0 || k === 3 ? 1.4 : 0.9 });

      cell(ci, rbase + 1);
      ax.setRange(0, FMAX, 0, pmax);
      ax.frame({ grid: true, xticks: [0, 25, 50, 75],
                 yticks: ci === 0 ? axisTicks(0, pmax, 3) : [],
                 ylabel: ci === 0 ? 'amplitude' : null, ysize: 11.5, ylabelx: ax.pl - 34,
                 xlabel: rbase + 1 === nr - 1 ? 'Frequency (Hz)' : null,
                 xfmt: function (v) { return v.toFixed(0); },
                 yfmt: function (v) { return v.toFixed(1); } });
      spec[k].forEach(function (s) {
        if (s.f > FMAX || s.a < 1e-4) return;
        /* the two bins the signal actually lives in, picked out of the hedge */
        var isSig = k === 2 && (Math.abs(s.f - 25) < 0.3 || Math.abs(s.f - 50) < 0.3);
        ax.poly([[s.f, 0], [s.f, s.a]], { color: isSig ? K.GRN : col, width: isSig ? 2.6 : 1.4 });
      });
      if (k === 3) {
        [25 - wid, 25 + wid, 50 - wid, 50 + wid].forEach(function (f) {
          ax.poly([[f, 0], [f, pmax]], { color: K.MUT, width: 1, dash: [4, 3] });
        });
      }
    });

    function peak(sp, f) {
      var best = 0;
      sp.forEach(function (s) { if (Math.abs(s.f - f) < 2 && s.a > best) best = s.a; });
      return best;
    }
    /* how much of the clean signal the filtered record has got back */
    var a = S[0], b = S[3], num = 0, da = 0, db = 0;
    for (i = 0; i < N; i++) { num += a[i] * b[i]; da += a[i] * a[i]; db += b[i] * b[i]; }
    var corr = num / Math.sqrt(da * db);

    var floor = 0, nn = 0;
    spec[1].forEach(function (s2) { if (s2.f > 5 && s2.f < FMAX) { floor += s2.a; nn++; } });
    floor = nn ? floor / nn : 0;
    out.innerHTML =
      'noise <b>' + fmt(mult, 0) + '×</b> the signal &nbsp;·&nbsp; in the buried record the 25 Hz ' +
      'spike still stands at <b>' + fmt(peak(spec[2], 25), 2) + '</b> against an average noise ' +
      'floor of <b>' + fmt(floor, 2) + '</b> &nbsp;·&nbsp; after filtering, the record matches the ' +
      'clean signal to <b>r = ' + fmt(corr, 2) + '</b>' +
      '<span class="hint">In the time domain the third column is hopeless — the sine waves are ' +
      'completely buried. In the <b>frequency domain</b> they are still standing there in plain ' +
      'sight, because noise spreads its energy across every frequency while a sine wave puts all ' +
      'of its energy in one place. That is what makes the fourth column possible: once you can ' +
      'see where the signal is, you can build a filter that keeps only that.</span>';
  }

  slider(u.ctl, 'Noise size', 1, 25, 1, mult, function (v) { return fmt(v, 0) + '×'; },
    function (v) { mult = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'Pass band', 1, 10, 1, wid, function (v) { return '± ' + fmt(v, 0) + ' Hz'; },
    function (v) { wid = v; draw(); }, { scale: 5, tick: function (v) { return fmt(v, 0); } });
  u.ctl.classList.add('g2');
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


/* A measured marker trajectory: the right heel of SUSU-30 through one
   stride of the Walking1-2 trial, 101 samples at 90 Hz, millimetres in the
   same path frame as the figure (x forward, y left, z up). */
var SIG_HEEL = [7,8,8,8,9,9,9,10,10,10,11,11,12,13,14,14,15,15,16,17,18,19,20,22,23,25,27,28,30,32,34,36,38,40,42,45,47,50,53,56,60,65,69,75,81,87,96,105,115,127,141,157,175,193,213,233,251,268,281,290,298,304,308,311,312,312,309,304,297,289,278,266,253,237,221,203,185,166,147,127,108,89,71,55,40,28,18,11,6,4,3,1,-3,-4,-4,-4,-4,-2,0,1,2];
var SIG_HEEL_X = [180,181,182,182,182,182,182,182,183,183,182,182,183,183,183,183,183,184,184,184,184,185,185,186,187,187,188,189,189,190,191,191,192,192,193,194,194,195,196,197,198,200,202,204,207,210,214,220,227,237,249,265,283,303,326,353,383,416,447,473,499,526,555,586,616,648,679,710,742,774,808,842,877,913,950,989,1028,1069,1111,1155,1200,1246,1293,1341,1389,1437,1482,1526,1566,1603,1634,1660,1677,1683,1683,1682,1683,1685,1688,1690,1691];
var SIG_FS = 90, SIG_DT = 1 / 90;

/* ============================================================
   7. NOISE AMPLIFIED BY DIFFERENTIATION
   Slide 24 of the original, on a real trajectory: the right heel of a real
   walker, measured at 90 Hz, with marker noise of a few tenths of a
   millimetre added. Nothing is visible in the position trace. By the second
   derivative the noise is most of what is there — and that is the signal
   every joint moment in a gait report is built on.
   ============================================================ */
D.register('deriv', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 960, h: port ? 620 : 430,
                            padl: 66, padr: 22, padt: 18, padb: 46 });
  var out = readout(u.ctl);
  var st = { az: 0.02, tilt: 0.05 };
  var DUR = (SIG_HEEL.length - 1) / SIG_FS;
  var nmm = 1.0, on = true, filt = false, fc = 10, rate = SIG_FS;
  var p = 0.30, playing = false, raf, last = 0;
  var NZ = noiseArray(4096, 4711);
  var N, dt;

  /* The measured trajectory, read off at whatever rate the camera runs at.
     The stride runs heel strike to heel strike, so it is periodic, and the
     honest way to read it between samples is a band-limited (Fourier)
     interpolation rather than straight lines: straight lines put a kink at
     every sample, and a kink has infinite acceleration, which would fake the
     very effect this figure is about. Twenty-five harmonics of a 0.9 Hz
     stride reach 22 Hz — far above anything a heel does. */
  var HARM = (function () {
    var n = SIG_HEEL.length - 1, K = 25, co = [], k, i;
    var a0 = 0;
    for (i = 0; i < n; i++) a0 += SIG_HEEL[i];
    a0 /= n;
    for (k = 1; k <= K; k++) {
      var ak = 0, bk = 0;
      for (i = 0; i < n; i++) {
        var w = 2 * Math.PI * k * i / n;
        ak += SIG_HEEL[i] * Math.cos(w); bk += SIG_HEEL[i] * Math.sin(w);
      }
      co.push([2 * ak / n, 2 * bk / n]);
    }
    return { a0: a0, c: co };
  })();
  function heelAt(uu) {
    var v = HARM.a0, k;
    for (k = 0; k < HARM.c.length; k++) {
      var w = 2 * Math.PI * (k + 1) * uu;
      v += HARM.c[k][0] * Math.cos(w) + HARM.c[k][1] * Math.sin(w);
    }
    return v / 1000;
  }
  function clean() {
    var x = [], i;
    N = Math.round(DUR * rate) + 1; dt = 1 / rate;
    for (i = 0; i < N; i++) x.push(heelAt(i / (N - 1)));   /* one full stride */
    return x;
  }
  function series(x0) {
    var x = [], i;
    for (i = 0; i < N; i++) x.push(x0[i] + (on ? nmm / 1000 * NZ[i % NZ.length] : 0));
    return filt ? butter(x, fc, rate, 'low') : x;
  }
  function diff(v) {
    var o = [], i;
    for (i = 0; i < v.length; i++) {
      var a = v[Math.max(0, i - 1)], b = v[Math.min(v.length - 1, i + 1)];
      var h = (i === 0 || i === v.length - 1) ? dt : 2 * dt;
      o.push((b - a) / h);
    }
    return o;
  }

  /* ---- the walker, with the tracked marker lit up -------------------- */
  function figure(c, K, W, H) {
    var S = port ? H * 0.115 : H * 0.40;
    var pel = mo('pelvis', p);
    var cx = port ? W * 0.5 : W * 0.135, cy = port ? H * 0.12 : H * 0.54;
    var P0 = view3(st.az, st.tilt, S, cx, cy);
    var P = function (x, y, z) { return P0(x - pel[0], y, z - 0.95); };
    moFloor(c, P, K, pel[0], 0.4, 0.4);
    moDraw(c, P, p, { w: 4.4, mid: K.MUT, left: K.SOFT, right: K.INK });

    /* the heel marker's own path through the stride, and where it is now */
    var trail = [], q, i;
    for (i = 0; i <= 40; i++) {
      q = mo('heelR', i / 40);
      trail.push(P(q[0], q[1], q[2]));
    }
    c.save();
    c.strokeStyle = K.BLUE; c.globalAlpha = 0.45; c.lineWidth = 1.4;
    c.beginPath();
    trail.forEach(function (s2, k) { k ? c.lineTo(s2.x, s2.y) : c.moveTo(s2.x, s2.y); });
    c.stroke(); c.restore();
    q = mo('heelR', p);
    var M = P(q[0], q[1], q[2]);
    c.save();
    c.fillStyle = K.BLUE; c.strokeStyle = K.PLATE; c.lineWidth = 2;
    c.beginPath(); c.arc(M.x, M.y, 6, 0, 7); c.fill(); c.stroke();
    c.restore();
    label(c, 'heel marker', M.x + 11, M.y - 10, { color: K.BLUE, size: 11.5, plate: true });
  }

  function draw() {
    var c = ax.c, K = C(), i;
    ax.clear();
    figure(c, K, ax.W, ax.H);

    var x0 = clean(), v0 = diff(x0), a0 = diff(v0);
    var x = series(x0), v = diff(x), a = diff(v);
    var rows = [
      { y: x, ref: x0, lab: 'height (m)', col: 'BLUE', dp: 2 },
      { y: v, ref: v0, lab: 'velocity (m/s)', col: 'ORG', dp: 1 },
      { y: a, ref: a0, lab: 'acceleration (m/s²)', col: 'ACC', dp: 0 }
    ];
    var L = port ? 62 : ax.W * 0.30 + 60, R = 24;
    var P3 = port
      ? [{ pt: ax.H * 0.27, pb: ax.H * 0.52 }, { pt: ax.H * 0.52, pb: ax.H * 0.27 },
         { pt: ax.H * 0.77, pb: 44 }]
      : [{ pt: 16, pb: ax.H - 138 }, { pt: ax.H * 0.36, pb: ax.H * 0.40 },
         { pt: ax.H * 0.69, pb: 44 }];

    rows.forEach(function (r, k) {
      var lim = Math.max(Math.max.apply(null, r.y.map(Math.abs)),
                         Math.max.apply(null, r.ref.map(Math.abs))) * 1.16 || 1;
      var lo = k === 0 ? 0 : -lim;
      ax.pl = L; ax.pr = R; ax.pt = P3[k].pt; ax.pb = P3[k].pb;
      ax.setRange(0, 100, lo, lim);
      ax.frame({ grid: true, xticks: k === 2 ? [0, 25, 50, 75, 100] : [],
                 yticks: axisTicks(lo, lim), ylabel: r.lab, ysize: 12, ylabelx: L - 56,
                 xlabel: k === 2 ? 'stride (%)' : null,
                 xfmt: function (q) { return q.toFixed(0); },
                 yfmt: function (q) { return q.toFixed(r.dp); } });
      var pr = [], pn = [];
      for (i = 0; i < N; i++) {
        pr.push([i / (N - 1) * 100, r.ref[i]]);
        pn.push([i / (N - 1) * 100, r.y[i]]);
      }
      ax.poly(pr, { color: K.SOFT, width: 1.6 });
      ax.poly(pn, { color: K[r.col], width: k === 2 ? 1.2 : 1.9 });
      ax.poly([[p * 100, lo], [p * 100, lim]], { color: K.MUT, width: 1, dash: [3, 3] });
      if (k === 0) {
        label(c, 'measured', ax.X(2), ax.Y(lim * 0.88), { color: K.SOFT, size: 11, weight: '700' });
        label(c, on ? 'with marker noise' : 'no noise added', ax.X(2), ax.Y(lim * 0.74),
              { color: K[r.col], size: 11, weight: '700' });
      }
    });
    ax.pt = P3[0].pt; ax.pb = P3[0].pb;

    var pkTrue = Math.max.apply(null, a0.map(Math.abs));
    var pkGot = Math.max.apply(null, a.map(Math.abs));
    out.innerHTML =
      'right heel, one stride, sampled at <b>' + fmt(rate, 0) + ' Hz</b>' +
      (on ? ' &nbsp;·&nbsp; marker noise <b>±' + fmt(nmm, 1) + ' mm</b>' : ' &nbsp;·&nbsp; no noise') +
      (filt ? ' &nbsp;·&nbsp; low-pass <b>' + fmt(fc, 0) + ' Hz</b>' : '') +
      ' &nbsp;·&nbsp; peak acceleration <b>' + fmt(pkGot, 0) + ' m/s²</b> against a true <b>' +
      fmt(pkTrue, 0) + ' m/s²</b>' +
      '<span class="hint">A millimetre is nothing in the height trace — it is thinner than the ' +
      'line. But a difference divides by dt, and doing it twice divides by dt², so the same ' +
      'millimetre comes out as metres per second squared. Step the camera up to 360 Hz and the ' +
      'movement does not change at all, while the noise in the acceleration gets <b>sixteen ' +
      'times worse</b> — the faster camera samples the same marker error more often and across ' +
      'a shorter interval. Press the low-pass and the acceleration comes back, which is why ' +
      'kinematic data is filtered <b>before</b> it is differentiated, not after — and why the cut-off matters: drop it to 6 Hz and the filter starts shaving the real peak off too.</span>';
  }

  var r = ctlRow(u.ctl);
  var nb = el('button', 'ibtn' + (on ? ' on' : ''), 'Noise on');
  nb.addEventListener('click', function () {
    on = !on; nb.classList.toggle('on', on); nb.textContent = on ? 'Noise on' : 'Noise off'; draw();
  });
  r.appendChild(nb);
  var fb = el('button', 'ibtn' + (filt ? ' on' : ''), 'Low-pass filter');
  fb.addEventListener('click', function () { filt = !filt; fb.classList.toggle('on', filt); draw(); });
  r.appendChild(fb);
  var pb = playBtn(r, '▶ Walk');
  pb.setAttribute('data-unsafe', '1');
  seg(ctlRow(u.ctl), [[90, '90 Hz'], [180, '180 Hz'], [360, '360 Hz']], rate,
      function (v) { rate = +v; draw(); });
  slider(u.ctl, 'Marker noise', 0, 3, 0.1, nmm,
    function (q) { return q === 0 ? 'none' : '± ' + fmt(q, 1) + ' mm'; },
    function (q) { nmm = q; on = q > 0; nb.classList.toggle('on', on); draw(); },
    { scale: 5, tick: function (q) { return fmt(q, 1); } });
  slider(u.ctl, 'Cut-off', 3, 25, 1, fc, function (q) { return fmt(q, 0) + ' Hz'; },
    function (q) { fc = q; if (filt) draw(); else draw(); });
  u.ctl.classList.add('g2');

  pb.addEventListener('click', function () {
    playing = !playing;
    pb.textContent = playing ? '❚❚ Pause' : '▶ Walk';
    if (playing) { last = 0; raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf);
  });
  function loop(ts) {
    if (!last) last = ts;
    p += (ts - last) / 2400;
    if (p > 1) p -= 1;
    last = ts; draw();
    if (playing) raf = requestAnimationFrame(loop);
  }
  dragRotate(u.cv, st, draw);
  node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Walk'; };
  node._draw = draw;
  draw();
});


/* ============================================================
   8. WAVELETS AND EVENT DETECTION
   Geneau, Commandeur, Brodie, Tsai, Jensen & Klimstra (2024), "The
   determination of on-water rowing stroke kinematics using an undecimated
   wavelet transform of a rowing hull-mounted accelerometer signal",
   Sensors 24(18), 6085.

   A single accelerometer on the hull, 200 Hz. Decompose it with a 9-level
   undecimated biorthogonal 4.4 wavelet transform and the stroke landmarks
   that are buried in the raw trace turn into a clean valley and a clean
   peak — at the right decomposition level. Which level is the question the
   paper had to answer, and it is the slider here.

   The hull trace is modelled on the paper's figures rather than measured;
   the transform, the detection rules and the force reference are the
   paper's own.
   ============================================================ */

/* the CDF 9/7 (biorthogonal 4.4) analysis low-pass, normalised to sum to 1 */
var UWT_H = [0.026748757411, -0.016864118443, -0.078223266529, 0.266864118443,
             0.602949018236, 0.266864118443, -0.078223266529, -0.016864118443,
             0.026748757411];

/* undecimated ("a trous") transform: every level is the full length of the
   signal, so an event found at level 6 still sits at the sample it happened
   at. That is the whole reason for not decimating. */
function uwt(x, levels) {
  var n = x.length, out = [x.slice()], j, i, k;
  for (j = 0; j < levels; j++) {
    var prev = out[out.length - 1], cur = new Array(n), step = 1 << j;
    for (i = 0; i < n; i++) {
      var s = 0;
      for (k = 0; k < 9; k++) {
        var idx = i + (k - 4) * step;
        while (idx < 0 || idx >= n) idx = idx < 0 ? -idx : 2 * (n - 1) - idx;
        s += UWT_H[k] * prev[idx];
      }
      cur[i] = s;
    }
    out.push(cur);
  }
  return out;
}

D.register('wavelet', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 470 : 980, h: port ? 620 : 452,
                            padl: 60, padr: 20, padt: 22, padb: 44 });
  var out = readout(u.ctl);
  var FS = 200, SPM = 30, STROKES = 4, DF = 0.42;
  var T = 60 / SPM, N = Math.round(T * STROKES * FS);
  var lvS = 4, lvE = 6, rough = false;
  var NZ = noiseArray(N, 606185);

  function hull(q) {
    function g(c, w) { return Math.exp(-Math.pow((q - c) / w, 2)); }
    return -1.00 * g(0.02, 0.030) + 0.95 * g(0.20, 0.090) - 0.55 * g(0.44, 0.045)
         + 0.30 * g(0.62, 0.110) - 0.22 * g(0.86, 0.120);
  }
  function force(q) {
    if (q < 0 || q > DF) return 0;
    return Math.pow(Math.sin(Math.PI * q / DF), 1.3);
  }
  var SIG = (function () {
    var x = [], f = [], i;
    for (i = 0; i < N; i++) {
      var t = i / FS, q = (t / T) % 1;
      /* the hull ring the paper's raw trace is full of, plus sensor noise */
      x.push(hull(q) + 0.16 * Math.sin(2 * Math.PI * 14.5 * t) * (0.5 + 0.5 * Math.cos(2 * Math.PI * q)));
      f.push(force(q));
    }
    return { x: x, f: f };
  })();
  function signal() {
    var k = rough ? 0.40 : 0.20, i, x = [];
    for (i = 0; i < N; i++) x.push(SIG.x[i] + k * NZ[i]);
    return x;
  }

  /* --- the events, exactly as the paper defines them ------------------- */
  function refEvents() {
    var ev = [], s;
    for (s = 0; s < STROKES; s++) {
      var base = s * T;
      var qs = 0, lo = 0, hi = DF;                     /* rising edge at 5% */
      for (var q = 0; q < DF; q += 1e-4) { if (force(q) >= 0.05) { qs = q; break; } }
      ev.push({ start: base + qs * T, end: base + DF * T });
    }
    return ev;
  }
  /* The paper runs a PEAK DETECTOR on the negated coefficient, not a global
     search: the first prominent valley in the window is taken as the catch.
     That is the whole reason the level matters — on a noisy level the first
     prominent valley is a piece of hull ring, not the catch. */
  function firstMin(a, i0, i1, thr) {
    for (var i = i0 + 1; i < i1; i++) {
      if (a[i] < a[i - 1] && a[i] <= a[i + 1] && a[i] < thr) return i;
    }
    var bi = i0, bv = Infinity;
    for (i = i0; i <= i1; i++) if (a[i] < bv) { bv = a[i]; bi = i; }
    return bi;
  }
  function firstMax(a, i0, i1, thr) {
    for (var i = i0 + 1; i < i1; i++) {
      if (a[i] > a[i - 1] && a[i] >= a[i + 1] && a[i] > thr) return i;
    }
    var bi = i0, bv = -Infinity;
    for (i = i0; i <= i1; i++) if (a[i] > bv) { bv = a[i]; bi = i; }
    return bi;
  }
  function detect(levels) {
    var cs = levels[lvS], ce = levels[lvE], ev = [], s, i;
    function span(a) {
      var m = 0;
      for (i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
      return m;
    }
    var ts = 0.30 * span(cs), te = 0.20 * span(ce);
    for (s = 0; s < STROKES; s++) {
      var i0 = Math.max(1, Math.round((s * T - 0.14 * T) * FS));
      var i1 = Math.min(N - 2, Math.round((s * T + 0.30 * T) * FS));
      var bi = firstMin(cs, i0, i1, -ts);
      var j1 = Math.min(N - 2, Math.round((s * T + 0.9 * T) * FS));
      var pk = firstMax(ce, bi, j1, te);
      var ei = firstMin(ce, pk, j1, -te * 0.15);
      ev.push({ start: bi / FS, end: ei / FS, peak: pk / FS });
    }
    return ev;
  }

  function draw() {
    var c = ax.c, K = C(), i, s;
    ax.clear();
    var x = signal(), levels = uwt(x, 9);
    var det = detect(levels), ref = refEvents();
    var DURS = N / FS;

    var PA = port ? { pt: 20, pb: ax.H * 0.70 } : { pt: 20, pb: ax.H * 0.66 };
    var PB = port ? { pt: ax.H * 0.34, pb: ax.H * 0.50 } : { pt: ax.H * 0.38, pb: ax.H * 0.48 };
    var PC = port ? { pt: ax.H * 0.54, pb: 44 } : { pt: ax.H * 0.58, pb: 44 };

    function marks(ev, cs, ce, up) {
      ev.forEach(function (e) {
        [[cs, e.start], [ce, e.end]].forEach(function (p2) {
          var col = p2[0], X = ax.X(p2[1]), Y = up ? ax.pt + 10 : ax.H - ax.pb - 10;
          c.save(); c.fillStyle = col; c.beginPath();
          c.moveTo(X, Y); c.lineTo(X - 5, Y + (up ? -9 : 9)); c.lineTo(X + 5, Y + (up ? -9 : 9));
          c.closePath(); c.fill(); c.restore();
          ax.poly([[p2[1], ax.ymin], [p2[1], ax.ymax]], { color: col, width: 1, dash: [3, 4] });
        });
      });
    }

    /* ---- A: the raw hull acceleration, and the level it is judged at ---- */
    ax.pt = PA.pt; ax.pb = PA.pb;
    var lim = Math.max.apply(null, x.map(Math.abs)) * 1.12;
    ax.setRange(0, DURS, -lim, lim);
    ax.frame({ grid: true, xticks: [], yticks: axisTicks(-lim, lim),
               ylabel: 'hull acceleration', ysize: 12, ylabelx: 12,
               yfmt: function (v) { return v.toFixed(1); } });
    var p1 = [], p2 = [], p3 = [];
    for (i = 0; i < N; i++) {
      p1.push([i / FS, x[i]]);
      p2.push([i / FS, levels[lvS][i]]);
      p3.push([i / FS, levels[lvE][i]]);
    }
    ax.poly(p1, { color: K.SOFT, width: 0.9 });
    ax.poly(p2, { color: K.ACC, width: 2.2 });
    ax.poly(p3, { color: K.ORG, width: 1.8, dash: [6, 3] });
    label(c, 'raw, 200 Hz', ax.X(0.06), ax.Y(-lim * 0.72), { color: K.MUT, size: 11, weight: '700' });
    label(c, 'level ' + lvS + ' — drive start', ax.X(0.06), ax.Y(-lim * 0.86),
          { color: K.ACC, size: 11, weight: '700' });
    label(c, 'level ' + lvE + ' — drive end', ax.X(2.55), ax.Y(-lim * 0.86),
          { color: K.ORG, size: 11, weight: '700' });
    marks(det, K.ACC, K.ORG, true);

    /* ---- B: the force reference the detector is judged against ---- */
    ax.pt = PB.pt; ax.pb = PB.pb;
    ax.setRange(0, DURS, 0, 1.15);
    ax.frame({ grid: true, xticks: [], yticks: [0, 0.5, 1],
               ylabel: 'oarlock force', ysize: 12, ylabelx: 12,
               yfmt: function (v) { return v.toFixed(1); } });
    var pf = [];
    for (i = 0; i < N; i++) pf.push([i / FS, SIG.f[i]]);
    ax.poly(pf, { color: K.BLUE, width: 2 });
    ax.poly([[0, 0.05], [DURS, 0.05]], { color: K.MUT, width: 1, dash: [4, 4] });
    label(c, '5% of peak force', ax.X(DURS * 0.55), ax.Y(0.14),
          { color: K.MUT, size: 10.5, weight: '700' });
    marks(ref, K.BLUE, K.BLUE, false);

    /* ---- C: the ladder — why the level matters ---- */
    ax.pt = PC.pt; ax.pb = PC.pb;
    ax.setRange(0, DURS, 0, 10);
    ax.frame({ grid: false, xticks: [0, 2, 4, 6, 8],
               yticks: [], xlabel: 'Time (s)',
               ylabel: 'decomposition level', ysize: 12, ylabelx: 12,
               xfmt: function (v) { return v.toFixed(0); } });
    for (s = 1; s <= 9; s++) {
      var row = 9.5 - s, a = levels[s];
      var m = Math.max.apply(null, a.map(Math.abs)) || 1;
      var pts = [];
      for (i = 0; i < N; i++) pts.push([i / FS, row + a[i] / m * 0.46]);
      var sel = s === lvS || s === lvE;
      ax.poly(pts, { color: s === lvS ? K.ACC : (s === lvE ? K.ORG : K.SOFT),
                     width: sel ? 1.8 : 0.9 });
      label(c, String(s), ax.X(0) - 8, ax.Y(row),
            { color: sel ? (s === lvS ? K.ACC : K.ORG) : K.MUT, size: 10.5,
              align: 'right', weight: sel ? '800' : '600' });
    }

    /* ---- how well did it do ---- */
    var es = 0, ee = 0;
    for (s = 0; s < STROKES; s++) {
      es += Math.abs(det[s].start - ref[s].start);
      ee += Math.abs(det[s].end - ref[s].end);
    }
    es = es / STROKES * 1000; ee = ee / STROKES * 1000;
    out.innerHTML =
      'drive start from level <b class="r">' + lvS + '</b> is out by <b>' + fmt(es, 0) +
      ' ms</b> &nbsp;·&nbsp; drive end from level <b style="color:#fbbf24">' + lvE +
      '</b> is out by <b>' + fmt(ee, 0) + ' ms</b>, against the oarlock force' +
      '<span class="hint">The raw trace has the landmarks in it, but it also has hull ring and ' +
      'sensor noise, so a peak detector run on it finds dozens of peaks per stroke. Each level ' +
      'of the wavelet transform is a smoother version of the same signal, and because the ' +
      'transform is <b>undecimated</b> every level stays the same length — an event found at ' +
      'level 6 still sits at the sample it happened at. Too low a level and the noise is still ' +
      'there; too high and the landmark slides away from where it happened. Geneau et al. (2024) ' +
      'settled on different levels for the two events and reported ICCs of 0.88–0.94 for drive ' +
      'time against an instrumented oarlock.</span>';
  }

  slider(u.ctl, 'Drive-start level', 1, 9, 1, lvS, function (v) { return 'level ' + fmt(v, 0); },
    function (v) { lvS = v; draw(); }, { scale: 1, tick: function (v) { return fmt(v, 0); } });
  slider(u.ctl, 'Drive-end level', 1, 9, 1, lvE, function (v) { return 'level ' + fmt(v, 0); },
    function (v) { lvE = v; draw(); }, { scale: 1, tick: function (v) { return fmt(v, 0); } });
  u.ctl.classList.add('g2');
  var r = ctlRow(u.ctl);
  var nb = el('button', 'ibtn', 'Rougher water');
  nb.addEventListener('click', function () {
    rough = !rough; nb.classList.toggle('on', rough);
    nb.textContent = rough ? 'Calm water' : 'Rougher water'; draw();
  });
  r.appendChild(nb);
  node._draw = draw;
  draw();
});


D.boot();

})();
