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
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm !p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={48} />
          <h1 className="mt-3 text-xl font-bold">Criar conta</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nome</label><input className="input" value={form.name} onChange={set('name')} required /></div>
          <div><label className="label">E-mail</label><input className="input" type="email" value={form.email} onChange={set('email')} required /></div>
          <div><label className="label">Senha</label><input className="input" type="password" minLength={6} value={form.password} onChange={set('password')} required /></div>
          <div><label className="label">Confirmar senha</label><input className="input" type="password" value={form.confirm} onChange={set('confirm')} required /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? 'Criando...' : 'CADASTRAR'}</button>
        </form>
        <p className="mt-5 text-center text-sm">
          <Link to="/login" className="text-indigo-600 hover:underline">Já tenho conta</Link>
        </p>
      </div>
    </div>
  );
}
