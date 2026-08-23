import { describe, expect, test } from 'vitest';

import { balanceFromAnswer } from './balances';

describe('the shapes each vendor answers a balance in', () => {
  test('DeepSeek states what is left, in the currency the entry names', () => {
    expect(
      balanceFromAnswer('deepseek', {
        is_available: true,
        balance_infos: [{ currency: 'USD', total_balance: '12.34' }],
      }),
    ).toEqual({ read: { remaining: 12.34, currency: 'USD' } });
  });

  test('a DeepSeek account the vendor calls unavailable refuses rather than printing a figure', () => {
    const answer = balanceFromAnswer('deepseek', { is_available: false, balance_infos: [] });

    expect('refusal' in answer).toBe(true);
  });

  test('Kimi states its available balance, which its docs count in one currency per host', () => {
    expect(balanceFromAnswer('moonshot', { data: { available_balance: 8.5 } })).toEqual({
      read: { remaining: 8.5 },
    });
  });

  test('a shape the vendor moved refuses rather than reading as an empty wallet', () => {
    expect('refusal' in balanceFromAnswer('deepseek', { balance_infos: 'moved' })).toBe(true);
  });
});
