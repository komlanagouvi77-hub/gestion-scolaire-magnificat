// src/pages/Messagerie.jsx
// Module de messagerie scolaire Parent <-> Enseignant, avec fil de discussion
// structuré dans une carte dédiée, horodatage soigné et réponse rapide intégrée.
import { useState, useEffect, useMemo, useRef } from "react";
import { lister, creer, obtenirCorrespondantsMessagerie, recupererProfil } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";

function formaterDateMessage(dateIso) {
  if (!dateIso) return "";
  try {
    const d = new Date(dateIso);
    const j = String(d.getDate()).padStart(2, "0");
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const a = d.getFullYear();
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${j}/${m}/${a} à ${h}:${min}`;
  } catch {
    return dateIso;
  }
}

export default function Messagerie({ token, role }) {
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
  const [reponseRapide, setReponseRapide] = useState("");

  const messagesEndRef = useRef(null);

  const charger = function () {
    setStatut("chargement");
    Promise.all([
      lister("messages", token),
      obtenirCorrespondantsMessagerie(token),
      recupererProfil(token),
    ])
      .then(function (resultats) {
        const msgList = resultats[0] || [];
        const correspList = resultats[1].correspondants || [];
        const elevesList = resultats[1].eleves || [];
        const monUserId = resultats[2].id;

        setMessages(msgList);
        setCorrespondants(correspList);
        setEleves(elevesList);
        setMonId(monUserId);
        setStatut("ok");

        // Présélection automatique de la discussion la plus récente ou de la première option
        setDestinataireId(function (prevDest) {
          if (prevDest) return prevDest;
          if (msgList.length > 0) {
            const dernier = msgList[msgList.length - 1];
            const autreId = dernier.expediteur === monUserId ? dernier.destinataire : dernier.expediteur;
            if (correspList.some(function (c) { return c.id === autreId; })) {
              return String(autreId);
            }
          }
          return correspList.length > 0 ? String(correspList[0].id) : "";
        });

        setEleveId(function (prevEl) {
          if (prevEl) return prevEl;
          if (msgList.length > 0) {
            const dernier = msgList[msgList.length - 1];
            if (elevesList.some(function (e) { return e.id === dernier.eleve; })) {
              return String(dernier.eleve);
            }
          }
          return elevesList.length > 0 ? String(elevesList[0].id) : "";
        });
      })
      .catch(function () {
        setStatut("refuse");
      });
  };

  useEffect(charger, [token]);

  const destinataireActif = correspondants.find(function (c) {
    return String(c.id) === String(destinataireId);
  });
  const eleveActif = eleves.find(function (e) {
    return String(e.id) === String(eleveId);
  });

  const nomEleve = function (id) {
    const trouve = eleves.find(function (e) { return e.id === id; });
    return trouve ? trouve.nom : "";
  };

  // Filtrer la discussion courante entre l'utilisateur connecté et le correspondant sélectionné pour l'élève choisi
  const messagesDiscussion = useMemo(function () {
    if (!destinataireId || !eleveId) {
      return messages.slice().sort(function (a, b) {
        return new Date(a.date_envoi) - new Date(b.date_envoi);
      });
    }
    const destNum = Number(destinataireId);
    const elNum = Number(eleveId);
    return messages
      .filter(function (m) {
        const estMemeEleve = m.eleve === elNum;
        const estMemeInterlocuteur =
          (m.expediteur === monId && m.destinataire === destNum) ||
          (m.expediteur === destNum && m.destinataire === monId);
        return estMemeEleve && estMemeInterlocuteur;
      })
      .sort(function (a, b) {
        return new Date(a.date_envoi) - new Date(b.date_envoi);
      });
  }, [messages, destinataireId, eleveId, monId]);

  useEffect(function () {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messagesDiscussion.length]);

  const envoyer = async function (evt) {
    evt.preventDefault();
    const texte = contenu.trim();
    if (!texte) return;
    if (!destinataireId || !eleveId) {
      setMessage({ type: "erreur", texte: "Veuillez sélectionner un élève et un destinataire." });
      return;
    }
    setMessage(null);
    setEnCours(true);
    try {
      await creer("messages", token, {
        destinataire: Number(destinataireId),
        eleve: Number(eleveId),
        contenu: texte,
      });
      setContenu("");
      charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const envoyerReponseRapide = async function (evt) {
    if (evt) evt.preventDefault();
    const texte = reponseRapide.trim();
    if (!texte) return;
    if (!destinataireId || !eleveId) {
      setMessage({ type: "erreur", texte: "Veuillez sélectionner un élève et un destinataire." });
      return;
    }
    setMessage(null);
    setEnCours(true);
    try {
      await creer("messages", token, {
        destinataire: Number(destinataireId),
        eleve: Number(eleveId),
        contenu: texte,
      });
      setReponseRapide("");
      charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const MODELES_MESSAGES_PARENT = [
    {
      titre: "Justifier une absence",
      generer: function (nomEl, nomDest) {
        return (
          "Bonjour " + (nomDest ? "M. " + nomDest : "Monsieur / Madame") + ",\n\n" +
          "Je vous informe par la présente que mon enfant " + (nomEl || "") + " est souffrant(e) et ne pourra pas assister aux cours ce jour. " +
          "Un justificatif médical vous sera transmis dès sa reprise.\n\n" +
          "Merci pour votre compréhension.\nCordialement."
        );
      },
    },
    {
      titre: "Demande de rendez-vous",
      generer: function (nomEl, nomDest) {
        return (
          "Bonjour " + (nomDest ? "M. " + nomDest : "Monsieur / Madame") + ",\n\n" +
          "Je souhaiterais solliciter un bref entretien avec vous concernant le suivi scolaire et le travail de " + (nomEl || "mon enfant") + ". " +
          "Pourriez-vous me communiquer vos disponibilités cette semaine ?\n\n" +
          "Bien cordialement."
        );
      },
    },
    {
      titre: "Suivi des notes",
      generer: function (nomEl, nomDest) {
        return (
          "Bonjour " + (nomDest ? "M. " + nomDest : "Monsieur / Madame") + ",\n\n" +
          "Je viens vers vous au sujet des derniers résultats obtenus par " + (nomEl || "mon enfant") + ". " +
          "Quels conseils pourriez-vous nous donner pour l'aider à progresser dans votre matière ?\n\n" +
          "Avec mes remerciements,\nCordialement."
        );
      },
    },
    {
      titre: "Question scolarité",
      generer: function (nomEl, nomDest) {
        return (
          "Bonjour " + (nomDest ? "M. " + nomDest : "Monsieur / Madame") + ",\n\n" +
          "Je souhaite obtenir un éclaircissement au sujet des devoirs et du programme en cours pour " + (nomEl || "mon enfant") + ".\n\n" +
          "Je vous remercie par avance pour votre retour.\nCordialement."
        );
      },
    },
  ];

  const MODELES_MESSAGES_ENSEIGNANT = [
    {
      titre: "Entretien pédagogique",
      generer: function (nomEl, nomDest) {
        return "Bonjour " + (nomDest || "") + ", je souhaite solliciter un court entretien avec vous concernant le suivi de l'élève " + (nomEl || "votre enfant") + ". Quelles seraient vos disponibilités ? Cordialement.";
      },
    },
    {
      titre: "Point sur le travail",
      generer: function (nomEl, nomDest) {
        return "Bonjour " + (nomDest || "") + ", je vous écris pour faire un point rapide sur le travail scolaire et les devoirs de l'élève " + (nomEl || "votre enfant") + ". Cordialement.";
      },
    },
    {
      titre: "Notification absence / retard",
      generer: function (nomEl, nomDest) {
        return "Bonjour " + (nomDest || "") + ", nous avons constaté une absence ou un retard pour l'élève " + (nomEl || "votre enfant") + ". Merci de bien vouloir nous fournir un justificatif. Cordialement.";
      },
    },
    {
      titre: "Félicitations pour progrès",
      generer: function (nomEl, nomDest) {
        return "Bonjour " + (nomDest || "") + ", nous tenions à vous féliciter pour les excellents progrès et l'effort soutenu de l'élève " + (nomEl || "votre enfant") + ". Bravo !";
      },
    },
  ];

  const modeles = (role === "enseignant") ? MODELES_MESSAGES_ENSEIGNANT : MODELES_MESSAGES_PARENT;

  const initialesInterlocuteur = destinataireActif && destinataireActif.nom
    ? destinataireActif.nom.split(" ").filter(Boolean).map(function (n) { return n[0]; }).join("").slice(0, 2).toUpperCase()
    : "KA";

  const classePropre = eleveActif && eleveActif.classe
    ? eleveActif.classe.replace(/\s*\([^)]*\)/g, "").trim()
    : "";

  if (statut === "chargement") {
    return (
      <>
        <div className="mag-page-title">Messagerie</div>
        <Spinner texte="Chargement de la messagerie..." />
      </>
    );
  }

  if (statut === "refuse") {
    return (
      <>
        <div className="mag-page-title">Messagerie</div>
        <Alerte type="erreur">Impossible de charger la messagerie.</Alerte>
      </>
    );
  }

  return (
    <>
      <div className="mag-page-title">Messagerie</div>

      <div className="react-messagerie-disposition">
        {/* Colonne de gauche : Formulaire de nouveau message */}
        <div
          className="mag-card mag-card-fixe"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "10px",
            padding: "1.3rem",
            outline: "none",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0F172A", marginBottom: "1rem" }}>
            Nouveau message
          </div>

          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

          <form onSubmit={envoyer}>
            <div className="mag-field" style={{ marginBottom: "0.85rem" }}>
              <label htmlFor="msg-eleve" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                À propos de l'élève
              </label>
              <select
                id="msg-eleve"
                value={eleveId}
                onChange={function (e) { setEleveId(e.target.value); }}
                required
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <option value="">-- Choisir l'élève --</option>
                {eleves.map(function (e) {
                  const cl = e.classe ? " (" + e.classe.replace(/\s*\([^)]*\)/g, "").trim() + ")" : "";
                  return (
                    <option key={e.id} value={e.id}>
                      {e.nom}{cl}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="mag-field" style={{ marginBottom: "0.85rem" }}>
              <label htmlFor="msg-destinataire" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                Destinataire
              </label>
              <select
                id="msg-destinataire"
                value={destinataireId}
                onChange={function (e) { setDestinataireId(e.target.value); }}
                required
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <option value="">-- Choisir le destinataire --</option>
                {correspondants.map(function (c) {
                  const roleLabel = c.matiere ? " • " + c.matiere : (c.role === "enseignant" ? " • Enseignant" : " • Parent");
                  return (
                    <option key={c.id} value={c.id}>
                      {c.nom}{roleLabel}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Modèles de message en grille 2x2 */}
            <div style={{ marginBottom: "0.9rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "0.45rem" }}>
                Modèles de message :
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem" }}>
                {modeles.map(function (m, idx) {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={function () {
                        const nomEl = eleveActif ? eleveActif.nom : "mon enfant";
                        const nomDest = destinataireActif ? destinataireActif.nom : "";
                        setContenu(m.generer(nomEl, nomDest));
                      }}
                      style={{
                        fontSize: "0.78rem",
                        padding: "0.5rem 0.6rem",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E1",
                        backgroundColor: "#FFFFFF",
                        color: "#1E3A8A",
                        fontWeight: 600,
                        cursor: "pointer",
                        textAlign: "center",
                        lineHeight: 1.25,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={function (e) {
                        e.currentTarget.style.backgroundColor = "#F8FAFC";
                        e.currentTarget.style.borderColor = "#1E3A8A";
                      }}
                      onMouseLeave={function (e) {
                        e.currentTarget.style.backgroundColor = "#FFFFFF";
                        e.currentTarget.style.borderColor = "#CBD5E1";
                      }}
                    >
                      {m.titre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mag-field" style={{ marginBottom: "1rem" }}>
              <label htmlFor="msg-contenu" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem", display: "block" }}>
                Message
              </label>
              <textarea
                id="msg-contenu"
                value={contenu}
                onChange={function (e) { setContenu(e.target.value); }}
                required
                rows={4}
                style={{
                  width: "100%",
                  padding: "0.65rem",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
                placeholder="Votre message..."
              />
            </div>

            <button
              type="submit"
              className="mag-btn-primary"
              style={{
                width: "100%",
                padding: "0.65rem 1.6rem",
                borderRadius: "6px",
                backgroundColor: "#1E3A8A",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: enCours ? "not-allowed" : "pointer",
              }}
              disabled={enCours}
            >
              {enCours ? "Envoi en cours..." : "Envoyer"}
            </button>
          </form>
        </div>

        {/* Colonne de droite : Carte blanche structurée de discussion */}
        <div
          className="mag-card mag-card-fixe"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            height: "640px",
            padding: 0,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
            outline: "none",
          }}
        >
          {/* En-tête de conversation */}
          <div
            style={{
              padding: "0.9rem 1.25rem",
              borderBottom: "1px solid #E2E8F0",
              backgroundColor: "#FFFFFF",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#1E3A8A",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  flexShrink: 0,
                }}
              >
                {initialesInterlocuteur}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F172A" }}>
                  {destinataireActif ? destinataireActif.nom : "Discussion"}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#64748B", marginTop: "0.1rem" }}>
                  {destinataireActif && destinataireActif.matiere ? destinataireActif.matiere : "Enseignant"}
                </div>
              </div>
            </div>

            {eleveActif ? (
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#1E3A8A",
                  backgroundColor: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  padding: "0.3rem 0.75rem",
                  borderRadius: "6px",
                  whiteSpace: "nowrap",
                }}
              >
                {eleveActif.nom} {classePropre ? "• " + classePropre : ""}
              </div>
            ) : null}
          </div>

          {/* Zone centrale défilante des bulles de messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.2rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
              backgroundColor: "#F8FAFC",
            }}
          >
            {messagesDiscussion.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  margin: "auto",
                  color: "#64748B",
                  fontSize: "0.88rem",
                  maxWidth: "360px",
                  lineHeight: 1.5,
                }}
              >
                Aucun message dans cette discussion pour le moment. Rédigez votre premier message ci-dessous !
              </div>
            ) : (
              messagesDiscussion.map(function (m) {
                const estEnvoye = m.expediteur === monId;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: estEnvoye ? "flex-end" : "flex-start",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "75%",
                        backgroundColor: estEnvoye ? "#1E3A8A" : "#F1F5F9",
                        color: estEnvoye ? "#FFFFFF" : "#0F172A",
                        border: estEnvoye ? "1px solid #1E3A8A" : "1px solid #E2E8F0",
                        borderRadius: estEnvoye ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                        padding: "0.75rem 1rem",
                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          gap: "0.8rem",
                          marginBottom: "0.25rem",
                          fontSize: "0.75rem",
                          color: estEnvoye ? "rgba(255, 255, 255, 0.85)" : "#475569",
                          fontWeight: 600,
                        }}
                      >
                        <span>{estEnvoye ? "Vous" : m.expediteur_nom}</span>
                        <span style={{ fontSize: "0.7rem", opacity: 0.85 }}>
                          {nomEleve(m.eleve)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.88rem",
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {m.contenu}
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          textAlign: "right",
                          marginTop: "0.35rem",
                          color: estEnvoye ? "rgba(255, 255, 255, 0.75)" : "#64748B",
                        }}
                      >
                        {formaterDateMessage(m.date_envoi)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Champ de réponse rapide intégré en bas de la discussion */}
          <form
            onSubmit={envoyerReponseRapide}
            style={{
              padding: "0.85rem 1.1rem",
              backgroundColor: "#FFFFFF",
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "flex-end",
              gap: "0.75rem",
            }}
          >
            <textarea
              value={reponseRapide}
              onChange={function (e) { setReponseRapide(e.target.value); }}
              onKeyDown={function (e) {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  envoyerReponseRapide(e);
                }
              }}
              placeholder="Écrivez votre réponse ici... (Entrée pour envoyer)"
              rows={2}
              style={{
                flex: 1,
                padding: "0.65rem 0.85rem",
                border: "1px solid #CBD5E1",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontFamily: "inherit",
                resize: "none",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={enCours || !reponseRapide.trim()}
              className="mag-btn-primary"
              style={{
                padding: "0.65rem 1.3rem",
                borderRadius: "8px",
                backgroundColor: "#1E3A8A",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "0.875rem",
                height: "44px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: enCours || !reponseRapide.trim() ? "not-allowed" : "pointer",
                opacity: enCours || !reponseRapide.trim() ? 0.6 : 1,
                border: "none",
              }}
            >
              {enCours ? "Envoi..." : "Envoyer"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
