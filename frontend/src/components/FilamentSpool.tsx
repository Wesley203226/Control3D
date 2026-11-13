import type { CSSProperties } from 'react';

const namedColors: Record<string, string> = {
  preto: '#292b32',
  black: '#292b32',
  branco: '#f5f3ed',
  white: '#f5f3ed',
  vermelho: '#d94a56',
  red: '#d94a56',
  azul: '#3e79c8',
  blue: '#3e79c8',
  'azul marinho': '#263b69',
  verde: '#4d9874',
  green: '#4d9874',
  amarelo: '#e5b34a',
  yellow: '#e5b34a',
  laranja: '#e68148',
  orange: '#e68148',
  roxo: '#8b64c9',
  purple: '#8b64c9',
  rosa: '#db72a5',
  pink: '#db72a5',
  cinza: '#888b97',
  gray: '#888b97',
  grey: '#888b97',
  transparente: '#c9d4df',
  transparent: '#c9d4df',
};

export function resolveFilamentColor(value: string) {
  const color = value.trim().toLocaleLowerCase('pt-BR');
  if (namedColors[color]) return namedColors[color];
  if (/^#[\da-f]{3}([\da-f]{3})?$/i.test(color)) return color;
  return '#8b73c8';
}

export default function FilamentSpool({ color, material, remaining = 100 }: { color: string; material: string; remaining?: number }) {
  return (
    <span className="filament-spool" style={{
      '--spool-color': resolveFilamentColor(color),
      '--spool-fill': `${Math.max(0, Math.min(100, remaining))}%`,
    } as CSSProperties} aria-hidden="true">
      <span className="filament-spool__winding" />
      <span className="filament-spool__flange filament-spool__flange--back" />
      <span className="filament-spool__flange filament-spool__flange--front" />
      <span className="filament-spool__core" />
      <span className="filament-spool__label">{material}</span>
    </span>
  );
}
