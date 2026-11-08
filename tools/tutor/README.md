# Biomechanics Tutor: plain-JavaScript version

The Tutor as an ordinary web page: no Python, no Shinylive. It reads
`Master_questions.csv` and the figures in `www/Images/`, both in this folder.

**This folder is the source of record** (Marc, 2026-11-07). It came from
this folder in the Tutor repo (`~/Documents/GitHub/biomech tutor/Biomechanics-Tutor`),
which still holds the Shiny app; that app is unchanged and keeps working, but
it reads the CSV out of its own `app.json` bundle, so it only picks up a
question change after a re-export. Edit the questions here.

Open this folder on the published site. On your own computer you can also just
double-click `index.html`. Browsers do not let a page opened from a folder
read the CSV next to it, so the folder carries a copy of the questions in
`questions.js`, and the page uses it only in that case. The published site
always reads the CSV itself.

**After editing `Master_questions.csv`, double-click `Update questions.command`**
(or run `python3 update-questions.py` here) to refresh that copy. Until you
do, opening the page from the folder shows the older questions, and the main
page says how old its copy is.

## Sections

All 14 sections in the CSV are switched on. `READY` at the top of `tutor.js`
can limit the main page to a list of section names (e.g. while checking a new
section). `null` means all of them. A new `section` value in the CSV adds a
new button by itself, as in the Shiny app.

Links straight to a problem work, e.g. `#/s/projectile-motion/3`, so a
lecture slide can point at a specific question.

## Behaviour

Try first. A question opens with only the problem and the answer box.

- A right answer first time: "Solved on your own", and the `solution` opens.
- A wrong answer opens the steps (one per CSV row, in order), one at a time.
  Students can also open them before trying ("Not sure how to start?").
- A step picked right first time opens the next step.
- A step picked wrong shows that option's `feedback_N`, and the option stays
  marked. The student keeps choosing until they find the right one. That step
  is probably where their working went wrong, so they are then sent back to
  the full question. Right: solved. Wrong again: the next step opens.
- Options are lettered A–D and shuffled, but always in the same order for a
  given step.
