import type { SpendGrant } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { Crossing } from '../gateway-wire';

import { copilotCatalog } from './copilot-catalog';
import { copilotReachFor } from './copilot-reach';
import { fetchAnswering } from './model-list.testkit';

const catalogBody = JSON.stringify({
  data: [
    { id: 'gpt-4.1', supported_endpoints: ['/chat/completions'] },
    { id: 'mai-code-1.1-flash', supported_endpoints: ['/responses'] },
  ],
});

function aCrossing(providerModel: string): Crossing {
  return {
    dialect: 'anthropic',
    raw: {},
    gatewayName: 'sample',
    virtualModel: 'smart',
    providerModel,
  };
}

function grantOf(provider: 'copilot' | 'kimi'): Extract<SpendGrant, { verdict: 'resolved' }> {
  return {
    verdict: 'resolved',
    providerOrigin: 'https://api.githubcopilot.com',
    spend: {
      custody: 'subscription',
      provider,
      accountId: 'acc-copilot',
      credential: 'a-copilot-plan-token',
      renewal: 'owning-tool',
    },
  };
}

function depsAnswering(body: string | null, status = 200) {
  const { fetchLike } = fetchAnswering(status, body);

  return { fetchLike, now: () => 0, catalog: copilotCatalog() };
}

describe('the reach a Copilot turn is stamped with', () => {
  test('moves a Responses-only model onto the Responses wire', async () => {
    const crossing = aCrossing('mai-code-1.1-flash');

    const dialect = await copilotReachFor(depsAnswering(catalogBody), crossing, grantOf('copilot'));

    expect(dialect).toBe('responses');
    expect(crossing.copilotPath).toBe('/responses');
  });

  test('leaves a completions model on the wire it already answered on', async () => {
    const crossing = aCrossing('gpt-4.1');

    const dialect = await copilotReachFor(depsAnswering(catalogBody), crossing, grantOf('copilot'));

    expect(dialect).toBe('chat-completions');
    expect(crossing.copilotPath).toBe('/chat/completions');
  });

  test('stamps nothing on a turn no Copilot plan is paying for', async () => {
    const crossing = aCrossing('kimi-k3');

    const dialect = await copilotReachFor(depsAnswering(catalogBody), crossing, grantOf('kimi'));

    expect(dialect).toBeNull();
    expect(crossing.copilotPath).toBeUndefined();
  });

  test('stamps nothing where no catalog is held to read', async () => {
    const crossing = aCrossing('mai-code-1.1-flash');
    const { fetchLike } = fetchAnswering(200, catalogBody);

    const dialect = await copilotReachFor(
      { fetchLike, now: () => 0 },
      crossing,
      grantOf('copilot'),
    );

    expect(dialect).toBeNull();
    expect(crossing.copilotPath).toBeUndefined();
  });
});

describe('the turns a Copilot catalog has no say over', () => {
  test('stamps nothing on a turn a pasted key is paying for', async () => {
    const crossing = aCrossing('mai-code-1.1-flash');
    const keyed: Extract<SpendGrant, { verdict: 'resolved' }> = {
      verdict: 'resolved',
      providerOrigin: 'https://api.githubcopilot.com',
      spend: { custody: 'credentialed', provider: 'copilot', credential: 'a-pasted-copilot-key' },
    };

    const dialect = await copilotReachFor(depsAnswering(catalogBody), crossing, keyed);

    expect(dialect).toBeNull();
    expect(crossing.copilotPath).toBeUndefined();
  });
});
