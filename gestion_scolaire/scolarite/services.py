from decimal import Decimal

from django.core.files.base import ContentFile

from .calculs import calculer_moyenne_matiere
from .models import Bulletin, Note
from .pdf import generer_pdf_bulletin


def _appreciation(moyenne):
    """Appreciation litterale standard, basee sur la moyenne generale (systeme togolais)."""
    if moyenne >= 16:
        return "Excellent. Felicitations."
    if moyenne >= 14:
        return "Tres bien. Encouragements."
    if moyenne >= 12:
        return "Bien. Peut mieux faire."
    if moyenne >= 10:
        return "Passable. Peut mieux faire."
    if moyenne >= 8:
        return "Insuffisant. Doit mieux faire."
    return "Tres insuffisant. Travail insuffisant."


def generer_bulletin(eleve, trimestre):
    """
    Calcule la moyenne generale ponderee (par coefficient de matiere) d'un
    eleve pour un trimestre donne. Cree ou met a jour son Bulletin, puis
    regenere les bulletins PDF de TOUTE la classe pour ce trimestre : le
    rang et les statistiques de classe (moyenne la plus forte/faible, etc.)
    dependent des autres eleves, donc rester exact pour tout le monde
    exige de les regenerer des qu'un nouvel eleve est ajoute au calcul.
    Retourne l'objet Bulletin de l'eleve demande.
    """
    notes = list(Note.objects.filter(eleve=eleve, trimestre=trimestre).select_related("matiere"))

    if not notes:
        raise ValueError("Aucune note saisie pour cet eleve sur ce trimestre.")

    moyenne = _calculer_moyenne_generale(notes)

    Bulletin.objects.update_or_create(
        eleve=eleve,
        trimestre=trimestre,
        defaults={"moyenne_generale": moyenne},
    )

    stats_classe = _recalculer_classement(eleve.classe, trimestre)
    _regenerer_pdfs_classe(eleve.classe, trimestre, stats_classe)

    return Bulletin.objects.get(eleve=eleve, trimestre=trimestre)


def generer_bulletins_lot(eleves, trimestre):
    """Genere les bulletins d'une liste d'eleves et ne traite chaque classe qu'une fois."""
    bulletins = []
    sans_notes = []
    classes_a_recalculer = {}

    for eleve in eleves:
        notes = list(Note.objects.filter(eleve=eleve, trimestre=trimestre).select_related("matiere"))
        if not notes:
            sans_notes.append(eleve.pk)
            continue

        moyenne = _calculer_moyenne_generale(notes)
        bulletin, _ = Bulletin.objects.update_or_create(
            eleve=eleve,
            trimestre=trimestre,
            defaults={"moyenne_generale": moyenne},
        )
        bulletins.append(bulletin)
        if eleve.classe_id:
            classes_a_recalculer[eleve.classe_id] = eleve.classe

    for classe in classes_a_recalculer.values():
        stats_classe = _recalculer_classement(classe, trimestre)
        _regenerer_pdfs_classe(classe, trimestre, stats_classe)

    # Relire les rangs mis a jour avant de construire la reponse API.
    if bulletins:
        bulletins = list(
            Bulletin.objects.filter(pk__in=[bulletin.pk for bulletin in bulletins])
            .select_related("eleve")
            .order_by("eleve__nom", "eleve__prenom", "pk")
        )
    return bulletins, sans_notes


def _calculer_moyenne_generale(notes):
    """Moyenne generale ponderee par coefficient, a partir d'une liste de Note (une matiere ou plus)."""
    notes_par_matiere = {}
    for note in notes:
        notes_par_matiere.setdefault(note.matiere, []).append(note)

    total_points = Decimal("0")
    total_coefficients = Decimal("0")
    for matiere, notes_matiere in notes_par_matiere.items():
        moyenne_matiere = calculer_moyenne_matiere(notes_matiere)
        if moyenne_matiere is None:
            continue
        coef = Decimal(matiere.coefficient)
        total_points += moyenne_matiere * coef
        total_coefficients += coef

    moyenne = (total_points / total_coefficients) if total_coefficients else Decimal("0")
    return moyenne.quantize(Decimal("0.01"))


