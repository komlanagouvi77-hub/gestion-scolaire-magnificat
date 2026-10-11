from rest_framework import permissions


class EstAdministrateurOuLectureSeule(permissions.BasePermission):
    """
    Lecture autorisee a tout utilisateur AUTHENTIFIE (jamais a un utilisateur anonyme),
    ecriture reservee a l'Administrateur.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return hasattr(request.user, "administrateur")
    