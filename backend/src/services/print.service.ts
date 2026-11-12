import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { PrintStatus } from '../schemas/print.schema';

const include = {
  model: { select: { id: true, name: true, sizeX: true, sizeY: true, sizeZ: true } },
  filament: true,
} as const;

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
  const now = new Date();
  return prisma.print.create({
    data: {
      ...data,
      startedAt: data.status === 'EM_ANDAMENTO' ? now : null,
      finishedAt: data.status === 'CONCLUIDA' || data.status === 'CANCELADA' ? now : null,
    } as any,
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
  const now = new Date();
  const targetStatus = data.status ?? current.status;
  const statusChanged = data.status !== undefined && data.status !== current.status;
  const discarded = data.discarded ?? current.discarded;
  const failureMarkedAfterCancel = current.status === 'CANCELADA' && !current.discarded && data.discarded === true;
  
  // Transição de status
  if (statusChanged) {
    if (!TRANSITIONS[current.status]?.includes(data.status as PrintStatus)) {
      throw new AppError(
        400,
        'INVALID_STATUS_TRANSITION',
        `Não é possível mudar o status de ${current.status} para ${data.status}.`,
      );
    }
    if (data.status === 'EM_ANDAMENTO') patch.startedAt = now;
    if (data.status === 'CONCLUIDA' || data.status === 'CANCELADA') {
      patch.finishedAt = now;
      const startedAt = current.startedAt ?? (current.status === 'EM_ANDAMENTO' ? current.createdAt : null);
      if (startedAt) {
        patch.startedAt = startedAt;
        patch.actualTimeMinutes = Math.max(1, Math.ceil((now.getTime() - startedAt.getTime()) / 60_000));
      }
    }
  }

  const shouldDeductStock =
    targetFilamentId !== null &&
    targetFilamentId !== undefined &&
    !current.stockDeductedAt &&
    ((statusChanged && targetStatus === 'CONCLUIDA') ||
      (statusChanged && targetStatus === 'CANCELADA' && discarded) ||
      failureMarkedAfterCancel);
  const usedGrams = data.filamentUsedGrams ?? current.filamentUsedGrams;

  if (current.stockDeductedAt && (
    (data.filamentId !== undefined && data.filamentId !== current.filamentId) ||
    (data.filamentUsedGrams !== undefined && data.filamentUsedGrams !== current.filamentUsedGrams)
  )) {
    throw new AppError(400, 'FILAMENT_ALREADY_DEDUCTED', 'O consumo já foi baixado do estoque e não pode ser alterado.');
  }

  return prisma.$transaction(async (tx) => {
    if (shouldDeductStock) {
      if (usedGrams > 0) {
        const stock = await tx.filamentStock.findUnique({ where: { id: targetFilamentId } });
        if (!stock || stock.totalGrams - stock.usedGrams < usedGrams) {
          throw new AppError(400, 'INSUFFICIENT_FILAMENT', 'Estoque insuficiente para registrar o consumo desta impressão.');
        }
        const changed = await tx.filamentStock.updateMany({
          where: { id: targetFilamentId, usedGrams: stock.usedGrams, totalGrams: { gte: stock.usedGrams + usedGrams } },
          data: { usedGrams: { increment: usedGrams } },
        });
        if (changed.count === 0) {
          throw new AppError(400, 'INSUFFICIENT_FILAMENT', 'Estoque insuficiente para registrar o consumo desta impressão.');
        }
      }
      patch.stockDeductedAt = now;
    }

    return tx.print.update({ where: { id }, data: patch, include });
  });
}

export async function remove(userId: number, id: number) {
  await get(userId, id);
  await prisma.print.delete({ where: { id } });
}
