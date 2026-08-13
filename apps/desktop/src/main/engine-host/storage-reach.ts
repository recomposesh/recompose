import type { CredentialCustody } from '../subscriptions/credential-custody';
import type { SpendGrantContext } from './spend-grant';

import { boughtCopilotCredential } from '../subscriptions/copilot-spending-credential';
import { subscriptionCredentialStore } from '../subscriptions/subscription-credential-store';
import { adoptedCredentialFor } from '../subscriptions/subscriptions-wiring';

export type StorageReachPaths = {
  userDataPath: string;
  homeFolder: string;
  platform: NodeJS.Platform;
  getCodec: SpendGrantContext['getCodec'];
  onCorrupt: SpendGrantContext['onCorrupt'];
};

/**
 * Everything a spend or a stored read needs to reach one account's credential.
 *
 * @summary It stands apart from the composition root because the readers it gathers differ per
 * plan, and that difference is a fact about credentials rather than about starting the app. Only
 * Copilot buys what it spends; every other plan spends what it stored.
 */
export function storageReachFor(
  paths: StorageReachPaths,
  custody: CredentialCustody | null,
): SpendGrantContext {
  return {
    userDataPath: paths.userDataPath,
    homeFolder: paths.homeFolder,
    getCodec: paths.getCodec,
    onCorrupt: paths.onCorrupt,
    readSubscriptionCredential: subscriptionCredentialStore(
      paths.userDataPath,
      paths.platform,
      custody,
    ).read,
    readAdoptedCredential: adoptedCredentialFor(paths.userDataPath, paths.homeFolder, custody),
    copilotCredential: boughtCopilotCredential,
  };
}
