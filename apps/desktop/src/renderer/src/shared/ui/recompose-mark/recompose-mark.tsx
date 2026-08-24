import { useId } from 'react';

const NOTE =
  'M387.37 622.61C419.66 618.58 451.2 625.82 475.07 643.96V258.48C475.07 248.67 481.7 240.1 491.17 237.54V237.51L700.62 181.35C714.57 177.61 727.9 188.45 727.9 202.29V302.3C727.9 312.11 721.25 320.68 711.8 323.24V323.27L511.24 377.07V716.08C511.24 810.41 380.25 872.16 303.97 814C228.04 756.1 279.66 636.05 387.37 622.61Z';

type Band = { key: string; inset: number; size: number; radius: number };

const BANDS: readonly Band[] = [
  { key: 'outer', inset: 0, size: 1024, radius: 229 },
  { key: 'dark', inset: 48, size: 928, radius: 181 },
  { key: 'tile', inset: 96, size: 832, radius: 133 },
];

type Painted = { key: string; from: string; to: string; y1: number; y2: number };

const PAINTS: readonly Painted[] = [
  { key: 'outer', from: '#CFD2DF', to: '#898783', y1: 0, y2: 1024 },
  { key: 'dark', from: '#111C5F', to: '#06091E', y1: 0, y2: 1024 },
  { key: 'tile', from: '#2640D9', to: '#142273', y1: 0, y2: 1024 },
  { key: 'note', from: '#C9C8CF', to: '#D1D4E7', y1: 184, y2: 840 },
];

/**
 * The app's mark, drawn the one way the brand draws it.
 *
 * @summary The geometry and the four gradients are the master the app icon is cut from, so a mark
 * on a surface and the icon in a dock stay one drawing rather than two that drift. React ids carry
 * characters a URL fragment cannot, so the gradient references are built from a stripped id, and
 * two marks on one surface keep their own gradients rather than sharing the first's.
 */
export function RecomposeMark({ className }: { className?: string }) {
  const scope = useId().replaceAll(/[^a-zA-Z0-9]/g, '');
  const painted = (key: string): string => `url(#${scope}-${key})`;

  return (
    <svg aria-hidden className={className} fill="none" viewBox="0 0 1024 1024">
      {BANDS.map((band) => (
        <rect
          fill={painted(band.key)}
          height={band.size}
          key={band.key}
          rx={band.radius}
          width={band.size}
          x={band.inset}
          y={band.inset}
        />
      ))}
      <path clipRule="evenodd" d={NOTE} fill={painted('note')} fillRule="evenodd" />
      <defs>
        {PAINTS.map((paint) => (
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id={`${scope}-${paint.key}`}
            key={paint.key}
            x1="512"
            x2="512"
            y1={paint.y1}
            y2={paint.y2}
          >
            <stop stopColor={paint.from} />
            <stop offset="1" stopColor={paint.to} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}
