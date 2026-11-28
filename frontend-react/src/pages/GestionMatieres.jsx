// src/pages/GestionMatieres.jsx
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, supprimer } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";

export default function GestionMatieres({ token }) {
  const confirmation = useConfirmation();
  const [matieres, setMatieres] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [nom, setNom] = useState("");
  const [coefficient, setCoefficient] = useState("1");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const [idEnEdition, setIdEnEdition] = useState(null);
  const [editNom, setEditNom] = useState("");
  const [editCoefficient, setEditCoefficient] = useState("1");
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);

  const chargerListe = function () {
    setStatut("chargement");
    lister("matieres", token)
      .then(function (d) {
        setMatieres(Array.isArray(d) ? d : (d && d.results ? d.results : []));
        setStatut("ok");
      })
      .catch(function () {
        setStatut("refuse");
      });
  };

  useEffect(chargerListe, [token]);

  // Tri alphabétique français insensible à la casse et aux accents
  const matieresTriees = useMemo(function () {
    return [...matieres].sort(function (a, b) {
      return (a.nom || "").localeCompare(b.nom || "", "fr", { sensitivity: "base" });
    });
  }, [matieres]);

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      await creer("matieres", token, {
        nom: nom.trim(),
        coefficient: Number(coefficient) || 1,
      });
      setMessage({ type: "succes", texte: "Matière créée avec succès." });
      setNom("");
      setCoefficient("1");
      chargerListe();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const commencerEdition = function (m) {
    setIdEnEdition(m.id);
    setEditNom(m.nom);
    setEditCoefficient(String(m.coefficient));
  };

  const annulerEdition = function () {
    setIdEnEdition(null);
  };

  const enregistrerEdition = async function (id) {
    setEnregistrementEnCours(true);
    try {
      await modifier("matieres", id, token, {
        nom: editNom.trim(),
        coefficient: Number(editCoefficient) || 1,
      });
      setMessage({ type: "succes", texte: "Matière mise à jour avec succès." });
      setIdEnEdition(null);
      chargerListe();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnregistrementEnCours(false);
  };

  const supprimerMatiere = async function (m) {
    if (!(await confirmation.demander(`Supprimer la matière ${m.nom} ? Ses notes et cours associés seront également affectés.`))) return;
    try {
      await supprimer("matieres", m.id, token);
      setMessage({ type: "succes", texte: "Matière supprimée avec succès." });
      chargerListe();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible (des notes y sont peut-être encore rattachées)." });
    }
  };

  return (
    <>
      <div className="mag-page-title-ligne" style={{ marginBottom: "1.2rem" }}>
        <h1 className="mag-page-title">Matières</h1>
      </div>

      {/* Formulaire compact en pleine largeur (w-full) sur une seule ligne */}
      <div className="mag-card react-fade-in" style={{ marginBottom: "1.5rem", width: "100%", padding: "1.25rem" }}>
        <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0F172A", marginBottom: "0.85rem" }}>
          Créer une nouvelle matière
        </div>
        {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
        <form onSubmit={soumettre}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr)) 120px auto", gap: "0.85rem", alignItems: "flex-end" }}>
            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="mat-nom" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                Nom de la matière
              </label>
              <input
                id="mat-nom"
                type="text"
                value={nom}
                onChange={function (e) { setNom(e.target.value); }}
                placeholder="Ex: Mathématiques"
                required
                style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid var(--line, #CBD5E1)", borderRadius: "6px", fontSize: "0.85rem" }}
              />
            </div>

            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="mat-coeff" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                Coefficient
              </label>
              <input
                id="mat-coeff"
                type="number"
                min="1"
                step="1"
                value={coefficient}
                onChange={function (e) { setCoefficient(e.target.value); }}
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
        <div className="mag-stat-label">Liste des matières</div>
        <span className="mag-compteur-pill">{matieres.length}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement des matières..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les matières.</Alerte> : null}
      {statut === "ok" ? (
        <div className="mag-table-wrap react-fade-in" style={{ border: "1px solid #E2E8F0", borderRadius: "6px" }}>
          <table className="mag-table mag-table-pro">
            <thead>
              <tr>
                <th style={{ width: "55%" }}>Nom de la matière</th>
                <th style={{ width: "25%", textAlign: "center" }}>Coefficient</th>
                <th style={{ width: "20%", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {matieresTriees.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}>
                    Aucune matière créée pour le moment.
                  </td>
                </tr>
              ) : (
                matieresTriees.map(function (m) {
                  if (idEnEdition === m.id) {
                    return (
                      <tr key={m.id}>
                        <td>
                          <input
                            type="text"
                            value={editNom}
                            onChange={function (e) { setEditNom(e.target.value); }}
                            style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "4px", border: "1px solid var(--line)" }}
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={editCoefficient}
                            onChange={function (e) { setEditCoefficient(e.target.value); }}
                            style={{ width: "80px", padding: "0.35rem 0.5rem", borderRadius: "4px", border: "1px solid var(--line)", textAlign: "center" }}
                          />
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="mag-btn-lien"
                            onClick={function () { enregistrerEdition(m.id); }}
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
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600, color: "#0F172A" }}>{m.nom}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className="mag-badge" style={{ background: "#F1F5F9", color: "#1E3A8A", fontWeight: 600 }}>
                          Coef. {m.coefficient}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="mag-btn-lien"
                          onClick={function () { commencerEdition(m); }}
                          style={{ marginRight: "0.6rem", fontSize: "0.85rem", fontWeight: 500 }}
                        >
                          Modifier
                        </button>
                        <BoutonSupprimer onClick={function () { supprimerMatiere(m); }} />
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
          titre="Supprimer la matière"
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
