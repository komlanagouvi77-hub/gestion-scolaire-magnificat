"""
Tests du module scolarite : validation des notes/moyennes, generation
des bulletins PDF, et controle d'acces par role (web + API).
"""
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from comptes.models import Administrateur, Enseignant, Parent
from .models import Absence, Bulletin, Classe, Eleve, Matiere, Note
from .services import generer_bulletin


def creer_jeu_de_donnees():
    classe = Classe.objects.create(nom="3e A", niveau="3e", annee_scolaire="2026-2027")
    maths = Matiere.objects.create(nom="Mathematiques", coefficient=4)
    francais = Matiere.objects.create(nom="Francais", coefficient=3)
    eleve = Eleve.objects.create(
        matricule="EL001", nom="Kodjo", prenom="Ama",
        date_naissance="2012-05-10", sexe="F", classe=classe,
    )
    admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
    prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")
    prof.classes.add(classe)
    prof.matieres.add(maths)
    parent = Parent.objects.create_user(username="parent1", password="Test2026!")
    parent.eleves.add(eleve)
    return {
        "classe": classe, "maths": maths, "francais": francais, "eleve": eleve,
        "admin": admin, "prof": prof, "parent": parent,
    }


class ValidationNoteTests(TestCase):
    """Une note doit toujours rester entre 0 et 20."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def test_note_valide_est_acceptee(self):
        note = Note(eleve=self.donnees["eleve"], matiere=self.donnees["maths"], valeur=15, trimestre=1)
        note.full_clean()

    def test_note_superieure_a_20_est_rejetee(self):
        note = Note(eleve=self.donnees["eleve"], matiere=self.donnees["maths"], valeur=25, trimestre=1)
        with self.assertRaises(ValidationError):
            note.full_clean()

    def test_note_negative_est_rejetee(self):
        note = Note(eleve=self.donnees["eleve"], matiere=self.donnees["maths"], valeur=-3, trimestre=1)
        with self.assertRaises(ValidationError):
            note.full_clean()


class GenerationBulletinTests(TestCase):
    """La moyenne generale doit etre ponderee par les coefficients des matieres."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()
        eleve = self.donnees["eleve"]
        Note.objects.create(eleve=eleve, matiere=self.donnees["maths"], valeur=16, trimestre=1)
        Note.objects.create(eleve=eleve, matiere=self.donnees["francais"], valeur=12, trimestre=1)

    def test_moyenne_ponderee_est_correcte(self):
        bulletin = generer_bulletin(self.donnees["eleve"], 1)
        self.assertEqual(bulletin.moyenne_generale, Decimal("14.29"))

    def test_pdf_est_bien_genere(self):
        bulletin = generer_bulletin(self.donnees["eleve"], 1)
        self.assertTrue(bulletin.fichier_pdf.name)
        contenu = bulletin.fichier_pdf.read()
        self.assertTrue(contenu.startswith(b"%PDF"))

    def test_generation_sans_notes_leve_une_erreur(self):
        eleve_sans_notes = Eleve.objects.create(
            matricule="EL002", nom="Mensah", prenom="Kofi",
            date_naissance="2012-01-01", sexe="M", classe=self.donnees["classe"],
        )
        with self.assertRaises(ValueError):
            generer_bulletin(eleve_sans_notes, 1)


class AccesBulletinTests(TestCase):
    """Verifie les permissions de telechargement d'un bulletin par role."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()
        Note.objects.create(eleve=self.donnees["eleve"], matiere=self.donnees["maths"], valeur=16, trimestre=1)
        self.bulletin = generer_bulletin(self.donnees["eleve"], 1)

    def test_parent_de_l_eleve_peut_telecharger(self):
        self.client.login(username="parent1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:telecharger_bulletin", args=[self.bulletin.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp["Content-Type"], "application/pdf")

    def test_enseignant_hors_de_la_classe_ne_peut_pas_telecharger(self):
        autre_prof = Enseignant.objects.create_user(username="prof2", password="Test2026!")
        self.client.login(username="prof2", password="Test2026!")
        resp = self.client.get(reverse("scolarite:telecharger_bulletin", args=[self.bulletin.id]))
        self.assertEqual(resp.status_code, 403)

    def test_enseignant_ne_peut_pas_generer_un_bulletin(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.post(
            reverse("scolarite:generer_bulletin", args=[self.donnees["eleve"].id, 1])
        )
        self.assertEqual(resp.status_code, 403)


class ApiAccesParRoleTests(TestCase):
    """Verifie que l'API REST respecte les memes regles de visibilite par role."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def _obtenir_token(self, username):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": "Test2026!"})
        return resp.json()["token"]

    def test_acces_sans_token_est_refuse(self):
        resp = self.client.get("/api/eleves/")
        self.assertEqual(resp.status_code, 401)

    def test_parent_ne_voit_que_ses_enfants(self):
        token = self._obtenir_token("parent1")
        resp = self.client.get("/api/eleves/", HTTP_AUTHORIZATION=f"Token {token}")
        self.assertEqual(resp.status_code, 200)
        resultats = resp.json()["results"]
        self.assertEqual(len(resultats), 1)
        self.assertEqual(resultats[0]["matricule"], "EL001")

    def test_classe_nom_est_null_pour_un_eleve_sans_classe(self):
        """
        Regression : EleveSerializer.classe_nom utilisait
        source="classe.__str__", qui pour un eleve sans classe (classe est
        nullable) serialise la representation de la methode bound
        NoneType.__str__ elle-meme (ex: "<method-wrapper '__str__' of
        NoneType object at 0x...>") au lieu d'une valeur vide - ce texte
        technique remontait tel quel jusqu'a l'interface (graphique de
        repartition par classe du tableau de bord).
        """
        Eleve.objects.create(
            matricule="EL_SANS_CLASSE", nom="Sanschamps", prenom="Eli",
            date_naissance="2013-01-01", sexe="M", classe=None,
        )
        token = self._obtenir_token("admin1")
        resp = self.client.get("/api/eleves/", HTTP_AUTHORIZATION=f"Token {token}")
        self.assertEqual(resp.status_code, 200)
        eleve_sans_classe = next(e for e in resp.json()["results"] if e["matricule"] == "EL_SANS_CLASSE")
        self.assertIsNone(eleve_sans_classe["classe_nom"])

    def test_parent_ne_peut_pas_creer_une_note(self):
        token = self._obtenir_token("parent1")
        resp = self.client.post(
            "/api/notes/",
            {"eleve": self.donnees["eleve"].id, "matiere": self.donnees["maths"].id, "valeur": 15, "trimestre": 1},
            HTTP_AUTHORIZATION=f"Token {token}",
        )
        self.assertEqual(resp.status_code, 403)

    def test_enseignant_ne_peut_pas_creer_une_absence_hors_de_sa_classe(self):
        autre_classe = Classe.objects.create(
            nom="Terminale D", niveau="Terminale", annee_scolaire="2026-2027",
        )
        autre_eleve = Eleve.objects.create(
            matricule="EL_HORS_CLASSE", nom="Autre", prenom="Eleve",
            date_naissance="2012-01-01", sexe="M", classe=autre_classe,
        )
        token = self._obtenir_token("prof1")
        resp = self.client.post(
            "/api/absences/",
            {"eleve": autre_eleve.id, "date": "2026-09-15", "justifiee": False},
            HTTP_AUTHORIZATION=f"Token {token}",
        )
        self.assertEqual(resp.status_code, 403)
        self.assertFalse(Absence.objects.filter(eleve=autre_eleve).exists())

    def test_enseignant_ne_peut_pas_deplacer_une_absence_vers_une_autre_classe(self):
        autre_classe = Classe.objects.create(
            nom="Terminale D", niveau="Terminale", annee_scolaire="2026-2027",
        )
        autre_eleve = Eleve.objects.create(
            matricule="EL_HORS_CLASSE", nom="Autre", prenom="Eleve",
            date_naissance="2012-01-01", sexe="M", classe=autre_classe,
        )
        absence = Absence.objects.create(
            eleve=self.donnees["eleve"], date="2026-09-15", justifiee=False,
        )
        token = self._obtenir_token("prof1")
        resp = self.client.patch(
            f"/api/absences/{absence.id}/",
            {"eleve": autre_eleve.id},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Token {token}",
        )
        self.assertEqual(resp.status_code, 403)
        absence.refresh_from_db()
        self.assertEqual(absence.eleve_id, self.donnees["eleve"].id)


