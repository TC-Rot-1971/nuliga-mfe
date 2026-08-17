import type { Config } from "../config.js";
import type { NuligaClient } from "./nuligaClient.js";
import type { ClubOverview, NuligaMeeting, TeamOverview } from "./types.js";

function involvesTeam(meeting: NuligaMeeting, teamId: number): boolean {
  return meeting.teamHomeId === teamId || meeting.teamGuestId === teamId;
}

export async function buildClubOverview(
  client: NuligaClient,
  config: Config,
): Promise<ClubOverview> {
  const teamsResponse = await client.getTeams();

  // Take the most recently listed season rather than string-matching a computed
  // "current season" label — real season-name formatting from your association
  // (nuPortalRS payload shape can vary slightly per federation) is unverified.
  const currentSeason = teamsResponse.teamSeason.at(-1);
  const rawTeams = (currentSeason?.teamChampionship ?? []).flatMap((champ) =>
    champ.team.map((team) => ({
      teamId: team.teamId,
      klasse: team.name,
      group: team.group,
      championship: champ.championship.name,
    })),
  );

  const now = new Date();
  // Full current calendar year, not just a window around today: this is what
  // lets each team's card show its complete season (played + upcoming), not
  // only the single next/last match.
  const fromDate = `${now.getFullYear()}-01-01`;
  const toDate = `${now.getFullYear()}-12-31`;
  const meetingsResponse = await client.getMeetings(fromDate, toDate);
  const meetings = meetingsResponse.meetings.meetingAbbr;

  const teams: TeamOverview[] = await Promise.all(
    rawTeams.map(async (team): Promise<TeamOverview> => {
      const tableResponse = await client.getTable(team.teamId);
      const group = tableResponse.groupTable.find((g) =>
        g.groupTableTeam.some((t) => t.teamId === team.teamId),
      );
      const entry = group?.groupTableTeam.find((t) => t.teamId === team.teamId);

      const teamMeetings = meetings
        .filter((m) => involvesTeam(m, team.teamId))
        .sort((a, b) => new Date(a.scheduled).getTime() - new Date(b.scheduled).getTime());

      const lastResult =
        teamMeetings
          .filter((m) => m.isCompleted)
          .at(-1) ?? null;
      const nextMatch =
        teamMeetings.find((m) => !m.isCompleted && new Date(m.scheduled) >= now) ?? null;

      return {
        teamId: team.teamId,
        klasse: team.klasse,
        group: team.group,
        championship: team.championship,
        table: group && entry
          ? {
              group: group.group,
              rank: entry.tableRank,
              meetings: entry.meetings,
              ownPoints: entry.ownPoints,
              otherPoints: entry.otherPoints,
            }
          : null,
        lastResult,
        nextMatch,
        results: teamMeetings,
      };
    }),
  );

  return {
    clubNr: config.clubNr,
    clubName: config.clubName,
    federation: config.federation,
    season: currentSeason?.season.name ?? "unknown",
    generatedAt: new Date().toISOString(),
    source: config.mode,
    teams,
  };
}
