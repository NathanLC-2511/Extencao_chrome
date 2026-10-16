#!/usr/bin/env bash
# Entry point wrapper for Linux Native Messaging Host (Native & Flatpak support)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

if [ -f "/.flatpak-info" ]; then
    # We are inside a Flatpak container: execute host.py on the host system
    # so it has full access to host tools (yt-dlp, ffmpeg, terminal emulators)
    exec flatpak-spawn --host /usr/bin/python3 "$SCRIPT_DIR/host.py" "$@"
else
    exec /usr/bin/env python3 "$SCRIPT_DIR/host.py" "$@"
fi
