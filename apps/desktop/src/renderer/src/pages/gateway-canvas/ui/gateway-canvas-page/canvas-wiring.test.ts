import { describe, expect, test } from 'vitest';

import {
  bindingCableId,
  cableAddressOf,
  cardAddressOf,
  oneTargetRule,
  routerAddressOf,
  targetAccountIdIn,
  targetModelIdOf,
} from './canvas-wiring';
import { gateway, pulled } from './canvas-wiring.testkit';

describe('the one-target rule during a drag', () => {
  const valid = oneTargetRule(gateway);

  test('a cable from a virtual model onto another account rebinds, so it is welcome', () => {
    expect(valid(pulled('model:fast', 'target:creative'))).toBe(true);
  });

  test('a second cable onto the target already bound refuses', () => {
    expect(valid(pulled('model:fast', 'target:fast'))).toBe(false);
  });

  test('a draft takes any stored target', () => {
    expect(valid(pulled('draft', 'target:fast'))).toBe(true);
  });

  test('nothing lands on a card that is not a stored target', () => {
    expect(valid(pulled('model:fast', 'model:creative'))).toBe(false);
  });

  test('nothing leaves the gateway or a target by cable', () => {
    expect(valid(pulled('gateway', 'target:fast'))).toBe(false);
    expect(valid(pulled('target:fast', 'target:creative'))).toBe(false);
  });
});

describe('what a cable leaving a router may meet', () => {
  const valid = oneTargetRule(gateway);

  test('a cable from a router onto a stored target is welcome, because a router binds children', () => {
    expect(valid(pulled('route:pooled', 'target:fast'))).toBe(true);
    expect(valid(pulled('route:pooled', 'target:creative'))).toBe(true);
  });

  test('a cable onto a target the router already holds refuses, since one cable already stands', () => {
    expect(valid(pulled('route:pooled', 'target:pooled:t1'))).toBe(false);
    expect(valid(pulled('route:pooled', 'ghost:pooled:t2'))).toBe(false);
  });

  test('a ghost card is a landing too, because an account that left is still one to pool', () => {
    expect(valid(pulled('route:pooled', 'ghost:slow'))).toBe(true);
  });

  test('a cable from a route node holding a target rather than a router refuses', () => {
    expect(valid(pulled('route:pooled:t1', 'target:fast'))).toBe(false);
  });

  test('a cable from a router naming no stored definition refuses', () => {
    expect(valid(pulled('route:absent', 'target:fast'))).toBe(false);
  });

  test('a cable onto a route node holding a router rather than a target refuses', () => {
    expect(valid(pulled('route:pooled', 'target:pooled'))).toBe(false);
  });

  test('a router card takes no cable, because a router is never a thing a cable binds', () => {
    expect(valid(pulled('model:fast', 'route:pooled'))).toBe(false);
    expect(valid(pulled('draft', 'route:pooled'))).toBe(false);
    expect(valid(pulled('route:pooled', 'route:pooled'))).toBe(false);
  });
});

describe('what a route node card and cable name', () => {
  test('the model a child card belongs to reads without its route node riding along', () => {
    expect(targetModelIdOf('target:pooled:t1')).toBe('pooled');
    expect(targetModelIdOf('ghost:pooled:t2')).toBe('pooled');
    expect(targetModelIdOf('target:fast')).toBe('fast');
    expect(targetModelIdOf('route:pooled:t1')).toBeUndefined();
  });

  test('a cable below the entry still names the definition it serves', () => {
    expect(bindingCableId('cable:pooled:t1')).toBe('pooled');
    expect(bindingCableId('cable:fast')).toBe('fast');
    expect(bindingCableId('wire:model:fast')).toBeUndefined();
  });

  test('the account a child target holds is the one its own route node names', () => {
    expect(targetAccountIdIn(gateway, 'target:pooled:t1')).toBe('k1');
    expect(targetAccountIdIn(gateway, 'ghost:pooled:t2')).toBe('gone');
    expect(targetAccountIdIn(gateway, 'target:pooled')).toBeUndefined();
  });

  test('a cable names the route node its far end lands at, not just the definition holding it', () => {
    expect(cableAddressOf('cable:pooled:t1')).toEqual({ modelId: 'pooled', routeNodeId: 't1' });
    expect(cableAddressOf('cable:fast')).toEqual({ modelId: 'fast', routeNodeId: undefined });
    expect(cableAddressOf('wire:model:fast')).toBeUndefined();
  });

  test('a router card names where it seats, and no other card answers as one', () => {
    expect(routerAddressOf('route:pooled')).toEqual({ modelId: 'pooled', routeNodeId: undefined });
    expect(routerAddressOf('route:pooled:t1')).toEqual({ modelId: 'pooled', routeNodeId: 't1' });
    expect(routerAddressOf('target:pooled:t1')).toBeUndefined();
  });

  test('every card standing for a route node names its address, whichever prefix it wears', () => {
    expect(cardAddressOf('target:pooled:t1')).toEqual({ modelId: 'pooled', routeNodeId: 't1' });
    expect(cardAddressOf('ghost:pooled:t2')).toEqual({ modelId: 'pooled', routeNodeId: 't2' });
    expect(cardAddressOf('route:pooled')).toEqual({ modelId: 'pooled', routeNodeId: undefined });
    expect(cardAddressOf('model:fast')).toBeUndefined();
  });
});

describe('what a definition already answers through, read at its entry', () => {
  const valid = oneTargetRule(gateway);

  test('a pooled definition answers through no single account, so any target is a rebind', () => {
    expect(valid(pulled('model:pooled', 'target:fast'))).toBe(true);
    expect(valid(pulled('model:pooled', 'target:creative'))).toBe(true);
  });

  test('a definition the gateway never stored answers through nothing, so any target is welcome', () => {
    expect(valid(pulled('model:absent', 'target:fast'))).toBe(true);
  });
});
