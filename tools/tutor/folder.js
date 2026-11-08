/* ======================================================================
   Biomechanics Tutor: a copy of the answer log in a folder on the
   student's own computer.

   Marc, 30 Oct: "can you get the tutor to create a folder and file in
   their local documents folder or ask them permission to? Also could you
   then ask permission each time to access it?"

   A web page cannot write into Documents by itself. What it can do, in
   Chrome and Edge on a computer (the File System Access API), is let the
   student pick a folder; the picker opens in Documents. The Tutor then
   makes a "Biomechanics Tutor" folder inside the one they picked and keeps
   tutor-history.csv there (the same file as "Save a backup file").

   - The folder is remembered (its handle is kept in this browser), but the
     Tutor asks before using it on every visit. Saying yes reads the file,
     merges anything not already in this browser (e.g. after browsing data
     was cleared), and from then on rewrites the file after each answer.
   - Safari, Firefox, iPhone and iPad have no folder access: there the page
     says so and the backup file is the way to keep a copy.
   ====================================================================== */
(function () {
'use strict';

var SUB = 'Biomechanics Tutor';
var FILE = 'tutor-history.csv';
var DB = 'biomech-tutor-folder', ST = 'handles';
var NOASK = 'biomech-tutor-folder-noask';      /* "don't ask again" (until set up) */

var supported = typeof window.showDirectoryPicker === 'function' && window.isSecureContext !== false;
var dir = null;            /* the "Biomechanics Tutor" folder, if one was chosen */
var parentName = '';
var on = false;            /* allowed for this visit */
var lastError = '';
var lastWrite = null;
var listeners = [];
function changed() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); }

/* ------------------------------------------------- remembering the folder */
function openDB() {
  return new Promise(function (res) {
    try {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(ST); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = r.onblocked = function () { res(null); };
    } catch (e) { res(null); }
  });
}
async function kv(mode, key, val) {
  var db = await openDB(); if (!db) return null;
  return new Promise(function (res) {
    try {
      var tx = db.transaction(ST, mode), s = tx.objectStore(ST);
      var r = mode === 'readonly' ? s.get(key) : val === undefined ? s.delete(key) : s.put(val, key);
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { res(null); };
      tx.oncomplete = function () { db.close(); };
    } catch (e) { res(null); }
  });
}

/* The self-test swaps this for its own store: the test browser cannot read
   a folder handle back out of IndexedDB, which Chrome and Edge can. */
var store = window.TutorFolderTestStore || {
  get: function () { return kv('readonly', 'dir'); },
  put: function (v) { return kv('readwrite', 'dir', v); },
  del: function () { return kv('readwrite', 'dir'); }
};

/* ------------------------------------------------------ reading, writing */
async function permission(ask) {
  if (!dir) return 'none';
  if (!dir.queryPermission) return 'granted';
  var o = { mode: 'readwrite' };
  var p = await dir.queryPermission(o);
  if (p !== 'granted' && ask) p = await dir.requestPermission(o);   /* needs a click */
  return p;
}
async function readFile() {
  try {
    var fh = await dir.getFileHandle(FILE);
    return await fh.getFile();
  } catch (e) { return null; }       /* not there yet */
}
var writing = null, again = false, timer = null;
async function writeNow() {
  if (!on || !dir) return;
  if (writing) { again = true; return writing; }
  writing = (async function () {
    try {
      var fh = await dir.getFileHandle(FILE, { create: true });
      var w = await fh.createWritable();
      await w.write('﻿' + TutorLog.toCSV(TutorLog.all()));
      await w.close();
      lastWrite = new Date(); lastError = '';
      TutorLog.markBackup();
    } catch (e) {
      lastError = e && e.message || String(e);
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) on = false;
    }
  })();
  await writing; writing = null; changed();
  if (again) { again = false; return writeNow(); }
}
function soon() { clearTimeout(timer); timer = setTimeout(writeNow, 400); }

/* bring in what the file has, then keep the file up to date */
async function connect() {
  on = true;
  var f = await readFile();
  var added = 0;
  if (f) {
    try { added = (await TutorLog.restore(f)).added; } catch (e) { lastError = 'The file in the folder could not be read: ' + e.message; }
  }
  await writeNow();
  changed();
  return { added: added, found: !!f };
}

