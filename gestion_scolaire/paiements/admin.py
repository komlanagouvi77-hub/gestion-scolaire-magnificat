from django.contrib import admin

from .models import FraisScolarite, Paiement


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ("eleve", "tranche", "montant", "mode_paiement", "date_paiement", "annee_scolaire")
    list_filter = ("mode_paiement", "annee_scolaire", "tranche")
    search_fields = ("eleve__nom", "eleve__prenom", "reference")


@admin.register(FraisScolarite)
class FraisScolariteAdmin(admin.ModelAdmin):
    list_display = ("classe", "tranche", "montant_du", "date_limite")
    list_filter = ("classe", "tranche")