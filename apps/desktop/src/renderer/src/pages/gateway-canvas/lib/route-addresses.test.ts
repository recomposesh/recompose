import { fc, test as propertyTest } from '@fast-check/vitest';
import { describe, expect, test } from 'vitest';

import { gatewaySeed } from '../../../shared/testing';
import { addressName, addressUnder, addressWritten, routeNodeIn } from './route-addresses';

const MIGRATED_NODE = 'seat:sonnet';

const migratedThenRoutered = gatewaySeed({
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8397,
  virtualModels: [
    {
      id: 'sonnet',
      displayName: 'Sonnet',
      routing: {
        entry: 'r1',
        nodes: {
          r1: { kind: 'router', policy: { mode: 'failover' }, children: [MIGRATED_NODE] },
          [MIGRATED_NODE]: {
            kind: 'target',
            accountId: 'k1',
            providerModel: 'claude-sonnet-5',
          },
        },
      },
    },
  ],
});

const colonFreeModelId = fc.stringMatching(/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/u);
const anyRouteNodeId = fc.oneof(
  fc.uuid(),
  colonFreeModelId.map((modelId) => `seat:${modelId}`),
);

describe('the address a card or cable carries', () => {
  test('a route node the version 4 migration minted survives the round trip', () => {
    const written = addressWritten({ modelId: 'sonnet', routeNodeId: MIGRATED_NODE });

    expect(written).toBe('sonnet:seat:sonnet');
    expect(addressUnder(['target:'], `target:${written}`)).toEqual({
      modelId: 'sonnet',
      routeNodeId: MIGRATED_NODE,
    });
  });

  test('an entry card carries the bare model id and no route node', () => {
    expect(addressUnder(['target:'], 'target:sonnet')).toEqual({
      modelId: 'sonnet',
      routeNodeId: undefined,
    });
  });

  test('a card wearing none of the prefixes names no address', () => {
    expect(addressUnder(['target:', 'ghost:'], 'wire:model:sonnet')).toBeUndefined();
  });

  propertyTest.prop([colonFreeModelId, anyRouteNodeId])(
    'writing an address and reading it back hands the same two parts over',
    (modelId, routeNodeId) => {
      const written = addressWritten({ modelId, routeNodeId });

      expect(addressUnder(['route:'], `route:${written}`)).toEqual({ modelId, routeNodeId });
    },
  );
});

describe('the stored route node an address resolves to', () => {
  test('a migrated binding displaced under a router still resolves to its target', () => {
    const written = addressName('sonnet', MIGRATED_NODE, 'r1');

    expect(
      routeNodeIn(migratedThenRoutered, addressUnder(['target:'], `target:${written}`)),
    ).toEqual({ kind: 'target', accountId: 'k1', providerModel: 'claude-sonnet-5' });
  });

  test('the entry answers where the address names no route node', () => {
    expect(routeNodeIn(migratedThenRoutered, { modelId: 'sonnet' })).toEqual({
      kind: 'router',
      policy: { mode: 'failover' },
      children: [MIGRATED_NODE],
    });
  });

  test('an address naming a model the gateway never served resolves to nothing', () => {
    expect(routeNodeIn(migratedThenRoutered, { modelId: 'gone' })).toBeUndefined();
  });
});
