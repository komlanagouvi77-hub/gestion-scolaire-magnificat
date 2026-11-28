// src/pages/DemandeAcces.jsx
// Formulaire PUBLIC (aucune connexion requise) de demande d'acces
// Enseignant / Parent avec validation ultra-professionnelle et confidentialite renforcee.
// Le compte n'est cree qu'apres validation manuelle par l'administration.
import { useState, useEffect, useRef } from "react";
import { soumettreDemandeAcces, obtenirIdentitePublique } from "../api.js";
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

function IconeCle() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="7.5" cy="15.5" r="4.5"></circle>
      <path d="m21 3-9.5 9.5"></path>
      <path d="m15.5 7.5 3 3"></path>
    </svg>
  );
}

function IconeDocument() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
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

// Suggestions courantes pour la spécialité d'un enseignant (bilingue FR / EN)
const SPECIALITES_SUGGESTIONS = [
  { fr: "Mathématiques", en: "Mathematics" },
  { fr: "Français", en: "French" },
  { fr: "Anglais", en: "English" },
  { fr: "SVT", en: "Life & Earth Sciences (SVT)" },
  { fr: "Physique-Chimie", en: "Physics & Chemistry" },
  { fr: "Histoire-Géographie", en: "History & Geography" },
  { fr: "Philosophie", en: "Philosophy" },
  { fr: "Informatique", en: "Computer Science" },
  { fr: "EPS", en: "Physical Education (PE)" },
  { fr: "Éducation Civique", en: "Civic Education" },
  { fr: "Allemand", en: "German" },
  { fr: "Espagnol", en: "Spanish" },
];

// Identifiants interdits
const IDENTIFIANTS_RESERVES = new Set([
  "admin", "administrator", "root", "directeur", "direction",
  "magnificat", "superadmin", "support", "secretariat", "ecole",
  "system", "moderator", "guest", "test", "demo", "user"
]);

