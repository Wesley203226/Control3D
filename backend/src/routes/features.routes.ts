import { Router } from 'express';
import * as controller from '../controllers/features.controller';

export const featuresRoutes = Router();

featuresRoutes.get('/features', controller.getFeatures);
