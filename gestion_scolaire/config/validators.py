"""
Validateurs reutilisables pour les fichiers importes par les utilisateurs
(logo, cachet, signature, photo d'eleve, import CSV...).

Sans limite explicite, Django accepte un fichier uploade de n'importe
quelle taille : DATA_UPLOAD_MAX_MEMORY_SIZE (2.5 Mo par defaut) exclut
volontairement les fichiers uploades de son calcul (il ne limite que le
reste du corps de la requete), et FILE_UPLOAD_MAX_MEMORY_SIZE ne fait que
decider si le fichier est bufferise en memoire ou sur disque pendant le
traitement - il ne rejette jamais un fichier trop volumineux. Un
utilisateur authentifie (meme legitime) pourrait donc saturer le disque du
serveur avec un seul fichier trop lourd, sans qu'aucune limite ne
l'empeche.
"""
from django.core.exceptions import ValidationError

MO = 1024 * 1024


def valider_taille_image(fichier):
    """Refuse une image de plus de 5 Mo (logo, cachet, signature, photo d'eleve)."""
    if fichier.size > 5 * MO:
        raise ValidationError("Cette image depasse la taille maximale autorisee (5 Mo).")


def valider_taille_csv(fichier, max_mo=5):
    """Refuse un fichier CSV importe de plus de max_mo megaoctets."""
    if fichier.size > max_mo * MO:
        raise ValidationError(
            "Ce fichier depasse la taille maximale autorisee ({} Mo).".format(max_mo)
        )
