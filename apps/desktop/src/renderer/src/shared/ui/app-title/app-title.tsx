import { useId } from 'react';

const NOTE =
  'M96.8426 155.653C104.914 154.644 112.801 156.456 118.768 160.991V64.6194C118.768 62.1678 120.424 60.0254 122.793 59.385V59.3777L175.155 45.338C178.643 44.403 181.976 47.1123 181.976 50.5725V75.5751C181.976 78.0267 180.313 80.1691 177.951 80.8095V80.8169L127.811 94.2675V179.021C127.811 202.603 95.0629 218.041 75.9927 203.5C57.0109 189.026 69.9152 159.012 96.8426 155.653Z';

/**
 * The app's own name and mark, standing where the platform's title bar would have drawn them.
 *
 * @summary Reach for it only on a platform whose title bar the window hides without drawing the
 * window controls over this corner. Where the controls float here there is nothing to fill, and
 * where the platform keeps its title bar the name is already on it. React ids carry characters a
 * URL fragment cannot, so the gradient references are built from a stripped id rather than the raw
 * one, and two titles on one surface keep their own gradients rather than sharing the first.
 */
export function AppTitle() {
  const drawn = useId().replaceAll(/[^a-zA-Z0-9]/g, '');
  const tile = `${drawn}-tile`;
  const note = `${drawn}-note`;

  return (
    <span className="flex items-center gap-1.5 ps-1 text-detail text-ink-secondary">
      <svg aria-hidden className="size-4 shrink-0" fill="none" viewBox="0 0 256 256">
        <rect fill={`url(#${tile})`} height="256" rx="56" width="256" />
        <path clipRule="evenodd" d={NOTE} fill={`url(#${note})`} fillRule="evenodd" />
        <defs>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id={tile}
            x1="128"
            x2="128"
            y1="0"
            y2="256"
          >
            <stop stopColor="#2640D9" />
            <stop offset="1" stopColor="#142273" />
          </linearGradient>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id={note}
            x1="128.5"
            x2="128.5"
            y1="46"
            y2="210"
          >
            <stop stopColor="#F2EBD1" />
            <stop offset="1" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>
      </svg>
      recompose
    </span>
  );
}
