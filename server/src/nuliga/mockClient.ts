import teamsFixture from "./fixtures/teams.json" with { type: "json" };
import tablesFixture from "./fixtures/tables.json" with { type: "json" };
import meetingsFixture from "./fixtures/meetings.json" with { type: "json" };
import type {
  NuligaClient,
} from "./nuligaClient.js";
import type {
  NuligaMeeting,
  NuligaMeetingsResponse,
  NuligaTableResponse,
  NuligaTeamsResponse,
} from "./types.js";

interface MeetingFixture extends Omit<NuligaMeeting, "scheduled" | "originalDate"> {
  dayOffset: number;
}

function resolveScheduled(dayOffset: number): string {
  const d = new Date();
  d.setUTCHours(17, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d.toISOString();
}

export class MockNuligaClient implements NuligaClient {
  async getTeams(): Promise<NuligaTeamsResponse> {
    return teamsFixture as NuligaTeamsResponse;
  }

  async getTable(teamId: number): Promise<NuligaTableResponse> {
    const tables = tablesFixture as Record<string, NuligaTableResponse>;
    const table = tables[String(teamId)];
    if (!table) return { groupTable: [] };
    return table;
  }

  async getMeetings(): Promise<NuligaMeetingsResponse> {
    const fixtures = meetingsFixture as MeetingFixture[];
    const meetingAbbr: NuligaMeeting[] = fixtures.map(({ dayOffset, ...rest }) => ({
      ...rest,
      scheduled: resolveScheduled(dayOffset),
      originalDate: null,
    }));
    return { meetings: { meetingAbbr } };
  }
}