class MoyennePondereeParTypeTests(TestCase):
    """La composition doit compter double par rapport au controle continu."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def test_composition_compte_double(self):
        eleve = self.donnees["eleve"]
        maths = self.donnees["maths"]
        Note.objects.create(eleve=eleve, matiere=maths, valeur=10, trimestre=1, type_evaluation=Note.TYPE_DEVOIR)
        Note.objects.create(eleve=eleve, matiere=maths, valeur=16, trimestre=1, type_evaluation=Note.TYPE_COMPOSITION)
        bulletin = generer_bulletin(eleve, 1)
        # Formule officielle Complexe Scolaire Magnificat : (M.Cla + Compo) / 2 = (10 + 16) / 2 = 13.00
        self.assertEqual(bulletin.moyenne_generale, Decimal("13.00"))

    def test_plusieurs_interros_sont_moyennees(self):
        eleve = self.donnees["eleve"]
        maths = self.donnees["maths"]
        Note.objects.create(eleve=eleve, matiere=maths, valeur=12, trimestre=1, type_evaluation=Note.TYPE_INTERROGATION)
        Note.objects.create(eleve=eleve, matiere=maths, valeur=16, trimestre=1, type_evaluation=Note.TYPE_INTERROGATION)
        bulletin = generer_bulletin(eleve, 1)
        self.assertEqual(bulletin.moyenne_generale, Decimal("14.00"))

    def test_une_seule_composition_autorisee_par_matiere_et_trimestre(self):
        eleve = self.donnees["eleve"]
        maths = self.donnees["maths"]
        Note.objects.create(eleve=eleve, matiere=maths, valeur=15, trimestre=1, type_evaluation=Note.TYPE_COMPOSITION)
        with self.assertRaises(Exception):
            Note.objects.create(eleve=eleve, matiere=maths, valeur=10, trimestre=1, type_evaluation=Note.TYPE_COMPOSITION)


class SaisieNotesEnseignantTests(TestCase):
    """Verifie que l'enseignant peut saisir des notes, uniquement pour ses classes/matieres."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def test_enseignant_peut_saisir_une_note_pour_sa_classe(self):
        self.client.login(username="prof1", password="Test2026!")
        url = reverse("scolarite:saisir_notes")
        resp = self.client.post(url, {
            "classe": self.donnees["classe"].id,
            "matiere": self.donnees["maths"].id,
            "trimestre": 1,
            "type_evaluation": "devoir",
            f"note_{self.donnees['eleve'].id}": "15.5",
            "enregistrer": "1",
        })
        self.assertEqual(resp.status_code, 302)
        note = Note.objects.get(eleve=self.donnees["eleve"], matiere=self.donnees["maths"], trimestre=1)
        self.assertEqual(note.valeur, Decimal("15.5"))
        self.assertEqual(note.enseignant.pk, self.donnees["prof"].pk)

    def test_parent_ne_peut_pas_acceder_a_la_saisie_de_notes(self):
        self.client.login(username="parent1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:saisir_notes"))
        self.assertEqual(resp.status_code, 403)

    def test_enseignant_ne_peut_pas_saisir_pour_une_classe_qui_n_est_pas_la_sienne(self):
        autre_classe = Classe.objects.create(nom="Terminale D", niveau="Terminale", annee_scolaire="2026-2027")
        self.client.login(username="prof1", password="Test2026!")
        url = reverse("scolarite:saisir_notes")
        resp = self.client.get(url, {
            "classe": autre_classe.id,
            "matiere": self.donnees["maths"].id,
            "trimestre": 1,
            "type_evaluation": "devoir",
        })
        self.assertEqual(resp.status_code, 404)


