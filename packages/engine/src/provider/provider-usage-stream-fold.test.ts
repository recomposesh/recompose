import { describe, expect, test } from 'vitest';

import { providerUsageFrom } from './provider-usage';

function streamOf(...events: readonly unknown[]): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
}

const messageStart = {
  type: 'message_start',
  message: {
    id: 'msg_1',
    usage: {
      input_tokens: 100,
      cache_creation_input_tokens: 20,
      cache_read_input_tokens: 50,
      output_tokens: 1,
    },
  },
};

const messageDelta = {
  type: 'message_delta',
  delta: { stop_reason: 'end_turn' },
  usage: { output_tokens: 250 },
};

const contentDelta = {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: 'the answer' },
};

describe('the tokens an Anthropic answer that streams reports', () => {
  test('counts the input the opening event named', () => {
    const usage = providerUsageFrom(
      'anthropic',
      streamOf(messageStart, contentDelta, messageDelta),
    );

    expect(usage.inputTokens).toBe(100);
  });

  test('counts both cache buckets the opening event named', () => {
    const usage = providerUsageFrom(
      'anthropic',
      streamOf(messageStart, contentDelta, messageDelta),
    );

    expect(usage).toMatchObject({ cacheReadTokens: 50, cacheWriteTokens: 20 });
  });

  test('takes the output from the closing event rather than the opening one', () => {
    const usage = providerUsageFrom(
      'anthropic',
      streamOf(messageStart, contentDelta, messageDelta),
    );

    expect(usage.outputTokens).toBe(250);
  });

  test('totals what the whole answer read and wrote', () => {
    const usage = providerUsageFrom(
      'anthropic',
      streamOf(messageStart, contentDelta, messageDelta),
    );

    expect(usage.totalTokens).toBe(420);
  });
});

describe('an event that names only some of the counts', () => {
  test('leaves every count it never named standing', () => {
    const usage = providerUsageFrom(
      'anthropic',
      streamOf(messageStart, { type: 'message_delta', delta: {}, usage: { output_tokens: 7 } }),
    );

    expect(usage).toMatchObject({ inputTokens: 100, cacheReadTokens: 50, outputTokens: 7 });
  });

  test('is passed over entirely where every count it named reads zero', () => {
    const usage = providerUsageFrom(
      'chat-completions',
      streamOf(
        { usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 } },
        { usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } },
      ),
    );

    expect(usage.totalTokens).toBe(16);
  });
});

describe('the dialects that already read their streams whole', () => {
  test('a Gemini stream keeps the last count each chunk carried', () => {
    const usage = providerUsageFrom(
      'gemini',
      streamOf(
        { usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 2, totalTokenCount: 10 } },
        { usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 30, totalTokenCount: 38 } },
      ),
    );

    expect(usage).toMatchObject({ inputTokens: 8, outputTokens: 30, totalTokens: 38 });
  });

  test('an answer that never streamed reads exactly as it always did', () => {
    const usage = providerUsageFrom(
      'anthropic',
      JSON.stringify({
        usage: {
          input_tokens: 2,
          output_tokens: 244,
          cache_creation_input_tokens: 831,
          cache_read_input_tokens: 44_225,
        },
      }),
    );

    expect(usage).toMatchObject({
      inputTokens: 2,
      outputTokens: 244,
      cacheWriteTokens: 831,
      cacheReadTokens: 44_225,
      totalTokens: 45_302,
    });
  });
});
