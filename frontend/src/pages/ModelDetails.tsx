import { ArrowLeft, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import FilamentStock from '../components/FilamentStock';
import PrintForm from '../components/PrintForm';
import PrintItem from '../components/PrintItem';
import { api } from '../services/api';
import type { Model, Print } from '../types';

export default function ModelDetails() {
  const id = Number(useParams().id);
  const [model, setModel] = useState<Model | null>(null);
  const [prints, setPrints] = useState<Print[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState<{ open: boolean; print?: Print }>({ open: false });

  // Usa GET /models/:id e GET /models/:id/prints (relacionamento Modelo → Impressões)
  const load = () => {
    Promise.all([api.models.get(id), api.models.prints(id)])
      .then(([m, r]) => {
        setModel(m);
        setPrints(r.prints);
      })
      .catch((e) => setError(e.message));
  };
  useEffect(load, [id]);

  if (error) return <p className="card text-center text-red-600">{error}</p>;
  if (!model) return <p className="text-slate-500">Carregando...</p>;

  return (
    <div>
      <Link to="/models" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={14} /> Voltar
      </Link>
      <div className="card mb-6">
        <h1 className="text-2xl font-bold">{model.name}</h1>
        <span className="mt-1 inline-block rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{model.category}</span>
        {model.description && <p className="mt-3 text-slate-600">{model.description}</p>}
      </div>

      <FilamentStock modelId={id} prints={prints} />

      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Impressões ({prints.length})</h2>
        <button className="btn-primary" onClick={() => setForm({ open: true })} title="Criar uma nova impressão usando este modelo"><Plus size={16} /> Nova impressão</button>
      </div>
      <div className="space-y-3">
        {prints.map((p) => (
          <PrintItem key={p.id} print={p} showModel={false} onEdit={(pr) => setForm({ open: true, print: pr })} onChanged={load} />
        ))}
        {!prints.length && <p className="card text-center text-slate-500">Este modelo ainda não tem impressões.</p>}
      </div>

      {form.open && (
        <PrintForm
          models={[model]}
          fixedModelId={model.id}
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
