// src/pages/ParametresEcole.jsx
import { useState, useEffect } from "react";
import { obtenirParametres, modifierParametres } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";

export default function ParametresEcole({ token, onEnregistre }) {
  const [donnees, setDonnees] = useState(null);
  const [statut, setStatut] = useState("chargement");
  const [message, setMessage] = useState(null);
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);

  useEffect(function () {
    obtenirParametres(token)
      .then(function (d) { setDonnees(d); setStatut("ok"); })
      .catch(function () { setStatut("refuse"); });
  }, [token]);

  const modifierChamp = function (champ, valeur) {
    const copie = Object.assign({}, donnees);
    copie[champ] = valeur;
    setDonnees(copie);
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnregistrementEnCours(true);
    try {
      const majoree = await modifierParametres(token, {
        nom_ecole: donnees.nom_ecole,
        adresse: donnees.adresse,
        telephone: donnees.telephone,
        email: donnees.email,
        annee_scolaire_active: donnees.annee_scolaire_active,
        systeme_periodes: donnees.systeme_periodes,
        notes_verrouillees_t1: donnees.notes_verrouillees_t1,
        notes_verrouillees_t2: donnees.notes_verrouillees_t2,
        notes_verrouillees_t3: donnees.notes_verrouillees_t3,
      });
      setDonnees(majoree);
      setMessage({ type: "succes", texte: "Configuration enregistree avec succes." });
      if (onEnregistre) onEnregistre(majoree);
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnregistrementEnCours(false);
  };

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Configuration</span> Parametres de l'etablissement</div>

      {statut === "chargement" ? <Spinner texte="Chargement de la configuration..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger la configuration.</Alerte> : null}

      {statut === "ok" && donnees ? (
        <div className="mag-card react-fade-in" style={{ maxWidth: "560px" }}>
          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

          <form onSubmit={soumettre}>
            <div className="mag-field">
              <label className="mag-label-requis" htmlFor="param-nom-ecole">Nom de l'ecole</label>
              <input id="param-nom-ecole" type="text" value={donnees.nom_ecole} onChange={function (e) { modifierChamp("nom_ecole", e.target.value); }} required />
            </div>
            <div className="mag-field">
              <label htmlFor="param-adresse">Adresse</label>
              <input id="param-adresse" type="text" value={donnees.adresse} onChange={function (e) { modifierChamp("adresse", e.target.value); }} />
            </div>
            <div className="mag-field">
              <label htmlFor="param-telephone">Telephone</label>
              <input id="param-telephone" type="text" value={donnees.telephone} onChange={function (e) { modifierChamp("telephone", e.target.value); }} />
            </div>
            <div className="mag-field">
              <label htmlFor="param-email">Email</label>
              <input id="param-email" type="email" value={donnees.email} onChange={function (e) { modifierChamp("email", e.target.value); }} />
            </div>
            <div className="mag-field">
              <label htmlFor="param-annee">Annee scolaire active</label>
              <input id="param-annee" type="text" value={donnees.annee_scolaire_active} onChange={function (e) { modifierChamp("annee_scolaire_active", e.target.value); }} placeholder="Ex: 2026-2027" />
            </div>
            <div className="mag-field">
              <label htmlFor="param-systeme">Systeme de periodes</label>
              <select id="param-systeme" value={donnees.systeme_periodes} onChange={function (e) { modifierChamp("systeme_periodes", e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                <option value="trimestre">Trimestres</option>
                <option value="semestre">Semestres</option>
              </select>
            </div>

            <div className="mag-field">
              <label>Verrouillage des periodes (empeche toute modification de notes par les enseignants)</label>
              <div className="react-case-verrou">
                <input type="checkbox" checked={donnees.notes_verrouillees_t1} onChange={function (e) { modifierChamp("notes_verrouillees_t1", e.target.checked); }} id="verrou1" />
                <label htmlFor="verrou1">1er trimestre verrouille</label>
              </div>
              <div className="react-case-verrou">
                <input type="checkbox" checked={donnees.notes_verrouillees_t2} onChange={function (e) { modifierChamp("notes_verrouillees_t2", e.target.checked); }} id="verrou2" />
                <label htmlFor="verrou2">2e trimestre verrouille</label>
              </div>
              <div className="react-case-verrou">
                <input type="checkbox" checked={donnees.notes_verrouillees_t3} onChange={function (e) { modifierChamp("notes_verrouillees_t3", e.target.checked); }} id="verrou3" />
                <label htmlFor="verrou3">3e trimestre verrouille</label>
              </div>
            </div>

            <p style={{ fontSize: "0.8rem", color: "var(--ink-600)", marginBottom: "1rem" }}>
              Le logo se modifie depuis l'administration technique Django (/admin/).
            </p>
            <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.6rem" }} disabled={enregistrementEnCours}>
              {enregistrementEnCours ? <span className="react-spinner"></span> : "Enregistrer"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}