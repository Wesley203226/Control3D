import { z } from 'zod';

export const createModelSchema = z.object({
  name: z.string().trim().min(1, 'O nome não pode estar vazio.'),
  description: z.string().trim().optional(),
  category: z.string().trim().min(1).default('Geral'),
  imageUrl: z.string().trim().max(90_000).optional().nullable(),
  sizeX: z.number().positive().optional().nullable(),
  sizeY: z.number().positive().optional().nullable(),
  sizeZ: z.number().positive().optional().nullable(),
  modelingCost: z.number().nonnegative().max(1_000_000).default(0),
  expectedCopies: z.number().int().positive().max(1_000_000).default(1),
});

export const updateModelSchema = createModelSchema
  .extend({ category: z.string().trim().min(1).optional() })
  .partial();
