importScripts("../shared/constants.js");

const NATIVE_HOST_NAME = YTDLP_CONFIG.NATIVE_HOST_NAME;

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXECUTE_YTDLP") {
    const { url, format, outputPath } = request;

    try {
      chrome.runtime.sendNativeMessage(
        NATIVE_HOST_NAME,
        {
          action: "download",
          url: url,
          format: YTDLP_CONFIG.validateFormat(format),
          outputPath: outputPath || YTDLP_CONFIG.DEFAULT_PATH
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("[yt-dlp] Native host error:", chrome.runtime.lastError.message);
            sendResponse({
              success: false,
              error: chrome.runtime.lastError.message,
              isNativeHostMissing: true
            });
          } else if (response && response.status === "error") {
            console.error("[yt-dlp] Native host reported error:", response.message);
            sendResponse({
              success: false,
              error: response.message || "Erro retornado pelo conector nativo.",
              data: response
            });
          } else {
            console.log("[yt-dlp] Native host response:", response);
            sendResponse({
              success: true,
              data: response
            });
          }
        }
      );
    } catch (err) {
      sendResponse({
        success: false,
        error: err.message,
        isNativeHostMissing: true
      });
    }

    // Return true to indicate asynchronous response
    return true;
  }

  if (request.action === "GET_SETTINGS") {
    YTDLP_CONFIG.getSettings((items) => {
      sendResponse(items);
    });
    return true;
  }

  if (request.action === "SAVE_SETTINGS") {
    chrome.storage.local.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
