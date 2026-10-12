from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.db.models import Count
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import ClasseForm, EleveForm, MatiereForm
from .models import Absence, Bulletin, Classe, Cours, Eleve, Matiere, Note, Observation
from .services import generer_bulletin


@login_required
@require_POST
def generer_bulletin_view(request, eleve_id, trimestre):
    """
    Genere (ou regenere) le bulletin PDF d'un eleve pour un trimestre.
    Reserve a l'Administrateur.
    """
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut generer un bulletin.")

    eleve = get_object_or_404(Eleve, pk=eleve_id)
    try:
        generer_bulletin(eleve, trimestre)
        messages.success(request, f"Bulletin genere pour {eleve.nom} {eleve.prenom} (trimestre {trimestre}).")
    except ValueError as erreur:
        messages.error(request, str(erreur))

    return redirect("scolarite:liste_bulletins")


@login_required
def liste_bulletins_view(request):
    """
    Page listant les eleves et permettant de generer/telecharger leurs bulletins.
    Administrateur : tous les eleves. Enseignant : ses classes. Parent : ses enfants.
    """
    utilisateur = request.user

    if hasattr(utilisateur, "administrateur"):
        eleves = Eleve.objects.select_related("classe").all()
    elif hasattr(utilisateur, "enseignant"):
        eleves = Eleve.objects.select_related("classe").filter(classe__in=utilisateur.enseignant.classes.all())
    elif hasattr(utilisateur, "parent"):
        eleves = utilisateur.parent.eleves.select_related("classe").all()
    else:
        eleves = Eleve.objects.none()

    contexte = {
        "eleves": eleves,
        "trimestres": Bulletin.TRIMESTRE_CHOICES,
        "est_administrateur": hasattr(utilisateur, "administrateur"),
    }
    return render(request, "scolarite/liste_bulletins.html", contexte)


@login_required
def telecharger_bulletin_view(request, bulletin_id):
    """
    Telecharge le PDF d'un bulletin.
    Autorise : Administrateur (tous), Enseignant (ses classes), Parent (ses enfants).
    """
    bulletin = get_object_or_404(Bulletin, pk=bulletin_id)
    utilisateur = request.user

    autorise = False
    if hasattr(utilisateur, "administrateur"):
        autorise = True
    elif hasattr(utilisateur, "enseignant"):
        autorise = bulletin.eleve.classe in utilisateur.enseignant.classes.all()
    elif hasattr(utilisateur, "parent"):
        autorise = bulletin.eleve in utilisateur.parent.eleves.all()

    if not autorise:
        raise PermissionDenied("Vous n'avez pas acces a ce bulletin.")

    if not bulletin.fichier_pdf:
        raise Http404("Ce bulletin n'a pas encore ete genere.")

    return FileResponse(bulletin.fichier_pdf.open("rb"), as_attachment=True, filename=bulletin.fichier_pdf.name.split("/")[-1])


