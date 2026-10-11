// src/api.js
// Petite couche d'acces a l'API REST Django (authentification par token,
// stockage du token dans localStorage pour rester connecte apres un
// rafraichissement de page).
// NB: ce fichier evite volontairement les templates litteraux (backticks)
// et utilise la concatenation de chaines (+), pour eviter tout probleme
// de copier-coller ou les backticks pourraient etre corrompus.
import { traduireTexte } from "./localisation.js";

const API_BASE = "/api";
const CLE_TOKEN = "magnificat_token";
const CLE_UTILISATEUR = "magnificat_utilisateur";
const CLE_ROLE = "magnificat_role";

export function obtenirTokenStocke() {
  return localStorage.getItem(CLE_TOKEN);
}

export function obtenirUtilisateurStocke() {
  return localStorage.getItem(CLE_UTILISATEUR);
}

export function obtenirRoleStocke() {
  return localStorage.getItem(CLE_ROLE);
}

export function enregistrerSession(token, utilisateur, role) {
  localStorage.setItem(CLE_TOKEN, token);
  localStorage.setItem(CLE_UTILISATEUR, utilisateur);
  if (role) localStorage.setItem(CLE_ROLE, role);
}

export function effacerSession() {
  localStorage.removeItem(CLE_TOKEN);
  localStorage.removeItem(CLE_UTILISATEUR);
  localStorage.removeItem(CLE_ROLE);
}

// Extrait un message d'erreur lisible depuis une reponse d'erreur DRF, qui
// peut prendre plusieurs formes : {"detail": "..."} (erreurs generiques,
// PermissionDenied...) ou {"champ": ["message1", "message2"]} (erreurs de
// validation par champ, ex: notre validateur de taille d'image). Sans ca,
// une erreur de validation par champ affichait juste le message de repli
// generique, jamais la vraie raison du refus.
function extraireMessageErreur(corps, repli) {
  if (!corps || typeof corps !== "object") return traduireTexte(repli);
  if (typeof corps.detail === "string") return traduireTexte(corps.detail);
  const messages = Object.values(corps).flat().filter(function (v) { return typeof v === "string"; });
  return traduireTexte(messages.length ? messages.join(" ") : repli);
}

export async function connecter(utilisateur, motDePasse) {
  const corps = "username=" + encodeURIComponent(utilisateur) + "&password=" + encodeURIComponent(motDePasse);
  const resp = await fetch(API_BASE + "/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: corps,
  });
  if (!resp.ok) {
    throw new Error(traduireTexte("Identifiants incorrects."));
  }
  const donnees = await resp.json();
  return donnees.token;
}

async function requeteBrute(url, token, options) {
  options = options || {};
  const entetes = Object.assign(
    { Authorization: "Token " + token },
    options.body ? { "Content-Type": "application/json" } : {},
    options.headers || {}
  );
  const resp = await fetch(url, Object.assign({}, options, { headers: entetes }));

  if (resp.status === 401) {
    effacerSession();
    throw new Error("Session expiree, merci de vous reconnecter.");
  }
  if (!resp.ok) {
    let corps = null;
    try { corps = await resp.json(); } catch (erreurParsing) { corps = null; }
    throw new Error(extraireMessageErreur(corps, "Erreur API (" + resp.status + ")."));
  }
  if (resp.status === 204) return null;
  return resp.json();
}

async function requete(chemin, token, options) {
  return requeteBrute(API_BASE + "/" + chemin, token, options);
}

// Recupere TOUTES les pages d'une ressource paginee par l'API (DRF pagine
// par 20 par defaut). Sans ce parcours des pages suivantes ("next"), toute
// classe dont les eleves ne figurent pas parmi les 20 premiers enregistres
// en base apparaissait a tort comme vide dans l'interface.
export async function lister(ressource, token) {
  let json = await requete(ressource + "/", token);
  if (Array.isArray(json)) return json;
  let tous = (json.results || []).slice();
  let suivant = json.next;
  while (suivant) {
    json = await requeteBrute(suivant, token);
    tous = tous.concat(json.results || []);
    suivant = json.next;
  }
  return tous;
}

export function creer(ressource, token, donnees) {
  return requete(ressource + "/", token, {
    method: "POST",
    body: JSON.stringify(donnees),
  });
}

