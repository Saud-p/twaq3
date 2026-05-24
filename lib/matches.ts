export type MatchOutcome = 'home' | 'draw' | 'away';

export type Match = {
  id:   string;
  home: string;
  away: string;
  date: string;
  time?: string; // وقت UTC من TheSportsDB أو فارغ للمباريات اليدوية
};
