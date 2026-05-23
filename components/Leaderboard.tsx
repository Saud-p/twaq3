'use client';

import { User } from '../lib/matches';

interface LeaderboardProps {
  user: User | null;
  scores: User[];
}

export default function Leaderboard({ user, scores }: LeaderboardProps) {
  return (
    <section className="card">
      <h2>أفضل المتوقعين</h2>
      <div className="leaderboard">
        <div className="leaderboard-row header">
          <span>الترتيب</span>
          <span>رقم الجوال</span>
          <span>النقاط</span>
        </div>
        {scores.map((item) => (
          <div key={item.id} className={`leaderboard-row ${user?.phone === item.phone ? 'highlight' : ''}`}>
            <span>{item.rank}</span>
            <span>{item.phone}</span>
            <span>{item.points}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
