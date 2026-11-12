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
  onSubmit: (data: ModelInput) => Promise<void>;
  onClose: () => void;
}

export default function ModelForm({ initial, onSubmit, onClose }: Props) {
  const initialCategory = initial?.category ?? 'Utilidades';
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(CATEGORY_OPTIONS.includes(initialCategory) ? initialCategory : 'Outro');
  const [customCategory, setCustomCategory] = useState(!CATEGORY_OPTIONS.includes(initialCategory) ? initialCategory : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [sizeX, setSizeX] = useState(initial?.sizeX?.toString() ?? '');
  const [sizeY, setSizeY] = useState(initial?.sizeY?.toString() ?? '');
  const [sizeZ, setSizeZ] = useState(initial?.sizeZ?.toString() ?? '');
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
      });
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
        <div>
          <p className="label">Dimensões da peça (mm, opcional)</p>
          <div className="grid grid-cols-3 gap-3">
            <label><span className="sr-only">Largura X</span><input className="input" type="number" min="0.1" step="0.1" value={sizeX} onChange={(event) => setSizeX(event.target.value)} placeholder="Largura X" /></label>
            <label><span className="sr-only">Profundidade Y</span><input className="input" type="number" min="0.1" step="0.1" value={sizeY} onChange={(event) => setSizeY(event.target.value)} placeholder="Profundidade Y" /></label>
            <label><span className="sr-only">Altura Z</span><input className="input" type="number" min="0.1" step="0.1" value={sizeZ} onChange={(event) => setSizeZ(event.target.value)} placeholder="Altura Z" /></label>
          </div>
          <p className="muted mt-1 text-xs">As dimensões são comparadas ao volume da impressora ativa.</p>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={saving}>{initial ? 'Salvar' : 'Criar projeto'}</button>
        </div>
      </form>
    </Modal>
  );
}
