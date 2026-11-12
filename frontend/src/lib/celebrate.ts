export function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.documentElement.dataset.perf === '1') return;
  import('canvas-confetti').then(({ default: confetti }) => {
    confetti({
      particleCount: 90,
      spread: 72,
      origin: { y: 0.72 },
      colors: ['#ff7a45', '#ff4d8d', '#7c5cff', '#ffffff'],
    });
  });
}
