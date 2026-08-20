import type { Page } from '@playwright/test';
import type { RouteNode, RouterPolicy, VirtualModel } from '@recompose/contracts';

import { storedGateway } from './gateway-screen';
import { focusedGateway } from './scenario-memory';
import { seedVirtualModels } from './stored-virtual-models';

/** The words one branch is ruled by, named the way a scenario names them. */
export type BranchWording = { label: string; rule: string };

type ConditionalPolicy = Extract<RouterPolicy, { mode: 'conditional' }>;

/** How one step means to change the stored conditional policy, leaving every wire where it is. */
type PolicyRewrite = (policy: ConditionalPolicy) => ConditionalPolicy;

function rewrittenNode(node: RouteNode, rewrite: PolicyRewrite): RouteNode {
  if (node.kind !== 'router' || node.policy.mode !== 'conditional') {
    return node;
  }

  return { ...node, policy: rewrite(node.policy) };
}

function rewrittenModel(model: VirtualModel, rewrite: PolicyRewrite): VirtualModel {
  return {
    ...model,
    routing: {
      ...model.routing,
      nodes: Object.fromEntries(
        Object.entries(model.routing.nodes).map(([id, node]) => [id, rewrittenNode(node, rewrite)]),
      ),
    },
  };
}

/**
 * Rewrites the stored conditional policy, leaving every wire and account where it stands.
 *
 * @summary A scenario that opens by naming what its router already carries is describing the state
 * it starts from, so the change is written through the lane the inspector writes on rather than by
 * standing a second router up. Only the policy moves, which is what keeps such a Given from
 * quietly rearranging the children a later step reads.
 */
async function theRouterRewritten(page: Page, rewrite: PolicyRewrite): Promise<void> {
  const gateway = focusedGateway(page);
  const { virtualModels } = await storedGateway(page, gateway);

  await seedVirtualModels(
    page,
    gateway,
    virtualModels.map((model) => rewrittenModel(model, rewrite)),
  );
}

/** Rewrites what each named branch is ruled by, so a scenario pins only the words it means to. */
export async function theBranchesRuled(
  page: Page,
  wordings: readonly BranchWording[],
): Promise<void> {
  await theRouterRewritten(page, (policy) => ({
    ...policy,
    branches: policy.branches.map((branch) => ({
      ...branch,
      rule: wordings.find((wording) => wording.label === branch.label)?.rule ?? branch.rule,
    })),
  }));
}

/** Turns the router's re-judge choice on, which is the standing choice a scenario names. */
export async function theRouterRejudgesEveryRequest(page: Page): Promise<void> {
  await theRouterRewritten(page, (policy) => ({ ...policy, rejudgeEveryRequest: true }));
}
