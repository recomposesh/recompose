export function CanvasWire({ id, d }: { id: string; d: string }) {
  return (
    <g>
      <path d={d} fill="none" strokeWidth={2.6} className="stroke-cable" />
      <path
        d={d}
        data-wire-live={id}
        fill="none"
        strokeWidth={2.6}
        className="stroke-live opacity-0"
      />
      <path
        d={d}
        data-wire-pulse={id}
        pathLength={1}
        className="cable-pulse stroke-live opacity-0"
      />
    </g>
  );
}
