/* ============================================================
   EPHE 341 — auto-fit
   Runs in the PDF export too, so handouts never clip.
   ============================================================ */
(function () {
'use strict';

/* ============================================================
   AUTO-FIT
   Nothing may run off the bottom of a slide. Measure the real content
   height and, when it is too tall, zoom that one slide down a little.
   Text reflows properly (zoom, not transform) and canvases stay sharp.
   ============================================================ */
/* The toolbar sits across the bottom-left corner on screen, so leave it room.
   The PDF export uses the SAME limit even though it has no toolbar: annotations
   are anchored to the slide box, so any difference here would shift written
   notes relative to the content they were drawn against. */
var FIT_LIMIT = 676, FIT_MIN = 0.58;

/* Portrait phones run a 720 × 1080 slide instead of 1280 × 720, so the budget
   is a different number. Measure the section we are about to fit rather than
   asking reveal for its config: the config can still be the old one while the
   layout is being rebuilt, and getting this wrong silently floors the zoom. */
function fitLimit(sec) {
  var h = (sec && sec.clientHeight) || 720;
  if (h === 720) return FIT_LIMIT;         /* the 16:9 case, unchanged */
  return Math.round(h - 70);               /* leave the toolbar its strip */
}

function contentHeight(sec) {
  var top = sec.getBoundingClientRect().top, bot = top, i, r;
  for (i = 0; i < sec.children.length; i++) {
    var el = sec.children[i];
    if (el.tagName === 'ASIDE') continue;
    r = el.getBoundingClientRect();
    if (r.height > 0) bot = Math.max(bot, r.bottom);
  }
  var scale = (window.Reveal && Reveal.getScale) ? Reveal.getScale() : 1;
  return (bot - top) / (scale || 1);
}

function fitSlide(sec) {
  if (!sec) return;
  if (sec.querySelector(':scope > .title-slide, :scope > .section-slide')) { sec.style.zoom = ''; return; }
  sec.style.zoom = '';
  var h = contentHeight(sec), lim = fitLimit(sec);
  if (h > lim) {
    sec.style.zoom = Math.max(FIT_MIN, lim / h).toFixed(4);
  }
}

function fitAll() {
  var all = document.querySelectorAll('.reveal .slides > section');
  Array.prototype.forEach.call(all, fitSlide);
  collapsePdfPages();
}

/* In the PDF export reveal sizes a too-tall slide to two sheets. Once it has been
   fitted it needs only one, so pull every page back to the single-sheet height. */
function collapsePdfPages() {
  var pages = document.querySelectorAll('.pdf-page');
  if (!pages.length) return;
  var base = Infinity, i;
  for (i = 0; i < pages.length; i++) base = Math.min(base, pages[i].offsetHeight);
  if (!isFinite(base) || base <= 0) return;
  for (i = 0; i < pages.length; i++) {
    if (pages[i].offsetHeight > base + 1) pages[i].style.height = base + 'px';
  }
}

var fitTimer;
function fitSoon(sec) {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(function () { sec ? fitSlide(sec) : fitAll(); }, 60);
}

var PRINT = /print-pdf/gi.test(window.location.search);

if (window.Reveal) {
  /* the PDF layout is built after 'ready' — re-fit once it exists, or nothing fits */
  Reveal.on('pdf-ready', function () { fitAll(); });
  if (Reveal.isReady && Reveal.isReady()) fitSoon();
  else Reveal.on('ready', function () { fitSoon(); });
  Reveal.on('slidechanged', function (ev) { fitSlide(ev.currentSlide); });
  Reveal.on('resize', function () { fitSoon(); });
}
window.addEventListener('resize', function () { fitSoon(); });
window.addEventListener('ephe341-theme', function () { fitSoon(); });
/* the portrait/landscape switch rebuilds every figure — re-fit after it */
window.addEventListener('ephe341-layout', function () { setTimeout(fitAll, 120); });
/* widgets can change height as you drag a slider — re-fit the live slide */
document.addEventListener('input', function (e) {
  if (e.target && e.target.type === 'range' && window.Reveal) fitSoon(Reveal.getCurrentSlide());
});
document.addEventListener('click', function (e) {
  if (e.target && e.target.closest && e.target.closest('.iplot') && window.Reveal) {
    fitSoon(Reveal.getCurrentSlide());
  }
});
/* Reveal's scroll view rebuilds every section into a .scroll-page wrapper after
   'ready', which drops the inline zoom fit.js just set. Re-fit once that has
   settled, and again on a scroll, so a slide is always fitted before it is read. */
[900, 1600].forEach(function (ms) { setTimeout(fitAll, ms); });
if (window.Reveal) {
  var vp = document.querySelector('.reveal-viewport');
  if (vp) vp.addEventListener('scroll', function () {
    var s = document.querySelector('.reveal .slides > section');
    if (s && !s.style.zoom) fitSoon();
  }, { passive: true });
}
if (PRINT) { [1400, 2200, 3200].forEach(function (ms) { setTimeout(fitAll, ms); }); }

/* ============================================================
   FREEZE THE CANVASES FOR PRINT
   Chromium's print pipeline quietly drops some <canvas> elements when a
   document carries a lot of them, which leaves blank panels in the PDF.
   Every figure in this deck is line art, so once the layout has settled we
   swap each canvas for a PNG of itself. What you see is then exactly what
   prints, and the drawing code never has to know about it.
   ============================================================ */
function freezeCanvases() {
  var list = document.querySelectorAll('.reveal canvas');
  Array.prototype.forEach.call(list, function (cv) {
    if (cv.getAttribute('data-frozen')) return;
    var r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var url;
    try { url = cv.toDataURL('image/png'); } catch (e) { return; }
    var img = document.createElement('img');
    img.src = url;
    img.className = cv.className;
    img.setAttribute('data-frozen', '1');
    img.setAttribute('alt', '');
    img.style.cssText = cv.getAttribute('style') || '';
    if (!img.style.width) img.style.width = r.width + 'px';
    img.style.height = 'auto';
    cv.setAttribute('data-frozen', '1');
    if (cv.parentNode) cv.parentNode.replaceChild(img, cv);
  });
}
if (PRINT) {
  [4200, 5600].forEach(function (ms) { setTimeout(freezeCanvases, ms); });
  window.addEventListener('beforeprint', function () { fitAll(); freezeCanvases(); });
}

})();
