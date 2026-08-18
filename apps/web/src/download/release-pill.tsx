import { Link } from '@tanstack/react-router';

import { formatReleaseDate } from '../lib/changelog';

function releaseStamp(): string | undefined {
  const version = import.meta.env.VITE_RELEASE_VERSION;

  if (version === undefined || version === '') return undefined;

  const date = import.meta.env.VITE_RELEASE_DATE;

  return date === undefined || date === ''
    ? `v${version}`
    : `v${version} — ${formatReleaseDate(date)}`;
}

export function ReleasePill() {
  const stamp = releaseStamp();

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-stage-ring bg-stage-card px-4 py-1.75 text-control">
      <span className="size-1.75 rounded-full bg-traffic-go" />
      {stamp !== undefined && (
        <>
          <span className="font-medium text-fd-foreground">{stamp}</span>
          <span className="text-stage-faint">·</span>
        </>
      )}
      <Link to="/changelog" className="text-fd-foreground underline-offset-4 hover:underline">
        changelog →
      </Link>
    </div>
  );
}
