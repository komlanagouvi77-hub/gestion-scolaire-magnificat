import io
import os

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from .calculs import calculer_moyenne_matiere

LOGO_PATH_DEFAUT = os.path.join(settings.BASE_DIR, "static", "icons", "icon-512.png")


def _obtenir_infos_ecole():
    """
    Recupere le nom, les coordonnees et le logo de l'ecole depuis la
    configuration modifiable par l'Administrateur (Parametres), avec un
    repli sur les valeurs par defaut si rien n'est encore configure.
    """
    from comptes.models import Parametres

    parametres = Parametres.charger()

    morceaux_coordonnees = [parametres.adresse]
    if parametres.telephone:
        morceaux_coordonnees.append("Tel: " + parametres.telephone)
    if parametres.email:
        morceaux_coordonnees.append(parametres.email)
    coordonnees = "  |  ".join([m for m in morceaux_coordonnees if m])

    chemin_logo = LOGO_PATH_DEFAUT
    if parametres.logo:
        try:
            if os.path.exists(parametres.logo.path):
                chemin_logo = parametres.logo.path
        except Exception:
            chemin_logo = LOGO_PATH_DEFAUT

    chemin_cachet = None
    if parametres.cachet:
        try:
            if os.path.exists(parametres.cachet.path):
                chemin_cachet = parametres.cachet.path
        except Exception:
            chemin_cachet = None

    chemin_signature = None
    if parametres.signature:
        try:
            if os.path.exists(parametres.signature.path):
                chemin_signature = parametres.signature.path
        except Exception:
            chemin_signature = None

    return {
        "nom": parametres.nom_ecole.upper(),
        "coordonnees": coordonnees,
        "logo": chemin_logo,
        "cachet": chemin_cachet,
        "signature": chemin_signature,
        "nom_signataire": parametres.nom_signataire,
        "titre_signataire": parametres.titre_signataire or "Le Directeur",
    }


def _dessiner_filigrane(nom_ecole):
    """
    Renvoie une fonction de dessin du filigrane repetitif du nom de l'ecole
    en fond de page (parametree par le nom actuel, pour rester a jour si
    l'Administrateur change le nom dans la configuration).
    """
    def dessiner(canvas, doc):
        canvas.saveState()
        try:
            canvas.setFillAlpha(0.06)
        except Exception:
            pass
        canvas.setFillColorRGB(0.05, 0.28, 0.42)
        canvas.setFont("Helvetica-Bold", 22)
        canvas.translate(A4[0] / 2, A4[1] / 2)
        canvas.rotate(35)
        for y in range(-900, 900, 55):
            canvas.drawCentredString(0, y, nom_ecole)
        canvas.restoreState()
    return dessiner


