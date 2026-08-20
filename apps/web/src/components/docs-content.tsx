import type { Root } from 'fumadocs-core/page-tree';

import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { use } from 'react';

import { docs } from '../lib/source';
import { CategoryCards } from './category-cards';
import { DocsBackdrop } from './docs-backdrop';
import { useMDXComponents } from './mdx';
import { PageActions } from './page-actions';

const INTRODUCTION_CARD_URLS = [
  '/docs/get-started/install',
  '/docs/get-started/quickstart',
  '/docs/get-started/how-recompose-works',
  '/docs/get-started/faq',
  '/docs/connect',
];

export function DocsContent({ path, url, tree }: { path: string; url: string; tree: Root }) {
  const components = useMDXComponents();
  const page = docs.getPage(path);

  if (!page) throw new Error(`unknown page: ${path}`);

  const { toc } = use(page.load());
  const Mdx = page.body;

  return (
    <DocsPage toc={toc} tableOfContent={{ style: 'clerk' }} className="relative isolate">
      <DocsBackdrop />
      <DocsTitle className="font-medium">{page.title}</DocsTitle>
      <DocsDescription>{page.description}</DocsDescription>
      <PageActions path={path} url={url} />
      <DocsBody>
        <Mdx components={components} />
        {path === 'index.md' && <CategoryCards tree={tree} urls={INTRODUCTION_CARD_URLS} />}
      </DocsBody>
    </DocsPage>
  );
}
