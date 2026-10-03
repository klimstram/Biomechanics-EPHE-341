/* ============================================================
   EPHE 341 — Angular Kinematics
   Interactive figures. Needs deck-core.js. No other dependencies.

   The worked examples are Marc's own, kept to the same numbers so the deck,
   the handout and the Biomechanics Tutor all agree:

     bicycle wheel      r = 0.34 m, turns 30 deg in 0.2 s
     hammer throw       r = 1.2 m, 0 to 12 rad/s in 1.5 s
     racing wheelchair  wheel diameter 66 cm, so r = 0.33 m

   The tutor's Angular Kinematics section uses the same 0.34 m wheel, which
   is why that radius turns up here rather than a rounder number.
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
   ANGULAR KINEMATICS — the handful of relations the whole lecture is
   ============================================================ */
var DEG = Math.PI / 180, RAD = 180 / Math.PI;
function toRad(d) { return d * DEG; }
function toDeg(r) { return r * RAD; }
function arcLen(r, th) { return r * th; }          /* l = r.theta   */
function vTan(r, w) { return r * w; }              /* v_t = r.omega */
function aTan(r, a) { return r * a; }              /* a_t = r.alpha */
function aRad(r, w) { return w * w * r; }          /* a_r = omega^2.r */
function aTot(at, ar) { return Math.hypot(at, ar); }

/* the running worked example, in one place */
var EX = {
  wheelR: 0.34, wheelDeg: 30, wheelT: 0.2,
  hammerR: 1.2, hammerW: 12, hammerT: 1.5,
  wcR: 0.33                                        /* 66 cm diameter */
};

/* draw a circle, its centre, and a radius line — used by most figures here */
function dial(c, K, cx, cy, R, o) {
  o = o || {};
  c.save();
  c.strokeStyle = o.ring || K.PANEL; c.lineWidth = o.width || 1.6;
  if (o.dash) c.setLineDash(o.dash);
  c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
  c.restore();
  c.save(); c.fillStyle = K.MUT;
  c.beginPath(); c.arc(cx, cy, 4, 0, 7); c.fill(); c.restore();
}
/* An arc from one canvas angle to another, always taking the SHORT way.
   Canvas angles run clockwise because y points down, so working out the
   sweep flag by hand gets this wrong about half the time. Returns the mid
   angle, which is where the label wants to go. */
function arcBetween(c, cx, cy, R, a0, a1, col, w) {
  var dd = a1 - a0;
  while (dd > Math.PI) dd -= 2 * Math.PI;
  while (dd < -Math.PI) dd += 2 * Math.PI;
  c.save(); c.strokeStyle = col; c.lineWidth = w || 2;
  c.beginPath(); c.arc(cx, cy, R, a0, a0 + dd, dd < 0); c.stroke(); c.restore();
  return a0 + dd / 2;
}

/* a point on the rim at angle th, measured anticlockwise from east */
function rim(cx, cy, R, th) { return [cx + R * Math.cos(th), cy - R * Math.sin(th)]; }
/* ------------------------------------------------------------------
   Measured elevation angles, SUSU-30, right leg, one stride each.

   Same subject, same lab, same pipeline for both trials: joint centres from
   the markers, a path frame built from the pelvis displacement so +x is the
   direction of travel and +z is up, heel strike to heel strike taken from the
   heel marker's vertical minimum, resampled to 61 points.

   An elevation angle is measured FROM THE VERTICAL, positive when the distal
   end leads:  thigh hip->knee, shank knee->ankle, foot heel->toe. That is why
   the foot sits near 90 deg for most of stance -- it is roughly horizontal.

   LEG is the sagittal outline (hip, knee, ankle, heel, toe) in millimetres,
   x relative to the pelvis, z from the floor, for the stick figure.
   ------------------------------------------------------------------ */
var EL_W_TH = [
  27.1, 26.2, 25.1, 24.4, 24, 23.3, 22.6, 21.7, 20.6, 19.1, 17.4, 15.6, 13.8, 11.9, 9.9, 8, 6,
  4.2, 2.6, 0.9, -0.5, -1.9, -3.4, -4.9, -6.5, -8, -9.4, -10.7, -11.7, -12.6, -13.4, -14, -14,
  -13.7, -12.8, -10.9, -8.4, -5.6, -2.8, 0.4, 3.6, 6.9, 10.3, 13.5, 16.5, 19.4, 22.1, 24.6, 26.9,
  28.9, 30.6, 31.9, 32.7, 33, 32.6, 31.7, 30.5, 29.1, 27.7, 26.5, 26.1];
var EL_W_SH = [
  7.7, 6.2, 4.8, 2.3, -0.7, -3.2, -5.5, -7.4, -9.1, -10.3, -11.3, -12.1, -12.8, -13.5, -14.1,
  -14.6, -15.1, -15.8, -16.5, -17.3, -18.3, -19.4, -20.5, -21.7, -22.9, -24.3, -25.9, -27.5,
  -29.4, -31.4, -33.6, -35.9, -38.6, -41.6, -45, -48.7, -52.5, -56.4, -59.6, -62.1, -64.4, -65.5,
  -65.6, -64.8, -63.3, -60.9, -58, -54.4, -50.6, -46.1, -41.1, -35.5, -29.6, -23.1, -16.2, -8.8,
  -1.7, 4.7, 10.3, 14.1, 14.4];
var EL_W_FT = [
  108.3, 103.9, 98.7, 96.4, 95.6, 94.9, 94.5, 94.2, 93.8, 93.5, 93.2, 93, 92.7, 92.5, 92.2, 92,
  91.5, 91, 90.5, 89.9, 88.9, 88.2, 87.4, 86.7, 85.9, 85.1, 84.1, 82.9, 81.5, 79.7, 77.7, 75.3,
  71.8, 67.3, 61.1, 52.7, 43.3, 33.5, 23.5, 18.3, 19.8, 22.6, 24.6, 27.3, 30.9, 35.4, 40.2, 45.6,
  51, 56.7, 62.9, 69.2, 75.9, 82.7, 89.8, 96.2, 102.7, 108.8, 113.5, 116.9, 119.4];
var EL_W_LEG = [
  8, 929, 236, 483, 291, 69, 242, -2, 512, 88, 7, 927, 227, 480, 272, 67, 217, 2, 493, 70, 6, 927,
  218, 476, 252, 68, 192, 6, 475, 49, 5, 928, 211, 475, 228, 68, 166, 7, 449, 39, 4, 930, 207,
  475, 202, 69, 139, 8, 423, 36, 4, 933, 200, 477, 178, 69, 114, 8, 398, 33, 2, 936, 193, 477,
  154, 69, 90, 9, 374, 31, 1, 939, 184, 477, 132, 69, 67, 9, 352, 30, 0, 941, 174, 476, 110, 70,
  44, 10, 329, 29, -1, 943, 161, 476, 87, 70, 22, 11, 307, 28, -1, 945, 146, 475, 66, 71, 0, 12,
  285, 28, -2, 949, 131, 475, 44, 72, -22, 13, 263, 27, -2, 953, 115, 475, 23, 72, -44, 14, 241,
  27, -3, 958, 98, 476, 1, 73, -66, 15, 219, 27, -3, 962, 81, 478, -20, 74, -88, 16, 197, 27, -4,
  965, 64, 479, -41, 74, -109, 17, 176, 27, -4, 967, 47, 480, -62, 75, -130, 19, 154, 27, -5, 968,
  31, 480, -83, 77, -151, 21, 132, 26, -6, 968, 17, 481, -103, 79, -171, 24, 110, 26, -6, 967, 2,
  481, -123, 80, -192, 26, 88, 26, -7, 966, -12, 480, -143, 83, -213, 29, 70, 24, -8, 964, -24,
  480, -163, 85, -233, 32, 47, 24, -8, 963, -37, 480, -184, 87, -255, 36, 25, 23, -9, 960, -50,
  479, -205, 89, -277, 39, 2, 23, -9, 957, -64, 478, -227, 92, -300, 42, -22, 23, -10, 954, -77,
  477, -250, 94, -323, 46, -46, 22, -10, 950, -89, 476, -273, 97, -347, 50, -71, 22, -11, 946,
  -100, 475, -296, 100, -371, 55, -97, 21, -12, 942, -109, 474, -317, 103, -395, 62, -122, 21,
  -12, 939, -117, 472, -339, 108, -418, 70, -148, 21, -11, 936, -122, 470, -359, 114, -440, 79,
  -174, 21, -11, 933, -127, 468, -379, 120, -462, 90, -202, 21, -11, 932, -128, 465, -397, 128,
  -482, 104, -231, 21, -10, 930, -125, 461, -413, 137, -500, 121, -259, 21, -9, 930, -118, 455,
  -424, 148, -511, 144, -286, 19, -9, 930, -102, 448, -427, 161, -512, 171, -309, 16, -8, 931,
  -80, 441, -424, 178, -505, 201, -327, 12, -7, 931, -56, 437, -416, 198, -489, 233, -341, 9, -6,
  932, -30, 434, -398, 218, -464, 262, -352, 6, -5, 934, -2, 434, -376, 236, -437, 283, -349, 16,
  -5, 936, 27, 436, -357, 252, -419, 297, -324, 33, -4, 938, 56, 441, -332, 265, -398, 306, -291,
  48, -4, 942, 86, 448, -303, 272, -371, 311, -255, 57, -4, 946, 114, 457, -272, 275, -344, 312,
  -215, 62, -3, 951, 141, 467, -241, 275, -316, 308, -171, 66, -2, 955, 166, 478, -207, 270, -287,
  298, -123, 67, 0, 959, 191, 488, -173, 261, -256, 283, -73, 66, 0, 962, 212, 499, -138, 248,
  -223, 264, -21, 66, 1, 963, 231, 508, -101, 235, -187, 240, 33, 62, 1, 964, 248, 517, -63, 218,
  -149, 214, 88, 58, 2, 963, 262, 524, -22, 198, -108, 185, 145, 55, 2, 963, 272, 528, 21, 177,
  -63, 153, 202, 53, 3, 961, 279, 531, 66, 156, -15, 122, 260, 53, 3, 959, 281, 530, 112, 135, 36,
  91, 317, 55, 4, 956, 278, 526, 159, 115, 89, 63, 371, 62, 4, 953, 272, 519, 207, 98, 142, 38,
  424, 69, 5, 950, 264, 511, 251, 88, 193, 20, 470, 83, 6, 946, 254, 501, 288, 82, 237, 9, 506,
  101, 6, 941, 242, 493, 316, 82, 272, 4, 533, 118, 7, 936, 231, 487, 333, 82, 293, 2, 547, 131,
  7, 932, 227, 483, 331, 76, 296, -4, 544, 135];
var EL_W_META = { dur: 1.078, spd: 1.35 };
var EL_R_TH = [
  21.7, 20.1, 18.9, 18.7, 19.4, 20.1, 20.8, 21.4, 21.7, 21.4, 20.7, 19.8, 18.7, 17.4, 15.8, 13.8,
  11.5, 8.7, 6.2, 3.3, 0.4, -2.3, -4.9, -7.3, -9.3, -10.6, -11, -10.6, -9.5, -7.9, -5.9, -3.6,
  -0.9, 2, 5.2, 8.6, 12.2, 15.7, 19.1, 22.1, 24.9, 27.1, 29.1, 30.4, 30.9, 30.7, 29.7, 28.2, 26.1,
  23.9, 21.9, 20.2, 19, 18.5, 18.7, 19.1, 19.6, 20.1, 20, 19.6, 19.3];
var EL_R_SH = [
  -3, 2.1, 5.5, 6.1, 4, 0.8, -3.2, -8.5, -13.3, -17, -20.5, -23.6, -26.5, -29, -31, -32.7, -34,
  -34.8, -35.5, -35.8, -36, -36, -36.1, -36.4, -36.5, -37.5, -39.6, -42.8, -46.5, -50.4, -54.8,
  -59.3, -63.8, -67.6, -70.5, -72.3, -73.1, -72.6, -71.1, -68.6, -65.3, -61.3, -56.4, -51.4,
  -45.7, -39.1, -32.1, -25, -17.5, -10.6, -4.8, -0.3, 2.7, 3.4, 2, -1, -5.4, -10.4, -14.1, -17.7,
  -21.2];
var EL_R_FT = [
  96, 96.6, 97.6, 97.7, 94.8, 88.9, 87.1, 89.9, 91.6, 92, 92.5, 92.5, 92.3, 92, 91.5, 90.7, 89.5,
  88, 85.7, 82.9, 79.3, 74.9, 69.9, 64.1, 57.3, 50.4, 43.7, 37.2, 31.3, 27, 25.6, 26.1, 26.6,
  26.2, 25.6, 26.3, 28.4, 31.4, 34.9, 39, 43.6, 48.2, 53.6, 59.2, 65.2, 71.5, 77.6, 83.2, 88,
  92.3, 95.7, 98, 98.4, 97.1, 94.3, 90.5, 90.6, 93.1, 92.7, 92.7, 92.6];
var EL_R_LEG = [
  -3, 999, 185, 527, 162, 98, 103, 43, 383, 72, -3, 1002, 171, 524, 187, 98, 127, 44, 408, 77, -3,
  1002, 161, 522, 202, 99, 142, 45, 423, 83, -4, 1000, 159, 520, 204, 96, 145, 43, 425, 81, -4,
  994, 163, 517, 193, 90, 133, 41, 414, 65, -4, 986, 170, 512, 176, 83, 113, 41, 394, 35, -4, 976,
  175, 505, 151, 79, 85, 37, 368, 23, -4, 964, 180, 495, 117, 72, 51, 24, 334, 23, -4, 952, 182,
  483, 84, 68, 20, 14, 305, 22, -4, 939, 179, 471, 56, 68, -10, 10, 276, 20, -3, 927, 174, 460,
  26, 66, -39, 7, 246, 20, -3, 918, 166, 451, -3, 66, -69, 7, 216, 19, -3, 914, 156, 444, -32, 67,
  -98, 7, 187, 19, -3, 913, 145, 439, -60, 68, -127, 9, 158, 19, -3, 912, 132, 435, -88, 69, -157,
  11, 129, 19, -3, 914, 115, 432, -117, 72, -186, 15, 99, 19, -4, 918, 95, 431, -145, 76, -215,
  21, 68, 19, -3, 923, 72, 432, -172, 80, -244, 29, 37, 19, -3, 931, 50, 438, -200, 87, -274, 40,
  5, 19, -2, 939, 26, 445, -227, 95, -303, 52, -29, 18, -2, 948, 2, 454, -252, 105, -330, 69, -63,
  18, -1, 957, -21, 464, -275, 115, -356, 87, -97, 18, -1, 966, -43, 475, -297, 126, -379, 107,
  -132, 17, 0, 975, -63, 486, -318, 139, -401, 129, -167, 16, 1, 984, -79, 497, -337, 149, -418,
  153, -201, 14, 1, 991, -90, 504, -353, 162, -433, 176, -234, 11, 1, 996, -94, 508, -369, 176,
  -447, 199, -264, 7, 1, 1000, -91, 508, -383, 192, -458, 221, -293, 3, 1, 1000, -82, 503, -394,
  207, -466, 241, -320, 1, 1, 998, -69, 495, -400, 221, -470, 260, -341, 6, 0, 993, -52, 485,
  -404, 237, -474, 276, -351, 20, 0, 985, -32, 474, -404, 254, -474, 290, -350, 37, 0, 973, -9,
  462, -399, 270, -468, 303, -343, 54, 0, 959, 18, 449, -385, 284, -454, 316, -332, 68, 0, 944,
  46, 440, -363, 295, -432, 325, -313, 78, -1, 930, 74, 434, -336, 303, -406, 331, -286, 87, -1,
  919, 104, 431, -307, 306, -379, 333, -249, 93, -1, 915, 134, 434, -276, 305, -352, 329, -209,
  95, -2, 913, 162, 440, -245, 300, -324, 320, -166, 94, -1, 914, 188, 449, -214, 291, -295, 306,
  -120, 91, -2, 916, 210, 460, -183, 279, -265, 288, -73, 87, -1, 921, 229, 472, -151, 264, -234,
  267, -26, 81, -2, 926, 244, 485, -118, 245, -201, 241, 22, 76, -2, 934, 253, 498, -87, 227,
  -168, 212, 70, 70, -3, 943, 257, 509, -55, 205, -134, 181, 118, 65, -3, 953, 255, 518, -20, 180,
  -96, 149, 166, 61, -3, 964, 247, 525, 15, 156, -58, 118, 213, 58, -4, 974, 235, 528, 51, 133,
  -17, 90, 259, 57, -4, 984, 219, 529, 88, 114, 22, 67, 301, 58, -5, 993, 202, 527, 122, 101, 59,
  50, 340, 62, -5, 999, 186, 524, 150, 94, 89, 41, 370, 69, -5, 1002, 173, 520, 170, 91, 110, 36,
  391, 76, -4, 1001, 162, 518, 182, 90, 122, 35, 403, 77, -4, 996, 157, 515, 182, 87, 121, 34,
  403, 69, -4, 989, 158, 510, 174, 80, 111, 32, 394, 53, -4, 980, 162, 502, 154, 74, 91, 31, 376,
  34, -4, 969, 166, 494, 125, 70, 61, 24, 346, 27, -4, 957, 169, 484, 92, 63, 29, 10, 315, 26, -3,
  943, 168, 472, 66, 66, -1, 8, 286, 22, -3, 931, 165, 461, 38, 66, -28, 7, 259, 21, -2, 922, 162,
  455, 11, 67, -56, 7, 231, 20];
