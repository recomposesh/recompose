import { describe, expect, test } from 'vitest';

import { geminiSignaturesUpstreamWillTake } from './gemini-response-signatures';

describe('a thought signature riding on a tool answer', () => {
  test('is dropped, because Gemini replays no signature on a functionResponse', () => {
    const body = geminiSignaturesUpstreamWillTake({
      contents: [
        {
          role: 'user',
          parts: [
            { functionResponse: { name: 'lookup', response: {} }, thoughtSignature: 'sig' },
            { functionResponse: { name: 'other', response: {} }, thought_signature: 'sig' },
          ],
        },
      ],
    });

    expect(body['contents']).toEqual([
      {
        role: 'user',
        parts: [
          { functionResponse: { name: 'lookup', response: {} } },
          { functionResponse: { name: 'other', response: {} } },
        ],
      },
    ]);
  });

  test('a signature on the model’s own thought is left exactly where it stands', () => {
    const contents = [
      { role: 'model', parts: [{ text: 'reasoned', thought: true, thoughtSignature: 'sig' }] },
    ];

    expect(geminiSignaturesUpstreamWillTake({ contents })['contents']).toBe(contents);
  });

  test('a body naming no turns is left alone', () => {
    const body = { model: 'gemini-3-pro-preview' };

    expect(geminiSignaturesUpstreamWillTake(body)).toBe(body);
  });
});
