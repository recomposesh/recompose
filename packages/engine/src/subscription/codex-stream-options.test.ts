import { expect, test } from 'vitest';

import { codexProviderRequest } from './codex-request';

test('Codex preserves only sequential reasoning-summary delivery from stream options', () => {
  const request = codexProviderRequest(
    'https://chatgpt.com/backend-api/codex',
    {
      model: 'gpt-5.6',
      input: [],
      stream_options: {
        reasoning_summary_delivery: 'sequential_cutoff',
        include_usage: true,
      },
    },
    { accessToken: 'codex-access' },
    'session-1',
  );

  expect(JSON.parse(request.body)).toHaveProperty('stream_options', {
    reasoning_summary_delivery: 'sequential_cutoff',
  });
});