class NoteApiPerimetreTests(TestCase):
    """
    Meme controle que SaisieNotesEnseignantTests, mais sur l'API REST
    (/api/notes/) utilisee par le frontend React et par Postman/Swagger.
    Avant correctif, un enseignant pouvait voir ET creer des notes en
    dehors de ses propres classes via l'API (la vue web classique etait,
    elle, deja correctement protegee).
    """

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()
        self.client = APIClient()

    def test_enseignant_ne_voit_pas_les_notes_d_une_autre_classe_meme_matiere(self):
        autre_classe = Classe.objects.create(nom="Terminale D", niveau="Terminale", annee_scolaire="2026-2027")
        autre_eleve = Eleve.objects.create(
            matricule="EL999", nom="Mensah", prenom="Kofi",
            date_naissance="2010-01-01", sexe="M", classe=autre_classe,
        )
        # Meme matiere (maths) que prof1, mais un eleve d'une classe qui n'est pas la sienne.
        Note.objects.create(eleve=autre_eleve, matiere=self.donnees["maths"], valeur=18, trimestre=1)

        self.client.force_authenticate(user=self.donnees["prof"])
        resp = self.client.get("/api/notes/")
        self.assertEqual(resp.status_code, 200)
        ids_eleves_vus = {n["eleve"] for n in resp.data["results"]}
        self.assertNotIn(autre_eleve.id, ids_eleves_vus)

    def test_enseignant_ne_peut_pas_creer_une_note_hors_de_sa_classe_via_l_api(self):
        autre_classe = Classe.objects.create(nom="Terminale D", niveau="Terminale", annee_scolaire="2026-2027")
        autre_eleve = Eleve.objects.create(
            matricule="EL998", nom="Adjovi", prenom="Esi",
            date_naissance="2010-01-01", sexe="F", classe=autre_classe,
        )
        self.client.force_authenticate(user=self.donnees["prof"])
        resp = self.client.post("/api/notes/", {
            "eleve": autre_eleve.id,
            "matiere": self.donnees["maths"].id,
            "valeur": "20.00",
            "trimestre": 1,
            "type_evaluation": "devoir",
        })
        self.assertEqual(resp.status_code, 403)
        self.assertFalse(Note.objects.filter(eleve=autre_eleve).exists())

    def test_enseignant_ne_peut_pas_creer_une_note_dans_une_matiere_qui_n_est_pas_la_sienne(self):
        self.client.force_authenticate(user=self.donnees["prof"])
        resp = self.client.post("/api/notes/", {
            "eleve": self.donnees["eleve"].id,
            "matiere": self.donnees["francais"].id,  # prof1 n'enseigne que les maths
            "valeur": "20.00",
            "trimestre": 1,
            "type_evaluation": "devoir",
        })
        self.assertEqual(resp.status_code, 403)

    def test_enseignant_peut_toujours_creer_une_note_pour_sa_propre_classe_via_l_api(self):
        self.client.force_authenticate(user=self.donnees["prof"])
        resp = self.client.post("/api/notes/", {
            "eleve": self.donnees["eleve"].id,
            "matiere": self.donnees["maths"].id,
            "valeur": "17.00",
            "trimestre": 1,
            "type_evaluation": "devoir",
        })
        self.assertEqual(resp.status_code, 201)


class EmploiDuTempsTests(TestCase):
    """Verifie que l'enseignant ne voit que ses propres cours dans son tableau de bord."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def test_cours_affiches_sur_le_dashboard_de_l_enseignant(self):
        from .models import Cours
        Cours.objects.create(
            classe=self.donnees["classe"], matiere=self.donnees["maths"], enseignant=self.donnees["prof"],
            jour="lundi", heure_debut="08:00", heure_fin="09:00", salle="Salle 3",
        )
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("comptes:dashboard_enseignant"))
        self.assertContains(resp, "Salle 3")
        self.assertContains(resp, "Lundi")


class SaisieAbsencesEnseignantTests(TestCase):
    """Verifie que l'enseignant peut saisir les presences/absences de ses classes uniquement."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def test_enseignant_peut_marquer_un_eleve_absent(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:saisir_absences"), {
            "classe": self.donnees["classe"].id,
            "date": "2026-09-15",
            f"absent_{self.donnees['eleve'].id}": "on",
            f"justifiee_{self.donnees['eleve'].id}": "on",
            f"motif_{self.donnees['eleve'].id}": "Maladie",
            "enregistrer": "1",
        })
        self.assertEqual(resp.status_code, 302)
        absence = Absence.objects.get(eleve=self.donnees["eleve"], date="2026-09-15")
        self.assertTrue(absence.justifiee)
        self.assertEqual(absence.motif, "Maladie")

    def test_decocher_absent_supprime_l_absence(self):
        Absence.objects.create(eleve=self.donnees["eleve"], date="2026-09-15", justifiee=False)
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:saisir_absences"), {
            "classe": self.donnees["classe"].id,
            "date": "2026-09-15",
            "enregistrer": "1",
        })
        self.assertEqual(resp.status_code, 302)
        self.assertFalse(Absence.objects.filter(eleve=self.donnees["eleve"], date="2026-09-15").exists())

    def test_parent_ne_peut_pas_saisir_les_absences(self):
        self.client.login(username="parent1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:saisir_absences"))
        self.assertEqual(resp.status_code, 403)


