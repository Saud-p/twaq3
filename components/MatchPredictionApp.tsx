'use client';

import { useCallback, useEffect, useState } from 'react';
import LoginForm from './LoginForm';
import PredictionPanel from './PredictionPanel';
import Leaderboard from './Leaderboard';
import { Match, MatchOutcome } from '../lib/matches';
import {
  StoredUser, UserPrediction, MatchResult,
  getLeaderboard, getUserPredictions, saveUserPredictions,
  getMatchResults,
} from '../lib/storage';

export default function MatchPredictionApp({ initialMatches }: { initialMatches: Match[] }) {
  const [user, setUser]           = useState<StoredUser | null>(null);
  const [predictions, setPreds]   = useState<UserPrediction[]>([]);
  const [leaderboard, setLb]      = useState<StoredUser[]>([]);
  const [matchResults, setResults]= useState<MatchResult[]>([]);
  const [status, setStatus]       = useState('');

  const refreshAll = () => {
    setLb(getLeaderboard());
    setResults(getMatchResults());
  };

  useEffect(() => { refreshAll(); }, []);

  const handleAuth = (authedUser: StoredUser) => {
    setUser(authedUser);
    setPreds(getUserPredictions(authedUser.id));
    refreshAll();
    setStatus(`أهلاً ${authedUser.name} 👋`);
  };

  const handlePredict = (matchId: string, prediction: MatchOutcome) => {
    setPreds((prev) => {
      const rest     = prev.filter((p) => p.matchId !== matchId);
      const existing = prev.find((p) => p.matchId === matchId);
      return [...rest, { matchId, prediction, scored: existing?.scored ?? false }];
    });
  };

  const handleSave = useCallback(() => {
    if (!user)               { setStatus('يرجى تسجيل الدخول أولاً'); return; }
    if (!predictions.length) { setStatus('اختر توقعاتك أولاً'); return; }

    saveUserPredictions(user.id, predictions);
    setStatus('تم حفظ توقعاتك ✓');
  }, [user, predictions]);

  const userRank = user ? leaderboard.findIndex((u) => u.id === user.id) + 1 : 0;

  return (
    <div className="app-shell">
      <header className="app-header">
        <img
          src="/logo.png"
          alt="دوري التوقعات"
          className="app-logo"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = 'flex';
          }}
        />
        <div className="logo-fallback" style={{ display: 'none' }}>
          <span className="logo-icon">⚽</span>
          <span className="logo-title">دوري التوقعات</span>
          <span className="logo-subtitle">PREDICTION LEAGUE</span>
        </div>
      </header>

      {status && <div className="status-msg">{status}</div>}

      {!user ? (
        <LoginForm onAuth={handleAuth} />
      ) : (
        <div className="user-badge">
          <div className={`user-rank-badge rank-${userRank <= 3 ? userRank : 'other'}`}>
            {userRank || '-'}
          </div>
          <div className="user-info">
            <div className="user-phone">{user.name}</div>
            <div className="user-label">{user.phone}</div>
          </div>
          <div className="user-points">
            <div className="user-points-val">{user.points}</div>
            <div className="user-points-label">نقطة</div>
          </div>
        </div>
      )}

      <PredictionPanel
        matches={initialMatches}
        predictions={predictions}
        results={matchResults}
        onPredict={handlePredict}
        disabled={!user}
      />

      <button className="btn-save" onClick={handleSave} disabled={!user}>
        {user ? '💾 حفظ التوقعات' : '🔒 سجّل دخولك أولاً'}
      </button>

      <Leaderboard currentUserId={user?.id ?? null} users={leaderboard} />
    </div>
  );
}
