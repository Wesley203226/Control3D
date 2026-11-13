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
  await page.getByLabel('Senha', { exact: true }).fill('senha123');
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/models');
  await page.getByRole('button', { name: /novo projeto/i }).click();
  await page.getByRole('dialog').getByLabel('Nome').fill('Suporte de fone');
  await page.getByRole('dialog').getByLabel('Descrição').fill('Modelo criado pelo teste E2E');
  await page.locator('#model-stl').setInputFiles({
    name: 'triangulo.stl',
    mimeType: 'model/stl',
    buffer: Buffer.from(`solid triangle
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 30 0 0
vertex 0 30 20
endloop
endfacet
endsolid triangle
`),
  });
  await expect(page.getByText('triangulo.stl')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: /criar projeto/i }).click();
  await expect(page.getByText('Suporte de fone', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Abrir projeto' }).click();
  const preview = page.getByRole('region', { name: 'Pré-visualização do modelo 3D' });
  await expect(preview.getByText('triangulo.stl')).toBeVisible();
  const canvas = preview.locator('canvas');
  const previewError = preview.getByRole('alert');
  await expect.poll(async () => (await canvas.count()) > 0 || (await previewError.count()) > 0, { timeout: 15_000 }).toBe(true);
  if (!(await canvas.count())) await expect(previewError).toContainText(/WebGL|STL/i);
  await page.getByRole('link', { name: 'Voltar' }).click();

  await page.getByRole('button', { name: /editar suporte de fone/i }).click();
  await page.getByRole('dialog').getByLabel('Nome').fill('Suporte de fone v2');
  await page.getByRole('dialog').getByRole('button', { name: /salvar/i }).click();
  await expect(page.getByText('Suporte de fone v2', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /excluir suporte de fone v2/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Suporte de fone v2', { exact: true })).toHaveCount(0);
});
