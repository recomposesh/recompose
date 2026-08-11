import type {
  AccountsDocument,
  EngineStates,
  GatewayConfig,
  SubscriptionAccountView,
} from '@recompose/contracts';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { render } from 'vitest-browser-react';

import type { SettledDefinition } from '../lib/model-draft';
import type { InspectorSubject } from '../ui/gateway-drawer/gateway-drawer';

import { installFakeBridge } from '../../../shared/testing';
import { GatewayDrawer } from '../ui/gateway-drawer/gateway-drawer';
import {
  listedModels,
  runningGateway,
  servingGateway,
  storedAccounts,
} from './gateway-canvas.testkit';

export type DrawerWorld = {
  accounts?: AccountsDocument;
  gateway?: GatewayConfig;
  states?: EngineStates;
  subscriptions?: readonly SubscriptionAccountView[];
  refusal?: string;
  onDraftDefined?: (definition: SettledDefinition) => void;
  onAskRemoval?: (nodeId: string) => void;
  onModelRenamed?: (modelId: string) => void;
};

const servingDrawerWorld = {
  accounts: storedAccounts,
  gateway: servingGateway,
  states: runningGateway,
  subscriptions: [],
  onDraftDefined: () => {},
  onAskRemoval: () => {},
  onModelRenamed: () => {},
} satisfies DrawerWorld;

/** Renders the drawer over a seeded bridge, defaulting every seat to the serving world. */
export async function renderDrawer(subject: InspectorSubject, world: DrawerWorld = {}) {
  const settled = { ...servingDrawerWorld, ...world };
  const { onAskRemoval, onDraftDefined, onModelRenamed } = settled;

  installFakeBridge({
    accounts: settled.accounts,
    gateways: [settled.gateway],
    engineStates: settled.states,
    providerModels: listedModels,
    subscriptions: settled.subscriptions,
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<p>Loading…</p>}>
        <GatewayDrawer
          gateway={settled.gateway}
          onAskRemoval={onAskRemoval}
          onDraftDefined={onDraftDefined}
          onModelRenamed={onModelRenamed}
          refusal={settled.refusal}
          subject={subject}
        />
      </Suspense>
    </QueryClientProvider>,
  );
}
