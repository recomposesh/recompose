import { app } from 'electron';
import { userInfo } from 'node:os';

import type { SubscriptionsIpcContext } from '../ipc/subscriptions-ipc';
import type { SubscriptionsIpcHandlers } from '../ipc/subscriptions-ipc';
import type { SubscriptionsMachineIpcHandlers } from '../ipc/subscriptions-machine-ipc';
import type { CredentialCustody } from './credential-custody';

import { storagePathsFor } from '../ipc/storage-context';
import { createSubscriptionsIpcHandlers } from '../ipc/subscriptions-ipc';
import { createSubscriptionsMachineIpcHandlers } from '../ipc/subscriptions-machine-ipc';
import { loadAccountsFile } from '../storage/accounts-store';
import { oneAtATime } from '../storage/one-at-a-time';
import { credentialCustody } from './credential-custody';
import { keychainCarriedOnce, repairCustody } from './custody-repair';
import { loginShellPath } from './login-shell-path';
import { securityKeychain } from './macos-keychain';
import { terminalSignInLaunch } from './sign-in-launch';
import { subscriptionHomes } from './subscription-homes';
import { wallClock } from './subscription-sign-in';

const SIGN_IN_BOUND_MS = 5 * 60 * 1000;
const SIGN_IN_EVERY_MS = 1_000;
const LOGIN_SHELL_BOUND_MS = 3_000;
const SECURITY_COMMAND = '/usr/bin/security';

/**
 * Reads the executable the e2e fakes stand in with, and only from a build nobody shipped.
 *
 * @summary A packaged release runs under whatever environment starts it, so honouring these
 * would let anyone who can set a variable have the app spawn a binary of their choosing.
 */
function substituteFor(variable: string): string | null {
  return app.isPackaged ? null : (process.env[variable] ?? null);
}

export type SubscriptionsWiring = {
  userDataPath: string;
  homeFolder: string;
  custody: CredentialCustody | null;
  onCorrupt: (quarantinedPath: string) => void;
};

/**
 * @summary An install written before each home owned its item carries on the first custody read,
 * so the person's own login goes back rather than staying under this app's chain.
 */
export function machineCustody(userDataPath: string): CredentialCustody | null {
  if (process.platform !== 'darwin') {
    return null;
  }

  const osUser = userInfo().username;
  const seam = securityKeychain(substituteFor('RECOMPOSE_KEYCHAIN_COMMAND') ?? SECURITY_COMMAND);
  const homes = subscriptionHomes(userDataPath, process.platform);
  const accountsFile = storagePathsFor(userDataPath).accountsFile;
  const anthropicRows = async (): Promise<readonly string[]> =>
    loadAccountsFile(accountsFile, () => undefined).then((held) =>
      held.accounts.flatMap((row) =>
        row.kind === 'subscription' && row.provider === 'anthropic' ? [row.id] : [],
      ),
    );

  return credentialCustody(
    keychainCarriedOnce(seam, async () =>
      repairCustody({
        keychain: seam,
        osUser,
        homeFor: (id) => homes.homeFor('anthropic', id),
        accountIds: anthropicRows,
        activeId: async () => homes.readActive('anthropic'),
      }),
    ),
    osUser,
  );
}

async function toolSearchPath(): Promise<string> {
  return loginShellPath({
    shell: process.env['SHELL'],
    environmentPath: process.env['PATH'] ?? '',
    platform: process.platform,
    boundMs: LOGIN_SHELL_BOUND_MS,
  });
}

function subscriptionsContext(wiring: SubscriptionsWiring): SubscriptionsIpcContext {
  return {
    userDataPath: wiring.userDataPath,
    homeFolder: wiring.homeFolder,
    platform: process.platform,
    custody: wiring.custody,
    searchPath: toolSearchPath,
    launch: terminalSignInLaunch(process.platform, substituteFor('RECOMPOSE_SIGN_IN_LAUNCHER')),
    clock: wallClock,
    signInBoundMs: SIGN_IN_BOUND_MS,
    signInEveryMs: SIGN_IN_EVERY_MS,
    onCorrupt: wiring.onCorrupt,
  };
}

/**
 * @summary Both subscription handler sets share one context and one write lane, so a sign-in and
 * an adoption never record an account at the same moment.
 */
export function subscriptionIpcHandlers(
  wiring: SubscriptionsWiring,
): SubscriptionsIpcHandlers & SubscriptionsMachineIpcHandlers {
  const ctx = subscriptionsContext(wiring);

  return {
    ...createSubscriptionsIpcHandlers(ctx),
    ...createSubscriptionsMachineIpcHandlers(ctx, oneAtATime()),
  };
}
