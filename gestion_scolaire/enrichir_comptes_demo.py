import os
import sys
from datetime import date, time, timedelta
from decimal import Decimal
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import transaction
from django.contrib.auth import get_user_model
from comptes.models import Administrateur, Enseignant, Parent, DemandeConge, DemandeInscription, Parametres
from scolarite.models import Classe, Matiere, Eleve, Note, Bulletin, Absence, Cours
from paiements.models import FraisScolarite, Paiement
from communication.models import Annonce, Evenement, Message

def enrichir():
    print("Demarrage de l'enrichissement ultra-pro des profils...")

    with transaction.atomic():
        # 1. PARAMETRES DE L'ECOLE
        param = Parametres.charger()
        param.nom_ecole = "Complexe Scolaire Magnificat"
        param.adresse = "Adidogomé - Cacaveli, 08 BP 80213 Lomé 08, Togo"
        param.telephone = "(+228) 92 19 02 56 / 92 63 55 85 / 99 48 88 21"
        param.email = "collegemagnificat2024@gmail.com"
        param.annee_scolaire_active = "2026-2027"
        param.notes_verrouillees_t1 = False
        param.notes_verrouillees_t2 = False
        param.notes_verrouillees_t3 = False
        param.save()

        # 2. CLASSES
        cl6, _ = Classe.objects.get_or_create(nom="6e A", defaults={"niveau": "6e", "annee_scolaire": "2026-2027"})
        cl3, _ = Classe.objects.get_or_create(nom="3e A", defaults={"niveau": "3e", "annee_scolaire": "2026-2027"})
        cl_term, _ = Classe.objects.get_or_create(nom="Terminale D", defaults={"niveau": "Terminale", "annee_scolaire": "2026-2027"})

        # 3. MATIERES
        maths, _ = Matiere.objects.get_or_create(nom="Mathématiques", defaults={"coefficient": 4})
        francais, _ = Matiere.objects.get_or_create(nom="Français", defaults={"coefficient": 3})
        anglais, _ = Matiere.objects.get_or_create(nom="Anglais", defaults={"coefficient": 2})
        sciences, _ = Matiere.objects.get_or_create(nom="Phys-Chimie-Tech", defaults={"coefficient": 3})
        svt, _ = Matiere.objects.get_or_create(nom="SVT", defaults={"coefficient": 2})

        # 4. COMPTE ADMINISTRATEUR
        admin_user = Administrateur.objects.filter(username="admin").first()
        if not admin_user:
            admin_user = Administrateur.objects.create_superuser(
                username="admin",
                email="admin@magnificat-scolaire.tg",
                password="DemoMagnificat2026!",
                first_name="Georges",
                last_name="AGOUVI",
                service="Direction Générale",
                telephone="+228 90 00 00 00",
            )
        else:
            admin_user.set_password("DemoMagnificat2026!")
            admin_user.first_name = "Georges"
            admin_user.last_name = "AGOUVI"
            admin_user.service = "Direction Générale"
            admin_user.save()

        demo_admin = Administrateur.objects.filter(username="demo_admin").first()
        if not demo_admin:
            demo_admin = Administrateur.objects.create_superuser(
                username="demo_admin",
                email="demo_admin@magnificat-scolaire.tg",
                password="DemoMagnificat2026!",
                first_name="Georges",
                last_name="AGOUVI",
                service="Censure & Direction Pédagogique",
                telephone="+228 92 19 02 56",
            )
        else:
            demo_admin.set_password("DemoMagnificat2026!")
            demo_admin.first_name = "Georges"
            demo_admin.last_name = "AGOUVI"
            demo_admin.save()

        # 5. CORPS PROFESSORAL
        # Prof Maths (demo_prof)
        prof_math = Enseignant.objects.filter(username="demo_prof").first()
        if not prof_math:
            prof_math = Enseignant.objects.create_user(
                username="demo_prof",
                email="demo_prof@magnificat-scolaire.tg",
                password="DemoMagnificat2026!",
                first_name="T. G.",
                last_name="DATEY-AMOUSSOU",
                specialite="Mathématiques",
                telephone="+228 91 11 22 33",
            )
        else:
            prof_math.set_password("DemoMagnificat2026!")
            prof_math.first_name = "T. G."
            prof_math.last_name = "DATEY-AMOUSSOU"
            prof_math.specialite = "Mathématiques"
            prof_math.save()
        prof_math.classes.set([cl6, cl3, cl_term])
        prof_math.matieres.set([maths])

        # Prof Français
        prof_fr = Enseignant.objects.filter(username="prof_francais").first()
        if not prof_fr:
            prof_fr = Enseignant.objects.create_user(
                username="prof_francais",
                email="prof.francais@magnificat-scolaire.tg",
                password="DemoMagnificat2026!",
                first_name="Atakuma Komi",
                last_name="MENSAH",
                specialite="Français",
                telephone="+228 91 22 33 44",
            )
        else:
            prof_fr.set_password("DemoMagnificat2026!")
            prof_fr.first_name = "Atakuma Komi"
            prof_fr.last_name = "MENSAH"
            prof_fr.specialite = "Français"
            prof_fr.save()
        prof_fr.classes.set([cl6, cl3])
        prof_fr.matieres.set([francais])

        # Prof Anglais
        prof_ang = Enseignant.objects.filter(username="prof_anglais").first()
        if not prof_ang:
            prof_ang = Enseignant.objects.create_user(
                username="prof_anglais",
                email="prof.anglais@magnificat-scolaire.tg",
                password="DemoMagnificat2026!",
                first_name="Yawo Joseph",
                last_name="GBODZISI",
                specialite="Anglais",
                telephone="+228 91 33 44 55",
            )
        else:
            prof_ang.set_password("DemoMagnificat2026!")
            prof_ang.first_name = "Yawo Joseph"
            prof_ang.last_name = "GBODZISI"
            prof_ang.specialite = "Anglais"
            prof_ang.save()
        prof_ang.classes.set([cl6, cl3])
        prof_ang.matieres.set([anglais])

        # Prof Sciences
        prof_sc = Enseignant.objects.filter(username="prof_sciences").first()
        if not prof_sc:
            prof_sc = Enseignant.objects.create_user(
                username="prof_sciences",
                email="prof.sciences@magnificat-scolaire.tg",
                password="DemoMagnificat2026!",
                first_name="Claude",
                last_name="ADJEODA",
                specialite="Phys-Chimie-Tech",
                telephone="+228 91 44 55 66",
            )
        else:
            prof_sc.set_password("DemoMagnificat2026!")
            prof_sc.first_name = "Claude"
            prof_sc.last_name = "ADJEODA"
            prof_sc.specialite = "Phys-Chimie-Tech"
            prof_sc.save()
        prof_sc.classes.set([cl3, cl_term])
        prof_sc.matieres.set([sciences])

        print("Corps professoral configure (Maths, Francais, Anglais, Sciences).")

        # 6. ELEVES
        # 3e A
        e_afi, _ = Eleve.objects.get_or_create(
            matricule="MAG-2026-3E01",
            defaults={"nom": "MENSAH", "prenom": "Afi Ama", "date_naissance": date(2012, 5, 10), "sexe": "F", "classe": cl3}
        )
        e_koffi, _ = Eleve.objects.get_or_create(
            matricule="MAG-2026-3E02",
            defaults={"nom": "AGBEVI", "prenom": "Koffi Emmanuel", "date_naissance": date(2012, 8, 14), "sexe": "M", "classe": cl3}
        )
        e_lawson, _ = Eleve.objects.get_or_create(
            matricule="MAG-2026-3E03",
            defaults={"nom": "LAWSON", "prenom": "Komi David", "date_naissance": date(2011, 11, 2), "sexe": "M", "classe": cl3}
        )

        # 6e A
        e_komlan, _ = Eleve.objects.get_or_create(
            matricule="MAG-2026-6E01",
            defaults={"nom": "MENSAH", "prenom": "Komlan Jean", "date_naissance": date(2014, 11, 4), "sexe": "M", "classe": cl6}
        )
        e_grace, _ = Eleve.objects.get_or_create(
            matricule="MAG-2026-6E02",
            defaults={"nom": "KODJO", "prenom": "Akossiwa Grace", "date_naissance": date(2015, 3, 21), "sexe": "F", "classe": cl6}
        )
        e_essi, _ = Eleve.objects.get_or_create(
            matricule="MAG-2026-6E03",
            defaults={"nom": "AMEGAVI", "prenom": "Essi Marie", "date_naissance": date(2015, 7, 12), "sexe": "F", "classe": cl6}
        )

        # Terminale D
        e_yawo, _ = Eleve.objects.get_or_create(
            matricule="MAG-2026-TD01",
            defaults={"nom": "EKLOU", "prenom": "Yawo Jean", "date_naissance": date(2008, 9, 30), "sexe": "M", "classe": cl_term}
        )
        e_sophie, _ = Eleve.objects.get_or_create(
            matricule="MAG-2026-TD02",
            defaults={"nom": "TETE", "prenom": "Ablamba Sophie", "date_naissance": date(2008, 4, 18), "sexe": "F", "classe": cl_term}
        )
        e_paul, _ = Eleve.objects.get_or_create(
            matricule="MAG-2026-TD03",
            defaults={"nom": "FOLLY", "prenom": "Mawuli Paul", "date_naissance": date(2007, 12, 5), "sexe": "M", "classe": cl_term}
        )

        print("Eleves de reference configures.")

        # 7. PARENT DE DEMONSTRATION (demo_parent)
        demo_parent = Parent.objects.filter(username="demo_parent").first()
        if not demo_parent:
            demo_parent = Parent.objects.create_user(
                username="demo_parent",
                email="parent.mensah@gmail.com",
                password="DemoMagnificat2026!",
                first_name="Akouvi",
                last_name="MENSAH",
                profession="Commerçante",
                telephone="+228 92 34 56 78",
            )
        else:
            demo_parent.set_password("DemoMagnificat2026!")
            demo_parent.first_name = "Akouvi"
            demo_parent.last_name = "MENSAH"
            demo_parent.profession = "Commerçante"
            demo_parent.telephone = "+228 92 34 56 78"
            demo_parent.save()

        # Attacher DEUX enfants : Afi Ama (3e A) et Komlan Jean (6e A)
        demo_parent.eleves.set([e_afi, e_komlan])
        print(f"Parent {demo_parent.username} configure avec 2 enfants : Afi (3e) et Komlan (6e).")

        # 8. NOTES & EVALUATIONS
        # Saisie complete pour 3e A en Maths (demo_prof) -> progression 100% (Termine)
        for el, note_comp, note_dev in [
            (e_afi, Decimal("17.50"), Decimal("16.00")),
            (e_koffi, Decimal("14.00"), Decimal("13.50")),
            (e_lawson, Decimal("12.00"), Decimal("11.50")),
        ]:
            Note.objects.update_or_create(
                eleve=el, matiere=maths, trimestre=1, type_evaluation="composition",
                defaults={"valeur": note_comp, "enseignant": prof_math}
            )
            Note.objects.update_or_create(
                eleve=el, matiere=maths, trimestre=1, type_evaluation="devoir",
                defaults={"valeur": note_dev, "enseignant": prof_math}
            )

        # Autres matieres pour Afi Ama (pour son bulletin complet)
        for mat_item, p_item, val_comp, val_dev in [
            (francais, prof_fr, Decimal("16.00"), Decimal("15.50")),
            (anglais, prof_ang, Decimal("18.00"), Decimal("17.00")),
            (sciences, prof_sc, Decimal("15.00"), Decimal("14.50")),
        ]:
            Note.objects.update_or_create(
                eleve=e_afi, matiere=mat_item, trimestre=1, type_evaluation="composition",
                defaults={"valeur": val_comp, "enseignant": p_item}
            )
            Note.objects.update_or_create(
                eleve=e_afi, matiere=mat_item, trimestre=1, type_evaluation="devoir",
                defaults={"valeur": val_dev, "enseignant": p_item}
            )

        # 6e A : Saisie partielle en Maths (demo_prof) -> progression En cours
        Note.objects.update_or_create(
            eleve=e_komlan, matiere=maths, trimestre=1, type_evaluation="devoir",
            defaults={"valeur": Decimal("14.00"), "enseignant": prof_math}
        )
        Note.objects.update_or_create(
            eleve=e_grace, matiere=maths, trimestre=1, type_evaluation="devoir",
            defaults={"valeur": Decimal("15.50"), "enseignant": prof_math}
        )

        print("Notes et evaluations enregistrees.")

        # 9. BULLETINS OFFICIELS
        b_afi, _ = Bulletin.objects.update_or_create(
            eleve=e_afi, trimestre=1,
            defaults={
                "moyenne_generale": Decimal("16.63"),
                "rang": 1,
                "effectif_classe": cl3.eleves.count(),
                "decision_conseil": "Tableau d'Honneur avec Félicitations du Conseil.",
            }
        )
        Bulletin.objects.update_or_create(
            eleve=e_koffi, trimestre=1,
            defaults={
                "moyenne_generale": Decimal("13.75"),
                "rang": 2,
                "effectif_classe": cl3.eleves.count(),
                "decision_conseil": "Encouragements du Conseil.",
            }
        )
        print("Bulletins officiels configures.")

        # 10. FRAIS DE SCOLARITE ET PAIEMENTS
        # Frais pour 6e A, 3e A et Terminale D
        for cl, m1, m2, m3 in [
            (cl6, Decimal("65000"), Decimal("50000"), Decimal("45000")),
            (cl3, Decimal("75000"), Decimal("60000"), Decimal("50000")),
            (cl_term, Decimal("90000"), Decimal("75000"), Decimal("60000")),
        ]:
            FraisScolarite.objects.update_or_create(
                classe=cl, tranche=1,
                defaults={"montant_du": m1, "date_limite": date(2026, 10, 31)}
            )
            FraisScolarite.objects.update_or_create(
                classe=cl, tranche=2,
                defaults={"montant_du": m2, "date_limite": date(2027, 1, 15)}
            )
            FraisScolarite.objects.update_or_create(
                classe=cl, tranche=3,
                defaults={"montant_du": m3, "date_limite": date(2027, 4, 15)}
            )

        # Paiement Mobile Money TMoney pour Afi Ama (Tranche 1 payee)
        Paiement.objects.update_or_create(
            reference="MM-TMONEY-2026-001",
            defaults={
                "eleve": e_afi,
                "tranche": 1,
                "montant": Decimal("75000"),
                "mode_paiement": "mobile_money",
                "annee_scolaire": "2026-2027",
                "enregistre_par": admin_user,
            }
        )

        # Paiement Especes pour Koffi Emmanuel (Acompte Tranche 1)
        Paiement.objects.update_or_create(
            reference="REC-202610-002",
            defaults={
                "eleve": e_koffi,
                "tranche": 1,
                "montant": Decimal("50000"),
                "mode_paiement": "especes",
                "annee_scolaire": "2026-2027",
                "enregistre_par": admin_user,
            }
        )

        # Paiement Mobile Money Flooz pour Yawo Jean (Terminale D)
        Paiement.objects.update_or_create(
            reference="MM-FLOOZ-2026-003",
            defaults={
                "eleve": e_yawo,
                "tranche": 1,
                "montant": Decimal("90000"),
                "mode_paiement": "mobile_money",
                "annee_scolaire": "2026-2027",
                "enregistre_par": admin_user,
            }
        )

        print("Frais et paiements Mobile Money / Especes enregistres.")

        # 11. MESSAGERIE (CLOISONNEMENT STRICT)
        Message.objects.get_or_create(
            expediteur=prof_math,
            destinataire=demo_parent,
            eleve=e_afi,
            defaults={
                "contenu": "Bonjour Mme MENSAH, Afi a obtenu une excellente note de 17.5/20 au devoir de mathématiques. Continuez à l'encourager dans son travail personnel.",
            }
        )
        Message.objects.get_or_create(
            expediteur=demo_parent,
            destinataire=prof_math,
            eleve=e_afi,
            defaults={
                "contenu": "Merci beaucoup M. DATEY-AMOUSSOU pour votre suivi attentionné. Nous veillons à ce qu'elle révise régulièrement ses leçons à la maison.",
            }
        )
        Message.objects.get_or_create(
            expediteur=prof_fr,
            destinataire=demo_parent,
            eleve=e_komlan,
            defaults={
                "contenu": "Bonjour Mme MENSAH, Komlan s'intègre très bien en classe de 6e. Pensez à vérifier la signature de son cahier de textes chaque vendredi.",
            }
        )

        print("Messages cloisonnes contextuels crees.")

        # 12. DEMANDE D'ACCES EN ATTENTE (Pour test de validation par l'Administrateur)
        from django.contrib.auth.hashers import make_password
        DemandeInscription.objects.get_or_create(
            username_souhaite="parent_sossou",
            defaults={
                "type_compte": "parent",
                "mot_de_passe_hache": make_password("DemoMagnificat2026!"),
                "first_name": "Koffi",
                "last_name": "SOSSOU",
                "email": "koffi.sossou@gmail.com",
                "telephone": "+228 90 88 77 66",
                "profession": "Comptable",
                "matricules_enfants": "MAG-2026-6E03",
                "statut": "en_attente",
            }
        )

        # 13. DEMANDE DE CONGE PERSONNEL (Pour test d'approbation par l'Administrateur)
        DemandeConge.objects.get_or_create(
            demandeur=prof_fr,
            date_debut=date(2026, 11, 20),
            defaults={
                "date_fin": date(2026, 11, 21),
                "motif": "Participation au séminaire national sur la nouvelle approche pédagogique du Français au Collège.",
                "statut": "en_attente",
            }
        )

        # 14. ANNONCES INSTITUTIONNELLES
        Annonce.objects.get_or_create(
            titre="Rentrée Académique et Calendrier du 1er Trimestre",
            defaults={
                "contenu": "Bienvenue au Complexe Scolaire Magnificat pour l'année 2026-2027. Les compositions du 1er Trimestre débuteront le 1er décembre 2026.",
                "auteur": admin_user,
                "destinataires": "tous",
            }
        )
        Annonce.objects.get_or_create(
            titre="Remise des Fiches d'Évaluations et Arrêt des Notes",
            defaults={
                "contenu": "Chers collègues enseignants, la date limite de saisie des notes du 1er trimestre est fixée au 10 décembre 2026 avant verrouillage pédagogique.",
                "auteur": admin_user,
                "destinataires": "enseignants",
            }
        )
        Annonce.objects.get_or_create(
            titre="Assemblée Générale des Parents d'Élèves (APE)",
            defaults={
                "contenu": "Chers parents d'élèves, l'assemblée générale ordinaire se tiendra ce samedi à 09h00 dans la grande salle polyvalente de l'établissement.",
                "auteur": admin_user,
                "destinataires": "parents",
            }
        )

        # 15. CALENDRIER SCOLAIRE
        Evenement.objects.get_or_create(
            titre="Congés de détente du 1er Trimestre",
            date_debut=date(2026, 10, 24),
            defaults={
                "date_fin": date(2026, 11, 2),
                "type_evenement": "vacances",
                "cree_par": admin_user,
            }
        )
        Evenement.objects.get_or_create(
            titre="Compositions du 1er Trimestre",
            date_debut=date(2026, 12, 1),
            defaults={
                "date_fin": date(2026, 12, 5),
                "type_evenement": "evenement",
                "cree_par": admin_user,
            }
        )
        Evenement.objects.get_or_create(
            titre="Fête Nationale de l'Indépendance du Togo",
            date_debut=date(2027, 4, 27),
            defaults={
                "date_fin": date(2027, 4, 27),
                "type_evenement": "jour_ferie",
                "cree_par": admin_user,
            }
        )

    print("Enrichissement ultra-pro termine avec succes !")

if __name__ == "__main__":
    enrichir()
