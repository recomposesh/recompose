import type { GatewayConfig } from '@recompose/contracts';

import type { EngineHost } from '../engine-host/engine-host';
import type { SpendGrantContext } from '../engine-host/spend-grant';
import type { SettingsEffects } from '../settings/apply-settings';
import type { CredentialCustody } from '../subscriptions/credential-custody';
import type { StorageIpcContext } from './storage-context';

import {
  restartServingGateways,
  serveRewrittenGateway,
  startStoredGateway,
  stopRemovedGateway,
} from '../engine-host/stored-gateway-serving';
import { applyChosenSettingsOrComplain } from '../settings/apply-settings';
import { subscriptionHomes } from '../subscriptions/subscription-homes';
import { subscriptionRelease } from '../subscriptions/subscription-release';

type StorageContextSeams = {
  storageReach: (custody: CredentialCustody | null) => SpendGrantContext;
  isEncryptionAvailable: () => boolean;
  readLoginItem: () => boolean;
  settingsEffects: SettingsEffects;
  onSettingsWritten: StorageIpcContext['onSettingsWritten'];
  noteGatewayWrite: (gateway: GatewayConfig) => void;
  platform: NodeJS.Platform;
};

/**
 * Everything the storage channels reach, gathered around one engine host and one custody.
 *
 * @summary It stands apart from the composition root because the host and the custody only exist
 * once a profile has booted, while the seams above are settled before the first window opens. The
 * root names what it owns; which of those a stored read or write reaches is decided here.
 */
export function storageContextWiring(
  seams: StorageContextSeams,
): (engineHost: EngineHost, custody: CredentialCustody | null) => StorageIpcContext {
  return (engineHost, custody) => {
    const reach = seams.storageReach(custody);

    return {
      ...reach,
      isEncryptionAvailable: seams.isEncryptionAvailable,
      readLoginItem: seams.readLoginItem,
      applySettings: (settings, askedLoginItem) => {
        applyChosenSettingsOrComplain(seams.settingsEffects, settings, askedLoginItem);
      },
      onSettingsWritten: seams.onSettingsWritten,
      restartServingGateways: () => {
        restartServingGateways(engineHost, reach.userDataPath, reach.onCorrupt);
      },
      startGateway: startStoredGateway(engineHost),
      restartGateway: serveRewrittenGateway(engineHost),
      stopGateway: stopRemovedGateway(engineHost),
      removeGatewayRuntime: async (slug) => {
        try {
          await engineHost.stop(slug);
        } finally {
          engineHost.forget?.(slug);
        }
      },
      forgetGateway: (slug) => {
        engineHost.forget?.(slug);
      },
      noteGatewayWrite: seams.noteGatewayWrite,
      isServing: (slug) => engineHost.states()[slug]?.status === 'running',
      releaseSubscription: subscriptionRelease(
        subscriptionHomes(reach.userDataPath, seams.platform),
        custody,
      ),
    };
  };
}
