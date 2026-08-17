import { defineConfig } from "vite";

// BASE_PATH is set to "/<repo>/" by the GitHub Pages workflow, since project
// pages are served from a subpath. Left unset it defaults to root, which is
// correct when this dist/ folder is served by our own backend at "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  build: {
    outDir: "dist",
  },
});
