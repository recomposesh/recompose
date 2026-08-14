import type { IpcRequest, SubscriptionAccount, SubscriptionProviderId } from '@recompose/contracts';

import { subscriptionPlanNames, toolBacked, type ToolBackedProviderId } from '@recompose/contracts';
import { randomUUID } from 'node:crypto';

import type { CredentialCustody, CustodyOutcome } from '../subscriptions/credential-custody';
import type { SubscriptionObservation } from '../subscriptions/subscription-standing';
import type { IpcHandlers } from './dispatch';
import type { Answered, SubscriptionsIpcContext, Workshop } from './subscriptions-workshop';

import { oneAtATime } from '../storage/one-at-a-time';
import { custodyOver } from '../subscriptions/credential-custody';
import { signInCommandFor } from '../subscriptions/subscription-commands';
import { subscriptionHomes } from '../subscriptions/subscription-homes';
import { awaitSignIn } from '../subscriptions/subscription-sign-in';
import { observeSubscription } from '../subscriptions/subscription-standing';
import { heldUnderTheAddress, isSubscription } from '../subscriptions/subscription-views';
import { reportTools } from '../subscriptions/tool-presence';
import { copilotHandlers } from './copilot-ipc';
import { storagePathsFor } from './storage-context';
import { ipcFailure, storageFailure } from './storage-envelope';
import {
  settleUnder,
  readAccounts,
  keepTheAccount,
  refusalFailure,
  toolPresent,
  viewsOf,
} from './subscriptions-workshop';

export type { SubscriptionsIpcContext };

export type SubscriptionsIpcHandlers = Pick<
  IpcHandlers,
  | 'subscriptions:list'
  | 'subscriptions:tools'
  | 'subscriptions:sign-in'
  | 'subscriptions:copilot-code'
  | 'subscriptions:copilot-await'
  | 'subscriptions:restore'
  | 'subscriptions:activate'
>;

type ToolRun = { landed: SubscriptionObservation | null; reclaimed: CustodyOutcome };

/**
 * @summary A launch that fails carries the one sentence worth reading, and on Linux it names every
 * terminal emulator that was tried. Anything else thrown here is still worth a line, because the
 * alternative is a wait with nothing behind it.
 */
function sentenceFor(cause: unknown): string {
  const said = cause instanceof Error ? cause.message.trim() : '';

  return said === '' ? 'recompose could not open a terminal for the sign-in.' : said;
}

/**
 * Runs the provider's tool against a home of its own and hands back what it left behind.
 *
 * @summary Nothing here touches the item the person's own install reads. A modern tool names its
 * keychain item after the home it was given, so a sign-in lands beside the person's login rather
 * than on top of it. An older tool writes the person's item instead, which is why the run snapshots
 * that item beforehand and, on a run that landed nothing, moves an unexpected write home and puts
 * the snapshot back.
 */
async function runTheTool(
  shop: Workshop,
  provider: ToolBackedProviderId,
  custody: CredentialCustody | null,
): Promise<ToolRun> {
  const snapshot = custody === null ? null : await custody.readMachineItem();
  const home = await shop.homes.resetPending(provider);
  const observe = async (): Promise<SubscriptionObservation> =>
    observeSubscription({
      provider,
      home,
      outsideCredential: custody === null ? null : async () => custody.readForHome(home),
    });

  await shop.ctx
    .launch(signInCommandFor({ provider, home, platform: shop.ctx.platform }))
    .catch((cause: unknown) => {
      shop.ctx.noteLaunchRefused(provider, sentenceFor(cause));
    });

  const landed = await awaitSignIn({
    observe,
    clock: shop.ctx.clock(),
    boundMs: shop.ctx.signInBoundMs,
    everyMs: shop.ctx.signInEveryMs,
  });

  return landed !== null || custody === null
    ? { landed, reclaimed: { ok: true } }
    : reclaimAnOldToolsWrite({ custody, home, snapshot, observe });
}

type Reclaim = {
  custody: CredentialCustody;
  home: string;
  snapshot: string | null;
  observe: () => Promise<SubscriptionObservation>;
};

/**
 * @summary An older tool writes the item the person's own install reads rather than one named
 * after the home it was given. Nothing landed where the poll watched, so an item that changed
 * under the run is that tool's work: it belongs to the home, and the person's login belongs back.
 */
async function reclaimAnOldToolsWrite(what: Reclaim): Promise<ToolRun> {
  if ((await what.custody.readMachineItem()) === what.snapshot) {
    return { landed: null, reclaimed: { ok: true } };
  }

  const reclaimed = await what.custody.reclaimMachineWrite(what.home, what.snapshot);

  if (!reclaimed.ok) {
    return { landed: null, reclaimed };
  }

  const observed = await what.observe();

  return { landed: observed.standing === 'connected' ? observed : null, reclaimed };
}

