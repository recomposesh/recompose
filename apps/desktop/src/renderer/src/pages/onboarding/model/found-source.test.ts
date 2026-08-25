import { describe, expect, test } from 'vitest';

import { foundSources, lookReads } from './found-source';

const signedIn = {
  holds: 'account',
  signedInAs: 'alpcan@alpcanaydin.com',
  standing: 'connected',
} as const;
const nothingFound = { holds: 'nothing' } as const;

describe('what the look at this machine turns up', () => {
  test('a Claude plan the machine already signs into arrives as a source', () => {
    const found = foundSources({
      claudeReading: signedIn,
      ollamaAnswering: false,
      accounts: [],
    });

    expect(found).toEqual([
      {
        id: 'machine:anthropic',
        provider: 'anthropic',
        kind: 'subscription',
        title: 'Your Claude plan',
        identity: 'alpcan@alpcanaydin.com',
        adoptable: true,
      },
    ]);
  });

  test('a local runtime answering on its own port arrives as a source', () => {
    const found = foundSources({
      claudeReading: nothingFound,
      ollamaAnswering: true,
      accounts: [],
    });

    expect(found).toEqual([
      {
        id: 'machine:ollama',
        provider: 'ollama',
        kind: 'local',
        title: 'Ollama',
        identity: '127.0.0.1:11434',
        adoptable: true,
      },
    ]);
  });

  test('a machine holding neither turns up nothing', () => {
    expect(
      foundSources({ claudeReading: nothingFound, ollamaAnswering: false, accounts: [] }),
    ).toEqual([]);
  });

  test('a store that refused to open is not a machine holding nothing', () => {
    expect(
      foundSources({
        claudeReading: { holds: 'store-refused' },
        ollamaAnswering: false,
        accounts: [],
      }),
    ).toEqual([]);
  });
});

describe('what the store already holds', () => {
  test('an account already connected stands as its own source, ahead of nothing', () => {
    const found = foundSources({
      claudeReading: nothingFound,
      ollamaAnswering: false,
      accounts: [
        {
          id: 'a1',
          provider: 'openrouter',
          kind: 'aggregator',
          label: 'My API Key',
          keyTail: '9e2f',
        },
      ],
    });

    expect(found).toEqual([
      {
        id: 'a1',
        provider: 'openrouter',
        kind: 'aggregator',
        title: 'OpenRouter',
        identity: 'sk-or-v1-…9e2f',
        adoptable: false,
      },
    ]);
  });

  test('a plan the machine holds and one already connected never read as two of the same', () => {
    const found = foundSources({
      claudeReading: signedIn,
      ollamaAnswering: false,
      accounts: [{ id: 'a1', provider: 'anthropic', kind: 'subscription', label: 'Claude' }],
    });

    expect(found.map((source) => source.provider)).toEqual(['anthropic']);
    expect(found.at(0)?.adoptable).toBe(false);
  });
});

describe('the line under the heading', () => {
  test('it says what the look turned up when it turned up two', () => {
    expect(lookReads(2)).toBe('recompose looked at this machine. Two sources are already here.');
  });

  test('it says what the look turned up when it turned up one', () => {
    expect(lookReads(1)).toBe('recompose looked at this machine. One source is already here.');
  });

  test('it asks rather than reports when the look turned up nothing', () => {
    expect(lookReads(0)).toBe(
      'recompose found nothing on this machine yet. Pick a provider below to connect one.',
    );
  });
});
