// src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import {
  IconeGrille, IconeEleves, IconeCasquette, IconeCalendrier, IconeCarnet,
  IconePresseCahier, IconeMedaille, IconeBouclier, IconeDossier, IconeCarte,
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
      { cle: "eleves", label: "Eleves", icone: IconeEleves },
      { cle: "classes-gestion", label: "Classes", icone: IconeCasquette },
      { cle: "matieres-gestion", label: "Matieres", icone: IconeCarnet },
      { cle: "bulletins", label: "Bulletins", icone: IconeMedaille },
      { cle: "notes", label: "Notes", icone: IconePresseCahier },
      { cle: "absences", label: "Absences", icone: IconeBouclier },
      { cle: "emploi-du-temps", label: "Emploi du temps", icone: IconeCalendrier },
      { cle: "evenements", label: "Evenements", icone: IconeCalendrier },
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
      { cle: "situation-financiere", label: "Situation financiere", icone: IconeCarte },
      { cle: "conges", label: "Conges", icone: IconeHorloge },
      { cle: "annonces", label: "Annonces", icone: IconeAnnonce },
      { cle: "demandes-acces", label: "Demandes d'acces", icone: IconeCle },
      { cle: "import", label: "Import eleves", icone: IconeImport },
      { cle: "parametres", label: "Parametres", icone: IconeEngrenage },
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

const TRADUCTIONS_NAV_EN = {
  "Menu principal": "Main menu", "Tableau de bord": "Dashboard", "Gestion scolaire": "School management",
  "Eleves": "Students", "Classes": "Classes", "Matieres": "Subjects", "Bulletins": "Report cards",
  "Notes": "Grades", "Absences": "Attendance", "Emploi du temps": "Timetable", "Evenements": "Events",
  "Messagerie": "Messages", "Suivi des notes": "Grade tracking", "Administration & outils": "Administration & tools",
  "Enseignants": "Teachers", "Parents": "Parents", "Paiements": "Payments",
  "Situation financiere": "Financial overview", "Conges": "Leave requests", "Annonces": "Announcements",
  "Demandes d'acces": "Access requests", "Import eleves": "Import students", "Parametres": "Settings",
  "Administrateur": "Administrator", "Enseignant": "Teacher", "Deplier le menu": "Expand menu",
  "Replier le menu": "Collapse menu", "Navigation principale": "Main navigation", "Deconnexion": "Sign out",
};

export default function Sidebar({ pageActive, utilisateur, role, langue, nomEcole, logoUrl, onDeconnexion, mobileOuvert, onFermerMobile }) {
  const [replie, setReplie] = useState(false);
  const onglets = ONGLETS_PAR_ROLE[role] || SECTIONS_NAV.flatMap(function (s) { return s.items.map(function (i) { return i.cle; }); });

  const etiquetteRoleFr = role === "administrateur" ? "Administrateur" : role === "enseignant" ? "Enseignant" : role === "parent" ? "Parent" : "";
  const traduire = function (texte) { return langue === "en" ? (TRADUCTIONS_NAV_EN[texte] || texte) : texte; };
  const etiquetteRole = traduire(etiquetteRoleFr);
  const nomAffiche = nomEcole || "Magnificat";
  const initiale = nomAffiche.charAt(0).toUpperCase();

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
        aria-label={traduire(replie ? "Deplier le menu" : "Replier le menu")}
        aria-expanded={!replie}
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
                  const estActif = pageActive === item.cle;
                  const Icone = item.icone;
                  return (
                    <li key={item.cle + section.titre}>
                      <button
                        type="button"
                        onClick={function () { naviguerVers(item.cle); }}
                        className={"react-nav-link" + (estActif ? " actif" : "")}
                        title={replie ? traduire(item.label) : undefined}
                        aria-label={replie ? traduire(item.label) : undefined}
                        aria-current={estActif ? "page" : undefined}
                      >
                        <span className="react-nav-icone"><Icone /></span>
                        {!replie ? traduire(item.label) : null}
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
        {!replie ? (
          <div className="react-sidebar-badge-sys">● SYS : {langue === "en" ? "BILINGUAL" : "BILINGUE"}</div>
        ) : null}
        <div className="react-user-pill">
          {!replie ? utilisateur : initiale}
          {etiquetteRole && !replie ? <div className="react-role-tag">{etiquetteRole}</div> : null}
        </div>
        <button
          type="button"
          className="react-sidebar-deconnexion"
          onClick={onDeconnexion}
          aria-label={replie ? traduire("Deconnexion") : undefined}
        >
          <span className="react-nav-icone"><IconeDeconnexion /></span>
          {!replie ? traduire("Deconnexion") : null}
        </button>
      </div>
    </aside>
    </>
  );
}
