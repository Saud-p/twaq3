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
      const newUser = { id: `u${leaderboard.length + 1}`, phone, rank: leaderboard.length + 1, points: 0 };
      setLeaderboard([...leaderboard, newUser]);
      setUser(newUser);
    }
    setStatus('تم تسجيل الدخول بنجاح. يمكنك الآن حفظ توقعاتك.');
  };

  const handleSave = useCallback(() => {
    if (!user) {
      setStatus('يرجى تسجيل الدخول أولاً.');
      return;
    }

    const savedMatches = matches.filter((match) => match.homeScore !== null && match.awayScore !== null);
    if (savedMatches.length !== matches.length) {
      setStatus('يرجى إدخال نتيجة لكل مباراة قبل الحفظ.');
      return;
    }

    const gained = matches.reduce((total, match) => {
      if (match.homeScore === 2 && match.awayScore === 1) return total + 10;
      if (match.homeScore === match.awayScore) return total + 8;
      return total + 6;
    }, 0);

    const updated = leaderboard.map((item) =>
      item.phone === user.phone ? { ...item, points: item.points + gained } : item
    );

    const sorted = updated.slice().sort((a, b) => b.points - a.points);
    const ranked = sorted.map((item, index) => ({ ...item, rank: index + 1 }));
    const currentUser = ranked.find((item) => item.phone === user.phone) ?? user;

    setLeaderboard(ranked);
    setUser(currentUser);
    setStatus('تم حفظ توقعاتك بنجاح وتم تحديث الترتيب.');
  }, [leaderboard, matches, user]);

  return (
    <>
      <section className="grid">
        <LoginForm onLogin={handleLogin} />
        <PredictionPanel matches={matches} onUpdate={setMatches} onSave={handleSave} />
      </section>
      <Leaderboard user={user} scores={leaderboard} />
    </>
  );
}
