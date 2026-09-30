import { ArrowLeft, AlertTriangle, Clock, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PrintForm from '../components/PrintForm';
import StatusBadge from '../components/StatusBadge';
import { api } from '../services/api';
import { errorMessage, formatDate, formatTime } from '../lib/utils';
import type { Print } from '../types';

export default function PrintDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printId = Number(id);
  const [print, setPrint] = useState<Print | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const load = async () => {
    try {
      const data = await api.prints.get(printId);
      setPrint(data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  useEffect(() => {
    load();
  }, [printId]);

  async function remove() {
    if (!print || !confirm('Excluir esta impressão?')) return;
    await api.prints.remove(print.id);
    navigate('/prints');
  }

  if (error) return <p className="card text-center text-red-600">{error}</p>;
  if (!print) return <p className="text-slate-500">Carregando...</p>;

  return (
    <div className="space-y-5">
      <Link to="/prints" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="card dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Detalhes da impressão</p>
            <h1 className="mt-1 text-2xl font-bold dark:text-slate-100">#{print.id}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={print.status} />
            <button onClick={() => setEditing(true)} className="btn-ghost !px-3"><Pencil size={14} /> Editar</button>
            <button onClick={remove} className="btn-ghost !px-3 text-red-600"><Trash2 size={14} /> Excluir</button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
          {print.imageUrl && (
            <img src={print.imageUrl} alt="Imagem da impressão" className="h-56 w-full rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
          )}

          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
            <p><strong>Modelo:</strong> {print.model?.name ?? 'N/D'}</p>
            <p><strong>Material:</strong> {print.material}</p>
            <p><strong>Cor:</strong> {print.color}</p>
            <p><strong>Quantidade:</strong> {print.quantity}</p>
            <p><strong>Tempo estimado:</strong> {formatTime(print.estimatedTime)}</p>
            <p><strong>Criada em:</strong> {formatDate(print.createdAt)}</p>
            {print.finishedAt && <p><strong>Concluída em:</strong> {formatDate(print.finishedAt)}</p>}
            {print.notes && <p><strong>Observações:</strong> {print.notes}</p>}
          </div>
        </div>

        {print.hasIssue && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle size={16} className="mt-0.5" />
            <div>
              <strong>Defeito / retrabalho:</strong>
              <p className="mt-1">{print.issueNotes || 'Foi identificado um problema nesta impressão.'}</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Clock size={14} />
          {print.status === 'CONCLUIDA' ? 'Concluída' : print.status === 'EM_ANDAMENTO' ? 'Em andamento' : print.status === 'CANCELADA' ? 'Cancelada' : 'Pendente'}
        </div>
      </div>

      {editing && (
        <PrintForm
          models={[]}
          initial={print}
          onClose={() => setEditing(false)}
          onSubmit={async (data) => {
            await api.prints.update(print.id, data);
            setEditing(false);
            load();
          }}
        />
      )}
    </div>
  );
}
