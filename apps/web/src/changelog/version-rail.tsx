import { Link } from '@tanstack/react-router';

import type { ChangelogEntry } from '../lib/changelog';

import { formatEntryMonth } from '../lib/changelog';

interface MonthGroup {
  month: string;
  versions: string[];
}

function monthGroups(entries: ChangelogEntry[]): MonthGroup[] {
  const groups: MonthGroup[] = [];

  for (const entry of entries) {
    const month = formatEntryMonth(entry.date);
    const last = groups.at(-1);

    if (last?.month === month) last.versions.push(entry.version);
    else groups.push({ month, versions: [entry.version] });
  }

  return groups;
}

const chip = 'rounded-md px-2.5 py-1.5 font-mono text-control';

export function VersionRail({ entries, current }: { entries: ChangelogEntry[]; current: string }) {
  return (
    <aside className="flex w-44 shrink-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-caps text-stage-hush">channel</p>
        <p className="rounded-md bg-stage-chip px-2.5 py-1.5 text-control font-medium text-fd-foreground">
          stable
        </p>
      </div>

      <p className="text-xs font-medium tracking-caps text-stage-hush">versions</p>

      {monthGroups(entries).map((group) => (
        <div key={group.month} className="-mt-3 flex flex-col gap-1">
          <p className="px-2.5 font-mono text-annotation tracking-mono-label text-stage-hush">
            {group.month}
          </p>
          {group.versions.map((version) => (
            <Link
              key={version}
              to="/changelog/$version"
              params={{ version }}
              className={
                version === current
                  ? `${chip} bg-stage-chip text-fd-foreground`
                  : `${chip} text-stage-mist transition-colors hover:text-fd-foreground`
              }
            >
              {version}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}
