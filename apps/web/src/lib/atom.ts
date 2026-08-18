import type { ChangelogEntry } from './changelog';

import { siteUrl } from './links';

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function feedEntry(entry: ChangelogEntry): string {
  const address = `${siteUrl}/changelog/${entry.version}`;

  return [
    '  <entry>',
    `    <id>${address}</id>`,
    `    <title>recompose ${entry.version}</title>`,
    `    <link href="${address}"/>`,
    `    <updated>${entry.date}T00:00:00Z</updated>`,
    `    <summary>${escapeXml(entry.intro)}</summary>`,
    '  </entry>',
  ].join('\n');
}

export function changelogAtomFeed(entries: ChangelogEntry[]): string {
  const updated = entries[0]?.date ?? '1970-01-01';

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    '  <title>recompose changelog</title>',
    `  <id>${siteUrl}/changelog</id>`,
    `  <link href="${siteUrl}/changelog"/>`,
    `  <link rel="self" href="${siteUrl}/changelog.xml"/>`,
    `  <updated>${updated}T00:00:00Z</updated>`,
    '  <author>',
    '    <name>recompose</name>',
    '  </author>',
    ...entries.map(feedEntry),
    '</feed>',
    '',
  ].join('\n');
}
