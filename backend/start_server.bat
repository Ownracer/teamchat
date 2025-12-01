@echo off
echo Starting TeamChat Backend Server...
echo.
echo Using virtual environment: ..\..venv
echo.

cd /d %~dp0
..\..venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause

