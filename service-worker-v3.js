const CACHE_NAME = "taxi-tracker-v3-1";
const ASSETS = [
  "./index.html",
  "./app-v3.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
// Files that must always be fetched fresh from the network first, so a driver
// opening the app after you push an update sees the new code immediately —
// no manual cache-clear or reinstall needed. Falls back to cache only if offline.
const APP_SHELL = ["index.html", "app-v3.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Allow the page to force this worker to activate immediately (see app.js)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isAppShellRequest(url, mode) {
  if (mode === "navigate") return true; // full page loads (opening the PWA)
  return APP_SHELL.some((name) => url.endsWith(name));
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = event.request.url;

  // Firestore/Google APIs — never cache, always hit network directly
  if (url.includes("firestore.googleapis.com") || url.includes("googleapis.com") || url.includes("gstatic.com")) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // App shell (index.html / app.js / page navigations) — network-first so
  // updates show up the next time the app is opened, offline falls back to cache
  if (isAppShellRequest(url, event.request.mode)) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Everything else (icons, manifest, CDN libs) — cache-first, static and safe to cache
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => cached);
    })
  );
});
