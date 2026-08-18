const arcs = [
  'M 6.491 2.465 A 7 7 0 0 0 2.086 10.095',
  'M 4.595 14.440 A 7 7 0 0 0 13.405 14.440',
  'M 15.914 10.095 A 7 7 0 0 0 11.509 2.465',
];

const friends = [
  { cx: 9, cy: 2 },
  { cx: 2.938, cy: 12.5 },
  { cx: 15.062, cy: 12.5 },
];

export function UbuntuMark({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className={className}>
      {arcs.map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={2.8} />
      ))}
      {friends.map(({ cx, cy }) => (
        <circle key={`${cx}`} cx={cx} cy={cy} r={1.85} fill="currentColor" />
      ))}
    </svg>
  );
}
