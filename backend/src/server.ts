import { app } from './app';
import { config } from './lib/config';
import { prisma } from './lib/prisma';
import { provisionAdminFromEnvironment } from './services/admin.service';

async function startServer() {
  await provisionAdminFromEnvironment();

  if (config.isProduction && !config.corsOrigins.length) {
    console.warn('CORS_ORIGINS não configurado: qualquer origem poderá chamar a API.');
  }

  const server = app.listen(config.port, () => {
    console.log(`Control 3D API rodando em http://localhost:${config.port}`);
    console.log(`Swagger: http://localhost:${config.port}/api-docs`);
  });

  async function shutdown(signal: string) {
    console.log(`${signal} recebido; encerrando a API.`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    windowlessExitTimer();
  }

  function windowlessExitTimer() {
    const timer = setTimeout(() => process.exit(1), 10_000);
    timer.unref();
  }

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

startServer().catch((error: unknown) => {
  console.error('Não foi possível iniciar a API.', error);
  process.exitCode = 1;
});
