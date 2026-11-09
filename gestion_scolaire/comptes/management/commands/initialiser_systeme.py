import os
from datetime import date, time
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from communication.models import Annonce, Evenement, Message
from comptes.models import Administrateur, Enseignant, Parametres, Parent, Utilisateur
from paiements.models import FraisScolarite, Paiement
from scolarite.models import Absence, Bulletin, Classe, Cours, Eleve, Matiere, Note


class Command(BaseCommand):
    help = "Initialise le compte administrateur et les donnees initiales pour le deploiement."

    def add_arguments(self, parser):
        parser.add_argument(
            "--avec-demo",
            action="store_true",
            help="Cree les donnees pedagogiques de demonstration si la base est vierge.",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Verification de la configuration du systeme..."))

        # 1. Parametres de l'etablissement (Singleton)
        parametres = Parametres.charger()
        if not parametres.nom_ecole:
            parametres.nom_ecole = "Complexe Scolaire Magnificat"
        parametres.adresse = parametres.adresse or "Adidogomé - Cacaveli, 08 BP 80213 Lomé 08, Togo"
        parametres.telephone = parametres.telephone or "(+228) 92 19 02 56 / 92 63 55 85 / 99 48 88 21"
        parametres.email = parametres.email or "collegemagnificat2024@gmail.com"
        parametres.annee_scolaire_active = parametres.annee_scolaire_active or "2026-2027"

        # Garantir la presence du logo officiel
        if not parametres.logo:
            chemin_media_logo = settings.BASE_DIR / "media" / "logo_ecole" / "logo_magnificat.png"
            if chemin_media_logo.exists():
                parametres.logo = "logo_ecole/logo_magnificat.png"
            else:
                chemin_defaut = settings.BASE_DIR / "static" / "frontend" / "logo-ecole-defaut.png"
                if chemin_defaut.exists():
                    import shutil
                    chemin_media_logo.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(chemin_defaut, chemin_media_logo)
                    parametres.logo = "logo_ecole/logo_magnificat.png"

        # Deconnexion et deverrouillage des periodes par defaut pour une soutenance fluide
        parametres.notes_verrouillees_t1 = False
        parametres.notes_verrouillees_t2 = False
        parametres.notes_verrouillees_t3 = False
        parametres.save()
        self.stdout.write(self.style.SUCCESS("Parametres de l'etablissement configures (trimestres ouverts a la saisie)."))

        # 2. Comptes Administrateurs garantis
        admin_user = None
        for nom_admin in ["admin", "demo_admin"]:
            admin_obj = Administrateur.objects.filter(username=nom_admin).first()
            if not admin_obj:
                admin_obj = Administrateur.objects.create_superuser(
                    username=nom_admin,
                    email=f"{nom_admin}@magnificat-scolaire.tg",
                    password="DemoMagnificat2026!",
                    first_name="Georges",
                    last_name="AGOUVI",
                    service="Direction Generale",
                    telephone="+228 90 00 00 00",
                )
                self.stdout.write(self.style.SUCCESS(f"Compte administrateur cree : {nom_admin}"))
            else:
                admin_obj.set_password("DemoMagnificat2026!")
                admin_obj.save()
            if not admin_user:
                admin_user = admin_obj

        # Garantir le mot de passe pour les comptes de demonstration Enseignant et Parent
        for prof_demo in Enseignant.objects.filter(username__in=["demo_prof", "prof_math"]):
            prof_demo.set_password("DemoMagnificat2026!")
            prof_demo.first_name = "T. G."
            prof_demo.last_name = "DATEY-AMOUSSOU"
            prof_demo.specialite = "Mathématiques"
            prof_demo.save()
        for parent_demo in Parent.objects.filter(username__in=["demo_parent", "parent1"]):
            parent_demo.set_password("DemoMagnificat2026!")
            parent_demo.save()

        # Garantir les classes de reference pour la demonstration (6e, 3e, Terminale)
        cl6, _ = Classe.objects.get_or_create(nom="6e A", defaults={"niveau": "6e", "annee_scolaire": "2026-2027"})
        cl3, _ = Classe.objects.get_or_create(nom="3e A", defaults={"niveau": "3e", "annee_scolaire": "2026-2027"})
        cl_term, _ = Classe.objects.get_or_create(nom="Terminale D", defaults={"niveau": "Terminale", "annee_scolaire": "2026-2027"})

        # Attribuer les 3 classes a demo_prof
        demo_prof_obj = Enseignant.objects.filter(username="demo_prof").first()
        if demo_prof_obj:
            demo_prof_obj.classes.add(cl6, cl3, cl_term)

        # Garantir au moins 3 eleves par classe pour la saisie des notes et bulletins
        if cl6.eleves.count() < 3:
            Eleve.objects.get_or_create(matricule="DEMO-6E-001", defaults={"nom": "KODJO", "prenom": "Akossiwa Grace", "date_naissance": date(2015, 3, 21), "sexe": "F", "classe": cl6})
            Eleve.objects.get_or_create(matricule="DEMO-6E-002", defaults={"nom": "AMEGAVI", "prenom": "Essi Marie", "date_naissance": date(2015, 7, 12), "sexe": "F", "classe": cl6})
            Eleve.objects.get_or_create(matricule="DEMO-6E-003", defaults={"nom": "MENSAH", "prenom": "Komlan Jean", "date_naissance": date(2014, 11, 4), "sexe": "M", "classe": cl6})
        if cl3.eleves.count() < 3:
            Eleve.objects.get_or_create(matricule="DEMO-3E-001", defaults={"nom": "MENSAH", "prenom": "Afi Ama", "date_naissance": date(2012, 5, 10), "sexe": "F", "classe": cl3})
            Eleve.objects.get_or_create(matricule="DEMO-3E-002", defaults={"nom": "AGBEVI", "prenom": "Koffi Emmanuel", "date_naissance": date(2012, 8, 14), "sexe": "M", "classe": cl3})
            Eleve.objects.get_or_create(matricule="DEMO-3E-003", defaults={"nom": "LAWSON", "prenom": "Komi David", "date_naissance": date(2011, 11, 2), "sexe": "M", "classe": cl3})
        if cl_term.eleves.count() < 3:
            Eleve.objects.get_or_create(matricule="DEMO-TD-001", defaults={"nom": "EKLOU", "prenom": "Yawo Jean", "date_naissance": date(2008, 9, 30), "sexe": "M", "classe": cl_term})
            Eleve.objects.get_or_create(matricule="DEMO-TD-002", defaults={"nom": "TETE", "prenom": "Ablamba Sophie", "date_naissance": date(2008, 4, 18), "sexe": "F", "classe": cl_term})
            Eleve.objects.get_or_create(matricule="DEMO-TD-003", defaults={"nom": "FOLLY", "prenom": "Mawuli Paul", "date_naissance": date(2007, 12, 5), "sexe": "M", "classe": cl_term})

        # Filtrage strict des matieres pour tous les enseignants (specialite unique)
        try:
            import unicodedata

            def _clean(t):
                if not t:
                    return ""
                t = unicodedata.normalize("NFD", str(t))
                return "".join(c for c in t if unicodedata.category(c) != "Mn").lower().strip()

            from scolarite.models import Matiere
            toutes_matieres = list(Matiere.objects.all())
            for prof in Enseignant.objects.all():
                if prof.specialite:
                    spec_norm = _clean(prof.specialite)
                    spec_mats = [m for m in toutes_matieres if spec_norm in _clean(m.nom) or _clean(m.nom) in spec_norm]
                    if spec_mats:
                        prof.matieres.set(spec_mats)
                elif prof.username in ["demo_prof", "prof_math"]:
                    math_mats = [m for m in toutes_matieres if "math" in _clean(m.nom)]
                    if math_mats:
                        prof.matieres.set(math_mats)
        except Exception:
            pass

        # 3. Donnees de demonstration si demandees
        avec_demo = options.get("avec_demo") or os.environ.get("DEMO_DATA", "False") == "True"
        if avec_demo and not Eleve.objects.exists():
            self.stdout.write(self.style.NOTICE("Insertion des donnees de demonstration..."))
            with transaction.atomic():
                # Classes
                cl3 = Classe.objects.create(nom="3e A", niveau="3e", annee_scolaire="2026-2027")
                cl6 = Classe.objects.create(nom="6e A", niveau="6e", annee_scolaire="2026-2027")
                cl_term = Classe.objects.create(nom="Terminale D", niveau="Terminale", annee_scolaire="2026-2027")

                # Matieres
                maths = Matiere.objects.create(nom="Mathematiques", coefficient=4)
                francais = Matiere.objects.create(nom="Francais", coefficient=3)
                sciences = Matiere.objects.create(nom="Sciences Physiques", coefficient=3)
                anglais = Matiere.objects.create(nom="Anglais", coefficient=2)

                # Enseignants officiels du Complexe Scolaire Magnificat
                prof_math = Enseignant.objects.create_user(
                    username="prof_math",
                    email="prof.math@magnificat-scolaire.tg",
                    password="DemoMagnificat2026!",
                    first_name="T. G",
                    last_name="DATEY-AMOUSSOU",
                    specialite="Mathematiques",
                    telephone="+228 91 11 22 33",
                )
                prof_math.classes.add(cl3, cl6, cl_term)
                prof_math.matieres.add(maths)

                demo_prof = Enseignant.objects.filter(username="demo_prof").first()
                if not demo_prof:
                    demo_prof = Enseignant.objects.create_user(
                        username="demo_prof",
                        email="demo_prof@magnificat-scolaire.tg",
                        password="DemoMagnificat2026!",
                        first_name="T. G.",
                        last_name="DATEY-AMOUSSOU",
                        specialite="Mathematiques",
                        telephone="+228 91 11 22 33",
                    )
                else:
                    demo_prof.set_password("DemoMagnificat2026!")
                    demo_prof.save()
                demo_prof.classes.add(cl3, cl6, cl_term)
                demo_prof.matieres.add(maths)

                prof_fr = Enseignant.objects.create_user(
                    username="prof_francais",
                    email="prof.francais@magnificat-scolaire.tg",
                    password="DemoMagnificat2026!",
                    first_name="Atakuma Komi",
                    last_name="MENSAH",
                    specialite="Francais",
                    telephone="+228 91 22 33 44",
                )
                prof_fr.classes.add(cl3, cl6)
                prof_fr.matieres.add(francais)

                prof_ang = Enseignant.objects.create_user(
                    username="prof_anglais",
                    email="prof.anglais@magnificat-scolaire.tg",
                    password="DemoMagnificat2026!",
                    first_name="Yawo Joseph",
                    last_name="GBODZISI",
                    specialite="Anglais",
                    telephone="+228 91 33 44 55",
                )
                prof_ang.classes.add(cl3, cl6)
                prof_ang.matieres.add(anglais)

                prof_sc = Enseignant.objects.create_user(
                    username="prof_sciences",
                    email="prof.sciences@magnificat-scolaire.tg",
                    password="DemoMagnificat2026!",
                    first_name="Claude",
                    last_name="ADJEODA",
                    specialite="Sciences Physiques",
                    telephone="+228 91 44 55 66",
                )
                prof_sc.classes.add(cl3, cl_term)
                prof_sc.matieres.add(sciences)

                profs_par_matiere = {
                    maths.id: prof_math,
                    francais.id: prof_fr,
                    anglais.id: prof_ang,
                    sciences.id: prof_sc,
                }


                # Eleves
                e1 = Eleve.objects.create(
                    matricule="DEMO-001",
                    nom="MENSAH",
                    prenom="Afi Ama",
                    date_naissance=date(2012, 5, 10),
                    sexe="F",
                    classe=cl3,
                )
                e2 = Eleve.objects.create(
                    matricule="DEMO-002",
                    nom="AGBEVI",
                    prenom="Koffi Emmanuel",
                    date_naissance=date(2012, 8, 14),
                    sexe="M",
                    classe=cl3,
                )
                e3 = Eleve.objects.create(
                    matricule="DEMO-003",
                    nom="LAWSON",
                    prenom="Komi David",
                    date_naissance=date(2011, 11, 2),
                    sexe="M",
                    classe=cl3,
                )
                e4 = Eleve.objects.create(
                    matricule="DEMO-004",
                    nom="KODJO",
                    prenom="Akossiwa Grace",
                    date_naissance=date(2015, 3, 21),
                    sexe="F",
                    classe=cl6,
                )
                e5 = Eleve.objects.create(
                    matricule="DEMO-005",
                    nom="EKLOU",
                    prenom="Yawo Jean",
                    date_naissance=date(2008, 9, 30),
                    sexe="M",
                    classe=cl_term,
                )

                # Parent
                parent = Parent.objects.create_user(
                    username="demo_parent",
                    email="parent@magnificat-scolaire.tg",
                    password="DemoMagnificat2026!",
                    first_name="Akouvi",
                    last_name="MENSAH",
                    profession="Commercante",
                    telephone="+228 92 34 56 78",
                )
                parent.eleves.add(e1)

                # Notes & Bulletins
                notes_data = [
                    (e1, [17, 16, 18, 15]),
                    (e2, [14, 13, 15, 12]),
                    (e3, [11, 14, 12, 13]),
                ]
                matieres_liste = [maths, francais, sciences, anglais]
                for eleve_item, vals in notes_data:
                    for mat, val in zip(matieres_liste, vals):
                        enseignant_attribue = profs_par_matiere.get(mat.id, prof_math)
                        Note.objects.create(
                            eleve=eleve_item,
                            matiere=mat,
                            valeur=Decimal(str(val)),
                            trimestre=1,
                            type_evaluation="composition",
                            enseignant=enseignant_attribue,
                        )
                        Note.objects.create(
                            eleve=eleve_item,
                            matiere=mat,
                            valeur=Decimal(str(max(0, val - 1))),
                            trimestre=1,
                            type_evaluation="devoir",
                            enseignant=enseignant_attribue,
                        )

                for el, moy, rang in [(e1, "16.50", 1), (e2, "13.80", 2), (e3, "12.50", 3)]:
                    Bulletin.objects.create(
                        eleve=el,
                        trimestre=1,
                        moyenne_generale=Decimal(moy),
                        rang=rang,
                        effectif_classe=3,
                    )

                # Absence
                Absence.objects.create(
                    eleve=e2,
                    date=date(2026, 10, 5),
                    motif="Rendez-vous medical",
                    justifiee=True,
                    enregistree_par=prof_math,
                )

                # Emploi du temps complet de la 3e
                cours_configs = [
                    (maths, prof_math, "lundi", time(8), time(10), "Salle 4"),
                    (francais, prof_fr, "mardi", time(8), time(10), "Salle 4"),
                    (sciences, prof_sc, "mercredi", time(8), time(10), "Salle 4"),
                    (anglais, prof_ang, "jeudi", time(10), time(12), "Salle 4"),
                ]
                for mat, prof_item, jr, hd, hf, sl in cours_configs:
                    Cours.objects.create(
                        classe=cl3,
                        matiere=mat,
                        enseignant=prof_item,
                        jour=jr,
                        heure_debut=hd,
                        heure_fin=hf,
                        salle=sl,
                    )


                # Frais de scolarite et paiements
                frais1 = FraisScolarite.objects.create(
                    classe=cl3,
                    tranche=1,
                    montant_du=Decimal("75000"),
                    date_limite=date(2026, 10, 30),
                )
                Paiement.objects.create(
                    eleve=e1,
                    tranche=1,
                    montant=Decimal("75000"),
                    mode_paiement="mobile_money",
                    reference="MM-TOGO-2026-001",
                    annee_scolaire="2026-2027",
                    enregistre_par=admin_user,
                )
                Paiement.objects.create(
                    eleve=e2,
                    tranche=1,
                    montant=Decimal("50000"),
                    mode_paiement="especes",
                    annee_scolaire="2026-2027",
                    enregistre_par=admin_user,
                )

                # Annonces et Evenements
                Annonce.objects.create(
                    titre="Bienvenue sur le portail Magnificat",
                    contenu="L'annee scolaire 2026-2027 est officiellement ouverte. Consultez les emplois du temps et les paiements.",
                    auteur=admin_user,
                    destinataires="tous",
                )
                Evenement.objects.create(
                    titre="Reunion pedagogique generale",
                    type_evenement="evenement",
                    date_debut=date(2026, 10, 16),
                    date_fin=date(2026, 10, 16),
                    cree_par=admin_user,
                )
                Message.objects.create(
                    expediteur=prof_math,
                    destinataire=parent,
                    eleve=e1,
                    contenu="Bonjour Mme Mensah, les resultats du premier devoir de mathematiques d'Afi sont tres satisfaisants.",
                )

            self.stdout.write(self.style.SUCCESS("Donnees de demonstration inserees avec succes !"))
        elif avec_demo:
            self.stdout.write(self.style.NOTICE("Des eleves existent deja, donnees de demonstration ignorees."))
