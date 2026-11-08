/* ======================================================================
   Biomechanics Tutor: a scientific calculator in a panel that slides in
   from the right (Marc, 30 Oct: "a calculator that opens from the right side
   from a little tab on the side ... the options of a scientific calculator").

   - Type or tap an expression; Enter (or =) works it out. The expression is
     read by a small parser here (no eval), so anything odd is simply refused.
   - + − × ÷ ^ ( ), x², √, 1/x, ±, EE (×10^n), π, e, Ans, n!
     sin cos tan and their inverses (DEG or RAD), ln, log, eˣ, 10ˣ, |x|.
   - "2π", "3(4+1)", "2sin(30)" multiply as written.
   - Recent results are listed; tap one to reuse it. "Use as my answer" puts
     the result into the question's answer box.
   ====================================================================== */
(function () {
'use strict';

/* ------------------------------------------------------------ the parser */
var FUNCS = {
  sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1,
  sqrt: 1, cbrt: 1, ln: 1, log: 1, exp: 1, abs: 1
};
function tokenize(s) {
  var t = [], i = 0, m;
  s = String(s).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi')
               .replace(/√/g, 'sqrt').replace(/\*\*/g, '^').replace(/sin⁻¹/g, 'asin')
               .replace(/cos⁻¹/g, 'acos').replace(/tan⁻¹/g, 'atan').replace(/²/g, '^2').replace(/³/g, '^3');
  while (i < s.length) {
    var c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if ((m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i)))) {
      t.push({ k: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue;
    }
    if ((m = /^[a-z]+/i.exec(s.slice(i)))) {
      var w = m[0].toLowerCase();
      /* split run-together names: "pie" -> pi e, "2sinpi" etc. */
      var parts = [], rest = w;
      while (rest) {
        var hit = ['asin', 'acos', 'atan', 'sqrt', 'cbrt', 'sin', 'cos', 'tan', 'exp', 'abs', 'log', 'ln', 'ans', 'pi', 'e']
          .filter(function (n) { return rest.indexOf(n) === 0; })[0];
        if (!hit) throw new Error('Unknown name: ' + rest);
        parts.push(hit); rest = rest.slice(hit.length);
      }
      parts.forEach(function (n) { t.push(FUNCS[n] ? { k: 'fn', v: n } : { k: 'const', v: n }); });
      i += m[0].length; continue;
    }
    if ('+-*/^()!,'.indexOf(c) >= 0) { t.push({ k: 'op', v: c }); i++; continue; }
    throw new Error('Unexpected “' + c + '”');
  }
  /* implicit multiplication: 2pi, 3(4), (1)(2), 2sin(30), pi e */
  var out = [];
  t.forEach(function (x, k) {
    var p = out[out.length - 1];
    var endsValue = p && (p.k === 'num' || p.k === 'const' || (p.k === 'op' && (p.v === ')' || p.v === '!')));
    var startsValue = x.k === 'num' || x.k === 'const' || x.k === 'fn' || (x.k === 'op' && x.v === '(');
    if (endsValue && startsValue) out.push({ k: 'op', v: '*' });
    out.push(x);
  });
  return out;
}
function evaluate(text, opts) {
  opts = opts || {};
  var deg = opts.deg !== false, ans = opts.ans || 0;
  var t = tokenize(text), i = 0;          /* (not "expr": the function below would shadow it) */
  if (!t.length) throw new Error('Nothing to work out');
  function peek() { return t[i]; }
  function eat(v) { if (t[i] && t[i].v === v) { i++; return true; } return false; }
  function expect(v) { if (!eat(v)) throw new Error('Missing “' + v + '”'); }
  function toRad(x) { return deg ? x * Math.PI / 180 : x; }
  function fromRad(x) { return deg ? x * 180 / Math.PI : x; }
  function clean(x) { return Math.abs(x) < 1e-12 ? 0 : x; }   /* sin 180 = 0, not 1.2e-16 */
  var F = {
    sin: function (x) { return clean(Math.sin(toRad(x))); },
    cos: function (x) { return clean(Math.cos(toRad(x))); },
    tan: function (x) {
      if (deg && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-12) throw new Error('tan 90° is undefined');
      return clean(Math.tan(toRad(x)));
    },
    asin: function (x) { if (x < -1 || x > 1) throw new Error('sin⁻¹ needs a value from −1 to 1'); return fromRad(Math.asin(x)); },
    acos: function (x) { if (x < -1 || x > 1) throw new Error('cos⁻¹ needs a value from −1 to 1'); return fromRad(Math.acos(x)); },
    atan: function (x) { return fromRad(Math.atan(x)); },
    sqrt: function (x) { if (x < 0) throw new Error('√ of a negative number'); return Math.sqrt(x); },
    cbrt: Math.cbrt,
    ln: function (x) { if (x <= 0) throw new Error('ln needs a positive number'); return Math.log(x); },
    log: function (x) { if (x <= 0) throw new Error('log needs a positive number'); return Math.log10(x); },
    exp: Math.exp, abs: Math.abs
  };
  /* expr := term (('+'|'-') term)*   term := unary (('*'|'/') unary)*
     unary := ('-'|'+') unary | power   power := postfix ('^' unary)?   (right-assoc)
     postfix := primary '!'*            primary := num | const | fn arg | '(' expr ')' */
  function expr() {
    var v = term();
    for (;;) {
      if (eat('+')) v += term();
      else if (eat('-')) v -= term();
      else return v;
    }
  }
  function term() {
    var v = unary();
    for (;;) {
      if (eat('*')) v *= unary();
      else if (eat('/')) { var d = unary(); if (d === 0) throw new Error('Division by zero'); v /= d; }
      else return v;
    }
  }
  function unary() {
    if (eat('-')) return -unary();
    if (eat('+')) return unary();
    return power();
  }
  function power() {
    var b = postfix();
    if (eat('^')) return Math.pow(b, unary());
    return b;
  }
  function postfix() {
    var v = primary();
    while (eat('!')) {
      if (v < 0 || v !== Math.floor(v) || v > 170) throw new Error('n! needs a whole number from 0 to 170');
      var f = 1; for (var k = 2; k <= v; k++) f *= k; v = f;
    }
    return v;
  }
  function primary() {
    var x = peek();
    if (!x) throw new Error('The expression ends too soon');
    if (x.k === 'num') { i++; return x.v; }
    if (x.k === 'const') { i++; return x.v === 'pi' ? Math.PI : x.v === 'e' ? Math.E : ans; }
    if (x.k === 'fn') {
      i++;
      var a;
      if (eat('(')) { a = expr(); expect(')'); }
      else a = power();                       /* sin 30, √2 */
      return F[x.v](a);
    }
    if (eat('(')) { var v = expr(); expect(')'); return v; }
    throw new Error('Unexpected “' + x.v + '”');
  }
  var v = expr();
  if (i < t.length) throw new Error('Unexpected “' + t[i].v + '”');
  if (!isFinite(v)) throw new Error('The result is too large');
  return v;
}
function format(v) {
  if (v === 0) return '0';
  var a = Math.abs(v);
  if (a >= 1e12 || a < 1e-6) return v.toExponential(8).replace(/\.?0+e/, 'e');
  return String(parseFloat(v.toPrecision(12)));
}

window.TutorCalc = { evaluate: evaluate, format: format };
if (typeof document === 'undefined') return;

/* ----------------------------------------------------------------- the panel */
var LS = 'biomech-tutor-calc-v1';
function load() { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } }
function save() { try { localStorage.setItem(LS, JSON.stringify({ deg: st.deg, hist: st.hist.slice(0, 12), ans: st.ans })); } catch (e) {} }
var saved = load();
var st = { deg: saved.deg !== false, hist: saved.hist || [], ans: saved.ans || 0, open: false };

var KEYS = [
  /* [label, insert or action, class] */
  ['2nd', '#2nd', 'fn'], ['DEG', '#mode', 'fn'], ['(', '(', 'fn'], [')', ')', 'fn'], ['⌫', '#back', 'fn'],
  ['sin', 'sin(', 'fn', 'sin⁻¹', 'asin('], ['cos', 'cos(', 'fn', 'cos⁻¹', 'acos('], ['tan', 'tan(', 'fn', 'tan⁻¹', 'atan('],
  ['xʸ', '^', 'fn', 'ʸ√x', '^(1/'], ['AC', '#clear', 'fn danger'],
  ['ln', 'ln(', 'fn', 'eˣ', 'e^('], ['log', 'log(', 'fn', '10ˣ', '10^('], ['x²', '^2', 'fn', 'x³', '^3'],
  ['√', '√(', 'fn', '∛', 'cbrt('], ['÷', '÷', 'op'],
  ['π', 'π', 'fn', 'e', 'e'], ['7', '7'], ['8', '8'], ['9', '9'], ['×', '×', 'op'],
  ['1/x', '#inv', 'fn', '|x|', 'abs('], ['4', '4'], ['5', '5'], ['6', '6'], ['−', '−', 'op'],
  ['EE', 'e', 'fn', 'n!', '!'], ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+', 'op'],
  ['Ans', 'Ans', 'fn'], ['±', '#neg'], ['0', '0'], ['.', '.'], ['=', '#eq', 'eq']
];

/* where each key sits when the calculator is wide (tutor.css, .calc-keys):
   the functions on the left, the number pad on the right, four rows */
var AREA = { '2nd': 'two', 'DEG': 'deg', '(': 'lp', ')': 'rp', '⌫': 'bk', 'sin': 'sin', 'cos': 'cos', 'tan': 'tan',
  'xʸ': 'pow', 'AC': 'ac', 'ln': 'ln', 'log': 'log', 'x²': 'sq', '√': 'rt', '÷': 'div', 'π': 'pi', '×': 'mul',
  '1/x': 'inv', '−': 'sub', 'EE': 'ee', '+': 'add', 'Ans': 'ans', '±': 'neg', '.': 'dot', '=': 'eq' };

var tab, panel, slot, body, input, out, histBox, useBtn, modeBtn, twoBtn, second = false, lastValue = null;
var mode = 'off';                 /* 'off' | 'side' | 'inline' */
var inlineHost = null, inlineBtn = null;
function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
var CALC_ICON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"/><path d="M8 7m0 1a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v1a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1z"/><path d="M8 14l0 .01"/><path d="M12 14l0 .01"/><path d="M16 14l0 .01"/><path d="M8 17l0 .01"/><path d="M12 17l0 .01"/><path d="M16 17l0 .01"/></svg>';
function phone() { return window.matchMedia && window.matchMedia('(max-width: 720px)').matches; }
function finePointer() { return window.matchMedia && window.matchMedia('(pointer: fine)').matches; }

/* the calculator itself: one, moved between the side panel and the question card */
function buildBody() {
  body = el('div', 'calc-body');
  body.innerHTML =
    '<div class="calc-screen"><input id="calc-in" type="text" inputmode="none" autocomplete="off" spellcheck="false" aria-label="Expression">' +
    '<output id="calc-out" aria-live="polite"></output></div>' +
    '<div class="calc-keys"></div>' +
    '<div class="calc-foot"><button class="calc-use btn-primary" disabled>Use as my answer</button></div>' +
    '<div class="calc-hist" aria-label="Recent results"></div>';
  input = body.querySelector('#calc-in');
  out = body.querySelector('#calc-out');
  histBox = body.querySelector('.calc-hist');
  useBtn = body.querySelector('.calc-use');
  var keys = body.querySelector('.calc-keys');
  KEYS.forEach(function (k) {
    var b = el('button', 'ck ' + (k[2] || 'num'), k[0]);
    b.type = 'button';
    b.dataset.ins = k[1];
    b.style.setProperty('--a', AREA[k[0]] || 'n' + k[0]);
    if (k[3]) { b.dataset.alt = k[3]; b.dataset.altIns = k[4]; b.dataset.label = k[0]; }
    b.onclick = function () { press(b); };
    if (k[1] === '#mode') modeBtn = b;
    if (k[1] === '#2nd') twoBtn = b;
    keys.appendChild(b);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); equals(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  input.addEventListener('input', preview);
  useBtn.onclick = function () {
    var a = document.getElementById('ans-val');
    if (!a || lastValue == null) return;
    a.value = format(lastValue);
    a.dispatchEvent(new Event('input', { bubbles: true }));
    if (mode === 'side' && phone()) close();     /* full screen on a phone: get out of the way */
    a.focus();
  };
  /* typing on a computer: the input takes the keyboard; on a phone, the keys do */
  if (finePointer()) input.removeAttribute('inputmode');
}
function build() {
  buildBody();
  tab = el('button', 'calc-tab', CALC_ICON + '<span>Calculator</span>');
  tab.title = 'Open the calculator at the side';
  tab.setAttribute('aria-expanded', 'false');
  tab.setAttribute('aria-controls', 'calc-panel');
  tab.onclick = function () { if (mode === 'side') close(); else openSide(); };
  panel = el('aside', 'calc-panel');
  panel.id = 'calc-panel';
  panel.setAttribute('aria-label', 'Calculator');
  panel.innerHTML = '<div class="calc-head"><b>Calculator</b><span class="calc-hbtns">' +
    '<button class="calc-move" type="button">Put in the question</button>' +
    '<button class="calc-x" type="button" aria-label="Close the calculator">✕</button></span></div><div class="calc-slot"></div>';
  slot = panel.querySelector('.calc-slot');
  panel.querySelector('.calc-x').onclick = close;
  panel.querySelector('.calc-move').onclick = function () { if (inlineReady()) openInline(); };
  document.body.appendChild(tab);
  document.body.appendChild(panel);
  showMode(); drawHist(); refreshUse(); paint();
}
function inlineReady() { return inlineHost && document.body.contains(inlineHost); }

/* the side panel: half the window, the page moves over (whole screen on a phone) */
function openSide() {
  mode = 'side';
  slot.appendChild(body);
  paint();
  setTimeout(function () { if (finePointer()) input.focus(); }, 200);
}
/* in the question card, just above the answer box */
function openInline() {
  if (!inlineReady()) return openSide();
  mode = 'inline';
  inlineHost.querySelector('.calc-islot').appendChild(body);
  paint();
  if (finePointer()) input.focus();
}
function close() {
  mode = 'off';
  paint();
}
function paint() {
  var side = mode === 'side', inl = mode === 'inline' && inlineReady();
  panel.classList.toggle('open', side);
  tab.classList.toggle('open', side);
  tab.setAttribute('aria-expanded', String(side));
  document.body.classList.toggle('calc-docked', side);
  panel.querySelector('.calc-move').hidden = !inlineReady();
  if (inlineHost) inlineHost.hidden = !inl;
  if (inlineBtn) { inlineBtn.classList.toggle('on', inl); inlineBtn.setAttribute('aria-expanded', String(inl)); }
  refreshUse();
}
/* tutor.js hands over the card's slot and button each time it draws a question */
function attachInline(host, btn) {
  inlineHost = host; inlineBtn = btn;
  host.innerHTML = '<div class="calc-ihead"><b>' + CALC_ICON + 'Calculator</b><span class="calc-hbtns">' +
    '<button class="calc-side" type="button">Open at the side</button>' +
    '<button class="calc-x" type="button" aria-label="Close the calculator">✕</button></span></div><div class="calc-islot"></div>';
  host.querySelector('.calc-x').onclick = close;
  host.querySelector('.calc-side').onclick = openSide;
  btn.onclick = function () { if (mode === 'inline') close(); else openInline(); };
  if (mode === 'inline') host.querySelector('.calc-islot').appendChild(body);   /* stays open from question to question */
  paint();
}

function showMode() { modeBtn.textContent = st.deg ? 'DEG' : 'RAD'; modeBtn.title = st.deg ? 'Angles in degrees (tap for radians)' : 'Angles in radians (tap for degrees)'; }
function setSecond(on) {
  second = on;
  twoBtn.classList.toggle('on', on);
  body.querySelectorAll('.ck[data-alt]').forEach(function (b) { b.textContent = on ? b.dataset.alt : b.dataset.label; });
}
function insert(s) {
  var a = input.selectionStart == null ? input.value.length : input.selectionStart;
  var b = input.selectionEnd == null ? a : input.selectionEnd;
  input.value = input.value.slice(0, a) + s + input.value.slice(b);
  var p = a + s.length;
  input.setSelectionRange(p, p);
  preview();
}
function press(b) {
  var ins = second && b.dataset.altIns ? b.dataset.altIns : b.dataset.ins;
  if (second && b.dataset.altIns) setSecond(false);
  if (ins === '#2nd') { setSecond(!second); return; }
  if (ins === '#mode') { st.deg = !st.deg; showMode(); save(); preview(); return; }
  if (ins === '#clear') { input.value = ''; out.textContent = ''; out.className = ''; lastValue = null; refreshUse(); keepFocus(); return; }
  if (ins === '#back') {
    var a = input.selectionStart, c = input.selectionEnd;
    if (a !== c) input.value = input.value.slice(0, a) + input.value.slice(c);
    else if (a > 0) { input.value = input.value.slice(0, a - 1) + input.value.slice(a); a--; }
    input.setSelectionRange(a, a); preview(); keepFocus(); return;
  }
  if (ins === '#eq') { equals(); return; }
  if (ins === '#neg') { input.value = input.value ? '−(' + input.value + ')' : '−'; preview(); keepFocus(); return; }
  if (ins === '#inv') { input.value = input.value ? '1/(' + input.value + ')' : '1/'; preview(); keepFocus(); return; }
  /* an operator first carries on from the last answer */
  if (!input.value && /^[\^×÷+!]$|^\^/.test(ins) && st.hist.length) input.value = 'Ans';
  if (ins === 'e' && b.dataset.label === 'EE') ins = /\d$/.test(input.value.slice(0, input.selectionStart)) ? 'e' : '×10^';
  insert(ins);
  keepFocus();
}
function keepFocus() { if (finePointer()) input.focus(); }
function preview() {
  var s = input.value.trim();
  if (!s) { out.textContent = ''; out.className = ''; return; }
  try { var v = evaluate(s, { deg: st.deg, ans: st.ans }); out.textContent = '= ' + format(v); out.className = 'pre'; }
  catch (e) { out.textContent = ''; out.className = ''; }
}
function equals() {
  var s = input.value.trim();
  if (!s) return;
  try {
    var v = evaluate(s, { deg: st.deg, ans: st.ans });
    lastValue = v; st.ans = v;
    out.textContent = '= ' + format(v); out.className = 'done';
    st.hist.unshift({ e: s, v: v, m: /sin|cos|tan/.test(s) ? (st.deg ? 'deg' : 'rad') : '' });
    st.hist = st.hist.slice(0, 12);
    save(); drawHist(); refreshUse();
    input.value = format(v);
    input.setSelectionRange(input.value.length, input.value.length);
  } catch (e) {
    out.textContent = e.message; out.className = 'err';
  }
  keepFocus();
}
function drawHist() {
  histBox.innerHTML = st.hist.length ? '<small>Recent (tap to reuse)</small>' : '';
  st.hist.forEach(function (h) {
    var b = el('button', 'ch');
    b.type = 'button';
    b.innerHTML = '<span class="ch-e"></span><span class="ch-v"></span>';
    b.querySelector('.ch-e').textContent = h.e + (h.m ? ' (' + h.m + ')' : '');
    b.querySelector('.ch-v').textContent = '= ' + format(h.v);
    b.onclick = function () { insert(format(h.v)); keepFocus(); };
    histBox.appendChild(b);
  });
}
function refreshUse() { useBtn.disabled = !(lastValue != null && document.getElementById('ans-val')); }
window.addEventListener('hashchange', function () { setTimeout(paint, 0); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mode !== 'off' && body.contains(document.activeElement)) close(); });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
window.TutorCalc.openSide = openSide;
window.TutorCalc.openInline = openInline;
window.TutorCalc.close = close;
window.TutorCalc.attachInline = attachInline;
window.TutorCalc.mode = function () { return mode; };
})();
