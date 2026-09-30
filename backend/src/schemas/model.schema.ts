import { z } from 'zod';

export const createModelSchema = z.object({
  name: z.string().trim().min(1, 'O nome não pode estar vazio.'),
  description: z.string().trim().optional(),
  category: z.string().trim().min(1).default('Geral'),
});

export const updateModelSchema = createModelSchema.partial();
