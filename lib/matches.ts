export type MatchOutcome = 'home' | 'draw' | 'away';

export type Match = {
  id: string;
  home: string;
  away: string;
  date: string;
  result: MatchOutcome | null; // null = لم تنته بعد
};

export const upcomingMatches: Match[] = [
  { id: '1', home: 'الهلال',  away: 'الاتحاد',  date: '2026-05-25', result: null },
  { id: '2', home: 'النصر',   away: 'الشباب',   date: '2026-05-26', result: null },
  { id: '3', home: 'الأهلي',  away: 'الرائد',   date: '2026-05-27', result: null },
  { id: '4', home: 'الفتح',   away: 'الفيصلي', date: '2026-05-28', result: null },
  { id: '5', home: 'الشعلة', away: 'ضمك',      date: '2026-05-29', result: null },
];
