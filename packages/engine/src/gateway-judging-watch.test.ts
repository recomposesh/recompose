import { afterEach, describe, expect, test } from 'vitest';

import type { JudgingReading } from './gateway-judging-watch';

import { forgetJudgingInFlight, judgingBegan, subscribeToJudging } from './gateway-judging-watch';

const AT_A_ROUTER = { slug: 'codex', virtualModel: 'fast', routeNode: 'r1' };

const AT_ANOTHER_ROUTER = { slug: 'codex', virtualModel: 'fast', routeNode: 'r2' };

afterEach(() => {
  forgetJudgingInFlight();
});

function watching(): { read: JudgingReading[]; forget: () => void } {
  const read: JudgingReading[] = [];

  const forget = subscribeToJudging((reading) => {
    read.push(reading);
  });

  return { read, forget };
}

describe('the signal a router waiting on its judge sends', () => {
  test('a classification beginning says the router is judging one request', () => {
    const watched = watching();

    judgingBegan(AT_A_ROUTER);
    watched.forget();

    expect(watched.read).toEqual([{ address: AT_A_ROUTER, judging: 1 }]);
  });

  test('a classification settling says the router waits on nothing more', () => {
    const watched = watching();

    judgingBegan(AT_A_ROUTER)();
    watched.forget();

    expect(watched.read.at(-1)).toEqual({ address: AT_A_ROUTER, judging: 0 });
  });

  test('two requests judged at once leave the router judging until the second settles', () => {
    const watched = watching();
    const first = judgingBegan(AT_A_ROUTER);
    const second = judgingBegan(AT_A_ROUTER);

    first();
    const midway = watched.read.at(-1);

    second();
    watched.forget();

    expect(midway).toEqual({ address: AT_A_ROUTER, judging: 1 });
    expect(watched.read.at(-1)).toEqual({ address: AT_A_ROUTER, judging: 0 });
  });

  test('a settle spent twice never counts a request that was never made', () => {
    const watched = watching();
    const settle = judgingBegan(AT_A_ROUTER);

    settle();
    settle();
    watched.forget();

    expect(watched.read.filter((reading) => reading.judging === 0)).toHaveLength(1);
  });

  test('two routers judging keep counts of their own', () => {
    const watched = watching();

    judgingBegan(AT_A_ROUTER);
    judgingBegan(AT_ANOTHER_ROUTER);
    watched.forget();

    expect(watched.read).toEqual([
      { address: AT_A_ROUTER, judging: 1 },
      { address: AT_ANOTHER_ROUTER, judging: 1 },
    ]);
  });

  test('a reader that stopped listening hears nothing more', () => {
    const watched = watching();

    watched.forget();
    judgingBegan(AT_A_ROUTER);

    expect(watched.read).toEqual([]);
  });
});
