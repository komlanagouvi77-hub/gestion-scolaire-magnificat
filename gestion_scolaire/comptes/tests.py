"""
Tests du module comptes : creation des roles, redirection apres connexion,
et controle d'acces base sur le role (decorateur role_requis).
"""
from django.test import TestCase
from django.urls import reverse

from comptes.models import Administrateur, Enseignant, Parent


class RolesUtilisateurTests(TestCase):
    """Verifie que chaque sous-type d'Utilisateur est correctement cree avec son role."""

    def test_creation_administrateur_fixe_le_role(self):
        admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.assertEqual(admin.role, "administrateur")

    def test_creation_enseignant_fixe_le_role(self):
        prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")
        self.assertEqual(prof.role, "enseignant")

    def test_creation_parent_fixe_le_role(self):
        parent = Parent.objects.create_user(username="parent1", password="Test2026!")
        self.assertEqual(parent.role, "parent")


class RedirectionApresConnexionTests(TestCase):
    """Verifie que chaque role est redirige vers son propre tableau de bord."""

    def setUp(self):
        self.admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")
        self.parent = Parent.objects.create_user(username="parent1", password="Test2026!")

    def _connecter_et_suivre(self, username):
        self.client.login(username=username, password="Test2026!")
        return self.client.get(reverse("comptes:apres_connexion"))

    def test_administrateur_redirige_vers_son_dashboard(self):
        resp = self._connecter_et_suivre("admin1")
        self.assertRedirects(resp, reverse("comptes:dashboard_administrateur"))

    def test_enseignant_redirige_vers_son_dashboard(self):
        resp = self._connecter_et_suivre("prof1")
        self.assertRedirects(resp, reverse("comptes:dashboard_enseignant"))

    def test_parent_redirige_vers_son_dashboard(self):
        resp = self._connecter_et_suivre("parent1")
        self.assertRedirects(resp, reverse("comptes:dashboard_parent"))


class ControleAccesDashboardTests(TestCase):
    """
    Verifie qu'un utilisateur ne peut PAS acceder au tableau de bord
    d'un autre role (regression sur le bug de securite corrige precedemment).
    """

    def setUp(self):
        self.prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")
        self.parent = Parent.objects.create_user(username="parent1", password="Test2026!")

    def test_parent_ne_peut_pas_voir_dashboard_enseignant(self):
        self.client.login(username="parent1", password="Test2026!")
        resp = self.client.get(reverse("comptes:dashboard_enseignant"))
        self.assertEqual(resp.status_code, 403)

    def test_enseignant_ne_peut_pas_voir_dashboard_administrateur(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("comptes:dashboard_administrateur"))
        self.assertEqual(resp.status_code, 403)

    def test_anonyme_est_redirige_vers_connexion(self):
        resp = self.client.get(reverse("comptes:dashboard_administrateur"))
        self.assertEqual(resp.status_code, 302)
        self.assertIn(reverse("comptes:login"), resp.url)


class DemandeCongeTests(TestCase):
    """Verifie le circuit complet d'une demande de conge : creation, restriction de role, approbation."""

    def setUp(self):
        self.prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")
        self.admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.parent = Parent.objects.create_user(username="parent1", password="Test2026!")

    def test_enseignant_peut_demander_un_conge(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.post(reverse("comptes:mes_conges"), {
            "date_debut": "2026-12-01", "date_fin": "2026-12-05", "motif": "Raisons familiales",
        })
        self.assertEqual(resp.status_code, 302)
        from .models import DemandeConge
        self.assertEqual(DemandeConge.objects.count(), 1)

    def test_parent_ne_peut_pas_demander_de_conge(self):
        self.client.login(username="parent1", password="Test2026!")
        resp = self.client.get(reverse("comptes:mes_conges"))
        self.assertEqual(resp.status_code, 403)

    def test_administrateur_peut_approuver_une_demande(self):
        from .models import DemandeConge
        demande = DemandeConge.objects.create(
            demandeur=self.prof, date_debut="2026-12-01", date_fin="2026-12-05", motif="Test",
        )
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("comptes:gerer_conges"), {
            "demande_id": demande.id, "action": "approuver",
        })
        self.assertEqual(resp.status_code, 302)
        demande.refresh_from_db()
        self.assertEqual(demande.statut, DemandeConge.STATUT_APPROUVEE)

    def test_enseignant_ne_peut_pas_approuver_de_demandes(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("comptes:gerer_conges"))
        self.assertEqual(resp.status_code, 403)


class DemoReactTests(TestCase):
    """Verifie que la page de demonstration React se charge correctement."""

    def test_page_demo_react_accessible(self):
        resp = self.client.get(reverse("comptes:demo_react"))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "racine-react")


