import type { IpcRequest, SubscriptionAccount, SubscriptionProviderId } from '@recompose/contracts';

import { subscriptionPlanNames, toolBacked } from '@recompose/contracts';

import type { IpcHandlers } from './dispatch';
import type { Answered, SubscriptionsIpcContext, Workshop } from './subscriptions-workshop';

import { oneAtATime } from '../storage/one-at-a-time';
import { custodyOver } from '../subscriptions/credential-custody';
import { subscriptionHomes } from '../subscriptions/subscription-homes';
import { isSubscription } from '../subscriptions/subscription-views';
import { reportTools } from '../subscriptions/tool-presence';
import { appSignInHandlers } from './app-sign-in-ipc';
import { storagePathsFor } from './storage-context';
import { ipcFailure, storageFailure } from './storage-envelope';
import { readAccounts, refusalFailure, toolPresent, viewsOf } from './subscriptions-workshop';
import { afterTheToolAnswers, runTheTool } from './tool-run-sign-in';

export type { SubscriptionsIpcContext };

export type SubscriptionsIpcHandlers = Pick<
  IpcHandlers,
  | 'subscriptions:list'
  | 'subscriptions:tools'
  | 'subscriptions:sign-in'
  | 'subscriptions:device-code'
  | 'subscriptions:device-await'
  | 'subscriptions:browser-sign-in'
  | 'subscriptions:restore'
  | 'subscriptions:activate'
>;

async function signIn(
  shop: Workshop,
  provider: SubscriptionProviderId,
  existingId: string | null,
): Promise<Answered> {
  const toolName = subscriptionPlanNames[provider];

  if (!toolBacked(provider)) {
    return ipcFailure(
      'tool-missing',
      `${toolName} signs in through recompose itself rather than through a tool.`,
    );
  }

  if (!(await toolPresent(shop, provider))) {
    return ipcFailure(
      'tool-missing',
      `${toolName} is not installed on this machine, so no sign-in can begin.`,
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

/**
 * Makes one account the plan's chosen one, which is the one its own tool reaches.
 *
 * @summary A gateway spends whichever account its canvas names, so this moves no traffic. It moves
 * the config home the plan's tool runs against, which is why a plan with no such tool refuses it:
 * pointing nothing at nothing would leave a person told an account is chosen while every tool on
 * the machine carries on reaching the same one as before.
 */
async function activate(shop: Workshop, id: string): Promise<Answered> {
  const row = await heldSubscription(shop, id);

  if (row === null) {
    return ipcFailure('storage-failed', `no subscription account is held under ${id}.`);
  }

  if (!toolBacked(row.provider)) {
    return ipcFailure(
      'tool-missing',
      `${subscriptionPlanNames[row.provider]} has no tool to point at an account, so choosing one changes nothing.`,
    );
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

    ...appSignInHandlers(shop, inTurn, guarded),

    'subscriptions:restore': async (request: IpcRequest<'subscriptions:restore'>) =>
      inTurn(guarded(async () => restore(shop, request.id))),

    'subscriptions:activate': async (request: IpcRequest<'subscriptions:activate'>) =>
      inTurn(guarded(async () => activate(shop, request.id))),
  };
}
