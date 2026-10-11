"""
Django settings for config project.
"""
from pathlib import Path

from decouple import Config, RepositoryEmpty, RepositoryEnv
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# En local, un fichier .env (non versionne, voir .gitignore) fournit la
# configuration reelle. En production, l'hebergeur (Render, etc.) injecte
# les variables directement dans l'environnement systeme : python-decouple
# les lit alors sans avoir besoin d'un fichier .env du tout (Config.get()
# verifie toujours os.environ en premier).
#
# Important : on ne lit JAMAIS .env.example comme source de configuration
# active. C'est un modele a copier vers .env pour demarrer en local, pas une
# valeur de repli utilisable en production - le lire silencieusement en
# l'absence de .env exposerait DEBUG=True et un SECRET_KEY publiquement
# connu si le vrai .env est oublie au deploiement.
_env_path = BASE_DIR / '.env'
config = Config(RepositoryEnv(str(_env_path))) if _env_path.exists() else Config(RepositoryEmpty())

SECRET_KEY = config(
    'DJANGO_SECRET_KEY',
    default='django-insecure-h65r3rp!c$8mo6pudrau4==c_lpz8p$b+e4r)8p^5l3*py!6d4',
)

# Par defaut FAUX (fail-safe) : si la variable n'est definie nulle part
# (ni variable d'environnement reelle, ni .env), on demarre en mode
# production securise plutot que d'exposer des traces de debogage.
DEBUG = config('DJANGO_DEBUG', default='False') == 'True'

# Garde-fou : impossible de demarrer en production (DEBUG=False) avec une
# cle connue, trop courte ou de faible complexite.
# Sans ce controle, un deploiement qui oublie de definir DJANGO_SECRET_KEY
# tournerait silencieusement avec une cle connue de quiconque lit ce fichier.
_CLES_SECRETES_INSECURES = {
    'django-insecure-h65r3rp!c$8mo6pudrau4==c_lpz8p$b+e4r)8p^5l3*py!6d4',
    'change-moi-en-production',
}
if not DEBUG and (
    not SECRET_KEY
    or SECRET_KEY in _CLES_SECRETES_INSECURES
    or len(SECRET_KEY) < 50
    or len(set(SECRET_KEY)) < 5
):
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY doit contenir au moins 50 caracteres aleatoires en production "
        "(DJANGO_DEBUG=False). Generez-en une, par exemple : "
        "python -c \"import secrets; print(secrets.token_urlsafe(50))\" "
        "puis definissez-la comme variable d'environnement sur le serveur - jamais dans le code source."
    )

ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')
RENDER_EXTERNAL_HOSTNAME = config('RENDER_EXTERNAL_HOSTNAME', default='')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

CSRF_TRUSTED_ORIGINS = [
    origine.strip()
    for origine in config('DJANGO_CSRF_TRUSTED_ORIGINS', default='').split(',')
    if origine.strip()
]
if RENDER_EXTERNAL_HOSTNAME:
    CSRF_TRUSTED_ORIGINS.append(f'https://{RENDER_EXTERNAL_HOSTNAME}')


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # API REST
    'rest_framework',
    'rest_framework.authtoken',
    'drf_spectacular',
    'corsheaders',

    # Apps du projet Gestion Scolaire Magnificat
    'comptes',
    'scolarite',
    'paiements',
    'communication',
]

AUTH_USER_MODEL = 'comptes.Utilisateur'

LOGIN_URL = 'comptes:login'
LOGIN_REDIRECT_URL = 'comptes:apres_connexion'
LOGOUT_REDIRECT_URL = 'comptes:login'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # sert les fichiers statiques en production
    'corsheaders.middleware.CorsMiddleware',  # doit venir avant CommonMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CORS : necessaire uniquement quand le frontend React (build de production,
