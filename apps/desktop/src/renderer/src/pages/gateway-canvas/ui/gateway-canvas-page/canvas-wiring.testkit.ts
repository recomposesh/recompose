import type { Routing } from '@recompose/contracts';
import type { Connection } from '@xyflow/react';

import { vi } from 'vitest';

import { gatewaySeed } from '../../../../shared/testing';

function boundThrough(routeNodeId: string, accountId: string, providerModel: string): Routing {
  return {
    entry: routeNodeId,
    nodes: { [routeNodeId]: { kind: 'target', accountId, providerModel } },
  };
}

/**
 * A gateway holding one of every binding a cable rule has to answer about.
 *
 * @summary Three plainly bound definitions and one pooled: a bound account, an account another
 * definition also holds, an account that left the registry, and a failover ladder over two of
 * them. One seeding covers every arm, so a scenario says which arm it means by what it drags.
 */
export const gateway = gatewaySeed({
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8397,
  virtualModels: [
    {
      id: 'fast',
      displayName: 'Fast',
      routing: boundThrough('node-fast', 'k1', 'claude-haiku-4-5'),
    },
    {
      id: 'creative',
      displayName: 'Creative',
      routing: boundThrough('node-creative', 'g1', 'openai/gpt-5'),
    },
    {
      id: 'slow',
      displayName: 'Slow',
      routing: boundThrough('node-slow', 'gone', 'claude-opus-5'),
    },
    {
      id: 'pooled',
      displayName: 'Pooled',
      routing: {
        entry: 'r1',
        nodes: {
          r1: { kind: 'router', policy: { mode: 'failover' }, children: ['t1', 't2'] },
          t1: { kind: 'target', accountId: 'k1', providerModel: 'claude-haiku-4-5' },
          t2: { kind: 'target', accountId: 'gone', providerModel: 'claude-opus-5' },
        },
      },
    },
  ],
});

/** One cable in flight, from the card it left to the card it points at. */
export function pulled(source: string, target: string): Connection {
  return { source, target, sourceHandle: null, targetHandle: null };
}

class TextField {}

function fieldConstructors(): void {
  vi.stubGlobal('HTMLInputElement', TextField);
  vi.stubGlobal('HTMLTextAreaElement', class {});
  vi.stubGlobal('HTMLElement', class {});
}

/**
 * Puts the keyboard on the canvas, which is where Delete is the canvas's own to answer.
 *
 * @summary The canvas asks the live document who holds the keyboard, so a scenario standing
 * outside a browser has to say. Nothing focused is the canvas holding it.
 */
export function keyboardOnTheCanvas(): void {
  fieldConstructors();
  vi.stubGlobal('document', { activeElement: null });
}

/** Puts the keyboard in a text field mid-edit, where Delete edits text rather than the canvas. */
export function keyboardInAText(): void {
  fieldConstructors();
  vi.stubGlobal('document', { activeElement: new TextField() });
}
