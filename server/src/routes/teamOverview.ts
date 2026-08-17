import { Hono } from "hono";
import type { Config } from "../config.js";
import { memoize } from "../cache.js";
import { buildClubOverview } from "../nuliga/aggregate.js";
import { createNuligaClient } from "../nuliga/nuligaClient.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

export function teamOverviewRoute(config: Config) {
  const router = new Hono();

  const getOverview = memoize(CACHE_TTL_MS, async () => {
    const client = await createNuligaClient(config);
    return buildClubOverview(client, config);
  });

  router.get("/api/team-overview", async (c) => {
    try {
      const overview = await getOverview();
      c.header("Cache-Control", "public, max-age=60");
      return c.json(overview);
    } catch (err) {
      return c.json(
        { error: "Failed to load nuliga data", detail: (err as Error).message },
        502,
      );
    }
  });

  return router;
}
