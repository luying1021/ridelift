const CACHE = 'ridelift-v2-firebase-configured-1';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './firebase-sync.js', './firebase-config.js', './icon.svg', './manifest.webmanifest'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('ridelift-') && k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', event => { if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return; event.respondWith(fetch(event.request).then(response => { if (response.ok) { const clone=response.clone(); caches.open(CACHE).then(c=>c.put(event.request, clone)); } return response; }).catch(()=>caches.match(event.request))); });
