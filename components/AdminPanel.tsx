'use client';

import { useEffect, useState } from 'react';
import type { Match, MatchOutcome } from '../lib/matches';
import {
  getAllUsers, approveUser, rejectUser,
  getMatchResults, setMatchResult, clearMatchResult, recalculateAllPoints,
  getCompetitions, addCompetition, removeCompetition, setCompetitionActive,
  getManualMatches, setManualMatches, clearManualMatches,
} from '../lib/storage';
import type { StoredUser, MatchResult, Competition } from '../lib/storage';

const ADMIN_PASS    = 'Saud&Fahad=Heart';
const ADMIN_SESSION = 'twaq3_admin_session';

function isAdminSessionValid(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(ADMIN_SESSION);
    if (!raw) return false;
    const { expiresAt } = JSON.parse(raw) as { expiresAt: number };
    return Date.now() < expiresAt;
  } catch { return false; }
}

function saveAdminSession() {
  localStorage.setItem(ADMIN_SESSION, JSON.stringify({
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
  }));
}

export default function AdminPanel() {
  const [authed,   setAuthed]  = useState(() => isAdminSessionValid());
  const [pass,     setPass]    = useState('');
  const [passErr,  setPassErr] = useState(false);
  const [users,    setUsers]   = useState<StoredUser[]>([]);
  const [msg,      setMsg]     = useState('');

  // إدارة البطولات
  const [competitions, setComps]     = useState<Competition[]>([]);
  const [lookupInput,  setLookup]    = useState('');
  const [lookupRes,    setLookupRes] = useState<Competition | null>(null);
  const [lookupLoading, setLL]       = useState(false);
  const [shareUrl,     setShareUrl]  = useState('');

  // الإدخال اليدوي
  const [manualText,    setManualText]    = useState('');
  const [manualParsed,  setManualParsed]  = useState<Match[]>([]);
  const [manualSaved,   setManualSaved]   = useState(false);

  // النتائج
  const [selComp,    setSelComp]  = useState<string>('');
  const [matches,    setMatches]  = useState<Match[]>([]);
  const [results,    setResults]  = useState<MatchResult[]>([]);
  const [loadingM,   setLoadingM] = useState(false);

  const flash = (m: string, t = 3500) => { setMsg(m); setTimeout(() => setMsg(''), t); };

  function parseMatchText(text: string): Match[] {
    const blocks = text.trim().split(/\n\s*\n/);
    const parsed: Match[] = [];
    for (const block of blocks) {
      const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) continue;
      // السطر الأول يبدأ بأرقام (التاريخ)، السطر التالي هو الفريقان
      const dateLine = lines.find((l) => /^\d/.test(l)) ?? '';
      const teamLine = lines.find((l) => /^[؀-ۿa-zA-Z]/.test(l)) ?? '';
      if (!teamLine) continue;
      // الفصل بين الفريقين بـ " - "
      const sep = teamLine.lastIndexOf(' - ');
      if (sep === -1) continue;
      const home = teamLine.slice(0, sep).trim();
      const away = teamLine.slice(sep + 3).trim();
      if (!home || !away) continue;
      // معرّف ثابت بناءً على محتوى المباراة
      let h = 0;
      for (const c of `${home}|${away}|${dateLine}`) { h = ((h << 5) - h + c.charCodeAt(0)) | 0; }
      parsed.push({ id: `m${Math.abs(h).toString(36)}`, home, away, date: dateLine });
    }
    return parsed;
  }

  const refreshComps = () => {
    const comps = getCompetitions();
    setComps(comps);
    return comps;
  };

  const refreshUsers   = () => setUsers(getAllUsers());
  const refreshResults = (lid: string) => setResults(getMatchResults(lid));

  const loadMatchesFor = (lid: string) => {
    setLoadingM(true);
    setMatches([]);
    fetch(`/api/upcoming?league=${lid}`)
      .then((r) => r.json())
      .then((d) => { if (d.fixtures) setMatches(d.fixtures); })
      .catch(() => {})
      .finally(() => setLoadingM(false));
  };

  useEffect(() => {
    if (!authed) return;
    refreshUsers();
    const comps = refreshComps();
    const first = comps.find((c) => c.active);
    if (first) {
      setSelComp(first.id);
      refreshResults(first.id);
      const saved = getManualMatches(first.id);
      if (saved.length) { setMatches(saved); setManualParsed(saved); setManualSaved(true); }
      else loadMatchesFor(first.id);
    }
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === ADMIN_PASS) { saveAdminSession(); setAuthed(true); setPassErr(false); }
    else setPassErr(true);
  };

  // ── البطولات ──
  const handleLookup = async () => {
    const raw = lookupInput.trim();
    if (!raw) return;
    setLL(true);
    setLookupRes(null);
    try {
      const res  = await fetch(`/api/league-lookup?id=${encodeURIComponent(raw)}`);
      const data = await res.json();
      if (data.league) setLookupRes(data.league);
      else flash('لم يتم العثور على البطولة — تحقق من الرقم أو الرابط');
    } catch {
      flash('فشل الاتصال — تحقق من الإنترنت');
    } finally {
      setLL(false);
    }
  };

  const handleAddComp = () => {
    if (!lookupRes) return;
    addCompetition(lookupRes);
    refreshComps();
    setLookupRes(null);
    setLookup('');
    flash('✓ تمت إضافة البطولة');
  };

  const handleToggleActive = (id: string, active: boolean) => {
    setCompetitionActive(id, active);
    refreshComps();
  };

  const handleRemoveComp = (id: string) => {
    removeCompetition(id);
    const comps = refreshComps();
    if (selComp === id) {
      const first = comps.find((c) => c.active);
      if (first) { setSelComp(first.id); loadMatchesFor(first.id); refreshResults(first.id); }
      else { setSelComp(''); setMatches([]); setResults([]); }
    }
  };

  const handleGenerateShare = () => {
    const active = competitions.filter((c) => c.active);
    if (!active.length) { flash('لا توجد بطولات نشطة لمشاركتها'); return; }
    const ids = active.map((c) => c.id).join(',');
    const url = `${window.location.origin}/?setup=${ids}`;
    setShareUrl(url);
  };

  // ── الإدخال اليدوي ──
  const handleParseManual = () => {
    const parsed = parseMatchText(manualText);
    setManualParsed(parsed);
    setManualSaved(false);
    if (!parsed.length) flash('لم يتم التعرف على أي مباراة — تحقق من الصيغة');
  };

  const handleSaveManual = () => {
    if (!selComp) { flash('اختر بطولة أولاً'); return; }
    if (!manualParsed.length) { flash('لا توجد مباريات للحفظ — اضغط "معاينة" أولاً'); return; }
    setManualMatches(selComp, manualParsed);
    setMatches(manualParsed);
    setManualSaved(true);
    flash(`✓ تم حفظ ${manualParsed.length} مباراة يدوياً`);
  };

  const handleClearManual = () => {
    if (!selComp) return;
    clearManualMatches(selComp);
    setManualText('');
    setManualParsed([]);
    setManualSaved(false);
    loadMatchesFor(selComp);
    flash('تم مسح المباريات اليدوية — جاري التحميل من API');
  };

  // ── تبديل البطولة في قسم النتائج ──
  const handleSelComp = (id: string) => {
    setSelComp(id);
    // تحميل النص اليدوي المحفوظ إن وجد
    const saved = getManualMatches(id);
    if (saved.length) {
      setMatches(saved);
      setManualParsed(saved);
      setManualSaved(true);
    } else {
      loadMatchesFor(id);
      setManualParsed([]);
      setManualSaved(false);
    }
    setManualText('');
    refreshResults(id);
  };

  // ── النتائج (مع احتساب تلقائي للنقاط) ──
  const handleResult = (matchId: string, outcome: MatchOutcome) => {
    const existing = results.find((r) => r.matchId === matchId)?.result;
    if (existing === outcome) clearMatchResult(selComp, matchId);
    else setMatchResult(selComp, matchId, outcome);
    refreshResults(selComp);
    recalculateAllPoints();
    refreshUsers();
  };

  const handleAutoFetch = async () => {
    if (!selComp) { flash('اختر بطولة أولاً'); return; }
    flash('جاري جلب النتائج من API...');
    try {
      const res  = await fetch(`/api/fetch-results?league=${selComp}`);
      const data = await res.json() as {
        results?: { id: string; home: string; away: string; outcome: MatchOutcome }[];
        error?: string;
      };
      if (data.error) { flash(`خطأ: ${data.error}`); return; }

      let count = 0;
      for (const r of data.results ?? []) {
        const match = matches.find((m) => m.id === r.id || (m.home === r.home && m.away === r.away));
        if (match) { setMatchResult(selComp, match.id, r.outcome); count++; }
      }
      refreshResults(selComp);
      recalculateAllPoints();
      refreshUsers();
      flash(count > 0 ? `✓ تم جلب ${count} نتيجة وتحديث النقاط` : 'لا توجد نتائج مطابقة للمباريات الحالية');
    } catch {
      flash('فشل الاتصال — تحقق من الاتصال بالإنترنت');
    }
  };

  // ── تسجيل الدخول ──
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
  const activeComps = competitions.filter((c) => c.active);

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

      {/* ── إدارة البطولات ── */}
      <div className="section">
        <h2 className="section-title"><span className="icon">🏆</span>إدارة البطولات</h2>
        <div className="divider" />

        {/* إضافة بطولة جديدة */}
        <div className="league-search-row">
          <input
            className="league-search-input"
            placeholder="رقم البطولة أو رابطها من TheSportsDB"
            value={lookupInput}
            onChange={(e) => setLookup(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            dir="ltr"
          />
          <button className="btn-primary league-search-btn" onClick={handleLookup} disabled={lookupLoading}>
            {lookupLoading ? '...' : '🔍'}
          </button>
        </div>

        {lookupRes && (
          <div className="comp-lookup-result">
            {lookupRes.badge && <img src={lookupRes.badge} alt="" className="league-logo" />}
            <div style={{ flex: 1 }}>
              <div className="league-result-name">{lookupRes.name}</div>
              <div className="league-result-country">{lookupRes.country} · #{lookupRes.id}</div>
            </div>
            <button className="btn-approve" onClick={handleAddComp}>+ إضافة</button>
          </div>
        )}

        {/* قائمة البطولات المحفوظة */}
        {competitions.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {competitions.map((c) => (
              <div key={c.id} className="comp-manage-row">
                {c.badge && <img src={c.badge} alt="" className="league-logo" />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.country} · #{c.id}</div>
                </div>
                <div className="comp-manage-actions">
                  <button
                    className={c.active ? 'btn-reject' : 'btn-approve'}
                    onClick={() => handleToggleActive(c.id, !c.active)}
                    style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                  >
                    {c.active ? 'إيقاف' : 'تفعيل'}
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleRemoveComp(c.id)}
                    style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* رابط المشاركة */}
        <button className="btn-primary" style={{ marginTop: 14 }} onClick={handleGenerateShare}>
          🔗 توليد رابط المشاركة
        </button>
        {shareUrl && (
          <div className="share-url-box" style={{ marginTop: 10 }}>
            <div className="share-url-label">أرسل هذا الرابط للأعضاء لتطبيق البطولات عندهم:</div>
            <div className="share-url-row">
              <input readOnly value={shareUrl} className="share-url-input"
                onFocus={(e) => e.currentTarget.select()} dir="ltr" />
              <button className="btn-primary" style={{ padding: '8px 14px', flexShrink: 0 }}
                onClick={() => navigator.clipboard.writeText(shareUrl).then(() => flash('تم نسخ الرابط ✓', 2000))}>
                نسخ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── إدخال المباريات يدوياً ── */}
      <div className="section">
        <h2 className="section-title"><span className="icon">✏️</span>إدخال المباريات يدوياً</h2>
        <div className="divider" />

        {activeComps.length > 1 && (
          <div style={{ marginBottom: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            البطولة المحددة: <strong style={{ color: 'var(--green)' }}>
              {competitions.find((c) => c.id === selComp)?.name ?? selComp}
            </strong>
          </div>
        )}

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.7 }}>
          الصيغة: التاريخ والوقت في السطر الأول، ثم اسم الفريق الأول - اسم الفريق الثاني
        </div>

        <textarea
          className="manual-matches-input"
          placeholder={`11/06/26 - 10:00 م\nالمكسيك - جنوب أفريقيا\n\n12/06/26 - 05:00 ص\nكوريا الجنوبية - جمهورية التشيك`}
          value={manualText}
          onChange={(e) => { setManualText(e.target.value); setManualParsed([]); setManualSaved(false); }}
          rows={10}
          dir="rtl"
        />

        {manualParsed.length > 0 && (
          <div className="manual-preview">
            <div className="manual-preview-title">معاينة — {manualParsed.length} مباريات:</div>
            {manualParsed.map((m, i) => (
              <div key={m.id} className="manual-preview-row">
                <span className="manual-preview-num">{i + 1}</span>
                <span>{m.home}</span>
                <span className="manual-preview-vs">vs</span>
                <span>{m.away}</span>
                <span className="manual-preview-date">{m.date}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleParseManual}
            disabled={!manualText.trim()}>
            👁️ معاينة
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleSaveManual}
            disabled={!manualParsed.length || manualSaved}>
            {manualSaved ? '✓ محفوظ' : '💾 حفظ'}
          </button>
        </div>

        {manualSaved && (
          <button className="btn-reject" style={{ width: '100%', marginTop: 8, padding: '10px' }}
            onClick={handleClearManual}>
            🗑️ مسح وإعادة الجلب من API
          </button>
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
                <button className="btn-approve" onClick={() => { approveUser(u.id); refreshUsers(); }}>✓ قبول</button>
                <button className="btn-reject"  onClick={() => { rejectUser(u.id);  refreshUsers(); }}>✗ رفض</button>
              </div>
            </div>
          ))
        }
      </div>

      {/* ── نتائج المباريات ── */}
      <div className="section">
        <h2 className="section-title"><span className="icon">⚽</span>نتائج المباريات</h2>
        <div className="divider" />

        {activeComps.length > 1 && (
          <div className="comp-tabs-bar">
            {activeComps.map((c) => (
              <button key={c.id}
                className={`comp-tab${selComp === c.id ? ' active' : ''}`}
                onClick={() => handleSelComp(c.id)}>
                {c.badge && <img src={c.badge} alt="" className="comp-tab-badge" />}
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        )}

        {!selComp ? (
          <p className="empty-msg">أضف بطولة أولاً وفعّلها</p>
        ) : loadingM ? (
          <p className="empty-msg">جاري تحميل المباريات...</p>
        ) : matches.length === 0 ? (
          <p className="empty-msg">لا توجد مباريات قادمة لهذه البطولة</p>
        ) : (
          matches.map((match) => {
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
                      onClick={() => handleResult(match.id, o)}>
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
          })
        )}

        <button className="btn-primary" style={{ marginTop: 12 }} onClick={handleAutoFetch} disabled={!selComp}>
          🔄 جلب النتائج تلقائياً من API
        </button>
      </div>

      {/* ── الأعضاء المعتمدون ── */}
      <div className="section">
        <h2 className="section-title"><span className="icon">👥</span>الأعضاء ({approved.length})</h2>
        <div className="divider" />
        {approved.length === 0
          ? <p className="empty-msg">لا يوجد أعضاء معتمدون بعد</p>
          : (
            <>
              <div className="lb-row-header">
                <span></span><span>الاسم</span><span style={{ textAlign: 'left' }}>النقاط</span>
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
              <button className="btn-approve" onClick={() => { approveUser(u.id); refreshUsers(); }}>إعادة قبول</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
