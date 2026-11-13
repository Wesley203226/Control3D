import { useState } from 'react';
import { Box, Image, Layers3, Music2, Printer, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useFeatures } from '../contexts/FeaturesContext';
import { api } from '../services/api';
import type { FeatureKey } from '../types';

const controls: { key: FeatureKey; title: string; description: string; icon: typeof Box }[] = [
  { key: 'projects', title: 'Projetos', description: 'Cadastro e gerenciamento dos projetos 3D.', icon: Box },
  { key: 'prints', title: 'Peças e impressões', description: 'Ordens, acompanhamento e histórico de impressão.', icon: Printer },
  { key: 'filaments', title: 'Estoque de filamentos', description: 'Estoque, consumo e reservas de material.', icon: Layers3 },
  { key: 'wallpapers', title: 'Papéis de parede', description: 'Busca e alteração de fotos e vídeos de fundo.', icon: Image },
  { key: 'spotify', title: 'Spotify', description: 'Player e conexão da conta Spotify no espaço de trabalho.', icon: Music2 },
];

export default function Admin() {
  const { features, loading, error, refresh } = useFeatures();
  const [saving, setSaving] = useState<FeatureKey | null>(null);

  async function toggleFeature(key: FeatureKey) {
    if (!features || saving) return;
    setSaving(key);
    try {
      await api.admin.updateFeatures({ [key]: !features[key] });
      await refresh();
      toast.success(`${controls.find((control) => control.key === key)?.title} atualizado.`);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar o recurso.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Acesso restrito</p>
        <h1 className="page-title flex items-center gap-2"><ShieldCheck size={26} /> Administração</h1>
        <p className="muted mt-2">Desative temporariamente áreas do app e bloqueie também as rotas correspondentes da API.</p>
      </header>

      {error !== null && (
        <div className="card">
          <p className="form-error">Não foi possível carregar as configurações administrativas.</p>
          <button type="button" className="btn-ghost mt-3" onClick={() => void refresh().catch(() => undefined)}>Tentar novamente</button>
        </div>
      )}

      {loading && <p className="muted">Carregando configurações...</p>}

      {features && (
        <div className="grid gap-3">
          {controls.map(({ key, title, description, icon: Icon }) => {
            const enabled = features[key];
            const requiresProjects = (key === 'prints' || key === 'filaments') && !features.projects;
            return (
              <section key={key} className="card flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="settings-icon"><Icon size={18} /></span>
                  <div>
                    <h2 className="font-semibold">{title}</h2>
                    <p className="muted mt-1 text-sm">{description}</p>
                    <p className={`mt-2 text-xs font-semibold ${enabled ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                      {requiresProjects ? 'Indisponível até Projetos ser reativado' : enabled ? 'Disponível para os usuários' : 'Em manutenção — acesso bloqueado'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className={enabled ? 'btn-ghost' : 'btn-primary'}
                  aria-pressed={!enabled}
                  disabled={saving !== null || loading || requiresProjects}
                  onClick={() => void toggleFeature(key)}
                >
                  {saving === key ? 'Salvando...' : enabled ? 'Colocar em manutenção' : 'Reativar recurso'}
                </button>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
