# Gestion Scolaire - Complexe Scolaire Magnificat

Systeme d'information de gestion scolaire (PFE - ESGIS).

## Installation

1. Creer un environnement virtuel :
   python -m venv venv
   source venv/bin/activate      (Linux/Mac)
   venv\Scripts\activate         (Windows)

2. Installer les dependances :
   pip install -r requirements.txt

3. Copier .env.example vers .env et renseigner les valeurs (notamment la base PostgreSQL).
   Si aucune variable DB_NAME n'est definie, le projet bascule automatiquement sur SQLite
   (pratique pour demarrer sans installer PostgreSQL tout de suite).

4. Creer la base PostgreSQL (si utilisee) :
   createdb gestion_scolaire_magnificat

5. Appliquer les migrations :
   python manage.py makemigrations
   python manage.py migrate

6. Creer un superutilisateur :
   python manage.py createsuperuser

7. Lancer le serveur :
   python manage.py runserver

## Configuration de production

- Ne deployez jamais le fichier `.env` local. Configurez les variables dans le gestionnaire de secrets de l'hebergeur.
- Definissez `DJANGO_DEBUG=False`, une `DJANGO_SECRET_KEY` aleatoire d'au moins 50 caracteres, et les vrais parametres PostgreSQL (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`). La cle par defaut et les cles courtes sont refusees au demarrage en production.
- Utilisez HTTPS en production. Avec `DJANGO_DEBUG=False`, HTTPS, HSTS et les cookies securises sont actives par defaut ; `DJANGO_SECURE_SSL_REDIRECT=False` ne doit etre defini que si le proxy d'entree force deja HTTPS.
- Apres configuration, verifier le deploiement avec `python manage.py check --deploy`, puis creer le premier administrateur avec `python manage.py createsuperuser`.

## Structure des apps

- comptes        : Utilisateur (base), Administrateur, Enseignant, Parent
- scolarite       : Classe, Matiere, Eleve, Note, Bulletin, Absence
- paiements       : Paiement des frais de scolarite
- communication   : Annonces
