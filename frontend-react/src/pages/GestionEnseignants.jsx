// src/pages/GestionEnseignants.jsx
// Gestion complète des enseignants : création et modification de compte,
// affectation des matières et classes avec sélection en grille de badges réactive,
// et tableau récapitulatif avec actions claires.
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, supprimer } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";
import { UserCheck, BookOpen, GraduationCap } from "lucide-react";

function trierClassesOrdreScolaire(liste) {
  if (!Array.isArray(liste)) return [];
  const ordreNiveaux = [
    // Primaire
    "ci", "cp1", "cp2", "ce1", "ce2", "cm1", "cm2",
    // Collège (6e -> 3e)
    "6e", "6eme", "6ème", "sixieme", "sixième",
    "5e", "5eme", "5ème", "cinquieme", "cinquième",
    "4e", "4eme", "4ème", "quatrieme", "quatrième",
    "3e", "3eme", "3ème", "troisieme", "troisième",
    // Lycée (2nde -> Tle)
    "2nde", "seconde", "2nd", "2e",
    "1ere", "1ère", "premiere", "première", "1re",
    "tle", "terminale"
  ];

  return [...liste].sort(function (a, b) {
    const nomA = (a.nom || "").toLowerCase().trim();
    const nomB = (b.nom || "").toLowerCase().trim();

    const trouverIndex = function (nom, niveau) {
      const nivStr = (niveau || "").toLowerCase().trim();
      for (let i = 0; i < ordreNiveaux.length; i++) {
        const prefixe = ordreNiveaux[i];
        if (nom.startsWith(prefixe) || (nivStr && nivStr.includes(prefixe))) {
          return i;
        }
      }
      return 999;
    };

    const indexA = trouverIndex(nomA, a.niveau);
    const indexB = trouverIndex(nomB, b.niveau);

    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return nomA.localeCompare(nomB, "fr", { numeric: true });
  });
}

