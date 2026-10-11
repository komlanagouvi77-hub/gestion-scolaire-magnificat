// src/pages/GestionAbsences.jsx
// Saisie des presences/absences par un Enseignant (ses classes uniquement)
// ou un Administrateur (toutes classes). Une case cochee = eleve absent ce
// jour-la. Reprend le meme principe que l'ancienne vue Django
// saisir_absences_view.
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, supprimer, recupererProfil } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

export default function GestionAbsences({ token, role }) {
  const estAdmin = role === "administrateur";
  const [classes, setClasses] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [statut, setStatut] = useState("chargement");

  const [classeId, setClasseId] = useState("");
  const [date, setDate] = useState(dateDuJour());

  const [absencesExistantes, setAbsencesExistantes] = useState([]);
  const [chargementAbsences, setChargementAbsences] = useState(false);
  const [saisie, setSaisie] = useState({});
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(function () {
    setStatut("chargement");
    const appels = estAdmin
      ? [lister("classes", token), lister("eleves", token)]
      : [recupererProfil(token), lister("eleves", token)];

    Promise.all(appels)
      .then(function (resultats) {
        setClasses(estAdmin ? resultats[0] : (resultats[0].classes || []));
        setEleves(resultats[1]);
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

  const filtresComplets = classeId && date;

  useEffect(function () {
    if (!filtresComplets) { setAbsencesExistantes([]); setSaisie({}); return; }
    setChargementAbsences(true);
    lister("absences", token)
      .then(function (toutes) {
        const filtrees = toutes.filter(function (a) {
          return a.date === date && elevesDeLaClasse.some(function (e) { return String(e.id) === String(a.eleve); });
        });
        setAbsencesExistantes(filtrees);
        const initial = {};
        filtrees.forEach(function (a) {
          initial[a.eleve] = { absent: true, justifiee: !!a.justifiee, motif: a.motif || "" };
        });
        setSaisie(initial);
      })
      .finally(function () { setChargementAbsences(false); });
    // eslint-disable-next-line
  }, [classeId, date, token]);

  const basculerAbsent = function (eleveId) {
    setSaisie(function (etat) {
      const courant = etat[eleveId];
      if (courant && courant.absent) {
        const copie = Object.assign({}, etat);
        delete copie[eleveId];
        return copie;
      }
      return Object.assign({}, etat, { [eleveId]: { absent: true, justifiee: false, motif: "" } });
    });
  };

  const modifierChamp = function (eleveId, champ, valeur) {
    setSaisie(function (etat) {
      return Object.assign({}, etat, { [eleveId]: Object.assign({}, etat[eleveId], { [champ]: valeur }) });
    });
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    let compteur = 0;
    try {
      for (const eleve of elevesDeLaClasse) {
        const desire = saisie[eleve.id];
        const existante = absencesExistantes.find(function (a) { return String(a.eleve) === String(eleve.id); });

        if (desire && desire.absent) {
          const donnees = { eleve: eleve.id, date: date, justifiee: !!desire.justifiee, motif: desire.motif || "" };
          if (existante) {
            if (existante.justifiee !== donnees.justifiee || (existante.motif || "") !== donnees.motif) {
              await modifier("absences", existante.id, token, donnees);
              compteur += 1;
            }
          } else {
            await creer("absences", token, donnees);
            compteur += 1;
          }
        } else if (existante) {
          await supprimer("absences", existante.id, token);
          compteur += 1;
        }
      }
      setMessage({ type: "succes", texte: "Presences enregistrees (" + compteur + " changement(s))." });
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  if (statut === "chargement") return <Spinner texte="Chargement..." />;
  if (statut === "refuse") return <Alerte>Impossible de charger la page de saisie des absences.</Alerte>;

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Pedagogie</span> Absences &amp; presences</div>

      {classes.length === 0 ? (
        <Alerte>
          {estAdmin ? "Aucune classe n'existe encore." : "Aucune classe ne vous est assignee pour le moment. Contactez l'administration."}
        </Alerte>
      ) : (
        <>
          <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.8rem" }}>
            <div className="mag-grid-2">
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="abs-classe">Classe</label>
                <select id="abs-classe" value={classeId} onChange={function (e) { setClasseId(e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                  <option value="">-- Choisir --</option>
                  {classes.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
                </select>
              </div>
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="abs-date">Date</label>
                <input id="abs-date" type="date" value={date} onChange={function (e) { setDate(e.target.value); }} />
              </div>
            </div>
          </div>

          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

          {!filtresComplets ? (
            <div className="mag-card" style={{ textAlign: "center", padding: "2.5rem", border: "1px dashed var(--line)", color: "var(--ink-600)" }}>
              Choisissez une classe et une date pour saisir les presences.
            </div>
          ) : chargementAbsences ? (
            <Spinner texte="Chargement des presences..." />
          ) : elevesDeLaClasse.length === 0 ? (
            <Alerte>Aucun eleve dans cette classe.</Alerte>
          ) : (
            <form onSubmit={soumettre} className="react-fade-in">
              <div className="mag-table-wrap">
                <table className="mag-table mag-table-pro">
                  <thead>
                    <tr>
                      <th>Eleve</th>
                      <th style={{ textAlign: "center" }}>Absent</th>
                      <th style={{ textAlign: "center" }}>Justifiee</th>
                      <th>Motif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elevesDeLaClasse.map(function (eleve) {
                      const etat = saisie[eleve.id];
                      const estAbsent = !!(etat && etat.absent);
                      return (
                        <tr key={eleve.id}>
                          <td>{eleve.nom} {eleve.prenom}</td>
                          <td style={{ textAlign: "center" }}>
                            <input type="checkbox" checked={estAbsent} onChange={function () { basculerAbsent(eleve.id); }} aria-label={"Absent : " + eleve.nom + " " + eleve.prenom} />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox" checked={estAbsent && !!etat.justifiee} disabled={!estAbsent}
                              onChange={function (e) { modifierChamp(eleve.id, "justifiee", e.target.checked); }}
                              aria-label={"Justifiee : " + eleve.nom + " " + eleve.prenom}
                            />
                          </td>
                          <td>
                            <input
                              type="text" disabled={!estAbsent} value={(etat && etat.motif) || ""}
                              onChange={function (e) { modifierChamp(eleve.id, "motif", e.target.value); }}
                              placeholder={estAbsent ? "Ex: Maladie" : ""}
                              style={{ width: "100%", padding: "0.35rem" }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.8rem", marginTop: "1.2rem" }} disabled={enCours}>
                {enCours ? <span className="react-spinner"></span> : "Enregistrer les presences"}
              </button>
            </form>
          )}
        </>
      )}
    </>
  );
}
