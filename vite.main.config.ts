import { defineConfig } from "vite";

// Build target #1: the SANDBOX program (runs inside Figma, has the `figma` API,
// no DOM, no module loader). Output must be a single self-contained IIFE file.
export default defineConfig({
  build: {
    // Don't wipe dist — the UI build writes here too. Order: build:main then build:ui.
    emptyOutDir: false,
    outDir: "dist",
    target: "es2017",
    minify: false,
    lib: {
      entry: "src/main/main.ts",
      formats: ["iife"],
      name: "plugin",
      fileName: () => "code.js",
    },
  },
});
