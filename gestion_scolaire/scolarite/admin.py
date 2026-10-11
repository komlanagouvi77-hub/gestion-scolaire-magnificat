from django.contrib import admin

from .models import Absence, Bulletin, Classe, Cours, Eleve, Matiere, Note, Observation


@admin.register(Classe)
class ClasseAdmin(admin.ModelAdmin):
    list_display = ("nom", "niveau", "annee_scolaire")
    list_filter = ("annee_scolaire", "niveau")


@admin.register(Matiere)
class MatiereAdmin(admin.ModelAdmin):
    list_display = ("nom", "coefficient")


@admin.register(Eleve)
class EleveAdmin(admin.ModelAdmin):
    list_display = ("matricule", "nom", "prenom", "classe", "sexe")
    list_filter = ("classe", "sexe")
    search_fields = ("matricule", "nom", "prenom")


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("eleve", "matiere", "type_evaluation", "trimestre", "valeur", "enseignant")
    list_filter = ("trimestre", "matiere", "type_evaluation")


@admin.register(Bulletin)
class BulletinAdmin(admin.ModelAdmin):
    list_display = ("eleve", "trimestre", "moyenne_generale", "rang", "effectif_classe", "decision_conseil")
    list_filter = ("trimestre",)
    fields = ("eleve", "trimestre", "moyenne_generale", "rang", "effectif_classe", "decision_conseil", "fichier_pdf")


@admin.register(Absence)
class AbsenceAdmin(admin.ModelAdmin):
    list_display = ("eleve", "date", "justifiee")
    list_filter = ("justifiee", "date")


@admin.register(Cours)
class CoursAdmin(admin.ModelAdmin):
    list_display = ("jour", "heure_debut", "heure_fin", "matiere", "classe", "enseignant", "salle")
    list_filter = ("jour", "classe", "enseignant")


@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    list_display = ("eleve", "type_observation", "enseignant", "visible_parent", "date_observation")
    list_filter = ("type_observation", "visible_parent")