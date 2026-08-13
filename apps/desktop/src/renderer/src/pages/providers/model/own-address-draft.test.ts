import { describe, expect, test } from 'vitest';

import { dialectNamed, firstDialect, providerIdFromName } from './own-address-draft';

describe('the dialect a picker stands for', () => {
  test('a dialect the picker offers reads back as itself', () => {
    expect(dialectNamed('anthropic')).toBe('anthropic');
  });

  test('a word no picker offers falls back rather than reaching the engine', () => {
    expect(dialectNamed('smoke-signals')).toBe(firstDialect);
  });
});

describe('the identity a person naming their own endpoint gets', () => {
  test('a plain name folds to the shape a stored provider takes', () => {
    expect(providerIdFromName('My Gateway')).toBe('my-gateway');
  });

  test('punctuation between words folds to one separator', () => {
    expect(providerIdFromName('Ada  &&  Co.')).toBe('ada-co');
  });

  test('two rows named differently never collide under one identity', () => {
    expect(providerIdFromName('North Rack')).not.toBe(providerIdFromName('South Rack'));
  });

  test('a name that folds away entirely still names something', () => {
    expect(providerIdFromName('!!!')).toBe('custom');
  });

  test('surrounding space never reaches the identity', () => {
    expect(providerIdFromName('  edge  ')).toBe('edge');
  });
});
