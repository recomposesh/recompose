import type { LookCustody } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { listProviderModels } from './model-list';
import { fetchAnswering } from './model-list.testkit';

const copilotOrigin = 'https://api.githubcopilot.com';

const copilotCustody: LookCustody = {
  custody: 'subscription',
  provider: 'copilot',
  accountId: 'acc-copilot',
  credential: 'a-copilot-plan-token',
  renewal: 'owning-tool',
};

const keyedCustody: LookCustody = {
  custody: 'provider-key',
  provider: 'openai',
  credential: 'a-pasted-openai-key',
};

describe('a Copilot catalog naming models that answer no turn', () => {
  test('offers only the models whose own catalog calls them chat models', async () => {
    const body = JSON.stringify({
      data: [
        { id: 'gpt-4.1', capabilities: { type: 'chat' } },
        { id: 'text-embedding-3-small', capabilities: { type: 'embeddings' } },
        { id: 'gpt-41-copilot', capabilities: { type: 'completion' } },
        { id: 'claude-haiku-4.5', capabilities: { type: 'chat' } },
      ],
    });
    const { fetchLike } = fetchAnswering(200, body);

    const listing = await listProviderModels(fetchLike, copilotOrigin, copilotCustody);

    expect(listing).toEqual({
      standing: 'listed',
      modelIds: ['gpt-4.1', 'claude-haiku-4.5'],
    });
  });

  test('keeps a model whose catalog says nothing of what it answers', async () => {
    const body = JSON.stringify({ data: [{ id: 'gpt-4.1' }, { id: 'exec-agent-a' }] });
    const { fetchLike } = fetchAnswering(200, body);

    const listing = await listProviderModels(fetchLike, copilotOrigin, copilotCustody);

    expect(listing).toEqual({ standing: 'listed', modelIds: ['gpt-4.1', 'exec-agent-a'] });
  });
});

describe('a catalog belonging to a vendor that states no such thing', () => {
  test('offers every model the vendor named, whatever it says of them', async () => {
    const body = JSON.stringify({
      data: [{ id: 'text-embedding-3-large', capabilities: { type: 'embeddings' } }],
    });
    const { fetchLike } = fetchAnswering(200, body);

    const listing = await listProviderModels(fetchLike, 'https://api.openai.com/v1', keyedCustody);

    expect(listing).toEqual({ standing: 'listed', modelIds: ['text-embedding-3-large'] });
  });
});
