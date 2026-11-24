// src/pages/GestionNotes.jsx
// Saisie des notes par un Enseignant (ses classes/matières) ou
// Consultation & Supervision par un Administrateur (toutes classes/matières).
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, recupererProfil, obtenirParametres } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import { traduireTexte } from "../localisation.js";
import Spinner from "../components/Spinner.jsx";
import { Lock, Info, CheckCircle2, ShieldCheck, BookOpen, ArrowRight, BarChart2 } from "lucide-react";

const TRIMESTRES = [
  { valeur: "1", label: "1er trimestre" },
  { valeur: "2", label: "2e trimestre" },
  { valeur: "3", label: "3e trimestre" },
];

const TYPES_EVALUATION = [
  { valeur: "devoir", label: "Devoir", etiquette: "Devoirs" },
  { valeur: "interrogation", label: "Interrogation", etiquette: "Interrogations" },
  { valeur: "composition", label: "Composition", etiquette: "Compositions" },
];

function obtenirMention(valeurStr) {
  if (!valeurStr || valeurStr === "") return null;
  const num = parseFloat(valeurStr);
  if (isNaN(num)) return null;
  if (num >= 16) return { texte: "Très bien", classe: "mag-badge-vert-vif", couleur: "#15803D", fond: "#DCFCE7" };
  if (num >= 14) return { texte: "Bien", classe: "mag-badge-vert", couleur: "#16A34A", fond: "#F0FDF4" };
  if (num >= 12) return { texte: "Assez bien", classe: "mag-badge-bleu", couleur: "#0284C7", fond: "#E0F2FE" };
  if (num >= 10) return { texte: "Passable", classe: "mag-badge-jaune", couleur: "#B45309", fond: "#FEF3C7" };
  return { texte: "Insuffisant", classe: "mag-badge-rouge", couleur: "#DC2626", fond: "#FEE2E2" };
}

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

  const [toutesNotesMatiere, setToutesNotesMatiere] = useState([]);
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
        let preselect = null;
        try {
          const brut = sessionStorage.getItem("mag_preselection_notes");
          if (brut) {
            preselect = JSON.parse(brut);
            sessionStorage.removeItem("mag_preselection_notes");
          }
        } catch (e) {}

        if (estAdmin) {
          const cls = resultats[0] || [];
          const mats = resultats[1] || [];
          setClasses(cls);
          setMatieres(mats);
          setEleves(resultats[2] || []);
          setParametres(resultats[3]);

          if (preselect && preselect.classeId) {
            setClasseId(String(preselect.classeId));
          } else if (cls.length === 1) {
            setClasseId(String(cls[0].id));
          }

          if (preselect && preselect.matiereId) {
            setMatiereId(String(preselect.matiereId));
          } else if (mats.length === 1) {
            setMatiereId(String(mats[0].id));
          }

          if (preselect && preselect.trimestre) {
            setTrimestre(String(preselect.trimestre));
          }
        } else {
          const profil = resultats[0] || {};
          const profClasses = profil.classes || [];
          let profMatieres = profil.matieres || [];

          // Filtrage intelligent par specialite si presente
          if (profil.specialite && profMatieres.length > 1) {
            const normaliser = function (s) {
              return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            };
            const specNorm = normaliser(profil.specialite);
            const specMatiere = profMatieres.filter(function (m) {
              const nomNorm = normaliser(m.nom);
              return nomNorm.includes(specNorm) || specNorm.includes(nomNorm);
            });
            if (specMatiere.length > 0) {
              profMatieres = specMatiere;
            }
          }

          setClasses(profClasses);
          setMatieres(profMatieres);
          setEleves(resultats[1] || []);
          setParametres(resultats[2]);

          if (preselect && preselect.classeId) {
            setClasseId(String(preselect.classeId));
          } else if (profClasses.length === 1) {
            setClasseId(String(profClasses[0].id));
          }

          if (preselect && preselect.matiereId) {
            setMatiereId(String(preselect.matiereId));
          } else if (profMatieres.length === 1) {
            setMatiereId(String(profMatieres[0].id));
          }

          if (preselect && preselect.trimestre) {
            setTrimestre(String(preselect.trimestre));
          }
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

  // Chargement global de toutes les notes pour cette combinaison Classe + Matière + Trimestre
  useEffect(function () {
    if (!classeId || !matiereId || !trimestre) {
      setToutesNotesMatiere([]);
      setNotesExistantes([]);
      setValeurs({});
      return;
    }
    setChargementNotes(true);
    lister("notes", token)
      .then(function (toutes) {
        const liste = Array.isArray(toutes) ? toutes : (toutes && Array.isArray(toutes.results) ? toutes.results : []);
        const filtreesClasseMatiere = liste.filter(function (n) {
          return String(n.matiere) === String(matiereId)
            && String(n.trimestre) === String(trimestre)
            && elevesDeLaClasse.some(function (e) { return String(e.id) === String(n.eleve); });
        });
        setToutesNotesMatiere(filtreesClasseMatiere);

        // Si l'évaluation active n'a pas de notes mais qu'une autre en a, basculer intelligemment
        const nbParType = {
          devoir: filtreesClasseMatiere.filter(function (n) { return n.type_evaluation === "devoir"; }).length,
          interrogation: filtreesClasseMatiere.filter(function (n) { return n.type_evaluation === "interrogation"; }).length,
          composition: filtreesClasseMatiere.filter(function (n) { return n.type_evaluation === "composition"; }).length,
        };

        let typeCible = typeEvaluation;
        if (nbParType[typeCible] === 0) {
          if (nbParType.devoir > 0) typeCible = "devoir";
          else if (nbParType.composition > 0) typeCible = "composition";
          else if (nbParType.interrogation > 0) typeCible = "interrogation";
        }
        if (typeCible !== typeEvaluation) {
          setTypeEvaluation(typeCible);
        }

        const filtreesType = filtreesClasseMatiere.filter(function (n) {
          return n.type_evaluation === typeCible;
        });
        setNotesExistantes(filtreesType);
        const initial = {};
        filtreesType.forEach(function (n) { initial[n.eleve] = String(n.valeur); });
        setValeurs(initial);
      })
      .finally(function () { setChargementNotes(false); });
    // eslint-disable-next-line
  }, [classeId, matiereId, trimestre, token]);

  // Mise à jour des valeurs lorsque l'utilisateur change le type d'évaluation manuellement
  useEffect(function () {
    const filtreesType = toutesNotesMatiere.filter(function (n) {
      return n.type_evaluation === typeEvaluation;
    });
    setNotesExistantes(filtreesType);
    const initial = {};
    filtreesType.forEach(function (n) { initial[n.eleve] = String(n.valeur); });
    setValeurs(initial);
  }, [typeEvaluation, toutesNotesMatiere]);

  const statsEvaluation = useMemo(function () {
    const notesNums = Object.values(valeurs)
      .map(function (v) { return parseFloat(v); })
      .filter(function (v) { return !isNaN(v); });
    const count = notesNums.length;
    if (count === 0) return { count: 0, total: elevesDeLaClasse.length, moyenne: null, tauxReussite: 0 };
    const somme = notesNums.reduce(function (acc, val) { return acc + val; }, 0);
    const moyenne = (somme / count).toFixed(2);
    const reussite = notesNums.filter(function (v) { return v >= 10; }).length;
    const tauxReussite = Math.round((reussite / count) * 100);
    return { count: count, total: elevesDeLaClasse.length, moyenne: moyenne, tauxReussite: tauxReussite };
  }, [valeurs, elevesDeLaClasse]);

  const compteurParType = useMemo(function () {
    return {
      devoir: toutesNotesMatiere.filter(function (n) { return n.type_evaluation === "devoir"; }).length,
      interrogation: toutesNotesMatiere.filter(function (n) { return n.type_evaluation === "interrogation"; }).length,
      composition: toutesNotesMatiere.filter(function (n) { return n.type_evaluation === "composition"; }).length,
    };
  }, [toutesNotesMatiere]);

  const cleVerrou = "notes_verrouillees_t" + trimestre;
  const estVerrouille = parametres ? !!parametres[cleVerrou] : false;

  const soumettre = async function (evt) {
    evt.preventDefault();
    if (estVerrouille && !estAdmin) return;
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
      if (enregistrees > 0) {
        lister("notes", token).then(function (toutes) {
          const liste = Array.isArray(toutes) ? toutes : (toutes && Array.isArray(toutes.results) ? toutes.results : []);
          const filtrees = liste.filter(function (n) {
            return String(n.matiere) === String(matiereId)
              && String(n.trimestre) === String(trimestre)
              && elevesDeLaClasse.some(function (e) { return String(e.id) === String(n.eleve); });
          });
          setToutesNotesMatiere(filtrees);
          const filtreesType = filtrees.filter(function (n) { return n.type_evaluation === typeEvaluation; });
          setNotesExistantes(filtreesType);
        }).catch(function () {});
      }
      setMessage({
        type: echecs === 0 ? "succes" : "erreur",
        texte: enregistrees + " note(s) enregistrée(s)" + (echecs > 0 ? ", " + echecs + " en erreur." : " avec succès."),
      });
    } finally {
      setEnCours(false);
    }
  };

  if (statut === "chargement") return <Spinner texte="Chargement de l'espace d'évaluation..." />;
  if (statut === "refuse") return <Alerte>Impossible de charger la gestion des notes.</Alerte>;

  return (
    <>
      <div className="mag-page-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="eyebrow">{estAdmin ? "Administration Pédagogique" : "Espace Enseignant"}</span>
          <h1>{estAdmin ? "Consultation & Supervision des notes" : "Saisie des notes"}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {estAdmin ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", borderRadius: "8px", background: "rgba(2, 132, 199, 0.1)", color: "#0284C7", fontSize: "0.82rem", fontWeight: 700 }}>
              <ShieldCheck size={15} /> Supervision Direction
            </span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", borderRadius: "8px", background: "rgba(22, 163, 74, 0.1)", color: "#16A34A", fontSize: "0.82rem", fontWeight: 700 }}>
              <BookOpen size={15} /> Saisie Pédagogique Ouverte
            </span>
          )}
        </div>
      </div>

      {estAdmin ? (
        <div className="mag-card" style={{ marginBottom: "1.2rem", padding: "0.9rem 1.2rem", background: "linear-gradient(135deg, rgba(2, 132, 199, 0.05), rgba(79, 70, 229, 0.05))" }}>
          <div style={{ fontSize: "0.86rem", color: "var(--ink-700)", lineHeight: 1.5 }}>
            <strong>Mode supervision académique :</strong> Vous visualisez en temps réel les notes saisies par le corps professoral. Vous pouvez inspecter les évaluations, contrôler les moyennes de classe et intervenir pour des régularisations exceptionnelles.
          </div>
        </div>
      ) : (
        <div className="mag-card" style={{ marginBottom: "1.2rem", padding: "0.9rem 1.2rem", background: "rgba(248, 250, 252, 0.8)" }}>
          <div style={{ fontSize: "0.86rem", color: "var(--ink-700)", lineHeight: 1.5 }}>
            <strong>Saisie des évaluations :</strong> Choisissez votre classe et votre matière, puis sélectionnez le type d'évaluation (Devoir, Interrogation ou Composition) pour enregistrer les notes de vos élèves.
          </div>
        </div>
      )}

      {classes.length === 0 ? (
        <Alerte>
          {estAdmin ? "Aucune classe n'existe encore." : "Aucune classe ne vous est assignée pour le moment. Contactez l'administration."}
        </Alerte>
      ) : (
        <>
          {/* Panneau de sélection de la classe et matière */}
          <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.5rem" }}>
            <div className="mag-grid-2">
              <div className="mag-field">
                <label htmlFor="notes-classe">Classe</label>
                <select id="notes-classe" value={classeId} onChange={function (e) { setClasseId(e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px", fontWeight: 600 }}>
                  <option value="">-- Sélectionner la classe --</option>
                  {classes.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
                </select>
              </div>
              <div className="mag-field">
                <label htmlFor="notes-matiere">Matière</label>
                <select id="notes-matiere" value={matiereId} onChange={function (e) { setMatiereId(e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px", fontWeight: 600 }}>
                  <option value="">-- Sélectionner la matière --</option>
                  {matieres.map(function (m) { return <option key={m.id} value={m.id}>{m.nom}</option>; })}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginTop: "1rem", borderTop: "1px solid var(--line, #E2E8F0)", paddingTop: "1rem" }}>
              <div>
                <label htmlFor="notes-trimestre" style={{ fontSize: "0.82rem", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>Période</label>
                <select id="notes-trimestre" value={trimestre} onChange={function (e) { setTrimestre(e.target.value); }} style={{ padding: "0.55rem 0.8rem", border: "1px solid var(--line)", borderRadius: "6px", fontWeight: 600 }}>
                  {TRIMESTRES.map(function (t) { return <option key={t.valeur} value={t.valeur}>{traduireTexte(t.label)}</option>; })}
                </select>
              </div>

              {/* Onglets interactifs des types d'évaluation avec comptage en temps réel */}
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>Type d'évaluation</label>
                <div style={{ display: "inline-flex", background: "var(--line, #E2E8F0)", padding: "3px", borderRadius: "8px", gap: "2px" }}>
                  {TYPES_EVALUATION.map(function (t) {
                    const actif = typeEvaluation === t.valeur;
                    const count = compteurParType[t.valeur] || 0;
                    return (
                      <button
                        key={t.valeur}
                        type="button"
                        onClick={function () { setTypeEvaluation(t.valeur); }}
                        style={{
                          border: "none",
                          background: actif ? "#FFFFFF" : "transparent",
                          color: actif ? "var(--indigo-950)" : "var(--ink-600)",
                          padding: "0.45rem 0.9rem",
                          borderRadius: "6px",
                          fontWeight: actif ? 800 : 600,
                          fontSize: "0.84rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          boxShadow: actif ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>{t.label}</span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "10px",
                            background: count > 0 ? (actif ? "rgba(22, 163, 74, 0.15)" : "rgba(22, 163, 74, 0.1)") : "rgba(100, 116, 139, 0.1)",
                            color: count > 0 ? "#15803D" : "var(--ink-500)",
                            fontWeight: 700,
                          }}
                        >
                          {count > 0 ? `${count} noté${count > 1 ? "s" : ""}` : "0"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

          {!classeId || !matiereId ? (
            <div className="mag-card" style={{ textAlign: "center", padding: "2.5rem", border: "1px dashed var(--line)", color: "var(--ink-600)" }}>
              Veuillez sélectionner une classe et une matière pour afficher la grille des notes.
            </div>
          ) : chargementNotes ? (
            <Spinner texte={traduireTexte("Chargement des notes...")} />
          ) : elevesDeLaClasse.length === 0 ? (
            <Alerte>{traduireTexte("Aucun élève dans cette classe.")}</Alerte>
          ) : (
            <form onSubmit={soumettre} className="react-fade-in">
              {/* Bannière de statistiques instantanées de l'évaluation */}
              <div className="mag-card" style={{ marginBottom: "1.2rem", padding: "1rem 1.4rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", fontWeight: 600 }}>Effectif noté</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--indigo-950)" }}>
                      {statsEvaluation.count} / {statsEvaluation.total} élèves
                    </div>
                  </div>
                  <div style={{ width: "1px", height: "30px", background: "var(--line, #E2E8F0)" }}></div>
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", fontWeight: 600 }}>Moyenne de l'évaluation</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: statsEvaluation.moyenne && parseFloat(statsEvaluation.moyenne) >= 10 ? "#16A34A" : "var(--indigo-950)" }}>
                      {statsEvaluation.moyenne !== null ? `${statsEvaluation.moyenne} / 20` : "-"}
                    </div>
                  </div>
                  <div style={{ width: "1px", height: "30px", background: "var(--line, #E2E8F0)" }}></div>
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", fontWeight: 600 }}>Taux de réussite (≥ 10)</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: statsEvaluation.tauxReussite >= 50 ? "#16A34A" : "#DC2626" }}>
                      {statsEvaluation.count > 0 ? `${statsEvaluation.tauxReussite}%` : "-"}
                    </div>
                  </div>
                </div>

                {estAdmin ? (
                  <button
                    type="button"
                    onClick={function () { window.location.hash = "/bulletins"; }}
                    className="btn-mag-outline"
                    style={{ fontSize: "0.82rem", padding: "0.45rem 0.9rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <BarChart2 size={14} /> Délibérations &amp; Bulletins de classe <ArrowRight size={14} />
                  </button>
                ) : null}
              </div>

              {estVerrouille && !estAdmin ? (
                <div style={{ marginBottom: "1.2rem", padding: "0.85rem 1.2rem", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "var(--ink-800)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Lock size={16} color="#DC2626" />
                  <span><strong>{traduireTexte("Période clôturée")} :</strong> {traduireTexte("Ce trimestre est verrouillé par l'administration (consultation seule). Les notes déjà enregistrées sont affichées mais ne peuvent plus être modifiées.")}</span>
                </div>
              ) : null}

              {/* Tableau épuré des notes individuelles */}
              <div className="mag-table-wrap">
                <table className="mag-table mag-table-pro">
                  <thead>
                    <tr>
                      <th style={{ width: "120px" }}>Matricule</th>
                      <th>Nom &amp; Prénoms de l'élève</th>
                      <th style={{ width: "160px", textAlign: "center" }}>Note / 20</th>
                      <th style={{ width: "160px", textAlign: "center" }}>Mention</th>
                      <th style={{ width: "130px", textAlign: "center" }}>État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elevesDeLaClasse.map(function (eleve) {
                      const noteVal = valeurs[eleve.id] || "";
                      const mention = obtenirMention(noteVal);
                      const aDejaUneNote = notesExistantes.some(function (n) { return String(n.eleve) === String(eleve.id); });
                      const estDesactive = estVerrouille && !estAdmin;

                      return (
                        <tr key={eleve.id}>
                          <td>
                            <span className="mag-badge" style={{ background: "rgba(100, 116, 139, 0.08)", color: "var(--ink-700)", fontWeight: 700, fontSize: "0.78rem" }}>
                              {eleve.matricule || `ELEVE-${eleve.id}`}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: "var(--ink-900)" }}>
                              {eleve.nom} {eleve.prenom}
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.25"
                              value={noteVal}
                              disabled={estDesactive}
                              onChange={function (e) {
                                const v = e.target.value;
                                setValeurs(function (prev) {
                                  const n = Object.assign({}, prev);
                                  n[eleve.id] = v;
                                  return n;
                                });
                              }}
                              placeholder="-- / 20"
                              style={{
                                width: "110px",
                                textAlign: "center",
                                padding: "0.45rem",
                                fontWeight: 800,
                                fontSize: "1rem",
                                borderRadius: "8px",
                                border: noteVal !== "" ? "2px solid #0284C7" : "1px solid var(--line, #CBD5E1)",
                                background: estDesactive ? "#F1F5F9" : "#FFFFFF",
                                color: noteVal !== "" && parseFloat(noteVal) >= 10 ? "#15803D" : (noteVal !== "" ? "#DC2626" : "inherit"),
                              }}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {mention ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "0.25rem 0.6rem",
                                  borderRadius: "12px",
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                  background: mention.fond,
                                  color: mention.couleur,
                                }}
                              >
                                {mention.texte}
                              </span>
                            ) : (
                              <span style={{ color: "var(--ink-400)", fontSize: "0.8rem" }}>En attente</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {aDejaUneNote ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#16A34A", fontSize: "0.78rem", fontWeight: 700 }}>
                                <CheckCircle2 size={14} /> Enregistrée
                              </span>
                            ) : (
                              <span style={{ color: "var(--ink-400)", fontSize: "0.78rem" }}>Non saisie</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bouton d'action adapté au rôle */}
              <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                {estAdmin ? (
                  <button
                    type="submit"
                    className="mag-btn-primary"
                    disabled={enCours}
                    style={{ background: "#0284C7", borderColor: "#0284C7", padding: "0.6rem 1.6rem", fontWeight: 700 }}
                  >
                    {enCours ? <span className="react-spinner"></span> : "Enregistrer les modifications (Supervision)"}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="mag-btn-primary"
                    disabled={enCours || estVerrouille}
                    style={{ background: "#16A34A", borderColor: "#16A34A", padding: "0.6rem 1.8rem", fontWeight: 800 }}
                  >
                    {enCours ? <span className="react-spinner"></span> : "Enregistrer mes notes"}
                  </button>
                )}
              </div>
            </form>
          )}
        </>
      )}
    </>
  );
}
