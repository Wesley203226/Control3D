import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

export async function resetDb() {
  await prisma.filamentStock.deleteMany();
  await prisma.print.deleteMany();
  await prisma.model.deleteMany();
  await prisma.user.deleteMany();
}

export async function getToken(email = 'joao@email.com') {
  await request(app).post('/api/auth/register').send({ name: 'João', email, password: '123456' });
  const res = await request(app).post('/api/auth/login').send({ email, password: '123456' });
  return res.body.token as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function createModel(token: string, name = 'Suporte para celular') {
  const res = await request(app).post('/api/models').set(bearer(token)).send({ name, category: 'Utilidades' });
  return res.body as { id: number; name: string };
}

export const printPayload = (modelId: number, extra: object = {}) => ({
  modelId,
  quantity: 2,
  material: 'PLA',
  color: 'Preto',
  estimatedTime: 180,
  ...extra,
});
