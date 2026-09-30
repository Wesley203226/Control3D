import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../lib/config';
import { AppError } from '../lib/errors';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Token não informado.');
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as jwt.JwtPayload;
    res.locals.userId = Number(payload.sub);
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Token inválido ou expirado.');
  }
  next();
}
