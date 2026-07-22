const CACHE_NAME = "cotar3d-shell-v5";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=5",
  "./js/app.js?v=5",
  "./js/theme.js?v=3",
  "./site.webmanifest",
  "./como-calcular-preco-impressao-3d.html",
  "./politica-de-privacidade.html",
  "./termos-de-uso.html",
  "./assets/brand/cotar3d-mark.svg",
  "./assets/brand/cotar3d-mark-dark.svg",
  "./assets/brand/cotar3d-app-icon.svg",
  "./assets/brand/cotar3d-icon-192.png",
  "./assets/brand/cotar3d-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith("cotar3d-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const refreshed = fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }).catch(() => cached);

      return cached || refreshed;
    })
  );
});
