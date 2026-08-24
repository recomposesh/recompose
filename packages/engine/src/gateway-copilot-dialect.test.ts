import type { SpendGrant } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { ProviderAttempt } from './provider/telemetry-feed';

import { createGatewayApp } from './gateway-app';
import { aGatewayHolding } from './gateway-app.testkit';
import { aLadderOver, ASK, ORIGIN } from './gateway-router.testkit';
import { copilotCatalog } from './provider/copilot-catalog';
import { subscribeToProviderAttempts } from './provider/telemetry-feed';
import { subscriptionRuntime } from './subscription/reach';

const COPILOT_ORIGIN = 'https://api.githubcopilot.test';

const ACCOUNT = 'acc-copilot';

const MODEL = 'mai-code-1.1-flash';

const ANTHROPIC_ANSWER = JSON.stringify({
  usage: {
    input_tokens: 10,
    output_tokens: 5,
    cache_read_input_tokens: 2,
    cache_creation_input_tokens: 1,
  },
  content: [{ type: 'text', text: 'the answer' }],
});

const ANTHROPIC_TOTAL = 18;

const COMPLETIONS_READING_OF_THE_SAME_ANSWER = 15;

const copilotPlan: SpendGrant = {
  verdict: 'resolved',
  providerOrigin: COPILOT_ORIGIN,
  spend: {
    custody: 'subscription',
    provider: 'copilot',
    accountId: ACCOUNT,
    credential: 'plan-token',
    renewal: 'owning-tool',
  },
};

/**
 * A catalog already read, so the turn resolves its wire without a look leaving the machine.
 *
 * @summary The catalog read is held for ten minutes anyway, and seeding it is what keeps this story
 * about the dialect the wire settles rather than about the look that settles it.
 */
function catalogNaming(endpoint: string) {
  const catalog = copilotCatalog();

  catalog.set(ACCOUNT, {
    readAtMs: Date.now(),
    endpoints: new Map([[MODEL, [endpoint]]]),
  });

  return catalog;
}

async function tokensCountedFor(endpoint: string): Promise<number | undefined> {
  const attempts: ProviderAttempt[] = [];
  const forget = subscribeToProviderAttempts((attempt) => {
    attempts.push(attempt);
  });

  const app = createGatewayApp(
    aGatewayHolding(aLadderOver(MODEL)),
    async () => Promise.resolve(copilotPlan),
    async () =>
      Promise.resolve(
        new Response(ANTHROPIC_ANSWER, {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    { ...subscriptionRuntime(), copilotCatalog: catalogNaming(endpoint) },
  );

  try {
    const answer = await app.request(`${ORIGIN}/v1/messages`, {
      method: 'POST',
      body: JSON.stringify(ASK),
    });

    await answer.text();
  } finally {
    forget();
  }

  return attempts.at(-1)?.tokens;
}

describe('the tokens a Copilot turn is counted for', () => {
  test('a model reached on the messages wire is counted in that wire own dialect', async () => {
    expect(await tokensCountedFor('/v1/messages')).toBe(ANTHROPIC_TOTAL);
  });

  test('the vendor table never stands in for the wire the catalog named', async () => {
    expect(await tokensCountedFor('/v1/messages')).not.toBe(COMPLETIONS_READING_OF_THE_SAME_ANSWER);
  });
});
