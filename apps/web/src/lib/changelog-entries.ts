import type { ChangelogEntry } from './changelog';

import { byNewestVersion, parseChangelogEntry } from './changelog';

const files = import.meta.glob('../../content/changelog/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

function entryOf(path: string, raw: unknown): ChangelogEntry {
  if (typeof raw !== 'string') {
    throw new Error(`changelog entry ${path} did not load as text`);
  }

  return parseChangelogEntry(raw);
}

export const changelogEntries: ChangelogEntry[] = Object.entries(files)
  .map(([path, raw]) => entryOf(path, raw))
  .sort((a, b) => byNewestVersion(a.version, b.version));

const newest = changelogEntries[0];

if (newest === undefined) {
  throw new Error('no changelog entries exist under apps/web/content/changelog');
}

export const latestChangelogEntry: ChangelogEntry = newest;
