// Service worker minimal pour Complexe Scolaire Magnificat.
// Objectif : permettre l'installation en PWA et un chargement plus rapide
// des ressources statiques (CSS, icones). Les pages elles-memes (donnees
// des eleves, notes, etc.) sont toujours chargees depuis le serveur, car
// ce sont des donnees sensibles qui ne doivent jamais rester en cache.

const CACHE_NAME = "magnificat-static-v1";
const RESSOURCES_STATIQUES = [
  "/static/css/magnificat.css",
  "/static/icons/icon-192.png",
  "/static/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(RESSOURCES_STATIQUES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(noms.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Uniquement les fichiers statiques passent par le cache.
  // Toute page ou appel API va toujours chercher les donnees fraiches
  // sur le serveur (jamais de donnees d'eleves mises en cache offline).
  if (url.pathname.startsWith("/static/")) {
    event.respondWith(
      caches.match(event.request).then((reponse) => reponse || fetch(event.request))
    );
  }
});