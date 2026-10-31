from typing import Any
from django.contrib import admin

from .models import Absence, Bulletin, Classe, Cours, Eleve, Matiere, Note, Observation


@admin.register(Classe)
class ClasseAdmin(admin.ModelAdmin):
    list_display: Any = ("nom", "niveau", "annee_scolaire")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("annee_scolaire", "niveau")  # pyrefly: ignore[bad-override-mutable-attribute]


@admin.register(Matiere)
class MatiereAdmin(admin.ModelAdmin):
    list_display: Any = ("nom", "coefficient")  # pyrefly: ignore[bad-override-mutable-attribute]


@admin.register(Eleve)
class EleveAdmin(admin.ModelAdmin):
    list_display: Any = ("matricule", "nom", "prenom", "classe", "sexe")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("classe", "sexe")  # pyrefly: ignore[bad-override-mutable-attribute]
    search_fields: Any = ("matricule", "nom", "prenom")  # pyrefly: ignore[bad-override-mutable-attribute]


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display: Any = ("eleve", "matiere", "type_evaluation", "trimestre", "valeur", "enseignant")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("trimestre", "matiere", "type_evaluation")  # pyrefly: ignore[bad-override-mutable-attribute]


@admin.register(Bulletin)
class BulletinAdmin(admin.ModelAdmin):
    list_display: Any = ("eleve", "trimestre", "moyenne_generale", "rang", "effectif_classe", "decision_conseil")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("trimestre",)  # pyrefly: ignore[bad-override-mutable-attribute]
    fields: Any = ("eleve", "trimestre", "moyenne_generale", "rang", "effectif_classe", "decision_conseil", "fichier_pdf")  # pyrefly: ignore[bad-override-mutable-attribute]


@admin.register(Absence)
class AbsenceAdmin(admin.ModelAdmin):
    list_display: Any = ("eleve", "date", "justifiee")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("justifiee", "date")  # pyrefly: ignore[bad-override-mutable-attribute]


@admin.register(Cours)
class CoursAdmin(admin.ModelAdmin):
    list_display: Any = ("jour", "heure_debut", "heure_fin", "matiere", "classe", "enseignant", "salle")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("jour", "classe", "enseignant")  # pyrefly: ignore[bad-override-mutable-attribute]


@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    list_display: Any = ("eleve", "type_observation", "enseignant", "visible_parent", "date_observation")  # pyrefly: ignore[bad-override-mutable-attribute]
    list_filter: Any = ("type_observation", "visible_parent")  # pyrefly: ignore[bad-override-mutable-attribute]