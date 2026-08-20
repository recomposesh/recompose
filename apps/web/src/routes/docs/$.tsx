import { createFileRoute, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { Suspense } from 'react';

import { DocsContent } from '../../components/docs-content';
import { baseOptions } from '../../lib/layout.shared';
import { pageMeta } from '../../lib/seo';
import { docs, source } from '../../lib/source';

/**
 * @summary The site deploys as files with no server behind them (record 0146), so this function
 * has to answer from the build. `staticFunctionMiddleware` runs it during prerender and writes
 * each result beside the documents; without it a client-side navigation calls `/_serverFn/` and
 * reads the 404 document back. It has to stay the last middleware.
 */
const serverLoader = createServerFn({
  method: 'GET',
})
  .middleware([staticFunctionMiddleware])
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);

    if (!page) throw notFound();

    return {
      path: page.path,
      url: page.url,
      title: page.data.title,
      description: page.data.description ?? 'the recompose documentation.',
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
  head: ({ loaderData }) =>
    loaderData === undefined
      ? {}
      : {
          meta: pageMeta({
            title: `${loaderData.title} · recompose docs`,
            description: loaderData.description,
            path: loaderData.url,
          }),
        },
});

function Page() {
  const data = useFumadocsLoader(Route.useLoaderData());
  const { nav, githubUrl } = baseOptions();

  return (
    <DocsLayout nav={nav} githubUrl={githubUrl} tree={data.pageTree}>
      <Suspense>
        <DocsContent path={data.path} url={data.url} tree={data.pageTree} />
      </Suspense>
    </DocsLayout>
  );
}
