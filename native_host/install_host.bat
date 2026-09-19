@echo off
chcp 65001 >nul
title Instalador - yt-dlp Native Messaging Host
cls
echo ======================================================================
echo          Instalador do Conector Nativo yt-dlp para Chrome
echo ======================================================================
echo.

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "JSON_FILE=%SCRIPT_DIR%\com.ytdlp.downloader.json"
set "HOST_BAT=%SCRIPT_DIR%\host.bat"

REM Escape backslashes for JSON
set "JSON_HOST_PATH=%HOST_BAT:\=\\%"

echo Pasta do conector: %SCRIPT_DIR%
echo.

REM Tentar ler ID configurado anteriormente se existir
set "PREV_ID="
if exist "%JSON_FILE%" (
    for /f "tokens=2 delims=/: " %%A in ('findstr "chrome-extension://" "%JSON_FILE%" 2^>nul') do (
        set "PREV_ID=%%~A"
    )
)
if defined PREV_ID (
    set "PREV_ID=%PREV_ID:"=%"
    set "PREV_ID=%PREV_ID:/=%"
    set "PREV_ID=%PREV_ID:\=%"
    set "PREV_ID=%PREV_ID: =%"
)

echo Digite o ID da extensao obtido em chrome://extensions
if defined PREV_ID (
    echo [ID atual registrado: %PREV_ID%]
    echo Pressione ENTER para manter o ID atual ou digite o novo ID:
)
set "EXT_ID="
set /p "EXT_ID=ID da Extensao: "

if not defined EXT_ID set "EXT_ID=%PREV_ID%"

REM Limpar possiveis prefixos, barras e aspas coladas por engano
if defined EXT_ID (
    set "EXT_ID=%EXT_ID:chrome-extension://=%"
    set "EXT_ID=%EXT_ID:/=%"
    set "EXT_ID=%EXT_ID:\=%"
    set "EXT_ID=%EXT_ID:"=%"
)

if not defined EXT_ID (
    echo.
    echo ======================================================================
    echo [ERRO] Nenhum ID foi informado.
    echo Obtenha o ID na pagina chrome://extensions com o Modo do Desenvolvedor ativo.
    echo ======================================================================
    echo.
    pause
    exit /b 1
)

REM Validar e aparar se o ID da extensao contem exatamente 32 caracteres entre a e p
set "CLEAN_ID="
for /f "usebackq delims=" %%I in (`powershell.exe -NoProfile -NoLogo -Command "$id = $env:EXT_ID; if ($id) { $id = $id.Trim() }; if ($id -match '^[a-p]{32}$') { $id } else { '' }"`) do set "CLEAN_ID=%%I"

if not defined CLEAN_ID (
    echo.
    echo ======================================================================
    echo [ERRO] O ID informado '%EXT_ID%' e invalido!
    echo O ID de uma extensao do Chrome deve ter exatamente 32 letras de a ate p.
    echo Exemplo: lmhindcobmakbimhfioifcnbpgbhhkpo
    echo ======================================================================
    echo.
    pause
    exit /b 1
)
set "EXT_ID=%CLEAN_ID%"

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

if not exist "%JSON_FILE%" (
    echo.
    echo ======================================================================
    echo [ERRO] Falha ao gravar o arquivo de manifesto em:
    echo %JSON_FILE%
    echo Verifique as permissoes de escrita nesta pasta.
    echo ======================================================================
    echo.
    pause
    exit /b 1
)

echo.
echo Registrando no Registro do Windows (HKCU\Software\Google\Chrome\NativeMessagingHosts)...
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.ytdlp.downloader" /ve /t REG_SZ /d "%JSON_FILE%" /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ======================================================================
    echo [SUCESSO] Conector nativo instalado com sucesso!
    echo ID configurado: %EXT_ID%
    echo Manifesto gerado: %JSON_FILE%
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
