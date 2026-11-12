import { useEffect, useState } from 'react';
import { formatTime } from '../lib/utils';

interface Props {
  status: string;
  startedAt?: string | null;
  createdAt?: string;
  actualTimeMinutes?: number | null;
}

function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export default function ElapsedTimer({ status, startedAt, createdAt, actualTimeMinutes }: Props) {
  const [now, setNow] = useState(Date.now());
  const timerStart = startedAt ?? (status === 'EM_ANDAMENTO' ? createdAt : null);

  useEffect(() => {
    if (status !== 'EM_ANDAMENTO' || !timerStart) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [status, timerStart]);

  if (status === 'EM_ANDAMENTO' && timerStart) {
    const seconds = Math.max(0, Math.floor((now - new Date(timerStart).getTime()) / 1000));
    return <span className="elapsed-timer" aria-label={`Tempo decorrido ${formatClock(seconds)}`}>{formatClock(seconds)}</span>;
  }
  if (actualTimeMinutes != null) return <span>{formatTime(actualTimeMinutes)}</span>;
  return <span>—</span>;
}
