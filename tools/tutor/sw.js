/* Biomechanics Tutor service worker: the page keeps working offline.

   - The app itself (this folder) is cached when the worker installs.
   - The question file is fetched fresh whenever there is a connection, and
     the last copy is used when there is not, so edits to the CSV show up on
     the next visit.
   - Figures are kept once seen (and tutor.js fetches a section's figures
     when it is first opened).

   Bump VERSION whenever a file in the app list changes. */
var VERSION = 'tutor-app-20261107a';
var APP = [
  './', 'index.html', 'tutor.css?v=20261107a', 'tutor.js?v=20261107a', 'log.js?v=20261107a', 'folder.js?v=20261107a', 'sync.js?v=20261107a', 'instructor.js?v=20261107a', 'calc.js?v=20261107a', 'variants.js?v=20261107a',
  'icons.js?v=20261107a', 'manifest.webmanifest',
  'vendor/katex/katex.min.css?v=20261107a', 'vendor/katex/katex.min.js?v=20261107a',
  'vendor/marked.min.js?v=20261107a',
  'icons/icon-64.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

/* The app's own folder, whatever it is called: the worker is served from it,
   so its scope is the one thing that is always right. */
var BASE = new URL('./', self.location.href).pathname;
function inApp(p) { return p.indexOf(BASE) === 0; }

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(APP); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) {
      return k.indexOf('tutor-app-') === 0 && k !== VERSION;
    }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* the questions: network first, cached copy when offline */
  if (/Master_questions\.csv$/.test(url.pathname)) {
    e.respondWith(fetch(req).then(function (r) {
      if (r.ok) {
        var copy = r.clone();
        caches.open('tutor-data').then(function (c) { c.put(url.pathname, copy); });
      }
      return r;
    }).catch(function () {
      return caches.open('tutor-data').then(function (c) { return c.match(url.pathname); });
    }));
    return;
  }

  /* figures: cached once seen */
  if (/\/www\//.test(url.pathname) ||
      (/\.(png|jpe?g|gif|svg|webp)$/i.test(url.pathname) && !inApp(url.pathname))) {
    e.respondWith(caches.open('tutor-figures').then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (r) { if (r.ok) c.put(req, r.clone()); return r; });
      });
    }));
    return;
  }

  /* the app and KaTeX fonts: cache first, filled as they are used */
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (r) {
      if (r.ok && inApp(url.pathname)) {
        var copy = r.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
      }
      return r;
    }).catch(function () {
      if (req.mode === 'navigate') return caches.match('index.html');
      throw new Error('offline');
    });
  }));
});
