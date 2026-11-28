// src/pages/EmploiDuTemps.jsx
// Emploi du temps structuré : Grille planning hebdomadaire avec filtres par classe et par enseignant,
// détection automatique de conflits d'horaires et d'attribution, et vue imprimable / PDF.
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, supprimer } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import { traduireTexte } from "../localisation.js";
import { Printer, Clock, Calendar, MapPin, User, BookOpen, Pencil, Trash2, Plus, AlertTriangle } from "lucide-react";

const JOURS = [
  { valeur: "lundi", label: "Lundi" },
  { valeur: "mardi", label: "Mardi" },
  { valeur: "mercredi", label: "Mercredi" },
  { valeur: "jeudi", label: "Jeudi" },
  { valeur: "vendredi", label: "Vendredi" },
  { valeur: "samedi", label: "Samedi" },
];

const COULEURS_MATIERE = [
  { bordure: "#1E3A8A", fond: "#EFF6FF", texte: "#1E3A8A" }, // Bleu marine
  { bordure: "#0D9488", fond: "#F0FDFA", texte: "#0F766E" }, // Sarcelle
  { bordure: "#16A34A", fond: "#F0FDF4", texte: "#15803D" }, // Vert
  { bordure: "#D97706", fond: "#FFFBEB", texte: "#B45309" }, // Ambre
  { bordure: "#7C3AED", fond: "#F5F3FF", texte: "#6D28D9" }, // Violet
  { bordure: "#C026D3", fond: "#FDF4FF", texte: "#A21CAF" }, // Fuchsia
  { bordure: "#EA580C", fond: "#FFF7ED", texte: "#C2410C" }, // Orange
  { bordure: "#0284C7", fond: "#F0F9FF", texte: "#0369A1" }, // Ciel
];

function stylePourMatiere(nom) {
  let somme = 0;
  for (let i = 0; i < (nom || "").length; i++) somme += nom.charCodeAt(i);
  return COULEURS_MATIERE[somme % COULEURS_MATIERE.length];
}

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

function formaterNomClasse(classeNomBrut) {
  if (!classeNomBrut) return "";
  return classeNomBrut.split(" (")[0].trim();
}

function convertirMinutes(heureStr) {
  if (!heureStr) return 0;
  const parties = heureStr.slice(0, 5).split(":");
  return parseInt(parties[0], 10) * 60 + parseInt(parties[1] || "0", 10);
}

