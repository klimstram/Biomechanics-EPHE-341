/* ======================================================================
   Biomechanics Tutor: an anonymous online copy of the answer log.

   Marc, 30 Oct: students should not lose their history, and he wants to
   see how the class is doing; class patterns are enough, no names.

   - Every answer is still saved in the browser first (log.js). This file
     then sends it to the course's Supabase store (supabase-setup.sql) in
     small batches, and keeps trying until it gets through, so a dropped
     connection or a paused store loses nothing.
   - No names and no sign-in. Each browser makes a private sync code
     ("maple-orbit-river-42"). The store keeps only a scrambled form of it,
     so the instructor sees "learner 3f9a…", never who it is.
   - Typing the code on another device (or after clearing the browser)
     brings that history back; that device then uses the same code.
   - A student can switch sharing off under Your account; the browser copy
     carries on as before.
   - Optional accounts (supabase-accounts.sql; Marc, 30 Oct: "create an
     account like things"): a made-up username and a password, no email.
     The account keeps the student's sync code; signing in on another device
     fetches that code, then the history as above. Signing out removes the
     answers from this browser (for shared computers); they stay online.
   ====================================================================== */
(function () {
'use strict';

var CONF = window.TUTOR_ONLINE || {
  url: 'https://xdktnivmnbxrnpzlqzor.supabase.co',
  key: 'sb_publishable_pux5-DuXnEvPf68vaIS89g_T9xEfRo1'    /* public by design */
};
var LS = 'biomech-tutor-sync-v1';        /* { code, off, lastOk } */
var LS_SENT = 'biomech-tutor-sync-sent-v1';
var BATCH = 400;

var WORDS = ('amber anchor apple arrow aspen atlas autumn badge bamboo banjo basil beacon berry birch bison blossom ' +
  'bramble breeze brook cabin cactus camel canoe canyon cedar chalk cherry cinder clover cobalt comet copper coral ' +
  'cotton crane crater cricket crystal daisy delta denim desert dingo dolphin dove dune eagle ember falcon fern ' +
  'fiddle finch fjord flint forest fossil fox galaxy garnet gecko geyser ginger glacier granite grove gull harbor ' +
  'hazel heron hickory honey horizon husky iris island ivory jade jasper juniper kayak kelp kestrel kettle kiwi ' +
  'koala lagoon lantern larch lark lava lemon lilac lily lotus lynx magnet mango maple marble meadow melon mesa ' +
  'meteor mint moose moss nectar nickel nutmeg oasis ocean olive onyx opal orbit orca otter owl paddle panda ' +
  'papaya pearl pebble pecan pepper pine plum polar poppy prairie puffin quartz quill rabbit raven reef ridge ' +
  'river robin rocket rowan saffron sage salmon sapphire sequoia shell sierra silver sparrow spruce squirrel ' +
  'summit sunset swan tango thistle thunder tiger timber topaz trout tulip tundra turtle valley velvet violet ' +
  'walnut willow wren yarrow zephyr zinnia').split(' ');

function rnd(n) {
  var a = new Uint32Array(1);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return a[0] % n;
}
function newCode() {
  return WORDS[rnd(WORDS.length)] + '-' + WORDS[rnd(WORDS.length)] + '-' + WORDS[rnd(WORDS.length)] + '-' +
         String(10 + rnd(90));
}
function normCode(c) {
  return String(c || '').trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
}

function read(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

var st = read(LS, {});
if (!st.code) { st.code = newCode(); write(LS, st); }
var sent = {};
read(LS_SENT, []).forEach(function (id) { sent[id] = 1; });
function saveSent() { write(LS_SENT, Object.keys(sent)); }

var state = { busy: false, waiting: 0, error: '', lastOk: st.lastOk || null, offline: !navigator.onLine };
var listeners = [];
function changed() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); }

/* ------------------------------------------------------- talking to it */
async function rpc(fn, args) {
  var h = { 'Content-Type': 'application/json', 'apikey': CONF.key };
  if (/^eyJ/.test(CONF.key)) h.Authorization = 'Bearer ' + CONF.key;   /* an older "anon" key */
  var r = await fetch(CONF.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn,
    { method: 'POST', headers: h, body: JSON.stringify(args), cache: 'no-store' });
  var t = await r.text(), j = null;
  try { j = t ? JSON.parse(t) : null; } catch (e) {}
  if (!r.ok) {
    var err = new Error((j && (j.message || j.msg)) || ('HTTP ' + r.status));
    err.status = r.status;
    throw err;
  }
  return j;
}

/* ---------------------------------------------------------- sending */
function unsent() {
  return TutorLog.all().filter(function (e) { return !sent[e.id]; });
}
var timer = null, backoff = 0;
var DELAYS = [5, 30, 120, 600];        /* seconds between tries after a failure */
/* a new answer waits at most 2 s (answers in a quick run go together, but a
   steady stream does not keep putting the send off) */
function soon(sec) {
  if (timer && sec == null) return;
  clearTimeout(timer);
  timer = setTimeout(push, (sec == null ? 2 : sec) * 1000);
}
async function push() {
  clearTimeout(timer); timer = null;
  await TutorLog.ready;
  state.waiting = unsent().length;
  if (st.off || state.busy || !state.waiting) { changed(); return; }
  if (!navigator.onLine) { state.offline = true; changed(); return; }   /* 'online' event resumes */
  state.busy = true; changed();
  try {
    var list;
    while ((list = unsent().slice(0, BATCH)).length) {
      await rpc('tutor_add', { code: st.code, rows: list.map(function (e) {
        return { id: e.id, session_id: e.session_id, timestamp: e.timestamp, section: e.section,
                 question_number: e.question_number, step: e.step, action: e.action, details: e.details };
      }) });
      list.forEach(function (e) { sent[e.id] = 1; });
      saveSent();
    }
    backoff = 0; state.error = ''; state.offline = false;
    state.lastOk = st.lastOk = new Date().toISOString(); write(LS, st);
  } catch (e) {
    state.error = e.message || String(e);
    soon(DELAYS[Math.min(backoff++, DELAYS.length - 1)]);
  }
  state.busy = false;
  state.waiting = unsent().length;
  changed();
}

/* --------------------------------------------- a code from another device */
async function useCode(code, opts) {
  opts = opts || {};
  code = normCode(code);
  if (code.length < 12) throw new Error('That code is too short. It looks like four parts: word-word-word-number.');
  var all = [], after = 0, page;
  do {
    page = await rpc('tutor_history', { code: code, after: after }) || [];
    all = all.concat(page);
    if (page.length) after = page[page.length - 1].n;
  } while (page.length >= 1000);
  if (!all.length && code !== st.code && !opts.user) {
    throw new Error('Nothing is saved under that code yet. Check it for typos (it is on Your account on your other device).');
  }
  var fresh = await TutorLog.mergeEvents(all.map(function (r) {
    return { id: r.id, session_id: r.session_id, timestamp: r.timestamp, section: r.section,
             question_number: r.question_number, step: r.step, action: r.action, details: r.details };
  }), 'online');
  /* from now on this browser uses that code; what it has is sent under it */
  if (code !== st.code) { st.user = null; st.code = code; sent = {}; }
  if (opts.user) { st.user = opts.user; st.off = false; }
  all.forEach(function (r) { sent[r.id] = 1; });
  saveSent(); write(LS, st);
  soon(0.2);
  return { found: all.length, added: fresh.length };
}

/* ------------------------------------------------------------ accounts */
async function signUp(name, pw) {
  var r = await rpc('tutor_signup', { uname: name, pw: pw, code: st.code });
  if (r && r.error) throw new Error(r.error);
  st.user = r.username; st.off = false; write(LS, st);
  soon(0.2); changed();
  return { username: r.username, recovery: r.recovery };
}
/* forgot the password: the recovery code sets a new one, then signs in */
async function recover(name, code, newPw) {
  var r = await rpc('tutor_recover', { uname: name, recovery: code, new_pw: newPw });
  if (r && r.error) throw new Error(r.error);
  var got = await useCode(r.code, { user: r.username });
  changed();
  return { username: r.username, recovery: r.recovery, found: got.found, added: got.added };
}
async function newRecovery(pw) {
  var r = await rpc('tutor_new_recovery', { uname: st.user, pw: pw });
  if (r && r.error) throw new Error(r.error);
  return r.recovery;
}
async function signIn(name, pw) {
  var r = await rpc('tutor_login', { uname: name, pw: pw });
  if (r && r.error) throw new Error(r.error);
  var got = await useCode(r.code, { user: r.username });
  changed();
  return { username: r.username, found: got.found, added: got.added };
}
async function changePassword(pw, newPw) {
  var r = await rpc('tutor_change_password', { uname: st.user, pw: pw, new_pw: newPw });
  if (r && r.error) throw new Error(r.error);
  return true;
}
/* leave this browser: everything must be online first, then the browser's
   copy is removed and a fresh anonymous code starts */
async function signOut(force) {
  await push();
  var left = unsent().length;
  if (left && !force) return { waiting: left };
  await TutorLog.eraseAll();
  st = { code: newCode(), off: !!st.off }; sent = {};
  write(LS, st); saveSent();
  changed();
  return { waiting: 0 };
}

function setOff(off) {
  st.off = !!off; write(LS, st);
  if (!off) soon(0.2); else changed();
}

/* ---------------------------------------------------------------- start */
TutorLog.onChange(function (e) { if (e) soon(); });
window.addEventListener('online', function () { state.offline = false; soon(0.5); });
window.addEventListener('offline', function () { state.offline = true; changed(); });
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') soon(1);
  else if (unsent().length && !st.off) push();          /* leaving: try once more */
});
TutorLog.ready.then(function () { soon(1); });

window.TutorSync = {
  code: function () { return st.code; },
  off: function () { return !!st.off; },
  setOff: setOff, useCode: useCode, push: push, rpc: rpc,
  user: function () { return st.user || null; },
  signUp: signUp, signIn: signIn, signOut: signOut, changePassword: changePassword,
  recover: recover, newRecovery: newRecovery,
  state: function () { state.waiting = unsent().length; return state; },
  onChange: function (f) { listeners.push(f); },
  normCode: normCode
};
})();
