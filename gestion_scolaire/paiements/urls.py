from django.urls import path

from . import views

app_name = "paiements"

urlpatterns = [
    path("classes/<int:classe_id>/situation/", views.situation_financiere_view, name="situation_financiere"),
    path("classes/<int:classe_id>/frais/definir/", views.definir_frais_view, name="definir_frais"),
    path("liste/", views.liste_paiements_view, name="liste_paiements"),
    path("<int:paiement_id>/recu/", views.recu_paiement_view, name="recu_paiement"),
]