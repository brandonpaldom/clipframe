import type { ExtensionMessage, CaptureResult } from "../types";
import { getSettings } from "../utils/storage";
import { generateFilename } from "../utils/filename";

const RESTRICTED_PROTOCOLS = [
  "chrome://",
  "chrome-extension://",
  "edge://",
  "about:",
  "view-source:",
];

function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  return RESTRICTED_PROTOCOLS.some((protocol) => url.startsWith(protocol));
}

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: CaptureResult) => void,
  ) => {
    if (message.type === "CAPTURE_VISIBLE") {
      handleCaptureVisible(sendResponse);
      return true; // keep message channel open for async response
    }
  },
);

async function handleCaptureVisible(
  sendResponse: (response: CaptureResult) => void,
): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id || isRestrictedUrl(tab.url)) {
      sendResponse({
        success: false,
        error: "Cannot capture this page. Screenshots are not available on browser internal pages.",
      });
      return;
    }

    const settings = await getSettings();
    const dataUrl = await chrome.tabs.captureVisibleTab(null!, {
      format: settings.format,
      quality: settings.format === "jpeg" ? settings.quality : undefined,
    });

    const filename = generateFilename(tab.url!, settings.format);

    await chrome.downloads.download({
      url: dataUrl,
      filename,
      saveAs: false,
    });

    sendResponse({ success: true, filename });
  } catch (err) {
    sendResponse({
      success: false,
      error: err instanceof Error ? err.message : "Capture failed",
    });
  }
}
