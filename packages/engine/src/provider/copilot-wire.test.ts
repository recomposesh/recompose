import { describe, expect, test } from 'vitest';

import { copilotWireFor } from './copilot-wire';

describe('the wire a Copilot model is reached on', () => {
  test('reaches a model that serves the completions endpoint there', () => {
    expect(copilotWireFor(['/chat/completions'])).toEqual({
      dialect: 'chat-completions',
      path: '/chat/completions',
    });
  });

  test('reaches a Responses-only model on Responses rather than completions', () => {
    expect(copilotWireFor(['/responses'])).toEqual({
      dialect: 'responses',
      path: '/responses',
    });
  });

  test('ignores the websocket flavour of Responses', () => {
    expect(copilotWireFor(['ws:/responses', '/responses'])).toEqual({
      dialect: 'responses',
      path: '/responses',
    });
  });

  test('keeps completions where a model serves both it and messages', () => {
    expect(copilotWireFor(['/v1/messages', '/chat/completions'])).toEqual({
      dialect: 'chat-completions',
      path: '/chat/completions',
    });
  });

  test('reaches a messages-only model on the Anthropic wire', () => {
    expect(copilotWireFor(['/v1/messages'])).toEqual({
      dialect: 'anthropic',
      path: '/v1/messages',
    });
  });

  test('falls back to completions where the catalog names no endpoint', () => {
    expect(copilotWireFor([])).toEqual({
      dialect: 'chat-completions',
      path: '/chat/completions',
    });
  });

  test('falls back to completions where every endpoint named is one it cannot speak', () => {
    expect(copilotWireFor(['ws:/responses'])).toEqual({
      dialect: 'chat-completions',
      path: '/chat/completions',
    });
  });
});
