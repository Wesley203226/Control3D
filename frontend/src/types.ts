export type Status = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface Model {
  id: number;
  name: string;
  description: string | null;
  category: string;
  createdAt: string;
  printsCount?: number;
}

export interface FilamentStock {
  id: number;
  modelId: number;
  material: string;
  color: string;
  totalGrams: number;
  usedGrams: number;
  cost: number;
  createdAt: string;
}

export interface Print {
  id: number;
  modelId: number;
  quantity: number;
  material: string;
  color: string;
  estimatedTime: number;
  status: Status;
  notes: string | null;
  imageUrl?: string | null;
  hasIssue?: boolean;
  issueNotes?: string | null;
  filamentId?: number | null;
  filamentUsedGrams?: number;
  createdAt: string;
  finishedAt: string | null;
  model?: { id: number; name: string };
  filament?: FilamentStock | null;
}

export interface ModelInput {
  name: string;
  description?: string;
  category?: string;
}

export interface PrintInput {
  modelId: number;
  quantity: number;
  material: string;
  color: string;
  estimatedTime: number;
  status?: Status;
  notes?: string;
  imageUrl?: string;
  hasIssue?: boolean;
  issueNotes?: string;
  filamentId?: number | null;
  filamentUsedGrams?: number;
}