async function afterTheToolAnswers(
  shop: Workshop,
  provider: SubscriptionProviderId,
  existingId: string | null,
  custody: CredentialCustody | null,
  observed: SubscriptionObservation,
): Promise<Answered> {
  const held =
    existingId ??
    (await heldUnderTheAddress(
      shop.homes,
      await readAccounts(shop),
      provider,
      observed.signedInAs,
    ));
  const id = held ?? `acc-${randomUUID()}`;
  const pending = shop.homes.pendingHomeFor(provider);

  await shop.homes.promotePending(provider, id);

  const settled = await settleUnder(custody, pending, shop.homes.homeFor(provider, id));

  if (!settled.ok) {
    return refusalFailure(settled);
  }

  const label = observed.signedInAs ?? subscriptionPlanNames[provider];
  const kept = await keepTheAccount(shop, {
    id,
    provider,
    kind: 'subscription',
    label,
    provenance: 'sign-in',
  });

  return { ok: true, value: await viewsOf(shop, kept) };
}

async function signIn(
  shop: Workshop,
  provider: SubscriptionProviderId,
  existingId: string | null,
): Promise<Answered> {
  const toolName = subscriptionPlanNames[provider];

  if (!(await toolPresent(shop, provider))) {
    return ipcFailure(
      'tool-missing',
      `${toolName} is not installed on this machine, so no sign-in can begin.`,
    );
  }

  if (!toolBacked(provider)) {
    return ipcFailure(
      'tool-missing',
      `${toolName} signs in through recompose itself rather than through a tool.`,
    );
  }

  const custody = custodyOver(shop.ctx.custody, provider);
  const { landed, reclaimed } = await runTheTool(shop, provider, custody);

  if (!reclaimed.ok) {
    return refusalFailure(reclaimed);
  }

  if (landed === null) {
    return ipcFailure(
      'sign-in-timed-out',
      `${toolName} did not finish signing in before recompose stopped waiting.`,
    );
  }

  return afterTheToolAnswers(shop, provider, existingId, custody, landed);
}

async function heldSubscription(shop: Workshop, id: string): Promise<SubscriptionAccount | null> {
  const accounts = await readAccounts(shop);
  const row = accounts.accounts.find((candidate) => candidate.id === id);

  return row !== undefined && isSubscription(row) ? row : null;
}

async function activate(shop: Workshop, id: string): Promise<Answered> {
  const row = await heldSubscription(shop, id);

  if (row === null) {
    return ipcFailure('storage-failed', `no subscription account is held under ${id}.`);
  }

  await shop.homes.pointActiveAt(row.provider, id);

  return { ok: true, value: await viewsOf(shop, await readAccounts(shop)) };
}

async function restore(shop: Workshop, id: string): Promise<Answered> {
  const row = await heldSubscription(shop, id);

  if (row === null) {
    return ipcFailure('storage-failed', `no subscription account is held under ${id}.`);
  }

  return signIn(shop, row.provider, id);
}

export function createSubscriptionsIpcHandlers(
  ctx: SubscriptionsIpcContext,
): SubscriptionsIpcHandlers {
  const shop: Workshop = {
    ctx,
    homes: subscriptionHomes(ctx.userDataPath, ctx.platform),
    accountsFile: storagePathsFor(ctx.userDataPath).accountsFile,
  };
  /**
   * The lane the writers queue in, which the readers stay out of.
   *
   * @summary A sign-in holds the lane for as long as somebody takes to finish in a browser, so a
   * read that queued behind it would leave the screen blank for minutes. The accounts file is
   * written whole, so a read alongside a write sees one version or the other, never half of each.
   */
  const inTurn = oneAtATime();

  const guarded = (work: () => Promise<Answered>) => async (): Promise<Answered> => {
    try {
      return await work();
    } catch (error) {
      return storageFailure(error, ctx.homeFolder);
    }
  };

  return {
    'subscriptions:list': guarded(async () => ({
      ok: true,
      value: await viewsOf(shop, await readAccounts(shop)),
    })),

    'subscriptions:tools': async () => {
      try {
        return {
          ok: true as const,
          value: await reportTools({
            homes: shop.homes,
            searchPath: await ctx.searchPath(),
            platform: ctx.platform,
          }),
        };
      } catch (error) {
        return storageFailure(error, ctx.homeFolder);
      }
    },

    'subscriptions:sign-in': async (request: IpcRequest<'subscriptions:sign-in'>) =>
      inTurn(guarded(async () => signIn(shop, request.provider, null))),

    ...copilotHandlers(shop, inTurn, guarded),

    'subscriptions:restore': async (request: IpcRequest<'subscriptions:restore'>) =>
      inTurn(guarded(async () => restore(shop, request.id))),

    'subscriptions:activate': async (request: IpcRequest<'subscriptions:activate'>) =>
      inTurn(guarded(async () => activate(shop, request.id))),
  };
}
