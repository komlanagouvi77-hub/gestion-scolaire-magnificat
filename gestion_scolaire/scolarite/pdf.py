import io
import os
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.barcode.qr import QrCodeWidget

from .calculs import calculer_moyenne_matiere, calculer_detail_matiere, formater_note

LOGO_PATH_DEFAUT = os.path.join(settings.BASE_DIR, "static", "icons", "icon-512.png")


def _obtenir_infos_ecole():
    """
    Recupere les informations de l'ecole avec repli sur les donnees officielles
    du Complexe Scolaire Magnificat.
    """
    from comptes.models import Parametres

    parametres = Parametres.charger()

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
        "nom_court": "C P L MAGNIFICAT",
        "nom_complet": "Complexe Scolaire Magnificat",
        "contact": "Tél : (+228) 92190256-92635585-99488821 - 08 BP 80213 Lomé 08 - Email: collegemagnificat2024@gmail.com",
        "devise": "-- Trust & Obey --",
        "logo": chemin_logo,
        "cachet": chemin_cachet,
        "signature": chemin_signature,
        "nom_directeur": parametres.nom_signataire or "HOUESSE Komi",
        "titre_signataire": parametres.titre_signataire or "Le Directeur",
        "annee_scolaire": parametres.annee_scolaire_active or "2025-2026",
    }


def _dessiner_filigrane(nom_ecole="COMPLEXE SCOLAIRE MAGNIFICAT"):
    """
    Dessine un filigrane de securite diagonal et discret sur toute la page
    pour empecher les copies frauduleuses.
    """
    def dessiner(canvas, doc):
        canvas.saveState()
        try:
            canvas.setFillAlpha(0.045)
        except Exception:
            pass
        canvas.setFillColorRGB(0.10, 0.25, 0.40)
        canvas.setFont("Helvetica-Bold", 13)
        # Remplissage diagonal du fond de page
        canvas.translate(A4[1] / 2, A4[0] / 2)  # orientation paysage
        canvas.rotate(28)
        for y in range(-800, 800, 36):
            for x in range(-900, 900, 240):
                canvas.drawCentredString(x, y, nom_ecole)
        canvas.restoreState()
    return dessiner


def _creer_qr_code(url, taille=1.55 * cm):
    """Genere un objet Drawing ReportLab contenant le QR code de verification."""
    qr = QrCodeWidget(url)
    bounds = qr.getBounds()
    qr_w = bounds[2] - bounds[0]
    qr_h = bounds[3] - bounds[1]
    d = Drawing(taille, taille, transform=[taille / qr_w, 0, 0, taille / qr_h, 0, 0])
    d.add(qr)
    return d


