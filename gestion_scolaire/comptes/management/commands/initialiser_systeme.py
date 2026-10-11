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

                # Enseignant
                prof = Enseignant.objects.create_user(
                    username="demo_prof",
                    email="prof@magnificat-scolaire.tg",
                    password="DemoMagnificat2026!",
                    first_name="Kossi",
                    last_name="KOUASSI",
                    specialite="Mathematiques",
                    telephone="+228 91 11 22 33",
                )
                prof.classes.add(cl3, cl6, cl_term)
                prof.matieres.add(maths, francais, sciences, anglais)

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
                        Note.objects.create(
                            eleve=eleve_item,
                            matiere=mat,
                            valeur=Decimal(str(val)),
                            trimestre=1,
                            type_evaluation="composition",
                        )
                        Note.objects.create(
                            eleve=eleve_item,
                            matiere=mat,
                            valeur=Decimal(str(max(0, val - 1))),
                            trimestre=1,
                            type_evaluation="devoir",
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
                    enregistree_par=prof,
                )

                # Emploi du temps
                Cours.objects.create(
                    classe=cl3,
                    matiere=maths,
                    enseignant=prof,
                    jour="lundi",
                    heure_debut=time(8),
                    heure_fin=time(10),
                    salle="Salle 4",
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
