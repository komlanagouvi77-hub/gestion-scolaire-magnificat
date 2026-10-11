from django.contrib.auth.models import AbstractUser
from django.db import models

from config.validators import valider_taille_image


class Utilisateur(AbstractUser):
    """
    Modele utilisateur de base du systeme.
    Correspond a la classe abstraite "Utilisateur" du diagramme de classes.
    Django exige un modele concret pour AUTH_USER_MODEL : les roles
    (Administrateur, Enseignant, Parent) sont donc implementes en heritage
    multi-tables (chacun ajoute ses propres champs specifiques).
    """

    ROLE_ADMINISTRATEUR = "administrateur"
    ROLE_ENSEIGNANT = "enseignant"
    ROLE_PARENT = "parent"
    ROLE_CHOICES = [
        (ROLE_ADMINISTRATEUR, "Administrateur"),
        (ROLE_ENSEIGNANT, "Enseignant"),
        (ROLE_PARENT, "Parent"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    telephone = models.CharField(max_length=20, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display() if self.role else 'sans role'})"


class Administrateur(Utilisateur):
    """Compte disposant de la maitrise complete de la configuration du systeme."""

    class Meta:
        verbose_name = "Administrateur"
        verbose_name_plural = "Administrateurs"

    service = models.CharField(max_length=100, blank=True, help_text="Ex: Direction, Scolarite, Comptabilite")

    def save(self, *args, **kwargs):
        self.role = Utilisateur.ROLE_ADMINISTRATEUR
        super().save(*args, **kwargs)


class Enseignant(Utilisateur):
    """Compte restreint a la saisie des notes/absences de ses classes et matieres."""

    class Meta:
        verbose_name = "Enseignant"
        verbose_name_plural = "Enseignants"

    matieres = models.ManyToManyField("scolarite.Matiere", related_name="enseignants", blank=True)
    classes = models.ManyToManyField("scolarite.Classe", related_name="enseignants", blank=True)
    specialite = models.CharField(max_length=100, blank=True)

    def save(self, *args, **kwargs):
        self.role = Utilisateur.ROLE_ENSEIGNANT
        super().save(*args, **kwargs)


class Parent(Utilisateur):
    """Compte en consultation seule, restreint aux donnees de ses enfants."""

    class Meta:
        verbose_name = "Parent"
        verbose_name_plural = "Parents"

    eleves = models.ManyToManyField("scolarite.Eleve", related_name="parents", blank=True)
    profession = models.CharField(max_length=100, blank=True)

    def save(self, *args, **kwargs):
        self.role = Utilisateur.ROLE_PARENT
        super().save(*args, **kwargs)


class DemandeConge(models.Model):
    """Demande de conge d'un membre du personnel (Enseignant ou Administrateur)."""

    STATUT_EN_ATTENTE = "en_attente"
    STATUT_APPROUVEE = "approuvee"
    STATUT_REFUSEE = "refusee"
    STATUT_CHOICES = [
        (STATUT_EN_ATTENTE, "En attente"),
        (STATUT_APPROUVEE, "Approuvee"),
        (STATUT_REFUSEE, "Refusee"),
    ]

    demandeur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name="demandes_conge")
    date_debut = models.DateField()
    date_fin = models.DateField()
    motif = models.CharField(max_length=255)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default=STATUT_EN_ATTENTE)
    date_demande = models.DateTimeField(auto_now_add=True)
    traite_par = models.ForeignKey(
        Utilisateur, on_delete=models.SET_NULL, null=True, blank=True, related_name="conges_traites"
    )

    class Meta:
        ordering = ["-date_demande"]

    def __str__(self):
        return f"{self.demandeur} - {self.date_debut} au {self.date_fin} ({self.get_statut_display()})"


