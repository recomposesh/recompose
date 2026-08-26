import { describe, expect, it } from 'vitest';

import { messageTheProviderSent } from './provider-error-message';

describe('the sentence a provider sends explaining its own refusal', () => {
  it('reads what stands under the error a refusal wraps itself in', () => {
    expect(messageTheProviderSent({ error: { message: 'You exceeded your current quota.' } })).toBe(
      'You exceeded your current quota.',
    );
  });

  it('reads a message a provider states at the top of its answer', () => {
    expect(messageTheProviderSent({ message: 'The model is overloaded.' })).toBe(
      'The model is overloaded.',
    );
  });

  it('reads a provider that wrote its error as a bare sentence rather than an object', () => {
    expect(messageTheProviderSent({ error: 'rate limited' })).toBe('rate limited');
  });

  it('prefers what stands under the error, because that is where a refusal explains itself', () => {
    const both = { error: { message: 'quota exhausted' }, message: 'request failed' };

    expect(messageTheProviderSent(both)).toBe('quota exhausted');
  });

  it('reads nothing from an answer that explains nothing', () => {
    expect(messageTheProviderSent({ id: 'req-1', status: 'failed' })).toBeUndefined();
    expect(messageTheProviderSent(null)).toBeUndefined();
    expect(messageTheProviderSent(42)).toBeUndefined();
  });

  it('reads nothing where the provider left the sentence blank', () => {
    expect(messageTheProviderSent({ error: { message: '   ' } })).toBeUndefined();
  });

  it('cuts an explanation too long to read to the span every surface quotes', () => {
    expect(messageTheProviderSent({ error: { message: 'x'.repeat(400) } })).toBe('x'.repeat(280));
  });
});
