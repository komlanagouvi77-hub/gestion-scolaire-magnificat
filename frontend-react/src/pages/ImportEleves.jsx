// src/pages/ImportEleves.jsx
import { useState } from "react";
import { importerElevesCsv } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import { telechargerBlob } from "../telecharger.js";
import { FileSpreadsheet, Download, UploadCloud, CheckCircle2 } from "lucide-react";

const MODELE_CSV = "matricule;nom;prenom;date_naissance;sexe;classe\nMAG-2026-6E01;AGOUVI;Kodjo Yves;2013-05-14;M;6e A\nMAG-2026-6E02;AMOUZOU;Ablamba Grâce;2014-08-19;F;6e A\nMAG-2026-5E01;KODJO;Enyonam Victorine;2012-11-04;F;5e A\n";

function telechargerModele() {
  const fichier = new Blob([MODELE_CSV], { type: "text/csv;charset=utf-8;" });
  telechargerBlob(fichier, "modele_import_eleves_magnificat.csv").catch(function () {});
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
      setErreurGenerale(err.message || "Erreur lors de l'importation du fichier.");
    }
    setEnCours(false);
  };

  return (
    <>
      <div className="mag-page-title-ligne">
        <div className="mag-page-title">
          <h1>Import en masse d'élèves</h1>
        </div>
      </div>

      {/* GRILLE À 2 COLONNES CÔTE À CÔTE (50% / 50%) */}
      <div className="mag-grid-2col-equal react-fade-in">
        {/* BLOC GAUCHE (50%) : INSTRUCTIONS ET MODÈLE CSV */}
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
              <FileSpreadsheet size={18} color="#1E3A8A" />
              <span>Format attendu (fichier CSV)</span>
            </div>

            <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5, marginBottom: "0.75rem" }}>
              Colonnes requises, avec en-tête :{" "}
              <strong style={{ color: "#0F172A" }}>
                matricule, nom, prenom, date_naissance, sexe, classe
              </strong>
            </p>

            <ul style={{ fontSize: "0.82rem", color: "#64748B", paddingLeft: "1.2rem", margin: "0 0 1rem 0", lineHeight: 1.6 }}>
              <li>
                <strong>Date de naissance</strong> : format AAAA-MM-JJ (ex : 2013-05-14).
              </li>
              <li>
                <strong>Sexe</strong> : M ou F.
              </li>
              <li>
                <strong>Classe</strong> : nom exact d'une classe déjà créée dans le système (ex : 6e A).
              </li>
              <li>
                Un élève avec un matricule déjà existant sera automatiquement mis à jour sans créer de doublon.
              </li>
            </ul>

            {/* EXEMPLE VISUEL D'UNE LIGNE CSV VALIDE */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                padding: "0.75rem",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#475569",
                  marginBottom: "0.35rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Exemple de ligne CSV valide :
              </div>
              <code
                style={{
                  display: "block",
                  background: "#0F172A",
                  color: "#38BDF8",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontSize: "0.82rem",
                  whiteSpace: "nowrap",
                  overflowX: "auto",
                }}
              >
                MAG-2026-6E01;AGOUVI;Kodjo Yves;2013-05-14;M;6e A
              </code>
            </div>
          </div>

          {/* BOUTON SECONDAIRE ENCADRÉ AVEC ICÔNE */}
          <div>
            <button
              type="button"
              onClick={telechargerModele}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.55rem 1.1rem",
                border: "1px solid #1E3A8A",
                borderRadius: "6px",
                backgroundColor: "#FFFFFF",
                color: "#1E3A8A",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
              onMouseOver={function (e) {
                e.currentTarget.style.backgroundColor = "#EFF6FF";
              }}
              onMouseOut={function (e) {
                e.currentTarget.style.backgroundColor = "#FFFFFF";
              }}
            >
              <Download size={16} />
              <span>Télécharger un modèle CSV</span>
            </button>
          </div>
        </div>

        {/* BLOC DROIT (50%) : SÉLECTION ET IMPORTATION DU FICHIER */}
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
              <UploadCloud size={18} color="#1E3A8A" />
              <span>Sélection et importation du fichier</span>
            </div>

            {erreurGenerale ? <Alerte type="erreur">{erreurGenerale}</Alerte> : null}

            <form onSubmit={soumettre}>
              <div className="mag-field" style={{ marginBottom: "1.25rem" }}>
                <label
                  htmlFor="import-fichier"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.45rem",
                    display: "block",
                  }}
                >
                  Fichier CSV
                </label>
                <input
                  id="import-fichier"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={function (e) {
                    setFichier(e.target.files[0] || null);
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
                />
                {fichier ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      marginTop: "0.6rem",
                      padding: "0.45rem 0.75rem",
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      color: "#166534",
                    }}
                  >
                    <CheckCircle2 size={15} color="#16A34A" />
                    <span>
                      Fichier prêt : <strong>{fichier.name}</strong> ({(fichier.size / 1024).toFixed(1)} Ko)
                    </span>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.45rem", margin: 0 }}>
                    Sélectionnez votre fichier .csv encodé en UTF-8 (séparateur point-virgule ou virgule).
                  </p>
                )}
              </div>

              {/* BOUTON IMPORTER EN BLEU MARINE (#1E3A8A) */}
              <button
                type="submit"
                style={{
                  width: "auto",
                  padding: "0.65rem 1.8rem",
                  backgroundColor: "#1E3A8A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: !fichier || enCours ? "not-allowed" : "pointer",
                  opacity: !fichier || enCours ? 0.7 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                disabled={enCours || !fichier}
              >
                {enCours ? <span className="react-spinner"></span> : "Importer les élèves"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* RÉSULTAT DU TRAITEMENT D'IMPORTATION */}
      {resultat ? (
        <div className="react-fade-in" style={{ marginTop: "1rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              className="mag-card"
              style={{
                background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                padding: "1rem",
                borderRadius: "8px",
              }}
            >
              <div className="mag-stat-label" style={{ color: "#166534" }}>
                Créés
              </div>
              <div className="mag-stat-value" style={{ color: "#15803D", fontSize: "2rem" }}>
                {resultat.crees}
              </div>
            </div>

            <div
              className="mag-card"
              style={{
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                padding: "1rem",
                borderRadius: "8px",
              }}
            >
              <div className="mag-stat-label" style={{ color: "#1E40AF" }}>
                Mis à jour
              </div>
              <div className="mag-stat-value" style={{ color: "#1D4ED8", fontSize: "2rem" }}>
                {resultat.mis_a_jour}
              </div>
            </div>
          </div>

          {resultat.total_erreurs > 0 ? (
            <div className="mag-card" style={{ maxWidth: "800px" }}>
              <div className="mag-stat-label" style={{ marginBottom: "0.9rem", color: "#DC2626" }}>
                {resultat.total_erreurs} ligne(s) en anomalie
              </div>
              <div className="mag-table-wrap">
                <table className="mag-table" style={{ border: "none" }}>
                  <thead>
                    <tr>
                      <th>Ligne</th>
                      <th>Matricule</th>
                      <th>Raison</th>
                    </tr>
                  </thead>
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
            <Alerte type="succes">Tous les élèves ont été importés sans erreur.</Alerte>
          )}
        </div>
      ) : null}
    </>
  );
}
