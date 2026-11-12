import { AlertTriangle, Clock, Eye, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { celebrate } from '../lib/celebrate';
import { api } from '../services/api';
import { errorMessage, formatDate, formatTime } from '../lib/utils';
import type { Print, Status } from '../types';
import StatusBadge from './StatusBadge';
import ElapsedTimer from './ElapsedTimer';

const ACTIONS: Record<Status, { to: Status; label: string; danger?: boolean }[]> = {
  PENDENTE: [{ to: 'EM_ANDAMENTO', label: 'Iniciar' }, { to: 'CANCELADA', label: 'Cancelar', danger: true }],
  EM_ANDAMENTO: [{ to: 'CONCLUIDA', label: 'Concluir' }, { to: 'CANCELADA', label: 'Cancelar', danger: true }],
  CONCLUIDA: [],
  CANCELADA: [],
};

interface Props {
  print: Print;
  showModel?: boolean;
  onEdit: (p: Print) => void;
  onChanged: () => void;
}

export default function PrintItem({ print, showModel = true, onEdit, onChanged }: Props) {
  async function changeStatus(status: Status) {
    try {
      await api.prints.update(print.id, { status });
      if (status === 'CONCLUIDA') {
        celebrate();
        toast.success('Impressão concluída');
      } else {
        toast.success('Status atualizado');
      }
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove() {
    if (!confirm('Excluir esta impressão?')) return;
    try {
      await api.prints.remove(print.id);
      toast.success('Impressão excluída');
      onChanged();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="card lift flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-1 gap-3">
        {print.imageUrl && (
          <img
            src={print.imageUrl}
            alt={showModel ? print.model?.name ?? 'Imagem da impressão' : `Impressão #${print.id}`}
            className="h-24 w-24 rounded-xl object-cover ring-1 ring-white/20"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{showModel ? print.model?.name : `Impressão #${print.id}`}</p>
            <Link to={`/prints/${print.id}`} className="text-link inline-flex items-center gap-1 text-xs" title="Ver detalhes">
              <Eye size={12} /> detalhes
            </Link>
          </div>
          <p className="muted text-sm">
            {print.material} • {print.color} • {print.quantity} {print.quantity === 1 ? 'unidade' : 'unidades'}
          </p>
          <p className="muted mt-1 flex items-center gap-1 text-xs">
            <Clock size={12} /> {formatTime(print.estimatedTime)} • criada em {formatDate(print.createdAt)}
            {print.finishedAt && ` • ${print.status === 'CANCELADA' ? 'cancelada' : 'finalizada'} em ${formatDate(print.finishedAt)}`}
          </p>
          <p className="muted mt-1 text-xs">
            Tempo real: <ElapsedTimer status={print.status} startedAt={print.startedAt} createdAt={print.createdAt} actualTimeMinutes={print.actualTimeMinutes} />
            {' · '}{print.filamentUsedGrams ?? 0} g de filamento
            {print.hasSupports && ' · com suportes'}
            {print.discarded && ' · descartada'}
          </p>
          {print.notes && <p className="muted mt-1 text-xs italic">{print.notes}</p>}

          {print.hasIssue && (
            <div className="alert-warn mt-2 text-xs">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <div>
                <strong>Defeito / retrabalho:</strong>
                <p>{print.issueNotes || 'Foi identificado um problema nesta impressão.'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={print.status} />
        {ACTIONS[print.status].map((a) => (
          <button key={a.to} onClick={() => changeStatus(a.to)} className={`${a.danger ? 'btn-ghost text-red-600' : 'btn-primary'} !px-3 !py-1`}>
            {a.label}
          </button>
        ))}
        <button onClick={() => onEdit(print)} className="btn-ghost !px-2 !py-1" title="Editar"><Pencil size={14} /></button>
        <button onClick={remove} className="btn-ghost !px-2 !py-1 text-red-600" title="Excluir"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
