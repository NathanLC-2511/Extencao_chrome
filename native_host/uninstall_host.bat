@echo off
chcp 65001 >nul
title Desinstalador - yt-dlp Native Messaging Host
cls
echo ======================================================================
echo          Desinstalador do Conector Nativo yt-dlp
echo ======================================================================
echo.
echo Removendo chave do Registro (HKCU\Software\Google\Chrome\NativeMessagingHosts\com.ytdlp.downloader)...

reg delete "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.ytdlp.downloader" /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCESSO] Conector nativo removido com sucesso do Registro do Windows!
) else (
    echo.
    echo [INFO] A chave ja nao existia ou ocorreu um erro ao remover.
)

echo.
pause
