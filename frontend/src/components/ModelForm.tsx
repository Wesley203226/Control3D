import { ChangeEvent, FormEvent, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '../lib/utils';
import { compressImageFile } from '../lib/image';
import type { Model, ModelInput } from '../types';
import Modal from './Modal';

const CATEGORY_OPTIONS = ['Utilidades', 'Brinquedo', 'Suporte', 'Estudo', 'Decoração', 'Ferramenta', 'Reparo', 'Outro'];

interface Props {
  initial?: Model;
  onSubmit: (data: ModelInput, stlFile: File | null) => Promise<void>;
  onClose: () => void;
}

export default function ModelForm({ initial, onSubmit, onClose }: Props) {
  const initialCategory = initial?.category ?? 'Utilidades';
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(CATEGORY_OPTIONS.includes(initialCategory) ? initialCategory : 'Outro');
  const [customCategory, setCustomCategory] = useState(!CATEGORY_OPTIONS.includes(initialCategory) ? initialCategory : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [stlFile, setStlFile] = useState<File | null>(null);
  const [sizeX, setSizeX] = useState(initial?.sizeX?.toString() ?? '');
  const [sizeY, setSizeY] = useState(initial?.sizeY?.toString() ?? '');
  const [sizeZ, setSizeZ] = useState(initial?.sizeZ?.toString() ?? '');
  const [modelingCost, setModelingCost] = useState(initial?.modelingCost ?? 0);
  const [expectedCopies, setExpectedCopies] = useState(initial?.expectedCopies ?? 1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const finalCategory = category === 'Outro' ? customCategory.trim() : category;
      await onSubmit({
        name,
        category: finalCategory || undefined,
        description,
        imageUrl: imageUrl || null,
        sizeX: sizeX ? Number(sizeX) : null,
        sizeY: sizeY ? Number(sizeY) : null,
        sizeZ: sizeZ ? Number(sizeZ) : null,
        modelingCost,
        expectedCopies,
      }, stlFile);
      toast.success(initial ? 'Projeto atualizado' : 'Projeto criado');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImageUrl(await compressImageFile(file));
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
    event.target.value = '';
  }

  function handleStlChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.stl')) {
      setError('Selecione um arquivo STL.');
      return;
    }
    if (file.size === 0 || file.size > 50 * 1024 * 1024) {
      setError('O STL deve ter entre 1 byte e 50 MB.');
      return;
    }
    setStlFile(file);
    setError('');
  }

  return (
    <Modal title={initial ? 'Editar projeto' : 'Novo projeto'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="model-name">Nome</label>
          <input id="model-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Suporte para celular" required />
        </div>
        <div>
          <label className="label" htmlFor="model-category">Categoria</label>
          <select
            id="model-category"
            className="input"
            value={CATEGORY_OPTIONS.includes(category) ? category : 'Outro'}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {category === 'Outro' && (
            <input
              id="model-custom-category"
              className="input mt-2"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Ex: brinquedo, suporte, estudo, protótipo, cosplay..."
            />
          )}
        </div>
        <div>
          <label className="label" htmlFor="model-description">Descrição</label>
          <textarea
            id="model-description"
            className="input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: peça para organizar materiais, protótipo de estudo, suporte para monitor, modelo para presentear, etc."
          />
        </div>
        <div>
          <label className="label" htmlFor="model-image">Foto do projeto</label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-ghost cursor-pointer">
              <ImagePlus size={16} /> Adicionar foto
              <input id="model-image" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
            </label>
            {imageUrl && <button type="button" className="btn-ghost !px-3" onClick={() => setImageUrl('')}><X size={15} /> Remover foto</button>}
          </div>
          {imageUrl && <img src={imageUrl} alt="Prévia do projeto" className="mt-3 h-40 w-full rounded-xl object-cover ring-1 ring-white/20" />}
          <p className="muted mt-2 text-xs">A foto é reduzida para manter o salvamento rápido.</p>
        </div>
        <div className="stl-upload">
          <div>
            <label className="label" htmlFor="model-stl">Arquivo 3D (.STL)</label>
            <p className="muted text-xs">Gire e inspecione o modelo 3D na página do projeto. Arquivos de até 50 MB ficam neste navegador.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="btn-ghost cursor-pointer">
              <ImagePlus size={16} /> {stlFile ? 'Trocar STL' : 'Selecionar STL'}
              <input id="model-stl" type="file" accept=".stl,model/stl,application/sla" className="sr-only" onChange={handleStlChange} />
            </label>
            {stlFile && (
              <>
                <span className="muted max-w-full truncate text-xs">{stlFile.name} · {(stlFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                <button type="button" className="btn-ghost !px-3" onClick={() => setStlFile(null)}><X size={15} /> Remover seleção</button>
              </>
            )}
          </div>
        </div>
        <div>
          <p className="label">Dimensões da peça (mm, opcional)</p>
          <div className="grid grid-cols-3 gap-3">
            <label><span className="sr-only">Largura X</span><input className="input" type="number" min="0.1" step="0.1" value={sizeX} onChange={(event) => setSizeX(event.target.value)} placeholder="Largura X" /></label>
            <label><span className="sr-only">Profundidade Y</span><input className="input" type="number" min="0.1" step="0.1" value={sizeY} onChange={(event) => setSizeY(event.target.value)} placeholder="Profundidade Y" /></label>
            <label><span className="sr-only">Altura Z</span><input className="input" type="number" min="0.1" step="0.1" value={sizeZ} onChange={(event) => setSizeZ(event.target.value)} placeholder="Altura Z" /></label>
          </div>
          <p className="muted mt-1 text-xs">As dimensões são comparadas ao volume da impressora ativa.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Custo de modelagem (R$)</span>
            <input className="input" type="number" min={0} step="0.01" value={modelingCost} onChange={(event) => setModelingCost(Number(event.target.value))} />
          </label>
          <label>
            <span className="label">Cópias esperadas para amortizar</span>
            <input className="input" type="number" min={1} step={1} value={expectedCopies} onChange={(event) => setExpectedCopies(Number(event.target.value))} required />
          </label>
        </div>
        <p className="muted text-xs">O custo de criação é dividido pelo número de cópias esperado e incluído no preço por peça.</p>
        {error && <p className="form-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={saving}>{initial ? 'Salvar' : 'Criar projeto'}</button>
        </div>
      </form>
    </Modal>
  );
}
