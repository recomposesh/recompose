import type { Decorator } from '@storybook/react-vite';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterContextProvider, createMemoryHistory } from '@tanstack/react-router';
import { Suspense, useEffect, useMemo } from 'react';

import type { BridgeParameters } from '../src/renderer/src/shared/testing';

import { createAppRouter } from '../src/renderer/src/app/router';
import { bindEngineTrafficToCache } from '../src/renderer/src/shared/api';
import { installFakeBridge } from '../src/renderer/src/shared/testing';

/**
 * The app's surroundings, as a story gets them.
 *
 * @summary The traffic push reaches the cache here, so a story can drive one and watch a surface
 * answer it. Without it nothing on a canvas could show a request landing, and the one part of
 * setup that resolves on its own would have no way to be shown resolving.
 */
export const withRecomposeBridge: Decorator = (Story, context) => {
  const bridgeParameter = context.parameters['bridge'] as BridgeParameters | undefined;
  const routeParameter = context.parameters['route'] as string | undefined;

  const surroundings = useMemo(() => {
    installFakeBridge(bridgeParameter ?? {});

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const router = createAppRouter({
      queryClient,
      history: createMemoryHistory({ initialEntries: [routeParameter ?? '/'] }),
    });

    return { queryClient, router };
  }, [bridgeParameter, routeParameter]);

  useEffect(() => bindEngineTrafficToCache(surroundings.queryClient), [surroundings.queryClient]);

  return (
    <Suspense fallback={null}>
      <RouterContextProvider router={surroundings.router}>
        <QueryClientProvider client={surroundings.queryClient}>
          <Story />
        </QueryClientProvider>
      </RouterContextProvider>
    </Suspense>
  );
};