// Mots de passe triviaux interdits
const MOTS_DE_PASSE_BANNIS = new Set([
  "password", "12345678", "azerty123", "motdepasse", "qwerty123",
  "admin123", "ecole123", "passer123", "bienvenue", "password123",
  "123456789", "00000000"
]);

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
    <div style={{ marginBottom: "1.2rem" }}>
      <div className={"react-champ-flottant" + (flotte ? " actif" : "") + (focalise ? " focalise" : "") + classeEtat} style={{ marginBottom: 0 }}>
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
        <label htmlFor={nomChamp}>{label}</label>
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
  const [consentement, setConsentement] = useState(false);

  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [confirmerVisible, setConfirmerVisible] = useState(false);
  const [modalCharteOuverte, setModalCharteOuverte] = useState(false);

  // Suivi des interactions utilisateur
  const [touches, setTouches] = useState({});
  const [erreursBackend, setErreursBackend] = useState({});
  const [banniereErreur, setBanniereErreur] = useState(null);

  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState(false);
  const [identiteEcole, setIdentiteEcole] = useState({ nom_ecole: null, logo: null });

  const inputRefs = {
    firstName: useRef(null),
    lastName: useRef(null),
    email: useRef(null),
    telephone: useRef(null),
    username: useRef(null),
    password: useRef(null),
    confirmPassword: useRef(null),
    specialite: useRef(null),
    matriculesEnfants: useRef(null),
    consentement: useRef(null),
  };

  useEffect(function () {
    obtenirIdentitePublique().then(setIdentiteEcole).catch(function () {});
  }, []);

  const nomEcoleAffiche = identiteEcole.nom_ecole || "Complexe Scolaire Magnificat";

  // Helper de traduction
  const t = function (texte) {
    return traduireTexte(texte, langue);
  };

  const marquerTouche = function (champ) {
    setTouches(function (prev) {
      return { ...prev, [champ]: true };
    });
  };

  // --- FILTRAGE ET ASSAINISSEMENT DES SAISIES EN DIRECT ---
  const gererChangementPrenom = function (e) {
    // Supprimer chiffres et caractères non autorisés
    const propre = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, "");
    setFirstName(propre);
  };

  const formaterPrenomApresSaisie = function () {
    marquerTouche("firstName");
    if (!firstName) return;
    // Mise en forme : première lettre majuscule pour chaque mot
    const formate = firstName
      .trim()
      .split(/\s+/)
      .map(function (mot) {
        return mot
          .split("-")
          .map(function (part) {
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join("-");
      })
      .join(" ");
    setFirstName(formate);
  };

  const gererChangementNom = function (e) {
    const propre = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, "");
    setLastName(propre);
  };

  const formaterNomApresSaisie = function () {
    marquerTouche("lastName");
    if (!lastName) return;
    setLastName(lastName.trim().toUpperCase());
  };

  const gererChangementTelephone = function (e) {
    // Ne garder que chiffres, +, espaces, tirets, parenthèses
    const propre = e.target.value.replace(/[^0-9+\s\-()]/g, "");
    setTelephone(propre);
  };

  const gererChangementUsername = function (e) {
    // Minuscules et caractères autorisés uniquement
    const propre = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "");
    setUsername(propre);
  };

  const gererChangementEmail = function (e) {
    setEmail(e.target.value.trim().toLowerCase());
  };

  // --- ÉVALUATION AVANCÉE DU MOT DE PASSE ---
  const aAuMoins8 = password.length >= 8;
  const aMajuscule = /[A-Z]/.test(password);
  const aMinuscule = /[a-z]/.test(password);
  const aChiffre = /[0-9]/.test(password);
  const aSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(password);
  const estTrivial = MOTS_DE_PASSE_BANNIS.has(password.toLowerCase());

  const userMin = username.toLowerCase().trim();
  const prenomMin = firstName.toLowerCase().trim();
  const nomMin = lastName.toLowerCase().trim();
  const mdpMin = password.toLowerCase();

  const contientUsername = userMin && userMin.length >= 3 && mdpMin.includes(userMin);
  const contientPrenom = prenomMin && prenomMin.length >= 3 && mdpMin.includes(prenomMin);
  const contientNom = nomMin && nomMin.length >= 3 && mdpMin.includes(nomMin);
  const pasDeDonneesPerso = !contientUsername && !contientPrenom && !contientNom;

  let scoreMdp = 0;
  if (password.length > 0) {
    if (aAuMoins8) scoreMdp++;
    if (aMajuscule && aMinuscule) scoreMdp++;
    if (aChiffre) scoreMdp++;
    if (aSpecial) scoreMdp++;
    if (pasDeDonneesPerso && !estTrivial) scoreMdp++;
  }

  let labelForce = langue === "en" ? "Very weak" : "Très faible";
  let couleurForce = "#dc2626";
  let pourcentageForce = "15%";
  if (scoreMdp === 2) {
    labelForce = langue === "en" ? "Weak" : "Faible";
    couleurForce = "#ea580c";
    pourcentageForce = "35%";
  } else if (scoreMdp === 3) {
    labelForce = langue === "en" ? "Medium" : "Moyen";
    couleurForce = "#0284c7";
    pourcentageForce = "60%";
  } else if (scoreMdp === 4) {
    labelForce = langue === "en" ? "Strong" : "Robuste";
    couleurForce = "#059669";
    pourcentageForce = "85%";
  } else if (scoreMdp >= 5) {
    labelForce = langue === "en" ? "Very strong" : "Ultra sécurisé";
    couleurForce = "#16a34a";
    pourcentageForce = "100%";
  }

  // Dictionnaire d'erreurs bilingue
  const msgErr = function (cle) {
    const DICT = {
      prenom_requis: { fr: "Le prénom est obligatoire.", en: "First name is required." },
      prenom_min: { fr: "Le prénom doit comporter au moins 2 lettres.", en: "First name must have at least 2 letters." },
      prenom_max: { fr: "Le prénom ne peut pas dépasser 40 caractères.", en: "First name cannot exceed 40 characters." },
      prenom_alpha: { fr: "Le prénom ne doit contenir que des lettres alphabétiques.", en: "First name must only contain letters." },
      prenom_repete: { fr: "Le prénom contient des lettres répétées anormales (ex: 'aaa').", en: "First name contains abnormal repeated letters." },
      nom_requis: { fr: "Le nom de famille est obligatoire.", en: "Last name is required." },
      nom_min: { fr: "Le nom de famille doit comporter au moins 2 lettres.", en: "Last name must have at least 2 letters." },
      nom_max: { fr: "Le nom de famille ne peut pas dépasser 40 caractères.", en: "Last name cannot exceed 40 characters." },
      nom_alpha: { fr: "Le nom ne doit contenir que des lettres alphabétiques.", en: "Last name must only contain letters." },
      nom_repete: { fr: "Le nom contient des lettres répétées anormales (ex: 'aaa').", en: "Last name contains abnormal repeated letters." },
      email_invalide: { fr: "Format d'adresse email invalide (ex: jean.dupont@gmail.com).", en: "Invalid email format (e.g. john.smith@gmail.com)." },
      tel_requis: { fr: "Le numéro de téléphone est obligatoire pour la validation administrative.", en: "Mobile phone is required for administrative verification." },
      tel_min: { fr: "Le numéro de téléphone doit comporter au moins 8 chiffres.", en: "Phone number must have at least 8 digits." },
      tel_max: { fr: "Le numéro de téléphone ne peut pas dépasser 15 chiffres.", en: "Phone number cannot exceed 15 digits." },
      tel_repete: { fr: "Numéro invalide (chiffres identiques répétés).", en: "Invalid number (identical repeated digits)." },
      tel_fictif: { fr: "Ce numéro semble fictif. Veuillez renseigner votre véritable numéro.", en: "This number appears fictitious. Please enter your real phone number." },
      user_requis: { fr: "Le nom d'utilisateur est obligatoire.", en: "Username is required." },
      user_min: { fr: "L'identifiant doit comporter au moins 3 caractères.", en: "Username must have at least 3 characters." },
      user_max: { fr: "L'identifiant ne peut pas dépasser 25 caractères.", en: "Username cannot exceed 25 characters." },
      user_format: { fr: "L'identifiant doit commencer et finir par une lettre ou un chiffre (lettres minuscules, chiffres, points ou tirets).", en: "Username must start and end with a letter or digit (lowercase, digits, dots or hyphens)." },
      user_symboles: { fr: "Les symboles consécutifs (comme '..' ou '--') ne sont pas autorisés.", en: "Consecutive symbols (like '..' or '--') are not allowed." },
      user_reserve: { fr: "Cet identifiant est réservé à l'administration du système.", en: "This username is reserved for system administration." },
      mdp_requis: { fr: "Le mot de passe est obligatoire.", en: "Password is required." },
      mdp_min: { fr: "Le mot de passe doit comporter au moins 8 caractères.", en: "Password must have at least 8 characters." },
      mdp_regles: { fr: "Le mot de passe doit inclure au moins une majuscule, une minuscule et un chiffre.", en: "Password must include at least uppercase, lowercase, and a digit." },
      mdp_special: { fr: "Le mot de passe doit inclure au moins un caractère spécial (@, #, !, $, etc.).", en: "Password must include at least one special character (@, #, !, $, etc.)." },
      mdp_trivial: { fr: "Ce mot de passe est trop facile à deviner. Choisissez un mot de passe sécurisé.", en: "This password is too easy to guess. Choose a stronger password." },
      mdp_user: { fr: "Le mot de passe ne doit pas contenir votre nom d'utilisateur.", en: "Password must not contain your username." },
      mdp_nom: { fr: "Le mot de passe ne doit pas contenir votre nom ou prénom.", en: "Password must not contain your name." },
      confirm_requis: { fr: "Veuillez confirmer votre mot de passe.", en: "Please confirm your password." },
      confirm_diff: { fr: "Les mots de passe ne correspondent pas.", en: "Passwords do not match." },
      spec_requis: { fr: "Veuillez renseigner votre matière ou spécialité d'enseignement.", en: "Please enter your teaching subject or specialty." },
      spec_min: { fr: "La spécialité doit comporter au moins 2 lettres.", en: "Specialty must have at least 2 letters." },
      spec_alpha: { fr: "La spécialité ne doit comporter que des lettres (ex: Mathématiques).", en: "Specialty must contain only letters (e.g. Mathematics)." },
      mat_requis: { fr: "Veuillez indiquer le ou les matricules (ou noms complets) de vos enfants inscrits.", en: "Please enter your child's student ID(s) or full name(s)." },
      mat_min: { fr: "Veuillez préciser au moins un élève (ex: EL001 ou Koffi AGOUVI).", en: "Please specify at least one student (e.g. EL001 or John Smith)." },
      consent_requis: { fr: "Vous devez accepter la politique de confidentialité pour transmettre votre demande.", en: "You must accept the privacy policy to submit your request." },
    };
    const entree = DICT[cle];
    if (!entree) return cle;
    return langue === "en" ? entree.en : entree.fr;
  };

  // --- VALIDATION STRICTE ET INTÉGRALE DES CHAMPS ---
  const validerChamps = function () {
    const errs = {};

    // 1. Prénom
    const pTrim = firstName.trim();
    if (!pTrim) {
      errs.firstName = msgErr("prenom_requis");
    } else if (pTrim.length < 2) {
      errs.firstName = msgErr("prenom_min");
    } else if (pTrim.length > 40) {
      errs.firstName = msgErr("prenom_max");
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(pTrim)) {
      errs.firstName = msgErr("prenom_alpha");
    } else if (/(.)\1\1/.test(pTrim)) {
      errs.firstName = msgErr("prenom_repete");
    }

    // 2. Nom de famille
    const nTrim = lastName.trim();
    if (!nTrim) {
      errs.lastName = msgErr("nom_requis");
    } else if (nTrim.length < 2) {
      errs.lastName = msgErr("nom_min");
    } else if (nTrim.length > 40) {
      errs.lastName = msgErr("nom_max");
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(nTrim)) {
      errs.lastName = msgErr("nom_alpha");
    } else if (/(.)\1\1/.test(nTrim)) {
      errs.lastName = msgErr("nom_repete");
    }

    // 3. Email (facultatif mais ultra-strict si renseigné)
    const emTrim = email.trim();
    if (emTrim) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
      if (!emailRegex.test(emTrim)) {
        errs.email = msgErr("email_invalide");
      }
    }

    // 4. Téléphone mobile (obligatoire pour contact administratif)
    const tTrim = telephone.trim();
    if (!tTrim) {
      errs.telephone = msgErr("tel_requis");
    } else {
      const chiffres = tTrim.replace(/\D/g, "");
      if (chiffres.length < 8) {
        errs.telephone = msgErr("tel_min");
      } else if (chiffres.length > 15) {
        errs.telephone = msgErr("tel_max");
      } else if (new Set(chiffres.split("")).size === 1) {
        errs.telephone = msgErr("tel_repete");
      } else if (["12345678", "87654321", "01234567", "98765432"].includes(chiffres)) {
        errs.telephone = msgErr("tel_fictif");
      }
    }

    // 5. Nom d'utilisateur souhaité
    const uTrim = username.trim().toLowerCase();
    if (!uTrim) {
      errs.username = msgErr("user_requis");
    } else if (uTrim.length < 3) {
      errs.username = msgErr("user_min");
    } else if (uTrim.length > 25) {
      errs.username = msgErr("user_max");
    } else if (!/^[a-z0-9][a-z0-9._-]{1,23}[a-z0-9]$/.test(uTrim)) {
      errs.username = msgErr("user_format");
    } else if (uTrim.includes("..") || uTrim.includes("--") || uTrim.includes("__")) {
      errs.username = msgErr("user_symboles");
    } else if (IDENTIFIANTS_RESERVES.has(uTrim)) {
      errs.username = msgErr("user_reserve");
    }

    // 6. Mot de passe
    if (!password) {
      errs.password = msgErr("mdp_requis");
    } else if (password.length < 8) {
      errs.password = msgErr("mdp_min");
    } else if (!aMajuscule || !aMinuscule || !aChiffre) {
      errs.password = msgErr("mdp_regles");
    } else if (!aSpecial) {
      errs.password = msgErr("mdp_special");
    } else if (estTrivial) {
      errs.password = msgErr("mdp_trivial");
    } else if (contientUsername) {
      errs.password = msgErr("mdp_user");
    } else if (contientPrenom || contientNom) {
      errs.password = msgErr("mdp_nom");
    }

    // 7. Confirmation du mot de passe
    if (!confirmPassword) {
      errs.confirmPassword = msgErr("confirm_requis");
    } else if (password && confirmPassword !== password) {
      errs.confirmPassword = msgErr("confirm_diff");
    }

    // 8. Spécialité ou Enfants selon le profil
    if (typeCompte === "enseignant") {
      const specTrim = specialite.trim();
      if (!specTrim) {
        errs.specialite = msgErr("spec_requis");
      } else if (specTrim.length < 2) {
        errs.specialite = msgErr("spec_min");
      } else if (/[0-9]/.test(specTrim)) {
        errs.specialite = msgErr("spec_alpha");
      }
    } else {
      const matTrim = matriculesEnfants.trim();
      if (!matTrim) {
        errs.matriculesEnfants = msgErr("mat_requis");
      } else if (matTrim.length < 2) {
        errs.matriculesEnfants = msgErr("mat_min");
      }
    }

    // 9. Consentement obligatoire
    if (!consentement) {
      errs.consentement = msgErr("consent_requis");
    }

    return errs;
  };

  const erreurs = validerChamps();

  // Soumission ultra sécurisée
  const soumettre = async function (evt) {
    evt.preventDefault();
    setBanniereErreur(null);
    setErreursBackend({});

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
      consentement: true,
    };
    setTouches(tousTouches);

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
        username_souhaite: username.trim().toLowerCase(),
        password: password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        telephone: telephone.trim(),
        specialite: typeCompte === "enseignant" ? specialite.trim() : "",
        profession: typeCompte === "parent" ? profession.trim() : "",
        matricules_enfants: typeCompte === "parent" ? matriculesEnfants.trim() : "",
      });
      setSucces(true);
    } catch (err) {
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
      if (details.non_field_errors) {
        const msg = Array.isArray(details.non_field_errors) ? details.non_field_errors[0] : details.non_field_errors;
        messagesBanniere.push(msg);
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
          messages: [err.message || "Une erreur est survenue lors de la transmission sécurisée."],
        });
      }

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
            <h1>{langue === "en" ? "Request Submitted Successfully" : "Demande transmise avec succès"}</h1>
            <p className="react-panneau-tagline">{nomEcoleAffiche}</p>
          </div>
        </div>
        <div className="react-login-formulaire-zone">
          <div className="react-login-formulaire-carte react-demande-succes-carte">
            <div className="react-demande-succes-icone"><IconeCheck /></div>
            <h2 style={{ color: "var(--green-600)", textAlign: "center", marginBottom: "0.5rem" }}>
              {langue === "en" ? "Request Recorded" : "Demande enregistrée"}
            </h2>
            <p className="react-login-sous-titre" style={{ textAlign: "center", marginBottom: "1.5rem", lineHeight: "1.5" }}>
              {langue === "en"
                ? "Your access request has been sent with end-to-end encryption to the school administration. It will be reviewed by the school board. Once approved, you can log in immediately with your username and password."
                : "Votre demande d'accès a été transmise avec chiffrement de bout en bout à l'administration de l'établissement. Elle sera examinée par la direction. Une fois validée, vous pourrez vous connecter immédiatement avec votre identifiant et votre mot de passe."}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.45rem",
                margin: "1rem 0 1.5rem",
                fontSize: "0.82rem",
                color: "#64748B",
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#64748B" strokeWidth="2">
                <rect x="5" y="11" width="14" height="9" rx="2"></rect>
                <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
              </svg>
              <span>{langue === "en" ? "Confidentiality preserved • Manual review by school administration" : "Confidentialité préservée • Examen par l'administration"}</span>
            </div>
            <a href="#/" className="mag-btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
              {langue === "en" ? "Back to login page" : "Retour à la page de connexion"}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="react-login-split">
      {/* Panneau latéral institutionnel */}
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
          <p className="react-panneau-tagline">
            {langue === "en"
              ? "Official school management portal"
              : "Portail officiel d'accès à la plateforme scolaire"}
          </p>
          <ul className="react-panneau-liste">
            <li>
              <span className="react-panneau-icone"><IconeLivre /></span>
              {langue === "en" ? "Secure registration form" : "Formulaire d'inscription sécurisé"}
            </li>
            <li>
              <span className="react-panneau-icone"><IconeCadenas /></span>
              {langue === "en" ? "Hashed and strictly confidential password" : "Mot de passe haché et strictement confidentiel"}
            </li>
            <li>
              <span className="react-panneau-icone"><IconePersonne /></span>
              {langue === "en" ? "Manual review by school board" : "Validation manuelle par la direction"}
            </li>
            <li>
              <span className="react-panneau-icone"><IconeBouclier /></span>
              {langue === "en" ? "Personal data protection compliance" : "Conformité protection des données personnelles"}
            </li>
          </ul>
          <div className="react-panneau-pied">Adidogome — Lome, Togo</div>
        </div>
      </div>

      {/* Zone du formulaire */}
      <div className="react-login-formulaire-zone" style={{ paddingBottom: "3.5rem" }}>
        <div className="react-login-formulaire-carte" style={{ maxWidth: "560px", marginBottom: "2.5rem" }}>
          <h2>{langue === "en" ? "Access Request" : "Demande d'accès"}</h2>
          <p className="react-login-sous-titre">
            {langue === "en"
              ? "Complete your information carefully. Your account will be activated after administrative review."
              : "Remplissez vos informations avec soin. Votre compte sera activé après validation administrative."}
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
            {/* Sélecteur de profil strictement bilingue */}
            <div className="react-selecteur-profil" role="group" aria-label="Type de compte">
              <button
                type="button"
                className={"react-carte-profil" + (typeCompte === "enseignant" ? " actif" : "")}
                aria-pressed={typeCompte === "enseignant"}
                onClick={function () { setTypeCompte("enseignant"); }}
              >
                <span className="react-carte-profil-icone"><IconeCasquette /></span>
                <span className="react-carte-profil-label">{langue === "en" ? "Teacher" : "Enseignant"}</span>
              </button>
              <button
                type="button"
                className={"react-carte-profil" + (typeCompte === "parent" ? " actif" : "")}
                aria-pressed={typeCompte === "parent"}
                onClick={function () { setTypeCompte("parent"); }}
              >
                <span className="react-carte-profil-icone"><IconeFamille /></span>
                <span className="react-carte-profil-label">{langue === "en" ? "Student's Parent" : "Parent d'élève"}</span>
              </button>
            </div>

            {/* Section 1 : Informations personnelles */}
            <div className="react-demande-section-titre">
              {langue === "en" ? "Personal Information" : "Vos informations personnelles"}
            </div>

            <div className="mag-grid-2">
              <ChampFlottant
                inputRef={inputRefs.firstName}
                nomChamp="demande-prenom"
                label={langue === "en" ? "First Name" : "Prénom"}
                type="text"
                valeur={firstName}
                requis={true}
                placeholder={langue === "en" ? "e.g. John-Luc" : "Ex: Jean-Luc"}
                onChange={gererChangementPrenom}
                onBlur={formaterPrenomApresSaisie}
                erreur={(touches.firstName && erreurs.firstName) || erreursBackend.firstName}
                succesMsg={!erreurs.firstName && firstName ? (langue === "en" ? "Valid first name" : "Prénom valide") : null}
                icone={<IconePersonne />}
              />
              <ChampFlottant
                inputRef={inputRefs.lastName}
                nomChamp="demande-nom"
                label={langue === "en" ? "Last Name" : "Nom de famille"}
                type="text"
                valeur={lastName}
                requis={true}
                placeholder={langue === "en" ? "e.g. DUPONT" : "Ex: DUPONT"}
                onChange={gererChangementNom}
                onBlur={formaterNomApresSaisie}
                erreur={(touches.lastName && erreurs.lastName) || erreursBackend.lastName}
                succesMsg={!erreurs.lastName && lastName ? (langue === "en" ? "Valid last name" : "Nom valide") : null}
                icone={<IconePersonne />}
              />
            </div>

            <div className="mag-grid-2">
              <ChampFlottant
                inputRef={inputRefs.email}
                nomChamp="demande-email"
                label={langue === "en" ? "Email (Optional)" : "Email (facultatif)"}
                type="email"
                valeur={email}
                placeholder={langue === "en" ? "e.g. john.dupont@gmail.com" : "Ex: jean.dupont@gmail.com"}
                onChange={gererChangementEmail}
                onBlur={function () { marquerTouche("email"); }}
                erreur={(touches.email && erreurs.email) || erreursBackend.email}
                succesMsg={!erreurs.email && email ? (langue === "en" ? "Valid email address" : "Adresse valide") : null}
                icone={<IconeArrobase />}
              />
              <ChampFlottant
                inputRef={inputRefs.telephone}
                nomChamp="demande-telephone"
                label={langue === "en" ? "Mobile Phone" : "Téléphone mobile"}
                type="tel"
                valeur={telephone}
                requis={true}
                placeholder={langue === "en" ? "e.g. +228 90 12 34 56" : "Ex: +228 90 12 34 56"}
                onChange={gererChangementTelephone}
                onBlur={function () { marquerTouche("telephone"); }}
                erreur={(touches.telephone && erreurs.telephone) || erreursBackend.telephone}
                succesMsg={!erreurs.telephone && telephone ? (langue === "en" ? "Valid phone number" : "Numéro valide") : null}
                icone={<IconeTelephone />}
              />
            </div>

            {/* Section 2 : Identifiants & Sécurité */}
            <div className="react-demande-section-titre">
              {langue === "en" ? "Login Credentials & Security" : "Identifiants de connexion & Sécurité"}
            </div>

            <ChampFlottant
              inputRef={inputRefs.username}
              nomChamp="champ_identifiant_demande"
              label={langue === "en" ? "Desired Username" : "Nom d'utilisateur souhaité"}
              type="text"
              valeur={username}
              requis={true}
              placeholder={langue === "en" ? "e.g. j.dupont (lowercase, 3-25 chars)" : "Ex: j.dupont (minuscules, 3 à 25 car.)"}
              autoCompleteValeur="off"
              onChange={gererChangementUsername}
              onBlur={function () { marquerTouche("username"); }}
              erreur={(touches.username && erreurs.username) || erreursBackend.username}
              succesMsg={!erreurs.username && username ? (langue === "en" ? "Valid username" : "Identifiant conforme") : null}
              icone={<IconePersonne />}
            />

            <div className="mag-grid-2">
              <ChampFlottant
                inputRef={inputRefs.password}
                nomChamp="champ_secret_demande"
                label={langue === "en" ? "Password" : "Mot de passe"}
                type={motDePasseVisible ? "text" : "password"}
                valeur={password}
                requis={true}
                placeholder={langue === "en" ? "8+ chars with uppercase & symbol" : "8+ car. avec majuscule & symbole"}
                autoCompleteValeur="new-password"
                onChange={function (e) { setPassword(e.target.value); }}
                onBlur={function () { marquerTouche("password"); }}
                erreur={(touches.password && erreurs.password) || erreursBackend.password}
                succesMsg={!erreurs.password && password && scoreMdp >= 4 ? (langue === "en" ? "Strong password" : "Mot de passe robuste") : null}
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
                label={langue === "en" ? "Confirm password" : "Confirmation"}
                type={confirmerVisible ? "text" : "password"}
                valeur={confirmPassword}
                requis={true}
                placeholder={langue === "en" ? "Confirm password" : "Confirmation"}
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

            {/* Jauge visuelle et critères en temps réel */}
            {password.length > 0 ? (
              <div className="react-force-mdp-box">
                <div className="react-force-mdp-info">
                  <span style={{ color: "var(--ink-700)" }}>{langue === "en" ? "Security level:" : "Niveau de sécurité :"}</span>
                  <span style={{ color: couleurForce, fontWeight: "700" }}>{labelForce}</span>
                </div>
                <div className="react-force-mdp-barre-fond">
                  <div
                    className="react-force-mdp-barre-progression"
                    style={{ width: pourcentageForce, backgroundColor: couleurForce }}
                  ></div>
                </div>
                <div className="react-force-criteres">
                  <div className={"react-critere-item" + (aAuMoins8 ? " valide" : "")}>
                    {aAuMoins8 ? <IconeCheck /> : "•"} 8 caractères minimum
                  </div>
                  <div className={"react-critere-item" + (aMajuscule && aMinuscule ? " valide" : "")}>
                    {aMajuscule && aMinuscule ? <IconeCheck /> : "•"} Majuscule et minuscule
                  </div>
                  <div className={"react-critere-item" + (aChiffre ? " valide" : "")}>
                    {aChiffre ? <IconeCheck /> : "•"} Au moins 1 chiffre (0-9)
                  </div>
                  <div className={"react-critere-item" + (aSpecial ? " valide" : "")}>
                    {aSpecial ? <IconeCheck /> : "•"} Caractère spécial (@, #, !)
                  </div>
                  <div className={"react-critere-item" + (pasDeDonneesPerso && !estTrivial ? " valide" : "")}>
                    {pasDeDonneesPerso && !estTrivial ? <IconeCheck /> : "•"} Distinct du nom &amp; prénom
                  </div>
                </div>
              </div>
            ) : null}

            {/* Section 3 : Informations académiques ou familiales */}
            <div className="react-demande-section-titre">
              {typeCompte === "enseignant"
                ? (langue === "en" ? "Academic Information" : "Informations académiques")
                : (langue === "en" ? "Family Information" : "Informations familiales")}
            </div>

            {typeCompte === "enseignant" ? (
              <>
                <ChampFlottant
                  inputRef={inputRefs.specialite}
                  nomChamp="demande-specialite"
                  label={langue === "en" ? "Teaching Specialty" : "Discipline d'enseignement"}
                  type="text"
                  valeur={specialite}
                  requis={true}
                  onChange={function (e) {
                    const propre = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, "");
                    setSpecialite(propre);
                  }}
                  onBlur={function () { marquerTouche("specialite"); }}
                  erreur={touches.specialite && erreurs.specialite}
                  succesMsg={!erreurs.specialite && specialite ? (langue === "en" ? "Discipline entered" : "Discipline renseignée") : null}
                  icone={<IconeValise />}
                  placeholder={langue === "en" ? "e.g. Mathematics, Science, French..." : "Ex: Mathématiques, SVT, Français..."}
                />
                {/* Suggestions cliquables bilingues */}
                <div className="react-specialites-pills">
                  {SPECIALITES_SUGGESTIONS.map(function (item) {
                    const libelle = langue === "en" ? item.en : item.fr;
                    const estActif = specialite === item.fr || specialite === item.en;
                    return (
                      <button
                        key={item.fr}
                        type="button"
                        className={"react-specialite-pill" + (estActif ? " actif" : "")}
                        onClick={function () {
                          setSpecialite(libelle);
                          marquerTouche("specialite");
                        }}
                      >
                        {libelle}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="mag-grid-2">
                <ChampFlottant
                  nomChamp="demande-profession"
                  label={langue === "en" ? "Occupation" : "Profession"}
                  type="text"
                  valeur={profession}
                  onChange={function (e) {
                    const propre = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, "");
                    setProfession(propre);
                  }}
                  icone={<IconeValise />}
                  placeholder={langue === "en" ? "e.g. Accountant, Merchant..." : "Ex: Comptable, Commerçant..."}
                />
                <ChampFlottant
                  inputRef={inputRefs.matriculesEnfants}
                  nomChamp="demande-matricules"
                  label={langue === "en" ? "Student ID(s) / Children" : "Élève(s) scolarisé(s) / Matricule"}
                  type="text"
                  valeur={matriculesEnfants}
                  requis={true}
                  onChange={function (e) { setMatriculesEnfants(e.target.value); }}
                  onBlur={function () { marquerTouche("matriculesEnfants"); }}
                  erreur={touches.matriculesEnfants && erreurs.matriculesEnfants}
                  succesMsg={!erreurs.matriculesEnfants && matriculesEnfants ? (langue === "en" ? "Student(s) entered" : "Élève(s) renseigné(s)") : null}
                  icone={<IconeFamille />}
                  placeholder={langue === "en" ? "e.g. EL001 or Student Full Name" : "Ex: EL001 ou Nom complet de l'enfant"}
                />
              </div>
            )}

            {/* Case à cocher sobre de certification */}
            <div
              className={"react-consentement-zone" + (touches.consentement && erreurs.consentement ? " erreur" : "")}
              style={{ marginTop: "1rem" }}
              onClick={function () {
                setConsentement(!consentement);
                marquerTouche("consentement");
              }}
            >
              <input
                ref={inputRefs.consentement}
                id="case-consentement"
                type="checkbox"
                checked={consentement}
                onChange={function (e) {
                  setConsentement(e.target.checked);
                  marquerTouche("consentement");
                }}
              />
              <label htmlFor="case-consentement" className="react-consentement-label">
                <strong>
                  {langue === "en"
                    ? "I solemnly certify the accuracy of the information provided"
                    : "Je certifie sur l'honneur l'exactitude des renseignements fournis"}
                </strong>{" "}
                {langue === "en"
                  ? "and I consent to the processing of my data exclusively for schooling purposes at Complexe Scolaire Magnificat."
                  : "et j'accepte le traitement de mes données dans le cadre exclusif de la scolarité au Complexe Scolaire Magnificat."}
              </label>
            </div>
            {touches.consentement && erreurs.consentement ? (
              <div className="react-champ-erreur-msg" style={{ marginBottom: "0.6rem" }}>
                <IconeAlerte />
                <span>{erreurs.consentement}</span>
              </div>
            ) : null}

            {/* Mention discrète de confidentialité */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                marginTop: "0.5rem",
                marginBottom: "1.25rem",
                fontSize: "0.78rem",
                color: "#64748B",
                lineHeight: "1.4",
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#64748B" strokeWidth="2" style={{ flexShrink: 0 }}>
                <rect x="5" y="11" width="14" height="9" rx="2"></rect>
                <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
              </svg>
              <span>
                {langue === "en"
                  ? "Your information is strictly confidential and only accessible to the administration of Complexe Scolaire Magnificat."
                  : "Vos informations sont strictement confidentielles et uniquement accessibles à l'administration du Complexe Scolaire Magnificat."}
              </span>
            </div>

            {/* Bouton de soumission */}
            <button
              type="submit"
              className="mag-btn-primary react-btn-connexion"
              disabled={enCours}
              style={{ marginTop: "0.6rem", width: "100%" }}
            >
              {enCours ? (
                <span className="react-spinner"></span>
              ) : (
                langue === "en" ? "Submit Access Request" : "Transmettre ma demande d'accès"
              )}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1.25rem", paddingBottom: "0.5rem" }}>
            <a href="#/" className="react-lien-retour">
              {langue === "en" ? "Back to login page" : "Retour à la page de connexion"}
            </a>
          </div>
        </div>
      </div>

      {/* Modale Institutionnelle de la Charte de Confidentialité */}
      {modalCharteOuverte ? (
        <div className="react-charte-overlay" onClick={function () { setModalCharteOuverte(false); }}>
          <div className="react-charte-modal" onClick={function (e) { e.stopPropagation(); }}>
            <div className="react-charte-header">
              <div className="react-charte-header-gauche">
                <IconeBouclier />
                <div>
                  <h3 className="react-charte-titre">
                    {langue === "en" ? "Privacy & Data Protection Charter" : "Charte de Confidentialité"}
                  </h3>
                  <p className="react-charte-sous-titre">
                    {nomEcoleAffiche} — {langue === "en" ? "School Data Protection" : "Protection des Données Scolaires"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="react-charte-fermer-btn"
                onClick={function () { setModalCharteOuverte(false); }}
                aria-label="Fermer la charte"
                style={{ fontSize: "0.85rem", padding: "0.2rem 0.5rem" }}
              >
                Fermer
              </button>
            </div>

            <div className="react-charte-corps">
              <div className="react-charte-article">
                <h4>{langue === "en" ? "1. Data Controller & Scope" : "1. Responsable de Traitement & Cadre d'Application"}</h4>
                <p>
                  {langue === "en"
                    ? <span>Personal data collected on this portal is processed under the exclusive authority of the Administration of <strong>{nomEcoleAffiche}</strong>, within its educational mission, academic follow-up, and management of communication between parents, teachers, and administration.</span>
                    : <span>Les données à caractère personnel recueillies sur ce portail sont traitées sous la responsabilité exclusive de la Direction du <strong>{nomEcoleAffiche}</strong>, dans le cadre de sa mission d'enseignement, de suivi pédagogique et de gestion des relations entre parents, enseignants et administration.</span>}
                </p>
              </div>

              <div className="react-charte-article">
                <h4>{langue === "en" ? "2. Encryption & Credential Security" : "2. Chiffrement & Sécurité des Identifiants"}</h4>
                <p>
                  {langue === "en"
                    ? "In accordance with strict cybersecurity standards, your password undergoes irreversible cryptographic hashing (salted PBKDF2). It is never stored in plain text on our servers. Neither administrative staff, nor developers, nor school directors have the technical ability to view it."
                    : "Conformément aux normes les plus strictes de sécurité informatique, votre mot de passe fait l'objet d'un hachage cryptographique irréversible (PBKDF2 avec sel unique). Il n'est conservé à aucun moment en texte clair sur nos serveurs. Ni le personnel administratif, ni les développeurs, ni la direction générale n'ont la capacité technique d'en prendre connaissance."}
                </p>
              </div>

              <div className="react-charte-article">
                <h4>{langue === "en" ? "3. Professional Secrecy & Non-Disclosure" : "3. Secret Professionnel & Non-Divulgation"}</h4>
                <p>
                  {langue === "en"
                    ? "All submitted information (full names, telephone numbers, email addresses, teaching disciplines, or student affiliations) is covered by professional confidentiality. It is neither leased, sold, nor communicated to any commercial entity or unauthorized third party."
                    : "Toutes les informations déclarées (noms, prénoms, numéros de téléphone, adresses électroniques, spécialités d'enseignement ou filiation d'élèves) sont couvertes par le secret professionnel. Elles ne sont ni louées, ni vendues, ni communiquées à aucun organisme commercial ou tiers non autorisé."}
                </p>
              </div>

              <div className="react-charte-article">
                <h4>{langue === "en" ? "4. Prior Administrative Review" : "4. Validation Administrative Préalable"}</h4>
                <p>
                  {langue === "en"
                    ? "Account activation on the platform is never automatic: it requires thorough manual review of submitted details by the school administration. This measure ensures that only verified members of the educational community access grades, report cards, and confidential records."
                    : "L'ouverture d'un compte sur la plateforme n'est pas automatique : elle requiert la vérification manuelle et systématique des informations transmises par la direction de l'école. Cette mesure assure que seuls les membres légitimes de la communauté éducative accèdent aux notes, bulletins et données confidentielles des élèves."}
                </p>
              </div>

              <div className="react-charte-article">
                <h4>{langue === "en" ? "5. Rights to Access, Rectification & Deletion" : "5. Droits d'Accès, de Rectification et de Suppression"}</h4>
                <p>
                  {langue === "en"
                    ? "You retain permanent rights to access, rectify, and update your personal data. For any inquiry regarding your personal data or to exercise your privacy rights, please contact the school administration office directly."
                    : "Vous bénéficiez d'un droit permanent d'accès, de rectification et de mise à jour des données vous concernant. Pour toute demande relative à vos données ou pour l'exercice de vos droits, vous pouvez contacter directement le secrétariat général de l'établissement."}
                </p>
              </div>
            </div>

            <div className="react-charte-footer">
              <button
                type="button"
                className="mag-btn-primary"
                style={{ width: "auto", padding: "0.55rem 1.4rem" }}
                onClick={function () { setModalCharteOuverte(false); }}
              >
                {langue === "en" ? "I have read and agree to the charter" : "J'ai pris connaissance de la charte"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
