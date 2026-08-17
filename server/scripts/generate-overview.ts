import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadConfig } from "../src/config.js";
import { buildClubOverview } from "../src/nuliga/aggregate.js";
import { createNuligaClient } from "../src/nuliga/nuligaClient.js";

// Fetches the club overview (live nuPortalRS if NULIGA_MODE=live and
// credentials are set, mock fixtures otherwise) and writes it as static JSON
// for the widget to consume with zero backend. This is the whole "backend"
// in production: a daily CI job runs this, rebuilds the widget, and
// redeploys to GitHub Pages — see .github/workflows/deploy-pages.yml.
async function main() {
  const config = loadConfig();
  const client = await createNuligaClient(config);
  const overview = await buildClubOverview(client, config);

  const outPath = resolve(import.meta.dirname, "../../widget/public/team-overview.json");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(overview, null, 2));
  console.log(`Wrote ${outPath} (source=${overview.source})`);
}

main();
