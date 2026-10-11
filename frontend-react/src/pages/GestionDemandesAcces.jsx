// src/pages/GestionDemandesAcces.jsx
// Liste des demandes d'acces en attente (Administrateur uniquement),
// avec approbation (cree reellement le compte) ou refus.
import { useState, useEffect, useRef } from "react";
import { listerDemandesAcces, approuverDemandeAcces, refuserDemandeAcces } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import { traduireTexte } from "../localisation.js";

const LIBELLES_TYPE = { enseignant: "Enseignant", parent: "Parent" };

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
      .then(function (d) { setDemandes(d.results || d); setStatut("ok"); })
      .catch(function () { setStatut("refuse"); });
  };

  useEffect(charger, [token]);

  const approuver = async function (demande) {
    const ok = await confirmation.demander(
      "Approuver cette demande et creer le compte de " + demande.username_souhaite + " ?",
      { titre: "Approuver la demande", texteConfirmer: "Approuver" }
    );
    if (!ok) return;
    setEnCoursId(demande.id);
    setMessage(null);
    try {
      await approuverDemandeAcces(token, demande.id);
      setMessage({ type: "succes", texte: "Compte cree pour " + demande.username_souhaite + "." });
      charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCoursId(null);
  };

  const refuser = async function (demande) {
    const ok = await confirmation.demander(
      "Cette demande sera refusee. Vous pouvez preciser un motif (visible par le demandeur).",
      { titre: "Refuser la demande", texteConfirmer: "Refuser", danger: true, motif: true }
    );
    if (!ok) return;
    const motif = motifRef.current ? motifRef.current.value.trim() : "";
    setEnCoursId(demande.id);
    setMessage(null);
    try {
      await refuserDemandeAcces(token, demande.id, motif);
      setMessage({ type: "succes", texte: "Demande refusee." });
      charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCoursId(null);
  };

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Administration</span> Demandes d'acces</div>

      {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

      <div className="mag-section-entete">
        <div className="mag-stat-label">En attente de validation</div>
        <span className="mag-compteur-pill">{demandes.length}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les demandes.</Alerte> : null}
      {statut === "ok" ? (
        demandes.length === 0 ? (
          <div className="mag-card" style={{ textAlign: "center", padding: "2.5rem", border: "1px dashed var(--line)", color: "var(--ink-600)" }}>
            Aucune demande en attente pour le moment.
          </div>
        ) : (
          demandes.map(function (demande) {
            return (
              <div className="mag-card react-fade-in" style={{ marginBottom: "1rem" }} key={demande.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <div className="mag-personne-cellule" style={{ marginBottom: "0.6rem" }}>
                      <span className="mag-avatar">{(demande.first_name || demande.username_souhaite).charAt(0).toUpperCase()}</span>
                      <div>
                        <div className="mag-personne-nom">{demande.first_name} {demande.last_name}</div>
                        <div className="mag-personne-sous">{demande.username_souhaite} — <span className="mag-badge">{traduireTexte(LIBELLES_TYPE[demande.type_compte])}</span></div>
                      </div>
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "var(--ink-600)", margin: "0.2rem 0" }}>
                      Email : {demande.email || "-"} · Telephone : {demande.telephone || "-"}
                    </p>
                    {demande.type_compte === "enseignant" ? (
                      <p style={{ fontSize: "0.85rem", color: "var(--ink-600)", margin: "0.2rem 0" }}>Specialite : {demande.specialite || "-"}</p>
                    ) : (
                      <p style={{ fontSize: "0.85rem", color: "var(--ink-600)", margin: "0.2rem 0" }}>
                        Profession : {demande.profession || "-"} · Enfants declares : {demande.matricules_enfants || "-"}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.6rem", flexShrink: 0 }}>
                    <button
                      type="button" onClick={function () { approuver(demande); }} disabled={enCoursId === demande.id}
                      style={{ background: "var(--green-600)", color: "#fff", border: "none", padding: "0.5rem 1.1rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Approuver
                    </button>
                    <button
                      type="button" onClick={function () { refuser(demande); }} disabled={enCoursId === demande.id}
                      style={{ background: "var(--red-600)", color: "#fff", border: "none", padding: "0.5rem 1.1rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )
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
              <label htmlFor="refus-motif">Motif (optionnel)</label>
              <textarea
                id="refus-motif"
                ref={motifRef}
                rows={3}
                placeholder="Ex : informations incompletes, compte deja existant..."
                style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "6px", fontFamily: "inherit", fontSize: "0.85rem", resize: "vertical" }}
              />
            </div>
          ) : null}
        </ConfirmModal>
      ) : null}
    </>
  );
}
