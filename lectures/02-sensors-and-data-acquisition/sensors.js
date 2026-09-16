/* ============================================================
   EPHE 341 — Sensors and Data Acquisition
   Interactive figures. Needs deck-core.js. No other dependencies.
   ============================================================ */
(function () {
'use strict';

var D = window.DECK;
var Axes = D.Axes, el = D.el, slider = D.slider, playBtn = D.playBtn,
    readout = D.readout, build = D.build, niceRange = D.niceRange, axisTicks = D.axisTicks;
function C() { return D.colors(); }

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
function labelled(host, text, node) {
  var w = el('div', 'iseg-lab');
  w.innerHTML = '<span>' + text + '</span>';
  w.appendChild(node); host.appendChild(w); return w;
}

/* ============================================================
   1. STRAIN GAUGE
   Bend the beam and watch the resistance, and therefore the voltage,
   follow. V = IR is the whole trick.
   ============================================================ */
D.register('strain', function (node, d) {
  var u = build(node);
  u.cv.parentNode.parentNode.classList.add('isplit', 'iimu');
  var side = el('div', 'icalc');
  u.cv.parentNode.parentNode.insertBefore(side, u.ctl);
  /* This one draws in raw pixels rather than through the axes, so it cannot be
     rescaled automatically. In portrait the beam goes above the trace instead
     of beside it, in a squarer box. */
  var TALL = D.portrait();
  var CW = TALL ? 545 : 980, CH = TALL ? 500 : 330;
  var ax = new Axes(u.cv, { w: CW, h: CH, padl: 0, padr: 0, padt: 0, padb: 0,
                            fluid: false,
                            xmin: 0, xmax: CW, ymin: CH, ymax: 0 });
  var out = readout(u.ctl);

  var GF = 2.0, R0 = 120, VEX = 5.0;      /* gauge factor, ohms, excitation volts */
  var force = 0, playing = false, raf = null, t0 = 0, vt = 0;
  var hist = [];                           /* [t, volts] */
  var TH = 3.2;                            /* seconds of trace */

  function strainOf(f) { return f * 4e-5; }   /* µε per newton, a plausible beam */

  function draw() {
    var c = ax.c, K = C(), i;
    var eps = strainOf(force);
    var dR = GF * eps * R0;
    var vout = VEX * GF * eps * 1000;        /* mV, full bridge */
    ax.clear();

    /* ---- the beam, bent ---- */
    /* a downward tip load bends the beam down and puts the TOP fibres in tension,
       so a positive force here means "push the tip down" */
    var bx = TALL ? 60 : 46, by = TALL ? 120 : 140,
        bw = TALL ? 430 : 380, bh = 26, bend = force * 0.34;
    c.save();
    c.fillStyle = K.PLATE; c.strokeStyle = K.PANEL; c.lineWidth = 1;
    c.fillRect(bx - 22, by - 44, 22, bh + 88);          /* the wall */
    c.strokeRect(bx - 22, by - 44, 22, bh + 88);
    function beamY(x, off) {                             /* cantilever shape */
      var s = (x - bx) / bw;
      return by + off + bend * s * s * (3 - s) / 2;
    }
    c.beginPath();
    c.moveTo(bx, beamY(bx, 0));
    for (i = 0; i <= 40; i++) { var x = bx + bw * i / 40; c.lineTo(x, beamY(x, 0)); }
    for (i = 40; i >= 0; i--) { var x2 = bx + bw * i / 40; c.lineTo(x2, beamY(x2, bh)); }
    c.closePath();
    c.fillStyle = K.FILL0; c.fill();
    c.strokeStyle = K.INK; c.lineWidth = 1.6; c.stroke();

    /* ---- the two gauges, top and bottom ---- */
    [[0, 'top'], [bh, 'bottom']].forEach(function (g) {
      var off = g[0], top = g[1] === 'top';
      var stretched = top ? force > 0 : force < 0;
      var mag = Math.min(1, Math.abs(force) / 100);
      var col = Math.abs(force) < 1 ? K.MUT : (stretched ? K.ACC : K.BLUE);
      var gx = bx + 70, gw = 120;
      c.save();
      c.strokeStyle = col; c.lineWidth = 2.2; c.lineCap = 'round';
      var n = 7, amp = 6 * (1 + (stretched ? -0.3 : 0.3) * mag);
      c.beginPath();
      for (i = 0; i <= n * 2; i++) {
        var xx = gx + gw * i / (n * 2);
        var yy = beamY(xx, off) + (top ? -5 : 5) + ((i % 2) ? -amp : amp) * (top ? 1 : -1) * 0.5;
        i ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
      }
      c.stroke(); c.restore();
      /* the legend goes under the beam, where there is room for it */
      if (Math.abs(force) > 1) {
        var ly = (TALL ? 236 : 254) + (top ? 0 : 22);
        c.fillStyle = col;
        c.fillRect(bx, ly - 4, 16, 3);
        c.font = '600 12.5px ui-sans-serif,system-ui,sans-serif';
        c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillText((top ? 'top gauge — ' : 'bottom gauge — ') +
          (stretched ? 'stretched, resistance up' : 'squeezed, resistance down'), bx + 24, ly - 3);
      }
    });

    /* ---- the force arrow ---- */
    if (Math.abs(force) > 1) {
      var tipx = bx + bw - 6, tipy = beamY(bx + bw, bh / 2);
      var d = force > 0 ? 1 : -1;                  /* + force pushes the tip down */
      c.strokeStyle = K.ACC; c.lineWidth = 2.6; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(tipx, tipy - d * 64); c.lineTo(tipx, tipy - d * 22); c.stroke();
      c.beginPath();
      c.moveTo(tipx, tipy - d * 12);
      c.lineTo(tipx - 7, tipy - d * 28); c.lineTo(tipx + 7, tipy - d * 28);
      c.closePath(); c.fillStyle = K.ACC; c.fill();
      c.font = '700 13px ui-sans-serif,system-ui,sans-serif';
      c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText('F', tipx + 10, tipy - d * 52);
    }
    c.restore();

    /* ---- the voltage trace ---- */
    var px = TALL ? 60 : 500, py = TALL ? 266 : 30,
        pw = TALL ? 320 : 330, ph = TALL ? 206 : 250;
    c.save();
    c.strokeStyle = K.INK; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + ph); c.lineTo(px + pw, py + ph); c.stroke();
    c.fillStyle = K.MUT; c.font = '600 12.5px ui-sans-serif,system-ui,sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText('time', px + pw / 2, py + ph + 8);
    c.save(); c.translate(px - 34, py + ph / 2); c.rotate(-Math.PI / 2);
    c.textBaseline = 'bottom'; c.fillText('voltage out', 0, 0); c.restore();
    var VMAX = 4.4;
    function vy(v) { return py + ph / 2 - (v / VMAX) * (ph / 2 - 14); }
    [['Tension', 2.4, K.ACC], ['Rest', 0, K.MUT], ['Compression', -2.4, K.BLUE]].forEach(function (r) {
      c.strokeStyle = r[2]; c.globalAlpha = .55; c.lineWidth = 1;
      c.setLineDash(r[1] === 0 ? [] : [5, 4]);
      c.beginPath(); c.moveTo(px, vy(r[1])); c.lineTo(px + pw, vy(r[1])); c.stroke();
      c.setLineDash([]); c.globalAlpha = 1;
      c.fillStyle = r[2]; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.font = '600 12px ui-sans-serif,system-ui,sans-serif';
      c.fillText(r[0], px + pw + 6, vy(r[1]));
    });
    if (hist.length > 1) {
      c.save();
      c.beginPath(); c.rect(px, py, pw, ph); c.clip();   /* the trace stays in its panel */
      c.strokeStyle = K.GRN; c.lineWidth = 2.4; c.beginPath();
      var first = true;
      hist.forEach(function (h) {
        var x = px + pw * (1 - (hist[hist.length - 1][0] - h[0]) / TH);
        if (x < px - pw) { first = true; return; }       /* older than the window */
        first ? c.moveTo(x, vy(h[1])) : c.lineTo(x, vy(h[1]));
        first = false;
      });
      c.stroke(); c.restore();
      var last = hist[hist.length - 1];
      c.fillStyle = K.GRN;
      c.beginPath(); c.arc(px + pw, vy(last[1]), 4.5, 0, 7); c.fill();
    }
    c.restore();

    /* ---- the arithmetic ---- */
    var state = Math.abs(force) < 1 ? 'at rest' : (force > 0 ? 'in tension' : 'in compression');
    side.innerHTML =
      '<div class="icalc-h">the top gauge is <span class="v">' + state + '</span></div>' +
      '<div class="icalc-work">' +
        '<div class="icalc-t">strain in the gauge</div>' +
        '<div class="icalc-eq">ε = <b>' + (eps * 1e6).toFixed(0) + '</b> µε</div>' +
        '<div class="icalc-t" style="margin-top:.45em">resistance follows the strain</div>' +
        '<div class="icalc-eq">ΔR = GF · ε · R = 2.0 · ε · 120 Ω</div>' +
        '<div class="icalc-eq">R = <b>' + (R0 + dR).toFixed(3) + '</b> Ω ' +
          '<span class="muted">(' + (dR >= 0 ? '+' : '') + dR.toFixed(3) + ')</span></div>' +
        '<div class="icalc-t" style="margin-top:.45em">and V = IR turns that into volts</div>' +
        '<div class="icalc-eq">V<sub>out</sub> = <b>' + vout.toFixed(1) + '</b> mV</div>' +
      '</div>' +
      '<div class="icalc-vals">' +
        '<div><span>F</span><b>' + force.toFixed(0) + ' N</b></div>' +
        '<div><span>R</span><b>' + (R0 + dR).toFixed(2) + '</b></div>' +
        '<div><span>V</span><b>' + vout.toFixed(0) + '</b></div>' +
      '</div>';

    out.innerHTML =
      'force <b>' + force.toFixed(0) + '</b> N &nbsp;·&nbsp; strain <b>' + (eps * 1e6).toFixed(0) +
      '</b> µε &nbsp;·&nbsp; resistance <b>' + (R0 + dR).toFixed(3) +
      '</b> Ω &nbsp;·&nbsp; out <b class="r">' + vout.toFixed(1) + '</b> mV' +
      '<span class="hint">a gauge is a resistor glued to something bendy — bend it and its ' +
      'resistance changes, and V = IR turns that into a voltage you can record</span>';
  }

  /* The trace runs on its own clock. While the animation plays that clock is real
     time; while you drag the slider it advances a fixed step per change, so the
     trace draws itself as you drag instead of leaving a gap while you think. */
  function push(v, at) {
    vt = at == null ? vt + 0.05 : at;
    hist.push([vt, v]);
    while (hist.length > 2 && vt - hist[0][0] > TH) hist.shift();
  }

  var s1 = slider(u.ctl, 'Applied force', -100, 100, 1, 0,
    function (v) { return v.toFixed(0) + ' N'; },
    function (v) { force = v; if (!playing) { push(v / 100 * 3.2); draw(); } });

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  var pb = playBtn(row, '▶ Wobble the beam');
  pb.addEventListener('click', function () {
    playing = !playing;
    pb.textContent = playing ? '❚❚ Stop' : '▶ Wobble the beam';
    if (playing) { t0 = performance.now() - vt * 1000; loop(); }
    else cancelAnimationFrame(raf);
  });
  function loop() {
    var now = (performance.now() - t0) / 1000;
    force = 82 * Math.sin(now * 2.1);
    s1.input.value = force; s1.quiet(force);
    push(force / 100 * 3.2, now);
    draw();
    raf = requestAnimationFrame(loop);
  }

  node._draw = draw;
  node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Wobble the beam'; };
  push(0, 0); draw();
});

/* ============================================================
   2. ANALOG vs DIGITAL — and what sampling rate costs you
   ============================================================ */
D.register('sampling', function (node, d) {
  var u = build(node);
  /* the two panes sit side by side on a wide slide and stack on a phone */
  var STACK = D.portrait();
  var PL = 56, PR = 20, PT = 14, PB = 42;
  var ax = new Axes(u.cv, STACK
    ? { w: 470, h: 520, padl: PL, padr: PR, padb: PB, padt: PT, fluid: false,
        xmin: 0, xmax: 1, ymin: -1.25, ymax: 1.25 }
    : { w: 900, h: 300, padl: PL, padr: PR, padb: PB, padt: PT,
        xmin: 0, xmax: 1, ymin: -1.25, ymax: 1.25 });
  var out = readout(u.ctl);
  var fs = parseFloat(d.fs || 20), sigF = parseFloat(d.f || 2), show = d.show || 'both';
  var joinDots = false;
  var T = 1;

  function sig(t) { return Math.sin(2 * Math.PI * sigF * t) * 0.8 + 0.18 * Math.sin(2 * Math.PI * sigF * 3.1 * t); }

  function draw() {
    var K = C(), i;
    ax.clear();
    var both = show === 'both';
    var panes = both ? 2 : 1;
    var gapX = 26, gapY = 44;
    var halfW = (ax.W - PL - PR - gapX) / 2;
    var halfH = (ax.H - PT - PB - gapY) / 2;
    for (var p = 0; p < panes; p++) {
      var which = both ? (p === 0 ? 'analog' : 'digital') : show;
      var last = p === panes - 1;
      if (both && STACK) {
        ax.pl = PL; ax.pr = PR;
        ax.pt = PT + p * (halfH + gapY); ax.pb = ax.H - (ax.pt + halfH);
      } else if (both) {
        ax.pt = PT; ax.pb = PB;
        ax.pl = PL + p * (halfW + gapX); ax.pr = ax.W - (ax.pl + halfW);
      } else {
        ax.pl = PL; ax.pr = PR; ax.pt = PT; ax.pb = PB;
      }
      ax.frame({ grid: false, zero: true,
        xticks: (STACK && both && !last) ? [] : [0, 0.25, 0.5, 0.75, 1],
        xfmt: function (v) { return v.toFixed(2); },
        yticks: [-1, 0, 1],
        xlabel: (STACK && both && !last) ? null : 'time (s)',
        ylabel: 'voltage', ysize: 13,
        yfmt: function (v) { return v.toFixed(0); } });
      if (which === 'analog') {
        ax.fn(sig, { color: K.BLUE, width: 2.6, n: 900 });
        ax.text('analog signal', ax.pl + 6, ax.pt + 6, { px: true, size: 13, weight: '700', color: K.BLUE, base: 'top' });
      } else {
        var pts = [];
        for (i = 0; i <= Math.floor(fs * T); i++) pts.push([i / fs, sig(i / fs)]);
        ax.fn(sig, { color: K.SOFT, width: 1.2, n: 900 });
        if (joinDots) ax.poly(pts, { color: K.ORG, width: 2 });
        pts.forEach(function (q) {
          ax.poly([[q[0], 0], q], { color: K.ORG, width: 1, dash: [3, 3] });
        });
        ax.dots(pts, { color: K.ORG, r: 4 });
        ax.text('digital signal', ax.pl + 6, ax.pt + 6, { px: true, size: 13, weight: '700', color: K.ORG, base: 'top' });
        ax.text(pts.length + ' samples', ax.pl + 6, ax.pt + 24, { px: true, size: 12.5, weight: '600', color: K.MUT, base: 'top' });
      }
    }
    ax.pl = PL; ax.pr = PR; ax.pt = PT; ax.pb = PB;

    var nyq = fs / (2 * sigF);
    out.innerHTML =
      'signal <b>' + sigF.toFixed(1) + '</b> Hz &nbsp;·&nbsp; sampled at <b>' + fs.toFixed(0) +
      '</b> Hz &nbsp;·&nbsp; <b>' + (1000 / fs).toFixed(0) + '</b> ms between samples' +
      '<span class="hint">' + (nyq < 1
        ? 'below two samples per cycle the dots no longer describe the wave — the shape you would draw through them is not the shape that went in'
        : (nyq < 1.5
          ? 'only ' + (fs / sigF).toFixed(1) + ' samples per cycle — enough to know the frequency, not enough to see the shape'
          : (fs / sigF).toFixed(1) + ' samples per cycle')) + '</span>';
  }

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  if (d.controls !== '0') {
    labelled(row, 'show', seg(el('div'), [['both', 'both'], ['analog', 'analog'], ['digital', 'digital']],
      show, function (v) { show = v; draw(); }));
  }
  var jb = el('button', 'ibtn', 'Join the dots');
  jb.addEventListener('click', function () {
    joinDots = !joinDots; jb.classList.toggle('on', joinDots);
    jb.textContent = joinDots ? 'Separate the dots' : 'Join the dots'; draw();
  });
  row.appendChild(jb);

  slider(u.ctl, 'Sampling rate', 3, 60, 1, fs, function (v) { return v.toFixed(0) + ' Hz'; },
    function (v) { fs = v; draw(); });
  if (d.sigctl !== '0') {
    slider(u.ctl, 'Signal frequency', 0.5, 12, 0.5, sigF, function (v) { return v.toFixed(1) + ' Hz'; },
      function (v) { sigF = v; draw(); });
  }
  node._draw = draw;
  draw();
});

/* ============================================================
   3. CALIBRATION — volts in, newtons out
   ============================================================ */
D.register('calib', function (node, d) {
  var u = build(node);
  u.cv.parentNode.parentNode.classList.add('isplit', 'iimu');
  var side = el('div', 'icalc');
  u.cv.parentNode.parentNode.insertBefore(side, u.ctl);
  var ax = new Axes(u.cv, { w: 780, h: 330, padl: 64, padb: 44, padt: 16, xmin: 0, xmax: 110, ymin: 0, ymax: 12 });
  var out = readout(u.ctl);

  /* the slide's own numbers */
  var TRUE_M = 0.06, TRUE_B = 3.5;
  var KNOWN = [25, 50, 75];
  var mode = d.mode || 'linear';
  var taken = [], useV = 6.0, applied = 25;

  function volts(f) {
    if (mode === 'poly') return 2.0 + 0.16 * f - 0.0009 * f * f;
    return TRUE_M * f + TRUE_B;
  }
  function fitted() {
    if (taken.length < 2) return null;
    var n = taken.length, sx = 0, sy = 0, sxy = 0, sxx = 0;
    taken.forEach(function (p) { sx += p[0]; sy += p[1]; sxy += p[0] * p[1]; sxx += p[0] * p[0]; });
    var m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return { m: m, b: (sy - m * sx) / n };
  }

  function draw() {
    var K = C(), f = fitted();
    ax.clear();
    ax.frame({ grid: true, zero: false, xticks: [0, 25, 50, 75, 100],
      yticks: [0, 3, 6, 9, 12], xlabel: 'applied force (N)', ylabel: 'voltage out (V)', ysize: 13,
      yfmt: function (v) { return v.toFixed(0); } });
    /* the sensor's real behaviour, only revealed once calibrated */
    if (f) ax.fn(function (x) { return f.m * x + f.b; }, { color: K.BLUE, width: 2.4, from: 0, to: 110 });
    if (mode === 'poly') ax.fn(volts, { color: K.SOFT, width: 1.4, dash: [5, 4], from: 0, to: 110 });
    ax.dots(taken, { color: K.ACC, r: 5.5 });
    taken.forEach(function (p) {
      ax.poly([[p[0], 0], p], { color: K.MUTED_ACC, width: 1, dash: [3, 3] });
    });
    /* the reading being converted */
    if (f && d.use === '1') {
      var fx = (useV - f.b) / f.m;
      ax.poly([[0, useV], [fx, useV]], { color: K.GRN, width: 1.6, dash: [5, 4] });
      ax.poly([[fx, 0], [fx, useV]], { color: K.GRN, width: 1.6, dash: [5, 4] });
      ax.dots([[fx, useV]], { color: K.GRN, r: 5.5 });
    }

    var html = '';
    if (!taken.length) {
      html = '<div class="icalc-h">nothing measured yet</div>' +
        '<div class="icalc-work"><div class="icalc-t">Hang a known weight on the sensor and record ' +
        'what voltage comes out. Two points is enough for a line; three is better.</div></div>';
    } else {
      html = '<div class="icalc-h"><span class="v">' + taken.length + '</span> known point' +
             (taken.length > 1 ? 's' : '') + ' recorded</div>' +
        '<div class="icalc-work"><table class="icalc-tab"><tr><th>force</th><th>volts</th></tr>' +
        taken.map(function (p) {
          return '<tr><td>' + p[0].toFixed(0) + ' N</td><td>' + p[1].toFixed(2) + ' V</td></tr>';
        }).join('') + '</table></div>';
      if (f) {
        html += '<div class="icalc-work">' +
          '<div class="icalc-t">slope, from rise over run</div>' +
          '<div class="icalc-eq">m = Δy/Δx = <b>' + f.m.toFixed(3) + '</b> V/N</div>' +
          '<div class="icalc-t" style="margin-top:.45em">offset, from y = mx + b</div>' +
          '<div class="icalc-eq">b = <b>' + f.b.toFixed(2) + '</b> V</div>' +
          '</div>';
        if (d.use === '1') {
          html += '<div class="idrift ok"><span>reading ' + useV.toFixed(2) + ' V means</span><b>' +
            ((useV - f.b) / f.m).toFixed(1) + ' N</b><i>x = (y − b) / m</i></div>';
        }
      } else {
        html += '<div class="icalc-work"><div class="icalc-t">one point cannot give a slope — ' +
                'take another at a different force</div></div>';
      }
    }
    side.innerHTML = html;

    out.innerHTML = (f
      ? 'calibrated: <b>V = ' + f.m.toFixed(3) + ' · F + ' + f.b.toFixed(2) + '</b>'
      : 'not calibrated yet') +
      '<span class="hint">' + (mode === 'poly'
        ? 'this sensor is not linear — a straight line through two points will not describe it, which is why non-linear sensors get a polynomial instead'
        : 'the sensor gives volts; the calibration is what turns volts into newtons') + '</span>';
  }

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  var chips = el('div', 'iseg');
  KNOWN.forEach(function (f) {
    var b = el('button', 'iseg-b', 'hang ' + f + ' N');
    b.addEventListener('click', function () {
      if (!taken.some(function (p) { return p[0] === f; })) taken.push([f, volts(f)]);
      taken.sort(function (a, b2) { return a[0] - b2[0]; });
      draw();
    });
    chips.appendChild(b);
  });
  labelled(row, 'record a point', chips);
  var cb = el('button', 'ibtn', 'Start over');
  cb.setAttribute('data-reset', '1');        /* the layout pre-warm uses this to undo itself */
  cb.addEventListener('click', function () { taken = []; draw(); });
  row.appendChild(cb);
  if (d.use === '1') {
    slider(u.ctl, 'Now read a voltage', 3.5, 11, 0.1, useV,
      function (v) { return v.toFixed(2) + ' V'; }, function (v) { useV = v; draw(); });
  }
  node._draw = draw;
  draw();
});

/* ============================================================
   4. MANY SENSORS, ONE DAQ — the multiplexer's bill
   ============================================================ */
var SENSOR_KINDS = [
  { name: 'Strain gauge', unit: 'force',        f: 1.6, shape: 'sine' },
  { name: 'EMG',          unit: 'muscle',       f: 9.0, shape: 'burst' },
  { name: 'Accelerometer', unit: 'acceleration', f: 3.1, shape: 'noisy' },
  { name: 'Goniometer',   unit: 'joint angle',  f: 0.9, shape: 'sine' },
  { name: 'Force plate',  unit: 'ground force', f: 1.2, shape: 'bump' },
  { name: 'Pressure pad', unit: 'pressure',     f: 2.2, shape: 'bump' },
  { name: 'Load cell',    unit: 'load',         f: 0.7, shape: 'sine' },
  { name: 'Thermistor',   unit: 'temperature',  f: 0.25, shape: 'sine' }
];
function sensorSig(k, t) {
  var s = SENSOR_KINDS[k % SENSOR_KINDS.length], w = 2 * Math.PI * s.f * t;
  if (s.shape === 'sine') return Math.sin(w);
  if (s.shape === 'burst') return Math.sin(w) * (0.35 + 0.65 * Math.abs(Math.sin(2 * Math.PI * 0.8 * t)))
    * (0.7 + 0.3 * Math.sin(w * 2.7));
  if (s.shape === 'noisy') return Math.sin(w) * 0.7 + 0.3 * Math.sin(w * 4.3 + 1.1);
  return Math.exp(-Math.pow((t % 1.6 - 0.55) / 0.26, 2)) * 1.7 - 0.85;
}

D.register('multisensor', function (node, d) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 900, h: 372, padl: 26, padr: 92, padb: 40, padt: 12, xmin: 0, xmax: 2, ymin: -1.3, ymax: 1.3 });
  var out = readout(u.ctl);
  var n = parseInt(d.n || 2, 10), base = parseFloat(d.rate || 100), showSkew = true;
  var T = 2;

  function draw() {
    var K = C(), i, j;
    var per = base / n, dt = 1 / base;
    ax.clear();
    var top = 12, bottom = 40, gap = 10;
    var ph = (ax.H - top - bottom - gap * (n - 1)) / n;
    for (i = 0; i < n; i++) {
      var s = SENSOR_KINDS[i % SENSOR_KINDS.length];
      ax.pt = top + i * (ph + gap); ax.pb = ax.H - (ax.pt + ph);
      ax.setRange(0, T, -1.35, 1.35);
      ax.frame({ grid: false, zero: true, xticks: i === n - 1 ? [0, 0.5, 1, 1.5, 2] : [],
        yticks: [], xlabel: i === n - 1 ? 'time (s)' : null });
      ax.text(s.name, ax.W - ax.pr + 8, ax.pt + ph / 2 - 7,
        { px: true, size: 12.5, weight: '700', color: K.INK, base: 'middle' });
      ax.text(s.unit, ax.W - ax.pr + 8, ax.pt + ph / 2 + 8,
        { px: true, size: 11, weight: '600', color: K.MUT, base: 'middle' });
      ax.fn(function (t) { return sensorSig(i, t); }, { color: K.SOFT, width: 1.2, n: 500 });
      var pts = [];
      for (j = 0; j * (1 / per) <= T; j++) {
        var tj = j / per + (showSkew ? i * dt : 0);       /* the skew: one slot each */
        if (tj > T) break;
        pts.push([tj, sensorSig(i, tj)]);
      }
      ax.poly(pts, { color: K.BLUE, width: 1.6 });
      ax.dots(pts, { color: K.ACC, r: 3 });
      ax.text(pts.length + ' samples', ax.pl + 4, ax.pt + 2,
        { px: true, size: 11.5, weight: '700', color: K.MUT, base: 'top' });
    }
    ax.pt = top; ax.pb = bottom;

    var skewMs = (n - 1) * dt * 1000;
    out.innerHTML =
      '<b>' + n + '</b> sensor' + (n > 1 ? 's' : '') + ' on one <b>' + base.toFixed(0) +
      ' Hz</b> DAQ &nbsp;·&nbsp; each channel actually gets <b class="r">' + per.toFixed(1) +
      ' Hz</b> &nbsp;·&nbsp; last channel lags the first by <b>' + skewMs.toFixed(1) + '</b> ms' +
      '<span class="hint">the multiplexer reads one channel at a time and then starts again — ' +
      'so the rate is shared out, and the samples in a set are not simultaneous</span>';
  }

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  var minus = el('button', 'iseg-b', '− sensor'), plus = el('button', 'iseg-b', '+ sensor');
  minus.setAttribute('data-unsafe', '1'); plus.setAttribute('data-unsafe', '1');
  var grp = el('div', 'iseg'); grp.appendChild(minus); grp.appendChild(plus);
  labelled(row, 'channels', grp);
  minus.addEventListener('click', function () { if (n > 1) { n--; draw(); } });
  plus.addEventListener('click', function () { if (n < 6) { n++; draw(); } });
  var sk = el('button', 'ibtn on', 'Skew shown');
  sk.addEventListener('click', function () {
    showSkew = !showSkew; sk.classList.toggle('on', showSkew);
    sk.textContent = showSkew ? 'Skew shown' : 'Skew hidden'; draw();
  });
  row.appendChild(sk);
  slider(u.ctl, 'DAQ rate', 20, 400, 10, base, function (v) { return v.toFixed(0) + ' Hz'; },
    function (v) { base = v; draw(); });

  node._draw = draw;
  draw();
});

