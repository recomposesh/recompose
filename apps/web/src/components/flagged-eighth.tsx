export function FlaggedEighth({ x, y }: { x: number; y: number }) {
  const stem = x + 4.9;

  return (
    <g>
      <ellipse cx={x} cy={y} rx={5.4} ry={4} transform={`rotate(-20 ${x} ${y})`} />
      <path d={`M${stem} ${y - 1.4}V${y - 27}`} fill="none" strokeWidth={1.4} />
      <path
        d={`M${stem} ${y - 27}c7 3 9 9 5.5 16`}
        fill="none"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </g>
  );
}
