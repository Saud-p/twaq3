'use client';

import { useState } from 'react';

interface LoginFormProps {
  onLogin: (phone: string) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password.trim()) return;
    onLogin(phone.trim());
  };

  return (
    <div className="section">
      <h2 className="section-title">
        <span className="icon">🔑</span>
        تسجيل الدخول
      </h2>
      <div className="divider" />
      <form onSubmit={handleSubmit}>
        <div className="login-field">
          <label>رقم الجوال</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05XXXXXXXX"
            inputMode="numeric"
            autoComplete="tel"
          />
        </div>
        <div className="login-field">
          <label>كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn-primary">دخول</button>
      </form>
    </div>
  );
}
