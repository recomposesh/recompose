import { describe, expect, test } from 'vitest';

import { sourceReadingOf } from './source-reading';

const listed = (title: string) => ({ title, standing: 'listed' as const });

const looking = (title: string) => ({ title, standing: 'looking' as const });

const silent = (title: string) => ({ title, standing: 'unlisted' as const });

describe('whether the run can open on the sources a person marked', () => {
  test('it opens once every source has said what it serves', () => {
    expect(sourceReadingOf([listed('OpenRouter'), listed('Ollama')])).toEqual({
      standing: 'listed',
    });
  });

  test('it waits while a source is still answering', () => {
    expect(sourceReadingOf([listed('OpenRouter'), looking('Ollama')])).toEqual({
      standing: 'looking',
    });
  });

  test('a source that answered nothing stops the run and names it', () => {
    expect(sourceReadingOf([listed('OpenRouter'), silent('Ollama')])).toEqual({
      standing: 'refused',
      refusal:
        "recompose couldn't read the model list for Ollama. Check the connection and try again.",
    });
  });

  test('every silent source is named, so nobody hunts for the one that stopped it', () => {
    expect(sourceReadingOf([silent('OpenRouter'), silent('Ollama')]).refusal).toBe(
      "recompose couldn't read the model list for OpenRouter and Ollama. Check the connection and try again.",
    );
  });

  test('a refusal outranks a source still answering, because an answer beats a wait', () => {
    expect(sourceReadingOf([looking('OpenRouter'), silent('Ollama')]).standing).toBe('refused');
  });

  test('nothing marked stops the run before it asks anything', () => {
    expect(sourceReadingOf([])).toEqual({
      standing: 'refused',
      refusal: 'No source is connected yet. Go back and connect one.',
    });
  });
});
