#!/usr/bin/env bash
# Entry point wrapper for Linux Native Messaging Host
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
exec /usr/bin/env python3 "$SCRIPT_DIR/host.py" "$@"
