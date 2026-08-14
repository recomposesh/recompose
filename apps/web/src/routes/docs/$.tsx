import { createFileRoute, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { GlassLayout } from 'fumadocs-ui/layouts/glass';
import { Suspense } from 'react';

import { DocsContent } from '../../components/docs-content';
import { baseOptions } from '../../lib/layout.shared';
import { docs, source } from '../../lib/source';

const serverLoader = createServerFn({
  method: 'GET',
})
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);

    if (!page) throw notFound();

    return {
      path: page.path,
      pageTree: await source.serializePageTree(source.getPageTree()),
    };
  });

export const Route = createFileRoute('/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split('/') ?? [];
    const data = await serverLoader({ data: slugs });

    await docs.getPage(data.path)?.preload();

    return data;
  },
});

function Page() {
  const data = useFumadocsLoader(Route.useLoaderData());

  return (
    <GlassLayout nav={baseOptions().nav} tree={data.pageTree}>
      <Suspense>
        <DocsContent path={data.path} />
      </Suspense>
    </GlassLayout>
  );
}
