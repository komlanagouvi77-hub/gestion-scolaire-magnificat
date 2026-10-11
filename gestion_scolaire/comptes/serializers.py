from rest_framework import serializers

from .models import DemandeConge, DemandeInscription, Enseignant, Parametres, Parent


class DemandeCongeSerializer(serializers.ModelSerializer):
    demandeur_nom = serializers.SerializerMethodField()
    traite_par_nom = serializers.SerializerMethodField()
    peut_traiter = serializers.SerializerMethodField()

    class Meta:
        model = DemandeConge
        fields = [
            "id", "demandeur", "demandeur_nom", "date_debut", "date_fin", "motif",
            "statut", "date_demande", "traite_par", "traite_par_nom", "peut_traiter",
        ]
        read_only_fields = ["id", "demandeur", "statut", "date_demande", "traite_par"]

    def get_demandeur_nom(self, obj) -> str:
        return obj.demandeur.get_full_name() or obj.demandeur.username

    def get_traite_par_nom(self, obj) -> str | None:
        if not obj.traite_par:
            return None
        return obj.traite_par.get_full_name() or obj.traite_par.username

    def get_peut_traiter(self, obj) -> bool:
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        return (
            hasattr(request.user, "administrateur")
            and obj.demandeur_id != request.user.pk
            and obj.statut == DemandeConge.STATUT_EN_ATTENTE
        )

class ParametresSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parametres
        fields = [
            "nom_ecole", "logo", "adresse", "telephone", "email",
            "annee_scolaire_active", "systeme_periodes",
            "notes_verrouillees_t1", "notes_verrouillees_t2", "notes_verrouillees_t3",
            "cachet", "signature", "nom_signataire", "titre_signataire",
        ]
class DemandeInscriptionSerializer(serializers.ModelSerializer):
    """
    Serialiseur pour les demandes d'acces (API, utilisee par React).
    Le mot de passe est ecriture seule et hache immediatement dans
    create() ; jamais stocke en clair ni renvoye dans la reponse.
    """

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = DemandeInscription
        fields = [
            "id", "type_compte", "username_souhaite", "password", "first_name", "last_name",
            "email", "telephone", "specialite", "profession", "matricules_enfants",
            "statut", "date_demande",
        ]
        read_only_fields = ["id", "statut", "date_demande"]

    def create(self, validated_data):
        from django.contrib.auth.hashers import make_password
        mot_de_passe = validated_data.pop("password")
        return DemandeInscription.objects.create(
            mot_de_passe_hache=make_password(mot_de_passe), **validated_data,
        )


class EnseignantSerializer(serializers.ModelSerializer):
    """
    Serialiseur pour la creation/gestion des comptes Enseignant depuis
    l'API (utilise par le frontend React). Le mot de passe est en
    ecriture seule et toujours hache via set_password(), jamais stocke
    ni renvoye en clair.
    """

    password = serializers.CharField(write_only=True, required=False, min_length=8)
    matieres_noms = serializers.SerializerMethodField()
    classes_noms = serializers.SerializerMethodField()

    class Meta:
        model = Enseignant
        fields = [
            "id", "username", "password", "first_name", "last_name", "email",
            "telephone", "specialite", "matieres", "classes",
            "matieres_noms", "classes_noms",
        ]

    def get_matieres_noms(self, obj) -> list[str]:
        return [m.nom for m in obj.matieres.all()]

    def get_classes_noms(self, obj) -> list[str]:
        return [str(c) for c in obj.classes.all()]

    def create(self, validated_data):
        mot_de_passe = validated_data.pop("password", None)
        matieres = validated_data.pop("matieres", [])
        classes = validated_data.pop("classes", [])
        enseignant = Enseignant(**validated_data)
        if mot_de_passe:
            enseignant.set_password(mot_de_passe)
        enseignant.save()
        enseignant.matieres.set(matieres)
        enseignant.classes.set(classes)
        return enseignant

    def update(self, instance, validated_data):
        mot_de_passe = validated_data.pop("password", None)
        matieres = validated_data.pop("matieres", None)
        classes = validated_data.pop("classes", None)
        for champ, valeur in validated_data.items():
            setattr(instance, champ, valeur)
        if mot_de_passe:
            instance.set_password(mot_de_passe)
        instance.save()
        if matieres is not None:
            instance.matieres.set(matieres)
        if classes is not None:
            instance.classes.set(classes)
        return instance


class ParentSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    eleves_noms = serializers.SerializerMethodField()

    class Meta:
        model = Parent
        fields = [
            "id", "username", "password", "first_name", "last_name", "email",
            "telephone", "profession", "eleves", "eleves_noms",
        ]

    def get_eleves_noms(self, obj) -> list[str]:
        return [f"{e.nom} {e.prenom}" for e in obj.eleves.all()]

    def create(self, validated_data):
        mot_de_passe = validated_data.pop("password", None)
        eleves = validated_data.pop("eleves", [])
        parent = Parent(**validated_data)
        if mot_de_passe:
            parent.set_password(mot_de_passe)
        parent.save()
        parent.eleves.set(eleves)
        return parent

    def update(self, instance, validated_data):
        mot_de_passe = validated_data.pop("password", None)
        eleves = validated_data.pop("eleves", None)
        for champ, valeur in validated_data.items():
            setattr(instance, champ, valeur)
        if mot_de_passe:
            instance.set_password(mot_de_passe)
        instance.save()
        if eleves is not None:
            instance.eleves.set(eleves)
        return instance
