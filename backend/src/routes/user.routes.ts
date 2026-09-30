import { Router } from 'express';
import * as controller from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

export const userRoutes = Router();

userRoutes.get('/me', authenticate, controller.me);
