import { useState, useEffect, useMemo } from "react";
import { lister, obtenirStatistiquesGlobales } from "../api.js";
import { CarteStat, GraphiqueBarres } from "../components/Widgets.jsx";
import Spinner from "../components/Spinner.jsx";
import { traduireTexte, localeActive } from "../localisation.js";

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

function salutationActuelle() {
  const heure = new Date().getHours();
  if (heure >= 5 && heure < 12) return "Bonjour";
  if (heure >= 12 && heure < 18) return "Bon apres-midi";
  return "Bonsoir";
}

function prenomAffiche(nomComplet) {
  if (!nomComplet) return "";
  return nomComplet.trim().split(" ")[0];
}

const PHRASE_ACCUEIL_PAR_ROLE = {
  administrateur: function (ecole) { return "Voici la situation de " + ecole + " aujourd'hui."; },
  enseignant: function (ecole) { return "Pret pour votre journee a " + ecole + " ?"; },
  parent: function (ecole) { return "Suivez la scolarite de vos enfants a " + ecole + "."; },
};

const RACCOURCIS_ADMIN = [
  { cle: "notes", titre: "Saisie des notes", texte: "Saisir ou corriger les notes de toutes les classes.", couleur: "#2563EB" },
  { cle: "enseignants-gestion", titre: "Enseignants", texte: "Creer et gerer les comptes enseignants.", couleur: "#1D4E89" },
  { cle: "parents-gestion", titre: "Parents", texte: "Creer et gerer les comptes parents.", couleur: "#7C3AED" },
  { cle: "paiements-gestion", titre: "Comptabilite & Frais", texte: "Enregistrer un paiement, consulter l'historique.", couleur: "#16A34A" },
  { cle: "import", titre: "Import eleves", texte: "Ajouter plusieurs eleves d'un coup via un fichier CSV.", couleur: "#D97706" },
  { cle: "absences", titre: "Absences & Discipline", texte: "Bilan des absences et observations comportementales.", couleur: "#DB2777" },
  { cle: "suivi", titre: "Suivi des notes", texte: "Qui a termine la saisie, qui est en retard.", couleur: "#DC2626" },
  { cle: "parametres", titre: "Parametres etablissement", texte: "Nom, logo, annee scolaire, verrouillage des trimestres.", couleur: "#0891B2" },
];

const RACCOURCIS_ENSEIGNANT = [
  { cle: "notes", titre: "Saisir les notes", texte: "Entrer ou modifier les notes de vos eleves.", couleur: "#DC2626" },
  { cle: "absences", titre: "Absences", texte: "Enregistrer les absences et retards de vos classes.", couleur: "#DB2777" },
  { cle: "bulletins", titre: "Bulletins", texte: "Consulter les bulletins de vos eleves.", couleur: "#1D4E89" },
  { cle: "emploi-du-temps", titre: "Emploi du temps", texte: "Voir votre planning de cours de la semaine.", couleur: "#0891B2" },
  { cle: "messagerie", titre: "Messagerie", texte: "Echanger avec les parents de vos eleves.", couleur: "#7C3AED" },
  { cle: "annonces", titre: "Annonces", texte: "Publier ou consulter les annonces de l'etablissement.", couleur: "#D97706" },
];

const RACCOURCIS_PARENT = [
  { cle: "bulletins", titre: "Bulletins", texte: "Consulter les bulletins de vos enfants.", couleur: "#1D4E89" },
  { cle: "notes", titre: "Notes", texte: "Suivre les notes de vos enfants.", couleur: "#DC2626" },
  { cle: "absences", titre: "Absences", texte: "Consulter les absences de vos enfants.", couleur: "#DB2777" },
  { cle: "emploi-du-temps", titre: "Emploi du temps", texte: "Voir le planning de classe de vos enfants.", couleur: "#0891B2" },
  { cle: "paiements", titre: "Paiements", texte: "Consulter l'historique des paiements.", couleur: "#16A34A" },
  { cle: "messagerie", titre: "Messagerie", texte: "Contacter les enseignants de vos enfants.", couleur: "#7C3AED" },
];

