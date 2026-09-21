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
  var force = 0, wobbling = false, running = false, raf = null, t0 = 0, vt = 0;
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

  /* The clock runs whether or not anything is happening to the beam, so the
     trace scrolls past like a real chart recorder: a flat line when the beam is
     still, a wave when it is wobbled. Samples are appended on a fixed interval
     rather than once per frame, so the history stays a sensible length. */
  var DT = 0.02;
  function push(v, at) {
    if (hist.length && at - hist[hist.length - 1][0] < DT) {
      hist[hist.length - 1][1] = v;                  /* same instant, newer value */
      return;
    }
    hist.push([at, v]);
    while (hist.length > 2 && at - hist[0][0] > TH) hist.shift();
  }

  var s1 = slider(u.ctl, 'Applied force', -100, 100, 1, 0,
    function (v) { return v.toFixed(0) + ' N'; },
    function (v) { force = v; if (!running) { push(v / 100 * 3.2, vt); draw(); } });

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  var pb = playBtn(row, '\u25b6 Wobble the beam');
  pb.addEventListener('click', function () {
    wobbling = !wobbling;
    pb.classList.toggle('on', wobbling);
    pb.textContent = wobbling ? '\u275a\u275a Stop wobbling' : '\u25b6 Wobble the beam';
  });

  function tick() {
    vt = (performance.now() - t0) / 1000;
    if (wobbling) { force = 82 * Math.sin(vt * 2.1); s1.quiet(force); }
    push(force / 100 * 3.2, vt);
    draw();
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (running) return;
    running = true;
    t0 = performance.now() - vt * 1000;              /* pick the clock back up */
    raf = requestAnimationFrame(tick);
  }
  function stop() { running = false; cancelAnimationFrame(raf); raf = null; }

  node._draw = draw;
  node._start = start;
  node._stop = function () {
    stop(); wobbling = false;
    pb.classList.remove('on');
    pb.textContent = '\u25b6 Wobble the beam';
  };

  push(0, 0); draw();
  /* deck-core fires _start on every slide CHANGE; the slide that is already
     open when the deck boots never gets one, so start it here. */
  var sec = node.closest ? node.closest('section') : null;
  if (!sec || sec.classList.contains('present')) start();
});

/* ============================================================
   1b. OHM'S LAW, WITH THE GAUGE AS THE RESISTOR
   The strain gauge is a resistor, so V = IR is the whole sensor in one
   equation. Stretch the foil and R rises; hold the current steady and the
   voltage across it rises with it. Holding the VOLTAGE steady instead makes
   the current fall, which is why a real bridge drives a constant current.
   ============================================================ */
D.register('ohms', function (node, d) {
  var u = build(node);
  var wrap = u.cv.parentNode.parentNode;
  wrap.classList.add('isplit');
  var side = el('div', 'icalc');
  wrap.insertBefore(side, u.ctl);

  var TALL = D.portrait();
  var CW = TALL ? 460 : 620, CH = TALL ? 330 : 350;
  var ax = new Axes(u.cv, { w: CW, h: CH, padl: 0, padr: 0, padt: 0, padb: 0,
                            fluid: false, xmin: 0, xmax: CW, ymin: CH, ymax: 0 });
  var out = readout(u.ctl);

  var R0 = 120;                 /* an unstrained 120 Ω foil gauge */
  var GF = 2.0;
  var strain = 0;               /* microstrain */
  var drive = 'I';              /* hold the current, or hold the voltage */
  var I0 = 10, V0 = 1.2;        /* mA held constant, or volts held constant */

  function state() {
    var R = R0 * (1 + GF * strain * 1e-6);
    var I, V;
    if (drive === 'I') { I = I0; V = I * 1e-3 * R; }
    else { V = V0; I = V / R * 1e3; }
    return { R: R, I: I, V: V, dR: R - R0 };
  }

  function draw() {
    var c = ax.c, K = C(), i;
    var S = state();
    ax.clear();

    /* ---- the circuit: a source, two leads and the gauge ---- */
    var x0 = 40, x1 = CW - 40, yTop = 78, yBot = CH - 96;
    c.save();
    c.strokeStyle = K.INK; c.lineWidth = 2; c.lineJoin = 'round';

    /* source on the left */
    c.beginPath(); c.moveTo(x0, yTop); c.lineTo(x0, yBot); c.stroke();
    var my = (yTop + yBot) / 2;
    c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(x0 - 13, my - 12); c.lineTo(x0 + 13, my - 12); c.stroke();
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x0 - 7, my - 3); c.lineTo(x0 + 7, my - 3); c.stroke();
    c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(x0 - 13, my + 6); c.lineTo(x0 + 13, my + 6); c.stroke();
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x0 - 7, my + 15); c.lineTo(x0 + 7, my + 15); c.stroke();
    c.fillStyle = K.MUT;
    c.font = '600 12px ui-sans-serif,system-ui,sans-serif';
    /* left-aligned from the frame edge: centring this on the source puts half
       of it off the left of the canvas */
    c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(drive === 'I' ? 'constant current source' : 'constant voltage source',
               8, yBot + 12);

    /* top and bottom leads */
    c.strokeStyle = K.INK; c.lineWidth = 2;
    var gx0 = x0 + 118, gx1 = x1 - 118;
    c.beginPath(); c.moveTo(x0, yTop); c.lineTo(gx0, yTop); c.stroke();
    c.beginPath(); c.moveTo(gx1, yTop); c.lineTo(x1, yTop);
    c.lineTo(x1, yBot); c.lineTo(x0, yBot); c.stroke();

    /* ---- the gauge itself: a folded foil whose zig-zag stretches ---- */
    var stretched = strain > 2, squeezed = strain < -2;
    var col = Math.abs(strain) < 2 ? K.MUT : (stretched ? K.ACC : K.BLUE);
    var gw = gx1 - gx0;
    var amp = 15 * (1 - 0.45 * (strain / 1200));        /* thinner when stretched */
    var n = 9;
    c.strokeStyle = col; c.lineWidth = 3.4 * (1 - 0.35 * (strain / 1200));
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    for (i = 0; i <= n * 2; i++) {
      var xx = gx0 + gw * i / (n * 2);
      var yy = yTop + ((i % 2) ? -amp : amp) * 0.62;
      i ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
    }
    c.stroke();
    c.fillStyle = col;
    c.font = '700 13px ui-sans-serif,system-ui,sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.fillText('strain gauge  R = ' + S.R.toFixed(3) + ' Ω', (gx0 + gx1) / 2, yTop - 26);
    c.font = '600 12px ui-sans-serif,system-ui,sans-serif';
    c.fillStyle = K.MUT; c.textBaseline = 'top';
    c.fillText(stretched ? 'stretched — longer and thinner'
             : (squeezed ? 'squashed — shorter and fatter' : 'unstrained'),
               (gx0 + gx1) / 2, yTop + 24);

    /* ---- current, drawn as beads moving along the wire ---- */
    var beads = Math.max(3, Math.round(S.I / 1.4));
    c.fillStyle = K.GRN;
    for (i = 0; i < beads; i++) {
      var f = i / beads;
      c.beginPath(); c.arc(x0 + (gx0 - x0) * f, yTop, 3.2, 0, 7); c.fill();
    }
    c.font = '700 12.5px ui-sans-serif,system-ui,sans-serif';
    c.fillStyle = K.GRN; c.textAlign = 'left'; c.textBaseline = 'bottom';
    c.fillText('I = ' + S.I.toFixed(2) + ' mA', x0 + 16, yTop - 10);

    /* ---- the voltage across the gauge, as a labelled span ---- */
    var vy = yTop + 58;
    c.strokeStyle = K.VIO; c.lineWidth = 1.4; c.setLineDash([4, 3]);
    c.beginPath(); c.moveTo(gx0, yTop + amp); c.lineTo(gx0, vy); c.stroke();
    c.beginPath(); c.moveTo(gx1, yTop + amp); c.lineTo(gx1, vy); c.stroke();
    c.setLineDash([]);
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(gx0, vy); c.lineTo(gx1, vy); c.stroke();
    [[gx0, 1], [gx1, -1]].forEach(function (e) {
      c.beginPath(); c.moveTo(e[0], vy);
      c.lineTo(e[0] + e[1] * 9, vy - 4); c.lineTo(e[0] + e[1] * 9, vy + 4);
      c.closePath(); c.fillStyle = K.VIO; c.fill();
    });
    c.fillStyle = K.VIO;
    c.font = '700 13.5px ui-sans-serif,system-ui,sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText('V = ' + S.V.toFixed(4) + ' V', (gx0 + gx1) / 2, vy + 7);
    c.restore();

    /* ---- the arithmetic ---- */
    side.innerHTML =
      '<div class="icalc-h">V = I R</div>' +
      '<div class="icalc-work">' +
        '<div class="icalc-t">the gauge is just a resistor</div>' +
        '<div class="icalc-eq">R = R₀(1 + GF·ε)</div>' +
        '<div class="icalc-eq">R = 120(1 + 2.0 · ' + (strain * 1e-6).toFixed(6) + ')</div>' +
        '<div class="icalc-eq">R = <b>' + S.R.toFixed(3) + '</b> Ω <span class="muted">(' +
          (S.dR >= 0 ? '+' : '−') + Math.abs(S.dR).toFixed(3) + ')</span></div>' +
      '</div>' +
      '<div class="icalc-work">' +
        '<div class="icalc-t">' + (drive === 'I'
          ? 'hold the current steady and the voltage follows R'
          : 'hold the voltage steady and the current falls as R rises') + '</div>' +
        (drive === 'I'
          ? '<div class="icalc-eq">V = I R = ' + (I0 / 1000).toFixed(3) + ' × ' +
              S.R.toFixed(3) + '</div><div class="icalc-eq">V = <b>' + S.V.toFixed(4) + '</b> V</div>'
          : '<div class="icalc-eq">I = V / R = ' + V0.toFixed(2) + ' / ' + S.R.toFixed(3) +
              '</div><div class="icalc-eq">I = <b>' + S.I.toFixed(3) + '</b> mA</div>') +
      '</div>' +
      '<div class="icalc-vals">' +
        '<div><span>R</span><b>' + S.R.toFixed(2) + ' Ω</b></div>' +
        '<div><span>I</span><b>' + S.I.toFixed(2) + ' mA</b></div>' +
        '<div><span>V</span><b>' + S.V.toFixed(3) + ' V</b></div>' +
      '</div>';

    out.innerHTML =
      'R = <b>' + S.R.toFixed(3) + ' Ω</b> &nbsp;·&nbsp; I = <b class="g">' +
      S.I.toFixed(2) + ' mA</b> &nbsp;·&nbsp; V = <b class="r">' + S.V.toFixed(4) + ' V</b>' +
      '<span class="hint">' + (drive === 'I'
        ? 'Driving a <b>constant current</b> through the gauge makes the voltage across it a ' +
          'direct read-out of its resistance — and therefore of the strain. That is why a ' +
          'strain gauge amplifier is a current source, not a voltage source.'
        : 'With the <b>voltage</b> held constant instead, stretching the gauge makes the current ' +
          'fall. The same physics, read the other way round — but a small change in a large ' +
          'current is much harder to measure than a small change in a small voltage.') +
      '</span>';
  }

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  labelled(row, 'the source holds', seg(el('div'),
    [['I', 'current constant'], ['V', 'voltage constant']], drive,
    function (v) { drive = v; draw(); }));

  u.ctl.classList.add('g2');
  slider(u.ctl, 'Strain', -1200, 1200, 10, strain,
    function (v) { return v.toFixed(0) + ' µε'; },
    function (v) { strain = v; draw(); });
  slider(u.ctl, 'Source', 1, 20, 0.5, I0,
    function (v) { return drive === 'I' ? v.toFixed(1) + ' mA' : (v / 10).toFixed(2) + ' V'; },
    function (v) { I0 = v; V0 = v / 10; draw(); });

  node._draw = draw;
  draw();
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

  if (d.fsctl !== '0') {
    slider(u.ctl, 'Sampling rate', 3, 60, 1, fs, function (v) { return v.toFixed(0) + ' Hz'; },
      function (v) { fs = v; draw(); });
  }
  if (d.sigctl !== '0') {
    slider(u.ctl, 'Signal frequency', 0.5, 12, 0.5, sigF, function (v) { return v.toFixed(1) + ' Hz'; },
      function (v) { sigF = v; draw(); });
  }
  node._draw = draw;
  draw();
});

