import { Router } from 'express';
import * as controller from '../controllers/filament.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createFilamentSchema, updateFilamentSchema } from '../schemas/filament.schema';

export const filamentRoutes = Router();

filamentRoutes.use(authenticate);
filamentRoutes.get('/models/:modelId/filaments', controller.list);
filamentRoutes.post('/filaments', validate(createFilamentSchema), controller.create);
filamentRoutes.get('/filaments/:id', controller.get);
filamentRoutes.patch('/filaments/:id', validate(updateFilamentSchema), controller.update);
filamentRoutes.delete('/filaments/:id', controller.remove);