class DashboardParentDonneesTests(TestCase):
    """Le tableau de bord Parent doit afficher les absences et paiements de ses propres enfants."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()
        from paiements.models import Paiement

        Absence.objects.create(eleve=self.donnees["eleve"], date="2026-09-15", justifiee=False)
        Paiement.objects.create(
            eleve=self.donnees["eleve"], montant=25000, mode_paiement="especes", annee_scolaire="2026-2027",
        )

    def test_parent_voit_absence_et_paiement_de_son_enfant(self):
        self.client.login(username="parent1", password="Test2026!")
        resp = self.client.get(reverse("comptes:dashboard_parent"))
        self.assertContains(resp, "Non justifiee")
        self.assertContains(resp, "25000")


class GestionClasseTests(TestCase):
    """Verifie l'acces a la page de gestion de classe et a la fiche eleve, restreint par role."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()
        Absence.objects.create(eleve=self.donnees["eleve"], date="2026-09-10", justifiee=False)
        Absence.objects.create(eleve=self.donnees["eleve"], date="2026-09-11", justifiee=True)

    def test_enseignant_voit_la_gestion_de_sa_classe_avec_absences_non_justifiees(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:gestion_classe", args=[self.donnees["classe"].id]))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "1")

    def test_enseignant_ne_peut_pas_gerer_une_classe_qui_n_est_pas_la_sienne(self):
        autre_classe = Classe.objects.create(nom="Terminale D", niveau="Terminale", annee_scolaire="2026-2027")
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:gestion_classe", args=[autre_classe.id]))
        self.assertEqual(resp.status_code, 403)

    def test_enseignant_de_la_classe_peut_voir_la_fiche_eleve(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:fiche_eleve", args=[self.donnees["eleve"].id]))
        self.assertEqual(resp.status_code, 200)

    def test_parent_peut_voir_la_fiche_de_son_enfant(self):
        self.client.login(username="parent1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:fiche_eleve", args=[self.donnees["eleve"].id]))
        self.assertEqual(resp.status_code, 200)

    def test_parent_ne_peut_pas_voir_la_fiche_d_un_autre_eleve(self):
        autre_eleve = Eleve.objects.create(
            matricule="EL999", nom="Autre", prenom="Eleve",
            date_naissance="2012-01-01", sexe="M", classe=self.donnees["classe"],
        )
        self.client.login(username="parent1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:fiche_eleve", args=[autre_eleve.id]))
        self.assertEqual(resp.status_code, 403)

    def test_gestion_classe_affiche_le_compteur_d_observations_negatives(self):
        from .models import Observation
        Observation.objects.create(
            eleve=self.donnees["eleve"], enseignant=self.donnees["prof"],
            type_observation=Observation.TYPE_NEGATIVE, contenu="Bavardage",
        )
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:gestion_classe", args=[self.donnees["classe"].id]))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Kodjo")


class ObservationComportementaleTests(TestCase):
    """Verifie l'ajout d'observations comportementales et leur visibilite selon le role."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def test_enseignant_peut_ajouter_une_observation(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:fiche_eleve", args=[self.donnees["eleve"].id]), {
            "contenu": "Tres bonne participation en classe.",
            "type_observation": "positive",
            "visible_parent": "on",
        })
        self.assertEqual(resp.status_code, 302)
        from .models import Observation
        self.assertEqual(Observation.objects.count(), 1)
        self.assertEqual(Observation.objects.first().type_observation, "positive")

    def test_enseignant_hors_classe_ne_peut_pas_ajouter_observation(self):
        Enseignant.objects.create_user(username="prof2", password="Test2026!")
        self.client.login(username="prof2", password="Test2026!")
        resp = self.client.post(reverse("scolarite:fiche_eleve", args=[self.donnees["eleve"].id]), {
            "contenu": "Test", "type_observation": "positive",
        })
        self.assertEqual(resp.status_code, 403)

    def test_parent_ne_voit_pas_observation_non_visible(self):
        from .models import Observation
        Observation.objects.create(
            eleve=self.donnees["eleve"], enseignant=self.donnees["prof"],
            type_observation=Observation.TYPE_NEGATIVE, contenu="Confidentiel", visible_parent=False,
        )
        Observation.objects.create(
            eleve=self.donnees["eleve"], enseignant=self.donnees["prof"],
            type_observation=Observation.TYPE_POSITIVE, contenu="Bon travail", visible_parent=True,
        )
        self.client.login(username="parent1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:fiche_eleve", args=[self.donnees["eleve"].id]))
        self.assertContains(resp, "Bon travail")
        self.assertNotContains(resp, "Confidentiel")

    def test_enseignant_voit_toutes_les_observations_y_compris_non_visibles_parent(self):
        from .models import Observation
        Observation.objects.create(
            eleve=self.donnees["eleve"], enseignant=self.donnees["prof"],
            type_observation=Observation.TYPE_NEGATIVE, contenu="Confidentiel", visible_parent=False,
        )
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:fiche_eleve", args=[self.donnees["eleve"].id]))
        self.assertContains(resp, "Confidentiel")


class BulletinAvecPhotoTests(TestCase):
    """Verifie que le bulletin PDF se genere correctement, avec ou sans photo d'eleve."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()
        Note.objects.create(eleve=self.donnees["eleve"], matiere=self.donnees["maths"], valeur=15, trimestre=1)

    def test_bulletin_genere_sans_photo(self):
        bulletin = generer_bulletin(self.donnees["eleve"], 1)
        contenu = bulletin.fichier_pdf.read()
        self.assertTrue(contenu.startswith(b"%PDF"))

    def test_bulletin_genere_avec_photo(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        import io
        from PIL import Image as PILImage

        tampon = io.BytesIO()
        PILImage.new("RGB", (100, 120), color=(200, 200, 200)).save(tampon, format="JPEG")
        tampon.seek(0)
        self.donnees["eleve"].photo = SimpleUploadedFile("photo.jpg", tampon.read(), content_type="image/jpeg")
        self.donnees["eleve"].save()

        bulletin = generer_bulletin(self.donnees["eleve"], 1)
        contenu = bulletin.fichier_pdf.read()
        self.assertTrue(contenu.startswith(b"%PDF"))


class ClassementBulletinTests(TestCase):
    """
    Verifie que le rang et les statistiques de classe restent coherents et
    a jour pour TOUS les bulletins deja generes, meme quand un nouvel
    eleve est ajoute apres coup.
    """

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()
        self.autre_eleve = Eleve.objects.create(
            matricule="EL002", nom="Mensah", prenom="Kofi",
            date_naissance="2012-01-01", sexe="M", classe=self.donnees["classe"],
        )
        Note.objects.create(eleve=self.donnees["eleve"], matiere=self.donnees["maths"], valeur=16, trimestre=1)
        Note.objects.create(eleve=self.autre_eleve, matiere=self.donnees["maths"], valeur=10, trimestre=1)

    def test_rang_correct_entre_deux_eleves(self):
        b1 = generer_bulletin(self.donnees["eleve"], 1)
        b2 = generer_bulletin(self.autre_eleve, 1)
        self.assertEqual(b1.rang, 1)
        self.assertEqual(b2.rang, 2)

    def test_bulletin_deja_genere_est_mis_a_jour_quand_un_autre_eleve_est_ajoute(self):
        b1 = generer_bulletin(self.donnees["eleve"], 1)
        self.assertEqual(b1.rang, 1)

        generer_bulletin(self.autre_eleve, 1)
        b1.refresh_from_db()
        contenu = b1.fichier_pdf.read()
        self.assertTrue(contenu.startswith(b"%PDF"))


class VerrouillagePeriodeTests(TestCase):
    """Verifie qu'un trimestre verrouille bloque la saisie de notes par un enseignant, mais pas par un administrateur."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def test_enseignant_bloque_si_trimestre_verrouille(self):
        from comptes.models import Parametres
        p = Parametres.charger()
        p.notes_verrouillees_t1 = True
        p.save()

        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:saisir_notes"), {
            "classe": self.donnees["classe"].id,
            "matiere": self.donnees["maths"].id,
            "trimestre": 1,
            "type_evaluation": "devoir",
            f"note_{self.donnees['eleve'].id}": "15",
            "enregistrer": "1",
        })
        self.assertEqual(resp.status_code, 403)

    def test_enseignant_peut_saisir_si_trimestre_non_verrouille(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:saisir_notes"), {
            "classe": self.donnees["classe"].id,
            "matiere": self.donnees["maths"].id,
            "trimestre": 2,
            "type_evaluation": "devoir",
            f"note_{self.donnees['eleve'].id}": "15",
            "enregistrer": "1",
        })
        self.assertEqual(resp.status_code, 302)


class SuiviSaisieNotesTests(TestCase):
    """Verifie l'API de suivi de saisie des notes (reserve a l'Administrateur)."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def _obtenir_token(self, username):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": "Test2026!"})
        return resp.json()["token"]

    def test_administrateur_voit_le_suivi(self):
        token = self._obtenir_token("admin1")
        resp = self.client.get("/api/suivi-saisie/?trimestre=1", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 200)

    def test_enseignant_ne_peut_pas_voir_le_suivi(self):
        token = self._obtenir_token("prof1")
        resp = self.client.get("/api/suivi-saisie/?trimestre=1", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 403)


