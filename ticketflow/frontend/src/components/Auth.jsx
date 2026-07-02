import { useState } from 'react';
import { api, auth } from '../lib/api.js';

// Schermata di login / registrazione.
export default function Auth({ onAuth, notify }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    setLoading(true);
    try {
      if (mode === 'register') {
        await api.register(form);
        notify('success', 'Registrazione completata, ora accedi');
        setMode('login');
      } else {
        const { token, user } = await api.login({ email: form.email, password: form.password });
        auth.save(token, user);
        onAuth(user);
      }
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__logo">🎟️ TicketFlow</div>
        <p className="auth__subtitle">Prenota i tuoi eventi preferiti</p>

        <div className="auth__switch">
          <button className={mode === 'login' ? 'is-active' : ''} onClick={() => setMode('login')}>
            Accedi
          </button>
          <button className={mode === 'register' ? 'is-active' : ''} onClick={() => setMode('register')}>
            Registrati
          </button>
        </div>

        {mode === 'register' && (
          <input className="input" placeholder="Nome completo" value={form.full_name} onChange={update('full_name')} />
        )}
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={update('email')} />
        <input className="input" type="password" placeholder="Password" value={form.password} onChange={update('password')} />

        <button className="btn btn--primary btn--block" onClick={submit} disabled={loading}>
          {loading ? 'Attendere…' : mode === 'login' ? 'Accedi' : 'Crea account'}
        </button>

        <p className="auth__hint">Admin demo: <code>admin@ticketflow.dev</code> / <code>admin123</code></p>
      </div>
    </div>
  );
}
