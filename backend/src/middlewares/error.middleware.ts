import { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors';

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'Rota não encontrada.'));
}

// Middleware global: todo erro da API passa por aqui e sai no mesmo formato.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'JSON inválido.' });
  }
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' });
}
