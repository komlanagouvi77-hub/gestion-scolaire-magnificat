// src/App.jsx
import { useState, useEffect } from "react";
import { obtenirTokenStocke, obtenirUtilisateurStocke, obtenirRoleStocke, enregistrerSession, effacerSession, recupererProfil, nomAffichage, obtenirParametres, lister } from "./api.js";
import Sidebar, { ONGLETS_PAR_ROLE } from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import Login from "./pages/Login.jsx";
import DemandeAcces from "./pages/DemandeAcces.jsx";
import GestionDemandesAcces from "./pages/GestionDemandesAcces.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ResourcePage, { CONFIG_RESSOURCES } from "./pages/ResourcePage.jsx";
import ElevesParClasse from "./pages/ElevesParClasse.jsx";
import Annonces from "./pages/Annonces.jsx";
import ParametresEcole from "./pages/ParametresEcole.jsx";
import SuiviSaisie from "./pages/SuiviSaisie.jsx";
import ImportEleves from "./pages/ImportEleves.jsx";
import GestionClasses from "./pages/GestionClasses.jsx";
import GestionMatieres from "./pages/GestionMatieres.jsx";
import GestionEnseignants from "./pages/GestionEnseignants.jsx";
import GestionParents from "./pages/GestionParents.jsx";
import GestionPaiements from "./pages/GestionPaiements.jsx";
import GestionBulletins from "./pages/GestionBulletins.jsx";
import EmploiDuTemps from "./pages/EmploiDuTemps.jsx";
import Messagerie from "./pages/Messagerie.jsx";
import GestionNotes from "./pages/GestionNotes.jsx";
import GestionAbsences from "./pages/GestionAbsences.jsx";
import Evenements from "./pages/Evenements.jsx";
import GestionConges from "./pages/GestionConges.jsx";
import SituationFinanciere from "./pages/SituationFinanciere.jsx";
import FicheEleve from "./pages/FicheEleve.jsx";

