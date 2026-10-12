"""
URL configuration for config project.
"""
from pathlib import Path

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse, HttpResponseForbidden, HttpResponseNotFound, HttpResponseRedirect
from django.urls import include, path, re_path
from django.views.static import serve as servir_fichier_media
from scolarite.views import verifier_bulletin_public_view


def racine_view(request):
    """
    L'application moderne (React) est l'interface de reference du site :
    quiconque tape l'adresse racine doit y arriver directement, plutot que
    sur l'ancienne vitrine Django (toujours accessible via ses propres URLs
    pour l'existant, mais plus le point d'entree par defaut).
    """
    return HttpResponseRedirect("/app/")


def application_react_view(request):
    """
    Sert le point d'entree de l'application React (interface moderne,
    utilisee en parallele de l'interface Django classique). Comme la
    navigation interne de React se fait par fragment d'URL (#/tableau-de-bord,
    #/eleves...), qui n'est jamais envoye au serveur, une seule route Django
    suffit : le navigateur gere ensuite la navigation cote client.
    """
    index_html = Path(settings.BASE_DIR) / "static" / "frontend" / "index.html"
    if not index_html.exists():
        return HttpResponseNotFound(
            "Le frontend React n'a pas ete compile. Executez 'npm run build' "
            "dans le dossier frontend-react avant de deployer."
        )
    return HttpResponse(index_html.read_text(encoding="utf-8"))


def servir_service_worker(request):
    """
    Sert le service worker compile sous /app/sw.js plutot que sous son
    emplacement physique /static/frontend/sw.js. La portee ("scope") par
    defaut d'un service worker est limitee au dossier dans lequel il est
    enregistre : en l'enregistrant depuis /app/, il peut controler toutes
    les pages de l'application (/app/...), ce qui est necessaire pour
    qu'elle soit installable (PWA) - un enregistrement depuis
    /static/frontend/ ne couvrirait jamais les pages reellement visitees.
    """
    sw_js = Path(settings.BASE_DIR) / "static" / "frontend" / "sw.js"
    if not sw_js.exists():
        return HttpResponseNotFound("Service worker non compile.")
    return HttpResponse(sw_js.read_text(encoding="utf-8"), content_type="application/javascript")


def bulletin_direct_bloque(request, chemin_fichier):
    """
    Securise l'acces direct aux PDF de bulletins via /media/bulletins/...
    Si l'utilisateur est authentifie (par session Django ou via Token DRF) et autorise,
    on sert directement le bulletin avec telecharger_bulletin_view.
    Si la requete est anonyme ou non autorisee, l'acces est refuse (403 Forbidden).
    """
    from scolarite.models import Bulletin
    from scolarite.views import telecharger_bulletin_view
    from rest_framework.authtoken.models import Token

    utilisateur = request.user
    if not (utilisateur and utilisateur.is_authenticated):
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Token "):
            cle_token = auth_header.split(" ", 1)[1].strip()
            token_obj = Token.objects.select_related("user").filter(key=cle_token).first()
            if token_obj:
                utilisateur = token_obj.user
                request.user = utilisateur

    if not (utilisateur and utilisateur.is_authenticated):
        return HttpResponseForbidden(
            "Acces direct interdit. Veuillez vous connecter pour acceder a ce bulletin."
        )

    nom_fichier = Path(chemin_fichier).name
    bulletin = Bulletin.objects.filter(fichier_pdf__endswith=nom_fichier).first()
    if not bulletin:
        bulletin = Bulletin.objects.filter(fichier_pdf__icontains=nom_fichier).first()

    if bulletin:
        return telecharger_bulletin_view(request, bulletin.id)

    return HttpResponseForbidden(
        "Acces direct interdit. Utilisez le bouton de telechargement depuis l'application."
    )



urlpatterns = [
    path('admin/', admin.site.urls),
    path('', racine_view, name='racine'),
    path('app/', application_react_view, name='application_react'),
    path('app/sw.js', servir_service_worker, name='service_worker'),  # avant le catch-all ci-dessous
    re_path(r'^app/.*$', application_react_view),  # toute sous-page ; React gere la navigation via #/...
    path('comptes/', include('comptes.urls')),
    path('scolarite/', include('scolarite.urls')),
    path('communication/', include('communication.urls')),
    path('paiements/', include('paiements.urls')),
    path('api/', include('config.api_urls')),
    path('verifier/bulletin/<int:bulletin_id>/', verifier_bulletin_public_view, name='verifier_bulletin_racine'),

    # Doit rester AVANT le static(MEDIA_URL...) ci-dessous : Django essaie
    # les urlpatterns dans l'ordre, donc toute requete vers media/bulletins/...
    # est interceptee ici et bloquee, avant d'atteindre le serveur de
    # fichiers generique qui, lui, servirait n'importe quel fichier media
    # sans verification.
    re_path(r'^media/bulletins/(?P<chemin_fichier>.*)$', bulletin_direct_bloque),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # static() de Django refuse deliberement de generer une route en dehors
    # de DEBUG=True (voir sa source), donc sans ce bloc, le logo de
    # l'ecole, les photos d'eleves, le cachet et la signature ne seraient
    # JAMAIS servis en production - 404 systematique, alors meme que les
    # fichiers existent bien sur le disque et sont references en base.
    # django.views.static.serve n'est pas le plus performant qui soit (pas
    # de cache HTTP avance, pas de CDN), mais c'est le service correct et
    # suffisant a l'echelle de cette application ; migrer vers un stockage
    # objet (S3-compatible) resterait la prochaine etape si le trafic media
    # devenait consequent. Les bulletins restent exclus de cette route (voir
    # le blocage plus haut) : ils passent uniquement par le telechargement
    # protege qui verifie les droits de l'utilisateur.
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', servir_fichier_media, {'document_root': settings.MEDIA_ROOT}),
    ]