def generer_pdf_bulletin(bulletin, notes_par_matiere, stats_classe, appreciation_fn, rangs_matieres=None, nb_absences=0):
    """
    Construit le bulletin scolaire officiel du Complexe Scolaire Magnificat
    au format Paysage (A4), fidele au millimetre a l'exemplaire papier :
    - En-tete avec QR Code de verification unique, logo et coordonnees
    - Tableau dynamique complet avec devoirs, compo, coefficients, notes definitives, rangs par matiere
    - Statistiques de classe et totaux
    - 3 encadres de bas de page : Discipline, Conseil de Classe, Signatures
    """
    if rangs_matieres is None:
        rangs_matieres = {}

    tampon = io.BytesIO()
    largeur_page, hauteur_page = landscape(A4)
    doc = SimpleDocTemplate(
        tampon,
        pagesize=(largeur_page, hauteur_page),
        leftMargin=0.75 * cm,
        rightMargin=0.75 * cm,
        topMargin=0.55 * cm,
        bottomMargin=0.55 * cm,
    )

    styles = getSampleStyleSheet()
    eleve = bulletin.eleve
    classe = eleve.classe
    infos_ecole = _obtenir_infos_ecole()

    annee_scolaire = classe.annee_scolaire if (classe and classe.annee_scolaire) else infos_ecole["annee_scolaire"]
    classe_nom = classe.nom if classe else "-"
    effectif = stats_classe.get("effectif", classe.eleves.count() if classe else "-")
    total_classes = stats_classe.get("total_classes", effectif)

    libelle_trimestre = {
        1: "Premier Trimestre",
        2: "Deuxième Trimestre",
        3: "Troisième Trimestre",
    }.get(bulletin.trimestre, f"Trimestre {bulletin.trimestre}")

    # --- 1. EN-TETE OFFICIEL ---
    url_verification = f"https://gestion-scolaire-magnificat-vcov.onrender.com/verifier/bulletin/{bulletin.id}/"
    qr_code_flowable = _creer_qr_code(url_verification, taille=1.5 * cm)

    logo_flowable = ""
    if os.path.exists(infos_ecole["logo"]):
        try:
            logo_flowable = Image(infos_ecole["logo"], width=1.5 * cm, height=1.5 * cm)
        except Exception:
            logo_flowable = ""

    header_cell_left = Table(
        [[qr_code_flowable, logo_flowable]],
        colWidths=[1.6 * cm, 1.6 * cm]
    )
    header_cell_left.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    header_cell_center = [
        Paragraph(f"<b>{infos_ecole['nom_court']}</b>", ParagraphStyle("H1", alignment=TA_CENTER, fontSize=8.5, leading=10, fontName="Helvetica-Bold", textColor=colors.HexColor("#0B2545"))),
        Paragraph(f"<b>{infos_ecole['nom_complet']}</b>", ParagraphStyle("H2", alignment=TA_CENTER, fontSize=11, leading=13, fontName="Helvetica-Bold", textColor=colors.HexColor("#0B2545"))),
        Paragraph(infos_ecole["contact"], ParagraphStyle("H3", alignment=TA_CENTER, fontSize=6.5, leading=8, textColor=colors.HexColor("#334155"))),
        Paragraph(f"<i>{infos_ecole['devise']}</i>", ParagraphStyle("H4", alignment=TA_CENTER, fontSize=7, leading=8.5, fontName="Helvetica-Oblique", textColor=colors.HexColor("#475569"))),
        Spacer(1, 0.08 * cm),
        Paragraph("<b>BULLETIN D'EVALUATION</b>", ParagraphStyle("H5", alignment=TA_CENTER, fontSize=11, leading=13, fontName="Helvetica-Bold", textColor=colors.HexColor("#0B2545"))),
        Paragraph("NB : IL N'EST DELIVRE QU'UN SEUL BULLETIN", ParagraphStyle("H6", alignment=TA_CENTER, fontSize=6, leading=7, fontName="Helvetica-Bold", textColor=colors.HexColor("#64748B"))),
    ]

    nom_prenom_eleve = f"{eleve.nom.upper()} {eleve.prenom}"
    matricule_str = f"({eleve.matricule})" if eleve.matricule else ""

    header_bandeau_eleve = Paragraph(
        f"<b>DE L'ELEVE : {nom_prenom_eleve} {matricule_str}</b>",
        ParagraphStyle("Eleve", alignment=TA_CENTER, fontSize=10, leading=12, fontName="Helvetica-Bold", textColor=colors.HexColor("#0B2545"))
    )

    sous_titre_texte = (
        f"<b>Année Scolaire :</b> {annee_scolaire} &nbsp;&nbsp;&nbsp;&nbsp; "
        f"<b>Trimestre :</b> {libelle_trimestre} &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp; "
        f"<b>Classe :</b> {classe_nom} &nbsp;&nbsp;&nbsp;&nbsp; "
        f"<b>Effectif :</b> {effectif}"
    )
    header_sous_titre = Paragraph(
        sous_titre_texte,
        ParagraphStyle("SousTitre", alignment=TA_CENTER, fontSize=7.5, leading=9, textColor=colors.HexColor("#1E293B"))
    )

    table_entete = Table(
        [
            [header_cell_left, header_cell_center],
            ["", header_bandeau_eleve],
            ["", header_sous_titre],
        ],
        colWidths=[3.2 * cm, 24.9 * cm]
    )
    table_entete.setStyle(TableStyle([
        ("SPAN", (0, 0), (0, 2)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    elements = [table_entete, Spacer(1, 0.15 * cm)]

    # --- 2. TABLEAU DYNAMIQUE DES NOTES ---
    # Colonnes : Matiere (4.4), Devoirs (3.2), M.Cla (1.6), Compo (1.6), Moy (1.6), Coef (1.0),
    # NoteDef (1.8), Rang (1.4), Prof (4.1), Observations (5.6), Signatures (1.8) = 28.1 cm
    col_widths = [
        4.4 * cm, 3.2 * cm, 1.6 * cm, 1.6 * cm, 1.6 * cm, 1.0 * cm,
        1.8 * cm, 1.4 * cm, 4.1 * cm, 5.6 * cm, 1.8 * cm
    ]

    entetes_colonnes = [
        "Matières",
        "Notes\nDivers devoirs sur 20",
        "M. Cla\nsur 20",
        "Compo\nsur 20",
        "Moy.\nsur 20",
        "Coef",
        "Notes\nDéfini.",
        "Rangs",
        "Nom des Professeurs",
        "Observations",
        "Signatures",
    ]

    donnees_tableau = [entetes_colonnes]

    total_coefs = 0
    total_notes_definitive = Decimal("0")

    # Ordonner les matieres
    matieres_triees = sorted(notes_par_matiere.keys(), key=lambda m: m.nom)

    for idx, matiere in enumerate(matieres_triees, start=1):
        notes_matiere = notes_par_matiere[matiere]
        detail = calculer_detail_matiere(notes_matiere, coef=matiere.coefficient)

        # Enseignant
        nom_prof = "-"
        for n in sorted(notes_matiere, key=lambda x: x.date_saisie, reverse=True):
            if n.enseignant is not None:
                full_name = n.enseignant.get_full_name()
                nom_prof = full_name if full_name else n.enseignant.username
                break

        # Rang de la matiere
        rang_matiere_str = rangs_matieres.get(matiere.id, "-")

        coef_int = matiere.coefficient
        total_coefs += coef_int
        if detail["note_definitive"] is not None:
            total_notes_definitive += detail["note_definitive"]

        ligne = [
            f"{idx:02d}. {matiere.nom}",
            detail["devoirs_str"],
            formater_note(detail["m_cla"]),
            formater_note(detail["compo"]),
            formater_note(detail["moy_sur_20"]),
            str(coef_int),
            formater_note(detail["note_definitive"]),
            rang_matiere_str,
            nom_prof,
            detail["appreciation"],
            "",
        ]
        donnees_tableau.append(ligne)

    # Lignes de totaux et synthese
    nb_lignes_notes = len(matieres_triees)

    # Formatage rang de l'eleve
    rang_eleve = bulletin.rang
    if rang_eleve == 1:
        rang_eleve_str = "1er"
    elif rang_eleve:
        rang_eleve_str = f"{rang_eleve}e"
    else:
        rang_eleve_str = "-"

    moyenne_trimestre_str = f"{bulletin.moyenne_generale:.2f} / 20"
    appreciation_globale = appreciation_fn(bulletin.moyenne_generale)

    moy_forte_str = f"{stats_classe['moy_forte']:.2f}" if stats_classe.get("moy_forte") is not None else "-"
    moy_faible_str = f"{stats_classe['moy_faible']:.2f}" if stats_classe.get("moy_faible") is not None else "-"
    moy_classe_str = f"{stats_classe['moy_classe']:.2f}" if stats_classe.get("moy_classe") is not None else "-"

    # Ligne 1 de synthese (Totaux)
    ligne_totaux = [
        "", "", "", "", "TOTAL :",
        str(total_coefs),
        f"{total_notes_definitive:.2f}",
        "Rang :",
        f"{rang_eleve_str}  (sur {total_classes} classés)",
        f"Moy. la plus forte : {moy_forte_str}",
        "",
    ]
    donnees_tableau.append(ligne_totaux)

    # Ligne 2 de synthese (Moyenne du trimestre & Statistiques)
    ligne_moyenne = [
        f"Moyenne du Trimestre : {moyenne_trimestre_str}", "", "", "", "",
        "", "", "", "",
        f"Moy. classe : {moy_classe_str}  |  Plus faible : {moy_faible_str}",
        "",
    ]
    donnees_tableau.append(ligne_moyenne)

    table_notes = Table(
        donnees_tableau,
        colWidths=col_widths,
        repeatRows=1,
    )

    idx_totaux = nb_lignes_notes + 1
    idx_moyenne = nb_lignes_notes + 2

    style_tableau = [
        # En-tete des colonnes avec cadre net
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B2545")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 6.5),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),

        # Cadre complet sur l'integralite du tableau (lignes de cours et totaux)
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#334155")),

        # Lignes des matieres
        ("FONTSIZE", (0, 1), (-1, nb_lignes_notes), 7),
        ("ALIGN", (0, 1), (0, nb_lignes_notes), "LEFT"),
        ("ALIGN", (1, 1), (7, nb_lignes_notes), "CENTER"),
        ("ALIGN", (8, 1), (9, nb_lignes_notes), "LEFT"),
        ("ALIGN", (10, 1), (10, nb_lignes_notes), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, nb_lignes_notes), 2),
        ("BOTTOMPADDING", (0, 0), (-1, nb_lignes_notes), 2),
        ("ROWBACKGROUNDS", (0, 1), (-1, nb_lignes_notes), [colors.white, colors.HexColor("#F8FAFC")]),

        # Ligne TOTAL : fusion et mise en valeur
        ("FONTNAME", (0, idx_totaux), (-1, idx_totaux), "Helvetica-Bold"),
        ("FONTSIZE", (0, idx_totaux), (-1, idx_totaux), 7),
        ("SPAN", (0, idx_totaux), (4, idx_totaux)),
        ("ALIGN", (0, idx_totaux), (4, idx_totaux), "RIGHT"),
        ("BACKGROUND", (0, idx_totaux), (4, idx_totaux), colors.HexColor("#F1F5F9")),
        ("BACKGROUND", (5, idx_totaux), (6, idx_totaux), colors.HexColor("#E2E8F0")),
        ("ALIGN", (5, idx_totaux), (6, idx_totaux), "CENTER"),
        ("ALIGN", (7, idx_totaux), (7, idx_totaux), "CENTER"),
        ("ALIGN", (8, idx_totaux), (8, idx_totaux), "LEFT"),
        ("SPAN", (9, idx_totaux), (10, idx_totaux)),
        ("BACKGROUND", (9, idx_totaux), (10, idx_totaux), colors.HexColor("#F1F5F9")),
        ("FONTSIZE", (9, idx_totaux), (10, idx_totaux), 6.5),

        # Ligne Moyenne du Trimestre (encadre distinct)
        ("SPAN", (0, idx_moyenne), (4, idx_moyenne)),
        ("FONTNAME", (0, idx_moyenne), (0, idx_moyenne), "Helvetica-Bold"),
        ("FONTSIZE", (0, idx_moyenne), (0, idx_moyenne), 8),
        ("BACKGROUND", (0, idx_moyenne), (4, idx_moyenne), colors.HexColor("#E0F2FE")),
        ("TEXTCOLOR", (0, idx_moyenne), (0, idx_moyenne), colors.HexColor("#0369A1")),
        ("ALIGN", (0, idx_moyenne), (0, idx_moyenne), "CENTER"),
        ("BOX", (0, idx_moyenne), (4, idx_moyenne), 0.9, colors.HexColor("#0284C7")),
        ("SPAN", (5, idx_moyenne), (8, idx_moyenne)),
        ("BACKGROUND", (5, idx_moyenne), (8, idx_moyenne), colors.HexColor("#F8FAFC")),
        ("SPAN", (9, idx_moyenne), (10, idx_moyenne)),
        ("BACKGROUND", (9, idx_moyenne), (10, idx_moyenne), colors.HexColor("#F1F5F9")),
        ("FONTSIZE", (9, idx_moyenne), (10, idx_moyenne), 6.5),
        ("TEXTCOLOR", (9, idx_moyenne), (10, idx_moyenne), colors.HexColor("#1E293B")),
        ("TOPPADDING", (0, idx_totaux), (-1, idx_moyenne), 2.5),
        ("BOTTOMPADDING", (0, idx_totaux), (-1, idx_moyenne), 2.5),
    ]

    table_notes.setStyle(TableStyle(style_tableau))
    elements.append(table_notes)
    elements.append(Spacer(1, 0.2 * cm))

    # --- 3. LES 3 ENCADRES DE PIED DE PAGE ---
    # Encadre 1 : Discipline (6.5 cm)
    discipline_lignes = [
        "<b>DISCIPLINE</b>",
        f"Retards : 00",
        f"Absences : {nb_absences:02d}",
        "Punitions : 00",
        "Exclusions : 00",
        "Avert. blâme (Trav/Disc) : Néant",
    ]
    cell_discipline = Paragraph(
        "<br/>".join(discipline_lignes),
        ParagraphStyle("Disc", fontSize=6.8, leading=8.8, fontName="Helvetica", textColor=colors.HexColor("#1E293B"))
    )

    # Encadre 2 : Observations Conseil de Classe (11.5 cm)
    observations_titre = "<b>Observations générales du Conseil de Classe</b>"
    observations_contenu = f"<b>{appreciation_globale}</b>"
    cell_conseil = [
        Paragraph(observations_titre, ParagraphStyle("ObsT", fontSize=7.2, leading=9, fontName="Helvetica-Bold", textColor=colors.HexColor("#0B2545"), alignment=TA_CENTER)),
        Spacer(1, 0.25 * cm),
        Paragraph(observations_contenu, ParagraphStyle("ObsC", fontSize=8.5, leading=11, fontName="Helvetica", textColor=colors.HexColor("#0F172A"), alignment=TA_CENTER)),
    ]

    # Encadre 3 : Signatures & Cachet (10.1 cm)
    date_jour = datetime.now().strftime("%d/%m/%Y")
    lieu_date = f"Lomé, le {date_jour}"

    cachet_flowable = ""
    if infos_ecole.get("cachet"):
        try:
            cachet_flowable = Image(infos_ecole["cachet"], width=2.0 * cm, height=2.0 * cm)
        except Exception:
            cachet_flowable = ""

    signature_flowable = ""
    if infos_ecole.get("signature"):
        try:
            signature_flowable = Image(infos_ecole["signature"], width=2.6 * cm, height=1.3 * cm)
        except Exception:
            signature_flowable = ""

    signataire_nom = infos_ecole.get("nom_directeur", "HOUESSE Komi")

    table_signatures_interne = Table(
        [
            [Paragraph(lieu_date, ParagraphStyle("Lieu", fontSize=6.8, leading=8, alignment=TA_CENTER)), ""],
            [
                Paragraph("<b>Le Titulaire</b>", ParagraphStyle("Tit", fontSize=7, leading=8.5, alignment=TA_CENTER)),
                Paragraph(f"<b>{infos_ecole['titre_signataire']}</b>", ParagraphStyle("Dir", fontSize=7, leading=8.5, alignment=TA_CENTER)),
            ],
            [
                "",  # Espace signature enseignant
                signature_flowable if signature_flowable else cachet_flowable,
            ],
            [
                "",
                Paragraph(signataire_nom, ParagraphStyle("SignNom", fontSize=6.5, leading=7.5, alignment=TA_CENTER, fontName="Helvetica-Bold")),
            ]
        ],
        colWidths=[4.8 * cm, 4.8 * cm],
        rowHeights=[0.4 * cm, 0.4 * cm, 1.3 * cm, 0.35 * cm]
    )
    table_signatures_interne.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 1),
        ("RIGHTPADDING", (0, 0), (-1, -1), 1),
    ]))

    table_pied = Table(
        [
            [cell_discipline, cell_conseil, table_signatures_interne]
        ],
        colWidths=[6.5 * cm, 11.5 * cm, 10.1 * cm],
        rowHeights=[2.55 * cm]
    )
    table_pied.setStyle(TableStyle([
        ("BOX", (0, 0), (0, 0), 0.6, colors.HexColor("#64748B")),
        ("BOX", (1, 0), (1, 0), 0.6, colors.HexColor("#64748B")),
        ("BOX", (2, 0), (2, 0), 0.6, colors.HexColor("#64748B")),
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#F8FAFC")),
        ("BACKGROUND", (1, 0), (1, 0), colors.white),
        ("BACKGROUND", (2, 0), (2, 0), colors.HexColor("#F8FAFC")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))

    elements.append(table_pied)
    elements.append(Spacer(1, 0.1 * cm))

    # Mention finale de bas de page
    date_generation_str = bulletin.date_generation.strftime("%d/%m/%Y à %H:%M") if bulletin.date_generation else datetime.now().strftime("%d/%m/%Y à %H:%M")
    elements.append(
        Paragraph(
            f"Bulletin de notes généré le {date_generation_str} par Educes | www.educes.com  •  Vérification en ligne : {url_verification}",
            ParagraphStyle("PiedPage", alignment=TA_LEFT, fontSize=5.5, leading=7, textColor=colors.HexColor("#64748B"))
        )
    )

    filigrane = _dessiner_filigrane(infos_ecole["nom_complet"].upper())
    doc.build(elements, onFirstPage=filigrane, onLaterPages=filigrane)
    return tampon.getvalue()