import type { StorageIpcContext } from '../ipc/storage-context';
import type { EngineHost } from './engine-host';

import { storagePathsFor } from '../ipc/storage-context';
import { listGatewayConfigs } from '../storage/gateway-store';
import { engineGatewayOf, storedEngineGateway } from './stored-gateway';

export function startStoredGateway(engineHost: EngineHost): StorageIpcContext['startGateway'] {
  return (gateway) => {
    engineHost.start(gateway).catch((error: unknown) => {
      console.error(`recompose stored ${gateway.slug} but could not start it`, error);
    });
  };
}

export function serveRewrittenGateway(engineHost: EngineHost): StorageIpcContext['restartGateway'] {
  return (gateway) => {
    engineHost.restart(gateway).catch((error: unknown) => {
      console.error(`recompose rewrote ${gateway.slug} but could not serve it again`, error);
    });
  };
}

export function stopRemovedGateway(engineHost: EngineHost): StorageIpcContext['stopGateway'] {
  return (slug) => {
    engineHost
      .stop(slug)
      .catch((error: unknown) => {
        console.error(`recompose removed ${slug} but could not stop it`, error);
      })
      .finally(() => {
        engineHost.forget?.(slug);
      });
  };
}

/**
 * Stands every stored gateway up at launch, which the launch setting asks for when it is on.
 *
 * @summary Each start rides on its own, because one gateway whose account left the registry must
 * not keep the rest of the fleet from serving.
 */
export function startAllStoredGateways(
  engineHost: EngineHost,
  userDataPath: string,
  onCorrupt: (quarantinedPath: string) => void,
): void {
  void listGatewayConfigs(storagePathsFor(userDataPath).gatewaysDir, onCorrupt)
    .then((stored) => {
      for (const config of stored) {
        void engineGatewayOf(userDataPath, onCorrupt, config)
          .then(async (serving) => engineHost.start(serving))
          .catch((error: unknown) => {
            console.error(`recompose could not start ${config.slug} at launch`, error);
          });
      }
    })
    .catch((error: unknown) => {
      console.error('recompose could not read the stored gateways at launch', error);
    });
}

/**
 * Stands the gateways the last run left serving back up, skipping any that left the store since.
 *
 * @summary Each start rides on its own, because one gateway whose account left the registry must
 * not keep the rest of the remembered fleet from serving.
 */
export function startRememberedGateways(
  engineHost: EngineHost,
  userDataPath: string,
  onCorrupt: (quarantinedPath: string) => void,
  slugs: readonly string[],
): void {
  for (const slug of slugs) {
    void storedEngineGateway(userDataPath, onCorrupt, slug)
      .then(async (serving) => (serving === undefined ? undefined : engineHost.start(serving)))
      .catch((error: unknown) => {
        console.error(`recompose remembered ${slug} serving but could not start it`, error);
      });
  }
}
