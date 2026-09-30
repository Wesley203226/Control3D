import { Router } from 'express';
import * as controller from '../controllers/model.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createModelSchema, updateModelSchema } from '../schemas/model.schema';

export const modelRoutes = Router();

modelRoutes.use(authenticate);
modelRoutes.get('/', controller.list);
modelRoutes.post('/', validate(createModelSchema), controller.create);
modelRoutes.get('/:id', controller.get);
modelRoutes.put('/:id', validate(updateModelSchema), controller.update);
modelRoutes.delete('/:id', controller.remove);
modelRoutes.get('/:id/prints', controller.listPrints);
