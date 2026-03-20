import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./public/manifest.json";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        offscreen: resolve(__dirname, "src/offscreen/offscreen.html"),
        "scroll-capture": resolve(__dirname, "src/content/scroll-capture.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "scroll-capture") {
            return "content/scroll-capture.js";
          }
          return "assets/[name]-[hash].js";
        },
      },
    },
  },
});
