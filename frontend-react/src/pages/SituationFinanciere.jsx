// src/pages/SituationFinanciere.jsx
// Pour une classe donnée : montant dû par tranche (définissable par
// l'Administrateur) et, pour chaque élève, le dû/payé/reste par tranche.
// Réservé à l'Administrateur.
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, obtenirSituationFinanciere } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import { Coins, PieChart } from "lucide-react";

function formaterFcfa(valeur) {
  const n = Math.round(Number(valeur) || 0);
  return n.toLocaleString("fr-FR").replace(/\s/g, "\u00A0") + "\u00A0FCFA";
}

function formaterNomTranche(t) {
  const num = typeof t === "object" ? parseInt(t.valeur, 10) : parseInt(t, 10);
  if (num === 1) return "1re tranche";
  if (num === 2) return "2e tranche";
  if (num === 3) return "3e tranche";
  return num ? `${num}e tranche` : String(t);
}

export default function SituationFinanciere({ token }) {
  const [classes, setClasses] = useState([]);
  const [classeId, setClasseId] = useState("");
  const [frais, setFrais] = useState([]);
  const [situation, setSituation] = useState(null);
  const [statutClasses, setStatutClasses] = useState("chargement");
  const [chargementSituation, setChargementSituation] = useState(false);
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const [montants, setMontants] = useState({ 1: "", 2: "", 3: "" });

  useEffect(function () {
    lister("classes", token)
      .then(function (donnees) {
        setClasses(Array.isArray(donnees) ? donnees : []);
        setStatutClasses("ok");
      })
      .catch(function () {
        setStatutClasses("refuse");
      });
  }, [token]);

  const chargerSituation = function () {
    if (!classeId) return;
    setChargementSituation(true);
    Promise.all([
      obtenirSituationFinanciere(token, classeId),
      lister("frais-scolarite", token),
    ])
      .then(function (resultats) {
        setSituation(resultats[0]);
        const listeFrais = Array.isArray(resultats[1])
          ? resultats[1]
          : resultats[1] && Array.isArray(resultats[1].results)
          ? resultats[1].results
          : [];
        const fraisClasse = listeFrais.filter(function (f) {
          return String(f.classe) === String(classeId);
        });
        setFrais(fraisClasse);
        const m = { 1: "", 2: "", 3: "" };
        fraisClasse.forEach(function (f) {
          // Sans décimales ,00 inutiles pour le FCFA
          m[f.tranche] = String(Math.round(Number(f.montant_du)) || "");
        });
        setMontants(m);
      })
      .catch(function () {
        setMessage({ type: "erreur", texte: "Erreur lors du chargement de la situation financière." });
      })
      .finally(function () {
        setChargementSituation(false);
      });
  };

  useEffect(chargerSituation, [classeId, token]);

  const enregistrerFrais = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      for (const tranche of [1, 2, 3]) {
        const valeur = (montants[tranche] || "").trim();
        if (!valeur) continue;
        const existant = frais.find(function (f) {
          return f.tranche === tranche;
        });
        if (existant) {
          await modifier("frais-scolarite", existant.id, token, { montant_du: valeur });
        } else {
          await creer("frais-scolarite", token, {
            classe: Number(classeId),
            tranche: tranche,
            montant_du: valeur,
          });
        }
      }
      setMessage({ type: "succes", texte: "Frais de scolarité mis à jour avec succès." });
      chargerSituation();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message || "Erreur lors de l'enregistrement des frais." });
    }
    setEnCours(false);
  };

  // Tri logique des classes (6e A, 6e B, 5e A, 4e A, 3e A...)
  const classesTriees = useMemo(() => {
    if (!Array.isArray(classes)) return [];
    const ordreNiveaux = {
      "6e": 1,
      "5e": 2,
      "4e": 3,
      "3e": 4,
      "2nde": 5,
      "1ere": 6,
      "1re": 6,
      "tle": 7,
      "terminale": 7,
    };
    return [...classes].sort(function (a, b) {
      const nomA = (a.nom || "").trim().toLowerCase();
      const nomB = (b.nom || "").trim().toLowerCase();
      const matchA = nomA.match(/^(\d+e|2nde|1ere|1re|tle|terminale)\s*(.*)$/);
      const matchB = nomB.match(/^(\d+e|2nde|1ere|1re|tle|terminale)\s*(.*)$/);
      if (matchA && matchB) {
        const poidA = ordreNiveaux[matchA[1]] || 99;
        const poidB = ordreNiveaux[matchB[1]] || 99;
        if (poidA !== poidB) return poidA - poidB;
        return matchA[2].localeCompare(matchB[2]);
      }
      return nomA.localeCompare(nomB);
    });
  }, [classes]);

  // Calcul des totaux généraux pour la classe
  const totalGeneral = useMemo(
    function () {
      if (!situation || !Array.isArray(situation.lignes)) return null;
      return situation.lignes.reduce(
        function (acc, l) {
          acc.du += Number(l.total_du || 0);
          acc.paye += Number(l.total_paye || 0);
          acc.reste += Number(l.total_reste || 0);
          return acc;
        },
        { du: 0, paye: 0, reste: 0 }
      );
    },
    [situation]
  );

  const tauxRecouvrement = totalGeneral && totalGeneral.du > 0
    ? Math.round((totalGeneral.paye / totalGeneral.du) * 100)
    : 0;

  return (
    <>
      <div className="mag-page-title-ligne">
        <div className="mag-page-title">
          <h1>Situation financière</h1>
        </div>
      </div>

      {statutClasses === "chargement" ? <Spinner texte="Chargement des classes..." /> : null}
      {statutClasses === "refuse" ? <Alerte type="erreur">Impossible de charger les classes.</Alerte> : null}

      {statutClasses === "ok" ? (
        <div
          className="mag-panneau-form"
          style={{
            marginBottom: "1.5rem",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            padding: "0.9rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <label
            htmlFor="sit-classe"
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#0F172A",
              margin: 0,
              whiteSpace: "nowrap",
            }}
          >
            Classe concernée :
          </label>
          <select
            id="sit-classe"
            value={classeId}
            onChange={function (e) {
              setClasseId(e.target.value);
            }}
            style={{
              minWidth: "260px",
              padding: "0.5rem 0.75rem",
              border: "1px solid #CBD5E1",
              borderRadius: "6px",
              fontSize: "0.85rem",
              backgroundColor: "#FFFFFF",
              color: "#0F172A",
            }}
          >
            <option value="">-- Choisir une classe --</option>
            {classesTriees.map(function (c) {
              return (
                <option key={c.id} value={c.id}>
                  {c.nom} {c.annee_scolaire ? `(${c.annee_scolaire})` : ""}
                </option>
              );
            })}
          </select>

          {classeId && situation ? (
            <span style={{ fontSize: "0.82rem", color: "#64748B", marginLeft: "auto" }}>
              Effectif : <strong>{situation.lignes.length} élève{situation.lignes.length > 1 ? "s" : ""}</strong>
            </span>
          ) : null}
        </div>
      ) : null}

      {!classeId ? (
        <div
          className="mag-card"
          style={{
            textAlign: "center",
            padding: "2.5rem",
            border: "1px dashed #CBD5E1",
            borderRadius: "8px",
            color: "#64748B",
            background: "#F8FAFC",
            fontSize: "0.9rem",
          }}
        >
          Choisissez une classe ci-dessus pour consulter sa situation financière.
        </div>
      ) : chargementSituation ? (
        <Spinner texte="Chargement de la situation financière..." />
      ) : (
        <div className="react-fade-in">
          {/* GRILLE ÉQUILIBRÉE EN 2 COLONNES (COL-SPAN-7 / COL-SPAN-5) */}
          <div className="mag-finance-grid">
            {/* CARTE GAUCHE : DÉFINIR LES FRAIS (col-span-7) */}
            <div
              className="mag-panneau-form"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "#0F172A",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Coins size={17} color="#1E3A8A" />
                  <span>Définir les frais de scolarité (par tranche)</span>
                </div>

                {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

                <form onSubmit={enregistrerFrais}>
                  {/* LES 3 CHAMPS ALIGNÉS SUR UNE SEULE LIGNE HORIZONTALE */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "0.75rem",
                      marginBottom: "1.2rem",
                    }}
                  >
                    {[1, 2, 3].map(function (tranche) {
                      const libelle = tranche === 1 ? "1re tranche (FCFA)" : `${tranche}e tranche (FCFA)`;
                      return (
                        <div className="mag-field" key={tranche} style={{ margin: 0 }}>
                          <label
                            htmlFor={"montant-" + tranche}
                            style={{
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              color: "#475569",
                              marginBottom: "0.35rem",
                              display: "block",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {libelle}
                          </label>
                          <input
                            id={"montant-" + tranche}
                            type="number"
                            min="0"
                            step="100"
                            value={montants[tranche]}
                            onChange={function (e) {
                              setMontants(Object.assign({}, montants, { [tranche]: e.target.value }));
                            }}
                            placeholder="Ex: 25000"
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
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    style={{
                      width: "auto",
                      padding: "0.6rem 1.6rem",
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
                    {enCours ? <span className="react-spinner"></span> : "Enregistrer les frais"}
                  </button>
                </form>
              </div>
            </div>

            {/* CARTE DROITE : SYNTHÈSE FINANCIÈRE DE LA CLASSE (col-span-5) */}
            <div
              className="mag-panneau-form"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "#0F172A",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <PieChart size={17} color="#1E3A8A" />
                  <span>Synthèse financière de la classe</span>
                </div>

                {totalGeneral ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.75rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      style={{
                        background: "#F8FAFC",
                        padding: "0.7rem",
                        borderRadius: "6px",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 500, marginBottom: "0.2rem" }}>
                        Total attendu
                      </div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap" }}>
                        {formaterFcfa(totalGeneral.du)}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#F0FDF4",
                        padding: "0.7rem",
                        borderRadius: "6px",
                        border: "1px solid #BBF7D0",
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 500, marginBottom: "0.2rem" }}>
                        Montant encaissé
                      </div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#15803D", whiteSpace: "nowrap" }}>
                        {formaterFcfa(totalGeneral.paye)}
                      </div>
                    </div>

                    <div
                      style={{
                        background: totalGeneral.reste > 0 ? "#FEF2F2" : "#F8FAFC",
                        padding: "0.7rem",
                        borderRadius: "6px",
                        border: totalGeneral.reste > 0 ? "1px solid #FECACA" : "1px solid #E2E8F0",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: totalGeneral.reste > 0 ? "#991B1B" : "#64748B",
                          fontWeight: 500,
                          marginBottom: "0.2rem",
                        }}
                      >
                        Reste à recouvrer
                      </div>
                      <div
                        style={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: totalGeneral.reste > 0 ? "#DC2626" : "#0F172A",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formaterFcfa(totalGeneral.reste)}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#EFF6FF",
                        padding: "0.7rem",
                        borderRadius: "6px",
                        border: "1px solid #BFDBFE",
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", color: "#1E40AF", fontWeight: 500, marginBottom: "0.2rem" }}>
                        Élèves inscrits
                      </div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1D4ED8", whiteSpace: "nowrap" }}>
                        {situation ? situation.lignes.length : 0} élève{situation && situation.lignes.length > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#64748B", fontSize: "0.85rem", padding: "1rem 0" }}>
                    Aucune donnée financière calculée.
                  </div>
                )}
              </div>

              {totalGeneral ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.35rem",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span style={{ color: "#475569", fontWeight: 500 }}>Taux de recouvrement</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          totalGeneral.du > 0 && totalGeneral.paye / totalGeneral.du >= 0.75
                            ? "#15803D"
                            : "#1E3A8A",
                      }}
                    >
                      {tauxRecouvrement}&nbsp;%
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "#E2E8F0",
                      borderRadius: "9999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, tauxRecouvrement)}%`,
                        height: "100%",
                        background:
                          tauxRecouvrement >= 75
                            ? "#16A34A"
                            : tauxRecouvrement >= 50
                            ? "#2563EB"
                            : "#D97706",
                        borderRadius: "9999px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* TABLEAU : DÉTAIL PAR ÉLÈVE */}
          {situation ? (
            <>
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
                  Détail par élève
                </div>
                <span className="mag-compteur-pill">{situation.lignes.length}</span>
              </div>

              <div className="mag-table-wrap react-fade-in" style={{ overflowX: "auto" }}>
                <table className="mag-table mag-table-pro">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Élève</th>
                      {situation.tranche_choices.map(function (t) {
                        return (
                          <th key={t.valeur} style={{ whiteSpace: "nowrap" }}>
                            {formaterNomTranche(t)}
                          </th>
                        );
                      })}
                      <th style={{ whiteSpace: "nowrap" }}>Total dû</th>
                      <th style={{ whiteSpace: "nowrap" }}>Total payé</th>
                      <th style={{ whiteSpace: "nowrap" }}>Reste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {situation.lignes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5 + situation.tranche_choices.length}
                          style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}
                        >
                          Aucun élève inscrit dans cette classe.
                        </td>
                      </tr>
                    ) : (
                      situation.lignes.map(function (ligne) {
                        return (
                          <tr key={ligne.eleve_id}>
                            <td style={{ fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>
                              {ligne.eleve_nom}
                            </td>
                            {ligne.tranches.map(function (t) {
                              const reste = Number(t.reste);
                              return (
                                <td key={t.tranche} style={{ whiteSpace: "nowrap" }}>
                                  {reste > 0 ? (
                                    <span
                                      className="mag-badge-erreur"
                                      style={{ whiteSpace: "nowrap", padding: "0.2rem 0.5rem" }}
                                    >
                                      {formaterFcfa(t.paye)} / {formaterFcfa(t.du)}
                                    </span>
                                  ) : Number(t.du) > 0 ? (
                                    <span
                                      style={{
                                        display: "inline-block",
                                        background: "#DCFCE7",
                                        color: "#166534",
                                        border: "1px solid #BBF7D0",
                                        borderRadius: "4px",
                                        padding: "0.2rem 0.6rem",
                                        fontSize: "0.78rem",
                                        fontWeight: 700,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      Soldé
                                    </span>
                                  ) : (
                                    <span style={{ color: "#94A3B8" }}>-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ whiteSpace: "nowrap", fontWeight: 600, color: "#0F172A" }}>
                              {formaterFcfa(ligne.total_du)}
                            </td>
                            <td style={{ whiteSpace: "nowrap", fontWeight: 600, color: "#15803D" }}>
                              {formaterFcfa(ligne.total_paye)}
                            </td>
                            <td
                              style={{
                                whiteSpace: "nowrap",
                                fontWeight: 700,
                                color: Number(ligne.total_reste) > 0 ? "#DC2626" : "#166534",
                              }}
                            >
                              {formaterFcfa(ligne.total_reste)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {totalGeneral ? (
                    <tfoot>
                      <tr style={{ background: "#F8FAFC", borderTop: "2px solid #CBD5E1" }}>
                        <td
                          style={{ fontWeight: 700, color: "#0F172A" }}
                          colSpan={1 + situation.tranche_choices.length}
                        >
                          Total classe
                        </td>
                        <td style={{ fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap" }}>
                          {formaterFcfa(totalGeneral.du)}
                        </td>
                        <td style={{ fontWeight: 700, color: "#15803D", whiteSpace: "nowrap" }}>
                          {formaterFcfa(totalGeneral.paye)}
                        </td>
                        <td
                          style={{
                            fontWeight: 700,
                            color: totalGeneral.reste > 0 ? "#DC2626" : "#166534",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formaterFcfa(totalGeneral.reste)}
                        </td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}
    </>
  );
}
