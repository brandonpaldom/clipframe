# Screenshot Extension — Design Spec

## Overview

A Chrome/Edge extension that captures screenshots of web pages — both the visible viewport and full-page (scrolling capture). Built with React + TypeScript + Vite for scalability.

## User Flow

1. User pins the extension to the browser toolbar
2. Clicks the extension icon — popup appears
3. Chooses "Visible capture" or "Full-page capture"
4. Button shows "Capturing..." state while processing
5. Image downloads automatically to the default downloads folder
6. Popup shows brief "Done" feedback and closes

## Architecture

### Entry Points

```
screenshot-extension/
├── src/
│   ├── popup/              # React app — main UI
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.tsx
│   ├── settings/           # React app — config page (opens in new tab)
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── background/         # Service Worker — capture + download logic
│   │   └── service-worker.ts
│   ├── content/            # Content script — injected for full-page capture
│   │   └── scroll-capture.ts
│   ├── offscreen/          # Offscreen document — Canvas stitching
│   │   ├── offscreen.html
│   │   └── offscreen.ts
│   ├── utils/              # Shared functions
│   │   ├── filename.ts     # Name generation: hostname_timestamp.format
│   │   ├── messaging.ts    # Typed message helpers
│   │   └── storage.ts      # chrome.storage.sync wrapper
│   └── types/              # TypeScript types
│       └── index.ts
├── public/
│   ├── manifest.json       # Manifest V3
│   └── icons/              # Extension icons (16, 32, 48, 128)
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Manifest V3

```json
{
  "manifest_version": 3,
  "name": "Screenshot Capture",
  "version": "1.0.0",
  "description": "Capture visible viewport or full-page screenshots",
  "permissions": ["activeTab", "downloads", "scripting", "offscreen", "storage"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "options_ui": {
    "page": "settings.html",
    "open_in_tab": true
  },
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

> **Note:** The `service_worker` path references the TypeScript source. `@crxjs/vite-plugin` transforms this to the compiled JS path at build time. The shipped manifest will reference the bundled output.
```

## Capture Flows

### Viewport Capture

1. Popup sends `{ type: "CAPTURE_VISIBLE" }` to Service Worker
2. Service Worker calls `chrome.tabs.captureVisibleTab(null, { format, quality })`
3. Returns data URL (PNG or JPG)
4. Generates filename: `{hostname}_{YYYY-MM-DD_HH-mm-ss}.{format}` — hostname extracted via `new URL(tab.url).hostname` (e.g., `www.google.com`, `localhost:3000`). For non-http pages, falls back to `screenshot`
5. Downloads via `chrome.downloads.download({ url: dataUrl, filename })`
6. Sends success message back to popup

### Full-Page Capture

1. Popup sends `{ type: "CAPTURE_FULL_PAGE" }` to Service Worker
2. Service Worker injects content script into active tab via `chrome.scripting.executeScript()`
3. Content script:
   - Saves current scroll position
   - Calculates total document dimensions (`document.documentElement.scrollHeight/scrollWidth`)
   - Scrolls to top (0, 0)
   - Enters capture loop:
     - Notifies Service Worker "ready for capture"
     - Service Worker calls `captureVisibleTab()` → sends data URL back
     - Content script scrolls down by one viewport height
     - Repeats until bottom of page is reached
   - Handles last segment (may be partial — tracks overlap)
   - Restores original scroll position
4. Service Worker creates/reuses an Offscreen Document
5. Offscreen Document:
   - Creates a Canvas with full-page dimensions
   - Draws each captured segment at the correct Y offset
   - Handles the last segment overlap (crops to avoid duplication)
   - Exports Canvas as data URL
6. Service Worker downloads the stitched image
7. Sends success message back to popup

### Full-Page Messaging Protocol

The capture loop is **driven by the Service Worker**. The content script is passive — it scrolls and reports position.

1. Popup → Service Worker: `{ type: "CAPTURE_FULL_PAGE" }`
2. Service Worker injects content script, then sends: `{ type: "INIT_SCROLL" }` via `chrome.tabs.sendMessage(tabId, ...)`
3. Content script saves scroll position, scrolls to top, responds with: `{ totalHeight, viewportHeight }`
4. Service Worker enters loop:
   - Calls `captureVisibleTab()` → stores data URL in array
   - Sends `{ type: "SCROLL_NEXT", offset: currentOffset }` to content script
   - Content script scrolls to offset, waits ~150ms for render, responds with `{ done: boolean, scrollY }`
   - Repeats until `done: true`
5. Service Worker sends `{ type: "RESTORE_SCROLL" }` → content script restores original position
6. Service Worker passes all data URLs + dimensions to Offscreen Document via `chrome.runtime.sendMessage()`
7. Offscreen Document stitches and returns final data URL

All messages are typed via a shared `ExtensionMessage` union type in `src/types/`.

### Error Handling (Full-Page)

- **Tab closed/navigated mid-capture:** Service Worker catches the messaging error, aborts capture, cleans up collected data URLs, and sends error to popup.
- **Single frame capture failure:** If `captureVisibleTab` fails on one segment, retry once. If it fails again, abort and notify the user with the number of successful segments.
- **Memory pressure:** Data URLs are held in an array until stitching. For very tall pages this can be significant. If the array exceeds 50 segments, warn and proceed — the Canvas limit will be the actual bottleneck.
- **`activeTab` scope:** The Service Worker captures `tabId` at the start and uses it throughout. If the user switches tabs, `captureVisibleTab` still captures the window's visible tab, so the capture may produce incorrect results. We detect tab focus changes via `chrome.tabs.onActivated` and abort if the target tab loses focus.

### Edge Cases (Full-Page)

- **Fixed/sticky elements:** May appear duplicated in the stitched image. Acceptable for v1 — can be addressed later by hiding position:fixed/sticky elements during capture.
- **Lazy-loaded content:** The scroll triggers loading, so most lazy content will load. A small delay between scroll and capture (~100ms) helps ensure content renders.
- **Very tall pages:** Chrome's Canvas max single dimension is 32,767px with a max area of ~268M pixels. For pages exceeding these limits, we capture up to the limit and warn the user.
- **Pages that block screenshots:** Some pages (chrome://, extension pages) will fail. Show an error message in the popup.

## Popup UI

Dimensions: ~350px wide, auto height. Components:

### Header
- Extension name (left)
- Settings gear icon (right) — opens settings page in new tab via `chrome.runtime.openOptionsPage()`

### Capture Buttons
- **"Visible Capture"** — icon + label, captures current viewport
- **"Full-Page Capture"** — icon + label, captures entire scrollable page

### States
- **Idle:** Buttons enabled, ready for interaction
- **Capturing (viewport):** Clicked button shows spinner + "Capturing...", other button disabled
- **Capturing (full-page):** Shows progress: "Capturing... 3/8 segments", other button disabled
- **Success:** Brief "Done" message (~1.5s), then popup auto-closes via `window.close()`
- **Error:** Red error message with description, buttons re-enabled

## Settings Page

Opens in a new browser tab. Sections:

### Image Format
- Radio selector: PNG (default) | JPG
- If JPG selected: quality slider (10 — 100, default 92). Maps to `captureVisibleTab`'s `quality` parameter (0-100 integer range)

### Filename Preview
- Shows live preview: `google.com_2026-03-20_14-30-45.png`
- Format is fixed for v1 (hostname + timestamp)

### Persistence
- All settings stored via `chrome.storage.sync`
- Syncs across devices when Chrome sync is enabled
- Default values used when no settings are saved

## Theming

- Detects system theme via `window.matchMedia('(prefers-color-scheme: dark)')`
- Implemented with CSS variables on `:root`
- Two sets of variables: light (default) and dark (`@media (prefers-color-scheme: dark)`)
- Variables cover: background, text, borders, button colors, hover states
- Listens for theme changes with `matchMedia.addEventListener('change', ...)` for live updates

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** + `@crxjs/vite-plugin` (or `vite-plugin-web-extension` as fallback) — Chrome extension build tooling, HMR in dev
- **CSS Modules** — scoped styles per component
- **CSS Variables** — theming system
- **@types/chrome** — Chrome API typings
- **ESLint + Prettier** — code quality

### No additional runtime dependencies

All functionality covered by Chrome APIs:
- `chrome.tabs.captureVisibleTab()` — viewport capture
- `chrome.scripting.executeScript()` — content script injection
- `chrome.downloads.download()` — file download
- `chrome.storage.sync` — settings persistence
- `chrome.offscreen` — Canvas access for image stitching

## Browser Compatibility

Chrome and Edge share the Chromium engine. A single `manifest.json` and codebase works for both browsers without modification. The extension can be loaded unpacked in either browser for development, and published to both the Chrome Web Store and Edge Add-ons store.

## DPI Handling

`captureVisibleTab` captures at the device's native pixel ratio (e.g., 2x on Retina displays). Images are saved at native resolution — no downscaling. This preserves maximum quality. The stitching logic in the Offscreen Document accounts for `devicePixelRatio` when calculating canvas dimensions and segment offsets.

## Content Script Injection

The content script for full-page capture is injected **programmatically** via `chrome.scripting.executeScript()`, not declared in the manifest's `content_scripts` field. This is intentional — the script only runs when the user requests a full-page capture, not on every page load.

## Future Considerations (Post-v1)

- Region/area selection capture
- Annotation tools (text, arrows, shapes)
- Capture history panel
- Copy to clipboard option
- Hide fixed/sticky elements during full-page capture
- Configurable filename templates
- Keyboard shortcuts

The React + component architecture supports adding these as isolated features without restructuring.

## Permissions Rationale

- `activeTab` — access to the current tab for capturing (only when user clicks the extension)
- `downloads` — save captured images to disk
- `scripting` — inject content script for full-page scroll capture
- `offscreen` — create offscreen document with Canvas for image stitching
- `storage` — persist user settings (format, quality) across sessions and devices
