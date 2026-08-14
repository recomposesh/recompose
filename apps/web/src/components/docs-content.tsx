import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { use } from 'react';

import { docs } from '../lib/source';
import { useMDXComponents } from './mdx';

export function DocsContent({ path }: { path: string }) {
  const components = useMDXComponents();
  const page = docs.getPage(path);

  if (!page) throw new Error(`unknown documentation page: ${path}`);

  const { toc } = use(page.load());
  const Mdx = page.body;

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{page.title}</DocsTitle>
      <DocsDescription>{page.description}</DocsDescription>
      <DocsBody>
        <Mdx components={components} />
      </DocsBody>
    </DocsPage>
  );
}
