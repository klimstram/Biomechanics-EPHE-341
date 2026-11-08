/* Work loop simulator service worker: the page keeps working offline.

   Everything this page needs is in its own folder and none of it is large,
   so the whole app is cached when the worker installs and served from there
   afterwards. Bump VERSION whenever a file in APP changes. */
var VERSION = 'work-loop-20261107a';
var APP = [
  './', 'index.html',
  'base.css?v=20261107a', 'work-loop.css?v=20261107a',
  'wl-core.js?v=20261107a', 'vml.js?v=20261107a',
  'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable.png',
  'icons/icon-180.png', 'icons/utah.png', 'icons/uvic-dark.png'
];

/* the app's own folder, whatever it is called */
var BASE = new URL('./', self.location.href).pathname;
function inApp(p) { return p.indexOf(BASE) === 0; }

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(APP); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) {
      return k.indexOf('work-loop-') === 0 && k !== VERSION;
    }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin || !inApp(url.pathname)) return;
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (r) {
      if (r.ok) { var copy = r.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return r;
    }).catch(function () {
      if (req.mode === 'navigate') return caches.match('index.html');
      throw new Error('offline');
    });
  }));
});
