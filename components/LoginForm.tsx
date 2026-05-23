'use client';

import { useState } from 'react';

interface LoginFormProps {
  onLogin: (phone: string) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!phone || !password) return;
    onLogin(phone);
  };

  return (
    <section className="card">
      <h2>تسجيل الدخول</h2>
      <form onSubmit={handleSubmit} className="form">
        <label>
          رقم الجوال
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05XXXXXXXX"
          />
        </label>
        <label>
          كلمة المرور
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />
        </label>
        <button type="submit">دخول</button>
      </form>
    </section>
  );
}
