import { beforeEach, describe, expect, test } from 'vitest';

import { canvasPositions } from '../../lib/canvas-position-store';
import { gateway } from './canvas-wiring.testkit';
import { canvasEnvironment, canvasLeftClean, worldWhereWritesLand } from './canvas-world.testkit';
import { completedChildPick, completedChildRebindPick } from './ladder-acts';
import {
  accounts,
  askOnTheStoredChild,
  CANVAS,
  ladderIn,
  looksAtBornCards,
  nodeWritten,
  routingWritten,
  targetCard,
} from './router-acts.testkit';

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(CANVAS);
});

describe("a picked account joining a router's ladder", () => {
  test('the child joins the end of the ladder rather than the front', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    completedChildPick(world, { modelId: 'pooled' }, 'g1', 'openai/gpt-5');

    const routing = routingWritten(record, 'pooled');
    const ladder = ladderIn(routing, 'r1');

    expect(ladder?.slice(0, 2)).toEqual(['t1', 't2']);
    expect(nodeWritten(routing, ladder?.[2])).toEqual({
      kind: 'target',
      accountId: 'g1',
      providerModel: 'openai/gpt-5',
    });
  });

  test('the binding is announced naming the pooled definition and the account picked', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    completedChildPick(world, { modelId: 'pooled' }, 'k1', 'claude-haiku-4-5');

    expect(record.announced).toEqual([{ kind: 'bound', virtualModel: 'Pooled', target: 'work' }]);
  });

  test('the target card stands exactly where the cable was let go', () => {
    const { world, record } = worldWhereWritesLand(gateway, {
      accounts,
      picker: {
        step: 'provider-model',
        from: 'route:pooled',
        accountId: 'k1',
        at: { x: 12, y: 34 },
        origin: 'drop',
      },
    });

    completedChildPick(world, { modelId: 'pooled' }, 'k1', 'claude-haiku-4-5');

    const born = ladderIn(routingWritten(record, 'pooled'), 'r1')?.[2];

    expect(canvasPositions(CANVAS)[`target:pooled:${String(born)}`]).toEqual({ x: 12, y: 34 });
  });

  test('a ladder under a definition that left the gateway takes no child', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    completedChildPick(world, { modelId: 'absent' }, 'k1', 'claude-haiku-4-5');

    expect(record.written).toEqual([]);
    expect(record.announced).toEqual([]);
  });
});

describe('a child of a ladder aimed at another account', () => {
  test('the child keeps the place it stood, so the pool is still tried in order', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    completedChildRebindPick(world, { modelId: 'pooled' }, 't1', 'g1', 'openai/gpt-5');

    const routing = routingWritten(record, 'pooled');

    expect(ladderIn(routing, 'r1')).toEqual(['t1', 't2']);
    expect(nodeWritten(routing, 't1')).toEqual({
      kind: 'target',
      accountId: 'g1',
      providerModel: 'openai/gpt-5',
    });
  });

  test('moving a binding along a ladder is announced as a rebinding', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    completedChildRebindPick(world, { modelId: 'pooled' }, 't1', 'g1', 'openai/gpt-5');

    expect(record.announced).toEqual([
      { kind: 'rebound', virtualModel: 'Pooled', target: 'spare' },
    ]);
  });

  test('a child under a definition that left the gateway is aimed nowhere', () => {
    const { world, record } = worldWhereWritesLand(gateway, { accounts });

    completedChildRebindPick(world, { modelId: 'absent' }, 't1', 'g1', 'openai/gpt-5');

    expect(record.written).toEqual([]);
    expect(record.announced).toEqual([]);
  });
});

describe('the card a moved child stands on', () => {
  test('a card already standing is not born again, so the canvas looks at nothing', () => {
    const looks = looksAtBornCards();
    const { world } = worldWhereWritesLand(gateway, {
      accounts,
      picker: askOnTheStoredChild,
      graph: { nodes: [targetCard('target:pooled:t1')], edges: [] },
    });

    completedChildRebindPick(world, { modelId: 'pooled' }, 't1', 'g1', 'openai/gpt-5');

    expect(looks).toEqual([]);
  });

  test('a card the canvas does not yet stand is born, so it looks at where that card lands', () => {
    const looks = looksAtBornCards();
    const { world } = worldWhereWritesLand(gateway, {
      accounts,
      picker: askOnTheStoredChild,
    });

    completedChildRebindPick(world, { modelId: 'pooled' }, 't1', 'g1', 'openai/gpt-5');

    expect(looks).toHaveLength(1);
  });
});