/* ============================================================
   3. CALIBRATION — hang a known weight, read the volts, plot the pair
   The left panel is the sensor's output in real time, exactly as the strain
   figure shows it: hang a weight and the trace steps up and settles. The
   right panel is the calibration graph, and it only gains a point when you
   deliberately take a reading. The table fills at the same moment, so the
   chain "weight on the pan → volts on the chart → a row in the table → a
   line through the rows" happens in front of the class.
   ============================================================ */
D.register('calib', function (node, d) {
  var u = build(node);
  var wrap = u.cv.parentNode.parentNode;
  wrap.classList.add('isplit', 'iimu');
  var side = el('div', 'icalc');
  wrap.insertBefore(side, u.ctl);

  var TALL = D.portrait();
  var CW = TALL ? 470 : 920, CH = TALL ? 500 : 292;
  var PL = 54, PR = 16, PT = 14, PB = 40;
  var ax = new Axes(u.cv, { w: CW, h: CH, padl: PL, padr: PR, padt: PT, padb: PB,
                            fluid: false, xmin: 0, xmax: 1, ymin: 0, ymax: 1 });
  var out = readout(u.ctl);

  /* the slide's own numbers: 25 N -> 5.0 V, 50 N -> 6.5 V, 75 N -> 8.0 V */
  var TRUE_M = 0.06, TRUE_B = 3.5;
  var KNOWN = [0, 25, 50, 75];
  var mode = d.mode || 'linear';
  var taken = [], useV = 6.0;

  var applied = 0;            /* what is on the pan right now */
  var unknown = false;        /* is the weight one the calibration never saw? */
  var UNKNOWN = [40, 65, 90];
  var ch2 = null;
  var shown = TRUE_B;         /* what the sensor is reporting right now */
  var hist = [];              /* [t, volts] */
  var TH = 6.0;               /* seconds of trace */
  var vt = 0, t0 = 0, raf = null, running = false;
  var TAU = 0.16;             /* how fast the reading settles, seconds */

  function volts(f) {
    if (mode === 'poly') return 2.0 + 0.16 * f - 0.0009 * f * f;
    return TRUE_M * f + TRUE_B;
  }
  function settled() { return Math.abs(shown - volts(applied)) < 0.02; }
  function fitted() {
    if (taken.length < 2) return null;
    var n = taken.length, sx = 0, sy = 0, sxy = 0, sxx = 0;
    taken.forEach(function (q) { sx += q[0]; sy += q[1]; sxy += q[0] * q[1]; sxx += q[0] * q[0]; });
    var den = n * sxx - sx * sx;
    if (Math.abs(den) < 1e-9) return null;
    var m = (n * sxy - sx * sy) / den;
    return { m: m, b: (sy - m * sx) / n };
  }

  var VMIN = 0, VMAX = mode === 'poly' ? 12 : 11;
  var VTICKS = mode === 'poly' ? [0, 3, 6, 9, 12] : [0, 2, 4, 6, 8, 10];

  function panel(which) {
    if (TALL) {
      var halfH = (CH - PT - PB - 46) / 2;
      ax.pl = PL; ax.pr = PR;
      ax.pt = PT + (which === 'time' ? 0 : halfH + 46);
      ax.pb = CH - (ax.pt + halfH);
    } else {
      var halfW = (CW - PL - PR - 74) / 2;
      ax.pt = PT; ax.pb = PB;
      ax.pl = PL + (which === 'time' ? 0 : halfW + 74);
      ax.pr = CW - (ax.pl + halfW);
    }
  }

  function draw() {
    var K = C(), f = fitted(), i;
    ax.clear();

    /* ---------- left: what the sensor is saying, as it happens ---------- */
    panel('time');
    var tEnd = Math.max(vt, TH), tStart = tEnd - TH;
    ax.setRange(tStart, tEnd, VMIN, VMAX);
    ax.frame({ grid: true, xticks: [], yticks: VTICKS,
               xlabel: 'time →', ylabel: 'voltage out (V)', ysize: 12.5,
               yfmt: function (v) { return v.toFixed(0); } });
    if (hist.length > 1) ax.poly(hist, { color: K.GRN, width: 2.4 });
    ax.dots([[tEnd, shown]], { color: settled() ? K.GRN : K.MUT, r: 5 });
    ax.text(shown.toFixed(2) + ' V', ax.pl + 8, ax.pt + 8,
            { px: true, size: 13.5, weight: '700', color: K.GRN, base: 'top' });
    ax.text(applied.toFixed(0) + ' N on the pan', ax.pl + 8, ax.pt + 27,
            { px: true, size: 12, weight: '600', color: K.MUT, base: 'top' });
    if (!settled()) {
      ax.text('settling…', ax.W - ax.pr - 8, ax.pt + 8,
              { px: true, size: 12, weight: '700', color: K.ORG, base: 'top', align: 'right' });
    }
    /* every reading already taken, marked on the trace where it was taken */
    taken.forEach(function (q) {
      if (q[2] == null || q[2] < tStart) return;
      ax.poly([[q[2], VMIN], [q[2], q[1]]], { color: K.MUTED_ACC, width: 1, dash: [3, 3] });
      ax.dots([[q[2], q[1]]], { color: K.ACC, r: 4 });
    });

    /* ---------- right: the calibration graph the readings build ---------- */
    panel('calib');
    ax.setRange(0, 110, VMIN, VMAX);
    ax.frame({ grid: true, xticks: [0, 25, 50, 75, 100], yticks: VTICKS,
               xlabel: 'applied force (N)', ylabel: 'voltage out (V)', ysize: 12.5,
               yfmt: function (v) { return v.toFixed(0); } });
    if (mode === 'poly') ax.fn(volts, { color: K.SOFT, width: 1.4, dash: [5, 4], from: 0, to: 110 });
    if (f) ax.fn(function (x) { return f.m * x + f.b; },
                 { color: K.BLUE, width: 2.4, from: 0, to: 110 });
    taken.forEach(function (q) {
      ax.poly([[q[0], VMIN], [q[0], q[1]]], { color: K.MUTED_ACC, width: 1, dash: [3, 3] });
    });
    ax.dots(taken.map(function (q) { return [q[0], q[1]]; }), { color: K.ACC, r: 5.5 });
    /* the live reading, hovering where it would land */
    if (settled() && !taken.some(function (q) { return q[0] === applied; })) {
      ax.c.save(); ax.c.globalAlpha = 0.45;
      ax.dots([[applied, shown]], { color: K.GRN, r: 5.5 });
      ax.c.restore();
      ax.text('take a reading → here', ax.X(applied) + 9, ax.Y(shown) - 4,
              { px: true, size: 11.5, weight: '600', color: K.GRN, base: 'middle' });
    }
    if (f && d.use === '1') {
      var fx = (useV - f.b) / f.m;
      ax.poly([[0, useV], [fx, useV]], { color: K.VIO, width: 1.6, dash: [5, 4] });
      ax.poly([[fx, VMIN], [fx, useV]], { color: K.VIO, width: 1.6, dash: [5, 4] });
      ax.dots([[fx, useV]], { color: K.VIO, r: 5.5 });
    }
    panel('time');

    /* ---------- the table and the arithmetic ---------- */
    var html = '';
    if (!taken.length) {
      html = '<div class="icalc-h">no readings yet</div>' +
        '<div class="icalc-work"><div class="icalc-t">Hang a known weight on the sensor, wait for ' +
        'the trace to settle, then <b>take a reading</b>. Two readings give a line; three let you ' +
        'check it.</div></div>';
    } else {
      html = '<div class="icalc-h"><span class="v">' + taken.length + '</span> reading' +
             (taken.length > 1 ? 's' : '') + ' taken</div>' +
        '<div class="icalc-work"><table class="icalc-tab">' +
        '<thead><tr><th>applied force</th><th>voltage out</th></tr></thead><tbody>' +
        taken.map(function (q) {
          return '<tr><td>' + q[0].toFixed(0) + ' N</td><td>' + q[1].toFixed(2) + ' V</td></tr>';
        }).join('') + '</tbody></table></div>';
      if (f) {
        var p1 = taken[0], p2 = taken[taken.length - 1];
        html += '<div class="icalc-work">' +
          '<div class="icalc-t">slope, from rise over run</div>' +
          '<div class="icalc-eq">m = Δy/Δx = (' + p2[1].toFixed(2) + ' − ' +
            p1[1].toFixed(2) + ') / (' + p2[0].toFixed(0) + ' − ' + p1[0].toFixed(0) + ')</div>' +
          '<div class="icalc-eq">m = <b>' + f.m.toFixed(3) + '</b> V/N</div>' +
          '<div class="icalc-t" style="margin-top:.45em">offset, from y = mx + b</div>' +
          '<div class="icalc-eq">b = <b>' + f.b.toFixed(2) + '</b> V</div>' +
          '</div>';
        if (d.use === '1') {
          if (unknown) {
            var est = (shown - f.b) / f.m;
            html += '<div class="icalc-work">' +
              '<div class="icalc-t">an unknown weight is on the pan</div>' +
              '<div class="icalc-eq">the sensor reads <b>' + shown.toFixed(2) + '</b> V</div>' +
              '<div class="icalc-eq">x = (y − b) / m = (' + shown.toFixed(2) + ' − ' +
                f.b.toFixed(2) + ') / ' + f.m.toFixed(3) + '</div>' +
              '<div class="icalc-eq">x = <b class="r">' + est.toFixed(1) + '</b> N</div>' +
              '</div>' +
              '<div class="idrift ' + (Math.abs(est - applied) < 2 ? 'ok' : 'warn') +
                '"><span>it really was</span><b>' + applied.toFixed(0) + ' N</b><i>' +
                (est - applied >= 0 ? '+' : '−') + Math.abs(est - applied).toFixed(1) +
                ' N out</i></div>';
          } else {
            html += '<div class="idrift ok"><span>reading ' + useV.toFixed(2) + ' V means</span><b>' +
              ((useV - f.b) / f.m).toFixed(1) + ' N</b><i>x = (y − b) / m</i></div>';
          }
        }
      } else {
        html += '<div class="icalc-work"><div class="icalc-t">one reading cannot give a slope — ' +
                'hang a different weight and take another</div></div>';
      }
    }
    side.innerHTML = html;

    out.innerHTML = (f
      ? 'calibrated: <b>V = ' + f.m.toFixed(3) + ' · F + ' + f.b.toFixed(2) + '</b>'
      : 'not calibrated yet — <b>' + taken.length + '</b> of 2 readings needed') +
      '<span class="hint">' + (mode === 'poly'
        ? 'this sensor is not linear — a straight line through the readings will not describe it, ' +
          'which is why non-linear sensors get a polynomial instead'
        : 'the sensor only ever gives volts. The calibration is the thing that turns volts into ' +
          'newtons, and it comes from weights you already knew the answer to.') + '</span>';
  }

  /* ---------- the clock, free-running like the strain figure ---------- */
  var DT = 0.03;
  function push(v, at) {
    if (hist.length && at - hist[hist.length - 1][0] < DT) {
      hist[hist.length - 1][1] = v; return;
    }
    hist.push([at, v]);
    while (hist.length > 2 && at - hist[0][0] > TH + 1) hist.shift();
  }
  function tick() {
    var now = (performance.now() - t0) / 1000;
    var dt = Math.min(0.1, Math.max(0, now - vt));
    vt = now;
    var target = volts(applied);
    shown += (target - shown) * (1 - Math.exp(-dt / TAU));
    if (Math.abs(target - shown) < 0.002) shown = target;
    push(shown + (Math.random() - 0.5) * 0.008, vt);
    draw();
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (running) return;
    running = true; t0 = performance.now() - vt * 1000;
    raf = requestAnimationFrame(tick);
  }
  function stop() { running = false; cancelAnimationFrame(raf); raf = null; }

  /* ---------- controls ---------- */
  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  var chips = el('div', 'iseg');
  KNOWN.forEach(function (w) {
    var b = el('button', 'iseg-b' + (w === 0 ? ' on' : ''), w === 0 ? 'nothing' : w + ' N');
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(chips.children, function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      applied = w; unknown = false;
      if (ch2) Array.prototype.forEach.call(ch2.children,
        function (x) { x.classList.remove('on'); });
    });
    chips.appendChild(b);
  });
  labelled(row, 'hang a known weight', chips);

  var tb = el('button', 'ibtn', 'Take a reading');
  tb.addEventListener('click', function () {
    /* reading early just settles the trace there and then, rather than doing
       nothing and leaving the class wondering whether the button works */
    shown = volts(applied);
    var exact = shown;                             /* the settled value, not the noise */
    var at = applied;
    taken = taken.filter(function (q) { return q[0] !== at; });
    taken.push([at, exact, vt]);
    taken.sort(function (q, r) { return q[0] - r[0]; });
    draw();
  });
  row.appendChild(tb);

  var cb = el('button', 'ibtn', 'Start over');
  cb.setAttribute('data-reset', '1');        /* the layout pre-warm uses this to undo itself */
  cb.addEventListener('click', function () { taken = []; applied = 0;
    Array.prototype.forEach.call(chips.children, function (x, i) {
      x.classList.toggle('on', i === 0); });
    draw(); });
  row.appendChild(cb);

  if (d.use === '1') {
    /* the point of calibrating: put a weight on that was NOT one of the known
       ones, and let the equation say what it was */
    ch2 = el('div', 'iseg');
    UNKNOWN.forEach(function (w) {
      var b2 = el('button', 'iseg-b', w + ' N');
      b2.addEventListener('click', function () {
        Array.prototype.forEach.call(ch2.children, function (x) { x.classList.remove('on'); });
        Array.prototype.forEach.call(chips.children, function (x) { x.classList.remove('on'); });
        b2.classList.add('on');
        applied = w; unknown = true;
      });
      ch2.appendChild(b2);
    });
    labelled(row, 'then an unknown one', ch2);
    slider(u.ctl, 'Or just read a voltage', 3.5, 11, 0.1, useV,
      function (v) { return v.toFixed(2) + ' V'; }, function (v) { useV = v; draw(); });
  }

  node._draw = draw;
  node._start = start;
  node._stop = stop;
  push(shown, 0); draw();
  var sec = node.closest ? node.closest('section') : null;
  if (!sec || sec.classList.contains('present')) start();
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

/* A small glyph for each kind of sensor, drawn in raw canvas pixels so it can
   sit next to a channel name or inside a multiplexer diagram. Each one is
   drawn inside a box of side 2r centred on (x, y). */
function sensorIcon(c, kind, x, y, r, col) {
  var i;
  c.save();
  c.strokeStyle = col; c.fillStyle = col;
  c.lineWidth = Math.max(1.3, r * 0.17); c.lineCap = 'round'; c.lineJoin = 'round';
  if (kind === 'Strain gauge' || kind === 'Load cell') {
    /* folded foil: a flat lead, a zig-zag, a flat lead */
    c.beginPath();
    c.moveTo(x - r, y);
    c.lineTo(x - r * 0.62, y);
    for (i = 0; i < 6; i++) {
      c.lineTo(x - r * 0.62 + r * 0.2 * (i + 0.5), y + (i % 2 ? r * 0.5 : -r * 0.5));
    }
    c.lineTo(x + r * 0.62, y); c.lineTo(x + r, y);
    c.stroke();
  } else if (kind === 'EMG') {
    /* a burst of muscle activity */
    var amp = [0.12, 0.2, 0.75, 0.35, 0.9, 0.28, 0.6, 0.15, 0.1];
    c.beginPath();
    for (i = 0; i < amp.length; i++) {
      var xx = x - r + (2 * r) * i / (amp.length - 1);
      var yy = y + (i % 2 ? 1 : -1) * amp[i] * r;
      i ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
    }
    c.stroke();
  } else if (kind === 'Accelerometer') {
    /* a mass on a spring inside a case */
    c.strokeRect(x - r, y - r * 0.78, 2 * r, r * 1.56);
    c.beginPath();
    c.moveTo(x - r, y);
    for (i = 0; i < 5; i++) {
      c.lineTo(x - r + r * 0.24 * (i + 0.5), y + (i % 2 ? r * 0.36 : -r * 0.36));
    }
    c.lineTo(x + r * 0.2, y);
    c.stroke();
    c.fillRect(x + r * 0.2, y - r * 0.42, r * 0.62, r * 0.84);
  } else if (kind === 'Goniometer') {
    /* two arms and the angle between them */
    c.beginPath();
    c.moveTo(x + r, y + r * 0.7); c.lineTo(x - r * 0.75, y + r * 0.7);
    c.lineTo(x + r * 0.5, y - r * 0.8); c.stroke();
    c.beginPath(); c.arc(x - r * 0.75, y + r * 0.7, r * 0.66, -Math.PI / 2.35, 0); c.stroke();
  } else if (kind === 'Force plate') {
    /* a plate with a load coming down onto it */
    c.strokeRect(x - r, y + r * 0.3, 2 * r, r * 0.6);
    c.beginPath();
    c.moveTo(x, y - r); c.lineTo(x, y + r * 0.1); c.stroke();
    c.beginPath();
    c.moveTo(x, y + r * 0.28); c.lineTo(x - r * 0.3, y - r * 0.18);
    c.lineTo(x + r * 0.3, y - r * 0.18); c.closePath(); c.fill();
  } else if (kind === 'Pressure pad') {
    /* a grid of cells */
    for (i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        var s2 = r * 0.56;
        c.strokeRect(x - r + i * s2 * 1.2, y - r * 0.85 + j * s2 * 1.2, s2, s2);
      }
    }
  } else {
    /* thermistor and anything else: a thermometer */
    c.beginPath(); c.arc(x, y + r * 0.55, r * 0.42, 0, 7); c.fill();
    c.beginPath();
    c.moveTo(x, y + r * 0.2); c.lineTo(x, y - r * 0.9); c.stroke();
    c.beginPath();
    c.moveTo(x + r * 0.28, y - r * 0.55); c.lineTo(x + r * 0.62, y - r * 0.55); c.stroke();
    c.beginPath();
    c.moveTo(x + r * 0.28, y - r * 0.1); c.lineTo(x + r * 0.62, y - r * 0.1); c.stroke();
  }
  c.restore();
}