@login_required
def saisir_notes_view(request):
    """
    Permet a un Enseignant de saisir les notes (interrogation, devoir,
    composition) de ses propres eleves, uniquement pour ses classes et
    matieres assignees.
    """
    if not hasattr(request.user, "enseignant"):
        raise PermissionDenied("Seul un enseignant peut saisir des notes.")

    enseignant = request.user.enseignant
    classes = enseignant.classes.all()
    matieres = enseignant.matieres.all()

    classe_id = request.POST.get("classe") or request.GET.get("classe")
    matiere_id = request.POST.get("matiere") or request.GET.get("matiere")
    trimestre = request.POST.get("trimestre") or request.GET.get("trimestre")
    type_evaluation = request.POST.get("type_evaluation") or request.GET.get("type_evaluation")

    eleves = []
    classe_selectionnee = None
    matiere_selectionnee = None
    trimestre_verrouille = False

    if classe_id and matiere_id and trimestre and type_evaluation:
        classe_selectionnee = get_object_or_404(classes, pk=classe_id)
        matiere_selectionnee = get_object_or_404(matieres, pk=matiere_id)
        eleves = Eleve.objects.filter(classe=classe_selectionnee).order_by("nom", "prenom")

        from comptes.models import Parametres
        trimestre_verrouille = Parametres.charger().trimestre_verrouille(trimestre)

        if request.method == "POST" and "enregistrer" in request.POST:
            if trimestre_verrouille:
                raise PermissionDenied("Ce trimestre est verrouille par l'administration : les notes ne peuvent plus etre modifiees.")
            for eleve in eleves:
                valeur = request.POST.get(f"note_{eleve.id}", "").strip()
                if valeur == "":
                    continue
                Note.objects.update_or_create(
                    eleve=eleve,
                    matiere=matiere_selectionnee,
                    trimestre=trimestre,
                    type_evaluation=type_evaluation,
                    defaults={"valeur": valeur, "enseignant": request.user},
                )
            messages.success(request, "Notes enregistrees avec succes.")
            return redirect(
                f"{request.path}?classe={classe_id}&matiere={matiere_id}"
                f"&trimestre={trimestre}&type_evaluation={type_evaluation}"
            )

    contexte = {
        "classes": classes,
        "matieres": matieres,
        "trimestres": Bulletin.TRIMESTRE_CHOICES,
        "types_evaluation": Note.TYPE_CHOICES,
        "eleves": eleves,
        "classe_selectionnee": classe_selectionnee,
        "matiere_selectionnee": matiere_selectionnee,
        "trimestre_selectionne": int(trimestre) if trimestre else None,
        "type_selectionne": type_evaluation,
        "trimestre_verrouille": trimestre_verrouille,
    }
    return render(request, "scolarite/saisir_notes.html", contexte)


@login_required
def saisir_absences_view(request):
    """
    Permet a un Enseignant d'enregistrer les presences/absences du jour
    pour une de ses classes. Une case cochee = eleve absent.
    """
    if not hasattr(request.user, "enseignant"):
        raise PermissionDenied("Seul un enseignant peut saisir les absences.")

    enseignant = request.user.enseignant
    classes = enseignant.classes.all()

    classe_id = request.POST.get("classe") or request.GET.get("classe")
    date_absence = request.POST.get("date") or request.GET.get("date")

    eleves = []
    classe_selectionnee = None

    if classe_id and date_absence:
        classe_selectionnee = get_object_or_404(classes, pk=classe_id)
        eleves = Eleve.objects.filter(classe=classe_selectionnee).order_by("nom", "prenom")

        if request.method == "POST" and "enregistrer" in request.POST:
            for eleve in eleves:
                est_absent = request.POST.get(f"absent_{eleve.id}") == "on"
                motif = request.POST.get(f"motif_{eleve.id}", "").strip()
                justifiee = request.POST.get(f"justifiee_{eleve.id}") == "on"

                absence_existante = Absence.objects.filter(eleve=eleve, date=date_absence).first()
                if est_absent:
                    Absence.objects.update_or_create(
                        eleve=eleve, date=date_absence,
                        defaults={"justifiee": justifiee, "motif": motif, "enregistree_par": request.user},
                    )
                elif absence_existante:
                    absence_existante.delete()

            messages.success(request, "Presences enregistrees avec succes.")
            return redirect(f"{request.path}?classe={classe_id}&date={date_absence}")

    absences_existantes = {}
    eleves_avec_absence = []
    if classe_selectionnee and date_absence:
        for a in Absence.objects.filter(eleve__classe=classe_selectionnee, date=date_absence):
            absences_existantes[a.eleve_id] = a
        eleves_avec_absence = [(eleve, absences_existantes.get(eleve.id)) for eleve in eleves]

    contexte = {
        "classes": classes,
        "eleves": eleves,
        "eleves_avec_absence": eleves_avec_absence,
        "classe_selectionnee": classe_selectionnee,
        "date_selectionnee": date_absence,
    }
    return render(request, "scolarite/saisir_absences.html", contexte)


