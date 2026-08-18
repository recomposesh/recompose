export function QuarterNote({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={5.4} ry={4} transform={`rotate(-20 ${x} ${y})`} />
      <path d={`M${x + 4.9} ${y - 1.4}V${y - 27}`} fill="none" strokeWidth={1.4} />
    </g>
  );
}
