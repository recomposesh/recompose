import type { Routing } from '@recompose/contracts';

import { gatewayConfigSchema } from '@recompose/contracts';
import { beforeEach, describe, expect, test } from 'vitest';

import type { PickerStanding } from './canvas-standings';
import type { PickerWalk } from './picker-on-canvas.testkit';

import { heldDraft } from '../../lib/use-held-draft';
import { gateway } from './canvas-wiring.testkit';
import { canvasEnvironment, canvasLeftClean, draftHeld } from './canvas-world.testkit';
import { droppedAt, routingOf, storedAccounts, walkedFrom } from './picker-on-canvas.testkit';
import { CANVAS, modeIn } from './router-acts.testkit';

const JUDGE_MODEL = 'claude-haiku-4-5';

const ELSE_MODEL = 'claude-opus-5';

const askedAtTheDraft: PickerStanding = {
  step: 'kind',
  from: 'draft',
  at: droppedAt,
  origin: 'drop',
};

const askedAtABoundModel: PickerStanding = {
  step: 'kind',
  from: 'model:fast',
  at: droppedAt,
  origin: 'drop',
};

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(CANVAS);
});

function aDraftNamedSteady(): void {
  draftHeld(CANVAS, { displayName: 'Steady', id: 'steady', accountId: '', providerModel: '' });
}

function walkPickingARouter(opened: PickerStanding): PickerWalk {
  const walk = walkedFrom(gateway, opened, storedAccounts);

  walk.answers((asked) => {
    asked.onPickKind('router');
  });

  return walk;
}

function walkAnsweringTheMode(
  opened: PickerStanding,
  mode: 'conditional' | 'round-robin',
): PickerWalk {
  const walk = walkPickingARouter(opened);

  walk.answers((asked) => {
    asked.onPickRouterMode(mode);
  });

  return walk;
}

function walkNamingJudgeAndElse(opened: PickerStanding): PickerWalk {
  const walk = walkAnsweringTheMode(opened, 'conditional');

  walk.answers((asked) => {
    asked.onPickAccount('k1');
  });
  walk.answers((asked) => {
    asked.onPickProviderModel(JUDGE_MODEL);
  });
  walk.answers((asked) => {
    asked.onPickAccount('l1');
  });
  walk.answers((asked) => {
    asked.onPickProviderModel(ELSE_MODEL);
  });

  return walk;
}

function conditionalPolicyIn(routing: Routing) {
  const node = routing.nodes[routing.entry];

  return node?.kind === 'router' && node.policy.mode === 'conditional' ? node.policy : undefined;
}

function conditionalBornIn(walk: PickerWalk, modelId: string) {
  const routing: Routing | undefined = routingOf(walk.written[0], modelId);
  const policy = routing === undefined ? undefined : conditionalPolicyIn(routing);

  if (routing === undefined || policy === undefined) {
    throw new Error('This scenario births a conditional router, and none reached the document.');
  }

  return { routing, policy };
}

describe('a cable let go from the held draft', () => {
  test('picking the router asks how it spreads rather than defining a mode nobody chose', () => {
    aDraftNamedSteady();

    const walk = walkPickingARouter(askedAtTheDraft);

    expect(walk.written).toEqual([]);
    expect(walk.stage()).toEqual({ step: 'router-mode' });
  });

  test('answering the mode defines the model routing through exactly that router', () => {
    aDraftNamedSteady();

    const walk = walkAnsweringTheMode(askedAtTheDraft, 'round-robin');
    const routing = routingOf(walk.written[0], 'steady');

    expect(modeIn(routing, routing?.entry)).toBe('round-robin');
  });

  test('the definition is announced under the mode the person picked for it', () => {
    aDraftNamedSteady();

    const walk = walkAnsweringTheMode(askedAtTheDraft, 'round-robin');

    expect(walk.announced).toEqual([
      { kind: 'bound', virtualModel: 'Steady', target: 'Round-robin' },
    ]);
  });

  test('a draft nobody named yet keeps the mode it answered, so the drawer never asks twice', () => {
    draftHeld(CANVAS, { displayName: '', id: '', accountId: '', providerModel: '' });

    walkAnsweringTheMode(askedAtTheDraft, 'round-robin');

    expect(heldDraft(CANVAS)?.definition.routerMode).toBe('round-robin');
  });
});

describe('a conditional definition born from the held draft', () => {
  test('the walk asks its judge and its else branch before storing anything', () => {
    aDraftNamedSteady();

    const walk = walkAnsweringTheMode(askedAtTheDraft, 'conditional');

    expect(walk.written).toEqual([]);
    expect(walk.stage()).toEqual({ step: 'account', asks: 'judge' });
  });

  test('the conditional definition reaches the judge and the else branch the walk named', () => {
    aDraftNamedSteady();

    const { routing, policy } = conditionalBornIn(
      walkNamingJudgeAndElse(askedAtTheDraft),
      'steady',
    );

    expect(routing.nodes[policy.judge]).toEqual({
      kind: 'target',
      accountId: 'k1',
      providerModel: JUDGE_MODEL,
    });
    expect(routing.nodes[policy.elseChild]).toEqual({
      kind: 'target',
      accountId: 'l1',
      providerModel: ELSE_MODEL,
    });
  });

  test('the conditional draft stores a document the stored shape takes whole', () => {
    aDraftNamedSteady();

    const walk = walkNamingJudgeAndElse(askedAtTheDraft);

    expect(gatewayConfigSchema.safeParse(walk.written[0]).success).toBe(true);
  });
});

describe('a cable let go from a bound definition', () => {
  test('picking the router asks the mode rather than rebinding onto a failover nobody chose', () => {
    const walk = walkPickingARouter(askedAtABoundModel);

    expect(walk.written).toEqual([]);
    expect(walk.stage()).toEqual({ step: 'router-mode' });
  });

  test('answering the mode rebinds the definition onto exactly that router', () => {
    const walk = walkAnsweringTheMode(askedAtABoundModel, 'round-robin');
    const routing = routingOf(walk.written[0], 'fast');

    expect(modeIn(routing, routing?.entry)).toBe('round-robin');
  });

  test('the rebinding is announced under the mode the person picked for it', () => {
    const walk = walkAnsweringTheMode(askedAtABoundModel, 'round-robin');

    expect(walk.announced).toEqual([
      { kind: 'rebound', virtualModel: 'Fast', target: 'Round-robin' },
    ]);
  });

  test('a conditional rebinding walks its judge and its else branch before storing anything', () => {
    const walk = walkAnsweringTheMode(askedAtABoundModel, 'conditional');

    expect(walk.written).toEqual([]);
    expect(walk.stage()).toEqual({ step: 'account', asks: 'judge' });
  });

  test('what the definition already reached stays under the router that took its place', () => {
    const { routing, policy } = conditionalBornIn(
      walkNamingJudgeAndElse(askedAtABoundModel),
      'fast',
    );
    const kept = routing.nodes['node-fast'];

    expect(kept).toEqual({ kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' });
    expect(policy.elseChild).not.toBe('node-fast');
  });

  test('the conditional rebinding stores a document the stored shape takes whole', () => {
    const walk = walkNamingJudgeAndElse(askedAtABoundModel);

    expect(gatewayConfigSchema.safeParse(walk.written[0]).success).toBe(true);
  });
});
