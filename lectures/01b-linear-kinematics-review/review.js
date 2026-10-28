/* ======================================================================
   EPHE 341 — review mode

   Open a deck with ?review on the end of its address (index.html?review)
   and this turns the deck into a feedback tool.  Without ?review it does
   nothing at all, so students never see it.

   Click anything on a slide — a heading, a paragraph, a list item, a
   table, an image, a drawn figure, a widget — and choose:

     Edit text        type the new wording straight onto the slide
     Move / resize    drag it, pull the corner to resize it
     Request change   a note pinned to that element
   or draw a box anywhere on the slide and pin a note to the box.

   Review mode only runs on a copy opened from your own computer (file://
   or localhost); on the published site it does nothing.

   Claude's replies come back in review/replies.js beside the deck.  That
   folder is git-ignored, so neither your notes nor the replies are ever
   published.  Each item then shows "done", "question" or "not done", with
   the reply, and you can answer a question in place.

   Everything is kept in this browser (localStorage, per deck) and listed
   in the side panel.  "Send to Claude" saves it all as one JSON file,
   review-<deck>-<date>.json, which is what Claude works from.  Each item
   carries enough to find its element again in the source: the slide
   number, its heading, the "Source slide N" line of its speaker notes, a
   structural path, the element's text, and before/after geometry in slide
   units (1280 × 720).

   Move/resize records what you want the slide to LOOK like; it is applied
   here as a transform so you can see it, and Claude then makes the same
   change through the deck's own layout so it still works on a phone and
   in the handout.
   ====================================================================== */
(function () {
'use strict';
if (!/[?&]review\b/.test(location.search)) return;
if (/print-pdf/.test(location.search)) return;
/* Only on a copy opened from your own computer: the deck opened straight off
   disk (file://) or from a local server.  On the published site ?review does
   nothing, so nobody else can open the review tools, and nothing anyone
   types anywhere reaches Claude unless you hand the file over yourself. */
var LOCAL = location.protocol === 'file:' ||
            /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
if (!LOCAL) return;

var DECK = (location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '')
              .split('/').pop()) || 'deck';
var KEY = 'ephe341-review:' + DECK;
var VERSION = (function () {
  var s = document.querySelector('script[src*="deck-core.js"]');
  var m = s && /v=([0-9a-z]+)/.exec(s.getAttribute('src'));
  return m ? m[1] : '';
})();

/* ------------------------------------------------------------ storage */
var ST = load();
function load() {
  try {
    var s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.items) return s;
  } catch (e) {}
  return { deck: DECK, version: VERSION, items: [], next: 1 };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {}
  renderPanel(); renderPins();
}

