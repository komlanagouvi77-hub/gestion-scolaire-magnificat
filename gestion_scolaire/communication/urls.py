from django.urls import path

from . import views

app_name = "communication"

urlpatterns = [
    path("evenements/", views.liste_evenements_view, name="liste_evenements"),
    path("messagerie/", views.messagerie_view, name="messagerie"),
]