- The first pick at each step is remembered. When the question is solved, the
  summary names the first step picked wrong ("Your working first went off at
  step 3"), or says the working was sound if every step was right first time.
- The final answer must fall within `min_value`–`max_value` and have the right
  units.
- Once a step is answered, its right answer and its right option's
  `feedback_N` (the reasoning or working, without a leading "Correct") are
  added to **Your working so far** under the open step, so the working grows
  as the steps are answered. When the question is solved, by any route, the
  whole sequence is shown, every step with its answer and reasoning, then the
  final answer. The worked `solution` is folded underneath. Friction has full
  rationales as the model for the other sections.
  - The final answer row shows the last calculation, so it follows on from the
    steps above it, then "Accepted answer". It uses `feedback_1` of the final
    (no-option) row when that has text (Friction has these); otherwise the
    last part of the written `solution`, after its last numbered or question
    heading.
- **New numbers on a retake** (`variants.js`; Basic Math only, as a pilot):
  - The first time, a question shows the numbers in Master_questions.csv.
  - Once a student has solved it, taking it again ("Try this question again",
    or opening it on a later visit) gives new numbers, marked "New numbers".
    The question, the step options that hold numbers, the accepted answer,
    the final working and the written solution all follow them.
  - Each set is logged as a `new_numbers` action, e.g.
    `V_f=18, a=1, d=12; answer=17.32`, so answers can be read against it.
  - Each question in `variants.js` keeps the CSV wording with the numbers
    put in, and a rule for picking new numbers within reason. Its self-test
    checks that the CSV's own numbers give back the CSV text exactly, so an
    edit to the CSV wording needs the same edit there.
  - My Performance starts a new attempt after a solve or on a new visit.
- **Calculator:** two places, the same calculator (and history) in both.
  - A **Calculator** button above the answer box opens it inside the question
    card, full width, with the keys in four rows (functions left, number pad
    right; on a phone the usual seven rows). It stays open from question to
    question until closed.
  - A tab on the right edge opens it at the side. On a computer it takes the
    right half of the window and the page moves over (nothing is covered);
    on a phone it fills the screen.
  - "Open at the side" and "Put in the question" move it between the two.
  - It has + − × ÷, powers, roots, sin/cos/tan and their inverses (DEG or
    RAD), ln, log, eˣ, 10ˣ, π, e, EE, n!, |x| and Ans.
  - Type or tap; implied multiplication such as 2π or 3(4) works.
  - **Use as my answer** puts the result into the answer box.
  - Recent results are kept on the device. The maths is a small parser in
    `calc.js` (no eval).
- Text is Markdown with KaTeX maths, `$…$` inline and `$$…$$` display.
- **Your account** is the person button at the top right (it shows the
  username once signed in). There is no "Download My Data" button any more;
  a backup file is still under Your account → Other ways to keep a copy.

The log gains two actions: `guided_start`, with `after a wrong answer` or
`chose the steps` in `details`, and `retry_full`, with `after step N`, when a
fixed step sends the student back to the full question. Everything else is
logged as in the Shiny app.

Other differences from the Shiny app:

- Units are compared ignoring case, so `no units` matches `No units` and `rpm`
  matches `RPM`. Units the CSV uses that the Shiny list lacks (e.g. `rad`) are
  added to the list.
- Maths (`$…$`, `$$…$$`) is set aside before the Markdown step, so a formula
  with underscores, `\\` or `\{` renders instead of showing as raw text.
- A step whose wording repeats an earlier one ("What is the next step?") but
  with different options is kept; the Shiny app drops it. Exact repeats are
  still left out.
- A `correct_option` written as a letter (A–D) counts as that position.
- A missing figure shows its file name instead of a broken image.
- Stray Mac Roman bytes in the CSV are read as the characters they were (’ and
  –) instead of "�".
- Progress on a question is kept while switching questions during a visit, and
  there is a "Try this question again" button.
- Each `---` in a solution is drawn as a divider, and each part is rendered on
  its own, so bold headings after a divider display properly.

## The answer log

Each answer is logged in the Shiny app's columns:
`user_id,timestamp,section,question_number,step,action,details`. Two columns are
added, `session_id` and `id`. `user_id` is now one id per browser, so the history
spans visits, and `session_id` marks each visit. **My Performance** shows the same
blocks as the Shiny app, over all visits or this visit only.

It is kept on the student's device in IndexedDB, with a second copy in
localStorage, and the browser is asked to protect it from automatic clean-up.
Students can save a **backup file** (CSV) and **restore** it. A restore merges,
so nothing is counted twice. That file also restores the history on a new
browser or device. History from the Shiny version on the same site is brought
in once, automatically and read-only. The page reminds students to save a backup
once 40 answers are not in one.

## The online copy and class results (Supabase)

`sync.js` sends every answer, without names, to the course's Supabase project
(set up once with `supabase-setup.sql`, already run). The project URL and its
public "publishable" key are at the top of `sync.js`; both are meant to be
public. The database only lets the page add answers and fetch one student's own
history by their code (see the comments in `supabase-setup.sql`).

- Answers are saved in the browser first, then sent in batches within a couple
  of seconds. Offline, or if the store is paused, they wait and are retried, so
  nothing is lost.
- Each browser makes a private **sync code** (e.g. `tundra-forest-maple-58`),
  shown on **Your account**. Entering it on another device (or after clearing
  the browser) brings that history back, and the device then uses that code.
  The store keeps only a scrambled form of the code.
- Students can turn sending off on **Your account**; the browser copy carries on.
- **Optional accounts** (`supabase-accounts.sql`, run once in Supabase after
  `supabase-setup.sql`): a made-up username and a password, no email.
  - Signing in on another device brings the history there.
  - Signing out removes the answers from that browser (for lab computers); they
    stay in the account.
  - Passwords are stored as bcrypt hashes. After 10 wrong tries an account
    waits 15 minutes.
  - Once a student has a few answers, the main page suggests making an account
    (with **Not now**).
  - Without an account, the private sync code still works; it is under
    **Other ways to keep a copy** on Your account.
- **Forgotten passwords, without email:**
  - Each account gets a **recovery code** when it is made, shown once with
    **Copy** and **Save as a file**.
  - Under **Forgot your password?** the student enters the code and a new
    password, and gets a fresh code. Signed-in students can make a new code.
  - Or the instructor resets it on the admin page: `#/instructor` →
    **Student accounts**. Find the username, **Reset password**, then tell the
    student the suggested temporary password. That page lists every account,
    when it was made, the last sign-in, and whether it is waiting after too
    many wrong tries.
- **Class results** for the instructor: open `#/instructor` (not linked
  from the menu) and enter the instructor key set in Supabase. It shows:
  - which steps' first picks are most often wrong;
  - for each question: right first time (each student's first ever answer;
    retakes, on any visit, do not count), used the steps, sent back;
  - a date filter and **Export all answers (CSV)**.

  Clicking a question opens it on the instructor side
  (`#/instructor/<section>/<n>`): the question, its numbers, and every step
  with its right answer and how often the first pick was wrong. **Open as a
  student** is a separate link. The first time a browser opens class results,
  it stops sending its own answers, so trying questions there doesn't count as
  a student; this can be turned back on under Your account.
- If the Supabase free project pauses after a quiet week, restore it in the
  Supabase dashboard; students' answers wait in their browsers meanwhile.
- To change the instructor key, run only the last statement of
  `supabase-setup.sql` in the Supabase SQL Editor with a new phrase.

## A copy in a folder (Chrome and Edge)

`folder.js` keeps the same history file in a folder on the student's computer.
A web page cannot write to Documents by itself, so the student chooses the
folder: the picker opens in Documents, and the Tutor makes a
`Biomechanics Tutor` folder inside it with `tutor-history.csv` (the backup
file's format).

- It is offered under **Your account → Other ways to keep a copy** (there is
  no pop-up for it any more, since answers are saved online).
- The folder is remembered, but the Tutor asks before using it on every visit
  ("Use your Biomechanics Tutor folder this visit?"). Until the student says
  yes, nothing is read from or written to it.
- Allowing reads the file and merges anything this browser lacks (e.g. after
  clearing browsing data). From then on, the file is rewritten after each answer.
- Erasing the browser's history leaves the file alone. **Stop using this
  folder** (under Your account) only forgets the folder; the file stays.
- Safari, Firefox, iPhone and iPad cannot do this; there the page says to use
  **Save a backup file** instead.

## Offline

`sw.js` caches the app and the questions after the first visit, and the
figures of each section once a student opens it, so the Tutor keeps working
without a connection.
Students can also add it to their Home Screen. **When you change any file in
this folder, bump `?v=` in `index.html` and `VERSION` in `sw.js`**, or returning
visitors keep the old copy. Changes to the CSV need no bump: the questions are
always fetched fresh when online.

## Files

`index.html`, `tutor.css`, `tutor.js` (the app), `log.js` (the answer log),
`folder.js` (the copy in a folder), `sync.js` (the online copy), `calc.js` (the calculator),
`variants.js` (new numbers on a retake),
`instructor.js` (class results), `supabase-setup.sql` and `supabase-accounts.sql` (the store, run once in Supabase),
`questions.js` + `update-questions.py` + `Update questions.command` (the folder copy),
`icons.js` (Tabler icons, MIT), `sw.js`, `manifest.webmanifest`, `icons/`, and
`vendor/` (KaTeX 0.16.11 and marked 15, both MIT, licences included).
