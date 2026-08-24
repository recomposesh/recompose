import type { SubscriptionProviderId } from '@recompose/contracts';

import { app, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { join } from 'node:path';

import type { SubscriptionsIpcContext } from '../ipc/subscriptions-ipc';
import type { SubscriptionsIpcHandlers } from '../ipc/subscriptions-ipc';
import type { SubscriptionsMachineIpcHandlers } from '../ipc/subscriptions-machine-ipc';
import type { CredentialCustody, KeychainSeam } from './credential-custody';
import type { MachineReach } from './machine-store';

import { pushLaunchRefused } from '../ipc/push-events';
import { storagePathsFor } from '../ipc/storage-context';
import { createSubscriptionsIpcHandlers } from '../ipc/subscriptions-ipc';
import { createSubscriptionsMachineIpcHandlers } from '../ipc/subscriptions-machine-ipc';
import { loadAccountsFile } from '../storage/accounts-store';
import { oneAtATime } from '../storage/one-at-a-time';
import { adoptedCredentialReader } from './adopted-credential';
import { antigravityVendor } from './antigravity-sign-in';
import { credentialCustody } from './credential-custody';
import { keychainCarriedOnce, repairCustody } from './custody-repair';
import { loginShellPath, pathHeldBriefly } from './login-shell-path';
import { thisMachine } from './machine-identity';
import { securityKeychain } from './macos-keychain';
import { runCommand } from './run-command';
import { terminalSignInLaunch } from './sign-in-launch';
import { subscriptionCredentialStore } from './subscription-credential-store';
import { subscriptionHomes } from './subscription-homes';
import { wallClock } from './subscription-sign-in';
import { toolFileFor } from './tool-presence';
import { codexVendorItem } from './vendor-item';

const SIGN_IN_BOUND_MS = 5 * 60 * 1000;
const SIGN_IN_EVERY_MS = 1_000;
/**
 * How long the search-path probe may hold an interactive login shell open.
 *
 * @summary An interactive shell runs the whole rc file, which on a working machine means a plugin
 * manager, a version manager, and a prompt, and a cold one of those outlasts the three seconds a
 * login-only shell needed. The bound running out reads on screen as no tool installed, so it is
 * set past a slow start rather than at a fast one.
 */
const LOGIN_SHELL_BOUND_MS = 10_000;

const SEARCH_PATH_HELD_MS = 10_000;
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
  /** Asks the far end which address a Claude access token signed in as. */
  claudeAddress: (accessToken: string) => Promise<string | undefined>;
};

function machineSeam(): KeychainSeam {
  return securityKeychain(substituteFor('RECOMPOSE_KEYCHAIN_COMMAND') ?? SECURITY_COMMAND);
}

/**
 * @summary Codex hashes the resolved path of its config home to name the keyring entry, and falls
 * back to the path as written when it cannot resolve one, so reading that entry has to resolve the
 * same way or it asks for an entry nothing ever wrote.
 */
async function codexHomeAsCodexSeesIt(machineHome: string): Promise<string> {
  const home = join(machineHome, '.codex');

  return realpath(home).catch(() => home);
}

/**
 * Everything the machine's own stores are reached through, wired once for every reader.
 *
 * @summary Detection, the row a screen reads, and every serving turn all ask the same stores, so
 * one reach answers all three and none of them can drift from the others.
 */
function machineReachFor(homeFolder: string, custody: CredentialCustody | null): MachineReach {
  const machineHome = substituteFor('RECOMPOSE_FAKE_MACHINE_HOME') ?? homeFolder;

  return {
    homeFolder: machineHome,
    platform: process.platform,
    custody,
    keyringHolds:
      process.platform === 'darwin'
        ? async () => machineSeam().read(codexVendorItem(await codexHomeAsCodexSeesIt(machineHome)))
        : null,
  };
}

/**
 * @summary An install written before each home owned its item carries on the first custody read,
 * so the person's own login goes back rather than staying under this app's chain.
 */
export function machineCustody(userDataPath: string): CredentialCustody | null {
  if (process.platform !== 'darwin') {
    return null;
  }

  const osUser = userInfo().username;
  const seam = machineSeam();
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

const toolSearchPath = pathHeldBriefly({
  ask: async () =>
    loginShellPath({
      shell: process.env['SHELL'],
      environmentPath: process.env['PATH'] ?? '',
      platform: process.platform,
      boundMs: LOGIN_SHELL_BOUND_MS,
    }),
  nowMs: () => Date.now(),
  holdMs: SEARCH_PATH_HELD_MS,
});

async function sleepFor(ms: number): Promise<void> {
  return new Promise((settle) => {
    setTimeout(settle, ms);
  });
}

function subscriptionsContext(wiring: SubscriptionsWiring): SubscriptionsIpcContext {
  return {
    userDataPath: wiring.userDataPath,
    homeFolder: wiring.homeFolder,
    platform: process.platform,
    custody: wiring.custody,
    machine: machineReachFor(wiring.homeFolder, wiring.custody),
    searchPath: toolSearchPath,
    launch: terminalSignInLaunch(process.platform, substituteFor('RECOMPOSE_SIGN_IN_LAUNCHER')),
    clock: wallClock,
    claudeAddress: wiring.claudeAddress,
    deviceSignIn: {
      fetchLike: fetch,
      sleep: sleepFor,
      nowMs: () => Date.now(),
      machine: thisMachine(app.getVersion()),
      openInBrowser: async (url) => shell.openExternal(url),
    },
    browserSignIn: {
      fetchLike: fetch,
      sleep: sleepFor,
      callbackPort: antigravityVendor.callbackPort,
      openInBrowser: async (url) => shell.openExternal(url),
      boundMs: SIGN_IN_BOUND_MS,
      mintState: () => randomUUID(),
    },
    writeSubscriptionCredential: subscriptionCredentialStore(
      wiring.userDataPath,
      process.platform,
      wiring.custody,
    ).write,
    signInBoundMs: SIGN_IN_BOUND_MS,
    signInEveryMs: SIGN_IN_EVERY_MS,
    noteLaunchRefused: (provider, note) => {
      pushLaunchRefused({ provider, note });
    },
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
  const ctx = subscriptionsContext({
    ...wiring,
    homeFolder: substituteFor('RECOMPOSE_FAKE_MACHINE_HOME') ?? wiring.homeFolder,
  });

  return {
    ...createSubscriptionsIpcHandlers(ctx),
    ...createSubscriptionsMachineIpcHandlers(ctx, oneAtATime()),
  };
}

const RENEWAL_BOUND_MS = 60_000;

/**
 * Reads what a provider's own tool holds, renewing through that tool near expiry.
 *
 * @summary The app keeps no copy of an adopted credential, so every serving turn reads the live
 * store. A run that renews nothing leaves the credential exactly as it stands.
 */
export function adoptedCredentialFor(
  homeFolder: string,
  custody: CredentialCustody | null,
): (provider: SubscriptionProviderId) => Promise<string | null> {
  return adoptedCredentialReader({
    reach: machineReachFor(homeFolder, custody),
    toolFile: async (provider) => toolFileFor(provider, await toolSearchPath(), process.platform),
    runTool: async (toolFile, args) => {
      await runCommand(toolFile, [...args], RENEWAL_BOUND_MS);
    },
    now: Date.now,
  });
}
