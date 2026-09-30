import { z } from 'zod';

export const createFilamentSchema = z.object({
  modelId: z.number().int().positive(),
  material: z.string().trim().min(1),
  color: z.string().trim().min(1),
  spools: z.number().int().positive(),
  gramPerSpool: z.number().int().positive(),
});

export const updateFilamentSchema = z.object({
  spools: z.number().int().positive().optional(),
  gramPerSpool: z.number().int().positive().optional(),
}).refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualizar.');