def _recalculer_classement(classe, trimestre):
    """
    Recalcule le rang de chaque bulletin de la classe pour ce trimestre
    (1 = meilleure moyenne), et renvoie des statistiques globales
    (effectif classe, moyenne la plus forte/faible/de la classe, nombre d'eleves classes).
    """
    if classe is None:
        return {"effectif": 0, "total_classes": 0, "moy_forte": None, "moy_faible": None, "moy_classe": None}

    bulletins = list(
        Bulletin.objects.filter(eleve__classe=classe, trimestre=trimestre).order_by("-moyenne_generale")
    )
    for rang, b in enumerate(bulletins, start=1):
        if b.rang != rang:
            Bulletin.objects.filter(pk=b.pk).update(rang=rang)

    if not bulletins:
        return {"effectif": 0, "total_classes": 0, "moy_forte": None, "moy_faible": None, "moy_classe": None}

    moyennes = [b.moyenne_generale for b in bulletins]
    moy_classe = (sum(moyennes) / Decimal(len(moyennes))).quantize(Decimal("0.01"))

    return {
        "effectif": classe.eleves.count(),
        "total_classes": len(bulletins),
        "moy_forte": max(moyennes),
        "moy_faible": min(moyennes),
        "moy_classe": moy_classe,
    }


def calculer_classement_par_matiere(classe, trimestre):
    """
    Calcule pour chaque matiere le rang de chaque eleve (avec gestion des ex-aequo 'ex'
    fidele a l'exemple officiel : 1er, 6e, 11ex, 23ex...).
    Retourne : dict {matiere_id: {eleve_id: '6e' | '23ex'}}
    """
    if classe is None:
        return {}

    notes = Note.objects.filter(eleve__classe=classe, trimestre=trimestre).select_related("matiere", "eleve")
    notes_par_matiere_eleve = {}
    for note in notes:
        notes_par_matiere_eleve.setdefault(note.matiere_id, {}).setdefault(note.eleve_id, []).append(note)

    rangs_resultat = {}
    for matiere_id, eleves_dict in notes_par_matiere_eleve.items():
        moyennes_eleves = []
        for eleve_id, notes_list in eleves_dict.items():
            moy = calculer_moyenne_matiere(notes_list)
            if moy is not None:
                moyennes_eleves.append((eleve_id, moy))

        moyennes_eleves.sort(key=lambda item: item[1], reverse=True)

        valeurs_counts = {}
        for _, val in moyennes_eleves:
            valeurs_counts[val] = valeurs_counts.get(val, 0) + 1

        rangs_eleves = {}
        for i, (eleve_id, val) in enumerate(moyennes_eleves):
            if i > 0 and val == moyennes_eleves[i - 1][1]:
                rangs_eleves[eleve_id] = rangs_eleves[moyennes_eleves[i - 1][0]]
            else:
                rang_num = i + 1
                est_ex = valeurs_counts[val] > 1
                if rang_num == 1:
                    suffix = "ex" if est_ex else "er"
                    rangs_eleves[eleve_id] = f"1{suffix}"
                else:
                    suffix = "ex" if est_ex else "e"
                    rangs_eleves[eleve_id] = f"{rang_num}{suffix}"

        rangs_resultat[matiere_id] = rangs_eleves

    return rangs_resultat


def _regenerer_pdfs_classe(classe, trimestre, stats_classe):
    """
    Regenere le PDF de tous les bulletins existants de la classe pour ce
    trimestre, avec les statistiques de classe et rangs a jour. Appelee a
    chaque generation individuelle pour que tous les bulletins deja
    emis restent coherents entre eux.
    """
    if classe is None:
        return

    rangs_matieres = calculer_classement_par_matiere(classe, trimestre)
    from .models import Absence

    bulletins = Bulletin.objects.filter(eleve__classe=classe, trimestre=trimestre).select_related("eleve", "eleve__classe")
    for bulletin in bulletins:
        bulletin.refresh_from_db()  # recupere le rang tout juste recalcule
        bulletin.effectif_classe = stats_classe.get("effectif")

        notes = (
            Note.objects.filter(eleve=bulletin.eleve, trimestre=trimestre)
            .select_related("matiere", "enseignant")
            .order_by("matiere__nom")
        )
        notes_par_matiere = {}
        for note in notes:
            notes_par_matiere.setdefault(note.matiere, []).append(note)

        nb_absences = Absence.objects.filter(eleve=bulletin.eleve).count()

        rangs_eleve_matieres = {}
        for mat in notes_par_matiere.keys():
            rangs_eleve_matieres[mat.id] = rangs_matieres.get(mat.id, {}).get(bulletin.eleve_id, "-")

        contenu_pdf = generer_pdf_bulletin(
            bulletin=bulletin,
            notes_par_matiere=notes_par_matiere,
            stats_classe=stats_classe,
            appreciation_fn=_appreciation,
            rangs_matieres=rangs_eleve_matieres,
            nb_absences=nb_absences,
        )
        nom_fichier = f"bulletin_{bulletin.eleve.matricule}_T{trimestre}.pdf"

        # Supprimer explicitement l'ancien fichier AVANT de sauvegarder le nouveau
        if bulletin.fichier_pdf:
            bulletin.fichier_pdf.storage.delete(bulletin.fichier_pdf.name)
        bulletin.fichier_pdf.save(nom_fichier, ContentFile(contenu_pdf), save=True)
