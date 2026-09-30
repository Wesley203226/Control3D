export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Control 3D">
      <rect width="64" height="64" rx="14" fill="#4f46e5" />
      <path d="M32 10 52 21v22L32 54 12 43V21z" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <text x="32" y="38" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="15" textAnchor="middle" fill="#fff">
        3D
      </text>
    </svg>
  );
}
