import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from 'vitest-browser-react';

import type { BridgeParameters } from '../testing';

import { installFakeBridge } from '../testing';

const retriesOff = { queries: { retry: false }, mutations: { retry: false } };

/**
 * Stands a piece of the app over a fake bridge, with retries off.
 *
 * @summary Reach for it from any browser spec's testkit. Every one of them arranges the same three
 * things, and a retry left on turns a refusal a scenario is asserting into a wait the scenario
 * times out on. It stands apart from the shared testing segment because the
 * render it reaches for only exists inside a browser run, and that segment is read by node specs
 * as well.
 */
export async function renderUnderTheBridge(children: ReactNode, parameters: BridgeParameters = {}) {
  installFakeBridge(parameters);

  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: retriesOff })}>
      {children}
    </QueryClientProvider>,
  );
}