D.register('multisensor', function (node, d) {
  var u = build(node);
  var ax = new Axes(u.cv, { w: 900, h: 372, padl: 26, padr: 132, padb: 40, padt: 12, xmin: 0, xmax: 2, ymin: -1.3, ymax: 1.3 });
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
      var icr = Math.min(13, ph * 0.3);
      sensorIcon(ax.c, s.name, ax.W - ax.pr + 8 + icr, ax.pt + ph / 2, icr, K.BLUE);
      ax.text(s.name, ax.W - ax.pr + 12 + icr * 2, ax.pt + ph / 2 - 7,
        { px: true, size: 12.5, weight: '700', color: K.INK, base: 'middle' });
      ax.text(s.unit, ax.W - ax.pr + 12 + icr * 2, ax.pt + ph / 2 + 8,
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
   4b. THE MULTIPLEXER ITSELF
   One DAQ, several sensors, and a switch that can only look at one of them
   at a time. The arm points at a channel, sits there for one sample period,
   takes the sample, and moves on. Everything the next two slides say about
   shared rate and sampling skew is visible in the arm going round.
   ============================================================ */
D.register('mux', function (node, d) {
  var u = build(node);
  var TALL = D.portrait();
  var CW = TALL ? 470 : 980, CH = TALL ? 520 : 356;
  var ax = new Axes(u.cv, { w: CW, h: CH, padl: 0, padr: 0, padt: 0, padb: 0,
                            fluid: false, xmin: 0, xmax: CW, ymin: CH, ymax: 0 });
  var out = readout(u.ctl);

  var n = parseInt(d.n || 4, 10);
  var base = parseFloat(d.rate || 100);     /* what the DAQ can do, in Hz */
  var speed = 20;                           /* slowed right down so it can be watched */
  var running = false, raf = null, t0 = 0, clock = 0;
  var taken = [];                           /* [channel, clock] of recent samples */

  function dwell() { return 1 / base; }     /* seconds the arm spends per channel */
  function current() {
    var slot = Math.floor(clock / (dwell() / speed));
    return ((slot % n) + n) % n;
  }

  function draw() {
    var c = ax.c, K = C(), i;
    ax.clear();
    var ch = current();

    var lx = TALL ? 70 : 128;               /* where the sensor boxes sit */
    var mx = TALL ? 250 : 430;              /* the multiplexer hub */
    var rx = TALL ? 400 : 760;              /* the DAQ */
    var top = 52, DIAG = CH - 104, bh = (DIAG - top) / n;   /* the strip owns the rest */

    /* ---- the sensors, each with its icon ---- */
    for (i = 0; i < n; i++) {
      var s = SENSOR_KINDS[i % SENSOR_KINDS.length];
      var cy = top + bh * (i + 0.5);
      var on = i === ch;
      c.save();
      c.fillStyle = on ? K.ACCFILL : K.PLATE;
      c.strokeStyle = on ? K.ACC : K.PANEL;
      c.lineWidth = on ? 2 : 1;
      var bw = TALL ? 150 : 176, bhh = Math.min(50, bh - 8);
      c.beginPath();
      if (c.roundRect) c.roundRect(lx - bw / 2, cy - bhh / 2, bw, bhh, 8);
      else c.rect(lx - bw / 2, cy - bhh / 2, bw, bhh);
      c.fill(); c.stroke();
      sensorIcon(c, s.name, lx - bw / 2 + 22, cy, 13, on ? K.ACC : K.MUT);
      c.fillStyle = on ? K.INK : K.MUT;
      c.font = '700 12px ui-sans-serif,system-ui,sans-serif';
      c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText(s.name, lx - bw / 2 + 42, cy - 6);
      c.font = '600 10.5px ui-sans-serif,system-ui,sans-serif';
      c.fillStyle = K.MUT;
      c.fillText('channel ' + i, lx - bw / 2 + 42, cy + 8);
      /* the wire to the multiplexer */
      c.strokeStyle = on ? K.ACC : K.SOFT; c.lineWidth = on ? 2.2 : 1.2;
      c.beginPath(); c.moveTo(lx + bw / 2, cy); c.lineTo(mx - 34, cy); c.stroke();
      c.restore();
    }

    /* ---- the multiplexer: a hub with an arm that points at one channel ---- */
    var my = top + (DIAG - top) / 2;
    c.save();
    c.fillStyle = K.PLATE; c.strokeStyle = K.BLUE; c.lineWidth = 2;
    c.beginPath();
    if (c.roundRect) c.roundRect(mx - 34, top - 18, 68, DIAG - top + 20, 10);
    else c.rect(mx - 34, top - 18, 68, DIAG - top + 20);
    c.fill(); c.stroke();
    c.fillStyle = K.BLUE;
    c.font = '700 12px ui-sans-serif,system-ui,sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.fillText('multiplexer', mx, top - 24);

    /* the arm */
    var pivotX = mx + 18, pivotY = my;
    var targetY = top + bh * (ch + 0.5);
    c.strokeStyle = K.ACC; c.lineWidth = 3.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(pivotX, pivotY); c.lineTo(mx - 26, targetY); c.stroke();
    /* the arrow head, pointing at the live channel */
    var ang = Math.atan2(targetY - pivotY, (mx - 26) - pivotX);
    c.fillStyle = K.ACC;
    c.beginPath();
    c.moveTo(mx - 26, targetY);
    c.lineTo(mx - 26 - Math.cos(ang - 0.4) * -12, targetY - Math.sin(ang - 0.4) * -12);
    c.lineTo(mx - 26 - Math.cos(ang + 0.4) * -12, targetY - Math.sin(ang + 0.4) * -12);
    c.closePath(); c.fill();
    c.beginPath(); c.arc(pivotX, pivotY, 5, 0, 7); c.fill();
    c.restore();

    /* ---- the wire out to the DAQ ---- */
    c.save();
    c.strokeStyle = K.ACC; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(mx + 34, my); c.lineTo(rx - 44, my); c.stroke();
    c.fillStyle = K.PLATE; c.strokeStyle = K.GRN; c.lineWidth = 2;
    c.beginPath();
    if (c.roundRect) c.roundRect(rx - 44, my - 40, 88, 80, 10);
    else c.rect(rx - 44, my - 40, 88, 80);
    c.fill(); c.stroke();
    c.fillStyle = K.GRN;
    c.font = '700 12.5px ui-sans-serif,system-ui,sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('DAQ', rx, my - 16);
    c.font = '700 15px ui-sans-serif,system-ui,sans-serif';
    c.fillStyle = K.INK;
    c.fillText(base.toFixed(0) + ' Hz', rx, my + 6);
    c.font = '600 10.5px ui-sans-serif,system-ui,sans-serif';
    c.fillStyle = K.MUT;
    c.fillText('one sample at a time', rx, my + 24);
    c.restore();

    /* ---- the record coming out the other side ---- */
    var ry = CH - 26, rw = CW - 40;
    c.save();
    c.strokeStyle = K.SOFT; c.lineWidth = 1;
    c.beginPath(); c.moveTo(20, ry); c.lineTo(20 + rw, ry); c.stroke();
    c.fillStyle = K.MUT;
    c.font = '600 11px ui-sans-serif,system-ui,sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText('what the DAQ actually records — one channel per sample, in turn', 20, ry + 7);
    var NSHOW = Math.min(taken.length, Math.floor(rw / 15));
    for (i = 0; i < NSHOW; i++) {
      var t = taken[taken.length - NSHOW + i];
      var bx = 20 + rw - (NSHOW - i) * 15;
      var hue = t[0] / Math.max(1, n);
      c.globalAlpha = 0.35 + 0.65 * (i / Math.max(1, NSHOW - 1));
      c.fillStyle = t[0] === ch ? K.ACC : K.BLUE;
      var bhx = 6 + 16 * (1 - hue);
      c.fillRect(bx, ry - 6 - bhx, 11, bhx);
      c.globalAlpha = 1;
    }
    c.restore();

    var per = base / n, skewMs = (n - 1) / base * 1000;
    out.innerHTML =
      'the arm is on <b class="r">channel ' + ch + '</b> (' +
      SENSOR_KINDS[ch % SENSOR_KINDS.length].name + ') &nbsp;·&nbsp; it stays for <b>' +
      (dwell() * 1000).toFixed(1) + ' ms</b>, then moves on' +
      '<span class="hint">The DAQ runs at <b>' + base.toFixed(0) + ' Hz</b>, but it has to share ' +
      'that between <b>' + n + '</b> channels, so each sensor is really sampled at <b class="r">' +
      per.toFixed(1) + ' Hz</b>. And because the arm visits them one after another, the last ' +
      'channel in a round is read <b>' + skewMs.toFixed(1) + ' ms</b> after the first — the ' +
      'samples in a set are not simultaneous. That is sampling skew.</span>';
  }

  function tick() {
    clock = (performance.now() - t0) / 1000;
    var slot = Math.floor(clock / (dwell() / speed));
    var last = taken[taken.length - 1];
    if (!last || last[1] !== slot) {
      taken.push([current(), slot]);
      while (taken.length > 120) taken.shift();
    }
    draw();
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (running) return;
    running = true; t0 = performance.now() - clock * 1000;
    raf = requestAnimationFrame(tick);
  }
  function stop() { running = false; cancelAnimationFrame(raf); raf = null; }

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  var minus = el('button', 'iseg-b', '− channel'), plus = el('button', 'iseg-b', '+ channel');
  minus.setAttribute('data-unsafe', '1'); plus.setAttribute('data-unsafe', '1');
  var grp = el('div', 'iseg'); grp.appendChild(minus); grp.appendChild(plus);
  labelled(row, 'channels', grp);
  minus.addEventListener('click', function () { if (n > 2) { n--; taken = []; draw(); } });
  plus.addEventListener('click', function () { if (n < 6) { n++; taken = []; draw(); } });

  var sb = el('button', 'ibtn on', '❚❚ Pause the arm');
  sb.addEventListener('click', function () {
    if (running) { stop(); sb.classList.remove('on'); sb.textContent = '▶ Run the arm'; }
    else { start(); sb.classList.add('on'); sb.textContent = '❚❚ Pause the arm'; }
  });
  row.appendChild(sb);

  u.ctl.classList.add('g2');
  slider(u.ctl, 'DAQ rate', 20, 400, 10, base, function (v) { return v.toFixed(0) + ' Hz'; },
    function (v) { base = v; taken = []; draw(); });
  slider(u.ctl, 'Slow motion', 1, 60, 1, speed, function (v) { return '×' + v.toFixed(0); },
    function (v) { speed = v; taken = []; draw(); });

  node._draw = draw;
  node._start = start;
  node._stop = function () {
    stop(); sb.classList.remove('on'); sb.textContent = '▶ Run the arm';
  };
  draw();
  var sec = node.closest ? node.closest('section') : null;
  if (!sec || sec.classList.contains('present')) start();
});

/* ============================================================
   5. THE THREE THINGS THAT LIMIT AN A/D
   voltage range · magnitude options · temporal options
   ============================================================ */
D.register('adclimits', function (node, d) {
  var u = build(node);
  var only0 = d.only || '';
  var ax = new Axes(u.cv, { w: 900, h: 340, padl: 60,
                            padr: only0 === 'bits' ? 56 : 18,
                            padb: 42, padt: 26, xmin: 0, xmax: 1, ymin: -6, ymax: 6 });
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

    /* the magnitude steps — every level the converter is allowed to output */
    if (focus === 'all' || focus === 'bits') {
      if (levels <= 64) {
        for (i = 0; i < levels; i++) {
          var ly = rangeLo + i * step;
          ax.poly([[0, ly], [T, ly]], { color: K.GRID, width: 1 });
          /* a tick on the RIGHT edge with the level number beside it, so the
             volts scale on the left stays readable and the two say the same
             thing in different units */
          ax.c.save();
          ax.c.strokeStyle = K.MUT; ax.c.lineWidth = 1;
          ax.c.beginPath();
          ax.c.moveTo(ax.W - ax.pr, ax.Y(ly)); ax.c.lineTo(ax.W - ax.pr + 5, ax.Y(ly));
          ax.c.stroke(); ax.c.restore();
          if (levels <= 32) {
            ax.text(String(i), ax.W - ax.pr + 9, ax.Y(ly),
              { px: true, size: 10.5, weight: '600', color: K.MUT, base: 'middle' });
          }
        }
        if (levels <= 32) {
          ax.text('level stored', ax.W - ax.pr + 4, ax.pt - 13,
            { px: true, size: 11, weight: '700', color: K.MUT, base: 'bottom' });
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

  /* Each slide asks one question, so each slide gets one control. "gain" fixes
     the rate and the bit depth high and leaves only the amplifier; "bits" fixes
     everything except the magnitude resolution. */
  var only = d.only || '';
  if (only === 'gain') { fs = 200; bits = 12; }
  if (only === 'bits') { fs = 200; gain = 1; }

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  if (!only) {
    labelled(row, 'A/D range', seg(row, [['10', '−5 to +5 V'], ['20', '−10 to +10 V'], ['1', '0 to 1 V']],
      '10', function (v) {
        if (v === '1') { rangeLo = 0; rangeHi = 1; }
        else { rangeHi = +v / 2; rangeLo = -rangeHi; }
        draw();
      }));
  }
  if (!only || only === 'bits') {
    slider(u.ctl, 'Magnitude — bits', 1, 12, 1, bits,
      function (v) { return v + ' bit → ' + Math.pow(2, v) + ' levels'; },
      function (v) { bits = v; draw(); });
  }
  if (!only) {
    slider(u.ctl, 'Temporal — rate', 4, 200, 2, fs,
      function (v) { return v.toFixed(0) + ' Hz'; }, function (v) { fs = v; draw(); });
  }
  if (d.gain === '1' || only === 'gain') {
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
  var TALL = D.portrait();
  var CW = TALL ? 470 : 1140, CH = TALL ? 520 : 318;
  var PL = 56, PR = 18, PT = 24, PB = 40;
  var ax = new Axes(u.cv, { w: CW, h: CH, padl: PL, padr: PR, padt: PT, padb: PB,
                            fluid: false, xmin: 0, xmax: 1, ymin: -1.4, ymax: 1.4 });
  var out = readout(u.ctl);
  var fs = 12, conv = 0.045, held = true, T = 1;

  /* the right-hand panel runs on a clock of its own */
  var LIVE = 1.25;                    /* seconds visible */
  var SLOW = 6;                       /* real time is far too fast to watch */
  var clock = 0, t0 = 0, raf = null, running = false;

  function sig(t) { return Math.sin(2 * Math.PI * 2.2 * t) + 0.22 * Math.sin(2 * Math.PI * 7 * t); }

  function panel(which) {
    if (TALL) {
      var hA = (CH - PT - PB - 46) / 2;
      ax.pl = PL; ax.pr = PR;
      ax.pt = PT + (which === 'left' ? 0 : hA + 46);
      ax.pb = CH - (ax.pt + hA);
    } else {
      var halfW = (CW - PL - PR - 80) / 2;
      ax.pt = PT; ax.pb = PB;
      ax.pl = PL + (which === 'left' ? 0 : halfW + 80);
      ax.pr = CW - (ax.pl + halfW);
    }
  }

  function draw() {
    var K = C(), i;
    ax.clear();

    /* ---------- left: the whole record, laid out to be talked over ---------- */
    panel('left');
    ax.setRange(0, T, -1.4, 1.4);
    ax.frame({ grid: false, zero: true, xticks: [0, 0.25, 0.5, 0.75, 1],
      xfmt: function (v) { return v.toFixed(2); },
      yticks: [-1, 0, 1], xlabel: 'time (s)', ylabel: 'volts', ysize: 13, ylabelx: 13,
      yfmt: function (v) { return v.toFixed(0); } });
    ax.fn(sig, { color: K.SOFT, width: 1.4, n: 700 });

    var worst = 0;
    for (i = 0; i * (1 / fs) <= T; i++) {
      var t = i / fs, tEnd = Math.min(T, t + conv);
      var vHold = sig(t);
      ax.rect(t, -1.35, tEnd, 1.35, { fill: K.FILL0 });
      if (held) {
        ax.poly([[t, vHold], [tEnd, vHold]], { color: K.BLUE, width: 2.6 });
        ax.dots([[t, vHold]], { color: K.ACC, r: 3.6 });
      } else {
        var vGot = sig(tEnd);
        ax.poly([[t, vHold], [tEnd, vGot]], { color: K.SOFT, width: 1.4, dash: [3, 3] });
        ax.poly([[tEnd, vGot], [Math.min(T, tEnd + 0.004), vGot]], { color: K.ORG, width: 3 });
        ax.dots([[tEnd, vGot]], { color: K.ORG, r: 3.6 });
        ax.poly([[tEnd, vHold], [tEnd, vGot]], { color: K.ACC, width: 1.4 });
        worst = Math.max(worst, Math.abs(vGot - vHold));
      }
    }
    ax.text(held ? 'held steady while the A/D converts' : 'not held — the voltage moves mid-conversion',
      ax.pl + 6, PT - 20, { px: true, size: 12.5, weight: '700',
                            color: held ? K.BLUE : K.ORG, base: 'top' });

    /* ---------- right: the same thing happening, one sample at a time ---------- */
    panel('right');
    var now = clock / SLOW;                       /* signal time, slowed for watching */
    var tS = Math.max(0, now - LIVE), tE = tS + LIVE;
    ax.setRange(tS, tE, -1.4, 1.4);
    ax.frame({ grid: false, zero: true, xticks: [], yticks: [-1, 0, 1],
      xlabel: 'time →  (slowed ×' + SLOW + ')', ylabel: 'volts', ysize: 13, ylabelx: 13,
      yfmt: function (v) { return v.toFixed(0); } });
    /* the analog voltage, only as far as the present instant */
    var pts = [];
    for (i = 0; i <= 260; i++) {
      var tt = tS + (Math.min(now, tE) - tS) * i / 260;
      pts.push([tt, sig(tt)]);
    }
    if (pts.length > 1) ax.poly(pts, { color: K.SOFT, width: 1.6 });

    /* every sample whose instant has already passed */
    var k0 = Math.floor(tS * fs), k1 = Math.floor(now * fs);
    for (i = k0; i <= k1; i++) {
      if (i < 0) continue;
      var ts = i / fs;
      if (ts < tS) continue;
      var vh = sig(ts);
      var prog = Math.max(0, Math.min(1, (now - ts) / conv));   /* how far the A/D has got */
      var tHi = ts + conv * prog;
      /* the window the converter is busy in */
      ax.rect(ts, -1.35, ts + conv, 1.35, { fill: K.FILL0 });
      if (held) {
        ax.poly([[ts, vh], [tHi, vh]], { color: K.BLUE, width: 2.6 });
      }
      var vFinal = held ? vh : sig(ts + conv);
      /* THE POINT: the number is not known until the conversion finishes, so
         the dot fades up from barely visible to solid as the A/D works */
      ax.c.save();
      ax.c.globalAlpha = 0.07 + 0.93 * prog * prog;
      ax.dots([[ts + conv * (held ? 1 : 1), vFinal]],
              { color: prog >= 1 ? (held ? K.GRN : K.ORG) : K.MUT, r: prog >= 1 ? 4.6 : 4 });
      ax.c.restore();
      if (prog > 0 && prog < 1) {
        ax.poly([[ts, -1.35], [ts, 1.35]], { color: K.ACC, width: 1.2, dash: [3, 3] });
        ax.text('converting…', ax.X(ts) + 6, ax.pt + 8,
                { px: true, size: 11.5, weight: '700', color: K.ACC, base: 'top' });
      }
    }
    ax.text('the number only becomes definite when the conversion ends',
      ax.pl + 6, PT - 20, { px: true, size: 12.5, weight: '700', color: K.GRN, base: 'top' });
    panel('left');

    out.innerHTML =
      'conversion takes <b>' + (conv * 1000).toFixed(0) + '</b> ms &nbsp;·&nbsp; sampling at <b>' +
      fs.toFixed(0) + '</b> Hz' +
      (held ? '' : ' &nbsp;·&nbsp; worst error <b class="r">' + worst.toFixed(2) + '</b> V') +
      '<span class="hint">' + (held
        ? 'the sample-and-hold freezes the voltage the instant the sample is taken, and keeps it ' +
          'there until the A/D has finished deciding on a number — watch a dot on the right ' +
          'fade up as its converter works, and land solid only when it is done'
        : 'without the hold, the voltage drifts while the converter is still working, so the ' +
          'number it settles on belongs to no particular instant') +
      '</span>';
  }

  function tick() { clock = (performance.now() - t0) / 1000; draw(); raf = requestAnimationFrame(tick); }
  function start() {
    if (running) return;
    running = true; t0 = performance.now() - clock * 1000;
    raf = requestAnimationFrame(tick);
  }
  function stop() { running = false; cancelAnimationFrame(raf); raf = null; }

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  var hb = el('button', 'ibtn on', 'Sample-and-hold ON');
  hb.addEventListener('click', function () {
    held = !held; hb.classList.toggle('on', held);
    hb.textContent = held ? 'Sample-and-hold ON' : 'Sample-and-hold OFF'; draw();
  });
  row.appendChild(hb);
  var rb = el('button', 'ibtn', 'Restart the run');
  rb.setAttribute('data-reset', '1');
  rb.addEventListener('click', function () { clock = 0; t0 = performance.now(); draw(); });
  row.appendChild(rb);

  u.ctl.classList.add('g2');
  slider(u.ctl, 'Conversion time', 0.005, 0.08, 0.005, conv,
    function (v) { return (v * 1000).toFixed(0) + ' ms'; }, function (v) { conv = v; draw(); });
  slider(u.ctl, 'Sampling rate', 4, 24, 1, fs,
    function (v) { return v.toFixed(0) + ' Hz'; }, function (v) { fs = v; draw(); });

  node._draw = draw;
  node._start = start;
  node._stop = stop;
  draw();
  var sec = node.closest ? node.closest('section') : null;
  if (!sec || sec.classList.contains('present')) start();
});

/* ============================================================
   7. HYSTERESIS
   The same force gives a different voltage on the way up and on
   the way down, so one calibration cannot serve both.
   ============================================================ */
D.register('hysteresis', function (node, d) {
  var u = build(node);
  var TALL = D.portrait();
  var CW = TALL ? 470 : 1140, CH = TALL ? 520 : 348;
  var PL = 54, PR = 18, PT = 12, PB = 40;
  var ax = new Axes(u.cv, { w: CW, h: CH, padl: PL, padr: PR, padt: PT, padb: PB,
                            fluid: false, xmin: 0, xmax: 100, ymin: 3, ymax: 10 });
  var out = readout(u.ctl);
  var h = 0.7, playing = false, raf = null, ph = 0;   /* ph 0..2 : up then down */
  var CYCLE = 4.6;                                    /* seconds for load + unload */
  var TW = 9.2;                                       /* seconds of time window */
  var trace = [], clock = 0, t0 = 0;

  function up(f)   { return 3.5 + 0.06 * f - h * 0.55 * Math.sin(Math.PI * f / 100); }
  function down(f) { return 3.5 + 0.06 * f + h * 0.55 * Math.sin(Math.PI * f / 100); }
  /* A smooth, rounded load-and-unload rather than a triangular ramp — the
     shape a running ground reaction force actually has. sin² rises from zero
     with zero slope, peaks at the turn, and comes back the same way, so
     "loading" and "unloading" are still exactly the two halves. */
  function forceAt(p) { return 100 * Math.pow(Math.sin(Math.PI * p / 2), 2); }
  function voltAt(p)  { return p <= 1 ? up(forceAt(p)) : down(forceAt(p)); }

  /* three bands: force against time, voltage against time, and the loop the
     two of them trace out when you plot one against the other */
  function band(which) {
    if (TALL) {
      var hA = (CH - PT - PB - 96) / 3;
      ax.pl = PL; ax.pr = PR;
      var k = which === 'force' ? 0 : (which === 'volt' ? 1 : 2);
      ax.pt = PT + k * (hA + 48);
      ax.pb = CH - (ax.pt + hA);
    } else {
      var halfW = (CW - PL - PR - 86) / 2;
      if (which === 'loop') {
        ax.pl = PL + halfW + 86; ax.pr = PR; ax.pt = PT; ax.pb = PB;
      } else {
        var hB = (CH - PT - PB - 44) / 2;
        ax.pl = PL; ax.pr = CW - (PL + halfW);
        ax.pt = PT + (which === 'force' ? 0 : hB + 44);
        ax.pb = CH - (ax.pt + hB);
      }
    }
  }

  function draw() {
    var K = C(), i;
    ax.clear();
    var tEnd = Math.max(clock, TW), tStart = tEnd - TW;
    var seen = trace.filter(function (q) { return q[0] >= tStart; });

    /* ---- applied force against time ---- */
    band('force');
    ax.setRange(tStart, tEnd, 0, 112);
    ax.frame({ grid: true, xticks: [], yticks: [0, 50, 100],
               ylabel: 'force (N)', ysize: 11.5, ylabelx: 13,
               yfmt: function (v) { return v.toFixed(0); } });
    if (seen.length > 1) {
      ax.poly(seen.map(function (q) { return [q[0], q[1]]; }), { color: K.ORG, width: 2.4 });
      ax.dots([[seen[seen.length - 1][0], seen[seen.length - 1][1]]], { color: K.ORG, r: 4.5 });
    }

    /* ---- the voltage it reads back ---- */
    band('volt');
    ax.setRange(tStart, tEnd, 3, 10);
    ax.frame({ grid: true, xticks: [], yticks: [4, 6, 8, 10],
               xlabel: 'time →', ylabel: 'volts (V)', ysize: 11.5, ylabelx: 13,
               yfmt: function (v) { return v.toFixed(0); } });
    if (seen.length > 1) {
      /* loading and unloading drawn in their own colours, so the two passes
         over the SAME force are visibly different voltages */
      var runs = [], cur = null;
      seen.forEach(function (q) {
        if (!cur || cur.dir !== q[3]) { cur = { dir: q[3], pts: [] }; runs.push(cur); }
        cur.pts.push([q[0], q[2]]);
      });
      runs.forEach(function (r) {
        ax.poly(r.pts, { color: r.dir ? K.BLUE : K.ACC, width: 2.4 });
      });
      var L = seen[seen.length - 1];
      ax.dots([[L[0], L[2]]], { color: L[3] ? K.BLUE : K.ACC, r: 4.5 });
    }

    /* ---- and the loop the pair of them draws ---- */
    band('loop');
    ax.setRange(0, 100, 3, 10);
    ax.frame({ grid: true, xticks: [0, 25, 50, 75, 100], yticks: [4, 6, 8, 10],
      xlabel: 'force (N)', ylabel: 'voltage (V)', ysize: 12.5, ylabelx: 13,
      yfmt: function (v) { return v.toFixed(0); } });
    ax.fn(up,   { color: K.BLUE, width: 2.6, from: 0, to: 100 });
    ax.fn(down, { color: K.ACC,  width: 2.6, from: 0, to: 100 });
    ax.text('loading', 74, up(74) - 0.32, { size: 12, color: K.BLUE, base: 'top' });
    ax.text('unloading', 26, down(26) + 0.3, { size: 12, color: K.ACC, align: 'right' });
    var f0 = 50, lo = up(f0), hi = down(f0);
    ax.poly([[f0, lo], [f0, hi]], { color: K.MUT, width: 1.4, dash: [4, 3] });
    ax.text('Δ ' + (hi - lo).toFixed(2) + ' V', f0 + 2, (lo + hi) / 2,
      { size: 12, weight: '700', color: K.MUT });
    if (playing || trace.length) {
      var f = forceAt(ph), v = voltAt(ph);
      ax.dots([[f, v]], { color: ph <= 1 ? K.BLUE : K.ACC, r: 6 });
      ax.poly([[f, 3], [f, v]], { color: K.MUT, width: 1, dash: [3, 3] });
    }
    band('force');

    var err = (down(f0) - up(f0)) / 0.06;
    out.innerHTML =
      'at <b>50 N</b> the sensor reads <b class="b">' + up(f0).toFixed(2) +
      '</b> V loading and <b class="r">' + down(f0).toFixed(2) + '</b> V unloading' +
      '<span class="hint">' + (h < 0.05
        ? 'no hysteresis — the two passes lie on top of each other and one calibration describes ' +
          'the sensor in both directions'
        : 'watch the middle panel: the force goes up and comes back down through exactly the same ' +
          'values, but the voltage does not retrace its path. One calibration equation applied to ' +
          'both is wrong by up to <b class="r">' + Math.abs(err).toFixed(0) + ' N</b>.') + '</span>';
  }

  var row = el('div', 'ictl-row'); u.ctl.appendChild(row);
  var pb = playBtn(row, '▶ Load and unload');
  pb.addEventListener('click', function () {
    playing = !playing;
    pb.classList.toggle('on', playing);
    pb.textContent = playing ? '❚❚ Stop' : '▶ Load and unload';
    if (playing) { t0 = performance.now() - clock * 1000; loop(); }
    else { cancelAnimationFrame(raf); draw(); }
  });
  var cb = el('button', 'ibtn', 'Clear the trace');
  cb.setAttribute('data-reset', '1');
  cb.addEventListener('click', function () { trace = []; clock = 0; ph = 0; draw(); });
  row.appendChild(cb);

  function loop() {
    clock = (performance.now() - t0) / 1000;
    ph = (clock * 2 / CYCLE) % 2;
    var last = trace[trace.length - 1];
    if (!last || clock - last[0] > 0.025) {
      trace.push([clock, forceAt(ph), voltAt(ph), ph <= 1 ? 1 : 0]);
      while (trace.length > 2 && clock - trace[0][0] > TW + 1) trace.shift();
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  slider(u.ctl, 'Hysteresis', 0, 1.5, 0.05, h, function (v) { return v.toFixed(2); },
    function (v) { h = v; trace = []; draw(); });

  node._draw = draw;
  node._start = function () { if (playing) { t0 = performance.now() - clock * 1000; loop(); } };
  node._stop = function () {
    playing = false; cancelAnimationFrame(raf);
    pb.classList.remove('on'); pb.textContent = '▶ Load and unload';
  };
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
