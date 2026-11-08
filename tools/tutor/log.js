/* ======================================================================
   Biomechanics Tutor: the answer log, kept so it is hard to lose.

   Every answer a student gives is one event, in the same columns the Shiny
   Tutor logs (user_id, timestamp, section, question_number, step, action,
   details), plus session_id and an id. The log lives on the student's own
   device; nothing is sent anywhere.

   Where it is kept, and why there are several places:
     1. IndexedDB, the main store.
     2. A copy in localStorage. If either store is cleared on its own, the
        next visit puts the missing events back from the other one.
     3. navigator.storage.persist(): asks the browser not to evict this
        site's storage when the disk fills up or the site goes unvisited.
     4. A backup file the student saves (CSV), or the same file kept up to
        date in a folder they choose (folder.js; Chrome and Edge only).
     6. An anonymous online copy (sync.js), restored with a sync code. Restoring it merges it back,
        and each event is counted once however often it is restored. This is
        the only copy that survives "clear browsing data", a new browser or
        a new device, so the page reminds them when there is a lot not yet
        backed up.
     5. The Shiny Tutor's own log (localStorage "biomechanics_data"). When it
        is served from the same site this page can read it, so earlier
        history is brought in once, read-only. The Shiny app is not changed.
   ====================================================================== */
(function () {
'use strict';

var DB_NAME = 'biomech-tutor', STORE = 'events';
var LS_KEY = 'biomech-tutor-log-v1';          /* the localStorage copy */
var LS_META = 'biomech-tutor-meta-v1';        /* learner id, last backup */
var LEGACY_KEY = 'biomechanics_data';         /* the Shiny Tutor's log */
var COLS = ['user_id', 'timestamp', 'section', 'question_number', 'step',
            'action', 'details', 'session_id', 'id'];

var events = [];            /* every event, oldest first */
var byId = {};
var db = null;
var listeners = [];

/* ---------------------------------------------------------------- meta */
function readMeta() {
  try { return JSON.parse(localStorage.getItem(LS_META) || '{}') || {}; }
  catch (e) { return {}; }
}
function writeMeta(m) {
  try { localStorage.setItem(LS_META, JSON.stringify(m)); } catch (e) {}
}
function rid(n) {
  var a = '', c = 'abcdefghijkmnpqrstuvwxyz23456789';
  for (var i = 0; i < n; i++) a += c[Math.floor(Math.random() * c.length)];
  return a;
}
var meta = readMeta();
if (!meta.learner) { meta.learner = 'L-' + rid(8); writeMeta(meta); }
var SESSION = 'S-' + Date.now().toString(36) + '-' + rid(4);
var seq = 0;

/* ----------------------------------------------------------------- CSV */
function csvCell(v) {
  v = v == null ? '' : String(v);
  return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function toCSV(list) {
  var out = [COLS.join(',')];
  list.forEach(function (e) {
    out.push(COLS.map(function (k) { return csvCell(e[k]); }).join(','));
  });
  return out.join('\n') + '\n';
}
/* RFC 4180: quoted fields may hold commas, quotes and newlines */
function parseCSV(text) {
  var rows = [], row = [], f = '', i = 0, q = false, n = text.length;
  if (text.charCodeAt(0) === 0xFEFF) i = 1;
  for (; i < n; i++) {
    var c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { f += '"'; i++; } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); f = ''; rows.push(row); row = [];
    } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}
function rowsToObjects(rows) {
  if (!rows.length) return [];
  var h = rows[0].map(function (x) { return x.trim(); });
  return rows.slice(1).filter(function (r) { return r.length > 1 || r[0]; })
    .map(function (r) {
      var o = {};
      h.forEach(function (k, j) { o[k] = r[j] == null ? '' : r[j]; });
      return o;
    });
}

/* An event from the Shiny log or an old backup has no id: make one from
   its content, so importing it twice still counts it once. */
function fingerprint(e) {
  var s = [e.user_id, e.timestamp, e.section, e.question_number, e.step,
           e.action, e.details].join('␟');
  var h1 = 0x811c9dc5, h2 = 0x01000193;
  for (var i = 0; i < s.length; i++) {
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + s.charCodeAt(i), 2246822519) >>> 0;
  }
  return 'h-' + h1.toString(36) + h2.toString(36);
}
function clean(o, src) {
  var e = {};
  COLS.forEach(function (k) { e[k] = o[k] == null ? '' : String(o[k]); });
  if (!e.session_id) e.session_id = e.user_id;
  if (!e.id) e.id = fingerprint(e);
  e.src = o.src || src || '';
  return e;
}

/* ----------------------------------------------------------- IndexedDB */
function openDB() {
  return new Promise(function (res) {
    if (!window.indexedDB) return res(null);
    var r;
    try { r = indexedDB.open(DB_NAME, 1); } catch (e) { return res(null); }
    r.onupgradeneeded = function () {
      r.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    r.onsuccess = function () { res(r.result); };
    r.onerror = function () { res(null); };
    r.onblocked = function () { res(null); };
  });
}
function dbAll() {
  return new Promise(function (res) {
    if (!db) return res([]);
    try {
      var r = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      r.onsuccess = function () { res(r.result || []); };
      r.onerror = function () { res([]); };
    } catch (e) { res([]); }
  });
}
function dbPut(list) {
  return new Promise(function (res) {
    if (!db || !list.length) return res(true);
    try {
      var tx = db.transaction(STORE, 'readwrite'), st = tx.objectStore(STORE);
      list.forEach(function (e) { st.put(e); });
      tx.oncomplete = function () { res(true); };
      tx.onerror = function () { res(false); };
    } catch (e) { res(false); }
  });
}
function dbClear() {
  return new Promise(function (res) {
    if (!db) return res(true);
    try {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = function () { res(true); };
      tx.onerror = function () { res(false); };
    } catch (e) { res(false); }
  });
}

/* --------------------------------------------------- the copy in localStorage */
var lsOK = true;
function lsWrite() {
  try { localStorage.setItem(LS_KEY, toCSV(events)); lsOK = true; }
  catch (e) { lsOK = false; }        /* full, or blocked: IndexedDB still has it */
}
function lsRead() {
  try {
    var t = localStorage.getItem(LS_KEY);
    return t ? rowsToObjects(parseCSV(t)) : [];
  } catch (e) { return []; }
}

/* ------------------------------------------------------------- merging */
function sortEvents() {
  events.sort(function (a, b) {
    return a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0;
  });
}
function addAll(list, src) {
  var fresh = [];
  list.forEach(function (o) {
    var e = clean(o, src);
    if (!e.action || byId[e.id]) return;
    byId[e.id] = e; events.push(e); fresh.push(e);
  });
  if (fresh.length) sortEvents();
  return fresh;
}

/* ---------------------------------------------------------------- start */
var ready = (async function () {
  db = await openDB();
  var fromDB = await dbAll();
  addAll(fromDB);
  var fromLS = addAll(lsRead());               /* lost from IndexedDB, kept here */
  if (fromLS.length) await dbPut(fromLS);
  var legacy = [];
  if (!meta.legacyImported) {
    try {
      var t = localStorage.getItem(LEGACY_KEY);
      if (t) legacy = addAll(rowsToObjects(parseCSV(t)), 'shiny');
    } catch (e) {}
    meta.legacyImported = new Date().toISOString();
    meta.legacyCount = legacy.length;
    writeMeta(meta);
    if (legacy.length) await dbPut(legacy);
  }
  if (fromDB.length !== events.length || fromLS.length || legacy.length) lsWrite();
  else if (!localStorage.getItem(LS_KEY) && events.length) lsWrite();
  return api;
})();

/* --------------------------------------------------------------- record */
function stamp() {
  /* local time, the way Python's datetime.now().isoformat() writes it */
  var d = new Date(), p = function (n, w) { return String(n).padStart(w || 2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' +
         p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' +
         p(d.getMilliseconds(), 3);
}
async function record(section, question_number, step, action, details) {
  await ready;
  var e = clean({
    user_id: meta.learner, session_id: SESSION, timestamp: stamp(),
    section: section, question_number: question_number, step: step,
    action: action, details: details,
    id: SESSION + '-' + (++seq)
  }, 'web');
  byId[e.id] = e; events.push(e);
  lsWrite();
  await dbPut([e]);
  if (!meta.persistAsked) askPersist(false);
  listeners.forEach(function (f) { try { f(e); } catch (x) {} });
  return e;
}

/* ------------------------------------------------------ keeping it safe */
async function askPersist(fromClick) {
  if (!navigator.storage || !navigator.storage.persist) return null;
  /* Firefox asks the student with a prompt, so only ask there on a click */
  if (!fromClick && /firefox/i.test(navigator.userAgent)) return null;
  meta.persistAsked = new Date().toISOString(); writeMeta(meta);
  try { return await navigator.storage.persist(); } catch (e) { return null; }
}
async function status() {
  await ready;
  var s = {
    count: events.length, learner: meta.learner, session: SESSION,
    indexedDB: !!db, localCopy: lsOK, persisted: null,
    lastBackup: meta.lastBackup || null,
    sinceBackup: events.length - (meta.backupCount || 0),
    legacyCount: meta.legacyCount || 0
  };
  try {
    if (navigator.storage && navigator.storage.persisted)
      s.persisted = await navigator.storage.persisted();
  } catch (e) {}
  return s;
}
function fileName() {
  var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
  return 'biomech-tutor-history-' + d.getFullYear() + '-' + p(d.getMonth() + 1) +
         '-' + p(d.getDate()) + '.csv';
}
function download(list, name) {
  var blob = new Blob(['﻿' + toCSV(list)], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
async function backup() {
  await ready;
  download(events, fileName());
  meta.lastBackup = new Date().toISOString();
  meta.backupCount = events.length;
  writeMeta(meta);
}
/* a backup file, or a session CSV downloaded from the Shiny Tutor */
async function restore(file) {
  await ready;
  var text = await file.text();
  var list = rowsToObjects(parseCSV(text));
  if (!list.length || !('action' in list[0]))
    throw new Error('That file is not a Tutor history file.');
  var fresh = addAll(list, 'backup');
  if (fresh.length) { lsWrite(); await dbPut(fresh); }
  /* what came from a file is already in a file */
  meta.backupCount = (meta.backupCount || 0) + fresh.length; writeMeta(meta);
  listeners.forEach(function (f) { try { f(null); } catch (x) {} });
  return { read: list.length, added: fresh.length };
}
/* events fetched from somewhere else (the online store): merge, count once */
async function mergeEvents(list, src) {
  await ready;
  var fresh = addAll(list, src);
  if (fresh.length) { lsWrite(); await dbPut(fresh); }
  listeners.forEach(function (f) { try { f(null); } catch (x) {} });
  return fresh;
}
/* a copy was written somewhere else (the folder): everything is backed up */
function markBackup() {
  meta.lastBackup = new Date().toISOString();
  meta.backupCount = events.length;
  writeMeta(meta);
}
async function eraseAll() {
  await ready;
  events = []; byId = {};
  await dbClear();
  try { localStorage.removeItem(LS_KEY); } catch (e) {}
  meta.backupCount = 0; writeMeta(meta);
  listeners.forEach(function (f) { try { f(null); } catch (x) {} });
}

var api = window.TutorLog = {
  ready: ready, record: record, status: status, backup: backup,
  restore: restore, eraseAll: eraseAll, askPersist: askPersist, markBackup: markBackup, mergeEvents: mergeEvents,
  all: function () { return events.slice(); },
  session: function () { return SESSION; },
  learner: function () { return meta.learner; },
  onChange: function (f) { listeners.push(f); },
  downloadCSV: function (list, name) { download(list, name); },
  parseCSV: parseCSV, rowsToObjects: rowsToObjects, toCSV: toCSV
};
})();
