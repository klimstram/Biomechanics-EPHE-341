# CLAUDE.md — EPHE 341 course site

Read this before touching anything in this repo. It is the handoff for any agent
(Claude or otherwise) picking up the work of converting Marc Klimstra's EPHE 341
Biomechanics PowerPoint lectures (UVic) into reveal.js decks.

Last updated 2026-10-28 (after the first review-mode round on lecture 1b).

---

## 1. What this repo is

A static GitHub Pages site with no build step. **It is public**: anyone can read
everything in it, even if the repository itself is private.

```
index.html              the hub (front page)
hub/hub.css             hub styling
hub/lectures.js         the hub's data model: one entry per lecture   <- edited often
lectures/NN-short-name/ one self-contained reveal.js deck per lecture
tools/work-loop-simulator/   port of the Virtual Muscle Lab (Marc is a co-author)
README.md               publishing + how to add a lecture
.nojekyll               publish files untouched
```

Every deck folder holds its own copy of everything it needs:

```
index.html          the deck (slides are <section>s)
<deck>.js           that deck's widgets (e.g. kinetics.js, in1a.js, dy20.js)
<deck>data.js       measured data, when there is any (window.XXX = {...})
deck-core.js        shared widget runtime (Axes, slider, seg, label, ...)
fit.js              zooms each slide body to fit; also runs the print layout
mobile.js           portrait/phone layout + deep links on phones
annotate.js         per-browser pen annotations (localStorage)
deck-tools.js       toolbar
theme.css           styling (copied per deck, NOT shared at runtime)
handout.pdf         printed copy of the deck; regenerate on every slide change
assets/ or figs/    images
reveal/  icons/     byte-identical across decks; cp -R from another deck
app.webmanifest     set name/short_name for each new deck
```

### Lecture status (2026-10-27)

| hub n | folder | state |
|---|---|---|
| 1a | 01a-intro-and-review | done, 62 slides, 12 widgets. Consistency pass vs original done 2026-10-27 |
| 1b | 01b-linear-kinematics-review | done 2026-10-27: 100 slides (92 source + 7 widget slides + Sources), 7 widgets. Review round 1 (27 items) done 2026-10-28, `?v=20261028a` |
| 2–12, 14–20 | 02-… to 20-… | done |
| 13 | tools/work-loop-simulator | Virtual Muscle Lab port |
| 22, 23 | — | 2015 duplicates of projectile motion and signals; not planned |

Numbering trap: from angular kinematics on, **repo lecture N = PowerPoint
lecture N − 1** in the source filenames. Check the closing slide's "Next".

---

## 2. Working rules (Marc's standing instructions)

### Git and the repo
- **Marc commits and pushes himself.** Write files into the repo and stop. Never
  commit, push, branch, or open a PR.
- **Never run `git` in the connected repo**, not even `git status`. Without
  delete permission it leaves an `.git/index.lock` behind and that blocks Marc's
  next commit. Verify with `ls` and `md5sum`. If a lock appears, `mv` it aside;
  don't `rm` it.
- Repo path on Marc's Mac: `~/Documents/GitHub/Biomechanics-EPHE-341` (capital G).
- Before writing over a deck, make sure your copy descends from what is in the
  repo. A stale local copy once deleted two widgets that Marc then committed.
  Deletions in a diff mean stop. Count `<section`, `D.register('…'` and
  `data-widget="…"` on both sides.

### The voice: house rules (override everything older)
- These are **Marc's lectures, delivered by Marc.** Never write "his", "he",
  "his slide" or "his worked example" anywhere: slides, speaker notes, widget
  readouts, canvas labels, code comments, data keys. Write "we", "the slide",
  "the worked example", "source slide N".
- **Decks are not audits.** Nothing on a slide, in a note or in a widget says
  the source is wrong. Marc chose "strip them out entirely" for
  correction-style figures. If the original has an arithmetic slip, the deck
  shows the right answer silently, and you **report the slip to Marc in
  chat** (and record it in the project notes). Some older project notes
  (e.g. `ephe341-deck-gotchas-2.md`, "Drawing the answer") describe drawing
  the wrong value beside the right one. That practice is retired.
