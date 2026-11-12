import { useState, type FormEvent } from 'react';
import { MonitorCog, Moon, Palette, Plus, Printer, Sun, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme, type Wallpaper } from '../contexts/ThemeContext';
import type { PrinterProfile } from '../data/printers';

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
};

export default function Settings() {
  const {
    dark, toggleTheme, performance, togglePerformance, wallpaper, setWallpaper,
    backgroundStart, backgroundEnd, setBackgroundColors, accentColor, setAccentColor,
    activePrinter, printers, setActivePrinter, addPrinter, updatePrinter, removePrinter,
  } = useTheme();
  const [printerFormOpen, setPrinterFormOpen] = useState(false);
  const [printerForm, setPrinterForm] = useState(initialPrinter);
  const [editingPrinterId, setEditingPrinterId] = useState<string | null>(null);

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
      nozzle: activePrinter.nozzle,
      materials: activePrinter.supportedMaterials.join(', '),
      hotend: activePrinter.hotend,
      firmware: activePrinter.firmware,
    });
    setEditingPrinterId(activePrinter.id);
    setPrinterFormOpen(true);
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
