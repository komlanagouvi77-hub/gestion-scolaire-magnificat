#!/usr/bin/env bash
# Script execute automatiquement par Render a chaque deploiement.
# Il compile le frontend React, installe les dependances Python, collecte
# les fichiers statiques et applique les migrations de base de donnees.
set -o errexit

echo "--- Compilation du frontend React ---"
cd frontend-react
npm install
npm run build
cd ..

echo "--- Installation des dependances Python ---"
cd gestion_scolaire
pip install -r requirements.txt

echo "--- Collecte des fichiers statiques ---"
python manage.py collectstatic --no-input

echo "--- Application des migrations ---"
python manage.py migrate
