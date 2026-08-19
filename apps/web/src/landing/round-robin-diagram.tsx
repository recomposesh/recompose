export function RoundRobinDiagram() {
  return (
    <svg aria-hidden="true" viewBox="0 0 596 120" className="size-full">
      <circle cx={298} cy={60} r={38} className="stroke-wire" strokeWidth={2} fill="none" />
      <circle cx={298} cy={22} r={5} className="fill-gateway" />
      <circle cx={265} cy={81} r={5} className="fill-virtual-model" />
      <circle cx={331} cy={81} r={5} className="fill-subscription" />
      <path
        d="M322 42 L332 30 M332 30 l-6 0 M332 30 l1 7"
        strokeWidth={2}
        className="stroke-live"
        fill="none"
      />
    </svg>
  );
}
