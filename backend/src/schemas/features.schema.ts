import { z } from 'zod';

export const updateFeaturesSchema = z.object({
  projects: z.boolean().optional(),
  prints: z.boolean().optional(),
  filaments: z.boolean().optional(),
  wallpapers: z.boolean().optional(),
  spotify: z.boolean().optional(),
}).refine((features) => Object.values(features).some((enabled) => enabled !== undefined), {
  message: 'Informe ao menos um recurso para atualizar.',
});
