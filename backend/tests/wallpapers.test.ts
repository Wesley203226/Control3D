import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app';
import { bearer, getToken, resetDb } from './helpers';

beforeEach(resetDb);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Busca de wallpapers', () => {
  it('exige autenticação e valida tipo e consulta', async () => {
    const token = await getToken();
    const unauthorized = await request(app).get('/api/wallpapers?query=anime&type=photo');
    const invalid = await request(app).get('/api/wallpapers?query=%20&type=audio').set(bearer(token));

    expect(unauthorized.status).toBe(401);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('VALIDATION_ERROR');
  });

  it('usa Wikimedia Commons para buscar fotos sem depender de chave Pexels', async () => {
    vi.stubEnv('PEXELS_API_KEY', '');
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      expect(String(input)).toMatch(/^https:\/\/commons\.wikimedia\.org\/w\/api\.php\?/);
      expect(String(input)).toContain('filetype%3Abitmap');
      return Response.json({
        query: {
          pages: [{
            pageid: 901,
            title: 'File:Montanhas ao amanhecer.jpg',
            imageinfo: [{
              url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/montanhas.jpg',
              thumburl: 'https://thumb.wikimedia.org/wikipedia/commons/a/a1/montanhas.jpg/1280px-montanhas.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Montanhas_ao_amanhecer.jpg',
              width: 1920,
              height: 1080,
              size: 1_000_000,
              extmetadata: {
                ObjectName: { value: 'Montanhas ao amanhecer' },
                Artist: { value: '<a href="/wiki/User:Artista">Artista</a>' },
                LicenseShortName: { value: 'CC BY-SA 4.0' },
                LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' },
              },
            }],
          }],
        },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const token = await getToken();
    const response = await request(app).get('/api/wallpapers?query=montanhas%20ao%20amanhecer&type=photo').set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([expect.objectContaining({
      id: 901,
      kind: 'photo',
      provider: 'commons',
      title: 'Montanhas ao amanhecer',
      imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/a/a1/montanhas.jpg/1280px-montanhas.jpg',
      photographer: 'Artista',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      pageUrl: 'https://commons.wikimedia.org/wiki/File:Montanhas_ao_amanhecer.jpg',
    })]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('busca fotos relevantes, atribui o autor e nunca retorna a chave da API', async () => {
    vi.stubEnv('PEXELS_API_KEY', 'private-test-key');
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toMatch(/^https:\/\/api\.pexels\.com\/v1\/search\?/);
      expect(new Headers(init?.headers).get('Authorization')).toBe('private-test-key');
      return Response.json({
        photos: [{
          id: 12,
          alt: 'Ilustração de anime',
          photographer: 'Artista',
          photographer_url: 'https://www.pexels.com/@artist',
          url: 'https://www.pexels.com/photo/12/',
          width: 1920,
          height: 1080,
          src: { large2x: 'https://images.pexels.com/photos/12/large.jpg' },
        }],
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const token = await getToken();
    const response = await request(app).get('/api/wallpapers?query=hunter%20x%20hunter&type=photo').set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('private, max-age=600');
    expect(response.body).toEqual([expect.objectContaining({
      id: 12,
      kind: 'photo',
      provider: 'pexels',
      title: 'Ilustração de anime',
      imageUrl: 'https://images.pexels.com/photos/12/large.jpg',
      photographer: 'Artista',
      pageUrl: 'https://www.pexels.com/photo/12/',
    })]);
    expect(JSON.stringify(response.body)).not.toContain('private-test-key');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('escolhe um vídeo MP4 panorâmico de tamanho adequado e reaproveita o cache', async () => {
    vi.stubEnv('PEXELS_API_KEY', 'private-test-key');
    const fetchMock = vi.fn(async () => Response.json({
      videos: [{
        id: 42,
        url: 'https://www.pexels.com/video/42/',
        image: 'https://images.pexels.com/videos/42/preview.jpg',
        duration: 18,
        width: 1920,
        height: 1080,
        user: { name: 'Film Maker', url: 'https://www.pexels.com/@film-maker' },
        video_files: [
          { link: 'https://videos.pexels.com/video-files/42/720p.mp4', width: 1280, height: 720, quality: 'hd', file_type: 'video/mp4' },
          { link: 'http://videos.pexels.com/video-files/42/insecure.mp4', width: 640, height: 360, quality: 'sd', file_type: 'video/mp4' },
          { link: 'https://videos.pexels.com/video-files/42/portrait.mp4', width: 720, height: 1280, quality: 'hd', file_type: 'video/mp4' },
        ],
      }],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const token = await getToken();
    const first = await request(app).get('/api/wallpapers?query=aurora&type=video').set(bearer(token));
    const second = await request(app).get('/api/wallpapers?query=aurora&type=video').set(bearer(token));

    expect(first.status).toBe(200);
    expect(first.body).toEqual([expect.objectContaining({
      kind: 'video',
      mediaUrl: 'https://videos.pexels.com/video-files/42/720p.mp4',
      durationSeconds: 18,
      photographer: 'Film Maker',
    })]);
    expect(second.body).toEqual(first.body);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('usa o acervo do Commons quando a Pexels limita a busca', async () => {
    vi.stubEnv('PEXELS_API_KEY', 'private-test-key');
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input).startsWith('https://api.pexels.com/')) return new Response(null, { status: 429 });
      return Response.json({ query: { pages: [] } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const token = await getToken();
    const response = await request(app).get('/api/wallpapers?query=fallback-limited-provider&type=video').set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('encontra vídeos WebM licenciados no Commons e mantém autoria e licença', async () => {
    vi.stubEnv('PEXELS_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      query: {
        pages: [{
          pageid: 903,
          title: 'File:Oceano.webm',
          imageinfo: [{
            url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/oceano.webm',
            thumburl: 'https://thumb.wikimedia.org/wikipedia/commons/a/a1/oceano.webm.jpg',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Oceano.webm',
            width: 1920,
            height: 1080,
            size: 24_000_000,
            duration: 18,
            extmetadata: {
              ObjectName: { value: 'Oceano' },
              Artist: { value: 'Videógrafo' },
              LicenseShortName: { value: 'CC BY 4.0' },
              LicenseUrl: { value: 'https://creativecommons.org/licenses/by/4.0/' },
            },
          }],
        }],
      },
    })));
    const token = await getToken();
    const response = await request(app).get('/api/wallpapers?query=licensed-ocean-video&type=video').set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([expect.objectContaining({
      id: 903,
      kind: 'video',
      provider: 'commons',
      mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/oceano.webm',
      photographer: 'Videógrafo',
      license: 'CC BY 4.0',
      durationSeconds: 18,
    })]);
  });
});
