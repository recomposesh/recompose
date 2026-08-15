import type { ReactNode } from 'react';

import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

const rootRoute = createRootRoute();

const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '/' }),
  createRoute({ getParentRoute: () => rootRoute, path: '/providers' }),
]);

/**
 * Stands a component under a router that knows the addresses its links name.
 *
 * @summary A component holding a link builds its address through the router around it, so a spec
 * rendering that component alone has to put one there. This router carries the routes the canvas
 * links at and nothing else, so a spec here never drags the whole app's route tree in behind it.
 */
export function RouterFooting({ children }: { children: ReactNode }) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return <RouterContextProvider router={router}>{children}</RouterContextProvider>;
}
