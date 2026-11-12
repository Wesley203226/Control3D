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
  imageUrl?: string | null;
  category: string;
  sizeX?: number | null;
  sizeY?: number | null;
  sizeZ?: number | null;
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
  spools: number;
  gramPerSpool: number;
  model?: Pick<Model, 'id' | 'name'>;
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
  hasSupports?: boolean;
  discarded?: boolean;
  filamentId?: number | null;
  filamentUsedGrams?: number;
  startedAt?: string | null;
  actualTimeMinutes?: number | null;
  stockDeductedAt?: string | null;
  createdAt: string;
  finishedAt: string | null;
  model?: { id: number; name: string; sizeX?: number | null; sizeY?: number | null; sizeZ?: number | null };
  filament?: FilamentStock | null;
}

export interface ModelInput {
  name: string;
  description?: string;
  category?: string;
  imageUrl?: string | null;
  sizeX?: number | null;
  sizeY?: number | null;
  sizeZ?: number | null;
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
  hasSupports?: boolean;
  discarded?: boolean;
  filamentId?: number | null;
  filamentUsedGrams?: number;
}
