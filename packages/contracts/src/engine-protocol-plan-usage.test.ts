import { describe, expect, test } from 'vitest';

import { enginePlanUsageReportSchema } from './engine-protocol';

const READ_AT = 1_700_000_060_000;

describe('what the child says once a provider read its own plan', () => {
  const report = {
    kind: 'plan-usage',
    reading: {
      accountId: 'a1',
      provider: 'anthropic',
      readAt: READ_AT,
      windows: [{ length: '5h', spentShare: 0.235 }],
    },
  };

  test('a report carries one account reading, whole', () => {
    expect(enginePlanUsageReportSchema.parse(report)).toEqual(report);
  });

  test('a report answering a directive is refused, since nothing asked for a reading', () => {
    expect(() => enginePlanUsageReportSchema.parse({ ...report, answers: 'd1' })).toThrow();
  });

  test('a report is refused where the reading names no account', () => {
    expect(() =>
      enginePlanUsageReportSchema.parse({
        ...report,
        reading: { ...report.reading, accountId: '' },
      }),
    ).toThrow();
  });

  test('a reading of no windows at all is refused before it can cross', () => {
    expect(() =>
      enginePlanUsageReportSchema.parse({ ...report, reading: { ...report.reading, windows: [] } }),
    ).toThrow();
  });
});
