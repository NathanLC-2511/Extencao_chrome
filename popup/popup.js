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
  chrome.storage.local.get(
    {
      defaultFormat: "mp3",
      defaultPath: "%USERPROFILE%\\Downloads\\%(title)s.%(ext)s"
    },
    (items) => {
      formatSelect.value = items.defaultFormat || "mp3";
      pathInput.value = items.defaultPath || "%USERPROFILE%\\Downloads\\%(title)s.%(ext)s";
    }
  );

  // Save preferences
  saveBtn.addEventListener("click", () => {
    const settings = {
      defaultFormat: formatSelect.value,
      defaultPath: pathInput.value.trim()
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
    statusDesc.innerText = "Tentando conectar ao com.ytdlp.downloader...";

    chrome.runtime.sendNativeMessage(
      "com.ytdlp.downloader",
      { action: "test" },
      (response) => {
        if (chrome.runtime.lastError) {
          statusDot.className = "status-indicator offline";
          statusTitle.innerText = "Conector Não Conectado";
          statusDesc.innerText = "Execute 'install_host.bat' na pasta da extensão.";
        } else {
          statusDot.className = "status-indicator online";
          statusTitle.innerText = "Conector Ativo";
          statusDesc.innerText = "Pronto para disparar yt-dlp diretamente!";
        }
      }
    );
  }

  checkHostBtn.addEventListener("click", testNativeHost);

  // Run test on popup open
  testNativeHost();
});
