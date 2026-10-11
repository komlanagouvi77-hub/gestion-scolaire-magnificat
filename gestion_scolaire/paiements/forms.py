from django import forms

from scolarite.models import Eleve
from .models import FraisScolarite, Paiement


class PaiementForm(forms.ModelForm):
    eleve = forms.ModelChoiceField(
        queryset=Eleve.objects.select_related("classe").order_by("nom", "prenom"),
        label="Eleve",
    )

    class Meta:
        model = Paiement
        fields = ["eleve", "tranche", "montant", "mode_paiement", "reference", "annee_scolaire"]
        labels = {
            "tranche": "Tranche concernee",
            "montant": "Montant (FCFA)",
            "mode_paiement": "Mode de paiement",
            "reference": "Reference / N° de recu",
            "annee_scolaire": "Annee scolaire",
        }