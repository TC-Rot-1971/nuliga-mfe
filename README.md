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
Until that's granted, the backend runs in **mock mode**, serving realistic fixture data
modeled on TC Rot 1971's actual public team list (Sommer 2026: Herren 30/40/60/70,
Herren, Junioren U15, U18 gemischt).

The nuPortalRS request/response shapes used here (`server/src/nuliga/types.ts`) were
reverse-engineered from a working reference client
([`mmikulan/nuliga-club-php`](https://github.com/mmikulan/nuliga-club-php)), not from
official nu-gmbh documentation — treat field names as best-effort until verified
against a real token.

## Project layout

```
server/   Hono backend: nuPortalRS client (mock + live), aggregates
          teams+table+schedule into one JSON payload, serves /api/team-overview
widget/   Vanilla web component (<nuliga-team-widget>), built with Vite into:
            dist-embed/nuliga-team-widget.js  the actual ClubDesk embed script
            dist/                             a local-only preview page (not for ClubDesk)
```

## Development

This machine doesn't have Node installed globally — use the pinned `shell.nix`:

```sh
nix-shell --run "npm install"
nix-shell --run "npm run build"        # builds server + widget
nix-shell --run "npm run typecheck"

# run the backend (serves API + the built widget on one origin, mock mode by default)
cd server && nix-shell --run "npm run dev"   # http://localhost:8787

# widget dev server with hot reload (proxies /api to :8787)
cd widget && nix-shell --run "npm run dev"
```

`GET /api/team-overview` returns the aggregated club/team JSON. `GET /embed/nuliga-team-widget.js`
serves the embeddable custom element script (CORS-enabled, since it's loaded cross-origin
from ClubDesk). `GET /` serves a local-only preview page — useful for sanity-checking
changes without touching ClubDesk, but it's not what gets embedded there.

## Switching to live nuliga data

Copy `server/.env.example` to `server/.env` and fill in what BAD provides:

```
NULIGA_MODE=live
NULIGA_HOST=https://<verband>-portal.liga.nu   # exact host given by BAD
NULIGA_CLIENT_ID=...
NULIGA_CLIENT_SECRET=...
```

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

Once you have credentials, set the env vars above and flip `NULIGA_MODE` to `live` —
no other code changes should be needed if BAD's response shapes match the reference
implementation.

## Embedding in ClubDesk

Deploy this project somewhere reachable over HTTPS (small VM, or a serverless host —
the backend is a plain Hono app). Then, on the ClubDesk page that should show the
teams:

1. **Edit → Seiten-Optionen → HEAD-Start**, add:
   ```html
   <script type="module" src="https://YOUR-DEPLOYMENT/embed/nuliga-team-widget.js"></script>
   ```
2. In the page body, add an **"Externe Inhalte"** block (or wherever ClubDesk lets you
   drop raw HTML) containing:
   ```html
   <nuliga-team-widget api-base="https://YOUR-DEPLOYMENT/api/team-overview"></nuliga-team-widget>
   ```

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

Both the script and the API are served with permissive CORS since they're loaded
cross-origin from ClubDesk's domain — tighten `cors()` in `server/src/index.ts` to an
allowlist of your actual ClubDesk domain(s) before going live if you want to lock that
down.
