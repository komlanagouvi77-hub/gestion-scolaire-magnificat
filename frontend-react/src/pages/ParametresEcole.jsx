// src/pages/ParametresEcole.jsx
import { useState, useEffect } from "react";
import { obtenirParametres, modifierParametres } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import { Building2, GraduationCap } from "lucide-react";

export default function ParametresEcole({ token, onEnregistre }) {
  const [donnees, setDonnees] = useState(null);
  const [statut, setStatut] = useState("chargement");
  const [message, setMessage] = useState(null);
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);

  useEffect(function () {
    obtenirParametres(token)
      .then(function (d) {
        setDonnees(d);
        setStatut("ok");
      })
      .catch(function () {
        setStatut("refuse");
      });
  }, [token]);

  const modifierChamp = function (champ, valeur) {
    const copie = Object.assign({}, donnees);
    copie[champ] = valeur;
    setDonnees(copie);
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnregistrementEnCours(true);
    try {
      const majoree = await modifierParametres(token, {
        nom_ecole: donnees.nom_ecole,
        adresse: donnees.adresse,
        telephone: donnees.telephone,
        email: donnees.email,
        annee_scolaire_active: donnees.annee_scolaire_active,
        systeme_periodes: donnees.systeme_periodes,
        notes_verrouillees_t1: donnees.notes_verrouillees_t1,
        notes_verrouillees_t2: donnees.notes_verrouillees_t2,
        notes_verrouillees_t3: donnees.notes_verrouillees_t3,
      });
      setDonnees(majoree);
      setMessage({ type: "succes", texte: "Configuration enregistrée avec succès." });
      if (onEnregistre) onEnregistre(majoree);
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message || "Erreur lors de l'enregistrement de la configuration." });
    }
    setEnregistrementEnCours(false);
  };

  return (
    <>
      <div className="mag-page-title-ligne">
        <div className="mag-page-title">
          <h1>Paramètres de l'établissement</h1>
        </div>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement de la configuration..." /> : null}
      {statut === "refuse" ? <Alerte type="erreur">Impossible de charger la configuration.</Alerte> : null}

      {statut === "ok" && donnees ? (
        <form onSubmit={soumettre} style={{ outline: "none" }}>
          {message ? (
            <div style={{ marginBottom: "1.25rem" }}>
              <Alerte type={message.type}>{message.texte}</Alerte>
            </div>
          ) : null}

          {/* GRILLE ÉQUILIBRÉE EN 2 COLONNES (50% / 50%) */}
          <div className="mag-grid-2col-equal react-fade-in" style={{ outline: "none" }}>
            {/* COLONNE DE GAUCHE (50%) : CARTE IDENTITÉ & COORDONNÉES */}
            <div
              className="mag-panneau-form"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                outline: "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "#0F172A",
                    marginBottom: "1.2rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Building2 size={18} color="#1E3A8A" />
                  <span>Identité & Coordonnées</span>
                </div>

                <div className="mag-field" style={{ marginBottom: "1rem" }}>
                  <label
                    htmlFor="param-nom-ecole"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Nom de l'école
                  </label>
                  <input
                    id="param-nom-ecole"
                    type="text"
                    value={donnees.nom_ecole || ""}
                    onChange={function (e) {
                      modifierChamp("nom_ecole", e.target.value);
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                </div>

                <div className="mag-field" style={{ marginBottom: "1rem" }}>
                  <label
                    htmlFor="param-adresse"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Adresse
                  </label>
                  <input
                    id="param-adresse"
                    type="text"
                    value={donnees.adresse || ""}
                    onChange={function (e) {
                      modifierChamp("adresse", e.target.value);
                    }}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                </div>

                <div className="mag-field" style={{ marginBottom: "1rem" }}>
                  <label
                    htmlFor="param-telephone"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Téléphone
                  </label>
                  <input
                    id="param-telephone"
                    type="text"
                    value={donnees.telephone || ""}
                    onChange={function (e) {
                      modifierChamp("telephone", e.target.value);
                    }}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                </div>

                <div className="mag-field" style={{ marginBottom: "1.2rem" }}>
                  <label
                    htmlFor="param-email"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Email
                  </label>
                  <input
                    id="param-email"
                    type="email"
                    value={donnees.email || ""}
                    onChange={function (e) {
                      modifierChamp("email", e.target.value);
                    }}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  background: "#F8FAFC",
                  borderRadius: "6px",
                  border: "1px solid #E2E8F0",
                  fontSize: "0.78rem",
                  color: "#64748B",
                  lineHeight: 1.4,
                }}
              >
                Le logo officiel et les armoiries de l'établissement sont configurables via l'administration technique (/admin/).
              </div>
            </div>

            {/* COLONNE DE DROITE (50%) : CARTE CONFIGURATION ACADÉMIQUE */}
            <div
              className="mag-panneau-form"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                outline: "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "#0F172A",
                    marginBottom: "1.2rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <GraduationCap size={18} color="#1E3A8A" />
                  <span>Configuration académique</span>
                </div>

                <div className="mag-field" style={{ marginBottom: "1rem" }}>
                  <label
                    htmlFor="param-annee"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Année scolaire active
                  </label>
                  <input
                    id="param-annee"
                    type="text"
                    value={donnees.annee_scolaire_active || ""}
                    onChange={function (e) {
                      modifierChamp("annee_scolaire_active", e.target.value);
                    }}
                    placeholder="Ex: 2026-2027"
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                </div>

                <div className="mag-field" style={{ marginBottom: "1.25rem" }}>
                  <label
                    htmlFor="param-systeme"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Système de périodes
                  </label>
                  <select
                    id="param-systeme"
                    value={donnees.systeme_periodes || "trimestre"}
                    onChange={function (e) {
                      modifierChamp("systeme_periodes", e.target.value);
                    }}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    <option value="trimestre">Trimestres (3 périodes)</option>
                    <option value="semestre">Semestres (2 périodes)</option>
                  </select>
                </div>

                {/* VERROUILLAGE DES PÉRIODES */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <label
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: "0.5rem",
                      display: "block",
                      lineHeight: 1.4,
                    }}
                  >
                    Verrouillage des périodes (empêche toute modification de notes par les enseignants)
                  </label>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {[
                      { id: "verrou1", champ: "notes_verrouillees_t1", label: "1er trimestre verrouillé" },
                      { id: "verrou2", champ: "notes_verrouillees_t2", label: "2e trimestre verrouillé" },
                      { id: "verrou3", champ: "notes_verrouillees_t3", label: "3e trimestre verrouillé" },
                    ].map(function (item) {
                      const estVerrouille = !!donnees[item.champ];
                      return (
                        <label
                          key={item.id}
                          htmlFor={item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            padding: "0.6rem 0.85rem",
                            borderRadius: "6px",
                            background: estVerrouille ? "#FEF2F2" : "#F8FAFC",
                            border: estVerrouille ? "1px solid #FECACA" : "1px solid #E2E8F0",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            fontWeight: estVerrouille ? 600 : 400,
                            color: estVerrouille ? "#991B1B" : "#334155",
                            userSelect: "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <input
                            type="checkbox"
                            id={item.id}
                            checked={estVerrouille}
                            onChange={function (e) {
                              modifierChamp(item.champ, e.target.checked);
                            }}
                            style={{
                              cursor: "pointer",
                              accentColor: "#1E3A8A",
                              width: "16px",
                              height: "16px",
                              margin: 0,
                            }}
                          />
                          <span>{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* BOUTON D'ENREGISTREMENT BLEU MARINE (#1E3A8A) */}
              <div style={{ marginTop: "1rem" }}>
                <button
                  type="submit"
                  style={{
                    width: "auto",
                    padding: "0.65rem 1.8rem",
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
                  disabled={enregistrementEnCours}
                >
                  {enregistrementEnCours ? (
                    <span className="react-spinner"></span>
                  ) : (
                    "Enregistrer les paramètres"
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : null}
    </>
  );
}
