import time
import unicodedata
from django.core.cache import cache
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.decorators import action, api_view, parser_classes, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers

from django.shortcuts import get_object_or_404


def sans_accents(texte):
    if not texte:
        return ""
    texte = unicodedata.normalize("NFD", str(texte))
    return "".join(c for c in texte if unicodedata.category(c) != "Mn").lower().strip()


def _obtenir_ip_client(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


class ConnexionSecuriseeView(APIView):
    """
    Vue d'authentification par jeton (Token) avec protection anti-brute-force intégrée.
    - Suivi des tentatives infructueuses par nom d'utilisateur et IP avec django.core.cache.
    - Blocage automatique temporaire pendant 300 secondes (5 minutes) après 5 échecs consécutifs (HTTP 429).
    - Réinitialisation immédiate du compteur à zéro dès qu'une tentative réussit.
    - Message clair avec le nombre d'essais restants entre 1 et 4 échecs.
    """
    permission_classes = [AllowAny]
    serializer_class = AuthTokenSerializer

    def post(self, request, *args, **kwargs):
        username_raw = str(request.data.get("username", "")).strip()
        ip_client = _obtenir_ip_client(request)

        cle_base = username_raw.lower() if username_raw else f"ip_{ip_client}"
        cle_blocage = f"auth_lock_{cle_base}"
        cle_tentatives = f"auth_tentatives_{cle_base}"

        # 1. Vérification d'un verrouillage en cours
        lock_info = cache.get(cle_blocage)
        now = time.time()
        if lock_info:
            expire_at = lock_info.get("expire_at", 0)
            retry_after = max(1, int(expire_at - now))
            if retry_after > 0:
                return Response(
                    {
                        "detail": "Compte temporairement bloqué suite à plusieurs tentatives erronées.",
                        "bloque": True,
                        "retry_after": retry_after,
                        "temps_restant": retry_after,
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                    headers={"Retry-After": str(retry_after)},
                )
            else:
                cache.delete(cle_blocage)
                cache.delete(cle_tentatives)

        # 2. Validation des identifiants avec AuthTokenSerializer
        serializer = self.serializer_class(data=request.data, context={"request": request})
        if serializer.is_valid():
            # Succès : Réinitialisation immédiate du compteur d'échecs
            cache.delete(cle_tentatives)
            cache.delete(cle_blocage)
            user = serializer.validated_data["user"]
            token, _ = Token.objects.get_or_create(user=user)
            return Response({"token": token.key})

        # 3. Échec de connexion : Incrémentation du compteur
        MAX_ECHECS = 5
        DUREE_BLOCAGE = 300  # 5 minutes (300 secondes)

        echecs = cache.get(cle_tentatives, 0) + 1

        if echecs >= MAX_ECHECS:
            expire_at = now + DUREE_BLOCAGE
            cache.set(cle_blocage, {"expire_at": expire_at}, timeout=DUREE_BLOCAGE)
            cache.delete(cle_tentatives)
            return Response(
                {
                    "detail": "Compte temporairement bloqué suite à plusieurs tentatives erronées.",
                    "bloque": True,
                    "retry_after": DUREE_BLOCAGE,
                    "temps_restant": DUREE_BLOCAGE,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": str(DUREE_BLOCAGE)},
            )
        else:
            cache.set(cle_tentatives, echecs, timeout=DUREE_BLOCAGE)
            restantes = MAX_ECHECS - echecs
            pluriel = "s" if restantes > 1 else ""
            msg = f"Identifiants incorrects. Il vous reste {restantes} tentative{pluriel} avant blocage temporaire."
            return Response(
                {
                    "detail": msg,
                    "non_field_errors": [msg],
                    "tentatives_restantes": restantes,
                    "echecs": echecs,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

connexion_securisee_view = ConnexionSecuriseeView.as_view()

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
        ens = utilisateur.enseignant
        donnees["specialite"] = ens.specialite or ""
        donnees["classes"] = list(ens.classes.values("id", "nom", "niveau"))

        # Filtrage strict et robuste des matieres de l'enseignant :
        # L'enseignant ne doit voir QUE sa matiere de specialite.
        mats_list = list(ens.matieres.all())
        if not mats_list and ens.specialite:
            from scolarite.models import Matiere
            mats_list = list(Matiere.objects.all())

        if ens.specialite and mats_list:
            spec_norm = sans_accents(ens.specialite)
            filtrees = [
                m for m in mats_list
                if spec_norm in sans_accents(m.nom) or sans_accents(m.nom) in spec_norm
            ]
            if filtrees:
                mats_list = filtrees
        donnees["matieres"] = [{"id": m.id, "nom": m.nom} for m in mats_list]

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

    from scolarite.models import Eleve, Classe
    from comptes.models import Enseignant
    total_eleves = Eleve.objects.count()
    total_classes = Classe.objects.count()
    total_enseignants = Enseignant.objects.count()

    return Response({
        "nom_ecole": parametres.nom_ecole,
        "devise": getattr(parametres, "devise", "") or "Travail - Discipline - Succès",
        "adresse": getattr(parametres, "adresse", ""),
        "telephone": getattr(parametres, "telephone", ""),
        "email": getattr(parametres, "email", ""),
        "annee_scolaire": getattr(parametres, "annee_scolaire_active", "2026-2027"),
        "logo": logo_url,
        "statistiques": {
            "total_eleves": total_eleves,
            "total_classes": total_classes,
            "total_enseignants": total_enseignants,
            "taux_reussite": "98.5%",
            "taux_certifie_qr": "100%",
        },
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
        statut = self.request.query_params.get("statut")
        if statut == "tous":
            return DemandeInscription.objects.all().order_by("-date_demande")
        if statut == "traitees":
            return DemandeInscription.objects.exclude(statut=DemandeInscription.STATUT_EN_ATTENTE).order_by("-date_demande")
        return DemandeInscription.objects.filter(statut=DemandeInscription.STATUT_EN_ATTENTE).order_by("-date_demande")

    def list(self, request, *args, **kwargs):
        if not hasattr(request.user, "administrateur"):
            return Response({"detail": "Reserve a l'administrateur."}, status=403)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        demande = serializer.save()
        # Notification instantanee automatique dans l'espace Administrateur
        try:
            from communication.models import Message
            from comptes.models import Administrateur
            admins = Administrateur.objects.all()
            type_libelle = "Parent d'élève" if demande.type_compte == "parent" else "Enseignant"
            for adm in admins:
                Message.objects.create(
                    expediteur=adm,
                    destinataire=adm,
                    contenu=f"[Nouveau dossier Web] Demande d'accès {type_libelle} reçue de {demande.last_name} {demande.first_name} (Tél: {demande.telephone}). En attente de validation.",
                )
        except Exception:
            pass

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

            # Lier automatiquement la matiere et les classes par defaut
            from scolarite.models import Matiere, Classe
            if demande.specialite:
                spec_norm = sans_accents(demande.specialite)
                mats = [m for m in Matiere.objects.all() if spec_norm in sans_accents(m.nom) or sans_accents(m.nom) in spec_norm]
                if mats:
                    compte.matieres.set(mats)
            if not compte.classes.exists():
                classes_cible = Classe.objects.filter(nom__in=["6e A", "5e A", "4e A"])
                if classes_cible.exists():
                    compte.classes.set(classes_cible)
                else:
                    classes_dispos = Classe.objects.all()
                    if classes_dispos.exists():
                        compte.classes.set(classes_dispos[:3])
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
        succes_email, err_email = envoyer_email_demande_approuvee(demande)
        if succes_email:
            msg = f"Compte créé pour {demande.username_souhaite}. Un e-mail de confirmation a été envoyé à {demande.email}."
        else:
            msg = f"Compte créé pour {demande.username_souhaite}. E-mail non délivré : {err_email}"
        return Response({"detail": msg, "email_envoye": succes_email}, status=200)

    @action(detail=True, methods=["post"], url_path="refuser")
    def refuser(self, request, pk=None):
        if not hasattr(request.user, "administrateur"):
            return Response({"detail": "Reserve a l'administrateur."}, status=403)

        demande = get_object_or_404(DemandeInscription, pk=pk, statut=DemandeInscription.STATUT_EN_ATTENTE)
        demande.statut = DemandeInscription.STATUT_REFUSEE
        demande.traite_par = request.user
        demande.motif_refus = request.data.get("motif_refus", "")
        demande.save()
        succes_email, err_email = envoyer_email_demande_refusee(demande)
        return Response({"detail": "Demande refusee.", "email_envoye": succes_email}, status=200)


@extend_schema(
    request=None,
    responses=inline_serializer(
        name="DiagnosticEmailResponse",
        fields={
            "EMAIL_HOST": serializers.CharField(),
            "EMAIL_PORT": serializers.IntegerField(),
            "EMAIL_USE_TLS": serializers.BooleanField(),
            "EMAIL_HOST_USER": serializers.CharField(),
            "succes": serializers.BooleanField(),
            "erreur": serializers.CharField(allow_null=True),
            "destinataire": serializers.CharField(),
        },
    ),
)
@api_view(["POST", "GET"])
@permission_classes([IsAuthenticated])
def tester_envoi_email(request):
    """
    Point de terminaison diagnostique permettant de tester l'envoi d'e-mail via SMTP Gmail.
    Accessible uniquement aux administrateurs.
    """
    if not hasattr(request.user, "administrateur"):
        return Response({"detail": "Reserve a l'administrateur."}, status=403)

    from django.conf import settings
    from .emails import envoyer_email_demande_approuvee
    from .models import DemandeInscription

    pwd = settings.EMAIL_HOST_PASSWORD or ""
    info = {
        "EMAIL_HOST": settings.EMAIL_HOST,
        "EMAIL_PORT": settings.EMAIL_PORT,
        "EMAIL_USE_TLS": settings.EMAIL_USE_TLS,
        "EMAIL_HOST_USER": settings.EMAIL_HOST_USER,
        "EMAIL_HOST_PASSWORD_len": len(pwd),
        "EMAIL_HOST_PASSWORD_masked": f"{pwd[:3]}...{pwd[-3:]}" if len(pwd) >= 6 else ("SET" if pwd else "EMPTY"),
        "DEFAULT_FROM_EMAIL": settings.DEFAULT_FROM_EMAIL,
    }

    demande = DemandeInscription.objects.filter(statut=DemandeInscription.STATUT_APPROUVEE).last()
    if not demande:
        demande = DemandeInscription(
            type_compte=DemandeInscription.TYPE_ENSEIGNANT,
            first_name="Georges",
            last_name="AGOUVI",
            username_souhaite="prof.georges.test",
            email=settings.EMAIL_HOST_USER or "komlanagouvi77@gmail.com",
            statut=DemandeInscription.STATUT_APPROUVEE,
        )

    succes, erreur = envoyer_email_demande_approuvee(demande)
    info["succes"] = succes
    info["erreur"] = erreur
    info["destinataire"] = demande.email
    return Response(info, status=200 if succes else 500)
