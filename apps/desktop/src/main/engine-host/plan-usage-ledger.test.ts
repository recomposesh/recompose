import type { PlanUsageReadings } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { openPlanUsageDesk } from './plan-usage-ledger';

const READ_AT = 1_700_000_060_000;

function filedAs(accountId: string, windows: readonly unknown[], readAt = READ_AT) {
  return { accountId, provider: 'anthropic', readAt, windows };
}

function planRead(accountId: string, windows: readonly unknown[], readAt = READ_AT): unknown {
  return { kind: 'plan-usage', reading: filedAs(accountId, windows, readAt) };
}

function aDesk() {
  const pushed: PlanUsageReadings[] = [];

  return {
    pushed,
    desk: openPlanUsageDesk((readings) => {
      pushed.push(readings);
    }),
  };
}

describe('what the windows learn about a plan a vendor answered for', () => {
  test('a reading reaches the windows under its account the moment it lands', () => {
    const { pushed, desk } = aDesk();

    desk.hears(planRead('sub-1', [{ length: '5h', spentShare: 0.4 }]));

    expect(pushed).toEqual([{ 'sub-1': filedAs('sub-1', [{ length: '5h', spentShare: 0.4 }]) }]);
  });

  test('a newer reading replaces the one that account stood under', () => {
    const { pushed, desk } = aDesk();

    desk.hears(planRead('sub-1', [{ length: '5h', spentShare: 0.4 }]));
    desk.hears(planRead('sub-1', [{ length: '5h', spentShare: 0.6 }], READ_AT + 60_000));

    expect(pushed.at(-1)).toEqual({
      'sub-1': filedAs('sub-1', [{ length: '5h', spentShare: 0.6 }], READ_AT + 60_000),
    });
  });

  test('two accounts keep their readings apart, and every push carries both', () => {
    const { pushed, desk } = aDesk();

    desk.hears(planRead('sub-1', [{ length: '5h', spentShare: 0.4 }]));
    desk.hears(planRead('sub-2', [{ length: 'week', spentShare: 0.1 }]));

    expect(pushed.at(-1)).toEqual({
      'sub-1': filedAs('sub-1', [{ length: '5h', spentShare: 0.4 }]),
      'sub-2': filedAs('sub-2', [{ length: 'week', spentShare: 0.1 }]),
    });
  });

  test('a reset instant the vendor named rides across beside the share', () => {
    const { pushed, desk } = aDesk();
    const windows = [{ length: '5h', spentShare: 0.4, resetsAt: READ_AT + 3_600_000 }];

    desk.hears(planRead('sub-1', windows));

    expect(pushed.at(-1)).toEqual({ 'sub-1': filedAs('sub-1', windows) });
  });
});

describe('a word this desk never owns', () => {
  test('another desk keeps its own word, and nothing is filed here', () => {
    const { pushed, desk } = aDesk();

    expect(desk.hears({ kind: 'cooldown', slug: 'personal' })).toBe(false);
    expect(desk.hears(planRead('sub-1', [{ length: '5h', spentShare: 0.4 }]))).toBe(true);
    expect(pushed).toHaveLength(1);
  });

  test('a plan report naming no window at all is no reading, so nothing is filed', () => {
    const { pushed, desk } = aDesk();

    expect(desk.hears(planRead('sub-1', []))).toBe(false);
    expect(pushed).toEqual([]);
  });

  test('a share outside the fraction it is measured in is no reading', () => {
    const { pushed, desk } = aDesk();

    expect(desk.hears(planRead('sub-1', [{ length: '5h', spentShare: 40 }]))).toBe(false);
    expect(pushed).toEqual([]);
  });
});
