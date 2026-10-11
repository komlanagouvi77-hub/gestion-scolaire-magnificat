// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { connecter, enregistrerSession, effacerSession, recupererProfil, obtenirIdentitePublique, nomAffichage } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import { traduireTexte } from "../localisation.js";
import SelecteurLangue from "../components/SelecteurLangue.jsx";

function IconeCadenas() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="9" rx="2"></rect>
      <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
    </svg>
  );
}

function IconePersonne() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4"></circle>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
    </svg>
  );
}

function IconeOeil({ ouvert }) {
  if (ouvert) {
    return (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l18 18"></path>
      <path d="M10.6 5.1A11 11 0 0 1 12 5c7 0 11 7 11 7a17.6 17.6 0 0 1-3.2 4"></path>
      <path d="M6.6 6.6C3.8 8.4 2 12 2 12s4 7 11 7a10 10 0 0 0 4.2-.9"></path>
      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2"></path>
    </svg>
  );
}

function IconeGraphique() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20V10M12 20V4M20 20v-7"></path>
    </svg>
  );
}
function IconePaiement() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="20" height="14" rx="2"></rect>
      <path d="M2 10h20"></path>
    </svg>
  );
}
function IconeMessage() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}

function ChampFlottant({ id, label, type, valeur, onChange, icone, requis, boutonOeil }) {
  const [focalise, setFocalise] = useState(false);
  const flotte = focalise || valeur.length > 0;
  return (
    <div className={"react-champ-flottant" + (flotte ? " actif" : "")}>
      <span className="react-icone-champ">{icone}</span>
      <input
        id={id} type={type} value={valeur} required={requis}
        onFocus={function () { setFocalise(true); }}
        onBlur={function () { setFocalise(false); }}
        onChange={onChange}
      />
      <label htmlFor={id} className={requis ? "mag-label-requis" : undefined}>{label}</label>
      {boutonOeil}
    </div>
  );
}

const ESPACES = [
  { role: "administrateur", label: "Administration" },
  { role: "enseignant", label: "Enseignants" },
  { role: "parent", label: "Parents" },
];

const LIBELLES_ROLE = { administrateur: "Administration", enseignant: "Enseignant", parent: "Parent" };

export default function Login({ onConnecte, langue, onChangerLangue }) {
  const [utilisateur, setUtilisateur] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [espaceChoisi, setEspaceChoisi] = useState(null);
  const [identiteEcole, setIdentiteEcole] = useState({ nom_ecole: null, logo: null });

  useEffect(function () {
    obtenirIdentitePublique().then(setIdentiteEcole).catch(function () {});
  }, []);

  const nomEcoleAffiche = identiteEcole.nom_ecole || "Complexe Scolaire Magnificat";

  const basculerEspace = function (role) {
    setEspaceChoisi(espaceChoisi === role ? null : role);
    setErreur("");
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setErreur("");
    setEnCours(true);
    try {
      const token = await connecter(utilisateur, motDePasse);
      let role = null;
      let nomAffiche = utilisateur;
      try {
        const profil = await recupererProfil(token);
        role = profil.role;
        nomAffiche = nomAffichage(profil, utilisateur);
      } catch (erreurProfil) {
        role = null;
      }

      if (espaceChoisi && role !== espaceChoisi) {
        effacerSession();
        const libelleReel = LIBELLES_ROLE[role] || "inconnu";
        const libelleChoisi = LIBELLES_ROLE[espaceChoisi];
        setErreur(
          "Ce compte correspond a l'espace " + libelleReel + ", pas " + libelleChoisi +
          ". Choisissez le bon espace ou laissez la selection vide."
        );
        setEnCours(false);
        return;
      }

      enregistrerSession(token, nomAffiche, role);
      onConnecte(token, nomAffiche, role);
    } catch (err) {
      setErreur(err.message);
    }
    setEnCours(false);
  };

  return (
    <div className="react-login-split">
      <div className="react-login-panneau">
        <div className="react-panneau-fond"></div>
        <div className="react-panneau-contenu">
          <div className="react-panneau-crest">
            <img
              src={identiteEcole.logo || (import.meta.env.BASE_URL + "logo-ecole-defaut.png")}
              alt={nomEcoleAffiche}
              style={{ width: "100%", height: "100%", objectFit: identiteEcole.logo ? "cover" : "contain", padding: identiteEcole.logo ? 0 : "6px" }}
            />
          </div>
          <h1>{nomEcoleAffiche}</h1>
          <p className="react-panneau-tagline">La gestion scolaire, simplifiee et centralisee.</p>

          <ul className="react-panneau-liste">
            <li><span className="react-panneau-icone"><IconeGraphique /></span>Suivi des notes et bulletins en temps reel</li>
            <li><span className="react-panneau-icone"><IconePaiement /></span>Gestion des paiements par tranches</li>
            <li><span className="react-panneau-icone"><IconeMessage /></span>Communication directe parents-enseignants</li>
          </ul>

          <div className="react-panneau-pied">Adidogome — Lome, Togo</div>
        </div>
      </div>

      <div className="react-login-formulaire-zone">
        <div className="react-login-langue"><SelecteurLangue langue={langue} onChangerLangue={onChangerLangue} /></div>
        <div className="react-login-formulaire-carte">
          <h2>Connexion</h2>
          <p className="react-login-sous-titre">
            {espaceChoisi ? traduireTexte("Espace " + LIBELLES_ROLE[espaceChoisi] + " selectionne") : traduireTexte("Choisissez votre espace, ou connectez-vous directement")}
          </p>

          {erreur ? <Alerte>{erreur}</Alerte> : null}

          <form onSubmit={soumettre}>
            <ChampFlottant
              id="login-utilisateur"
              label="Nom d'utilisateur" type="text" valeur={utilisateur} requis={true}
              onChange={function (e) { setUtilisateur(e.target.value); }}
              icone={<IconePersonne />}
            />
            <ChampFlottant
              id="login-mot-de-passe"
              label="Mot de passe" type={motDePasseVisible ? "text" : "password"} valeur={motDePasse} requis={true}
              onChange={function (e) { setMotDePasse(e.target.value); }}
              icone={<IconeCadenas />}
              boutonOeil={
                <button type="button" className="react-bouton-oeil" onClick={function () { setMotDePasseVisible(!motDePasseVisible); }} aria-label="Afficher ou masquer le mot de passe">
                  <IconeOeil ouvert={motDePasseVisible} />
                </button>
              }
            />
            <button type="submit" className="mag-btn-primary react-btn-connexion" disabled={enCours}>
              {enCours ? <span className="react-spinner"></span> : "Se connecter"}
            </button>
          </form>

          <div className="react-login-espaces">
            {ESPACES.map(function (e) {
              const actif = espaceChoisi === e.role;
              return (
                <button
                  type="button" key={e.role}
                  className={"react-login-espace-badge" + (actif ? " actif" : "")}
                  onClick={function () { basculerEspace(e.role); }}
                >
                  {traduireTexte(e.label)}
                </button>
              );
            })}
          </div>
          <div className="react-login-pied" style={{ marginTop: "0.6rem" }}>
            {espaceChoisi ? "Cliquez a nouveau pour deselectionner." : "Selection facultative : identifie votre compte au moment de la connexion."}
          </div>
          <a href="#/demande-acces" className="react-lien-cta">
            <span>Pas encore de compte ?</span>
            <span className="react-lien-cta-action">Demander un acces <span className="react-lien-cta-fleche">→</span></span>
          </a>
        </div>
      </div>
    </div>
  );
}
