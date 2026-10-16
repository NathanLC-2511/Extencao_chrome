#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
yt-dlp Downloader Native Messaging Host for Linux & POSIX systems.
Communicates with Google Chrome / Chromium / Brave via stdio binary protocol.
"""

import sys
import os
import json
import struct
import shutil
import subprocess
import re
import tempfile
import stat
import time

ALLOWED_FORMATS = ("mp3", "m4a", "opus", "flac", "wav", "aac")


def read_message():
    """Reads a message from stdin using Chrome's 4-byte uint32 length prefix."""
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) < 4:
        return None
    message_length = struct.unpack("<I", raw_length)[0]
    if message_length == 0:
        return None

    raw_data = sys.stdin.buffer.read(message_length)
    if len(raw_data) < message_length:
        return None

    try:
        return json.loads(raw_data.decode("utf-8"))
    except Exception:
        return None


def send_message(msg):
    """Sends a JSON message to stdout prefixed by its 4-byte uint32 length."""
    encoded = json.dumps(msg, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def find_tool(name):
    """Locates an executable in PATH."""
    return shutil.which(name)


def clean_old_temp_scripts():
    """Removes temporary scripts older than 10 minutes to avoid clutter."""
    temp_dir = tempfile.gettempdir()
    now = time.time()
    try:
        for entry in os.listdir(temp_dir):
            if entry.startswith("ytdlp_download_") and entry.endswith(".sh"):
                full_path = os.path.join(temp_dir, entry)
                if os.path.isfile(full_path):
                    if now - os.path.getctime(full_path) > 600:
                        try:
                            os.remove(full_path)
                        except OSError:
                            pass
    except Exception:
        pass


def launch_in_terminal(script_path):
    """
    Attempts to launch the script in an active graphical terminal emulator.
    Falls back to running detached in the background if no emulator is found.
    """
    terminal_candidates = [
        ("x-terminal-emulator", ["x-terminal-emulator", "-e", script_path]),
        ("gnome-terminal", ["gnome-terminal", "--", script_path]),
        ("konsole", ["konsole", "-e", script_path]),
        ("xfce4-terminal", ["xfce4-terminal", "-x", script_path]),
        ("mate-terminal", ["mate-terminal", "-e", script_path]),
        ("lxterminal", ["lxterminal", "-e", script_path]),
        ("kitty", ["kitty", script_path]),
        ("alacritty", ["alacritty", "-e", script_path]),
        ("foot", ["foot", script_path]),
        ("terminator", ["terminator", "-x", script_path]),
        ("xterm", ["xterm", "-e", script_path]),
    ]

    for name, cmd in terminal_candidates:
        if find_tool(name):
            try:
                subprocess.Popen(cmd, start_new_session=True)
                return True, name
            except Exception:
                continue

    # Fallback to direct background execution
    try:
        subprocess.Popen([script_path], start_new_session=True)
        return False, "background"
    except Exception as e:
        return False, str(e)


def main():
    clean_old_temp_scripts()

    request = read_message()
    if not request:
        sys.exit(0)

    action = request.get("action", "")
    url = request.get("url", "")
    req_format = request.get("format", "mp3")
    output_path = request.get("outputPath", "")

    ytdlp = find_tool("yt-dlp")
    ffmpeg = find_tool("ffmpeg")

    # Diagnostic / test action from popup or content script
    if action == "test":
        if not ytdlp:
            send_message({
                "status": "error",
                "message": "yt-dlp não foi encontrado no sistema. Instale via 'sudo apt install yt-dlp' ou adicione ao PATH.",
                "ytdlp": False,
                "ffmpeg": bool(ffmpeg)
            })
            sys.exit(0)

        send_message({
            "status": "success",
            "message": "Conector nativo ativo e yt-dlp pronto para uso no Linux!",
            "ytdlp": True,
            "ffmpeg": bool(ffmpeg)
        })
        sys.exit(0)

    # Validate URL
    if not url or not isinstance(url, str):
        send_message({
            "status": "error",
            "message": "URL do vídeo não informada."
        })
        sys.exit(0)

    url = url.strip()
    if not re.match(r"^https?://[^\s\"<>|\^]+$", url):
        send_message({
            "status": "error",
            "message": "URL inválida ou contém caracteres proibidos."
        })
        sys.exit(0)

    # Validate format
    fmt = req_format.lower().strip() if isinstance(req_format, str) else "mp3"
    if fmt not in ALLOWED_FORMATS:
        fmt = "mp3"

    # Default output path for Linux
    if not output_path or not isinstance(output_path, str):
        output_path = os.path.expanduser("~/Downloads/%(title)s.%(ext)s")
    else:
        # Expand ~ and environment variables (e.g. $HOME)
        output_path = os.path.expanduser(os.path.expandvars(output_path.strip()))
        output_path = re.sub(r'["\r\n|<>^]', '', output_path)

    if not ytdlp:
        send_message({
            "status": "error",
            "message": "yt-dlp não foi encontrado no sistema. Instale via 'sudo apt install yt-dlp' ou adicione ao PATH."
        })
        sys.exit(1)

    # Optional ffmpeg argument if needed
    ffmpeg_arg = ""
    if ffmpeg:
        ffmpeg_dir = os.path.dirname(ffmpeg)
        ffmpeg_arg = f'--ffmpeg-location "{ffmpeg_dir}"'

    full_cmd = f'"{ytdlp}" -x --audio-format {fmt} {ffmpeg_arg} -o "{output_path}" "{url}"'.strip()

    # Generate temporary runner shell script
    script_content = f"""#!/usr/bin/env bash
# yt-dlp temporary runner script
clear
echo "========================================================"
echo "  🎵 yt-dlp Audio Downloader (Linux)"
echo "========================================================"
echo "URL:     \"{url}\""
echo "Formato: \"{fmt}\""
echo "Destino: \"{output_path}\""
echo ""
echo "Iniciando download e extração de áudio..."
echo "========================================================"
echo ""
{full_cmd}
EXIT_CODE=$?
echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "========================================================"
    echo "✅ [SUCESSO] Download e conversão concluídos com êxito!"
    echo "========================================================"
else
    echo "========================================================"
    echo "❌ [ERRO] Ocorreu uma falha no download (código de saída $EXIT_CODE)."
    echo "========================================================"
fi
echo ""
read -n 1 -s -r -p "Pressione qualquer tecla para fechar esta janela..."
echo ""
rm -f -- "$0"
"""

    temp_script = os.path.join(tempfile.gettempdir(), f"ytdlp_download_{os.getpid()}_{int(time.time())}.sh")
    with open(temp_script, "w", encoding="utf-8") as f:
        f.write(script_content)

    # Grant execution permissions
    os.chmod(temp_script, stat.S_IRWXU | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH)

    terminal_launched, terminal_name = launch_in_terminal(temp_script)

    send_message({
        "status": "success",
        "message": f"Download iniciado no terminal ({terminal_name})!" if terminal_launched else "Download iniciado em segundo plano!",
        "command": full_cmd,
        "url": url,
        "format": fmt,
        "terminal": terminal_name
    })


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        send_message({
            "status": "error",
            "message": str(exc)
        })
