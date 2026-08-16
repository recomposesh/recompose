import { describe, expect, test } from 'vitest';

import { kimiSubscriptionModels } from '../subscription/kimi-models';
import { listProviderModels } from './model-list';
import { fetchAnswering, headersOf, onlyRequestOf } from './model-list.testkit';

const credential = 'sk-ant-api03-long-secret-7f2c';

const kimiOrigin = 'https://api.kimi.com/coding';

const copilotOrigin = 'https://api.githubcopilot.com';

const subscribedAs = (provider: 'kimi' | 'copilot') =>
  ({
    custody: 'subscription',
    provider,
    accountId: `acc-${provider}`,
    credential,
    renewal: 'owning-tool',
  }) as const;

describe('a subscription whose models recompose carries', () => {
  test('offers the ids its own plan serves, never another vendor list', async () => {
    const { sent, fetchLike } = fetchAnswering(200, JSON.stringify({ data: [{ id: 'gpt-5' }] }));

    const listing = await listProviderModels(fetchLike, kimiOrigin, subscribedAs('kimi'));

    expect(listing).toEqual({ standing: 'listed', modelIds: [...kimiSubscriptionModels] });
    expect(sent).toHaveLength(0);
  });
});

describe('a subscription whose models recompose does not carry', () => {
  test('reads its own catalog over the wire instead of another vendor list', async () => {
    const body = JSON.stringify({ data: [{ id: 'gpt-4o-copilot' }, { id: 'claude-sonnet-4-6' }] });
    const { sent, fetchLike } = fetchAnswering(200, body);

    const listing = await listProviderModels(fetchLike, copilotOrigin, subscribedAs('copilot'));

    expect(onlyRequestOf(sent).url).toBe('https://api.githubcopilot.com/v1/models');
    expect(listing).toEqual({
      standing: 'listed',
      modelIds: ['gpt-4o-copilot', 'claude-sonnet-4-6'],
    });
  });

  test('carries its own credential rather than reaching the vendor unauthenticated', async () => {
    const { sent, fetchLike } = fetchAnswering(200, JSON.stringify({ data: [{ id: 'gpt-4o' }] }));

    await listProviderModels(fetchLike, copilotOrigin, subscribedAs('copilot'));

    expect(headersOf(onlyRequestOf(sent)).get('Authorization')).toBe(`Bearer ${credential}`);
  });

  test('reads as unlisted where the vendor answers nothing, never as another vendor list', async () => {
    const { fetchLike } = fetchAnswering(404, null);

    const listing = await listProviderModels(fetchLike, copilotOrigin, subscribedAs('copilot'));

    expect(listing).toEqual({ standing: 'unlisted' });
  });
});
