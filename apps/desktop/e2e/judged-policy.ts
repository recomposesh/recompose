import type { Page } from '@playwright/test';
import type { RouteNode, VirtualModel } from '@recompose/contracts';

import { storedGateway } from './gateway-screen';
import { focusedGateway } from './scenario-memory';
import { seedVirtualModels } from './stored-virtual-models';

/** The words one branch is ruled by, named the way a scenario names them. */
export type BranchWording = { label: string; rule: string };

function ruledNode(node: RouteNode, wordings: readonly BranchWording[]): RouteNode {
  if (node.kind !== 'router' || node.policy.mode !== 'conditional') {
    return node;
  }

  return {
    ...node,
    policy: {
      ...node.policy,
      branches: node.policy.branches.map((branch) => ({
        ...branch,
        rule: wordings.find((wording) => wording.label === branch.label)?.rule ?? branch.rule,
      })),
    },
  };
}

function ruledModel(model: VirtualModel, wordings: readonly BranchWording[]): VirtualModel {
  return {
    ...model,
    routing: {
      ...model.routing,
      nodes: Object.fromEntries(
        Object.entries(model.routing.nodes).map(([id, node]) => [id, ruledNode(node, wordings)]),
      ),
    },
  };
}

/**
 * Rewrites what each named branch is ruled by, leaving every wire and account where it stands.
 *
 * @summary A scenario that opens by naming the rules its branches carry is describing the state it
 * starts from, so the rules are written through the lane the inspector writes on rather than by
 * standing a second router up. Every other branch keeps the rule it had, so a scenario names only
 * the words it means to pin.
 */
export async function theBranchesRuled(
  page: Page,
  wordings: readonly BranchWording[],
): Promise<void> {
  const gateway = focusedGateway(page);
  const { virtualModels } = await storedGateway(page, gateway);

  await seedVirtualModels(
    page,
    gateway,
    virtualModels.map((model) => ruledModel(model, wordings)),
  );
}
