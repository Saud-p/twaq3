'use client';

import { useEffect, useState } from 'react';
import type { Match, MatchOutcome } from '../lib/matches';
import {
  getAllUsers, approveUser, rejectUser,
  getMatchResults, setMatchResult, clearMatchResult, recalculateAllPoints,
  getLeagueConfig, setLeagueConfig, LeagueConfig,
} from '../lib/storage';
import type { StoredUser, MatchResult } from '../lib/storage';

const ADMIN_PASS = 'Saud&Fahad=Heart';

type LeagueResult = {
  id:      number;
  name:    string;
  country: string;
  logo:    string;
  seasons: number[];
};

export default function AdminPanel() {
  const [authed,   setAuthed]  = useState(false);
  const [pass,     setPass]    = useState('');
  const [passErr,  setPassErr] = useState(false);
  const [users,    setUsers]   = useState<StoredUser[]>([]);
  const [results,  setResults] = useState<MatchResult[]>([]);
  const [matches,  setMatches] = useState<Match[]>([]);
  const [loadingM, setLoadingM]= useState(false);
  const [msg,      setMsg]     = useState('');

  // إعداد البطولة
  const [leagueCfg,      setLeagueCfg]      = useState<LeagueConfig | null>(null);
  const [leagueSearch,   setLeagueSearch]   = useState('');
  const [leagueResults,  setLeagueResults]  = useState<LeagueResult[]>([]);
  const [leagueLoading,  setLeagueLoading]  = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<LeagueResult | null>(null);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [shareUrl,       setShareUrl]       = useState('');

  const refresh = () => { setUsers(getAllUsers()); setResults(getMatchResults()); };

  const loadMatches = (cfg: LeagueConfig | null) => {
    setLoadingM(true);
    const url = cfg
      ? `/api/upcoming?league=${cfg.leagueId}&season=${cfg.season}`
      : '/api/upcoming';
    fetch(url)
      .then((r) => r.json())
      .then((data) => { if (data.fixtures) setMatches(data.fixtures); })
      .catch(() => {})
      .finally(() => setLoadingM(false));
  };

  useEffect(() => {
    if (!authed) return;
    refresh();
    const cfg = getLeagueConfig();
    setLeagueCfg(cfg);
    loadMatches(cfg);
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
    const cfg      = getLeagueConfig();
    const fetchUrl = cfg
      ? `/api/fetch-results?league=${cfg.leagueId}&season=${cfg.season}`
      : '/api/fetch-results';
    setMsg('جاري جلب النتائج من API...');
    try {
      const res  = await fetch(fetchUrl);
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

  // ── إعداد البطولة ──
  const handleLeagueSearch = async () => {
    if (leagueSearch.trim().length < 2) return;
    setLeagueLoading(true);
    setLeagueResults([]);
    setSelectedLeague(null);
    setShareUrl('');
    try {
      const res  = await fetch(`/api/search-leagues?q=${encodeURIComponent(leagueSearch.trim())}`);
      const data = await res.json();
      setLeagueResults(data.leagues ?? []);
      if (!data.leagues?.length) setMsg('لا توجد نتائج — جرب كلمة أخرى');
    } catch {
      setMsg('فشل البحث — تحقق من الاتصال');
    } finally {
      setLeagueLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleLeaguePick = (lg: LeagueResult) => {
    setSelectedLeague(lg);
    setSelectedSeason(String(lg.seasons[0] ?? ''));
    setShareUrl('');
  };

  const handleLeagueConfirm = () => {
    if (!selectedLeague || !selectedSeason) return;
    const config: LeagueConfig = {
      leagueId:    String(selectedLeague.id),
      season:      selectedSeason,
      leagueName:  selectedLeague.name,
      countryName: selectedLeague.country,
    };
    setLeagueConfig(config);
    setLeagueCfg(config);
    loadMatches(config);

    const base   = window.location.origin;
    const qs     = new URLSearchParams({
      league: config.leagueId,
      season: config.season,
      lname:  config.leagueName,
      cname:  config.countryName,
    });
    setShareUrl(`${base}/?${qs.toString()}`);
    setLeagueResults([]);
    setSelectedLeague(null);
    setMsg('✓ تم حفظ المسابقة');
    setTimeout(() => setMsg(''), 3000);
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

      {/* ── إعداد المسابقة ── */}
      <div className="section">
        <h2 className="section-title">
          <span className="icon">🏆</span>
          إعداد المسابقة
        </h2>
        <div className="divider" />

        {leagueCfg && (
          <div className="league-current">
            <div className="league-current-label">المسابقة الحالية</div>
            <div className="league-current-name">{leagueCfg.leagueName}</div>
            <div className="league-current-sub">{leagueCfg.countryName} · موسم {leagueCfg.season}</div>
          </div>
        )}

        <div className="league-search-row">
          <input
            className="league-search-input"
            placeholder="ابحث عن بطولة... (مثال: Saudi, Premier, Champions)"
            value={leagueSearch}
            onChange={(e) => setLeagueSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLeagueSearch()}
          />
          <button className="btn-primary league-search-btn"
            onClick={handleLeagueSearch} disabled={leagueLoading}>
            {leagueLoading ? '...' : '🔍'}
          </button>
        </div>

        {leagueResults.map((lg) => (
          <div key={lg.id} className={`league-result-row${selectedLeague?.id === lg.id ? ' selected' : ''}`}
            onClick={() => handleLeaguePick(lg)}>
            {lg.logo && <img src={lg.logo} alt="" className="league-logo" />}
            <div>
              <div className="league-result-name">{lg.name}</div>
              <div className="league-result-country">{lg.country}</div>
            </div>
          </div>
        ))}

        {selectedLeague && (
          <div style={{ marginTop: 12 }}>
            <div className="league-season-label">اختر الموسم:</div>
            <div className="league-seasons">
              {selectedLeague.seasons.map((yr) => (
                <button key={yr} onClick={() => setSelectedSeason(String(yr))}
                  className={`season-btn${selectedSeason === String(yr) ? ' active' : ''}`}>
                  {yr}
                </button>
              ))}
            </div>
            <button className="btn-primary" style={{ marginTop: 10 }} onClick={handleLeagueConfirm}>
              ✓ تأكيد وحفظ المسابقة
            </button>
          </div>
        )}

        {shareUrl && (
          <div className="share-url-box">
            <div className="share-url-label">أرسل هذا الرابط للمشتركين لتطبيق المسابقة عندهم:</div>
            <div className="share-url-row">
              <input readOnly value={shareUrl} className="share-url-input"
                onFocus={(e) => e.currentTarget.select()} />
              <button className="btn-primary" style={{ padding: '8px 14px', flexShrink: 0 }}
                onClick={() => navigator.clipboard.writeText(shareUrl).then(() => {
                  setMsg('تم نسخ الرابط ✓'); setTimeout(() => setMsg(''), 2000);
                })}>
                نسخ
              </button>
            </div>
          </div>
        )}
      </div>

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
          <p className="empty-msg">لا توجد مباريات — حدد مسابقة أولاً</p>
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
