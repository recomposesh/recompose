import { describe, expect, test } from 'vitest';

import { gateway, keyboardInAText, keyboardOnTheCanvas } from './canvas-wiring.testkit';
import { deletionWiring } from './deletion-gestures';
import { cable, card, worldOver } from './deletion-gestures.testkit';

const nothingSelected = { nodes: [], edges: [] };

describe('a Delete press with a card selected', () => {
  test('a virtual model card asks the removal question and takes nothing itself', async () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);

    await expect(
      deletionWiring(world).onBeforeDelete({ ...nothingSelected, nodes: [card('model:fast')] }),
    ).resolves.toBe(false);
    expect(record.asked).toEqual(['model:fast']);
  });

  test('the gateway and a draft ask the same way, because neither leaves unannounced', async () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);
    const wiring = deletionWiring(world);

    await wiring.onBeforeDelete({ ...nothingSelected, nodes: [card('gateway')] });
    await wiring.onBeforeDelete({ ...nothingSelected, nodes: [card('draft')] });

    expect(record.asked).toEqual(['gateway', 'draft']);
  });
});

describe('a Delete press with a route node card selected', () => {
  test('a child target card asks about that card rather than about its definition', async () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);

    await expect(
      deletionWiring(world).onBeforeDelete({
        ...nothingSelected,
        nodes: [card('target:pooled:t1')],
      }),
    ).resolves.toBe(false);
    expect(record.asked).toEqual(['target:pooled:t1']);
  });

  test('a router card asks about the router, which is the card that holds the ladder', async () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);

    await expect(
      deletionWiring(world).onBeforeDelete({ ...nothingSelected, nodes: [card('route:pooled')] }),
    ).resolves.toBe(false);
    expect(record.asked).toEqual(['route:pooled']);
  });

  test('a card naming no stored definition asks nothing and still takes nothing', async () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);

    await expect(
      deletionWiring(world).onBeforeDelete({ ...nothingSelected, nodes: [card('target:absent')] }),
    ).resolves.toBe(false);
    expect(record.asked).toEqual([]);
  });

  test('a card the canvas can name nothing about still keeps a cable beside it', async () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);

    await expect(
      deletionWiring(world).onBeforeDelete({
        nodes: [card('pending')],
        edges: [cable('cable:fast', 'model:fast', 'target:fast')],
      }),
    ).resolves.toBe(false);
    expect(record.released).toEqual([]);
  });
});

describe('a Delete press while a text field holds the keyboard', () => {
  test('a keystroke meant for a name asks nothing and takes no cable with it', async () => {
    keyboardInAText();

    const { world, record } = worldOver(gateway);

    await expect(
      deletionWiring(world).onBeforeDelete({
        ...nothingSelected,
        edges: [cable('cable:fast', 'model:fast', 'target:fast')],
      }),
    ).resolves.toBe(false);
    expect(record.asked).toEqual([]);
    expect(record.released).toEqual([]);
  });
});

describe('a Delete press with a cable selected', () => {
  test('a cable onto a definition one stored target passes straight through to the release', async () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);
    const cut = cable('cable:fast', 'model:fast', 'target:fast');

    await expect(
      deletionWiring(world).onBeforeDelete({ ...nothingSelected, edges: [cut] }),
    ).resolves.toEqual({ nodes: [], edges: [cut] });
    expect(record.asked).toEqual([]);
  });

  test('a cable below the entry asks about the child it holds rather than releasing it', async () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);

    await expect(
      deletionWiring(world).onBeforeDelete({
        ...nothingSelected,
        edges: [cable('cable:pooled:t1', 'route:pooled', 'target:pooled:t1')],
      }),
    ).resolves.toBe(false);
    expect(record.asked).toEqual(['target:pooled:t1']);
  });

  test('a cable onto a router asks about the router, since releasing it costs the ladder', async () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);

    await expect(
      deletionWiring(world).onBeforeDelete({
        ...nothingSelected,
        edges: [cable('cable:pooled', 'model:pooled', 'route:pooled')],
      }),
    ).resolves.toBe(false);
    expect(record.asked).toEqual(['route:pooled']);
  });
});

describe('a Delete press on a cable that binds nothing worth asking about', () => {
  test('a cable naming a definition that left the gateway asks nothing and destroys nothing', async () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);
    const cut = cable('cable:absent', 'model:absent', 'target:absent');

    await expect(
      deletionWiring(world).onBeforeDelete({ ...nothingSelected, edges: [cut] }),
    ).resolves.toEqual({ nodes: [], edges: [cut] });
    expect(record.asked).toEqual([]);
  });

  test('an overlay cable is no binding, so a press on one deletes nothing at all', async () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);

    await expect(
      deletionWiring(world).onBeforeDelete({
        ...nothingSelected,
        edges: [cable('wire:model:fast', 'gateway', 'model:fast')],
      }),
    ).resolves.toBe(false);
    expect(record.asked).toEqual([]);
  });
});

describe('the release a let-go cable writes', () => {
  test('a plain binding cable takes its own definition out of the gateway', () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);

    deletionWiring(world).onEdgesDelete([cable('cable:fast', 'model:fast', 'target:fast')]);

    expect(record.released).toHaveLength(1);
    expect(record.released[0]?.virtualModels.map((model) => model.id)).toEqual([
      'creative',
      'slow',
      'pooled',
    ]);
  });

  test('a child cable writes nothing, because releasing by its definition ate every sibling', () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);

    deletionWiring(world).onEdgesDelete([
      cable('cable:pooled:t1', 'route:pooled', 'target:pooled:t1'),
    ]);

    expect(record.released).toEqual([]);
  });

  test('a cable onto a router writes nothing, since the whole ladder stands below it', () => {
    keyboardOnTheCanvas();

    const { world, record } = worldOver(gateway);

    deletionWiring(world).onEdgesDelete([cable('cable:pooled', 'model:pooled', 'route:pooled')]);

    expect(record.released).toEqual([]);
  });
});
