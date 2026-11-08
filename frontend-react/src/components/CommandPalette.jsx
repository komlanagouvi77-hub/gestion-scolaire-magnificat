// src/components/CommandPalette.jsx
import { useState, useEffect, useRef } from "react";
import {
  Search,
  LayoutDashboard,
  ClipboardList,
  GraduationCap,
  BookOpen,
  Users,
  UserCheck,
  CreditCard,
  FileText,
  Calendar,
  MessageSquare,
  Bell,
  Settings,
  Moon,
  Sun,
  Globe,
  LogOut,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function CommandPalette({
  ouvert,
  onFermer,
  role,
  langue,
  theme,
  onBasculerTheme,
  onChangerLangue,
  onDeconnexion,
  onOuvrirGuide,
}) {
  const [recherche, setRecherche] = useState("");
  const [indexActif, setIndexActif] = useState(0);
  const inputRef = useRef(null);
  const listeRef = useRef(null);

  // Focus automatique à l'ouverture
  useEffect(() => {
    if (ouvert) {
      setRecherche("");
      setIndexActif(0);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [ouvert]);

  // Construction de la liste des commandes selon le rôle
  const commandes = [];

  // 1. Navigation
  const nav = (cle, titreFr, titreEn, descFr, descEn, Icone, categorie) => {
    commandes.push({
      type: "navigation",
      id: cle,
      titre: langue === "en" ? titreEn : titreFr,
      description: langue === "en" ? descEn : descFr,
      categorie: categorie || (langue === "en" ? "Navigation" : "Navigation"),
      Icone: Icone || LayoutDashboard,
      action: () => {
        window.location.hash = "#/" + cle;
        onFermer();
      },
    });
  };

  nav("dashboard", "Tableau de bord", "Dashboard", "Vue d'ensemble et indicateurs clés", "Overview and key indicators", LayoutDashboard);

  if (role === "administrateur") {
    nav("suivi", "Suivi des notes & Saisie", "Grade Tracking & Status", "Pilotage en temps réel Enseignant × Classe × Matière et clôture", "Real-time tracking Teacher × Class × Subject and lock", ClipboardList, "Pédagogie & Direction");
    nav("bulletins", "Gestion des Bulletins", "Report Cards", "Calcul des moyennes officielles, rangs et impression PDF avec QR Code", "Averages, ranks and PDF generation with QR Code", FileText, "Pédagogie & Direction");
    nav("classes-gestion", "Gestion des Classes", "Class Management", "Configuration des filières, niveaux et effectifs", "Classes, levels and enrollment", BookOpen, "Administration");
    nav("matieres-gestion", "Gestion des Matières", "Subject Management", "Coefficients et rattachements pédagogiques", "Coefficients and syllabus", BookOpen, "Administration");
    nav("enseignants-gestion", "Corps Professoral", "Faculty & Teachers", "Liste des enseignants, affectations et contacts", "Teacher list, assignments and phone", Users, "Administration");
    nav("parents-gestion", "Répertoire des Parents", "Parent Directory", "Comptes parents, numéros WhatsApp et enfants rattachés", "Parent accounts, WhatsApp contacts and linked children", UserCheck, "Administration");
    nav("eleves", "Élèves par classe", "Students by Class", "Effectifs, fiches individuelles et exports", "Class rosters, student files and export", GraduationCap, "Administration");
    nav("paiements-gestion", "Paiements & Écolages", "Tuition & Fees", "Encaissement guichet, TMoney, Moov Money et reçus officiels", "Cash desk, TMoney, Moov Money and receipts", CreditCard, "Finances & Comptabilité");
    nav("situation-financiere", "Situation Financière", "Financial Balance", "Bilan comptable par classe, taux de recouvrement", "Financial overview by class, recovery rate", DollarSign, "Finances & Comptabilité");
    nav("notes", "Consultation des Notes", "View Grades", "Revue des notes et évaluations saisies", "Review of entered evaluations and grades", ClipboardList, "Pédagogie & Direction");
    nav("absences", "Suivi des Absences", "Attendance", "Registre d'assiduité et justifications", "Attendance roll and justifications", ShieldCheck, "Pédagogie & Direction");
    nav("demandes-acces", "Demandes d'accès", "Access Requests", "Validation des demandes d'inscription parents et professeurs", "Approve parent and teacher registration requests", UserCheck, "Administration");
    nav("import", "Importation d'élèves", "Import Students", "Import en masse via fichier CSV", "Bulk import from CSV roster", FileSpreadsheet, "Administration");
    nav("parametres", "Paramètres de l'école", "School Settings", "Nom, logo, trimestres et verrouillage officiel", "School name, logo, terms and official locking", Settings, "Administration");
  }

  if (role === "enseignant") {
    nav("notes", "Saisie des Notes", "Grade Entry", "Saisie des devoirs, interrogations et compositions", "Enter homework, quizzes and exam grades", ClipboardList, "Mes Outils Enseignant");
    nav("absences", "Appel & Absences", "Take Attendance", "Enregistrement des présences du jour", "Record today's attendance", ShieldCheck, "Mes Outils Enseignant");
    nav("bulletins", "Bulletins de mes classes", "Report Cards", "Consulter les moyennes et appréciations", "Review student averages and feedback", FileText, "Mes Outils Enseignant");
    nav("eleves", "Mes Élèves", "My Students", "Trombinoscope et fiches élèves", "Student list and profiles", GraduationCap, "Mes Outils Enseignant");
    nav("messagerie", "Messagerie Parents", "Parent Messaging", "Échanges sécurisés rattachés aux élèves", "Direct secure chat linked to students", MessageSquare, "Communication");
    nav("conges", "Demandes de Congé", "Leave Requests", "Soumettre et suivre une demande d'absence", "Submit and track leave requests", Calendar, "Mes Outils Enseignant");
  }

  if (role === "parent") {
    nav("bulletins", "Bulletins scolaires", "Report Cards", "Consulter et télécharger les bulletins certifiés", "Download official certified report cards", FileText, "Espace Famille");
    nav("notes", "Notes de mes enfants", "My Children's Grades", "Suivi en temps réel des évaluations", "Real-time grades tracking", ClipboardList, "Espace Famille");
    nav("absences", "Assiduité & Présences", "Attendance & Absence", "Suivi des retards et absences signalés", "Track attendance and reported absences", ShieldCheck, "Espace Famille");
    nav("paiements", "Payer la Scolarité", "Tuition Payment", "Paiement direct TMoney, Moov Flooz ou historique", "Direct Mobile Money payments or history", CreditCard, "Espace Famille");
    nav("messagerie", "Contacter les Enseignants", "Message Teachers", "Messagerie directe avec l'équipe pédagogique", "Direct secure chat with teachers", MessageSquare, "Communication");
  }

  // Éléments universels
  nav("emploi-du-temps", "Emploi du temps", "Timetable", "Planning hebdomadaire des cours", "Weekly class schedule", Calendar, "Vie Scolaire");
  nav("annonces", "Annonces & Communiqués", "School News", "Informations officielles de la Direction", "Official announcements from leadership", Bell, "Vie Scolaire");
  nav("evenements", "Calendrier & Événements", "School Events", "Dates d'examens, congés et réunions", "Exam dates, holidays and meetings", Calendar, "Vie Scolaire");

  // 2. Actions Rapides
  commandes.push({
    type: "action",
    id: "theme-toggle",
    titre: theme === "dark"
      ? (langue === "en" ? "Switch to Light Mode" : "Activer le Thème Clair")
      : (langue === "en" ? "Switch to Dark Mode" : "Activer le Thème Sombre"),
    description: langue === "en" ? "Toggle interface dark/light theme" : "Basculer entre l'affichage clair et sombre",
    categorie: langue === "en" ? "Preferences" : "Préférences",
    Icone: theme === "dark" ? Sun : Moon,
    action: () => {
      onBasculerTheme();
      onFermer();
    },
  });

  commandes.push({
    type: "action",
    id: "lang-toggle",
    titre: langue === "en" ? "Passer en Français" : "Switch to English",
    description: langue === "en" ? "Changer la langue d'affichage" : "Change interface display language",
    categorie: langue === "en" ? "Preferences" : "Préférences",
    Icone: Globe,
    action: () => {
      onChangerLangue({ target: { value: langue === "en" ? "fr" : "en" } });
      onFermer();
    },
  });

  if (role === "administrateur" && onOuvrirGuide) {
    commandes.push({
      type: "action",
      id: "guide-config",
      titre: langue === "en" ? "Setup Guide" : "Guide de Configuration de l'École",
      description: langue === "en" ? "Review school launch checklist" : "Consulter les étapes de mise en place de l'établissement",
      categorie: langue === "en" ? "Assistance" : "Assistance",
      Icone: Sparkles,
      action: () => {
        onOuvrirGuide();
        onFermer();
      },
    });
  }

  commandes.push({
    type: "action",
    id: "deconnexion",
    titre: langue === "en" ? "Sign Out" : "Se Déconnecter",
    description: langue === "en" ? "End current session safely" : "Fermer la session actuelle en toute sécurité",
    categorie: langue === "en" ? "Account" : "Compte",
    Icone: LogOut,
    action: () => {
      onDeconnexion();
      onFermer();
    },
  });

  // Filtrage selon la saisie
  const filtre = recherche.trim().toLowerCase();
  const resultats = commandes.filter((c) => {
    if (!filtre) return true;
    return (
      c.titre.toLowerCase().includes(filtre) ||
      c.description.toLowerCase().includes(filtre) ||
      c.categorie.toLowerCase().includes(filtre)
    );
  });

  // Gestion des touches clavier
  const gererTouche = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onFermer();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndexActif((prev) => (prev + 1 < resultats.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndexActif((prev) => (prev - 1 >= 0 ? prev - 1 : resultats.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (resultats[indexActif]) {
        resultats[indexActif].action();
      }
    }
  };

  // Faire défiler vers l'élément sélectionné
  useEffect(() => {
    if (listeRef.current) {
      const element = listeRef.current.querySelector(`[data-index="${indexActif}"]`);
      if (element) {
        element.scrollIntoView({ block: "nearest" });
      }
    }
  }, [indexActif]);

  if (!ouvert) return null;

  return (
    <div className="react-cmd-overlay" onClick={onFermer} role="dialog" aria-modal="true">
      <div className="react-cmd-boite" onClick={(e) => e.stopPropagation()}>
        {/* Entête de recherche */}
        <div className="react-cmd-entete">
          <Search className="react-cmd-icone-recherche" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="react-cmd-input"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setIndexActif(0);
            }}
            onKeyDown={gererTouche}
            placeholder={
              langue === "en"
                ? "Type a page, action or tool... (Esc to close)"
                : "Rechercher une page, un outil ou une action... (Échap pour fermer)"
            }
          />
          <kbd className="react-cmd-badge-esc" onClick={onFermer}>Échap</kbd>
        </div>

        {/* Liste des résultats */}
        <div className="react-cmd-liste" ref={listeRef}>
          {resultats.length === 0 ? (
            <div className="react-cmd-vide">
              <HelpCircle size={28} className="react-cmd-vide-icone" />
              <p>{langue === "en" ? "No results found for" : "Aucun résultat pour"} "{recherche}"</p>
              <span>{langue === "en" ? "Try searching for 'notes', 'bulletins', 'classes', 'theme'..." : "Essayez 'notes', 'bulletins', 'classes', 'thème'..."}</span>
            </div>
          ) : (
            resultats.map((c, idx) => {
              const Icone = c.Icone;
              const estSelectionne = idx === indexActif;
              return (
                <div
                  key={c.id + "-" + idx}
                  data-index={idx}
                  className={`react-cmd-item ${estSelectionne ? "actif" : ""}`}
                  onMouseEnter={() => setIndexActif(idx)}
                  onClick={() => c.action()}
                >
                  <div className="react-cmd-item-icone">
                    <Icone size={18} />
                  </div>
                  <div className="react-cmd-item-texte">
                    <div className="react-cmd-item-titre">
                      <span>{c.titre}</span>
                      <span className="react-cmd-item-badge">{c.categorie}</span>
                    </div>
                    <div className="react-cmd-item-desc">{c.description}</div>
                  </div>
                  {estSelectionne ? <div className="react-cmd-item-entree">↵</div> : null}
                </div>
              );
            })
          )}
        </div>

        {/* Pied de commande avec raccourcis */}
        <div className="react-cmd-pied">
          <span className="react-cmd-aide">
            <kbd>↑</kbd> <kbd>↓</kbd> {langue === "en" ? "to navigate" : "pour naviguer"}
          </span>
          <span className="react-cmd-aide">
            <kbd>↵</kbd> {langue === "en" ? "to select" : "pour ouvrir"}
          </span>
          <span className="react-cmd-aide">
            <kbd>Échap</kbd> {langue === "en" ? "to exit" : "pour fermer"}
          </span>
        </div>
      </div>
    </div>
  );
}