class Parametres(models.Model):
    """
    Configuration generale de l'etablissement (nom, logo, coordonnees,
    annee scolaire active). Modele "singleton" : une seule ligne existe
    toujours en base, recuperee via Parametres.charger().
    """

    SYSTEME_TRIMESTRE = "trimestre"
    SYSTEME_SEMESTRE = "semestre"
    SYSTEME_CHOICES = [
        (SYSTEME_TRIMESTRE, "Trimestres"),
        (SYSTEME_SEMESTRE, "Semestres"),
    ]

    nom_ecole = models.CharField(max_length=200, default="Complexe Scolaire Magnificat")
    logo = models.ImageField(upload_to="logo_ecole/", blank=True, null=True, validators=[valider_taille_image])
    adresse = models.CharField(max_length=255, blank=True, default="Adidogome, Lome, Togo")
    telephone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    annee_scolaire_active = models.CharField(max_length=9, default="2026-2027", help_text="Ex: 2026-2027")
    systeme_periodes = models.CharField(max_length=20, choices=SYSTEME_CHOICES, default=SYSTEME_TRIMESTRE)

    # Verrouillage des periodes : une fois verrouille, les enseignants ne
    # peuvent plus ajouter/modifier de notes pour ce trimestre (protege les
    # moyennes une fois les bulletins imprimes).
    notes_verrouillees_t1 = models.BooleanField(default=False)
    notes_verrouillees_t2 = models.BooleanField(default=False)
    notes_verrouillees_t3 = models.BooleanField(default=False)

    # Elements imprimes sur le bulletin PDF : cachet officiel, signature
    # manuscrite (numerisee) et identite du signataire.
    cachet = models.ImageField(upload_to="cachets/", blank=True, null=True, validators=[valider_taille_image], help_text="Cachet officiel de l'etablissement, imprime sur les bulletins.")
    signature = models.ImageField(upload_to="signatures/", blank=True, null=True, validators=[valider_taille_image], help_text="Signature numerisee du chef d'etablissement.")
    nom_signataire = models.CharField(max_length=150, blank=True, help_text="Ex: M. Komla AGBOZO")
    titre_signataire = models.CharField(max_length=150, blank=True, default="Le Directeur")

    class Meta:
        verbose_name = "Parametres de l'etablissement"
        verbose_name_plural = "Parametres de l'etablissement"

    def trimestre_verrouille(self, trimestre):
        return {
            1: self.notes_verrouillees_t1,
            2: self.notes_verrouillees_t2,
            3: self.notes_verrouillees_t3,
        }.get(int(trimestre), False)

    def save(self, *args, **kwargs):
        self.pk = 1  # force une seule ligne possible (singleton)
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # on ne supprime jamais la configuration

    @classmethod
    def charger(cls):
        obj, _cree = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.nom_ecole
class DemandeInscription(models.Model):
    """
    Demande d'acces soumise publiquement par un futur Enseignant ou Parent,
    en attente de validation par un Administrateur. Le mot de passe choisi
    est deja hache au moment de la soumission (jamais stocke en clair) ;
    il est repris tel quel pour le compte reel cree lors de l'approbation.
    """

    TYPE_ENSEIGNANT = "enseignant"
    TYPE_PARENT = "parent"
    TYPE_CHOICES = [
        (TYPE_ENSEIGNANT, "Enseignant"),
        (TYPE_PARENT, "Parent"),
    ]

    STATUT_EN_ATTENTE = "en_attente"
    STATUT_APPROUVEE = "approuvee"
    STATUT_REFUSEE = "refusee"
    STATUT_CHOICES = [
        (STATUT_EN_ATTENTE, "En attente"),
        (STATUT_APPROUVEE, "Approuvee"),
        (STATUT_REFUSEE, "Refusee"),
    ]

    type_compte = models.CharField(max_length=20, choices=TYPE_CHOICES)
    username_souhaite = models.CharField(max_length=150, unique=True)
    mot_de_passe_hache = models.CharField(max_length=255)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    telephone = models.CharField(max_length=30, blank=True)
    specialite = models.CharField(max_length=100, blank=True, help_text="Pour une demande Enseignant.")
    profession = models.CharField(max_length=100, blank=True, help_text="Pour une demande Parent.")
    matricules_enfants = models.CharField(
        max_length=255, blank=True,
        help_text="Matricules des enfants, separes par des virgules (pour une demande Parent).",
    )
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default=STATUT_EN_ATTENTE)
    date_demande = models.DateTimeField(auto_now_add=True)
    traite_par = models.ForeignKey(
        Utilisateur, on_delete=models.SET_NULL, null=True, blank=True, related_name="demandes_traitees",
    )
    motif_refus = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Demande d'inscription"
        ordering = ["-date_demande"]

    def __str__(self):
        return f"{self.username_souhaite} ({self.get_type_compte_display()}) — {self.get_statut_display()}"