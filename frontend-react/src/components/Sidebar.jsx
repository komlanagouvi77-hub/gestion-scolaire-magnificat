// src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import {
  IconeGrille, IconeEleves, IconeCasquette, IconeCalendrier, IconeCarnet,
  IconePresseCahier, IconeMedaille, IconeUserX, IconeDossier, IconeCarte,
  IconeCle, IconePersonne, IconeHorloge, IconeEngrenage, IconeAnnonce,
  IconeImport, IconeDeconnexion, IconeFleche,
} from "./IconesSidebar.jsx";

const SECTIONS_NAV = [
  {
    titre: "Menu principal",
    items: [
      { cle: "dashboard", label: "Tableau de bord", icone: IconeGrille },
    ],
  },
  {
    titre: "Gestion scolaire",
    items: [
      { cle: "eleves", label: "Élèves", icone: IconeEleves },
      { cle: "classes-gestion", label: "Classes", icone: IconeCasquette },
      { cle: "matieres-gestion", label: "Matières", icone: IconeCarnet },
      { cle: "bulletins", label: "Bulletins", icone: IconeMedaille },
      { cle: "notes", label: "Notes", icone: IconePresseCahier },
      { cle: "absences", label: "Absences", icone: IconeUserX },
      { cle: "emploi-du-temps", label: "Emploi du temps", icone: IconeCalendrier },
      { cle: "evenements", label: "Événements", icone: IconeCalendrier },
      { cle: "messagerie", label: "Messagerie", icone: IconeDossier },
      { cle: "suivi", label: "Suivi des notes", icone: IconeMedaille },
    ],
  },
  {
    titre: "Administration & outils",
    items: [
      { cle: "enseignants-gestion", label: "Enseignants", icone: IconePersonne },
      { cle: "parents-gestion", label: "Parents", icone: IconePersonne },
      { cle: "paiements-gestion", label: "Paiements", icone: IconeCarte },
      { cle: "paiements", label: "Paiements", icone: IconeCarte },
      { cle: "situation-financiere", label: "Situation financière", icone: IconeCarte },
      { cle: "conges", label: "Congés", icone: IconeHorloge },
      { cle: "annonces", label: "Annonces", icone: IconeAnnonce },
      { cle: "demandes-acces", label: "Demandes d'accès", icone: IconeCle },
      { cle: "import", label: "Import élèves", icone: IconeImport },
      { cle: "parametres", label: "Paramètres", icone: IconeEngrenage },
    ],
  },
];

export const ONGLETS_PAR_ROLE = {
  administrateur: ["dashboard", "eleves", "classes-gestion", "matieres-gestion", "bulletins", "enseignants-gestion", "parents-gestion", "notes", "absences", "emploi-du-temps", "evenements", "paiements-gestion", "situation-financiere", "conges", "annonces", "demandes-acces", "suivi", "import", "parametres"],
  enseignant: ["dashboard", "eleves", "bulletins", "notes", "absences", "emploi-du-temps", "evenements", "messagerie", "conges", "annonces"],
  parent: ["dashboard", "eleves", "bulletins", "notes", "absences", "emploi-du-temps", "evenements", "messagerie", "paiements", "annonces"],
};

function allerA(cle) {
  window.location.hash = "/" + cle;
}