var EL_R_META = { dur: 0.911, spd: 2.15 };

/* ------------------------------------------------------------------
   The wheel-mounted gyroscope trace from the lecture, digitised from the
   figure on the conversion slides: angular velocity of the wheel in deg/s,
   sampled every 0.1278 s for 52 s. The ripple on the way up is the pushes.

   Everything else on these two figures is computed from this array --
   the unit conversions, the exponential fit and the force-velocity
   profile -- so the numbers on the slides are the athlete's own.
   ------------------------------------------------------------------ */
var WC_DT = 0.12776;
var WC_W = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3.3, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 3.3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3.3, 26.7, 63.3, 100, 140, 173.3,
  200, 216.7, 216.7, 210, 206.7, 203.3, 203.3, 226.7, 253.3, 276.7, 283.3, 276.7, 273.3, 270,
  263.3, 290, 313.3, 336.7, 343.3, 340, 330, 326.7, 333.3, 376.7, 406.7, 416.7, 416.7, 403.3,
  403.3, 400, 426.7, 443.3, 443.3, 436.7, 430, 430, 423.3, 453.3, 463.3, 463.3, 456.7, 453.3,
  443.3, 463.3, 503.3, 533.3, 523.3, 523.3, 526.7, 623.3, 696.7, 696.7, 700, 706.7, 796.7, 853.3,
  846.7, 843.3, 866.7, 963.3, 950, 960, 956.7, 1016.7, 1066.7, 1056.7, 1056.7, 1080, 1166.7,
  1133.3, 1140, 1150, 1220, 1206.7, 1220, 1206.7, 1263.3, 1280, 1283.3, 1276.7, 1290, 1350,
  1336.7, 1336.7, 1336.7, 1403.3, 1380, 1390, 1376.7, 1430, 1423.3, 1436.7, 1420, 1450, 1466.7,
  1456.7, 1456.7, 1463.3, 1516.7, 1490, 1493.3, 1483.3, 1546.7, 1523.3, 1530, 1516.7, 1570,
  1553.3, 1566.7, 1553.3, 1593.3, 1583.3, 1596.7, 1583.3, 1620, 1613.3, 1616.7, 1606.7, 1636.7,
  1646.7, 1643.3, 1636.7, 1646.7, 1670, 1660, 1656.7, 1673.3, 1690, 1680, 1673.3, 1683.3, 1710,
  1696.7, 1693.3, 1703.3, 1730, 1710, 1710, 1703.3, 1736.7, 1726.7, 1726.7, 1733.3, 1746.7,
  1743.3, 1736.7, 1746.7, 1760, 1756.7, 1750, 1766.7, 1776.7, 1773.3, 1766.7, 1783.3, 1780, 1790,
  1776.7, 1803.3, 1796.7, 1800, 1790, 1813.3, 1813.3, 1813.3, 1796.7, 1820, 1813.3, 1816.7,
  1803.3, 1826.7, 1816.7, 1823.3, 1813.3, 1833.3, 1826.7, 1833.3, 1823.3, 1850, 1836.7, 1846.7,
  1830, 1863.3, 1850, 1853.3, 1840, 1873.3, 1843.3, 1863.3, 1846.7, 1880, 1843.3, 1863.3, 1846.7,
  1880, 1860, 1866.7, 1853.3, 1880, 1876.7, 1870, 1860, 1886.7, 1873.3, 1876.7, 1863.3, 1890,
  1880, 1883.3, 1870, 1896.7, 1886.7, 1886.7, 1873.3, 1903.3, 1886.7, 1890, 1880, 1903.3, 1896.7,
  1896.7, 1883.3, 1913.3, 1896.7, 1896.7, 1883.3, 1913.3, 1903.3, 1900, 1890, 1913.3, 1900, 1900,
  1886.7, 1913.3, 1900, 1903.3, 1893.3, 1910, 1903.3, 1906.7, 1886.7, 1913.3, 1903.3, 1896.7,
  1883.3, 1910, 1890, 1896.7, 1880, 1903.3, 1890, 1890, 1876.7, 1893.3, 1893.3, 1893.3, 1880,
  1906.7, 1893.3, 1893.3, 1883.3, 1906.7, 1890, 1890, 1883.3, 1903.3, 1890, 1893.3, 1880, 1913.3,
  1890, 1893.3, 1880, 1896.7, 1893.3, 1886.7, 1880, 1900, 1883.3, 1886.7, 1876.7, 1910, 1886.7,
  1886.7, 1876.7, 1906.7, 1873.3, 1880, 1870, 1893.3, 1873.3, 1883.3, 1866.7, 1886.7, 1873.3,
  1873.3, 1866.7, 1880, 1876.7, 1876.7, 1866.7, 1873.3, 1870, 1870, 1863.3, 1860, 1876.7, 1860,
  1860, 1860, 1860, 1860, 1860, 1860, 1860, 1860, 1860, 1860];

/* ============================================================
   ABSOLUTE AND RELATIVE ANGLES

   Drag either segment. The absolute angle is measured from a fixed line that
   never moves; the relative angle is measured between the two segments and
   does not care which way the whole limb is pointing.
   ============================================================ */
D.register('angles', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var thigh = 255, shank = 300;      /* absolute angles, degrees from east */
  var showAbs = true, showRel = true;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var hx = W * 0.40, hy = H * 0.22, L1 = 128, L2 = 120;
    var ta = toRad(thigh), sa = toRad(shank);
    var kx = hx + L1 * Math.cos(ta), ky = hy - L1 * Math.sin(ta);
    var ex = kx + L2 * Math.cos(sa), ey = ky - L2 * Math.sin(sa);

    /* the fixed reference the absolute angles are measured from */
    if (showAbs) {
      c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .55; c.lineWidth = 1.6;
      c.setLineDash([6, 5]);
      c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx, hy + 250); c.stroke();
      c.beginPath(); c.moveTo(kx, ky); c.lineTo(kx, ky + 220); c.stroke();
      c.restore();
      label(c, 'vertical', hx - 8, hy + 240, { color: K.MUT, size: 11, align: 'right' });
    }

    /* the two segments */
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke();
    c.strokeStyle = K.GRN;
    c.beginPath(); c.moveTo(kx, ky); c.lineTo(ex, ey); c.stroke();
    c.restore();
    [[hx, hy, 'hip'], [kx, ky, 'knee'], [ex, ey, 'ankle']].forEach(function (p) {
      c.save(); c.fillStyle = K.PLATE; c.strokeStyle = K.INK; c.lineWidth = 2.2;
      c.beginPath(); c.arc(p[0], p[1], 7, 0, 7); c.fill(); c.stroke(); c.restore();
      label(c, p[2], p[0] + 13, p[1] - 12, { color: K.MUT, size: 11.5, align: 'left' });
    });

    /* absolute angle of the shank, from vertical */
    var absShank = (270 - shank + 360) % 360;
    if (absShank > 180) absShank -= 360;
    var absThigh = (270 - thigh + 360) % 360;
    if (absThigh > 180) absThigh -= 360;

    if (showAbs) {
      /* from the downward vertical round to the thigh */
      var mid = arcBetween(c, hx, hy, 46, Math.PI / 2, -ta, K.VIO, 2);
      label(c, num(absThigh, 0) + '\u00b0', hx + 64 * Math.cos(mid), hy + 64 * Math.sin(mid),
            { color: K.VIO, size: 14, align: 'center', plate: true });
    }

    /* relative angle at the knee, between the thigh's line and the shank */
    if (showRel) {
      var relRaw = toDeg(sa - ta);
      while (relRaw > 180) relRaw -= 360;
      while (relRaw < -180) relRaw += 360;
      var midK = arcBetween(c, kx, ky, 40, -ta, -sa, K.ACC, 2.4);
      label(c, num(180 - Math.abs(relRaw), 0) + '\u00b0',
            kx + 58 * Math.cos(midK), ky + 58 * Math.sin(midK),
            { color: K.ACC, size: 15, align: 'center', plate: true });
    }

    var relKnee = 180 - Math.abs(((toDeg(sa - ta) + 540) % 360) - 180);
    out.innerHTML = 'thigh <b>' + num(absThigh, 0) + '°</b> from vertical · shank <b>' +
      num(absShank, 0) + '°</b> from vertical · knee angle <b>' + num(relKnee, 0) +
      '°</b>' +
      '<span style="opacity:.72">  ·  turn the whole leg and the two absolute angles both ' +
      'change while the knee angle does not — that is the difference</span>';
  }

  keepOut(seg(u.ctl, [['both', 'both'], ['abs', 'absolute only'], ['rel', 'relative only']], 'both',
    function (w) { showAbs = (w !== 'rel'); showRel = (w !== 'abs'); draw(); }));
  slider(u.ctl, 'Thigh', 190, 330, 1, thigh,
    function (v) { return num((270 - v + 540) % 360 - 180, 0) + '°'; },
    function (v) { thigh = v; draw(); });
  slider(u.ctl, 'Shank', 190, 350, 1, shank,
    function (v) { return num((270 - v + 540) % 360 - 180, 0) + '°'; },
    function (v) { shank = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   WHAT A RADIAN IS

   Lay the radius along the rim. One radius-length of arc is one radian, and
   it takes a little over six of them to go all the way round. That is the
   whole definition — theta = l / r — and it is why radians have no units.
   ============================================================ */
D.register('radian', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 880, h: port ? 480 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var th = 1;                        /* radians */

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H, i;
    ax.clear();
    var R = Math.min(W * 0.26, H * 0.36);
    var cx = W * 0.36, cy = H * 0.50;
    dial(c, K, cx, cy, R, { ring: K.PANEL, width: 1.6 });

    /* each whole radian of arc, marked off so they can be counted */
    var whole = Math.floor(th + 1e-9);
    for (i = 0; i < Math.min(whole, 6); i++) {
      c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 2;
      c.beginPath(); c.arc(cx, cy, R, -(i + 1), -i); c.stroke(); c.restore();
      var p = rim(cx, cy, R, i + 0.5);
      label(c, String(i + 1), cx + (p[0] - cx) * 1.17, cy + (p[1] - cy) * 1.17,
            { color: K.MUT, size: 12, align: 'center' });
    }

    /* the arc itself */
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.arc(cx, cy, R, -th, 0); c.stroke(); c.restore();

    /* the two radii that enclose it */
    var p0 = rim(cx, cy, R, 0), p1 = rim(cx, cy, R, th);
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(p0[0], p0[1]);
    c.moveTo(cx, cy); c.lineTo(p1[0], p1[1]); c.stroke(); c.restore();
    label(c, 'r', (cx + p0[0]) / 2, cy + 18, { color: K.BLUE, size: 15, align: 'center' });

    /* the arc straightened out underneath, against one radius */
    var by = H - 64, bx = W * 0.62;
    var scale = R;                      /* one radius = R pixels */
    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx, by + 26); c.lineTo(bx + scale, by + 26); c.stroke(); c.restore();
    label(c, 'one radius', bx, by + 48, { color: K.BLUE, size: 11.5, align: 'left' });
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx, by - 10); c.lineTo(bx + scale * th, by - 10); c.stroke(); c.restore();
    label(c, 'the arc, straightened', bx, by - 32, { color: K.ACC, size: 11.5, align: 'left' });

    label(c, 'θ = l / r', W * 0.62, H * 0.26, { color: K.INK, size: 20, align: 'left' });
    label(c, fmt(th, 2) + ' rad  =  ' + fmt(toDeg(th), 1) + '°',
          W * 0.62, H * 0.36, { color: K.ACC, size: 17, align: 'left' });
    label(c, 'a whole turn is 2πr / r  =  2π  ≈ 6.28 rad',
          W * 0.62, H * 0.45, { color: K.MUT, size: 12.5, align: 'left' });

    out.innerHTML = 'θ = <b>' + fmt(th, 2) + ' rad</b> = <b>' + fmt(toDeg(th), 1) +
      '°</b> · arc length <b>' + fmt(th, 2) + ' × r</b>' +
      '<span style="opacity:.72">  ·  a radian is a ratio of two lengths, so it has no ' +
      'units at all — which is why rθ comes out in metres</span>';
  }

  keepOut(chips(u.ctl, [['one', '1 rad'], ['half', 'π/2'], ['pi', 'π'],
                        ['full', '2π']], 'one',
    function (w) {
      th = w === 'one' ? 1 : (w === 'half' ? Math.PI / 2 : (w === 'pi' ? Math.PI : 2 * Math.PI));
      sT.quiet(th); draw();
    }));
  var sT = slider(u.ctl, 'Angle', 0.1, 2 * Math.PI, 0.01, th,
    function (v) { return fmt(v, 2) + ' rad'; },
    function (v) { th = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   THE SAME ANGLE, DIFFERENT DISTANCES

   Every point on a rotating body turns through the same angle. What differs
   is how far each one travels, and that is set entirely by its radius.
   ============================================================ */
D.register('arclen', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 490 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var thDeg = 60, rB = 0.55;          /* rB as a fraction of rA */

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var th = toRad(thDeg);
    var RA = Math.min(W * 0.27, H * 0.40), RB = RA * rB;
    var cx = W * 0.36, cy = H * 0.56;

    dial(c, K, cx, cy, RA, { ring: K.PANEL, dash: [4, 5] });
    dial(c, K, cx, cy, RB, { ring: K.PANEL, dash: [4, 5] });

    /* the body, drawn in its start and finish positions */
    var s0 = rim(cx, cy, RA, 0), s1 = rim(cx, cy, RA, th);
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .45; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(s0[0], s0[1]); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(s1[0], s1[1]); c.stroke(); c.restore();

    /* the two arcs actually travelled */
    [[RA, K.ACC, 'A'], [RB, K.GRN, 'B']].forEach(function (p) {
      c.save(); c.strokeStyle = p[1]; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.arc(cx, cy, p[0], -th, 0); c.stroke(); c.restore();
      var a0 = rim(cx, cy, p[0], 0), a1 = rim(cx, cy, p[0], th);
      ax.c.save(); ax.c.fillStyle = p[1];
      ax.c.beginPath(); ax.c.arc(a1[0], a1[1], 6, 0, 7); ax.c.fill();
      ax.c.globalAlpha = .4; ax.c.beginPath(); ax.c.arc(a0[0], a0[1], 5, 0, 7); ax.c.fill();
      ax.c.restore();
      label(c, p[2], a1[0] + 14, a1[1] - 12, { color: p[1], size: 14, align: 'left' });
    });

    /* the angle, marked once */
    c.save(); c.strokeStyle = K.VIO; c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, 34, -th, 0); c.stroke(); c.restore();
    label(c, fmt(thDeg, 0) + '°', cx + 48, cy - 22,
          { color: K.VIO, size: 14, align: 'left', plate: true });

    /* the two arc lengths, straightened and compared */
    var mA = 1.0, mB = rB;            /* radii in metres, A fixed at 1 m */
    var lA = arcLen(mA, th), lB = arcLen(mB, th);
    var bx = W * 0.62, by = H * 0.34, px = (W * 0.22) / Math.max(lA, 0.01);
    [[lA, K.ACC, 'point A, r = 1.00 m'], [lB, K.GRN, 'point B, r = ' + fmt(mB, 2) + ' m']]
      .forEach(function (p, i) {
        var y = by + i * 66;
        c.save(); c.strokeStyle = p[1]; c.lineWidth = 11; c.lineCap = 'round';
        c.beginPath(); c.moveTo(bx, y); c.lineTo(bx + p[0] * px, y); c.stroke(); c.restore();
        label(c, p[2], bx, y - 22, { color: K.MUT, size: 11.5, align: 'left' });
        label(c, 'l = ' + fmt(p[0], 2) + ' m', bx + p[0] * px + 14, y,
              { color: p[1], size: 14, align: 'left', plate: true });
      });
    label(c, 'l = rθ', bx, by - 56, { color: K.INK, size: 20, align: 'left' });

    out.innerHTML = 'both points turn through <b>' + fmt(thDeg, 0) + '°</b> = <b>' +
      fmt(th, 2) + ' rad</b> · A travels <b>' + fmt(lA, 2) + ' m</b>, B travels <b>' +
      fmt(lB, 2) + ' m</b>' +
      '<span style="opacity:.72">  ·  same θ, different l — the radius is the ' +
      'only thing that differs, and θ must be in radians for rθ to work</span>';
  }

  slider(u.ctl, 'Angle turned', 10, 180, 1, thDeg,
    function (v) { return fmt(v, 0) + '°'; }, function (v) { thDeg = v; draw(); });
  slider(u.ctl, 'Radius of B', 0.15, 0.95, 0.01, rB,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { rB = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   TANGENTIAL VELOCITY

   v_t = r.omega. Same angular velocity everywhere on the body; the linear
   speed you actually feel depends on how far out you are — which is the
   whole argument for a long bat, a long club and a long hammer wire.
   ============================================================ */
D.register('tangential', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var w = 20, rA = 1.1;              /* rad/s, and the far point's radius in m */
  var t = 0, playing = false, raf = null, last = 0;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var RA = Math.min(W * 0.25, H * 0.38), RB = RA * 0.52;
    var cx = W * 0.34, cy = H * 0.52;
    var th = t;

    dial(c, K, cx, cy, RA, { ring: K.PANEL, dash: [4, 5] });
    dial(c, K, cx, cy, RB, { ring: K.PANEL, dash: [4, 5] });

    var a = rim(cx, cy, RA, th), bq = rim(cx, cy, RB, th);
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(a[0], a[1]); c.stroke(); c.restore();

    /* the tangent at each point — perpendicular to the radius */
    var mB = rA * 0.52;
    [[a, RA, rA, K.ACC, 'A'], [bq, RB, mB, K.GRN, 'B']].forEach(function (p) {
      var v = vTan(p[2], w);
      var tx = -Math.sin(th), ty = -Math.cos(th);   /* screen-space tangent */
      var len = 16 + v * 7;
      arrow(c, p[0][0], p[0][1], p[0][0] + tx * len, p[0][1] + ty * len,
            { color: p[3], width: 3.4 });
      c.save(); c.fillStyle = p[3];
      c.beginPath(); c.arc(p[0][0], p[0][1], 6, 0, 7); c.fill(); c.restore();
      label(c, p[4] + '  ' + fmt(v, 1) + ' m/s',
            p[0][0] + tx * len + tx * 10, p[0][1] + ty * len + ty * 10,
            { color: p[3], size: 13, align: tx < 0 ? 'right' : 'left', plate: true });
    });

    /* the rotation itself */
    c.save(); c.strokeStyle = K.VIO; c.lineWidth = 2.4;
    c.beginPath(); c.arc(cx, cy, 30, -th - 1.0, -th); c.stroke(); c.restore();
    label(c, 'ω', cx - 44, cy - 34, { color: K.VIO, size: 17, align: 'center' });

    var px = W * 0.62, py = H * 0.26;
    label(c, 'vₜ = rω', px, py, { color: K.INK, size: 22, align: 'left' });
    [['ω, the same for both', fmt(w, 1) + ' rad/s', K.VIO],
     ['A at r = ' + fmt(rA, 2) + ' m', fmt(vTan(rA, w), 1) + ' m/s', K.ACC],
     ['B at r = ' + fmt(mB, 2) + ' m', fmt(vTan(mB, w), 1) + ' m/s', K.GRN]
    ].forEach(function (rw, i) {
      var y = py + 54 + i * 52;
      label(c, rw[0], px, y, { color: K.MUT, size: 12, align: 'left' });
      label(c, rw[1], px, y + 21, { color: rw[2], size: 17, align: 'left' });
    });

    out.innerHTML = 'ω = <b>' + fmt(w, 1) + ' rad/s</b> · at r = ' + fmt(rA, 2) +
      ' m the tip moves at <b>' + fmt(vTan(rA, w), 1) + ' m/s</b>, at r = ' + fmt(mB, 2) +
      ' m only <b>' + fmt(vTan(mB, w), 1) + ' m/s</b>' +
      '<span style="opacity:.72">  ·  the arrow is tangent to the path, so it points where ' +
      'the point would go if it let go right now</span>';
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += dt * w * 0.12; draw();
    raf = requestAnimationFrame(frame);
  }
  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () {
    if (playing) { stop(); return; }
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  });
  slider(row, 'Angular velocity ω', 2, 40, 0.5, w,
    function (v) { return fmt(v, 1) + ' rad/s'; }, function (v) { w = v; draw(); });
  slider(u.ctl, 'Radius of A', 0.3, 1.6, 0.01, rA,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { rA = v; draw(); });
  node._draw = draw; node._stop = stop;
  draw();
});

