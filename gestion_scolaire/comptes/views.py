from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render

from .decorators import role_requis


@login_required
def redirection_apres_connexion(request):
    """
    Redirige l'utilisateur connecte vers le tableau de bord
    correspondant a son role (Administrateur, Enseignant ou Parent).
    """
    utilisateur = request.user

    if hasattr(utilisateur, "administrateur"):
        return redirect("comptes:dashboard_administrateur")
    if hasattr(utilisateur, "enseignant"):
        return redirect("comptes:dashboard_enseignant")
    if hasattr(utilisateur, "parent"):
        return redirect("comptes:dashboard_parent")

    # Cas de secours : utilisateur sans role specifique (ex: superutilisateur
    # cree en ligne de commande, reserve a la maintenance technique).
    return redirect("/admin/")


@login_required
@role_requis("administrateur")
def dashboard_administrateur(request):
    from scolarite.models import Absence, Classe, Eleve
    from paiements.models import Paiement

    contexte = {
        "nb_eleves": Eleve.objects.count(),
        "nb_classes": Classe.objects.count(),
        "nb_absences": Absence.objects.count(),
        "nb_paiements": Paiement.objects.count(),
    }
    return render(request, "comptes/dashboard_administrateur.html", contexte)


@login_required
@role_requis("enseignant")
def dashboard_enseignant(request):
    enseignant = request.user.enseignant
    contexte = {
        "enseignant": enseignant,
        "classes": enseignant.classes.all(),
        "matieres": enseignant.matieres.all(),
        "emploi_du_temps": enseignant.cours.select_related("classe", "matiere").all(),
    }
    return render(request, "comptes/dashboard_enseignant.html", contexte)


@login_required
@role_requis("parent")
def dashboard_parent(request):
    from scolarite.models import Absence
    from paiements.models import Paiement

    parent = request.user.parent
    eleves = parent.eleves.all()
    contexte = {
        "parent": parent,
        "eleves": eleves,
        "absences": Absence.objects.filter(eleve__in=eleves).select_related("eleve").order_by("-date")[:20],
        "paiements": Paiement.objects.filter(eleve__in=eleves).select_related("eleve").order_by("-date_paiement")[:20],
    }
    return render(request, "comptes/dashboard_parent.html", contexte)


@login_required
def demander_conge_view(request):
    """
    N'importe quel membre du personnel (Administrateur ou Enseignant) peut
    demander un conge. Un Parent n'a pas de raison d'en demander (pas de
    lien d'emploi avec l'ecole) : acces refuse.
    """
    from .models import DemandeConge

    utilisateur = request.user
    if not (hasattr(utilisateur, "administrateur") or hasattr(utilisateur, "enseignant")):
        raise PermissionDenied("Seul un membre du personnel peut demander un conge.")

    if request.method == "POST":
        date_debut = request.POST.get("date_debut")
        date_fin = request.POST.get("date_fin")
        motif = request.POST.get("motif", "").strip()

        if date_debut and date_fin and motif:
            DemandeConge.objects.create(
                demandeur=utilisateur, date_debut=date_debut, date_fin=date_fin, motif=motif,
            )
            messages.success(request, "Votre demande de conge a ete envoyee.")
            return redirect("comptes:mes_conges")
        messages.error(request, "Merci de remplir tous les champs.")

    mes_demandes = DemandeConge.objects.filter(demandeur=utilisateur)
    return render(request, "comptes/demander_conge.html", {"mes_demandes": mes_demandes})


@login_required
@role_requis("administrateur")
def gerer_conges_view(request):
    """L'Administrateur voit toutes les demandes de conge et peut les approuver/refuser."""
    from .models import DemandeConge

    if request.method == "POST":
        demande = get_object_or_404(DemandeConge, pk=request.POST.get("demande_id"))
        action = request.POST.get("action")
        if action == "approuver":
            demande.statut = DemandeConge.STATUT_APPROUVEE
        elif action == "refuser":
            demande.statut = DemandeConge.STATUT_REFUSEE
        demande.traite_par = request.user
        demande.save()
        messages.success(request, "Demande mise a jour.")
        return redirect("comptes:gerer_conges")

    demandes = DemandeConge.objects.select_related("demandeur").all()
    return render(request, "comptes/gerer_conges.html", {"demandes": demandes})


