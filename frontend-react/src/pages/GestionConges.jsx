// src/pages/GestionConges.jsx
// Demandes de congé du personnel. Un Administrateur ou un Enseignant peut
// demander un congé et suivre ses propres demandes. Un Administrateur voit
// toutes les demandes, mais ne peut pas traiter sa propre demande.
import { useState, useEffect, useMemo } from "react";
import { lister, creer, approuverConge, refuserConge } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import { Calendar, Clock, CheckCircle2, AlertCircle, UserCheck } from "lucide-react";

function formaterDateSimpleFr(dateStr) {
  if (!dateStr) return "";
  try {
    const parties = dateStr.split("T")[0].split("-");
    if (parties.length === 3) {
      const annee = parseInt(parties[0], 10);
      const mois = parseInt(parties[1], 10) - 1;
      const jour = parseInt(parties[2], 10);
      const d = new Date(annee, mois, jour);
      return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  } catch (e) {
    return dateStr;
  }
}

function formaterPeriode(dateDebut, dateFin) {
  if (!dateDebut && !dateFin) return "-";
  if (!dateFin || dateDebut === dateFin) return formaterDateSimpleFr(dateDebut);
  return `${formaterDateSimpleFr(dateDebut)} au ${formaterDateSimpleFr(dateFin)}`;
}

export default function GestionConges({ token, role }) {
  const estAdmin = role === "administrateur";
  const [demandes, setDemandes] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [idEnCoursTraitement, setIdEnCoursTraitement] = useState(null);

  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [motif, setMotif] = useState("");

  const chargerTout = function () {
    setStatut("chargement");
    lister("conges", token)
      .then(function (donnees) {
        setDemandes(Array.isArray(donnees) ? donnees : []);
        setStatut("ok");
      })
      .catch(function () {
        setStatut("refuse");
      });
  };

  useEffect(chargerTout, [token]);

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      await creer("conges", token, {
        date_debut: dateDebut,
        date_fin: dateFin,
        motif: motif,
      });
      setMessage({ type: "succes", texte: "Votre demande de congé a été envoyée avec succès." });
      setDateDebut("");
      setDateFin("");
      setMotif("");
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message || "Erreur lors de l'envoi de la demande." });
    }
    setEnCours(false);
  };

  const traiter = async function (demande, action) {
    setIdEnCoursTraitement(demande.id);
    try {
      if (action === "approuver") {
        await approuverConge(token, demande.id);
        setMessage({ type: "succes", texte: "Demande de congé approuvée." });
      } else {
        await refuserConge(token, demande.id);
        setMessage({ type: "succes", texte: "Demande de congé refusée." });
      }
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message || "Erreur lors du traitement de la demande." });
    }
    setIdEnCoursTraitement(null);
  };

  const enAttente = useMemo(() => {
    return demandes.filter(function (d) {
      return d.statut === "en_attente";
    });
  }, [demandes]);

  const traitees = useMemo(() => {
    return demandes.filter(function (d) {
      return d.statut !== "en_attente";
    });
  }, [demandes]);

  // Statistiques pour le panneau de synthèse
  const statsConges = useMemo(() => {
    const aujourdhui = new Date().toISOString().split("T")[0];
    const approuvees = demandes.filter(function (d) {
      return d.statut === "approuvee";
    }).length;
    const enConge = demandes.filter(function (d) {
      return d.statut === "approuvee" && d.date_debut <= aujourdhui && d.date_fin >= aujourdhui;
    }).length;

    return {
      enAttente: enAttente.length,
      approuvees: approuvees,
      enConge: enConge,
    };
  }, [demandes, enAttente]);

  return (
    <>
      <div className="mag-page-title-ligne">
        <div className="mag-page-title">
          <h1>Congés</h1>
        </div>
      </div>

      {/* GRILLE ÉQUILIBRÉE EN 2 COLONNES (COL-SPAN-7 / COL-SPAN-5) */}
      <div className="mag-conges-grid react-fade-in">
        {/* CARTE GAUCHE : DEMANDER UN CONGÉ (col-span-7) */}
        <div
          className="mag-panneau-form"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
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
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Calendar size={18} color="#1E3A8A" />
              <span>Demander un congé</span>
            </div>

            {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

            <form onSubmit={soumettre}>
              <div className="mag-grid-2" style={{ marginBottom: "1rem" }}>
                <div className="mag-field" style={{ margin: 0 }}>
                  <label
                    htmlFor="conge-debut"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Date de début
                  </label>
                  <input
                    id="conge-debut"
                    type="date"
                    value={dateDebut}
                    onChange={function (e) {
                      setDateDebut(e.target.value);
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      backgroundColor: "#FFFFFF",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                <div className="mag-field" style={{ margin: 0 }}>
                  <label
                    htmlFor="conge-fin"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: "0.35rem",
                      display: "block",
                    }}
                  >
                    Date de fin
                  </label>
                  <input
                    id="conge-fin"
                    type="date"
                    value={dateFin}
                    onChange={function (e) {
                      setDateFin(e.target.value);
                    }}
                    required
                    min={dateDebut || undefined}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      backgroundColor: "#FFFFFF",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
              </div>

              <div className="mag-field" style={{ marginBottom: "1.2rem" }}>
                <label
                  htmlFor="conge-motif"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                    display: "block",
                  }}
                >
                  Motif
                </label>
                <textarea
                  id="conge-motif"
                  rows={3}
                  value={motif}
                  onChange={function (e) {
                    setMotif(e.target.value);
                  }}
                  placeholder="Motif de l'absence..."
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.75rem",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    fontFamily: "inherit",
                    fontSize: "0.85rem",
                    backgroundColor: "#FFFFFF",
                    resize: "vertical",
                  }}
                />
              </div>

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
                {enCours ? <span className="react-spinner"></span> : "Envoyer la demande"}
              </button>
            </form>
          </div>
        </div>

        {/* CARTE DROITE : SYNTHÈSE DES CONGÉS (col-span-5) */}
        <div
          className="mag-panneau-form"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
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
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Clock size={18} color="#1E3A8A" />
              <span>Synthèse des congés</span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              {/* Demandes en attente */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  background: statsConges.enAttente > 0 ? "#FFFBEB" : "#F8FAFC",
                  border: statsConges.enAttente > 0 ? "1px solid #FDE68A" : "1px solid #E2E8F0",
                  borderRadius: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <AlertCircle size={17} color={statsConges.enAttente > 0 ? "#D97706" : "#64748B"} />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1E293B" }}>
                      Demandes en attente
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                      À traiter par la direction
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: statsConges.enAttente > 0 ? "#B45309" : "#64748B",
                  }}
                >
                  {statsConges.enAttente}
                </span>
              </div>

              {/* Demandes approuvées ce trimestre */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <CheckCircle2 size={17} color="#16A34A" />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1E293B" }}>
                      Demandes approuvées ce trimestre
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#15803D" }}>
                      Validées et enregistrées
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#15803D" }}>
                  {statsConges.approuvees}
                </span>
              </div>

              {/* Personnel actuellement en congé */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <UserCheck size={17} color="#2563EB" />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1E293B" }}>
                      Personnel actuellement en congé
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#1D4ED8" }}>
                      En cours d'absence autorisée
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1D4ED8" }}>
                  {statsConges.enConge}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION TABLEAUX */}
      <div
        className="mag-section-entete"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.8rem",
        }}
      >
        <div className="mag-stat-label" style={{ fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>
          {estAdmin ? "Demandes en attente (tout le personnel)" : "Mes demandes en attente"}
        </div>
        <span className="mag-compteur-pill">{enAttente.length}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement des congés..." /> : null}
      {statut === "refuse" ? <Alerte type="erreur">Impossible de charger les demandes de congé.</Alerte> : null}
      {statut === "ok" ? (
        <>
          {/* TABLEAU 1 : DEMANDES EN ATTENTE */}
          <div className="mag-table-wrap react-fade-in" style={{ marginBottom: "2rem", overflowX: "auto" }}>
            <table className="mag-table mag-table-pro">
              <thead>
                <tr>
                  {estAdmin ? <th>Demandeur</th> : null}
                  <th style={{ whiteSpace: "nowrap" }}>Période</th>
                  <th>Motif</th>
                  <th style={{ whiteSpace: "nowrap" }}>Statut</th>
                  {estAdmin ? <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {enAttente.length === 0 ? (
                  <tr>
                    <td
                      colSpan={estAdmin ? 5 : 3}
                      style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}
                    >
                      Aucune demande de congé en attente.
                    </td>
                  </tr>
                ) : (
                  enAttente.map(function (d) {
                    return (
                      <tr key={d.id}>
                        {estAdmin ? (
                          <td style={{ fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>
                            {d.demandeur_nom}
                          </td>
                        ) : null}
                        <td style={{ whiteSpace: "nowrap", fontWeight: 500, color: "#334155" }}>
                          {formaterPeriode(d.date_debut, d.date_fin)}
                        </td>
                        <td style={{ color: "#475569" }}>{d.motif}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              display: "inline-block",
                              background: "#FFFBEB",
                              color: "#B45309",
                              border: "1px solid #FDE68A",
                              borderRadius: "4px",
                              padding: "0.2rem 0.6rem",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            En attente
                          </span>
                        </td>
                        {estAdmin && d.peut_traiter ? (
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              className="mag-btn-lien"
                              style={{ color: "#16A34A", fontWeight: 600, marginRight: "0.75rem" }}
                              disabled={idEnCoursTraitement === d.id}
                              onClick={function () {
                                traiter(d, "approuver");
                              }}
                            >
                              Approuver
                            </button>
                            <button
                              type="button"
                              className="mag-btn-lien"
                              style={{ color: "#DC2626", fontWeight: 600 }}
                              disabled={idEnCoursTraitement === d.id}
                              onClick={function () {
                                traiter(d, "refuser");
                              }}
                            >
                              Refuser
                            </button>
                          </td>
                        ) : estAdmin ? (
                          <td
                            style={{
                              textAlign: "right",
                              color: "#64748B",
                              fontSize: "0.82rem",
                              fontStyle: "italic",
                              whiteSpace: "nowrap",
                            }}
                          >
                            À traiter par un autre administrateur
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TABLEAU 2 : HISTORIQUE TRAITÉ */}
          {traitees.length > 0 ? (
            <>
              <div
                className="mag-section-entete"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.8rem",
                }}
              >
                <div className="mag-stat-label" style={{ fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>
                  Historique traité
                </div>
                <span className="mag-compteur-pill">{traitees.length}</span>
              </div>

              <div className="mag-table-wrap react-fade-in" style={{ overflowX: "auto" }}>
                <table className="mag-table mag-table-pro">
                  <thead>
                    <tr>
                      {estAdmin ? <th>Demandeur</th> : null}
                      <th style={{ whiteSpace: "nowrap" }}>Période</th>
                      <th>Motif</th>
                      <th style={{ whiteSpace: "nowrap" }}>Statut</th>
                      <th style={{ whiteSpace: "nowrap" }}>Traité par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traitees.map(function (d) {
                      const estApprouve = d.statut === "approuvee";
                      return (
                        <tr key={d.id}>
                          {estAdmin ? (
                            <td style={{ fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>
                              {d.demandeur_nom}
                            </td>
                          ) : null}
                          <td style={{ whiteSpace: "nowrap", fontWeight: 500, color: "#334155" }}>
                            {formaterPeriode(d.date_debut, d.date_fin)}
                          </td>
                          <td style={{ color: "#475569" }}>{d.motif}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <span
                              style={{
                                display: "inline-block",
                                background: estApprouve ? "#DCFCE7" : "#FEF2F2",
                                color: estApprouve ? "#166534" : "#991B1B",
                                border: estApprouve ? "1px solid #BBF7D0" : "1px solid #FECACA",
                                borderRadius: "4px",
                                padding: "0.2rem 0.6rem",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {estApprouve ? "Approuvée" : "Refusée"}
                            </span>
                          </td>
                          <td style={{ whiteSpace: "nowrap", color: "#334155" }}>
                            {d.traite_par_nom || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}
