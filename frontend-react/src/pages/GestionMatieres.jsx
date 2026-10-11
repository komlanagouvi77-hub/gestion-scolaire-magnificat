// src/pages/GestionMatieres.jsx
import { useState, useEffect } from "react";
import { lister, creer, modifier, supprimer } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";

export default function GestionMatieres({ token }) {
  const confirmation = useConfirmation();
  const [matieres, setMatieres] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [nom, setNom] = useState("");
  const [coefficient, setCoefficient] = useState("1");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const [idEnEdition, setIdEnEdition] = useState(null);
  const [editNom, setEditNom] = useState("");
  const [editCoefficient, setEditCoefficient] = useState("1");
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);

  const chargerListe = function () {
    setStatut("chargement");
    lister("matieres", token).then(function (d) { setMatieres(d); setStatut("ok"); }).catch(function () { setStatut("refuse"); });
  };

  useEffect(chargerListe, [token]);

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      await creer("matieres", token, { nom: nom, coefficient: Number(coefficient) });
      setMessage({ type: "succes", texte: "Matiere creee avec succes." });
      setNom(""); setCoefficient("1");
      chargerListe();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const commencerEdition = function (m) {
    setIdEnEdition(m.id);
    setEditNom(m.nom);
    setEditCoefficient(String(m.coefficient));
  };

  const enregistrerEdition = async function (id) {
    setEnregistrementEnCours(true);
    try {
      await modifier("matieres", id, token, { nom: editNom, coefficient: Number(editCoefficient) });
      setIdEnEdition(null);
      chargerListe();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnregistrementEnCours(false);
  };

  const supprimerMatiere = async function (m) {
    if (!(await confirmation.demander("Supprimer la matiere " + m.nom + " ?"))) return;
    try {
      await supprimer("matieres", m.id, token);
      chargerListe();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible." });
    }
  };

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Configuration</span> Matieres</div>

      <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.8rem", maxWidth: "520px" }}>
        <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>Creer une nouvelle matiere</div>
        {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
        <form onSubmit={soumettre}>
          <div className="mag-grid-2">
            <div className="mag-field"><label className="mag-label-requis" htmlFor="mat-nom">Nom</label><input id="mat-nom" type="text" value={nom} onChange={function (e) { setNom(e.target.value); }} placeholder="Ex: Mathematiques" required /></div>
            <div className="mag-field"><label className="mag-label-requis" htmlFor="mat-coeff">Coefficient</label><input id="mat-coeff" type="number" min="1" value={coefficient} onChange={function (e) { setCoefficient(e.target.value); }} required /></div>
          </div>
          <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.55rem 1.6rem" }} disabled={enCours}>
            {enCours ? <span className="react-spinner"></span> : "Creer"}
          </button>
        </form>
      </div>

      <div className="mag-section-entete">
        <div className="mag-stat-label">Liste des matieres</div>
        <span className="mag-compteur-pill">{matieres.length}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les matieres.</Alerte> : null}
      {statut === "ok" ? (
        <div className="mag-table-wrap react-fade-in">
          <table className="mag-table mag-table-pro">
            <thead><tr><th>Nom</th><th style={{ textAlign: "center" }}>Coefficient</th><th></th></tr></thead>
            <tbody>
              {matieres.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}>Aucune matiere creee.</td></tr>
              ) : matieres.map(function (m) {
                if (idEnEdition === m.id) {
                  return (
                    <tr key={m.id}>
                      <td><input type="text" value={editNom} onChange={function (e) { setEditNom(e.target.value); }} style={{ width: "100%", padding: "0.35rem" }} /></td>
                      <td><input type="number" min="1" value={editCoefficient} onChange={function (e) { setEditCoefficient(e.target.value); }} style={{ width: "80px", padding: "0.35rem" }} /></td>
                      <td>
                        <button type="button" className="mag-btn-lien" onClick={function () { enregistrerEdition(m.id); }} disabled={enregistrementEnCours}>
                          {enregistrementEnCours ? "Enregistrement..." : "Enregistrer"}
                        </button>
                        <button type="button" className="mag-btn-lien" onClick={function () { setIdEnEdition(null); }} disabled={enregistrementEnCours}>Annuler</button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.nom}</td>
                    <td style={{ textAlign: "center" }}><span className="mag-badge">Coef. {m.coefficient}</span></td>
                    <td>
                      <button type="button" className="mag-btn-lien" onClick={function () { commencerEdition(m); }}>Modifier →</button>
                      <BoutonSupprimer onClick={function () { supprimerMatiere(m); }} />
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
          titre="Supprimer la matiere"
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