/* ============================================================
   CENTRIPETAL (RADIAL) ACCELERATION

   Something moving in a circle is accelerating even at constant speed,
   because its direction keeps changing. a_r = omega^2 . r, and the omega is
   squared, which is why spin dominates everything here.
   ============================================================ */
/* ------------------------------------------------------------------
   CENTRIPETAL ACCELERATION  —  a_r = omega^2 . r

   The point of the figure is the release. Cut the wire and the mass does
   NOT fly outward along the radius, which is what almost every student
   draws; it carries straight on along the tangent it already had. So the
   cut has to actually launch the thing, and the old radius has to stay on
   screen as a dashed circle so you can see the straight line leave it.

   Everything is drawn in canvas pixels but the physics is in metres, with
   R/r as the scale. SLOW is a single wall-clock factor applied to both the
   rotation and the flight, so the speed does not jump at the moment of
   release — which would wreck the whole demonstration.
   ------------------------------------------------------------------ */
D.register('centripetal', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  /* One factor for both the turning and the flight, so the speed does not
     jump at the release. 0.16 is slow enough to watch the straight line
     develop; at full speed it clears the figure in under a second. */
  var SLOW = 0.16;
  var w = 6, r = 1.2;
  var t = 0;                           /* current angle on the circle, rad */
  var playing = false, raf = null, last = 0;
  var cut = false, thCut = 0, tf = 0;  /* release angle, and time since release */
  var gone = false;                    /* flown off the canvas */

  function tangentAt(th) { return [-Math.sin(th), -Math.cos(th)]; }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var R = Math.min(W * 0.24, H * 0.36);
    var cx = W * 0.35, cy = H * 0.52;
    var PPM = R / r;                   /* canvas pixels per metre */
    var v = vTan(r, w), aR = aRad(r, w);

    /* the circular path it was on, dashed, always */
    dial(c, K, cx, cy, R, { ring: K.PANEL, dash: [4, 5] });

    var p, tgt;
    if (!cut) {
      p = rim(cx, cy, R, t);
      tgt = tangentAt(t);

      /* the wire, and the force it carries toward the centre */
      c.save(); c.strokeStyle = K.MUT; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(p[0], p[1]); c.stroke(); c.restore();
      var ux = (cx - p[0]) / R, uy = (cy - p[1]) / R;
      var L = 20 + Math.min(120, aR * 1.1);
      arrow(c, p[0], p[1], p[0] + ux * L, p[1] + uy * L, { color: K.ACC, width: 4 });
      label(c, 'aᵣ = ' + fmt(aR, 1) + ' m/s²', p[0] + ux * L + ux * 12,
            p[1] + uy * L + uy * 12, { color: K.ACC, size: 14, align: 'center', plate: true });
    } else {
      var rel = rim(cx, cy, R, thCut);
      tgt = tangentAt(thCut);
      var s = v * tf * SLOW * PPM;                 /* straight-line distance, px */
      /* stop it at the edge rather than letting it vanish and leave an
         empty figure behind */
      var smax = Infinity;
      [[-30 - rel[0], tgt[0]], [W + 30 - rel[0], tgt[0]],
       [-30 - rel[1], tgt[1]], [H + 30 - rel[1], tgt[1]]].forEach(function (q) {
        if (Math.abs(q[1]) > 1e-6) { var k = q[0] / q[1]; if (k > 0) smax = Math.min(smax, k); }
      });
      if (s >= smax) { s = smax; if (!gone) { gone = true; setTimeout(stop, 0); } }
      p = [rel[0] + tgt[0] * s, rel[1] + tgt[1] * s];

      /* the straight line it is travelling along, drawn the full width so you
         can see it is a line and not a curve */
      c.save(); c.strokeStyle = K.BLUE; c.globalAlpha = 0.30; c.lineWidth = 2;
      c.setLineDash([6, 6]);
      c.beginPath();
      c.moveTo(rel[0] - tgt[0] * 40, rel[1] - tgt[1] * 40);
      c.lineTo(rel[0] + tgt[0] * 2000, rel[1] + tgt[1] * 2000);
      c.stroke(); c.restore();

      /* the trail actually covered so far, solid */
      c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(rel[0], rel[1]); c.lineTo(p[0], p[1]); c.stroke(); c.restore();

      /* where it let go */
      c.save(); c.fillStyle = K.PLATE; c.strokeStyle = K.ACC; c.lineWidth = 2.5;
      c.beginPath(); c.arc(rel[0], rel[1], 6, 0, 7); c.fill(); c.stroke(); c.restore();
      label(c, 'released here', rel[0] - tgt[0] * 14 - 6, rel[1] - tgt[1] * 14 + 14,
            { color: K.ACC, size: 12, align: 'right', plate: true });

      /* the radius it WOULD have had, to kill the "flies outward" idea */
      c.save(); c.strokeStyle = K.MUT; c.globalAlpha = 0.45; c.lineWidth = 1.6;
      c.setLineDash([3, 5]);
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(p[0], p[1]); c.stroke(); c.restore();

      var dist = Math.hypot(p[0] - cx, p[1] - cy) / PPM;
      label(c, 'distance from centre ' + fmt(dist, 2) + ' m', (cx + p[0]) / 2, (cy + p[1]) / 2 - 12,
            { color: K.MUT, size: 12, align: 'center', plate: true });
    }

    /* tangential velocity — unchanged by the cut, which is the whole point */
    var VL = 20 + v * 7;
    arrow(c, p[0], p[1], p[0] + tgt[0] * VL, p[1] + tgt[1] * VL,
          { color: K.BLUE, width: 3.2 });
    label(c, 'v = ' + fmt(v, 1) + ' m/s', p[0] + tgt[0] * VL + tgt[0] * 10,
          p[1] + tgt[1] * VL + tgt[1] * 10,
          { color: K.BLUE, size: 13, align: tgt[0] < 0 ? 'right' : 'left', plate: true });

    c.save(); c.fillStyle = K.INK;
    c.beginPath(); c.arc(p[0], p[1], 10, 0, 7); c.fill(); c.restore();

    /* readout panel */
    var px = W * 0.64, py = H * 0.24;
    label(c, 'aᵣ = ω²r', px, py, { color: K.INK, size: 22, align: 'left' });
    [['angular velocity ω', fmt(w, 1) + ' rad/s', K.VIO],
     ['radius r', fmt(r, 2) + ' m', K.MUT],
     ['radial acceleration', fmt(aR, 1) + ' m/s²', K.ACC],
     ['… in g', fmt(aR / 9.81, 1) + ' g', K.GRN]
    ].forEach(function (rw, i) {
      var y = py + 50 + i * 48;
      label(c, rw[0], px, y, { color: K.MUT, size: 12, align: 'left' });
      label(c, rw[1], px, y + 20, { color: rw[2], size: 16, align: 'left' });
    });

    if (cut) {
      label(c, gone ? 'gone — straight line, constant speed, for ever'
                    : 'no wire, no aᵣ — it keeps the velocity it already had',
            W * 0.04, H - 24, { color: K.ACC, size: 14, align: 'left' });
      out.innerHTML = 'Wire cut at ' + num(toDeg(thCut) % 360, 0) + '°. ' +
        'It leaves at <b>' + fmt(v, 1) + ' m/s</b> along the tangent and keeps going — ' +
        '<b>straight</b>, not outward along the radius.' +
        '<span style="opacity:.72">  ·  the circle needed a force; the straight line does not</span>';
    } else {
      out.innerHTML = 'ω = <b>' + fmt(w, 1) + ' rad/s</b>, r = <b>' + fmt(r, 2) +
        ' m</b> → aᵣ = <b>' + fmt(aR, 1) + ' m/s²</b> (' + fmt(aR / 9.81, 1) + ' g)' +
        '<span style="opacity:.72">  ·  double ω and the radial acceleration ' +
        '<b>quadruples</b>; double r and it only doubles</span>';
    }

  }

  function stop() {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null; btn.innerHTML = '▶ Play';
  }
  function start() {
    if (playing) return;
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (cut) { if (!gone) tf += dt; }
    else { t += dt * w * SLOW; }
    draw();
    raf = requestAnimationFrame(frame);
  }
  function doCut() {
    if (cut) return;
    cut = true; thCut = t; tf = 0; gone = false;
    cutChip.innerHTML = '✓ wire cut';
    start();                      /* cutting always launches it, even from a pause */
    draw();
  }
  function doReset() {
    cut = false; gone = false; tf = 0;
    cutChip.innerHTML = 'cut the wire';
    draw();
  }

  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () { playing ? stop() : start(); });
  var chipRow = keepOut(chips(row, [['cut', 'cut the wire'], ['reset', 'reset']], null,
    function (k) { k === 'cut' ? doCut() : doReset(); }));
  var cutChip = chipRow.children[0];
  slider(u.ctl, 'Angular velocity ω', 1, 20, 0.5, w,
    function (v) { return fmt(v, 1) + ' rad/s'; }, function (v) { w = v; draw(); });
  slider(u.ctl, 'Radius r', 0.3, 2.0, 0.05, r,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { r = v; draw(); });
  node._draw = draw; node._stop = stop;
  draw();
});

