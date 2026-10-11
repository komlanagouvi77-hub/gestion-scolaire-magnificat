from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework import routers
from rest_framework.authtoken.views import obtain_auth_token

from comptes.views_api import (
    DemandeCongeViewSet,
    DemandeInscriptionViewSet,
    EnseignantViewSet,
    ParentViewSet,
    identite_publique_ecole,
    parametres_ecole,
    qui_suis_je,
)
from communication.views_api import AnnonceViewSet, EvenementViewSet, MessageViewSet, correspondants_messagerie
from paiements.views_api import FraisScolariteViewSet, PaiementViewSet, situation_financiere
from scolarite.views_api import (
    AbsenceViewSet,
    BulletinViewSet,
    ClasseViewSet,
    CoursViewSet,
    EleveViewSet,
    MatiereViewSet,
    NoteViewSet,
    ObservationViewSet,
    importer_eleves_csv,
    suivi_saisie_notes,
)

router = routers.DefaultRouter()
router.register(r"classes", ClasseViewSet, basename="classe")
router.register(r"matieres", MatiereViewSet, basename="matiere")
router.register(r"eleves", EleveViewSet, basename="eleve")
router.register(r"notes", NoteViewSet, basename="note")
router.register(r"absences", AbsenceViewSet, basename="absence")
router.register(r"bulletins", BulletinViewSet, basename="bulletin")
router.register(r"cours", CoursViewSet, basename="cours")
router.register(r"observations", ObservationViewSet, basename="observation")
router.register(r"paiements", PaiementViewSet, basename="paiement")
router.register(r"frais-scolarite", FraisScolariteViewSet, basename="frais-scolarite")
router.register(r"annonces", AnnonceViewSet, basename="annonce")
router.register(r"evenements", EvenementViewSet, basename="evenement")
router.register(r"messages", MessageViewSet, basename="message")
router.register(r"enseignants", EnseignantViewSet, basename="enseignant")
router.register(r"parents", ParentViewSet, basename="parent")
router.register(r"demandes-acces", DemandeInscriptionViewSet, basename="demande-acces")
router.register(r"conges", DemandeCongeViewSet, basename="conge")

urlpatterns = [
    # POST username/password ici -> recoit un token a utiliser dans Postman
    path("token/", obtain_auth_token, name="api_token_auth"),
    # Identite et role de l'utilisateur connecte (pour adapter le frontend)
    path("whoami/", qui_suis_je, name="qui_suis_je"),
    # Configuration de l'etablissement (nom, logo, annee scolaire active...)
    path("parametres/", parametres_ecole, name="parametres_ecole"),
    # Nom + logo de l'ecole, accessible SANS connexion (ecran de connexion)
    path("identite-publique/", identite_publique_ecole, name="identite_publique_ecole"),
    # Suivi de la saisie des notes par enseignant/classe/matiere (Administrateur)
    path("suivi-saisie/", suivi_saisie_notes, name="suivi_saisie_notes"),
    # Import en masse d'eleves depuis un fichier CSV (Administrateur)
    path("eleves/importer-csv/", importer_eleves_csv, name="importer_eleves_csv"),
    # Correspondants valides pour la messagerie (Enseignant <-> Parent)
    path("messagerie/correspondants/", correspondants_messagerie, name="correspondants_messagerie"),
    # Situation financiere (du/paye/reste par eleve et par tranche) d'une classe
    path("paiements/situation/<int:classe_id>/", situation_financiere, name="situation_financiere"),
    # Documentation interactive de l'API
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("", include(router.urls)),
]