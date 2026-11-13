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
  await expect(page.getByLabel('E-mail')).toHaveValue(email);
  await page.getByLabel('Senha', { exact: true }).fill('senha123');
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('senha123');
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/$/);
}

test('navegação, preferências e saída funcionam em tela estreita', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await createAccountAndLogin(page);

  await page.getByRole('link', { name: 'Configurações' }).click();
  await page.getByRole('button', { name: 'Grafite' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('workspace-wallpaper'))).toBe('carbon');
  const wasDark = await page.locator('html').evaluate((element) => element.classList.contains('dark'));
  await page.locator('.settings-options').getByRole('button').first().click();
  await expect.poll(() => page.locator('html').evaluate((element) => element.classList.contains('dark'))).toBe(!wasDark);
  await page.getByRole('button', { name: /desativar desfoque/i }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('perf'))).toBe('1');
  await expect.poll(() => page.locator('.card').first().evaluate((element) => getComputedStyle(element).backdropFilter)).toBe('none');

  await page.getByRole('link', { name: 'Projetos' }).click();
  await expect(page).toHaveURL(/\/models$/);
  await expect(page.getByRole('link', { name: 'Projetos' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.rail-label').filter({ hasText: 'Projetos' })).toBeVisible();
  await page.getByRole('link', { name: 'Peças' }).click();
  await expect(page).toHaveURL(/\/prints$/);
  await expect(page.getByRole('heading', { name: 'Peças e impressões', exact: true })).toBeVisible();
  await expect(page.locator('.stage-content')).toHaveCSS('opacity', '1');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('papel de parede, photocard e player do Spotify persistem no espaço de trabalho', async ({ page }) => {
  await page.route('**/api/wallpapers?**', (route) => {
    expect(route.request().headers().authorization).toMatch(/^Bearer \S+$/);
    const type = new URL(route.request().url()).searchParams.get('type');
    return route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(type === 'video' ? [{
      id: 43,
      kind: 'video',
      provider: 'pexels',
      title: 'Vídeo de Film Maker',
      imageUrl: 'https://images.pexels.com/videos/43/preview.jpg',
      mediaUrl: 'https://videos.pexels.com/video-files/43/720p.mp4',
      pageUrl: 'https://www.pexels.com/video/43/',
      photographer: 'Film Maker',
      photographerUrl: 'https://www.pexels.com/@film-maker',
      width: 1280,
      height: 720,
      durationSeconds: 12,
    }] : [{
      id: 42,
      kind: 'photo',
      provider: 'pexels',
      title: 'Montanhas ao amanhecer',
      imageUrl: 'https://images.pexels.com/photos/42/landscape.jpg',
      mediaUrl: 'https://images.pexels.com/photos/42/landscape.jpg',
      pageUrl: 'https://www.pexels.com/photo/42/',
      photographer: 'Landscape Artist',
      photographerUrl: 'https://www.pexels.com/@landscape-artist',
      width: 1920,
      height: 1080,
    }]),
  });
  });
  await page.route('https://images.pexels.com/**', (route) => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="20"><rect width="32" height="20" fill="#7390ac"/></svg>',
  }));
  await page.route('https://open.spotify.com/embed/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>Spotify test embed</title>' }));

  await createAccountAndLogin(page);
  await page.getByRole('link', { name: 'Configurações' }).click();
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.getByRole('button', { name: 'Usar' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('workspace-background-image')))
    .toBe('https://images.pexels.com/photos/42/landscape.jpg');
  await page.getByRole('button', { name: 'Vídeos' }).click();
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.getByRole('button', { name: 'Usar' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('workspace-background-video') ?? 'null')?.url))
    .toBe('https://videos.pexels.com/video-files/43/720p.mp4');
  await expect(page.locator('.workspace-video-background video')).toHaveAttribute('src', 'https://videos.pexels.com/video-files/43/720p.mp4');

  await page.locator('input[aria-label="Escolher foto do photocard"]').setInputFiles({
    name: 'lugar-favorito.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40"><rect width="32" height="40" fill="#6757c8"/></svg>'),
  });
  await page.getByPlaceholder('Ex.: Meu refúgio favorito').fill('Meu refúgio favorito');
  await page.getByRole('button', { name: 'Salvar photocard' }).click();
  const photocard = page.locator('.workspace-photocard');
  await expect(photocard.locator('img')).toHaveAttribute('alt', 'Meu refúgio favorito');
  const sizeSlider = page.getByLabel('Tamanho do photocard');
  for (let step = 0; step < 4; step += 1) await sizeSlider.press('ArrowRight');
  await expect(photocard).toHaveCSS('width', '200px');
  const dragHandle = page.getByRole('button', { name: 'Mover photocard' });
  const dragBounds = await dragHandle.boundingBox();
  if (!dragBounds) throw new Error('A alça para mover o photocard não está visível.');
  await page.mouse.move(dragBounds.x + dragBounds.width / 2, dragBounds.y + dragBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragBounds.x + dragBounds.width / 2 + 60, dragBounds.y + dragBounds.height / 2 + 45, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('workspace-photocard-layout') ?? 'null')?.x)).not.toBe(78);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('workspace-photocard-layout') ?? 'null')?.size)).toBe(200);

  await page.getByText('Ou adicionar um player incorporado por link').click();
  await page.getByLabel('Link de uma faixa, álbum, playlist ou podcast do Spotify').fill('https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl?si=test');
  await page.getByRole('button', { name: 'Adicionar player' }).click();
  await expect(page.locator('.workspace-music iframe')).toHaveAttribute(
    'src',
    'https://open.spotify.com/embed/track/11dFghVXANMlKmJXsNCbNl?utm_source=generator&theme=0',
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => window.innerWidth));

  await page.reload();
  await expect(page.locator('.workspace-photocard img')).toHaveAttribute('alt', 'Meu refúgio favorito');
  await expect(page.locator('.workspace-photocard')).toHaveCSS('width', '200px');
  await expect(page.locator('.workspace-music iframe')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('workspace-wallpaper'))).toBe('custom');
});

