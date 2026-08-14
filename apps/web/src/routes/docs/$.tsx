import { createFileRoute, notFound } from '@tanstack/react-router';
import { GlassLayout } from 'fumadocs-ui/layouts/glass';
import { Suspense } from 'react';

import { DocsBrand } from '../../components/docs-brand';
import { DocsContent } from '../../components/docs-content';
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
    <GlassLayout nav={{ title: DocsBrand, url: '/' }} tree={source.getPageTree()}>
      <Suspense>
        <DocsContent path={path} />
      </Suspense>
    </GlassLayout>
  );
}
