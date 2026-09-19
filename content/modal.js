// Modal UI Component for YouTube yt-dlp Extension

(function () {
  if (window.__ytdlpModalInitialized) return;
  window.__ytdlpModalInitialized = true;

  // Formats available in yt-dlp for audio extraction
  const AUDIO_FORMATS = [
    { id: "mp3", name: "MP3", desc: "Mais popular (192-320 kbps)", badge: "Recomendado" },
    { id: "m4a", name: "M4A", desc: "Excelente qualidade AAC", badge: "Apple / AAC" },
    { id: "opus", name: "OPUS", desc: "Melhor compressão / YouTube nativo", badge: "Alta Fidelidade" },
    { id: "flac", name: "FLAC", desc: "Sem perdas (Lossless)", badge: "Lossless" },
    { id: "wav", name: "WAV", desc: "Sem compressão (Áudio puro)", badge: "Raw" },
    { id: "aac", name: "AAC", desc: "Padrão de streaming", badge: "Standard" }
  ];

  let selectedFormat = "mp3";
  let currentVideoUrl = "";
  let currentVideoTitle = "";

  // Carregar preferências salvas
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(
      {
        defaultFormat: "mp3",
        defaultPath: "%USERPROFILE%\\Downloads\\%(title)s.%(ext)s"
      },
      (items) => {
        if (items.defaultFormat) selectedFormat = items.defaultFormat;
      }
    );
  }

  function getCleanShareUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get("v");
    if (videoId) {
      return `https://youtu.be/${videoId}`;
    }
    // Check for YouTube Shorts
    const matchShorts = window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    if (matchShorts && matchShorts[1]) {
      return `https://youtu.be/${matchShorts[1]}`;
    }
    return window.location.href;
  }

  function getLocalDownloadTemplate() {
    return "%USERPROFILE%\\Downloads\\%(title)s.%(ext)s";
  }

  function createModalDOM() {
    // Check if modal already exists
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
    const outputPath = outputPathInput ? outputPathInput.value.trim() : getLocalDownloadTemplate();
    const url = currentVideoUrl || getCleanShareUrl();
    return `yt-dlp -x --audio-format ${selectedFormat} -o "${outputPath}" "${url}"`;
  }

  function updateCommandPreview() {
    const cmdText = document.getElementById("ytdlp-cmd-text");
    if (cmdText) {
      cmdText.innerText = getGeneratedCommand();
    }
  }

  function showBanner(message, type = "info") {
    const banner = document.getElementById("ytdlp-banner");
    const bannerText = document.getElementById("ytdlp-banner-text");
    const bannerIcon = document.getElementById("ytdlp-banner-icon");
    if (!banner) return;

    banner.className = `ytdlp-banner ytdlp-banner-${type}`;
    bannerText.innerHTML = message;

    if (type === "success") {
      bannerIcon.innerHTML = `✓`;
    } else if (type === "error") {
      bannerIcon.innerHTML = `✕`;
    } else {
      bannerIcon.innerHTML = `ℹ`;
    }

    banner.style.display = "flex";
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
        cards.forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        selectedFormat = card.getAttribute("data-format");
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
      pathInput.value = getLocalDownloadTemplate();
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
      const cmd = getGeneratedCommand();
      const batContent = `@echo off\r\nchcp 65001 >nul\r\ntitle yt-dlp Downloader\r\necho Baixando audio com yt-dlp...\r\necho Executando: ${cmd}\r\n${cmd}\r\necho.\r\npause\r\n`;
      const blob = new Blob([batContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `download_${selectedFormat}.bat`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showBanner("Arquivo script <code>download_" + selectedFormat + ".bat</code> baixado com sucesso!", "success");
    });

    // Execute button (Native Messaging Host)
    const runBtn = overlay.querySelector("#ytdlp-run-btn");
    runBtn.addEventListener("click", () => {
      const cmd = getGeneratedCommand();
      const pathInput = overlay.querySelector("#ytdlp-output-path");
      const outputPath = pathInput ? pathInput.value.trim() : "";

      showBanner("Disparando comando no Windows via conector nativo...", "info");
      runBtn.disabled = true;

      chrome.runtime.sendMessage(
        {
          action: "EXECUTE_YTDLP",
          url: currentVideoUrl,
          format: selectedFormat,
          outputPath: outputPath
        },
        (response) => {
          runBtn.disabled = false;
          if (chrome.runtime.lastError || !response || !response.success) {
            const errorMsg = (response && response.error) || (chrome.runtime.lastError && chrome.runtime.lastError.message) || "Erro desconhecido ao conectar com o conector nativo.";
            showBanner(
              `<strong>Não foi possível executar automaticamente:</strong> ${errorMsg}<br><br>` +
              `💡 <em>Dica: execute o script <code>install_host.bat</code> na pasta da extensão para registrar o conector, ou use o botão <strong>Copiar Comando</strong> ao lado!</em>`,
              "error"
            );
          } else {
            showBanner(`🚀 <strong>${response.data.message || "Download iniciado com sucesso!"}</strong> Uma janela do terminal foi aberta para acompanhar o progresso em tempo real.`, "success");
          }
        }
      );
    });
  }

  function openModal(shareUrl, videoTitle) {
    const overlay = createModalDOM();
    currentVideoUrl = shareUrl || getCleanShareUrl();
    currentVideoTitle = videoTitle || document.title.replace(" - YouTube", "") || "Vídeo do YouTube";

    // Update fields
    const titleEl = overlay.querySelector("#ytdlp-video-title");
    if (titleEl) titleEl.innerText = currentVideoTitle;

    const urlInput = overlay.querySelector("#ytdlp-share-url-input");
    if (urlInput) urlInput.value = currentVideoUrl;

    const pathInput = overlay.querySelector("#ytdlp-output-path");
    if (pathInput && !pathInput.value) {
      pathInput.value = getLocalDownloadTemplate();
    }

    const banner = overlay.querySelector("#ytdlp-banner");
    if (banner) banner.style.display = "none";

    updateCommandPreview();

    // Copy the share URL to clipboard as requested:
    // "quando eu apertar o botão você deve ir em compartilhar e copiar a URL de envio."
    navigator.clipboard.writeText(currentVideoUrl).then(
      () => {
        showBanner(`URL de envio (<strong>${currentVideoUrl}</strong>) copiada automaticamente para a área de transferência! Escolha o formato abaixo:`, "info");
      },
      () => {
        // Clipboard write denied or not focused
      }
    );

    overlay.classList.add("ytdlp-active");
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
