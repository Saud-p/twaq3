'use client';

import { useState } from 'react';
import { registerUser, loginUser, StoredUser } from '../lib/storage';

interface LoginFormProps {
  onAuth: (user: StoredUser) => void;
}

export default function LoginForm({ onAuth }: LoginFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const switchMode = (m: 'login' | 'register') => { setMode(m); setError(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim())          { setError('يرجى إدخال الاسم'); return; }
      if (!phone.trim())         { setError('يرجى إدخال رقم الجوال'); return; }
      if (password.length < 4)   { setError('كلمة المرور 4 أحرف على الأقل'); return; }
      if (password !== confirm)  { setError('كلمتا المرور غير متطابقتين'); return; }

      const result = registerUser(name, phone.trim(), password);
      if (result === 'exists')   { setError('رقم الجوال مسجّل مسبقاً — سجّل دخولك'); return; }

      setError('');
      // show pending message instead of logging in
      setMode('pending' as never);
      return;
    }

    const user = loginUser(phone.trim(), password);
    if (!user)           { setError('رقم الجوال أو كلمة المرور غير صحيحة'); return; }
    if (user === 'pending')  { setError('حسابك قيد المراجعة، انتظر موافقة الإدارة'); return; }
    if (user === 'rejected') { setError('تم رفض طلب تسجيلك، تواصل مع الإدارة'); return; }
    onAuth(user);
  };

  // After successful registration — show waiting screen
  if ((mode as string) === 'pending') {
    return (
      <div className="section">
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⏳</div>
          <h3 style={{ color: 'var(--green)', marginBottom: 8 }}>تم إرسال طلبك!</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            طلب تسجيلك قيد المراجعة.<br />سيتم تفعيل حسابك بعد موافقة الإدارة.
          </p>
          <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => switchMode('login')}>
            العودة للدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="auth-tabs">
        <button type="button" className={`auth-tab${mode === 'login' ? ' active' : ''}`} onClick={() => switchMode('login')}>
          تسجيل الدخول
        </button>
        <button type="button" className={`auth-tab${mode === 'register' ? ' active' : ''}`} onClick={() => switchMode('register')}>
          حساب جديد
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        {mode === 'register' && (
          <div className="login-field">
            <label>الاسم الكامل</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="محمد عبدالله" autoComplete="name" />
          </div>
        )}
        <div className="login-field">
          <label>رقم الجوال</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="05XXXXXXXX" inputMode="numeric" autoComplete="tel" />
        </div>
        <div className="login-field">
          <label>كلمة المرور</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
        </div>
        {mode === 'register' && (
          <div className="login-field">
            <label>تأكيد كلمة المرور</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••" autoComplete="new-password" />
          </div>
        )}
        <button type="submit" className="btn-primary">
          {mode === 'register' ? 'إرسال طلب التسجيل' : 'دخول'}
        </button>
      </form>
    </div>
  );
}
