import type { Page } from '@playwright/test';
import type { RouterPolicy, VirtualModel } from '@recompose/contracts';

import { mintRouteNodeId } from '@recompose/contracts';

import type { ScriptedProvider } from './scripted-provider';

import { focusedGateway } from './scenario-memory';
import { accountLabeled } from './served-gateway';
import { theGatewayAScenarioActsOn } from './stored-target-accounts';
import { seedVirtualModels } from './stored-virtual-models';

/** Either mode a router ships with, named the way a scenario names it. */
export type RouterMode = RouterPolicy['mode'];

/**
 * One child a routers scenario names.
 *
 * @summary A child carries its own account, because a scenario about a pool losing one account has
 * to be able to take one away. It carries its own real model too, because both children reach one
 * origin under one dialect, so the model an attempt names is the only thing on the wire that says
 * which child made it.
 */
export type RoutedTarget = { account: string; providerModel: string };

export const FIRST_TARGET: RoutedTarget = { account: 'work', providerModel: 'claude-sonnet-5' };

export const SECOND_TARGET: RoutedTarget = { account: 'spare', providerModel: 'claude-haiku-5' };

/**
 * The child a scenario needs a rung below the second, which is what a ladder reads as one.
 *
 * @summary A pool of two proves a failover hand-off and nothing about order, because rank two is
 * also the last rung. A third child is what lets a move land somewhere that is neither end.
 */
export const THIRD_TARGET: RoutedTarget = { account: 'standby', providerModel: 'claude-opus-5' };

/** The vendor every routed account answers under, so one dialect reaches one stand-in path. */
const PROVIDER = 'anthropic';

/** Plainly nobody's, since a routers scenario stores an account rather than proving a key. */
const KEY_NOBODY_HOLDS = 'sk-ant-api03-not-a-real-key-7f2c';

async function accountStandsStored(page: Page, label: string): Promise<string> {
  const stored = await page.evaluate(async (asked) => window.recompose['accounts:connect'](asked), {
    provider: PROVIDER,
    kind: 'api-key' as const,
    label,
    secret: KEY_NOBODY_HOLDS,
  });

  if (!stored.ok) {
    throw new Error(`the app stored no account labeled "${label}": ${stored.error.message}`);
  }

  return accountLabeled(page, label);
}

/**
 * A virtual model whose routing is one router over these children, in declared order.
 *
 * @summary Every id is minted through the contracts rule rather than written here, so a stored
 * routing a scenario wrote and one the canvas wrote can never differ in format.
 */
function routedBinding(
  id: string,
  mode: RouterMode,
  children: readonly { accountId: string; providerModel: string }[],
): VirtualModel {
  const router = mintRouteNodeId();
  const seats = children.map((child) => ({ id: mintRouteNodeId(), ...child }));

  return {
    id,
    displayName: id,
    routing: {
      entry: router,
      nodes: {
        [router]: { kind: 'router', policy: { mode }, children: seats.map((seat) => seat.id) },
        ...Object.fromEntries(
          seats.map((seat) => [
            seat.id,
            {
              kind: 'target' as const,
              accountId: seat.accountId,
              providerModel: seat.providerModel,
            },
          ]),
        ),
      },
    },
  };
}

/**
 * The gateway a routers scenario acts on, holding one virtual model bound to a router.
 *
 * @summary Every child is armed to serve before the definition lands, so a scenario says only what
 * it means to change: a step that scripts a refusal overrides the arming for that one child, and
 * every other child answers the words a served turn carries. A scenario proving what a router does
 * before any attempt, such as one holding no child, passes an empty list and arms nothing.
 */
export async function aRoutedModelStands(
  page: Page,
  provider: ScriptedProvider,
  binding: { model: string; mode: RouterMode; targets: readonly RoutedTarget[] },
): Promise<void> {
  await theGatewayAScenarioActsOn(page);

  const children = [];

  for (const target of binding.targets) {
    provider.serves(target.providerModel);
    children.push({
      accountId: await accountStandsStored(page, target.account),
      providerModel: target.providerModel,
    });
  }

  await seedVirtualModels(page, focusedGateway(page), [
    routedBinding(binding.model, binding.mode, children),
  ]);
}
