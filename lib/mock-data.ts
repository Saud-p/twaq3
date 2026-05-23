export type MatchPrediction = {
  id: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type User = {
  id: string;
  phone: string;
  rank: number;
  points: number;
};

export const initialMatches: MatchPrediction[] = [
  { id: '1', home: 'الهلال', away: 'الاتحاد', homeScore: null, awayScore: null },
  { id: '2', home: 'النصر', away: 'الشباب', homeScore: null, awayScore: null },
  { id: '3', home: 'الأهلي', away: 'الرائد', homeScore: null, awayScore: null },
  { id: '4', home: 'الفتح', away: 'الفيصلي', homeScore: null, awayScore: null },
  { id: '5', home: 'الشعلة', away: 'ضمك', homeScore: null, awayScore: null },
];

export const initialLeaderboard: User[] = [
  { id: 'u1', phone: '0501234567', rank: 1, points: 98 },
  { id: 'u2', phone: '0559876543', rank: 2, points: 89 },
  { id: 'u3', phone: '0591112223', rank: 3, points: 84 },
];
