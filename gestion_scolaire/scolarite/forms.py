from django import forms

from .models import Classe, Cours, Eleve, Matiere


class ClasseForm(forms.ModelForm):
    class Meta:
        model = Classe
        fields = ["nom", "niveau", "annee_scolaire"]
        widgets = {
            "nom": forms.TextInput(attrs={"placeholder": "Ex: 3e A"}),
            "niveau": forms.TextInput(attrs={"placeholder": "Ex: 6e, 5e, 4e, 3e, 2nde, 1ere, Terminale"}),
            "annee_scolaire": forms.TextInput(attrs={"placeholder": "Ex: 2026-2027"}),
        }


class MatiereForm(forms.ModelForm):
    class Meta:
        model = Matiere
        fields = ["nom", "coefficient"]
        widgets = {
            "nom": forms.TextInput(attrs={"placeholder": "Ex: Mathematiques"}),
        }


class EleveForm(forms.ModelForm):
    """Formulaire de modification d'un eleve (matricule non modifiable une fois cree)."""

    class Meta:
        model = Eleve
        fields = ["nom", "prenom", "date_naissance", "sexe", "classe", "photo"]
        widgets = {
            "date_naissance": forms.DateInput(attrs={"type": "date"}),
        }


class CoursForm(forms.ModelForm):
    """Creneau d'emploi du temps : classe + matiere + enseignant + jour/horaire/salle."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from comptes.models import Enseignant
        self.fields["enseignant"].queryset = Enseignant.objects.all().order_by("last_name", "first_name")

    class Meta:
        model = Cours
        fields = ["classe", "matiere", "enseignant", "jour", "heure_debut", "heure_fin", "salle"]
        widgets = {
            "heure_debut": forms.TimeInput(attrs={"type": "time"}),
            "heure_fin": forms.TimeInput(attrs={"type": "time"}),
            "salle": forms.TextInput(attrs={"placeholder": "Ex: Salle 3"}),
        }