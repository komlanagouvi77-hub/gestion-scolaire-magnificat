// src/components/RecuPaiementModal.jsx
// Recu de paiement imprimable, presente en superposition. Reprend le
// contenu de l'ancien recu Django (paiements/recu_paiement.html) afin de
// ne perdre aucune information deja utile a l'etablissement, avec
// l'entete officielle (logo + nom de l'ecole) et une mise en page pensee
// pour l'impression.
import { useState, useEffect } from "react";
import { traduireTexte, localeActive } from "../localisation.js";
import { telechargerRecuPaiementPdf, obtenirTokenStocke } from "../api.js";

const LABEL_MODE = {
  especes: "Especes",
  mobile_money: "Mobile Money (Flooz / T-Money)",
  cheque: "Cheque",
  virement: "Virement bancaire",
};

export default function RecuPaiementModal({ paiement, parametres, onFermer }) {
  const [enCoursPdf, setEnCoursPdf] = useState(false);

  useEffect(function () {
    const gererEchap = function (e) { if (e.key === "Escape") onFermer(); };
    document.addEventListener("keydown", gererEchap);
    document.body.style.overflow = "hidden";
    return function () {
      document.removeEventListener("keydown", gererEchap);
      document.body.style.overflow = "";
    };
  }, [onFermer]);

  const nomEcole = parametres ? parametres.nom_ecole : "Etablissement";
  const initiale = (nomEcole || "?").charAt(0).toUpperCase();

  const telechargerPdfOfficiel = async function () {
    try {
      setEnCoursPdf(true);
      const token = obtenirTokenStocke();
      const nomEleve = (paiement.eleve_nom || "eleve").replace(/\s+/g, "_");
      const nomFichier = "recu_officiel_" + nomEleve + "_" + paiement.id + ".pdf";
      await telechargerRecuPaiementPdf(paiement.id, token, nomFichier);
    } catch (err) {
      alert("Erreur lors du telechargement du recu PDF : " + (err.message || "Erreur inconnue"));
    } finally {
      setEnCoursPdf(false);
    }
  };

  // window.print() ouvre un vrai dialogue d'impression dans un navigateur
  // (web ou PWA), mais ne fait rien dans l'application mobile native : la
  // WebView Android n'implemente pas nativement l'impression sans plugin
  // dedie. navigator.share() (standard web, deja pris en charge par la
  // WebView Android sans dependance supplementaire) permet malgre tout d'y
  // enregistrer ou transmettre le recu - bouton affiche uniquement si
  // disponible, en complement du bouton Imprimer plutot qu'a sa place.
  const partagerRecu = function () {
    const texte = [
      nomEcole, traduireTexte("Recu de paiement N°") + " " + paiement.id, "",
      traduireTexte("Eleve") + " : " + paiement.eleve_nom,
      traduireTexte("Tranche") + " : " + (paiement.tranche ? paiement.tranche + "e tranche" : "-"),
      traduireTexte("Mode de paiement") + " : " + traduireTexte(LABEL_MODE[paiement.mode_paiement] || paiement.mode_paiement),
      paiement.reference ? traduireTexte("Reference") + " : " + paiement.reference : null,
      traduireTexte("Annee scolaire") + " : " + paiement.annee_scolaire,
      traduireTexte("Date") + " : " + paiement.date_paiement,
      traduireTexte("Montant paye") + " : " + Number(paiement.montant).toLocaleString(localeActive()) + " FCFA",
    ].filter(Boolean).join("\n");
    navigator.share({ title: traduireTexte("Recu de paiement N°") + " " + paiement.id, text: texte }).catch(function () {});
  };

  return (
    <div className="react-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="recu-titre" onClick={onFermer}>
      <div className="react-recu-conteneur" onClick={function (e) { e.stopPropagation(); }}>
        <div className="react-recu-barre no-print" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <button
            type="button"
            className="mag-btn-primary"
            style={{ width: "auto", padding: "0.5rem 1.2rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            onClick={telechargerPdfOfficiel}
            disabled={enCoursPdf}
          >
            {enCoursPdf ? <span className="react-spinner" style={{ width: 14, height: 14 }}></span> : <span>📄</span>}
            {enCoursPdf ? "Telechargement..." : "Recu Officiel (PDF ReportLab)"}
          </button>
          <button type="button" className="btn-mag-outline" style={{ width: "auto", padding: "0.5rem 1.2rem" }} onClick={function () { window.print(); }}>
            Imprimer
          </button>
          {typeof navigator !== "undefined" && navigator.share ? (
            <button type="button" className="btn-mag-outline" style={{ width: "auto", padding: "0.5rem 1.2rem" }} onClick={partagerRecu}>
              Partager
            </button>
          ) : null}
          <button type="button" className="mag-btn-lien" style={{ marginLeft: "auto" }} onClick={onFermer}>Fermer ✕</button>
        </div>

        <div className="react-recu-cadre">
          <div className="react-recu-entete">
            {parametres && parametres.logo ? (
              <img src={parametres.logo} alt={nomEcole} className="react-recu-logo" />
            ) : (
              <div className="react-recu-crest">{initiale}</div>
            )}
            <div>
              <div className="react-recu-nom-ecole">{nomEcole}</div>
              {parametres && parametres.adresse ? <div className="react-recu-sous-titre">{parametres.adresse}</div> : null}
            </div>
          </div>

          <div id="recu-titre" className="react-recu-titre-doc">Recu de paiement N° {paiement.id}</div>

          <div className="react-recu-ligne"><span>Eleve</span><span>{paiement.eleve_nom}</span></div>
          <div className="react-recu-ligne"><span>Tranche</span><span>{paiement.tranche ? paiement.tranche + "e tranche" : "-"}</span></div>
          <div className="react-recu-ligne"><span>Mode de paiement</span><span>{traduireTexte(LABEL_MODE[paiement.mode_paiement] || paiement.mode_paiement)}</span></div>
          {paiement.reference ? (
            <div className="react-recu-ligne"><span>Reference</span><span>{paiement.reference}</span></div>
          ) : null}
          <div className="react-recu-ligne"><span>Annee scolaire</span><span>{paiement.annee_scolaire}</span></div>
          <div className="react-recu-ligne"><span>Date</span><span>{paiement.date_paiement}</span></div>

          <div className="react-recu-montant">
            <div className="react-recu-montant-label">Montant paye</div>
            <div className="react-recu-montant-valeur">{Number(paiement.montant).toLocaleString(localeActive())} FCFA</div>
          </div>

          <div className="react-recu-pied">Document genere automatiquement — {nomEcole}</div>
        </div>
      </div>
    </div>
  );
}
