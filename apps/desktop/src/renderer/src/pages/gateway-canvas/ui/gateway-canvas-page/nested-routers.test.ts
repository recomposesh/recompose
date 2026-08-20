import type { Routing } from '@recompose/contracts';

import { gatewayConfigSchema, ROUTER_DEPTH_LIMIT } from '@recompose/contracts';
import { beforeEach, describe, expect, test } from 'vitest';

import type { PickerStanding } from './canvas-standings';
import type { PickerWalk } from './picker-on-canvas.testkit';

import { gateway } from './canvas-wiring.testkit';
import { canvasEnvironment, canvasLeftClean } from './canvas-world.testkit';
import {
  droppedAt,
  ladderUnder,
  routingOf,
  storedAccounts,
  walkedFrom,
} from './picker-on-canvas.testkit';
import { gatewayOfNestedRouters } from './router-acts.testkit';

const JUDGE_MODEL = 'claude-haiku-4-5';
const ELSE_MODEL = 'claude-opus-5';

const askedAtARoutersPort: PickerStanding = {
  step: 'kind',
  from: 'route:pooled',
  at: droppedAt,
  origin: 'drop',
};

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(gateway.slug);
});

function walkAnsweringTheKindWithARouter(
  seeded = gateway,
  opened = askedAtARoutersPort,
): PickerWalk {
  const walk = walkedFrom(seeded, opened, storedAccounts);

  walk.answers((asked) => {
    asked.onPickKind('router');
  });

  return walk;
}

function walkAnsweringTheModeWithConditional(): PickerWalk {
  const walk = walkAnsweringTheKindWithARouter();

  walk.answers((asked) => {
    asked.onPickRouterMode('conditional');
  });

  return walk;
}

function walkNamingTheJudge(): PickerWalk {
  const walk = walkAnsweringTheModeWithConditional();

  walk.answers((asked) => {
    asked.onPickAccount('k1');
  });
  walk.answers((asked) => {
    asked.onPickProviderModel(JUDGE_MODEL);
  });

  return walk;
}

function walkNamingTheElseBranch(): PickerWalk {
  const walk = walkNamingTheJudge();

  walk.answers((asked) => {
    asked.onPickAccount('l1');
  });
  walk.answers((asked) => {
    asked.onPickProviderModel(ELSE_MODEL);
  });

  return walk;
}

function lastChildOf(routing: Routing | undefined, routerId: string): string {
  const parent = routing?.nodes[routerId];

  return parent?.kind === 'router' ? (parent.children.at(-1) ?? '') : '';
}

/** The conditional router one walk nested, read as the table it joined and the policy it holds. */
function nestedConditionalIn(walk: PickerWalk) {
  const routing = routingOf(walk.written[0], 'pooled');
  const node = routing?.nodes[lastChildOf(routing, 'r1')];

  if (node?.kind !== 'router' || node.policy.mode !== 'conditional') {
    throw new Error('This scenario nests a conditional router, and none reached the document.');
  }

  return { routing, policy: node.policy, children: node.children };
}

describe("a cable let go from a router's own port", () => {
  test('picking the router asks how it spreads rather than nesting a mode nobody chose', () => {
    const walk = walkAnsweringTheKindWithARouter();

    expect(walk.written).toEqual([]);
    expect(walk.stage()).toEqual({ step: 'router-mode' });
  });

  test('answering the mode nests a router spreading exactly that way', () => {
    const walk = walkAnsweringTheKindWithARouter();

    walk.answers((asked) => {
      asked.onPickRouterMode('round-robin');
    });

    expect(ladderUnder(walk.written[0], 'pooled', 'r1')?.at(-1)).toEqual({
      kind: 'router',
      policy: { mode: 'round-robin' },
      children: [],
    });
  });

  test('the nesting is announced under the mode the person picked for it', () => {
    const walk = walkAnsweringTheKindWithARouter();

    walk.answers((asked) => {
      asked.onPickRouterMode('round-robin');
    });

    expect(walk.announced).toEqual([
      { kind: 'nested', virtualModel: 'Pooled', parentRouter: 'Failover', target: 'Round-robin' },
    ]);
  });
});

