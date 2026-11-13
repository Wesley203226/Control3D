import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import * as wallpaperService from '../services/wallpaper.service';

const searchSchema = z.object({
  query: z.string().trim().min(1).max(80),
  type: z.enum(['photo', 'video']),
});

export const search = asyncHandler(async (req: Request, res: Response) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    throw new AppError(400, 'VALIDATION_ERROR', 'Informe um termo de busca e um tipo válido (photo ou video).', details);
  }
  res.setHeader('Cache-Control', 'private, max-age=600');
  res.json(await wallpaperService.searchWallpapers(parsed.data.query, parsed.data.type));
});
