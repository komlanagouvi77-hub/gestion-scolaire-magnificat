// src/pages/GestionPaiements.jsx
// Enregistrement des paiements de scolarité (Administration et suivi).
import { useState, useEffect, useMemo } from "react";
import {
  lister,
  creer,
  modifier,
  supprimer,
  obtenirParametres,
  telechargerRecuPaiementPdf,
  obtenirRecuPaiementPdfBlob,
} from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";
import RecuPaiementModal from "../components/RecuPaiementModal.jsx";
import ModalPaiementMobileMoney from "../components/ModalPaiementMobileMoney.jsx";
import VisualiseurPdfModal from "../components/VisualiseurPdfModal.jsx";
import { Eye, Download, Smartphone, CreditCard, Search } from "lucide-react";

const MODES_PAIEMENT = [
  { valeur: "especes", label: "Espèces" },
  { valeur: "mobile_money", label: "Mobile Money (Flooz / T-Money)" },
  { valeur: "cheque", label: "Chèque" },
  { valeur: "virement", label: "Virement bancaire" },
];

const LIBELLES_MODES = {
  especes: "Espèces",
  mobile_money: "Mobile Money",
  cheque: "Chèque",
  virement: "Virement",
};

const STYLES_MODES = {
  especes: { background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0" },
  mobile_money: { background: "#FFF7ED", color: "#C2410C", border: "1px solid #FFEDD5" },
  cheque: { background: "#F8FAFC", color: "#334155", border: "1px solid #CBD5E1" },
  virement: { background: "#EFF6FF", color: "#1E40AF", border: "1px solid #DBEAFE" },
};

const CHAMPS_VIDES = {
  eleveId: "",
  tranche: "1",
  montant: "",
  modePaiement: "especes",
  reference: "",
  anneeScolaire: "2026-2027",
};

function formaterDateFr(dateStr) {
  if (!dateStr) return "-";
  try {
    const parties = dateStr.split("T")[0].split("-");
    if (parties.length === 3) {
      const annee = parseInt(parties[0], 10);
      const mois = parseInt(parties[1], 10) - 1;
      const jour = parseInt(parties[2], 10);
      const d = new Date(annee, mois, jour);
      return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

function formaterMontant(montant) {
  const n = Number(montant || 0);
  return n.toLocaleString("fr-FR").replace(/\s/g, "\u00A0") + "\u00A0FCFA";
}

function formaterTranche(t) {
  if (!t) return "-";
  const num = parseInt(t, 10);
  if (num === 1) return "1re tranche";
  return num + "e tranche";
}

export default function GestionPaiements({ token, role }) {
  const estAdmin = role === "administrateur";
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
  const [modalMobileMoney, setModalMobileMoney] = useState(false);
  const [modalPdf, setModalPdf] = useState({ ouvert: false, blob: null, nomFichier: "", titreDoc: "" });

  const [champs, setChamps] = useState(CHAMPS_VIDES);
  const [recherche, setRecherche] = useState("");
  const [filtreMode, setFiltreMode] = useState("tous");

  useEffect(function () {
    obtenirParametres(token).then(setParametres).catch(function () {});
  }, [token]);

  const chargerTout = function () {
    setStatut("chargement");
    Promise.all([lister("paiements", token), lister("eleves", token)])
      .then(function (resultats) {
        const listeP = Array.isArray(resultats[0])
          ? resultats[0]
          : resultats[0] && Array.isArray(resultats[0].results)
          ? resultats[0].results
          : [];
        const listeE = Array.isArray(resultats[1])
          ? resultats[1]
          : resultats[1] && Array.isArray(resultats[1].results)
          ? resultats[1].results
          : [];
        setPaiements(listeP);
        setEleves(listeE);
        setStatut("ok");
      })
      .catch(function () {
        setStatut("refuse");
      });
  };

  useEffect(chargerTout, [token]);

  const modifierChamp = function (nom, valeur) {
    setChamps(function (c) {
      return Object.assign({}, c, { [nom]: valeur });
    });
  };

  const viderFormulaire = function () {
    setIdEnEdition(null);
    setChamps(CHAMPS_VIDES);
  };

  const commencerEdition = function (p) {
    setIdEnEdition(p.id);
    setChamps({
      eleveId: String(p.eleve),
      tranche: String(p.tranche || "1"),
      montant: String(p.montant),
      modePaiement: p.mode_paiement || "especes",
      reference: p.reference || "",
      anneeScolaire: p.annee_scolaire || "2026-2027",
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    const donnees = {
      eleve: Number(champs.eleveId),
      tranche: Number(champs.tranche),
      montant: champs.montant,
      mode_paiement: champs.modePaiement,
      reference: champs.reference,
      annee_scolaire: champs.anneeScolaire,
    };
    try {
      if (idEnEdition) {
        await modifier("paiements", idEnEdition, token, donnees);
        setMessage({ type: "succes", texte: "Paiement mis à jour avec succès." });
      } else {
        await creer("paiements", token, donnees);
        setMessage({ type: "succes", texte: "Paiement enregistré avec succès." });
      }
      viderFormulaire();
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message || "Erreur lors de l'enregistrement du paiement." });
    }
    setEnCours(false);
  };

  const supprimerPaiement = async function (p) {
    const nomEleve = p.eleve_nom || "cet élève";
    const montantFmt = Number(p.montant || 0).toLocaleString("fr-FR") + " FCFA";
    if (
      !(await confirmation.demander(
        "Êtes-vous sûr de vouloir supprimer le paiement de " + montantFmt + " pour " + nomEleve + " ?"
      ))
    )
      return;
    try {
      await supprimer("paiements", p.id, token);
      setMessage({ type: "succes", texte: "Paiement supprimé avec succès." });
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible du paiement." });
    }
  };

  const previsualiserPdf = async function (p) {
    try {
      setEnCoursPdfId(p.id);
      const nomEleve = (p.eleve_nom || "eleve").replace(/\s+/g, "_");
      const nomFichier = "recu_officiel_" + nomEleve + "_" + p.id + ".pdf";
      const blob = await obtenirRecuPaiementPdfBlob(p.id, token);
      setModalPdf({
        ouvert: true,
        blob: blob,
        nomFichier: nomFichier,
        titreDoc: `Reçu officiel N°${p.id} — ${p.eleve_nom || "Élève"}`,
      });
    } catch (err) {
      setMessage({ type: "erreur", texte: "Erreur aperçu PDF : " + (err.message || "") });
    } finally {
      setEnCoursPdfId(null);
    }
  };

  const telechargerDirectPdf = async function (p) {
    try {
      setEnCoursPdfId(p.id);
      const nomEleve = (p.eleve_nom || "eleve").replace(/\s+/g, "_");
      const nomFichier = "recu_officiel_" + nomEleve + "_" + p.id + ".pdf";
      await telechargerRecuPaiementPdf(p.id, token, nomFichier);
    } catch (err) {
      setMessage({ type: "erreur", texte: "Erreur téléchargement PDF : " + (err.message || "") });
    } finally {
      setEnCoursPdfId(null);
    }
  };

  // Tri alphabétique des élèves pour la liste déroulante
  const elevesTries = useMemo(() => {
    if (!Array.isArray(eleves)) return [];
    return [...eleves].sort(function (a, b) {
      return (a.nom || "").localeCompare(b.nom || "", "fr");
    });
  }, [eleves]);

  // Filtrage dynamique des paiements
  const paiementsFiltres = useMemo(() => {
    if (!Array.isArray(paiements)) return [];
    return paiements.filter(function (p) {
      if (filtreMode !== "tous" && p.mode_paiement !== filtreMode) {
        return false;
      }
      if (recherche.trim()) {
        const q = recherche.trim().toLowerCase();
        const eleveNom = (p.eleve_nom || "").toLowerCase();
        const ref = (p.reference || "").toLowerCase();
        const annee = (p.annee_scolaire || "").toLowerCase();
        const montantStr = String(p.montant || "");
        return eleveNom.includes(q) || ref.includes(q) || annee.includes(q) || montantStr.includes(q);
      }
      return true;
    });
  }, [paiements, recherche, filtreMode]);

  return (
    <>
      {/* HAUT DE PAGE ÉQUILIBRÉ : TITRE ET BOUTON ACTION COMPACT EN HAUT À DROITE */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div className="mag-page-title" style={{ margin: 0, paddingBottom: 0, borderBottom: "none" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#0F172A" }}>
            {role === "parent" ? "Scolarité & Paiements" : "Paiements"}
          </h1>
        </div>

        <button
          type="button"
          onClick={function () {
            setModalMobileMoney(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: "#EA580C",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "6px",
            padding: "0.55rem 1.15rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(234, 88, 12, 0.25)",
            transition: "background-color 0.15s ease",
          }}
          onMouseOver={function (e) {
            e.currentTarget.style.backgroundColor = "#C2410C";
          }}
          onMouseOut={function (e) {
            e.currentTarget.style.backgroundColor = "#EA580C";
          }}
        >
          <Smartphone size={16} />
          <span>Paiement Mobile Money (T-Money / Flooz)</span>
        </button>
      </div>

      {/* FORMULAIRE PLEINE LARGEUR (W-FULL) EN 2 LIGNES DE 3 COLONNES */}
      {estAdmin ? (
        <div
          className="mag-panneau-form react-fade-in"
          style={{
            marginBottom: "2rem",
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.2rem",
              borderBottom: "1px solid #F1F5F9",
              paddingBottom: "0.6rem",
            }}
          >
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#0F172A",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <CreditCard size={18} color="#1E3A8A" />
              <span>{idEnEdition ? "Modifier le paiement" : "Enregistrer un paiement"}</span>
            </div>
            {idEnEdition ? (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#64748B",
                  background: "#F1F5F9",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "4px",
                }}
              >
                Édition en cours
              </span>
            ) : null}
          </div>

          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

          <form onSubmit={soumettre}>
            {/* LIGNE 1 : 3 COLONNES (Élève, Tranche concernée, Montant) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div className="mag-field" style={{ margin: 0 }}>
                <label
                  htmlFor="pai-eleve"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                    display: "block",
                  }}
                >
                  Élève
                </label>
                <select
                  id="pai-eleve"
                  value={champs.eleveId}
                  onChange={function (e) {
                    modifierChamp("eleveId", e.target.value);
                  }}
                  required
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    backgroundColor: "#FFFFFF",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="">-- Choisir un élève --</option>
                  {elevesTries.map(function (el) {
                    const classeTxt = el.classe_nom ? " (" + el.classe_nom.split(" (")[0] + ")" : "";
                    const matTxt = el.matricule ? " [" + el.matricule.toUpperCase() + "]" : "";
                    return (
                      <option key={el.id} value={el.id}>
                        {el.nom} {el.prenom}
                        {classeTxt}
                        {matTxt}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label
                  htmlFor="pai-tranche"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                    display: "block",
                  }}
                >
                  Tranche concernée
                </label>
                <select
                  id="pai-tranche"
                  value={champs.tranche}
                  onChange={function (e) {
                    modifierChamp("tranche", e.target.value);
                  }}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    backgroundColor: "#FFFFFF",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="1">1ère tranche</option>
                  <option value="2">2ème tranche</option>
                  <option value="3">3ème tranche</option>
                </select>
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label
                  htmlFor="pai-montant"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                    display: "block",
                  }}
                >
                  Montant (FCFA)
                </label>
                <input
                  id="pai-montant"
                  type="number"
                  min="1"
                  step="1"
                  value={champs.montant}
                  onChange={function (e) {
                    modifierChamp("montant", e.target.value);
                  }}
                  placeholder="Ex: 25000"
                  required
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    backgroundColor: "#FFFFFF",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
            </div>

            {/* LIGNE 2 : 3 COLONNES (Mode de paiement, Référence / N° de reçu, Année scolaire) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <div className="mag-field" style={{ margin: 0 }}>
                <label
                  htmlFor="pai-mode"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                    display: "block",
                  }}
                >
                  Mode de paiement
                </label>
                <select
                  id="pai-mode"
                  value={champs.modePaiement}
                  onChange={function (e) {
                    modifierChamp("modePaiement", e.target.value);
                  }}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    backgroundColor: "#FFFFFF",
                    fontSize: "0.85rem",
                  }}
                >
                  {MODES_PAIEMENT.map(function (m) {
                    return (
                      <option key={m.valeur} value={m.valeur}>
                        {m.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label
                  htmlFor="pai-reference"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                    display: "block",
                  }}
                >
                  Référence / N° de reçu
                </label>
                <input
                  id="pai-reference"
                  type="text"
                  value={champs.reference}
                  onChange={function (e) {
                    modifierChamp("reference", e.target.value);
                  }}
                  placeholder="Ex: REC-2026-001 ou ID transaction"
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    backgroundColor: "#FFFFFF",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label
                  htmlFor="pai-annee"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                    display: "block",
                  }}
                >
                  Année scolaire
                </label>
                <input
                  id="pai-annee"
                  type="text"
                  value={champs.anneeScolaire}
                  onChange={function (e) {
                    modifierChamp("anneeScolaire", e.target.value);
                  }}
                  placeholder="Ex: 2026-2027"
                  required
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    backgroundColor: "#FFFFFF",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
            </div>

            {/* BOUTONS D'ACTION */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                type="submit"
                style={{
                  width: "auto",
                  padding: "0.6rem 1.8rem",
                  backgroundColor: "#1E3A8A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                disabled={enCours}
              >
                {enCours ? (
                  <span className="react-spinner"></span>
                ) : idEnEdition ? (
                  "Enregistrer les modifications"
                ) : (
                  "Enregistrer le paiement"
                )}
              </button>
              {idEnEdition ? (
                <button
                  type="button"
                  className="mag-btn-lien"
                  onClick={viderFormulaire}
                  style={{ fontSize: "0.875rem", color: "#64748B", cursor: "pointer" }}
                >
                  Annuler
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      {/* SECTION HISTORIQUE DES PAIEMENTS */}
      <div
        className="mag-section-entete"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.8rem",
        }}
      >
        <div className="mag-stat-label" style={{ fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>
          {role === "parent" ? "Quittances et reçus de paiement de mon enfant" : "Historique des paiements"}
        </div>
        <span className="mag-compteur-pill">{paiementsFiltres.length}</span>
      </div>

      {/* BARRE DE RECHERCHE ET FILTRE PAR MODE DE PAIEMENT */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 280px", position: "relative" }}>
          <input
            type="text"
            value={recherche}
            onChange={function (e) {
              setRecherche(e.target.value);
            }}
            placeholder="Rechercher un élève ou un n° de reçu..."
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem 0.5rem 2.2rem",
              fontSize: "0.85rem",
              border: "1px solid #CBD5E1",
              borderRadius: "6px",
              backgroundColor: "#FFFFFF",
            }}
          />
          <Search
            size={15}
            color="#94A3B8"
            style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }}
          />
        </div>

        <div style={{ minWidth: "200px" }}>
          <select
            value={filtreMode}
            onChange={function (e) {
              setFiltreMode(e.target.value);
            }}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              fontSize: "0.85rem",
              border: "1px solid #CBD5E1",
              borderRadius: "6px",
              backgroundColor: "#FFFFFF",
            }}
          >
            <option value="tous">Tous les modes de paiement</option>
            <option value="especes">Espèces</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="cheque">Chèque</option>
            <option value="virement">Virement</option>
          </select>
        </div>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement des paiements..." /> : null}
      {statut === "refuse" ? <Alerte type="erreur">Impossible de charger les paiements.</Alerte> : null}
      {statut === "ok" ? (
        <div className="mag-table-wrap react-fade-in" style={{ overflowX: "auto" }}>
          <table className="mag-table mag-table-pro">
            <thead>
              <tr>
                <th>Élève</th>
                <th>Tranche</th>
                <th style={{ whiteSpace: "nowrap" }}>Montant</th>
                <th style={{ whiteSpace: "nowrap" }}>Mode</th>
                <th style={{ whiteSpace: "nowrap" }}>Date</th>
                <th style={{ whiteSpace: "nowrap" }}>Référence</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!Array.isArray(paiementsFiltres) || paiementsFiltres.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}>
                    {recherche.trim() || filtreMode !== "tous"
                      ? "Aucun paiement ne correspond à vos critères de recherche."
                      : role === "parent"
                      ? "Aucun paiement enregistré pour votre enfant pour le moment. Vous pouvez régler la scolarité par Mobile Money ci-dessus."
                      : "Aucun paiement enregistré pour le moment."}
                  </td>
                </tr>
              ) : (
                paiementsFiltres.map(function (p) {
                  const modeStyle =
                    STYLES_MODES[p.mode_paiement] || {
                      background: "#F1F5F9",
                      color: "#475569",
                      border: "1px solid #E2E8F0",
                    };
                  const modeTexte = LIBELLES_MODES[p.mode_paiement] || p.mode_paiement;

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: "#0F172A" }}>{p.eleve_nom || p.eleve}</td>
                      <td style={{ whiteSpace: "nowrap", color: "#475569" }}>{formaterTranche(p.tranche)}</td>
                      <td style={{ whiteSpace: "nowrap", fontWeight: 700, color: "#0F172A" }}>
                        {formaterMontant(p.montant)}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.2rem 0.55rem",
                            borderRadius: "4px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            ...modeStyle,
                          }}
                        >
                          {modeTexte}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "#475569" }}>{formaterDateFr(p.date_paiement)}</td>
                      <td
                        style={{
                          whiteSpace: "nowrap",
                          fontFamily: "monospace",
                          fontSize: "0.85rem",
                          color: "#334155",
                        }}
                      >
                        {p.reference || "-"}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="mag-btn-lien"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            color: "#0284C7",
                            fontWeight: 600,
                            marginRight: "0.5rem",
                          }}
                          onClick={function () {
                            previsualiserPdf(p);
                          }}
                          disabled={enCoursPdfId === p.id}
                          title="Aperçu et impression directe du reçu officiel"
                        >
                          <Eye size={14} /> {enCoursPdfId === p.id ? "..." : "Aperçu"}
                        </button>
                        <button
                          type="button"
                          className="mag-btn-lien"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontWeight: 600,
                            color: "#1E3A8A",
                            marginRight: estAdmin ? "0.5rem" : 0,
                          }}
                          onClick={function () {
                            telechargerDirectPdf(p);
                          }}
                          disabled={enCoursPdfId === p.id}
                          title="Télécharger le reçu officiel PDF certifié ReportLab"
                        >
                          <Download size={14} /> {enCoursPdfId === p.id ? "PDF..." : "PDF"}
                        </button>
                        {estAdmin ? (
                          <>
                            <button
                              type="button"
                              className="mag-btn-lien"
                              style={{ marginRight: "0.5rem" }}
                              onClick={function () {
                                commencerEdition(p);
                              }}
                            >
                              Modifier
                            </button>
                            <BoutonSupprimer
                              onClick={function () {
                                supprimerPaiement(p);
                              }}
                            />
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
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

      {modalMobileMoney ? (
        <ModalPaiementMobileMoney
          token={token}
          eleves={eleves}
          onFermer={function () {
            setModalMobileMoney(false);
          }}
          onSucces={function () {
            chargerTout();
            setModalMobileMoney(false);
          }}
        />
      ) : null}

      {paiementPourRecu ? (
        <RecuPaiementModal
          paiement={paiementPourRecu}
          parametres={parametres}
          onFermer={function () {
            setPaiementPourRecu(null);
          }}
        />
      ) : null}

      {/* Visualiseur Modal PDF officiel */}
      <VisualiseurPdfModal
        ouvert={modalPdf.ouvert}
        onFermer={function () {
          setModalPdf({ ouvert: false, blob: null, nomFichier: "", titreDoc: "" });
        }}
        blob={modalPdf.blob}
        nomFichier={modalPdf.nomFichier}
        titreDoc={modalPdf.titreDoc}
      />
    </>
  );
}
