import { app } from './app';
import { config } from './lib/config';

app.listen(config.port, () => {
  console.log(`Control 3D API rodando em http://localhost:${config.port}`);
  console.log(`Swagger: http://localhost:${config.port}/api-docs`);
});