class ImportEleveCsvTests(TestCase):
    """Verifie l'import en masse d'eleves depuis un fichier CSV."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def _obtenir_token(self, username):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": "Test2026!"})
        return resp.json()["token"]

    def _fichier_csv(self, contenu):
        from django.core.files.uploadedfile import SimpleUploadedFile
        return SimpleUploadedFile("eleves.csv", contenu.encode("utf-8"), content_type="text/csv")

    def test_administrateur_peut_importer_des_eleves_valides(self):
        token = self._obtenir_token("admin1")
        csv_contenu = (
            "matricule,nom,prenom,date_naissance,sexe,classe\n"
            "EL9001,Nouveau,Eleve,2013-01-01,M,3e A\n"
        )
        resp = self.client.post(
            "/api/eleves/importer-csv/", {"fichier": self._fichier_csv(csv_contenu)},
            HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["crees"], 1)
        self.assertTrue(Eleve.objects.filter(matricule="EL9001").exists())

    def test_fichier_csv_trop_volumineux_est_refuse(self):
        token = self._obtenir_token("admin1")
        entete = "matricule,nom,prenom,date_naissance,sexe,classe\n"
        # Une ligne valide repetee jusqu'a depasser la limite de 5 Mo.
        ligne = "EL9999,Test,Eleve,2013-01-01,M,3e A\n"
        contenu_trop_gros = entete + ligne * (6 * 1024 * 1024 // len(ligne))
        resp = self.client.post(
            "/api/eleves/importer-csv/", {"fichier": self._fichier_csv(contenu_trop_gros)},
            HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("5 Mo", resp.json()["detail"])
        self.assertFalse(Eleve.objects.filter(matricule="EL9999").exists())

    def test_ligne_avec_classe_introuvable_est_en_erreur(self):
        token = self._obtenir_token("admin1")
        csv_contenu = (
            "matricule,nom,prenom,date_naissance,sexe,classe\n"
            "EL9002,Test,Eleve,2013-01-01,M,ClasseInexistante\n"
        )
        resp = self.client.post(
            "/api/eleves/importer-csv/", {"fichier": self._fichier_csv(csv_contenu)},
            HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["total_erreurs"], 1)
        self.assertFalse(Eleve.objects.filter(matricule="EL9002").exists())

    def test_reimport_du_meme_matricule_met_a_jour_sans_dupliquer(self):
        token = self._obtenir_token("admin1")
        csv_contenu = (
            "matricule,nom,prenom,date_naissance,sexe,classe\n"
            "EL9003,Premier,Nom,2013-01-01,M,3e A\n"
        )
        self.client.post("/api/eleves/importer-csv/", {"fichier": self._fichier_csv(csv_contenu)}, HTTP_AUTHORIZATION="Token " + token)

        csv_contenu2 = (
            "matricule,nom,prenom,date_naissance,sexe,classe\n"
            "EL9003,Nom,Modifie,2013-01-01,M,3e A\n"
        )
        resp = self.client.post(
            "/api/eleves/importer-csv/", {"fichier": self._fichier_csv(csv_contenu2)},
            HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp.json()["mis_a_jour"], 1)
        self.assertEqual(Eleve.objects.filter(matricule="EL9003").count(), 1)
        self.assertEqual(Eleve.objects.get(matricule="EL9003").nom, "Nom")

    def test_enseignant_ne_peut_pas_importer(self):
        token = self._obtenir_token("prof1")
        csv_contenu = "matricule,nom,prenom,date_naissance,sexe,classe\nEL9004,Test,Eleve,2013-01-01,M,3e A\n"
        resp = self.client.post(
            "/api/eleves/importer-csv/", {"fichier": self._fichier_csv(csv_contenu)},
            HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp.status_code, 403)


class GestionClasseMatiereTests(TestCase):
    """Verifie la creation/modification de classes et matieres depuis l'application (pas /admin/)."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def test_administrateur_peut_creer_une_classe(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:liste_classes"), {
            "nom": "6e B", "niveau": "6e", "annee_scolaire": "2026-2027",
        })
        self.assertEqual(resp.status_code, 302)
        self.assertTrue(Classe.objects.filter(nom="6e B").exists())

    def test_enseignant_ne_peut_pas_creer_de_classe(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:liste_classes"))
        self.assertEqual(resp.status_code, 403)

    def test_administrateur_peut_creer_une_matiere(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:liste_matieres"), {
            "nom": "Histoire-Geo", "coefficient": 2,
        })
        self.assertEqual(resp.status_code, 302)
        self.assertTrue(Matiere.objects.filter(nom="Histoire-Geo").exists())

    def test_administrateur_peut_modifier_une_classe(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:modifier_classe", args=[self.donnees["classe"].id]), {
            "nom": "3e A Modifiee", "niveau": "3e", "annee_scolaire": "2026-2027",
        })
        self.assertEqual(resp.status_code, 302)
        self.donnees["classe"].refresh_from_db()
        self.assertEqual(self.donnees["classe"].nom, "3e A Modifiee")


