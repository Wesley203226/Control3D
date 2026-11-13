import { app } from './app';
import { config } from './lib/config';
import { provisionAdminFromEnvironment } from './services/admin.service';

async function startServer() {
  await provisionAdminFromEnvironment();
  app.listen(config.port, () => {
    console.log(`Control 3D API rodando em http://localhost:${config.port}`);
    console.log(`Swagger: http://localhost:${config.port}/api-docs`);
  });
}

startServer().catch((error: unknown) => {
  console.error('Não foi possível iniciar a API.', error);
  process.exitCode = 1;
});
