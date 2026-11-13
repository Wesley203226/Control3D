import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as controller from '../controllers/wallpaper.controller';
import { requireFeature } from '../middlewares/feature.middleware';

export const wallpaperRoutes = Router();

wallpaperRoutes.use(authenticate);
wallpaperRoutes.get('/wallpapers', requireFeature('wallpapers'), controller.search);
