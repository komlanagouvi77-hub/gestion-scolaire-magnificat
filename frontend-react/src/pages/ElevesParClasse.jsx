// src/pages/ElevesParClasse.jsx
// Vue des eleves regroupes par classe, en blocs depliables, tries du
// niveau le plus bas (6e) au plus eleve (Terminale). Pour un compte
// administrateur, cette page permet aussi de creer, modifier et
// supprimer des eleves.
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, supprimer, telechargerClasseCsv, recupererProfil } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";
import { Download } from "lucide-react";

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
              {enCoursExport ? "Export..." : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  <Download size={12} /> CSV
                </span>
              )}
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
              {eleves.length === 0 ? (
                <tr>
                  <td colSpan={estAdmin ? 6 : 5} style={{ textAlign: "center", padding: "1.2rem", color: "var(--ink-500)", fontStyle: "italic" }}>
                    Aucun élève inscrit dans cette classe pour le moment.
                  </td>
                </tr>
              ) : (
                eleves.map(function (el) {
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
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function VueMesEnfantsParent({ eleves, statut }) {
  if (statut === "chargement") {
    return <Spinner texte="Chargement de vos enfants..." />;
  }
  if (statut === "refuse") {
    return <Alerte>Impossible de charger vos enfants.</Alerte>;
  }

  return (
    <>
      <div className="mag-page-title-ligne">
        <div className="mag-page-title">
          <span className="eyebrow">Espace Famille</span>
          <h1>Mes Enfants</h1>
        </div>
      </div>
      <p style={{ color: "var(--ink-600)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
        Suivi scolaire, équipe pédagogique et accès direct aux notes, bulletins et assiduité de vos enfants.
      </p>

      {eleves.length === 0 ? (
        <div className="mag-card" style={{ textAlign: "center", padding: "2.5rem", border: "1px dashed var(--line)", color: "var(--ink-600)" }}>
          Aucun enfant n'est actuellement rattaché à votre compte. Contactez le secrétariat administratif.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem" }}>
          {eleves.map(function (enfant) {
            const initiales = ((enfant.prenom || "?").charAt(0) + (enfant.nom || "").charAt(0)).toUpperCase();
            return (
              <div key={enfant.id} className="mag-card react-fade-in" style={{ padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.2rem" }}>
                    {enfant.photo ? (
                      <img
                        src={enfant.photo}
                        alt={enfant.nom}
                        style={{ width: 68, height: 80, objectFit: "cover", borderRadius: "8px", border: "2px solid #E2E8F0", boxShadow: "0 2px 4px rgba(0,0,0,0.06)" }}
                      />
                    ) : (
                      <div className="mag-avatar" style={{ width: 64, height: 64, fontSize: "1.6rem", background: "linear-gradient(135deg, #0F2942, #1E4E79)", color: "#FFF", borderRadius: "8px" }}>
                        {initiales}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--ink-900)" }}>
                        {enfant.nom} {enfant.prenom}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--ink-600)", marginTop: "0.2rem" }}>
                        Matricule : <strong>{enfant.matricule}</strong>
                      </div>
                      <div style={{ marginTop: "0.4rem" }}>
                        <span className="mag-badge" style={{ background: "#0F2942", color: "#FFF", padding: "0.25rem 0.6rem", fontSize: "0.8rem", borderRadius: "6px" }}>
                          {enfant.classe_nom || "Classe non affectée"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section Équipe Pédagogique */}
                  <div style={{ background: "rgba(241, 245, 249, 0.7)", borderRadius: "8px", padding: "0.85rem", marginBottom: "1.2rem", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-600)", marginBottom: "0.5rem" }}>
                      Équipe Pédagogique / Contact Enseignant
                    </div>
                    {enfant.enseignants_details && enfant.enseignants_details.length > 0 ? (
                      enfant.enseignants_details.map(function (ens) {
                        const telNettoye = ens.telephone ? ens.telephone.replace(/[^0-9]/g, "") : "";
                        return (
                          <div key={ens.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", paddingBottom: "0.5rem", borderBottom: "1px dashed #CBD5E1" }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0F172A" }}>{ens.nom}</div>
                              <div style={{ fontSize: "0.78rem", color: "#64748B" }}>
                                {ens.specialite || (ens.matieres && ens.matieres[0]) || "Enseignant"} {ens.telephone ? " · Tél: " + ens.telephone : ""}
                              </div>
                            </div>
                            {telNettoye ? (
                              <a
                                href={"https://wa.me/" + telNettoye + "?text=" + encodeURIComponent("Bonjour M. " + ens.nom + ", je suis le parent de " + enfant.prenom + " " + enfant.nom + " (" + (enfant.classe_nom || "") + ").")}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: "0.78rem",
                                  padding: "0.35rem 0.65rem",
                                  borderRadius: "6px",
                                  background: "#25D366",
                                  color: "#FFF",
                                  textDecoration: "none",
                                  fontWeight: 600,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                  boxShadow: "0 1px 3px rgba(37,211,102,0.3)",
                                }}
                              >
                                WhatsApp
                              </a>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: "0.82rem", color: "#64748B", fontStyle: "italic" }}>
                        En attente de rattachement de l'équipe pédagogique.
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions directes */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    className="mag-btn-primary"
                    style={{ padding: "0.55rem", fontSize: "0.82rem", justifyContent: "center" }}
                    onClick={function () { window.location.hash = "/fiche-eleve/" + enfant.id; }}
                  >
                    Dossier scolaire
                  </button>
                  <button
                    type="button"
                    className="btn-mag-outline"
                    style={{ padding: "0.55rem", fontSize: "0.82rem", justifyContent: "center" }}
                    onClick={function () { window.location.hash = "/notes"; }}
                  >
                    Notes & moyennes
                  </button>
                  <button
                    type="button"
                    className="btn-mag-outline"
                    style={{ padding: "0.55rem", fontSize: "0.82rem", justifyContent: "center" }}
                    onClick={function () { window.location.hash = "/bulletins"; }}
                  >
                    Bulletins PDF
                  </button>
                  <button
                    type="button"
                    className="btn-mag-outline"
                    style={{ padding: "0.55rem", fontSize: "0.82rem", justifyContent: "center" }}
                    onClick={function () { window.location.hash = "/absences"; }}
                  >
                    Assiduité
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
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
  const [photoFichier, setPhotoFichier] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState(null);

  const chargerTout = function () {
    setStatut("chargement");
    const requetes = [lister("eleves", token), lister("classes", token)];
    if (role === "enseignant") requetes.push(recupererProfil(token));
    Promise.all(requetes)
      .then(function (resultats) {
        setEleves(resultats[0]);
        let cls = resultats[1] || [];
        if (role === "enseignant" && resultats[2] && Array.isArray(resultats[2].classes)) {
          const idsAssignees = new Set(resultats[2].classes.map(function (c) { return c.id; }));
          cls = cls.filter(function (c) { return idsAssignees.has(c.id); });
        }
        setClasses(cls);
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
    setPhotoFichier(null);
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
    setPhotoFichier(null);
    setFormulaireOuvert(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    let donnees;
    if (photoFichier) {
      donnees = new FormData();
      donnees.append("matricule", champs.matricule.trim());
      donnees.append("nom", champs.nom.trim());
      donnees.append("prenom", champs.prenom.trim());
      donnees.append("date_naissance", champs.date_naissance);
      donnees.append("sexe", champs.sexe);
      if (champs.classe) donnees.append("classe", champs.classe);
      donnees.append("photo", photoFichier);
    } else {
      donnees = {
        matricule: champs.matricule.trim(),
        nom: champs.nom.trim(),
        prenom: champs.prenom.trim(),
        date_naissance: champs.date_naissance,
        sexe: champs.sexe,
        classe: champs.classe ? Number(champs.classe) : null,
      };
    }
    try {
      if (idEnEdition) {
        await modifier("eleves", idEnEdition, token, donnees);
        setMessage({ type: "succes", texte: "Élève mis à jour avec succès." });
      } else {
        await creer("eleves", token, donnees);
        setMessage({ type: "succes", texte: "Élève ajouté avec succès." });
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
      .map(function (c) {
        return { classe: c, eleves: parClasseId[c.id] || [] };
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

  if (role === "parent") {
    return <VueMesEnfantsParent eleves={eleves} statut={statut} />;
  }

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
                <label htmlFor="el-matricule">Matricule</label>
                <input id="el-matricule" type="text" value={champs.matricule} onChange={function (e) { modifierChamp("matricule", e.target.value); }} required />
              </div>
              <div className="mag-field">
                <label htmlFor="el-classe">Classe</label>
                <select id="el-classe" value={champs.classe} onChange={function (e) { modifierChamp("classe", e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                  <option value="">-- Sans classe --</option>
                  {classes.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
                </select>
              </div>
              <div className="mag-field">
                <label htmlFor="el-nom">Nom</label>
                <input id="el-nom" type="text" value={champs.nom} onChange={function (e) { modifierChamp("nom", e.target.value); }} required />
              </div>
              <div className="mag-field">
                <label htmlFor="el-prenom">Prenom</label>
                <input id="el-prenom" type="text" value={champs.prenom} onChange={function (e) { modifierChamp("prenom", e.target.value); }} required />
              </div>
              <div className="mag-field">
                <label htmlFor="el-naissance">Date de naissance</label>
                <input id="el-naissance" type="date" value={champs.date_naissance} onChange={function (e) { modifierChamp("date_naissance", e.target.value); }} required />
              </div>
              <div className="mag-field">
                <label htmlFor="el-sexe">Sexe</label>
                <select id="el-sexe" value={champs.sexe} onChange={function (e) { modifierChamp("sexe", e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                  <option value="M">Masculin</option>
                  <option value="F">Feminin</option>
                </select>
              </div>
              <div className="mag-field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="el-photo">Photo d'identité pour le bulletin (Optionnel)</label>
                <input
                  id="el-photo"
                  type="file"
                  accept="image/*"
                  onChange={function (e) {
                    if (e.target.files && e.target.files[0]) {
                      setPhotoFichier(e.target.files[0]);
                    } else {
                      setPhotoFichier(null);
                    }
                  }}
                  style={{ padding: "0.4rem", border: "1px dashed var(--line)", borderRadius: "6px", width: "100%" }}
                />
                <div style={{ fontSize: "0.75rem", color: "var(--ink-500)", marginTop: "0.25rem" }}>
                  Format carré ou photo d'identité (PNG, JPG). Cette photo sera automatiquement incrustée dans le cadre en haut à droite du bulletin scolaire officiel.
                </div>
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
