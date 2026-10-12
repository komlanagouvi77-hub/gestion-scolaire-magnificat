// Service worker de l'application Magnificat.
// Strategie volontairement simple et sure pour une application de gestion
// scolaire : on ne met JAMAIS en cache les reponses de l'API (/api/...),
// pour ne jamais risquer d'afficher une note, une absence ou un paiement
// perime a un utilisateur hors-ligne. Seule la coquille de l'application
// (JS, CSS, icones, page d'entree) est mise en cache, ce qui suffit a
// rendre l'application installable et a afficher un ecran de demarrage
// correct meme sans reseau.
const CACHE_NOM = "magnificat-coquille-v2";
const BASE = self.location.pathname.replace(/sw\.js$/, "");

self.addEventListener("install", function (evt) {
  evt.waitUntil(
    caches.open(CACHE_NOM).then(function (cache) {
      return cache.addAll([BASE]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (evt) {
  evt.waitUntil(
    caches.keys().then(function (noms) {
      return Promise.all(
        noms.filter(function (nom) { return nom !== CACHE_NOM; })
            .map(function (nom) { return caches.delete(nom); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (evt) {
  const url = new URL(evt.request.url);

  // Jamais de cache pour l'API : toujours des donnees fraiches.
  if (url.pathname.startsWith("/api/")) return;

  // Navigation (ouverture/rechargement de l'app) : reseau d'abord, avec
  // repli sur la coquille en cache si hors-ligne.
  if (evt.request.mode === "navigate") {
    evt.respondWith(
      fetch(evt.request).catch(function () {
        return caches.match(BASE);
      })
    );
    return;
  }

  // Fichiers statiques (JS/CSS/icones) : cache d'abord, reseau en secours,
  // et mise a jour silencieuse du cache pour la prochaine visite.
  if (url.origin === self.location.origin) {
    evt.respondWith(
      caches.match(evt.request).then(function (reponseCache) {
        const reponseReseau = fetch(evt.request).then(function (reponse) {
          if (reponse && reponse.ok) {
            const copie = reponse.clone();
            caches.open(CACHE_NOM).then(function (cache) { cache.put(evt.request, copie); });
          }
          return reponse;
        }).catch(function () { return reponseCache; });
        return reponseCache || reponseReseau;
      })
    );
  }
});
