// src/pages/GestionNotes.jsx
// Saisie des notes par un Enseignant (ses classes/matieres uniquement) ou
// un Administrateur (toutes classes/matieres). Reprend le meme principe
// que l'ancienne vue Django saisir_notes_view : on choisit
// classe + matiere + trimestre + type d'evaluation, puis on saisit une
// note par eleve de la classe en une seule fois.
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, recupererProfil, obtenirParametres } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import { traduireTexte } from "../localisation.js";
import Spinner from "../components/Spinner.jsx";

const TRIMESTRES = [
  { valeur: "1", label: "1er trimestre" },
  { valeur: "2", label: "2e trimestre" },
  { valeur: "3", label: "3e trimestre" },
];

const TYPES_EVALUATION = [
  { valeur: "devoir", label: "Devoir" },
  { valeur: "interrogation", label: "Interrogation" },
  { valeur: "composition", label: "Composition" },
];

export default function GestionNotes({ token, role }) {
  const estAdmin = role === "administrateur";
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [parametres, setParametres] = useState(null);
  const [statut, setStatut] = useState("chargement");

  const [classeId, setClasseId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [trimestre, setTrimestre] = useState("1");
  const [typeEvaluation, setTypeEvaluation] = useState("devoir");

  const [notesExistantes, setNotesExistantes] = useState([]);
  const [valeurs, setValeurs] = useState({});
  const [chargementNotes, setChargementNotes] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(function () {
    setStatut("chargement");
    const appels = estAdmin
      ? [lister("classes", token), lister("matieres", token), lister("eleves", token), obtenirParametres(token)]
      : [recupererProfil(token), lister("eleves", token), obtenirParametres(token)];

    Promise.all(appels)
      .then(function (resultats) {
        if (estAdmin) {
          setClasses(resultats[0]);
          setMatieres(resultats[1]);
          setEleves(resultats[2]);
          setParametres(resultats[3]);
        } else {
          setClasses(resultats[0].classes || []);
          setMatieres(resultats[0].matieres || []);
          setEleves(resultats[1]);
          setParametres(resultats[2]);
        }
        setStatut("ok");
      })
      .catch(function () { setStatut("refuse"); });
  }, [token, estAdmin]);

  const elevesDeLaClasse = useMemo(function () {
    if (!classeId) return [];
    return eleves
      .filter(function (e) { return String(e.classe) === String(classeId); })
      .sort(function (a, b) { return (a.nom + a.prenom).localeCompare(b.nom + b.prenom); });
  }, [eleves, classeId]);

  const filtresComplets = classeId && matiereId && trimestre && typeEvaluation;

  useEffect(function () {
    if (!filtresComplets) { setNotesExistantes([]); setValeurs({}); return; }
    setChargementNotes(true);
    lister("notes", token)
      .then(function (toutes) {
        const filtrees = toutes.filter(function (n) {
          return String(n.matiere) === String(matiereId)
            && String(n.trimestre) === String(trimestre)
            && n.type_evaluation === typeEvaluation
            && elevesDeLaClasse.some(function (e) { return String(e.id) === String(n.eleve); });
        });
        setNotesExistantes(filtrees);
        const initial = {};
        filtrees.forEach(function (n) { initial[n.eleve] = String(n.valeur); });
        setValeurs(initial);
      })
      .finally(function () { setChargementNotes(false); });
    // eslint-disable-next-line
  }, [classeId, matiereId, trimestre, typeEvaluation, token]);

  const cleVerrou = "notes_verrouillees_t" + trimestre;
  const estVerrouille = parametres ? !!parametres[cleVerrou] : false;

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    let enregistrees = 0;
    let echecs = 0;
    try {
      for (const eleve of elevesDeLaClasse) {
        const saisie = (valeurs[eleve.id] || "").trim();
        if (saisie === "") continue;
        const existante = notesExistantes.find(function (n) { return String(n.eleve) === String(eleve.id); });
        const donnees = {
          eleve: eleve.id, matiere: Number(matiereId),
          type_evaluation: typeEvaluation, trimestre: Number(trimestre),
          valeur: saisie,
        };
        try {
          if (existante) {
            await modifier("notes", existante.id, token, donnees);
          } else {
            await creer("notes", token, donnees);
          }
          enregistrees += 1;
        } catch (err) {
          echecs += 1;
        }
      }
      setMessage({
        type: echecs === 0 ? "succes" : "erreur",
        texte: enregistrees + " note(s) enregistree(s)" + (echecs > 0 ? ", " + echecs + " en erreur." : "."),
      });
    } finally {
      setEnCours(false);
    }
  };

  if (statut === "chargement") return <Spinner texte="Chargement..." />;
  if (statut === "refuse") return <Alerte>Impossible de charger la page de saisie des notes.</Alerte>;

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Pedagogie</span> Saisie des notes</div>

      {classes.length === 0 ? (
        <Alerte>
          {estAdmin ? "Aucune classe n'existe encore." : "Aucune classe ne vous est assignee pour le moment. Contactez l'administration."}
        </Alerte>
      ) : (
        <>
          <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.8rem" }}>
            <div className="mag-grid-2">
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="notes-classe">Classe</label>
                <select id="notes-classe" value={classeId} onChange={function (e) { setClasseId(e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                  <option value="">-- Choisir --</option>
                  {classes.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
                </select>
              </div>
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="notes-matiere">Matiere</label>
                <select id="notes-matiere" value={matiereId} onChange={function (e) { setMatiereId(e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                  <option value="">-- Choisir --</option>
                  {matieres.map(function (m) { return <option key={m.id} value={m.id}>{m.nom}</option>; })}
                </select>
              </div>
            </div>
            <div className="mag-grid-2">
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="notes-trimestre">Trimestre</label>
                <select id="notes-trimestre" value={trimestre} onChange={function (e) { setTrimestre(e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                  {TRIMESTRES.map(function (t) { return <option key={t.valeur} value={t.valeur}>{traduireTexte(t.label)}</option>; })}
                </select>
              </div>
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="notes-type-eval">Type d'evaluation</label>
                <select id="notes-type-eval" value={typeEvaluation} onChange={function (e) { setTypeEvaluation(e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                  {TYPES_EVALUATION.map(function (t) { return <option key={t.valeur} value={t.valeur}>{traduireTexte(t.label)}</option>; })}
                </select>
              </div>
            </div>
          </div>

          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

          {!filtresComplets ? (
            <div className="mag-card" style={{ textAlign: "center", padding: "2.5rem", border: "1px dashed var(--line)", color: "var(--ink-600)" }}>
              Choisissez une classe, une matiere, un trimestre et un type d'evaluation pour commencer la saisie.
            </div>
          ) : estVerrouille ? (
            <Alerte>Ce trimestre est verrouille par l'administration : les notes ne peuvent plus etre modifiees.</Alerte>
          ) : chargementNotes ? (
            <Spinner texte="Chargement des notes..." />
          ) : elevesDeLaClasse.length === 0 ? (
            <Alerte>Aucun eleve dans cette classe.</Alerte>
          ) : (
            <form onSubmit={soumettre} className="react-fade-in">
              <div className="mag-table-wrap">
                <table className="mag-table mag-table-pro">
                  <thead><tr><th>Eleve</th><th style={{ width: "160px" }}>Note / 20</th></tr></thead>
                  <tbody>
                    {elevesDeLaClasse.map(function (eleve) {
                      return (
                        <tr key={eleve.id}>
                          <td>{eleve.nom} {eleve.prenom}</td>
                          <td>
                            <input
                              type="number" min="0" max="20" step="0.25"
                              value={valeurs[eleve.id] || ""}
                              onChange={function (e) {
                                setValeurs(Object.assign({}, valeurs, { [eleve.id]: e.target.value }));
                              }}
                              aria-label={"Note de " + eleve.nom + " " + eleve.prenom}
                              style={{ width: "100px", padding: "0.4rem" }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.8rem", marginTop: "1.2rem" }} disabled={enCours}>
                {enCours ? <span className="react-spinner"></span> : "Enregistrer les notes"}
              </button>
            </form>
          )}
        </>
      )}
    </>
  );
}
