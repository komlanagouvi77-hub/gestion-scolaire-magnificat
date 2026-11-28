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

function trierClassesOrdreScolaire(liste) {
  if (!Array.isArray(liste)) return [];
  const ordreNiveaux = [
    // Primaire
    "ci", "cp1", "cp2", "ce1", "ce2", "cm1", "cm2",
    // Collège (6e -> 3e)
    "6e", "6eme", "6ème", "sixieme", "sixième",
    "5e", "5eme", "5ème", "cinquieme", "cinquième",
    "4e", "4eme", "4ème", "quatrieme", "quatrième",
    "3e", "3eme", "3ème", "troisieme", "troisième",
    // Lycée (2nde -> Tle)
    "2nde", "seconde", "2nd", "2e",
    "1ere", "1ère", "premiere", "première", "1re",
    "tle", "terminale"
  ];

  return [...liste].sort(function (a, b) {
    const nomA = (a.nom || "").toLowerCase().trim();
    const nomB = (b.nom || "").toLowerCase().trim();

    const trouverIndex = function (nom, niveau) {
      const nivStr = (niveau || "").toLowerCase().trim();
      for (let i = 0; i < ordreNiveaux.length; i++) {
        const prefixe = ordreNiveaux[i];
        if (nom.startsWith(prefixe) || (nivStr && nivStr.includes(prefixe))) {
          return i;
        }
      }
      return 999;
    };

    const indexA = trouverIndex(nomA, a.niveau);
    const indexB = trouverIndex(nomB, b.niveau);

    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return nomA.localeCompare(nomB, "fr", { numeric: true });
  });
}

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

