// src/telecharger.js
// Telecharge un fichier protege (bulletin PDF, etc.) de maniere fiable sur
// le web ET dans l'application mobile native.
//
// Le mecanisme web classique (URL.createObjectURL + <a download>) ne
// fonctionne QUE dans un vrai navigateur : la webview Android nue de
// l'application mobile ne sait pas quoi faire d'un clic sur un tel lien -
// rien ne se produit, sans la moindre erreur visible (verifie : le
// dossier Telechargements du telephone restait vide apres un clic).
//
// Sur mobile natif, on ecrit donc le fichier recupere dans le stockage de
// l'application (Filesystem), puis on ouvre la feuille de partage systeme
// (Share) : l'utilisateur peut alors l'enregistrer dans ses fichiers,
// l'envoyer par WhatsApp/email, etc. - le web garde son comportement
// habituel de telechargement direct.
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
    const base64 = await blobVersBase64(blob);
    const resultat = await Filesystem.writeFile({
      path: nomFichier,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({ title: nomFichier, url: resultat.uri });
    return;
  }

  const urlBlob = window.URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = urlBlob;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(urlBlob);
}

export async function telechargerFichierProtege(url, token, nomFichier) {
  const reponse = await fetch(url, { headers: { Authorization: "Token " + token } });
  if (!reponse.ok) throw new Error("Telechargement impossible.");
  const blob = await reponse.blob();
  await telechargerBlob(blob, nomFichier);
}
