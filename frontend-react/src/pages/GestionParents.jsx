// src/pages/GestionParents.jsx
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, supprimer } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";
import { Users, X } from "lucide-react";

export default function GestionParents({ token }) {
  const confirmation = useConfirmation();
  const [parents, setParents] = useState([]);
  const [eleves, setEleves] = useState([]);
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
  const [profession, setProfession] = useState("");
  const [elevesChoisis, setElevesChoisis] = useState([]);
  const [rechercheEleve, setRechercheEleve] = useState("");

  const chargerTout = function () {
    setStatut("chargement");
    Promise.all([lister("parents", token), lister("eleves", token)])
      .then(function (resultats) {
        setParents(resultats[0]);
        setEleves(resultats[1]);
        setStatut("ok");
      })
      .catch(function () {
        setStatut("refuse");
      });
  };

  useEffect(chargerTout, [token]);

  const viderFormulaire = function () {
    setIdEnEdition(null);
    setUsername("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setTelephone("");
    setProfession("");
    setElevesChoisis([]);
    setRechercheEleve("");
  };

  const commencerEdition = function (p) {
    setIdEnEdition(p.id);
    setUsername(p.username);
    setPassword("");
    setFirstName(p.first_name || "");
    setLastName(p.last_name || "");
    setEmail(p.email || "");
    setTelephone(p.telephone || "");
    setProfession(p.profession || "");
    setElevesChoisis(p.eleves || []);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const basculerEleve = function (id) {
    const idNum = Number(id);
    setElevesChoisis(function (prev) {
      const existe = prev.some(function (v) {
        return Number(v) === idNum;
      });
      if (existe) {
        return prev.filter(function (v) {
          return Number(v) !== idNum;
        });
      } else {
        return prev.concat([idNum]);
      }
    });
  };

  const retirerEleve = function (id) {
    const idNum = Number(id);
    setElevesChoisis(function (prev) {
      return prev.filter(function (v) {
        return Number(v) !== idNum;
      });
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
          profession: profession,
          eleves: elevesChoisis,
        };
        if (password) donnees.password = password;
        await modifier("parents", idEnEdition, token, donnees);
        setMessage({ type: "succes", texte: "Compte parent mis à jour avec succès." });
      } else {
        await creer("parents", token, {
          username: username,
          password: password,
          first_name: firstName,
          last_name: lastName,
          email: email,
          telephone: telephone,
          profession: profession,
          eleves: elevesChoisis,
        });
        setMessage({ type: "succes", texte: "Compte parent créé avec succès." });
      }
      viderFormulaire();
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message || "Une erreur est survenue lors de l'enregistrement." });
    }
    setEnCours(false);
  };

  const supprimerParent = async function (p) {
    const nomAffiche = (p.first_name + " " + p.last_name).trim() || p.username;
    if (!(await confirmation.demander("Êtes-vous sûr de vouloir supprimer le compte parent de « " + nomAffiche + " » ?"))) return;
    try {
      await supprimer("parents", p.id, token);
      setMessage({ type: "succes", texte: "Compte parent supprimé." });
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible du compte parent." });
    }
  };

  // Filtrage dynamique des élèves pour le sélecteur moderne
  const elevesFiltres = useMemo(() => {
    if (!rechercheEleve.trim()) return eleves;
    const q = rechercheEleve.trim().toLowerCase();
    return eleves.filter(function (e) {
      const nomComplet = ((e.nom || "") + " " + (e.prenom || "")).toLowerCase();
      const matricule = (e.matricule || "").toLowerCase();
      const classe = (e.classe_nom || "").toLowerCase();
      return nomComplet.includes(q) || matricule.includes(q) || classe.includes(q);
    });
  }, [eleves, rechercheEleve]);

  // Objets des élèves actuellement rattachés / sélectionnés
  const elevesSelectionnesObjs = useMemo(() => {
    return eleves.filter(function (e) {
      return elevesChoisis.some(function (id) {
        return Number(id) === Number(e.id);
      });
    });
  }, [eleves, elevesChoisis]);

  return (
    <>
      <div className="mag-page-title-ligne">
        <div className="mag-page-title">
          <h1>Parents</h1>
        </div>
      </div>

      {/* FORMULAIRE PLEINE LARGEUR (W-FULL) */}
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.2rem",
            borderBottom: "1px solid #F1F5F9",
            paddingBottom: "0.6rem",
          }}
        >
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "#0F172A",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Users size={18} color="#1E3A8A" />
            <span>{idEnEdition ? "Modifier le compte parent" : "Créer un compte parent"}</span>
          </div>
          {idEnEdition ? (
            <span
              style={{
                fontSize: "0.8rem",
                color: "#64748B",
                background: "#F1F5F9",
                padding: "0.2rem 0.6rem",
                borderRadius: "4px",
              }}
            >
              Édition en cours
            </span>
          ) : null}
        </div>

        {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

        <form onSubmit={soumettre}>
          {/* LIGNE 1 : 3 COLONNES (Nom d'utilisateur, Mot de passe, Profession) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div className="mag-field" style={{ margin: 0 }}>
              <label
                htmlFor="par-username"
                style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}
              >
                Nom d'utilisateur
              </label>
              <input
                id="par-username"
                type="text"
                value={username}
                onChange={function (e) {
                  setUsername(e.target.value);
                }}
                placeholder="Ex: parent.dupont"
                required
                disabled={!!idEnEdition}
              />
            </div>

            <div className="mag-field" style={{ margin: 0 }}>
              <label
                htmlFor="par-password"
                style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}
              >
                Mot de passe{" "}
                {idEnEdition ? (
                  <span style={{ fontWeight: 400, color: "#64748B" }}>(laisser vide si inchangé)</span>
                ) : null}
              </label>
              <input
                id="par-password"
                type="password"
                value={password}
                onChange={function (e) {
                  setPassword(e.target.value);
                }}
                placeholder={idEnEdition ? "••••••••" : "Au moins 8 caractères"}
                required={!idEnEdition}
                minLength={8}
              />
            </div>

            <div className="mag-field" style={{ margin: 0 }}>
              <label
                htmlFor="par-profession"
                style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}
              >
                Profession
              </label>
              <input
                id="par-profession"
                type="text"
                value={profession}
                onChange={function (e) {
                  setProfession(e.target.value);
                }}
                placeholder="Ex: Enseignant, Commerçant, Médecin..."
              />
            </div>
          </div>

          {/* LIGNE 2 : 4 COLONNES (Nom, Prénom, Téléphone, Email) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            <div className="mag-field" style={{ margin: 0 }}>
              <label
                htmlFor="par-nom"
                style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}
              >
                Nom
              </label>
              <input
                id="par-nom"
                type="text"
                value={lastName}
                onChange={function (e) {
                  setLastName(e.target.value);
                }}
                placeholder="Ex: KODJO"
                required
              />
            </div>

            <div className="mag-field" style={{ margin: 0 }}>
              <label
                htmlFor="par-prenom"
                style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}
              >
                Prénom
              </label>
              <input
                id="par-prenom"
                type="text"
                value={firstName}
                onChange={function (e) {
                  setFirstName(e.target.value);
                }}
                placeholder="Ex: Yawo"
                required
              />
            </div>

            <div className="mag-field" style={{ margin: 0 }}>
              <label
                htmlFor="par-telephone"
                style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}
              >
                Téléphone
              </label>
              <input
                id="par-telephone"
                type="text"
                value={telephone}
                onChange={function (e) {
                  setTelephone(e.target.value);
                }}
                placeholder="Ex: 90 12 34 56"
              />
            </div>

            <div className="mag-field" style={{ margin: 0 }}>
              <label
                htmlFor="par-email"
                style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}
              >
                Email
              </label>
              <input
                id="par-email"
                type="email"
                value={email}
                onChange={function (e) {
                  setEmail(e.target.value);
                }}
                placeholder="Ex: parent@gmail.com"
              />
            </div>
          </div>

          {/* SÉLECTEUR D'ENFANTS COMPACT AVEC RECHERCHE */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.45rem",
              }}
            >
              <label
                htmlFor="par-recherche-eleve"
                style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", margin: 0 }}
              >
                Enfant(s) rattaché(s) {elevesChoisis.length > 0 ? `(${elevesChoisis.length})` : ""}
              </label>
              {elevesChoisis.length > 0 ? (
                <button
                  type="button"
                  onClick={function () {
                    setElevesChoisis([]);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#DC2626",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  Tout désélectionner
                </button>
              ) : null}
            </div>

            {/* Badges des enfants sélectionnés */}
            {elevesSelectionnesObjs.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.4rem",
                  marginBottom: "0.6rem",
                  padding: "0.5rem 0.75rem",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1E3A8A", marginRight: "0.25rem" }}>
                  Sélectionné{elevesSelectionnesObjs.length > 1 ? "s" : ""} :
                </span>
                {elevesSelectionnesObjs.map(function (e) {
                  const classeTxt = e.classe_nom ? " (" + e.classe_nom.split(" (")[0] + ")" : "";
                  return (
                    <span
                      key={e.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        background: "#EFF6FF",
                        color: "#1E3A8A",
                        border: "1px solid #BFDBFE",
                        borderRadius: "9999px",
                        padding: "0.2rem 0.55rem",
                        fontSize: "0.78rem",
                        fontWeight: 500,
                      }}
                    >
                      <span>
                        {e.nom} {e.prenom} {classeTxt}
                      </span>
                      <button
                        type="button"
                        onClick={function () {
                          retirerEleve(e.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#3B82F6",
                          cursor: "pointer",
                          padding: "0 2px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                        }}
                        title="Retirer cet élève"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : null}

            {/* Barre de recherche d'élèves */}
            <div style={{ marginBottom: "0.5rem" }}>
              <input
                id="par-recherche-eleve"
                type="text"
                value={rechercheEleve}
                onChange={function (e) {
                  setRechercheEleve(e.target.value);
                }}
                placeholder="Rechercher un élève par nom ou matricule..."
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.85rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  backgroundColor: "#FFFFFF",
                }}
              />
            </div>

            {/* Grille scrollable de cases à cocher */}
            <div
              style={{
                maxHeight: "190px",
                overflowY: "auto",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                padding: "0.6rem",
                background: "#F8FAFC",
              }}
            >
              {elevesFiltres.length === 0 ? (
                <div style={{ textAlign: "center", color: "#64748B", padding: "1rem", fontSize: "0.85rem" }}>
                  Aucun élève ne correspond à votre recherche.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                    gap: "0.4rem",
                  }}
                >
                  {elevesFiltres.map(function (e) {
                    const estCoche = elevesChoisis.some(function (id) {
                      return Number(id) === Number(e.id);
                    });
                    const classeTxt = e.classe_nom ? " (" + e.classe_nom.split(" (")[0] + ")" : "";
                    return (
                      <label
                        key={e.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.4rem 0.55rem",
                          borderRadius: "4px",
                          background: estCoche ? "#EFF6FF" : "#FFFFFF",
                          border: estCoche ? "1px solid #93C5FD" : "1px solid #E2E8F0",
                          cursor: "pointer",
                          fontSize: "0.82rem",
                          userSelect: "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={estCoche}
                          onChange={function () {
                            basculerEleve(e.id);
                          }}
                          style={{
                            cursor: "pointer",
                            accentColor: "#1E3A8A",
                            width: "15px",
                            height: "15px",
                            margin: 0,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            color: estCoche ? "#1E3A8A" : "#334155",
                            fontWeight: estCoche ? 600 : 400,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {e.nom} {e.prenom}
                          <span style={{ color: "#64748B", fontSize: "0.78rem", marginLeft: "4px" }}>
                            {classeTxt}
                          </span>
                          {e.matricule ? (
                            <span style={{ color: "#94A3B8", fontSize: "0.72rem", marginLeft: "6px" }}>
                              [{e.matricule.toUpperCase()}]
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* BOUTONS D'ACTION */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="submit"
              style={{
                width: "auto",
                padding: "0.6rem 1.8rem",
                backgroundColor: "#1E3A8A",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              disabled={enCours}
            >
              {enCours ? (
                <span className="react-spinner"></span>
              ) : (
                idEnEdition ? "Enregistrer les modifications" : "Créer le compte"
              )}
            </button>
            {idEnEdition ? (
              <button
                type="button"
                className="mag-btn-lien"
                onClick={viderFormulaire}
                style={{ fontSize: "0.875rem", color: "#64748B", cursor: "pointer" }}
              >
                Annuler
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {/* SECTION LISTE DES PARENTS */}
      <div className="mag-section-entete" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
        <div className="mag-stat-label" style={{ fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>
          Liste des parents
        </div>
        <span className="mag-compteur-pill">{parents.length}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement des parents..." /> : null}
      {statut === "refuse" ? <Alerte type="erreur">Impossible de charger les parents.</Alerte> : null}
      {statut === "ok" ? (
        <div className="mag-table-wrap react-fade-in">
          <table className="mag-table mag-table-pro">
            <thead>
              <tr>
                <th>Parent</th>
                <th>Contact</th>
                <th>Profession</th>
                <th>Enfant(s) rattaché(s)</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {parents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}>
                    Aucun parent pour le moment.
                  </td>
                </tr>
              ) : (
                parents.map(function (p) {
                  const nomComplet = (p.first_name + " " + p.last_name).trim() || p.username;
                  const initiale = (p.first_name || p.username).charAt(0).toUpperCase();
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="mag-personne-cellule">
                          <span className="mag-avatar">{initiale}</span>
                          <div>
                            <div className="mag-personne-nom">{nomComplet}</div>
                            <div className="mag-personne-sous">{p.username}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          {p.telephone ? (
                            <div style={{ fontSize: "0.85rem", color: "#1E293B" }}>{p.telephone}</div>
                          ) : null}
                          {p.email ? (
                            <div style={{ fontSize: "0.78rem", color: "#64748B" }}>{p.email}</div>
                          ) : null}
                          {!p.telephone && !p.email ? (
                            <span style={{ color: "#94A3B8", fontSize: "0.85rem" }}>-</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        {p.profession ? (
                          <span style={{ fontSize: "0.85rem", color: "#334155" }}>{p.profession}</span>
                        ) : (
                          <span style={{ color: "#94A3B8", fontSize: "0.85rem" }}>-</span>
                        )}
                      </td>
                      <td>
                        {p.eleves_noms && p.eleves_noms.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                            {p.eleves_noms.map(function (n, i) {
                              return (
                                <span
                                  key={i}
                                  style={{
                                    display: "inline-block",
                                    background: "#F1F5F9",
                                    color: "#334155",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "4px",
                                    padding: "0.15rem 0.5rem",
                                    fontSize: "0.78rem",
                                    fontWeight: 500,
                                  }}
                                >
                                  {n}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: "#94A3B8", fontSize: "0.85rem" }}>Aucun enfant</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="mag-btn-lien"
                          style={{ marginRight: "0.5rem" }}
                          onClick={function () {
                            commencerEdition(p);
                          }}
                        >
                          Modifier
                        </button>
                        <BoutonSupprimer
                          onClick={function () {
                            supprimerParent(p);
                          }}
                        />
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
          titre="Supprimer le compte parent"
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
