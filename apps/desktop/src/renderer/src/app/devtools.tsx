import type { QueryClient } from '@tanstack/react-query';
import type { AnyRouter } from '@tanstack/react-router';

import { TanStackDevtools } from '@tanstack/react-devtools';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

type AppDevtoolsProps = {
  /** The cache the query panel reads, named rather than taken from wherever this mounts. */
  queryClient: QueryClient;
  /** The router whose matches, loaders, and search the router panel reads. */
  router: AnyRouter;
};

/**
 * The router and the query cache, both inspectable through one floating trigger.
 *
 * @summary Reach for it from the root layout, inside the guard that keeps devtools out of any
 * build a person runs, and only while the tray has asked for it, so no trigger floats over the
 * canvas uninvited. Each library ships a trigger of its own, and the shell has no free corner
 * for a second one, so the panels mount as plugins of a single host instead. The host opens on
 * mount, because the ask that mounted it was the ask to look inside.
 */
export function AppDevtools({ queryClient, router }: AppDevtoolsProps) {
  return (
    <TanStackDevtools
      config={{ position: 'middle-right', defaultOpen: true }}
      plugins={[
        {
          id: 'router',
          name: 'Router',
          defaultOpen: true,
          render: () => <TanStackRouterDevtoolsPanel router={router} />,
        },
        {
          id: 'react-query',
          name: 'React Query',
          render: () => <ReactQueryDevtoolsPanel client={queryClient} />,
        },
      ]}
    />
  );
}
