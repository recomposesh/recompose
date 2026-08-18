const TICK_COUNT = 48;
const TICK_PITCH = 17;
const STRIPS_X = 420;

function tickTone(strip: 'work' | 'personal', index: number) {
  if (strip === 'work') {
    if (index < 30) return 'fill-live';
    if (index < 32) return 'fill-down';

    return 'fill-stage-line';
  }

  return index < 32 ? 'fill-stage-line' : 'fill-live';
}

export function TickStrip({ strip, y }: { strip: 'work' | 'personal'; y: number }) {
  return (
    <g>
      {Array.from({ length: TICK_COUNT }, (_, i) => (
        <rect
          key={`${strip}-${i}`}
          x={STRIPS_X + i * TICK_PITCH}
          y={y}
          width={12}
          height={18}
          rx={2}
          className={tickTone(strip, i)}
        />
      ))}
    </g>
  );
}