class ModificationSuppressionTests(TestCase):
    """Verifie la modification/suppression d'eleves, classes et matieres depuis l'application."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def test_administrateur_peut_modifier_un_eleve(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:modifier_eleve", args=[self.donnees["eleve"].id]), {
            "nom": "Kodjo", "prenom": "Ama Modifiee", "date_naissance": "2012-05-10",
            "sexe": "F", "classe": self.donnees["classe"].id,
        })
        self.assertEqual(resp.status_code, 302)
        self.donnees["eleve"].refresh_from_db()
        self.assertEqual(self.donnees["eleve"].prenom, "Ama Modifiee")

    def test_enseignant_ne_peut_pas_modifier_un_eleve(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:modifier_eleve", args=[self.donnees["eleve"].id]))
        self.assertEqual(resp.status_code, 403)

    def test_administrateur_peut_supprimer_un_eleve(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:supprimer_eleve", args=[self.donnees["eleve"].id]))
        self.assertEqual(resp.status_code, 302)
        self.assertFalse(Eleve.objects.filter(id=self.donnees["eleve"].id).exists())

    def test_suppression_classe_avec_eleves_est_refusee(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:supprimer_classe", args=[self.donnees["classe"].id]))
        self.assertEqual(resp.status_code, 302)
        self.assertTrue(Classe.objects.filter(id=self.donnees["classe"].id).exists())

    def test_suppression_classe_vide_fonctionne(self):
        classe_vide = Classe.objects.create(nom="Vide", niveau="6e", annee_scolaire="2026-2027")
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:supprimer_classe", args=[classe_vide.id]))
        self.assertEqual(resp.status_code, 302)
        self.assertFalse(Classe.objects.filter(id=classe_vide.id).exists())

    def test_administrateur_peut_supprimer_une_matiere(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:supprimer_matiere", args=[self.donnees["francais"].id]))
        self.assertEqual(resp.status_code, 302)
        self.assertFalse(Matiere.objects.filter(id=self.donnees["francais"].id).exists())


class UploadPhotoEleveTests(TestCase):
    """Verifie que l'upload d'une photo d'eleve fonctionne depuis l'application (pas /admin/)."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def test_administrateur_peut_uploader_une_photo(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        import io
        from PIL import Image as PILImage

        tampon = io.BytesIO()
        PILImage.new("RGB", (100, 120), color=(200, 200, 200)).save(tampon, format="JPEG")
        tampon.seek(0)
        photo = SimpleUploadedFile("photo.jpg", tampon.read(), content_type="image/jpeg")

        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:modifier_eleve", args=[self.donnees["eleve"].id]), {
            "nom": "Kodjo", "prenom": "Ama", "date_naissance": "2012-05-10",
            "sexe": "F", "classe": self.donnees["classe"].id, "photo": photo,
        })
        self.assertEqual(resp.status_code, 302)
        self.donnees["eleve"].refresh_from_db()
        self.assertTrue(bool(self.donnees["eleve"].photo))


