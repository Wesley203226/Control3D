import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { errorMessage, STATUS_LABEL } from '../lib/utils';
import type { FilamentStock, Model, Print, PrintInput, Status } from '../types';
import Modal from './Modal';
import { api } from '../services/api';

const MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'Outro'];

interface Props {
  models: { id: number; name: string }[];
  initial?: Print;
  fixedModelId?: number;
  onSubmit: (data: PrintInput) => Promise<void>;
  onClose: () => void;
}

export default function PrintForm({ models, initial, fixedModelId, onSubmit, onClose }: Props) {
  const [modelId, setModelId] = useState<number>(initial?.modelId ?? fixedModelId ?? models[0]?.id ?? 0);
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [material, setMaterial] = useState(initial?.material ?? 'PLA');
  const [color, setColor] = useState(initial?.color ?? '');
  const [hours, setHours] = useState(initial ? Math.floor(initial.estimatedTime / 60) : 1);
  const [minutes, setMinutes] = useState(initial ? initial.estimatedTime % 60 : 0);
  const [status, setStatus] = useState<Status>(initial?.status ?? 'PENDENTE');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [imageName, setImageName] = useState('');
  const [hasIssue, setHasIssue] = useState(initial?.hasIssue ?? false);
  const [issueNotes, setIssueNotes] = useState(initial?.issueNotes ?? '');
  const [filamentId, setFilamentId] = useState<number | null>(initial?.filamentId ?? null);
  const [filamentUsedGrams, setFilamentUsedGrams] = useState(initial?.filamentUsedGrams ?? 0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filaments, setFilaments] = useState<FilamentStock[]>([]);
  const [loadingFilaments, setLoadingFilaments] = useState(false);

  useEffect(() => {
    async function loadFilaments() {
      setLoadingFilaments(true);
      try {
        const data = await api.filaments.list(modelId);
        setFilaments(data);
      } catch (err) {
        console.error('Erro ao carregar filamentos:', err);
      } finally {
        setLoadingFilaments(false);
      }
    }
    if (modelId) loadFilaments();
  }, [modelId]);

  const materials = useMemo(
    () => (MATERIALS.includes(material) ? MATERIALS : [material, ...MATERIALS]),
    [material],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const estimatedTime = hours * 60 + minutes;
    if (estimatedTime <= 0) return setError('Informe um tempo estimado maior que zero.');
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        modelId,
        quantity,
        material,
        color,
        estimatedTime,
        notes,
        imageUrl: imageUrl || undefined,
        hasIssue,
        issueNotes: issueNotes || undefined,
        filamentId: filamentId || undefined,
        filamentUsedGrams,
        ...(initial ? {} : { status }),
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleLocalImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setImageUrl(result);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  }

  return (
    <Modal title={initial ? 'Editar impressão' : 'Nova impressão'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Modelo</label>
          <select
            className="input"
            value={modelId}
            onChange={(e) => setModelId(Number(e.target.value))}
            disabled={!!fixedModelId}
            required
          >
            {models.map((m: Pick<Model, 'id' | 'name'>) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Quantidade</label>
            <input className="input" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
          </div>
          <div>
            <label className="label">Material</label>
            <select className="input" value={material} onChange={(e) => setMaterial(e.target.value)}>
              {materials.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cor</label>
            <input className="input" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Preto" required />
          </div>
        </div>
        <div>
          <label className="label">Filamento (opcional)</label>
          <select
            className="input"
            value={filamentId ?? ''}
            onChange={(e) => setFilamentId(e.target.value ? Number(e.target.value) : null)}
            disabled={loadingFilaments || filaments.length === 0}
          >
            <option value="">Sem filamento selecionado</option>
            {filaments.map((f) => (
              <option key={f.id} value={f.id}>
                {f.material} - {f.color} ({f.totalGrams - f.usedGrams}g disponível)
              </option>
            ))}
          </select>
          {filaments.length === 0 && !loadingFilaments && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Nenhum filamento disponível para este modelo</p>
          )}
        </div>
        {filamentId && (
          <div>
            <label className="label">Gramas a usar</label>
            <input
              className="input"
              type="number"
              min={0}
              value={filamentUsedGrams}
              onChange={(e) => setFilamentUsedGrams(Number(e.target.value))}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Quantidade de gramas que será consumida quando a impressão for concluída</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Horas</label>
            <input className="input" type="number" min={0} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Minutos</label>
            <input className="input" type="number" min={0} max={59} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          </div>
          {!initial && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                {(['PENDENTE', 'EM_ANDAMENTO'] as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="label">Imagem da peça</label>
          <div className="space-y-2">
            <input type="file" accept="image/*" className="input file:mr-3 file:rounded file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white" onChange={handleLocalImageChange} />
            <input
              className="input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Ou cole uma URL da imagem"
            />
            {imageName && <p className="text-xs text-slate-500 dark:text-slate-400">Arquivo selecionado: {imageName}</p>}
            {imageUrl && (
              <img src={imageUrl} alt="Prévia da imagem" className="h-28 w-full rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
            )}
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={hasIssue} onChange={(e) => setHasIssue(e.target.checked)} />
            Houve erro na impressão / peça com defeito
          </label>
          {hasIssue && (
            <textarea
              className="input mt-3"
              rows={2}
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              placeholder="Descreva o problema: falha de camada, descolamento, medida errada, etc."
            />
          )}
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Imprimir com suporte" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={saving}>{initial ? 'Salvar' : 'Criar impressão'}</button>
        </div>
      </form>
    </Modal>
  );
}
