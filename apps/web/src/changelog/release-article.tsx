import type { ChangelogEntry } from '../lib/changelog';

import { formatEntryDate } from '../lib/changelog';
import { ReleaseDownloads } from './release-downloads';
import { ReleaseSection } from './release-section';

export function ReleaseArticle({ entry, latest }: { entry: ChangelogEntry; latest: boolean }) {
  return (
    <article className="flex min-w-0 flex-1 flex-col gap-9">
      <header className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3.5">
          <h2 className="text-headline leading-tight font-medium text-fd-foreground">
            {entry.version}
          </h2>
          {latest && (
            <span className="rounded-full border border-stage-ring px-2.5 py-1 font-mono text-annotation text-stage-dim">
              latest
            </span>
          )}
        </div>
        <p className="text-sm text-stage-mist">{formatEntryDate(entry.date)}</p>
      </header>

      {entry.hasAssets && <ReleaseDownloads version={entry.version} />}

      <p className="text-base leading-prose text-stage-prose">{entry.intro}</p>

      {entry.sections.map((section, index) => (
        <ReleaseSection key={section.title} index={index + 1} section={section} />
      ))}
    </article>
  );
}
