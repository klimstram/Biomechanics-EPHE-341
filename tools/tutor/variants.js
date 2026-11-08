/* ======================================================================
   Biomechanics Tutor: new numbers when a question is taken again.

   Marc, 31 Oct: "is it possible to replicate questions or have certain
   questions have different numbers (within reason) each time they load?"
   then, 1 Nov: try it on Basic Math first.

   How it behaves
   - The first time, a question shows the numbers in Master_questions.csv.
   - Once a student has solved it, taking it again ("Try this question
     again", or opening it on a later visit) gives new numbers. The steps,
     the accepted answer, the final working and the written solution all
     follow the new numbers.
   - The new numbers are logged ("new_numbers"), so an answer can be read
     against the numbers it was for.

   Each question below has:
     orig   the numbers in the CSV (the self-test checks that full(orig),
            options(orig) and the answer reproduce the CSV exactly)
     pick   new numbers within reason (R.int, R.of), or null to try again
     ans    the answer; dp is how many decimals it is given to
     full, options, feedback, solution: the CSV wording with the numbers
            put in (options/feedback/solution only where they hold numbers)
     fin    the last line of working, for the final-answer row
   String.raw keeps the LaTeX backslashes as they are in the CSV.
   ====================================================================== */
(function () {
'use strict';

function n(x) { return String(+(+x).toFixed(6)); }                 /* 0.5, 12, -7 */
function rnd(v, dp) { return +(+v).toFixed(dp); }
function eq(v, dp) { return Math.abs(v - rnd(v, dp)) < 1e-9 ? '=' : '\\approx'; }
var S = String.raw;
var NL = '\n';

var R = {
  int: function (a, b) { return a + Math.floor(rand() * (b - a + 1)); },
  of: function (list) { return list[Math.floor(rand() * list.length)]; }
};
function rand() {
  try { var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] / 4294967296; }
  catch (e) { return Math.random(); }
}
function clean(v, dp) { return Math.abs(v * Math.pow(10, dp) - Math.round(v * Math.pow(10, dp))) < 1e-9; }

var DEFS = {};

/* ------------------------------------------------------------ Basic Math */
DEFS['Basic Math|1'] = {
  names: ['V_f', 'a', 'd'], orig: { V_f: 14, a: 2, d: 8 }, dp: 2,
  pick: function () {
    var v = { V_f: R.int(10, 25), a: R.int(1, 5), d: R.int(2, 15) };
    return v.V_f * v.V_f - 2 * v.a * v.d >= 9 ? v : null;
  },
  ans: function (v) { return Math.sqrt(v.V_f * v.V_f - 2 * v.a * v.d); },
  full: function (v) { return S`Solve for $ V_i $ in the equation $ V_f^2 = V_i^2 + 2ad $ Given: $ V_f = ${v.V_f} \mathrm{ \text{m/s}} $ , $ a = ${v.a} \mathrm{ \text{m/s}^2} $ , $ d = ${v.d} \mathrm{m} $ `; },
  fin: function (v, A) {
    var r = v.V_f * v.V_f - 2 * v.a * v.d;
    return S`$ V_i=\sqrt{V_f^2-2ad}=\sqrt{${v.V_f}^2-2(${v.a})(${v.d})}=\sqrt{${r}}${eq(Math.sqrt(r), 2)} ${A}\,\text{m/s} $ (the positive root).`;
  }
};
DEFS['Basic Math|2'] = {
  names: ['V_f', 'V_i', 'a'], orig: { V_f: 10, V_i: 5, a: 1 }, dp: 2,
  pick: function () {
    var Vi = R.int(0, 10), v = { V_f: Vi + R.int(2, 15), V_i: Vi, a: R.of([0.5, 1, 1.5, 2, 2.5, 3, 4]) };
    var t = (v.V_f - v.V_i) / v.a;
    return clean(t, 2) && t >= 1 ? v : null;
  },
  ans: function (v) { return (v.V_f - v.V_i) / v.a; },
  full: function (v) { return S`Solve for $ t $ in the equation $ V_f = V_i + a t $ Given: $ V_f = ${n(v.V_f)}\mathrm{ \text{m/s}} $ , $ V_i = ${n(v.V_i)}\mathrm{ \text{m/s}} $ , $ a = ${n(v.a)}\mathrm{ \text{m/s}^2} $ `; },
  fin: function (v, A) {
    return S`$ t=\dfrac{V_f-V_i}{a}=\dfrac{${n(v.V_f)}-${n(v.V_i)}}{${n(v.a)}}=\dfrac{${n(v.V_f - v.V_i)}}{${n(v.a)}}=${A}\,\text{s} $`;
  }
};
DEFS['Basic Math|3'] = {
  names: ['F', 't', 'm', 'V_i'], orig: { F: 50, t: 0.5, m: 5, V_i: 2 }, dp: 2,
  pick: function () {
    var v = { F: 5 * R.int(2, 24), t: R.of([0.2, 0.25, 0.4, 0.5, 0.8, 1, 1.5, 2]), m: R.int(2, 12), V_i: R.int(0, 8) };
    var Vf = (v.F * v.t + v.m * v.V_i) / v.m;
    return clean(Vf, 2) && Vf <= 40 ? v : null;
  },
  ans: function (v) { return (v.F * v.t + v.m * v.V_i) / v.m; },
  full: function (v) { return S`Solve for $ V_f $ in the equation $ Ft = m (V_f - V_i) $ Given: $ F = ${n(v.F)}\mathrm{ \text{N}} $ , $ t = ${n(v.t)}\mathrm{s} $ , $ m = ${n(v.m)}\mathrm{ \text{kg}} $ , $ V_i = ${n(v.V_i)}\mathrm{ \text{m/s}} $ `; },
  fin: function (v, A) {
    return S`$ V_f=\dfrac{Ft+mV_i}{m}=\dfrac{(${n(v.F)})(${n(v.t)})+(${n(v.m)})(${n(v.V_i)})}{${n(v.m)}}=\dfrac{${n(v.F * v.t + v.m * v.V_i)}}{${n(v.m)}}=${A}\,\text{m/s} $`;
  }
};
DEFS['Basic Math|4'] = {
  names: ['F', 'V_f', 'V_i', 'm'], orig: { F: 25, V_f: 15, V_i: 5, m: 10 }, dp: 2,
  pick: function () {
    var Vi = R.int(0, 10), v = { F: 5 * R.int(2, 20), V_f: Vi + R.int(2, 15), V_i: Vi, m: R.int(2, 15) };
    var t = v.m * (v.V_f - v.V_i) / v.F;
    return clean(t, 2) && t >= 0.2 ? v : null;
  },
  ans: function (v) { return v.m * (v.V_f - v.V_i) / v.F; },
  full: function (v) { return S`Solve for $ t $ in the equation $ Ft = m (V_f - V_i) $ Given: $ F = ${n(v.F)}\mathrm{ \text{N}} $ , $ V_f = ${n(v.V_f)}\mathrm{ \text{m/s}} $ , $ V_i = ${n(v.V_i)}\mathrm{ \text{m/s}} $ , $ m = ${n(v.m)}\mathrm{ \text{kg}} $ `; },
  fin: function (v, A) {
    return S`$ t=\dfrac{m(V_f-V_i)}{F}=\dfrac{${n(v.m)}(${n(v.V_f)}-${n(v.V_i)})}{${n(v.F)}}=\dfrac{${n(v.m * (v.V_f - v.V_i))}}{${n(v.F)}}=${A}\,\text{s} $`;
  }
};
DEFS['Basic Math|5'] = {
  names: ['F', 't', 'V_f', 'V_i'], orig: { F: 20, t: 2, V_f: 10, V_i: 5 }, dp: 2,
  pick: function () {
    var Vi = R.int(0, 10), v = { F: 5 * R.int(2, 20), t: R.of([0.5, 1, 1.5, 2, 2.5, 3, 4]), V_f: Vi + R.int(2, 12), V_i: Vi };
    var m = v.F * v.t / (v.V_f - v.V_i);
    return clean(m, 2) && m <= 100 ? v : null;
  },
  ans: function (v) { return v.F * v.t / (v.V_f - v.V_i); },
  full: function (v) { return S`Solve for $ m $ in the equation $ Ft = m(V_f - V_i) $ Given: $ F = ${n(v.F)}\mathrm{ \text{N}} $ , $ t = ${n(v.t)}\mathrm{s} $ , $ V_f = ${n(v.V_f)}\mathrm{ \text{m/s}} $ , $ V_i = ${n(v.V_i)}\mathrm{ \text{m/s}} $ `; },
  fin: function (v, A) {
    return S`$ m=\dfrac{Ft}{V_f-V_i}=\dfrac{(${n(v.F)})(${n(v.t)})}{${n(v.V_f)}-${n(v.V_i)}}=\dfrac{${n(v.F * v.t)}}{${n(v.V_f - v.V_i)}}=${A}\,\text{kg} $`;
  }
};
DEFS['Basic Math|6'] = {
  names: ['d', 't', 'a'], orig: { d: 100, t: 4, a: 3 }, dp: 2,
  pick: function () {
    var t = R.int(2, 8), a = R.of([0.5, 1, 1.5, 2, 2.5, 3, 4]), Vi = R.int(1, 25);
    var d = Vi * t + 0.5 * a * t * t;
    return d === Math.round(d) && d <= 400 ? { d: d, t: t, a: a } : null;
  },
  ans: function (v) { return (v.d - 0.5 * v.a * v.t * v.t) / v.t; },
  full: function (v) { return S`Solve for $ V_i $ in the equation $ d = V_it + \tfrac{1}{2}at^2 $ Given: $ d = ${n(v.d)}\mathrm{m} $ , $ t = ${n(v.t)}\mathrm{s} $ , $ a = ${n(v.a)}\mathrm{ \text{m/s}^2} $ `; },
  fin: function (v, A) {
    var h = 0.5 * v.a * v.t * v.t;
    return S`$ V_i=\dfrac{d-\tfrac{1}{2}at^2}{t}=\dfrac{${n(v.d)}-\tfrac{1}{2}(${n(v.a)})(${n(v.t)})^2}{${n(v.t)}}=\dfrac{${n(v.d)}-${n(h)}}{${n(v.t)}}=${A}\,\text{m/s} $`;
  }
};
DEFS['Basic Math|7'] = {
  names: ['A', 'B', 'C', 'D', 'E'], orig: { A: 12, B: 4, C: 8, D: 26, E: 2 }, dp: 2,
  pick: function () {
    var v = { A: R.of([3, 4, 5, 6, 8, 10, 12, 15]), B: R.int(2, 6), C: R.of([2, 3, 5, 6, 7, 8, 10]), D: R.int(10, 40), E: R.of([2, 3, 5, 7]) };
    if (v.C === v.E) return null;
    var r = (v.D + Math.sqrt(v.E) - v.B * Math.sqrt(v.C)) / v.A;
    return r > 0.2 ? v : null;
  },
  ans: function (v) { return Math.sqrt((v.D + Math.sqrt(v.E) - v.B * Math.sqrt(v.C)) / v.A); },
  full: function (v) { return S`Solve for $ y $ in the equation $ ${v.A}y^2 + ${v.B}\sqrt{${v.C}} = ${v.D} + \sqrt{${v.E}} $ `; },
  options: function (v) {
    return [S` $ y = \pm\sqrt{${v.D} + \sqrt{${v.E}} - \dfrac{${v.B}\sqrt{${v.C}}}{${v.A}}} $ `,
            S` $ y = \pm\sqrt{\dfrac{${v.D} + \sqrt{${v.E}} - ${v.B}\sqrt{${v.C}}}{${v.A}}} $ `,
            S` $ y = \pm\sqrt{\dfrac{${v.D} + ${v.E}\sqrt{${v.C}}}{${v.A}}} $ `,
            S` $ y = \pm\sqrt{\dfrac{${v.D} + ${v.A} - ${v.B}\sqrt{${v.C}}}{${v.A}}} $ `];
  },
  solution: function (v) {
    return '1. Isolate for $ y $ :' + NL + S` $ y = \pm\sqrt{\dfrac{${v.D} + \sqrt{${v.E}} - ${v.B}\sqrt{${v.C}}}{${v.A}}} $ ` + NL + ' 2. Solve for $ y $ ';
  },
  fin: function (v, A) {
    var top = v.D + Math.sqrt(v.E) - v.B * Math.sqrt(v.C);
    return S`$ y=\sqrt{\dfrac{${v.D}+${Math.sqrt(v.E).toFixed(3)}-${(v.B * Math.sqrt(v.C)).toFixed(3)}}{${v.A}}}=\sqrt{\dfrac{${top.toFixed(3)}}{${v.A}}}\approx ${A} $ (the positive root).`;
  }
};
DEFS['Basic Math|8'] = {
  names: ['P', 'Q', 'R', 'S'], orig: { P: 8, Q: 12, R: 43, S: 8 }, dp: 3,
  pick: function () {
    var Q = R.int(5, 30);
    var v = { P: R.int(2, 15), Q: Q, R: Q + R.int(5, 40), S: R.of([2, 3, 5, 6, 7, 8, 10]) };
    return v.P !== v.R && v.P !== v.Q ? v : null;           /* or two options read the same */
  },
  ans: function (v) { return v.P / (v.R - v.Q); },
  full: function (v) { return S`Solve for $ x $ in the equation $ \frac{${v.P}}{x} + \bigl(${v.Q} - \sqrt{${v.S}}\bigr) = ${v.R} - \sqrt{${v.S}} $ `; },
  options: function (v) {
    return [S` $ x = \dfrac{${v.R}}{${v.P} - \sqrt{${v.S}} - \bigl(${v.Q} - \sqrt{${v.S}}\bigr)} $ `,
            S` $ x = \dfrac{${v.P} - ${v.R}}{${v.P} - \sqrt{${v.Q}} - \sqrt{${v.S}}} $ `,
            S` $ x = \dfrac{${v.P}}{${v.R} - \sqrt{${v.S}} - \bigl(${v.Q} - \sqrt{${v.S}}\bigr)} $ `,
            S` $ x = \dfrac{${v.R} - \sqrt{${v.S}} - \bigl(${v.Q} - \sqrt{${v.S}}\bigr)}{${v.P}} $ `];
  },
  feedback: function (v) {
    var f = S` Bring constants to one side, invert: $ x = \dfrac{${v.P}}{${v.R} - ${v.Q}} $ .`;
    return ['Incorrect.' + f, 'Incorrect.' + f, 'Correct!' + f, 'Incorrect.' + f];
  },
  solution: function (v) {
    return '1. Isolate for $ x $ :' + NL + S` $ x = \dfrac{${v.P}}{${v.R} - \sqrt{${v.S}} - \bigl(${v.Q} - \sqrt{${v.S}}\bigr)} $ ` + NL + ' 2. Solve for $ x $ ';
  },
  fin: function (v, A) {
    return S`The $ \sqrt{${v.S}} $ terms cancel: $ x=\dfrac{${v.P}}{${v.R}-${v.Q}}=\dfrac{${v.P}}{${v.R - v.Q}}${eq(v.P / (v.R - v.Q), 3)} ${A} $`;
  }
};
DEFS['Basic Math|9'] = {
  names: ['K', 'M', 'N'], orig: { K: 33, M: 5, N: 5 }, dp: 2,
  pick: function () {
    var v = { K: R.int(5, 60), M: R.of([2, 3, 5, 6, 7]), N: R.int(2, 20) };
    return v.K !== v.N && Math.sqrt(v.N * Math.sqrt(v.M) / v.K) >= 0.1 ? v : null;
  },
  ans: function (v) { return Math.sqrt(v.N * Math.sqrt(v.M) / v.K); },
  full: function (v) { return S`Solve for $ z $ in the equation $ \dfrac{${v.K}}{\sqrt{${v.M}}}z^2 = ${v.N} $ `; },
  options: function (v) {
    return [S` $ z = \pm\sqrt{\dfrac{${v.N}\sqrt{${v.M}}}{${v.K}}} $ `,
            S` $ z = \dfrac{${v.N}\sqrt{${v.M}}}{${v.K}} $ `,
            S` $ z = \pm\sqrt{\dfrac{${v.K}}{${v.N}\sqrt{${v.M}}}} $ `,
            S` $ z = \pm\sqrt{\dfrac{${v.N}}{${v.K}\sqrt{${v.M}}}} $ `];
  },
  feedback: function (v) {
    var z2 = S`$ z^2 = \dfrac{${v.N}\sqrt{${v.M}}}{${v.K}} $`;
    return [S`Correct! Multiply both sides by $ \sqrt{${v.M}} $ and divide by ${v.K}: ` + z2 + ' , then take the square root.',
            'Incorrect. That is ' + S`$ z^2 $` + ' ; take the square root to get ' + S`$ z $` + ' .',
            'Incorrect. The fraction is upside down: ' + z2 + ' .',
            S`Incorrect. $ \sqrt{${v.M}} $ divides on the left, so it multiplies on the right: ` + z2 + ' .'];
  },
  solution: function (v) {
    return '1. Isolate for $ z $ :' + NL + S` $ z = \pm\sqrt{\dfrac{${v.N}\sqrt{${v.M}}}{${v.K}}} $ ` + NL + ' 2. Solve for $ z $ ';
  },
  fin: function (v, A) {
    var top = v.N * Math.sqrt(v.M);
    return S`$ z=\sqrt{\dfrac{${v.N}\sqrt{${v.M}}}{${v.K}}}=\sqrt{\dfrac{${top.toFixed(3)}}{${v.K}}}\approx ${A} $ (the positive root).`;
  }
};
DEFS['Basic Math|10'] = {
  names: ['K', 'M', 'N'], orig: { K: 14, M: 55, N: 44 }, dp: 2,
  pick: function () {
    var M = R.int(10, 80);
    if (Math.sqrt(M) === Math.round(Math.sqrt(M))) return null;
    var v = { K: R.int(2, 30), M: M, N: R.int(10, 60) };
    return v.N > Math.sqrt(v.M) + 1 ? v : null;
  },
  ans: function (v) { return Math.sqrt((v.N - Math.sqrt(v.M)) * Math.sqrt(v.M) + v.K); },
  full: function (v) { return S`Solve for $ a $ in the equation $ \dfrac{a^2 - ${v.K}}{\sqrt{${v.M}}} = ${v.N} - \sqrt{${v.M}} $ `; },
  options: function (v) {
    return [S` $ a = {(${v.N} - \sqrt{${v.M}})\sqrt{${v.M}} + ${v.K}} $ `,
            S` $ a = \pm\sqrt{${v.N} - \sqrt{${v.M}} + \sqrt{${v.M}} + ${v.K}} $ `,
            S` $ a = \pm\sqrt{(${v.M} - \sqrt{${v.N}})\sqrt{${v.K}} + ${v.M}} $ `,
            S` $ a = \pm\sqrt{(${v.N} - \sqrt{${v.M}})\sqrt{${v.M}} + ${v.K}} $ `];
  },
  solution: function (v) {
    return '1. Isolate for $ a $ :' + NL + S` $ a = \pm\sqrt{(${v.N} - \sqrt{${v.M}})\sqrt{${v.M}} + ${v.K}} $ ` + NL + ' 2. Solve for $ a $ ';
  },
  fin: function (v, A) {
    var s = Math.sqrt(v.M), r = (v.N - s) * s + v.K;
    return S`$ a=\sqrt{(${v.N}-${s.toFixed(3)})(${s.toFixed(3)})+${v.K}}=\sqrt{${r.toFixed(2)}}\approx ${A} $ (the positive root).`;
  }
};
DEFS['Basic Math|11'] = {
  names: ['y', 'C'], orig: { y: 8, C: 12 }, dp: 3,
  pick: function () {
    var v = { y: R.int(2, 12), C: R.int(3, 30) };
    return v.C / (2 * v.y * v.y + 1) >= 0.02 ? v : null;
  },
  ans: function (v) { return -v.C / (2 * v.y * v.y + 1); },
  full: function (v) { return S`Solve for $ x $ when $ y = ${v.y} $ in the equation $ 2xy^2 + ${v.C} + x = 0 $ `; },
  options: function (v) {
    return [S` $ x = -${v.C} \big/ \bigl(2y^2 + 1\bigr) $ `,
            S` $ x = \bigl(2y^2 - ${v.C}\bigr) / 1 $ `,
            S` $ x = 2y^2 \big/ \bigl(-${v.C} + 1\bigr) $ `,
            S` $ x = \bigl(2y^2 + 1\bigr) / -${v.C} $ `];
  },
  feedback: function (v) {
    return [S`Correct Group $ x $ -terms and solve: $ x (2y^2 + 1) = -${v.C} $ .`,
            S`Incorrect. Group $ x $ -terms and solve: $ x(2y^2 + 1) = -${v.C} $ .`,
            S`Incorrect. Group $ x $ -terms and solve: $ x(2y^2 + 1) = -${v.C} $ .`,
            S`Incorrect. Group $ x $ -terms and solve: $ x(2y^2 + 1) = -${v.C} $ .`];
  },
  solution: function (v) {
    return '1. Isolate for $ x $ :' + NL + S` $ x = -${v.C} \big/ \bigl(2y^2 + 1\bigr) $ ` + NL + ' 2. Solve for $ x $ ';
  },
  fin: function (v, A) {
    var b = 2 * v.y * v.y + 1;
    return S`$ x=\dfrac{-${v.C}}{2(${v.y})^2+1}=\dfrac{-${v.C}}{${b}}${eq(-v.C / b, 3)} ${A} $`;
  }
};
DEFS['Basic Math|12'] = {
  names: ['x', 'C'], orig: { x: -7, C: 12 }, dp: 3,
  pick: function () {
    var C = R.int(4, 30), v = { x: -R.int(1, C - 1), C: C };
    return Math.sqrt((-v.C - v.x) / (2 * v.x)) >= 0.1 ? v : null;
  },
  ans: function (v) { return Math.sqrt((-v.C - v.x) / (2 * v.x)); },
  full: function (v) { return S`Solve for $ y $ when $ x = ${v.x} $ in the equation $ 2xy^2 + ${v.C} + x = 0 $ `; },
  options: function (v) {
    return [S` $ y = -\dfrac{2x}{x - ${v.C}} $ `,
            S` $ y = \pm\sqrt{\dfrac{-2x}{x - ${v.C}}} $ `,
            S` $ y = \pm\sqrt{\dfrac{-${v.C} - x}{2x}} $ `,
            S` $ y = \pm\sqrt{\dfrac{-${v.C} - 2x}{x}} $ `];
  },
  feedback: function (v) {
    var f = S` Isolate $ y^2 = \dfrac{-${v.C} - x}{2x} $  take square-root.`;
    return ['Incorrect.' + f, 'Incorrect.' + f, 'Correct!' + f, 'Incorrect.' + f];
  },
  solution: function (v) {
    return '1. Isolate for $ y $ :' + NL + S` $ y = \pm\sqrt{\dfrac{-${v.C} - x}{2x}} $ ` + NL + ' 2. Solve for $ y $ ';
  },
  fin: function (v, A) {
    return S`$ y=\sqrt{\dfrac{-${v.C}-(${v.x})}{2(${v.x})}}=\sqrt{\dfrac{${-v.C - v.x}}{${2 * v.x}}}=\sqrt{\dfrac{${v.C + v.x}}{${-2 * v.x}}}\approx ${A} $ (the positive root).`;
  }
};

/* -------------------------------------------------------------- the API */
function key(p) { return p.section + '|' + p.number; }
function has(p) { return !!DEFS[key(p)]; }
function answer(d, v) { return rnd(d.ans(v), d.dp); }
function same(a, b) { return !!a && !!b && Object.keys(a).every(function (k) { return a[k] === b[k]; }); }

/* new numbers, not the CSV's and not the last ones this student had */
function make(p, last) {
  var d = DEFS[key(p)];
  for (var i = 0; i < 500; i++) {
    var v = d.pick();
    if (!v || same(v, d.orig) || same(v, last)) continue;
    if (!isFinite(d.ans(v))) continue;
    if (answer(d, v) === answer(d, d.orig)) continue;          /* a different answer, too */
    return v;
  }
  return null;
}

/* the question with these numbers: a copy, the model itself is not changed */
function apply(p, v, opts) {
  var d = DEFS[key(p)], A = answer(d, v);
  var q = Object.assign({}, p);
  q.full = d.full(v);
  q.range = [A, A];
  if (d.solution) q.solution = d.solution(v);
  var o = d.options && d.options(v), f = d.feedback && d.feedback(v);
  q.steps = p.steps.map(function (s) {
    var c = Object.assign({}, s);
    if (!s.options.length) c.fin = d.fin(v, n(A));
    else if (o) c.options = s.options.map(function (x) {
      return Object.assign({}, x, { text: o[x.original - 1], feedback: f ? f[x.original - 1] : x.feedback });
    });
    return c;
  });
  q.numbers = v;
  return q;
}
function describe(p, v) {
  var d = DEFS[key(p)];
  return d.names.map(function (k) { return k + '=' + n(v[k]); }).join(', ') + '; answer=' + n(answer(d, v));
}

window.TutorVariants = {
  has: has, make: make, apply: apply, describe: describe,
  /* for the self-test and for update-questions: the CSV's own numbers */
  defs: DEFS, answer: function (p, v) { return answer(DEFS[key(p)], v); }
};
})();
