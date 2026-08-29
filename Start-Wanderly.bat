@echo off
title Wanderly Enterprise Travel OS Launcher
echo ========================================================
echo       Wanderly Enterprise Global Travel OS
echo ========================================================
echo.
echo Starting Wanderly Platform...
echo Opening in browser at http://localhost:5000
echo.

cd /d "%~dp0standalone-flask-postgres"
start http://localhost:5000
python app.py
pause
