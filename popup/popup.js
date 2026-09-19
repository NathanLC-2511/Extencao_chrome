document.addEventListener("DOMContentLoaded", () => {
  const formatSelect = document.getElementById("default-format");
  const pathInput = document.getElementById("default-path");
  const saveBtn = document.getElementById("save-btn");
  const saveStatus = document.getElementById("save-status");
  const checkHostBtn = document.getElementById("check-host-btn");
  const statusDot = document.getElementById("status-dot");
  const statusTitle = document.getElementById("status-title");
  const statusDesc = document.getElementById("status-desc");

  // Load saved preferences
  YTDLP_CONFIG.getSettings((items) => {
    formatSelect.value = items.defaultFormat;
    pathInput.value = items.defaultPath;
  });

  // Save preferences
  saveBtn.addEventListener("click", () => {
    const settings = {
      defaultFormat: YTDLP_CONFIG.validateFormat(formatSelect.value),
      defaultPath: YTDLP_CONFIG.cleanString(pathInput.value) || YTDLP_CONFIG.DEFAULT_PATH
    };

    chrome.storage.local.set(settings, () => {
      saveStatus.innerText = "✓ Preferências salvas com sucesso!";
      setTimeout(() => {
        saveStatus.innerText = "";
      }, 2500);
    });
  });

  // Test Native Host connection
  function testNativeHost() {
    statusDot.className = "status-indicator";
    statusTitle.innerText = "Verificando...";
    statusDesc.innerText = "Tentando conectar ao " + YTDLP_CONFIG.NATIVE_HOST_NAME + "...";

    chrome.runtime.sendNativeMessage(
      YTDLP_CONFIG.NATIVE_HOST_NAME,
      { action: "test" },
      (response) => {
        if (chrome.runtime.lastError) {
          statusDot.className = "status-indicator offline";
          statusTitle.innerText = "Conector Não Conectado";
          statusDesc.innerText = "Execute 'install_host.bat' na pasta da extensão.";
        } else if (!response || response.status === "error") {
          statusDot.className = "status-indicator offline";
          statusTitle.innerText = "Erro no Conector";
          statusDesc.innerText = (response && response.message) || "yt-dlp não encontrado ou erro no conector.";
        } else {
          statusDot.className = "status-indicator online";
          statusTitle.innerText = "Conector Ativo";
          statusDesc.innerText = response.message || "Pronto para disparar yt-dlp diretamente!";
        }
      }
    );
  }

  checkHostBtn.addEventListener("click", testNativeHost);

  // Run test on popup open
  testNativeHost();
});
