import { Link } from '@tanstack/react-router';

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function stampOf(match: RegExpExecArray): string | undefined {
  const [, year, month, day] = match;
  const name = months[Number(month) - 1];

  return name === undefined || year === undefined || day === undefined
    ? undefined
    : `${name} ${Number(day)}, ${year}`;
}

function pillDate(date: string | undefined): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? '');

  return match === null ? undefined : stampOf(match);
}

function releaseStamp(): string | undefined {
  const version = import.meta.env.VITE_RELEASE_VERSION;

  if (version === undefined || version === '') return undefined;

  const date = pillDate(import.meta.env.VITE_RELEASE_DATE);

  return date === undefined ? `v${version}` : `v${version} — ${date}`;
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
