import { AlertTriangle, Clock, Eye, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { errorMessage, formatDate, formatTime } from '../lib/utils';
import type { Print, Status } from '../types';
import StatusBadge from './StatusBadge';

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
      onChanged();
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  async function remove() {
    if (!confirm('Excluir esta impressão?')) return;
    await api.prints.remove(print.id);
    onChanged();
  }

  return (
    <div className="card flex flex-col gap-4 md:flex-row md:items-center md:justify-between dark:border-slate-700 dark:bg-slate-900">
      <div className="flex min-w-0 flex-1 gap-3">
        {print.imageUrl && (
          <img
            src={print.imageUrl}
            alt={showModel ? print.model?.name ?? 'Imagem da impressão' : `Impressão #${print.id}`}
            className="h-24 w-24 rounded-xl object-cover shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{showModel ? print.model?.name : `Impressão #${print.id}`}</p>
            <Link to={`/prints/${print.id}`} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline dark:text-indigo-400" title="Ver detalhes">
              <Eye size={12} /> detalhes
            </Link>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {print.material} • {print.color} • {print.quantity} {print.quantity === 1 ? 'unidade' : 'unidades'}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Clock size={12} /> {formatTime(print.estimatedTime)} • criada em {formatDate(print.createdAt)}
            {print.finishedAt && ` • concluída em ${formatDate(print.finishedAt)}`}
          </p>
          {print.notes && <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">{print.notes}</p>}

          {print.hasIssue && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
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
