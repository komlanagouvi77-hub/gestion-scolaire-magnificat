// src/pages/ImportEleves.jsx
import { useState } from "react";
import { importerElevesCsv } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import { telechargerBlob } from "../telecharger.js";

const MODELE_CSV = "matricule,nom,prenom,date_naissance,sexe,classe\nEL2026020,Kodjo,Ama,2012-05-10,F,3e A\nEL2026021,Mensah,Kofi,2014-03-15,M,6e B\n";

function telechargerModele() {
  const fichier = new Blob([MODELE_CSV], { type: "text/csv" });
  telechargerBlob(fichier, "modele_import_eleves.csv").catch(function () {});
}

export default function ImportEleves({ token }) {
  const [fichier, setFichier] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [erreurGenerale, setErreurGenerale] = useState(null);

  const soumettre = async function (evt) {
    evt.preventDefault();
    if (!fichier) return;
    setEnCours(true);
    setResultat(null);
    setErreurGenerale(null);
    try {
      const reponse = await importerElevesCsv(token, fichier);
      setResultat(reponse);
    } catch (err) {
      setErreurGenerale(err.message);
    }
    setEnCours(false);
  };

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Utilisateurs</span> Import en masse d'eleves</div>

      <div className="mag-card react-fade-in" style={{ marginBottom: "1.5rem", maxWidth: "560px" }}>
        <div className="mag-stat-label" style={{ marginBottom: "0.7rem" }}>Format attendu (fichier CSV)</div>
        <p style={{ fontSize: "0.87rem", color: "var(--ink-600)", marginBottom: "0.8rem" }}>
          Colonnes, avec en-tete : <strong>matricule, nom, prenom, date_naissance, sexe, classe</strong>.
          Date au format AAAA-MM-JJ. Sexe : M ou F. Classe : nom exact d'une classe deja creee.
          Un matricule deja existant sera mis a jour (pas de doublon).
        </p>
        <button type="button" className="btn-mag-outline" style={{ color: "var(--indigo-950)", borderColor: "var(--indigo-950)" }} onClick={telechargerModele}>
          Telecharger un modele CSV
        </button>
      </div>

      <div className="mag-card react-fade-in" style={{ marginBottom: "1.5rem", maxWidth: "560px" }}>
        {erreurGenerale ? <Alerte>{erreurGenerale}</Alerte> : null}

        <form onSubmit={soumettre}>
          <div className="mag-field">
            <label className="mag-label-requis" htmlFor="import-fichier">Fichier CSV</label>
            <input id="import-fichier" type="file" accept=".csv" onChange={function (e) { setFichier(e.target.files[0] || null); }} required />
            {fichier ? (
              <p style={{ fontSize: "0.8rem", color: "var(--ink-600)", marginTop: "0.4rem" }}>
                Fichier selectionne : <strong>{fichier.name}</strong>
              </p>
            ) : null}
          </div>
          <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.6rem" }} disabled={enCours || !fichier}>
            {enCours ? <span className="react-spinner"></span> : "Importer"}
          </button>
        </form>
      </div>

      {resultat ? (
        <div className="react-fade-in">
          <div className="mag-grid-2" style={{ marginBottom: "1.5rem", maxWidth: "560px" }}>
            <div className="mag-card">
              <div className="mag-stat-label">Crees</div>
              <div className="mag-stat-value" style={{ color: "var(--green-600)", fontSize: "2rem" }}>{resultat.crees}</div>
            </div>
            <div className="mag-card">
              <div className="mag-stat-label">Mis a jour</div>
              <div className="mag-stat-value" style={{ fontSize: "2rem" }}>{resultat.mis_a_jour}</div>
            </div>
          </div>

          {resultat.total_erreurs > 0 ? (
            <div className="mag-card" style={{ maxWidth: "700px" }}>
              <div className="mag-stat-label" style={{ marginBottom: "0.9rem", color: "var(--red-600)" }}>
                {resultat.total_erreurs} ligne(s) en erreur
              </div>
              <div className="mag-table-wrap">
                <table className="mag-table" style={{ border: "none" }}>
                  <thead><tr><th>Ligne</th><th>Matricule</th><th>Raison</th></tr></thead>
                  <tbody>
                    {resultat.erreurs.map(function (err, i) {
                      return (
                        <tr key={i}>
                          <td>{err.ligne}</td>
                          <td>{err.matricule || "-"}</td>
                          <td>{err.raison}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <Alerte type="succes">Tous les eleves ont ete importes sans erreur.</Alerte>
          )}
        </div>
      ) : null}
    </>
  );
}