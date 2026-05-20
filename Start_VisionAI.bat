@echo off
title Vision AI Auto-Launcher
color 0B

cd /d "%~dp0"

echo ==========================================================
echo        		VISION AI 
echo               [HE THONG KHOI DONG]
echo ==========================================================
echo.
echo [1/3] Dang Khoi dong AI Core (Moi truong VENV)...
start "Vision AI - Backend (AI Core)" cmd /k "cd backend && call venv\Scripts\activate && uvicorn api:app --host 127.0.0.1 --port 8000"

:: Doi 3 giay de Backend khoi dong xong AI Model
timeout /t 3 /nobreak >nul

echo [2/3] Dang khoi tao Giao dien dieu khien ...
start "Vision AI - Frontend (UI)" cmd /k "cd frontend && npm start"

echo [3/3] Hoan tat! Trinh duyet se tu dong mo len.
echo.
echo ==========================================================
echo [TRANG THAI] He thong dang hoat dong!
echo [LUU Y] De he thong chay, VUI LONG KHONG TAT 2 CUA SO DEN.
echo ==========================================================
pause