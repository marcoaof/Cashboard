@echo off
setlocal
cd /d "%~dp0"
title Dashboard Financeiro

if not exist ".venv\Scripts\python.exe" (
  echo Criando ambiente virtual em .venv ...
  py -3 -m venv .venv 2>nul || python -m venv .venv
)
if not exist ".venv\Scripts\python.exe" (
  echo ERRO: Python 3.10 ou mais novo nao encontrado. Instale em https://www.python.org/downloads/
  pause
  exit /b 1
)

echo Conferindo dependencias ...
".venv\Scripts\python.exe" -m pip install --quiet --disable-pip-version-check -r requirements.txt
if errorlevel 1 (
  echo ERRO: nao foi possivel instalar as dependencias. Confira a internet e tente de novo.
  pause
  exit /b 1
)

if not exist "config.local.json" copy /y "config.example.json" "config.local.json" >nul

if "%WD_PORT%"=="" set WD_PORT=8000
set WD_OPEN_BROWSER=1
echo Painel em http://localhost:%WD_PORT%  (feche esta janela para encerrar)
".venv\Scripts\python.exe" -m uvicorn server.main:app --host 127.0.0.1 --port %WD_PORT%
pause
