// src/pages/Evenements.jsx
// Calendrier scolaire : jours fériés, vacances et événements. Lecture pour
// tous les rôles connectés ; création/modification/suppression réservées
// à l'Administrateur.
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, supprimer } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";
import { traduireTexte } from "../localisation.js";
import { Calendar, Plus, X } from "lucide-react";

const TYPES_EVENEMENT = [
  { valeur: "evenement", label: "Événement scolaire" },
  { valeur: "jour_ferie", label: "Jour férié" },
  { valeur: "vacances", label: "Vacances" },
];

const LABEL_TYPE = TYPES_EVENEMENT.reduce(function (acc, t) { acc[t.valeur] = t.label; return acc; }, {});
const CLASSE_BADGE = {
  jour_ferie: "mag-badge-erreur",
  vacances: "mag-badge",
  evenement: "mag-badge-succes",
};

const CHAMPS_VIDES = { titre: "", type_evenement: "evenement", date_debut: "", date_fin: "", description: "" };

function formaterDateFr(dateStr) {
  if (!dateStr) return "";
  const parties = dateStr.split("-");
  if (parties.length !== 3) return dateStr;
  const annee = parseInt(parties[0], 10);
  const mois = parseInt(parties[1], 10) - 1;
  const jour = parseInt(parties[2], 10);
  const date = new Date(annee, mois, jour);

  const options = { day: "2-digit", month: "short", year: "numeric" };
  return date.toLocaleDateString("fr-FR", options);
}

