import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { bearer, createModel, getToken, printPayload, resetDb } from './helpers';

beforeEach(resetDb);

async function setup() {
  const token = await getToken();
  const model = await createModel(token);
  return { token, model };
}

async function createPrint(token: string, modelId: number, extra: object = {}) {
  const res = await request(app).post('/api/prints').set(bearer(token)).send(printPayload(modelId, extra));
  return res.body as { id: number; status: string };
}

describe('Impressões', () => {
  it('cria uma impressão com status padrão PENDENTE', async () => {
    const { token, model } = await setup();
    const res = await request(app).post('/api/prints').set(bearer(token)).send(printPayload(model.id));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDENTE');
    expect(res.body.model.name).toBe(model.name);
  });

  it('reserva o filamento ao criar a ordem e libera a reserva ao cancelar sem descarte', async () => {
    const { token, model } = await setup();
    const stock = await request(app).post('/api/filaments').set(bearer(token)).send({
      modelId: model.id, material: 'PLA', color: 'Azul', spools: 1, gramPerSpool: 100,
    });
    const print = await request(app).post('/api/prints').set(bearer(token)).send(printPayload(model.id, {
      filamentId: stock.body.id,
      filamentUsedGrams: 60,
    }));
    const reserved = await request(app).get(`/api/filaments/${stock.body.id}`).set(bearer(token));
    const overbooked = await request(app).post('/api/prints').set(bearer(token)).send(printPayload(model.id, {
      filamentId: stock.body.id,
      filamentUsedGrams: 50,
    }));

    expect(print.status).toBe(201);
    expect(reserved.body.reservedGrams).toBe(60);
    expect(overbooked.status).toBe(400);
    expect(overbooked.body.error).toBe('INSUFFICIENT_FILAMENT');

    const cancelled = await request(app).put(`/api/prints/${print.body.id}`).set(bearer(token)).send({ status: 'CANCELADA' });
    const released = await request(app).get(`/api/filaments/${stock.body.id}`).set(bearer(token));
    expect(cancelled.status).toBe(200);
    expect(released.body.reservedGrams).toBe(0);
    expect(released.body.usedGrams).toBe(0);
  });

  it('salva o orçamento por peça com modelagem amortizada e custos reais configurados', async () => {
    const { token, model } = await setup();
    await request(app).put(`/api/models/${model.id}`).set(bearer(token)).send({
      modelingCost: 60,
      expectedCopies: 30,
    });
    const stock = await request(app).post('/api/filaments').set(bearer(token)).send({
      modelId: model.id, material: 'PLA', color: 'Preto', spools: 1, gramPerSpool: 1000, costPerGram: 0.1,
    });
    const response = await request(app).post('/api/prints').set(bearer(token)).send(printPayload(model.id, {
      quantity: 2,
      estimatedTime: 120,
      filamentId: stock.body.id,
      filamentUsedGrams: 100,
      machineHourlyRate: 2,
      laborHourlyRate: 20,
      laborMinutes: 30,
      materialWastePercent: 10,
      profitMarginPercent: 20,
      extraCostPerUnit: 1,
    }));

    expect(response.status).toBe(201);
    expect(response.body.materialCostPerUnit).toBe(5.5);
    expect(response.body.machineCostPerUnit).toBe(2);
    expect(response.body.laborCostPerUnit).toBe(5);
    expect(response.body.modelingCostPerUnit).toBe(2);
    expect(response.body.estimatedCostPerUnit).toBe(15.5);
    expect(response.body.suggestedPricePerUnit).toBe(19.375);
    expect(response.body.filamentCostPerGram).toBe(0.1);
    expect(response.body.stockReservedGrams).toBe(100);
  });

  it('rejeita quantidade zero e status inválido', async () => {
    const { token, model } = await setup();
    const a = await request(app).post('/api/prints').set(bearer(token)).send(printPayload(model.id, { quantity: 0 }));
    const b = await request(app).post('/api/prints').set(bearer(token)).send(printPayload(model.id, { status: 'XYZ' }));
    expect(a.status).toBe(400);
    expect(b.status).toBe(400);
  });

  it('rejeita impressão de modelo inexistente', async () => {
    const { token } = await setup();
    const res = await request(app).post('/api/prints').set(bearer(token)).send(printPayload(9999));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('MODEL_NOT_FOUND');
  });

  it('lista e filtra por status', async () => {
    const { token, model } = await setup();
    await createPrint(token, model.id);
    await createPrint(token, model.id, { status: 'EM_ANDAMENTO' });
    const all = await request(app).get('/api/prints').set(bearer(token));
    const filtered = await request(app).get('/api/prints?status=EM_ANDAMENTO').set(bearer(token));
    expect(all.body).toHaveLength(2);
    expect(filtered.body).toHaveLength(1);
  });

  it('busca uma impressão e retorna 404 quando não existe', async () => {
    const { token, model } = await setup();
    const p = await createPrint(token, model.id);
    const ok = await request(app).get(`/api/prints/${p.id}`).set(bearer(token));
    const nf = await request(app).get('/api/prints/9999').set(bearer(token));
    expect(ok.status).toBe(200);
    expect(nf.status).toBe(404);
    expect(nf.body.error).toBe('PRINT_NOT_FOUND');
  });

  it('atualiza dados da impressão', async () => {
    const { token, model } = await setup();
    const p = await createPrint(token, model.id);
    const res = await request(app).put(`/api/prints/${p.id}`).set(bearer(token)).send({ quantity: 5 });
    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(5);
  });

  it('mantém suportes e descarte ao atualizar apenas o status', async () => {
    const { token, model } = await setup();
    const p = await createPrint(token, model.id, { hasSupports: true, discarded: true });
    const res = await request(app).put(`/api/prints/${p.id}`).set(bearer(token)).send({ status: 'EM_ANDAMENTO' });
    expect(res.status).toBe(200);
    expect(res.body.hasSupports).toBe(true);
    expect(res.body.discarded).toBe(true);
    expect(res.body.startedAt).toBeTruthy();
  });

  it('segue o fluxo PENDENTE → EM_ANDAMENTO → CONCLUIDA e preenche finishedAt', async () => {
    const { token, model } = await setup();
    const p = await createPrint(token, model.id);
    const a = await request(app).put(`/api/prints/${p.id}`).set(bearer(token)).send({ status: 'EM_ANDAMENTO' });
    const b = await request(app).put(`/api/prints/${p.id}`).set(bearer(token)).send({ status: 'CONCLUIDA' });
    expect(a.body.status).toBe('EM_ANDAMENTO');
    expect(b.body.status).toBe('CONCLUIDA');
    expect(b.body.finishedAt).toBeTruthy();
    expect(b.body.actualTimeMinutes).toBeGreaterThanOrEqual(1);
  });

  it('baixa do estoque o peso de uma peça descartada ao cancelar', async () => {
    const { token, model } = await setup();
    const filament = await request(app)
      .post('/api/filaments')
      .set(bearer(token))
      .send({ modelId: model.id, material: 'PLA', color: 'Azul', spools: 1, gramPerSpool: 1000 });
    const p = await createPrint(token, model.id, {
      status: 'EM_ANDAMENTO',
      filamentId: filament.body.id,
      filamentUsedGrams: 42,
      discarded: true,
    });
    const cancelled = await request(app).put(`/api/prints/${p.id}`).set(bearer(token)).send({ status: 'CANCELADA' });
    const stock = await request(app).get(`/api/filaments/${filament.body.id}`).set(bearer(token));
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.discarded).toBe(true);
    expect(cancelled.body.stockDeductedAt).toBeTruthy();
    expect(stock.body.usedGrams).toBe(42);
  });

  it('bloqueia transição inválida de status', async () => {
    const { token, model } = await setup();
    const p = await createPrint(token, model.id);
    const res = await request(app).put(`/api/prints/${p.id}`).set(bearer(token)).send({ status: 'CONCLUIDA' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_STATUS_TRANSITION');
  });

  it('exclui uma impressão', async () => {
    const { token, model } = await setup();
    const p = await createPrint(token, model.id);
    const del = await request(app).delete(`/api/prints/${p.id}`).set(bearer(token));
    expect(del.status).toBe(204);
  });

  it('GET /models/:id/prints retorna o modelo e suas impressões', async () => {
    const { token, model } = await setup();
    await createPrint(token, model.id);
    await createPrint(token, model.id, { material: 'PETG' });
    const res = await request(app).get(`/api/models/${model.id}/prints`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.model).toEqual({ id: model.id, name: model.name });
    expect(res.body.prints).toHaveLength(2);
  });

  it('exige autenticação', async () => {
    const res = await request(app).get('/api/prints');
    expect(res.status).toBe(401);
  });
});
