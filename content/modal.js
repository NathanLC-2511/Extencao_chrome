// Modal UI Component for YouTube yt-dlp Extension

(function () {
  if (window.__ytdlpModalInitialized) return;
  window.__ytdlpModalInitialized = true;

  const CONFIG = window.YTDLP_CONFIG || {
    DEFAULT_FORMAT: "mp3",
    DEFAULT_PATH: "%USERPROFILE%\\Downloads\\%(title)s.%(ext)s",
    AUDIO_FORMATS: [
      { id: "mp3", name: "MP3", desc: "Mais popular (192-320 kbps)", badge: "Recomendado" },
      { id: "m4a", name: "M4A", desc: "Excelente qualidade AAC", badge: "Apple / AAC" },
      { id: "opus", name: "OPUS", desc: "Melhor compressão / YouTube nativo", badge: "Alta Fidelidade" },
      { id: "flac", name: "FLAC", desc: "Sem perdas (Lossless)", badge: "Lossless" },
      { id: "wav", name: "WAV", desc: "Sem compressão (Áudio puro)", badge: "Raw" },
      { id: "aac", name: "AAC", desc: "Padrão de streaming", badge: "Standard" }
    ],
    cleanString: (s) => (s || "").replace(/["\r\n|<>^]/g, "").trim(),
    validateFormat: (f) => f || "mp3",
    buildDownloadCommand: (fmt, path, url) => `yt-dlp -x --audio-format ${fmt} -o "${path}" "${url}"`,
    buildBatContent: (fmt, path, url) => `@echo off\r\nchcp 65001 >nul\r\nyt-dlp -x --audio-format ${fmt} -o "${path}" "${url}"\r\npause\r\n`,
    getSettings: (cb) => cb && cb({ defaultFormat: "mp3", defaultPath: "%USERPROFILE%\\Downloads\\%(title)s.%(ext)s" })
  };

  const AUDIO_FORMATS = CONFIG.AUDIO_FORMATS;
  let selectedFormat = CONFIG.DEFAULT_FORMAT;
  let currentVideoUrl = "";
  let currentVideoTitle = "";

  function getCleanShareUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get("v");
    if (videoId) {
      return `https://youtu.be/${videoId}`;
    }
    const matchShorts = window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    if (matchShorts && matchShorts[1]) {
      return `https://youtu.be/${matchShorts[1]}`;
    }
    return window.location.href;
  }

  function createModalDOM() {
    let overlay = document.getElementById("ytdlp-modal-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "ytdlp-modal-overlay";
    overlay.className = "ytdlp-overlay";

    overlay.innerHTML = `
      <div class="ytdlp-modal" id="ytdlp-modal">
        <!-- Header -->
        <div class="ytdlp-modal-header">
          <div class="ytdlp-header-title">
            <div class="ytdlp-logo-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <div>
              <h3>yt-dlp Audio Downloader</h3>
              <span class="ytdlp-subtitle">Extração direta de áudio de alta qualidade</span>
            </div>
          </div>
          <button class="ytdlp-close-btn" id="ytdlp-close-btn" title="Fechar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Video Info Card -->
        <div class="ytdlp-video-card">
          <div class="ytdlp-video-details">
            <span class="ytdlp-label">Vídeo Selecionado:</span>
            <div class="ytdlp-video-title" id="ytdlp-video-title">Carregando título...</div>
            <div class="ytdlp-url-box">
              <span class="ytdlp-url-tag">URL</span>
              <input type="text" id="ytdlp-share-url-input" readonly spellcheck="false" />
              <button class="ytdlp-copy-url-btn" id="ytdlp-copy-url-btn" title="Copiar URL">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Format Selector -->
        <div class="ytdlp-section">
          <div class="ytdlp-section-header">
            <label class="ytdlp-section-label">1. Escolha o Formato de Áudio (TIPO_ARQUIVO):</label>
          </div>
          <div class="ytdlp-format-grid" id="ytdlp-format-grid">
            ${AUDIO_FORMATS.map(
      (fmt) => `
              <div class="ytdlp-format-card ${fmt.id === selectedFormat ? "active" : ""}" data-format="${fmt.id}">
                <div class="ytdlp-format-top">
                  <span class="ytdlp-format-name">${fmt.name}</span>
                  <span class="ytdlp-format-badge">${fmt.badge}</span>
                </div>
                <div class="ytdlp-format-desc">${fmt.desc}</div>
              </div>
            `
    ).join("")}
          </div>
        </div>

        <!-- Download Path Input -->
        <div class="ytdlp-section">
          <div class="ytdlp-section-header">
            <label class="ytdlp-section-label">2. Local de Download (-o):</label>
            <span class="ytdlp-hint">Caminho da pasta e máscara de arquivo</span>
          </div>
          <div class="ytdlp-input-group">
            <input type="text" id="ytdlp-output-path" class="ytdlp-text-input" spellcheck="false" />
            <button class="ytdlp-btn-secondary" id="ytdlp-reset-path" title="Restaurar padrão">Padrão</button>
          </div>
        </div>

        <!-- Command Preview -->
        <div class="ytdlp-section">
          <div class="ytdlp-section-header">
            <label class="ytdlp-section-label">Comando yt-dlp Gerado:</label>
          </div>
          <div class="ytdlp-cmd-preview">
            <code id="ytdlp-cmd-text">yt-dlp ...</code>
          </div>
        </div>

        <!-- Notification Banner -->
        <div class="ytdlp-banner" id="ytdlp-banner" style="display: none;">
          <div class="ytdlp-banner-icon" id="ytdlp-banner-icon"></div>
          <div class="ytdlp-banner-text" id="ytdlp-banner-text"></div>
        </div>

        <!-- Action Buttons -->
        <div class="ytdlp-modal-footer">
          <button class="ytdlp-btn-primary" id="ytdlp-run-btn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>Executar com yt-dlp (Modo Direto)</span>
          </button>

          <button class="ytdlp-btn-secondary" id="ytdlp-copy-cmd-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copiar Comando</span>
          </button>

          <button class="ytdlp-btn-secondary" id="ytdlp-download-bat-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Baixar .bat</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    attachModalEvents(overlay);
    return overlay;
  }

  function getGeneratedCommand() {
    const outputPathInput = document.getElementById("ytdlp-output-path");
    const path = outputPathInput ? outputPathInput.value : CONFIG.DEFAULT_PATH;
    return CONFIG.buildDownloadCommand(selectedFormat, path, currentVideoUrl || getCleanShareUrl());
  }

  function updateCommandPreview() {
    const cmdText = document.getElementById("ytdlp-cmd-text");
    if (cmdText) {
      cmdText.textContent = getGeneratedCommand();
    }
  }

  // Safe banner display avoiding innerHTML with dynamic values
  function showBanner(content, type = "info") {
    const banner = document.getElementById("ytdlp-banner");
    const bannerText = document.getElementById("ytdlp-banner-text");
    const bannerIcon = document.getElementById("ytdlp-banner-icon");
    if (!banner || !bannerText) return;

    banner.className = `ytdlp-banner ytdlp-banner-${type}`;
    bannerText.replaceChildren();

    if (typeof content === "string") {
      bannerText.textContent = content;
    } else if (content instanceof Node) {
      bannerText.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach((node) => {
        if (typeof node === "string") {
          bannerText.appendChild(document.createTextNode(node));
        } else if (node instanceof Node) {
          bannerText.appendChild(node);
        }
      });
    }

    if (bannerIcon) {
      if (type === "success") bannerIcon.textContent = "✓";
      else if (type === "error") bannerIcon.textContent = "✕";
      else bannerIcon.textContent = "ℹ";
    }

    banner.style.display = "flex";
  }

  function updateActiveFormatCard(format) {
    selectedFormat = CONFIG.validateFormat(format);
    const cards = document.querySelectorAll(".ytdlp-format-card");
    cards.forEach((card) => {
      if (card.getAttribute("data-format") === selectedFormat) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
      }
    });
  }

  function attachModalEvents(overlay) {
    const closeBtn = overlay.querySelector("#ytdlp-close-btn");
    closeBtn.addEventListener("click", () => closeModal());

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    // Format selection cards
    const cards = overlay.querySelectorAll(".ytdlp-format-card");
    cards.forEach((card) => {
      card.addEventListener("click", () => {
        const fmt = card.getAttribute("data-format");
        updateActiveFormatCard(fmt);
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ defaultFormat: selectedFormat });
        }
        updateCommandPreview();
      });
    });

    // Output path change
    const pathInput = overlay.querySelector("#ytdlp-output-path");
    pathInput.addEventListener("input", () => {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ defaultPath: pathInput.value.trim() });
      }
      updateCommandPreview();
    });

    // Reset path button
    const resetBtn = overlay.querySelector("#ytdlp-reset-path");
    resetBtn.addEventListener("click", () => {
      pathInput.value = CONFIG.DEFAULT_PATH;
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ defaultPath: pathInput.value.trim() });
      }
      updateCommandPreview();
    });

    // Copy URL button
    const copyUrlBtn = overlay.querySelector("#ytdlp-copy-url-btn");
    copyUrlBtn.addEventListener("click", () => {
      const shareUrlInput = overlay.querySelector("#ytdlp-share-url-input");
      if (shareUrlInput) {
        navigator.clipboard.writeText(shareUrlInput.value);
        showBanner("URL de compartilhamento copiada com sucesso!", "success");
      }
    });

    // Copy Command button
    const copyCmdBtn = overlay.querySelector("#ytdlp-copy-cmd-btn");
    copyCmdBtn.addEventListener("click", () => {
      const cmd = getGeneratedCommand();
      navigator.clipboard.writeText(cmd).then(() => {
        showBanner("Comando yt-dlp copiado para a área de transferência!", "success");
      });
    });

    // Download .bat button
    const downloadBatBtn = overlay.querySelector("#ytdlp-download-bat-btn");
    downloadBatBtn.addEventListener("click", () => {
      const pathInput = overlay.querySelector("#ytdlp-output-path");
      const outputPath = pathInput ? pathInput.value : CONFIG.DEFAULT_PATH;
      const safeUrl = currentVideoUrl || getCleanShareUrl();
      const safeFormat = CONFIG.validateFormat(selectedFormat);
      const batContent = CONFIG.buildBatContent(safeFormat, outputPath, safeUrl);

      const blob = new Blob([batContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `download_${safeFormat}.bat`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const frag = document.createDocumentFragment();
      frag.appendChild(document.createTextNode("Arquivo script "));
      const code = document.createElement("code");
      code.textContent = `download_${safeFormat}.bat`;
      frag.appendChild(code);
      frag.appendChild(document.createTextNode(" baixado com sucesso!"));
      showBanner(frag, "success");
    });

    // Execute button (Native Messaging Host)
    const runBtn = overlay.querySelector("#ytdlp-run-btn");
    runBtn.addEventListener("click", () => {
      const pathInput = overlay.querySelector("#ytdlp-output-path");
      const outputPath = pathInput ? CONFIG.cleanString(pathInput.value) : CONFIG.DEFAULT_PATH;
      const safeFormat = CONFIG.validateFormat(selectedFormat);
      const safeUrl = CONFIG.cleanString(currentVideoUrl || getCleanShareUrl());

      showBanner("Disparando comando no Windows via conector nativo...", "info");
      runBtn.disabled = true;

      chrome.runtime.sendMessage(
        {
          action: "EXECUTE_YTDLP",
          url: safeUrl,
          format: safeFormat,
          outputPath: outputPath
        },
        (response) => {
          runBtn.disabled = false;
          if (chrome.runtime.lastError || !response || !response.success) {
            const errorMsg =
              (response && response.error) ||
              (chrome.runtime.lastError && chrome.runtime.lastError.message) ||
              "Erro desconhecido ao conectar com o conector nativo.";

            const frag = document.createDocumentFragment();
            const strong = document.createElement("strong");
            strong.textContent = "Não foi possível executar automaticamente: ";
            frag.appendChild(strong);
            frag.appendChild(document.createTextNode(errorMsg));
            frag.appendChild(document.createElement("br"));
            frag.appendChild(document.createElement("br"));
            const hint = document.createElement("span");
            hint.innerHTML =
              '💡 <em>Dica: execute o script <code>install_host.bat</code> na pasta da extensão para registrar o conector, ou use o botão <strong>Copiar Comando</strong> ao lado!</em>';
            frag.appendChild(hint);
            showBanner(frag, "error");
          } else {
            const frag = document.createDocumentFragment();
            frag.appendChild(document.createTextNode("🚀 "));
            const strong = document.createElement("strong");
            strong.textContent = (response && response.data && response.data.message) || "Download iniciado com sucesso!";
            frag.appendChild(strong);
            frag.appendChild(
              document.createTextNode(" Uma janela do terminal foi aberta para acompanhar o progresso em tempo real.")
            );
            showBanner(frag, "success");
          }
        }
      );
    });
  }

  function openModal(shareUrl, videoTitle) {
    // Carregar todas as preferências antes de exibir a interface
    CONFIG.getSettings((settings) => {
      const overlay = createModalDOM();
      currentVideoUrl = CONFIG.cleanString(shareUrl || getCleanShareUrl());
      currentVideoTitle = videoTitle || document.title.replace(" - YouTube", "") || "Vídeo do YouTube";

      // Aplicar formato e caminho salvos
      updateActiveFormatCard(settings.defaultFormat);

      const titleEl = overlay.querySelector("#ytdlp-video-title");
      if (titleEl) titleEl.textContent = currentVideoTitle;

      const urlInput = overlay.querySelector("#ytdlp-share-url-input");
      if (urlInput) urlInput.value = currentVideoUrl;

      const pathInput = overlay.querySelector("#ytdlp-output-path");
      if (pathInput) {
        pathInput.value = settings.defaultPath || CONFIG.DEFAULT_PATH;
      }

      const banner = overlay.querySelector("#ytdlp-banner");
      if (banner) banner.style.display = "none";

      updateCommandPreview();

      // Copiar a URL de envio para a área de transferência
      navigator.clipboard.writeText(currentVideoUrl).then(
        () => {
          const frag = document.createDocumentFragment();
          frag.appendChild(document.createTextNode("URL de envio ("));
          const strong = document.createElement("strong");
          strong.textContent = currentVideoUrl;
          frag.appendChild(strong);
          frag.appendChild(
            document.createTextNode(") copiada automaticamente para a área de transferência! Escolha o formato abaixo:")
          );
          showBanner(frag, "info");
        },
        () => {
          // Clipboard write denied or not focused
        }
      );

      overlay.classList.add("ytdlp-active");
    });
  }

  function closeModal() {
    const overlay = document.getElementById("ytdlp-modal-overlay");
    if (overlay) {
      overlay.classList.remove("ytdlp-active");
    }
  }

  // Export to window
  window.YtdlpModal = {
    open: openModal,
    close: closeModal
  };
})();
