// src/pages/SituationFinanciere.jsx
// Pour une classe donnee : montant du par tranche (definissable par
// l'Administrateur) et, pour chaque eleve, le du/paye/reste par tranche.
// Reserve a l'Administrateur.
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, obtenirSituationFinanciere } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import { localeActive } from "../localisation.js";
import Spinner from "../components/Spinner.jsx";

function formaterFcfa(valeur) {
  return Number(valeur).toLocaleString(localeActive()) + " FCFA";
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
      .then(function (donnees) { setClasses(donnees); setStatutClasses("ok"); })
      .catch(function () { setStatutClasses("refuse"); });
  }, [token]);

  const chargerSituation = function () {
    if (!classeId) return;
    setChargementSituation(true);
    Promise.all([
      obtenirSituationFinanciere(token, classeId),
      lister("frais-scolarite", token),
    ]).then(function (resultats) {
      setSituation(resultats[0]);
      const fraisClasse = resultats[1].filter(function (f) { return String(f.classe) === String(classeId); });
      setFrais(fraisClasse);
      const m = { 1: "", 2: "", 3: "" };
      fraisClasse.forEach(function (f) { m[f.tranche] = String(f.montant_du); });
      setMontants(m);
    }).finally(function () { setChargementSituation(false); });
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
        const existant = frais.find(function (f) { return f.tranche === tranche; });
        if (existant) {
          await modifier("frais-scolarite", existant.id, token, { montant_du: valeur });
        } else {
          await creer("frais-scolarite", token, { classe: Number(classeId), tranche: tranche, montant_du: valeur });
        }
      }
      setMessage({ type: "succes", texte: "Frais de scolarite mis a jour." });
      chargerSituation();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const totalGeneral = useMemo(function () {
    if (!situation) return null;
    return situation.lignes.reduce(function (acc, l) {
      acc.du += Number(l.total_du); acc.paye += Number(l.total_paye); acc.reste += Number(l.total_reste);
      return acc;
    }, { du: 0, paye: 0, reste: 0 });
  }, [situation]);

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Finances</span> Situation financiere</div>

      {statutClasses === "chargement" ? <Spinner texte="Chargement des classes..." /> : null}
      {statutClasses === "refuse" ? <Alerte>Impossible de charger les classes.</Alerte> : null}
      {statutClasses === "ok" ? (
        <div className="mag-field" style={{ maxWidth: "380px", marginBottom: "1.6rem" }}>
          <label className="mag-label-requis" htmlFor="sit-classe">Classe</label>
          <select id="sit-classe" value={classeId} onChange={function (e) { setClasseId(e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
            <option value="">-- Choisir une classe --</option>
            {classes.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
          </select>
        </div>
      ) : null}

      {!classeId ? (
        <div className="mag-card" style={{ textAlign: "center", padding: "2.5rem", border: "1px dashed var(--line)", color: "var(--ink-600)" }}>
          Choisissez une classe pour consulter sa situation financiere.
        </div>
      ) : chargementSituation ? (
        <Spinner texte="Chargement de la situation..." />
      ) : (
        <div className="react-fade-in">
          <div className="mag-panneau-form" style={{ marginBottom: "1.8rem", maxWidth: "680px" }}>
            <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>Definir les frais de scolarite (par tranche)</div>
            {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
            <form onSubmit={enregistrerFrais}>
              <div className="mag-grid-2">
                {[1, 2, 3].map(function (tranche) {
                  return (
                    <div className="mag-field" key={tranche}>
                      <label htmlFor={"montant-" + tranche}>{tranche}ere tranche (FCFA)</label>
                      <input
                        id={"montant-" + tranche} type="number" min="1" step="1"
                        value={montants[tranche]}
                        onChange={function (e) { setMontants(Object.assign({}, montants, { [tranche]: e.target.value })); }}
                      />
                    </div>
                  );
                })}
              </div>
              <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.8rem" }} disabled={enCours}>
                {enCours ? <span className="react-spinner"></span> : "Enregistrer les frais"}
              </button>
            </form>
          </div>

          {situation ? (
            <>
              <div className="mag-section-entete">
                <div className="mag-stat-label">Detail par eleve</div>
                <span className="mag-compteur-pill">{situation.lignes.length}</span>
              </div>
              <div className="mag-table-wrap">
                <table className="mag-table mag-table-pro">
                  <thead>
                    <tr>
                      <th>Eleve</th>
                      {situation.tranche_choices.map(function (t) { return <th key={t.valeur}>{t.libelle}</th>; })}
                      <th>Total du</th><th>Total paye</th><th>Reste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {situation.lignes.length === 0 ? (
                      <tr><td colSpan={5 + situation.tranche_choices.length} style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}>Aucun eleve dans cette classe.</td></tr>
                    ) : situation.lignes.map(function (ligne) {
                      return (
                        <tr key={ligne.eleve_id}>
                          <td style={{ fontWeight: 600 }}>{ligne.eleve_nom}</td>
                          {ligne.tranches.map(function (t) {
                            const reste = Number(t.reste);
                            return (
                              <td key={t.tranche}>
                                {reste > 0 ? (
                                  <span className="mag-badge-erreur">{formaterFcfa(t.paye)} / {formaterFcfa(t.du)}</span>
                                ) : Number(t.du) > 0 ? (
                                  <span className="mag-badge-succes">Solde</span>
                                ) : (
                                  <span style={{ color: "var(--ink-600)" }}>-</span>
                                )}
                              </td>
                            );
                          })}
                          <td>{formaterFcfa(ligne.total_du)}</td>
                          <td>{formaterFcfa(ligne.total_paye)}</td>
                          <td style={{ fontWeight: 600, color: Number(ligne.total_reste) > 0 ? "var(--red-600)" : "var(--green-600)" }}>
                            {formaterFcfa(ligne.total_reste)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {totalGeneral ? (
                    <tfoot>
                      <tr>
                        <td style={{ fontWeight: 700 }} colSpan={1 + situation.tranche_choices.length}>Total classe</td>
                        <td style={{ fontWeight: 700 }}>{formaterFcfa(totalGeneral.du)}</td>
                        <td style={{ fontWeight: 700 }}>{formaterFcfa(totalGeneral.paye)}</td>
                        <td style={{ fontWeight: 700 }}>{formaterFcfa(totalGeneral.reste)}</td>
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
