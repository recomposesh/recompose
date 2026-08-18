const cables = [
  { d: 'M0 210c320-120 760 90 1440-60', tone: 'stroke-cable-ink', width: 2 },
  { d: 'M0 260c420-100 900 80 1440-30', tone: 'stroke-cable-ink-dim', width: 2 },
  { d: 'M0 120c500-80 980 100 1440-60', tone: 'stroke-cable-gateway', width: 2.5 },
  { d: 'M0 320c380-60 1040-200 1440-20', tone: 'stroke-cable-virtual', width: 2 },
];

const ports = [
  { key: 'gateway-in', tone: 'bg-port-gateway', place: '-right-px top-36' },
  { key: 'virtual-in', tone: 'bg-port-virtual', place: '-right-px top-73.5' },
  { key: 'ink-out-high', tone: 'bg-port-ink', place: '-left-1 top-51' },
  { key: 'ink-out-low', tone: 'bg-port-ink', place: '-left-1 top-78.5' },
];

export function CablesBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-12 h-95">
      <svg className="size-full" viewBox="0 0 1440 380" preserveAspectRatio="none" fill="none">
        {cables.map((cable) => (
          <path
            key={cable.d}
            d={cable.d}
            className={cable.tone}
            strokeWidth={cable.width}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {ports.map((port) => (
        <span
          key={port.key}
          className={`absolute size-2.25 rounded-full ${port.tone} ${port.place}`}
        />
      ))}
    </div>
  );
}
