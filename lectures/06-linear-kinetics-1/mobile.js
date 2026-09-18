/* ============================================================
   EPHE 341 — portrait mode

   A 16:9 slide on a phone held upright is 390 px wide and 219 px tall.
   Nothing legible fits in that. So on a portrait phone the deck stops
   being 16:9 and becomes a tall 2:3 page instead: the same slides, the
   same widgets, restacked into one column at a readable size.

   Everything here is driven by ONE flag, set before the widgets boot:

     window.DECK_PORTRAIT   true while the portrait layout is in force
     html[data-portrait]    the CSS hook for the same thing

   Load this BEFORE deck-core.js / interactives.js so the figures are
   built at the right size the first time.
   ============================================================ */
(function () {
'use strict';

/* Portrait geometry. 720 × 1080 is 2:3 — close enough to a phone that the
   slide nearly fills the screen, and wide enough that 30 px type renders
   around 16 px on a 390 px display. */
var P_W = 720, P_H = 1080, P_MARGIN = 0.028;
var L_W = 1280, L_H = 720, L_MARGIN = 0.045;

/* Only phones and small tablets held upright. A narrow desktop window is
   left alone — someone dragging a window thin does not want the deck to
   reshape itself under them. */
var MAX_W = 820;

function wantPortrait() {
  if (/print-pdf/gi.test(window.location.search)) return false;   /* handouts stay 16:9 */
  var w = window.innerWidth, h = window.innerHeight;
  if (!w || !h) return false;
  if (w > MAX_W) return false;
  if (h <= w) return false;                                       /* landscape: 16:9 is fine */
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  return coarse || w <= 520;
}

/* Set the flag as early as possible — the widgets read it at construction, and
   the deck's own Reveal.initialize merges DECK_GEOM so the very first layout is
   already portrait rather than flashing 16:9 and then reflowing. */
window.DECK_PORTRAIT = wantPortrait();
window.DECK_GEOM = window.DECK_PORTRAIT
  ? { width: P_W, height: P_H, margin: P_MARGIN }
  : {};
if (window.DECK_PORTRAIT) document.documentElement.setAttribute('data-portrait', '1');

function apply(portrait) {
  if (portrait) document.documentElement.setAttribute('data-portrait', '1');
  else document.documentElement.removeAttribute('data-portrait');
  window.DECK_PORTRAIT = portrait;
  if (window.Reveal && Reveal.configure) {
    Reveal.configure(portrait
      ? { width: P_W, height: P_H, margin: P_MARGIN }
      : { width: L_W, height: L_H, margin: L_MARGIN });
  }
}

/* Reveal is configured in the page's own inline script, which runs after this
   file. Re-apply once it is ready so the very first layout is portrait. */
function boot() {
  if (!window.Reveal) return;
  apply(wantPortrait());
}
if (window.Reveal && Reveal.isReady && Reveal.isReady()) boot();
else document.addEventListener('DOMContentLoaded', function () {
  if (window.Reveal) { try { Reveal.on('ready', boot); } catch (e) {} }
});

/* ---- switching mode ----
   Turning the phone rebuilds every figure. The canvases were sized for the
   old geometry and there is no honest way to reflow a drawing, so the
   widgets are torn down and constructed again. Any figure the reader had
   part-way through resets, which on a rotation is what you would expect. */
var current = window.DECK_PORTRAIT, timer;
function recheck() {
  var want = wantPortrait();
  if (want === current) return;
  current = want;
  apply(want);
  if (window.DECK && window.DECK.reboot) window.DECK.reboot();
  else if (window.EPHE341_REBOOT) window.EPHE341_REBOOT();
  window.dispatchEvent(new Event('ephe341-layout'));
}
function soon() { clearTimeout(timer); timer = setTimeout(recheck, 180); }

window.addEventListener('resize', soon);
window.addEventListener('orientationchange', soon);

})();
