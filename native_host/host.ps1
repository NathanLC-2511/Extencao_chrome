[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Read-NativeMessage {
    $stdin = [System.Console]::OpenStandardInput()
    $lengthBytes = New-Object byte[] 4
    $bytesRead = $stdin.Read($lengthBytes, 0, 4)
    if ($bytesRead -lt 4) { return $null }

    $msgLength = [System.BitConverter]::ToUInt32($lengthBytes, 0)
    if ($msgLength -eq 0) { return $null }

    $buffer = New-Object byte[] $msgLength
    $totalRead = 0
    while ($totalRead -lt $msgLength) {
        $chunk = $stdin.Read($buffer, $totalRead, $msgLength - $totalRead)
        if ($chunk -le 0) { break }
        $totalRead += $chunk
    }

    $jsonString = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $totalRead)
    return ($jsonString | ConvertFrom-Json)
}

function Send-NativeMessage {
    param([object]$MessageObject)
    $jsonString = $MessageObject | ConvertTo-Json -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonString)
    $lengthBytes = [System.BitConverter]::GetBytes([uint32]$bytes.Length)

    $stdout = [System.Console]::OpenStandardOutput()
    $stdout.Write($lengthBytes, 0, 4)
    $stdout.Write($bytes, 0, $bytes.Length)
    $stdout.Flush()
}

function Find-Tool {
    param([string]$ToolName)
    $cmd = Get-Command $ToolName -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    # Fallback to WinGet paths
    $wingetBase = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages"
    if (Test-Path $wingetBase) {
        $found = Get-ChildItem -Path $wingetBase -Filter "$ToolName.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { return $found.FullName }
    }
    return $null
}

try {
    $request = Read-NativeMessage
    if (-not $request) {
        exit 0
    }

    $action = $request.action
    $url = $request.url
    $format = if ($request.format) { $request.format } else { "mp3" }
    $outputPath = if ($request.outputPath) { $request.outputPath } else { "$([Environment]::GetFolderPath('UserProfile'))\Downloads\%(title)s.%(ext)s" }

    $ytdlp = Find-Tool "yt-dlp"
    $ffmpeg = Find-Tool "ffmpeg"

    if (-not $ytdlp) {
        Send-NativeMessage @{
            status  = "error"
            message = "yt-dlp nao foi encontrado no sistema. Instale via 'winget install yt-dlp' ou adicione ao PATH."
        }
        exit 1
    }

    # Prepare ffmpeg arg if needed
    $ffmpegArg = ""
    if ($ffmpeg) {
        $ffmpegDir = Split-Path -Parent $ffmpeg
        $ffmpegArg = "--ffmpeg-location `"$ffmpegDir`""
    }

    # Construct the exact command requested:
    # yt-dlp -x --audio-format TIPO_ARQUIVO -o "LOCAL" "URL"
    $fullCmd = "`"$ytdlp`" -x --audio-format $format $ffmpegArg -o `"$outputPath`" `"$url`""

    # Launch in a new visible console window so the user sees live progress
    $runnerScript = @"
@echo off
title yt-dlp Downloader - $format
color 0A
echo ========================================================
echo   yt-dlp Audio Downloader
echo ========================================================
echo URL:    $url
echo Formato: $format
echo Destino: $outputPath
echo.
echo Executando:
echo $fullCmd
echo ========================================================
echo.
$fullCmd
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo [SUCESSO] Download e conversao concluidos com exito!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo [ERRO] Ocorreu uma falha no download. Verifique os dados acima.
    echo ========================================================
)
echo.
pause
"@

    $tempBat = "$env:TEMP\ytdlp_download_$(Get-Random).bat"
    [System.IO.File]::WriteAllText($tempBat, $runnerScript, [System.Text.Encoding]::ASCII)

    Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$tempBat`""

    Send-NativeMessage @{
        status  = "success"
        message = "Download iniciado no terminal!"
        command = $fullCmd
        url     = $url
        format  = $format
    }
}
catch {
    Send-NativeMessage @{
        status  = "error"
        message = $_.Exception.Message
    }
}