/* ============================================================
   5. THE THREE THINGS THAT LIMIT AN A/D
   voltage range · magnitude options · temporal options
   ============================================================ */
D.register('adclimits', function (node, d) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 900, h: 340, padl: 60, padb: 42, padt: 14, xmin: 0, xmax: 1, ymin: -6, ymax: 6 });
  var out = readout(u.ctl);
  var rangeLo = -5, rangeHi = 5, bits = 3, fs = 40, gain = 1, focus = d.focus || 'all';
  var T = 1;

  function raw(t) {
    return 1.5 * Math.sin(2 * Math.PI * 2 * t) + 0.45 * Math.sin(2 * Math.PI * 6.3 * t + 0.8);
  }
  function amped(t) { return raw(t) * gain; }
  function quant(v) {
    var levels = Math.pow(2, bits);
    var step = (rangeHi - rangeLo) / (levels - 1);
    var c = Math.max(rangeLo, Math.min(rangeHi, v));
    return { v: Math.round((c - rangeLo) / step) * step + rangeLo, step: step,
             clipped: v > rangeHi || v < rangeLo };
  }

  function draw() {
    var K = C(), i;
    var levels = Math.pow(2, bits), step = (rangeHi - rangeLo) / (levels - 1);
    var span = Math.max(6, rangeHi + 1.5, -rangeLo + 1.5);
    ax.setRange(0, T, -span, span);
    ax.clear();
    ax.frame({ grid: false, zero: true, xticks: [0, 0.25, 0.5, 0.75, 1],
      xfmt: function (v) { return v.toFixed(2); },
      yticks: axisTicks(-span, span), xlabel: 'time (s)', ylabel: 'volts', ysize: 13,
      yfmt: function (v) { return v.toFixed(0); } });

    /* the window the A/D can see */
    ax.rect(0, rangeLo, T, rangeHi, { fill: K.FILL0 });
    [rangeHi, rangeLo].forEach(function (y, k) {
      ax.poly([[0, y], [T, y]], { color: K.ACC, width: 1.6, dash: [6, 4] });
      ax.text(k ? 'lower limit of A/D range' : 'upper limit of A/D range', T, y,
        { size: 12, weight: '700', color: K.ACC, align: 'right', base: k ? 'top' : 'bottom' });
    });

    /* the magnitude steps */
    if (focus === 'all' || focus === 'bits') {
      if (levels <= 64) {
        for (i = 0; i < levels; i++) {
          ax.poly([[0, rangeLo + i * step], [T, rangeLo + i * step]],
            { color: K.GRID, width: 1 });
        }
      }
    }

    ax.fn(amped, { color: K.SOFT, width: 1.4, n: 700 });

    /* what actually gets stored */
    var pts = [], clip = 0;
    for (i = 0; i <= Math.floor(fs * T); i++) {
      var t = i / fs, q = quant(amped(t));
      if (q.clipped) clip++;
      pts.push([t, q.v]);
    }
    var stair = [];
    pts.forEach(function (p, k) {
      stair.push([p[0], p[1]]);
      if (k < pts.length - 1) stair.push([pts[k + 1][0], p[1]]);
    });
    ax.poly(stair, { color: K.BLUE, width: 2 });
    ax.dots(pts, { color: K.ACC, r: 3.4 });

    out.innerHTML =
      'range <b>' + rangeLo + '</b> to <b>' + rangeHi + '</b> V &nbsp;·&nbsp; ' +
      '<b>' + bits + '</b> bits = <b>' + levels + '</b> levels, one step is <b>' +
      (step >= 0.01 ? step.toFixed(3) : step.toFixed(5)) + '</b> V &nbsp;·&nbsp; ' +
      '<b>' + fs.toFixed(0) + '</b> Hz' +
      (gain !== 1 ? ' &nbsp;·&nbsp; gain <b>×' + gain + '</b>' : '') +
      '<span class="hint">' + (clip
        ? '<b class="r">' + clip + ' samples clipped</b> — the signal is outside the window, and everything beyond the limit is recorded as the limit'
        : (bits <= 3
          ? 'only ' + levels + ' levels to choose from, so the staircase is coarse — this is magnitude resolution'
          : (fs < 14
            ? 'too few samples per second to follow the wave — this is temporal resolution'
            : 'the signal fills the window, the steps are fine and the rate keeps up'))) +
      '</span>';
  }

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  labelled(row, 'A/D range', seg(row, [['10', '−5 to +5 V'], ['20', '−10 to +10 V'], ['1', '0 to 1 V']],
    '10', function (v) {
      if (v === '1') { rangeLo = 0; rangeHi = 1; }
      else { rangeHi = +v / 2; rangeLo = -rangeHi; }
      draw();
    }));

  slider(u.ctl, 'Magnitude — bits', 1, 12, 1, bits,
    function (v) { return v + ' bit → ' + Math.pow(2, v) + ' levels'; },
    function (v) { bits = v; draw(); });
  slider(u.ctl, 'Temporal — rate', 4, 200, 2, fs,
    function (v) { return v.toFixed(0) + ' Hz'; }, function (v) { fs = v; draw(); });
  if (d.gain === '1') {
    slider(u.ctl, 'Amplifier gain', 0.5, 6, 0.5, gain,
      function (v) { return '×' + v; }, function (v) { gain = v; draw(); });
  }
  node._draw = draw;
  draw();
});

