// src/hooks/useConfirmation.js
// Remplace window.confirm() par une fenetre de confirmation stylee et
// accessible. Usage : const ok = await confirmation.demander("Supprimer ?");
// Un second parametre optionnel { titre, danger, texteConfirmer } permet
// de personnaliser la fenetre (utile quand un meme composant declenche
// plusieurs types de confirmation, ex: approuver / refuser).
import { useState } from "react";

export default function useConfirmation() {
  const [demande, setDemande] = useState(null);

  const demander = function (message, options) {
    return new Promise(function (resolve) {
      setDemande(Object.assign({ message: message, resoudre: resolve }, options));
    });
  };

  const confirmer = function () {
    if (demande) demande.resoudre(true);
    setDemande(null);
  };

  const annuler = function () {
    if (demande) demande.resoudre(false);
    setDemande(null);
  };

  return { demande: demande, demander: demander, confirmer: confirmer, annuler: annuler };
}
