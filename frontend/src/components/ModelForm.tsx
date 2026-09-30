import { FormEvent, useState } from 'react';
import { errorMessage } from '../lib/utils';
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
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const finalCategory = category === 'Outro' ? customCategory.trim() : category;
      await onSubmit({ name, category: finalCategory || undefined, description });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? 'Editar modelo' : 'Novo modelo'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nome</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Suporte para celular" required />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select
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
              className="input mt-2"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Ex: brinquedo, suporte, estudo, protótipo, cosplay..."
            />
          )}
        </div>
        <div>
          <label className="label">Descrição</label>
          <textarea
            className="input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: peça para organizar materiais, protótipo de estudo, suporte para monitor, modelo para presentear, etc."
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={saving}>{initial ? 'Salvar' : 'Criar modelo'}</button>
        </div>
      </form>
    </Modal>
  );
}