def generer_pdf_bulletin(bulletin, notes_par_matiere, stats_classe, appreciation_fn):
    """
    Construit le PDF d'un bulletin scolaire, dans un format proche des
    bulletins reels utilises au Togo : en-tete avec logo et coordonnees de
    l'ecole, filigrane de fond, photo de l'eleve, tableau detaille avec
    appreciation par matiere, statistiques de la classe, et zone de
    signatures.

    notes_par_matiere : dict {Matiere: [Note, ...]}
    stats_classe : dict {effectif, moy_forte, moy_faible, moy_classe}
    appreciation_fn : fonction(moyenne_decimal) -> texte d'appreciation
    """
    tampon = io.BytesIO()
    doc = SimpleDocTemplate(
        tampon, pagesize=A4,
        topMargin=1.3 * cm, bottomMargin=1.3 * cm,
        leftMargin=1.3 * cm, rightMargin=1.3 * cm,
    )
    styles = getSampleStyleSheet()
    titre_style = ParagraphStyle("Titre", parent=styles["Title"], alignment=TA_CENTER, fontSize=15)
    coord_style = ParagraphStyle("Coord", parent=styles["Normal"], alignment=TA_CENTER, fontSize=8, textColor=colors.HexColor("#475569"))

    elements = []

    eleve = bulletin.eleve
    infos_ecole = _obtenir_infos_ecole()

    # --- En-tete : logo, nom/coordonnees de l'ecole, photo de l'eleve ---
    logo_flowable = ""
    if os.path.exists(infos_ecole["logo"]):
        try:
            logo_flowable = Image(infos_ecole["logo"], width=1.6 * cm, height=1.6 * cm)
        except Exception:
            logo_flowable = ""

    bloc_titre = [
        Paragraph(infos_ecole["nom"], titre_style),
        Paragraph(infos_ecole["coordonnees"], coord_style),
    ]

    # ReportLab n'ouvre le fichier de l'Image que plus tard, au moment du
    # rendu (doc.build()) et non a la construction de l'objet Image ci-
    # dessous : un try/except autour du seul constructeur ne suffit donc
    # pas a intercepter un fichier manquant (photo supprimee du disque
    # sans mise a jour de la base, par exemple) - l'exception remontait
    # alors telle quelle jusqu'a faire echouer la generation du bulletin
    # de TOUTE la classe. On verifie donc l'existence reelle du fichier
    # avant meme de construire l'Image.
    photo_flowable = None
    if eleve.photo and os.path.exists(eleve.photo.path):
        try:
            photo_flowable = Image(eleve.photo.path, width=2.4 * cm, height=3 * cm)
        except Exception:
            photo_flowable = None
    if photo_flowable is None:
        photo_flowable = Table([[""]], colWidths=[2.4 * cm], rowHeights=[3 * cm])
        photo_flowable.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.7, colors.grey),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f2f2f2")),
        ]))

    entete = Table([[logo_flowable, bloc_titre, photo_flowable]], colWidths=[2 * cm, 12.5 * cm, 3 * cm])
    entete.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (2, 0), (2, 0), "RIGHT"),
    ]))
    elements.append(entete)
    elements.append(Spacer(1, 0.4 * cm))

    elements.append(Paragraph(
        f"BULLETIN DE NOTES - {bulletin.get_trimestre_display().upper()}",
        ParagraphStyle("Bulletin", parent=styles["Heading2"], alignment=TA_CENTER, fontSize=12,
                       textColor=colors.HexColor("#0C4A6E")),
    ))
    elements.append(Spacer(1, 0.3 * cm))

    # --- Informations sur l'eleve ---
    infos = [
        ["Nom et prenom :", f"{eleve.nom} {eleve.prenom}", "Matricule :", eleve.matricule],
        ["Classe :", str(eleve.classe) if eleve.classe else "-", "Effectif :", str(stats_classe.get("effectif", "-"))],
    ]
    table_infos = Table(infos, colWidths=[3 * cm, 6 * cm, 2.7 * cm, 5.8 * cm])
    table_infos.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(table_infos)
    elements.append(Spacer(1, 0.4 * cm))

    # --- Tableau des notes, matiere par matiere ---
    donnees_notes = [["Matiere", "Coef.", "Interro(s)", "Devoir(s)", "Compo.", "Moy./20", "Professeur", "Signature"]]
    for matiere, notes_matiere in notes_par_matiere.items():
        interros = [n.valeur for n in notes_matiere if n.type_evaluation == "interrogation"]
        devoirs = [n.valeur for n in notes_matiere if n.type_evaluation == "devoir"]
        composition = next((n.valeur for n in notes_matiere if n.type_evaluation == "composition"), None)
        moyenne_matiere = calculer_moyenne_matiere(notes_matiere)

        enseignant_matiere = None
        for n in sorted(notes_matiere, key=lambda x: x.date_saisie, reverse=True):
            if n.enseignant is not None:
                enseignant_matiere = n.enseignant
                break
        nom_professeur = enseignant_matiere.get_full_name() if enseignant_matiere and enseignant_matiere.get_full_name() else (
            enseignant_matiere.username if enseignant_matiere else "-"
        )

        donnees_notes.append([
            matiere.nom,
            str(matiere.coefficient),
            ", ".join(f"{v:.1f}" for v in interros) if interros else "-",
            ", ".join(f"{v:.1f}" for v in devoirs) if devoirs else "-",
            f"{composition:.2f}" if composition is not None else "-",
            f"{moyenne_matiere:.2f}" if moyenne_matiere is not None else "-",
            nom_professeur,
            "",
        ])

    table_notes = Table(
        donnees_notes,
        colWidths=[2.9 * cm, 1 * cm, 2 * cm, 2 * cm, 1.6 * cm, 1.6 * cm, 3.4 * cm, 2.5 * cm],
    )
    table_notes.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0C4A6E")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("ALIGN", (1, 0), (5, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F0F9FF")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (7, 1), (7, -1), 0.6, colors.grey),
    ]))
    elements.append(table_notes)
    elements.append(Spacer(1, 0.5 * cm))

    # --- Synthese : moyenne, rang, statistiques de la classe ---
    def _libelle_rang(rang):
        if rang == 1:
            return "1er"
        return f"{rang}e"

    synthese = [
        ["Moyenne generale", f"{bulletin.moyenne_generale:.2f} / 20"],
        ["Rang", f"{_libelle_rang(bulletin.rang)} sur {stats_classe.get('effectif', '-')} eleves" if bulletin.rang else "-"],
        ["Moyenne la plus forte de la classe", f"{stats_classe['moy_forte']:.2f} / 20" if stats_classe.get("moy_forte") is not None else "-"],
        ["Moyenne la plus faible de la classe", f"{stats_classe['moy_faible']:.2f} / 20" if stats_classe.get("moy_faible") is not None else "-"],
        ["Moyenne de la classe", f"{stats_classe['moy_classe']:.2f} / 20" if stats_classe.get("moy_classe") is not None else "-"],
        ["Appreciation generale", appreciation_fn(bulletin.moyenne_generale)],
    ]
    table_synthese = Table(synthese, colWidths=[8 * cm, 7.5 * cm])
    table_synthese.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#F0F9FF")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(table_synthese)

   # --- Zone de signature et de cachet ---
    elements.append(Spacer(1, 1.4 * cm))

    cachet_flowable = ""
    if infos_ecole.get("cachet"):
        try:
            cachet_flowable = Image(infos_ecole["cachet"], width=2.6 * cm, height=2.6 * cm)
        except Exception:
            cachet_flowable = ""

    signature_flowable = ""
    if infos_ecole.get("signature"):
        try:
            signature_flowable = Image(infos_ecole["signature"], width=3.5 * cm, height=1.6 * cm)
        except Exception:
            signature_flowable = ""

    nom_signataire = infos_ecole.get("nom_signataire") or ""
    titre_signataire = infos_ecole.get("titre_signataire") or "Le Directeur"

    zone_signature = Table(
        [
            ["", signature_flowable, cachet_flowable],
            ["Le Titulaire", titre_signataire, "Cachet de l'etablissement"],
            ["", nom_signataire, ""],
        ],
        colWidths=[5 * cm, 5 * cm, 5 * cm],
        rowHeights=[2 * cm, 0.55 * cm, 0.5 * cm],
    )
    zone_signature.setStyle(TableStyle([
        ("LINEABOVE", (0, 1), (0, 1), 0.7, colors.grey),
        ("LINEABOVE", (1, 1), (1, 1), 0.7, colors.grey),
        ("LINEABOVE", (2, 1), (2, 1), 0.7, colors.grey),
        ("TOPPADDING", (0, 1), (-1, 1), 4),
        ("TOPPADDING", (0, 2), (-1, 2), 1),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, 0), "BOTTOM"),
        ("FONTSIZE", (0, 1), (-1, 1), 9),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 2), (-1, 2), 8),
        ("TEXTCOLOR", (0, 2), (-1, 2), colors.grey),
    ]))
    elements.append(zone_signature)

    filigrane = _dessiner_filigrane(infos_ecole["nom"])
    doc.build(elements, onFirstPage=filigrane, onLaterPages=filigrane)
    return tampon.getvalue()