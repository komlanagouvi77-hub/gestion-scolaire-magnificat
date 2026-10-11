// src/components/OnboardingModal.jsx
// Guide d'accueil / checklist de configuration initiale (style Notion/Stripe).
// L'etat de chaque etape reflete les VRAIES donnees de l'ecole (pas un
// pourcentage fige) : nombre de classes, d'enseignants, d'eleves, etc.
import { useEffect } from "react";
import { traduireTexte } from "../localisation.js";

function IconeBatiment() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="3" width="16" height="18" rx="1"></rect>
      <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"></path>
    </svg>
  );
}
function IconeClasse() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21V9l9-6 9 6v12"></path>
      <path d="M9 21v-8h6v8"></path>
    </svg>
  );
}
function IconeGroupe() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3.2"></circle>
      <path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6"></path>
      <circle cx="17.5" cy="8.5" r="2.3"></circle>
      <path d="M15.5 14.2c2.7 0.4 5 2.4 5 5.8"></path>
    </svg>
  );
}
function IconeLivre() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"></path>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    </svg>
  );
}
function IconePresseCahier() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="3.5" width="14" height="17" rx="2"></rect>
      <path d="M9 3.5V6h6V3.5"></path>
      <path d="M8.5 11.5l2 2 4-4.5"></path>
    </svg>
  );
}

const CONFIG_ETAPES = [
  { cle: "identite", titre: "Identite de l'etablissement", texte: "Definissez le nom, le logo et l'adresse de votre ecole.", icone: IconeBatiment, page: "parametres" },
  { cle: "classes", titre: "Classes", texte: "Creez les classes de votre etablissement.", icone: IconeClasse, page: "classes-gestion" },
  { cle: "equipe", titre: "Equipe pedagogique", texte: "Enregistrez vos enseignants.", icone: IconeGroupe, page: "enseignants-gestion" },
  { cle: "eleves", titre: "Inscriptions des eleves", texte: "Inscrivez vos premiers eleves dans leurs classes.", icone: IconeLivre, page: "eleves" },
  { cle: "attribution", titre: "Attribution des cours", texte: "Associez vos enseignants aux matieres et classes.", icone: IconePresseCahier, page: "enseignants-gestion" },
];

export function calculerPourcentage(etapes) {
  if (!etapes) return null;
  const total = CONFIG_ETAPES.length;
  const faites = CONFIG_ETAPES.filter(function (e) { return etapes[e.cle]; }).length;
  return Math.round((faites / total) * 100);
}

export default function OnboardingModal({ etapes, onFermer, onMasquer }) {
  useEffect(function () {
    if (!etapes) return undefined;
    const gererEchap = function (e) { if (e.key === "Escape") onFermer(); };
    document.addEventListener("keydown", gererEchap);
    document.body.style.overflow = "hidden";
    return function () {
      document.removeEventListener("keydown", gererEchap);
      document.body.style.overflow = "";
    };
  }, [etapes, onFermer]);

  if (!etapes) return null;
  const total = CONFIG_ETAPES.length;
  const faites = CONFIG_ETAPES.filter(function (e) { return etapes[e.cle]; }).length;

  return (
    <div className="react-modal-overlay" onClick={onFermer}>
      <div
        className="react-modal-carte"
        role="dialog"
        aria-modal="true"
        aria-labelledby="react-onboarding-titre"
        onClick={function (e) { e.stopPropagation(); }}
      >
        <div className="react-modal-barre-drapeau"><span className="react-modal-etoile">★</span></div>

        <div className="react-modal-entete">
          <div className="react-modal-progres">
            <svg viewBox="0 0 40 40" width="52" height="52">
              <circle cx="20" cy="20" r="17" fill="none" stroke="#E7F1EB" strokeWidth="4"></circle>
              <circle
                cx="20" cy="20" r="17" fill="none" stroke="var(--green-600)" strokeWidth="4"
                strokeDasharray={2 * Math.PI * 17}
                strokeDashoffset={2 * Math.PI * 17 * (1 - faites / total)}
                strokeLinecap="round"
                transform="rotate(-90 20 20)"
              ></circle>
            </svg>
            <span className="react-modal-progres-texte">{Math.round((faites / total) * 100)}%</span>
          </div>
          <div className="react-modal-entete-texte">
            <div className="react-modal-titre" id="react-onboarding-titre">{faites === total ? "Felicitations et bienvenue !" : "Configurons votre etablissement"}</div>
            <p>
              {faites === total
                ? "Toutes les etapes de configuration initiale sont completees. Vous pouvez revenir ici a tout moment pour ajuster."
                : "Suivez ce guide pour finaliser la configuration de votre etablissement avant la rentree."}
            </p>
          </div>
          <button type="button" className="react-modal-fermer" onClick={onFermer} aria-label="Fermer">✕</button>
        </div>

        <div className="react-modal-liste">
          {CONFIG_ETAPES.map(function (etape) {
            const complete = !!etapes[etape.cle];
            const Icone = etape.icone;
            return (
              <div className={"react-modal-etape" + (complete ? " complete" : "")} key={etape.cle}>
                <span className="react-modal-etape-icone"><Icone /></span>
                <div className="react-modal-etape-contenu">
                  <div className="react-modal-etape-entete">
                    <span className="react-modal-etape-titre">{traduireTexte(etape.titre)}</span>
                    <span className={"react-modal-badge-statut" + (complete ? " complete" : "")}>
                      {complete ? "✓ Complete" : "A faire"}
                    </span>
                  </div>
                  <p className="react-modal-etape-texte">{traduireTexte(etape.texte)}</p>
                </div>
                <button
                  type="button" className="react-modal-bouton-revoir"
                  onClick={function () { window.location.hash = "/" + etape.page; onFermer(); }}
                >
                  {complete ? "Revoir" : "Configurer"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="react-modal-pied">
          <button type="button" className="react-modal-lien-masquer" onClick={onMasquer}>Masquer le guide d'accueil</button>
          <span className="react-modal-compteur">Taches completees : {faites} / {total}</span>
        </div>
      </div>
    </div>
  );
}