function chevauche(d1, f1, d2, f2) {
  const mD1 = convertirMinutes(d1);
  const mF1 = convertirMinutes(f1);
  const mD2 = convertirMinutes(d2);
  const mF2 = convertirMinutes(f2);
  return mD1 < mF2 && mF1 > mD2;
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

  // Formulaire d'édition / création
  const [idEnEdition, setIdEnEdition] = useState(null);
  const [classeId, setClasseId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [enseignantId, setEnseignantId] = useState("");
  const [jour, setJour] = useState("lundi");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [salle, setSalle] = useState("");

  // Filtre d'affichage au-dessus de la grille
  const [modeVue, setModeVue] = useState("classe"); // 'classe' ou 'enseignant'
  const [filtreClasseId, setFiltreClasseId] = useState("");
  const [filtreEnseignantId, setFiltreEnseignantId] = useState("");

  const estAdmin = role === "administrateur";

  const classesTriees = useMemo(function () {
    return trierClassesOrdreScolaire(classes);
  }, [classes]);

  const charger = function () {
    setStatut("chargement");
    const appels = estAdmin
      ? [lister("cours", token), lister("classes", token), lister("matieres", token), lister("enseignants", token)]
      : [lister("cours", token), lister("classes", token)];

    Promise.all(appels)
      .then(function (resultats) {
        const listeCours = resultats[0] || [];
        setCours(listeCours);
        if (estAdmin) {
          const cls = resultats[1] || [];
          setClasses(cls);
          setMatieres(resultats[2] || []);
          setEnseignants(resultats[3] || []);

          // Pré-sélectionner la première classe par défaut pour l'affichage (ex: 6e A)
          const classesOrdonnees = trierClassesOrdreScolaire(cls);
          if (classesOrdonnees.length > 0) {
            setFiltreClasseId(function (prev) {
              return prev || String(classesOrdonnees[0].id);
            });
            setClasseId(function (prev) {
              return prev || String(classesOrdonnees[0].id);
            });
          }
          if (resultats[3] && resultats[3].length > 0) {
            setFiltreEnseignantId(function (prev) {
              return prev || String(resultats[3][0].id);
            });
          }
        } else {
          const cls = resultats[1] || [];
          setClasses(cls);
          if (cls.length > 0) {
            setFiltreClasseId(String(cls[0].id));
          }
        }
        setStatut("ok");
      })
      .catch(function () { setStatut("refuse"); });
  };

  useEffect(charger, [token]);

  const viderFormulaire = function () {
    setIdEnEdition(null);
    setClasseId(filtreClasseId || (classesTriees.length > 0 ? String(classesTriees[0].id) : ""));
    setMatiereId("");
    setEnseignantId("");
    setJour("lundi");
    setHeureDebut("");
    setHeureFin("");
    setSalle("");
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

  // Détection de conflits côté frontend
  const verifierConflitFrontend = function () {
    if (!heureDebut || !heureFin) return null;
    if (heureDebut >= heureFin) {
      return "L'heure de fin doit être postérieure à l'heure de début.";
    }

    const cidNum = Number(classeId);
    const eidNum = Number(enseignantId);
    const salleTrim = (salle || "").trim().toLowerCase();

    for (const c of cours) {
      if (idEnEdition && c.id === idEnEdition) continue;
      if (c.jour !== jour) continue;

      const dExistant = c.heure_debut.slice(0, 5);
      const fExistant = c.heure_fin.slice(0, 5);

      if (chevauche(heureDebut, heureFin, dExistant, fExistant)) {
        // Conflit classe
        if (Number(c.classe) === cidNum) {
          const nomCls = formaterNomClasse(c.classe_nom);
          return `Conflit d'horaire : La classe ${nomCls} a déjà un cours de ${c.matiere_nom} (${dExistant} - ${fExistant}).`;
        }
        // Conflit enseignant
        if (Number(c.enseignant) === eidNum) {
          const nomCls = formaterNomClasse(c.classe_nom);
          return `Conflit d'horaire : L'enseignant ${c.enseignant_nom} est déjà en cours avec la classe ${nomCls} (${dExistant} - ${fExistant}).`;
        }
        // Conflit salle
        if (salleTrim && (c.salle || "").trim().toLowerCase() === salleTrim) {
          const nomCls = formaterNomClasse(c.classe_nom);
          return `Conflit de salle : La salle ${c.salle} est déjà occupée par la classe ${nomCls} (${dExistant} - ${fExistant}).`;
        }
      }
    }
    return null;
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);

    // Détection de conflit avant requête
    const messageConflit = verifierConflitFrontend();
    if (messageConflit) {
      setMessage({ type: "erreur", texte: messageConflit });
      return;
    }

    setEnCours(true);
    const donnees = {
      classe: Number(classeId),
      matiere: Number(matiereId),
      enseignant: Number(enseignantId),
      jour: jour,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      salle: salle.trim(),
    };

    try {
      if (idEnEdition) {
        await modifier("cours", idEnEdition, token, donnees);
        setMessage({ type: "succes", texte: "Créneau mis à jour avec succès." });
      } else {
        await creer("cours", token, donnees);
        setMessage({ type: "succes", texte: "Créneau ajouté à l'emploi du temps avec succès." });
      }
      viderFormulaire();
      charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message || "Impossible d'enregistrer le créneau." });
    }
    setEnCours(false);
  };

  const retirer = async function (id) {
    if (!(await confirmation.demander("Êtes-vous sûr de vouloir supprimer ce créneau de l'emploi du temps ?"))) return;
    try {
      await supprimer("cours", id, token);
      setMessage({ type: "succes", texte: "Créneau supprimé de l'emploi du temps." });
      charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
  };

  // Filtrage des cours pour l'affichage de la grille
  const coursFiltres = useMemo(function () {
    if (modeVue === "classe") {
      if (!filtreClasseId) return cours;
      return cours.filter(function (c) { return String(c.classe) === String(filtreClasseId); });
    } else {
      if (!filtreEnseignantId) return cours;
      return cours.filter(function (c) { return String(c.enseignant) === String(filtreEnseignantId); });
    }
  }, [cours, modeVue, filtreClasseId, filtreEnseignantId]);

  // Construction des plages horaires standard & dynamiques
  const plagesHoraires = useMemo(function () {
    const slotsMap = new Map();

    // Plages usuelles d'un établissement secondaire
    const baseStandards = [
      { debut: "07:30", fin: "09:30" },
      { debut: "08:00", fin: "10:00" },
      { debut: "10:15", fin: "12:15" },
      { debut: "10:30", fin: "12:30" },
      { debut: "15:00", fin: "17:00" },
    ];

    // Inclure toutes les plages réellement utilisées dans les cours
    coursFiltres.forEach(function (c) {
      if (c.heure_debut && c.heure_fin) {
        const d = c.heure_debut.slice(0, 5);
        const f = c.heure_fin.slice(0, 5);
        slotsMap.set(d + "-" + f, { debut: d, fin: f });
      }
    });

    // Compléter avec les plages standards si la grille a peu de données
    if (slotsMap.size === 0) {
      baseStandards.forEach(function (p) { slotsMap.set(p.debut + "-" + p.fin, p); });
    } else {
      // Garantir les plages principales pour l'équilibre visuel
      const principales = [
        { debut: "08:00", fin: "10:00" },
        { debut: "10:15", fin: "12:15" },
        { debut: "15:00", fin: "17:00" },
      ];
      principales.forEach(function (p) {
        if (!slotsMap.has(p.debut + "-" + p.fin)) {
          slotsMap.set(p.debut + "-" + p.fin, p);
        }
      });
    }

    const tableau = Array.from(slotsMap.values());
    tableau.sort(function (a, b) {
      return a.debut.localeCompare(b.debut) || a.fin.localeCompare(b.fin);
    });
    return tableau;
  }, [coursFiltres]);

  // Nom du sujet filtré pour l'impression
  const titreCible = useMemo(function () {
    if (modeVue === "classe") {
      const cls = classes.find(function (c) { return String(c.id) === String(filtreClasseId); });
      return cls ? `Classe de ${cls.nom}` : "Toutes les classes";
    } else {
      const ens = enseignants.find(function (e) { return String(e.id) === String(filtreEnseignantId); });
      return ens ? `${ens.first_name} ${ens.last_name}` : "Tous les enseignants";
    }
  }, [modeVue, filtreClasseId, filtreEnseignantId, classes, enseignants]);

  return (
    <>
      <div className="mag-page-title-ligne">
        <div className="mag-page-title">
          <h1>Emploi du temps</h1>
        </div>
      </div>

      {/* FORMULAIRE D'AJOUT / MODIFICATION (ADMINISTRATEUR SEULEMENT) */}
      {estAdmin ? (
        <div className="mag-panneau-form react-fade-in no-print" style={{ marginBottom: "1.8rem", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #F1F5F9", paddingBottom: "0.6rem" }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Calendar size={18} color="#1E3A8A" />
              <span>{idEnEdition ? "Modifier le créneau" : "Ajouter un créneau à l'emploi du temps"}</span>
            </div>
            {idEnEdition ? (
              <span style={{ fontSize: "0.8rem", color: "#64748B", background: "#F1F5F9", padding: "0.2rem 0.6rem", borderRadius: "4px" }}>
                Mode édition active
              </span>
            ) : null}
          </div>

          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

          <form onSubmit={soumettre}>
            {/* Ligne 1 : 3 colonnes (Acteurs pédagogiques) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="edt-classe" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                  Classe
                </label>
                <select
                  id="edt-classe"
                  value={classeId}
                  onChange={function (e) { setClasseId(e.target.value); }}
                  required
                  style={{ width: "100%", height: "38px", padding: "0 0.75rem", border: "1px solid #CBD5E1", borderRadius: "6px", background: "#FFF", fontSize: "0.88rem", fontWeight: 600, color: "#0F172A", boxSizing: "border-box" }}
                >
                  <option value="">-- Choisir une classe --</option>
                  {classesTriees.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
                </select>
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="edt-matiere" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                  Matière
                </label>
                <select
                  id="edt-matiere"
                  value={matiereId}
                  onChange={function (e) { setMatiereId(e.target.value); }}
                  required
                  style={{ width: "100%", height: "38px", padding: "0 0.75rem", border: "1px solid #CBD5E1", borderRadius: "6px", background: "#FFF", fontSize: "0.88rem", fontWeight: 600, color: "#0F172A", boxSizing: "border-box" }}
                >
                  <option value="">-- Choisir une matière --</option>
                  {matieres.map(function (m) { return <option key={m.id} value={m.id}>{m.nom}</option>; })}
                </select>
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="edt-enseignant" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                  Enseignant
                </label>
                <select
                  id="edt-enseignant"
                  value={enseignantId}
                  onChange={function (e) { setEnseignantId(e.target.value); }}
                  required
                  style={{ width: "100%", height: "38px", padding: "0 0.75rem", border: "1px solid #CBD5E1", borderRadius: "6px", background: "#FFF", fontSize: "0.88rem", fontWeight: 600, color: "#0F172A", boxSizing: "border-box" }}
                >
                  <option value="">-- Choisir un enseignant --</option>
                  {enseignants.map(function (e) {
                    const nomComplet = (e.first_name || e.last_name) ? `${e.first_name} ${e.last_name}` : e.username;
                    return <option key={e.id} value={e.id}>{nomComplet}</option>;
                  })}
                </select>
              </div>
            </div>

            {/* Ligne 2 : 4 colonnes (Détails logistiques) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.2rem" }}>
              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="edt-jour" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                  Jour
                </label>
                <select
                  id="edt-jour"
                  value={jour}
                  onChange={function (e) { setJour(e.target.value); }}
                  style={{ width: "100%", height: "38px", padding: "0 0.75rem", border: "1px solid #CBD5E1", borderRadius: "6px", background: "#FFF", fontSize: "0.88rem", fontWeight: 600, color: "#0F172A", boxSizing: "border-box" }}
                >
                  {JOURS.map(function (j) { return <option key={j.valeur} value={j.valeur}>{traduireTexte(j.label)}</option>; })}
                </select>
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="edt-debut" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                  Heure de début
                </label>
                <input
                  id="edt-debut"
                  type="time"
                  value={heureDebut}
                  onChange={function (e) { setHeureDebut(e.target.value); }}
                  required
                  style={{ width: "100%", height: "38px", padding: "0 0.75rem", border: "1px solid #CBD5E1", borderRadius: "6px", background: "#FFF", fontSize: "0.88rem", color: "#0F172A", boxSizing: "border-box" }}
                />
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="edt-fin" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                  Heure de fin
                </label>
                <input
                  id="edt-fin"
                  type="time"
                  value={heureFin}
                  onChange={function (e) { setHeureFin(e.target.value); }}
                  required
                  style={{ width: "100%", height: "38px", padding: "0 0.75rem", border: "1px solid #CBD5E1", borderRadius: "6px", background: "#FFF", fontSize: "0.88rem", color: "#0F172A", boxSizing: "border-box" }}
                />
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="edt-salle" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                  Salle
                </label>
                <input
                  id="edt-salle"
                  type="text"
                  value={salle}
                  onChange={function (e) { setSalle(e.target.value); }}
                  placeholder="Ex: Salle 101"
                  style={{ width: "100%", height: "38px", padding: "0 0.75rem", border: "1px solid #CBD5E1", borderRadius: "6px", background: "#FFF", fontSize: "0.88rem", color: "#0F172A", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Actions formulaire */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingTop: "0.5rem" }}>
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
                {enCours ? <span className="react-spinner"></span> : (idEnEdition ? "Enregistrer les modifications" : "Ajouter le créneau")}
              </button>
              {idEnEdition ? (
                <button
                  type="button"
                  className="btn-mag-outline"
                  onClick={viderFormulaire}
                  style={{ padding: "0.55rem 1.2rem", fontSize: "0.85rem", borderRadius: "6px" }}
                >
                  Annuler
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : (
        message ? <Alerte type={message.type}>{message.texte}</Alerte> : null
      )}

      {/* BARRE DE FILTRE D'AFFICHAGE & ACTIONS AU-DESSUS DE LA GRILLE */}
      <div
        className="mag-card react-fade-in no-print"
        style={{
          marginBottom: "1.2rem",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {/* Sélecteur de mode (Par classe / Par enseignant) */}
          <div style={{ display: "inline-flex", background: "#F1F5F9", padding: "3px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
            <button
              type="button"
              onClick={function () { setModeVue("classe"); }}
              style={{
                border: "none",
                background: modeVue === "classe" ? "#FFFFFF" : "transparent",
                color: modeVue === "classe" ? "#1E3A8A" : "#64748B",
                padding: "0.4rem 0.9rem",
                borderRadius: "4px",
                fontWeight: modeVue === "classe" ? 700 : 500,
                fontSize: "0.82rem",
                cursor: "pointer",
                boxShadow: modeVue === "classe" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              Par classe
            </button>
            {estAdmin ? (
              <button
                type="button"
                onClick={function () { setModeVue("enseignant"); }}
                style={{
                  border: "none",
                  background: modeVue === "enseignant" ? "#FFFFFF" : "transparent",
                  color: modeVue === "enseignant" ? "#1E3A8A" : "#64748B",
                  padding: "0.4rem 0.9rem",
                  borderRadius: "4px",
                  fontWeight: modeVue === "enseignant" ? 700 : 500,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  boxShadow: modeVue === "enseignant" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                Par enseignant
              </button>
            ) : null}
          </div>

          {/* Sélecteur contextuel */}
          {modeVue === "classe" ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                Afficher l'emploi du temps de :
              </span>
              <select
                value={filtreClasseId}
                onChange={function (e) { setFiltreClasseId(e.target.value); }}
                style={{
                  height: "36px",
                  padding: "0 0.8rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  background: "#FFF",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "#0F172A",
                  minWidth: "160px",
                }}
              >
                {classesTriees.map(function (c) {
                  return <option key={c.id} value={c.id}>{c.nom}</option>;
                })}
              </select>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                Enseignant :
              </span>
              <select
                value={filtreEnseignantId}
                onChange={function (e) { setFiltreEnseignantId(e.target.value); }}
                style={{
                  height: "36px",
                  padding: "0 0.8rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  background: "#FFF",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "#0F172A",
                  minWidth: "200px",
                }}
              >
                {enseignants.map(function (e) {
                  const nomComplet = (e.first_name || e.last_name) ? `${e.first_name} ${e.last_name}` : e.username;
                  return <option key={e.id} value={e.id}>{nomComplet}</option>;
                })}
              </select>
            </div>
          )}
        </div>

        {/* Bouton d'exportation / Impression */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.82rem", color: "#64748B", fontWeight: 500 }}>
            {coursFiltres.length} créneau{coursFiltres.length > 1 ? "x" : ""} programmé{coursFiltres.length > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={function () { window.print(); }}
            style={{
              background: "#FFFFFF",
              color: "#1E3A8A",
              border: "1px solid #CBD5E1",
              padding: "0.45rem 0.9rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
            title="Imprimer ou exporter en PDF"
          >
            <Printer size={15} />
            <span>Imprimer / Exporter PDF</span>
          </button>
        </div>
      </div>

      {/* SECTION IMPRIMABLE (EN-TÊTE ET GRILLE PLANNING) */}
      <div className="react-emploi-imprimable">
        <div className="print-only" style={{ display: "none", marginBottom: "1.5rem" }}>
          <div style={{ textAlign: "center", borderBottom: "2px solid #0F172A", paddingBottom: "0.8rem" }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, textTransform: "uppercase" }}>
              Complexe Scolaire Magnificat
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "#334155", marginTop: "0.2rem" }}>
              Emploi du temps officiel — {titreCible}
            </div>
            <div style={{ fontSize: "0.85rem", color: "#64748B", marginTop: "0.15rem" }}>
              Année scolaire 2026-2027
            </div>
          </div>
        </div>

        {statut === "chargement" ? <Spinner texte="Chargement de l'emploi du temps..." /> : null}
        {statut === "refuse" ? <Alerte>Impossible de charger l'emploi du temps.</Alerte> : null}

        {/* VRAIE GRILLE HORAIRE HEBDOMADAIRE (TABLEAU PLANNING STRUCTURÉ) */}
        {statut === "ok" ? (
          <div
            className="mag-table-wrap react-fade-in"
            style={{
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              overflowX: "auto",
              background: "#FFFFFF",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <table
              className="mag-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "900px",
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #CBD5E1" }}>
                  <th
                    style={{
                      width: "110px",
                      padding: "0.8rem 0.6rem",
                      textAlign: "center",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      color: "#475569",
                      borderRight: "1px solid #E2E8F0",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    <Clock size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                    Horaires
                  </th>
                  {JOURS.map(function (j) {
                    return (
                      <th
                        key={j.valeur}
                        style={{
                          padding: "0.8rem 0.6rem",
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          color: "#0F172A",
                          borderRight: "1px solid #E2E8F0",
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                        }}
                      >
                        {j.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {plagesHoraires.map(function (plage, indexLigne) {
                  const labelPlage = `${plage.debut.replace(":", "h")} – ${plage.fin.replace(":", "h")}`;

                  return (
                    <tr
                      key={plage.debut + "-" + plage.fin}
                      style={{
                        borderBottom: "1px solid #E2E8F0",
                        background: indexLigne % 2 === 1 ? "#FAFAFA" : "#FFFFFF",
                      }}
                    >
                      {/* Colonne Plage horaire */}
                      <td
                        style={{
                          padding: "0.75rem 0.5rem",
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: "0.82rem",
                          color: "#1E3A8A",
                          background: "#F8FAFC",
                          borderRight: "2px solid #CBD5E1",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {labelPlage}
                      </td>

                      {/* 6 Colonnes pour les jours (Lundi à Samedi) */}
                      {JOURS.map(function (j) {
                        // Trouver tous les cours correspondants à cette plage et ce jour
                        const coursCellule = coursFiltres.filter(function (c) {
                          if (c.jour !== j.valeur) return false;
                          const d = c.heure_debut.slice(0, 5);
                          const f = c.heure_fin.slice(0, 5);
                          return chevauche(plage.debut, plage.fin, d, f);
                        });

                        return (
                          <td
                            key={j.valeur}
                            style={{
                              padding: "0.45rem",
                              verticalAlign: "top",
                              borderRight: "1px solid #E2E8F0",
                              minHeight: "75px",
                              height: "75px",
                              position: "relative",
                            }}
                          >
                            {coursCellule.length === 0 ? (
                              <div
                                style={{
                                  height: "100%",
                                  minHeight: "55px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#CBD5E1",
                                  fontSize: "0.85rem",
                                }}
                              >
                                —
                              </div>
                            ) : (
                              coursCellule.map(function (c) {
                                const styleMatiere = stylePourMatiere(c.matiere_nom);
                                const nomClasseEpure = formaterNomClasse(c.classe_nom);

                                return (
                                  <div
                                    key={c.id}
                                    className="react-planning-bloc"
                                    style={{
                                      borderLeft: `4px solid ${styleMatiere.bordure}`,
                                      background: styleMatiere.fond,
                                      border: `1px solid ${styleMatiere.fond}`,
                                      borderLeftWidth: "4px",
                                      borderLeftColor: styleMatiere.bordure,
                                      borderRadius: "5px",
                                      padding: "0.45rem 0.55rem",
                                      marginBottom: coursCellule.length > 1 ? "4px" : 0,
                                      position: "relative",
                                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                                    }}
                                  >
                                    {/* Matière en gras */}
                                    <div
                                      style={{
                                        fontWeight: 700,
                                        fontSize: "0.85rem",
                                        color: styleMatiere.texte,
                                        marginBottom: "2px",
                                        lineHeight: 1.25,
                                      }}
                                    >
                                      {c.matiere_nom}
                                    </div>

                                    {/* Enseignant ou Classe selon la vue active */}
                                    <div style={{ fontSize: "0.78rem", color: "#334155", display: "flex", alignItems: "center", gap: "3px" }}>
                                      <User size={11} style={{ flexShrink: 0 }} />
                                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {modeVue === "classe" ? (c.enseignant_nom || "Enseignant") : nomClasseEpure}
                                      </span>
                                    </div>

                                    {/* Salle */}
                                    {c.salle ? (
                                      <div style={{ fontSize: "0.74rem", color: "#64748B", display: "flex", alignItems: "center", gap: "3px", marginTop: "1px" }}>
                                        <MapPin size={11} style={{ flexShrink: 0 }} />
                                        <span>{c.salle}</span>
                                      </div>
                                    ) : null}

                                    {/* Boutons discrets d'édition / suppression pour l'administrateur */}
                                    {estAdmin ? (
                                      <div
                                        className="no-print"
                                        style={{
                                          display: "flex",
                                          justifyContent: "flex-end",
                                          gap: "0.35rem",
                                          marginTop: "4px",
                                          paddingTop: "2px",
                                          borderTop: "1px dashed rgba(0,0,0,0.08)",
                                        }}
                                      >
                                        <button
                                          type="button"
                                          onClick={function () { commencerEdition(c); }}
                                          title="Modifier ce cours"
                                          style={{
                                            background: "none",
                                            border: "none",
                                            padding: "2px",
                                            cursor: "pointer",
                                            color: "#1E3A8A",
                                            display: "inline-flex",
                                            alignItems: "center",
                                          }}
                                        >
                                          <Pencil size={12} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={function () { retirer(c.id); }}
                                          title="Supprimer ce créneau"
                                          style={{
                                            background: "none",
                                            border: "none",
                                            padding: "2px",
                                            cursor: "pointer",
                                            color: "#DC2626",
                                            display: "inline-flex",
                                            alignItems: "center",
                                          }}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {confirmation.demande ? (
        <ConfirmModal
          titre="Supprimer le créneau"
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
