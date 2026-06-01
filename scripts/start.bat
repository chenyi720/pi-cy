@echo off
chcp 65001 >nul
title PI-CY Coding Assistant
echo [INFO] Starting PI-CY Server...
node dist-server/index.js
pause
