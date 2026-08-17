# nuliga-mfe

A small micro-frontend that shows TC Rot 1971's tennis teams (league, table rank, next
match, last result) and can be embedded directly into the club's ClubDesk website as a
web component — no iframe.

## How the data works

There is no public nuliga API. The real data source is **nuPortalRS**, an official
OAuth2/REST API run by nu Datenautomaten GmbH (the company behind nuLiga) that
associations can grant clubs access to. It returns JSON for teams, league tables, and
match schedules/results — no HTML scraping involved. Player rosters / individual
rankings (LK) are not exposed by this API (club-scope credentials only cover team-level
competition data, presumably for GDPR reasons).

**Access has to be requested from Badischer Tennisverband (BAD)** for club 33232
(Tennisclub Rot 1971 e.V.). See [Requesting API access](#requesting-api-access) below.
Until that's granted, the pipeline runs in **mock mode**, publishing realistic fixture
data modeled on TC Rot 1971's actual public team list (Sommer 2026: Herren 30/40/60/70,
Herren, Junioren U15, U18 gemischt).

The nuPortalRS request/response shapes used here (`server/src/nuliga/types.ts`) were
reverse-engineered from a working reference client
([`mmikulan/nuliga-club-php`](https://github.com/mmikulan/nuliga-club-php)), not from
official nu-gmbh documentation — treat field names as best-effort until verified
against a real token.

## Architecture: no server in production

There is no deployed backend. A GitHub Actions job — **daily, plus on every push to
`main`** — does the entire "backend" job in one shot:

1. fetch the club overview from nuPortalRS (or mock fixtures, see below)
2. write it as a static `team-overview.json`
3. build the widget against that file
4. publish both to GitHub Pages

The nuPortalRS client secret lives only as a GitHub Actions secret, used for the few
seconds the job runs — it's never shipped to the browser or embedded in anything
published. Real ClubDesk embeds fetch `team-overview.json` straight from GitHub Pages,
refreshed once a day.

`server/` is a Node/TS package that holds the nuliga-fetching logic
(`src/nuliga/*`) and the CLI script that runs in CI (`scripts/generate-overview.ts`).
It also has an optional Hono HTTP server (`src/index.ts`) purely for local
development/debugging — it is **not** deployed anywhere.

## Project layout

```
server/   nuPortalRS client (mock + live) + aggregation logic, used by:
            scripts/generate-overview.ts  the CLI job CI runs daily (the real "backend")
            src/index.ts                  optional local-dev-only HTTP server
widget/   Vanilla web component (<nuliga-team-widget>), built with Vite into:
            dist-embed/nuliga-team-widget.js  the actual ClubDesk embed script
            dist/                             the GitHub Pages demo page, backend-free
```

## Development

This machine doesn't have Node installed globally — use the pinned `shell.nix`:

```sh
nix-shell --run "npm install"
nix-shell --run "npm run build"        # fetches mock data, builds server + widget
nix-shell --run "npm run typecheck"

# fetch/refresh the static data snapshot (mock by default, see below for live)
nix-shell --run "npm run generate-overview"

# widget dev server with hot reload, reading widget/public/team-overview.json
cd widget && nix-shell --run "npm run dev"

# optional: local-dev HTTP server exposing /api/team-overview for interactive
# testing against the live/mock client directly; not used in production
cd server && nix-shell --run "npm run dev"   # http://localhost:8787
```

`npm run generate-overview` writes `widget/public/team-overview.json`, which the
widget's demo page (`widget/index.html`) reads directly — so `widget/dist` after a
build is fully self-contained, no backend needed to preview it. This is exactly what
CI publishes to GitHub Pages.

## Enabling live nuliga data

Once Badischer Tennisverband issues credentials, set them as **repository secrets**
(Settings → Secrets and variables → Actions) — this is what the daily job uses:

- `NULIGA_HOST` — exact host given by BAD, pattern seen elsewhere:
  `https://<verband>-portal.liga.nu`
- `NULIGA_CLIENT_ID`
- `NULIGA_CLIENT_SECRET`

The workflow (`.github/workflows/deploy-pages.yml`) checks whether `NULIGA_CLIENT_ID`
is set and automatically switches from mock to live mode — no other change needed once
the secrets exist.

For local testing, copy `server/.env.example` to `server/.env` with the same values
and `NULIGA_MODE=live`, then run `npm run generate-overview`.

`server/src/nuliga/nuligaClient.ts` (`LiveNuligaClient`) has never been run against a
real token — validate the response shapes the moment credentials exist and adjust
`types.ts`/`aggregate.ts` if BAD's actual payload differs from the reference client.

## Requesting API access

Send this to Badischer Tennisverband (contact via badischer-tennisverband.de):

> Betreff: nuPortalRS-Zugang für Tennisclub Rot 1971 e.V. (Vereinsnummer 33232)
>
> Wir möchten für unsere Vereinswebsite eine Übersicht unserer Mannschaften
> (Tabellenstand, nächste Spiele, letzte Ergebnisse) automatisiert aus nuLiga
> anzeigen und bitten um Freischaltung des nuPortalRS-Zugangs (OAuth2, Scope
> "club") für den Tennisclub Rot 1971 e.V., Vereinsnummer 33232. Bitte teilen
> Sie uns den zuständigen nuPortalRS-Host sowie Client-ID/Client-Secret mit.

## Embedding in ClubDesk

On the ClubDesk page that should show the teams:

1. **Edit → Seiten-Optionen → HEAD-Start**, add:
   ```html
   <script type="module" src="https://TC-Rot-1971.github.io/nuliga-mfe/nuliga-team-widget.js"></script>
   ```
2. In the page body, add an **"Externe Inhalte"** block (or wherever ClubDesk lets you
   drop raw HTML) containing:
   ```html
   <nuliga-team-widget api-base="https://TC-Rot-1971.github.io/nuliga-mfe/team-overview.json"></nuliga-team-widget>
   ```

That's it — both URLs are published by CI and refresh daily on their own; there's
nothing else to deploy or keep running.

This is the same pattern other clubs use to embed nuliga tables via community widgets
(e.g. `nutab`) on ClubDesk sites — a per-page script plus a custom element/div, not an
iframe.

The element renders into **light DOM, not a shadow root**, so it picks up the club's
own theme (fonts, text color, link color, background — whatever is defined in
ClubDesk's `page.css` / "Design anpassen") instead of looking visually foreign. It only
carries its own CSS for things the page can't reasonably provide: the card grid layout
and card borders (`.nuliga-widget`, `.nuliga-card`, `.nuliga-grid`, etc. in
`widget/src/nuliga-team-widget.ts`). If you want to restyle the cards further, target
those class names from ClubDesk's own CSS editor — no changes needed on this side.

The embed script is served with permissive CORS (it's loaded cross-origin from
ClubDesk's domain, and module scripts are always CORS-fetched) — GitHub Pages sets
`Access-Control-Allow-Origin: *` for everything it serves, so this needs no
configuration.

## GitHub Pages / CI

`.github/workflows/deploy-pages.yml` runs on push to `main`, daily at ~05:00 UTC, and
manually via "Run workflow". Each run: picks live vs mock mode, fetches the overview,
builds the widget, and deploys to Pages via `actions/deploy-pages` — no `gh-pages`
branch, no long-lived secrets outside the job. One-time repo setup: **Settings → Pages
→ Source: GitHub Actions** (already done for this repo).

Published URLs:
- Demo page: `https://TC-Rot-1971.github.io/nuliga-mfe/`
- Embed script: `https://TC-Rot-1971.github.io/nuliga-mfe/nuliga-team-widget.js`
- Data: `https://TC-Rot-1971.github.io/nuliga-mfe/team-overview.json`
