import type { Page } from '@playwright/test';
import type { RouteNode, VirtualModel } from '@recompose/contracts';

import { mintRouteNodeId } from '@recompose/contracts';

import type { JudgeStub } from './judge-stub';
import type { RoutedTarget } from './routed-gateway';
import type { ScriptedProvider } from './scripted-provider';

import { accountStandsStored, FIRST_TARGET, SECOND_TARGET, THIRD_TARGET } from './routed-gateway';
import { focusedGateway } from './scenario-memory';
import { accountLabeled } from './served-gateway';
import { theGatewayAScenarioActsOn } from './stored-target-accounts';
import { seedVirtualModels } from './stored-virtual-models';

/** One branch a scenario names: the two words that write the judge's vocabulary, and its child. */
export type JudgedBranch = { label: string; rule: string; target: RoutedTarget };

export const CODE_BRANCH: JudgedBranch = {
  label: 'code',
  rule: 'questions about source code',
  target: FIRST_TARGET,
};

export const CHAT_BRANCH: JudgedBranch = {
  label: 'chat',
  rule: 'everyday conversation',
  target: SECOND_TARGET,
};

/** The child every routing trouble lands on, which no branch names and no edit removes. */
export const ELSE_TARGET = THIRD_TARGET;

/** The judge's own binding, standing apart from every child in both account and model. */
export const JUDGE_TARGET: RoutedTarget = { account: 'referee', providerModel: 'qwen3-4b' };

/** Every child a judged router holds, so a step can arm or refuse one by the model it serves. */
export const JUDGED_CHILDREN: readonly RoutedTarget[] = [
  CODE_BRANCH.target,
  CHAT_BRANCH.target,
  ELSE_TARGET,
];

/**
 * The real model the child behind one named branch serves.
 *
 * @summary Every child reaches one origin under one dialect, so the model an attempt names is the
 * only thing on the wire that says which branch a request actually went down. One reading serves
 * every step that has to name a child by the branch above it.
 */
export function childBehindTheBranch(label: string): string {
  const branch = [CODE_BRANCH, CHAT_BRANCH].find((named) => named.label === label);

  if (branch === undefined) {
    throw new Error(`these scenarios hold no branch labeled "${label}"`);
  }

  return branch.target.providerModel;
}

/**
 * Puts both stand-ins back where the arrangement left them, after a scenario's opening turns.
 *
 * @summary A scenario that has to cool something first pays for it in calls the stand-ins remember,
 * and a step counting classification calls would then count the opening's as well. The cooling
 * itself survives, because it lives in the gateway's own ledger rather than in either stand-in,
 * which is exactly the state such a scenario meant to arrange.
 */
export function theStandInsForgetTheOpening(stands: {
  provider: ScriptedProvider;
  judge: JudgeStub;
}): void {
  stands.provider.forgets();

  for (const child of JUDGED_CHILDREN) {
    stands.provider.serves(child.providerModel);
  }

  stands.judge.forgets();
}

/**
 * How long every judged router in these scenarios gives its judge.
 *
 * @summary One budget serves both kinds of scenario, which is what keeps a scenario about the
 * timeout from having to rewrite a stored policy before it can run out. It is long enough that a
 * loopback judge answering at once never trips it on a loaded machine, and short enough that a
 * judge holding its connection is cut off well inside one scenario's own patience.
 */
export const JUDGE_BUDGET_MS = 2_000;

/** One child of the router, wired and stored, holding the node id the policy names it by. */
type BoundChild = { id: string; accountId: string; providerModel: string };

/** What a scenario asks a conditional router to stand as, where it differs from the plain one. */
export type JudgedArrangement = {
  model: string;
  branches?: readonly JudgedBranch[];
};

async function childStandsStored(
  page: Page,
  provider: ScriptedProvider,
  target: RoutedTarget,
): Promise<BoundChild> {
  provider.serves(target.providerModel);

  return {
    id: mintRouteNodeId(),
    accountId: await accountStandsStored(page, target.account),
    providerModel: target.providerModel,
  };
}

