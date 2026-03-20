// --- Messages from Popup to Service Worker ---

export type CaptureVisibleMessage = { type: "CAPTURE_VISIBLE" };
export type CaptureFullPageMessage = { type: "CAPTURE_FULL_PAGE" };

// --- Messages from Service Worker to Content Script ---

export type InitScrollMessage = { type: "INIT_SCROLL" };
export type ScrollNextMessage = { type: "SCROLL_NEXT"; offset: number };
export type RestoreScrollMessage = { type: "RESTORE_SCROLL" };

// --- Messages from Service Worker to Offscreen Document ---

export type StitchMessage = {
  type: "STITCH_IMAGES";
  dataUrls: string[];
  viewportWidth: number;
  viewportHeight: number;
  totalHeight: number;
  devicePixelRatio: number;
  format: ImageFormat;
  quality: number;
};

// --- Progress from Service Worker to Popup ---

export type CaptureProgressMessage = {
  type: "CAPTURE_PROGRESS";
  current: number;
  total: number;
};

// --- Union types ---

export type PopupMessage = CaptureVisibleMessage | CaptureFullPageMessage;

export type ContentScriptMessage =
  | InitScrollMessage
  | ScrollNextMessage
  | RestoreScrollMessage;

export type OffscreenMessage = StitchMessage;

export type ExtensionMessage =
  | PopupMessage
  | ContentScriptMessage
  | OffscreenMessage
  | CaptureProgressMessage;

// --- Response types ---

export type ScrollInitResponse = {
  totalHeight: number;
  viewportHeight: number;
  devicePixelRatio: number;
};

export type ScrollNextResponse = {
  done: boolean;
  scrollY: number;
};

export type CaptureResult =
  | { success: true; filename: string }
  | { success: false; error: string };

export type StitchResult = {
  dataUrl: string;
  warning?: string;
};

// --- Settings ---

export type ImageFormat = "png" | "jpeg";

export type Settings = {
  format: ImageFormat;
  quality: number;
};

export const DEFAULT_SETTINGS: Settings = {
  format: "png",
  quality: 92,
};
