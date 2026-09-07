@echo off
title Jarvis Bridge Server
echo ============================================
echo   Jarvis Bridge Server
echo   Using your agent at C:\Users\blake\my-agent
echo ============================================
echo.

cd /d "%~dp0"
npm install
npx tsx index.ts

pause
