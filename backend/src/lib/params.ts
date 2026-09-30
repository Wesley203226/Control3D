import { Request } from 'express';
import { AppError } from './errors';

export function getId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'O ID informado é inválido.');
  }
  return id;
}

export const getUserId = (res: { locals: Record<string, any> }): number => res.locals.userId;
