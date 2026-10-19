// Service worker : réseau d'abord, cache en secours → l'appli marche hors-ligne
// après une première visite, et récupère toujours les dernières questions en ligne.
const CACHE = 'oiq-prep-v2';
const CORE = [
  './', 'index.html', 'css/styles.css', 'js/app.js', 'manifest.webmanifest',
  'icons/icon.svg', 'data/blocs.json',
  'data/bloc1.json', 'data/bloc2.json', 'data/bloc3.json', 'data/bloc4.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
