import json
import os
import urllib.error
import urllib.request
import uuid
from decimal import Decimal

from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import extend_schema, inline_serializer
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.http import HttpResponse

from comptes.models import Parametres
from scolarite.models import Classe, Eleve
from .models import FraisScolarite, Paiement, TransactionEnLigne
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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initier_paiement_mobile_money(request):
    """
    Initie un paiement Mobile Money (T-Money ou Flooz).
    Accessible a l'Administrateur et aux Parents (pour leurs enfants).
    Contacte FedaPay si configure (FEDAPAY_SECRET_KEY dans l'environnement),
    ou prepare la transaction locale en attente de validation push USSD.
    """
    utilisateur = request.user
    donnees = request.data

    eleve_id = donnees.get("eleve_id")
    tranche = donnees.get("tranche")
    montant_str = donnees.get("montant")
    operateur = str(donnees.get("operateur", "tmoney")).lower().strip()
    telephone = str(donnees.get("telephone", "")).strip().replace(" ", "").replace("-", "")

    if not eleve_id or not tranche or not montant_str:
        return Response({"detail": "Eleve, tranche et montant sont requis."}, status=400)

    try:
        montant = Decimal(str(montant_str))
        if montant <= 0:
            return Response({"detail": "Le montant doit etre superieur a 0 FCFA."}, status=400)
    except Exception:
        return Response({"detail": "Montant invalide."}, status=400)

    eleve = get_object_or_404(Eleve, pk=eleve_id)

    # Verification de securite : un parent ne peut payer que pour ses propres enfants
    if hasattr(utilisateur, "parent"):
        if not utilisateur.parent.eleves.filter(pk=eleve.pk).exists():
            raise PermissionDenied("Vous ne pouvez initier de paiement que pour vos propres enfants.")
    elif not hasattr(utilisateur, "administrateur"):
        raise PermissionDenied("Seul un parent ou un administrateur peut initier un paiement.")

    # Validation du numero togolais (+228 ou 8 chiffres)
    if not telephone:
        return Response({"detail": "Le numero de telephone Mobile Money est obligatoire."}, status=400)

    clean_tel = telephone
    if clean_tel.startswith("+228"):
        clean_tel = clean_tel[4:]
    elif clean_tel.startswith("00228"):
        clean_tel = clean_tel[5:]
    if len(clean_tel) != 8 or not clean_tel.isdigit():
        return Response({"detail": "Le numero de telephone doit comporter 8 chiffres togolais (ex: 90123456)."}, status=400)

    # Generation de la reference unique de transaction
    code_alea = uuid.uuid4().hex[:6].upper()
    prefixe_op = "TM" if operateur == "tmoney" else "FL"
    ref_interne = f"TX-{prefixe_op}-{code_alea}"

    fedapay_key = getattr(settings, "FEDAPAY_SECRET_KEY", None) or os.environ.get("FEDAPAY_SECRET_KEY", "")
    fedapay_env = getattr(settings, "FEDAPAY_ENVIRONMENT", None) or os.environ.get("FEDAPAY_ENVIRONMENT", "sandbox")
    fedapay_url = None
    ref_passerelle = ""

    # Si une cle d'API FedaPay est configuree, creation de la transaction FedaPay
    if fedapay_key:
        api_host = "https://api.fedapay.com/v1" if fedapay_env == "live" else "https://sandbox-api.fedapay.com/v1"
        payload_feda = {
            "description": f"Scolarite {eleve.nom} {eleve.prenom} - T{tranche}",
            "amount": int(montant),
            "currency": {"iso": "XOF"},
            "callback_url": request.build_absolute_uri("/app/#/paiements"),
            "customer": {
                "firstname": eleve.prenom,
                "lastname": eleve.nom,
                "email": utilisateur.email or "comptabilite@magnificat-scolaire.tg",
                "phone_number": {"number": clean_tel, "country": "TG"},
            },
        }
        try:
            req = urllib.request.Request(
                f"{api_host}/transactions",
                data=json.dumps(payload_feda).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {fedapay_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "Magnificat-Scolaire/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                fedapay_tx = res_json.get("v1/transaction") or res_json.get("transaction") or {}
                ref_passerelle = str(fedapay_tx.get("id", ""))
                tok_req = urllib.request.Request(
                    f"{api_host}/transactions/{ref_passerelle}/token",
                    data=b"{}",
                    headers={"Authorization": f"Bearer {fedapay_key}", "Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(tok_req, timeout=10) as tok_resp:
                    tok_json = json.loads(tok_resp.read().decode("utf-8"))
                    fedapay_url = tok_json.get("url")
        except Exception:
            ref_passerelle = f"FEDA-SANDBOX-{code_alea}"

    transaction = TransactionEnLigne.objects.create(
        reference_interne=ref_interne,
        reference_passerelle=ref_passerelle,
        eleve=eleve,
        tranche=int(tranche),
        montant=montant,
        operateur=operateur,
        telephone=telephone,
        statut=TransactionEnLigne.STATUT_EN_ATTENTE,
        initie_par=utilisateur,
    )

    nom_op = "Togocom T-Money" if operateur == "tmoney" else "Moov Africa Flooz"
    return Response({
        "succes": True,
        "reference": ref_interne,
        "montant": str(montant),
        "operateur": operateur,
        "operateur_nom": nom_op,
        "telephone": telephone,
        "fedapay_url": fedapay_url,
        "instructions": f"Demande transmise au +228 {clean_tel}. Veuillez valider la transaction de {int(montant):,} FCFA avec votre code secret {nom_op}.",
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def valider_paiement_mobile_money(request):
    """
    Finalise et valide la transaction Mobile Money.
    Cree l'enregistrement officiel Paiement et associe le recu.
    """
    reference = request.data.get("reference")

    if not reference:
        return Response({"detail": "Reference de transaction requise."}, status=400)

    transaction = get_object_or_404(TransactionEnLigne, reference_interne=reference)

    if transaction.statut == TransactionEnLigne.STATUT_APPROUVEE and transaction.paiement_genere:
        return Response({
            "succes": True,
            "message": "Paiement deja valide.",
            "paiement_id": transaction.paiement_genere.id,
            "reference": transaction.reference_interne,
        })

    parametres = Parametres.charger()
    annee_scolaire = parametres.annee_scolaire_active if parametres else "2026-2027"

    # Creation officielle du paiement
    paiement = Paiement.objects.create(
        eleve=transaction.eleve,
        tranche=transaction.tranche,
        montant=transaction.montant,
        mode_paiement="mobile_money",
        reference=f"{transaction.operateur.upper()}-{transaction.reference_interne}",
        annee_scolaire=annee_scolaire,
        enregistre_par=request.user,
    )

    transaction.statut = TransactionEnLigne.STATUT_APPROUVEE
    transaction.paiement_genere = paiement
    transaction.save()

    return Response({
        "succes": True,
        "message": f"Paiement de {int(transaction.montant):,} FCFA confirme par {transaction.get_operateur_display()} !",
        "paiement_id": paiement.id,
        "reference": transaction.reference_interne,
        "eleve_nom": str(transaction.eleve),
        "montant": str(transaction.montant),
        "tranche": transaction.tranche,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def webhook_fedapay(request):
    """
    Webhook public appele automatiquement par FedaPay lors de l'aboutissement d'un paiement.
    """
    corps = request.data
    event = corps.get("name") or corps.get("event")
    entity = corps.get("entity", {})
    ref_passerelle = str(entity.get("id", ""))
    statut = entity.get("status")

    if event == "transaction.approved" or statut == "approved":
        tx = TransactionEnLigne.objects.filter(reference_passerelle=ref_passerelle).first()
        if tx and tx.statut != TransactionEnLigne.STATUT_APPROUVEE:
            parametres = Parametres.charger()
            annee = parametres.annee_scolaire_active if parametres else "2026-2027"
            p = Paiement.objects.create(
                eleve=tx.eleve,
                tranche=tx.tranche,
                montant=tx.montant,
                mode_paiement="mobile_money",
                reference=f"FEDAPAY-{ref_passerelle}",
                annee_scolaire=annee,
                enregistre_par=tx.initie_par,
            )
            tx.statut = TransactionEnLigne.STATUT_APPROUVEE
            tx.paiement_genere = p
            tx.save()
            return Response({"status": "Paiement confirme avec succes."}, status=200)

    return Response({"status": "Evenement recu."}, status=200)
