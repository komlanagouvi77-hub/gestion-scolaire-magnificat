"""
Commande de gestion pour tester la configuration SMTP (ex: Gmail) en direct.
Usage:
    python manage.py tester_email destinataire@example.com
"""
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings


class Command(BaseCommand):
    help = "Envoie un email de test pour valider les reglages SMTP / Gmail."

    def add_arguments(self, parser):
        parser.add_argument(
            "destinataire",
            type=str,
            help="Adresse email de destination pour recevoir le message de test.",
        )

    def handle(self, *args, **options):
        destinataire = options["destinataire"]
        self.stdout.write(self.style.NOTICE(f"Verification des parametres email..."))
        self.stdout.write(f"  EMAIL_BACKEND       : {settings.EMAIL_BACKEND}")
        self.stdout.write(f"  EMAIL_HOST          : {settings.EMAIL_HOST}")
        self.stdout.write(f"  EMAIL_PORT          : {settings.EMAIL_PORT}")
        self.stdout.write(f"  EMAIL_USE_TLS       : {settings.EMAIL_USE_TLS}")
        self.stdout.write(f"  EMAIL_HOST_USER     : {settings.EMAIL_HOST_USER or '(non renseigne)'}")
        self.stdout.write(f"  EMAIL_HOST_PASSWORD : {'******' if settings.EMAIL_HOST_PASSWORD else '(non renseigne)'}")
        self.stdout.write(f"  DEFAULT_FROM_EMAIL  : {settings.DEFAULT_FROM_EMAIL}")
        self.stdout.write(self.style.NOTICE(f"\nEnvoi de l'email de test a {destinataire}..."))

        sujet = "Test de configuration Email - Complexe Scolaire Magnificat"
        message = (
            "Bonjour,\n\n"
            "Ceci est un email de test envoye avec succes depuis le systeme "
            "de gestion scolaire du Complexe Scolaire Magnificat.\n\n"
            "Vos identifiants SMTP Gmail fonctionnent parfaitement !\n"
        )

        try:
            nb = send_mail(
                subject=sujet,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[destinataire],
                fail_silently=False,
            )
            if nb > 0:
                self.stdout.write(self.style.SUCCESS(f"SUCCES : Email de test envoye avec succes a {destinataire} !"))
            else:
                self.stdout.write(self.style.WARNING(f"ATTENTION : send_mail a renvoye 0."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"ERREUR lors de l'envoi de l'email : {e}"))
            self.stdout.write(self.style.WARNING(
                "\nConseils pour Gmail :\n"
                "1. Verifiez que l'authentification a deux facteurs est activee sur votre compte Google.\n"
                "2. Utilisez un 'Mot de passe d'application' (16 lettres generees par Google), "
                "et NON votre mot de passe habituel de compte Google.\n"
                "3. Renseignez EMAIL_HOST_USER=votre-adresse@gmail.com et EMAIL_HOST_PASSWORD=les16lettres."
            ))