/* ============================================================
   6. SAMPLE-AND-HOLD
   The A/D needs the voltage to stand still while it works out the number.
   ============================================================ */
D.register('samplehold', function (node, d) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 900, h: 320, padl: 60, padb: 42, padt: 26, xmin: 0, xmax: 1, ymin: -1.4, ymax: 1.4 });
  var out = readout(u.ctl);
  var fs = 12, conv = 0.045, held = true, T = 1;

  function sig(t) { return Math.sin(2 * Math.PI * 2.2 * t) + 0.22 * Math.sin(2 * Math.PI * 7 * t); }

  function draw() {
    var K = C(), i;
    ax.clear();
    ax.frame({ grid: false, zero: true, xticks: [0, 0.25, 0.5, 0.75, 1],
      xfmt: function (v) { return v.toFixed(2); },
      yticks: [-1, 0, 1], xlabel: 'time (s)', ylabel: 'volts', ysize: 13,
      yfmt: function (v) { return v.toFixed(0); } });
    ax.fn(sig, { color: K.SOFT, width: 1.4, n: 700 });

    var err = 0, worst = 0;
    for (i = 0; i * (1 / fs) <= T; i++) {
      var t = i / fs, tEnd = Math.min(T, t + conv);
      var vHold = sig(t);
      /* the window the converter is busy in */
      ax.rect(t, -1.35, tEnd, 1.35, { fill: K.FILL0 });
      if (held) {
        ax.poly([[t, vHold], [tEnd, vHold]], { color: K.BLUE, width: 2.6 });
        ax.dots([[t, vHold]], { color: K.ACC, r: 3.6 });
      } else {
        /* no hold: the A/D lands on whatever the signal happens to be at the end */
        var vGot = sig(tEnd);
        ax.poly([[t, vHold], [tEnd, vGot]], { color: K.SOFT, width: 1.4, dash: [3, 3] });
        ax.poly([[tEnd, vGot], [Math.min(T, tEnd + 0.004), vGot]], { color: K.ORG, width: 3 });
        ax.dots([[tEnd, vGot]], { color: K.ORG, r: 3.6 });
        ax.poly([[tEnd, vHold], [tEnd, vGot]], { color: K.ACC, width: 1.4 });
        var e = Math.abs(vGot - vHold);
        err += e; worst = Math.max(worst, e);
      }
    }
    ax.text(held ? 'held steady while the A/D converts' : 'not held — the voltage moves mid-conversion',
      ax.pl + 6, 6, { px: true, size: 13, weight: '700', color: held ? K.BLUE : K.ORG, base: 'top' });

    out.innerHTML =
      'conversion takes <b>' + (conv * 1000).toFixed(0) + '</b> ms &nbsp;·&nbsp; sampling at <b>' +
      fs.toFixed(0) + '</b> Hz' +
      (held ? '' : ' &nbsp;·&nbsp; worst error <b class="r">' + worst.toFixed(2) + '</b> V') +
      '<span class="hint">' + (held
        ? 'the sample-and-hold freezes the voltage the instant the sample is taken, and keeps it there until the A/D has finished deciding on a number — like photographing a moving scene before painting it'
        : 'without the hold, the voltage drifts while the converter is still working, so the number it settles on belongs to no particular instant') +
      '</span>';
  }

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  var hb = el('button', 'ibtn on', 'Sample-and-hold ON');
  hb.addEventListener('click', function () {
    held = !held; hb.classList.toggle('on', held);
    hb.textContent = held ? 'Sample-and-hold ON' : 'Sample-and-hold OFF'; draw();
  });
  row.appendChild(hb);
  slider(u.ctl, 'Conversion time', 0.005, 0.08, 0.005, conv,
    function (v) { return (v * 1000).toFixed(0) + ' ms'; }, function (v) { conv = v; draw(); });
  slider(u.ctl, 'Sampling rate', 4, 24, 1, fs,
    function (v) { return v.toFixed(0) + ' Hz'; }, function (v) { fs = v; draw(); });
  node._draw = draw;
  draw();
});

