import { asyncHandler } from '../lib/asyncHandler';
import * as featuresService from '../services/features.service';

export const getFeatures = asyncHandler(async (_req, res) => {
  res.json({ features: await featuresService.getFeatures() });
});

export const updateFeatures = asyncHandler(async (req, res) => {
  res.json({ features: await featuresService.updateFeatures(req.body) });
});