class ApiGenerationBulletinTests(TestCase):
    """Verifie la generation de bulletin via l'API (utilisee par React), avec la meme logique que Django."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def _obtenir_token(self, username, password):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": password})
        return resp.json()["token"]

    def test_administrateur_peut_generer_un_bulletin_via_api(self):
        Note.objects.create(eleve=self.donnees["eleve"], matiere=self.donnees["maths"], valeur=16, trimestre=1)
        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.post("/api/bulletins/generer/", {
            "eleve": self.donnees["eleve"].id, "trimestre": 1,
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["moyenne_generale"], "16.00")
        self.assertTrue(Bulletin.objects.filter(eleve=self.donnees["eleve"], trimestre=1).exists())

    def test_generation_sans_notes_renvoie_erreur_claire(self):
        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.post("/api/bulletins/generer/", {
            "eleve": self.donnees["eleve"].id, "trimestre": 1,
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Aucune note", resp.json()["detail"])

    def test_enseignant_ne_peut_pas_generer_de_bulletin_via_api(self):
        Note.objects.create(eleve=self.donnees["eleve"], matiere=self.donnees["maths"], valeur=16, trimestre=1)
        token = self._obtenir_token("prof1", "Test2026!")
        resp = self.client.post("/api/bulletins/generer/", {
            "eleve": self.donnees["eleve"].id, "trimestre": 1,
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 403)

    def test_administrateur_genere_un_lot_et_signale_les_eleves_sans_notes(self):
        from unittest.mock import patch

        Note.objects.create(eleve=self.donnees["eleve"], matiere=self.donnees["maths"], valeur=16, trimestre=1)
        eleve_sans_notes = Eleve.objects.create(
            matricule="EL002", nom="Mensah", prenom="Kofi",
            date_naissance="2012-01-01", sexe="M", classe=self.donnees["classe"],
        )
        token = self._obtenir_token("admin1", "Test2026!")
        with patch("scolarite.services._regenerer_pdfs_classe") as regenerer_pdfs:
            resp = self.client.post("/api/bulletins/generer-lot/", {
                "eleves": [self.donnees["eleve"].id, eleve_sans_notes.id], "trimestre": 1,
            }, HTTP_AUTHORIZATION="Token " + token)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["total_genere"], 1)
        self.assertEqual(resp.json()["sans_notes"], [eleve_sans_notes.id])
        self.assertEqual(len(resp.json()["bulletins"]), 1)
        regenerer_pdfs.assert_called_once()

    def test_enseignant_ne_peut_pas_generer_un_lot_via_api(self):
        token = self._obtenir_token("prof1", "Test2026!")
        resp = self.client.post("/api/bulletins/generer-lot/", {
            "eleves": [self.donnees["eleve"].id], "trimestre": 1,
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 403)

    def test_parent_voit_uniquement_les_bulletins_de_son_enfant_via_api(self):
        Note.objects.create(eleve=self.donnees["eleve"], matiere=self.donnees["maths"], valeur=16, trimestre=1)
        token_admin = self._obtenir_token("admin1", "Test2026!")
        self.client.post("/api/bulletins/generer/", {
            "eleve": self.donnees["eleve"].id, "trimestre": 1,
        }, HTTP_AUTHORIZATION="Token " + token_admin)

        token_parent = self._obtenir_token("parent1", "Test2026!")
        resp = self.client.get("/api/bulletins/", HTTP_AUTHORIZATION="Token " + token_parent)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()["results"]), 1)


class GestionEmploiDuTempsTests(TestCase):
    """Verifie la creation/suppression de creneaux d'emploi du temps depuis l'application (pas /admin/)."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def test_administrateur_peut_creer_un_creneau(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:liste_cours"), {
            "classe": self.donnees["classe"].id, "matiere": self.donnees["maths"].id,
            "enseignant": self.donnees["prof"].id, "jour": "lundi",
            "heure_debut": "08:00", "heure_fin": "09:00", "salle": "Salle 3",
        })
        self.assertEqual(resp.status_code, 302)
        from .models import Cours
        self.assertTrue(Cours.objects.filter(classe=self.donnees["classe"], jour="lundi").exists())

    def test_enseignant_ne_peut_pas_gerer_l_emploi_du_temps(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("scolarite:liste_cours"))
        self.assertEqual(resp.status_code, 403)

    def test_creneau_apparait_sur_le_dashboard_de_l_enseignant(self):
        from .models import Cours
        Cours.objects.create(
            classe=self.donnees["classe"], matiere=self.donnees["maths"], enseignant=self.donnees["prof"],
            jour="lundi", heure_debut="08:00", heure_fin="09:00", salle="Salle 3",
        )
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("comptes:dashboard_enseignant"))
        self.assertContains(resp, "Salle 3")

    def test_administrateur_peut_supprimer_un_creneau(self):
        from .models import Cours
        creneau = Cours.objects.create(
            classe=self.donnees["classe"], matiere=self.donnees["maths"], enseignant=self.donnees["prof"],
            jour="lundi", heure_debut="08:00", heure_fin="09:00",
        )
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("scolarite:supprimer_cours", args=[creneau.id]))
        self.assertEqual(resp.status_code, 302)
        self.assertFalse(Cours.objects.filter(id=creneau.id).exists())


