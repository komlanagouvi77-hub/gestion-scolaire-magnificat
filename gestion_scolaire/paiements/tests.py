from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse

from comptes.models import Administrateur, Enseignant
from scolarite.models import Classe, Eleve
from .models import FraisScolarite, Paiement


def _creer_jeu_de_donnees():
    admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
    prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")
    classe = Classe.objects.create(nom="3e A", niveau="3e", annee_scolaire="2026-2027")
    eleve = Eleve.objects.create(
        matricule="EL001", nom="Kodjo", prenom="Ama",
        date_naissance="2012-01-01", sexe="F", classe=classe,
    )
    return {"admin": admin, "prof": prof, "classe": classe, "eleve": eleve}


class ValidationMontantTests(TestCase):
    """Un paiement doit toujours avoir un montant strictement positif."""

    def setUp(self):
        self.donnees = _creer_jeu_de_donnees()

    def test_montant_positif_est_accepte(self):
        paiement = Paiement(
            eleve=self.donnees["eleve"], montant=Decimal("15000"),
            mode_paiement="especes", annee_scolaire="2026-2027",
        )
        paiement.full_clean()

    def test_montant_nul_est_rejete(self):
        paiement = Paiement(
            eleve=self.donnees["eleve"], montant=Decimal("0"),
            mode_paiement="especes", annee_scolaire="2026-2027",
        )
        with self.assertRaises(ValidationError):
            paiement.full_clean()

    def test_montant_negatif_est_rejete(self):
        paiement = Paiement(
            eleve=self.donnees["eleve"], montant=Decimal("-500"),
            mode_paiement="especes", annee_scolaire="2026-2027",
        )
        with self.assertRaises(ValidationError):
            paiement.full_clean()


class SituationFinanciereTests(TestCase):
    """Verifie le calcul du du/paye/reste par eleve et par tranche."""

    def setUp(self):
        self.donnees = _creer_jeu_de_donnees()
        FraisScolarite.objects.create(classe=self.donnees["classe"], tranche=1, montant_du=Decimal("30000"))

    def test_situation_reflete_les_paiements_deja_faits(self):
        Paiement.objects.create(
            eleve=self.donnees["eleve"], tranche=1, montant=Decimal("20000"),
            mode_paiement="especes", annee_scolaire="2026-2027",
        )
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.get(reverse("paiements:situation_financiere", args=[self.donnees["classe"].id]))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "20000")

    def test_enseignant_ne_peut_pas_voir_la_situation_financiere(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("paiements:situation_financiere", args=[self.donnees["classe"].id]))
        self.assertEqual(resp.status_code, 403)

    def test_administrateur_peut_definir_les_frais(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("paiements:definir_frais", args=[self.donnees["classe"].id]), {
            "montant_2": "28000",
        })
        self.assertEqual(resp.status_code, 302)
        self.assertTrue(FraisScolarite.objects.filter(classe=self.donnees["classe"], tranche=2, montant_du=28000).exists())


