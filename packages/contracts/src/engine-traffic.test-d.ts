import { describe, expectTypeOf, test } from 'vitest';

import type {
  EngineTrafficReport,
  GatewayTraffic,
  IpcChannel,
  IpcEventPayload,
  RecomposeIpcEvents,
  RequestOutcome,
} from './index';

type LiveOutcome = Extract<RequestOutcome, { outcome: 'live' }>;

type ServedOutcome = Extract<RequestOutcome, { outcome: 'served' }>;

type FailedOutcome = Extract<RequestOutcome, { outcome: 'failed' }>;

describe('the outcome one virtual model last came to', () => {
  test('a request is live, served, or failed, and never a fourth thing', () => {
    expectTypeOf<RequestOutcome['outcome']>().toEqualTypeOf<'live' | 'served' | 'failed'>();
  });

  test('only a failure names a status and the sentence explaining it', () => {
    expectTypeOf<LiveOutcome>().not.toHaveProperty('status');
    expectTypeOf<LiveOutcome>().not.toHaveProperty('detail');
    expectTypeOf<ServedOutcome>().not.toHaveProperty('status');
    expectTypeOf<ServedOutcome>().not.toHaveProperty('detail');
    expectTypeOf<FailedOutcome['status']>().toEqualTypeOf<number>();
    expectTypeOf<FailedOutcome['detail']>().toEqualTypeOf<string>();
  });

  test('every outcome says when it landed', () => {
    expectTypeOf<LiveOutcome['at']>().toEqualTypeOf<number>();
    expectTypeOf<ServedOutcome['at']>().toEqualTypeOf<number>();
    expectTypeOf<FailedOutcome['at']>().toEqualTypeOf<number>();
  });

  test('no outcome carries what was asked or what came back', () => {
    expectTypeOf<FailedOutcome>().not.toHaveProperty('body');
    expectTypeOf<FailedOutcome>().not.toHaveProperty('request');
    expectTypeOf<FailedOutcome>().not.toHaveProperty('response');
  });
});

describe('the traffic report the child sends unasked', () => {
  test('a report names the gateway, the virtual model, the node tried, and what it came to', () => {
    expectTypeOf<EngineTrafficReport>().toEqualTypeOf<{
      kind: 'traffic';
      slug: string;
      virtualModel: string;
      routeNode: string;
      request: RequestOutcome;
    }>();
  });

  test('a report answers no directive, because no directive asked for it', () => {
    expectTypeOf<EngineTrafficReport>().not.toHaveProperty('answers');
  });
});

describe('the traffic snapshot crossing to the renderer', () => {
  test('the snapshot reads gateway, then virtual model, then route node, to one outcome', () => {
    expectTypeOf<GatewayTraffic>().toEqualTypeOf<
      Record<string, Record<string, Record<string, RequestOutcome>>>
    >();
  });

  test('one virtual model holds an outcome per node, so two attempts each keep theirs', () => {
    expectTypeOf<NonNullable<NonNullable<GatewayTraffic[string]>[string]>>().toEqualTypeOf<
      Record<string, RequestOutcome>
    >();
  });

  test('the push carries the whole snapshot rather than one gateway', () => {
    expectTypeOf<IpcEventPayload<'engine:traffic'>>().toEqualTypeOf<GatewayTraffic>();
  });

  test('subscribing answers a disposer, so no listener outlives its subscriber', () => {
    expectTypeOf<RecomposeIpcEvents['engine:traffic']>().toEqualTypeOf<
      (listener: (payload: GatewayTraffic) => void) => () => void
    >();
  });

  test('traffic rides the push surface only, so no window can ask for it', () => {
    expectTypeOf<Extract<IpcChannel, 'engine:traffic'>>().toEqualTypeOf<never>();
  });
});
