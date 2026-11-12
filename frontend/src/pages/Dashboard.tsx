import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import CountUp from '../components/CountUp';
import HoursChart from '../components/HoursChart';
import PrintForm from '../components/PrintForm';
import PrintItem from '../components/PrintItem';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { Print } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const [editing, setEditing] = useState<Print | null>(null);
  const modelsQuery = useQuery({ queryKey: ['models'], queryFn: api.models.list });
  const printsQuery = useQuery({ queryKey: ['prints', ''], queryFn: () => api.prints.list() });
  const models = modelsQuery.data ?? [];
  const prints = printsQuery.data ?? [];
  const loading = modelsQuery.isLoading || printsQuery.isLoading;
  const error = modelsQuery.error ?? printsQuery.error;

  const reload = () => {
    modelsQuery.refetch();
    printsQuery.refetch();
  };

  const count = (status: string) => prints.filter((print) => print.status === status).length;
  const withIssue = prints.filter((print) => print.hasIssue).length;
  const finished = count('CONCLUIDA');
  const active = count('EM_ANDAMENTO') + count('PENDENTE');
  const totalMinutes = prints.reduce((sum, print) => sum + Number(print.actualTimeMinutes ?? print.estimatedTime ?? 0), 0);
  const totalFilament = prints.reduce((sum, print) => sum + Number(print.filamentUsedGrams || 0), 0);
  const success = prints.length ? Math.round((finished / prints.length) * 100) : 0;
  const stats = [
    { label: 'Modelos', value: models.length },
    { label: 'Impressões', value: prints.length },
    { label: 'Pendentes', value: count('PENDENTE') },
    { label: 'Em andamento', value: count('EM_ANDAMENTO') },
    { label: 'Concluídas', value: finished },
    { label: 'Com defeito', value: withIssue },
    { label: 'Descartadas', value: prints.filter((print) => print.discarded).length },
  ];

  return (
    <div>
      <h1 className="page-title">Olá, {user?.name}.</h1>
      <p className="muted mb-6">Acompanhe o que a oficina está imprimindo.</p>

      {error && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="form-error">Não foi possível atualizar o painel. Verifique se a API está em execução.</p>
          <button className="btn-ghost" onClick={() => void reload()}>Tentar novamente</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-7">
          {stats.map((stat) => <div key={stat.label} className="skeleton" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-7">
          {stats.map((stat) => (
            <div key={stat.label} className="card lift text-center">
              <p className="stat-value"><CountUp value={stat.value} /></p>
              <p className="muted mt-1 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(240px,0.8fr)]">
        <HoursChart prints={prints} />
        <div className="card flex flex-col justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Resumo da produção</p>
            <p className="muted mt-1 text-xs">Indicadores de eficiência e execução</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="muted text-xs uppercase tracking-[0.12em]">Taxa de conclusão</p>
              <p className="stat-value mt-2 text-4xl">{success}%</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="inset-panel">
                <p className="muted text-[11px] uppercase tracking-[0.12em]">Tempo real / estimado</p>
                <p className="mt-2 text-lg font-semibold">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</p>
              </div>
              <div className="inset-panel">
                <p className="muted text-[11px] uppercase tracking-[0.12em]">Filamento</p>
                <p className="mt-2 text-lg font-semibold">{totalFilament}g</p>
              </div>
            </div>
            <p className="muted text-sm">{active} tarefas ativas e {withIssue} ocorrências de defeito registradas.</p>
          </div>
        </div>
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Impressões recentes</h2>
        <Link to="/prints" className="text-link text-sm">Ver todas</Link>
      </div>
      <div className="space-y-3">
        {prints.slice(0, 5).map((print) => (
          <PrintItem key={print.id} print={print} onEdit={setEditing} onChanged={reload} />
        ))}
        {!loading && !prints.length && (
          <p className="card text-center">
            <span className="muted">Nenhuma impressão ainda. </span>
            <Link to="/models" className="text-link">Cadastre um modelo</Link>
            <span className="muted"> para começar.</span>
          </p>
        )}
      </div>

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
