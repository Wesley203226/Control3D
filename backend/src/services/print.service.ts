import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { PrintStatus } from '../schemas/print.schema';

const include = { model: { select: { id: true, name: true } }, filament: true } as const;

// Regras do fluxo de status (seção 24 do projeto).
const TRANSITIONS: Record<string, PrintStatus[]> = {
  PENDENTE: ['EM_ANDAMENTO', 'CANCELADA'],
  EM_ANDAMENTO: ['CONCLUIDA', 'CANCELADA'],
  CONCLUIDA: [],
  CANCELADA: [],
};

async function assertModelOwner(userId: number, modelId: number) {
  const model = await prisma.model.findFirst({ where: { id: modelId, userId } });
  if (!model) throw new AppError(404, 'MODEL_NOT_FOUND', 'Modelo não encontrado.');
}

export const list = (userId: number, status?: string) =>
  prisma.print.findMany({
    where: { model: { userId }, ...(status ? { status } : {}) },
    include,
    orderBy: { createdAt: 'desc' },
  });

export async function get(userId: number, id: number) {
  const print = await prisma.print.findFirst({ where: { id, model: { userId } }, include });
  if (!print) throw new AppError(404, 'PRINT_NOT_FOUND', 'Impressão não encontrada.');
  return print;
}

export async function create(userId: number, data: { modelId: number; status: string } & Record<string, any>) {
  await assertModelOwner(userId, data.modelId);
  if (data.filamentId) {
    const filament = await prisma.filamentStock.findFirst({ where: { id: data.filamentId, modelId: data.modelId } });
    if (!filament) throw new AppError(400, 'INVALID_FILAMENT', 'O filamento selecionado não pertence a este modelo.');
  }
  return prisma.print.create({
    data: { ...data, finishedAt: data.status === 'CONCLUIDA' ? new Date() : null } as any,
    include,
  });
}

export async function update(userId: number, id: number, data: { modelId?: number; status?: string } & Record<string, any>) {
  const current = await prisma.print.findFirst({
    where: { id, model: { userId } },
    include: { filament: true },
  });
  
  if (!current) throw new AppError(404, 'PRINT_NOT_FOUND', 'Impressão não encontrada.');
  if (data.modelId && data.modelId !== current.modelId) await assertModelOwner(userId, data.modelId);
  const targetModelId = data.modelId ?? current.modelId;
  const targetFilamentId = data.filamentId === undefined ? current.filamentId : data.filamentId;
  if (targetFilamentId) {
    const filament = await prisma.filamentStock.findFirst({ where: { id: targetFilamentId, modelId: targetModelId } });
    if (!filament) throw new AppError(400, 'INVALID_FILAMENT', 'O filamento selecionado não pertence a este modelo.');
  }

  const patch: Record<string, any> = { ...data };
  
  // Transição de status
  if (data.status && data.status !== current.status) {
    if (!TRANSITIONS[current.status]?.includes(data.status as PrintStatus)) {
      throw new AppError(
        400,
        'INVALID_STATUS_TRANSITION',
        `Não é possível mudar o status de ${current.status} para ${data.status}.`,
      );
    }
    patch.finishedAt = data.status === 'CONCLUIDA' ? new Date() : null;
    
    // Subtrair filamento quando impressão é concluída
    if (data.status === 'CONCLUIDA' && targetFilamentId) {
      const usedGrams = data.filamentUsedGrams ?? current.filamentUsedGrams ?? 0;
      if (usedGrams > 0) {
        const stock = await prisma.filamentStock.findUnique({ where: { id: targetFilamentId } });
        if (!stock || stock.totalGrams - stock.usedGrams < usedGrams) {
          throw new AppError(400, 'INSUFFICIENT_FILAMENT', 'Estoque insuficiente para concluir esta impressão.');
        }
        const changed = await prisma.filamentStock.updateMany({
          where: { id: targetFilamentId, usedGrams: stock.usedGrams, totalGrams: { gte: stock.usedGrams + usedGrams } },
          data: { usedGrams: { increment: usedGrams } },
        });
        if (changed.count === 0) throw new AppError(400, 'INSUFFICIENT_FILAMENT', 'Estoque insuficiente para concluir esta impressão.');
      }
    }
  }
  
  return prisma.print.update({ where: { id }, data: patch, include });
}

export async function remove(userId: number, id: number) {
  await get(userId, id);
  await prisma.print.delete({ where: { id } });
}
