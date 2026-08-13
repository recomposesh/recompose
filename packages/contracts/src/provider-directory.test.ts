import { describe, expect, test } from 'vitest';

import {
  documentedKeyOpeningOf,
  providerDialectSchema,
  vendorEndpointOf,
  vendorEndpoints,
} from './provider-directory';

describe('the dialects a stored account may name', () => {
  test('exactly the five the gateway speaks', () => {
    expect(providerDialectSchema.options).toEqual([
      'anthropic',
      'chat-completions',
      'gemini',
      'interactions',
      'responses',
    ]);
  });

  test('a dialect nothing translates is refused', () => {
    for (const unspoken of ['completions', 'ollama', 'grpc', '']) {
      expect(() => providerDialectSchema.parse(unspoken)).toThrow();
    }
  });
});

describe('what every vendor in the directory holds', () => {
  test('every vendor the directory names carries an origin no path can be appended twice to', () => {
    for (const [vendor, endpoint] of Object.entries(vendorEndpoints)) {
      expect(URL.canParse(endpoint.origin), vendor).toBe(true);
      expect(endpoint.origin.endsWith('/'), vendor).toBe(false);
    }
  });

  test('every vendor the directory names speaks a dialect the gateway translates', () => {
    for (const [vendor, endpoint] of Object.entries(vendorEndpoints)) {
      expect(providerDialectSchema.safeParse(endpoint.dialect).success, vendor).toBe(true);
    }
  });
});

describe('where a turn goes', () => {
  test('the aggregators reach their documented OpenAI-compatible endpoints', () => {
    expect(vendorEndpointOf('together')).toEqual({
      origin: 'https://api.together.ai',
      dialect: 'chat-completions',
    });
    expect(vendorEndpointOf('fireworks')).toEqual({
      origin: 'https://api.fireworks.ai/inference',
      dialect: 'chat-completions',
    });
    expect(vendorEndpointOf('groq')).toEqual({
      origin: 'https://api.groq.com/openai',
      dialect: 'chat-completions',
    });
    expect(vendorEndpointOf('cerebras')).toEqual({
      origin: 'https://api.cerebras.ai',
      dialect: 'chat-completions',
    });
  });

  test('the one vendor whose base URL carries the version reaches it whole', () => {
    expect(vendorEndpointOf('deepinfra')).toEqual({
      origin: 'https://api.deepinfra.com/v1/openai',
      dialect: 'chat-completions',
    });
  });

  test('the key providers reach the endpoints their vendors document', () => {
    expect(vendorEndpointOf('mistral')?.origin).toBe('https://api.mistral.ai');
    expect(vendorEndpointOf('deepseek')?.origin).toBe('https://api.deepseek.com');
    expect(vendorEndpointOf('moonshot')?.origin).toBe('https://api.moonshot.ai');
    expect(vendorEndpointOf('qwen')?.origin).toBe('https://dashscope.aliyuncs.com/compatible-mode');
  });
});

describe('how a turn reads on the wire', () => {
  test('a coding plan speaks the Anthropic dialect against the plan endpoint', () => {
    expect(vendorEndpointOf('zhipu')).toEqual({
      origin: 'https://api.z.ai/api/anthropic',
      dialect: 'anthropic',
    });
    expect(vendorEndpointOf('qwen-coding')).toEqual({
      origin: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
      dialect: 'anthropic',
    });
    expect(vendorEndpointOf('minimax')).toEqual({
      origin: 'https://api.minimax.io/anthropic',
      dialect: 'anthropic',
    });
  });

  test('the vendors that shipped before the directory keep the endpoints they were served at', () => {
    expect(vendorEndpointOf('anthropic')).toEqual({
      origin: 'https://api.anthropic.com',
      dialect: 'anthropic',
    });
    expect(vendorEndpointOf('openai')).toEqual({
      origin: 'https://api.openai.com',
      dialect: 'chat-completions',
    });
    expect(vendorEndpointOf('openrouter')).toEqual({
      origin: 'https://openrouter.ai/api',
      dialect: 'chat-completions',
    });
    expect(vendorEndpointOf('xai')).toEqual({
      origin: 'https://api.x.ai/v1',
      dialect: 'responses',
    });
    expect(vendorEndpointOf('kimi')).toEqual({
      origin: 'https://api.kimi.com/coding',
      dialect: 'chat-completions',
    });
  });

  test('a provider the directory never named answers nothing rather than a guess', () => {
    for (const unnamed of ['constructor', 'toString', 'my-own-server', '']) {
      expect(vendorEndpointOf(unnamed)).toBeUndefined();
    }
  });
});

describe('the shape a vendor hands its keys out in', () => {
  test('the three vendors that document an opening hint it', () => {
    expect(documentedKeyOpeningOf('groq')).toBe('gsk_');
    expect(documentedKeyOpeningOf('xai')).toBe('xai-');
    expect(documentedKeyOpeningOf('gemini')).toBe('AIza');
  });

  test('the openings that shipped before the directory keep the shape they hinted', () => {
    expect(documentedKeyOpeningOf('anthropic')).toBe('sk-ant-');
    expect(documentedKeyOpeningOf('openai')).toBe('sk-proj-');
    expect(documentedKeyOpeningOf('openrouter')).toBe('sk-or-v1-');
  });

  test('a vendor documenting no opening hints nothing rather than teaching a shape', () => {
    for (const unhinted of ['cerebras', 'mistral', 'deepseek', 'together', 'deepinfra']) {
      expect(documentedKeyOpeningOf(unhinted), unhinted).toBeUndefined();
    }
  });
});
