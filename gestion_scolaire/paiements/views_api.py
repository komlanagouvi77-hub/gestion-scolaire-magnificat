from decimal import Decimal

from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import extend_schema, inline_serializer
from django.shortcuts import get_object_or_404
from django.http import HttpResponse

from scolarite.models import Classe, Eleve
from .models import FraisScolarite, Paiement
from .serializers import FraisScolariteSerializer, PaiementSerializer


class PaiementViewSet(viewsets.ModelViewSet):
    """
    Un Administrateur voit et gere tous les paiements (creation, modification,
    suppression). Un Parent voit uniquement les paiements de ses propres
    enfants, en LECTURE SEULE (il ne doit jamais pouvoir enregistrer ou
    modifier un paiement lui-meme, ce serait une faille de securite : un
    parent pourrait sinon se declarer "a jour" sans avoir reellement paye).
    Un Enseignant n'a pas acces aux paiements (donnee sensible hors de son role).
    """

    serializer_class = PaiementSerializer

    def get_queryset(self):
        utilisateur = self.request.user
        if hasattr(utilisateur, "administrateur"):
            return Paiement.objects.all()
        if hasattr(utilisateur, "parent"):
            return Paiement.objects.filter(eleve__in=utilisateur.parent.eleves.all())
        return Paiement.objects.none()

    def _verifier_administrateur(self):
        if not hasattr(self.request.user, "administrateur"):
            raise PermissionDenied("Seul un administrateur peut enregistrer ou modifier un paiement.")

    def perform_create(self, serializer):
        self._verifier_administrateur()
        serializer.save(enregistre_par=self.request.user)

    def perform_update(self, serializer):
        self._verifier_administrateur()
        serializer.save()

    def perform_destroy(self, instance):
        self._verifier_administrateur()
        instance.delete()

    @action(detail=True, methods=["get"], url_path="recu-pdf")
    def recu_pdf(self, request, pk=None):
        """
        Telecharge le recu officiel du paiement genere par ReportLab au format PDF.
        Accessible a l'Administrateur et au Parent concerne.
        """
        paiement = self.get_object()
        from .pdf import generer_pdf_recu_paiement
        pdf_bytes = generer_pdf_recu_paiement(paiement)
        nom_eleve = (str(paiement.eleve.nom) if paiement.eleve else "recu").replace(" ", "_")
        nom_fichier = f"recu_paiement_{nom_eleve}_{paiement.id}.pdf"
        reponse = HttpResponse(pdf_bytes, content_type="application/pdf")
        reponse["Content-Disposition"] = f'attachment; filename="{nom_fichier}"'
        return reponse



class FraisScolariteViewSet(viewsets.ModelViewSet):
    """
    Montant du par classe et par tranche. Lecture et ecriture reservees a
    l'Administrateur (un enseignant ou un parent n'a pas a definir ou
    consulter isolement les frais fixes par l'etablissement ; la situation
    de son propre enfant est deja accessible via l'endpoint /situation/).
    """

    queryset = FraisScolarite.objects.select_related("classe").all()
    serializer_class = FraisScolariteSerializer
    permission_classes = [IsAuthenticated]

    def _verifier_administrateur(self):
        if not hasattr(self.request.user, "administrateur"):
            raise PermissionDenied("Seul un administrateur peut gerer les frais de scolarite.")

    def list(self, request, *args, **kwargs):
        self._verifier_administrateur()
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self._verifier_administrateur()
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._verifier_administrateur()
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._verifier_administrateur()
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._verifier_administrateur()
        return super().destroy(request, *args, **kwargs)


@extend_schema(responses=inline_serializer(name="SituationFinanciere", fields={
    "classe": inline_serializer(name="ClasseSituationFinanciere", fields={
        "id": serializers.IntegerField(), "nom": serializers.CharField(),
    }),
    "tranche_choices": serializers.ListField(child=inline_serializer(
        name="ChoixTrancheFinanciere", fields={
            "valeur": serializers.CharField(), "libelle": serializers.CharField(),
        },
    )),
    "lignes": serializers.ListField(child=inline_serializer(
        name="LigneSituationFinanciere", fields={
            "eleve_id": serializers.IntegerField(), "eleve_nom": serializers.CharField(),
            "tranches": serializers.ListField(child=inline_serializer(
                name="DetailTrancheFinanciere", fields={
                    "tranche": serializers.CharField(), "libelle": serializers.CharField(),
                    "du": serializers.CharField(), "paye": serializers.CharField(),
                    "reste": serializers.CharField(),
                },
            )),
            "total_du": serializers.CharField(), "total_paye": serializers.CharField(),
            "total_reste": serializers.CharField(),
        },
    )),
}))
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def situation_financiere(request, classe_id):
    """
    Pour une classe donnee : pour chaque eleve et chaque tranche, le
    montant du, le montant deja paye et le reste a payer. Reserve a
    l'Administrateur - reprend exactement la meme logique de calcul que
    l'ancienne vue Django (paiements.views.situation_financiere_view),
    afin qu'aucun ecart de calcul n'existe entre les deux interfaces.
    """
    if not hasattr(request.user, "administrateur"):
        return Response({"detail": "Seul un administrateur peut consulter la situation financiere."}, status=403)

    classe = get_object_or_404(Classe, pk=classe_id)
    frais_par_tranche = {f.tranche: f.montant_du for f in FraisScolarite.objects.filter(classe=classe)}
    eleves = Eleve.objects.filter(classe=classe).order_by("nom", "prenom")

    lignes = []
    for eleve in eleves:
        paiements_eleve = Paiement.objects.filter(eleve=eleve)
        detail_tranches = []
        total_du = Decimal("0")
        total_paye = Decimal("0")
        for tranche, libelle in FraisScolarite.TRANCHE_CHOICES:
            du = frais_par_tranche.get(tranche, Decimal("0"))
            paye = sum((p.montant for p in paiements_eleve if p.tranche == tranche), Decimal("0"))
            total_du += du
            total_paye += paye
            detail_tranches.append({
                "tranche": tranche, "libelle": libelle,
                "du": str(du), "paye": str(paye), "reste": str(du - paye),
            })
        lignes.append({
            "eleve_id": eleve.id, "eleve_nom": str(eleve),
            "tranches": detail_tranches,
            "total_du": str(total_du), "total_paye": str(total_paye), "total_reste": str(total_du - total_paye),
        })

    return Response({
        "classe": {"id": classe.id, "nom": str(classe)},
        "tranche_choices": [{"valeur": v, "libelle": l} for v, l in FraisScolarite.TRANCHE_CHOICES],
        "lignes": lignes,
    })
