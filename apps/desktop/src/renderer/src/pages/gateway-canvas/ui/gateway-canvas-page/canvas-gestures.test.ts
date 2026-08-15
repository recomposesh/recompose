import type { Handle, OnConnectEnd } from '@xyflow/react';

import { Position } from '@xyflow/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { XY } from '../../lib/canvas-positions';

import { closeInspector, inspectorOpen, toggleInspector } from '../../../../shared/lib';
import { heldDraft } from '../../lib/use-held-draft';
import { flowWiring } from './canvas-gestures';
import { gateway, pulled } from './canvas-wiring.testkit';
import { canvasEnvironment, canvasLeftClean, worldWhereWritesHang } from './canvas-world.testkit';

type CableLetGo = Extract<Parameters<OnConnectEnd>[1], { to: XY }>;

const RELEASED_AT = { x: 448, y: 348 };
const UNDER_THE_POINTER = { x: 400, y: 256 };
const REFUSED_LANDING =
  'A cable binds a virtual model or a router to a stored target it does not already hold, and nothing else connects.';

function port(nodeId: string): Handle {
  return { nodeId, type: 'source', position: Position.Right, x: 0, y: 0, width: 8, height: 8 };
}

function letGoAt(from: string, at: XY): CableLetGo {
  const card = { id: from, position: { x: 0, y: 0 }, data: {} };
  const internals = { positionAbsolute: card.position, z: 0, userNode: card };

  return {
    isValid: false,
    from: card.position,
    fromHandle: port(from),
    fromPosition: Position.Right,
    fromNode: { ...card, measured: {}, internals },
    to: at,
    toHandle: null,
    toPosition: null,
    toNode: null,
    pointer: at,
  };
}

function letGoOnAHandle(from: string): CableLetGo {
  return { ...letGoAt(from, RELEASED_AT), toHandle: port('target:creative') };
}

function letGoNowhere(): Parameters<OnConnectEnd>[1] {
  return {
    isValid: null,
    from: null,
    fromHandle: null,
    fromPosition: null,
    fromNode: null,
    to: null,
    toHandle: null,
    toPosition: null,
    toNode: null,
    pointer: null,
  };
}

function letGoOnOpenCanvasFrom(from: string) {
  const held = worldWhereWritesHang(gateway);

  held.world.dragging.current.inFlight = true;
  flowWiring(held.world).onConnectEnd(new MouseEvent('mouseup'), letGoAt(from, RELEASED_AT));

  return held;
}

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(gateway.slug);
  closeInspector();
  vi.stubGlobal('MouseEvent', class {});
});

describe('a cable let go where nothing can come of it', () => {
  test('a drag Escape already threw away lands nothing and forgets the escape', () => {
    const { world } = worldWhereWritesHang(gateway);

    world.dragging.current = { inFlight: true, escaped: true };
    flowWiring(world).onConnectEnd(new MouseEvent('mouseup'), letGoAt('gateway', RELEASED_AT));

    expect(heldDraft(gateway.slug)).toBeUndefined();
    expect(world.dragging.current).toEqual({ inFlight: false, escaped: false });
  });

  test('a cable that truly landed opens nothing, because the connection answers it', () => {
    const { world, record } = worldWhereWritesHang(gateway);

    flowWiring(world).onConnectEnd(new MouseEvent('mouseup'), {
      ...letGoOnAHandle('model:fast'),
      isValid: true,
    });

    expect(record.announced).toEqual([]);
    expect(record.pickers).toEqual([]);
  });

  test('a cable the pointer let go nowhere in particular lands nothing', () => {
    const { world, record } = worldWhereWritesHang(gateway);

    flowWiring(world).onConnectEnd(new MouseEvent('mouseup'), letGoNowhere());

    expect(record.announced).toEqual([]);
    expect(record.pickers).toEqual([]);
  });

  test('a cable let go on a handle rather than open canvas is refused out loud', () => {
    const { world, record } = worldWhereWritesHang(gateway);

    flowWiring(world).onConnectEnd(new MouseEvent('mouseup'), letGoOnAHandle('model:fast'));

    expect(record.announced).toEqual([{ kind: 'refused', refusal: REFUSED_LANDING }]);
    expect(record.pickers).toEqual([]);
  });
});

