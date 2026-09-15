# EPHE 341 — Calculus and Kinematics (reveal.js)

A web version of `EPHE341(3-calculus and kinematics).pptx`, rebuilt as native HTML
with **interactive, animated figures** in place of the static PowerPoint graphs.

Everything is self-contained: reveal.js, images and scripts are all in this folder,
so it works offline with no internet connection and no build step.

---

## Run it locally

**Easiest — just open it.** Double-click `index.html`. It opens in your browser and
works fully offline.

**Better — serve it** (a local server avoids browser file:// restrictions and makes
the URL hash / deep links work cleanly):

```bash
cd "ephe341-calculus-kinematics"
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Host it

The folder is plain static files — upload it as-is to any of these:

| Where | How |
|---|---|
| **UVic Brightspace** | Zip the folder, upload under *Content → Upload → Create a File/Web Page*, link to `index.html` |
| **GitHub Pages** | Push the folder to a repo, enable Pages on the branch — done |
| **Netlify / Cloudflare Pages** | Drag the folder onto the deploy area |
| **UVic web space / any server** | Copy the folder into your public web directory |

No server-side code, no database, nothing to configure.

---

## Theme

The deck ships with **two complete themes** and a toggle — the ☀/☾ button in the bottom-left
corner, or just press **T**. Your choice is remembered in the browser.

| | |
|---|---|
| **Slate dark** (default) | Deep blue-slate ground, cyan structure, coral for the live line. Graphs glow; best in a darkened lecture theatre. |
| **Editorial light** | Near-white paper, UVic navy, burnt-orange highlights, hairline rules. Best in a bright room, and what the PDF export uses. |

Every figure repaints itself when you flip — the charts are drawn live, not baked images, so
their axes, curves and highlight colours all change with the theme.

**Handouts always print light**, whatever the screen is set to, so `?print-pdf` needs no fiddling.

To change the default, edit the one line near the top of `index.html`:

```js
t = localStorage.getItem('ephe341-theme') || 'dark';   // 'dark' or 'light'
```

### The badge

A typographic UVic badge sits top-right on every slide. It is set in the deck's own type —
**not** the official university wordmark. To use the real mark, drop the file in as
`assets/uvic-logo.png` (or .svg) and swap the badge markup in `index.html` for:

```html
<img class="mark" src="assets/uvic-logo.png" alt="University of Victoria">
```

It is styled to sit at 34px tall and inverts automatically for the dark theme.

---

## Presenting

Four buttons sit in the **bottom-left corner**. They stay faded until you move the mouse,
so they don't distract during a lecture, and they never appear in the PDF export.

| Button | Does |
|---|---|
| **Slides** | Opens the slide menu — every slide by number and heading, with a filter box. Type a heading (`riemann`, `tangent`) or a slide number, arrow up/down, Enter to go. Shortcut **M**. |
| **Full screen** | Goes full screen; the same button then reads **Exit full screen**. (`F` and `Esc` also work.) |
| **Presenter view** | Opens speaker notes in a second window; the button then reads **Stop presenting**, which closes that window and leaves full screen in one click. |
| **☀ / ☾** | Switch between the dark and light theme (`T`). |
| **?** | Keyboard-shortcut card. |

### Presenting on a second screen

Plug in the projector or second display, then click **Presenter view**.

In **Chrome or Edge**, the browser may ask for permission to manage windows — allow it once,
and from then on the deck does the arranging for you: speaker notes go to the second screen,
the slides go full screen on your laptop. One click, nothing to drag.

In **Safari and Firefox** (and if you decline that permission) the speaker window opens on
your current screen — drag it across to the second display, then click **Full screen** on the
slides. The on-screen message tells you which case you're in.

Speaker view shows your notes, the current and next slide, a running timer, and a clock.
It stays in sync both ways, so you can advance slides from either window.

**Speaker notes** from the original PowerPoint are all carried over.

> Pop-up blockers will stop the presenter window. If nothing opens, allow pop-ups for the
> page and click again. Everything works whether you open the file directly or serve it.

### Other keys

| Key | Does |
|---|---|
| `→` / `Space` | Next slide |
| `←` | Previous slide |
| `Esc` or `O` | Slide overview grid |
| `S` | Presenter view |
| `F` | Full screen |
| `B` | Blank/black the screen |
| `Ctrl/Cmd + F` | Search the deck |
| `Alt + click` | Zoom into a region |

### Export to PDF (handouts)

1. Open `index.html?print-pdf` in **Chrome** (Chrome only — Safari/Firefox won't lay it out correctly).
2. `Cmd/Ctrl + P` → Destination **Save as PDF** → Layout **Landscape** → Margins **None** → tick **Background graphics**.

---

## Interactive figures

Twenty-nine of the graphs are live — sliders, play buttons, and live numeric readouts
instead of a fixed picture. Nothing is required to use them; they show a sensible default
state if you just page through.

| Slide | Figure | What students can do |
|---|---|---|
| 2 | **Race video** | A video panel on the learning-outcomes slide. Paste a YouTube link once and it plays inside the slide; the choice is remembered in the browser. See *The race video* below |
| 3 | **The 2009 Berlin 100 m final** | Three lanes seen from above — Bolt, Gay, Powell — with **distance, speed and acceleration** graphs below and the Δd/Δt and Δv/Δt calculations running live in a side panel. **All three** (with a comparison table) or any one runner. Scrub the time or hit **Run the race**. Real data — see below |
| 4, 5 | Slope of the d–t and v–t curve | Drag the second point, or hit **Sweep**. The rise/run equation below the graph fills in with the actual numbers at every step: v = Δd/Δt = (16.00 − 0.00)/(2.00 − 0.00) = 8.00 m/s |
| 6 | d → v → a, all by slope | One time cursor across three stacked graphs, with the tangent drawn on the top two and dashed arrows carrying each slope down to the next. The panel beside it shows both quotients and the three current values |
| 7 | Average vs. instantaneous | Preset buttons for **1 – 6 sections** above the slider, then the slider takes it to 24. Every section's answer appears as a chip; click one for its full Δd/Δt working. Replaces the three separate slides the PowerPoint used |
| 9 | Tangents | Slide the point along the curve, then shrink the zoom window — the inset magnifies until curve and tangent are the same line |
| 10 | Secant → tangent | Close the gap between A and B; compare the secant slope to the true instantaneous velocity |
| 11 | Graphical differentiation | A **projectile** — a ball thrown straight up, h(t) = 20t − 4.9t². Draw tangents one at a time along the flight path; each slope drops onto a second graph below. The apex reads slope zero, and the finished lower graph is a straight line: constant −9.8 m/s² |
| 15, 16 | c·tⁿ explorer | Change c, n and b and see the curve respond |
| 19, 46 | Transfer functions | Change c and n; the original and its derivative (or integral) are plotted together with the algebra spelled out |
| 12 | **Graphing calculator** | Type a polynomial or drag a, b, c, d and the curve follows. The derivative equation is built term by term underneath, in the colour of its curve, and can be plotted over the top |
| 13 | **y = mx + b, assembled** | The equation builds itself symbol by symbol as the slide opens. Hover a symbol and its meaning lights up below; hover a meaning and the symbol lights up. Same for v(t) = mt + b |
| 14 | **Every term is c·t<sup>n</sup>** | The rule, with hover-linked parts, beside a live term splitter: type any equation and it is broken into terms, each colour-matched across the equation, the c/n table and a dashed curve. The solid curve is their sum |
| 18 | **Curve fitting** | A random scatter around a hidden trend and a least-squares polynomial chasing it. Orders 1 to 9, live R², residual lines, a scatter slider and a **Show the trend** reveal. Order 9 threads every point and R² still climbs — that is the lesson |
| 19, 22, 47, 52, 53 | **The transfer function, animated** | c·t<sup>n</sup> ⟶ n·c·t<sup>n−1</sup> (and the integral form) plays in beats — the exponent is spotted, drops to the front as a multiplier, then steps down. A concrete term follows the same beats; chips try it on others |
| 20, 21, 48, 49 | **Worked, step by step** | Split into terms, transform one term per press, assemble the answer — in the original slide's own wording. The equation box is live, so any polynomial rebuilds the whole worked example |
| 24 | Velocity dataset | **Collect data** grows the plot and the table together, one sample at a time |
| 26 | Finite difference | Step through the dataset one interval at a time. **The Δt / Δv / acceleration table fills in as it goes**, with the row being calculated highlighted, and the working written out underneath |
| 27 | Finite difference | The same figure without the table — velocity in, acceleration out |
| 28 | **Golf swing** | A **real** motion capture — CMU subject 64, 120 Hz, markers on the club shaft as well as the body — strobed beside the club head's kinematics. **Club head** (path length, speed, d\|v\|/dt) or **club angle** (θ, ω, α), a ±1–±8 frame difference window, and a **vs constant α** overlay of the original slide's assumption. See *The golf swing* below |
| 31 | Area of a rectangle | Change the height (acceleration) and width (time); area = velocity |
| 32, 33, 50 | Cumulative sum | Accumulate one second at a time; watch velocity build from the acceleration rectangles |
| 34, 35, 36 | Riemann sum | 2 → 160 rectangles, switch between lower / upper / middle / trapezoid, with live **% error vs. the true area** |
| 45 | Integral sum | Step through the data; each strip's area is highlighted as the running total builds, and b₀ shifts the whole curve |
| 51 | Initial values | Slide b₀ and watch the whole curve translate without changing shape |
| 59, 60, 61 | **The phone trial** | The real accelerometer trial, live, beside the **real video analysis** — both measured, both scrubbable. One panel each: position, acceleration, velocity. On the acceleration and velocity slides, **Overlay accelerometer** draws the phone's own sensor over the video trace for the same three seconds |
| 62 | **Video kinematics in full** | All three video panels at once: y is measured, v and a are finite differences of it, and the side panel shows that arithmetic for the frame under the cursor. Buttons switch the difference window between ±1 and ±5 frames |
| 63 | **Why integration drifts** | All three panels plus two controls: **Offset removed / Raw signal**, and a slider for the assumed resting value. A running "where the phone ends up" readout turns green or red. This is the punchline of the section — see below |

### Where the numbers come from

Everything in the deck is real data, not invented:

- The velocity series (5 Hz, 0 → 2 s) and the d(t) = −t³ + 6t² worked example were read
  straight out of the PowerPoint's own embedded charts.
- **The video analysis is the real one.** The three Tracker screenshots in the original
  deck (mass A: t–y, t–v, t–a) were digitised pixel by pixel — see below.
- **The 100 m on slide 2** is the 2009 Berlin World Championship final — the medallists.
  Every curve uses the standard sprint model

  ```
  d(t) = vmax [ (t − t₀) + τ ( e^(−(t−t₀)/τ) − 1 ) ]
  ```

  | | Time | Reaction | In the figure |
  |---|---|---|---|
  | **Bolt** | 9.58 WR | 0.146 s | **solid** — fitted to his measured 10 m splits |
  | **Gay** | 9.71 | 0.144 s | **dashed** — modelled |
  | **Powell** | 9.84 | 0.134 s | **dashed** — modelled |

  Official times and reaction times are the championship results. Bolt's 10 m splits
  (1.89, 2.88, 3.78, 4.64, 5.47, 6.29, 7.10, 7.92, 8.75, 9.58 s) are the published set from
  the IAAF/DLV biomechanical report of that championship; the model fits them with
  **vmax = 12.22 m/s, τ = 1.241 s**, RMSE 0.11 m over the whole race, and his segment speeds
  peak at 12.35 m/s over 60–70 m — consistent with the reported 12.32 m/s top speed.

  **Gay's and Powell's in-race shape is modelled, not measured**: they keep Bolt's τ with
  vmax solved so the model finishes 100 m at their official time. That is why they are drawn
  dashed, and why the figure says so on screen.

#### Dropping in the real splits

The widget upgrades itself. In `interactives.js`, near `W.sprint`:

```js
var RUNNERS = [
  { key: 'bolt',   name: 'Bolt',   time: 9.58, rt: 0.146,
    splits: [1.89, 2.88, 3.78, 4.64, 5.47, 6.29, 7.10, 7.92, 8.75, 9.58] },
  { key: 'gay',    name: 'Gay',    time: 9.71, rt: 0.144, splits: null },
  { key: 'powell', name: 'Powell', time: 9.84, rt: 0.134, splits: null }
];
```

Replace a `null` with that runner's ten cumulative 10 m split times and nothing else needs
changing: the page least-squares fits vmax and τ to them on load, switches that runner from
dashed to solid, and starts plotting their measured split points and segment speeds and
accelerations. The fit is a small coarse-to-fine grid search in the page itself — it
reproduces Bolt's published constants (12.2192 m/s, 1.2411 s) exactly.

*Why they are not already in:* I could not retrieve Gay's and Powell's 10 m splits — web
search is blocked by policy in the environment this deck was built in, and both the IAAF
report PDF and the LMU splits archive refuse automated fetches. Bolt's splits are
corroborated by your own `LABORATORY_1_-_100m_sprint-1.pdf`, whose 20 m table gives
2.89 / 4.64 / 6.31 / 7.92 / 9.58 for 2009 — within 0.02 s of the set used here.

### The race video

Slide 2 has a video panel. No clip is bundled — pick one once:

1. Click **Search YouTube for it ↗** in the panel (opens a search in a new tab).
2. Copy the link of the upload you want.
3. Paste it into the panel's box and press **Load**.

It is then remembered in that browser, and from then on the slide shows a poster with a play
button; clicking it plays **inside the slide**. **Change video** on the panel resets it. There is
also an *Open on YouTube ↗* link if you would rather send it to a full tab.

To set a default for everyone (so a fresh browser already has it), add one line near the top of
`index.html`, above the other scripts:

```html
<script>window.EPHE341_RACE_VIDEO = 'PASTE_THE_LINK_OR_ID';</script>
```

The video needs an internet connection — the rest of the deck does not.

### The phone trial (slides 59–62)

`data/imu.js` holds the trial exactly as recorded: **729 samples of
`accelerometerAccelerationY` in G, at ~100 Hz over 7.29 s**, with the sensor's own
timestamps. Nothing else is stored — the slides compute everything from those two arrays:

```
a(t) = −9.81 × (g − offset)          offset = the resting reading, −0.89728 G
v(t) = Σ a·dt                        d(t) = Σ v·dt      (real dt, sample by sample)
```

That reproduces the corrected position column of `Book3.xlsx` to a correlation of 0.9999.

### The golf swing (slide 28) — real motion capture

`data/golf.js` is **CMU Graphics Lab Motion Capture Database, subject 64, trial 01** — a golf
swing, 45 optical markers at 120 Hz. The database is free to copy, modify and redistribute
(mocap.cs.cmu.edu). Nothing on this slide is modelled.

**The club is measured too.** Markers `WEP1/WEP2/WEP3` sit on the shaft, 461 mm and 195 mm
apart and rigid to about 1 mm. The club head is that line extended until the head rests on the
floor at address — **83 mm past WEP3**, which puts it **1.039 m from the hands**. So the head's
position comes out of the capture, not out of an assumption about club length.

**The drawing is a true frontal-plane projection.** The feet lie along the lab x axis, so the
target line is x and the frontal plane is x–z. `golf.js` stores each joint as that projection
in metres, flipped so the target is to the right, with the origin at the ball. It also stores
the **full 3D** club-head and hand positions (`tip3`, `hand3`), so the speeds and accelerations
on the right are the real ones and not just what a camera would see.

The window is the whole swing — 275 frames, 2.29 s: takeaway at frame 0, top at 128, impact at
198. It is a relaxed lab swing: **24.8 m/s (55 mph)** at the ball, hands peaking at 4–5 m/s.
Say so when you show it; it is not a tour drive, and that is fine.

Everything on the right is a finite difference of the measured positions, with a selectable
**±1 / ±2 / ±4 / ±8 frame** window. The trade-off is real and worth showing: ±1 keeps the peak
at 24.8 m/s but the acceleration is ragged; ±8 is smooth and flattens the peak to 18.6 m/s.
That is the practical face of "the derivative is a limit", and the reason biomechanists filter
before differentiating.

**vs constant α** overlays the original slide's assumption on the angular panels — constant
angular acceleration sweeping the same angle in the same time. The measured ω is nowhere near
a straight line, and α is nowhere near flat.

θ is the shaft angle *as the face-on camera sees it*, which is what the original slide's graph
was measuring too.

### The video trial (`data/video.js`)

The original deck showed the video analysis as three Tracker screenshots. Those pictures
have been **digitised back into numbers**: the plot frame and gridlines locate the axes, and
every red data marker is found as a connected blob and turned into a (t, value) pair. The
black polyline splits each marker in two, so blobs at the same x are merged back together.

That recovers **92 frames at exactly 30 fps** — the fitted frame spacing came out at
0.03333 s, and the marker times sit on that grid to better than a third of a frame.

Tracker's length scale had been set in **millimetres**, so the on-screen numbers are 1000×
the SI values (−457 on the chart is −0.457 m). `data/video.js` stores metres, m/s and m/s².

Three independent checks say the digitisation is sound:

| Check | Result |
|---|---|
| Differentiate the digitised y → compare with the digitised v | r = 0.9997, slope 1.005, RMSE 0.007 m/s |
| Differentiate that v → compare with the digitised a | r = 0.9987, slope 0.999, RMSE 0.06 m/s² |
| Tracker's own status bar read `t = 2.600 s, ay = −104.5 m/s²` | the digitised value at that frame agrees |

And the payoff: cross-correlating the video acceleration against the accelerometer trace
shows **they are the same trial** — the video covers IMU time 3.63 s → 6.67 s, with
**r = 0.98**. That is why slides 60, 61 and 62 can overlay them. Two instruments, one drop,
the same acceleration — while the *integrated* accelerometer position drifts away from the
video's 0.46 m, which is exactly the lesson of slide 63.

**Slide 61 is the one to spend time on.** Three states, all from the same recording:

| | Where the phone ends up |
|---|---|
| Offset removed, set to the resting value | **+0.09 m** — back where it started |
| **Raw signal** (gravity never removed) | **+233 m** |
| Offset wrong by just **5 mG** | **+1.39 m** |

The last row is the real lesson: an error far inside the sensor's own noise is worth more than
a metre of drift over seven seconds, because a double integration integrates the error too.
Drag the slider a notch and the readout flips from green to red. That is why the video
analysis is there for comparison.

> A note on the spreadsheet: its left-hand "naive" columns integrate the raw signal in **G**
> units with a fixed 0.02 s step, so their numbers (−13 m/s, −71 m) are a rough illustration
> rather than a calculation. The deck recomputes from the raw column in m/s² with the real
> sample interval, which is why the raw-signal figure reads +233 m instead. Same point,
> correct arithmetic.

---

## Putting it on the web

It is a plain static site — no build step, no server code, nothing fetched at runtime except
the YouTube embed on slide 2. **GitHub Pages serves it as-is:** commit this folder, turn Pages
on for the branch, done. Every path in it is relative, so it works both at a domain root and
at `username.github.io/repo-name/`. The empty `.nojekyll` file tells Pages to publish the
files untouched rather than running them through Jekyll.

15 MB in total, largest single file 2.3 MB — nowhere near any limit.

Two things are actually *better* hosted than opened from disk: the race video on slide 2
embeds properly over https, and full screen and presenter view behave the way they should on
a secure origin.

**Two things to know before you publish.**

A GitHub Pages site is **publicly readable even when the repository is private** (only
Enterprise plans can restrict it). This deck carries your accelerometer trial, your video
analysis and the CMU capture — none of it secret, but decide deliberately rather than by
accident.

**Writing is stored per browser and per site**, in `localStorage`. Notes you make on the
hosted copy and notes you make on a local copy are two separate sets, and neither travels in
the repository. If you are lecturing from the hosted URL, annotate there — and export the PDF
from there too.

## Writing on the slides

Press **A** (or the **Write** button) and the deck becomes something you can write on.

| | |
|---|---|
| **P** | pen |
| **R** | arrow — drag from where you want the tail to where you want the head |
| **H** | highlighter |
| **N** | typed note — click, type, Enter to place it, Esc to abandon |
| **E** | eraser — click or drag across a mark to remove that mark |
| **1 – 5** | pen colour |
| **Z** / **X** | undo · clear this page |
| **Esc** | put the pen away |

Everything is anchored to the slide itself, not to the window, so it stays where you put it
when the window is resized, when the deck goes full screen, and when the same deck is laid
out for print. Navigation still works while the pen is out; the interactive figures do not,
because the pen has to catch the clicks — press **A** again to go back to driving them.

A small **annotated** mark appears in the bottom-right corner of any slide that has writing
on it, so you can see at a glance which ones you have marked up.

### Blank boards

Press **D** (or the board button) for a blank board over the current slide — a dark
**blackboard** by default, or a **whiteboard** with the circle button. The same pens work.
Each slide can hold several board pages: **+** adds one, the arrows move between them, and
the counter shows where you are. Leaving the slide closes the board; the pages stay with
that slide.

### Printing what you wrote

`?print-pdf` draws every mark onto its slide, and every board page becomes a page of its own
straight after the slide it belongs to, labelled *Board — slide N*. Blackboards print as
white paper with dark ink, so a handout does not empty a toner cartridge.

Print with **`?print-pdf&clean`** for a copy without any of it.

Writing is kept in this browser (`localStorage`), not in the files, so it survives a reload
and it is still there for the PDF export — but it does not travel with the folder if you
copy the deck to another machine. **? → Erase every annotation in this deck** wipes the lot
before a new cohort.

Two things worth knowing when you print. Tick **Background graphics** in the browser's print
dialog, and give the page a couple of seconds before you hit print: the figures are drawn on
canvas and are frozen to images for printing, which takes a moment on a deck this size.

## Editing

| File | Contains |
|---|---|
| `index.html` | All 64 slides |
| `theme.css` | Both themes, as one set of CSS custom properties |
| `interactives.js` | The interactive figures (plain JavaScript, no libraries) |
| `deck-tools.js` | The full-screen / presenter-view / theme toolbar |
| `fit.js` | Auto-fit — shrinks any slide whose content would run off the bottom, and freezes the figures to images for printing |
| `annotate.js` | Writing on the slides: pen, arrows, highlighter, typed notes, boards, and their print layer |
| `data/imu.js` | The phone accelerometer trial — 729 raw samples from `Book3.xlsx` |
| `data/video.js` | The video (Tracker) trial — 92 frames of y, v and a, digitised from the original screenshots |
| `data/golf.js` | A real golf swing — CMU mocap subject 64, 275 frames of 21 joints plus the club head |
| `figs/` | Static SVG figures — editable in Illustrator/Inkscape, or as text |
| `assets/` | Photos, animated GIFs and screenshots lifted from the original deck |
| `reveal/` | reveal.js 5.2.1 — don't edit |

Each slide is one `<section>` element. Equations are plain HTML (`<sup>`, `<sub>`, and a
`.frac` helper) rather than a maths library, so they're easy to change and need nothing loaded.

To add a step-reveal, put `class="fragment"` on any element.

To reuse an interactive figure on another slide, copy its one-line placeholder, e.g.

```html
<div class="iplot" data-widget="riemann" data-start="12"></div>
```

Widget names: `series-reveal`, `golf`, `secant`, `sections`, `tangent`, `tangent-zoom`,
`tangent-travel`, `slope-transfer`, `power-rule`, `finite-diff`, `cumulative`, `riemann`,
`integral-sum`, `initial-value`, `area-rect`, `line-explorer`, `sprint`, `video`, `imu`.

---

## Known differences from the PowerPoint

- Graphs that were drawn with PowerPoint shapes have been **redrawn** — from the underlying
  equations and chart data, so the numbers are identical, but the visual styling is new and consistent.
- Slides 59–63 originally showed the accelerometer *and* the video charts as pictures. Both are
  now live: the accelerometer panels are computed from the raw trial data, and the video panels
  are the digitised Tracker series, so every figure responds to the cursor, the offset control
  and the finite-difference window.
- The summary tables on slides 21 and 52 are kept as images from the original.
- **All of the original slide text is still on the slides.** Where an interactive figure replaced
  a static picture, the wording that went with that picture was kept — on the merged
  "average and instantaneous" slide it runs across four short columns, and the worked
  integration steps sit beside the table on slide 44. The only deliberate change is the
  spelling of *Riemann*, which the original had as "Reimann".
- **Auto-fit.** Every slide is measured after layout, and any that would overflow is zoomed
  down just enough to fit (never below 58%, and it leaves the bottom toolbar room on screen). It runs on load, on resize, when the theme
  changes, and when a widget grows — and in the PDF export too, so handouts stay one slide
  per page. If you add text to a slide it will simply shrink to fit rather than clip.
- **The deck is 64 slides.** The learning outcomes and the 100 m figure are separate slides —
  outcomes plus the race video first, then the measured race. The three "average and instantaneous" slides (old 6, 7, 8)
  are now one interactive slide, since the section count is a row of buttons and a slider rather
  than three fixed pictures.
- Slides cross-fade with a soft 18px lift (headings hold still), and every heading sits at the same height
  so nothing jumps as you page through.
