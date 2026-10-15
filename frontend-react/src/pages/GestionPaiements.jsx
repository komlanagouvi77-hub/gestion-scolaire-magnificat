// src/pages/GestionPaiements.jsx
// Enregistrement des paiements de scolarite (Administrateur uniquement).
// Cote API, la creation/modification/suppression d'un paiement est deja
// bloquee pour tout role autre qu'Administrateur (voir PaiementViewSet
// cote Django) : un Parent ne peut donc jamais se declarer "a jour" lui-meme.
import { useState, useEffect } from "react";
import { lister, creer, modifier, supprimer, obtenirParametres, telechargerRecuPaiementPdf } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import { traduireTexte, localeActive } from "../localisation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";
import RecuPaiementModal from "../components/RecuPaiementModal.jsx";

const MODES_PAIEMENT = [
  { valeur: "especes", label: "Especes" },
  { valeur: "mobile_money", label: "Mobile Money (Flooz / T-Money)" },
  { valeur: "cheque", label: "Cheque" },
  { valeur: "virement", label: "Virement bancaire" },
];

const CHAMPS_VIDES = {
  eleveId: "", tranche: "1", montant: "", modePaiement: "especes",
  reference: "", anneeScolaire: "2026-2027",
};

export default function GestionPaiements({ token }) {
  const confirmation = useConfirmation();
  const [paiements, setPaiements] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [enCoursPdfId, setEnCoursPdfId] = useState(null);
  const [idEnEdition, setIdEnEdition] = useState(null);
  const [parametres, setParametres] = useState(null);
  const [paiementPourRecu, setPaiementPourRecu] = useState(null);

  const [champs, setChamps] = useState(CHAMPS_VIDES);

  useEffect(function () {
    obtenirParametres(token).then(setParametres).catch(function () {});
  }, [token]);

  const chargerTout = function () {
    setStatut("chargement");
    Promise.all([lister("paiements", token), lister("eleves", token)])
      .then(function (resultats) {
        const listeP = Array.isArray(resultats[0]) ? resultats[0] : (resultats[0] && Array.isArray(resultats[0].results) ? resultats[0].results : []);
        const listeE = Array.isArray(resultats[1]) ? resultats[1] : (resultats[1] && Array.isArray(resultats[1].results) ? resultats[1].results : []);
        setPaiements(listeP);
        setEleves(listeE);
        setStatut("ok");
      })
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

  const commencerEdition = function (p) {
    setIdEnEdition(p.id);
    setChamps({
      eleveId: String(p.eleve),
      tranche: String(p.tranche),
      montant: String(p.montant),
      modePaiement: p.mode_paiement,
      reference: p.reference || "",
      anneeScolaire: p.annee_scolaire,
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    const donnees = {
      eleve: Number(champs.eleveId), tranche: Number(champs.tranche), montant: champs.montant,
      mode_paiement: champs.modePaiement, reference: champs.reference, annee_scolaire: champs.anneeScolaire,
    };
    try {
      if (idEnEdition) {
        await modifier("paiements", idEnEdition, token, donnees);
        setMessage({ type: "succes", texte: "Paiement mis a jour avec succes." });
      } else {
        await creer("paiements", token, donnees);
        setMessage({ type: "succes", texte: "Paiement enregistre avec succes." });
      }
      viderFormulaire();
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const supprimerPaiement = async function (p) {
    if (!(await confirmation.demander("Supprimer ce paiement de " + Number(p.montant).toLocaleString(localeActive()) + " FCFA pour " + (p.eleve_nom || p.eleve) + " ?"))) return;
    try {
      await supprimer("paiements", p.id, token);
      setMessage({ type: "succes", texte: "Paiement supprime." });
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible." });
    }
  };

  const telechargerDirectPdf = async function (p) {
    try {
      setEnCoursPdfId(p.id);
      const nomEleve = (p.eleve_nom || "eleve").replace(/\s+/g, "_");
      const nomFichier = "recu_officiel_" + nomEleve + "_" + p.id + ".pdf";
      await telechargerRecuPaiementPdf(p.id, token, nomFichier);
    } catch (err) {
      setMessage({ type: "erreur", texte: "Erreur telechargement PDF : " + (err.message || "") });
    } finally {
      setEnCoursPdfId(null);
    }
  };

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Finances</span> Paiements</div>

      <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.8rem", maxWidth: "680px" }}>
        <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>
          {idEnEdition ? "Modifier le paiement" : "Enregistrer un paiement"}
        </div>
        {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
        <form onSubmit={soumettre}>
          <div className="mag-field">
            <label className="mag-label-requis" htmlFor="pai-eleve">Eleve</label>
            <select id="pai-eleve" value={champs.eleveId} onChange={function (e) { modifierChamp("eleveId", e.target.value); }} required style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
              <option value="">-- {traduireTexte("Choisir un eleve")} --</option>
              {Array.isArray(eleves) && eleves.map(function (el) {
                return <option key={el.id} value={el.id}>{el.nom} {el.prenom} — {el.classe_nom || "Classe non assignee"}</option>;
              })}
            </select>
          </div>
          <div className="mag-grid-2">
            <div className="mag-field">
              <label htmlFor="pai-tranche">Tranche concernee</label>
              <select id="pai-tranche" value={champs.tranche} onChange={function (e) { modifierChamp("tranche", e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                <option value="1">1ere tranche</option>
                <option value="2">2eme tranche</option>
                <option value="3">3eme tranche</option>
              </select>
            </div>
            <div className="mag-field"><label className="mag-label-requis" htmlFor="pai-montant">Montant (FCFA)</label><input id="pai-montant" type="number" min="1" step="1" value={champs.montant} onChange={function (e) { modifierChamp("montant", e.target.value); }} required /></div>
          </div>
          <div className="mag-grid-2">
            <div className="mag-field">
              <label htmlFor="pai-mode">Mode de paiement</label>
              <select id="pai-mode" value={champs.modePaiement} onChange={function (e) { modifierChamp("modePaiement", e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                {MODES_PAIEMENT.map(function (m) { return <option key={m.valeur} value={m.valeur}>{traduireTexte(m.label)}</option>; })}
              </select>
            </div>
            <div className="mag-field"><label htmlFor="pai-reference">Reference / N° de recu</label><input id="pai-reference" type="text" value={champs.reference} onChange={function (e) { modifierChamp("reference", e.target.value); }} /></div>
          </div>
          <div className="mag-field"><label className="mag-label-requis" htmlFor="pai-annee">Annee scolaire</label><input id="pai-annee" type="text" value={champs.anneeScolaire} onChange={function (e) { modifierChamp("anneeScolaire", e.target.value); }} required /></div>
          <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.8rem" }} disabled={enCours}>
            {enCours ? <span className="react-spinner"></span> : (idEnEdition ? "Enregistrer les modifications" : "Enregistrer le paiement")}
          </button>
          {idEnEdition ? (
            <button type="button" className="mag-btn-lien" style={{ marginLeft: "0.8rem" }} onClick={viderFormulaire}>Annuler</button>
          ) : null}
        </form>
      </div>

      <div className="mag-section-entete">
        <div className="mag-stat-label">Historique des paiements</div>
        <span className="mag-compteur-pill">{Array.isArray(paiements) ? paiements.length : 0}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les paiements.</Alerte> : null}
      {statut === "ok" ? (
        <div className="mag-table-wrap react-fade-in">
          <table className="mag-table mag-table-pro">
            <thead><tr><th>Eleve</th><th>Tranche</th><th>Montant</th><th>Mode</th><th>Date</th><th>Reference</th><th></th></tr></thead>
            <tbody>
              {!Array.isArray(paiements) || paiements.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}>Aucun paiement enregistre.</td></tr>
              ) : paiements.map(function (p) {
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.eleve_nom || p.eleve}</td>
                    <td>{p.tranche ? p.tranche + "e tranche" : "-"}</td>
                    <td style={{ fontWeight: 600 }}>{Number(p.montant || 0).toLocaleString(localeActive())} FCFA</td>
                    <td><span className="mag-badge">{p.mode_paiement}</span></td>
                    <td>{p.date_paiement || "-"}</td>
                    <td>{p.reference || "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button type="button" className="mag-btn-lien" onClick={function () { setPaiementPourRecu(p); }}>Recu</button>
                      <button
                        type="button"
                        className="mag-btn-lien"
                        style={{ fontWeight: 600, color: "var(--brand-blue, #1D4E89)" }}
                        onClick={function () { telechargerDirectPdf(p); }}
                        disabled={enCoursPdfId === p.id}
                        title="Telecharger le recu officiel PDF certifie ReportLab"
                      >
                        {enCoursPdfId === p.id ? "PDF..." : "PDF"}
                      </button>
                      <button type="button" className="mag-btn-lien" onClick={function () { commencerEdition(p); }}>Modifier →</button>
                      <BoutonSupprimer onClick={function () { supprimerPaiement(p); }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {confirmation.demande ? (
        <ConfirmModal
          titre="Supprimer le paiement"
          message={confirmation.demande.message}
          texteConfirmer="Supprimer"
          danger
          onConfirmer={confirmation.confirmer}
          onAnnuler={confirmation.annuler}
        />
      ) : null}

      {paiementPourRecu ? (
        <RecuPaiementModal
          paiement={paiementPourRecu}
          parametres={parametres}
          onFermer={function () { setPaiementPourRecu(null); }}
        />
      ) : null}
    </>
  );
}