- **Don't invent wording.** Keep his text verbatim. A new sentence is allowed
  only where it supports what he is already saying (a caption naming what a
  figure shows).
- **Keep every source slide, one point per slide, in his order.** Don't merge
  slides, and don't skip "preamble" slides. His worked examples run
  problem → given → solve → conclusion, one slide each, and his arithmetic
  stays on the slide, not in the notes.
- Slide grammar: `<h2>` = the lecture section name; `<p class="subhead">` = the
  italic grey step name he uses ("Example Problem", "Solution", …).
- **Figures come after the build-up, not instead of it.** Restore his static
  slides in sequence, *then* put the interactive figure on the next slide.
- Widgets must serve one of his teaching points, not "here is something
  interesting in the data".
- **Ask before replacing one of his pictures** with your own; he has said
  "keep mine" more often than not. Exception: images that cannot ship (below).

### Public site: images and attribution
- **Nothing third-party ships**: publisher plates (McGinnis etc.), press photos,
  product shots, screenshots of other courseware, anything with a burned-in
  watermark or copyright line. Check near-white pixels for watermarks:
  `m = (a.min(axis=2) > 200) & (a.max(axis=2) < 250)`. Replace with a drawing
  that does the same job.
- **Every figure built from a measurement, model or someone else's asset gets a
  one-line credit under it, and every deck ends with a Sources slide.** Both are
  read from one block in the deck's data file (`IN1A.cite` in lecture 1a), so
  they cannot drift.
