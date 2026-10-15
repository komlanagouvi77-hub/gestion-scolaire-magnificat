import re
from rest_framework import serializers

from .models import DemandeConge, DemandeInscription, Enseignant, Parametres, Parent, Utilisateur


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
    Validation avancee et securisee de tous les champs.
    """

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={
            "required": "Le mot de passe est obligatoire.",
            "blank": "Le mot de passe ne peut pas être vide.",
            "min_length": "Le mot de passe doit comporter au moins 8 caractères.",
        },
    )
    first_name = serializers.CharField(
        required=True,
        min_length=2,
        error_messages={
            "required": "Le prénom est obligatoire.",
            "blank": "Veuillez renseigner votre prénom.",
            "min_length": "Le prénom doit comporter au moins 2 caractères.",
        },
    )
    last_name = serializers.CharField(
        required=True,
        min_length=2,
        error_messages={
            "required": "Le nom de famille est obligatoire.",
            "blank": "Veuillez renseigner votre nom de famille.",
            "min_length": "Le nom doit comporter au moins 2 caractères.",
        },
    )
    username_souhaite = serializers.CharField(
        required=True,
        min_length=3,
        error_messages={
            "required": "Le nom d'utilisateur est obligatoire.",
            "blank": "Veuillez renseigner un nom d'utilisateur.",
            "min_length": "Le nom d'utilisateur doit comporter au moins 3 caractères.",
        },
    )
    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        error_messages={
            "invalid": "Veuillez entrer une adresse email valide.",
        },
    )
    telephone = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = DemandeInscription
        fields = [
            "id", "type_compte", "username_souhaite", "password", "first_name", "last_name",
            "email", "telephone", "specialite", "profession", "matricules_enfants",
            "statut", "date_demande",
        ]
        read_only_fields = ["id", "statut", "date_demande"]

    def validate_first_name(self, value):
        val = value.strip()
        if len(val) < 2:
            raise serializers.ValidationError("Le prénom doit comporter au moins 2 caractères.")
        if len(val) > 50:
            raise serializers.ValidationError("Le prénom ne peut pas dépasser 50 caractères.")
        if not re.search(r"^[a-zA-ZÀ-ÿ\s'-]+$", val):
            raise serializers.ValidationError("Le prénom ne peut contenir que des lettres alphabétiques, espaces ou tirets.")
        if re.search(r"[0-9]", val):
            raise serializers.ValidationError("Le prénom ne peut pas comporter de chiffres.")
        if re.search(r"(.)\1\1", val):
            raise serializers.ValidationError("Le prénom contient des lettres répétées de manière anormale.")
        return val.title()

    def validate_last_name(self, value):
        val = value.strip()
        if len(val) < 2:
            raise serializers.ValidationError("Le nom de famille doit comporter au moins 2 caractères.")
        if len(val) > 50:
            raise serializers.ValidationError("Le nom de famille ne peut pas dépasser 50 caractères.")
        if not re.search(r"^[a-zA-ZÀ-ÿ\s'-]+$", val):
            raise serializers.ValidationError("Le nom de famille ne peut contenir que des lettres alphabétiques, espaces ou tirets.")
        if re.search(r"[0-9]", val):
            raise serializers.ValidationError("Le nom de famille ne peut pas comporter de chiffres.")
        if re.search(r"(.)\1\1", val):
            raise serializers.ValidationError("Le nom de famille contient des lettres répétées de manière anormale.")
        return val.upper()

    def validate_telephone(self, value):
        if not value:
            return ""
        val = value.strip()
        if re.search(r"[a-zA-Z]", val):
            raise serializers.ValidationError("Le numéro de téléphone ne doit contenir que des chiffres (ex: +228 90 12 34 56).")
        chiffres = re.findall(r"\d", val)
        if len(chiffres) < 8 or len(chiffres) > 15:
            raise serializers.ValidationError("Le numéro de téléphone doit comporter entre 8 et 15 chiffres.")
        chiffres_str = "".join(chiffres)
        if len(set(chiffres_str)) == 1:
            raise serializers.ValidationError("Ce numéro de téléphone est invalide (chiffres identiques répétés).")
        if chiffres_str in ("12345678", "87654321", "01234567", "98765432", "123456789", "987654321"):
            raise serializers.ValidationError("Ce numéro de téléphone semble fictif. Veuillez entrer un numéro réel.")
        return val

    def validate_username_souhaite(self, value):
        val = value.strip().lower()
        if len(val) < 3:
            raise serializers.ValidationError("Le nom d'utilisateur doit comporter au moins 3 caractères.")
        if len(val) > 25:
            raise serializers.ValidationError("Le nom d'utilisateur ne peut pas dépasser 25 caractères.")
        if not re.match(r"^[a-z0-9][a-z0-9._-]{1,23}[a-z0-9]$", val):
            raise serializers.ValidationError("L'identifiant doit commencer et finir par une lettre ou un chiffre, et ne contenir que des minuscules, chiffres, points, tirets ou underscores.")
        if ".." in val or "--" in val or "__" in val:
            raise serializers.ValidationError("Les symboles consécutifs (comme .. ou --) ne sont pas autorisés.")
        identifiants_reserves = {
            "admin", "administrator", "root", "directeur", "direction",
            "magnificat", "superadmin", "support", "secretariat", "ecole",
            "system", "moderator", "guest"
        }
        if val in identifiants_reserves:
            raise serializers.ValidationError("Cet identifiant est réservé à l'administration du système.")
        if Utilisateur.objects.filter(username__iexact=val).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà utilisé par un compte existant.")
        if DemandeInscription.objects.filter(username_souhaite__iexact=val, statut=DemandeInscription.STATUT_EN_ATTENTE).exists():
            raise serializers.ValidationError("Une demande avec ce nom d'utilisateur est déjà en attente d'approbation.")
        return val

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Le mot de passe doit comporter au moins 8 caractères.")
        has_letter = any(c.isalpha() for c in value)
        has_digit = any(c.isdigit() for c in value)
        if not (has_letter and has_digit):
            raise serializers.ValidationError("Le mot de passe doit contenir au moins une lettre et un chiffre pour garantir sa sécurité.")
        mots_bannis = ["password", "12345678", "azerty123", "motdepasse", "qwerty123", "admin123", "ecole123", "passer123", "bienvenue"]
        if value.lower() in mots_bannis:
            raise serializers.ValidationError("Ce mot de passe est trop simple et facile à deviner. Choisissez un mot de passe plus robuste.")
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        username = attrs.get("username_souhaite")
        first_name = attrs.get("first_name", "")
        last_name = attrs.get("last_name", "")
        if password and username and username.lower() in password.lower():
            raise serializers.ValidationError({"password": "Le mot de passe ne doit pas contenir votre nom d'utilisateur."})
        if password and first_name and len(first_name) >= 3 and first_name.lower() in password.lower():
            raise serializers.ValidationError({"password": "Le mot de passe ne doit pas contenir votre prénom."})
        if password and last_name and len(last_name) >= 3 and last_name.lower() in password.lower():
            raise serializers.ValidationError({"password": "Le mot de passe ne doit pas contenir votre nom de famille."})
        return attrs

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
