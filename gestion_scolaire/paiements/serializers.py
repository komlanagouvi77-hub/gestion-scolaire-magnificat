from rest_framework import serializers

from .models import FraisScolarite, Paiement


class PaiementSerializer(serializers.ModelSerializer):
    # SerializerMethodField plutot que CharField(source="eleve.__str__") :
    # meme pattern securise que EleveSerializer.classe_nom (scolarite/
    # serializers.py) - evite de laisser fuir la representation brute de la
    # methode __str__ elle-meme si la relation venait a etre nulle.
    eleve_nom = serializers.SerializerMethodField()

    class Meta:
        model = Paiement
        fields = ["id", "eleve", "eleve_nom", "tranche", "montant", "date_paiement", "mode_paiement", "reference", "annee_scolaire", "enregistre_par"]
        read_only_fields = ["date_paiement", "enregistre_par"]

    def get_eleve_nom(self, paiement) -> str | None:
        return str(paiement.eleve) if paiement.eleve_id else None


class FraisScolariteSerializer(serializers.ModelSerializer):
    classe_nom = serializers.SerializerMethodField()
    tranche_libelle = serializers.CharField(source="get_tranche_display", read_only=True)

    class Meta:
        model = FraisScolarite
        fields = ["id", "classe", "classe_nom", "tranche", "tranche_libelle", "montant_du", "date_limite"]

    def get_classe_nom(self, frais) -> str | None:
        return str(frais.classe) if frais.classe_id else None
