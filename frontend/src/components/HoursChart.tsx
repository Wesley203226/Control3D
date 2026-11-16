import { ChartLine } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Print } from '../types';

function hoursByMonth(prints: Print[]) {
  const totals = new Map<string, number>();
  for (const print of prints) {
    const date = new Date(print.createdAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    totals.set(key, (totals.get(key) ?? 0) + print.estimatedTime / 60);
  }

  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const label = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return { label, horas: Math.round((totals.get(key) ?? 0) * 10) / 10 };
  });
}

export default function HoursChart({ prints }: { prints: Print[] }) {
  const data = hoursByMonth(prints);
  const empty = data.every((item) => item.horas === 0);

  return (
    <div className="card flex flex-col">
      <p className="text-sm font-semibold">Horas estimadas</p>
      <p className="muted mb-4 text-xs">Últimos 6 meses, a partir do tempo previsto de cada impressão</p>
      {empty ? (
        <div className="chart-empty">
          <ChartLine size={28} />
          <p className="text-sm font-medium">Nenhuma hora registrada ainda</p>
          <p className="muted text-xs">O gráfico aparece quando as primeiras impressões forem criadas.</p>
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="hoursStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" style={{ stopColor: 'var(--accent-solid)' }} />
                  <stop offset="100%" style={{ stopColor: 'var(--color-accent-to)' }} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis hide domain={[0, 'dataMax + 1']} />
              <Tooltip
                formatter={(value) => [`${value} h`, 'Horas']}
                contentStyle={{
                  background: 'var(--chart-tooltip-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 12,
                  color: 'var(--text)',
                  boxShadow: 'var(--shadow)',
                }}
                labelStyle={{ color: 'var(--text-muted)' }}
                cursor={{ stroke: 'var(--glass-border)' }}
              />
              <Line type="monotone" dataKey="horas" stroke="url(#hoursStroke)" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
