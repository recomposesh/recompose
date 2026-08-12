import { describe, expectTypeOf, test } from 'vitest';

import type {
  EngineLogReport,
  IpcChannel,
  IpcEventPayload,
  LogBatch,
  LogRow,
  RecomposeIpcEvents,
  TokenSplit,
} from './index';

describe('one request as every surface reads it', () => {
  test('a row carries the request facts and nothing a body could hide in', () => {
    expectTypeOf<LogRow>().toEqualTypeOf<{
      id: string;
      at: number;
      gateway: string;
      virtualModel?: string | undefined;
      origin: 'provider' | 'gateway';
      method: string;
      provider?: string | undefined;
      accountId?: string | undefined;
      providerModel?: string | undefined;
      status: number;
      durationMs?: number | undefined;
      tokens?: number | undefined;
      usage?: TokenSplit | undefined;
      clientKey: string;
      failure?: string | undefined;
    }>();
  });

  test('the split names its five token kinds and nothing else', () => {
    expectTypeOf<TokenSplit>().toEqualTypeOf<{
      input: number;
      output: number;
      cacheRead: number;
      cacheWrite: number;
      reasoning: number;
    }>();
  });

  test('a row rose either at a provider or at the gateway', () => {
    expectTypeOf<LogRow['origin']>().toEqualTypeOf<'provider' | 'gateway'>();
  });

  test('the client is a key rather than an address', () => {
    expectTypeOf<LogRow['clientKey']>().toEqualTypeOf<string>();
    expectTypeOf<LogRow>().not.toHaveProperty('clientAddress');
    expectTypeOf<LogRow>().not.toHaveProperty('userAgent');
  });

  test('no row carries what was asked or what came back', () => {
    expectTypeOf<LogRow>().not.toHaveProperty('prompt');
    expectTypeOf<LogRow>().not.toHaveProperty('completion');
    expectTypeOf<LogRow>().not.toHaveProperty('body');
  });
});

describe('the run of rows crossing at once', () => {
  test('a batch is either the backfill on subscribe or an append', () => {
    expectTypeOf<LogBatch['kind']>().toEqualTypeOf<'backfill' | 'append'>();
  });

  test('the rows a batch carries stand as a run no reader reshapes', () => {
    expectTypeOf<LogBatch['rows']>().toEqualTypeOf<readonly LogRow[]>();
  });

  test('a batch carries rows only, so no reader folds an aggregate it was handed', () => {
    expectTypeOf<LogBatch>().toEqualTypeOf<{
      kind: 'backfill' | 'append';
      rows: readonly LogRow[];
    }>();
  });
});

describe('the log report the child sends unasked', () => {
  test('one report carries one row, which the parent desk gathers into batches', () => {
    expectTypeOf<EngineLogReport>().toEqualTypeOf<{ kind: 'log'; row: LogRow }>();
  });

  test('a report answers no directive, because no directive asked for it', () => {
    expectTypeOf<EngineLogReport>().not.toHaveProperty('answers');
  });
});

describe('the log batches crossing to the renderer', () => {
  test('the push carries a batch rather than a snapshot a reader would replace', () => {
    expectTypeOf<IpcEventPayload<'engine:logs'>>().toEqualTypeOf<LogBatch>();
  });

  test('subscribing answers a disposer, so no listener outlives its subscriber', () => {
    expectTypeOf<RecomposeIpcEvents['engine:logs']>().toEqualTypeOf<
      (listener: (payload: LogBatch) => void) => () => void
    >();
  });

  test('logs ride the push surface only, so no window can ask for them', () => {
    expectTypeOf<Extract<IpcChannel, 'engine:logs'>>().toEqualTypeOf<never>();
  });
});
