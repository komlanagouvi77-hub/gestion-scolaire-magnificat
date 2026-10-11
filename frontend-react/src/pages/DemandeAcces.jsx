// src/pages/DemandeAcces.jsx
// Formulaire PUBLIC (aucune connexion requise) de demande d'acces
// Enseignant/Parent. Le compte n'est cree qu'apres validation par un
// Administrateur (voir GestionDemandesAcces.jsx).
import { useState, useEffect } from "react";
import { soumettreDemandeAcces, obtenirIdentitePublique } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import SelecteurLangue from "../components/SelecteurLangue.jsx";

function IconePersonne() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4"></circle>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
    </svg>
  );
}
function IconeCadenas() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="9" rx="2"></rect>
      <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
    </svg>
  );
}
function IconeArrobase() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-5.3 8.2"></path>
    </svg>
  );
}
function IconeTelephone() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 6a2 2 0 0 1 2-2Z"></path>
    </svg>
  );
}
function IconeCasquette() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 9l10-5 10 5-10 5-10-5Z"></path>
      <path d="M6 11.5v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4"></path>
      <path d="M22 9v6"></path>
    </svg>
  );
}
function IconeFamille() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="8" r="3"></circle>
      <circle cx="17" cy="9" r="2.4"></circle>
      <path d="M2.5 20c0-3.3 2.5-5.8 5.5-5.8s5.5 2.5 5.5 5.8"></path>
      <path d="M14.5 20c0-2.6 1.8-4.6 4-4.6s4 2 4 4.6"></path>
    </svg>
  );
}
function IconeLivre() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"></path>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    </svg>
  );
}
function IconeValise() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2.5" y="7.5" width="19" height="12" rx="2"></rect>
      <path d="M8 7.5v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  );
}

function ChampFlottant({ label, type, valeur, onChange, icone, requis, placeholder, autoCompleteValeur, nomChamp }) {
  const [focalise, setFocalise] = useState(false);
  const flotte = focalise || (valeur && valeur.length > 0);
  return (
    <div className={"react-champ-flottant" + (flotte ? " actif" : "")}>
      <span className="react-icone-champ">{icone}</span>
      <input
        id={nomChamp} type={type} value={valeur} required={requis} placeholder={focalise ? placeholder : ""}
        autoComplete={autoCompleteValeur || "off"}
        name={nomChamp}
        onFocus={function () { setFocalise(true); }}
        onBlur={function () { setFocalise(false); }}
        onChange={onChange}
      />
      <label htmlFor={nomChamp} className={requis ? "mag-label-requis" : undefined}>{label}</label>
    </div>
  );
}

