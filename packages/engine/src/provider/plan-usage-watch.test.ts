import type { PlanUsageReading } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { publishPlanUsage, subscribeToPlanUsage } from './plan-usage-watch';

const READING: PlanUsageReading = {
  accountId: 'anthropic-personal',
  provider: 'anthropic',
  readAt: 1_700_000_000_000,
  windows: [{ length: '5h', spentShare: 0.42, resetsAt: 1_700_000_060_000 }],
};

function readingsHeard(): { heard: PlanUsageReading[]; letGo: () => void } {
  const heard: PlanUsageReading[] = [];

  return {
    heard,
    letGo: subscribeToPlanUsage((reading) => {
      heard.push(reading);
    }),
  };
}

describe('who hears what a vendor said about the plan behind one account', () => {
  test('a reader hears the account named and every window the vendor reported', () => {
    const { heard, letGo } = readingsHeard();

    publishPlanUsage(READING);
    letGo();

    expect(heard).toEqual([READING]);
  });

  test('a reader that let go hears nothing further, so no listener outlives its subscriber', () => {
    const { heard, letGo } = readingsHeard();

    letGo();
    publishPlanUsage(READING);

    expect(heard).toEqual([]);
  });

  test('a reader that breaks never keeps the next one from hearing', () => {
    const letBrokenGo = subscribeToPlanUsage(() => {
      throw new Error('this reader is gone');
    });
    const { heard, letGo } = readingsHeard();

    publishPlanUsage(READING);
    letBrokenGo();
    letGo();

    expect(heard).toEqual([READING]);
  });

  test('each answer speaks for itself, so a later reading never replaces an earlier telling', () => {
    const { heard, letGo } = readingsHeard();
    const later: PlanUsageReading = { ...READING, readAt: READING.readAt + 30_000 };

    publishPlanUsage(READING);
    publishPlanUsage(later);
    letGo();

    expect(heard).toEqual([READING, later]);
  });
});
