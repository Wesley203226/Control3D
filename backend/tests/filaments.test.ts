import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { bearer, createModel, getToken, resetDb } from './helpers';

beforeEach(resetDb);

const payload = (modelId: number, extra: object = {}) => ({
  modelId,
  material: 'PLA',
  color: 'Preto',
  spools: 1,
  gramPerSpool: 1000,
  ...extra,
});

describe('Estoque de filamentos', () => {
  it('cria e lista filamentos do modelo', async () => {
    const token = await getToken();
    const model = await createModel(token);
    const created = await request(app).post('/api/filaments').set(bearer(token)).send(payload(model.id));
    const listed = await request(app).get(`/api/models/${model.id}/filaments`).set(bearer(token));

    expect(created.status).toBe(201);
    expect(created.body.totalGrams).toBe(1000);
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].id).toBe(created.body.id);
  });

  it('valida os dados e exige autenticação', async () => {
    const token = await getToken();
    const model = await createModel(token);
    const invalid = await request(app).post('/api/filaments').set(bearer(token)).send(payload(model.id, { spools: 0 }));
    const unauthorized = await request(app).get(`/api/models/${model.id}/filaments`);

    expect(invalid.status).toBe(400);
    expect(unauthorized.status).toBe(401);
  });

  it('não permite criar estoque em modelo de outro usuário', async () => {
    const ownerToken = await getToken('owner@email.com');
    const otherToken = await getToken('other@email.com');
    const model = await createModel(ownerToken);
    const response = await request(app).post('/api/filaments').set(bearer(otherToken)).send(payload(model.id));

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('MODEL_NOT_FOUND');
  });

  it('busca, atualiza e exclui o estoque', async () => {
    const token = await getToken();
    const model = await createModel(token);
    const created = await request(app).post('/api/filaments').set(bearer(token)).send(payload(model.id));
    const updated = await request(app).patch(`/api/filaments/${created.body.id}`).set(bearer(token)).send({ spools: 2 });
    const found = await request(app).get(`/api/filaments/${created.body.id}`).set(bearer(token));
    const removed = await request(app).delete(`/api/filaments/${created.body.id}`).set(bearer(token));
    const missing = await request(app).get(`/api/filaments/${created.body.id}`).set(bearer(token));

    expect(updated.body.totalGrams).toBe(2000);
    expect(found.status).toBe(200);
    expect(removed.status).toBe(204);
    expect(missing.status).toBe(404);
  });

  it('não permite reduzir o estoque abaixo do consumo já registrado', async () => {
    const token = await getToken();
    const model = await createModel(token);
    const created = await request(app).post('/api/filaments').set(bearer(token)).send(payload(model.id));
    await prisma.filamentStock.update({ where: { id: created.body.id }, data: { usedGrams: 900 } });
    const response = await request(app).patch(`/api/filaments/${created.body.id}`).set(bearer(token)).send({ gramPerSpool: 800 });

    expect(response.status).toBe(400);
  });

  it('registra o consumo ao concluir uma impressão sem descontar duas vezes', async () => {
    const token = await getToken();
    const model = await createModel(token);
    const stock = await request(app).post('/api/filaments').set(bearer(token)).send(payload(model.id));
    const print = await request(app).post('/api/prints').set(bearer(token)).send({
      modelId: model.id,
      quantity: 1,
      material: 'PLA',
      color: 'Preto',
      estimatedTime: 60,
      filamentId: stock.body.id,
      filamentUsedGrams: 300,
    });
    await request(app).put(`/api/prints/${print.body.id}`).set(bearer(token)).send({ status: 'EM_ANDAMENTO' });
    const completed = await request(app).put(`/api/prints/${print.body.id}`).set(bearer(token)).send({ status: 'CONCLUIDA' });
    const updatedStock = await request(app).get(`/api/filaments/${stock.body.id}`).set(bearer(token));

    expect(completed.status).toBe(200);
    expect(updatedStock.body.totalGrams).toBe(1000);
    expect(updatedStock.body.usedGrams).toBe(300);
  });
});
