import type { ContentScriptMessage, ScrollInitResponse, ScrollNextResponse } from "../types";

let savedScrollX = 0;
let savedScrollY = 0;
let totalHeight = 0;
let viewportHeight = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

chrome.runtime.onMessage.addListener(
  (
    message: ContentScriptMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => {
    switch (message.type) {
      case "INIT_SCROLL":
        handleInitScroll().then(sendResponse);
        return true;
      case "SCROLL_NEXT":
        handleScrollNext(message.offset).then(sendResponse);
        return true;
      case "RESTORE_SCROLL":
        handleRestoreScroll().then(sendResponse);
        return true;
    }
  },
);

async function handleInitScroll(): Promise<ScrollInitResponse> {
  savedScrollX = window.scrollX;
  savedScrollY = window.scrollY;

  totalHeight = document.documentElement.scrollHeight;
  viewportHeight = window.innerHeight;

  window.scrollTo(0, 0);
  await delay(100);

  return {
    totalHeight,
    viewportWidth: window.innerWidth,
    viewportHeight,
    devicePixelRatio: window.devicePixelRatio,
  };
}

async function handleScrollNext(offset: number): Promise<ScrollNextResponse> {
  const previousScrollY = window.scrollY;
  window.scrollTo(0, offset);
  await delay(150);

  const actualScrollY = window.scrollY;
  // Re-read totalHeight in case lazy content changed it
  const currentTotalHeight = document.documentElement.scrollHeight;
  // Done if we've reached the bottom OR scroll position didn't change (can't scroll further)
  const atBottom = actualScrollY + viewportHeight >= currentTotalHeight;
  const stuck = actualScrollY === previousScrollY && offset > previousScrollY;
  const done = atBottom || stuck;

  return { done, scrollY: actualScrollY };
}

async function handleRestoreScroll(): Promise<{ restored: boolean }> {
  window.scrollTo(savedScrollX, savedScrollY);
  await delay(50);
  return { restored: true };
}
