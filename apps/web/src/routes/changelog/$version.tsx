import { createFileRoute, notFound } from '@tanstack/react-router';

import { ChangelogScreen } from '../../changelog/changelog-screen';
import { changelogEntries } from '../../lib/changelog-entries';

export const Route = createFileRoute('/changelog/$version')({
  loader: ({ params }) => {
    const entry = changelogEntries.find((candidate) => candidate.version === params.version);

    if (entry === undefined) throw notFound();

    return entry;
  },
  head: ({ params }) => ({
    meta: [{ title: `recompose ${params.version} changelog` }],
  }),
  component: ChangelogVersion,
});

function ChangelogVersion() {
  const entry = Route.useLoaderData();

  return <ChangelogScreen entry={entry} />;
}
