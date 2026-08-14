import { createFileRoute, notFound } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { Suspense } from 'react';

import { DocsContent } from '../../components/docs-content';
import { SiteNav } from '../../components/site-nav';
import { gitHubUrl } from '../../lib/layout.shared';
import { docs, source } from '../../lib/source';

export const Route = createFileRoute('/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split('/').filter(Boolean) ?? [];
    const page = source.getPage(slugs);

    if (!page) throw notFound();

    await docs.getPage(page.path)?.preload();

    return { path: page.path };
  },
});

function Page() {
  const { path } = Route.useLoaderData();

  return (
    <div className="docs-shell">
      <SiteNav />

      <DocsLayout nav={{ enabled: false }} githubUrl={gitHubUrl} tree={source.getPageTree()}>
        <Suspense>
          <DocsContent path={path} />
        </Suspense>
      </DocsLayout>
    </div>
  );
}
