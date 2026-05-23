export type MatchPrediction = {
  id: string;
  home: string;
  away: string;
  date: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type User = {
  id: string;
  phone: string;
  rank: number;
  points: number;
};

export const upcomingMatches: MatchPrediction[] = [
  { id: '1', home: 'الهلال', away: 'الاتحاد', date: '2026-05-25', homeScore: null, awayScore: null },
  { id: '2', home: 'النصر', away: 'الشباب', date: '2026-05-26', homeScore: null, awayScore: null },
  { id: '3', home: 'الأهلي', away: 'الرائد', date: '2026-05-27', homeScore: null, awayScore: null },
  { id: '4', home: 'الفتح', away: 'الفيصلي', date: '2026-05-28', homeScore: null, awayScore: null },
  { id: '5', home: 'الشعلة', away: 'ضمك', date: '2026-05-29', homeScore: null, awayScore: null },
];

export const initialLeaderboard: User[] = [
  { id: 'u1', phone: '0501234567', rank: 1, points: 98 },
  { id: 'u2', phone: '0559876543', rank: 2, points: 89 },
  { id: 'u3', phone: '0591112223', rank: 3, points: 84 },
];

export async function getUpcomingMatches(): Promise<MatchPrediction[]> {
  return upcomingMatches;
}
