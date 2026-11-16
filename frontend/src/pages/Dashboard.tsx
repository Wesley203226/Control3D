import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Box, CheckCircle2, Clock3, Loader, Plus, Printer } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import CountUp from '../components/CountUp';
import HoursChart from '../components/HoursChart';
import PrintForm from '../components/PrintForm';
import PrintItem from '../components/PrintItem';
import { useAuth } from '../contexts/AuthContext';
import { useFeatures } from '../contexts/FeaturesContext';
import { api } from '../services/api';
import type { Print } from '../types';
import type { LucideIcon } from 'lucide-react';

interface Kpi {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: 'success' | 'warning';
}

export default function Dashboard() {
  const { user } = useAuth();
  const { features } = useFeatures();
  const projectsEnabled = features?.projects !== false;
  const printsEnabled = features?.prints !== false;
  const [editing, setEditing] = useState<Print | null>(null);
  const modelsQuery = useQuery({ queryKey: ['models'], queryFn: api.models.list, enabled: projectsEnabled });
  const printsQuery = useQuery({ queryKey: ['prints', ''], queryFn: () => api.prints.list(), enabled: printsEnabled });
  const models = modelsQuery.data ?? [];
  const prints = printsQuery.data ?? [];
  const loading = (projectsEnabled && modelsQuery.isLoading) || (printsEnabled && printsQuery.isLoading);
  const error = (projectsEnabled ? modelsQuery.error : null) ?? (printsEnabled ? printsQuery.error : null);

  const reload = () => {
    if (projectsEnabled) void modelsQuery.refetch();
    if (printsEnabled) void printsQuery.refetch();
  };

  const count = (status: string) => prints.filter((print) => print.status === status).length;
  const withIssue = prints.filter((print) => print.hasIssue).length;
  const finished = count('CONCLUIDA');
  const active = count('EM_ANDAMENTO') + count('PENDENTE');
  const totalMinutes = prints.reduce((sum, print) => sum + Number(print.actualTimeMinutes ?? print.estimatedTime ?? 0), 0);
  const totalFilament = prints.reduce((sum, print) => sum + Number(print.filamentUsedGrams || 0), 0);
  const success = prints.length ? Math.round((finished / prints.length) * 100) : 0;
  const kpis: Kpi[] = [
    ...(projectsEnabled ? [{ label: 'Projetos', value: models.length, icon: Box }] : []),
    ...(printsEnabled ? [
      { label: 'Impressões', value: prints.length, icon: Printer },
      { label: 'Pendentes', value: count('PENDENTE'), icon: Clock3 },
      { label: 'Andamento', value: count('EM_ANDAMENTO'), icon: Loader },
      { label: 'Concluídas', value: finished, icon: CheckCircle2, tone: 'success' as const },
      { label: 'Com defeito', value: withIssue, icon: AlertTriangle, tone: 'warning' as const },
    ] : []),
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Oficina em tempo real</p>
          <h1 className="page-title">Olá, {user?.name}.</h1>
          <p className="muted mt-2">Acompanhe o que a oficina está imprimindo.</p>
        </div>
        {printsEnabled && (
          <Link to="/prints" className="btn-primary">
            <Plus size={16} /> Nova impressão
          </Link>
        )}
      </div>

      {error && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="form-error">Não foi possível atualizar o painel. Verifique se a API está em execução.</p>
          <button className="btn-ghost" onClick={() => void reload()}>Tentar novamente</button>
        </div>
      )}

      {loading ? (
        <div className="kpi-grid">
          {kpis.map((kpi) => <div key={kpi.label} className="skeleton" />)}
        </div>
      ) : (
        <div className="kpi-grid">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card lift flex items-center gap-3 !p-4">
                <span className={`kpi-icon ${kpi.tone ? `kpi-icon--${kpi.tone}` : ''}`}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="stat-value !text-2xl"><CountUp value={kpi.value} /></p>
                  <p className="muted truncate text-xs">{kpi.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {printsEnabled ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
          <HoursChart prints={prints} />
          <div className="card flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold">Resumo da produção</p>
              <p className="muted mt-1 text-xs">Indicadores de eficiência e execução</p>
            </div>
            <div>
              <div className="flex items-end justify-between">
                <p className="muted text-xs uppercase tracking-[0.12em]">Taxa de conclusão</p>
                <p className="stat-value text-3xl">{success}%</p>
              </div>
              <div className="completion-bar mt-3" role="progressbar" aria-label="Taxa de conclusão" aria-valuenow={success} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${success}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="inset-panel">
                <p className="muted text-[11px] uppercase tracking-[0.12em]">Tempo</p>
                <p className="mt-2 text-lg font-semibold">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</p>
              </div>
              <div className="inset-panel">
                <p className="muted text-[11px] uppercase tracking-[0.12em]">Filamento</p>
                <p className="mt-2 text-lg font-semibold">{totalFilament} g</p>
              </div>
            </div>
            <p className="muted mt-auto text-sm">{active} tarefas ativas e {withIssue} ocorrências de defeito registradas.</p>
          </div>
        </div>
      ) : (
        <p className="card muted mt-6">A área de impressões está temporariamente em manutenção.</p>
      )}

      {printsEnabled && <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Impressões recentes</h2>
        <Link to="/prints" className="text-link text-sm">Ver todas</Link>
      </div>}
      {printsEnabled && <div className="space-y-3">
        {prints.slice(0, 4).map((print) => (
          <PrintItem key={print.id} print={print} onEdit={setEditing} onChanged={reload} />
        ))}
        {!loading && !prints.length && (
          <div className="card empty-state">
            <span className="kpi-icon"><Printer size={20} /></span>
            <p className="font-semibold">Nenhuma impressão ainda</p>
            <p className="muted text-sm">Cadastre um projeto e registre a primeira peça para ver os indicadores aqui.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link to="/models" className="btn-primary">Cadastrar projeto</Link>
              <Link to="/prints" className="btn-ghost">Ir para impressões</Link>
            </div>
          </div>
        )}
      </div>}

      {editing && (
        <PrintForm
          models={models}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            await api.prints.update(editing.id, data);
            reload();
          }}
        />
      )}
    </div>
  );
}
