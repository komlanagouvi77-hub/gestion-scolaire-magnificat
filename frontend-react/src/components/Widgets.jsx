// src/components/Widgets.jsx
import { traduireTexte } from "../localisation.js";

export function CarteStat({ label, valeur }) {
  return (
    <div className="mag-card react-fade-in">
      <div className="mag-stat-label">{typeof label === "string" ? traduireTexte(label) : label}</div>
      <div className="mag-stat-value">{valeur}</div>
    </div>
  );
}

export function Alerte({ type = "erreur", children }) {
  const classe = type === "succes" ? "react-alert-succes" : "react-alert-erreur";
  return <div className={classe}>{typeof children === "string" ? traduireTexte(children) : children}</div>;
}

export function TableauGenerique({ colonnes, lignes, cleLigne = "id" }) {
  return (
    <div className="mag-table-wrap">
      <table className="mag-table">
        <thead>
          <tr>
            {colonnes.map((c) => (
              <th key={c.cle}>{typeof c.titre === "string" ? traduireTexte(c.titre) : c.titre}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.length === 0 ? (
            <tr>
              <td colSpan={colonnes.length} style={{ textAlign: "center", color: "var(--ink-600)" }}>
                Aucune donnee.
              </td>
            </tr>
          ) : (
            lignes.map((ligne) => (
              <tr key={ligne[cleLigne]}>
                {colonnes.map((c) => (
                  <td key={c.cle}>{traduireValeur(c.rendu ? c.rendu(ligne) : ligne[c.cle] ?? "-")}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function traduireValeur(valeur) {
  if (typeof valeur === "string") return traduireTexte(valeur);
  if (Array.isArray(valeur)) return valeur.map(function (element) { return traduireValeur(element); });
  return valeur;
}

export function GraphiqueBarres({ titre, donnees }) {
  const aDesDonnees = Array.isArray(donnees) && donnees.length > 0;
  const maxValeur = Math.max(1, ...(aDesDonnees ? donnees.map((d) => d.valeur) : [1]));
  const largeurBarre = 46;
  const espace = 22;
  const hauteur = 160;
  const largeurTotale = aDesDonnees ? donnees.length * (largeurBarre + espace) + espace : 300;

  return (
    <div className="mag-card react-fade-in react-carte-dataviz">
      <div className="react-dataviz-entete">
        <div className="mag-stat-label">{traduireTexte(titre)}</div>
        {aDesDonnees ? (
          <span className="react-dataviz-badge-compte">
            {donnees.length} {donnees.length > 1 ? traduireTexte("classes représentées") : traduireTexte("classe représentée")}
          </span>
        ) : (
          <span className="react-dataviz-badge-attente">
            {traduireTexte("En attente de données")}
          </span>
        )}
      </div>

      {!aDesDonnees ? (
        <div className="react-dataviz-empty-state">
          {/* Silhouette de graphique fantôme stylisée en arrière-plan */}
          <div className="react-dataviz-ghost-chart" aria-hidden="true">
            <div className="react-dataviz-ghost-bar" style={{ height: "38%" }}></div>
            <div className="react-dataviz-ghost-bar" style={{ height: "65%" }}></div>
            <div className="react-dataviz-ghost-bar" style={{ height: "48%" }}></div>
            <div className="react-dataviz-ghost-bar" style={{ height: "80%" }}></div>
            <div className="react-dataviz-ghost-bar" style={{ height: "55%" }}></div>
            <div className="react-dataviz-ghost-baseline"></div>
          </div>

          <div className="react-dataviz-empty-contenu">
            <div className="react-dataviz-empty-icone" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <div className="react-dataviz-empty-titre">
              {traduireTexte("Visualisation comparative des effectifs")}
            </div>
            <p className="react-dataviz-empty-desc">
              {traduireTexte("Ce graphique interactif tracera automatiquement la répartition dès que des élèves seront affectés à leurs classes.")}
            </p>
            <div className="react-dataviz-empty-actions">
              <button
                type="button"
                className="mag-btn-primary react-dataviz-btn-cta"
                onClick={function () { window.location.hash = "/eleves"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                <span>{traduireTexte("Inscrire un élève")}</span>
              </button>
              <button
                type="button"
                className="btn-mag-outline react-dataviz-btn-sec"
                onClick={function () { window.location.hash = "/import"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <span>{traduireTexte("Importer via CSV")}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="react-dataviz-svg-wrap">
          <svg viewBox={"0 0 " + largeurTotale + " " + (hauteur + 30)} style={{ width: "100%", height: "220px" }}>
            {donnees.map((d, i) => {
              const barreH = (d.valeur / maxValeur) * hauteur;
              const x = espace + i * (largeurBarre + espace);
              const y = hauteur - barreH;
              return (
                <g key={d.label}>
                  <rect
                    x={x} y={y} width={largeurBarre} height={barreH}
                    fill="#B08A2E" rx={4} className="react-barre-animee"
                    style={{ transformOrigin: (x + largeurBarre / 2) + "px " + hauteur + "px" }}
                  />
                  <text x={x + largeurBarre / 2} y={y - 6} textAnchor="middle" fontSize="12" fill="#0A2540" fontWeight="600">
                    {d.valeur}
                  </text>
                  <text x={x + largeurBarre / 2} y={hauteur + 18} textAnchor="middle" fontSize="10" fill="#64748B">
                    {traduireTexte(d.label.length > 10 ? d.label.slice(0, 9) + "…" : d.label)}
                    {d.label.length > 10 ? <title>{traduireTexte(d.label)}</title> : null}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
export function ListeCasesACocher({ options, valeursSelectionnees, onChange }) {
  const basculer = function (id) {
    const idStr = String(id);
    const dejaLa = valeursSelectionnees.map(String).indexOf(idStr) !== -1;
    if (dejaLa) {
      onChange(valeursSelectionnees.filter(function (v) { return String(v) !== idStr; }));
    } else {
      onChange(valeursSelectionnees.concat([id]));
    }
  };

  return (
    <div className="mag-checkbox-list-wrap">
      <ul>
        {options.map(function (opt) {
          const coche = valeursSelectionnees.map(String).indexOf(String(opt.id)) !== -1;
          return (
            <li key={opt.id}>
              <label className={coche ? "actif" : ""}>
                <input type="checkbox" checked={coche} onChange={function () { basculer(opt.id); }} />
                {traduireTexte(opt.label)}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