D.register('atotal', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 900, h: port ? 500 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  /* the hammer throw's own omega of 12 rad/s makes the radial arrow 18 times
     the tangential one, which draws as a single line. Opening on 6 rad/s keeps
     both arrows legible, and pushing the slider to 12 is the demonstration. */
  var w = 6, al = 8, r = 1.2;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var R = Math.min(W * 0.21, H * 0.32);
    var cx = W * 0.33, cy = H * 0.54, th = 0.9;
    var p = rim(cx, cy, R, th);

    dial(c, K, cx, cy, R, { ring: K.PANEL, dash: [4, 5] });
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(p[0], p[1]); c.stroke(); c.restore();

    var at = aTan(r, al), ar = aRad(r, w), tot = aTot(at, ar);
    var S = 150 / Math.max(tot, 1);          /* pixels per m/s^2 */

    var ux = (cx - p[0]) / R, uy = (cy - p[1]) / R;        /* inward  */
    var tx = -Math.sin(th), ty = -Math.cos(th);            /* tangent */

    /* the two components, then the resultant */
    arrow(c, p[0], p[1], p[0] + ux * ar * S, p[1] + uy * ar * S, { color: K.ACC, width: 3.4 });
    arrow(c, p[0], p[1], p[0] + tx * at * S, p[1] + ty * at * S, { color: K.GRN, width: 3.4 });
    var rx = p[0] + (ux * ar + tx * at) * S, ry = p[1] + (uy * ar + ty * at) * S;
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .5; c.lineWidth = 1.4; c.setLineDash([4, 4]);
    c.beginPath();
    c.moveTo(p[0] + ux * ar * S, p[1] + uy * ar * S); c.lineTo(rx, ry);
    c.moveTo(p[0] + tx * at * S, p[1] + ty * at * S); c.lineTo(rx, ry);
    c.stroke(); c.restore();
    arrow(c, p[0], p[1], rx, ry, { color: K.BLUE, width: 4.4 });

    c.save(); c.fillStyle = K.INK; c.beginPath(); c.arc(p[0], p[1], 7, 0, 7); c.fill(); c.restore();
    label(c, 'aᵣ', p[0] + ux * ar * S * 0.6 - 16, p[1] + uy * ar * S * 0.6,
          { color: K.ACC, size: 15, align: 'center', plate: true });
    label(c, 'aₜ', p[0] + tx * at * S * 0.6, p[1] + ty * at * S * 0.6 - 14,
          { color: K.GRN, size: 15, align: 'center', plate: true });

    var px = W * 0.62, py = H * 0.20;
    label(c, 'aₜₒₜₐₗ² = aᵣ² + aₜ²',
          px, py, { color: K.INK, size: 20, align: 'left' });
    [['tangential  aₜ = αr', fmt(at, 1) + ' m/s²', K.GRN],
     ['radial  aᵣ = ω²r', fmt(ar, 1) + ' m/s²', K.ACC],
     ['total', fmt(tot, 1) + ' m/s²', K.BLUE]
    ].forEach(function (rw, i) {
      var y = py + 54 + i * 54;
      label(c, rw[0], px, y, { color: K.MUT, size: 12, align: 'left' });
      label(c, rw[1], px, y + 21, { color: rw[2], size: 17, align: 'left' });
    });
    label(c, 'the radial part is ' + fmt(ar / Math.max(tot, 0.01) * 100, 0) + '% of the total',
          px, py + 54 + 3 * 54 + 6, { color: K.MUT, size: 12.5, align: 'left' });

    out.innerHTML = 'α = <b>' + fmt(al, 1) + ' rad/s²</b>, ω = <b>' + fmt(w, 1) +
      ' rad/s</b>, r = <b>' + fmt(r, 2) + ' m</b> → aₜ <b>' + fmt(at, 1) +
      '</b>, aᵣ <b>' + fmt(ar, 1) + '</b>, total <b>' + fmt(tot, 1) + ' m/s²</b>' +
      '<span style="opacity:.72">  ·  once ω is anything much above a few rad/s the ' +
      'radial term swamps the tangential one, because it is squared</span>';
  }

  slider(u.ctl, 'Angular velocity ω', 0, 20, 0.5, w,
    function (v) { return fmt(v, 1) + ' rad/s'; }, function (v) { w = v; draw(); });
  slider(u.ctl, 'Angular acceleration α', 0, 20, 0.5, al,
    function (v) { return fmt(v, 1) + ' rad/s²'; }, function (v) { al = v; draw(); });
  slider(u.ctl, 'Radius r', 0.3, 2.0, 0.05, r,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { r = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   THE BICYCLE WHEEL, ALL THE WAY THROUGH

   Marc's running example, done as one chain rather than four separate
   slides: degrees to radians, to angular velocity, to tangential velocity,
   to angular acceleration, to tangential acceleration.
   ============================================================ */
D.register('bikewheel', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 920, h: port ? 520 : 430,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var deg = EX.wheelDeg, tt = EX.wheelT, r = EX.wheelR, step = 4;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var th = toRad(deg), w = th / tt, l = arcLen(r, th),
        v = vTan(r, w), al = w / tt, at = aTan(r, al);

    /* the wheel */
    var R = Math.min(W * 0.20, H * 0.34), cx = W * 0.22, cy = H * 0.46;
    dial(c, K, cx, cy, R, { ring: K.PANEL });
    var p0 = rim(cx, cy, R, Math.PI / 2), p1 = rim(cx, cy, R, Math.PI / 2 - th);
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .45; c.lineWidth = 4;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(p0[0], p0[1]); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 4;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(p1[0], p1[1]); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + th); c.stroke(); c.restore();
    label(c, fmt(deg, 0) + '°', cx + 6, cy - R - 20,
          { color: K.ACC, size: 15, align: 'left' });
    label(c, 'r = ' + fmt(r, 2) + ' m', cx, cy + R + 26,
          { color: K.MUT, size: 12.5, align: 'center' });

    /* the chain of steps, revealed one at a time */
    var steps = [
      ['θ in radians', fmt(deg, 0) + '° × π/180', fmt(th, 3) + ' rad', K.VIO],
      ['arc length  l = rθ', fmt(r, 2) + ' × ' + fmt(th, 3), fmt(l, 4) + ' m', K.VIO],
      ['angular velocity  ω = Δθ/Δt', fmt(th, 3) + ' / ' + fmt(tt, 2), fmt(w, 2) + ' rad/s', K.BLUE],
      ['tangential velocity  vₜ = rω', fmt(r, 2) + ' × ' + fmt(w, 2), fmt(v, 3) + ' m/s', K.BLUE],
      ['angular acceleration  α = Δω/Δt', fmt(w, 2) + ' / ' + fmt(tt, 2), fmt(al, 1) + ' rad/s²', K.GRN],
      ['tangential acceleration  aₜ = αr', fmt(al, 1) + ' × ' + fmt(r, 2), fmt(at, 2) + ' m/s²', K.GRN]
    ];
    var bx = W * 0.44, by = H * 0.13, rowH = (H * 0.72) / steps.length;
    steps.forEach(function (s, i) {
      var on = i < step, y = by + i * rowH;
      c.save(); c.globalAlpha = on ? 1 : 0.22;
      label(c, s[0], bx, y, { color: K.MUT, size: 12 });
      label(c, s[1] + '  =', bx, y + 21, { color: K.MUT, size: 13 });
      label(c, s[2], bx + 250, y + 21, { color: s[3], size: 17 });
      c.restore();
      if (on && i < step - 1) {
        c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1;
        c.beginPath(); c.moveTo(bx, y + 34); c.lineTo(bx + 380, y + 34); c.stroke(); c.restore();
      }
    });

    out.innerHTML = 'a wheel of r = <b>' + fmt(r, 2) + ' m</b> turning <b>' + fmt(deg, 0) +
      '°</b> in <b>' + fmt(tt, 2) + ' s</b> · ω = <b>' + fmt(w, 2) +
      ' rad/s</b> · vₜ = <b>' + fmt(v, 3) + ' m/s</b> · aₜ = <b>' +
      fmt(at, 2) + ' m/s²</b>' +
      '<span style="opacity:.72">  ·  every step is either ×r or ÷Δt — ' +
      'that is the entire lecture in one column</span>';
  }

  keepOut(chips(u.ctl, [['1', 'θ'], ['2', 'l'], ['3', 'ω'], ['4', 'vₜ'],
                        ['5', 'α'], ['6', 'aₜ']], '4',
    function (w2) { step = +w2; draw(); }));
  slider(u.ctl, 'Angle turned', 5, 360, 5, deg,
    function (v) { return fmt(v, 0) + '°'; }, function (v) { deg = v; draw(); });
  slider(u.ctl, 'Time taken', 0.05, 1.5, 0.05, tt,
    function (v) { return fmt(v, 2) + ' s'; }, function (v) { tt = v; draw(); });
  slider(u.ctl, 'Wheel radius', 0.1, 0.7, 0.01, r,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { r = v; draw(); });
  node._draw = draw;
  draw();
});


/* ============================================================
   FROM A GYROSCOPE TO A SPEED

   What the wheel-mounted sensor actually hands you is degrees per second.
   Getting from there to a wheelchair's speed in km/h is three conversions,
   and the middle one is this lecture's v = r.omega.
   ============================================================ */
D.register('gyroconv', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 920, h: port ? 470 : 400,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var dps = 1000, r = EX.wcR;

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var rad = toRad(dps), ms = vTan(r, rad), kmh = ms * 3.6;

    var boxes = [
      ['gyroscope', fmt(dps, 0), 'deg/s', K.MUT],
      ['× π/180', fmt(rad, 2), 'rad/s', K.VIO],
      ['× r = ' + fmt(r, 2) + ' m', fmt(ms, 2), 'm/s', K.BLUE],
      ['× 3.6', fmt(kmh, 1), 'km/h', K.GRN]
    ];
    var n = boxes.length, bw = W * 0.19, gap = (W - bw * n) / (n + 1), by = H * 0.30, bh = 108;
    boxes.forEach(function (b, i) {
      var bx = gap + i * (bw + gap);
      c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.4;
      c.strokeRect(bx + .5, by + .5, bw, bh); c.restore();
      label(c, b[0], bx + bw / 2, by - 16, { color: K.MUT, size: 12, align: 'center' });
      label(c, b[1], bx + bw / 2, by + 44, { color: b[3], size: 26, align: 'center' });
      label(c, b[2], bx + bw / 2, by + 80, { color: K.MUT, size: 13, align: 'center' });
      if (i < n - 1) arrow(c, bx + bw + 6, by + bh / 2, bx + bw + gap - 6, by + bh / 2,
                           { color: K.MUT, width: 2.4 });
    });

    label(c, 'vₜ = rω is the only step that needs the wheel',
          W / 2, by + bh + 50, { color: K.INK, size: 14, align: 'center' });
    label(c, 'a 66 cm wheel, so r = 0.33 m',
          W / 2, by + bh + 76, { color: K.MUT, size: 12.5, align: 'center' });

    out.innerHTML = '<b>' + fmt(dps, 0) + ' deg/s</b> → <b>' + fmt(rad, 2) +
      ' rad/s</b> → <b>' + fmt(ms, 2) + ' m/s</b> → <b>' + fmt(kmh, 1) + ' km/h</b>' +
      '<span style="opacity:.72">  ·  the sensor never measures speed — it measures ' +
      'turning, and the radius is what turns one into the other</span>';
  }

  /* the three chips are read straight off Marc's own wheel-mounted trace:
     the first push clears 200 deg/s, the chair is through 1000 about ten
     seconds later, and it tops out just under 1900. */
  keepOut(chips(u.ctl, [['push', 'first push  200'], ['accel', 'accelerating  1000'],
                        ['top', 'top speed  1900']], 'accel',
    function (w) { dps = w === 'push' ? 200 : (w === 'top' ? 1900 : 1000); sD.quiet(dps); draw(); }));
  var sD = slider(u.ctl, 'Gyroscope reading', 50, 2000, 10, dps,
    function (v) { return fmt(v, 0) + ' deg/s'; }, function (v) { dps = v; draw(); });
  slider(u.ctl, 'Wheel radius', 0.15, 0.40, 0.01, r,
    function (v) { return fmt(v, 2) + ' m'; }, function (v) { r = v; draw(); });
  node._draw = draw;
  draw();
});
/* ==================================================================
   PLANAR COVARIATION — the nervous system's shortcut

   Three elevation angles, three dimensions, and the measured loop turns
   out to lie almost exactly in a plane. The plane is NOT drawn in; it is
   fitted here, in the browser, by principal components on whatever trial
   is selected, and the variance it accounts for is printed. That way the
   claim on the slide is something the figure demonstrates rather than
   something it illustrates.
   ================================================================== */

/* --- symmetric 3x3 eigen-decomposition, cyclic Jacobi ------------------
   Small enough to be exact for our purposes and short enough to read.
   Returns { val: [l0>=l1>=l2], vec: [v0, v1, v2] } with vectors as rows. */
function eig3(A) {
  var a = [[A[0][0], A[0][1], A[0][2]],
           [A[1][0], A[1][1], A[1][2]],
           [A[2][0], A[2][1], A[2][2]]];
  var v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (var sweep = 0; sweep < 24; sweep++) {
    var off = a[0][1] * a[0][1] + a[0][2] * a[0][2] + a[1][2] * a[1][2];
    if (off < 1e-14) break;
    [[0, 1], [0, 2], [1, 2]].forEach(function (pq) {
      var p = pq[0], q = pq[1];
      if (Math.abs(a[p][q]) < 1e-18) return;
      var theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      var t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      var c = 1 / Math.sqrt(t * t + 1), s = t * c;
      var i;
      for (i = 0; i < 3; i++) {
        var aip = a[i][p], aiq = a[i][q];
        a[i][p] = c * aip - s * aiq; a[i][q] = s * aip + c * aiq;
      }
      for (i = 0; i < 3; i++) {
        var api = a[p][i], aqi = a[q][i];
        a[p][i] = c * api - s * aqi; a[q][i] = s * api + c * aqi;
        var vip = v[i][p], viq = v[i][q];
        v[i][p] = c * vip - s * viq; v[i][q] = s * vip + c * viq;
      }
    });
  }
  var ord = [0, 1, 2].sort(function (i, j) { return a[j][j] - a[i][i]; });
  return { val: ord.map(function (i) { return Math.max(0, a[i][i]); }),
           vec: ord.map(function (i) { return [v[0][i], v[1][i], v[2][i]]; }) };
}

/* fit a plane to an n x 3 point cloud */
function planeFit(P) {
  var n = P.length, i, k, m = [0, 0, 0];
  for (i = 0; i < n; i++) for (k = 0; k < 3; k++) m[k] += P[i][k] / n;
  var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (i = 0; i < n; i++) {
    var d = [P[i][0] - m[0], P[i][1] - m[1], P[i][2] - m[2]];
    for (k = 0; k < 3; k++) for (var j = 0; j < 3; j++) C[k][j] += d[k] * d[j] / n;
  }
  var e = eig3(C);
  var tot = e.val[0] + e.val[1] + e.val[2] || 1;
  /* rms distance from the fitted plane, in degrees */
  var ss = 0;
  for (i = 0; i < n; i++) {
    var dd = (P[i][0] - m[0]) * e.vec[2][0] + (P[i][1] - m[1]) * e.vec[2][1] +
             (P[i][2] - m[2]) * e.vec[2][2];
    ss += dd * dd;
  }
  var nn = e.vec[2];
  if (nn[2] < 0) nn = [-nn[0], -nn[1], -nn[2]];
  return { mean: m, u: e.vec[0], v: e.vec[1], n: nn,
           pct: [e.val[0] / tot, e.val[1] / tot, e.val[2] / tot],
           rms: Math.sqrt(ss / n) };
}

