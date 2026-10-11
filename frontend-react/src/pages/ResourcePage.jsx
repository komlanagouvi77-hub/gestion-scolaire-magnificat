// src/pages/ResourcePage.jsx
import { useState, useEffect } from "react";
import { lister } from "../api.js";
import { TableauGenerique, Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import { traduireTexte, localeActive } from "../localisation.js";

export const CONFIG_RESSOURCES = {
  eleves: {
    label: "Eleves",
    colonnes: [
      { cle: "matricule", titre: "Matricule" },
      { cle: "nom", titre: "Nom" },
      { cle: "prenom", titre: "Prenom" },
      { cle: "classe_nom", titre: "Classe" },
    ],
  },
  classes: {
    label: "Classes",
    colonnes: [
      { cle: "nom", titre: "Nom" },
      { cle: "niveau", titre: "Niveau" },
      { cle: "annee_scolaire", titre: "Annee scolaire" },
    ],
  },
  notes: {
    label: "Notes",
    colonnes: [
      { cle: "eleve_nom", titre: "Eleve", rendu: function (l) { return l.eleve_nom || l.eleve; } },
      { cle: "matiere_nom", titre: "Matiere", rendu: function (l) { return l.matiere_nom || l.matiere; } },
      { cle: "type_evaluation", titre: "Type" },
      { cle: "valeur", titre: "Valeur", rendu: function (l) { return l.valeur + "/20"; } },
      { cle: "trimestre", titre: "Trimestre", rendu: function (l) { return "Trim. " + l.trimestre; } },
    ],
  },
  absences: {
    label: "Absences",
    colonnes: [
      { cle: "eleve_nom", titre: "Eleve", rendu: function (l) { return l.eleve_nom || l.eleve; } },
      { cle: "date", titre: "Date" },
      {
        cle: "justifiee", titre: "Justifiee",
        rendu: function (l) {
          return <span className={"mag-badge" + (l.justifiee ? " mag-badge-succes" : " mag-badge-erreur")}>{l.justifiee ? "Justifiee" : "Non justifiee"}</span>;
        },
      },
    ],
  },
  paiements: {
    label: "Paiements",
    colonnes: [
      { cle: "eleve_nom", titre: "Eleve", rendu: function (l) { return l.eleve_nom || l.eleve; } },
      { cle: "tranche", titre: "Tranche", rendu: function (l) { return l.tranche ? l.tranche + "e tranche" : "-"; } },
      { cle: "montant", titre: "Montant", rendu: function (l) { return Number(l.montant).toLocaleString(localeActive()) + " FCFA"; } },
      { cle: "mode_paiement", titre: "Mode" },
      { cle: "date_paiement", titre: "Date" },
    ],
  },
};

export default function ResourcePage({ nom, token }) {
  const [donnees, setDonnees] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const config = CONFIG_RESSOURCES[nom];

  useEffect(function () {
    let annule = false;
    setStatut("chargement");
    lister(nom, token)
      .then(function (d) { if (!annule) { setDonnees(d); setStatut("ok"); } })
      .catch(function () { if (!annule) { setDonnees([]); setStatut("refuse"); } });
    return function () { annule = true; };
  }, [nom, token]);

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Registre</span> {traduireTexte(config.label)}</div>

      {statut === "chargement" ? <Spinner texte={traduireTexte("Chargement de ") + traduireTexte(config.label.toLowerCase()) + "..."} /> : null}
      {statut === "refuse" ? <Alerte>Acces refuse ou aucune donnee pour ce compte sur cette ressource.</Alerte> : null}
      {statut === "ok" ? (
        <div className="react-fade-in">
          <TableauGenerique colonnes={config.colonnes} lignes={donnees} />
        </div>
      ) : null}
    </>
  );
}
