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

  return (
    <div className="card">
      <p className="text-sm font-semibold">Horas estimadas</p>
      <p className="muted mb-4 text-xs">Últimos 6 meses, a partir do tempo previsto de cada impressão</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="hoursStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ff7a45" />
                <stop offset="100%" stopColor="#ff4d8d" />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#8d86a8', fontSize: 12 }} />
            <YAxis hide />
            <Tooltip
              formatter={(value) => [`${value} h`, 'Horas']}
              contentStyle={{
                background: 'rgba(16, 12, 36, 0.92)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 12,
                color: '#f4f1ff',
              }}
            />
            <Line type="monotone" dataKey="horas" stroke="url(#hoursStroke)" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
