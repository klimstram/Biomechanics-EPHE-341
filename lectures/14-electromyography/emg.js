/* ======================================================================
   EPHE 341 — Electromyography (lecture 14)

   Every signal-processing claim in this file was written and checked in
   Python first (scratchpad/emg14/model/emgphys.py) and the JS is verified
   against those numbers by parts/selftest.js.  Nothing here is tuned by
   eye: a MUAP integrates to zero, independent trains add in power, and a
   bipolar pair is a comb filter with zeros at k*cv/d.
   ====================================================================== */
(function () {
'use strict';

var D = window.DECK;
var Axes = D.Axes, el = D.el, slider = D.slider, playBtn = D.playBtn,
    readout = D.readout, build = D.build, axisTicks = D.axisTicks;
function C() { return D.colors(); }

/* ---------------- shared UI, same vocabulary as the other decks --------- */
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
   leave alone. A control that chooses WHAT IS SHOWN has to opt out or the
   handout page is whatever the sweep happened to press last. */
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
function key(c, x, y, rows, o) {
  o = o || {};
  var size = o.size || 11.5, lh = size * 1.55, pad = 7;
  c.save();
  c.font = '600 ' + size + 'px ui-sans-serif,system-ui,sans-serif';
  var w = 0;
  rows.forEach(function (r) { w = Math.max(w, c.measureText(r[1]).width); });
  w += 26 + pad * 2;
  var h = rows.length * lh + pad * 2;
  c.fillStyle = C().PLATE; c.globalAlpha = .92; c.fillRect(x, y, w, h);
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
/* ====================================================================
   SIGNAL MODEL — the part that has to be right

   muap(t): the second derivative of a Gaussian.  Biphasic, and it
   integrates to zero, which any signal seen through an AC-coupled,
   band-limited amplifier must.  `dur` is the full width; halving the
   conduction velocity doubles it, which is the whole fatigue mechanism.
   ==================================================================== */
function muap(t, dur, amp) {
  dur = dur || 0.008; amp = amp == null ? 1 : amp;
  var s = dur / 6, x = t / s;
  return amp * (1 - x * x) * Math.exp(-0.5 * x * x);
}

/* |1 - e^{-j 2 pi f tau}| = 2|sin(pi f tau)| : a bipolar pair is a comb
   filter with zeros wherever a whole number of wavelengths fits into the
   inter-electrode delay.  tau = d/cv. */
function combGain(f, d_mm, cv) {
  return 2 * Math.abs(Math.sin(Math.PI * f * (d_mm * 1e-3) / cv));
}
function combZeros(d_mm, cv, fmax) {
  var z = [], f0 = cv / (d_mm * 1e-3);
  for (var k = 1; k * f0 <= fmax; k++) z.push(k * f0);
  return z;
}

/* --- Butterworth, as biquads, applied forwards and backwards -----------
   Single-pass filtering delays the signal; filtfilt does not, and the
   deck makes a point of showing the difference rather than hiding it. */
function biquads(order, wc, type) {
  /* wc = cutoff / nyquist, 0..1 */
  var n = Math.max(1, Math.round(order / 2)), out = [];
  var k = Math.tan(Math.PI * wc / 2);
  for (var i = 0; i < n; i++) {
    var th = Math.PI * (2 * i + 1) / (2 * n * 1) + Math.PI / 2;  /* pole angles */
    var q = 1 / (2 * Math.cos(Math.PI * (2 * i + 1) / (4 * n)));
    var norm = 1 / (1 + k / q + k * k);
    var b0, b1, b2;
    if (type === 'low') { b0 = k * k * norm; b1 = 2 * b0; b2 = b0; }
    else                { b0 = norm;         b1 = -2 * b0; b2 = b0; }
    out.push({ b0: b0, b1: b1, b2: b2,
               a1: 2 * (k * k - 1) * norm,
               a2: (1 - k / q + k * k) * norm });
  }
  return out;
}
function runBiquad(x, s) {
  var y = new Float64Array(x.length), z1 = 0, z2 = 0;
  for (var i = 0; i < x.length; i++) {
    var v = s.b0 * x[i] + z1;
    z1 = s.b1 * x[i] - s.a1 * v + z2;
    z2 = s.b2 * x[i] - s.a2 * v;
    y[i] = v;
  }
  return y;
}
function rev(x) {
  var y = new Float64Array(x.length);
  for (var i = 0; i < x.length; i++) y[i] = x[x.length - 1 - i];
  return y;
}
/* Pad by odd reflection so the recursion does not start from a flat guess —
   the same fix the signals deck needed. */
function pad(x, n) {
  var y = new Float64Array(x.length + 2 * n), i;
  for (i = 0; i < n; i++) y[i] = 2 * x[0] - x[n - i];
  for (i = 0; i < x.length; i++) y[n + i] = x[i];
  for (i = 0; i < n; i++) y[n + x.length + i] = 2 * x[x.length - 1] - x[x.length - 2 - i];
  return y;
}
function sosOnce(x, sos) {
  var y = x;
  for (var i = 0; i < sos.length; i++) y = runBiquad(y, sos[i]);
  return y;
}
function filtfilt(x, sos) {
  var n = Math.min(Math.floor(x.length / 3), 600);
  var p = pad(x, n);
  var y = rev(sosOnce(rev(sosOnce(p, sos)), sos));
  return y.slice(n, n + x.length);
}
function bandpass(x, fs, lo, hi) {
  var y = filtfilt(x, biquads(4, lo / (fs / 2), 'high'));
  return filtfilt(y, biquads(4, hi / (fs / 2), 'low'));
}
function lowpass(x, fs, fc, zeroPhase, order) {
  /* 2nd order by default, which is what his slide 45 specifies. A 4th-order
     Butterworth rings enough to pull the envelope of a rectified (therefore
     non-negative) signal below zero, which looks like a mistake and is just
     the filter. */
  var sos = biquads(order || 2, fc / (fs / 2), 'low');
  return zeroPhase === false ? sosOnce(x, sos) : filtfilt(x, sos);
}
function rectify(x) {
  var y = new Float64Array(x.length);
  for (var i = 0; i < x.length; i++) y[i] = Math.abs(x[i]);
  return y;
}
function movingRMS(x, fs, winMs) {
  var w = Math.max(2, Math.round(winMs / 1000 * fs));
  var y = new Float64Array(x.length), acc = 0, i;
  var half = Math.floor(w / 2);
  for (i = 0; i < x.length; i++) {
    acc += x[i] * x[i];
    if (i >= w) acc -= x[i - w] * x[i - w];
    var k = Math.min(i + 1, w);
    y[Math.max(0, i - half)] = Math.sqrt(acc / k);
  }
  for (i = Math.max(0, x.length - half); i < x.length; i++) y[i] = y[Math.max(0, x.length - half - 1)];
  return y;
}
function rms(x) {
  var s = 0; for (var i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
}

/* --- spectrum: one periodogram over a Hann window ---------------------- */
function spectrum(x, fs) {
  var n = 1; while (n * 2 <= x.length) n *= 2;
  var re = new Float64Array(n), im = new Float64Array(n), i;
  for (i = 0; i < n; i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));
  /* iterative radix-2 FFT */
  for (i = 1, j = 0; i < n; i++) {
    var bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { var tr = re[i]; re[i] = re[j]; re[j] = tr;
                 var ti = im[i]; im[i] = im[j]; im[j] = ti; }
  }
  var j;
  for (var len = 2; len <= n; len <<= 1) {
    var ang = -2 * Math.PI / len;
    var wr = Math.cos(ang), wi = Math.sin(ang);
    for (i = 0; i < n; i += len) {
      var cr = 1, ci = 0;
      for (var k = 0; k < len / 2; k++) {
        var ur = re[i + k], ui = im[i + k];
        var vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        var vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
  var m = n / 2, f = new Float64Array(m), P = new Float64Array(m);
  for (i = 0; i < m; i++) { f[i] = i * fs / n; P[i] = (re[i] * re[i] + im[i] * im[i]) / n; }
  return { f: f, P: P };
}
function medianFreq(x, fs, lo, hi) {
  lo = lo == null ? 20 : lo; hi = hi == null ? 450 : hi;
  var s = spectrum(x, fs), tot = 0, i;
  for (i = 0; i < s.f.length; i++) if (s.f[i] >= lo && s.f[i] <= hi) tot += s.P[i];
  var acc = 0;
  for (i = 0; i < s.f.length; i++) {
    if (s.f[i] < lo || s.f[i] > hi) continue;
    acc += s.P[i];
    if (acc >= tot / 2) return s.f[i];
  }
  return hi;
}

var DEG = Math.PI / 180;
var EMG = (typeof window !== 'undefined' && window.EMG14) || {};

/* Exported for parts/selftest.js, which checks this model against the Python
   reference in scratchpad/emg14/model/emgphys.py.  Invisible in a browser. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { muap: muap, combGain: combGain, combZeros: combZeros,
                     bandpass: bandpass, lowpass: lowpass, rectify: rectify,
                     movingRMS: movingRMS, rms: rms, spectrum: spectrum,
                     medianFreq: medianFreq, filtfilt: filtfilt,
                     biquads: biquads, sosOnce: sosOnce };
}
/* ======================================================================
   1. TRAVEL — the same action potential, read twice

   His slides 24 and 26, which are PowerPoint animations: a wave travels
   along the fibre and passes one electrode (uni-polar) or two (bi-polar),
   and each electrode reads the SAME waveform at a DIFFERENT time.  The
   amplifier output is the difference of those two delayed copies.

   Everything on the screen comes from one function of time.  An electrode
   at longitudinal position x sees

       e(t) = muap(t - x / cv)

   so the gap between the two traces is exactly tau = d / cv, and the
   amplifier output is e1(t) - e2(t) with no further assumption.  That is
   what makes a MUAP biphasic: it is a difference of two shifted copies of
   a monophasic travelling wave, not a property of the muscle.

   Mains hum is added IDENTICALLY to both electrodes, so the subtraction
   removes it exactly (checked: worst residual 2.2e-16).  Cross-talk is a
   second source off to one side; its distance to the two contacts differs,
   so its amplitude differs, and the subtraction leaves a fraction of it
   behind.  Amplitude falls as 1/r^2 from a current source in a volume
   conductor.
   ====================================================================== */
D.register('travel', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { mode: 'bi', d: 20, cv: 4, hum: 0, xt: 0, t: 26 };

  var L = 120;                 /* mm of fibre on screen */
  var XE = 46;                 /* mm: midpoint of the pair */
  var QOFF = 15;               /* mm: how far off to the side the neighbour sits */
  var TMAX = 40;               /* ms of record */
  var FSK = 4;                 /* samples per ms */

  var ax = new Axes(u.cv, { w: port ? 460 : 1090, h: port ? 560 : 392,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  function x1() { return XE - (S.mode === 'uni' ? 0 : S.d / 2); }
  function x2() { return XE + S.d / 2; }

  /* ms for the wave to reach position x, from x = 0 at t = 0 */
  function arrive(x) { return x / S.cv; }      /* mm / (m/s) = ms */

  function humAt(t) { return S.hum * Math.sin(2 * Math.PI * 60 * t / 1000); }

  /* the neighbour muscle: a source at longitudinal offset S.xt and lateral
     offset QOFF, firing on its own clock */
  function xtAt(x, t) {
    if (!S.xt) return 0;
    var dx = x - (XE + S.xt);
    var r2 = QOFF * QOFF + dx * dx;
    var g = 1 / r2 * (QOFF * QOFF);           /* 1 at r = QOFF, falls as 1/r^2 */
    return 26 * g * muap((t - 20) / 1000, 0.009, 1);
  }

  /* q picks which components are included, so the readout can measure each
     contaminant's residual instead of asserting it */
  function trace(x, q) {
    q = q || { m: 1, h: 1, x: 1 };
    var n = TMAX * FSK + 1, y = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var t = i / FSK;
      y[i] = (q.m ? 100 * muap((t - arrive(x)) / 1000, 0.009, 1) : 0)
           + (q.h ? humAt(t) : 0)
           + (q.x ? xtAt(x, t) : 0);
    }
    return y;
  }

  /* ------------------------------- the fibre ----------------------------- */
  function drawFibre(x0, y0, w, h) {
    var c = ax.c, K = C();
    var pl = 34, pr = 34;
    var X = function (mm) { return x0 + pl + mm / L * (w - pl - pr); };
    var cy = y0 + h * 0.56;

    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .32; c.lineWidth = 22;
    c.lineCap = 'round'; c.beginPath();
    c.moveTo(X(0), cy); c.lineTo(X(L), cy); c.stroke(); c.restore();

    /* the travelling wave, drawn where it is now */
    var xc = S.cv * S.t;                     /* mm */
    c.save(); c.strokeStyle = K.GRN; c.lineWidth = 2.4; c.beginPath();
    for (var mm = Math.max(0, xc - 26); mm <= Math.min(L, xc + 26); mm += 0.5) {
      var v = muap((mm - xc) / S.cv / 1000, 0.009, 1);
      var px = X(mm), py = cy - v * 26;
      mm <= Math.max(0, xc - 26) + 1e-9 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    c.stroke(); c.restore();
    arrow(c, X(Math.min(L, xc + 20)), cy - 34, X(Math.min(L, xc + 36)), cy - 34,
          { color: K.GRN, width: 2, head: 8 });

    /* the electrodes */
    var es = S.mode === 'uni' ? [[x1(), K.BLUE, '1']] : [[x1(), K.BLUE, '1'], [x2(), K.VIO, '2']];
    es.forEach(function (e) {
      c.save(); c.fillStyle = e[1];
      c.fillRect(X(e[0]) - 7, cy - 17, 14, 34); c.restore();
      label(c, e[2], X(e[0]), cy - 27, { color: e[1], size: 11.5 });
    });
    if (S.mode === 'bi') {
      var mx = (X(x1()) + X(x2())) / 2;
      label(c, num(S.d, 0) + ' mm', mx, cy + 30, { color: K.MUT, size: 10.5, plate: true });
      c.save(); c.strokeStyle = K.MUT; c.lineWidth = 1; c.globalAlpha = .7;
      c.beginPath(); c.moveTo(X(x1()), cy + 22); c.lineTo(X(x2()), cy + 22); c.stroke(); c.restore();
    }
    if (S.xt) {
      var xx = X(XE + S.xt);
      c.save(); c.fillStyle = K.ACC; c.globalAlpha = .9;
      c.beginPath(); c.arc(xx, cy + 54, 6, 0, 7); c.fill(); c.restore();
      label(c, 'neighbouring muscle', xx, cy + 70, { color: K.ACC, size: 10.5, plate: true });
    }
    label(c, 'one muscle fibre', x0 + pl, y0 + 12, { color: K.MUT, size: 11, align: 'left' });
  }

  /* ------------------------------ the traces ----------------------------- */
  function drawTraces(x0, y0, w, h) {
    var c = ax.c, K = C();
    var pl = 150, pr = 22, pt = 6, pb = 36;
    var e1 = trace(x1()), e2 = S.mode === 'bi' ? trace(x2()) : null;
    var rows = S.mode === 'bi'
      ? [[e1, K.BLUE, 'electrode 1'], [e2, K.VIO, 'electrode 2'],
         [sub(e1, e2), K.ACC, 'amplifier out  (1 − 2)']]
      : [[e1, K.BLUE, 'electrode 1'], [null, null, null], [null, null, null]];
    var lanes = 3, lh = (h - pt - pb) / lanes;
    var sc = lh * 0.40 / 120;
    var n = e1.length;
    var X = function (i) { return x0 + pl + i / (n - 1) * (w - pl - pr); };

    rows.forEach(function (r, k) {
      if (!r[0]) return;
      var cy = y0 + pt + lh * (k + 0.5);
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x0 + pl, cy); c.lineTo(x0 + w - pr, cy); c.stroke(); c.restore();
      /* only up to 'now', so the trace is written as the wave goes past */
      var upto = Math.min(n - 1, Math.round(S.t * FSK));
      c.save(); c.strokeStyle = r[1]; c.lineWidth = 1.7; c.beginPath();
      for (var i = 0; i <= upto; i++) {
        var px = X(i), py = cy - r[0][i] * sc;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke(); c.restore();
      label(c, r[2], x0 + pl - 8, cy - lh * 0.30,
            { color: r[1], size: 11, align: 'right', weight: 700 });
    });

    /* the delay between the two readings */
    if (S.mode === 'bi') {
      var t1 = arrive(x1()), t2 = arrive(x2());
      var yTop = y0 + pt + 4;
      c.save(); c.strokeStyle = K.MUT; c.lineWidth = 1; c.setLineDash([3, 3]);
      [t1, t2].forEach(function (t) {
        c.beginPath();
        c.moveTo(X(t * FSK), yTop); c.lineTo(X(t * FSK), y0 + pt + lh * 2); c.stroke();
      });
      c.restore();
      arrow(c, X(t1 * FSK), yTop, X(t2 * FSK), yTop, { color: K.MUT, width: 1.4, head: 6 });
      label(c, 'τ = d/v = ' + fmt(S.d / S.cv, 2) + ' ms',
            (X(t1 * FSK) + X(t2 * FSK)) / 2, yTop - 9,
            { color: K.MUT, size: 10.5, plate: true });
    }

    [0, 10, 20, 30, 40].forEach(function (t) {
      label(c, String(t), X(t * FSK), y0 + h - pb + 13, { color: K.MUT, size: 10.5 });
    });
    label(c, 'time (ms)', x0 + pl + (w - pl - pr) / 2, y0 + h - 5,
          { color: K.MUT, size: 11 });
  }
  function sub(a, b) {
    var y = new Float64Array(a.length);
    for (var i = 0; i < a.length; i++) y[i] = a[i] - b[i];
    return y;
  }

  function draw() {
    ax.clear();
    var W = ax.W, H = ax.H;
    drawFibre(0, 0, W, H * 0.30);
    drawTraces(0, H * 0.30, W, H * 0.70);

    var e1 = trace(x1());
    var pk = function (y) { var m = 0; for (var i = 0; i < y.length; i++) m = Math.max(m, Math.abs(y[i])); return m; };
    if (S.mode === 'uni') {
      out.innerHTML =
        'One electrode. It records whatever changes the potential at that one point: the ' +
        'action potential as it goes past, <b>and</b> the ' + fmt(S.hum, 0) +
        ' µV of mains hum, <b>and</b> the neighbouring muscle. Peak-to-peak it is reading <b>' +
        fmt(pk(e1), 0) + ' µV</b>, and nothing in the trace says how much of that is muscle.';
    } else {
      /* each contaminant measured on its own, so the percentages in the
         readout are computed rather than asserted */
      function diffPeak(q) { return pk(sub(trace(x1(), q), trace(x2(), q))); }
      var muapOnly = diffPeak({ m: 1, h: 0, x: 0 });
      var humLeft  = diffPeak({ m: 0, h: 1, x: 0 });
      var xtDiff   = S.xt ? diffPeak({ m: 0, h: 0, x: 1 }) : 0;
      var xtRaw    = S.xt
        ? Math.max(pk(trace(x1(), { m: 0, h: 0, x: 1 })), pk(trace(x2(), { m: 0, h: 0, x: 1 })))
        : 0;
      out.innerHTML =
        'Two electrodes <b>' + fmt(S.d, 0) + ' mm</b> apart. The same wave reaches them <b>' +
        fmt(S.d / S.cv, 2) + ' ms</b> apart, so the two traces are the same shape at different ' +
        'times, and their difference is <b>biphasic</b> — that is the MUAP, <b>' +
        fmt(muapOnly, 0) + ' µV</b> peak to peak. ' +
        (S.hum
          ? 'The ' + fmt(S.hum, 0) + ' µV of hum is identical at both contacts, so the subtraction ' +
            'leaves <b>' + humLeft.toExponential(0) + ' µV</b> of it: exact cancellation. '
          : 'Turn up the mains hum: it is identical at both contacts, so it cancels exactly. ') +
        (S.xt
          ? 'The neighbouring muscle sits <b>' + fmt(Math.abs(S.xt), 0) +
            ' mm</b> off centre, so it is nearer one contact than the other and <b>' +
            fmt(xtDiff / Math.max(1e-9, xtRaw) * 100, 0) +
            ' %</b> of it survives — amplifier quality cannot touch that.'
          : 'Then move the neighbouring muscle off centre and watch what differencing cannot remove.');
    }
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  var sD = slider(g2, 'Spacing d', 5, 40, 1, S.d,
    function (v) { return fmt(v, 0) + ' mm'; }, function (v) { S.d = v; draw(); });
  var sV = slider(g2, 'Velocity v', 2, 6, 0.1, S.cv,
    function (v) { return fmt(v, 1) + ' m/s'; }, function (v) { S.cv = v; draw(); });
  var sH = slider(g2, 'Mains hum', 0, 120, 5, S.hum,
    function (v) { return fmt(v, 0) + ' µV'; }, function (v) { S.hum = v; draw(); });
  var sX = slider(g2, 'Neighbour', 0, 14, 1, S.xt,
    function (v) { return v ? fmt(v, 0) + ' mm' : 'none'; }, function (v) { S.xt = v; draw(); });
  sD.quiet(S.d); sV.quiet(S.cv); sH.quiet(S.hum); sX.quiet(S.xt);

  var row = ctlRow(u.ctl);
  keepOut(seg(row, [['uni', 'One electrode'], ['bi', 'Two electrodes']], S.mode,
    function (m) { S.mode = m; draw(); }));
  var play = playBtn(row, '▶ Send the potential');

  var raf = null, playing = false, last = 0;
  function stop() { playing = false; play.innerHTML = '▶ Send the potential'; if (raf) cancelAnimationFrame(raf); raf = null; }
  function tick(ts) {
    if (!playing) return;
    if (!last) last = ts;
    S.t = Math.min(TMAX, S.t + (ts - last) / 1000 * 11);
    last = ts; draw();
    if (S.t >= TMAX) { stop(); return; }
    raf = requestAnimationFrame(tick);
  }
  play.addEventListener('click', function () {
    if (playing) { stop(); return; }
    if (S.t >= TMAX) S.t = 0;
    playing = true; last = 0; play.innerHTML = '❚❚ Pause';
    raf = requestAnimationFrame(tick);
  });

  draw();
  window.addEventListener('ephe341-theme', draw);
});
/* ======================================================================
   2. RECRUIT — what one electrode sees as the effort rises

   His slides 9, 10 and 21 made live.  The pool is 120 motor units on the
   usual Fuglevand conventions:

     - recruitment thresholds spread exponentially over the pool, so most
       units are small and come in early;
     - twitch force spans 100:1 from the first unit to the last;
     - MUAP amplitude goes as sqrt(twitch force), because a bigger unit has
       more fibres but they are not all nearer the electrode;
     - firing rate climbs from 8 Hz at recruitment towards a peak that is
       lower for the big late units than the small early ones;
     - interspike intervals carry a deterministic jitter of CV 0.2, so the
       trains are not locked to one another.

   Fibre type is NOT imposed on top of that.  Units are typed by their
   position in the recruitment order (first half type I, next 35 % IIa, last
   15 % IIb), which is what his fibre-type table asserts -- recruitment order
   first, second, third -- so the type counts in the readout are a
   consequence of recruiting by size, not a second assumption.

   Checked (parts/selftest.js): equal independent trains give RMS growing as
   N^0.504, against 0.499 from the Python reference.
   ====================================================================== */
D.register('recruit', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { exc: 30, win: 500 };

  var NU = 120, FS = 2000;
  /* k is the exponent in MUAP amplitude ~ (twitch force)^k, and rr is the
     drive at which the last unit joins in.  Both are real modelling choices
     and both are discussed in the notes; neither is on a slider here,
     because this figure is about what the electrode sees, not about the
     shape of the EMG-force curve. */
  var KEXP = 0.5, RR = 85;

  var ax = new Axes(u.cv, { w: port ? 460 : 1090, h: port ? 540 : 372,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  var TYPE = [
    { name: 'type I', upto: 0.50 },
    { name: 'type IIa', upto: 0.85 },
    { name: 'type IIb', upto: 1.01 }
  ];
  function typeOf(i) {
    var f = i / (NU - 1);
    for (var t = 0; t < TYPE.length; t++) if (f < TYPE[t].upto) return t;
    return 2;
  }
  function tc(K, t) { return [K.BLUE, K.ORG, K.ACC][t]; }

  var POOL = (function () {
    var p = [], i;
    for (i = 0; i < NU; i++) {
      var f = i / (NU - 1);
      p.push({
        tf:   Math.exp(f * Math.log(70)) / 70,
        P:    Math.exp(f * Math.log(100)),
        peak: 40 - 15 * f,
        ph:   (i * 0.6180339887) % 1,
        ty:   typeOf(i)
      });
    }
    return p;
  })();

  function active(exc) {
    var e = exc / 100, out = [];
    for (var i = 0; i < NU; i++) {
      var th = POOL[i].tf * (RR / 100);
      if (th <= e) {
        var span = Math.max(1e-6, 1 - th);
        var r = 8 + (POOL[i].peak - 8) * Math.min(1, (e - th) / span);
        out.push({ i: i, u: POOL[i], rate: r });
      }
    }
    return out;
  }
  function ampOf(unit) { return Math.pow(unit.P, KEXP); }

  function signal(act, dur) {
    var n = Math.round(dur * FS), y = new Float64Array(n), i, k;
    var w = Math.round(0.012 * FS);
    for (k = 0; k < act.length; k++) {
      var a = act[k], isi = 1 / a.rate, sgn = (k % 2) ? 1 : -1;
      var jseed = (k * 2654435761) % 1013;
      for (var t = a.u.ph * isi; t < dur;
           t += isi * (1 + 0.2 * (((jseed = (jseed * 1103515245 + 12345) % 2147483648) / 2147483648) - 0.5) * 2)) {
        var i0 = Math.round(t * FS);
        for (i = Math.max(0, i0 - w); i < Math.min(n, i0 + w); i++)
          y[i] += muap((i - i0) / FS, 0.008, ampOf(a.u) * sgn);
      }
    }
    return y;
  }

  /* the loudest the pool ever gets, so the trace keeps one scale as the
     slider moves and growth is visible rather than normalised away */
  var YMAX = (function () {
    var y = signal(active(100), 1.0), m = 0;
    for (var i = 0; i < y.length; i++) m = Math.max(m, Math.abs(y[i]));
    return m * 1.03;
  })();

  /* ------------------------------------------------------------------
     The trace runs like a real recording: samples arrive at the right-hand
     edge and the record scrolls left, exactly the way a chart recorder or
     an oscilloscope in roll mode behaves.

     It is generated forward in time rather than rebuilt each frame.  Each
     unit carries its own next-spike time, so changing the effort slider
     mid-run brings units in and out of a recording that is already
     running, instead of restarting it.

     The buffer is 2w longer than the window on purpose.  A MUAP reaches w
     samples either side of its spike, so the generator runs a frontier w
     samples ahead of the displayed right edge; every spike it schedules
     can then write its whole waveform inside the buffer and nothing is
     clipped as it scrolls into view.
     ------------------------------------------------------------------ */
  var WS = Math.round(0.012 * FS);          /* MUAP half-width, samples */
  var BUF = null, NBUF = 0, NWIN = 0;
  var tFront = 0;                            /* absolute time at the frontier */
  var NXT = new Float64Array(NU);            /* next spike time per unit */
  var SEED = new Int32Array(NU);
  var LIVE = new Uint8Array(NU);

  function unitRate(i) {
    var e = S.exc / 100, th = POOL[i].tf * (RR / 100);
    if (th > e) return 0;
    var span = Math.max(1e-6, 1 - th);
    return 8 + (POOL[i].peak - 8) * Math.min(1, (e - th) / span);
  }
  function jitter(i) {
    SEED[i] = (SEED[i] * 1103515245 + 12345) % 2147483648;
    return 1 + 0.2 * ((SEED[i] / 2147483648) - 0.5) * 2;
  }

  /* advance the recording by dt seconds.  Long jumps are chunked, because
     one big shift would scroll whole spikes off the end before they were
     ever written and the record would come back mostly empty. */
  function step(dt) {
    var CH = 0.02;
    while (dt > CH) { stepOnce(CH); dt -= CH; }
    stepOnce(dt);
  }
  function stepOnce(dt) {
    var m = Math.round(dt * FS), i, k;
    if (m <= 0) return;
    if (m >= NBUF) { m = NBUF; BUF.fill(0); }
    else { BUF.copyWithin(0, m); BUF.fill(0, NBUF - m); }
    tFront += m / FS;
    var frontier = NBUF - 1 - WS;
    for (i = 0; i < NU; i++) {
      var r = unitRate(i);
      if (r <= 0) { LIVE[i] = 0; continue; }
      if (!LIVE[i]) {                        /* a unit joining mid-recording */
        LIVE[i] = 1;
        NXT[i] = tFront - POOL[i].ph / r;
      }
      var amp = ampOf(POOL[i]) * ((i % 2) ? 1 : -1);
      var guard = 0;
      while (NXT[i] <= tFront && guard++ < 400) {
        var c0 = frontier - Math.round((tFront - NXT[i]) * FS);
        if (c0 > 0) {
          var lo = Math.max(0, c0 - WS), hi = Math.min(NBUF, c0 + WS);
          for (k = lo; k < hi; k++) BUF[k] += muap((k - c0) / FS, 0.008, amp);
        }
        NXT[i] += (1 / r) * jitter(i);
      }
    }
  }

  /* (re)allocate for the current window length and run the recording in
     from cold, so a paused figure and the printed page both show a real
     stretch of signal rather than an empty box */
  function reset() {
    NWIN = Math.round(S.win / 1000 * FS);
    NBUF = NWIN + 2 * WS;
    BUF = new Float64Array(NBUF);
    tFront = 0;
    for (var i = 0; i < NU; i++) { LIVE[i] = 0; SEED[i] = (i * 2654435761) % 1013 + 1; }
    /* run the recording in from cold so a paused figure, and the printed
       page, show a real stretch of signal rather than an empty box */
    step(S.win / 1000 + 0.2);
  }

  /* ------------------------------ the pool strip ------------------------- */
  function drawPool(x0, y0, w, h, act) {
    var c = ax.c, K = C();
    var pl = 8, pr = 8, pt = 26, pb = 40;
    var on = {};
    act.forEach(function (a) { on[a.i] = a; });
    var bw = (w - pl - pr) / NU;
    var maxA = ampOf(POOL[NU - 1]);
    for (var i = 0; i < NU; i++) {
      var hh = (h - pt - pb) * (ampOf(POOL[i]) / maxA);
      var x = x0 + pl + i * bw;
      c.save();
      c.fillStyle = tc(K, POOL[i].ty);
      c.globalAlpha = on[i] ? 1 : 0.16;
      c.fillRect(x, y0 + h - pb - hh, Math.max(1, bw - 0.7), hh);
      c.restore();
    }
    /* where the recruitment front has reached */
    var nAct = act.length;
    if (nAct > 0 && nAct < NU) {
      var fx = x0 + pl + nAct * bw;
      c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.4; c.setLineDash([3, 3]);
      c.beginPath(); c.moveTo(fx, y0 + pt - 4); c.lineTo(fx, y0 + h - pb); c.stroke();
      c.restore();
    }
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + pl, y0 + h - pb + .5);
    c.lineTo(x0 + w - pr, y0 + h - pb + .5); c.stroke(); c.restore();

    label(c, 'the 120 motor units, smallest first', x0 + w / 2, y0 + 10,
          { color: K.MUT, size: 11 });
    label(c, 'bar height = how loud that unit is at the electrode',
          x0 + w / 2, y0 + h - pb + 16, { color: K.MUT, size: 10.5 });

    /* counts by type, drawn as a small tally under the strip */
    var cnt = [0, 0, 0], tot = [0, 0, 0];
    for (var j = 0; j < NU; j++) { tot[POOL[j].ty]++; if (on[j]) cnt[POOL[j].ty]++; }
    var tx = x0 + pl, ty = y0 + h - 8;
    c.save();
    c.font = '700 11.5px ui-sans-serif,system-ui,sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    var gap = (w - pl - pr) / 3;
    for (var t = 0; t < 3; t++) {
      c.fillStyle = tc(K, t);
      c.fillRect(tx + t * gap, ty - 5, 10, 10);
      c.fillStyle = K.INK;
      c.fillText(cnt[t] + ' of ' + tot[t] + '  ' + TYPE[t].name, tx + t * gap + 15, ty);
    }
    c.restore();
    return cnt;
  }

  /* ------------------------------- the trace ----------------------------- */
  function drawTrace(x0, y0, w, h, y) {
    var c = ax.c, K = C();
    var pl = 14, pr = 14, pt = 26, pb = 40;
    var n = y.length;
    var cy = y0 + pt + (h - pt - pb) / 2, sc = (h - pt - pb) / 2;
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0 + pl, cy); c.lineTo(x0 + w - pr, cy); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 1.05; c.beginPath();
    for (var i = 0; i < n; i++) {
      var px = x0 + pl + i / (n - 1) * (w - pl - pr);
      var py = cy - y[i] / YMAX * sc;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke(); c.restore();
    label(c, 'what the electrode records', x0 + w / 2, y0 + 10,
          { color: K.MUT, size: 11 });
    label(c, fmt(S.win, 0) + ' ms', x0 + w / 2, y0 + h - pb + 16,
          { color: K.MUT, size: 10.5 });
  }

  function draw() {
    ax.clear();
    var W = ax.W, H = ax.H;
    var act = active(S.exc);
    var y = BUF.subarray(0, NWIN);
    var cnt;
    if (port) {
      cnt = drawPool(0, 0, W, H * 0.46, act);
      drawTrace(0, H * 0.46, W, H * 0.54, y);
    } else {
      cnt = drawPool(0, 0, W * 0.44, H, act);
      drawTrace(W * 0.44, 0, W * 0.56, H, y);
    }
    var peak = 0;
    for (var i = 0; i < y.length; i++) peak = Math.max(peak, Math.abs(y[i]));
    out.innerHTML =
      'At <b>' + fmt(S.exc, 0) + ' %</b> effort, <b>' + act.length + '</b> of ' + NU +
      ' units are active — <b>' + cnt[0] + '</b> type I, <b>' + cnt[1] + '</b> type IIa, <b>' +
      cnt[2] + '</b> type IIb — firing between <b>8</b> and <b>' +
      fmt(Math.max.apply(null, act.length ? act.map(function (a) { return a.rate; }) : [0]), 0) +
      ' Hz</b>. The trace is at <b>' + fmt(peak / YMAX * 100, 0) +
      ' %</b> of the amplitude this pool ever reaches. ' +
      (act.length <= 14
        ? 'Few enough units that you can still pick out individual motor unit action potentials.'
        : 'Too many overlapping units to count anything: this is an <b>interference pattern</b>.');
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  var sE = slider(g2, 'Effort', 1, 100, 1, S.exc,
    function (v) { return fmt(v, 0) + ' %'; },
    function (v) { S.exc = v; if (!playing) { step(0.12); } draw(); });
  var sW = slider(g2, 'Window', 50, 500, 25, S.win,
    function (v) { return fmt(v, 0) + ' ms'; }, function (v) { S.win = v; reset(); draw(); });
  sE.quiet(S.exc); sW.quiet(S.win);

  var row = ctlRow(u.ctl);
  var play = playBtn(row, '▶ Record');
  var raf = null, playing = false, last = 0;
  function stop() {
    playing = false; play.innerHTML = '▶ Record';
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }
  function tick(ts) {
    if (!playing) return;
    if (!last) last = ts;
    /* real time, but capped so a backgrounded tab does not return and
       generate several seconds of signal in one frame */
    step(Math.min(0.08, (ts - last) / 1000));
    last = ts;
    draw();
    raf = requestAnimationFrame(tick);
  }
  play.addEventListener('click', function () {
    if (playing) { stop(); return; }
    playing = true; last = 0; play.innerHTML = '❚❚ Pause';
    raf = requestAnimationFrame(tick);
  });

  reset();
  draw();
  window.addEventListener('ephe341-theme', draw);
});
/* ======================================================================
   3. CHAIN — the processing steps, on a real recording

   His slides 41-45, driven by two seconds of vastus lateralis recorded at
   2222 Hz during steady cycling (Cartier et al., P01, L_Free_P2).  Nothing
   here is synthetic: the raw trace is the measured one, and each stage is
   applied to it live.

   The point the slides cannot make on paper is what the choices COST.
   A longer RMS window is smoother and later; a single-pass filter is
   smooth and WRONG, because it delays the envelope relative to the signal
   that produced it.  filtfilt does not, and the widget measures both.
   ====================================================================== */
D.register('chain', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { stage: 'env', win: 100, fc: 3, zero: true };

  var ax = new Axes(u.cv, { w: port ? 460 : 1100, h: port ? 500 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  var SRC = (EMG14.chain || { fs: 2222.22, uv: [] });
  var FS = SRC.fs;
  var RAW = Float64Array.from(SRC.uv || []);
  var BP = RAW.length ? bandpass(RAW, FS, 20, 450) : RAW;
  var REC = rectify(BP);

  var cache = {};
  function envelope() {
    var k = S.fc + ':' + (S.zero ? 1 : 0);
    if (!cache[k]) cache[k] = lowpass(REC, FS, S.fc, S.zero);
    return cache[k];
  }
  var rcache = {};
  function rmsTrace() {
    if (!rcache[S.win]) rcache[S.win] = movingRMS(BP, FS, S.win);
    return rcache[S.win];
  }

  function plot(x0, y0, w, h, series, ttl) {
    var c = ax.c, K = C();
    var pl = 54, pr = 14, pt = 20, pb = 30;
    var n = RAW.length, mx = 0, i, k;
    for (k = 0; k < series.length; k++)
      for (i = 0; i < n; i++) mx = Math.max(mx, Math.abs(series[k][0][i]));
    mx = (mx || 1) * 1.08;            /* headroom: the peak was touching the title */
    var sym = series.some(function (s) { return s[2] === 'sym'; });
    var cy = sym ? y0 + pt + (h - pt - pb) / 2 : y0 + h - pb;
    var sc = sym ? (h - pt - pb) / 2 : (h - pt - pb);
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + pl, y0 + pt); c.lineTo(x0 + pl, y0 + h - pb);
    c.lineTo(x0 + w - pr, y0 + h - pb); c.stroke(); c.restore();
    /* the unit rides on the top tick: stacking it above crowds the corner */
    [sym ? -mx : 0, mx].forEach(function (v) {
      label(c, fmt(v, 0) + (v === mx ? ' µV' : ''), x0 + pl - 7, cy - v / mx * sc,
            { color: K.MUT, size: 10.5, align: 'right' });
    });
    series.forEach(function (sr) {
      c.save(); c.strokeStyle = sr[1]; c.lineWidth = sr[3] || 1.1; c.beginPath();
      for (var i2 = 0; i2 < n; i2++) {
        var px = x0 + pl + i2 / (n - 1) * (w - pl - pr);
        var py = cy - sr[0][i2] / mx * sc;
        i2 ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke(); c.restore();
    });
    [0, 0.5, 1, 1.5, 2].forEach(function (t) {
      label(c, fmt(t, 1), x0 + pl + t / (n / FS) * (w - pl - pr), y0 + h - pb + 12,
            { color: K.MUT, size: 10.5 });
    });
    label(c, ttl, x0 + pl + 6, y0 + pt + 2, { color: K.INK, size: 12, align: 'left', plate: true });
    label(c, 'time (s)', x0 + pl + (w - pl - pr) / 2, y0 + h - 8, { color: K.MUT, size: 11 });
  }

  function draw() {
    var W = ax.W, H = ax.H, K = C();
    ax.clear();
    if (!RAW.length) { label(ax.c, 'no data', W / 2, H / 2, { color: C().MUT }); return; }
    var rows, note = '';
    if (S.stage === 'raw') {
      rows = [[[RAW, K.MUT, 'sym', 0.9], 'raw, straight off the electrode'],
              [[BP, K.BLUE, 'sym', 0.9], 'band-pass 20–450 Hz']];
    } else if (S.stage === 'rect') {
      rows = [[[BP, K.BLUE, 'sym', 0.9], 'band-pass 20–450 Hz'],
              [[REC, K.VIO, 'pos', 0.9], 'full-wave rectified,  |EMG|']];
    } else if (S.stage === 'rms') {
      rows = [[[REC, K.VIO, 'pos', 0.8], 'rectified'],
              [[rmsTrace(), K.ACC, 'pos', 2.4], 'moving RMS, ' + fmt(S.win, 0) + ' ms window']];
    } else {
      rows = [[[REC, K.VIO, 'pos', 0.8], 'rectified'],
              [[envelope(), K.ACC, 'pos', 2.4],
               'linear envelope, 2nd-order Butterworth at ' + fmt(S.fc, 1) + ' Hz' +
               (S.zero ? ' (zero-phase)' : ' (single pass)')]];
    }
    var lh = H / rows.length;
    rows.forEach(function (r, i) {
      plot(0, i * lh, W, lh, [r[0]], r[1]);
    });

    if (S.stage === 'env') {
      /* measure the lag the single-pass filter actually introduces, rather
         than asserting that there is one */
      var e = envelope(), ref = cache[S.fc + ':1'] || lowpass(REC, FS, S.fc, true);
      var best = 0, bv = -Infinity;
      for (var L = -Math.round(0.4 * FS); L <= Math.round(0.4 * FS); L += 2) {
        var acc = 0;
        for (var i2 = Math.round(0.3 * FS); i2 < RAW.length - Math.round(0.3 * FS); i2 += 4) {
          var j = i2 + L; if (j < 0 || j >= RAW.length) continue;
          acc += ref[i2] * e[j];
        }
        if (acc > bv) { bv = acc; best = L; }
      }
      note = S.zero
        ? ' Filtering forwards and backwards (<b>filtfilt</b>) leaves the envelope in time with the burst that made it.'
        : ' Filtering once, forwards only, pushes the envelope <b>' +
          fmt(Math.abs(best) / FS * 1000, 0) + ' ms</b> late — a delay you would then ' +
          'mistake for electromechanical delay.';
    }
    var head = {
      raw:  'Raw surface EMG from <b>vastus lateralis</b> during steady cycling, 2222 Hz. ' +
            'The band-pass keeps 20–450 Hz: below 20 Hz is movement and cable artefact, ' +
            'above 450 Hz there is almost no muscle signal left to keep.',
      rect: 'Rectifying throws away the sign. It has to: the raw signal averages to <b>zero</b> ' +
            'by construction, so its mean carries no information about how hard the muscle is working.',
      rms:  'RMS over a window is the honest average of a zero-mean signal. A longer window is ' +
            'smoother but blurs the edges of the burst — timing and smoothness are traded against ' +
            'each other, and there is no setting that gives both.',
      env:  'A low-pass filter on the rectified signal gives the <b>linear envelope</b>.'
    }[S.stage];
    out.innerHTML = head + note;
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  slider(g2, 'RMS window', 20, 400, 10, S.win,
    function (v) { return fmt(v, 0) + ' ms'; },
    function (v) { S.win = v; if (S.stage !== 'rms') { S.stage = 'rms'; stageRow(); } draw(); });
  slider(g2, 'Envelope cutoff', 1, 10, 0.5, S.fc,
    function (v) { return fmt(v, 1) + ' Hz'; },
    function (v) { S.fc = v; if (S.stage !== 'env') { S.stage = 'env'; stageRow(); } draw(); });

  var row = ctlRow(u.ctl);
  var chipRow = keepOut(chips(row, [['raw', 'Raw → band-pass'], ['rect', 'Rectify'],
                                    ['rms', 'RMS'], ['env', 'Linear envelope']],
    S.stage, function (k) { S.stage = k; draw(); }));
  function stageRow() {
    Array.prototype.forEach.call(chipRow.children, function (b) {
      b.classList.toggle('on', b.textContent.toLowerCase().indexOf(
        { raw: 'raw', rect: 'rectify', rms: 'rms', env: 'envelope' }[S.stage]) >= 0);
    });
  }
  var zb = el('button', 'icalc-chip on'); zb.textContent = 'Zero-phase';
  zb.setAttribute('data-unsafe', '1');
  zb.addEventListener('click', function () {
    S.zero = !S.zero; zb.classList.toggle('on', S.zero);
    S.stage = 'env'; stageRow(); draw();
  });
  chipRow.appendChild(zb);

  draw();
  window.addEventListener('ephe341-theme', draw);
});
/* ======================================================================
   4. FATIGUE — what the Wingate actually shows

   His slides 50-51 state the textbook pair: amplitude rises, median
   frequency falls.  This figure puts the measured data next to that claim.

   Source: Cartier et al., six participants, vastus lateralis, 30 s taken
   from the STEADY part of a free-cadence leg-cycling trial at about 160 W
   and 85 rpm.  This is NOT a fatiguing protocol -- nobody was taken to
   failure -- and the figure is on the slide for exactly that reason.
   Median frequency and RMS are computed PER BURST, over the active part of
   each pedal revolution, because a whole-second window during cycling is
   mostly silence and silence has a spectrum of its own.

   What comes out is drift with correlations of 0.33 and below.  That is
   what a slope fitted to thirty unfatiguing seconds looks like, and saying
   so is more useful to the class than a tidy result would have been.

   The raw panel is the same channel at two moments 29 s apart in the same
   ride, so the class can see that nothing much has happened to it.
   ====================================================================== */
D.register('fatigue', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var FAT = (EMG14.fatigue || { rows: {} });
  var PS = Object.keys(FAT.rows || {}).sort();
  var S = { p: PS[0] || 'P01', show: 'mf' };

  var ax = new Axes(u.cv, { w: port ? 460 : 1100, h: port ? 500 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  function fit(rows, col) {
    var n = rows.length, sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0, i;
    for (i = 0; i < n; i++) { sx += rows[i][0]; sy += rows[i][col]; }
    var mx = sx / n, my = sy / n;
    for (i = 0; i < n; i++) {
      sxy += (rows[i][0] - mx) * (rows[i][col] - my);
      sxx += (rows[i][0] - mx) * (rows[i][0] - mx);
      syy += (rows[i][col] - my) * (rows[i][col] - my);
    }
    return { slope: sxy / sxx, b: my - (sxy / sxx) * mx,
             r: sxy / Math.sqrt(sxx * syy) };
  }

  function scatter(x0, y0, w, h, rows, col, colour, ttl, unit) {
    var c = ax.c, K = C();
    var pl = 58, pr = 16, pt = 24, pb = 32;
    var lo = Infinity, hi = -Infinity, i;
    for (i = 0; i < rows.length; i++) { lo = Math.min(lo, rows[i][col]); hi = Math.max(hi, rows[i][col]); }
    var pad = (hi - lo) * 0.18 || 1; lo -= pad; hi += pad;
    var X = function (t) { return x0 + pl + t / 30 * (w - pl - pr); };
    var Y = function (v) { return y0 + h - pb - (v - lo) / (hi - lo) * (h - pt - pb); };
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + pl, y0 + pt); c.lineTo(x0 + pl, y0 + h - pb);
    c.lineTo(x0 + w - pr, y0 + h - pb); c.stroke(); c.restore();
    axisTicks(lo, hi).forEach(function (v) {
      if (v < lo || v > hi) return;
      label(c, fmt(v, 0), x0 + pl - 7, Y(v), { color: K.MUT, size: 10.5, align: 'right' });
    });
    [0, 10, 20, 30].forEach(function (t) {
      label(c, String(t), X(t), y0 + h - pb + 12, { color: K.MUT, size: 10.5 });
    });
    c.save(); c.fillStyle = colour; c.globalAlpha = .75;
    rows.forEach(function (r) { c.beginPath(); c.arc(X(r[0]), Y(r[col]), 3.2, 0, 7); c.fill(); });
    c.restore();
    var f = fit(rows, col);
    c.save(); c.strokeStyle = colour; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(X(0), Y(f.b)); c.lineTo(X(30), Y(f.b + f.slope * 30)); c.stroke(); c.restore();
    label(c, ttl, x0 + pl + 6, y0 + pt - 8, { color: K.INK, size: 12, align: 'left' });
    label(c, (f.slope >= 0 ? '+' : '−') + fmt(Math.abs(f.slope), 2) + ' ' + unit +
             '/s    r = ' + num(f.r, 2),
          x0 + w - pr - 6, y0 + pt - 8, { color: colour, size: 12, align: 'right' });
    label(c, 'time through the 30 s (s)', x0 + pl + (w - pl - pr) / 2, y0 + h - 8,
          { color: K.MUT, size: 11 });
    return f;
  }

  function summary(x0, y0, w, h) {
    var c = ax.c, K = C();
    var pl = 46, pr = 18, pt = 26, pb = 34;
    var slopes = PS.map(function (p) { return { p: p, mf: fit(FAT.rows[p], 1).slope,
                                                rm: fit(FAT.rows[p], 2).slope }; });
    var mx = 0; slopes.forEach(function (s2) { mx = Math.max(mx, Math.abs(s2.mf)); });
    mx = Math.max(mx, 0.8) * 1.25;
    var Y = function (v) { return y0 + pt + (h - pt - pb) / 2 - v / mx * ((h - pt - pb) / 2); };
    var bw = (w - pl - pr) / PS.length;
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + pl, Y(0)); c.lineTo(x0 + w - pr, Y(0)); c.stroke(); c.restore();
    label(c, '0', x0 + pl - 7, Y(0), { color: K.MUT, size: 10.5, align: 'right' });
    [-0.5, 0.5].forEach(function (v) {
      label(c, num(v, 1), x0 + pl - 7, Y(v), { color: K.MUT, size: 10.5, align: 'right' });
    });
    slopes.forEach(function (s2, i) {
      var cx = x0 + pl + bw * (i + 0.5);
      var col = s2.mf < 0 ? K.ACC : K.BLUE;
      c.save(); c.fillStyle = col; c.globalAlpha = s2.p === S.p ? 1 : .45;
      var yy = Y(s2.mf);
      c.fillRect(cx - bw * 0.26, Math.min(yy, Y(0)), bw * 0.52, Math.abs(yy - Y(0)));
      c.restore();
      label(c, s2.p, cx, y0 + h - pb + 13, { color: s2.p === S.p ? K.INK : K.MUT, size: 10.5 });
    });
    var neg = slopes.filter(function (s2) { return s2.mf < 0; }).length;
    var up  = slopes.filter(function (s2) { return s2.rm > 0; }).length;
    label(c, 'median-frequency slope, Hz/s', x0 + pl + 4, y0 + pt - 10,
          { color: K.MUT, size: 11, align: 'left' });
    label(c, 'falls in ' + neg + ' of ' + PS.length + '    amplitude rises in ' + up +
             ' of ' + PS.length,
          x0 + pl + (w - pl - pr) / 2, y0 + h - 8, { color: K.INK, size: 11.5 });
    return { neg: neg, up: up, n: PS.length };
  }

  /* the raw signal behind the dots: the same channel at two moments 29 s
     apart in the same ride, drawn on ONE scale so they can be compared */
  var CH = EMG14.chain || null;
  function drawRaw(x0, y0, w, h) {
    var c = ax.c, K = C();
    if (!CH || !CH.late) return;
    var pl = 52, pr = 14, pt = 20, pb = 26;
    var pairs = [['at ' + fmt(CH.t0, 0) + ' s', CH.uv, K.BLUE],
                 ['at ' + fmt(CH.late.t0, 0) + ' s', CH.late.uv, K.VIO]];
    var mx = 0, i, k;
    for (k = 0; k < pairs.length; k++)
      for (i = 0; i < pairs[k][1].length; i++) mx = Math.max(mx, Math.abs(pairs[k][1][i]));
    mx *= 1.04;
    var lh = (h - pt - pb) / 2;
    pairs.forEach(function (q, j) {
      var cy = y0 + pt + lh * (j + 0.5), y = q[1], n = y.length;
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x0 + pl, cy); c.lineTo(x0 + w - pr, cy); c.stroke(); c.restore();
      c.save(); c.strokeStyle = q[2]; c.lineWidth = 0.9; c.beginPath();
      for (var i2 = 0; i2 < n; i2++) {
        var px = x0 + pl + i2 / (n - 1) * (w - pl - pr);
        var py = cy - y[i2] / mx * (lh * 0.46);
        i2 ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke(); c.restore();
      var r = rms(y);
      label(c, q[0], x0 + pl - 7, cy - lh * 0.30,
            { color: q[2], size: 10.5, align: 'right', weight: 700 });
      label(c, fmt(r, 0) + ' µV rms', x0 + w - pr - 4, cy - lh * 0.30,
            { color: K.MUT, size: 10.5, align: 'right', plate: true });
    });
    label(c, 'P01 raw vastus lateralis, 2 s each, same ride',
          x0 + pl + 4, y0 + pt - 9, { color: K.MUT, size: 11, align: 'left' });
    label(c, '±' + fmt(mx, 0) + ' µV full scale', x0 + pl + (w - pl - pr) / 2, y0 + h - 8,
          { color: K.MUT, size: 10.5 });
  }

  function draw() {
    var W = ax.W, H = ax.H, K = C();
    ax.clear();
    var rows = FAT.rows[S.p] || [];
    if (!rows.length) { label(ax.c, 'no data', W / 2, H / 2, { color: K.MUT }); return; }
    var fmf, frm, sum;
    if (port) {
      drawRaw(0, 0, W, H * 0.22);
      fmf = scatter(0, H * 0.22, W, H * 0.28, rows, 1, K.ACC, S.p + ' · median frequency', 'Hz');
      frm = scatter(0, H * 0.50, W, H * 0.26, rows, 2, K.VIO, S.p + ' · RMS amplitude', 'µV');
      sum = summary(0, H * 0.76, W, H * 0.24);
    } else {
      drawRaw(0, 0, W * 0.40, H * 0.52);
      fmf = scatter(0, H * 0.52, W * 0.40, H * 0.48, rows, 1, K.ACC, S.p + ' · median frequency', 'Hz');
      frm = scatter(W * 0.40, 0, W * 0.34, H, rows, 2, K.VIO, S.p + ' · RMS amplitude', 'µV');
      sum = summary(W * 0.74, 0, W * 0.26, H);
    }
    out.innerHTML = 'Vastus lateralis through 30 s of <b>steady</b> cycling at about 160 W, ' +
      'one point per pedal revolution — no fatiguing protocol. For <b>' + S.p +
      '</b> the median frequency drifts ' +
      (fmf.slope < 0 ? '<b>down</b> ' : '<b>up</b> ') + fmt(Math.abs(fmf.slope) * 30, 0) +
      ' Hz over the 30 s (r = ' + num(fmf.r, 2) + ') and amplitude drifts ' +
      (frm.slope > 0 ? '<b>up</b>' : '<b>down</b>') + ' (r = ' + num(frm.r, 2) + '). ' +
      'Across all ' + sum.n + ' participants amplitude drifts up in <b>' + sum.up +
      '</b> and median frequency down in <b>' + sum.neg + '</b> — but look at the ' +
      'correlations before believing any of it. ' +
      'That is the lesson: a slope fitted to a short record returns a number whatever the ' +
      'physiology is doing. Report the correlation with the slope, and say what the protocol was.';
  }

  var out = readout(u.ctl);
  var row = ctlRow(u.ctl);
  keepOut(chips(row, PS.map(function (p) { return [p, p]; }), S.p,
    function (k) { S.p = k; draw(); }));
  draw();
  window.addEventListener('ephe341-theme', draw);
});
/* ======================================================================
   5. PLACE — where the pair goes, and what it costs you

   His slides 35 and 36.  An eight-contact array lies along the muscle; pick
   any two contacts and the figure shows what that pair would record and
   what its spectrum looks like.

   The signal is built, not drawn.  Forty fibres, each with its own end-plate
   position scattered about the innervation zone and its own firing times.
   A fibre's potential reaches a contact at

       t_fire + |x_contact - x_endplate| / cv

   travelling in BOTH directions from the end plate, and dies over the last
   8 mm before the tendon because there is no more fibre to carry it.  Each
   contact's trace is built once; a pair is then just a subtraction, which
   is exactly what the differential amplifier does.

   Everything the slide claims falls out of that and is measured in the
   readout rather than asserted:

     - a pair on the belly, both contacts one side of the end plate, is a
       broad stable plateau;
     - a pair straddling the end plate sees mirror images and cancels;
     - a contact on the tendon records almost nothing;
     - widening the spacing raises amplitude but drags the comb notch
       (first zero at cv/d) down into the EMG band.
   ====================================================================== */
D.register('place', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { a: 4, b: 5, cv: 4 };

  var NC = 8;                     /* contacts */
  var L = 160;                    /* mm, tendon to tendon */
  var IZ = 80;                    /* mm: the centre of the innervation zone */
  var C0 = 10, CSP = 20;          /* the array runs onto the tendon at both ends */
  var FS = 2000, DUR = 0.4;
  var NF = 40;

  var ax = new Axes(u.cv, { w: port ? 460 : 1090, h: port ? 560 : 392,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  function cx(i) { return C0 + i * CSP; }

  /* --- the fibres: end plate scattered about IZ, deterministic -------- */
  var FIB = (function () {
    var f = [], seed = 12345, i;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    for (i = 0; i < NF; i++) {
      var fires = [], t = rnd() * 0.05;
      while (t < DUR) { fires.push(t); t += 0.055 + 0.03 * rnd(); }
      /* the end plates of a real muscle are scattered over a few millimetres,
         not one line; 3 mm is the usual figure and it is what decides how
         completely a straddling pair cancels */
      f.push({ iz: IZ + (rnd() - 0.5) * 3, amp: 0.55 + rnd() * 0.9, fires: fires });
    }
    return f;
  })();

  /* nothing travels along tendon, and the muscle thins towards it, so the
     signal is dead within 6 mm of the end and back to full by 32 mm */
  function fade(x) {
    var e = Math.min(x, L - x);
    return Math.max(0, Math.min(1, (e - 25) / 18));
  }

  var CH = null, chKey = null;
  function channels() {
    var kk = fmt(S.cv, 2);
    if (chKey === kk) return CH;
    var n = Math.round(DUR * FS), j, k, f, i;
    var out = [];
    for (j = 0; j < NC; j++) out.push(new Float64Array(n));
    var w = Math.round(0.012 * FS);
    for (k = 0; k < FIB.length; k++) {
      f = FIB[k];
      for (j = 0; j < NC; j++) {
        var x = cx(j);
        var g = fade(x) * f.amp;
        if (g <= 0) continue;
        var lag = Math.abs(x - f.iz) / S.cv / 1000;      /* mm / (m/s) -> s */
        for (var q = 0; q < f.fires.length; q++) {
          var i0 = Math.round((f.fires[q] + lag) * FS);
          for (i = Math.max(0, i0 - w); i < Math.min(n, i0 + w); i++)
            out[j][i] += muap((i - i0) / FS, 0.009, g);
        }
      }
    }
    CH = out; chKey = kk;
    return CH;
  }

  function pairSignal() {
    var ch = channels(), a = ch[S.a], b = ch[S.b];
    var y = new Float64Array(a.length);
    for (var i = 0; i < a.length; i++) y[i] = a[i] - b[i];
    return y;
  }

  /* ----------------------------- the muscle ------------------------------ */
  function drawMuscle(x0, y0, w, h) {
    var c = ax.c, K = C();
    var pt = 26, pb = 26;
    var Y = function (mm) { return y0 + pt + mm / L * (h - pt - pb); };
    var mx = x0 + w * 0.60;

    /* belly: widest in the middle, tapering to the tendons */
    c.save();
    c.fillStyle = K.ACC; c.globalAlpha = .16;
    c.beginPath();
    for (var mm = 0; mm <= L; mm += 2) {
      var r = 10 + 26 * Math.sin(Math.PI * mm / L);
      c.lineTo(mx + r, Y(mm));
    }
    for (var m2 = L; m2 >= 0; m2 -= 2) {
      var r2 = 10 + 26 * Math.sin(Math.PI * m2 / L);
      c.lineTo(mx - r2, Y(m2));
    }
    c.closePath(); c.fill(); c.restore();

    /* the innervation zone */
    c.save(); c.strokeStyle = K.GRN; c.lineWidth = 2.4; c.setLineDash([5, 3]);
    c.beginPath(); c.moveTo(mx - 44, Y(IZ)); c.lineTo(mx + 44, Y(IZ)); c.stroke(); c.restore();
    label(c, 'innervation zone', mx - 50, Y(IZ),
          { color: K.GRN, size: 10.5, align: 'right', plate: true });

    label(c, 'tendon', mx, y0 + 11, { color: K.MUT, size: 10.5 });
    label(c, 'tendon', mx, y0 + h - 12, { color: K.MUT, size: 10.5 });

    /* the array */
    for (var j = 0; j < NC; j++) {
      var sel = (j === S.a) || (j === S.b);
      var col = j === S.a ? K.BLUE : (j === S.b ? K.VIO : K.MUT);
      c.save();
      c.fillStyle = col; c.globalAlpha = sel ? 1 : .32;
      c.fillRect(mx - 15, Y(cx(j)) - 4.5, 30, 9);
      c.restore();
      label(c, String(j + 1), mx + 30, Y(cx(j)),
            { color: col, size: 10.5, align: 'left', weight: sel ? 700 : 500 });
    }
    label(c, 'eight contacts, 20 mm apart', mx, y0 + h - 40,
          { color: K.MUT, size: 10.5 });
  }

  /* ------------------------- trace and spectrum -------------------------- */
  function drawTrace(x0, y0, w, h, y) {
    var c = ax.c, K = C();
    var pl = 42, pr = 16, pt = 22, pb = 30;
    var n = y.length, cy = y0 + pt + (h - pt - pb) / 2;
    var sc = (h - pt - pb) / 2 / YMAX;
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + pl, y0 + pt); c.lineTo(x0 + pl, y0 + h - pb); c.stroke();
    c.restore();
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0 + pl, cy); c.lineTo(x0 + w - pr, cy); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.05; c.beginPath();
    for (var i = 0; i < n; i++) {
      var px = x0 + pl + i / (n - 1) * (w - pl - pr), py = cy - y[i] * sc;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke(); c.restore();
    label(c, 'what contacts ' + (S.a + 1) + ' − ' + (S.b + 1) + ' record',
          x0 + pl + 4, y0 + pt - 10, { color: K.MUT, size: 11, align: 'left' });
    label(c, fmt(DUR * 1000, 0) + ' ms', x0 + pl + (w - pl - pr) / 2, y0 + h - 10,
          { color: K.MUT, size: 10.5 });
  }

  function drawSpec(x0, y0, w, h, y) {
    var c = ax.c, K = C();
    var pl = 42, pr = 16, pt = 22, pb = 34;
    var s = spectrum(y, FS);
    var FMAXP = 500;
    var mx = 0, i;
    for (i = 0; i < s.f.length; i++) if (s.f[i] <= FMAXP) mx = Math.max(mx, s.P[i]);
    mx = Math.max(mx, 1e-12);
    var X = function (f) { return x0 + pl + f / FMAXP * (w - pl - pr); };
    var Y = function (p) { return y0 + h - pb - p / mx * (h - pt - pb); };
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + pl, y0 + pt); c.lineTo(x0 + pl, y0 + h - pb);
    c.lineTo(x0 + w - pr, y0 + h - pb); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.BLUE; c.globalAlpha = .40; c.beginPath();
    c.moveTo(X(0), Y(0));
    for (i = 0; i < s.f.length && s.f[i] <= FMAXP; i++) c.lineTo(X(s.f[i]), Y(s.P[i]));
    c.lineTo(X(FMAXP), Y(0)); c.closePath(); c.fill(); c.restore();

    var mf = medianFreq(y, FS, 10, FMAXP);
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.8; c.setLineDash([4, 3]);
    c.beginPath(); c.moveTo(X(mf), y0 + pt); c.lineTo(X(mf), y0 + h - pb); c.stroke(); c.restore();
    label(c, 'median ' + fmt(mf, 0) + ' Hz', X(mf) + 6, y0 + pt + 8,
          { color: K.ACC, size: 10.5, align: 'left', plate: true });

    [0, 100, 200, 300, 400, 500].forEach(function (f) {
      label(c, String(f), X(f), y0 + h - pb + 12, { color: K.MUT, size: 10 });
    });
    label(c, 'frequency (Hz)', x0 + pl + (w - pl - pr) / 2, y0 + h - 7,
          { color: K.MUT, size: 11 });
    label(c, 'power', x0 + pl + 4, y0 + pt - 10, { color: K.MUT, size: 11, align: 'left' });
    return mf;
  }

  /* one scale for the trace, so moving the pair changes what you SEE */
  var YMAX = (function () {
    var ch = channels(), m = 0, i, j, k;
    for (j = 0; j < NC; j++) for (k = j + 1; k < NC; k++)
      for (i = 0; i < ch[j].length; i++) m = Math.max(m, Math.abs(ch[j][i] - ch[k][i]));
    return m * 1.04;
  })();

  function draw() {
    ax.clear();
    var W = ax.W, H = ax.H;
    var y = pairSignal(), mf;
    if (port) {
      drawMuscle(0, 0, W * 0.34, H * 0.46);
      drawTrace(W * 0.34, 0, W * 0.66, H * 0.46, y);
      mf = drawSpec(0, H * 0.46, W, H * 0.54, y);
    } else {
      drawMuscle(0, 0, W * 0.34, H);
      drawTrace(W * 0.34, 0, W * 0.66, H * 0.52, y);
      mf = drawSpec(W * 0.34, H * 0.52, W * 0.66, H * 0.48, y);
    }

    var r = rms(y), spacing = Math.abs(cx(S.b) - cx(S.a));
    var mid = (cx(S.a) + cx(S.b)) / 2;
    var straddles = (cx(S.a) - IZ) * (cx(S.b) - IZ) < 0;
    var onTendon = fade(cx(S.a)) < 0.35 || fade(cx(S.b)) < 0.35;
    var best = 0;
    (function () {
      /* the best pair anywhere on this muscle, so 'per cent of best' means
         something rather than being a free parameter */
      var ch = channels(), i, j, k;
      for (j = 0; j < NC; j++) for (k = 0; k < NC; k++) {
        if (j === k) continue;
        var t = new Float64Array(ch[j].length);
        for (i = 0; i < t.length; i++) t[i] = ch[j][i] - ch[k][i];
        best = Math.max(best, rms(t));
      }
    })();

    var note;
    if (straddles) {
      note = 'This pair <b>straddles the innervation zone</b>. The two contacts see mirror ' +
        'images of the same waves, so the difference collapses — and the amplitude here changes ' +
        'enormously for a few millimetres of movement, which makes any comparison meaningless.';
    } else if (onTendon) {
      note = 'A contact is out on the <b>tendon</b>. The travelling wave has run out of fibre, ' +
        'so there is very little to record and most of what is left is the other contact.';
    } else if (spacing >= 30) {
      note = 'Both contacts are on the belly, but <b>' + fmt(spacing, 0) + ' mm</b> apart the ' +
        'first comb zero sits at cv/d = <b>' + fmt(S.cv / (spacing * 1e-3), 0) +
        ' Hz</b>, inside the 20–450 Hz band. Wide spacing buys amplitude and pays in bandwidth.';
    } else {
      note = 'Both contacts on the belly, one side of the end plate, <b>' + fmt(spacing, 0) +
        ' mm</b> apart: this is the stable plateau. Move the pair a few millimetres and ' +
        'almost nothing changes, which is what you want from a measurement.';
    }
    out.innerHTML =
      'Contacts <b>' + (S.a + 1) + '</b> and <b>' + (S.b + 1) + '</b>, centred <b>' +
      fmt(Math.abs(mid - IZ), 0) + ' mm</b> from the end plate: <b>' + fmt(r / best * 100, 0) +
      ' %</b> of the best signal available on this muscle, median frequency <b>' +
      fmt(mf, 0) + ' Hz</b>. ' + note +
      ' <span style="opacity:.62">Modelled: there is no electrode array in our dataset, so no ' +
      'conduction velocity in this lecture is measured.</span>';
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  var sA = slider(g2, 'Contact 1', 1, NC, 1, S.a + 1,
    function (v) { return '#' + fmt(v, 0); }, function (v) { S.a = v - 1; draw(); });
  var sB = slider(g2, 'Contact 2', 1, NC, 1, S.b + 1,
    function (v) { return '#' + fmt(v, 0); }, function (v) { S.b = v - 1; draw(); });
  var sV = slider(g2, 'Velocity', 2, 6, 0.1, S.cv,
    function (v) { return fmt(v, 1) + ' m/s'; }, function (v) { S.cv = v; draw(); });
  sA.quiet(S.a + 1); sB.quiet(S.b + 1); sV.quiet(S.cv);

  draw();
  window.addEventListener('ephe341-theme', draw);
});
/* ======================================================================
   6. EMD — why force arrives after the signal

   His slide 48.  The EMG is the electrical event; force is what the
   crossbridges do about it, and that takes time.  Two separate things add
   up, and the slide tends to blur them:

     1. the electromechanical delay proper -- propagation, excitation-
        contraction coupling, and taking up series elastic slack, ~30 ms;
     2. activation dynamics -- calcium binding and unbinding are first
        order with different time constants up (~10 ms) and down (~40 ms),
        so force keeps rising after the burst has peaked and keeps going
        after it has stopped.

   The excitation here is the REAL measured envelope from the same vastus
   lateralis recording the processing widget uses.  The force is modelled,
   with the same activation dynamics the muscle-mechanics deck uses, and
   the widget measures the resulting onset-to-onset delay rather than
   quoting a number at it.
   ====================================================================== */
D.register('emd', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { emd: 30, ta: 10, td: 40 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1080, h: port ? 440 : 380,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  var SRC = EMG14.chain || { fs: 2222.22, uv: [] };
  var FS = SRC.fs;
  var RAW = Float64Array.from(SRC.uv || []);
  var ENV = RAW.length ? lowpass(rectify(bandpass(RAW, FS, 20, 450)), FS, 3, true) : RAW;
  var EMX = 0;
  for (var i0 = 0; i0 < ENV.length; i0++) EMX = Math.max(EMX, ENV[i0]);

  function force() {
    var n = ENV.length, a = new Float64Array(n);
    var shift = Math.round(S.emd / 1000 * FS);
    var dt = 1 / FS, av = 0;
    for (var i = 0; i < n; i++) {
      var k = i - shift;
      var ex = k >= 0 ? ENV[k] / (EMX || 1) : 0;
      /* first-order activation, faster on than off */
      var tau = (ex >= av ? S.ta : S.td) / 1000;
      av = ex + (av - ex) * Math.exp(-dt / tau);
      a[i] = av;
    }
    return a;
  }
  /* the delay the model actually produces, measured the way you would
     measure it on a real trace: time from EMG crossing 10 % of its peak to
     force crossing 10 % of its peak, on the first burst */
  function onsetDelay(F) {
    var te = -1, tf = -1, i;
    for (i = 0; i < ENV.length; i++) if (ENV[i] > 0.1 * EMX) { te = i; break; }
    var fmx = 0; for (i = 0; i < F.length; i++) fmx = Math.max(fmx, F[i]);
    for (i = 0; i < F.length; i++) if (F[i] > 0.1 * fmx) { tf = i; break; }
    return (te < 0 || tf < 0) ? null : (tf - te) / FS * 1000;
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    if (!RAW.length) { label(c, 'no data', W / 2, H / 2, { color: K.MUT }); return; }
    var F = force(), n = ENV.length;
    var pl = 20, pr = 16, pt = 22, pb = 34;
    var X = function (i) { return pl + i / (n - 1) * (W - pl - pr); };
    var base = H - pb, span = (H - pt - pb);
    var fmx = 0; for (var i = 0; i < n; i++) fmx = Math.max(fmx, F[i]);
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(pl, pt); c.lineTo(pl, base); c.lineTo(W - pr, base); c.stroke(); c.restore();
    /* EMG envelope */
    c.save(); c.strokeStyle = K.GRN; c.lineWidth = 2.2; c.beginPath();
    for (i = 0; i < n; i++) { var px = X(i), py = base - ENV[i] / EMX * span * 0.92;
      i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.stroke(); c.restore();
    /* modelled force */
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.8; c.beginPath();
    for (i = 0; i < n; i++) { var px2 = X(i), py2 = base - F[i] / (fmx || 1) * span * 0.92;
      i ? c.lineTo(px2, py2) : c.moveTo(px2, py2); }
    c.stroke(); c.restore();
    /* mark the onsets the readout quotes */
    var te = -1, tf = -1;
    for (i = 0; i < n; i++) if (ENV[i] > 0.1 * EMX) { te = i; break; }
    for (i = 0; i < n; i++) if (F[i] > 0.1 * fmx) { tf = i; break; }
    if (te >= 0 && tf >= 0) {
      [[te, K.GRN], [tf, K.ACC]].forEach(function (m) {
        c.save(); c.strokeStyle = m[1]; c.setLineDash([4, 4]); c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(X(m[0]), pt); c.lineTo(X(m[0]), base); c.stroke(); c.restore();
      });
      arrow(c, X(te), pt + 10, X(tf), pt + 10, { color: K.INK, width: 1.8, head: 8 });
      label(c, fmt((tf - te) / FS * 1000, 0) + ' ms', (X(te) + X(tf)) / 2, pt + 1,
            { color: K.INK, size: 11.5, plate: true });
    }
    key(c, W - (port ? 190 : 206), pt + 4,
        [[K.GRN, 'measured EMG envelope'], [K.ACC, 'modelled force']], { size: 11 });
    [0, 0.5, 1, 1.5, 2].forEach(function (t) {
      label(c, fmt(t, 1), pl + t / (n / FS) * (W - pl - pr), base + 12, { color: K.MUT, size: 10.5 });
    });
    label(c, 'time (s)', pl + (W - pl - pr) / 2, H - 8, { color: K.MUT, size: 11 });

    var dly = onsetDelay(F);
    out.innerHTML = 'Force onset trails EMG onset by <b>' + fmt(dly, 0) + ' ms</b> here: ' +
      '<b>' + fmt(S.emd, 0) + ' ms</b> of electromechanical delay plus the time the ' +
      'first-order activation takes to climb past the threshold. Note what the two time ' +
      'constants do at the END of each burst — deactivation is the slower of the two, so ' +
      'force outlasts the signal that caused it. Any measurement that lines EMG up with force ' +
      'without allowing for this will misplace both. ' +
      '<span style="opacity:.72">Envelope measured; force modelled.</span>';
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  slider(g2, 'Electromechanical delay', 0, 80, 1, S.emd,
    function (v) { return fmt(v, 0) + ' ms'; }, function (v) { S.emd = v; draw(); });
  slider(g2, 'Activation τ', 5, 40, 1, S.ta,
    function (v) { return fmt(v, 0) + ' ms'; }, function (v) { S.ta = v; draw(); });
  slider(g2, 'Deactivation τ', 10, 120, 5, S.td,
    function (v) { return fmt(v, 0) + ' ms'; }, function (v) { S.td = v; draw(); });
  draw();
  window.addEventListener('ephe341-theme', draw);
});
/* ======================================================================
   7. MU — the motor unit pool, and the order it comes in

   His slides 9 and 10 made to run.  Panel (A) is his muscle cross-section:
   every circle is a FIBRE, coloured by which motor unit owns it, and the
   three named units are interleaved through the muscle rather than sitting
   in blocks.  Panel (B) is his whole-muscle tension staircase.

   Nothing here is drawn to look right.  Twitch force is computed as
   (number of fibres) x (fibre cross-sectional area), so the step heights in
   (B) fall out of the picture in (A) rather than being chosen:

       unit 1   10 fibres  r 4.6   ->  n*r^2 =   212
       unit 2   18 fibres  r 6.4   ->            737
       unit 3   28 fibres  r 8.6   ->           2071

   which is the ~1:3.5:10 spread the textbook figure shows, and it is the
   asymmetry that makes the EMG-force relationship bend later in the deck.

   Fibre DIAMETER follows physiology, not his drawing: type I smallest,
   IIb largest.  His plate colours slow-oxidative red, which is the other
   way round from the panel (B) banding on the same figure; one consistent
   scheme is used here and the key says which is which.
   ====================================================================== */
D.register('mu', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { drive: 45 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1090, h: port ? 540 : 386,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  /* --- the three named units: fibre count and fibre radius (drawing units,
     proportional to real fibre diameter: type I ~50 um, IIa ~70, IIb ~95) --- */
  var UNIT = [
    { n: 10, r: 4.6, th: 10, name: 'unit 1', type: 'type I · slow oxidative' },
    { n: 18, r: 6.4, th: 38, name: 'unit 2', type: 'type IIa · fast oxidative' },
    { n: 28, r: 8.6, th: 72, name: 'unit 3', type: 'type IIb · fast glycolytic' }
  ];
  UNIT.forEach(function (q) { q.tw = q.n * q.r * q.r; });
  var TOT = UNIT.reduce(function (s, q) { return s + q.tw; }, 0);

  /* --- the cross-section, laid out once so the picture never jumps --------
     A hex lattice clipped to an irregular blob, then fibres are DEALT to the
     three units at random positions: a motor unit is a scatter, not a patch,
     and that is the point of his figure. */
  var FIB = (function () {
    var pts = [], i, j;
    var rows = 11, cols = 12, sp = 21;
    for (j = 0; j < rows; j++) {
      for (i = 0; i < cols; i++) {
        var x = i * sp + (j % 2 ? sp / 2 : 0);
        var y = j * sp * 0.87;
        var cx = (cols - 1) * sp / 2 + sp / 4, cy = (rows - 1) * sp * 0.87 / 2;
        /* an oval outline with a deterministic wobble, so it reads as muscle */
        var ex = (x - cx) / (cols * sp * 0.48);
        var ey = (y - cy) / (rows * sp * 0.87 * 0.52);
        var wob = 0.92 + 0.1 * Math.sin(i * 2.1 + j * 1.7);
        if (ex * ex + ey * ey > wob) continue;
        pts.push({ x: x, y: y, u: -1 });
      }
    }
    /* deal: a fixed shuffle (no Math.random, so the figure is reproducible) */
    var order = pts.map(function (p, k) { return k; });
    var seed = 7;
    for (i = order.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      j = seed % (i + 1);
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }
    var k = 0;
    UNIT.forEach(function (q, ui) {
      for (var m = 0; m < q.n && k < order.length; m++, k++) pts[order[k]].u = ui;
    });
    /* everything left over belongs to units we are not drawing */
    for (; k < order.length; k++) pts[order[k]].u = -1;
    return pts;
  })();

  function uc(K, i) { return [K.BLUE, K.ORG, K.ACC][i]; }
  function active(i) { return S.drive >= UNIT[i].th; }
  function tension() {
    var t = 0;
    UNIT.forEach(function (q, i) { if (active(i)) t += q.tw; });
    return t;
  }

  /* ---------------------------- (A) the muscle --------------------------- */
  function drawPool(x0, y0, w, h) {
    var c = ax.c, K = C();
    var bx = 0, by = 0, bw = 0, bh = 0, i;
    var xs = FIB.map(function (p) { return p.x; }), ys = FIB.map(function (p) { return p.y; });
    bx = Math.min.apply(null, xs); bw = Math.max.apply(null, xs) - bx;
    by = Math.min.apply(null, ys); bh = Math.max.apply(null, ys) - by;
    var pad = 26;
    var k = Math.min((w - pad * 2) / (bw + 24), (h - pad * 2 - 18) / (bh + 24));
    var ox = x0 + (w - bw * k) / 2 - bx * k;
    var oy = y0 + (h - 18 - bh * k) / 2 - by * k + 10;

    /* a faint perimysium so the scatter reads as a cross-section */
    c.save();
    c.strokeStyle = K.MUT; c.globalAlpha = .30; c.lineWidth = 2.4;
    c.beginPath();
    c.ellipse(ox + (bx + bw / 2) * k, oy + (by + bh / 2) * k,
              (bw / 2 + 15) * k, (bh / 2 + 15) * k, 0, 0, 7);
    c.stroke(); c.restore();

    for (i = 0; i < FIB.length; i++) {
      var p = FIB[i];
      var r = p.u < 0 ? 6.0 : UNIT[p.u].r;
      var on = p.u >= 0 && active(p.u);
      c.save();
      c.beginPath(); c.arc(ox + p.x * k, oy + p.y * k, r * k * 0.96, 0, 7);
      if (p.u < 0) { c.fillStyle = K.GRID; c.globalAlpha = .55; }
      else if (on) { c.fillStyle = uc(K, p.u); }
      else { c.fillStyle = uc(K, p.u); c.globalAlpha = .17; }
      c.fill();
      if (on) { c.globalAlpha = 1; c.strokeStyle = K.PANEL; c.lineWidth = 1.2; c.stroke(); }
      c.restore();
    }
    label(c, 'one cross-section of the muscle · each circle is a fibre',
          x0 + w / 2, y0 + h - 4, { color: K.MUT, size: 11 });
  }

  /* ------------------------- (B) the tension staircase ------------------- */
  function drawSteps(x0, y0, w, h) {
    var c = ax.c, K = C();
    var pl = 46, pr = 16, pt = 22, pb = 44;
    var X = function (dr) { return x0 + pl + dr / 100 * (w - pl - pr); };
    var Y = function (f) { return y0 + h - pb - f / TOT * (h - pt - pb); };

    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + pl, y0 + pt); c.lineTo(x0 + pl, y0 + h - pb);
    c.lineTo(x0 + w - pr, y0 + h - pb); c.stroke(); c.restore();

    /* the stack: each unit's band starts at its own threshold */
    var base = 0;
    UNIT.forEach(function (q, i) {
      var y1 = Y(base), y2 = Y(base + q.tw);
      c.save();
      c.fillStyle = uc(C(), i);
      c.globalAlpha = active(i) ? .80 : .13;
      c.fillRect(X(q.th), y2, X(100) - X(q.th), y1 - y2);
      c.globalAlpha = 1; c.strokeStyle = uc(C(), i); c.lineWidth = active(i) ? 2 : 1;
      c.globalAlpha = active(i) ? 1 : .35;
      c.beginPath(); c.moveTo(X(q.th), y1); c.lineTo(X(q.th), y2); c.lineTo(X(100), y2); c.stroke();
      c.restore();
      label(c, q.name, (X(q.th) + X(100)) / 2, (y1 + y2) / 2,
            { color: active(i) ? '#ffffff' : K.MUT, size: 11.5, weight: 700 });
      base += q.tw;
    });

    /* where we are now */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.6; c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(X(S.drive), y0 + pt); c.lineTo(X(S.drive), y0 + h - pb); c.stroke();
    c.restore();
    var ty = Y(tension());
    c.save(); c.fillStyle = K.INK; c.beginPath();
    c.arc(X(S.drive), ty, 4.5, 0, 7); c.fill(); c.restore();

    [0, 50, 100].forEach(function (v) {
      label(c, String(v), X(v), y0 + h - pb + 13, { color: K.MUT, size: 10.5 });
    });
    label(c, 'neural drive (%)', x0 + pl + (w - pl - pr) / 2, y0 + h - 9,
          { color: K.MUT, size: 11 });
    label(c, 'whole-muscle tension', x0 + pl + 4, y0 + pt - 9,
          { color: K.MUT, size: 11, align: 'left' });
  }

  function draw() {
    var K = C();
    ax.clear();
    var W = ax.W, H = ax.H;
    if (port) { drawPool(0, 0, W, H * 0.48); drawSteps(0, H * 0.48, W, H * 0.52); }
    else { drawPool(0, 0, W * 0.40, H); drawSteps(W * 0.40, 0, W * 0.60, H); }

    var rows = UNIT.map(function (q, i) {
      return [active(i) ? uc(K, i) : K.MUT, q.name + ' — ' + q.type];
    });
    /* the key sits above the staircase, where nothing is ever drawn */
    key(ax.c, port ? 10 : W * 0.40 + 52, 26, rows, { size: 10.5 });

    var on = UNIT.filter(function (q, i) { return active(i); });
    var nf = on.reduce(function (s, q) { return s + q.n; }, 0);
    var pct = TOT ? tension() / TOT * 100 : 0;
    var txt;
    if (!on.length) {
      txt = 'At <b>' + fmt(S.drive, 0) + ' %</b> drive nothing is recruited yet. ' +
        'Raise it and watch unit 1 come in first — every one of its fibres at once, ' +
        'because a motor unit is <b>all or none</b>: the nervous system cannot half-fire one.';
    } else {
      var nxt = UNIT[on.length];
      txt = 'At <b>' + fmt(S.drive, 0) + ' %</b> drive, ' +
        (on.length === 1 ? '<b>unit 1</b> is' : '<b>units 1–' + on.length + '</b> are') +
        ' active: <b>' + nf + '</b> fibres and <b>' + fmt(pct, 0) +
        ' %</b> of this muscle’s tension. ' +
        (nxt
          ? 'The next one in, ' + nxt.name + ', will add <b>' + fmt(nxt.tw / TOT * 100, 0) +
            ' %</b> on its own — more than everything recruited so far.'
          : 'Unit 3 alone is <b>' + fmt(UNIT[2].tw / TOT * 100, 0) +
            ' %</b> of the total: the last unit in does most of the work, which is why ' +
            'EMG and force do not rise together.');
    }
    out.innerHTML = txt;
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  var sDr = slider(g2, 'Neural drive', 0, 100, 1, S.drive,
    function (v) { return fmt(v, 0) + ' %'; }, function (v) { S.drive = v; draw(); });
  sDr.quiet(S.drive);

  var row = ctlRow(u.ctl);
  var play = playBtn(row, '▶ Raise the drive');
  var raf = null, playing = false, last = 0;
  function stop() { playing = false; play.innerHTML = '▶ Raise the drive'; if (raf) cancelAnimationFrame(raf); raf = null; }
  function tick(ts) {
    if (!playing) return;
    if (!last) last = ts;
    S.drive = Math.min(100, S.drive + (ts - last) / 1000 * 34);
    last = ts;
    sDr.quiet(S.drive); draw();
    if (S.drive >= 100) { stop(); return; }
    raf = requestAnimationFrame(tick);
  }
  play.addEventListener('click', function () {
    if (playing) { stop(); return; }
    if (S.drive >= 100) { S.drive = 0; sDr.quiet(0); }
    playing = true; last = 0; play.innerHTML = '❚❚ Pause';
    raf = requestAnimationFrame(tick);
  });

  draw();
  window.addEventListener('ephe341-theme', draw);
});
/* ======================================================================
   8. GAIT — one measured stride, with the EMG that was recorded during it

   His slide 46: the walking figures on the left and the gait-cycle muscle
   chart on the right, put on the same clock, with the whole processing
   chain from the middle of the lecture available on the signal.

   ALL OF IT IS MEASURED, and the figure and the signal are the SAME
   PERSON ON THE SAME STRIDE:

     Lencioni T, Carpinella I, Rabuffetti M, Marzegan A, Ferrarin M (2019)
     "Human kinematic, kinetic and EMG data during different walking and
     stair ascending and descending tasks", Scientific Data 6:309.
     doi:10.6084/m9.figshare.c.4494755, CC BY 4.0.

   Markers at 60 Hz, surface EMG at 960 Hz, one level-walking trial per
   subject, heel strike to heel strike.  The EMG is RAW: the authors
   band-passed 10-400 Hz in the amplifier before sampling, gaitdata.js
   removes the constant offset, and nothing else has been done to it.
   That is what makes the rectify step real here rather than decorative.

   Two subjects are carried so the class can see the same pattern on two
   different people, which is the only honest way to claim a muscle fires
   "at" a particular part of the cycle.

   Note which muscles are here.  His textbook figure includes iliopsoas,
   and surface EMG cannot record it -- it is deep under the abdomen.  That
   absence is on the slide on purpose.
   ====================================================================== */
D.register('gait', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var G = (typeof window !== 'undefined' && window.GAIT14) || null;
  var S = { p: 16, mode: 'raw', fc: 6, sub: 0 };

  var ax = new Axes(u.cv, { w: port ? 460 : 1090, h: port ? 560 : 392,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  var LINKS = [
    ['head', 'neck'], ['neck', 'trunk'], ['trunk', 'pelvis'],
    ['neck', 'shR'], ['shR', 'elR'], ['elR', 'wrR'],
    ['neck', 'shL'], ['shL', 'elL'], ['elL', 'wrL'],
    ['pelvis', 'hipR'], ['hipR', 'kneeR'], ['kneeR', 'ankR'],
    ['ankR', 'heelR'], ['heelR', 'toeR'], ['ankR', 'toeR'],
    ['pelvis', 'hipL'], ['hipL', 'kneeL'], ['kneeL', 'ankL'],
    ['ankL', 'heelL'], ['heelL', 'toeL'], ['ankL', 'toeL']
  ];
  var RIGHT = { hipR: 1, kneeR: 1, ankR: 1, heelR: 1, toeR: 1, shR: 1, elR: 1, wrR: 1 };

  function sub() { return G.subs[S.sub]; }
  var IX = {};
  if (G) G.j.forEach(function (n, i) { IX[n] = i; });

  /* ---- processing, cached per (subject, mode, cutoff) ------------------ */
  /* The amplifier's 10 Hz corner leaves movement artefact in, and on a
     quiet channel that wander is larger than the EMG -- the gluteus maximus
     trace is the one to watch.  So everything downstream of the raw view
     runs on a 20-400 Hz band-pass first, which is what you would do in a
     lab and what the processing-chain widget earlier in the deck does. */
  var BP = G ? G.subs.map(function (s) {
    return s.ch.map(function (c) { return bandpass(c.uv, s.fs, 20, 400); });
  }) : [];
  var PROC = null, procKey = null;
  function processed() {
    var s = sub(), kk = S.sub + ':' + S.mode + ':' + fmt(S.fc, 1);
    if (procKey === kk) return PROC;
    PROC = s.ch.map(function (c, i) {
      if (S.mode === 'raw') return c.uv;
      var r = rectify(BP[S.sub][i]);
      if (S.mode === 'rect') return r;
      return lowpass(r, s.fs, S.fc, true, 2);
    });
    procKey = kk;
    return PROC;
  }
  /* the 6 Hz envelope of every channel, per subject: it is what the readout
     and the per-channel numbers quote, whatever the display is showing */
  var ENV = G ? G.subs.map(function (s, k) {
    return s.ch.map(function (c, i) { return lowpass(rectify(BP[k][i]), s.fs, 6, true, 2); });
  }) : [];
  /* one scale per channel from the raw peak, so switching mode shows the
     processing doing something rather than renormalising it away */
  function peak(y) {
    var m = 0;
    for (var j = 0; j < y.length; j++) m = Math.max(m, Math.abs(y[j]));
    return m * 1.05;
  }
  /* two scale sets: the raw view has the drift in it and needs the room,
     everything downstream is scaled on the band-passed peak so the quiet
     channels are not squashed by artefact they no longer contain */
  var CHMAX  = G ? G.subs.map(function (s, k) { return s.ch.map(function (c, i) { return peak(BP[k][i]); }); }) : [];
  /* How far each envelope actually swings, peak over median.  A channel that
     barely modulates is not a quiet muscle, it is a poor recording -- and in
     both of these subjects the gluteus maximus channel is exactly that, which
     is worth showing rather than hiding.  Such a channel is kept out of the
     "closest to its own peak" comparison, where it would otherwise win on
     noise. */
  var MOD = G ? G.subs.map(function (s, k) {
    return s.ch.map(function (c, i) {
      var e = ENV[k][i], srt = Array.prototype.slice.call(e).sort(function (a2, b2) { return a2 - b2; });
      var med = srt[srt.length >> 1] || 1e-9, mx = srt[srt.length - 1];
      return mx / med;
    });
  }) : [];
  var FLATMOD = 2.5;
  var RAWMAX = G ? G.subs.map(function (s)    { return s.ch.map(function (c)    { return peak(c.uv); }); }) : [];

  function at(name, frame) {
    var s = sub(), k = IX[name];
    if (k == null) return null;
    var b = (frame * G.j.length + k) * 2;
    return [s.p[b], s.p[b + 1]];
  }
  function frameOf(p) {
    var s = sub();
    return Math.max(0, Math.min(s.nf - 1, Math.round(p / 100 * (s.nf - 1))));
  }

  /* ------------------------------ the walker ----------------------------- */
  function drawWalker(x0, y0, w, h) {
    var c = ax.c, K = C();
    if (!G) { label(c, 'walking data not loaded', x0 + w / 2, y0 + h / 2, { color: K.MUT, size: 13 }); return; }
    var s = sub(), pad = 22, i, j;
    var xmin = 1e9, xmax = -1e9, zmin = 1e9, zmax = -1e9;
    for (i = 0; i < s.nf; i++) for (j = 0; j < G.j.length; j++) {
      var b = (i * G.j.length + j) * 2;
      xmin = Math.min(xmin, s.p[b]); xmax = Math.max(xmax, s.p[b]);
      zmin = Math.min(zmin, s.p[b + 1]); zmax = Math.max(zmax, s.p[b + 1]);
    }
    zmin = Math.min(zmin, 0);
    var k = Math.min((w - pad * 2) / (xmax - xmin), (h - pad - 30) / (zmax - zmin));
    var ox = x0 + pad - xmin * k, oz = y0 + h - 30 + zmin * k;
    var X = function (v) { return ox + v * k; };
    var Z = function (v) { return oz - v * k; };

    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .4; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x0 + 6, Z(0)); c.lineTo(x0 + w - 6, Z(0)); c.stroke(); c.restore();

    function pose(fr, alpha, lw) {
      c.save(); c.globalAlpha = alpha; c.lineCap = 'round';
      LINKS.forEach(function (L) {
        var a = at(L[0], fr), b2 = at(L[1], fr);
        if (!a || !b2) return;
        var isR = RIGHT[L[0]] || RIGHT[L[1]];
        c.strokeStyle = isR ? K.ACC : K.MUT;
        c.lineWidth = lw * (isR ? 1.15 : 1);
        c.beginPath(); c.moveTo(X(a[0]), Z(a[1])); c.lineTo(X(b2[0]), Z(b2[1])); c.stroke();
      });
      var hd = at('head', fr);
      if (hd) { c.fillStyle = K.MUT; c.beginPath(); c.arc(X(hd[0]), Z(hd[1]) - 9, 9, 0, 7); c.fill(); }
      c.restore();
    }
    var f = frameOf(S.p);
    [10, 7, 4].forEach(function (back, i2) {
      if (f - back >= 0) pose(f - back, 0.10 + i2 * 0.045, 2.4);
    });
    pose(f, 1, 3.2);
    label(c, s.subject + ' · ' + s.age + ' y · ' + fmt(s.speed, 2) + ' m/s · right leg in colour',
          x0 + w / 2, y0 + h - 10, { color: K.MUT, size: 10.5 });
  }

  /* ---------------------------- the EMG channels ------------------------- */
  function drawChannels(x0, y0, w, h) {
    var c = ax.c, K = C();
    var pl = 108, pr = 58, pt = 24, pb = 34;
    var s = sub(), P = processed(), cyc = s.cycle;
    var X = function (p) { return x0 + pl + p / 100 * (w - pl - pr); };
    var lh = (h - pt - pb) / P.length;

    c.save(); c.fillStyle = K.GRID; c.globalAlpha = .5;
    c.fillRect(X(0), y0 + pt, X(62) - X(0), h - pt - pb); c.restore();
    label(c, 'stance', (X(0) + X(62)) / 2, y0 + pt - 9, { color: K.MUT, size: 10.5 });
    label(c, 'swing', (X(62) + X(100)) / 2, y0 + pt - 9, { color: K.MUT, size: 10.5 });

    P.forEach(function (y, mi) {
      var top = y0 + pt + lh * mi, bot = top + lh - 5;
      var symm = (S.mode === 'raw');
      var base = symm ? (top + bot) / 2 : bot;
      var span = symm ? (lh - 7) / 2 : (lh - 7);
      var sc = span / (symm ? RAWMAX[S.sub][mi] : CHMAX[S.sub][mi]);
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
      c.beginPath(); c.moveTo(X(0), base); c.lineTo(X(100), base); c.stroke(); c.restore();

      /* in envelope mode the rectified signal stays behind it, on the same
         scale, so the envelope is visibly an average OF something */
      if (S.mode === 'env') {
        var r = rectify(BP[S.sub][mi]);
        c.save(); c.strokeStyle = K.BLUE; c.globalAlpha = .32; c.lineWidth = 0.8;
        c.beginPath();
        for (var q = 0; q < cyc; q++) {
          var qx = X(q / cyc * 100), qy = base - r[q] * sc;
          q ? c.lineTo(qx, qy) : c.moveTo(qx, qy);
        }
        c.stroke(); c.restore();
      }

      c.save();
      c.strokeStyle = S.mode === 'env' ? K.ACC : K.BLUE;
      c.lineWidth = S.mode === 'env' ? 2 : 0.9;
      c.beginPath();
      if (S.mode === 'env') c.moveTo(X(0), base);
      for (var i = 0; i < cyc; i++) {
        var px = X(i / cyc * 100), py = base - y[i] * sc;
        (i || S.mode === 'env') ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke(); c.restore();

      label(c, s.ch[mi].n, x0 + pl - 8, top + lh / 2 - 2,
            { color: MOD[S.sub][mi] < FLATMOD ? K.MUT : K.INK, size: 11,
              align: 'right', weight: 600 });
      var vi = Math.min(cyc - 1, Math.round(S.p / 100 * cyc));
      label(c, fmt(ENV[S.sub][mi][vi], 0) + ' µV', x0 + w - pr + 6, top + lh / 2 - 2,
            { color: K.MUT, size: 10, align: 'left' });
    });

    /* the one moving line, straight down every channel */
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 2;
    c.beginPath(); c.moveTo(X(S.p), y0 + pt - 4); c.lineTo(X(S.p), y0 + h - pb); c.stroke();
    c.fillStyle = K.INK;
    c.beginPath(); c.arc(X(S.p), y0 + pt - 7, 3.5, 0, 7); c.fill();
    c.restore();

    [0, 20, 40, 60, 80, 100].forEach(function (p) {
      label(c, String(p), X(p), y0 + h - pb + 12, { color: K.MUT, size: 10 });
    });
    label(c, 'gait cycle (%)  ·  measured surface EMG, ' + fmt(s.fs, 0) + ' Hz, right leg',
          x0 + pl + (w - pl - pr) / 2, y0 + h - 8, { color: K.MUT, size: 11 });
  }

  function draw() {
    ax.clear();
    if (!G || !G.subs) { label(ax.c, 'no data', ax.W / 2, ax.H / 2, { color: C().MUT }); return; }
    var W = ax.W, H = ax.H, s = sub();
    if (port) { drawWalker(0, 0, W, H * 0.34); drawChannels(0, H * 0.34, W, H * 0.66); }
    else { drawWalker(0, 0, W * 0.32, H); drawChannels(W * 0.32, 0, W * 0.68, H); }

    var vi = Math.min(s.cycle - 1, Math.round(S.p / 100 * s.cycle));
    /* compared with each muscle's OWN range, because amplitudes at different
       electrode sites are not comparable with one another */
    var lvl = ENV[S.sub].map(function (e, mi) {
      var pk = 0, mn = 1e18;
      for (var q = 0; q < e.length; q++) { pk = Math.max(pk, e[q]); mn = Math.min(mn, e[q]); }
      return MOD[S.sub][mi] < FLATMOD ? -1 : (e[vi] - mn) / (pk - mn || 1);
    });
    var top = lvl.indexOf(Math.max.apply(null, lvl));
    var flat = s.ch.filter(function (c, mi) { return MOD[S.sub][mi] < FLATMOD; })
                   .map(function (c) { return c.n; });
    var phase = S.p < 2 ? 'initial contact'
      : S.p < 12 ? 'loading response'
      : S.p < 31 ? 'mid-stance'
      : S.p < 50 ? 'terminal stance'
      : S.p < 62 ? 'pre-swing'
      : S.p < 75 ? 'initial swing'
      : S.p < 87 ? 'mid-swing' : 'terminal swing';
    var modeTxt = S.mode === 'raw'
      ? 'This is the <b>raw</b> recording — nothing done to it but the amplifier\'s ' +
        '10–400 Hz band-pass. The slow wander is the limb moving, not muscle.'
      : S.mode === 'rect'
        ? 'High-passed at <b>20 Hz</b> to drop the movement artefact, then full-wave ' +
          '<b>rectified</b>: every sample is now |EMG|, so there is something left to average.'
        : 'The <b>linear envelope</b>: rectified, then low-passed at <b>' + fmt(S.fc, 1) +
          ' Hz</b>, forwards and backwards so it does not lag.';
    out.innerHTML =
      '<b>' + fmt(S.p, 0) + ' %</b> through the stride — <b>' + phase + '</b>, and the line ' +
      'runs down every channel at that instant. Closest to its own peak right now: <b>' +
      s.ch[top].n + '</b> at <b>' + fmt(lvl[top] * 100, 0) + ' %</b>. ' + modeTxt +
      (flat.length
        ? ' <b>' + flat.join('</b> and <b>') + '</b> barely ' +
          (flat.length > 1 ? 'modulate' : 'modulates') + ' — a <b>poor recording</b>, not a ' +
          'quiet muscle, greyed out above. Gluteus maximus is a hard site: deep under fat.'
        : '') +
      ' <span style="opacity:.62">Figure and signal are the same person on the same stride — ' +
      s.subject + ', ' + s.age + ' y, walking at ' + fmt(s.speed, 2) +
      ' m/s (Lencioni et al. 2019, CC BY). Iliopsoas is in his chart and not here: it is deep ' +
      'under the abdomen and no surface electrode reaches it.</span>';
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  var sP = slider(g2, 'Gait cycle', 0, 100, 1, S.p,
    function (v) { return fmt(v, 0) + ' %'; }, function (v) { S.p = v; draw(); });
  var sF = slider(g2, 'Envelope cutoff', 1, 20, 0.5, S.fc,
    function (v) { return fmt(v, 1) + ' Hz'; },
    function (v) { S.fc = v; if (S.mode !== 'env') { S.mode = 'env'; syncSeg(); } draw(); });
  sP.quiet(S.p); sF.quiet(S.fc);

  var row = ctlRow(u.ctl);
  var segRow = keepOut(seg(row, [['raw', 'Raw'], ['rect', 'Rectified'], ['env', 'Envelope']],
    S.mode, function (m) { S.mode = m; draw(); }));
  function syncSeg() {
    Array.prototype.forEach.call(segRow.children, function (b, i) {
      b.classList.toggle('on', ['raw', 'rect', 'env'][i] === S.mode);
    });
  }
  if (G && G.subs && G.subs.length > 1) {
    keepOut(chips(row, G.subs.map(function (s, i) { return [i, s.subject]; }), 0,
      function (i) { S.sub = +i; procKey = null; draw(); }));
  }
  var play = playBtn(row, '▶ Walk');
  var raf = null, playing = false, last = 0;
  function stop() { playing = false; play.innerHTML = '▶ Walk'; if (raf) cancelAnimationFrame(raf); raf = null; }
  function tick(ts) {
    if (!playing) return;
    if (!last) last = ts;
    S.p = (S.p + (ts - last) / 1000 * 36) % 100;
    last = ts; sP.quiet(S.p); draw();
    raf = requestAnimationFrame(tick);
  }
  play.addEventListener('click', function () {
    if (playing) { stop(); return; }
    playing = true; last = 0; play.innerHTML = '❚❚ Pause';
    raf = requestAnimationFrame(tick);
  });

  draw();
  window.addEventListener('ephe341-theme', draw);
});
/* ======================================================================
   9. MF — why slowing the wave lowers the frequency

   His slide 51 built rather than asserted.  One lever: conduction velocity.
   The MUAP duration is inversely proportional to it, because the waveform
   you record is the travelling wave passing the electrode, so

       duration = 9 ms * (4 m/s) / cv

   Everything else is held fixed — same units, same firing rates, same
   amplitude.  The spectrum and the median frequency are then computed from
   the signal, not drawn, and the model's own prediction is that median
   frequency is proportional to conduction velocity.  The readout prints
   the ratio so the class can check it.

   Verified in parts/selftest.js: a 27 % longer MUAP lowers median frequency
   by 27 % (174.3 -> 126.5 Hz).

   MODELLED.  The Cartier dataset has no electrode array, so nothing in this
   lecture measures conduction velocity; this figure shows the mechanism, not
   a recording.
   ====================================================================== */
D.register('mf', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var CV0 = 4.0, CVMIN = 2.4;
  var S = { cv: 3.1 };

  var FS = 2000, DUR = 0.5, NU = 30;

  var ax = new Axes(u.cv, { w: port ? 460 : 1090, h: port ? 560 : 390,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  function durOf(cv) { return 0.009 * CV0 / cv; }

  /* a fixed firing pattern: only the waveform width changes with cv */
  var TRAIN = (function () {
    var seed = 20261006, t, k, out = [];
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    for (k = 0; k < NU; k++) {
      var isi = 1 / (14 + 10 * rnd()), amp = 0.5 + rnd(), list = [];
      for (t = rnd() * isi; t < DUR; t += isi * (0.8 + 0.4 * rnd())) list.push(t);
      out.push({ amp: amp * ((k % 2) ? 1 : -1), fires: list });
    }
    return out;
  })();

  function signal(cv) {
    var n = Math.round(DUR * FS), y = new Float64Array(n), i, k, q;
    var dur = durOf(cv), w = Math.round(dur * 1.6 * FS);
    for (k = 0; k < TRAIN.length; k++) {
      var tr = TRAIN[k];
      for (q = 0; q < tr.fires.length; q++) {
        var i0 = Math.round(tr.fires[q] * FS);
        for (i = Math.max(0, i0 - w); i < Math.min(n, i0 + w); i++)
          y[i] += muap((i - i0) / FS, dur, tr.amp);
      }
    }
    return y;
  }

  /* the fatigue sweep: cv falls linearly through the contraction */
  var SWEEP = (function () {
    var pts = [];
    for (var p = 0; p <= 100; p += 5) {
      var cv = CV0 + (CVMIN - CV0) * p / 100;
      pts.push({ p: p, cv: cv, mf: medianFreq(signal(cv), FS, 10, 500) });
    }
    return pts;
  })();
  var MF0 = SWEEP[0].mf;

  /* -------------------------- one MUAP, at this cv ----------------------- */
  function drawMuap(x0, y0, w, h) {
    var c = ax.c, K = C();
    var pl = 44, pr = 18, pt = 20, pb = 34;
    var TMS = 30;
    var X = function (ms) { return x0 + pl + ms / TMS * (w - pl - pr); };
    var cy = y0 + pt + (h - pt - pb) / 2, sc = (h - pt - pb) * 0.40;
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0 + pl, cy); c.lineTo(x0 + w - pr, cy); c.stroke(); c.restore();

    var shapes = S.cv === CV0 ? [[S.cv, K.ACC, 2.2, null]]
                              : [[CV0, K.MUT, 1.2, [4, 3]], [S.cv, K.ACC, 2.2, null]];
    shapes.forEach(function (q) {
      c.save(); c.strokeStyle = q[1]; c.lineWidth = q[2];
      if (q[3]) c.setLineDash(q[3]);
      c.beginPath();
      for (var ms = 0; ms <= TMS; ms += 0.25) {
        var v = muap((ms - 15) / 1000, durOf(q[0]), 1);
        var px = X(ms), py = cy - v * sc;
        ms ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke(); c.restore();
    });

    /* how wide it is now */
    var halfMs = durOf(S.cv) * 1000 / 2;
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1; c.globalAlpha = .55;
    c.setLineDash([3, 3]);
    [15 - halfMs, 15 + halfMs].forEach(function (ms) {
      c.beginPath(); c.moveTo(X(ms), cy - sc); c.lineTo(X(ms), cy + sc * 0.6); c.stroke();
    });
    c.restore();
    label(c, fmt(durOf(S.cv) * 1000, 1) + ' ms wide', X(15), cy + sc * 0.78,
          { color: K.ACC, size: 10.5, plate: true });

    label(c, 'one MUAP', x0 + pl + 2, y0 + pt - 9, { color: K.MUT, size: 11, align: 'left' });
    [0, 10, 20, 30].forEach(function (t) {
      label(c, String(t), X(t), y0 + h - pb + 12, { color: K.MUT, size: 10 });
    });
    label(c, 'time (ms)', x0 + pl + (w - pl - pr) / 2, y0 + h - 8, { color: K.MUT, size: 11 });
    if (S.cv !== CV0) {
      key(c, x0 + w - pr - 150, y0 + pt + 2,
          [[K.MUT, 'at ' + fmt(CV0, 1) + ' m/s'], [K.ACC, 'at ' + fmt(S.cv, 2) + ' m/s']],
          { size: 10 });
    }
  }

  /* --------------------------- the interference -------------------------- */
  function drawSig(x0, y0, w, h, y) {
    var c = ax.c, K = C();
    var pl = 44, pr = 18, pt = 18, pb = 30;
    var n = y.length, cy = y0 + pt + (h - pt - pb) / 2;
    var sc = (h - pt - pb) / 2 / YMAX;
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0 + pl, cy); c.lineTo(x0 + w - pr, cy); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 1; c.beginPath();
    for (var i = 0; i < n; i++) {
      var px = x0 + pl + i / (n - 1) * (w - pl - pr), py = cy - y[i] * sc;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke(); c.restore();
    label(c, 'the interference pattern it builds', x0 + pl + 2, y0 + pt - 7,
          { color: K.MUT, size: 11, align: 'left' });
    label(c, fmt(DUR * 1000, 0) + ' ms', x0 + pl + (w - pl - pr) / 2, y0 + h - 9,
          { color: K.MUT, size: 10.5 });
  }

  /* ----------------------------- the spectrum ---------------------------- */
  function drawSpec(x0, y0, w, h, y) {
    var c = ax.c, K = C();
    var pl = 46, pr = 18, pt = 20, pb = 34, FM = 400;
    var s = spectrum(y, FS);
    var X = function (f) { return x0 + pl + f / FM * (w - pl - pr); };
    var Y = function (p) { return y0 + h - pb - p / PMAX * (h - pt - pb); };
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + pl, y0 + pt); c.lineTo(x0 + pl, y0 + h - pb);
    c.lineTo(x0 + w - pr, y0 + h - pb); c.stroke(); c.restore();

    /* the starting spectrum, kept as a ghost to compare against */
    if (S.cv !== CV0) {
      var s0 = spectrum(signal(CV0), FS);
      c.save(); c.strokeStyle = K.MUT; c.lineWidth = 1.2; c.setLineDash([4, 3]);
      c.beginPath();
      for (var j = 0; j < s0.f.length && s0.f[j] <= FM; j++) {
        var px0 = X(s0.f[j]), py0 = Y(s0.P[j]);
        j ? c.lineTo(px0, py0) : c.moveTo(px0, py0);
      }
      c.stroke(); c.restore();
    }

    c.save(); c.fillStyle = K.BLUE; c.globalAlpha = .40; c.beginPath();
    c.moveTo(X(0), Y(0));
    for (var i = 0; i < s.f.length && s.f[i] <= FM; i++) c.lineTo(X(s.f[i]), Y(s.P[i]));
    c.lineTo(X(FM), Y(0)); c.closePath(); c.fill(); c.restore();

    var mf = medianFreq(y, FS, 10, FM);
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2; c.beginPath();
    c.moveTo(X(mf), y0 + pt); c.lineTo(X(mf), y0 + h - pb); c.stroke(); c.restore();
    label(c, 'median ' + fmt(mf, 0) + ' Hz', X(mf) + 6, y0 + pt + 9,
          { color: K.ACC, size: 11, align: 'left', plate: true });
    if (S.cv !== CV0) {
      c.save(); c.strokeStyle = K.MUT; c.lineWidth = 1.4; c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(X(MF0), y0 + pt + 16); c.lineTo(X(MF0), y0 + h - pb); c.stroke();
      c.restore();
      arrow(c, X(MF0), y0 + pt + 22, X(mf), y0 + pt + 22, { color: K.ACC, width: 1.6, head: 7 });
    }
    [0, 100, 200, 300, 400].forEach(function (f) {
      label(c, String(f), X(f), y0 + h - pb + 12, { color: K.MUT, size: 10 });
    });
    label(c, 'frequency (Hz)', x0 + pl + (w - pl - pr) / 2, y0 + h - 8, { color: K.MUT, size: 11 });
    label(c, 'power', x0 + pl + 2, y0 + pt - 9, { color: K.MUT, size: 11, align: 'left' });
    return mf;
  }

  /* ------------------------- his muscle fatigue index -------------------- */
  function drawIndex(x0, y0, w, h) {
    var c = ax.c, K = C();
    var pl = 46, pr = 18, pt = 20, pb = 32;
    var lo = SWEEP[SWEEP.length - 1].mf * 0.9, hi = SWEEP[0].mf * 1.06;
    var X = function (p) { return x0 + pl + p / 100 * (w - pl - pr); };
    var Y = function (f) { return y0 + h - pb - (f - lo) / (hi - lo) * (h - pt - pb); };
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + pl, y0 + pt); c.lineTo(x0 + pl, y0 + h - pb);
    c.lineTo(x0 + w - pr, y0 + h - pb); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2; c.beginPath();
    SWEEP.forEach(function (q, i) {
      var px = X(q.p), py = Y(q.mf);
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    });
    c.stroke(); c.restore();
    /* where the slider has us */
    var p = (CV0 - S.cv) / (CV0 - CVMIN) * 100;
    var mfNow = medianFreq(signal(S.cv), FS, 10, 400);
    if (p >= 0 && p <= 100) {
      c.save(); c.fillStyle = K.INK;
      c.beginPath(); c.arc(X(p), Y(mfNow), 4.5, 0, 7); c.fill(); c.restore();
    }
    [0, 50, 100].forEach(function (q) {
      label(c, String(q), X(q), y0 + h - pb + 12, { color: K.MUT, size: 10 });
    });
    [lo, hi].forEach(function (f) {
      label(c, fmt(f, 0), x0 + pl - 7, Y(f), { color: K.MUT, size: 10, align: 'right' });
    });
    label(c, 'through the contraction (%)', x0 + pl + (w - pl - pr) / 2, y0 + h - 7,
          { color: K.MUT, size: 11 });
    label(c, 'median frequency (Hz)', x0 + pl + 2, y0 + pt - 9,
          { color: K.MUT, size: 11, align: 'left' });
  }

  var YMAX = (function () {
    var y = signal(CVMIN), m = 0;
    for (var i = 0; i < y.length; i++) m = Math.max(m, Math.abs(y[i]));
    return m * 1.04;
  })();
  var PMAX = (function () {
    var s = spectrum(signal(CVMIN), FS), m = 0;
    for (var i = 0; i < s.f.length && s.f[i] <= 400; i++) m = Math.max(m, s.P[i]);
    var s2 = spectrum(signal(CV0), FS);
    for (var j = 0; j < s2.f.length && s2.f[j] <= 400; j++) m = Math.max(m, s2.P[j]);
    return m * 1.04;
  })();

  function draw() {
    ax.clear();
    var W = ax.W, H = ax.H, y = signal(S.cv), mf;
    if (port) {
      drawMuap(0, 0, W, H * 0.27);
      drawSig(0, H * 0.27, W, H * 0.21, y);
      mf = drawSpec(0, H * 0.48, W, H * 0.30, y);
      drawIndex(0, H * 0.78, W, H * 0.22);
    } else {
      drawMuap(0, 0, W * 0.46, H * 0.56);
      drawSig(0, H * 0.56, W * 0.46, H * 0.44, y);
      mf = drawSpec(W * 0.46, 0, W * 0.54, H * 0.56, y);
      drawIndex(W * 0.46, H * 0.56, W * 0.54, H * 0.44);
    }
    var cvR = S.cv / CV0, mfR = mf / MF0;
    out.innerHTML =
      'Conduction velocity <b>' + fmt(S.cv, 1) + ' m/s</b> — <b>' + fmt(cvR * 100, 0) +
      ' %</b> of where we started. The MUAP is <b>' + fmt(durOf(S.cv) * 1000, 1) +
      ' ms</b> wide and the median frequency is <b>' + fmt(mf, 0) + ' Hz</b>, <b>' +
      fmt(mfR * 100, 0) + ' %</b> of its starting value. ' +
      (Math.abs(cvR - mfR) < 0.06
        ? 'Those two percentages track each other: <b>median frequency is proportional to ' +
          'conduction velocity</b>, and that is the whole mechanism behind his fatigue index.'
        : 'Nothing but the waveform width has changed — same units, same firing rates, ' +
          'same amplitude.') +
      ' <span style="opacity:.62">Modelled: no conduction velocity in this lecture is measured.</span>';
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  var sV = slider(g2, 'Velocity', CVMIN, CV0, 0.05, S.cv,
    function (v) { return fmt(v, 2) + ' m/s'; }, function (v) { S.cv = v; draw(); });
  sV.quiet(S.cv);

  var row = ctlRow(u.ctl);
  var play = playBtn(row, '▶ Fatigue it');
  var raf = null, playing = false, last = 0;
  function stop() { playing = false; play.innerHTML = '▶ Fatigue it'; if (raf) cancelAnimationFrame(raf); raf = null; }
  function tick(ts) {
    if (!playing) return;
    if (!last) last = ts;
    S.cv = Math.max(CVMIN, S.cv - (ts - last) / 1000 * 0.42);
    last = ts; sV.quiet(S.cv); draw();
    if (S.cv <= CVMIN) { stop(); return; }
    raf = requestAnimationFrame(tick);
  }
  play.addEventListener('click', function () {
    if (playing) { stop(); return; }
    if (S.cv <= CVMIN) { S.cv = CV0; sV.quiet(S.cv); }
    playing = true; last = 0; play.innerHTML = '❚❚ Pause';
    raf = requestAnimationFrame(tick);
  });

  draw();
  window.addEventListener('ephe341-theme', draw);
});

/* build every .iplot on the page; deck-core walks the DOM for data-widget */
D.boot();
})();
