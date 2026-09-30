import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../lib/errors';

export const validate = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return next(
      new AppError(400, 'VALIDATION_ERROR', 'Os dados enviados são inválidos.', result.error.flatten().fieldErrors),
    );
  }
  req.body = result.data;
  next();
};
