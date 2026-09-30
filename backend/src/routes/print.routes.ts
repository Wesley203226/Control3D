import { Router } from 'express';
import * as controller from '../controllers/print.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createPrintSchema, updatePrintSchema } from '../schemas/print.schema';

export const printRoutes = Router();

printRoutes.use(authenticate);
printRoutes.get('/', controller.list);
printRoutes.post('/', validate(createPrintSchema), controller.create);
printRoutes.get('/:id', controller.get);
printRoutes.put('/:id', validate(updatePrintSchema), controller.update);
printRoutes.delete('/:id', controller.remove);
