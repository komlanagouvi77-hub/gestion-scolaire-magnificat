// src/pages/GestionEnseignants.jsx
import { useState, useEffect } from "react";
import { lister, creer, modifier, supprimer } from "../api.js";
import { Alerte, ListeCasesACocher } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import BoutonSupprimer from "../components/BoutonSupprimer.jsx";

export default function GestionEnseignants({ token }) {
  const confirmation = useConfirmation();
  const [enseignants, setEnseignants] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [classes, setClasses] = useState([]);
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
  const [specialite, setSpecialite] = useState("");
  const [matieresChoisies, setMatieresChoisies] = useState([]);
  const [classesChoisies, setClassesChoisies] = useState([]);

  const chargerTout = function () {
    setStatut("chargement");
    Promise.all([lister("enseignants", token), lister("matieres", token), lister("classes", token)])
      .then(function (resultats) {
        setEnseignants(resultats[0]);
        setMatieres(resultats[1]);
        setClasses(resultats[2]);
        setStatut("ok");
      })
      .catch(function () { setStatut("refuse"); });
  };

  useEffect(chargerTout, [token]);

  const viderFormulaire = function () {
    setIdEnEdition(null);
    setUsername(""); setPassword(""); setFirstName(""); setLastName("");
    setEmail(""); setTelephone(""); setSpecialite("");
    setMatieresChoisies([]); setClassesChoisies([]);
  };

  const commencerEdition = function (e) {
    setIdEnEdition(e.id);
    setUsername(e.username);
    setPassword("");
    setFirstName(e.first_name || "");
    setLastName(e.last_name || "");
    setEmail(e.email || "");
    setTelephone(e.telephone || "");
    setSpecialite(e.specialite || "");
    setMatieresChoisies(e.matieres || []);
    setClassesChoisies(e.classes || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      if (idEnEdition) {
        const donnees = {
          first_name: firstName, last_name: lastName, email: email, telephone: telephone,
          specialite: specialite, matieres: matieresChoisies, classes: classesChoisies,
        };
        if (password) donnees.password = password;
        await modifier("enseignants", idEnEdition, token, donnees);
        setMessage({ type: "succes", texte: "Enseignant mis a jour." });
      } else {
        await creer("enseignants", token, {
          username: username, password: password, first_name: firstName, last_name: lastName,
          email: email, telephone: telephone, specialite: specialite,
          matieres: matieresChoisies, classes: classesChoisies,
        });
        setMessage({ type: "succes", texte: "Compte enseignant cree avec succes." });
      }
      viderFormulaire();
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const supprimerEnseignant = async function (e) {
    if (!(await confirmation.demander("Supprimer le compte de " + e.username + " ?"))) return;
    try {
      await supprimer("enseignants", e.id, token);
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible." });
    }
  };

  const optionsMatieres = matieres.map(function (m) { return { id: m.id, label: m.nom }; });
  const optionsClasses = classes.map(function (c) { return { id: c.id, label: c.nom }; });

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Utilisateurs</span> Enseignants</div>

      <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.8rem", maxWidth: "680px" }}>
        <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>
          {idEnEdition ? "Modifier l'enseignant" : "Creer un compte enseignant"}
        </div>
        {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
        <form onSubmit={soumettre}>
          <div className="mag-grid-2">
            <div className="mag-field">
              <label className="mag-label-requis" htmlFor="ens-username">Nom d'utilisateur</label>
              <input id="ens-username" type="text" value={username} onChange={function (e) { setUsername(e.target.value); }} required disabled={!!idEnEdition} />
            </div>
            <div className="mag-field">
              <label className={idEnEdition ? undefined : "mag-label-requis"} htmlFor="ens-password">Mot de passe {idEnEdition ? "(laisser vide pour ne pas changer)" : ""}</label>
              <input id="ens-password" type="password" value={password} onChange={function (e) { setPassword(e.target.value); }} required={!idEnEdition} minLength={8} />
            </div>
            <div className="mag-field"><label htmlFor="ens-prenom">Prenom</label><input id="ens-prenom" type="text" value={firstName} onChange={function (e) { setFirstName(e.target.value); }} /></div>
            <div className="mag-field"><label htmlFor="ens-nom">Nom</label><input id="ens-nom" type="text" value={lastName} onChange={function (e) { setLastName(e.target.value); }} /></div>
            <div className="mag-field"><label htmlFor="ens-email">Email</label><input id="ens-email" type="email" value={email} onChange={function (e) { setEmail(e.target.value); }} /></div>
            <div className="mag-field"><label htmlFor="ens-telephone">Telephone</label><input id="ens-telephone" type="text" value={telephone} onChange={function (e) { setTelephone(e.target.value); }} /></div>
          </div>
          <div className="mag-field"><label htmlFor="ens-specialite">Specialite</label><input id="ens-specialite" type="text" value={specialite} onChange={function (e) { setSpecialite(e.target.value); }} /></div>
          <div className="mag-field">
            <label id="ens-label-matieres">Matieres enseignees</label>
            <ListeCasesACocher options={optionsMatieres} valeursSelectionnees={matieresChoisies} onChange={setMatieresChoisies} />
          </div>
          <div className="mag-field">
            <label id="ens-label-classes">Classes assignees</label>
            <ListeCasesACocher options={optionsClasses} valeursSelectionnees={classesChoisies} onChange={setClassesChoisies} />
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
        <div className="mag-stat-label">Liste des enseignants</div>
        <span className="mag-compteur-pill">{enseignants.length}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les enseignants.</Alerte> : null}
      {statut === "ok" ? (
        <div className="mag-table-wrap react-fade-in">
          <table className="mag-table mag-table-pro">
            <thead><tr><th>Enseignant</th><th>Specialite</th><th>Matieres</th><th>Classes</th><th></th></tr></thead>
            <tbody>
              {enseignants.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--ink-600)", padding: "2rem" }}>Aucun enseignant pour le moment.</td></tr>
              ) : enseignants.map(function (e) {
                const nomComplet = (e.first_name + " " + e.last_name).trim() || e.username;
                const initiale = (e.first_name || e.username).charAt(0).toUpperCase();
                return (
                  <tr key={e.id}>
                    <td>
                      <div className="mag-personne-cellule">
                        <span className="mag-avatar">{initiale}</span>
                        <div>
                          <div className="mag-personne-nom">{nomComplet}</div>
                          <div className="mag-personne-sous">{e.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>{e.specialite || "-"}</td>
                    <td>{e.matieres_noms && e.matieres_noms.length ? e.matieres_noms.map(function (n, i) { return <span className="mag-badge" key={i}>{n}</span>; }) : "-"}</td>
                    <td>{e.classes_noms && e.classes_noms.length ? e.classes_noms.map(function (n, i) { return <span className="mag-badge" key={i}>{n}</span>; }) : "-"}</td>
                    <td>
                      <button type="button" className="mag-btn-lien" onClick={function () { commencerEdition(e); }}>Modifier →</button>
                      <BoutonSupprimer onClick={function () { supprimerEnseignant(e); }} />
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
          titre="Supprimer le compte enseignant"
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