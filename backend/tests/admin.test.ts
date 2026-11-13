import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { config } from '../src/lib/config';
import { prisma } from '../src/lib/prisma';
import { provisionAdminFromEnvironment } from '../src/services/admin.service';
import { bearer, getToken, resetDb } from './helpers';

const originalAdminConfig = {
  email: config.adminEmail,
  password: config.adminPassword,
  name: config.adminName,
};

beforeEach(async () => {
  config.adminEmail = '';
  config.adminPassword = '';
  config.adminName = '';
  await resetDb();
});

describe('Administração e manutenção de recursos', () => {
  it('promove a conta configurada sem substituir sua senha', async () => {
    await getToken('joao@email.com');
    config.adminEmail = 'joao@email.com';
    config.adminPassword = 'senha-inicial-nao-deve-substituir';
    await provisionAdminFromEnvironment();

    const user = await prisma.user.findUnique({ where: { email: 'joao@email.com' } });
    expect(user?.role).toBe('ADMIN');
    const login = await request(app).post('/api/auth/login').send({ email: 'joao@email.com', password: '123456' });
    expect(login.status).toBe(200);
  });

  it('cria uma conta administrativa se ela ainda não existir', async () => {
    config.adminEmail = 'admin@email.com';
    config.adminPassword = 'senha-admin-segura-123';
    config.adminName = 'Admin de Teste';
    await provisionAdminFromEnvironment();

    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@email.com',
      password: 'senha-admin-segura-123',
    });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('ADMIN');
    expect(login.body.user.name).toBe('Admin de Teste');
  });

  it('publica os recursos ativos por padrão', async () => {
    const response = await request(app).get('/api/features');
    expect(response.status).toBe(200);
    expect(response.body.features).toEqual({
      projects: true,
      prints: true,
      filaments: true,
      wallpapers: true,
      spotify: true,
    });
  });

  afterEach(() => {
    config.adminEmail = originalAdminConfig.email;
    config.adminPassword = originalAdminConfig.password;
    config.adminName = originalAdminConfig.name;
  });

  it('recusa alterações para uma conta comum', async () => {
    const token = await getToken();
    const response = await request(app)
      .patch('/api/admin/features')
      .set(bearer(token))
      .send({ spotify: false });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('FORBIDDEN');
  });

  it('permite ao administrador persistir os recursos em manutenção', async () => {
    const token = await getToken();
    await prisma.user.update({ where: { email: 'joao@email.com' }, data: { role: 'ADMIN' } });

    const update = await request(app)
      .patch('/api/admin/features')
      .set(bearer(token))
      .send({ spotify: false, wallpapers: false });
    expect(update.status).toBe(200);
    expect(update.body.features.spotify).toBe(false);
    expect(update.body.features.wallpapers).toBe(false);
    expect(update.body.features.projects).toBe(true);

    const publicState = await request(app).get('/api/features');
    expect(publicState.body.features.spotify).toBe(false);
    expect(publicState.body.features.wallpapers).toBe(false);
  });

  it('mantém impressões e estoque indisponíveis enquanto projetos está em manutenção', async () => {
    const token = await getToken();
    await prisma.user.update({ where: { email: 'joao@email.com' }, data: { role: 'ADMIN' } });

    const pauseProjects = await request(app)
      .patch('/api/admin/features')
      .set(bearer(token))
      .send({ projects: false });
    expect(pauseProjects.body.features.projects).toBe(false);
    expect(pauseProjects.body.features.prints).toBe(false);
    expect(pauseProjects.body.features.filaments).toBe(false);

    const enablePrints = await request(app)
      .patch('/api/admin/features')
      .set(bearer(token))
      .send({ prints: true });
    expect(enablePrints.status).toBe(409);
    expect(enablePrints.body.error).toBe('FEATURE_DEPENDENCY_REQUIRED');
  });

  it('bloqueia as rotas correspondentes quando cada recurso está em manutenção', async () => {
    const token = await getToken();
    const routes = [
      { key: 'projects', path: '/api/models' },
      { key: 'prints', path: '/api/prints' },
      { key: 'filaments', path: '/api/filaments' },
      { key: 'wallpapers', path: '/api/wallpapers?q=test' },
    ] as const;

    for (const route of routes) {
      await prisma.appFeature.create({ data: { key: route.key, enabled: false } });
      const response = await request(app).get(route.path).set(bearer(token));
      expect(response.status).toBe(503);
      expect(response.body.error).toBe('FEATURE_IN_MAINTENANCE');
      await prisma.appFeature.delete({ where: { key: route.key } });
    }
  });
});
