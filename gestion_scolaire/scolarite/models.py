from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from config.validators import valider_taille_image


class Classe(models.Model):
    """Ex: 6e A, 3e C, Terminale D..."""

    nom = models.CharField(max_length=50)
    niveau = models.CharField(max_length=50, help_text="Ex: 6e, 5e, 4e, 3e, 2nde, 1ere, Terminale")
    annee_scolaire = models.CharField(max_length=9, help_text="Ex: 2026-2027")

    class Meta:
        unique_together = ("nom", "annee_scolaire")
        ordering = ["annee_scolaire", "niveau", "nom"]

    def __str__(self):
        return f"{self.nom} ({self.annee_scolaire})"


class Matiere(models.Model):
    nom = models.CharField(max_length=100, unique=True)
    coefficient = models.PositiveSmallIntegerField(default=1)

    def __str__(self):
        return self.nom


class Eleve(models.Model):
    SEXE_CHOICES = [("M", "Masculin"), ("F", "Feminin")]

    matricule = models.CharField(max_length=20, unique=True)
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    date_naissance = models.DateField()
    sexe = models.CharField(max_length=1, choices=SEXE_CHOICES)
    classe = models.ForeignKey(Classe, on_delete=models.SET_NULL, null=True, blank=True, related_name="eleves")
    date_inscription = models.DateField(auto_now_add=True)
    photo = models.ImageField(upload_to="photos_eleves/", blank=True, null=True, validators=[valider_taille_image])

    class Meta:
        ordering = ["nom", "prenom"]

    def __str__(self):
        return f"{self.nom} {self.prenom} ({self.matricule})"


class Note(models.Model):
    TRIMESTRE_CHOICES = [(1, "1er trimestre"), (2, "2e trimestre"), (3, "3e trimestre")]
    TYPE_INTERROGATION = "interrogation"
    TYPE_DEVOIR = "devoir"
    TYPE_COMPOSITION = "composition"
    TYPE_CHOICES = [
        (TYPE_INTERROGATION, "Interrogation"),
        (TYPE_DEVOIR, "Devoir"),
        (TYPE_COMPOSITION, "Composition"),
    ]

    eleve = models.ForeignKey(Eleve, on_delete=models.CASCADE, related_name="notes")
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE, related_name="notes")
    enseignant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="notes_saisies"
    )
    type_evaluation = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_DEVOIR)
    valeur = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        help_text="Note sur 20",
    )
    trimestre = models.PositiveSmallIntegerField(choices=TRIMESTRE_CHOICES)
    date_saisie = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_saisie"]
        constraints = [
            models.UniqueConstraint(
                fields=["eleve", "matiere", "trimestre"],
                condition=Q(type_evaluation="composition"),
                name="une_seule_composition_par_matiere_trimestre",
            )
        ]

    def __str__(self):
        return f"{self.eleve} - {self.matiere} - {self.get_type_evaluation_display()} - {self.valeur}/20 (T{self.trimestre})"


class Bulletin(models.Model):
    TRIMESTRE_CHOICES = Note.TRIMESTRE_CHOICES

    eleve = models.ForeignKey(Eleve, on_delete=models.CASCADE, related_name="bulletins")
    trimestre = models.PositiveSmallIntegerField(choices=TRIMESTRE_CHOICES)
    moyenne_generale = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
    )
    rang = models.PositiveSmallIntegerField(null=True, blank=True)
    effectif_classe = models.PositiveSmallIntegerField(null=True, blank=True)
    decision_conseil = models.CharField(
        max_length=255, blank=True,
        help_text="Ex: Passe en classe superieure, Redouble, Felicitations du conseil...",
    )
    date_generation = models.DateTimeField(auto_now_add=True)
    fichier_pdf = models.FileField(upload_to="bulletins/", blank=True, null=True)

    class Meta:
        unique_together = ("eleve", "trimestre")

    def __str__(self):
        return f"Bulletin {self.eleve} - T{self.trimestre}"


class Absence(models.Model):
    eleve = models.ForeignKey(Eleve, on_delete=models.CASCADE, related_name="absences")
    date = models.DateField()
    justifiee = models.BooleanField(default=False)
    motif = models.CharField(max_length=255, blank=True)
    enregistree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="absences_enregistrees"
    )

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.eleve} - {self.date} ({'justifiee' if self.justifiee else 'non justifiee'})"


class Cours(models.Model):
    """
    Un creneau d'emploi du temps : une matiere enseignee a une classe par
    un enseignant, a un jour et un horaire donnes.
    """

    JOUR_CHOICES = [
        ("lundi", "Lundi"),
        ("mardi", "Mardi"),
        ("mercredi", "Mercredi"),
        ("jeudi", "Jeudi"),
        ("vendredi", "Vendredi"),
        ("samedi", "Samedi"),
    ]

    classe = models.ForeignKey(Classe, on_delete=models.CASCADE, related_name="cours")
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE, related_name="cours")
    enseignant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cours"
    )
    jour = models.CharField(max_length=10, choices=JOUR_CHOICES)
    heure_debut = models.TimeField()
    heure_fin = models.TimeField()
    salle = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ["jour", "heure_debut"]
        verbose_name = "Cours (emploi du temps)"
        verbose_name_plural = "Cours (emploi du temps)"

    def __str__(self):
        return f"{self.get_jour_display()} {self.heure_debut.strftime('%H:%M')}-{self.heure_fin.strftime('%H:%M')} : {self.matiere} ({self.classe})"


class Observation(models.Model):
    """
    Note de suivi comportemental sur un eleve (positive, negative ou
    neutre), saisie par un enseignant. Base du "roster" de classe.
    """

    TYPE_POSITIVE = "positive"
    TYPE_NEGATIVE = "negative"
    TYPE_NEUTRE = "neutre"
    TYPE_CHOICES = [
        (TYPE_POSITIVE, "Positive"),
        (TYPE_NEGATIVE, "Negative"),
        (TYPE_NEUTRE, "Neutre"),
    ]

    eleve = models.ForeignKey(Eleve, on_delete=models.CASCADE, related_name="observations")
    enseignant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="observations_faites"
    )
    type_observation = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_NEUTRE)
    contenu = models.CharField(max_length=500)
    visible_parent = models.BooleanField(
        default=True, help_text="Si decoche, seuls les enseignants et l'administrateur voient cette observation."
    )
    date_observation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_observation"]

    def __str__(self):
        return f"{self.eleve} - {self.get_type_observation_display()} - {self.date_observation:%d/%m/%Y}"