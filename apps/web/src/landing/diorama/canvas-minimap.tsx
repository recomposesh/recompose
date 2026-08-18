const MINIMAP_NODES = [
  { x: 10, y: 26, tone: 'fill-gateway' },
  { x: 50, y: 8, tone: 'fill-virtual-model' },
  { x: 50, y: 46, tone: 'fill-virtual-model' },
  { x: 88, y: 8, tone: 'fill-subscription' },
  { x: 88, y: 46, tone: 'fill-router' },
  { x: 124, y: 20, tone: 'fill-subscription' },
  { x: 124, y: 52, tone: 'fill-subscription' },
];

export function CanvasMinimap() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 172 112"
      className="absolute inset-e-4 bottom-4 h-28 w-43 border border-win-line bg-win-raised/95 shadow-lg"
      style={{ borderRadius: 9 }}
    >
      {MINIMAP_NODES.map((node) => (
        <rect
          key={`${node.x}-${node.y}`}
          x={node.x}
          y={node.y}
          width={28}
          height={14}
          rx={5}
          className={node.tone}
          opacity={0.85}
        />
      ))}
    </svg>
  );
}
