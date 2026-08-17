import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadConfig } from "../src/config.js";
import { buildClubOverview } from "../src/nuliga/aggregate.js";
import { MockNuligaClient } from "../src/nuliga/mockClient.js";

// Produces a static snapshot of the mock club overview so the widget's demo
// page can run with zero backend — what gets published to GitHub Pages.
// Real ClubDesk embeds still point api-base at a live backend; this file is
// only for the bundled demo/preview.
async function main() {
  const config = loadConfig({ ...process.env, NULIGA_MODE: "mock" });
  const overview = await buildClubOverview(new MockNuligaClient(), config);

  const outPath = resolve(import.meta.dirname, "../../widget/public/team-overview.json");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(overview, null, 2));
  console.log(`Wrote ${outPath}`);
}

main();
