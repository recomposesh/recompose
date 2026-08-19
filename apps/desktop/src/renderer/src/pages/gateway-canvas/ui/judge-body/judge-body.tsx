import type {
  Account,
  GatewayConfig,
  SubscriptionAccountView,
  VirtualModel,
} from '@recompose/contracts';
import type { ReactNode } from 'react';

import { nameOfRouter } from '@recompose/contracts';

import type { WalkedRouteNode } from '../../lib/route-graph';
import type { JudgeDirectiveProps } from '../judge-directive/judge-directive';

import { accountProductName } from '../../../../entities/account';
import { StatusChip } from '../../../../shared/ui';
import { conditionalIn } from '../../lib/conditional-policy';
import { walkedRouteNodes } from '../../lib/route-graph';
import { JudgeDirective } from '../judge-directive/judge-directive';
import { targetFacts } from '../subject-bodies/subject-bodies';
import { factRow, glyph, sectionHeading, subjectShell } from '../subject-shell/subject-shell';

/** What one judge answers with, and the router whose branches it decides. */
export type JudgeBinding = {
  /** The account paying for every classification, or nothing where it left the registry. */
  account: Account | undefined;
  /** The identity the policy stores for it, which a lost account is still known by. */
  accountId: string;
  /** The model the judge classifies with, which is what tells two judges apart. */
  providerModel: string;
  /** What the router it advises is called, in the words the canvas already showed. */
  advises: string;
  /** The router it advises, its branches, and the directive it hands the judge. */
  directing: JudgeDirectiveProps;
};

const JUDGE_NOTE =
  'Every request this router takes is classified here first. A refusal, a timeout, or a cooling judge sends the request down the else branch instead.';

/**
 * How the judge stands, which is the one health a canvas away from the engine can honestly read.
 *
 * @summary An account that left the registry is a judge that cannot answer, and the request it
 * would have decided lands on else from the first call, so a person needs to find it. Whether the
 * judge stands out of a cooldown is the engine's own reading and rides the satellite instead.
 */
function judgeHealth(account: Account | undefined): ReactNode {
  return account === undefined ? (
    <StatusChip tone="danger" word="Account left the registry" />
  ) : (
    <StatusChip tone="positive" word="Bound" />
  );
}

/**
 * The judge subject's body: what it classifies with, and the router whose branches it decides.
 *
 * @summary It carries no deletion, because a judge leaves through the router that named it rather
 * than off the canvas: taking the node away on its own would leave a policy pointing at nothing.
 */
export function judgeBody(
  judge: JudgeBinding,
  subscriptions: readonly SubscriptionAccountView[],
): ReactNode {
  const { account, accountId, providerModel, advises, directing } = judge;

  return subjectShell(
    {
      lead: glyph('search'),
      leadClasses: 'bg-router text-highlight-ink',
      kicker: 'Judge',
      name: account === undefined ? accountId : accountProductName(account),
    },
    <>
      {sectionHeading('General info')}
      <div className="field-box">
        {account === undefined ? null : targetFacts(account, subscriptions)}
        {factRow('Model', providerModel)}
        {factRow('Advises', advises)}
        {factRow('Standing', judgeHealth(account))}
      </div>
      <p className="mt-3.5 field-box px-3 py-2.5 text-detail text-ink-secondary">{JUDGE_NOTE}</p>
      <JudgeDirective
        branches={directing.branches}
        directive={directing.directive}
        gateway={directing.gateway}
        modelId={directing.modelId}
        routerId={directing.routerId}
      />
    </>,
  );
}

/** Everything outside one definition that a judge's body reads, which the drawer already holds. */
export type JudgeRegistry = {
  gateway: GatewayConfig;
  accounts: readonly Account[];
  subscriptions: readonly SubscriptionAccountView[];
};

function routerAdvised(model: VirtualModel, advises: string | undefined): string | undefined {
  const node = model.routing.nodes[advises ?? ''];

  return node?.kind === 'router' ? nameOfRouter(node.policy.mode, node.displayName) : undefined;
}

function judgeSeatIn(
  model: VirtualModel | undefined,
  routeNodeId: string | undefined,
): WalkedRouteNode | undefined {
  const walked = model === undefined ? [] : walkedRouteNodes(model.routing);

  return walked.find((held) => held.routeNodeId === routeNodeId && held.advises !== undefined);
}

function directingOf(
  gateway: GatewayConfig,
  model: VirtualModel,
  routerId: string,
): JudgeDirectiveProps | undefined {
  const policy = conditionalIn(model.routing.nodes[routerId]);

  if (policy === undefined) {
    return undefined;
  }

  return {
    gateway,
    modelId: model.id,
    routerId,
    branches: policy.branches,
    directive: policy.directive,
  };
}

function bindingOf(
  gateway: GatewayConfig,
  model: VirtualModel,
  walked: WalkedRouteNode,
  accounts: readonly Account[],
): JudgeBinding | undefined {
  const advises = routerAdvised(model, walked.advises);
  const directing = directingOf(gateway, model, walked.advises ?? '');

  if (walked.node.kind !== 'target' || advises === undefined || directing === undefined) {
    return undefined;
  }

  const { accountId, providerModel } = walked.node;
  const account = accounts.find((held) => held.id === accountId);

  return { account, accountId, providerModel, advises, directing };
}

/**
 * The judge's body read straight off the model that holds it, or nothing where no judge stands there.
 *
 * @summary The drawer asks here rather than assembling the binding itself, because which node is a
 * judge is the walk's own reading: a target the selection merely names would otherwise open the
 * judge's body while no policy classifies through it.
 */
export function judgeBodyIn(
  registry: JudgeRegistry,
  model: VirtualModel | undefined,
  routeNodeId: string | undefined,
): ReactNode | undefined {
  const walked = judgeSeatIn(model, routeNodeId);
  const binding =
    model === undefined || walked === undefined
      ? undefined
      : bindingOf(registry.gateway, model, walked, registry.accounts);

  return binding === undefined ? undefined : judgeBody(binding, registry.subscriptions);
}
