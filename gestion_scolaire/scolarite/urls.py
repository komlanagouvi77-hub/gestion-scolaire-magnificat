from django.urls import path

from . import views

app_name = "scolarite"

urlpatterns = [
    path("bulletins/", views.liste_bulletins_view, name="liste_bulletins"),
    path("bulletins/generer/<int:eleve_id>/<int:trimestre>/", views.generer_bulletin_view, name="generer_bulletin"),
    path("bulletins/<int:bulletin_id>/telecharger/", views.telecharger_bulletin_view, name="telecharger_bulletin"),
    path("notes/saisir/", views.saisir_notes_view, name="saisir_notes"),
    path("absences/saisir/", views.saisir_absences_view, name="saisir_absences"),
    path("classes/<int:classe_id>/gestion/", views.gestion_classe_view, name="gestion_classe"),
    path("eleves/<int:eleve_id>/fiche/", views.fiche_eleve_view, name="fiche_eleve"),
    path("eleves/importer/", views.importer_eleves_view, name="importer_eleves"),
    path("eleves/gabarit/", views.telecharger_gabarit_eleves_view, name="telecharger_gabarit_eleves"),
    path("classes/liste/", views.liste_classes_view, name="liste_classes"),
    path("classes/<int:classe_id>/modifier/", views.modifier_classe_view, name="modifier_classe"),
    path("classes/<int:classe_id>/supprimer/", views.supprimer_classe_view, name="supprimer_classe"),
    path("matieres/liste/", views.liste_matieres_view, name="liste_matieres"),
    path("matieres/<int:matiere_id>/modifier/", views.modifier_matiere_view, name="modifier_matiere"),
    path("matieres/<int:matiere_id>/supprimer/", views.supprimer_matiere_view, name="supprimer_matiere"),
    path("eleves/<int:eleve_id>/modifier/", views.modifier_eleve_view, name="modifier_eleve"),
    path("eleves/<int:eleve_id>/supprimer/", views.supprimer_eleve_view, name="supprimer_eleve"),
    path("cours/liste/", views.liste_cours_view, name="liste_cours"),
    path("cours/<int:cours_id>/supprimer/", views.supprimer_cours_view, name="supprimer_cours"),
]