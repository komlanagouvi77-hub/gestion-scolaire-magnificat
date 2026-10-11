from django.db import models


class Annonce(models.Model):
    DESTINATAIRE_CHOICES = [
        ("tous", "Tous"),
        ("enseignants", "Enseignants uniquement"),
        ("parents", "Parents uniquement"),
    ]

    titre = models.CharField(max_length=200)
    contenu = models.TextField()
    auteur = models.ForeignKey("comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="annonces")
    destinataires = models.CharField(max_length=20, choices=DESTINATAIRE_CHOICES, default="tous")
    date_publication = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_publication"]

    def __str__(self):
        return self.titre


class Evenement(models.Model):
    """Jour ferie, periode de vacances, ou evenement scolaire (reunion, sortie...)."""

    TYPE_JOUR_FERIE = "jour_ferie"
    TYPE_VACANCES = "vacances"
    TYPE_EVENEMENT = "evenement"
    TYPE_CHOICES = [
        (TYPE_JOUR_FERIE, "Jour ferie"),
        (TYPE_VACANCES, "Vacances"),
        (TYPE_EVENEMENT, "Evenement scolaire"),
    ]

    titre = models.CharField(max_length=200)
    type_evenement = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_EVENEMENT)
    date_debut = models.DateField()
    date_fin = models.DateField()
    description = models.TextField(blank=True)
    cree_par = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="evenements_crees"
    )

    class Meta:
        ordering = ["date_debut"]

    def __str__(self):
        return f"{self.titre} ({self.date_debut} - {self.date_fin})"


class Message(models.Model):
    """
    Message prive entre un Parent et un Enseignant, toujours rattache a un
    eleve precis (contexte obligatoire : on ne discute pas dans le vide).
    """

    expediteur = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.CASCADE, related_name="messages_envoyes"
    )
    destinataire = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.CASCADE, related_name="messages_recus"
    )
    eleve = models.ForeignKey("scolarite.Eleve", on_delete=models.CASCADE, related_name="messages")
    contenu = models.TextField()
    date_envoi = models.DateTimeField(auto_now_add=True)
    lu = models.BooleanField(default=False)

    class Meta:
        ordering = ["-date_envoi"]

    def __str__(self):
        return f"{self.expediteur} -> {self.destinataire} ({self.eleve})"