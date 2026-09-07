@echo off
title Jarvis Bridge Server
echo ============================================
echo   Jarvis Bridge Server
echo   Kokoro TTS + Claude AI
echo ============================================
echo.

cd /d "%~dp0"
python bridge.py

pause