class QuiSuisJeTests(TestCase):
    """Verifie que l'API renvoie le bon role pour chaque type de compte."""

    def test_administrateur_recoit_son_role(self):
        Administrateur.objects.create_user(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("api_token_auth"), {"username": "admin1", "password": "Test2026!"})
        token = resp.json()["token"]
        resp2 = self.client.get(reverse("qui_suis_je"), HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.json()["role"], "administrateur")

    def test_acces_refuse_sans_token(self):
        resp = self.client.get(reverse("qui_suis_je"))
        self.assertEqual(resp.status_code, 401)


class ParametresEcoleTests(TestCase):
    """Verifie la lecture/modification de la configuration de l'etablissement."""

    def test_lecture_accessible_a_tout_utilisateur_connecte(self):
        Enseignant.objects.create_user(username="prof1", password="Test2026!")
        resp = self.client.post(reverse("api_token_auth"), {"username": "prof1", "password": "Test2026!"})
        token = resp.json()["token"]
        resp2 = self.client.get(reverse("parametres_ecole"), HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp2.status_code, 200)
        self.assertIn("nom_ecole", resp2.json())

    def test_seul_administrateur_peut_modifier(self):
        Enseignant.objects.create_user(username="prof1", password="Test2026!")
        resp = self.client.post(reverse("api_token_auth"), {"username": "prof1", "password": "Test2026!"})
        token = resp.json()["token"]
        resp2 = self.client.put(
            reverse("parametres_ecole"), data='{"nom_ecole": "Piratage"}',
            content_type="application/json", HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp2.status_code, 403)

    def test_administrateur_peut_modifier(self):
        Administrateur.objects.create_user(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("api_token_auth"), {"username": "admin1", "password": "Test2026!"})
        token = resp.json()["token"]
        resp2 = self.client.put(
            reverse("parametres_ecole"), data='{"nom_ecole": "Nouveau Nom"}',
            content_type="application/json", HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.json()["nom_ecole"], "Nouveau Nom")


class ValidationTailleImageTests(TestCase):
    """
    Verifie la limite de taille (5 Mo) sur les images uploadees (logo,
    cachet, signature, photo d'eleve). Sans elle, Django accepterait un
    fichier de n'importe quelle taille (voir config/validators.py).
    """

    def test_refuse_une_image_de_plus_de_5_mo(self):
        from django.core.exceptions import ValidationError
        from config.validators import valider_taille_image

        class FauxFichier:
            size = 6 * 1024 * 1024

        with self.assertRaises(ValidationError):
            valider_taille_image(FauxFichier())

    def test_accepte_une_image_de_moins_de_5_mo(self):
        from config.validators import valider_taille_image

        class FauxFichier:
            size = 1 * 1024 * 1024

        valider_taille_image(FauxFichier())  # ne doit pas lever d'exception

    def test_le_champ_logo_est_bien_protege_par_le_validateur(self):
        from .models import Parametres
        from config.validators import valider_taille_image

        self.assertIn(valider_taille_image, Parametres._meta.get_field("logo").validators)
        self.assertIn(valider_taille_image, Parametres._meta.get_field("cachet").validators)
        self.assertIn(valider_taille_image, Parametres._meta.get_field("signature").validators)


class GestionEnseignantParentTests(TestCase):
    """Verifie la creation de comptes Enseignant/Parent depuis l'application (pas /admin/)."""

    def setUp(self):
        self.admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        from scolarite.models import Classe, Matiere, Eleve
        self.classe = Classe.objects.create(nom="3e A", niveau="3e", annee_scolaire="2026-2027")
        self.matiere = Matiere.objects.create(nom="Mathematiques", coefficient=4)
        self.eleve = Eleve.objects.create(
            matricule="EL001", nom="Kodjo", prenom="Ama",
            date_naissance="2012-01-01", sexe="F", classe=self.classe,
        )

    def test_administrateur_peut_creer_un_enseignant_avec_mot_de_passe_fonctionnel(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("comptes:liste_enseignants"), {
            "username": "prof.test", "password": "Enseignant2026!",
            "first_name": "Ama", "last_name": "Prof", "email": "", "telephone": "",
            "specialite": "Mathematiques", "matieres": [self.matiere.id], "classes": [self.classe.id],
        })
        self.assertEqual(resp.status_code, 302)
        from .models import Enseignant
        prof = Enseignant.objects.get(username="prof.test")
        self.assertTrue(prof.check_password("Enseignant2026!"))
        self.assertIn(self.classe, prof.classes.all())

    def test_administrateur_peut_creer_un_parent_avec_enfant_assigne(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("comptes:liste_parents"), {
            "username": "parent.test", "password": "Parent2026!",
            "first_name": "Kossi", "last_name": "Kodjo", "email": "", "telephone": "",
            "profession": "", "eleves": [self.eleve.id],
        })
        self.assertEqual(resp.status_code, 302)
        from .models import Parent
        parent = Parent.objects.get(username="parent.test")
        self.assertTrue(parent.check_password("Parent2026!"))
        self.assertIn(self.eleve, parent.eleves.all())

    def test_enseignant_ne_peut_pas_creer_de_compte_enseignant(self):
        Enseignant.objects.create_user(username="prof1", password="Test2026!")
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("comptes:liste_enseignants"))
        self.assertEqual(resp.status_code, 403)


