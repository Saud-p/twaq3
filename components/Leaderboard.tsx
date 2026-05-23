'use client';

import { StoredUser } from '../lib/storage';

interface LeaderboardProps {
  currentUserId: string | null;
  users: StoredUser[];
}

const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function Leaderboard({ currentUserId, users }: LeaderboardProps) {
  return (
    <div className="section" style={{ marginTop: 10 }}>
      <h2 className="section-title">
        <span className="icon">🏆</span>
        أفضل المتوقعين
      </h2>
      <div className="divider" />

      {users.length === 0 ? (
        <p className="empty-msg">لا يوجد مشتركون بعد — كن الأول!</p>
      ) : (
        <>
          <div className="lb-row-header">
            <span></span>
            <span>المتوقع</span>
            <span style={{ textAlign: 'left' }}>النقاط</span>
          </div>
          {users.map((item, index) => {
            const rank = index + 1;
            return (
              <div key={item.id} className={`lb-row${item.id === currentUserId ? ' me' : ''}`}>
                <div className={`rank-badge rank-${rank <= 3 ? rank : 'other'}`}>
                  {medals[rank] ?? rank}
                </div>
                <span className="lb-phone">{item.name}</span>
                <span className="lb-points">{item.points}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
