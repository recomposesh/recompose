import { describe, expect, test } from 'vitest';

import { createCooldownLedger } from './cooldown-ledger';

const NOW = 1_700_000_000_000;

function aLedgerAt(start: number) {
  let reading = start;

  return {
    ledger: createCooldownLedger(() => reading),
    tick: (span: number) => {
      reading += span;
    },
  };
}

describe('the children a gateway remembers standing down', () => {
  test('a child never refused stands ready', () => {
    const { ledger } = aLedgerAt(NOW);

    expect(
      ledger.coolingAt({ slug: 'main', virtualModel: 'fast', routeNode: 'first' }),
    ).toBeUndefined();
  });

  test('a child cooled until a named instant still stands down before that instant', () => {
    const { ledger } = aLedgerAt(NOW);
    const address = { slug: 'main', virtualModel: 'fast', routeNode: 'first' };

    ledger.cool(address, { coolUntilMs: NOW + 30_000 });

    expect(ledger.coolingAt(address)).toStrictEqual({ coolUntilMs: NOW + 30_000 });
  });

  test('a child whose cooling has run out stands ready again', () => {
    const { ledger, tick } = aLedgerAt(NOW);
    const address = { slug: 'main', virtualModel: 'fast', routeNode: 'first' };

    ledger.cool(address, { coolUntilMs: NOW + 30_000 });
    tick(30_000);

    expect(ledger.coolingAt(address)).toBeUndefined();
  });

  test('a child one tick short of its cooling instant still stands down', () => {
    const { ledger, tick } = aLedgerAt(NOW);
    const address = { slug: 'main', virtualModel: 'fast', routeNode: 'first' };

    ledger.cool(address, { coolUntilMs: NOW + 30_000 });
    tick(29_999);

    expect(ledger.coolingAt(address)).toStrictEqual({ coolUntilMs: NOW + 30_000 });
  });

  test('a later refusal moves the cooling to the instant it names', () => {
    const { ledger } = aLedgerAt(NOW);
    const address = { slug: 'main', virtualModel: 'fast', routeNode: 'first' };

    ledger.cool(address, { coolUntilMs: NOW + 30_000 });
    ledger.cool(address, { coolUntilMs: NOW + 5_000 });

    expect(ledger.coolingAt(address)).toStrictEqual({ coolUntilMs: NOW + 5_000 });
  });

  test('a cooling the provider itself promised is remembered as promised', () => {
    const { ledger } = aLedgerAt(NOW);
    const address = { slug: 'main', virtualModel: 'fast', routeNode: 'first' };

    ledger.cool(address, { coolUntilMs: NOW + 30_000, retryAtMs: NOW + 30_000 });

    expect(ledger.coolingAt(address)).toStrictEqual({
      coolUntilMs: NOW + 30_000,
      retryAtMs: NOW + 30_000,
    });
  });
});

describe('what one child standing down never says about another', () => {
  test('a sibling under the same router keeps standing ready', () => {
    const { ledger } = aLedgerAt(NOW);

    ledger.cool(
      { slug: 'main', virtualModel: 'fast', routeNode: 'first' },
      {
        coolUntilMs: NOW + 30_000,
      },
    );

    expect(
      ledger.coolingAt({ slug: 'main', virtualModel: 'fast', routeNode: 'second' }),
    ).toBeUndefined();
  });

  test('the same route node under another virtual model keeps standing ready', () => {
    const { ledger } = aLedgerAt(NOW);

    ledger.cool(
      { slug: 'main', virtualModel: 'fast', routeNode: 'first' },
      {
        coolUntilMs: NOW + 30_000,
      },
    );

    expect(
      ledger.coolingAt({ slug: 'main', virtualModel: 'slow', routeNode: 'first' }),
    ).toBeUndefined();
  });

  test('the same virtual model under another gateway keeps standing ready', () => {
    const { ledger } = aLedgerAt(NOW);

    ledger.cool(
      { slug: 'main', virtualModel: 'fast', routeNode: 'first' },
      {
        coolUntilMs: NOW + 30_000,
      },
    );

    expect(
      ledger.coolingAt({ slug: 'spare', virtualModel: 'fast', routeNode: 'first' }),
    ).toBeUndefined();
  });

  test('two seats whose names run together into one are still told apart', () => {
    const { ledger } = aLedgerAt(NOW);

    ledger.cool(
      { slug: 'gate', virtualModel: 'way', routeNode: 'first' },
      {
        coolUntilMs: NOW + 30_000,
      },
    );

    expect(
      ledger.coolingAt({ slug: 'gateway', virtualModel: '', routeNode: 'first' }),
    ).toBeUndefined();
  });
});
