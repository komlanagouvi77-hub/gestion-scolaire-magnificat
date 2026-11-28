// src/components/Header.jsx
import { IconeMenu } from "./IconesSidebar.jsx";

const LIBELLES_ROLE = {
  administrateur: "Espace Administration",
  enseignant: "Espace Enseignant",
  parent: "Espace Parent",
};

export default function Header({
  utilisateur,
  role,
  parametres,
  onDeconnexion,
  onBasculerMenu,
}) {
  const nomEcole = parametres ? parametres.nom_ecole : "Complexe Scolaire Magnificat";
  const libelleEspace = LIBELLES_ROLE[role] || "Espace Scolaire";

  return (
    <header className="react-header">
      <div className="react-header-gauche">
        <button
          type="button"
          className="react-header-hamburger"
          onClick={onBasculerMenu}
          aria-label="Ouvrir le menu"
        >
          <IconeMenu />
        </button>
        <span className="react-header-ecole">{nomEcole}</span>
        <span className="react-header-separateur">|</span>
        <span className="react-header-espace">{libelleEspace}</span>
      </div>

      <div className="react-header-droite">
        <div className="react-header-utilisateur">
          <span className="react-header-nom">{utilisateur}</span>
          <span className="react-header-separateur">|</span>
          <button
            type="button"
            className="react-header-deconnexion"
            onClick={onDeconnexion}
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
