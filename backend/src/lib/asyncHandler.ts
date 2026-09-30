import { NextFunction, Request, RequestHandler, Response } from 'express';

// Repassa erros de funções async para o middleware global de erros (Express 4).
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
