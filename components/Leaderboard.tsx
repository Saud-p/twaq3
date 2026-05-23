'use client';

import { User } from '../lib/matches';

interface LeaderboardProps {
  user: User | null;
  scores: User[];
}

const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function Leaderboard({ user, scores }: LeaderboardProps) {
  return (
    <div className="section" style={{ marginTop: 10 }}>
      <h2 className="section-title">
        <span className="icon">🏆</span>
        أفضل المتوقعين
      </h2>
      <div className="divider" />
      <div className="lb-row-header">
        <span></span>
        <span>الجوال</span>
        <span style={{ textAlign: 'left' }}>النقاط</span>
      </div>
      {scores.map((item) => (
        <div key={item.id} className={`lb-row${user?.phone === item.phone ? ' me' : ''}`}>
          <div className={`rank-badge rank-${item.rank <= 3 ? item.rank : 'other'}`}>
            {medals[item.rank] ?? item.rank}
          </div>
          <span className="lb-phone">{item.phone}</span>
          <span className="lb-points">{item.points}</span>
        </div>
      ))}
    </div>
  );
}
