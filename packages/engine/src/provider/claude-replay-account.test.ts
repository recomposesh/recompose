import { beforeEach, describe, expect, test } from 'vitest';

import type { Crossing, JsonObject } from '../gateway-wire';

import {
  clearClaudeReplayCache,
  observeClaudeReplay,
  prepareClaudeReplay,
} from './claude-replay-runtime';

const signedContent = [
  { type: 'thinking', thinking: 'full reasoning', signature: 'claude-signature' },
  { type: 'text', text: 'I will inspect the file.' },
  { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { path: 'README.md' } },
];

function aClaudeCrossing(): Crossing {
  return {
    dialect: 'anthropic',
    raw: {},
    gatewayName: 'workbench',
    virtualModel: 'sonnet',
    providerModel: 'claude-sonnet-4-5',
    replayScopeId: 'scope-1',
    callerFingerprint: 'caller-1',
    isCompat: true,
  };
}

function aCompactedBody(): JsonObject {
  return {
    messages: [
      { role: 'user', content: 'inspect' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'I will inspect the file.' },
          { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { path: 'README.md' } },
        ],
      },
    ],
  };
}

async function aTurnServedBy(accountId: string | undefined): Promise<void> {
  await observeClaudeReplay(
    aClaudeCrossing(),
    Response.json({ content: signedContent }),
    accountId,
  );
}

function whatTheNextTurnCarriesFor(accountId: string | undefined): JsonObject {
  return prepareClaudeReplay(aClaudeCrossing(), aCompactedBody(), accountId);
}

beforeEach(() => {
  clearClaudeReplayCache();
});

describe('signed thinking belongs to the Anthropic account that minted it', () => {
  test('sends a second account none of the first account signed thinking', async () => {
    await aTurnServedBy('account-a');

    expect(whatTheNextTurnCarriesFor('account-b')).toEqual(aCompactedBody());
  });

  test('still replays a turn back to the account that committed it', async () => {
    await aTurnServedBy('account-a');

    expect(whatTheNextTurnCarriesFor('account-a')).toHaveProperty(
      'messages.1.content',
      signedContent,
    );
  });

  test('holds nothing at all for a turn whose serving account it cannot name', async () => {
    await aTurnServedBy(undefined);

    expect(whatTheNextTurnCarriesFor(undefined)).toEqual(aCompactedBody());
  });
});
