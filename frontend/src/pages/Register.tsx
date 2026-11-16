import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { errorMessage } from '../lib/utils';
import { api } from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('As senhas não conferem.');
    setLoading(true);
    setError('');
    try {
      await api.register({ name: form.name, email: form.email, password: form.password });
      navigate('/login', { state: { registered: true, email: form.email.trim().toLowerCase() } });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="card w-full max-w-sm !p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={48} />
          <h1 className="page-title mt-3">Criar conta</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label" htmlFor="register-name">Nome</label><input id="register-name" className="input" value={form.name} onChange={set('name')} required /></div>
          <div><label className="label" htmlFor="register-email">E-mail</label><input id="register-email" className="input" type="email" value={form.email} onChange={set('email')} required /></div>
          <div><label className="label" htmlFor="register-password">Senha</label><input id="register-password" className="input" type="password" minLength={8} value={form.password} onChange={set('password')} required /><small className="muted text-xs">Use pelo menos 8 caracteres.</small></div>
          <div><label className="label" htmlFor="register-confirm">Confirmar senha</label><input id="register-confirm" className="input" type="password" value={form.confirm} onChange={set('confirm')} required /></div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? 'Criando...' : 'CADASTRAR'}</button>
        </form>
        <p className="mt-5 text-center text-sm">
          <Link to="/login" className="text-link">Já tenho conta</Link>
        </p>
      </div>
    </div>
  );
}
