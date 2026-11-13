import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import ModelForm from '../components/ModelForm';
import Modal from '../components/Modal';
import { errorMessage } from '../lib/utils';
import { api } from '../services/api';
import { saveModelStl } from '../lib/workspaceStorage';
import type { Model } from '../types';

export default function Models() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<{ open: boolean; model?: Model }>({ open: false });
  const [pendingDeletion, setPendingDeletion] = useState<Model | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setModels(await api.models.list());
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  async function remove(m: Model) {
    await api.models.remove(m.id);
    toast.success('Modelo excluído');
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="page-title">Meus projetos</h1>
        <button className="btn-primary" onClick={() => setForm({ open: true })}><Plus size={16} /> Novo projeto</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
          <div key={m.id} className="card lift flex flex-col">
            {m.imageUrl && <img src={m.imageUrl} alt={`Projeto ${m.name}`} className="-mx-5 -mt-5 mb-4 h-40 w-[calc(100%+2.5rem)] rounded-t-[19px] object-cover" />}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{m.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => setForm({ open: true, model: m })} className="icon-btn" title="Editar" aria-label={`Editar ${m.name}`}><Pencil size={15} /></button>
                <button onClick={() => setPendingDeletion(m)} className="icon-btn" title="Excluir" aria-label={`Excluir ${m.name}`}><Trash2 size={15} /></button>
              </div>
            </div>
            <span className="chip mt-2">{m.category}</span>
            {m.description && <p className="muted mt-2 line-clamp-2 text-sm">{m.description}</p>}
            <p className="muted mt-auto pt-4 text-sm">
              {m.printsCount} {m.printsCount === 1 ? 'impressão' : 'impressões'}
            </p>
            <Link to={`/models/${m.id}`} className="btn-ghost mt-2">Abrir projeto</Link>
          </div>
        ))}
      </div>
      {loading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="skeleton" />)}</div>}
      {error && <p className="card form-error text-center">Não foi possível carregar os modelos: {error}</p>}
      {!loading && !error && !models.length && <p className="card muted text-center">Nenhum projeto cadastrado ainda.</p>}

      {form.open && (
        <ModelForm
          initial={form.model}
          onClose={() => setForm({ open: false })}
          onSubmit={async (d, stlFile) => {
            const savedModel = form.model
              ? await api.models.update(form.model.id, d)
              : await api.models.create(d);
            if (stlFile) {
              try {
                await saveModelStl(savedModel.id, stlFile);
                toast.success('Arquivo STL salvo neste navegador');
              } catch (error) {
                toast.error(error instanceof Error ? `Projeto salvo, mas o STL não foi armazenado: ${error.message}` : 'Projeto salvo, mas não foi possível armazenar o STL.');
              }
            }
            load();
          }}
        />
      )}
      {pendingDeletion && (
        <ModelDeleteDialog
          model={pendingDeletion}
          onCancel={() => setPendingDeletion(null)}
          onConfirm={async () => {
            await remove(pendingDeletion);
            setPendingDeletion(null);
          }}
        />
      )}
    </div>
  );
}

function ModelDeleteDialog({ model, onCancel, onConfirm }: { model: Model; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);

  async function confirmDeletion() {
    setDeleting(true);
    try {
      await onConfirm();
    } catch {
      toast.error('Não foi possível excluir o modelo. Tente novamente.');
      setDeleting(false);
    }
  }

  return (
    <Modal title="Excluir modelo" onClose={onCancel}>
      <p className="muted text-sm">Excluir <strong className="text-[var(--text)]">{model.name}</strong>? As impressões relacionadas também serão removidas.</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={deleting}>Cancelar</button>
        <button type="button" className="btn-danger" onClick={confirmDeletion} disabled={deleting}>{deleting ? 'Excluindo...' : 'Confirmar'}</button>
      </div>
    </Modal>
  );
}
