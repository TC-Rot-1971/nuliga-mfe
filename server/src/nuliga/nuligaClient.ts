import type { Config } from "../config.js";
import type {
  NuligaMeetingsResponse,
  NuligaTableResponse,
  NuligaTeamsResponse,
  NuligaTokenResponse,
} from "./types.js";

export interface NuligaClient {
  getTeams(): Promise<NuligaTeamsResponse>;
  getTable(teamId: number): Promise<NuligaTableResponse>;
  getMeetings(fromDate: string, toDate: string): Promise<NuligaMeetingsResponse>;
}

/**
 * OAuth2 client-credentials flow + resource calls against nuPortalRS, modeled on
 * the working reference implementation at github.com/mmikulan/nuliga-club-php.
 * UNVERIFIED against a live token — the association hasn't granted credentials yet.
 * Re-check field names/paths against the real response the moment access exists.
 */
export class LiveNuligaClient implements NuligaClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: Config) {
    if (!config.host || !config.clientId || !config.clientSecret) {
      throw new Error("LiveNuligaClient requires host, clientId and clientSecret");
    }
  }

  private async authenticate(grantType: "client_credentials" | "refresh_token"): Promise<void> {
    const body = new URLSearchParams({
      grant_type: grantType,
      client_id: this.config.clientId!,
      client_secret: this.config.clientSecret!,
      scope: "nuPortalRS_club",
    });
    if (grantType === "refresh_token") {
      if (!this.refreshToken) throw new Error("No refresh token available");
      body.set("refresh_token", this.refreshToken);
    }

    const res = await fetch(`${this.config.host}/rs/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      throw new Error(`nuPortalRS auth failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as NuligaTokenResponse;
    this.accessToken = json.access_token;
    this.refreshToken = json.refresh_token;
    this.tokenExpiresAt = Date.now() + (json.expires_in ?? 300) * 1000 - 10_000;
  }

  private async ensureToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return;
    await this.authenticate(this.refreshToken ? "refresh_token" : "client_credentials");
  }

  private async request<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    await this.ensureToken();
    const url = new URL(`${this.config.host}/rs${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    let res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}`, Accept: "application/json" },
    });

    if (res.status === 401) {
      await this.authenticate("refresh_token");
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}`, Accept: "application/json" },
      });
    }

    if (!res.ok) {
      throw new Error(`nuPortalRS request failed (${path}): ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  getTeams(): Promise<NuligaTeamsResponse> {
    return this.request<NuligaTeamsResponse>(
      `/2014/federations/${this.config.federation}/clubs/${this.config.clubNr}/teams`,
    );
  }

  getTable(teamId: number): Promise<NuligaTableResponse> {
    return this.request<NuligaTableResponse>(
      `/2014/federations/${this.config.federation}/clubs/${this.config.clubNr}/teams/${teamId}/table`,
    );
  }

  getMeetings(fromDate: string, toDate: string): Promise<NuligaMeetingsResponse> {
    return this.request<NuligaMeetingsResponse>(
      `/2014/federations/${this.config.federation}/clubs/${this.config.clubNr}/meetings`,
      // 500 matches the reference client's full-season fetch (getspielplan.php);
      // aggregate.ts now requests a full calendar year, not just ±30 days.
      { fromDate, toDate, maxResults: 500 },
    );
  }
}

export async function createNuligaClient(config: Config): Promise<NuligaClient> {
  if (config.mode === "live") {
    return new LiveNuligaClient(config);
  }
  const { MockNuligaClient } = await import("./mockClient.js");
  return new MockNuligaClient();
}
