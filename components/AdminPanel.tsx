'use client';

import { useEffect, useState } from 'react';
import type { Match, MatchOutcome } from '../lib/matches';
import {
  getAllUsers, approveUser, rejectUser,
  getMatchResults, setMatchResult, clearMatchResult, recalculateAllPoints,
} from '../lib/storage';
import type { StoredUser, MatchResult } from '../lib/storage';

const ADMIN_PASS = 'Saud&Fahad=Heart';

export default function AdminPanel() {
  const [authed,   setAuthed]  = useState(false);
  const [pass,     setPass]    = useState('');
  const [passErr,  setPassErr] = useState(false);
  const [users,    setUsers]   = useState<StoredUser[]>([]);
  const [results,  setResults] = useState<MatchResult[]>([]);
  const [matches,  setMatches] = useState<Match[]>([]);
  const [loadingM, setLoadingM]= useState(false);
  const [msg,      setMsg]     = useState('');

  const refresh = () => { setUsers(getAllUsers()); setResults(getMatchResults()); };

  useEffect(() => {
    if (!authed) return;
    refresh();
    setLoadingM(true);
    fetch('/api/upcoming')
      .then((r) => r.json())
      .then((data) => { if (data.fixtures) setMatches(data.fixtures); })
      .catch(() => {})
      .finally(() => setLoadingM(false));
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === ADMIN_PASS) { setAuthed(true); setPassErr(false); }
    else setPassErr(true);
  };

  const handleApprove = (uid: string) => { approveUser(uid); refresh(); };
  const handleReject  = (uid: string) => { rejectUser(uid);  refresh(); };

  const handleResult = (matchId: string, outcome: MatchOutcome) => {
    const existing = results.find((r) => r.matchId === matchId)?.result;
    if (existing === outcome) clearMatchResult(matchId);
    else setMatchResult(matchId, outcome);
    refresh();
  };

  const handleRecalc = () => {
    recalculateAllPoints();
    refresh();
    setMsg('تم احتساب النقاط لجميع الأعضاء ✓');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleAutoFetch = async () => {
    setMsg('جاري جلب النتائج من API...');
    try {
      const res  = await fetch('/api/fetch-results');
      const data = await res.json() as { results?: { id: string; home: string; away: string; date: string; outcome: MatchOutcome }[]; error?: string };
      if (data.error) { setMsg(`خطأ: ${data.error}`); return; }

      let count = 0;
      for (const r of data.results ?? []) {
        const match = matches.find((m) => m.id === r.id || (m.home === r.home && m.away === r.away));
        if (match) { setMatchResult(match.id, r.outcome); count++; }
      }

      refresh();
      setMsg(count > 0 ? `✓ تم جلب ${count} نتيجة وتحديثها` : 'لا توجد نتائج مطابقة للمباريات الحالية');
      setTimeout(() => setMsg(''), 4000);
    } catch {
      setMsg('فشل الاتصال — تحقق من الاتصال بالإنترنت');
      setTimeout(() => setMsg(''), 4000);
    }
  };

  if (!authed) {
    return (
      <div className="admin-login">
        <div className="section">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: '2rem' }}>⚙️</span>
            <h2 style={{ color: 'var(--green)', marginTop: 8, fontSize: '1.2rem' }}>لوحة التحكم</h2>
          </div>
          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label>كلمة مرور الإدارة</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" />
            </div>
            {passErr && <div className="form-error">كلمة المرور غير صحيحة</div>}
            <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>دخول</button>
          </form>
        </div>
      </div>
    );
  }

  const pending  = users.filter((u) => u.status === 'pending');
  const approved = users.filter((u) => u.status === 'approved').sort((a, b) => b.points - a.points);
  const rejected = users.filter((u) => u.status === 'rejected');

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="logo-fallback" style={{ display: 'flex' }}>
          <span className="logo-icon">⚙️</span>
          <span className="logo-title">لوحة التحكم</span>
          <span className="logo-subtitle">ADMIN PANEL</span>
        </div>
      </header>

      {msg && <div className="status-msg">{msg}</div>}

      {/* ── طلبات التسجيل ── */}
      <div className="section">
        <h2 className="section-title">
          <span className="icon">⏳</span>
          طلبات التسجيل
          {pending.length > 0 && <span className="badge-count">{pending.length}</span>}
        </h2>
        <div className="divider" />
        {pending.length === 0
          ? <p className="empty-msg">لا توجد طلبات منتظرة</p>
          : pending.map((u) => (
            <div key={u.id} className="admin-user-row">
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{u.phone}</div>
              </div>
              <div className="admin-actions">
                <button className="btn-approve" onClick={() => handleApprove(u.id)}>✓ قبول</button>
                <button className="btn-reject"  onClick={() => handleReject(u.id)}>✗ رفض</button>
              </div>
            </div>
          ))
        }
      </div>

      {/* ── نتائج المباريات ── */}
      <div className="section">
        <h2 className="section-title">
          <span className="icon">⚽</span>
          نتائج المباريات
        </h2>
        <div className="divider" />
        {loadingM ? (
          <p className="empty-msg">جاري تحميل المباريات...</p>
        ) : matches.length === 0 ? (
          <p className="empty-msg">لا توجد مباريات قادمة حالياً</p>
        ) : null}
        {matches.map((match) => {
          const stored = results.find((r) => r.matchId === match.id)?.result ?? null;
          return (
            <div key={match.id} className="admin-match-row">
              <div className="admin-match-teams">
                <span>{match.home}</span>
                <span className="vs-sep" style={{ fontSize: '0.8rem' }}>vs</span>
                <span>{match.away}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 8 }}>
                {match.date}
              </div>
              <div className="admin-result-btns">
                {(['home', 'draw', 'away'] as MatchOutcome[]).map((o) => (
                  <button key={o}
                    className={`admin-result-btn${stored === o ? ' active' : ''}`}
                    onClick={() => handleResult(match.id, o)}
                  >
                    <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>
                      {o === 'home' ? '1' : o === 'draw' ? 'X' : '2'}
                    </div>
                    <div style={{ fontSize: '0.65rem' }}>
                      {o === 'home' ? match.home : o === 'draw' ? 'تعادل' : match.away}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleAutoFetch}>
            🔄 جلب النتائج تلقائياً
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleRecalc}>
            🧮 احتساب النقاط
          </button>
        </div>
      </div>

      {/* ── الأعضاء المعتمدون ── */}
      <div className="section">
        <h2 className="section-title">
          <span className="icon">👥</span>
          الأعضاء ({approved.length})
        </h2>
        <div className="divider" />
        {approved.length === 0
          ? <p className="empty-msg">لا يوجد أعضاء معتمدون بعد</p>
          : (
            <>
              <div className="lb-row-header">
                <span></span>
                <span>الاسم</span>
                <span style={{ textAlign: 'left' }}>النقاط</span>
              </div>
              {approved.map((u, i) => {
                const rank = i + 1;
                return (
                  <div key={u.id} className="lb-row">
                    <div className={`rank-badge rank-${rank <= 3 ? rank : 'other'}`}>{rank}</div>
                    <div>
                      <div className="lb-phone">{u.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.phone}</div>
                    </div>
                    <span className="lb-points">{u.points}</span>
                  </div>
                );
              })}
            </>
          )
        }
      </div>

      {/* ── المرفوضون ── */}
      {rejected.length > 0 && (
        <div className="section">
          <h2 className="section-title"><span className="icon">🚫</span>مرفوضون ({rejected.length})</h2>
          <div className="divider" />
          {rejected.map((u) => (
            <div key={u.id} className="admin-user-row">
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{u.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{u.phone}</div>
              </div>
              <button className="btn-approve" onClick={() => handleApprove(u.id)}>إعادة قبول</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
