// YouTube Content Script for yt-dlp Audio Downloader

(function () {
  const BUTTON_ID = "ytdlp-download-action-btn";
  const SHARE_QUICK_BTN_ID = "ytdlp-share-dialog-quick-btn";
  const SHARE_TARGET_ITEM_ID = "ytdlp-share-target-item";

  const CONFIG = window.YTDLP_CONFIG || {
    DEFAULT_FORMAT: "mp3",
    DEFAULT_PATH: "%USERPROFILE%\\Downloads\\%(title)s.%(ext)s",
    validateFormat: (f) => f || "mp3",
    cleanString: (s) => (s || "").replace(/["\r\n|<>^]/g, "").trim(),
    getSettings: (cb) => cb && cb({ defaultFormat: "mp3", defaultPath: "%USERPROFILE%\\Downloads\\%(title)s.%(ext)s" })
  };

  function isWatchPage() {
    return window.location.pathname.startsWith("/watch") || window.location.pathname.startsWith("/shorts");
  }

  function getVideoId() {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("v");
    if (v) return v;

    const shortsMatch = window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

    return null;
  }

  function getShareUrl() {
    const id = getVideoId();
    if (id) {
      return `https://youtu.be/${id}`;
    }
    return window.location.href;
  }

  function getVideoTitle() {
    const titleEl = document.querySelector("h1.ytd-watch-metadata yt-formatted-string, #title h1, h1.title");
    if (titleEl && titleEl.textContent.trim()) {
      return titleEl.textContent.trim();
    }
    return document.title.replace(" - YouTube", "").trim() || "Vídeo do YouTube";
  }

  // --- 1. Botão Principal na Barra de Ações do Vídeo ---
  function handleDownloadClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl = getShareUrl();
    const title = getVideoTitle();

    // Copiar URL de compartilhamento para a área de transferência
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => { });
    }

    // Abrir o modal interativo com opções completas
    if (window.YtdlpModal && window.YtdlpModal.open) {
      window.YtdlpModal.open(shareUrl, title);
    }
  }

  function createDownloadButton() {
    const btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.className = "ytdlp-yt-btn";
    btn.title = "Baixar áudio deste vídeo com yt-dlp";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
      <span>Baixar Áudio</span>
    `;

    btn.addEventListener("click", handleDownloadClick);
    return btn;
  }

  function injectMainButton() {
    if (!isWatchPage()) return;
    if (document.getElementById(BUTTON_ID)) return;

    const containers = [
      "#top-level-buttons-computed",
      "ytd-watch-metadata #actions #top-level-buttons-computed",
      "#actions-inner #top-level-buttons-computed",
      "#menu-container #top-level-buttons-computed",
      "ytd-menu-renderer[class*='ytd-watch-metadata'] #top-level-buttons-computed",
      "#actions.ytd-watch-metadata"
    ];

    let targetContainer = null;
    for (const selector of containers) {
      const el = document.querySelector(selector);
      if (el) {
        targetContainer = el;
        break;
      }
    }

    if (targetContainer) {
      const btn = createDownloadButton();
      targetContainer.appendChild(btn);
    }
  }

  // --- 2. Botão Rápido Dentro do Diálogo "Compartilhar" ---
  function handleQuickDownload(buttonEl) {
    const shareInput = document.querySelector(
      "#share-url, input#share-url, input.style-scope.yt-copy-link-renderer, ytd-unified-share-panel-renderer input"
    );
    let url = (shareInput && shareInput.value && shareInput.value.trim()) || getShareUrl();
    url = CONFIG.cleanString(url);

    const labelEl = buttonEl.querySelector(".ytdlp-btn-label") || buttonEl;
    const originalText = labelEl.textContent;

    labelEl.textContent = "🚀 Iniciando...";
    buttonEl.style.opacity = "0.7";
    buttonEl.style.pointerEvents = "none";

    // Buscar as preferências salvas centralizadas
    CONFIG.getSettings((items) => {
      const format = items.defaultFormat;
      const outputPath = items.defaultPath;

      chrome.runtime.sendMessage(
        {
          action: "EXECUTE_YTDLP",
          url: url,
          format: format,
          outputPath: outputPath
        },
        (response) => {
          buttonEl.style.opacity = "1";
          buttonEl.style.pointerEvents = "auto";

          if (chrome.runtime.lastError || !response || !response.success) {
            const errorMsg =
              (response && response.error) ||
              (chrome.runtime.lastError && chrome.runtime.lastError.message) ||
              "Erro ao conectar com o conector nativo.";
            labelEl.textContent = "✕ Falha";
            alert(`[yt-dlp] Não foi possível executar: ${errorMsg}\n\nExecute 'install_host.bat' para ativar o conector nativo.`);
            setTimeout(() => {
              labelEl.textContent = originalText;
            }, 3000);
          } else {
            labelEl.textContent = "✓ Terminal Aberto!";
            setTimeout(() => {
              labelEl.textContent = originalText;
            }, 3500);
          }
        }
      );
    });
  }

  function injectShareDialogButtons() {
    // 1. Injetar botão de ação em #link-and-buttons (ao lado do botão Copiar)
    const linkAndButtons = document.querySelector(
      "#link-and-buttons, ytd-unified-share-panel-renderer #link-and-buttons, yt-copy-link-renderer"
    );

    if (linkAndButtons && !document.getElementById(SHARE_QUICK_BTN_ID)) {
      CONFIG.getSettings((items) => {
        if (document.getElementById(SHARE_QUICK_BTN_ID)) return;
        const format = items.defaultFormat.toUpperCase();
        const quickBtn = document.createElement("button");
        quickBtn.id = SHARE_QUICK_BTN_ID;
        quickBtn.className = "ytdlp-share-quick-btn";
        quickBtn.title = `Executar download do vídeo com yt-dlp em ${format} (preferência salva)`;
        quickBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span class="ytdlp-btn-label">⚡ Baixar Áudio (${format})</span>
        `;

        quickBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleQuickDownload(quickBtn);
        });

        linkAndButtons.appendChild(quickBtn);
      });
    }

    // 2. Injetar como alvo de compartilhamento no carrossel (#targets)
    const targetsContainer = document.querySelector(
      "#targets, ytd-unified-share-panel-renderer #targets, #contents #targets"
    );

    if (targetsContainer && !document.getElementById(SHARE_TARGET_ITEM_ID)) {
      CONFIG.getSettings((items) => {
        if (document.getElementById(SHARE_TARGET_ITEM_ID)) return;
        const format = items.defaultFormat.toUpperCase();
        const targetItem = document.createElement("div");
        targetItem.id = SHARE_TARGET_ITEM_ID;
        targetItem.className = "ytdlp-share-target-item";
        targetItem.title = `Executar download com yt-dlp em ${format}`;
        targetItem.innerHTML = `
          <div class="ytdlp-share-target-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <span class="ytdlp-share-target-title ytdlp-btn-label">Baixar (${format})</span>
        `;

        targetItem.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleQuickDownload(targetItem);
        });

        targetsContainer.insertBefore(targetItem, targetsContainer.firstChild);
      });
    }
  }

  // --- 3. Observador Global de DOM com Debounce ---
  let debounceTimer = null;
  function handleDomMutations() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Injetar botão principal no vídeo se estiver na página de exibição
      if (isWatchPage() && !document.getElementById(BUTTON_ID)) {
        injectMainButton();
      }

      // Injetar botão no diálogo Compartilhar somente se o painel estiver aberto no DOM
      if (
        document.querySelector(
          "ytd-unified-share-panel-renderer, yt-copy-link-renderer, #link-and-buttons, #targets"
        )
      ) {
        injectShareDialogButtons();
      }
    }, 200);
  }

  const observer = new MutationObserver(handleDomMutations);
  observer.observe(document.body, { childList: true, subtree: true });

  // Eventos de navegação do YouTube
  window.addEventListener("yt-navigate-finish", () => {
    setTimeout(() => {
      injectMainButton();
      injectShareDialogButtons();
    }, 400);
  });

  window.addEventListener("load", () => {
    setTimeout(() => {
      injectMainButton();
      injectShareDialogButtons();
    }, 600);
  });
})();
