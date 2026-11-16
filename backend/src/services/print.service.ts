import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { PrintStatus, createPrintSchema, updatePrintSchema } from '../schemas/print.schema';
import { calculatePrintQuote } from './pricing.service';

const include = {
  model: { select: { id: true, name: true, sizeX: true, sizeY: true, sizeZ: true, modelingCost: true, expectedCopies: true } },
  filament: true,
} as const;

const TRANSITIONS: Record<string, PrintStatus[]> = {
  PENDENTE: ['EM_ANDAMENTO', 'CANCELADA'],
  EM_ANDAMENTO: ['CONCLUIDA', 'CANCELADA'],
  CONCLUIDA: [],
  CANCELADA: [],
};

type CreatePrint = ReturnType<typeof createPrintSchema.parse>;
type UpdatePrint = ReturnType<typeof updatePrintSchema.parse>;

async function getOwnedModel(userId: number, modelId: number) {
  const model = await prisma.model.findFirst({ where: { id: modelId, userId } });
  if (!model) throw new AppError(404, 'MODEL_NOT_FOUND', 'Modelo não encontrado.');
  return model;
}

function quoteData(input: {
  filamentUsedGrams: number;
  quantity: number;
  filamentCostPerGram: number;
  estimatedTime: number;
  machineHourlyRate: number;
  laborMinutes: number;
  laborHourlyRate: number;
  materialWastePercent: number;
  modelingCost: number;
  expectedCopies: number;
  extraCostPerUnit: number;
  profitMarginPercent: number;
}) {
  return {
    filamentCostPerGram: input.filamentCostPerGram,
    machineHourlyRate: input.machineHourlyRate,
    laborHourlyRate: input.laborHourlyRate,
    laborMinutes: input.laborMinutes,
    materialWastePercent: input.materialWastePercent,
    profitMarginPercent: input.profitMarginPercent,
    extraCostPerUnit: input.extraCostPerUnit,
    modelingCostSnapshot: input.modelingCost,
    expectedCopiesSnapshot: input.expectedCopies,
    ...calculatePrintQuote(input),
  };
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

export async function create(userId: number, data: CreatePrint) {
  const model = await getOwnedModel(userId, data.modelId);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const stock = data.filamentId
      ? await tx.filamentStock.findFirst({ where: { id: data.filamentId, modelId: data.modelId } })
      : null;
    if (data.filamentId && !stock) {
      throw new AppError(400, 'INVALID_FILAMENT', 'O filamento selecionado não pertence a este modelo.');
    }

    const reserveGrams = data.filamentId ? data.filamentUsedGrams : 0;
    if (stock && reserveGrams > 0) {
      const available = stock.totalGrams - stock.usedGrams - stock.reservedGrams;
      if (available < reserveGrams) {
        throw new AppError(400, 'INSUFFICIENT_FILAMENT', 'Estoque insuficiente para reservar o consumo desta impressão.');
      }
      const reserved = await tx.filamentStock.updateMany({
        where: {
          id: stock.id,
          totalGrams: stock.totalGrams,
          usedGrams: stock.usedGrams,
          reservedGrams: stock.reservedGrams,
        },
        data: { reservedGrams: { increment: reserveGrams } },
      });
      if (!reserved.count) {
        throw new AppError(400, 'INSUFFICIENT_FILAMENT', 'O estoque mudou durante a reserva. Atualize e tente novamente.');
      }
    }

    const quote = quoteData({
      filamentUsedGrams: data.filamentUsedGrams,
      quantity: data.quantity,
      filamentCostPerGram: data.filamentCostPerGram ?? stock?.costPerGram ?? 0,
      estimatedTime: data.estimatedTime,
      machineHourlyRate: data.machineHourlyRate,
      laborMinutes: data.laborMinutes,
      laborHourlyRate: data.laborHourlyRate,
      materialWastePercent: data.materialWastePercent,
      modelingCost: model.modelingCost,
      expectedCopies: model.expectedCopies,
      extraCostPerUnit: data.extraCostPerUnit,
      profitMarginPercent: data.profitMarginPercent,
    });

    return tx.print.create({
      data: {
        ...data,
        ...quote,
        stockReservedAt: reserveGrams > 0 ? now : null,
        stockReservedGrams: reserveGrams,
        startedAt: data.status === 'EM_ANDAMENTO' ? now : null,
        finishedAt: null,
      },
      include,
    });
  });
}

