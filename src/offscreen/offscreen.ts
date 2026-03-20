import type { StitchMessage, StitchResult } from "../types";

const MAX_CANVAS_DIMENSION = 32767;
const MAX_CANVAS_AREA = 268435456; // ~268M pixels

chrome.runtime.onMessage.addListener(
  (
    message: StitchMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: StitchResult) => void,
  ) => {
    if (message.type === "STITCH_IMAGES") {
      stitchImages(message).then(sendResponse);
      return true;
    }
  },
);

async function stitchImages(message: StitchMessage): Promise<StitchResult> {
  const { dataUrls, viewportWidth, viewportHeight, totalHeight, devicePixelRatio, format, quality } = message;

  const dpr = devicePixelRatio;
  const canvasWidth = Math.round(viewportWidth * dpr);
  let canvasHeight = Math.round(totalHeight * dpr);
  let warning: string | undefined;

  // Check canvas limits
  if (canvasHeight > MAX_CANVAS_DIMENSION) {
    warning = `Page height exceeds canvas limit (${totalHeight}px). Image will be clipped to ${Math.floor(MAX_CANVAS_DIMENSION / dpr)}px.`;
    canvasHeight = MAX_CANVAS_DIMENSION;
  }

  if (canvasWidth * canvasHeight > MAX_CANVAS_AREA) {
    const maxHeight = Math.floor(MAX_CANVAS_AREA / canvasWidth);
    warning = `Page dimensions exceed canvas area limit. Image will be clipped.`;
    canvasHeight = Math.min(canvasHeight, maxHeight);
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { dataUrl: "", warning: "Failed to create canvas context" };
  }

  const segmentHeightPx = Math.round(viewportHeight * dpr);
  const segmentCount = dataUrls.length;

  for (let i = 0; i < segmentCount; i++) {
    const img = await loadImage(dataUrls[i]);

    if (i === segmentCount - 1 && segmentCount > 1) {
      // Last segment: handle overlap
      const expectedBottom = totalHeight * dpr;
      const drawnSoFar = i * segmentHeightPx;
      const remaining = Math.round(expectedBottom - drawnSoFar);

      if (remaining > 0 && remaining < segmentHeightPx) {
        // Only draw the non-overlapping bottom portion
        const sourceY = img.height - remaining;
        ctx.drawImage(
          img,
          0, sourceY, img.width, remaining,
          0, drawnSoFar, canvasWidth, remaining,
        );
      } else {
        ctx.drawImage(img, 0, drawnSoFar);
      }
    } else {
      ctx.drawImage(img, 0, i * segmentHeightPx);
    }
  }

  const qualityParam = format === "jpeg" ? quality / 100 : undefined;
  const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
  const dataUrl = canvas.toDataURL(mimeType, qualityParam);

  return { dataUrl, warning };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image segment"));
    img.src = dataUrl;
  });
}
