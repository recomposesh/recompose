const MINIMAP_NODES = [
  { x: 8, y: 23, tone: 'fill-gateway' },
  { x: 46, y: 19, tone: 'fill-virtual-model' },
  { x: 46, y: 63, tone: 'fill-virtual-model' },
  { x: 84, y: 19, tone: 'fill-router' },
  { x: 84, y: 63, tone: 'fill-router' },
  { x: 124, y: 2, tone: 'fill-subscription' },
  { x: 124, y: 19, tone: 'fill-api-key' },
  { x: 124, y: 37, tone: 'fill-subscription' },
  { x: 124, y: 54, tone: 'fill-subscription' },
  { x: 124, y: 71, tone: 'fill-subscription' },
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