/* ============================================================
   7. HYSTERESIS
   The same force gives a different voltage on the way up and on
   the way down, so one calibration cannot serve both.
   ============================================================ */
D.register('hysteresis', function (node, d) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 700, h: 330, padl: 62, padb: 44, padt: 16,
                            xmin: 0, xmax: 100, ymin: 3, ymax: 10 });
  var out = readout(u.ctl);
  var h = 0.7, playing = false, raf = null, ph = 0;   /* ph 0..2 : up then down */

  function up(f)   { return 3.5 + 0.06 * f - h * 0.55 * Math.sin(Math.PI * f / 100); }
  function down(f) { return 3.5 + 0.06 * f + h * 0.55 * Math.sin(Math.PI * f / 100); }

  function draw() {
    var K = C(), i, pts;
    ax.clear();
    ax.frame({ grid: true, xticks: [0, 25, 50, 75, 100], yticks: [4, 6, 8, 10],
      xlabel: 'force (N)', ylabel: 'voltage (V)', ysize: 13,
      yfmt: function (v) { return v.toFixed(0); } });

    ax.fn(up,   { color: K.BLUE, width: 2.6, from: 0, to: 100 });
    ax.fn(down, { color: K.ACC,  width: 2.6, from: 0, to: 100 });
    ax.text('loading', 74, up(74) - 0.32, { size: 12.5, color: K.BLUE, base: 'top' });
    ax.text('unloading', 26, down(26) + 0.3, { size: 12.5, color: K.ACC, align: 'right' });

    /* the gap at one force */
    var f0 = 50, lo = up(f0), hi = down(f0);
    ax.poly([[f0, lo], [f0, hi]], { color: K.MUT, width: 1.4, dash: [4, 3] });
    ax.text('Δ ' + (hi - lo).toFixed(2) + ' V', f0 + 2, (lo + hi) / 2,
      { size: 12.5, weight: '700', color: K.MUT });

    if (playing) {
      var f = ph <= 1 ? ph * 100 : (2 - ph) * 100;
      var v = ph <= 1 ? up(f) : down(f);
      ax.dots([[f, v]], { color: K.GRN, r: 6 });
      ax.poly([[f, 3], [f, v]], { color: K.GRN, width: 1, dash: [3, 3] });
    }

    var err = (down(f0) - up(f0)) / 0.06;
    out.innerHTML =
      'at <b>50 N</b> the sensor reads <b>' + up(f0).toFixed(2) + '</b> V loading and <b>' +
      down(f0).toFixed(2) + '</b> V unloading' +
      '<span class="hint">' + (h < 0.05
        ? 'no hysteresis — one calibration describes the sensor in both directions'
        : 'one calibration equation, applied to both, is wrong by up to <b class="r">' +
          Math.abs(err).toFixed(0) + ' N</b> — which is why hysteresis is undesirable') + '</span>';
  }

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  var pb = playBtn(row, '▶ Load and unload');
  pb.addEventListener('click', function () {
    playing = !playing;
    pb.textContent = playing ? '❚❚ Stop' : '▶ Load and unload';
    if (playing) { ph = 0; loop(); } else { cancelAnimationFrame(raf); draw(); }
  });
  function loop() { ph = (ph + 0.008) % 2; draw(); raf = requestAnimationFrame(loop); }

  slider(u.ctl, 'Hysteresis', 0, 1.5, 0.05, h, function (v) { return v.toFixed(2); },
    function (v) { h = v; draw(); });

  node._draw = draw;
  node._stop = function () { playing = false; cancelAnimationFrame(raf); pb.textContent = '▶ Load and unload'; };
  draw();
});

