// src/pages/GestionBulletins.jsx
// Deux onglets : Generation (recherche/filtre/calcul) et Configuration
// (cachet, signature, signataire — reellement integres au PDF genere,
// pas de simple apercu decoratif).
import { useState, useEffect, useMemo } from "react";
import { lister, genererBulletinsLot, obtenirParametres, modifierParametresAvecLogo } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import { traduireTexte } from "../localisation.js";
import Spinner from "../components/Spinner.jsx";
import { telechargerFichierProtege } from "../telecharger.js";

const TRIMESTRES = [
  { valeur: "1", label: "1er trimestre" },
  { valeur: "2", label: "2e trimestre" },
  { valeur: "3", label: "3e trimestre" },
];

function OngletGeneration({ token, role }) {
  const [bulletins, setBulletins] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [parametres, setParametres] = useState(null);
  const [statut, setStatut] = useState("chargement");
  const [message, setMessage] = useState(null);
  const [enCoursCalcul, setEnCoursCalcul] = useState(false);
  const [enCoursVerrou, setEnCoursVerrou] = useState(false);

  const [recherche, setRecherche] = useState("");
  const [classeId, setClasseId] = useState("");
  const [trimestre, setTrimestre] = useState("1");

  const estAdmin = role === "administrateur";

  const [enCoursTelechargement, setEnCoursTelechargement] = useState(null);

  const telechargerBulletin = async function (bulletin) {
    setEnCoursTelechargement(bulletin.id);
    try {
      await telechargerFichierProtege(
        bulletin.fichier_pdf, token,
        "bulletin_" + bulletin.eleve + "_T" + bulletin.trimestre + ".pdf"
      );
    } catch (err) {
      setMessage({ type: "erreur", texte: "Impossible de telecharger ce bulletin." });
    }
    setEnCoursTelechargement(null);
  };

  const chargerTout = function () {
    setStatut("chargement");
    const appels = estAdmin
      ? [lister("bulletins", token), lister("eleves", token), lister("classes", token), obtenirParametres(token)]
      : [lister("bulletins", token)];
    Promise.all(appels)
      .then(function (resultats) {
        setBulletins(resultats[0]);
        if (estAdmin) {
          setEleves(resultats[1]);
          setClasses(resultats[2]);
          setParametres(resultats[3]);
        }
        setStatut("ok");
      })
      .catch(function () { setStatut("refuse"); });
  };

  useEffect(chargerTout, [token, role]);

  const elevesFiltres = useMemo(function () {
    return eleves.filter(function (el) {
      const correspondClasse = !classeId || String(el.classe) === String(classeId);
      const texte = (el.nom + " " + el.prenom + " " + el.matricule).toLowerCase();
      const correspondRecherche = !recherche || texte.includes(recherche.toLowerCase());
      return correspondClasse && correspondRecherche;
    });
  }, [eleves, classeId, recherche]);

  const cleVerrou = "notes_verrouillees_t" + trimestre;
  const estVerrouille = parametres ? !!parametres[cleVerrou] : false;

  const basculerVerrou = async function () {
    setEnCoursVerrou(true);
    setMessage(null);
    try {
      const donnees = {};
      donnees[cleVerrou] = !estVerrouille;
      const maj = await modifierParametresAvecLogo(token, (function () {
        const fd = new FormData();
        fd.append("nom_ecole", parametres.nom_ecole);
        fd.append("adresse", parametres.adresse || "");
        fd.append("annee_scolaire_active", parametres.annee_scolaire_active);
        fd.append("systeme_periodes", parametres.systeme_periodes);
        fd.append("notes_verrouillees_t1", trimestre === "1" ? !estVerrouille : !!parametres.notes_verrouillees_t1);
        fd.append("notes_verrouillees_t2", trimestre === "2" ? !estVerrouille : !!parametres.notes_verrouillees_t2);
        fd.append("notes_verrouillees_t3", trimestre === "3" ? !estVerrouille : !!parametres.notes_verrouillees_t3);
        return fd;
      })());
      setParametres(maj);
      setMessage({ type: "succes", texte: estVerrouille ? "Trimestre deverrouille." : "Trimestre verrouille." });
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCoursVerrou(false);
  };

  const calculerPourClasse = async function () {
    if (elevesFiltres.length === 0) {
      setMessage({ type: "erreur", texte: "Aucun eleve ne correspond a ce filtre." });
      return;
    }
    setEnCoursCalcul(true);
    setMessage(null);
    try {
      const resultat = await genererBulletinsLot(
        token,
        elevesFiltres.map(function (el) { return el.id; }),
        Number(trimestre)
      );
      const nombreSansNotes = resultat.sans_notes.length;
      setMessage({
        type: nombreSansNotes === 0 ? "succes" : "erreur",
        texte: resultat.total_genere + " bulletin(s) genere(s)" +
          (nombreSansNotes ? ", " + nombreSansNotes + " eleve(s) sans notes saisies." : "."),
      });
      await chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message || "La generation des bulletins a echoue." });
    } finally {
      setEnCoursCalcul(false);
    }
  };

  return (
    <>
      {estAdmin ? (
        <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.8rem" }}>
          {parametres ? (
            <div className="react-bulletin-entete">
              <div className="react-bulletin-logo">
                <img
                  src={parametres.logo || (import.meta.env.BASE_URL + "logo-ecole-defaut.png")}
                  alt={parametres.nom_ecole}
                  style={{ width: "100%", height: "100%", objectFit: parametres.logo ? "cover" : "contain", padding: parametres.logo ? 0 : "4px" }}
                />
              </div>
              <div>
                <div className="react-bulletin-nom-ecole">{parametres.nom_ecole}</div>
                <div className="react-bulletin-sous-titre">
                  Bulletins trimestriels {parametres.annee_scolaire_active ? "— Annee scolaire " + parametres.annee_scolaire_active : ""}
                </div>
              </div>
            </div>
          ) : (
            <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>Bulletins trimestriels</div>
          )}
          <p style={{ fontSize: "0.85rem", color: "var(--ink-600)", marginBottom: "1.1rem" }}>
            Filtrez par classe et trimestre, puis calculez les moyennes et generez les bulletins de tous les eleves correspondants en un clic.
          </p>
          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

          <div className="mag-grid-2">
            <div className="mag-field">
              <label htmlFor="bull-recherche">Rechercher un eleve (nom, matricule)</label>
              <input id="bull-recherche" type="text" value={recherche} onChange={function (e) { setRecherche(e.target.value); }} placeholder="Ex: Kodjo ou EL001" />
            </div>
            <div className="mag-field">
              <label htmlFor="bull-classe">Classe</label>
              <select id="bull-classe" value={classeId} onChange={function (e) { setClasseId(e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                <option value="">Toutes les classes</option>
                {classes.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
              </select>
            </div>
          </div>

          <div className="mag-grid-2" style={{ alignItems: "end" }}>
            <div className="mag-field" style={{ marginBottom: 0 }}>
              <label htmlFor="bull-trimestre">Trimestre</label>
              <select id="bull-trimestre" value={trimestre} onChange={function (e) { setTrimestre(e.target.value); }} style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}>
                {TRIMESTRES.map(function (t) { return <option key={t.valeur} value={t.valeur}>{traduireTexte(t.label)}</option>; })}
              </select>
            </div>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button
                type="button" onClick={basculerVerrou} disabled={enCoursVerrou || !parametres}
                className="mag-btn-lien"
                style={{
                  border: "1px solid " + (estVerrouille ? "var(--red-600)" : "var(--green-600)"),
                  color: estVerrouille ? "var(--red-600)" : "var(--green-600)",
                  background: estVerrouille ? "#F5EBD1" : "#E7F1EB",
                }}
              >
                {estVerrouille ? "Verrouille — cliquer pour deverrouiller" : "Ouvert — cliquer pour verrouiller"}
              </button>
            </div>
          </div>

          <button
            type="button" onClick={calculerPourClasse} disabled={enCoursCalcul}
            className="mag-btn-primary" style={{ width: "auto", padding: "0.65rem 1.8rem", marginTop: "1rem", background: "#B35900" }}
          >
            {enCoursCalcul ? <span className="react-spinner"></span> : "⚡ Calculer les moyennes (" + elevesFiltres.length + " eleve" + (elevesFiltres.length !== 1 ? "s" : "") + ")"}
          </button>
        </div>
      ) : null}

      <div className="mag-section-entete">
        <div className="mag-stat-label">Bulletins {estAdmin ? "generes" : "disponibles"}</div>
        <span className="mag-compteur-pill">{bulletins.length}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les bulletins.</Alerte> : null}
      {statut === "ok" ? (
        bulletins.length === 0 ? (
          <div className="mag-card" style={{ textAlign: "center", padding: "2.5rem", border: "1px dashed var(--line)", color: "var(--ink-600)" }}>
            Veuillez selectionner une classe ou saisir un nom d'eleve pour commencer a generer les bulletins.
          </div>
        ) : (
          <div className="mag-table-wrap react-fade-in">
            <table className="mag-table mag-table-pro">
              <thead><tr><th>Eleve</th><th>Trimestre</th><th>Moyenne</th><th>Rang</th><th></th></tr></thead>
              <tbody>
                {bulletins.map(function (b) {
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.eleve_nom || b.eleve}</td>
                      <td><span className="mag-badge">Trim. {b.trimestre}</span></td>
                      <td style={{ fontWeight: 600 }}>{b.moyenne_generale}/20</td>
                      <td>{b.rang ? b.rang + "e / " + b.effectif_classe : "-"}</td>
                      <td>
                        {b.fichier_pdf ? (
                          <button
                            type="button"
                            className="mag-btn-lien"
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            disabled={enCoursTelechargement === b.id}
                            onClick={function () { telechargerBulletin(b); }}
                          >
                            {enCoursTelechargement === b.id ? "Telechargement..." : "Telecharger →"}
                          </button>
                        ) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </>
  );
}

function OngletConfiguration({ token }) {
  const [donnees, setDonnees] = useState(null);
  const [statut, setStatut] = useState("chargement");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [nouveauCachet, setNouveauCachet] = useState(null);
  const [nouvelleSignature, setNouvelleSignature] = useState(null);

  useEffect(function () {
    obtenirParametres(token).then(function (d) { setDonnees(d); setStatut("ok"); }).catch(function () { setStatut("refuse"); });
  }, [token]);

  const modifierChamp = function (champ, valeur) {
    setDonnees(Object.assign({}, donnees, { [champ]: valeur }));
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      const fd = new FormData();
      fd.append("nom_ecole", donnees.nom_ecole);
      fd.append("adresse", donnees.adresse || "");
      fd.append("annee_scolaire_active", donnees.annee_scolaire_active);
      fd.append("systeme_periodes", donnees.systeme_periodes);
      fd.append("nom_signataire", donnees.nom_signataire || "");
      fd.append("titre_signataire", donnees.titre_signataire || "");
      fd.append("notes_verrouillees_t1", !!donnees.notes_verrouillees_t1);
      fd.append("notes_verrouillees_t2", !!donnees.notes_verrouillees_t2);
      fd.append("notes_verrouillees_t3", !!donnees.notes_verrouillees_t3);
      if (nouveauCachet) fd.append("cachet", nouveauCachet);
      if (nouvelleSignature) fd.append("signature", nouvelleSignature);
      const maj = await modifierParametresAvecLogo(token, fd);
      setDonnees(maj);
      setNouveauCachet(null);
      setNouvelleSignature(null);
      setMessage({ type: "succes", texte: "Configuration enregistree. Les prochains bulletins generes utiliseront ces elements." });
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  if (statut === "chargement") return <Spinner texte="Chargement..." />;
  if (statut === "refuse" || !donnees) return <Alerte>Impossible de charger la configuration.</Alerte>;

  return (
    <div className="mag-panneau-form react-fade-in" style={{ maxWidth: "620px" }}>
      <div className="mag-stat-label" style={{ marginBottom: "0.4rem" }}>Chef d'etablissement &amp; visa</div>
      <p style={{ fontSize: "0.83rem", color: "var(--ink-600)", marginBottom: "1.2rem" }}>
        Le cachet et la signature ci-dessous sont imprimes automatiquement sur chaque bulletin PDF genere.
      </p>
      {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

      <form onSubmit={soumettre}>
        <div className="mag-grid-2">
          <div className="mag-field">
            <label htmlFor="bull-titre-signataire">Titre du signataire</label>
            <input id="bull-titre-signataire" type="text" value={donnees.titre_signataire || ""} onChange={function (e) { modifierChamp("titre_signataire", e.target.value); }} placeholder="Ex: Le Directeur" />
          </div>
          <div className="mag-field">
            <label htmlFor="bull-nom-signataire">Nom complet du signataire</label>
            <input id="bull-nom-signataire" type="text" value={donnees.nom_signataire || ""} onChange={function (e) { modifierChamp("nom_signataire", e.target.value); }} placeholder="Ex: M. Komla AGBOZO" />
          </div>
        </div>

        <div className="mag-grid-2">
          <div className="mag-field">
            <label htmlFor="bull-cachet">Cachet officiel</label>
            {donnees.cachet ? (
              <div style={{ marginBottom: "0.6rem" }}>
                <img src={donnees.cachet} alt="Cachet actuel" style={{ width: "70px", height: "70px", objectFit: "contain", border: "1px solid var(--line)", borderRadius: "8px", padding: "4px" }} />
              </div>
            ) : (
              <p style={{ fontSize: "0.8rem", color: "var(--ink-600)", marginBottom: "0.5rem" }}>Aucun cachet importe.</p>
            )}
            <input id="bull-cachet" type="file" accept="image/*" onChange={function (e) { setNouveauCachet(e.target.files[0] || null); }} />
          </div>
          <div className="mag-field">
            <label htmlFor="bull-signature">Signature</label>
            {donnees.signature ? (
              <div style={{ marginBottom: "0.6rem" }}>
                <img src={donnees.signature} alt="Signature actuelle" style={{ width: "110px", height: "50px", objectFit: "contain", border: "1px solid var(--line)", borderRadius: "8px", padding: "4px" }} />
              </div>
            ) : (
              <p style={{ fontSize: "0.8rem", color: "var(--ink-600)", marginBottom: "0.5rem" }}>Aucune signature importee.</p>
            )}
            <input id="bull-signature" type="file" accept="image/*" onChange={function (e) { setNouvelleSignature(e.target.files[0] || null); }} />
          </div>
        </div>

        <button type="submit" className="mag-btn-primary" style={{ width: "auto", padding: "0.6rem 1.8rem" }} disabled={enCours}>
          {enCours ? <span className="react-spinner"></span> : "Enregistrer la configuration"}
        </button>
      </form>
    </div>
  );
}

export default function GestionBulletins({ token, role }) {
  const [onglet, setOnglet] = useState("generation");
  const estAdmin = role === "administrateur";

  return (
    <>
      <div className="mag-page-title"><span className="eyebrow">Pedagogie</span> Bulletins</div>

      {estAdmin ? (
        <div style={{ display: "flex", gap: "1.6rem", borderBottom: "1px solid var(--line)", marginBottom: "1.6rem" }}>
          <button
            type="button" onClick={function () { setOnglet("generation"); }}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "0.2rem 0 0.8rem",
              fontWeight: 600, fontSize: "0.92rem",
              color: onglet === "generation" ? "var(--green-600)" : "var(--ink-600)",
              borderBottom: onglet === "generation" ? "3px solid var(--green-600)" : "3px solid transparent",
            }}
          >
            Generation des bulletins
          </button>
          <button
            type="button" onClick={function () { setOnglet("configuration"); }}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "0.2rem 0 0.8rem",
              fontWeight: 600, fontSize: "0.92rem",
              color: onglet === "configuration" ? "var(--green-600)" : "var(--ink-600)",
              borderBottom: onglet === "configuration" ? "3px solid var(--green-600)" : "3px solid transparent",
            }}
          >
            Configuration du visuel
          </button>
        </div>
      ) : null}

      {onglet === "generation" ? <OngletGeneration token={token} role={role} /> : <OngletConfiguration token={token} />}
    </>
  );
}
