import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage, STATUS_LABEL } from '../lib/utils';
import type { FilamentStock, Model, Print, PrintInput, Status } from '../types';
import Modal from './Modal';
import { api } from '../services/api';
import { compressImageFile } from '../lib/image';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  models: Pick<Model, 'id' | 'name' | 'sizeX' | 'sizeY' | 'sizeZ' | 'modelingCost' | 'expectedCopies'>[];
  initial?: Print;
  fixedModelId?: number;
  onSubmit: (data: PrintInput) => Promise<void>;
  onClose: () => void;
}

export default function PrintForm({ models, initial, fixedModelId, onSubmit, onClose }: Props) {
  const { activePrinter, pricingSettings } = useTheme();
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
  const [hasSupports, setHasSupports] = useState(initial?.hasSupports ?? false);
  const [discarded, setDiscarded] = useState(initial?.discarded ?? false);
  const [filamentId, setFilamentId] = useState<number | null>(initial?.filamentId ?? null);
  const [filamentUsedGrams, setFilamentUsedGrams] = useState(initial?.filamentUsedGrams ?? 0);
  const [filamentCostPerGram, setFilamentCostPerGram] = useState(initial?.filamentCostPerGram ?? 0);
  const [laborMinutes, setLaborMinutes] = useState(initial?.laborMinutes ?? 0);
  const [materialWastePercent, setMaterialWastePercent] = useState(initial?.materialWastePercent ?? pricingSettings.materialWastePercent);
  const [profitMarginPercent, setProfitMarginPercent] = useState(initial?.profitMarginPercent ?? pricingSettings.profitMarginPercent);
  const [extraCostPerUnit, setExtraCostPerUnit] = useState(initial?.extraCostPerUnit ?? pricingSettings.extraCostPerUnit);
  const [salePricePerUnit, setSalePricePerUnit] = useState(initial?.salePricePerUnit?.toString() ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filaments, setFilaments] = useState<FilamentStock[]>([]);
  const [loadingFilaments, setLoadingFilaments] = useState(false);
  const printerPowerWatts = pricingSettings.printerPowerWatts[activePrinter.id] ?? activePrinter.powerWatts;
  const machineHourlyRate = pricingSettings.electricityRatePerKwh * printerPowerWatts / 1000 + pricingSettings.maintenanceCostPerHour;

  useEffect(() => {
    async function loadFilaments() {
      setLoadingFilaments(true);
      try {
        const data = await api.filaments.list(modelId);
        setFilaments(data);
        const selectedStock = data.find((item) => item.id === filamentId);
        if (selectedStock && !initial) setFilamentCostPerGram(selectedStock.costPerGram);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoadingFilaments(false);
      }
    }
    if (modelId) loadFilaments();
  }, [modelId]);

  const materials = useMemo(
    () => [...new Set([...activePrinter.supportedMaterials, 'Outro', material])],
    [activePrinter, material],
  );
  const materialSupported = activePrinter.supportedMaterials.includes(material) || material === 'Outro';
  const selectedModel = models.find((item) => item.id === modelId);
  const quote = useMemo(() => {
    const material = filamentUsedGrams / Math.max(quantity, 1) * filamentCostPerGram * (1 + materialWastePercent / 100);
    const machine = hours * 60 + minutes;
    const machineCost = machine / 60 * machineHourlyRate / Math.max(quantity, 1);
    const laborCost = laborMinutes / 60 * pricingSettings.laborHourlyRate / Math.max(quantity, 1);
    const modelingCost = (selectedModel?.modelingCost ?? 0) / Math.max(selectedModel?.expectedCopies ?? 1, 1);
    const total = material + machineCost + laborCost + modelingCost + extraCostPerUnit;
    return {
      material,
      machine: machineCost,
      labor: laborCost,
      modeling: modelingCost,
      total,
      suggested: total / (1 - profitMarginPercent / 100),
    };
  }, [filamentUsedGrams, filamentCostPerGram, materialWastePercent, quantity, hours, minutes, machineHourlyRate, laborMinutes, pricingSettings.laborHourlyRate, selectedModel, extraCostPerUnit, profitMarginPercent]);
  const exceedsPrinterVolume = !!selectedModel && (
    (selectedModel.sizeX != null && selectedModel.sizeX > activePrinter.volumeX) ||
    (selectedModel.sizeY != null && selectedModel.sizeY > activePrinter.volumeY) ||
    (selectedModel.sizeZ != null && selectedModel.sizeZ > activePrinter.volumeZ)
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
        hasSupports,
        discarded,
        filamentId,
        filamentUsedGrams,
        filamentCostPerGram,
        machineHourlyRate,
        laborHourlyRate: pricingSettings.laborHourlyRate,
        laborMinutes,
        materialWastePercent,
        profitMarginPercent,
        extraCostPerUnit,
        salePricePerUnit: salePricePerUnit ? Number(salePricePerUnit) : null,
        ...(initial ? {} : { status }),
      });
      toast.success(initial ? 'Impressão atualizada' : 'Impressão criada');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleLocalImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImageUrl(await compressImageFile(file));
      setImageName(file.name);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
    e.target.value = '';
  }

  return (
    <Modal title={initial ? 'Editar impressão' : 'Nova impressão'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Projeto</label>
          <select
            className="input"
            value={modelId}
            onChange={(e) => {
              setModelId(Number(e.target.value));
              setFilamentId(null);
              setFilamentCostPerGram(0);
            }}
            disabled={!!fixedModelId}
            required
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="settings-inline-printer">
          <Printer size={15} />
          <span><strong>{activePrinter.name}</strong> · {activePrinter.printVolume} · bico {activePrinter.nozzle}</span>
        </div>
        {exceedsPrinterVolume && (
          <p className="alert-warn text-sm">As dimensões deste projeto ultrapassam o volume de impressão de {activePrinter.name}. Confira a orientação ou selecione outra impressora em Configurações.</p>
        )}
        {!materialSupported && (
          <p className="alert-warn text-sm">{material} não está na lista de materiais do perfil de {activePrinter.name}. Revise a temperatura e a compatibilidade antes de iniciar.</p>
        )}
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
            onChange={(e) => {
              const nextId = e.target.value ? Number(e.target.value) : null;
              setFilamentId(nextId);
              setFilamentCostPerGram(filaments.find((item) => item.id === nextId)?.costPerGram ?? 0);
            }}
            disabled={loadingFilaments || filaments.length === 0 || !!initial?.stockDeductedAt}
          >
            <option value="">Sem filamento selecionado</option>
            {filaments.map((f) => (
              <option key={f.id} value={f.id}>
                {f.material} - {f.color} ({f.totalGrams - f.usedGrams - f.reservedGrams}g disponível)
              </option>
            ))}
          </select>
          {filamentId && (
            <label className="mt-2 block">
              <span className="label">Custo do filamento (R$/g)</span>
              <input className="input" type="number" min={0} step="0.001" value={filamentCostPerGram} onChange={(event) => setFilamentCostPerGram(Number(event.target.value))} />
            </label>
          )}
          {filaments.length === 0 && !loadingFilaments && (
            <p className="muted mt-1 text-xs">Nenhum filamento disponível para este modelo</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="print-filament-grams">Peso total do trabalho (g)</label>
          <input
            id="print-filament-grams"
            className="input"
            type="number"
            min={0}
            value={filamentUsedGrams}
            onChange={(e) => setFilamentUsedGrams(Number(e.target.value))}
            disabled={!!initial?.stockDeductedAt}
          />
          <p className="muted mt-1 text-xs">
            {initial?.stockDeductedAt
              ? 'O consumo já foi baixado do estoque e não pode ser alterado.'
              : filamentId
                ? 'Este peso será reservado ao criar a impressão e debitado do saldo consumido ao concluir ou descartar.'
                : 'Informe o peso total da ordem; ele será dividido pela quantidade no cálculo por peça.'}
          </p>
        </div>
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

        <section className="inset-panel space-y-3">
          <div>
            <h3 className="font-semibold">Preço estimado por peça</h3>
            <p className="muted text-xs">Consumo e tempo são da ordem inteira; os custos são divididos pela quantidade.</p>
          </div>
          <p className="muted text-xs">
            Máquina: {machineHourlyRate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/h
            {' '}({activePrinter.name}, {printerPowerWatts} W).
            Configure tarifa e potência em Configurações.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label">Mão de obra nesta ordem (min)</span>
              <input className="input" type="number" min={0} value={laborMinutes} onChange={(event) => setLaborMinutes(Number(event.target.value))} />
            </label>
            <label>
              <span className="label">Margem sobre o preço (%)</span>
              <input className="input" type="number" min={0} max={80} step="0.5" value={profitMarginPercent} onChange={(event) => setProfitMarginPercent(Number(event.target.value))} />
            </label>
            <label>
              <span className="label">Perda estimada de material (%)</span>
              <input className="input" type="number" min={0} max={100} step="0.5" value={materialWastePercent} onChange={(event) => setMaterialWastePercent(Number(event.target.value))} />
            </label>
            <label>
              <span className="label">Embalagem e extras por peça (R$)</span>
              <input className="input" type="number" min={0} step="0.01" value={extraCostPerUnit} onChange={(event) => setExtraCostPerUnit(Number(event.target.value))} />
            </label>
            <label>
              <span className="label">Preço de venda escolhido por peça (R$)</span>
              <input className="input" type="number" min={0} step="0.01" value={salePricePerUnit} onChange={(event) => setSalePricePerUnit(event.target.value)} placeholder={quote.suggested.toFixed(2)} />
            </label>
          </div>
          <div className="border-t border-white/10 pt-3 text-sm">
            <div className="grid gap-1 sm:grid-cols-2">
              <p>Material: <strong>{quote.material.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
              <p>Máquina: <strong>{quote.machine.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
              <p>Mão de obra: <strong>{quote.labor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
              <p>Modelagem amortizada: <strong>{quote.modeling.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
            </div>
            {!filamentCostPerGram && filamentUsedGrams > 0 && (
              <p className="alert-warn mt-2 text-xs">Informe o custo por grama do filamento para incluir o material nesta estimativa.</p>
            )}
            <p className="mt-2">Custo estimado por peça: <strong>{quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
            <p>Preço sugerido por peça: <strong>{quote.suggested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> · ordem: {(quote.suggested * quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        </section>

        <div>
          <label className="filter-pill">
            <input type="checkbox" checked={hasSupports} onChange={(e) => setHasSupports(e.target.checked)} />
            Esta peça usa suportes
          </label>
        </div>

        <div>
          <label className="label">Imagem da peça</label>
          <div className="space-y-2">
            <input type="file" accept="image/*" className="input" onChange={handleLocalImageChange} />
            <input
              className="input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Ou cole uma URL da imagem"
            />
            {imageName && <p className="muted text-xs">Arquivo selecionado: {imageName}</p>}
            {imageUrl && (
              <img src={imageUrl} alt="Prévia da imagem" className="h-28 w-full rounded-lg object-cover ring-1 ring-white/20" />
            )}
          </div>
        </div>

        <div className="alert-warn block">
          <label className="flex items-center gap-2 text-sm font-medium">
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
          <label className="mt-3 flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={discarded} onChange={(e) => setDiscarded(e.target.checked)} disabled={!!initial?.stockDeductedAt} />
            Peça descartada por falha na impressão
          </label>
          {discarded && filamentId && !initial?.stockDeductedAt && (
            <p className="muted mt-2 text-xs">Ao cancelar esta impressão, o peso informado será contabilizado como consumido no estoque.</p>
          )}
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Imprimir com suporte" />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={saving}>{initial ? 'Salvar' : 'Criar impressão'}</button>
        </div>
      </form>
    </Modal>
  );
}
