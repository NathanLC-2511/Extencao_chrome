#!/usr/bin/env bash
# ==============================================================================
# Desinstalador do Conector Nativo yt-dlp para Linux
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear 2>/dev/null || true
echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}      Desinstalador do Conector Nativo yt-dlp para Linux              ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
JSON_LOCAL="$SCRIPT_DIR/com.ytdlp.downloader.json"

TARGET_DIRS=(
    # --- Navegadores Nativos ---
    "$HOME/.config/google-chrome/NativeMessagingHosts"
    "$HOME/.config/chromium/NativeMessagingHosts"
    "$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    "$HOME/.config/microsoft-edge/NativeMessagingHosts"

    # --- Navegadores Flatpak ---
    "$HOME/.var/app/com.google.Chrome/config/google-chrome/NativeMessagingHosts"
    "$HOME/.var/app/org.chromium.Chromium/config/chromium/NativeMessagingHosts"
    "$HOME/.var/app/com.brave.Browser/config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    "$HOME/.var/app/com.microsoft.Edge/config/microsoft-edge/NativeMessagingHosts"

    # --- Navegadores Snap ---
    "$HOME/snap/chromium/current/.config/chromium/NativeMessagingHosts"
    "$HOME/snap/brave/current/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
)

REMOVED_COUNT=0

for DIR in "${TARGET_DIRS[@]}"; do
    FILE="$DIR/com.ytdlp.downloader.json"
    if [ -f "$FILE" ]; then
        rm -f "$FILE"
        echo -e "  ${GREEN}✓ Removido de:${NC} $FILE"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
    fi
done

if [ -f "$JSON_LOCAL" ]; then
    rm -f "$JSON_LOCAL"
    echo -e "  ${GREEN}✓ Removido manifesto local:${NC} $JSON_LOCAL"
fi

echo ""
echo -e "${GREEN}======================================================================${NC}"
if [ $REMOVED_COUNT -gt 0 ]; then
    echo -e "${GREEN}[SUCESSO] Conector nativo removido com sucesso de $REMOVED_COUNT navegador(es)/ambiente(s)!${NC}"
else
    echo -e "${YELLOW}[INFO] Nenhum manifesto de conector foi encontrado para remover.${NC}"
fi
echo -e "${GREEN}======================================================================${NC}"
echo ""
