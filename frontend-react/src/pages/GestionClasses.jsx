// src/pages/GestionClasses.jsx
import { useState, useEffect } from "react";
import { lister, creer, modifier, supprimer } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";

export default function GestionClasses({ token }) {
  const confirmation = useConfirmation();
  const [classes, setClasses] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [nom, setNom] = useState("");
  const [niveau, setNiveau] = useState("");
  const [anneeScolaire, setAnneeScolaire] = useState("");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const [idEnEdition, setIdEnEdition] = useState(null);
  const [editNom, setEditNom] = useState("");
  const [editNiveau, setEditNiveau] = useState("");
  const [editAnnee, setEditAnnee] = useState("");
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);

  const chargerListe = function () {
    setStatut("chargement");
    lister("classes", token).then(function (d) { setClasses(d); setStatut("ok"); }).catch(function () { setStatut("refuse"); });
  };

  useEffect(chargerListe, [token]);

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      await creer("classes", token, { nom: nom, niveau: niveau, annee_scolaire: anneeScolaire });
      setMessage({ type: "succes", texte: "Classe creee avec succes." });
      setNom(""); setNiveau(""); setAnneeScolaire("");
      chargerListe();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const commencerEdition = function (c) {
    setIdEnEdition(c.id);
    setEditNom(c.nom);
    setEditNiveau(c.niveau);
    setEditAnnee(c.annee_scolaire);
  };

  const annulerEdition = function () {
    setIdEnEdition(null);
  };

  const enregistrerEdition = async function (id) {
    setEnregistrementEnCours(true);
    try {
      await modifier("classes", id, token, { nom: editNom, niveau: editNiveau, annee_scolaire: editAnnee });
      setIdEnEdition(null);
      chargerListe();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnregistrementEnCours(false);
  };

  const supprimerClasse = async function (c) {
    if (!(await confirmation.demander("Supprimer la classe " + c.nom + " ?"))) return;
    try {
      await supprimer("classes", c.id, token);
      chargerListe();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible (des eleves y sont peut-etre encore inscrits)." });
    }
  };

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Configuration</span> Classes</div>

      <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.8rem", maxWidth: "680px" }}>
        <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>Creer une nouvelle classe</div>
        {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
        <form onSubmit={soumettre}>
          <div className="mag-grid-2">
            <div className="mag-field"><label className="mag-label-requis" htmlFor="cls-nom">Nom</label><input id="cls-nom" type="text" value={nom} onChange={function (e) { setNom(e.target.value); }} placeholder="Ex: 3e A" required /></div>
            <div className="mag-field"><label className="mag-label-requis" htmlFor="cls-niveau">Niveau</label><input id="cls-niveau" type="text" value={niveau} onChange={function (e) { setNiveau(e.target.value); }} placeholder="Ex: 3e" required /></div>
          </div>
          <div className="mag-field"><label className="mag-label-requis" htmlFor="cls-annee">Annee scolaire</label><input id="cls-annee" type="text" value={anneeScolaire} onChange={function (e) { setAnneeScolaire(e.target.value); }} placeholder="Ex: 2026-2027" required /></div>
          <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.8rem" }} disabled={enCours}>
            {enCours ? <span className="react-spinner"></span> : "Creer"}
          </button>
        </form>
      </div>

      <div className="mag-section-entete">
        <div className="mag-stat-label">Liste des classes</div>
        <span className="mag-compteur-pill">{classes.length}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les classes.</Alerte> : null}
      {statut === "ok" ? (
        <div className="mag-table-wrap react-fade-in">
          <table className="mag-table mag-table-pro">
            <thead><tr><th>Nom</th><th>Niveau</th><th>Annee scolaire</th><th></th></tr></thead>
            <tbody>
              {classes.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}>Aucune classe creee.</td></tr>
              ) : classes.map(function (c) {
                if (idEnEdition === c.id) {
                  return (
                    <tr key={c.id}>
                      <td><input type="text" value={editNom} onChange={function (e) { setEditNom(e.target.value); }} style={{ width: "100%", padding: "0.35rem" }} /></td>
                      <td><input type="text" value={editNiveau} onChange={function (e) { setEditNiveau(e.target.value); }} style={{ width: "100%", padding: "0.35rem" }} /></td>
                      <td><input type="text" value={editAnnee} onChange={function (e) { setEditAnnee(e.target.value); }} style={{ width: "100%", padding: "0.35rem" }} /></td>
                      <td>
                        <button type="button" className="mag-btn-lien" onClick={function () { enregistrerEdition(c.id); }} disabled={enregistrementEnCours}>
                          {enregistrementEnCours ? "Enregistrement..." : "Enregistrer"}
                        </button>
                        <button type="button" className="mag-btn-lien" onClick={annulerEdition} disabled={enregistrementEnCours}>Annuler</button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.nom}</td>
                    <td><span className="mag-badge">{c.niveau}</span></td>
                    <td>{c.annee_scolaire}</td>
                    <td>
                      <button type="button" className="mag-btn-lien" onClick={function () { commencerEdition(c); }}>Modifier →</button>
                      <BoutonSupprimer onClick={function () { supprimerClasse(c); }} />
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
          titre="Supprimer la classe"
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