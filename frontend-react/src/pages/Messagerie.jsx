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
import { MessageCircle } from "lucide-react";

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

  const destinataireActif = correspondants.find(function (c) { return String(c.id) === String(destinataireId); });
  const eleveActif = eleves.find(function (e) { return String(e.id) === String(eleveId); });

  const MODELES_MESSAGES = [
    {
      titre: "Entretien pédagogique",
      generer: function (nomEl, nomDest) {
        return "Bonjour " + (nomDest || "") + ", je souhaite solliciter un court entretien avec vous concernant le suivi de l'eleve " + (nomEl || "votre enfant") + ". Quelles seraient vos disponibilites ? Cordialement.";
      },
    },
    {
      titre: "Point sur le travail",
      generer: function (nomEl, nomDest) {
        return "Bonjour " + (nomDest || "") + ", je vous ecris pour faire un point rapide sur le travail scolaire et les devoirs de l'eleve " + (nomEl || "votre enfant") + ". Cordialement.";
      },
    },
    {
      titre: "Notification absence / retard",
      generer: function (nomEl, nomDest) {
        return "Bonjour " + (nomDest || "") + ", nous avons constate une absence ou un retard pour l'eleve " + (nomEl || "votre enfant") + ". Merci de bien vouloir nous fournir un justificatif. Cordialement.";
      },
    },
    {
      titre: "Félicitations pour progrès",
      generer: function (nomEl, nomDest) {
        return "Bonjour " + (nomDest || "") + ", nous tenions a vous feliciter pour les excellents progres et l'effort soutenu de l'eleve " + (nomEl || "votre enfant") + ". Bravo !";
      },
    },
  ];

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
              <label htmlFor="msg-eleve">A propos de l'eleve</label>
              <select id="msg-eleve" value={eleveId} onChange={function (e) { setEleveId(e.target.value); }} required style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                <option value="">-- Choisir l'eleve --</option>
                {eleves.map(function (e) { return <option key={e.id} value={e.id}>{e.nom} {e.classe ? "(" + e.classe + ")" : ""}</option>; })}
              </select>
            </div>
            <div className="mag-field">
              <label htmlFor="msg-destinataire">Destinataire</label>
              <select id="msg-destinataire" value={destinataireId} onChange={function (e) { setDestinataireId(e.target.value); }} required style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                <option value="">-- Choisir le destinataire --</option>
                {correspondants.map(function (c) {
                  return (
                    <option key={c.id} value={c.id}>
                      {c.nom} {c.role === "enseignant" ? "[Enseignant]" : "[Parent]"}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Passerelle WhatsApp Pro Togo */}
            {destinataireActif && destinataireActif.telephone ? (
              <div style={{ margin: "0.8rem 0 1rem 0", padding: "0.6rem 0.8rem", borderRadius: "8px", background: "#F0FDF4", border: "1px solid #BBF7D0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ fontSize: "0.8rem", color: "#166534" }}>
                  <strong>WhatsApp (+228) :</strong> {destinataireActif.telephone}
                </div>
                <a
                  href={"https://wa.me/" + destinataireActif.telephone.replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent("Bonjour " + (destinataireActif.nom || "") + ", je fais suite a notre echange depuis le Complexe Scolaire Le Magnificat (Lome)" + (eleveActif ? " concernant l'eleve " + eleveActif.nom : "") + ".")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-mag-outline"
                  style={{
                    fontSize: "0.76rem",
                    padding: "0.22rem 0.6rem",
                    color: "#16A34A",
                    borderColor: "#16A34A",
                    background: "#FFFFFF",
                    textDecoration: "none",
                    borderRadius: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    fontWeight: 600,
                  }}
                  title="Poursuivre la conversation sur WhatsApp"
                >
                  <MessageCircle size={14} /> Poursuivre sur WhatsApp
                </a>
              </div>
            ) : null}

            {/* Modeles de messages officiels Togo */}
            <div style={{ marginBottom: "0.8rem" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-600)", display: "block", marginBottom: "0.35rem" }}>
                Modeles officiels rapides :
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {MODELES_MESSAGES.map(function (m, idx) {
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="btn-mag-outline"
                      style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "12px", background: "var(--card-bg, #fff)" }}
                      onClick={function () {
                        const nomEl = eleveActif ? eleveActif.nom : "votre enfant";
                        const nomDest = destinataireActif ? destinataireActif.nom : "";
                        setContenu(m.generer(nomEl, nomDest));
                      }}
                    >
                      {m.titre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mag-field">
              <label htmlFor="msg-contenu">Message</label>
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
