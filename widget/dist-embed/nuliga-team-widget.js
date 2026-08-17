var d = Object.defineProperty;
var u = (e, a, t) => a in e ? d(e, a, { enumerable: !0, configurable: !0, writable: !0, value: t }) : e[a] = t;
var i = (e, a, t) => u(e, typeof a != "symbol" ? a + "" : a, t);
const s = "nuliga-widget-styles", g = `
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
function o() {
  if (document.getElementById(s)) return;
  const e = document.createElement("style");
  e.id = s, e.textContent = g, document.head.appendChild(e);
}
function l(e) {
  return new Date(e).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function c(e, a) {
  return e == null || a == null ? "–" : `${e}:${a}`;
}
function p(e) {
  const a = e.table ? `<div class="nuliga-row"><span class="nuliga-label">Tabelle</span><span class="nuliga-rank">Platz ${e.table.rank} (${e.table.ownPoints}:${e.table.otherPoints} Pkt.)</span></div>` : "", t = e.nextMatch ? `<div class="nuliga-row"><span class="nuliga-label">Nächstes Spiel</span><span>${l(e.nextMatch.scheduled)}: ${e.nextMatch.teamHome} – ${e.nextMatch.teamGuest}</span></div>` : '<div class="nuliga-row"><span class="nuliga-label">Nächstes Spiel</span><span>–</span></div>', n = e.lastResult ? `<div class="nuliga-row"><span class="nuliga-label">Letztes Ergebnis</span><span>${e.lastResult.teamHome} ${c(e.lastResult.matchesHome, e.lastResult.matchesGuest)} ${e.lastResult.teamGuest}</span></div>` : '<div class="nuliga-row"><span class="nuliga-label">Letztes Ergebnis</span><span>–</span></div>';
  return `
    <div class="nuliga-card">
      <h3>${e.klasse}</h3>
      <div class="nuliga-group">${e.group}</div>
      ${a}
      ${t}
      ${n}
    </div>
  `;
}
class r extends HTMLElement {
  connectedCallback() {
    o(), this.load();
  }
  renderStatus(a, t = !1) {
    this.innerHTML = `<div class="nuliga-widget"><div class="nuliga-status${t ? " nuliga-error" : ""}">${a}</div></div>`;
  }
  async load() {
    const a = this.getAttribute("api-base");
    if (!a) {
      this.renderStatus('Attribut "api-base" fehlt (absolute URL zum Backend erforderlich).', !0);
      return;
    }
    this.renderStatus("Lade Mannschaftsdaten…");
    try {
      const t = await fetch(a);
      if (!t.ok) throw new Error(`HTTP ${t.status}`);
      const n = await t.json();
      this.render(n);
    } catch (t) {
      this.renderStatus(`Daten konnten nicht geladen werden (${t.message}).`, !0);
    }
  }
  render(a) {
    const t = a.source === "mock" ? " – Beispieldaten" : "";
    this.innerHTML = `
      <div class="nuliga-widget">
        <h2>${a.clubName} – Mannschaften ${a.season}${t}</h2>
        <div class="nuliga-meta">Stand: ${l(a.generatedAt)}</div>
        <div class="nuliga-grid">
          ${a.teams.map(p).join("")}
        </div>
      </div>
    `;
  }
}
i(r, "observedAttributes", ["api-base"]);
customElements.define("nuliga-team-widget", r);
export {
  r as NuligaTeamWidget
};
