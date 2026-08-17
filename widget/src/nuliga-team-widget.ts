import type { ClubOverview, TeamOverview } from "./types.js";

const STYLE_ID = "nuliga-widget-styles";

// Structural rules only — no color, font-family or font-size beyond relative
// (em) sizing. Typography and colors are meant to fall through from the
// surrounding ClubDesk page (its page.css / "Design anpassen" theme), since
// this renders straight into the light DOM rather than a shadow root.
const STYLES = `
  .nuliga-widget { max-width: 960px; }
  .nuliga-widget h2 { margin: 0 0 0.75em; }
  .nuliga-widget .nuliga-meta { font-size: 0.8em; opacity: 0.75; margin-bottom: 1em; }
  .nuliga-widget .nuliga-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 0.75em;
  }
  .nuliga-widget .nuliga-card {
    border: 1px solid currentColor;
    border-radius: 8px;
    padding: 0.75em 1em;
  }
  .nuliga-widget .nuliga-card h3 { font-size: 1em; margin: 0 0 0.15em; }
  .nuliga-widget .nuliga-card .nuliga-group { font-size: 0.8em; opacity: 0.75; margin-bottom: 0.5em; }
  .nuliga-widget .nuliga-row { font-size: 0.9em; display: flex; justify-content: space-between; gap: 0.5em; padding: 0.15em 0; }
  .nuliga-widget .nuliga-row .nuliga-label { opacity: 0.75; }
  .nuliga-widget .nuliga-rank { font-weight: 600; }
  .nuliga-widget .nuliga-status { padding: 2em; text-align: center; opacity: 0.75; }
  .nuliga-widget .nuliga-status.nuliga-error { opacity: 1; color: #b3261e; }
`;

function ensureStylesInjected() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScore(home: number | null, guest: number | null): string {
  if (home == null || guest == null) return "–";
  return `${home}:${guest}`;
}

function renderTeamCard(team: TeamOverview): string {
  const rankLine = team.table
    ? `<div class="nuliga-row"><span class="nuliga-label">Tabelle</span><span class="nuliga-rank">Platz ${team.table.rank} (${team.table.ownPoints}:${team.table.otherPoints} Pkt.)</span></div>`
    : "";

  const nextLine = team.nextMatch
    ? `<div class="nuliga-row"><span class="nuliga-label">Nächstes Spiel</span><span>${formatDate(team.nextMatch.scheduled)}: ${team.nextMatch.teamHome} – ${team.nextMatch.teamGuest}</span></div>`
    : `<div class="nuliga-row"><span class="nuliga-label">Nächstes Spiel</span><span>–</span></div>`;

  const lastLine = team.lastResult
    ? `<div class="nuliga-row"><span class="nuliga-label">Letztes Ergebnis</span><span>${team.lastResult.teamHome} ${formatScore(team.lastResult.matchesHome, team.lastResult.matchesGuest)} ${team.lastResult.teamGuest}</span></div>`
    : `<div class="nuliga-row"><span class="nuliga-label">Letztes Ergebnis</span><span>–</span></div>`;

  return `
    <div class="nuliga-card">
      <h3>${team.klasse}</h3>
      <div class="nuliga-group">${team.group}</div>
      ${rankLine}
      ${nextLine}
      ${lastLine}
    </div>
  `;
}

export class NuligaTeamWidget extends HTMLElement {
  static observedAttributes = ["api-base"];

  connectedCallback() {
    ensureStylesInjected();
    this.load();
  }

  private renderStatus(message: string, isError = false) {
    this.innerHTML = `<div class="nuliga-widget"><div class="nuliga-status${isError ? " nuliga-error" : ""}">${message}</div></div>`;
  }

  private async load() {
    // No fallback default: this element is meant to run embedded on the
    // club's own domain (e.g. inside ClubDesk), where a relative path would
    // silently hit the wrong origin instead of our backend.
    const apiBase = this.getAttribute("api-base");
    if (!apiBase) {
      this.renderStatus('Attribut "api-base" fehlt (absolute URL zum Backend erforderlich).', true);
      return;
    }

    this.renderStatus("Lade Mannschaftsdaten…");
    try {
      const res = await fetch(apiBase);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ClubOverview;
      this.render(data);
    } catch (err) {
      this.renderStatus(`Daten konnten nicht geladen werden (${(err as Error).message}).`, true);
    }
  }

  private render(data: ClubOverview) {
    const sourceNote = data.source === "mock" ? " – Beispieldaten" : "";
    this.innerHTML = `
      <div class="nuliga-widget">
        <h2>${data.clubName} – Mannschaften ${data.season}${sourceNote}</h2>
        <div class="nuliga-meta">Stand: ${formatDate(data.generatedAt)}</div>
        <div class="nuliga-grid">
          ${data.teams.map(renderTeamCard).join("")}
        </div>
      </div>
    `;
  }
}

customElements.define("nuliga-team-widget", NuligaTeamWidget);
