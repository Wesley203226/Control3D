import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

async function assertModelOwner(userId: number, modelId: number) {
  const model = await prisma.model.findFirst({ where: { id: modelId, userId } });
  if (!model) throw new AppError(404, 'MODEL_NOT_FOUND', 'Modelo não encontrado.');
}

export const list = (userId: number, modelId: number) =>
  prisma.filamentStock.findMany({
    where: { model: { userId }, modelId },
    orderBy: { createdAt: 'desc' },
  });

export async function get(userId: number, id: number) {
  const stock = await prisma.filamentStock.findFirst({
    where: { id, model: { userId } },
  });
  if (!stock) throw new AppError(404, 'STOCK_NOT_FOUND', 'Estoque não encontrado.');
  return stock;
}

export async function create(
  userId: number,
  data: { modelId: number; material: string; color: string; spools: number; gramPerSpool: number }
) {
  await assertModelOwner(userId, data.modelId);
  
  return prisma.filamentStock.create({
    data: {
      modelId: data.modelId,
      material: data.material,
      color: data.color,
      spools: data.spools,
      gramPerSpool: data.gramPerSpool,
      totalGrams: data.spools * data.gramPerSpool,
      usedGrams: 0,
    },
  });
}

export async function update(
  userId: number,
  id: number,
  data: { spools?: number; gramPerSpool?: number; usedGrams?: number }
) {
  const current = await get(userId, id);
  
  const spools = data.spools ?? current.spools;
  const gramPerSpool = data.gramPerSpool ?? current.gramPerSpool;
  if (spools * gramPerSpool < current.usedGrams) {
    throw new AppError(400, 'INVALID_STOCK', 'O estoque total não pode ficar abaixo da quantidade já consumida.');
  }
  
  return prisma.filamentStock.update({
    where: { id },
    data: {
      spools,
      gramPerSpool,
      totalGrams: spools * gramPerSpool,
      usedGrams: data.usedGrams ?? current.usedGrams,
    },
  });
}

export async function remove(userId: number, id: number) {
  await get(userId, id);
  return prisma.filamentStock.delete({ where: { id } });
}
