import { useState, useEffect, useMemo } from "react";
import { lister, obtenirStatistiquesGlobales, recupererProfil } from "../api.js";
import { CarteStat, GraphiqueBarres } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import { traduireTexte, localeActive } from "../localisation.js";
import ModalPaiementMobileMoney from "../components/ModalPaiementMobileMoney.jsx";
import { Smartphone } from "lucide-react";

function useListe(ressource, token) {
  const [donnees, setDonnees] = useState([]);
  const [chargement, setChargement] = useState(!!ressource);
  useEffect(function () {
    if (!ressource) { setDonnees([]); setChargement(false); return undefined; }
    let annule = false;
    setChargement(true);
    lister(ressource, token)
      .then(function (d) { if (!annule) { setDonnees(d); setChargement(false); } })
      .catch(function () { if (!annule) { setDonnees([]); setChargement(false); } });
    return function () { annule = true; };
  }, [ressource, token]);
  return { donnees: donnees, chargement: chargement };
}

function formaterDateCourte(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

function CarteMesEnfants({ eleves, onPayer }) {
  return (
    <div
      className="mag-card mag-card-fixe react-fade-in"
      style={{
        padding: "1.25rem",
        border: "1px solid #E2E8F0",
        outline: "none",
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0F172A", marginBottom: "0.9rem" }}>
        Mes enfants
      </div>
      {eleves.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#64748B", margin: 0 }}>
          Aucun enfant rattaché à votre compte pour le moment.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {eleves.map(function (e) {
            const initiales = (
              ((e.prenom || "?").charAt(0)) + ((e.nom || "").charAt(0))
            ).toUpperCase();
            const nomClasseSansAnnee = (e.classe_nom || "Classe non assignée").replace(/\s*\([^)]*\)/g, "").trim();
            const aMoyenne = e.moyenne_actuelle !== null && e.moyenne_actuelle !== undefined;
            const aSolde = e.solde_restant !== null && e.solde_restant !== undefined;

            return (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.85rem",
                  padding: "0.85rem 1rem",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: "220px" }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "#1E3A8A",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      flexShrink: 0,
                    }}
                  >
                    {initiales}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0F172A", fontSize: "0.92rem" }}>
                      {e.prenom} {e.nom}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.15rem" }}>
                      {nomClasseSansAnnee} • {e.matricule || ("MAG-" + e.id)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  {aMoyenne ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        background: "#EFF6FF",
                        color: "#1E40AF",
                        border: "1px solid #BFDBFE",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "4px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Moyenne : {Number(e.moyenne_actuelle).toFixed(2).replace(".", ",")} / 20
                    </span>
                  ) : null}

                  {aSolde ? (
                    e.solde_restant > 0 ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          background: "#FFFBEB",
                          color: "#B45309",
                          border: "1px solid #FDE68A",
                          padding: "0.25rem 0.65rem",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Reste à payer : {e.solde_restant.toLocaleString(localeActive())} FCFA
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          background: "#F0FDF4",
                          color: "#15803D",
                          border: "1px solid #BBF7D0",
                          padding: "0.25rem 0.65rem",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Scolarité soldée
                      </span>
                    )
                  ) : null}

                  {onPayer ? (
                    <button
                      type="button"
                      onClick={function () { onPayer(String(e.id)); }}
                      style={{
                        backgroundColor: "#1E3A8A",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "6px",
                        padding: "0.45rem 0.9rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Smartphone size={14} /> Payer la scolarité
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const JOURS_SEMAINE = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const LIBELLES_JOUR = { lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi", jeudi: "Jeudi", vendredi: "Vendredi", samedi: "Samedi", dimanche: "Dimanche" };

function minutesDepuisMinuit(heure) {
  const parties = heure.split(":");
  return Number(parties[0]) * 60 + Number(parties[1]);
}

function prochainsCreneaux(cours, limite) {
  const maintenant = new Date();
  const jourActuel = maintenant.getDay();
  const minuteActuelle = maintenant.getHours() * 60 + maintenant.getMinutes();

  return cours
    .map(function (c) {
      let decalage = (JOURS_SEMAINE.indexOf(c.jour) - jourActuel + 7) % 7;
      if (decalage === 0 && minutesDepuisMinuit(c.heure_debut) < minuteActuelle) decalage = 7;
      return Object.assign({}, c, { decalage: decalage });
    })
    .sort(function (a, b) {
      if (a.decalage !== b.decalage) return a.decalage - b.decalage;
      return a.heure_debut.localeCompare(b.heure_debut);
    })
    .slice(0, limite);
}

function libelleJourRelatif(decalage, jour) {
  if (decalage === 0) return "Aujourd'hui";
  if (decalage === 1) return "Demain";
  return traduireTexte(LIBELLES_JOUR[jour] || jour);
}

function CarteProchainsCours({ cours, role }) {
  const prochains = useMemo(function () { return prochainsCreneaux(cours, 4); }, [cours]);
  return (
    <div
      className="mag-card mag-card-fixe react-fade-in"
      style={{
        padding: "1.25rem",
        border: "1px solid #E2E8F0",
        outline: "none",
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0F172A", marginBottom: "0.8rem" }}>
        Prochains cours
      </div>
      {prochains.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--ink-600)", margin: 0 }}>
          Aucun cours planifié pour le moment.
        </p>
      ) : (
        <ul className="react-prochains-cours">
          {prochains.map(function (c) {
            const nomClasseSansAnnee = (c.classe_nom || "").replace(/\s*\([^)]*\)/g, "").trim();
            const salleTexte = c.salle ? "Salle " + c.salle.replace(/^salle\s*/i, "") : null;
            const enseignantTexte = role !== "enseignant" ? c.enseignant_nom : null;
            const morceauxDetails = [nomClasseSansAnnee, salleTexte, enseignantTexte].filter(Boolean);

            return (
              <li key={c.id}>
                <span className="react-prochain-jour">{libelleJourRelatif(c.decalage, c.jour)}</span>
                <span className="react-prochain-heure">{c.heure_debut.slice(0, 5)} – {c.heure_fin.slice(0, 5)}</span>
                <span className="react-prochain-matiere">{c.matiere_nom}</span>
                <span className="react-prochain-details">
                  {morceauxDetails.join(" • ")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard({ token, role, utilisateur, parametres }) {
  const estAdmin = role === "administrateur";
  const estEnseignant = role === "enseignant";
  const estParent = role === "parent";
  const affichePaiements = role !== "enseignant";

  const eleves = useListe("eleves", token);
  const classes = useListe(estAdmin ? "classes" : null, token);
  const absences = useListe("absences", token);
  const paiements = useListe(affichePaiements ? "paiements" : null, token);
  const cours = useListe((estEnseignant || estParent) ? "cours" : null, token);
  const [statsGlobales, setStatsGlobales] = useState(null);
  const [enfantMobileMoney, setEnfantMobileMoney] = useState(null);
  const [profilUtilisateur, setProfilUtilisateur] = useState(null);

  useEffect(function () {
    if (token) {
      recupererProfil(token).then(setProfilUtilisateur).catch(function () {});
    }
  }, [token]);

  const classesAssignees = useMemo(function () {
    if (estEnseignant && profilUtilisateur && Array.isArray(profilUtilisateur.classes)) {
      return profilUtilisateur.classes;
    }
    return [];
  }, [estEnseignant, profilUtilisateur]);

  useEffect(function () {
    if (estAdmin && token) {
      obtenirStatistiquesGlobales(token)
        .then(function (data) { setStatsGlobales(data); })
        .catch(function () {});
    }
  }, [estAdmin, token]);

  const chargementGlobal = eleves.chargement || classes.chargement || absences.chargement || paiements.chargement || cours.chargement;

  const repartitionParClasse = useMemo(function () {
    const compteurs = {};
    if (estEnseignant && classesAssignees.length > 0) {
      classesAssignees.forEach(function (c) {
        const nomCourt = (c.nom || "").split(" (")[0];
        if (nomCourt) compteurs[nomCourt] = 0;
      });
    }
    eleves.donnees.forEach(function (el) {
      const cle = (el.classe_nom || "Sans classe").split(" (")[0];
      compteurs[cle] = (compteurs[cle] || 0) + 1;
    });
    return Object.entries(compteurs)
      .map(function (entree) { return { label: entree[0], valeur: entree[1] }; })
      .sort(function (a, b) { return a.label.localeCompare(b.label); });
  }, [eleves.donnees, estEnseignant, classesAssignees]);

  const repartitionGenre = useMemo(function () {
    let filles = 0, garcons = 0;
    eleves.donnees.forEach(function (el) {
      if (el.sexe === "F") filles += 1;
      else if (el.sexe === "M") garcons += 1;
    });
    const total = filles + garcons;
    const pctFilles = total > 0 ? Math.round((filles / total) * 100) : 0;
    const pctGarcons = total > 0 ? Math.round((garcons / total) * 100) : 0;
    return { filles, garcons, total, pctFilles, pctGarcons };
  }, [eleves.donnees]);

  const totalRecouvre = useMemo(function () {
    return paiements.donnees.reduce(function (somme, p) { return somme + Number(p.montant || 0); }, 0);
  }, [paiements.donnees]);

  const mapEleveClasse = useMemo(function () {
    const map = {};
    eleves.donnees.forEach(function (e) {
      map[e.id] = (e.classe_nom || "").split(" (")[0];
    });
    return map;
  }, [eleves.donnees]);

  const derniersPaiements = useMemo(function () {
    return [...paiements.donnees]
      .sort(function (a, b) {
        const da = a.date_paiement ? new Date(a.date_paiement).getTime() : 0;
        const db = b.date_paiement ? new Date(b.date_paiement).getTime() : 0;
        if (db !== da) return db - da;
        return Number(b.id || 0) - Number(a.id || 0);
      })
      .slice(0, 5);
  }, [paiements.donnees]);

  const dateDuJour = useMemo(function () {
    try {
      const d = new Date();
      const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
      const s = d.toLocaleDateString("fr-FR", options);
      return s.charAt(0).toUpperCase() + s.slice(1);
    } catch (e) {
      return "";
    }
  }, []);

  const finances = statsGlobales ? statsGlobales.finances : null;
  const montantPrevu = finances && finances.total_prevu ? Number(finances.total_prevu) : (eleves.donnees.length * 60000 || 1440000);
  const montantRecouvre = totalRecouvre || (finances ? Number(finances.total_encaisse) : 0);
  const soldeRestant = finances && finances.solde_restant ? Number(finances.solde_restant) : Math.max(0, montantPrevu - montantRecouvre);
  const tauxPct = montantPrevu > 0 ? ((montantRecouvre / montantPrevu) * 100).toFixed(1).replace(".", ",") : "0,0";

  return (
    <>
      {/* En-tête sobre et naturel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.2rem", paddingBottom: "0.8rem", borderBottom: "1px solid #E2E8F0" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            {traduireTexte("Tableau de bord")}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#64748B", margin: "0.2rem 0 0 0" }}>
            {estParent
              ? "Suivi scolaire et financier de vos enfants"
              : traduireTexte("Vue d'ensemble de l'établissement")}
          </p>
        </div>
        <div style={{ fontSize: "0.82rem", color: "#64748B", fontWeight: 500 }}>
          {dateDuJour}
        </div>
      </div>

      {chargementGlobal ? <Spinner texte="Chargement des données..." /> : (
        <>
          {/* Ligne 1 : 4 cartes simples, sobres, uniformes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.2rem" }}>
            {estAdmin ? (
              <>
                <CarteStat
                  label="Élèves inscrits"
                  valeur={eleves.donnees.length}
                  sousTexte="Effectif total"
                  lien="eleves"
                />
                <CarteStat
                  label="Classes"
                  valeur={classes.donnees.length}
                  sousTexte="Classes actives"
                  lien="classes-gestion"
                />
                <CarteStat
                  label="Absences"
                  valeur={absences.donnees.length}
                  sousTexte="Absences enregistrées"
                  lien="absences"
                />
                <CarteStat
                  label="Frais encaissés"
                  valeur={montantRecouvre.toLocaleString(localeActive()) + " FCFA"}
                  sousTexte={paiements.donnees.length + " paiements"}
                  lien="paiements-gestion"
                />
              </>
            ) : estEnseignant ? (
              <>
                <CarteStat
                  label="Mes élèves"
                  valeur={eleves.donnees.length}
                  sousTexte="Élèves assignés"
                  lien="eleves"
                />
                <CarteStat
                  label="Mes classes"
                  valeur={classesAssignees.length || repartitionParClasse.length}
                  sousTexte="Classes"
                  lien="eleves"
                />
                <CarteStat
                  label="Absences"
                  valeur={absences.donnees.length}
                  sousTexte="Signalées"
                  lien="absences"
                />
              </>
            ) : (
              <>
                <CarteStat
                  label="Mes enfants"
                  valeur={eleves.donnees.length}
                  sousTexte="Inscrits"
                  lien="eleves"
                />
                <CarteStat
                  label="Absences"
                  valeur={absences.donnees.length}
                  sousTexte="Enregistrées ce trimestre"
                  lien="absences"
                />
                <CarteStat
                  label="Paiements"
                  valeur={paiements.donnees.length}
                  sousTexte="Reçus disponibles"
                  lien="paiements"
                />
              </>
            )}
          </div>

          {estParent ? (
            <div style={{ marginBottom: "1.2rem" }}>
              <CarteMesEnfants
                eleves={eleves.donnees}
                onPayer={function (id) { setEnfantMobileMoney(id || "1"); }}
              />
            </div>
          ) : null}

          {(estEnseignant || estParent) ? (
            <div style={{ marginBottom: "1.2rem" }}>
              <CarteProchainsCours cours={cours.donnees} role={role} />
            </div>
          ) : null}

          {/* Ligne 2 : Grille 2 colonnes (Graphique répartition + Recouvrement financier) */}
          {estAdmin ? (
            <>
              <div className="react-grille-asymetrique-2-1">
                {/* Graphique de répartition des élèves par classe */}
                <div>
                  <GraphiqueBarres
                    titre="Répartition des élèves par classe"
                    donnees={repartitionParClasse}
                    hauteur={190}
                  />
                </div>

                {/* Carte Recouvrement financier épurée */}
                <div
                  className="mag-card react-fade-in"
                  style={{
                    padding: "1.1rem 1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: "100%",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "#0F172A" }}>
                        Recouvrement des frais
                      </span>
                      <span style={{ background: "#F1F5F9", color: "#334155", fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                        {tauxPct} % recouvré
                      </span>
                    </div>

                    <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0F172A", marginBottom: "0.6rem" }}>
                      {montantRecouvre.toLocaleString(localeActive())} <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#64748B" }}>FCFA</span>
                    </div>

                    {/* Barre de progression simple */}
                    <div style={{ height: "6px", background: "#E2E8F0", borderRadius: "3px", overflow: "hidden", marginBottom: "0.75rem" }}>
                      <div
                        style={{
                          height: "100%",
                          width: Math.min(100, parseFloat(tauxPct.replace(",", "."))) + "%",
                          background: "#1E3A8A",
                          borderRadius: "3px",
                        }}
                      ></div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem", color: "#475569" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Total prévu :</span>
                        <strong style={{ color: "#0F172A" }}>{montantPrevu.toLocaleString(localeActive())} FCFA</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Reste à percevoir :</span>
                        <strong style={{ color: "#0F172A" }}>{soldeRestant.toLocaleString(localeActive())} FCFA</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "0.9rem", paddingTop: "0.6rem", borderTop: "1px solid #F1F5F9" }}>
                    <button
                      type="button"
                      className="mag-btn-lien"
                      onClick={function () { window.location.hash = "/situation-financiere"; }}
                      style={{ fontSize: "0.8rem", color: "#1E3A8A", fontWeight: 600, padding: 0 }}
                    >
                      Voir la situation financière complète →
                    </button>
                  </div>
                </div>
              </div>

              {/* Ligne 3 : Répartition par genre (tableau sobre) + Derniers paiements */}
              <div className="react-grille-asymetrique-1-2">
                {/* Répartition par genre : Présentation sobre et humaine */}
                <div className="mag-card react-fade-in" style={{ padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "#0F172A", marginBottom: "0.8rem" }}>
                      Répartition par genre
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "0.3rem" }}>
                          <span style={{ fontWeight: 500, color: "#334155" }}>Garçons</span>
                          <span style={{ fontWeight: 600, color: "#0F172A" }}>{repartitionGenre.garcons} élèves ({repartitionGenre.pctGarcons} %)</span>
                        </div>
                        <div style={{ height: "6px", background: "#E2E8F0", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: repartitionGenre.pctGarcons + "%", background: "#1E3A8A", borderRadius: "3px" }}></div>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "0.3rem" }}>
                          <span style={{ fontWeight: 500, color: "#334155" }}>Filles</span>
                          <span style={{ fontWeight: 600, color: "#0F172A" }}>{repartitionGenre.filles} élèves ({repartitionGenre.pctFilles} %)</span>
                        </div>
                        <div style={{ height: "6px", background: "#E2E8F0", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: repartitionGenre.pctFilles + "%", background: "#475569", borderRadius: "3px" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "1rem", fontSize: "0.78rem", color: "#64748B", borderTop: "1px solid #F1F5F9", paddingTop: "0.5rem" }}>
                    Total : <strong>{repartitionGenre.total} élèves</strong> scolarisés
                  </div>
                </div>

                {/* Derniers paiements enregistrés */}
                <div className="mag-card react-fade-in" style={{ padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "#0F172A" }}>
                        Derniers paiements enregistrés
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
                        {paiements.donnees.length} règlements
                      </span>
                    </div>

                    <div className="mag-table-wrap" style={{ border: "1px solid #E2E8F0", borderRadius: "4px" }}>
                      <table className="mag-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th style={{ padding: "0.45rem 0.6rem" }}>Date</th>
                            <th style={{ padding: "0.45rem 0.6rem" }}>Élève</th>
                            <th style={{ padding: "0.45rem 0.6rem" }}>Classe</th>
                            <th style={{ padding: "0.45rem 0.6rem" }}>Tranche</th>
                            <th style={{ padding: "0.45rem 0.6rem", textAlign: "right" }}>Montant</th>
                            <th style={{ padding: "0.45rem 0.6rem" }}>Mode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {derniersPaiements.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: "center", color: "#64748B", padding: "1.2rem" }}>
                                Aucun paiement enregistré.
                              </td>
                            </tr>
                          ) : (
                            derniersPaiements.map(function (p) {
                              const nomClasse = p.classe_nom || mapEleveClasse[p.eleve] || "-";
                              const labelMode = p.mode_paiement === "mobile_money" ? "Mobile Money" :
                                                p.mode_paiement === "especes" ? "Espèces" :
                                                p.mode_paiement === "virement" ? "Virement" :
                                                p.mode_paiement === "cheque" ? "Chèque" : p.mode_paiement;

                              return (
                                <tr key={p.id}>
                                  <td style={{ color: "#64748B", whiteSpace: "nowrap" }}>
                                    {formaterDateCourte(p.date_paiement)}
                                  </td>
                                  <td style={{ fontWeight: 600, color: "#0F172A" }}>
                                    {p.eleve_nom || ("Élève #" + p.eleve)}
                                  </td>
                                  <td>{nomClasse}</td>
                                  <td style={{ color: "#475569" }}>
                                    {p.tranche ? p.tranche + "e tranche" : "Scolarité"}
                                  </td>
                                  <td style={{ textAlign: "right", fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>
                                    {Number(p.montant).toLocaleString(localeActive())} FCFA
                                  </td>
                                  <td style={{ color: "#475569" }}>
                                    {labelMode}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ marginTop: "0.7rem", textAlign: "right" }}>
                    <button
                      type="button"
                      className="mag-btn-lien"
                      onClick={function () { window.location.hash = "/paiements-gestion"; }}
                      style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1E3A8A", padding: 0 }}
                    >
                      Accéder à la gestion des paiements →
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {enfantMobileMoney !== null ? (
            <ModalPaiementMobileMoney
              token={token}
              eleves={eleves.donnees}
              eleveInitialId={enfantMobileMoney}
              onFermer={function () { setEnfantMobileMoney(null); }}
              onSucces={function () {
                setEnfantMobileMoney(null);
                window.location.reload();
              }}
            />
          ) : null}
        </>
      )}
    </>
  );
}
