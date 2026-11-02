"""
Commande de gestion pour tester la configuration SMTP (ex: Gmail) en direct.
Usage:
    python manage.py tester_email destinataire@example.com
"""
import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from comptes.emails import _envoyer_email_html, COULEUR_APPROUVEE


class Command(BaseCommand):
    help = "Envoie un email de test HTML officiel pour valider les reglages SMTP / Gmail."

    def add_arguments(self, parser):
        parser.add_argument(
            "destinataire",
            type=str,
            help="Adresse email de destination pour recevoir le message de test.",
        )

    def handle(self, *args, **options):
        destinataire = options["destinataire"]
        self.stdout.write(self.style.NOTICE("Verification des parametres email..."))
        self.stdout.write(f"  EMAIL_BACKEND       : {settings.EMAIL_BACKEND}")
        self.stdout.write(f"  EMAIL_HOST          : {settings.EMAIL_HOST}")
        self.stdout.write(f"  EMAIL_PORT          : {settings.EMAIL_PORT}")
        self.stdout.write(f"  EMAIL_USE_TLS       : {settings.EMAIL_USE_TLS}")
        self.stdout.write(f"  EMAIL_HOST_USER     : {settings.EMAIL_HOST_USER or '(non renseigne)'}")
        self.stdout.write(f"  EMAIL_HOST_PASSWORD : {'******' if settings.EMAIL_HOST_PASSWORD else '(non renseigne)'}")
        self.stdout.write(f"  DEFAULT_FROM_EMAIL  : {settings.DEFAULT_FROM_EMAIL}")
        self.stdout.write(self.style.NOTICE(f"\nEnvoi de l'email officiel HTML avec logo a {destinataire}..."))

        sujet = "Authentification & Configuration Email - Complexe Scolaire Magnificat"
        texte_brut = (
            "Bonjour Georges AGOUVI,\n\n"
            "Felicitations ! Le service d'envoi d'emails officiel du Complexe Scolaire Magnificat "
            "est desormais entierement configure et operationnel.\n\n"
            "Vos identifiants SMTP Gmail fonctionnent parfaitement !\n\n"
            "Cordialement,\n"
            "L'Administration du Complexe Scolaire Magnificat\n"
        )
        maintenant = datetime.datetime.now().strftime("%d/%m/%Y a %H:%M:%S")
        contexte = {
            "couleur_bandeau": COULEUR_APPROUVEE,
            "expediteur": settings.DEFAULT_FROM_EMAIL,
            "date_envoi": maintenant,
        }

        try:
            _envoyer_email_html(
                gabarit="comptes/emails/test_email.html",
                contexte=contexte,
                sujet=sujet,
                texte_brut=texte_brut,
                destinataire=destinataire,
            )
            self.stdout.write(self.style.SUCCESS(f"SUCCES : Email HTML officiel envoye avec succes a {destinataire} !"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"ERREUR lors de l'envoi de l'email : {e}"))
            self.stdout.write(self.style.WARNING(
                "\nConseils pour Gmail :\n"
                "1. Verifiez que l'authentification a deux facteurs est activee sur votre compte Google.\n"
                "2. Utilisez un 'Mot de passe d'application' (16 lettres generees par Google), "
                "et NON votre mot de passe habituel de compte Google.\n"
                "3. Renseignez EMAIL_HOST_USER=votre-adresse@gmail.com et EMAIL_HOST_PASSWORD=les16lettres."
            ))
