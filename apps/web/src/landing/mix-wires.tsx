import { DIAGRAM_HEIGHT, DIAGRAM_WIDTH, HARNESSES, MODELS, STROKES, wirePath } from './mix-layout';

export function MixWires() {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${DIAGRAM_WIDTH} ${DIAGRAM_HEIGHT}`}
      preserveAspectRatio="none"
      className="absolute inset-0 size-full"
    >
      {HARNESSES.map((h) => (
        <path
          key={h.label}
          d={wirePath(h.x, 120, h.wireEnd, 250)}
          fill="none"
          strokeWidth={2}
          className={STROKES[h.tone]}
        />
      ))}
      {MODELS.map((m) => (
        <path
          key={m.label}
          d={wirePath(m.wireStart, 290, m.x, 452)}
          fill="none"
          strokeWidth={2}
          className={STROKES[m.tone]}
        />
      ))}
    </svg>
  );
}
