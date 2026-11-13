import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, Music2, MonitorCog, Moon, Palette, Plus, Printer, RotateCcw, Search, Sun, Trash2, Video, X, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme, type Wallpaper } from '../contexts/ThemeContext';
import { useSpotify } from '../contexts/SpotifyContext';
import { useFeatures } from '../contexts/FeaturesContext';
import type { PrinterProfile } from '../data/printers';
import { compressWorkspaceImageFile } from '../lib/image';
import { normalizeSpotifyUrl } from '../lib/spotify';
import { searchWallpapers, type WallpaperKind, type WallpaperResult } from '../services/wallpapers';

const presets: { id: Exclude<Wallpaper, 'custom'>; name: string; start: string; end: string; accent: string }[] = [
  { id: 'aurora', name: 'Aurora de vidro', start: '#c4d5e8', end: '#d8c8e8', accent: '#6757c8' },
  { id: 'studio', name: 'Estúdio noturno', start: '#101b2c', end: '#283a55', accent: '#48a9c5' },
  { id: 'carbon', name: 'Grafite', start: '#202936', end: '#526171', accent: '#df855f' },
  { id: 'forest', name: 'Jardim calmo', start: '#c6ddd1', end: '#d8d1bd', accent: '#43826a' },
];

const initialPrinter = {
  name: '',
  brand: '',
  model: '',
  volumeX: 220,
  volumeY: 220,
  volumeZ: 250,
  nozzle: '0.4 mm',
  materials: 'PLA, PETG',
  hotend: '',
  firmware: '',
  powerWatts: 0,
};

