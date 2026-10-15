// src/pages/FicheEleve.jsx
// Fiche detaillee d'un eleve : notes par matiere/trimestre, absences,
// bulletins et observations comportementales, reunis en une seule page.
// Accessible a l'Administrateur, a l'Enseignant de la classe de l'eleve,
// et au Parent de cet eleve (qui ne voit pas les observations non
// visibles). Seul un Enseignant de la classe (ou l'Administrateur) peut
// ajouter une observation.
import { useState, useEffect } from "react";
import { lister, creer } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import { telechargerFichierProtege } from "../telecharger.js";
import { traduireTexte, localeActive } from "../localisation.js";

const LABEL_TYPE_OBS = { positive: "Positive", negative: "Negative", neutre: "Neutre" };
const CLASSE_TYPE_OBS = { positive: "mag-badge-succes", negative: "mag-badge-erreur", neutre: "mag-badge" };

export default function FicheEleve({ eleveId, token, role }) {
  const peutAjouterObservation = role === "administrateur" || role === "enseignant";

  const [statut, setStatut] = useState("chargement");
  const [eleve, setEleve] = useState(null);
  const [notes, setNotes] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [observations, setObservations] = useState([]);
  const [message, setMessage] = useState(null);

  const [contenuObs, setContenuObs] = useState("");
  const [typeObs, setTypeObs] = useState("neutre");
  const [visibleParent, setVisibleParent] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [enCoursTelechargement, setEnCoursTelechargement] = useState(null);

  // Un simple <a href={bulletin.fichier_pdf}> ne fonctionne pas : cette URL
  // pointe vers un endpoint protege (/api/bulletins/<id>/telecharger/) qui
  // exige l'en-tete Authorization, jamais envoye par une navigation directe
  // de lien - le clic aboutissait donc systematiquement a une erreur 401,
  // invisible pour l'utilisateur. On recupere le fichier via fetch (avec le
  // jeton) puis on declenche le telechargement depuis le blob obtenu.
  const telechargerBulletin = async function (bulletin) {
    setEnCoursTelechargement(bulletin.id);
    try {
      const urlTelechargement = bulletin.fichier_pdf || ("/api/bulletins/" + bulletin.id + "/telecharger/");
      const nomFichier = "bulletin_" + (eleve ? (eleve.nom + "_" + eleve.prenom).replace(/[^a-zA-Z0-9_-]/g, "_") : "eleve") + "_T" + bulletin.trimestre + ".pdf";
      await telechargerFichierProtege(urlTelechargement, token, nomFichier);
      setMessage({ type: "succes", texte: "Bulletin telecharge avec succes." });
    } catch (err) {
      console.error("Erreur de telechargement bulletin:", err);
      setMessage({ type: "erreur", texte: "Impossible de telecharger ce bulletin : " + (err.message || "") });
    }
    setEnCoursTelechargement(null);
  };

  const chargerTout = function () {
    setStatut("chargement");
    Promise.all([
      lister("eleves", token), lister("notes", token), lister("absences", token),
      lister("bulletins", token), lister("observations", token),
    ]).then(function (resultats) {
      const [tousEleves, toutesNotes, toutesAbsences, tousBulletins, toutesObs] = resultats;
      const e = tousEleves.find(function (el) { return String(el.id) === String(eleveId); });
      setEleve(e || null);
      setNotes(toutesNotes.filter(function (n) { return String(n.eleve) === String(eleveId); }));
      setAbsences(toutesAbsences.filter(function (a) { return String(a.eleve) === String(eleveId); }));
      setBulletins(tousBulletins.filter(function (b) { return String(b.eleve) === String(eleveId); }));
      setObservations(toutesObs.filter(function (o) { return String(o.eleve) === String(eleveId); }));
      setStatut(e ? "ok" : "introuvable");
    }).catch(function () { setStatut("refuse"); });
  };

  useEffect(chargerTout, [token, eleveId]);

  const ajouterObservation = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      await creer("observations", token, {
        eleve: Number(eleveId), type_observation: typeObs, contenu: contenuObs, visible_parent: visibleParent,
      });
      setContenuObs(""); setTypeObs("neutre"); setVisibleParent(true);
      setMessage({ type: "succes", texte: "Observation enregistree." });
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  if (statut === "chargement") return <Spinner texte="Chargement de la fiche eleve..." />;
  if (statut === "refuse" || statut === "introuvable") {
    return <Alerte>Impossible d'afficher cette fiche eleve.</Alerte>;
  }

  const nbAbsencesNonJustifiees = absences.filter(function (a) { return !a.justifiee; }).length;

  return (
    <>
      <div className="mag-page-title">
        <span className="eyebrow">Registre</span> {eleve.nom} {eleve.prenom}
      </div>

      {message && !peutAjouterObservation ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

      <div className="mag-panneau-form" style={{ marginBottom: "1.8rem" }}>
        <div className="mag-grid-4-auto">
          <div><div className="mag-stat-label">Matricule</div><div style={{ fontWeight: 600 }}>{eleve.matricule}</div></div>
          <div><div className="mag-stat-label">Classe</div><div style={{ fontWeight: 600 }}>{eleve.classe_nom || "-"}</div></div>
          <div><div className="mag-stat-label">Sexe</div><div style={{ fontWeight: 600 }}>{eleve.sexe === "F" ? "Feminin" : "Masculin"}</div></div>
          <div><div className="mag-stat-label">Absences non justifiees</div><div style={{ fontWeight: 600, color: nbAbsencesNonJustifiees > 0 ? "var(--red-600)" : undefined }}>{nbAbsencesNonJustifiees}</div></div>
        </div>
      </div>

      {eleve.parents_details && eleve.parents_details.length > 0 ? (
        <div className="mag-card react-fade-in" style={{ marginBottom: "1.8rem" }}>
          <div className="mag-stat-label" style={{ marginBottom: "0.8rem" }}>Parents / Contacts d'urgence</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            {eleve.parents_details.map(function (p) {
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.8rem", padding: "0.6rem 1rem", border: "1px solid var(--line)", borderRadius: "8px", background: "var(--card-bg, #fff)" }}>
                  <span className="mag-avatar" style={{ width: "32px", height: "32px", fontSize: "0.85rem" }}>
                    {(p.nom || "?").charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.nom}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-600)" }}>{p.telephone || "Aucun numero"}</div>
                  </div>
                  {p.telephone ? (
                    <a
                      href={"https://wa.me/" + p.telephone.replace(/[^0-9]/g, "")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-mag-outline"
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.2rem 0.6rem",
                        color: "#16A34A",
                        borderColor: "#16A34A",
                        textDecoration: "none",
                        borderRadius: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        marginLeft: "0.5rem",
                      }}
                      title="Contacter sur WhatsApp"
                    >
                      <span>💬</span> WhatsApp
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mag-section-entete"><div className="mag-stat-label">Notes</div><span className="mag-compteur-pill">{notes.length}</span></div>
      <div className="mag-table-wrap" style={{ marginBottom: "2rem" }}>
        <table className="mag-table mag-table-pro">
          <thead><tr><th>Matiere</th><th>Type</th><th>Trimestre</th><th>Valeur</th></tr></thead>
          <tbody>
            {notes.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--ink-600)", padding: "1.5rem" }}>Aucune note enregistree.</td></tr>
            ) : notes.map(function (n) {
              return <tr key={n.id}><td>{n.matiere_nom}</td><td>{n.type_evaluation}</td><td>Trim. {n.trimestre}</td><td style={{ fontWeight: 600 }}>{n.valeur}/20</td></tr>;
            })}
          </tbody>
        </table>
      </div>

      <div className="mag-section-entete"><div className="mag-stat-label">Absences</div><span className="mag-compteur-pill">{absences.length}</span></div>
      <div className="mag-table-wrap" style={{ marginBottom: "2rem" }}>
        <table className="mag-table mag-table-pro">
          <thead><tr><th>Date</th><th>Justifiee</th><th>Motif</th></tr></thead>
          <tbody>
            {absences.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--ink-600)", padding: "1.5rem" }}>Aucune absence enregistree.</td></tr>
            ) : absences.map(function (a) {
              return (
                <tr key={a.id}>
                  <td>{a.date}</td>
                  <td>{a.justifiee ? <span className="mag-badge-succes">Justifiee</span> : <span className="mag-badge-erreur">Non justifiee</span>}</td>
                  <td style={{ color: "var(--ink-600)" }}>{a.motif || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mag-section-entete"><div className="mag-stat-label">Bulletins</div><span className="mag-compteur-pill">{bulletins.length}</span></div>
      <div className="mag-table-wrap" style={{ marginBottom: "2rem" }}>
        <table className="mag-table mag-table-pro">
          <thead><tr><th>Trimestre</th><th>Moyenne</th><th>Rang</th><th></th></tr></thead>
          <tbody>
            {bulletins.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--ink-600)", padding: "1.5rem" }}>Aucun bulletin genere.</td></tr>
            ) : bulletins.map(function (b) {
              return (
                <tr key={b.id}>
                  <td>Trim. {b.trimestre}</td>
                  <td style={{ fontWeight: 600 }}>{b.moyenne_generale}/20</td>
                  <td>{b.rang ? b.rang + " / " + b.effectif_classe : "-"}</td>
                  <td>
                    {b.fichier_pdf ? (
                      <button type="button" className="mag-btn-lien" onClick={function () { telechargerBulletin(b); }} disabled={enCoursTelechargement === b.id}>
                        {enCoursTelechargement === b.id ? "Telechargement..." : "Telecharger →"}
                      </button>
                    ) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mag-section-entete"><div className="mag-stat-label">Observations comportementales</div><span className="mag-compteur-pill">{observations.length}</span></div>

      {peutAjouterObservation ? (
        <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.4rem", maxWidth: "680px" }}>
          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
          <form onSubmit={ajouterObservation}>
            <div className="mag-grid-2">
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="obs-type">Type</label>
                <select id="obs-type" value={typeObs} onChange={function (e) { setTypeObs(e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                  <option value="positive">Positive</option>
                  <option value="neutre">Neutre</option>
                  <option value="negative">Negative</option>
                </select>
              </div>
              <div className="mag-field" style={{ justifyContent: "flex-end" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 400 }}>
                  <input type="checkbox" checked={visibleParent} onChange={function (e) { setVisibleParent(e.target.checked); }} />
                  Visible par le parent
                </label>
              </div>
            </div>
            <div className="mag-field">
              <label className="mag-label-requis" htmlFor="obs-contenu">Contenu</label>
              <textarea id="obs-contenu" rows={2} value={contenuObs} onChange={function (e) { setContenuObs(e.target.value); }} required style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px", fontFamily: "inherit" }} />
            </div>
            <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.8rem" }} disabled={enCours}>
              {enCours ? <span className="react-spinner"></span> : "Ajouter l'observation"}
            </button>
          </form>
        </div>
      ) : null}

      <div className="mag-table-wrap">
        <table className="mag-table mag-table-pro">
          <thead><tr><th>Date</th><th>Type</th><th>Contenu</th><th>Enseignant</th></tr></thead>
          <tbody>
            {observations.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--ink-600)", padding: "1.5rem" }}>Aucune observation enregistree.</td></tr>
            ) : observations.map(function (o) {
              return (
                <tr key={o.id}>
                    <td>{new Date(o.date_observation).toLocaleDateString(localeActive())}</td>
                  <td><span className={CLASSE_TYPE_OBS[o.type_observation]}>{traduireTexte(LABEL_TYPE_OBS[o.type_observation])}</span></td>
                  <td>{o.contenu}</td>
                  <td style={{ color: "var(--ink-600)" }}>{o.enseignant_nom || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
