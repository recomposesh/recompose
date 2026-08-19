import type { GatewayBranchPins } from '@recompose/contracts';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { engineBranchPinsQueryOptions } from '../../../shared/api';
import { useBranchPinsAt } from './branch-pins';

const AT = { slug: 'personal', virtualModel: 'fast', routeNode: 'ladder' };

function Probe() {
  const pins = useBranchPinsAt(AT);

  return <p>{`coder holds ${String(pins.get('coder') ?? 0)}`}</p>;
}

async function probeReading(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <Probe />
    </QueryClientProvider>,
  );
}

function aClientHolding(pinning?: GatewayBranchPins): QueryClient {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  if (pinning !== undefined) {
    queryClient.setQueryData(engineBranchPinsQueryOptions.queryKey, pinning);
  }

  return queryClient;
}

test('a router nobody has judged through yet counts nothing', async () => {
  const screen = await probeReading(aClientHolding());

  await expect.element(screen.getByText('coder holds 0')).toBeInTheDocument();
});

test('the count a branch is holding reads from what the engine last said', async () => {
  const screen = await probeReading(
    aClientHolding({ personal: { fast: { ladder: { coder: 3 } } } }),
  );

  await expect.element(screen.getByText('coder holds 3')).toBeInTheDocument();
});

test('a pushed count arriving while the rows stand is what they read next', async () => {
  const queryClient = aClientHolding({ personal: { fast: { ladder: { coder: 3 } } } });
  const screen = await probeReading(queryClient);

  await expect.element(screen.getByText('coder holds 3')).toBeInTheDocument();

  queryClient.setQueryData(engineBranchPinsQueryOptions.queryKey, {
    personal: { fast: { ladder: { coder: 4 } } },
  });

  await expect.element(screen.getByText('coder holds 4')).toBeInTheDocument();
});
