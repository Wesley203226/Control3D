import { ArrowLeft, AlertTriangle, Clock, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PrintForm from '../components/PrintForm';
import StatusBadge from '../components/StatusBadge';
import { api } from '../services/api';
import { errorMessage, formatDate, formatTime } from '../lib/utils';
import type { Print } from '../types';
import ElapsedTimer from '../components/ElapsedTimer';

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
    try {
      await api.prints.remove(print.id);
      toast.success('Impressão excluída');
      navigate('/prints');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (error) return <p className="card form-error text-center">{error}</p>;
  if (!print) return <div className="skeleton" />;

  return (
    <div className="space-y-5">
      <Link to="/prints" className="back-link">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="muted text-xs font-semibold uppercase tracking-[0.14em]">Detalhes da impressão</p>
            <h1 className="page-title mt-1">#{print.id}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={print.status} />
            <button onClick={() => setEditing(true)} className="btn-ghost !px-3"><Pencil size={14} /> Editar</button>
            <button onClick={remove} className="btn-ghost !px-3 text-red-600"><Trash2 size={14} /> Excluir</button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
          {print.imageUrl && (
            <img src={print.imageUrl} alt="Imagem da impressão" className="h-56 w-full rounded-xl object-cover ring-1 ring-white/20" />
          )}

          <div className="space-y-3 text-sm">
            <p><strong>Projeto:</strong> {print.model?.name ?? 'N/D'}</p>
            <p><strong>Material:</strong> {print.material}</p>
            <p><strong>Cor:</strong> {print.color}</p>
            <p><strong>Quantidade:</strong> {print.quantity}</p>
            <p><strong>Filamento utilizado:</strong> {print.filamentUsedGrams ?? 0} g</p>
            <p><strong>Suportes:</strong> {print.hasSupports ? 'Sim' : 'Não'}</p>
            <p><strong>Tempo estimado:</strong> {formatTime(print.estimatedTime)}</p>
            <p><strong>Tempo real:</strong> <ElapsedTimer status={print.status} startedAt={print.startedAt} createdAt={print.createdAt} actualTimeMinutes={print.actualTimeMinutes} /></p>
            <p><strong>Peça descartada:</strong> {print.discarded ? 'Sim, por falha na impressão' : 'Não'}</p>
            <p><strong>Criada em:</strong> {formatDate(print.createdAt)}</p>
            {print.finishedAt && <p><strong>{print.status === 'CANCELADA' ? 'Cancelada em:' : 'Finalizada em:'}</strong> {formatDate(print.finishedAt)}</p>}
            {print.notes && <p><strong>Observações:</strong> {print.notes}</p>}
          </div>
        </div>

        {print.hasIssue && (
          <div className="alert-warn mt-5">
            <AlertTriangle size={16} className="mt-0.5" />
            <div>
              <strong>Defeito / retrabalho:</strong>
              <p className="mt-1">{print.issueNotes || 'Foi identificado um problema nesta impressão.'}</p>
            </div>
          </div>
        )}

        <div className="muted mt-5 flex items-center gap-2 text-sm">
          <Clock size={14} />
          {print.status === 'CONCLUIDA' ? 'Concluída' : print.status === 'EM_ANDAMENTO' ? 'Em andamento' : print.status === 'CANCELADA' ? 'Cancelada' : 'Pendente'}
        </div>
      </div>

      {editing && (
        <PrintForm
          models={print.model ? [print.model] : []}
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
