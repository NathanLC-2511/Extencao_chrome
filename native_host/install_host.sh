#!/usr/bin/env bash
# ==============================================================================
# Instalador do Conector Nativo yt-dlp para Linux (Google Chrome, Chromium, Brave, Edge)
# ==============================================================================

set -e

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sem cor

clear 2>/dev/null || true
echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}      Instalador do Conector Nativo yt-dlp para Linux (Chrome)        ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
JSON_LOCAL="$SCRIPT_DIR/com.ytdlp.downloader.json"
HOST_EXEC="$SCRIPT_DIR/host.sh"

echo -e "Diretório do conector: ${YELLOW}$SCRIPT_DIR${NC}"
echo ""

# Garantir permissões de execução nos scripts
chmod +x "$SCRIPT_DIR/host.py" "$SCRIPT_DIR/host.sh" 2>/dev/null || true

# Tentar recuperar ID previamente configurado
PREV_ID=""
if [ -f "$JSON_LOCAL" ]; then
    PREV_ID=$(grep -oP 'chrome-extension://\K[a-p]{32}' "$JSON_LOCAL" 2>/dev/null || true)
fi

echo "Digite o ID da extensão obtido em chrome://extensions"
if [ -n "$PREV_ID" ]; then
    echo -e "[ID atual registrado: ${GREEN}$PREV_ID${NC}]"
    echo -e "Pressione ${YELLOW}ENTER${NC} para manter o ID atual ou digite o novo ID:"
fi

read -r -p "ID da Extensão: " EXT_ID_INPUT

EXT_ID="${EXT_ID_INPUT:-$PREV_ID}"

# Limpeza de prefixos, barras, aspas e espaços
EXT_ID=$(echo "$EXT_ID" | sed -e 's|chrome-extension://||g' -e 's|/||g' -e 's|"||g' -e "s|'||g" -e 's| ||g')

if [ -z "$EXT_ID" ]; then
    echo ""
    echo -e "${RED}[ERRO] Nenhum ID foi informado.${NC}"
    echo "Obtenha o ID na página chrome://extensions com o 'Modo do desenvolvedor' ativado."
    exit 1
fi

# Validar se o ID possui exatamente 32 letras minúsculas de 'a' até 'p'
if [[ ! "$EXT_ID" =~ ^[a-p]{32}$ ]]; then
    echo ""
    echo -e "${RED}======================================================================${NC}"
    echo -e "${RED}[ERRO] O ID informado '$EXT_ID' é inválido!${NC}"
    echo "O ID de uma extensão do Chrome deve ter exatamente 32 letras de 'a' até 'p'."
    echo "Exemplo: lmhindcobmakbimhfioifcnbpgbhhkpo"
    echo -e "${RED}======================================================================${NC}"
    exit 1
fi

echo ""
echo -e "Gerando manifesto local em ${YELLOW}$JSON_LOCAL${NC}..."

cat <<EOF > "$JSON_LOCAL"
{
  "name": "com.ytdlp.downloader",
  "description": "yt-dlp Downloader Native Messaging Host",
  "path": "$HOST_EXEC",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXT_ID/"
  ]
}
EOF

chmod 644 "$JSON_LOCAL"

# Diretórios padrão de NativeMessagingHosts no Linux
TARGET_DIRS=(
    "$HOME/.config/google-chrome/NativeMessagingHosts"
    "$HOME/.config/chromium/NativeMessagingHosts"
    "$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    "$HOME/.config/microsoft-edge/NativeMessagingHosts"
)

echo ""
echo "Instalando manifesto nos navegadores suportados..."

INSTALLED_COUNT=0

for DIR in "${TARGET_DIRS[@]}"; do
    PARENT_DIR="$(dirname "$DIR")"
    # Se o diretório do navegador existir ou for Chrome/Chromium padrão, instalamos
    if [ -d "$PARENT_DIR" ] || [[ "$DIR" == *"google-chrome"* ]] || [[ "$DIR" == *"chromium"* ]]; then
        mkdir -p "$DIR"
        cp -f "$JSON_LOCAL" "$DIR/com.ytdlp.downloader.json"
        echo -e "  ${GREEN}✓ Registrado em:${NC} $DIR/com.ytdlp.downloader.json"
        INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
    fi
done

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}🎉 [SUCESSO] Conector nativo instalado com êxito!${NC}"
echo -e "ID configurado: ${YELLOW}$EXT_ID${NC}"
echo -e "Executável host: ${YELLOW}$HOST_EXEC${NC}"
echo -e "Navegadores configurados: ${GREEN}$INSTALLED_COUNT${NC}"
echo ""
echo "Para verificar:"
echo "1. Clique no ícone da extensão no Chrome/Brave/Edge."
echo "2. O status exibirá 'Conector Ativo' (círculo verde)."
echo -e "${GREEN}======================================================================${NC}"
echo ""
