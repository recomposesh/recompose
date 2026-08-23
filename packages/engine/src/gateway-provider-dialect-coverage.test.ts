import type { SpendGrant } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import { dialectFor } from './gateway-provider-dialect';

describe('dialectFor: a spend request the router could not resolve', () => {
  it('falls back to the neutral dialect when no target answered', () => {
    expect(dialectFor({ verdict: 'missing-target' }, 'anthropic')).toBe('chat-completions');
  });

  it('falls back to the neutral dialect when the target has no credential', () => {
    expect(dialectFor({ verdict: 'missing-credential' }, 'responses')).toBe('chat-completions');
  });
});

describe('dialectFor: a resolved subscription target', () => {
  it('speaks Gemini to an Antigravity subscription whatever the caller spoke', () => {
    const grant: SpendGrant = {
      verdict: 'resolved',
      providerOrigin: 'https://example.test',
      spend: {
        custody: 'subscription',
        renewal: 'app',
        provider: 'antigravity',
        accountId: 'account-1',
        credential: '{"type":"antigravity"}',
      },
    };

    expect(dialectFor(grant, 'anthropic')).toBe('gemini');
  });
});

describe('dialectFor: a resolved Kimi plan', () => {
  const kimiPlan = (): SpendGrant => ({
    verdict: 'resolved',
    providerOrigin: 'https://api.kimi.com/coding',
    spend: {
      custody: 'subscription',
      renewal: 'app',
      provider: 'kimi',
      accountId: 'account-1',
      credential: '{"type":"kimi","access_token":"kimi-access"}',
    },
  });

  it('follows a caller speaking Anthropic, the way a pasted Kimi key already does', () => {
    expect(dialectFor(kimiPlan(), 'anthropic')).toBe('anthropic');
  });

  it('follows a caller speaking anything else into the compatible dialect', () => {
    expect(dialectFor(kimiPlan(), 'chat-completions')).toBe('chat-completions');
    expect(dialectFor(kimiPlan(), 'responses')).toBe('chat-completions');
  });

  it('never translates a Kimi plan turn into the Responses dialect Codex speaks', () => {
    expect(dialectFor(kimiPlan(), 'anthropic')).not.toBe('responses');
  });
});

describe('dialectFor: a resolved Copilot plan', () => {
  const copilotPlan = (): SpendGrant => ({
    verdict: 'resolved',
    providerOrigin: 'https://api.githubcopilot.com',
    spend: {
      custody: 'subscription',
      renewal: 'app',
      provider: 'copilot',
      accountId: 'account-1',
      credential: 'tid=abc;exp=1787430000',
    },
  });

  it('speaks the OpenAI-compatible dialect Copilot serves, whatever the caller spoke', () => {
    expect(dialectFor(copilotPlan(), 'anthropic')).toBe('chat-completions');
    expect(dialectFor(copilotPlan(), 'responses')).toBe('chat-completions');
  });

  it('never translates a Copilot turn into the Responses dialect Codex speaks', () => {
    expect(dialectFor(copilotPlan(), 'chat-completions')).not.toBe('responses');
  });
});
