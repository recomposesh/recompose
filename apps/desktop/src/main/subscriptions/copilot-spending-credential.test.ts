import { beforeEach, describe, expect, test } from 'vitest';

import type { CopilotTradePort } from './copilot-spending-credential';

import { copilotSpendingCredential, forgetCopilotCredentials } from './copilot-spending-credential';

function portMinting(
  answers: readonly unknown[],
  nowMs: () => number,
): CopilotTradePort & {
  trades: number;
} {
  let turn = 0;
  const port = {
    trades: 0,
    nowMs,
    fetchLike: async () => {
      const body = answers[Math.min(turn, answers.length - 1)];

      turn += 1;
      port.trades += 1;

      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    },
  };

  return port;
}

const mintedAt = (secondsFromEpoch: number) => ({ token: 'tid=x', expires_at: secondsFromEpoch });

beforeEach(() => {
  forgetCopilotCredentials();
});

describe('the credential a Copilot turn carries', () => {
  test('the first turn buys one from the long-lived credential the vault holds', async () => {
    const port = portMinting([mintedAt(1_000)], () => 0);

    expect(await copilotSpendingCredential(port, 'acc-1', 'gho_the-token')).toBe('tid=x');
    expect(port.trades).toBe(1);
  });

  test('a second turn spends the one already bought rather than asking again', async () => {
    const port = portMinting([mintedAt(1_000)], () => 0);

    await copilotSpendingCredential(port, 'acc-1', 'gho_the-token');
    await copilotSpendingCredential(port, 'acc-1', 'gho_the-token');

    expect(port.trades).toBe(1);
  });

  test('a turn near the expiry buys the next one before the current one lapses', async () => {
    let nowMs = 0;
    const port = portMinting([mintedAt(100), mintedAt(500)], () => nowMs);

    await copilotSpendingCredential(port, 'acc-1', 'gho_the-token');
    nowMs = 50_000;

    expect(await copilotSpendingCredential(port, 'acc-1', 'gho_the-token')).toBe('tid=x');
    expect(port.trades).toBe(2);
  });

  test('two accounts never spend one another credential', async () => {
    const port = portMinting([mintedAt(1_000)], () => 0);

    await copilotSpendingCredential(port, 'acc-1', 'gho_one');
    await copilotSpendingCredential(port, 'acc-2', 'gho_two');

    expect(port.trades).toBe(2);
  });

  test('a refused trade answers nothing rather than serving a turn that cannot succeed', async () => {
    const port = portMinting([{ expires_at: 1_000 }], () => 0);

    expect(await copilotSpendingCredential(port, 'acc-1', 'gho_stale')).toBeNull();
  });

  test('a refused trade drops what it kept, so the next turn asks again', async () => {
    let nowMs = 0;
    const port = portMinting([mintedAt(1_000), {}], () => nowMs);

    await copilotSpendingCredential(port, 'acc-1', 'gho_the-token');
    nowMs = 999_000;
    await copilotSpendingCredential(port, 'acc-1', 'gho_the-token');
    await copilotSpendingCredential(port, 'acc-1', 'gho_the-token');

    expect(port.trades).toBe(3);
  });
});
