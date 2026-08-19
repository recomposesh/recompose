import { Scale } from 'lucide-react';

export function ConditionalDiagram() {
  return (
    <svg aria-hidden="true" viewBox="0 0 596 120" className="size-full">
      <rect x={183} y={55} width={230} height={10} rx={3} className="fill-live" />
      <path
        d="M273 60 C288 60, 288 29, 303 29"
        strokeWidth={2}
        className="stroke-wire"
        fill="none"
      />
      <rect x={303} y={24} width={110} height={10} rx={3} className="fill-stage-line" />
      <path
        d="M273 60 C288 60, 288 91, 303 91"
        strokeWidth={2}
        className="stroke-wire"
        fill="none"
      />
      {[303, 327, 351, 375, 399].map((x) => (
        <rect key={x} x={x} y={86} width={14} height={10} rx={3} className="fill-stage-line" />
      ))}
      <circle cx={228} cy={21} r={11} className="stroke-router" strokeWidth={2} fill="none" />
      <foreignObject x={222} y={15} width={12} height={12}>
        <Scale className="size-3 text-router" />
      </foreignObject>
      {[36, 42, 48].map((y) => (
        <rect key={y} x={227} y={y} width={2} height={3} className="fill-router/40" />
      ))}
    </svg>
  );
}
