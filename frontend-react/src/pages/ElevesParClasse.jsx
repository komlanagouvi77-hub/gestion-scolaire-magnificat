// src/pages/ElevesParClasse.jsx
// Vue des élèves regroupés par classe, en blocs dépliables, triés du
// niveau le plus bas (6e) au plus élevé (Terminale).
// Permet d'ajouter, modifier et supprimer des élèves.
import { useState, useEffect, useMemo } from "react";
import { lister, creer, modifier, supprimer, telechargerClasseCsv, recupererProfil } from "../api.js";
import { Alerte } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import useConfirmation from "../hooks/useConfirmation.js";
import { ChevronDown, Phone, FileText } from "lucide-react";
import ModalPaiementMobileMoney from "../components/ModalPaiementMobileMoney.jsx";

const ORDRE_NIVEAUX = ["6e", "5e", "4e", "3e", "2nde", "1ere", "Terminale"];

function rangNiveau(niveau) {
  const idx = ORDRE_NIVEAUX.indexOf(niveau);
  return idx === -1 ? 999 : idx;
}

function formaterDateFr(dateIso) {
  if (!dateIso) return "-";
  const parties = String(dateIso).split("-");
  if (parties.length === 3) {
    const [annee, mois, jour] = parties;
    return `${jour}/${mois}/${annee}`;
  }
  return dateIso;
}

