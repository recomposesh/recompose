import { fc, test as prop } from '@fast-check/vitest';
import { describe, expect, test } from 'vitest';

import { firstModelName, pickServedModel } from './first-model';

describe('the name the first virtual model takes', () => {
  test('it carries the Claude prefix when Claude Code is among the harnesses', () => {
    expect(firstModelName(new Set(['claude-code', 'cursor']))).toBe('claude-my-model');
  });

  test('it drops the prefix when Claude Code is not', () => {
    expect(firstModelName(new Set(['cursor']))).toBe('my-model');
    expect(firstModelName(new Set())).toBe('my-model');
  });
});

describe('the model a target is bound to', () => {
  test('it takes the flagship over the small one', () => {
    expect(
      pickServedModel([
        'claude-haiku-4-5-20251001',
        'claude-sonnet-4-6',
        'claude-opus-4-6',
        'claude-opus-5',
      ]),
    ).toBe('claude-opus-5');
  });

  test('it reads a version rather than the order a provider listed', () => {
    expect(pickServedModel(['kimi-k2.7-code', 'kimi-k3'])).toBe('kimi-k3');
  });

  test('a date in the id never outranks a version', () => {
    expect(pickServedModel(['claude-opus-4-20250514', 'claude-opus-4-8'])).toBe('claude-opus-4-8');
  });

  test('it passes over the models nobody wants a first answer from', () => {
    expect(pickServedModel(['gpt-5.4-mini', 'gpt-5.5'])).toBe('gpt-5.5');
    expect(pickServedModel(['nomic-embed-text', 'llama3.3:70b'])).toBe('llama3.3:70b');
  });

  test('a listing of nothing but small models still answers with one', () => {
    expect(pickServedModel(['llama3.2:1b', 'gemma3:270m'])).toBe('llama3.2:1b');
  });

  test('it answers the same model for the same listing, every time', () => {
    const listing = ['gpt-5.6-terra', 'gpt-5.6-luna'];

    expect(pickServedModel(listing)).toBe(pickServedModel(listing));
  });

  test('an empty listing answers with nothing rather than an invented id', () => {
    expect(pickServedModel([])).toBe(undefined);
  });

  test('it reaches past a vendor prefix an aggregator puts in front', () => {
    expect(
      pickServedModel(['google/gemini-3-flash', 'anthropic/claude-opus-5', 'openai/gpt-5.5']),
    ).toBe('anthropic/claude-opus-5');
  });
});

describe('the law every pick obeys', () => {
  const modelIds = fc.array(fc.string({ minLength: 1, maxLength: 24 }), { maxLength: 12 });

  prop.prop([modelIds])('it only ever answers with a model the account listed', (listing) => {
    const picked = pickServedModel(listing);

    expect(picked === undefined || listing.includes(picked)).toBe(true);
  });

  prop.prop([modelIds])('it answers the same model for the same listing', (listing) => {
    expect(pickServedModel(listing)).toBe(pickServedModel(listing));
  });

  test('the twin: a listing answers with one of its own members', () => {
    const listing = ['claude-haiku-4-5', 'claude-opus-5'];

    expect(listing).toContain(pickServedModel(listing));
  });
});
