import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { bearer, getToken, resetDb } from './helpers';

beforeEach(resetDb);

describe('Autenticação e usuários', () => {
  const user = { name: 'João', email: 'joao@email.com', password: '123456' };

  it('cadastra um usuário sem expor a senha', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejeita e-mail já cadastrado', async () => {
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('USER_ALREADY_EXISTS');
  });

  it('valida os dados do cadastro', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: '', email: 'x', password: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('faz login válido e retorna JWT', async () => {
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejeita login com senha incorreta', async () => {
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'errada' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
  });

  it('GET /users/me retorna o usuário autenticado', async () => {
    const token = await getToken();
    const res = await request(app).get('/api/users/me').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('joao@email.com');
  });

  it('bloqueia acesso sem token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'UNAUTHORIZED', message: 'Token não informado.' });
  });

  it('bloqueia token inválido', async () => {
    const res = await request(app).get('/api/users/me').set(bearer('token-falso'));
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token inválido ou expirado.');
  });
});
