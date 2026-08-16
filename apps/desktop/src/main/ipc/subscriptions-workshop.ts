import type {
  AccountsDocument,
  SubscriptionAccount,
  SubscriptionAccountView,
  SubscriptionProviderId,
} from '@recompose/contracts';

import type { AntigravitySignInPort } from '../subscriptions/antigravity-sign-in';
import type { CredentialCustody, CustodyOutcome } from '../subscriptions/credential-custody';
import type { DeviceSignInPort } from '../subscriptions/device-sign-in-port';
import type { MachineReach } from '../subscriptions/machine-store';
import type { SignInLaunch } from '../subscriptions/sign-in-launch';
import type { SubscriptionHomes } from '../subscriptions/subscription-homes';
import type { Clock } from '../subscriptions/subscription-sign-in';

import { amendAccountsFile, loadAccountsFile } from '../storage/accounts-store';
import { subscriptionViews } from '../subscriptions/subscription-views';
import { reportTools } from '../subscriptions/tool-presence';
import { ipcFailure } from './storage-envelope';

export type SubscriptionsIpcContext = {
  userDataPath: string;
  /** The home directory this process runs under, so no account name reaches the screen. */
  homeFolder: string;
  platform: NodeJS.Platform;
  /** Only macOS keeps the Claude Code credential outside the config home, so elsewhere this is absent. */
  custody: CredentialCustody | null;
  /** How every reader reaches the stores the providers' own tools wrote. */
  machine: MachineReach;
  searchPath: () => Promise<string>;
  launch: SignInLaunch;
  clock: () => Clock;
  signInBoundMs: number;
  signInEveryMs: number;
  onCorrupt: (quarantinedPath: string) => void;
  /** How every plan that shows a person a code reaches its provider, its clock, and its own pace. */
  deviceSignIn: DeviceSignInPort;
  /** How the one plan that redirects a browser opens the page and hears the redirect back. */
  browserSignIn: AntigravitySignInPort;
  /**
   * Asks the far end which address one Claude access token signed in as.
   *
   * @summary A tool the app pointed at its own config home writes no address anywhere on this
   * machine, so the only way to name that account is to ask. It answers with nothing where the
   * ask could not be made, which leaves the account named by its plan instead.
   */
  claudeAddress: (accessToken: string) => Promise<string | undefined>;
  /**
   * @summary A launch that never opened a terminal leaves the wait running, because the command
   * stays on screen for a person to run by hand. This is how they learn nothing opened.
   */
  noteLaunchRefused: (provider: SubscriptionProviderId, note: string) => void;
  /** Keeps the credential a sign-in yielded, under the account it was yielded for. */
  writeSubscriptionCredential: (
    provider: SubscriptionProviderId,
    accountId: string,
    blob: string,
  ) => Promise<void>;
};

export type Answered =
  | { ok: true; value: SubscriptionAccountView[] }
  | ReturnType<typeof ipcFailure>;

/** The bench every subscription handler works over: the context, the homes, and the accounts file. */
export type Workshop = {
  ctx: SubscriptionsIpcContext;
  homes: SubscriptionHomes;
  accountsFile: string;
};

export function refusalFailure(outcome: CustodyOutcome & { ok: false }) {
  return ipcFailure(outcome.code, outcome.message);
}

export async function readAccounts(shop: Workshop): Promise<AccountsDocument> {
  return loadAccountsFile(shop.accountsFile, shop.ctx.onCorrupt);
}

export async function viewsOf(
  shop: Workshop,
  accounts: AccountsDocument,
): Promise<SubscriptionAccountView[]> {
  return subscriptionViews(
    { homes: shop.homes, custody: shop.ctx.custody, machine: shop.ctx.machine },
    accounts,
  );
}

export async function toolPresent(
  shop: Workshop,
  provider: SubscriptionProviderId,
): Promise<boolean> {
  const tools = await reportTools({
    homes: shop.homes,
    searchPath: await shop.ctx.searchPath(),
    platform: shop.ctx.platform,
  });

  return tools.find((tool) => tool.provider === provider)?.present === true;
}

export async function settleUnder(
  custody: CredentialCustody | null,
  from: string,
  to: string,
): Promise<CustodyOutcome> {
  return custody === null ? { ok: true } : custody.moveBetweenHomes(from, to);
}

/**
 * @summary One account row, written whole over any row already standing under its id, so a
 * sign-in and an adoption of the same address settle on one account rather than two.
 */
export async function recordTheAccount(
  shop: Workshop,
  row: SubscriptionAccount,
): Promise<AccountsDocument> {
  return amendAccountsFile(shop.accountsFile, shop.ctx.onCorrupt, (accounts) => ({
    ...accounts,
    accounts: [...accounts.accounts.filter((one) => one.id !== row.id), row],
  }));
}

/**
 * Records one signed-in account and points its provider at it.
 *
 * @summary Every sign-in ends the same way whoever ran it, so the last two steps stand here
 * rather than once per flow.
 */
export async function keepTheAccount(
  shop: Workshop,
  row: SubscriptionAccount,
): Promise<AccountsDocument> {
  const updated = await recordTheAccount(shop, row);

  await shop.homes.pointActiveAt(row.provider, row.id);

  return updated;
}
