from typing import Any
from django.contrib import admin

from .models import Annonce, Evenement, Message


@admin.register(Annonce)
class AnnonceAdmin(admin.ModelAdmin):
    list_display: Any = ("titre", "auteur", "destinataires", "date_publication")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("destinataires",)  # pyrefly: ignore[bad-override-mutable-attribute]


@admin.register(Evenement)
class EvenementAdmin(admin.ModelAdmin):
    list_display: Any = ("titre", "type_evenement", "date_debut", "date_fin")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("type_evenement",)  # pyrefly: ignore[bad-override-mutable-attribute]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display: Any = ("expediteur", "destinataire", "eleve", "date_envoi", "lu")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("lu",)  # pyrefly: ignore[bad-override-mutable-attribute]