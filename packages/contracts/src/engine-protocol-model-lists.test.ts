import { describe, expect, test } from 'vitest';

import { modelListingSchema } from './engine-custody';
import { engineDirectiveSchema, engineReportSchema } from './engine-protocol';

const vendorKeyLook = {
  kind: 'list-models',
  id: 'd1',
  origin: 'https://api.anthropic.com',
  custody: { custody: 'provider-key', provider: 'anthropic', credential: 'sk-ant-7f2c' },
};

const bearerLook = {
  kind: 'list-models',
  id: 'd1',
  origin: 'https://openrouter.ai/api',
  custody: { custody: 'bearer', provider: 'openrouter', credential: 'sk-or-7f2c' },
};

const openLook = {
  kind: 'list-models',
  id: 'd1',
  origin: 'http://127.0.0.1:11434',
  custody: { custody: 'open' },
};

describe('the directive that asks an account what models it serves', () => {
  test('a first-party key look names the provider whose own header carries it', () => {
    expect(engineDirectiveSchema.parse(vendorKeyLook)).toEqual(vendorKeyLook);
  });

  test('a bearer look carries the credential without naming a provider', () => {
    expect(engineDirectiveSchema.parse(bearerLook)).toEqual(bearerLook);
  });

  test('an open look says so, rather than leaving the credential out silently', () => {
    expect(engineDirectiveSchema.parse(openLook)).toEqual(openLook);
  });

  test('a look with no custody is refused, because absence would read as open', () => {
    const { custody, ...withoutCustody } = bearerLook;

    expect(custody).toEqual({
      custody: 'bearer',
      provider: 'openrouter',
      credential: 'sk-or-7f2c',
    });
    expect(() => engineDirectiveSchema.parse(withoutCustody)).toThrow();
  });

  test('a look holding a blank credential is refused', () => {
    expect(() =>
      engineDirectiveSchema.parse({
        ...bearerLook,
        custody: { custody: 'bearer', provider: 'openrouter', credential: '   ' },
      }),
    ).toThrow();
  });

  test('a provider-key look for a provider recompose has no header for is refused', () => {
    expect(() =>
      engineDirectiveSchema.parse({
        ...vendorKeyLook,
        custody: { custody: 'provider-key', provider: 'openrouter', credential: 'sk-or-7f2c' },
      }),
    ).toThrow();
  });

  test('an open look carrying a credential is refused, because the two arms disagree', () => {
    expect(() =>
      engineDirectiveSchema.parse({
        ...openLook,
        custody: { custody: 'open', credential: 'sk-or-7f2c' },
      }),
    ).toThrow();
  });

  test('a look naming an account is refused, because the child resolves nothing', () => {
    expect(() => engineDirectiveSchema.parse({ ...bearerLook, accountId: 'acc-key' })).toThrow();
  });

  test('a look with nowhere to ask is refused', () => {
    expect(() => engineDirectiveSchema.parse({ ...openLook, origin: '  ' })).toThrow();
  });
});

describe('the report that answers what an account serves', () => {
  test('a listed answer carries the models the provider named', () => {
    const answer = {
      kind: 'model-list',
      answers: 'd1',
      listing: { standing: 'listed', models: [{ id: 'gpt-5' }, { id: 'gpt-5-mini' }] },
    };

    expect(engineReportSchema.parse(answer)).toEqual(answer);
  });

  test('a provider that named nothing still answers listed, so silence stays distinct', () => {
    const answer = {
      kind: 'model-list',
      answers: 'd1',
      listing: { standing: 'listed', models: [] },
    };

    expect(engineReportSchema.parse(answer)).toEqual(answer);
  });
});

describe('the shutdown a report carries for a model going away', () => {
  test('a model the provider has announced a shutdown for carries that date', () => {
    const answer = {
      kind: 'model-list',
      answers: 'd1',
      listing: {
        standing: 'listed',
        models: [{ id: 'gpt-5-pro', shutdownDate: '2026-12-11' }, { id: 'gpt-5.6-sol' }],
      },
    };

    expect(engineReportSchema.parse(answer)).toEqual(answer);
  });

  test('a model nobody has announced a shutdown for carries no date at all', () => {
    const listing = modelListingSchema.parse({
      standing: 'listed',
      models: [{ id: 'gpt-5.6-sol' }],
    });

    expect(listing).toEqual({ standing: 'listed', models: [{ id: 'gpt-5.6-sol' }] });
  });

  test('a blank shutdown date is refused, because a blank announces nothing', () => {
    expect(() =>
      modelListingSchema.parse({
        standing: 'listed',
        models: [{ id: 'gpt-5-pro', shutdownDate: '  ' }],
      }),
    ).toThrow();
  });

  test('a bare id where an entry belongs is refused, so no reader guesses the shape', () => {
    expect(() => modelListingSchema.parse({ standing: 'listed', models: ['gpt-5'] })).toThrow();
  });

  test('an unlisted answer carries no sentence, because the screen owns those words', () => {
    const answer = { kind: 'model-list', answers: 'd1', listing: { standing: 'unlisted' } };

    expect(engineReportSchema.parse(answer)).toEqual(answer);
    expect(() =>
      engineReportSchema.parse({
        kind: 'model-list',
        answers: 'd1',
        listing: { standing: 'unlisted', refusal: 'nothing answered' },
      }),
    ).toThrow();
  });

  test('a listing holding a blank id is refused, because no client could ask for it', () => {
    expect(() =>
      modelListingSchema.parse({ standing: 'listed', models: [{ id: '  ' }] }),
    ).toThrow();
  });

  test('a listing standing for neither answer is refused', () => {
    expect(() => modelListingSchema.parse({ standing: 'partial', models: [] })).toThrow();
  });
});
