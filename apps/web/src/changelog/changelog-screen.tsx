import type { ChangelogEntry } from '../lib/changelog';

import { SiteNav } from '../components/site-nav';
import { SiteFooter } from '../landing/site-footer';
import { changelogEntries, latestChangelogEntry } from '../lib/changelog-entries';
import { ReleaseArticle } from './release-article';
import { VersionChips } from './version-chips';
import { VersionRail } from './version-rail';

export function ChangelogScreen({ entry }: { entry: ChangelogEntry }) {
  const latest = latestChangelogEntry.version === entry.version;

  return (
    <>
      <main className="relative bg-fd-background">
        <SiteNav />

        <div className="mx-auto max-w-360 px-5 pt-10 pb-8 md:px-10 lg:px-16 lg:pt-14 lg:pb-10">
          <h1 className="text-4xl leading-display font-medium text-fd-foreground lg:text-5xl">
            changelog
          </h1>
          <p className="mt-3.5 max-w-2xl text-base text-stage-dim md:text-reading">
            keep up with the latest recompose releases.
          </p>
        </div>

        <div className="mx-auto max-w-360 px-5 md:px-10 lg:px-16">
          <div className="h-px bg-stage-line" />
        </div>

        <div className="mx-auto flex max-w-360 flex-col gap-8 px-5 pt-8 pb-16 md:px-10 lg:flex-row lg:gap-18 lg:px-16 lg:pt-12 lg:pb-24">
          <VersionChips entries={changelogEntries} current={entry.version} />
          <div className="hidden shrink-0 lg:block">
            <VersionRail entries={changelogEntries} current={entry.version} />
          </div>
          <ReleaseArticle entry={entry} latest={latest} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
