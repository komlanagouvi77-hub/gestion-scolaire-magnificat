// src/pages/GestionBulletins.jsx
// Deux onglets : Génération (recherche/filtre/calcul) et Configuration
// (cachet, signature, signataire — réellement intégrés au PDF généré).
import { useState, useEffect, useMemo } from "react";
import { lister, genererBulletinsLot, obtenirParametres, modifierParametresAvecLogo, recupererProfil } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import { traduireTexte } from "../localisation.js";
import Spinner from "../components/Spinner.jsx";
import { telechargerFichierProtege, recupererBlobProtege } from "../telecharger.js";
import VisualiseurPdfModal from "../components/VisualiseurPdfModal.jsx";
import { Eye, Download } from "lucide-react";

const TRIMESTRES = [
  { valeur: "1", label: "1er trimestre" },
  { valeur: "2", label: "2e trimestre" },
  { valeur: "3", label: "3e trimestre" },
];

function formaterRang(rang, total) {
  if (!rang) return "-";
  const num = Number(rang);
  const etiquette = num === 1 ? "1er" : num + "e";
  return total ? etiquette + " / " + total : etiquette;
}

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
  const [modalPdf, setModalPdf] = useState({ ouvert: false, blob: null, nomFichier: "", titreDoc: "" });

  const previsualiserBulletin = async function (bulletin) {
    setEnCoursTelechargement(bulletin.id);
    try {
      const urlTelechargement = bulletin.fichier_pdf || ("/api/bulletins/" + bulletin.id + "/telecharger/");
      const nomEleve = (bulletin.eleve_nom || "eleve_" + bulletin.eleve).replace(/[^a-zA-Z0-9_-]/g, "_");
      const nomFichier = "bulletin_" + nomEleve + "_T" + bulletin.trimestre + ".pdf";
      const blob = await recupererBlobProtege(urlTelechargement, token);
      setModalPdf({
        ouvert: true,
        blob: blob,
        nomFichier: nomFichier,
        titreDoc: `Bulletin T${bulletin.trimestre} — ${bulletin.eleve_nom || "Élève"}`,
      });
    } catch (err) {
      console.error("Erreur aperçu bulletin:", err);
      setMessage({ type: "erreur", texte: "Impossible d'afficher l'aperçu du bulletin : " + (err.message || "") });
    } finally {
      setEnCoursTelechargement(null);
    }
  };

  const telechargerBulletin = async function (bulletin) {
    setEnCoursTelechargement(bulletin.id);
    try {
      const urlTelechargement = bulletin.fichier_pdf || ("/api/bulletins/" + bulletin.id + "/telecharger/");
      const nomEleve = (bulletin.eleve_nom || "eleve_" + bulletin.eleve).replace(/[^a-zA-Z0-9_-]/g, "_");
      const nomFichier = "bulletin_" + nomEleve + "_T" + bulletin.trimestre + ".pdf";
      await telechargerFichierProtege(urlTelechargement, token, nomFichier);
      setMessage({ type: "succes", texte: "Bulletin téléchargé avec succès." });
    } catch (err) {
      console.error("Erreur de téléchargement bulletin:", err);
      setMessage({ type: "erreur", texte: "Impossible de télécharger ce bulletin : " + (err.message || "") });
    }
    setEnCoursTelechargement(null);
  };

  const chargerTout = function () {
    setStatut("chargement");
    const appels = estAdmin
      ? [lister("bulletins", token), lister("eleves", token), lister("classes", token), obtenirParametres(token)]
      : [lister("bulletins", token), recupererProfil(token), obtenirParametres(token)];
    Promise.all(appels)
      .then(function (resultats) {
        setBulletins(resultats[0] || []);
        if (estAdmin) {
          setEleves(resultats[1] || []);
          setClasses(resultats[2] || []);
          setParametres(resultats[3]);
        } else {
          const profil = resultats[1] || {};
          if (Array.isArray(profil.classes)) {
            setClasses(profil.classes);
          }
          setParametres(resultats[2]);
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
      setMessage({ type: "succes", texte: estVerrouille ? "Trimestre déverrouillé avec succès." : "Trimestre verrouillé avec succès." });
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCoursVerrou(false);
  };

  const calculerPourClasse = async function () {
    if (elevesFiltres.length === 0) {
      setMessage({ type: "erreur", texte: "Aucun élève ne correspond à ce filtre." });
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
      const nombreSansNotes = resultat.sans_notes ? resultat.sans_notes.length : 0;
      setMessage({
        type: nombreSansNotes === 0 ? "succes" : "erreur",
        texte: resultat.total_genere + " bulletin(s) généré(s)" +
          (nombreSansNotes ? ", " + nombreSansNotes + " élève(s) sans notes saisies." : "."),
      });
      await chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message || "La génération des bulletins a échoué." });
    } finally {
      setEnCoursCalcul(false);
    }
  };

  return (
    <>
      {estAdmin ? (
        <div className="mag-panneau-form react-fade-in" style={{ marginBottom: "1.8rem", width: "100%", padding: "1.25rem" }}>
          {parametres ? (
            <div className="react-bulletin-entete" style={{ marginBottom: "0.8rem" }}>
              <div className="react-bulletin-logo">
                <img
                  src={parametres.logo || (import.meta.env.BASE_URL + "logo-ecole-defaut.png")}
                  alt={parametres.nom_ecole}
                  style={{ width: "100%", height: "100%", objectFit: parametres.logo ? "cover" : "contain", padding: parametres.logo ? 0 : "4px" }}
                />
              </div>
              <div>
                <div className="react-bulletin-nom-ecole" style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0F172A" }}>
                  {parametres.nom_ecole}
                </div>
                <div className="react-bulletin-sous-titre" style={{ fontSize: "0.85rem", color: "#64748B" }}>
                  Bulletins trimestriels {parametres.annee_scolaire_active ? "— Année scolaire " + parametres.annee_scolaire_active : ""}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0F172A", marginBottom: "0.8rem" }}>
              Bulletins trimestriels
            </div>
          )}
          <p style={{ fontSize: "0.85rem", color: "#64748B", marginBottom: "1.2rem" }}>
            Filtrez par classe et trimestre, puis calculez les moyennes et générez les bulletins de tous les élèves correspondants en un clic.
          </p>
          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}

          <div className="mag-grid-2" style={{ gap: "1rem", marginBottom: "1rem" }}>
            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="bull-recherche" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                Rechercher un élève (nom, matricule)
              </label>
              <input
                id="bull-recherche"
                type="text"
                value={recherche}
                onChange={function (e) { setRecherche(e.target.value); }}
                placeholder="Ex: Kodjo ou EL001"
                style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid var(--line, #CBD5E1)", borderRadius: "6px", fontSize: "0.85rem" }}
              />
            </div>
            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="bull-classe" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                Classe
              </label>
              <select
                id="bull-classe"
                value={classeId}
                onChange={function (e) { setClasseId(e.target.value); }}
                style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid var(--line, #CBD5E1)", borderRadius: "6px", background: "#FFF", fontSize: "0.85rem" }}
              >
                <option value="">Toutes les classes</option>
                {classes.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
              </select>
            </div>
          </div>

          <div className="mag-grid-2" style={{ gap: "1rem", alignItems: "flex-end", marginBottom: "1.2rem" }}>
            <div className="mag-field" style={{ margin: 0 }}>
              <label htmlFor="bull-trimestre" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                Trimestre
              </label>
              <select
                id="bull-trimestre"
                value={trimestre}
                onChange={function (e) { setTrimestre(e.target.value); }}
                style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid var(--line, #CBD5E1)", borderRadius: "6px", background: "#FFF", fontSize: "0.85rem" }}
              >
                {TRIMESTRES.map(function (t) { return <option key={t.valeur} value={t.valeur}>{traduireTexte(t.label)}</option>; })}
              </select>
            </div>
            <div>
              <button
                type="button"
                onClick={basculerVerrou}
                disabled={enCoursVerrou || !parametres}
                className="mag-btn-lien"
                style={{
                  padding: "0.55rem 1rem",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  border: "1px solid " + (estVerrouille ? "#DC2626" : "#16A34A"),
                  color: estVerrouille ? "#DC2626" : "#16A34A",
                  background: estVerrouille ? "#FEF2F2" : "#F0FDF4",
                }}
              >
                {estVerrouille ? "Verrouillé — cliquer pour déverrouiller" : "Ouvert — cliquer pour verrouiller"}
              </button>
            </div>
          </div>

          <div style={{ paddingTop: "0.5rem", borderTop: "1px solid #F1F5F9" }}>
            <button
              type="button"
              onClick={calculerPourClasse}
              disabled={enCoursCalcul}
              className="mag-btn-primary"
              style={{
                width: "auto",
                padding: "0.6rem 1.8rem",
                background: "#1E3A8A",
                borderColor: "#1E3A8A",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {enCoursCalcul ? <span className="react-spinner"></span> : "Calculer les moyennes (" + elevesFiltres.length + " élève" + (elevesFiltres.length > 1 ? "s" : "") + ")"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mag-section-entete" style={{ marginBottom: "0.75rem" }}>
        <div className="mag-stat-label">
          {role === "parent" ? "Bulletins scolaires officiels" : estAdmin ? "Bulletins générés" : "Bulletins disponibles"}
        </div>
        <span className="mag-compteur-pill">{bulletins.length}</span>
      </div>

      {statut === "chargement" ? <Spinner texte="Chargement des bulletins..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger les bulletins.</Alerte> : null}
      {statut === "ok" ? (
        bulletins.length === 0 ? (
          <div className="mag-card" style={{ textAlign: "center", padding: "2.5rem", border: "1px dashed var(--line)", color: "var(--ink-600)" }}>
            {role === "parent"
              ? "Aucun bulletin disponible pour le moment."
              : "Sélectionnez une classe pour afficher les bulletins."}
          </div>
        ) : (
          <div className="mag-table-wrap react-fade-in" style={{ border: "1px solid #E2E8F0", borderRadius: "6px" }}>
            <table className="mag-table mag-table-pro">
              <thead>
                <tr>
                  <th style={{ width: "38%" }}>Élève</th>
                  <th style={{ width: "15%" }}>Trimestre</th>
                  <th style={{ width: "15%" }}>Moyenne</th>
                  <th style={{ width: "14%" }}>Rang</th>
                  <th style={{ width: "18%", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bulletins.map(function (b) {
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600, color: "#0F172A" }}>{b.eleve_nom || b.eleve}</td>
                      <td>
                        <span className="mag-badge" style={{ background: "#F1F5F9", color: "#1E3A8A", fontWeight: 600 }}>
                          Trim. {b.trimestre}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: "#0F172A" }}>
                        {Number(b.moyenne_generale).toFixed(2).replace(".", ",")} / 20
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "#334155" }}>
                          {formaterRang(b.rang, b.effectif_classe)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="mag-btn-lien"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            marginRight: "0.85rem",
                            color: "var(--azur-500)",
                            fontWeight: 600,
                          }}
                          disabled={enCoursTelechargement === b.id}
                          onClick={function () { previsualiserBulletin(b); }}
                          title="Aperçu et impression directe"
                        >
                          <Eye size={14} /> Aperçu
                        </button>
                        <button
                          type="button"
                          className="mag-btn-lien"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontWeight: 600,
                          }}
                          disabled={enCoursTelechargement === b.id}
                          onClick={function () { telechargerBulletin(b); }}
                          title="Télécharger le bulletin PDF certifié"
                        >
                          {enCoursTelechargement === b.id ? (
                            <span style={{ color: "var(--azur-500)" }}>PDF...</span>
                          ) : (
                            <>
                              <Download size={14} /> Télécharger
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {/* Visualiseur Modal PDF */}
      <VisualiseurPdfModal
        ouvert={modalPdf.ouvert}
        onFermer={function () { setModalPdf({ ouvert: false, blob: null, nomFichier: "", titreDoc: "" }); }}
        blob={modalPdf.blob}
        nomFichier={modalPdf.nomFichier}
        titreDoc={modalPdf.titreDoc}
      />
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
      setMessage({ type: "succes", texte: "Configuration enregistrée. Les prochains bulletins générés utiliseront ces éléments." });
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  if (statut === "chargement") return <Spinner texte="Chargement..." />;
  if (statut === "refuse" || !donnees) return <Alerte>Impossible de charger la configuration.</Alerte>;

  return (
    <div className="mag-panneau-form react-fade-in" style={{ maxWidth: "620px" }}>
      <div className="mag-stat-label" style={{ marginBottom: "0.4rem" }}>Chef d'établissement &amp; visa</div>
      <p style={{ fontSize: "0.85rem", color: "var(--ink-600)", marginBottom: "1.2rem" }}>
        Signature et cachet apposés sur les bulletins scolaires.
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
              <p style={{ fontSize: "0.8rem", color: "var(--ink-600)", marginBottom: "0.5rem" }}>Aucun cachet importé.</p>
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
              <p style={{ fontSize: "0.8rem", color: "var(--ink-600)", marginBottom: "0.5rem" }}>Aucune signature importée.</p>
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
      <div className="mag-page-title">
        {role === "parent" ? "Bulletins Scolaires" : "Bulletins"}
      </div>

      {estAdmin ? (
        <div style={{ display: "flex", gap: "1.6rem", borderBottom: "1px solid var(--line)", marginBottom: "1.6rem" }}>
          <button
            type="button" onClick={function () { setOnglet("generation"); }}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "0.2rem 0 0.8rem",
              fontWeight: 600, fontSize: "0.92rem",
              color: onglet === "generation" ? "#1E3A8A" : "var(--ink-600)",
              borderBottom: onglet === "generation" ? "3px solid #1E3A8A" : "3px solid transparent",
            }}
          >
            Génération des bulletins
          </button>
          <button
            type="button" onClick={function () { setOnglet("configuration"); }}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "0.2rem 0 0.8rem",
              fontWeight: 600, fontSize: "0.92rem",
              color: onglet === "configuration" ? "#1E3A8A" : "var(--ink-600)",
              borderBottom: onglet === "configuration" ? "3px solid #1E3A8A" : "3px solid transparent",
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
