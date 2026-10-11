// src/pages/EmploiDuTemps.jsx
// Emploi du temps. Administrateur : creation/suppression de creneaux.
// Enseignant : ses propres creneaux. Parent : les creneaux de la classe
// de son/ses enfant(s). L'API filtre deja par role (CoursViewSet) : cette
// page affiche simplement ce qu'elle recoit, presente comme un planning
// hebdomadaire par jour plutot qu'un simple tableau.
import { useState, useEffect } from "react";
import { lister, creer, modifier, supprimer } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import { traduireTexte } from "../localisation.js";

const JOURS = [
  { valeur: "lundi", label: "Lundi" },
  { valeur: "mardi", label: "Mardi" },
  { valeur: "mercredi", label: "Mercredi" },
  { valeur: "jeudi", label: "Jeudi" },
  { valeur: "vendredi", label: "Vendredi" },
  { valeur: "samedi", label: "Samedi" },
];

const COULEURS_MATIERE = ["#1D4E89", "#7C3AED", "#16A34A", "#D97706", "#DB2777", "#0891B2", "#DC2626", "#4F46E5"];
function couleurPour(nom) {
  let somme = 0;
  for (let i = 0; i < (nom || "").length; i++) somme += nom.charCodeAt(i);
  return COULEURS_MATIERE[somme % COULEURS_MATIERE.length];
}