/* ------------------------------------------------------------ styles */
var css = document.createElement('style');
css.textContent = [
  '.rv-ui{font:500 13px/1.35 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#1c1c1a}',
  '.rv-bar{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483000;display:flex;gap:6px;align-items:center;',
  ' background:#fff;border:1px solid #c9c6bf;border-radius:10px;padding:6px 8px;box-shadow:0 4px 18px rgba(0,0,0,.18)}',
  '.rv-bar b{color:#c2410c;margin:0 6px 0 2px;letter-spacing:.04em}',
  '.rv-btn{border:1px solid #c9c6bf;background:#f6f5f2;border-radius:7px;padding:5px 10px;cursor:pointer;font:inherit;color:inherit}',
  '.rv-btn:hover{background:#ece9e2}.rv-btn.on{background:#003366;color:#fff;border-color:#003366}',
  '.rv-btn.go{background:#c2410c;color:#fff;border-color:#c2410c}',
  '.rv-hover{outline:2px dashed #c2410c !important;outline-offset:3px;cursor:pointer}',
  '.rv-sel{outline:3px solid #c2410c !important;outline-offset:3px}',
  '.rv-pop{position:fixed;z-index:2147483001;background:#fff;border:1px solid #c9c6bf;border-radius:10px;padding:10px;width:340px;',
  ' box-shadow:0 6px 24px rgba(0,0,0,.22)}',
  '.rv-pop h4{margin:0 0 6px;font-size:12px;color:#6b6b66;font-weight:700;text-transform:uppercase;letter-spacing:.05em}',
  '.rv-pop .rv-what{font-size:12px;color:#003366;margin-bottom:8px;max-height:3.9em;overflow:hidden}',
  '.rv-pop .rv-row{display:flex;gap:6px;flex-wrap:wrap}',
  '.rv-pop textarea{width:100%;box-sizing:border-box;min-height:84px;margin:8px 0;font:inherit;padding:6px;border:1px solid #c9c6bf;border-radius:6px}',
  '.rv-frame{position:fixed;z-index:2147482999;border:2px solid #c2410c;box-sizing:border-box;cursor:move;background:rgba(194,65,12,.06)}',
  '.rv-h{position:absolute;width:14px;height:14px;background:#c2410c;border:2px solid #fff;border-radius:3px}',
  '.rv-h.br{right:-8px;bottom:-8px;cursor:nwse-resize}.rv-h.tl{left:-8px;top:-8px;cursor:nwse-resize}',
  '.rv-h.tr{right:-8px;top:-8px;cursor:nesw-resize}.rv-h.bl{left:-8px;bottom:-8px;cursor:nesw-resize}',
  '.rv-boxdraw{position:fixed;z-index:2147482998;border:2px dashed #6d28d9;background:rgba(109,40,217,.08);pointer-events:none}',
  '.rv-shield{position:fixed;inset:0;z-index:2147482997;cursor:crosshair}',
  '.rv-panel{position:fixed;top:0;right:0;bottom:0;width:360px;z-index:2147483000;background:#fdfdfc;border-left:1px solid #c9c6bf;',
  ' box-shadow:-4px 0 18px rgba(0,0,0,.12);display:flex;flex-direction:column}',
  '.rv-panel header{padding:12px 14px;border-bottom:1px solid #e4e1da;display:flex;justify-content:space-between;align-items:center}',
  '.rv-panel header b{font-size:14px}',
  '.rv-list{overflow:auto;flex:1;padding:8px 10px}',
  '.rv-item{border:1px solid #e4e1da;border-radius:8px;padding:8px 9px;margin-bottom:8px;background:#fff}',
  '.rv-item.done{opacity:.5}',
  '.rv-item .rv-meta{font-size:11px;color:#6b6b66;margin-bottom:3px;display:flex;justify-content:space-between;gap:6px}',
  '.rv-item .rv-body{white-space:pre-wrap;word-break:break-word}',
  '.rv-item .rv-acts{margin-top:6px;display:flex;gap:6px}',
  '.rv-item .rv-acts button{font-size:11px;padding:3px 7px}',
  '.rv-tag{display:inline-block;font-size:10.5px;font-weight:700;border-radius:4px;padding:1px 5px;color:#fff}',
  '.rv-tag.text{background:#2f6d4f}.rv-tag.move{background:#003366}.rv-tag.request{background:#c2410c}.rv-tag.box{background:#6d28d9}',
  '.rv-pin{position:fixed;z-index:2147482996;min-width:20px;height:20px;border-radius:10px;background:#c2410c;color:#fff;',
  ' font:700 11px/20px ui-sans-serif,system-ui,sans-serif;text-align:center;padding:0 5px;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.3)}',
  '.rv-pin.box{background:#6d28d9}.rv-pin.done{background:#9b9890}',
  '.rv-pinbox{position:fixed;z-index:2147482995;border:2px dashed #6d28d9;pointer-events:none}',
  '.rv-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2147483002;background:#1c1c1a;color:#fff;',
  ' padding:8px 14px;border-radius:8px;font:500 13px ui-sans-serif,system-ui,sans-serif}',
  '[contenteditable="true"].rv-editing{outline:3px solid #2f6d4f !important;outline-offset:3px;background:rgba(47,109,79,.06)}'
].join('\n');
document.head.appendChild(css);

/* ------------------------------------------------------------ helpers */
function el(tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
  return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function toast(s) {
  var t = el('div', 'rv-toast rv-ui', esc(s)); document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 2600);
}
function isUI(n) { return !!(n && n.closest && n.closest('.rv-ui')); }
function curSlide() { return Reveal.getCurrentSlide(); }
function slideIndex(sec) { return Reveal.getSlides().indexOf(sec); }

/* The deck's own wrappers (fit.js's .slide-body) come and go, so a path is
   built over "logical" children: a .slide-body's children count as the
   section's own, and anything a tool added (ink-, rv-) is ignored. */
function logicalKids(node) {
  var out = [];
  Array.prototype.forEach.call(node.children, function (c) {
    /* skip the review tools' own elements and the ink layer, but not a
       content element that merely carries a review highlight class */
    if (c.classList && c.classList.contains('rv-ui')) return;
    var cl = c.className && c.className.baseVal == null ? c.className : '';
    if (/(^|\s)ink-/.test(cl)) return;
    if (c.classList && c.classList.contains('slide-body')) {
      Array.prototype.forEach.call(c.children, function (cc) { out.push(cc); });
    } else out.push(c);
  });
  return out;
}
function logicalParent(n, sec) {
  var p = n.parentElement;
  if (p && p.classList && p.classList.contains('slide-body')) p = p.parentElement;
  return p;
}
function pathOf(n, sec) {
  var steps = [];
  while (n && n !== sec) {
    var p = logicalParent(n, sec);
    if (!p) return null;
    steps.unshift(n.tagName.toLowerCase() + ':' + logicalKids(p).indexOf(n));
    n = p;
  }
  return steps.join('/');
}
function fromPath(path, sec) {
  var n = sec;
  var steps = path ? path.split('/') : [];
  for (var i = 0; i < steps.length; i++) {
    var m = /^([a-z0-9]+):(\d+)$/.exec(steps[i]);
    if (!m) return null;
    var k = logicalKids(n)[+m[2]];
    if (!k || k.tagName.toLowerCase() !== m[1]) return null;
    n = k;
  }
  return n;
}

/* what can be picked: the smallest sensible thing under the pointer */
var PICK = '.iplot, svg.hifig, img, table, .title-slide, .section-slide, h1, h2, h3, .subhead, li, p, ' +
           '.eq, .box, .figcol, .figrow, .cols > div, .lead';
