// src/pages/Annonces.jsx
import { useState, useEffect } from "react";
import { lister, creer } from "../api.js";
import { TableauGenerique, Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";

const COLONNES = [
  { cle: "titre", titre: "Titre" },
  { cle: "destinataires", titre: "Destinataires" },
  { cle: "date_publication", titre: "Date" },
];

export default function Annonces({ token }) {
  const [donnees, setDonnees] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [destinataires, setDestinataires] = useState("tous");
  const [messageEnvoi, setMessageEnvoi] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const chargerListe = function () {
    setStatut("chargement");
    lister("annonces", token)
      .then(function (d) { setDonnees(d); setStatut("ok"); })
      .catch(function () { setDonnees([]); setStatut("refuse"); });
  };

  useEffect(chargerListe, [token]);

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessageEnvoi(null);
    setEnvoiEnCours(true);
    try {
      await creer("annonces", token, { titre: titre, contenu: contenu, destinataires: destinataires });
      setMessageEnvoi({ type: "succes", texte: "Annonce publiee avec succes." });
      setTitre("");
      setContenu("");
      chargerListe();
    } catch (err) {
      setMessageEnvoi({ type: "erreur", texte: err.message });
    }
    setEnvoiEnCours(false);
  };

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Communication</span> Annonces</div>

      <div className="mag-card react-fade-in" style={{ marginBottom: "1.5rem" }}>
        <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>Publier une nouvelle annonce</div>

        {messageEnvoi ? <Alerte type={messageEnvoi.type}>{messageEnvoi.texte}</Alerte> : null}

        <form onSubmit={soumettre}>
          <div className="mag-field">
            <label className="mag-label-requis" htmlFor="annonce-titre">Titre</label>
            <input id="annonce-titre" type="text" value={titre} onChange={function (e) { setTitre(e.target.value); }} required />
          </div>
          <div className="mag-field">
            <label className="mag-label-requis" htmlFor="annonce-contenu">Contenu</label>
            <textarea id="annonce-contenu" value={contenu} onChange={function (e) { setContenu(e.target.value); }} required rows={3} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px", fontFamily: "inherit" }}></textarea>
          </div>
          <div className="mag-field">
            <label htmlFor="annonce-destinataires">Destinataires</label>
            <select id="annonce-destinataires" value={destinataires} onChange={function (e) { setDestinataires(e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
              <option value="tous">Tous</option>
              <option value="enseignants">Enseignants uniquement</option>
              <option value="parents">Parents uniquement</option>
            </select>
          </div>
          <button type="submit" className="mag-btn-primary" disabled={envoiEnCours}>{envoiEnCours ? <span className="react-spinner"></span> : "Publier"}</button>
        </form>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement des annonces..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les annonces pour ce compte.</Alerte> : null}
      {statut === "ok" ? (
        <div className="react-fade-in">
          <TableauGenerique colonnes={COLONNES} lignes={donnees} />
        </div>
      ) : null}
    </>
  );
}