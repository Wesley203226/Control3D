import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

const withCount = { _count: { select: { prints: true } } } as const;

const format = <T extends { _count: { prints: number } }>({ _count, ...m }: T) => ({
  ...m,
  printsCount: _count.prints,
});

export async function list(userId: number) {
  const models = await prisma.model.findMany({
    where: { userId },
    include: withCount,
    orderBy: { createdAt: 'desc' },
  });
  return models.map(format);
}

export async function get(userId: number, id: number) {
  const model = await prisma.model.findFirst({ where: { id, userId }, include: withCount });
  if (!model) throw new AppError(404, 'MODEL_NOT_FOUND', 'Modelo não encontrado.');
  return format(model);
}

export const create = (userId: number, data: { name: string; description?: string; category: string }) =>
  prisma.model.create({ data: { ...data, userId } });

export async function update(userId: number, id: number, data: object) {
  await get(userId, id);
  return prisma.model.update({ where: { id }, data });
}

export async function remove(userId: number, id: number) {
  await get(userId, id);
  await prisma.model.delete({ where: { id } });
}

export async function listPrints(userId: number, id: number) {
  const model = await get(userId, id);
  const prints = await prisma.print.findMany({ where: { modelId: id }, orderBy: { createdAt: 'desc' } });
  return { model: { id: model.id, name: model.name }, prints };
}
