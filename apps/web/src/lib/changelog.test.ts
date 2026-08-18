import { describe, expect, it } from 'vitest';

import {
  byNewestVersion,
  formatEntryDate,
  formatEntryMonth,
  parseChangelogEntry,
} from './changelog';

const raw = `---
version: 0.3.0
date: 2026-08-02
---

the gateway era begins.

## Features

- the first gateway arrives, with the engine that serves it. (#105)
- subscriptions join as managed accounts. (#116, #124)

## Fixes

- settings written by a newer build survive a downgrade. (#98)
`;

describe('a curated changelog entry parses into its designed shape', () => {
  it('reads version and date from the frontmatter', () => {
    const entry = parseChangelogEntry(raw);

    expect(entry.version).toBe('0.3.0');
    expect(entry.date).toBe('2026-08-02');
  });

  it('keeps the opening prose apart from the sections', () => {
    expect(parseChangelogEntry(raw).intro).toBe('the gateway era begins.');
  });

  it('keeps the sections in written order with their items', () => {
    const titles = parseChangelogEntry(raw).sections.map((section) => section.title);

    expect(titles).toStrictEqual(['Features', 'Fixes']);
  });

  it('omits a section that was never written', () => {
    const titles = parseChangelogEntry(raw).sections.map((section) => section.title);

    expect(titles).not.toContain('Breaking changes');
  });

  it('lifts trailing pull-request refs off the item text', () => {
    const features = parseChangelogEntry(raw).sections[0];

    expect(features?.items[0]).toStrictEqual({
      text: 'the first gateway arrives, with the engine that serves it.',
      prNumbers: [105],
    });
    expect(features?.items[1]?.prNumbers).toStrictEqual([116, 124]);
  });

  it('offers download rows unless the entry opts out', () => {
    expect(parseChangelogEntry(raw).hasAssets).toBe(true);
    expect(parseChangelogEntry(raw.replace('---\n\n', 'assets: none\n---\n\n')).hasAssets).toBe(
      false,
    );
  });

  it('refuses a section the design does not know', () => {
    expect(() => parseChangelogEntry(raw.replace('## Fixes', '## Chores'))).toThrow(
      'unknown changelog section "Chores"',
    );
  });

  it('refuses an entry without a version or a date', () => {
    expect(() => parseChangelogEntry(raw.replace('version: 0.3.0\n', ''))).toThrow(
      'changelog entry is missing "version" in its frontmatter',
    );
    expect(() => parseChangelogEntry(raw.replace('date: 2026-08-02\n', ''))).toThrow(
      'changelog entry is missing "date" in its frontmatter',
    );
  });
});

describe('changelog dates render the way the design writes them', () => {
  it('shortens the entry date without a leading zero', () => {
    expect(formatEntryDate('2026-08-02')).toBe('aug 2, 2026');
    expect(formatEntryDate('2026-12-25')).toBe('dec 25, 2026');
  });

  it('spells the rail month out in full', () => {
    expect(formatEntryMonth('2026-08-02')).toBe('august 2026');
    expect(formatEntryMonth('2026-01-15')).toBe('january 2026');
  });
});

describe('versions order newest first, as numbers rather than text', () => {
  it('puts 0.10.0 above 0.9.1', () => {
    expect(['0.9.1', '0.10.0', '0.2.0'].sort(byNewestVersion)).toStrictEqual([
      '0.10.0',
      '0.9.1',
      '0.2.0',
    ]);
  });
});
