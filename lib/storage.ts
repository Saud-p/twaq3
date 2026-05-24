import type { MatchOutcome } from './matches';

export type UserStatus = 'pending' | 'approved' | 'rejected';

export type StoredUser = {
  id: string;
  name: string;
  phone: string;
  password: string;
  points: number;
  status: UserStatus;
};

export type UserPrediction = {
  matchId: string;
  prediction: MatchOutcome;
  scored: boolean;
};

export type MatchResult = {
  matchId: string;
  result: MatchOutcome;
};

const USERS_KEY   = 'twaq3_users';
const RESULTS_KEY = 'twaq3_results';
const SESSION_KEY = 'twaq3_session';
const predsKey    = (uid: string) => `twaq3_preds_${uid}`;

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type Session = { userId: string; expiresAt: number };

export function saveSession(userId: string) {
  save(SESSION_KEY, { userId, expiresAt: Date.now() + ONE_YEAR_MS });
}

export function loadSession(): StoredUser | null {
  const session = load<Session | null>(SESSION_KEY, null);
  if (!session) return null;
  if (Date.now() > session.expiresAt) { clearSession(); return null; }
  const users = getAllUsers();
  const user  = users.find((u) => u.id === session.userId);
  if (!user) return null;
  if (user.status === 'rejected') { clearSession(); return null; }
  if (user.status !== 'approved') return null; // pending — keep session, just don't log in yet
  return user;
}

export function clearSession() {
  if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY);
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}
function save(key: string, val: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(val));
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
  const users = getAllUsers();
  const user = users.find((u) => u.phone === phone && u.password === password);
  if (!user) return null;
  if (user.status === 'pending') return 'pending';
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

/* ── Predictions ── */

export function getUserPredictions(uid: string): UserPrediction[] {
  return load<UserPrediction[]>(predsKey(uid), []);
}

export function saveUserPredictions(uid: string, preds: UserPrediction[]) {
  save(predsKey(uid), preds);
}

/* ── Match Results ── */

export function getMatchResults(): MatchResult[] {
  return load<MatchResult[]>(RESULTS_KEY, []);
}

export function setMatchResult(matchId: string, result: MatchOutcome) {
  const results = getMatchResults().filter((r) => r.matchId !== matchId);
  save(RESULTS_KEY, [...results, { matchId, result }]);
}

export function clearMatchResult(matchId: string) {
  save(RESULTS_KEY, getMatchResults().filter((r) => r.matchId !== matchId));
}

/* ── Points Recalculation (called by admin after setting results) ── */

export function recalculateAllPoints() {
  const users  = getAllUsers();
  const results = getMatchResults();

  const updated = users.map((u) => {
    const preds = getUserPredictions(u.id);
    saveUserPredictions(u.id, preds.map((p) => ({
      ...p, scored: results.some((r) => r.matchId === p.matchId),
    })));
    const points = preds.reduce((sum, p) => {
      const r = results.find((r) => r.matchId === p.matchId);
      return r && p.prediction === r.result ? sum + 1 : sum;
    }, 0);
    return { ...u, points };
  });

  save(USERS_KEY, updated);
}
