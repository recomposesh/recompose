import { describe, expect, it } from 'vitest';

import { quoteTheAnswerAllows } from './provider-error-quote';

const REFUSED = 429;

const SERVED = 200;

describe('the quote a failed answer allows a row to carry', () => {
  it('quotes the sentence a provider sent explaining its refusal', () => {
    const refusal = JSON.stringify({ error: { message: 'You exceeded your current quota.' } });

    expect(quoteTheAnswerAllows(REFUSED, refusal)).toBe('You exceeded your current quota.');
  });

  it('reads nothing from an answer that was served, because nothing refused it', () => {
    const served = JSON.stringify({ error: { message: 'You exceeded your current quota.' } });

    expect(quoteTheAnswerAllows(SERVED, served)).toBeUndefined();
  });

  it('reads nothing where the provider sent no JSON at all', () => {
    expect(quoteTheAnswerAllows(REFUSED, '<html>Gateway Timeout</html>')).toBeUndefined();
    expect(quoteTheAnswerAllows(REFUSED, '')).toBeUndefined();
  });

  it('reads nothing where the provider refused without explaining itself', () => {
    expect(quoteTheAnswerAllows(REFUSED, '{}')).toBeUndefined();
  });

  it('refuses a message that is itself a body, so no answer rides a row through the quote', () => {
    const wrapped = JSON.stringify({ error: { message: '{"messages":[{"role":"user"}]}' } });

    expect(quoteTheAnswerAllows(REFUSED, wrapped)).toBeUndefined();
  });

  it('cuts an explanation too long to read down to the span a row carries', () => {
    const long = JSON.stringify({ error: { message: 'x'.repeat(400) } });

    expect(quoteTheAnswerAllows(REFUSED, long)).toBe('x'.repeat(280));
  });
});
