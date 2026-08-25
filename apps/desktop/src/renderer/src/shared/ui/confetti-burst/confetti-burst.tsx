const PIECES = [
  { at: 0, tint: 'var(--color-gateway)', drift: '-64px', delay: '0ms' },
  { at: 1, tint: 'var(--color-virtual-model)', drift: '-40px', delay: '60ms' },
  { at: 2, tint: 'var(--color-subscription)', drift: '-18px', delay: '20ms' },
  { at: 3, tint: 'var(--color-running)', drift: '4px', delay: '90ms' },
  { at: 4, tint: 'var(--color-api-key)', drift: '26px', delay: '40ms' },
  { at: 5, tint: 'var(--color-aggregator)', drift: '48px', delay: '110ms' },
  { at: 6, tint: 'var(--color-local)', drift: '68px', delay: '10ms' },
  { at: 7, tint: 'var(--color-gateway)', drift: '-52px', delay: '130ms' },
  { at: 8, tint: 'var(--color-virtual-model)', drift: '14px', delay: '70ms' },
  { at: 9, tint: 'var(--color-subscription)', drift: '-28px', delay: '150ms' },
  { at: 10, tint: 'var(--color-api-key)', drift: '38px', delay: '30ms' },
  { at: 11, tint: 'var(--color-aggregator)', drift: '58px', delay: '170ms' },
];

/**
 * The burst that marks a thing finished.
 *
 * @summary Every piece takes the tint of a node kind the canvas already draws, so the burst reads
 * as the app's own pieces rather than as party decoration. It lays itself over its container and
 * takes no pointer, because a celebration that swallows a press is a celebration in the way. Under
 * a reduced-motion setting the pieces never animate, so nothing flies at somebody who asked for
 * stillness.
 */
export function ConfettiBurst() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {PIECES.map((piece) => (
        <i
          className="confetti-piece"
          key={piece.at}
          style={{
            '--confetti-tint': piece.tint,
            '--confetti-drift': piece.drift,
            animationDelay: piece.delay,
          }}
        />
      ))}
    </span>
  );
}
