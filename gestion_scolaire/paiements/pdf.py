import io
import os
from decimal import Decimal
from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A5
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from scolarite.pdf import _obtenir_infos_ecole

def generer_pdf_recu_paiement(paiement):
    """
    Genere un recu officiel de paiement scolaire au format PDF avec ReportLab.
    Format A5 paysage, elegant, certifie avec logo, en-tete et cachet de l'etablissement.
    """
    buffer = io.BytesIO()
    infos = _obtenir_infos_ecole()
    
    # Format A5 paysage : 21.0 x 14.8 cm
    largeur_page, hauteur_page = landscape(A5)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=(largeur_page, hauteur_page),
        leftMargin=1.2 * cm,
        rightMargin=1.2 * cm,
        topMargin=1.0 * cm,
        bottomMargin=1.0 * cm,
    )

    styles = getSampleStyleSheet()
    style_titre_ecole = ParagraphStyle(
        "TitreEcoleRecu",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=14,
        textColor=colors.HexColor("#16324F"),
        alignment=TA_LEFT,
    )
    style_devise = ParagraphStyle(
        "DeviseRecu",
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#64748B"),
        alignment=TA_LEFT,
    )
    style_contact = ParagraphStyle(
        "ContactRecu",
        fontName="Helvetica",
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#475569"),
        alignment=TA_LEFT,
    )
    style_titre_doc = ParagraphStyle(
        "TitreDocRecu",
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#16324F"),
        alignment=TA_CENTER,
    )
    style_label = ParagraphStyle(
        "LabelRecu",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#334155"),
        alignment=TA_LEFT,
    )
    style_valeur = ParagraphStyle(
        "ValeurRecu",
        fontName="Helvetica",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
        alignment=TA_LEFT,
    )
    style_montant = ParagraphStyle(
        "MontantRecu",
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=17,
        textColor=colors.HexColor("#16324F"),
        alignment=TA_CENTER,
    )
    style_pied = ParagraphStyle(
        "PiedRecu",
        fontName="Helvetica-Oblique",
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#94A3B8"),
        alignment=TA_CENTER,
    )

    elements = []

    # 1. En-tête avec logo et coordonnées
    logo_widget = None
    if infos.get("logo") and os.path.exists(infos["logo"]):
        try:
            logo_widget = Image(infos["logo"], width=2.2 * cm, height=2.2 * cm)
        except Exception:
            logo_widget = None

    bloc_ecole = [
        Paragraph(infos["nom_complet"].upper(), style_titre_ecole),
        Paragraph(infos["devise"], style_devise),
        Paragraph(infos["contact"], style_contact),
    ]

    bloc_etat = [
        Paragraph("RÉPUBLIQUE TOGOLAISE", ParagraphStyle("Etat", fontName="Helvetica-Bold", fontSize=8, leading=10, alignment=TA_RIGHT)),
        Paragraph("Travail - Liberté - Patrie", ParagraphStyle("DeviseEtat", fontName="Helvetica-Oblique", fontSize=7, leading=9, alignment=TA_RIGHT, textColor=colors.HexColor("#64748B"))),
        Paragraph("Année Scolaire : " + (paiement.annee_scolaire or infos["annee_scolaire"]), ParagraphStyle("Annee", fontName="Helvetica-Bold", fontSize=8, leading=10, alignment=TA_RIGHT, textColor=colors.HexColor("#C49A3A"))),
    ]

    tableau_entete_data = [
        [logo_widget or "", bloc_ecole, bloc_etat]
    ]
    t_entete = Table(tableau_entete_data, colWidths=[2.5 * cm, 10.5 * cm, 5.6 * cm])
    t_entete.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(t_entete)

    # Ligne de séparation dorée
    elements.append(Spacer(1, 0.2 * cm))
    ligne_sep = Table([[""]], colWidths=[18.6 * cm], rowHeights=[2])
    ligne_sep.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#C49A3A")),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(ligne_sep)
    elements.append(Spacer(1, 0.3 * cm))

    # Titre du document
    num_recu = paiement.reference or f"REC-{paiement.annee_scolaire.replace('-', '')}-{paiement.id:04d}"
    elements.append(Paragraph(f"REÇU OFFICIEL DE PAIEMENT N° {num_recu}", style_titre_doc))
    elements.append(Spacer(1, 0.3 * cm))

    # Corps du reçu : Grille d'informations structurée
    eleve = paiement.eleve
    classe_nom = str(eleve.classe) if eleve and eleve.classe else "-"
    matricule = eleve.matricule if eleve else "-"
    nom_eleve = f"{eleve.nom.upper()} {eleve.prenom}" if eleve else "-"
    
    libelle_tranche = dict(paiement.TRANCHE_CHOICES).get(paiement.tranche, f"{paiement.tranche}e tranche" if paiement.tranche else "Scolarité")
    libelle_mode = dict(paiement.MODE_CHOICES).get(paiement.mode_paiement, paiement.mode_paiement.title())

    donnees_grille = [
        [Paragraph("Élève bénéficiaire :", style_label), Paragraph(f"<b>{nom_eleve}</b> (Matricule : {matricule})", style_valeur),
         Paragraph("Classe :", style_label), Paragraph(classe_nom, style_valeur)],
        [Paragraph("Tranche réglée :", style_label), Paragraph(libelle_tranche, style_valeur),
         Paragraph("Mode de règlement :", style_label), Paragraph(libelle_mode, style_valeur)],
        [Paragraph("Date du versement :", style_label), Paragraph(str(paiement.date_paiement), style_valeur),
         Paragraph("Référence interne :", style_label), Paragraph(paiement.reference or "-", style_valeur)],
    ]

    t_grille = Table(donnees_grille, colWidths=[3.8 * cm, 6.5 * cm, 3.8 * cm, 4.5 * cm])
    t_grille.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(t_grille)
    elements.append(Spacer(1, 0.4 * cm))

    # Boîte mise en valeur du montant
    montant_formate = f"{int(paiement.montant):,}".replace(",", " ")
    bloc_montant = [
        Paragraph(f"SOMME ENCAISSÉE : {montant_formate} FCFA", style_montant),
    ]
    t_montant = Table([bloc_montant], colWidths=[18.6 * cm])
    t_montant.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
        ("BOX", (0, 0), (-1, -1), 1.5, colors.HexColor("#C49A3A")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(t_montant)
    elements.append(Spacer(1, 0.3 * cm))

    # Signatures et cachets
    cachet_widget = None
    if infos.get("cachet") and os.path.exists(infos["cachet"]):
        try:
            cachet_widget = Image(infos["cachet"], width=2.4 * cm, height=2.4 * cm)
        except Exception:
            cachet_widget = None

    signature_widget = None
    if infos.get("signature") and os.path.exists(infos["signature"]):
        try:
            signature_widget = Image(infos["signature"], width=2.4 * cm, height=1.3 * cm)
        except Exception:
            signature_widget = None

    signataire_nom = paiement.enregistre_par.get_full_name() if paiement.enregistre_par else infos["nom_directeur"]
    
    col_gauche = [
        Paragraph("<b>Mention de versement :</b>", style_label),
        Paragraph("Reçu délivré pour valoir ce que de droit.", style_valeur),
        Paragraph("Tout paiement versé ne donne droit à aucun remboursement.", style_contact),
    ]

    col_droite = [
        Paragraph("<b>Pour l'Administration / La Comptabilité</b>", ParagraphStyle("SignLabel", fontName="Helvetica-Bold", fontSize=8, leading=10, alignment=TA_CENTER)),
        Spacer(1, 0.1 * cm),
        signature_widget or Spacer(1, 0.8 * cm),
        Paragraph(f"<b>{signataire_nom}</b>", ParagraphStyle("SignNom", fontName="Helvetica", fontSize=8, leading=10, alignment=TA_CENTER)),
    ]

    t_bas = Table([[col_gauche, cachet_widget or "", col_droite]], colWidths=[8.6 * cm, 4.0 * cm, 6.0 * cm])
    t_bas.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(t_bas)
    elements.append(Spacer(1, 0.2 * cm))

    # Pied de page sécurisé
    elements.append(Paragraph("Document officiel informatisé — Complexe Scolaire Magnificat — Lomé, Togo. Vérifiable auprès de la direction.", style_pied))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