@login_required
def gestion_classe_view(request, classe_id):
    """
    Vue de gestion d'une classe pour l'Enseignant : liste des eleves avec
    leur moyenne generale (dernier trimestre note) et leur nombre
    d'absences non justifiees, pour un suivi rapide.
    Reserve a l'enseignant assigne a cette classe (ou a l'Administrateur).
    """
    from django.db.models import Count, Q as Qd

    classe = get_object_or_404(Classe, pk=classe_id)
    utilisateur = request.user

    autorise = hasattr(utilisateur, "administrateur") or (
        hasattr(utilisateur, "enseignant") and classe in utilisateur.enseignant.classes.all()
    )
    if not autorise:
        raise PermissionDenied("Vous n'avez pas acces a la gestion de cette classe.")

    eleves = list(Eleve.objects.filter(classe=classe).order_by("nom", "prenom").annotate(
        nb_absences_non_justifiees=Count("absences", filter=Qd(absences__justifiee=False)),
    ))

    for eleve in eleves:
        dernier_bulletin = eleve.bulletins.order_by("-trimestre").first()
        eleve.derniere_moyenne = dernier_bulletin.moyenne_generale if dernier_bulletin else None
        eleve.nb_observations_negatives = eleve.observations.filter(type_observation=Observation.TYPE_NEGATIVE).count()

    contexte = {
        "classe": classe,
        "est_administrateur": hasattr(utilisateur, "administrateur"),
        "eleves": eleves,
    }
    return render(request, "scolarite/gestion_classe.html", contexte)


@login_required
def fiche_eleve_view(request, eleve_id):
    """
    Fiche detaillee d'un eleve : notes par matiere/trimestre, absences,
    bulletins, et observations comportementales. Accessible a
    l'Administrateur, a l'Enseignant de sa classe, et au Parent de cet
    eleve (le Parent ne voit pas les observations marquees non-visibles).
    Seul un Enseignant de la classe peut ajouter une observation.
    """
    eleve = get_object_or_404(Eleve, pk=eleve_id)
    utilisateur = request.user

    est_administrateur = hasattr(utilisateur, "administrateur")
    est_enseignant_de_la_classe = hasattr(utilisateur, "enseignant") and eleve.classe in utilisateur.enseignant.classes.all()
    est_parent_de_l_eleve = hasattr(utilisateur, "parent") and eleve in utilisateur.parent.eleves.all()

    if not (est_administrateur or est_enseignant_de_la_classe or est_parent_de_l_eleve):
        raise PermissionDenied("Vous n'avez pas acces a cette fiche eleve.")

    if request.method == "POST":
        if not est_enseignant_de_la_classe:
            raise PermissionDenied("Seul l'enseignant de la classe peut ajouter une observation.")
        contenu = request.POST.get("contenu", "").strip()
        type_observation = request.POST.get("type_observation", Observation.TYPE_NEUTRE)
        visible_parent = request.POST.get("visible_parent") == "on"
        if contenu:
            Observation.objects.create(
                eleve=eleve, enseignant=utilisateur, type_observation=type_observation,
                contenu=contenu, visible_parent=visible_parent,
            )
            messages.success(request, "Observation enregistree.")
        return redirect("scolarite:fiche_eleve", eleve_id=eleve.id)

    observations = eleve.observations.all()
    if est_parent_de_l_eleve and not (est_administrateur or est_enseignant_de_la_classe):
        observations = observations.filter(visible_parent=True)

    contexte = {
        "eleve": eleve,
        "notes": eleve.notes.select_related("matiere").order_by("trimestre", "matiere__nom"),
        "absences": eleve.absences.order_by("-date"),
        "bulletins": eleve.bulletins.order_by("trimestre"),
        "observations": observations,
        "types_observation": Observation.TYPE_CHOICES,
        "peut_ajouter_observation": est_enseignant_de_la_classe,
        "est_administrateur": est_administrateur,
    }
    return render(request, "scolarite/fiche_eleve.html", contexte)


