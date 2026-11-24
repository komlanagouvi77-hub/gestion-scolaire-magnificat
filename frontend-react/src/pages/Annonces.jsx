// src/pages/Annonces.jsx
import { useState, useEffect } from "react";
import { lister, creer } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import { Bell, Calendar, Users, Send } from "lucide-react";

export default function Annonces({ token, role }) {
  const [donnees, setDonnees] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [destinataires, setDestinataires] = useState("tous");
  const [messageEnvoi, setMessageEnvoi] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const estAdmin = role === "administrateur";

  const chargerListe = function () {
    setStatut("chargement");
    lister("annonces", token)
      .then(function (d) { setDonnees(Array.isArray(d) ? d : []); setStatut("ok"); })
      .catch(function () { setDonnees([]); setStatut("refuse"); });
  };

  useEffect(chargerListe, [token]);

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessageEnvoi(null);
    setEnvoiEnCours(true);
    try {
      await creer("annonces", token, { titre: titre, contenu: contenu, destinataires: destinataires });
      setMessageEnvoi({ type: "succes", texte: "Annonce publiée avec succès." });
      setTitre("");
      setContenu("");
      chargerListe();
    } catch (err) {
      setMessageEnvoi({ type: "erreur", texte: err.message });
    }
    setEnvoiEnCours(false);
  };

  const badgeDestinataire = function (dest) {
    if (dest === "parents") {
      return <span className="mag-badge" style={{ background: "#FEF3C7", color: "#B45309", fontWeight: 700 }}>Parents</span>;
    }
    if (dest === "enseignants") {
      return <span className="mag-badge" style={{ background: "#E0E7FF", color: "#4338CA", fontWeight: 700 }}>Enseignants</span>;
    }
    return <span className="mag-badge" style={{ background: "#DCFCE7", color: "#15803D", fontWeight: 700 }}>Tous</span>;
  };

  const formaterDate = function (dateIso) {
    if (!dateIso) return "";
    try {
      const d = new Date(dateIso);
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return dateIso;
    }
  };

  return (
    <>
      <div className="mag-page-title">
        <span className="eyebrow">Communication</span> Annonces
      </div>

      {estAdmin ? (
        <div className="mag-card react-fade-in" style={{ marginBottom: "1.5rem" }}>
          <div className="mag-stat-label" style={{ marginBottom: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Send size={16} /> Publier une nouvelle annonce officielle
          </div>

          {messageEnvoi ? <Alerte type={messageEnvoi.type}>{messageEnvoi.texte}</Alerte> : null}

          <form onSubmit={soumettre}>
            <div className="mag-field">
              <label htmlFor="annonce-titre">Titre de l'annonce</label>
              <input
                id="annonce-titre"
                type="text"
                placeholder="Ex. Réunion trimestrielle de rentrée, Suspension des cours..."
                value={titre}
                onChange={function (e) { setTitre(e.target.value); }}
                required
              />
            </div>
            <div className="mag-field">
              <label htmlFor="annonce-contenu">Contenu du communiqué</label>
              <textarea
                id="annonce-contenu"
                value={contenu}
                onChange={function (e) { setContenu(e.target.value); }}
                required
                rows={4}
                placeholder="Rédigez ici le texte officiel à destination des familles et des enseignants..."
                style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px", fontFamily: "inherit" }}
              ></textarea>
            </div>
            <div className="mag-field">
              <label htmlFor="annonce-destinataires">Audience cible</label>
              <select
                id="annonce-destinataires"
                value={destinataires}
                onChange={function (e) { setDestinataires(e.target.value); }}
                style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}
              >
                <option value="tous">Tous (Parents et Enseignants)</option>
                <option value="parents">Parents uniquement</option>
                <option value="enseignants">Enseignants uniquement</option>
              </select>
            </div>
            <button type="submit" className="mag-btn-primary" disabled={envoiEnCours}>
              {envoiEnCours ? <span className="react-spinner"></span> : "Diffuser l'annonce"}
            </button>
          </form>
        </div>
      ) : (
        <div className="mag-card" style={{ marginBottom: "1.5rem", background: "linear-gradient(135deg, rgba(2, 132, 199, 0.05), rgba(79, 70, 229, 0.05))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--indigo-950)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: "var(--indigo-950)", fontSize: "1rem" }}>
                Communications &amp; Avis de l'établissement
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--ink-600)" }}>
                Retrouvez ci-dessous l'ensemble des communiqués officiels transmis par la Direction.
              </div>
            </div>
          </div>
        </div>
      )}

      {statut === "chargement" ? <Spinner texte="Chargement des annonces..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les annonces pour ce compte.</Alerte> : null}
      {statut === "ok" ? (
        donnees.length === 0 ? (
          <div className="mag-card" style={{ textAlign: "center", padding: "2.5rem", color: "var(--ink-600)" }}>
            Aucune annonce publiée pour le moment.
          </div>
        ) : (
          <div className="react-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {donnees.map(function (annonce) {
              return (
                <div key={annonce.id} className="mag-card" style={{ borderLeft: "4px solid var(--indigo-950)", padding: "1.2rem 1.4rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.6rem", marginBottom: "0.6rem" }}>
                    <div>
                      <h3 style={{ margin: "0 0 0.3rem 0", fontSize: "1.1rem", fontWeight: 800, color: "var(--indigo-950)" }}>
                        {annonce.titre}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.78rem", color: "var(--ink-500)" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          <Calendar size={13} /> {formaterDate(annonce.date_publication)}
                        </span>
                        {estAdmin ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                            <Users size={13} /> Destinataires :
                          </span>
                        ) : null}
                        {badgeDestinataire(annonce.destinataires)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.92rem", lineHeight: "1.55", color: "var(--ink-800)", whiteSpace: "pre-line", marginTop: "0.6rem", borderTop: "1px solid var(--line, #F1F5F9)", paddingTop: "0.6rem" }}>
                    {annonce.contenu}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}
    </>
  );
}
