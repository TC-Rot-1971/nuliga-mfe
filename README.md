# nuliga-mfe

A small micro-frontend that shows a tennis club's teams (league, table rank, next
match, last result) and can be embedded directly into a ClubDesk website as a web
component — no iframe.

This repo is configured for one specific club via GitHub repo Variables/Secrets (see
[Forking this for another club](#forking-this-for-another-club)) — nothing club-specific
is hardcoded in the source.

## How the data works

There is no public nuliga API. The real data source is **nuPortalRS**, an official
OAuth2/REST API run by nu Datenautomaten GmbH (the company behind nuLiga) that
associations can grant clubs access to. It returns JSON for teams, league tables, and
match schedules/results — no HTML scraping involved. Player rosters / individual
rankings (LK) are not exposed by this API (club-scope credentials only cover team-level
competition data, presumably for GDPR reasons).

**Access has to be requested from your club's regional tennis association** (see
[Requesting API access](#requesting-api-access) below). Until that's granted, the
pipeline runs in **mock mode**, publishing placeholder fixture data (a fictional
"Musterverein" with a handful of example teams) so everything — build, demo, ClubDesk
embed — works end to end before real credentials exist.

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

By default (no env vars / repo variables set), the club identity is a placeholder —
federation `DEMO`, club number `00000`, name `Musterverein` — so the project runs
out of the box without being configured for any real club yet.

## Configuring your club's identity

Three values identify your club to nuliga, used in both mock and live mode (mock mode
uses them only for labeling — the fixture *data* is placeholder either way; live mode
uses them to build the actual API request):

- `NULIGA_FEDERATION` — the short code nuliga uses for your regional association
  (e.g. `BAD` for Badischer Tennisverband, `WTB` for Württembergischer Tennis-Bund).
  Check the `federation=` query param on your association's nuliga URLs.
- `NULIGA_CLUB_NR` — your club's nuliga "Vereinsnummer", visible in the URL of your
  club's team-list page (`.../clubTeams?club=12345` → `12345`). Findable via your
  association's nuliga "Vereinssuche" (club search).
- `NULIGA_CLUB_NAME` — display name only, used in the widget header.

Locally: copy `server/.env.example` to `server/.env` and fill these in. In CI: set
them as **repository variables** (Settings → Secrets and variables → Actions →
Variables tab) — the workflow reads them from there, no code change needed.

## Enabling live nuliga data

Once your association issues nuPortalRS credentials, set them as **repository
secrets** (Settings → Secrets and variables → Actions → Secrets tab) — this is what
the daily job uses:

- `NULIGA_HOST` — exact host given by your association, pattern seen elsewhere:
  `https://<verband>-portal.liga.nu`
- `NULIGA_CLIENT_ID`
- `NULIGA_CLIENT_SECRET`

The workflow (`.github/workflows/deploy-pages.yml`) checks whether `NULIGA_CLIENT_ID`
is set and automatically switches from mock to live mode — no other change needed once
the secrets exist.

For local testing, add the same values plus `NULIGA_MODE=live` to `server/.env`, then
run `npm run generate-overview`.

`server/src/nuliga/nuligaClient.ts` (`LiveNuligaClient`) has never been run against a
real token — validate the response shapes the moment credentials exist and adjust
`types.ts`/`aggregate.ts` if your association's actual payload differs from the
reference client.

## Requesting API access

Send something like this to your regional tennis association (contact details are
usually on their nuliga portal or main website):

> Betreff: nuPortalRS-Zugang für \<Vereinsname\> (Vereinsnummer \<Vereinsnummer\>)
>
> Wir möchten für unsere Vereinswebsite eine Übersicht unserer Mannschaften
> (Tabellenstand, nächste Spiele, letzte Ergebnisse) automatisiert aus nuLiga
> anzeigen und bitten um Freischaltung des nuPortalRS-Zugangs (OAuth2, Scope
> "club") für \<Vereinsname\>, Vereinsnummer \<Vereinsnummer\>. Bitte teilen Sie
> uns den zuständigen nuPortalRS-Host sowie Client-ID/Client-Secret mit.

## Embedding in ClubDesk

On the ClubDesk page that should show the teams (replace `YOUR-GH-USER`/`YOUR-REPO`
with wherever you deployed this — see [Published URLs](#github-pages--ci) below):

1. **Edit → Seiten-Optionen → HEAD-Start**, add:
   ```html
   <script type="module" src="https://YOUR-GH-USER.github.io/YOUR-REPO/nuliga-team-widget.js"></script>
   ```
2. In the page body, add an **"Externe Inhalte"** block (or wherever ClubDesk lets you
   drop raw HTML) containing:
   ```html
   <nuliga-team-widget api-base="https://YOUR-GH-USER.github.io/YOUR-REPO/team-overview.json"></nuliga-team-widget>
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
→ Source: GitHub Actions**.

Published URLs (substitute your GitHub username/org and repo name):
- Demo page: `https://YOUR-GH-USER.github.io/YOUR-REPO/`
- Embed script: `https://YOUR-GH-USER.github.io/YOUR-REPO/nuliga-team-widget.js`
- Data: `https://YOUR-GH-USER.github.io/YOUR-REPO/team-overview.json`

## Forking this for another club

Everything club-specific lives in GitHub repo Variables/Secrets, not in code — so
reusing this for a different club is configuration, not editing.

1. **Fork the repo** on GitHub.
2. **Find your club's nuliga identity**: your association's nuliga federation code
   and your club's Vereinsnummer — see
   [Configuring your club's identity](#configuring-your-clubs-identity) above for how
   to look these up.
3. **Set repo variables**: Settings → Secrets and variables → Actions → Variables tab
   → add `NULIGA_FEDERATION`, `NULIGA_CLUB_NR`, `NULIGA_CLUB_NAME`.
4. **Enable GitHub Pages**: Settings → Pages → Source: **GitHub Actions**. (Or via CLI:
   `gh api -X POST repos/<you>/<your-fork>/pages -f build_type=workflow`.)
5. **Trigger the first deploy**: push any commit, or go to the Actions tab → "Fetch
   nuliga data and deploy to GitHub Pages" → "Run workflow". It'll run in mock mode
   (placeholder "Musterverein" data) until you have real credentials — which is fine,
   it proves the whole pipeline works before you deal with your association.
6. **Update the two URLs** in your ClubDesk embed (see
   [Embedding in ClubDesk](#embedding-in-clubdesk)) to your fork's Pages URL.
7. **When ready for real data**: request nuPortalRS access from your association (see
   [Requesting API access](#requesting-api-access)), then add `NULIGA_HOST`,
   `NULIGA_CLIENT_ID`, `NULIGA_CLIENT_SECRET` as repo secrets. The next scheduled or
   manual run switches to live data automatically.

The mock fixtures (`server/src/nuliga/fixtures/*.json`) are generic placeholder data
(a "Musterverein" with a handful of made-up teams and opponents) — they're only there
so mock mode has something realistic-shaped to render. Feel free to edit them for a
nicer local demo, or just ignore them and wait for live data.