function formaterPlageDates(dateDebut, dateFin) {
  if (!dateDebut) return "";
  if (!dateFin || dateDebut === dateFin) {
    return formaterDateFr(dateDebut);
  }
  return formaterDateFr(dateDebut) + " au " + formaterDateFr(dateFin);
}

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
      .then(function (donnees) { setEvenements(donnees || []); setStatut("ok"); })
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
      titre: ev.titre,
      type_evenement: ev.type_evenement,
      date_debut: ev.date_debut,
      date_fin: ev.date_fin,
      description: ev.description || "",
    });
    setFormulaireOuvert(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);

    if (champs.date_debut && champs.date_fin && champs.date_fin < champs.date_debut) {
      setMessage({ type: "erreur", texte: "La date de fin ne peut pas être antérieure à la date de début." });
      return;
    }

    setEnCours(true);
    try {
      if (idEnEdition) {
        await modifier("evenements", idEnEdition, token, champs);
        setMessage({ type: "succes", texte: "Événement mis à jour avec succès." });
      } else {
        await creer("evenements", token, champs);
        setMessage({ type: "succes", texte: "Événement ajouté au calendrier scolaire." });
      }
      viderFormulaire();
      setFormulaireOuvert(false);
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message || "Impossible d'enregistrer l'événement." });
    }
    setEnCours(false);
  };

  const supprimerEvenement = async function (ev) {
    if (!(await confirmation.demander("Supprimer l'événement « " + ev.titre + " » du calendrier scolaire ?"))) return;
    try {
      await supprimer("evenements", ev.id, token);
      setMessage({ type: "succes", texte: "Événement supprimé du calendrier." });
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible de l'événement." });
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
        <td>
          <span className={CLASSE_BADGE[ev.type_evenement] || "mag-badge"}>
            {LABEL_TYPE[ev.type_evenement] || ev.type_evenement}
          </span>
        </td>
        <td style={{ fontWeight: 600, color: "#0F172A" }}>{ev.titre}</td>
        <td style={{ color: "#334155", whiteSpace: "nowrap" }}>
          {formaterPlageDates(ev.date_debut, ev.date_fin)}
        </td>
        <td>
          {ev.description && ev.description.trim() ? (
            <span style={{ color: "#475569" }}>{ev.description}</span>
          ) : (
            <span style={{ color: "#94A3B8", fontStyle: "italic", fontSize: "0.82rem" }}>
              Aucune description
            </span>
          )}
        </td>
        {estAdmin ? (
          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            <button
              type="button"
              className="mag-btn-lien"
              style={{ marginRight: "0.75rem", fontWeight: 600, color: "var(--azur-500)" }}
              onClick={function () { commencerEdition(ev); }}
            >
              Modifier
            </button>
            <BoutonSupprimer onClick={function () { supprimerEvenement(ev); }} />
          </td>
        ) : null}
      </tr>
    );
  };

  return (
    <>
      <div className="mag-page-title-ligne">
        <div className="mag-page-title">
          <h1>Événements scolaires</h1>
        </div>
        {estAdmin ? (
          <button
            type="button"
            className="mag-btn-primary"
            style={{
              width: "auto",
              background: "#1E3A8A",
              borderColor: "#1E3A8A",
              padding: "0.55rem 1.4rem",
              fontWeight: 600,
              fontSize: "0.85rem",
              borderRadius: "6px",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
            onClick={formulaireOuvert ? function () { setFormulaireOuvert(false); viderFormulaire(); } : function () { viderFormulaire(); setFormulaireOuvert(true); setMessage(null); }}
          >
            {formulaireOuvert ? (
              <>
                <X size={15} />
                <span>Fermer</span>
              </>
            ) : (
              <>
                <Plus size={15} />
                <span>Ajouter un événement</span>
              </>
            )}
          </button>
        ) : null}
      </div>

      {estAdmin && formulaireOuvert ? (
        <div
          className="mag-panneau-form react-fade-in"
          style={{
            marginBottom: "1.8rem",
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            padding: "1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #F1F5F9", paddingBottom: "0.6rem" }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Calendar size={18} color="#1E3A8A" />
              <span>{idEnEdition ? "Modifier l'événement" : "Ajouter un événement au calendrier scolaire"}</span>
            </div>
            {idEnEdition ? (
              <span style={{ fontSize: "0.8rem", color: "#64748B", background: "#F1F5F9", padding: "0.2rem 0.6rem", borderRadius: "4px" }}>
                Mode édition
              </span>
            ) : null}
          </div>

          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

          <form onSubmit={soumettre}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="ev-titre" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                  Titre de l'événement
                </label>
                <input
                  id="ev-titre"
                  type="text"
                  value={champs.titre}
                  onChange={function (e) { modifierChamp("titre", e.target.value); }}
                  placeholder="Ex: Fête de l'Indépendance, Conseil de classe..."
                  required
                  style={{ width: "100%", height: "38px", padding: "0 0.75rem", border: "1px solid #CBD5E1", borderRadius: "6px", background: "#FFF", fontSize: "0.88rem", color: "#0F172A", boxSizing: "border-box" }}
                />
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="ev-type" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                  Type d'événement
                </label>
                <select
                  id="ev-type"
                  value={champs.type_evenement}
                  onChange={function (e) { modifierChamp("type_evenement", e.target.value); }}
                  style={{ width: "100%", height: "38px", padding: "0 0.75rem", border: "1px solid #CBD5E1", borderRadius: "6px", background: "#FFF", fontSize: "0.88rem", fontWeight: 600, color: "#0F172A", boxSizing: "border-box" }}
                >
                  {TYPES_EVENEMENT.map(function (t) { return <option key={t.valeur} value={t.valeur}>{t.label}</option>; })}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="ev-debut" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                  Date de début
                </label>
                <input
                  id="ev-debut"
                  type="date"
                  value={champs.date_debut}
                  onChange={function (e) {
                    const d = e.target.value;
                    modifierChamp("date_debut", d);
                    if (!champs.date_fin || champs.date_fin < d) {
                      modifierChamp("date_fin", d);
                    }
                  }}
                  required
                  style={{ width: "100%", height: "38px", padding: "0 0.75rem", border: "1px solid #CBD5E1", borderRadius: "6px", background: "#FFF", fontSize: "0.88rem", color: "#0F172A", boxSizing: "border-box" }}
                />
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="ev-fin" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                  Date de fin
                </label>
                <input
                  id="ev-fin"
                  type="date"
                  value={champs.date_fin}
                  onChange={function (e) { modifierChamp("date_fin", e.target.value); }}
                  required
                  style={{ width: "100%", height: "38px", padding: "0 0.75rem", border: "1px solid #CBD5E1", borderRadius: "6px", background: "#FFF", fontSize: "0.88rem", color: "#0F172A", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div className="mag-field" style={{ marginBottom: "1.2rem" }}>
              <label htmlFor="ev-description" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                Description (Optionnel)
              </label>
              <textarea
                id="ev-description"
                rows={3}
                value={champs.description}
                onChange={function (e) { modifierChamp("description", e.target.value); }}
                placeholder="Précisions sur l'organisation, le public concerné ou les consignes particulières..."
                style={{ width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #CBD5E1", borderRadius: "6px", fontFamily: "inherit", fontSize: "0.88rem", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
                }}
              >
                {enCours ? <span className="react-spinner"></span> : (idEnEdition ? "Enregistrer les modifications" : "Ajouter l'événement")}
              </button>
              <button
                type="button"
                className="btn-mag-outline"
                style={{ padding: "0.55rem 1.2rem", fontSize: "0.85rem", borderRadius: "6px" }}
                onClick={function () { setFormulaireOuvert(false); viderFormulaire(); }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      ) : (
        !estAdmin || !formulaireOuvert ? (message && !formulaireOuvert ? <Alerte type={message.type}>{message.texte}</Alerte> : null) : null
      )}

      {statut === "chargement" ? <Spinner texte="Chargement du calendrier scolaire..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger le calendrier scolaire.</Alerte> : null}

      {statut === "ok" ? (
        <div className="react-fade-in">
          {/* SECTION ÉVÉNEMENTS À VENIR */}
          <div className="mag-section-entete" style={{ marginBottom: "0.75rem" }}>
            <div className="mag-stat-label">À venir</div>
            <span className="mag-compteur-pill">{aVenir.length}</span>
          </div>

          <div className="mag-table-wrap" style={{ marginBottom: "2rem", border: "1px solid #E2E8F0", borderRadius: "6px", overflow: "hidden" }}>
            <table className="mag-table mag-table-pro">
              <thead>
                <tr>
                  <th style={{ width: "18%" }}>Type</th>
                  <th style={{ width: "32%" }}>Titre</th>
                  <th style={{ width: "24%", whiteSpace: "nowrap" }}>Dates</th>
                  <th style={{ width: "16%" }}>Description</th>
                  {estAdmin ? <th style={{ width: "10%", textAlign: "right", whiteSpace: "nowrap" }}>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {aVenir.length === 0 ? (
                  <tr>
                    <td colSpan={estAdmin ? 5 : 4} style={{ textAlign: "center", color: "#64748B", padding: "2.5rem" }}>
                      Aucun événement à venir pour le moment.
                    </td>
                  </tr>
                ) : (
                  aVenir.map(ligneEvenement)
                )}
              </tbody>
            </table>
          </div>

          {/* SECTION ÉVÉNEMENTS PASSÉS */}
          {passes.length > 0 ? (
            <>
              <div className="mag-section-entete" style={{ marginBottom: "0.75rem" }}>
                <div className="mag-stat-label">Passés</div>
                <span className="mag-compteur-pill">{passes.length}</span>
              </div>
              <div className="mag-table-wrap" style={{ border: "1px solid #E2E8F0", borderRadius: "6px", overflow: "hidden" }}>
                <table className="mag-table mag-table-pro">
                  <thead>
                    <tr>
                      <th style={{ width: "18%" }}>Type</th>
                      <th style={{ width: "32%" }}>Titre</th>
                      <th style={{ width: "24%", whiteSpace: "nowrap" }}>Dates</th>
                      <th style={{ width: "16%" }}>Description</th>
                      {estAdmin ? <th style={{ width: "10%", textAlign: "right", whiteSpace: "nowrap" }}>Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {passes.map(ligneEvenement)}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {confirmation.demande ? (
        <ConfirmModal
          titre="Supprimer l'événement"
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
