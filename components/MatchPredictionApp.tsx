'use client';

import { useCallback, useState } from 'react';
import LoginForm from './LoginForm';
import PredictionPanel from './PredictionPanel';
import Leaderboard from './Leaderboard';
import { initialLeaderboard, MatchPrediction, User } from '../lib/matches';

interface MatchPredictionAppProps {
  initialMatches: MatchPrediction[];
}

export default function MatchPredictionApp({ initialMatches }: MatchPredictionAppProps) {
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<MatchPrediction[]>(initialMatches);
  const [leaderboard, setLeaderboard] = useState<User[]>(initialLeaderboard);
  const [status, setStatus] = useState('');

  const handleLogin = (phone: string) => {
    const existing = leaderboard.find((item) => item.phone === phone);
    if (existing) {
      setUser(existing);
    } else {
      const newUser: User = {
        id: `u${Date.now()}`,
        phone,
        rank: leaderboard.length + 1,
        points: 0,
      };
      setLeaderboard((prev) => [...prev, newUser]);
      setUser(newUser);
    }
    setStatus('تم تسجيل الدخول بنجاح ✓');
  };

  const handleSave = useCallback(() => {
    if (!user) { setStatus('يرجى تسجيل الدخول أولاً'); return; }

    const allFilled = matches.every((m) => m.homeScore !== null && m.awayScore !== null);
    if (!allFilled) { setStatus('يرجى إدخال نتيجة لكل المباريات'); return; }

    const gained = matches.reduce((total, m) => {
      if (m.homeScore === 2 && m.awayScore === 1) return total + 10;
      if (m.homeScore === m.awayScore) return total + 8;
      return total + 6;
    }, 0);

    const updated = leaderboard.map((item) =>
      item.phone === user.phone ? { ...item, points: item.points + gained } : item
    );
    const sorted = [...updated].sort((a, b) => b.points - a.points);
    const ranked = sorted.map((item, i) => ({ ...item, rank: i + 1 }));
    const currentUser = ranked.find((item) => item.phone === user.phone) ?? user;

    setLeaderboard(ranked);
    setUser(currentUser);
    setStatus(`تم الحفظ! حصلت على ${gained} نقطة 🎉`);
  }, [leaderboard, matches, user]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <img
          src="/logo.png"
          alt="دوري التوقعات"
          className="app-logo"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = 'flex';
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
        <LoginForm onLogin={handleLogin} />
      ) : (
        <div className="user-badge">
          <div className={`user-rank-badge rank-${user.rank <= 3 ? user.rank : 'other'}`}>
            {user.rank}
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
        matches={matches}
        onUpdate={setMatches}
        disabled={!user}
      />

      <button
        className="btn-save"
        onClick={handleSave}
        disabled={!user}
      >
        {user ? '⚡ حفظ التوقعات' : '🔒 سجّل دخولك أولاً'}
      </button>

      <Leaderboard user={user} scores={leaderboard} />
    </div>
  );
}
