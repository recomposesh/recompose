import type { UpdateState } from '@recompose/contracts';

import { QueryClient } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';

import { bindUpdateStateToCache, updatesQueryOptions } from './updates';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('asking reads the whole state over the bridge', async () => {
  vi.stubGlobal('window', {
    recompose: {
      'updates:get': async () =>
        Promise.resolve({ ok: true, value: { standing: 'ready', version: '0.4.0' } }),
    },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  await expect(queryClient.fetchQuery(updatesQueryOptions)).resolves.toEqual({
    standing: 'ready',
    version: '0.4.0',
  });
});

it('a pushed state lands in the cache for any later reader', () => {
  const queryClient = new QueryClient();
  let push: (state: UpdateState) => void = () => undefined;
  const release = bindUpdateStateToCache(queryClient, (listener) => {
    push = listener;

    return () => undefined;
  });

  push({ standing: 'ready', version: '0.4.0' });

  expect(queryClient.getQueryData(updatesQueryOptions.queryKey)).toEqual({
    standing: 'ready',
    version: '0.4.0',
  });
  release();
});

it('a later push replaces the earlier state whole', () => {
  const queryClient = new QueryClient();
  let push: (state: UpdateState) => void = () => undefined;
  const release = bindUpdateStateToCache(queryClient, (listener) => {
    push = listener;

    return () => undefined;
  });

  push({ standing: 'downloading', version: '0.4.0' });
  push({ standing: 'ready', version: '0.4.0' });

  expect(queryClient.getQueryData(updatesQueryOptions.queryKey)).toEqual({
    standing: 'ready',
    version: '0.4.0',
  });
  release();
});
