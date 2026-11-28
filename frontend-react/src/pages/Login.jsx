// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { connecter, enregistrerSession, recupererProfil, obtenirIdentitePublique, nomAffichage } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";

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

function formaterMinSec(secondes) {
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  const mm = m < 10 ? "0" + m : "" + m;
  const ss = s < 10 ? "0" + s : "" + s;
  return mm + ":" + ss;
}

function ChampFlottant({ id, label, type, valeur, onChange, icone, requis, boutonOeil, desactive }) {
  const [focalise, setFocalise] = useState(false);
  const flotte = focalise || valeur.length > 0;
  return (
    <div className={"react-champ-flottant" + (flotte ? " actif" : "") + (focalise ? " focalise" : "")}>
      <span className="react-icone-champ">{icone}</span>
      <input
        id={id}
        type={type}
        value={valeur}
        required={requis}
        disabled={desactive}
        onFocus={function () { setFocalise(true); }}
        onBlur={function () { setFocalise(false); }}
        onChange={onChange}
      />
      <label htmlFor={id}>{label}</label>
      {boutonOeil}
    </div>
  );
}

export default function Login({ onConnecte, langue, onChangerLangue }) {
  const [utilisateur, setUtilisateur] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [bloque, setBloque] = useState(false);
  const [tempsRestant, setTempsRestant] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [identiteEcole, setIdentiteEcole] = useState({ nom_ecole: null, logo: null });

  useEffect(function () {
    obtenirIdentitePublique().then(setIdentiteEcole).catch(function () {});
  }, []);

  useEffect(function () {
    if (tempsRestant <= 0) {
      if (bloque) {
        setBloque(false);
        setErreur("");
      }
      return;
    }
    const timer = setInterval(function () {
      setTempsRestant(function (prev) {
        if (prev <= 1) {
          clearInterval(timer);
          setBloque(false);
          setErreur("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return function () {
      clearInterval(timer);
    };
  }, [tempsRestant, bloque]);

  const nomEcoleAffiche = identiteEcole.nom_ecole || "Complexe Scolaire Magnificat";

  const soumettre = async function (evt) {
    evt.preventDefault();
    if (bloque || tempsRestant > 0) return;
    setErreur("");
    setEnCours(true);
    try {
      const identifiant = utilisateur.trim();
      const token = await connecter(identifiant, motDePasse);
      let role = null;
      let nomAffiche = identifiant;
      try {
        const profil = await recupererProfil(token);
        role = profil.role;
        nomAffiche = nomAffichage(profil, identifiant);
      } catch (erreurProfil) {
        role = null;
      }

      setBloque(false);
      setTempsRestant(0);
      enregistrerSession(token, nomAffiche, role);
      window.location.hash = "#/dashboard";
      onConnecte(token, nomAffiche, role);
    } catch (err) {
      if (err.status === 429 || (err.data && err.data.bloque)) {
        setBloque(true);
        const delai = (err.data && (err.data.retry_after || err.data.temps_restant)) || err.retry_after || 300;
        setTempsRestant(delai);
        setErreur(err.message || "Compte temporairement bloqué suite à plusieurs tentatives erronées.");
      } else {
        setErreur(err.message || "Identifiants incorrects.");
      }
    }
    setEnCours(false);
  };

  const estVerrouille = bloque && tempsRestant > 0;

  return (
    <div className="react-login-split">
      <div className="react-login-panneau">
        <div className="react-panneau-fond"></div>
        <div className="react-panneau-contenu">
          <div className="react-panneau-crest">
            <img
              src={identiteEcole.logo || (import.meta.env.BASE_URL + "logo-ecole-defaut.png")}
              alt={nomEcoleAffiche}
              style={{
                width: "100%",
                height: "100%",
                objectFit: identiteEcole.logo ? "cover" : "contain",
                padding: identiteEcole.logo ? 0 : "6px",
              }}
            />
          </div>
          <h1>{nomEcoleAffiche}</h1>
          <p className="react-panneau-tagline">La gestion scolaire, simplifiée et centralisée.</p>

          <ul className="react-panneau-liste">
            <li>
              <span className="react-panneau-icone"><IconeGraphique /></span>
              Suivi des notes et bulletins en temps réel
            </li>
            <li>
              <span className="react-panneau-icone"><IconePaiement /></span>
              Gestion des paiements par tranches
            </li>
            <li>
              <span className="react-panneau-icone"><IconeMessage /></span>
              Communication directe parents-enseignants
            </li>
          </ul>

          <div className="react-panneau-pied">Adidogomé — Lomé, Togo</div>
        </div>
      </div>

      <div className="react-login-formulaire-zone">
        <div className="react-login-formulaire-carte">
          <h2>Connexion</h2>
          <p className="react-login-sous-titre">
            Connectez-vous à votre espace personnel
          </p>

          {estVerrouille ? (
            <div
              style={{
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "6px",
                padding: "0.85rem 1rem",
                marginBottom: "1.2rem",
                fontSize: "0.85rem",
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "0.25rem", color: "#991B1B" }}>
                Compte temporairement bloqué
              </div>
              <div style={{ color: "#7F1D1D" }}>
                Compte temporairement bloqué suite à plusieurs tentatives erronées.
              </div>
              <div style={{ marginTop: "0.45rem", fontWeight: 600, color: "#DC2626" }}>
                Accès temporairement verrouillé. Nouvelle tentative possible dans {formaterMinSec(tempsRestant)}
              </div>
            </div>
          ) : erreur ? (
            <Alerte type="erreur">{erreur}</Alerte>
          ) : null}

          <form onSubmit={soumettre}>
            <ChampFlottant
              id="login-utilisateur"
              label="Nom d'utilisateur"
              type="text"
              valeur={utilisateur}
              requis={true}
              desactive={estVerrouille}
              onChange={function (e) { setUtilisateur(e.target.value); }}
              icone={<IconePersonne />}
            />
            <ChampFlottant
              id="login-mot-de-passe"
              label="Mot de passe"
              type={motDePasseVisible ? "text" : "password"}
              valeur={motDePasse}
              requis={true}
              desactive={estVerrouille}
              onChange={function (e) { setMotDePasse(e.target.value); }}
              icone={<IconeCadenas />}
              boutonOeil={
                <button
                  type="button"
                  className="react-bouton-oeil"
                  disabled={estVerrouille}
                  onClick={function () { setMotDePasseVisible(!motDePasseVisible); }}
                  aria-label="Afficher ou masquer le mot de passe"
                >
                  <IconeOeil ouvert={motDePasseVisible} />
                </button>
              }
            />
            <button
              type="submit"
              className="mag-btn-primary react-btn-connexion"
              disabled={enCours || estVerrouille}
              style={{
                backgroundColor: estVerrouille ? "#94A3B8" : "#1E3A8A",
                cursor: estVerrouille ? "not-allowed" : "pointer",
                transition: "background-color 0.2s ease",
              }}
            >
              {enCours ? (
                <span className="react-spinner"></span>
              ) : estVerrouille ? (
                `Verrouillé (${formaterMinSec(tempsRestant)})`
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          <a href="#/demande-acces" className="react-lien-cta">
            <span>Pas encore de compte ?</span>
            <span className="react-lien-cta-action">Demander un accès</span>
          </a>
        </div>
      </div>
    </div>
  );
}