export default function GestionEnseignants({ token }) {
  const confirmation = useConfirmation();
  const [enseignants, setEnseignants] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [classes, setClasses] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [idEnEdition, setIdEnEdition] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [matieresChoisies, setMatieresChoisies] = useState([]);
  const [classesChoisies, setClassesChoisies] = useState([]);

  const chargerTout = function () {
    setStatut("chargement");
    Promise.all([lister("enseignants", token), lister("matieres", token), lister("classes", token)])
      .then(function (resultats) {
        setEnseignants(resultats[0] || []);
        setMatieres(resultats[1] || []);
        setClasses(resultats[2] || []);
        setStatut("ok");
      })
      .catch(function () { setStatut("refuse"); });
  };

  useEffect(chargerTout, [token]);

  const matieresTriees = useMemo(function () {
    return [...matieres].sort(function (a, b) {
      return (a.nom || "").localeCompare(b.nom || "", "fr");
    });
  }, [matieres]);

  const classesTriees = useMemo(function () {
    return trierClassesOrdreScolaire(classes);
  }, [classes]);

  const viderFormulaire = function () {
    setIdEnEdition(null);
    setUsername("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setTelephone("");
    setSpecialite("");
    setMatieresChoisies([]);
    setClassesChoisies([]);
  };

  const commencerEdition = function (e) {
    setIdEnEdition(e.id);
    setUsername(e.username);
    setPassword("");
    setFirstName(e.first_name || "");
    setLastName(e.last_name || "");
    setEmail(e.email || "");
    setTelephone(e.telephone || "");
    setSpecialite(e.specialite || "");
    setMatieresChoisies(e.matieres || []);
    setClassesChoisies(e.classes || []);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const basculerMatiere = function (id) {
    const idNum = Number(id);
    setMatieresChoisies(function (prev) {
      const existe = prev.some(function (v) { return Number(v) === idNum; });
      if (existe) {
        return prev.filter(function (v) { return Number(v) !== idNum; });
      } else {
        return prev.concat([idNum]);
      }
    });
  };

  const basculerClasse = function (id) {
    const idNum = Number(id);
    setClassesChoisies(function (prev) {
      const existe = prev.some(function (v) { return Number(v) === idNum; });
      if (existe) {
        return prev.filter(function (v) { return Number(v) !== idNum; });
      } else {
        return prev.concat([idNum]);
      }
    });
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      if (idEnEdition) {
        const donnees = {
          first_name: firstName,
          last_name: lastName,
          email: email,
          telephone: telephone,
          specialite: specialite,
          matieres: matieresChoisies,
          classes: classesChoisies,
        };
        if (password) donnees.password = password;
        await modifier("enseignants", idEnEdition, token, donnees);
        setMessage({ type: "succes", texte: "Compte enseignant mis à jour avec succès." });
      } else {
        await creer("enseignants", token, {
          username: username,
          password: password,
          first_name: firstName,
          last_name: lastName,
          email: email,
          telephone: telephone,
          specialite: specialite,
          matieres: matieresChoisies,
          classes: classesChoisies,
        });
        setMessage({ type: "succes", texte: "Compte enseignant créé avec succès." });
      }
      viderFormulaire();
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message || "Impossible d'enregistrer le compte enseignant." });
    }
    setEnCours(false);
  };

  const supprimerEnseignant = async function (e) {
    const nomAffiche = (e.first_name + " " + e.last_name).trim() || e.username;
    if (!(await confirmation.demander("Êtes-vous sûr de vouloir supprimer le compte enseignant de « " + nomAffiche + " » ?"))) return;
    try {
      await supprimer("enseignants", e.id, token);
      setMessage({ type: "succes", texte: "Compte enseignant supprimé." });
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible de l'enseignant." });
    }
  };

  return (
    <>
      <div className="mag-page-title-ligne">
        <div className="mag-page-title">
          <h1>Enseignants</h1>
        </div>
      </div>

      {/* FORMULAIRE PLEINE LARGEUR (W-FULL) SANS VIDE À DROITE */}
      <div
        className="mag-panneau-form react-fade-in"
        style={{
          marginBottom: "2rem",
          width: "100%",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "8px",
          padding: "1.25rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", borderBottom: "1px solid #F1F5F9", paddingBottom: "0.6rem" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UserCheck size={18} color="#1E3A8A" />
            <span>{idEnEdition ? "Modifier le compte enseignant" : "Créer un compte enseignant"}</span>
          </div>
          {idEnEdition ? (
            <span style={{ fontSize: "0.8rem", color: "#64748B", background: "#F1F5F9", padding: "0.2rem 0.6rem", borderRadius: "4px" }}>
              Édition en cours
            </span>
          ) : null}
        </div>

        {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

        <form onSubmit={soumettre}>
          {/* LIGNE 1 : 3 COLONNES (Identifiants & Spécialité) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="ens-username" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                Nom d'utilisateur
              </label>
              <input
                id="ens-username"
                type="text"
                value={username}
                onChange={function (e) { setUsername(e.target.value); }}
                required
                disabled={!!idEnEdition}
                placeholder="Ex: kagouvi"
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 0.75rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  background: idEnEdition ? "#F1F5F9" : "#FFF",
                  fontSize: "0.88rem",
                  color: "#0F172A",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="ens-password" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                Mot de passe {idEnEdition ? <span style={{ fontWeight: 400, color: "#64748B" }}>(laisser vide pour ne pas changer)</span> : ""}
              </label>
              <input
                id="ens-password"
                type="password"
                value={password}
                onChange={function (e) { setPassword(e.target.value); }}
                required={!idEnEdition}
                minLength={8}
                placeholder="Minimum 8 caractères"
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 0.75rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  background: "#FFF",
                  fontSize: "0.88rem",
                  color: "#0F172A",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="ens-specialite" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                Spécialité
              </label>
              <input
                id="ens-specialite"
                type="text"
                value={specialite}
                onChange={function (e) { setSpecialite(e.target.value); }}
                placeholder="Ex: Mathématiques, Français..."
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 0.75rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  background: "#FFF",
                  fontSize: "0.88rem",
                  color: "#0F172A",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* LIGNE 2 : 4 COLONNES (État civil & Contact) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.2rem" }}>
            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="ens-nom" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                Nom
              </label>
              <input
                id="ens-nom"
                type="text"
                value={lastName}
                onChange={function (e) { setLastName(e.target.value); }}
                placeholder="Ex: AGOUVI"
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 0.75rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  background: "#FFF",
                  fontSize: "0.88rem",
                  color: "#0F172A",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="ens-prenom" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                Prénom
              </label>
              <input
                id="ens-prenom"
                type="text"
                value={firstName}
                onChange={function (e) { setFirstName(e.target.value); }}
                placeholder="Ex: Komlan"
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 0.75rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  background: "#FFF",
                  fontSize: "0.88rem",
                  color: "#0F172A",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="ens-telephone" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                Téléphone
              </label>
              <input
                id="ens-telephone"
                type="text"
                value={telephone}
                onChange={function (e) { setTelephone(e.target.value); }}
                placeholder="Ex: 90384025"
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 0.75rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  background: "#FFF",
                  fontSize: "0.88rem",
                  color: "#0F172A",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="ens-email" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                Email
              </label>
              <input
                id="ens-email"
                type="email"
                value={email}
                onChange={function (e) { setEmail(e.target.value); }}
                placeholder="Ex: enseignant@magnificat.tg"
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 0.75rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  background: "#FFF",
                  fontSize: "0.88rem",
                  color: "#0F172A",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* MATIÈRES ENSEIGNÉES - GRILLE DE BADGES CLIQUABLES (ALIGNEMENT FLEX items-center gap-2) */}
          <div className="mag-field" style={{ marginBottom: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <BookOpen size={15} color="#1E3A8A" />
                <span>Matières enseignées ({matieresChoisies.length} sélectionnée{matieresChoisies.length > 1 ? "s" : ""})</span>
              </label>
              {matieresChoisies.length > 0 ? (
                <button
                  type="button"
                  onClick={function () { setMatieresChoisies([]); }}
                  className="mag-btn-lien"
                  style={{ fontSize: "0.78rem", color: "#64748B" }}
                >
                  Tout désélectionner
                </button>
              ) : null}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "0.5rem",
                padding: "0.6rem",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
              }}
            >
              {matieresTriees.map(function (m) {
                const estCoche = matieresChoisies.some(function (v) { return Number(v) === Number(m.id); });
                return (
                  <label
                    key={m.id}
                    onClick={function (e) {
                      e.preventDefault();
                      basculerMatiere(m.id);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.45rem 0.65rem",
                      borderRadius: "5px",
                      border: `1px solid ${estCoche ? "#1E3A8A" : "#CBD5E1"}`,
                      background: estCoche ? "#EFF6FF" : "#FFFFFF",
                      color: estCoche ? "#1E3A8A" : "#334155",
                      cursor: "pointer",
                      fontSize: "0.84rem",
                      fontWeight: estCoche ? 600 : 500,
                      userSelect: "none",
                      transition: "all 0.12s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={estCoche}
                      onChange={function () {}}
                      style={{
                        margin: 0,
                        cursor: "pointer",
                        width: "15px",
                        height: "15px",
                        accentColor: "#1E3A8A",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.nom}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* CLASSES ASSIGNÉES - GRILLE DE BADGES CLIQUABLES (ALIGNEMENT FLEX items-center gap-2) */}
          <div className="mag-field" style={{ marginBottom: "1.4rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <GraduationCap size={15} color="#1E3A8A" />
                <span>Classes assignées ({classesChoisies.length} sélectionnée{classesChoisies.length > 1 ? "s" : ""})</span>
              </label>
              {classesChoisies.length > 0 ? (
                <button
                  type="button"
                  onClick={function () { setClassesChoisies([]); }}
                  className="mag-btn-lien"
                  style={{ fontSize: "0.78rem", color: "#64748B" }}
                >
                  Tout désélectionner
                </button>
              ) : null}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "0.5rem",
                padding: "0.6rem",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
              }}
            >
              {classesTriees.map(function (c) {
                const estCoche = classesChoisies.some(function (v) { return Number(v) === Number(c.id); });
                const nomCourt = c.nom ? c.nom.split(" (")[0] : `Classe #${c.id}`;
                return (
                  <label
                    key={c.id}
                    onClick={function (e) {
                      e.preventDefault();
                      basculerClasse(c.id);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.45rem 0.65rem",
                      borderRadius: "5px",
                      border: `1px solid ${estCoche ? "#1E3A8A" : "#CBD5E1"}`,
                      background: estCoche ? "#EFF6FF" : "#FFFFFF",
                      color: estCoche ? "#1E3A8A" : "#334155",
                      cursor: "pointer",
                      fontSize: "0.84rem",
                      fontWeight: estCoche ? 600 : 500,
                      userSelect: "none",
                      transition: "all 0.12s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={estCoche}
                      onChange={function () {}}
                      style={{
                        margin: 0,
                        cursor: "pointer",
                        width: "15px",
                        height: "15px",
                        accentColor: "#1E3A8A",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {nomCourt}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ACTIONS DU FORMULAIRE */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingTop: "0.4rem" }}>
            <button
              type="submit"
              disabled={enCours}
              style={{
                width: "auto",
                background: "#1E3A8A",
                color: "#FFFFFF",
                border: "1px solid #1E3A8A",
                padding: "0.55rem 1.6rem",
                fontWeight: 600,
                fontSize: "0.88rem",
                borderRadius: "6px",
                cursor: enCours ? "not-allowed" : "pointer",
                opacity: enCours ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.15s ease",
              }}
            >
              {enCours ? <span className="react-spinner"></span> : (idEnEdition ? "Enregistrer les modifications" : "Créer le compte")}
            </button>
            {idEnEdition ? (
              <button
                type="button"
                className="btn-mag-outline"
                style={{ padding: "0.55rem 1.2rem", fontSize: "0.85rem", borderRadius: "6px" }}
                onClick={viderFormulaire}
              >
                Annuler
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {/* SECTION DU TABLEAU LISTE DES ENSEIGNANTS */}
      <div className="mag-section-entete" style={{ marginBottom: "0.75rem" }}>
        <div className="mag-stat-label">Liste des enseignants</div>
        <span className="mag-compteur-pill">{enseignants.length}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement des enseignants..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les enseignants.</Alerte> : null}
      {statut === "ok" ? (
        <div className="mag-table-wrap react-fade-in" style={{ border: "1px solid #E2E8F0", borderRadius: "6px", overflow: "hidden" }}>
          <table className="mag-table mag-table-pro">
            <thead>
              <tr>
                <th style={{ width: "24%" }}>Enseignant</th>
                <th style={{ width: "16%" }}>Contact</th>
                <th style={{ width: "16%" }}>Spécialité</th>
                <th style={{ width: "18%" }}>Matières</th>
                <th style={{ width: "16%" }}>Classes</th>
                <th style={{ width: "10%", textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enseignants.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#64748B", padding: "2.5rem" }}>
                    Aucun enseignant enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                enseignants.map(function (e) {
                  const nomComplet = (e.first_name + " " + e.last_name).trim() || e.username;
                  const initiale = (e.first_name || e.username).charAt(0).toUpperCase();

                  return (
                    <tr key={e.id}>
                      <td>
                        <div className="mag-personne-cellule">
                          <span className="mag-avatar">{initiale}</span>
                          <div>
                            <div className="mag-personne-nom">{nomComplet}</div>
                            <div className="mag-personne-sous">{e.username}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {e.telephone ? (
                          <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "#0F172A" }}>
                            {e.telephone}
                          </div>
                        ) : (
                          <span style={{ color: "#94A3B8", fontSize: "0.85rem" }}>{e.email || "-"}</span>
                        )}
                      </td>
                      <td style={{ color: "#334155", fontWeight: 500 }}>
                        {e.specialite || <span style={{ color: "#94A3B8", fontStyle: "italic" }}>Non renseignée</span>}
                      </td>
                      <td>
                        {e.matieres_noms && e.matieres_noms.length ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                            {e.matieres_noms.map(function (n, i) {
                              return <span className="mag-badge" key={i} style={{ fontSize: "0.78rem" }}>{n}</span>;
                            })}
                          </div>
                        ) : (
                          <span style={{ color: "#94A3B8" }}>-</span>
                        )}
                      </td>
                      <td>
                        {e.classes_noms && e.classes_noms.length ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                            {e.classes_noms.map(function (n, i) {
                              const nomCourt = n.split(" (")[0];
                              return (
                                <span
                                  className="mag-badge"
                                  key={i}
                                  style={{ background: "#F1F5F9", color: "#1E3A8A", fontWeight: 600, fontSize: "0.78rem" }}
                                >
                                  {nomCourt}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: "#94A3B8" }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="mag-btn-lien"
                          style={{ marginRight: "0.75rem", fontWeight: 600, color: "var(--azur-500)" }}
                          onClick={function () { commencerEdition(e); }}
                        >
                          Modifier
                        </button>
                        <BoutonSupprimer onClick={function () { supprimerEnseignant(e); }} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {confirmation.demande ? (
        <ConfirmModal
          titre="Supprimer le compte enseignant"
          message={confirmation.demande.message}
          texteConfirmer="Supprimer"
          danger
          onConfirmer={confirmation.confirmer}
          onAnnuler={confirmation.annuler}
        />
      ) : null}
    </>
  );
}
