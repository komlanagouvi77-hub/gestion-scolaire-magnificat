// src/localisation.js
// Système de libellés en français naturel

export function traduireTexte(texte) {
  if (typeof texte !== "string") return texte;
  return texte;
}

export function localeActive() {
  return "fr-FR";
}

if (typeof window !== "undefined") {
  window.__magnificatTranslate = traduireTexte;
}
