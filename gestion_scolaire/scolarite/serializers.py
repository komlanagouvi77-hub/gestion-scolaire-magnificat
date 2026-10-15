from rest_framework import serializers

from .models import Absence, Bulletin, Classe, Cours, Eleve, Matiere, Note, Observation


class ClasseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classe
        fields = ["id", "nom", "niveau", "annee_scolaire"]


class MatiereSerializer(serializers.ModelSerializer):
    class Meta:
        model = Matiere
        fields = ["id", "nom", "coefficient"]


class EleveSerializer(serializers.ModelSerializer):
    # SerializerMethodField plutot que CharField(source="classe.__str__") :
    # Eleve.classe est nullable (un eleve peut ne pas encore etre affecte a
    # une classe). Avec source="classe.__str__" sur un eleve sans classe,
    # DRF resout getattr(None, "__str__") - qui existe (tout objet Python a
    # un __str__) - et serialise donc la representation de cette methode
    # bound elle-meme (ex: "<method-wrapper '__str__' of NoneType object at
    # 0x...>") au lieu de lever une erreur claire. Ce texte technique
    # remontait tel quel jusque dans l'interface (ex: graphique de
    # repartition par classe du tableau de bord).
    classe_nom = serializers.SerializerMethodField()
    parents_details = serializers.SerializerMethodField()

    class Meta:
        model = Eleve
        fields = ["id", "matricule", "nom", "prenom", "date_naissance", "sexe", "classe", "classe_nom", "parents_details"]

    def get_classe_nom(self, eleve) -> str | None:
        return str(eleve.classe) if eleve.classe else None

    def get_parents_details(self, eleve) -> list[dict]:
        details = []
        for p in eleve.parents.all():
            nom = (f"{p.first_name} {p.last_name}").strip() or p.username
            tel = p.telephone or ""
            details.append({"id": p.id, "nom": nom, "telephone": tel, "email": p.email or ""})
        return details


class NoteSerializer(serializers.ModelSerializer):
    # SerializerMethodField plutot que CharField(source="eleve.__str__") :
    # voir le commentaire de EleveSerializer.classe_nom ci-dessus. Note.eleve
    # est en CASCADE (jamais nul tant que la ligne existe), mais ce pattern
    # reste dangereux en cas d'evolution future du schema - on l'evite donc
    # systematiquement plutot que de compter sur la non-nullabilite actuelle.
    eleve_nom = serializers.SerializerMethodField()
    matiere_nom = serializers.CharField(source="matiere.nom", read_only=True)

    class Meta:
        model = Note
        fields = [
            "id", "eleve", "eleve_nom", "matiere", "matiere_nom", "enseignant",
            "type_evaluation", "valeur", "trimestre", "date_saisie",
        ]
        read_only_fields = ["enseignant", "date_saisie"]

    def get_eleve_nom(self, note) -> str | None:
        return str(note.eleve) if note.eleve_id else None


class BulletinSerializer(serializers.ModelSerializer):
    fichier_pdf = serializers.SerializerMethodField()
    eleve_nom = serializers.SerializerMethodField()

    class Meta:
        model = Bulletin
        fields = [
            "id", "eleve", "eleve_nom", "trimestre", "moyenne_generale", "rang", "effectif_classe",
            "decision_conseil", "date_generation", "fichier_pdf",
        ]
        read_only_fields = ["date_generation"]

    def get_fichier_pdf(self, bulletin) -> str | None:
        """
        Renvoie l'URL de telechargement PROTEGEE (/api/bulletins/<id>/telecharger/).
        Le endpoint regenere le PDF a la volee si besoin.
        """
        request = self.context.get("request")
        chemin = "/api/bulletins/{}/telecharger/".format(bulletin.pk)
        return request.build_absolute_uri(chemin) if request else chemin

    def get_eleve_nom(self, bulletin) -> str | None:
        return str(bulletin.eleve) if bulletin.eleve_id else None


class AbsenceSerializer(serializers.ModelSerializer):
    eleve_nom = serializers.SerializerMethodField()

    class Meta:
        model = Absence
        fields = ["id", "eleve", "eleve_nom", "date", "justifiee", "motif", "enregistree_par"]
        read_only_fields = ["enregistree_par"]

    def get_eleve_nom(self, absence) -> str | None:
        return str(absence.eleve) if absence.eleve_id else None


class ObservationSerializer(serializers.ModelSerializer):
    eleve_nom = serializers.SerializerMethodField()
    enseignant_nom = serializers.SerializerMethodField()

    class Meta:
        model = Observation
        fields = [
            "id", "eleve", "eleve_nom", "enseignant", "enseignant_nom",
            "type_observation", "contenu", "visible_parent", "date_observation",
        ]
        read_only_fields = ["enseignant", "date_observation"]

    def get_eleve_nom(self, observation) -> str | None:
        return str(observation.eleve) if observation.eleve_id else None

    def get_enseignant_nom(self, obj) -> str | None:
        if not obj.enseignant:
            return None
        return obj.enseignant.get_full_name() or obj.enseignant.username


class CoursSerializer(serializers.ModelSerializer):
    """
    Serialiseur pour l'emploi du temps (API, utilisee par React). Ajoute
    les noms lisibles (classe/matiere/enseignant) pour eviter des allers-
    retours supplementaires cote frontend.
    """

    classe_nom = serializers.SerializerMethodField()
    matiere_nom = serializers.CharField(source="matiere.nom", read_only=True)
    enseignant_nom = serializers.CharField(source="enseignant.get_full_name", read_only=True)

    class Meta:
        model = Cours
        fields = [
            "id", "classe", "classe_nom", "matiere", "matiere_nom",
            "enseignant", "enseignant_nom", "jour", "heure_debut", "heure_fin", "salle",
        ]

    def get_classe_nom(self, cours) -> str | None:
        return str(cours.classe) if cours.classe_id else None