class ApiEnseignantParentTests(TestCase):
    """Verifie la creation de comptes Enseignant/Parent via l'API REST (utilisee par React)."""

    def setUp(self):
        self.admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        from scolarite.models import Classe, Matiere, Eleve
        self.classe = Classe.objects.create(nom="3e A", niveau="3e", annee_scolaire="2026-2027")
        self.matiere = Matiere.objects.create(nom="Mathematiques", coefficient=4)
        self.eleve = Eleve.objects.create(
            matricule="EL001", nom="Kodjo", prenom="Ama",
            date_naissance="2012-01-01", sexe="F", classe=self.classe,
        )

    def _obtenir_token(self, username, password):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": password})
        return resp.json()["token"]

    def test_administrateur_peut_creer_un_enseignant_via_api(self):
        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.post("/api/enseignants/", {
            "username": "prof.api", "password": "Enseignant2026!",
            "first_name": "Ama", "last_name": "Prof",
            "specialite": "Mathematiques", "matieres": [self.matiere.id], "classes": [self.classe.id],
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 201)
        prof = Enseignant.objects.get(username="prof.api")
        self.assertTrue(prof.check_password("Enseignant2026!"))

    def test_administrateur_peut_creer_un_parent_via_api(self):
        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.post("/api/parents/", {
            "username": "parent.api", "password": "Parent2026!",
            "first_name": "Kossi", "last_name": "Kodjo", "eleves": [self.eleve.id],
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 201)
        parent = Parent.objects.get(username="parent.api")
        self.assertTrue(parent.check_password("Parent2026!"))

    def test_enseignant_ne_peut_pas_lister_les_enseignants_via_api(self):
        Enseignant.objects.create_user(username="prof1", password="Test2026!")
        token = self._obtenir_token("prof1", "Test2026!")
        resp = self.client.get("/api/enseignants/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 403)

    def test_mot_de_passe_jamais_renvoye_dans_la_reponse(self):
        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.post("/api/enseignants/", {
            "username": "prof.secret", "password": "Enseignant2026!",
            "first_name": "Test", "last_name": "Prof",
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertNotIn("password", resp.json())

    def test_modifier_le_mot_de_passe_dun_enseignant_le_hache_toujours(self):
        """
        Regression : EnseignantSerializer.update() doit bien passer par
        set_password() (comme create()), jamais stocker le mot de passe
        recu en clair. La nouvelle valeur doit aussi permettre de se
        reconnecter, et l'ancienne ne doit plus fonctionner.
        """
        prof = Enseignant.objects.create_user(username="prof.maj", password="AncienMdp2026!")
        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.patch(
            "/api/enseignants/{}/".format(prof.id),
            {"password": "NouveauMdp2026!"},
            content_type="application/json",
            HTTP_AUTHORIZATION="Token " + token,
        )
        self.assertEqual(resp.status_code, 200)

        prof.refresh_from_db()
        self.assertTrue(prof.check_password("NouveauMdp2026!"))
        self.assertNotEqual(prof.password, "NouveauMdp2026!")

        resp_ancien = self.client.post(reverse("api_token_auth"), {"username": "prof.maj", "password": "AncienMdp2026!"})
        self.assertEqual(resp_ancien.status_code, 400)
        resp_nouveau = self.client.post(reverse("api_token_auth"), {"username": "prof.maj", "password": "NouveauMdp2026!"})
        self.assertEqual(resp_nouveau.status_code, 200)


class SuppressionEnseignantParentTests(TestCase):
    """Verifie la suppression de comptes Enseignant/Parent depuis l'application."""

    def setUp(self):
        self.admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.prof = Enseignant.objects.create_user(username="prof.suppr", password="Test2026!")
        self.parent = Parent.objects.create_user(username="parent.suppr", password="Test2026!")

    def test_administrateur_peut_supprimer_un_enseignant(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("comptes:supprimer_enseignant", args=[self.prof.id]))
        self.assertEqual(resp.status_code, 302)
        self.assertFalse(Enseignant.objects.filter(id=self.prof.id).exists())

    def test_administrateur_peut_supprimer_un_parent(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("comptes:supprimer_parent", args=[self.parent.id]))
        self.assertEqual(resp.status_code, 302)
        self.assertFalse(Parent.objects.filter(id=self.parent.id).exists())

    def test_enseignant_ne_peut_pas_supprimer_un_autre_enseignant(self):
        autre_prof = Enseignant.objects.create_user(username="prof.cible", password="Test2026!")
        self.client.login(username="prof.suppr", password="Test2026!")
        resp = self.client.post(reverse("comptes:supprimer_enseignant", args=[autre_prof.id]))
        self.assertEqual(resp.status_code, 403)


class ReinitialisationMotDePasseTests(TestCase):
    """Verifie que l'Administrateur peut reinitialiser le mot de passe d'un Enseignant/Parent sans /admin/."""

    def setUp(self):
        self.admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.prof = Enseignant.objects.create_user(username="prof1", password="AncienMdp123")
        self.parent = Parent.objects.create_user(username="parent1", password="AncienMdp123")

    def test_modification_sans_mot_de_passe_ne_change_rien(self):
        self.client.login(username="admin1", password="Test2026!")
        self.client.post(reverse("comptes:modifier_enseignant", args=[self.prof.id]), {
            "first_name": "Ama", "last_name": "Prof", "email": "", "telephone": "", "specialite": "", "password": "",
        })
        self.prof.refresh_from_db()
        self.assertTrue(self.prof.check_password("AncienMdp123"))

    def test_administrateur_peut_reinitialiser_mot_de_passe_enseignant(self):
        self.client.login(username="admin1", password="Test2026!")
        self.client.post(reverse("comptes:modifier_enseignant", args=[self.prof.id]), {
            "first_name": "Ama", "last_name": "Prof", "email": "", "telephone": "", "specialite": "",
            "password": "NouveauMdp456",
        })
        self.prof.refresh_from_db()
        self.assertTrue(self.prof.check_password("NouveauMdp456"))

    def test_administrateur_peut_reinitialiser_mot_de_passe_parent(self):
        self.client.login(username="admin1", password="Test2026!")
        self.client.post(reverse("comptes:modifier_parent", args=[self.parent.id]), {
            "first_name": "Kossi", "last_name": "Kodjo", "email": "", "telephone": "", "profession": "",
            "password": "NouveauMdp789",
        })
        self.parent.refresh_from_db()
        self.assertTrue(self.parent.check_password("NouveauMdp789"))


class ModifierParametresEtablissementTests(TestCase):
    """Verifie la modification des parametres de l'etablissement (incl. logo) sans /admin/."""

    def setUp(self):
        self.admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")

    def test_administrateur_peut_modifier_le_nom_de_l_ecole(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("comptes:modifier_parametres"), {
            "nom_ecole": "Nouveau Nom Ecole", "adresse": "", "telephone": "", "email": "",
            "annee_scolaire_active": "2026-2027", "systeme_periodes": "trimestre",
        })
        self.assertEqual(resp.status_code, 302)
        from .models import Parametres
        self.assertEqual(Parametres.charger().nom_ecole, "Nouveau Nom Ecole")

    def test_enseignant_ne_peut_pas_modifier_les_parametres(self):
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("comptes:modifier_parametres"))
        self.assertEqual(resp.status_code, 403)

    def test_upload_logo_fonctionne(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        import io
        from PIL import Image as PILImage

        tampon = io.BytesIO()
        PILImage.new("RGB", (100, 100), color=(50, 80, 120)).save(tampon, format="PNG")
        tampon.seek(0)
        logo = SimpleUploadedFile("logo.png", tampon.read(), content_type="image/png")

        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("comptes:modifier_parametres"), {
            "nom_ecole": "Ecole Test", "adresse": "", "telephone": "", "email": "",
            "annee_scolaire_active": "2026-2027", "systeme_periodes": "trimestre", "logo": logo,
        })
        self.assertEqual(resp.status_code, 302)
        from .models import Parametres
        self.assertTrue(bool(Parametres.charger().logo))


class CachetSignatureBulletinTests(TestCase):
    """Verifie que le cachet, la signature et le signataire s'enregistrent et s'integrent au PDF du bulletin."""

    def setUp(self):
        self.admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")

    def test_administrateur_peut_enregistrer_signataire(self):
        self.client.login(username="admin1", password="Test2026!")
        resp = self.client.post(reverse("comptes:modifier_parametres"), {
            "nom_ecole": "Ecole Test", "adresse": "", "telephone": "", "email": "",
            "annee_scolaire_active": "2026-2027", "systeme_periodes": "trimestre",
            "nom_signataire": "M. Komla AGBOZO", "titre_signataire": "Le Directeur",
        })
        self.assertEqual(resp.status_code, 302)
        from .models import Parametres
        parametres = Parametres.charger()
        self.assertEqual(parametres.nom_signataire, "M. Komla AGBOZO")
        self.assertEqual(parametres.titre_signataire, "Le Directeur")

    def test_cachet_et_signature_integres_dans_le_pdf(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        import io
        from PIL import Image as PILImage
        from scolarite.models import Classe, Matiere, Eleve, Note
        from scolarite.services import generer_bulletin
        from .models import Parametres

        classe = Classe.objects.create(nom="3e A", niveau="3e", annee_scolaire="2026-2027")
        matiere = Matiere.objects.create(nom="Mathematiques", coefficient=4)
        eleve = Eleve.objects.create(matricule="EL001", nom="Kodjo", prenom="Ama", date_naissance="2012-01-01", sexe="F", classe=classe)
        Note.objects.create(eleve=eleve, matiere=matiere, valeur=15, trimestre=1)

        parametres = Parametres.charger()
        tampon = io.BytesIO()
        PILImage.new("RGBA", (100, 100), (200, 0, 0, 255)).save(tampon, format="PNG")
        tampon.seek(0)
        parametres.cachet.save("cachet.png", SimpleUploadedFile("cachet.png", tampon.read()), save=True)

        bulletin = generer_bulletin(eleve, 1)
        contenu = bulletin.fichier_pdf.read()
        self.assertTrue(contenu.startswith(b"%PDF"))
        self.assertGreater(len(contenu), 5000)


class DemandeInscriptionTests(TestCase):
    """Verifie le circuit complet : demande publique -> validation admin -> compte reel fonctionnel."""

    def test_demande_enseignant_puis_approbation_cree_un_compte_fonctionnel(self):
        resp = self.client.post(reverse("comptes:demande_acces"), {
            "type_compte": "enseignant", "username_souhaite": "nouveau.prof",
            "password": "MotDePasseChoisi2026!", "first_name": "Ama", "last_name": "Prof",
            "email": "", "telephone": "", "specialite": "Physique", "profession": "", "matricules_enfants": "",
        })
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Demande envoyee")

        from .models import DemandeInscription
        demande = DemandeInscription.objects.get(username_souhaite="nouveau.prof")
        self.assertEqual(demande.statut, DemandeInscription.STATUT_EN_ATTENTE)

        admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.client.login(username="admin1", password="Test2026!")
        resp2 = self.client.post(reverse("comptes:gerer_demandes_acces"), {
            "demande_id": demande.id, "action": "approuver",
        })
        self.assertEqual(resp2.status_code, 302)

        prof = Enseignant.objects.get(username="nouveau.prof")
        self.assertTrue(prof.check_password("MotDePasseChoisi2026!"))
        self.assertEqual(prof.specialite, "Physique")

    def test_demande_parent_avec_enfant_est_liee_automatiquement(self):
        from scolarite.models import Classe, Eleve
        classe = Classe.objects.create(nom="3e A", niveau="3e", annee_scolaire="2026-2027")
        eleve = Eleve.objects.create(matricule="EL777", nom="Test", prenom="Enfant", date_naissance="2012-01-01", sexe="M", classe=classe)

        self.client.post(reverse("comptes:demande_acces"), {
            "type_compte": "parent", "username_souhaite": "nouveau.parent",
            "password": "MotDePasseParent2026!", "first_name": "Kossi", "last_name": "Test",
            "email": "", "telephone": "", "specialite": "", "profession": "Commercant", "matricules_enfants": "EL777",
        })
        from .models import DemandeInscription
        demande = DemandeInscription.objects.get(username_souhaite="nouveau.parent")

        admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.client.login(username="admin1", password="Test2026!")
        self.client.post(reverse("comptes:gerer_demandes_acces"), {
            "demande_id": demande.id, "action": "approuver",
        })

        parent = Parent.objects.get(username="nouveau.parent")
        self.assertTrue(parent.check_password("MotDePasseParent2026!"))
        self.assertIn(eleve, parent.eleves.all())

    def test_refus_ne_cree_aucun_compte(self):
        self.client.post(reverse("comptes:demande_acces"), {
            "type_compte": "enseignant", "username_souhaite": "refuse.prof",
            "password": "MotDePasse2026!", "first_name": "X", "last_name": "Y",
            "email": "", "telephone": "", "specialite": "", "profession": "", "matricules_enfants": "",
        })
        from .models import DemandeInscription
        demande = DemandeInscription.objects.get(username_souhaite="refuse.prof")

        admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.client.login(username="admin1", password="Test2026!")
        self.client.post(reverse("comptes:gerer_demandes_acces"), {
            "demande_id": demande.id, "action": "refuser", "motif_refus": "Non reconnu",
        })

        self.assertFalse(Enseignant.objects.filter(username="refuse.prof").exists())
        demande.refresh_from_db()
        self.assertEqual(demande.statut, DemandeInscription.STATUT_REFUSEE)

    def test_non_admin_ne_peut_pas_valider_de_demandes(self):
        prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")
        self.client.login(username="prof1", password="Test2026!")
        resp = self.client.get(reverse("comptes:gerer_demandes_acces"))
        self.assertEqual(resp.status_code, 403)

    def test_approbation_envoie_un_email_de_confirmation(self):
        from django.core import mail
        from .models import DemandeInscription

        self.client.post(reverse("comptes:demande_acces"), {
            "type_compte": "enseignant", "username_souhaite": "prof.email",
            "password": "MotDePasse2026!", "first_name": "Ama", "last_name": "Prof",
            "email": "ama.prof@example.com", "telephone": "", "specialite": "Physique",
            "profession": "", "matricules_enfants": "",
        })
        demande = DemandeInscription.objects.get(username_souhaite="prof.email")

        admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.client.login(username="admin1", password="Test2026!")
        self.client.post(reverse("comptes:gerer_demandes_acces"), {
            "demande_id": demande.id, "action": "approuver",
        })

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["ama.prof@example.com"])
        self.assertIn("prof.email", mail.outbox[0].body)

        # L'email doit avoir une alternative HTML (pas seulement du texte
        # brut) contenant le nom de l'ecole et le prenom du destinataire.
        html_alternatives = [c for c, mimetype in mail.outbox[0].alternatives if mimetype == "text/html"]
        self.assertEqual(len(html_alternatives), 1)
        self.assertIn("Ama", html_alternatives[0])
        self.assertIn("Complexe Scolaire Magnificat", html_alternatives[0])

    def test_email_approbation_integre_le_logo_de_l_etablissement(self):
        import io
        from django.core import mail
        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image as PILImage
        from .models import DemandeInscription, Parametres

        tampon = io.BytesIO()
        PILImage.new("RGB", (80, 80), color=(10, 37, 64)).save(tampon, format="PNG")
        tampon.seek(0)
        parametres = Parametres.charger()
        parametres.logo.save("logo_test.png", SimpleUploadedFile("logo_test.png", tampon.read(), content_type="image/png"), save=True)

        self.client.post(reverse("comptes:demande_acces"), {
            "type_compte": "enseignant", "username_souhaite": "prof.logo.email",
            "password": "MotDePasse2026!", "first_name": "Eli", "last_name": "Prof",
            "email": "eli.prof@example.com", "telephone": "", "specialite": "",
            "profession": "", "matricules_enfants": "",
        })
        demande = DemandeInscription.objects.get(username_souhaite="prof.logo.email")

        Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.client.login(username="admin1", password="Test2026!")
        self.client.post(reverse("comptes:gerer_demandes_acces"), {
            "demande_id": demande.id, "action": "approuver",
        })

        self.assertEqual(len(mail.outbox), 1)
        html = [c for c, mimetype in mail.outbox[0].alternatives if mimetype == "text/html"][0]
        self.assertIn("cid:logo_ecole", html)
        # L'image du logo doit etre jointe (encodee en base64 dans le MIME).
        message_brut = mail.outbox[0].message().as_string()
        self.assertIn("Content-ID: <logo_ecole>", message_brut)

    def test_refus_envoie_un_email_avec_le_motif(self):
        from django.core import mail
        from .models import DemandeInscription

        self.client.post(reverse("comptes:demande_acces"), {
            "type_compte": "enseignant", "username_souhaite": "prof.refus.email",
            "password": "MotDePasse2026!", "first_name": "Kodjo", "last_name": "Prof",
            "email": "kodjo.prof@example.com", "telephone": "", "specialite": "",
            "profession": "", "matricules_enfants": "",
        })
        demande = DemandeInscription.objects.get(username_souhaite="prof.refus.email")

        admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.client.login(username="admin1", password="Test2026!")
        self.client.post(reverse("comptes:gerer_demandes_acces"), {
            "demande_id": demande.id, "action": "refuser", "motif_refus": "Poste deja pourvu",
        })

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["kodjo.prof@example.com"])
        self.assertIn("Poste deja pourvu", mail.outbox[0].body)

    def test_aucun_email_envoye_si_la_demande_n_en_fournit_pas(self):
        from django.core import mail
        from .models import DemandeInscription

        self.client.post(reverse("comptes:demande_acces"), {
            "type_compte": "enseignant", "username_souhaite": "prof.sans.email",
            "password": "MotDePasse2026!", "first_name": "X", "last_name": "Y",
            "email": "", "telephone": "", "specialite": "", "profession": "", "matricules_enfants": "",
        })
        demande = DemandeInscription.objects.get(username_souhaite="prof.sans.email")

        admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.client.login(username="admin1", password="Test2026!")
        self.client.post(reverse("comptes:gerer_demandes_acces"), {
            "demande_id": demande.id, "action": "approuver",
        })

        self.assertEqual(len(mail.outbox), 0)


class ApiDemandeInscriptionTests(TestCase):
    """Verifie le circuit complet via l'API REST (utilisee par React)."""

    def _obtenir_token(self, username, password):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": password})
        return resp.json()["token"]

    def test_creation_publique_sans_token_fonctionne(self):
        resp = self.client.post("/api/demandes-acces/", {
            "type_compte": "enseignant", "username_souhaite": "api.prof",
            "password": "MotDePasseApi2026!", "first_name": "Test", "last_name": "Prof", "specialite": "Chimie",
        })
        self.assertEqual(resp.status_code, 201)
        self.assertNotIn("password", resp.json())

    def test_approbation_via_api_cree_un_compte_fonctionnel(self):
        self.client.post("/api/demandes-acces/", {
            "type_compte": "enseignant", "username_souhaite": "api.prof2",
            "password": "MotDePasseApi2026!", "first_name": "Test", "last_name": "Prof", "specialite": "Chimie",
        })
        from .models import DemandeInscription
        demande = DemandeInscription.objects.get(username_souhaite="api.prof2")

        admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.post(f"/api/demandes-acces/{demande.id}/approuver/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 200)

        prof = Enseignant.objects.get(username="api.prof2")
        self.assertTrue(prof.check_password("MotDePasseApi2026!"))

    def test_approbation_via_api_envoie_un_email(self):
        from django.core import mail

        self.client.post("/api/demandes-acces/", {
            "type_compte": "enseignant", "username_souhaite": "api.prof.email",
            "password": "MotDePasseApi2026!", "first_name": "Test", "last_name": "Prof",
            "specialite": "Chimie", "email": "api.prof@example.com",
        })
        from .models import DemandeInscription
        demande = DemandeInscription.objects.get(username_souhaite="api.prof.email")

        Administrateur.objects.create_user(username="admin1", password="Test2026!")
        token = self._obtenir_token("admin1", "Test2026!")
        self.client.post(f"/api/demandes-acces/{demande.id}/approuver/", HTTP_AUTHORIZATION="Token " + token)

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["api.prof@example.com"])

    def test_refus_via_api_envoie_un_email(self):
        from django.core import mail

        self.client.post("/api/demandes-acces/", {
            "type_compte": "parent", "username_souhaite": "api.parent.email",
            "password": "MotDePasseApi2026!", "first_name": "Test", "last_name": "Parent",
            "email": "api.parent@example.com",
        })
        from .models import DemandeInscription
        demande = DemandeInscription.objects.get(username_souhaite="api.parent.email")

        Administrateur.objects.create_user(username="admin1", password="Test2026!")
        token = self._obtenir_token("admin1", "Test2026!")
        self.client.post(
            f"/api/demandes-acces/{demande.id}/refuser/",
            {"motif_refus": "Dossier incomplet"},
            content_type="application/json",
            HTTP_AUTHORIZATION="Token " + token,
        )

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Dossier incomplet", mail.outbox[0].body)

    def test_non_admin_ne_peut_pas_lister_via_api(self):
        prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")
        token = self._obtenir_token("prof1", "Test2026!")
        resp = self.client.get("/api/demandes-acces/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 403)

    def test_non_admin_ne_peut_pas_approuver_via_api(self):
        self.client.post("/api/demandes-acces/", {
            "type_compte": "parent", "username_souhaite": "api.parent",
            "password": "MotDePasseApi2026!", "first_name": "Test", "last_name": "Parent",
        })
        from .models import DemandeInscription
        demande = DemandeInscription.objects.get(username_souhaite="api.parent")

        prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")
        token = self._obtenir_token("prof1", "Test2026!")
        resp = self.client.post(f"/api/demandes-acces/{demande.id}/approuver/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 403)
        self.assertFalse(Parent.objects.filter(username="api.parent").exists())

    def test_validation_rejet_telephone_avec_lettres(self):
        resp = self.client.post("/api/demandes-acces/", {
            "type_compte": "enseignant", "username_souhaite": "test.tel",
            "password": "Password2026!", "first_name": "Jean", "last_name": "Dupont",
            "telephone": "Snsnnsk",
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("telephone", resp.json())

    def test_validation_rejet_mot_de_passe_sans_chiffre(self):
        resp = self.client.post("/api/demandes-acces/", {
            "type_compte": "enseignant", "username_souhaite": "test.mdp",
            "password": "MotDePasseSansChiffre", "first_name": "Jean", "last_name": "Dupont",
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("password", resp.json())

    def test_validation_rejet_username_trop_court(self):
        resp = self.client.post("/api/demandes-acces/", {
            "type_compte": "enseignant", "username_souhaite": "hi",
            "password": "Password2026!", "first_name": "Jean", "last_name": "Dupont",
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("username_souhaite", resp.json())

class ApiDemandeCongeTests(TestCase):
    """Verifie le circuit de demande de conge via l'API REST (utilisee par React)."""

    def setUp(self):
        self.admin = Administrateur.objects.create_user(username="admin1", password="Test2026!")
        self.prof = Enseignant.objects.create_user(username="prof1", password="Test2026!")
        self.parent = Parent.objects.create_user(username="parent1", password="Test2026!")

    def _obtenir_token(self, username, password):
        resp = self.client.post(reverse("api_token_auth"), {"username": username, "password": password})
        return resp.json()["token"]

    def test_un_enseignant_peut_demander_un_conge(self):
        token = self._obtenir_token("prof1", "Test2026!")
        resp = self.client.post("/api/conges/", {
            "date_debut": "2026-09-01", "date_fin": "2026-09-05", "motif": "Raisons familiales",
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 201)
        from .models import DemandeConge
        demande = DemandeConge.objects.get()
        self.assertEqual(demande.demandeur.pk, self.prof.pk)
        self.assertEqual(demande.statut, DemandeConge.STATUT_EN_ATTENTE)

    def test_un_parent_ne_peut_pas_demander_un_conge(self):
        token = self._obtenir_token("parent1", "Test2026!")
        resp = self.client.post("/api/conges/", {
            "date_debut": "2026-09-01", "date_fin": "2026-09-05", "motif": "Test",
        }, HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 403)

    def test_un_enseignant_ne_voit_que_ses_propres_demandes(self):
        from .models import DemandeConge
        autre_prof = Enseignant.objects.create_user(username="prof2", password="Test2026!")
        DemandeConge.objects.create(demandeur=self.prof, date_debut="2026-09-01", date_fin="2026-09-02", motif="A")
        DemandeConge.objects.create(demandeur=autre_prof, date_debut="2026-09-03", date_fin="2026-09-04", motif="B")

        token = self._obtenir_token("prof1", "Test2026!")
        resp = self.client.get("/api/conges/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 200)
        resultats = resp.json()["results"]
        self.assertEqual(len(resultats), 1)
        self.assertEqual(resultats[0]["motif"], "A")

    def test_administrateur_voit_toutes_les_demandes(self):
        from .models import DemandeConge
        DemandeConge.objects.create(demandeur=self.prof, date_debut="2026-09-01", date_fin="2026-09-02", motif="A")

        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.get("/api/conges/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()["results"]), 1)

    def test_administrateur_peut_approuver_une_demande(self):
        from .models import DemandeConge
        demande = DemandeConge.objects.create(demandeur=self.prof, date_debut="2026-09-01", date_fin="2026-09-02", motif="A")

        token = self._obtenir_token("admin1", "Test2026!")
        resp = self.client.post(f"/api/conges/{demande.id}/approuver/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 200)
        demande.refresh_from_db()
        self.assertEqual(demande.statut, DemandeConge.STATUT_APPROUVEE)
        self.assertEqual(demande.traite_par.pk, self.admin.pk)

    def test_un_enseignant_ne_peut_pas_approuver_une_demande(self):
        from .models import DemandeConge
        demande = DemandeConge.objects.create(demandeur=self.prof, date_debut="2026-09-01", date_fin="2026-09-02", motif="A")

        token = self._obtenir_token("prof1", "Test2026!")
        resp = self.client.post(f"/api/conges/{demande.id}/approuver/", HTTP_AUTHORIZATION="Token " + token)
        self.assertEqual(resp.status_code, 403)
        demande.refresh_from_db()
        self.assertEqual(demande.statut, DemandeConge.STATUT_EN_ATTENTE)
