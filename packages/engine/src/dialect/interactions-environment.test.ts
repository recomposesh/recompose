import { describe, expect, test } from 'vitest';

import type { InteractionsRequest } from './interactions-wire';

import { decodeRequest } from './interactions-request';
import { encodeRequest } from './interactions-request-encode';

function roundTripped(request: InteractionsRequest): InteractionsRequest {
  return encodeRequest(decodeRequest(request).value).value;
}

const asked: InteractionsRequest = { model: 'gemini-3-pro-preview', input: 'hello' };

describe('the environment an Interactions caller is working inside', () => {
  test('the environment it names survives the crossing', () => {
    const crossed = roundTripped({ ...asked, environment_id: 'env-7' });

    expect(crossed.environment_id).toBe('env-7');
  });

  test('the agent configuration it sends survives whole', () => {
    const crossed = roundTripped({ ...asked, agent_config: { max_total_tokens: 4096 } });

    expect(crossed.agent_config).toEqual({ max_total_tokens: 4096 });
  });

  test('a caller naming neither has neither invented for it', () => {
    const crossed = roundTripped(asked);

    expect(crossed.environment_id).toBeUndefined();
    expect(crossed.agent_config).toBeUndefined();
  });
});
