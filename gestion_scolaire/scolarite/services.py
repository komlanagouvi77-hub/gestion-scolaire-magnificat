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
    (effectif classe, moyenne la plus forte/faible/de la classe).
    """
    if classe is None:
        return {"effectif": 0, "moy_forte": None, "moy_faible": None, "moy_classe": None}

    bulletins = list(
        Bulletin.objects.filter(eleve__classe=classe, trimestre=trimestre).order_by("-moyenne_generale")
    )
    for rang, b in enumerate(bulletins, start=1):
        if b.rang != rang:
            Bulletin.objects.filter(pk=b.pk).update(rang=rang)

    if not bulletins:
        return {"effectif": 0, "moy_forte": None, "moy_faible": None, "moy_classe": None}

    moyennes = [b.moyenne_generale for b in bulletins]
    moy_classe = (sum(moyennes) / len(moyennes)).quantize(Decimal("0.01"))

    return {
        "effectif": classe.eleves.count(),
        "moy_forte": max(moyennes),
        "moy_faible": min(moyennes),
        "moy_classe": moy_classe,
    }


def _regenerer_pdfs_classe(classe, trimestre, stats_classe):
    """
    Regenere le PDF de tous les bulletins existants de la classe pour ce
    trimestre, avec les statistiques de classe et rangs a jour. Appelee a
    chaque generation individuelle pour que tous les bulletins deja
    emis restent coherents entre eux.
    """
    if classe is None:
        return

    bulletins = Bulletin.objects.filter(eleve__classe=classe, trimestre=trimestre).select_related("eleve")
    for bulletin in bulletins:
        bulletin.refresh_from_db()  # recupere le rang tout juste recalcule
        bulletin.effectif_classe = stats_classe.get("effectif")

        notes = Note.objects.filter(eleve=bulletin.eleve, trimestre=trimestre).select_related("matiere")
        notes_par_matiere = {}
        for note in notes:
            notes_par_matiere.setdefault(note.matiere, []).append(note)

        contenu_pdf = generer_pdf_bulletin(bulletin, notes_par_matiere, stats_classe, _appreciation)
        nom_fichier = f"bulletin_{bulletin.eleve.matricule}_T{trimestre}.pdf"

        # Important : supprimer explicitement l'ancien fichier AVANT de
        # sauvegarder le nouveau. Sans ce delete(), Django ne remplace pas
        # le fichier existant : comme le nom est deja pris sur le disque, le
        # stockage lui ajoute un suffixe aleatoire (bulletin_EL001_T1_xxxxx.pdf)
        # et cree un nouveau fichier a chaque regeneration, en laissant les
        # anciens orphelins. Comme le bulletin de toute la classe se
        # regenere a chaque nouvelle note saisie, ca finit vite par des
        # centaines de fichiers PDF inutiles (c'etait le cas ici).
        if bulletin.fichier_pdf:
            bulletin.fichier_pdf.storage.delete(bulletin.fichier_pdf.name)
        bulletin.fichier_pdf.save(nom_fichier, ContentFile(contenu_pdf), save=True)
