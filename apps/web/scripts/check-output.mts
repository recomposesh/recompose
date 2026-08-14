import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const emitted = join(root, '.output', 'public');
const content = join(root, 'content', 'docs');
const searchIndex = join('api', 'search');

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)));
}

function documentFor(page: string): string {
  const slug = page.replace(/\.mdx?$/, '');

  return slug === 'index' ? join('docs', 'index.html') : join('docs', slug, 'index.html');
}

function missingDocuments(pages: string[], emittedFiles: Set<string>): string[] {
  const missing = pages
    .filter((page) => !emittedFiles.has(documentFor(page)))
    .map((page) => `${page} emitted no document at ${documentFor(page)}`);

  if (!emittedFiles.has('index.html')) {
    missing.push('the landing route emitted no document of its own');
  }

  return missing;
}

function survivingServerFunctions(emittedFiles: Set<string>): string[] {
  const leftovers = [...emittedFiles].filter(
    (file) => file.includes('_serverFn') || file.includes('.data/'),
  );

  return leftovers.length === 0
    ? []
    : [`a server function survived into the emitted site: ${leftovers.join(', ')}`];
}

function documentStore(parsed: unknown): unknown {
  if (typeof parsed !== 'object' || parsed === null) return undefined;
  if (!('internalDocumentIDStore' in parsed)) return undefined;

  return parsed.internalDocumentIDStore;
}

function indexedRoutes(parsed: unknown): string[] {
  const store = documentStore(parsed);

  if (typeof store !== 'object' || store === null) return [];
  if (!('internalIdToId' in store)) return [];

  const ids = store.internalIdToId;

  return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
}

function routeFor(page: string): string {
  const slug = page.replace(/\.mdx?$/, '');

  return slug === 'index' ? '/docs' : `/docs/${slug}`;
}

async function searchFailures(pages: string[], emittedFiles: Set<string>): Promise<string[]> {
  if (!emittedFiles.has(searchIndex)) return ['the search index never reached the emitted site'];

  const routes = indexedRoutes(JSON.parse(await readFile(join(emitted, searchIndex), 'utf8')));

  if (routes.length === 0) return ['the search index carries nothing to search'];

  return pages
    .filter((page) => !routes.some((route) => route.startsWith(routeFor(page))))
    .map((page) => `${page} never reached the search index`);
}

const emittedFiles = new Set(await filesUnder(emitted));
const pages = (await filesUnder(content)).filter((page) => /\.mdx?$/.test(page));

const failures = [
  ...(pages.length === 0 ? ['the content source holds no documentation page'] : []),
  ...missingDocuments(pages, emittedFiles),
  ...survivingServerFunctions(emittedFiles),
  ...(await searchFailures(pages, emittedFiles)),
];

if (failures.length > 0) {
  for (const failure of failures) console.error(`  ${failure}`);

  console.error(`\nthe emitted site failed ${String(failures.length)} check(s)`);
  process.exitCode = 1;
} else {
  console.log(`the emitted site answers for ${String(pages.length + 1)} published routes`);
}
