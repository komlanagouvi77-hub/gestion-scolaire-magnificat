from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render

from .models import Evenement, Message


@login_required
def liste_evenements_view(request):
    """Calendrier scolaire (jours feries, vacances, evenements) - visible par tous les roles."""
    evenements = Evenement.objects.all()
    return render(request, "communication/liste_evenements.html", {"evenements": evenements})


def _correspondants_possibles(utilisateur):
    """
    Renvoie la liste des personnes avec qui l'utilisateur connecte peut
    echanger des messages, et les eleves concernes.
    - Un Parent peut ecrire aux enseignants de ses enfants.
    - Un Enseignant peut ecrire aux parents des eleves de ses classes.
    """
    from comptes.models import Enseignant, Parent

    if hasattr(utilisateur, "parent"):
        eleves = utilisateur.parent.eleves.all()
        enseignants = Enseignant.objects.filter(classes__in=[e.classe for e in eleves if e.classe]).distinct()
        return enseignants, eleves
    if hasattr(utilisateur, "enseignant"):
        eleves = utilisateur.enseignant.classes.all()
        from scolarite.models import Eleve
        eleves_qs = Eleve.objects.filter(classe__in=utilisateur.enseignant.classes.all())
        parents = Parent.objects.filter(eleves__in=eleves_qs).distinct()
        return parents, eleves_qs
    return [], []


@login_required
def messagerie_view(request):
    """Boite de reception/envoi des messages Parent <-> Enseignant."""
    utilisateur = request.user
    if not (hasattr(utilisateur, "parent") or hasattr(utilisateur, "enseignant")):
        raise PermissionDenied("La messagerie est reservee aux enseignants et aux parents.")

    correspondants, eleves = _correspondants_possibles(utilisateur)

    if request.method == "POST":
        destinataire_id = request.POST.get("destinataire")
        eleve_id = request.POST.get("eleve")
        contenu = request.POST.get("contenu", "").strip()

        destinataire = get_object_or_404(correspondants, pk=destinataire_id)
        eleve = get_object_or_404(eleves, pk=eleve_id)

        if not contenu:
            messages.error(request, "Le message ne peut pas etre vide.")
        else:
            Message.objects.create(
                expediteur=utilisateur, destinataire=destinataire, eleve=eleve, contenu=contenu,
            )
            messages.success(request, "Message envoye.")
        return redirect("communication:messagerie")

    messages_recus = Message.objects.filter(destinataire=utilisateur).select_related("expediteur", "eleve")
    messages_envoyes = Message.objects.filter(expediteur=utilisateur).select_related("destinataire", "eleve")

    contexte = {
        "correspondants": correspondants,
        "eleves": eleves,
        "messages_recus": messages_recus,
        "messages_envoyes": messages_envoyes,
    }
    return render(request, "communication/messagerie.html", contexte)