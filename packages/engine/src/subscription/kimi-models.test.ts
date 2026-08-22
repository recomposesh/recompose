import { describe, expect, test } from 'vitest';

import { normalizeKimiUpstreamModel } from '../provider/kimi-request';
import { kimiSubscriptionModels } from './kimi-models';

const SERVED_BY_THE_CODING_PLAN = ['k3', 'k3-256k', 'kimi-for-coding', 'kimi-for-coding-highspeed'];

const RETIRED_BY_THE_VENDOR = ['kimi-k2', 'kimi-k2.5', 'kimi-k2.6'];

describe('what a Kimi subscription offers', () => {
  test('every id it offers folds to one the coding plan serves', () => {
    const upstream = kimiSubscriptionModels.map((id) => normalizeKimiUpstreamModel(id));

    expect([...upstream].sort()).toEqual([...SERVED_BY_THE_CODING_PLAN].sort());
  });

  test('a model the vendor retired is offered to nobody', () => {
    for (const retired of RETIRED_BY_THE_VENDOR) {
      expect(kimiSubscriptionModels).not.toContain(retired);
    }
  });
});