test('gestão de filamento e ciclo de vida da impressão funcionam', async ({ page }) => {
  await createAccountAndLogin(page);
  await page.goto('/models');
  await page.getByRole('button', { name: /novo projeto/i }).click();
  const projectDialog = page.getByRole('dialog');
  await projectDialog.getByLabel('Nome').fill('Peça operacional');
  await projectDialog.getByLabel('Custo de modelagem (R$)').fill('60');
  await projectDialog.getByLabel('Cópias esperadas para amortizar').fill('20');
  await projectDialog.getByRole('button', { name: /criar projeto/i }).click();
  await page.getByRole('link', { name: 'Abrir projeto' }).click();

  await page.getByRole('button', { name: /adicionar filamento/i }).click();
  await page.getByPlaceholder('Ex: Preto, Branco, Azul').fill('Vermelho');
  await page.getByLabel('Custo de compra do filamento (R$/g)').fill('0.1');
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
  await dialog.getByLabel('Peso total do trabalho (g)').fill('50');
  await expect(dialog.getByText(/Custo estimado por peça:/)).toBeVisible();
  await dialog.getByRole('button', { name: /criar impressão/i }).click();

  await page.getByRole('button', { name: 'Iniciar' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await expect(page.getByText('Concluída', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/50g usados/)).toBeVisible();

  await page.getByRole('link', { name: /detalhes/i }).click();
  await expect(page).toHaveURL(/\/prints\/\d+$/);
  await expect(page.getByText('Peça operacional')).toBeVisible();
  page.once('dialog', (dialogEvent) => dialogEvent.accept());
  await page.getByRole('button', { name: /^Excluir$/ }).click();
  await expect(page).toHaveURL(/\/prints$/);
});
