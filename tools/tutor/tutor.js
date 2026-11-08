/* ======================================================================
   Biomechanics Tutor, plain-JS version.

   Reads the same Master_questions.csv as the Shiny app and behaves the same
   rows: one problem per question number, a final numeric answer checked
   against the row's min/max range and its units, and the steps as
   multiple-choice leading questions (a wrong choice shows that option's
   feedback; a right one moves to the next step).

   The order is try-first: a student answers the full question, and only a
   wrong answer (or asking for them) brings up the steps. See the views
   below.

   No Python, no server: the page loads in a moment, and edits to the CSV
   show up on the next reload with no export step.

   Which sections are switched on is READY below. Every other section is
   listed on the main page but greyed out until it has been checked here.
   ====================================================================== */
(function () {
'use strict';

/* null = every section in the CSV; or a list of names, e.g. ['Projectile Motion'] */
var READY = null;
var CSV_URL = 'Master_questions.csv';
var IMG_BASE = 'www/';                    /* image_url values are relative to www/ */

/* the Shiny app's section colours, in the order sections appear in the CSV */
var SECTION_COLORS = [
  ['#4a85d6', 'white'], ['#8560b8', 'white'], ['#50a876', 'white'], ['#d15d5d', 'white'],
  ['#e68f42', 'white'], ['#4db399', 'white'], ['#4a98b8', 'white'], ['#d66b99', 'white'],
  ['#7360a3', 'white'], ['#e6b84a', '#333'], ['#5d7599', 'white'], ['#b36d4d', 'white'],
  ['#5d7f99', 'white'], ['#ad5dad', 'white'], ['#5db3d1', 'white'], ['#e66b4a', 'white'],
  ['#85ba5d', '#333'], ['#ccb84a', '#333'], ['#e6a335', 'white'], ['#50a380', 'white']];
var SECTION_ICONS = {
  'Basic Math': 'calculator', 'Calculus': 'math-integral', 'Trigonometry': 'triangle',
  'Linear Kinematics': 'arrows-horizontal', 'Force Resolution': 'vector-triangle',
  'Impulse Momentum': 'ball-bowling', 'Friction': 'hand-stop', 'Projectile Motion': 'rocket',
  'Angular Kinematics': 'rotate-clockwise', 'General Kinematics': 'run',
  'Torque/Moment of Force': 'tool', 'Moment of Inertia': 'disc',
  'Static Equilibrium': 'scale', 'Dynamic Equilibrium': 'arrows-right-left'};
var UNITS = ['m/s', 'm/s²', 'rad/s', 'rad/s²', 'N', 'N/m', 'kg', 'm', 'J', 'W', 'No units',
             's', 'Degrees', 'Revolutions', 'RPM', 'N·m', 'kg·m²', 'kg·m/s'];
var TYPE_COLORS = {
  'Formula Selection': '#007bff', 'Algebraic Manipulation': '#fd7e14',
  'Substitute & Calculate': '#17a2b8', 'Derivative': '#e83e8c', 'Integral': '#6610f2',
  'Vector Components': '#20c997', 'Force Calculation': '#dc3545',
  'Angle Calculation': '#28a745', 'Kinematics Calculation': '#ffc107', 'Final Answer': '#28a745'};

/* ------------------------------------------------------------- helpers */
function $(s, r) { return (r || document).querySelector(s); }
function el(tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function icon(name) {
  var p = (window.TUTOR_ICONS || {})[name] || '';
  return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>';
}
/* an image that says which file is missing instead of showing a broken icon */
function figure(path, alt, cls) {
  var im = el('img', cls || '');
  im.alt = alt;
  im.onerror = function () {
    var n = el('span', 'missing-fig', 'Figure not found: ' + esc(path));
    if (im.parentNode) im.parentNode.replaceChild(n, im);
  };
  im.src = imgSrc(path);
  return im;
}
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function blank(v) {
  if (v == null) return true;
  var s = String(v).trim().toLowerCase();
  return s === '' || s === 'nan' || s === 'none';
}
function isImage(s) {
  s = String(s);
  return /^https?:\/\//.test(s) || /\.(png|jpe?g|gif|svg|webp)$/i.test(s);
}
function imgSrc(s) { return /^https?:\/\//.test(s) ? s : IMG_BASE + s.replace(/^\.?\//, ''); }
/* the Shiny app compares units after turning ^2 into ² and . into ·; this
   also ignores case, so 'no units' matches 'No units' and 'rpm' matches 'RPM' */
function normUnits(u) {
  return String(u == null ? '' : u).trim().replace(/\^2/g, '²').replace(/\./g, '·');
}
function sameUnits(a, b) { return normUnits(a).toLowerCase() === normUnits(b).toLowerCase(); }
function pyBool(b) { return b ? 'True' : 'False'; }
function pyNum(x) { return String(x); }

/* seeded shuffle, so a step's options keep their order on every visit */
function seedOf(s) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function shuffle(list, key) {
  var a = list.slice(), t = seedOf(key);
  var rnd = function () {
    t = (t + 0x6D2B79F5) >>> 0;
    var r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(rnd() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x;
  }
  return a;
}

/* ------------------------------------------------- markdown + LaTeX
   $$...$$ is display maths and $...$ inline, as in the Shiny app. The maths
   is set aside before marked sees the text and typeset with KaTeX after.
   The Shiny app runs marked over the maths too, which can break it: an
   underscore pair becomes italics, "\\" becomes "\" and "\{" becomes "{",
   and the formula is then left as raw text with its dollar signs. Setting
   it aside first renders those formulas as written. */
function findEnd(t, i, delim) {
  var depth = 0;
  while (i < t.length) {
    var c = t[i];
    if (depth <= 0 && t.slice(i, i + delim.length) === delim) return i;
    if (c === '\\') i++;
    else if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  return -1;
}
function splitMath(t) {
  var out = [], buf = '', i = 0;
  while (i < t.length) {
    if (t[i] === '\\' && t[i + 1] === '$') { buf += '\\$'; i += 2; continue; }
    if (t[i] === '$') {
      var dd = t[i + 1] === '$', d = dd ? '$$' : '$';
      var e = findEnd(t, i + d.length, d);
      if (e >= 0) {
        if (buf) out.push({ text: buf }); buf = '';
        out.push({ math: t.slice(i + d.length, e), display: dd });
        i = e + d.length; continue;
      }
    }
    buf += t[i]; i++;
  }
  if (buf) out.push({ text: buf });
  return out;
}
function renderMD(node, text, inline) {
  var t = String(text == null ? '' : text);
  if (inline) t = t.replace(/\$\$/g, '$');
  var parts = splitMath(t), maths = [], src = '';
  parts.forEach(function (p) {
    if (p.text != null) src += p.text;
    else { src += 'KXMATH' + maths.length + 'KX'; maths.push(p); }
  });
  var html;
  try { html = window.marked ? marked.parse(src) : esc(src); }
  catch (e) { html = esc(src); }
  html = html.replace(/KXMATH(\d+)KX/g, function (m, k) {
    var p = maths[+k];
    if (!window.katex) return esc((p.display ? '$$' : '$') + p.math + (p.display ? '$$' : '$'));
    try {
      return katex.renderToString(p.math, { displayMode: p.display, throwOnError: false });
    } catch (e) { return esc(p.math); }
  });
  node.innerHTML = html;
  return node;
}
function md(text, cls, inline) { return renderMD(el('div', 'md ' + (cls || '')), text, inline); }

/* ------------------------------------------------------- reading the CSV
   The CSV is mostly UTF-8, but some rows were saved from a Mac editor and
   carry single Mac Roman bytes (’ as 0xD5, – as 0xD0). Read the UTF-8 as
   UTF-8 and any stray byte as the Mac Roman character it was, instead of
   the "�" the Shiny app shows. */
var MAC = 'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ';
function decode(buf) {
  var b = new Uint8Array(buf);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) {}
  var out = [], i = 0, n = b.length, run = 0;
  var dec = new TextDecoder('utf-8');
  while (i < n) {
    var c = b[i], len = c < 0x80 ? 1 : (c >> 5) === 6 ? 2 : (c >> 4) === 14 ? 3 : (c >> 3) === 30 ? 4 : 0;
    var ok = len > 0 && i + len <= n;
    for (var k = 1; ok && k < len; k++) if ((b[i + k] >> 6) !== 2) ok = false;
    if (ok && len === 2 && c < 0xC2) ok = false;
    if (ok) { i += len; continue; }
    if (i > run) out.push(dec.decode(b.subarray(run, i)));
    out.push(MAC[c - 0x80] || '�');
    i += 1; run = i;
  }
  if (run < n) out.push(dec.decode(b.subarray(run)));
  return out.join('');
}

var DATA = null;     /* { sections: [...], bySlug: {}, typeOf: {} } */
function buildModel(rows) {
  var secs = [], bySec = {};
  rows.forEach(function (r) {
    var s = String(r.section || '').trim();
    if (!s || s.toLowerCase() === 'nan') return;
    if (!bySec[s]) { bySec[s] = { name: s, rows: [] }; secs.push(bySec[s]); }
    bySec[s].rows.push(r);
  });
  var typeOf = {};
  secs.forEach(function (sec, i) {
    sec.slug = slug(sec.name);
    sec.color = SECTION_COLORS[i % SECTION_COLORS.length];
    sec.icon = SECTION_ICONS[sec.name] || 'notebook';
    sec.ready = !READY || READY.indexOf(sec.name) >= 0;
    /* one tab per question_number, labelled with it (as the Shiny app does) */
    var seenNum = {}, problems = [];
    sec.rows.forEach(function (r) {
      var qn = String(r.question_number).trim();
      if (seenNum[qn]) return;
      seenNum[qn] = 1;
      problems.push({ number: qn, main: r.main_question });
    });
    problems.forEach(function (p) {
      var rs = sec.rows.filter(function (r) { return r.main_question === p.main; });
      var first = rs[0];
      p.section = sec.name;
      p.full = first.full_question;
      p.image = blank(first.image_url) ? '' : String(first.image_url).trim();
      p.solution = blank(first.solution) ? '' : first.solution;
      p.units = blank(first.units) ? '' : normUnits(first.units);
      var lo = parseFloat(first.min_value), hi = parseFloat(first.max_value);
      p.range = [Math.min(lo, hi), Math.max(lo, hi)];
      /* one step per row, in order. The Shiny app keeps only the first row of
         each distinct sub_question, which also drops a later step that
         repeats the wording ("What is the next step?") with different
         options. Here only a row that repeats an earlier one exactly
         (same wording, options and answer) is left out. */
      var seenStep = {}, steps = [];
      rs.forEach(function (r) {
        var k = [r.sub_question, r.option_1, r.option_2, r.option_3, r.option_4,
                 r.correct_option].join('\u241f');
        if (seenStep[k]) return;
        seenStep[k] = 1;
        steps.push(r);
      });
      p.steps = steps.map(function (r, i) {
        var opts = [];
        for (var j = 1; j <= 4; j++) {
          if (blank(r['option_' + j])) continue;
          opts.push({ text: r['option_' + j], feedback: r['feedback_' + j], original: j });
        }
        /* a number 1-4; a letter A-D is read as the same position */
        var cs = String(r.correct_option || '').trim();
        var co = /^[A-Da-d]$/.test(cs) ? 'abcd'.indexOf(cs.toLowerCase()) + 1 : parseInt(cs, 10);
        var st = { text: r.sub_question, type: String(r.question_type || '').trim(),
                   options: opts, correct: isNaN(co) ? null : co };
        /* the final-answer row has no options; its feedback_1, if written,
           is the last line of working */
        if (!opts.length && !blank(r.feedback_1)) st.fin = String(r.feedback_1).trim();
        typeOf[sec.name + '|' + p.number + '|' + (i + 1)] = { type: st.type, text: st.text };
        return st;
      });
    });
    sec.problems = problems;
  });
  var bySlug = {};
  secs.forEach(function (s) { bySlug[s.slug] = s; });
  /* the unit list: the Shiny app's, plus any the CSV uses that it lacks */
  var units = UNITS.slice();
  secs.forEach(function (s) {
    s.problems.forEach(function (p) {
      if (p.units && !units.some(function (u) { return sameUnits(u, p.units); })) units.push(p.units);
    });
  });
  return { sections: secs, bySlug: bySlug, typeOf: typeOf, units: units };
}

function pillOf(type) {
  var t = type || '';
  var map = [['Formula Selection', 'pill-formula', 'Formula'],
             ['Algebraic Manipulation', 'pill-algebraic', 'Algebraic'],
             ['Substitute', 'pill-substitute', 'Calculate'],
             ['Derivative', 'pill-derivative', 'Derivative'], ['Integral', 'pill-integral', 'Integral'],
             ['Vector', 'pill-vector', 'Vector'], ['Force', 'pill-force', 'Force'],
             ['Angle', 'pill-angle', 'Angle'], ['Kinematics', 'pill-kinematics', 'Kinematics'],
             ['Final Answer', 'pill-final', 'Final']];
  for (var i = 0; i < map.length; i++) if (t.indexOf(map[i][0]) >= 0) return map[i];
  return null;
}

/* ------------------------------------------------------- what is solved */
function solvedSet() {
  var s = {};
  TutorLog.all().forEach(function (e) {
    if (e.action === 'answer_submitted' && /correct=True/.test(e.details))
      s[e.section + '|' + e.question_number] = 1;
  });
  return s;
}

/* ================================================================ views */
var view = $('#view');
function setActive(which) {
  document.querySelectorAll('.head-btns .link-btn').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-go') === which);
  });
}

/* ======================================================================
   The main page and the question view, try-first.

   Marc, 29 Oct: "a student will try the full question first and if they
   can't get it right they are lead through a first leading question... if
   they get that first question wrong then maybe that is where they have
   messed up.. if they get it right but the full question wrong then it may
   be at another step."

   Marc, 30 Oct: "if they get that leading question right it should send
   them to the next leading question, if they get a leading question wrong
   than this could suggest that this is where they made the error and then
   they should be made to answer the full question again, if they get the
   full question wrong again then they need to move to another leading
   question."

   So a question opens as just the problem and an answer box (mode 'try').
   A wrong answer (or "work through it step by step") opens the steps one at
   a time ('guided'). A step picked right first time opens the next one. A
   step picked wrong shows that option's feedback, and the student keeps
   choosing until they find the right option; then, with that step fixed,
   they are sent back to the full question ('retry'). Right: solved. Wrong
   again: the next step opens. Each step remembers whether its FIRST pick was
   right, and the summary names the first step picked wrong.
   ====================================================================== */
var LETTERS = 'ABCD';
/* the right option's feedback is its rationale or working (Marc, 30 Oct:
   step answers should show the calculation or the reason). Shown once the
   step is answered, without the leading "Correct". */
function whyOf(s) {
  var r = s.options.filter(function (o) { return o.original === s.correct; })[0];
  if (!r) return '';
  return String(r.feedback || '').replace(/^\s*(correct|right)\b[\s!.:,;-]*(as a starting point:?\s*)?/i, function (m) {
    return /starting point/i.test(m) ? 'As a starting point: ' : '';
  }).trim();
}
var TYPE_WORDS = {
  'Formula Selection': 'choosing the equation', 'Substitute & Calculate': 'putting the numbers in',
  'Algebraic Manipulation': 'rearranging the equation', 'Vector Components': 'splitting into components',
  'Angle Calculation': 'finding the angle', 'Final Answer': 'the final answer',
  'Derivative': 'taking the derivative', 'Integral': 'integrating'
};
var state = {};          /* per problem, for this visit */
var lastNumbers = {};    /* the last new numbers each question had, so a retake differs */
function stateOf(p) {
  var k = p.section + '|' + p.main;
  /* cur: the step open now ('guided') or the one to open next ('retry');
     done: steps whose right option has been found; fbStep: the step that
     stepFb belongs to; from: the mode the question was solved from */
  if (!state[k]) state[k] = { mode: 'try', tries: 0, cur: 0, show: 0, first: {}, tried: {}, done: {},
                                value: '', units: '', stepFb: null, fbStep: -1, why: '', from: '', backAfter: -1, backTries: 0 };
  return state[k];
}

/* ------------------------------------------------------------- main page */
function showMenu() {
  setActive('menu');
  var solved = solvedSet();
  view.innerHTML = '';
  var hero = el('div', 'm-hero');
  hero.innerHTML = '<p class="eyebrow">EPHE 341 · Biomechanics</p><h2>Practice problems, one step at a time</h2>' +
    '<p>Try each problem on your own first. If your answer is off, the Tutor walks you through it and shows ' +
    'the step where your working went wrong.</p>';
  view.appendChild(hero);

  /* continue where you left off */
  var last = TutorLog.all().filter(function (e) { return e.action !== 'section_selected'; }).pop();
  if (last) {
    var sec = DATA.sections.filter(function (s) { return s.name === last.section; })[0];
    if (sec) {
      var c = el('a', 'm-continue');
      c.href = '#/s/' + sec.slug + '/' + encodeURIComponent(last.question_number);
      c.style.setProperty('--sc', sec.color[0]);
      c.innerHTML = '<span class="m-ic">' + icon(sec.icon) + '</span><span class="grow"><small>Continue where you left off</small>' +
        '<b>' + esc(sec.name) + ' · Question ' + esc(last.question_number) + '</b></span>' + icon('chevron-right');
      view.appendChild(c);
    }
  }
  backupNudge(view);
  accountNudge(view);
  var grid = el('div', 'm-grid');
  DATA.sections.forEach(function (s) {
    var n = s.problems.filter(function (p) { return solved[s.name + '|' + p.number]; }).length;
    var a = el('a', 'm-card');
    a.href = '#/s/' + s.slug;
    a.style.setProperty('--sc', s.color[0]);
    a.innerHTML = '<span class="m-ic">' + icon(s.icon) + '</span>' +
      '<span class="m-name">' + esc(s.name) + '</span>' +
      '<span class="m-count">' + n + ' / ' + s.problems.length + '</span>' +
      '<span class="m-bar"><i style="width:' + (100 * n / s.problems.length) + '%"></i></span>';
    grid.appendChild(a);
  });
  view.appendChild(grid);
  if (DATA.bundled) view.appendChild(el('p', 'menu-note', 'Opened from the folder: using the copy ' +
    'of the questions saved ' + esc(DATA.bundled) + '. After editing the CSV, double-click ' +
    '<b>Update questions.command</b> in the web folder.'));
  view.appendChild(el('p', 'menu-note', window.TutorSync && !TutorSync.off() ?
    'Your answers are saved on this device and, without your name, online for the course. ' +
    '<a href="#/account">Your account</a> (top right) lets you pick up on another device.' :
    'Your answers stay on this device. ' +
    '<a href="#/account">Your account</a> says where, and how to keep a backup.'));
  document.title = 'Biomechanics Tutor';
}

/* ------------------------------------------------------------- a question */
function showSection(sec, number) {
  setActive('');
  var p0 = sec.problems.filter(function (x) { return x.number === number; })[0] || sec.problems[0];
  var p = p0;
  var fresh = !state[p0.section + '|' + p0.main];
  var st = stateOf(p0);
  /* taken again after solving it (this visit or an earlier one): new
     numbers, where the question has them (variants.js) */
  if (fresh && window.TutorVariants && TutorVariants.has(p0) && solvedSet()[p0.section + '|' + p0.number]) {
    var lk = p0.section + '|' + p0.number;
    st.numbers = TutorVariants.make(p0, lastNumbers[lk]);
    if (st.numbers) {
      lastNumbers[lk] = st.numbers;
      TutorLog.record(sec.name, p0.number, 0, 'new_numbers', TutorVariants.describe(p0, st.numbers));
    }
  }
  if (st.numbers) p = TutorVariants.apply(p0, st.numbers);
  document.title = sec.name + ' ' + p.number + ' · Biomechanics Tutor';
  warmCache(sec);
  view.innerHTML = '';
  view.style.setProperty('--sc', sec.color[0]);
  var solved = solvedSet();

  /* where am I: section, and the questions in it */
  var nav = el('div', 'q-nav');
  nav.innerHTML = '<a class="crumb" href="#/">' + icon('arrow-back-up') + 'All sections</a>' +
    '<span class="q-sec"><span class="m-ic">' + icon(sec.icon) + '</span>' + esc(sec.name) + '</span>';
  view.appendChild(nav);
  var chips = el('div', 'q-chips');
  sec.problems.forEach(function (x) {
    var a = el('a', 'q-chip' + (x === p0 ? ' on' : '') + (solved[sec.name + '|' + x.number] ? ' done' : ''), esc(x.number));
    a.href = '#/s/' + sec.slug + '/' + encodeURIComponent(x.number);
    a.title = 'Question ' + x.number + (solved[sec.name + '|' + x.number] ? ' (solved)' : '');
    chips.appendChild(a);
  });
  view.appendChild(chips);

  /* the problem */
  var card = el('section', 'q-card');
  var head = el('div', 'q-head');
  head.innerHTML = '<h2>Question ' + esc(p.number) + (p.numbers ? ' <span class="q-new" title="You solved this one before, so the numbers have changed">New numbers</span>' : '') +
    '</h2><span class="q-state"></span>';
  card.appendChild(head);
  var body = el('div', 'q-body' + (p.image ? ' has-fig' : ''));
  body.appendChild(md(p.full, 'q-text'));
  if (p.image) {
    var fig = el('button', 'q-fig');
    fig.setAttribute('aria-label', 'Enlarge the figure');
    fig.appendChild(figure(p.image, 'Figure for ' + sec.name + ' ' + p.number));
    fig.onclick = function () { lightbox(imgSrc(p.image)); };
    body.appendChild(fig);
  }
  card.appendChild(body);

  /* the answer: always here, the first thing to try */
  var ans = el('div', 'q-answer');
  ans.innerHTML = '<div class="a-head"><label for="ans-val">Your answer</label></div>';
  /* the calculator can open here, just above the answer box (calc.js) */
  var calcHost = null;
  if (window.TutorCalc && TutorCalc.attachInline) {
    var cbtn = el('button', 'calc-open', icon('calculator') + 'Calculator');
    cbtn.type = 'button';
    cbtn.setAttribute('aria-expanded', 'false');
    ans.querySelector('.a-head').appendChild(cbtn);
    calcHost = el('div', 'calc-inline');
    calcHost.hidden = true;
    ans.appendChild(calcHost);
  }
  var row = el('div', 'a-row');
  var inp = el('input'); inp.id = 'ans-val'; inp.type = 'text'; inp.inputMode = 'decimal';
  inp.autocomplete = 'off'; inp.placeholder = 'e.g. 9.5'; inp.value = st.value;
  var sel = el('select'); sel.id = 'ans-units'; sel.setAttribute('aria-label', 'Units');
  sel.appendChild(new Option('Units…', ''));
  DATA.units.forEach(function (u) { sel.appendChild(new Option(u, u)); });
  sel.value = st.units;
  var go = el('button', 'btn-primary', 'Check answer');
  row.appendChild(inp); row.appendChild(sel); row.appendChild(go);
  ans.appendChild(row);
  var fbA = el('div', 'a-fb');
  ans.appendChild(fbA);
  var help = el('button', 'link-quiet', icon('player-play') + 'Not sure how to start? Work through it step by step');
  ans.appendChild(help);
  card.appendChild(ans);
  view.appendChild(card);

  if (calcHost) TutorCalc.attachInline(calcHost, cbtn);
  var guide = el('section', 'g-wrap');
  view.appendChild(guide);
  var done = el('section', 'r-wrap');
  view.appendChild(done);

  inp.oninput = function () { st.value = inp.value; };
  sel.onchange = function () { st.units = sel.value; };
  inp.onkeydown = function (e) { if (e.key === 'Enter') go.click(); };

  function say(slot, kind, msg) {
    slot.innerHTML = '';
    if (!kind) return;
    var ic = { success: 'circle-check', warning: 'alert-triangle', error: 'alert-circle', info: 'info-circle' }[kind];
    var f = el('div', 'fb ' + kind);
    f.setAttribute('role', 'status');
    f.innerHTML = icon(ic);
    f.appendChild(md(msg, 'fb-msg'));
    slot.appendChild(f);
  }
  function stateLabel() {
    var s = head.querySelector('.q-state');
    s.className = 'q-state ' + st.mode;
    s.textContent = st.mode === 'solved' ? 'Solved' : st.mode === 'guided' ? 'Working through the steps' :
      st.mode === 'retry' ? 'Try the full question again' :
      st.tries ? 'Try again, or work through the steps' : 'Try it on your own first';
    /* sent back, it is in link colour: make it work like one */
    if (st.mode === 'retry') {
      s.setAttribute('role', 'button'); s.tabIndex = 0;
      s.onclick = pulseAnswer;
      s.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pulseAnswer(); } };
    } else {
      s.removeAttribute('role'); s.removeAttribute('tabindex'); s.onclick = null; s.onkeydown = null;
    }
  }
  function slipsOf() {
    return Object.keys(st.first).filter(function (k) { return st.first[k] === false; })
      .map(Number).sort(function (a, b) { return a - b; });
  }
  /* the next step from i on that has options to choose from (the last row is
     often just "enter the final answer", with none) */
  function nextStep(i) {
    for (var j = i; j < p.steps.length; j++) if (p.steps[j].options.length) return j;
    return -1;
  }
  function pulseAnswer() {
    ans.classList.add('pulse'); inp.focus({ preventScroll: true }); try { inp.select(); } catch (e) {}
    setTimeout(function () { ans.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
    setTimeout(function () { ans.classList.remove('pulse'); }, 1800);
  }
  var LAST_STEP = 'Not quite. That was the last step: check your arithmetic and units against the steps below.';

  go.onclick = async function () {
    var raw = inp.value.trim().replace(/\s+/g, '').replace(/,/g, '.').replace(/−/g, '-');
    var x = raw === '' ? NaN : Number(raw);
    if (!isFinite(x)) { say(fbA, 'warning', 'Enter a number first.'); return; }
    var numOK = x >= p.range[0] && x <= p.range[1];
    var unitOK = !!sel.value && sameUnits(sel.value, p.units);
    st.tries += 1;
    await TutorLog.record(sec.name, p.number, p.steps.length, 'answer_submitted',
      'answer=' + String(x) + ' ' + (sel.value || 'Select units') + ', correct=' + (numOK && unitOK ? 'True' : 'False'));
    if (numOK && unitOK) {
      st.from = st.mode; st.mode = 'solved'; st.stepFb = null;
      var slips = slipsOf();
      say(fbA, 'success', 'Correct!');
      var c = view.querySelector('.q-chip.on'); if (c) c.classList.add('done');
      drawGuide(); drawDone();
      done.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (numOK) {
      say(fbA, 'warning', sel.value ? 'The number is right, but not the units.' : 'The number is right. Now choose its units.');
    } else if (st.mode === 'try') {
      say(fbA, 'warning', 'Not quite. Let’s work through it one step at a time and find where it went wrong.');
      startGuide('after a wrong answer');
    } else if (st.mode === 'retry') {
      var j = nextStep(st.cur);
      if (j < 0) { say(fbA, 'warning', LAST_STEP); }
      else {
        say(fbA, 'warning', 'Still not quite, so there is more to fix. On to the next step.');
        st.mode = 'guided'; st.cur = j; st.show = j; st.stepFb = null; st.fbStep = -1;
        drawGuide();
        setTimeout(function () { guide.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
      }
    } else {
      say(fbA, 'warning', nextStep(st.cur) >= 0 ? 'Not quite yet. Keep going with the steps below.' : LAST_STEP);
    }
    stateLabel();
  };
  help.onclick = function () { startGuide('chose the steps'); };

  function startGuide(why) {
    if (st.mode !== 'try') return;
    st.mode = 'guided'; st.why = why;
    st.cur = st.show = Math.max(0, nextStep(0));
    TutorLog.record(sec.name, p.number, '', 'guided_start', why);
    drawGuide(); stateLabel();
    setTimeout(function () { guide.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
  }

  function drawGuide() {
    guide.innerHTML = '';
    help.hidden = st.mode !== 'try';
    if (st.mode === 'try' || st.mode === 'solved') return;   /* solved: the full sequence is in the result card */
    var n = p.steps.length;
    var top = el('div', 'g-top');
    top.innerHTML = '<h3>' + (st.mode === 'solved' ? 'Your steps' : st.mode === 'retry' ? 'Back to the full question' :
      'Step ' + (st.cur + 1) + ' of ' + n) + '</h3>';
    var dots = el('div', 'g-dots');
    p.steps.forEach(function (s, i) {
      var cls = st.done[i] ? (st.first[i] === false ? 'slip' : 'ok') : (st.mode === 'guided' && i === st.cur) ? 'now' : 'todo';
      var b = el('button', 'g-dot ' + cls + (i === st.show ? ' on' : ''));
      b.title = 'Step ' + (i + 1) + (cls === 'slip' ? ': first pick was wrong' : cls === 'ok' ? ': right first time' : cls === 'todo' ? ': not needed yet' : '');
      b.setAttribute('aria-label', b.title);
      b.disabled = cls === 'todo';
      b.onclick = function () { st.show = i; drawGuide(); };
      dots.appendChild(b);
    });
    top.appendChild(dots);
    guide.appendChild(top);

    var i = st.show, s = p.steps[i];
    var card = el('div', 'g-card');
    var tp = pillOf(s.type);
    card.innerHTML = '<div class="g-label">Step ' + (i + 1) + (tp ? ' · <span class="type-pill ' + tp[1] + '">' + tp[2] + '</span>' : '') + '</div>';
    card.appendChild(md(s.text, 'g-q'));
    var fb = el('div', 'g-fb');
    if (i === st.cur && st.mode === 'guided' && s.options.length && !st.done[i]) {
      var opts = shuffle(s.options, sec.name + '_' + p.main + '_' + s.text);
      var g = el('div', 'g-opts' + (opts.some(function (o) { return isImage(o.text); }) ? ' pics' : ''));
      opts.forEach(function (o, k) {
        var b = el('button', 'g-opt' + (st.tried[i + ':' + o.original] ? ' tried' : ''));
        b.setAttribute('data-opt', o.original);
        b.innerHTML = '<span class="g-key">' + LETTERS[k] + '</span>';
        var c = el('span', 'g-val');
        if (isImage(o.text)) c.appendChild(figure(String(o.text).trim(), 'Option ' + LETTERS[k]));
        else renderMD(c, o.text, true);
        b.appendChild(c);
        b.onclick = function () { choose(i, o); };
        g.appendChild(b);
      });
      card.appendChild(g);
    } else if (i === st.cur && st.mode === 'guided') {
      card.appendChild(el('p', 'g-last', 'Now enter the full answer in the box above.'));
    } else {
      var right = s.options.filter(function (o) { return o.original === s.correct; })[0];
      if (right) {
        var box = el('div', 'g-right');
        box.innerHTML = '<span class="g-tag">' + (st.first[i] === false ? 'Right answer (after a wrong first pick)' : 'Right answer') + '</span>';
        var v = el('div', '');
        if (isImage(right.text)) v.appendChild(figure(String(right.text).trim(), 'Right answer'));
        else renderMD(v, right.text, true);
        box.appendChild(v);
        var w = whyOf(s);
        if (w) { var wy = el('div', 'g-why'); renderMD(wy, w, true); box.appendChild(wy); }
        card.appendChild(box);
      }
    }
    card.appendChild(fb);

    if (st.stepFb && st.fbStep === i) say(fb, st.stepFb.kind, st.stepFb.msg);
    /* sent back: a real button up to the answer box (the words alone read
       like one, and did nothing) */
    if (st.mode === 'retry' && st.fbStep === i) {
      var up = el('button', 'btn-primary g-back', icon('arrow-back-up') + 'Try the full question again');
      up.type = 'button';
      up.onclick = pulseAnswer;
      card.appendChild(up);
    }
    guide.appendChild(card);

    /* the working so far: each answered step's right answer and reasoning,
       growing under the open step as the student goes (Marc, 30 Oct) */
    var doneIdx = p.steps.map(function (x, k) { return k; })
      .filter(function (k) { return st.done[k] && k !== i; });
    if (doneIdx.length) {
      var tr = el('div', 'g-trail');
      tr.appendChild(el('h4', '', 'Your working so far'));
      doneIdx.forEach(function (k) { tr.appendChild(stepItem(k, k === st.prev)); });
      guide.appendChild(tr);
    }
  }

  async function choose(i, o) {
    var s = p.steps[i], ok = o.original === s.correct;
    if (st.first[i] === undefined) st.first[i] = ok;
    await TutorLog.record(sec.name, p.number, i + 1, 'option_selected',
      'Q: ' + s.text + ' | A: ' + o.text + ' | correct=' + (ok ? 'True' : 'False'));
    if (!ok) {
      st.tried[i + ':' + o.original] = 1;
      st.stepFb = { kind: 'warning', msg: String(o.feedback || 'Not quite. Try another option.') }; st.fbStep = i;
      drawGuide();
      return;
    }
    st.done[i] = true;
    var j = nextStep(i + 1);
    if (st.first[i] === false) {
      /* fixed a step that was wrong at first: likely where the working went
         off, so back to the full question */
      st.mode = 'retry'; st.cur = i + 1; st.show = i; st.backAfter = i; st.backTries = st.tries;
      st.stepFb = { kind: 'info', msg: 'That step may be where your working went wrong. With it fixed, ' +
        '**try the full question again** in the box above.' }; st.fbStep = i;
      TutorLog.record(sec.name, p.number, i + 1, 'retry_full', 'after step ' + (i + 1));
      say(fbA, '', '');
      drawGuide(); stateLabel(); pulseAnswer();
      return;
    }
    st.stepFb = null; st.fbStep = -1;
    st.prev = i;                       /* its rationale shows above the next step */
    if (j >= 0) { st.cur = j; st.show = j; drawGuide(); return; }
    /* no step left to choose from: the answer box is next */
    st.cur = i + 1 < p.steps.length ? i + 1 : i;
    st.show = st.cur;
    if (st.cur === i) { st.stepFb = { kind: 'success', msg: 'Right. Now enter the full answer in the box above.' }; st.fbStep = i; }
    drawGuide(); pulseAnswer();
  }

  /* the last part of the written solution, without its bold heading: the
     final line of working where the CSV has none for the final row */
  function lastWorking() {
    if (!p.solution) return '';
    var parts = String(p.solution).split(/\n?-{3,}\n?/);
    var last = parts[parts.length - 1].trim();
    /* the part under the last bold heading ("**2. What is ...?**"): the
       earlier headings are the earlier steps, already shown above */
    var re = /\*\*\s*(\d+[.)]\s[^*\n]*|[^*\n]*\?)\s*\*\*/g, m, end = -1;
    while ((m = re.exec(last))) end = m.index + m[0].length;
    var body = end >= 0 ? last.slice(end).trim() : '';
    /* a bold answer at the end ("**12 N** to the right") is not a heading */
    if (body.replace(/[\s$.]/g, '').length < 12) body = last.replace(/^\*\*[^*]+\*\*\s*/, '').trim();
    return body;
  }
  /* one step of the working: its question, right answer and reasoning */
  function stepItem(k, isNew) {
    var s = p.steps[k], mark = st.done[k] ? (st.first[k] === false ? 'slip' : 'ok') :
      (!s.options.length && st.mode === 'solved') ? 'ok' : 'shown';      /* the final answer, once solved */
    var it = el('div', 't-item ' + mark + (isNew ? ' t-new' : ''));
    it.innerHTML = '<span class="t-n" title="' + (mark === 'slip' ? 'First pick was wrong' : mark === 'ok' ? 'Right first time' : 'Not needed') +
      '">' + (k + 1) + '</span><div class="t-b"><div class="t-q"></div><div class="t-a"></div></div>';
    renderMD(it.querySelector('.t-q'), s.text, true);
    var a = it.querySelector('.t-a');
    var right = s.options.filter(function (o) { return o.original === s.correct; })[0];
    if (right) {
      if (isImage(right.text)) a.appendChild(figure(String(right.text).trim(), 'Right answer'));
      else renderMD(a, right.text, true);
      var w = whyOf(s);
      if (w) { var wy = el('div', 't-why'); renderMD(wy, w, true); it.querySelector('.t-b').appendChild(wy); }
    } else {
      /* the final answer: the last line of working, so it follows on from the
         steps above, then the accepted value */
      a.classList.add('t-fin');
      var fin = s.fin || lastWorking();
      if (fin) renderMD(a, fin.replace(/\n/g, '  \n'), false);
      var lo = p.range[0], hi = p.range[1], u = p.units && !/^no units$/i.test(p.units) ? ' ' + esc(p.units) : '';
      var acc = el('div', 't-acc', 'Accepted answer: <b>' + (lo === hi ? esc(String(lo)) : esc(String(lo)) + ' to ' + esc(String(hi))) + u + '</b>');
      it.querySelector('.t-b').appendChild(acc);
    }
    return it;
  }

  function drawDone() {
    done.innerHTML = '';
    if (st.mode !== 'solved') return;
    var c = el('div', 'r-card');
    var slips = slipsOf();
    var msg;
    if (!Object.keys(st.first).length) msg = '<h3>' + icon('circle-check') + 'Solved on your own</h3><p>No steps needed.</p>';
    else if (!slips.length) msg = '<h3>' + icon('circle-check') + 'Solved with the steps</h3><p>You got every step right first time, so the working was sound. Check the arithmetic and units in your own attempt.</p>';
    else {
      var s0 = p.steps[slips[0]], lastFix = slips[slips.length - 1];
      msg = '<h3>' + icon('circle-check') + 'Solved with the steps</h3><p>Your working first went off at <b>step ' + (slips[0] + 1) + '</b>' +
        (TYPE_WORDS[s0.type] ? ' (' + TYPE_WORDS[s0.type] + ')' : '') + '.' +
        (slips.length > 1 ? ' Step' + (slips.length > 2 ? 's ' : ' ') + slips.slice(1).map(function (k) { return k + 1; }).join(', ') +
          ' also needed a second try.' : '') +
        (st.from === 'retry' && st.backAfter === lastFix && st.tries === st.backTries + 1 ? ' Once you fixed step ' + (lastFix + 1) + ', you solved the question.' : '') +
        ' ' + (slips.length > 1 ? 'Those are the steps' : 'That is the step') + ' to practise.</p>';
    }
    c.innerHTML = msg;
    /* every step, in order, with its answer and reasoning */
    var seq = el('div', 'r-steps');
    seq.appendChild(el('h4', '', 'The full working, step by step'));
    p.steps.forEach(function (s, k) { seq.appendChild(stepItem(k, false)); });
    c.appendChild(seq);
    if (p.solution) {
      var d = el('details', 'r-sol');
      d.innerHTML = '<summary>The worked solution as written</summary>';
      var sol = el('div', 'sol');
      /* each part on its own: an <hr> written into the Markdown starts an HTML
         block that swallows the next line, so its ** markers showed as text */
      String(p.solution).split(/\n?-{3,}\n?/).forEach(function (part, k) {
        if (k) sol.appendChild(el('hr'));
        sol.appendChild(md(part.replace(/\n/g, '  \n'), 'sol-part'));
      });
      d.appendChild(sol);
      c.appendChild(d);
    }
    var again = el('button', 'btn-plain', icon('arrow-back-up') + 'Try this question again');
    again.onclick = function () { delete state[p.section + '|' + p.main]; showSection(sec, p.number); window.scrollTo(0, 0); };
    var next = sec.problems[sec.problems.indexOf(p0) + 1];
    var acts = el('div', 'r-acts');
    acts.appendChild(again);
    if (next) { var nx = el('a', 'btn-primary', 'Next question ' + icon('chevron-right')); nx.href = '#/s/' + sec.slug + '/' + encodeURIComponent(next.number); acts.appendChild(nx); }
    c.appendChild(acts);
    done.appendChild(c);
  }

  stateLabel();
  if (st.mode !== 'try') { help.hidden = true; drawGuide(); drawDone(); }
  if (st.mode === 'solved') say(fbA, 'success', 'Correct!');
}

function lightbox(src) {
  var d = el('div', 'lb');
  d.innerHTML = '<img alt="Figure, enlarged" src="' + esc(src) + '"><button class="lb-x" aria-label="Close">' + icon('x') + '</button>';
  d.onclick = function () { d.remove(); };
  document.body.appendChild(d);
}

/* ------------------------------------------------------- a backup nudge */
function backupNudge(host) {
  TutorLog.status().then(function (s) {
    if (s.sinceBackup < 40 || sessionStorage.getItem('tutor-nudge-off')) return;
    if (window.TutorSync && !TutorSync.off()) return;      /* saved online: no backup file needed */
    var n = el('div', 'notice warn');
    n.innerHTML = icon('device-floppy') + '<div class="grow"><b>' + s.sinceBackup +
      ' of your answers are not in a backup yet.</b> They are saved in this browser, but ' +
      'clearing your browsing data would remove them. A backup file keeps them safe.' +
      '<div class="acts"></div></div>';
    var save = el('button', 'btn-primary', icon('download') + 'Save a backup file');
    save.onclick = function () { TutorLog.backup().then(function () { n.remove(); }); };
    var later = el('button', 'btn-plain', 'Not now');
    later.onclick = function () {
      try { sessionStorage.setItem('tutor-nudge-off', '1'); } catch (e) {}
      n.remove();
    };
    n.querySelector('.acts').appendChild(save);
    n.querySelector('.acts').appendChild(later);
    host.insertBefore(n, host.children[1] || null);
  });
}

/* ================================================== My Performance
   The Shiny app's analytics, rebuilt: the same four blocks (overall, by
   question type, by section with each attempt's steps, every answer). A
   new attempt starts after a solve or on a new visit (see attempts()).
   The difference is the scope: the Shiny app shows only the
   current visit, because each visit gets a new user id; this shows all of
   it, with "This visit" as a switch. */
var perfScope = 'all';
function parseAttempt(e) {
  var ok = /correct=True/.test(e.details), q = '', a = '';
  if (e.action === 'option_selected') {
    var m = /^Q: ([\s\S]*?) \| A: ([\s\S]*?)(?: \| correct=(?:True|False))?$/.exec(e.details);
    if (m) { q = m[1]; a = m[2]; } else a = e.details;
  } else {
    var m2 = /^answer=([\s\S]*?)(?:, correct=(?:True|False))?$/.exec(e.details);
    a = m2 ? m2[1] : e.details;
    q = 'Final numerical answer';
  }
  return { ok: ok, q: q, a: a };
}
function attempts(list) {
  /* A new attempt starts after the question was solved (taking it again)
     or on a new visit. The Shiny app's rule (step 1 after progress, or an
     answer after an answer) split the try-first flow, where a wrong answer
     is followed by the steps and another answer, into several attempts. */
  var groups = {}, order = [];
  list.forEach(function (e) {
    var k = e.section + '|' + e.question_number;
    if (!groups[k]) { groups[k] = []; order.push(k); }
    groups[k].push(e);
  });
  order.forEach(function (k) {
    var att = 1, solvedYet = false, sess = null;
    groups[k].forEach(function (e) {
      if (solvedYet || (sess !== null && e.session_id !== sess)) { att += 1; solvedYet = false; }
      sess = e.session_id;
      e._att = att;
      if (e.action === 'answer_submitted' && /correct=True/.test(e.details)) solvedYet = true;
    });
  });
}
function secColor(name) {
  var s = DATA.sections.filter(function (x) { return x.name === name; })[0];
  return s ? s.color[0] : '#6c757d';
}
function score(ok, bad, pct) {
  return '<span class="score"><span class="g">' + ok + ' ✓</span> / <span class="r">' + bad +
         ' ✗</span>' + (pct != null ? ' <span style="margin-left:8px">(' + pct + '%)</span>' : '') + '</span>';
}
function pct(a, b) { return b ? Math.round(a / b * 1000) / 10 : 0; }

function attemptBlock(label, rows, color) {
  var d = el('details', 'grp att');
  d.style.setProperty('--c', color);
  var badges = rows.map(function (r) {
    var x = r._p;
    var t = r.action === 'answer_submitted' ? (x.ok ? 'T' : 'F') : String(parseInt(r.step, 10));
    return '<span class="badge ' + (x.ok ? 't' : 'f') + '">' + t + '</span>';
  }).join(' ');
  var ok = rows.filter(function (r) { return r._p.ok; }).length;
  d.innerHTML = '<summary><span class="name">' + esc(label) + ' ' + badges + '</span>' +
                '<span style="font-size:12px;color:#666;white-space:nowrap">' + ok + ' ✓ / ' +
                (rows.length - ok) + ' ✗</span></summary>';
  var inner = el('div', 'inner');
  d.addEventListener('toggle', function () {
    if (!d.open || inner.childElementCount) return;
    rows.forEach(function (r) {
      var x = r._p, c = x.ok ? '#28a745' : '#dc3545';
      var s = el('div', 'stepd');
      s.style.setProperty('--c', c);
      var head = r.action === 'answer_submitted' ? 'Final Answer' : 'Step ' + parseInt(r.step, 10);
      s.appendChild(el('div', 'h', head + ' <span style="margin-left:8px">' + (x.ok ? '✓' : '✗') + '</span>'));
      if (x.q) { var q = el('div', 'q', '<strong>Question:</strong> '); q.appendChild(mdInline(x.q)); s.appendChild(q); }
      var a = el('div', '', '<strong>Answer:</strong> '); a.appendChild(mdInline(x.a)); s.appendChild(a);
      inner.appendChild(s);
    });
  });
  d.appendChild(inner);
  return d;
}
function mdInline(t) {
  var s = el('span', 'md-inline');
  s.innerHTML = splitMath(String(t).replace(/\$\$/g, '$')).map(function (p) {
    if (p.text != null) return esc(p.text);
    try { return window.katex ? katex.renderToString(p.math, { throwOnError: false }) : esc(p.math); }
    catch (e) { return esc(p.math); }
  }).join('');
  return s;
}

function showPerformance() {
  setActive('perf');
  document.title = 'My Performance · Biomechanics Tutor';
  view.innerHTML = '';
  var top = el('div', 'perf-top');
  top.appendChild(el('h2', '', 'My Performance'));
  var seg = el('div', 'seg');
  [['all', 'All my history'], ['visit', 'This visit']].forEach(function (x) {
    var b = el('button', x[0] === perfScope ? 'on' : '', x[1]);
    b.onclick = function () { perfScope = x[0]; showPerformance(); };
    seg.appendChild(b);
  });
  top.appendChild(seg);
  view.appendChild(top);
  backupNudge(view);

  var sess = TutorLog.session();
  var all = TutorLog.all().filter(function (e) {
    return (e.action === 'option_selected' || e.action === 'answer_submitted') &&
           (perfScope === 'all' || e.session_id === sess);
  });
  if (!all.length) {
    var c0 = el('div', 'card empty');
    c0.innerHTML = '<h3>No Performance Data Yet</h3><p>Complete some questions to see your ' +
      'performance analytics!</p>' + (perfScope === 'visit' && TutorLog.all().length ?
      '<p>Switch to <b>All my history</b> to see earlier visits.</p>' : '');
    view.appendChild(c0);
    return;
  }
  all.forEach(function (e) {
    e._p = parseAttempt(e);
    var t = DATA.typeOf[e.section + '|' + e.question_number + '|' + parseInt(e.step, 10)];
    e._type = e.action === 'answer_submitted' && !t ? 'Final Answer' : (t ? t.type || 'Unknown' : 'Unknown');
    e._qtext = t ? t.text : '';
  });
  attempts(all);
  var okN = all.filter(function (e) { return e._p.ok; }).length;

  /* overall */
  var c1 = el('div', 'card');
  c1.appendChild(el('h3', '', 'Overall Statistics'));
  var stats = el('div', 'stats');
  stats.innerHTML = '<div class="stat"><b>' + pct(okN, all.length) + '%</b><span>Success Rate</span></div>' +
    '<div class="stat good"><b>' + okN + '</b><span>✓ Correct</span></div>' +
    '<div class="stat badb"><b>' + (all.length - okN) + '</b><span>✗ Incorrect</span></div>';
  c1.appendChild(stats);
  view.appendChild(c1);

  /* progress through the ready sections */
  var solved = {};
  all.forEach(function (e) {
    if (e.action === 'answer_submitted' && e._p.ok) solved[e.section + '|' + e.question_number] = 1;
  });
  var cp = el('div', 'card');
  cp.appendChild(el('h3', '', 'Questions Solved'));
  var pl = el('div', 'progress-list');
  DATA.sections.forEach(function (s) {
    var n = s.problems.filter(function (p) { return solved[s.name + '|' + p.number]; }).length;
    var tried = all.some(function (e) { return e.section === s.name; });
    if (!s.ready && !tried) return;
    var d = el('div', 'prog');
    d.style.setProperty('--c', s.color[0]);
    d.innerHTML = '<b>' + esc(s.name) + '</b>' + n + ' of ' + s.problems.length +
      ' questions<div class="bar"><i style="width:' + pct(n, s.problems.length) + '%"></i></div>';
    pl.appendChild(d);
  });
  cp.appendChild(pl);
  view.appendChild(cp);

  /* by question type */
  var types = {};
  all.forEach(function (e) { (types[e._type] = types[e._type] || []).push(e); });
  var tlist = Object.keys(types).map(function (k) {
    var ok = types[k].filter(function (e) { return e._p.ok; }).length;
    return { k: k, rows: types[k], ok: ok, pct: pct(ok, types[k].length) };
  }).sort(function (a, b) { return b.pct - a.pct; });
  var c2 = el('div', 'card');
  c2.appendChild(el('h3', '', 'Performance by Question Type'));
  tlist.forEach(function (t) {
    var color = TYPE_COLORS[t.k] || '#6c757d';
    var d = el('details', 'grp');
    d.innerHTML = '<summary><span class="name"><span class="dot" style="background:' + color + '"></span>' +
      esc(t.k) + '</span>' + score(t.ok, t.rows.length - t.ok, t.pct) + '</summary>';
    var inner = el('div', 'inner');
    d.addEventListener('toggle', function () {
      if (!d.open || inner.childElementCount) return;
      groupAttempts(t.rows).forEach(function (g) {
        inner.appendChild(attemptBlock(g.section + ' - Q' + g.q + ' - Attempt ' + g.att, g.rows, color));
      });
    });
    d.appendChild(inner);
    c2.appendChild(d);
  });
  view.appendChild(c2);

  /* by section */
  var c3 = el('div', 'card');
  c3.appendChild(el('h3', '', 'Performance by Section'));
  var secs = {};
  all.forEach(function (e) { (secs[e.section] = secs[e.section] || []).push(e); });
  Object.keys(secs).forEach(function (name) {
    var rows = secs[name], ok = rows.filter(function (e) { return e._p.ok; }).length;
    var color = secColor(name);
    var d = el('details', 'grp');
    d.innerHTML = '<summary><span class="name"><span class="dot" style="background:' + color + '"></span>' +
      esc(name) + '</span>' + score(ok, rows.length - ok, pct(ok, rows.length)) + '</summary>';
    var inner = el('div', 'inner');
    d.addEventListener('toggle', function () {
      if (!d.open || inner.childElementCount) return;
      groupAttempts(rows).forEach(function (g) {
        inner.appendChild(attemptBlock('Q' + g.q + ' - Attempt ' + g.att, g.rows, color));
      });
    });
    d.appendChild(inner);
    c3.appendChild(d);
  });
  view.appendChild(c3);

  /* every answer, newest first */
  var c4 = el('div', 'card');
  c4.appendChild(el('h3', '', 'Detailed Results'));
  var listHost = el('div');
  c4.appendChild(listHost);
  var rev = all.slice().reverse(), shown = 0;
  var more = el('button', 'btn-plain more', 'Show more');
  function page() {
    rev.slice(shown, shown + 40).forEach(function (e) {
      var x = e._p, r = el('div', 'row-res ' + (x.ok ? 't' : 'f'));
      var b = el('div', 'body');
      var stepLabel = e.action === 'option_selected' ? 'Step ' + parseInt(e.step, 10) : 'Final Answer';
      var tc = TYPE_COLORS[e._type] || '#6c757d';
      b.appendChild(el('div', 'meta', '<strong>' + esc(e.section) + '</strong><span style="color:#555">Q' +
        esc(e.question_number) + ' • ' + stepLabel + '</span><span class="type-pill" style="background:' + tc +
        '">' + esc(e._type) + '</span><span class="when">' + esc(String(e.timestamp).replace('T', ' ').slice(0, 16)) + '</span>'));
      if (e._qtext) { var q = el('div', 'qt'); q.appendChild(mdInline(e._qtext)); b.appendChild(q); }
      var a = el('div', 'ans', '<strong style="font-size:.9em;color:#555">Your Answer:</strong> ');
      a.appendChild(mdInline(x.a));
      b.appendChild(a);
      r.appendChild(b);
      r.appendChild(el('div', 'res', '<div style="font-size:20px">' + (x.ok ? '✓' : '✗') + '</div>' +
        (x.ok ? 'Correct' : 'Incorrect')));
      listHost.appendChild(r);
    });
    shown += 40;
    more.style.display = shown < rev.length ? '' : 'none';
    more.textContent = 'Show more (' + (rev.length - shown) + ' left)';
  }
  more.onclick = page;
  page();
  c4.appendChild(more);
  view.appendChild(c4);
}
function groupAttempts(rows) {
  var out = [], idx = {};
  rows.forEach(function (e) {
    var k = e.section + '|' + e.question_number + '|' + e._att;
    if (!idx[k]) { idx[k] = { section: e.section, q: e.question_number, att: e._att, rows: [] }; out.push(idx[k]); }
    idx[k].rows.push(e);
  });
  out.sort(function (a, b) {
    return a.section === b.section ? (parseFloat(a.q) - parseFloat(b.q) || a.att - b.att) : 0;
  });
  return out;
}

/* ======================================= Your account (was Your history) */
var moreOpen = false;
function showHistory() {
  setActive('hist');
  document.title = 'Your account · Biomechanics Tutor';
  view.innerHTML = '<div class="loading">Checking…</div>';
  TutorLog.status().then(function (s) {
    view.innerHTML = '';
    var top = el('div', 'perf-top');
    top.appendChild(el('h2', '', 'Your account'));
    view.appendChild(top);
    var online = window.TutorSync && !TutorSync.off();
    var user = window.TutorSync && TutorSync.user();

    /* 1. the account: the way to pick up on another device */
    if (window.TutorSync) accountCard(view);

    /* 2. where the answers are */
    var c = el('div', 'card');
    c.appendChild(el('h3', '', 'Where your answers are kept'));
    var first = TutorLog.all()[0];
    c.appendChild(el('p', '', '<b>' + s.count + '</b> recorded actions' +
      (first ? ' since ' + esc(String(first.timestamp).slice(0, 10)) : '') +
      (online ? ', in this browser and, without your name, in the course’s online store.' :
       ', in this browser only. Nothing is sent anywhere.')));
    var ul = el('ul', 'checks');
    function item(st, title, note) {
      var li = el('li');
      li.innerHTML = '<span class="st ' + st + '">' + (st === 'y' ? '✓' : st === 'n' ? '✗' : '?') +
        '</span><div><b>' + title + '</b><small>' + note + '</small></div>';
      ul.appendChild(li);
      return li;
    }
    item(s.indexedDB ? 'y' : 'n', 'Saved in this browser',
      s.indexedDB ? 'Your answers are there next time you open the Tutor here.' :
      'This browser would not open its database (a private window does this).');
    if (window.TutorSync) {
      var ss = TutorSync.state();
      item(online && !ss.waiting && ss.lastOk ? 'y' : online ? 'u' : 'n', 'Saved online',
        !online ? 'Turned off, so clearing this browser would lose them. Turn it on above.' :
        ss.waiting ? syncStatus(ss) :
        user ? 'Everything is in your account, <b>' + esc(user) + '</b>.' :
        'Everything is online under this browser’s private code. Make an account above to use it on another device.');
    }
    if (!online) {
      var pli = item(s.persisted === true ? 'y' : 'u', 'Protected from automatic clean-up',
        s.persisted === true ? 'The browser has agreed not to remove this site’s data to free space.' :
        'Browsers can remove a site’s saved data when space runs low, and Safari can remove it after seven ' +
        'days of browsing without a visit. Adding the Tutor to your Home Screen avoids that on iPhone and iPad.');
      if (s.persisted !== true && navigator.storage && navigator.storage.persist) {
        var ask = el('button', 'btn-plain', icon('lock') + 'Ask the browser to protect it');
        ask.style.marginTop = '6px';
        ask.onclick = function () { TutorLog.askPersist(true).then(showHistory); };
        pli.querySelector('div').appendChild(ask);
      }
      item(s.lastBackup && s.sinceBackup <= 0 ? 'y' : s.lastBackup ? 'u' : 'n', 'A backup file',
        s.lastBackup ? 'Last saved ' + esc(new Date(s.lastBackup).toLocaleString()) + '. ' +
          (s.sinceBackup > 0 ? s.sinceBackup + ' actions since then are not in it.' : 'Everything is in it.') :
        'None yet. With the online copy off, a backup file (below) is the only copy that survives ' +
        'clearing your browsing data, a new browser or a new device.');
    }
    c.appendChild(ul);
    view.appendChild(c);

    if (s.legacyCount) {
      view.appendChild(el('div', 'notice', icon('history') + '<div class="grow">' + s.legacyCount +
        ' earlier actions were brought in from the Shiny version of the Tutor on this device.</div>'));
    }

    /* 3. everything else, folded away while the online copy is on */
    var more = el('details', 'more-ways');
    more.open = !online || moreOpen;          /* stays open while it is being used */
    more.addEventListener('toggle', function () { moreOpen = more.open; });
    more.innerHTML = '<summary>Other ways to keep a copy</summary>';
    var box = el('div', 'more-body');
    more.appendChild(box);
    view.appendChild(more);
    if (online && !user) codeCard(box);

    var c2 = el('div', 'card');
    c2.appendChild(el('h3', '', 'A backup file'));
    c2.appendChild(el('p', '', 'Save your history as a small CSV file, and restore it here or on another ' +
      'device. Restoring the same file twice does not count anything twice, and a session file from the ' +
      'older Shiny version of the Tutor can be restored too.'));
    var acts = el('div', 'acts-row');
    var b1 = el('button', online ? 'btn-plain' : 'btn-primary', icon('device-floppy') + 'Save a backup file');
    b1.onclick = function () { TutorLog.backup().then(showHistory); };
    var file = el('input'); file.type = 'file'; file.accept = '.csv,text/csv'; file.hidden = true;
    var b2 = el('button', 'btn-plain', icon('upload') + 'Restore from a file');
    b2.onclick = function () { file.click(); };
    var msg = el('div', '');
    file.onchange = function () {
      if (!file.files[0]) return;
      TutorLog.restore(file.files[0]).then(function (r) {
        if (window.TutorFolder && TutorFolder.state().on) TutorFolder.write();
        if (window.TutorSync) TutorSync.push();
        msg.innerHTML = '<div class="feedback success" style="margin-top:12px">' + icon('circle-check') +
          '<div>Read ' + r.read + ' actions; ' + r.added + ' were new and are now in your history.</div></div>';
        setTimeout(showHistory, 2500);
      }, function (e) {
        msg.innerHTML = '<div class="feedback error" style="margin-top:12px">' + icon('alert-circle') +
          '<div>' + esc(e.message) + '</div></div>';
      });
      file.value = '';
    };
    acts.appendChild(b1); acts.appendChild(b2); acts.appendChild(file);
    c2.appendChild(acts); c2.appendChild(msg);
    box.appendChild(c2);
    if (window.TutorFolder) folderCard(box);

    var c3 = el('div', 'card');
    c3.appendChild(el('h3', '', 'Start again'));
    c3.appendChild(el('p', '', 'This removes your history from this browser. ' +
      (user ? 'It stays in your account. ' : '') + 'A backup file you have saved, and the copy in your folder, ' +
      'are not affected.'));
    var del = el('button', 'btn-plain danger', icon('trash') + 'Erase my history on this device');
    del.onclick = function () {
      if (!confirm('Erase all ' + s.count + ' recorded actions from this browser? This cannot be undone ' +
                   (user ? '(they stay in your account).' : 'unless they are online or in a backup file.'))) return;
      TutorLog.eraseAll().then(showHistory);
    };
    c3.appendChild(del);
    box.appendChild(c3);
  });
}

function syncStatus(ss) {
  return ss.waiting ? (ss.offline ? ss.waiting + ' answers waiting for a connection.' :
    ss.error ? ss.waiting + ' answers not sent yet; the Tutor keeps trying (' + esc(ss.error) + ').' :
    ss.waiting + ' answers being sent…') :
    ss.lastOk ? 'Everything is saved online (last ' + esc(new Date(ss.lastOk).toLocaleString()) + ').' : 'Nothing to send yet.';
}
function say2(slot, kind, html) {
  slot.innerHTML = kind ? '<div class="feedback ' + kind + '" style="margin-top:12px">' +
    icon(kind === 'success' ? 'circle-check' : 'alert-circle') + '<div>' + html + '</div></div>' : '';
}
function netMsg(e) {
  return esc(/fetch|network|load failed/i.test(e.message) ? 'Could not reach the online store. Are you online?' : e.message);
}

/* a recovery code, shown once: it is the way back from a forgotten password */
function showRecovery(card, user, code, intro) {
  card.innerHTML = '';
  card.appendChild(el('h3', '', icon('lock') + ' Save your recovery code'));
  card.appendChild(el('p', '', (intro ? intro + ' ' : '') + 'If you ever forget your password, this code lets you set a new ' +
    'one yourself. <b>It is shown only this once</b>, so save it now: copy it into your notes, or save it as a file.'));
  var box = el('div', 'sync-code');
  box.innerHTML = '<small>Recovery code for ' + esc(user) + '</small><b id="rc-code">' + esc(code) + '</b>';
  var cp = el('button', 'btn-plain', 'Copy');
  cp.onclick = function () { try { navigator.clipboard.writeText(code); cp.textContent = 'Copied'; } catch (e) {} };
  var dl = el('button', 'btn-plain', icon('download') + 'Save as a file');
  dl.onclick = function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['Biomechanics Tutor (EPHE 341)\r\nUsername: ' + user + '\r\nRecovery code: ' + code +
      '\r\n\r\nForgot your password? Open Your account (the person icon, top right), choose "Forgot your password?" and enter this code.\r\n'], { type: 'text/plain' }));
    a.download = 'biomech-tutor-recovery-' + user + '.txt';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  box.appendChild(cp); box.appendChild(dl);
  card.appendChild(box);
  var okb = el('button', 'btn-primary', 'I’ve saved it');
  okb.style.marginTop = '10px';
  okb.onclick = function () { showHistory(); };
  card.appendChild(okb);
  card.scrollIntoView({ block: 'start' });
}

/* the account (sync.js + supabase-accounts.sql): optional, no email */
function accountCard(host) {
  var on = !TutorSync.off(), ss = TutorSync.state(), user = TutorSync.user();
  var c = el('div', 'card acct'); c.id = 'account';
  var msg = el('div', '');
  if (!on) {
    c.appendChild(el('h3', '', icon('cloud-off') + ' The online copy is off'));
    c.appendChild(el('p', '', 'Your answers stay in this browser only, so clearing it, or another device, ' +
      'starts from nothing. Turn it back on to save them online, without your name.'));
    var onb = el('button', 'btn-primary', icon('refresh') + 'Turn the online copy back on');
    onb.onclick = function () { TutorSync.setOff(false); showHistory(); };
    c.appendChild(onb);
    host.appendChild(c);
    return;
  }
  if (user) {
    c.appendChild(el('h3', '', icon('circle-check') + ' Signed in as <span class="acct-name">' + esc(user) + '</span>'));
    c.appendChild(el('p', '', 'Your answers are saved online in this account, without your name. Sign in with ' +
      'the same username and password on any computer or phone to pick up where you left off.'));
    c.appendChild(el('p', 'menu-note', icon(ss.waiting ? 'cloud-off' : 'check') + ' ' + syncStatus(ss)));
    var acts = el('div', 'acts-row');
    var chg = el('button', 'btn-plain', icon('lock') + 'Change password');
    var nrc = el('button', 'btn-plain', icon('refresh') + 'New recovery code');
    var out = el('button', 'btn-plain', icon('arrow-back-up') + 'Sign out of this device');
    acts.appendChild(chg); acts.appendChild(nrc); acts.appendChild(out);
    c.appendChild(acts);
    c.appendChild(el('p', 'menu-note', 'Signing out removes your answers from this browser; they stay in your ' +
      'account. Do it on shared or lab computers.'));
    c.appendChild(msg);
    var form = el('div', 'acct-form');
    form.hidden = true;
    form.innerHTML = '<label>Current password<input type="password" id="pw-old" autocomplete="current-password"></label>' +
      '<label>New password<input type="password" id="pw-new" autocomplete="new-password" minlength="8"></label>' +
      '<label>New password again<input type="password" id="pw-new2" autocomplete="new-password"></label>';
    var save = el('button', 'btn-primary', 'Save the new password');
    form.appendChild(save);
    c.appendChild(form);
    chg.onclick = function () { form.hidden = !form.hidden; rform.hidden = true; if (!form.hidden) form.querySelector('input').focus(); };
    var rform = el('div', 'acct-form');
    rform.hidden = true;
    rform.innerHTML = '<p style="margin:0">A new recovery code replaces the old one. Enter your password to make it.</p>' +
      '<label>Password<input type="password" id="rc-pw" autocomplete="current-password"></label>';
    var mkrc = el('button', 'btn-primary', 'Make a new recovery code');
    rform.appendChild(mkrc);
    c.appendChild(rform);
    nrc.onclick = function () { rform.hidden = !rform.hidden; form.hidden = true; if (!rform.hidden) $('#rc-pw').focus(); };
    mkrc.onclick = function () {
      mkrc.disabled = true;
      TutorSync.newRecovery($('#rc-pw').value).then(function (code) { showRecovery(c, user, code); },
        function (e) { mkrc.disabled = false; say2(msg, 'error', netMsg(e)); });
    };
    save.onclick = function () {
      var o = $('#pw-old').value, n1 = $('#pw-new').value, n2 = $('#pw-new2').value;
      if (n1.length < 8) return say2(msg, 'error', 'Use a new password of at least 8 characters.');
      if (n1 !== n2) return say2(msg, 'error', 'The two new passwords are not the same.');
      save.disabled = true;
      TutorSync.changePassword(o, n1).then(function () {
        form.hidden = true; save.disabled = false;
        say2(msg, 'success', 'Password changed.');
      }, function (e) { save.disabled = false; say2(msg, 'error', netMsg(e)); });
    };
    out.onclick = function () {
      out.disabled = true;
      TutorSync.signOut(false).then(function (r) {
        if (!r.waiting) { showHistory(); return; }
        out.disabled = false;
        say2(msg, 'error', r.waiting + ' of your answers have not reached the online store yet (are you online?). ' +
          'Wait a moment and try again, or sign out anyway and lose those ' + r.waiting + '.');
        var force = el('button', 'btn-plain danger', 'Sign out anyway');
        force.style.marginTop = '8px';
        force.onclick = function () { TutorSync.signOut(true).then(showHistory); };
        msg.appendChild(force);
      });
    };
  } else {
    c.appendChild(el('h3', '', icon('history') + ' Pick up on any device'));
    c.appendChild(el('p', '', 'Make a username and password, and your answers follow you to any computer or phone. ' +
      '<b>No email needed.</b> Please make up a username rather than using your real name.'));
    var two = el('div', 'acct-two');
    var up = el('div', 'acct-form');
    up.innerHTML = '<h4>Make an account</h4>' +
      '<label>Username<input type="text" id="up-name" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="30" placeholder="e.g. bluefalcon7"></label>' +
      '<label>Password<input type="password" id="up-pw" autocomplete="new-password" placeholder="at least 8 characters"></label>' +
      '<label>Password again<input type="password" id="up-pw2" autocomplete="new-password"></label>';
    var mk = el('button', 'btn-primary', 'Make my account');
    up.appendChild(mk);
    var inn = el('div', 'acct-form');
    inn.innerHTML = '<h4>Already have one? Sign in</h4>' +
      '<label>Username<input type="text" id="in-name" autocomplete="username" autocapitalize="none" spellcheck="false"></label>' +
      '<label>Password<input type="password" id="in-pw" autocomplete="current-password"></label>';
    var sin = el('button', 'btn-primary', 'Sign in');
    inn.appendChild(sin);
    var forgot = el('button', 'link-quiet', 'Forgot your password?');
    inn.appendChild(forgot);
    var rec = el('div', 'acct-form acct-rec');
    rec.hidden = true;
    rec.innerHTML = '<h4>Set a new password with your recovery code</h4>' +
      '<label>Username<input type="text" id="rc-name" autocomplete="username" autocapitalize="none" spellcheck="false"></label>' +
      '<label>Recovery code<input type="text" id="rc-in" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="e.g. 4F2A-9C1B-77DE-03A5"></label>' +
      '<label>New password<input type="password" id="rc-new" autocomplete="new-password" placeholder="at least 8 characters"></label>' +
      '<label>New password again<input type="password" id="rc-new2" autocomplete="new-password"></label>';
    var setpw = el('button', 'btn-primary', 'Set my new password');
    rec.appendChild(setpw);
    rec.appendChild(el('p', 'menu-note', 'No recovery code? Ask your instructor to reset your password.'));
    forgot.onclick = function () {
      rec.hidden = !rec.hidden;
      if (!rec.hidden) { $('#rc-name').value = $('#in-name').value; $('#rc-in').focus(); }
    };
    setpw.onclick = function () {
      var n1 = $('#rc-new').value, n2 = $('#rc-new2').value;
      if (n1.length < 8) return say2(msg, 'error', 'Use a new password of at least 8 characters.');
      if (n1 !== n2) return say2(msg, 'error', 'The two new passwords are not the same.');
      setpw.disabled = true;
      TutorSync.recover($('#rc-name').value, $('#rc-in').value, n1).then(function (r) {
        showRecovery(c, r.username, r.recovery, 'Your password is changed and you are signed in' +
          (r.found ? ' (' + r.found + ' answers in your account)' : '') + '. Your old recovery code no longer works; here is a new one.');
      }, function (e) { setpw.disabled = false; say2(msg, 'error', netMsg(e)); });
    };
    two.appendChild(up); two.appendChild(inn);
    c.appendChild(two);
    c.appendChild(rec);
    c.appendChild(msg);
    c.appendChild(el('p', 'menu-note', 'When you make an account you get a recovery code, in case you forget your password. Until you sign in, ' +
      'your answers are saved in this browser and online under a private code (under Other ways to keep a copy).'));
    mk.onclick = function () {
      var n = $('#up-name').value.trim(), p1 = $('#up-pw').value, p2 = $('#up-pw2').value;
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(n)) return say2(msg, 'error', 'A username is 3 to 30 letters or numbers (dots, dashes and underscores are fine too).');
      if (p1.length < 8) return say2(msg, 'error', 'Use a password of at least 8 characters.');
      if (p1 !== p2) return say2(msg, 'error', 'The two passwords are not the same.');
      mk.disabled = true;
      TutorSync.signUp(n, p1).then(function (r) {
        if (r.recovery) showRecovery(c, r.username, r.recovery, 'Your account is ready, and you are signed in.');
        else showHistory();
      },
        function (e) { mk.disabled = false; say2(msg, 'error', netMsg(e)); });
    };
    sin.onclick = function () {
      sin.disabled = true;
      TutorSync.signIn($('#in-name').value, $('#in-pw').value).then(function (r) {
        say2(msg, 'success', 'Signed in as ' + esc(r.username) + '. ' + (r.found ? r.found + ' answers in your account; ' +
          r.added + ' were new on this device.' : ''));
        setTimeout(showHistory, 1800);
      }, function (e) { sin.disabled = false; say2(msg, 'error', netMsg(e)); });
    };
    c.querySelectorAll('#in-name, #in-pw').forEach(function (x) { x.onkeydown = function (e) { if (e.key === 'Enter') sin.click(); }; });
    c.querySelectorAll('#up-pw2').forEach(function (x) { x.onkeydown = function (e) { if (e.key === 'Enter') mk.click(); }; });
  }
  host.appendChild(c);
}

/* on the main page, once a student has used the Tutor a little: suggest an
   account (until they make one, or say not now) */
function accountNudge(host) {
  if (!window.TutorSync || TutorSync.off() || TutorSync.user()) return;
  if (TutorLog.all().length < 5) return;
  try { if (localStorage.getItem('biomech-tutor-account-nudge-off')) return; } catch (e) {}
  var n = el('div', 'notice acct-nudge');
  n.innerHTML = icon('history') + '<div class="grow"><b>Pick up on any device.</b> Make a username and password ' +
    '(no email needed) and your answers follow you to any computer or phone.<div class="acts"></div></div>';
  var go = el('a', 'btn-primary', 'Make an account');
  go.href = '#/account';
  var later = el('button', 'btn-plain', 'Not now');
  later.onclick = function () {
    try { localStorage.setItem('biomech-tutor-account-nudge-off', '1'); } catch (e) {}
    n.remove();
  };
  n.querySelector('.acts').appendChild(go); n.querySelector('.acts').appendChild(later);
  host.insertBefore(n, host.querySelector('.m-grid') || null);
}

/* the private sync code: for students without an account */
function codeCard(host) {
  var c = el('div', 'card');
  c.appendChild(el('h3', '', icon('refresh') + ' Your sync code'));
  c.appendChild(el('p', '', 'Without an account, this browser’s answers are saved online under a private code. ' +
    'Type it on another device to bring them there (an account does the same, more easily).'));
  var box = el('div', 'sync-code');
  box.innerHTML = '<small>Your sync code</small><b>' + esc(TutorSync.code()) + '</b>';
  var cp = el('button', 'btn-plain', 'Copy');
  cp.onclick = function () {
    try { navigator.clipboard.writeText(TutorSync.code()); cp.textContent = 'Copied'; } catch (e) {}
  };
  box.appendChild(cp);
  c.appendChild(box);
  var row = el('div', 'a-row');
  var inp = el('input'); inp.type = 'text'; inp.placeholder = 'A code from another device'; inp.id = 'sync-in';
  inp.autocomplete = 'off'; inp.autocapitalize = 'none'; inp.spellcheck = false;
  var go = el('button', 'btn-primary', icon('download') + 'Bring my history here');
  row.appendChild(inp); row.appendChild(go);
  c.appendChild(row);
  var msg = el('div', '');
  c.appendChild(msg);
  go.onclick = function () {
    go.disabled = true;
    TutorSync.useCode(inp.value).then(function (r) {
      say2(msg, 'success', 'Found ' + r.found + ' answers; ' + r.added + ' were new here. This device now uses that code.');
      setTimeout(showHistory, 2500);
    }, function (e) { go.disabled = false; say2(msg, 'error', netMsg(e)); });
  };
  var offb = el('button', 'link-quiet', 'Stop sending my answers online');
  offb.onclick = function () { TutorSync.setOff(true); showHistory(); };
  c.appendChild(offb);
  host.appendChild(c);
}

/* the copy in a folder on this computer (folder.js) */
function folderCard(host) {
  var fs = TutorFolder.state();
  var c = el('div', 'card');
  c.appendChild(el('h3', '', icon('folder') + ' A copy in a folder on this computer'));
  if (!fs.supported) {
    c.appendChild(el('p', '', 'This browser cannot save into a folder; Chrome and Edge on a laptop or ' +
      'desktop can. Here, use <b>Save a backup file</b> above to keep a copy.'));
    host.appendChild(c); return;
  }
  var msg = el('div', '');
  var acts = el('div', 'acts-row');
  function done(r) {
    if (r === null) { msg.innerHTML = '<div class="feedback error" style="margin-top:12px">' + icon('alert-circle') +
      '<div>Not allowed, so this visit is saved in the browser only.</div></div>'; return; }
    showHistory();
  }
  function oops(e) {
    if (e && e.name === 'AbortError') return;
    msg.innerHTML = '<div class="feedback error" style="margin-top:12px">' + icon('alert-circle') +
      '<div>' + esc(e && e.message || e) + '</div></div>';
  }
  if (!fs.chosen) {
    c.appendChild(el('p', '', 'Choose your Documents folder (or any folder you like). The Tutor makes a ' +
      '<b>Biomechanics Tutor</b> folder inside it and keeps <b>' + esc(fs.file) + '</b> there, updated after ' +
      'every answer. It is the same file as a backup, so your history survives clearing the browser. ' +
      'The Tutor asks before using the folder each time you visit.'));
    var b = el('button', 'btn-primary', icon('folder') + 'Choose a folder');
    b.onclick = function () { TutorFolder.choose().then(done, oops); };
    acts.appendChild(b);
  } else {
    c.appendChild(el('p', '', '<b>' + esc(fs.where) + ' / ' + esc(fs.file) + '</b><br>' +
      (fs.on ? 'In use this visit' + (fs.lastWrite ? ', last saved ' + esc(fs.lastWrite.toLocaleTimeString()) : '') + '.' :
       'Not in use this visit: the Tutor asks before using it each time.') +
      (fs.error ? '<br><span style="color:var(--bad)">' + esc(fs.error) + '</span>' : '')));
    if (!fs.on) {
      var a = el('button', 'btn-primary', icon('check') + 'Allow for this visit');
      a.onclick = function () { TutorFolder.allow().then(done, oops); };
      acts.appendChild(a);
    }
    var ch = el('button', 'btn-plain', icon('folder') + 'Choose a different folder');
    ch.onclick = function () { TutorFolder.choose().then(done, oops); };
    var fg = el('button', 'btn-plain', icon('x') + 'Stop using this folder');
    fg.onclick = function () { TutorFolder.forget().then(showHistory); };
    acts.appendChild(ch); acts.appendChild(fg);
    c.appendChild(el('p', 'menu-note', 'Stopping only makes the Tutor forget the folder; the file stays where it is.'));
  }
  c.appendChild(acts); c.appendChild(msg);
  host.appendChild(c);
}

/* ================================================================ routing */
function route() {
  if (!DATA) return;
  var h = decodeURIComponent((location.hash || '#/').slice(1));
  var m;
  window.scrollTo(0, 0);
  $('.head-btns').classList.remove('show');
  if ((m = /^\/s\/([^/]+)(?:\/(.+))?$/.exec(h))) {
    var sec = DATA.bySlug[m[1]];
    if (!sec) { location.hash = '#/'; return; }
    if (!m[2]) TutorLog.record(sec.name, '', '', 'section_selected', sec.name);
    showSection(sec, m[2] || sec.problems[0].number);
  } else if (h === '/performance') showPerformance();
  else if (h === '/account' || h === '/history') showHistory();
  else if ((m = /^\/instructor(?:\/([^/]+)(?:\/(.+))?)?$/.exec(h)) && window.showInstructor) showInstructor(m[1], m[2]);
  else showMenu();
}

function footerStatus() {
  TutorLog.status().then(function (s) {
    var f = $('#saved-note');
    var fs = window.TutorFolder ? TutorFolder.state() : {};
    var ss = window.TutorSync && !TutorSync.off() ? TutorSync.state() : null;
    /* while answers go online, backups are beside the point: say what matters */
    if (f) f.innerHTML = icon('database') + s.count + (s.count === 1 ? ' answer saved' : ' answers saved') +
      (ss ? (ss.waiting ? ' · ' + icon('cloud-off') + ss.waiting + ' waiting to sync' :
             ss.lastOk ? ' · ' + icon('check') + 'synced' + (TutorSync.user() ? ' as ' + esc(TutorSync.user()) : '') : '') :
        ' on this device' + (s.sinceBackup > 0 && s.lastBackup ? ' · ' + s.sinceBackup + ' since your backup' : '')) +
      (fs.on ? ' · ' + icon('folder') + 'and in your folder' : '');
    var pn = $('.profile .pname');
    if (pn) pn.textContent = window.TutorSync && TutorSync.user() ? TutorSync.user() : 'Sign in';
  });
}

function loadScript(src) {
  return new Promise(function (ok, bad) {
    var t = document.createElement('script');
    t.src = src;
    t.onload = function () { window.TUTOR_QUESTIONS ? ok() : bad(new Error('questions.js is empty')); };
    t.onerror = function () { bad(new Error('questions.js is missing')); };
    document.head.appendChild(t);
  });
}
function askForCSV(err) {
  return new Promise(function (resolve) {
    var local = location.protocol === 'file:';
    var c = el('div', 'card');
    c.innerHTML = '<h3>The questions could not be loaded</h3><p>' +
      (local ? 'The copy of the questions in this folder (questions.js) is missing. ' +
       'Double-click <b>Update questions.command</b> in the <b>web</b> folder to make it, ' +
       'or choose the questions file below for this visit.' :
       esc(err && err.message) + '. If you are offline, open the Tutor once while online so ' +
       'it can keep a copy, or choose the questions file below.') + '</p>';
    var row = el('div', 'acts-row');
    var f = el('input'); f.type = 'file'; f.accept = '.csv,text/csv'; f.hidden = true;
    var b = el('button', 'btn-primary', icon('upload') + 'Choose Master_questions.csv');
    b.onclick = function () { f.click(); };
    f.onchange = function () {
      if (f.files[0]) f.files[0].arrayBuffer().then(function (x) { view.innerHTML = ''; resolve(x); });
    };
    row.appendChild(b); row.appendChild(f);
    c.appendChild(row);
    view.innerHTML = '';
    view.appendChild(c);
    /* dropping the file anywhere on the page works too */
    document.addEventListener('dragover', function (e) { e.preventDefault(); });
    document.addEventListener('drop', function (e) {
      e.preventDefault();
      var file = e.dataTransfer && e.dataTransfer.files[0];
      if (file) file.arrayBuffer().then(function (x) { view.innerHTML = ''; resolve(x); });
    }, { once: true });
  });
}

async function start() {
  $('.hamburger').onclick = function (e) { e.stopPropagation(); $('.head-btns').classList.toggle('show'); };
  document.addEventListener('click', function (e) {
    var hb = $('.head-btns');
    if (hb.classList.contains('show') && !hb.contains(e.target)) hb.classList.remove('show');
  });
  /* The CSV itself when the page is served (the published site, always
     current). Opened straight from the folder, browsers will not let the
     page read it, so then use the copy in questions.js. */
  var text = null, bundled = null;
  if (location.protocol !== 'file:') {
    try {
      var r = await fetch(CSV_URL, { cache: 'no-cache' });
      if (!r.ok) throw new Error('the server answered ' + r.status);
      text = decode(await r.arrayBuffer());
    } catch (e) { text = null; }
  }
  if (text === null) {
    try {
      await loadScript('questions.js?v=' + Date.now());
      text = window.TUTOR_QUESTIONS.csv;
      bundled = window.TUTOR_QUESTIONS.saved;
    } catch (e) {
      text = decode(await askForCSV(e));
    }
  }
  DATA = buildModel(TutorLog.rowsToObjects(TutorLog.parseCSV(text)));
  DATA.bundled = location.protocol === 'file:' ? bundled : null;
  await TutorLog.ready;
  TutorLog.onChange(footerStatus);
  footerStatus();
  if (window.TutorFolder) {
    window.TutorIcon = icon;
    TutorFolder.onChange(footerStatus);
  }
  if (window.TutorSync) TutorSync.onChange(footerStatus);
  window.TutorApp = { el: el, esc: esc, icon: icon, md: md, renderMD: renderMD, pillOf: pillOf, view: view,
                      figure: figure, isImage: isImage, whyOf: whyOf,
                      setActive: setActive, data: function () { return DATA; } };
  if (window.TutorFolder) {
    TutorFolder.ready.then(function () { setTimeout(TutorFolder.ask, 900); });
  }
  window.addEventListener('hashchange', route);
  route();
  window.TutorData = DATA;          /* for the self-test */
}

/* keep the figures for the switched-on sections, so they work offline */
/* keep a section's figures once it has been opened, so it works offline
   (fetching every section's figures up front would be 14 MB on a phone) */
var warmed = {};
function warmCache(sec) {
  if (!('caches' in window) || !navigator.serviceWorker || warmed[sec.name]) return;
  warmed[sec.name] = 1;
  var urls = {};
  [sec].forEach(function (s) {
    s.problems.forEach(function (p) {
      if (p.image) urls[imgSrc(p.image)] = 1;
      p.steps.forEach(function (st) {
        st.options.forEach(function (o) { if (isImage(o.text)) urls[imgSrc(String(o.text).trim())] = 1; });
      });
    });
  });
  var list = Object.keys(urls);
  var go = function () {
    caches.open('tutor-figures').then(function (c) {
      list.forEach(function (u) {
        c.match(u).then(function (hit) { if (!hit) c.add(u).catch(function () {}); });
      });
    });
  };
  setTimeout(go, 1500);
}

start();
})();
