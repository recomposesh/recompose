import type { Node } from '@xyflow/react';
import type { MouseEvent as ReactMouseEvent } from 'react';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { closeInspector, inspectorOpen, toggleInspector } from '../../../../shared/lib';
import { canvasGraph } from '../../lib/node-graph';
import { heldDraft } from '../../lib/use-held-draft';
import { flowWiring } from './canvas-gestures';
import { gateway } from './canvas-wiring.testkit';
import {
  canvasEnvironment,
  canvasLeftClean,
  draftHeld,
  worldWhereWritesHang,
} from './canvas-world.testkit';

const STEADY = { displayName: 'Steady', id: 'steady', accountId: '', providerModel: '' };
const ASKED_AT = { x: 448, y: 348 };

class PressedControl extends EventTarget {
  private readonly attributes: readonly string[] | null;

  constructor(attributes: readonly string[] | null) {
    super();
    this.attributes = attributes;
  }

  closest(): PressedControl | null {
    return this.attributes === null ? null : this;
  }

  hasAttribute(name: string): boolean {
    return this.attributes?.includes(name) ?? false;
  }
}

function press(target: EventTarget): ReactMouseEvent {
  return Object.assign(new MouseEvent('click'), {
    target,
    currentTarget: document.body,
    nativeEvent: new MouseEvent('click'),
    view: { styleMedia: { type: 'screen', matchMedium: () => false }, document },
    isDefaultPrevented: () => false,
    isPropagationStopped: () => false,
    persist: () => {},
  });
}

function canvasStanding() {
  const drawn = canvasGraph(gateway, [], { draft: undefined, pending: undefined });

  return worldWhereWritesHang(gateway, { graph: drawn });
}

function isAsk(held: unknown): held is () => void {
  return typeof held === 'function';
}

function askedOn(nodes: Node[], id: string, ask: string): () => void {
  const held = nodes.find((node) => node.id === id)?.data[ask];

  if (!isAsk(held)) {
    throw new Error(`no ${ask} hangs off the ${id} card`);
  }

  return held;
}

beforeEach(() => {
  canvasEnvironment();
  canvasLeftClean(gateway.slug);
  closeInspector();
  vi.stubGlobal('Element', PressedControl);
  vi.stubGlobal('MouseEvent', class {});
  vi.stubGlobal('document', {});
});

describe('what a press on the canvas reveals', () => {
  test('a press on the card itself reveals it beside the canvas', () => {
    const { world, record } = worldWhereWritesHang(gateway);
    const card = { id: 'model:fast', position: { x: 0, y: 0 }, data: {} };

    flowWiring(world).onNodeClick(press(new PressedControl(['aria-pressed'])), card);

    expect(record.selected).toEqual(['model:fast']);
    expect(inspectorOpen()).toBe(true);
  });

  test('a press elsewhere inside the card reveals nothing', () => {
    const { world, record } = worldWhereWritesHang(gateway);
    const card = { id: 'model:fast', position: { x: 0, y: 0 }, data: {} };
    const wiring = flowWiring(world);

    wiring.onNodeClick(press(new PressedControl([])), card);
    wiring.onNodeClick(press(new PressedControl(null)), card);

    expect(record.selected).toEqual([]);
  });

  test('a press on a binding cable reveals the cable', () => {
    const { world, record } = worldWhereWritesHang(gateway);
    const cable = { id: 'cable:fast', source: 'model:fast', target: 'target:fast' };

    flowWiring(world).onEdgeClick(press(new PressedControl(null)), cable);

    expect(record.selected).toEqual(['cable:fast']);
  });

  test('a press on a wire reveals nothing, because a wire binds nothing', () => {
    const { world, record } = worldWhereWritesHang(gateway);
    const wire = { id: 'wire:model:fast', source: 'gateway', target: 'model:fast' };

    flowWiring(world).onEdgeClick(press(new PressedControl(null)), wire);

    expect(record.selected).toEqual([]);
  });

  test('a press on the pane with an ask standing dismisses the ask alone', () => {
    const held = { step: 'kind', from: 'draft', at: ASKED_AT, origin: 'ask' } as const;
    const { world, record } = worldWhereWritesHang(gateway, { picker: held });

    toggleInspector();
    flowWiring(world).onPaneClick();

    expect(record.pickers).toEqual([undefined]);
    expect(record.selected).toEqual([]);
    expect(inspectorOpen()).toBe(true);
  });

  test('a press on a quiet pane lets the selection go and puts the inspector away', () => {
    const { world, record } = worldWhereWritesHang(gateway, { selection: 'model:fast' });

    toggleInspector();
    flowWiring(world).onPaneClick();

    expect(record.selected).toEqual([undefined]);
    expect(inspectorOpen()).toBe(false);
  });
});

describe('the asks a card hangs off its own port', () => {
  test("the gateway's plus stands a draft in the virtual model column", () => {
    const { world } = canvasStanding();

    askedOn(flowWiring(world).nodes, 'gateway', 'onAddVirtualModel')();

    expect(heldDraft(gateway.slug)?.seat.x).toBe(320);
  });

  test("the gateway's plus reopens the draft already standing, where it stands", () => {
    const { world } = canvasStanding();

    draftHeld(gateway.slug, STEADY, { x: 700, y: 150 });
    askedOn(flowWiring(world).nodes, 'gateway', 'onAddVirtualModel')();

    expect(heldDraft(gateway.slug)?.definition.id).toBe('steady');
    expect(heldDraft(gateway.slug)?.seat.x).toBe(700);
  });

  test("a router's plus asks what to bind beyond the router's own column", () => {
    const { world, record } = canvasStanding();

    askedOn(flowWiring(world).nodes, 'route:pooled', 'onAddChild')();

    expect(record.pickers).toEqual([
      { step: 'kind', from: 'route:pooled', at: { x: 960, y: 0 }, origin: 'ask' },
    ]);
  });
});

describe('a card taking the keyboard focus', () => {
  test('a card the canvas had not selected becomes the selection', () => {
    const { world, record } = worldWhereWritesHang(gateway);

    flowWiring(world).onNodeFocus('model:fast');

    expect(record.selected).toEqual(['model:fast']);
  });

  test('a card already standing selected is never selected twice', () => {
    const { world, record } = worldWhereWritesHang(gateway, { selection: 'model:fast' });

    flowWiring(world).onNodeFocus('model:fast');

    expect(record.selected).toEqual([]);
  });
});
