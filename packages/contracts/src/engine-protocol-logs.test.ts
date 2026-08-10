import { describe, expect, test } from 'vitest';

import { engineLogReportSchema, engineReportSchema } from './engine-protocol';

const row = {
  id: 'log-1',
  at: 1_754_600_000_000,
  gateway: 'relay',
  virtualModel: 'creative',
  origin: 'provider',
  method: 'POST',
  provider: 'anthropic',
  accountId: 'work',
  providerModel: 'claude-sonnet-4-5',
  status: 200,
  durationMs: 912,
  tokens: 1_820,
  clientKey: 'sha256:1f0c8a4d2b6e',
};

const report = { kind: 'log', row };

describe('what the child tells the parent about a logged request', () => {
  test('one report carries one row, which the logs desk gathers into batches', () => {
    expect(engineLogReportSchema.parse(report)).toEqual(report);
  });

  test('a report answering a directive is refused, because nothing asked for it', () => {
    expect(() => engineLogReportSchema.parse({ ...report, answers: 'directive-1' })).toThrow();
  });

  test('a report carrying no row is refused, because there would be nothing to list', () => {
    expect(() => engineLogReportSchema.parse({ kind: 'log' })).toThrow();
  });

  test('a report carrying what was asked is refused, so no prompt can cross', () => {
    expect(() =>
      engineLogReportSchema.parse({ ...report, row: { ...row, prompt: 'my secret plan' } }),
    ).toThrow();
  });

  test('a report carrying a credential is refused', () => {
    expect(() => engineLogReportSchema.parse({ ...report, credential: 'sk-live' })).toThrow();
  });

  test('a log rides beside the answers, so no directive report reads as a log', () => {
    expect(() => engineReportSchema.parse(report)).toThrow();
  });
});