export default function Settings() {
  const {
    dark, toggleTheme, performance, togglePerformance, wallpaper, setWallpaper,
    backgroundImage, setBackgroundImage, backgroundVideo, backgroundVideoError, setBackgroundVideo,
    backgroundStart, backgroundEnd, setBackgroundColors, accentColor, setAccentColor,
    photocardImage, photocardCaption, photocardLayout, setPhotocard, setPhotocardLayout, spotifyUrl, setSpotifyUrl,
    activePrinter, printers, setActivePrinter, addPrinter, updatePrinter, removePrinter,
    pricingSettings, updatePricingSettings, setPrinterPowerWatts,
  } = useTheme();
  const spotify = useSpotify();
  const { features } = useFeatures();
  const [printerFormOpen, setPrinterFormOpen] = useState(false);
  const [printerForm, setPrinterForm] = useState(initialPrinter);
  const [editingPrinterId, setEditingPrinterId] = useState<string | null>(null);
  const [wallpaperQuery, setWallpaperQuery] = useState('paisagem natureza');
  const [wallpaperKind, setWallpaperKind] = useState<WallpaperKind>('photo');
  const [wallpaperResults, setWallpaperResults] = useState<WallpaperResult[]>([]);
  const [wallpaperLoading, setWallpaperLoading] = useState(false);
  const [wallpaperUploading, setWallpaperUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [photocardUploading, setPhotocardUploading] = useState(false);
  const [photocardCaptionDraft, setPhotocardCaptionDraft] = useState(photocardCaption);
  const [spotifyDraft, setSpotifyDraft] = useState(spotifyUrl);

  function applyPreset(preset: typeof presets[number]) {
    setWallpaper(preset.id);
    setAccentColor(preset.accent);
  }

  function savePrinter(event: FormEvent) {
    event.preventDefault();
    const name = printerForm.name.trim();
    const volumeX = Number(printerForm.volumeX);
    const volumeY = Number(printerForm.volumeY);
    const volumeZ = Number(printerForm.volumeZ);
    const materials = [...new Set(printerForm.materials.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean))];
    if (!name || ![volumeX, volumeY, volumeZ].every((value) => Number.isFinite(value) && value > 0) || !materials.length) {
      toast.error('Informe o nome, o volume válido e pelo menos um material.');
      return;
    }

    const printer: Omit<PrinterProfile, 'id'> = {
      name,
      brand: printerForm.brand.trim() || 'Personalizada',
      model: printerForm.model.trim() || name,
      printVolume: `${volumeX} × ${volumeY} × ${volumeZ} mm`,
      volumeX,
      volumeY,
      volumeZ,
      nozzle: printerForm.nozzle.trim() || 'Não informado',
      supportedMaterials: materials,
      hotend: printerForm.hotend.trim() || 'Não informado',
      firmware: printerForm.firmware.trim() || 'Não informado',
      powerWatts: Number(printerForm.powerWatts) || 0,
    };
    if (editingPrinterId) updatePrinter(editingPrinterId, printer);
    else addPrinter(printer);
    setPrinterForm(initialPrinter);
    setEditingPrinterId(null);
    setPrinterFormOpen(false);
    toast.success(editingPrinterId ? 'Impressora atualizada' : 'Impressora adicionada e selecionada');
  }

  function editActivePrinter() {
    setPrinterForm({
      name: activePrinter.name,
      brand: activePrinter.brand,
      model: activePrinter.model,
      volumeX: activePrinter.volumeX,
      volumeY: activePrinter.volumeY,
      volumeZ: activePrinter.volumeZ,
      powerWatts: activePrinter.powerWatts,
      nozzle: activePrinter.nozzle,
      materials: activePrinter.supportedMaterials.join(', '),
      hotend: activePrinter.hotend,
      firmware: activePrinter.firmware,
    });
    setEditingPrinterId(activePrinter.id);
    setPrinterFormOpen(true);
  }

  async function findWallpapers(event: FormEvent) {
    event.preventDefault();
    if (!wallpaperQuery.trim()) {
      toast.error('Digite o que você quer encontrar no papel de parede.');
      return;
    }
    setWallpaperLoading(true);
    try {
      const results = await searchWallpapers(wallpaperQuery, wallpaperKind);
      setWallpaperResults(results);
      if (!results.length) {
        toast.message(wallpaperKind === 'photo' ? 'Nenhuma foto encontrada. Tente termos mais amplos.' : 'Nenhum vídeo encontrado. Tente outros termos.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível buscar os papéis de parede.');
    } finally {
      setWallpaperLoading(false);
    }
  }

  async function uploadVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setVideoUploading(true);
    try {
      await setBackgroundVideo({ kind: 'local', title: file.name }, file);
      toast.success('Papel de parede em vídeo salvo neste navegador');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar este vídeo.');
    } finally {
      setVideoUploading(false);
    }
  }

  async function chooseWallpaper(result: WallpaperResult) {
    try {
      if (result.kind === 'video') {
        await setBackgroundVideo({
          kind: result.provider,
          title: result.title,
          url: result.mediaUrl,
          pageUrl: result.pageUrl,
          photographer: result.photographer,
          photographerUrl: result.photographerUrl,
        });
        toast.success('Wallpaper em vídeo aplicado');
      } else {
        setBackgroundImage(result.imageUrl);
        toast.success('Wallpaper aplicado');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível aplicar este wallpaper.');
    }
  }

  async function removeVideoWallpaper() {
    try {
      await setBackgroundVideo(null);
      toast.success('Wallpaper em vídeo removido');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover este wallpaper.');
    }
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>, isPhotocard: boolean) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    isPhotocard ? setPhotocardUploading(true) : setWallpaperUploading(true);
    try {
      const image = await compressWorkspaceImageFile(file, isPhotocard);
      if (isPhotocard) {
        setPhotocard(image, photocardCaptionDraft);
        toast.success('Photocard atualizado');
      } else {
        setBackgroundImage(image);
        toast.success('Papel de parede atualizado');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar esta imagem.');
    } finally {
      isPhotocard ? setPhotocardUploading(false) : setWallpaperUploading(false);
    }
  }

  function savePhotocard(event: FormEvent) {
    event.preventDefault();
    if (!photocardImage) {
      toast.error('Escolha uma foto antes de salvar o photocard.');
      return;
    }
    try {
      setPhotocard(photocardImage, photocardCaptionDraft);
      toast.success('Photocard salvo');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o photocard.');
    }
  }

  function saveSpotify(event: FormEvent) {
    event.preventDefault();
    const url = normalizeSpotifyUrl(spotifyDraft.trim());
    if (!url) {
      toast.error('Cole um link válido de faixa, álbum, playlist ou podcast do Spotify.');
      return;
    }
    try {
      setSpotifyUrl(url);
      setSpotifyDraft(url);
      toast.success('Player do Spotify adicionado ao espaço de trabalho');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o player.');
    }
  }

  async function connectSpotify() {
    try {
      await spotify.connect();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar a conexão com o Spotify.');
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-heading">
        <div>
          <p className="eyebrow">Seu espaço, do seu jeito</p>
          <h1 className="page-title">Configurações</h1>
          <p className="muted mt-2">Aparência, desempenho e os equipamentos da sua oficina.</p>
        </div>
      </header>

      <section className="card settings-section">
        <div className="settings-section__heading">
          <span className="settings-icon"><Palette size={19} /></span>
          <div>
            <h2 className="text-lg font-semibold">Aparência e vidro</h2>
            <p className="muted text-sm">Escolha um estilo ou personalize cada cor.</p>
          </div>
        </div>

        <div className="settings-presets">
          {presets.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={`settings-preset ${wallpaper === preset.id ? 'selected' : ''}`}
              onClick={() => applyPreset(preset)}
              aria-pressed={wallpaper === preset.id}
            >
              <span className="settings-preset__preview" style={{ background: `linear-gradient(135deg, ${preset.start}, ${preset.end})` }}>
                <span />
              </span>
              <span>{preset.name}</span>
            </button>
          ))}
        </div>

        {features?.wallpapers !== false && <div className="settings-wallpaper-tools">
          <div className="settings-wallpaper-tools__heading">
            <div>
              <h3 className="font-semibold">Papel de parede</h3>
              <p className="muted text-xs">Busque imagens e vídeos licenciados no Wikimedia Commons sem chave; se uma chave Pexels válida estiver configurada, ela também pode ser usada.</p>
            </div>
            {(backgroundImage || backgroundVideo) && (
              <button type="button" className="btn-ghost !px-3 !py-2" onClick={() => setWallpaper('aurora')}>
                <X size={15} /> Remover wallpaper
              </button>
            )}
          </div>
          <div className="settings-wallpaper-kinds" aria-label="Tipo de papel de parede">
            <button type="button" aria-pressed={wallpaperKind === 'photo'} onClick={() => { setWallpaperKind('photo'); setWallpaperResults([]); }}>
              <ImagePlus size={15} /> Fotos
            </button>
            <button type="button" aria-pressed={wallpaperKind === 'video'} onClick={() => { setWallpaperKind('video'); setWallpaperResults([]); }}>
              <Video size={15} /> Vídeos
            </button>
          </div>
          <form className="settings-wallpaper-search" onSubmit={findWallpapers}>
            <input
              className="input"
              aria-label="Buscar papel de parede"
              value={wallpaperQuery}
              onChange={(event) => setWallpaperQuery(event.target.value)}
              placeholder={wallpaperKind === 'photo' ? 'Ex.: floresta, anime art, céu estrelado...' : 'Ex.: aurora, oceano, cidade à noite...'}
            />
            <button type="submit" className="btn-primary" disabled={wallpaperLoading}>
              <Search size={16} /> {wallpaperLoading ? 'Buscando...' : 'Buscar'}
            </button>
            {wallpaperKind === 'photo' ? (
              <label className="btn-ghost settings-upload-button">
                <ImagePlus size={16} /> {wallpaperUploading ? 'Preparando...' : 'Enviar foto'}
                <input type="file" accept="image/*" aria-label="Enviar papel de parede" disabled={wallpaperUploading} onChange={(event) => void uploadImage(event, false)} />
              </label>
            ) : (
              <label className="btn-ghost settings-upload-button">
                <Video size={16} /> {videoUploading ? 'Salvando...' : 'Enviar vídeo'}
                <input type="file" accept="video/mp4,video/webm" aria-label="Enviar vídeo de fundo" disabled={videoUploading} onChange={(event) => void uploadVideo(event)} />
              </label>
            )}
          </form>
          {backgroundVideoError && <p className="form-error mt-2" role="alert">{backgroundVideoError}</p>}
          {backgroundVideo && (
            <div className="settings-video-current">
              <Video size={16} />
              <div><strong>Vídeo ativo</strong><span title={backgroundVideo.title}>{backgroundVideo.title}</span></div>
              <button type="button" className="btn-ghost !px-3 !py-2" onClick={() => void removeVideoWallpaper()}><X size={15} /> Remover vídeo</button>
            </div>
          )}
          {!!wallpaperResults.length && (
            <div className="settings-wallpaper-results" aria-label="Resultados de papel de parede">
              {wallpaperResults.map((result) => (
                <article className={`settings-wallpaper-result ${(backgroundVideo?.kind === result.provider && backgroundVideo.url === result.mediaUrl) || backgroundImage === result.imageUrl ? 'selected' : ''}`} key={`${result.provider}-${result.kind}-${result.id}`}>
                  <img src={result.imageUrl} alt="" loading="lazy" />
                  <p title={result.title}>{result.title}</p>
                  <small title={`${result.kind === 'video' ? 'Vídeo' : 'Foto'} de ${result.photographer}`}>
                    {result.provider === 'commons' ? `${result.photographer} · ${result.license ?? 'Licença livre'}` : `${result.photographer} · Pexels`}
                  </small>
                  <div>
                    <button type="button" className="btn-primary !px-3 !py-1.5" onClick={() => void chooseWallpaper(result)}>Usar</button>
                    <a href={result.pageUrl} target="_blank" rel="noreferrer">{result.provider === 'commons' ? 'Wikimedia Commons' : 'Pexels'}</a>
                  </div>
                </article>
              ))}
            </div>
          )}
          {!wallpaperResults.length && !wallpaperLoading && (
            <p className="muted mt-2 text-xs">A busca alternativa usa o acervo livre do Wikimedia Commons e pode não encontrar fanart específica. Os resultados exibem autor e licença; para imagens pessoais ou conteúdo que não esteja no catálogo, envie um arquivo próprio.</p>
          )}
          <p className="muted mt-2 text-xs">A busca exige login. A Pexels pausou novas chaves; sem uma chave Pexels válida, o app pesquisa automaticamente no Wikimedia Commons. Para vídeos, confira a prévia e a licença antes de aplicar.</p>
        </div>}

        <div className="settings-color-grid">
          <label className="settings-color-field">
            <span>Cor inicial do fundo</span>
            <span className="settings-color-picker">
              <input type="color" value={backgroundStart} onChange={(event) => setBackgroundColors(event.target.value, backgroundEnd)} />
              <code>{backgroundStart.toUpperCase()}</code>
            </span>
          </label>
          <label className="settings-color-field">
            <span>Cor final do fundo</span>
            <span className="settings-color-picker">
              <input type="color" value={backgroundEnd} onChange={(event) => setBackgroundColors(backgroundStart, event.target.value)} />
              <code>{backgroundEnd.toUpperCase()}</code>
            </span>
          </label>
          <label className="settings-color-field">
            <span>Cor de destaque</span>
            <span className="settings-color-picker">
              <input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
              <code>{accentColor.toUpperCase()}</code>
            </span>
          </label>
        </div>

        <div className="settings-options">
          <button type="button" className="settings-option" onClick={toggleTheme}>
            <span className="settings-option__icon">{dark ? <Moon size={18} /> : <Sun size={18} />}</span>
            <span className="settings-option__copy">
              <strong>Tema {dark ? 'escuro' : 'claro'}</strong>
              <small>Alterne o contraste da interface</small>
            </span>
            <span className="btn-ghost !px-3 !py-1">{dark ? 'Escuro' : 'Claro'}</span>
          </button>
          <button type="button" className="settings-option" onClick={togglePerformance} aria-pressed={performance}>
            <span className="settings-option__icon"><MonitorCog size={18} /></span>
            <span className="settings-option__copy">
              <strong>Desativar desfoque</strong>
              <small>{performance ? 'Vidro sem blur para economizar recursos' : 'Mantém o vidro translúcido com blur ativo'}</small>
            </span>
            <span className={`settings-switch ${performance ? 'on' : ''}`} aria-hidden="true"><span /></span>
          </button>
        </div>
      </section>

      <section className="card settings-section">
        <div className="settings-section__heading">
          <span className="settings-icon"><Wallet size={19} /></span>
          <div>
            <h2 className="text-lg font-semibold">Custos e formação de preço</h2>
            <p className="muted text-sm">Valores da sua oficina usados para estimar cada impressão.</p>
          </div>
        </div>
        <p className="muted text-sm">
          Informe os valores da sua conta de energia e da sua operação. A potência fica vinculada à impressora ativa; a margem inicial de 35% é apenas uma sugestão editável, não uma cotação de mercado.
        </p>
        <div className="settings-form-grid mt-4">
          <label>
            <span className="label">Tarifa de energia (R$/kWh)</span>
            <input className="input" type="number" min={0} step="0.001" value={pricingSettings.electricityRatePerKwh} onChange={(event) => updatePricingSettings('electricityRatePerKwh', Number(event.target.value))} />
          </label>
          <label>
            <span className="label">Potência média — {activePrinter.name} (W)</span>
            <input className="input" type="number" min={0} step={1} value={pricingSettings.printerPowerWatts[activePrinter.id] ?? activePrinter.powerWatts} onChange={(event) => setPrinterPowerWatts(activePrinter.id, Number(event.target.value))} />
          </label>
          <label>
            <span className="label">Manutenção e desgaste da máquina (R$/h)</span>
            <input className="input" type="number" min={0} step="0.01" value={pricingSettings.maintenanceCostPerHour} onChange={(event) => updatePricingSettings('maintenanceCostPerHour', Number(event.target.value))} />
          </label>
          <label>
            <span className="label">Mão de obra (R$/h)</span>
            <input className="input" type="number" min={0} step="0.01" value={pricingSettings.laborHourlyRate} onChange={(event) => updatePricingSettings('laborHourlyRate', Number(event.target.value))} />
          </label>
          <label>
            <span className="label">Perda de material padrão (%)</span>
            <input className="input" type="number" min={0} max={100} step="0.5" value={pricingSettings.materialWastePercent} onChange={(event) => updatePricingSettings('materialWastePercent', Number(event.target.value))} />
          </label>
          <label>
            <span className="label">Margem sugerida padrão (%)</span>
            <input className="input" type="number" min={0} max={80} step="0.5" value={pricingSettings.profitMarginPercent} onChange={(event) => updatePricingSettings('profitMarginPercent', Number(event.target.value))} />
          </label>
          <label>
            <span className="label">Embalagem e extras padrão (R$/peça)</span>
            <input className="input" type="number" min={0} step="0.01" value={pricingSettings.extraCostPerUnit} onChange={(event) => updatePricingSettings('extraCostPerUnit', Number(event.target.value))} />
          </label>
        </div>
        <p className="inset-panel mt-4 text-sm">
          Custo estimado da máquina: <strong>{(pricingSettings.electricityRatePerKwh * (pricingSettings.printerPowerWatts[activePrinter.id] ?? activePrinter.powerWatts) / 1000 + pricingSettings.maintenanceCostPerHour).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/h</strong>
          {' '}· Seus valores ficam salvos neste navegador.
        </p>
      </section>

      <section className="card settings-section">
        <div className="settings-section__heading">
          <span className="settings-icon"><ImagePlus size={19} /></span>
          <div>
            <h2 className="text-lg font-semibold">Meu photocard</h2>
            <p className="muted text-sm">Deixe no cabeçalho uma foto de um lugar que você gosta.</p>
          </div>
        </div>
        <form className="settings-photocard-form" onSubmit={savePhotocard}>
          {photocardImage ? (
            <img className="settings-photocard-preview" src={photocardImage} alt="Prévia do photocard" />
          ) : (
            <div className="settings-photocard-placeholder"><ImagePlus size={25} /><span>Sua foto aparece aqui</span></div>
          )}
          <div className="settings-photocard-fields">
            <p className="muted text-xs">No espaço de trabalho, arraste pela alça <strong>Mover</strong> para posicionar a moldura.</p>
            <label className="settings-upload-button btn-ghost">
              <ImagePlus size={16} /> {photocardUploading ? 'Preparando...' : 'Escolher foto'}
              <input type="file" accept="image/*" aria-label="Escolher foto do photocard" disabled={photocardUploading} onChange={(event) => void uploadImage(event, true)} />
            </label>
            <label>
              <span className="label">Legenda</span>
              <input
                className="input"
                maxLength={80}
                value={photocardCaptionDraft}
                disabled={photocardUploading}
                onChange={(event) => setPhotocardCaptionDraft(event.target.value)}
                placeholder="Ex.: Meu refúgio favorito"
              />
            </label>
            <label className="settings-photocard-size">
              <span>Tamanho da moldura <span className="settings-photocard-size__value">{photocardLayout.size}px</span></span>
              <input
                type="range"
                min={120}
                max={260}
                step={10}
                aria-label="Tamanho do photocard"
                value={photocardLayout.size}
                onChange={(event) => setPhotocardLayout({ ...photocardLayout, size: Number(event.target.value) })}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost" onClick={() => setPhotocardLayout({ x: 78, y: 12, size: photocardLayout.size })}>
                <RotateCcw size={15} /> Restaurar posição
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary" disabled={photocardUploading}>Salvar photocard</button>
              {(photocardImage || photocardCaption) && (
                <button type="button" className="btn-ghost" disabled={photocardUploading} onClick={() => {
                  try {
                    setPhotocard(null, '');
                    setPhotocardCaptionDraft('');
                    toast.success('Photocard removido');
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Não foi possível remover o photocard.');
                  }
                }}><Trash2 size={15} /> Remover</button>
              )}
            </div>
          </div>
        </form>
      </section>

      {features?.spotify !== false && <section className="card settings-section">
        <div className="settings-section__heading">
          <span className="settings-icon"><Music2 size={19} /></span>
          <div>
            <h2 className="text-lg font-semibold">Música no espaço de trabalho</h2>
            <p className="muted text-sm">Conecte sua conta Premium para ouvir, pausar e pular faixas sem sair do app.</p>
          </div>
        </div>
        <div className="settings-spotify-account">
          <div className="settings-spotify-account__copy">
            <strong>{spotify.connected ? 'Spotify conectado' : 'Player da sua conta'}</strong>
            <span>{spotify.connected
              ? spotify.playback ? `${spotify.playback.title} · ${spotify.playback.artists}` : 'Conta conectada; inicie uma faixa no Spotify para transferir a reprodução.'
              : 'Conecte a conta Premium com OAuth PKCE para mostrar a faixa ativa e controlar a reprodução.'}</span>
          </div>
          {!spotify.connected ? (
            <button type="button" className="btn-primary" onClick={() => void connectSpotify()} disabled={spotify.connecting}>
              <Music2 size={16} /> {spotify.connecting ? 'Conectando...' : 'Conectar conta Spotify'}
            </button>
          ) : (
            <button type="button" className="btn-ghost" onClick={spotify.disconnect}>Desconectar</button>
          )}
        </div>
        {!spotify.clientConfigured && (
          <div className="alert-warn mt-3">
            Para ativar os controles completos, crie seu app no Spotify Developer, configure o Client ID em <code>VITE_SPOTIFY_CLIENT_ID</code> no arquivo local <code>frontend/.env</code>, cadastre exatamente <code>{window.location.origin}/configuracoes</code> como URL de retorno e reinicie o Vite. A URL precisa usar o mesmo host aberto no navegador. Nunca adicione Client Secret ou token manual ao front-end.
          </div>
        )}
        {spotify.error && <p className="form-error mt-3" role="alert">{spotify.error}</p>}
        <p className="muted mt-2 text-xs">O player usa o Web Playback SDK e requer Spotify Premium, Client ID configurado, URL de retorno cadastrada e a conta autorizada no app Spotify Developer. Ao conectar, uma faixa ativa é transferida para o navegador; se não houver música ativa, inicie uma no Spotify e use os controles aqui. O app usa OAuth PKCE e não precisa de Client Secret; tokens ficam somente nesta aba.</p>
        <details className="settings-spotify-embed">
          <summary>Ou adicionar um player incorporado por link</summary>
        <form className="settings-spotify-form" onSubmit={saveSpotify}>
          <label>
            <span className="label">Link de uma faixa, álbum, playlist ou podcast do Spotify</span>
            <input
              type="url"
              className="input"
              value={spotifyDraft}
              onChange={(event) => setSpotifyDraft(event.target.value)}
              placeholder="https://open.spotify.com/track/..."
              required
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary">Adicionar player</button>
            {spotifyUrl && (
              <button type="button" className="btn-ghost" onClick={() => {
                setSpotifyUrl(null);
                setSpotifyDraft('');
                toast.success('Player removido');
              }}><Trash2 size={15} /> Remover player</button>
            )}
          </div>
        </form>
        </details>
      </section>}

      <section className="card settings-section">
        <div className="settings-section__heading">
          <span className="settings-icon"><Printer size={19} /></span>
          <div>
            <h2 className="text-lg font-semibold">Impressora da oficina</h2>
            <p className="muted text-sm">Volume, materiais e alertas de compatibilidade usam este perfil.</p>
          </div>
        </div>

        <label className="label" htmlFor="active-printer">Impressora ativa</label>
        <div className="settings-printer-select">
          <select id="active-printer" className="input" value={activePrinter.id} onChange={(event) => setActivePrinter(event.target.value)}>
            {printers.map((printer) => <option key={printer.id} value={printer.id}>{printer.name}</option>)}
          </select>
        </div>
        {activePrinter.id.startsWith('custom-') && (
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn-ghost !px-3" onClick={editActivePrinter}><Printer size={15} /> Editar perfil</button>
            <button type="button" className="btn-ghost !px-3 text-red-600" onClick={() => removePrinter(activePrinter.id)} aria-label={`Remover ${activePrinter.name}`} title="Remover impressora personalizada"><Trash2 size={16} /> Remover</button>
          </div>
        )}
        <div className="settings-printer-specs">
          <div><span>Volume</span><strong>{activePrinter.printVolume}</strong></div>
          <div><span>Bico</span><strong>{activePrinter.nozzle}</strong></div>
          <div><span>Hotend</span><strong>{activePrinter.hotend}</strong></div>
          <div><span>Firmware / fatiador</span><strong>{activePrinter.firmware}</strong></div>
          <div className="settings-printer-specs__materials"><span>Materiais</span><div>{activePrinter.supportedMaterials.map((material) => <span className="chip" key={material}>{material}</span>)}</div></div>
        </div>

        {!printerFormOpen ? (
          <button type="button" className="btn-ghost mt-5" onClick={() => { setEditingPrinterId(null); setPrinterForm(initialPrinter); setPrinterFormOpen(true); }}><Plus size={16} /> Cadastrar outra impressora</button>
        ) : (
          <form className="settings-printer-form" onSubmit={savePrinter}>
            <div className="settings-form-grid">
              <label><span className="label">Nome *</span><input className="input" required value={printerForm.name} onChange={(event) => setPrinterForm({ ...printerForm, name: event.target.value })} placeholder="Minha impressora" /></label>
              <label><span className="label">Marca</span><input className="input" value={printerForm.brand} onChange={(event) => setPrinterForm({ ...printerForm, brand: event.target.value })} /></label>
              <label><span className="label">Modelo</span><input className="input" value={printerForm.model} onChange={(event) => setPrinterForm({ ...printerForm, model: event.target.value })} /></label>
              <label><span className="label">Bico</span><input className="input" value={printerForm.nozzle} onChange={(event) => setPrinterForm({ ...printerForm, nozzle: event.target.value })} /></label>
              <label><span className="label">Potência média (W)</span><input className="input" type="number" min={0} value={printerForm.powerWatts} onChange={(event) => setPrinterForm({ ...printerForm, powerWatts: Number(event.target.value) })} /></label>
            </div>
            <p className="label mt-4">Volume de impressão (mm)</p>
            <div className="settings-form-grid settings-form-grid--dimensions">
              {(['volumeX', 'volumeY', 'volumeZ'] as const).map((dimension, index) => (
                <label key={dimension}><span className="label">{['Largura X', 'Profundidade Y', 'Altura Z'][index]}</span><input className="input" type="number" min={1} required value={printerForm[dimension]} onChange={(event) => setPrinterForm({ ...printerForm, [dimension]: Number(event.target.value) })} /></label>
              ))}
            </div>
            <div className="settings-form-grid mt-4">
              <label><span className="label">Materiais suportados</span><input className="input" value={printerForm.materials} onChange={(event) => setPrinterForm({ ...printerForm, materials: event.target.value })} placeholder="PLA, PETG, ABS, TPU" /></label>
              <label><span className="label">Hotend</span><input className="input" value={printerForm.hotend} onChange={(event) => setPrinterForm({ ...printerForm, hotend: event.target.value })} /></label>
              <label><span className="label">Firmware / fatiador</span><input className="input" value={printerForm.firmware} onChange={(event) => setPrinterForm({ ...printerForm, firmware: event.target.value })} /></label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => { setPrinterFormOpen(false); setEditingPrinterId(null); }}>Cancelar</button>
              <button className="btn-primary"><Plus size={15} /> {editingPrinterId ? 'Salvar alterações' : 'Salvar impressora'}</button>
            </div>
          </form>
        )}
        <p className="muted mt-4 text-xs">As preferências visuais e os perfis personalizados ficam salvos neste navegador.</p>
      </section>
    </div>
  );
}
