"""
Fonctions de calcul pures pour les moyennes scolaires.
Isolees dans leur propre module pour eviter tout import circulaire
entre services.py (logique metier) et pdf.py (mise en forme du document).
"""
from .models import Note


def calculer_moyenne_matiere(notes_matiere):
    """
    Calcule la moyenne d'une matiere a partir de ses notes (interrogations,
    devoirs, composition) pour un eleve et un trimestre donnes.

    Regle retenue : la moyenne des interrogations/devoirs (controle continu)
    compte pour 1, la composition compte pour 2 (usage courant dans le
    secondaire togolais). Si un seul des deux types existe, on utilise
    uniquement celui-la.
    """
    notes_cc = [n.valeur for n in notes_matiere if n.type_evaluation != Note.TYPE_COMPOSITION]
    note_composition = next((n.valeur for n in notes_matiere if n.type_evaluation == Note.TYPE_COMPOSITION), None)

    moyenne_cc = (sum(notes_cc) / len(notes_cc)) if notes_cc else None

    if moyenne_cc is not None and note_composition is not None:
        return (moyenne_cc * 1 + note_composition * 2) / 3
    if moyenne_cc is not None:
        return moyenne_cc
    if note_composition is not None:
        return note_composition
    return None