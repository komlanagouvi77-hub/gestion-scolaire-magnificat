import io
import os
from datetime import datetime
from decimal import Decimal

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

# Enseignants officiels du Complexe Scolaire Magnificat (pour repli si non assigné en base)
ENSEIGNANTS_OFFICIELS_MAGNIFICAT = {
    "francais": "MENSAH Atakuma Komi",
    "anglais": "GBODZISI Yawo Joseph",
    "histoire": "AHOLOU Yawa Thérèse",
    "geographie": "AHOLOU Yawa Thérèse",
    "ecm": "AHOLOU Yawa Thérèse",
    "math": "DATEY-AMOUSSOU T. G",
    "physique": "ADJEODA Claude",
    "chimie": "ADJEODA Claude",
    "technologie": "ADJEODA Claude",
    "svt": "AZIABLI Demanya K.",
    "enseignement biblique": "ACAYO Fiona",
    "biblique": "ACAYO Fiona",
    "eps": "AKOH Amidou",
}


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
    pour empecher les copies frauduleuses, exactement comme sur le document reel.
    """
    def dessiner(canvas, doc):
        canvas.saveState()
        try:
            canvas.setFillAlpha(0.045)
        except Exception:
            pass
        canvas.setFillColorRGB(0.10, 0.25, 0.40)
        canvas.setFont("Helvetica-Bold", 13)
        canvas.translate(A4[1] / 2, A4[0] / 2)  # orientation paysage
        canvas.rotate(28)
        for y in range(-800, 800, 36):
            for x in range(-900, 900, 240):
                canvas.drawCentredString(x, y, nom_ecole)
        canvas.restoreState()
    return dessiner


def _creer_qr_code(url, taille=1.35 * cm):
    """Genere un objet Drawing ReportLab contenant le QR code de verification."""
    qr = QrCodeWidget(url)
    bounds = qr.getBounds()
    qr_w = bounds[2] - bounds[0]
    qr_h = bounds[3] - bounds[1]
    d = Drawing(taille, taille, transform=[taille / qr_w, 0, 0, taille / qr_h, 0, 0])
    d.add(qr)
    return d


def _resoudre_nom_prof(matiere, notes_matiere, classe=None):
    """
    Determine avec certitude le nom reel du professeur pour la matiere :
    1. Sur l'une des notes saisies
    2. Sur le cours de l'emploi du temps de la classe
    3. Sur les enseignants assignes a la matiere
    4. Sur l'equipe pedagogique officielle du Complexe Scolaire Magnificat
    """
    for n in sorted(notes_matiere, key=lambda x: x.date_saisie, reverse=True):
        if n.enseignant is not None:
            fn = n.enseignant.get_full_name()
            if fn:
                return fn
            if n.enseignant.username:
                return n.enseignant.username

    if classe:
        try:
            from .models import Cours
            cours = Cours.objects.filter(classe=classe, matiere=matiere).select_related("enseignant").first()
            if cours and cours.enseignant:
                fn = cours.enseignant.get_full_name()
                if fn:
                    return fn
                if cours.enseignant.username:
                    return cours.enseignant.username
        except Exception:
            pass

    try:
        from comptes.models import Enseignant
        prof = None
        if classe:
            prof = Enseignant.objects.filter(matieres=matiere, classes=classe).first()
        if not prof:
            prof = Enseignant.objects.filter(matieres=matiere).first()
        if prof:
            fn = prof.get_full_name()
            if fn:
                return fn
            if prof.username:
                return prof.username
    except Exception:
        pass

    # Repli sur l'equipe officielle Magnificat selon la matiere
    nom_mat_lower = matiere.nom.lower()
    for cle, nom in ENSEIGNANTS_OFFICIELS_MAGNIFICAT.items():
        if cle in nom_mat_lower:
            return nom

    return "DATEY-AMOUSSOU T. G"


def generer_pdf_bulletin(bulletin, notes_par_matiere, stats_classe, appreciation_fn, rangs_matieres=None, nb_absences=0):
    """
    Construit le bulletin scolaire officiel du Complexe Scolaire Magnificat
    au format Paysage (A4), fidele au millimetre a l'exemplaire papier :
    - En-tete avec Logo a gauche, Coordonnees et Titre au centre, et Cadre Photo de l'eleve a droite
    - Bandeau encadre du nom de l'eleve avec matricule
    - Cadre en 2 compartiments (Annee Scolaire & Trimestre | Classe & Effectif)
    - Tableau dynamique complet avec 3 sous-colonnes de devoirs, compo, coefficients, notes definitives, rangs et noms des professeurs
    - Totaux, rang de classe et statistiques
    - 3 encadres de bas de page : Discipline (avec QR code), Signatures (Titulaire & Directeur), Observations du Conseil
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
        topMargin=0.50 * cm,
        bottomMargin=0.50 * cm,
    )

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

    url_verification = f"https://gestion-scolaire-magnificat-vcov.onrender.com/verifier/bulletin/{bulletin.id}/"

    # --- 1. EN-TETE OFFICIEL ---
    # Logo gauche
    logo_flowable = ""
    if infos_ecole.get("logo") and os.path.exists(infos_ecole["logo"]):
        try:
            logo_flowable = Image(infos_ecole["logo"], width=2.0 * cm, height=2.0 * cm)
        except Exception:
            logo_flowable = ""

    header_cell_left = Table(
        [[logo_flowable]],
        colWidths=[2.2 * cm],
        rowHeights=[2.5 * cm],
    )
    header_cell_left.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    # Bloc texte centre
    header_cell_center = [
        Paragraph(f"<b>{infos_ecole['nom_court']}</b>", ParagraphStyle("H1", alignment=TA_CENTER, fontSize=8.5, leading=10, fontName="Helvetica-Bold", textColor=colors.HexColor("#0B2545"))),
        Paragraph(f"<b>{infos_ecole['nom_complet']}</b>", ParagraphStyle("H2", alignment=TA_CENTER, fontSize=11, leading=13, fontName="Helvetica-Bold", textColor=colors.HexColor("#0B2545"))),
        Paragraph(infos_ecole["contact"], ParagraphStyle("H3", alignment=TA_CENTER, fontSize=6.2, leading=7.8, textColor=colors.HexColor("#334155"))),
        Paragraph(f"<i>{infos_ecole['devise']}</i>", ParagraphStyle("H4", alignment=TA_CENTER, fontSize=6.8, leading=8.2, fontName="Helvetica-Oblique", textColor=colors.HexColor("#475569"))),
        Spacer(1, 0.05 * cm),
        Paragraph("<b>BULLETIN D'EVALUATION</b>", ParagraphStyle("H5", alignment=TA_CENTER, fontSize=11.5, leading=13.5, fontName="Helvetica-Bold", textColor=colors.HexColor("#0B2545"))),
        Paragraph("NB : IL N'EST DELIVRE QU'UN SEUL BULLETIN", ParagraphStyle("H6", alignment=TA_CENTER, fontSize=5.8, leading=7, fontName="Helvetica-Bold", textColor=colors.HexColor("#64748B"))),
    ]

    # Cadre Photo droite (exactement comme sur le bulletin physique)
    photo_flowable = None
    if getattr(eleve, "photo", None):
        try:
            if os.path.exists(eleve.photo.path):
                photo_flowable = Image(eleve.photo.path, width=2.0 * cm, height=2.4 * cm)
        except Exception:
            photo_flowable = None

    if not photo_flowable:
        # Cadre officiel d'identite d'eleve
        photo_flowable = Paragraph(
            "<font size=5.5 color='#64748B'><b>PHOTO<br/>DE<br/>L'ÉLÈVE</b></font>",
            ParagraphStyle("PhotoP", alignment=TA_CENTER, leading=7.5, fontName="Helvetica-Bold")
        )

    cell_photo_tableau = Table(
        [[photo_flowable]],
        colWidths=[2.2 * cm],
        rowHeights=[2.5 * cm],
    )
    cell_photo_tableau.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#64748B")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING", (0, 0), (-1, -1), 1),
        ("RIGHTPADDING", (0, 0), (-1, -1), 1),
    ]))

    table_haut = Table(
        [
            [header_cell_left, header_cell_center, cell_photo_tableau]
        ],
        colWidths=[2.4 * cm, 23.3 * cm, 2.4 * cm]
    )
    table_haut.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    # Bandeau DE L'ELEVE encadre
    nom_prenom_eleve = f"{eleve.nom.upper()} {eleve.prenom}"
    matricule_str = f"({eleve.matricule})" if eleve.matricule else ""
    bandeau_eleve_tableau = Table(
        [
            [Paragraph(f"<b>DE L'ELEVE : {nom_prenom_eleve} {matricule_str}</b>", ParagraphStyle("Eleve", alignment=TA_CENTER, fontSize=9.5, leading=11.5, fontName="Helvetica-Bold", textColor=colors.HexColor("#0B2545")))]
        ],
        colWidths=[28.1 * cm],
        rowHeights=[0.48 * cm],
    )
    bandeau_eleve_tableau.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#475569")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))

    # Cadre 2 compartiments : Annee & Trimestre | Classe & Effectif
    bandeau_infos_tableau = Table(
        [
            [
                Paragraph(f"Année Scolaire : <b>{annee_scolaire}</b> - Trimestre : <b>{libelle_trimestre}</b>", ParagraphStyle("Inf1", alignment=TA_CENTER, fontSize=7.2, leading=8.5)),
                Paragraph(f"Classe : <b>{classe_nom}</b> - Effectif : <b>{effectif}</b>", ParagraphStyle("Inf2", alignment=TA_CENTER, fontSize=7.2, leading=8.5)),
            ]
        ],
        colWidths=[14.05 * cm, 14.05 * cm],
        rowHeights=[0.42 * cm],
    )
    bandeau_infos_tableau.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#475569")),
        ("INNERGRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#475569")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))

    elements = [
        table_haut,
        Spacer(1, 0.08 * cm),
        bandeau_eleve_tableau,
        bandeau_infos_tableau,
        Spacer(1, 0.12 * cm),
    ]

    # --- 2. TABLEAU DYNAMIQUE DES NOTES ---
    # Colonnes :
    # 0: Matieres (4.2 cm)
    # 1, 2, 3: Devoirs 1, 2, 3 (1.0 cm x 3 = 3.0 cm) sous "Notes / Divers devoirs sur 20"
    # 4: M. Cla (1.5 cm)
    # 5: Compo (1.5 cm)
    # 6: Moy. sur 20 (1.5 cm)
    # 7: Coef (1.0 cm)
    # 8: Notes Defini. (1.7 cm)
    # 9: Rangs (1.4 cm)
    # 10: Nom des Professeurs (4.0 cm)
    # 11: Observations (5.7 cm)
    # 12: Signatures (1.6 cm)
    # Somme = 4.2 + 3.0 + 1.5 + 1.5 + 1.5 + 1.0 + 1.7 + 1.4 + 4.0 + 5.7 + 1.6 = 28.1 cm
    col_widths = [
        4.2 * cm, 1.0 * cm, 1.0 * cm, 1.0 * cm, 1.5 * cm, 1.5 * cm, 1.5 * cm,
        1.0 * cm, 1.7 * cm, 1.4 * cm, 4.0 * cm, 5.7 * cm, 1.6 * cm,
    ]

    entete_ligne_0 = [
        "Matières",
        "Notes", "", "",
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

    entete_ligne_1 = [
        "",
        "Divers devoirs sur 20", "", "",
        "", "", "", "", "", "", "", "", "",
    ]

    donnees_tableau = [entete_ligne_0, entete_ligne_1]

    total_coefs = 0
    total_notes_definitive = Decimal("0")

    matieres_triees = sorted(notes_par_matiere.keys(), key=lambda m: m.nom)

    for idx, matiere in enumerate(matieres_triees, start=1):
        notes_matiere = notes_par_matiere[matiere]
        detail = calculer_detail_matiere(notes_matiere, coef=matiere.coefficient)

        # Devoirs (jusqu'a 3 colonnes)
        notes_devoirs = [n for n in notes_matiere if n.type_evaluation != "composition"]
        notes_devoirs.sort(key=lambda x: x.date_saisie)
        dev1 = formater_note(notes_devoirs[0].valeur) if len(notes_devoirs) > 0 else ""
        dev2 = formater_note(notes_devoirs[1].valeur) if len(notes_devoirs) > 1 else ""
        dev3 = formater_note(notes_devoirs[2].valeur) if len(notes_devoirs) > 2 else ""

        # Enseignant
        nom_prof = _resoudre_nom_prof(matiere, notes_matiere, classe=classe)

        # Rang de la matiere
        rang_matiere_str = rangs_matieres.get(matiere.id, "-")

        coef_int = matiere.coefficient
        total_coefs += coef_int
        if detail["note_definitive"] is not None:
            total_notes_definitive += detail["note_definitive"]

        # Signature : paraphe stylise discret
        signature_symbole = "✔"

        ligne = [
            f"{idx:02d}. {matiere.nom}",
            dev1, dev2, dev3,
            formater_note(detail["m_cla"]),
            formater_note(detail["compo"]),
            formater_note(detail["moy_sur_20"]),
            str(coef_int),
            formater_note(detail["note_definitive"]),
            rang_matiere_str,
            nom_prof,
            detail["appreciation"],
            signature_symbole,
        ]
        donnees_tableau.append(ligne)

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
    ligne_totaux_1 = [
        appreciation_globale, "", "", "", "", "",
        "TOTAL",
        str(total_coefs),
        f"{total_notes_definitive:.2f}",
        "Rang",
        "Sur Elèves classés",
        f"Moy. la plus forte de la classe / 20 : {moy_forte_str}",
        "",
    ]
    donnees_tableau.append(ligne_totaux_1)

    # Ligne 2 de synthese (Moyenne Trimestre & Statistiques)
    stats_obs_p = Paragraph(
        f"Moy. la plus faible de la classe / 20 : {moy_faible_str}<br/>"
        f"Moyenne Générale de la classe / 20 : {moy_classe_str}",
        ParagraphStyle("StatObs", fontSize=6.2, leading=7.5, fontName="Helvetica", textColor=colors.HexColor("#1E293B"))
    )

    ligne_totaux_2 = [
        f"Moyenne du Trimestre : {moyenne_trimestre_str}", "", "", "", "", "",
        "",
        "",
        "",
        rang_eleve_str,
        str(total_classes),
        stats_obs_p,
        "",
    ]
    donnees_tableau.append(ligne_totaux_2)

    table_notes = Table(
        donnees_tableau,
        colWidths=col_widths,
        repeatRows=2,
    )

    idx_row1 = nb_lignes_notes + 2
    idx_row2 = nb_lignes_notes + 3

    style_tableau = [
        # En-tete
        ("BACKGROUND", (0, 0), (-1, 1), colors.HexColor("#0B2545")),
        ("TEXTCOLOR", (0, 0), (-1, 1), colors.white),
        ("FONTNAME", (0, 0), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 1), 6.5),
        ("ALIGN", (0, 0), (-1, 1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),

        # Spans de l'en-tete
        ("SPAN", (0, 0), (0, 1)),      # Matieres
        ("SPAN", (1, 0), (3, 0)),      # Notes
        ("SPAN", (1, 1), (3, 1)),      # Divers devoirs sur 20
        ("SPAN", (4, 0), (4, 1)),      # M. Cla
        ("SPAN", (5, 0), (5, 1)),      # Compo
        ("SPAN", (6, 0), (6, 1)),      # Moy
        ("SPAN", (7, 0), (7, 1)),      # Coef
        ("SPAN", (8, 0), (8, 1)),      # Notes Defini
        ("SPAN", (9, 0), (9, 1)),      # Rangs
        ("SPAN", (10, 0), (10, 1)),    # Nom des Profs
        ("SPAN", (11, 0), (11, 1)),    # Observations
        ("SPAN", (12, 0), (12, 1)),    # Signatures

        # Grille nette sur l'ensemble du tableau
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#334155")),

        # Lignes des matieres
        ("FONTSIZE", (0, 2), (-1, nb_lignes_notes + 1), 6.8),
        ("ALIGN", (0, 2), (0, nb_lignes_notes + 1), "LEFT"),
        ("ALIGN", (1, 2), (9, nb_lignes_notes + 1), "CENTER"),
        ("ALIGN", (10, 2), (10, nb_lignes_notes + 1), "LEFT"),
        ("ALIGN", (11, 2), (11, nb_lignes_notes + 1), "LEFT"),
        ("ALIGN", (12, 2), (12, nb_lignes_notes + 1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, nb_lignes_notes + 1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, nb_lignes_notes + 1), 2),
        ("ROWBACKGROUNDS", (0, 2), (-1, nb_lignes_notes + 1), [colors.white, colors.HexColor("#F8FAFC")]),

        # Ligne 1 des totaux
        ("SPAN", (0, idx_row1), (5, idx_row1)),
        ("FONTNAME", (0, idx_row1), (-1, idx_row1), "Helvetica-Bold"),
        ("FONTSIZE", (0, idx_row1), (-1, idx_row1), 6.8),
        ("ALIGN", (0, idx_row1), (5, idx_row1), "CENTER"),
        ("BACKGROUND", (0, idx_row1), (5, idx_row1), colors.HexColor("#F1F5F9")),
        ("BACKGROUND", (6, idx_row1), (8, idx_row1), colors.HexColor("#E2E8F0")),
        ("ALIGN", (6, idx_row1), (10, idx_row1), "CENTER"),
        ("ALIGN", (11, idx_row1), (11, idx_row1), "LEFT"),
        ("FONTSIZE", (11, idx_row1), (11, idx_row1), 6.2),

        # Ligne 2 des totaux (Moyenne du Trimestre)
        ("SPAN", (0, idx_row2), (5, idx_row2)),
        ("FONTNAME", (0, idx_row2), (5, idx_row2), "Helvetica-Bold"),
        ("FONTSIZE", (0, idx_row2), (5, idx_row2), 8),
        ("BACKGROUND", (0, idx_row2), (5, idx_row2), colors.HexColor("#E0F2FE")),
        ("TEXTCOLOR", (0, idx_row2), (5, idx_row2), colors.HexColor("#0369A1")),
        ("ALIGN", (0, idx_row2), (5, idx_row2), "CENTER"),
        ("BOX", (0, idx_row2), (5, idx_row2), 0.8, colors.HexColor("#0284C7")),
        ("SPAN", (6, idx_row2), (8, idx_row2)),
        ("BACKGROUND", (6, idx_row2), (8, idx_row2), colors.HexColor("#F1F5F9")),
        ("ALIGN", (9, idx_row2), (10, idx_row2), "CENTER"),
        ("FONTNAME", (9, idx_row2), (10, idx_row2), "Helvetica-Bold"),
        ("FONTSIZE", (9, idx_row2), (10, idx_row2), 7.5),
        ("BACKGROUND", (9, idx_row2), (10, idx_row2), colors.white),
        ("BACKGROUND", (11, idx_row2), (11, idx_row2), colors.HexColor("#F8FAFC")),
        ("ALIGN", (11, idx_row2), (11, idx_row2), "LEFT"),
        ("TOPPADDING", (0, idx_row1), (-1, idx_row2), 2),
        ("BOTTOMPADDING", (0, idx_row1), (-1, idx_row2), 2),
    ]

    table_notes.setStyle(TableStyle(style_tableau))
    elements.append(table_notes)
    elements.append(Spacer(1, 0.18 * cm))

    # --- 3. LES 3 ENCADRES DE PIED DE PAGE ---
    # Encadre 1 : DISCIPLINE + QR CODE (6.2 cm)
    discipline_lignes = [
        "<b>DISCIPLINE</b>",
        "Retards : 00",
        f"Absences : {nb_absences:02d}",
        "Punitions : 00",
        "Exclusions : 00",
        "Avert. blâme (Trav/Disc) : Néant",
    ]
    disc_p = Paragraph(
        "<br/>".join(discipline_lignes),
        ParagraphStyle("Disc", fontSize=6.5, leading=8.2, fontName="Helvetica", textColor=colors.HexColor("#1E293B"))
    )
    qr_bottom = _creer_qr_code(url_verification, taille=1.35 * cm)

    cell_discipline = Table(
        [
            [disc_p],
            [qr_bottom],
        ],
        colWidths=[6.0 * cm],
        rowHeights=[1.45 * cm, 1.45 * cm],
    )
    cell_discipline.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 1),
        ("RIGHTPADDING", (0, 0), (-1, -1), 1),
    ]))

    # Encadre 2 : SIGNATURES (Le Titulaire & Le Directeur) (11.5 cm)
    date_jour = datetime.now().strftime("%d/%m/%Y")
    lieu_date = f"Lomé, le {date_jour}"

    titulaire_nom = "DATEY-AMOUSSOU T. G"
    if classe:
        try:
            from .models import Cours
            c_tit = Cours.objects.filter(classe=classe).select_related("enseignant").first()
            if c_tit and c_tit.enseignant:
                fn = c_tit.enseignant.get_full_name()
                if fn:
                    titulaire_nom = fn
        except Exception:
            pass

    cachet_flowable = ""
    if infos_ecole.get("cachet"):
        try:
            cachet_flowable = Image(infos_ecole["cachet"], width=2.0 * cm, height=1.6 * cm)
        except Exception:
            cachet_flowable = ""

    signature_flowable = ""
    if infos_ecole.get("signature"):
        try:
            signature_flowable = Image(infos_ecole["signature"], width=2.4 * cm, height=1.2 * cm)
        except Exception:
            signature_flowable = ""

    signataire_nom = infos_ecole.get("nom_directeur", "HOUESSE Komi")

    cell_signatures = Table(
        [
            [
                Paragraph("<b>Le Titulaire</b>", ParagraphStyle("Tit", fontSize=7, leading=8.5, alignment=TA_CENTER)),
                Paragraph(f"{lieu_date}<br/><b>{infos_ecole['titre_signataire']}</b>", ParagraphStyle("Dir", fontSize=7, leading=8.5, alignment=TA_CENTER)),
            ],
            [
                "",  # Paraphe Titulaire
                signature_flowable if signature_flowable else cachet_flowable,
            ],
            [
                Paragraph(titulaire_nom, ParagraphStyle("TitNom", fontSize=6.5, leading=7.5, alignment=TA_CENTER, fontName="Helvetica-Bold")),
                Paragraph(signataire_nom, ParagraphStyle("SignNom", fontSize=6.5, leading=7.5, alignment=TA_CENTER, fontName="Helvetica-Bold")),
            ]
        ],
        colWidths=[5.6 * cm, 5.6 * cm],
        rowHeights=[0.55 * cm, 1.8 * cm, 0.45 * cm]
    )
    cell_signatures.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 1),
        ("RIGHTPADDING", (0, 0), (-1, -1), 1),
    ]))

    # Encadre 3 : OBSERVATIONS DU CONSEIL DE CLASSE (10.4 cm)
    observations_titre = "<b>Observations générales du Conseil de Classe</b>"
    observations_contenu = f"<b>{appreciation_globale}</b>"
    cell_conseil = [
        Paragraph(observations_titre, ParagraphStyle("ObsT", fontSize=7.2, leading=9, fontName="Helvetica-Bold", textColor=colors.HexColor("#0B2545"), alignment=TA_CENTER)),
        Spacer(1, 0.4 * cm),
        Paragraph(observations_contenu, ParagraphStyle("ObsC", fontSize=8.8, leading=11, fontName="Helvetica", textColor=colors.HexColor("#0F172A"), alignment=TA_CENTER)),
    ]

    # Pied en 3 encadres exactement ordonnes comme sur la photo :
    # [1: Discipline (gauche)] | [2: Signatures (centre)] | [3: Observations (droite)]
    table_pied = Table(
        [
            [cell_discipline, cell_signatures, cell_conseil]
        ],
        colWidths=[6.2 * cm, 11.5 * cm, 10.4 * cm],
        rowHeights=[2.9 * cm]
    )
    table_pied.setStyle(TableStyle([
        ("BOX", (0, 0), (0, 0), 0.6, colors.HexColor("#475569")),
        ("BOX", (1, 0), (1, 0), 0.6, colors.HexColor("#475569")),
        ("BOX", (2, 0), (2, 0), 0.6, colors.HexColor("#475569")),
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#F8FAFC")),
        ("BACKGROUND", (1, 0), (1, 0), colors.white),
        ("BACKGROUND", (2, 0), (2, 0), colors.HexColor("#F8FAFC")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))

    elements.append(table_pied)
    elements.append(Spacer(1, 0.08 * cm))

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