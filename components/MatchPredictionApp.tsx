'use client';

import { useCallback, useEffect, useState } from 'react';
import LoginForm from './LoginForm';
import PredictionPanel from './PredictionPanel';
import Leaderboard from './Leaderboard';
import { Match, MatchOutcome } from '../lib/matches';
import {
  StoredUser, UserPrediction, MatchResult,
  getLeaderboard, getUserPredictions, saveUserPredictions,
  getMatchResults, saveSession, loadSession, recalculateUserPoints,
} from '../lib/storage';

export default function MatchPredictionApp({ initialMatches }: { initialMatches: Match[] }) {
  const [user, setUser]           = useState<StoredUser | null>(null);
  const [predictions, setPreds]   = useState<UserPrediction[]>([]);
  const [leaderboard, setLb]      = useState<StoredUser[]>([]);
  const [matchResults, setResults]= useState<MatchResult[]>([]);
  const [saveModal, setSaveModal] = useState<{ count: number; points: number } | null>(null);

  const refreshAll = () => {
    setLb(getLeaderboard());
    setResults(getMatchResults());
  };

  useEffect(() => {
    refreshAll();
    const saved = loadSession();
    if (saved) {
      setUser(saved);
      setPreds(getUserPredictions(saved.id));
    }
  }, []);

  const handleAuth = (authedUser: StoredUser) => {
    saveSession(authedUser.id);
    setUser(authedUser);
    setPreds(getUserPredictions(authedUser.id));
    refreshAll();
  };

  const handlePredict = (matchId: string, prediction: MatchOutcome) => {
    setPreds((prev) => {
      const rest     = prev.filter((p) => p.matchId !== matchId);
      const existing = prev.find((p) => p.matchId === matchId);
      return [...rest, { matchId, prediction, scored: existing?.scored ?? false }];
    });
  };

  const handleSave = useCallback(() => {
    if (!user || !predictions.length) return;

    saveUserPredictions(user.id, predictions);

    // احتساب النقاط فوراً بناءً على النتائج المتوفرة
    const updated = recalculateUserPoints(user.id);
    if (updated) setUser(updated);

    refreshAll();
    setSaveModal({ count: predictions.length, points: updated?.points ?? user.points });
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

      {!user ? (
        <LoginForm onAuth={handleAuth} />
      ) : (
        <div className="user-badge">
          <div className={`user-rank-badge rank-${userRank <= 3 ? userRank : 'other'}`}>
            {userRank || '-'}
          </div>
          <div className="user-info">
            <div className="user-greeting">أهلاً، {user.name}</div>
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

      <button className="btn-save" onClick={handleSave} disabled={!user || !predictions.length}>
        {user ? '💾 حفظ التوقعات' : '🔒 سجّل دخولك أولاً'}
      </button>

      <Leaderboard currentUserId={user?.id ?? null} users={leaderboard} />

      {/* مودال تأكيد الحفظ */}
      {saveModal && (
        <div className="save-overlay" onClick={() => setSaveModal(null)}>
          <div className="save-modal" onClick={(e) => e.stopPropagation()}>
            <div className="save-modal-icon">✅</div>
            <h2 className="save-modal-title">تم حفظ توقعاتك!</h2>
            <p className="save-modal-sub">
              حفظنا <strong>{saveModal.count}</strong> توقع بنجاح
            </p>
            <p className="save-modal-sub">
              ستحصل على نقطة لكل توقع صحيح بعد انتهاء المباريات
            </p>
            <div className="save-modal-points">
              <span className="save-modal-pts-val">{saveModal.points}</span>
              <span className="save-modal-pts-label">مجموع نقاطك الحالي</span>
            </div>
            <button className="btn-primary save-modal-btn" onClick={() => setSaveModal(null)}>
              حسناً
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
