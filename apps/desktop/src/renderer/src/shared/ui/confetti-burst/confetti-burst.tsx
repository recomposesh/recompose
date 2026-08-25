/**
 * The tints the drawn frame gives the confetti, which are the node kinds the canvas already draws.
 *
 * @summary The local runtime's coral sits this one out, the way the frame draws it: seven tints
 * over eighty pieces reads as a palette, and six reads as the app.
 */
const TINTS = [
  'var(--color-running)',
  'var(--color-api-key)',
  'var(--color-subscription)',
  'var(--color-virtual-model)',
  'var(--color-aggregator)',
  'var(--color-gateway)',
];

const PIECES = [
  { at: 0, drift: '-64px', delay: '0ms' },
  { at: 1, drift: '-40px', delay: '60ms' },
  { at: 2, drift: '-18px', delay: '20ms' },
  { at: 3, drift: '4px', delay: '90ms' },
  { at: 4, drift: '26px', delay: '40ms' },
  { at: 5, drift: '48px', delay: '110ms' },
  { at: 6, drift: '68px', delay: '10ms' },
  { at: 7, drift: '-52px', delay: '130ms' },
  { at: 8, drift: '14px', delay: '70ms' },
  { at: 9, drift: '-28px', delay: '150ms' },
  { at: 10, drift: '38px', delay: '30ms' },
  { at: 11, drift: '58px', delay: '170ms' },
];

/** How many pieces fall across the window, which is the count the drawn frame carries. */
const FLECKS = 80;

/** A step coprime with the count, so the columns walk the whole width before one repeats. */
const COLUMN_STEP = 37;

/**
 * One falling piece, placed and tilted from its own index.
 *
 * @summary The spread is arithmetic rather than random, so a story measures the same fall every
 * run and the frame it came from stays checkable against it. The drawn frame gives the heights,
 * the tilt and the six tints; only the falling is this side's, because a still frame cannot draw
 * it.
 */
function fleckAt(index: number) {
  return {
    at: index,
    tint: TINTS[index % TINTS.length],
    left: `${String(((index * COLUMN_STEP) % 97) + (index % 3))}%`,
    height: `${String(12 + ((index * 2) % 9))}px`,
    tilt: `${String((index * 47) % 360)}deg`,
    drift: `${String(((index % 9) - 4) * 26)}px`,
    span: `${String(2400 + ((index * 137) % 1800))}ms`,
    delay: `${String((index * 53) % 900)}ms`,
  };
}

type ConfettiBurstProps = {
  /**
   * How far the burst reaches.
   *
   * @summary A panel puffs from its own middle, because the thing it marks is the panel. A window
   * rains the whole way down, because the thing it marks is everything on the screen behind it.
   */
  spread?: 'panel' | 'window';
};

function windowfall() {
  return (
    <span aria-hidden className="confetti-window" data-confetti="window">
      {Array.from({ length: FLECKS }, (_unused, index) => fleckAt(index)).map((fleck) => (
        <i
          className="confetti-fleck"
          key={fleck.at}
          style={{
            '--confetti-tint': fleck.tint,
            '--confetti-drift': fleck.drift,
            '--confetti-span': fleck.span,
            '--confetti-tilt': fleck.tilt,
            blockSize: fleck.height,
            insetInlineStart: fleck.left,
            animationDelay: fleck.delay,
          }}
        />
      ))}
    </span>
  );
}

/**
 * The burst that marks a thing finished.
 *
 * @summary Every piece takes the tint of a node kind the canvas already draws, so the burst reads
 * as the app's own pieces rather than as party decoration. It lays itself over its container and
 * takes no pointer, because a celebration that swallows a press is a celebration in the way. Under
 * a reduced-motion setting the pieces never animate, so nothing flies at somebody who asked for
 * stillness.
 */
export function ConfettiBurst({ spread = 'panel' }: ConfettiBurstProps) {
  if (spread === 'window') {
    return windowfall();
  }

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0" data-confetti="panel">
      {PIECES.map((piece) => (
        <i
          className="confetti-piece"
          key={piece.at}
          style={{
            '--confetti-tint': TINTS[piece.at % TINTS.length],
            '--confetti-drift': piece.drift,
            animationDelay: piece.delay,
          }}
        />
      ))}
    </span>
  );
}
