// src/pages/Evenements.jsx
// Calendrier scolaire : jours feries, vacances et evenements. Lecture pour
// tous les roles connectes ; creation/modification/suppression reservees
// a l'Administrateur.
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, supprimer } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";
import { traduireTexte } from "../localisation.js";

const TYPES_EVENEMENT = [
  { valeur: "jour_ferie", label: "Jour ferie" },
  { valeur: "vacances", label: "Vacances" },
  { valeur: "evenement", label: "Evenement scolaire" },
];

const LABEL_TYPE = TYPES_EVENEMENT.reduce(function (acc, t) { acc[t.valeur] = t.label; return acc; }, {});
const CLASSE_BADGE = { jour_ferie: "mag-badge-erreur", vacances: "mag-badge", evenement: "mag-badge-succes" };

const CHAMPS_VIDES = { titre: "", type_evenement: "evenement", date_debut: "", date_fin: "", description: "" };

export default function Evenements({ token, role }) {
  const estAdmin = role === "administrateur";
  const confirmation = useConfirmation();

  const [evenements, setEvenements] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [idEnEdition, setIdEnEdition] = useState(null);
  const [champs, setChamps] = useState(CHAMPS_VIDES);

  const chargerTout = function () {
    setStatut("chargement");
    lister("evenements", token)
      .then(function (donnees) { setEvenements(donnees); setStatut("ok"); })
      .catch(function () { setStatut("refuse"); });
  };

  useEffect(chargerTout, [token]);

  const modifierChamp = function (nom, valeur) {
    setChamps(function (c) { return Object.assign({}, c, { [nom]: valeur }); });
  };

  const viderFormulaire = function () {
    setIdEnEdition(null);
    setChamps(CHAMPS_VIDES);
  };

  const commencerEdition = function (ev) {
    setIdEnEdition(ev.id);
    setChamps({
      titre: ev.titre, type_evenement: ev.type_evenement,
      date_debut: ev.date_debut, date_fin: ev.date_fin, description: ev.description || "",
    });
    setFormulaireOuvert(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      if (idEnEdition) {
        await modifier("evenements", idEnEdition, token, champs);
        setMessage({ type: "succes", texte: "Evenement mis a jour." });
      } else {
        await creer("evenements", token, champs);
        setMessage({ type: "succes", texte: "Evenement ajoute au calendrier." });
      }
      viderFormulaire();
      setFormulaireOuvert(false);
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const supprimerEvenement = async function (ev) {
    if (!(await confirmation.demander("Supprimer l'evenement « " + ev.titre + " » ?"))) return;
    try {
      await supprimer("evenements", ev.id, token);
      setMessage({ type: "succes", texte: "Evenement supprime." });
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible." });
    }
  };

  const evenementsTries = useMemo(function () {
    return evenements.slice().sort(function (a, b) { return a.date_debut < b.date_debut ? -1 : 1; });
  }, [evenements]);

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const aVenir = evenementsTries.filter(function (e) { return e.date_fin >= aujourdhui; });
  const passes = evenementsTries.filter(function (e) { return e.date_fin < aujourdhui; });

  const ligneEvenement = function (ev) {
    return (
      <tr key={ev.id}>
        <td><span className={CLASSE_BADGE[ev.type_evenement] || "mag-badge"}>{traduireTexte(LABEL_TYPE[ev.type_evenement])}</span></td>
        <td style={{ fontWeight: 600 }}>{ev.titre}</td>
        <td>{ev.date_debut === ev.date_fin ? ev.date_debut : ev.date_debut + " → " + ev.date_fin}</td>
        <td style={{ color: "var(--ink-600)" }}>{ev.description || "-"}</td>
        {estAdmin ? (
          <td style={{ whiteSpace: "nowrap" }}>
            <button type="button" className="mag-btn-lien" onClick={function () { commencerEdition(ev); }}>Modifier →</button>
            <BoutonSupprimer onClick={function () { supprimerEvenement(ev); }} />
          </td>
        ) : null}
      </tr>
    );
  };

  return (
    <>
      <div className="mag-page-title-ligne">
        <div className="mag-page-title"><span className="eyebrow">Calendrier</span> Evenements scolaires</div>
        {estAdmin ? (
          <button type="button" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.4rem" }} onClick={formulaireOuvert ? function () { setFormulaireOuvert(false); viderFormulaire(); } : function () { viderFormulaire(); setFormulaireOuvert(true); setMessage(null); }}>
            {formulaireOuvert ? "Fermer" : "+ Ajouter un evenement"}
          </button>
        ) : null}
      </div>

      {estAdmin && formulaireOuvert ? (
        <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.8rem", maxWidth: "680px" }}>
          <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>
            {idEnEdition ? "Modifier l'evenement" : "Ajouter un evenement"}
          </div>
          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
          <form onSubmit={soumettre}>
            <div className="mag-field">
              <label className="mag-label-requis" htmlFor="ev-titre">Titre</label>
              <input id="ev-titre" type="text" value={champs.titre} onChange={function (e) { modifierChamp("titre", e.target.value); }} required />
            </div>
            <div className="mag-field">
              <label className="mag-label-requis" htmlFor="ev-type">Type</label>
              <select id="ev-type" value={champs.type_evenement} onChange={function (e) { modifierChamp("type_evenement", e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                {TYPES_EVENEMENT.map(function (t) { return <option key={t.valeur} value={t.valeur}>{traduireTexte(t.label)}</option>; })}
              </select>
            </div>
            <div className="mag-grid-2">
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="ev-debut">Date de debut</label>
                <input id="ev-debut" type="date" value={champs.date_debut} onChange={function (e) { modifierChamp("date_debut", e.target.value); }} required />
              </div>
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="ev-fin">Date de fin</label>
                <input id="ev-fin" type="date" value={champs.date_fin} onChange={function (e) { modifierChamp("date_fin", e.target.value); }} required />
              </div>
            </div>
            <div className="mag-field">
              <label htmlFor="ev-description">Description</label>
              <textarea id="ev-description" rows={3} value={champs.description} onChange={function (e) { modifierChamp("description", e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px", fontFamily: "inherit" }} />
            </div>
            <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.8rem" }} disabled={enCours}>
              {enCours ? <span className="react-spinner"></span> : (idEnEdition ? "Enregistrer" : "Ajouter")}
            </button>
            <button type="button" className="mag-btn-lien" style={{ marginLeft: "0.8rem" }} onClick={function () { setFormulaireOuvert(false); viderFormulaire(); }}>Annuler</button>
          </form>
        </div>
      ) : (
        !estAdmin || !formulaireOuvert ? (message && !formulaireOuvert ? <Alerte type={message.type}>{message.texte}</Alerte> : null) : null
      )}

      {statut === "chargement" ? <Spinner texte="Chargement du calendrier..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger le calendrier.</Alerte> : null}
      {statut === "ok" ? (
        <div className="react-fade-in">
          <div className="mag-section-entete">
            <div className="mag-stat-label">A venir</div>
            <span className="mag-compteur-pill">{aVenir.length}</span>
          </div>
          <div className="mag-table-wrap" style={{ marginBottom: "2rem" }}>
            <table className="mag-table mag-table-pro">
              <thead><tr><th>Type</th><th>Titre</th><th>Dates</th><th>Description</th>{estAdmin ? <th></th> : null}</tr></thead>
              <tbody>
                {aVenir.length === 0 ? (
                  <tr><td colSpan={estAdmin ? 5 : 4} style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}>Aucun evenement a venir.</td></tr>
                ) : aVenir.map(ligneEvenement)}
              </tbody>
            </table>
          </div>

          {passes.length > 0 ? (
            <>
              <div className="mag-section-entete">
                <div className="mag-stat-label">Passes</div>
                <span className="mag-compteur-pill">{passes.length}</span>
              </div>
              <div className="mag-table-wrap">
                <table className="mag-table mag-table-pro">
                  <thead><tr><th>Type</th><th>Titre</th><th>Dates</th><th>Description</th>{estAdmin ? <th></th> : null}</tr></thead>
                  <tbody>{passes.map(ligneEvenement)}</tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {confirmation.demande ? (
        <ConfirmModal
          titre="Supprimer l'evenement"
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
