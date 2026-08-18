export function PhosphorMark({ d, className }: { d: string; className: string }) {
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" className={className}>
      <path fill="currentColor" d={d} />
    </svg>
  );
}
