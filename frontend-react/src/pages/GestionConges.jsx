// src/pages/GestionConges.jsx
// Demandes de conge du personnel. Un Administrateur ou un Enseignant peut
// demander un conge et suivre ses propres demandes. Un Administrateur voit
// toutes les demandes, mais ne peut pas traiter sa propre demande.
import { useState, useEffect } from "react";
import { lister, creer, approuverConge, refuserConge } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import { traduireTexte } from "../localisation.js";

const LABEL_STATUT = { en_attente: "En attente", approuvee: "Approuvee", refusee: "Refusee" };
const CLASSE_STATUT = { en_attente: "mag-badge", approuvee: "mag-badge-succes", refusee: "mag-badge-erreur" };

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
      .then(function (donnees) { setDemandes(donnees); setStatut("ok"); })
      .catch(function () { setStatut("refuse"); });
  };

  useEffect(chargerTout, [token]);

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      await creer("conges", token, { date_debut: dateDebut, date_fin: dateFin, motif: motif });
      setMessage({ type: "succes", texte: "Votre demande de conge a ete envoyee." });
      setDateDebut(""); setDateFin(""); setMotif("");
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const traiter = async function (demande, action) {
    setIdEnCoursTraitement(demande.id);
    try {
      if (action === "approuver") await approuverConge(token, demande.id);
      else await refuserConge(token, demande.id);
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setIdEnCoursTraitement(null);
  };

  const enAttente = demandes.filter(function (d) { return d.statut === "en_attente"; });
  const traitees = demandes.filter(function (d) { return d.statut !== "en_attente"; });

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Personnel</span> Conges</div>

      <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.8rem", maxWidth: "680px" }}>
        <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>Demander un conge</div>
        {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
        <form onSubmit={soumettre}>
          <div className="mag-grid-2">
            <div className="mag-field">
              <label className="mag-label-requis" htmlFor="conge-debut">Date de debut</label>
              <input id="conge-debut" type="date" value={dateDebut} onChange={function (e) { setDateDebut(e.target.value); }} required />
            </div>
            <div className="mag-field">
              <label className="mag-label-requis" htmlFor="conge-fin">Date de fin</label>
              <input id="conge-fin" type="date" value={dateFin} onChange={function (e) { setDateFin(e.target.value); }} required min={dateDebut || undefined} />
            </div>
          </div>
          <div className="mag-field">
            <label className="mag-label-requis" htmlFor="conge-motif">Motif</label>
            <textarea id="conge-motif" rows={3} value={motif} onChange={function (e) { setMotif(e.target.value); }} required style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px", fontFamily: "inherit" }} />
          </div>
          <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.8rem" }} disabled={enCours}>
            {enCours ? <span className="react-spinner"></span> : "Envoyer la demande"}
          </button>
        </form>
      </div>

      <div className="mag-section-entete">
        <div className="mag-stat-label">{estAdmin ? "Demandes en attente (tout le personnel)" : "Mes demandes en attente"}</div>
        <span className="mag-compteur-pill">{enAttente.length}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les demandes de conge.</Alerte> : null}
      {statut === "ok" ? (
        <>
          <div className="mag-table-wrap react-fade-in" style={{ marginBottom: "2rem" }}>
            <table className="mag-table mag-table-pro">
              <thead>
                <tr>
                  {estAdmin ? <th>Demandeur</th> : null}
                  <th>Periode</th><th>Motif</th><th>Statut</th>
                  {estAdmin ? <th></th> : null}
                </tr>
              </thead>
              <tbody>
                {enAttente.length === 0 ? (
                  <tr><td colSpan={estAdmin ? 5 : 3} style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}>Aucune demande en attente.</td></tr>
                ) : enAttente.map(function (d) {
                  return (
                    <tr key={d.id}>
                      {estAdmin ? <td style={{ fontWeight: 600 }}>{d.demandeur_nom}</td> : null}
                      <td>{d.date_debut} → {d.date_fin}</td>
                      <td style={{ color: "var(--ink-600)" }}>{d.motif}</td>
                      <td><span className={CLASSE_STATUT[d.statut]}>{traduireTexte(LABEL_STATUT[d.statut])}</span></td>
                      {estAdmin && d.peut_traiter ? (
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button type="button" className="mag-btn-lien" disabled={idEnCoursTraitement === d.id} onClick={function () { traiter(d, "approuver"); }}>Approuver</button>
                          <button type="button" className="mag-btn-lien" style={{ color: "var(--red-600)" }} disabled={idEnCoursTraitement === d.id} onClick={function () { traiter(d, "refuser"); }}>Refuser</button>
                        </td>
                      ) : estAdmin ? (
                        <td style={{ color: "var(--ink-600)", fontSize: "0.85rem" }}>A traiter par un autre administrateur</td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {traitees.length > 0 ? (
            <>
              <div className="mag-section-entete">
                <div className="mag-stat-label">Historique traite</div>
                <span className="mag-compteur-pill">{traitees.length}</span>
              </div>
              <div className="mag-table-wrap">
                <table className="mag-table mag-table-pro">
                  <thead>
                    <tr>
                      {estAdmin ? <th>Demandeur</th> : null}
                      <th>Periode</th><th>Motif</th><th>Statut</th><th>Traite par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traitees.map(function (d) {
                      return (
                        <tr key={d.id}>
                          {estAdmin ? <td style={{ fontWeight: 600 }}>{d.demandeur_nom}</td> : null}
                          <td>{d.date_debut} → {d.date_fin}</td>
                          <td style={{ color: "var(--ink-600)" }}>{d.motif}</td>
                          <td><span className={CLASSE_STATUT[d.statut]}>{traduireTexte(LABEL_STATUT[d.statut])}</span></td>
                          <td>{d.traite_par_nom || "-"}</td>
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
