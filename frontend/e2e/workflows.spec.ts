import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function createAccountAndLogin(page: Page) {
  const email = `workflow-${Date.now()}@control3d.test`;
  await page.goto('/register');
  await page.getByLabel('Nome').fill('Oficina E2E');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('senha123');
  await page.getByLabel('Confirmar senha').fill('senha123');
  await page.getByRole('button', { name: /cadastrar/i }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('senha123');
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/$/);
}

test('navegação, preferências e saída funcionam em tela estreita', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await createAccountAndLogin(page);

  await page.getByRole('button', { name: 'Carbon' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('workspace-wallpaper'))).toBe('carbon');
  const wasDark = await page.locator('html').evaluate((element) => element.classList.contains('dark'));
  await page.getByRole('button', { name: 'Alternar tema' }).click();
  await expect.poll(() => page.locator('html').evaluate((element) => element.classList.contains('dark'))).toBe(!wasDark);
  await page.getByRole('button', { name: /sem blur/i }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('perf'))).toBe('1');
  await expect.poll(() => page.locator('.card').first().evaluate((element) => getComputedStyle(element).backdropFilter)).toBe('none');

  await page.getByRole('link', { name: 'Modelos' }).click();
  await expect(page).toHaveURL(/\/models$/);
  await expect(page.getByRole('link', { name: 'Modelos' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.rail-label').filter({ hasText: 'Modelos' })).toBeVisible();
  await page.getByRole('link', { name: 'Impressões' }).click();
  await expect(page).toHaveURL(/\/prints$/);
  await expect(page.getByRole('heading', { name: 'Impressões', exact: true })).toBeVisible();
  await expect(page.locator('.stage-content')).toHaveCSS('opacity', '1');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('gestão de filamento e ciclo de vida da impressão funcionam', async ({ page }) => {
  await createAccountAndLogin(page);
  await page.goto('/models');
  await page.getByRole('button', { name: /novo modelo/i }).click();
  await page.getByRole('dialog').getByLabel('Nome').fill('Peça operacional');
  await page.getByRole('dialog').getByRole('button', { name: /criar modelo/i }).click();
  await page.getByRole('link', { name: 'Ver modelo' }).click();

  await page.getByRole('button', { name: /adicionar filamento/i }).click();
  await page.getByPlaceholder('Ex: Preto, Branco, Azul').fill('Vermelho');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText(/PLA • Vermelho/)).toBeVisible();
  await page.locator('button[title="Editar"]').click();
  await page.getByPlaceholder('Ex: Preto, Branco, Azul').fill('Verde');
  await page.getByRole('button', { name: 'Atualizar' }).click();
  await expect(page.getByText(/PLA • Verde/)).toBeVisible();

  await page.getByRole('button', { name: /nova impressão/i }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[placeholder="Preto"]').fill('Verde');
  await dialog.locator('select').nth(2).selectOption({ label: 'PLA - Verde (1000g disponível)' });
  await dialog.locator('input[type="number"]').nth(1).fill('50');
  await dialog.getByRole('button', { name: /criar impressão/i }).click();

  await page.getByRole('button', { name: 'Iniciar' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await expect(page.getByText('Concluída', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/50g usados/)).toBeVisible();

  await page.getByRole('link', { name: /detalhes/i }).click();
  await expect(page).toHaveURL(/\/prints\/\d+$/);
  await expect(page.getByText('Peça operacional')).toBeVisible();
  page.once('dialog', (dialogEvent) => dialogEvent.accept());
  await page.getByRole('button', { name: 'Excluir' }).click();
  await expect(page).toHaveURL(/\/prints$/);
});
