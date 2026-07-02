import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build target #2: the UI (React iframe). Figma's `ui` field needs ONE html file,
// so viteSingleFile inlines all JS/CSS into dist/ui.html.
export default defineConfig({
  root: "src/ui",
  plugins: [react(), viteSingleFile()],
  build: {
    emptyOutDir: false,
    outDir: "../../dist",
    target: "es2017",
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
