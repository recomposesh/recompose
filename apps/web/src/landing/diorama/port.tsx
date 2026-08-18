export function Port({ tone, side }: { tone: string; side: 'left' | 'right' }) {
  return (
    <span
      className={`absolute top-1/2 size-2.25 -translate-y-1/2 rounded-full ${tone} ${
        side === 'left' ? '-left-1.25' : '-right-1.25'
      }`}
    />
  );
}
