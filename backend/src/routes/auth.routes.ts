import { Router } from 'express';
import * as controller from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

export const authRoutes = Router();

authRoutes.post('/register', validate(registerSchema), controller.register);
authRoutes.post('/login', validate(loginSchema), controller.login);
