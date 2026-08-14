import { describe, expect, test } from 'vitest';

import type { SubscriptionObservation } from './subscription-standing';

import { awaitSignIn, wallClock } from './subscription-sign-in';
import { fakeClock } from './subscriptions.testkit';

function observesInTurn(readings: readonly SubscriptionObservation[]) {
  let turn = 0;
  const looks: number[] = [];

  return {
    looks,
    observe: async (): Promise<SubscriptionObservation> => {
      looks.push(turn);
      const reading = readings[turn] ?? { standing: 'lapsed' as const };

      turn += 1;

      return Promise.resolve(reading);
    },
  };
}

async function waitFor(watcher: {
  observe: () => Promise<SubscriptionObservation>;
}): Promise<SubscriptionObservation | null> {
  return awaitSignIn({ observe: watcher.observe, clock: fakeClock(), boundMs: 1000, everyMs: 100 });
}

describe('waiting for the provider tool to finish signing somebody in', () => {
  test('given the tool already signed in, the wait answers on its first look', async () => {
    const watcher = observesInTurn([{ standing: 'connected', signedInAs: 'ada@ex.com' }]);

    const answered = await awaitSignIn({
      observe: watcher.observe,
      clock: fakeClock(),
      boundMs: 1000,
      everyMs: 100,
    });

    expect(answered).toEqual({ standing: 'connected', signedInAs: 'ada@ex.com' });
    expect(watcher.looks).toHaveLength(1);
  });

  test('given the tool signs in part way through, the wait answers as soon as it does', async () => {
    const watcher = observesInTurn([
      { standing: 'lapsed' },
      { standing: 'lapsed' },
      { standing: 'connected', signedInAs: 'ada@ex.com', plan: 'max' },
    ]);

    const answered = await awaitSignIn({
      observe: watcher.observe,
      clock: fakeClock(),
      boundMs: 1000,
      everyMs: 100,
    });

    expect(answered).toEqual({ standing: 'connected', signedInAs: 'ada@ex.com', plan: 'max' });
    expect(watcher.looks).toHaveLength(3);
  });

  test('given the bound passes with nobody signed in, the wait answers nobody', async () => {
    const watcher = observesInTurn([]);

    const answered = await awaitSignIn({
      observe: watcher.observe,
      clock: fakeClock(),
      boundMs: 300,
      everyMs: 100,
    });

    expect(answered).toBeNull();
    expect(watcher.looks).toHaveLength(4);
  });
});

describe('a credential that lands before the record naming who it belongs to', () => {
  test('given the address arrives a beat late, the wait answers with it rather than without', async () => {
    const watcher = observesInTurn([
      { standing: 'connected' },
      { standing: 'connected', signedInAs: 'ada@ex.com' },
    ]);

    expect(await waitFor(watcher)).toEqual({ standing: 'connected', signedInAs: 'ada@ex.com' });
  });

  test('given the address never arrives, the wait answers the sign-in it already has', async () => {
    const watcher = observesInTurn([{ standing: 'connected' }, { standing: 'connected' }]);

    expect(await waitFor(watcher)).toEqual({ standing: 'connected' });
  });

  test('the second look is one look, not a wait that runs to the bound', async () => {
    const watcher = observesInTurn([{ standing: 'connected' }, { standing: 'connected' }]);

    await waitFor(watcher);

    expect(watcher.looks).toHaveLength(2);
  });

  test('given the second look reads nobody signed in, the sign-in already seen still stands', async () => {
    const watcher = observesInTurn([{ standing: 'connected' }, { standing: 'lapsed' }]);

    expect(await waitFor(watcher)).toEqual({ standing: 'connected' });
  });

  test('the second look is the fresher reading, so a plan it learned late comes back too', async () => {
    const watcher = observesInTurn([
      { standing: 'connected' },
      { standing: 'connected', plan: 'max' },
    ]);

    expect(await waitFor(watcher)).toEqual({ standing: 'connected', plan: 'max' });
  });

  test('a sign-in that named its address on the first look is never looked at twice', async () => {
    const watcher = observesInTurn([{ standing: 'connected', signedInAs: 'ada@ex.com' }]);

    await waitFor(watcher);

    expect(watcher.looks).toHaveLength(1);
  });
});

describe('the clock the wait runs against', () => {
  test('given a fresh clock, no time has passed yet, and sleeping lets some pass', async () => {
    const clock = wallClock();

    expect(clock.elapsed()).toBeLessThan(1000);

    await clock.sleep(5);

    expect(clock.elapsed()).toBeGreaterThanOrEqual(4);
  });
});
