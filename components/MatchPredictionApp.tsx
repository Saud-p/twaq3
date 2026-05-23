'use client';

import { useCallback, useEffect, useState } from 'react';
import LoginForm from './LoginForm';
import PredictionPanel from './PredictionPanel';
import Leaderboard from './Leaderboard';
import { Match, MatchOutcome } from '../lib/matches';
import {
  StoredUser, UserPrediction,
  getLeaderboard, getUserPredictions,
  saveUserPredictions, addPointsAndSave,
} from '../lib/storage';

interface MatchPredictionAppProps {
  initialMatches: Match[];
}

export default function MatchPredictionApp({ initialMatches }: MatchPredictionAppProps) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<StoredUser[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setLeaderboard(getLeaderboard());
  }, []);

  const refreshLeaderboard = () => setLeaderboard(getLeaderboard());

  const handleAuth = (authedUser: StoredUser) => {
    setUser(authedUser);
    setPredictions(getUserPredictions(authedUser.id));
    refreshLeaderboard();
    setStatus(`أهلاً ${authedUser.phone} 👋`);
  };

  const handlePredict = (matchId: string, prediction: MatchOutcome) => {
    setPredictions((prev) => {
      const rest = prev.filter((p) => p.matchId !== matchId);
      const existing = prev.find((p) => p.matchId === matchId);
      return [...rest, { matchId, prediction, scored: existing?.scored ?? false }];
    });
  };

  const handleSave = useCallback(() => {
    if (!user) { setStatus('يرجى تسجيل الدخول أولاً'); return; }
    if (predictions.length === 0) { setStatus('اختر توقعاتك أولاً'); return; }

    // احسب النقاط فقط للمباريات التي انتهت ولم تُحتسب بعد
    let earned = 0;
    const updated = predictions.map((pred) => {
      if (pred.scored) return pred;
      const match = initialMatches.find((m) => m.id === pred.matchId);
      if (!match?.result) return pred;
      const correct = pred.prediction === match.result;
      if (correct) earned++;
      return { ...pred, scored: true };
    });

    saveUserPredictions(user.id, updated);
    setPredictions(updated);

    if (earned > 0) {
      const updatedUser = addPointsAndSave(user.id, earned);
      setUser(updatedUser);
      setStatus(`تم الحفظ! حصلت على ${earned} نقطة 🎉`);
    } else {
      setStatus('تم حفظ توقعاتك ✓');
    }

    refreshLeaderboard();
  }, [user, predictions, initialMatches]);

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
            <div className="user-phone">{user.phone}</div>
            <div className="user-label">مرتبتك الحالية</div>
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