export default function Sidebar({ pageActive, utilisateur, role, nomEcole, logoUrl, onDeconnexion, mobileOuvert, onFermerMobile }) {
  const [replie, setReplie] = useState(false);
  const onglets = ONGLETS_PAR_ROLE[role] || SECTIONS_NAV.flatMap(function (s) { return s.items.map(function (i) { return i.cle; }); });

  const etiquetteRole = role === "administrateur" ? "Administrateur" : role === "enseignant" ? "Enseignant" : role === "parent" ? "Parent" : "";
  const traduire = function (texte) { return texte; };
  const nomAffiche = nomEcole || "Magnificat";

  useEffect(function () {
    if (!mobileOuvert) return undefined;
    const gererEchap = function (e) { if (e.key === "Escape") onFermerMobile(); };
    document.addEventListener("keydown", gererEchap);
    document.body.style.overflow = "hidden";
    return function () {
      document.removeEventListener("keydown", gererEchap);
      document.body.style.overflow = "";
    };
  }, [mobileOuvert, onFermerMobile]);

  const naviguerVers = function (cle) {
    allerA(cle);
    if (onFermerMobile) onFermerMobile();
  };

  return (
    <>
    {mobileOuvert ? <div className="react-sidebar-fond" onClick={onFermerMobile}></div> : null}
    <aside className={"react-sidebar" + (replie ? " repliee" : "") + (mobileOuvert ? " mobile-ouverte" : "")}>
      <button
        type="button"
        className="react-sidebar-repli"
        onClick={function () { setReplie(!replie); }}
        aria-label={replie ? "Déplier le menu" : "Replier le menu"}
        aria-expanded={!replie}
        title={replie ? "Déplier le menu" : "Replier le menu"}
      >
        <span style={{ transform: replie ? "rotate(180deg)" : "none", display: "flex" }}><IconeFleche /></span>
      </button>

      <div className="react-sidebar-logo-zone">
        <div className="react-sidebar-crest">
          <img
            src={logoUrl || (import.meta.env.BASE_URL + "logo-ecole-defaut.png")}
            alt={nomAffiche}
            style={{ width: "100%", height: "100%", objectFit: logoUrl ? "cover" : "contain", padding: logoUrl ? 0 : "4px" }}
          />
        </div>
        {!replie ? <div className="react-sidebar-nom-ecole">{nomAffiche}</div> : null}
      </div>

      <nav className="react-sidebar-nav" aria-label={traduire("Navigation principale")}>
        {SECTIONS_NAV.map(function (section) {
          const itemsVisibles = section.items.filter(function (item) { return onglets.indexOf(item.cle) !== -1; });
          if (itemsVisibles.length === 0) return null;
          return (
            <div className="react-sidebar-section" key={section.titre} role="group" aria-label={replie ? traduire(section.titre) : undefined}>
              {!replie ? <div className="react-sidebar-section-titre">{traduire(section.titre)}</div> : null}
              <ul className="react-nav-liste">
                {itemsVisibles.map(function (item) {
                  const estActif = pageActive === item.cle || (item.cle === "paiements-gestion" && pageActive === "paiements");
                  const Icone = item.icone;
                  const labelItem = (role === "parent" && item.cle === "eleves")
                    ? "Mes Enfants"
                    : item.label;
                  return (
                    <li key={item.cle + section.titre}>
                      <button
                        type="button"
                        onClick={function () { naviguerVers(item.cle); }}
                        className={"react-nav-link" + (estActif ? " actif" : "")}
                        title={replie ? labelItem : undefined}
                        aria-label={replie ? labelItem : undefined}
                        aria-current={estActif ? "page" : undefined}
                      >
                        <span className="react-nav-icone"><Icone /></span>
                        {!replie ? labelItem : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="react-sidebar-bas">
        {/* Encart d'état système professionnel en bas du menu */}
        {!replie ? (
          <div style={{ padding: "0.65rem 0.9rem", margin: "0.4rem 0.6rem 0.6rem 0.6rem", background: "rgba(255,255,255,0.05)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)", fontSize: "0.76rem" }}>
            <div style={{ color: "#94A3B8", fontWeight: 500, marginBottom: "0.2rem" }}>
              Année 2026-2027 • Trimestre 1
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#F8FAFC", fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block" }}></span>
              <span>{etiquetteRole || "Utilisateur"} connecté</span>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className="react-sidebar-deconnexion"
          onClick={onDeconnexion}
          aria-label={replie ? traduire("Déconnexion") : undefined}
        >
          <span className="react-nav-icone"><IconeDeconnexion /></span>
          {!replie ? traduire("Déconnexion") : null}
        </button>
      </div>
    </aside>
    </>
  );
}
