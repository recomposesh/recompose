import { describe, expect, test } from 'vitest';

import { SETUP_STEPS, setupOpensOn } from './setup-step';

describe('a profile that has never settled the setup wizard', () => {
  test('it opens on the welcome step when the profile holds nothing', () => {
    expect(
      setupOpensOn({ settled: false, gatewayExists: false, virtualModelComposed: false }),
    ).toBe('welcome');
  });

  test('it opens on the welcome step when a gateway stands with nothing behind it', () => {
    expect(setupOpensOn({ settled: false, gatewayExists: true, virtualModelComposed: false })).toBe(
      'welcome',
    );
  });

  test('it opens on the wait when a gateway and a virtual model both stand', () => {
    expect(setupOpensOn({ settled: false, gatewayExists: true, virtualModelComposed: true })).toBe(
      'waiting',
    );
  });
});

describe('a profile that already settled the setup wizard', () => {
  test('the wizard stands away however much the profile holds', () => {
    expect(setupOpensOn({ settled: true, gatewayExists: true, virtualModelComposed: true })).toBe(
      null,
    );
    expect(setupOpensOn({ settled: true, gatewayExists: false, virtualModelComposed: false })).toBe(
      null,
    );
  });
});

describe('the order the steps stand in', () => {
  test('it opens on welcome and closes on the wait', () => {
    expect(SETUP_STEPS.at(0)).toBe('welcome');
    expect(SETUP_STEPS.at(-1)).toBe('waiting');
  });

  test('every step a profile can open on stands in the order', () => {
    const openings = [
      setupOpensOn({ settled: false, gatewayExists: false, virtualModelComposed: false }),
      setupOpensOn({ settled: false, gatewayExists: true, virtualModelComposed: true }),
    ];

    for (const opening of openings) {
      expect(SETUP_STEPS).toContain(opening);
    }
  });
});
