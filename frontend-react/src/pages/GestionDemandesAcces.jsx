// src/pages/GestionDemandesAcces.jsx
// Gestion et validation des demandes d'accès (Administrateur uniquement)
import { useState, useEffect, useRef } from "react";
import { listerDemandesAcces, approuverDemandeAcces, refuserDemandeAcces } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";

function formaterDateFr(dateStr) {
  if (!dateStr) return "-";
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
    return dateStr;
  } catch {
    return dateStr;
  }
}

export default function GestionDemandesAcces({ token }) {
  const confirmation = useConfirmation();
  const motifRef = useRef(null);
  const [demandes, setDemandes] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [message, setMessage] = useState(null);
  const [enCoursId, setEnCoursId] = useState(null);

  const charger = function () {
    setStatut("chargement");
    listerDemandesAcces(token)
      .then(function (d) {
        setDemandes(Array.isArray(d) ? d : (d.results || []));
        setStatut("ok");
      })
      .catch(function () {
        setStatut("refuse");
      });
  };

  useEffect(charger, [token]);

  const approuver = async function (demande) {
    const ok = await confirmation.demander(
      `Approuver cette demande et créer le compte officiel de ${demande.username_souhaite} ?`,
      { titre: "Approuver la demande", texteConfirmer: "Approuver" }
    );
    if (!ok) return;
    setEnCoursId(demande.id);
    setMessage(null);
    try {
      await approuverDemandeAcces(token, demande.id);
      setMessage({ type: "succes", texte: `Compte créé avec succès pour ${demande.username_souhaite}.` });
      charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCoursId(null);
  };

  const refuser = async function (demande) {
    const ok = await confirmation.demander(
      "Cette demande sera refusée. Vous pouvez préciser un motif qui sera notifié au demandeur.",
      { titre: "Refuser la demande", texteConfirmer: "Refuser", danger: true, motif: true }
    );
    if (!ok) return;
    const motif = motifRef.current ? motifRef.current.value.trim() : "";
    setEnCoursId(demande.id);
    setMessage(null);
    try {
      await refuserDemandeAcces(token, demande.id, motif);
      setMessage({ type: "succes", texte: "La demande a été refusée." });
      charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCoursId(null);
  };

  const enAttente = demandes.filter(function (d) {
    return d.statut === "en_attente";
  });
  const traitees = demandes.filter(function (d) {
    return d.statut !== "en_attente";
  });

  return (
    <>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 className="mag-page-title" style={{ margin: 0, marginBottom: "0.35rem" }}>
          Demandes d'accès
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#64748B", margin: 0 }}>
          Validez ou refusez les demandes de création de compte soumises par les parents et enseignants.
        </p>
      </div>

      {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

      {statut === "chargement" ? <Spinner texte="Chargement des demandes..." /> : null}
      {statut === "refuse" ? <Alerte type="erreur">Impossible de charger les demandes d'accès.</Alerte> : null}

      {statut === "ok" ? (
        <>
          {/* SECTION 1 : DEMANDES EN ATTENTE */}
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
              En attente de validation
            </div>
            <span className="mag-compteur-pill">{enAttente.length}</span>
          </div>

          {enAttente.length === 0 ? (
            <div
              className="mag-card"
              style={{
                textAlign: "center",
                padding: "2.2rem",
                background: "#F8FAFC",
                border: "1px dashed #CBD5E1",
                color: "#64748B",
                borderRadius: "8px",
                marginBottom: "2rem",
              }}
            >
              Aucune demande en attente pour le moment.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "2.2rem" }}>
              {enAttente.map(function (demande) {
                const estEnseignant = demande.type_compte === "enseignant";
                const premiereLettre = (
                  (demande.first_name || "")[0] ||
                  (demande.last_name || "")[0] ||
                  demande.username_souhaite[0] ||
                  "U"
                ).toUpperCase();

                return (
                  <div
                    key={demande.id}
                    className="mag-card react-fade-in"
                    style={{
                      padding: "1.1rem 1.35rem",
                      borderRadius: "8px",
                      border: "1px solid #E2E8F0",
                      backgroundColor: "#FFFFFF",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "1.2rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flex: 1, minWidth: "280px" }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "50%",
                          backgroundColor: estEnseignant ? "#EFF6FF" : "#F5F3FF",
                          color: estEnseignant ? "#1E3A8A" : "#6D28D9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "1.05rem",
                          flexShrink: 0,
                        }}
                      >
                        {premiereLettre}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F172A" }}>
                            {demande.first_name} {demande.last_name}
                          </span>
                          <span style={{ fontSize: "0.82rem", color: "#64748B" }}>
                            ({demande.username_souhaite})
                          </span>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.15rem 0.55rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              backgroundColor: estEnseignant ? "#EFF6FF" : "#F5F3FF",
                              color: estEnseignant ? "#1E40AF" : "#6D28D9",
                              border: estEnseignant ? "1px solid #BFDBFE" : "1px solid #DDD6FE",
                            }}
                          >
                            {estEnseignant ? "Enseignant" : "Parent d'élève"}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "0.84rem",
                            color: "#475569",
                            marginTop: "0.35rem",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.8rem",
                          }}
                        >
                          <span><strong>Email :</strong> {demande.email || "Non renseigné"}</span>
                          <span>·</span>
                          <span><strong>Téléphone :</strong> {demande.telephone || "Non renseigné"}</span>
                        </div>
                        <div style={{ fontSize: "0.84rem", color: "#475569", marginTop: "0.2rem" }}>
                          {estEnseignant ? (
                            <span><strong>Spécialité :</strong> {demande.specialite || "Non précisée"}</span>
                          ) : (
                            <span>
                              <strong>Profession :</strong> {demande.profession || "Non précisée"}
                              {demande.matricules_enfants ? ` · Enfants : ${demande.matricules_enfants}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.6rem", flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={function () { approuver(demande); }}
                        disabled={enCoursId === demande.id}
                        style={{
                          backgroundColor: "#16A34A",
                          color: "#FFFFFF",
                          border: "none",
                          padding: "0.55rem 1.15rem",
                          borderRadius: "6px",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        Approuver
                      </button>
                      <button
                        type="button"
                        onClick={function () { refuser(demande); }}
                        disabled={enCoursId === demande.id}
                        style={{
                          backgroundColor: "#DC2626",
                          color: "#FFFFFF",
                          border: "none",
                          padding: "0.55rem 1.15rem",
                          borderRadius: "6px",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION 2 : HISTORIQUE DES DEMANDES TRAITÉES */}
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
              Historique des demandes traitées
            </div>
            <span className="mag-compteur-pill">{traitees.length}</span>
          </div>

          <div
            className="mag-table-wrap react-fade-in"
            style={{
              overflowX: "auto",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              backgroundColor: "#FFFFFF",
            }}
          >
            <table className="mag-table mag-table-pro" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>
                    Demandeur
                  </th>
                  <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
                    Rôle demandé
                  </th>
                  <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>
                    Coordonnées & Informations
                  </th>
                  <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
                    Date de demande
                  </th>
                  <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
                    Statut
                  </th>
                  <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
                    Traité par
                  </th>
                </tr>
              </thead>
              <tbody>
                {traitees.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "#64748B", padding: "2rem" }}>
                      Aucune demande traitée dans l'historique.
                    </td>
                  </tr>
                ) : (
                  traitees.map(function (demande) {
                    const estApprouvee = demande.statut === "approuvee";
                    const estEnseignant = demande.type_compte === "enseignant";
                    return (
                      <tr key={demande.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ fontWeight: 600, color: "#0F172A", fontSize: "0.875rem" }}>
                            {demande.first_name} {demande.last_name}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#64748B" }}>
                            {demande.username_souhaite}
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.15rem 0.55rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              backgroundColor: estEnseignant ? "#EFF6FF" : "#F5F3FF",
                              color: estEnseignant ? "#1E40AF" : "#6D28D9",
                              border: estEnseignant ? "1px solid #BFDBFE" : "1px solid #DDD6FE",
                            }}
                          >
                            {estEnseignant ? "Enseignant" : "Parent d'élève"}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.83rem", color: "#475569" }}>
                          <div>
                            {demande.email || "Email non renseigné"} · {demande.telephone || "Tél non renseigné"}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.15rem" }}>
                            {estEnseignant
                              ? `Spécialité : ${demande.specialite || "Non précisée"}`
                              : `Profession : ${demande.profession || "Non précisée"}${demande.matricules_enfants ? ` · Enfants : ${demande.matricules_enfants}` : ""}`}
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", fontSize: "0.83rem", color: "#334155" }}>
                          {formaterDateFr(demande.date_demande)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                          {estApprouvee ? (
                            <span
                              style={{
                                display: "inline-block",
                                background: "#F0FDF4",
                                color: "#15803D",
                                border: "1px solid #BBF7D0",
                                borderRadius: "4px",
                                padding: "0.2rem 0.6rem",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                              }}
                            >
                              Approuvée
                            </span>
                          ) : (
                            <div>
                              <span
                                style={{
                                display: "inline-block",
                                background: "#FEF2F2",
                                color: "#B91C1C",
                                border: "1px solid #FECACA",
                                borderRadius: "4px",
                                padding: "0.2rem 0.6rem",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                              }}
                            >
                              Refusée
                            </span>
                            {demande.motif_refus ? (
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#DC2626",
                                  marginTop: "0.25rem",
                                  maxWidth: "240px",
                                  whiteSpace: "normal",
                                  lineHeight: 1.3,
                                }}
                              >
                                Motif : {demande.motif_refus}
                              </div>
                            ) : null}
                          </div>
                        )}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", fontSize: "0.83rem", color: "#475569" }}>
                          {demande.traite_par_nom || "Direction"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {confirmation.demande ? (
        <ConfirmModal
          titre={confirmation.demande.titre}
          message={confirmation.demande.message}
          texteConfirmer={confirmation.demande.texteConfirmer}
          danger={confirmation.demande.danger}
          onConfirmer={confirmation.confirmer}
          onAnnuler={confirmation.annuler}
        >
          {confirmation.demande.motif ? (
            <div className="mag-field" style={{ marginBottom: "1.2rem" }}>
              <label htmlFor="refus-motif" style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>
                Motif du refus (optionnel)
              </label>
              <textarea
                id="refus-motif"
                ref={motifRef}
                rows={3}
                placeholder="Ex : Informations incomplètes, justificatif manquant, poste déjà pourvu..."
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  fontFamily: "inherit",
                  fontSize: "0.85rem",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ) : null}
        </ConfirmModal>
      ) : null}
    </>
  );
}
