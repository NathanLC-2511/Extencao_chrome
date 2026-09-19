@echo off
chcp 65001 >nul
title Instalador - yt-dlp Native Messaging Host
cls
echo ======================================================================
echo          Instalador do Conector Nativo yt-dlp para Chrome
echo ======================================================================
echo.

set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%
set JSON_FILE=%SCRIPT_DIR%\com.ytdlp.downloader.json
set HOST_BAT=%SCRIPT_DIR%\host.bat

REM Escape backslashes for JSON
set JSON_HOST_PATH=%HOST_BAT:\=\\%

echo Pasta do conector: %SCRIPT_DIR%
echo.

set DEFAULT_ID=dakeljjgakbpnmgiiiblinkjlpiegmdh
echo Digite o ID da extensao carregada em chrome://extensions
echo (Caso ainda nao tenha carregado, pressione ENTER para usar o padrao [%DEFAULT_ID%]):
set /p EXT_ID="ID da Extensao: "

if "%EXT_ID%"=="" set EXT_ID=%DEFAULT_ID%

echo.
echo Gravando configuracao em %JSON_FILE%...

(
echo {
echo   "name": "com.ytdlp.downloader",
echo   "description": "yt-dlp Downloader Native Messaging Host",
echo   "path": "%JSON_HOST_PATH%",
echo   "type": "stdio",
echo   "allowed_origins": [
echo     "chrome-extension://%EXT_ID%/"
echo   ]
echo }
) > "%JSON_FILE%"

echo.
echo Registrando no Registro do Windows (HKCU\Software\Google\Chrome\NativeMessagingHosts)...
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.ytdlp.downloader" /ve /t REG_SZ /d "%JSON_FILE%" /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ======================================================================
    echo [SUCESSO] Conector nativo instalado com sucesso!
    echo ID configurado: %EXT_ID%
    echo O Chrome agora podera disparar o yt-dlp diretamente.
    echo ======================================================================
) else (
    echo.
    echo ======================================================================
    echo [ERRO] Nao foi possivel adicionar a chave ao registro do Windows.
    echo ======================================================================
)

echo.
pause
