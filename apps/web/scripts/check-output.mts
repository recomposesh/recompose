import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { changelogVersionPaths, docsMarkdownPaths, docsPagePaths } from './published-paths.mts';

const webRoot = path.resolve(import.meta.dirname, '..');
const emittedDir = path.join(webRoot, '.output', 'public');

if (!existsSync(emittedDir)) {
  console.error(`output check: no emitted directory at ${emittedDir}; run the build first`);
  process.exit(1);
}

const failures: string[] = [];

const verbatimSuffixes = ['.html', '.md', '.xml'];

function emittedFile(sitePath: string): string {
  if (sitePath === '/') return path.join(emittedDir, 'index.html');
  if (sitePath === '/api/search') return path.join(emittedDir, 'api', 'search');

  if (verbatimSuffixes.some((suffix) => sitePath.endsWith(suffix))) {
    return path.join(emittedDir, sitePath.slice(1));
  }

  return path.join(emittedDir, sitePath.slice(1), 'index.html');
}

function contentOf(sitePath: string): string | undefined {
  const file = emittedFile(sitePath);

  if (!existsSync(file)) {
    failures.push(`${sitePath} has no emitted file at ${path.relative(webRoot, file)}`);

    return undefined;
  }

  return readFileSync(file, 'utf8');
}

function assertDocument(sitePath: string): void {
  const content = contentOf(sitePath);

  if (content !== undefined && !/^<!doctype html/i.test(content)) {
    failures.push(`${sitePath} emitted a file that is not an html document`);
  }
}

function parsedJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

const documentPaths = [
  '/',
  '/download',
  '/changelog',
  ...changelogVersionPaths(webRoot),
  ...docsPagePaths(webRoot),
  '/404.html',
];

for (const sitePath of documentPaths) {
  assertDocument(sitePath);
}

const markdownPaths = docsMarkdownPaths(webRoot);

for (const markdownPath of markdownPaths) {
  const content = contentOf(markdownPath);

  if (content !== undefined && !content.startsWith('# ')) {
    failures.push(`${markdownPath} emitted a file that does not open with its page title`);
  }
}

const searchIndex = contentOf('/api/search');

if (searchIndex !== undefined) {
  const index = parsedJson(searchIndex);
  const indexNamesADocsPage = searchIndex.includes('"/docs/');

  if (typeof index !== 'object' || index === null || !indexNamesADocsPage) {
    failures.push('/api/search emitted no queryable search index');
  }
}

const feed = contentOf('/changelog.xml');

if (feed !== undefined && !feed.includes('<feed')) {
  failures.push('/changelog.xml emitted a file that is not an atom feed');
}

if (existsSync(path.join(emittedDir, '_shell.html'))) {
  failures.push(
    '_shell.html survived into the emitted directory; the single-page fallback must stay off',
  );
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`output check: ${failure}`);
  }

  process.exit(1);
}

console.log(
  `output check: ${documentPaths.length} documents, ${markdownPaths.length} markdown pages, the search index, and the atom feed all emitted`,
);
