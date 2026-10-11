"""
Emails envoyes aux demandeurs d'acces (comptes/models.py: DemandeInscription)
lorsque leur demande est approuvee ou refusee par un Administrateur.

Emails HTML (avec le logo de l'etablissement integre en piece jointe
"inline", visible meme sans connexion active du client de messagerie au
serveur) avec repli en texte brut pour les clients qui ne rendent pas le
HTML. L'envoi ne doit jamais faire echouer l'approbation/le refus
elle-meme (le compte doit rester cree meme si l'email ne part pas, ex:
SMTP mal configure) : toute erreur est capturee et journalisee (voir
LOGGING dans config/settings.py), jamais remontee a l'appelant.
"""
import logging
from email.mime.image import MIMEImage

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


class EmailAvecImagesIncorporees(EmailMultiAlternatives):
    """
    EmailMultiAlternatives dont les pieces jointes sont des images "inline"
    (referencees via cid: dans le HTML), pas des pieces jointes classiques.
    Django construit toujours un conteneur multipart/mixed des qu'il y a des
    pieces jointes (EmailMessage._add_attachments) ; l'ancien attribut
    mixed_subtype qui permettait de le forcer en multipart/related a ete
    retire (RemovedInDjango70Warning : "no longer supports the undocumented
    mixed_subtype attribute"). On obtient le meme resultat en reetiquetant
    le conteneur une fois construit : la structure (alternative texte/HTML
    en premiere partie, image ensuite) est deja celle qu'attend
    multipart/related, seul le sous-type de l'en-tete Content-Type doit
    changer.
    """

    def message(self, *args, **kwargs):
        msg = super().message(*args, **kwargs)
        if self.attachments and msg.get_content_type() == "multipart/mixed":
            msg.set_type("multipart/related")
        return msg

COULEUR_APPROUVEE = "#1F7A4D"
COULEUR_REFUSEE = "#A32424"


def _logo_embarque(parametres):
    """
    Renvoie (cid, MIMEImage) pour le logo de l'etablissement, ou (None, None)
    si aucun logo n'est configure ou que le fichier est illisible - l'email
    part alors sans logo plutot que d'echouer completement.
    """
    if not parametres.logo:
        return None, None
    try:
        parametres.logo.open("rb")
        donnees = parametres.logo.read()
        parametres.logo.close()
        image = MIMEImage(donnees)
        image.add_header("Content-ID", "<logo_ecole>")
        image.add_header("Content-Disposition", "inline", filename="logo.png")
        return "logo_ecole", image
    except Exception:
        logger.exception("Impossible de lire le logo de l'etablissement pour l'email")
        return None, None


def _envoyer_email_html(gabarit, contexte, sujet, texte_brut, destinataire):
    if not destinataire:
        return
    from .models import Parametres

    parametres = Parametres.charger()
    logo_cid, image_logo = _logo_embarque(parametres)

    contexte = dict(contexte)
    contexte["nom_ecole"] = parametres.nom_ecole
    contexte["adresse"] = parametres.adresse
    contexte["logo_cid"] = logo_cid

    try:
        html = render_to_string(gabarit, contexte)
        email = EmailAvecImagesIncorporees(sujet, texte_brut, settings.DEFAULT_FROM_EMAIL, [destinataire])
        email.attach_alternative(html, "text/html")
        if image_logo is not None:
            email.attach(image_logo)
        email.send(fail_silently=False)
    except Exception:
        logger.exception("Echec de l'envoi d'un email de demande d'acces a %s", destinataire)


def envoyer_email_demande_approuvee(demande):
    prenom = demande.first_name or demande.username_souhaite
    type_compte_label = demande.get_type_compte_display()
    texte_brut = (
        f"Bonjour {prenom},\n\n"
        f"Votre demande d'acces a l'espace {type_compte_label} a ete approuvee par l'administration.\n"
        f"Votre compte est maintenant actif. Connectez-vous avec le nom d'utilisateur et le "
        f"mot de passe que vous avez choisis lors de votre demande.\n\n"
        f"Nom d'utilisateur : {demande.username_souhaite}\n\n"
        f"Cordialement,\nComplexe Scolaire Magnificat"
    )
    _envoyer_email_html(
        "comptes/emails/demande_approuvee.html",
        {"prenom": prenom, "type_compte_label": type_compte_label, "username": demande.username_souhaite, "couleur_bandeau": COULEUR_APPROUVEE},
        "Votre compte a ete cree - Complexe Scolaire Magnificat",
        texte_brut,
        demande.email,
    )


def envoyer_email_demande_refusee(demande):
    prenom = demande.first_name or demande.username_souhaite
    type_compte_label = demande.get_type_compte_display()
    motif_ligne = ("\n\nMotif indique par l'administration : " + demande.motif_refus) if demande.motif_refus else ""
    texte_brut = (
        f"Bonjour {prenom},\n\n"
        f"Nous vous informons que votre demande d'acces a l'espace {type_compte_label} "
        f"n'a pas ete retenue par l'administration.{motif_ligne}\n\n"
        f"Pour toute question, veuillez contacter directement l'etablissement.\n\n"
        f"Cordialement,\nComplexe Scolaire Magnificat"
    )
    _envoyer_email_html(
        "comptes/emails/demande_refusee.html",
        {"prenom": prenom, "type_compte_label": type_compte_label, "motif": demande.motif_refus, "couleur_bandeau": COULEUR_REFUSEE},
        "Votre demande d'acces - Complexe Scolaire Magnificat",
        texte_brut,
        demande.email,
    )
