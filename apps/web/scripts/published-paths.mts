import { readdirSync } from 'node:fs';
import path from 'node:path';

function docsSlugs(directory: string, ancestors: string[]): string[][] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return docsSlugs(path.join(directory, entry.name), [...ancestors, entry.name]);
    }

    if (!entry.name.endsWith('.md')) return [];

    const base = entry.name.slice(0, -'.md'.length);

    return base === 'index' ? [ancestors] : [[...ancestors, base]];
  });
}

export function docsPagePaths(webRoot: string): string[] {
  return docsSlugs(path.join(webRoot, 'content', 'docs'), []).map((slugs) =>
    slugs.length === 0 ? '/docs' : `/docs/${slugs.join('/')}`,
  );
}

export function docsMarkdownPaths(webRoot: string): string[] {
  return docsSlugs(path.join(webRoot, 'content', 'docs'), []).map((slugs) =>
    slugs.length === 0 ? '/docs/index.md' : `/docs/${slugs.join('/')}.md`,
  );
}

export function changelogVersionPaths(webRoot: string): string[] {
  return readdirSync(path.join(webRoot, 'content', 'changelog'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => `/changelog/${name.slice(0, -'.md'.length)}`);
}
