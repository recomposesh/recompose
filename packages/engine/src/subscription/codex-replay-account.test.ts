import type { SpendGrant } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import type { JsonObject, ProxyDialect } from '../gateway-wire';

import { codexCredential, runtimeAnswering } from '../gateway-proxy-subscription.testkit';
import { isJsonObject, parsedJson } from '../gateway-wire';
import { ClaudeDiagnostics } from './claude-diagnostics';
import { CodexReasoningReplay } from './codex-replay';
import { reachSubscription } from './reach';
import { codexReplayKey, observeSubscriptionAnswer } from './reach-observation';

type Resolved = Extract<SpendGrant, { verdict: 'resolved' }>;
type SubscriptionSpend = Extract<Resolved['spend'], { custody: 'subscription' }>;
type SubscriptionGrant = Resolved & { spend: SubscriptionSpend };
type Answering = ReturnType<typeof runtimeAnswering>;

const SESSION = 'one-conversation';

const REASONING = {
  type: 'reasoning',
  id: 'rs_1',
  encrypted_content:
    'gAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

const ASSISTANT = {
  type: 'message',
  role: 'assistant',
  content: [{ type: 'output_text', text: 'answer' }],
};

function anOpenAiAccount(accountId: string): SubscriptionGrant {
  return {
    verdict: 'resolved',
    providerOrigin: 'https://chatgpt.com/backend-api/codex',
    spend: {
      custody: 'subscription',
      renewal: 'app',
      provider: 'openai',
      accountId,
      credential: codexCredential(),
    },
  };
}

function anAnthropicAccount(accountId: string): SubscriptionGrant {
  return {
    verdict: 'resolved',
    providerOrigin: 'https://api.anthropic.com',
    spend: {
      custody: 'subscription',
      renewal: 'app',
      provider: 'anthropic',
      accountId,
      credential: codexCredential(),
    },
  };
}

function anAnswerCarryingReasoning(): Response {
  return new Response(
    `data: ${JSON.stringify({
      type: 'response.completed',
      response: { output: [REASONING, ASSISTANT] },
    })}\n\n`,
    { headers: { 'content-type': 'text/event-stream' } },
  );
}

async function slotAfterObserving(
  grant: SubscriptionGrant,
  sourceDialect: ProxyDialect,
): Promise<unknown> {
  const codexReplay = new CodexReasoningReplay();
  const runtime = { diagnostics: new ClaudeDiagnostics(), codexReplay };
  const scope = { sessionId: SESSION, sourceDialect, replayScopeId: SESSION };
  const observed = await observeSubscriptionAnswer(
    grant,
    opening(),
    anAnswerCarryingReasoning(),
    runtime,
    scope,
  );

  await observed.text();

  return codexReplay.inject(codexReplayKey(grant.spend.accountId, opening(), SESSION), {
    input: [ASSISTANT, { type: 'message', role: 'user', content: [] }],
  })['input'];
}

function committingThenPlain(): () => Response {
  let sent = 0;

  return () => {
    sent += 1;

    return sent === 1
      ? new Response(
          `data: ${JSON.stringify({
            type: 'response.completed',
            response: { output: [REASONING, ASSISTANT] },
          })}\n\n`,
          { headers: { 'content-type': 'text/event-stream' } },
        )
      : Response.json({ id: 'response_2', status: 'completed', output: [] });
  };
}

function opening(): JsonObject {
  return { model: 'gpt-5.4', input: [{ type: 'message', role: 'user', content: [] }] };
}

function resuming(): JsonObject {
  return { model: 'gpt-5.4', input: [ASSISTANT, { type: 'message', role: 'user', content: [] }] };
}

function sealedItemsSentAt(answering: Answering, at: number): unknown[] {
  const raw = answering.sent[at]?.request.body;
  const body = typeof raw === 'string' ? parsedJson(raw) : undefined;
  const input = isJsonObject(body) ? body['input'] : undefined;

  return Array.isArray(input)
    ? input.filter((item) => isJsonObject(item) && item['type'] === 'reasoning')
    : [];
}

async function twoTurnsOver(
  first: SubscriptionGrant,
  second: SubscriptionGrant,
): Promise<Answering> {
  const answering = runtimeAnswering(committingThenPlain());
  const runtime = { ...answering.runtime, codexReplay: new CodexReasoningReplay() };

  await (await reachSubscription(first, opening(), runtime, SESSION, 'anthropic')).text();
  await reachSubscription(second, resuming(), runtime, SESSION, 'anthropic');

  return answering;
}

describe('encrypted reasoning belongs to the account that minted it', () => {
  it('sends a second account none of the first account sealed reasoning', async () => {
    const answering = await twoTurnsOver(anOpenAiAccount('acc-a'), anOpenAiAccount('acc-b'));

    expect(sealedItemsSentAt(answering, 1)).toEqual([]);
  });

  it('still replays a turn back to the account that committed it', async () => {
    const answering = await twoTurnsOver(anOpenAiAccount('acc-a'), anOpenAiAccount('acc-a'));

    expect(sealedItemsSentAt(answering, 1)).toEqual([{ ...REASONING, summary: [], content: null }]);
  });
});

describe('the slot a Codex turn keeps its sealed reasoning in', () => {
  it('is named by the account, the provider model, and the replay scope together', () => {
    expect(codexReplayKey('acc-a', { model: 'gpt-5.4' }, 'scope-1')).toBe(
      'acc-a\0gpt-5.4\0scope-1',
    );
  });

  it('leaves the model blank where the turn names none a provider would read', () => {
    expect(codexReplayKey('acc-a', { model: 7 }, 'scope-1')).toBe('acc-a\0\0scope-1');
  });

  it('keeps two models on one account and one scope in slots of their own', () => {
    expect(codexReplayKey('acc-a', { model: 'gpt-5.4' }, 'scope-1')).not.toBe(
      codexReplayKey('acc-a', { model: 'gpt-5-codex' }, 'scope-1'),
    );
  });
});

describe('a Codex replay store holds only what its own provider and dialect earned', () => {
  it('keeps the turn an OpenAI account served an Anthropic-dialect caller', async () => {
    await expect(slotAfterObserving(anOpenAiAccount('acc-a'), 'anthropic')).resolves.toContainEqual(
      expect.objectContaining({ encrypted_content: REASONING.encrypted_content }),
    );
  });

  it('holds nothing for an Anthropic account, whose turns it could never replay', async () => {
    await expect(slotAfterObserving(anAnthropicAccount('acc-a'), 'anthropic')).resolves.toEqual([
      ASSISTANT,
      { type: 'message', role: 'user', content: [] },
    ]);
  });

  it('holds nothing for a caller that already speaks the Responses dialect natively', async () => {
    await expect(slotAfterObserving(anOpenAiAccount('acc-a'), 'responses')).resolves.toEqual([
      ASSISTANT,
      { type: 'message', role: 'user', content: [] },
    ]);
  });
});
