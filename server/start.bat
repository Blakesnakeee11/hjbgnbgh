@echo off
title Jarvis Bridge Server
echo ============================================
echo   Jarvis Bridge Server
echo   Using Claude from your subscription
echo ============================================
echo.

:: Set path to your Claude installation
set CLAUDE_CWD=C:\Users\blake\my-agent

:: Start the server
npx tsx index.ts

pause
