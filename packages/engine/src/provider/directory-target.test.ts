import type { ProviderDialect, SpendGrant } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import type { Crossing } from '../gateway-wire';

import { credentialedRequestHeaders } from './credentialed-headers';
import { credentialedDialect, credentialedRequestUrl } from './credentialed-target';

type ResolvedGrant = Extract<SpendGrant, { verdict: 'resolved' }>;

function crossingFor(overrides: Partial<Crossing> = {}): Crossing {
  return {
    dialect: 'chat-completions',
    raw: {},
    gatewayName: 'work',
    virtualModel: 'fast',
    providerModel: 'a-model',
    ...overrides,
  };
}

function grantFor(provider: string, origin: string, dialect?: ProviderDialect): ResolvedGrant {
  return {
    verdict: 'resolved',
    providerOrigin: origin,
    spend: {
      custody: 'credentialed',
      provider,
      credential: 'the-secret',
      ...(dialect === undefined ? {} : { dialect }),
    },
  };
}

describe('the dialect a vendor in the directory speaks', () => {
  it('answers Chat Completions for every aggregator the directory names', () => {
    for (const vendor of ['together', 'fireworks', 'groq', 'deepinfra', 'cerebras']) {
      expect(credentialedDialect(vendor, 'chat-completions'), vendor).toBe('chat-completions');
    }
  });

  it('answers Anthropic for a coding plan, whatever dialect the caller spoke', () => {
    for (const plan of ['zhipu', 'qwen-coding', 'minimax']) {
      expect(credentialedDialect(plan, 'chat-completions'), plan).toBe('anthropic');
      expect(credentialedDialect(plan, 'anthropic'), plan).toBe('anthropic');
    }
  });

  it('answers Responses for xAI, which the directory names ahead of the default', () => {
    expect(credentialedDialect('xai', 'chat-completions')).toBe('responses');
  });

  it('answers what a person stated for a provider the directory never named', () => {
    expect(credentialedDialect('my-own-server', 'chat-completions', 'anthropic')).toBe('anthropic');
    expect(credentialedDialect('my-own-server', 'anthropic', 'responses')).toBe('responses');
  });

  it('answers Chat Completions for a provider nobody stated a dialect for', () => {
    expect(credentialedDialect('my-own-server', 'anthropic')).toBe('chat-completions');
  });

  it('keeps Kimi speaking whichever dialect the caller opened with', () => {
    expect(credentialedDialect('kimi', 'anthropic')).toBe('anthropic');
    expect(credentialedDialect('kimi', 'chat-completions')).toBe('chat-completions');
  });
});

describe('the path a turn lands on', () => {
  it('lands a Chat Completions vendor on the versioned chat path', () => {
    const url = credentialedRequestUrl(
      grantFor('groq', 'https://api.groq.com/openai'),
      crossingFor(),
    );

    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
  });

  it('lands the one vendor carrying its version in its base on the bare chat path', () => {
    const url = credentialedRequestUrl(
      grantFor('deepinfra', 'https://api.deepinfra.com/v1/openai'),
      crossingFor(),
    );

    expect(url).toBe('https://api.deepinfra.com/v1/openai/chat/completions');
  });

  it('lands a coding plan on the messages path its dialect uses', () => {
    const url = credentialedRequestUrl(
      grantFor('zhipu', 'https://api.z.ai/api/anthropic'),
      crossingFor(),
    );

    expect(url).toBe('https://api.z.ai/api/anthropic/v1/messages');
  });

  it('lands an address a person stated as Anthropic on the messages path', () => {
    const url = credentialedRequestUrl(
      grantFor('my-own-server', 'https://models.example.com', 'anthropic'),
      crossingFor(),
    );

    expect(url).toBe('https://models.example.com/v1/messages');
  });
});

describe('the header a vendor reads its credential from', () => {
  it('hands every OpenAI-compatible vendor a bearer token', () => {
    for (const vendor of ['together', 'fireworks', 'groq', 'deepinfra', 'cerebras', 'mistral']) {
      const headers = credentialedRequestHeaders(
        grantFor(vendor, 'https://example.test').spend,
        crossingFor(),
      );

      expect(headers['authorization'], vendor).toBe('Bearer the-secret');
    }
  });

  it('hands a coding plan the version the Anthropic dialect is written against', () => {
    for (const plan of ['zhipu', 'qwen-coding', 'minimax']) {
      const headers = credentialedRequestHeaders(
        grantFor(plan, 'https://example.test').spend,
        crossingFor(),
      );

      expect(headers['authorization'], plan).toBe('Bearer the-secret');
      expect(headers['anthropic-version'], plan).toBe('2023-06-01');
    }
  });

  it('never hands a coding plan the key header a first-party Anthropic key uses', () => {
    const headers = credentialedRequestHeaders(
      grantFor('zhipu', 'https://example.test').spend,
      crossingFor(),
    );

    expect(headers).not.toHaveProperty('x-api-key');
  });

  it('hands an address a person stated as Anthropic the same version header', () => {
    const headers = credentialedRequestHeaders(
      grantFor('my-own-server', 'https://models.example.com', 'anthropic').spend,
      crossingFor({ dialect: 'anthropic' }),
    );

    expect(headers['anthropic-version']).toBe('2023-06-01');
  });
});
