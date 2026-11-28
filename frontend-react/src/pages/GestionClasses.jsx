// src/pages/GestionClasses.jsx
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, supprimer } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";

export default function GestionClasses({ token }) {
  const confirmation = useConfirmation();
  const [classes, setClasses] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [nom, setNom] = useState("");
  const [niveau, setNiveau] = useState("");
  const [anneeScolaire, setAnneeScolaire] = useState("2026-2027");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const [idEnEdition, setIdEnEdition] = useState(null);
  const [editNom, setEditNom] = useState("");
  const [editNiveau, setEditNiveau] = useState("");
  const [editAnnee, setEditAnnee] = useState("");
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);

  const chargerListe = function () {
    setStatut("chargement");
    Promise.all([lister("classes", token), lister("eleves", token)])
      .then(function (resultats) {
        setClasses(resultats[0] || []);
        setEleves(resultats[1] || []);
        setStatut("ok");
      })
      .catch(function () {
        setStatut("refuse");
      });
  };

  useEffect(chargerListe, [token]);

  const effectifsParClasse = useMemo(function () {
    const map = {};
    eleves.forEach(function (e) {
      if (e.classe) {
        map[String(e.classe)] = (map[String(e.classe)] || 0) + 1;
      }
    });
    return map;
  }, [eleves]);

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      await creer("classes", token, {
        nom: nom.trim(),
        niveau: niveau.trim(),
        annee_scolaire: anneeScolaire.trim(),
      });
      setMessage({ type: "succes", texte: "Classe créée avec succès." });
      setNom("");
      setNiveau("");
      setAnneeScolaire("2026-2027");
      chargerListe();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const commencerEdition = function (c) {
    setIdEnEdition(c.id);
    setEditNom(c.nom);
    setEditNiveau(c.niveau);
    setEditAnnee(c.annee_scolaire);
  };

  const annulerEdition = function () {
    setIdEnEdition(null);
  };

  const enregistrerEdition = async function (id) {
    setEnregistrementEnCours(true);
    try {
      await modifier("classes", id, token, {
        nom: editNom.trim(),
        niveau: editNiveau.trim(),
        annee_scolaire: editAnnee.trim(),
      });
      setIdEnEdition(null);
      chargerListe();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnregistrementEnCours(false);
  };

  const supprimerClasse = async function (c) {
    const nbEleves = effectifsParClasse[String(c.id)] || 0;
    const msg = nbEleves > 0
      ? `Supprimer la classe ${c.nom} ? Attention : ${nbEleves} élève(s) y sont actuellement inscrit(s).`
      : `Supprimer la classe ${c.nom} ?`;
    if (!(await confirmation.demander(msg))) return;
    try {
      await supprimer("classes", c.id, token);
      chargerListe();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible (des élèves y sont peut-être encore rattachés)." });
    }
  };

  return (
    <>
      <div className="mag-page-title-ligne" style={{ marginBottom: "1.2rem" }}>
        <h1 className="mag-page-title">Classes</h1>
      </div>

      {/* Carte pleine largeur (w-full) avec formulaire compact sur une seule ligne */}
      <div className="mag-card react-fade-in" style={{ marginBottom: "1.5rem", width: "100%", padding: "1.25rem" }}>
        <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0F172A", marginBottom: "0.85rem" }}>
          Créer une nouvelle classe
        </div>
        {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
        <form onSubmit={soumettre}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr)) auto", gap: "0.85rem", alignItems: "flex-end" }}>
            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="cls-nom" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                Nom
              </label>
              <input
                id="cls-nom"
                type="text"
                value={nom}
                onChange={function (e) { setNom(e.target.value); }}
                placeholder="Ex: 3e A"
                required
                style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid var(--line, #CBD5E1)", borderRadius: "6px", fontSize: "0.85rem" }}
              />
            </div>

            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="cls-niveau" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                Niveau
              </label>
              <input
                id="cls-niveau"
                type="text"
                value={niveau}
                onChange={function (e) { setNiveau(e.target.value); }}
                placeholder="Ex: 3e"
                required
                style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid var(--line, #CBD5E1)", borderRadius: "6px", fontSize: "0.85rem" }}
              />
            </div>

            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="cls-annee" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                Année scolaire
              </label>
              <input
                id="cls-annee"
                type="text"
                value={anneeScolaire}
                onChange={function (e) { setAnneeScolaire(e.target.value); }}
                placeholder="Ex: 2026-2027"
                required
                style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid var(--line, #CBD5E1)", borderRadius: "6px", fontSize: "0.85rem" }}
              />
            </div>

            <div>
              <button
                type="submit"
                className="mag-btn-primary"
                style={{ padding: "0.58rem 1.6rem", whiteSpace: "nowrap" }}
                disabled={enCours}
              >
                {enCours ? <span className="react-spinner"></span> : "Créer"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="mag-section-entete" style={{ marginBottom: "0.75rem" }}>
        <div className="mag-stat-label">Liste des classes</div>
        <span className="mag-compteur-pill">{classes.length}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement des classes..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les classes.</Alerte> : null}
      {statut === "ok" ? (
        <div className="mag-table-wrap react-fade-in" style={{ border: "1px solid #E2E8F0", borderRadius: "6px" }}>
          <table className="mag-table mag-table-pro">
            <thead>
              <tr>
                <th style={{ width: "24%" }}>Nom</th>
                <th style={{ width: "18%" }}>Niveau</th>
                <th style={{ width: "22%" }}>Année scolaire</th>
                <th style={{ width: "20%" }}>Élèves inscrits</th>
                <th style={{ width: "16%", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}>
                    Aucune classe créée pour le moment.
                  </td>
                </tr>
              ) : (
                classes.map(function (c) {
                  const nbEleves = effectifsParClasse[String(c.id)] || 0;

                  if (idEnEdition === c.id) {
                    return (
                      <tr key={c.id}>
                        <td>
                          <input
                            type="text"
                            value={editNom}
                            onChange={function (e) { setEditNom(e.target.value); }}
                            style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "4px", border: "1px solid var(--line)" }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editNiveau}
                            onChange={function (e) { setEditNiveau(e.target.value); }}
                            style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "4px", border: "1px solid var(--line)" }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editAnnee}
                            onChange={function (e) { setEditAnnee(e.target.value); }}
                            style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "4px", border: "1px solid var(--line)" }}
                          />
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "#334155" }}>
                            {nbEleves} élève{nbEleves > 1 ? "s" : ""}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="mag-btn-lien"
                            onClick={function () { enregistrerEdition(c.id); }}
                            disabled={enregistrementEnCours}
                            style={{ fontWeight: 600, marginRight: "0.5rem" }}
                          >
                            {enregistrementEnCours ? "Enregistrement..." : "Enregistrer"}
                          </button>
                          <button
                            type="button"
                            className="mag-btn-lien"
                            onClick={annulerEdition}
                            disabled={enregistrementEnCours}
                            style={{ color: "#64748B" }}
                          >
                            Annuler
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: "#0F172A" }}>{c.nom}</td>
                      <td>
                        <span className="mag-badge" style={{ background: "#F1F5F9", color: "#1E3A8A", fontWeight: 600 }}>
                          {c.niveau}
                        </span>
                      </td>
                      <td style={{ color: "#475569" }}>{c.annee_scolaire}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: "#334155" }}>
                          {nbEleves} élève{nbEleves > 1 ? "s" : ""}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="mag-btn-lien"
                          onClick={function () { commencerEdition(c); }}
                          style={{ marginRight: "0.6rem", fontSize: "0.85rem", fontWeight: 500 }}
                        >
                          Modifier
                        </button>
                        <BoutonSupprimer onClick={function () { supprimerClasse(c); }} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {confirmation.demande ? (
        <ConfirmModal
          titre="Supprimer la classe"
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