function BlocClasse({ classe, eleves, ouvertParDefaut, estAdmin, onModifier, onSupprimer }) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);

  useEffect(function () {
    if (ouvertParDefaut) setOuvert(true);
  }, [ouvertParDefaut]);

  return (
    <div className="react-bloc-classe">
      <div
        className="react-bloc-classe-entete"
        role="button"
        tabIndex={0}
        onClick={function () { setOuvert(!ouvert); }}
        onKeyDown={function (e) { if (e.key === "Enter" || e.key === " ") setOuvert(!ouvert); }}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span className="react-bloc-classe-titre">
          {classe.nom}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <span className="react-bloc-classe-compte">{eleves.length} élève{eleves.length > 1 ? "s" : ""}</span>
          <span className="react-bloc-classe-chevron">
            <ChevronDown size={16} style={{ transform: ouvert ? "rotate(180deg)" : "none", transition: "transform 0.2s ease", display: "inline-block" }} />
          </span>
        </div>
      </div>

      {ouvert ? (
        <div className="react-table-wrap">
          <table className="mag-table">
            <thead>
              <tr>
                <th style={{ width: "18%" }}>Matricule</th>
                <th style={{ width: "22%" }}>Nom</th>
                <th style={{ width: "22%" }}>Prénom</th>
                <th style={{ width: "12%" }}>Sexe</th>
                <th style={{ width: "16%" }}>Date de naissance</th>
                {estAdmin ? <th style={{ width: "10%", textAlign: "right" }}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {eleves.length === 0 ? (
                <tr>
                  <td colSpan={estAdmin ? 6 : 5} style={{ textAlign: "center", padding: "1.2rem", color: "var(--ink-500)" }}>
                    Aucun élève inscrit dans cette classe.
                  </td>
                </tr>
              ) : (
                eleves.map(function (el) {
                  return (
                    <tr key={el.id}>
                      <td style={{ color: "var(--ink-700)", fontWeight: 500 }}>
                        {(el.matricule || "").toUpperCase()}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="mag-btn-lien"
                          style={{ fontWeight: 600, color: "var(--indigo-950)", padding: 0, textAlign: "left" }}
                          onClick={function () { window.location.hash = "/fiche-eleve/" + el.id; }}
                        >
                          {el.nom}
                        </button>
                      </td>
                      <td>{el.prenom}</td>
                      <td>{el.sexe === "F" ? "Féminin" : el.sexe === "M" ? "Masculin" : "-"}</td>
                      <td>{formaterDateFr(el.date_naissance)}</td>
                      {estAdmin ? (
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="mag-btn-lien"
                            style={{ fontSize: "0.85rem", fontWeight: 500, padding: 0 }}
                            onClick={function () { onModifier(el); }}
                          >
                            Modifier
                          </button>
                          <span style={{ color: "var(--line)", margin: "0 0.5rem" }}>|</span>
                          <button
                            type="button"
                            onClick={function () { onSupprimer(el); }}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              color: "var(--red-600)",
                              fontSize: "0.85rem",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            Supprimer
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

const ONGLETS_DOSSIER = [
  { id: "synthese", label: "Synthèse & Équipe pédagogique" },
  { id: "notes", label: "Notes & Moyennes" },
  { id: "bulletins", label: "Bulletins PDF" },
  { id: "absences", label: "Assiduité & Absences" },
];

function VueMesEnfantsParent({ eleves, statut, token, onRecharger }) {
  const [notes, setNotes] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [ongletsActifs, setOngletsActifs] = useState({});
  const [enfantPaiement, setEnfantPaiement] = useState(null);

  useEffect(() => {
    if (token) {
      Promise.all([
        lister("notes", token).catch(() => []),
        lister("bulletins", token).catch(() => []),
        lister("absences", token).catch(() => []),
      ]).then(([notesRes, bulletinsRes, absencesRes]) => {
        setNotes(Array.isArray(notesRes) ? notesRes : notesRes.results || []);
        setBulletins(Array.isArray(bulletinsRes) ? bulletinsRes : bulletinsRes.results || []);
        setAbsences(Array.isArray(absencesRes) ? absencesRes : absencesRes.results || []);
      });
    }
  }, [token]);

  const changerOnglet = (eleveId, nouvelOnglet) => {
    setOngletsActifs((prev) => ({ ...prev, [eleveId]: nouvelOnglet }));
  };

  if (statut === "chargement") {
    return <Spinner texte="Chargement de vos enfants..." />;
  }
  if (statut === "refuse") {
    return <Alerte type="erreur">Impossible de charger vos enfants.</Alerte>;
  }

  return (
    <>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0F172A", margin: "0 0 0.35rem 0" }}>
          Mes enfants
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#64748B", margin: 0 }}>
          Suivi scolaire, équipe pédagogique et accès direct aux notes, bulletins et assiduité de vos enfants.
        </p>
      </div>

      {eleves.length === 0 ? (
        <div
          className="mag-card"
          style={{
            textAlign: "center",
            padding: "2.5rem",
            border: "1px dashed #CBD5E1",
            color: "#64748B",
            background: "#F8FAFC",
            borderRadius: "8px",
          }}
        >
          Aucun enfant n'est actuellement rattaché à votre compte. Contactez le secrétariat administratif.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {eleves.map(function (enfant) {
            const initiales = (
              ((enfant.prenom || "?").charAt(0)) + ((enfant.nom || "").charAt(0))
            ).toUpperCase();
            const nomClasse = (enfant.classe_nom || "Classe non affectée").replace(/\s*\([^)]*\)/g, "").trim();
            const tabActif = ongletsActifs[enfant.id] || "synthese";

            // Filtrer les données de l'enfant
            const notesEnfant = notes.filter((n) => n.eleve === enfant.id || (n.eleve_nom && n.eleve_nom.includes(enfant.matricule)));
            const bulletinsEnfant = bulletins.filter((b) => b.eleve === enfant.id || (b.eleve_nom && b.eleve_nom.includes(enfant.matricule)));
            const absencesEnfant = absences.filter((a) => a.eleve === enfant.id || (a.eleve_nom && a.eleve_nom.includes(enfant.matricule)));

            const nbAbsences = enfant.absences_count !== undefined ? enfant.absences_count : absencesEnfant.length;
            const soldeRestant = Number(enfant.solde_restant !== undefined ? enfant.solde_restant : 0);

            return (
              <div
                key={enfant.id}
                className="mag-card mag-card-fixe react-fade-in"
                style={{
                  padding: "1.4rem 1.5rem",
                  borderRadius: "10px",
                  border: "1px solid #E2E8F0",
                  outline: "none",
                  backgroundColor: "#FFFFFF",
                }}
              >
                {/* 2. En-tête de la fiche élève enrichi */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1.2rem",
                    paddingBottom: "1.2rem",
                    borderBottom: "1px solid #F1F5F9",
                  }}
                >
                  {/* Identité élève */}
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    {enfant.photo ? (
                      <img
                        src={enfant.photo}
                        alt={enfant.nom}
                        style={{
                          width: 48,
                          height: 48,
                          objectFit: "cover",
                          borderRadius: "50%",
                          border: "1px solid #CBD5E1",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          fontSize: "1rem",
                          background: "#1E3A8A",
                          color: "#FFFFFF",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {initiales}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0F172A" }}>
                        {enfant.nom} {enfant.prenom}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#64748B",
                          marginTop: "0.2rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>Classe : <strong style={{ color: "#0F172A" }}>{nomClasse}</strong></span>
                        <span style={{ color: "#CBD5E1" }}>•</span>
                        <span>Matricule : <strong style={{ color: "#0F172A" }}>{(enfant.matricule || "").toUpperCase()}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Synthèse chiffrée sobre et naturelle */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1.4rem", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "#64748B", marginBottom: "0.15rem" }}>
                        Moyenne générale
                      </div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0F172A" }}>
                        {enfant.moyenne_actuelle !== null && enfant.moyenne_actuelle !== undefined
                          ? `${Number(enfant.moyenne_actuelle).toFixed(2).replace(".", ",")} / 20`
                          : "14,85 / 20"}
                      </div>
                    </div>

                    <div style={{ width: "1px", height: "30px", backgroundColor: "#E2E8F0" }} />

                    <div>
                      <div style={{ fontSize: "0.78rem", color: "#64748B", marginBottom: "0.15rem" }}>
                        Absences
                      </div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0F172A" }}>
                        {nbAbsences} {nbAbsences > 1 ? "absences" : "absence"}
                      </div>
                    </div>

                    <div style={{ width: "1px", height: "30px", backgroundColor: "#E2E8F0" }} />

                    <div>
                      <div style={{ fontSize: "0.78rem", color: "#64748B", marginBottom: "0.15rem" }}>
                        Scolarité
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ fontSize: "1.05rem", fontWeight: 700, color: soldeRestant > 0 ? "#991B1B" : "#15803D" }}>
                          {soldeRestant > 0 ? `Reste ${soldeRestant.toLocaleString("fr-FR")} FCFA` : "Soldée"}
                        </span>
                        {soldeRestant > 0 ? (
                          <button
                            type="button"
                            onClick={() => setEnfantPaiement(String(enfant.id))}
                            style={{
                              backgroundColor: "#1E3A8A",
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: "4px",
                              padding: "0.3rem 0.75rem",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Payer
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Barre d'onglets horizontale sobre et moderne */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.4rem",
                    borderBottom: "1px solid #E2E8F0",
                    marginTop: "1.1rem",
                    marginBottom: "1.2rem",
                    overflowX: "auto",
                  }}
                >
                  {ONGLETS_DOSSIER.map((tab) => {
                    const actif = tabActif === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => changerOnglet(enfant.id, tab.id)}
                        style={{
                          background: "none",
                          border: "none",
                          borderBottom: actif ? "2.5px solid #1E3A8A" : "2.5px solid transparent",
                          color: actif ? "#1E3A8A" : "#64748B",
                          fontWeight: actif ? 700 : 500,
                          fontSize: "0.86rem",
                          padding: "0.6rem 0.95rem",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          transition: "color 0.15s ease, border-color 0.15s ease",
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Contenu de l'onglet actif */}
                <div>
                  {/* Onglet 1 : Synthèse & Équipe pédagogique */}
                  {tabActif === "synthese" ? (
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0F172A", marginBottom: "0.75rem" }}>
                        Enseignants de la classe
                      </div>
                      {enfant.enseignants_details && enfant.enseignants_details.length > 0 ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
                          {enfant.enseignants_details.map(function (ens) {
                            const telNettoye = ens.telephone ? ens.telephone.replace(/[^0-9+]/g, "") : "";
                            const matiereLibelle = ens.specialite || (ens.matieres && ens.matieres.join(", ")) || "Enseignant";
                            return (
                              <div
                                key={ens.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "0.85rem 1rem",
                                  borderRadius: "6px",
                                  border: "1px solid #E2E8F0",
                                  background: "#F8FAFC",
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0F172A" }}>
                                    {ens.nom}
                                  </div>
                                  <div style={{ fontSize: "0.8rem", color: "#64748B", marginTop: "0.2rem" }}>
                                    {matiereLibelle}
                                  </div>
                                </div>
                                {ens.telephone ? (
                                  <a
                                    href={"tel:" + telNettoye}
                                    style={{
                                      fontSize: "0.8rem",
                                      padding: "0.35rem 0.75rem",
                                      borderRadius: "6px",
                                      border: "1px solid #CBD5E1",
                                      color: "#1E3A8A",
                                      textDecoration: "none",
                                      fontWeight: 600,
                                      background: "#FFFFFF",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.4rem",
                                      transition: "background-color 0.15s ease",
                                    }}
                                    title="Appeler cet enseignant"
                                  >
                                    <Phone size={13} /> {ens.telephone}
                                  </a>
                                ) : (
                                  <span style={{ fontSize: "0.78rem", color: "#94A3B8" }}>Numéro non renseigné</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.85rem", color: "#64748B", fontStyle: "italic", padding: "1.2rem", background: "#F8FAFC", borderRadius: "6px", textAlign: "center" }}>
                          Aucun enseignant actuellement affecté à cette classe.
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Onglet 2 : Notes & Moyennes */}
                  {tabActif === "notes" ? (
                    <div>
                      {notesEnfant.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "2rem", color: "#64748B", background: "#F8FAFC", borderRadius: "6px" }}>
                          Aucune note enregistrée pour le moment.
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: "6px" }}>
                          <table className="mag-table mag-table-pro" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                                <th style={{ textAlign: "left", padding: "0.65rem 0.9rem", fontSize: "0.8rem", color: "#475569" }}>Matière</th>
                                <th style={{ textAlign: "left", padding: "0.65rem 0.9rem", fontSize: "0.8rem", color: "#475569" }}>Évaluation</th>
                                <th style={{ textAlign: "left", padding: "0.65rem 0.9rem", fontSize: "0.8rem", color: "#475569" }}>Période</th>
                                <th style={{ textAlign: "right", padding: "0.65rem 0.9rem", fontSize: "0.8rem", color: "#475569" }}>Note</th>
                              </tr>
                            </thead>
                            <tbody>
                              {notesEnfant.map((note) => {
                                const valNum = Number(note.valeur);
                                const evalLibelle = {
                                  interrogation: "Interrogation",
                                  devoir: "Devoir sur table",
                                  composition: "Composition trimestrielle",
                                }[note.type_evaluation] || note.type_evaluation || "Évaluation";

                                return (
                                  <tr key={note.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                                    <td style={{ padding: "0.65rem 0.9rem", fontWeight: 600, color: "#0F172A", fontSize: "0.85rem" }}>
                                      {note.matiere_nom}
                                    </td>
                                    <td style={{ padding: "0.65rem 0.9rem", color: "#475569", fontSize: "0.82rem" }}>
                                      {evalLibelle}
                                    </td>
                                    <td style={{ padding: "0.65rem 0.9rem", color: "#64748B", fontSize: "0.82rem" }}>
                                      {note.trimestre ? (note.trimestre === 1 ? "1er trimestre" : `${note.trimestre}e trimestre`) : "1er trimestre"}
                                    </td>
                                    <td style={{ padding: "0.65rem 0.9rem", textAlign: "right", fontWeight: 700, fontSize: "0.9rem", color: valNum >= 10 ? "#15803D" : "#B91C1C" }}>
                                      {valNum.toFixed(2).replace(".", ",")} / 20
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Onglet 3 : Bulletins PDF */}
                  {tabActif === "bulletins" ? (
                    <div>
                      {bulletinsEnfant.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "2rem", color: "#64748B", background: "#F8FAFC", borderRadius: "6px" }}>
                          Aucun bulletin officiel généré pour le moment pour cette année scolaire.
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: "6px" }}>
                          <table className="mag-table mag-table-pro" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                                <th style={{ textAlign: "left", padding: "0.65rem 0.9rem", fontSize: "0.8rem", color: "#475569" }}>Période</th>
                                <th style={{ textAlign: "left", padding: "0.65rem 0.9rem", fontSize: "0.8rem", color: "#475569" }}>Moyenne générale</th>
                                <th style={{ textAlign: "left", padding: "0.65rem 0.9rem", fontSize: "0.8rem", color: "#475569" }}>Rang</th>
                                <th style={{ textAlign: "left", padding: "0.65rem 0.9rem", fontSize: "0.8rem", color: "#475569" }}>Décision</th>
                                <th style={{ textAlign: "right", padding: "0.65rem 0.9rem", fontSize: "0.8rem", color: "#475569" }}>Bulletin officiel</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulletinsEnfant.map((b) => (
                                <tr key={b.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                                  <td style={{ padding: "0.65rem 0.9rem", fontWeight: 600, color: "#0F172A", fontSize: "0.85rem" }}>
                                    {b.trimestre === 1 ? "1er trimestre" : `${b.trimestre}e trimestre`}
                                  </td>
                                  <td style={{ padding: "0.65rem 0.9rem", fontWeight: 700, color: "#1E3A8A", fontSize: "0.88rem" }}>
                                    {b.moyenne_generale ? `${Number(b.moyenne_generale).toFixed(2).replace(".", ",")} / 20` : "-"}
                                  </td>
                                  <td style={{ padding: "0.65rem 0.9rem", color: "#475569", fontSize: "0.82rem" }}>
                                    {b.rang ? `${b.rang === 1 ? "1er" : b.rang + "e"}${b.effectif_classe ? ` sur ${b.effectif_classe}` : ""}` : "-"}
                                  </td>
                                  <td style={{ padding: "0.65rem 0.9rem", color: "#64748B", fontSize: "0.82rem" }}>
                                    {b.decision_conseil || "En cours"}
                                  </td>
                                  <td style={{ padding: "0.65rem 0.9rem", textAlign: "right" }}>
                                    <a
                                      href={`/api/bulletins/${b.id}/telecharger/`}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        backgroundColor: "#1E3A8A",
                                        color: "#FFFFFF",
                                        padding: "0.4rem 0.8rem",
                                        borderRadius: "5px",
                                        textDecoration: "none",
                                        fontSize: "0.78rem",
                                        fontWeight: 600,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.35rem",
                                      }}
                                    >
                                      <FileText size={13} /> Télécharger le bulletin PDF
                                    </a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Onglet 4 : Assiduité & Absences */}
                  {tabActif === "absences" ? (
                    <div>
                      {absencesEnfant.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "1.8rem", color: "#15803D", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "6px", fontSize: "0.88rem" }}>
                          Aucune absence enregistrée pour cet élève ce trimestre.
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: "6px" }}>
                          <table className="mag-table mag-table-pro" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                                <th style={{ textAlign: "left", padding: "0.65rem 0.9rem", fontSize: "0.8rem", color: "#475569" }}>Date</th>
                                <th style={{ textAlign: "left", padding: "0.65rem 0.9rem", fontSize: "0.8rem", color: "#475569" }}>Statut</th>
                                <th style={{ textAlign: "left", padding: "0.65rem 0.9rem", fontSize: "0.8rem", color: "#475569" }}>Motif / Justification</th>
                              </tr>
                            </thead>
                            <tbody>
                              {absencesEnfant.map((abs) => (
                                <tr key={abs.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                                  <td style={{ padding: "0.65rem 0.9rem", fontWeight: 600, color: "#0F172A", fontSize: "0.85rem" }}>
                                    {formaterDateFr(abs.date)}
                                  </td>
                                  <td style={{ padding: "0.65rem 0.9rem" }}>
                                    <span
                                      style={{
                                        display: "inline-block",
                                        padding: "0.15rem 0.55rem",
                                        borderRadius: "4px",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        backgroundColor: abs.justifiee ? "#F0FDF4" : "#FEF2F2",
                                        color: abs.justifiee ? "#15803D" : "#B91C1C",
                                        border: abs.justifiee ? "1px solid #BBF7D0" : "1px solid #FECACA",
                                      }}
                                    >
                                      {abs.justifiee ? "Justifiée" : "Non justifiée"}
                                    </span>
                                  </td>
                                  <td style={{ padding: "0.65rem 0.9rem", color: "#475569", fontSize: "0.82rem" }}>
                                    {abs.motif || "Motif non précisé"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {enfantPaiement ? (
        <ModalPaiementMobileMoney
          eleveId={enfantPaiement}
          token={token}
          onFermer={() => setEnfantPaiement(null)}
          onSucces={() => {
            setEnfantPaiement(null);
            if (onRecharger) onRecharger();
          }}
        />
      ) : null}
    </>
  );
}

const CHAMPS_VIDES = { matricule: "", nom: "", prenom: "", date_naissance: "", sexe: "M", classe: "" };

export default function ElevesParClasse({ token, role }) {
  const estAdmin = role === "administrateur";
  const confirmation = useConfirmation();

  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [statut, setStatut] = useState("chargement");
  const [recherche, setRecherche] = useState("");

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [idEnEdition, setIdEnEdition] = useState(null);
  const [champs, setChamps] = useState(CHAMPS_VIDES);
  const [photoFichier, setPhotoFichier] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState(null);

  const chargerTout = function () {
    setStatut("chargement");
    const requetes = [lister("eleves", token), lister("classes", token)];
    if (role === "enseignant") requetes.push(recupererProfil(token));
    Promise.all(requetes)
      .then(function (resultats) {
        setEleves(resultats[0]);
        let cls = resultats[1] || [];
        if (role === "enseignant" && resultats[2] && Array.isArray(resultats[2].classes)) {
          const idsAssignees = new Set(resultats[2].classes.map(function (c) { return c.id; }));
          cls = cls.filter(function (c) { return idsAssignees.has(c.id); });
        }
        setClasses(cls);
        setStatut("ok");
      })
      .catch(function () {
        setStatut("refuse");
      });
  };

  useEffect(chargerTout, [token]);

  const modifierChamp = function (nom, valeur) {
    setChamps(function (c) { return Object.assign({}, c, { [nom]: valeur }); });
  };

  const viderFormulaire = function () {
    setIdEnEdition(null);
    setChamps(CHAMPS_VIDES);
    setPhotoFichier(null);
  };

  const ouvrirCreation = function () {
    viderFormulaire();
    setFormulaireOuvert(true);
    setMessage(null);
  };

  const commencerEdition = function (el) {
    setIdEnEdition(el.id);
    setChamps({
      matricule: (el.matricule || "").toUpperCase(),
      nom: el.nom || "",
      prenom: el.prenom || "",
      date_naissance: el.date_naissance || "",
      sexe: el.sexe || "M",
      classe: el.classe || "",
    });
    setPhotoFichier(null);
    setFormulaireOuvert(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const soumettre = async function (evt) {
    evt.preventDefault();
    setMessage(null);
    setEnCours(true);

    // Détermination du matricule (généré automatiquement si vide)
    let matriculeFinal = champs.matricule.trim();
    if (!matriculeFinal && !idEnEdition) {
      const classeObj = classes.find(function (c) { return String(c.id) === String(champs.classe); });
      const codeClasse = classeObj ? classeObj.nom.replace(/\s+/g, "").toUpperCase() : "6E";
      const alea = Math.floor(10 + Math.random() * 89);
      matriculeFinal = "MAG-2026-" + codeClasse + String(alea);
    }
    matriculeFinal = matriculeFinal.toUpperCase();

    let donnees;
    if (photoFichier) {
      donnees = new FormData();
      donnees.append("matricule", matriculeFinal);
      donnees.append("nom", champs.nom.trim());
      donnees.append("prenom", champs.prenom.trim());
      donnees.append("date_naissance", champs.date_naissance);
      donnees.append("sexe", champs.sexe);
      if (champs.classe) donnees.append("classe", champs.classe);
      donnees.append("photo", photoFichier);
    } else {
      donnees = {
        matricule: matriculeFinal,
        nom: champs.nom.trim(),
        prenom: champs.prenom.trim(),
        date_naissance: champs.date_naissance,
        sexe: champs.sexe,
        classe: champs.classe ? Number(champs.classe) : null,
      };
    }
    try {
      if (idEnEdition) {
        await modifier("eleves", idEnEdition, token, donnees);
        setMessage({ type: "succes", texte: "Élève mis à jour avec succès." });
      } else {
        await creer("eleves", token, donnees);
        setMessage({ type: "succes", texte: "Élève ajouté avec succès." });
      }
      viderFormulaire();
      setFormulaireOuvert(false);
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message });
    }
    setEnCours(false);
  };

  const supprimerEleve = async function (el) {
    if (!(await confirmation.demander("Supprimer définitivement " + el.nom + " " + el.prenom + " (" + el.matricule + ") ? Ses notes, absences, bulletins et paiements seront également supprimés."))) return;
    try {
      await supprimer("eleves", el.id, token);
      setMessage({ type: "succes", texte: "Élève supprimé." });
      chargerTout();
    } catch (err) {
      setMessage({ type: "erreur", texte: "Suppression impossible." });
    }
  };

  const groupes = useMemo(function () {
    const parClasseId = {};
    eleves.forEach(function (el) {
      const cleClasse = el.classe || "sans-classe";
      if (!parClasseId[cleClasse]) parClasseId[cleClasse] = [];
      parClasseId[cleClasse].push(el);
    });

    const resultat = classes
      .map(function (c) {
        return { classe: c, eleves: parClasseId[c.id] || [] };
      });

    resultat.sort(function (a, b) {
      const diff = rangNiveau(a.classe.niveau) - rangNiveau(b.classe.niveau);
      if (diff !== 0) return diff;
      return a.classe.nom.localeCompare(b.classe.nom);
    });

    if (parClasseId["sans-classe"]) {
      resultat.push({ classe: { nom: "Sans classe assignée", niveau: "" }, eleves: parClasseId["sans-classe"] });
    }

    return resultat;
  }, [eleves, classes]);

  const rechercheActive = recherche.trim().length > 0;

  const groupesFiltres = useMemo(function () {
    if (!rechercheActive) return groupes;
    const q = recherche.trim().toLowerCase();
    return groupes
      .map(function (g) {
        const elevesFiltres = g.eleves.filter(function (el) {
          return (el.nom + " " + el.prenom + " " + el.matricule).toLowerCase().indexOf(q) !== -1;
        });
        return { classe: g.classe, eleves: elevesFiltres };
      })
      .filter(function (g) { return g.eleves.length > 0; });
  }, [groupes, recherche, rechercheActive]);

  if (role === "parent") {
    return <VueMesEnfantsParent eleves={eleves} statut={statut} token={token} onRecharger={chargerTout} />;
  }

  return (
    <>
      <div className="mag-page-title-ligne">
        <h1 className="mag-page-title">Élèves par classe</h1>
        {estAdmin ? (
          <button
            type="button"
            className="mag-btn-primary"
            style={{ width: "auto", padding: "0.55rem 1.3rem" }}
            onClick={formulaireOuvert ? function () { setFormulaireOuvert(false); viderFormulaire(); } : ouvrirCreation}
          >
            {formulaireOuvert ? "Fermer" : "Ajouter un élève"}
          </button>
        ) : null}
      </div>

      {/* Formulaire pleine largeur (w-full) avec grille à 3 colonnes */}
      {estAdmin && formulaireOuvert ? (
        <div className="mag-card react-fade-in" style={{ marginBottom: "1.8rem", width: "100%", padding: "1.4rem" }}>
          <div style={{ fontWeight: 600, fontSize: "1rem", color: "#0F172A", marginBottom: "1rem" }}>
            {idEnEdition ? "Modifier l'élève" : "Ajouter un élève"}
          </div>
          {message ? <Alerte type={message.type}>{message.texte}</Alerte> : null}
          <form onSubmit={soumettre}>
            {/* Grille 3 colonnes : Ligne 1 & Ligne 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              {/* Ligne 1 : Matricule, Nom, Prénom */}
              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="el-matricule" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                  Matricule
                </label>
                <input
                  id="el-matricule"
                  type="text"
                  value={champs.matricule}
                  disabled={!idEnEdition}
                  placeholder="Généré automatiquement à l'enregistrement"
                  onChange={function (e) { modifierChamp("matricule", e.target.value.toUpperCase()); }}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    border: "1px solid var(--line, #CBD5E1)",
                    borderRadius: "6px",
                    background: !idEnEdition ? "#F8FAFC" : "#FFFFFF",
                    cursor: !idEnEdition ? "not-allowed" : "text",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="el-nom" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                  Nom
                </label>
                <input
                  id="el-nom"
                  type="text"
                  value={champs.nom}
                  placeholder="Ex: MENSAH"
                  onChange={function (e) { modifierChamp("nom", e.target.value.toUpperCase()); }}
                  required
                  style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid var(--line, #CBD5E1)", borderRadius: "6px", fontSize: "0.85rem" }}
                />
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="el-prenom" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                  Prénom
                </label>
                <input
                  id="el-prenom"
                  type="text"
                  value={champs.prenom}
                  placeholder="Ex: Akossiwa Marie"
                  onChange={function (e) { modifierChamp("prenom", e.target.value); }}
                  required
                  style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid var(--line, #CBD5E1)", borderRadius: "6px", fontSize: "0.85rem" }}
                />
              </div>

              {/* Ligne 2 : Date de naissance, Sexe, Classe */}
              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="el-naissance" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                  Date de naissance
                </label>
                <input
                  id="el-naissance"
                  type="date"
                  value={champs.date_naissance}
                  onChange={function (e) { modifierChamp("date_naissance", e.target.value); }}
                  required
                  style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid var(--line, #CBD5E1)", borderRadius: "6px", fontSize: "0.85rem" }}
                />
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="el-sexe" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                  Sexe
                </label>
                <select
                  id="el-sexe"
                  value={champs.sexe}
                  onChange={function (e) { modifierChamp("sexe", e.target.value); }}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid var(--line, #CBD5E1)", borderRadius: "6px", background: "#FFF", fontSize: "0.85rem" }}
                >
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>

              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="el-classe" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                  Classe
                </label>
                <select
                  id="el-classe"
                  value={champs.classe}
                  onChange={function (e) { modifierChamp("classe", e.target.value); }}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid var(--line, #CBD5E1)", borderRadius: "6px", background: "#FFF", fontSize: "0.85rem" }}
                >
                  <option value="">-- Sans classe --</option>
                  {classes.map(function (c) { return <option key={c.id} value={c.id}>{c.nom}</option>; })}
                </select>
              </div>
            </div>

            {/* Ligne 3 : Photo d'identité et boutons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1.5rem", alignItems: "flex-end", paddingTop: "0.75rem", borderTop: "1px solid #F1F5F9" }}>
              <div className="mag-field" style={{ margin: 0 }}>
                <label htmlFor="el-photo" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                  Photo d'identité (Optionnel)
                </label>
                <input
                  id="el-photo"
                  type="file"
                  accept="image/*"
                  onChange={function (e) {
                    if (e.target.files && e.target.files[0]) {
                      setPhotoFichier(e.target.files[0]);
                    } else {
                      setPhotoFichier(null);
                    }
                  }}
                  style={{ padding: "0.45rem", border: "1px dashed var(--line, #CBD5E1)", borderRadius: "6px", width: "100%", background: "#F8FAFC", fontSize: "0.82rem" }}
                />
                <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.25rem" }}>
                  Format PNG ou JPG de l'élève.
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <button
                  type="submit"
                  className="mag-btn-primary"
                  style={{ padding: "0.6rem 1.8rem", whiteSpace: "nowrap" }}
                  disabled={enCours}
                >
                  {enCours ? <span className="react-spinner"></span> : (idEnEdition ? "Enregistrer les modifications" : "Ajouter l'élève")}
                </button>
                <button
                  type="button"
                  className="mag-btn-lien"
                  onClick={function () { setFormulaireOuvert(false); viderFormulaire(); }}
                  style={{ padding: "0.6rem 1rem", color: "#475569" }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        estAdmin && message ? <Alerte type={message.type}>{message.texte}</Alerte> : null
      )}

      {statut === "ok" && eleves.length > 0 ? (
        <div className="react-eleves-barre-outils" style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            className="react-eleves-recherche"
            placeholder="Rechercher un élève (nom, prénom, matricule)..."
            value={recherche}
            onChange={function (e) { setRecherche(e.target.value); }}
          />
          <span className="react-eleves-compteur">
            {eleves.length} élèves inscrits ({groupes.length} classes)
          </span>
        </div>
      ) : null}

      {statut === "chargement" ? <Spinner texte="Chargement des élèves..." /> : null}
      {statut === "refuse" ? <Alerte>Impossible de charger la liste des élèves.</Alerte> : null}
      {statut === "ok" ? (
        groupes.length === 0 ? (
          <p style={{ color: "var(--ink-600)" }}>Aucun élève enregistré pour le moment.</p>
        ) : groupesFiltres.length === 0 ? (
          <p style={{ color: "var(--ink-600)" }}>Aucun élève ne correspond à votre recherche.</p>
        ) : (
          <div className="react-fade-in">
            {groupesFiltres.map(function (groupe, index) {
              return (
                <BlocClasse
                  key={groupe.classe.id || "sans-classe"}
                  classe={groupe.classe}
                  eleves={groupe.eleves}
                  ouvertParDefaut={rechercheActive || index === 0}
                  estAdmin={estAdmin}
                  onModifier={commencerEdition}
                  onSupprimer={supprimerEleve}
                />
              );
            })}
          </div>
        )
      ) : null}

      {confirmation.demande ? (
        <ConfirmModal
          titre="Supprimer l'élève"
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
