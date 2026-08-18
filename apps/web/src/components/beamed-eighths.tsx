const HEAD_GAP = 34;

export function BeamedEighths({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  const stem1 = x + 4.9;
  const stem2 = x + HEAD_GAP + 4.9;

  return (
    <g>
      <ellipse cx={x} cy={y1} rx={5.4} ry={4} transform={`rotate(-20 ${x} ${y1})`} />
      <ellipse
        cx={x + HEAD_GAP}
        cy={y2}
        rx={5.4}
        ry={4}
        transform={`rotate(-20 ${x + HEAD_GAP} ${y2})`}
      />
      <path d={`M${stem1} ${y1 - 1.4}V${y1 - 27}`} fill="none" strokeWidth={1.4} />
      <path d={`M${stem2} ${y2 - 1.4}V${y2 - 27}`} fill="none" strokeWidth={1.4} />
      <path
        d={`M${stem1} ${y1 - 27}L${stem2} ${y2 - 27}L${stem2} ${y2 - 22.5}L${stem1} ${y1 - 22.5}Z`}
      />
    </g>
  );
}