describe('a cable let go on the open canvas', () => {
  test('a cable from the gateway stands a draft under the pointer, and reveals it', () => {
    const { record } = letGoOnOpenCanvasFrom('gateway');

    expect(heldDraft(gateway.slug)?.seat).toEqual(UNDER_THE_POINTER);
    expect(record.selected).toEqual(['draft']);
    expect(inspectorOpen()).toBe(true);
  });

  test('a cable from a virtual model asks what to bind where the pointer released', () => {
    expect(letGoOnOpenCanvasFrom('model:fast').record.pickers).toEqual([
      { step: 'kind', from: 'model:fast', at: UNDER_THE_POINTER, origin: 'drop' },
    ]);
  });

  test('a cable from a router asks what to bind where the pointer released', () => {
    expect(letGoOnOpenCanvasFrom('route:pooled').record.pickers).toEqual([
      { step: 'kind', from: 'route:pooled', at: UNDER_THE_POINTER, origin: 'drop' },
    ]);
  });

  test('a cable from the draft asks what to bind and puts the inspector away', () => {
    toggleInspector();

    expect(letGoOnOpenCanvasFrom('draft').record.pickers).toEqual([
      { step: 'kind', from: 'draft', at: UNDER_THE_POINTER, origin: 'drop' },
    ]);
    expect(inspectorOpen()).toBe(false);
  });

  test('a cable from a stored target asks nothing, and the drag is over either way', () => {
    const { world, record } = letGoOnOpenCanvasFrom('target:fast');

    expect(record.pickers).toEqual([]);
    expect(world.dragging.current.inFlight).toBe(false);
  });
});

describe('a cable in flight, before it lands anywhere', () => {
  test('the binding rule the flow drags against reads the stored gateway', () => {
    const wiring = flowWiring(worldWhereWritesHang(gateway).world);

    expect(wiring.isValidConnection(pulled('model:fast', 'target:fast'))).toBe(false);
    expect(wiring.isValidConnection(pulled('model:fast', 'target:creative'))).toBe(true);
  });
});

describe('a cable that reached a target', () => {
  test('a drag Escape threw away opens no pick', () => {
    const { world, record } = worldWhereWritesHang(gateway);

    world.dragging.current = { inFlight: true, escaped: true };
    flowWiring(world).onConnect(pulled('model:fast', 'target:creative'));

    expect(record.pickers).toEqual([]);
  });

  test('a completed connection asks which model, with the account already settled', () => {
    const { world, record } = worldWhereWritesHang(gateway);

    flowWiring(world).onConnect(pulled('model:fast', 'target:creative'));

    expect(record.pickers).toEqual([
      { step: 'provider-model', from: 'model:fast', accountId: 'g1', anchor: 'target:creative' },
    ]);
  });

  test('a connection onto a card the gateway no longer stands asks nothing', () => {
    const { world, record } = worldWhereWritesHang(gateway);

    flowWiring(world).onConnect(pulled('model:fast', 'target:absent'));

    expect(record.pickers).toEqual([]);
  });
});

describe('a cable moved from the target it held to another', () => {
  test('a drag Escape threw away opens no pick', () => {
    const { world, record } = worldWhereWritesHang(gateway);
    const held = { id: 'cable:pooled:t1', source: 'route:pooled', target: 'target:pooled:t1' };

    world.dragging.current = { inFlight: true, escaped: true };
    flowWiring(world).onReconnect(held, pulled('route:pooled', 'target:creative'));

    expect(record.pickers).toEqual([]);
  });

  test('a reconnect that kept its source moves the binding rather than adding one', () => {
    const { world, record } = worldWhereWritesHang(gateway);
    const held = { id: 'cable:pooled:t1', source: 'route:pooled', target: 'target:pooled:t1' };

    flowWiring(world).onReconnect(held, pulled('route:pooled', 'target:creative'));

    expect(record.pickers[0]).toMatchObject({ anchor: 'target:creative', replacing: 't1' });
  });

  test('a reconnect whose source changed asks nothing, since it binds no card it left', () => {
    const { world, record } = worldWhereWritesHang(gateway);
    const held = { id: 'cable:fast', source: 'model:fast', target: 'target:fast' };

    flowWiring(world).onReconnect(held, pulled('model:slow', 'target:creative'));

    expect(record.pickers).toEqual([]);
  });
});

describe('the mark a drag leaves while it is in flight', () => {
  test('a drag off a port and a drag off a standing cable both mark the canvas', () => {
    const { world } = worldWhereWritesHang(gateway);
    const wiring = flowWiring(world);

    wiring.onConnectStart(new MouseEvent('mousedown'), {
      nodeId: 'model:fast',
      handleId: null,
      handleType: null,
    });

    expect(world.dragging.current.inFlight).toBe(true);

    world.dragging.current.inFlight = false;
    wiring.onReconnectStart();

    expect(world.dragging.current.inFlight).toBe(true);
  });

  test('a finished reconnect leaves no mark, not even the one an Escape left', () => {
    const { world } = worldWhereWritesHang(gateway);

    world.dragging.current = { inFlight: true, escaped: true };
    flowWiring(world).onReconnectEnd();

    expect(world.dragging.current).toEqual({ inFlight: false, escaped: false });
  });
});
