// src/pages/Messagerie.jsx
// Messagerie Enseignant <-> Parent, presentee comme une vraie discussion
// (bulles alignees selon l'expediteur), avec un formulaire d'envoi qui
// respecte EXACTEMENT le meme perimetre que Django (correspondants et
// eleves valides recuperes via /api/messagerie/correspondants/).
import { useState, useEffect } from "react";
import { lister, creer, obtenirCorrespondantsMessagerie, recupererProfil } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import { localeActive } from "../localisation.js";
import Spinner from "../components/Spinner.jsx";

export default function Messagerie({ token }) {
  const [messages, setMessages] = useState([]);
  const [correspondants, setCorrespondants] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [monId, setMonId] = useState(null);
  const [statut, setStatut] = useState("chargement");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const [destinataireId, setDestinataireId] = useState("");
  const [eleveId, setEleveId] = useState("");
  const [contenu, setContenu] = useState("");
  const [filtreEleve, setFiltreEleve] = useState("");

  const charger = function () {
    setStatut("chargement");
    Promise.all([
      lister("messages", token),
      obtenirCorrespondantsMessagerie(token),
      recupererProfil(token),
    ])
      .then(function (resultats) {
        setMessages(resultats[0]);
        setCorrespondants(resultats[1].correspondants);
        setEleves(resultats[1].eleves);
        setMonId(resultats[2].id);
        setStatut("ok");
      })
      .catch(function () { setStatut("refuse"); });
  };

  useEffect(charger, [token]);

  const envoyer = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      await creer("messages", token, {
        destinataire: Number(destinataireId), eleve: Number(eleveId), contenu: contenu,
      });
      setContenu("");
      charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const nomCorrespondant = function (id) {
    const trouve = correspondants.find(function (c) { return c.id === id; });
    return trouve ? trouve.nom : "Utilisateur";
  };

  const messagesFiltres = (filtreEleve ? messages.filter(function (m) { return String(m.eleve) === filtreEleve; }) : messages)
    .slice()
    .sort(function (a, b) { return new Date(a.date_envoi) - new Date(b.date_envoi); });

  const nomEleve = function (id) {
    const trouve = eleves.find(function (e) { return e.id === id; });
    return trouve ? trouve.nom : "";
  };

  if (statut === "chargement") return <><div className="mag-page-title"><span className="eyebrow">Communication</span> Messagerie</div><Spinner texte="Chargement..." /></>;
  if (statut === "refuse") return <><div className="mag-page-title"><span className="eyebrow">Communication</span> Messagerie</div><Alerte>Impossible de charger la messagerie.</Alerte></>;

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Communication</span> Messagerie</div>

      <div className="react-messagerie-disposition">
        <div className="mag-panneau-form react-messagerie-formulaire">
          <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>Nouveau message</div>
          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
          <form onSubmit={envoyer}>
            <div className="mag-field">
              <label className="mag-label-requis" htmlFor="msg-eleve">A propos de l'eleve</label>
              <select id="msg-eleve" value={eleveId} onChange={function (e) { setEleveId(e.target.value); }} required style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                <option value="">-- Choisir --</option>
                {eleves.map(function (e) { return <option key={e.id} value={e.id}>{e.nom}</option>; })}
              </select>
            </div>
            <div className="mag-field">
              <label className="mag-label-requis" htmlFor="msg-destinataire">Destinataire</label>
              <select id="msg-destinataire" value={destinataireId} onChange={function (e) { setDestinataireId(e.target.value); }} required style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                <option value="">-- Choisir --</option>
                {correspondants.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
              </select>
            </div>
            <div className="mag-field">
              <label className="mag-label-requis" htmlFor="msg-contenu">Message</label>
              <textarea id="msg-contenu" value={contenu} onChange={function (e) { setContenu(e.target.value); }} required rows={4}
                style={{ width: "100%", padding: "0.7rem", border: "1px solid var(--line)", borderRadius: "8px", fontFamily: "inherit", resize: "vertical" }}
                placeholder="Votre message..." />
            </div>
            <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.8rem" }} disabled={enCours}>
              {enCours ? <span className="react-spinner"></span> : "Envoyer"}
            </button>
          </form>

          {eleves.length > 1 ? (
            <div style={{ marginTop: "1.4rem", paddingTop: "1.2rem", borderTop: "1px solid var(--line)" }}>
              <label htmlFor="msg-filtre" style={{ fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>Filtrer la discussion</label>
              <select id="msg-filtre" value={filtreEleve} onChange={function (e) { setFiltreEleve(e.target.value); }} style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                <option value="">Tous les eleves</option>
                {eleves.map(function (e) { return <option key={e.id} value={e.id}>{e.nom}</option>; })}
              </select>
            </div>
          ) : null}
        </div>

        <div className="react-messagerie-fil">
          {messagesFiltres.length === 0 ? (
            <div className="mag-card" style={{ textAlign: "center", padding: "2.5rem", border: "1px dashed var(--line)", color: "var(--ink-600)" }}>
              Aucun message pour le moment. Envoyez le premier !
            </div>
          ) : (
            messagesFiltres.map(function (m) {
              const estEnvoye = m.expediteur === monId;
              return (
                <div className={"react-bulle-ligne" + (estEnvoye ? " envoye" : "")} key={m.id}>
                  <div className={"react-bulle" + (estEnvoye ? " envoye" : "")}>
                    <div className="react-bulle-entete">
                      <span className="react-bulle-nom">{estEnvoye ? "Vous" : m.expediteur_nom}</span>
                      <span className="react-bulle-eleve">{nomEleve(m.eleve)}</span>
                    </div>
                    <div className="react-bulle-texte">{m.contenu}</div>
                    <div className="react-bulle-date">{new Date(m.date_envoi).toLocaleString(localeActive(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
