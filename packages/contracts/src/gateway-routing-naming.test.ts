import { describe, expect, test } from 'vitest';

import { nameOfRouter, nameOfRouterMode } from './gateway-routing';

describe('a router names itself from its mode until a person renames it', () => {
  test('reads a failover router by its mode', () => {
    expect(nameOfRouter('failover')).toBe('Failover');
  });

  test('reads a round-robin router by its mode', () => {
    expect(nameOfRouter('round-robin')).toBe('Round-robin');
  });

  test('reads the name a person wrote over the mode it runs', () => {
    expect(nameOfRouter('failover', 'Ladder')).toBe('Ladder');
  });

  test('falls back to the mode for a router whose name was never written', () => {
    expect(nameOfRouter('round-robin', undefined)).toBe('Round-robin');
  });
});

describe('the mode control offers the same words a nameless router wears', () => {
  test('names failover exactly as a nameless failover router reads', () => {
    expect(nameOfRouterMode('failover')).toBe(nameOfRouter('failover'));
  });

  test('names round-robin exactly as a nameless round-robin router reads', () => {
    expect(nameOfRouterMode('round-robin')).toBe(nameOfRouter('round-robin'));
  });

  test('spells the two modes as a person reads them', () => {
    expect([nameOfRouterMode('failover'), nameOfRouterMode('round-robin')]).toEqual([
      'Failover',
      'Round-robin',
    ]);
  });
});
