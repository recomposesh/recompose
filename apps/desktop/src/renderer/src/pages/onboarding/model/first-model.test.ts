import type { ListedModel } from '@recompose/contracts';

import { fc, test as prop } from '@fast-check/vitest';
import { describe, expect, test } from 'vitest';

import { firstModelName, pickServedModel } from './first-model';

function served(...ids: readonly string[]): readonly ListedModel[] {
  return ids.map((id) => ({ id }));
}

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
      pickServedModel(
        served(
          'claude-haiku-4-5-20251001',
          'claude-sonnet-4-6',
          'claude-opus-4-6',
          'claude-opus-5',
        ),
      ),
    ).toBe('claude-opus-5');
  });

  test('it reads a version rather than the order a provider listed', () => {
    expect(pickServedModel(served('kimi-k2.7-code', 'kimi-k3'))).toBe('kimi-k3');
  });

  test('a date in the id never outranks a version', () => {
    expect(pickServedModel(served('claude-opus-4-20250514', 'claude-opus-4-8'))).toBe(
      'claude-opus-4-8',
    );
  });

  test('a hyphenated snapshot date never outranks a version either', () => {
    expect(pickServedModel(served('claude-opus-4-2025-05-14', 'claude-opus-4-8'))).toBe(
      'claude-opus-4-8',
    );
  });

  test('it passes over the models nobody wants a first answer from', () => {
    expect(pickServedModel(served('gpt-5.4-mini', 'gpt-5.5'))).toBe('gpt-5.5');
    expect(pickServedModel(served('nomic-embed-text', 'llama3.3:70b'))).toBe('llama3.3:70b');
  });

  test('a listing of nothing but small models still answers with one', () => {
    expect(pickServedModel(served('llama3.2:1b', 'gemma3:270m'))).toBe('llama3.2:1b');
  });

  test('it answers the same model for the same listing, every time', () => {
    const listing = served('gpt-5.6-terra', 'gpt-5.6-luna');

    expect(pickServedModel(listing)).toBe(pickServedModel(listing));
  });

  test('an empty listing answers with nothing rather than an invented id', () => {
    expect(pickServedModel([])).toBe(undefined);
  });

  test('it reaches past a vendor prefix an aggregator puts in front', () => {
    expect(
      pickServedModel(served('google/gemini-3-flash', 'anthropic/claude-opus-5', 'openai/gpt-5.5')),
    ).toBe('anthropic/claude-opus-5');
  });
});

describe('a model its provider has announced a shutdown for', () => {
  test('it never wins the pick, however highly the rank would have read it', () => {
    const listing: readonly ListedModel[] = [
      { id: 'gpt-5-pro', shutdownDate: '2026-12-11' },
      { id: 'gpt-5.6-sol' },
    ];

    expect(pickServedModel(listing)).toBe('gpt-5.6-sol');
  });

  test('it loses even to a model the rank would otherwise have passed over', () => {
    const listing: readonly ListedModel[] = [
      { id: 'claude-opus-5', shutdownDate: '2026-12-11' },
      { id: 'claude-haiku-4-5' },
    ];

    expect(pickServedModel(listing)).toBe('claude-haiku-4-5');
  });

  test('a listing that announces a shutdown for everything still answers with one', () => {
    const listing: readonly ListedModel[] = [
      { id: 'gpt-5-mini', shutdownDate: '2026-12-11' },
      { id: 'gpt-5-pro', shutdownDate: '2026-12-11' },
    ];

    expect(pickServedModel(listing)).toBe('gpt-5-pro');
  });

  test('a listing nobody announced anything for ranks exactly as it did before', () => {
    expect(pickServedModel(served('gpt-5.4-mini', 'gpt-5.6-sol', 'gpt-5.6-terra'))).toBe(
      'gpt-5.6-sol',
    );
  });

  test('a whole line marked for shutdown hands the pick to the line that replaces it', () => {
    const shutdownDate = '2026-12-11';
    const listing: readonly ListedModel[] = [
      { id: 'gpt-5.6-sol' },
      { id: 'gpt-5.6-terra' },
      { id: 'gpt-5.6-luna' },
      { id: 'gpt-5', shutdownDate },
      { id: 'gpt-5-pro-2025-10-06', shutdownDate },
      { id: 'o3', shutdownDate },
      { id: 'o3-pro', shutdownDate },
    ];

    expect(pickServedModel(listing)).toBe('gpt-5.6-sol');
  });
});

describe('the law every pick obeys', () => {
  const servedModels = fc
    .array(fc.tuple(fc.string({ minLength: 1, maxLength: 24 }), fc.boolean()), { maxLength: 12 })
    .map((rows) =>
      rows.map(([id, retiring]) => (retiring ? { id, shutdownDate: '2026-12-11' } : { id })),
    );

  prop.prop([servedModels])('it only ever answers with a model the account listed', (listing) => {
    const picked = pickServedModel(listing);

    expect(picked === undefined || listing.some((model) => model.id === picked)).toBe(true);
  });

  prop.prop([servedModels])('it answers the same model for the same listing', (listing) => {
    expect(pickServedModel(listing)).toBe(pickServedModel(listing));
  });

  prop.prop([servedModels])(
    'a retiring model never wins while a model nobody is retiring stands',
    (listing) => {
      const standing = listing.filter((model) => model.shutdownDate === undefined);
      const picked = pickServedModel(listing);

      expect(
        standing.length === 0 ||
          (picked !== undefined && standing.some((model) => model.id === picked)),
      ).toBe(true);
    },
  );

  test('the twin: a listing answers with one of its own members', () => {
    const listing = served('claude-haiku-4-5', 'claude-opus-5');

    expect(listing.map((model) => model.id)).toContain(pickServedModel(listing));
  });

  test('the twin: a standing model takes the pick from a retiring one', () => {
    const listing: readonly ListedModel[] = [
      { id: 'claude-opus-5', shutdownDate: '2026-12-11' },
      { id: 'claude-sonnet-4-6' },
    ];

    expect(pickServedModel(listing)).toBe('claude-sonnet-4-6');
  });
});
