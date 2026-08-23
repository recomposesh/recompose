import { describe, expect, test } from 'vitest';

import { correctedForVendor } from './vendor-correction';

const creditRefusal = {
  error: {
    message:
      'This request requires more credits, or fewer max_tokens. You requested up to 32000 tokens, but can only afford 6588.',
    code: 402,
    metadata: { limit_source: 'openrouter_credits' },
  },
};

describe('a turn the vendor priced out of its own credit', () => {
  test('brings the ask down to what the account can afford', () => {
    const body = { model: 'x-ai/grok-4.6', max_tokens: 32_000 };

    expect(correctedForVendor(402, creditRefusal, body)).toEqual({
      model: 'x-ai/grok-4.6',
      max_tokens: 6588,
    });
  });

  test('brings down the OpenAI spelling of the same ask', () => {
    const body = { model: 'x-ai/grok-4.6', max_completion_tokens: 32_000 };

    expect(correctedForVendor(402, creditRefusal, body)).toEqual({
      model: 'x-ai/grok-4.6',
      max_completion_tokens: 6588,
    });
  });

  test('leaves an ask already inside what the account can afford', () => {
    const body = { model: 'x-ai/grok-4.6', max_tokens: 100 };

    expect(correctedForVendor(402, creditRefusal, body)).toBeNull();
  });

  test('corrects nothing where the refusal names no affordable ask', () => {
    const refusal = { error: { message: 'out of credit', code: 402 } };

    expect(correctedForVendor(402, refusal, { max_tokens: 32_000 })).toBeNull();
  });

  test('corrects nothing where the refusal is one no remedy is known for', () => {
    expect(correctedForVendor(500, creditRefusal, { max_tokens: 32_000 })).toBeNull();
  });

  test('corrects nothing where the turn was served', () => {
    expect(correctedForVendor(200, creditRefusal, { max_tokens: 32_000 })).toBeNull();
  });
});

const toolRefusal = {
  error: {
    message: '`tool calling` is not supported with this model',
    type: 'invalid_request_error',
    param: 'tool calling',
  },
};

describe('a turn the model has no tool calling to answer with', () => {
  test('sends the turn again with the tools the model cannot take left off', () => {
    const body = {
      model: 'groq/compound',
      messages: [],
      tools: [{ name: 'run' }],
      tool_choice: 'auto',
    };

    expect(correctedForVendor(400, toolRefusal, body)).toEqual({
      model: 'groq/compound',
      messages: [],
    });
  });

  test('corrects nothing where the turn carried no tools to leave off', () => {
    expect(correctedForVendor(400, toolRefusal, { model: 'groq/compound' })).toBeNull();
  });

  test('corrects nothing where the refusal names some other field', () => {
    const other = { error: { message: 'bad temperature', param: 'temperature' } };

    expect(correctedForVendor(400, other, { tools: [{ name: 'run' }] })).toBeNull();
  });
});

describe('refusals that name no remedy this gateway knows', () => {
  test('leaves a credit-shaped refusal from some other vendor alone', () => {
    const refusal = {
      error: {
        message: 'you can only afford 10 tokens',
        metadata: { limit_source: 'some-vendor' },
      },
    };

    expect(correctedForVendor(402, refusal, { max_tokens: 32_000 })).toBeNull();
  });

  test('leaves a credit refusal carrying no source of its own alone', () => {
    const refusal = { error: { message: 'you can only afford 10 tokens' } };

    expect(correctedForVendor(402, refusal, { max_tokens: 32_000 })).toBeNull();
  });

  test('leaves the vendor own refusal alone where it names no number', () => {
    const refusal = {
      error: { message: 'out of credit', metadata: { limit_source: 'openrouter_credits' } },
    };

    expect(correctedForVendor(402, refusal, { max_tokens: 32_000 })).toBeNull();
  });

  test('leaves a refusal whose message is no message alone', () => {
    const refusal = { error: { message: 402, metadata: { limit_source: 'openrouter_credits' } } };

    expect(correctedForVendor(402, refusal, { max_tokens: 32_000 })).toBeNull();
  });

  test('leaves a refusal that is no document at all alone', () => {
    expect(correctedForVendor(400, 'not-a-document', { tools: [{ name: 'run' }] })).toBeNull();
  });

  test('leaves off the tools a turn carries even where it named no choice', () => {
    const body = { model: 'groq/compound', tools: [{ name: 'run' }] };

    expect(correctedForVendor(400, toolRefusal, body)).toEqual({ model: 'groq/compound' });
  });
});
