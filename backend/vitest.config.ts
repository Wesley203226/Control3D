import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    globalSetup: ['./tests/globalSetup.ts'],
    env: { DATABASE_URL: 'file:./test.db', JWT_SECRET: 'test-secret' },
  },
});
