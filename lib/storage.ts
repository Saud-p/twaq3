import type { MatchOutcome } from './matches';

export type UserStatus = 'pending' | 'approved' | 'rejected';

export type StoredUser = {
  id: string; name: string; phone: string;
  password: string; points: number; status: UserStatus;
};

export type UserPrediction = {
  matchId: string; prediction: MatchOutcome; scored: boolean;
};

export type MatchResult = {
  matchId: string; result: MatchOutcome;
};

export type Competition = {
  id: string;      // TheSportsDB league ID
  name: string;
  country: string;
  badge: string;
  active: boolean;
};

const USERS_KEY   = 'twaq3_users';
const SESSION_KEY = 'twaq3_session';
const COMPS_KEY   = 'twaq3_competitions';
const resultsKey  = (lid: string) => `twaq3_r_${lid}`;
const predsKey    = (uid: string, lid: string) => `twaq3_p_${uid}_${lid}`;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type Session = { userId: string; expiresAt: number };

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

function save(key: string, val: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(val));
}

/* ── Session ── */
export function saveSession(userId: string) {
  save(SESSION_KEY, { userId, expiresAt: Date.now() + ONE_YEAR_MS });
}

export function loadSession(): StoredUser | null {
  const session = load<Session | null>(SESSION_KEY, null);
  if (!session) return null;
  if (Date.now() > session.expiresAt) { clearSession(); return null; }
  const user = getAllUsers().find((u) => u.id === session.userId);
  if (!user) return null;
  if (user.status === 'rejected') { clearSession(); return null; }
  if (user.status !== 'approved') return null;
  return user;
}

export function clearSession() {
  if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY);
}

/* ── Users ── */
export function getAllUsers(): StoredUser[] {
  return load<StoredUser[]>(USERS_KEY, []);
}

export function registerUser(name: string, phone: string, password: string): StoredUser | 'exists' {
  const users = getAllUsers();
  if (users.some((u) => u.phone === phone)) return 'exists';
  const user: StoredUser = {
    id: `u${Date.now()}`, name: name.trim(), phone, password, points: 0, status: 'pending',
  };
  save(USERS_KEY, [...users, user]);
  return user;
}

export function loginUser(phone: string, password: string): StoredUser | 'pending' | 'rejected' | null {
  const user = getAllUsers().find((u) => u.phone === phone && u.password === password);
  if (!user) return null;
  if (user.status === 'pending')  return 'pending';
  if (user.status === 'rejected') return 'rejected';
  return user;
}

export function approveUser(uid: string) {
  save(USERS_KEY, getAllUsers().map((u) => u.id === uid ? { ...u, status: 'approved' as UserStatus } : u));
}

export function rejectUser(uid: string) {
  save(USERS_KEY, getAllUsers().map((u) => u.id === uid ? { ...u, status: 'rejected' as UserStatus } : u));
}

export function getLeaderboard(): StoredUser[] {
  return getAllUsers().filter((u) => u.status === 'approved').sort((a, b) => b.points - a.points);
}

/* ── Competitions ── */
export function getCompetitions(): Competition[] {
  return load<Competition[]>(COMPS_KEY, []);
}

export function getActiveCompetitions(): Competition[] {
  return getCompetitions().filter((c) => c.active);
}

export function addCompetition(comp: Competition) {
  const existing = getCompetitions();
  if (existing.find((c) => c.id === comp.id)) {
    save(COMPS_KEY, existing.map((c) => c.id === comp.id ? { ...comp, active: true } : c));
  } else {
    save(COMPS_KEY, [...existing, { ...comp, active: true }]);
  }
}

export function removeCompetition(id: string) {
  save(COMPS_KEY, getCompetitions().filter((c) => c.id !== id));
}

export function setCompetitionActive(id: string, active: boolean) {
  save(COMPS_KEY, getCompetitions().map((c) => c.id === id ? { ...c, active } : c));
}

/* ── Match Results (per competition) ── */
export function getMatchResults(leagueId: string): MatchResult[] {
  return load<MatchResult[]>(resultsKey(leagueId), []);
}

export function setMatchResult(leagueId: string, matchId: string, result: MatchOutcome) {
  const rest = getMatchResults(leagueId).filter((r) => r.matchId !== matchId);
  save(resultsKey(leagueId), [...rest, { matchId, result }]);
}

export function clearMatchResult(leagueId: string, matchId: string) {
  save(resultsKey(leagueId), getMatchResults(leagueId).filter((r) => r.matchId !== matchId));
}

/* ── Predictions (per user, per competition) ── */
export function getUserPredictions(uid: string, leagueId: string): UserPrediction[] {
  return load<UserPrediction[]>(predsKey(uid, leagueId), []);
}

export function saveUserPredictions(uid: string, leagueId: string, preds: UserPrediction[]) {
  save(predsKey(uid, leagueId), preds);
}

/* ── Points ── */
export function recalculateUserPoints(uid: string): StoredUser | null {
  const users = getAllUsers();
  const user  = users.find((u) => u.id === uid);
  if (!user) return null;
  const points = getActiveCompetitions().reduce((total, comp) => {
    const preds   = getUserPredictions(uid, comp.id);
    const results = getMatchResults(comp.id);
    return total + preds.reduce((sum, p) => {
      const r = results.find((r) => r.matchId === p.matchId);
      return r && p.prediction === r.result ? sum + 1 : sum;
    }, 0);
  }, 0);
  const updated = { ...user, points };
  save(USERS_KEY, users.map((u) => u.id === uid ? updated : u));
  return updated;
}

export function recalculateAllPoints() {
  const competitions = getActiveCompetitions();
  save(USERS_KEY, getAllUsers().map((u) => {
    const points = competitions.reduce((total, comp) => {
      const preds   = getUserPredictions(u.id, comp.id);
      const results = getMatchResults(comp.id);
      return total + preds.reduce((sum, p) => {
        const r = results.find((r) => r.matchId === p.matchId);
        return r && p.prediction === r.result ? sum + 1 : sum;
      }, 0);
    }, 0);
    return { ...u, points };
  }));
}
