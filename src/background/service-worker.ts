import type {
  ExtensionMessage,
  CaptureResult,
  ScrollInitResponse,
  ScrollNextResponse,
  StitchResult,
} from "../types";
import { getSettings } from "../utils/storage";
import { generateFilename } from "../utils/filename";

const RESTRICTED_PROTOCOLS = [
  "chrome://",
  "chrome-extension://",
  "edge://",
  "about:",
  "view-source:",
];

const MAX_SEGMENTS_WARNING = 50;

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
      return true;
    }
    if (message.type === "CAPTURE_FULL_PAGE") {
      handleCaptureFullPage(sendResponse);
      return true;
    }
  },
);

// --- Viewport Capture ---

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

// --- Full-Page Capture ---

async function handleCaptureFullPage(
  sendResponse: (response: CaptureResult) => void,
): Promise<void> {
  let tabId: number | undefined;
  let aborted = false;
  let tabActivatedListener: ((info: chrome.tabs.OnActivatedInfo) => void) | undefined;

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

    tabId = tab.id;
    const settings = await getSettings();

    // Detect tab switch to abort capture
    tabActivatedListener = (info: chrome.tabs.OnActivatedInfo) => {
      if (info.tabId !== tabId) {
        aborted = true;
      }
    };
    chrome.tabs.onActivated.addListener(tabActivatedListener);

    // Content script is declared in manifest and already loaded on the page.
    // Initialize scroll capture
    const initResponse = (await chrome.tabs.sendMessage(tabId, {
      type: "INIT_SCROLL",
    })) as ScrollInitResponse;

    const { totalHeight, viewportWidth, viewportHeight, devicePixelRatio } = initResponse;
    const estimatedSegments = Math.ceil(totalHeight / viewportHeight);

    if (estimatedSegments > MAX_SEGMENTS_WARNING) {
      console.warn(
        `Full-page capture: ${estimatedSegments} segments expected. This may use significant memory.`,
      );
    }

    // Capture loop
    const dataUrls: string[] = [];
    let done = false;
    let currentOffset = 0;

    while (!done && !aborted) {
      // Wait for the browser to finish painting before capturing
      await delay(150);

      // Capture current viewport
      let dataUrl: string;
      try {
        dataUrl = await captureWithRetry(settings);
      } catch {
        throw new Error(
          `Capture failed at segment ${dataUrls.length + 1}. ${dataUrls.length} segments captured successfully.`,
        );
      }

      dataUrls.push(dataUrl);

      // Send progress to popup (may fail silently if popup closed)
      try {
        await chrome.runtime.sendMessage({
          type: "CAPTURE_PROGRESS",
          current: dataUrls.length,
          total: estimatedSegments,
        });
      } catch {
        // Popup may have closed — that's fine
      }

      // Scroll to next segment
      currentOffset += viewportHeight;
      const scrollResponse = (await chrome.tabs.sendMessage(tabId, {
        type: "SCROLL_NEXT",
        offset: currentOffset,
      })) as ScrollNextResponse;

      done = scrollResponse.done;
    }

    // Restore scroll position
    try {
      await chrome.tabs.sendMessage(tabId, { type: "RESTORE_SCROLL" });
    } catch {
      // Tab may have been closed
    }

    if (aborted) {
      sendResponse({
        success: false,
        error: "Capture aborted: tab lost focus during capture.",
      });
      return;
    }

    // Stitch images via offscreen document
    await ensureOffscreenDocument();

    const stitchResult = (await chrome.runtime.sendMessage({
      type: "STITCH_IMAGES",
      dataUrls,
      viewportWidth,
      viewportHeight,
      totalHeight,
      devicePixelRatio,
      format: settings.format,
      quality: settings.quality,
    })) as StitchResult;

    // Close offscreen document to free memory
    try {
      await chrome.offscreen.closeDocument();
    } catch {
      // May already be closed
    }

    if (!stitchResult.dataUrl) {
      sendResponse({
        success: false,
        error: stitchResult.warning ?? "Failed to stitch image segments.",
      });
      return;
    }

    const filename = generateFilename(tab.url!, settings.format);

    await chrome.downloads.download({
      url: stitchResult.dataUrl,
      filename,
      saveAs: false,
    });

    sendResponse({ success: true, filename });
  } catch (err) {
    // Attempt to restore scroll on error
    if (tabId) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: "RESTORE_SCROLL" });
      } catch {
        // Tab may be gone
      }
    }

    try {
      await chrome.offscreen.closeDocument();
    } catch {
      // May not exist
    }

    sendResponse({
      success: false,
      error: err instanceof Error ? err.message : "Full-page capture failed",
    });
  } finally {
    if (tabActivatedListener) {
      chrome.tabs.onActivated.removeListener(tabActivatedListener);
    }
  }
}

async function ensureOffscreenDocument(): Promise<void> {
  try {
    await chrome.offscreen.createDocument({
      url: "src/offscreen/offscreen.html",
      reasons: [chrome.offscreen.Reason.BLOBS],
      justification: "Stitching screenshot segments into a single image",
    });
  } catch {
    // Document may already exist — that's fine
  }
}

async function captureWithRetry(settings: {
  format: "png" | "jpeg";
  quality: number;
}): Promise<string> {
  const options = {
    format: settings.format,
    quality: settings.format === "jpeg" ? settings.quality : undefined,
  };

  try {
    return await chrome.tabs.captureVisibleTab(null!, options);
  } catch {
    // Retry once after a longer delay
    await delay(500);
    return await chrome.tabs.captureVisibleTab(null!, options);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