function VueNotesParent({ token }) {
  const [enfants, setEnfants] = useState([]);
  const [eleveId, setEleveId] = useState("");
  const [trimestre, setTrimestre] = useState("1");
  const [notes, setNotes] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [statut, setStatut] = useState("chargement");

  useEffect(function () {
    setStatut("chargement");
    Promise.all([lister("eleves", token), lister("matieres", token)])
      .then(function (res) {
        const listeEnfants = Array.isArray(res[0]) ? res[0] : (res[0].results || []);
        setEnfants(listeEnfants);
        if (listeEnfants.length > 0) {
          setEleveId(String(listeEnfants[0].id));
        }
        setMatieres(res[1] || []);
        setStatut("ok");
      })
      .catch(function () { setStatut("refuse"); });
  }, [token]);

  const enfantActif = useMemo(function () {
    return enfants.find(function (e) { return String(e.id) === String(eleveId); }) || enfants[0] || null;
  }, [enfants, eleveId]);

  useEffect(function () {
    if (!enfantActif) { setNotes([]); return; }
    lister("notes", token)
      .then(function (res) {
        const toutes = Array.isArray(res) ? res : (res.results || []);
        const filtrees = toutes.filter(function (n) {
          return String(n.eleve) === String(enfantActif.id) && String(n.trimestre) === String(trimestre);
        });
        setNotes(filtrees);
      })
      .catch(function () {});
  }, [enfantActif, trimestre, token]);

  const lignesMatieres = useMemo(function () {
    const map = {};
    notes.forEach(function (n) {
      const mid = String(n.matiere);
      if (!map[mid]) map[mid] = { devoirs: [], interrogations: [], compositions: [] };
      const val = Number(n.valeur);
      if (n.type_evaluation === "composition") map[mid].compositions.push(val);
      else if (n.type_evaluation === "interrogation") map[mid].interrogations.push(val);
      else map[mid].devoirs.push(val);
    });

    return Object.keys(map).map(function (mid) {
      const matObj = matieres.find(function (m) { return String(m.id) === String(mid); }) || { nom: "Matière #" + mid, coefficient: 1 };
      const data = map[mid];
      const cc = [...data.interrogations, ...data.devoirs];
      const moyCC = cc.length > 0 ? (cc.reduce((a, b) => a + b, 0) / cc.length) : null;
      const compo = data.compositions.length > 0 ? data.compositions[0] : null;

      let moyMatiere = null;
      if (moyCC !== null && compo !== null) moyMatiere = (moyCC + compo) / 2;
      else if (moyCC !== null) moyMatiere = moyCC;
      else if (compo !== null) moyMatiere = compo;

      let ensNom = "Enseignant";
      let ensTel = "";
      if (enfantActif && enfantActif.enseignants_details) {
        const ensTrouve = enfantActif.enseignants_details.find(function (ed) {
          return ed.specialite && (ed.specialite.toLowerCase().includes(matObj.nom.toLowerCase()) || matObj.nom.toLowerCase().includes(ed.specialite.toLowerCase()));
        });
        if (ensTrouve) {
          ensNom = ensTrouve.nom;
          ensTel = ensTrouve.telephone || "";
        }
      }

      return {
        matiereId: mid,
        nomMatiere: matObj.nom,
        coef: matObj.coefficient || 1,
        devoirs: data.devoirs,
        interrogations: data.interrogations,
        composition: compo,
        moyCC: moyCC !== null ? moyCC.toFixed(2) : "-",
        moyMatiere: moyMatiere !== null ? moyMatiere.toFixed(2) : "-",
        mention: moyMatiere !== null ? (moyMatiere >= 16 ? "Très bien" : moyMatiere >= 14 ? "Bien" : moyMatiere >= 12 ? "Assez bien" : moyMatiere >= 10 ? "Passable" : "Insuffisant") : "-",
        enseignant: ensNom,
        telephone: ensTel,
      };
    });
  }, [notes, matieres, enfantActif]);

  const stats = useMemo(function () {
    let pts = 0, coefs = 0;
    lignesMatieres.forEach(function (l) {
      if (l.moyMatiere !== "-") {
        pts += Number(l.moyMatiere) * l.coef;
        coefs += l.coef;
      }
    });
    return {
      mg: coefs > 0 ? (pts / coefs).toFixed(2) : null,
      totalNotes: notes.length,
      nbMatieres: lignesMatieres.length,
    };
  }, [lignesMatieres, notes]);

  if (statut === "chargement") return <Spinner texte="Chargement des notes de vos enfants..." />;
  if (statut === "refuse") return <Alerte>Impossible de charger le relevé des notes.</Alerte>;

  return (
    <>
      <div className="mag-page-title-ligne">
        <h1 className="mag-page-title">Relevé des notes</h1>
        <button
          type="button"
          className="mag-btn-primary"
          style={{ width: "auto", padding: "0.55rem 1.2rem", fontSize: "0.85rem" }}
          onClick={function () { window.location.hash = "/bulletins"; }}
        >
          Voir les bulletins PDF
        </button>
      </div>

      {enfants.length > 1 ? (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.2rem" }}>
          {enfants.map(function (e) {
            const actif = String(e.id) === String(enfantActif ? enfantActif.id : "");
            return (
              <button
                key={e.id}
                type="button"
                onClick={function () { setEleveId(String(e.id)); }}
                className={actif ? "mag-btn-primary" : "btn-mag-outline"}
                style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem", borderRadius: "6px" }}
              >
                {e.prenom} {e.nom} ({e.classe_nom ? e.classe_nom.split(" (")[0] : "Classe"})
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mag-card" style={{ marginBottom: "1.5rem", padding: "0.9rem 1.2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <label htmlFor="par-trimestre" style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--ink-700)" }}>Période :</label>
            <select
              id="par-trimestre"
              value={trimestre}
              onChange={function (e) { setTrimestre(e.target.value); }}
              style={{ padding: "0.45rem 0.85rem", borderRadius: "6px", border: "1px solid var(--line)", background: "#FFF", fontSize: "0.88rem" }}
            >
              <option value="1">1er trimestre</option>
              <option value="2">2e trimestre</option>
              <option value="3">3e trimestre</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", fontSize: "0.88rem" }}>
            <div>
              <span style={{ color: "var(--ink-600)", marginRight: "0.4rem" }}>Moyenne générale :</span>
              <strong style={{ color: "var(--indigo-950)", fontSize: "1rem" }}>
                {stats.mg ? stats.mg.replace(".", ",") + " / 20" : "Non calculée"}
              </strong>
            </div>
            <span style={{ color: "var(--line)" }}>|</span>
            <div>
              <span style={{ color: "var(--ink-600)", marginRight: "0.4rem" }}>Notes enregistrées :</span>
              <strong style={{ color: "var(--indigo-950)" }}>
                {stats.totalNotes} {stats.totalNotes > 1 ? "évaluations" : "évaluation"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {lignesMatieres.length === 0 ? (
        <div className="mag-card" style={{ textAlign: "center", padding: "2.5rem", border: "1px dashed var(--line)", color: "var(--ink-600)" }}>
          Aucune note n'a encore été enregistrée pour {enfantActif ? enfantActif.prenom + " " + enfantActif.nom : "cet élève"} au {trimestre === "1" ? "1er trimestre" : trimestre + "e trimestre"}.
        </div>
      ) : (
        <div className="mag-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="mag-table">
            <thead>
              <tr>
                <th style={{ width: "24%" }}>Discipline</th>
                <th style={{ textAlign: "center", width: "14%" }}>Interrogations</th>
                <th style={{ textAlign: "center", width: "14%" }}>Devoirs</th>
                <th style={{ textAlign: "center", width: "12%" }}>Composition</th>
                <th style={{ textAlign: "center", width: "12%" }}>Moyenne / 20</th>
                <th style={{ textAlign: "center", width: "11%" }}>Mention</th>
                <th style={{ width: "13%" }}>Enseignant</th>
              </tr>
            </thead>
            <tbody>
              {lignesMatieres.map(function (ligne) {
                return (
                  <tr key={ligne.matiereId}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--ink-900)" }}>{ligne.nomMatiere}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--ink-500)" }}>Coef. {ligne.coef}</div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {ligne.interrogations.length > 0 ? (
                        ligne.interrogations.map(function (v) { return v.toFixed(2).replace(".", ","); }).join(", ")
                      ) : (
                        <span style={{ color: "var(--ink-400)" }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {ligne.devoirs.length > 0 ? (
                        ligne.devoirs.map(function (v) { return v.toFixed(2).replace(".", ","); }).join(", ")
                      ) : (
                        <span style={{ color: "var(--ink-400)" }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {ligne.composition !== null ? ligne.composition.toFixed(2).replace(".", ",") : <span style={{ color: "var(--ink-400)" }}>-</span>}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <strong style={{ color: "var(--indigo-950)" }}>
                        {ligne.moyMatiere !== "-" ? ligne.moyMatiere.replace(".", ",") : "-"}
                      </strong>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {ligne.mention !== "-" ? (
                        <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--ink-700)" }}>
                          {ligne.mention}
                        </span>
                      ) : (
                        <span style={{ color: "var(--ink-400)" }}>-</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--ink-900)" }}>
                        {ligne.enseignant}
                      </div>
                      {ligne.telephone ? (
                        <div style={{ fontSize: "0.78rem", color: "var(--ink-600)", marginTop: "2px" }}>
                          {ligne.telephone}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function GestionNotes({ token, role }) {
  if (role === "parent") {
    return <VueNotesParent token={token} />;
  }

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

  const classesTriees = useMemo(function () {
    return trierClassesOrdreScolaire(classes);
  }, [classes]);

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
      <div className="mag-page-title">
        <h1>{traduireTexte("Saisie des notes")}</h1>
      </div>

      {classes.length === 0 ? (
        <Alerte>
          {estAdmin ? "Aucune classe n'existe encore." : "Aucune classe ne vous est assignée pour le moment. Contactez l'administration."}
        </Alerte>
      ) : (
        <>
          {/* Panneau de sélection de la classe, matière, période et type d'évaluation */}
          <div
            className="mag-panneau-form react-fade-in"
            style={{
              marginBottom: "1.5rem",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "1.2rem",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "1.2rem",
                alignItems: "flex-end",
              }}
            >
              <div className="mag-field" style={{ margin: 0 }}>
                <label
                  htmlFor="notes-classe"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                    display: "block",
                  }}
                >
                  Classe
                </label>
                <select
                  id="notes-classe"
                  value={classeId}
                  onChange={function (e) { setClasseId(e.target.value); }}
                  style={{
                    width: "100%",
                    height: "38px",
                    padding: "0 0.75rem",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    background: "#FFF",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    color: "#0F172A",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">-- Sélectionner la classe --</option>
                  {classesTriees.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
                </select>
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label
                  htmlFor="notes-matiere"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                    display: "block",
                  }}
                >
                  Matière
                </label>
                <select
                  id="notes-matiere"
                  value={matiereId}
                  onChange={function (e) { setMatiereId(e.target.value); }}
                  style={{
                    width: "100%",
                    height: "38px",
                    padding: "0 0.75rem",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    background: "#FFF",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    color: "#0F172A",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">-- Sélectionner la matière --</option>
                  {matieres.map(function (m) { return <option key={m.id} value={m.id}>{m.nom}</option>; })}
                </select>
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label
                  htmlFor="notes-trimestre"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                    display: "block",
                  }}
                >
                  Période
                </label>
                <select
                  id="notes-trimestre"
                  value={trimestre}
                  onChange={function (e) { setTrimestre(e.target.value); }}
                  style={{
                    width: "100%",
                    height: "38px",
                    padding: "0 0.75rem",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    background: "#FFF",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    color: "#0F172A",
                    boxSizing: "border-box",
                  }}
                >
                  {TRIMESTRES.map(function (t) { return <option key={t.valeur} value={t.valeur}>{traduireTexte(t.label)}</option>; })}
                </select>
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                    display: "block",
                  }}
                >
                  Type d'évaluation
                </label>
                <div
                  style={{
                    display: "flex",
                    background: "#F1F5F9",
                    padding: "3px",
                    borderRadius: "6px",
                    gap: "3px",
                    border: "1px solid #E2E8F0",
                    height: "38px",
                    boxSizing: "border-box",
                    alignItems: "center",
                  }}
                >
                  {TYPES_EVALUATION.map(function (t) {
                    const actif = typeEvaluation === t.valeur;
                    return (
                      <button
                        key={t.valeur}
                        type="button"
                        onClick={function () { setTypeEvaluation(t.valeur); }}
                        style={{
                          flex: 1,
                          height: "100%",
                          border: "none",
                          background: actif ? "#FFFFFF" : "transparent",
                          color: actif ? "#1E3A8A" : "#64748B",
                          borderRadius: "4px",
                          fontWeight: actif ? 700 : 500,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          boxShadow: actif ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                          whiteSpace: "nowrap",
                          padding: "0 0.4rem",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {t.label}
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
              {estVerrouille && !estAdmin ? (
                <div style={{ marginBottom: "1.2rem", padding: "0.85rem 1.2rem", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "var(--ink-800)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Lock size={16} color="#DC2626" />
                  <span><strong>{traduireTexte("Période clôturée")} :</strong> {traduireTexte("Ce trimestre est verrouillé par l'administration (consultation seule). Les notes déjà enregistrées sont affichées mais ne peuvent plus être modifiées.")}</span>
                </div>
              ) : null}

              {/* Tableau de saisie des notes */}
              <div className="mag-table-wrap" style={{ border: "1px solid #E2E8F0", borderRadius: "6px", overflow: "hidden" }}>
                <table className="mag-table mag-table-pro">
                  <thead>
                    <tr>
                      <th style={{ width: "170px", minWidth: "160px", whiteSpace: "nowrap" }}>Matricule</th>
                      <th style={{ minWidth: "220px" }}>Nom &amp; Prénoms de l'élève</th>
                      <th style={{ width: "150px", textAlign: "center", whiteSpace: "nowrap" }}>Note / 20</th>
                      <th style={{ width: "150px", textAlign: "center", whiteSpace: "nowrap" }}>Mention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elevesDeLaClasse.map(function (eleve) {
                      const noteVal = valeurs[eleve.id] || "";
                      const mention = obtenirMention(noteVal);
                      const estDesactive = estVerrouille && !estAdmin;

                      return (
                        <tr key={eleve.id}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <span style={{ fontWeight: 600, color: "#334155", fontSize: "0.85rem", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
                              {(eleve.matricule || `ELEVE-${eleve.id}`).toUpperCase()}
                            </span>
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <div style={{ fontWeight: 600, color: "#0F172A" }}>
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
                                width: "100px",
                                textAlign: "center",
                                padding: "0.45rem",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                borderRadius: "6px",
                                border: "1px solid var(--line, #CBD5E1)",
                                background: estDesactive ? "#F1F5F9" : "#FFFFFF",
                                color: noteVal !== "" && parseFloat(noteVal) >= 10 ? "#15803D" : (noteVal !== "" ? "#DC2626" : "inherit"),
                              }}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {noteVal !== "" && mention ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "0.2rem 0.55rem",
                                  borderRadius: "4px",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  background: mention.fond,
                                  color: mention.couleur,
                                }}
                              >
                                {mention.texte}
                              </span>
                            ) : (
                              <span style={{ color: "var(--ink-400)", fontSize: "0.8rem" }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pied de tableau professionnel */}
              <div
                style={{
                  marginTop: "0.85rem",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                  padding: "0.85rem 1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", flexWrap: "wrap", fontSize: "0.88rem" }}>
                  <div>
                    <span style={{ color: "#64748B", marginRight: "0.45rem", fontWeight: 500 }}>
                      Moyenne de la classe :
                    </span>
                    <strong style={{ color: statsEvaluation.moyenne ? "#1E3A8A" : "#94A3B8", fontSize: "1rem" }}>
                      {statsEvaluation.moyenne ? (statsEvaluation.moyenne.replace(".", ",") + " / 20") : "-- / 20"}
                    </strong>
                  </div>
                  <span style={{ color: "#CBD5E1" }}>|</span>
                  <div>
                    <span style={{ color: "#64748B", marginRight: "0.45rem", fontWeight: 500 }}>
                      Notes saisies :
                    </span>
                    <strong style={{ color: "#0F172A" }}>
                      {statsEvaluation.count} / {statsEvaluation.total} élève{statsEvaluation.total > 1 ? "s" : ""}
                    </strong>
                  </div>
                  {statsEvaluation.moyenne ? (
                    <>
                      <span style={{ color: "#CBD5E1" }}>|</span>
                      <div>
                        <span style={{ color: "#64748B", marginRight: "0.45rem", fontWeight: 500 }}>
                          Taux de réussite :
                        </span>
                        <strong style={{ color: statsEvaluation.tauxReussite >= 50 ? "#16A34A" : "#DC2626" }}>
                          {statsEvaluation.tauxReussite}%
                        </strong>
                      </div>
                    </>
                  ) : null}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={enCours || (estVerrouille && !estAdmin)}
                    style={{
                      width: "auto",
                      background: "#1E3A8A",
                      color: "#FFFFFF",
                      border: "1px solid #1E3A8A",
                      padding: "0.55rem 1.6rem",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      borderRadius: "6px",
                      cursor: (enCours || (estVerrouille && !estAdmin)) ? "not-allowed" : "pointer",
                      opacity: (enCours || (estVerrouille && !estAdmin)) ? 0.6 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {enCours ? <span className="react-spinner"></span> : "Enregistrer les notes"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </>
      )}
    </>
  );
}
