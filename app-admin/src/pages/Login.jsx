import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import logoMark from '../assets/logo-mark.png';

export default function Login() {
  const { adminUser, login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (adminUser) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await login(email, password);
    if (error) setError(error);
    setBusy(false);
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <img className="auth-card__logo" src={logoMark} alt="EAFIT" />
        <div className="auth-card__brand">EAFIT Admin</div>
        <p className="auth-card__subtitle">Acesso restrito ao backoffice</p>

        <label className="field">
          <span className="field__label">E-mail</span>
          <input
            className="input" type="email" required autoFocus
            value={email} onChange={e => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Senha</span>
          <input
            className="input" type="password" required
            value={password} onChange={e => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="form-msg form-msg--error">{error}</p>}

        <button className="btn btn--primary btn--full" type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
