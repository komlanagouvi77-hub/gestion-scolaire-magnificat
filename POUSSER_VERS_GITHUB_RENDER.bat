@echo off
title SYNCHRONISATION GITHUB ET DEPLOIEMENT RENDER - MAGNIFICAT
color 0B
echo ======================================================================
echo    SYNCHRONISATION GITHUB ET DEPLOIEMENT AUTOMATIQUE SUR RENDER
echo ======================================================================
echo.
echo Positionnement dans le dossier du projet...
cd /d "%~dp0"
echo.
echo Envoi des derniers commits vers GitHub (branche main)...
echo Si une fenetre de connexion GitHub apparait, validez la connexion.
echo.
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ======================================================================
    echo  SUCCES : Les modifications sont maintenant sur GitHub !
    echo  - Render detecte automatiquement cet envoi.
    echo  - La compilation et le deploiement sur Render demarrent (duree : 3-5 min).
    echo  - URL Render : https://gestion-scolaire-magnificat-vcov.onrender.com/app/
    echo ======================================================================
) else (
    echo ======================================================================
    echo  ATTENTION : La commande git push a rencontre une erreur.
    echo  Verifiez votre connexion Internet et vos identifiants GitHub.
    echo ======================================================================
)
echo.
pause
