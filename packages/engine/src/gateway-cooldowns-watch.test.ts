import { describe, expect, test } from 'vitest';

import type { CooldownReading } from './gateway-cooldowns-watch';
import type { RouteNodeAddress } from './routing/route-node-key';

import { publishCooldown, subscribeToCooldowns } from './gateway-cooldowns-watch';
import { routingMemory } from './gateway-routing-memory';

const JUDGE: RouteNodeAddress = { slug: 'personal', virtualModel: 'fast', routeNode: 'j1' };

const LIFTS_AT = 1_700_000_060_000;

function readingsHeard(): { heard: CooldownReading[]; letGo: () => void } {
  const heard: CooldownReading[] = [];

  return {
    heard,
    letGo: subscribeToCooldowns((reading) => {
      heard.push(reading);
    }),
  };
}

describe('who hears that a route node stood down', () => {
  test('a reader hears the node named and the moment it stands back up', () => {
    const { heard, letGo } = readingsHeard();

    publishCooldown(JUDGE, LIFTS_AT);
    letGo();

    expect(heard).toEqual([{ address: JUDGE, coolUntilMs: LIFTS_AT }]);
  });

  test('a reader that let go hears nothing further, so no listener outlives its subscriber', () => {
    const { heard, letGo } = readingsHeard();

    letGo();
    publishCooldown(JUDGE, LIFTS_AT);

    expect(heard).toEqual([]);
  });

  test('a reader that breaks never keeps the next one from hearing', () => {
    const letBrokenGo = subscribeToCooldowns(() => {
      throw new Error('this reader is gone');
    });
    const { heard, letGo } = readingsHeard();

    publishCooldown(JUDGE, LIFTS_AT);
    letBrokenGo();
    letGo();

    expect(heard).toEqual([{ address: JUDGE, coolUntilMs: LIFTS_AT }]);
  });
});

describe('what a gateway says when one of its nodes stands down', () => {
  test('cooling a node tells every reader the moment that node stands back up', () => {
    const { heard, letGo } = readingsHeard();

    routingMemory('main').ledger.cool(JUDGE, { coolUntilMs: LIFTS_AT });
    letGo();

    expect(heard).toEqual([{ address: JUDGE, coolUntilMs: LIFTS_AT }]);
  });

  test('the moment a provider promised is never the one told, since only the window is watched', () => {
    const { heard, letGo } = readingsHeard();

    routingMemory('main').ledger.cool(JUDGE, { coolUntilMs: LIFTS_AT, retryAtMs: LIFTS_AT + 5000 });
    letGo();

    expect(heard).toEqual([{ address: JUDGE, coolUntilMs: LIFTS_AT }]);
  });
});
