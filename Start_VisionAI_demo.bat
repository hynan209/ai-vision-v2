@echo off
title Vision AI - Command Center Auto-Launcher
color 0B

:: Ep Windows chay o thu muc hien tai
cd /d "%~dp0"

echo ==========================================================
echo        VISION AI - TRAFFIC COMMAND CENTER
echo               [HE THONG KHOI DONG]
echo ==========================================================
echo.
echo [1/3] Dang Khoi dong AI Core bang Anaconda...
start "Vision AI - Backend" cmd /k "call "C:\New folder\Scripts\activate.bat" vehicle_damage_env && cd backend && uvicorn api:app --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/3] Dang khoi tao Giao dien dieu khien ...
start "Vision AI - Frontend" cmd /k "cd frontend && npm start"

echo [3/3] Hoan tat! Trinh duyet se tu dong mo len.
pause