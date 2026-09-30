import { execSync } from 'node:child_process';

// Cria/zera o banco de testes (prisma/test.db) antes da suíte.
export default function setup() {
  execSync('npx prisma db push --skip-generate --force-reset', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  });
}
