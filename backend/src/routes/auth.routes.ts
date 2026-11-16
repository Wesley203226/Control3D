import { Router } from 'express';
import * as controller from '../controllers/auth.controller';
import { authRateLimit } from '../middlewares/security.middleware';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

export const authRoutes = Router();

authRoutes.post('/register', authRateLimit, validate(registerSchema), controller.register);
authRoutes.post('/login', authRateLimit, validate(loginSchema), controller.login);
