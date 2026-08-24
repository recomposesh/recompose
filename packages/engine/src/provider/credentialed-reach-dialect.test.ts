import type { SpendGrant } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { Crossing, ProviderDialect } from '../gateway-wire';
import type { ProviderAttempt } from './telemetry-feed';

import { reachCredentialed } from './credentialed-reach';
import { withinServingTurn } from './serving-turn';
import { subscribeToProviderAttempts } from './telemetry-feed';

type ResolvedGrant = Extract<SpendGrant, { verdict: 'resolved' }>;

const ANTHROPIC_ANSWER = JSON.stringify({
  usage: {
    input_tokens: 10,
    output_tokens: 5,
    cache_read_input_tokens: 2,
    cache_creation_input_tokens: 1,
  },
});

const ANTHROPIC_TOTAL = 18;

const COMPLETIONS_READING_OF_THE_SAME_ANSWER = 15;

const GEMINI_ANSWER = JSON.stringify({
  usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 20, totalTokenCount: 60 },
});

const GEMINI_TOTAL = 60;

function copilotCrossing(upstreamDialect: ProviderDialect | undefined): Crossing {
  return {
    dialect: 'anthropic',
    raw: {},
    gatewayName: 'Build',
    virtualModel: 'claude-smart',
    providerModel: 'mai-code-1.1-flash',
    ...(upstreamDialect === undefined ? {} : { upstreamDialect }),
  };
}

const copilotGrant: ResolvedGrant = {
  verdict: 'resolved',
  providerOrigin: 'https://api.githubcopilot.test',
  spend: {
    custody: 'credentialed',
    provider: 'copilot',
    credential: 'plan-token',
    accountId: 'acc-copilot',
  },
};

function answering(payload: string): typeof fetch {
  return async () => {
    await Promise.resolve();

    return new Response(payload, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}

async function attemptOf(
  crossing: Crossing,
  payload: string,
): Promise<ProviderAttempt | undefined> {
  const attempts: ProviderAttempt[] = [];
  const forget = subscribeToProviderAttempts((attempt) => {
    attempts.push(attempt);
  });

  try {
    const answer = await withinServingTurn(
      { gateway: 'build', clientKey: 'client-1', method: 'POST', rowPublished: false },
      async () => reachCredentialed(crossing, copilotGrant, {}, answering(payload)),
    );

    await answer.text();
  } finally {
    forget();
  }

  return attempts.at(-1);
}

describe('the tokens one credentialed turn is counted for', () => {
  test('an answer on the wire the turn resolved is read in that wire own dialect', async () => {
    const attempt = await attemptOf(copilotCrossing('anthropic'), ANTHROPIC_ANSWER);

    expect(attempt?.tokens).toBe(ANTHROPIC_TOTAL);
  });

  test('a vendor serving three wires never reads one of them as another', async () => {
    const attempt = await attemptOf(copilotCrossing('anthropic'), ANTHROPIC_ANSWER);

    expect(attempt?.tokens).not.toBe(COMPLETIONS_READING_OF_THE_SAME_ANSWER);
  });

  test('a wire whose reading the vendor table never named still counts its tokens', async () => {
    const attempt = await attemptOf(copilotCrossing('gemini'), GEMINI_ANSWER);

    expect(attempt?.tokens).toBe(GEMINI_TOTAL);
  });

  test('a turn that resolved no wire falls back on the vendor the grant names', async () => {
    const attempt = await attemptOf(copilotCrossing(undefined), ANTHROPIC_ANSWER);

    expect(attempt?.tokens).toBe(COMPLETIONS_READING_OF_THE_SAME_ANSWER);
  });
});
