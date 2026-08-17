export interface Config {
  mode: "mock" | "live";
  federation: string;
  clubNr: string;
  clubName: string;
  host?: string;
  clientId?: string;
  clientSecret?: string;
  port: number;
}

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mode = env.NULIGA_MODE === "live" ? "live" : "mock";

  const config: Config = {
    mode,
    // "||" on purpose, not "??": GitHub Actions turns an unset repo variable
    // into an empty string rather than leaving it undefined.
    federation: env.NULIGA_FEDERATION || "DEMO",
    clubNr: env.NULIGA_CLUB_NR || "00000",
    clubName: env.NULIGA_CLUB_NAME || "Musterverein",
    port: Number(env.PORT ?? 8787),
  };

  if (mode === "live") {
    config.host = required("NULIGA_HOST", env.NULIGA_HOST);
    config.clientId = required("NULIGA_CLIENT_ID", env.NULIGA_CLIENT_ID);
    config.clientSecret = required("NULIGA_CLIENT_SECRET", env.NULIGA_CLIENT_SECRET);
  }

  return config;
}
