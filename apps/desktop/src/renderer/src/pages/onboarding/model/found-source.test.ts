import { describe, expect, test } from 'vitest';

import { foundSources, lookReads } from './found-source';

const signedIn = {
  holds: 'account',
  signedInAs: 'alpcan@alpcanaydin.com',
  standing: 'connected',
} as const;
const nothingFound = { holds: 'nothing' } as const;

const claudeSignedIn = [{ provider: 'anthropic', reading: signedIn }] as const;
const codexSignedIn = [{ provider: 'openai', reading: signedIn }] as const;
const noToolSignedIn = [
  { provider: 'anthropic', reading: nothingFound },
  { provider: 'openai', reading: nothingFound },
] as const;

describe('the plans a provider tool already signed into', () => {
  test('a Claude plan the machine already signs into arrives as a source', () => {
    const found = foundSources({
      machineReadings: claudeSignedIn,
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

  test('a Codex plan the machine already signs into arrives as a source too', () => {
    const look = { machineReadings: codexSignedIn, ollamaAnswering: false, accounts: [] };

    expect(foundSources(look).at(0)).toMatchObject({
      id: 'machine:openai',
      provider: 'openai',
      title: 'Your Codex plan',
    });
  });

  test('two provider tools signed in on one machine both arrive', () => {
    const found = foundSources({
      machineReadings: [
        { provider: 'anthropic', reading: signedIn },
        { provider: 'openai', reading: signedIn },
      ],
      ollamaAnswering: false,
      accounts: [],
    });

    expect(found.map((source) => source.provider)).toEqual(['anthropic', 'openai']);
  });

  test('a store that refused to open is not a machine holding nothing', () => {
    expect(
      foundSources({
        machineReadings: [{ provider: 'anthropic', reading: { holds: 'store-refused' } }],
        ollamaAnswering: false,
        accounts: [],
      }),
    ).toEqual([]);
  });
});

describe('what else the look at this machine turns up', () => {
  test('a local runtime answering on its own port arrives as a source', () => {
    const found = foundSources({
      machineReadings: noToolSignedIn,
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
      foundSources({ machineReadings: noToolSignedIn, ollamaAnswering: false, accounts: [] }),
    ).toEqual([]);
  });
});

describe('where a source sits', () => {
  test('a recorded plan takes the machine row it replaced, rather than the end of the list', () => {
    const found = foundSources({
      machineReadings: [
        { provider: 'anthropic', reading: signedIn },
        { provider: 'openai', reading: signedIn },
      ],
      ollamaAnswering: true,
      accounts: [{ id: 'a1', provider: 'anthropic', kind: 'subscription', label: 'Claude' }],
    });

    expect(found.map((source) => source.provider)).toEqual(['anthropic', 'openai', 'ollama']);
    expect(found.at(0)?.adoptable).toBe(false);
  });

  test('an account no machine row stands for lands after the ones that do', () => {
    const found = foundSources({
      machineReadings: [{ provider: 'anthropic', reading: signedIn }],
      ollamaAnswering: false,
      accounts: [{ id: 'a1', provider: 'openrouter', kind: 'aggregator', label: 'OpenRouter' }],
    });

    expect(found.map((source) => source.provider)).toEqual(['anthropic', 'openrouter']);
  });
});

describe('what the store already holds', () => {
  test('an account already connected stands as its own source, ahead of nothing', () => {
    const found = foundSources({
      machineReadings: noToolSignedIn,
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
      machineReadings: claudeSignedIn,
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
