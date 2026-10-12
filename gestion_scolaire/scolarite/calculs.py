"""
Fonctions de calcul pures pour les moyennes scolaires.
Isolees dans leur propre module pour eviter tout import circulaire
entre services.py (logique metier) et pdf.py (mise en forme du document).
"""
from decimal import Decimal, ROUND_HALF_UP
from .models import Note


def formater_note(valeur, padding=2):
    """Formate une note avec zero initial si inferieure a 10 (ex: 7 -> '07', 7.33 -> '07.33')."""
    if valeur is None:
        return "-"
    v_decimal = Decimal(str(valeur))
    entier = int(v_decimal)
    decimales = v_decimal - entier
    if decimales == 0:
        return f"{entier:02d}"
    # Si partie decimale presente (ex: 7.33 ou 11.5)
    texte = f"{v_decimal:.2f}".rstrip("0").rstrip(".")
    if entier < 10:
        return "0" + texte
    return texte


def appreciation_matiere(moy):
    """
    Appreciation de matiere fidele aux mentions imprimees sur le bulletin officiel :
    Faible. Doit se mettre au travail / Insuffisant. Doit mieux faire / Passable. Peut mieux faire /
    Assez bien, poursuivre l'effort / Tres bien. Excellent travail.
    """
    if moy is None:
        return "-"
    m = Decimal(str(moy))
    if m >= Decimal("16"):
        return "Excellent travail"
    if m >= Decimal("14"):
        return "Tres bien. Excellent travail"
    if m >= Decimal("12"):
        return "Assez bien, poursuivre l'effort"
    if m >= Decimal("10"):
        return "Passable. Peut mieux faire"
    if m >= Decimal("7.5"):
        return "Insuffisant. Doit mieux faire"
    return "Faible. Doit se mettre au travail"


def calculer_moyenne_matiere(notes_matiere):
    """
    Calcule la moyenne d'une matiere a partir de ses notes (interrogations,
    devoirs, composition) pour un eleve et un trimestre donnes.

    Regle officielle du Complexe Scolaire Magnificat :
    M. Cla = moyenne des interrogations et devoirs
    Moy. sur 20 = (M. Cla + Composition) / 2
    Si un seul des deux types existe, on utilise uniquement celui-la.
    """
    notes_cc = [Decimal(str(n.valeur)) for n in notes_matiere if n.type_evaluation != Note.TYPE_COMPOSITION]
    note_composition = next((Decimal(str(n.valeur)) for n in notes_matiere if n.type_evaluation == Note.TYPE_COMPOSITION), None)

    moyenne_cc = (sum(notes_cc) / Decimal(len(notes_cc))) if notes_cc else None

    if moyenne_cc is not None and note_composition is not None:
        # Arrondi au centieme pour la moyenne de classe et la note finale comme sur le bulletin
        m_cla = (moyenne_cc).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return ((m_cla + note_composition) / Decimal("2")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if moyenne_cc is not None:
        return (moyenne_cc).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if note_composition is not None:
        return note_composition.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return None


def calculer_detail_matiere(notes_matiere, coef=1):
    """
    Calcule le detail complet d'une ligne de matiere pour le bulletin :
    - devoirs_valeurs : list[Decimal]
    - devoirs_str : str (ex: '07  05  10')
    - m_cla : Decimal ou None
    - compo : Decimal ou None
    - moy_sur_20 : Decimal ou None
    - coef : int
    - note_definitive : Decimal ou None (moy_sur_20 * coef)
    - appreciation : str
    """
    notes_cc = [Decimal(str(n.valeur)) for n in notes_matiere if n.type_evaluation != Note.TYPE_COMPOSITION]
    note_compo = next((Decimal(str(n.valeur)) for n in notes_matiere if n.type_evaluation == Note.TYPE_COMPOSITION), None)

    devoirs_str = "  ".join(formater_note(v) for v in notes_cc) if notes_cc else "-"

    m_cla = None
    if notes_cc:
        m_cla = (sum(notes_cc) / Decimal(len(notes_cc))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    moy_sur_20 = None
    if m_cla is not None and note_compo is not None:
        moy_sur_20 = ((m_cla + note_compo) / Decimal("2")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    elif m_cla is not None:
        moy_sur_20 = m_cla
    elif note_compo is not None:
        moy_sur_20 = note_compo.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    coef_dec = Decimal(str(coef))
    note_definitive = (moy_sur_20 * coef_dec).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if moy_sur_20 is not None else None

    return {
        "devoirs_str": devoirs_str,
        "m_cla": m_cla,
        "compo": note_compo,
        "moy_sur_20": moy_sur_20,
        "coef": coef,
        "note_definitive": note_definitive,
        "appreciation": appreciation_matiere(moy_sur_20),
    }