def demo_react_view(request):
    """
    Page de demonstration : une petite application React (chargee via CDN,
    sans etape de build Node.js) qui consomme directement l'API REST du
    projet (authentification par token, recuperation des eleves/classes).
    Public (pas de connexion Django requise) : l'authentification se fait
    cote React via l'API elle-meme, qui reste protegee normalement.
    """
    return render(request, "comptes/demo_react.html")


@login_required
@role_requis("administrateur")
def liste_enseignants_view(request):
    """Liste des enseignants, avec creation directe depuis l'application."""
    from .forms import EnseignantCreationForm
    from .models import Enseignant

    if request.method == "POST":
        formulaire = EnseignantCreationForm(request.POST)
        if formulaire.is_valid():
            formulaire.save()
            messages.success(request, "Compte enseignant cree avec succes.")
            return redirect("comptes:liste_enseignants")
    else:
        formulaire = EnseignantCreationForm()

    enseignants = Enseignant.objects.all().order_by("last_name", "first_name", "username")
    return render(request, "comptes/liste_enseignants.html", {"enseignants": enseignants, "formulaire": formulaire})


@login_required
@role_requis("administrateur")
def modifier_enseignant_view(request, enseignant_id):
    """Modification d'un enseignant existant (sans changer son mot de passe)."""
    from .forms import EnseignantModificationForm
    from .models import Enseignant

    enseignant = get_object_or_404(Enseignant, pk=enseignant_id)
    if request.method == "POST":
        formulaire = EnseignantModificationForm(request.POST, instance=enseignant)
        if formulaire.is_valid():
            formulaire.save()
            messages.success(request, "Enseignant mis a jour.")
            return redirect("comptes:liste_enseignants")
    else:
        formulaire = EnseignantModificationForm(instance=enseignant)

    return render(request, "comptes/modifier_enseignant.html", {"formulaire": formulaire, "enseignant": enseignant})


@login_required
@role_requis("administrateur")
def liste_parents_view(request):
    """Liste des parents, avec creation directe depuis l'application."""
    from .forms import ParentCreationForm
    from .models import Parent

    if request.method == "POST":
        formulaire = ParentCreationForm(request.POST)
        if formulaire.is_valid():
            formulaire.save()
            messages.success(request, "Compte parent cree avec succes.")
            return redirect("comptes:liste_parents")
    else:
        formulaire = ParentCreationForm()

    parents = Parent.objects.all().order_by("last_name", "first_name", "username")
    return render(request, "comptes/liste_parents.html", {"parents": parents, "formulaire": formulaire})


@login_required
@role_requis("administrateur")
def modifier_parent_view(request, parent_id):
    """Modification d'un parent existant (sans changer son mot de passe)."""
    from .forms import ParentModificationForm
    from .models import Parent

    parent = get_object_or_404(Parent, pk=parent_id)
    if request.method == "POST":
        formulaire = ParentModificationForm(request.POST, instance=parent)
        if formulaire.is_valid():
            formulaire.save()
            messages.success(request, "Parent mis a jour.")
            return redirect("comptes:liste_parents")
    else:
        formulaire = ParentModificationForm(instance=parent)

    return render(request, "comptes/modifier_parent.html", {"formulaire": formulaire, "parent": parent})


@login_required
@role_requis("administrateur")
def supprimer_enseignant_view(request, enseignant_id):
    """Suppression definitive d'un compte enseignant (Administrateur uniquement)."""
    from .models import Enseignant

    if request.method != "POST":
        raise PermissionDenied("Methode non autorisee.")

    enseignant = get_object_or_404(Enseignant, pk=enseignant_id)
    nom = enseignant.get_full_name() or enseignant.username
    enseignant.delete()
    messages.success(request, f"Le compte de {nom} a ete supprime.")
    return redirect("comptes:liste_enseignants")


@login_required
@role_requis("administrateur")
def supprimer_parent_view(request, parent_id):
    """Suppression definitive d'un compte parent (Administrateur uniquement)."""
    from .models import Parent

    if request.method != "POST":
        raise PermissionDenied("Methode non autorisee.")

    parent = get_object_or_404(Parent, pk=parent_id)
    nom = parent.get_full_name() or parent.username
    parent.delete()
    messages.success(request, f"Le compte de {nom} a ete supprime.")
    return redirect("comptes:liste_parents")