@login_required
def importer_eleves_view(request):
    """
    Permet a l'Administrateur d'importer une liste d'eleves en masse depuis
    un fichier CSV ou Excel (.xlsx). Affiche un rapport ligne par ligne
    apres l'import (crees / ignores / en erreur).
    """
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut importer des eleves.")

    from .import_eleves import importer_eleves

    rapport = None
    if request.method == "POST" and request.FILES.get("fichier"):
        fichier = request.FILES["fichier"]
        try:
            rapport = importer_eleves(fichier, fichier.name)
            nb_crees = sum(1 for l in rapport if l["statut"] == "cree")
            messages.success(request, f"{nb_crees} eleve(s) importe(s) avec succes.")
        except ValueError as erreur:
            messages.error(request, str(erreur))

    return render(request, "scolarite/importer_eleves.html", {"rapport": rapport})


@login_required
def telecharger_gabarit_eleves_view(request):
    """Telecharge un fichier CSV modele pour l'import en masse d'eleves."""
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut telecharger ce gabarit.")

    from django.http import HttpResponse
    from .import_eleves import generer_gabarit_csv

    contenu = generer_gabarit_csv()
    reponse = HttpResponse(contenu, content_type="text/csv")
    reponse["Content-Disposition"] = 'attachment; filename="gabarit_import_eleves.csv"'
    return reponse


@login_required
def liste_classes_view(request):
    """Liste des classes, avec creation directe depuis l'application (reserve a l'Administrateur)."""
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut gerer les classes.")

    if request.method == "POST":
        formulaire = ClasseForm(request.POST)
        if formulaire.is_valid():
            formulaire.save()
            messages.success(request, "Classe creee avec succes.")
            return redirect("scolarite:liste_classes")
    else:
        formulaire = ClasseForm()

    classes = Classe.objects.annotate(nb_eleves=Count("eleves")).order_by("annee_scolaire", "niveau", "nom")
    return render(request, "scolarite/liste_classes.html", {"classes": classes, "formulaire": formulaire})


@login_required
def modifier_classe_view(request, classe_id):
    """Modification d'une classe existante (Administrateur uniquement)."""
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut gerer les classes.")

    classe = get_object_or_404(Classe, pk=classe_id)
    if request.method == "POST":
        formulaire = ClasseForm(request.POST, instance=classe)
        if formulaire.is_valid():
            formulaire.save()
            messages.success(request, "Classe mise a jour.")
            return redirect("scolarite:liste_classes")
    else:
        formulaire = ClasseForm(instance=classe)

    return render(request, "scolarite/modifier_classe.html", {"formulaire": formulaire, "classe": classe})


@login_required
def liste_matieres_view(request):
    """Liste des matieres, avec creation directe depuis l'application (reserve a l'Administrateur)."""
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut gerer les matieres.")

    if request.method == "POST":
        formulaire = MatiereForm(request.POST)
        if formulaire.is_valid():
            formulaire.save()
            messages.success(request, "Matiere creee avec succes.")
            return redirect("scolarite:liste_matieres")
    else:
        formulaire = MatiereForm()

    matieres = Matiere.objects.order_by("nom")
    return render(request, "scolarite/liste_matieres.html", {"matieres": matieres, "formulaire": formulaire})


@login_required
def modifier_matiere_view(request, matiere_id):
    """Modification d'une matiere existante (Administrateur uniquement)."""
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut gerer les matieres.")

    matiere = get_object_or_404(Matiere, pk=matiere_id)
    if request.method == "POST":
        formulaire = MatiereForm(request.POST, instance=matiere)
        if formulaire.is_valid():
            formulaire.save()
            messages.success(request, "Matiere mise a jour.")
            return redirect("scolarite:liste_matieres")
    else:
        formulaire = MatiereForm(instance=matiere)

    return render(request, "scolarite/modifier_matiere.html", {"formulaire": formulaire, "matiere": matiere})