/**
 * The judge's binding, addressed at its own port rather than at the origin every child shares.
 *
 * @summary A server a person addressed themselves is spent at the address they gave, and nothing
 * redirects it: the stand-in origin the launch names reaches only the vendors, and the runtime
 * origin the launch names reaches only a health look. That is what puts the classification call on
 * a different wire from the served request, so a scenario can say no classification call left the
 * machine and mean it. A judge bound this way is also a shipped arrangement rather than a test-only
 * one, because a runtime a person addressed themselves classifies exactly as a keyed account does.
 */
async function judgeStandsStored(page: Page, judge: JudgeStub): Promise<BoundChild> {
  const stored = await page.evaluate(
    async (asked) => window.recompose['accounts:connect-local'](asked),
    {
      runtime: 'custom' as const,
      port: Number(new URL(judge.origin).port),
      label: JUDGE_TARGET.account,
    },
  );

  if (!stored.ok) {
    throw new Error(`the app stored no judge at ${judge.origin}: ${stored.error.message}`);
  }

  return {
    id: mintRouteNodeId(),
    accountId: await accountLabeled(page, JUDGE_TARGET.account),
    providerModel: JUDGE_TARGET.providerModel,
  };
}

function targetNodes(bound: readonly BoundChild[]): Record<string, RouteNode> {
  return Object.fromEntries(
    bound.map((child) => [
      child.id,
      { kind: 'target' as const, accountId: child.accountId, providerModel: child.providerModel },
    ]),
  );
}

type JudgedWiring = {
  wired: readonly { branch: JudgedBranch; child: BoundChild }[];
  elseChild: BoundChild;
  judge: BoundChild;
};

async function wiringOf(
  page: Page,
  stands: { provider: ScriptedProvider; judge: JudgeStub },
  arrangement: JudgedArrangement,
): Promise<JudgedWiring> {
  const wired: { branch: JudgedBranch; child: BoundChild }[] = [];

  for (const branch of arrangement.branches ?? [CODE_BRANCH, CHAT_BRANCH]) {
    wired.push({ branch, child: await childStandsStored(page, stands.provider, branch.target) });
  }

  return {
    wired,
    elseChild: await childStandsStored(page, stands.provider, ELSE_TARGET),
    judge: await judgeStandsStored(page, stands.judge),
  };
}

function judgedBinding(arrangement: JudgedArrangement, wiring: JudgedWiring): VirtualModel {
  const router = mintRouteNodeId();
  const children = [...wiring.wired.map((one) => one.child), wiring.elseChild];

  return {
    id: arrangement.model,
    displayName: arrangement.model,
    routing: {
      entry: router,
      nodes: {
        [router]: {
          kind: 'router',
          policy: {
            mode: 'conditional',
            judge: wiring.judge.id,
            branches: wiring.wired.map((one) => ({
              label: one.branch.label,
              rule: one.branch.rule,
              child: one.child.id,
            })),
            elseChild: wiring.elseChild.id,
            judgeBoundMs: JUDGE_BUDGET_MS,
            rejudgeEveryRequest: false,
          },
          children: children.map((child) => child.id),
        },
        ...targetNodes([...children, wiring.judge]),
      },
    },
  };
}

/**
 * The gateway a conditional scenario acts on, holding one virtual model over a judged router.
 *
 * @summary Every child is armed to serve before the definition lands, the way a plain routed model
 * arranges its ladder, so a scenario says only what it means to change. The judge stands beside them
 * rather than among them: it is a node of the table the policy names, never one of the router's
 * children, which is what keeps it off every walk, every refusal, and every traffic row.
 */
export async function aJudgedModelStands(
  page: Page,
  stands: { provider: ScriptedProvider; judge: JudgeStub },
  arrangement: JudgedArrangement,
): Promise<void> {
  await theGatewayAScenarioActsOn(page);

  const wiring = await wiringOf(page, stands, arrangement);

  await seedVirtualModels(page, focusedGateway(page), [judgedBinding(arrangement, wiring)]);
}
