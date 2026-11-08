// src/components/Header.jsx
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import OnboardingModal, { calculerPourcentage } from "./OnboardingModal.jsx";
import { IconeMenu } from "./IconesSidebar.jsx";
import SelecteurLangue from "./SelecteurLangue.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import NotificationBell from "./NotificationBell.jsx";

const LIBELLES_ROLE = {
  fr: { administrateur: "Espace Administration", enseignant: "Espace Enseignant", parent: "Espace Parent" },
  en: { administrateur: "Administration", enseignant: "Teacher portal", parent: "Parent portal" },
};
const CLE_MASQUE = "magnificat_guide_masque";

export default function Header({
  token,
  utilisateur,
  role,
  langue,
  onChangerLangue,
  parametres,
  etapesOnboarding,
  onDeconnexion,
  onBasculerMenu,
  theme,
  onBasculerTheme,
  onOuvrirPalette,
}) {
  const [modalOuvert, setModalOuvert] = useState(false);
  const nomEcole = parametres ? parametres.nom_ecole : "...";
  const anneeScolaire = parametres ? parametres.annee_scolaire_active : "";
  const libelleEspace = (LIBELLES_ROLE[langue] || LIBELLES_ROLE.fr)[role] || "";
  const pourcentage = calculerPourcentage(etapesOnboarding);

  useEffect(function () {
    if (pourcentage !== null && pourcentage < 100) {
      const dejaMasque = localStorage.getItem(CLE_MASQUE) === "1";
      if (!dejaMasque) setModalOuvert(true);
    }
  }, [pourcentage === null]);

  const masquerDefinitivement = function () {
    localStorage.setItem(CLE_MASQUE, "1");
    setModalOuvert(false);
  };

  return (
    <>
      <header className="react-header">
        <div className="react-header-gauche">
          <button
            type="button"
            className="react-header-hamburger"
            onClick={onBasculerMenu}
            aria-label={langue === "en" ? "Open menu" : "Ouvrir le menu"}
          >
            <IconeMenu />
          </button>
          <span className="react-header-ecole">{nomEcole}</span>
          <span className="react-header-separateur">|</span>
          <span className="react-header-espace">{libelleEspace}</span>
        </div>

        <div className="react-header-droite">
          {/* Barre de recherche rapide (Ctrl + K) */}
          <button
            type="button"
            className="react-header-recherche"
            onClick={onOuvrirPalette}
            title={langue === "en" ? "Quick command search (Ctrl + K)" : "Recherche rapide clavier (Ctrl + K)"}
            aria-label={langue === "en" ? "Search pages and actions" : "Rechercher pages et actions"}
          >
            <Search size={14} className="react-header-recherche-icone" />
            <span className="react-header-recherche-texte">
              {langue === "en" ? "Search..." : "Rechercher..."}
            </span>
            <kbd className="react-header-recherche-kbd">Ctrl K</kbd>
          </button>

          {/* Badge Année scolaire */}
          {anneeScolaire ? <span className="react-header-badge">{anneeScolaire}</span> : null}

          {/* Cloche de Notifications interactive */}
          <NotificationBell token={token} role={role} langue={langue} />

          {/* Sélecteur Thème Sombre / Clair */}
          <ThemeToggle theme={theme} onBasculerTheme={onBasculerTheme} langue={langue} />

          {/* Sélecteur de langue */}
          <SelecteurLangue langue={langue} onChangerLangue={onChangerLangue} />

          {/* Guide d'onboarding (Admin) */}
          {pourcentage !== null ? (
            <button
              type="button"
              className="react-header-badge-progres"
              onClick={function () { setModalOuvert(true); }}
              title={langue === "en" ? "Configuration guide progress" : "Progression du guide de configuration de l'établissement"}
            >
              <span className="react-header-badge-progres-point"></span>
              {langue === "en" ? "Guide" : "Guide"} : {pourcentage}%
            </button>
          ) : null}

          {/* Avatar & Identité utilisateur */}
          <div className="react-header-utilisateur">
            <span className="react-header-avatar">{(utilisateur || "?").charAt(0).toUpperCase()}</span>
            <span className="react-header-nom">{utilisateur}</span>
          </div>

          {/* Déconnexion */}
          <button
            type="button"
            className="react-header-deconnexion"
            onClick={onDeconnexion}
          >
            {langue === "en" ? "Sign out" : "Deconnexion"}
          </button>
        </div>
      </header>

      {modalOuvert ? (
        <OnboardingModal
          etapes={etapesOnboarding}
          onFermer={function () { setModalOuvert(false); }}
          onMasquer={masquerDefinitivement}
        />
      ) : null}
    </>
  );
}