/* --- a very small 3D camera -------------------------------------------
   az turns the scene about the vertical; tilt raises the eye above the
   horizontal plane. Returns screen x, screen y (y down) and a depth so
   back faces can be drawn first. */
function proj3(st, x, y, z) {
  var ca = Math.cos(st.az), sa = Math.sin(st.az);
  var X = x * ca + y * sa, Y = -x * sa + y * ca;
  var ct = Math.cos(st.tilt), stt = Math.sin(st.tilt);
  return [X, -(z * ct - Y * stt), Y * ct + z * stt];
}
/* point the camera along a given direction, so a button can snap the view */
function lookAlong(st, d) {
  var L = Math.hypot(d[0], d[1], d[2]) || 1;
  var nx = d[0] / L, ny = d[1] / L, nz = d[2] / L;
  st.tilt = Math.asin(Math.max(-1, Math.min(1, nz)));
  var ct = Math.cos(st.tilt);
  st.az = Math.abs(ct) < 1e-6 ? st.az : Math.atan2(-nx, ny);
}

D.register('covar', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 980, h: port ? 760 : 480,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);

  var TRIALS = {
    walk: { TH: EL_W_TH, SH: EL_W_SH, FT: EL_W_FT, LEG: EL_W_LEG, M: EL_W_META,
            name: 'walking' },
    run:  { TH: EL_R_TH, SH: EL_R_SH, FT: EL_R_FT, LEG: EL_R_LEG, M: EL_R_META,
            name: 'running' }
  };
  var which = 'walk';
  var st = { az: 0.72, tilt: 0.42 };
  var phase = 0, playing = false, raf = null, last = 0;
  var fit = null, pts = null, span = 0;
  var HALF = 62;                 /* half-width of the cube, degrees */

  function prep() {
    var T = TRIALS[which], i;
    pts = [];
    for (i = 0; i < T.TH.length; i++) pts.push([T.TH[i], T.SH[i], T.FT[i]]);
    fit = planeFit(pts);
    var lo = 1e9, hi = -1e9;
    pts.forEach(function (p) {
      for (var k = 0; k < 3; k++) {
        var dq = p[k] - fit.mean[k];
        if (dq < lo) lo = dq; if (dq > hi) hi = dq;
      }
    });
    span = hi - lo;
  }
  /* Open on a three-quarter view of the fitted plane: near enough to its
     normal that the loop reads as a loop, far enough off that you can see
     it is sitting on a surface in 3D. */
  function homeView() {
    lookAlong(st, fit.n);
    st.az += 0.62;
    st.tilt = Math.max(0.12, Math.min(1.15, st.tilt - 0.30));
  }
  prep(); homeView();

  /* ---------------- panel 1 : the leg itself ---------------- */
  function drawLeg(x0, y0, w, h) {
    var c = ax.c, K = C(), T = TRIALS[which];
    var n = T.TH.length, f = Math.min(n - 1, Math.round(phase * (n - 1)));
    /* the whole stride's envelope sets the scale, so it does not jiggle */
    var lo = 1e9, hi = -1e9, xl = 1e9, xh = -1e9, i, k;
    for (i = 0; i < n; i++) for (k = 0; k < 5; k++) {
      var X = T.LEG[(i * 5 + k) * 2], Z = T.LEG[(i * 5 + k) * 2 + 1];
      if (Z < lo) lo = Z; if (Z > hi) hi = Z;
      if (X < xl) xl = X; if (X > xh) xh = X;
    }
    var pad = 24;
    var s = Math.min((w - 16) / (xh - xl + pad * 2), (h - 46) / (hi - lo + pad));
    var cx = x0 + w / 2 - (xl + xh) / 2 * s, cy = y0 + h - 18 + lo * s;
    function P(k, ff) {
      var X = T.LEG[(ff * 5 + k) * 2], Z = T.LEG[(ff * 5 + k) * 2 + 1];
      return [cx + X * s, cy - Z * s];
    }
    /* ghosts of the whole stride, so the one pose has context */
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = 0.17; c.lineWidth = 1.4;
    for (i = 0; i < n; i += 5) {
      c.beginPath();
      [0, 1, 2, 3, 4].forEach(function (k2, j) {
        var p = P(k2, i); j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]);
      });
      c.stroke();
    }
    c.restore();
    /* floor */
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + 6, cy); c.lineTo(x0 + w - 6, cy); c.stroke(); c.restore();
    /* the live pose, one colour per segment so it ties to the traces */
    var segs = [[0, 1, K.VIO, 'thigh'], [1, 2, K.ORG, 'shank'], [3, 4, K.GRN, 'foot']];
    segs.forEach(function (sg) {
      var a = P(sg[0], f), b = P(sg[1], f);
      c.save(); c.strokeStyle = sg[2]; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.restore();
    });
    /* ankle to heel, drawn thin: it is not one of the three angles */
    var pa = P(2, f), ph = P(3, f);
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(pa[0], pa[1]); c.lineTo(ph[0], ph[1]); c.stroke(); c.restore();
    [0, 1, 2].forEach(function (k2) {
      var p = P(k2, f);
      c.save(); c.fillStyle = K.INK; c.beginPath(); c.arc(p[0], p[1], 4, 0, 7); c.fill(); c.restore();
    });
    /* the verticals the angles are measured from */
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .5; c.lineWidth = 1;
    c.setLineDash([3, 4]);
    [0, 1].forEach(function (k2) {
      var p = P(k2, f);
      c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0], p[1] + 46); c.stroke();
    });
    c.restore();
    label(ax.c, TRIALS[which].name + '  ·  ' + fmt(TRIALS[which].M.spd, 2) + ' m/s  (' +
          fmt(TRIALS[which].M.spd * 3.6, 1) + ' km/h)', x0 + w / 2, y0 + 10,
          { color: K.MUT, size: 12, align: 'center' });
  }

  /* ---------------- panel 2 : the three angles over the cycle ------- */
  function drawTraces(x0, y0, w, h) {
    var c = ax.c, K = C(), T = TRIALS[which], n = T.TH.length;
    var lo = -80, hi = 125;
    function Yv(v) { return y0 + h - 16 - (v - lo) / (hi - lo) * (h - 30); }
    function Xi(i) { return x0 + 30 + i / (n - 1) * (w - 42); }
    /* zero line and frame */
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0 + 30, y0 + 14); c.lineTo(x0 + 30, y0 + h - 16);
    c.lineTo(x0 + w - 12, y0 + h - 16); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .4; c.setLineDash([3, 4]);
    c.beginPath(); c.moveTo(x0 + 30, Yv(0)); c.lineTo(x0 + w - 12, Yv(0)); c.stroke(); c.restore();
    [[-50, '−50°'], [0, '0°'], [50, '50°'], [100, '100°']].forEach(function (t) {
      label(c, t[1], x0 + 26, Yv(t[0]), { color: K.MUT, size: 10.5, align: 'right' });
    });
    var NAMES = [['TH', K.VIO, 'thigh'], ['SH', K.ORG, 'shank'], ['FT', K.GRN, 'foot']];
    NAMES.forEach(function (s) {
      var A = T[s[0]], i;
      c.save(); c.strokeStyle = s[1]; c.lineWidth = 2.4; c.beginPath();
      for (i = 0; i < n; i++) { var X = Xi(i), Y = Yv(A[i]); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }
      c.stroke(); c.restore();
    });
    /* name each curve where it is furthest from the other two, so the three
       labels never stack up on each other whatever the trial */
    NAMES.forEach(function (s) {
      var A = T[s[0]], others = NAMES.filter(function (o) { return o !== s; }), best = 0, bd = -1, i;
      for (i = 4; i < n - 4; i++) {
        var dmin = Math.min(Math.abs(A[i] - T[others[0][0]][i]), Math.abs(A[i] - T[others[1][0]][i]));
        if (dmin > bd) { bd = dmin; best = i; }
      }
      label(c, s[2], Xi(best), Yv(A[best]) - 14,
            { color: s[1], size: 11.5, align: 'center', plate: true });
    });
    /* the phase cursor, shared with the other two panels */
    var cxp = Xi(phase * (n - 1));
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(cxp, y0 + 14); c.lineTo(cxp, y0 + h - 16); c.stroke(); c.restore();
    label(c, 'elevation angles over one stride', x0 + w / 2, y0 + 8,
          { color: K.MUT, size: 12, align: 'center' });
    label(c, '% of stride', x0 + w / 2, y0 + h - 3, { color: K.MUT, size: 10.5, align: 'center' });
  }

  /* ---------------- panel 3 : the loop, and the plane it lies in ---- */
  function draw3D(x0, y0, w, h) {
    var c = ax.c, K = C(), T = TRIALS[which], n = T.TH.length;
    var cx = x0 + w / 2, cy = y0 + h / 2 + 6;
    var S = Math.min(w, h) * 0.0047;        /* screen px per degree */
    function Q(p) {
      var q = proj3(st, (p[0] - fit.mean[0]), (p[1] - fit.mean[1]), (p[2] - fit.mean[2]));
      return [cx + q[0] * S, cy + q[1] * S, q[2]];
    }
    /* the cube the three angles live in */
    var cor = [], i, j;
    for (i = 0; i < 8; i++)
      cor.push(Q([fit.mean[0] + (i & 1 ? HALF : -HALF),
                  fit.mean[1] + (i & 2 ? HALF : -HALF),
                  fit.mean[2] + (i & 4 ? HALF : -HALF)]));
    var E = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1; c.globalAlpha = .75;
    E.forEach(function (e) {
      c.beginPath(); c.moveTo(cor[e[0]][0], cor[e[0]][1]);
      c.lineTo(cor[e[1]][0], cor[e[1]][1]); c.stroke();
    });
    c.restore();

    /* the fitted plane, as a grid patch sized to the loop */
    var su = 0, sv = 0;
    pts.forEach(function (p) {
      var dx = p[0] - fit.mean[0], dy = p[1] - fit.mean[1], dz = p[2] - fit.mean[2];
      su = Math.max(su, Math.abs(dx * fit.u[0] + dy * fit.u[1] + dz * fit.u[2]));
      sv = Math.max(sv, Math.abs(dx * fit.v[0] + dy * fit.v[1] + dz * fit.v[2]));
    });
    su *= 1.18; sv *= 1.18;
    function onPlane(a, b) {
      return [fit.mean[0] + fit.u[0] * a + fit.v[0] * b,
              fit.mean[1] + fit.u[1] * a + fit.v[1] * b,
              fit.mean[2] + fit.u[2] * a + fit.v[2] * b];
    }
    c.save(); c.strokeStyle = K.BLUE; c.globalAlpha = .34; c.lineWidth = 1;
    var NG = 6;
    for (i = 0; i <= NG; i++) {
      var a = -su + 2 * su * i / NG;
      c.beginPath();
      for (j = 0; j <= NG; j++) {
        var q = Q(onPlane(a, -sv + 2 * sv * j / NG));
        j ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]);
      }
      c.stroke();
      var b = -sv + 2 * sv * i / NG;
      c.beginPath();
      for (j = 0; j <= NG; j++) {
        var q2 = Q(onPlane(-su + 2 * su * j / NG, b));
        j ? c.lineTo(q2[0], q2[1]) : c.moveTo(q2[0], q2[1]);
      }
      c.stroke();
    }
    c.restore();

    /* the loop, stance in warm, swing in cool, as in the published figures */
    var SW = Math.round(n * 0.62);
    c.save(); c.lineWidth = 3.2; c.lineJoin = 'round';
    [[0, SW, K.ACC], [SW, n, K.BLUE]].forEach(function (sgm) {
      c.strokeStyle = sgm[2]; c.beginPath();
      for (i = sgm[0]; i < sgm[1]; i++) {
        var q = Q(pts[i]);
        i === sgm[0] ? c.moveTo(q[0], q[1]) : c.lineTo(q[0], q[1]);
      }
      c.stroke();
    });
    /* close it */
    c.strokeStyle = K.BLUE; c.beginPath();
    var qa = Q(pts[n - 1]), qb = Q(pts[0]);
    c.moveTo(qa[0], qa[1]); c.lineTo(qb[0], qb[1]); c.stroke();
    c.restore();

    /* where we are now */
    var qp = Q(pts[Math.min(n - 1, Math.round(phase * (n - 1)))]);
    c.save(); c.fillStyle = K.INK; c.strokeStyle = K.PLATE; c.lineWidth = 2;
    c.beginPath(); c.arc(qp[0], qp[1], 6, 0, 7); c.fill(); c.stroke(); c.restore();

    /* an axis triad drawn from whichever corner is furthest from the eye,
       so the three names always sit behind the loop rather than across it */
    var deep = 0;
    for (i = 1; i < 8; i++) if (cor[i][2] > cor[deep][2]) deep = i;
    var TRI = 0.40;
    [[1, 'thigh', K.VIO], [2, 'shank', K.ORG], [4, 'foot', K.GRN]].forEach(function (t) {
      var a = cor[deep], b = cor[deep ^ t[0]];
      var ex = a[0] + (b[0] - a[0]) * TRI, ey = a[1] + (b[1] - a[1]) * TRI;
      c.save(); c.strokeStyle = t[2]; c.lineWidth = 2.4; c.globalAlpha = .9;
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(ex, ey); c.stroke(); c.restore();
      var ux = ex - a[0], uy = ey - a[1], LL = Math.hypot(ux, uy) || 1;
      var lx = ex + ux / LL * 15, ly = ey + uy / LL * 15;
      lx = Math.max(x0 + 26, Math.min(x0 + w - 26, lx));
      ly = Math.max(y0 + 14, Math.min(y0 + h - 26, ly));
      label(c, t[1], lx, ly, { color: t[2], size: 12.5, align: 'center', plate: true });
    });
    label(c, 'drag to turn', x0 + w - 14, y0 + 12,
          { color: K.MUT, size: 10.5, align: 'right' });
  }

  function draw() {
    var K = C(), W = ax.W, H = ax.H;
    ax.clear();
    if (port) {
      drawLeg(0, 0, W, H * 0.30);
      drawTraces(0, H * 0.30, W, H * 0.30);
      draw3D(0, H * 0.60, W, H * 0.40);
    } else {
      drawLeg(0, 0, W * 0.22, H);
      drawTraces(W * 0.22, H * 0.06, W * 0.33, H * 0.88);
      draw3D(W * 0.55, 0, W * 0.45, H);
    }
    var p2 = (fit.pct[0] + fit.pct[1]) * 100;
    out.innerHTML = '<b>' + fmt(p2, 1) + '%</b> of the variation in all three angles lies in ' +
      '<b>one plane</b> — rms <b>' + fmt(fit.rms, 1) + '°</b> out of it, against a range of ' +
      '<b>' + fmt(span, 0) + '°</b>.' +
      '<span style="opacity:.72">  ·  three joints, three angles, and only two of them are ' +
      'free — SUSU-30, ' + TRIALS[which].name + ' at ' + fmt(TRIALS[which].M.spd * 3.6, 1) +
      ' km/h</span>';
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    phase = (phase + dt / TRIALS[which].M.dur / 1.6) % 1;
    sP.quiet(phase * 100); draw();
    raf = requestAnimationFrame(frame);
  }

  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () {
    if (playing) { stop(); return; }
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  });
  keepOut(seg(row, [['walk', 'walking'], ['run', 'running']], 'walk',
    function (k) { which = k; prep(); homeView(); draw(); }));
  keepOut(chips(row, [['face', 'face the plane'], ['edge', 'edge on'],
                      ['free', 'reset the view']], null, function (k) {
    if (k === 'face') lookAlong(st, fit.n);
    else if (k === 'edge') lookAlong(st, fit.u);
    else homeView();
    draw();
  }));
  var sP = slider(u.ctl, 'Stride', 0, 100, 1, 0,
    function (v) { return fmt(v, 0) + '%'; }, function (v) { phase = v / 100; draw(); });
  dragRotate(u.cv, st, draw);
  node._draw = draw; node._stop = stop;
  draw();
});

