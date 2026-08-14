import type { GatewayConfig, GatewayTraffic } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION } from '@recompose/contracts';
import { describe, expect, test } from 'vitest';

import { carriedBy, latestAcrossNodes } from './cable-traffic';

const codex: GatewayConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'codex',
  displayName: 'Codex',
  port: 8397,
  virtualModels: [],
  layout: { nodes: {} },
};

const earlier = 1_754_600_000_000;

const later = earlier + 1_000;

const JUST_AFTER = later + 500;

const servedEarlier = { outcome: 'served', at: earlier } as const;

const failedLater = {
  outcome: 'failed',
  at: later,
  status: 502,
  detail: 'The gateway could not reach the target.',
} as const;

function flowing(nodes: GatewayTraffic[string][string]): GatewayTraffic {
  return { codex: { fast: nodes } };
}

describe('the readings one gateway still has a tint for', () => {
  test('every node a request walked keeps its own reading, so two cables can differ', () => {
    const walked = flowing({ first: servedEarlier, second: failedLater });

    expect(carriedBy(codex, walked, JUST_AFTER)).toEqual({
      fast: { first: servedEarlier, second: failedLater },
    });
  });

  test('a direct binding keeps the one node it stands on', () => {
    expect(carriedBy(codex, flowing({ only: servedEarlier }), JUST_AFTER)).toEqual({
      fast: { only: servedEarlier },
    });
  });

  test('a virtual model no attempt has landed under yet carries nothing', () => {
    expect(carriedBy(codex, flowing({}), JUST_AFTER)).toEqual({});
  });

  test('a gateway nothing has flowed through carries nothing', () => {
    expect(carriedBy(codex, {}, JUST_AFTER)).toEqual({});
  });

  test('a served reading older than the minute drops out, so its cable cools', () => {
    const stale = flowing({ only: servedEarlier });

    expect(carriedBy(codex, stale, earlier + 60_001)).toEqual({});
  });

  test('a node that cooled drops out while its warm sibling stays', () => {
    const half = flowing({ first: servedEarlier, second: failedLater });

    expect(carriedBy(codex, half, earlier + 60_001)).toEqual({ fast: { second: failedLater } });
  });

  test('a failed reading stays however long the traffic goes quiet', () => {
    const broken = flowing({ only: failedLater });

    expect(carriedBy(codex, broken, later + 60_001)).toEqual({ fast: { only: failedLater } });
  });
});

describe('the reading the gateway wire wears when a request walked more than one node', () => {
  test('the newest attempt is the one the wire wears, whatever an older one came to', () => {
    expect(latestAcrossNodes({ first: servedEarlier, second: failedLater })).toEqual(failedLater);
  });

  test('the newest attempt wins from either side of the table, so key order decides nothing', () => {
    expect(latestAcrossNodes({ second: failedLater, first: servedEarlier })).toEqual(failedLater);
  });

  test('two readings from the same instant settle on the last node the table names', () => {
    const tied = { ...failedLater, at: earlier };

    expect(latestAcrossNodes({ first: servedEarlier, second: tied })).toEqual(tied);
  });

  test('a single attempt is its own newest, so a direct binding reads as it always did', () => {
    expect(latestAcrossNodes({ only: servedEarlier })).toEqual(servedEarlier);
  });

  test('a model no reading stayed warm for wears nothing', () => {
    expect(latestAcrossNodes({})).toBeUndefined();
    expect(latestAcrossNodes(undefined)).toBeUndefined();
  });
});
