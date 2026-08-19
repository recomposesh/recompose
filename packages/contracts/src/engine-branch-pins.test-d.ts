import { describe, expectTypeOf, test } from 'vitest';

import type {
  BranchPinTally,
  EngineBranchPinReport,
  GatewayBranchPins,
  IpcChannel,
  IpcEventPayload,
  RecomposeIpcEvents,
} from './index';

describe('how many conversations one router keeps per branch', () => {
  test('a branch reads as a count and nothing a fingerprint could hide in', () => {
    expectTypeOf<BranchPinTally>().toEqualTypeOf<Record<string, number>>();
  });
});

describe('the pin tally the child sends unasked', () => {
  test('a tally names the gateway, the virtual model, the router, and its branch counts', () => {
    expectTypeOf<EngineBranchPinReport>().toEqualTypeOf<{
      kind: 'branch-pins';
      slug: string;
      virtualModel: string;
      routeNode: string;
      pinned: BranchPinTally;
    }>();
  });

  test('a tally answers no directive, because no directive asked for it', () => {
    expectTypeOf<EngineBranchPinReport>().not.toHaveProperty('answers');
  });

  test('a tally carries neither the conversation nor what it asked', () => {
    expectTypeOf<EngineBranchPinReport>().not.toHaveProperty('fingerprint');
    expectTypeOf<EngineBranchPinReport>().not.toHaveProperty('prompt');
  });
});

describe('the pin snapshot crossing to the renderer', () => {
  test('the snapshot reads gateway, then virtual model, then router, to one tally', () => {
    expectTypeOf<GatewayBranchPins>().toEqualTypeOf<
      Record<string, Record<string, Record<string, BranchPinTally>>>
    >();
  });

  test('the push carries the whole snapshot rather than one router', () => {
    expectTypeOf<IpcEventPayload<'engine:pins'>>().toEqualTypeOf<GatewayBranchPins>();
  });

  test('subscribing answers a disposer, so no listener outlives its subscriber', () => {
    expectTypeOf<RecomposeIpcEvents['engine:pins']>().toEqualTypeOf<
      (listener: (payload: GatewayBranchPins) => void) => () => void
    >();
  });

  test('the tally rides the push surface only, so no window can ask for it', () => {
    expectTypeOf<Extract<IpcChannel, 'engine:pins'>>().toEqualTypeOf<never>();
  });
});
