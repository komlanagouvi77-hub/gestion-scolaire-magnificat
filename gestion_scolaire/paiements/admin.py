from typing import Any
from django.contrib import admin

from .models import FraisScolarite, Paiement


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display: Any = ("eleve", "tranche", "montant", "mode_paiement", "date_paiement", "annee_scolaire")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("mode_paiement", "annee_scolaire", "tranche")  # pyrefly: ignore[bad-override-mutable-attribute]
    search_fields: Any = ("eleve__nom", "eleve__prenom", "reference")  # pyrefly: ignore[bad-override-mutable-attribute]


@admin.register(FraisScolarite)
class FraisScolariteAdmin(admin.ModelAdmin):
    list_display: Any = ("classe", "tranche", "montant_du", "date_limite")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("classe", "tranche")  # pyrefly: ignore[bad-override-mutable-attribute]