# ou "npm run dev" sur un port different) et l'API Django tournent sur des
# origines differentes. En dev avec le proxy Vite (vite.config.js) ce n'est
# pas utilise, mais sans ca un deploiement separe front/back serait bloque
# par le navigateur. Domaines a autoriser via la variable d'environnement
# DJANGO_CORS_ALLOWED_ORIGINS (liste separee par des virgules).
CORS_ALLOWED_ORIGINS = [
    origine.strip()
    for origine in config('DJANGO_CORS_ALLOWED_ORIGINS', default='http://localhost:5173,http://127.0.0.1:5173').split(',')
    if origine.strip()
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


if config('DATABASE_URL', default=''):
    # Fourni automatiquement par Render (et la plupart des hebergeurs cloud) :
    # une seule variable au lieu de DB_NAME/DB_USER/... separes.
    import dj_database_url
    DATABASES = {'default': dj_database_url.config(default=config('DATABASE_URL'), conn_max_age=600)}
elif config('DB_NAME', default=''):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Lome'
USE_I18N = True
USE_TZ = True


# Envoi d'emails (confirmation de compte approuve/refuse aux demandeurs
# d'acces - voir comptes/emails.py). Par defaut, en developpement (DEBUG),
# les emails sont simplement affiches dans la console du serveur (aucun
# reglage SMTP requis pour tester en local) ; en production, on utilise un
# vrai serveur SMTP configure via les variables d'environnement ci-dessous.
EMAIL_BACKEND = config(
    'DJANGO_EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend',
)
EMAIL_HOST = config('DJANGO_EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('DJANGO_EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('DJANGO_EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('DJANGO_EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('DJANGO_EMAIL_USE_TLS', default='True') == 'True'
DEFAULT_FROM_EMAIL = config(
    'DJANGO_DEFAULT_FROM_EMAIL',
    default='Complexe Scolaire Magnificat <no-reply@magnificat-scolaire.local>',
)


STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    # Le stockage compresse/hache de Whitenoise exige que collectstatic ait
    # deja tourne (il lit staticfiles.json) : il ne doit s'activer qu'en
    # production (DEBUG=False), jamais pendant les tests ou le developpement
    # local, sous peine de faire echouer manage.py test.
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
        if not DEBUG else "django.contrib.staticfiles.storage.StaticFilesStorage"
    },
}

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Django REST Framework - configuration de l'API
# Authentification par Token uniquement : c'est ce que l'app React et
# Postman utilisent. SessionAuthentication a ete retire volontairement :
# si le navigateur a une session Django active (ex: connecte sur
# /admin/), DRF exige alors un jeton CSRF sur les requetes POST de
# l'API - ce que React n'envoie pas - et l'API renvoie 403 alors meme
# que les identifiants sont corrects. Retirer SessionAuthentication
# supprime cette verification CSRF pour l'API, sans rien changer a
# /admin/ (qui a son propre systeme, independant de DRF).
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'API - Gestion Scolaire Magnificat',
    'DESCRIPTION': "API REST du systeme d'information de gestion scolaire du Complexe Scolaire Magnificat (PFE ESGIS).",
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}


LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'fichier': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'django.log',
            'maxBytes': 5 * 1024 * 1024,
            'backupCount': 3,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'fichier'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}


if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = config('DJANGO_SECURE_SSL_REDIRECT', default='True') == 'True'
    # Sans ceci, SECURE_SSL_REDIRECT provoque une boucle de redirection
    # infinie derriere Render (ou tout hebergeur similaire) : le proxy
    # termine le HTTPS et transmet la requete a gunicorn en HTTP simple,
    # donc request.is_secure() renvoie toujours False sans cette ligne, et
    # Django re-redirige indefiniment une requete pourtant deja HTTPS cote
    # navigateur. Le proxy ajoute l'en-tete X-Forwarded-Proto pour indiquer
    # le protocole d'origine ; on lui fait confiance ici uniquement parce
    # que Render (comme la plupart des PaaS) le definit lui-meme et
    # n'autorise pas un client externe a le falsifier avant son propre proxy.
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