function pickable(t, sec) {
  if (!t || !sec || !sec.contains(t)) return null;
  var w = t.closest('.iplot');                    /* a widget is one thing */
  if (w && sec.contains(w)) return w;
  var s = t.closest('svg.hifig');                 /* so is a drawn figure */
  if (s && sec.contains(s)) return s;
  var n = t.closest(PICK);
  if (n && n !== sec && sec.contains(n) && !isUI(n)) return n;
  return null;
}
function kindOf(n) {
  if (n.classList.contains('iplot')) return 'widget';
  if (n.tagName.toLowerCase() === 'svg') return 'figure';
  if (n.tagName === 'IMG') return 'image';
  if (n.tagName === 'TABLE') return 'table';
  if (/^H[1-4]$/.test(n.tagName) || n.classList.contains('subhead')) return 'heading';
  return 'text';
}
function textOf(n) { return (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim(); }
function textEditable(n) {
  var k = kindOf(n);
  if (k === 'widget' || k === 'figure' || k === 'image') return false;
  return !n.querySelector('svg, canvas, img, .iplot');
}
function describe(n) {
  var k = kindOf(n);
  if (k === 'widget') return 'widget “' + n.getAttribute('data-widget') + '”';
  if (k === 'figure') return 'figure: ' + (n.getAttribute('aria-label') || '').slice(0, 90);
  if (k === 'image') return 'image ' + (n.getAttribute('src') || '');
  return k + ': “' + textOf(n).slice(0, 90) + (textOf(n).length > 90 ? '…' : '') + '”';
}
function slideInfo(sec) {
  var h = sec.querySelector('h1, h2'), sh = sec.querySelector('.subhead'),
      no = sec.querySelector('aside.notes');
  return {
    slide: slideIndex(sec) + 1,
    total: Reveal.getTotalSlides(),
    id: sec.id || '',
    heading: h ? textOf(h) : '',
    subhead: sh ? textOf(sh) : '',
    notes: no ? (no.textContent || '').trim().split('\n')[0].slice(0, 160) : ''
  };
}
/* geometry in slide units: the section box is 1280 x 720 whatever the window */
function geom(n, sec) {
  var r = n.getBoundingClientRect(), s = sec.getBoundingClientRect();
  var kx = 1280 / (s.width || 1280), ky = 720 / (s.height || 720);
  return { x: Math.round((r.left - s.left) * kx), y: Math.round((r.top - s.top) * ky),
           w: Math.round(r.width * kx), h: Math.round(r.height * ky) };
}
function targetOf(n, sec) {
  return { path: pathOf(n, sec), kind: kindOf(n), what: describe(n),
           text: textOf(n).slice(0, 600), widget: n.getAttribute('data-widget') || '',
           label: n.getAttribute('aria-label') || '', src: n.getAttribute('src') || '' };
}
function itemFor(type, sec, n) {
  var at = new Date().toISOString();
  var it = { n: ST.next, id: ST.next + '-' + at.replace(/[^0-9]/g, '').slice(0, 14), type: type,
             at: at, status: 'open', where: slideInfo(sec) };
  ST.next++;
  if (n) it.target = targetOf(n, sec);
  return it;
}

/* ------------------------------------------------------------ toolbar */
var mode = 'pick';          /* pick | use | box */
var bar = el('div', 'rv-bar rv-ui');
bar.innerHTML = '<b>REVIEW</b>';
var bPick = el('button', 'rv-btn on', 'Select');
var bBox = el('button', 'rv-btn', 'Box + note');
var bUse = el('button', 'rv-btn', 'Use slide');
var bList = el('button', 'rv-btn', 'List (0)');
var bSend = el('button', 'rv-btn go', 'Send to Claude');
var bExit = el('button', 'rv-btn', 'Exit');
bPick.title = 'Click anything on the slide to edit, move or comment on it';
bBox.title = 'Draw a box anywhere on the slide and attach a note to it';
bUse.title = 'Use the slide normally (press buttons, drag sliders) without selecting';
[bPick, bBox, bUse, bList, bSend, bExit].forEach(function (b) { bar.appendChild(b); });
document.body.appendChild(bar);
function setMode(m) {
  mode = m; closePop(); clearHover();
  [[bPick, 'pick'], [bBox, 'box'], [bUse, 'use']].forEach(function (z) {
    z[0].classList.toggle('on', mode === z[1]);
  });
  shield.style.display = mode === 'box' ? 'block' : 'none';
}
bPick.onclick = function () { setMode('pick'); };
bBox.onclick = function () { setMode('box'); };
bUse.onclick = function () { setMode('use'); };
bList.onclick = function () { panel.style.display = panel.style.display === 'none' ? 'flex' : 'none'; };
bExit.onclick = function () {
  location.href = location.pathname + location.hash;
};
bSend.onclick = exportFile;

/* ------------------------------------------------------------ selecting */
var hoverEl = null, selEl = null, pop = null, frame = null;
function clearHover() { if (hoverEl) hoverEl.classList.remove('rv-hover'); hoverEl = null; }
document.addEventListener('pointermove', function (e) {
  if (mode !== 'pick' || pop || frame || isUI(e.target)) { if (!pop) clearHover(); return; }
  var n = pickable(e.target, curSlide());
  if (n === hoverEl) return;
  clearHover();
  if (n) { hoverEl = n; n.classList.add('rv-hover'); }
}, true);
/* in Select mode a click on the slide selects instead of acting */
['pointerdown', 'mousedown', 'click', 'touchstart'].forEach(function (ev) {
  document.addEventListener(ev, function (e) {
    if (mode !== 'pick' || isUI(e.target) || editing) return;
    var sec = curSlide();
    if (!sec || !sec.contains(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    if (ev !== 'click') return;
    var n = pickable(e.target, sec);
    if (n) select(n);
  }, true);
});
function select(n) {
  closePop();
  clearHover();
  selEl = n; n.classList.add('rv-sel');
  var sec = curSlide();
  pop = el('div', 'rv-pop rv-ui');
  pop.innerHTML = '<h4>Slide ' + (slideIndex(sec) + 1) + '</h4>' +
    '<div class="rv-what">' + esc(describe(n)) + '</div>';
  var row = el('div', 'rv-row');
  var bT = el('button', 'rv-btn', 'Edit text');
  var bM = el('button', 'rv-btn', 'Move / resize');
  var bR = el('button', 'rv-btn', 'Request change');
  var bP = el('button', 'rv-btn', 'Bigger selection');
  var bC = el('button', 'rv-btn', 'Cancel');
  if (!textEditable(n)) bT.disabled = true, bT.style.opacity = .4;
  [bT, bM, bR, bP, bC].forEach(function (b) { row.appendChild(b); });
  pop.appendChild(row);
  document.body.appendChild(pop);
  placePop(n);
  bC.onclick = closePop;
  bP.onclick = function () {
    var p = logicalParent(n, sec);
    var up = p && p !== sec ? (p.closest(PICK) || p) : null;
    if (up && up !== sec && sec.contains(up)) select(up); else toast('That is the whole slide.');
  };
  bR.onclick = function () { askNote(n, null); };
  bT.onclick = function () { editText(n); };
  bM.onclick = function () { moveResize(n); };
}
function placePop(n) {
  var r = n.getBoundingClientRect();
  var x = Math.min(window.innerWidth - 360, Math.max(10, r.left));
  var y = r.bottom + 12;
  if (y + 190 > window.innerHeight) y = Math.max(60, r.top - 200);
  pop.style.left = x + 'px'; pop.style.top = y + 'px';
}
function closePop() {
  if (pop) { pop.remove(); pop = null; }
  if (selEl) { selEl.classList.remove('rv-sel'); selEl = null; }
}

/* ------------------------------------------------------------ a note */
function askNote(n, box) {
  var sec = curSlide();
  if (pop) pop.remove();
  pop = el('div', 'rv-pop rv-ui');
  pop.innerHTML = '<h4>Request a change · slide ' + (slideIndex(sec) + 1) + '</h4>' +
    '<div class="rv-what">' + esc(n ? describe(n) : 'the boxed area') + '</div>';
  var ta = el('textarea');
  ta.placeholder = 'What should change? e.g. "the hand is rotated the wrong way", ' +
                   '"use my original picture here", "make the graph show force as well".';
  pop.appendChild(ta);
  var row = el('div', 'rv-row');
  var ok = el('button', 'rv-btn go', 'Add to list');
  var no = el('button', 'rv-btn', 'Cancel');
  row.appendChild(ok); row.appendChild(no); pop.appendChild(row);
  document.body.appendChild(pop);
  if (n) placePop(n); else { pop.style.left = (box.l) + 'px'; pop.style.top = Math.min(window.innerHeight - 220, box.b + 10) + 'px'; }
  ta.focus();
  no.onclick = function () { closePop(); renderPins(); };
  ok.onclick = function () {
    var txt = ta.value.trim();
    if (!txt) { ta.focus(); return; }
    var it = itemFor(n ? 'request' : 'box', sec, n);
    it.note = txt;
    if (n) it.geom = geom(n, sec);
    if (box) it.box = box.slide;
    ST.items.push(it); save(); closePop();
    toast('Added to the list (' + openCount() + ' open).');
  };
}

/* ------------------------------------------------------------ text */
var editing = null;
function editText(n) {
  var sec = curSlide();
  if (pop) { pop.remove(); pop = null; }
  n.classList.remove('rv-sel');
  var before = n.innerText.trim();
  editing = n;
  n.setAttribute('contenteditable', 'true');
  n.classList.add('rv-editing');
  n.focus();
  var bar2 = el('div', 'rv-pop rv-ui');
  bar2.innerHTML = '<h4>Editing text · slide ' + (slideIndex(sec) + 1) + '</h4>' +
    '<div class="rv-what">Type on the slide. Ctrl/⌘ + Enter or Done to keep it, Esc to undo.</div>';
  var row = el('div', 'rv-row');
  var ok = el('button', 'rv-btn go', 'Done');
  var no = el('button', 'rv-btn', 'Undo');
  row.appendChild(ok); row.appendChild(no); bar2.appendChild(row);
  document.body.appendChild(bar2);
  pop = bar2; placePop(n);
  var html0 = n.innerHTML;
  function finish(keep) {
    n.removeAttribute('contenteditable'); n.classList.remove('rv-editing');
    editing = null; if (pop) { pop.remove(); pop = null; } selEl = null;
    if (!keep) { n.innerHTML = html0; return; }
    var after = n.innerText.trim();
    if (after === before) return;
    var path = pathOf(n, sec);
    var old = ST.items.filter(function (i) {
      return i.type === 'text' && i.status === 'open' && i.where.slide === slideIndex(sec) + 1 &&
             i.target && i.target.path === path;
    })[0];
    if (old) { old.after = after; old.at = new Date().toISOString(); }
    else {
      var it = itemFor('text', sec, n);
      it.before = before; it.after = after;
      ST.items.push(it);
    }
    save(); toast('Text change recorded.');
  }
  ok.onclick = function () { finish(true); };
  no.onclick = function () { finish(false); };
  editKeys = function (e) {
    if (e.key === 'Escape') { finish(false); e.preventDefault(); }
    else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { finish(true); e.preventDefault(); }
  };
}
var editKeys = null;
/* Keys typed into a note or onto the slide must not reach reveal or the
   deck's own shortcuts (t switches the theme, m opens the menu, a draws). The
   default action — the character going in — is not a listener, so stopping
   propagation here does not stop the typing. */
window.addEventListener('keydown', function (e) {
  var t = e.target;
  var inUI = isUI(t) && /^(TEXTAREA|INPUT)$/.test(t.tagName);
  if (editing && (t === editing || editing.contains(t))) {
    if (editKeys) editKeys(e);
    e.stopPropagation();
  } else if (inUI) {
    e.stopPropagation();
    if (e.key === 'Escape') closePop();
  } else if (e.key === 'Escape' && (pop || frame)) {
    closePop(); endFrame(false); e.stopPropagation();
  }
}, true);

/* ------------------------------------------------------------ move / resize */
var mv = null;
function baseTransform(n) { return n.getAttribute('data-rv-t0') != null ? n.getAttribute('data-rv-t0') : (n.style.transform || ''); }
function moveResize(n) {
  var sec = curSlide();
  if (pop) { pop.remove(); pop = null; }
  n.classList.remove('rv-sel'); selEl = null;
  if (n.getAttribute('data-rv-t0') == null) n.setAttribute('data-rv-t0', n.style.transform || '');
  var g0 = geom(n, sec);
  var r = n.getBoundingClientRect();
  /* the transform is applied in the element's own CSS pixels; reveal's
     scale and fit.js's zoom sit between those and the screen */
  var cssW = n.offsetWidth || n.clientWidth || r.width;
  var eff = r.width / (cssW || r.width) || 1;
  var cur = parseT(n);
  mv = { n: n, sec: sec, g0: geomUntransformed(n, sec, cur), eff: eff, t: cur,
         start: null, r0: r };
  frame = el('div', 'rv-frame rv-ui');
  ['tl', 'tr', 'bl', 'br'].forEach(function (k) { var h = el('div', 'rv-h ' + k); h.dataset.k = k; frame.appendChild(h); });
  document.body.appendChild(frame);
  syncFrame();
  var help = el('div', 'rv-pop rv-ui');
  help.innerHTML = '<h4>Move / resize · slide ' + (slideIndex(sec) + 1) + '</h4>' +
    '<div class="rv-what">Drag to move, drag a corner to resize (Shift keeps the shape). ' +
    'This shows the look you want; Claude makes it work on phones and in print too.</div>';
  var row = el('div', 'rv-row');
  var ok = el('button', 'rv-btn go', 'Done');
  var rs = el('button', 'rv-btn', 'Reset');
  var no = el('button', 'rv-btn', 'Cancel');
  [ok, rs, no].forEach(function (b) { row.appendChild(b); });
  help.appendChild(row);
  document.body.appendChild(help);
  pop = help;
  help.style.left = '12px'; help.style.top = '64px';
  ok.onclick = function () { endFrame(true); };
  no.onclick = function () { endFrame(false); };
  rs.onclick = function () { mv.t = { dx: 0, dy: 0, sx: 1, sy: 1 }; applyT(n, mv.t); syncFrame(); };
  frame.addEventListener('pointerdown', function (e) {
    e.preventDefault(); e.stopPropagation();
    frame.setPointerCapture(e.pointerId);
    mv.start = { x: e.clientX, y: e.clientY, k: e.target.dataset.k || 'move',
                 t: JSON.parse(JSON.stringify(mv.t)), r: n.getBoundingClientRect() };
  });
  frame.addEventListener('pointermove', function (e) {
    if (!mv || !mv.start) return;
    var s = mv.start, dx = (e.clientX - s.x), dy = (e.clientY - s.y);
    var t = JSON.parse(JSON.stringify(s.t));
    if (s.k === 'move') { t.dx = s.t.dx + dx / mv.eff; t.dy = s.t.dy + dy / mv.eff; }
    else {
      var W = s.r.width, Hh = s.r.height;
      var sxk = s.k.indexOf('r') >= 0 ? (W + dx) / W : (W - dx) / W;
      var syk = s.k.indexOf('b') >= 0 ? (Hh + dy) / Hh : (Hh - dy) / Hh;
      if (e.shiftKey) { var m = Math.abs(sxk - 1) > Math.abs(syk - 1) ? sxk : syk; sxk = syk = m; }
      sxk = Math.max(0.15, sxk); syk = Math.max(0.15, syk);
      t.sx = s.t.sx * sxk; t.sy = s.t.sy * syk;
      if (s.k.indexOf('l') >= 0) t.dx = s.t.dx + dx / mv.eff;
      if (s.k.indexOf('t') >= 0) t.dy = s.t.dy + dy / mv.eff;
    }
    mv.t = t; applyT(n, t); syncFrame();
  });
  frame.addEventListener('pointerup', function () { if (mv) mv.start = null; });
}
function parseT(n) {
  var t = n.getAttribute('data-rv-move');
  if (t) { try { return JSON.parse(t); } catch (e) {} }
  return { dx: 0, dy: 0, sx: 1, sy: 1 };
}
function applyT(n, t) {
  var base = n.getAttribute('data-rv-t0') || '';
  n.style.transformOrigin = '0 0';
  n.style.transform = (base ? base + ' ' : '') +
    'translate(' + t.dx.toFixed(1) + 'px,' + t.dy.toFixed(1) + 'px) scale(' +
    t.sx.toFixed(3) + ',' + t.sy.toFixed(3) + ')';
  n.setAttribute('data-rv-move', JSON.stringify(t));
}
function geomUntransformed(n, sec, t) {
  var keep = n.style.transform;
  n.style.transform = n.getAttribute('data-rv-t0') || '';
  var g = geom(n, sec);
  n.style.transform = keep;
  return g;
}
function syncFrame() {
  if (!frame || !mv) return;
  var r = mv.n.getBoundingClientRect();
  frame.style.left = r.left + 'px'; frame.style.top = r.top + 'px';
  frame.style.width = r.width + 'px'; frame.style.height = r.height + 'px';
}
function endFrame(keep) {
  if (!frame || !mv) return;
  var n = mv.n, sec = mv.sec;
  frame.remove(); frame = null;
  if (pop) { pop.remove(); pop = null; }
  var path = pathOf(n, sec);
  var old = ST.items.filter(function (i) {
    return i.type === 'move' && i.status === 'open' && i.where.slide === slideIndex(sec) + 1 &&
           i.target && i.target.path === path;
  })[0];
  var t = mv.t;
  var moved = Math.abs(t.dx) > 0.5 || Math.abs(t.dy) > 0.5 || Math.abs(t.sx - 1) > 0.005 ||
              Math.abs(t.sy - 1) > 0.005;
  if (!keep) {
    applyT(n, old ? old.t : { dx: 0, dy: 0, sx: 1, sy: 1 });
    if (!old) { n.style.transform = n.getAttribute('data-rv-t0') || ''; n.removeAttribute('data-rv-move'); }
  } else if (!moved) {
    if (old) ST.items.splice(ST.items.indexOf(old), 1);
    n.style.transform = n.getAttribute('data-rv-t0') || ''; n.removeAttribute('data-rv-move');
    save();
  } else {
    var it = old || itemFor('move', sec, n);
    it.t = t; it.before = mv.g0; it.after = geom(n, sec);
    it.scale = { w: +(t.sx).toFixed(3), h: +(t.sy).toFixed(3) };
    it.at = new Date().toISOString();
    if (!old) ST.items.push(it);
    save(); toast('Move / resize recorded.');
  }
  mv = null;
}

/* ------------------------------------------------------------ box + note */
var shield = el('div', 'rv-shield rv-ui');
shield.style.display = 'none';
document.body.appendChild(shield);
var drawBox = null, b0 = null;
shield.addEventListener('pointerdown', function (e) {
  if (isUI(e.target) && e.target !== shield) return;
  b0 = { x: e.clientX, y: e.clientY };
  drawBox = el('div', 'rv-boxdraw rv-ui'); document.body.appendChild(drawBox);
  shield.setPointerCapture(e.pointerId);
});
shield.addEventListener('pointermove', function (e) {
  if (!drawBox) return;
  var l = Math.min(b0.x, e.clientX), t = Math.min(b0.y, e.clientY);
  drawBox.style.left = l + 'px'; drawBox.style.top = t + 'px';
  drawBox.style.width = Math.abs(e.clientX - b0.x) + 'px';
  drawBox.style.height = Math.abs(e.clientY - b0.y) + 'px';
});
shield.addEventListener('pointerup', finishBox);
window.addEventListener('pointerup', finishBox, true);
function finishBox() {
  if (!drawBox) return;
  var r = drawBox.getBoundingClientRect();
  drawBox.remove(); drawBox = null;
  if (r.width < 8 || r.height < 8) return;
  var sec = curSlide(), s = sec.getBoundingClientRect();
  var kx = 1280 / s.width, ky = 720 / s.height;
  setMode('pick');
  var box = { l: r.left, b: r.bottom,
              slide: { x: Math.round((r.left - s.left) * kx), y: Math.round((r.top - s.top) * ky),
                       w: Math.round(r.width * kx), h: Math.round(r.height * ky) } };
  var ghost = el('div', 'rv-pinbox rv-ui');
  ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px';
  ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
  ghost.className += ' rv-tmp';
  document.body.appendChild(ghost);
  askNote(null, box);
}

/* ------------------------------------------------------------ panel */
var panel = el('div', 'rv-panel rv-ui');
panel.style.display = 'none';
panel.innerHTML = '<header><b>Review · ' + esc(DECK) + '</b></header>';
var hdrBtns = el('div', 'rv-row');
var bClose = el('button', 'rv-btn', 'Close');
var bClear = el('button', 'rv-btn', 'Clear done');
hdrBtns.appendChild(bClear); hdrBtns.appendChild(bClose);
panel.querySelector('header').appendChild(hdrBtns);
var list = el('div', 'rv-list');
panel.appendChild(list);
document.body.appendChild(panel);
bClose.onclick = function () { panel.style.display = 'none'; };
bClear.onclick = function () {
  ST.items = ST.items.filter(function (i) { return i.status !== 'done'; }); save();
};
function openCount() { return ST.items.filter(function (i) { return i.status === 'open'; }).length; }
function summary(i) {
  if (i.type === 'text') return '“' + i.before + '”\n→ “' + i.after + '”';
  if (i.type === 'move') return (i.target ? i.target.what : '') + '\n' +
    'moved to x ' + i.after.x + ', y ' + i.after.y + ' · size ' + i.after.w + ' × ' + i.after.h +
    ' (was ' + i.before.w + ' × ' + i.before.h + ')';
  if (i.type === 'box') return i.note + '\n[boxed area]';
  return i.note + '\n— on ' + (i.target ? i.target.what : '');
}
function renderPanel() {
  bList.textContent = 'List (' + openCount() + ')';
  list.innerHTML = '';
  if (!ST.items.length) {
    list.innerHTML = '<p style="color:#6b6b66;padding:8px">Nothing yet. Click Select, then click ' +
      'anything on a slide.</p>';
    return;
  }
  ST.items.slice().sort(function (a, b) { return a.where.slide - b.where.slide || a.n - b.n; })
    .forEach(function (i) {
      var d = el('div', 'rv-item' + (i.status === 'done' ? ' done' : ''));
      d.innerHTML = '<div class="rv-meta"><span><span class="rv-tag ' + i.type + '">' +
        { text: 'TEXT', move: 'MOVE', request: 'REQUEST', box: 'BOX' }[i.type] + '</span> #' + i.n +
        ' · slide ' + i.where.slide + '</span><span>' + esc(i.where.heading).slice(0, 34) + '</span></div>' +
        '<div class="rv-body">' + esc(summary(i)) + '</div>' + replyHTML(i);
      var acts = el('div', 'rv-acts');
      if (i.replyStatus === 'question') {
        var an = el('button', 'rv-btn', i.answer ? 'Change answer' : 'Answer');
        acts.appendChild(an);
        an.onclick = function () {
          var ta = el('textarea'); ta.style.cssText = 'width:100%;min-height:60px;margin-top:6px';
          ta.value = i.answer || '';
          var ok = el('button', 'rv-btn go', 'Save answer');
          d.appendChild(ta); d.appendChild(ok); ta.focus();
          ok.onclick = function () { i.answer = ta.value.trim(); i.status = 'open'; save(); };
        };
      }
      var go = el('button', 'rv-btn', 'Go to slide');
      var dn = el('button', 'rv-btn', i.status === 'done' ? 'Reopen' : 'Mark done');
      var rm = el('button', 'rv-btn', 'Delete');
      [go, dn, rm].forEach(function (b) { acts.appendChild(b); });
      d.appendChild(acts);
      go.onclick = function () { Reveal.slide(i.where.slide - 1); };
      dn.onclick = function () { i.status = i.status === 'done' ? 'open' : 'done'; save(); };
      rm.onclick = function () {
        if (i.type === 'move' && i.target) {
          var sec = Reveal.getSlides()[i.where.slide - 1], n = sec && fromPath(i.target.path, sec);
          if (n) { n.style.transform = n.getAttribute('data-rv-t0') || ''; n.removeAttribute('data-rv-move'); }
        }
        if (i.type === 'text' && i.target) {
          var sec2 = Reveal.getSlides()[i.where.slide - 1], n2 = sec2 && fromPath(i.target.path, sec2);
          if (n2 && n2.innerText.trim() === i.after) n2.innerText = i.before;
        }
        ST.items.splice(ST.items.indexOf(i), 1); save();
      };
      list.appendChild(d);
    });
}

/* numbered pins on the current slide, so you can see what you have said */
var pins = [];
function renderPins() {
  pins.forEach(function (p) { p.remove(); }); pins = [];
  Array.prototype.forEach.call(document.querySelectorAll('.rv-tmp'), function (x) { x.remove(); });
  var sec = curSlide(); if (!sec) return;
  var h = slideIndex(sec) + 1, s = sec.getBoundingClientRect();
  ST.items.forEach(function (i) {
    if (i.where.slide !== h) return;
    var r = null;
    if (i.type === 'box' && i.box) {
      var kx = s.width / 1280, ky = s.height / 720;
      r = { left: s.left + i.box.x * kx, top: s.top + i.box.y * ky,
            width: i.box.w * kx, height: i.box.h * ky };
      var bx = el('div', 'rv-pinbox rv-ui');
      bx.style.left = r.left + 'px'; bx.style.top = r.top + 'px';
      bx.style.width = r.width + 'px'; bx.style.height = r.height + 'px';
      document.body.appendChild(bx); pins.push(bx);
    } else if (i.target) {
      var n = fromPath(i.target.path, sec);
      if (n) r = n.getBoundingClientRect();
    }
    if (!r) return;
    var p = el('div', 'rv-pin rv-ui' + (i.type === 'box' ? ' box' : '') + (i.status === 'done' ? ' done' : ''),
               String(i.n) + (i.replyStatus === 'question' && !i.answer ? ' ?' : ''));
    if (i.replyStatus === 'question' && !i.answer) p.style.background = '#6d28d9';
    p.style.left = Math.max(2, r.left - 10) + 'px'; p.style.top = Math.max(2, r.top - 10) + 'px';
    document.body.appendChild(p); pins.push(p);
  });
}

/* put your earlier edits back on the slides when the deck opens again */
function reapply() {
  var slides = Reveal.getSlides();
  ST.items.forEach(function (i) {
    if (i.status !== 'open' || !i.target) return;
    var sec = slides[i.where.slide - 1]; if (!sec) return;
    var n = fromPath(i.target.path, sec); if (!n) return;
    if (i.type === 'move' && i.t) {
      if (n.getAttribute('data-rv-t0') == null) n.setAttribute('data-rv-t0', n.style.transform || '');
      applyT(n, i.t);
    }
    if (i.type === 'text' && n.innerText.trim() === i.before) n.innerText = i.after;
  });
}

/* ------------------------------------------------------------ replies */
var REPLIES = {};
function loadReplies(then) {
  var sc = document.createElement('script');
  sc.src = 'review/replies.js?t=' + Date.now();
  sc.onload = function () {
    var R = window.EPHE341_REPLIES || {};
    REPLIES = R.items || {};
    var changed = false;
    ST.items.forEach(function (i) {
      var r = REPLIES[i.id];
      if (!r) return;
      if (r.at !== i.replyAt) {                 /* a new reply since last time */
        i.reply = r.reply; i.replyAt = r.at; i.replyStatus = r.status;
        if (r.status === 'done') i.status = 'done';
        else if (r.status === 'question') i.status = 'open';
        changed = true;
      }
    });
    if (changed) toast('Claude has replied — see the list.');
    then && then();
  };
  sc.onerror = function () { then && then(); };     /* no replies yet */
  document.head.appendChild(sc);
}
function replyHTML(i) {
  if (!i.reply) return '';
  var lab = { done: 'Done', question: 'Question for you', notdone: 'Not done' }[i.replyStatus] ||
            i.replyStatus;
  return '<div style="margin-top:6px;padding:6px 8px;border-radius:6px;background:' +
    (i.replyStatus === 'question' ? '#f1ebfb' : i.replyStatus === 'done' ? '#eaf3ee' : '#f6efe9') +
    '"><b style="font-size:11px">Claude · ' + esc(lab) + '</b><div class="rv-body">' +
    esc(i.reply) + '</div>' + (i.answer ? '<div class="rv-body" style="margin-top:4px"><b ' +
    'style="font-size:11px">You:</b> ' + esc(i.answer) + '</div>' : '') + '</div>';
}

/* ------------------------------------------------------------ export */
function exportFile() {
  if (!ST.items.filter(function (i) { return i.status !== 'done'; }).length) {
    toast('Nothing open to send.'); return; }
  var d = new Date(), pad = function (x) { return (x < 10 ? '0' : '') + x; };
  var stamp = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
              '-' + pad(d.getHours()) + pad(d.getMinutes());
  var out = {
    kind: 'ephe341-review', format: 1,
    deck: DECK, url: location.href.split('#')[0].split('?')[0],
    version: VERSION, saved: d.toISOString(), slides: Reveal.getTotalSlides(),
    howToRead: 'Each item names its slide (1-based) and, where there is one, the element it is ' +
      'about: a structural path from the slide section (fit.js .slide-body children count as the ' +
      'section\'s own), its kind, text and label. Geometry is in slide units (1280 x 720). ' +
      'text: before/after wording. move: before/after boxes and the scale. request: a note on an ' +
      'element. box: a note on a boxed area of the slide.',
    items: ST.items.filter(function (i) { return i.status !== 'done'; })
  };
  var blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'review-' + DECK + '-' + stamp + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  toast('Saved ' + a.download + ' to your Downloads. Tell Claude to work through it.');
}

/* ------------------------------------------------------------ wiring */
function ready() {
  if (window.DECK_PORTRAIT) {
    toast('Review mode is for a computer screen; open this on a laptop or desktop.');
  }
  if (ST.version && VERSION && ST.version !== VERSION && ST.items.length) {
    toast('This deck has been updated since your notes were made; check the pins still sit right.');
  }
  ST.version = VERSION;
  /* replies first: an item Claude has finished must not be re-applied on
     top of the deck that now carries the change */
  loadReplies(function () { reapply(); save(); });
  Reveal.on('slidechanged', function () { closePop(); endFrame(false); setTimeout(renderPins, 60); });
  Reveal.on('resize', function () { setTimeout(renderPins, 60); syncFrame(); });
  window.addEventListener('resize', function () { setTimeout(renderPins, 80); });
}
window.EPHE341_REVIEW = { state: function () { return ST; }, pathOf: pathOf, fromPath: fromPath,
                          select: select };
if (window.Reveal && Reveal.isReady && Reveal.isReady()) setTimeout(ready, 300);
else if (window.Reveal) Reveal.on('ready', function () { setTimeout(ready, 300); });
})();
