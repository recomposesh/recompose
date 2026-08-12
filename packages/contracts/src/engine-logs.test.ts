import { describe, expect, test } from 'vitest';

import { logBatchSchema, logRowSchema } from './engine-logs';

const servedAt = 1_754_600_000_000;

const clientKey = 'sha256:8706ee88bbbdda48d02a4888691822b90d8b136bc5fb8e3a815e518105f0655c';

const served = {
  id: 'log-1',
  at: servedAt,
  gateway: 'relay',
  virtualModel: 'creative',
  origin: 'provider',
  method: 'POST',
  provider: 'anthropic',
  accountId: 'work',
  providerModel: 'claude-sonnet-4-5',
  status: 200,
  durationMs: 912,
  tokens: 1_820,
  clientKey,
};

const unreachable = {
  id: 'log-2',
  at: servedAt,
  gateway: 'relay',
  virtualModel: 'creative',
  origin: 'gateway',
  method: 'POST',
  status: 502,
  clientKey,
  failure: 'The gateway could not reach the target.',
};

const unreadable = {
  id: 'log-3',
  at: servedAt,
  gateway: 'relay',
  origin: 'gateway',
  method: 'POST',
  status: 400,
  clientKey,
  failure: 'The gateway could not read the request.',
};

describe('one request as the drawer lists it', () => {
  test('a served request carries the model pair, the account that served it, and the duration', () => {
    expect(logRowSchema.parse(served)).toEqual(served);
  });

  test('a request the gateway failed before any provider answered leaves its provider cells empty', () => {
    expect(logRowSchema.parse(unreachable)).toEqual(unreachable);
  });

  test('a request too broken to read names no virtual model, because the gateway never resolved one', () => {
    expect(logRowSchema.parse(unreadable)).toEqual(unreadable);
  });

  test('a duration measured between frames survives, because the clock reads fractions', () => {
    expect(logRowSchema.parse({ ...served, durationMs: 0.5 }).durationMs).toBe(0.5);
  });

  test('a row through a dotted alias survives, because a real model name keeps its dots', () => {
    expect(logRowSchema.parse({ ...served, virtualModel: 'claude-5.6-sol' }).virtualModel).toBe(
      'claude-5.6-sol',
    );
  });
});

describe('the token split beside the total', () => {
  const split = { input: 1_200, output: 480, cacheRead: 96, cacheWrite: 32, reasoning: 12 };

  test('a served request carries its five-way split beside the total it already carried', () => {
    const measured = { ...served, usage: split };

    expect(logRowSchema.parse(measured)).toEqual(measured);
  });

  test('a row without a split still parses, because older rows never measured one', () => {
    expect(logRowSchema.parse(served)).toEqual(served);
  });

  test('a split missing a kind is refused, so a partial reading never poses as a whole one', () => {
    const { reasoning: _unmeasured, ...partial } = split;

    expect(() => logRowSchema.parse({ ...served, usage: partial })).toThrow();
  });

  test('a split with a negative reading is refused', () => {
    expect(() => logRowSchema.parse({ ...served, usage: { ...split, input: -1 } })).toThrow();
  });

  test('a split with a fractional reading is refused, because tokens count whole', () => {
    expect(() => logRowSchema.parse({ ...served, usage: { ...split, output: 0.5 } })).toThrow();
  });

  test('a split naming a kind this contract never defined is refused', () => {
    expect(() => logRowSchema.parse({ ...served, usage: { ...split, audioTokens: 5 } })).toThrow();
  });
});

describe('what no row carries', () => {
  test('no row carries what was asked', () => {
    expect(() => logRowSchema.parse({ ...served, prompt: 'my secret plan' })).toThrow();
  });

  test('no row carries what came back', () => {
    expect(() => logRowSchema.parse({ ...served, completion: 'here is the plan' })).toThrow();
    expect(() => logRowSchema.parse({ ...unreachable, body: 'quota exceeded for acme' })).toThrow();
  });

  test('no row carries the address the request came from, only the key standing for it', () => {
    expect(() => logRowSchema.parse({ ...served, clientAddress: '127.0.0.1' })).toThrow();
    expect(() => logRowSchema.parse({ ...served, userAgent: 'curl/8.7.1' })).toThrow();
  });

  test('an address smuggled into the key itself is refused', () => {
    expect(() => logRowSchema.parse({ ...served, clientKey: '127.0.0.1' })).toThrow();
    expect(() => logRowSchema.parse({ ...served, clientKey: '127.0.0.1|curl/8.7.1' })).toThrow();
  });

  test('a key that is not the digest the gateway writes is refused', () => {
    expect(() => logRowSchema.parse({ ...served, clientKey: 'a'.repeat(64) })).toThrow();
    expect(() =>
      logRowSchema.parse({ ...served, clientKey: `sha256:${'a'.repeat(63)}` }),
    ).toThrow();
    expect(() =>
      logRowSchema.parse({ ...served, clientKey: `sha256:${'A'.repeat(64)}` }),
    ).toThrow();
  });

  test('an address riding beside a real digest is refused at either end', () => {
    expect(() => logRowSchema.parse({ ...served, clientKey: `127.0.0.1 ${clientKey}` })).toThrow();
    expect(() => logRowSchema.parse({ ...served, clientKey: `${clientKey} 127.0.0.1` })).toThrow();
  });
});