/* ------------------------------------------------------------- the API */
var ready = (async function () {
  if (!supported) return;
  var rec = await store.get();
  if (rec && rec.dir) { dir = rec.dir; parentName = rec.parent || ''; }
})();

async function choose() {                          /* from a click */
  var parent = await window.showDirectoryPicker({ id: 'biomech-tutor', mode: 'readwrite', startIn: 'documents' });
  dir = await parent.getDirectoryHandle(SUB, { create: true });
  parentName = parent.name;
  await store.put({ dir: dir, parent: parentName, at: new Date().toISOString() });
  try { localStorage.removeItem(NOASK); } catch (e) {}
  return connect();
}
async function allow() {                           /* from a click, each visit */
  await ready;
  var p = await permission(true);
  if (p !== 'granted') { on = false; changed(); return null; }
  return connect();
}
async function forget() {
  on = false; dir = null; parentName = '';
  await store.del();
  changed();
}
function state() {
  return { supported: supported, chosen: !!dir, on: on, where: dir ? (parentName ? parentName + ' / ' : '') + SUB : '',
           file: FILE, lastWrite: lastWrite, error: lastError };
}

/* ------------------------------------------- asking, once per visit */
var asked = false;
function ask() {
  if (asked || !supported) return;
  asked = true;
  var noask = false;
  try { noask = !!localStorage.getItem(NOASK); } catch (e) {}
  if (!dir) return;      /* the offer is on Your account; only a chosen folder is asked about */
  var bar = document.createElement('div');
  bar.className = 'folder-ask';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Save to a folder');
  var I = window.TutorIcon || function () { return ''; };
  bar.innerHTML = '<div class="fa-ic">' + I('folder') + '</div><div class="fa-body"><b></b><p></p><div class="fa-acts"></div></div>';
  var b = bar.querySelector('b'), t = bar.querySelector('p'), acts = bar.querySelector('.fa-acts');
  function btn(cls, label, fn) {
    var x = document.createElement('button'); x.className = cls; x.innerHTML = label; x.onclick = fn; acts.appendChild(x); return x;
  }
  /* the page gets room below it, so nothing is stuck underneath while it shows */
  function room() { document.documentElement.style.setProperty('--ask-h', bar.offsetHeight + 'px'); }
  function close() { bar.remove(); document.body.classList.remove('asking'); window.removeEventListener('resize', room); }
  function fail(e) {
    if (e && e.name === 'AbortError') return;              /* closed the picker */
    t.textContent = 'That did not work (' + (e && e.message || e) + '). Your answers are still saved in this browser.';
  }
  if (dir) {
    b.textContent = 'Use your Biomechanics Tutor folder this visit?';
    t.textContent = 'Your answers will also be saved to ' + state().where + ' / ' + FILE + ' on this computer.';
    btn('btn-primary', 'Allow', function () {
      allow().then(function (r) {
        if (!r) { t.textContent = 'Not allowed, so this visit is saved in the browser only. You can allow it later under Your account.'; acts.innerHTML = ''; btn('btn-plain', 'OK', close); return; }
        close();
      }, fail);
    });
    btn('btn-plain', 'Not this time', close);
  } else {
    b.textContent = 'Keep a copy of your answers on this computer?';
    t.textContent = 'Choose your Documents folder (or any folder). The Tutor makes a “' + SUB + '” folder in it and ' +
      'keeps ' + FILE + ' there, so your history survives clearing the browser. It asks each visit before using it.';
    btn('btn-primary', 'Choose a folder', function () { choose().then(close, fail); });
    btn('btn-plain', 'Not now', close);
    btn('link-quiet fa-never', 'Don’t ask again', function () {
      try { localStorage.setItem(NOASK, '1'); } catch (e) {}
      close();
    });
  }
  document.body.appendChild(bar);
  document.body.classList.add('asking'); room();
  window.addEventListener('resize', room);
  new MutationObserver(room).observe(bar, { childList: true, subtree: true, characterData: true });
}

/* a new answer (e is the event): rewrite the file. Restores and erasing pass
   null: the file is a backup, so erasing this browser's copy leaves it alone. */
TutorLog.onChange(function (e) { if (on && e) soon(); });

window.TutorFolder = {
  ready: ready, supported: supported, state: state, choose: choose, allow: allow,
  forget: forget, ask: ask, write: writeNow, onChange: function (f) { listeners.push(f); }
};
})();
