import { describe, expect, it } from 'vitest';

import { turnResumesServerState } from './gateway-chained-turn';

describe('a turn that resumes state the provider is holding', () => {
  it('reads a request naming the response it continues', () => {
    expect(
      turnResumesServerState({ model: 'fast', previous_response_id: 'resp_8f21', input: 'go on' }),
    ).toBe(true);
  });

  it('reads a blank continuation name as no chain at all', () => {
    expect(turnResumesServerState({ model: 'fast', previous_response_id: '  ' })).toBe(false);
  });

  it('reads reasoning replayed back under seal', () => {
    expect(
      turnResumesServerState({
        model: 'fast',
        input: [{ type: 'reasoning', encrypted_content: 'gAAAAA', summary: [] }],
      }),
    ).toBe(true);
  });

  it('reads a reasoning item carrying no seal as an ordinary turn', () => {
    expect(
      turnResumesServerState({ model: 'fast', input: [{ type: 'reasoning', summary: [] }] }),
    ).toBe(false);
  });

  it('reaches a sealed item nested below the shape a dialect happens to use', () => {
    expect(
      turnResumesServerState({
        model: 'fast',
        contents: [{ role: 'model', parts: [{ type: 'encrypted_content', data: 'gAAAAA' }] }],
      }),
    ).toBe(true);
  });
});

describe('a turn any account could carry from the start', () => {
  it('reads a signed thinking block replayed to Anthropic', () => {
    expect(
      turnResumesServerState({
        model: 'fast',
        messages: [
          {
            role: 'assistant',
            content: [{ type: 'thinking', thinking: 'weighing it', signature: 'ErUBCkYIB' }],
          },
        ],
      }),
    ).toBe(true);
  });

  it('reads redacted thinking, whose whole content is the provider keeping the state', () => {
    expect(
      turnResumesServerState({
        model: 'fast',
        messages: [{ role: 'assistant', content: [{ type: 'redacted_thinking', data: 'EroB' }] }],
      }),
    ).toBe(true);
  });

  it('reads an unsigned thinking block as a turn any account could carry', () => {
    expect(
      turnResumesServerState({
        model: 'fast',
        messages: [{ role: 'assistant', content: [{ type: 'thinking', thinking: 'weighing it' }] }],
      }),
    ).toBe(false);
  });

  it('reads a first turn of plain text as no chain', () => {
    expect(
      turnResumesServerState({
        model: 'fast',
        messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }],
      }),
    ).toBe(false);
  });
});
