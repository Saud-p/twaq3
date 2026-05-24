'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import LoginForm from './LoginForm';
import PredictionPanel from './PredictionPanel';
import Leaderboard from './Leaderboard';
import { Match, MatchOutcome } from '../lib/matches';
import {
  StoredUser, UserPrediction, MatchResult, Competition,
  getLeaderboard, getUserPredictions, saveUserPredictions,
  getMatchResults, saveSession, loadSession, clearSession,
  recalculateUserPoints, getActiveCompetitions, addCompetition, getManualMatches,
} from '../lib/storage';

export default function MatchPredictionApp() {
  const [competitions, setComps]    = useState<Competition[]>([]);
  const [selectedId,   setSelId]    = useState<string>('');
  const [matchesByComp, setMBC]     = useState<Record<string, Match[]>>({});
  const [loadingIds,   setLoading]  = useState<Set<string>>(new Set());
  const [predsByComp,  setPBC]      = useState<Record<string, UserPrediction[]>>({});
  const [resultsByComp, setRBC]     = useState<Record<string, MatchResult[]>>({});
  const [user,         setUser]     = useState<StoredUser | null>(null);
  const [leaderboard,  setLb]       = useState<StoredUser[]>([]);
  const [saveModal, setSaveModal]   = useState<{ count: number; points: number } | null>(null);
  const [setupLoading, setSetup]    = useState(true);

  const refreshLb = () => setLb(getLeaderboard());

  const fetchMatches = (comp: Competition) => {
    const manual = getManualMatches(comp.id);
    if (manual.length > 0) {
      setMBC((prev) => ({ ...prev, [comp.id]: manual }));
      return;
    }
    setLoading((s) => new Set(s).add(comp.id));
    fetch(`/api/upcoming?league=${comp.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.fixtures) setMBC((prev) => ({ ...prev, [comp.id]: d.fixtures })); })
      .catch(() => {})
      .finally(() => setLoading((s) => { const n = new Set(s); n.delete(comp.id); return n; }));
  };

  const loadResults = (comp: Competition) =>
    setRBC((prev) => ({ ...prev, [comp.id]: getMatchResults(comp.id) }));

  const loadPreds = (uid: string, comp: Competition) =>
    setPBC((prev) => ({ ...prev, [comp.id]: getUserPredictions(uid, comp.id) }));

  useEffect(() => {
    refreshLb();
    const init = async () => {
      const params   = new URLSearchParams(window.location.search);
      const setupIds = params.get('setup')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      if (setupIds.length > 0) {
        await Promise.all(setupIds.map((id) =>
          fetch(`/api/league-lookup?id=${id}`)
            .then((r) => r.json())
            .then((d) => { if (d.league) addCompetition(d.league); })
            .catch(() => {})
        ));
        window.history.replaceState({}, '', window.location.pathname);
      }

      const comps = getActiveCompetitions();
      setComps(comps);
      if (comps.length > 0) setSelId(comps[0].id);

      const saved = loadSession();
      if (saved) {
        setUser(saved);
        comps.forEach((c) => loadPreds(saved.id, c));
      }

      comps.forEach((c) => { fetchMatches(c); loadResults(c); });
      setSetup(false);
    };
    init();
  }, []);

  // البطولات التي للعضو فيها توقعات — إن لم تكن له توقعات بعد يرى الكل
  const visibleComps = useMemo(() => {
    if (!user) return competitions;
    const withPreds = competitions.filter((c) => (predsByComp[c.id] ?? []).length > 0);
    return withPreds.length > 0 ? withPreds : competitions;
  }, [user, competitions, predsByComp]);

  // توقعات جميع الأعضاء للبطولة الحالية (للعرض في الأسفل)
  const currentMemberPreds = useMemo(() => {
    if (!selectedId || !leaderboard.length) return {};
    const out: Record<string, UserPrediction[]> = {};
    leaderboard.forEach((u) => { out[u.id] = getUserPredictions(u.id, selectedId); });
    return out;
  }, [selectedId, leaderboard]);

  const handleSelectComp = (id: string) => {
    setSelId(id);
    const comp = competitions.find((c) => c.id === id);
    if (comp) { loadResults(comp); if (!matchesByComp[id]) fetchMatches(comp); }
  };

  const handleAuth = (authedUser: StoredUser) => {
    saveSession(authedUser.id);
    setUser(authedUser);
    competitions.forEach((c) => loadPreds(authedUser.id, c));
    refreshLb();
  };

  const handleLogout = () => {
    if (!window.confirm('هل تريد تسجيل الخروج؟')) return;
    clearSession();
    setUser(null);
    setPBC({});
  };

  const handlePredict = (matchId: string, prediction: MatchOutcome) => {
    if (!selectedId) return;
    setPBC((prev) => {
      const current  = prev[selectedId] ?? [];
      const rest     = current.filter((p) => p.matchId !== matchId);
      const existing = current.find((p) => p.matchId === matchId);
      return { ...prev, [selectedId]: [...rest, { matchId, prediction, scored: existing?.scored ?? false }] };
    });
  };

  const handleSave = useCallback(() => {
    if (!user || !selectedId) return;
    const preds = predsByComp[selectedId] ?? [];
    if (!preds.length) return;
    saveUserPredictions(user.id, selectedId, preds);
    const updated = recalculateUserPoints(user.id);
    if (updated) setUser(updated);
    refreshLb();
    setSaveModal({ count: preds.length, points: updated?.points ?? user.points });
  }, [user, selectedId, predsByComp]);

  const userRank        = user ? leaderboard.findIndex((u) => u.id === user.id) + 1 : 0;
  const currentPreds    = predsByComp[selectedId]   ?? [];
  const currentResults  = resultsByComp[selectedId] ?? [];
  const currentMatches  = matchesByComp[selectedId] ?? [];
  const isLoadingCurrent = loadingIds.has(selectedId);

  // دالة مساعدة لعرض اسم التوقع
  const predLabel = (p: MatchOutcome, match: Match) =>
    p === 'home' ? match.home : p === 'draw' ? 'تعادل' : match.away;
  const predNum = (p: MatchOutcome) => p === 'home' ? '1' : p === 'draw' ? 'X' : '2';

  return (
    <div className="app-shell">
      <header className="app-header">
        <img src="/logo.png" alt="دوري التوقعات" className="app-logo"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = 'flex';
          }} />
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
          <div className={`user-rank-badge rank-${userRank <= 3 ? userRank : 'other'}`}>{userRank || '-'}</div>
          <div className="user-info">
            <div className="user-greeting">أهلاً، {user.name}</div>
          </div>
          <div className="user-points">
            <div className="user-points-val">{user.points}</div>
            <div className="user-points-label">نقطة</div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="تسجيل الخروج">⏻</button>
        </div>
      )}

      {setupLoading ? (
        <div className="matches-loading"><span className="loading-spinner" />جاري التحميل...</div>
      ) : competitions.length === 0 ? (
        <div className="section" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🏆</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
            لا توجد بطولات نشطة حالياً<br />انتظر رابط المشاركة من الإدارة
          </p>
        </div>
      ) : (
        <>
          {visibleComps.length > 1 && (
            <div className="comp-tabs-bar">
              {visibleComps.map((c) => (
                <button key={c.id}
                  className={`comp-tab${selectedId === c.id ? ' active' : ''}`}
                  onClick={() => handleSelectComp(c.id)}>
                  {c.badge && <img src={c.badge} alt="" className="comp-tab-badge" />}
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          )}

          {isLoadingCurrent ? (
            <div className="matches-loading"><span className="loading-spinner" />جاري تحميل المباريات...</div>
          ) : currentMatches.length === 0 ? (
            <div className="section"><p className="empty-msg">لا توجد مباريات قادمة حالياً</p></div>
          ) : (
            <PredictionPanel
              matches={currentMatches}
              predictions={currentPreds}
              results={currentResults}
              onPredict={handlePredict}
              disabled={!user}
            />
          )}
        </>
      )}

      <button className="btn-save" onClick={handleSave}
        disabled={!user || !currentPreds.length || competitions.length === 0}>
        {user ? '💾 حفظ التوقعات' : '🔒 سجّل دخولك أولاً'}
      </button>

      <Leaderboard currentUserId={user?.id ?? null} users={leaderboard} />

      {/* ── توقعات الأعضاء ── */}
      {currentMatches.length > 0 && leaderboard.length > 0 && (
        <div className="section">
          <h2 className="section-title"><span className="icon">📋</span>توقعات الأعضاء</h2>
          <div className="divider" />
          {currentMatches.map((match) => {
            const result = currentResults.find((r) => r.matchId === match.id);
            return (
              <div key={match.id} className="mp-match-block">
                <div className="mp-match-header">
                  <span className="mp-team">{match.home}</span>
                  <span className="mp-vs">vs</span>
                  <span className="mp-team mp-team-away">{match.away}</span>
                  {result && (
                    <span className="mp-result-badge">
                      {result.result === 'home' ? match.home : result.result === 'draw' ? 'تعادل' : match.away}
                    </span>
                  )}
                </div>
                {match.date && <div className="mp-date">{match.date}</div>}
                <div className="mp-members">
                  {leaderboard.map((member) => {
                    const pred = (currentMemberPreds[member.id] ?? []).find((p) => p.matchId === match.id);
                    const correct = result && pred ? pred.prediction === result.result : null;
                    return (
                      <div key={member.id} className="mp-member-row">
                        <span className="mp-member-name">{member.name}</span>
                        {pred ? (
                          <span className={`mp-pred-badge${correct === true ? ' correct' : correct === false ? ' wrong' : ''}`}>
                            {predNum(pred.prediction)}
                          </span>
                        ) : (
                          <span className="mp-pred-badge empty">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {saveModal && (
        <div className="save-overlay" onClick={() => setSaveModal(null)}>
          <div className="save-modal" onClick={(e) => e.stopPropagation()}>
            <div className="save-modal-icon">✅</div>
            <h2 className="save-modal-title">تم حفظ توقعاتك!</h2>
            <p className="save-modal-sub">حفظنا <strong>{saveModal.count}</strong> توقع بنجاح</p>
            <p className="save-modal-sub">ستحصل على نقطة لكل توقع صحيح بعد انتهاء المباريات</p>
            <div className="save-modal-points">
              <span className="save-modal-pts-val">{saveModal.points}</span>
              <span className="save-modal-pts-label">مجموع نقاطك الحالي</span>
            </div>
            <button className="btn-primary save-modal-btn" onClick={() => setSaveModal(null)}>حسناً</button>
          </div>
        </div>
      )}
    </div>
  );
}
