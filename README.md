# Clipframe

A Chrome/Edge extension that captures screenshots of web pages — both the visible viewport and full-page scrolling capture. Built with React, TypeScript, and Vite.

## Features

- **Visible capture** — screenshot the current viewport with one click
- **Full-page capture** — automatically scrolls and stitches the entire page into a single image
- **Format options** — save as PNG or JPG with adjustable quality
- **Dark mode** — follows your system theme
- **Cross-browser** — works on Chrome and Edge

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/your-username/clipframe.git
cd clipframe
npm install
```

### Build

```bash
npm run build
```

### Load in browser

1. Go to `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | TypeScript type checking |

## Tech Stack

- React 19 + TypeScript
- Vite + @crxjs/vite-plugin
- CSS Modules + CSS Variables
- Chrome Extension Manifest V3

## Permissions

| Permission | Reason |
|---|---|
| `activeTab` | Access the current tab for capturing |
| `downloads` | Save captured images to disk |
| `offscreen` | Canvas access for stitching full-page screenshots |
| `storage` | Persist user settings across sessions |

## License

ISC
