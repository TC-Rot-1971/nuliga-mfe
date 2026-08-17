import { resolve } from "node:path";
import { defineConfig } from "vite";

// Builds the standalone, embeddable custom element script that ClubDesk (or
// any other site) loads via <script type="module" src="...">. Separate from
// vite.config.ts, which builds the local preview app under widget/dist.
export default defineConfig({
  build: {
    outDir: "dist-embed",
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/nuliga-team-widget.ts"),
      formats: ["es"],
      fileName: () => "nuliga-team-widget.js",
    },
  },
});
