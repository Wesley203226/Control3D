import { expect, test } from '@playwright/test';

test('cadastro, login e CRUD completo de modelos', async ({ page }) => {
  const email = `e2e-${Date.now()}@control3d.test`;

  await page.goto('/register');
  await page.getByLabel('Nome').fill('Aluno E2E');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('senha123');
  await page.getByLabel('Confirmar senha').fill('senha123');
  await page.getByRole('button', { name: /cadastrar/i }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha123');
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/models');
  await page.getByRole('button', { name: /novo modelo/i }).click();
  await page.getByRole('dialog').getByLabel('Nome').fill('Suporte de fone');
  await page.getByRole('dialog').getByLabel('Descrição').fill('Modelo criado pelo teste E2E');
  await page.getByRole('dialog').getByRole('button', { name: /criar modelo/i }).click();
  await expect(page.getByText('Suporte de fone', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /editar suporte de fone/i }).click();
  await page.getByRole('dialog').getByLabel('Nome').fill('Suporte de fone v2');
  await page.getByRole('dialog').getByRole('button', { name: /salvar/i }).click();
  await expect(page.getByText('Suporte de fone v2', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /excluir suporte de fone v2/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Suporte de fone v2', { exact: true })).toHaveCount(0);
});
