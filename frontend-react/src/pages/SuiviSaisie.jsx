// src/pages/SuiviSaisie.jsx
// Tableau de bord de pilotage academique et suivi de la saisie des notes (Censeur & Direction)
import { useState, useEffect, useMemo } from "react";
import { obtenirSuiviSaisie, modifierParametres } from "../api.js";
import { Alerte, CarteStat } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import { traduireTexte } from "../localisation.js";
import { Download, Lock, Unlock, MessageCircle, Search } from "lucide-react";

function PastilleStatut({ statut }) {
  const config = {
    termine: { texte: "Terminé", classe: "react-statut-termine", couleur: "#16A34A", fond: "#DCFCE7" },
    en_cours: { texte: "En cours", classe: "react-statut-en-cours", couleur: "#D97706", fond: "#FEF3C7" },
    pas_commence: { texte: "Pas commencé", classe: "react-statut-pas-commence", couleur: "#DC2626", fond: "#FEE2E2" },
  };
  const c = config[statut] || config.pas_commence;
  return (
    <span
      className={"react-pastille-statut " + c.classe}
      style={{ background: c.fond, color: c.couleur, fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: "12px", fontSize: "0.75rem", display: "inline-block" }}
    >
      {traduireTexte(c.texte)}
    </span>
  );
}

