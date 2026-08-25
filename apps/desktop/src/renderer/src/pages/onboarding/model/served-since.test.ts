import type { GatewayTraffic } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import { lastServedAt, servedSince } from './served-since';

const served = (at: number) => ({ outcome: 'served' as const, at });

const traffic: GatewayTraffic = {
  'my-gateway': {
    'claude-my-model': { 'seat:1': served(1200), 'seat:2': { outcome: 'live', at: 1400 } },
  },
  other: { fast: { 'seat:1': served(9000) } },
};

describe('when the gateway last answered well', () => {
  it('reads the newest served moment under the gateway', () => {
    expect(lastServedAt(traffic, 'my-gateway')).toBe(1200);
  });

  it('reads nothing where the gateway has served nothing', () => {
    expect(lastServedAt({ 'my-gateway': { fast: {} } }, 'my-gateway')).toBeUndefined();
  });

  it('reads nothing where no traffic stands under the gateway at all', () => {
    expect(lastServedAt({}, 'my-gateway')).toBeUndefined();
  });

  it('never reads another gateway´s traffic', () => {
    expect(lastServedAt(traffic, 'my-gateway')).not.toBe(9000);
  });

  it('passes over an outcome that is not a served one', () => {
    expect(
      lastServedAt(
        { 'my-gateway': { fast: { 'seat:1': { outcome: 'live', at: 5000 } } } },
        'my-gateway',
      ),
    ).toBeUndefined();
  });
});

describe('whether a request landed since the wait began', () => {
  it('reads an arrival where nothing had served before', () => {
    expect(servedSince(undefined, 1200)).toBe(true);
  });

  it('reads an arrival where the moment moved on', () => {
    expect(servedSince(1200, 1400)).toBe(true);
  });

  it('reads no arrival where the same moment still stands', () => {
    expect(servedSince(1200, 1200)).toBe(false);
  });

  it('reads no arrival while nothing has served at all', () => {
    expect(servedSince(undefined, undefined)).toBe(false);
  });
});
