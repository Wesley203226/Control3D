import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PrintForm from '../components/PrintForm';
import PrintItem from '../components/PrintItem';
import { STATUS_LABEL } from '../lib/utils';
import { api } from '../services/api';
import type { Model, Print, Status } from '../types';

export default function Prints() {
  const [models, setModels] = useState<Model[]>([]);
  const [prints, setPrints] = useState<Print[]>([]);
  const [filter, setFilter] = useState<Status | ''>('');
  const [onlyIssue, setOnlyIssue] = useState(false);
  const [form, setForm] = useState<{ open: boolean; print?: Print }>({ open: false });

  const load = () => api.prints.list(filter).then((list) => {
    const filtered = onlyIssue ? list.filter((item) => item.hasIssue) : list;
    setPrints(filtered);
  });

  useEffect(() => {
    load();
  }, [filter, onlyIssue]);

  useEffect(() => {
    api.models.list().then(setModels);
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold dark:text-slate-100">Impressões</h1>
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value as Status | '')}>
            <option value="">Todos os status</option>
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <input type="checkbox" checked={onlyIssue} onChange={(e) => setOnlyIssue(e.target.checked)} />
            Só com defeito
          </label>
          <button className="btn-primary" disabled={!models.length} onClick={() => setForm({ open: true })}>
            <Plus size={16} /> Nova impressão
          </button>
        </div>
      </div>

      {!models.length && (
        <p className="card mb-4 text-sm text-slate-600 dark:text-slate-300">
          Você precisa de um modelo antes de criar impressões. <Link to="/models" className="text-indigo-600 hover:underline dark:text-indigo-400">Cadastrar modelo</Link>
        </p>
      )}

      <div className="space-y-3">
        {prints.map((p) => (
          <PrintItem key={p.id} print={p} onEdit={(pr) => setForm({ open: true, print: pr })} onChanged={load} />
        ))}
        {!prints.length && <p className="card text-center text-slate-500 dark:text-slate-400">Nenhuma impressão encontrada.</p>}
      </div>

      {form.open && (
        <PrintForm
          models={models}
          initial={form.print}
          onClose={() => setForm({ open: false })}
          onSubmit={async (d) => {
            if (form.print) await api.prints.update(form.print.id, d);
            else await api.prints.create(d);
            load();
          }}
        />
      )}
    </div>
  );
}
