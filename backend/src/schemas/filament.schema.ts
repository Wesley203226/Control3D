import { z } from 'zod';

export const createFilamentSchema = z.object({
  modelId: z.number().int().positive(),
  material: z.string().trim().min(1),
  color: z.string().trim().min(1),
  spools: z.number().int().positive(),
  gramPerSpool: z.number().int().positive(),
  costPerGram: z.number().nonnegative().max(100_000).default(0),
});

export const updateFilamentSchema = z.object({
  material: z.string().trim().min(1).optional(),
  color: z.string().trim().min(1).optional(),
  spools: z.number().int().positive().optional(),
  gramPerSpool: z.number().int().positive().optional(),
  costPerGram: z.number().nonnegative().max(100_000).optional(),
}).refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualizar.');
