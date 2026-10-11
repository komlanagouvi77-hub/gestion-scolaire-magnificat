from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import extend_schema, inline_serializer

from scolarite.permissions import EstAdministrateurOuLectureSeule
from .models import Annonce, Evenement, Message
from .serializers import AnnonceSerializer, EvenementSerializer, MessageSerializer


class AnnonceViewSet(viewsets.ModelViewSet):
    """
    Tout utilisateur connecte voit les annonces qui le concernent
    (tous / enseignants / parents selon son role).
    Seul un Administrateur peut creer/modifier/supprimer une annonce.
    """

    serializer_class = AnnonceSerializer

    def get_queryset(self):
        utilisateur = self.request.user
        if hasattr(utilisateur, "administrateur"):
            return Annonce.objects.all()
        if hasattr(utilisateur, "enseignant"):
            return Annonce.objects.filter(destinataires__in=["tous", "enseignants"])
        if hasattr(utilisateur, "parent"):
            return Annonce.objects.filter(destinataires__in=["tous", "parents"])
        return Annonce.objects.none()

    def perform_create(self, serializer):
        if not hasattr(self.request.user, "administrateur"):
            raise PermissionDenied("Seul un administrateur peut publier une annonce.")
        serializer.save(auteur=self.request.user)

    def perform_update(self, serializer):
        if not hasattr(self.request.user, "administrateur"):
            raise PermissionDenied("Seul un administrateur peut modifier une annonce.")
        serializer.save()

    def perform_destroy(self, instance):
        if not hasattr(self.request.user, "administrateur"):
            raise PermissionDenied("Seul un administrateur peut supprimer une annonce.")
        instance.delete()


class EvenementViewSet(viewsets.ModelViewSet):
    """
    Calendrier scolaire (jours feries, vacances, evenements).
    Lecture : tout utilisateur connecte. Ecriture : Administrateur uniquement.
    """

    queryset = Evenement.objects.all()
    serializer_class = EvenementSerializer
    permission_classes = [EstAdministrateurOuLectureSeule]

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)


class MessageViewSet(viewsets.ModelViewSet):
    """
    Messagerie Parent <-> Enseignant. Chaque utilisateur ne voit que les
    messages ou il est expediteur ou destinataire.
    """

    queryset = Message.objects.none()
    serializer_class = MessageSerializer

    def get_queryset(self):
        utilisateur = self.request.user
        from django.db.models import Q
        return Message.objects.filter(Q(expediteur=utilisateur) | Q(destinataire=utilisateur))

    def perform_create(self, serializer):
        from .views import _correspondants_possibles
        utilisateur = self.request.user
        if not (hasattr(utilisateur, "parent") or hasattr(utilisateur, "enseignant")):
            raise PermissionDenied("La messagerie est reservee aux enseignants et aux parents.")
        correspondants, eleves = _correspondants_possibles(utilisateur)
        destinataire = serializer.validated_data.get("destinataire")
        eleve = serializer.validated_data.get("eleve")
        # Comparaison par pk, pas par egalite d'instance : "destinataire" est
        # resolu par le serializer comme un comptes.Utilisateur (la classe
        # que cible le ForeignKey de Message), alors que "correspondants"
        # est un queryset d'Enseignant ou de Parent (sous-classes en heritage
        # multi-tables). Ce sont des concrete_model differents, donc Django
        # les considere TOUJOURS inegaux (Model.__eq__ compare aussi la
        # classe), meme pour la meme personne/ligne en base : "destinataire
        # not in correspondants" echouait donc a chaque fois, quel que soit
        # le destinataire choisi, rendant l'envoi de message impossible via
        # cette API (le formulaire React utilise cette route, pas l'ancienne
        # vue Django qui, elle, interroge par pk et n'a pas ce probleme).
        if destinataire.pk not in correspondants.values_list("pk", flat=True):
            raise PermissionDenied("Vous ne pouvez pas ecrire a ce destinataire.")
        if eleve.pk not in eleves.values_list("pk", flat=True):
            raise PermissionDenied("Cet eleve n'est pas dans votre perimetre.")
        serializer.save(expediteur=utilisateur)


@extend_schema(responses=inline_serializer(name="CorrespondantsMessagerie", fields={
    "correspondants": serializers.ListField(child=inline_serializer(
        name="CorrespondantMessagerie", fields={
            "id": serializers.IntegerField(), "nom": serializers.CharField(),
        },
    )),
    "eleves": serializers.ListField(child=inline_serializer(
        name="EleveMessagerie", fields={
            "id": serializers.IntegerField(), "nom": serializers.CharField(),
        },
    )),
}))
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def correspondants_messagerie(request):
    """
    Renvoie, pour l'utilisateur connecte (Enseignant ou Parent), la liste
    des correspondants valides (Enseignants pour un Parent, Parents pour
    un Enseignant) et des eleves concernes, pour construire les listes
    deroulantes du formulaire d'envoi de message cote React. Reutilise
    EXACTEMENT la meme logique de perimetre que l'application Django
    (_correspondants_possibles), donc aucune incoherence possible entre
    les deux interfaces.
    """
    from .views import _correspondants_possibles

    utilisateur = request.user
    if not (hasattr(utilisateur, "parent") or hasattr(utilisateur, "enseignant")):
        return Response({"detail": "Reserve aux enseignants et aux parents."}, status=403)

    correspondants, eleves = _correspondants_possibles(utilisateur)
    return Response({
        "correspondants": [{"id": c.id, "nom": c.get_full_name() or c.username} for c in correspondants],
        "eleves": [{"id": e.id, "nom": f"{e.nom} {e.prenom}"} for e in eleves],
    })
