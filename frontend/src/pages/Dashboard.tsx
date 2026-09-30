import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PrintItem from '../components/PrintItem';
import PrintForm from '../components/PrintForm';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { Model, Print } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const [models, setModels] = useState<Model[]>([]);
  const [prints, setPrints] = useState<Print[]>([]);
  const [editing, setEditing] = useState<Print | null>(null);

  const load = () => {
    Promise.all([api.models.list(), api.prints.list()]).then(([m, p]) => {
      setModels(m);
      setPrints(p);
    });
  };
  useEffect(load, []);

  const count = (s: string) => prints.filter((p) => p.status === s).length;
  const withIssue = prints.filter((p) => p.hasIssue).length;
  const stats = [
    { label: 'Modelos', value: models.length },
    { label: 'Impressões', value: prints.length },
    { label: 'Pendentes', value: count('PENDENTE') },
    { label: 'Concluídas', value: count('CONCLUIDA') },
    { label: 'Com defeito', value: withIssue },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold dark:text-slate-100">Olá, {user?.name}.</h1>
      <p className="mb-6 text-slate-500 dark:text-slate-400">Acompanhe suas impressões 3D.</p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{s.value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold dark:text-slate-100">Impressões recentes</h2>
        <Link to="/prints" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">Ver todas</Link>
      </div>
      <div className="space-y-3">
        {prints.slice(0, 5).map((p) => (
          <PrintItem key={p.id} print={p} onEdit={setEditing} onChanged={load} />
        ))}
        {!prints.length && (
          <p className="card text-center text-slate-500 dark:text-slate-400">
            Nenhuma impressão ainda. <Link to="/models" className="text-indigo-600 hover:underline dark:text-indigo-400">Cadastre um modelo</Link> para começar.
          </p>
        )}
      </div>

      {editing && (
        <PrintForm
          models={models}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (d) => {
            await api.prints.update(editing.id, d);
            load();
          }}
        />
      )}
    </div>
  );
}