/* ============================================================
   8. DRIFT
   The force never changes. The voltage does anyway.
   ============================================================ */
D.register('drift', function (node, d) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 700, h: 330, padl: 66, padb: 44, padt: 16,
                            xmin: 0, xmax: 120, ymin: 3.3, ymax: 6.7 });
  var out = readout(u.ctl);
  var m = -0.006, fixed = false, M = 0.06, B = 3.5, V0 = 5.0;   /* calibration from the worked example */

  function noise(t) { return 0.012 * Math.sin(t * 1.7) + 0.008 * Math.sin(t * 0.41 + 1.2); }
  function v(t) { return V0 + (fixed ? 0 : m * t) + noise(t); }

  function draw() {
    var K = C(), i, pts = [];
    ax.clear();
    ax.frame({ grid: true, xticks: [0, 30, 60, 90, 120], yticks: [3.5, 4.5, 5.5, 6.5],
      xlabel: 'time (s)', ylabel: 'voltage (V)', ysize: 13,
      yfmt: function (x) { return x.toFixed(1); } });

    /* what the sensor should be saying, the whole time */
    ax.poly([[0, V0], [120, V0]], { color: K.MUT, width: 1.4, dash: [5, 4] });
    ax.text('the applied force is constant at 25 N', 2, V0 + 0.07,
      { size: 12.5, weight: '700', color: K.MUT, base: 'bottom' });

    for (i = 0; i <= 120; i += 2) pts.push([i, v(i)]);
    ax.dots(pts, { color: K.ACC, r: 3 });
    if (!fixed) ax.fn(function (t) { return V0 + m * t; }, { color: K.BLUE, width: 2, from: 0, to: 120 });
    else ax.poly([[0, V0], [120, V0]], { color: K.GRN, width: 2 });

    var end = V0 + (fixed ? 0 : m * 120);
    var fStart = (V0 - B) / M, fEnd = (end - B) / M;
    out.innerHTML =
      (fixed
        ? 'drift removed — the slope was measured and subtracted'
        : 'the output slides by <b>' + (m * 120).toFixed(2) + '</b> V over two minutes') +
      '<span class="hint">' + (fixed
        ? 'the force reads <b>' + fStart.toFixed(1) + ' N</b> at the start and <b class="g">' +
          fStart.toFixed(1) + ' N</b> two minutes later — as it should'
        : 'put those volts through the calibration and the force appears to go from <b>' +
          fStart.toFixed(1) + ' N</b> to <b class="r">' + fEnd.toFixed(1) +
          ' N</b>, without anybody touching the sensor') + '</span>';
  }

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  var fb = el('button', 'ibtn', 'Correct the drift');
  fb.addEventListener('click', function () {
    fixed = !fixed; fb.classList.toggle('on', fixed);
    fb.textContent = fixed ? 'Show the raw output' : 'Correct the drift'; draw();
  });
  row.appendChild(fb);
  slider(u.ctl, 'Drift rate', -0.012, 0.012, 0.001, m,
    function (x) { return (x * 1000).toFixed(0) + ' mV/s'; },
    function (x) { m = x; draw(); });

  node._draw = draw;
  draw();
});