/* ==================================================================
   SPRINT KINEMATICS — Miyashiro, Nagahara, Yamamoto & Nishijima (2019),
   Front. Sports Act. Living 1:37.  Seventy-nine male sprinters, 60 m at
   maximal effort; leg kinematics regressed on running speed, leg length,
   step frequency and swing/support ratio.

   The two coefficients below are read off the predicted-value plots in the
   lecture, which were produced from the published regression. They are a
   two-predictor slice of a four-predictor model, so the widget says so on
   the figure rather than pretending otherwise.
   ================================================================== */
var MY = {
  v0: 9.90, L0: 0.812,            /* the centre the plots were drawn about */
  thigh0: 4.1, thigh_v: 7.33, thigh_L: 27.8,
  knee0: 17.0, knee_v: -2.47, knee_L: -19.9
};
function myThigh(v, L) { return MY.thigh0 + MY.thigh_v * (v - MY.v0) + MY.thigh_L * (L - MY.L0); }
function myKnee(v, L) { return MY.knee0 + MY.knee_v * (v - MY.v0) + MY.knee_L * (L - MY.L0); }

D.register('sprintkin', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 940, h: port ? 620 : 440,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var v = 9.90, L = 0.812, mode = 'speed';

  var SPAN = { speed: [8.8, 11.0], leg: [0.73, 0.89] };

  function drawPlot(x0, y0, w, h) {
    var c = ax.c, K = C();
    var sp = SPAN[mode === 'speed' ? 'speed' : 'leg'];
    var lo = -8, hi = 24;
    function X(t) { return x0 + 54 + (t - sp[0]) / (sp[1] - sp[0]) * (w - 76); }
    function Y(q) { return y0 + h - 34 - (q - lo) / (hi - lo) * (h - 56); }
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(x0 + 54, y0 + 16); c.lineTo(x0 + 54, y0 + h - 34);
    c.lineTo(x0 + w - 18, y0 + h - 34); c.stroke(); c.restore();
    [-5, 0, 5, 10, 15, 20].forEach(function (q) {
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x0 + 54, Y(q)); c.lineTo(x0 + w - 18, Y(q)); c.stroke(); c.restore();
      label(c, minus(q) + '°', x0 + 48, Y(q), { color: K.MUT, size: 11, align: 'right' });
    });
    var N = 60, i;
    [[function (t) { return mode === 'speed' ? myThigh(t, L) : myThigh(v, t); }, K.VIO],
     [function (t) { return mode === 'speed' ? myKnee(t, L) : myKnee(v, t); }, K.ORG]
    ].forEach(function (s) {
      c.save(); c.strokeStyle = s[1]; c.lineWidth = 3; c.beginPath();
      for (i = 0; i <= N; i++) {
        var t = sp[0] + (sp[1] - sp[0]) * i / N;
        i ? c.lineTo(X(t), Y(s[0](t))) : c.moveTo(X(t), Y(s[0](t)));
      }
      c.stroke(); c.restore();
    });
    var cur = mode === 'speed' ? v : L;
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.6; c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(X(cur), y0 + 16); c.lineTo(X(cur), y0 + h - 34); c.stroke(); c.restore();
    [[myThigh(v, L), K.VIO], [myKnee(v, L), K.ORG]].forEach(function (p) {
      c.save(); c.fillStyle = p[1]; c.strokeStyle = K.PLATE; c.lineWidth = 2;
      c.beginPath(); c.arc(X(cur), Y(p[0]), 6, 0, 7); c.fill(); c.stroke(); c.restore();
    });
    [sp[0], (sp[0] + sp[1]) / 2, sp[1]].forEach(function (t) {
      label(c, mode === 'speed' ? fmt(t, 1) : fmt(t, 2), X(t), y0 + h - 22,
            { color: K.MUT, size: 11, align: 'center' });
    });
    label(c, mode === 'speed' ? 'running speed (m/s)' : 'leg length (m)',
          x0 + (w + 54) / 2, y0 + h - 6, { color: K.INK, size: 12.5, align: 'center' });
    key(c, x0 + 66, y0 + h - 112, [[K.VIO, 'thigh angle at contralateral foot strike'],
                                   [K.ORG, 'knee extension during support']], { size: 11.5 });
  }

  /* the thigh angle being predicted, drawn so the number means something */
  function drawPose(x0, y0, w, h) {
    var c = ax.c, K = C();
    var th = myThigh(v, L), kn = myKnee(v, L);
    var hx = x0 + w * 0.46, hy = y0 + h * 0.34, legpx = (h * 0.26);
    /* trunk */
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx - 12, hy - h * 0.26); c.lineTo(hx, hy); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.MUT;
    c.beginPath(); c.arc(hx - 15, hy - h * 0.31, 11, 0, 7); c.fill(); c.restore();
    /* vertical reference */
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .55; c.lineWidth = 1.2;
    c.setLineDash([4, 5]);
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx, hy + legpx * 1.78); c.stroke(); c.restore();
    /* the swing thigh, raised by the predicted elevation angle */
    var a = toRad(th);
    var kx = hx + Math.sin(a) * legpx, ky = hy + Math.cos(a) * legpx;
    c.save(); c.strokeStyle = K.VIO; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.VIO; c.globalAlpha = .55; c.lineWidth = 5;
    c.beginPath(); c.moveTo(kx, ky); c.lineTo(kx + legpx * 0.48, ky + legpx * 0.50); c.stroke();
    c.restore();
    /* the stance leg of the contralateral side, which defines the instant */
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .45; c.lineWidth = 5;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx - legpx * 0.26, hy + legpx * 1.78); c.stroke();
    c.restore();
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x0 + 20, hy + legpx * 1.78); c.lineTo(x0 + w - 20, hy + legpx * 1.78);
    c.stroke(); c.restore();
    /* canvas angles run clockwise with y down, so the label offset uses
       +sin, not -sin; getting that wrong parks it above the head */
    var mid = arcBetween(c, hx, hy, legpx * 0.52, Math.PI / 2, Math.PI / 2 - a, K.VIO, 2.4);
    label(c, num(th, 1) + '°', hx + Math.cos(mid) * legpx * 0.80,
          hy + Math.sin(mid) * legpx * 0.80, { color: K.VIO, size: 15, align: 'center', plate: true });
    label(c, 'thigh at contralateral foot strike', x0 + w / 2, y0 + h - 52,
          { color: K.MUT, size: 11.5, align: 'center' });
    label(c, 'knee extension during support  ' + num(kn, 1) + '°',
          x0 + w / 2, y0 + h - 30, { color: K.ORG, size: 12.5, align: 'center' });
  }

  function draw() {
    var W = ax.W, H = ax.H;
    ax.clear();
    if (port) { drawPlot(0, 0, W, H * 0.58); drawPose(0, H * 0.58, W, H * 0.42); }
    else { drawPlot(0, 0, W * 0.62, H); drawPose(W * 0.62, 0, W * 0.38, H); }
    out.innerHTML = 'At <b>' + fmt(v, 2) + ' m/s</b> with a <b>' + fmt(L, 3) + ' m</b> leg: ' +
      'thigh angle at contralateral foot strike <b>' + num(myThigh(v, L), 1) + '°</b>, ' +
      'knee extension during support <b>' + num(myKnee(v, L), 1) + '°</b>.' +
      '<span style="opacity:.72">  ·  faster means the thigh is further forward and the ' +
      'knee extends <b>less</b> — the support leg gets stiffer, not longer</span>';
  }

  keepOut(seg(ctlRow(u.ctl), [['speed', 'vs running speed'], ['leg', 'vs leg length']], 'speed',
    function (k) { mode = k; draw(); }));
  slider(u.ctl, 'Running speed', 8.8, 11.0, 0.05, v,
    function (t) { return fmt(t, 2) + ' m/s'; }, function (t) { v = t; draw(); });
  slider(u.ctl, 'Leg length', 0.73, 0.89, 0.005, L,
    function (t) { return fmt(t, 3) + ' m'; }, function (t) { L = t; draw(); });
  node._draw = draw;
  draw();
});


/* ==================================================================
   HAMMER THROW — v_t = r.omega, and what the thrower can actually change

   Two levers and only two: turn faster, or keep the radius long. The
   release then hands the problem to the projectile lecture, so the range
   is computed the same way it was there, from a 1.6 m release height.
   ================================================================== */
D.register('hammerv', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 940, h: port ? 500 : 390,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var SLOW = 0.26;
  var w = 8, r = 1.7, relAng = 44, hRel = 1.6;
  var t = 0, playing = false, raf = null, last = 0;
  var flying = false, tf = 0, thRel = 0;

  function range(v) {
    var a = toRad(relAng), vx = v * Math.cos(a), vy = v * Math.sin(a);
    return vx * (vy + Math.sqrt(vy * vy + 2 * G * hRel)) / G;
  }

  function draw() {
    var c = ax.c, K = C(), W = ax.W, H = ax.H;
    ax.clear();
    var R = Math.min(W * 0.17, H * 0.33);
    var cx = W * 0.26, cy = H * 0.47, PPM = R / r;
    var v = vTan(r, w);

    dial(c, K, cx, cy, R, { ring: K.PANEL, dash: [4, 5] });
    /* the thrower */
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy - 10); c.lineTo(cx, cy + 34); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.MUT; c.beginPath(); c.arc(cx, cy - 20, 10, 0, 7); c.fill(); c.restore();

    var th = flying ? thRel : t;
    var p = rim(cx, cy, R, th);
    var tg = [-Math.sin(th), -Math.cos(th)];
    if (flying) {
      var s = v * tf * SLOW * PPM;
      p = [p[0] + tg[0] * s, p[1] + tg[1] * s];
      c.save(); c.strokeStyle = K.BLUE; c.globalAlpha = .3; c.lineWidth = 2; c.setLineDash([6, 6]);
      var rp = rim(cx, cy, R, thRel);
      c.beginPath(); c.moveTo(rp[0], rp[1]); c.lineTo(rp[0] + tg[0] * 2200, rp[1] + tg[1] * 2200);
      c.stroke(); c.restore();
      c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 3;
      c.beginPath(); c.moveTo(rp[0], rp[1]); c.lineTo(p[0], p[1]); c.stroke(); c.restore();
    } else {
      c.save(); c.strokeStyle = K.MUT; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(p[0], p[1]); c.stroke(); c.restore();
      label(c, 'r = ' + fmt(r, 2) + ' m', (cx + p[0]) / 2, (cy + p[1]) / 2 - 12,
            { color: K.MUT, size: 12, align: 'center', plate: true });
    }
    var VL = 16 + v * 2.6;
    arrow(c, p[0], p[1], p[0] + tg[0] * VL, p[1] + tg[1] * VL, { color: K.BLUE, width: 3.4 });
    label(c, 'vₜ = ' + fmt(v, 1) + ' m/s', p[0] + tg[0] * (VL + 14), p[1] + tg[1] * (VL + 14),
          { color: K.BLUE, size: 13, align: tg[0] < 0 ? 'right' : 'left', plate: true });
    c.save(); c.fillStyle = K.INK; c.beginPath(); c.arc(p[0], p[1], 9, 0, 7); c.fill(); c.restore();

    /* the numbers */
    var px = W * 0.52, py = H * 0.13;
    label(c, 'vₜ = rω', px, py, { color: K.INK, size: 23, align: 'left' });
    [['angular velocity ω', fmt(w, 1) + ' rad/s  (' + fmt(w * 60 / (2 * Math.PI), 0) + ' rpm)', K.VIO],
     ['effective radius r', fmt(r, 2) + ' m', K.MUT],
     ['tangential speed vₜ', fmt(v, 1) + ' m/s', K.BLUE],
     ['throw at ' + fmt(relAng, 0) + '° from ' + fmt(hRel, 1) + ' m', fmt(range(v), 1) + ' m', K.GRN]
    ].forEach(function (rw, i) {
      var y = py + 44 + i * 46;
      label(c, rw[0], px, y, { color: K.MUT, size: 12, align: 'left' });
      label(c, rw[1], px, y + 21, { color: rw[2], size: 17, align: 'left' });
    });
    label(c, flying ? 'released — straight on, at the speed it already had'
                    : 'two levers only: turn faster, or keep the radius long',
          W * 0.04, H - 20, { color: flying ? K.ACC : K.MUT, size: 13, align: 'left' });

    out.innerHTML = 'ω = <b>' + fmt(w, 1) + ' rad/s</b> × r = <b>' + fmt(r, 2) +
      ' m</b> → vₜ = <b>' + fmt(v, 1) + ' m/s</b>, which at ' + fmt(relAng, 0) +
      '° carries <b>' + fmt(range(v), 1) + ' m</b>.' +
      '<span style="opacity:.72">  ·  the men\'s world record is about 86 m, so near ' +
      '29 m/s at release</span>';

    if (flying && (p[0] < -60 || p[0] > W + 60 || p[1] < -60 || p[1] > H + 60)) stop();
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function start() {
    if (playing) return;
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (flying) tf += dt; else t += dt * w * SLOW;
    draw(); raf = requestAnimationFrame(frame);
  }

  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () { playing ? stop() : start(); });
  keepOut(chips(row, [['rel', 'release'], ['reset', 'reset']], null, function (k) {
    if (k === 'rel') { if (!flying) { flying = true; thRel = t; tf = 0; start(); } }
    else { flying = false; tf = 0; }
    draw();
  }));
  keepOut(chips(u.ctl, [['t1', 'turn 1  ·  ω 5'], ['t3', 'turn 3  ·  ω 11'],
                        ['t4', 'release  ·  ω 17']], null, function (k) {
    w = k === 't1' ? 5 : (k === 't3' ? 11 : 17); sW.quiet(w); draw();
  }));
  var sW = slider(u.ctl, 'Angular velocity ω', 3, 20, 0.5, w,
    function (q) { return fmt(q, 1) + ' rad/s'; }, function (q) { w = q; draw(); });
  slider(u.ctl, 'Effective radius r', 1.0, 2.2, 0.05, r,
    function (q) { return fmt(q, 2) + ' m'; }, function (q) { r = q; draw(); });
  node._draw = draw; node._stop = stop;
  draw();
});

/* ==================================================================
   INSIDE A MEMS GYROSCOPE — what the four proof masses actually do

   Four masses on the two in-plane axes, driven permanently in and out.
   Rotate the chip and the Coriolis term, a_c = -2.Omega x v, pushes
   whichever pair happens to be moving across the rotation axis.

   Put M1 at +y and M3 at -y, M2 at -x and M4 at +x, and the three modes
   fall straight out of the cross product:

     roll   Omega along x : a_c,z = -2.Omega.v_y  -> M1, M3 out of plane
     pitch  Omega along y : a_c,z = +2.Omega.v_x  -> M2, M4 out of plane
     yaw    Omega along z : a_c,y = -2.Omega.v_x  -> M2, M4 sideways, opposite

   which is exactly the three-mode table on the slide. The deflection is
   proportional to the rotation rate, the gap between the mass and its
   sensing plate changes with it, and that capacitance change IS the
   measurement. Nothing in here spins.
   ================================================================== */
