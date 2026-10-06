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
   1. BIPOLAR — why EMG is recorded as a difference

   His slides 24-28, as one figure you can drive.  An action potential
   travels along the fibre at cv and passes two electrodes d apart, so the
   second sees the SAME waveform delayed by tau = d/cv.  The amplifier
   returns the difference.  Add mains hum equally to both and it vanishes;
   move a source off-centre and it does not.

   The spectrum panel is the part worth labouring: differencing two copies
   separated by tau is a comb filter, 2|sin(pi f tau)|, with zeros at
   k*cv/d.  At the SENIAM-standard 20 mm spacing and a typical 4 m/s that
   first zero lands at 200 Hz — inside the EMG band.  Checked in
   parts/selftest.js.
   ====================================================================== */
D.register('bipolar', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { d: 20, cv: 4.0, hum: 0, off: 0, view: 'time' };

  var ax = new Axes(u.cv, { w: port ? 460 : 1080, h: port ? 520 : 372,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  var FS = 20000, N = 800, SPAN = 0.040;          /* 40 ms at 20 kHz */
  function traces() {
    var tau = (S.d * 1e-3) / S.cv;
    var t = new Float64Array(N), m1 = new Float64Array(N),
        m2 = new Float64Array(N), df = new Float64Array(N);
    for (var i = 0; i < N; i++) {
      var tt = (i - N / 2) / FS;
      t[i] = tt;
      var hum = S.hum * 0.01 * Math.sin(2 * Math.PI * 60 * tt);
      /* a crosstalk source sits S.off mm nearer electrode 1, so it reaches
         the two electrodes with a DIFFERENT delay and is not common-mode */
      var xt = S.off ? 0.35 * muap(tt - 0.004, 0.010) : 0;
      var xt2 = S.off ? 0.35 * muap(tt - 0.004 - (S.off * 1e-3) / S.cv, 0.010) : 0;
      m1[i] = muap(tt, 0.008) + hum + xt;
      m2[i] = muap(tt - tau, 0.008) + hum + xt2;
      df[i] = m1[i] - m2[i];
    }
    return { t: t, m1: m1, m2: m2, df: df, tau: tau };
  }

  function drawTime(x0, y0, w, h, v) {
    var c = ax.c, K = C();
    /* the lane names are drawn INSIDE the panel, above each baseline: at
       the left they were being clipped by the panel edge at every width */
    var pl = 18, pr = 16, pt = 22, pb = 30;
    var X = function (tt) { return x0 + pl + (tt + SPAN/2) / SPAN * (w - pl - pr); };
    var lanes = [[v.m1, K.BLUE, 'electrode 1'], [v.m2, K.VIO, 'electrode 2'],
                 [v.df, K.ACC, 'amplifier out  (1 − 2)']];
    var lh = (h - pt - pb) / 3;
    /* one common scale for all three lanes — the difference really is larger
       than either electrode, and hiding that would be the whole point lost */
    var amp = 2.25 + S.hum * 0.012;
    lanes.forEach(function (ln, k) {
      var cy = y0 + pt + lh * (k + 0.5);
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1; c.setLineDash([3, 4]);
      c.beginPath(); c.moveTo(x0 + pl, cy); c.lineTo(x0 + w - pr, cy); c.stroke(); c.restore();
      c.save(); c.strokeStyle = ln[1]; c.lineWidth = k === 2 ? 2.6 : 2; c.beginPath();
      for (var i = 0; i < N; i++) {
        var px = X(v.t[i]), py = cy - ln[0][i] / amp * (lh * 0.42);
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke(); c.restore();
      label(c, ln[2], x0 + pl + 4, cy - lh * 0.40,
            { color: ln[1], size: 11.5, align: 'left', plate: true });
    });
    /* the delay, marked between the two peaks */
    var cy1 = y0 + pt + lh * 0.5, cy2 = y0 + pt + lh * 1.5;
    var xa = X(0), xb = X(v.tau);
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .7; c.setLineDash([4, 3]); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(xa, cy1 - lh * 0.40); c.lineTo(xa, cy2 + lh * 0.40); c.stroke();
    c.beginPath(); c.moveTo(xb, cy1 - lh * 0.40); c.lineTo(xb, cy2 + lh * 0.40); c.stroke();
    c.restore();
    arrow(c, xa, cy1 - lh * 0.46, xb, cy1 - lh * 0.46, { color: K.MUT, width: 1.6, head: 7 });
    label(c, 'τ = d/v = ' + fmt(v.tau * 1000, 2) + ' ms',
          (xa + xb) / 2, cy1 - lh * 0.46 - 11, { color: K.MUT, size: 11.5, plate: true });
    /* axis */
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + pl, y0 + h - pb); c.lineTo(x0 + w - pr, y0 + h - pb); c.stroke(); c.restore();
    [-20, -10, 0, 10, 20].forEach(function (ms) {
      label(c, String(ms), X(ms / 1000), y0 + h - pb + 12, { color: K.MUT, size: 10.5 });
    });
    label(c, 'time (ms)', x0 + pl + (w - pl - pr) / 2, y0 + h - 8, { color: K.MUT, size: 11 });
  }

  function drawSpec(x0, y0, w, h) {
    var c = ax.c, K = C();
    var pl = 56, pr = 18, pt = 26, pb = 34, fmax = 500;
    var X = function (f) { return x0 + pl + f / fmax * (w - pl - pr); };
    var Y = function (g) { return y0 + h - pb - g / 2.15 * (h - pt - pb); };
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + pl, y0 + pt); c.lineTo(x0 + pl, y0 + h - pb);
    c.lineTo(x0 + w - pr, y0 + h - pb); c.stroke(); c.restore();
    [0, 1, 2].forEach(function (g) {
      label(c, String(g) + '×', x0 + pl - 7, Y(g), { color: K.MUT, size: 10.5, align: 'right' });
    });
    [0, 100, 200, 300, 400, 500].forEach(function (f) {
      label(c, String(f), X(f), y0 + h - pb + 12, { color: K.MUT, size: 10.5 });
    });
    /* the EMG band, so the notch can be seen landing inside it */
    c.save(); c.fillStyle = K.ACC; c.globalAlpha = .07;
    c.fillRect(X(20), y0 + pt, X(450) - X(20), (y0 + h - pb) - (y0 + pt)); c.restore();
    label(c, 'EMG band 20–450 Hz', X(235), y0 + pt + 10, { color: K.MUT, size: 10.5 });
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.6; c.beginPath();
    for (var f = 0; f <= fmax; f += 1) {
      var px = X(f), py = Y(combGain(f, S.d, S.cv));
      f ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke(); c.restore();
    combZeros(S.d, S.cv, fmax).forEach(function (f) {
      c.save(); c.strokeStyle = K.BLUE; c.globalAlpha = .75; c.setLineDash([4, 4]); c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(X(f), y0 + pt); c.lineTo(X(f), y0 + h - pb); c.stroke(); c.restore();
      label(c, fmt(f, 0) + ' Hz', X(f), y0 + pt - 9, { color: K.BLUE, size: 11, plate: true });
    });
    label(c, 'gain of the difference,  2|sin(π f τ)|',
          x0 + (w + pl) / 2, y0 + h - 9, { color: K.MUT, size: 11 });
  }

  function draw() {
    var c = ax.c, W = ax.W, H = ax.H, K = C();
    ax.clear();
    var v = traces();
    if (port) {
      drawTime(0, 0, W, H * 0.56, v);
      drawSpec(0, H * 0.56, W, H * 0.44);
    } else if (S.view === 'time') {
      drawTime(0, 0, W, H, v);
    } else {
      drawTime(0, 0, W * 0.56, H, v);
      drawSpec(W * 0.56, 0, W * 0.44, H);
    }
    /* the first zero is v/d whether or not it lands on the plotted axis;
       combZeros returns an empty list once it is past 500 Hz, and the slider
       sweep in fit.js reaches exactly that corner (5 mm at 6 m/s is 1200 Hz) */
    var f0 = S.cv / (S.d * 1e-3);
    var hum = S.hum ? ' Mains hum of ' + fmt(S.hum * 10, 0) +
        ' µV sits on both electrodes equally, so it is gone from the difference.' : '';
    var xt = S.off ? ' A source <b>' + fmt(S.off, 0) + ' mm</b> off centre is <b>not</b> common ' +
        'to the two electrodes, so it survives — differencing removes hum, not crosstalk.' : '';
    out.innerHTML = 'The two electrodes see the same potential <b>' + fmt(v.tau * 1000, 2) +
      ' ms</b> apart, so the difference is biphasic. Differencing is a comb filter with its ' +
      'first zero at v/d = <b>' + fmt(f0, 0) + ' Hz</b>' +
      (f0 < 450 ? ' — <b>inside</b> the 20–450 Hz EMG band.' : ' — clear of the EMG band.') +
      hum + xt;
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  slider(g2, 'Electrode spacing d', 5, 40, 1, S.d,
    function (v) { return fmt(v, 0) + ' mm'; }, function (v) { S.d = v; draw(); });
  slider(g2, 'Conduction velocity v', 2, 6, 0.1, S.cv,
    function (v) { return fmt(v, 1) + ' m/s'; }, function (v) { S.cv = v; draw(); });
  slider(g2, 'Mains hum on both', 0, 50, 1, S.hum,
    function (v) { return fmt(v * 10, 0) + ' µV'; }, function (v) { S.hum = v; draw(); });
  slider(g2, 'Crosstalk offset', 0, 12, 1, S.off,
    function (v) { return v ? fmt(v, 0) + ' mm' : 'none'; }, function (v) { S.off = v; draw(); });

  if (!port) {
    var row = ctlRow(u.ctl);
    keepOut(seg(row, [['time', 'The two signals'], ['both', 'Add the spectrum']],
      'time', function (k) { S.view = k; draw(); }));
  }

  draw();
  window.addEventListener('ephe341-theme', draw);
});
/* ======================================================================
   2. RECRUIT — one electrode, many motor units

   His slides 8-10, 21 and 29-32 in one figure.  A pool of motor units is
   recruited in size order (Henneman); each one that is active fires a
   train of MUAPs; the electrode sees the algebraic SUM.

   The model follows the usual Fuglevand convention:
     - recruitment thresholds are spread exponentially over the pool, so
       most units are small and come in early;
     - twitch force spans 100:1 from the first unit to the last;
     - MUAP amplitude goes as the square root of twitch force, because a
       bigger unit has more fibres but they are not all nearer the
       electrode;
     - firing rate climbs from 8 Hz at recruitment to 35 Hz at full drive.

   The teaching point is the one the arithmetic gives for free: independent
   trains add in POWER, so with equal units RMS would grow as sqrt(N)
   (checked: exponent 0.504).  Size ordering makes it steeper than that,
   and THAT is why the EMG-force relationship curves upward instead of
   being a straight line.  His slide 49 asserts the curve; this derives it.
   ====================================================================== */
D.register('recruit', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  /* k is the exponent in  MUAP amplitude ~ (twitch force)^k.  It is NOT a
     settled number, and the whole shape of the EMG-force curve turns on it,
     so the deck puts it on a slider rather than hiding it in a constant. */
  var S = { exc: 30, k: 0.5, rr: 85 };

  var NU = 120, FS = 2000, DUR = 0.5;
  var ax = new Axes(u.cv, { w: port ? 460 : 1100, h: port ? 520 : 374,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  /* --- the pool, fixed once so the picture is stable across redraws --- */
  var POOL = (function () {
    var p = [], i;
    for (i = 0; i < NU; i++) {
      var f = i / (NU - 1);
      p.push({
        tf:   Math.exp(f * Math.log(70)) / 70,                 /* exponential, 1/70..1 */
        P:    Math.exp(f * Math.log(100)),                     /* twitch force 1..100 */
        /* peak rate falls with unit size: small early units reach ~40 Hz,
           the big late ones only ~25 Hz (Fuglevand).  Giving every unit the
           SAME peak rate made all the trains share one period at full drive,
           and the systematic cancellation that followed pulled the summed
           RMS back down -- an artefact of the model, not physiology. */
        peak: 40 - 15 * f,
        ph:   (i * 0.6180339887) % 1                           /* fixed phase per unit */
      });
    }
    return p;
  })();

  /* Recruitment range: the drive at which the LAST unit joins in. Small hand
     muscles finish recruiting by about half of maximum effort and everything
     above that is rate coding; large limb muscles keep recruiting to ~85 %.
     That difference is the usual explanation for why the EMG-force
     relationship is not the same shape in every muscle. */
  function thrOf(i) { return POOL[i].tf * (S.rr / 100); }
  function active(exc) {
    var e = exc / 100, out = [];
    for (var i = 0; i < NU; i++) {
      var th = thrOf(i);
      if (th <= e) {
        var span = Math.max(1e-6, 1 - th);
        var r = 8 + (POOL[i].peak - 8) * Math.min(1, (e - th) / span);
        out.push({ u: POOL[i], rate: r });
      }
    }
    return out;
  }
  /* a unit firing at rate r makes a fraction of its tetanic force; the
     twitches fuse as the rate rises, so force saturates */
  function fuse(r) { return 1 - Math.exp(-r / 14); }

  /* force at full drive, so '% of maximum' means % of maximum VOLUNTARY
     force rather than % of a tetanus nobody can produce */
  function fmax() {
    var f = 0, a = active(100);
    for (var i = 0; i < a.length; i++) f += a[i].u.P * fuse(a[i].rate);
    return f;
  }
  var FMAX = 1;
  function forceOf(act) {
    var f = 0;
    for (var i = 0; i < act.length; i++) f += act[i].u.P * fuse(act[i].rate);
    return f / FMAX * 100;
  }

  function ampOf(unit) { return Math.pow(unit.P, S.k); }

  function signal(act, dur) {
    dur = dur || DUR;
    var n = Math.round(dur * FS), y = new Float64Array(n), i, k;
    var w = Math.round(0.012 * FS);
    for (k = 0; k < act.length; k++) {
      var a = act[k], isi = 1 / a.rate, sgn = (k % 2) ? 1 : -1;
      /* a deterministic jitter sequence: motor-unit interspike intervals have
         a coefficient of variation near 0.2, and without it the trains stay
         locked to each other.  Deterministic so the figure does not flicker. */
      var jseed = (k * 2654435761) % 1013;
      for (var t = a.u.ph * isi; t < dur; t += isi * (1 + 0.2 * (((jseed = (jseed * 1103515245 + 12345) % 2147483648) / 2147483648) - 0.5) * 2)) {
        var i0 = Math.round(t * FS);
        for (i = Math.max(0, i0 - w); i < Math.min(n, i0 + w); i++)
          y[i] += muap((i - i0) / FS, 0.008, ampOf(a.u) * sgn);
      }
    }
    return y;
  }

  /* the EMG-force curve, rebuilt when k changes and cached for that k */
  var CURVE = [], curveKey = null;
  function buildCurve() {
    var kk = S.k + ':' + S.rr;
    if (curveKey === kk) return;
    FMAX = fmax();
    var pts = [], mx = 0;
    for (var e = 2; e <= 100; e += 2) {
      /* a 500 ms window leaves enough RMS scatter to make the curve look
         ragged; the curve points use 2 s, which is cached anyway */
      var act = active(e), r = rms(signal(act, 2.0));
      mx = Math.max(mx, r);
      pts.push({ exc: e, force: forceOf(act), rms: r, n: act.length });
    }
    /* normalise by the LARGEST amplitude on the curve, not the last point:
       the sum is not guaranteed monotonic and the last point was letting the
       readout print values above 100 % */
    pts.forEach(function (p) { p.rel = p.rms / mx * 100; });
    CURVE = pts; curveKey = kk;
  }
  function atExc(e) {
    return CURVE.reduce(function (a, b) {
      return Math.abs(b.exc - e) < Math.abs(a.exc - e) ? b : a; });
  }

  function drawSignal(x0, y0, w, h, act, y) {
    var c = ax.c, K = C();
    var pl = 16, pr = 14, pt = 20, pb = 28;
    var mx = 0; for (var i = 0; i < y.length; i++) mx = Math.max(mx, Math.abs(y[i]));
    mx = Math.max(mx, 4);
    var cy = y0 + (h - pb + pt) / 2;
    c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1; c.setLineDash([3, 4]);
    c.beginPath(); c.moveTo(x0 + pl, cy); c.lineTo(x0 + w - pr, cy); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 1.1; c.beginPath();
    for (i = 0; i < y.length; i++) {
      var px = x0 + pl + i / (y.length - 1) * (w - pl - pr);
      var py = cy - y[i] / mx * ((h - pt - pb) / 2 - 4);
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke(); c.restore();
    label(c, act.length + ' of ' + NU + ' units active', x0 + pl + 4, y0 + pt - 6,
          { color: K.INK, size: 12, align: 'left' });
    label(c, fmt(DUR * 1000, 0) + ' ms of signal at one electrode',
          x0 + w / 2, y0 + h - 8, { color: K.MUT, size: 11 });
  }

  function drawCurve(x0, y0, w, h, act) {
    var c = ax.c, K = C();
    var pl = 52, pr = 18, pt = 24, pb = 34;
    var X = function (f) { return x0 + pl + f / 100 * (w - pl - pr); };
    var Y = function (r) { return y0 + h - pb - r / 100 * (h - pt - pb); };
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + pl, y0 + pt); c.lineTo(x0 + pl, y0 + h - pb);
    c.lineTo(x0 + w - pr, y0 + h - pb); c.stroke(); c.restore();
    [0, 50, 100].forEach(function (v) {
      label(c, String(v), x0 + pl - 7, Y(v), { color: K.MUT, size: 10.5, align: 'right' });
      label(c, String(v), X(v), y0 + h - pb + 12, { color: K.MUT, size: 10.5 });
    });
    /* the straight line EMG is so often assumed to follow */
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .65; c.setLineDash([5, 5]); c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(100), Y(100)); c.stroke(); c.restore();
    label(c, 'if it were proportional', X(62), Y(40),
          { color: K.MUT, size: 10.5, plate: true });
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.8; c.beginPath();
    CURVE.forEach(function (p, i) { i ? c.lineTo(X(p.force), Y(p.rel)) : c.moveTo(X(p.force), Y(p.rel)); });
    c.stroke(); c.restore();
    var cur = atExc(S.exc);
    c.save(); c.fillStyle = K.ACC; c.beginPath();
    c.arc(X(cur.force), Y(cur.rel), 5.5, 0, 7); c.fill(); c.restore();
    label(c, 'force (% of maximum)', x0 + (w + pl) / 2, y0 + h - 9, { color: K.MUT, size: 11 });
    label(c, 'EMG amplitude (% of max)', x0 + pl + 4, y0 + pt - 8,
          { color: K.MUT, size: 11, align: 'left' });
  }

  function draw() {
    var W = ax.W, H = ax.H;
    ax.clear();
    buildCurve();
    var act = active(S.exc), y = signal(act);
    if (port) {
      drawSignal(0, 0, W, H * 0.52, act, y);
      drawCurve(0, H * 0.52, W, H * 0.48, act);
    } else {
      drawSignal(0, 0, W * 0.56, H, act, y);
      drawCurve(W * 0.56, 0, W * 0.44, H, act);
    }
    var cur = atExc(S.exc);
    var bend = cur.rel > cur.force + 2 ? 'above' : cur.rel < cur.force - 2 ? 'below' : 'on';
    out.innerHTML = 'At <b>' + fmt(S.exc, 0) + ' %</b> drive, <b>' + act.length +
      '</b> of ' + NU + ' units are active: <b>' + fmt(cur.force, 0) +
      ' %</b> of maximum force and <b>' + fmt(cur.rel, 0) + ' %</b> of maximum EMG — ' +
      bend + ' the line of proportionality. Independent trains add in <b>power</b>, not ' +
      'amplitude, and the bend is set by the two assumptions on the right: how much louder a ' +
      'big unit is than a small one, and how far up the range recruitment continues. The shape ' +
      'of the EMG–force relationship is not a law.';
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  slider(g2, 'Neural drive', 2, 100, 1, S.exc,
    function (v) { return fmt(v, 0) + ' %'; }, function (v) { S.exc = v; draw(); });
  slider(g2, 'Size exponent', 0.3, 1, 0.05, S.k,
    function (v) { return 'k = ' + fmt(v, 2); },
    function (v) { S.k = v; draw(); });
  slider(g2, 'Recruited by', 30, 100, 5, S.rr,
    function (v) { return fmt(v, 0) + ' %'; }, function (v) { S.rr = v; draw(); });
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

   Source: Cartier et al., six participants, 30 s all-out leg cycling,
   vastus lateralis.  Median frequency and RMS are computed PER BURST --
   over the active part of each pedal revolution -- because a whole-second
   window during cycling is mostly silence, and silence has a spectrum of
   its own that drags the estimate around.

   The result is not the clean textbook figure, and the deck says so:
   amplitude rises in 6 of 6, median frequency falls in only 4 of 6.  The
   decline is a tendency, not a law, and it is far more reliable in
   sustained isometric contractions than in dynamic cycling.
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
    label(c, 'time through the 30 s sprint (s)', x0 + pl + (w - pl - pr) / 2, y0 + h - 8,
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

  function draw() {
    var W = ax.W, H = ax.H, K = C();
    ax.clear();
    var rows = FAT.rows[S.p] || [];
    if (!rows.length) { label(ax.c, 'no data', W / 2, H / 2, { color: K.MUT }); return; }
    var fmf, frm, sum;
    if (port) {
      fmf = scatter(0, 0, W, H * 0.36, rows, 1, K.ACC, S.p + ' · median frequency', 'Hz');
      frm = scatter(0, H * 0.36, W, H * 0.34, rows, 2, K.VIO, S.p + ' · RMS amplitude', 'µV');
      sum = summary(0, H * 0.70, W, H * 0.30);
    } else {
      fmf = scatter(0, 0, W * 0.37, H, rows, 1, K.ACC, S.p + ' · median frequency', 'Hz');
      frm = scatter(W * 0.37, 0, W * 0.37, H, rows, 2, K.VIO, S.p + ' · RMS amplitude', 'µV');
      sum = summary(W * 0.74, 0, W * 0.26, H);
    }
    out.innerHTML = 'Vastus lateralis through a 30 s all-out sprint, one point per pedal ' +
      'revolution. For <b>' + S.p + '</b> the median frequency goes ' +
      (fmf.slope < 0 ? '<b>down</b> ' : '<b>up</b> ') + fmt(Math.abs(fmf.slope) * 30, 0) +
      ' Hz over the sprint (r = ' + num(fmf.r, 2) + ') while amplitude goes ' +
      (frm.slope > 0 ? '<b>up</b>' : '<b>down</b>') + ' (r = ' + num(frm.r, 2) + '). ' +
      'Across all ' + sum.n + ' participants amplitude rises in <b>' + sum.up + '</b> of them ' +
      'but median frequency falls in only <b>' + sum.neg + '</b>. The frequency shift is a ' +
      'tendency, not a law — it is far more reliable in a sustained isometric hold than in ' +
      'dynamic cycling, where the muscle is only active for part of each revolution and the ' +
      'detection volume moves under the skin.';
  }

  var out = readout(u.ctl);
  var row = ctlRow(u.ctl);
  keepOut(chips(row, PS.map(function (p) { return [p, p]; }), S.p,
    function (k) { S.p = k; draw(); }));
  draw();
  window.addEventListener('ephe341-theme', draw);
});
/* ======================================================================
   5. FIBRE — where you put the electrodes, and why it matters

   His slides 23, 34, 35 and 36.  The action potential is generated at the
   motor end-plate and propagates BOTH WAYS along the fibre at cv, dying at
   the tendons.  An electrode sees it arrive at t = |x - iz| / cv.

   Put the pair astride the end-plate and the two electrodes see mirror
   images of each other: the difference collapses.  That is not a rule of
   thumb, it falls out of the geometry, and the sweep panel measures it --
   a deep null at the innervation zone and a fade towards the tendon where
   the propagating wave has nowhere left to go.

   MODELLED, not measured: the Cartier recordings have no electrode array,
   so there is no conduction velocity in this deck taken from data.
   ====================================================================== */
D.register('fibre', function (node, d) {
  var port = D.portrait();
  var u = build(node, {});
  var S = { x: 42, d: 20, iz: 60, cv: 4.0 };
  var L = 120;                                   /* fibre length, mm */

  var ax = new Axes(u.cv, { w: port ? 460 : 1090, h: port ? 520 : 390,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });

  /* what an electrode at position e (mm) sees, as a function of time */
  function seen(e, t) {
    var dist = Math.abs(e - S.iz);
    if (e < 0 || e > L) return 0;
    /* the wave fades over the last 8 mm: at the tendon there is no more
       fibre to propagate along, so the travelling component disappears */
    var room = (e < S.iz) ? e : (L - e);
    var taper = Math.min(1, room / 8);
    return taper * muap(t - dist * 1e-3 / S.cv, 0.008);
  }
  function pairAt(x) {
    var e1 = x - S.d / 2, e2 = x + S.d / 2, pp = 0, lo = 1e9, hi = -1e9;
    for (var i = 0; i <= 400; i++) {
      var t = -0.004 + i / 400 * 0.030;
      var v = seen(e1, t) - seen(e2, t);
      lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
    return hi - lo;
  }

  function drawFibre(x0, y0, w, h) {
    var c = ax.c, K = C();
    var pl = 30, pr = 30;
    var X = function (mm) { return x0 + pl + mm / L * (w - pl - pr); };
    var cy = y0 + h * 0.42;
    /* the fibre */
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .35; c.lineWidth = 26; c.lineCap = 'round';
    c.beginPath(); c.moveTo(X(0), cy); c.lineTo(X(L), cy); c.stroke(); c.restore();
    label(c, 'tendon', X(0), cy + 30, { color: K.MUT, size: 10.5 });
    label(c, 'tendon', X(L), cy + 30, { color: K.MUT, size: 10.5 });
    /* the end-plate, and the two wavefronts leaving it */
    c.save(); c.fillStyle = K.GRN; c.beginPath(); c.arc(X(S.iz), cy, 6, 0, 7); c.fill(); c.restore();
    label(c, 'innervation zone', X(S.iz), cy + 30, { color: K.GRN, size: 11, plate: true });
    arrow(c, X(S.iz) - 8, cy, X(S.iz) - 34, cy, { color: K.GRN, width: 2, head: 8 });
    arrow(c, X(S.iz) + 8, cy, X(S.iz) + 34, cy, { color: K.GRN, width: 2, head: 8 });
    /* the pair */
    [[S.x - S.d / 2, K.BLUE, '1'], [S.x + S.d / 2, K.VIO, '2']].forEach(function (e) {
      var inside = e[0] >= 0 && e[0] <= L;
      c.save(); c.fillStyle = inside ? e[1] : K.MUT; c.globalAlpha = inside ? 1 : .35;
      c.fillRect(X(e[0]) - 7, cy - 20, 14, 40); c.restore();
      label(c, e[2], X(e[0]), cy - 30, { color: e[1], size: 11.5 });
    });
    label(c, 'pair centred ' + num(Math.abs(S.x - S.iz), 0) + ' mm from the end-plate',
          x0 + w / 2, y0 + h - 8, { color: K.MUT, size: 11 });
  }

  function drawTraces(x0, y0, w, h) {
    var c = ax.c, K = C();
    var pl = 20, pr = 16, pt = 16, pb = 26;
    var X = function (t) { return x0 + pl + (t + 0.004) / 0.030 * (w - pl - pr); };
    var e1 = S.x - S.d / 2, e2 = S.x + S.d / 2;
    var lanes = [[function (t) { return seen(e1, t); }, K.BLUE, 'electrode 1'],
                 [function (t) { return seen(e2, t); }, K.VIO, 'electrode 2'],
                 [function (t) { return seen(e1, t) - seen(e2, t); }, K.ACC, 'difference']];
    var lh = (h - pt - pb) / 3;
    lanes.forEach(function (ln, k) {
      var cy = y0 + pt + lh * (k + 0.5);
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1; c.setLineDash([3, 4]);
      c.beginPath(); c.moveTo(x0 + pl, cy); c.lineTo(x0 + w - pr, cy); c.stroke(); c.restore();
      c.save(); c.strokeStyle = ln[1]; c.lineWidth = k === 2 ? 2.6 : 1.8; c.beginPath();
      for (var i = 0; i <= 300; i++) {
        var t = -0.004 + i / 300 * 0.030;
        var px = X(t), py = cy - ln[0](t) / 2.3 * (lh * 0.42);
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke(); c.restore();
      label(c, ln[2], x0 + pl + 3, cy - lh * 0.38,
            { color: ln[1], size: 11, align: 'left', plate: true });
    });
    label(c, '30 ms', x0 + pl + (w - pl - pr) / 2, y0 + h - 8, { color: K.MUT, size: 11 });
  }

  function drawSweep(x0, y0, w, h) {
    var c = ax.c, K = C();
    var pl = 46, pr = 16, pt = 24, pb = 32;
    var pts = [], mx = 0;
    for (var mm = 4; mm <= L - 4; mm += 1) { var v = pairAt(mm); pts.push([mm, v]); mx = Math.max(mx, v); }
    mx = mx || 1;
    var X = function (mm) { return x0 + pl + mm / L * (w - pl - pr); };
    var Y = function (v) { return y0 + h - pb - v / (mx * 1.1) * (h - pt - pb); };
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + pl, y0 + pt); c.lineTo(x0 + pl, y0 + h - pb);
    c.lineTo(x0 + w - pr, y0 + h - pb); c.stroke(); c.restore();
    [0, 30, 60, 90, 120].forEach(function (mm) {
      label(c, String(mm), X(mm), y0 + h - pb + 12, { color: K.MUT, size: 10.5 });
    });
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.6; c.beginPath();
    pts.forEach(function (p, i) { i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1])); });
    c.stroke(); c.restore();
    /* mark the end-plate and the current pair position */
    c.save(); c.strokeStyle = K.GRN; c.setLineDash([4, 4]); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(X(S.iz), y0 + pt); c.lineTo(X(S.iz), y0 + h - pb); c.stroke(); c.restore();
    label(c, 'end-plate', X(S.iz), y0 + pt - 9, { color: K.GRN, size: 10.5, plate: true });
    c.save(); c.fillStyle = K.INK; c.beginPath(); c.arc(X(S.x), Y(pairAt(S.x)), 5, 0, 7); c.fill(); c.restore();
    label(c, 'signal you would record', x0 + pl + 4, y0 + pt - 9,
          { color: K.MUT, size: 10.5, align: 'left' });
    label(c, 'where you put the pair (mm along the fibre)',
          x0 + pl + (w - pl - pr) / 2, y0 + h - 8, { color: K.MUT, size: 11 });
  }

  function draw() {
    var W = ax.W, H = ax.H;
    ax.clear();
    if (port) {
      drawFibre(0, 0, W, H * 0.22);
      drawTraces(0, H * 0.22, W, H * 0.44);
      drawSweep(0, H * 0.66, W, H * 0.34);
    } else {
      drawFibre(0, 0, W * 0.52, H * 0.30);
      drawTraces(0, H * 0.30, W * 0.52, H * 0.70);
      drawSweep(W * 0.52, 0, W * 0.48, H);
    }
    var pp = pairAt(S.x), best = 0;
    for (var mm = 4; mm <= L - 4; mm += 1) best = Math.max(best, pairAt(mm));
    var rel = best ? pp / best * 100 : 0;
    var off = S.x - S.iz;
    out.innerHTML = 'The pair sits <b>' + fmt(Math.abs(off), 0) + ' mm</b> ' +
      (Math.abs(off) < 2 ? 'on top of' : (off > 0 ? 'past' : 'short of')) +
      ' the end-plate and records <b>' + fmt(rel, 0) + ' %</b> of the best signal available on ' +
      'this fibre. Astride the innervation zone the two electrodes see mirror images and the ' +
      'difference <b>cancels</b>; close to the tendon the travelling wave has run out of fibre. ' +
      'The two spikes flanking the null are a trap, not a target: there the amplitude swings ' +
      'from nothing to everything over a few millimetres, so a sensor that shifts slightly on ' +
      'the skin changes your answer. The flat plateau over the belly is the only stable place. ' +
      '<span style="opacity:.72">Modelled: there is no electrode array in this dataset, so no ' +
      'conduction velocity here is measured.</span>';
  }

  var out = readout(u.ctl);
  var g2 = el('div', 'ictls g2'); u.ctl.appendChild(g2);
  slider(g2, 'Pair position', 6, L - 6, 1, S.x,
    function (v) { return fmt(v, 0) + ' mm'; }, function (v) { S.x = v; draw(); });
  slider(g2, 'Innervation zone at', 20, L - 20, 1, S.iz,
    function (v) { return fmt(v, 0) + ' mm'; }, function (v) { S.iz = v; draw(); });
  slider(g2, 'Electrode spacing', 5, 40, 1, S.d,
    function (v) { return fmt(v, 0) + ' mm'; }, function (v) { S.d = v; draw(); });
  slider(g2, 'Conduction velocity', 2, 6, 0.1, S.cv,
    function (v) { return fmt(v, 1) + ' m/s'; }, function (v) { S.cv = v; draw(); });
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

/* build every .iplot on the page; deck-core walks the DOM for data-widget */
D.boot();
})();
