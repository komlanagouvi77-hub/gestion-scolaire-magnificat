from rest_framework import viewsets
from rest_framework.decorators import action, api_view, parser_classes, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers

from django.shortcuts import get_object_or_404

from .emails import envoyer_email_demande_approuvee, envoyer_email_demande_refusee
from .models import DemandeConge, DemandeInscription, Enseignant, Parametres, Parent
from .serializers import (
    DemandeCongeSerializer,
    DemandeInscriptionSerializer,
    EnseignantSerializer,
    ParametresSerializer,
    ParentSerializer,
)


@extend_schema(responses=inline_serializer(name="ProfilConnecte", fields={
    "id": serializers.IntegerField(),
    "username": serializers.CharField(),
    "full_name": serializers.CharField(),
    "role": serializers.CharField(allow_null=True),
    "classes": serializers.ListField(child=serializers.DictField(), required=False),
    "matieres": serializers.ListField(child=serializers.DictField(), required=False),
}))
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def qui_suis_je(request):
    """
    Renvoie l'identite et le role de l'utilisateur connecte (via son token).
    Utilise par les frontends (React, mobile, etc.) pour adapter l'interface
    au role : masquer les onglets non pertinents, personnaliser l'accueil...
    """
    utilisateur = request.user

    if hasattr(utilisateur, "administrateur"):
        role = "administrateur"
    elif hasattr(utilisateur, "enseignant"):
        role = "enseignant"
    elif hasattr(utilisateur, "parent"):
        role = "parent"
    else:
        role = None

    donnees = {
        "id": utilisateur.id,
        "username": utilisateur.username,
        "full_name": utilisateur.get_full_name(),
        "role": role,
    }

    # Un Enseignant n'a pas le droit de lister /api/classes/ ou
    # /api/matieres/ filtres a lui-meme (ces endpoints renvoient TOUTES les
    # classes/matieres de l'etablissement, lecture libre pour tout
    # utilisateur connecte). Pour que le frontend sache lesquelles lui
    # appartiennent reellement (ex: page de saisie des notes), on les
    # expose ici, la seule route qu'un enseignant peut interroger sur
    # lui-meme.
    if role == "enseignant":
        donnees["classes"] = list(utilisateur.enseignant.classes.values("id", "nom", "niveau"))
        donnees["matieres"] = list(utilisateur.enseignant.matieres.values("id", "nom"))

    return Response(donnees)


