import type { EngineGateway, GatewayConfig, Settings } from '@recompose/contracts';

import { join } from 'node:path';

import type { SecretCodec } from '../storage/safe-storage-codec';
import type { SubscriptionRelease } from '../subscriptions/subscription-release';

export type StorageIpcContext = {
  /** The home directory this process runs under, so no account name reaches the screen. */
  homeFolder: string;
  /** What the operating system currently holds for the login item. */
  readLoginItem: () => boolean;
  userDataPath: string;
  getCodec: () => SecretCodec;
  isEncryptionAvailable: () => boolean;
  onCorrupt: (quarantinedPath: string) => void;
  applySettings: (settings: Settings, askedLoginItem: boolean | undefined) => void;
  /** A saved document reaches every window and the application menu through this report. */
  onSettingsWritten: (settings: Settings) => void;
  /** Restarts the gateways currently serving when a server-wide setting changes. */
  restartServingGateways?: (() => void) | undefined;
  /** A stored gateway serves at once, and the outcome reaches the screen by push rather than here. */
  startGateway: (gateway: EngineGateway) => void;
  /** A rewritten gateway serves its fresh snapshot, which only a restart puts in front of it. */
  restartGateway: (gateway: EngineGateway) => void;
  /** A removed gateway stops serving before its document leaves the disk. */
  stopGateway: (slug: string) => void;
  /** Stops and forgets a removed gateway before the removal answer returns. */
  removeGatewayRuntime?: ((slug: string) => Promise<void>) | undefined;
  /** Clears the in-memory readings of a gateway that was not serving when removed. */
  forgetGateway?: ((slug: string) => void) | undefined;
  noteGatewayWrite?: ((gateway: GatewayConfig) => void) | undefined;
  /** Whether the engine is serving this gateway right now, so a rewrite never undoes a stop. */
  isServing: (slug: string) => boolean;
  releaseSubscription: SubscriptionRelease;
};

export type StoragePaths = {
  gatewaysDir: string;
  settingsFile: string;
  accountsFile: string;
  vaultFile: string;
  planUsageFile: string;
  balancesFile: string;
};

export function storagePathsFor(userDataPath: string): StoragePaths {
  return {
    gatewaysDir: join(userDataPath, 'gateways'),
    settingsFile: join(userDataPath, 'settings.json'),
    accountsFile: join(userDataPath, 'accounts.json'),
    vaultFile: join(userDataPath, 'vault.bin'),
    planUsageFile: join(userDataPath, 'plan-usage.json'),
    balancesFile: join(userDataPath, 'balances.json'),
  };
}
