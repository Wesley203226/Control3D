import { asyncHandler } from '../lib/asyncHandler';
import * as service from '../services/features.service';

export const getFeatures = asyncHandler(async (_req, res) => {
  res.json({ features: await service.getFeatures() });
});
