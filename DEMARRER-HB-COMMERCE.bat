@echo off
chcp 65001 >nul
title HB Commerce — Local
set "PROJECT=C:\Users\Admin\Projects\hb-commerce"
cd /d "%PROJECT%"

echo.
echo  ========================================
echo   HB Commerce — Demarrage local
echo  ========================================
echo.

REM Verifier si le depot complet est installe
if not exist "%PROJECT%\css\style.css" (
  echo [1/3] Premier lancement — installation depuis GitHub...
  echo       Cela peut prendre 1-2 minutes.
  echo.
  where git >nul 2>&1
  if %errorlevel%==0 (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT%\setup-complet.ps1"
  )
  if not exist "%PROJECT%\css\style.css" (
    echo       Git indisponible ou echec — telechargement ZIP via Python...
    where python >nul 2>&1 && set "DL=py -3" || set "DL=python"
    %DL% "%PROJECT%\download_repo.py"
    if errorlevel 1 (
      echo ERREUR installation. Installez Git ou Python 3.
      pause
      exit /b 1
    )
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT%\integrate-stock.ps1" 2>nul
  )
  echo.
) else (
  echo [1/3] Projet deja installe.
)

REM config.js
if not exist "%PROJECT%\js\config.js" (
  if exist "%PROJECT%\js\config.example.js" (
    copy /Y "%PROJECT%\js\config.example.js" "%PROJECT%\js\config.js" >nul
    echo       config.js cree depuis l'exemple.
  )
)

echo [2/3] Demarrage serveur local port 8080...

REM Trouver Python
where python >nul 2>&1
if %errorlevel%==0 (
  set "PY=python"
  goto :startserver
)
where py >nul 2>&1
if %errorlevel%==0 (
  set "PY=py -3"
  goto :startserver
)
echo ERREUR: Python introuvable. Installez Python 3 depuis python.org
pause
exit /b 1

:startserver
echo [3/3] Ouverture navigateur...
start "" "http://localhost:8080/index.html"

echo.
echo  Site: http://localhost:8080/index.html
echo  Admin: http://localhost:8080/admin.html
echo  Stock: http://localhost:8080/stock.html
echo.
echo  Appuyez Ctrl+C pour arreter le serveur.
echo.

cd /d "%PROJECT%"
%PY% -m http.server 8080
