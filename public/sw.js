// public/sw.js – Service Worker für MaDe to find PWA

const CACHE_NAME = "made-to-find-v1";

const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Installation – statische Assets cachen
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Aktivierung – alten Cache löschen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch – Network First, Cache Fallback
self.addEventListener("fetch", (event) => {
  // Nur GET-Requests cachen
  if (event.request.method !== "GET") return;

  // Supabase API-Calls nicht cachen
  if (event.request.url.includes("supabase.co")) return;

  // Eigene API-Routen nicht cachen
  if (new URL(event.request.url).pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Erfolgreiche Antwort in Cache speichern
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        // Offline: aus Cache laden
        caches.match(event.request).then(
          (cached) => cached ?? caches.match("/dashboard")
        )
      )
  );
});

// Push – Meldung anzeigen (auch wenn die App geschlossen ist)
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { body: event.data ? event.data.text() : "" }; }

  event.waitUntil(
    self.registration.showNotification(data.title || "MaDe to find", {
      body:  data.body || "",
      icon:  "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag:   data.tag || undefined,
      data:  { url: data.url || "/dashboard" },
    })
  );
});

// Antippen der Meldung – App öffnen bzw. nach vorne holen und zur passenden Seite gehen
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/dashboard", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          if ("navigate" in client) client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
