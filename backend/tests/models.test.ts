import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { bearer, createModel, getToken, resetDb } from './helpers';

beforeEach(resetDb);

describe('Modelos 3D', () => {
  it('cria um modelo', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/api/models')
      .set(bearer(token))
      .send({ name: 'Suporte para celular', description: 'Suporte de mesa', category: 'Utilidades' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Suporte para celular');
  });

  it('valida nome vazio', async () => {
    const token = await getToken();
    const res = await request(app).post('/api/models').set(bearer(token)).send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('lista apenas os modelos do usuário', async () => {
    const t1 = await getToken('a@email.com');
    const t2 = await getToken('b@email.com');
    await createModel(t1, 'Do A');
    await createModel(t2, 'Do B');
    const res = await request(app).get('/api/models').set(bearer(t1));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Do A');
    expect(res.body[0].printsCount).toBe(0);
  });

  it('busca um modelo', async () => {
    const token = await getToken();
    const model = await createModel(token);
    const res = await request(app).get(`/api/models/${model.id}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(model.id);
  });

  it('retorna 404 para modelo inexistente ou de outro usuário', async () => {
    const t1 = await getToken('a@email.com');
    const t2 = await getToken('b@email.com');
    const model = await createModel(t1);
    const res = await request(app).get(`/api/models/${model.id}`).set(bearer(t2));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('MODEL_NOT_FOUND');
  });

  it('atualiza um modelo', async () => {
    const token = await getToken();
    const model = await createModel(token);
    const res = await request(app).put(`/api/models/${model.id}`).set(bearer(token)).send({ name: 'Novo nome' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Novo nome');
  });

  it('exclui um modelo', async () => {
    const token = await getToken();
    const model = await createModel(token);
    const del = await request(app).delete(`/api/models/${model.id}`).set(bearer(token));
    expect(del.status).toBe(204);
    const get = await request(app).get(`/api/models/${model.id}`).set(bearer(token));
    expect(get.status).toBe(404);
  });

  it('exige autenticação', async () => {
    const res = await request(app).get('/api/models');
    expect(res.status).toBe(401);
  });
});
