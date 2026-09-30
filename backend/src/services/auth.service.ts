import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../lib/config';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

const publicUser = { id: true, name: true, email: true, createdAt: true } as const;

export async function register(data: { name: string; email: string; password: string }) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new AppError(409, 'USER_ALREADY_EXISTS', 'Este e-mail já está cadastrado.');

  const password = await bcrypt.hash(data.password, 10);
  return prisma.user.create({ data: { ...data, password }, select: publicUser });
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');
  }
  const token = jwt.sign({}, config.jwtSecret, { subject: String(user.id), expiresIn: '1d' });
  const { password: _pw, ...safe } = user;
  return { token, user: safe };
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUser });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
  return user;
}
