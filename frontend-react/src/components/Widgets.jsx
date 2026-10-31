// src/components/Widgets.jsx
import { traduireTexte } from "../localisation.js";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { BarChart3, UserPlus, UploadCloud, ArrowRight } from "lucide-react";

export function CarteStat({ label, valeur, lien, onClick }) {
  const estCliquable = !!(lien || onClick);
  const gererClic = function () {
    if (onClick) onClick();
    else if (lien) window.location.hash = "/" + lien.replace(/^#?\/?/, "");
  };
  return (
    <div
      className={"mag-card react-fade-in" + (estCliquable ? " mag-card-cliquable" : "")}
      onClick={estCliquable ? gererClic : undefined}
      role={estCliquable ? "button" : undefined}
      tabIndex={estCliquable ? 0 : undefined}
      style={estCliquable ? { cursor: "pointer" } : undefined}
    >
      <div className="mag-stat-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{typeof label === "string" ? traduireTexte(label) : label}</span>
        {estCliquable ? <ArrowRight className="w-4 h-4 ml-1 opacity-60 inline" /> : null}
      </div>
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
              <BarChart3 className="w-6 h-6 text-[#B08A2E]" />
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
                className="mag-btn-primary react-dataviz-btn-cta inline-flex items-center gap-1.5"
                onClick={function () { window.location.hash = "/eleves"; }}
              >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                <span>{traduireTexte("Inscrire un élève")}</span>
              </button>
              <button
                type="button"
                className="btn-mag-outline react-dataviz-btn-sec inline-flex items-center gap-1.5"
                onClick={function () { window.location.hash = "/import"; }}
              >
                <UploadCloud className="w-4 h-4" aria-hidden="true" />
                <span>{traduireTexte("Importer via CSV")}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="react-dataviz-recharts-wrap w-full" style={{ height: "230px", marginTop: "10px" }}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={donnees} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip 
                cursor={{ fill: "rgba(176, 138, 46, 0.08)" }}
                contentStyle={{ backgroundColor: "#0A2540", color: "#FFFFFF", borderRadius: "8px", border: "none", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
              />
              <Bar dataKey="valeur" fill="#B08A2E" radius={[4, 4, 0, 0]} name={traduireTexte("Effectif")} />
            </BarChart>
          </ResponsiveContainer>
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
