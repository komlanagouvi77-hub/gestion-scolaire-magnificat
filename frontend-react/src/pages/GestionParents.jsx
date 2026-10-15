// src/pages/GestionParents.jsx
import { useState, useEffect } from "react";
import { lister, creer, modifier, supprimer } from "../api.js";
import { Alerte, ListeCasesACocher } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";

export default function GestionParents({ token }) {
  const confirmation = useConfirmation();
  const [parents, setParents] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [idEnEdition, setIdEnEdition] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [profession, setProfession] = useState("");
  const [elevesChoisis, setElevesChoisis] = useState([]);

  const chargerTout = function () {
    setStatut("chargement");
    Promise.all([lister("parents", token), lister("eleves", token)])
      .then(function (resultats) {
        setParents(resultats[0]);
        setEleves(resultats[1]);
        setStatut("ok");
      })
      .catch(function () { setStatut("refuse"); });
  };

  useEffect(chargerTout, [token]);

  const viderFormulaire = function () {
    setIdEnEdition(null);
    setUsername(""); setPassword(""); setFirstName(""); setLastName("");
    setEmail(""); setTelephone(""); setProfession(""); setElevesChoisis([]);
  };

  const commencerEdition = function (p) {
    setIdEnEdition(p.id);
    setUsername(p.username);
    setPassword("");
    setFirstName(p.first_name || "");
    setLastName(p.last_name || "");
    setEmail(p.email || "");
    setTelephone(p.telephone || "");
    setProfession(p.profession || "");
    setElevesChoisis(p.eleves || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      if (idEnEdition) {
        const donnees = {
          first_name: firstName, last_name: lastName, email: email,
          telephone: telephone, profession: profession, eleves: elevesChoisis,
        };
        if (password) donnees.password = password;
        await modifier("parents", idEnEdition, token, donnees);
        setMessage({ type: "succes", texte: "Parent mis a jour." });
      } else {
        await creer("parents", token, {
          username: username, password: password, first_name: firstName, last_name: lastName,
          email: email, telephone: telephone, profession: profession, eleves: elevesChoisis,
        });
        setMessage({ type: "succes", texte: "Compte parent cree avec succes." });
      }
      viderFormulaire();
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const supprimerParent = async function (p) {
    if (!(await confirmation.demander("Supprimer le compte de " + p.username + " ?"))) return;
    try {
      await supprimer("parents", p.id, token);
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible." });
    }
  };

  const optionsEleves = eleves.map(function (e) { return { id: e.id, label: e.nom + " " + e.prenom }; });

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Utilisateurs</span> Parents</div>

      <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.8rem", maxWidth: "680px" }}>
        <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>
          {idEnEdition ? "Modifier le parent" : "Creer un compte parent"}
        </div>
        {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
        <form onSubmit={soumettre}>
          <div className="mag-grid-2">
            <div className="mag-field">
              <label className="mag-label-requis" htmlFor="par-username">Nom d'utilisateur</label>
              <input id="par-username" type="text" value={username} onChange={function (e) { setUsername(e.target.value); }} required disabled={!!idEnEdition} />
            </div>
            <div className="mag-field">
              <label className={idEnEdition ? undefined : "mag-label-requis"} htmlFor="par-password">Mot de passe {idEnEdition ? "(laisser vide pour ne pas changer)" : ""}</label>
              <input id="par-password" type="password" value={password} onChange={function (e) { setPassword(e.target.value); }} required={!idEnEdition} minLength={8} />
            </div>
            <div className="mag-field"><label htmlFor="par-prenom">Prenom</label><input id="par-prenom" type="text" value={firstName} onChange={function (e) { setFirstName(e.target.value); }} /></div>
            <div className="mag-field"><label htmlFor="par-nom">Nom</label><input id="par-nom" type="text" value={lastName} onChange={function (e) { setLastName(e.target.value); }} /></div>
            <div className="mag-field"><label htmlFor="par-email">Email</label><input id="par-email" type="email" value={email} onChange={function (e) { setEmail(e.target.value); }} /></div>
            <div className="mag-field"><label htmlFor="par-telephone">Telephone</label><input id="par-telephone" type="text" value={telephone} onChange={function (e) { setTelephone(e.target.value); }} /></div>
          </div>
          <div className="mag-field"><label htmlFor="par-profession">Profession</label><input id="par-profession" type="text" value={profession} onChange={function (e) { setProfession(e.target.value); }} /></div>
          <div className="mag-field">
            <label id="par-label-enfants">Enfant(s)</label>
            <ListeCasesACocher options={optionsEleves} valeursSelectionnees={elevesChoisis} onChange={setElevesChoisis} />
          </div>
          <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.8rem" }} disabled={enCours}>
            {enCours ? <span className="react-spinner"></span> : (idEnEdition ? "Enregistrer" : "Creer le compte")}
          </button>
          {idEnEdition ? (
            <button type="button" className="mag-btn-lien" style={{ marginLeft: "0.8rem" }} onClick={viderFormulaire}>Annuler</button>
          ) : null}
        </form>
      </div>

      <div className="mag-section-entete">
        <div className="mag-stat-label">Liste des parents</div>
        <span className="mag-compteur-pill">{parents.length}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les parents.</Alerte> : null}
      {statut === "ok" ? (
        <div className="mag-table-wrap react-fade-in">
          <table className="mag-table mag-table-pro">
            <thead><tr><th>Parent</th><th>Contact</th><th>Enfant(s)</th><th></th></tr></thead>
            <tbody>
              {parents.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}>Aucun parent pour le moment.</td></tr>
              ) : parents.map(function (p) {
                const nomComplet = (p.first_name + " " + p.last_name).trim() || p.username;
                const initiale = (p.first_name || p.username).charAt(0).toUpperCase();
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="mag-personne-cellule">
                        <span className="mag-avatar">{initiale}</span>
                        <div>
                          <div className="mag-personne-nom">{nomComplet}</div>
                          <div className="mag-personne-sous">{p.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {p.telephone ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.85rem" }}>{p.telephone}</span>
                          <a
                            href={"https://wa.me/" + p.telephone.replace(/[^0-9]/g, "")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-mag-outline"
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.15rem 0.5rem",
                              color: "#16A34A",
                              borderColor: "#16A34A",
                              textDecoration: "none",
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                            title="Ouvrir une discussion WhatsApp"
                          >
                            <span>💬</span> WhatsApp
                          </a>
                        </div>
                      ) : (
                        <span style={{ color: "var(--ink-400, #94a3b8)", fontSize: "0.85rem" }}>-</span>
                      )}
                    </td>
                    <td>{p.eleves_noms && p.eleves_noms.length ? p.eleves_noms.map(function (n, i) { return <span className="mag-badge" key={i}>{n}</span>; }) : "-"}</td>
                    <td>
                      <button type="button" className="mag-btn-lien" onClick={function () { commencerEdition(p); }}>Modifier →</button>
                      <BoutonSupprimer onClick={function () { supprimerParent(p); }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {confirmation.demande ? (
        <ConfirmModal
          titre="Supprimer le compte parent"
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