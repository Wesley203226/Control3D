import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PrintForm from '../components/PrintForm';
import PrintItem from '../components/PrintItem';
import { STATUS_LABEL } from '../lib/utils';
import { errorMessage } from '../lib/utils';
import { api } from '../services/api';
import type { Model, Print, Status } from '../types';

export default function Prints() {
  const [models, setModels] = useState<Model[]>([]);
  const [prints, setPrints] = useState<Print[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Status | ''>('');
  const [onlyIssue, setOnlyIssue] = useState(false);
  const [form, setForm] = useState<{ open: boolean; print?: Print }>({ open: false });

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.prints.list(filter);
      setPrints(onlyIssue ? list.filter((item) => item.hasIssue) : list);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filter, onlyIssue]);

  useEffect(() => {
    api.models.list().then(setModels).catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Impressões</h1>
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value as Status | '')}>
            <option value="">Todos os status</option>
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <label className="filter-pill">
            <input type="checkbox" checked={onlyIssue} onChange={(e) => setOnlyIssue(e.target.checked)} />
            Só com defeito
          </label>
          <button className="btn-primary" disabled={!models.length} onClick={() => setForm({ open: true })}>
            <Plus size={16} /> Nova impressão
          </button>
        </div>
      </div>

      {!models.length && (
        <p className="card mb-4 text-sm">
          <span className="muted">Você precisa de um modelo antes de criar impressões. </span>
          <Link to="/models" className="text-link">Cadastrar modelo</Link>
        </p>
      )}

      <div className="space-y-3">
        {prints.map((p) => (
          <PrintItem key={p.id} print={p} onEdit={(pr) => setForm({ open: true, print: pr })} onChanged={load} />
        ))}
        {loading && <><div className="skeleton" /><div className="skeleton" /></>}
        {error && <p className="card form-error text-center">Não foi possível carregar as impressões: {error}</p>}
        {!loading && !error && !prints.length && <p className="card muted text-center">Nenhuma impressão encontrada.</p>}
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
