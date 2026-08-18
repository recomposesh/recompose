import type { ChangelogEntry } from '../lib/changelog';

import { SiteNav } from '../components/site-nav';
import { SiteFooter } from '../landing/site-footer';
import { changelogEntries } from '../lib/changelog-entries';
import { ReleaseArticle } from './release-article';
import { VersionRail } from './version-rail';

export function ChangelogScreen({ entry }: { entry: ChangelogEntry }) {
  const latest = changelogEntries[0]?.version === entry.version;

  return (
    <>
      <main className="relative bg-fd-background">
        <SiteNav />

        <div className="mx-auto max-w-360 px-16 pt-14 pb-10">
          <h1 className="text-5xl leading-display font-medium text-fd-foreground">changelog</h1>
          <p className="mt-3.5 max-w-2xl text-reading text-stage-dim">
            keep up with the latest recompose releases.
          </p>
        </div>

        <div className="mx-auto max-w-360 px-16">
          <div className="h-px bg-stage-line" />
        </div>

        <div className="mx-auto flex max-w-360 gap-18 px-16 pt-12 pb-24">
          <VersionRail entries={changelogEntries} current={entry.version} />
          <ReleaseArticle entry={entry} latest={latest} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
