from rest_framework import serializers

from .models import Annonce, Evenement, Message


class AnnonceSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source="auteur.get_full_name", read_only=True)

    class Meta:
        model = Annonce
        fields = ["id", "titre", "contenu", "auteur", "auteur_nom", "destinataires", "date_publication"]
        read_only_fields = ["auteur", "date_publication"]


class EvenementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evenement
        fields = ["id", "titre", "type_evenement", "date_debut", "date_fin", "description", "cree_par"]
        read_only_fields = ["cree_par"]


class MessageSerializer(serializers.ModelSerializer):
    expediteur_nom = serializers.CharField(source="expediteur.get_full_name", read_only=True)

    class Meta:
        model = Message
        fields = ["id", "expediteur", "expediteur_nom", "destinataire", "eleve", "contenu", "date_envoi", "lu"]
        read_only_fields = ["expediteur", "date_envoi"]