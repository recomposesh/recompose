import { describe, expect, test } from 'vitest';

import { engineCooldownReportSchema, gatewayCooldownsSchema } from './engine-cooldowns';

const LIFTS_AT = 1_700_000_060_000;

describe('the moment one route node stands back up', () => {
  const report = {
    kind: 'cooldown',
    slug: 'personal',
    virtualModel: 'fast',
    routeNode: 'j1',
    coolUntilMs: LIFTS_AT,
  };

  test('a report names the node standing down and the moment it lifts', () => {
    expect(engineCooldownReportSchema.parse(report)).toEqual(report);
  });

  test('a report is refused where the moment it lifts is not a whole one', () => {
    expect(() => engineCooldownReportSchema.parse({ ...report, coolUntilMs: 1.5 })).toThrow();
  });

  test('a report is refused where nothing says which node stood down', () => {
    expect(() => engineCooldownReportSchema.parse({ ...report, routeNode: '' })).toThrow();
  });

  test('a report carrying why the node stood down is refused, so no provider body crosses', () => {
    expect(() => engineCooldownReportSchema.parse({ ...report, detail: 'rate limited' })).toThrow();
  });
});

describe('every route node of every gateway that stands down', () => {
  const snapshot = { personal: { fast: { j1: LIFTS_AT } } };

  test('a moment files under the gateway, the virtual model, and the node standing down', () => {
    expect(gatewayCooldownsSchema.parse(snapshot)).toEqual(snapshot);
  });

  test('a gateway nothing stands down under reads as nothing rather than as missing', () => {
    expect(gatewayCooldownsSchema.parse({})).toEqual({});
  });

  test('a snapshot keyed by something no gateway could be named is refused', () => {
    expect(() => gatewayCooldownsSchema.parse({ UPPER: { fast: { j1: LIFTS_AT } } })).toThrow();
  });

  test('a snapshot naming no node between the model and the moment is refused', () => {
    expect(() => gatewayCooldownsSchema.parse({ personal: { fast: LIFTS_AT } })).toThrow();
  });
});