class EnregistrementPaiementTests(TestCase):
    """Verifie l'enregistrement d'un paiement depuis l'application et la generation du recu."""

    def setUp(self):
        self.donnees = _creer_jeu_de_donnees()

    def test_administrateur_peut_enregistrer_un_paiement(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("paiements:liste_paiements"), {
            "eleve": self.donnees["eleve"].id, "tranche": 1, "montant": "25000",
            "mode_paiement": "mobile_money", "reference": "TX123", "annee_scolaire": "2026-2027",
        })
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Paiement.objects.count(), 1)
        paiement = Paiement.objects.first()
        self.assertEqual(paiement.enregistre_par.username, self.donnees["admin"].username)

    def test_enseignant_ne_peut_pas_enregistrer_de_paiement(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("paiements:liste_paiements"))
        self.assertEqual(resp.status_code, 403)

    def test_recu_affiche_le_bon_montant(self):
        paiement = Paiement.objects.create(
            eleve=self.donnees["eleve"], montant=15000, mode_paiement="especes", annee_scolaire="2026-2027",
        )
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.get(reverse("paiements:recu_paiement", args=[paiement.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "15000")
        self.assertContains(resp, "Kodjo")

    def test_enseignant_ne_peut_pas_voir_un_recu(self):
        paiement = Paiement.objects.create(
            eleve=self.donnees["eleve"], montant=15000, mode_paiement="especes", annee_scolaire="2026-2027",
        )
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("paiements:recu_paiement", args=[paiement.id]))
        self.assertEqual(resp.status_code, 403)


class ApiSecuritePaiementTests(TestCase):
    """
    Verifie qu'un Parent ne peut JAMAIS creer, modifier ou supprimer un
    paiement via l'API (lecture seule uniquement), meme pour ses propres
    enfants. Sans ce controle, un parent pourrait se declarer "a jour"
    sans avoir reellement paye.
    """

    def setUp(self):
        from comptes.models import Administrateur, Parent
        from scolarite.models import Classe, Eleve
        from .models import Paiement

        self.admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.classe = Classe.objects.create(nom="3e A", niveau="3e", annee_scolaire="2026-2027")
        self.eleve = Eleve.objects.create(
            matricule="EL001", nom="Kodjo", prenom="Ama",
            date_naissance="2012-01-01", sexe="F", classe=self.classe,
        )
        self.parent = Parent.objects.create_user(username="parent1", password="Test2026!")
        self.parent.eleves.add(self.eleve)
        self.paiement = Paiement.objects.create(
            eleve=self.eleve, montant=25000, mode_paiement="especes", annee_scolaire="2026-2027",
        )

    def _obtenir_token(self, username, password):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": password})
        return resp.json()["token"]

    def test_parent_ne_peut_pas_creer_un_paiement_via_api(self):
        token = self._obtenir_token("parent1", "Test2026!")
        resp = self.client.post("/api/paiements/", {
            "eleve": self.eleve.id, "montant": 999999, "mode_paiement": "especes", "annee_scolaire": "2026-2027",
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 403)

    def test_parent_ne_peut_pas_modifier_un_paiement_via_api(self):
        token = self._obtenir_token("parent1", "Test2026!")
        resp = self.client.patch(
            "/api/paiements/" + str(self.paiement.id) + "/",
            data='{"montant": 1}', content_type="application/json",
            HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp.status_code, 403)

    def test_parent_peut_lire_ses_propres_paiements(self):
        token = self._obtenir_token("parent1", "Test2026!")
        resp = self.client.get("/api/paiements/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()["results"]), 1)

    def test_administrateur_peut_creer_un_paiement_via_api(self):
        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.post("/api/paiements/", {
            "eleve": self.eleve.id, "montant": 15000, "mode_paiement": "mobile_money", "annee_scolaire": "2026-2027",
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 201)

class ApiFraisScolariteEtSituationTests(TestCase):
    """Verifie la gestion des frais de scolarite et le calcul de situation financiere via l'API REST."""

    def setUp(self):
        self.donnees = _creer_jeu_de_donnees()

    def _obtenir_token(self, username, password):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": password})
        return resp.json()["token"]

    def test_administrateur_peut_definir_les_frais_via_api(self):
        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.post("/api/frais-scolarite/", {
            "classe": self.donnees["classe"].id, "tranche": 1, "montant_du": "30000",
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(FraisScolarite.objects.filter(classe=self.donnees["classe"], tranche=1, montant_du=30000).exists())

    def test_enseignant_ne_peut_pas_definir_les_frais_via_api(self):
        token = self._obtenir_token("prof1", "Test2026!")
        resp = self.client.post("/api/frais-scolarite/", {
            "classe": self.donnees["classe"].id, "tranche": 1, "montant_du": "30000",
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 403)

    def test_situation_financiere_reflete_les_paiements_via_api(self):
        FraisScolarite.objects.create(classe=self.donnees["classe"], tranche=1, montant_du=Decimal("30000"))
        Paiement.objects.create(
            eleve=self.donnees["eleve"], tranche=1, montant=Decimal("20000"),
            mode_paiement="especes", annee_scolaire="2026-2027",
        )
        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.get(
            "/api/paiements/situation/" + str(self.donnees["classe"].id) + "/",
            HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp.status_code, 200)
        ligne = resp.json()["lignes"][0]
        tranche1 = ligne["tranches"][0]
        self.assertEqual(tranche1["du"], "30000.00")
        self.assertEqual(tranche1["paye"], "20000.00")
        self.assertEqual(tranche1["reste"], "10000.00")

    def test_enseignant_ne_peut_pas_voir_la_situation_financiere_via_api(self):
        token = self._obtenir_token("prof1", "Test2026!")
        resp = self.client.get(
            "/api/paiements/situation/" + str(self.donnees["classe"].id) + "/",
            HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp.status_code, 403)
