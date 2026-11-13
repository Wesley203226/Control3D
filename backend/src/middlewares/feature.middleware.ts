import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { asyncHandler } from '../lib/asyncHandler';
import type { FeatureKey } from '../lib/features';
import { isFeatureEnabled } from '../services/features.service';

export const requireFeature = (key: FeatureKey) =>
  asyncHandler(async (_req: Request, _res: Response, next: NextFunction) => {
    if (!(await isFeatureEnabled(key))) {
      throw new AppError(503, 'FEATURE_IN_MAINTENANCE', 'Este recurso está temporariamente em manutenção.');
    }
    next();
  });
