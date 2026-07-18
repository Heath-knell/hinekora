import { resolve } from "node:path";

import { defineConfig } from "vite";

import mainConfig from "../../vite.main.config.mts";

const input = resolve(__dirname, "./native-capture-electron-main.ts");

export default defineConfig({
  resolve: mainConfig.resolve,
  build: {
    emptyOutDir: false,
    outDir: resolve(__dirname, "../../.vite/e2e-native-overlays"),
    sourcemap: true,
    ssr: input,
    rollupOptions: {
      external: ["electron"],
      output: {
        format: "cjs",
        entryFileNames: "native-capture-main.js",
      },
    },
  },
});
