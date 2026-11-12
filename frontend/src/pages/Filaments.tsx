import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Boxes, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Modal from '../components/Modal';
import { api } from '../services/api';
import { errorMessage } from '../lib/utils';
import type { FilamentStock, Model } from '../types';

const MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'Outro'];
const LOW_STOCK_GRAMS = 250;

interface StockFormState {
  modelId: number;
  material: string;
  customMaterial: string;
  color: string;
  spools: number;
  gramPerSpool: number;
}

const emptyForm = (modelId = 0): StockFormState => ({
  modelId,
  material: 'PLA',
  customMaterial: '',
  color: '',
  spools: 1,
  gramPerSpool: 1000,
});

export default function Filaments() {
  const [models, setModels] = useState<Model[]>([]);
  const [stock, setStock] = useState<FilamentStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FilamentStock | null>(null);
  const [form, setForm] = useState<StockFormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [modelList, stockList] = await Promise.all([api.models.list(), api.filaments.listAll()]);
      setModels(modelList);
      setStock(stockList);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredStock = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return stock.filter((item) => {
      const available = Math.max(0, item.totalGrams - item.usedGrams);
      if (lowStockOnly && available >= LOW_STOCK_GRAMS) return false;
      if (!query) return true;
      return [item.material, item.color, item.model?.name ?? '']
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(query));
    });
  }, [stock, search, lowStockOnly]);

  const totalSpools = stock.reduce((total, item) => total + item.spools, 0);
  const availableGrams = stock.reduce((total, item) => total + Math.max(0, item.totalGrams - item.usedGrams), 0);
  const lowStockCount = stock.filter((item) => item.totalGrams - item.usedGrams < LOW_STOCK_GRAMS).length;
  const materialOptions = useMemo(
    () => [...new Set([...MATERIALS, ...(form.material !== 'Outro' && !MATERIALS.includes(form.material) ? [form.material] : [])])],
    [form.material],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(models[0]?.id ?? 0));
    setFormOpen(true);
  }

  function openEdit(item: FilamentStock) {
    const knownMaterial = MATERIALS.includes(item.material);
    setEditing(item);
    setForm({
      modelId: item.modelId,
      material: knownMaterial ? item.material : 'Outro',
      customMaterial: knownMaterial ? '' : item.material,
      color: item.color,
      spools: item.spools,
      gramPerSpool: item.gramPerSpool,
    });
    setFormOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const material = form.material === 'Outro' ? form.customMaterial.trim() : form.material;
    if (!material || !form.color.trim() || form.spools < 1 || form.gramPerSpool < 1 || (!editing && !form.modelId)) {
      toast.error('Preencha projeto, material, cor e pesos válidos.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.filaments.update(editing.id, {
          material,
          color: form.color.trim(),
          spools: form.spools,
          gramPerSpool: form.gramPerSpool,
        });
        toast.success('Filamento atualizado');
      } else {
        await api.filaments.create({
          modelId: form.modelId,
          material,
          color: form.color.trim(),
          spools: form.spools,
          gramPerSpool: form.gramPerSpool,
        });
        toast.success('Filamento adicionado ao estoque');
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: FilamentStock) {
    if (!confirm(`Remover ${item.material} ${item.color} do estoque?`)) return;
    try {
      await api.filaments.remove(item.id);
      toast.success('Filamento removido');
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="filaments-page">
      <header className="filaments-heading">
        <div>
          <p className="eyebrow">Materiais da oficina</p>
          <h1 className="page-title">Filamentos</h1>
          <p className="muted mt-2">Catálogo e saldo disponível por projeto.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate} disabled={!models.length}>
          <Plus size={16} /> Adicionar filamento
        </button>
      </header>

      {!models.length && !loading && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="muted text-sm">Cadastre um projeto antes de adicionar filamentos ao estoque.</p>
          <Link className="btn-ghost" to="/models">Ir para projetos</Link>
        </div>
      )}

      <div className="filament-stats">
        <div className="card filament-stat"><span className="settings-icon"><Boxes size={18} /></span><div><strong>{totalSpools}</strong><span>Rolos em estoque</span></div></div>
        <div className="card filament-stat"><span className="settings-icon"><Package size={18} /></span><div><strong>{availableGrams.toLocaleString('pt-BR')} g</strong><span>Peso disponível</span></div></div>
        <div className="card filament-stat"><span className="settings-icon filament-stat__warning"><Package size={18} /></span><div><strong>{lowStockCount}</strong><span>Itens com menos de {LOW_STOCK_GRAMS} g</span></div></div>
      </div>

      <section className="card filament-catalog">
        <div className="filament-catalog__toolbar">
          <label className="filament-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por material, cor ou projeto" aria-label="Buscar filamentos" />
          </label>
          <label className="filter-pill">
            <input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} />
            Estoque baixo
          </label>
          <span className="muted text-sm">{filteredStock.length} {filteredStock.length === 1 ? 'item' : 'itens'}</span>
        </div>

        {loading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>}
        {error && <p className="form-error text-center">Não foi possível carregar o estoque: {error}</p>}
        {!loading && !error && !filteredStock.length && (
          <div className="filament-empty">
            <span className="settings-icon"><Package size={21} /></span>
            <strong>{stock.length ? 'Nenhum filamento corresponde à busca.' : 'Seu catálogo ainda está vazio.'}</strong>
            <p className="muted text-sm">{stock.length ? 'Ajuste os filtros para ver outros materiais.' : 'Adicione rolos e acompanhe o consumo em cada projeto.'}</p>
          </div>
        )}

        <div className="filament-grid">
          {filteredStock.map((item) => {
            const available = Math.max(0, item.totalGrams - item.usedGrams);
            const percentUsed = item.totalGrams ? Math.min(100, (item.usedGrams / item.totalGrams) * 100) : 0;
            const low = available < LOW_STOCK_GRAMS;
            return (
              <article className="card filament-product" key={item.id}>
                <div className="filament-product__top">
                  <span className="filament-color-dot" style={{ backgroundColor: item.color }} aria-hidden="true" />
                  <span className={`chip ${low ? 'filament-chip--low' : ''}`}>{low ? 'Estoque baixo' : 'Disponível'}</span>
                  <div className="filament-product__actions">
                    <button type="button" className="icon-btn" title="Editar estoque" aria-label={`Editar ${item.material} ${item.color}`} onClick={() => openEdit(item)}><Pencil size={15} /></button>
                    <button type="button" className="icon-btn text-red-600" title="Remover" aria-label={`Remover ${item.material} ${item.color}`} onClick={() => void remove(item)}><Trash2 size={15} /></button>
                  </div>
                </div>
                <p className="filament-product__material">{item.material}</p>
                <p className="muted">{item.color}</p>
                <Link to={`/models/${item.modelId}`} className="text-link mt-3 text-sm">{item.model?.name ?? 'Projeto'}</Link>
                <div className="filament-product__quantity">
                  <strong>{available.toLocaleString('pt-BR')} <small>g</small></strong>
                  <span className="muted">{item.spools} {item.spools === 1 ? 'rolo' : 'rolos'} · {item.gramPerSpool} g cada</span>
                </div>
                <div className="filament-progress" role="progressbar" aria-label={`Consumo de ${item.material} ${item.color}`} aria-valuenow={Math.round(percentUsed)} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${percentUsed}%` }} />
                </div>
                <p className="muted text-xs">{item.usedGrams.toLocaleString('pt-BR')} g usados de {item.totalGrams.toLocaleString('pt-BR')} g</p>
              </article>
            );
          })}
        </div>
      </section>

      {formOpen && (
        <Modal title={editing ? 'Editar filamento' : 'Adicionar filamento'} onClose={() => setFormOpen(false)}>
          <form className="space-y-4" onSubmit={save}>
            {!editing && (
              <label>
                <span className="label">Projeto</span>
                <select className="input" value={form.modelId} onChange={(event) => setForm({ ...form, modelId: Number(event.target.value) })} required>
                  {models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                </select>
              </label>
            )}
            <label>
              <span className="label">Material</span>
              <select className="input" value={form.material} onChange={(event) => setForm({ ...form, material: event.target.value })}>
                {materialOptions.map((material) => <option key={material} value={material}>{material}</option>)}
              </select>
            </label>
            {form.material === 'Outro' && (
              <label><span className="label">Nome do material</span><input className="input" value={form.customMaterial} onChange={(event) => setForm({ ...form, customMaterial: event.target.value })} required placeholder="Ex.: PLA-CF, Nylon" /></label>
            )}
            <label><span className="label">Cor</span><input className="input" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} required placeholder="Ex.: Azul marinho, #315e9e" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Quantidade de rolos</span><input className="input" type="number" min={1} value={form.spools} onChange={(event) => setForm({ ...form, spools: Number(event.target.value) })} required /></label>
              <label><span className="label">Peso por rolo (g)</span><input className="input" type="number" min={1} value={form.gramPerSpool} onChange={(event) => setForm({ ...form, gramPerSpool: Number(event.target.value) })} required /></label>
            </div>
            <div className="inset-panel flex items-center justify-between text-sm"><span>Total cadastrado</span><strong>{(form.spools * form.gramPerSpool).toLocaleString('pt-BR')} g</strong></div>
            {editing && <p className="muted text-xs">O total não pode ser reduzido abaixo do filamento já consumido.</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Adicionar ao estoque'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