export async function update(userId: number, id: number, data: UpdatePrint) {
  const current = await prisma.print.findFirst({
    where: { id, model: { userId } },
    include: { filament: true },
  });
  if (!current) throw new AppError(404, 'PRINT_NOT_FOUND', 'Impressão não encontrada.');

  const targetModelId = data.modelId ?? current.modelId;
  const model = await getOwnedModel(userId, targetModelId);
  const targetFilamentId = data.filamentId === undefined ? current.filamentId : data.filamentId;
  const targetStock = targetFilamentId
    ? await prisma.filamentStock.findFirst({ where: { id: targetFilamentId, modelId: targetModelId } })
    : null;
  if (targetFilamentId && !targetStock) {
    throw new AppError(400, 'INVALID_FILAMENT', 'O filamento selecionado não pertence a este modelo.');
  }

  const now = new Date();
  const targetStatus = data.status ?? current.status as PrintStatus;
  const statusChanged = data.status !== undefined && data.status !== current.status;
  const discarded = data.discarded ?? current.discarded;
  const failureMarkedAfterCancel = current.status === 'CANCELADA' && !current.discarded && data.discarded === true;
  if (statusChanged && !TRANSITIONS[current.status]?.includes(targetStatus)) {
    throw new AppError(
      400,
      'INVALID_STATUS_TRANSITION',
      `Não é possível mudar o status de ${current.status} para ${targetStatus}.`,
    );
  }

  const filamentUsedGrams = data.filamentUsedGrams ?? current.filamentUsedGrams;
  if (current.stockDeductedAt && (
    (data.filamentId !== undefined && data.filamentId !== current.filamentId) ||
    (data.filamentUsedGrams !== undefined && data.filamentUsedGrams !== current.filamentUsedGrams)
  )) {
    throw new AppError(400, 'FILAMENT_ALREADY_DEDUCTED', 'O consumo já foi baixado do estoque e não pode ser alterado.');
  }

  const shouldDeductStock = Boolean(targetFilamentId) && !current.stockDeductedAt && (
    (statusChanged && targetStatus === 'CONCLUIDA') ||
    (statusChanged && targetStatus === 'CANCELADA' && discarded) ||
    failureMarkedAfterCancel
  );
  const shouldHoldReservation = Boolean(targetFilamentId) &&
    !current.stockDeductedAt &&
    !shouldDeductStock &&
    targetStatus !== 'CANCELADA' &&
    targetStatus !== 'CONCLUIDA';
  const desiredReservation = shouldHoldReservation ? filamentUsedGrams : 0;

  const machineHourlyRate = data.machineHourlyRate ?? current.machineHourlyRate;
  const laborHourlyRate = data.laborHourlyRate ?? current.laborHourlyRate;
  const laborMinutes = data.laborMinutes ?? current.laborMinutes;
  const materialWastePercent = data.materialWastePercent ?? current.materialWastePercent;
  const profitMarginPercent = data.profitMarginPercent ?? current.profitMarginPercent;
  const extraCostPerUnit = data.extraCostPerUnit ?? current.extraCostPerUnit;
  const quantity = data.quantity ?? current.quantity;
  const estimatedTime = data.estimatedTime ?? current.estimatedTime;
  const filamentCostPerGram = data.filamentCostPerGram ??
    (targetFilamentId === current.filamentId ? current.filamentCostPerGram : targetStock?.costPerGram ?? 0);
  const modelingCost = targetModelId === current.modelId ? current.modelingCostSnapshot : model.modelingCost;
  const expectedCopies = targetModelId === current.modelId ? current.expectedCopiesSnapshot : model.expectedCopies;
  const quote = quoteData({
    filamentUsedGrams,
    quantity,
    filamentCostPerGram,
    estimatedTime,
    machineHourlyRate,
    laborMinutes,
    laborHourlyRate,
    materialWastePercent,
    modelingCost,
    expectedCopies,
    extraCostPerUnit,
    profitMarginPercent,
  });
  const patch: Prisma.PrintUpdateInput = { ...data, ...quote };

  if (statusChanged && targetStatus === 'EM_ANDAMENTO') patch.startedAt = now;
  if (statusChanged && (targetStatus === 'CONCLUIDA' || targetStatus === 'CANCELADA')) {
    patch.finishedAt = now;
    const startedAt = current.startedAt ?? (current.status === 'EM_ANDAMENTO' ? current.createdAt : null);
    if (startedAt) {
      patch.startedAt = startedAt;
      patch.actualTimeMinutes = Math.max(1, Math.ceil((now.getTime() - startedAt.getTime()) / 60_000));
    }
  }

  return prisma.$transaction(async (tx) => {
    const previousStockId = current.filamentId;
    const previousReserved = current.stockReservedGrams;
    const sameStock = previousStockId === targetFilamentId;

    if (shouldDeductStock && targetStock) {
      if (sameStock && previousReserved > 0) {
        const availableIncludingReservation = targetStock.totalGrams - targetStock.usedGrams - targetStock.reservedGrams + previousReserved;
        if (availableIncludingReservation < filamentUsedGrams) {
          throw new AppError(400, 'INSUFFICIENT_FILAMENT', 'Estoque insuficiente para registrar o consumo desta impressão.');
        }
        const changed = await tx.filamentStock.updateMany({
          where: {
            id: targetStock.id,
            totalGrams: targetStock.totalGrams,
            usedGrams: targetStock.usedGrams,
            reservedGrams: targetStock.reservedGrams,
          },
          data: {
            reservedGrams: { decrement: previousReserved },
            usedGrams: { increment: filamentUsedGrams },
          },
        });
        if (!changed.count) throw new AppError(400, 'INSUFFICIENT_FILAMENT', 'O estoque mudou durante a baixa. Atualize e tente novamente.');
      } else {
        if (previousStockId && previousReserved > 0) {
          await tx.filamentStock.update({
            where: { id: previousStockId },
            data: { reservedGrams: { decrement: previousReserved } },
          });
        }
        const available = targetStock.totalGrams - targetStock.usedGrams - targetStock.reservedGrams;
        if (available < filamentUsedGrams) {
          throw new AppError(400, 'INSUFFICIENT_FILAMENT', 'Estoque insuficiente para registrar o consumo desta impressão.');
        }
        const changed = await tx.filamentStock.updateMany({
          where: {
            id: targetStock.id,
            totalGrams: targetStock.totalGrams,
            usedGrams: targetStock.usedGrams,
            reservedGrams: targetStock.reservedGrams,
          },
          data: { usedGrams: { increment: filamentUsedGrams } },
        });
        if (!changed.count) throw new AppError(400, 'INSUFFICIENT_FILAMENT', 'O estoque mudou durante a baixa. Atualize e tente novamente.');
      }
      patch.stockDeductedAt = now;
      // A reserva foi convertida em consumo: zerar para que uma exclusão futura
      // não devolva gramas que já saíram do estoque.
      patch.stockReservedGrams = 0;
    } else {
      if (previousStockId && previousReserved > 0 && !sameStock) {
        await tx.filamentStock.update({
          where: { id: previousStockId },
          data: { reservedGrams: { decrement: previousReserved } },
        });
      }

      if (targetStock && desiredReservation !== (sameStock ? previousReserved : 0)) {
        const ownReservation = sameStock ? previousReserved : 0;
        const available = targetStock.totalGrams - targetStock.usedGrams - targetStock.reservedGrams + ownReservation;
        if (available < desiredReservation) {
          throw new AppError(400, 'INSUFFICIENT_FILAMENT', 'Estoque insuficiente para reservar o consumo desta impressão.');
        }
        const changed = await tx.filamentStock.updateMany({
          where: {
            id: targetStock.id,
            totalGrams: targetStock.totalGrams,
            usedGrams: targetStock.usedGrams,
            reservedGrams: targetStock.reservedGrams,
          },
          data: {
            reservedGrams: targetStock.reservedGrams - ownReservation + desiredReservation,
          },
        });
        if (!changed.count) throw new AppError(400, 'INSUFFICIENT_FILAMENT', 'O estoque mudou durante a reserva. Atualize e tente novamente.');
      }
      patch.stockReservedGrams = desiredReservation;
      patch.stockReservedAt = desiredReservation > 0 ? current.stockReservedAt ?? now : null;
    }

    return tx.print.update({ where: { id }, data: patch, include });
  });
}

export async function remove(userId: number, id: number) {
  const print = await get(userId, id);
  await prisma.$transaction(async (tx) => {
    if (print.filamentId && print.stockReservedGrams > 0 && !print.stockDeductedAt) {
      await tx.filamentStock.update({
        where: { id: print.filamentId },
        data: { reservedGrams: { decrement: print.stockReservedGrams } },
      });
    }
    await tx.print.delete({ where: { id } });
  });
}
