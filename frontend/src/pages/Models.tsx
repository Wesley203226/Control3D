import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ModelForm from '../components/ModelForm';
import { api } from '../services/api';
import type { Model } from '../types';

export default function Models() {
  const [models, setModels] = useState<Model[]>([]);
  const [form, setForm] = useState<{ open: boolean; model?: Model }>({ open: false });

  const load = () => api.models.list().then(setModels);
  useEffect(() => {
    load();
  }, []);

  async function remove(m: Model) {
    if (!confirm(`Excluir "${m.name}" e todas as suas impressões?`)) return;
    await api.models.remove(m.id);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meus modelos</h1>
        <button className="btn-primary" onClick={() => setForm({ open: true })}><Plus size={16} /> Novo modelo</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
          <div key={m.id} className="card flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{m.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => setForm({ open: true, model: m })} className="text-slate-400 hover:text-slate-700" title="Editar"><Pencil size={15} /></button>
                <button onClick={() => remove(m)} className="text-slate-400 hover:text-red-600" title="Excluir"><Trash2 size={15} /></button>
              </div>
            </div>
            <span className="mt-1 w-fit rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{m.category}</span>
            {m.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{m.description}</p>}
            <p className="mt-auto pt-4 text-sm text-slate-500">
              {m.printsCount} {m.printsCount === 1 ? 'impressão' : 'impressões'}
            </p>
            <Link to={`/models/${m.id}`} className="btn-ghost mt-2">Ver modelo</Link>
          </div>
        ))}
      </div>
      {!models.length && <p className="card text-center text-slate-500">Nenhum modelo cadastrado ainda.</p>}

      {form.open && (
        <ModelForm
          initial={form.model}
          onClose={() => setForm({ open: false })}
          onSubmit={async (d) => {
            if (form.model) await api.models.update(form.model.id, d);
            else await api.models.create(d);
            load();
          }}
        />
      )}
    </div>
  );
}
