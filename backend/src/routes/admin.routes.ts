import { Router } from 'express';
import * as controller from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateFeaturesSchema } from '../schemas/features.schema';

export const adminRoutes = Router();

adminRoutes.use(authenticate, requireAdmin);
adminRoutes.get('/features', controller.getFeatures);
adminRoutes.patch('/features', validate(updateFeaturesSchema), controller.updateFeatures);