describe('where a nested router lands, and where no router can', () => {
  test('the mode is asked whatever the parent router already spreads by', () => {
    const walk = walkAnsweringTheKindWithARouter(gateway, {
      ...askedAtARoutersPort,
      from: 'route:pooled:r1',
    });

    expect(walk.stage()).toEqual({ step: 'router-mode' });
  });

  test('a router below the entry takes the child itself, rather than the entry taking it', () => {
    const walk = walkAnsweringTheKindWithARouter(gatewayOfNestedRouters(), {
      ...askedAtARoutersPort,
      from: 'route:deep:r2',
    });

    walk.answers((asked) => {
      asked.onPickRouterMode('failover');
    });

    expect(ladderUnder(walk.written[0], 'deep', 'r1')).toHaveLength(1);
    expect(ladderUnder(walk.written[0], 'deep', 'r2')).toEqual([
      { kind: 'router', policy: { mode: 'failover' }, children: [] },
    ]);
  });

  test('a port standing for a target rather than a router asks nothing and stores nothing', () => {
    const walk = walkAnsweringTheKindWithARouter(gateway, {
      ...askedAtARoutersPort,
      from: 'route:pooled:t1',
    });

    expect(walk.written).toEqual([]);
    expect(walk.stage()).toEqual({ step: 'kind' });
  });
});

describe('a nested router answering the mode with conditional', () => {
  test('the walk asks what reads the requests before it stores anything', () => {
    const walk = walkAnsweringTheModeWithConditional();

    expect(walk.written).toEqual([]);
    expect(walk.stage()).toEqual({ step: 'account', asks: 'judge' });
  });

  test("the judge's account carries on to the models that account judges with", () => {
    const walk = walkAnsweringTheModeWithConditional();

    walk.answers((asked) => {
      asked.onPickAccount('k1');
    });

    expect(walk.written).toEqual([]);
    expect(walk.stage()).toEqual({ step: 'provider-model', accountId: 'k1', asks: 'judge' });
  });

  test('a judge standing whole walks on to where everything no rule placed goes', () => {
    const walk = walkNamingTheJudge();

    expect(walk.written).toEqual([]);
    expect(walk.stage()).toEqual({ step: 'account', asks: 'else' });
  });

  test('the else account carries on to its own models, and still stores nothing', () => {
    const walk = walkNamingTheJudge();

    walk.answers((asked) => {
      asked.onPickAccount('l1');
    });

    expect(walk.written).toEqual([]);
    expect(walk.stage()).toEqual({ step: 'provider-model', accountId: 'l1', asks: 'else' });
  });
});

describe('a nested conditional router once its walk stands whole', () => {
  test('one conditional router joins the ladder, holding its else child alone', () => {
    const { policy, children } = nestedConditionalIn(walkNamingTheElseBranch());

    expect(policy.branches).toEqual([]);
    expect(children).toEqual([policy.elseChild]);
  });

  test('the judge and the else branch reach the accounts the walk named for each', () => {
    const { routing, policy } = nestedConditionalIn(walkNamingTheElseBranch());

    expect(routing?.nodes[policy.judge]).toEqual({
      kind: 'target',
      accountId: 'k1',
      providerModel: JUDGE_MODEL,
    });
    expect(routing?.nodes[policy.elseChild]).toEqual({
      kind: 'target',
      accountId: 'l1',
      providerModel: ELSE_MODEL,
    });
  });

  test('the walk stores a document the stored shape takes whole', () => {
    const walk = walkNamingTheElseBranch();

    expect(gatewayConfigSchema.safeParse(walk.written[0]).success).toBe(true);
  });

  test('the nesting is announced as a conditional router taking the child', () => {
    const walk = walkNamingTheElseBranch();

    expect(walk.announced).toEqual([
      { kind: 'nested', virtualModel: 'Pooled', parentRouter: 'Failover', target: 'Conditional' },
    ]);
  });
});

describe('a nest one router past the depth the stored shape allows', () => {
  test('the gesture writes it and leaves the refusal to the stored shape, guarding nothing itself', () => {
    const walk = walkAnsweringTheKindWithARouter(gatewayOfNestedRouters(ROUTER_DEPTH_LIMIT), {
      ...askedAtARoutersPort,
      from: `route:deep:r${String(ROUTER_DEPTH_LIMIT)}`,
    });

    walk.answers((asked) => {
      asked.onPickRouterMode('failover');
    });

    const refused = gatewayConfigSchema.safeParse(walk.written[0]);

    expect(refused.success).toBe(false);
    expect(refused.error?.issues.at(0)?.message).toMatch(
      new RegExp(`stands past ${String(ROUTER_DEPTH_LIMIT)} nested routers`, 'u'),
    );
  });
});