@login_required
def modifier_eleve_view(request, eleve_id):
    """Modification d'un eleve existant (Administrateur uniquement)."""
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut modifier un eleve.")

    eleve = get_object_or_404(Eleve, pk=eleve_id)
    if request.method == "POST":
        formulaire = EleveForm(request.POST, request.FILES, instance=eleve)
        if formulaire.is_valid():
            formulaire.save()
            messages.success(request, "Eleve mis a jour.")
            return redirect("scolarite:fiche_eleve", eleve_id=eleve.id)
    else:
        formulaire = EleveForm(instance=eleve)

    return render(request, "scolarite/modifier_eleve.html", {"formulaire": formulaire, "eleve": eleve})


@login_required
@require_POST
def supprimer_eleve_view(request, eleve_id):
    """Suppression definitive d'un eleve (Administrateur uniquement, avec confirmation cote template)."""
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut supprimer un eleve.")

    eleve = get_object_or_404(Eleve, pk=eleve_id)
    nom_complet = f"{eleve.nom} {eleve.prenom}"
    eleve.delete()
    messages.success(request, f"{nom_complet} a ete supprime.")
    return redirect("scolarite:liste_bulletins")


@login_required
@require_POST
def supprimer_classe_view(request, classe_id):
    """Suppression d'une classe (Administrateur uniquement). Refuse si des eleves y sont encore inscrits."""
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut supprimer une classe.")

    classe = get_object_or_404(Classe, pk=classe_id)
    if Eleve.objects.filter(classe=classe).exists():
        messages.error(request, "Impossible de supprimer cette classe : des eleves y sont encore inscrits.")
        return redirect("scolarite:liste_classes")

    classe.delete()
    messages.success(request, "Classe supprimee.")
    return redirect("scolarite:liste_classes")


@login_required
@require_POST
def supprimer_matiere_view(request, matiere_id):
    """Suppression d'une matiere (Administrateur uniquement)."""
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut supprimer une matiere.")

    matiere = get_object_or_404(Matiere, pk=matiere_id)
    matiere.delete()
    messages.success(request, "Matiere supprimee.")
    return redirect("scolarite:liste_matieres")


@login_required
def liste_cours_view(request):
    """Emploi du temps : creation de creneaux (classe/matiere/enseignant/jour/horaire), reserve a l'Administrateur."""
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut gerer l'emploi du temps.")

    from .forms import CoursForm

    if request.method == "POST":
        formulaire = CoursForm(request.POST)
        if formulaire.is_valid():
            formulaire.save()
            messages.success(request, "Creneau ajoute a l'emploi du temps.")
            return redirect("scolarite:liste_cours")
    else:
        formulaire = CoursForm()

    cours = Cours.objects.select_related("classe", "matiere", "enseignant").order_by("jour", "heure_debut")
    return render(request, "scolarite/liste_cours.html", {"formulaire": formulaire, "cours": cours})


@login_required
@require_POST
def supprimer_cours_view(request, cours_id):
    """Suppression d'un creneau d'emploi du temps (Administrateur uniquement)."""
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut supprimer un creneau.")

    creneau = get_object_or_404(Cours, pk=cours_id)
    creneau.delete()
    messages.success(request, "Creneau supprime.")
    return redirect("scolarite:liste_cours")


def verifier_bulletin_public_view(request, bulletin_id):
    """
    Vue publique accessible sans connexion (via scan du QR Code sur le bulletin papier).
    Permet de verifier l'authenticite et la conformite des notes de l'eleve
    pour eviter toute falsification.
    """
    from comptes.models import Parametres
    from .services import _recalculer_classement

    bulletin = get_object_or_404(
        Bulletin.objects.select_related("eleve", "eleve__classe"),
        pk=bulletin_id,
    )
    parametres = Parametres.charger()
    stats = _recalculer_classement(bulletin.eleve.classe, bulletin.trimestre)

    contexte = {
        "bulletin": bulletin,
        "parametres": parametres,
        "stats": stats,
    }
    return render(request, "scolarite/verifier_bulletin.html", contexte)