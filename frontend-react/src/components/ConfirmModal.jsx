// src/components/ConfirmModal.jsx
import { useEffect } from "react";
import { traduireTexte } from "../localisation.js";

export default function ConfirmModal({ titre, message, texteConfirmer, texteAnnuler, danger, onConfirmer, onAnnuler, children }) {
  useEffect(function () {
    const gererEchap = function (e) { if (e.key === "Escape") onAnnuler(); };
    document.addEventListener("keydown", gererEchap);
    return function () { document.removeEventListener("keydown", gererEchap); };
  }, [onAnnuler]);

  return (
    <div className="react-modal-overlay" onClick={onAnnuler}>
      <div
        className="react-confirm-carte"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="react-confirm-titre"
        onClick={function (e) { e.stopPropagation(); }}
      >
        <div id="react-confirm-titre" className="react-confirm-titre">{traduireTexte(titre || "Confirmation")}</div>
        <p className="react-confirm-message">{traduireTexte(message)}</p>
        {children}
        <div className="react-confirm-actions">
          <button type="button" className="react-confirm-annuler" onClick={onAnnuler}>
            {traduireTexte(texteAnnuler || "Annuler")}
          </button>
          <button type="button" className={"react-confirm-valider" + (danger ? " danger" : "")} onClick={onConfirmer} autoFocus>
            {traduireTexte(texteConfirmer || "Confirmer")}
          </button>
        </div>
      </div>
    </div>
  );
}
