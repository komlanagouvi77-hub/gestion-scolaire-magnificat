from typing import Any
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Administrateur, DemandeConge, Enseignant, Parametres, Parent, Utilisateur


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    list_display: Any = ("username", "first_name", "last_name", "role", "telephone", "is_active")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("role", "is_active")  # pyrefly: ignore[bad-override-mutable-attribute]


@admin.register(Administrateur)
class AdministrateurAdmin(UserAdmin):
    list_display: Any = ("username", "first_name", "last_name", "service")  # pyrefly: ignore[bad-override-mutable-attribute]
    fieldsets: Any = (  # pyrefly: ignore[bad-override-mutable-attribute]
        (None, {"fields": ("username", "password")}),
        ("Informations personnelles", {"fields": ("first_name", "last_name", "email")}),
        ("Statut", {"fields": ("is_active", "is_staff")}),
        ("Dates importantes", {"fields": ("last_login", "date_joined")}),
        ("Informations Administrateur", {"fields": ("service",)}),
    )


@admin.register(Enseignant)
class EnseignantAdmin(UserAdmin):
    list_display: Any = ("username", "first_name", "last_name", "specialite")  # pyrefly: ignore[bad-override-mutable-attribute]
    filter_horizontal: Any = ("matieres", "classes")  # pyrefly: ignore[bad-override-mutable-attribute]
    fieldsets: Any = (  # pyrefly: ignore[bad-override-mutable-attribute]
        (None, {"fields": ("username", "password")}),
        ("Informations personnelles", {"fields": ("first_name", "last_name", "email")}),
        ("Statut", {"fields": ("is_active",)}),
        ("Dates importantes", {"fields": ("last_login", "date_joined")}),
        ("Informations Enseignant", {"fields": ("specialite", "matieres", "classes")}),
    )


@admin.register(Parent)
class ParentAdmin(UserAdmin):
    list_display: Any = ("username", "first_name", "last_name", "profession")  # pyrefly: ignore[bad-override-mutable-attribute]
    filter_horizontal: Any = ("eleves",)  # pyrefly: ignore[bad-override-mutable-attribute]
    fieldsets: Any = (  # pyrefly: ignore[bad-override-mutable-attribute]
        (None, {"fields": ("username", "password")}),
        ("Informations personnelles", {"fields": ("first_name", "last_name", "email")}),
        ("Statut", {"fields": ("is_active",)}),
        ("Dates importantes", {"fields": ("last_login", "date_joined")}),
        ("Informations Parent", {"fields": ("profession", "eleves")}),
    )


@admin.register(DemandeConge)
class DemandeCongeAdmin(admin.ModelAdmin):
    list_display: Any = ("demandeur", "date_debut", "date_fin", "statut", "traite_par")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("statut",)  # pyrefly: ignore[bad-override-mutable-attribute]


@admin.register(Parametres)
class ParametresAdmin(admin.ModelAdmin):
    list_display: Any = ("nom_ecole", "annee_scolaire_active", "systeme_periodes")  # pyrefly: ignore[bad-override-mutable-attribute]

    def has_add_permission(self, request):
        # Singleton : on empeche la creation d'une deuxieme ligne depuis l'admin.
        return not Parametres.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False