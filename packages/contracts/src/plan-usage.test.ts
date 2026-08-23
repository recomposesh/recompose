import { describe, expect, test } from 'vitest';

import { planUsageReadingSchema, planUsageWindowSchema } from './plan-usage';

const READ_AT = 1_700_000_060_000;

const RESETS_AT = 1_700_013_200_000;

describe('what a vendor says one plan window has spent', () => {
  const window = { length: '5h', spentShare: 0.235, resetsAt: RESETS_AT };

  test('a window carries the share spent and when the window resets', () => {
    expect(planUsageWindowSchema.parse(window)).toEqual(window);
  });

  test('a vendor that named no reset leaves the window without one rather than guessing', () => {
    expect(planUsageWindowSchema.parse({ length: 'week', spentShare: 0 })).toEqual({
      length: 'week',
      spentShare: 0,
    });
  });

  test('a share past the whole window is refused, since no reading can pass a hundred percent', () => {
    expect(() => planUsageWindowSchema.parse({ ...window, spentShare: 1.2 })).toThrow();
  });

  test('a share below nothing is refused, since a window cannot un-spend itself', () => {
    expect(() => planUsageWindowSchema.parse({ ...window, spentShare: -0.1 })).toThrow();
  });

  test('a window of a length no vendor reports is refused rather than passed along', () => {
    expect(() => planUsageWindowSchema.parse({ ...window, length: 'month' })).toThrow();
  });
});

describe('one account reading, as the last answer left it', () => {
  const reading = {
    accountId: 'a1',
    provider: 'anthropic',
    readAt: READ_AT,
    windows: [{ length: '5h', spentShare: 0.235, resetsAt: RESETS_AT }],
  };

  test('a reading names the account, the provider, and when it was taken', () => {
    expect(planUsageReadingSchema.parse(reading)).toEqual(reading);
  });

  test('a reading is refused where nothing says which account it belongs to', () => {
    expect(() => planUsageReadingSchema.parse({ ...reading, accountId: '' })).toThrow();
  });

  test('a reading is refused where the moment it was taken is not a whole one', () => {
    expect(() => planUsageReadingSchema.parse({ ...reading, readAt: 1.5 })).toThrow();
  });

  test('a reading carrying the vendor body it came from is refused, so no answer crosses', () => {
    expect(() => planUsageReadingSchema.parse({ ...reading, body: 'over limit' })).toThrow();
  });
});
