// src/components/Widgets.jsx
import { traduireTexte } from "../localisation.js";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from "recharts";
import { BarChart3, UserPlus, UploadCloud } from "lucide-react";

export function CarteStat({ label, valeur, lien, onClick, sousTexte }) {
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
      style={{
        cursor: estCliquable ? "pointer" : "default",
        padding: "1rem 1.25rem",
        borderRadius: "6px",
        background: "#FFFFFF",
        border: "1px solid var(--line, #E2E8F0)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748B", marginBottom: "0.35rem" }}>
        {typeof label === "string" ? traduireTexte(label) : label}
      </div>
      <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0F172A", lineHeight: 1.1 }}>
        {valeur}
      </div>
      {sousTexte ? (
        <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.4rem" }}>
          {sousTexte}
        </div>
      ) : null}
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
                Aucune donnée.
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

export function GraphiqueBarres({ titre, donnees, hauteur = 200 }) {
  const aDesDonnees = Array.isArray(donnees) && donnees.length > 0;

  return (
    <div className="mag-card react-fade-in react-carte-dataviz" style={{ padding: "1.1rem 1.25rem", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
        <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "#0F172A" }}>
          {traduireTexte(titre)}
        </div>
        {aDesDonnees ? (
          <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
            {donnees.length} classes
          </span>
        ) : null}
      </div>

      {!aDesDonnees ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#64748B", fontSize: "0.85rem" }}>
          Aucune donnée disponible.
        </div>
      ) : (
        <div style={{ width: "100%", height: hauteur + "px", flex: 1, marginTop: "0.3rem" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={donnees} margin={{ top: 18, right: 10, left: -25, bottom: 0 }} barSize={30}>
              <CartesianGrid strokeDasharray="2 2" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} allowDecimals={false} />
              <Tooltip 
                cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                contentStyle={{ backgroundColor: "#0F172A", color: "#FFFFFF", borderRadius: "4px", border: "none", fontSize: "12px", padding: "4px 8px" }}
              />
              <Bar dataKey="valeur" fill="#1E3A8A" radius={[3, 3, 0, 0]} name={traduireTexte("Effectif")}>
                <LabelList dataKey="valeur" position="top" fill="#1E3A8A" fontSize={11} fontWeight={600} offset={4} />
              </Bar>
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
    <div className="mag-cases-wrap">
      {options.map(function (opt) {
        const estCoche = valeursSelectionnees.map(String).indexOf(String(opt.valeur)) !== -1;
        return (
          <label key={opt.valeur} className={"mag-case-item" + (estCoche ? " mag-case-item-actif" : "")}>
            <input type="checkbox" checked={estCoche} onChange={function () { basculer(opt.valeur); }} />
            <span>{typeof opt.label === "string" ? traduireTexte(opt.label) : opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
