export interface Meeting {
  scheduled: string;
  teamHome: string;
  teamGuest: string;
  matchesHome: number | null;
  matchesGuest: number | null;
  courtHallNumbers: string;
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
