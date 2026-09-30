import { Plus, Trash2, Package, BarChart3, Edit2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Print } from '../types';
import { api } from '../services/api';

interface FilamentItem {
  id: number;
  material: string;
  color: string;
  spools: number;
  gramPerSpool: number;
  totalGrams: number;
  usedGrams: number;
}

interface Props {
  modelId: number;
  prints: Print[];
}

export default function FilamentStock({ modelId, prints }: Props) {
  const [filaments, setFilaments] = useState<FilamentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [material, setMaterial] = useState('PLA');
  const [color, setColor] = useState('');
  const [spools, setSpools] = useState(1);
  const [gramPerSpool, setGramPerSpool] = useState(1000);

  useEffect(() => {
    loadFilaments();
  }, [modelId]);

  async function loadFilaments() {
    try {
      setLoading(true);
      const data = await api.filaments.list(modelId);
      setFilaments(data);
    } catch (error) {
      console.error('Erro ao carregar filamentos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!color.trim()) return;

    try {
      if (editingId) {
        // Editar existente
        await api.filaments.update(editingId, { spools, gramPerSpool });
        setEditingId(null);
      } else {
        // Criar novo
        await api.filaments.create({ modelId, material, color, spools, gramPerSpool });
      }
      await loadFilaments();
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao salvar filamento:', error);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja deletar este filamento?')) return;
    try {
      await api.filaments.remove(id);
      await loadFilaments();
    } catch (error) {
      console.error('Erro ao deletar filamento:', error);
    }
  }

  function handleEdit(filament: FilamentItem) {
    setMaterial(filament.material);
    setColor(filament.color);
    setSpools(filament.spools);
    setGramPerSpool(filament.gramPerSpool);
    setEditingId(filament.id);
    setShowForm(true);
  }

  function resetForm() {
    setMaterial('PLA');
    setColor('');
    setSpools(1);
    setGramPerSpool(1000);
    setEditingId(null);
  }

  // Calcular consumo por impressão concluída
  const consumedByPrint = prints
    .filter((p) => p.status === 'CONCLUIDA' && p.finishedAt)
    .map((p) => ({
      material: p.material,
      color: p.color,
      quantity: p.quantity,
      estimatedTime: p.estimatedTime,
      name: `#${p.id}`,
    }));

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Package size={20} />
          <h3 className="text-lg font-semibold dark:text-slate-100">Estoque de Filamentos</h3>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Carregando filamentos...</p>
        ) : filaments.length > 0 ? (
          <div className="space-y-3">
            {filaments.map((filament) => (
              <div
                key={filament.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {filament.material} •{' '}
                    <span
                      style={{
                        color:
                          filament.color.toLowerCase() === 'preto'
                            ? '#000'
                            : filament.color.toLowerCase() === 'branco'
                              ? '#999'
                              : filament.color,
                      }}
                    >
                      {filament.color}
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {filament.spools} rolo{filament.spools !== 1 ? 's' : ''} de{' '}
                    <span className="font-semibold">{filament.gramPerSpool}g</span> cada • Total:{' '}
                    <span className="font-semibold">{filament.totalGrams - filament.usedGrams}g disponíveis</span>
                    {' '}({filament.usedGrams}g usados)
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(filament)}
                    className="btn-ghost !px-2 !py-1"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(filament.id)}
                    className="btn-ghost !px-2 !py-1 text-red-600"
                    title="Deletar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum filamento cadastrado.</p>
        )}

        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary mt-4 w-full">
          <Plus size={16} /> Adicionar Filamento
        </button>

        {showForm && (
          <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <div>
              <label className="label">Material</label>
              <select className="input" value={material} onChange={(e) => setMaterial(e.target.value)}>
                {['PLA', 'PETG', 'ABS', 'TPU', 'Outro'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cor</label>
              <input
                className="input"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ex: Preto, Branco, Azul"
              />
            </div>
            <div>
              <label className="label">Quantidade de Rolos</label>
              <input
                className="input"
                type="number"
                min={1}
                value={spools}
                onChange={(e) => setSpools(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Peso por Rolo (gramas)</label>
              <input
                className="input"
                type="number"
                min={1}
                value={gramPerSpool}
                onChange={(e) => setGramPerSpool(Number(e.target.value))}
              />
            </div>
            <p className="mt-2 flex items-center justify-between rounded bg-blue-50 p-2 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
              <span>Total:</span>
              <span className="font-semibold">{spools * gramPerSpool}g</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancelar
              </button>
              <button className="btn-primary flex-1" onClick={handleSave}>
                {editingId ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {consumedByPrint.length > 0 && (
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            <h3 className="text-lg font-semibold dark:text-slate-100">Consumo de Filamento</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-2 py-2 text-left font-medium">Impressão</th>
                  <th className="px-2 py-2 text-left font-medium">Material</th>
                  <th className="px-2 py-2 text-left font-medium">Cor</th>
                  <th className="px-2 py-2 text-right font-medium">Qtd</th>
                </tr>
              </thead>
              <tbody>
                {consumedByPrint.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-2">{item.name}</td>
                    <td className="px-2 py-2">{item.material}</td>
                    <td className="px-2 py-2">{item.color}</td>
                    <td className="px-2 py-2 text-right">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
