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

  it('segue o fluxo PENDENTE → EM_ANDAMENTO → CONCLUIDA e preenche finishedAt', async () => {
    const { token, model } = await setup();
    const p = await createPrint(token, model.id);
    const a = await request(app).put(`/api/prints/${p.id}`).set(bearer(token)).send({ status: 'EM_ANDAMENTO' });
    const b = await request(app).put(`/api/prints/${p.id}`).set(bearer(token)).send({ status: 'CONCLUIDA' });
    expect(a.body.status).toBe('EM_ANDAMENTO');
    expect(b.body.status).toBe('CONCLUIDA');
    expect(b.body.finishedAt).toBeTruthy();
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
