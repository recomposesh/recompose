import type { EngineStates, Settings } from '@recompose/contracts';

import { join } from 'node:path';

import type { EngineHost } from '../engine-host/engine-host';
import type { SpendGrantFor } from '../engine-host/engine-spend';
import type { GatewayLifecycleRequests } from '../engine-host/gateway-lifecycle-requests';
import type { ServingMemory } from '../engine-host/serving-memory';
import type { SpendGrantContext } from '../engine-host/spend-grant';
import type { StorageWatchers } from '../storage/storage-watchers';
import type { CredentialCustody } from '../subscriptions/credential-custody';
import type { UsageStore } from '../usage/usage-store';

import { createEngineHost } from '../engine-host/engine-host';
import { noticingTheFirstGrant } from '../engine-host/first-request';
import { rememberedServingSlugs, servingMemoryKeeper } from '../engine-host/serving-memory';
import { spawnEngineChild } from '../engine-host/spawn-engine';
import { resolveSpendGrant } from '../engine-host/spend-grant';
import {
  startAllStoredGateways,
  startRememberedGateways,
} from '../engine-host/stored-gateway-serving';
import {
  pushAccountsChanged,
  pushEngineLogs,
  pushEngineStates,
  pushEngineTraffic,
} from '../ipc/push-events';
import { storagePathsFor } from '../ipc/storage-context';
import { storedBootState } from '../storage/boot-state';
import { adoptLegacyConfigHome } from '../storage/config-home';
import { firstRequestReporter } from '../storage/settings-amend';
import { loadSettingsFile } from '../storage/settings-store';
import { startStorageWatchers } from '../storage/storage-watchers';
import { subscriptionCredentialStore } from '../subscriptions/subscription-credential-store';
import { machineCustody } from '../subscriptions/subscriptions-wiring';
import { openAccountKinds } from '../usage/account-kinds';
import { openUsageStore } from '../usage/usage-store';

export type StoredBootDeps = {
  legacyUserDataPath: string;
  platform: NodeJS.Platform;
  recomposeHome: () => string;
  onCorrupt: (quarantinedPath: string) => void;
  spendGrantContext: (custody: CredentialCustody | null) => SpendGrantContext;
  reflectSettings: (settings: Settings) => void;
  repaintStates: (states: EngineStates) => void;
  lifecycle: Pick<GatewayLifecycleRequests, 'reapply' | 'stop'>;
};

export type StoredBoot = {
  settings: Settings;
  custody: CredentialCustody | null;
  engineHost: EngineHost;
  storageWatchers: StorageWatchers;
  usageStore: UsageStore;
  serveStoredGateways: () => void;
  close: () => void;
};

function storedSpendGrants(deps: StoredBootDeps, custody: CredentialCustody | null): SpendGrantFor {
  return noticingTheFirstGrant(
    async (slug, model) => resolveSpendGrant(deps.spendGrantContext(custody), slug, model),
    firstRequestReporter(
      () => storagePathsFor(deps.recomposeHome()).settingsFile,
      deps.onCorrupt,
      deps.reflectSettings,
    ),
  );
}

function closeInQuitOrder(
  servingMemory: ServingMemory,
  storageWatchers: StorageWatchers,
  engineHost: EngineHost,
): () => void {
  return () => {
    servingMemory.close();
    storageWatchers.close();
    engineHost.dispose();
  };
}

/**
 * Stands the engine host, its serving memory, and the storage watchers up from the stored profile.
 *
 * @summary The legacy home adopts before any stored state is read, so a profile an earlier build
 * left in Electron's userData is what this launch boots from. The serving memory wires into the
 * state changes and closes first at quit, because the engine child's death would otherwise
 * honestly record that nothing was serving. Serving starts only when the caller asks, so every
 * IPC channel already answers by the time the first gateway stands up.
 */
async function openUsageLedger(deps: StoredBootDeps) {
  const accountKinds = await openAccountKinds({
    file: join(deps.recomposeHome(), 'accounts.json'),
    onCorrupt: deps.onCorrupt,
  });
  const usageStore = await openUsageStore({
    file: join(deps.recomposeHome(), 'usage.json'),
    retentionDays: async () =>
      (await loadSettingsFile(storagePathsFor(deps.recomposeHome()).settingsFile, deps.onCorrupt))
        .usageRetentionDays,
    accountKindOf: accountKinds.kindOf,
    onCorrupt: deps.onCorrupt,
  });

  return { accountKinds, usageStore };
}

function watchEngineStates(
  engineHost: EngineHost,
  deps: StoredBootDeps,
  servingMemory: ServingMemory,
  usageStore: UsageStore,
): void {
  engineHost.onStatesChanged(pushEngineStates);
  engineHost.onStatesChanged(deps.repaintStates);
  engineHost.onStatesChanged(servingMemory.keep);
  engineHost.onStatesChanged(() => {
    void usageStore.flushNow();
  });
  deps.repaintStates(engineHost.states());
}

export async function bootFromStoredState(deps: StoredBootDeps): Promise<StoredBoot> {
  await adoptLegacyConfigHome(deps.legacyUserDataPath, deps.recomposeHome());

  const boot = await storedBootState(deps.recomposeHome(), deps.onCorrupt);
  const custody = machineCustody(deps.recomposeHome());
  const { accountKinds, usageStore } = await openUsageLedger(deps);
  const engineHost = createEngineHost({
    knownSlugs: boot.slugs,
    spawnChild: () => spawnEngineChild(deps.recomposeHome()),
    grantFor: storedSpendGrants(deps, custody),
    storeSubscriptionCredential: subscriptionCredentialStore(
      deps.recomposeHome(),
      deps.platform,
      custody,
    ).write,
    onTraffic: pushEngineTraffic,
    onLogs: pushEngineLogs,
    onSettledRow: usageStore.accrue,
  });
  const rememberedServing = await rememberedServingSlugs(deps.recomposeHome());
  const servingMemory = servingMemoryKeeper(deps.recomposeHome());

  watchEngineStates(engineHost, deps, servingMemory, usageStore);

  const storageWatchers = await startStorageWatchers({
    userDataPath: deps.recomposeHome(),
    lifecycle: deps.lifecycle,
    onCorrupt: deps.onCorrupt,
    onAccountsChanged: () => {
      pushAccountsChanged();
      void accountKinds.refresh();
    },
  });

  return {
    settings: boot.settings,
    custody,
    engineHost,
    storageWatchers,
    usageStore,
    serveStoredGateways: () => {
      if (boot.settings.startGatewaysOnLaunch === true) {
        startAllStoredGateways(engineHost, deps.recomposeHome(), deps.onCorrupt);

        return;
      }

      startRememberedGateways(engineHost, deps.recomposeHome(), deps.onCorrupt, rememberedServing);
    },
    close: closeInQuitOrder(servingMemory, storageWatchers, engineHost),
  };
}