function GrilleRaccourcis({ items }) {
  return (
    <div className="react-raccourcis-grille">
      {items.map(function (r) {
        return (
          <button
            type="button"
            key={r.cle} className="react-raccourci-carte"
            style={{ "--couleur-raccourci": r.couleur }}
            onClick={function () { window.location.hash = "/" + r.cle; }}
          >
            <div className="react-raccourci-barre"></div>
            <div className="react-raccourci-titre">{traduireTexte(r.titre)}</div>
            <div className="react-raccourci-texte">{traduireTexte(r.texte)}</div>
          </button>
        );
      })}
    </div>
  );
}

function BarreParite({ label, valeur, total, couleur }) {
  const pourcentage = total > 0 ? Math.round((valeur / total) * 100) : 0;
  return (
    <div className="react-parite-ligne">
      <div className="react-parite-entete">
        <span>{label}</span>
        <span>{valeur} ({pourcentage}%)</span>
      </div>
      <div className="react-parite-piste">
        <div className="react-parite-remplissage" style={{ width: pourcentage + "%", background: couleur }}></div>
      </div>
    </div>
  );
}

function CarteMesEnfants({ eleves }) {
  return (
    <div className="mag-card react-fade-in">
      <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>Mes enfants</div>
      {eleves.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--ink-600)" }}>Aucun enfant rattache a votre compte pour le moment.</p>
      ) : (
        <div className="react-enfants-liste">
          {eleves.map(function (e) {
            const initiales = ((e.prenom || "?").charAt(0) + (e.nom || "").charAt(0)).toUpperCase();
            return (
              <div className="react-enfant-carte" key={e.id}>
                <div className="react-enfant-avatar">{initiales}</div>
                <div>
                  <div className="react-enfant-nom">{e.prenom} {e.nom}</div>
                  <div className="react-enfant-classe">{e.classe_nom || "Classe non assignee"}</div>
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
    <div className="mag-card react-fade-in">
      <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>Prochains cours</div>
      {prochains.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--ink-600)" }}>Aucun cours planifie pour le moment.</p>
      ) : (
        <ul className="react-prochains-cours">
          {prochains.map(function (c) {
            return (
              <li key={c.id}>
                <span className="react-prochain-jour">{libelleJourRelatif(c.decalage, c.jour)}</span>
                <span className="react-prochain-heure">{c.heure_debut.slice(0, 5)} – {c.heure_fin.slice(0, 5)}</span>
                <span className="react-prochain-matiere">{c.matiere_nom}</span>
                <span className="react-prochain-details">
                  {c.classe_nom}{c.salle ? " · " + c.salle : ""}{role !== "enseignant" ? " · " + c.enseignant_nom : ""}
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
    eleves.donnees.forEach(function (el) {
      // Nom court (sans l'annee scolaire entre parentheses, deja affichee
      // dans l'en-tete) : le libelle complet ("Classe (2026-2027)") est
      // trop large pour l'axe du graphique des qu'il y a plusieurs classes,
      // ce qui faisait se chevaucher les etiquettes.
      const cle = (el.classe_nom || "Sans classe").split(" (")[0];
      compteurs[cle] = (compteurs[cle] || 0) + 1;
    });
    return Object.entries(compteurs).map(function (entree) { return { label: entree[0], valeur: entree[1] }; });
  }, [eleves.donnees]);

  const repartitionGenre = useMemo(function () {
    let filles = 0, garcons = 0;
    eleves.donnees.forEach(function (el) {
      if (el.sexe === "F") filles += 1;
      else if (el.sexe === "M") garcons += 1;
    });
    return { filles: filles, garcons: garcons, total: filles + garcons };
  }, [eleves.donnees]);

  const totalRecouvre = useMemo(function () {
    return paiements.donnees.reduce(function (somme, p) { return somme + Number(p.montant || 0); }, 0);
  }, [paiements.donnees]);

  const nomEcole = parametres ? parametres.nom_ecole : "l'etablissement";
  const phraseAccueil = traduireTexte((PHRASE_ACCUEIL_PAR_ROLE[role] || PHRASE_ACCUEIL_PAR_ROLE.administrateur)(nomEcole));

  let statCards;
  if (estEnseignant) {
    statCards = [
      { label: "Mes eleves", valeur: eleves.donnees.length, lien: "eleves" },
      { label: "Mes classes", valeur: repartitionParClasse.length, lien: "eleves" },
      { label: "Absences signalees", valeur: absences.donnees.length, lien: "absences" },
    ];
  } else if (estParent) {
    statCards = [
      { label: "Mes enfants", valeur: eleves.donnees.length, lien: "eleves" },
      { label: "Absences", valeur: absences.donnees.length, lien: "absences" },
      { label: "Paiements enregistres", valeur: paiements.donnees.length, lien: "paiements" },
    ];
  } else {
    statCards = [
      { label: "Eleves inscrits", valeur: eleves.donnees.length, lien: "eleves" },
      { label: "Classes", valeur: classes.donnees.length, lien: "classes-gestion" },
      { label: "Absences", valeur: absences.donnees.length, lien: "absences" },
      { label: "Paiements", valeur: paiements.donnees.length, lien: "paiements-gestion" },
    ];
  }

  const [banniereMasquee, setBanniereMasquee] = useState(function () {
    try {
      return sessionStorage.getItem("magnificat_banniere_accueil_fermee") === "1";
    } catch (e) {
      return false;
    }
  });

  const masquerBanniere = function () {
    try {
      sessionStorage.setItem("magnificat_banniere_accueil_fermee", "1");
    } catch (e) {}
    setBanniereMasquee(true);
  };

  const dateDuJour = useMemo(function () {
    try {
      const d = new Date();
      const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
      const locale = localeActive() === "en" ? "en-US" : "fr-FR";
      const s = d.toLocaleDateString(locale, options);
      return s.charAt(0).toUpperCase() + s.slice(1);
    } catch (e) {
      return "";
    }
  }, []);

  const raccourcis = estAdmin ? RACCOURCIS_ADMIN : estEnseignant ? RACCOURCIS_ENSEIGNANT : RACCOURCIS_PARENT;

  return (
    <>
      <div className="react-dashboard-entete-ligne">
        <div className="mag-page-title" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>
          <span className="eyebrow">{traduireTexte("Vue d'ensemble")}</span>
          <span>{traduireTexte("Tableau de bord")}</span>
        </div>
        <div className="react-dashboard-date-badge">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>{dateDuJour}</span>
        </div>
      </div>

      {!banniereMasquee && (
        <div className="react-banniere-accueil-pro react-fade-in">
          <div className="react-banniere-pro-gauche">
            <div className="react-banniere-pro-icone" aria-hidden="true">
              <span className="react-banniere-point-pulse"></span>
            </div>
            <div className="react-banniere-pro-contenu">
              <div className="react-banniere-pro-titre">
                <span>{traduireTexte(salutationActuelle())}, <strong>{prenomAffiche(utilisateur) || utilisateur}</strong></span>
                <span className="react-banniere-role-pill">
                  {estAdmin ? traduireTexte("Direction") : estEnseignant ? traduireTexte("Enseignant") : traduireTexte("Parent")}
                </span>
              </div>
              <div className="react-banniere-pro-texte">
                {phraseAccueil}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="react-banniere-pro-fermer"
            onClick={masquerBanniere}
            aria-label={traduireTexte("Masquer ce message")}
            title={traduireTexte("Masquer ce message")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      {chargementGlobal ? <Spinner texte="Recuperation des donnees..." /> : (
        <>
          <div className={statCards.length === 4 ? "mag-grid-4" : "mag-grid-4-auto"} style={{ marginBottom: "1.5rem" }}>
            {statCards.map(function (s) { return <CarteStat key={s.label} label={s.label} valeur={s.valeur} lien={s.lien} />; })}
          </div>

          {estParent ? (
            <CarteMesEnfants eleves={eleves.donnees} />
          ) : (
            <GraphiqueBarres titre={estEnseignant ? "Repartition de mes eleves par classe" : "Repartition des eleves par classe"} donnees={repartitionParClasse} />
          )}

          {(estEnseignant || estParent) ? (
            <div style={{ marginTop: "1.5rem" }}>
              <CarteProchainsCours cours={cours.donnees} role={role} />
            </div>
          ) : null}

          <div className="mag-section-entete" style={{ marginTop: "2rem" }}>
            <div className="mag-stat-label">Raccourcis &amp; actions rapides</div>
          </div>
          <GrilleRaccourcis items={raccourcis} />

          {estAdmin ? (
            <>
              <div className="mag-section-entete" style={{ marginTop: "2rem" }}>
                <div className="mag-stat-label">Pilotage &amp; indicateurs cles</div>
              </div>
              <div className="mag-grid-2">
                <div className="mag-card">
                  <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>Repartition de genre</div>
                  {repartitionGenre.total > 0 ? (
                    <>
                      <BarreParite label="Filles" valeur={repartitionGenre.filles} total={repartitionGenre.total} couleur="#DB2777" />
                      <BarreParite label="Garcons" valeur={repartitionGenre.garcons} total={repartitionGenre.total} couleur="#0369A1" />
                    </>
                  ) : (
                    <p style={{ fontSize: "0.85rem", color: "var(--ink-600)" }}>Aucun eleve enregistre pour le moment.</p>
                  )}
                </div>

                <div
                  className="mag-card mag-card-cliquable"
                  style={{ cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onClick={function () { window.location.hash = "/situation-financiere"; }}
                >
                  <div className="mag-stat-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span>Recouvrement financier</span>
                    {statsGlobales && statsGlobales.finances ? (
                      <span className="mag-badge" style={{ background: "rgba(22, 163, 74, 0.12)", color: "#16A34A", fontWeight: 700 }}>
                        {statsGlobales.finances.taux_recouvrement_pct}% recouvres
                      </span>
                    ) : <span style={{ opacity: 0.5, fontSize: "0.85rem" }}>→</span>}
                  </div>
                  <div className="mag-stat-value" style={{ fontSize: "1.8rem", color: "var(--green-600)" }}>
                    {totalRecouvre.toLocaleString(localeActive())} FCFA
                  </div>
                  {statsGlobales && statsGlobales.finances ? (
                    <div style={{ marginTop: "0.6rem" }}>
                      <div className="react-parite-piste" style={{ height: "8px", borderRadius: "4px", background: "var(--line, #e2e8f0)" }}>
                        <div
                          className="react-parite-remplissage"
                          style={{
                            width: Math.min(100, statsGlobales.finances.taux_recouvrement_pct) + "%",
                            background: "var(--green-600, #16A34A)",
                            height: "100%",
                            borderRadius: "4px",
                          }}
                        ></div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--ink-600)", marginTop: "0.3rem" }}>
                        <span>Prevu : {Number(statsGlobales.finances.total_prevu).toLocaleString(localeActive())} FCFA</span>
                        <span>Reste : {Number(statsGlobales.finances.solde_restant).toLocaleString(localeActive())} FCFA</span>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.8rem", color: "var(--ink-600)", marginTop: "0.4rem" }}>
                      Total percu, toutes tranches et classes confondues ({paiements.donnees.length} paiement{paiements.donnees.length > 1 ? "s" : ""}).
                    </p>
                  )}
                </div>
              </div>

              <div className="mag-grid-2" style={{ marginTop: "1rem" }}>
                <div className="mag-card">
                  <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>Activite academique &amp; Assiduite</div>
                  <div className="react-fiche-identite">
                    <div><span>Notes saisies</span><strong>{statsGlobales && statsGlobales.academique ? statsGlobales.academique.total_notes : "-"}</strong></div>
                    <div><span>Bulletins generes</span><strong>{statsGlobales && statsGlobales.academique ? statsGlobales.academique.total_bulletins : "-"}</strong></div>
                    <div><span>Assiduite justifiee</span><strong>{statsGlobales && statsGlobales.absences ? statsGlobales.absences.taux_justification_pct + "%" : "-"}</strong></div>
                    <div><span>Classes actives</span><strong>{classes.donnees.length}</strong></div>
                  </div>
                </div>

                <div className="mag-card">
                  <div className="mag-stat-label" style={{ marginBottom: "0.9rem" }}>Fiche d'identite technique</div>
                  <div className="react-fiche-identite">
                    <div><span>Nom de l'etablissement</span><strong>{parametres ? parametres.nom_ecole : "-"}</strong></div>
                    <div><span>Annee scolaire active</span><strong>{parametres ? parametres.annee_scolaire_active : "-"}</strong></div>
                    <div><span>Systeme academique</span><strong>{parametres ? (parametres.systeme_periodes === "semestre" ? "Semestres" : "Trimestres") : "-"}</strong></div>
                    <div><span>Devise monetaire</span><strong>FCFA</strong></div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}
    </>
  );
}
