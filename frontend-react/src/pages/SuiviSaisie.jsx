// src/pages/SuiviSaisie.jsx
import { useState, useEffect, useMemo } from "react";
import { obtenirSuiviSaisie } from "../api.js";
import { Alerte, CarteStat } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import { traduireTexte } from "../localisation.js";

function PastilleStatut({ statut }) {
  const config = {
    termine: { texte: "Termine", classe: "react-statut-termine" },
    en_cours: { texte: "En cours", classe: "react-statut-en-cours" },
    pas_commence: { texte: "Pas commence", classe: "react-statut-pas-commence" },
  };
  const c = config[statut] || config.pas_commence;
  return <span className={"react-pastille-statut " + c.classe}>{traduireTexte(c.texte)}</span>;
}

export default function SuiviSaisie({ token }) {
  const [trimestre, setTrimestre] = useState(1);
  const [donnees, setDonnees] = useState([]);
  const [statut, setStatut] = useState("chargement");

  useEffect(function () {
    setStatut("chargement");
    obtenirSuiviSaisie(token, trimestre)
      .then(function (d) { setDonnees(d); setStatut("ok"); })
      .catch(function () { setDonnees([]); setStatut("refuse"); });
  }, [token, trimestre]);

  const resume = useMemo(function () {
    return {
      termine: donnees.filter(function (d) { return d.statut === "termine"; }).length,
      enCours: donnees.filter(function (d) { return d.statut === "en_cours"; }).length,
      pasCommence: donnees.filter(function (d) { return d.statut === "pas_commence"; }).length,
    };
  }, [donnees]);

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Pedagogie</span> Suivi de la saisie des notes</div>

      <div className="mag-card" style={{ marginBottom: "1.5rem", maxWidth: "300px" }}>
        <label htmlFor="suivi-trimestre" style={{ fontSize: "0.82rem", fontWeight: "600", display: "block", marginBottom: "0.3rem" }}>Trimestre</label>
        <select
          id="suivi-trimestre"
          value={trimestre}
          onChange={function (e) { setTrimestre(Number(e.target.value)); }}
          style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "6px" }}
        >
          <option value={1}>1er trimestre</option>
          <option value={2}>2e trimestre</option>
          <option value={3}>3e trimestre</option>
        </select>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement du suivi..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger le suivi de saisie.</Alerte> : null}

      {statut === "ok" ? (
        donnees.length === 0 ? (
          <p style={{ color: "var(--ink-600)" }}>Aucune donnee pour ce trimestre (aucun enseignant assigne a une classe/matiere).</p>
        ) : (
          <>
            <div className="mag-grid-4-auto" style={{ marginBottom: "1.5rem" }}>
              <CarteStat label="Termine" valeur={resume.termine} />
              <CarteStat label="En cours" valeur={resume.enCours} />
              <CarteStat label="Pas commence" valeur={resume.pasCommence} />
            </div>
            <div className="mag-table-wrap react-fade-in">
              <table className="mag-table">
                <thead>
                  <tr>
                    <th>Enseignant</th>
                    <th>Classe</th>
                    <th>Matiere</th>
                    <th style={{ textAlign: "center" }}>Progression</th>
                    <th style={{ textAlign: "center" }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {donnees.map(function (ligne, i) {
                    return (
                      <tr key={i}>
                        <td>{ligne.enseignant}</td>
                        <td>{ligne.classe}</td>
                        <td>{ligne.matiere}</td>
                        <td style={{ textAlign: "center" }}>{ligne.eleves_avec_note} / {ligne.total_eleves}</td>
                        <td style={{ textAlign: "center" }}><PastilleStatut statut={ligne.statut} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : null}
    </>
  );
}