describe('what a row must name to be worth listing', () => {
  test('a row rose either at a provider or at the gateway, and never a third place', () => {
    expect(() => logRowSchema.parse({ ...served, origin: 'renderer' })).toThrow();
  });

  test('a failure explains itself in a sentence a person can read', () => {
    expect(() => logRowSchema.parse({ ...unreachable, failure: '   ' })).toThrow();
  });

  test('a row naming no client is refused, because the footer counts distinct clients', () => {
    const { clientKey: key, ...withoutTheKey } = served;

    expect(key).toBe(clientKey);
    expect(() => logRowSchema.parse(withoutTheKey)).toThrow();
    expect(() => logRowSchema.parse({ ...served, clientKey: '  ' })).toThrow();
  });

  test('a row nothing could key on is refused, because the cache merges by id', () => {
    expect(() => logRowSchema.parse({ ...served, id: '' })).toThrow();
  });

  test('a refused key says what the field must carry', () => {
    expect(() => logRowSchema.parse({ ...served, clientKey: 'curl/8.7.1' })).toThrow(
      'must be a sha256 digest',
    );
  });
});

describe('what no request could have done', () => {
  test('a status no answer could carry is refused', () => {
    expect(() => logRowSchema.parse({ ...served, status: 42 })).toThrow();
    expect(() => logRowSchema.parse({ ...served, status: 600 })).toThrow();
  });

  test('a moment before the epoch is refused, because no request landed then', () => {
    expect(() => logRowSchema.parse({ ...served, at: -1 })).toThrow();
  });

  test('a request that took less than no time is refused', () => {
    expect(() => logRowSchema.parse({ ...served, durationMs: -1 })).toThrow();
  });

  test('a request that spent fewer than no tokens is refused', () => {
    expect(() => logRowSchema.parse({ ...served, tokens: -1 })).toThrow();
  });

  test('a row under a name no gateway could carry is refused', () => {
    expect(() => logRowSchema.parse({ ...served, gateway: 'Relay' })).toThrow();
  });

  test('a row through a name no virtual model could carry is refused', () => {
    expect(() => logRowSchema.parse({ ...served, virtualModel: 'Creative' })).toThrow();
  });
});

describe('the run of rows crossing to the renderer at once', () => {
  test('a fresh subscriber reads the buffer it missed as backfill', () => {
    const batch = { kind: 'backfill', rows: [served, unreachable] };

    expect(logBatchSchema.parse(batch)).toEqual(batch);
  });

  test('every later flush appends', () => {
    const batch = { kind: 'append', rows: [served] };

    expect(logBatchSchema.parse(batch)).toEqual(batch);
  });

  test('a gateway that has served nothing backfills nothing rather than refusing', () => {
    expect(logBatchSchema.parse({ kind: 'backfill', rows: [] }).rows).toEqual([]);
  });

  test('a batch that is neither the backfill nor an append is refused', () => {
    expect(() => logBatchSchema.parse({ kind: 'replace', rows: [served] })).toThrow();
  });

  test('the rows stand frozen, so no reader reshapes a batch another reader holds', () => {
    const { rows } = logBatchSchema.parse({ kind: 'append', rows: [served] });

    expect(Object.isFrozen(rows)).toBe(true);
  });

  test('a batch carrying something that is not a row is refused whole', () => {
    expect(() =>
      logBatchSchema.parse({ kind: 'append', rows: [served, { id: 'log-4' }] }),
    ).toThrow();
  });

  test('a batch carrying a count a reader would have to trust is refused', () => {
    expect(() => logBatchSchema.parse({ kind: 'append', rows: [served], total: 1 })).toThrow();
  });
});
