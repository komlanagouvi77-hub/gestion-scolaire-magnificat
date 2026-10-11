from decimal import Decimal

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render

from scolarite.models import Classe, Eleve
from .forms import PaiementForm
from .models import FraisScolarite, Paiement


@login_required
def situation_financiere_view(request, classe_id):
    """
    Pour une classe donnee : montre, pour chaque eleve et chaque tranche,
    le montant du, le montant deja paye, et le reste a payer.
    Reserve a l'Administrateur.
    """
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut consulter la situation financiere.")

    classe = get_object_or_404(Classe, pk=classe_id)
    frais_par_tranche = {f.tranche: f.montant_du for f in FraisScolarite.objects.filter(classe=classe)}
    eleves = Eleve.objects.filter(classe=classe).order_by("nom", "prenom")

    lignes = []
    for eleve in eleves:
        paiements_eleve = Paiement.objects.filter(eleve=eleve)
        detail_tranches = []
        for tranche, libelle in FraisScolarite.TRANCHE_CHOICES:
            du = frais_par_tranche.get(tranche, Decimal("0"))
            paye = sum((p.montant for p in paiements_eleve if p.tranche == tranche), Decimal("0"))
            detail_tranches.append({
                "libelle": libelle, "du": du, "paye": paye, "reste": du - paye,
            })
        lignes.append({"eleve": eleve, "tranches": detail_tranches})

    contexte = {
        "classe": classe,
        "lignes": lignes,
        "frais_par_tranche": FraisScolarite.objects.filter(classe=classe),
        "tranche_choices": FraisScolarite.TRANCHE_CHOICES,
    }
    return render(request, "paiements/situation_financiere.html", contexte)


@login_required
def definir_frais_view(request, classe_id):
    """Permet a l'Administrateur de definir le montant du par tranche pour une classe."""
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut definir les frais de scolarite.")

    classe = get_object_or_404(Classe, pk=classe_id)

    if request.method == "POST":
        for tranche, _libelle in FraisScolarite.TRANCHE_CHOICES:
            montant = request.POST.get(f"montant_{tranche}", "").strip()
            if montant:
                FraisScolarite.objects.update_or_create(
                    classe=classe, tranche=tranche, defaults={"montant_du": montant},
                )
        messages.success(request, "Frais de scolarite mis a jour.")
        return redirect("paiements:situation_financiere", classe_id=classe.id)

    return redirect("paiements:situation_financiere", classe_id=classe.id)


@login_required
def liste_paiements_view(request):
    """
    Enregistrement des paiements de scolarite depuis l'application
    (reserve a l'Administrateur) : formulaire de saisie + historique complet.
    """
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut enregistrer des paiements.")

    from comptes.models import Parametres
    parametres = Parametres.charger()

    if request.method == "POST":
        formulaire = PaiementForm(request.POST, initial={"annee_scolaire": parametres.annee_scolaire_active})
        if formulaire.is_valid():
            paiement = formulaire.save(commit=False)
            paiement.enregistre_par = request.user
            paiement.save()
            messages.success(request, "Paiement enregistre avec succes.")
            return redirect("paiements:recu_paiement", paiement_id=paiement.id)
    else:
        formulaire = PaiementForm(initial={"annee_scolaire": parametres.annee_scolaire_active})

    paiements = Paiement.objects.select_related("eleve", "eleve__classe").order_by("-id")[:100]
    return render(request, "paiements/liste_paiements.html", {"formulaire": formulaire, "paiements": paiements})


@login_required
def recu_paiement_view(request, paiement_id):
    """Recu numerique d'un paiement, presentable et imprimable (Administrateur uniquement)."""
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut consulter ce recu.")

    from comptes.models import Parametres
    paiement = get_object_or_404(Paiement, pk=paiement_id)
    parametres = Parametres.charger()

    if paiement.enregistre_par:
        nom_enregistre_par = paiement.enregistre_par.get_full_name() or paiement.enregistre_par.username
    else:
        nom_enregistre_par = "-"

    contexte = {"paiement": paiement, "parametres": parametres, "nom_enregistre_par": nom_enregistre_par}
    return render(request, "paiements/recu_paiement.html", contexte)