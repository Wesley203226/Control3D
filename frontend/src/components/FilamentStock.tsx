import { Plus, Trash2, Package, BarChart3, Edit2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
      toast.success(editingId ? 'Filamento atualizado' : 'Filamento adicionado');
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao salvar filamento:', error);
      toast.error('Não foi possível salvar o filamento');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja deletar este filamento?')) return;
    try {
      await api.filaments.remove(id);
      toast.success('Filamento excluído');
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
          <h3 className="text-lg font-semibold">Estoque de Filamentos</h3>
        </div>

        {loading ? (
          <div className="skeleton" />
        ) : filaments.length > 0 ? (
          <div className="space-y-3">
            {filaments.map((filament) => (
              <div
                key={filament.id}
                className="inset-panel flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="font-medium">
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
                  <p className="muted text-xs">
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
          <p className="muted text-sm">Nenhum filamento cadastrado.</p>
        )}

        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary mt-4 w-full">
          <Plus size={16} /> Adicionar Filamento
        </button>

        {showForm && (
          <div className="inset-panel mt-4 space-y-3">
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
            <p className="inset-panel mt-2 flex items-center justify-between text-sm">
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
            <h3 className="text-lg font-semibold">Consumo de Filamento</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Impressão</th>
                  <th>Material</th>
                  <th>Cor</th>
                  <th className="num">Qtd</th>
                </tr>
              </thead>
              <tbody>
                {consumedByPrint.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.name}</td>
                    <td>{item.material}</td>
                    <td>{item.color}</td>
                    <td className="num">{item.quantity}</td>
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