D.register('gyromems', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 960, h: port ? 720 : 470,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var mode = 'yaw', om = 400;            /* deg/s */
  var tt = 0, playing = false, raf = null, last = 0;
  var FD = 1.1;                          /* drive cycles per second on screen */

  /* unit radial direction of each mass, and its label position */
  var MASS = [
    { id: 'M1', dir: [0, 1] },
    { id: 'M4', dir: [1, 0] },
    { id: 'M3', dir: [0, -1] },
    { id: 'M2', dir: [-1, 0] }
  ];

  /* drive: s(t) = sin, so velocity is cos */
  function sOf(t) { return Math.sin(2 * Math.PI * FD * t); }
  function vOf(t) { return Math.cos(2 * Math.PI * FD * t); }

  /* Coriolis response of one mass, as a fraction of full scale.
     Returns { z: out-of-plane, y: in-plane sideways } */
  function coriolis(m, t) {
    var O = om / 2000;                   /* normalised rate */
    var v = vOf(t), vx = m.dir[0] * v, vy = m.dir[1] * v;
    if (mode === 'roll')  return { z: -2 * O * vy, y: 0 };
    if (mode === 'pitch') return { z:  2 * O * vx, y: 0 };
    if (mode === 'yaw')   return { z: 0, y: -2 * O * vx };
    return { z: 0, y: 0 };
  }

  /* ---------------- plan view ---------------- */
  function drawPlan(x0, y0, w, h) {
    var c = ax.c, K = C();
    var cx = x0 + w / 2, cy = y0 + h / 2 + 6;
    var R = Math.min(w, h) * 0.235, A = R * 0.30, MS = R * 0.44;

    /* the frame the whole thing is anchored to */
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.4;
    c.strokeRect(cx - R - MS * 0.8, cy - R - MS * 0.8,
                 2 * (R + MS * 0.8), 2 * (R + MS * 0.8));
    c.restore();
    /* central anchor */
    c.save(); c.strokeStyle = K.MUT; c.lineWidth = 2;
    c.strokeRect(cx - 11, cy - 11, 22, 22); c.restore();

    MASS.forEach(function (m) {
      var s = sOf(tt), co = coriolis(m, tt);
      var px = cx + m.dir[0] * (R + A * s) + (mode === 'yaw' ? 0 : 0);
      var py = cy - m.dir[1] * (R + A * s);
      /* yaw deflects the x-axis pair along y, which we can show directly */
      if (mode === 'yaw') py -= co.y * MS * 0.9;
      var act = Math.abs(co.z) > 1e-6 || Math.abs(co.y) > 1e-6;
      var hot = (mode === 'roll' && (m.id === 'M1' || m.id === 'M3')) ||
                (mode === 'pitch' && (m.id === 'M2' || m.id === 'M4')) ||
                (mode === 'yaw' && (m.id === 'M2' || m.id === 'M4'));

      /* spring to the anchor */
      c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(cx + m.dir[0] * 11, cy - m.dir[1] * 11);
      c.lineTo(px - m.dir[0] * MS * 0.5, py + m.dir[1] * MS * 0.5); c.stroke(); c.restore();

      /* the mass. Out-of-plane deflection is drawn as a lift: the plate
         brightens and the block offsets, since a plan view cannot show z. */
      var lift = co.z * MS * 0.55;
      c.save();
      c.fillStyle = hot && om > 0 ? K.ACCFILL : K.FILL;
      c.strokeStyle = hot && om > 0 ? K.ACC : K.MUT;
      c.lineWidth = 2;
      if (mode !== 'yaw' && hot && Math.abs(lift) > 0.4) {
        /* a shadow where it would have been, so the lift reads */
        c.save(); c.globalAlpha = .28; c.strokeStyle = K.MUT; c.lineWidth = 1.4;
        c.strokeRect(px - MS * 0.5, py - MS * 0.5, MS, MS); c.restore();
      }
      c.fillRect(px - MS * 0.5, py - MS * 0.5 - lift, MS, MS);
      c.strokeRect(px - MS * 0.5, py - MS * 0.5 - lift, MS, MS);
      c.restore();
      label(c, m.id, px, py - lift, { color: K.INK, size: 13, align: 'center' });
      /* say which way it has been pushed, and by what */
      if (hot && om !== 0 && mode !== 'none') {
        var amp = mode === 'yaw' ? co.y : co.z;
        if (Math.abs(amp) > 0.02) {
          var tipx = px, tipy = py - lift - Math.sign(amp) * (MS * 0.5 + 16);
          if (mode === 'yaw') { tipx = px; tipy = py - Math.sign(amp) * (MS * 0.5 + 16); }
          arrow(c, px, py - lift - Math.sign(amp) * MS * 0.5,
                tipx, tipy, { color: K.ACC, width: 2.2, head: 9 });
        }
      }
    });

    label(c, 'driven in and out, always', cx, y0 + 14,
          { color: K.MUT, size: 12, align: 'center' });
    label(c, mode === 'yaw'
            ? 'the pair that is pushed sideways changes the gap to its comb fingers'
            : (mode === 'none' ? 'nothing is pushed off its line, so no gap changes'
                               : 'the pair that is pushed out of plane changes the gap to the plate beneath'),
          cx, y0 + h - 12, { color: K.MUT, size: 11.5, align: 'center' });

    /* the rotation being applied, drawn clear of the frame */
    if (om !== 0 && mode !== 'none') {
      var OUT = R + MS * 0.8;
      c.save(); c.strokeStyle = K.VIO; c.lineWidth = 2.4;
      if (mode === 'yaw') {
        var rr = OUT * 1.20, s0 = -2.5, s1 = -0.5;
        if (om < 0) { s0 = -0.5; s1 = -2.5; }
        arcBetween(c, cx, cy, rr, s0, s1, K.VIO, 2.4);
        var ea = s1 + (om < 0 ? -0.001 : 0.001) * 0;
        var tdir = om > 0 ? 1 : -1;
        arrow(c, cx + rr * Math.cos(s1 - 0.14 * tdir), cy + rr * Math.sin(s1 - 0.14 * tdir),
              cx + rr * Math.cos(s1), cy + rr * Math.sin(s1), { color: K.VIO, width: 2.4 });
        label(c, 'Ω about Z', cx + rr * Math.cos(-1.5) + 4, cy + rr * Math.sin(-1.5) - 14,
              { color: K.VIO, size: 13, align: 'center', plate: true });
      } else {
        var L2 = OUT * 1.22;
        if (mode === 'roll') {
          var ay = cy + OUT + 26;
          arrow(c, cx - L2, ay, cx + L2, ay, { color: K.VIO, width: 2.4 });
          label(c, 'Ω about X', cx, ay - 14,
                { color: K.VIO, size: 13, align: 'center', plate: true });
        } else {
          var axx = cx - OUT - 30;
          arrow(c, axx, cy + L2, axx, cy - L2, { color: K.VIO, width: 2.4 });
          label(c, 'Ω about Y', axx + 8, cy - L2 - 2,
                { color: K.VIO, size: 13, align: 'left', plate: true });
        }
      }
      c.restore();
    }
  }

  /* ---------------- the capacitance, and the reading ---------------- */
  function drawTrace(x0, y0, w, h) {
    var c = ax.c, K = C(), i;
    var probe = mode === 'roll' ? MASS[0] : MASS[1];     /* M1 or M4 */
    var lo = -1.1, hi = 1.1;
    function X(t) { return x0 + 54 + (t / 2.6) * (w - 76); }
    function Y(q) { return y0 + h * 0.46 - q * (h * 0.30); }
    c.save(); c.strokeStyle = K.PANEL; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x0 + 54, y0 + 12); c.lineTo(x0 + 54, y0 + h * 0.80);
    c.lineTo(x0 + w - 16, y0 + h * 0.80); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.MUT; c.globalAlpha = .4; c.setLineDash([3, 4]);
    c.beginPath(); c.moveTo(x0 + 54, Y(0)); c.lineTo(x0 + w - 16, Y(0)); c.stroke(); c.restore();

    /* the drive, and the Coriolis signal it carries */
    [['drive position', K.MUT, function (t) { return sOf(t) * 0.8; }, 1.6],
     ['ΔC on ' + probe.id, K.ACC, function (t) {
        var co = coriolis(probe, t);
        return (mode === 'yaw' ? co.y : co.z) * 1.6;
      }, 3]
    ].forEach(function (s, k) {
      c.save(); c.strokeStyle = s[1]; c.lineWidth = s[3]; c.beginPath();
      for (i = 0; i <= 200; i++) {
        var t = tt - 2.6 + 2.6 * i / 200;
        var q = Math.max(lo, Math.min(hi, s[2](t)));
        i ? c.lineTo(X(2.6 * i / 200), Y(q)) : c.moveTo(X(0), Y(q));
      }
      c.stroke(); c.restore();
      label(c, s[0], x0 + 62, y0 + 20 + k * 19, { color: s[1], size: 11.5, align: 'left' });
    });
    label(c, 'time  →', x0 + w / 2, y0 + h * 0.80 + 14,
          { color: K.MUT, size: 11, align: 'center' });

    /* the number the IMU hands you */
    var by = y0 + h * 0.86;
    label(c, 'gyroscope output', x0 + w / 2, by, { color: K.MUT, size: 12, align: 'center' });
    label(c, num(om, 0) + ' deg/s', x0 + w / 2, by + 26,
          { color: om === 0 ? K.MUT : K.GRN, size: 25, align: 'center' });
  }

  function draw() {
    var W = ax.W, H = ax.H, K = C();
    ax.clear();
    if (port) { drawPlan(0, 0, W, H * 0.52); drawTrace(0, H * 0.52, W, H * 0.48); }
    else { drawPlan(0, 0, W * 0.50, H); drawTrace(W * 0.50, 0, W * 0.50, H); }

    var txt = {
      none:  'No rotation. The masses keep oscillating, the gaps never change, ΔC stays flat — <b>zero</b>.',
      roll:  'Ω about <b>X</b> → aᶜ = −2Ω·v<sub>y</sub>, so <b>M1 and M3</b> lift out of the plane. Roll.',
      pitch: 'Ω about <b>Y</b> → aᶜ = +2Ω·v<sub>x</sub>, so <b>M2 and M4</b> lift out of the plane. Pitch.',
      yaw:   'Ω about <b>Z</b> → aᶜ = −2Ω·v<sub>x</sub>, so <b>M2 and M4</b> swing sideways, in opposite directions. Yaw.'
    }[mode];
    out.innerHTML = txt +
      '<span style="opacity:.72">  ·  the deflection is proportional to Ω, so the size of ' +
      'the capacitance wobble <b>is</b> the rotation rate</span>';
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    tt += dt; draw(); raf = requestAnimationFrame(frame);
  }
  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () {
    if (playing) { stop(); return; }
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  });
  keepOut(seg(row, [['none', 'no rotation'], ['roll', 'roll  (X)'],
                    ['pitch', 'pitch  (Y)'], ['yaw', 'yaw  (Z)']], 'yaw',
    function (k) { mode = k; draw(); }));
  slider(u.ctl, 'Rotation rate Ω', -1000, 1000, 25, om,
    function (q) { return num(q, 0) + ' deg/s'; }, function (q) { om = q; draw(); });
  node._draw = draw; node._stop = stop;
  draw();
});

/* ==================================================================
   THE WHEELCHAIR TRACE — one sensor, four units

   The array is the measured wheel angular velocity. Everything on the
   figure is computed from it, so scrubbing the cursor runs the whole
   conversion chain on a real sample rather than a tidy number.
   ================================================================== */
function wcAt(i) { return WC_W[Math.max(0, Math.min(WC_W.length - 1, Math.round(i)))]; }
function wcDps(t) { return wcAt(t / WC_DT); }

D.register('wcdata', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 960, h: port ? 680 : 470,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var DUR = (WC_W.length - 1) * WC_DT;
  var tc = 42, r = EX.wcR, unit = 'dps';
  var playing = false, raf = null, last = 0;

  var UNITS = {
    dps:  { lab: 'deg/s', f: function (w) { return w; },                 dp: 0 },
    rads: { lab: 'rad/s', f: function (w) { return toRad(w); },          dp: 1 },
    ms:   { lab: 'm/s',   f: function (w) { return toRad(w) * r; },      dp: 2 },
    kmh:  { lab: 'km/h',  f: function (w) { return toRad(w) * r * 3.6; }, dp: 1 }
  };

  function drawTrace(x0, y0, w, h) {
    var c = ax.c, K = C(), U = UNITS[unit], i;
    var top = U.f(2000);
    function X(t) { return x0 + 62 + t / DUR * (w - 84); }
    function Y(q) { return y0 + h - 34 - q / top * (h - 54); }
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(x0 + 62, y0 + 14); c.lineTo(x0 + 62, y0 + h - 34);
    c.lineTo(x0 + w - 20, y0 + h - 34); c.stroke(); c.restore();
    var ticks = axisTicks(0, top);
    ticks.forEach(function (q) {
      if (q < 0 || q > top) return;
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x0 + 62, Y(q)); c.lineTo(x0 + w - 20, Y(q)); c.stroke(); c.restore();
      label(c, fmt(q, U.dp), x0 + 56, Y(q), { color: K.MUT, size: 11, align: 'right' });
    });
    [0, 10, 20, 30, 40, 50].forEach(function (t) {
      label(c, fmt(t, 0), X(t), y0 + h - 22, { color: K.MUT, size: 11, align: 'center' });
    });
    label(c, 'time (s)', (x0 + 62 + x0 + w - 20) / 2, y0 + h - 6,
          { color: K.INK, size: 12.5, align: 'center' });
    label(c, U.lab, x0 + 62, y0 + 6, { color: K.INK, size: 12.5, align: 'left' });

    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 2; c.beginPath();
    for (i = 0; i < WC_W.length; i++) {
      var t = i * WC_DT, q = U.f(WC_W[i]);
      i ? c.lineTo(X(t), Y(q)) : c.moveTo(X(t), Y(q));
    }
    c.stroke(); c.restore();

    var qv = U.f(wcDps(tc));
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(X(tc), y0 + 14); c.lineTo(X(tc), y0 + h - 34); c.stroke(); c.restore();
    c.save(); c.fillStyle = K.ACC; c.strokeStyle = K.PLATE; c.lineWidth = 2;
    c.beginPath(); c.arc(X(tc), Y(qv), 6, 0, 7); c.fill(); c.stroke(); c.restore();
    label(c, 'each ripple is one push', X(27), Y(U.f(700)),
          { color: K.MUT, size: 11.5, align: 'left', plate: true });
  }

  function drawChain(x0, y0, w, h) {
    var c = ax.c, K = C();
    var dps = wcDps(tc), rad = toRad(dps), ms = rad * r, kmh = ms * 3.6;
    var boxes = [
      ['gyroscope', fmt(dps, 0), 'deg/s', K.MUT, 'dps'],
      ['× π/180', fmt(rad, 2), 'rad/s', K.VIO, 'rads'],
      ['× r = ' + fmt(r, 2) + ' m', fmt(ms, 2), 'm/s', K.BLUE, 'ms'],
      ['× 3.6', fmt(kmh, 1), 'km/h', K.GRN, 'kmh']
    ];
    var n = 4, bw = Math.min(w * 0.20, 168), gap = (w - bw * n) / (n + 1);
    var by = y0 + h * 0.30, bh = 92;
    boxes.forEach(function (b, i) {
      var bx = x0 + gap + i * (bw + gap), on = b[4] === unit;
      c.save(); c.strokeStyle = on ? b[3] : K.PANEL; c.lineWidth = on ? 2.4 : 1.4;
      c.strokeRect(bx + .5, by + .5, bw, bh); c.restore();
      label(c, b[0], bx + bw / 2, by - 15, { color: K.MUT, size: 11.5, align: 'center' });
      label(c, b[1], bx + bw / 2, by + 38, { color: b[3], size: 24, align: 'center' });
      label(c, b[2], bx + bw / 2, by + 70, { color: K.MUT, size: 12.5, align: 'center' });
      if (i < n - 1) arrow(c, bx + bw + 5, by + bh / 2, bx + bw + gap - 5, by + bh / 2,
                           { color: K.MUT, width: 2.2 });
    });
    label(c, 'at t = ' + fmt(tc, 1) + ' s', x0 + w / 2, by + bh + 32,
          { color: K.INK, size: 14, align: 'center' });
    label(c, 'only one step needs the wheel — a 66 cm wheel, so r = 0.33 m',
          x0 + w / 2, by + bh + 56, { color: K.MUT, size: 12, align: 'center' });
  }

  function draw() {
    var W = ax.W, H = ax.H;
    ax.clear();
    if (port) { drawTrace(0, 0, W, H * 0.56); drawChain(0, H * 0.56, W, H * 0.44); }
    else { drawTrace(0, 0, W, H * 0.60); drawChain(0, H * 0.60, W, H * 0.40); }
    var dps = wcDps(tc), kmh = toRad(dps) * r * 3.6;
    out.innerHTML = 'At <b>' + fmt(tc, 1) + ' s</b> the wheel is turning at <b>' +
      fmt(dps, 0) + ' deg/s</b>, which is <b>' + fmt(kmh, 1) + ' km/h</b>.' +
      '<span style="opacity:.72">  ·  top speed here is about 1900 deg/s — just under ' +
      '40 km/h, on a 66 cm wheel</span>';
  }

  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = null; btn.innerHTML = '▶ Play'; }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    tc += dt * 6; if (tc > DUR) tc = 0;
    sT.quiet(tc); draw(); raf = requestAnimationFrame(frame);
  }
  var row = ctlRow(u.ctl);
  var btn = playBtn(row, '▶ Play');
  btn.addEventListener('click', function () {
    if (playing) { stop(); return; }
    playing = true; btn.innerHTML = '❚❚ Pause';
    last = performance.now(); raf = requestAnimationFrame(frame);
  });
  keepOut(seg(row, [['dps', 'deg/s'], ['rads', 'rad/s'], ['ms', 'm/s'], ['kmh', 'km/h']], 'dps',
    function (k) { unit = k; draw(); }));
  var sT = slider(u.ctl, 'Time', 0, Math.floor(DUR), 0.25, tc,
    function (q) { return fmt(q, 2) + ' s'; }, function (q) { tc = q; draw(); });
  slider(u.ctl, 'Wheel radius', 0.25, 0.40, 0.005, r,
    function (q) { return fmt(q, 3) + ' m'; }, function (q) { r = q; draw(); });
  node._draw = draw; node._stop = stop;
  draw();
});


