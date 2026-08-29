@echo off
setlocal
set PYTHONIOENCODING=utf-8
title Wanderly Enterprise Server
cd /d "%~dp0"
echo ========================================================
echo   Starting Wanderly Enterprise Live Telemetry OS...
echo ========================================================
echo Access at: http://localhost:5000
echo Admin at:  http://localhost:5000/admin
echo --------------------------------------------------------
python app.py
pause
