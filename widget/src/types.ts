export interface Meeting {
  scheduled: string;
  teamHome: string;
  teamGuest: string;
  teamHomeId: number;
  teamGuestId: number;
  matchesHome: number | null;
  matchesGuest: number | null;
  courtHallNumbers: string;
  isCompleted: boolean;
}

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
  lastResult: Meeting | null;
  nextMatch: Meeting | null;
  /** Full current-year match list (played + upcoming), chronological. */
  results: Meeting[];
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
