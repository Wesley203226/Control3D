export type Status = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export type FeatureKey = 'projects' | 'prints' | 'filaments' | 'wallpapers' | 'spotify';
export type FeatureMap = Record<FeatureKey, boolean>;

export interface Model {
  id: number;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  category: string;
  sizeX?: number | null;
  sizeY?: number | null;
  sizeZ?: number | null;
  modelingCost: number;
  expectedCopies: number;
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
  reservedGrams: number;
  costPerGram: number;
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
  stockReservedAt?: string | null;
  stockReservedGrams: number;
  filamentCostPerGram: number;
  machineHourlyRate: number;
  laborHourlyRate: number;
  laborMinutes: number;
  materialWastePercent: number;
  profitMarginPercent: number;
  extraCostPerUnit: number;
  materialCostPerUnit: number;
  machineCostPerUnit: number;
  laborCostPerUnit: number;
  modelingCostPerUnit: number;
  estimatedCostPerUnit: number;
  suggestedPricePerUnit: number;
  salePricePerUnit: number | null;
  createdAt: string;
  finishedAt: string | null;
  model?: { id: number; name: string; sizeX?: number | null; sizeY?: number | null; sizeZ?: number | null; modelingCost: number; expectedCopies: number };
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
  modelingCost?: number;
  expectedCopies?: number;
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
  filamentCostPerGram?: number;
  machineHourlyRate?: number;
  laborHourlyRate?: number;
  laborMinutes?: number;
  materialWastePercent?: number;
  profitMarginPercent?: number;
  extraCostPerUnit?: number;
  salePricePerUnit?: number | null;
}
