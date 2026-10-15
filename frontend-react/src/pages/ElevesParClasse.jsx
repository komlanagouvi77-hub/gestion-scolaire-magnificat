// src/pages/ElevesParClasse.jsx
// Vue des eleves regroupes par classe, en blocs depliables, tries du
// niveau le plus bas (6e) au plus eleve (Terminale). Pour un compte
// administrateur, cette page permet aussi de creer, modifier et
// supprimer des eleves.
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, supprimer, telechargerClasseCsv } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";

const ORDRE_NIVEAUX = ["6e", "5e", "4e", "3e", "2nde", "1ere", "Terminale"];

function rangNiveau(niveau) {
  const idx = ORDRE_NIVEAUX.indexOf(niveau);
  return idx === -1 ? 999 : idx;
}

function BlocClasse({ classe, eleves, ouvertParDefaut, estAdmin, onModifier, onSupprimer, onExporterCsv }) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const [enCoursExport, setEnCoursExport] = useState(false);

  useEffect(function () {
    if (ouvertParDefaut) setOuvert(true);
  }, [ouvertParDefaut]);

  const gererExport = async function (e) {
    e.stopPropagation();
    if (!onExporterCsv || !classe.id) return;
    setEnCoursExport(true);
    try {
      await onExporterCsv(classe);
    } finally {
      setEnCoursExport(false);
    }
  };

  return (
    <div className="react-bloc-classe">
      <div
        className="react-bloc-classe-entete"
        role="button"
        tabIndex={0}
        onClick={function () { setOuvert(!ouvert); }}
        onKeyDown={function (e) { if (e.key === "Enter" || e.key === " ") setOuvert(!ouvert); }}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span className="react-bloc-classe-titre">
          <span className="react-bloc-classe-niveau">{classe.niveau}</span>
          {classe.nom}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          {classe.id && onExporterCsv ? (
            <button
              type="button"
              className="btn-mag-outline"
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", height: "auto", minHeight: "unset" }}
              onClick={gererExport}
              disabled={enCoursExport}
              title="Exporter la liste nominative avec contacts au format CSV Excel"
            >
              {enCoursExport ? "Export..." : "📥 CSV"}
            </button>
          ) : null}
          <span className="react-bloc-classe-compte">{eleves.length} eleve{eleves.length > 1 ? "s" : ""}</span>
          <span className={"react-bloc-classe-chevron" + (ouvert ? " ouvert" : "")}>▾</span>
        </div>
      </div>

      {ouvert ? (
        <div className="react-table-wrap">
          <table className="mag-table">
            <thead>
              <tr>
                <th>Matricule</th><th>Nom</th><th>Prenom</th><th>Sexe</th><th>Naissance</th>
                {estAdmin ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {eleves.map(function (el) {
                return (
                  <tr key={el.id}>
                    <td>{el.matricule}</td>
                    <td><button type="button" className="mag-btn-lien" onClick={function () { window.location.hash = "/fiche-eleve/" + el.id; }}>{el.nom}</button></td>
                    <td>{el.prenom}</td>
                    <td>{el.sexe === "F" ? "Feminin" : el.sexe === "M" ? "Masculin" : "-"}</td>
                    <td>{el.date_naissance || "-"}</td>
                    {estAdmin ? (
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button type="button" className="mag-btn-lien" onClick={function () { onModifier(el); }}>Modifier →</button>
                        <BoutonSupprimer onClick={function () { onSupprimer(el); }} />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

const CHAMPS_VIDES = { matricule: "", nom: "", prenom: "", date_naissance: "", sexe: "M", classe: "" };

export default function ElevesParClasse({ token, role }) {
  const estAdmin = role === "administrateur";
  const confirmation = useConfirmation();

  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [recherche, setRecherche] = useState("");

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [idEnEdition, setIdEnEdition] = useState(null);
  const [champs, setChamps] = useState(CHAMPS_VIDES);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState(null);

  const chargerTout = function () {
    setStatut("chargement");
    Promise.all([lister("eleves", token), lister("classes", token)])
      .then(function (resultats) {
        setEleves(resultats[0]);
        setClasses(resultats[1]);
        setStatut("ok");
      })
      .catch(function () {
        setStatut("refuse");
      });
  };

  useEffect(chargerTout, [token]);

  const modifierChamp = function (nom, valeur) {
    setChamps(function (c) { return Object.assign({}, c, { [nom]: valeur }); });
  };

  const viderFormulaire = function () {
    setIdEnEdition(null);
    setChamps(CHAMPS_VIDES);
  };

  const ouvrirCreation = function () {
    viderFormulaire();
    setFormulaireOuvert(true);
    setMessage(null);
  };

  const commencerEdition = function (el) {
    setIdEnEdition(el.id);
    setChamps({
      matricule: el.matricule || "",
      nom: el.nom || "",
      prenom: el.prenom || "",
      date_naissance: el.date_naissance || "",
      sexe: el.sexe || "M",
      classe: el.classe || "",
    });
    setFormulaireOuvert(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    const donnees = {
      matricule: champs.matricule.trim(),
      nom: champs.nom.trim(),
      prenom: champs.prenom.trim(),
      date_naissance: champs.date_naissance,
      sexe: champs.sexe,
      classe: champs.classe ? Number(champs.classe) : null,
    };
    try {
      if (idEnEdition) {
        await modifier("eleves", idEnEdition, token, donnees);
        setMessage({ type: "succes", texte: "Eleve mis a jour avec succes." });
      } else {
        await creer("eleves", token, donnees);
        setMessage({ type: "succes", texte: "Eleve ajoute avec succes." });
      }
      viderFormulaire();
      setFormulaireOuvert(false);
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const supprimerEleve = async function (el) {
    if (!(await confirmation.demander("Supprimer definitivement " + el.nom + " " + el.prenom + " (" + el.matricule + ") ? Ses notes, absences, bulletins et paiements seront egalement supprimes."))) return;
    try {
      await supprimer("eleves", el.id, token);
      setMessage({ type: "succes", texte: "Eleve supprime." });
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible." });
    }
  };

  const exporterCsv = async function (classe) {
    try {
      await telechargerClasseCsv(classe.id, token, classe.nom);
    } catch (err) {
      setMessage({ type: "erreur", texte: "Erreur lors de l'export CSV : " + (err.message || "") });
    }
  };

  const groupes = useMemo(function () {
    const parClasseId = {};
    eleves.forEach(function (el) {
      const cleClasse = el.classe || "sans-classe";
      if (!parClasseId[cleClasse]) parClasseId[cleClasse] = [];
      parClasseId[cleClasse].push(el);
    });

    const resultat = classes
      .filter(function (c) { return parClasseId[c.id]; })
      .map(function (c) {
        return { classe: c, eleves: parClasseId[c.id] };
      });

    resultat.sort(function (a, b) {
      const diff = rangNiveau(a.classe.niveau) - rangNiveau(b.classe.niveau);
      if (diff !== 0) return diff;
      return a.classe.nom.localeCompare(b.classe.nom);
    });

    if (parClasseId["sans-classe"]) {
      resultat.push({ classe: { nom: "Sans classe assignee", niveau: "" }, eleves: parClasseId["sans-classe"] });
    }

    return resultat;
  }, [eleves, classes]);

  const rechercheActive = recherche.trim().length > 0;

  const groupesFiltres = useMemo(function () {
    if (!rechercheActive) return groupes;
    const q = recherche.trim().toLowerCase();
    return groupes
      .map(function (g) {
        const elevesFiltres = g.eleves.filter(function (el) {
          return (el.nom + " " + el.prenom + " " + el.matricule).toLowerCase().indexOf(q) !== -1;
        });
        return { classe: g.classe, eleves: elevesFiltres };
      })
      .filter(function (g) { return g.eleves.length > 0; });
  }, [groupes, recherche, rechercheActive]);

  return (
    <>
      <div className="mag-page-title-ligne">
        <div className="mag-page-title"><span className="eyebrow">Registre</span> Eleves par classe</div>
        {estAdmin ? (
          <button type="button" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.4rem" }} onClick={formulaireOuvert ? function () { setFormulaireOuvert(false); viderFormulaire(); } : ouvrirCreation}>
            {formulaireOuvert ? "Fermer" : "+ Ajouter un eleve"}
          </button>
        ) : null}
      </div>

      {estAdmin && formulaireOuvert ? (
        <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.8rem", maxWidth: "760px" }}>
          <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>
            {idEnEdition ? "Modifier l'eleve" : "Ajouter un eleve"}
          </div>
          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
          <form onSubmit={soumettre}>
            <div className="mag-grid-2">
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="el-matricule">Matricule</label>
                <input id="el-matricule" type="text" value={champs.matricule} onChange={function (e) { modifierChamp("matricule", e.target.value); }} required />
              </div>
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="el-classe">Classe</label>
                <select id="el-classe" value={champs.classe} onChange={function (e) { modifierChamp("classe", e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                  <option value="">-- Sans classe --</option>
                  {classes.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
                </select>
              </div>
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="el-nom">Nom</label>
                <input id="el-nom" type="text" value={champs.nom} onChange={function (e) { modifierChamp("nom", e.target.value); }} required />
              </div>
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="el-prenom">Prenom</label>
                <input id="el-prenom" type="text" value={champs.prenom} onChange={function (e) { modifierChamp("prenom", e.target.value); }} required />
              </div>
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="el-naissance">Date de naissance</label>
                <input id="el-naissance" type="date" value={champs.date_naissance} onChange={function (e) { modifierChamp("date_naissance", e.target.value); }} required />
              </div>
              <div className="mag-field">
                <label className="mag-label-requis" htmlFor="el-sexe">Sexe</label>
                <select id="el-sexe" value={champs.sexe} onChange={function (e) { modifierChamp("sexe", e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                  <option value="M">Masculin</option>
                  <option value="F">Feminin</option>
                </select>
              </div>
            </div>
            <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.8rem" }} disabled={enCours}>
              {enCours ? <span className="react-spinner"></span> : (idEnEdition ? "Enregistrer" : "Ajouter l'eleve")}
            </button>
            <button type="button" className="mag-btn-lien" style={{ marginLeft: "0.8rem" }} onClick={function () { setFormulaireOuvert(false); viderFormulaire(); }}>Annuler</button>
          </form>
        </div>
      ) : (
        estAdmin && message ? <Alerte type={message.type}>{message.texte}</Alerte> : null
      )}

      {statut === "ok" && eleves.length > 0 ? (
        <div className="react-eleves-barre-outils">
          <input
            type="text"
            className="react-eleves-recherche"
            placeholder="Rechercher un eleve (nom, prenom, matricule)..."
            value={recherche}
            onChange={function (e) { setRecherche(e.target.value); }}
          />
          <span className="react-eleves-compteur">
            {eleves.length} eleve{eleves.length > 1 ? "s" : ""} · {groupes.length} classe{groupes.length > 1 ? "s" : ""}
          </span>
        </div>
      ) : null}

      {statut === "chargement" ? <Spinner texte="Chargement des eleves..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les eleves pour ce compte.</Alerte> : null}
      {statut === "ok" ? (
        groupes.length === 0 ? (
          <p style={{ color: "var(--ink-600)" }}>Aucun eleve visible pour ce compte.</p>
        ) : groupesFiltres.length === 0 ? (
          <p style={{ color: "var(--ink-600)" }}>Aucun eleve ne correspond a "{recherche}".</p>
        ) : (
          <div className="react-fade-in">
            {groupesFiltres.map(function (groupe, index) {
              return (
                <BlocClasse
                  key={groupe.classe.id || "sans-classe"}
                  classe={groupe.classe}
                  eleves={groupe.eleves}
                  ouvertParDefaut={rechercheActive || index === 0}
                  estAdmin={estAdmin}
                  onModifier={commencerEdition}
                  onSupprimer={supprimerEleve}
                  onExporterCsv={exporterCsv}
                />
              );
            })}
          </div>
        )
      ) : null}

      {confirmation.demande ? (
        <ConfirmModal
          titre="Supprimer l'eleve"
          message={confirmation.demande.message}
          texteConfirmer="Supprimer"
          danger
          onConfirmer={confirmation.confirmer}
          onAnnuler={confirmation.annuler}
        />
      ) : null}
    </>
  );
}
