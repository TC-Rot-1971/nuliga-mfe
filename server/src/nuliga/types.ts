/**
 * Shapes below are reverse-engineered from the working reference client
 * https://github.com/mmikulan/nuliga-club-php (a real nuPortalRS consumer),
 * not from official nu-gmbh documentation. Treat field names as best-effort
 * until verified against a live token from the association.
 */

export interface NuligaTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface NuligaTeamsResponse {
  teamSeason: Array<{
    season: { name: string };
    teamChampionship: Array<{
      championship: { name: string };
      team: Array<{
        teamId: number;
        name: string;
        group: string;
        contestTypeNickname: string;
      }>;
    }>;
  }>;
}

export interface NuligaTableResponse {
  groupTable: Array<{
    group: string;
    groupTableTeam: Array<{
      teamId: number;
      team: string;
      tableRank: number;
      meetings: number;
      ownPoints: number;
      otherPoints: number;
      ownMatches: number;
      otherMatches: number;
    }>;
  }>;
}

export interface NuligaMeetingsResponse {
  meetings: {
    meetingAbbr: NuligaMeeting[];
  };
}

export interface NuligaMeeting {
  meetingId: number;
  groupId: number;
  scheduled: string;
  originalDate: string | null;
  leagueNickname: string;
  courtHallNumbers: string;
  teamHome: string;
  teamGuest: string;
  teamHomeClubNr: string;
  teamHomeId: number;
  teamGuestId: number;
  matchesHome: number | null;
  matchesGuest: number | null;
  isCompleted: boolean;
}

/** Flattened, widget-facing shape produced by the aggregate route. */
export interface TeamOverview {
  teamId: number;
  klasse: string;
  group: string;
  championship: string;
  table: {
    group: string;
    rank: number;
    meetings: number;
    ownPoints: number;
    otherPoints: number;
  } | null;
  lastResult: NuligaMeeting | null;
  nextMatch: NuligaMeeting | null;
}

export interface ClubOverview {
  clubNr: string;
  clubName: string;
  federation: string;
  season: string;
  generatedAt: string;
  source: "live" | "mock";
  teams: TeamOverview[];
}
