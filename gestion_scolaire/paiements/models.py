from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class FraisScolarite(models.Model):
    """
    Montant du par tranche pour une classe donnee, sur une annee scolaire.
    Permet de suivre ce qui reste a payer par eleve, tranche par tranche.
    """

    TRANCHE_1 = 1
    TRANCHE_2 = 2
    TRANCHE_3 = 3
    TRANCHE_CHOICES = [
        (TRANCHE_1, "1ere tranche"),
        (TRANCHE_2, "2eme tranche"),
        (TRANCHE_3, "3eme tranche"),
    ]

    classe = models.ForeignKey("scolarite.Classe", on_delete=models.CASCADE, related_name="frais_scolarite")
    tranche = models.PositiveSmallIntegerField(choices=TRANCHE_CHOICES)
    montant_du = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Montant du en FCFA pour cette tranche",
    )
    date_limite = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ("classe", "tranche")
        ordering = ["classe", "tranche"]
        verbose_name = "Frais de scolarite (tranche)"
        verbose_name_plural = "Frais de scolarite (tranches)"

    def __str__(self):
        return f"{self.classe} - {self.get_tranche_display()} : {self.montant_du} FCFA"


class Paiement(models.Model):
    MODE_CHOICES = [
        ("especes", "Especes"),
        ("mobile_money", "Mobile Money (Flooz / T-Money)"),
        ("cheque", "Cheque"),
        ("virement", "Virement bancaire"),
    ]
    TRANCHE_CHOICES = FraisScolarite.TRANCHE_CHOICES

    eleve = models.ForeignKey("scolarite.Eleve", on_delete=models.CASCADE, related_name="paiements")
    tranche = models.PositiveSmallIntegerField(choices=TRANCHE_CHOICES, null=True, blank=True)
    montant = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Montant en FCFA, doit etre superieur a 0",
    )
    date_paiement = models.DateField(auto_now_add=True)
    mode_paiement = models.CharField(max_length=20, choices=MODE_CHOICES)
    reference = models.CharField(max_length=100, blank=True, help_text="Numero de recu ou reference de transaction")
    annee_scolaire = models.CharField(max_length=9, help_text="Ex: 2026-2027")
    enregistre_par = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="paiements_enregistres"
    )

    class Meta:
        ordering = ["-date_paiement"]

    def __str__(self):
        return f"{self.eleve} - {self.montant} FCFA ({self.date_paiement})"