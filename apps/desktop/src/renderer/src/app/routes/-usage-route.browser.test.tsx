import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { usageReportQueryOptions } from '../../shared/api';
import { installFakeBridge } from '../../shared/testing';
import { createQueryClient } from '../query-client';
import { createAppRouter } from '../router';

function mountedAt(path: string) {
  installFakeBridge({});

  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  void render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { queryClient, router };
}

describe('the usage route reads its view from the address', () => {
  it('lands a junk address on the default view', async () => {
    const { router } = mountedAt('/usage?range=junk&metric=7');

    await vi.waitFor(() => {
      expect(router.state.location.search).toEqual({ range: '24h', metric: 'requests' });
    });
  });

  it('keeps a whole drilled view across the address boundary', async () => {
    const { router } = mountedAt('/usage?range=7d&metric=tokens&gateway=relay');

    await vi.waitFor(() => {
      expect(router.state.location.search).toEqual({
        range: '7d',
        metric: 'tokens',
        gateway: 'relay',
      });
    });
  });

  it('warms the report for the parsed range before the page mounts', async () => {
    const { queryClient } = mountedAt('/usage?range=7d');

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(usageReportQueryOptions('7d').queryKey)).toBeDefined();
    });
  });
});
