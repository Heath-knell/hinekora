import { resolve } from "node:path";

import { defineConfig } from "vite";

import preloadConfig from "../../vite.preload.config.mts";

export default defineConfig({
  ...preloadConfig,
  build: {
    ...preloadConfig.build,
    emptyOutDir: true,
    outDir: resolve(__dirname, "../../.vite/e2e-native-overlays"),
    rollupOptions: {
      ...preloadConfig.build?.rollupOptions,
      external: ["electron"],
      input: resolve(__dirname, "../../renderer/preload.ts"),
    },
  },
});
