@echo off
title SERVEUR MAGNIFICAT - SECOURS SOUTENANCE ESGIS
color 0A
echo ======================================================================
echo    SERVEUR LOCAL DE SECOURS - COMPLEXE SCOLAIRE MAGNIFICAT
echo ======================================================================
echo.
echo [1/4] Positionnement dans le dossier du projet...
cd /d "%~dp0"

echo [2/4] Verification et deverrouillage des periodes de demonstration...
venv\Scripts\python.exe gestion_scolaire\manage.py initialiser_systeme --avec-demo

echo [3/4] Ouverture automatique du navigateur sur http://127.0.0.1:8000/app/ ...
start "" "http://127.0.0.1:8000/app/"

echo [4/4] Demarrage du serveur Django...
echo.
echo ======================================================================
echo  LE SERVEUR LOCAL EST EN MARCHE !
echo  - Vous pouvez reduire cette fenetre noire dans la barre des taches.
echo  - NE LA FERMEZ PAS pendant votre soutenance.
echo ======================================================================
echo.
venv\Scripts\python.exe gestion_scolaire\manage.py runserver 127.0.0.1:8000
pause
