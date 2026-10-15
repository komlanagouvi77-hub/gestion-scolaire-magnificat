// src/pages/DemandeAcces.jsx
// Formulaire PUBLIC (aucune connexion requise) de demande d'acces
// Enseignant / Parent avec validation ultra-professionnelle et confidentialite renforcee.
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

// Suggestions courantes pour la spécialité d'un enseignant
const SPECIALITES_SUGGESTIONS = [
  "Mathématiques",
  "Français",
  "Anglais",
  "SVT",
  "Physique-Chimie",
  "Histoire-Géographie",
  "Philosophie",
  "Informatique",
  "EPS",
  "Éducation Civique",
  "Allemand",
  "Espagnol",
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

  let labelForce = t("Très faible");
  let couleurForce = "#dc2626";
  let pourcentageForce = "15%";
  if (scoreMdp === 2) {
    labelForce = t("Faible");
    couleurForce = "#ea580c";
    pourcentageForce = "35%";
  } else if (scoreMdp === 3) {
    labelForce = t("Moyen");
    couleurForce = "#0284c7";
    pourcentageForce = "60%";
  } else if (scoreMdp === 4) {
    labelForce = t("Robuste");
    couleurForce = "#059669";
    pourcentageForce = "85%";
  } else if (scoreMdp >= 5) {
    labelForce = t("Ultra sécurisé");
    couleurForce = "#16a34a";
    pourcentageForce = "100%";
  }

  // --- VALIDATION STRICTE ET INTÉGRALE DES CHAMPS ---
  const validerChamps = function () {
    const errs = {};

    // 1. Prénom
    const pTrim = firstName.trim();
    if (!pTrim) {
      errs.firstName = "Le prénom est obligatoire.";
    } else if (pTrim.length < 2) {
      errs.firstName = "Le prénom doit comporter au moins 2 lettres.";
    } else if (pTrim.length > 40) {
      errs.firstName = "Le prénom ne peut pas dépasser 40 caractères.";
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(pTrim)) {
      errs.firstName = "Le prénom ne doit contenir que des lettres alphabétiques.";
    } else if (/(.)\1\1/.test(pTrim)) {
      errs.firstName = "Le prénom contient des lettres répétées anormales (ex: 'aaa').";
    }

    // 2. Nom de famille
    const nTrim = lastName.trim();
    if (!nTrim) {
      errs.lastName = "Le nom de famille est obligatoire.";
    } else if (nTrim.length < 2) {
      errs.lastName = "Le nom de famille doit comporter au moins 2 lettres.";
    } else if (nTrim.length > 40) {
      errs.lastName = "Le nom de famille ne peut pas dépasser 40 caractères.";
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(nTrim)) {
      errs.lastName = "Le nom ne doit contenir que des lettres alphabétiques.";
    } else if (/(.)\1\1/.test(nTrim)) {
      errs.lastName = "Le nom contient des lettres répétées anormales (ex: 'aaa').";
    }

    // 3. Email (facultatif mais ultra-strict si renseigné)
    const emTrim = email.trim();
    if (emTrim) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
      if (!emailRegex.test(emTrim)) {
        errs.email = "Format d'adresse email invalide (ex: jean.dupont@gmail.com).";
      }
    }

    // 4. Téléphone mobile (obligatoire pour contact administratif)
    const tTrim = telephone.trim();
    if (!tTrim) {
      errs.telephone = "Le numéro de téléphone est obligatoire pour la validation administrative.";
    } else {
      const chiffres = tTrim.replace(/\D/g, "");
      if (chiffres.length < 8) {
        errs.telephone = "Le numéro de téléphone doit comporter au moins 8 chiffres.";
      } else if (chiffres.length > 15) {
        errs.telephone = "Le numéro de téléphone ne peut pas dépasser 15 chiffres.";
      } else if (new Set(chiffres.split("")).size === 1) {
        errs.telephone = "Numéro invalide (chiffres identiques répétés).";
      } else if (["12345678", "87654321", "01234567", "98765432"].includes(chiffres)) {
        errs.telephone = "Ce numéro semble fictif. Veuillez renseigner votre véritable numéro.";
      }
    }

    // 5. Nom d'utilisateur souhaité
    const uTrim = username.trim().toLowerCase();
    if (!uTrim) {
      errs.username = "Le nom d'utilisateur est obligatoire.";
    } else if (uTrim.length < 3) {
      errs.username = "L'identifiant doit comporter au moins 3 caractères.";
    } else if (uTrim.length > 25) {
      errs.username = "L'identifiant ne peut pas dépasser 25 caractères.";
    } else if (!/^[a-z0-9][a-z0-9._-]{1,23}[a-z0-9]$/.test(uTrim)) {
      errs.username = "L'identifiant doit commencer et finir par une lettre ou un chiffre (lettres minuscules, chiffres, points ou tirets).";
    } else if (uTrim.includes("..") || uTrim.includes("--") || uTrim.includes("__")) {
      errs.username = "Les symboles consécutifs (comme '..' ou '--') ne sont pas autorisés.";
    } else if (IDENTIFIANTS_RESERVES.has(uTrim)) {
      errs.username = "Cet identifiant est réservé à l'administration du système.";
    }

    // 6. Mot de passe
    if (!password) {
      errs.password = "Le mot de passe est obligatoire.";
    } else if (password.length < 8) {
      errs.password = "Le mot de passe doit comporter au moins 8 caractères.";
    } else if (!aMajuscule || !aMinuscule || !aChiffre) {
      errs.password = "Le mot de passe doit inclure au moins une majuscule, une minuscule et un chiffre.";
    } else if (!aSpecial) {
      errs.password = "Le mot de passe doit inclure au moins un caractère spécial (@, #, !, $, etc.).";
    } else if (estTrivial) {
      errs.password = "Ce mot de passe est trop facile à deviner. Choisissez un mot de passe sécurisé.";
    } else if (contientUsername) {
      errs.password = "Le mot de passe ne doit pas contenir votre nom d'utilisateur.";
    } else if (contientPrenom || contientNom) {
      errs.password = "Le mot de passe ne doit pas contenir votre nom ou prénom.";
    }

    // 7. Confirmation du mot de passe
    if (!confirmPassword) {
      errs.confirmPassword = "Veuillez confirmer votre mot de passe.";
    } else if (password && confirmPassword !== password) {
      errs.confirmPassword = "Les mots de passe ne correspondent pas.";
    }

    // 8. Spécialité ou Enfants selon le profil
    if (typeCompte === "enseignant") {
      const specTrim = specialite.trim();
      if (!specTrim) {
        errs.specialite = "Veuillez renseigner votre matière ou spécialité d'enseignement.";
      } else if (specTrim.length < 2) {
        errs.specialite = "La spécialité doit comporter au moins 2 lettres.";
      } else if (/[0-9]/.test(specTrim)) {
        errs.specialite = "La spécialité ne doit comporter que des lettres (ex: Mathématiques).";
      }
    } else {
      const matTrim = matriculesEnfants.trim();
      if (!matTrim) {
        errs.matriculesEnfants = "Veuillez indiquer le ou les matricules (ou noms complets) de vos enfants inscrits.";
      } else if (matTrim.length < 2) {
        errs.matriculesEnfants = "Veuillez préciser au moins un élève (ex: EL001 ou Koffi AGOUVI).";
      }
    }

    // 9. Consentement obligatoire
    if (!consentement) {
      errs.consentement = "Vous devez accepter la politique de confidentialité pour transmettre votre demande.";
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
              Votre demande d'accès a été transmise avec chiffrement de bout en bout à l'administration de l'établissement.
              Elle sera examinée par la direction. Une fois validée, vous pourrez vous connecter immédiatement
              avec votre identifiant et votre mot de passe.
            </p>
            <div className="react-securite-carte" style={{ marginBottom: "1.5rem" }}>
              <div className="react-securite-en-tete">
                <div className="react-securite-badge-icone"><IconeBouclier /></div>
                <div className="react-securite-titre-bloc">
                  <strong>Confidentialité préservée</strong>
                  <span>Votre mot de passe a été haché de manière irréversible</span>
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
          <p className="react-panneau-tagline">Portail officiel d'accès à la plateforme scolaire</p>
          <ul className="react-panneau-liste">
            <li><span className="react-panneau-icone"><IconeLivre /></span>Formulaire d'inscription sécurisé</li>
            <li><span className="react-panneau-icone"><IconeCadenas /></span>Mot de passe haché et strictement confidentiel</li>
            <li><span className="react-panneau-icone"><IconePersonne /></span>Validation manuelle par la direction</li>
            <li><span className="react-panneau-icone"><IconeBouclier /></span>Conformité protection des données personnelles</li>
          </ul>
          <div className="react-panneau-pied">Adidogome — Lome, Togo</div>
        </div>
      </div>

      {/* Zone du formulaire */}
      <div className="react-login-formulaire-zone">
        <div className="react-login-langue">
          <SelecteurLangue langue={langue} onChangerLangue={onChangerLangue} />
        </div>

        <div className="react-login-formulaire-carte" style={{ maxWidth: "560px" }}>
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
                placeholder="Ex: Jean-Luc"
                onChange={gererChangementPrenom}
                onBlur={formaterPrenomApresSaisie}
                erreur={(touches.firstName && erreurs.firstName) || erreursBackend.firstName}
                succesMsg={!erreurs.firstName && firstName ? "Prénom valide" : null}
                icone={<IconePersonne />}
              />
              <ChampFlottant
                inputRef={inputRefs.lastName}
                nomChamp="demande-nom"
                label={langue === "en" ? "Last Name" : "Nom de famille"}
                type="text"
                valeur={lastName}
                requis={true}
                placeholder="Ex: DUPONT"
                onChange={gererChangementNom}
                onBlur={formaterNomApresSaisie}
                erreur={(touches.lastName && erreurs.lastName) || erreursBackend.lastName}
                succesMsg={!erreurs.lastName && lastName ? "Nom valide" : null}
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
                placeholder="Ex: jean.dupont@gmail.com"
                onChange={gererChangementEmail}
                onBlur={function () { marquerTouche("email"); }}
                erreur={(touches.email && erreurs.email) || erreursBackend.email}
                succesMsg={!erreurs.email && email ? "Adresse valide" : null}
                icone={<IconeArrobase />}
              />
              <ChampFlottant
                inputRef={inputRefs.telephone}
                nomChamp="demande-telephone"
                label={langue === "en" ? "Mobile Phone" : "Téléphone mobile"}
                type="tel"
                valeur={telephone}
                requis={true}
                placeholder="Ex: +228 90 12 34 56"
                onChange={gererChangementTelephone}
                onBlur={function () { marquerTouche("telephone"); }}
                erreur={(touches.telephone && erreurs.telephone) || erreursBackend.telephone}
                succesMsg={!erreurs.telephone && telephone ? "Numéro valide" : null}
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
              placeholder="Ex: j.dupont (minuscules, 3 à 25 car.)"
              autoCompleteValeur="off"
              onChange={gererChangementUsername}
              onBlur={function () { marquerTouche("username"); }}
              erreur={(touches.username && erreurs.username) || erreursBackend.username}
              succesMsg={!erreurs.username && username ? "Identifiant conforme" : null}
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
                placeholder="8+ car. avec majuscule & symbole"
                autoCompleteValeur="new-password"
                onChange={function (e) { setPassword(e.target.value); }}
                onBlur={function () { marquerTouche("password"); }}
                erreur={(touches.password && erreurs.password) || erreursBackend.password}
                succesMsg={!erreurs.password && password && scoreMdp >= 4 ? "Mot de passe robuste" : null}
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
                label={langue === "en" ? "Confirm password" : "Confirmer le mot de passe"}
                type={confirmerVisible ? "text" : "password"}
                valeur={confirmPassword}
                requis={true}
                placeholder="Retapez exactement le mot de passe"
                autoCompleteValeur="new-password"
                onChange={function (e) { setConfirmPassword(e.target.value); }}
                onBlur={function () { marquerTouche("confirmPassword"); }}
                erreur={touches.confirmPassword && erreurs.confirmPassword}
                succesMsg={confirmPassword && password && confirmPassword === password ? "✓ Mots de passe identiques" : null}
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
                  <span style={{ color: "var(--ink-700)" }}>Niveau de sécurité :</span>
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
                    {aAuMoins8 ? <IconeCheck /> : "○"} 8 caractères minimum
                  </div>
                  <div className={"react-critere-item" + (aMajuscule && aMinuscule ? " valide" : "")}>
                    {aMajuscule && aMinuscule ? <IconeCheck /> : "○"} Majuscule et minuscule
                  </div>
                  <div className={"react-critere-item" + (aChiffre ? " valide" : "")}>
                    {aChiffre ? <IconeCheck /> : "○"} Au moins 1 chiffre (0-9)
                  </div>
                  <div className={"react-critere-item" + (aSpecial ? " valide" : "")}>
                    {aSpecial ? <IconeCheck /> : "○"} Caractère spécial (@, #, !)
                  </div>
                  <div className={"react-critere-item" + (pasDeDonneesPerso && !estTrivial ? " valide" : "")}>
                    {pasDeDonneesPerso && !estTrivial ? <IconeCheck /> : "○"} Distinct du nom & prénom
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
                  succesMsg={!erreurs.specialite && specialite ? "Discipline renseignée" : null}
                  icone={<IconeValise />}
                  placeholder="Ex: Mathématiques, SVT, Français..."
                />
                {/* Suggestions cliquables */}
                <div className="react-specialites-pills">
                  {SPECIALITES_SUGGESTIONS.map(function (mat) {
                    return (
                      <button
                        key={mat}
                        type="button"
                        className={"react-specialite-pill" + (specialite === mat ? " actif" : "")}
                        onClick={function () {
                          setSpecialite(mat);
                          marquerTouche("specialite");
                        }}
                      >
                        {mat}
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
                  placeholder="Ex: Comptable, Commerçant..."
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
                  succesMsg={!erreurs.matriculesEnfants && matriculesEnfants ? "Élève(s) renseigné(s)" : null}
                  icone={<IconeFamille />}
                  placeholder="Ex: EL001 ou Nom complet de l'enfant"
                />
              </div>
            )}

            {/* Section 4 : Garantie Institutionnelle de Confidentialité & Sécurité Ultra Pro */}
            <div className="react-securite-carte">
              <div className="react-securite-en-tete">
                <div className="react-securite-badge-icone">
                  <IconeBouclier />
                </div>
                <div className="react-securite-titre-bloc">
                  <strong>Garantie Institutionnelle de Confidentialité & Sécurité</strong>
                  <span>Cadre certifié de protection des données scolaires et personnelles</span>
                </div>
              </div>

              {/* Badges de confiance */}
              <div className="react-securite-badges-ligne">
                <span className="react-securite-badge-pill">
                  <IconeCle /> Chiffrement TLS 256-bit
                </span>
                <span className="react-securite-badge-pill">
                  <IconeCadenas /> Hachage PBKDF2 Salé
                </span>
                <span className="react-securite-badge-pill">
                  <IconeBouclier /> Validation Humaine
                </span>
                <span className="react-securite-badge-pill">
                  <IconeDocument /> Secret Professionnel
                </span>
              </div>

              <ul className="react-securite-points">
                <li>
                  <div className="react-securite-point-icone">
                    <IconeCheck />
                  </div>
                  <div className="react-securite-point-texte">
                    <strong>Hachage cryptographique fort :</strong> Votre mot de passe est converti de manière irréversible par algorithme cryptographique dès l'envoi. Il n'est jamais stocké en clair et demeure strictement inaccessible, même aux administrateurs.
                  </div>
                </li>
                <li>
                  <div className="react-securite-point-icone">
                    <IconeCheck />
                  </div>
                  <div className="react-securite-point-texte">
                    <strong>Contrôle d'accès et validation humaine :</strong> Pour garantir l'intégrité de l'établissement, chaque inscription fait l'objet d'un examen minutieux par la direction avant toute activation.
                  </div>
                </li>
                <li>
                  <div className="react-securite-point-icone">
                    <IconeCheck />
                  </div>
                  <div className="react-securite-point-texte">
                    <strong>Secret professionnel et finalité exclusive :</strong> Vos coordonnées et liens de parenté sont réservés exclusivement à la communication scolaire de l'établissement. Zéro revente, zéro démarchage, zéro communication à des tiers.
                  </div>
                </li>
              </ul>

              <button
                type="button"
                className="react-securite-btn-charte"
                onClick={function () { setModalCharteOuverte(true); }}
              >
                <IconeDocument />
                <span>Consulter la Charte Intégrale de Confidentialité & Protection des Données</span>
              </button>
            </div>

            {/* Case à cocher obligatoire de consentement légal */}
            <div
              className={"react-consentement-zone" + (touches.consentement && erreurs.consentement ? " erreur" : "")}
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
                <strong>Je certifie sur l'honneur l'exactitude des renseignements fournis</strong> et j'accepte le traitement de mes données dans le cadre exclusif de la scolarité au Complexe Scolaire Magnificat.
              </label>
            </div>
            {touches.consentement && erreurs.consentement ? (
              <div className="react-champ-erreur-msg" style={{ marginBottom: "0.8rem" }}>
                <IconeAlerte />
                <span>{erreurs.consentement}</span>
              </div>
            ) : null}

            {/* Bouton de soumission */}
            <button
              type="submit"
              className="mag-btn-primary react-btn-connexion"
              disabled={enCours}
              style={{ marginTop: "0.6rem", width: "100%" }}
            >
              {enCours ? <span className="react-spinner"></span> : (langue === "en" ? "Submit Access Request" : "Transmettre ma demande d'accès sécurisée")}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1.2rem" }}>
            <a href="#/" className="react-lien-retour">
              <span style={{ transform: "translateY(-1px)" }}>←</span> {langue === "en" ? "Back to login page" : "Retour à la page de connexion"}
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
                  <h3 className="react-charte-titre">Charte de Confidentialité</h3>
                  <p className="react-charte-sous-titre">{nomEcoleAffiche} — Protection des Données Scolaires</p>
                </div>
              </div>
              <button
                type="button"
                className="react-charte-fermer-btn"
                onClick={function () { setModalCharteOuverte(false); }}
                aria-label="Fermer la charte"
              >
                ✕
              </button>
            </div>

            <div className="react-charte-corps">
              <div className="react-charte-article">
                <h4>1. Responsable de Traitement & Cadre d'Application</h4>
                <p>
                  Les données à caractère personnel recueillies sur ce portail sont traitées sous la responsabilité exclusive de la Direction du <strong>{nomEcoleAffiche}</strong>, dans le cadre de sa mission d'enseignement, de suivi pédagogique et de gestion des relations entre parents, enseignants et administration.
                </p>
              </div>

              <div className="react-charte-article">
                <h4>2. Chiffrement & Sécurité des Identifiants</h4>
                <p>
                  Conformément aux normes les plus strictes de sécurité informatique, votre mot de passe fait l'objet d'un hachage cryptographique irréversible (PBKDF2 avec sel unique). Il n'est conservé à aucun moment en texte clair sur nos serveurs. Ni le personnel administratif, ni les développeurs, ni la direction générale n'ont la capacité technique d'en prendre connaissance.
                </p>
              </div>

              <div className="react-charte-article">
                <h4>3. Secret Professionnel & Non-Divulgation</h4>
                <p>
                  Toutes les informations déclarées (noms, prénoms, numéros de téléphone, adresses électroniques, spécialités d'enseignement ou filiation d'élèves) sont couvertes par le secret professionnel. Elles ne sont ni louées, ni vendues, ni communiquées à aucun organisme commercial ou tiers non autorisé.
                </p>
              </div>

              <div className="react-charte-article">
                <h4>4. Validation Administrative Préalable</h4>
                <p>
                  L'ouverture d'un compte sur la plateforme n'est pas automatique : elle requiert la vérification manuelle et systématique des informations transmises par la direction de l'école. Cette mesure assure que seuls les membres légitimes de la communauté éducative accèdent aux notes, bulletins et données confidentielles des élèves.
                </p>
              </div>

              <div className="react-charte-article">
                <h4>5. Droits d'Accès, de Rectification et de Suppression</h4>
                <p>
                  Vous bénéficiez d'un droit permanent d'accès, de rectification et de mise à jour des données vous concernant. Pour toute demande relative à vos données ou pour l'exercice de vos droits, vous pouvez contacter directement le secrétariat général de l'établissement.
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
                J'ai pris connaissance de la charte
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
