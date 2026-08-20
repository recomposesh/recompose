const markGradients = [
  { id: 'recompose-mark-outer-band', from: '#CFD2DF', to: '#898783', x: 512, y1: 0, y2: 1024 },
  { id: 'recompose-mark-dark-band', from: '#111C5F', to: '#06091E', x: 512, y1: 0, y2: 1024 },
  { id: 'recompose-mark-tile', from: '#2640D9', to: '#142273', x: 512, y1: 0, y2: 1024 },
  { id: 'recompose-mark-note', from: '#C9C8CF', to: '#D1D4E7', x: 514, y1: 184, y2: 840 },
];

export function RecomposeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" aria-hidden="true" className={className}>
      <rect width="1024" height="1024" rx="229" fill="url(#recompose-mark-outer-band)" />
      <rect x="48" y="48" width="928" height="928" rx="181" fill="url(#recompose-mark-dark-band)" />
      <rect x="96" y="96" width="832" height="832" rx="133" fill="url(#recompose-mark-tile)" />
      <path
        fillRule="evenodd"
        d="M387.37 622.61C419.66 618.58 451.2 625.82 475.07 643.96V258.48C475.07 248.67 481.7 240.1 491.17 237.54V237.51L700.62 181.35C714.57 177.61 727.9 188.45 727.9 202.29V302.3C727.9 312.11 721.25 320.68 711.8 323.24V323.27L511.24 377.07V716.08C511.24 810.41 380.25 872.16 303.97 814C228.04 756.1 279.66 636.05 387.37 622.61Z"
        fill="url(#recompose-mark-note)"
      />
      <defs>
        {markGradients.map((gradient) => (
          <linearGradient
            key={gradient.id}
            id={gradient.id}
            x1={gradient.x}
            y1={gradient.y1}
            x2={gradient.x}
            y2={gradient.y2}
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor={gradient.from} />
            <stop offset="1" stopColor={gradient.to} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}
