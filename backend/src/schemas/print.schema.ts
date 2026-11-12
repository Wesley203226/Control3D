import { z } from 'zod';

export const PRINT_STATUS = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'] as const;
export type PrintStatus = (typeof PRINT_STATUS)[number];

export const createPrintSchema = z.object({
  modelId: z.number().int().positive(),
  quantity: z.number().int().positive('A quantidade deve ser maior que zero.'),
  material: z.string().trim().min(1, 'Informe o material.'),
  color: z.string().trim().min(1, 'Informe a cor.'),
  estimatedTime: z.number().int().positive('O tempo estimado (minutos) deve ser maior que zero.'),
  status: z.enum(['PENDENTE', 'EM_ANDAMENTO']).default('PENDENTE'),
  notes: z.string().trim().optional(),
  imageUrl: z.string().trim().max(90_000).optional().nullable(),
  hasIssue: z.boolean().optional().default(false),
  issueNotes: z.string().trim().optional().nullable(),
  filamentId: z.number().int().positive().optional().nullable(),
  filamentUsedGrams: z.number().int().nonnegative().optional().default(0),
  hasSupports: z.boolean().optional().default(false),
  discarded: z.boolean().optional().default(false),
});

export const updatePrintSchema = createPrintSchema
  .extend({
    status: z.enum(PRINT_STATUS).optional(),
    hasIssue: z.boolean().optional(),
    filamentUsedGrams: z.number().int().nonnegative().optional(),
    hasSupports: z.boolean().optional(),
    discarded: z.boolean().optional(),
  })
  .partial();