export default function EmploiDuTemps({ token, role }) {
  const confirmation = useConfirmation();
  const [cours, setCours] = useState([]);
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const [idEnEdition, setIdEnEdition] = useState(null);
  const [classeId, setClasseId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [enseignantId, setEnseignantId] = useState("");
  const [jour, setJour] = useState("lundi");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [salle, setSalle] = useState("");

  const estAdmin = role === "administrateur";

  const charger = function () {
    setStatut("chargement");
    const appels = estAdmin
      ? [lister("cours", token), lister("classes", token), lister("matieres", token), lister("enseignants", token)]
      : [lister("cours", token)];
    Promise.all(appels)
      .then(function (resultats) {
        setCours(resultats[0]);
        if (estAdmin) {
          setClasses(resultats[1]);
          setMatieres(resultats[2]);
          setEnseignants(resultats[3]);
        }
        setStatut("ok");
      })
      .catch(function () { setStatut("refuse"); });
  };

  useEffect(charger, [token]);

  const viderFormulaire = function () {
    setIdEnEdition(null);
    setClasseId(""); setMatiereId(""); setEnseignantId(""); setJour("lundi");
    setHeureDebut(""); setHeureFin(""); setSalle("");
  };

  const commencerEdition = function (c) {
    setIdEnEdition(c.id);
    setClasseId(String(c.classe));
    setMatiereId(String(c.matiere));
    setEnseignantId(String(c.enseignant));
    setJour(c.jour);
    setHeureDebut(c.heure_debut.slice(0, 5));
    setHeureFin(c.heure_fin.slice(0, 5));
    setSalle(c.salle || "");
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    const donnees = {
      classe: Number(classeId), matiere: Number(matiereId), enseignant: Number(enseignantId),
      jour: jour, heure_debut: heureDebut, heure_fin: heureFin, salle: salle,
    };
    try {
      if (idEnEdition) {
        await modifier("cours", idEnEdition, token, donnees);
        setMessage({ type: "succes", texte: "Creneau mis a jour." });
      } else {
        await creer("cours", token, donnees);
        setMessage({ type: "succes", texte: "Creneau ajoute a l'emploi du temps." });
      }
      viderFormulaire();
      charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const retirer = async function (id) {
    if (!(await confirmation.demander("Supprimer ce creneau ?"))) return;
    try {
      await supprimer("cours", id, token);
      charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
  };

  const parJour = JOURS.map(function (j) {
    const creneaux = cours
      .filter(function (c) { return c.jour === j.valeur; })
      .sort(function (a, b) { return a.heure_debut.localeCompare(b.heure_debut); });
    return { jour: j, creneaux: creneaux };
  });

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Planning</span> Emploi du temps</div>

      {estAdmin ? (
        <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.8rem" }}>
          <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>
            {idEnEdition ? "Modifier le creneau" : "Ajouter un creneau"}
          </div>
          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
          <form onSubmit={soumettre}>
            <div className="mag-grid-2">
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="edt-classe">Classe</label>
                <select id="edt-classe" value={classeId} onChange={function (e) { setClasseId(e.target.value); }} required style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                  <option value="">-- Choisir --</option>
                  {classes.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
                </select>
              </div>
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="edt-matiere">Matiere</label>
                <select id="edt-matiere" value={matiereId} onChange={function (e) { setMatiereId(e.target.value); }} required style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                  <option value="">-- Choisir --</option>
                  {matieres.map(function (m) { return <option key={m.id} value={m.id}>{m.nom}</option>; })}
                </select>
              </div>
            </div>
            <div className="mag-field">
              <label className="mag-label-requis" htmlFor="edt-enseignant">Enseignant</label>
              <select id="edt-enseignant" value={enseignantId} onChange={function (e) { setEnseignantId(e.target.value); }} required style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                <option value="">-- Choisir --</option>
                {enseignants.map(function (e) { return <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.username})</option>; })}
              </select>
            </div>
            <div className="mag-grid-2">
              <div className="mag-field">
                <label htmlFor="edt-jour">Jour</label>
                <select id="edt-jour" value={jour} onChange={function (e) { setJour(e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                  {JOURS.map(function (j) { return <option key={j.valeur} value={j.valeur}>{traduireTexte(j.label)}</option>; })}
                </select>
              </div>
              <div className="mag-field">
                <label htmlFor="edt-salle">Salle</label>
                <input id="edt-salle" type="text" value={salle} onChange={function (e) { setSalle(e.target.value); }} placeholder="Ex: Salle 3" />
              </div>
            </div>
            <div className="mag-grid-2">
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="edt-debut">Heure de debut</label>
                <input id="edt-debut" type="time" value={heureDebut} onChange={function (e) { setHeureDebut(e.target.value); }} required />
              </div>
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="edt-fin">Heure de fin</label>
                <input id="edt-fin" type="time" value={heureFin} onChange={function (e) { setHeureFin(e.target.value); }} required />
              </div>
            </div>
            <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.8rem" }} disabled={enCours}>
              {enCours ? <span className="react-spinner"></span> : (idEnEdition ? "Enregistrer" : "Ajouter le creneau")}
            </button>
            {idEnEdition ? (
              <button type="button" className="mag-btn-lien" style={{ marginLeft: "0.8rem" }} onClick={viderFormulaire}>Annuler</button>
            ) : null}
          </form>
        </div>
      ) : (
        message ? <Alerte type={message.type}>{message.texte}</Alerte> : null
      )}

      {statut === "chargement" ? <Spinner texte="Chargement..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger l'emploi du temps.</Alerte> : null}
      {statut === "ok" ? (
        <div className="react-planning-grille">
          {parJour.map(function (bloc) {
            return (
              <div className="react-planning-jour" key={bloc.jour.valeur}>
                <div className="react-planning-jour-titre">{traduireTexte(bloc.jour.label)}</div>
                {bloc.creneaux.length === 0 ? (
                  <div className="react-planning-vide">Aucun cours</div>
                ) : (
                  bloc.creneaux.map(function (c) {
                    return (
                      <div className="react-planning-creneau" key={c.id} style={{ "--couleur-creneau": couleurPour(c.matiere_nom) }}>
                        <div className="react-planning-heure">{c.heure_debut.slice(0, 5)} — {c.heure_fin.slice(0, 5)}</div>
                        <div className="react-planning-matiere">{c.matiere_nom}</div>
                        <div className="react-planning-details">{c.classe_nom}{c.salle ? " · " + c.salle : ""}</div>
                        {(role !== "enseignant") ? <div className="react-planning-enseignant">{c.enseignant_nom}</div> : null}
                        {estAdmin ? (
                          <div className="react-planning-actions">
                            <button type="button" className="react-planning-modifier" onClick={function () { commencerEdition(c); }}>Modifier</button>
                            <button type="button" className="react-planning-supprimer" onClick={function () { retirer(c.id); }}>Supprimer</button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {confirmation.demande ? (
        <ConfirmModal
          titre="Supprimer le creneau"
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
