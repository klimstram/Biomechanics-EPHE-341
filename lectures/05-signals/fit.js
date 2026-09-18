/* ============================================================
   EPHE 341 — layout: headings, auto-fit, and holding still
   Runs in the PDF export too, so handouts never clip.
   ============================================================ */
(function () {
'use strict';

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

var fitTimer;
function fitSoon(sec) {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(function () { sec ? fitSlide(sec) : fitAll(); }, 60);
}

function revealScale() {
  var s = (window.Reveal && Reveal.getScale) ? Reveal.getScale() : 1;
  return s || 1;
}

/* ------------------------------------------------------------
   SHRINKING A BOX

   CSS zoom is the tidy way to do this — the box relaying out at the smaller
   size is exactly what we want — but a browser does not always hit-test a
   zoomed box where it paints it, and reveal has already put a transform on
   the slides container above us. On a slide whose body carries a zoom, a
   click aimed at a small target can land somewhere else entirely: the
   equation field on the grapher slide could not be typed into at all, while
   the identical field on a slide that happened to need no zoom was fine.

   So a body that holds something you have to click INTO is scaled with a
   transform instead, which is hit-tested reliably everywhere. A transform
   does not relayout, so the box is widened by the same factor first (which
   puts the content back across the full slide width once it is scaled down)
   and then given its visual height back, so whatever follows still flows.
   Everything else keeps using zoom.
   ------------------------------------------------------------ */
var TYPEABLE = 'input[type="text"],input:not([type]),input[type="number"],' +
               'textarea,[contenteditable="true"]';

function clearScale(el) {
  if (!el) return;
  el.style.zoom = '';
  el.style.transform = '';
  el.style.transformOrigin = '';
  el.style.width = '';
  el.style.height = '';
}

function setScale(el, s) {
  if (!el) return;
  if (!el.querySelector(TYPEABLE)) {
    el.style.transform = ''; el.style.transformOrigin = '';
    el.style.width = ''; el.style.height = '';
    el.style.zoom = s.toFixed(4);
    return;
  }
  el.style.zoom = '';
  el.style.transformOrigin = 'top left';
  el.style.transform = 'none';
  el.style.height = '';
  el.style.width = (100 / s).toFixed(3) + '%';
  var natH = el.offsetHeight;                 /* laid out at the wider width */
  el.style.transform = 'scale(' + s.toFixed(4) + ')';
  el.style.height = Math.ceil(natH * s) + 'px';
}

/* ============================================================
   2. RESERVE THE SPACE BEFORE ANYONE TOUCHES ANYTHING

   A readout that grows a line when you drag a slider pushes the controls
   below it down, and the controls jump back up when you drag away again.
   Rather than react to that, find out how tall each panel ever gets and
   reserve it up front.

   Sliders are safe to exercise — they are pure setters — so every range in
   a figure is swept once at boot and the tallest state each panel reaches
   becomes its min-height. Buttons are not swept (clicking one can start an
   animation or record a data point), so anything only a button can grow is
   caught by the same high-water mark the first time it happens.

   offsetHeight is used throughout because, unlike getBoundingClientRect, it
   is not affected by a zoom on an ancestor — which is exactly what the fit
   above puts there.
   ============================================================ */
var WATCH = ['.iread', '.icalc', '.ictls', '.itwork', '.iseries-tab',
             '.grow-tab', '.ipartlist', '.itermtab', '.ieqbox'];

function markMax(el) {
  /* Measure the NATURAL height: with a reservation already in place the element
     reports that instead, and min-height applies to the content box, so reading
     it back through offsetHeight would ratchet upward by the padding each pass. */
  var prev = el.style.minHeight;
  el.style.minHeight = '';
  var h = el.offsetHeight;
  el.style.minHeight = prev;
  if (!h) return;
  if (h > +(el.getAttribute('data-hw') || 0)) {
    el.setAttribute('data-hw', h);
    el.style.minHeight = h + 'px';
    el.style.boxSizing = 'border-box';
  }
}
function measurePlot(plot) {
  markMax(plot);
  WATCH.forEach(function (q) {
    Array.prototype.forEach.call(plot.querySelectorAll(q), markMax);
  });
}
function prewarm(plot) {
  if (plot.getAttribute('data-warmed') || plot.hasAttribute('data-nowarm')) return;
  /* A figure on a slide that is not on screen measures zero, so warming it there
     would reserve nothing and then mark it done. Wait until it is visible. */
  if (!plot.offsetHeight) return;
  plot.setAttribute('data-warmed', '1');
  measurePlot(plot);

  /* The interval chips on the "how many sections?" figure open a full working
     for that interval, which is taller than the chip row alone — and how many
     chips there are depends on the slider. So the chips are exercised at every
     slider position, not once at the end. They are pure selections; no other
     button is touched, because a click on one of those can start an animation
     or take a reading. */
  /* Mode selectors are safe to exercise: an interval chip or a segmented choice
     just picks what the figure shows. Action buttons are pressed twice, there
     and back, which starts and stops a play loop or toggles an overlay without
     leaving anything behind. Anything that would actually record something is
     marked data-unsafe by its widget and left alone. */
  function chips() {
    var list = Array.prototype.slice.call(
      plot.querySelectorAll('.icalc-chip:not([data-unsafe]), .iseg-b:not([data-unsafe])'));
    if (list.length) {
      var was = plot.querySelector('.icalc-chip.on, .iseg-b.on');
      list.forEach(function (c) { c.click(); measurePlot(plot); });
      if (was) was.click(); else { list[0].click(); list[0].click(); }
      measurePlot(plot);
    }
    Array.prototype.forEach.call(
      plot.querySelectorAll('.ibtn:not([data-unsafe])'), function (btn) {
        btn.click(); measurePlot(plot);
        btn.click(); measurePlot(plot);
      });
    /* A figure that records something as you press its buttons says so by
       marking the control that clears it, and that is pressed last. */
    var reset = plot.querySelector('[data-reset]');
    if (reset) { reset.click(); measurePlot(plot); }
  }

  var ranges = Array.prototype.slice.call(plot.querySelectorAll('input[type=range]'));
  if (!ranges.length) { chips(); return; }
  var keep = ranges.map(function (r) { return r.value; });
  function fire(r) { r.dispatchEvent(new Event('input', { bubbles: true })); }
  ranges.forEach(function (r, ri) {
    var lo = parseFloat(r.min), hi = parseFloat(r.max);
    if (!isFinite(lo) || !isFinite(hi) || hi <= lo) return;
    for (var k = 0; k <= 6; k++) {
      r.value = lo + (hi - lo) * k / 6;
      fire(r); measurePlot(plot); chips();
    }
    r.value = keep[ri]; fire(r);
  });

  /* One slider at a time misses the states that need two of them at once — a
     signal at the top of its range inside an A/D window at the bottom of its.
     Sweep them together as well, then put everything back. */
  [0, 0.5, 1].forEach(function (f) {
    ranges.forEach(function (r) {
      var lo = parseFloat(r.min), hi = parseFloat(r.max);
      if (isFinite(lo) && isFinite(hi)) { r.value = lo + (hi - lo) * f; fire(r); }
    });
    measurePlot(plot); chips();
  });
  ranges.forEach(function (r, ri) { r.value = keep[ri]; fire(r); });
  measurePlot(plot);

  /* Some figures reveal their working line by line after a click, so the tall
     state arrives a moment later than the click that caused it. Take a few
     more readings once those animations have finished. */
  [350, 900, 1600].forEach(function (ms) {
    setTimeout(function () {
      var before = plot.offsetHeight;
      measurePlot(plot);
      if (plot.offsetHeight !== before) fitSoon(plot.closest('section'));
    }, ms);
  });
}

function prewarmAll() {
  Array.prototype.forEach.call(document.querySelectorAll('.iplot'), prewarm);
}

/* ============================================================
   1. ONE BASELINE FOR EVERY HEADING

   Auto-fit used to zoom the whole slide, which moved the heading as well:
   a slide squeezed to 0.7 had its title 30 % higher up the page and 30 %
   smaller than the slide before it, so flipping through the deck made the
   titles jump around. Split each slide into a heading and a body, and zoom
   only the body. The heading is then always the same size in the same place.

   A title long enough to wrap still pushes its own body down — that is the
   one case where a slide is allowed to differ.
   ============================================================ */
function splitHead(sec) {
  if (sec.getAttribute('data-split')) return;
  sec.setAttribute('data-split', '1');
  if (sec.querySelector(':scope > .title-slide, :scope > .section-slide')) return;
  var kids = Array.prototype.slice.call(sec.children), i = 0;
  while (i < kids.length && /^H[1-4]$/.test(kids[i].tagName)) i++;
  if (!i) return;                                   /* no heading — leave it alone */
  var rest = kids.slice(i).filter(function (k) {
    return k.tagName !== 'ASIDE' && !/^ink-/.test(k.className || '');
  });
  if (!rest.length) return;
  var body = document.createElement('div');
  body.className = 'slide-body';
  sec.insertBefore(body, rest[0]);
  rest.forEach(function (k) { body.appendChild(k); });
}

function fitSlide(sec) {
  if (!sec) return;
  if (sec.querySelector(':scope > .title-slide, :scope > .section-slide')) {
    sec.style.zoom = ''; return;
  }
  splitHead(sec);
  /* reserve the room the figures need before measuring how much room they take */
  Array.prototype.forEach.call(sec.querySelectorAll('.iplot'), prewarm);
  var scale = revealScale();
  var body = sec.querySelector(':scope > .slide-body');

  if (!body) {                                       /* a slide with no heading */
    sec.style.zoom = '';
    var top = sec.getBoundingClientRect().top, bot = top;
    Array.prototype.forEach.call(sec.children, function (el) {
      if (el.tagName === 'ASIDE') return;
      var r = el.getBoundingClientRect();
      if (r.height > 0) bot = Math.max(bot, r.bottom);
    });
    var h = (bot - top) / scale, lim = fitLimit(sec);
    if (h > lim) sec.style.zoom = Math.max(FIT_MIN, lim / h).toFixed(4);
    return;
  }

  sec.style.zoom = '';
  clearScale(body);
  var sr = sec.getBoundingClientRect(), br = body.getBoundingClientRect();
  var headH = (br.top - sr.top) / scale;
  var bodyH = br.height / scale;
  var budget = fitLimit(sec) - headH;
  if (budget > 60 && bodyH > budget) {
    setScale(body, Math.max(FIT_MIN, budget / bodyH));
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

var PRINT = /print-pdf/gi.test(window.location.search);

if (window.Reveal) {
  /* the PDF layout is built after 'ready' — re-fit once it exists, or nothing fits */
  Reveal.on('pdf-ready', function () { prewarmAll(); fitAll(); });
  if (Reveal.isReady && Reveal.isReady()) fitSoon();
  else Reveal.on('ready', function () { fitSoon(); });
  Reveal.on('slidechanged', function (ev) {
    if (ev.currentSlide) {
      Array.prototype.forEach.call(ev.currentSlide.querySelectorAll('.iplot'), prewarm);
      fitSlide(ev.currentSlide);
    }
  });
  Reveal.on('resize', function () { fitSoon(); });
}
window.addEventListener('resize', function () { fitSoon(); });
window.addEventListener('ephe341-theme', function () { fitSoon(); });
/* the portrait/landscape switch rebuilds every figure — clear the reservations,
   which were measured against the old geometry, and take them again */
window.addEventListener('ephe341-layout', function () {
  Array.prototype.forEach.call(document.querySelectorAll('[data-hw]'), function (e) {
    e.removeAttribute('data-hw'); e.style.minHeight = '';
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-warmed]'), function (e) {
    e.removeAttribute('data-warmed');
  });
  setTimeout(function () { prewarmAll(); fitAll(); }, 120);
});
/* A slider no longer re-fits the slide: the room it needs is already reserved,
   and re-fitting on every input was itself a source of the jumping. A button
   can still grow a panel, so keep the high-water mark up to date after a click
   and re-fit only if that actually changed something. */
document.addEventListener('click', function (e) {
  var plot = e.target && e.target.closest && e.target.closest('.iplot');
  if (!plot) return;
  setTimeout(function () {
    var before = plot.offsetHeight;
    measurePlot(plot);
    if (plot.offsetHeight !== before && window.Reveal) fitSoon(Reveal.getCurrentSlide());
  }, 30);
});

/* Reveal's scroll view rebuilds every section into a .scroll-page wrapper after
   'ready', which drops the inline zoom just set. Re-fit once that has settled,
   and again on a scroll, so a slide is always fitted before it is read. */
[500, 900, 1600].forEach(function (ms) {
  setTimeout(function () { prewarmAll(); fitAll(); }, ms);
});
if (window.Reveal) {
  var vp = document.querySelector('.reveal-viewport');
  if (vp) vp.addEventListener('scroll', function () {
    var s = document.querySelector('.reveal .slides > section');
    if (s && !s.getAttribute('data-split')) fitSoon();
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
