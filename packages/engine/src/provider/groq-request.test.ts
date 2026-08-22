import { describe, expect, test } from 'vitest';

import { groqProviderBody } from './groq-request';

describe('the turn Groq will take', () => {
  test('a system message carrying a cache breakpoint loses only the breakpoint', () => {
    expect(
      groqProviderBody({
        model: 'llama-3.3-70b',
        messages: [
          { role: 'system', content: 'rules', cache_control: { type: 'ephemeral' } },
          { role: 'user', content: 'hello' },
        ],
      }),
    ).toEqual({
      model: 'llama-3.3-70b',
      messages: [
        { role: 'system', content: 'rules' },
        { role: 'user', content: 'hello' },
      ],
    });
  });

  test('a breakpoint on a content part inside a message comes off too', () => {
    expect(
      groqProviderBody({
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'hello', cache_control: { type: 'ephemeral' } }],
          },
        ],
      }),
    ).toEqual({ messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }] });
  });

  test('a breakpoint declared on a tool comes off as well', () => {
    expect(
      groqProviderBody({
        tools: [{ name: 'search', cache_control: { type: 'ephemeral', ttl: '1h' } }],
      }),
    ).toEqual({ tools: [{ name: 'search' }] });
  });

  test('a turn carrying no breakpoint is handed over unchanged', () => {
    const body = { model: 'llama-3.3-70b', messages: [{ role: 'user', content: 'hello' }] };

    expect(groqProviderBody(body)).toEqual(body);
  });

  test('a field merely named like the breakpoint inside a string is untouched', () => {
    expect(groqProviderBody({ messages: [{ role: 'user', content: 'cache_control' }] })).toEqual({
      messages: [{ role: 'user', content: 'cache_control' }],
    });
  });
});
