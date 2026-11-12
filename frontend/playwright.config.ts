import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm.cmd run db:push && npm.cmd run dev',
      cwd: '../backend',
      url: 'http://127.0.0.1:3000/api-docs',
      env: {
        DATABASE_URL: 'file:./e2e.db',
        JWT_SECRET: 'segredo-e2e-longo-e-aleatorio-control3d',
        PORT: '3000',
      },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm.cmd run dev -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
