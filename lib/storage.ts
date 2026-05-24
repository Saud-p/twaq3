import type { Match, MatchOutcome } from './matches';

export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

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
  id: string; name: string; country: string; badge: string; active: boolean;
};

/* ── KV helpers ── */
async function kvGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`/api/kv?key=${encodeURIComponent(key)}`);
    if (!res.ok) return fallback;
    const data = await res.json() as { value: T | null };
    return data.value ?? fallback;
  } catch { return fallback; }
}

async function kvSet(key: string, val: unknown): Promise<void> {
  try {
    await fetch(`/api/kv?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(val),
    });
  } catch { /* ignore */ }
}

/* ── Key names ── */
const USERS_KEY      = 'users';
const COMPS_KEY      = 'competitions';
const resultsKey     = (lid: string)               => `results:${lid}`;
const predsKey       = (uid: string, lid: string)  => `preds:${uid}:${lid}`;
const manualMatchKey = (lid: string)               => `manual:${lid}`;

/* ── Session (stays in localStorage — just the token) ── */
const SESSION_KEY = 'twaq3_session';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
type Session = { userId: string; expiresAt: number };

export function saveSession(userId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, expiresAt: Date.now() + ONE_YEAR_MS }));
}

export function getSessionUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { userId, expiresAt } = JSON.parse(raw) as Session;
    if (Date.now() > expiresAt) { clearSession(); return null; }
    return userId;
  } catch { return null; }
}

export function clearSession() {
  if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY);
}

export async function loadSession(): Promise<StoredUser | null> {
  const userId = getSessionUserId();
  if (!userId) return null;
  const users = await getAllUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  if (user.status === 'rejected' || user.status === 'suspended') { clearSession(); return null; }
  if (user.status !== 'approved') return null;
  return user;
}

/* ── Users ── */
export async function getAllUsers(): Promise<StoredUser[]> {
  return kvGet<StoredUser[]>(USERS_KEY, []);
}

export async function registerUser(name: string, phone: string, password: string): Promise<StoredUser | 'exists'> {
  const users = await getAllUsers();
  if (users.some((u) => u.phone === phone)) return 'exists';
  const user: StoredUser = {
    id: `u${Date.now()}`, name: name.trim(), phone, password, points: 0, status: 'pending',
  };
  await kvSet(USERS_KEY, [...users, user]);
  return user;
}

export async function loginUser(phone: string, password: string): Promise<StoredUser | 'pending' | 'rejected' | 'suspended' | null> {
  const users = await getAllUsers();
  const user = users.find((u) => u.phone === phone && u.password === password);
  if (!user) return null;
  if (user.status === 'pending')   return 'pending';
  if (user.status === 'rejected')  return 'rejected';
  if (user.status === 'suspended') return 'suspended';
  return user;
}

async function updateUserStatus(uid: string, status: UserStatus) {
  const users = await getAllUsers();
  await kvSet(USERS_KEY, users.map((u) => u.id === uid ? { ...u, status } : u));
}

export async function approveUser(uid: string)  { await updateUserStatus(uid, 'approved'); }
export async function rejectUser(uid: string)   { await updateUserStatus(uid, 'rejected'); }
export async function suspendUser(uid: string)  { await updateUserStatus(uid, 'suspended'); }

export async function deleteUser(uid: string) {
  const users = await getAllUsers();
  await kvSet(USERS_KEY, users.filter((u) => u.id !== uid));
}

export async function getLeaderboard(): Promise<StoredUser[]> {
  const users = await getAllUsers();
  return users.filter((u) => u.status === 'approved').sort((a, b) => b.points - a.points);
}

/* ── Competitions ── */
export async function getCompetitions(): Promise<Competition[]> {
  return kvGet<Competition[]>(COMPS_KEY, []);
}

export async function getActiveCompetitions(): Promise<Competition[]> {
  return (await getCompetitions()).filter((c) => c.active);
}

export async function addCompetition(comp: Competition): Promise<void> {
  const existing = await getCompetitions();
  if (existing.find((c) => c.id === comp.id)) {
    await kvSet(COMPS_KEY, existing.map((c) => c.id === comp.id ? { ...comp, active: true } : c));
  } else {
    await kvSet(COMPS_KEY, [...existing, { ...comp, active: true }]);
  }
}

export async function removeCompetition(id: string): Promise<void> {
  await kvSet(COMPS_KEY, (await getCompetitions()).filter((c) => c.id !== id));
}

export async function setCompetitionActive(id: string, active: boolean): Promise<void> {
  await kvSet(COMPS_KEY, (await getCompetitions()).map((c) => c.id === id ? { ...c, active } : c));
}

/* ── Match Results ── */
export async function getMatchResults(leagueId: string): Promise<MatchResult[]> {
  return kvGet<MatchResult[]>(resultsKey(leagueId), []);
}

export async function setMatchResult(leagueId: string, matchId: string, result: MatchOutcome): Promise<void> {
  const rest = (await getMatchResults(leagueId)).filter((r) => r.matchId !== matchId);
  await kvSet(resultsKey(leagueId), [...rest, { matchId, result }]);
}

export async function clearMatchResult(leagueId: string, matchId: string): Promise<void> {
  await kvSet(resultsKey(leagueId), (await getMatchResults(leagueId)).filter((r) => r.matchId !== matchId));
}

/* ── Predictions ── */
export async function getUserPredictions(uid: string, leagueId: string): Promise<UserPrediction[]> {
  return kvGet<UserPrediction[]>(predsKey(uid, leagueId), []);
}

export async function saveUserPredictions(uid: string, leagueId: string, preds: UserPrediction[]): Promise<void> {
  await kvSet(predsKey(uid, leagueId), preds);
}

/* ── Manual Matches ── */
export async function getManualMatches(leagueId: string): Promise<Match[]> {
  return kvGet<Match[]>(manualMatchKey(leagueId), []);
}

export async function setManualMatches(leagueId: string, matches: Match[]): Promise<void> {
  await kvSet(manualMatchKey(leagueId), matches);
}

export async function clearManualMatches(leagueId: string): Promise<void> {
  await kvSet(manualMatchKey(leagueId), []);
}

/* ── Points ── */
export async function recalculateUserPoints(uid: string): Promise<StoredUser | null> {
  const users = await getAllUsers();
  const user  = users.find((u) => u.id === uid);
  if (!user) return null;
  const comps   = await getActiveCompetitions();
  let points = 0;
  for (const comp of comps) {
    const preds   = await getUserPredictions(uid, comp.id);
    const results = await getMatchResults(comp.id);
    for (const p of preds) {
      const r = results.find((r) => r.matchId === p.matchId);
      if (r && p.prediction === r.result) points++;
    }
  }
  const updated = { ...user, points };
  await kvSet(USERS_KEY, users.map((u) => u.id === uid ? updated : u));
  return updated;
}

export async function recalculateAllPoints(): Promise<void> {
  const users = await getAllUsers();
  const comps = await getActiveCompetitions();
  const updated: StoredUser[] = [];
  for (const user of users) {
    let points = 0;
    for (const comp of comps) {
      const preds   = await getUserPredictions(user.id, comp.id);
      const results = await getMatchResults(comp.id);
      for (const p of preds) {
        const r = results.find((r) => r.matchId === p.matchId);
        if (r && p.prediction === r.result) points++;
      }
    }
    updated.push({ ...user, points });
  }
  await kvSet(USERS_KEY, updated);
}
