# EPHE 341 — Biomechanics

The course site. A front page that lists the lectures, and each lecture as a self-contained
reveal.js deck in its own folder.

```
index.html                                  the front page
hub/hub.css                                 how it looks
hub/lectures.js                             what it lists   ← the only file you edit often
lectures/
  03-calculus-and-kinematics/               one lecture, self-contained
    index.html                              the deck
    handout.pdf                              a printed copy
    README.md                                how that deck is built
.nojekyll                                   publish the files as they are
```

## Publishing it

It is a plain static site — no build step, nothing to install, nothing running on a server.

1. Push this folder to a GitHub repository.
2. **Settings → Pages → Build and deployment**, source **Deploy from a branch**, pick the
   branch and `/ (root)`.
3. A minute later it is at `https://<you>.github.io/<repo>/`.

Every path is relative, so it works at that address, at a custom domain, or opened straight
off disk. The empty `.nojekyll` tells Pages to publish the files untouched instead of running
them through Jekyll.

> A GitHub Pages site is **publicly readable even when the repository is private** — only
> Enterprise plans can gate it. Worth deciding on purpose.

## Adding a lecture

1. Drop the deck folder into `lectures/`, named `NN-short-title`.
2. Give it an entry in `hub/lectures.js` with a `path`:

```js
{ n: '4', title: 'Forces',
  path: 'lectures/04-forces',
  blurb: 'One or two sentences.',
  slides: 42, widgets: 12, updated: '2026-10-01',
  handout: 'handout.pdf',
  live: ['what is interactive', 'what is real data'] },
```

The card links to `<path>/index.html`. If a deck's entry file is named something else, add
`file: 'whatever.html'` to its entry.

Entries **without** a `path` are listed at the bottom of the page as not yet converted. The
ones there now were read out of `2026/2020/Lectures/` in filename order, duplicate numbering
and all — prune them to the lectures you actually teach.

## A few things that carry across the whole site

**One theme.** The front page and every deck share `localStorage['ephe341-theme']`, so
switching to light on one switches it everywhere.

**Writing on the slides** (`A` for the pen, `D` for a board) is stored per browser *and per
site*. Notes made on the published site and notes made on a local copy are two separate sets,
and neither is in this repository. If you are lecturing from the published URL, annotate there
— and export the handout from there too.

**Handouts.** Each deck prints itself: open it with `?print-pdf` and print. Add `&clean` for a
copy without your written notes. Tick *Background graphics* in the print dialog and give the
page a couple of seconds before printing, so the figures have time to settle.

The `handout.pdf` in each lecture folder is just a pre-made copy so students have something to
download. Delete it if you would rather keep the repository light — nothing links to it unless
the lecture's entry names it.
