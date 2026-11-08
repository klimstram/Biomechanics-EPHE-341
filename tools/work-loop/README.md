# Work loop simulator — the plain-JavaScript page

The Virtual Muscle Lab, rebuilt as an ordinary web page. It replaces
`tools/work-loop-simulator/`, which was the same three widgets hosted inside a
one-slide reveal.js deck.

Developed by **Jim Martin**, **Jenna Link** and **Marc Klimstra** — University
of Utah and University of Victoria. The original is at
<https://jimmartinutah.github.io/VML/>.

## What is here

| file | what it is |
|---|---|
| `index.html` | the page: the banner, three panels, the theme switch and the about box |
| `vml.js` | the model and the three widgets — **the source of record** |
| `wl-core.js` | the lecture decks' widget runtime (`deck-core.js`) with the reveal parts removed |
| `base.css` | the lecture decks' theme, with `.reveal` rewritten to `.wl-root` |
| `work-loop.css` | the page itself: the reset, the root, the panels, the phone rules |
| `sw.js` | caches the whole folder, so it works offline after the first visit |
| `icons/` | the two institutional marks and the app icons |

Nothing is fetched from anywhere. The page is about 215 KB in total.

## What changed from the reveal version

Only the scaffolding. `vml.js` carries the model unchanged, and the table still
reads 27.15 / 28.28 / 31.71 / 33.18 J at the app's defaults, −1.63 J at 4 Hz
and −1.56 J at an onset/offset of 10 / 40.

- **reveal.js, `fit.js`, `mobile.js`, `annotate.js` and `deck-tools.js` are
  gone** — about 2.4 MB of it. The page is not a slide, so there is nothing to
  scale: the figure is rebuilt at the width the stage actually has, which is
  what the widget always preferred anyway.
- **The figure fills the window.** On a slide its height was a fixed 400 units
  because the slide was a fixed 720. `figH(chrome, lo, hi)` in `vml.js` now
  takes whatever the window has left once the banner, the table and the
  readout are paid for. The two pedal-stroke pages are capped lower than the
  model page: they draw a rider beside the plots, and the rider scales with
  the panel until it crowds its own caption.
- **Sliders paint their starting value.** In the decks that was a side effect
  of `fit.js`'s prewarm, which sweeps every range and puts it back. `slider()`
  in `wl-core.js` does it directly.
- **The banner switches panels itself.** `Reveal.slide(n)` became a class on
  one of three `<section>`s, and the page fires `wl-page` (which stops the
  animation on the panel being left) and `ephe341-layout` (which the widgets
  already listen for, and which is how the figure learns its new width).
- **The phone no longer relies on reveal's scroll view.** `data-portrait` is
  set from the window width at load and on turning the device, the widget tab
  strip scrolls sideways rather than widening the page, and nothing else is
  allowed to overflow.

## Working on it

There is no build step. Open `index.html`, or serve the folder.

- Bump `?v=` on every local file in `index.html` **and** `VERSION` in `sw.js`
  whenever any of them changes. A cached script with a fresh `index.html`
  renders a blank widget.
- `vml.js` is `_head.js + _w4.js + _tail.js` from the deck pipeline and is the
  only copy of the widget source. To put a widget back into a lecture, lift
  the block between `D.register('<name>', …)` and its closing `});`.
- Drop the official University of Utah mark in as `icons/utah.svg` and it
  replaces the PNG with no code change. Use a reversed (white) version: the
  banner is U of U red in both themes.