- SUSU youth motion dataset: University of Victoria, Zenodo
  doi:10.5281/zenodo.20504820 (all versions 10.5281/zenodo.20504819),
  CC BY 4.0. Cite the reserved DOI even though the record is still a draft
  (Marc's decision).

### Physics and anatomy correctness
- Build tangential velocity as ω × r from the radius vector, never from θ plus
  a hand-written trig identity. Assert perpendicularity numerically.
- Mirror his diagram's layout, not just his numbers.
- Rendered character figures (Mixamo rig): check joint directions against
  measured displacements, never by eye. Elbow flexion forward, external
  rotation swings the forearm out, pronation turns the palm down, top views
  have forward = up and the subject's right on screen right.
- Follow his rounding where a widget reproduces a worked example.

---

## 3. Tools and environment gotchas

- The agent usually runs in a cloud container, linked to Marc's Mac through a
  device bridge (`device_bash`, `device_stage_files`, `device_commit_files`).
  **The bridge drops.** Retry once, then work locally, stage the deliverable,
  and write to the repo when the bridge is back. Tell Marc whether it is
  actually in the repo; he will ask.
- `device_commit_files` **dedupes on the staged path**: re-committing from a
  path already used writes the OLD bytes and reports success. Stage every
  revision under a fresh folder (`/mnt/user-data/outputs/d1a`, `d1b`, …).
- Verify every commit: text files and PDFs by md5; images by **decoded pixel
  hash** (`hashlib.md5(Image.open(p).tobytes())`), because the bridge adds a
  C2PA chunk to PNG/JPEG/SVG.
- `reveal/` and `icons/` are byte-identical across decks: `cp -R` them on the
  device rather than committing them.
- The device VM is Linux (`md5sum`, not `md5`; no `sed -i ''`), with its clock
  on UTC.
- Don't fetch the web with curl/python when WebFetch fails. WebSearch is
  proxy-blocked for this org.
- When serving decks locally, never `pkill -f http.server`; start a new server
  on a new port.
- Patching files: python read-modify-write with `assert s.count(old) == 1`.
  Match the literal character (°, —, ϕ), never the `\uXXXX` escape. Never
  re-type a file's content from tool output. Before any `s[a:b]`, assert
  `a < b`. Avoid apostrophes inside single-quoted JS strings.

### Cache-busting
Every deck loads its local JS/CSS with `?v=YYYYMMDD[a-z]`. **Bump it whenever
any of them changes**, including a same-day second edit. A cached script with
a fresh `index.html` renders silently blank widgets.

### The hub
`hub/lectures.js` entry per deck: `slides`, `widgets` (count of `data-widget`
**instances**), `updated`, `handout`, and `live: [['label', 'section-id'], …]`.
Each `live` id must match a `<section id="w-…">` in the deck exactly once (deep
links survive inserting slides). Update the entry in the same change as the
deck, and remove the lecture from the "still PowerPoint" list when its card
goes up. Validate with `node -e "new Function(src)"`.

---

## 3a. Review mode: how Marc gives feedback (lecture 1b so far)

`review.js` sits in the deck folder and is loaded by `index.html` after `fit.js`.
It does nothing unless the page has `?review` in its address **and** is opened
from Marc's own computer (`file://` or localhost). On the published site it is
inert, so students cannot open it. It also never sends anything anywhere.

**What Marc does:** opens the deck from the repo folder with
`index.html?review`. Then he clicks an element and picks one of: Edit text,
Move / resize, Request change, or "Box + note" for an area of the slide. He
clicks **Send to Claude**, which saves `review-<deck>-<YYYY-MM-DD-HHMM>.json`
to his Downloads. His notes persist in localStorage, keyed
`ephe341-review:<deck folder>`.

**What the agent does when asked to "work through the review":**

1. Find the newest `review-<deck>-*.json`, in `~/Downloads` (request folder
   access) or in `lectures/<deck>/review/`. Copy it into
   `lectures/<deck>/review/`, which is git-ignored, so nothing in it is ever
   published.
2. For each item (`items[]`):
   - `where.slide` is the 1-based slide number, with `where.heading` and
     `where.notes` ("Source slide N…") to find it in the slide builders.
   - `target.path` is a structural path from the `<section>`. It counts
     `.slide-body` children as the section's own, e.g. `div:2/p:0`. The
     element is also identified by `target.text`, `target.label`
     (figure aria-label), `target.widget` and `target.src`.
   - **text:** replace `before` with `after` in the source. Keep Marc's
     wording exactly as typed.
   - **move:** `before`/`after` are boxes in slide units (1280 × 720) and
     `scale` is the resize. Reproduce the *look* through the layout (column
     split, figure caps, order). Do not use absolute positioning. Then check
     portrait and print.
   - **request / box:** `note` is the request. `box` is the area in slide
     units; screenshot that slide to see it. An `answer` field is Marc's
     reply to an earlier question.
3. Rebuild, verify (§4), bump `?v=`, write the deck to the repo.
4. Write `lectures/<deck>/review/replies.js` (git-ignored) as
   `window.EPHE341_REPLIES = { deck, updated, items: { "<item id>": { status:
   "done"|"question"|"notdone", reply: "…", at: "<ISO time>" } } };`.
   Keep replies from earlier rounds and give each new reply a new `at`.
   Review mode loads that file and shows each reply on its item: done items
   grey out, questions get a "?" pin and an Answer box, and answers come back
   in the next export.
5. Tell Marc in chat what was done, item by item, in brief.

**Round 1 on 1b (2026-10-28) set these patterns; reuse them for other decks:**

- **Math is LaTeX (KaTeX 0.16.11).** Slide math is typeset at build time:
  the builders write `<tex-i>…</tex-i>` (helpers `T`, `TL`, `W` in
  `slides/tex.py`), and `mkindex.py` pipes every one through `texr.js`
  (node + the `katex` npm package) into KaTeX HTML, so the page needs only
  `katex/katex.min.css` and the woff2 fonts. Those ship in the deck folder
  (`katex/`, with KaTeX's MIT `LICENSE`), so it works offline, on file://
  and in print. `katex/katex.min.js` is loaded too, only for widget
  working, which `texLayer(u, ax)` in `parts/_head.js` lays over the canvas
  in container units. Tables of values stay plain text. Use sin/cos/tan,
  not SIN/COS/TAN.
- **Animated figures keep the slide's own SVG.** An `<svg data-anim="name">`
  is handed to `AN[name]` in `parts/_anim.js` when its slide opens and put
  back when it closes. What prints is the drawn figure; pieces that exist
  only while playing are `data-hide`, and a drawn frame replaced by a live
  one is `data-static` next to a `data-live` group. Animators: `pointlight`,
  `along` (route + optional trace, count, end reveal), `grow`
  (spreadsheet rows `data-k`, plot paths `data-grow`, optional rotatable
  3D), `polar`, `imagewalk` (COM from Dempster/Winter segment
  fractions), `box3d` (drag), `mocap`, `comp` (vector components grow from
  the tail or slide to the tip). Click a figure to replay it. The
  SOH-CAH-TOA buttons (`.trigbtns` → `svg[data-fig="tri"] [data-side]`)
  live there too.
- **Figure label sizes are one band.** `fontaudit.py` measures every SVG
  label on the built deck. `slides/tscale.json` maps each figure's
  aria-label (first 40 characters) to a factor that puts its typical label
  near 19.5 px, and `F()` in `svg.py` applies it, also as `data-ts` for text
  drawn live. Changing a figure's size changes its labels, so re-run the
  audit. Body text on a figure slide is `.small` (25.2 px) and must not be
  zoomed down by `fit.js`: fix the overflow, don't accept the zoom. Use
  `F(mh=…)` (an inline max-height) to cap a figure. Note that `tallfig` is
  `!important`.
- **A sequence that reuses a figure gets a fixed band.** On the A, B, C
  slides, `.abc-top` (262 px for the row, `.short` 124 px for single
  vectors) holds the card. The figure height is set from its viewBox
  (`ABC_PX`), so the figure sits in the same place at the same size.
- Character renders for 1b (`figs/leg_swing.png`, `body_sil.png`,
  `segment.png`) come from `osim/figs1b.py`. Joint pixel positions are in
  `slides/figs1b.json`.

## 4. Verification before handing anything over

1. Widget self-test (lecture 1a: `stest.py` runs `selftest.js`, currently
   130/130; lecture 1b: 83/83, including the animated figures).
2. Layout at 1280×720, 1600×900, 1920×1080 and portrait 430×932: no slide
   content overflowing its box, console clean, no image aspect drift.
3. Print: `index.html?print-pdf`, export the handout at
   `width 13.93in × height 7.8333333in` (Playwright `page.pdf`). **Render the
   handout pages and look at the widget pages.** Clipped readouts are
   invisible to every automated check.
4. Screenshot each changed slide and compare it against the rendered original
   page. Turn transitions off first.
5. Grep the shipped files for "his", "he ", "printed", "wrong", "error" (audit
   language) before writing to the repo.

---

## 5. Where things are

### Source material (on Marc's Mac)
- Lectures: `~/Desktop/EPHE 341/2026/2020/Lectures/` (also mirrored in OneDrive
  `…/EPHE 341/2026/2020/Lectures/`). Use the **2026** tree; the 2021–2025
  copies are older files with the same names. Rendered PDFs are in the
  `lecture pdf YYYY/` subfolders, and are often the source of record because
  equations were pasted as images.
- Data: `SUSU_youth_motion_dataset_public_release_v2/`, `Data_2_Share/`,
  `opensim-models-master/`, `Subject15/`, `Subject16/` (connected folders).
- Companion apps: `Biomechanics-Tutor/` (Shiny app; grades with zero tolerance,
  so enter the rounded value it expects).

### Build sources
The decks in this repo are **built outputs**. For lecture 1b the generators
are `slides/part1–4.py` (one function call per source slide, in order),
`slides/figsA/B/C.py` (SVG figures), `slides/svg.py` (primitives),
`slides/cite.py` (reads `IN1B.cite` from `in1bdata.js`), and
`parts/_head, _geom, _kin, _w1…_w6, _tail.js` concatenated by `build.sh`
into `in1b.js`; `mkindex.py` writes `index.html`. These generators, like
lecture 1a's (and the Mixamo rendering pipeline `osim/`), lived in the
agent's session workspace and are **not in this repo**, so a new agent cannot
rebuild 1a or 1b from source.
For small changes, edit the shipped `index.html` / `<deck>.js` in place with
exact-match replacements; that is how most revisions have been done. For lecture
1a the concatenation order is `_head, _geom, _body, _w1…_w11, _tail` into
`in1a.js`.

### Project notes (claude.ai project "powerpoint to reveal.js")
One conversion note per lecture (`claude/ephe341-<lecture>-conversion.md`,
plus `-revision`/`-audit` notes) and these cross-cutting ones:
`ephe341-house-rules.md` (read first), `ephe341-deck-gotchas.md` and
`-gotchas-2.md` (layout, fit.js, print, tooling traps),
`ephe341-sources-and-attribution.md`, `ephe341-course-site.md`,
`ephe341-portrait-mobile.md`, `ephe341-print-overflow-check.md`,
`ephe341-companion-apps-tutor-and-vml.md`.

---

## 6. Open items

- **Lecture 1b (Linear kinematics review)** was built from Marc's own
  `EPHE341(1b-linear kinematics review).pptx` (2020, 92 slides, md5
  560c3776b3ea0387b96f63f4c61874b0, identical in every year folder) and its
  render `lecture pdf 2020/EPHE341(1b-linear kinematics review).pdf`. **Do not
  use** `Lecture pdf 2022/linear kinematics review.pdf`: its title slide reads
  "EPHE 201 Biomechanics, Drew Commandeur, PhD, © 2020". It is another
  author's adaptation, and Marc chose his own version for the public site.
- Slips in the **original** 1b pptx, shown corrected (silently) in the deck
  and reported to Marc: slides 39–40, tip-to-tail resultant 6.5 km → 6.2 km
  (it is 6.24 km at 7.5°, which the slide's "8°" already matches); slides
  70–73, E-W sum 426.6 km → 426.5 km (375.0 + 296.0 − 244.5), so
  C = 682.2 → 682.1 km (α stays 51.3°); slide 16, image axes labelled Y
  across and X down → x across, y down, as the slide's own caption says.
- 1b content that is in the deck but differs from the source, by necessity:
  every photo and screenshot (football broadcast, phone GPS app, stock
  objects, mocap and GPS figures from elsewhere, Galileo portrait, Bolt press
  photos, timing-gate and IMU figures) is redrawn as inline SVG doing the same
  job. Slide 84 (a Bolt photo with a video cue in the notes) became a title
  card "100 m final, Beijing 2008 · Usain Bolt · 9.69 s" with the note kept.
- Slips in the **original** 1a pptx, reported to Marc and shown corrected
  (silently) in the deck: slide 24 row 7 example; slide 30 roots (½ and 2,
  not ½ and 1); slide 38 c = 0.1705 m, not 0.3227 m.
- Other decks have not had the attribution pass (per-figure credits + Sources
  slide) or the full voice pass. Lecture 1a is the pattern.
- `fit.js` print/scroll-view selector fix is only in lectures 11, 14–20, 1a.
- Review mode (`review.js`) is only in 1b. To add it to another deck, copy
  `review.js`, add `<script src="review.js?v=…"></script>` after `fit.js`,
  and bump `?v=`. `.gitignore` already covers `lectures/*/review/`.
- `app.webmanifest` in decks 2–12 still says "Impulse and Friction".
- Publisher figures in lectures 14–19 are waiting on Marc's decision.
- Section-title cards in 1a and 1b overflow by 2–7 px at large viewports (cosmetic).
- Every lecture in the hub's list is now a deck except 13 (VML, a tool page)
  and the 2015 duplicates 22 and 23.
