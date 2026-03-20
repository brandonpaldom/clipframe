import type {
  PopupMessage,
  ContentScriptMessage,
  CaptureResult,
  ScrollInitResponse,
  ScrollNextResponse,
} from "../types";

export function sendToBackground(
  message: PopupMessage,
): Promise<CaptureResult> {
  return chrome.runtime.sendMessage(message);
}

export function sendToTab(
  tabId: number,
  message: ContentScriptMessage,
): Promise<ScrollInitResponse | ScrollNextResponse | { restored: boolean }> {
  return chrome.tabs.sendMessage(tabId, message);
}