export default function DemandeAcces({ langue, onChangerLangue }) {
  const [typeCompte, setTypeCompte] = useState("enseignant");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [profession, setProfession] = useState("");
  const [matriculesEnfants, setMatriculesEnfants] = useState("");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState(false);
  const [identiteEcole, setIdentiteEcole] = useState({ nom_ecole: null, logo: null });

  useEffect(function () {
    obtenirIdentitePublique().then(setIdentiteEcole).catch(function () {});
  }, []);

  const nomEcoleAffiche = identiteEcole.nom_ecole || "Complexe Scolaire Magnificat";

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      await soumettreDemandeAcces({
        type_compte: typeCompte, username_souhaite: username, password: password,
        first_name: firstName, last_name: lastName, email: email, telephone: telephone,
        specialite: specialite, profession: profession, matricules_enfants: matriculesEnfants,
      });
      setSucces(true);
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  if (succes) {
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
            <h1>Demande envoyee</h1>
            <p className="react-panneau-tagline">{nomEcoleAffiche}</p>
          </div>
        </div>
        <div className="react-login-formulaire-zone">
          <div className="react-login-formulaire-carte react-demande-succes-carte">
            <div className="react-demande-succes-icone">✓</div>
            <h2 style={{ color: "var(--green-600)", textAlign: "center" }}>Demande envoyee</h2>
            <p className="react-login-sous-titre" style={{ textAlign: "center", marginBottom: "1.8rem" }}>
              Votre demande a bien ete transmise a l'administration. Vous serez informe(e) une fois qu'elle aura ete examinee.
              Vous pourrez alors vous connecter avec le nom d'utilisateur et le mot de passe que vous venez de choisir.
            </p>
            <a href="#/" className="mag-btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
              Retour a la connexion
            </a>
          </div>
        </div>
      </div>
    );
  }

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
          <p className="react-panneau-tagline">Demandez votre acces a la plateforme.</p>
          <ul className="react-panneau-liste">
            <li><span className="react-panneau-icone"><IconeLivre /></span>Remplissez le formulaire en 30 secondes</li>
            <li><span className="react-panneau-icone"><IconeCadenas /></span>Votre mot de passe reste confidentiel</li>
            <li><span className="react-panneau-icone"><IconePersonne /></span>L'administration valide votre acces</li>
          </ul>
          <div className="react-panneau-pied">Adidogome — Lome, Togo</div>
        </div>
      </div>

      <div className="react-login-formulaire-zone">
        <div className="react-login-langue"><SelecteurLangue langue={langue} onChangerLangue={onChangerLangue} /></div>
        <div className="react-login-formulaire-carte" style={{ maxWidth: "520px" }}>
          <h2>Demande d'acces</h2>
          <p className="react-login-sous-titre">Votre compte ne sera actif qu'apres validation par l'administration.</p>

          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

          <form onSubmit={soumettre}>
            <div className="react-selecteur-profil" role="group" aria-label="Type de compte">
              <button
                type="button"
                className={"react-carte-profil" + (typeCompte === "enseignant" ? " actif" : "")}
                aria-pressed={typeCompte === "enseignant"}
                onClick={function () { setTypeCompte("enseignant"); }}
              >
                <span className="react-carte-profil-icone"><IconeCasquette /></span>
                <span className="react-carte-profil-label">Enseignant</span>
              </button>
              <button
                type="button"
                className={"react-carte-profil" + (typeCompte === "parent" ? " actif" : "")}
                aria-pressed={typeCompte === "parent"}
                onClick={function () { setTypeCompte("parent"); }}
              >
                <span className="react-carte-profil-icone"><IconeFamille /></span>
                <span className="react-carte-profil-label">Parent</span>
              </button>
            </div>

            <div className="react-demande-section-titre">Vos informations</div>
            <div className="mag-grid-2">
              <ChampFlottant nomChamp="demande-prenom" label="Prenom" type="text" valeur={firstName} requis={true} onChange={function (e) { setFirstName(e.target.value); }} icone={<IconePersonne />} />
              <ChampFlottant nomChamp="demande-nom" label="Nom" type="text" valeur={lastName} requis={true} onChange={function (e) { setLastName(e.target.value); }} icone={<IconePersonne />} />
            </div>
            <div className="mag-grid-2">
              <ChampFlottant nomChamp="demande-email" label="Email" type="email" valeur={email} onChange={function (e) { setEmail(e.target.value); }} icone={<IconeArrobase />} />
              <ChampFlottant nomChamp="demande-telephone" label="Telephone" type="text" valeur={telephone} onChange={function (e) { setTelephone(e.target.value); }} icone={<IconeTelephone />} />
            </div>

            <div className="react-demande-section-titre">Identifiants de connexion</div>
            <div className="mag-grid-2">
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="champ_identifiant_demande">Nom d'utilisateur souhaite</label>
                <input id="champ_identifiant_demande" type="text" value={username} required autoComplete="off" name="champ_identifiant_demande" onChange={function (e) { setUsername(e.target.value); }} />
              </div>
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="champ_secret_demande">Mot de passe souhaite</label>
                <input id="champ_secret_demande" type="password" value={password} required autoComplete="new-password" name="champ_secret_demande" onChange={function (e) { setPassword(e.target.value); }} />
              </div>
            </div>

            <div className="react-demande-section-titre">
              {typeCompte === "enseignant" ? "Informations professionnelles" : "Vos enfants"}
            </div>
            {typeCompte === "enseignant" ? (
              <ChampFlottant nomChamp="demande-specialite" label="Specialite" type="text" valeur={specialite} onChange={function (e) { setSpecialite(e.target.value); }} icone={<IconeValise />} placeholder="Ex: Mathematiques" />
            ) : (
              <>
                <ChampFlottant nomChamp="demande-profession" label="Profession" type="text" valeur={profession} onChange={function (e) { setProfession(e.target.value); }} icone={<IconeValise />} />
                <ChampFlottant nomChamp="demande-matricules" label="Matricule(s) de vos enfants (separes par des virgules)" type="text" valeur={matriculesEnfants} onChange={function (e) { setMatriculesEnfants(e.target.value); }} icone={<IconeFamille />} placeholder="Ex: EL001, EL002" />
              </>
            )}

            <button type="submit" className="mag-btn-primary react-btn-connexion" disabled={enCours} style={{ marginTop: "0.6rem" }}>
              {enCours ? <span className="react-spinner"></span> : "Envoyer la demande"}
            </button>
          </form>

          <div style={{ textAlign: "center" }}>
            <a href="#/" className="react-lien-retour">
              <span style={{ transform: "translateY(-1px)" }}>←</span> Retour a la connexion
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