export function recupererProfil(token) {
  return requete("whoami/", token);
}
// Nom complet renvoye par whoami/ si renseigne (prenom+nom Django), sinon
// on retombe sur le nom d'utilisateur saisi a la connexion.
export function nomAffichage(profil, repli) {
  return (profil && profil.full_name && profil.full_name.trim()) ? profil.full_name.trim() : repli;
}
export async function obtenirIdentitePublique() {
  // Pas de token ici : appelee AVANT connexion, depuis l'ecran de login.
  const resp = await fetch(API_BASE + "/identite-publique/");
  if (!resp.ok) return { nom_ecole: null, logo: null };
  return resp.json();
}
export function obtenirParametres(token) {
  return requete("parametres/", token);
}
export function modifierParametres(token, donnees) {
  return requete("parametres/", token, {
    method: "PUT",
    body: JSON.stringify(donnees),
  });
}

export async function modifierParametresAvecLogo(token, donneesFormulaire) {
  const resp = await fetch(API_BASE + "/parametres/", {
    method: "PUT",
    headers: { Authorization: "Token " + token },
    body: donneesFormulaire,
  });
  if (resp.status === 401) {
    effacerSession();
    throw new Error("Session expiree, merci de vous reconnecter.");
  }
  const donnees = await resp.json();
  if (!resp.ok) {
    throw new Error(extraireMessageErreur(donnees, "Erreur lors de l'enregistrement."));
  }
  return donnees;
}
export function obtenirSuiviSaisie(token, trimestre) {
  return requete("suivi-saisie/?trimestre=" + trimestre, token);
} 
export async function importerElevesCsv(token, fichier) {
  const donneesFormulaire = new FormData();
  donneesFormulaire.append("fichier", fichier);

  const resp = await fetch(API_BASE + "/eleves/importer-csv/", {
    method: "POST",
    headers: { Authorization: "Token " + token },
    body: donneesFormulaire,
  });

  if (resp.status === 401) {
    effacerSession();
    throw new Error("Session expiree, merci de vous reconnecter.");
  }
  const donnees = await resp.json();
  if (!resp.ok) {
    throw new Error(extraireMessageErreur(donnees, "Erreur lors de l'import."));
  }
  return donnees;
}
export function modifier(ressource, id, token, donnees) {
  return requete(ressource + "/" + id + "/", token, {
    method: "PATCH",
    body: JSON.stringify(donnees),
  });
}

export function supprimer(ressource, id, token) {
  return requete(ressource + "/" + id + "/", token, {
    method: "DELETE",
  });
}
export function genererBulletin(token, eleveId, trimestre) {
  return requete("bulletins/generer/", token, {
    method: "POST",
    body: JSON.stringify({ eleve: eleveId, trimestre: trimestre }),
  });
}
export function genererBulletinsLot(token, eleveIds, trimestre) {
  return requete("bulletins/generer-lot/", token, {
    method: "POST",
    body: JSON.stringify({ eleves: eleveIds, trimestre: trimestre }),
  });
}
export async function soumettreDemandeAcces(donnees) {
  const resp = await fetch(API_BASE + "/demandes-acces/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(donnees),
  });
  const contenu = await resp.json();
  if (!resp.ok) {
    throw new Error(extraireMessageErreur(contenu, "Erreur lors de l'envoi de la demande."));
  }
  return contenu;
}

export function listerDemandesAcces(token) {
  return lister("demandes-acces", token);
}

export function approuverDemandeAcces(token, id) {
  return requete("demandes-acces/" + id + "/approuver/", token, { method: "POST" });
}

export function refuserDemandeAcces(token, id, motif) {
  return requete("demandes-acces/" + id + "/refuser/", token, {
    method: "POST",
    body: JSON.stringify({ motif_refus: motif || "" }),
  });
}
export function obtenirCorrespondantsMessagerie(token) {
  return requete("messagerie/correspondants/", token);
}

export function approuverConge(token, id) {
  return requete("conges/" + id + "/approuver/", token, { method: "POST" });
}

export function refuserConge(token, id) {
  return requete("conges/" + id + "/refuser/", token, { method: "POST" });
}

export function obtenirSituationFinanciere(token, classeId) {
  return requete("paiements/situation/" + classeId + "/", token);
}
