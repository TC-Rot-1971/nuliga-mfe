import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadConfig } from "./config.js";
import { teamOverviewRoute } from "./routes/teamOverview.js";

const config = loadConfig();
const app = new Hono();

app.use("/api/*", cors());
app.route("/", teamOverviewRoute(config));

app.get("/health", (c) => c.json({ ok: true, mode: config.mode }));

// The actual embed target: ClubDesk (or any site) loads this custom element
// script directly via <script type="module" src=".../embed/nuliga-team-widget.js">.
// Module scripts are always fetched in CORS mode by the browser, so this needs
// the same permissive CORS as /api/* or the cross-origin <script> load just
// fails silently (custom element never registers, tag renders as nothing).
app.use("/embed/*", cors());
app.use(
  "/embed/*",
  serveStatic({ root: "../widget/dist-embed", rewriteRequestPath: (p) => p.replace(/^\/embed/, "") }),
);

// Local-only preview page (not what ClubDesk embeds) for sanity-checking the
// widget against this backend without touching ClubDesk at all.
app.use("/*", serveStatic({ root: "../widget/dist" }));

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`nuliga-mfe server listening on http://localhost:${info.port} (mode=${config.mode})`);
});
