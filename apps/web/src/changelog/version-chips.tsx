import { Link } from '@tanstack/react-router';

import type { ChangelogEntry } from '../lib/changelog';

const chip = 'shrink-0 rounded-md px-2.5 py-1.5 font-mono text-control';

export function VersionChips({ entries, current }: { entries: ChangelogEntry[]; current: string }) {
  return (
    <div className="flex flex-col gap-2.5 lg:hidden">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium tracking-caps text-stage-hush">channel</p>
        <p className="rounded-md bg-stage-chip px-2.5 py-1 text-xs font-medium text-fd-foreground">
          stable
        </p>
      </div>

      <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 md:mx-0 md:px-0">
        {entries.map((entry) => (
          <Link
            key={entry.version}
            to="/changelog/$version"
            params={{ version: entry.version }}
            className={
              entry.version === current
                ? `${chip} bg-stage-chip text-fd-foreground`
                : `${chip} text-stage-mist transition-colors hover:text-fd-foreground`
            }
          >
            {entry.version}
          </Link>
        ))}
      </div>
    </div>
  );
}