@extend_schema(request=ParametresSerializer, responses=ParametresSerializer)
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def parametres_ecole(request):
    """
    GET : renvoie la configuration de l'etablissement (nom, logo, annee
    scolaire active...), lisible par tout utilisateur connecte.
    PUT : met a jour la configuration, reserve a l'Administrateur.
    """
    parametres = Parametres.charger()

    if request.method == "PUT":
        if not hasattr(request.user, "administrateur"):
            return Response({"detail": "Seul un administrateur peut modifier ces parametres."}, status=403)
        serializer = ParametresSerializer(parametres, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    serializer = ParametresSerializer(parametres, context={"request": request})
    return Response(serializer.data)


@extend_schema(responses=inline_serializer(name="IdentitePubliqueEcole", fields={
    "nom_ecole": serializers.CharField(allow_blank=True),
    "logo": serializers.URLField(allow_null=True),
}))
@api_view(["GET"])
@permission_classes([AllowAny])
def identite_publique_ecole(request):
    """
    Version publique et minimale des parametres de l'etablissement : juste
    le nom et le logo, pour affichage sur l'ecran de connexion (avant
    authentification). Volontairement AllowAny, mais ne renvoie AUCUNE
    donnee sensible (pas d'adresse, telephone, email, annee scolaire) :
    seulement ce qui est deja visible publiquement sur la vitrine/pancarte
    de l'ecole.
    """
    parametres = Parametres.charger()
    logo_url = None
    if parametres.logo:
        logo_url = request.build_absolute_uri(parametres.logo.url)

    return Response({
        "nom_ecole": parametres.nom_ecole,
        "logo": logo_url,
    })


def _verifier_administrateur(request):
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Reserve a l'administrateur.")


class EnseignantViewSet(viewsets.ModelViewSet):
    """
    Gestion des comptes Enseignant depuis l'API (utilise par le frontend
    React). Entierement reserve a l'Administrateur : c'est la creation de
    comptes utilisateurs, donc pas de lecture publique.
    """

    queryset = Enseignant.objects.all().order_by("last_name", "first_name", "username")
    serializer_class = EnseignantSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        _verifier_administrateur(request)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        _verifier_administrateur(request)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        _verifier_administrateur(request)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        _verifier_administrateur(request)
        return super().partial_update(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        _verifier_administrateur(request)
        return super().retrieve(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        _verifier_administrateur(request)
        return super().destroy(request, *args, **kwargs)


class ParentViewSet(viewsets.ModelViewSet):
    """Gestion des comptes Parent depuis l'API, entierement reserve a l'Administrateur."""

    queryset = Parent.objects.all().order_by("last_name", "first_name", "username")
    serializer_class = ParentSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        _verifier_administrateur(request)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        _verifier_administrateur(request)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        _verifier_administrateur(request)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        _verifier_administrateur(request)
        return super().partial_update(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        _verifier_administrateur(request)
        return super().retrieve(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        _verifier_administrateur(request)
        return super().destroy(request, *args, **kwargs)


class DemandeCongeViewSet(viewsets.ModelViewSet):
    """
    Demandes de conge du personnel (Administrateur ou Enseignant). Un
    Parent n'a pas de lien d'emploi avec l'ecole : acces refuse. Chaque
    membre du personnel voit et cree ses propres demandes ; un
    Administrateur voit toutes les demandes et peut approuver/refuser celles
    des autres demandeurs. L'auto-approbation et l'auto-refus sont interdits.
    """

    serializer_class = DemandeCongeSerializer

    def get_queryset(self):
        utilisateur = self.request.user
        if hasattr(utilisateur, "administrateur"):
            return DemandeConge.objects.select_related("demandeur", "traite_par").all().order_by("-date_demande")
        if hasattr(utilisateur, "enseignant"):
            return DemandeConge.objects.filter(demandeur=utilisateur).order_by("-date_demande")
        return DemandeConge.objects.none()

    def perform_create(self, serializer):
        utilisateur = self.request.user
        if not (hasattr(utilisateur, "administrateur") or hasattr(utilisateur, "enseignant")):
            raise PermissionDenied("Seul un membre du personnel peut demander un conge.")
        serializer.save(demandeur=utilisateur)

    @action(detail=True, methods=["post"], url_path="approuver")
    def approuver(self, request, pk=None):
        _verifier_administrateur(request)
        demande = get_object_or_404(DemandeConge, pk=pk)
        if demande.demandeur_id == request.user.pk:
            raise PermissionDenied("Vous ne pouvez pas approuver votre propre demande de conge.")
        if demande.statut != DemandeConge.STATUT_EN_ATTENTE:
            raise PermissionDenied("Cette demande de conge a deja ete traitee.")
        demande.statut = DemandeConge.STATUT_APPROUVEE
        demande.traite_par = request.user
        demande.save()
        return Response(DemandeCongeSerializer(demande).data)

    @action(detail=True, methods=["post"], url_path="refuser")
    def refuser(self, request, pk=None):
        _verifier_administrateur(request)
        demande = get_object_or_404(DemandeConge, pk=pk)
        if demande.demandeur_id == request.user.pk:
            raise PermissionDenied("Vous ne pouvez pas refuser votre propre demande de conge.")
        if demande.statut != DemandeConge.STATUT_EN_ATTENTE:
            raise PermissionDenied("Cette demande de conge a deja ete traitee.")
        demande.statut = DemandeConge.STATUT_REFUSEE
        demande.traite_par = request.user
        demande.save()
        return Response(DemandeCongeSerializer(demande).data)


class DemandeInscriptionViewSet(viewsets.ModelViewSet):
    """
    Demandes d'acces (Enseignant/Parent), utilisees par le frontend React.
    - create (POST) : PUBLIC, aucune connexion requise (formulaire "Demander un acces").
    - list/retrieve : Administrateur uniquement, limite aux demandes en attente.
    - approuver/refuser : Administrateur uniquement, meme logique que la vue Django
      (mot de passe deja hache repris tel quel, jamais redemande).
    """

    serializer_class = DemandeInscriptionSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        if not hasattr(self.request.user, "administrateur"):
            return DemandeInscription.objects.none()
        return DemandeInscription.objects.filter(statut=DemandeInscription.STATUT_EN_ATTENTE)

    def list(self, request, *args, **kwargs):
        if not hasattr(request.user, "administrateur"):
            return Response({"detail": "Reserve a l'administrateur."}, status=403)
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="approuver")
    def approuver(self, request, pk=None):
        if not hasattr(request.user, "administrateur"):
            return Response({"detail": "Reserve a l'administrateur."}, status=403)

        demande = get_object_or_404(DemandeInscription, pk=pk, statut=DemandeInscription.STATUT_EN_ATTENTE)

        if demande.type_compte == DemandeInscription.TYPE_ENSEIGNANT:
            compte = Enseignant(
                username=demande.username_souhaite, first_name=demande.first_name,
                last_name=demande.last_name, email=demande.email, telephone=demande.telephone,
                specialite=demande.specialite,
            )
            compte.password = demande.mot_de_passe_hache
            compte.save()
        else:
            from scolarite.models import Eleve
            compte = Parent(
                username=demande.username_souhaite, first_name=demande.first_name,
                last_name=demande.last_name, email=demande.email, telephone=demande.telephone,
                profession=demande.profession,
            )
            compte.password = demande.mot_de_passe_hache
            compte.save()
            matricules = [m.strip() for m in demande.matricules_enfants.split(",") if m.strip()]
            compte.eleves.set(Eleve.objects.filter(matricule__in=matricules))

        demande.statut = DemandeInscription.STATUT_APPROUVEE
        demande.traite_par = request.user
        demande.save()
        envoyer_email_demande_approuvee(demande)
        return Response({"detail": f"Compte cree pour {demande.username_souhaite}."}, status=200)

    @action(detail=True, methods=["post"], url_path="refuser")
    def refuser(self, request, pk=None):
        if not hasattr(request.user, "administrateur"):
            return Response({"detail": "Reserve a l'administrateur."}, status=403)

        demande = get_object_or_404(DemandeInscription, pk=pk, statut=DemandeInscription.STATUT_EN_ATTENTE)
        demande.statut = DemandeInscription.STATUT_REFUSEE
        demande.traite_par = request.user
        demande.motif_refus = request.data.get("motif_refus", "")
        demande.save()
        envoyer_email_demande_refusee(demande)
        return Response({"detail": "Demande refusee."}, status=200)