@login_required
@role_requis("administrateur")
def modifier_parametres_view(request):
    """
    Modification de la configuration de l'etablissement (nom, logo,
    coordonnees, annee scolaire active) directement depuis l'application,
    sans passer par /admin/. Reserve a l'Administrateur.
    """
    from .forms import ParametresForm
    from .models import Parametres

    parametres = Parametres.charger()

    if request.method == "POST":
        formulaire = ParametresForm(request.POST, request.FILES, instance=parametres)
        if formulaire.is_valid():
            formulaire.save()
            messages.success(request, "Parametres de l'etablissement mis a jour.")
            return redirect("comptes:modifier_parametres")
    else:
        formulaire = ParametresForm(instance=parametres)

    return render(request, "comptes/modifier_parametres.html", {"formulaire": formulaire, "parametres": parametres})


def accueil_view(request):
    """
    Page d'accueil publique du site (avant connexion) : presente
    l'etablissement et les fonctionnalites de la plateforme, avec un
    bouton d'acces vers la connexion. Si l'utilisateur est deja
    connecte, on le redirige directement vers son tableau de bord.
    """
    if request.user.is_authenticated:
        return redirect("comptes:apres_connexion")

    from .models import Parametres
    parametres = Parametres.charger()
    return render(request, "comptes/accueil.html", {"parametres": parametres})
def demande_acces_view(request):
    """
    Formulaire public (aucune connexion requise) permettant a un futur
    Enseignant ou Parent de demander un acces. La demande reste en
    attente jusqu'a validation par un Administrateur : aucun compte
    n'est cree a ce stade.
    """
    from .forms import DemandeInscriptionForm

    succes = False
    if request.method == "POST":
        formulaire = DemandeInscriptionForm(request.POST)
        if formulaire.is_valid():
            formulaire.save()
            succes = True
            formulaire = DemandeInscriptionForm()
    else:
        formulaire = DemandeInscriptionForm()

    return render(request, "comptes/demande_acces.html", {"formulaire": formulaire, "succes": succes})


@login_required
@role_requis("administrateur")
def gerer_demandes_acces_view(request):
    """
    Liste des demandes d'acces en attente, avec approbation/refus.
    L'approbation cree reellement le compte Enseignant ou Parent, en
    reprenant le mot de passe deja hache lors de la soumission (jamais
    redemande, jamais reaffiche en clair).
    """
    from .emails import envoyer_email_demande_approuvee, envoyer_email_demande_refusee
    from .forms import DemandeInscriptionForm
    from .models import DemandeInscription, Enseignant, Parent
    from scolarite.models import Eleve

    if request.method == "POST":
        demande = get_object_or_404(DemandeInscription, pk=request.POST.get("demande_id"), statut=DemandeInscription.STATUT_EN_ATTENTE)
        action = request.POST.get("action")

        if action == "approuver":
            if demande.type_compte == DemandeInscription.TYPE_ENSEIGNANT:
                compte = Enseignant(
                    username=demande.username_souhaite, first_name=demande.first_name,
                    last_name=demande.last_name, email=demande.email, telephone=demande.telephone,
                    specialite=demande.specialite,
                )
                compte.password = demande.mot_de_passe_hache
                compte.save()
            else:
                compte = Parent(
                    username=demande.username_souhaite, first_name=demande.first_name,
                    last_name=demande.last_name, email=demande.email, telephone=demande.telephone,
                    profession=demande.profession,
                )
                compte.password = demande.mot_de_passe_hache
                compte.save()
                matricules = [m.strip() for m in demande.matricules_enfants.split(",") if m.strip()]
                enfants = Eleve.objects.filter(matricule__in=matricules)
                compte.eleves.set(enfants)

            demande.statut = DemandeInscription.STATUT_APPROUVEE
            demande.traite_par = request.user
            demande.save()
            envoyer_email_demande_approuvee(demande)
            messages.success(request, f"Compte cree pour {demande.username_souhaite}.")

        elif action == "refuser":
            demande.statut = DemandeInscription.STATUT_REFUSEE
            demande.traite_par = request.user
            demande.motif_refus = request.POST.get("motif_refus", "").strip()
            demande.save()
            envoyer_email_demande_refusee(demande)
            messages.success(request, "Demande refusee.")

        return redirect("comptes:gerer_demandes_acces")

    demandes_en_attente = DemandeInscription.objects.filter(statut=DemandeInscription.STATUT_EN_ATTENTE)
    return render(request, "comptes/gerer_demandes_acces.html", {"demandes": demandes_en_attente})