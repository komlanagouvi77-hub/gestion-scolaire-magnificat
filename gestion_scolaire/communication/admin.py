from django.contrib import admin

from .models import Annonce, Evenement, Message


@admin.register(Annonce)
class AnnonceAdmin(admin.ModelAdmin):
    list_display = ("titre", "auteur", "destinataires", "date_publication")
    list_filter = ("destinataires",)


@admin.register(Evenement)
class EvenementAdmin(admin.ModelAdmin):
    list_display = ("titre", "type_evenement", "date_debut", "date_fin")
    list_filter = ("type_evenement",)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("expediteur", "destinataire", "eleve", "date_envoi", "lu")
    list_filter = ("lu",)