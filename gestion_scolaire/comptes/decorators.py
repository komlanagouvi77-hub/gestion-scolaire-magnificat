from functools import wraps

from django.core.exceptions import PermissionDenied


def role_requis(nom_attribut):
    """
    Decorateur de vue qui verifie que l'utilisateur connecte possede bien
    le role attendu (administrateur / enseignant / parent) avant d'acceder
    a la vue. Sinon, renvoie une erreur 403 (Acces refuse) au lieu de
    planter ou de laisser passer un utilisateur non autorise.
    """

    def decorateur(vue):
        @wraps(vue)
        def enveloppe(request, *args, **kwargs):
            if not hasattr(request.user, nom_attribut):
                raise PermissionDenied(
                    "Vous n'avez pas les droits necessaires pour acceder a cette page."
                )
            return vue(request, *args, **kwargs)

        return enveloppe

    return decorateur