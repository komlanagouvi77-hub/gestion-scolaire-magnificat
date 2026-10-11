from django.contrib.auth import views as auth_views
from django.urls import path

from . import views

app_name = "comptes"

urlpatterns = [
    path("connexion/", auth_views.LoginView.as_view(template_name="comptes/login.html"), name="login"),
    path("deconnexion/", auth_views.LogoutView.as_view(), name="logout"),
    path("apres-connexion/", views.redirection_apres_connexion, name="apres_connexion"),
    path("tableau-de-bord/administrateur/", views.dashboard_administrateur, name="dashboard_administrateur"),
    path("tableau-de-bord/enseignant/", views.dashboard_enseignant, name="dashboard_enseignant"),
    path("tableau-de-bord/parent/", views.dashboard_parent, name="dashboard_parent"),
    path("conges/demander/", views.demander_conge_view, name="mes_conges"),
    path("conges/gerer/", views.gerer_conges_view, name="gerer_conges"),
    path("demo-react/", views.demo_react_view, name="demo_react"),
    path("parametres/modifier/", views.modifier_parametres_view, name="modifier_parametres"),
    path("demande-acces/", views.demande_acces_view, name="demande_acces"),
    path("demandes-acces/gerer/", views.gerer_demandes_acces_view, name="gerer_demandes_acces"),
    path("enseignants/liste/", views.liste_enseignants_view, name="liste_enseignants"),
    path("enseignants/<int:enseignant_id>/modifier/", views.modifier_enseignant_view, name="modifier_enseignant"),
    path("enseignants/<int:enseignant_id>/supprimer/", views.supprimer_enseignant_view, name="supprimer_enseignant"),
    path("parents/liste/", views.liste_parents_view, name="liste_parents"),
    path("parents/<int:parent_id>/modifier/", views.modifier_parent_view, name="modifier_parent"),
    path("parents/<int:parent_id>/supprimer/", views.supprimer_parent_view, name="supprimer_parent"),
]