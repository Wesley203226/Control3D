import { useId } from 'react';

export default function Logo({ size = 36 }: { size?: number }) {
  const gradientId = `logo-accent-${useId().replace(/[^\w-]/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Control 3D">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--accent-solid)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--color-accent-to)' }} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradientId})`} />
      <path d="M32 12 50 22v20L32 52 14 42V22z" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M32 12v40M14 22l18 10 18-10" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}
