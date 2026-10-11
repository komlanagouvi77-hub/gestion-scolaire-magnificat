"""Tests du module communication : visibilite des annonces selon le destinataire et le role."""
from django.test import TestCase
from django.urls import reverse

from comptes.models import Administrateur, Enseignant, Parent
from .models import Annonce, Evenement, Message


class VisibiliteAnnonceTests(TestCase):
    def setUp(self):
        self.admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")
        self.parent = Parent.objects.create_user(username="parent1", password="Test2026!")

        Annonce.objects.create(titre="Reunion parents", contenu="...", auteur=self.admin, destinataires="parents")
        Annonce.objects.create(titre="Formation profs", contenu="...", auteur=self.admin, destinataires="enseignants")
        Annonce.objects.create(titre="Rentree scolaire", contenu="...", auteur=self.admin, destinataires="tous")

    def _obtenir_token(self, username):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": "Test2026!"})
        return resp.json()["token"]

    def test_parent_voit_annonces_parents_et_tous_mais_pas_enseignants(self):
        token = self._obtenir_token("parent1")
        resp = self.client.get("/api/annonces/", HTTP_AUTHORIZATION=f"Token {token}")
        titres = {a["titre"] for a in resp.json()["results"]}
        self.assertEqual(titres, {"Reunion parents", "Rentree scolaire"})

    def test_enseignant_ne_peut_pas_publier_une_annonce(self):
        token = self._obtenir_token("prof1")
        resp = self.client.post(
            "/api/annonces/",
            {"titre": "Test", "contenu": "...", "destinataires": "tous"},
            HTTP_AUTHORIZATION=f"Token {token}",
        )
        self.assertEqual(resp.status_code, 403)


class EvenementTests(TestCase):
    """Le calendrier scolaire (jours feries/vacances/evenements) est visible par tout utilisateur connecte."""

    def setUp(self):
        self.admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        Evenement.objects.create(
            titre="Vacances de Noel", type_evenement=Evenement.TYPE_VACANCES,
            date_debut="2026-12-20", date_fin="2027-01-05",
        )

    def test_evenement_visible_sur_la_page_calendrier(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.get(reverse("communication:liste_evenements"))
        self.assertContains(resp, "Vacances de Noel")

    def test_anonyme_ne_peut_pas_voir_le_calendrier(self):
        resp = self.client.get(reverse("communication:liste_evenements"))
        self.assertEqual(resp.status_code, 302)


class MessagerieTests(TestCase):
    """Verifie que la messagerie relie bien un parent aux enseignants de la classe de son enfant, et personne d'autre."""

    def setUp(self):
        from scolarite.models import Classe, Eleve, Matiere

        self.classe = Classe.objects.create(nom="3e A", niveau="3e", annee_scolaire="2026-2027")
        self.eleve = Eleve.objects.create(
            matricule="EL001", nom="Kodjo", prenom="Ama",
            date_naissance="2012-05-10", sexe="F", classe=self.classe,
        )
        self.prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")
        self.prof.classes.add(self.classe)
        self.parent = Parent.objects.create_user(username="parent1", password="Test2026!")
        self.parent.eleves.add(self.eleve)

        self.autre_prof = Enseignant.objects.create_user(username="prof2", password="Test2026!")

    def test_parent_peut_envoyer_un_message_a_l_enseignant_de_son_enfant(self):
        self.client.login(username="parent1", password="Test2026!")
        resp = self.client.post(reverse("communication:messagerie"), {
            "destinataire": self.prof.id,
            "eleve": self.eleve.id,
            "contenu": "Bonjour, question sur les devoirs.",
        })
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Message.objects.count(), 1)

    def test_parent_ne_peut_pas_ecrire_a_un_enseignant_hors_de_la_classe(self):
        self.client.login(username="parent1", password="Test2026!")
        resp = self.client.post(reverse("communication:messagerie"), {
            "destinataire": self.autre_prof.id,
            "eleve": self.eleve.id,
            "contenu": "Test",
        })
        self.assertEqual(resp.status_code, 404)

    def test_administrateur_n_a_pas_acces_a_la_messagerie(self):
        admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.get(reverse("communication:messagerie"))
        self.assertEqual(resp.status_code, 403)


class ApiMessagerieTests(TestCase):
    """
    Verifie l'envoi de message via /api/messages/ (utilisee par le
    frontend React - MessagerieTests ci-dessus ne couvre que l'ancienne
    vue Django classique, /messagerie/, qui repose sur une logique
    differente et ne detecte donc pas les regressions sur l'API REST).
    """

    def setUp(self):
        from scolarite.models import Classe, Eleve

        self.classe = Classe.objects.create(nom="3e A", niveau="3e", annee_scolaire="2026-2027")
        self.eleve = Eleve.objects.create(
            matricule="EL001", nom="Kodjo", prenom="Ama",
            date_naissance="2012-05-10", sexe="F", classe=self.classe,
        )
        self.prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")
        self.prof.classes.add(self.classe)
        self.parent = Parent.objects.create_user(username="parent1", password="Test2026!")
        self.parent.eleves.add(self.eleve)

    def _obtenir_token(self, username):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": "Test2026!"})
        return resp.json()["token"]

    def test_enseignant_peut_envoyer_un_message_au_parent_via_l_api(self):
        """
        Regression : MessageViewSet.perform_create comparait le
        destinataire (resolu par le serializer comme un comptes.Utilisateur,
        la classe ciblee par le ForeignKey) a un queryset de Parent/
        Enseignant (sous-classes en heritage multi-tables) avec "in", qui
        s'appuie sur l'egalite d'instance Django - laquelle compare aussi
        le concrete_model. Utilisateur et Parent etant des concrete_model
        differents, la comparaison echouait TOUJOURS, meme pour le bon
        destinataire : l'envoi de message via l'API (donc depuis React)
        etait entierement casse, silencieusement (200 attendu, 403 obtenu).
        """
        token = self._obtenir_token("prof1")
        resp = self.client.post(
            "/api/messages/",
            {"destinataire": self.parent.id, "eleve": self.eleve.id, "contenu": "Bonjour, question sur les devoirs."},
            content_type="application/json",
            HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Message.objects.count(), 1)
        self.assertEqual(Message.objects.first().destinataire_id, self.parent.id)

    def test_parent_peut_envoyer_un_message_a_l_enseignant_via_l_api(self):
        token = self._obtenir_token("parent1")
        resp = self.client.post(
            "/api/messages/",
            {"destinataire": self.prof.id, "eleve": self.eleve.id, "contenu": "Bonjour, question sur les devoirs."},
            content_type="application/json",
            HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Message.objects.count(), 1)

    def test_enseignant_ne_peut_pas_ecrire_hors_de_son_perimetre_via_l_api(self):
        autre_prof = Enseignant.objects.create_user(username="prof2", password="Test2026!")
        token = self._obtenir_token("prof1")
        resp = self.client.post(
            "/api/messages/",
            {"destinataire": autre_prof.id, "eleve": self.eleve.id, "contenu": "Test"},
            content_type="application/json",
            HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(Message.objects.count(), 0)