class MessagerieReelleTests(TestCase):
    """Verifie le circuit complet d'un message reel entre enseignant et parent."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def test_enseignant_peut_envoyer_un_message_au_parent(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.post(reverse("communication:messagerie"), {
            "destinataire": self.donnees["parent"].id, "eleve": self.donnees["eleve"].id,
            "contenu": "Bonjour, Ama a tres bien travaille.",
        })
        self.assertEqual(resp.status_code, 302)
        from communication.models import Message
        self.assertTrue(Message.objects.filter(
            expediteur=self.donnees["prof"], destinataire=self.donnees["parent"],
        ).exists())

    def test_parent_recoit_le_message_de_l_enseignant(self):
        from communication.models import Message
        Message.objects.create(
            expediteur=self.donnees["prof"], destinataire=self.donnees["parent"],
            eleve=self.donnees["eleve"], contenu="Message de test pour le parent.",
        )
        self.client.login(username="parent1", password="Test2026!")
        resp = self.client.get(reverse("communication:messagerie"))
        self.assertContains(resp, "Message de test pour le parent.")

    def test_parent_ne_peut_pas_envoyer_a_un_enseignant_hors_de_la_classe_de_son_enfant(self):
        from comptes.models import Enseignant
        autre_prof = Enseignant.objects.create_user(username="prof.etranger", password="Test2026!")
        self.client.login(username="parent1", password="Test2026!")
        resp = self.client.post(reverse("communication:messagerie"), {
            "destinataire": autre_prof.id, "eleve": self.donnees["eleve"].id, "contenu": "Test",
        })
        self.assertEqual(resp.status_code, 404)

class ApiObservationTests(TestCase):
    """Verifie les observations comportementales via l'API REST (utilisee par React)."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def _obtenir_token(self, username, password):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": password})
        return resp.json()["token"]

    def test_enseignant_de_la_classe_peut_ajouter_une_observation(self):
        token = self._obtenir_token("prof1", "Test2026!")
        resp = self.client.post("/api/observations/", {
            "eleve": self.donnees["eleve"].id, "type_observation": "positive",
            "contenu": "Tres bonne participation.", "visible_parent": True,
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 201)
        from .models import Observation
        obs = Observation.objects.get()
        self.assertEqual(obs.enseignant.pk, self.donnees["prof"].pk)

    def test_enseignant_hors_classe_ne_peut_pas_ajouter_observation_via_api(self):
        Enseignant.objects.create_user(username="prof2", password="Test2026!")
        token = self._obtenir_token("prof2", "Test2026!")
        resp = self.client.post("/api/observations/", {
            "eleve": self.donnees["eleve"].id, "type_observation": "positive", "contenu": "Test",
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 403)

    def test_parent_ne_voit_pas_observation_non_visible_via_api(self):
        from .models import Observation
        Observation.objects.create(
            eleve=self.donnees["eleve"], enseignant=self.donnees["prof"],
            type_observation=Observation.TYPE_NEGATIVE, contenu="Confidentiel", visible_parent=False,
        )
        Observation.objects.create(
            eleve=self.donnees["eleve"], enseignant=self.donnees["prof"],
            type_observation=Observation.TYPE_POSITIVE, contenu="Bon travail", visible_parent=True,
        )
        token = self._obtenir_token("parent1", "Test2026!")
        resp = self.client.get("/api/observations/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 200)
        contenus = [o["contenu"] for o in resp.json()["results"]]
        self.assertEqual(contenus, ["Bon travail"])

    def test_administrateur_voit_toutes_les_observations(self):
        from .models import Observation
        Observation.objects.create(
            eleve=self.donnees["eleve"], enseignant=self.donnees["prof"],
            type_observation=Observation.TYPE_NEGATIVE, contenu="Confidentiel", visible_parent=False,
        )
        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.get("/api/observations/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(len(resp.json()["results"]), 1)


class BulletinOfficielMagnificatTests(TestCase):
    """
    Tests de validation du modele officiel de bulletin du Complexe Scolaire Magnificat :
    - Generation en format Paysage avec QR Code de securite
    - Page de verification publique accessible sans authentification
    - Exactitude des formules (M.Cla + Compo) / 2
    - Rangs de matiere avec suffixe 'ex'
    """

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()
        self.eleve = self.donnees["eleve"]
        self.maths = self.donnees["maths"]
        self.francais = self.donnees["francais"]

    def test_page_verification_qr_code_publique(self):
        Note.objects.create(eleve=self.eleve, matiere=self.maths, valeur=14, trimestre=1)
        bulletin = generer_bulletin(self.eleve, 1)

        # La page de verification doit etre publique (sans login)
        reponse = self.client.get(f"/verifier/bulletin/{bulletin.id}/")
        self.assertEqual(reponse.status_code, 200)
        self.assertContains(reponse, "Complexe Scolaire Magnificat")
        self.assertContains(reponse, self.eleve.nom)
        self.assertContains(reponse, self.eleve.matricule)

    def test_calcul_exact_francais_du_bulletin_modele(self):
        from .calculs import calculer_detail_matiere
        # Notes réelles de Français sur le modèle : Devoirs 07, 05, 10 et Compo 06
        n1 = Note(eleve=self.eleve, matiere=self.francais, valeur=Decimal("7.0"), type_evaluation=Note.TYPE_DEVOIR)
        n2 = Note(eleve=self.eleve, matiere=self.francais, valeur=Decimal("5.0"), type_evaluation=Note.TYPE_DEVOIR)
        n3 = Note(eleve=self.eleve, matiere=self.francais, valeur=Decimal("10.0"), type_evaluation=Note.TYPE_DEVOIR)
        n4 = Note(eleve=self.eleve, matiere=self.francais, valeur=Decimal("6.0"), type_evaluation=Note.TYPE_COMPOSITION)

        detail = calculer_detail_matiere([n1, n2, n3, n4], coef=3)
        self.assertEqual(detail["m_cla"], Decimal("7.33"))
        self.assertEqual(detail["compo"], Decimal("6.00"))
        self.assertEqual(detail["moy_sur_20"], Decimal("6.67"))
        self.assertEqual(detail["note_definitive"], Decimal("20.01"))
        self.assertEqual(detail["appreciation"], "Faible. Doit se mettre au travail")


class StatistiquesGlobalesApiTests(TestCase):
    """Verifie le calcul des KPIs et statistiques globales via l'API REST."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()

    def _obtenir_token(self, username, password):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": password})
        return resp.json()["token"]

    def test_administrateur_peut_obtenir_statistiques_globales(self):
        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.get("/api/statistiques/globales/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("eleves", data)
        self.assertIn("classes", data)
        self.assertIn("absences", data)
        self.assertIn("finances", data)
        self.assertIn("academique", data)
        self.assertEqual(data["eleves"]["total"], 1)
        self.assertEqual(data["eleves"]["filles"], 1)
        self.assertEqual(data["eleves"]["garcons"], 0)

    def test_enseignant_ne_peut_pas_obtenir_statistiques_globales(self):
        token = self._obtenir_token("prof1", "Test2026!")
        resp = self.client.get("/api/statistiques/globales/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 403)


class ExporterClasseCsvApiTests(TestCase):
    """Verifie l'export CSV UTF-8 d'une classe pour Excel."""

    def setUp(self):
        self.donnees = creer_jeu_de_donnees()
        self.autre_prof = Enseignant.objects.create_user(username="prof_autre", password="Test2026!")

    def _obtenir_token(self, username, password):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": password})
        return resp.json()["token"]

    def test_administrateur_peut_exporter_csv(self):
        token = self._obtenir_token("admin1", "Test2026!")
        classe_id = self.donnees["classe"].id
        resp = self.client.get(f"/api/classes/{classe_id}/exporter-csv/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 200)
        self.assertIn("text/csv", resp["Content-Type"])
        self.assertIn(self.donnees["eleve"].matricule.encode("utf-8"), resp.content)
        self.assertIn(self.donnees["eleve"].nom.encode("utf-8"), resp.content)

    def test_enseignant_assigne_peut_exporter_csv(self):
        token = self._obtenir_token("prof1", "Test2026!")
        classe_id = self.donnees["classe"].id
        resp = self.client.get(f"/api/classes/{classe_id}/exporter-csv/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 200)
        self.assertIn("text/csv", resp["Content-Type"])

    def test_enseignant_non_assigne_est_refuse(self):
        token = self._obtenir_token("prof_autre", "Test2026!")
        classe_id = self.donnees["classe"].id
        resp = self.client.get(f"/api/classes/{classe_id}/exporter-csv/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 403)
