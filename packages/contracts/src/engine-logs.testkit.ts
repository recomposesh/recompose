const servedAt = 1_754_600_000_000;

export const clientKey = 'sha256:8706ee88bbbdda48d02a4888691822b90d8b136bc5fb8e3a815e518105f0655c';

export const served = {
  id: 'log-1',
  at: servedAt,
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
  clientKey,
};

export const unreachable = {
  id: 'log-2',
  at: servedAt,
  gateway: 'relay',
  virtualModel: 'creative',
  origin: 'gateway',
  method: 'POST',
  status: 502,
  clientKey,
  failure: 'The gateway could not reach the target.',
};

export const unreadable = {
  id: 'log-3',
  at: servedAt,
  gateway: 'relay',
  origin: 'gateway',
  method: 'POST',
  status: 400,
  clientKey,
  failure: 'The gateway could not read the request.',
};
