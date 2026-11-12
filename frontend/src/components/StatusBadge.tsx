import { STATUS_LABEL } from '../lib/utils';
import type { Status } from '../types';

const STYLE: Record<Status, string> = {
  PENDENTE: 'bg-amber-400/15 text-amber-700 ring-amber-400/30 dark:text-amber-200',
  EM_ANDAMENTO: 'bg-sky-400/15 text-sky-700 ring-sky-400/30 dark:text-sky-200',
  CONCLUIDA: 'bg-emerald-400/15 text-emerald-700 ring-emerald-400/30 dark:text-emerald-200',
  CANCELADA: 'bg-white/10 text-slate-600 ring-white/15 dark:text-slate-300',
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
