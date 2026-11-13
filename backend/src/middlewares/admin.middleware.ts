import { NextFunction, Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { getUserId } from '../lib/params';
import { prisma } from '../lib/prisma';

export const requireAdmin = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
  const user = await prisma.user.findUnique({
    where: { id: getUserId(res) },
    select: { role: true },
  });

  if (user?.role !== 'ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Acesso restrito à administração.');
  }

  next();
});
