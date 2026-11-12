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

  if (error) return <p className="card form-error text-center">{error}</p>;
  if (!model) return <div className="skeleton" />;

  return (
    <div>
      <Link to="/models" className="back-link">
        <ArrowLeft size={14} /> Voltar
      </Link>
      <div className="card mb-6">
        {model.imageUrl && <img src={model.imageUrl} alt={`Projeto ${model.name}`} className="-mx-5 -mt-5 mb-5 h-64 w-[calc(100%+2.5rem)] rounded-t-[19px] object-cover" />}
        <h1 className="page-title">{model.name}</h1>
        <span className="chip mt-2">{model.category}</span>
        {model.description && <p className="muted mt-3">{model.description}</p>}
        {(model.sizeX || model.sizeY || model.sizeZ) && (
          <p className="muted mt-3 text-sm">Dimensões: {model.sizeX ?? '—'} × {model.sizeY ?? '—'} × {model.sizeZ ?? '—'} mm</p>
        )}
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
        {!prints.length && <p className="card muted text-center">Este modelo ainda não tem impressões.</p>}
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
