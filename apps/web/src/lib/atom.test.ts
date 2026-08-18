import { describe, expect, it } from 'vitest';

import type { ChangelogEntry } from './changelog';

import { changelogAtomFeed } from './atom';

const entries: ChangelogEntry[] = [
  {
    version: '0.3.0',
    date: '2026-08-02',
    hasAssets: true,
    intro: 'the gateway era begins & nothing <breaks>.',
    sections: [],
  },
  {
    version: '0.2.0',
    date: '2026-07-25',
    hasAssets: false,
    intro: 'the first build that leaves the workshop.',
    sections: [],
  },
];

describe('the changelog publishes itself as an Atom feed', () => {
  it('identifies the feed and stamps it with the newest entry date', () => {
    const feed = changelogAtomFeed(entries);

    expect(feed).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(feed).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(feed).toContain('<id>https://recompose.sh/changelog</id>');
    expect(feed).toContain('<updated>2026-08-02T00:00:00Z</updated>');
  });

  it('gives every version its own entry with a stable address', () => {
    const feed = changelogAtomFeed(entries);

    expect(feed).toContain('<id>https://recompose.sh/changelog/0.3.0</id>');
    expect(feed).toContain('<title>recompose 0.3.0</title>');
    expect(feed).toContain('<link href="https://recompose.sh/changelog/0.2.0"/>');
    expect(feed).toContain('<updated>2026-07-25T00:00:00Z</updated>');
  });

  it('escapes the prose so markup in an entry cannot break the feed', () => {
    expect(changelogAtomFeed(entries)).toContain(
      '<summary>the gateway era begins &amp; nothing &lt;breaks&gt;.</summary>',
    );
  });
});
