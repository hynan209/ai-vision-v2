@echo off
title Vision AI - Trinh Cai Dat He Thong
color 0A

:: Ep Windows luon chay tu dung thu muc
cd /d "%~dp0"

echo ==========================================================
echo        CAI DAT MOI TRUONG VISION AI 
echo ==========================================================
echo.

echo [1/2] Dang thiet lap moi truong AI (Backend)...
cd backend
echo Dang tao moi truong ao Python (venv)...
python -m venv venv
echo Dang cai dat cac thu vien AI (Se mat vai phut, mang yeu cu de do)...
call venv\Scripts\activate

:: THEM LENH --default-timeout=1000 DE CHONG DONG BANG KHI MANG CHAM
pip install --default-timeout=1000 -r requirements.txt

cd ..

echo.
echo [2/2] Dang cai dat Giao dien (Frontend)...
cd frontend
call npm install
cd ..

echo.
echo ==========================================================
echo [THANH CONG] Da cai dat xong toan bo he thong!
echo Ban co the chay file "Start_VisionAI.bat" de su dung.
echo ==========================================================
pause