import type { MatchOutcome } from './matches';

export type StoredUser = {
  id: string;
  phone: string;
  password: string;
  points: number;
};

export type UserPrediction = {
  matchId: string;
  prediction: MatchOutcome;
  scored: boolean; // true = already counted
};

const USERS_KEY = 'twaq3_users';
const predsKey = (uid: string) => `twaq3_preds_${uid}`;

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

function save(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

export function registerUser(phone: string, password: string): StoredUser | 'exists' {
  const users: StoredUser[] = load(USERS_KEY, []);
  if (users.some((u) => u.phone === phone)) return 'exists';
  const user: StoredUser = { id: `u${Date.now()}`, phone, password, points: 0 };
  save(USERS_KEY, [...users, user]);
  return user;
}

export function loginUser(phone: string, password: string): StoredUser | null {
  const users: StoredUser[] = load(USERS_KEY, []);
  return users.find((u) => u.phone === phone && u.password === password) ?? null;
}

export function getLeaderboard(): StoredUser[] {
  const users: StoredUser[] = load(USERS_KEY, []);
  return [...users].sort((a, b) => b.points - a.points);
}

export function getUserPredictions(uid: string): UserPrediction[] {
  return load(predsKey(uid), []);
}

export function saveUserPredictions(uid: string, preds: UserPrediction[]) {
  save(predsKey(uid), preds);
}

export function addPointsAndSave(uid: string, earned: number): StoredUser {
  const users: StoredUser[] = load(USERS_KEY, []);
  const updated = users.map((u) => u.id === uid ? { ...u, points: u.points + earned } : u);
  save(USERS_KEY, updated);
  return updated.find((u) => u.id === uid)!;
}