/* ============================================================
   9. THE SIGNAL CHAIN — built up one box at a time
   data-stage : how many boxes are lit (1..7)
   ============================================================ */
var CHAIN = [
  { k: 'sensor',  t: 'sensor',              s: 'turns a physical thing into volts' },
  { k: 'box',     t: 'break-out box',       s: 'one terminal per sensor, one cable onward' },
  { k: 'mux',     t: 'multiplexer',         s: 'one channel at a time, in turn' },
  { k: 'amp',     t: 'amplifier',           s: 'fills the A/D’s range' },
  { k: 'sh',      t: 'sample-and-hold',     s: 'freezes the voltage to be measured' },
  { k: 'ad',      t: 'A/D converter',       s: 'volts in, numbers out' },
  { k: 'store',   t: 'storage', t2: '+ software', s: 'written down, then worked on' }
];
D.register('daqchain', function (node, d) {
  var wrap = el('div', 'iwrap');
  var stage = el('div', 'istage');
  var cv = el('canvas'); stage.appendChild(cv);
  wrap.appendChild(stage); node.appendChild(wrap);
  var lit = Math.max(1, Math.min(CHAIN.length, parseInt(d.stage || CHAIN.length, 10)));
  /* Seven boxes in a row need width. On a phone the chain runs down the slide
     instead, which is the same diagram read top to bottom. */
  var DOWN = D.portrait();
  var CW = DOWN ? 480 : 1000, CH = DOWN ? 620 : 190;
  var ax = new Axes(cv, { w: CW, h: CH, padl: 0, padr: 0, padt: 0, padb: 0,
                          fluid: false,
                          xmin: 0, xmax: CW, ymin: CH, ymax: 0 });

  function drawDown() {
    var K = C(), c = ax.c, i;
    ax.clear();
    var n = CHAIN.length, gap = 12, bh = (CH - 56 - gap * (n - 1)) / n;
    var bx = 8, bw = CW - 16, top = 34;
    c.fillStyle = K.MUT; c.font = '600 12.5px ui-sans-serif,system-ui,sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'bottom';
    c.fillText('a physical quantity', bx, top - 8);
    for (i = 0; i < n; i++) {
      var y = top + i * (bh + gap), on = i < lit, now = i === lit - 1;
      if (i < n - 1) {
        c.strokeStyle = i < lit - 1 ? K.BLUE : K.PANEL; c.lineWidth = 2;
        c.beginPath(); c.moveTo(bx + bw / 2, y + bh); c.lineTo(bx + bw / 2, y + bh + gap); c.stroke();
      }
      c.save();
      c.globalAlpha = on ? 1 : .44;
      c.fillStyle = now ? K.FILL2 : (on ? K.FILL0 : 'transparent');
      c.strokeStyle = now ? K.ACC : (on ? K.BLUE : K.PANEL);
      c.lineWidth = now ? 2.2 : 1.4;
      var r = 9;
      c.beginPath();
      c.moveTo(bx + r, y); c.arcTo(bx + bw, y, bx + bw, y + bh, r);
      c.arcTo(bx + bw, y + bh, bx, y + bh, r); c.arcTo(bx, y + bh, bx, y, r);
      c.arcTo(bx, y, bx + bw, y, r); c.closePath();
      c.fill(); c.stroke();
      c.fillStyle = now ? K.ACC : (on ? K.INK : K.MUT);
      c.font = '700 15px ui-sans-serif,system-ui,sans-serif';
      c.textAlign = 'left'; c.textBaseline = 'middle';
      var label = CHAIN[i].t + (CHAIN[i].t2 ? ' ' + CHAIN[i].t2 : '');
      /* the box being introduced carries its one-line explanation inside it,
         where there is width for it — beside it there would not be */
      c.fillText(label, bx + 14, y + bh / 2 + (now ? -10 : 0));
      if (now) {
        c.fillStyle = K.MUT; c.font = '600 12.5px ui-sans-serif,system-ui,sans-serif';
        c.fillText(CHAIN[i].s, bx + 14, y + bh / 2 + 11);
      }
      c.restore();
    }
    c.fillStyle = K.MUT; c.font = '600 12.5px ui-sans-serif,system-ui,sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText('numbers on a disk', bx, top + n * (bh + gap) - gap + 8);
  }

  function draw() {
    if (DOWN) return drawDown();
    var K = C(), c = ax.c, i;
    ax.clear();
    var n = CHAIN.length, pad = 8, bw = (1000 - pad * (n - 1)) / n, bh = 62, by = 46;
    for (i = 0; i < n; i++) {
      var x = i * (bw + pad), on = i < lit, now = i === lit - 1;
      if (i < n - 1) {
        c.strokeStyle = i < lit - 1 ? K.BLUE : K.PANEL; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x + bw, by + bh / 2); c.lineTo(x + bw + pad, by + bh / 2); c.stroke();
      }
      c.save();
      c.globalAlpha = on ? 1 : .44;
      c.fillStyle = now ? K.FILL2 : (on ? K.FILL0 : 'transparent');
      c.strokeStyle = now ? K.ACC : (on ? K.BLUE : K.PANEL);
      c.lineWidth = now ? 2.2 : 1.4;
      var r = 9;
      c.beginPath();
      c.moveTo(x + r, by); c.arcTo(x + bw, by, x + bw, by + bh, r);
      c.arcTo(x + bw, by + bh, x, by + bh, r); c.arcTo(x, by + bh, x, by, r);
      c.arcTo(x, by, x + bw, by, r); c.closePath();
      c.fill(); c.stroke();
      c.fillStyle = now ? K.ACC : (on ? K.INK : K.MUT);
      c.font = '700 13.5px ui-sans-serif,system-ui,sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      var words = CHAIN[i].t2 ? [CHAIN[i].t, CHAIN[i].t2] : CHAIN[i].t.split(' ');
      if (words.length > 1 && (CHAIN[i].t2 || c.measureText(CHAIN[i].t).width > bw - 12)) {
        c.fillText(words[0], x + bw / 2, by + bh / 2 - 9);
        c.fillText(words.slice(1).join(' '), x + bw / 2, by + bh / 2 + 9);
      } else c.fillText(CHAIN[i].t, x + bw / 2, by + bh / 2);
      c.restore();
      if (now) {
        c.fillStyle = K.MUT; c.font = '600 12px ui-sans-serif,system-ui,sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'top';
        var s = CHAIN[i].s, maxw = bw + pad * 2;
        var lines = c.measureText(s).width > maxw
          ? (function () { var m = s.lastIndexOf(' ', Math.floor(s.length / 2) + 4);
                           return [s.slice(0, m), s.slice(m + 1)]; })()
          : [s];
        lines.forEach(function (ln, k) {
          var half = c.measureText(ln).width / 2;
          var cx = Math.max(half + 2, Math.min(1000 - half - 2, x + bw / 2));
          c.fillText(ln, cx, by + bh + 9 + k * 16);
        });
      }
    }
    c.fillStyle = K.MUT; c.font = '600 12.5px ui-sans-serif,system-ui,sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText('a physical quantity', 0, 14);
    c.textAlign = 'right';
    c.fillText('numbers on a disk', 1000, 14);
  }
  node._draw = draw;
  draw();
});

D.boot();
})();