/* ==================================================================
   FORCE-VELOCITY PROFILE FROM THE SAME TRACE

   The sprint-profiling method (Samozino's macroscopic model, applied to
   wheelchair propulsion in Sensors 2023, 23(17), 7489): fit

       v(t) = v_max . (1 - e^-(t-t0)/tau)

   to the velocity rise, differentiate it for acceleration, multiply by the
   system mass for force, and the force-velocity relation falls out as a
   straight line:

       F(v) = F0 . (1 - v/v0),   F0 = m.v_max/tau,   v0 = v_max
       P_max = F0.v0 / 4

   The fit is done here, in the browser, by searching tau and t0 and
   solving v_max in closed form for each pair. Drag the fit window and
   watch the profile move -- the rolling start at the beginning of the
   trial is exactly the part that has to be excluded.
   ================================================================== */
D.register('wcfv', function (node, d) {
  var u = build(node);
  var port = D.portrait();
  var ax = new Axes(u.cv, { w: port ? 460 : 970, h: port ? 740 : 470,
                            padl: 0, padr: 0, padt: 0, padb: 0, fluid: false });
  var out = readout(u.ctl);
  var DUR = (WC_W.length - 1) * WC_DT;
  var r = EX.wcR, mass = 75, t0fit = 18, t1fit = 50, view = 'fv';
  var fit = null;

  function vOf(i) { return toRad(WC_W[i]) * r; }

  /* least squares over tau and t0; v_max is linear given those two */
  function doFit() {
    var i0 = Math.ceil(t0fit / WC_DT), i1 = Math.floor(t1fit / WC_DT), i;
    var best = null;
    for (var tau = 1.0; tau <= 14.0; tau += 0.05) {
      for (var t0 = 5; t0 <= t0fit; t0 += 0.25) {
        var sxy = 0, sxx = 0;
        for (i = i0; i <= i1; i++) {
          var t = i * WC_DT;
          var b = 1 - Math.exp(-(t - t0) / tau);
          sxy += b * vOf(i); sxx += b * b;
        }
        if (sxx < 1e-9) continue;
        var vm = sxy / sxx, ss = 0;
        for (i = i0; i <= i1; i++) {
          var t2 = i * WC_DT;
          var e = vOf(i) - vm * (1 - Math.exp(-(t2 - t0) / tau));
          ss += e * e;
        }
        ss /= (i1 - i0 + 1);
        if (!best || ss < best.ss) best = { vm: vm, tau: tau, t0: t0, ss: ss };
      }
    }
    best.rms = Math.sqrt(best.ss);
    best.F0 = mass * best.vm / best.tau;
    best.v0 = best.vm;
    best.Pmax = best.F0 * best.v0 / 4;
    fit = best;
  }
  doFit();

  function fv(t) { return fit.vm * (1 - Math.exp(-(t - fit.t0) / fit.tau)); }
  function fa(t) { return (fit.vm / fit.tau) * Math.exp(-(t - fit.t0) / fit.tau); }

  /* ---------------- the fit over the measured velocity ------------- */
  function drawFit(x0, y0, w, h) {
    var c = ax.c, K = C(), i;
    var top = 12;
    function X(t) { return x0 + 54 + t / DUR * (w - 74); }
    function Y(q) { return y0 + h - 32 - q / top * (h - 50); }
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(x0 + 54, y0 + 14); c.lineTo(x0 + 54, y0 + h - 32);
    c.lineTo(x0 + w - 18, y0 + h - 32); c.stroke(); c.restore();
    [0, 3, 6, 9, 12].forEach(function (q) {
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x0 + 54, Y(q)); c.lineTo(x0 + w - 18, Y(q)); c.stroke(); c.restore();
      label(c, fmt(q, 0), x0 + 48, Y(q), { color: K.MUT, size: 11, align: 'right' });
    });
    /* the window actually used */
    c.save(); c.fillStyle = K.FILL; c.globalAlpha = .55;
    c.fillRect(X(t0fit), y0 + 14, X(t1fit) - X(t0fit), h - 46); c.restore();
    label(c, 'fit window', (X(t0fit) + X(t1fit)) / 2, y0 + h - 140,
          { color: K.MUT, size: 11, align: 'center', plate: true });

    c.save(); c.strokeStyle = K.BLUE; c.lineWidth = 2; c.beginPath();
    for (i = 0; i < WC_W.length; i++) {
      var t = i * WC_DT;
      i ? c.lineTo(X(t), Y(vOf(i))) : c.moveTo(X(t), Y(vOf(i)));
    }
    c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 2.6; c.setLineDash([7, 5]); c.beginPath();
    for (i = 0; i <= 200; i++) {
      var t3 = fit.t0 + (DUR - fit.t0) * i / 200;
      i ? c.lineTo(X(t3), Y(fv(t3))) : c.moveTo(X(t3), Y(fv(t3)));
    }
    c.stroke(); c.restore();
    label(c, 'm/s', x0 + 54, y0 + 6, { color: K.INK, size: 12, align: 'left' });
    label(c, 'time (s)', (x0 + 54 + x0 + w) / 2, y0 + h - 6,
          { color: K.INK, size: 12, align: 'center' });
    [0, 10, 20, 30, 40, 50].forEach(function (t4) {
      label(c, fmt(t4, 0), X(t4), y0 + h - 20, { color: K.MUT, size: 11, align: 'center' });
    });
    key(c, x0 + 68, y0 + h - 104,
        [[K.BLUE, 'measured, from the gyroscope'],
         [K.ACC, 'v = v₀(1 − e^−(t−t₀)/τ)']], { size: 11.5 });
  }

  /* ---------------- force and power against time ------------------- */
  function drawFP(x0, y0, w, h) {
    var c = ax.c, K = C(), i;
    var T = 20, Ftop = Math.max(60, fit.F0 * 1.15), Ptop = Math.max(150, fit.Pmax * 1.2);
    function X(t) { return x0 + 50 + t / T * (w - 86); }
    function YF(q) { return y0 + h - 32 - q / Ftop * (h - 50); }
    function YP(q) { return y0 + h - 32 - q / Ptop * (h - 50); }
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(x0 + 50, y0 + 14); c.lineTo(x0 + 50, y0 + h - 32);
    c.lineTo(x0 + w - 36, y0 + h - 32); c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.ORG; c.lineWidth = 3; c.beginPath();
    for (i = 0; i <= 160; i++) {
      var t = T * i / 160, F = mass * fa(fit.t0 + t);
      i ? c.lineTo(X(t), YF(F)) : c.moveTo(X(t), YF(F));
    }
    c.stroke(); c.restore();
    c.save(); c.strokeStyle = K.GRN; c.lineWidth = 3; c.beginPath();
    var pk = [0, 0];
    for (i = 0; i <= 160; i++) {
      var t2 = T * i / 160, P = mass * fa(fit.t0 + t2) * fv(fit.t0 + t2);
      if (P > pk[1]) pk = [t2, P];
      i ? c.lineTo(X(t2), YP(P)) : c.moveTo(X(t2), YP(P));
    }
    c.stroke(); c.restore();
    c.save(); c.fillStyle = K.GRN; c.beginPath();
    c.arc(X(pk[0]), YP(pk[1]), 5, 0, 7); c.fill(); c.restore();
    label(c, 'Pₘₐₓ ' + fmt(pk[1], 0) + ' W at ' + fmt(pk[0], 1) + ' s',
          X(pk[0]) + 10, YP(pk[1]) - 4, { color: K.GRN, size: 12, align: 'left', plate: true });
    label(c, 'force (N)', x0 + 50, y0 + 6, { color: K.ORG, size: 12, align: 'left' });
    label(c, 'power (W)', x0 + w - 36, y0 + 6, { color: K.GRN, size: 12, align: 'right' });
    label(c, 'seconds from the start of the sprint', (x0 + 50 + x0 + w) / 2, y0 + h - 6,
          { color: K.INK, size: 12, align: 'center' });
  }

  /* ---------------- the profile itself ----------------------------- */
  function drawFV(x0, y0, w, h) {
    var c = ax.c, K = C();
    var Ftop = fit.F0 * 1.18, Vtop = fit.v0 * 3.6 * 1.12;
    function X(v) { return x0 + 58 + v / Vtop * (w - 86); }
    function Y(F) { return y0 + h - 34 - F / Ftop * (h - 54); }
    c.save(); c.strokeStyle = K.INK; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(x0 + 58, y0 + 14); c.lineTo(x0 + 58, y0 + h - 34);
    c.lineTo(x0 + w - 18, y0 + h - 34); c.stroke(); c.restore();
    axisTicks(0, Ftop).forEach(function (q) {
      if (q < 0 || q > Ftop) return;
      c.save(); c.strokeStyle = K.GRID; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x0 + 58, Y(q)); c.lineTo(x0 + w - 18, Y(q)); c.stroke(); c.restore();
      label(c, fmt(q, 0), x0 + 52, Y(q), { color: K.MUT, size: 11, align: 'right' });
    });
    axisTicks(0, Vtop).forEach(function (q) {
      if (q < 0 || q > Vtop) return;
      label(c, fmt(q, 0), X(q), y0 + h - 22, { color: K.MUT, size: 11, align: 'center' });
    });
    /* the line */
    c.save(); c.strokeStyle = K.ACC; c.lineWidth = 3.4;
    c.beginPath(); c.moveTo(X(0), Y(fit.F0)); c.lineTo(X(fit.v0 * 3.6), Y(0)); c.stroke(); c.restore();
    /* the measured points, one per second of the sprint */
    var pts = [], t;
    for (t = 0.4; t < 18; t += 0.6) {
      pts.push([fv(fit.t0 + t) * 3.6, mass * fa(fit.t0 + t)]);
    }
    c.save(); c.fillStyle = K.BLUE;
    pts.forEach(function (p) { c.beginPath(); c.arc(X(p[0]), Y(p[1]), 3.4, 0, 7); c.fill(); });
    c.restore();
    /* the two intercepts, which are the whole point of the profile */
    c.save(); c.fillStyle = K.ORG;
    c.beginPath(); c.arc(X(0), Y(fit.F0), 6, 0, 7); c.fill();
    c.fillStyle = K.GRN;
    c.beginPath(); c.arc(X(fit.v0 * 3.6), Y(0), 6, 0, 7); c.fill(); c.restore();
    label(c, 'F₀ ' + fmt(fit.F0, 0) + ' N', X(0) + 12, Y(fit.F0),
          { color: K.ORG, size: 14, align: 'left', plate: true });
    label(c, 'v₀ ' + fmt(fit.v0 * 3.6, 1) + ' km/h', X(fit.v0 * 3.6) - 10, Y(0) - 16,
          { color: K.GRN, size: 14, align: 'right', plate: true });
    /* the maximum-power point sits at the middle of the line */
    label(c, 'Pₘₐₓ = F₀·v₀/4 = ' + fmt(fit.Pmax, 0) + ' W',
          X(fit.v0 * 3.6 / 2) + 8, Y(fit.F0 / 2) - 4,
          { color: K.VIO, size: 13, align: 'left', plate: true });
    c.save(); c.fillStyle = K.VIO;
    c.beginPath(); c.arc(X(fit.v0 * 3.6 / 2), Y(fit.F0 / 2), 5, 0, 7); c.fill(); c.restore();
    label(c, 'speed (km/h)', (x0 + 58 + x0 + w) / 2, y0 + h - 6,
          { color: K.INK, size: 12.5, align: 'center' });
    label(c, 'force (N)', x0 + 58, y0 + 6, { color: K.INK, size: 12.5, align: 'left' });
  }

  function draw() {
    var W = ax.W, H = ax.H;
    ax.clear();
    if (view === 'fit') drawFit(0, 0, W, H);
    else if (view === 'fp') drawFP(0, 0, W, H);
    else if (port) { drawFV(0, 0, W, H); }
    else { drawFit(0, 0, W * 0.47, H); drawFV(W * 0.47, 0, W * 0.53, H); }
    out.innerHTML = 'Fitted to the measured rise: v₀ = <b>' + fmt(fit.v0 * 3.6, 1) +
      ' km/h</b>, τ = <b>' + fmt(fit.tau, 2) + ' s</b> (rms <b>' + fmt(fit.rms, 2) +
      ' m/s</b>). At ' + fmt(mass, 0) + ' kg that gives F₀ = <b>' + fmt(fit.F0, 0) +
      ' N</b> and Pₘₐₓ = <b>' + fmt(fit.Pmax, 0) + ' W</b> (' +
      fmt(fit.Pmax / mass, 1) + ' W/kg).' +
      '<span style="opacity:.72">  ·  the kinematics give v₀ and τ; the mass is what turns ' +
      'them into a force</span>';
  }

  keepOut(seg(ctlRow(u.ctl), [['fv', 'the profile'], ['fit', 'the fit'],
                              ['fp', 'force and power']], 'fv',
    function (k) { view = k; draw(); }));
  slider(u.ctl, 'Fit window starts', 11, 30, 0.5, t0fit,
    function (q) { return fmt(q, 1) + ' s'; }, function (q) { t0fit = q; doFit(); draw(); });
  slider(u.ctl, 'System mass (athlete + chair)', 55, 110, 1, mass,
    function (q) { return fmt(q, 0) + ' kg'; },
    function (q) { mass = q; fit.F0 = mass * fit.vm / fit.tau; fit.Pmax = fit.F0 * fit.v0 / 4; draw(); });
  node._draw = draw;
  draw();
});
D.boot();
})();
