@echo off
title Jarvis Bridge Server
echo ============================================
echo   Jarvis Bridge Server
echo   Kokoro TTS + Claude AI
echo ============================================
echo.

cd /d "%~dp0"

echo Checking dependencies...
pip install kokoro numpy soundfile >nul 2>&1

echo Starting bridge...
python bridge.py

pause
