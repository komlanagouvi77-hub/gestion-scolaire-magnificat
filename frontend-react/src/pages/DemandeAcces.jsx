// src/pages/DemandeAcces.jsx
// Formulaire PUBLIC (aucune connexion requise) de demande d'acces
// Enseignant/Parent avec validation ultra-professionnelle et confidentialite renforcee.
// Le compte n'est cree qu'apres validation manuelle par l'administration.
import { useState, useEffect, useRef } from "react";
import { soumettreDemandeAcces, obtenirIdentitePublique } from "../api.js";
import SelecteurLangue from "../components/SelecteurLangue.jsx";
import { traduireTexte } from "../localisation.js";

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

function IconeBouclier() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <path d="M9 12l2 2 4-4"></path>
    </svg>
  );
}

function IconeOeil({ ouvert }) {
  if (ouvert) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l18 18"></path>
      <path d="M10.6 5.1A11 11 0 0 1 12 5c7 0 11 7 11 7a17.6 17.6 0 0 1-3.2 4"></path>
      <path d="M6.6 6.6C3.8 8.4 2 12 2 12s4 7 11 7a10 10 0 0 0 4.2-.9"></path>
      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2"></path>
    </svg>
  );
}

function IconeAlerte() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  );
}

function IconeCheck() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

function ChampFlottant({
  label,
  type,
  valeur,
  onChange,
  onBlur,
  icone,
  requis,
  placeholder,
  autoCompleteValeur,
  nomChamp,
  erreur,
  succesMsg,
  boutonAction,
  inputRef,
}) {
  const [focalise, setFocalise] = useState(false);
  const flotte = focalise || (valeur && String(valeur).length > 0);
  const classeEtat = erreur ? " erreur" : (succesMsg ? " succes" : "");

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div className={"react-champ-flottant" + (flotte ? " actif" : "") + classeEtat} style={{ marginBottom: 0 }}>
        <span className="react-icone-champ">{icone}</span>
        <input
          ref={inputRef}
          id={nomChamp}
          type={type}
          value={valeur}
          required={requis}
          placeholder={focalise ? placeholder : ""}
          autoComplete={autoCompleteValeur || "off"}
          name={nomChamp}
          onFocus={function () { setFocalise(true); }}
          onBlur={function (e) {
            setFocalise(false);
            if (onBlur) onBlur(e);
          }}
          onChange={onChange}
        />
        <label htmlFor={nomChamp} className={requis ? "mag-label-requis" : undefined}>{label}</label>
        {boutonAction}
      </div>
      {erreur ? (
        <div className="react-champ-erreur-msg" role="alert">
          <IconeAlerte />
          <span>{erreur}</span>
        </div>
      ) : null}
      {!erreur && succesMsg ? (
        <div className="react-champ-succes-msg">
          <IconeCheck />
          <span>{succesMsg}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function DemandeAcces({ langue, onChangerLangue }) {
  const [typeCompte, setTypeCompte] = useState("enseignant");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [profession, setProfession] = useState("");
  const [matriculesEnfants, setMatriculesEnfants] = useState("");

  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [confirmerVisible, setConfirmerVisible] = useState(false);

  // Suivi des champs touches pour affichage des erreurs
  const [touches, setTouches] = useState({});
  const [erreursBackend, setErreursBackend] = useState({});
  const [banniereErreur, setBanniereErreur] = useState(null);

  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState(false);
  const [identiteEcole, setIdentiteEcole] = useState({ nom_ecole: null, logo: null });

  // References pour l'auto-focus sur la premiere erreur
  const inputRefs = {
    firstName: useRef(null),
    lastName: useRef(null),
    email: useRef(null),
    telephone: useRef(null),
    username: useRef(null),
    password: useRef(null),
    confirmPassword: useRef(null),
  };

  useEffect(function () {
    obtenirIdentitePublique().then(setIdentiteEcole).catch(function () {});
  }, []);

  const nomEcoleAffiche = identiteEcole.nom_ecole || "Complexe Scolaire Magnificat";

  // Fonctions de validation avancee
  const marquerTouche = function (champ) {
    setTouches(function (prev) {
      return { ...prev, [champ]: true };
    });
  };

  // Evaluation de la solidite du mot de passe
  const aAuMoins8 = password.length >= 8;
  const aLettre = /[a-zA-Z]/.test(password);
  const aChiffre = /[0-9]/.test(password);
  const aSpecial = /[^a-zA-Z0-9]/.test(password) || password.length >= 12;

  let scoreMdp = 0;
  if (password.length > 0) {
    if (aAuMoins8) scoreMdp++;
    if (aLettre) scoreMdp++;
    if (aChiffre) scoreMdp++;
    if (aSpecial) scoreMdp++;
  }

  let labelForce = "Très faible";
  let couleurForce = "#dc2626";
  let pourcentageForce = "15%";
  if (scoreMdp === 2) {
    labelForce = "Faible";
    couleurForce = "#ea580c";
    pourcentageForce = "40%";
  } else if (scoreMdp === 3) {
    labelForce = "Moyen";
    couleurForce = "#0284c7";
    pourcentageForce = "70%";
  } else if (scoreMdp >= 4) {
    labelForce = "Très sécurisé";
    couleurForce = "#16a34a";
    pourcentageForce = "100%";
  }

  // Calcul dynamique des erreurs par champ
  const validerChamps = function () {
    const errs = {};

    // Prenom
    const prenomTrim = firstName.trim();
    if (!prenomTrim) {
      errs.firstName = "Le prénom est obligatoire.";
    } else if (prenomTrim.length < 2) {
      errs.firstName = "Le prénom doit comporter au moins 2 lettres.";
    } else if (/[0-9]/.test(prenomTrim)) {
      errs.firstName = "Le prénom ne peut pas contenir de chiffres.";
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(prenomTrim)) {
      errs.firstName = "Le prénom contient des caractères non autorisés.";
    }

    // Nom
    const nomTrim = lastName.trim();
    if (!nomTrim) {
      errs.lastName = "Le nom de famille est obligatoire.";
    } else if (nomTrim.length < 2) {
      errs.lastName = "Le nom doit comporter au moins 2 lettres.";
    } else if (/[0-9]/.test(nomTrim)) {
      errs.lastName = "Le nom ne peut pas contenir de chiffres.";
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(nomTrim)) {
      errs.lastName = "Le nom contient des caractères non autorisés.";
    }

    // Email
    const emailTrim = email.trim();
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      errs.email = "Format d'adresse email invalide (ex: exemple@gmail.com).";
    }

    // Telephone
    const telTrim = telephone.trim();
    if (telTrim) {
      if (/[a-zA-Z]/.test(telTrim)) {
        errs.telephone = "Le téléphone ne doit contenir que des chiffres (ex: +228 90 12 34 56).";
      } else {
        const chiffres = telTrim.replace(/\D/g, "");
        if (chiffres.length < 8) {
          errs.telephone = "Le numéro de téléphone doit comporter au moins 8 chiffres.";
        }
      }
    }

    // Nom d'utilisateur
    const userTrim = username.trim();
    if (!userTrim) {
      errs.username = "Le nom d'utilisateur est obligatoire.";
    } else if (userTrim.length < 3) {
      errs.username = "L'identifiant doit comporter au moins 3 caractères.";
    } else if (!/^[a-zA-Z0-9._-]+$/.test(userTrim)) {
      errs.username = "Caractères autorisés : lettres, chiffres, points, tirets ou underscores.";
    }

    // Mot de passe
    if (!password) {
      errs.password = "Le mot de passe est obligatoire.";
    } else if (password.length < 8) {
      errs.password = "Le mot de passe doit comporter au moins 8 caractères.";
    } else if (!aLettre || !aChiffre) {
      errs.password = "Le mot de passe doit contenir au moins une lettre et un chiffre.";
    }

    // Confirmation mot de passe
    if (!confirmPassword) {
      errs.confirmPassword = "Veuillez confirmer votre mot de passe.";
    } else if (password && confirmPassword !== password) {
      errs.confirmPassword = "Les mots de passe ne correspondent pas.";
    }

    return errs;
  };

  const erreurs = validerChamps();

  // Soumission ultra securisee
  const soumettre = async function (evt) {
    evt.preventDefault();
    setBanniereErreur(null);
    setErreursBackend({});

    // Marquer tous les champs obligatoires comme touches
    const tousTouches = {
      firstName: true,
      lastName: true,
      email: true,
      telephone: true,
      username: true,
      password: true,
      confirmPassword: true,
      specialite: true,
      profession: true,
      matriculesEnfants: true,
    };
    setTouches(tousTouches);

    // Verifier s'il y a des erreurs cote client
    const listeErreurs = Object.entries(erreurs);
    if (listeErreurs.length > 0) {
      const premierChamp = listeErreurs[0][0];
      if (inputRefs[premierChamp] && inputRefs[premierChamp].current) {
        inputRefs[premierChamp].current.focus();
      }
      setBanniereErreur({
        titre: "Veuillez corriger les informations suivantes :",
        messages: Object.values(erreurs),
      });
      return;
    }

    setEnCours(true);
    try {
      await soumettreDemandeAcces({
        type_compte: typeCompte,
        username_souhaite: username.trim(),
        password: password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        telephone: telephone.trim(),
        specialite: specialite.trim(),
        profession: profession.trim(),
        matricules_enfants: matriculesEnfants.trim(),
      });
      setSucces(true);
    } catch (err) {
      // Mapping des erreurs retournees par le backend
      const details = err.detailsChamps || {};
      const errsBackendLocales = {};
      const messagesBanniere = [];

      if (details.username_souhaite) {
        const msg = Array.isArray(details.username_souhaite) ? details.username_souhaite[0] : details.username_souhaite;
        errsBackendLocales.username = msg;
        messagesBanniere.push("Identifiant : " + msg);
      }
      if (details.password) {
        const msg = Array.isArray(details.password) ? details.password[0] : details.password;
        errsBackendLocales.password = msg;
        messagesBanniere.push("Mot de passe : " + msg);
      }
      if (details.first_name) {
        const msg = Array.isArray(details.first_name) ? details.first_name[0] : details.first_name;
        errsBackendLocales.firstName = msg;
        messagesBanniere.push("Prénom : " + msg);
      }
      if (details.last_name) {
        const msg = Array.isArray(details.last_name) ? details.last_name[0] : details.last_name;
        errsBackendLocales.lastName = msg;
        messagesBanniere.push("Nom : " + msg);
      }
      if (details.telephone) {
        const msg = Array.isArray(details.telephone) ? details.telephone[0] : details.telephone;
        errsBackendLocales.telephone = msg;
        messagesBanniere.push("Téléphone : " + msg);
      }
      if (details.email) {
        const msg = Array.isArray(details.email) ? details.email[0] : details.email;
        errsBackendLocales.email = msg;
        messagesBanniere.push("Email : " + msg);
      }

      setErreursBackend(errsBackendLocales);

      if (messagesBanniere.length > 0) {
        setBanniereErreur({
          titre: "L'administration a refusé certains éléments saisis :",
          messages: messagesBanniere,
        });
      } else {
        setBanniereErreur({
          titre: "Erreur lors de l'envoi de la demande",
          messages: [err.message || "Une erreur est survenue."],
        });
      }

      // Auto-focus sur le premier champ en erreur
      const premierBackend = Object.keys(errsBackendLocales)[0];
      if (premierBackend && inputRefs[premierBackend] && inputRefs[premierBackend].current) {
        inputRefs[premierBackend].current.focus();
      }
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
            <h1>Demande transmise avec succès</h1>
            <p className="react-panneau-tagline">{nomEcoleAffiche}</p>
          </div>
        </div>
        <div className="react-login-formulaire-zone">
          <div className="react-login-formulaire-carte react-demande-succes-carte">
            <div className="react-demande-succes-icone">✓</div>
            <h2 style={{ color: "var(--green-600)", textAlign: "center", marginBottom: "0.5rem" }}>
              Demande enregistrée
            </h2>
            <p className="react-login-sous-titre" style={{ textAlign: "center", marginBottom: "1.5rem", lineHeight: "1.5" }}>
              Votre demande d'accès a été transmise en toute sécurité à l'administration de l'établissement.
              Elle sera examinée par la direction. Une fois validée, vous pourrez vous connecter immédiatement
              avec vos identifiants.
            </p>
            <div className="react-securite-carte" style={{ marginBottom: "1.5rem" }}>
              <div className="react-securite-en-tete">
                <div className="react-securite-badge-icone"><IconeBouclier /></div>
                <div className="react-securite-titre-bloc">
                  <strong>Confidentialité préservée</strong>
                  <span>Votre mot de passe a été chiffré de bout en bout</span>
                </div>
              </div>
            </div>
            <a href="#/" className="mag-btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
              Retour à la page de connexion
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
          <p className="react-panneau-tagline">Portail officiel d'accès à la plateforme scolaire</p>
          <ul className="react-panneau-liste">
            <li><span className="react-panneau-icone"><IconeLivre /></span>Formulaire d'inscription sécurisé</li>
            <li><span className="react-panneau-icone"><IconeCadenas /></span>Mot de passe chiffré et strictement confidentiel</li>
            <li><span className="react-panneau-icone"><IconePersonne /></span>Validation manuelle par la direction</li>
          </ul>
          <div className="react-panneau-pied">Adidogome — Lome, Togo</div>
        </div>
      </div>

      <div className="react-login-formulaire-zone">
        <div className="react-login-langue">
          <SelecteurLangue langue={langue} onChangerLangue={onChangerLangue} />
        </div>
        <div className="react-login-formulaire-carte" style={{ maxWidth: "540px" }}>
          <h2>Demande d'accès</h2>
          <p className="react-login-sous-titre">
            Remplissez vos informations avec soin. Votre compte sera activé après validation administrative.
          </p>

          {banniereErreur ? (
            <div className="react-demande-banniere-erreur" role="alert">
              <strong>{banniereErreur.titre}</strong>
              <ul>
                {banniereErreur.messages.map(function (msg, idx) {
                  return <li key={idx}>{msg}</li>;
                })}
              </ul>
            </div>
          ) : null}

          <form onSubmit={soumettre} noValidate>
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
                <span className="react-carte-profil-label">Parent d'élève</span>
              </button>
            </div>

            <div className="react-demande-section-titre">Vos informations personnelles</div>
            <div className="mag-grid-2">
              <ChampFlottant
                inputRef={inputRefs.firstName}
                nomChamp="demande-prenom"
                label="Prénom"
                type="text"
                valeur={firstName}
                requis={true}
                placeholder="Ex: Jean"
                onChange={function (e) { setFirstName(e.target.value); }}
                onBlur={function () { marquerTouche("firstName"); }}
                erreur={(touches.firstName && erreurs.firstName) || erreursBackend.firstName}
                icone={<IconePersonne />}
              />
              <ChampFlottant
                inputRef={inputRefs.lastName}
                nomChamp="demande-nom"
                label="Nom de famille"
                type="text"
                valeur={lastName}
                requis={true}
                placeholder="Ex: Dupont"
                onChange={function (e) { setLastName(e.target.value); }}
                onBlur={function () { marquerTouche("lastName"); }}
                erreur={(touches.lastName && erreurs.lastName) || erreursBackend.lastName}
                icone={<IconePersonne />}
              />
            </div>

            <div className="mag-grid-2">
              <ChampFlottant
                inputRef={inputRefs.email}
                nomChamp="demande-email"
                label="Email (facultatif)"
                type="email"
                valeur={email}
                placeholder="Ex: jean.dupont@gmail.com"
                onChange={function (e) { setEmail(e.target.value); }}
                onBlur={function () { marquerTouche("email"); }}
                erreur={(touches.email && erreurs.email) || erreursBackend.email}
                icone={<IconeArrobase />}
              />
              <ChampFlottant
                inputRef={inputRefs.telephone}
                nomChamp="demande-telephone"
                label="Téléphone (mobile)"
                type="tel"
                valeur={telephone}
                placeholder="Ex: +228 90 12 34 56"
                onChange={function (e) {
                  // Nettoyage pro : autoriser seulement chiffres, espaces, +, -, parentheses
                  const filtre = e.target.value.replace(/[^0-9+\s\-()]/g, "");
                  setTelephone(filtre);
                }}
                onBlur={function () { marquerTouche("telephone"); }}
                erreur={(touches.telephone && erreurs.telephone) || erreursBackend.telephone}
                icone={<IconeTelephone />}
              />
            </div>

            <div className="react-demande-section-titre">Identifiants de connexion & Sécurité</div>

            <ChampFlottant
              inputRef={inputRefs.username}
              nomChamp="champ_identifiant_demande"
              label="Nom d'utilisateur souhaité"
              type="text"
              valeur={username}
              requis={true}
              placeholder="Ex: j.dupont"
              autoCompleteValeur="off"
              onChange={function (e) { setUsername(e.target.value); }}
              onBlur={function () { marquerTouche("username"); }}
              erreur={(touches.username && erreurs.username) || erreursBackend.username}
              icone={<IconePersonne />}
            />

            <div className="mag-grid-2">
              <ChampFlottant
                inputRef={inputRefs.password}
                nomChamp="champ_secret_demande"
                label="Mot de passe"
                type={motDePasseVisible ? "text" : "password"}
                valeur={password}
                requis={true}
                placeholder="Au moins 8 caractères"
                autoCompleteValeur="new-password"
                onChange={function (e) { setPassword(e.target.value); }}
                onBlur={function () { marquerTouche("password"); }}
                erreur={(touches.password && erreurs.password) || erreursBackend.password}
                icone={<IconeCadenas />}
                boutonAction={
                  <button
                    type="button"
                    className="react-bouton-oeil"
                    onClick={function () { setMotDePasseVisible(!motDePasseVisible); }}
                    aria-label="Afficher ou masquer le mot de passe"
                    tabIndex="-1"
                  >
                    <IconeOeil ouvert={motDePasseVisible} />
                  </button>
                }
              />

              <ChampFlottant
                inputRef={inputRefs.confirmPassword}
                nomChamp="champ_confirm_secret"
                label="Confirmer le mot de passe"
                type={confirmerVisible ? "text" : "password"}
                valeur={confirmPassword}
                requis={true}
                placeholder="Retapez le même mot de passe"
                autoCompleteValeur="new-password"
                onChange={function (e) { setConfirmPassword(e.target.value); }}
                onBlur={function () { marquerTouche("confirmPassword"); }}
                erreur={touches.confirmPassword && erreurs.confirmPassword}
                succesMsg={confirmPassword && password && confirmPassword === password ? "Mots de passe identiques" : null}
                icone={<IconeCadenas />}
                boutonAction={
                  <button
                    type="button"
                    className="react-bouton-oeil"
                    onClick={function () { setConfirmerVisible(!confirmerVisible); }}
                    aria-label="Afficher ou masquer le mot de passe de confirmation"
                    tabIndex="-1"
                  >
                    <IconeOeil ouvert={confirmerVisible} />
                  </button>
                }
              />
            </div>

            {/* Jauge visuelle de solidite du mot de passe */}
            {password.length > 0 ? (
              <div className="react-force-mdp-box">
                <div className="react-force-mdp-info">
                  <span style={{ color: "var(--ink-700)" }}>Niveau de sécurité :</span>
                  <span style={{ color: couleurForce }}>{labelForce}</span>
                </div>
                <div className="react-force-mdp-barre-fond">
                  <div
                    className="react-force-mdp-barre-progression"
                    style={{ width: pourcentageForce, backgroundColor: couleurForce }}
                  ></div>
                </div>
                <div className="react-force-criteres">
                  <div className={"react-critere-item" + (aAuMoins8 ? " valide" : "")}>
                    {aAuMoins8 ? <IconeCheck /> : "○"} 8 caractères minimum
                  </div>
                  <div className={"react-critere-item" + (aLettre ? " valide" : "")}>
                    {aLettre ? <IconeCheck /> : "○"} Au moins 1 lettre
                  </div>
                  <div className={"react-critere-item" + (aChiffre ? " valide" : "")}>
                    {aChiffre ? <IconeCheck /> : "○"} Au moins 1 chiffre
                  </div>
                  <div className={"react-critere-item" + (aSpecial ? " valide" : "")}>
                    {aSpecial ? <IconeCheck /> : "○"} Symbole ou 12+ car.
                  </div>
                </div>
              </div>
            ) : null}

            <div className="react-demande-section-titre">
              {typeCompte === "enseignant" ? "Informations académiques" : "Informations familiales"}
            </div>
            {typeCompte === "enseignant" ? (
              <ChampFlottant
                nomChamp="demande-specialite"
                label="Spécialité d'enseignement"
                type="text"
                valeur={specialite}
                onChange={function (e) { setSpecialite(e.target.value); }}
                icone={<IconeValise />}
                placeholder="Ex: Mathématiques, SVT, Français..."
              />
            ) : (
              <div className="mag-grid-2">
                <ChampFlottant
                  nomChamp="demande-profession"
                  label="Profession"
                  type="text"
                  valeur={profession}
                  onChange={function (e) { setProfession(e.target.value); }}
                  icone={<IconeValise />}
                  placeholder="Ex: Comptable, Commerçant..."
                />
                <ChampFlottant
                  nomChamp="demande-matricules"
                  label="Matricule(s) enfant(s)"
                  type="text"
                  valeur={matriculesEnfants}
                  onChange={function (e) { setMatriculesEnfants(e.target.value); }}
                  icone={<IconeFamille />}
                  placeholder="Ex: EL001, EL002"
                />
              </div>
            )}

            {/* Carte de Confidentialite & Securite Ultra Pro */}
            <div className="react-securite-carte">
              <div className="react-securite-en-tete">
                <div className="react-securite-badge-icone">
                  <IconeBouclier />
                </div>
                <div className="react-securite-titre-bloc">
                  <strong>Garantie de Confidentialité & Sécurité</strong>
                  <span>Protection renforcée et hachage cryptographique</span>
                </div>
              </div>
              <ul className="react-securite-points">
                <li>
                  <span><strong>Chiffrement immédiat :</strong> Votre mot de passe est haché avant son enregistrement. Il n'est jamais stocké en clair et personne ne peut le consulter.</span>
                </li>
                <li>
                  <span><strong>Validation administrative :</strong> Pour garantir l'intégrité de l'établissement, chaque compte est vérifié manuellement par la direction avant activation.</span>
                </li>
                <li>
                  <span><strong>Données protégées :</strong> Vos coordonnées sont réservées exclusivement à la communication scolaire et ne sont jamais divulguées.</span>
                </li>
              </ul>
            </div>

            <button
              type="submit"
              className="mag-btn-primary react-btn-connexion"
              disabled={enCours}
              style={{ marginTop: "0.8rem", width: "100%" }}
            >
              {enCours ? <span className="react-spinner"></span> : "Envoyer ma demande d'accès"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <a href="#/" className="react-lien-retour">
              <span style={{ transform: "translateY(-1px)" }}>←</span> Retour à la page de connexion
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
