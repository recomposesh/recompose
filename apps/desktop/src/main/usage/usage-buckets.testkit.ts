import type { LogRow } from '@recompose/contracts';

const HOUR = 3_600_000;

/** The hour every bucket story opens in, so a stamp is a fixed number. */
export const anHourStart = 1_754_600_400_000 - (1_754_600_400_000 % HOUR);

export const CLIENT_KEY = `sha256:${'a'.repeat(64)}`;

export type RowStanding = {
  at?: number;
  status?: number;
  origin?: LogRow['origin'];
  accountId?: string;
  durationMs?: number | undefined;
  tokens?: number;
  usage?: LogRow['usage'];
};

export function served(id: string, standing: RowStanding = {}): LogRow {
  const { at = anHourStart + 60_000, status = 200, origin = 'provider', ...spent } = standing;

  return {
    id,
    at,
    gateway: 'relay',
    virtualModel: 'creative',
    origin,
    method: 'POST',
    provider: 'anthropic',
    accountId: 'work',
    providerModel: 'claude-sonnet-4-5',
    status,
    durationMs: 912,
    tokens: 1_820,
    usage: { input: 1_200, output: 480, cacheRead: 96, cacheWrite: 32, reasoning: 12 },
    clientKey: CLIENT_KEY,
    ...spent,
  };
}
