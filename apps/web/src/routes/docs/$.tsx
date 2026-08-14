import { createFileRoute, notFound } from '@tanstack/react-router';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { Suspense } from 'react';

import { DocsContent } from '../../components/docs-content';
import { gitHubUrl, navOptions } from '../../lib/layout.shared';
import { docs, source } from '../../lib/source';

export const Route = createFileRoute('/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split('/').filter(Boolean) ?? [];
    const page = source.getPage(slugs);

    if (!page) throw notFound();

    await docs.getPage(page.path)?.preload();

    return {
      path: page.path,
      pageTree: await source.serializePageTree(source.getPageTree()),
    };
  },
});

function Page() {
  const { pageTree, path } = useFumadocsLoader(Route.useLoaderData());

  return (
    <DocsLayout nav={navOptions} githubUrl={gitHubUrl} tree={pageTree}>
      <Suspense>
        <DocsContent path={path} />
      </Suspense>
    </DocsLayout>
  );
}
