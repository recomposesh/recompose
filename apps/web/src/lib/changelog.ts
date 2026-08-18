type SectionTitle = 'Features' | 'Fixes' | 'Breaking changes';

interface ChangelogItem {
  text: string;
  prNumbers: number[];
}

export interface ChangelogSection {
  title: SectionTitle;
  items: ChangelogItem[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  hasAssets: boolean;
  intro: string;
  sections: ChangelogSection[];
}

const sectionTitles: readonly SectionTitle[] = ['Features', 'Fixes', 'Breaking changes'];

function fieldsOf(block: string): Map<string, string> {
  const fields = new Map<string, string>();

  for (const line of block.split('\n')) {
    const colon = line.indexOf(':');

    if (colon > 0) fields.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
  }

  return fields;
}

function frontmatterOf(raw: string): { fields: Map<string, string>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);

  if (match === null) throw new Error('changelog entry has no frontmatter block');

  return { fields: fieldsOf(match[1] ?? ''), body: raw.slice(match[0].length) };
}

function requiredField(fields: Map<string, string>, key: string): string {
  const value = fields.get(key);

  if (value === undefined || value === '') {
    throw new Error(`changelog entry is missing "${key}" in its frontmatter`);
  }

  return value;
}

function sectionOf(line: string): ChangelogSection {
  const heading = line.slice(3).trim();
  const title = sectionTitles.find((known) => known === heading);

  if (title === undefined) throw new Error(`unknown changelog section "${heading}"`);

  return { title, items: [] };
}

function itemOf(line: string): ChangelogItem {
  const text = line.slice(2).trim();
  const refs = /\s*\((#\d+(?:,\s*#\d+)*)\)$/.exec(text);
  const list = refs?.[1];

  if (refs === null || list === undefined) return { text, prNumbers: [] };

  return {
    text: text.slice(0, text.length - refs[0].length),
    prNumbers: list.split(',').map((ref) => Number(ref.trim().slice(1))),
  };
}

function itemInto(sections: ChangelogSection[], line: string): void {
  const current = sections.at(-1);

  if (current === undefined) throw new Error('changelog entry lists an item before any section');

  current.items.push(itemOf(line));
}

function bodyOf(body: string): { intro: string; sections: ChangelogSection[] } {
  const introLines: string[] = [];
  const sections: ChangelogSection[] = [];
  const lines = body.split('\n').filter((line) => line.trim() !== '');

  for (const line of lines) {
    if (line.startsWith('## ')) {
      sections.push(sectionOf(line));
    } else if (line.startsWith('- ')) {
      itemInto(sections, line);
    } else if (sections.length === 0) {
      introLines.push(line.trim());
    }
  }

  return { intro: introLines.join(' '), sections };
}

export function parseChangelogEntry(raw: string): ChangelogEntry {
  const { fields, body } = frontmatterOf(raw);

  return {
    version: requiredField(fields, 'version'),
    date: requiredField(fields, 'date'),
    hasAssets: fields.get('assets') !== 'none',
    ...bodyOf(body),
  };
}

const shortMonths = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

const fullMonths = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

function datePartsOf(date: string): { year: string; monthIndex: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const [, year, month, day] = match ?? [];

  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`changelog date "${date}" is not a yyyy-mm-dd date`);
  }

  return { year, monthIndex: Number(month) - 1, day: Number(day) };
}

function monthNameOf(
  names: readonly string[],
  date: string,
): { name: string; parts: ReturnType<typeof datePartsOf> } {
  const parts = datePartsOf(date);
  const name = names[parts.monthIndex];

  if (name === undefined) throw new Error(`changelog date "${date}" names no real month`);

  return { name, parts };
}

export function formatEntryDate(date: string): string {
  const { name, parts } = monthNameOf(shortMonths, date);

  return `${name} ${parts.day}, ${parts.year}`;
}

export function formatEntryMonth(date: string): string {
  const { name, parts } = monthNameOf(fullMonths, date);

  return `${name} ${parts.year}`;
}

export function byNewestVersion(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);

  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (right[index] ?? 0) - (left[index] ?? 0);

    if (difference !== 0) return difference;
  }

  return 0;
}
