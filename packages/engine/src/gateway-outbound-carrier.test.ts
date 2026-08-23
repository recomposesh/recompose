import { describe, expect, it } from 'vitest';

import type { Crossing, JsonObject } from './gateway-wire';

import { outboundBodyFor } from './gateway-outbound-body';
import { withoutGeminiCarriers } from './gateway-outbound-carriers';
import { isJsonObject } from './gateway-wire';

const nativeSignature = 'EjQKMgEMOdbHO0Gd+c9Mxk4ELwPGbpCEcp2mFfYYLix2UVtBH3fL8GECc4+JITVnHF4qZDsA';

const carrierSignature =
  'cpa-gemini-carrier-v1:next:text:RWpRS01nRU1PZGJITzBHZCtjOU14azRFTHdQR2JwQ0VjcDJtRmZZWUxpeDJVVnRCSDNmTDhHRUNjNCtKSVRWbkhGNHFaRHNB';

function conversationCarrying(...blocks: JsonObject[]): JsonObject {
  return {
    model: 'fast',
    max_tokens: 64,
    messages: [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: blocks },
      { role: 'user', content: 'and what is left' },
    ],
  };
}

function aCrossing(raw: JsonObject): Crossing {
  return {
    dialect: 'anthropic',
    raw,
    gatewayName: 'sample',
    virtualModel: 'smart',
    providerModel: 'provider-model',
  };
}

function assistantBlocksOf(outbound: ReturnType<typeof outboundBodyFor>): unknown {
  if (!('body' in outbound)) throw new Error('the crossing refused instead of carrying a body');

  const messages = outbound.body['messages'];

  if (!Array.isArray(messages)) return messages;

  const assistant: unknown = messages[1];

  return isJsonObject(assistant) ? assistant['content'] : assistant;
}

describe('a Gemini carrier crossing to a target that is not Gemini', () => {
  it('should drop the carrier the other vendor cannot read', () => {
    const crossing = aCrossing(
      conversationCarrying(
        { type: 'thinking', thinking: '', signature: carrierSignature },
        { type: 'text', text: 'hi there' },
      ),
    );

    expect(assistantBlocksOf(outboundBodyFor(crossing, 'anthropic'))).toEqual([
      { type: 'text', text: 'hi there' },
    ]);
  });

  it('should keep the carrier where the target is Gemini itself', () => {
    const crossing = aCrossing(
      conversationCarrying(
        { type: 'thinking', thinking: '', signature: carrierSignature },
        { type: 'text', text: 'hi there' },
      ),
    );
    const outbound = outboundBodyFor(crossing, 'gemini');

    expect(JSON.stringify(outbound)).toContain(nativeSignature);
  });

  it('should keep a thinking block that carries reasoning of its own', () => {
    const crossing = aCrossing(
      conversationCarrying(
        { type: 'thinking', thinking: 'a thought of its own', signature: 'native-signature' },
        { type: 'text', text: 'hi there' },
      ),
    );

    expect(assistantBlocksOf(outboundBodyFor(crossing, 'anthropic'))).toEqual([
      { type: 'thinking', thinking: 'a thought of its own', signature: 'native-signature' },
      { type: 'text', text: 'hi there' },
    ]);
  });
});

describe('what the carrier scrub refuses to touch', () => {
  const crossing = aCrossing({});

  it('should keep a thinking block that carries both reasoning and a carrier signature', () => {
    const body = {
      messages: [{ role: 'assistant', content: [thinkingBlock('a thought of its own')] }],
    };

    expect(withoutGeminiCarriers(body, crossing, 'anthropic')).toEqual(body);
  });

  it('should keep a block that is not thinking however its signature reads', () => {
    const body = {
      messages: [
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'hi there', signature: carrierSignature }],
        },
      ],
    };

    expect(withoutGeminiCarriers(body, crossing, 'anthropic')).toEqual(body);
  });

  it('should keep a thinking block whose signature is the vendor own, not a carrier', () => {
    const body = {
      messages: [
        {
          role: 'assistant',
          content: [{ type: 'thinking', thinking: '', signature: nativeSignature }],
        },
      ],
    };

    expect(withoutGeminiCarriers(body, crossing, 'anthropic')).toEqual(body);
  });

  it('should read the block kind rather than the fields a carrier happens to share', () => {
    const body = {
      messages: [
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'hi there', thinking: '', signature: carrierSignature }],
        },
      ],
    };

    expect(withoutGeminiCarriers(body, crossing, 'anthropic')).toEqual(body);
  });
});

describe('the shapes the carrier scrub reads past', () => {
  const crossing = aCrossing({});

  it('should leave content the dialect never shaped as blocks alone', () => {
    const body = { messages: [{ role: 'user', content: 'hello' }, 'not-a-message'] };

    expect(withoutGeminiCarriers(body, crossing, 'anthropic')).toEqual(body);
  });

  it('should leave a body whose messages are not a list alone', () => {
    const body = { messages: 'hello' };

    expect(withoutGeminiCarriers(body, crossing, 'anthropic')).toEqual(body);
  });

  it('should leave a crossing whose caller does not speak Anthropic alone', () => {
    const body = { messages: [{ role: 'assistant', content: [thinkingBlock('')] }] };
    const responsesCrossing = { ...aCrossing({}), dialect: 'responses' } as const;

    expect(withoutGeminiCarriers(body, responsesCrossing, 'anthropic')).toEqual(body);
  });
});

function thinkingBlock(thinking: string): JsonObject {
  return { type: 'thinking', thinking, signature: carrierSignature };
}

describe('a text block holding nothing for the vendor to read', () => {
  const crossing = aCrossing({});

  it('drops the empty text block a vendor refuses the whole turn over', () => {
    const body = {
      messages: [
        {
          role: 'assistant',
          content: [
            { type: 'text', text: '' },
            { type: 'text', text: 'hi there' },
          ],
        },
      ],
    };

    expect(withoutGeminiCarriers(body, crossing, 'anthropic')).toEqual({
      messages: [{ role: 'assistant', content: [{ type: 'text', text: 'hi there' }] }],
    });
  });

  it('drops it on the way to Gemini too, which skips it in translation anyway', () => {
    const body = { messages: [{ role: 'assistant', content: [{ type: 'text', text: '' }] }] };

    expect(withoutGeminiCarriers(body, crossing, 'gemini')).toEqual({
      messages: [{ role: 'assistant', content: [] }],
    });
  });

  it('keeps a text block a caller actually wrote something in', () => {
    const body = { messages: [{ role: 'user', content: [{ type: 'text', text: ' ' }] }] };

    expect(withoutGeminiCarriers(body, crossing, 'anthropic')).toEqual(body);
  });
});

describe('the carrier a Gemini-bound turn keeps', () => {
  const crossing = aCrossing({});

  it('keeps the carrier where the turn is going to Gemini itself', () => {
    const body = {
      messages: [
        {
          role: 'assistant',
          content: [{ type: 'thinking', thinking: '', signature: carrierSignature }],
        },
      ],
    };

    expect(withoutGeminiCarriers(body, crossing, 'gemini')).toEqual(body);
  });

  it('reads the block kind before the fields a carrier shares with it', () => {
    const body = {
      messages: [
        {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 't1', name: 'run', thinking: '', signature: carrierSignature },
          ],
        },
      ],
    };

    expect(withoutGeminiCarriers(body, crossing, 'anthropic')).toEqual(body);
  });
});
