from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Administrateur, DemandeConge, Enseignant, Parametres, Parent, Utilisateur


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    list_display = ("username", "first_name", "last_name", "role", "telephone", "is_active")
    list_filter = ("role", "is_active")


@admin.register(Administrateur)
class AdministrateurAdmin(UserAdmin):
    list_display = ("username", "first_name", "last_name", "service")
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Informations personnelles", {"fields": ("first_name", "last_name", "email")}),
        ("Statut", {"fields": ("is_active", "is_staff")}),
        ("Dates importantes", {"fields": ("last_login", "date_joined")}),
        ("Informations Administrateur", {"fields": ("service",)}),
    )


@admin.register(Enseignant)
class EnseignantAdmin(UserAdmin):
    list_display = ("username", "first_name", "last_name", "specialite")
    filter_horizontal = ("matieres", "classes")
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Informations personnelles", {"fields": ("first_name", "last_name", "email")}),
        ("Statut", {"fields": ("is_active",)}),
        ("Dates importantes", {"fields": ("last_login", "date_joined")}),
        ("Informations Enseignant", {"fields": ("specialite", "matieres", "classes")}),
    )


@admin.register(Parent)
class ParentAdmin(UserAdmin):
    list_display = ("username", "first_name", "last_name", "profession")
    filter_horizontal = ("eleves",)
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Informations personnelles", {"fields": ("first_name", "last_name", "email")}),
        ("Statut", {"fields": ("is_active",)}),
        ("Dates importantes", {"fields": ("last_login", "date_joined")}),
        ("Informations Parent", {"fields": ("profession", "eleves")}),
    )


@admin.register(DemandeConge)
class DemandeCongeAdmin(admin.ModelAdmin):
    list_display = ("demandeur", "date_debut", "date_fin", "statut", "traite_par")
    list_filter = ("statut",)


@admin.register(Parametres)
class ParametresAdmin(admin.ModelAdmin):
    list_display = ("nom_ecole", "annee_scolaire_active", "systeme_periodes")

    def has_add_permission(self, request):
        # Singleton : on empeche la creation d'une deuxieme ligne depuis l'admin.
        return not Parametres.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False