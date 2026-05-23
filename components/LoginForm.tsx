'use client';

import { useState } from 'react';
import { registerUser, loginUser, StoredUser } from '../lib/storage';

interface LoginFormProps {
  onAuth: (user: StoredUser) => void;
}

export default function LoginForm({ onAuth }: LoginFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError('');
    setConfirm('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim() || !password.trim()) {
      setError('يرجى ملء جميع الحقول');
      return;
    }

    if (mode === 'register') {
      if (password.length < 4) { setError('كلمة المرور 4 أحرف على الأقل'); return; }
      if (password !== confirm) { setError('كلمتا المرور غير متطابقتين'); return; }
      const result = registerUser(phone.trim(), password);
      if (result === 'exists') { setError('رقم الجوال مسجّل مسبقاً — سجّل دخولك'); return; }
      onAuth(result);
    } else {
      const user = loginUser(phone.trim(), password);
      if (!user) { setError('رقم الجوال أو كلمة المرور غير صحيحة'); return; }
      onAuth(user);
    }
  };

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
          {mode === 'register' ? 'إنشاء الحساب' : 'دخول'}
        </button>
      </form>
    </div>
  );
}