export default function SuiviSaisie({ token }) {
  const [trimestre, setTrimestre] = useState(1);
  const [donnees, setDonnees] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [recherche, setRecherche] = useState("");
  const [filtreClasse, setFiltreClasse] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [actionEnCours, setActionEnCours] = useState(false);
  const [message, setMessage] = useState(null);

  const charger = function () {
    setStatut("chargement");
    obtenirSuiviSaisie(token, trimestre)
      .then(function (d) {
        setDonnees(d);
        setStatut("ok");
      })
      .catch(function () {
        setDonnees([]);
        setStatut("refuse");
      });
  };

  useEffect(charger, [token, trimestre]);

  const estVerrouille = useMemo(function () {
    if (!donnees || donnees.length === 0) return false;
    return Boolean(donnees[0].trimestre_verrouille);
  }, [donnees]);

  const classesDisponibles = useMemo(function () {
    const ens = new Set();
    donnees.forEach(function (d) { if (d.classe) ens.add(d.classe); });
    return Array.from(ens).sort();
  }, [donnees]);

  const resume = useMemo(function () {
    const total = donnees.length;
    const termine = donnees.filter(function (d) { return d.statut === "termine"; }).length;
    const enCours = donnees.filter(function (d) { return d.statut === "en_cours"; }).length;
    const pasCommence = donnees.filter(function (d) { return d.statut === "pas_commence"; }).length;
    const pctGlobal = total > 0 ? Math.round((termine / total) * 100) : 0;
    return { total: total, termine: termine, enCours: enCours, pasCommence: pasCommence, pctGlobal: pctGlobal };
  }, [donnees]);

  const donneesFiltrees = useMemo(function () {
    const q = recherche.trim().toLowerCase();
    return donnees.filter(function (d) {
      if (filtreClasse && d.classe !== filtreClasse) return false;
      if (filtreStatut && d.statut !== filtreStatut) return false;
      if (q) {
        const texte = (d.enseignant + " " + d.classe + " " + d.matiere).toLowerCase();
        if (texte.indexOf(q) === -1) return false;
      }
      return true;
    });
  }, [donnees, recherche, filtreClasse, filtreStatut]);

  const basculerVerrouillage = async function () {
    const nouvelEtat = !estVerrouille;
    const messageConfirmation = nouvelEtat
      ? "Confirmez-vous le VERROUILLAGE du Trimestre " + trimestre + " ? Les enseignants ne pourront plus modifier leurs notes."
      : "Confirmez-vous le DÉVERROUILLAGE du Trimestre " + trimestre + " ? Les enseignants pourront à nouveau saisir et modifier les notes.";
    if (!window.confirm(messageConfirmation)) return;

    setActionEnCours(true);
    setMessage(null);
    try {
      const payload = {};
      payload["notes_verrouillees_t" + trimestre] = nouvelEtat;
      await modifierParametres(token, payload);
      setMessage({
        type: "succes",
        texte: nouvelEtat
          ? "Trimestre " + trimestre + " verrouillé avec succès (clôture officielle des notes)."
          : "Trimestre " + trimestre + " déverrouillé : saisie des notes réouverte.",
      });
      charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message || "Erreur lors de la modification du verrouillage." });
    }
    setActionEnCours(false);
  };

  const exporterCsv = function () {
    if (donneesFiltrees.length === 0) return;
    const entetes = ["Enseignant", "Telephone", "Classe", "Matiere", "Coeff", "Total Eleves", "Eleves Notes", "Compositions", "Devoirs", "Progression (%)", "Moyenne Classe", "Taux Reussite (%)", "Statut"];
    const lignes = donneesFiltrees.map(function (d) {
      return [
        '"' + (d.enseignant || "").replace(/"/g, '""') + '"',
        '"' + (d.enseignant_telephone || "").replace(/"/g, '""') + '"',
        '"' + (d.classe || "").replace(/"/g, '""') + '"',
        '"' + (d.matiere || "").replace(/"/g, '""') + '"',
        d.matiere_coeff || 1,
        d.total_eleves || 0,
        d.eleves_avec_note || 0,
        d.eleves_avec_compo || 0,
        d.eleves_avec_devoir || 0,
        d.pct_progression + "%",
        d.moyenne_matiere !== null ? d.moyenne_matiere : "-",
        d.taux_reussite_pct !== null ? d.taux_reussite_pct + "%" : "-",
        d.statut === "termine" ? "Termine" : (d.statut === "en_cours" ? "En cours" : "Pas commence"),
      ].join(",");
    });
    const csvContenu = "data:text/csv;charset=utf-8,\uFEFF" + [entetes.join(","), ...lignes].join("\n");
    const encodedUri = encodeURI(csvContenu);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "suivi_notes_trimestre_" + trimestre + "_magnificat.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="mag-page-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="eyebrow">Direction Pédagogique</span> Suivi de la saisie des notes
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-mag-outline"
            onClick={exporterCsv}
            disabled={donnees.length === 0}
            style={{ fontSize: "0.82rem", padding: "0.45rem 0.9rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            title="Exporter l'état de la saisie au format CSV Excel"
          >
            <Download size={14} /> Exporter rapport CSV
          </button>
          <button
            type="button"
            className="mag-btn-primary"
            onClick={basculerVerrouillage}
            disabled={actionEnCours || statut !== "ok"}
            style={{
              fontSize: "0.82rem",
              padding: "0.45rem 1rem",
              background: estVerrouille ? "#DC2626" : "#0284C7",
              borderColor: estVerrouille ? "#DC2626" : "#0284C7",
              width: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            {actionEnCours ? (
              <span className="react-spinner"></span>
            ) : estVerrouille ? (
              <>
                <Unlock size={14} /> Déverrouiller le T{trimestre}
              </>
            ) : (
              <>
                <Lock size={14} /> Clôturer & Verrouiller T{trimestre}
              </>
            )}
          </button>
        </div>
      </div>

      {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

      {/* Barre de pilotage Trimestre + Statut de clôture */}
      <div className="mag-card" style={{ marginBottom: "1.5rem", padding: "1.2rem 1.4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <label htmlFor="suivi-trimestre" style={{ fontSize: "0.82rem", fontWeight: "700", display: "block", marginBottom: "0.3rem", color: "var(--ink-700)" }}>
                Période académique
              </label>
              <select
                id="suivi-trimestre"
                value={trimestre}
                onChange={function (e) { setTrimestre(Number(e.target.value)); }}
                style={{ minWidth: "180px", padding: "0.55rem 0.8rem", border: "1px solid var(--line)", borderRadius: "8px", fontWeight: 600 }}
              >
                <option value={1}>1er trimestre</option>
                <option value={2}>2e trimestre</option>
                <option value={3}>3e trimestre</option>
              </select>
            </div>
            <div style={{ paddingTop: "1.2rem" }}>
              {estVerrouille ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.8rem", borderRadius: "8px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", fontSize: "0.85rem", fontWeight: 700 }}>
                  <Lock size={14} /> Trimestre {trimestre} Clôturé (Lecture seule)
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.8rem", borderRadius: "8px", background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", fontSize: "0.85rem", fontWeight: 700 }}>
                  <Unlock size={14} /> Saisie Ouverte aux Enseignants
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.82rem", color: "var(--ink-600)", marginBottom: "0.2rem" }}>Avancement global T{trimestre}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: resume.pctGlobal === 100 ? "var(--green-600)" : "var(--indigo-950)" }}>
              {resume.pctGlobal}%
            </div>
          </div>
        </div>
      </div>

      {statut === "chargement" ? <Spinner texte="Calcul des indicateurs de saisie..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger le tableau de suivi des notes.</Alerte> : null}

      {statut === "ok" ? (
        donnees.length === 0 ? (
          <div className="mag-card" style={{ textAlign: "center", padding: "2.5rem", color: "var(--ink-600)" }}>
            Aucune attribution de cours configurée pour ce trimestre.
          </div>
        ) : (
          <>
            {/* 4 Cartes KPIs de Pilotage */}
            <div className="mag-grid-4-auto" style={{ marginBottom: "1.5rem" }}>
              <CarteStat label="Total Attributions" valeur={resume.total} />
              <CarteStat label="Saisie Terminée" valeur={resume.termine} couleur="#16A34A" />
              <CarteStat label="En cours de saisie" valeur={resume.enCours} couleur="#D97706" />
              <CarteStat label="En retard / Non commencé" valeur={resume.pasCommence} couleur="#DC2626" />
            </div>

            {/* Filtres et Recherche rapide */}
            <div className="mag-card" style={{ marginBottom: "1.2rem", padding: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.8rem", alignItems: "center" }}>
                <div>
                  <input
                    type="search"
                    placeholder="Rechercher enseignant, classe, matière..."
                    value={recherche}
                    onChange={function (e) { setRecherche(e.target.value); }}
                    style={{ width: "100%", padding: "0.55rem 0.8rem", border: "1px solid var(--line)", borderRadius: "8px", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <select
                    value={filtreClasse}
                    onChange={function (e) { setFiltreClasse(e.target.value); }}
                    style={{ width: "100%", padding: "0.55rem 0.8rem", border: "1px solid var(--line)", borderRadius: "8px", fontSize: "0.85rem" }}
                  >
                    <option value="">Toutes les classes</option>
                    {classesDisponibles.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
                  </select>
                </div>
                <div>
                  <select
                    value={filtreStatut}
                    onChange={function (e) { setFiltreStatut(e.target.value); }}
                    style={{ width: "100%", padding: "0.55rem 0.8rem", border: "1px solid var(--line)", borderRadius: "8px", fontSize: "0.85rem" }}
                  >
                    <option value="">Tous les statuts</option>
                    <option value="pas_commence">En retard (Non commencé)</option>
                    <option value="en_cours">En cours de saisie</option>
                    <option value="termine">Saisie terminée</option>
                  </select>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.82rem", color: "var(--ink-600)" }}>
                  Affichage : <strong>{donneesFiltrees.length}</strong> / {donnees.length} cours
                </div>
              </div>
            </div>

            {/* Tableau Haute Précision */}
            <div className="mag-table-wrap react-fade-in">
              <table className="mag-table mag-table-pro">
                <thead>
                  <tr>
                    <th>Enseignant</th>
                    <th>Classe &amp; Matière</th>
                    <th style={{ textAlign: "center" }}>Progression</th>
                    <th style={{ textAlign: "center" }}>Détail Évals</th>
                    <th style={{ textAlign: "center" }}>Moyenne / Réussite</th>
                    <th style={{ textAlign: "center" }}>Statut</th>
                    <th style={{ textAlign: "center" }}>Action Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {donneesFiltrees.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--ink-600)" }}>
                        Aucun cours ne correspond aux critères de recherche.
                      </td>
                    </tr>
                  ) : (
                    donneesFiltrees.map(function (ligne, i) {
                      const msgRelance = encodeURIComponent(
                        "Bonjour " + ligne.enseignant + ", la direction du Complexe Scolaire Le Magnificat (Lomé) vous rappelle que la saisie des notes de " +
                        ligne.matiere + " en classe de " + ligne.classe + " (Trimestre " + trimestre + ") est actuellement en attente (" +
                        ligne.eleves_avec_note + "/" + ligne.total_eleves + " élèves notés). Merci de finaliser la saisie rapidement pour l'édition des bulletins. Cordialement."
                      );
                      const telClean = (ligne.enseignant_telephone || "").replace(/[^0-9]/g, "");

                      return (
                        <tr key={i}>
                          <td>
                            <div style={{ fontWeight: 700, color: "var(--ink-900)" }}>{ligne.enseignant}</div>
                            {ligne.enseignant_telephone ? (
                              <div style={{ fontSize: "0.78rem", color: "var(--ink-500)" }}>{ligne.enseignant_telephone}</div>
                            ) : null}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                              <span className="mag-badge" style={{ background: "rgba(2, 132, 199, 0.1)", color: "#0284C7", fontWeight: 700 }}>
                                {ligne.classe}
                              </span>
                              <span style={{ fontWeight: 600 }}>{ligne.matiere}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--ink-400)" }}>Coeff {ligne.matiere_coeff}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: "center", minWidth: "140px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={{ flex: 1, height: "8px", background: "var(--line, #E2E8F0)", borderRadius: "4px", overflow: "hidden" }}>
                                <div
                                  style={{
                                    width: Math.min(100, ligne.pct_progression) + "%",
                                    height: "100%",
                                    background: ligne.statut === "termine" ? "#16A34A" : (ligne.statut === "en_cours" ? "#D97706" : "#DC2626"),
                                    borderRadius: "4px",
                                    transition: "width 0.3s ease",
                                  }}
                                ></div>
                              </div>
                              <span style={{ fontSize: "0.8rem", fontWeight: 700, minWidth: "35px" }}>
                                {ligne.pct_progression}%
                              </span>
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--ink-500)", marginTop: "0.2rem" }}>
                              {ligne.eleves_avec_note} / {ligne.total_eleves} élèves
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "0.78rem" }}>
                              <span>Devoirs : <strong>{ligne.eleves_avec_devoir}</strong></span>
                              <span style={{ margin: "0 0.3rem", color: "var(--line)" }}>|</span>
                              <span>Compo : <strong>{ligne.eleves_avec_compo}</strong></span>
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {ligne.moyenne_matiere !== null ? (
                              <div>
                                <span style={{ fontWeight: 800, color: ligne.moyenne_matiere >= 10 ? "#16A34A" : "#DC2626" }}>
                                  {ligne.moyenne_matiere} / 20
                                </span>
                                <div style={{ fontSize: "0.72rem", color: "var(--ink-500)" }}>
                                  {ligne.taux_reussite_pct}% ≥ 10
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: "var(--ink-400)", fontSize: "0.85rem" }}>-</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <PastilleStatut statut={ligne.statut} />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                              {ligne.statut !== "termine" && telClean ? (
                                <a
                                  href={"https://wa.me/" + telClean + "?text=" + msgRelance}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-mag-outline"
                                  style={{
                                    fontSize: "0.72rem",
                                    padding: "0.2rem 0.5rem",
                                    color: "#16A34A",
                                    borderColor: "#16A34A",
                                    textDecoration: "none",
                                    borderRadius: "4px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.2rem",
                                    fontWeight: 700,
                                  }}
                                  title="Envoyer un rappel officiel sur WhatsApp à l'enseignant"
                                >
                                  <MessageCircle size={13} /> Relancer
                                </a>
                              ) : null}
                              <button
                                type="button"
                                className="mag-btn-lien"
                                style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                                onClick={function () { window.location.hash = "/notes"; }}
                                title="Accéder à la grille de saisie des notes"
                              >
                                Saisir →
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : null}
    </>
  );
}
