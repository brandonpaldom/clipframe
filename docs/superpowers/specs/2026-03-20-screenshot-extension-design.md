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
  "permissions": ["activeTab", "downloads", "scripting", "offscreen"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
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

## Capture Flows

### Viewport Capture

1. Popup sends `{ type: "CAPTURE_VISIBLE" }` to Service Worker
2. Service Worker calls `chrome.tabs.captureVisibleTab(null, { format, quality })`
3. Returns data URL (PNG or JPG)
4. Generates filename: `{hostname}_{YYYY-MM-DD_HH-mm-ss}.{format}`
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

### Edge Cases (Full-Page)

- **Fixed/sticky elements:** May appear duplicated in the stitched image. Acceptable for v1 — can be addressed later by hiding position:fixed/sticky elements during capture.
- **Lazy-loaded content:** The scroll triggers loading, so most lazy content will load. A small delay between scroll and capture (~100ms) helps ensure content renders.
- **Very tall pages:** Canvas has a max size limit (~16384px in most browsers). For pages taller than this, we capture up to the limit and warn the user.
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
- **Capturing:** Clicked button shows spinner + "Capturing...", other button disabled
- **Success:** Brief "Done" message (~1.5s), then popup auto-closes via `window.close()`
- **Error:** Red error message with description, buttons re-enabled

## Settings Page

Opens in a new browser tab. Sections:

### Image Format
- Radio selector: PNG (default) | JPG
- If JPG selected: quality slider (0.1 — 1.0, default 0.92)

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
- **Vite** + `@crxjs/vite-plugin` — Chrome extension build tooling, HMR in dev
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

## Permissions Rationale

- `activeTab` — access to the current tab for capturing (only when user clicks the extension)
- `downloads` — save captured images to disk
- `scripting` — inject content script for full-page scroll capture
- `offscreen` — create offscreen document with Canvas for image stitching
