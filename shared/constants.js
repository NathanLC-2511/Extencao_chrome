// Shared constants and helper utilities for yt-dlp YouTube Audio Downloader
// Compatible with Content Scripts, Service Worker (importScripts), and Popup.

(function (root) {
  const isLinux = typeof navigator !== "undefined" && (
    (navigator.userAgentData && navigator.userAgentData.platform === "Linux") ||
    (navigator.platform && navigator.platform.toLowerCase().includes("linux")) ||
    (navigator.userAgent && navigator.userAgent.toLowerCase().includes("linux"))
  );

  const DEFAULT_FORMAT = "mp3";
  const DEFAULT_PATH_WINDOWS = "%USERPROFILE%\\Downloads\\%(title)s.%(ext)s";
  const DEFAULT_PATH_LINUX = "~/Downloads/%(title)s.%(ext)s";
  const DEFAULT_PATH = isLinux ? DEFAULT_PATH_LINUX : DEFAULT_PATH_WINDOWS;

  const AUDIO_FORMATS = [
    { id: "mp3", name: "MP3", desc: "Mais popular (192-320 kbps)", badge: "Recomendado" },
    { id: "m4a", name: "M4A", desc: "Excelente qualidade AAC", badge: "Apple / AAC" },
    { id: "opus", name: "OPUS", desc: "Melhor compressão / YouTube nativo", badge: "Alta Fidelidade" },
    { id: "flac", name: "FLAC", desc: "Sem perdas (Lossless)", badge: "Lossless" },
    { id: "wav", name: "WAV", desc: "Sem compressão (Áudio puro)", badge: "Raw" },
    { id: "aac", name: "AAC", desc: "Padrão de streaming", badge: "Standard" }
  ];

  const ALLOWED_FORMAT_IDS = AUDIO_FORMATS.map((f) => f.id);

  const YTDLP_CONFIG = {
    DEFAULT_FORMAT,
    DEFAULT_PATH,
    DEFAULT_PATH_WINDOWS,
    DEFAULT_PATH_LINUX,
    AUDIO_FORMATS,
    ALLOWED_FORMAT_IDS,
    NATIVE_HOST_NAME: "com.ytdlp.downloader",

    isLinux() {
      return isLinux;
    },

    getInstallScriptName() {
      return isLinux ? "./install_host.sh" : "install_host.bat";
    },

    getScriptLabel() {
      return isLinux ? "Baixar .sh" : "Baixar .bat";
    },

    getScriptFileName(format) {
      const safeFormat = this.validateFormat(format);
      return isLinux ? `download_${safeFormat}.sh` : `download_${safeFormat}.bat`;
    },

    cleanString(str) {
      if (!str) return "";
      return str.replace(/["\r\n|<>^]/g, "").trim();
    },

    validateFormat(fmt) {
      const lower = (fmt || "").toLowerCase().trim();
      return ALLOWED_FORMAT_IDS.includes(lower) ? lower : DEFAULT_FORMAT;
    },

    buildDownloadCommand(format, outputPath, url) {
      const safeFormat = YTDLP_CONFIG.validateFormat(format);
      const safePath = YTDLP_CONFIG.cleanString(outputPath || DEFAULT_PATH);
      const safeUrl = YTDLP_CONFIG.cleanString(url);
      return `yt-dlp -x --audio-format ${safeFormat} -o "${safePath}" "${safeUrl}"`;
    },

    buildBatContent(format, outputPath, url) {
      const safeFormat = YTDLP_CONFIG.validateFormat(format);
      const safePath = YTDLP_CONFIG.cleanString(outputPath || DEFAULT_PATH_WINDOWS);
      const safeUrl = YTDLP_CONFIG.cleanString(url);
      const batPath = safePath.replace(/%(?=\()/g, "%%");
      const batCmd = `yt-dlp -x --audio-format ${safeFormat} -o "${batPath}" "${safeUrl}"`;
      return `@echo off\r\nchcp 65001 >nul\r\ntitle yt-dlp Downloader\r\necho Baixando audio com yt-dlp...\r\necho Formato: ${safeFormat}\r\necho Destino: "${batPath}"\r\necho URL: "${safeUrl}"\r\necho.\r\n${batCmd}\r\necho.\r\npause\r\n`;
    },

    buildShContent(format, outputPath, url) {
      const safeFormat = YTDLP_CONFIG.validateFormat(format);
      const safePath = YTDLP_CONFIG.cleanString(outputPath || DEFAULT_PATH_LINUX);
      const safeUrl = YTDLP_CONFIG.cleanString(url);
      return `#!/usr/bin/env bash
# yt-dlp YouTube Audio Downloader
clear 2>/dev/null || true
echo "========================================================"
echo "  🎵 yt-dlp Audio Downloader"
echo "========================================================"
echo "URL:     \\"${safeUrl}\\""
echo "Formato: \\"${safeFormat}\\""
echo "Destino: \\"${safePath}\\""
echo ""
echo "Iniciando download com yt-dlp..."
echo "========================================================"
echo ""
yt-dlp -x --audio-format ${safeFormat} -o "${safePath}" "${safeUrl}"
EXIT_CODE=$?
echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "========================================================"
    echo "✅ [SUCESSO] Download e conversao concluidos com exito!"
    echo "========================================================"
else
    echo "========================================================"
    echo "❌ [ERRO] Ocorreu uma falha no download (codigo $EXIT_CODE)."
    echo "========================================================"
fi
echo ""
read -n 1 -s -r -p "Pressione qualquer tecla para fechar..."
echo ""
exit $EXIT_CODE
`;
    },

    buildScriptContent(format, outputPath, url) {
      return isLinux ? this.buildShContent(format, outputPath, url) : this.buildBatContent(format, outputPath, url);
    },

    getSettings(callback) {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(
          {
            defaultFormat: DEFAULT_FORMAT,
            defaultPath: DEFAULT_PATH
          },
          (items) => {
            if (callback) {
              callback({
                defaultFormat: YTDLP_CONFIG.validateFormat(items.defaultFormat),
                defaultPath: YTDLP_CONFIG.cleanString(items.defaultPath) || DEFAULT_PATH
              });
            }
          }
        );
      } else if (callback) {
        callback({ defaultFormat: DEFAULT_FORMAT, defaultPath: DEFAULT_PATH });
      }
    }
  };

  root.YTDLP_CONFIG = YTDLP_CONFIG;
})(typeof self !== "undefined" ? self : this);
