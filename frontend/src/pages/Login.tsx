import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage } from '../lib/utils';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const registered = (useLocation().state as { registered?: boolean } | null)?.registered;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="card w-full max-w-sm !p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={56} />
          <h1 className="page-title mt-3">CONTROL 3D</h1>
          <p className="muted text-sm">Controle suas impressões</p>
        </div>
        {registered && <p className="alert-ok mb-4">Conta criada. Faça login.</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
          <label className="label" htmlFor="login-email">E-mail</label>
          <input id="login-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@email.com" required />
          </div>
          <div>
          <label className="label" htmlFor="login-password">Senha</label>
          <input id="login-password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? 'Entrando...' : 'ENTRAR'}</button>
        </form>
        <p className="mt-5 text-center text-sm">
          <Link to="/register" className="text-link">Criar uma conta</Link>
        </p>
      </div>
    </div>
  );
}
