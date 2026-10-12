import os
from datetime import date, time
from decimal import Decimal

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
        parametres.adresse = parametres.adresse or "Adidogome, Lome, Togo"
        parametres.telephone = parametres.telephone or "+228 90 00 00 00"
        parametres.email = parametres.email or "contact@magnificat-scolaire.tg"
        parametres.annee_scolaire_active = parametres.annee_scolaire_active or "2026-2027"
        parametres.save()
        self.stdout.write(self.style.SUCCESS("Parametres de l'etablissement configures."))

        # 2. Compte Administrateur principal
        admin_existant = Administrateur.objects.first()
        if not admin_existant:
            username = os.environ.get("ADMIN_USERNAME", "admin")
            email = os.environ.get("ADMIN_EMAIL", "direction@magnificat-scolaire.tg")
            password = os.environ.get("ADMIN_PASSWORD", "AdminMagnificat2026!")

            admin_user = Administrateur.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                first_name="Georges",
                last_name="AGOUVI",
                service="Direction Generale",
                telephone="+228 90 00 00 00",
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Compte administrateur cree : {username} / {password}"
                )
            )
        else:
            admin_user = admin_existant
            self.stdout.write(
                self.style.NOTICE(f"Compte administrateur deja present : {admin_user.username}")
            )

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
                    expediteur=prof,
                    destinataire=parent,
                    eleve=e1,
                    contenu="Bonjour Mme Mensah, les resultats du premier devoir de mathematiques d'Afi sont tres satisfaisants.",
                )

            self.stdout.write(self.style.SUCCESS("Donnees de demonstration inserees avec succes !"))
        elif avec_demo:
            self.stdout.write(self.style.NOTICE("Des eleves existent deja, donnees de demonstration ignorees."))
