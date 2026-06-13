@echo off
title Vision AI - Portable Mode
color 0B

cd /d "%~dp0"

echo ==========================================================
echo        VISION AI - HE THONG GIAM SAT TAI NAN GIAO THONG
echo                  [KHONG CAN CAI DAT MOI TRUONG]
echo ==========================================================
echo.

:: Kiểm tra thư mục môi trường đã giải nén chưa
if not exist "visionai_env" (
    echo [!] CHUA GIAI NEN MOI TRUONG!
    echo.
    echo Vui long giai nen file visionai_env.tar.gz truoc
    pause
    exit /b
)

echo [1/3] Kich hoat moi truong...
call visionai_env\Scripts\activate.bat

echo [2/3] Khoi dong Backend AI (Port 8000)...
start "Vision AI - Backend" cmd /k "cd backend && python api.py"

timeout /t 3 /nobreak >nul

echo [3/3] Khoi dong Giao dien (Port 3000)...
start "Vision AI - Frontend" cmd /k "cd frontend && npm start"

timeout /t 5 /nobreak >nul

echo.
echo ==========================================================
echo   HOAN TAT! MOi TRINH DUYET VAO: http://localhost:3000
echo ==========================================================
pause