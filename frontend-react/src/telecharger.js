// src/telecharger.js
// Télécharge un fichier protégé (bulletin PDF, etc.) de manière fiable sur
// le web (desktop + mobile Safari / Chrome) ET dans l'application mobile native Capacitor.
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

function blobVersBase64(blob) {
  return new Promise(function (resolve, reject) {
    const lecteur = new FileReader();
    lecteur.onloadend = function () {
      resolve(String(lecteur.result).split(",")[1]);
    };
    lecteur.onerror = reject;
    lecteur.readAsDataURL(blob);
  });
}

export async function telechargerBlob(blob, nomFichier) {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = await blobVersBase64(blob);
      const resultat = await Filesystem.writeFile({
        path: nomFichier,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({ title: nomFichier, url: resultat.uri });
      return;
    } catch (errNatif) {
      console.warn("Échec du partage natif Capacitor, repli sur le navigateur:", errNatif);
    }
  }

  // Comportement standard Web & Mobile Web
  const urlBlob = window.URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = urlBlob;
  lien.download = nomFichier;
  lien.rel = "noopener";
  lien.style.display = "none";
  document.body.appendChild(lien);
  lien.click();

  // Ne pas révoquer immédiatement l'URL Blob pour laisser le temps
  // aux navigateurs mobiles (iOS Safari, Android Chrome) de finaliser le téléchargement
  setTimeout(function () {
    try {
      lien.remove();
      window.URL.revokeObjectURL(urlBlob);
    } catch (_) {}
  }, 5000);
}

export async function telechargerFichierProtege(url, token, nomFichier) {
  if (!url) {
    throw new Error("L'adresse de téléchargement est manquante.");
  }

  const entetes = {};
  if (token) {
    entetes["Authorization"] = "Token " + token;
  }

  const reponse = await fetch(url, { headers: entetes });
  if (!reponse.ok) {
    let msgErreur = "Erreur " + reponse.status;
    try {
      const json = await reponse.json();
      if (json && json.detail) {
        msgErreur = json.detail;
      }
    } catch (_) {}
    throw new Error(msgErreur);
  }

  const blob = await reponse.blob();
  if (!blob || blob.size === 0) {
    throw new Error("Le fichier reçu est vide.");
  }

  await telechargerBlob(blob, nomFichier);
}
