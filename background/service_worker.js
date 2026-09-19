const NATIVE_HOST_NAME = "com.ytdlp.downloader";

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
          format: format || "mp3",
          outputPath: outputPath || ""
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("[yt-dlp] Native host error:", chrome.runtime.lastError.message);
            sendResponse({
              success: false,
              error: chrome.runtime.lastError.message,
              isNativeHostMissing: true
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
    chrome.storage.local.get(
      {
        defaultFormat: "mp3",
        defaultPath: "%(USERPROFILE)s\\Downloads\\%(title)s.%(ext)s"
      },
      (items) => {
        sendResponse(items);
      }
    );
    return true;
  }

  if (request.action === "SAVE_SETTINGS") {
    chrome.storage.local.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
