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

function formaterDateLisible(dateIso) {
  if (!dateIso) return "-";
  try {
    const parties = String(dateIso).split("-");
    if (parties.length === 3) {
      const annee = parties[0];
      const moisIdx = parseInt(parties[1], 10) - 1;
      const jour = parseInt(parties[2], 10);
      const moisNoms = [
        "janv.", "févr.", "mars", "avr.", "mai", "juin",
        "juil.", "août", "sept.", "oct.", "nov.", "déc."
      ];
      if (moisIdx >= 0 && moisIdx < 12) {
        return `${jour} ${moisNoms[moisIdx]} ${annee}`;
      }
    }
  } catch {
    // fallback
  }
  return dateIso;
}

function determinerTrimestre(dateIso) {
  if (!dateIso) return 1;
  const parties = String(dateIso).split("-");
  if (parties.length >= 2) {
    const mois = parseInt(parties[1], 10);
    if (mois >= 9 && mois <= 12) return 1;
    if (mois >= 1 && mois <= 3) return 2;
    if (mois >= 4 && mois <= 7) return 3;
  }
  return 1;
}

function VueAbsencesParent({ token }) {
  const [enfants, setEnfants] = useState([]);
  const [filtreEnfantId, setFiltreEnfantId] = useState("");
  const [filtreTrimestre, setFiltreTrimestre] = useState("");
  const [absences, setAbsences] = useState([]);
  const [statut, setStatut] = useState("chargement");

  useEffect(function () {
    setStatut("chargement");
    Promise.all([lister("eleves", token), lister("absences", token)])
      .then(function (res) {
        const listeEnfants = Array.isArray(res[0]) ? res[0] : (res[0].results || []);
        setEnfants(listeEnfants);
        const toutes = Array.isArray(res[1]) ? res[1] : (res[1].results || []);
        setAbsences(toutes);
        setStatut("ok");
      })
      .catch(function () { setStatut("refuse"); });
  }, [token]);

  const infoEleve = function (eleveId, eleveNomFallback) {
    const trouve = enfants.find(function (e) { return e.id === eleveId; });
    if (trouve) {
      const nomComplet = (trouve.nom + " " + trouve.prenom).trim();
      const classe = trouve.classe_nom ? trouve.classe_nom.replace(/\s*\([^)]*\)/g, "").trim() : "";
      return classe ? `${nomComplet} • ${classe}` : nomComplet;
    }
    return eleveNomFallback || "Élève";
  };

  const absencesFiltrees = useMemo(function () {
    return absences
      .filter(function (a) {
        if (filtreEnfantId && String(a.eleve) !== filtreEnfantId) return false;
        if (filtreTrimestre && String(determinerTrimestre(a.date)) !== filtreTrimestre) return false;
        return true;
      })
      .sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
      });
  }, [absences, filtreEnfantId, filtreTrimestre]);

  const total = absencesFiltrees.length;
  const justifiees = absencesFiltrees.filter(function (a) { return a.justifiee; }).length;
  const nonJustifiees = total - justifiees;

  if (statut === "chargement") return <Spinner texte="Chargement du dossier d'assiduité..." />;
  if (statut === "refuse") return <Alerte type="erreur">Impossible de charger les données d'assiduité.</Alerte>;

  return (
    <>
      <div
        className="mag-page-title-ligne"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.2rem",
        }}
      >
        <div>
          <h1 className="mag-page-title" style={{ margin: 0 }}>
            Assiduité &amp; absences de mes enfants
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Sélecteur d'enfant */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <label htmlFor="filtre-enfant" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
              Élève :
            </label>
            <select
              id="filtre-enfant"
              value={filtreEnfantId}
              onChange={function (e) { setFiltreEnfantId(e.target.value); }}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                backgroundColor: "#FFFFFF",
                fontSize: "0.85rem",
                color: "#0F172A",
                fontWeight: 500,
              }}
            >
              <option value="">Tous mes enfants</option>
              {enfants.map(function (e) {
                const cl = e.classe_nom ? " (" + e.classe_nom.replace(/\s*\([^)]*\)/g, "").trim() + ")" : "";
                return (
                  <option key={e.id} value={String(e.id)}>
                    {e.nom} {e.prenom}{cl}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Sélecteur de période / trimestre */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <label htmlFor="filtre-trimestre" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
              Période :
            </label>
            <select
              id="filtre-trimestre"
              value={filtreTrimestre}
              onChange={function (e) { setFiltreTrimestre(e.target.value); }}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                backgroundColor: "#FFFFFF",
                fontSize: "0.85rem",
                color: "#0F172A",
                fontWeight: 500,
              }}
            >
              <option value="">Toute l'année</option>
              <option value="1">1er trimestre</option>
              <option value="2">2e trimestre</option>
              <option value="3">3e trimestre</option>
            </select>
          </div>
        </div>
      </div>

      {/* 1. Alignement des 3 cartes KPI sur une seule ligne (grid-cols-3) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          className="mag-card mag-card-fixe"
          style={{
            padding: "1rem 1.25rem",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
            textAlign: "left",
            outline: "none",
          }}
        >
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748B", marginBottom: "0.35rem" }}>
            Total absences
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0F172A", lineHeight: 1.1 }}>
            {total}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.4rem" }}>
            {total === 0 ? "Assiduité exemplaire" : (total > 1 ? `${total} absences enregistrées` : "1 absence enregistrée")}
          </div>
        </div>

        <div
          className="mag-card mag-card-fixe"
          style={{
            padding: "1rem 1.25rem",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
            textAlign: "left",
            outline: "none",
          }}
        >
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748B", marginBottom: "0.35rem" }}>
            Justifiées
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E3A8A", lineHeight: 1.1 }}>
            {justifiees}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.4rem" }}>
            Avec justificatif validé
          </div>
        </div>

        <div
          className="mag-card mag-card-fixe"
          style={{
            padding: "1rem 1.25rem",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
            textAlign: "left",
            outline: "none",
          }}
        >
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748B", marginBottom: "0.35rem" }}>
            Non justifiées
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: nonJustifiees > 0 ? "#DC2626" : "#15803D", lineHeight: 1.1 }}>
            {nonJustifiees}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.4rem" }}>
            {nonJustifiees === 0 ? "Aucun manquement" : "À régulariser auprès de l'école"}
          </div>
        </div>
      </div>

      {/* Tableau des absences */}
      {absencesFiltrees.length === 0 ? (
        <div
          className="mag-card mag-card-fixe"
          style={{
            textAlign: "center",
            padding: "2.5rem",
            border: "1px solid #BBF7D0",
            backgroundColor: "#F0FDF4",
            borderRadius: "8px",
            color: "#15803D",
          }}
        >
          <div style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.3rem" }}>
            Assiduité exemplaire
          </div>
          <p style={{ color: "#166534", fontSize: "0.875rem", margin: 0 }}>
            Aucune absence signalée pour la sélection courante.
          </p>
        </div>
      ) : (
        <div
          className="mag-card mag-card-fixe react-fade-in"
          style={{
            padding: 0,
            overflow: "hidden",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          }}
        >
          <table className="mag-table mag-table-pro" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
                  Élève
                </th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
                  Date
                </th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
                  Statut
                </th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
                  Motif renseigné
                </th>
              </tr>
            </thead>
            <tbody>
              {absencesFiltrees.map(function (a) {
                return (
                  <tr key={a.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#0F172A", fontSize: "0.875rem" }}>
                      {infoEleve(a.eleve, a.eleve_nom)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#334155", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      {formaterDateLisible(a.date)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.2rem 0.65rem",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          backgroundColor: a.justifiee ? "#F0FDF4" : "#FEF2F2",
                          color: a.justifiee ? "#15803D" : "#B91C1C",
                          border: a.justifiee ? "1px solid #BBF7D0" : "1px solid #FECACA",
                        }}
                      >
                        {a.justifiee ? "Justifiée" : "Non justifiée"}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569", fontSize: "0.85rem" }}>
                      {a.motif || <span style={{ color: "#94A3B8", fontStyle: "italic" }}>Aucun motif précisé</span>}
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

export default function GestionAbsences({ token, role }) {
  if (role === "parent") {
    return <VueAbsencesParent token={token} />;
  }

  const estAdmin = role === "administrateur";
  const [classes, setClasses] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [statut, setStatut] = useState("chargement");

  const [classeId, setClasseId] = useState("");
  const [date, setDate] = useState(dateDuJour());
  const [ongletActif, setOngletActif] = useState("appel");

  const [toutesLesAbsences, setToutesLesAbsences] = useState([]);
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
        const cls = estAdmin ? resultats[0] : (resultats[0].classes || []);
        setClasses(cls);
        setEleves(resultats[1]);
        setStatut("ok");
      })
      .catch(function () { setStatut("refuse"); });
  }, [token, estAdmin]);

  const classesTriees = useMemo(function () {
    return trierClassesOrdreScolaire(classes);
  }, [classes]);

  // Présélection automatique de la première classe assignée
  useEffect(function () {
    if (!classeId && classesTriees.length > 0) {
      setClasseId(String(classesTriees[0].id));
    }
  }, [classesTriees, classeId]);

  const classeActive = useMemo(function () {
    return classes.find(function (c) { return String(c.id) === String(classeId); });
  }, [classes, classeId]);

  const nomClasseActive = classeActive ? classeActive.nom : "Classe";

  const elevesDeLaClasse = useMemo(function () {
    if (!classeId) return [];
    return eleves
      .filter(function (e) { return String(e.classe) === String(classeId); })
      .sort(function (a, b) { return (a.nom + a.prenom).localeCompare(b.nom + b.prenom); });
  }, [eleves, classeId]);

  const nbAbsents = useMemo(function () {
    return elevesDeLaClasse.filter(function (e) {
      const etat = saisie[e.id];
      return !!(etat && etat.absent);
    }).length;
  }, [elevesDeLaClasse, saisie]);

  const nbJustifiees = useMemo(function () {
    return elevesDeLaClasse.filter(function (e) {
      const etat = saisie[e.id];
      return !!(etat && etat.absent && etat.justifiee);
    }).length;
  }, [elevesDeLaClasse, saisie]);

  const filtresComplets = classeId && date;

  const chargerAbsences = function () {
    if (!filtresComplets) { setAbsencesExistantes([]); setSaisie({}); return; }
    setChargementAbsences(true);
    lister("absences", token)
      .then(function (toutes) {
        const liste = Array.isArray(toutes) ? toutes : (toutes.results || []);
        setToutesLesAbsences(liste);
        const filtrees = liste.filter(function (a) {
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
  };

  useEffect(function () {
    chargerAbsences();
    // eslint-disable-next-line
  }, [classeId, date, token, elevesDeLaClasse.length]);

  const historiqueClasse = useMemo(function () {
    if (!classeId) return [];
    const idsEleves = new Set(elevesDeLaClasse.map(function (e) { return e.id; }));
    return toutesLesAbsences
      .filter(function (a) { return idsEleves.has(a.eleve); })
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  }, [toutesLesAbsences, elevesDeLaClasse, classeId]);

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
      setMessage({ type: "succes", texte: "Présences enregistrées (" + compteur + " changement(s))." });
      chargerAbsences();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  if (statut === "chargement") return <Spinner texte="Chargement..." />;
  if (statut === "refuse") return <Alerte type="erreur">Impossible de charger la page de saisie des absences.</Alerte>;

  const totalEffectif = elevesDeLaClasse.length;
  const totalPresents = Math.max(0, totalEffectif - nbAbsents);

  const totalHistorique = historiqueClasse.length;
  const justifieesHistorique = historiqueClasse.filter(function (a) { return a.justifiee; }).length;
  const nonJustifieesHistorique = totalHistorique - justifieesHistorique;

  return (
    <>
      <div style={{ marginBottom: "1.2rem" }}>
        <h1 className="mag-page-title" style={{ margin: "0 0 0.25rem 0" }}>
          Absences &amp; présences
        </h1>
        <p style={{ margin: 0, color: "#64748B", fontSize: "0.85rem" }}>
          Feuille d'appel quotidienne et registre d'assiduité de vos classes.
        </p>
      </div>

      {classes.length === 0 ? (
        <Alerte type="info">
          {estAdmin ? "Aucune classe n'existe encore." : "Aucune classe ne vous est assignée pour le moment. Contactez l'administration."}
        </Alerte>
      ) : (
        <>
          {/* Panneau de sélection Classe & Date */}
          <div
            className="mag-panneau-form mag-card-fixe react-fade-in"
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
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1.2rem",
                alignItems: "flex-end",
              }}
            >
              <div className="mag-field" style={{ margin: 0 }}>
                <label
                  htmlFor="abs-classe"
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
                  id="abs-classe"
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
                  <option value="">-- Sélectionner une classe --</option>
                  {classesTriees.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
                </select>
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label
                  htmlFor="abs-date"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                    display: "block",
                  }}
                >
                  Date de l'appel
                </label>
                <input
                  id="abs-date"
                  type="date"
                  value={date}
                  onChange={function (e) { setDate(e.target.value); }}
                  style={{
                    width: "100%",
                    height: "38px",
                    padding: "0 0.75rem",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    background: "#FFF",
                    fontSize: "0.88rem",
                    color: "#0F172A",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>

          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

          {/* 3 Cartes KPI côte à côte sur 3 colonnes */}
          {classeId ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              {ongletActif === "appel" ? (
                <>
                  <div
                    className="mag-card mag-card-fixe"
                    style={{
                      padding: "1rem 1.25rem",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "6px",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748B", marginBottom: "0.35rem" }}>
                      Effectif de la classe
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0F172A", lineHeight: 1.1 }}>
                      {totalEffectif}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.4rem" }}>
                      Élèves inscrits en {nomClasseActive}
                    </div>
                  </div>

                  <div
                    className="mag-card mag-card-fixe"
                    style={{
                      padding: "1rem 1.25rem",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "6px",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748B", marginBottom: "0.35rem" }}>
                      Présents à l'appel
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#15803D", lineHeight: 1.1 }}>
                      {totalPresents}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#15803D", marginTop: "0.4rem" }}>
                      {nbAbsents === 0 ? "Tous les élèves sont présents" : `${totalPresents} présents en salle`}
                    </div>
                  </div>

                  <div
                    className="mag-card mag-card-fixe"
                    style={{
                      padding: "1rem 1.25rem",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "6px",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748B", marginBottom: "0.35rem" }}>
                      Absents du jour
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: nbAbsents > 0 ? "#DC2626" : "#15803D", lineHeight: 1.1 }}>
                      {nbAbsents}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.4rem" }}>
                      {nbAbsents === 0 ? "Aucun absent signalé" : `${nbJustifiees} justifiée(s) • ${nbAbsents - nbJustifiees} non justifiée(s)`}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="mag-card mag-card-fixe"
                    style={{
                      padding: "1rem 1.25rem",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "6px",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748B", marginBottom: "0.35rem" }}>
                      Total absences enregistrées
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0F172A", lineHeight: 1.1 }}>
                      {totalHistorique}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.4rem" }}>
                      Registre complet de {nomClasseActive}
                    </div>
                  </div>

                  <div
                    className="mag-card mag-card-fixe"
                    style={{
                      padding: "1rem 1.25rem",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "6px",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748B", marginBottom: "0.35rem" }}>
                      Justifiées
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E3A8A", lineHeight: 1.1 }}>
                      {justifieesHistorique}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.4rem" }}>
                      Avec motif ou certificat validé
                    </div>
                  </div>

                  <div
                    className="mag-card mag-card-fixe"
                    style={{
                      padding: "1rem 1.25rem",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "6px",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748B", marginBottom: "0.35rem" }}>
                      Non justifiées
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: nonJustifieesHistorique > 0 ? "#DC2626" : "#15803D", lineHeight: 1.1 }}>
                      {nonJustifieesHistorique}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.4rem" }}>
                      {nonJustifieesHistorique === 0 ? "Aucun manquement" : "En attente de justification"}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* Navigation par onglets */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              borderBottom: "1px solid #E2E8F0",
              marginBottom: "1.2rem",
            }}
          >
            <button
              type="button"
              onClick={function () { setOngletActif("appel"); }}
              style={{
                background: "none",
                border: "none",
                borderBottom: ongletActif === "appel" ? "2.5px solid #1E3A8A" : "2.5px solid transparent",
                color: ongletActif === "appel" ? "#1E3A8A" : "#64748B",
                fontWeight: ongletActif === "appel" ? 700 : 500,
                fontSize: "0.88rem",
                padding: "0.6rem 1rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Faire l'appel
            </button>
            <button
              type="button"
              onClick={function () { setOngletActif("historique"); }}
              style={{
                background: "none",
                border: "none",
                borderBottom: ongletActif === "historique" ? "2.5px solid #1E3A8A" : "2.5px solid transparent",
                color: ongletActif === "historique" ? "#1E3A8A" : "#64748B",
                fontWeight: ongletActif === "historique" ? 700 : 500,
                fontSize: "0.88rem",
                padding: "0.6rem 1rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                transition: "all 0.15s ease",
              }}
            >
              <span>Historique de la classe</span>
              {historiqueClasse.length > 0 ? (
                <span
                  style={{
                    backgroundColor: ongletActif === "historique" ? "#EFF6FF" : "#F1F5F9",
                    color: ongletActif === "historique" ? "#1E3A8A" : "#64748B",
                    padding: "0.1rem 0.45rem",
                    borderRadius: "10px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  {historiqueClasse.length}
                </span>
              ) : null}
            </button>
          </div>

          {!filtresComplets ? (
            <div className="mag-card mag-card-fixe" style={{ textAlign: "center", padding: "2.5rem", border: "1px dashed var(--line)", color: "var(--ink-600)" }}>
              Choisissez une classe et une date pour afficher les présences.
            </div>
          ) : chargementAbsences ? (
            <Spinner texte="Chargement des présences..." />
          ) : elevesDeLaClasse.length === 0 ? (
            <Alerte type="info">Aucun élève affecté à cette classe pour le moment.</Alerte>
          ) : ongletActif === "appel" ? (
            /* Onglet 1 : Feuille d'appel du jour */
            <form onSubmit={soumettre} className="react-fade-in">
              <div
                className="mag-card mag-card-fixe"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                }}
              >
                <table className="mag-table mag-table-pro" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ width: "170px", minWidth: "160px", whiteSpace: "nowrap", padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", color: "#475569" }}>
                        Matricule
                      </th>
                      <th style={{ minWidth: "220px", padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", color: "#475569" }}>
                        Élève
                      </th>
                      <th style={{ width: "110px", textAlign: "center", whiteSpace: "nowrap", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#475569" }}>
                        Absent
                      </th>
                      <th style={{ width: "120px", textAlign: "center", whiteSpace: "nowrap", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#475569" }}>
                        Justifiée
                      </th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", color: "#475569" }}>
                        Motif de l'absence
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {elevesDeLaClasse.map(function (eleve) {
                      const etat = saisie[eleve.id];
                      const estAbsent = !!(etat && etat.absent);
                      return (
                        <tr key={eleve.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ whiteSpace: "nowrap", padding: "0.75rem 1rem" }}>
                            <span style={{ fontWeight: 600, color: "#334155", fontSize: "0.85rem", letterSpacing: "0.02em" }}>
                              {(eleve.matricule || `ELEVE-${eleve.id}`).toUpperCase()}
                            </span>
                          </td>
                          <td style={{ whiteSpace: "nowrap", padding: "0.75rem 1rem" }}>
                            <div style={{ fontWeight: 600, color: "#0F172A", fontSize: "0.88rem" }}>
                              {eleve.nom} {eleve.prenom}
                            </div>
                          </td>
                          <td style={{ textAlign: "center", padding: "0.75rem 1rem" }}>
                            <input
                              type="checkbox"
                              checked={estAbsent}
                              onChange={function () { basculerAbsent(eleve.id); }}
                              aria-label={"Absent : " + eleve.nom + " " + eleve.prenom}
                              style={{ width: "17px", height: "17px", cursor: "pointer" }}
                            />
                          </td>
                          <td style={{ textAlign: "center", padding: "0.75rem 1rem" }}>
                            <input
                              type="checkbox"
                              checked={estAbsent && !!etat.justifiee}
                              disabled={!estAbsent}
                              onChange={function (e) { modifierChamp(eleve.id, "justifiee", e.target.checked); }}
                              aria-label={"Justifiée : " + eleve.nom + " " + eleve.prenom}
                              style={{ width: "17px", height: "17px", cursor: estAbsent ? "pointer" : "not-allowed" }}
                            />
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <input
                              type="text"
                              disabled={!estAbsent}
                              value={(etat && etat.motif) || ""}
                              onChange={function (e) { modifierChamp(eleve.id, "motif", e.target.value); }}
                              placeholder={estAbsent ? "Ex: Maladie, Consultation médicale, Urgence familiale" : ""}
                              style={{
                                width: "100%",
                                padding: "0.45rem 0.65rem",
                                fontSize: "0.85rem",
                                border: "1px solid " + (estAbsent ? "#CBD5E1" : "#E2E8F0"),
                                borderRadius: "6px",
                                background: estAbsent ? "#FFFFFF" : "#F8FAFC",
                                color: estAbsent ? "#0F172A" : "#94A3B8",
                                boxSizing: "border-box",
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bilan d'appel dynamique et bouton d'enregistrement */}
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
                      Bilan d'appel :
                    </span>
                    <strong style={{ color: nbAbsents === 0 ? "#15803D" : "#DC2626", fontSize: "0.95rem" }}>
                      {nbAbsents} {nbAbsents > 1 ? "absents" : "absent"} sur {totalEffectif} élève{totalEffectif > 1 ? "s" : ""}
                    </strong>
                  </div>
                  {nbAbsents > 0 ? (
                    <>
                      <span style={{ color: "#CBD5E1" }}>|</span>
                      <div>
                        <span style={{ color: "#64748B", marginRight: "0.45rem", fontWeight: 500 }}>
                          Dont justifiée{nbJustifiees > 1 ? "s" : ""} :
                        </span>
                        <strong style={{ color: "#0284C7" }}>
                          {nbJustifiees}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <span style={{ color: "#CBD5E1" }}>|</span>
                      <span style={{ color: "#16A34A", fontSize: "0.85rem", fontWeight: 500 }}>
                        Tous les élèves sont présents
                      </span>
                    </>
                  )}
                </div>

                <div>
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
                      transition: "all 0.15s ease",
                    }}
                  >
                    {enCours ? "Enregistrement..." : "Enregistrer l'appel"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Onglet 2 : Historique complet des absences de la classe */
            <div className="react-fade-in">
              {historiqueClasse.length === 0 ? (
                <div
                  className="mag-card mag-card-fixe"
                  style={{
                    textAlign: "center",
                    padding: "2.5rem",
                    border: "1px solid #BBF7D0",
                    backgroundColor: "#F0FDF4",
                    borderRadius: "8px",
                    color: "#15803D",
                  }}
                >
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Assiduité exemplaire
                  </div>
                  <p style={{ color: "#166534", fontSize: "0.875rem", margin: 0 }}>
                    Aucune absence enregistrée pour la classe de {nomClasseActive}.
                  </p>
                </div>
              ) : (
                <div
                  className="mag-card mag-card-fixe"
                  style={{
                    padding: 0,
                    overflow: "hidden",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <table className="mag-table mag-table-pro" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                        <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
                          Date
                        </th>
                        <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
                          Matricule
                        </th>
                        <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
                          Élève
                        </th>
                        <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
                          Statut
                        </th>
                        <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
                          Motif renseigné
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historiqueClasse.map(function (a) {
                        const elTrouve = elevesDeLaClasse.find(function (e) { return e.id === a.eleve; });
                        return (
                          <tr key={a.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "0.75rem 1rem", color: "#334155", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                              {formaterDateLisible(a.date)}
                            </td>
                            <td style={{ padding: "0.75rem 1rem", color: "#64748B", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                              {elTrouve ? (elTrouve.matricule || `ELEVE-${elTrouve.id}`).toUpperCase() : "-"}
                            </td>
                            <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#0F172A", fontSize: "0.875rem" }}>
                              {elTrouve ? `${elTrouve.nom} ${elTrouve.prenom}` : (a.eleve_nom || "Élève")}
                            </td>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "0.2rem 0.65rem",
                                  borderRadius: "4px",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  backgroundColor: a.justifiee ? "#F0FDF4" : "#FEF2F2",
                                  color: a.justifiee ? "#15803D" : "#B91C1C",
                                  border: a.justifiee ? "1px solid #BBF7D0" : "1px solid #FECACA",
                                }}
                              >
                                {a.justifiee ? "Justifiée" : "Non justifiée"}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 1rem", color: "#475569", fontSize: "0.85rem" }}>
                              {a.motif || <span style={{ color: "#94A3B8", fontStyle: "italic" }}>Aucun motif précisé</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
