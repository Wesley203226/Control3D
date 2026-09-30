import { STATUS_LABEL } from '../lib/utils';
import type { Status } from '../types';

const STYLE: Record<Status, string> = {
  PENDENTE: 'bg-amber-100 text-amber-800',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-800',
  CONCLUIDA: 'bg-emerald-100 text-emerald-800',
  CANCELADA: 'bg-slate-200 text-slate-600',
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
