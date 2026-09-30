import { ApiError } from '../services/api';
import type { Status } from '../types';

export const STATUS_LABEL: Record<Status, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

export function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}min`;
  return h ? `${h}h` : `${m}min`;
}

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

// Junta a mensagem principal com os erros de validação de cada campo, se existirem.
export function errorMessage(e: unknown) {
  if (e instanceof ApiError) {
    const extra = e.details ? Object.values(e.details).flat().join(' ') : '';
    return extra || e.message;
  }
  return 'Não foi possível conectar ao servidor.';
}
