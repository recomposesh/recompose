import { createFileRoute, notFound } from '@tanstack/react-router';

import { ChangelogScreen } from '../../changelog/changelog-screen';
import { changelogEntries } from '../../lib/changelog-entries';
import { pageMeta } from '../../lib/seo';

export const Route = createFileRoute('/changelog/$version')({
  loader: ({ params }) => {
    const entry = changelogEntries.find((candidate) => candidate.version === params.version);

    if (entry === undefined) throw notFound();

    return entry;
  },
  head: ({ params, loaderData }) => ({
    meta: pageMeta({
      title: `recompose ${params.version} changelog`,
      description: loaderData?.intro ?? 'keep up with the latest recompose releases.',
      path: `/changelog/${params.version}`,
    }),
  }),
  component: ChangelogVersion,
});

function ChangelogVersion() {
  const entry = Route.useLoaderData();

  return <ChangelogScreen entry={entry} />;
}