function lirePageDepuisUrl() {
  const hash = window.location.hash.replace(/^#\//, "");
  return hash || "dashboard";
}

export default function App() {
  const [token, setToken] = useState(obtenirTokenStocke());
  const [utilisateur, setUtilisateur] = useState(obtenirUtilisateurStocke());
  const [role, setRole] = useState(obtenirRoleStocke());
  const [page, setPage] = useState(lirePageDepuisUrl());
  const [parametres, setParametres] = useState(null);
  const [etapesOnboarding, setEtapesOnboarding] = useState(null);
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);
  const [langue, setLangue] = useState(function () {
    return localStorage.getItem("magnificat_langue") === "en" ? "en" : "fr";
  });

  const changerLangue = function (evenement) {
    const nouvelleLangue = evenement.target.value === "en" ? "en" : "fr";
    localStorage.setItem("magnificat_langue", nouvelleLangue);
    setLangue(nouvelleLangue);
  };

  useEffect(function () {
    document.documentElement.lang = langue;
  }, [langue]);

  useEffect(function () {
    const gererChangement = function () { setPage(lirePageDepuisUrl()); };
    window.addEventListener("hashchange", gererChangement);
    return function () { window.removeEventListener("hashchange", gererChangement); };
  }, []);

  useEffect(function () { setMenuMobileOuvert(false); }, [page]);

  useEffect(function () {
    if (token && !role) {
      recupererProfil(token).then(function (profil) {
        const nomAffiche = nomAffichage(profil, utilisateur);
        setRole(profil.role);
        setUtilisateur(nomAffiche);
        enregistrerSession(token, nomAffiche, profil.role);
      }).catch(function () {});
    }
  }, [token, role, utilisateur]);

  const chargerParametres = function () {
    if (token) {
      obtenirParametres(token).then(function (p) { setParametres(p); }).catch(function () {});
    }
  };

  useEffect(chargerParametres, [token]);

  useEffect(function () {
    if (token && role === "administrateur") {
      Promise.all([
        lister("classes", token),
        lister("enseignants", token),
        lister("eleves", token),
      ]).then(function (resultats) {
        const classes = resultats[0];
        const enseignants = resultats[1];
        const eleves = resultats[2];
        const auMoinsUnEnseignantAffecte = enseignants.some(function (e) {
          return (e.classes || []).length > 0 && (e.matieres || []).length > 0;
        });
        setEtapesOnboarding({
          identite: !!(parametres && parametres.nom_ecole && parametres.adresse),
          classes: classes.length > 0,
          equipe: enseignants.length > 0,
          eleves: eleves.length > 0,
          attribution: auMoinsUnEnseignantAffecte,
        });
      }).catch(function () {});
    }
  }, [token, role, parametres]);

  const gererConnexion = function (tok, user, r) {
    setToken(tok);
    setUtilisateur(user);
    setRole(r);
  };

  const seDeconnecter = function () {
    effacerSession();
    setToken(null);
    setUtilisateur(null);
    setRole(null);
    setParametres(null);
    setEtapesOnboarding(null);
    window.location.hash = "";
  };

  if (!token) {
    if (page === "demande-acces") {
      return <DemandeAcces langue={langue} onChangerLangue={changerLangue} />;
    }
    return <Login onConnecte={gererConnexion} langue={langue} onChangerLangue={changerLangue} />;
  }

  let contenuPage;
  if (page === "dashboard") {
    contenuPage = <Dashboard token={token} role={role} utilisateur={utilisateur} parametres={parametres} />;
  } else if (page === "eleves") {
    contenuPage = <ElevesParClasse token={token} role={role} />;
  } else if (page === "annonces") {
    contenuPage = <Annonces token={token} />;
  } else if (page === "parametres") {
    contenuPage = <ParametresEcole token={token} onEnregistre={function (p) { setParametres(p); }} />;
  } else if (page === "suivi") {
    contenuPage = <SuiviSaisie token={token} />;
  } else if (page === "import") {
    contenuPage = <ImportEleves token={token} />;
  } else if (page === "classes-gestion") {
    contenuPage = <GestionClasses token={token} />;
  } else if (page === "matieres-gestion") {
    contenuPage = <GestionMatieres token={token} />;
  } else if (page === "enseignants-gestion") {
    contenuPage = <GestionEnseignants token={token} />;
  } else if (page === "parents-gestion") {
    contenuPage = <GestionParents token={token} />;
  } else if (page === "paiements-gestion") {
    contenuPage = <GestionPaiements token={token} />;
  } else if (page === "bulletins") {
    contenuPage = <GestionBulletins token={token} role={role} />;
  } else if (page === "demandes-acces") {
    contenuPage = <GestionDemandesAcces token={token} />;
  } else if (page === "emploi-du-temps") {
    contenuPage = <EmploiDuTemps token={token} role={role} />;
  } else if (page === "messagerie") {
    contenuPage = <Messagerie token={token} />;
  } else if (page === "notes" && (role === "enseignant" || role === "administrateur")) {
    contenuPage = <GestionNotes token={token} role={role} />;
  } else if (page === "absences" && (role === "enseignant" || role === "administrateur")) {
    contenuPage = <GestionAbsences token={token} role={role} />;
  } else if (page === "evenements") {
    contenuPage = <Evenements token={token} role={role} />;
  } else if (page === "conges" && (role === "enseignant" || role === "administrateur")) {
    contenuPage = <GestionConges token={token} role={role} />;
  } else if (page === "situation-financiere" && role === "administrateur") {
    contenuPage = <SituationFinanciere token={token} />;
  } else if (page.indexOf("fiche-eleve/") === 0) {
    contenuPage = <FicheEleve eleveId={page.slice("fiche-eleve/".length)} token={token} role={role} />;
  } else if (CONFIG_RESSOURCES[page]) {
    contenuPage = <ResourcePage nom={page} token={token} />;
  } else {
    contenuPage = <Dashboard token={token} role={role} utilisateur={utilisateur} parametres={parametres} />;
  }

  const nomEcole = parametres ? parametres.nom_ecole : null;

  const onglets = ONGLETS_PAR_ROLE[role] || ["dashboard"];
  const acces_autorise = page === "dashboard" || onglets.indexOf(page) !== -1 || page.indexOf("fiche-eleve/") === 0;
  if (!acces_autorise) {
    contenuPage = (
      <div className="mag-card" style={{ maxWidth: "520px", textAlign: "center", padding: "2.5rem" }}>
        <div className="mag-stat-label" style={{ color: "var(--red-600)", marginBottom: "0.6rem" }}>{langue === "en" ? "Access denied" : "Acces refuse"}</div>
        <p style={{ color: "var(--ink-600)" }}>{langue === "en" ? "You do not have permission to access this page." : "Vous n'avez pas les droits necessaires pour acceder a cette page."}</p>
      </div>
    );
  }

  return (
    <div className="react-shell">
      <Sidebar pageActive={page} utilisateur={utilisateur} role={role} langue={langue} nomEcole={nomEcole} logoUrl={parametres ? parametres.logo : null} onDeconnexion={seDeconnecter} mobileOuvert={menuMobileOuvert} onFermerMobile={function () { setMenuMobileOuvert(false); }} />
      <div className="react-zone-principale">
        <Header utilisateur={utilisateur} role={role} langue={langue} onChangerLangue={changerLangue} parametres={parametres} etapesOnboarding={etapesOnboarding} onDeconnexion={seDeconnecter} onBasculerMenu={function () { setMenuMobileOuvert(function (v) { return !v; }); }} />
        <main className="react-contenu" key={page}>
          {contenuPage}
        </main>
      </div>
    </div>
  );
}
