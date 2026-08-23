import { describe, expect, test } from 'vitest';

import type { Crossing } from '../gateway-wire';

import { credentialedRequestBody } from './credentialed-target';

const grant = {
  verdict: 'resolved',
  providerOrigin: 'https://api.groq.com/openai',
  spend: {
    custody: 'credentialed',
    provider: 'groq',
    accountId: 'acc-groq',
    credential: 'a-pasted-groq-key',
  },
} as const;

function aCrossing(raw: Record<string, unknown>): Crossing {
  return {
    dialect: 'chat-completions',
    raw,
    gatewayName: 'sample',
    virtualModel: 'fast',
    providerModel: 'groq/compound',
    outputCeiling: 1000,
  };
}

describe('an override that asks past the ceiling its model states', () => {
  test('is brought down like any other ask', () => {
    const body = {
      model: 'groq/compound',
      max_tokens: 500,
      provider_payload_override: { max_tokens: 99_000 },
    };

    const sent = credentialedRequestBody(grant, aCrossing(body), body);

    expect(sent['max_tokens']).toBe(1000);
    expect(sent['provider_payload_override']).toBeUndefined();
  });

  test('leaves an override already inside the ceiling as the caller wrote it', () => {
    const body = {
      model: 'groq/compound',
      max_tokens: 900,
      provider_payload_override: { max_tokens: 800 },
    };

    expect(credentialedRequestBody(grant, aCrossing(body), body)['max_tokens']).toBe(800);
  });
});
